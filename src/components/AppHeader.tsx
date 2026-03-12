"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] shrink-0 z-20">
      <Link href="/" className="font-bold text-base tracking-tight">
        El Gnomo
      </Link>

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
