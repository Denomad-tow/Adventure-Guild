"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatRelativeTime, formatNumber, formatDuration } from "@/lib/format";
import { getJob } from "@/config/jobs";
import { sendCheer, getRemainingCheersToday } from "@/lib/cheers";
import { cheerDailyLimit, cheerContributionReward } from "@/config/guild";
import ProgressBar from "@/components/ProgressBar";
import VillageScene from "@/components/VillageScene";
import { fetchEquippedBonuses } from "@/lib/equipmentBonuses";
import { getTraitBonuses } from "@/config/traits";
import { postGuildNews } from "@/lib/guildNews";
import {
  fetchWorldBossState,
  getRemainingChallengesToday,
  fetchContributionBoard,
  computeChallengeDamage,
  challengeWorldBoss,
  countRecentChallengers,
} from "@/lib/worldBoss";
import { getWorldBossLord, worldBossDailyChallengeLimit, rollIllusionWeakness } from "@/config/worldBoss";
import { getElement } from "@/config/elements";
import { getGrade } from "@/config/equipment";
import { regions } from "@/config/regions";
import { applyQuestDeltas } from "@/lib/quests";
import { getAchievement } from "@/config/achievements";
import { applyAchievementUnlock } from "@/lib/achievements";
import { fetchGuildBuildings, fetchBuildingContributionBoard, contributeToBuilding } from "@/lib/guildTown";
import { guildBuildings, getBuildingUpgradeCost, getBuildingEffectValue, guildBuildingMaxLevel } from "@/config/guildTown";
import { rollExpeditionResult, payExpeditionCompanionFee } from "@/lib/expeditions";
import { getAdvancedClassBonuses } from "@/config/advancedClasses";
import { expeditionMissions, getExpeditionMission, expeditionCompanionFeeGold } from "@/config/expeditions";
import { advanceSeasonIfEnded, fetchSeasonLeaderboards } from "@/lib/season";
import { isNewsCategoryVisible } from "@/config/guildNews";
import { fetchRecentMessages, sendChatMessage, subscribeToChatMessages } from "@/lib/guildChat";

const contributionPresets = [1000, 10000, 100000];

const reactionEmojis = ["👏", "😂", "😭", "🔥"];
const NEWS_LIMIT = 30;
const emptyEquipBonuses = {
  attackFlat: 0,
  attackPercent: 0,
  critRate: 0,
  critDamage: 0,
  goldFind: 0,
  weaponElement: null,
  uniqueEffects: [],
  uniqueEffectBonuses: { goldFindPercent: 0, elementAdvantageBonus: 0, critRate: 0, expPercent: 0 },
};
const emptyTraitBonuses = { attackPercent: 0, attackSpeedPercent: 0, goldFindPercent: 0, dropChancePercent: 0 };
const rankingTabs = [
  { id: "level", label: "레벨" },
  { id: "region", label: "도달 지역" },
  { id: "contribution", label: "길드 공헌도" },
];

function getRegionLabel(unlockedRegionIndex) {
  const index = Math.min(unlockedRegionIndex, regions.length - 1);
  return regions[index]?.name ?? regions[0].name;
}

export default function GuildPage() {
  const { character, refreshCharacter } = useAuth();
  const [seasonState, setSeasonState] = useState(null);
  const [seasonBoards, setSeasonBoards] = useState(null);
  const [seasonEndedMessage, setSeasonEndedMessage] = useState(null);

  useEffect(() => {
    if (!character?.user_id) return;
    advanceSeasonIfEnded().then(async ({ result, error }) => {
      if (error) {
        console.error("시즌 확인 실패:", error.message);
        return;
      }
      if (result.just_ended) {
        setSeasonEndedMessage(
          `${result.result_season_number - 1}번째 시즌이 끝나고 보상이 지급됐습니다! ${result.result_season_number}번째 시즌이 시작됩니다.`
        );
      }
      setSeasonState({
        season_number: result.result_season_number,
        started_at: result.result_started_at,
        ends_at: result.result_ends_at,
      });
      const boards = await fetchSeasonLeaderboards(result.result_started_at);
      setSeasonBoards(boards);
    });
  }, [character?.user_id]);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!character?.user_id) return undefined;
    fetchRecentMessages().then(setChatMessages);
    const unsubscribe = subscribeToChatMessages((newMessage) => {
      setChatMessages((prev) => [...prev, newMessage]);
    });
    return unsubscribe;
  }, [character?.user_id]);

  // 새 메시지가 오면(내가 보낸 것 포함) 항상 맨 아래로 스크롤해서, 스크롤을 안 내려도 바로 보이게 한다.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages]);

  async function handleSendChat(e) {
    e.preventDefault();
    if (!character || chatSending || !chatInput.trim()) return;
    setChatSending(true);
    const { error } = await sendChatMessage(character.user_id, character.nickname, chatInput);
    if (error) {
      console.error("채팅 전송 실패:", error.message);
    } else {
      setChatInput("");
    }
    setChatSending(false);
  }

  const [news, setNews] = useState([]);
  const [reactionsByNews, setReactionsByNews] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [roster, setRoster] = useState([]);
  const [remainingCheers, setRemainingCheers] = useState(cheerDailyLimit);
  const [cheerBusyId, setCheerBusyId] = useState(null);
  const [cheerMessage, setCheerMessage] = useState(null);

  const [bossState, setBossState] = useState(null);
  const [phaseEventActive, setPhaseEventActive] = useState(false);
  const [bossBoard, setBossBoard] = useState([]);
  const [remainingChallenges, setRemainingChallenges] = useState(worldBossDailyChallengeLimit);
  const [bossBusy, setBossBusy] = useState(false);
  const [bossMessage, setBossMessage] = useState(null);
  const combatStatsRef = useRef({ equipBonuses: emptyEquipBonuses, traitBonuses: emptyTraitBonuses });

  const [rankingBoard, setRankingBoard] = useState([]);
  const [rankingTab, setRankingTab] = useState("level");

  useEffect(() => {
    if (!character?.user_id) return;
    supabase
      .from("guild_roster")
      .select("*")
      .then(({ data }) => setRankingBoard(data ?? []));
  }, [character?.user_id]);

  const [townBuildings, setTownBuildings] = useState({});
  const [expandedBuilding, setExpandedBuilding] = useState(null);
  const [buildingBoards, setBuildingBoards] = useState({});
  const [contributeBusy, setContributeBusy] = useState(null);
  const [contributeMessage, setContributeMessage] = useState(null);

  const loadTownBuildings = useCallback(async () => {
    const buildings = await fetchGuildBuildings();
    setTownBuildings(buildings);
  }, []);

  useEffect(() => {
    if (!character?.user_id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTownBuildings();
  }, [character?.user_id, loadTownBuildings]);

  async function toggleBuildingBoard(buildingId) {
    if (expandedBuilding === buildingId) {
      setExpandedBuilding(null);
      return;
    }
    setExpandedBuilding(buildingId);
    if (!buildingBoards[buildingId]) {
      const board = await fetchBuildingContributionBoard(buildingId);
      setBuildingBoards((prev) => ({ ...prev, [buildingId]: board }));
    }
  }

  async function handleContribute(buildingId, amount) {
    if (!character || contributeBusy) return;
    if ((character.progress?.gold ?? 0) < amount) return;
    setContributeBusy(buildingId);

    const { result, error } = await contributeToBuilding(buildingId, amount);
    if (error) {
      console.error("길드 마을 기부 실패:", error.message);
      setContributeBusy(null);
      return;
    }

    const building = guildBuildings.find((b) => b.id === buildingId);
    setContributeMessage(`${building.name}에 ${formatNumber(amount)}G 기부했습니다!`);
    setTimeout(() => setContributeMessage(null), 2500);

    if (result.leveled_up) {
      postGuildNews(
        character.user_id,
        character.nickname,
        `${character.nickname}님의 기부로 ${building.name}이(가) Lv.${result.result_level}(으)로 올랐습니다!`,
        "building_levelup"
      );
    }

    await loadTownBuildings();
    if (buildingBoards[buildingId]) {
      const board = await fetchBuildingContributionBoard(buildingId);
      setBuildingBoards((prev) => ({ ...prev, [buildingId]: board }));
    }
    await refreshCharacter();
    setContributeBusy(null);
  }

  const [expeditionBusy, setExpeditionBusy] = useState(false);
  const [expeditionResult, setExpeditionResult] = useState(null);
  const [selectedCompanion, setSelectedCompanion] = useState(null);
  const [showCompanionPicker, setShowCompanionPicker] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const expedition = character?.progress?.expedition ?? null;
  const expeditionMission = expedition ? getExpeditionMission(expedition.missionId) : null;
  const expeditionRemainingMs = expedition ? new Date(expedition.endsAt).getTime() - nowTick : 0;
  const expeditionReady = Boolean(expedition) && expeditionRemainingMs <= 0;

  async function handleStartExpedition(missionId) {
    if (!character || expeditionBusy || expedition) return;
    setExpeditionBusy(true);

    const mission = getExpeditionMission(missionId);
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + mission.durationHours * 3600 * 1000);
    const companion = selectedCompanion;

    if (companion) {
      await payExpeditionCompanionFee(character.user_id, character.nickname, companion, missionId);
    }

    const progress = character.progress ?? {};
    await supabase
      .from("characters")
      .update({
        progress: {
          ...progress,
          expedition: {
            missionId,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString(),
            companionId: companion?.user_id ?? null,
            companionNickname: companion?.nickname ?? null,
          },
        },
      })
      .eq("user_id", character.user_id);

    await refreshCharacter();
    setSelectedCompanion(null);
    setShowCompanionPicker(false);
    setExpeditionBusy(false);
  }

  async function handleReturnExpedition() {
    if (!character || expeditionBusy || !expedition || !expeditionReady) return;
    setExpeditionBusy(true);

    const mission = getExpeditionMission(expedition.missionId);
    const result = rollExpeditionResult(mission, Boolean(expedition.companionId));

    const progress = character.progress ?? {};
    await supabase
      .from("characters")
      .update({
        progress: {
          ...progress,
          gold: (progress.gold ?? 0) + result.gold,
          enhancementStones: (progress.enhancementStones ?? 0) + result.stones,
          expedition: null,
        },
      })
      .eq("user_id", character.user_id);

    await refreshCharacter();
    setExpeditionResult({ mission, companionNickname: expedition.companionNickname, ...result });
    setExpeditionBusy(false);
  }

  const loadWorldBoss = useCallback(async (userId, lordIndexHint) => {
    const state = await fetchWorldBossState();
    if (!state) return;
    setBossState(state);
    setPhaseEventActive(Boolean(state.phase_event_until && new Date(state.phase_event_until).getTime() > Date.now()));
    const lordIndex = lordIndexHint ?? state.lord_index;
    const [remaining, board] = await Promise.all([
      userId ? getRemainingChallengesToday(userId, lordIndex) : worldBossDailyChallengeLimit,
      fetchContributionBoard(lordIndex),
    ]);
    setRemainingChallenges(remaining);
    setBossBoard(board);
  }, []);

  useEffect(() => {
    if (!character?.user_id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorldBoss(character.user_id);
    fetchEquippedBonuses(character.user_id)
      .then((equipBonuses) => {
        combatStatsRef.current = {
          equipBonuses: equipBonuses ?? emptyEquipBonuses,
          traitBonuses: getTraitBonuses(character.progress?.traits),
        };
      })
      .catch(() => {});
  }, [character?.user_id, character?.progress?.traits, loadWorldBoss]);

  async function handleChallengeBoss() {
    if (!character || !bossState || bossBusy || remainingChallenges <= 0) return;
    setBossBusy(true);

    const phaseEventActive = Boolean(
      bossState.phase_event_until && new Date(bossState.phase_event_until).getTime() > Date.now()
    );
    const { equipBonuses, traitBonuses } = combatStatsRef.current;
    const advancedClassBonuses = getAdvancedClassBonuses(
      character.job,
      character.progress?.advancedClass,
      character.progress?.advancedClassTier ?? 1
    );
    const currentLord = getWorldBossLord(bossState.lord_index);
    const weaknessOverride = currentLord.id === "illusion" ? rollIllusionWeakness() : null;
    const recentChallengerCount =
      currentLord.id === "storm" || currentLord.id === "riftking"
        ? await countRecentChallengers(bossState.lord_index)
        : 0;
    const damage = computeChallengeDamage({
      job: character.job,
      level: character.level,
      enhanceLevel: character.progress?.enhanceLevel ?? 0,
      equipBonuses,
      traitBonuses,
      advancedClassBonuses,
      gold: character.progress?.gold ?? 0,
      lordIndex: bossState.lord_index,
      phaseEventActive,
      weaknessOverride,
      recentChallengerCount,
    });

    const { result, error } = await challengeWorldBoss(damage, character.nickname);
    if (error) {
      console.error("월드 보스 도전 실패:", error.message);
      setBossBusy(false);
      return;
    }

    const defeatedLord = getWorldBossLord(bossState.lord_index);
    if (result.was_lethal) {
      const lootText = result.my_loot_grade
        ? ` + ${getGrade(result.my_loot_grade).label} 장비 획득!`
        : "";
      setBossMessage(
        `${formatNumber(damage)}의 피해! ${defeatedLord.name}을(를) 쓰러뜨렸습니다! 보상 ${formatNumber(
          result.my_reward_gold
        )}G${lootText}`
      );
      postGuildNews(
        character.user_id,
        character.nickname,
        `${character.nickname}님이 길드와 함께 ${defeatedLord.name}을(를) 쓰러뜨렸습니다!`,
        "world_boss_defeat"
      );
      if (result.my_loot_grade === "legendary" || result.my_loot_grade === "mythic") {
        postGuildNews(
          character.user_id,
          character.nickname,
          `${character.nickname}님이 ${defeatedLord.name} 처치 보상으로 ${getGrade(result.my_loot_grade).label} 장비를 얻었습니다!`,
          "world_boss_loot"
        );
      }

      const finalBlowAchievement = getAchievement("worldBossFinalBlow");
      const progress = character.progress ?? {};
      if (!(progress.achievements ?? []).includes(finalBlowAchievement.id)) {
        await supabase
          .from("characters")
          .update({ progress: applyAchievementUnlock(progress, finalBlowAchievement.id) })
          .eq("user_id", character.user_id);
      }
    } else if (result.phase_event_started) {
      setBossMessage(`${formatNumber(damage)}의 피해! 페이즈 돌입 - 30분간 길드 전체 피해 2배!`);
    } else {
      const weaknessText = weaknessOverride ? ` (이번 약점: ${weaknessOverride})` : "";
      setBossMessage(`${formatNumber(damage)}의 피해를 입혔습니다!${weaknessText}`);
    }
    setTimeout(() => setBossMessage(null), 4000);

    await loadWorldBoss(character.user_id, result.result_lord_index);
    await refreshCharacter();
    setBossBusy(false);
  }

  const loadRoster = useCallback(async (userId) => {
    if (!userId) return;
    const [{ data: rosterData }, remaining] = await Promise.all([
      supabase.from("guild_roster").select("*").neq("user_id", userId),
      getRemainingCheersToday(userId),
    ]);
    setRoster(rosterData ?? []);
    setRemainingCheers(remaining);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster(character?.user_id);
  }, [character?.user_id, loadRoster]);

  async function handleSendCheer(receiver) {
    if (!character || cheerBusyId || remainingCheers <= 0) return;
    setCheerBusyId(receiver.user_id);

    const { error } = await sendCheer(character.user_id, character.nickname, receiver.user_id);
    if (!error) {
      const progress = character.progress ?? {};
      const advancedClassBonuses = getAdvancedClassBonuses(
        character.job,
        progress.advancedClass,
        progress.advancedClassTier ?? 1
      );
      const contributionGain = Math.round(
        cheerContributionReward * (1 + advancedClassBonuses.guildContributionPercent / 100)
      );
      await supabase
        .from("characters")
        .update({
          progress: {
            ...progress,
            guildContribution: (progress.guildContribution ?? 0) + contributionGain,
            quests: applyQuestDeltas(progress.quests, { cheers: 1 }),
          },
        })
        .eq("user_id", character.user_id);
      await refreshCharacter();
      setCheerMessage(`${receiver.nickname}님에게 응원을 보냈습니다!`);
      setTimeout(() => setCheerMessage(null), 2500);
    }

    await loadRoster(character.user_id);
    setCheerBusyId(null);
  }

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data: newsData } = await supabase
      .from("guild_news")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(NEWS_LIMIT);

    const items = newsData ?? [];
    setNews(items);

    if (items.length > 0) {
      const { data: reactionData } = await supabase
        .from("guild_news_reactions")
        .select("*")
        .in("news_id", items.map((n) => n.id));

      const grouped = {};
      for (const reaction of reactionData ?? []) {
        if (!grouped[reaction.news_id]) grouped[reaction.news_id] = [];
        grouped[reaction.news_id].push(reaction);
      }
      setReactionsByNews(grouped);
    } else {
      setReactionsByNews({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFeed();
  }, [loadFeed]);

  async function handleReact(newsId, emoji) {
    if (!character || busyKey) return;
    const key = `${newsId}-${emoji}`;
    setBusyKey(key);

    const existing = (reactionsByNews[newsId] ?? []).find((r) => r.user_id === character.user_id);

    if (existing && existing.emoji === emoji) {
      await supabase.from("guild_news_reactions").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("guild_news_reactions").update({ emoji }).eq("id", existing.id);
    } else {
      await supabase.from("guild_news_reactions").insert({
        news_id: newsId,
        user_id: character.user_id,
        emoji,
      });
    }

    await loadFeed();
    setBusyKey(null);
  }

  if (!character) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const seasonRemainingMs = seasonState ? new Date(seasonState.ends_at).getTime() - nowTick : 0;
  const visibleNews = news.filter((item) => isNewsCategoryVisible(character.progress?.newsFilters, item.category));

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      {seasonEndedMessage && (
        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {seasonEndedMessage}
        </div>
      )}

      {seasonState && (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-950 dark:text-white">🏆 시즌 {seasonState.season_number}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {seasonRemainingMs > 0 ? `${formatDuration(Math.ceil(seasonRemainingMs / 1000))} 남음` : "정산 중..."}
            </span>
          </div>
          {seasonBoards && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "도달 지역", board: seasonBoards.regionBoard },
                { label: "업적", board: seasonBoards.achievementBoard },
                { label: "월드보스 피해", board: seasonBoards.damageBoard },
              ].map(({ label, board }) => (
                <div key={label} className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
                  <p className="mb-1 font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                  {board.length === 0 ? (
                    <p className="text-zinc-400">-</p>
                  ) : (
                    board.slice(0, 3).map((row, i) => (
                      <p key={row.nickname} className="truncate text-zinc-700 dark:text-zinc-300">
                        {i + 1}. {row.nickname} ({formatNumber(row.value)})
                      </p>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h1 className="mb-2 text-lg font-bold text-zinc-950 dark:text-white">길드 채팅</h1>
        <div className="flex h-56 flex-col gap-1.5 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          {chatMessages.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">아직 채팅이 없습니다. 먼저 말을 걸어보세요!</p>
          ) : (
            chatMessages.map((msg) => (
              <p key={msg.id} className="text-sm">
                <span className="font-semibold text-zinc-950 dark:text-white">{msg.nickname}</span>
                <span className="ml-1 text-zinc-600 dark:text-zinc-300">{msg.message}</span>
              </p>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendChat} className="mt-2 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="메시지 입력..."
            maxLength={300}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={chatSending || !chatInput.trim()}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
          >
            전송
          </button>
        </form>
      </div>

      {cheerMessage && (
        <div className="rounded-lg bg-pink-100 px-4 py-2 text-center text-sm font-medium text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
          {cheerMessage}
        </div>
      )}

      {bossState && (() => {
        const lord = getWorldBossLord(bossState.lord_index);
        const weakness = getElement(lord.weakness);
        return (
          <div className="rounded-xl border border-purple-300 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-950 dark:text-white">
                {lord.emoji} {lord.name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                오늘 남은 도전 {remainingChallenges}/{worldBossDailyChallengeLimit}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {lord.weakness ? (
                <>
                  약점 {weakness?.emoji} {lord.weakness} ·{" "}
                </>
              ) : (
                "약점 없음 · "
              )}
              {lord.rule}
            </p>
            <div className="mt-2">
              <ProgressBar
                value={bossState.current_hp}
                max={bossState.max_hp}
                colorClassName="bg-purple-600"
                heightClassName="h-3"
              />
              <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
                {formatNumber(bossState.current_hp)} / {formatNumber(bossState.max_hp)}
              </p>
            </div>
            {phaseEventActive && (
              <p className="mt-1 text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                🔥 페이즈 이벤트 중! 지금 도전하면 피해 2배
              </p>
            )}
            {bossMessage && (
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-center text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {bossMessage}
              </p>
            )}
            {bossBoard.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">기여도 순위</p>
                {bossBoard.map((row, i) => (
                  <div key={row.nickname} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
                    <span>{i + 1}. {row.nickname}</span>
                    <span>{formatNumber(row.damage)}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleChallengeBoss}
              disabled={bossBusy || remainingChallenges <= 0}
              className="mt-3 w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              도전하기
            </button>
          </div>
        );
      })()}

      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-950 dark:text-white">길드원</h1>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            오늘 남은 응원 {remainingCheers}/{cheerDailyLimit}
          </span>
        </div>
        {roster.length === 0 ? (
          <p className="mt-2 text-center text-sm text-zinc-400">아직 다른 길드원이 없습니다.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {roster.map((member) => {
              const job = getJob(member.job);
              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                >
                  <span className="text-zinc-950 dark:text-white">
                    {job?.emoji ?? "🙂"} {member.nickname} · Lv.{member.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendCheer(member)}
                    disabled={cheerBusyId === member.user_id || remainingCheers <= 0}
                    className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    📣 응원
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-lg font-bold text-zinc-950 dark:text-white">랭킹</h1>
        <div className="mt-2 flex gap-1.5">
          {rankingTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRankingTab(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                rankingTab === tab.id
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {[...rankingBoard]
            .sort((a, b) => {
              if (rankingTab === "region") return b.unlocked_region_index - a.unlocked_region_index;
              if (rankingTab === "contribution") return b.guild_contribution - a.guild_contribution;
              return b.level - a.level;
            })
            .slice(0, 5)
            .map((member, i) => {
              const memberJob = getJob(member.job);
              const isMe = member.user_id === character?.user_id;
              const valueText =
                rankingTab === "region"
                  ? getRegionLabel(member.unlocked_region_index)
                  : rankingTab === "contribution"
                    ? `${formatNumber(member.guild_contribution)}`
                    : `Lv.${member.level}`;
              return (
                <div
                  key={member.user_id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    isMe
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-zinc-100 dark:bg-zinc-900"
                  }`}
                >
                  <span className="text-zinc-950 dark:text-white">
                    {i + 1}. {memberJob?.emoji ?? "🙂"}{" "}
                    {member.equipped_title && (
                      <span className="text-xs text-amber-500">[{member.equipped_title}] </span>
                    )}
                    {member.nickname}
                    {isMe && " (나)"}
                  </span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">{valueText}</span>
                </div>
              );
            })}
        </div>
      </div>

      <div>
        <h1 className="text-lg font-bold text-zinc-950 dark:text-white">길드 마을</h1>
        {contributeMessage && (
          <p className="mt-1 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {contributeMessage}
          </p>
        )}
        <div className="mt-2">
          <VillageScene
            buildings={guildBuildings}
            buildingLevels={townBuildings}
            maxLevel={guildBuildingMaxLevel}
            selectedId={expandedBuilding}
            onSelect={toggleBuildingBoard}
          />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {guildBuildings.map((building) => {
            const state = townBuildings[building.id] ?? { level: 0, progress_gold: 0 };
            const maxed = state.level >= guildBuildingMaxLevel;
            const cost = maxed ? null : getBuildingUpgradeCost(state.level);
            const effectValue = getBuildingEffectValue(building.id, state.level);
            const board = buildingBoards[building.id];
            const expanded = expandedBuilding === building.id;
            return (
              <div key={building.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {building.icon} {building.name} Lv.{state.level}
                  </span>
                  <span className="text-xs text-emerald-500">
                    {building.effectLabel} +{effectValue}
                    {building.effectSuffix}
                  </span>
                </div>
                {!maxed ? (
                  <div className="mt-2">
                    <ProgressBar
                      value={state.progress_gold}
                      max={cost}
                      colorClassName="bg-amber-500"
                      heightClassName="h-1.5"
                    />
                    <p className="mt-1 text-right text-[11px] text-zinc-400">
                      {formatNumber(state.progress_gold)} / {formatNumber(cost)}G
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-center text-xs text-zinc-400">최대 레벨입니다.</p>
                )}
                <div className="mt-2 flex gap-1.5">
                  {contributionPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleContribute(building.id, amount)}
                      disabled={maxed || Boolean(contributeBusy) || (character.progress?.gold ?? 0) < amount}
                      className="flex-1 rounded-lg border border-amber-400 py-1.5 text-xs font-medium text-amber-600 disabled:opacity-40 dark:text-amber-400"
                    >
                      {formatNumber(amount)}G
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toggleBuildingBoard(building.id)}
                  className="mt-2 w-full text-center text-[11px] text-zinc-400 underline"
                >
                  {expanded ? "기부 순위 접기" : "기부 순위 보기"}
                </button>
                {expanded && (
                  <div className="mt-1 flex flex-col gap-1">
                    {(board ?? []).length === 0 ? (
                      <p className="text-center text-[11px] text-zinc-400">아직 기부한 사람이 없습니다.</p>
                    ) : (
                      board.map((row, i) => (
                        <div
                          key={row.nickname}
                          className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400"
                        >
                          <span>
                            {i + 1}. {row.nickname}
                          </span>
                          <span>{formatNumber(row.amount)}G</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h1 className="text-lg font-bold text-zinc-950 dark:text-white">파견</h1>

        {expeditionResult && (
          <div className="mt-2 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
            <p className={expeditionResult.success ? "font-semibold text-emerald-500" : "font-semibold text-zinc-500 dark:text-zinc-400"}>
              {expeditionResult.mission.icon} {expeditionResult.mission.name} {expeditionResult.success ? "성공!" : "아쉽게 실패..."}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{expeditionResult.storyLine}</p>
            <p className="mt-1 text-xs font-medium text-amber-500">
              +{formatNumber(expeditionResult.gold)}G · 🔩+{formatNumber(expeditionResult.stones)}
            </p>
            <button
              type="button"
              onClick={() => setExpeditionResult(null)}
              className="mt-2 w-full rounded-lg bg-zinc-950 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
            >
              확인
            </button>
          </div>
        )}

        {expedition ? (
          <div className="mt-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                {expeditionMission?.icon} {expeditionMission?.name}
              </span>
              {expedition.companionNickname && (
                <span className="text-xs text-sky-500">🤝 {expedition.companionNickname}</span>
              )}
            </div>
            <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {expeditionReady
                ? "원정대가 돌아왔습니다!"
                : `복귀까지 ${formatDuration(Math.ceil(expeditionRemainingMs / 1000))}`}
            </p>
            <button
              type="button"
              onClick={handleReturnExpedition}
              disabled={expeditionBusy || !expeditionReady}
              className="mt-3 w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
            >
              복귀하기
            </button>
          </div>
        ) : (
          <>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-900">
              {selectedCompanion ? (
                <span className="text-sky-600 dark:text-sky-400">
                  🤝 {selectedCompanion.nickname}과 동행 (사례금 {formatNumber(expeditionCompanionFeeGold)}G)
                </span>
              ) : (
                <span className="text-zinc-400">동행 없음</span>
              )}
              <div className="flex items-center gap-2">
                {selectedCompanion && (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanion(null)}
                    className="text-zinc-400 underline"
                  >
                    취소
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCompanionPicker((v) => !v)}
                  disabled={roster.length === 0}
                  className="rounded-lg border border-zinc-300 px-2 py-1 font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                >
                  🤝 동행 선택
                </button>
              </div>
            </div>

            {showCompanionPicker && (
              <div className="mt-1 flex flex-col gap-1 rounded-lg bg-white p-2 dark:bg-zinc-900">
                {roster.length === 0 ? (
                  <p className="text-center text-xs text-zinc-400">아직 다른 길드원이 없습니다.</p>
                ) : (
                  roster.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => {
                        setSelectedCompanion(member);
                        setShowCompanionPicker(false);
                      }}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <span>
                        {member.nickname} · Lv.{member.level}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-2 flex flex-col gap-2">
              {expeditionMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {mission.icon} {mission.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {mission.durationHours}시간 · 성공률 {Math.round(mission.baseSuccessRate * 100)}% ·{" "}
                      {formatNumber(mission.goldMin)}~{formatNumber(mission.goldMax)}G
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartExpedition(mission.id)}
                    disabled={expeditionBusy}
                    className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                  >
                    파견
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-950 dark:text-white">길드 소식</h1>
        <button
          type="button"
          onClick={loadFeed}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-zinc-400">불러오는 중...</p>
      ) : visibleNews.length === 0 ? (
        <p className="text-center text-sm text-zinc-400">
          {news.length === 0
            ? "아직 소식이 없습니다. 지역을 개척하거나 전설 장비를 얻으면 여기 올라와요."
            : "더보기 탭 알림 설정에서 꺼둔 소식만 있습니다."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleNews.map((item) => {
            const reactions = reactionsByNews[item.id] ?? [];
            const myReaction = character
              ? reactions.find((r) => r.user_id === character.user_id)?.emoji
              : null;
            const counts = {};
            for (const r of reactions) {
              counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
            }

            return (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="text-sm text-zinc-950 dark:text-white">{item.message}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatRelativeTime(item.created_at)}</p>

                <div className="mt-3 flex gap-1.5">
                  {reactionEmojis.map((emoji) => {
                    const count = counts[emoji] ?? 0;
                    const isMine = myReaction === emoji;
                    const key = `${item.id}-${emoji}`;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReact(item.id, emoji)}
                        disabled={busyKey === key}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs disabled:opacity-40 ${
                          isMine
                            ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                            : "border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-zinc-500 dark:text-zinc-400">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
