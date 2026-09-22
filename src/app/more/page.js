"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import { signOut, deleteAccount } from "@/lib/nicknameAuth";
import { dailyQuests, weeklyQuests, guildWeeklyQuest, dailyBonusBoxGold } from "@/config/quests";
import { normalizeQuests, applyQuestDeltas, getCurrentWeekKey } from "@/lib/quests";
import { fetchGuildQuestProgress, countWorldBossChallengesThisWeek } from "@/lib/guildQuest";
import { regions } from "@/config/regions";
import { monsterDexTierLabels, regionDexCompleteBonusPercent } from "@/config/monsterDex";
import { getMonsterKey, getDexTier, getDexBonusPercent, isRegionDexComplete, getCompletedRegionCount } from "@/lib/monsterDex";
import { achievements } from "@/config/achievements";
import { fetchGuildTownBonuses } from "@/lib/guildTown";
import { emptyGuildTownBonuses } from "@/config/guildTown";
import { worldBossLords } from "@/config/worldBoss";
import { fetchDefeatedLordIds } from "@/lib/worldBoss";
import { guildNewsCategories, getDefaultNewsFilters } from "@/config/guildNews";

const moreTabs = [
  { id: "quests", label: "퀘스트" },
  { id: "dex", label: "도감" },
  { id: "achievements", label: "업적" },
  { id: "titles", label: "칭호" },
  { id: "chronicle", label: "연대기" },
];

export default function MorePage() {
  const { character, refreshCharacter } = useAuth();
  const [activeTab, setActiveTab] = useState("quests");
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [guildQuestProgress, setGuildQuestProgress] = useState(0);
  const [worldBossWeeklyCount, setWorldBossWeeklyCount] = useState(0);
  const [claimBusy, setClaimBusy] = useState(false);
  const [guildTownBonuses, setGuildTownBonuses] = useState(emptyGuildTownBonuses);
  const [defeatedLordIds, setDefeatedLordIds] = useState(new Set());

  useEffect(() => {
    if (!character?.user_id) return;
    fetchGuildQuestProgress().then((result) => setGuildQuestProgress(result.killCount));
    countWorldBossChallengesThisWeek(character.user_id).then(setWorldBossWeeklyCount);
    fetchGuildTownBonuses()
      .then(setGuildTownBonuses)
      .catch(() => setGuildTownBonuses(emptyGuildTownBonuses));
    fetchDefeatedLordIds(character.user_id).then(setDefeatedLordIds);
  }, [character?.user_id]);

  function openConfirm() {
    setError("");
    setPassword("");
    setConfirming(true);
  }

  function cancelConfirm() {
    setConfirming(false);
    setPassword("");
    setError("");
  }

  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setDeleting(true);
    const result = await deleteAccount(password);
    setDeleting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  if (!character) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const progress = character.progress ?? {};
  const quests = normalizeQuests(progress.quests);
  const dailyValues = { kills: quests.daily.kills, cheers: quests.daily.cheers, enhances: quests.daily.enhances };
  const dailyAllDone = dailyQuests.every((q) => dailyValues[q.id] >= q.target);
  const canClaimDailyBox = dailyAllDone && !quests.daily.boxClaimed;

  const weeklyValues = {
    worldBossChallenges: worldBossWeeklyCount,
    regionBossClears: quests.weekly.regionBossClears,
  };

  const guildDone = guildQuestProgress >= guildWeeklyQuest.target;
  const guildAlreadyClaimed = quests.guildWeeklyClaimedWeekKey === getCurrentWeekKey();
  const canClaimGuildReward = guildDone && !guildAlreadyClaimed;

  const monsterDex = progress.monsterDex ?? {};
  const unlockedAchievements = progress.achievements ?? [];
  const unlockedTitles = progress.unlockedTitles ?? [];
  const equippedTitle = progress.equippedTitle ?? null;
  const completedRegionCount = getCompletedRegionCount(monsterDex, regions);
  const dailyBoxReward = Math.round(dailyBonusBoxGold * (1 + guildTownBonuses.guildBoardRewardBonusPercent / 100));

  const unlockedRegionIndex = progress.unlockedRegionIndex ?? 0;
  const regionStories = regions
    .map((region, index) => ({ region, index }))
    .filter(({ index }) => unlockedRegionIndex > index);
  const lordStories = worldBossLords.filter((lord) => defeatedLordIds.has(lord.id));
  const newsFilters = { ...getDefaultNewsFilters(), ...(progress.newsFilters ?? {}) };

  async function updateProgress(updater) {
    setClaimBusy(true);
    await supabase
      .from("characters")
      .update({ progress: updater(progress) })
      .eq("user_id", character.user_id);
    await refreshCharacter();
    setClaimBusy(false);
  }

  async function claimDailyBox() {
    if (claimBusy || !canClaimDailyBox) return;
    await updateProgress((p) => ({
      ...p,
      gold: (p.gold ?? 0) + dailyBoxReward,
      quests: applyQuestDeltas(p.quests, { dailyBoxClaimed: true }),
    }));
  }

  async function claimWeeklyQuest(quest) {
    const value = weeklyValues[quest.id];
    const alreadyClaimed = quests.weekly.claimedIds.includes(quest.id);
    if (claimBusy || value < quest.target || alreadyClaimed) return;
    await updateProgress((p) => ({
      ...p,
      gold: (p.gold ?? 0) + quest.rewardGold,
      quests: applyQuestDeltas(p.quests, { weeklyClaimId: quest.id }),
    }));
  }

  async function claimGuildReward() {
    if (claimBusy || !canClaimGuildReward) return;
    await updateProgress((p) => ({
      ...p,
      gold: (p.gold ?? 0) + guildWeeklyQuest.rewardGold,
      quests: applyQuestDeltas(p.quests, { guildWeeklyClaimedWeekKey: getCurrentWeekKey() }),
    }));
  }

  async function handleEquipTitle(title) {
    if (claimBusy) return;
    await updateProgress((p) => ({ ...p, equippedTitle: title }));
  }

  async function handleToggleNewsFilter(categoryId) {
    if (claimBusy) return;
    const current = { ...getDefaultNewsFilters(), ...(progress.newsFilters ?? {}) };
    current[categoryId] = !current[categoryId];
    await updateProgress((p) => ({ ...p, newsFilters: current }));
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {moreTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "quests" && (
        <>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">일일 퀘스트</h2>
            <div className="mt-2 flex flex-col gap-2">
              {dailyQuests.map((q) => {
                const value = dailyValues[q.id];
                const done = value >= q.target;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                  >
                    <span className={done ? "text-emerald-500" : "text-zinc-950 dark:text-white"}>
                      {q.icon} {q.label} {done && "✓"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatNumber(Math.min(value, q.target))}/{formatNumber(q.target)}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={claimDailyBox}
              disabled={claimBusy || !canClaimDailyBox}
              className="mt-3 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {quests.daily.boxClaimed
                ? "오늘 보너스 상자 수령 완료"
                : `보너스 상자 수령하기 (+${formatNumber(dailyBoxReward)}G)`}
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">주간 퀘스트</h2>
            <div className="mt-2 flex flex-col gap-2">
              {weeklyQuests.map((q) => {
                const value = weeklyValues[q.id];
                const done = value >= q.target;
                const claimed = quests.weekly.claimedIds.includes(q.id);
                return (
                  <div key={q.id} className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <span className={done ? "text-emerald-500" : "text-zinc-950 dark:text-white"}>
                        {q.icon} {q.label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatNumber(Math.min(value, q.target))}/{formatNumber(q.target)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => claimWeeklyQuest(q)}
                      disabled={claimBusy || !done || claimed}
                      className="mt-1.5 w-full rounded-lg border border-amber-400 py-1.5 text-xs font-medium text-amber-600 disabled:opacity-40 dark:text-amber-400"
                    >
                      {claimed ? "수령 완료" : `보상 받기 (+${formatNumber(q.rewardGold)}G)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">길드 공동 퀘스트</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              길드원 전체의 진행도를 합산합니다. 매주 초기화돼요.
            </p>
            <div className="mt-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className={guildDone ? "text-emerald-500" : "text-zinc-950 dark:text-white"}>
                  {guildWeeklyQuest.icon} {guildWeeklyQuest.label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatNumber(Math.min(guildQuestProgress, guildWeeklyQuest.target))}/
                  {formatNumber(guildWeeklyQuest.target)}
                </span>
              </div>
              <button
                type="button"
                onClick={claimGuildReward}
                disabled={claimBusy || !canClaimGuildReward}
                className="mt-1.5 w-full rounded-lg border border-amber-400 py-1.5 text-xs font-medium text-amber-600 disabled:opacity-40 dark:text-amber-400"
              >
                {guildAlreadyClaimed ? "수령 완료" : `보상 받기 (+${formatNumber(guildWeeklyQuest.rewardGold)}G)`}
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "dex" && (
        <>
          <div className="rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            완성한 지역 도감 {completedRegionCount}개 · 공격력 +{completedRegionCount * regionDexCompleteBonusPercent}%
          </div>
          {regions.map((region) => {
            const complete = isRegionDexComplete(monsterDex, region);
            return (
              <div key={region.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{region.name}</h2>
                  {complete && (
                    <span className="text-xs font-semibold text-emerald-500">✅ 도감 완성</span>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {region.monsters.map((monster) => {
                    const key = getMonsterKey(region.id, monster.name);
                    const count = monsterDex[key] ?? 0;
                    const tier = getDexTier(count);
                    const bonus = getDexBonusPercent(count);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                      >
                        <span className={tier === 0 ? "text-zinc-400" : "text-zinc-950 dark:text-white"}>
                          {monster.emoji} {monster.name}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {tier === 0
                            ? "미등록"
                            : `${monsterDexTierLabels[tier - 1]} · ${formatNumber(count)}마리 · 피해 +${bonus}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {activeTab === "achievements" && (
        <div className="flex flex-col gap-2">
          {achievements.map((a) => {
            const done = unlockedAchievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-xl border p-4 ${
                  done ? "border-emerald-300 dark:border-emerald-800" : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${done ? "text-emerald-500" : "text-zinc-950 dark:text-white"}`}>
                    {a.icon} {a.label} {done && "✓"}
                  </span>
                  <span className="text-xs text-amber-500">+{formatNumber(a.rewardGold)}G</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{a.description}</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">획득 칭호: {a.title}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "titles" && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleEquipTitle(null)}
            disabled={claimBusy}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm disabled:opacity-40 ${
              !equippedTitle
                ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                : "border-zinc-200 dark:border-zinc-700"
            }`}
          >
            없음
          </button>
          {unlockedTitles.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">아직 얻은 칭호가 없습니다. 업적을 달성해보세요.</p>
          ) : (
            unlockedTitles.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => handleEquipTitle(title)}
                disabled={claimBusy}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm disabled:opacity-40 ${
                  equippedTitle === title
                    ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {title}
              </button>
            ))
          )}
        </div>
      )}

      {activeTab === "chronicle" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">지역 이야기</h2>
            {regionStories.length === 0 ? (
              <p className="text-center text-sm text-zinc-400">아직 열린 이야기가 없습니다. 지역 보스를 격파해보세요.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {regionStories.map(({ region }) => (
                  <div key={region.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {region.boss.emoji} {region.name} - {region.boss.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{region.clearStory}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">군주 이야기</h2>
            {lordStories.length === 0 ? (
              <p className="text-center text-sm text-zinc-400">
                아직 열린 이야기가 없습니다. 길드와 함께 월드 보스를 처치해보세요.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {lordStories.map((lord) => (
                  <div key={lord.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {lord.emoji} {lord.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{lord.story}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">길드 소식 알림 설정</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          꺼두면 길드 탭 소식 피드에서 그 종류만 안 보입니다 (다른 사람에게는 그대로 올라가요).
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {guildNewsCategories.map((category) => (
            <label
              key={category.id}
              className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
            >
              <span className="text-zinc-950 dark:text-white">{category.label}</span>
              <input
                type="checkbox"
                checked={newsFilters[category.id] !== false}
                onChange={() => handleToggleNewsFilter(category.id)}
                disabled={claimBusy}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-lg border border-zinc-300 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          로그아웃
        </button>

        {!confirming && (
          <button
            type="button"
            onClick={openConfirm}
            className="w-full rounded-lg border border-red-300 py-3 text-sm font-medium text-red-500 dark:border-red-900"
          >
            회원 탈퇴
          </button>
        )}

        {confirming && (
          <form
            onSubmit={handleConfirmDelete}
            className="flex flex-col gap-2 rounded-lg border border-red-300 p-4 dark:border-red-900"
          >
            <p className="text-sm font-medium text-red-500">
              탈퇴하면 캐릭터 정보가 모두 삭제되며 되돌릴 수 없습니다.
              계속하려면 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelConfirm}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
