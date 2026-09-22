import { supabase } from "./supabaseClient";
import { getEquipmentStatBonuses } from "@/config/equipment";

// 장착 중인 장비들의 옵션을 합쳐서, 전투에 바로 쓸 수 있는 보너스 값으로 만들어준다.
export async function fetchEquippedBonuses(userId) {
  const { data } = await supabase
    .from("equipment")
    .select("grade, options")
    .eq("user_id", userId)
    .eq("equipped", true);

  return getEquipmentStatBonuses(data ?? []);
}
