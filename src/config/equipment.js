// 장비 관련 모든 수치를 모아두는 곳. 여기 값만 고치면 드랍률/옵션 세기가 바뀐다.

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
export function rollEquipmentDrop() {
  if (Math.random() >= equipDropChance) return null;
  const slot = equipmentSlots[Math.floor(Math.random() * equipmentSlots.length)].id;
  const grade = rollGrade();
  const options = rollOptions(grade);
  return { slot, grade, options };
}

export function getDisassembleReward(gradeId) {
  return disassembleStoneReward[getGradeIndex(gradeId)] ?? 1;
}

export function getSellReward(gradeId) {
  return sellGoldReward[getGradeIndex(gradeId)] ?? 1;
}

// 장착 중인 장비 목록을 넣으면, 전투에 실제로 반영할 보너스 합계를 계산해준다.
export function getEquipmentStatBonuses(equippedItems) {
  const bonuses = { attackFlat: 0, critRate: 0, critDamage: 0, goldFind: 0 };
  for (const item of equippedItems) {
    bonuses.attackFlat += getGrade(item.grade).baseAttack;
    for (const option of item.options ?? []) {
      if (option.type in bonuses) {
        bonuses[option.type] += option.value;
      }
    }
  }
  return bonuses;
}
