"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Plus, Boxes,
  Wallet, TrendingDown, BookUser, Store, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const groups = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
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
      { href: "/caja",     label: "Caja diaria", icon: Wallet },
      { href: "/finanzas", label: "Finanzas",    icon: TrendingDown },
    ],
  },
  {
    label: "Directorio",
    items: [
      { href: "/contactos",  label: "Contactos",          icon: BookUser },
      { href: "/vendedores", label: "Vendedores terceros", icon: Store    },
    ],
  },
];

type Props = {
  open?:       boolean;
  onClose?:    () => void;
  collapsed?:  boolean;
  onToggle?:   () => void;
};

export default function AppSidebar({ open = false, onClose, collapsed = false, onToggle }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  /* ── desktop: sidebar colapsado (solo iconos) ── */
  const desktopCollapsed = (
    <aside className="hidden md:flex flex-col w-14 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-y-auto">
      <nav className="p-2 flex flex-col gap-0.5 flex-1">
        {groups.flatMap(g => g.items).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} title={label}
              className={`flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                active
                  ? "bg-green-500/15 text-green-500"
                  : "text-muted hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
              }`}>
              <Icon size={18} />
            </Link>
          );
        })}
      </nav>
      {/* toggle expand */}
      <button
        onClick={onToggle}
        title="Expandir menú"
        className="flex items-center justify-center py-3 border-t border-[rgb(var(--border))] text-muted hover:text-[rgb(var(--text))] transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </aside>
  );

  /* ── desktop: sidebar expandido ── */
  const navContent = (
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
                <Link key={href} href={href} onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-green-500/15 text-green-500"
                      : "text-muted hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
                  }`}>
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

  const desktopExpanded = (
    <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-y-auto">
      <div className="flex-1 overflow-y-auto">{navContent}</div>
      {/* toggle collapse */}
      <button
        onClick={onToggle}
        title="Minimizar menú"
        className="flex items-center justify-center py-3 border-t border-[rgb(var(--border))] text-muted hover:text-[rgb(var(--text))] transition-colors gap-2 text-xs"
      >
        <ChevronLeft size={14} /> Minimizar
      </button>
    </aside>
  );

  return (
    <>
      {/* DESKTOP */}
      {collapsed ? desktopCollapsed : desktopExpanded}

      {/* MÓVIL: slide panel (sin hamburguesa en header, lo abre BottomNav) */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] z-40 flex flex-col transition-transform duration-250 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <span className="font-bold text-sm">El Gnomo</span>
          <button onClick={onClose} className="btn btn-ghost p-1.5" aria-label="Cerrar menú"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">{navContent}</div>
      </aside>
    </>
  );
}
