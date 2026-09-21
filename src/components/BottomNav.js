"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/navItems";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white
                 pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-black"
    >
      <div className="mx-auto flex max-w-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs
                ${
                  isActive
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
