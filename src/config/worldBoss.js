// 월드 보스(일곱 균열의 군주) 관련 수치. 일곱 군주를 한 바퀴 돌면 처음(탐욕의 군주)부터 다시 등장한다.

export const worldBossLords = [
  {
    id: "greed",
    name: "탐욕의 군주",
    emoji: "👑",
    weakness: "빛",
    rule: "골드를 많이 가진 사람이 더 큰 피해를 줍니다.",
    story:
      "탐욕의 군주가 무너지며 쌓아뒀던 금화가 쏟아졌다. 길드원들은 승리의 기쁨보다 금화 줍기에 더 바빴다.",
  },
  {
    id: "frost",
    name: "서리의 군주",
    emoji: "❄️",
    weakness: "불",
    rule: "공격 속도가 느려지는 저주에 걸립니다.",
    story: "서리의 군주가 얼어붙어 산산조각났다. 오랫동안 얼어있던 대지에 다시 볕이 들기 시작했다.",
  },
  {
    id: "plague",
    name: "역병의 군주",
    emoji: "🦠",
    weakness: "불",
    rule: "성직자의 피해가 2배가 됩니다.",
    story: "성직자들의 빛이 역병의 군주를 정화했다. 균열 너머로 오랜만에 맑은 공기가 흘러들었다.",
  },
  {
    id: "steel",
    name: "강철의 군주",
    emoji: "🛡️",
    weakness: "물",
    rule: "치명타만 제대로 들어갑니다.",
    story: "강철 갑주에 금이 가더니 이내 산산이 부서졌다. 정확한 일격만이 그를 무너뜨릴 수 있었다.",
  },
  {
    id: "illusion",
    name: "환영의 군주",
    emoji: "🌀",
    weakness: "어둠",
    rule: "도전할 때마다 약점 속성이 랜덤으로 바뀝니다.",
    story: "수많은 환영이 흩어지고 나서야 진짜 군주가 드러났다. 길드원들은 어느 쪽이 진짜인지 끝까지 헷갈렸다.",
  },
  {
    id: "storm",
    name: "폭풍의 군주",
    emoji: "🌪️",
    weakness: "자연",
    rule: "같은 시간대에 함께 도전한 길드원이 많을수록 피해가 늘어납니다.",
    story: "여럿이 동시에 몰아친 공격에 폭풍의 군주가 흩어졌다. 혼자였다면 어림도 없었을 것이다.",
  },
  {
    id: "riftking",
    name: "균열의 왕",
    emoji: "👁️",
    weakness: null,
    rule: "앞선 여섯 군주의 힘을 모두 섞어 씁니다. 약점 속성이 없습니다.",
    story: "균열의 왕이 무너지자 하늘의 균열들도 서서히 닫히기 시작했다. 그러나 이야기는 여기서 끝나지 않았다.",
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

// 역병의 군주: 성직자 피해 2배
export const worldBossPlaguePriestMultiplier = 2;

// 환영의 군주: 도전할 때마다 이 목록 중 하나가 랜덤으로 약점이 된다
export const worldBossIllusionElements = ["자연", "어둠", "물", "불", "빛"];

// 폭풍의 군주: 최근 이 시간(분) 안에 도전한 서로 다른 길드원 수 × 이 값(%)만큼 피해 증가
export const worldBossStormWindowMinutes = 10;
export const worldBossStormBonusPerChallengerPercent = 15;

export function rollIllusionWeakness() {
  return worldBossIllusionElements[Math.floor(Math.random() * worldBossIllusionElements.length)];
}

export function getWorldBossLord(lordIndex) {
  const cycle = Math.floor(lordIndex / worldBossLords.length);
  const lord = worldBossLords[lordIndex % worldBossLords.length];
  return { ...lord, cycle };
}

export function getWorldBossMaxHp(lordIndex) {
  const cycle = Math.floor(lordIndex / worldBossLords.length);
  return Math.round(worldBossBaseHp * Math.pow(worldBossHpGrowthPerCycle, cycle));
}
