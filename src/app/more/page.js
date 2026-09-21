"use client";

import { useState } from "react";
import { signOut, deleteAccount } from "@/lib/nicknameAuth";
import TabPlaceholder from "@/components/TabPlaceholder";

export default function MorePage() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function openConfirm() {
    setError("");
    setPassword("");
    setConfirming(true);
  }

  function cancelConfirm() {
    setConfirming(false);
    setPassword("");
    setError("");
  }

  async function handleConfirmDelete(e) {
    e.preventDefault();
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setDeleting(true);
    const result = await deleteAccount(password);
    setDeleting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div>
      <TabPlaceholder
        emoji="☰"
        title="더보기"
        description="여기에 퀘스트, 도감, 업적, 칭호, 연대기, 설정이 표시될 예정입니다."
      />
      <div className="flex flex-col gap-3 px-6">
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full rounded-lg border border-zinc-300 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          로그아웃
        </button>

        {!confirming && (
          <button
            type="button"
            onClick={openConfirm}
            className="w-full rounded-lg border border-red-300 py-3 text-sm font-medium text-red-500 dark:border-red-900"
          >
            회원 탈퇴
          </button>
        )}

        {confirming && (
          <form
            onSubmit={handleConfirmDelete}
            className="flex flex-col gap-2 rounded-lg border border-red-300 p-4 dark:border-red-900"
          >
            <p className="text-sm font-medium text-red-500">
              탈퇴하면 캐릭터 정보가 모두 삭제되며 되돌릴 수 없습니다.
              계속하려면 비밀번호를 입력하세요.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelConfirm}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
