export default function ProgressBar({
  value,
  max,
  colorClassName = "bg-emerald-500",
  heightClassName = "h-2",
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${heightClassName}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-200 ${colorClassName}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
