"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJob } from "@/config/jobs";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import WelcomeBackModal from "@/components/WelcomeBackModal";
import {
  jobBattleStats,
  placeholderMonster,
  getTotalAttack,
  getEnhanceAttackBonus,
  getExpToNextLevel,
  getMonsterMaxHp,
  getMonsterReward,
} from "@/config/balance";

const initialBattleState = {
  level: 1,
  exp: 0,
  gold: 0,
  killCount: 0,
  enhanceLevel: 0,
  monsterMaxHp: getMonsterMaxHp(0),
  monsterHp: getMonsterMaxHp(0),
};

// 몬스터가 데미지를 한 번 맞았을 때 다음 상태를 계산하는 순수 함수.
// (몬스터가 죽으면 보상을 주고, 필요하면 레벨업까지 한 번에 처리한다)
function applyHit(state, damage) {
  const remainingHp = state.monsterHp - damage;
  if (remainingHp > 0) {
    return { ...state, monsterHp: remainingHp };
  }

  const reward = getMonsterReward(state.killCount);
  let level = state.level;
  let exp = state.exp + reward.exp;
  const gold = state.gold + reward.gold;
  const killCount = state.killCount + 1;

  let expToNext = getExpToNextLevel(level);
  while (exp >= expToNext) {
    exp -= expToNext;
    level += 1;
    expToNext = getExpToNextLevel(level);
  }

  const monsterMaxHp = getMonsterMaxHp(killCount);
  return { ...state, level, exp, gold, killCount, monsterMaxHp, monsterHp: monsterMaxHp };
}

async function saveProgress(character, battle) {
  if (!character) return;
  await supabase
    .from("characters")
    .update({
      level: battle.level,
      progress: {
        exp: battle.exp,
        gold: battle.gold,
        killCount: battle.killCount,
        // 성장 탭에서 산 강화 단계는 여기서 건드리지 않고 그대로 들고 다닌다.
        enhanceLevel: battle.enhanceLevel,
        // 다음에 접속했을 때 이 시각을 기준으로 방치 보상을 계산한다.
        lastActiveAt: new Date().toISOString(),
      },
    })
    .eq("user_id", character.user_id);
}

export default function AdventurePage() {
  const { character, refreshCharacter, welcomeSummary, clearWelcomeSummary } = useAuth();
  const job = character ? getJob(character.job) : null;

  const [battle, setBattle] = useState(initialBattleState);
  const [floatingNumbers, setFloatingNumbers] = useState([]);
  const [shake, setShake] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [monsterHurt, setMonsterHurt] = useState(false);

  const loadedRef = useRef(false);
  const battleRef = useRef(battle);
  const hitCounterRef = useRef(0);

  // 캐릭터 정보가 도착하면, 저장되어 있던 값으로 전투 상태를 한 번만 채운다.
  // (방치 보상 계산은 로그인 시점에 AuthContext에서 이미 끝난 상태로 넘어온다)
  useEffect(() => {
    if (character && !loadedRef.current) {
      loadedRef.current = true;
      const progress = character.progress ?? {};
      const loaded = {
        level: character.level ?? 1,
        exp: progress.exp ?? 0,
        gold: progress.gold ?? 0,
        killCount: progress.killCount ?? 0,
        enhanceLevel: progress.enhanceLevel ?? 0,
      };
      const monsterMaxHp = getMonsterMaxHp(loaded.killCount);
      const state = { ...loaded, monsterMaxHp, monsterHp: monsterMaxHp };
      battleRef.current = state;
      setBattle(state);
    }
  }, [character]);

  // 자동 공격 타이머. 데미지 계산, 화면 효과, 레벨업 저장까지 여기서 한 번에 처리한다.
  useEffect(() => {
    if (!character) return;
    const stats = jobBattleStats[character.job] ?? jobBattleStats.warrior;
    const intervalMs = 1000 / stats.attackSpeed;

    const timer = setInterval(() => {
      if (!loadedRef.current) return;
      const current = battleRef.current;
      const attack = getTotalAttack(character.job, current.level, current.enhanceLevel);
      const isCrit = Math.random() < stats.critRate;
      const damage = Math.round(attack * (isCrit ? stats.critDamage : 1));
      const next = applyHit(current, damage);

      battleRef.current = next;
      setBattle(next);

      const hitId = ++hitCounterRef.current;
      setFloatingNumbers((prev) => [...prev, { id: hitId, damage, isCrit }]);
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

      if (next.level > current.level) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 1500);
        saveProgress(character, next).then(() => refreshCharacter());
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [character?.job, character?.user_id, character, refreshCharacter]);

  // 화면을 나갈 때(다른 탭 이동 등) 지금까지 진행 상황을 저장하고,
  // 다른 탭(성장 등)에서도 최신 골드/레벨을 볼 수 있게 캐릭터 정보를 새로고침한다.
  useEffect(() => {
    return () => {
      if (loadedRef.current) {
        saveProgress(character, battleRef.current).then(() => refreshCharacter());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.user_id]);

  if (!character || !job) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const expToNext = getExpToNextLevel(battle.level);
  const attack = getTotalAttack(character.job, battle.level, battle.enhanceLevel);

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <WelcomeBackModal summary={welcomeSummary} onClose={clearWelcomeSummary} />

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
                  (+{formatNumber(getEnhanceAttackBonus(battle.enhanceLevel))})
                </span>
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

      {/* 모험 장면: 하늘/땅이 있는 2D 무대 위에서 캐릭터와 몬스터가 마주본다 */}
      <div
        className={`relative h-72 overflow-hidden rounded-2xl border border-zinc-200 shadow-inner dark:border-zinc-800 ${
          shake ? "screen-shake" : ""
        }`}
      >
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

        {/* 몬스터 */}
        <div
          className={`absolute bottom-6 right-10 flex flex-col items-center ${
            monsterHurt ? "monster-hurt" : ""
          }`}
        >
          <div className="relative mb-1 w-16">
            <ProgressBar value={battle.monsterHp} max={battle.monsterMaxHp} colorClassName="bg-red-500" heightClassName="h-1.5" />
          </div>
          <div className="relative text-6xl drop-shadow">
            {placeholderMonster.emoji}
            {floatingNumbers.map((n) => (
              <span
                key={n.id}
                className={`dmg-number ${
                  n.isCrit ? "text-2xl text-yellow-300" : "text-base text-white"
                }`}
                style={{ top: n.isCrit ? "-10px" : "0px", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
              >
                {formatNumber(n.damage)}
              </span>
            ))}
          </div>
          <div className="h-2 w-12 rounded-full bg-black/20 blur-[2px]" />
        </div>

        {/* 몬스터 이름표 */}
        <div className="absolute bottom-1 right-6 text-[11px] font-medium text-emerald-900/70">
          {placeholderMonster.name} · {battle.killCount + 1}번째
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        모험 일지, 돌발 이벤트는 다음 단계에서 추가될 예정입니다.
      </p>
    </div>
  );
}
