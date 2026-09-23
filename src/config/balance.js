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

// 레벨업에 필요한 경험치 = (expBase + level * expPerLevel) × expLevelGrowth^level
// expLevelGrowth는 레벨이 오를수록 다음 레벨까지 조금씩 더 가파르게 필요해지도록 하는 값이다.
// (레벨업이 너무 빨라지는 걸 막기 위한 값. 초반엔 거의 안 느껴지고, 고레벨로 갈수록 확실히 체감된다)
export const expBase = 20;
export const expPerLevel = 15;
export const expLevelGrowth = 1.008;

// 몬스터 기본 체력/보상. 스테이지가 하나 오를 때마다 이전 스테이지 × 1.13배로 강해진다
export const monsterBaseHp = 30;
export const monsterHpGrowth = 1.13;
export const monsterBaseGold = 5;
export const monsterBaseExp = 8;

// 이미 깬 지역을 "강화" 난이도로 다시 도전하면 몬스터 체력/보상이 이만큼 배가 된다.
// (같은 지역이라도 난이도를 올려서 계속 도전할 거리를 만든다)
export const regionDifficultyTiers = [
  { id: "normal", label: "기본", multiplier: 1 },
  { id: "hard", label: "강화", multiplier: 2.5 },
  { id: "extreme", label: "초월", multiplier: 6 },
];

export function getRegionDifficultyTier(tierId) {
  return regionDifficultyTiers.find((t) => t.id === tierId) ?? regionDifficultyTiers[0];
}

// 지역 하나 = 스테이지 10개. 스테이지마다 일반 몬스터 10마리 + 정예 몬스터 1마리를 잡으면 다음 스테이지로.
export const stagesPerRegion = 10;
export const killsPerStage = 10;
export const eliteMultiplier = 3; // 정예 몬스터는 체력/보상이 일반 몬스터의 이만큼
export const bossHpMultiplier = 15; // 지역 보스 체력 = 10스테이지 몬스터 체력 × 이 값
export const bossRewardMultiplier = 20; // 지역 보스 보상 = 10스테이지 몬스터 보상 × 이 값

// 방치 보상: 최대 몇 시간까지 자리를 비운 것으로 인정할지
export const maxIdleHours = 12;
// 이 시간(초)보다 짧게 자리를 비웠으면 "다녀오셨군요!" 창을 띄우지 않는다 (새로고침 등 방지)
export const minAwaySecondsForSummary = 60;

// 능력치 강화: 골드로 공격력을 영구적으로 올린다. 비용 = 기본값 × 1.09^(강화 레벨)
export const enhanceBaseCost = 20;
export const enhanceCostGrowth = 1.09;
export const enhanceAttackBonus = 2;

export function getAttackForLevel(jobId, level) {
  const base = jobBattleStats[jobId] ?? jobBattleStats.warrior;
  return base.attack + attackGrowthPerLevel * (level - 1);
}

// 한 번에 강화할 수 있는 횟수 (성장 탭의 1강화/10강화/100강화 선택지)
export const enhanceBatchOptions = [1, 10, 100];

// costReductionPercent: 영혼석 유물 "현자의 지혜"로 얻는 강화 비용 할인율(%)
export function getEnhanceCost(enhanceLevel, costReductionPercent = 0) {
  const base = enhanceBaseCost * Math.pow(enhanceCostGrowth, enhanceLevel);
  return Math.round(base * (1 - Math.min(costReductionPercent, 80) / 100));
}

// 강화를 여러 번(count) 연달아 할 때 드는 총 비용
export function getEnhanceTotalCost(enhanceLevel, count, costReductionPercent = 0) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getEnhanceCost(enhanceLevel + i, costReductionPercent);
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
  return Math.round((expBase + level * expPerLevel) * Math.pow(expLevelGrowth, level));
}

// 지역과 스테이지를 하나로 이어붙인 난이도 지수. (2번째 지역 1스테이지는 1번째 지역 11번째 스테이지와 같은 세기)
export function getDifficultyIndex(regionIndex, stage) {
  return regionIndex * stagesPerRegion + (stage - 1);
}

export function getStageMonsterHp(regionIndex, stage, difficultyMultiplier = 1) {
  const index = getDifficultyIndex(regionIndex, stage);
  return Math.round(monsterBaseHp * Math.pow(monsterHpGrowth, index) * difficultyMultiplier);
}

export function getStageMonsterReward(regionIndex, stage, difficultyMultiplier = 1) {
  const index = getDifficultyIndex(regionIndex, stage);
  return {
    gold: Math.round(monsterBaseGold * Math.pow(monsterHpGrowth, index) * difficultyMultiplier),
    exp: Math.round(monsterBaseExp * Math.pow(monsterHpGrowth, index) * difficultyMultiplier),
  };
}

export function getBossHp(regionIndex, difficultyMultiplier = 1) {
  return Math.round(getStageMonsterHp(regionIndex, stagesPerRegion) * bossHpMultiplier * difficultyMultiplier);
}

export function getBossReward(regionIndex, difficultyMultiplier = 1) {
  const base = getStageMonsterReward(regionIndex, stagesPerRegion);
  return {
    gold: Math.round(base.gold * bossRewardMultiplier * difficultyMultiplier),
    exp: Math.round(base.exp * bossRewardMultiplier * difficultyMultiplier),
  };
}
