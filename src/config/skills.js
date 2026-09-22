// 직업별 자동 발동 스킬. 쿨타임(초)마다 저절로 발동해서 공격력 × 배율만큼 추가 데미지를 준다.
export const jobSkills = {
  warrior: [
    { id: "power_strike", name: "강타", emoji: "💥", cooldown: 6, multiplier: 2.0 },
    { id: "shield_bash", name: "방패 강타", emoji: "🛡️", cooldown: 10, multiplier: 2.6 },
    { id: "unyielding_spirit", name: "불굴의 기합", emoji: "🔥", cooldown: 20, multiplier: 4.0 },
  ],
  mage: [
    { id: "fireball", name: "파이어볼", emoji: "🔥", cooldown: 5, multiplier: 2.5 },
    { id: "ice_spike", name: "아이스 스파이크", emoji: "❄️", cooldown: 8, multiplier: 3.0 },
    { id: "meteor", name: "메테오", emoji: "☄️", cooldown: 15, multiplier: 5.0 },
  ],
  archer: [
    { id: "piercing_shot", name: "관통 사격", emoji: "🏹", cooldown: 5, multiplier: 2.2 },
    { id: "rapid_fire", name: "연사", emoji: "💨", cooldown: 8, multiplier: 2.6 },
    { id: "deadeye", name: "필중의 일격", emoji: "🎯", cooldown: 18, multiplier: 4.5 },
  ],
  priest: [
    { id: "holy_strike", name: "성스러운 타격", emoji: "✨", cooldown: 7, multiplier: 2.2 },
    { id: "blessing", name: "축복의 빛", emoji: "🙏", cooldown: 12, multiplier: 2.8 },
    { id: "judgment", name: "심판", emoji: "⚡", cooldown: 20, multiplier: 4.2 },
  ],
};

export function getJobSkills(jobId) {
  return jobSkills[jobId] ?? [];
}

// 스킬 개별 강화: 강화석으로 스킬 피해를 올린다. 레벨당 배율 +5%, 최대 20강.
// +10까지는 항상 성공하고, +11부터는 실패할 수 있다 (실패해도 강화석만 소모).
export const maxSkillLevel = 20;
export const skillLevelBonusPerPoint = 0.05;
export const skillEnhanceFailureStartLevel = 10;
const skillEnhanceSuccessRates = [0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2];

export function getSkillEnhanceCost(currentLevel) {
  return 3 + currentLevel * 2;
}

export function getSkillMultiplier(skill, level) {
  return skill.multiplier * (1 + (level ?? 0) * skillLevelBonusPerPoint);
}

export function getSkillEnhanceSuccessRate(currentLevel) {
  if (currentLevel < skillEnhanceFailureStartLevel) return 1;
  return skillEnhanceSuccessRates[currentLevel - skillEnhanceFailureStartLevel] ?? 0.1;
}

export function rollSkillEnhanceSuccess(currentLevel) {
  return Math.random() < getSkillEnhanceSuccessRate(currentLevel);
}
