// 큰 숫자를 1.2K, 3.5M 처럼 줄여서 표시한다.
export function formatNumber(n) {
  const value = Math.floor(n);
  if (value < 1000) return `${value}`;
  const units = ["K", "M", "B", "T"];
  let unitIndex = -1;
  let remaining = value;
  do {
    remaining /= 1000;
    unitIndex++;
  } while (remaining >= 1000 && unitIndex < units.length - 1);
  return `${remaining.toFixed(1).replace(/\.0$/, "")}${units[unitIndex]}`;
}
