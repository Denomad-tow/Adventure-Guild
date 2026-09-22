// 길드 마을 건물 6종. 길드원 전체가 골드를 기부해서 레벨을 올리고, 효과는 길드원 전원에게 적용된다.
export const guildBuildings = [
  {
    id: "forge",
    name: "대장간",
    icon: "🔨",
    effectLabel: "장비 강화 성공률",
    effectPerLevel: 1, // %포인트
    effectSuffix: "%p",
  },
  {
    id: "magicTower",
    name: "마법탑",
    icon: "🔮",
    effectLabel: "스킬 피해",
    effectPerLevel: 1, // %
    effectSuffix: "%",
  },
  {
    id: "inn",
    name: "여관",
    icon: "🏨",
    effectLabel: "방치 보상 최대 시간",
    effectPerLevel: 0.5, // 시간
    effectSuffix: "시간",
  },
  {
    id: "trainingGround",
    name: "훈련장",
    icon: "🏋️",
    effectLabel: "경험치 획득",
    effectPerLevel: 1, // %
    effectSuffix: "%",
  },
  {
    id: "treasury",
    name: "보물창고",
    icon: "💰",
    effectLabel: "골드 획득",
    effectPerLevel: 1, // %
    effectSuffix: "%",
  },
  {
    id: "guildBoard",
    name: "길드 게시판",
    icon: "📋",
    effectLabel: "일일 퀘스트 보너스 상자 보상",
    effectPerLevel: 2, // %
    effectSuffix: "%",
  },
];

export const guildBuildingMaxLevel = 20;
export const guildBuildingBaseCost = 5000;
export const guildBuildingCostGrowth = 1.25;

export function getGuildBuilding(id) {
  return guildBuildings.find((b) => b.id === id) ?? null;
}

// 레벨 L → L+1로 올리는 데 필요한 골드
export function getBuildingUpgradeCost(currentLevel) {
  return Math.round(guildBuildingBaseCost * Math.pow(guildBuildingCostGrowth, currentLevel));
}

export function getBuildingEffectValue(buildingId, level) {
  const building = getGuildBuilding(buildingId);
  if (!building) return 0;
  return Math.round(building.effectPerLevel * level * 10) / 10;
}

export const emptyGuildTownBonuses = {
  forgeSuccessBonusPercent: 0,
  magicTowerDamageBonusPercent: 0,
  innExtraHours: 0,
  trainingExpBonusPercent: 0,
  treasuryGoldBonusPercent: 0,
  guildBoardRewardBonusPercent: 0,
};
