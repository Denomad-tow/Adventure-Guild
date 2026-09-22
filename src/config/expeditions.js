// 파견(원정대) 임무 목록과 수치. 여기 값만 고치면 임무 구성이 바뀐다.
export const expeditionMissions = [
  {
    id: "herbGathering",
    name: "약초 채집",
    icon: "🌿",
    durationHours: 2,
    baseSuccessRate: 0.95,
    goldMin: 100,
    goldMax: 300,
    stoneMin: 1,
    stoneMax: 3,
  },
  {
    id: "forestPatrol",
    name: "숲 순찰",
    icon: "🗡️",
    durationHours: 4,
    baseSuccessRate: 0.85,
    goldMin: 300,
    goldMax: 800,
    stoneMin: 3,
    stoneMax: 6,
  },
  {
    id: "ruinsExploration",
    name: "고대 유적 탐사",
    icon: "🏛️",
    durationHours: 8,
    baseSuccessRate: 0.7,
    goldMin: 1000,
    goldMax: 3000,
    stoneMin: 8,
    stoneMax: 15,
  },
];

// 동행(친구)을 데려갔을 때 보너스
export const expeditionCompanionSuccessBonusPercent = 15; // %포인트
export const expeditionCompanionRewardBonusPercent = 20; // %
export const expeditionCompanionFeeGold = 100; // 동행한 친구가 즉시 받는 사례금

// 실패해도 완전히 빈손은 아니게, 원래 보상의 이만큼은 받는다
export const expeditionFailureRewardRatio = 0.3;

export function getExpeditionMission(id) {
  return expeditionMissions.find((m) => m.id === id) ?? null;
}
