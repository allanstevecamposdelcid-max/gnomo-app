"use client";

import Link from "next/link";
import { Moon, Sun, Lock, LockOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useProfitLock } from "./ProfitLock";

export default function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const { unlocked, requestUnlock, lock } = useProfitLock();

  // El tema solo se conoce en el navegador. La barra se muestra desde el inicio
  // (sin saltos de la página) y solo el ícono del tema espera a cargar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-[rgb(var(--border))] bg-[rgb(var(--card)/0.92)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="h-14 flex items-center justify-between px-4 lg:px-5">
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
            title="Cambiar tema"
          >
            {!mounted ? <span className="block w-[18px] h-[18px]" /> : isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
