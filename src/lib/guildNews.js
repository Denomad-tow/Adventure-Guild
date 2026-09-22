import { supabase } from "./supabaseClient";

// 눈에 띄는 사건이 생겼을 때 길드 전체에 소식을 올린다.
export async function postGuildNews(userId, nickname, message) {
  const { error } = await supabase.from("guild_news").insert({ user_id: userId, nickname, message });
  if (error) {
    console.error("길드 소식 등록 실패:", error.message);
  }
}
