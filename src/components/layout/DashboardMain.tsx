"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";

export default function DashboardMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className="flex-1 transition-all duration-300 pb-16 md:pb-0"
      style={{
        marginLeft: `clamp(0px, 100vw - 100vw, ${collapsed ? 60 : 240}px)`,
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          main { margin-left: ${collapsed ? 60 : 240}px !important; }
        }
        @media (max-width: 767px) {
          main { margin-left: 0 !important; }
        }
      `}</style>
      {children}
    </main>
  );
}
