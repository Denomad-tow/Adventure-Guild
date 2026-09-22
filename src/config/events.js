// 돌발 이벤트 관련 수치. 여기 값만 고치면 등장 확률/유지 시간이 바뀐다.

// 방랑 상인: 체크할 때마다 이 확률로 등장, 한 번 나오면 이 시간(ms) 동안 유지된다.
export const merchantCheckIntervalMs = 30000;
export const merchantChancePerCheck = 0.05;
export const merchantDurationMs = 10 * 60 * 1000;
export const merchantMinGrade = "rare";
export const merchantPriceMultiplier = 3; // 판매가 대비 상인 가격 배수

// 보물 고블린: 체크할 때마다 이 확률로 등장, 이 시간(ms) 안에 탭해야 잡을 수 있다.
export const goblinCheckIntervalMs = 25000;
export const goblinChancePerCheck = 0.08;
export const goblinVisibleDurationMs = 5000;
export const goblinGoldRewardMultiplier = 40; // 현재 스테이지 몬스터 골드 보상의 이 배수를 보물로 지급
