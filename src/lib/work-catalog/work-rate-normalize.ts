/**
 * WORK-CATALOG-REBUILD-01 P0 — normalize OUR RATE + historia (cap 24).
 * OSOBNA od marketQuoteHistory — ZERO kontaminacji Price Memory.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  OUR_WORK_RATE_HISTORY_CAP,
  WORK_RATE_REGION_SCOPES,
  type OurWorkRate,
  type OurWorkRateHistoryEntry,
  type WorkRateHistoryKind,
  type WorkRateRegionScope,
  type WorkRateSourceType,
} from "@/lib/work-catalog/work-rate-types";

const VALID_UNITS: WgdomCostUnit[] = ["m2", "mb", "szt", "rbh", "m3", "kpl", "kg", "l"];
const VALID_SOURCE_TYPES: WorkRateSourceType[] = ["OWNER", "ACCEPT", "CALCULATED", "RESEARCH"];
const VALID_KINDS: WorkRateHistoryKind[] = ["OUR", "SOURCE"];

function isValidUnit(value: unknown): value is WgdomCostUnit {
  return typeof value === "string" && (VALID_UNITS as readonly string[]).includes(value);
}

function isValidRegionScope(value: unknown): value is WorkRateRegionScope {
  return (
    typeof value === "string" &&
    (WORK_RATE_REGION_SCOPES as readonly string[]).includes(value)
  );
}

function isValidSourceType(value: unknown): value is WorkRateSourceType {
  return (
    typeof value === "string" &&
    (VALID_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

function isValidKind(value: unknown): value is WorkRateHistoryKind {
  return typeof value === "string" && (VALID_KINDS as readonly string[]).includes(value);
}

function roundRatePln(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeOurWorkRateHistoryEntry(
  raw: unknown,
  fallbackWorkId: string,
  fallbackUnit: WgdomCostUnit,
): OurWorkRateHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<OurWorkRateHistoryEntry>;
  const ratePln = Number(e.ratePln);
  if (!Number.isFinite(ratePln) || !(ratePln > 0)) return null;
  if (!isValidSourceType(e.sourceType)) return null;
  if (!isValidRegionScope(e.regionScope)) return null;
  if (!isValidKind(e.kind)) return null;
  const observedAt = typeof e.observedAt === "string" ? e.observedAt.trim() : "";
  if (!observedAt) return null;
  const workId =
    typeof e.workId === "string" && e.workId.trim() ? e.workId.trim() : fallbackWorkId;
  const unit = isValidUnit(e.unit) ? e.unit : fallbackUnit;
  const changePln = Number(e.changePln);
  return {
    workId,
    unit,
    ratePln: roundRatePln(ratePln),
    kind: e.kind,
    sourceType: e.sourceType,
    regionScope: e.regionScope,
    observedAt,
    ...(Number.isFinite(changePln) ? { changePln: roundRatePln(changePln) } : {}),
  };
}

/** Cap 24 — najnowsze na końcu; przy nadmiarze trim od początku. */
export function capOurWorkRateHistory(
  entries: readonly OurWorkRateHistoryEntry[],
  cap: number = OUR_WORK_RATE_HISTORY_CAP,
): OurWorkRateHistoryEntry[] {
  if (entries.length <= cap) return [...entries];
  return entries.slice(entries.length - cap);
}

export function normalizeOurWorkRateHistory(
  raw: unknown,
  fallbackWorkId: string,
  fallbackUnit: WgdomCostUnit,
): OurWorkRateHistoryEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: OurWorkRateHistoryEntry[] = [];
  for (const row of raw) {
    const entry = normalizeOurWorkRateHistoryEntry(row, fallbackWorkId, fallbackUnit);
    if (entry) out.push(entry);
  }
  return capOurWorkRateHistory(out);
}

/**
 * Normalize additive OUR RATE. Brak / niepoprawne ⇒ undefined (C-EMPTY).
 * NIGDY nie syntezuje z companyPricePln.
 */
export function normalizeOurWorkRate(
  raw: unknown,
  fallbackWorkId: string,
  fallbackUnit: WgdomCostUnit,
): OurWorkRate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<OurWorkRate>;
  const ourRatePln = Number(r.ourRatePln);
  if (!Number.isFinite(ourRatePln) || !(ourRatePln > 0)) return undefined;
  if (!isValidSourceType(r.sourceType)) return undefined;
  if (!isValidRegionScope(r.regionScope)) return undefined;
  const observedAt = typeof r.observedAt === "string" ? r.observedAt.trim() : "";
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt.trim() : "";
  if (!observedAt || !updatedAt) return undefined;

  const workId =
    typeof r.workId === "string" && r.workId.trim() ? r.workId.trim() : fallbackWorkId;
  const unit = isValidUnit(r.unit) ? r.unit : fallbackUnit;
  if (workId !== fallbackWorkId) return undefined;
  if (unit !== fallbackUnit) return undefined;

  const sourceRatePln = Number(r.sourceRatePln);
  const history = normalizeOurWorkRateHistory(r.history, workId, unit);

  return {
    workId,
    unit,
    ourRatePln: roundRatePln(ourRatePln),
    sourceType: r.sourceType,
    regionScope: r.regionScope,
    observedAt,
    updatedAt,
    ...(Number.isFinite(sourceRatePln) && sourceRatePln > 0
      ? { sourceRatePln: roundRatePln(sourceRatePln) }
      : {}),
    history,
  };
}

export function appendOurWorkRateHistory(
  previous: readonly OurWorkRateHistoryEntry[] | undefined,
  entry: OurWorkRateHistoryEntry,
): OurWorkRateHistoryEntry[] {
  return capOurWorkRateHistory([...(previous ?? []), entry]);
}
