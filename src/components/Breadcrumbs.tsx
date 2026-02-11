"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  ventas: "Ventas",
  nueva: "Nueva",
  caja: "Caja",
  graficas: "Gráficas",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  let href = "";

  return (
    <nav className="flex items-center gap-1 text-sm opacity-70">
      <Link href="/" className="hover:underline">
        Dashboard
      </Link>

      {segments.map((segment, index) => {
        href += `/${segment}`;
        const label = LABELS[segment] ?? segment;

        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={14} />
            {index === segments.length - 1 ? (
              <span className="font-medium opacity-100">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:underline"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
