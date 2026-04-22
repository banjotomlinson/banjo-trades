"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AssetClass = "futures" | "commodities" | "crypto" | "forex";
type ActiveTab = "all" | AssetClass;

interface Instrument {
  symbol: string;
  name: string;
  sub: string;
  decimals: number;
  assetClass: AssetClass;
}

const ASSET_CLASSES: { key: ActiveTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "futures", label: "Futures" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
];

const INSTRUMENTS: Record<AssetClass, Instrument[]> = {
  futures: [
    { symbol: "NQ=F", name: "NASDAQ 100", sub: "NQ Futures", decimals: 2, assetClass: "futures" },
    { symbol: "ES=F", name: "S&P 500", sub: "ES Futures", decimals: 2, assetClass: "futures" },
    { symbol: "YM=F", name: "Dow Jones", sub: "YM Futures", decimals: 2, assetClass: "futures" },
    { symbol: "RTY=F", name: "Russell 2000", sub: "RTY Futures", decimals: 2, assetClass: "futures" },
  ],
  commodities: [
    { symbol: "GC=F", name: "Gold", sub: "GC Futures", decimals: 2, assetClass: "commodities" },
    { symbol: "SI=F", name: "Silver", sub: "SI Futures", decimals: 3, assetClass: "commodities" },
    { symbol: "CL=F", name: "Crude Oil", sub: "CL Futures", decimals: 2, assetClass: "commodities" },
    { symbol: "NG=F", name: "Natural Gas", sub: "NG Futures", decimals: 3, assetClass: "commodities" },
    { symbol: "HG=F", name: "Copper", sub: "HG Futures", decimals: 4, assetClass: "commodities" },
    { symbol: "PL=F", name: "Platinum", sub: "PL Futures", decimals: 2, assetClass: "commodities" },
  ],
  crypto: [
    { symbol: "BTC-USD", name: "Bitcoin", sub: "BTC/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "ETH-USD", name: "Ethereum", sub: "ETH/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "SOL-USD", name: "Solana", sub: "SOL/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "BNB-USD", name: "BNB", sub: "BNB/USD", decimals: 2, assetClass: "crypto" },
    { symbol: "XRP-USD", name: "XRP", sub: "XRP/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "ADA-USD", name: "Cardano", sub: "ADA/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "DOGE-USD", name: "Dogecoin", sub: "DOGE/USD", decimals: 4, assetClass: "crypto" },
    { symbol: "DOT-USD", name: "Polkadot", sub: "DOT/USD", decimals: 3, assetClass: "crypto" },
  ],
  forex: [
    { symbol: "EURUSD=X", name: "EUR/USD", sub: "Euro / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "GBPUSD=X", name: "GBP/USD", sub: "Pound / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDJPY=X", name: "USD/JPY", sub: "US Dollar / Yen", decimals: 3, assetClass: "forex" },
    { symbol: "AUDUSD=X", name: "AUD/USD", sub: "Aussie / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDCAD=X", name: "USD/CAD", sub: "US Dollar / Loonie", decimals: 5, assetClass: "forex" },
    { symbol: "NZDUSD=X", name: "NZD/USD", sub: "Kiwi / US Dollar", decimals: 5, assetClass: "forex" },
    { symbol: "USDCHF=X", name: "USD/CHF", sub: "US Dollar / Franc", decimals: 5, assetClass: "forex" },
  ],
};

const ALL_CLASSES: AssetClass[] = ["futures", "commodities", "crypto", "forex"];

const CLASS_BADGE: Record<AssetClass, { label: string; className: string }> = {
  futures: { label: "FUT", className: "bg-amber-500/15 text-amber-400" },
  commodities: { label: "COMM", className: "bg-green-500/15 text-green-400" },
  crypto: { label: "CRYPTO", className: "bg-violet-500/15 text-violet-400" },
  forex: { label: "FX", className: "bg-cyan-500/15 text-cyan-400" },
};

const POLL_MS = 5 * 60 * 1000;

interface Move {
  symbol: string;
  name: string;
  sub: string;
  decimals: number;
  assetClass: AssetClass;
  price: number;
  changePct: number;
  changeAbs: number;
}

async function fetchDailyMove(inst: Instrument): Promise<Move | null> {
  const url = `https://corsproxy.io/?${encodeURIComponent(
    `https://query1.finance.yahoo.com/v8/finance/chart/${inst.symbol}?interval=1d&range=5d`
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const result = json.chart?.result?.[0];
    const closes: (number | null)[] =
      result?.indicators?.quote?.[0]?.close ?? [];
    let last: number | null = null;
    let prev: number | null = null;
    for (let i = closes.length - 1; i >= 0; i--) {
      const v = closes[i];
      if (v == null) continue;
      if (last == null) last = v;
      else {
        prev = v;
        break;
      }
    }
    if (last == null || prev == null || prev === 0) return null;
    return {
      symbol: inst.symbol,
      name: inst.name,
      sub: inst.sub,
      decimals: inst.decimals,
      assetClass: inst.assetClass,
      price: last,
      changePct: ((last - prev) / prev) * 100,
      changeAbs: last - prev,
    };
  } catch {
    return null;
  }
}

function fmt(n: number, d: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function MoversPanel() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [dataByClass, setDataByClass] = useState<Record<AssetClass, Move[]>>({
    futures: [],
    commodities: [],
    crypto: [],
    forex: [],
  });
  const [loadingByClass, setLoadingByClass] = useState<Record<AssetClass, boolean>>({
    futures: true,
    commodities: true,
    crypto: true,
    forex: true,
  });

  const loadClass = useCallback(async (cls: AssetClass) => {
    setLoadingByClass((s) => ({ ...s, [cls]: true }));
    const results = await Promise.all(INSTRUMENTS[cls].map(fetchDailyMove));
    const clean = results.filter((r): r is Move => r !== null);
    setDataByClass((s) => ({ ...s, [cls]: clean }));
    setLoadingByClass((s) => ({ ...s, [cls]: false }));
  }, []);

  // Load the classes the active tab needs, then poll them every 5 minutes.
  useEffect(() => {
    const classes: AssetClass[] =
      activeTab === "all" ? ALL_CLASSES : [activeTab];
    classes.forEach(loadClass);
    const id = setInterval(() => classes.forEach(loadClass), POLL_MS);
    return () => clearInterval(id);
  }, [activeTab, loadClass]);

  const moves = useMemo<Move[]>(() => {
    if (activeTab === "all") {
      return ALL_CLASSES.flatMap((c) => dataByClass[c]);
    }
    return dataByClass[activeTab];
  }, [activeTab, dataByClass]);

  const loading =
    activeTab === "all"
      ? ALL_CLASSES.every((c) => loadingByClass[c] && dataByClass[c].length === 0)
      : loadingByClass[activeTab];

  // Biggest absolute mover for the header card.
  const topMover = useMemo(() => {
    if (moves.length === 0) return null;
    return [...moves].sort(
      (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
    )[0];
  }, [moves]);

  // Full list, sorted by absolute move desc.
  const sortedMoves = useMemo(
    () =>
      [...moves].sort(
        (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
      ),
    [moves]
  );

  const topPositive = topMover ? topMover.changePct >= 0 : true;
  const topColor = topPositive ? "text-green-500" : "text-red-500";
  const topBg = topPositive
    ? "from-green-500/10 to-transparent"
    : "from-red-500/10 to-transparent";
  const arrow = topPositive ? "▲" : "▼";

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Header + class tabs */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-[#f1f5f9]">
          Market Movers
        </h2>
        <div className="flex gap-1 bg-[#0f172a] rounded-lg p-1 border border-[#1e293b] flex-wrap">
          {ASSET_CLASSES.map((ac) => (
            <button
              key={ac.key}
              onClick={() => setActiveTab(ac.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === ac.key
                  ? "bg-accent text-white"
                  : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {ac.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Mover card */}
      <div
        className={`relative px-6 py-5 border-b border-[#1e293b] bg-gradient-to-r ${topBg}`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-2">
          {activeTab === "all"
            ? "Top Mover of the Day"
            : `${ASSET_CLASSES.find((a) => a.key === activeTab)?.label} of the Day`}
        </div>
        {loading && !topMover ? (
          <div className="text-[#64748b] text-sm">Loading...</div>
        ) : topMover ? (
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-2xl font-bold text-white">
                  {topMover.name}
                </div>
                {activeTab === "all" && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CLASS_BADGE[topMover.assetClass].className}`}
                  >
                    {CLASS_BADGE[topMover.assetClass].label}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#64748b] mt-0.5">{topMover.sub}</div>
            </div>
            <div className="text-right">
              <div className={`text-[32px] font-black tabular-nums leading-none ${topColor}`}>
                {arrow} {topPositive ? "+" : ""}
                {topMover.changePct.toFixed(2)}%
              </div>
              <div className="text-sm text-[#94a3b8] tabular-nums mt-1">
                {fmt(topMover.price, topMover.decimals)}{" "}
                <span className={`${topColor} text-xs ml-1`}>
                  ({topPositive ? "+" : ""}
                  {fmt(topMover.changeAbs, topMover.decimals)})
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[#64748b] text-sm">No data available</div>
        )}
      </div>

      {/* Full list */}
      <div>
        <div className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#1e293b] flex items-center">
          <span className="flex-1">Instrument</span>
          <span className="w-28 text-right">Price</span>
          <span className="w-28 text-right">Change</span>
          <span className="w-24 text-right">% Move</span>
        </div>
        {loading && sortedMoves.length === 0 ? (
          <div className="p-8 text-center text-[#64748b] text-sm">Loading...</div>
        ) : sortedMoves.length === 0 ? (
          <div className="p-8 text-center text-[#64748b] text-sm">
            No data available
          </div>
        ) : (
          sortedMoves.map((m) => {
            const positive = m.changePct >= 0;
            const color = positive ? "text-green-500" : "text-red-500";
            return (
              <div
                key={m.symbol}
                className="px-5 py-3 border-b border-[#1e293b]/60 last:border-b-0 flex items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white truncate">
                      {m.name}
                    </div>
                    {activeTab === "all" && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${CLASS_BADGE[m.assetClass].className}`}
                      >
                        {CLASS_BADGE[m.assetClass].label}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748b] truncate">
                    {m.sub}
                  </div>
                </div>
                <div className="w-28 text-right tabular-nums text-sm text-[#e2e8f0]">
                  {fmt(m.price, m.decimals)}
                </div>
                <div className={`w-28 text-right tabular-nums text-xs ${color}`}>
                  {positive ? "+" : ""}
                  {fmt(m.changeAbs, m.decimals)}
                </div>
                <div className={`w-24 text-right tabular-nums text-sm font-bold ${color}`}>
                  {positive ? "+" : ""}
                  {m.changePct.toFixed(2)}%
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
