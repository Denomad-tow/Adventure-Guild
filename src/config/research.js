// 연구: 몬스터를 잡으면 조금씩 쌓이는 "연구 포인트"로, 전투/장비/펫/길드 4개 분야의 영구 효과를 산다.
// 환생해도 사라지지 않는 오래 걸리는 목표다. (영혼석 유물과 비슷하지만, 환생 없이도 꾸준히 모인다)

// 몬스터 한 마리를 잡을 때마다 쌓이는 연구 포인트 (정예는 eliteMultiplier만큼 더 받는다)
export const researchPointsPerKill = 1;

export const researchCategories = [
  {
    id: "combat",
    label: "전투 연구",
    icon: "⚔️",
    nodes: [
      {
        id: "combatAttack",
        name: "타격 훈련",
        description: "공격력",
        bonusType: "attackPercent",
        suffix: "%",
        perLevel: 1,
        maxLevel: 15,
        baseCost: 20,
        costGrowth: 1.25,
      },
      {
        id: "combatCrit",
        name: "회심의 일격",
        description: "치명타 확률",
        bonusType: "critRate",
        suffix: "%p",
        perLevel: 0.5,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
      {
        id: "combatSpeed",
        name: "신속함",
        description: "공격 속도",
        bonusType: "attackSpeedPercent",
        suffix: "%",
        perLevel: 1,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
    ],
  },
  {
    id: "equipment",
    label: "장비 연구",
    icon: "🛡️",
    nodes: [
      {
        id: "equipReforge",
        name: "재련 마스터리",
        description: "장비 재련 비용 감소",
        bonusType: "reforgeCostReductionPercent",
        suffix: "%",
        perLevel: 3,
        maxLevel: 10,
        baseCost: 20,
        costGrowth: 1.25,
      },
      {
        id: "equipForge",
        name: "대장장이의 축복",
        description: "장비 강화 성공률",
        bonusType: "itemEnhanceSuccessBonusPercent",
        suffix: "%p",
        perLevel: 1,
        maxLevel: 10,
        baseCost: 30,
        costGrowth: 1.3,
      },
      {
        id: "equipLuck",
        name: "감정 숙련",
        description: "희귀 드랍 확률",
        bonusType: "dropChancePercent",
        suffix: "%",
        perLevel: 1,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
    ],
  },
  {
    id: "pet",
    label: "펫 연구",
    icon: "🐾",
    nodes: [
      {
        id: "petFeed",
        name: "사육 지식",
        description: "펫 먹이 비용 감소",
        bonusType: "petFeedCostReductionPercent",
        suffix: "%",
        perLevel: 2,
        maxLevel: 10,
        baseCost: 20,
        costGrowth: 1.2,
      },
      {
        id: "petHatch",
        name: "포란술",
        description: "알 부화 시간 감소",
        bonusType: "petHatchSpeedBonusPercent",
        suffix: "%",
        perLevel: 3,
        maxLevel: 10,
        baseCost: 20,
        costGrowth: 1.2,
      },
      {
        id: "petBond",
        name: "교감",
        description: "장착한 펫 효과",
        bonusType: "petBonusValuePercent",
        suffix: "%",
        perLevel: 2,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
    ],
  },
  {
    id: "guild",
    label: "길드 연구",
    icon: "🏰",
    nodes: [
      {
        id: "guildContribution",
        name: "공헌 활동",
        description: "길드 공헌도 획득",
        bonusType: "guildContributionPercent",
        suffix: "%",
        perLevel: 3,
        maxLevel: 10,
        baseCost: 20,
        costGrowth: 1.2,
      },
      {
        id: "guildGold",
        name: "상단 인맥",
        description: "골드 획득",
        bonusType: "goldFindPercent",
        suffix: "%",
        perLevel: 1,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
      {
        id: "guildExp",
        name: "전승 지식",
        description: "경험치 획득",
        bonusType: "expPercent",
        suffix: "%",
        perLevel: 1,
        maxLevel: 10,
        baseCost: 25,
        costGrowth: 1.25,
      },
    ],
  },
];

export function getAllResearchNodes() {
  return researchCategories.flatMap((c) => c.nodes);
}

export function getResearchNode(nodeId) {
  return getAllResearchNodes().find((n) => n.id === nodeId) ?? null;
}

export function getResearchCost(nodeId, currentLevel) {
  const node = getResearchNode(nodeId);
  if (!node) return 0;
  return Math.round(node.baseCost * Math.pow(node.costGrowth, currentLevel));
}

export const emptyResearchBonuses = {
  attackPercent: 0,
  critRate: 0,
  attackSpeedPercent: 0,
  reforgeCostReductionPercent: 0,
  itemEnhanceSuccessBonusPercent: 0,
  dropChancePercent: 0,
  petFeedCostReductionPercent: 0,
  petHatchSpeedBonusPercent: 0,
  petBonusValuePercent: 0,
  guildContributionPercent: 0,
  goldFindPercent: 0,
  expPercent: 0,
};

// 보유한 연구 레벨들을 실제 보너스 값으로 바꾼다.
export function getResearchBonuses(researchLevels) {
  const levels = researchLevels ?? {};
  const bonuses = { ...emptyResearchBonuses };
  for (const node of getAllResearchNodes()) {
    const level = levels[node.id] ?? 0;
    bonuses[node.bonusType] = (bonuses[node.bonusType] ?? 0) + node.perLevel * level;
  }
  return bonuses;
}
