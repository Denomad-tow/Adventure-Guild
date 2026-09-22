import { supabase } from "./supabaseClient";
import { getEquipmentStatBonuses, getEquippedWeaponElement, getEquippedUniqueEffects } from "@/config/equipment";
import { getPassiveUniqueEffectBonuses } from "@/config/uniqueEffects";

// 장착 중인 장비들의 옵션을 합쳐서, 전투에 바로 쓸 수 있는 보너스 값으로 만들어준다.
// (무기 속성도 함께 알려준다: 지역 속성과 비교해서 유리하면 피해 +50%. 전설+ 고유 효과도 함께)
export async function fetchEquippedBonuses(userId) {
  const { data, error } = await supabase
    .from("equipment")
    .select("slot, grade, options, enhance_level, set_id, element, unique_effect, item_type")
    .eq("user_id", userId)
    .eq("equipped", true);

  if (error) {
    console.error("장착 장비 보너스 조회 실패:", error.message);
  }

  const items = data ?? [];
  const uniqueEffects = getEquippedUniqueEffects(items);
  return {
    ...getEquipmentStatBonuses(items),
    weaponElement: getEquippedWeaponElement(items),
    uniqueEffects,
    uniqueEffectBonuses: getPassiveUniqueEffectBonuses(uniqueEffects),
    // 캐릭터 그림에 장착 장비를 그대로 보여주기 위한 원본 목록 (부위/등급/종류).
    equippedItems: items,
  };
}
