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

// 초 단위 시간을 "3시간 12분" 같은 형태로 보여준다.
export function formatDuration(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  return "잠깐";
}
