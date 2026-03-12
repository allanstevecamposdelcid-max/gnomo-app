"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  Boxes,
  Wallet,
  BarChart3,
  AlertTriangle,
  Receipt,
  BookUser,
  X,
} from "lucide-react";

const groups = [
  {
    label: "Principal",
    items: [
      { href: "/",         label: "Dashboard",    icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/ventas/nueva", label: "Nueva venta",     icon: Plus },
      { href: "/ventas",       label: "Libro de ventas", icon: ShoppingCart, exact: true },
      { href: "/inventario",   label: "Inventario",      icon: Boxes },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/caja",          label: "Caja diaria",        icon: Wallet },
      { href: "/gastos-fijos",  label: "Gastos fijos",       icon: Receipt },
      { href: "/perdidas",      label: "Control pérdidas",   icon: AlertTriangle },
      { href: "/graficas",      label: "Gráficas",           icon: BarChart3 },
    ],
  },
  {
    label: "Directorio",
    items: [
      { href: "/contactos", label: "Contactos", icon: BookUser },
    ],
  },
];

type Props = {
  open?: boolean;
  onClose?: () => void;
};

export default function AppSidebar({ open = false, onClose }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const content = (
    <nav className="p-3 space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-green-500/15 text-green-500"
                      : "text-muted hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ── Desktop: sidebar fijo ── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-y-auto">
        {content}
      </aside>

      {/* ── Móvil: panel deslizante ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] z-40 flex flex-col transition-transform duration-250 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Cabecera del panel */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <span className="font-bold text-sm">El Gnomo</span>
          <button onClick={onClose} className="btn btn-ghost p-1.5" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}
