import { getGrade, getSlot, getItemType } from "@/config/equipment";

export default function DropToast({ drops }) {
  if (drops.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-1">
      {drops.map((drop) => {
        const grade = getGrade(drop.grade);
        const slot = getSlot(drop.slot);
        const itemType = getItemType(drop.slot, drop.itemType);
        return (
          <div
            key={drop.id}
            className="level-up-pop rounded-full border px-3 py-1 text-xs font-semibold shadow"
            style={{ borderColor: grade.color, color: grade.color, background: "rgba(255,255,255,0.9)" }}
          >
            ✨ {itemType?.emoji ?? slot.emoji} {grade.label} {itemType?.label ?? slot.label} 획득!
          </div>
        );
      })}
    </div>
  );
}
