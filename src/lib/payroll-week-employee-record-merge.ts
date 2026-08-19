/**
 * PAYROLL-DI-P0 — SSOT merge WeekEmployee record (client + Edge parity).
 * Per-day updatedAt (DF-11) + settled/rate LWW + clear-wins (DF-09).
 */

export type PayrollDayLike = {
  active?: boolean;
  from?: string;
  to?: string;
  extraHours?: unknown[];
  notes?: unknown[];
  zaliczka?: string;
  /** ISO — per-day mutation timestamp (P0 data integrity). */
  updatedAt?: string;
};

export function parsePayrollRecordTs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

export function payrollDayRichness(d: PayrollDayLike | undefined): number {
  if (!d) return 0;
  let s = 0;
  if (d.active) s += 2;
  if (d.from || d.to) s += 1;
  s += (d.extraHours?.length ?? 0) * 8;
  s += (d.notes?.length ?? 0) * 4;
  if (parseFloat(String(d.zaliczka || "")) > 0) s += 1;
  return s;
}

/** Default roster template — inactive with factory hours; not a conscious user clear. */
export function isPayrollDefaultInactiveDay(d: PayrollDayLike | undefined): boolean {
  if (!d || d.active === true) return false;
  if ((d.extraHours?.length ?? 0) > 0) return false;
  if (parsePayrollRecordTs(d.updatedAt) > 0) return false;
  const from = String(d.from ?? "07:00");
  const to = String(d.to ?? "16:00");
  const zal = String(d.zaliczka ?? "").trim();
  return from === "07:00" && to === "16:00" && zal === "";
}

/** Dzień wyzerowany — świadomy clear (USER INTENTION > RICHNESS). */
export function isPayrollZeroedDay(d: PayrollDayLike | undefined): boolean {
  if (!d) return true;
  if (d.active === true) return false;
  if ((d.extraHours?.length ?? 0) > 0) return false;
  if (parsePayrollRecordTs(d.updatedAt) > 0) return true;
  if (isPayrollDefaultInactiveDay(d)) return false;
  return true;
}

export function mergePayrollDaysByRichness(
  lDays: Record<string, PayrollDayLike>,
  cDays: Record<string, PayrollDayLike>,
): Record<string, PayrollDayLike> {
  const keys = new Set([...Object.keys(lDays), ...Object.keys(cDays)]);
  const out: Record<string, PayrollDayLike> = {};
  for (const key of keys) {
    const ld = lDays[key];
    const cd = cDays[key];
    if (!ld && cd) {
      out[key] = cd;
      continue;
    }
    if (ld && !cd) {
      out[key] = ld;
      continue;
    }
    if (!ld && !cd) continue;
    if (isPayrollZeroedDay(ld) && !isPayrollZeroedDay(cd)) {
      out[key] = ld!;
      continue;
    }
    if (!isPayrollZeroedDay(ld) && isPayrollZeroedDay(cd)) {
      out[key] = cd!;
      continue;
    }
    const lr = payrollDayRichness(ld);
    const cr = payrollDayRichness(cd);
    if (lr > cr) out[key] = ld!;
    else if (cr > lr) out[key] = cd!;
    else out[key] = ld!;
  }
  return out;
}

function mergeSingleDay(l: PayrollDayLike | undefined, c: PayrollDayLike | undefined): PayrollDayLike | undefined {
  if (!l && !c) return undefined;
  if (l && !c) return l;
  if (!l && c) return c;
  const lAt = parsePayrollRecordTs(l!.updatedAt);
  const cAt = parsePayrollRecordTs(c!.updatedAt);
  if (lAt > 0 || cAt > 0) {
    if (lAt > cAt) return l!;
    if (cAt > lAt) return c!;
    return mergePayrollDaysByRichness({ x: l! }, { x: c! }).x ?? l!;
  }
  return mergePayrollDaysByRichness({ x: l! }, { x: c! }).x ?? l!;
}

export function pickPayrollDaysByTimestamps(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
): Record<string, PayrollDayLike> {
  const lDays = (l.days as Record<string, PayrollDayLike>) || {};
  const cDays = (c.days as Record<string, PayrollDayLike>) || {};
  const hasPerDayTs = [...Object.keys(lDays), ...Object.keys(cDays)].some((k) => {
    const ld = lDays[k];
    const cd = cDays[k];
    return parsePayrollRecordTs(ld?.updatedAt) > 0 || parsePayrollRecordTs(cd?.updatedAt) > 0;
  });

  if (hasPerDayTs) {
    const keys = new Set([...Object.keys(lDays), ...Object.keys(cDays)]);
    const out: Record<string, PayrollDayLike> = {};
    for (const key of keys) {
      const merged = mergeSingleDay(lDays[key], cDays[key]);
      if (merged) out[key] = merged;
    }
    return out;
  }

  const lAt = parsePayrollRecordTs(l.dataUpdatedAt);
  const cAt = parsePayrollRecordTs(c.dataUpdatedAt);
  if (lAt > cAt) return { ...cDays, ...lDays };
  if (cAt > lAt) return { ...lDays, ...cDays };
  return mergePayrollDaysByRichness(lDays, cDays);
}

function pickRateByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): unknown {
  const lAt = parsePayrollRecordTs(l.rateUpdatedAt);
  const cAt = parsePayrollRecordTs(c.rateUpdatedAt);
  if (lAt && cAt && lAt !== cAt) return lAt > cAt ? l.rate : c.rate;
  if (lAt && !cAt) return l.rate;
  if (cAt && !lAt) return c.rate;
  if (l.rate !== undefined && String(l.rate).trim() !== "") return l.rate;
  if (c.rate !== undefined && String(c.rate).trim() !== "") return c.rate;
  return c.rate;
}

function isLikelySpuriousUnsettle(rec: Record<string, unknown>): boolean {
  if (Boolean(rec.settled)) return false;
  const sAt = parsePayrollRecordTs(rec.settledUpdatedAt);
  const dAt = parsePayrollRecordTs(rec.dataUpdatedAt);
  if (sAt <= 0 || dAt <= 0) return false;
  return Math.abs(sAt - dAt) <= 1500;
}

function pickSettledUpdatedAtForMerge(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
  settled: boolean,
): string | undefined {
  const lAt = parsePayrollRecordTs(l.settledUpdatedAt);
  const cAt = parsePayrollRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (settled) {
    if (lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt as string | undefined;
    if (cSettled) return c.settledUpdatedAt as string | undefined;
  } else {
    if (!lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt as string | undefined;
    if (!cSettled) return c.settledUpdatedAt as string | undefined;
  }
  return lAt >= cAt
    ? (l.settledUpdatedAt ?? c.settledUpdatedAt) as string | undefined
    : (c.settledUpdatedAt ?? l.settledUpdatedAt) as string | undefined;
}

export function pickPayrollSettledByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): boolean {
  const lAt = parsePayrollRecordTs(l.settledUpdatedAt);
  const cAt = parsePayrollRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (lAt > 0 || cAt > 0) {
    if (lAt > cAt) return lSettled;
    if (cAt > lAt) {
      if (!cSettled && lSettled && isLikelySpuriousUnsettle(c)) return true;
      if (!lSettled && cSettled && isLikelySpuriousUnsettle(l)) return false;
      return cSettled;
    }
    return lSettled;
  }
  return lSettled || cSettled;
}

type PayrollCarryForwardLike = { amount?: number; createdAt?: string };

function pickPayrollCarryForward(l: Record<string, unknown>, c: Record<string, unknown>): PayrollCarryForwardLike | undefined {
  const lCf = l.payrollCarryForward as PayrollCarryForwardLike | undefined;
  const cCf = c.payrollCarryForward as PayrollCarryForwardLike | undefined;
  const lAmt = lCf?.amount ?? 0;
  const cAmt = cCf?.amount ?? 0;
  if (lAmt > 0 && cAmt <= 0) return lCf;
  if (cAmt > 0 && lAmt <= 0) return cCf;
  if (lAmt > 0 && cAmt > 0) {
    const lAt = parsePayrollRecordTs(lCf?.createdAt);
    const cAt = parsePayrollRecordTs(cCf?.createdAt);
    return lAt >= cAt ? lCf : cCf;
  }
  return undefined;
}

function pickPrevSaturdayByTimestamps(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
): PayrollDayLike | undefined {
  const lps = l.prevSaturday as PayrollDayLike | undefined;
  const cps = c.prevSaturday as PayrollDayLike | undefined;
  const merged = mergeSingleDay(lps, cps);
  if (merged) return merged;
  const lAt = parsePayrollRecordTs(l.dataUpdatedAt);
  const cAt = parsePayrollRecordTs(c.dataUpdatedAt);
  if (lAt > cAt) return lps !== undefined ? lps : cps;
  if (cAt > lAt) return cps !== undefined ? cps : lps;
  return mergePayrollDaysByRichness(
    lps ? { prev: lps } : {},
    cps ? { prev: cps } : {},
  ).prev ?? lps ?? cps;
}

/** Canonical per-record merge — SSOT for client pull and Edge write-on-merge. */
export function mergeWeekEmployeeRecord(local: unknown, cloud: unknown): unknown {
  const l = local as Record<string, unknown>;
  const c = cloud as Record<string, unknown>;

  const days = pickPayrollDaysByTimestamps(l, c);
  const prevSaturday = pickPrevSaturdayByTimestamps(l, c);

  const lAt = parsePayrollRecordTs(l.dataUpdatedAt);
  const cAt = parsePayrollRecordTs(c.dataUpdatedAt);
  const extraCosts =
    lAt >= cAt
      ? Array.isArray(l.extraCosts)
        ? l.extraCosts
        : Array.isArray(c.extraCosts)
          ? c.extraCosts
          : []
      : Array.isArray(c.extraCosts)
        ? c.extraCosts
        : Array.isArray(l.extraCosts)
          ? l.extraCosts
          : [];

  const rate = pickRateByTimestamps(l, c);
  const lRateAt = parsePayrollRecordTs(l.rateUpdatedAt);
  const cRateAt = parsePayrollRecordTs(c.rateUpdatedAt);
  const dataWinner = lAt >= cAt ? l : c;
  const settled = pickPayrollSettledByTimestamps(l, c);

  return {
    ...c,
    ...l,
    ...dataWinner,
    days,
    prevSaturday,
    extraCosts,
    rate,
    rateUpdatedAt: lRateAt >= cRateAt ? l.rateUpdatedAt ?? c.rateUpdatedAt : c.rateUpdatedAt ?? l.rateUpdatedAt,
    dataUpdatedAt: lAt >= cAt ? l.dataUpdatedAt ?? c.dataUpdatedAt : c.dataUpdatedAt ?? l.dataUpdatedAt,
    settled,
    settledUpdatedAt: pickSettledUpdatedAtForMerge(l, c, settled),
    payrollCarryForward: pickPayrollCarryForward(l, c),
  };
}
