// 몬스터 도감: 같은 몬스터를 많이 잡을수록 등급이 오르고, 그 몬스터 상대 피해가 늘어난다.
// tiers[i] 마리를 잡으면 등급 i+1, 그때 피해 보너스는 bonusPercents[i]. (한 마리도 못 잡으면 등급 0, 미등록)
export const monsterDexTiers = [1, 10, 100, 1000, 10000];
export const monsterDexBonusPercents = [0, 3, 7, 12, 20];
export const monsterDexTierLabels = ["등록", "숙련", "전문가", "달인", "마스터"];

// 한 지역의 몬스터를 전부 등록(1마리 이상 처치)하면 붙는 영구 공격력 보너스
export const regionDexCompleteBonusPercent = 1;
