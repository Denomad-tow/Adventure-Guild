"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/navItems";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-900/10 bg-[var(--panel)]/95
                 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur pb-[env(safe-area-inset-bottom)]
                 dark:border-amber-400/10"
    >
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors
                ${
                  isActive
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-500 dark:bg-amber-400" />
              )}
              <span className={`text-xl transition-transform ${isActive ? "scale-110" : ""}`}>{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
