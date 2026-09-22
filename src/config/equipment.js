// 장비 관련 모든 수치를 모아두는 곳. 여기 값만 고치면 드랍률/옵션 세기가 바뀐다.

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
  { id: "accessory", label: "장신구", emoji: "💍" },
];

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
  return { slot, grade, options, setId: setId ?? null };
}

export function getDisassembleReward(gradeId) {
  return disassembleStoneReward[getGradeIndex(gradeId)] ?? 1;
}

export function getSellReward(gradeId) {
  return sellGoldReward[getGradeIndex(gradeId)] ?? 1;
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
