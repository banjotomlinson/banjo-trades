"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

interface Instrument {
  symbol: string;
  name: string;
  desc: string;
  cat: string;
}

const INSTRUMENTS: Instrument[] = [
  { symbol: "PEPPERSTONE:NAS100", name: "NAS100", desc: "NASDAQ 100", cat: "Index Futures" },
  { symbol: "FOREXCOM:SPXUSD", name: "S&P 500", desc: "S&P 500 Index", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:US30", name: "US30", desc: "Dow Jones", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:US2000", name: "US2000", desc: "Russell 2000", cat: "Index Futures" },
  { symbol: "TVC:VIX", name: "VIX", desc: "Volatility Index", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:GER40", name: "DAX 40", desc: "Germany 40", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:UK100", name: "FTSE 100", desc: "UK 100", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:JPN225", name: "Nikkei 225", desc: "Japan 225", cat: "Index Futures" },
  { symbol: "PEPPERSTONE:AUS200", name: "ASX 200", desc: "Australia 200", cat: "Index Futures" },
  { symbol: "OANDA:XAUUSD", name: "Gold", desc: "XAUUSD", cat: "Commodities" },
  { symbol: "OANDA:XAGUSD", name: "Silver", desc: "XAGUSD", cat: "Commodities" },
  { symbol: "TVC:USOIL", name: "Crude Oil", desc: "WTI", cat: "Commodities" },
  { symbol: "TVC:UKOIL", name: "Brent Oil", desc: "Brent Crude", cat: "Commodities" },
  { symbol: "PEPPERSTONE:NATGAS", name: "Natural Gas", desc: "Nat Gas", cat: "Commodities" },
  { symbol: "TVC:DXY", name: "DXY", desc: "US Dollar Index", cat: "Forex" },
  { symbol: "OANDA:EURUSD", name: "EUR/USD", desc: "Euro / Dollar", cat: "Forex" },
  { symbol: "OANDA:GBPUSD", name: "GBP/USD", desc: "Pound / Dollar", cat: "Forex" },
  { symbol: "OANDA:USDJPY", name: "USD/JPY", desc: "Dollar / Yen", cat: "Forex" },
  { symbol: "OANDA:AUDUSD", name: "AUD/USD", desc: "Aussie / Dollar", cat: "Forex" },
  { symbol: "OANDA:USDCAD", name: "USD/CAD", desc: "Dollar / Loonie", cat: "Forex" },
  { symbol: "OANDA:NZDUSD", name: "NZD/USD", desc: "Kiwi / Dollar", cat: "Forex" },
  { symbol: "OANDA:USDCHF", name: "USD/CHF", desc: "Dollar / Franc", cat: "Forex" },
  { symbol: "OANDA:EURGBP", name: "EUR/GBP", desc: "Euro / Pound", cat: "Forex" },
  { symbol: "OANDA:EURJPY", name: "EUR/JPY", desc: "Euro / Yen", cat: "Forex" },
  { symbol: "OANDA:GBPJPY", name: "GBP/JPY", desc: "Pound / Yen", cat: "Forex" },
  { symbol: "TVC:US10Y", name: "US 10Y", desc: "US 10Y Treasury", cat: "Bonds" },
  { symbol: "TVC:US02Y", name: "US 2Y", desc: "US 2Y Treasury", cat: "Bonds" },
  { symbol: "TVC:US30Y", name: "US 30Y", desc: "US 30Y Treasury", cat: "Bonds" },
  { symbol: "COINBASE:BTCUSD", name: "Bitcoin", desc: "BTC/USD", cat: "Crypto" },
  { symbol: "COINBASE:ETHUSD", name: "Ethereum", desc: "ETH/USD", cat: "Crypto" },
  { symbol: "BINANCE:SOLUSDT", name: "Solana", desc: "SOL/USDT", cat: "Crypto" },
  { symbol: "COINBASE:XRPUSD", name: "XRP", desc: "XRP/USD", cat: "Crypto" },
  { symbol: "BINANCE:ADAUSDT", name: "Cardano", desc: "ADA/USDT", cat: "Crypto" },
  { symbol: "BINANCE:DOGEUSDT", name: "Dogecoin", desc: "DOGE/USDT", cat: "Crypto" },
  { symbol: "NASDAQ:AAPL", name: "Apple", desc: "AAPL", cat: "Stocks" },
  { symbol: "NASDAQ:MSFT", name: "Microsoft", desc: "MSFT", cat: "Stocks" },
  { symbol: "NASDAQ:NVDA", name: "NVIDIA", desc: "NVDA", cat: "Stocks" },
  { symbol: "NASDAQ:GOOGL", name: "Google", desc: "GOOGL", cat: "Stocks" },
  { symbol: "NASDAQ:AMZN", name: "Amazon", desc: "AMZN", cat: "Stocks" },
  { symbol: "NASDAQ:META", name: "Meta", desc: "META", cat: "Stocks" },
  { symbol: "NASDAQ:TSLA", name: "Tesla", desc: "TSLA", cat: "Stocks" },
  { symbol: "NASDAQ:AMD", name: "AMD", desc: "AMD", cat: "Stocks" },
  { symbol: "NASDAQ:NFLX", name: "Netflix", desc: "NFLX", cat: "Stocks" },
];

const CAT_COLORS: Record<string, string> = {
  "Index Futures": "#3b82f6",
  Commodities: "#f59e0b",
  Forex: "#22c55e",
  Bonds: "#a855f7",
  Crypto: "#f97316",
  Stocks: "#ec4899",
};

const CATEGORIES = [...new Set(INSTRUMENTS.map((i) => i.cat))];

interface TradingViewChartProps {
  symbol: string;
  label: string;
  slot?: string;
}

let tvScriptLoaded = false;
function loadTvScript(): Promise<void> {
  if (tvScriptLoaded && window.TradingView) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.getElementById("tv-script-lib")) {
      const check = () => {
        if (window.TradingView) { tvScriptLoaded = true; resolve(); }
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const s = document.createElement("script");
    s.id = "tv-script-lib";
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => { tvScriptLoaded = true; resolve(); };
    document.head.appendChild(s);
  });
}

function buildChart(container: HTMLElement, id: string, sym: string) {
  if (!window.TradingView) return;
  container.innerHTML = "";
  const div = document.createElement("div");
  div.id = id;
  div.style.height = "100%";
  container.appendChild(div);

  new window.TradingView.widget({
    container_id: id,
    autosize: true,
    symbol: sym,
    interval: "60",
    timezone: "America/New_York",
    theme: "dark",
    style: "1",
    locale: "en",
    toolbar_bg: "#111827",
    enable_publishing: false,
    allow_symbol_change: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_side_toolbar: false,
    save_image: true,
    backgroundColor: "#111827",
    gridColor: "#1a2235",
    studies: ["SessionBreaks@tv-basicstudies"],
    hide_volume: true,
    withdateranges: true,
    drawings_access: { type: "all" },
    saved_data: true,
  });
}

export default function TradingViewChart({ symbol: defaultSymbol, label: defaultLabel, slot }: TradingViewChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const fsChartRef = useRef<HTMLDivElement>(null);
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol);
  const [activeLabel, setActiveLabel] = useState(defaultLabel);
  const [loaded, setLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const chartIdRef = useRef(`tv-${reactId.replace(/:/g, "")}`);
  const fsChartIdRef = useRef(`tv-fs-${reactId.replace(/:/g, "")}`);

  // Load saved instrument preference from Supabase
  useEffect(() => {
    if (!slot) { setLoaded(true); return; }

    fetch("/api/chart-preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          const pref = data.preferences.find((p: { slot: string }) => p.slot === slot);
          if (pref) {
            setActiveSymbol(pref.symbol);
            setActiveLabel(pref.label);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [slot]);

  useEffect(() => {
    if (!loaded) return;
    loadTvScript().then(() => {
      if (chartRef.current) buildChart(chartRef.current, chartIdRef.current, activeSymbol);
    });
  }, [activeSymbol, loaded]);

  useEffect(() => {
    if (fullscreen && fsChartRef.current) {
      loadTvScript().then(() => {
        if (fsChartRef.current) buildChart(fsChartRef.current, fsChartIdRef.current, activeSymbol);
      });
    }
  }, [fullscreen, activeSymbol]);

  useEffect(() => {
    if (fullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchRef.current) searchRef.current.focus();
  }, [dropdownOpen]);

  useEffect(() => {
    if (!fullscreen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [fullscreen]);

  const savePreference = useCallback((symbol: string, label: string) => {
    if (!slot) return;
    fetch("/api/chart-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, symbol, label }),
    }).catch(() => {});
  }, [slot]);

  const selectInstrument = (inst: Instrument) => {
    setActiveSymbol(inst.symbol);
    setActiveLabel(inst.name);
    setDropdownOpen(false);
    setSearch("");
    savePreference(inst.symbol, inst.name);
  };

  const q = search.toLowerCase();
  const filtered = INSTRUMENTS.filter((i) => {
    if (filterCat && i.cat !== filterCat) return false;
    if (q && !i.name.toLowerCase().includes(q) && !i.desc.toLowerCase().includes(q) && !i.symbol.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e293b]">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] transition-colors cursor-pointer"
            >
              <span className="text-xs font-bold text-[#e2e8f0]">{activeLabel}</span>
              <span className="text-[10px] text-[#475569]">&#9662;</span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-[280px] max-h-[440px] bg-[#111827] border border-[#1e293b] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="px-2 pt-2 pb-1">
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search instruments..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-[#1e293b] text-xs text-[#e2e8f0] placeholder-[#475569] outline-none focus:border-[#334155]"
                  />
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-[#1e293b]">
                  <button
                    onClick={() => setFilterCat(null)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
                      !filterCat ? "bg-[#3b82f6]/15 text-[#3b82f6]" : "text-[#475569] hover:text-[#94a3b8]"
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCat(cat)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors"
                      style={{
                        color: filterCat === cat ? CAT_COLORS[cat] : "#475569",
                        background: filterCat === cat ? `${CAT_COLORS[cat]}15` : "transparent",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Instrument list */}
                <div className="overflow-y-auto max-h-[320px]">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-[#475569] text-center">No results</div>
                  ) : (
                    filtered.map((inst) => (
                      <button
                        key={inst.symbol}
                        onClick={() => selectInstrument(inst)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors ${
                          activeSymbol === inst.symbol ? "bg-[#3b82f6]/8" : ""
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: CAT_COLORS[inst.cat] }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[#e2e8f0]">{inst.name}</span>
                          <span className="text-[10px] text-[#475569] ml-2">{inst.desc}</span>
                        </span>
                        {activeSymbol === inst.symbol && (
                          <span className="text-[10px] text-[#3b82f6] font-bold">ACTIVE</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] text-[#64748b] hover:text-[#e2e8f0] transition-colors text-xs font-semibold"
            title="Fullscreen"
          >
            &#x26F6;
          </button>
        </div>

        {/* Chart */}
        <div ref={chartRef} className="w-full h-[400px]" />
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-[10000] bg-[#0a0e17] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold text-[#3b82f6]">{activeLabel}</span>
            <button
              onClick={() => setFullscreen(false)}
              className="px-4 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white text-xs font-semibold transition-colors"
            >
              &#x2715; Exit
            </button>
          </div>
          <div ref={fsChartRef} className="flex-1" />
        </div>
      )}
    </>
  );
}
