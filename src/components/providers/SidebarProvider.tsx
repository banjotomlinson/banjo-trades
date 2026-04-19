"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useProfile } from "@/components/providers/ProfileProvider";

interface SidebarContext {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = createContext<SidebarContext>({ collapsed: true, toggle: () => {} });

export function useSidebar() {
  return useContext(Ctx);
}

export default function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile, loaded } = useProfile();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!loaded || !profile) return;
    setCollapsed(profile.sidebar_collapsed ?? true);
  }, [loaded, profile]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      updateProfile({ sidebar_collapsed: next });
      return next;
    });
  }, [updateProfile]);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}
