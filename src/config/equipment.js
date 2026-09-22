// 장비 관련 모든 수치를 모아두는 곳. 여기 값만 고치면 드랍률/옵션 세기가 바뀐다.
import { rollRandomElement } from "@/config/elements";

// 지역마다 테마가 있는 장비 세트 하나씩. 같은 세트를 2개/4개 장착하면 보너스가 붙는다.
// id는 regions.js의 지역 id와 맞춰서, 그 지역에서 나온 장비가 이 세트로 표시된다.
export const equipmentSets = [
  {
    id: "forest",
    name: "고블린 약탈자 세트",
    bonus2: { goldFind: 10 },
    bonus4: { goldFind: 30 },
  },
  {
    id: "mine",
    name: "해골 광부 세트",
    bonus2: { attackFlat: 10 },
    bonus4: { critRate: 5 },
  },
  {
    id: "swamp",
    name: "늪지 사냥꾼 세트",
    bonus2: { critDamage: 10 },
    bonus4: { attackFlat: 25 },
  },
  {
    id: "canyon",
    name: "화염 정령 세트",
    bonus2: { attackFlat: 15 },
    bonus4: { critDamage: 15 },
  },
  {
    id: "citadel",
    name: "서리 사냥꾼 세트",
    bonus2: { critRate: 5 },
    bonus4: { attackFlat: 35 },
  },
];

export function getEquipmentSet(setId) {
  return equipmentSets.find((s) => s.id === setId) ?? null;
}

export const equipmentSlots = [
  { id: "weapon", label: "무기", emoji: "🗡️" },
  { id: "helmet", label: "투구", emoji: "🪖" },
  { id: "armor", label: "갑옷", emoji: "🥋" },
  { id: "gloves", label: "장갑", emoji: "🧤" },
  { id: "boots", label: "신발", emoji: "👢" },
  { id: "belt", label: "벨트", emoji: "➰" },
  { id: "necklace", label: "목걸이", emoji: "📿" },
  { id: "bracelet", label: "팔찌", emoji: "💫" },
  { id: "ring1", label: "반지1", emoji: "💍" },
  { id: "ring2", label: "반지2", emoji: "💍" },
];

// 부위마다 이름/이모지가 다른 장비 종류 5가지. 능력치에는 영향 없고 보여지는 모습만 다르다.
// (두 반지 칸(ring1, ring2)은 같은 "반지" 종류 목록을 공유한다)
const ringItemTypes = [
  { id: "ring", label: "반지", emoji: "💍" },
  { id: "signetRing", label: "인장반지", emoji: "🔱" },
  { id: "gemRing", label: "보석반지", emoji: "💎" },
  { id: "knotRing", label: "매듭반지", emoji: "➰" },
  { id: "enchantRing", label: "인챈트반지", emoji: "✨" },
];

export const itemTypesBySlot = {
  weapon: [
    { id: "sword", label: "검", emoji: "🗡️" },
    { id: "axe", label: "도끼", emoji: "🪓" },
    { id: "staff", label: "지팡이", emoji: "🪄" },
    { id: "bow", label: "활", emoji: "🏹" },
    { id: "dagger", label: "단검", emoji: "🔪" },
  ],
  helmet: [
    { id: "hat", label: "모자", emoji: "🎩" },
    { id: "helm", label: "투구", emoji: "⛑️" },
    { id: "hood", label: "두건", emoji: "🥷" },
    { id: "crown", label: "왕관", emoji: "👑" },
    { id: "mask", label: "가면", emoji: "🎭" },
  ],
  armor: [
    { id: "robe", label: "로브", emoji: "🥋" },
    { id: "plate", label: "판금갑옷", emoji: "🛡️" },
    { id: "leather", label: "가죽옷", emoji: "🦺" },
    { id: "chainmail", label: "사슬갑옷", emoji: "⛓️" },
    { id: "coat", label: "코트", emoji: "🧥" },
  ],
  gloves: [
    { id: "gloves", label: "장갑", emoji: "🧤" },
    { id: "gauntlet", label: "건틀릿", emoji: "👊" },
    { id: "wristguard", label: "손목보호대", emoji: "💪" },
    { id: "claw", label: "클로", emoji: "🦞" },
    { id: "mitt", label: "미트", emoji: "🥊" },
  ],
  boots: [
    { id: "shoes", label: "신발", emoji: "👟" },
    { id: "boots", label: "부츠", emoji: "👢" },
    { id: "sandals", label: "샌들", emoji: "🩴" },
    { id: "greaves", label: "각반", emoji: "🥾" },
    { id: "slippers", label: "슬리퍼", emoji: "🥿" },
  ],
  belt: [
    { id: "belt", label: "벨트", emoji: "➰" },
    { id: "sash", label: "허리띠", emoji: "🎗️" },
    { id: "chainBelt", label: "사슬벨트", emoji: "⛓️" },
    { id: "leatherBelt", label: "가죽벨트", emoji: "🟤" },
    { id: "jewelBelt", label: "보석벨트", emoji: "💎" },
  ],
  necklace: [
    { id: "necklace", label: "목걸이", emoji: "📿" },
    { id: "pendant", label: "펜던트", emoji: "🔮" },
    { id: "choker", label: "초커", emoji: "⚫" },
    { id: "amulet", label: "부적", emoji: "🧿" },
    { id: "cameo", label: "카메오", emoji: "🖼️" },
  ],
  bracelet: [
    { id: "bracelet", label: "팔찌", emoji: "💫" },
    { id: "bangle", label: "뱅글", emoji: "⭕" },
    { id: "wristband", label: "손목보호대", emoji: "🎗️" },
    { id: "charmBracelet", label: "참팔찌", emoji: "🔔" },
    { id: "chainBracelet", label: "사슬팔찌", emoji: "⛓️" },
  ],
  ring1: ringItemTypes,
  ring2: ringItemTypes,
};

export function getItemType(slotId, itemTypeId) {
  const pool = itemTypesBySlot[slotId] ?? [];
  return pool.find((t) => t.id === itemTypeId) ?? null;
}

function rollItemType(slotId) {
  const pool = itemTypesBySlot[slotId] ?? [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// 등급 순서 그대로가 약한 것 → 강한 것. dropRate 합은 1이 되어야 한다.
export const grades = [
  { id: "common", label: "일반", color: "#9ca3af", dropRate: 0.6, optionCount: 0, baseAttack: 2 },
  { id: "uncommon", label: "고급", color: "#22c55e", dropRate: 0.25, optionCount: 1, baseAttack: 5 },
  { id: "rare", label: "희귀", color: "#3b82f6", dropRate: 0.11, optionCount: 2, baseAttack: 10 },
  { id: "epic", label: "영웅", color: "#a855f7", dropRate: 0.035, optionCount: 3, baseAttack: 20 },
  { id: "legendary", label: "전설", color: "#f97316", dropRate: 0.0049, optionCount: 4, baseAttack: 40 },
  { id: "mythic", label: "신화", color: "#ef4444", dropRate: 0.0001, optionCount: 4, baseAttack: 80 },
];

// 장비에 붙는 랜덤 옵션 종류. value의 의미: attackFlat=공격력 그대로 더함, 나머지는 %포인트.
export const optionTypes = [
  { id: "attackFlat", label: "공격력", min: 1, max: 5, suffix: "" },
  { id: "critRate", label: "치명타 확률", min: 1, max: 4, suffix: "%" },
  { id: "critDamage", label: "치명타 피해", min: 3, max: 10, suffix: "%" },
  { id: "goldFind", label: "골드 획득", min: 3, max: 10, suffix: "%" },
];

// 몬스터를 잡을 때마다 장비가 나올 확률
export const equipDropChance = 0.15;

// 분해했을 때 얻는 강화석 개수 / 판매했을 때 얻는 골드 (등급 순서와 동일하게 매칭)
export const disassembleStoneReward = [1, 2, 4, 8, 16, 32];
export const sellGoldReward = [5, 15, 40, 100, 300, 1000];

// 장비 개별 강화: +1 ~ +15. +10부터는 실패할 수 있지만, 실패해도 장비는 그대로 남고 강화석만 소모된다.
export const maxItemEnhanceLevel = 15;
export const enhanceFailureStartLevel = 10;
// 한 단계 강화할 때마다 장비의 공격력 기여분이 이 비율만큼씩 늘어난다 (레벨15면 +150%)
export const enhancePowerPerLevel = 0.1;

// 강화 단계별 성공 확률 (10강부터). 이 배열 밖의 레벨(0~9강)은 항상 성공한다.
const enhanceSuccessRates = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2];

export function getItemEnhanceCost(currentLevel) {
  return 2 + currentLevel * 3;
}

export function getItemEnhanceSuccessRate(currentLevel) {
  if (currentLevel < enhanceFailureStartLevel) return 1;
  return enhanceSuccessRates[currentLevel - enhanceFailureStartLevel] ?? 0.1;
}

// 강화 시도 결과(성공/실패)를 굴린다.
export function rollItemEnhanceSuccess(currentLevel) {
  return Math.random() < getItemEnhanceSuccessRate(currentLevel);
}

export function getGradeIndex(gradeId) {
  return grades.findIndex((g) => g.id === gradeId);
}

export function getGrade(gradeId) {
  return grades[getGradeIndex(gradeId)] ?? grades[0];
}

export function getOptionType(optionId) {
  return optionTypes.find((o) => o.id === optionId);
}

export function getSlot(slotId) {
  return equipmentSlots.find((s) => s.id === slotId) ?? equipmentSlots[0];
}

function rollGrade() {
  const roll = Math.random();
  let cumulative = 0;
  for (const grade of grades) {
    cumulative += grade.dropRate;
    if (roll < cumulative) return grade.id;
  }
  return grades[0].id;
}

function rollOptions(gradeId) {
  const grade = getGrade(gradeId);
  const pool = [...optionTypes];
  const picked = [];
  for (let i = 0; i < grade.optionCount && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    const optionType = pool.splice(idx, 1)[0];
    const value = Math.round(optionType.min + Math.random() * (optionType.max - optionType.min));
    picked.push({ type: optionType.id, value });
  }
  return picked;
}

// 몬스터를 잡았을 때 장비가 나올지, 나온다면 어떤 장비인지 결정한다.
// setId는 어느 지역에서 잡았는지로 정해진다 (그 지역 테마의 장비 세트로 표시됨).
// bonusDropChance는 행운 특성 등으로 늘어난 드랍 확률(%포인트)이다.
export function rollEquipmentDrop(setId, bonusDropChance = 0) {
  if (Math.random() >= equipDropChance + bonusDropChance / 100) return null;
  const slot = equipmentSlots[Math.floor(Math.random() * equipmentSlots.length)].id;
  const grade = rollGrade();
  const options = rollOptions(grade);
  // 무기는 속성을 하나씩 지니고 있어서, 지역 속성에 맞춰 무기를 바꿔 낄 수 있다.
  const element = slot === "weapon" ? rollRandomElement() : null;
  const itemType = rollItemType(slot);
  return { slot, grade, options, setId: setId ?? null, element, itemType };
}

export function getDisassembleReward(gradeId) {
  return disassembleStoneReward[getGradeIndex(gradeId)] ?? 1;
}

export function getSellReward(gradeId) {
  return sellGoldReward[getGradeIndex(gradeId)] ?? 1;
}

// 방랑 상인이 파는 장비: 지정한 등급 이상만 나온다 (기본은 희귀 이상).
export function rollMerchantItem(minGradeId = "rare") {
  const minIndex = getGradeIndex(minGradeId);
  const pool = grades.slice(minIndex);
  const totalWeight = pool.reduce((sum, g) => sum + g.dropRate, 0);
  let roll = Math.random() * totalWeight;
  let grade = pool[0].id;
  for (const g of pool) {
    roll -= g.dropRate;
    if (roll <= 0) {
      grade = g.id;
      break;
    }
  }
  const slot = equipmentSlots[Math.floor(Math.random() * equipmentSlots.length)].id;
  const options = rollOptions(grade);
  const element = slot === "weapon" ? rollRandomElement() : null;
  const itemType = rollItemType(slot);
  return { slot, grade, options, setId: null, element, itemType };
}

export function getMerchantPrice(gradeId, priceMultiplier) {
  return getSellReward(gradeId) * priceMultiplier;
}

// 장착 중인 장비 목록을 넣으면, 전투에 실제로 반영할 보너스 합계를 계산해준다.
// (개별 강화 단계와 세트 효과까지 모두 반영)
export function getEquipmentStatBonuses(equippedItems) {
  const bonuses = { attackFlat: 0, critRate: 0, critDamage: 0, goldFind: 0 };
  const setCounts = {};

  for (const item of equippedItems) {
    const enhanceMultiplier = 1 + (item.enhance_level ?? 0) * enhancePowerPerLevel;
    bonuses.attackFlat += getGrade(item.grade).baseAttack * enhanceMultiplier;
    for (const option of item.options ?? []) {
      if (option.type in bonuses) {
        bonuses[option.type] += option.value * enhanceMultiplier;
      }
    }
    if (item.set_id) {
      setCounts[item.set_id] = (setCounts[item.set_id] ?? 0) + 1;
    }
  }

  for (const [setId, count] of Object.entries(setCounts)) {
    const set = getEquipmentSet(setId);
    if (!set) continue;
    const activeBonus = count >= 4 ? set.bonus4 : count >= 2 ? set.bonus2 : null;
    if (activeBonus) {
      for (const [type, value] of Object.entries(activeBonus)) {
        if (type in bonuses) bonuses[type] += value;
      }
    }
  }

  return bonuses;
}

// 장착 중인 무기의 속성을 알려준다 (없으면 null). 지역 속성에 유리하면 피해 +50%.
export function getEquippedWeaponElement(equippedItems) {
  const weapon = equippedItems.find((item) => item.slot === "weapon");
  return weapon?.element ?? null;
}

// 지금 장착 중인 장비들 기준으로, 어떤 세트가 몇 개 모였고 보너스가 켜졌는지 알려준다. (가방 탭 표시용)
export function getActiveSetStatuses(equippedItems) {
  const setCounts = {};
  for (const item of equippedItems) {
    if (item.set_id) {
      setCounts[item.set_id] = (setCounts[item.set_id] ?? 0) + 1;
    }
  }
  return Object.entries(setCounts)
    .map(([setId, count]) => {
      const set = getEquipmentSet(setId);
      if (!set) return null;
      return { ...set, count };
    })
    .filter(Boolean);
}
