import {
  jobBattleStats,
  getTotalAttack,
  getExpToNextLevel,
  getStageMonsterHp,
  getStageMonsterReward,
  stagesPerRegion,
  killsPerStage,
  eliteMultiplier,
} from "@/config/balance";

// 실제로 초 단위 시간이 흐르는 걸 기다리지 않고, 몬스터를 한 마리씩 계산으로 처치시켜
// "그동안 사냥이 계속된 것"처럼 결과만 빠르게 만들어낸다. (평균 데미지로 근사 계산)
// 지역 보스는 버튼을 눌러 직접 도전하는 것이라 방치 중에는 자동으로 싸우지 않는다.
const MAX_ITERATIONS = 200000;

export function simulateIdleProgress(
  startState,
  elapsedSeconds,
  jobId,
  enhanceLevel = 0,
  equipBonuses = { attackFlat: 0, critRate: 0, critDamage: 0, goldFind: 0 }
) {
  const stats = jobBattleStats[jobId] ?? jobBattleStats.warrior;
  const critRate = stats.critRate + equipBonuses.critRate / 100;
  const critDamage = stats.critDamage + equipBonuses.critDamage / 100;
  const goldMultiplier = 1 + equipBonuses.goldFind / 100;
  const state = { ...startState };
  let timeLeft = elapsedSeconds;
  let iterations = 0;
  let monstersKilled = 0;

  while (timeLeft > 0 && iterations < MAX_ITERATIONS) {
    iterations += 1;
    const attack = getTotalAttack(jobId, state.level, enhanceLevel) + equipBonuses.attackFlat;
    const avgDamage = attack * (1 - critRate + critRate * critDamage);
    const dps = avgDamage * stats.attackSpeed;
    if (dps <= 0) break;

    const isElite = state.killIndexInStage >= killsPerStage;
    const baseHp = getStageMonsterHp(state.regionIndex, state.stage);
    const baseReward = getStageMonsterReward(state.regionIndex, state.stage);
    const monsterHp = isElite ? baseHp * eliteMultiplier : baseHp;
    const timeToKill = monsterHp / dps;
    if (timeToKill > timeLeft) break;

    timeLeft -= timeToKill;
    monstersKilled += 1;
    const goldGain = isElite ? baseReward.gold * eliteMultiplier : baseReward.gold;
    state.gold += Math.round(goldGain * goldMultiplier);
    state.exp += isElite ? baseReward.exp * eliteMultiplier : baseReward.exp;

    if (isElite) {
      state.killIndexInStage = 0;
      if (state.stage < stagesPerRegion) {
        state.stage += 1;
        state.regionStage[state.regionIndex] = state.stage;
      }
      // 마지막 스테이지(보스 대기 상태)는 그 자리에서 계속 파밍한다.
    } else {
      state.killIndexInStage += 1;
    }

    let expToNext = getExpToNextLevel(state.level);
    while (state.exp >= expToNext) {
      state.exp -= expToNext;
      state.level += 1;
      expToNext = getExpToNextLevel(state.level);
    }
  }

  return {
    ...state,
    killsGained: monstersKilled,
    goldGained: state.gold - startState.gold,
    levelsGained: state.level - startState.level,
    leveledFrom: startState.level,
    leveledTo: state.level,
  };
}
