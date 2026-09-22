import { supabase } from "./supabaseClient";

export async function fetchMailbox(userId) {
  const { data } = await supabase
    .from("mailbox")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function claimMail(mailId) {
  const { data, error } = await supabase.rpc("claim_mail", { p_mail_id: mailId });
  if (error) return { error };
  return { result: data?.[0], error: null };
}
