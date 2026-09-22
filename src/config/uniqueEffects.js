// 전설/신화 장비 고유 효과. 전설 이상 장비가 나올 때 이 중 하나가 랜덤으로 붙는다.
// type: "proc"(공격 시 확률 발동) 또는 "passive"(항상 적용).
export const uniqueEffects = [
  {
    id: "lightning_strike",
    name: "번개 낙하",
    icon: "⚡",
    description: "공격 시 5% 확률로 번개가 떨어져 공격력의 150% 추가 피해",
    type: "proc",
    procChance: 0.05,
    procDamageMultiplier: 1.5,
  },
  {
    id: "double_strike",
    name: "연속 타격",
    icon: "🗡️",
    description: "공격 시 10% 확률로 한 번 더 공격",
    type: "proc",
    procChance: 0.1,
  },
  {
    id: "gold_rush",
    name: "황금 손길",
    icon: "💰",
    description: "골드 획득 +20%",
    type: "passive",
    bonusType: "goldFindPercent",
    bonusValue: 20,
  },
  {
    id: "elemental_mastery",
    name: "원소 지배",
    icon: "🌈",
    description: "상성 우세 시 피해 배율 +20%p 추가",
    type: "passive",
    bonusType: "elementAdvantageBonus",
    bonusValue: 0.2,
  },
  {
    id: "critical_master",
    name: "필살의 감각",
    icon: "🎯",
    description: "치명타 확률 +10%p",
    type: "passive",
    bonusType: "critRate",
    bonusValue: 10,
  },
  {
    id: "wisdom_of_ages",
    name: "고대의 지혜",
    icon: "📖",
    description: "경험치 획득 +15%",
    type: "passive",
    bonusType: "expPercent",
    bonusValue: 15,
  },
];

export function getUniqueEffect(id) {
  return uniqueEffects.find((e) => e.id === id) ?? null;
}

export function rollUniqueEffect() {
  return uniqueEffects[Math.floor(Math.random() * uniqueEffects.length)].id;
}

const emptyUniqueEffectBonuses = {
  goldFindPercent: 0,
  elementAdvantageBonus: 0,
  critRate: 0,
  expPercent: 0,
};

// 장착 중인 전설+ 장비들의 고유 효과 중 "항상 적용"되는 것들을 합쳐서 보너스 값으로 만든다.
export function getPassiveUniqueEffectBonuses(effectIds) {
  const bonuses = { ...emptyUniqueEffectBonuses };
  for (const id of effectIds ?? []) {
    const effect = getUniqueEffect(id);
    if (effect?.type === "passive") {
      bonuses[effect.bonusType] += effect.bonusValue;
    }
  }
  return bonuses;
}

export { emptyUniqueEffectBonuses };
