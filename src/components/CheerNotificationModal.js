"use client";

export default function CheerNotificationModal({ cheers, onClose }) {
  if (!cheers || cheers.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center dark:bg-zinc-900">
        <p className="text-3xl">📣</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-white">응원이 도착했어요!</h2>
        <div className="mt-3 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
          {cheers.map((cheer) => (
            <p key={cheer.id}>{cheer.sender_nickname}님이 응원을 보냈습니다!</p>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">1시간 동안 공격력이 올라갑니다.</p>
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
