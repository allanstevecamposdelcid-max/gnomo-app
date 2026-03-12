"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, ShoppingCart, Boxes, Menu } from "lucide-react";

const items = [
  { href: "/",             label: "Inicio",     icon: LayoutDashboard, exact: true },
  { href: "/ventas",       label: "Ventas",     icon: ShoppingCart,    exact: true },
  { href: "/ventas/nueva", label: "Nueva",      icon: Plus,            center: true },
  { href: "/inventario",   label: "Inventario", icon: Boxes },
];

export default function BottomNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-[rgb(var(--card))] border-t border-[rgb(var(--border))]">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map(({ href, label, icon: Icon, exact, center }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors text-[11px] font-medium ${
                center
                  ? "bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-2xl px-4 py-2.5 -mt-4 shadow-lg"
                  : active
                  ? "text-[rgb(var(--text))]"
                  : "text-muted"
              }`}
            >
              <Icon size={center ? 22 : 20} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Botón Menú */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted text-[11px] font-medium transition-colors"
        >
          <Menu size={20} />
          <span>Menú</span>
        </button>
      </div>
    </nav>
  );
}
