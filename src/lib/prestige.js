import { getRelicEffectValue } from "@/config/prestige";

export const emptyRelicBonuses = {
  allDamagePercent: 0,
  idleHoursBonus: 0,
  startingGold: 0,
  enhanceCostReductionPercent: 0,
};

// 보유한 유물 레벨들을 실제 보너스 값으로 바꾼다.
export function getRelicBonuses(relicLevels) {
  const levels = relicLevels ?? {};
  return {
    allDamagePercent: getRelicEffectValue("allDamage", levels.allDamage ?? 0),
    idleHoursBonus: getRelicEffectValue("idleHours", levels.idleHours ?? 0),
    startingGold: getRelicEffectValue("startingGold", levels.startingGold ?? 0),
    enhanceCostReductionPercent: getRelicEffectValue("enhanceCostReduction", levels.enhanceCostReduction ?? 0),
  };
}
