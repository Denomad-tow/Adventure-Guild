"use client";

import { formatNumber } from "@/lib/format";

export default function WelcomeBackModal({ summary, onClose }) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center dark:bg-zinc-900">
        <p className="text-3xl">🎒</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-white">다녀오셨군요!</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {summary.awayText} 동안 자리를 비우신 사이, 모험이 계속됐어요.
        </p>

        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">처치한 몬스터</span>
            <span className="font-semibold text-zinc-950 dark:text-white">
              {formatNumber(summary.killsGained)}마리
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">획득 골드</span>
            <span className="font-semibold text-amber-500">{formatNumber(summary.goldGained)} G</span>
          </div>
          {summary.levelsGained > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">레벨업</span>
              <span className="font-semibold text-sky-500">
                Lv.{summary.leveledFrom} → Lv.{summary.leveledTo}
              </span>
            </div>
          )}
        </div>

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
