// 퀘스트 목록과 보상. 여기 값만 고치면 퀘스트 목표/보상이 바뀐다.

export const dailyQuests = [
  { id: "kills", label: "몬스터 500마리 처치", target: 500, icon: "⚔️" },
  { id: "cheers", label: "친구 응원 1회 보내기", target: 1, icon: "📣" },
  { id: "enhances", label: "능력치 강화 3회", target: 3, icon: "🛠️" },
];
// 일일 퀘스트 3개를 모두 깨면 받는 보너스 상자
export const dailyBonusBoxGold = 500;

export const weeklyQuests = [
  { id: "worldBossChallenges", label: "월드 보스 10회 도전", target: 10, icon: "👑", rewardGold: 1000 },
  { id: "regionBossClears", label: "지역 보스 1회 격파", target: 1, icon: "🏰", rewardGold: 800 },
];

// 길드원 전체가 힘을 합쳐서 깨는 주간 목표
export const guildWeeklyQuest = {
  id: "guildKills",
  label: "길드원 전체가 몬스터 10만 마리 처치",
  target: 100000,
  icon: "🛡️",
  rewardGold: 3000,
};
