import { supabase } from "./supabaseClient";

const RECENT_MESSAGE_LIMIT = 50;

export async function fetchRecentMessages() {
  const { data } = await supabase
    .from("guild_chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);
  return (data ?? []).reverse();
}

export async function sendChatMessage(userId, nickname, message) {
  const trimmed = message.trim();
  if (!trimmed) return { error: null };
  const { error } = await supabase.from("guild_chat_messages").insert({
    user_id: userId,
    nickname,
    message: trimmed.slice(0, 300),
  });
  return { error };
}

// 새 메시지가 도착할 때마다 onMessage를 부른다. 정리(unsubscribe) 함수를 돌려준다.
export function subscribeToChatMessages(onMessage) {
  const channel = supabase
    .channel("guild-chat")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "guild_chat_messages" },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
