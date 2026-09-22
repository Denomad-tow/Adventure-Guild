// 속성 상성: 불 > 자연 > 물 > 불, 빛 ↔ 어둠(서로 강함). 유리한 속성은 피해 +50%.
export const elements = [
  { id: "자연", emoji: "🌿", color: "#22c55e" },
  { id: "어둠", emoji: "🌑", color: "#6b21a8" },
  { id: "물", emoji: "💧", color: "#3b82f6" },
  { id: "불", emoji: "🔥", color: "#ef4444" },
  { id: "빛", emoji: "✨", color: "#eab308" },
];

const elementBeats = {
  불: "자연",
  자연: "물",
  물: "불",
  빛: "어둠",
  어둠: "빛",
};

export const elementAdvantageMultiplier = 1.5;

export function getElement(elementId) {
  return elements.find((e) => e.id === elementId) ?? null;
}

export function hasElementAdvantage(attackerElementId, defenderElementId) {
  if (!attackerElementId || !defenderElementId) return false;
  return elementBeats[attackerElementId] === defenderElementId;
}

export function rollRandomElement() {
  return elements[Math.floor(Math.random() * elements.length)].id;
}
