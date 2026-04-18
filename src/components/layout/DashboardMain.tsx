"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";

export default function DashboardMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className="flex-1 transition-all duration-300"
      style={{ marginLeft: collapsed ? 60 : 240 }}
    >
      {children}
    </main>
  );
}
