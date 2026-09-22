"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJob } from "@/config/jobs";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import WelcomeBackModal from "@/components/WelcomeBackModal";
import BossResultModal from "@/components/BossResultModal";
import CheerNotificationModal from "@/components/CheerNotificationModal";
import RegionSelector from "@/components/RegionSelector";
import DropToast from "@/components/DropToast";
import { regions } from "@/config/regions";
import { rollEquipmentDrop, rollMerchantItem, getMerchantPrice, getGrade, getSlot } from "@/config/equipment";
import { fetchEquippedBonuses } from "@/lib/equipmentBonuses";
import { getJobSkills, getSkillMultiplier } from "@/config/skills";
import { getTraitBonuses } from "@/config/traits";
import { hasElementAdvantage, elementAdvantageMultiplier, getElement } from "@/config/elements";
import { postGuildNews } from "@/lib/guildNews";
import { hasActiveCheerBuff } from "@/lib/cheers";
import { cheerBuffAttackPercent } from "@/config/guild";
import { getRemainingHiresToday, hireMercenary } from "@/lib/mercenary";
import { mercenaryDailyLimit, getMercenaryRewardBonusPercent } from "@/config/mercenary";
import {
  merchantCheckIntervalMs,
  merchantChancePerCheck,
  merchantDurationMs,
  merchantMinGrade,
  merchantPriceMultiplier,
  goblinCheckIntervalMs,
  goblinChancePerCheck,
  goblinVisibleDurationMs,
  goblinGoldRewardMultiplier,
} from "@/config/events";
import {
  jobBattleStats,
  getTotalAttack,
  getEnhanceAttackBonus,
  getExpToNextLevel,
  getStageMonsterHp,
  getStageMonsterReward,
  getBossHp,
  getBossReward,
  stagesPerRegion,
  killsPerStage,
  eliteMultiplier,
} from "@/config/balance";

const emptyEquipBonuses = { attackFlat: 0, critRate: 0, critDamage: 0, goldFind: 0, weaponElement: null };
const emptyTraitBonuses = { attackPercent: 0, attackSpeedPercent: 0, goldFindPercent: 0, dropChancePercent: 0 };

function initialMonsterState(regionIndex, stage) {
  const hp = getStageMonsterHp(regionIndex, stage);
  return { monsterMaxHp: hp, monsterHp: hp };
}

const initialBattleState = {
  level: 1,
  exp: 0,
  gold: 0,
  enhanceLevel: 0,
  regionIndex: 0,
  stage: 1,
  killIndexInStage: 0,
  isElite: false,
  regionStage: regions.map(() => 1),
  unlockedRegionIndex: 0,
  equipBonuses: emptyEquipBonuses,
  traitBonuses: emptyTraitBonuses,
  ...initialMonsterState(0, 1),
};

// 몬스터가 데미지를 한 번 맞았을 때 다음 상태를 계산하는 순수 함수.
// (몬스터가 죽으면 보상을 주고, 필요하면 레벨업·다음 스테이지 진행까지 한 번에 처리한다)
function applyHit(state, damage) {
  const remainingHp = state.monsterHp - damage;
  if (remainingHp > 0) {
    return { ...state, monsterHp: remainingHp };
  }

  const baseReward = getStageMonsterReward(state.regionIndex, state.stage);
  const reward = state.isElite
    ? { gold: baseReward.gold * eliteMultiplier, exp: baseReward.exp * eliteMultiplier }
    : baseReward;

  let level = state.level;
  let exp = state.exp + reward.exp;
  const equipBonuses = state.equipBonuses ?? emptyEquipBonuses;
  const traitBonuses = state.traitBonuses ?? emptyTraitBonuses;
  const goldMultiplier = 1 + (equipBonuses.goldFind + traitBonuses.goldFindPercent) / 100;
  const gold = state.gold + Math.round(reward.gold * goldMultiplier);
  const droppedItem = rollEquipmentDrop(regions[state.regionIndex]?.id, traitBonuses.dropChancePercent);

  let expToNext = getExpToNextLevel(level);
  while (exp >= expToNext) {
    exp -= expToNext;
    level += 1;
    expToNext = getExpToNextLevel(level);
  }

  let killIndexInStage = state.killIndexInStage;
  let stage = state.stage;
  const regionStage = [...state.regionStage];

  if (state.isElite) {
    killIndexInStage = 0;
    if (stage < stagesPerRegion) {
      stage += 1;
      regionStage[state.regionIndex] = stage;
    }
    // 마지막 스테이지(10)라면 그 자리에서 계속 파밍하며 보스 도전을 기다린다.
  } else {
    killIndexInStage += 1;
  }
  const isElite = killIndexInStage >= killsPerStage;

  const baseHp = getStageMonsterHp(state.regionIndex, stage);
  const monsterMaxHp = isElite ? baseHp * eliteMultiplier : baseHp;

  return {
    ...state,
    level,
    exp,
    gold,
    killIndexInStage,
    stage,
    regionStage,
    isElite,
    monsterMaxHp,
    monsterHp: monsterMaxHp,
    droppedItem,
  };
}

async function saveProgress(character, battle) {
  if (!character) return;
  await supabase
    .from("characters")
    .update({
      level: battle.level,
      progress: {
        // 가방 탭의 강화석, 성장 탭의 특성처럼, 모험 탭이 다루지 않는 값들은 그대로 보존한다.
        ...(character.progress ?? {}),
        exp: battle.exp,
        gold: battle.gold,
        enhanceLevel: battle.enhanceLevel,
        regionIndex: battle.regionIndex,
        regionStage: battle.regionStage,
        unlockedRegionIndex: battle.unlockedRegionIndex,
        // 다음에 접속했을 때 이 시각을 기준으로 방치 보상을 계산한다.
        lastActiveAt: new Date().toISOString(),
      },
    })
    .eq("user_id", character.user_id);
}

export default function AdventurePage() {
  const {
    character,
    refreshCharacter,
    welcomeSummary,
    clearWelcomeSummary,
    cheerNotifications,
    clearCheerNotifications,
  } = useAuth();
  const job = character ? getJob(character.job) : null;

  const [battle, setBattle] = useState(initialBattleState);
  const [ready, setReady] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const [shake, setShake] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);
  const [bossFightHp, setBossFightHp] = useState(null);
  const [bossResult, setBossResult] = useState(null);
  const [drops, setDrops] = useState([]);
  const [merchant, setMerchant] = useState(null);
  const [goblin, setGoblin] = useState(null);
  const [eventMessage, setEventMessage] = useState(null);
  const [roster, setRoster] = useState([]);
  const [remainingHires, setRemainingHires] = useState(mercenaryDailyLimit);
  const [showMercenaryPicker, setShowMercenaryPicker] = useState(false);
  const [selectedMercenary, setSelectedMercenary] = useState(null);

  const loadedRef = useRef(false);
  // ready(state)는 렌더링용이고, readyRef는 이 값이 정말 최신인지 클린업(언마운트) 시점에서도
  // 정확히 확인하기 위한 것이다. loadedRef만 보고 저장하면, 캐릭터 정보를 아직 다 불러오기 전
  // (장비 보너스 조회가 끝나기 전)에 화면이 닫혔을 때 기본값(레벨1, 골드0)이 저장될 수 있다.
  const readyRef = useRef(false);
  const battleRef = useRef(battle);
  const hitCounterRef = useRef(0);
  const bossFightingRef = useRef(false);
  const skillLastTriggeredRef = useRef({});
  const merchantRef = useRef(null);
  const goblinRef = useRef(null);

  // 캐릭터 정보가 도착하면, 저장되어 있던 값으로 전투 상태를 한 번만 채운다.
  // (방치 보상 계산은 로그인 시점에 AuthContext에서 이미 끝난 상태로 넘어온다)
  useEffect(() => {
    if (character && !loadedRef.current) {
      loadedRef.current = true;
      const progress = character.progress ?? {};
      const regionStage = progress.regionStage ?? regions.map(() => 1);
      const regionIndex = progress.regionIndex ?? 0;
      const stage = regionStage[regionIndex] ?? 1;
      const loaded = {
        level: character.level ?? 1,
        exp: progress.exp ?? 0,
        gold: progress.gold ?? 0,
        enhanceLevel: progress.enhanceLevel ?? 0,
        regionIndex,
        stage,
        killIndexInStage: 0,
        isElite: false,
        regionStage,
        unlockedRegionIndex: progress.unlockedRegionIndex ?? 0,
        traitBonuses: getTraitBonuses(progress.traits),
        skillLevels: progress.skillLevels ?? {},
      };

      // 장비 보너스를 불러오다 문제가 생기더라도, 레벨/골드 같은 진짜 캐릭터 정보는
      // 반드시 화면에 반영되어야 하므로 실패 시에도 보너스 0으로 계속 진행한다.
      Promise.all([
        fetchEquippedBonuses(character.user_id).catch(() => emptyEquipBonuses),
        hasActiveCheerBuff(character.user_id).catch(() => false),
      ]).then(([equipBonuses, cheerBuffActive]) => {
          const state = {
            ...loaded,
            equipBonuses: equipBonuses ?? emptyEquipBonuses,
            cheerBuffActive,
            ...initialMonsterState(regionIndex, stage),
          };
          battleRef.current = state;
          setBattle(state);
          readyRef.current = true;
          setReady(true);
        });
    }
  }, [character]);

  // 용병 목록(길드원)과 오늘 남은 용병 횟수를 한 번 불러온다.
  useEffect(() => {
    if (!character?.user_id) return;
    supabase
      .from("guild_roster")
      .select("*")
      .neq("user_id", character.user_id)
      .then(({ data }) => setRoster(data ?? []));
    getRemainingHiresToday(character.user_id).then(setRemainingHires);
  }, [character?.user_id]);

  // 공격 한 번(일반 공격이든 스킬이든)의 결과 처리를 한곳에 모아둔다.
  function processHit({ damage, isCrit, label, color }) {
    const current = battleRef.current;
    const next = applyHit(current, damage);
    battleRef.current = next;
    setBattle(next);

    const hitId = ++hitCounterRef.current;
    setFloatingNumbers((prev) => [...prev, { id: hitId, damage, isCrit, label, color }]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== hitId));
    }, 900);

    setAttacking(true);
    setTimeout(() => setAttacking(false), 250);
    setMonsterHurt(true);
    setTimeout(() => setMonsterHurt(false), 250);

    if (isCrit) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }

    if (next.droppedItem) {
      const drop = next.droppedItem;
      const dropId = ++hitCounterRef.current;
      supabase
        .from("equipment")
        .insert({
          user_id: character.user_id,
          slot: drop.slot,
          grade: drop.grade,
          options: drop.options,
          set_id: drop.setId,
          element: drop.element,
        })
        .then(({ error }) => {
          if (error) {
            console.error("장비 저장 실패:", error.message);
            return;
          }
          setDrops((prev) => [...prev, { id: dropId, slot: drop.slot, grade: drop.grade }]);
          setTimeout(() => {
            setDrops((prev) => prev.filter((d) => d.id !== dropId));
          }, 3000);

          if (drop.grade === "legendary" || drop.grade === "mythic") {
            const gradeLabel = getGrade(drop.grade).label;
            const slotLabel = getSlot(drop.slot).label;
            postGuildNews(
              character.user_id,
              character.nickname,
              `${character.nickname}님이 ${gradeLabel} 장비 [${slotLabel}]을 획득했습니다!`
            );
          }
        });
    }

    if (next.level > current.level) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 1500);
      saveProgress(character, next).then(() => refreshCharacter());
    }
  }

  // 자동 공격 타이머. 장비/특성 정보까지 다 불러온 뒤(ready)에 시작해야
  // 공격 속도에 특성 보너스가 정확히 반영된다.
  useEffect(() => {
    if (!character || !ready) return;
    const stats = jobBattleStats[character.job] ?? jobBattleStats.warrior;
    const traitBonuses = battleRef.current.traitBonuses ?? emptyTraitBonuses;
    const attackSpeed = stats.attackSpeed * (1 + traitBonuses.attackSpeedPercent / 100);
    const intervalMs = 1000 / attackSpeed;

    const timer = setInterval(() => {
      if (bossFightingRef.current) return;
      const current = battleRef.current;
      const equipBonuses = current.equipBonuses ?? emptyEquipBonuses;
      const tb = current.traitBonuses ?? emptyTraitBonuses;
      const baseAttack = getTotalAttack(character.job, current.level, current.enhanceLevel) + equipBonuses.attackFlat;
      let attack = baseAttack * (1 + tb.attackPercent / 100);
      const region = regions[current.regionIndex];
      if (hasElementAdvantage(equipBonuses.weaponElement, region.element)) {
        attack *= elementAdvantageMultiplier;
      }
      if (current.cheerBuffActive) {
        attack *= 1 + cheerBuffAttackPercent / 100;
      }
      const critRate = stats.critRate + equipBonuses.critRate / 100;
      const critDamage = stats.critDamage + equipBonuses.critDamage / 100;
      const isCrit = Math.random() < critRate;
      const damage = Math.round(attack * (isCrit ? critDamage : 1));
      processHit({ damage, isCrit });
    }, intervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.job, character?.user_id, ready]);

  // 스킬 자동 발동. 짧은 간격으로 깨어나서, 쿨타임이 다 찬 스킬이 있으면 터뜨린다.
  useEffect(() => {
    if (!character || !ready) return;
    const skills = getJobSkills(character.job);
    if (skills.length === 0) return;

    const startedAt = Date.now();
    for (const skill of skills) {
      skillLastTriggeredRef.current[skill.id] = startedAt;
    }

    const timer = setInterval(() => {
      if (bossFightingRef.current) return;
      const current = battleRef.current;
      const stats = jobBattleStats[character.job] ?? jobBattleStats.warrior;
      const equipBonuses = current.equipBonuses ?? emptyEquipBonuses;
      const tb = current.traitBonuses ?? emptyTraitBonuses;
      const baseAttack = getTotalAttack(character.job, current.level, current.enhanceLevel) + equipBonuses.attackFlat;
      let attack = baseAttack * (1 + tb.attackPercent / 100);
      const region = regions[current.regionIndex];
      if (hasElementAdvantage(equipBonuses.weaponElement, region.element)) {
        attack *= elementAdvantageMultiplier;
      }
      if (current.cheerBuffActive) {
        attack *= 1 + cheerBuffAttackPercent / 100;
      }
      const critRate = stats.critRate + equipBonuses.critRate / 100;
      const critDamage = stats.critDamage + equipBonuses.critDamage / 100;

      const now = Date.now();
      for (const skill of skills) {
        const last = skillLastTriggeredRef.current[skill.id] ?? 0;
        if (now - last >= skill.cooldown * 1000) {
          skillLastTriggeredRef.current[skill.id] = now;
          const skillLevel = current.skillLevels?.[skill.id] ?? 0;
          const multiplier = getSkillMultiplier(skill, skillLevel);
          const isCrit = Math.random() < critRate;
          const damage = Math.round(attack * multiplier * (isCrit ? critDamage : 1));
          processHit({ damage, isCrit, label: skill.name, color: "#a855f7" });
        }
      }
    }, 250);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.job, character?.user_id, ready]);

  // 방랑 상인: 가끔 나타나서 한동안(기본 10분) 머무르며 장비를 판다.
  useEffect(() => {
    if (!character || !ready) return;
    const timer = setInterval(() => {
      if (bossFightingRef.current) return;
      const current = merchantRef.current;
      if (current) {
        if (Date.now() >= current.expiresAt) {
          merchantRef.current = null;
          setMerchant(null);
        }
        return;
      }
      if (Math.random() >= merchantChancePerCheck) return;
      const item = rollMerchantItem(merchantMinGrade);
      const price = getMerchantPrice(item.grade, merchantPriceMultiplier);
      const next = { item, price, expiresAt: Date.now() + merchantDurationMs };
      merchantRef.current = next;
      setMerchant(next);
    }, merchantCheckIntervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.user_id, ready]);

  // 보물 고블린: 가끔 나타났다가 제한 시간 안에 탭하지 않으면 도망간다.
  useEffect(() => {
    if (!character || !ready) return;
    const timer = setInterval(() => {
      if (bossFightingRef.current || goblinRef.current) return;
      if (Math.random() >= goblinChancePerCheck) return;
      const id = Date.now();
      const next = { id, expiresAt: id + goblinVisibleDurationMs };
      goblinRef.current = next;
      setGoblin(next);
      setTimeout(() => {
        if (goblinRef.current?.id === id) {
          goblinRef.current = null;
          setGoblin(null);
        }
      }, goblinVisibleDurationMs);
    }, goblinCheckIntervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.user_id, ready]);

  async function handleBuyMerchantItem() {
    if (!merchant) return;
    const current = battleRef.current;
    if (current.gold < merchant.price) return;

    const { error } = await supabase.from("equipment").insert({
      user_id: character.user_id,
      slot: merchant.item.slot,
      grade: merchant.item.grade,
      options: merchant.item.options,
      set_id: merchant.item.setId,
      element: merchant.item.element,
    });
    if (error) {
      console.error("상인 장비 구매 실패:", error.message);
      return;
    }

    const next = { ...current, gold: current.gold - merchant.price };
    battleRef.current = next;
    setBattle(next);
    merchantRef.current = null;
    setMerchant(null);
    setEventMessage(`${getGrade(merchant.item.grade).label} ${getSlot(merchant.item.slot).label}을(를) 구매했습니다!`);
    setTimeout(() => setEventMessage(null), 2500);

    await saveProgress(character, next);
    await refreshCharacter();
  }

  function handleCatchGoblin() {
    if (!goblinRef.current) return;
    goblinRef.current = null;
    setGoblin(null);

    const current = battleRef.current;
    const equipBonuses = current.equipBonuses ?? emptyEquipBonuses;
    const traitBonuses = current.traitBonuses ?? emptyTraitBonuses;
    const goldMultiplier = 1 + (equipBonuses.goldFind + traitBonuses.goldFindPercent) / 100;
    const baseReward = getStageMonsterReward(current.regionIndex, current.stage);
    const bonusGold = Math.round(baseReward.gold * goblinGoldRewardMultiplier * goldMultiplier);
    const next = { ...current, gold: current.gold + bonusGold };
    battleRef.current = next;
    setBattle(next);
    setEventMessage(`보물 고블린을 잡았다! +${formatNumber(bonusGold)}G`);
    setTimeout(() => setEventMessage(null), 2500);

    saveProgress(character, next).then(() => refreshCharacter());
  }

  // 화면을 나갈 때(다른 탭 이동 등) 지금까지 진행 상황을 저장하고,
  // 다른 탭(성장 등)에서도 최신 골드/레벨을 볼 수 있게 캐릭터 정보를 새로고침한다.
  useEffect(() => {
    return () => {
      if (readyRef.current) {
        saveProgress(character, battleRef.current).then(() => refreshCharacter());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.user_id]);

  function handleSelectRegion(index) {
    const current = battleRef.current;
    if (index > current.unlockedRegionIndex || index === current.regionIndex) return;
    const stage = current.regionStage[index] ?? 1;
    const next = {
      ...current,
      regionIndex: index,
      stage,
      killIndexInStage: 0,
      isElite: false,
      ...initialMonsterState(index, stage),
    };
    battleRef.current = next;
    setBattle(next);
  }

  async function challengeBoss() {
    const current = battleRef.current;
    if (bossFightingRef.current || current.stage < stagesPerRegion) return;
    bossFightingRef.current = true;

    const mercenary = selectedMercenary;
    const rewardBonusPercent = mercenary ? getMercenaryRewardBonusPercent(mercenary.level) : 0;

    const regionIndex = current.regionIndex;
    const region = regions[regionIndex];
    const maxHp = getBossHp(regionIndex);
    setBossFightHp({ hp: maxHp, maxHp });

    const hits = 5;
    for (let i = 0; i < hits; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      setBossFightHp((prev) => (prev ? { ...prev, hp: Math.max(0, prev.hp - maxHp / hits) } : prev));
      setAttacking(true);
      setTimeout(() => setAttacking(false), 250);
      setMonsterHurt(true);
      setTimeout(() => setMonsterHurt(false), 250);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const baseReward = getBossReward(regionIndex);
    const reward = {
      gold: Math.round(baseReward.gold * (1 + rewardBonusPercent / 100)),
      exp: Math.round(baseReward.exp * (1 + rewardBonusPercent / 100)),
    };
    const newUnlocked = Math.max(current.unlockedRegionIndex, regionIndex + 1);
    const justUnlockedNext = newUnlocked > current.unlockedRegionIndex && regionIndex + 1 < regions.length;

    let nextRegionIndex = current.regionIndex;
    let nextStage = current.stage;
    const regionStage = [...current.regionStage];
    if (justUnlockedNext) {
      nextRegionIndex = regionIndex + 1;
      nextStage = regionStage[nextRegionIndex] ?? 1;
    }

    let exp = current.exp + reward.exp;
    let level = current.level;
    let expToNext = getExpToNextLevel(level);
    while (exp >= expToNext) {
      exp -= expToNext;
      level += 1;
      expToNext = getExpToNextLevel(level);
    }

    const equipBonuses = current.equipBonuses ?? emptyEquipBonuses;
    const traitBonuses = current.traitBonuses ?? emptyTraitBonuses;
    const goldMultiplier = 1 + (equipBonuses.goldFind + traitBonuses.goldFindPercent) / 100;
    const bossGold = Math.round(reward.gold * goldMultiplier);

    const next = {
      ...current,
      gold: current.gold + bossGold,
      exp,
      level,
      unlockedRegionIndex: newUnlocked,
      regionIndex: nextRegionIndex,
      stage: nextStage,
      regionStage,
      killIndexInStage: 0,
      isElite: false,
      ...initialMonsterState(nextRegionIndex, nextStage),
    };

    battleRef.current = next;
    setBattle(next);
    setBossFightHp(null);
    setBossResult({
      bossName: region.boss.name,
      bossEmoji: region.boss.emoji,
      storyLine: region.clearStory,
      gold: bossGold,
      exp: reward.exp,
      justUnlockedNext,
      mercenary: mercenary ? { nickname: mercenary.nickname, rewardBonusPercent } : null,
    });

    if (justUnlockedNext) {
      postGuildNews(
        character.user_id,
        character.nickname,
        `${character.nickname}님이 ${regions[nextRegionIndex].name}을 개척했습니다!`
      );
    }

    if (mercenary) {
      await hireMercenary(character.user_id, character.nickname, mercenary, regionIndex);
      setRemainingHires((prev) => Math.max(0, prev - 1));
      setSelectedMercenary(null);
    }

    await saveProgress(character, next);
    await refreshCharacter();
    bossFightingRef.current = false;
  }

  if (!character || !job) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const expToNext = getExpToNextLevel(battle.level);
  const equipBonuses = battle.equipBonuses ?? emptyEquipBonuses;
  const traitBonuses = battle.traitBonuses ?? emptyTraitBonuses;
  const region = regions[battle.regionIndex];
  const hasAdvantage = hasElementAdvantage(equipBonuses.weaponElement, region.element);
  const attack =
    (getTotalAttack(character.job, battle.level, battle.enhanceLevel) + equipBonuses.attackFlat) *
    (1 + traitBonuses.attackPercent / 100) *
    (hasAdvantage ? elementAdvantageMultiplier : 1) *
    (battle.cheerBuffActive ? 1 + cheerBuffAttackPercent / 100 : 1);
  const monsterInfo = region.monsters[battle.killIndexInStage % region.monsters.length];
  const isBossReady = battle.stage >= stagesPerRegion;

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <WelcomeBackModal summary={welcomeSummary} onClose={clearWelcomeSummary} />
      <CheerNotificationModal cheers={cheerNotifications} onClose={clearCheerNotifications} />
      <BossResultModal result={bossResult} onClose={() => setBossResult(null)} />

      {eventMessage && (
        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {eventMessage}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-3xl">{job.emoji}</span>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-zinc-950 dark:text-white">
              {character.nickname} · Lv.{battle.level}
              {battle.enhanceLevel > 0 && (
                <span className="ml-1 text-xs font-normal text-emerald-500">
                  (강화 +{battle.enhanceLevel})
                </span>
              )}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              공격력 {formatNumber(attack)}
              {battle.enhanceLevel > 0 && (
                <span className="text-emerald-500">
                  {" "}
                  (강화 +{formatNumber(getEnhanceAttackBonus(battle.enhanceLevel))})
                </span>
              )}
              {equipBonuses.attackFlat > 0 && (
                <span className="text-sky-500"> (장비 +{formatNumber(equipBonuses.attackFlat)})</span>
              )}
            </span>
          </div>
          <ProgressBar value={battle.exp} max={expToNext} colorClassName="bg-sky-500" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
        <span className="text-zinc-500 dark:text-zinc-400">보유 골드</span>
        <span className="font-semibold text-amber-500">{formatNumber(battle.gold)} G</span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
        <span className="text-zinc-500 dark:text-zinc-400">
          내 무기 속성{" "}
          {equipBonuses.weaponElement
            ? `${getElement(equipBonuses.weaponElement)?.emoji ?? ""} ${equipBonuses.weaponElement}`
            : "없음"}
          {" · "}
          이 지역 속성 {getElement(region.element)?.emoji ?? ""} {region.element}
        </span>
        {hasAdvantage ? (
          <span className="font-semibold text-emerald-500">상성 우세! 피해 +50%</span>
        ) : (
          <span className="text-xs text-zinc-400">상성 없음</span>
        )}
      </div>

      {battle.cheerBuffActive && (
        <div className="rounded-lg bg-pink-100 px-4 py-2 text-center text-sm font-medium text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
          📣 응원 버프 적용 중! 공격력 +{cheerBuffAttackPercent}%
        </div>
      )}

      <RegionSelector
        activeIndex={battle.regionIndex}
        unlockedIndex={battle.unlockedRegionIndex}
        onSelect={handleSelectRegion}
      />

      {/* 모험 장면: 하늘/땅이 있는 2D 무대 위에서 캐릭터와 몬스터가 마주본다 */}
      <div
        className={`relative h-72 overflow-hidden rounded-2xl border border-zinc-200 shadow-inner dark:border-zinc-800 ${
          shake ? "screen-shake" : ""
        }`}
      >
        <DropToast drops={drops} />

        {/* 하늘 */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-200 to-amber-50" />
        <div className="cloud-drift absolute left-6 top-6 h-6 w-16 rounded-full bg-white/80" />
        <div className="cloud-drift absolute left-24 top-12 h-5 w-12 rounded-full bg-white/70" style={{ animationDelay: "1.5s" }} />
        <div className="absolute right-8 top-6 h-10 w-10 rounded-full bg-yellow-200 shadow-[0_0_30px_10px_rgba(253,224,71,0.6)]" />

        {/* 땅 */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-emerald-400 to-emerald-600" />
        <div className="absolute inset-x-0 bottom-24 h-1 bg-emerald-700/40" />

        {showLevelUp && (
          <div className="level-up-pop absolute left-1/2 top-6 -translate-x-1/2 text-lg font-bold text-amber-500 drop-shadow">
            레벨업! Lv.{battle.level}
          </div>
        )}

        {/* 캐릭터 */}
        <div className={`absolute bottom-6 left-10 flex flex-col items-center ${attacking ? "attack-lunge" : ""}`}>
          <span className="text-6xl drop-shadow">{job.emoji}</span>
          <div className="h-2 w-12 rounded-full bg-black/20 blur-[2px]" />
        </div>

        {/* 몬스터 또는 보스 */}
        <div
          className={`absolute bottom-6 right-10 flex flex-col items-center ${
            monsterHurt ? "monster-hurt" : ""
          }`}
        >
          <div className="relative mb-1 w-16">
            <ProgressBar
              value={bossFightHp ? bossFightHp.hp : battle.monsterHp}
              max={bossFightHp ? bossFightHp.maxHp : battle.monsterMaxHp}
              colorClassName={bossFightHp ? "bg-purple-500" : "bg-red-500"}
              heightClassName="h-1.5"
            />
          </div>
          <div className="relative text-6xl drop-shadow">
            {bossFightHp ? region.boss.emoji : monsterInfo.emoji}
            {battle.isElite && !bossFightHp && (
              <span className="absolute -top-2 -right-1 text-lg">⭐</span>
            )}
            {floatingNumbers.map((n) => (
              <span
                key={n.id}
                className={`dmg-number ${n.isCrit ? "text-2xl" : "text-base"}`}
                style={{
                  top: n.isCrit ? "-24px" : "0px",
                  color: n.color ?? (n.isCrit ? "#fde047" : "#ffffff"),
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                }}
              >
                {n.label ? `${n.label} ` : ""}
                {formatNumber(n.damage)}
              </span>
            ))}
          </div>
          <div className="h-2 w-12 rounded-full bg-black/20 blur-[2px]" />
        </div>

        {/* 몬스터 이름표 */}
        <div className="absolute bottom-1 right-6 text-[11px] font-medium text-emerald-900/70">
          {bossFightHp
            ? `${region.boss.name} 도전 중...`
            : `${monsterInfo.name}${battle.isElite ? " (정예)" : ""} · ${region.name} ${battle.stage}스테이지`}
        </div>

        {/* 보물 고블린: 항상 맨 위에 그려서 확실히 탭할 수 있게 한다 */}
        {goblin && (
          <button
            type="button"
            onClick={handleCatchGoblin}
            className="goblin-run z-30 bottom-16 flex h-14 w-14 items-center justify-center whitespace-nowrap text-4xl leading-none"
            style={{ animationDuration: `${goblinVisibleDurationMs}ms` }}
            aria-label="보물 고블린 잡기"
          >
            👺
          </button>
        )}
      </div>

      {isBossReady && !bossFightHp && (
        <div className="flex flex-col gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{region.boss.emoji}</span>
              <span className="text-sm font-medium text-zinc-950 dark:text-white">
                지역 보스: {region.boss.name}
              </span>
            </div>
            <button
              type="button"
              onClick={challengeBoss}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
            >
              도전하기
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            {selectedMercenary ? (
              <span className="text-sky-600 dark:text-sky-400">
                🤝 {selectedMercenary.nickname}(Lv.{selectedMercenary.level})과 함께 도전 (보상 +
                {getMercenaryRewardBonusPercent(selectedMercenary.level)}%)
              </span>
            ) : (
              <span className="text-zinc-400">용병 없이 도전</span>
            )}
            <div className="flex items-center gap-2">
              {selectedMercenary && (
                <button
                  type="button"
                  onClick={() => setSelectedMercenary(null)}
                  className="text-zinc-400 underline"
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowMercenaryPicker((v) => !v)}
                disabled={remainingHires <= 0 || roster.length === 0}
                className="rounded-lg border border-purple-300 px-2 py-1 font-medium text-purple-600 disabled:opacity-40 dark:border-purple-700 dark:text-purple-300"
              >
                🤝 용병 데려가기 ({remainingHires}/{mercenaryDailyLimit})
              </button>
            </div>
          </div>

          {showMercenaryPicker && (
            <div className="flex flex-col gap-1 rounded-lg bg-white p-2 dark:bg-zinc-900">
              {roster.length === 0 ? (
                <p className="text-center text-xs text-zinc-400">아직 다른 길드원이 없습니다.</p>
              ) : (
                roster.map((member) => {
                  const memberJob = getJob(member.job);
                  return (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => {
                        setSelectedMercenary(member);
                        setShowMercenaryPicker(false);
                      }}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span>
                        {memberJob?.emoji ?? "🙂"} {member.nickname} · Lv.{member.level}
                      </span>
                      <span className="text-sky-500">+{getMercenaryRewardBonusPercent(member.level)}%</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {merchant && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧳</span>
            <div>
              <p className="text-sm font-medium text-zinc-950 dark:text-white">
                방랑 상인:{" "}
                <span style={{ color: getGrade(merchant.item.grade).color }}>
                  {getGrade(merchant.item.grade).label} {getSlot(merchant.item.slot).label}
                </span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">잠시 후 떠납니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBuyMerchantItem}
            disabled={battle.gold < merchant.price}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {formatNumber(merchant.price)}G
          </button>
        </div>
      )}

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        나머지 돌발 이벤트는 다음 단계에서 추가될 예정입니다.
      </p>
    </div>
  );
}
