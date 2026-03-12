"use client";

import Link from "next/link";
import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] shrink-0 z-20">
      {/* Izquierda: hamburger (solo móvil) + logo */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="btn btn-ghost p-2 md:hidden"
          aria-label="Menú"
        >
          <Menu size={20} />
        </button>

        <Link href="/" className="font-bold text-base tracking-tight">
          El Gnomo
        </Link>
      </div>

      {/* Derecha: toggle de tema */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="btn btn-ghost p-2"
        aria-label="Cambiar tema"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
