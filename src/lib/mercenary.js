import { supabase } from "./supabaseClient";
import { mercenaryDailyLimit, getMercenaryFee } from "@/config/mercenary";

const oneDayMs = 24 * 60 * 60 * 1000;

export async function countHiresToday(hirerId) {
  const since = new Date(Date.now() - oneDayMs).toISOString();
  const { count } = await supabase
    .from("mercenary_hires")
    .select("id", { count: "exact", head: true })
    .eq("hirer_id", hirerId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function getRemainingHiresToday(hirerId) {
  const used = await countHiresToday(hirerId);
  return Math.max(0, mercenaryDailyLimit - used);
}

export async function hireMercenary(hirerId, hirerNickname, mercenary, regionIndex) {
  const { error } = await supabase.from("mercenary_hires").insert({
    hirer_id: hirerId,
    hirer_nickname: hirerNickname,
    mercenary_id: mercenary.user_id,
    mercenary_nickname: mercenary.nickname,
    mercenary_level: mercenary.level,
    region_index: regionIndex,
    fee_gold: getMercenaryFee(mercenary.level),
  });
  return { error };
}
