import { getAchievement } from "@/config/achievements";

// progress(이미 이번 저장에서 바뀔 다른 값들까지 반영된 상태)에 업적 하나를 달성 처리한 새 progress를 만든다.
// 이미 달성한 업적이면 아무것도 바꾸지 않는다(중복 보상 방지).
export function applyAchievementUnlock(progress, achievementId) {
  const def = getAchievement(achievementId);
  if (!def) return progress;

  const unlocked = progress.achievements ?? [];
  if (unlocked.includes(achievementId)) return progress;

  const titles = progress.unlockedTitles ?? [];
  return {
    ...progress,
    achievements: [...unlocked, achievementId],
    unlockedTitles: titles.includes(def.title) ? titles : [...titles, def.title],
    gold: (progress.gold ?? 0) + def.rewardGold,
  };
}
