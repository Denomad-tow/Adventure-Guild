"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import {
  equipmentSlots,
  grades,
  getGrade,
  getSlot,
  getOptionType,
  getGradeIndex,
  getDisassembleReward,
  getSellReward,
} from "@/config/equipment";

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
  }, [character?.user_id]);

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
    await supabase.from("equipment").delete().eq("id", item.id);
    await updateProgress({ enhancementStones: stones + getDisassembleReward(item.grade) });
    await loadItems(character.user_id);
    setSelectedId(null);
    setBusy(false);
  }

  async function handleSell(item) {
    if (item.equipped) return;
    setBusy(true);
    await supabase.from("equipment").delete().eq("id", item.id);
    await updateProgress({ gold: gold + getSellReward(item.grade) });
    await loadItems(character.user_id);
    setSelectedId(null);
    setBusy(false);
  }

  async function handleBulkDisassemble() {
    if (bulkTargets.length === 0) return;
    setBulkBusy(true);
    await supabase
      .from("equipment")
      .delete()
      .in("id", bulkTargets.map((item) => item.id));
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
        <h2 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">장착 중</h2>
        <div className="grid grid-cols-3 gap-2">
          {equipmentSlots.map((slot) => {
            const item = equippedBySlot[slot.id];
            const grade = item ? getGrade(item.grade) : null;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => item && setSelectedId(item.id)}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2"
                style={{
                  borderColor: grade ? grade.color : "rgba(161,161,170,0.35)",
                  borderStyle: grade ? "solid" : "dashed",
                  background: grade ? `${grade.color}1a` : "transparent",
                }}
              >
                <span className="text-2xl">{slot.emoji}</span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {grade ? grade.label : slot.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
                  <span className="text-2xl">{slot.emoji}</span>
                  <span className="text-[10px] font-medium" style={{ color: grade.color }}>
                    {grade.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        재료, 펫은 다음 단계들에서 추가될 예정입니다.
      </p>

      {/* 선택한 장비 상세 정보 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{getSlot(selectedItem.slot).emoji}</span>
              <div>
                <p className="text-base font-bold" style={{ color: getGrade(selectedItem.grade).color }}>
                  {getGrade(selectedItem.grade).label} {getSlot(selectedItem.slot).label}
                </p>
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

            <div className="mt-4 flex gap-2">
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
