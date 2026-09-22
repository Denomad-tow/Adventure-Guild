// 전직: 레벨 30부터 직업마다 두 갈래 중 하나를 고른다. 환생이 생기면 그때 다시 고를 수 있다.
export const advancedClassLevel = 1000;

export const advancedClasses = {
  warrior: [
    {
      id: "guardianKnight",
      name: "수호기사",
      description: "공격속도 +10%",
      bonuses: { attackSpeedPercent: 10 },
    },
    {
      id: "berserker",
      name: "광전사",
      description: "치명타 확률 +10%p, 치명타 피해 +15%",
      bonuses: { critRate: 10, critDamage: 15 },
    },
  ],
  mage: [
    {
      id: "elementalist",
      name: "원소술사",
      description: "상성 우세 시 피해 배율 1.5배 → 1.8배",
      bonuses: { elementAdvantageBonus: 0.3 },
    },
    {
      id: "chronomancer",
      name: "시간술사",
      description: "스킬 쿨타임 -20%",
      bonuses: { cooldownReductionPercent: 20 },
    },
  ],
  archer: [
    {
      id: "sniper",
      name: "저격수",
      description: "치명타 피해 +30%",
      bonuses: { critDamage: 30 },
    },
    {
      id: "beastMaster",
      name: "사냥꾼",
      description: "골드 획득 +15% (펫이 추가되면 펫 관련 보너스로 바뀔 예정)",
      bonuses: { goldFindPercent: 15 },
    },
  ],
  priest: [
    {
      id: "highPriest",
      name: "대사제",
      description: "길드 공헌도 획득 +50%",
      bonuses: { guildContributionPercent: 50 },
    },
    {
      id: "judge",
      name: "심판관",
      description: "치명타 확률 +8%p, 치명타 피해 +10%",
      bonuses: { critRate: 8, critDamage: 10 },
    },
  ],
};

export const emptyAdvancedClassBonuses = {
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

export function getAdvancedClassBonuses(jobId, classId) {
  const advancedClass = getAdvancedClass(jobId, classId);
  return advancedClass ? { ...emptyAdvancedClassBonuses, ...advancedClass.bonuses } : emptyAdvancedClassBonuses;
}
