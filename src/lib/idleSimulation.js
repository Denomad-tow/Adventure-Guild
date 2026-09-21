import {
  jobBattleStats,
  getTotalAttack,
  getExpToNextLevel,
  getMonsterMaxHp,
  getMonsterReward,
} from "@/config/balance";

// 실제로 초 단위 시간이 흐르는 걸 기다리지 않고, 몬스터를 한 마리씩 계산으로 처치시켜
// "그동안 사냥이 계속된 것"처럼 결과만 빠르게 만들어낸다. (평균 데미지로 근사 계산)
const MAX_ITERATIONS = 200000;

export function simulateIdleProgress(startState, elapsedSeconds, jobId, enhanceLevel = 0) {
  const stats = jobBattleStats[jobId] ?? jobBattleStats.warrior;
  const state = { ...startState };
  let timeLeft = elapsedSeconds;
  let iterations = 0;

  while (timeLeft > 0 && iterations < MAX_ITERATIONS) {
    iterations += 1;
    const attack = getTotalAttack(jobId, state.level, enhanceLevel);
    const avgDamage = attack * (1 - stats.critRate + stats.critRate * stats.critDamage);
    const dps = avgDamage * stats.attackSpeed;
    if (dps <= 0) break;

    const monsterMaxHp = getMonsterMaxHp(state.killCount);
    const timeToKill = monsterMaxHp / dps;
    if (timeToKill > timeLeft) break;

    timeLeft -= timeToKill;
    const reward = getMonsterReward(state.killCount);
    state.exp += reward.exp;
    state.gold += reward.gold;
    state.killCount += 1;

    let expToNext = getExpToNextLevel(state.level);
    while (state.exp >= expToNext) {
      state.exp -= expToNext;
      state.level += 1;
      expToNext = getExpToNextLevel(state.level);
    }
  }

  const monsterMaxHp = getMonsterMaxHp(state.killCount);
  return {
    ...state,
    monsterMaxHp,
    monsterHp: monsterMaxHp,
    killsGained: state.killCount - startState.killCount,
    goldGained: state.gold - startState.gold,
    levelsGained: state.level - startState.level,
    leveledFrom: startState.level,
    leveledTo: state.level,
  };
}
