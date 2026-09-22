import { supabase } from "./supabaseClient";

export async function submitBugReport(userId, nickname, message) {
  const trimmed = message.trim();
  if (!trimmed) return { error: null };
  const { error } = await supabase.from("bug_reports").insert({
    user_id: userId,
    nickname,
    message: trimmed.slice(0, 1000),
  });
  return { error };
}

export async function fetchMyBugReports(userId) {
  const { data } = await supabase
    .from("bug_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
