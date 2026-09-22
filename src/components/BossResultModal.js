"use client";

import { formatNumber } from "@/lib/format";

export default function BossResultModal({ result, onClose }) {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center dark:bg-zinc-900">
        <p className="text-3xl">{result.bossEmoji}</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-white">
          {result.bossName} 처치!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {result.storyLine}
        </p>

        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">획득 골드</span>
            <span className="font-semibold text-amber-500">{formatNumber(result.gold)} G</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">획득 경험치</span>
            <span className="font-semibold text-sky-500">{formatNumber(result.exp)}</span>
          </div>
        </div>

        {result.justUnlockedNext && (
          <p className="mt-3 text-sm font-semibold text-emerald-500">
            새로운 지역이 열렸습니다!
          </p>
        )}

        {result.mercenary && (
          <p className="mt-3 text-sm font-semibold text-sky-500">
            🤝 {result.mercenary.nickname}님을 용병으로 데려가서 보상 +{result.mercenary.rewardBonusPercent}%!
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-zinc-950 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
        >
          확인
        </button>
      </div>
    </div>
  );
}
