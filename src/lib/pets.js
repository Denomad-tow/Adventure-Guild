import { supabase } from "./supabaseClient";
import { rollPetSpecies, rollPetGrade, getPetGrade, getPetSpecies, getPetBonusValue, petMaxStar } from "@/config/pets";

export async function fetchPets(userId) {
  if (!userId) return [];
  const { data } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createEgg(userId) {
  const { error } = await supabase.from("pets").insert({
    user_id: userId,
    species_id: rollPetSpecies(),
    grade: rollPetGrade(),
    is_egg: true,
    hatch_at: null,
    hatch_slot: null,
  });
  return { error };
}

// 부화칸(1~petHatchSlotCount) 중 하나에 알을 넣어야 그때부터 부화 시간이 흐르기 시작한다.
// hatchSpeedBonusPercent: "포란술" 연구로 얻는 부화 시간 단축율(%)
export async function placeEggInHatchSlot(pet, slotIndex, hatchSpeedBonusPercent = 0) {
  const grade = getPetGrade(pet.grade ?? "common");
  const hours = grade.hatchHours * (1 - Math.min(hatchSpeedBonusPercent, 80) / 100);
  const hatchAt = new Date(Date.now() + hours * 3600 * 1000);
  const { error } = await supabase
    .from("pets")
    .update({ hatch_slot: slotIndex, hatch_at: hatchAt.toISOString() })
    .eq("id", pet.id);
  return { error };
}

export async function hatchEgg(petId) {
  const { error } = await supabase.from("pets").update({ is_egg: false, hatch_slot: null }).eq("id", petId);
  return { error };
}

export async function equipPet(userId, petId) {
  await supabase.from("pets").update({ equipped: false }).eq("user_id", userId).eq("equipped", true);
  const { error } = await supabase.from("pets").update({ equipped: true }).eq("id", petId);
  return { error };
}

export async function unequipPet(petId) {
  const { error } = await supabase.from("pets").update({ equipped: false }).eq("id", petId);
  return { error };
}

export async function deletePet(petId) {
  const { error } = await supabase.from("pets").delete().eq("id", petId);
  return { error };
}

// materialPetId(같은 종류의 다른 펫)를 재료로 써서 targetPetId의 별 등급을 올린다.
export async function upgradePetStar(targetPet, materialPetId) {
  if (targetPet.star >= petMaxStar) return { error: null };

  const { error: deleteError } = await supabase.from("pets").delete().eq("id", materialPetId);
  if (deleteError) return { error: deleteError };

  const { error } = await supabase
    .from("pets")
    .update({ star: Math.min(petMaxStar, (targetPet.star ?? 1) + 1) })
    .eq("id", targetPet.id);
  return { error };
}

const emptyPetBonuses = {
  attackPercent: 0,
  goldFindPercent: 0,
  expPercent: 0,
  dropChancePercent: 0,
  critDamagePercent: 0,
};

// 장착된 펫의 보너스를 실제 수치로 바꾼다. 장착한 펫이 없으면 전부 0.
// bonusValueBonusPercent: "교감" 연구로 얻는 펫 효과 증가율(%)
export function getActivePetBonuses(pets, bonusValueBonusPercent = 0) {
  const active = (pets ?? []).find((p) => p.equipped && !p.is_egg);
  if (!active) return emptyPetBonuses;
  const species = getPetSpecies(active.species_id);
  if (!species) return emptyPetBonuses;
  const baseValue = getPetBonusValue(active.species_id, active.level, active.star ?? 1, active.grade ?? "common");
  const value = Math.round(baseValue * (1 + bonusValueBonusPercent / 100) * 10) / 10;
  return { ...emptyPetBonuses, [species.bonusType]: value };
}

export { emptyPetBonuses };
