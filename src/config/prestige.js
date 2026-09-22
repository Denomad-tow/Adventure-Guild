// 환생(프레스티지) 관련 수치.
export const prestigeRequiredRegionIndex = 4; // unlockedRegionIndex가 이 값 이상이면(4번째 지역 보스 격파) 환생 가능
export const prestigeLevelPerSoulStone = 50; // 레벨 이만큼마다 영혼석 1개

export const relics = [
  {
    id: "allDamage",
    name: "만물의 힘",
    icon: "💪",
    description: "모든 피해",
    effectPerLevel: 2,
    suffix: "%",
    baseCost: 1,
    costGrowth: 1.3,
  },
  {
    id: "idleHours",
    name: "시간의 모래",
    icon: "⏳",
    description: "방치 보상 최대 시간",
    effectPerLevel: 1,
    suffix: "시간",
    baseCost: 2,
    costGrowth: 1.3,
  },
  {
    id: "startingGold",
    name: "황금의 축복",
    icon: "💰",
    description: "환생 시 시작 골드",
    effectPerLevel: 500,
    suffix: "G",
    baseCost: 1,
    costGrowth: 1.2,
  },
];

export const relicMaxLevel = 30;

export function getRelic(id) {
  return relics.find((r) => r.id === id) ?? null;
}

export function getRelicCost(relicId, currentLevel) {
  const relic = getRelic(relicId);
  if (!relic) return 0;
  return Math.ceil(relic.baseCost * Math.pow(relic.costGrowth, currentLevel));
}

export function getRelicEffectValue(relicId, level) {
  const relic = getRelic(relicId);
  return relic ? relic.effectPerLevel * level : 0;
}

export function getSoulStonesForLevel(level) {
  return Math.floor(level / prestigeLevelPerSoulStone);
}
