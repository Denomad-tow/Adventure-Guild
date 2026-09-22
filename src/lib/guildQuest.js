import { supabase } from "./supabaseClient";
import { getCurrentWeekKey, getCurrentWeekStartISO } from "./quests";

export async function fetchGuildQuestProgress() {
  const { data } = await supabase.from("guild_quest_progress").select("*").eq("id", 1).maybeSingle();
  if (!data) return { killCount: 0 };
  const isCurrentWeek = data.week_key === getCurrentWeekKey();
  return { killCount: isCurrentWeek ? data.kill_count : 0 };
}

export async function addGuildQuestKills(amount) {
  if (!amount) return;
  const { error } = await supabase.rpc("add_guild_quest_kills", {
    p_amount: amount,
    p_week_key: getCurrentWeekKey(),
  });
  if (error) console.error("길드 공동 퀘스트 반영 실패:", error.message);
}

// 이번 주(월요일 00:00 이후) 내가 월드 보스에 도전한 횟수.
export async function countWorldBossChallengesThisWeek(userId) {
  const { count } = await supabase
    .from("world_boss_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", getCurrentWeekStartISO());
  return count ?? 0;
}
