"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Plus, Boxes,
  TrendingDown, BookUser, Store, X,
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
      { href: "/finanzas", label: "Finanzas", icon: TrendingDown },
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
  open?:    boolean;
  onClose?: () => void;
};

export default function AppSidebar({ open = false, onClose }: Props) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const expanded = hovered;

  return (
    <>
      {/* DESKTOP — hover para expandir */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="hidden md:flex flex-col shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: expanded ? "13rem" : "3.5rem" }}
      >
        <nav className="p-2 flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden">
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              {/* Label del grupo — sólo visible cuando expandido */}
              <div
                className="overflow-hidden transition-[max-height,opacity] duration-150"
                style={{ maxHeight: expanded ? "2rem" : 0, opacity: expanded ? 1 : 0 }}
              >
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted whitespace-nowrap">
                  {group.label}
                </p>
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = isActive(href, exact);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className={`flex items-center py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap overflow-hidden ${
                        expanded ? "px-3 gap-3" : "justify-center px-0"
                      } ${
                        active
                          ? "bg-[rgb(var(--card-soft))] text-[rgb(var(--text))] font-semibold"
                          : "text-muted hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                      <span
                        className="transition-[opacity] duration-150 overflow-hidden"
                        style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* MÓVIL: slide panel (lo abre BottomNav) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] z-40 flex flex-col transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <span className="font-bold text-sm">El Gnomo</span>
          <button onClick={onClose} className="btn btn-ghost p-1.5" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
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
                          ? "bg-[rgb(var(--card-soft))] text-[rgb(var(--text))] font-semibold"
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
      </aside>
    </>
  );
}
