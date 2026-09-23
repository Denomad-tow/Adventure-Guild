// 전직: 레벨 100부터 직업마다 두 갈래 중 하나를 고른다. 환생이 생기면 그때 다시 고를 수 있다.
// 2차/3차 전직은 새 갈래가 아니라, 이미 고른 갈래의 이름과 효과가 더 커지는 "승급"이다.
export const advancedClassTierLevels = [100, 500, 1000]; // 1차/2차/3차 전직에 필요한 레벨
export const advancedClassTierMultiplier = [1, 1.6, 2.4]; // 전직 단계별 갈래 고유 효과 배율 (1차 대비 몇 배)
// 갈래 고유 효과와 별개로, 승급하면 모든 직업 공통으로 붙는 추가 효과 (2차/3차가 확실히 다르게 느껴지도록)
export const advancedClassTierBonus = [
  {},
  { attackPercent: 8, attackSpeedPercent: 4 },
  { attackPercent: 18, attackSpeedPercent: 10 },
];
export const advancedClassTierLabels = ["1차", "2차", "3차"];
// 2차/3차로 승급할 때 드는 골드 (1차는 무료, 레벨 조건만 충족하면 된다)
export const advancedClassTierUpgradeCost = [0, 8000, 40000];

// 예전 이름(레벨 X부터 전직 가능)을 그대로 쓰는 곳이 있어 1차 전직 레벨을 그대로 내보낸다.
export const advancedClassLevel = advancedClassTierLevels[0];

// tierNames: [1차, 2차, 3차] 이름. 전직 화면에는 이 이름이 표시된다 (여기만 고치면 이름을 바꿀 수 있다).
export const advancedClasses = {
  warrior: [
    {
      id: "guardianKnight",
      name: "수호기사",
      tierNames: ["수호기사", "수호 기사단장", "불멸의 수호자"],
      description: "공격속도 +10%",
      bonuses: { attackSpeedPercent: 10 },
    },
    {
      id: "berserker",
      name: "광전사",
      tierNames: ["광전사", "광폭왕", "파멸의 화신"],
      description: "치명타 확률 +10%p, 치명타 피해 +15%",
      bonuses: { critRate: 10, critDamage: 15 },
    },
  ],
  mage: [
    {
      id: "elementalist",
      name: "원소술사",
      tierNames: ["원소술사", "대원소사", "원소의 현자"],
      description: "상성 우세 시 피해 배율 1.5배 → 1.8배",
      bonuses: { elementAdvantageBonus: 0.3 },
    },
    {
      id: "chronomancer",
      name: "시간술사",
      tierNames: ["시간술사", "시간의 지배자", "영원의 현자"],
      description: "스킬 쿨타임 -20%",
      bonuses: { cooldownReductionPercent: 20 },
    },
  ],
  archer: [
    {
      id: "sniper",
      name: "저격수",
      tierNames: ["저격수", "정밀 사수", "그림자 저격왕"],
      description: "치명타 피해 +30%",
      bonuses: { critDamage: 30 },
    },
    {
      id: "beastMaster",
      name: "사냥꾼",
      tierNames: ["사냥꾼", "야수 조련사", "전설의 사냥꾼"],
      description: "골드 획득 +15% (펫이 추가되면 펫 관련 보너스로 바뀔 예정)",
      bonuses: { goldFindPercent: 15 },
    },
  ],
  priest: [
    {
      id: "highPriest",
      name: "대사제",
      tierNames: ["대사제", "성좌 사제", "빛의 교황"],
      description: "길드 공헌도 획득 +50%",
      bonuses: { guildContributionPercent: 50 },
    },
    {
      id: "judge",
      name: "심판관",
      tierNames: ["심판관", "심판자", "천벌의 사도"],
      description: "치명타 확률 +8%p, 치명타 피해 +10%",
      bonuses: { critRate: 8, critDamage: 10 },
    },
  ],
};

export const emptyAdvancedClassBonuses = {
  attackPercent: 0,
  attackSpeedPercent: 0,
  critRate: 0,
  critDamage: 0,
  elementAdvantageBonus: 0,
  cooldownReductionPercent: 0,
  goldFindPercent: 0,
  guildContributionPercent: 0,
};

export function getAdvancedClasses(jobId) {
  return advancedClasses[jobId] ?? [];
}

export function getAdvancedClass(jobId, classId) {
  return getAdvancedClasses(jobId).find((c) => c.id === classId) ?? null;
}

function getTierIndex(tier) {
  return Math.max(1, Math.min(tier, advancedClassTierMultiplier.length)) - 1;
}

// tier: 1~3차 전직 단계에 맞는 이름을 돌려준다.
export function getAdvancedClassName(jobId, classId, tier = 1) {
  const advancedClass = getAdvancedClass(jobId, classId);
  if (!advancedClass) return "";
  return advancedClass.tierNames?.[getTierIndex(tier)] ?? advancedClass.name;
}

// tier: 1~3차 전직 단계. 갈래 고유 효과는 배율만큼, 공통 효과는 승급 시 추가로 붙는다.
export function getAdvancedClassBonuses(jobId, classId, tier = 1) {
  const advancedClass = getAdvancedClass(jobId, classId);
  if (!advancedClass) return emptyAdvancedClassBonuses;
  const tierIndex = getTierIndex(tier);
  const multiplier = advancedClassTierMultiplier[tierIndex];
  const scaled = { ...emptyAdvancedClassBonuses };
  for (const [key, value] of Object.entries(advancedClass.bonuses)) {
    scaled[key] = Math.round(value * multiplier * 100) / 100;
  }
  const tierBonus = advancedClassTierBonus[tierIndex] ?? {};
  for (const [key, value] of Object.entries(tierBonus)) {
    scaled[key] = (scaled[key] ?? 0) + value;
  }
  return scaled;
}
