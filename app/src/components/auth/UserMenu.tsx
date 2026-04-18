"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!user) return null;

  const avatar = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-8 h-8 rounded-full border border-[#334155]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-sm font-bold">
            {(name || "?")[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-[#111827] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b]">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-[#64748b] truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-white/[0.04] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
