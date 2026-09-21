import { regions } from "@/config/regions";

export default function RegionSelector({ activeIndex, unlockedIndex, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {regions.map((region, index) => {
        const isUnlocked = index <= unlockedIndex;
        const isActive = index === activeIndex;
        return (
          <button
            key={region.id}
            type="button"
            disabled={!isUnlocked}
            onClick={() => onSelect(index)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              isActive
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : isUnlocked
                  ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                  : "bg-zinc-100 text-zinc-300 dark:bg-zinc-900 dark:text-zinc-700"
            }`}
          >
            {isUnlocked ? `${index + 1}. ${region.name}` : `🔒 ${index + 1}. ${region.name}`}
          </button>
        );
      })}
    </div>
  );
}
