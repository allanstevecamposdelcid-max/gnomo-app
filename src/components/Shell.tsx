"use client";

import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import BottomNav from "./BottomNav";
import { ProfitLockProvider } from "./ProfitLock";

/*
  El menú cambia según el ancho de la pantalla:
  - Celular y tablet (< 1024px): barra inferior + menú lateral deslizable ("Menú")
  - Laptop (1024–1279px): barra lateral de íconos que se abre al pasar el mouse
  - PC (≥ 1280px): barra lateral completa con nombres
*/
export default function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Con el menú abierto: sin scroll de fondo y se cierra con Escape
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <ProfitLockProvider>
      <AppHeader />

      <div className="flex">
        <AppSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="flex-1 min-w-0 px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav onMenuClick={() => setMenuOpen(v => !v)} />
    </ProfitLockProvider>
  );
}
