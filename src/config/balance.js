// 전투 관련 모든 수치를 모아두는 곳. 여기 값만 고치면 게임 밸런스가 바뀐다.

// 직업별 기본 전투 스탯 (레벨 1 기준)
export const jobBattleStats = {
  warrior: { attack: 12, critRate: 0.05, critDamage: 1.5, attackSpeed: 1.0 },
  mage: { attack: 18, critRate: 0.05, critDamage: 1.5, attackSpeed: 0.8 },
  archer: { attack: 14, critRate: 0.15, critDamage: 1.5, attackSpeed: 1.1 },
  priest: { attack: 10, critRate: 0.05, critDamage: 1.5, attackSpeed: 1.0 },
};

// 레벨업마다 공격력이 이만큼씩 늘어난다
export const attackGrowthPerLevel = 3;

// 레벨업에 필요한 경험치 = expBase + level * expPerLevel
export const expBase = 20;
export const expPerLevel = 15;

// 몬스터 기본 체력/보상. 몬스터를 잡을수록 이전 몬스터보다 강해진다 (기준값 1.12배)
export const monsterBaseHp = 30;
export const monsterHpGrowth = 1.12;
export const monsterBaseGold = 5;
export const monsterBaseExp = 8;

// 1단계에서는 몬스터 종류를 하나만 쓴다. 실제 지역별 몬스터는 6번(지역) 단계에서 추가.
export const placeholderMonster = { name: "슬라임", emoji: "🟢" };

// 방치 보상: 최대 몇 시간까지 자리를 비운 것으로 인정할지
export const maxIdleHours = 12;
// 이 시간(초)보다 짧게 자리를 비웠으면 "다녀오셨군요!" 창을 띄우지 않는다 (새로고침 등 방지)
export const minAwaySecondsForSummary = 60;

// 능력치 강화: 골드로 공격력을 영구적으로 올린다. 비용 = 기본값 × 1.15^(강화 레벨)
export const enhanceBaseCost = 20;
export const enhanceCostGrowth = 1.15;
export const enhanceAttackBonus = 2;

export function getAttackForLevel(jobId, level) {
  const base = jobBattleStats[jobId] ?? jobBattleStats.warrior;
  return base.attack + attackGrowthPerLevel * (level - 1);
}

// 한 번에 강화할 수 있는 횟수 (성장 탭의 1강화/10강화/100강화 선택지)
export const enhanceBatchOptions = [1, 10, 100];

export function getEnhanceCost(enhanceLevel) {
  return Math.round(enhanceBaseCost * Math.pow(enhanceCostGrowth, enhanceLevel));
}

// 강화를 여러 번(count) 연달아 할 때 드는 총 비용
export function getEnhanceTotalCost(enhanceLevel, count) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getEnhanceCost(enhanceLevel + i);
  }
  return total;
}

export function getEnhanceAttackBonus(enhanceLevel) {
  return enhanceLevel * enhanceAttackBonus;
}

// 실제 전투에 쓰이는 최종 공격력 = 레벨에 따른 공격력 + 강화로 얻은 보너스
export function getTotalAttack(jobId, level, enhanceLevel) {
  return getAttackForLevel(jobId, level) + getEnhanceAttackBonus(enhanceLevel);
}

export function getExpToNextLevel(level) {
  return expBase + level * expPerLevel;
}

export function getMonsterMaxHp(killCount) {
  return Math.round(monsterBaseHp * Math.pow(monsterHpGrowth, killCount));
}

export function getMonsterReward(killCount) {
  return {
    gold: Math.round(monsterBaseGold * Math.pow(monsterHpGrowth, killCount)),
    exp: Math.round(monsterBaseExp * Math.pow(monsterHpGrowth, killCount)),
  };
}
