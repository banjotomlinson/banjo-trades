"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { migrateLocalStorageToSupabase } from "@/lib/migrateLocalStorage";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  sidebar_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileContextValue {
  profile: Profile | null;
  loaded: boolean;
  updateProfile: (fields: Partial<Profile>) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loaded: false,
  updateProfile: () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export default function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then(async (data) => {
        if (data.profile) {
          setProfile(data.profile);

          const supabase = createClient();
          await migrateLocalStorageToSupabase(supabase);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateProfile = useCallback(
    (fields: Partial<Profile>) => {
      setProfile((prev) => (prev ? { ...prev, ...fields } : prev));

      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      }).catch(() => {});
    },
    []
  );

  return (
    <ProfileContext.Provider value={{ profile, loaded, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}
