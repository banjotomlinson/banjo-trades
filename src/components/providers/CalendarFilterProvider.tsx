"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTradingMode, type TradingMode } from "./TradingModeProvider";

// Each trading mode has a default set of currencies whose news actually
// moves its instruments. Picking a mode resets the calendar filter to
// these — the user can still widen/narrow manually afterward.
const MODE_CURRENCY_DEFAULTS: Record<TradingMode, "all" | string[]> = {
  all: "all",
  futures: ["US"],            // NQ/ES/YM/RTY — US equity indices
  commodities: ["US"],        // USD-priced globally; Fed/CPI dominate
  crypto: ["US"],             // BTC/ETH correlate w/ USD liquidity
  forex: ["US", "EU", "JP", "GB", "CH", "CA", "AU", "NZ"],
};

// Shared currency filter for the economic calendar. Lives at dashboard
// scope so the countdown on the home page can read the same selection
// the user picked on the /calendar page.
//
// Internally stored as a sorted string[] (or "all"). Set<string> isn't
// serializable to localStorage cleanly, so we use arrays and convert to
// Set at read sites.

export type CurrencySelection = "all" | string[];

interface CalendarFilterContext {
  selection: CurrencySelection;
  setSelection: (s: CurrencySelection) => void;
  toggleCurrency: (c: string) => void;
  matches: (country: string) => boolean;
}

const STORAGE_KEY = "banjoCalendarCurrencies";

const Ctx = createContext<CalendarFilterContext>({
  selection: "all",
  setSelection: () => {},
  toggleCurrency: () => {},
  matches: () => true,
});

export function useCalendarFilter() {
  return useContext(Ctx);
}

export default function CalendarFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mode } = useTradingMode();
  const [selection, setSelectionState] = useState<CurrencySelection>("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      if (raw === "all") {
        setSelectionState("all");
        return;
      }
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        setSelectionState(arr as string[]);
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  // When the user *changes* trading modes during a session, reset the
  // calendar filter to that mode's default currencies. We skip the very
  // first pass (prevModeRef null) so the stored selection from previous
  // sessions is preserved on page load rather than clobbered.
  const prevModeRef = useRef<TradingMode | null>(null);
  useEffect(() => {
    if (prevModeRef.current !== null && prevModeRef.current !== mode) {
      const def = MODE_CURRENCY_DEFAULTS[mode];
      setSelectionState(def);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          def === "all" ? "all" : JSON.stringify(def)
        );
      } catch {
        // ignore
      }
    }
    prevModeRef.current = mode;
  }, [mode]);

  const setSelection = useCallback((s: CurrencySelection) => {
    setSelectionState(s);
    try {
      if (s === "all") {
        localStorage.setItem(STORAGE_KEY, "all");
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      }
    } catch {
      // ignore quota/privacy errors
    }
  }, []);

  const toggleCurrency = useCallback(
    (c: string) => {
      setSelectionState((prev) => {
        const next =
          prev === "all"
            ? [c]
            : prev.includes(c)
              ? prev.filter((x) => x !== c)
              : [...prev, c].sort();
        const finalVal: CurrencySelection = next.length === 0 ? "all" : next;
        try {
          if (finalVal === "all") {
            localStorage.setItem(STORAGE_KEY, "all");
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalVal));
          }
        } catch {
          // ignore
        }
        return finalVal;
      });
    },
    []
  );

  const value = useMemo<CalendarFilterContext>(() => {
    const matches = (country: string) =>
      selection === "all" ? true : selection.includes(country);
    return { selection, setSelection, toggleCurrency, matches };
  }, [selection, setSelection, toggleCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
