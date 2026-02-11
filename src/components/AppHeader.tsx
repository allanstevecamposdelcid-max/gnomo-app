"use client";

import Link from "next/link";
import { LayoutDashboard, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <LayoutDashboard size={18} />
        Sistema Contable
      </Link>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="btn card-soft"
        aria-label="Cambiar tema"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
