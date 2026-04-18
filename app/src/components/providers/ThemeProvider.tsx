"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type ThemeColors,
  PRESETS,
  STORAGE_KEY,
  applyThemeToDOM,
  dbRowToThemeColors,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeColors;
  setTheme: (colors: ThemeColors) => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: PRESETS.default.colors,
  setTheme: () => {},
  loaded: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColors>(PRESETS.default.colors);
  const [loaded, setLoaded] = useState(false);

  // On mount: try localStorage first for instant paint, then fetch from Supabase
  useEffect(() => {
    // 1. Instant restore from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ThemeColors>;
        const merged = { ...PRESETS.default.colors, ...parsed };
        setThemeState(merged);
        applyThemeToDOM(merged);
      }
    } catch {
      // ignore
    }

    // 2. Fetch from Supabase (authoritative source)
    fetch("/api/theme")
      .then((res) => res.json())
      .then((data) => {
        if (data.theme) {
          const colors = dbRowToThemeColors(data.theme);
          // Also pull text/num/textDim from the detected preset if it matches
          const presetName = data.theme.preset;
          if (presetName && presetName in PRESETS) {
            const preset = PRESETS[presetName as keyof typeof PRESETS];
            colors.text = preset.colors.text;
            colors.textDim = preset.colors.textDim;
            colors.num = preset.colors.num;
            colors.high = preset.colors.high;
          }
          setThemeState(colors);
          applyThemeToDOM(colors);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
        }
      })
      .catch(() => {
        // Offline or not logged in, localStorage theme is fine
      })
      .finally(() => setLoaded(true));
  }, []);

  const setTheme = useCallback((colors: ThemeColors) => {
    setThemeState(colors);
    applyThemeToDOM(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}
