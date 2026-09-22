// 특성 트리: 레벨 10부터 특성 포인트를 얻어 세 갈래 중 원하는 곳에 찍는다.
export const traitBranches = [
  {
    id: "attack",
    label: "공격",
    emoji: "⚔️",
    description: "포인트당 공격력 +2%",
  },
  {
    id: "survival",
    label: "생존",
    emoji: "🛡️",
    description: "포인트당 공격 속도 +1%",
  },
  {
    id: "luck",
    label: "행운",
    emoji: "🍀",
    description: "포인트당 골드 획득 +2%, 장비 드랍 확률 +0.5%p",
  },
];

export const traitStartLevel = 10;
export const traitResetCost = 50;

// 레벨 10에 1포인트, 이후 레벨마다 1포인트씩 늘어난다.
export function getTotalTraitPoints(level) {
  return Math.max(0, level - traitStartLevel + 1);
}

export function getUsedTraitPoints(traits) {
  return (traits?.attack ?? 0) + (traits?.survival ?? 0) + (traits?.luck ?? 0);
}

export function getTraitBonuses(traits) {
  const attackPoints = traits?.attack ?? 0;
  const survivalPoints = traits?.survival ?? 0;
  const luckPoints = traits?.luck ?? 0;
  return {
    attackPercent: attackPoints * 2,
    attackSpeedPercent: survivalPoints * 1,
    goldFindPercent: luckPoints * 2,
    dropChancePercent: luckPoints * 0.5,
  };
}
