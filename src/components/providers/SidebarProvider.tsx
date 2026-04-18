"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContext {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = createContext<SidebarContext>({ collapsed: true, toggle: () => {} });

export function useSidebar() {
  return useContext(Ctx);
}

export default function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("banjoSidebarCollapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("banjoSidebarCollapsed", String(next));
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}
