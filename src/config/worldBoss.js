// 월드 보스(일곱 균열의 군주) 관련 수치. 지금은 첫 두 군주만 등장하고, 이후 계속 번갈아 나온다.
// (나머지 다섯 군주는 5단계에서 추가된다)

export const worldBossLords = [
  {
    id: "greed",
    name: "탐욕의 군주",
    emoji: "👑",
    weakness: "빛",
    rule: "골드를 많이 가진 사람이 더 큰 피해를 줍니다.",
  },
  {
    id: "frost",
    name: "서리의 군주",
    emoji: "❄️",
    weakness: "불",
    rule: "공격 속도가 느려지는 저주에 걸립니다.",
  },
];

export const worldBossBaseHp = 500000;
// 두 군주를 한 바퀴(모두 처치) 돌 때마다 체력이 이만큼 배로 늘어난다
export const worldBossHpGrowthPerCycle = 1.5;

export const worldBossDailyChallengeLimit = 3;
// 도전 한 번 = 이만큼의 시간(초) 동안 싸운 것으로 계산한다 (연출은 5번 타격으로 짧게 보여줌)
export const worldBossChallengeDurationSeconds = 8;

export const worldBossPhaseEventDurationMs = 30 * 60 * 1000;
export const worldBossPhaseDamageMultiplier = 2;

// 보스 처치 보상은 그 군주의 최대 체력(max_hp)에 비례해서 정해진다.
// (군주가 한 바퀴 돌 때마다 체력이 늘어나는 만큼, 보상도 같이 커진다)
// ⚠️ 이 3개 비율 값은 supabase/009_world_boss_balance.sql 의 challenge_world_boss 함수 안에도
// 그대로 들어있다. 여기서 값을 바꾸면 그 SQL 파일도 같이 고쳐서 다시 실행해야 실제 보상에 반영된다.
export const worldBossParticipationRewardRatio = 0.006; // 참여만 해도 받는 고정 보상 = max_hp × 이 값
export const worldBossContributionPoolRatio = 0.1; // 기여도(피해 비율)에 따라 나눠 갖는 전체 보너스 몫 = max_hp × 이 값
export const worldBossFinalBlowBonusRatio = 0.02; // 막타를 친 사람이 추가로 받는 보상 = max_hp × 이 값

// 보스를 쓰러뜨렸을 때, 참여자 각각에게 작게나마 전설/신화 장비가 나올 확률 (희귀 이하 장비 확률표와는 별개)
export const worldBossLegendaryDropChance = 0.03; // 3%
export const worldBossMythicDropChance = 0.003; // 0.3%

// 탐욕의 군주: 보유 골드 1000당 피해 +1%, 최대 +100%
export const worldBossGreedGoldBonusPer1000Percent = 1;
export const worldBossGreedGoldBonusCapPercent = 100;

// 서리의 군주: 공격 속도가 느려지는 저주 → 실질 피해량 -30%
export const worldBossFrostCursePenaltyPercent = 30;

export function getWorldBossLord(lordIndex) {
  const cycle = Math.floor(lordIndex / worldBossLords.length);
  const lord = worldBossLords[lordIndex % worldBossLords.length];
  return { ...lord, cycle };
}

export function getWorldBossMaxHp(lordIndex) {
  const cycle = Math.floor(lordIndex / worldBossLords.length);
  return Math.round(worldBossBaseHp * Math.pow(worldBossHpGrowthPerCycle, cycle));
}
