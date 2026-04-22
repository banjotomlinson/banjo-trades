// Instrument specs used by the position size calculator.
// pointValue = dollar change per 1.0 price move (per contract/lot/unit).

export type AssetClass = "futures" | "commodities" | "forex" | "crypto";

export interface Instrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  pointValue: number;
  unitLabel: "contract" | "lot" | "unit";
}

export const INSTRUMENTS: Instrument[] = [
  // --- Index futures ---
  { symbol: "NQ", name: "E-mini Nasdaq-100", assetClass: "futures", pointValue: 20, unitLabel: "contract" },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq-100", assetClass: "futures", pointValue: 2, unitLabel: "contract" },
  { symbol: "ES", name: "E-mini S&P 500", assetClass: "futures", pointValue: 50, unitLabel: "contract" },
  { symbol: "MES", name: "Micro E-mini S&P 500", assetClass: "futures", pointValue: 5, unitLabel: "contract" },
  { symbol: "YM", name: "E-mini Dow", assetClass: "futures", pointValue: 5, unitLabel: "contract" },
  { symbol: "MYM", name: "Micro E-mini Dow", assetClass: "futures", pointValue: 0.5, unitLabel: "contract" },
  { symbol: "RTY", name: "E-mini Russell 2000", assetClass: "futures", pointValue: 50, unitLabel: "contract" },
  { symbol: "M2K", name: "Micro E-mini Russell 2000", assetClass: "futures", pointValue: 5, unitLabel: "contract" },

  // --- Commodity futures ---
  { symbol: "CL", name: "Crude Oil", assetClass: "commodities", pointValue: 1000, unitLabel: "contract" },
  { symbol: "MCL", name: "Micro Crude Oil", assetClass: "commodities", pointValue: 100, unitLabel: "contract" },
  { symbol: "GC", name: "Gold", assetClass: "commodities", pointValue: 100, unitLabel: "contract" },
  { symbol: "MGC", name: "Micro Gold", assetClass: "commodities", pointValue: 10, unitLabel: "contract" },
  { symbol: "SI", name: "Silver", assetClass: "commodities", pointValue: 5000, unitLabel: "contract" },
  { symbol: "SIL", name: "Micro Silver", assetClass: "commodities", pointValue: 1000, unitLabel: "contract" },
  { symbol: "HG", name: "Copper", assetClass: "commodities", pointValue: 25000, unitLabel: "contract" },
  { symbol: "NG", name: "Natural Gas", assetClass: "commodities", pointValue: 10000, unitLabel: "contract" },

  // --- Forex (USD account, 1 standard lot = 100k units) ---
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", assetClass: "forex", pointValue: 1000, unitLabel: "lot" },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },
  { symbol: "EURJPY", name: "Euro / Japanese Yen", assetClass: "forex", pointValue: 1000, unitLabel: "lot" },
  { symbol: "GBPJPY", name: "British Pound / Japanese Yen", assetClass: "forex", pointValue: 1000, unitLabel: "lot" },
  { symbol: "EURGBP", name: "Euro / British Pound", assetClass: "forex", pointValue: 100000, unitLabel: "lot" },

  // --- Crypto (spot, sized in coin units) ---
  { symbol: "BTCUSD", name: "Bitcoin", assetClass: "crypto", pointValue: 1, unitLabel: "unit" },
  { symbol: "ETHUSD", name: "Ethereum", assetClass: "crypto", pointValue: 1, unitLabel: "unit" },
  { symbol: "SOLUSD", name: "Solana", assetClass: "crypto", pointValue: 1, unitLabel: "unit" },
  { symbol: "XRPUSD", name: "XRP", assetClass: "crypto", pointValue: 1, unitLabel: "unit" },
];
