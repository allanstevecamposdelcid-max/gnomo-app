"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  BarChart3,
  Boxes,
  Plus,
  Truck,
} from "lucide-react";

const items = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/ventas",
    label: "Ventas",
    icon: ShoppingCart,
  },

  {
    href: "/ventas/nueva", 
    label: "Nueva venta",
    icon: Plus,
  },

    {
    href: "/inventario", 
    label: "Inventario",
    icon: Boxes,
  },
  {
    href: "/caja",
    label: "Caja",
    icon: Wallet,
  },
  {
    href: "/graficas",
    label: "Gráficas",
    icon: BarChart3,
  },
  {
  href: "https://trackingt.github.io/order-tracking/admin.html",
  label: "Seguimiento pedidos",
  icon: Truck,
  external: true,
},

];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-56 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      <nav className="p-4 space-y-1">
{items.map(({ href, label, icon: Icon, external }) => {
  const active =
    !external &&
    (pathname === href || pathname.startsWith(href + "/"));

  const className = `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition
    ${
      active
        ? "bg-green-500/15 text-green-400"
        : "hover:bg-white/5 text-muted"
    }
  `;

  if (external) {
    return (
      <a
        key={label}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon size={18} />
        {label}
      </a>
    );
  }

  return (
    <Link key={href} href={href} className={className}>
      <Icon size={18} />
      {label}
    </Link>
  );
})}

      </nav>
    </aside>
  );
}
