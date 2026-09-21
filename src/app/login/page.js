"use client";

import { useState } from "react";
import { jobs } from "@/config/jobs";
import { signInWithNickname, signUpWithNickname } from "@/lib/nicknameAuth";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { refreshCharacter } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [jobId, setJobId] = useState(jobs[0].id);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nickname.trim() || !password) {
      setError("닉네임과 비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    const result =
      mode === "signup"
        ? await signUpWithNickname({ nickname, password, jobId })
        : await signInWithNickname({ nickname, password });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshCharacter();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
          모험가 길드
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "login" ? "다시 만나서 반가워요!" : "새로운 모험가를 만들어보세요"}
        </p>
      </div>

      <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "login"
              ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-2 text-sm font-medium ${
            mode === "signup"
              ? "bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500"
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="모험가 이름"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              직업 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {jobs.map((job) => (
                <button
                  type="button"
                  key={job.id}
                  onClick={() => setJobId(job.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center ${
                    jobId === job.id
                      ? "border-zinc-950 bg-zinc-50 dark:border-white dark:bg-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <span className="text-2xl">{job.emoji}</span>
                  <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                    {job.label}
                  </span>
                  <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {job.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-zinc-950 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
        >
          {submitting ? "처리 중..." : mode === "login" ? "로그인" : "가입하고 시작하기"}
        </button>
      </form>
    </div>
  );
}
