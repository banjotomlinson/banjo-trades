// Instrument specifications used by the position size calculator.
// Point value = dollar change per 1.0 price move. Tick size/value capture
// the minimum fluctuation so we can round position size to whole contracts
// or lots.

export type AssetClass = "futures" | "commodities" | "forex" | "crypto";

export interface Instrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  // Dollar value per full 1.0 point of price movement (per contract / lot).
  pointValue: number;
  tickSize: number;
  tickValue: number;
  unitLabel: "contract" | "lot" | "unit";
  // Decimal places to display prices with.
  priceDecimals: number;
}

export const INSTRUMENTS: Instrument[] = [
  // --- Index futures ---
  { symbol: "NQ", name: "E-mini Nasdaq-100", assetClass: "futures", pointValue: 20, tickSize: 0.25, tickValue: 5, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq-100", assetClass: "futures", pointValue: 2, tickSize: 0.25, tickValue: 0.5, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "ES", name: "E-mini S&P 500", assetClass: "futures", pointValue: 50, tickSize: 0.25, tickValue: 12.5, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "MES", name: "Micro E-mini S&P 500", assetClass: "futures", pointValue: 5, tickSize: 0.25, tickValue: 1.25, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "YM", name: "E-mini Dow", assetClass: "futures", pointValue: 5, tickSize: 1, tickValue: 5, unitLabel: "contract", priceDecimals: 0 },
  { symbol: "MYM", name: "Micro E-mini Dow", assetClass: "futures", pointValue: 0.5, tickSize: 1, tickValue: 0.5, unitLabel: "contract", priceDecimals: 0 },
  { symbol: "RTY", name: "E-mini Russell 2000", assetClass: "futures", pointValue: 50, tickSize: 0.1, tickValue: 5, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "M2K", name: "Micro E-mini Russell 2000", assetClass: "futures", pointValue: 5, tickSize: 0.1, tickValue: 0.5, unitLabel: "contract", priceDecimals: 2 },

  // --- Commodity futures ---
  { symbol: "CL", name: "Crude Oil", assetClass: "commodities", pointValue: 1000, tickSize: 0.01, tickValue: 10, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "MCL", name: "Micro Crude Oil", assetClass: "commodities", pointValue: 100, tickSize: 0.01, tickValue: 1, unitLabel: "contract", priceDecimals: 2 },
  { symbol: "GC", name: "Gold", assetClass: "commodities", pointValue: 100, tickSize: 0.1, tickValue: 10, unitLabel: "contract", priceDecimals: 1 },
  { symbol: "MGC", name: "Micro Gold", assetClass: "commodities", pointValue: 10, tickSize: 0.1, tickValue: 1, unitLabel: "contract", priceDecimals: 1 },
  { symbol: "SI", name: "Silver", assetClass: "commodities", pointValue: 5000, tickSize: 0.005, tickValue: 25, unitLabel: "contract", priceDecimals: 3 },
  { symbol: "SIL", name: "Micro Silver", assetClass: "commodities", pointValue: 1000, tickSize: 0.005, tickValue: 5, unitLabel: "contract", priceDecimals: 3 },
  { symbol: "HG", name: "Copper", assetClass: "commodities", pointValue: 25000, tickSize: 0.0005, tickValue: 12.5, unitLabel: "contract", priceDecimals: 4 },
  { symbol: "NG", name: "Natural Gas", assetClass: "commodities", pointValue: 10000, tickSize: 0.001, tickValue: 10, unitLabel: "contract", priceDecimals: 3 },

  // --- Forex (USD account, 1 standard lot = 100k units) ---
  // pointValue here = $ per 1.0 move per lot = 100,000 (for USD-quote pairs).
  // tickSize = 0.0001 (1 pip) except JPY pairs at 0.01.
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", assetClass: "forex", pointValue: 1000, tickSize: 0.01, tickValue: 10, unitLabel: "lot", priceDecimals: 3 },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },
  { symbol: "EURJPY", name: "Euro / Japanese Yen", assetClass: "forex", pointValue: 1000, tickSize: 0.01, tickValue: 10, unitLabel: "lot", priceDecimals: 3 },
  { symbol: "GBPJPY", name: "British Pound / Japanese Yen", assetClass: "forex", pointValue: 1000, tickSize: 0.01, tickValue: 10, unitLabel: "lot", priceDecimals: 3 },
  { symbol: "EURGBP", name: "Euro / British Pound", assetClass: "forex", pointValue: 100000, tickSize: 0.0001, tickValue: 10, unitLabel: "lot", priceDecimals: 5 },

  // --- Crypto (spot, sized in coin units) ---
  { symbol: "BTCUSD", name: "Bitcoin", assetClass: "crypto", pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: "unit", priceDecimals: 2 },
  { symbol: "ETHUSD", name: "Ethereum", assetClass: "crypto", pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: "unit", priceDecimals: 2 },
  { symbol: "SOLUSD", name: "Solana", assetClass: "crypto", pointValue: 1, tickSize: 0.01, tickValue: 0.01, unitLabel: "unit", priceDecimals: 2 },
  { symbol: "XRPUSD", name: "XRP", assetClass: "crypto", pointValue: 1, tickSize: 0.0001, tickValue: 0.0001, unitLabel: "unit", priceDecimals: 4 },
];

export interface PositionInputs {
  instrument: Instrument;
  direction: "long" | "short";
  accountBalance: number;
  riskPct: number; // e.g. 1 for 1%
  entry: number;
  stop: number;
  target?: number;
}

export interface PositionResult {
  valid: boolean;
  errors: string[];
  riskAmount: number;
  stopDistancePoints: number;
  targetDistancePoints: number | null;
  dollarPerUnit: number; // loss if price moves against you by stop distance, per 1 contract/lot/unit
  positionSize: number; // raw, un-rounded
  positionSizeRounded: number; // whole contracts/lots (crypto allows fractional to 4 dp)
  potentialLoss: number; // $ at rounded size
  potentialProfit: number | null; // $ at rounded size
  rrRatio: number | null;
  positionValue: number; // notional $
}

const EMPTY: PositionResult = {
  valid: false,
  errors: [],
  riskAmount: 0,
  stopDistancePoints: 0,
  targetDistancePoints: null,
  dollarPerUnit: 0,
  positionSize: 0,
  positionSizeRounded: 0,
  potentialLoss: 0,
  potentialProfit: null,
  rrRatio: null,
  positionValue: 0,
};

export function calculatePosition(i: PositionInputs): PositionResult {
  const errors: string[] = [];
  if (!(i.accountBalance > 0)) errors.push("Account balance must be positive.");
  if (!(i.riskPct > 0)) errors.push("Risk % must be positive.");
  if (!(i.entry > 0)) errors.push("Entry price must be positive.");
  if (!(i.stop > 0)) errors.push("Stop price must be positive.");
  if (i.entry === i.stop) errors.push("Stop cannot equal entry.");
  if (i.direction === "long" && i.stop >= i.entry)
    errors.push("Long stop must be below entry.");
  if (i.direction === "short" && i.stop <= i.entry)
    errors.push("Short stop must be above entry.");

  if (errors.length > 0) return { ...EMPTY, errors };

  const riskAmount = i.accountBalance * (i.riskPct / 100);
  const stopDistance = Math.abs(i.entry - i.stop);
  const dollarPerUnit = stopDistance * i.instrument.pointValue;
  const positionSize = dollarPerUnit > 0 ? riskAmount / dollarPerUnit : 0;

  const isCrypto = i.instrument.assetClass === "crypto";
  const positionSizeRounded = isCrypto
    ? Math.floor(positionSize * 10000) / 10000
    : Math.floor(positionSize);

  const potentialLoss = positionSizeRounded * dollarPerUnit;

  let potentialProfit: number | null = null;
  let rrRatio: number | null = null;
  let targetDistance: number | null = null;
  if (i.target && i.target > 0 && i.target !== i.entry) {
    const longValid =
      i.direction === "long" ? i.target > i.entry : i.target < i.entry;
    if (longValid) {
      targetDistance = Math.abs(i.target - i.entry);
      potentialProfit =
        positionSizeRounded * targetDistance * i.instrument.pointValue;
      rrRatio = targetDistance / stopDistance;
    } else {
      errors.push(
        i.direction === "long"
          ? "Long target must be above entry."
          : "Short target must be below entry."
      );
    }
  }

  const positionValue = positionSizeRounded * i.entry * i.instrument.pointValue;

  return {
    valid: errors.length === 0,
    errors,
    riskAmount,
    stopDistancePoints: stopDistance,
    targetDistancePoints: targetDistance,
    dollarPerUnit,
    positionSize,
    positionSizeRounded,
    potentialLoss,
    potentialProfit,
    rrRatio,
    positionValue,
  };
}
