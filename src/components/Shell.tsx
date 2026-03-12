"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import BottomNav from "./BottomNav";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <AppHeader />

      <div className="flex flex-1 min-h-0">
        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 lg:p-8">
          {children}
        </main>
      </div>

      <BottomNav onMenuClick={() => setSidebarOpen(v => !v)} />
    </>
  );
}
