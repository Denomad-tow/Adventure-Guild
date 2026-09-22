"use client";

import { getGrade, getGradeIndex, getItemType } from "@/config/equipment";

// 장착한 무기/투구/갑옷 종류에 따라 캐릭터 모습이 조금씩 달라진다.
// (투구 아이콘이 머리 위에, 무기 아이콘이 손 옆에 보이고, 등급이 높을수록 은은한 후광이 생긴다)
export default function CharacterAvatar({ jobEmoji, equippedItems = [], size = "text-6xl" }) {
  const bySlot = {};
  for (const item of equippedItems) {
    bySlot[item.slot] = item;
  }

  const weapon = bySlot.weapon;
  const helmet = bySlot.helmet;
  const armor = bySlot.armor;

  let bestGrade = null;
  let bestGradeIndex = -1;
  for (const item of equippedItems) {
    const idx = getGradeIndex(item.grade);
    if (idx > bestGradeIndex) {
      bestGradeIndex = idx;
      bestGrade = item.grade;
    }
  }
  const auraColor = bestGradeIndex >= 2 ? getGrade(bestGrade).color : null;

  const helmetEmoji = helmet ? (getItemType("helmet", helmet.item_type)?.emoji ?? "🪖") : null;
  const weaponEmoji = weapon ? (getItemType("weapon", weapon.item_type)?.emoji ?? "🗡️") : null;
  const armorColor = armor ? getGrade(armor.grade).color : null;

  return (
    <div className="relative flex flex-col items-center">
      {auraColor && (
        <div
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-xl"
          style={{ background: auraColor }}
        />
      )}
      {helmetEmoji && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">{helmetEmoji}</span>}
      <span className={`${size} drop-shadow`}>{jobEmoji}</span>
      {weaponEmoji && <span className="absolute -right-2 bottom-3 text-2xl drop-shadow">{weaponEmoji}</span>}
      {armorColor && (
        <span
          className="absolute -bottom-0.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full opacity-80"
          style={{ background: armorColor }}
        />
      )}
    </div>
  );
}
