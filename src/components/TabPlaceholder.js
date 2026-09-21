export default function TabPlaceholder({ emoji, title, description }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {title}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
