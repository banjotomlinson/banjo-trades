"use client";

import { useEffect, useState } from "react";

// Reads the user's selected timezone from localStorage (`banjoTZ`),
// written by MarketClocks. Falls back to the browser's resolved zone.
//
// Components subscribe via `useTimezone()`; updates flow when:
//   - another tab changes localStorage (native `storage` event)
//   - the same tab dispatches `traderm8:tz:change` (we fire it from
//     MarketClocks after writing localStorage)

const KEY = "banjoTZ";
const EVENT = "traderm8:tz:change";

function readTz(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return stored;
  } catch {
    // ignore quota / privacy mode
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function useTimezone(): string {
  // Default to the resolved system TZ on first render so SSR + first
  // client paint don't disagree wildly. The localStorage value is read
  // in the effect.
  const [tz, setTz] = useState<string>(() => {
    if (typeof window === "undefined") return "UTC";
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });

  useEffect(() => {
    setTz(readTz());
    const onChange = () => setTz(readTz());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  return tz;
}

export function emitTimezoneChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}
