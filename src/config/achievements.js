// 업적 목록. 달성하면 골드 보상 + 칭호를 받는다. (나중에 계속 추가될 예정)
export const achievements = [
  {
    id: "kills10000",
    icon: "⚔️",
    label: "몬스터 학살자",
    description: "몬스터 10,000마리 처치",
    title: "몬스터 학살자",
    rewardGold: 5000,
    target: 10000,
  },
  {
    id: "enhance15",
    icon: "🔨",
    label: "장인의 손길",
    description: "장비 하나를 +15까지 강화 성공",
    title: "전설의 대장장이",
    rewardGold: 3000,
    target: 15,
  },
  {
    id: "worldBossFinalBlow",
    icon: "🎯",
    label: "막타 장인",
    description: "월드 보스에게 막타를 침",
    title: "막타 장인",
    rewardGold: 2000,
  },
  {
    id: "enhanceFailStreak10",
    icon: "💔",
    label: "대장장이의 단골",
    description: "장비 강화 연속 실패 10회 (웃긴 칭호)",
    title: "대장장이의 단골",
    rewardGold: 1000,
    target: 10,
  },
];

export function getAchievement(id) {
  return achievements.find((a) => a.id === id) ?? null;
}
