import { supabase } from "./supabaseClient";
import { guildBuildings, getBuildingEffectValue } from "@/config/guildTown";

export async function fetchGuildBuildings() {
  const { data } = await supabase.from("guild_town_buildings").select("*");
  const byId = {};
  for (const row of data ?? []) {
    byId[row.building_id] = row;
  }
  return byId;
}

export async function fetchBuildingContributionBoard(buildingId) {
  const { data } = await supabase
    .from("guild_town_contributions")
    .select("nickname, amount")
    .eq("building_id", buildingId);

  const totals = {};
  for (const row of data ?? []) {
    totals[row.nickname] = (totals[row.nickname] ?? 0) + row.amount;
  }
  return Object.entries(totals)
    .map(([nickname, amount]) => ({ nickname, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

export async function contributeToBuilding(buildingId, amount) {
  const { data, error } = await supabase.rpc("contribute_to_building", {
    p_building_id: buildingId,
    p_amount: amount,
  });
  if (error) return { error };
  return { result: data?.[0], error: null };
}

// 건물 레벨들을 실제 게임 곳곳에 적용할 보너스 값으로 변환한다. (한 번 불러와서 여러 화면에서 재사용)
export async function fetchGuildTownBonuses() {
  const buildings = await fetchGuildBuildings();
  const bonuses = {};
  for (const building of guildBuildings) {
    const level = buildings[building.id]?.level ?? 0;
    bonuses[building.id] = getBuildingEffectValue(building.id, level);
  }
  return {
    forgeSuccessBonusPercent: bonuses.forge ?? 0,
    magicTowerDamageBonusPercent: bonuses.magicTower ?? 0,
    innExtraHours: bonuses.inn ?? 0,
    trainingExpBonusPercent: bonuses.trainingGround ?? 0,
    treasuryGoldBonusPercent: bonuses.treasury ?? 0,
    guildBoardRewardBonusPercent: bonuses.guildBoard ?? 0,
  };
}
