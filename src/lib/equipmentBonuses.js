import { supabase } from "./supabaseClient";
import { getEquipmentStatBonuses } from "@/config/equipment";

// 장착 중인 장비들의 옵션을 합쳐서, 전투에 바로 쓸 수 있는 보너스 값으로 만들어준다.
export async function fetchEquippedBonuses(userId) {
  const { data, error } = await supabase
    .from("equipment")
    .select("grade, options, enhance_level, set_id")
    .eq("user_id", userId)
    .eq("equipped", true);

  if (error) {
    console.error("장착 장비 보너스 조회 실패:", error.message);
  }

  return getEquipmentStatBonuses(data ?? []);
}
