// 펫(동료) 관련 수치. 새 펫 종류를 추가하려면 이 배열 끝에 항목을 하나 더 넣으면 된다.
export const petSpecies = [
  {
    id: "dragon",
    name: "아기 드래곤",
    emoji: "🥚",
    babyEmoji: "🐉",
    adultEmoji: "🐲",
    finalEmoji: "🔥🐉",
    bonusType: "attackPercent",
    baseBonus: 5,
    bonusLabel: "공격력",
  },
  {
    id: "slime",
    name: "슬라임",
    emoji: "🥚",
    babyEmoji: "🟢",
    adultEmoji: "🟩",
    finalEmoji: "💚",
    bonusType: "goldFindPercent",
    baseBonus: 10,
    bonusLabel: "골드 획득",
  },
  {
    id: "owl",
    name: "부엉이",
    emoji: "🥚",
    babyEmoji: "🦉",
    adultEmoji: "🦅",
    finalEmoji: "🦢",
    bonusType: "expPercent",
    baseBonus: 10,
    bonusLabel: "경험치 획득",
  },
  {
    id: "mimic",
    name: "미믹",
    emoji: "🥚",
    babyEmoji: "📦",
    adultEmoji: "🎁",
    finalEmoji: "👑",
    bonusType: "dropChancePercent",
    baseBonus: 5,
    bonusLabel: "장비 드랍 확률",
  },
  {
    id: "fox",
    name: "불꽃 여우",
    emoji: "🥚",
    babyEmoji: "🦊",
    adultEmoji: "🔥",
    finalEmoji: "✨",
    bonusType: "critDamagePercent",
    baseBonus: 10,
    bonusLabel: "치명타 피해",
  },
  {
    id: "panther",
    name: "그림자 표범",
    emoji: "🥚",
    babyEmoji: "🐆",
    adultEmoji: "🐈‍⬛",
    finalEmoji: "🌑🐆",
    bonusType: "attackPercent",
    baseBonus: 7,
    bonusLabel: "공격력",
  },
  {
    id: "turtle",
    name: "황금 거북",
    emoji: "🥚",
    babyEmoji: "🐢",
    adultEmoji: "🛡️",
    finalEmoji: "💰🐢",
    bonusType: "goldFindPercent",
    baseBonus: 14,
    bonusLabel: "골드 획득",
  },
  {
    id: "deer",
    name: "달빛 사슴",
    emoji: "🥚",
    babyEmoji: "🦌",
    adultEmoji: "🌙",
    finalEmoji: "✨🦌",
    bonusType: "expPercent",
    baseBonus: 14,
    bonusLabel: "경험치 획득",
  },
  {
    id: "goblinPup",
    name: "장난꾸러기 고블린펫",
    emoji: "🥚",
    babyEmoji: "👺",
    adultEmoji: "🎒",
    finalEmoji: "💎",
    bonusType: "dropChancePercent",
    baseBonus: 8,
    bonusLabel: "장비 드랍 확률",
  },
  {
    id: "frostWolf",
    name: "서리 늑대",
    emoji: "🥚",
    babyEmoji: "🐺",
    adultEmoji: "🧊",
    finalEmoji: "❄️🐺",
    bonusType: "critDamagePercent",
    baseBonus: 14,
    bonusLabel: "치명타 피해",
  },
];

export const eggDropChance = 0.005; // 몬스터 처치당 알 획득 확률 (0.5%)
// 동시에 부화를 진행할 수 있는 "부화칸" 개수. 알은 부화칸에 넣어야만 부화 시간이 흐르기 시작한다.
export const petHatchSlotCount = 3;
export const eggHatchHours = 1; // (예전 방식과 호환용 기본값) 등급 없이 부화 시간을 정할 때 쓰는 기본값

// 알 등급: 장비 등급과 같은 확률표를 그대로 쓴다. 등급이 높을수록 부화 시간이 오래 걸리지만, 효과도 더 세다.
export const petGrades = [
  { id: "common", label: "일반", color: "#9ca3af", dropRate: 0.6, hatchHours: 1, bonusMultiplier: 1 },
  { id: "uncommon", label: "고급", color: "#22c55e", dropRate: 0.25, hatchHours: 2, bonusMultiplier: 1.2 },
  { id: "rare", label: "희귀", color: "#3b82f6", dropRate: 0.11, hatchHours: 4, bonusMultiplier: 1.5 },
  { id: "epic", label: "영웅", color: "#a855f7", dropRate: 0.035, hatchHours: 8, bonusMultiplier: 2 },
  { id: "legendary", label: "전설", color: "#f97316", dropRate: 0.0049, hatchHours: 16, bonusMultiplier: 2.6 },
  { id: "mythic", label: "신화", color: "#ef4444", dropRate: 0.0001, hatchHours: 24, bonusMultiplier: 3.5 },
];

export function getPetGrade(gradeId) {
  return petGrades.find((g) => g.id === gradeId) ?? petGrades[0];
}

export function rollPetGrade() {
  const roll = Math.random();
  let cumulative = 0;
  for (const grade of petGrades) {
    cumulative += grade.dropRate;
    if (roll < cumulative) return grade.id;
  }
  return petGrades[0].id;
}

export const petMaxLevel = 30;
export const petEvolveLevel1 = 10; // 성체
export const petEvolveLevel2 = 20; // 전설

export const petFeedStoneCostPerLevel = 5; // 먹이 1회 비용 = 강화석 × 현재 레벨
export const petFeedExpGain = 10;

// 별 등급: 같은 종류의 펫(중복)을 재료로 먹여서 올린다. 별 1개당 효과 +20%.
export const petMaxStar = 5;
export const petStarBonusPercentPerStar = 20;

export function getPetExpToNextLevel(level) {
  return 10 * level;
}

export function getPetSpecies(speciesId) {
  return petSpecies.find((p) => p.id === speciesId) ?? null;
}

export function getPetStageName(level) {
  if (level >= petEvolveLevel2) return "전설";
  if (level >= petEvolveLevel1) return "성체";
  return "새끼";
}

export function getPetEmoji(speciesId, level, isEgg) {
  const species = getPetSpecies(speciesId);
  if (!species) return "❓";
  if (isEgg) return species.emoji;
  if (level >= petEvolveLevel2) return species.finalEmoji;
  if (level >= petEvolveLevel1) return species.adultEmoji;
  return species.babyEmoji;
}

// 진화(레벨 구간), 별 등급(중복 펫으로 올림), 알 등급(일반~신화) 셋 다 효과에 반영된다.
export function getPetBonusValue(speciesId, level, star = 1, gradeId = "common") {
  const species = getPetSpecies(speciesId);
  if (!species) return 0;
  const stageMultiplier = level >= petEvolveLevel2 ? 2 : level >= petEvolveLevel1 ? 1.5 : 1;
  const starMultiplier = 1 + ((star ?? 1) - 1) * (petStarBonusPercentPerStar / 100);
  const gradeMultiplier = getPetGrade(gradeId).bonusMultiplier;
  return Math.round(species.baseBonus * stageMultiplier * starMultiplier * gradeMultiplier * 10) / 10;
}

// costReductionPercent: "사육 지식" 연구로 얻는 먹이 비용 할인율(%)
export function getPetFeedCost(level, costReductionPercent = 0) {
  return Math.round(petFeedStoneCostPerLevel * level * (1 - Math.min(costReductionPercent, 80) / 100));
}

export function rollPetSpecies() {
  return petSpecies[Math.floor(Math.random() * petSpecies.length)].id;
}
