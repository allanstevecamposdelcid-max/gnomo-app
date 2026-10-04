"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { href: "/contactos",  label: "Contactos",           icon: BookUser },
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

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const linkColor = (active: boolean) => active
    ? "bg-[rgb(var(--card-soft))] text-[rgb(var(--text))] font-semibold"
    : "text-muted hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]";

  return (
    <>
      {/* LAPTOP: íconos que se abren al pasar el mouse (encima del contenido, sin moverlo) · PC: siempre abierta */}
      <aside className="hidden lg:block shrink-0 w-16 xl:w-60">
        <nav
          aria-label="Menú principal"
          className="group/side sticky top-14 z-20 h-[calc(100dvh-3.5rem)] w-16 hover:w-60 xl:w-60 overflow-y-auto overflow-x-hidden p-2 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-[width,box-shadow] duration-200 ease-out hover:shadow-xl xl:hover:shadow-none"
        >
          {groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="h-7 px-[15px] pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted whitespace-nowrap opacity-0 group-hover/side:opacity-100 xl:opacity-100 transition-opacity">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon, exact }) => (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex items-center gap-3 h-10 px-[15px] rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${linkColor(isActive(href, exact))}`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="opacity-0 group-hover/side:opacity-100 xl:opacity-100 transition-opacity">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* CELULAR / TABLET: menú deslizable (lo abre "Menú" en la barra inferior) */}
      <div className={`lg:hidden fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`} inert={!open}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          aria-label="Menú"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[rgb(var(--border))]">
            <span className="font-bold">El Gnomo</span>
            <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Cerrar menú">
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {group.label}
                </p>
                {group.items.map(({ href, label, icon: Icon, exact }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 h-11 px-3 rounded-lg text-[15px] font-medium transition-colors ${linkColor(isActive(href, exact))}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
