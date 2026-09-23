"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber, formatDuration } from "@/lib/format";
import ProgressBar from "@/components/ProgressBar";
import {
  equipmentSlots,
  grades,
  getGrade,
  getSlot,
  getItemType,
  getOptionType,
  getGradeIndex,
  getDisassembleReward,
  getSellReward,
  getEquipmentSet,
  getActiveSetStatuses,
  getItemEnhanceCost,
  getItemEnhanceSuccessRate,
  rollItemEnhanceSuccess,
  maxItemEnhanceLevel,
  enhanceFailureStartLevel,
} from "@/config/equipment";
import { getElement } from "@/config/elements";
import { postGuildNews } from "@/lib/guildNews";
import { getAchievement } from "@/config/achievements";
import { applyAchievementUnlock } from "@/lib/achievements";
import { fetchGuildTownBonuses } from "@/lib/guildTown";
import { emptyGuildTownBonuses } from "@/config/guildTown";
import { fetchPets, hatchEgg, equipPet, unequipPet, upgradePetStar } from "@/lib/pets";
import { getUniqueEffect } from "@/config/uniqueEffects";
import {
  getPetSpecies,
  getPetEmoji,
  getPetStageName,
  getPetBonusValue,
  getPetExpToNextLevel,
  getPetFeedCost,
  petMaxLevel,
  petFeedExpGain,
  petMaxStar,
} from "@/config/pets";

const rareOrBelowIndex = getGradeIndex("rare");
const defaultBulkGrades = grades.filter((g) => getGradeIndex(g.id) <= rareOrBelowIndex).map((g) => g.id);

export default function BagPage() {
  const { character, refreshCharacter } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSlot, setFilterSlot] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkGrades, setBulkGrades] = useState(defaultBulkGrades);
  const [enhanceResult, setEnhanceResult] = useState(null);
  const [guildBonuses, setGuildBonuses] = useState(emptyGuildTownBonuses);
  const [pets, setPets] = useState([]);
  const [petBusy, setPetBusy] = useState(null);
  const [starPickerPetId, setStarPickerPetId] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadPets = useCallback(async (userId) => {
    const data = await fetchPets(userId);
    setPets(data);
  }, []);

  const loadItems = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase
      .from("equipment")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  // 탭을 급하게 오갈 때 골드/강화석이 옛날 값으로 보이는 걸 줄이기 위해,
  // 이 탭에 들어올 때마다 캐릭터 정보를 한 번 더 최신으로 받아온다.
  useEffect(() => {
    refreshCharacter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!character?.user_id) return;
    supabase
      .from("equipment")
      .select("*")
      .eq("user_id", character.user_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
    fetchGuildTownBonuses()
      .then(setGuildBonuses)
      .catch(() => setGuildBonuses(emptyGuildTownBonuses));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPets(character.user_id);
  }, [character?.user_id, loadPets]);

  if (!character) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const progress = character.progress ?? {};
  const gold = progress.gold ?? 0;
  const stones = progress.enhancementStones ?? 0;

  const equippedBySlot = {};
  for (const item of items) {
    if (item.equipped) equippedBySlot[item.slot] = item;
  }

  const unequippedItems = items.filter((item) => !item.equipped);
  const filteredItems =
    filterSlot === "all" ? unequippedItems : unequippedItems.filter((item) => item.slot === filterSlot);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const bulkTargets = unequippedItems.filter((item) => bulkGrades.includes(item.grade));
  const bulkStoneTotal = bulkTargets.reduce((sum, item) => sum + getDisassembleReward(item.grade), 0);
  const activeSets = getActiveSetStatuses(items.filter((item) => item.equipped));
  const autoDisassembleGrades = progress.autoDisassembleGrades ?? {};

  function toggleBulkGrade(gradeId) {
    setBulkGrades((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId]
    );
  }

  async function updateProgress(patch) {
    await supabase
      .from("characters")
      .update({ progress: { ...progress, ...patch } })
      .eq("user_id", character.user_id);
    await refreshCharacter();
  }

  async function toggleAutoDisassembleGrade(gradeId) {
    const next = { ...autoDisassembleGrades, [gradeId]: !autoDisassembleGrades[gradeId] };
    await updateProgress({ autoDisassembleGrades: next });
  }

  async function handleHatchEgg(pet) {
    if (petBusy) return;
    setPetBusy(pet.id);
    const { error } = await hatchEgg(pet.id);
    if (error) console.error("부화 실패:", error.message);
    await loadPets(character.user_id);
    setPetBusy(null);
  }

  async function handleFeedPet(pet) {
    if (petBusy || pet.level >= petMaxLevel) return;
    const cost = getPetFeedCost(pet.level);
    if (stones < cost) return;
    setPetBusy(pet.id);

    let level = pet.level;
    let exp = pet.exp + petFeedExpGain;
    let expToNext = getPetExpToNextLevel(level);
    while (exp >= expToNext && level < petMaxLevel) {
      exp -= expToNext;
      level += 1;
      expToNext = getPetExpToNextLevel(level);
    }

    await supabase.from("pets").update({ level, exp }).eq("id", pet.id);
    await updateProgress({ enhancementStones: stones - cost });
    await loadPets(character.user_id);
    setPetBusy(null);
  }

  async function handleTogglePetEquip(pet) {
    if (petBusy) return;
    setPetBusy(pet.id);
    const { error } = pet.equipped
      ? await unequipPet(pet.id)
      : await equipPet(character.user_id, pet.id);
    if (error) console.error("펫 장착 실패:", error.message);
    await loadPets(character.user_id);
    setPetBusy(null);
  }

  async function handleUpgradePetStar(targetPet, materialPet) {
    if (petBusy) return;
    setPetBusy(targetPet.id);
    const { error } = await upgradePetStar(targetPet, materialPet.id);
    if (error) console.error("펫 별 강화 실패:", error.message);
    setStarPickerPetId(null);
    await loadPets(character.user_id);
    setPetBusy(null);
  }

  async function handleAutoEquip() {
    setBusy(true);
    const bestBySlot = {};
    for (const item of items) {
      const current = bestBySlot[item.slot];
      const score = getGradeIndex(item.grade) * 100 + (item.enhance_level ?? 0);
      const currentScore = current ? getGradeIndex(current.grade) * 100 + (current.enhance_level ?? 0) : -1;
      if (score > currentScore) bestBySlot[item.slot] = item;
    }

    const toEquip = Object.values(bestBySlot).filter((item) => !item.equipped);
    for (const item of toEquip) {
      await supabase
        .from("equipment")
        .update({ equipped: false })
        .eq("user_id", character.user_id)
        .eq("slot", item.slot)
        .eq("equipped", true);
      await supabase.from("equipment").update({ equipped: true }).eq("id", item.id);
    }

    await loadItems(character.user_id);
    setBusy(false);
  }

  async function handleEquip(item) {
    setBusy(true);
    if (!item.equipped) {
      await supabase
        .from("equipment")
        .update({ equipped: false })
        .eq("user_id", character.user_id)
        .eq("slot", item.slot)
        .eq("equipped", true);
    }
    await supabase.from("equipment").update({ equipped: !item.equipped }).eq("id", item.id);
    await loadItems(character.user_id);
    setSelectedId(null);
    setBusy(false);
  }

  async function handleDisassemble(item) {
    if (item.equipped) return;
    setBusy(true);
    const { error } = await supabase.from("equipment").delete().eq("id", item.id);
    if (error) {
      console.error("장비 분해 실패:", error.message);
      setBusy(false);
      return;
    }
    await updateProgress({ enhancementStones: stones + getDisassembleReward(item.grade) });
    await loadItems(character.user_id);
    setSelectedId(null);
    setBusy(false);
  }

  async function handleSell(item) {
    if (item.equipped) return;
    setBusy(true);
    const { error } = await supabase.from("equipment").delete().eq("id", item.id);
    if (error) {
      console.error("장비 판매 실패:", error.message);
      setBusy(false);
      return;
    }
    await updateProgress({ gold: gold + getSellReward(item.grade) });
    await loadItems(character.user_id);
    setSelectedId(null);
    setBusy(false);
  }

  async function handleEnhanceItem(item) {
    const currentLevel = item.enhance_level ?? 0;
    const cost = getItemEnhanceCost(currentLevel);
    if (currentLevel >= maxItemEnhanceLevel || stones < cost) return;

    setBusy(true);
    const success = rollItemEnhanceSuccess(currentLevel, guildBonuses.forgeSuccessBonusPercent);
    const newLevel = success ? currentLevel + 1 : currentLevel;

    await supabase.from("equipment").update({ enhance_level: newLevel }).eq("id", item.id);

    const enhanceFailStreak = success ? 0 : (progress.enhanceFailStreak ?? 0) + 1;
    let nextProgress = { ...progress, enhancementStones: stones - cost, enhanceFailStreak };
    if (success && newLevel >= getAchievement("enhance15").target) {
      nextProgress = applyAchievementUnlock(nextProgress, "enhance15");
    }
    if (!success && enhanceFailStreak >= getAchievement("enhanceFailStreak10").target) {
      nextProgress = applyAchievementUnlock(nextProgress, "enhanceFailStreak10");
    }
    await supabase.from("characters").update({ progress: nextProgress }).eq("user_id", character.user_id);
    await refreshCharacter();

    await loadItems(character.user_id);
    setEnhanceResult({ success });
    setTimeout(() => setEnhanceResult(null), 2000);
    setBusy(false);

    if (!success && currentLevel >= enhanceFailureStartLevel) {
      postGuildNews(
        character.user_id,
        character.nickname,
        `${character.nickname}님이 강화 +${currentLevel + 1}에 실패했습니다... 😢`,
        "enhance_fail"
      );
    }
  }

  async function handleBulkDisassemble() {
    if (bulkTargets.length === 0) return;
    setBulkBusy(true);
    // 한 번에 너무 많은 id를 보내면 요청 주소가 길어져 서버가 거부하므로, 묶어서 나눠 보낸다.
    const ids = bulkTargets.map((item) => item.id);
    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from("equipment").delete().in("id", chunk);
      if (error) {
        console.error("일괄 분해 실패:", error.message);
        setBulkBusy(false);
        return;
      }
    }
    await updateProgress({ enhancementStones: stones + bulkStoneTotal });
    await loadItems(character.user_id);
    setBulkBusy(false);
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center justify-between rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">골드</span>
          <span className="font-semibold text-amber-500">{formatNumber(gold)} G</span>
        </div>
        <div className="flex flex-1 items-center justify-between rounded-lg bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">강화석</span>
          <span className="font-semibold text-zinc-950 dark:text-white">🔩 {formatNumber(stones)}</span>
        </div>
      </div>

      {/* 장착 중인 장비 (부위 6칸) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">장착 중</h2>
          <button
            type="button"
            onClick={handleAutoEquip}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            ⚡ 자동 장착
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {equipmentSlots.map((slot) => {
            const item = equippedBySlot[slot.id];
            const grade = item ? getGrade(item.grade) : null;
            const itemType = item ? getItemType(slot.id, item.item_type) : null;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => item && setSelectedId(item.id)}
                className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2"
                style={{
                  borderColor: grade ? grade.color : "rgba(161,161,170,0.35)",
                  borderStyle: grade ? "solid" : "dashed",
                  background: grade ? `${grade.color}1a` : "transparent",
                }}
              >
                {item?.enhance_level > 0 && (
                  <span className="absolute right-1 top-1 text-[10px] font-bold text-sky-500">
                    +{item.enhance_level}
                  </span>
                )}
                {item?.unique_effect && <span className="absolute right-1 bottom-1 text-xs">✨</span>}
                <span className="text-2xl">{itemType?.emoji ?? slot.emoji}</span>
                {item?.element && (
                  <span className="absolute bottom-1 left-1 text-xs">
                    {getElement(item.element)?.emoji}
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {itemType?.label ?? slot.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 세트 효과 현황 */}
      {activeSets.length > 0 && (
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">세트 효과</h2>
          {activeSets.map((set) => {
            const bonus = set.count >= 4 ? set.bonus4 : set.count >= 2 ? set.bonus2 : null;
            return (
              <div key={set.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {set.name} ({set.count}개)
                </span>
                <span className="text-xs font-medium text-emerald-500">
                  {bonus
                    ? Object.entries(bonus)
                        .map(
                          ([type, value]) =>
                            `${getOptionType(type)?.label ?? type} +${value}${getOptionType(type)?.suffix ?? ""}`
                        )
                        .join(", ")
                    : `2개부터 효과 발동 (${2 - set.count}개 더 필요)`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 부위별 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilterSlot("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
            filterSlot === "all"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          }`}
        >
          전체
        </button>
        {equipmentSlots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setFilterSlot(slot.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              filterSlot === slot.id
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {slot.emoji} {slot.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          일괄 분해할 등급 선택 (장착 중인 장비는 제외됩니다)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grades.map((grade) => (
            <button
              key={grade.id}
              type="button"
              onClick={() => toggleBulkGrade(grade.id)}
              className="rounded-full border px-2.5 py-1 text-xs font-medium"
              style={
                bulkGrades.includes(grade.id)
                  ? { borderColor: grade.color, background: `${grade.color}22`, color: grade.color }
                  : { borderColor: "rgba(161,161,170,0.4)", color: "#9ca3af" }
              }
            >
              {grade.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleBulkDisassemble}
          disabled={bulkBusy || bulkTargets.length === 0}
          className="mt-3 w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
        >
          {bulkBusy
            ? "분해 중..."
            : `일괄 분해하기 (${bulkTargets.length}개 → 강화석 +${bulkStoneTotal})`}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          자동 분해 설정 (켜둔 등급은 장비를 얻는 즉시 강화석으로 바뀝니다)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grades.map((grade) => (
            <button
              key={grade.id}
              type="button"
              onClick={() => toggleAutoDisassembleGrade(grade.id)}
              className="rounded-full border px-2.5 py-1 text-xs font-medium"
              style={
                autoDisassembleGrades[grade.id]
                  ? { borderColor: grade.color, background: `${grade.color}22`, color: grade.color }
                  : { borderColor: "rgba(161,161,170,0.4)", color: "#9ca3af" }
              }
            >
              {grade.label}
            </button>
          ))}
        </div>
      </div>

      {/* 보관함 (인벤토리 그리드) */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">보관함</h2>
        {loading ? (
          <p className="text-center text-sm text-zinc-400">불러오는 중...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-sm text-zinc-400">
            {filterSlot === "all" ? "보관 중인 장비가 없습니다." : "이 부위의 장비가 없습니다."}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredItems.map((item) => {
              const grade = getGrade(item.grade);
              const slot = getSlot(item.slot);
              const itemType = getItemType(item.slot, item.item_type);
              const equippedItem = equippedBySlot[item.slot];
              const equippedGradeIndex = equippedItem ? getGradeIndex(equippedItem.grade) : -1;
              const itemGradeIndex = getGradeIndex(item.grade);
              const isUpgrade = itemGradeIndex > equippedGradeIndex;
              const isDowngrade = equippedItem && itemGradeIndex < equippedGradeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2"
                  style={{ borderColor: grade.color, background: `${grade.color}1a` }}
                >
                  {isUpgrade && (
                    <span className="absolute right-1 top-1 text-xs font-bold text-emerald-500">▲</span>
                  )}
                  {isDowngrade && (
                    <span className="absolute right-1 top-1 text-xs font-bold text-zinc-400">▼</span>
                  )}
                  {item.enhance_level > 0 && (
                    <span className="absolute left-1 top-1 text-[10px] font-bold text-sky-500">
                      +{item.enhance_level}
                    </span>
                  )}
                  {item.unique_effect && (
                    <span className="absolute right-1 bottom-1 text-xs">✨</span>
                  )}
                  <span className="text-2xl">{itemType?.emoji ?? slot.emoji}</span>
                  {item.element && (
                    <span className="absolute bottom-1 left-1 text-xs">
                      {getElement(item.element)?.emoji}
                    </span>
                  )}
                  <span className="text-[10px] font-medium" style={{ color: grade.color }}>
                    {grade.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 펫 */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">펫</h2>
        {pets.length === 0 ? (
          <p className="text-center text-sm text-zinc-400">
            아직 알이나 펫이 없습니다. 사냥 중 아주 낮은 확률로 알을 얻을 수 있어요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pets.map((pet) => {
              const species = getPetSpecies(pet.species_id);
              const emoji = getPetEmoji(pet.species_id, pet.level, pet.is_egg);
              const busy = petBusy === pet.id;

              if (pet.is_egg) {
                const hatchAt = new Date(pet.hatch_at).getTime();
                const ready = hatchAt <= nowTick;
                return (
                  <div
                    key={pet.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                  >
                    <span className="text-zinc-950 dark:text-white">
                      {emoji} {species?.name ?? "알"}의 알
                    </span>
                    {ready ? (
                      <button
                        type="button"
                        onClick={() => handleHatchEgg(pet)}
                        disabled={busy}
                        className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                      >
                        부화시키기
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {formatDuration(Math.ceil((hatchAt - nowTick) / 1000))} 후 부화
                      </span>
                    )}
                  </div>
                );
              }

              const expToNext = getPetExpToNextLevel(pet.level);
              const isMax = pet.level >= petMaxLevel;
              const feedCost = isMax ? null : getPetFeedCost(pet.level);
              const star = pet.star ?? 1;
              const isStarMax = star >= petMaxStar;
              const duplicatePets = pets.filter(
                (p) => p.species_id === pet.species_id && p.id !== pet.id && !p.is_egg
              );
              const showStarPicker = starPickerPetId === pet.id;
              return (
                <div key={pet.id} className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-950 dark:text-white">
                      {emoji} {species?.name} ({getPetStageName(pet.level)}) Lv.{pet.level}
                      {pet.equipped && <span className="ml-1 text-xs text-sky-500">장착 중</span>}
                    </span>
                    <span className="text-xs text-emerald-500">
                      {species?.bonusLabel} +{getPetBonusValue(pet.species_id, pet.level, star)}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-amber-500">{"⭐".repeat(star)}</p>
                  {!isMax && (
                    <div className="mt-1">
                      <ProgressBar
                        value={pet.exp}
                        max={expToNext}
                        colorClassName="bg-sky-500"
                        heightClassName="h-1.5"
                      />
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleFeedPet(pet)}
                      disabled={busy || isMax || stones < feedCost}
                      className="flex-1 rounded-lg border border-zinc-300 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {isMax ? "최대 레벨" : `먹이 주기 (🔩${feedCost})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePetEquip(pet)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-zinc-300 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      {pet.equipped ? "해제" : "장착"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStarPickerPetId(showStarPicker ? null : pet.id)}
                    disabled={busy || isStarMax || duplicatePets.length === 0}
                    className="mt-2 w-full rounded-lg border border-amber-400 py-1.5 text-xs font-medium text-amber-600 disabled:opacity-40 dark:border-amber-700 dark:text-amber-400"
                  >
                    {isStarMax
                      ? "별 최대"
                      : duplicatePets.length === 0
                        ? "별 강화 (같은 펫 필요)"
                        : `⭐ 별 강화 (동일 펫 ${duplicatePets.length}마리 보유)`}
                  </button>
                  {showStarPicker && (
                    <div className="mt-1 flex flex-col gap-1 rounded-lg bg-white p-2 dark:bg-zinc-900">
                      <p className="px-1 text-[11px] text-zinc-400">재료로 쓸 같은 펫을 골라주세요 (사라집니다)</p>
                      {duplicatePets.map((material) => (
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => handleUpgradePetStar(pet, material)}
                          disabled={busy}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <span>
                            {getPetEmoji(material.species_id, material.level, false)} Lv.{material.level} (
                            {"⭐".repeat(material.star ?? 1)})
                          </span>
                          <span className="text-amber-500">재료로 쓰기</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        재료(별도 아이템)는 다음 단계들에서 추가될 예정입니다.
      </p>

      {/* 선택한 장비 상세 정보 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-3xl">
                {getItemType(selectedItem.slot, selectedItem.item_type)?.emoji ?? getSlot(selectedItem.slot).emoji}
              </span>
              <div>
                <p className="text-base font-bold" style={{ color: getGrade(selectedItem.grade).color }}>
                  {getGrade(selectedItem.grade).label}{" "}
                  {getItemType(selectedItem.slot, selectedItem.item_type)?.label ?? getSlot(selectedItem.slot).label}
                  {selectedItem.enhance_level > 0 && (
                    <span className="ml-1 text-sky-500">+{selectedItem.enhance_level}</span>
                  )}
                </p>
                {selectedItem.set_id && getEquipmentSet(selectedItem.set_id) && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {getEquipmentSet(selectedItem.set_id).name}
                  </p>
                )}
                {selectedItem.element && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    속성: {getElement(selectedItem.element)?.emoji} {selectedItem.element}
                  </p>
                )}
                {selectedItem.equipped && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">장착 중</span>
                )}
                {!selectedItem.equipped &&
                  (() => {
                    const equippedItem = equippedBySlot[selectedItem.slot];
                    const equippedGradeIndex = equippedItem ? getGradeIndex(equippedItem.grade) : -1;
                    const itemGradeIndex = getGradeIndex(selectedItem.grade);
                    if (itemGradeIndex > equippedGradeIndex) {
                      return (
                        <span className="text-xs font-semibold text-emerald-500">
                          ▲ 장착 중인 장비보다 좋음
                        </span>
                      );
                    }
                    if (equippedItem && itemGradeIndex < equippedGradeIndex) {
                      return (
                        <span className="text-xs font-semibold text-zinc-400">
                          ▼ 장착 중인 장비보다 낮음
                        </span>
                      );
                    }
                    return null;
                  })()}
              </div>
            </div>

            {selectedItem.options?.length > 0 && (
              <div className="mt-3 flex flex-col gap-1 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                {selectedItem.options.map((opt, idx) => {
                  const optionType = getOptionType(opt.type);
                  return (
                    <div key={idx} className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {optionType?.label ?? opt.type}
                      </span>
                      <span className="font-medium text-zinc-950 dark:text-white">
                        +{opt.value}
                        {optionType?.suffix ?? ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedItem.unique_effect &&
              (() => {
                const effect = getUniqueEffect(selectedItem.unique_effect);
                if (!effect) return null;
                return (
                  <div className="mt-3 rounded-lg bg-amber-100 p-3 text-sm dark:bg-amber-900/30">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">
                      {effect.icon} 고유 효과: {effect.name}
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{effect.description}</p>
                  </div>
                );
              })()}

            <div className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  개별 강화 (+{selectedItem.enhance_level ?? 0} / +{maxItemEnhanceLevel})
                </span>
                {(selectedItem.enhance_level ?? 0) >= enhanceFailureStartLevel && (
                  <span className="text-xs text-red-500">
                    성공률{" "}
                    {Math.round(
                      getItemEnhanceSuccessRate(selectedItem.enhance_level ?? 0, guildBonuses.forgeSuccessBonusPercent) * 100
                    )}%
                  </span>
                )}
              </div>
              {(selectedItem.enhance_level ?? 0) < maxItemEnhanceLevel ? (
                <button
                  type="button"
                  onClick={() => handleEnhanceItem(selectedItem)}
                  disabled={busy || stones < getItemEnhanceCost(selectedItem.enhance_level ?? 0)}
                  className="mt-2 w-full rounded-lg bg-zinc-950 py-2 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                >
                  강화하기 (🔩{getItemEnhanceCost(selectedItem.enhance_level ?? 0)})
                </button>
              ) : (
                <p className="mt-2 text-center text-xs text-zinc-400">최대 강화 단계입니다.</p>
              )}
              {enhanceResult && (
                <p
                  className={`mt-1 text-center text-xs font-semibold ${
                    enhanceResult.success ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {enhanceResult.success ? "강화 성공!" : "강화 실패... 강화석만 소모되었습니다."}
                </p>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleEquip(selectedItem)}
                disabled={busy}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                {selectedItem.equipped ? "해제" : "장착"}
              </button>
              <button
                type="button"
                onClick={() => handleDisassemble(selectedItem)}
                disabled={busy || selectedItem.equipped}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                분해 (+{getDisassembleReward(selectedItem.grade)}🔩)
              </button>
              <button
                type="button"
                onClick={() => handleSell(selectedItem)}
                disabled={busy || selectedItem.equipped}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                판매 (+{formatNumber(getSellReward(selectedItem.grade))}G)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mt-3 w-full rounded-lg py-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
