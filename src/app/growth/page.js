"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getJob } from "@/config/jobs";
import { supabase } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/format";
import {
  getTotalAttack,
  getEnhanceAttackBonus,
  getEnhanceTotalCost,
  enhanceBatchOptions,
} from "@/config/balance";

export default function GrowthPage() {
  const { character, refreshCharacter } = useAuth();
  const job = character ? getJob(character.job) : null;
  const [count, setCount] = useState(enhanceBatchOptions[0]);
  const [enhancing, setEnhancing] = useState(false);
  const enhancingRef = useRef(false);

  if (!character || !job) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        캐릭터 정보를 불러오는 중...
      </div>
    );
  }

  const progress = character.progress ?? {};
  const gold = progress.gold ?? 0;
  const enhanceLevel = progress.enhanceLevel ?? 0;
  const totalCost = getEnhanceTotalCost(enhanceLevel, count);
  const currentAttack = getTotalAttack(character.job, character.level, enhanceLevel);
  const nextAttack = getTotalAttack(character.job, character.level, enhanceLevel + count);
  const canAfford = gold >= totalCost;

  async function handleEnhance() {
    // 응답이 오기 전에 버튼이 한 번 더 눌리는 걸 확실히 막는다 (ref는 즉시 반영되어 중복 클릭에 안전함).
    if (enhancingRef.current || !canAfford) return;
    enhancingRef.current = true;
    setEnhancing(true);

    await supabase
      .from("characters")
      .update({
        progress: {
          ...progress,
          gold: gold - totalCost,
          enhanceLevel: enhanceLevel + count,
        },
      })
      .eq("user_id", character.user_id);

    await refreshCharacter();
    enhancingRef.current = false;
    setEnhancing(false);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{job.emoji}</span>
        <div>
          <p className="font-semibold text-zinc-950 dark:text-white">
            {character.nickname} · Lv.{character.level}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {job.label} · 강화 +{enhanceLevel}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">공격력 강화</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          골드를 써서 공격력을 영구적으로 올립니다. 강화할수록 다음 비용이 비싸집니다.
        </p>

        <div className="mt-4 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {enhanceBatchOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCount(option)}
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                count === option
                  ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-500"
              }`}
            >
              {option}강화
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">현재 공격력</span>
          <span className="font-semibold text-zinc-950 dark:text-white">
            {formatNumber(currentAttack)}
            <span className="ml-1 text-xs font-normal text-emerald-500">
              (강화 보너스 +{formatNumber(getEnhanceAttackBonus(enhanceLevel))})
            </span>
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
          <span className="text-zinc-500 dark:text-zinc-400">{count}강화하면</span>
          <span className="font-semibold text-sky-500">{formatNumber(nextAttack)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">보유 골드</span>
          <span className="font-semibold text-amber-500">{formatNumber(gold)} G</span>
        </div>

        <button
          type="button"
          onClick={handleEnhance}
          disabled={enhancing || !canAfford}
          className="mt-4 w-full rounded-lg bg-zinc-950 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
        >
          {enhancing ? "강화 중..." : `${formatNumber(totalCost)} G로 ${count}강화하기`}
        </button>

        {!canAfford && (
          <p className="mt-2 text-center text-sm text-red-500">
            골드가 부족합니다. (필요: {formatNumber(totalCost)} G)
          </p>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        스킬, 특성, 전직, 환생은 다음 단계들에서 추가될 예정입니다.
      </p>
    </div>
  );
}
