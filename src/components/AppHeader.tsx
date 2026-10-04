"use client";

import Link from "next/link";
import { Moon, Sun, Lock, LockOpen } from "lucide-react";
import { useProfitLock } from "./ProfitLock";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { unlocked, requestUnlock, lock } = useProfitLock();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] shrink-0 z-20">
      <Link href="/" className="font-bold text-base tracking-tight">
        El Gnomo
      </Link>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={unlocked ? lock : requestUnlock}
          className="btn btn-ghost p-2"
          aria-label={unlocked ? "Ocultar ganancias" : "Ver ganancias"}
          title={unlocked ? "Ocultar ganancias" : "Ver ganancias"}
        >
          {unlocked ? <LockOpen size={18} /> : <Lock size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="btn btn-ghost p-2"
          aria-label="Cambiar tema"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
