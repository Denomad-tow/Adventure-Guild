"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { simulateIdleProgress } from "@/lib/idleSimulation";
import { formatDuration } from "@/lib/format";
import { maxIdleHours, minAwaySecondsForSummary } from "@/config/balance";
import { regions } from "@/config/regions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 확인 중, null = 로그아웃 상태
  const [character, setCharacter] = useState(null);
  const [welcomeSummary, setWelcomeSummary] = useState(null);

  // 방치 보상은 "로그인(진짜로 다시 들어왔을 때)" 기준으로 한 번만 계산해야 한다.
  // 하단 탭을 옮겨다닐 때마다 화면이 다시 켜지는 것과는 구분해야 하므로,
  // 이미 계산을 마친 사용자 id를 기억해뒀다가 같은 로그인에서는 다시 계산하지 않는다.
  const idleCheckedUserIdRef = useRef(null);

  const fetchCharacter = useCallback(async (userId) => {
    if (!userId) {
      setCharacter(null);
      return;
    }

    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      setCharacter(null);
      return;
    }

    if (idleCheckedUserIdRef.current !== userId) {
      idleCheckedUserIdRef.current = userId;

      const progress = data.progress ?? {};
      const lastActiveAt = progress.lastActiveAt ? new Date(progress.lastActiveAt).getTime() : null;
      const elapsedSeconds = lastActiveAt ? Math.floor((Date.now() - lastActiveAt) / 1000) : 0;
      const awaySeconds = Math.min(elapsedSeconds, maxIdleHours * 3600);

      if (awaySeconds >= minAwaySecondsForSummary) {
        const enhanceLevel = progress.enhanceLevel ?? 0;
        const regionIndex = progress.regionIndex ?? 0;
        const regionStage = progress.regionStage ?? regions.map(() => 1);
        const unlockedRegionIndex = progress.unlockedRegionIndex ?? 0;
        const baseState = {
          level: data.level ?? 1,
          exp: progress.exp ?? 0,
          gold: progress.gold ?? 0,
          regionIndex,
          stage: regionStage[regionIndex] ?? 1,
          killIndexInStage: 0, // 스테이지 안에서 몇 마리 잡았는지는 방치 중엔 기억하지 않는다 (사소한 단순화)
          regionStage: [...regionStage],
        };
        const result = simulateIdleProgress(baseState, awaySeconds, data.job, enhanceLevel);
        const updatedProgress = {
          exp: result.exp,
          gold: result.gold,
          enhanceLevel,
          regionIndex: result.regionIndex,
          regionStage: result.regionStage,
          unlockedRegionIndex,
          lastActiveAt: new Date().toISOString(),
        };

        await supabase
          .from("characters")
          .update({ level: result.level, progress: updatedProgress })
          .eq("user_id", userId);

        setWelcomeSummary({
          awayText: formatDuration(awaySeconds),
          killsGained: result.killsGained,
          goldGained: result.goldGained,
          levelsGained: result.levelsGained,
          leveledFrom: result.leveledFrom,
          leveledTo: result.leveledTo,
        });

        setCharacter({ ...data, level: result.level, progress: updatedProgress });
        return;
      }
    }

    setCharacter(data);
  }, []);

  // 회원가입 직후처럼 로그인 상태가 막 바뀌는 순간에는 리액트에 남아있는
  // session 값이 아직 갱신되지 않았을 수 있다. 그래서 여기서는 그 값을 믿지 않고
  // supabase에 "지금 로그인된 사람이 누구야?"를 직접 다시 물어본다.
  const refreshCharacter = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await fetchCharacter(data.user?.id);
  }, [fetchCharacter]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      fetchCharacter(data.session?.user?.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      fetchCharacter(newSession?.user?.id);
      if (!newSession) {
        idleCheckedUserIdRef.current = null;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchCharacter]);

  const value = {
    session,
    character,
    loading: session === undefined,
    refreshCharacter,
    welcomeSummary,
    clearWelcomeSummary: () => setWelcomeSummary(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
