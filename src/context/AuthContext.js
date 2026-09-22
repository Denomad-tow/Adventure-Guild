"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { simulateIdleProgress } from "@/lib/idleSimulation";
import { formatDuration } from "@/lib/format";
import { maxIdleHours, minAwaySecondsForSummary } from "@/config/balance";
import { regions } from "@/config/regions";
import { fetchEquippedBonuses } from "@/lib/equipmentBonuses";
import { getMySessionId, setMySessionId, createSessionId } from "@/lib/sessionGuard";

const OTHER_LOCATION_MESSAGE = "다른 곳에서 접속하였습니다.";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 확인 중, null = 로그아웃 상태
  const [character, setCharacter] = useState(null);
  const [welcomeSummary, setWelcomeSummary] = useState(null);

  // 방치 보상은 "로그인(진짜로 다시 들어왔을 때)" 기준으로 한 번만 계산해야 한다.
  // 하단 탭을 옮겨다닐 때마다 화면이 다시 켜지는 것과는 구분해야 하므로,
  // 이미 계산을 마친 사용자 id를 기억해뒀다가 같은 로그인에서는 다시 계산하지 않는다.
  const idleCheckedUserIdRef = useRef(null);

  // 로그인 직후에는 "자동 로그인 감지"와 "로그인 화면이 직접 부르는 새로고침"이
  // 거의 동시에 캐릭터 정보를 요청할 수 있다. 따로따로 처리하면 나중에 도착한 쪽이
  // 방치 보상 계산 전의 낡은 정보로 화면을 덮어쓸 수 있으므로, 같은 사용자에 대한
  // 요청이 이미 진행 중이면 새로 시작하지 않고 그 결과를 함께 기다린다.
  const inFlightRef = useRef(null);

  // 로그인/회원가입 하는 바로 그 순간에는, "방금 내가 로그인했다"는 사실과
  // "서버에 세션 표시를 저장하는 것"이 완전히 동시에 끝나지 않을 수 있다.
  // 이때 세션 검사를 그대로 하면, 저장이 끝나기 직전의 낡은 값과 비교해서
  // 방금 로그인한 스스로를 "다른 곳에서 접속함"으로 착각할 수 있으므로,
  // 로그인 이벤트로 인한 조회에서는 이 검사를 건너뛴다.
  const skipSessionCheckRef = useRef(false);

  const fetchCharacterImpl = useCallback(async (userId) => {
    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      setCharacter(null);
      return;
    }

    const localSessionId = getMySessionId();
    if (!data.active_session_id) {
      // 이 계정이 아직 세션 표시가 없다면(이 기능이 생기기 전부터 로그인 중이던 경우),
      // 지금 이 브라우저를 주인으로 등록한다.
      const newSessionId = localSessionId || createSessionId();
      setMySessionId(newSessionId);
      const { error: sessionError } = await supabase
        .from("characters")
        .update({ active_session_id: newSessionId })
        .eq("user_id", userId);
      if (sessionError) {
        console.error("세션 표시 저장 실패:", sessionError.message);
      }
      data.active_session_id = newSessionId;
    } else if (!skipSessionCheckRef.current && localSessionId !== data.active_session_id) {
      // 다른 곳에서 로그인해서 이 브라우저는 밀려났다.
      await supabase.auth.signOut();
      alert(OTHER_LOCATION_MESSAGE);
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
        const equipBonuses = await fetchEquippedBonuses(userId);
        const result = simulateIdleProgress(baseState, awaySeconds, data.job, enhanceLevel, equipBonuses);
        const updatedProgress = {
          // 강화석처럼 방치 계산이 다루지 않는 값들은 그대로 보존한다.
          ...progress,
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

  const fetchCharacter = useCallback(
    async (userId) => {
      if (!userId) {
        setCharacter(null);
        return;
      }

      if (inFlightRef.current && inFlightRef.current.userId === userId) {
        return inFlightRef.current.promise;
      }

      const promise = fetchCharacterImpl(userId);
      inFlightRef.current = { userId, promise };
      try {
        await promise;
      } finally {
        if (inFlightRef.current?.promise === promise) {
          inFlightRef.current = null;
        }
      }
    },
    [fetchCharacterImpl]
  );

  // 회원가입 직후처럼 로그인 상태가 막 바뀌는 순간에는 리액트에 남아있는
  // session 값이 아직 갱신되지 않았을 수 있다. 그래서 여기서는 그 값을 믿지 않고
  // supabase에 "지금 로그인된 사람이 누구야?"를 직접 다시 물어본다.
  const refreshCharacter = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await fetchCharacter(data.user?.id);
  }, [fetchCharacter]);

  // onAuthStateChange는 구독 시작 시 "지금 로그인 상태가 뭐야"를 즉시 한 번 알려주고,
  // 이후 로그인/로그아웃이 실제로 일어날 때마다 다시 알려준다.
  // getSession()을 따로 또 부르면 이 콜백과 동시에 fetchCharacter가 두 번 실행돼서
  // 방치 보상 계산이 꼬일 수 있으므로(경쟁 상태), 여기 하나로만 통일한다.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN") {
        skipSessionCheckRef.current = true;
      }
      fetchCharacter(newSession?.user?.id).finally(() => {
        skipSessionCheckRef.current = false;
      });
      if (!newSession) {
        idleCheckedUserIdRef.current = null;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchCharacter]);

  // 로그인해 있는 동안, 다른 곳에서 같은 계정으로 로그인하면 실시간으로 알림받는다.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`character-session-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "characters", filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log("[세션 감시] 변경 감지:", payload.new.active_session_id, "내 세션:", getMySessionId());
          const incomingSessionId = payload.new.active_session_id;
          const localSessionId = getMySessionId();
          if (incomingSessionId && localSessionId && incomingSessionId !== localSessionId) {
            supabase.auth.signOut().then(() => {
              alert(OTHER_LOCATION_MESSAGE);
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[세션 감시] 채널 상태:", status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

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
