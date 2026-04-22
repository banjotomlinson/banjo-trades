"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type TradingMode = "all" | "futures" | "commodities" | "forex" | "crypto";

export const TRADING_MODES: { key: TradingMode; label: string; icon: string }[] = [
  { key: "all", label: "All Markets", icon: "▣" },
  { key: "futures", label: "Index Futures", icon: "▲" },
  { key: "commodities", label: "Commodities", icon: "⚒" },
  { key: "forex", label: "Forex", icon: "¤" },
  { key: "crypto", label: "Crypto", icon: "₿" },
];

interface TradingModeContext {
  mode: TradingMode;
  setMode: (m: TradingMode) => void;
  modeLabel: string;
  modeIcon: string;
}

const STORAGE_KEY = "banjoTradingMode";

const Ctx = createContext<TradingModeContext>({
  mode: "all",
  setMode: () => {},
  modeLabel: "All Markets",
  modeIcon: "▣",
});

export function useTradingMode() {
  return useContext(Ctx);
}

export default function TradingModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<TradingMode>("all");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as TradingMode | null;
    if (stored && TRADING_MODES.some((m) => m.key === stored)) {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((m: TradingMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const current = TRADING_MODES.find((m) => m.key === mode) ?? TRADING_MODES[0];

  return (
    <Ctx.Provider
      value={{
        mode,
        setMode,
        modeLabel: current.label,
        modeIcon: current.icon,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
