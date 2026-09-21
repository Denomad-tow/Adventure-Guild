"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

export default function AuthGate({ children }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!session && !isLoginPage) {
      router.replace("/login");
    }
    if (session && isLoginPage) {
      router.replace("/");
    }
  }, [loading, session, isLoginPage, router]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-zinc-400">
        불러오는 중...
      </div>
    );
  }

  if (!session) {
    // 로그인 화면만 그대로 보여주고, 그 외 화면은 위 useEffect가 /login으로 보낼 때까지 잠시 비운다.
    return isLoginPage ? children : null;
  }

  if (isLoginPage) {
    return null;
  }

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
