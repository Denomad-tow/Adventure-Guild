"use client";

import { useAuth } from "@/context/AuthContext";
import { getJob } from "@/config/jobs";

export default function AdventurePage() {
  const { character } = useAuth();
  const job = character ? getJob(character.job) : null;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl">{job?.emoji ?? "⚔️"}</span>
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">
        {character ? `${character.nickname}님, 환영합니다!` : "모험"}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {job ? `직업: ${job.label} · Lv.${character.level}` : "캐릭터 정보를 불러오는 중..."}
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        여기에 자동 전투, 방치 보상, 돌발 이벤트가 표시될 예정입니다.
      </p>
    </div>
  );
}
