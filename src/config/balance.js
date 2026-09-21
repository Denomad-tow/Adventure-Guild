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

export function getAttackForLevel(jobId, level) {
  const base = jobBattleStats[jobId] ?? jobBattleStats.warrior;
  return base.attack + attackGrowthPerLevel * (level - 1);
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
