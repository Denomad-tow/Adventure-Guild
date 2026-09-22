import { supabase } from "./supabaseClient";

export async function fetchSeasonState() {
  const { data } = await supabase.from("season_state").select("*").eq("id", 1).maybeSingle();
  return data;
}

// 시즌이 끝났으면 정산하고 새 시즌을 시작한다. 끝나지 않았으면 지금 시즌 정보만 돌려준다.
// (별도 예약 작업 없이, 아무나 이 함수를 부르는 순간 확인/정산이 이루어지는 방식)
export async function advanceSeasonIfEnded() {
  const { data, error } = await supabase.rpc("advance_season_if_ended");
  if (error) return { error };
  return { result: data?.[0], error: null };
}

// 시즌 랭킹 3종(도달 지역 / 업적 개수 / 이번 시즌 월드보스 누적 피해) 상위 5명.
export async function fetchSeasonLeaderboards(seasonStartedAt) {
  const [{ data: roster }, { data: challenges }] = await Promise.all([
    supabase.from("guild_roster").select("*"),
    supabase.from("world_boss_challenges").select("user_id, nickname, damage").gte("created_at", seasonStartedAt),
  ]);

  const rosterRows = roster ?? [];
  const regionBoard = [...rosterRows]
    .sort((a, b) => b.unlocked_region_index - a.unlocked_region_index)
    .slice(0, 5)
    .map((row) => ({ nickname: row.nickname, value: row.unlocked_region_index }));

  const achievementBoard = [...rosterRows]
    .sort((a, b) => b.achievement_count - a.achievement_count)
    .slice(0, 5)
    .map((row) => ({ nickname: row.nickname, value: row.achievement_count }));

  const damageByUser = {};
  for (const row of challenges ?? []) {
    if (!damageByUser[row.user_id]) damageByUser[row.user_id] = { nickname: row.nickname, damage: 0 };
    damageByUser[row.user_id].damage += row.damage;
  }
  const damageBoard = Object.values(damageByUser)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 5)
    .map((row) => ({ nickname: row.nickname, value: row.damage }));

  return { regionBoard, achievementBoard, damageBoard };
}
