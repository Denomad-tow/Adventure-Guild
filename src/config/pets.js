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
];

export const eggDropChance = 0.005; // 몬스터 처치당 알 획득 확률 (0.5%)
export const eggHatchHours = 3; // 알을 얻은 뒤 이만큼 지나야 부화 가능

export const petMaxLevel = 30;
export const petEvolveLevel1 = 10; // 성체
export const petEvolveLevel2 = 20; // 전설

export const petFeedStoneCostPerLevel = 5; // 먹이 1회 비용 = 강화석 × 현재 레벨
export const petFeedExpGain = 10;

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

// 진화할수록(레벨 구간마다) 효과가 세진다.
export function getPetBonusValue(speciesId, level) {
  const species = getPetSpecies(speciesId);
  if (!species) return 0;
  const stageMultiplier = level >= petEvolveLevel2 ? 2 : level >= petEvolveLevel1 ? 1.5 : 1;
  return Math.round(species.baseBonus * stageMultiplier * 10) / 10;
}

export function getPetFeedCost(level) {
  return petFeedStoneCostPerLevel * level;
}

export function rollPetSpecies() {
  return petSpecies[Math.floor(Math.random() * petSpecies.length)].id;
}
