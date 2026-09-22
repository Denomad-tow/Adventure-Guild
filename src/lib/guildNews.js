import { supabase } from "./supabaseClient";

// 눈에 띄는 사건이 생겼을 때 길드 전체에 소식을 올린다.
// category는 src/config/guildNews.js의 guildNewsCategories에 맞춰서 넘긴다.
export async function postGuildNews(userId, nickname, message, category = "general") {
  const { error } = await supabase.from("guild_news").insert({ user_id: userId, nickname, message, category });
  if (error) {
    console.error("길드 소식 등록 실패:", error.message);
  }
}
