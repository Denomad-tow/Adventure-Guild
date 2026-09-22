import { supabase } from "./supabaseClient";
import { cheerDailyLimit, cheerBuffDurationMs } from "@/config/guild";

const oneDayMs = 24 * 60 * 60 * 1000;

// 오늘(최근 24시간) 내가 몇 번 응원을 보냈는지 센다.
export async function countCheersSentToday(userId) {
  const since = new Date(Date.now() - oneDayMs).toISOString();
  const { count } = await supabase
    .from("cheers")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function getRemainingCheersToday(userId) {
  const sent = await countCheersSentToday(userId);
  return Math.max(0, cheerDailyLimit - sent);
}

export async function sendCheer(senderId, senderNickname, receiverId) {
  const { error } = await supabase.from("cheers").insert({
    sender_id: senderId,
    sender_nickname: senderNickname,
    receiver_id: receiverId,
  });
  return { error };
}

// 최근 1시간 안에 응원을 받은 적이 있으면 공격력 버프가 켜져 있는 것으로 본다.
export async function hasActiveCheerBuff(userId) {
  const since = new Date(Date.now() - cheerBuffDurationMs).toISOString();
  const { count } = await supabase
    .from("cheers")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

// 아직 안 본(seen=false) 응원 알림을 가져오고, 확인 처리(seen=true)한다.
export async function fetchAndConsumeUnseenCheers(userId) {
  const { data } = await supabase
    .from("cheers")
    .select("*")
    .eq("receiver_id", userId)
    .eq("seen", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const unseen = data ?? [];
  if (unseen.length > 0) {
    await supabase
      .from("cheers")
      .update({ seen: true })
      .in("id", unseen.map((c) => c.id));
  }
  return unseen;
}
