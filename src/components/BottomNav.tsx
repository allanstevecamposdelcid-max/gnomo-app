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

/* Barra inferior: solo en celular y tablet (< 1024px) */
export default function BottomNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[rgb(var(--border))] bg-[rgb(var(--card)/0.95)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {items.map(({ href, label, icon: Icon, exact, center }) => {
          const active = isActive(href, exact);
          return center ? (
            <div key={href} className="flex justify-center">
              <Link
                href={href}
                className="-mt-4 flex flex-col items-center justify-center gap-0.5 w-16 h-16 rounded-2xl bg-[rgb(var(--text))] text-[rgb(var(--bg))] text-[11px] font-semibold shadow-lg active:scale-95 transition-transform"
              >
                <Icon size={22} />
                <span>{label}</span>
              </Link>
            </div>
          ) : (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-[rgb(var(--text))]" : "text-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted"
        >
          <Menu size={20} />
          <span>Menú</span>
        </button>
      </div>
    </nav>
  );
}
