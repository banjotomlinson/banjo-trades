// ICT Analysis Engine - Pattern Detection Library
// Ported from vanilla JS monolith to TypeScript

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SwingPoint {
  idx: number;
  price: number;
  time: number;
}

export interface FVG {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  mid: number;
  size: number;
  idx: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  mid: number;
  idx: number;
  isMitigation?: boolean;
}

export interface BOS {
  type: 'bullish' | 'bearish';
  price: number;
  idx: number;
}

export interface CHoCH {
  type: 'bullish' | 'bearish';
  price: number;
  idx: number;
}

export interface MSS {
  type: 'bullish' | 'bearish';
  price: number;
  idx: number;
}

export interface Displacement {
  type: 'bullish' | 'bearish';
  idx: number;
  strength: number;
}

export interface LiqVoid {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  idx: number;
}

export interface TurtleSoup {
  type: 'bullish' | 'bearish';
  sweepLevel: number;
  idx: number;
}

export interface Inducement {
  type: 'bullish' | 'bearish';
  price: number;
  idx: number;
}

export interface EqualLevel {
  price: number;
  count: number;
}

export interface LiqPool {
  price: number;
  type: 'bsl' | 'ssl';
  source: string;
}

export interface PDZone {
  zone: string;
  pct: number;
}

export type StructureBias = 'bullish' | 'bearish' | 'neutral';

export interface ICTAnalysis {
  highs: SwingPoint[];
  lows: SwingPoint[];
  structure: StructureBias;
  lastHigh: number | null;
  lastLow: number | null;
  range: number;
  equil: number | null;
  fvgs: FVG[];
  obs: OrderBlock[];
  breakers: OrderBlock[];
  mitigations: OrderBlock[];
  eqHighs: EqualLevel[];
  eqLows: EqualLevel[];
  bos: BOS[];
  choch: CHoCH[];
  mss: MSS[];
  displacement: Displacement[];
  liqVoids: LiqVoid[];
  turtleSoup: TurtleSoup[];
  inducement: Inducement[];
  bsl: LiqPool[];
  ssl: LiqPool[];
  pdZone: PDZone | null;
}

export interface LiquidityPool {
  tag: string;
  price: number;
  side: 'bsl' | 'ssl';
  distance: number;
  distancePct: number;
  formedMs: number;
  hoursSince: number;
  reasons: string[];
  heat: number;
}

export interface GeneratedSetup {
  direction: 'LONG' | 'SHORT';
  instrumentName: string;
  timeframe: string;
  eMid: number;
  eHigh: number;
  eLow: number;
  sl: number;
  tp: number;
  equil: number;
  rr: number;
  tags: string[];
  structure: StructureBias;
  status: 'active' | 'watch' | 'pending';
  score: number;
  pdZone: PDZone | null;
}

export interface SessionBoundaries {
  pdStart: number;
  pdEnd: number;
  pwStart: number;
  pwEnd: number;
  asiaStart: number;
  asiaEnd: number;
  londonStart: number;
  londonEnd: number;
  todayMidET: number;
}

export interface SessionExtreme {
  high: number;
  low: number;
  highTime: number;
  lowTime: number;
}

export interface HeatContext {
  bias?: string;
  sessionLabel?: string;
}

// ─── Detection Functions ─────────────────────────────────────────────────────

export function findSwings(
  candles: Candle[],
  lb: number = 3
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];
  for (let i = lb; i < candles.length - lb; i++) {
    let isH = true;
    let isL = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) isH = false;
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) isL = false;
    }
    if (isH) highs.push({ idx: i, price: candles[i].high, time: candles[i].time });
    if (isL) lows.push({ idx: i, price: candles[i].low, time: candles[i].time });
  }
  return { highs, lows };
}

export function detectStructure(highs: SwingPoint[], lows: SwingPoint[]): StructureBias {
  if (highs.length < 2 || lows.length < 2) return 'neutral';
  const h = highs.slice(-2);
  const l = lows.slice(-2);
  const bull = h[1].price > h[0].price && l[1].price > l[0].price;
  const bear = h[1].price < h[0].price && l[1].price < l[0].price;
  return bull ? 'bullish' : bear ? 'bearish' : 'neutral';
}

export function findFVGs(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  for (let i = 2; i < candles.length; i++) {
    if (candles[i].low > candles[i - 2].high) {
      const size = candles[i].low - candles[i - 2].high;
      fvgs.push({
        type: 'bullish',
        top: candles[i].low,
        bottom: candles[i - 2].high,
        mid: (candles[i].low + candles[i - 2].high) / 2,
        size,
        idx: i,
      });
    }
    if (candles[i].high < candles[i - 2].low) {
      const size = candles[i - 2].low - candles[i].high;
      fvgs.push({
        type: 'bearish',
        top: candles[i - 2].low,
        bottom: candles[i].high,
        mid: (candles[i - 2].low + candles[i].high) / 2,
        size,
        idx: i,
      });
    }
  }
  return fvgs;
}

export function findOrderBlocks(candles: Candle[]): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const src = candles.slice(-60);
  for (let i = 1; i < src.length - 4; i++) {
    const c = src[i];
    if (c.close < c.open) {
      let bull = 0;
      for (let j = i + 1; j < Math.min(i + 6, src.length); j++) {
        if (src[j].close > src[j].open) bull += src[j].close - src[j].open;
      }
      if (bull > (c.open - c.close) * 1.2)
        obs.push({ type: 'bullish', top: c.open, bottom: c.low, mid: (c.open + c.low) / 2, idx: i });
    }
    if (c.close > c.open) {
      let bear = 0;
      for (let j = i + 1; j < Math.min(i + 6, src.length); j++) {
        if (src[j].close < src[j].open) bear += src[j].open - src[j].close;
      }
      if (bear > (c.close - c.open) * 1.2)
        obs.push({ type: 'bearish', top: c.high, bottom: c.close, mid: (c.high + c.close) / 2, idx: i });
    }
  }
  return obs;
}

export function findEqualLevels(swings: SwingPoint[], tol: number = 0.0018): EqualLevel[] {
  const equals: EqualLevel[] = [];
  for (let i = 0; i < swings.length - 1; i++) {
    for (let j = i + 1; j < swings.length; j++) {
      if (Math.abs(swings[i].price - swings[j].price) / swings[i].price < tol) {
        equals.push({ price: (swings[i].price + swings[j].price) / 2, count: 2 });
      }
    }
  }
  return equals;
}

export function findBOS(candles: Candle[], highs: SwingPoint[], lows: SwingPoint[]): BOS[] {
  const bos: BOS[] = [];
  for (let i = 1; i < highs.length; i++) {
    const level = highs[i - 1].price;
    for (let k = highs[i - 1].idx + 1; k < candles.length; k++) {
      if (candles[k].close > level) {
        bos.push({ type: 'bullish', price: level, idx: k });
        break;
      }
    }
  }
  for (let i = 1; i < lows.length; i++) {
    const level = lows[i - 1].price;
    for (let k = lows[i - 1].idx + 1; k < candles.length; k++) {
      if (candles[k].close < level) {
        bos.push({ type: 'bearish', price: level, idx: k });
        break;
      }
    }
  }
  return bos;
}

export function findCHoCH(candles: Candle[], highs: SwingPoint[], lows: SwingPoint[]): CHoCH[] {
  const choch: CHoCH[] = [];
  const structure = detectStructure(highs, lows);
  if (structure === 'bullish' && lows.length >= 2) {
    const lastHL = lows[lows.length - 1].price;
    for (let k = lows[lows.length - 1].idx + 1; k < candles.length; k++) {
      if (candles[k].close < lastHL) {
        choch.push({ type: 'bearish', price: lastHL, idx: k });
        break;
      }
    }
  }
  if (structure === 'bearish' && highs.length >= 2) {
    const lastLH = highs[highs.length - 1].price;
    for (let k = highs[highs.length - 1].idx + 1; k < candles.length; k++) {
      if (candles[k].close > lastLH) {
        choch.push({ type: 'bullish', price: lastLH, idx: k });
        break;
      }
    }
  }
  return choch;
}

export function findMSS(candles: Candle[]): MSS[] {
  const recent = candles.slice(-20);
  const { highs, lows } = findSwings(recent, 2);
  return findCHoCH(recent, highs, lows);
}

export function findDisplacement(candles: Candle[]): Displacement[] {
  const src = candles.slice(-30);
  const avgBody = src.reduce((s, c) => s + Math.abs(c.close - c.open), 0) / src.length;
  const disps: Displacement[] = [];
  for (let i = 1; i < src.length; i++) {
    const body = Math.abs(src[i].close - src[i].open);
    if (body > avgBody * 2.2) {
      disps.push({
        type: src[i].close > src[i].open ? 'bullish' : 'bearish',
        idx: i,
        strength: body / avgBody,
      });
    }
  }
  return disps;
}

export function findLiquidityVoids(candles: Candle[]): LiqVoid[] {
  const voids: LiqVoid[] = [];
  for (let i = 2; i < candles.length; i++) {
    if (candles[i].low > candles[i - 2].high && candles[i - 1].close > candles[i - 1].open)
      voids.push({ type: 'bullish', top: candles[i].low, bottom: candles[i - 2].high, idx: i });
    if (candles[i].high < candles[i - 2].low && candles[i - 1].close < candles[i - 1].open)
      voids.push({ type: 'bearish', top: candles[i - 2].low, bottom: candles[i].high, idx: i });
  }
  return voids;
}

export function findBreakerBlocks(candles: Candle[], obs: OrderBlock[]): OrderBlock[] {
  const cur = candles[candles.length - 1].close;
  return obs
    .filter((o) => {
      if (o.type === 'bullish' && cur < o.bottom) return true;
      if (o.type === 'bearish' && cur > o.top) return true;
      return false;
    })
    .map((o) => ({
      type: (o.type === 'bullish' ? 'bearish' : 'bullish') as 'bullish' | 'bearish',
      top: o.top,
      bottom: o.bottom,
      mid: o.mid,
      idx: o.idx,
    }));
}

export function findMitigationBlocks(candles: Candle[], obs: OrderBlock[]): OrderBlock[] {
  const mit: OrderBlock[] = [];
  obs.forEach((o) => {
    const after = candles.slice(o.idx + 1);
    const touched = after.some((c) => c.low <= o.top && c.close >= o.bottom);
    const broken = after.some((c) => c.close < o.bottom);
    if (touched && !broken) mit.push({ ...o, isMitigation: true });
  });
  return mit;
}

export function findInducement(candles: Candle[], highs: SwingPoint[], lows: SwingPoint[]): Inducement[] {
  const inds: Inducement[] = [];
  for (let i = 1; i < highs.length - 1; i++) {
    const sh = highs[i];
    const next = candles.slice(sh.idx + 1, sh.idx + 5);
    const swept = next.some((c) => c.high > sh.price);
    const reversed = next.some((c) => c.close < highs[i - 1].price * 0.999);
    if (swept && reversed) inds.push({ type: 'bearish', price: sh.price, idx: sh.idx });
  }
  for (let i = 1; i < lows.length - 1; i++) {
    const sl = lows[i];
    const next = candles.slice(sl.idx + 1, sl.idx + 5);
    const swept = next.some((c) => c.low < sl.price);
    const reversed = next.some((c) => c.close > lows[i - 1].price * 1.001);
    if (swept && reversed) inds.push({ type: 'bullish', price: sl.price, idx: sl.idx });
  }
  return inds;
}

export function findTurtleSoup(candles: Candle[], period: number = 20): TurtleSoup[] {
  const patterns: TurtleSoup[] = [];
  if (candles.length < period + 2) return patterns;
  for (let i = period; i < candles.length; i++) {
    const win = candles.slice(i - period, i);
    const ph = Math.max(...win.map((c) => c.high));
    const pl = Math.min(...win.map((c) => c.low));
    if (candles[i].low < pl && candles[i].close > pl)
      patterns.push({ type: 'bullish', sweepLevel: pl, idx: i });
    if (candles[i].high > ph && candles[i].close < ph)
      patterns.push({ type: 'bearish', sweepLevel: ph, idx: i });
  }
  return patterns;
}

export function getPremiumDiscount(rangeLow: number, rangeHigh: number, price: number): PDZone {
  if (!rangeLow || !rangeHigh || rangeHigh === rangeLow) return { zone: 'neutral', pct: 50 };
  const pct = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  let zone = 'neutral';
  if (pct < 25) zone = 'deep_discount';
  else if (pct < 50) zone = 'discount';
  else if (pct < 75) zone = 'premium';
  else zone = 'deep_premium';
  return { zone, pct: Math.round(pct) };
}

export function getLiquidityPools(
  highs: SwingPoint[],
  lows: SwingPoint[],
  eqHighs: EqualLevel[],
  eqLows: EqualLevel[]
): { bsl: LiqPool[]; ssl: LiqPool[] } {
  const bsl: LiqPool[] = [
    ...highs.slice(-3).map((h) => ({ price: h.price, type: 'bsl' as const, source: 'swing_high' })),
    ...eqHighs.map((h) => ({ price: h.price, type: 'bsl' as const, source: 'equal_highs' })),
  ].sort((a, b) => b.price - a.price);
  const ssl: LiqPool[] = [
    ...lows.slice(-3).map((l) => ({ price: l.price, type: 'ssl' as const, source: 'swing_low' })),
    ...eqLows.map((l) => ({ price: l.price, type: 'ssl' as const, source: 'equal_lows' })),
  ].sort((a, b) => a.price - b.price);
  return { bsl, ssl };
}

// ─── Master Analysis ─────────────────────────────────────────────────────────

export function runICTAnalysis(candles: Candle[], lb: number = 3): ICTAnalysis {
  const { highs, lows } = findSwings(candles, lb);
  const structure = detectStructure(highs, lows);
  const lastHigh = highs.length ? highs[highs.length - 1].price : null;
  const lastLow = lows.length ? lows[lows.length - 1].price : null;
  const range = lastHigh && lastLow ? lastHigh - lastLow : 0;
  const equil = lastHigh && lastLow ? (lastHigh + lastLow) / 2 : null;
  const fvgs = findFVGs(candles);
  const obs = findOrderBlocks(candles);
  const breakers = findBreakerBlocks(candles, obs);
  const mitigations = findMitigationBlocks(candles, obs);
  const eqHighs = findEqualLevels(highs);
  const eqLows = findEqualLevels(lows);
  const bos = findBOS(candles, highs, lows);
  const choch = findCHoCH(candles, highs, lows);
  const mss = findMSS(candles);
  const displacement = findDisplacement(candles);
  const liqVoids = findLiquidityVoids(candles);
  const turtleSoup = findTurtleSoup(candles);
  const inducement = findInducement(candles, highs, lows);
  const { bsl, ssl } = getLiquidityPools(highs, lows, eqHighs, eqLows);
  const pdZone = equil
    ? getPremiumDiscount(lastLow!, lastHigh!, candles[candles.length - 1].close)
    : null;
  return {
    highs, lows, structure, lastHigh, lastLow, range, equil,
    fvgs, obs, breakers, mitigations, eqHighs, eqLows,
    bos, choch, mss, displacement, liqVoids, turtleSoup, inducement,
    bsl, ssl, pdZone,
  };
}

// ─── Setup Builder ───────────────────────────────────────────────────────────

export function buildSetups(
  candles: Candle[],
  a: ICTAnalysis,
  instrumentName: string,
  timeframe: string
): GeneratedSetup[] {
  if (!candles.length || !a.lastHigh || !a.lastLow) return [];
  const cur = candles[candles.length - 1].close;
  const setups: GeneratedSetup[] = [];

  // LONG candidates
  if (a.structure !== 'bearish') {
    const tags: string[] = [];
    let eHigh: number | null = null;
    let eLow: number | null = null;
    let score = 0;
    const bullFVGs = a.fvgs
      .filter((f) => f.type === 'bullish' && f.top < cur && f.bottom > a.lastLow! * 0.99)
      .slice(-3);
    const bullOBs = a.obs
      .filter((o) => o.type === 'bullish' && o.top < cur && o.bottom > a.lastLow! * 0.99)
      .slice(-3);
    const bullBKs = a.breakers.filter((b) => b.type === 'bullish' && b.top < cur).slice(-2);
    const bullMit = a.mitigations.filter((m) => m.type === 'bullish' && m.top < cur).slice(-2);

    if (bullFVGs.length) {
      const f = bullFVGs[bullFVGs.length - 1];
      eHigh = f.top;
      eLow = f.bottom;
      tags.push('fvg');
      score += 2;
    }
    if (bullOBs.length) {
      const o = bullOBs[bullOBs.length - 1];
      if (!eHigh || (o.bottom <= eHigh && o.top >= eLow!)) {
        if (!eHigh) {
          eHigh = o.top;
          eLow = o.bottom;
        } else {
          eHigh = Math.min(eHigh, o.top);
          eLow = Math.max(eLow!, o.bottom);
        }
      }
      tags.push('ob');
      score += 2;
    }
    if (!eHigh && bullBKs.length) {
      const b = bullBKs[bullBKs.length - 1];
      eHigh = b.top;
      eLow = b.bottom;
      tags.push('breaker');
      score += 2;
    }
    if (!eHigh && bullMit.length) {
      const m = bullMit[bullMit.length - 1];
      eHigh = m.top;
      eLow = m.bottom;
      tags.push('mitigation');
      score += 1;
    }
    if (!eHigh) {
      eHigh = a.lastLow! * 1.002;
      eLow = a.lastLow! * 0.998;
    }

    const eMid = (eHigh + eLow!) / 2;
    const slRef = a.ssl.length ? a.ssl[0].price : a.lastLow!;
    const sl = slRef * 0.998;
    const bslAbove = a.bsl.filter((b) => b.price > cur);
    const tp = bslAbove.length ? bslAbove[0].price : a.lastHigh!;

    if (tp > eMid && eMid > sl) {
      const rr = (tp - eMid) / (eMid - sl);
      if (rr >= 1.0) {
        if (a.equil && Math.abs(eMid - a.equil) / a.range < 0.15) {
          tags.push('eq');
          score += 2;
        }
        if (a.pdZone && (a.pdZone.zone === 'discount' || a.pdZone.zone === 'deep_discount')) {
          tags.push('pd');
          score += 2;
        }
        if (a.choch.some((c) => c.type === 'bullish')) { tags.push('choch'); score += 3; }
        if (a.bos.some((b) => b.type === 'bullish')) { tags.push('bos'); score += 2; }
        if (a.mss.some((m) => m.type === 'bullish')) { tags.push('mss'); score += 2; }
        if (a.displacement.some((d) => d.type === 'bullish')) { tags.push('displacement'); score += 2; }
        if (a.turtleSoup.some((t) => t.type === 'bullish')) { tags.push('turtle'); score += 3; }
        if (a.inducement.some((ind) => ind.type === 'bullish')) { tags.push('inducement'); score += 2; }
        if (a.eqLows.some((l) => Math.abs(l.price - sl) / sl < 0.003)) { tags.push('eql'); score += 2; }
        if (a.liqVoids.some((v) => v.type === 'bullish' && v.bottom <= eHigh! && v.top >= eLow!)) {
          tags.push('void');
          score += 1;
        }
        tags.push('bsl');
        if (a.structure === 'bullish') score += 2;
        const status: 'active' | 'watch' | 'pending' =
          cur >= eLow! && cur <= eHigh ? 'active' : cur < eLow! + a.range * 0.1 ? 'watch' : 'pending';
        setups.push({
          direction: 'LONG',
          instrumentName,
          timeframe,
          eMid,
          eHigh,
          eLow: eLow!,
          sl,
          tp,
          equil: a.equil || eMid,
          rr,
          tags,
          structure: a.structure,
          status,
          score,
          pdZone: a.pdZone,
        });
      }
    }
  }

  // SHORT candidates
  if (a.structure !== 'bullish') {
    const tags: string[] = [];
    let eHigh: number | null = null;
    let eLow: number | null = null;
    let score = 0;
    const bearFVGs = a.fvgs
      .filter((f) => f.type === 'bearish' && f.bottom > cur && f.top < a.lastHigh! * 1.01)
      .slice(-3);
    const bearOBs = a.obs
      .filter((o) => o.type === 'bearish' && o.bottom > cur && o.top < a.lastHigh! * 1.01)
      .slice(-3);
    const bearBKs = a.breakers.filter((b) => b.type === 'bearish' && b.bottom > cur).slice(-2);
    const bearMit = a.mitigations.filter((m) => m.type === 'bearish' && m.bottom > cur).slice(-2);

    if (bearFVGs.length) {
      const f = bearFVGs[bearFVGs.length - 1];
      eHigh = f.top;
      eLow = f.bottom;
      tags.push('fvg');
      score += 2;
    }
    if (bearOBs.length) {
      const o = bearOBs[bearOBs.length - 1];
      if (!eHigh || (o.bottom <= eHigh && o.top >= eLow!)) {
        if (!eHigh) {
          eHigh = o.top;
          eLow = o.bottom;
        } else {
          eHigh = Math.min(eHigh, o.top);
          eLow = Math.max(eLow!, o.bottom);
        }
      }
      tags.push('ob');
      score += 2;
    }
    if (!eHigh && bearBKs.length) {
      const b = bearBKs[bearBKs.length - 1];
      eHigh = b.top;
      eLow = b.bottom;
      tags.push('breaker');
      score += 2;
    }
    if (!eHigh && bearMit.length) {
      const m = bearMit[bearMit.length - 1];
      eHigh = m.top;
      eLow = m.bottom;
      tags.push('mitigation');
      score += 1;
    }
    if (!eHigh) {
      eHigh = a.lastHigh! * 1.002;
      eLow = a.lastHigh! * 0.998;
    }

    const eMid = (eHigh + eLow!) / 2;
    const slRef = a.bsl.length ? a.bsl[0].price : a.lastHigh!;
    const sl = slRef * 1.002;
    const sslBelow = a.ssl.filter((s) => s.price < cur);
    const tp = sslBelow.length ? sslBelow[sslBelow.length - 1].price : a.lastLow!;

    if (tp < eMid && eMid < sl) {
      const rr = (eMid - tp) / (sl - eMid);
      if (rr >= 1.0) {
        if (a.equil && Math.abs(eMid - a.equil) / a.range < 0.15) {
          tags.push('eq');
          score += 2;
        }
        if (a.pdZone && (a.pdZone.zone === 'premium' || a.pdZone.zone === 'deep_premium')) {
          tags.push('pd');
          score += 2;
        }
        if (a.choch.some((c) => c.type === 'bearish')) { tags.push('choch'); score += 3; }
        if (a.bos.some((b) => b.type === 'bearish')) { tags.push('bos'); score += 2; }
        if (a.mss.some((m) => m.type === 'bearish')) { tags.push('mss'); score += 2; }
        if (a.displacement.some((d) => d.type === 'bearish')) { tags.push('displacement'); score += 2; }
        if (a.turtleSoup.some((t) => t.type === 'bearish')) { tags.push('turtle'); score += 3; }
        if (a.inducement.some((ind) => ind.type === 'bearish')) { tags.push('inducement'); score += 2; }
        if (a.eqHighs.some((h) => Math.abs(h.price - sl) / sl < 0.003)) { tags.push('eqh'); score += 2; }
        if (a.liqVoids.some((v) => v.type === 'bearish' && v.bottom <= eHigh! && v.top >= eLow!)) {
          tags.push('void');
          score += 1;
        }
        tags.push('ssl');
        if (a.structure === 'bearish') score += 2;
        const status: 'active' | 'watch' | 'pending' =
          cur >= eLow! && cur <= eHigh ? 'active' : cur > eHigh - a.range * 0.1 ? 'watch' : 'pending';
        setups.push({
          direction: 'SHORT',
          instrumentName,
          timeframe,
          eMid,
          eHigh,
          eLow: eLow!,
          sl,
          tp,
          equil: a.equil || eMid,
          rr,
          tags,
          structure: a.structure,
          status,
          score,
          pdZone: a.pdZone,
        });
      }
    }
  }

  return setups.sort((a, b) => b.score - a.score);
}

// ─── Session & Liquidity Pool Functions ──────────────────────────────────────

export function getSessionBoundaries(etNow: Date): SessionBoundaries {
  const toMs = (d: Date): number => d.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const etDay = new Date(etNow);
  etDay.setHours(0, 0, 0, 0);
  const todayMidET = toMs(etDay);
  const pdStart = todayMidET - dayMs;
  const pdEnd = todayMidET - 1;
  const dow = etDay.getDay();
  const daysBackToMonThisWeek = dow === 0 ? 6 : dow - 1;
  const thisMonMs = todayMidET - daysBackToMonThisWeek * dayMs;
  const pwStart = thisMonMs - 7 * dayMs;
  const pwEnd = thisMonMs - 1;
  const asiaStart = todayMidET - dayMs + 18 * hourMs;
  const asiaEnd = todayMidET + 2 * hourMs - 1;
  const londonStart = todayMidET + 3 * hourMs;
  const londonEnd = todayMidET + 8 * hourMs - 1;
  return { pdStart, pdEnd, pwStart, pwEnd, asiaStart, asiaEnd, londonStart, londonEnd, todayMidET };
}

export function findSessionExtreme(
  candles: Candle[],
  startMs: number,
  endMs: number
): SessionExtreme | null {
  let high = -Infinity;
  let low = Infinity;
  let highTime: number | null = null;
  let lowTime: number | null = null;
  for (const c of candles) {
    if (c.time < startMs || c.time > endMs) continue;
    if (c.high > high) { high = c.high; highTime = c.time; }
    if (c.low < low) { low = c.low; lowTime = c.time; }
  }
  if (high === -Infinity || low === Infinity) return null;
  return { high, low, highTime: highTime!, lowTime: lowTime! };
}

export function isLevelTapped(
  candles: Candle[],
  level: number,
  side: 'bsl' | 'ssl',
  sinceMs: number,
  tolPct: number = 0.0005
): boolean {
  for (const c of candles) {
    if (c.time <= sinceMs) continue;
    if (side === 'bsl' && c.high >= level * (1 + tolPct)) return true;
    if (side === 'ssl' && c.low <= level * (1 - tolPct)) return true;
  }
  return false;
}

export function extractLiquidityPools(
  dailyCandles: Candle[] | null,
  h1Candles: Candle[],
  currentPrice: number,
  etNow: Date,
  ctx: HeatContext = {}
): LiquidityPool[] {
  if (!h1Candles || h1Candles.length < 10 || !currentPrice) return [];
  const b = getSessionBoundaries(etNow);
  const nowMs = etNow.getTime();
  const pools: LiquidityPool[] = [];

  const pushPool = (tag: string, price: number, side: 'bsl' | 'ssl', formedMs: number, baseReason: string): void => {
    if (!price || !isFinite(price)) return;
    const tapPool = isLevelTapped(h1Candles, price, side, formedMs);
    if (tapPool) return;
    const distance = Math.abs(price - currentPrice);
    const distancePct = (distance / currentPrice) * 100;
    const hoursSince = Math.max(0, (nowMs - formedMs) / (60 * 60 * 1000));
    const reasons = [baseReason];
    if (hoursSince >= 1)
      reasons.push(
        `Untapped for ${hoursSince < 24 ? Math.round(hoursSince) + ' hrs' : Math.round(hoursSince / 24) + ' days'}`
      );
    pools.push({ tag, price, side, distance, distancePct, formedMs, hoursSince, reasons, heat: 0 });
  };

  const asia = findSessionExtreme(h1Candles, b.asiaStart, b.asiaEnd);
  if (asia) {
    pushPool('Asia H', asia.high, 'bsl', asia.highTime, 'Asian session high - common London/NY draw');
    pushPool('Asia L', asia.low, 'ssl', asia.lowTime, 'Asian session low - common London/NY draw');
  }

  const london = findSessionExtreme(h1Candles, b.londonStart, b.londonEnd);
  if (london) {
    pushPool('London H', london.high, 'bsl', london.highTime, 'London session high - often swept at NY open');
    pushPool('London L', london.low, 'ssl', london.lowTime, 'London session low - often swept at NY open');
  }

  const pd = findSessionExtreme(h1Candles, b.pdStart, b.pdEnd);
  if (pd) {
    pushPool('PDH', pd.high, 'bsl', pd.highTime, 'Prior day high - magnet level');
    pushPool('PDL', pd.low, 'ssl', pd.lowTime, 'Prior day low - magnet level');
  }

  if (dailyCandles && dailyCandles.length >= 10) {
    const pw = findSessionExtreme(dailyCandles, b.pwStart, b.pwEnd);
    if (pw) {
      pushPool('PWH', pw.high, 'bsl', pw.highTime, 'Prior week high - weekly draw on liquidity');
      pushPool('PWL', pw.low, 'ssl', pw.lowTime, 'Prior week low - weekly draw on liquidity');
    }
  }

  if (dailyCandles && dailyCandles.length >= 20) {
    const swings = findSwings(dailyCandles, 3);
    const highs = swings.highs || [];
    const lows = swings.lows || [];
    const eqH = findEqualLevels(highs);
    const eqL = findEqualLevels(lows);
    const nearestEqH = eqH
      .filter((e) => e.price > currentPrice)
      .sort((a, b) => a.price - currentPrice - (b.price - currentPrice))[0];
    const nearestEqL = eqL
      .filter((e) => e.price < currentPrice)
      .sort((a, b) => currentPrice - a.price - (currentPrice - b.price))[0];
    const proxyMs = nowMs - 48 * 60 * 60 * 1000;
    if (nearestEqH) pushPool('Eq. Highs', nearestEqH.price, 'bsl', proxyMs, 'Equal highs - strong resting buy stops');
    if (nearestEqL) pushPool('Eq. Lows', nearestEqL.price, 'ssl', proxyMs, 'Equal lows - strong resting sell stops');
  }

  for (const p of pools) scorePoolHeat(p, ctx);
  return pools;
}

export function scorePoolHeat(p: LiquidityPool, ctx: HeatContext): void {
  let h = 0;
  const baseMap: Record<string, number> = {
    'PDH': 25, 'PDL': 25, 'PWH': 20, 'PWL': 20,
    'Asia H': 15, 'Asia L': 15,
    'London H': 20, 'London L': 20,
    'Eq. Highs': 30, 'Eq. Lows': 30,
  };
  const base = baseMap[p.tag] || 10;
  h += base;
  const proxScore = 30 * (1 - Math.min(p.distancePct / 2.0, 1));
  h += proxScore;
  if (ctx.bias === 'BULLISH' && p.side === 'bsl') h += 15;
  if (ctx.bias === 'BEARISH' && p.side === 'ssl') h += 15;
  if (p.hoursSince >= 24) h += 10;
  if (ctx.sessionLabel === 'London' && (p.tag === 'Asia H' || p.tag === 'Asia L')) h += 10;
  if (
    (ctx.sessionLabel === 'New York' || ctx.sessionLabel === 'London/NY Overlap') &&
    (p.tag === 'London H' || p.tag === 'London L')
  )
    h += 12;
  p.heat = Math.max(0, Math.min(100, Math.round(h)));
  if (ctx.bias === 'BULLISH' && p.side === 'bsl') p.reasons.push('Aligned with bullish bias');
  if (ctx.bias === 'BEARISH' && p.side === 'ssl') p.reasons.push('Aligned with bearish bias');
}
