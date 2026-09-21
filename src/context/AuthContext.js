"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 확인 중, null = 로그아웃 상태
  const [character, setCharacter] = useState(null);

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
    setCharacter(data ?? null);
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
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchCharacter]);

  const value = {
    session,
    character,
    loading: session === undefined,
    refreshCharacter,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
