// 용병(친구 빌리기) 관련 수치.
export const mercenaryDailyLimit = 1;
// 용병 레벨 1당 지역 보스 보상(골드/경험치) 보너스 %, 최대치는 mercenaryRewardBonusCap
export const mercenaryRewardBonusPerLevel = 1;
export const mercenaryRewardBonusCap = 50;
// 용병으로 뽑힌 친구가 받는 "용병 수당" = 그 친구 레벨 × 이 값
export const mercenaryFeePerLevel = 10;

export function getMercenaryRewardBonusPercent(mercenaryLevel) {
  return Math.min(mercenaryLevel * mercenaryRewardBonusPerLevel, mercenaryRewardBonusCap);
}

export function getMercenaryFee(mercenaryLevel) {
  return mercenaryLevel * mercenaryFeePerLevel;
}
