/**
 * COSTORYS-UX-01 WAVE 2 — pure UI helpers (density · search · sort).
 * Bez logiki Bid / OfferBoq engines / COST-PIPELINE.
 */

import { filterOfferBoqLinesReviewOnly } from "@/app/kosztorys/offer-boq-ux-wave1";

export type OfferBoqDensityMode = "compact" | "comfort";
export type OfferBoqSortKey = "lp" | "direct" | "confidence";
export type OfferBoqSortDir = "asc" | "desc";

export const OFFER_BOQ_COMPACT_THRESHOLD = 50;

/** Szacunek wysokości wiersza (px) — AC-D4 viewport density. */
export const OFFER_BOQ_COMPACT_ROW_EST_PX = 48;
export const OFFER_BOQ_COMFORT_ROW_EST_PX = 148;

export function defaultOfferBoqDensity(lineCount: number): OfferBoqDensityMode {
  return lineCount >= OFFER_BOQ_COMPACT_THRESHOLD ? "compact" : "comfort";
}

/** Ile wierszy mieści się w viewportHeight (AC-D4). */
export function estimateVisibleLineCount(
  density: OfferBoqDensityMode,
  viewportHeightPx: number,
): number {
  const row = density === "compact" ? OFFER_BOQ_COMPACT_ROW_EST_PX : OFFER_BOQ_COMFORT_ROW_EST_PX;
  return Math.max(0, Math.floor(viewportHeightPx / row));
}

export interface OfferBoqVisibleLineInput {
  lineId: string;
  lp: string;
  description: string;
  requiresUserReview?: boolean;
  lineDirectDisplay?: string;
  /** Opcjonalne pole numeryczne — preferowane przy sort direct. */
  lineDirectPln?: number | null;
  confidenceBadge?: { status: "high" | "review" | "low" };
}

export interface BuildOfferBoqVisibleLinesArgs<T extends OfferBoqVisibleLineInput> {
  lines: T[];
  reviewOnly: boolean;
  searchQuery: string;
  sortKey: OfferBoqSortKey;
  sortDir: OfferBoqSortDir;
}

/** Parse display PLN (fmtPln) → number; „—” → NaN. */
export function parseOfferBoqDirectPln(display: string | undefined | null): number {
  if (display == null) return Number.NaN;
  const raw = String(display).trim();
  if (!raw || raw === "—") return Number.NaN;
  // pl-PL: "12 400,50 zł" / "12 400,50"
  const digits = raw
    .replace(/\s/g, "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=.*[,.])/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : Number.NaN;
}

function confidenceRank(status: "high" | "review" | "low" | undefined): number {
  if (status === "low") return 0;
  if (status === "review") return 1;
  if (status === "high") return 2;
  return 1;
}

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase();
}

export function lineMatchesOfferBoqSearch(
  line: Pick<OfferBoqVisibleLineInput, "lp" | "description">,
  searchQuery: string,
): boolean {
  const q = normalizeSearch(searchQuery);
  if (!q) return true;
  const lp = String(line.lp ?? "").toLowerCase();
  const desc = String(line.description ?? "").toLowerCase();
  return lp.includes(q) || desc.includes(q);
}

function resolveDirectPln(line: OfferBoqVisibleLineInput): number {
  if (typeof line.lineDirectPln === "number" && Number.isFinite(line.lineDirectPln)) {
    return line.lineDirectPln;
  }
  return parseOfferBoqDirectPln(line.lineDirectDisplay);
}

function compareLines(
  a: OfferBoqVisibleLineInput,
  b: OfferBoqVisibleLineInput,
  sortKey: OfferBoqSortKey,
  sortDir: OfferBoqSortDir,
): number {
  const dir = sortDir === "desc" ? -1 : 1;
  let cmp = 0;
  if (sortKey === "lp") {
    cmp = String(a.lp ?? "").localeCompare(String(b.lp ?? ""), "pl", {
      numeric: true,
      sensitivity: "base",
    });
  } else if (sortKey === "direct") {
    const da = resolveDirectPln(a);
    const db = resolveDirectPln(b);
    const aOk = Number.isFinite(da);
    const bOk = Number.isFinite(db);
    if (!aOk && !bOk) cmp = 0;
    else if (!aOk) cmp = 1;
    else if (!bOk) cmp = -1;
    else cmp = da - db;
  } else {
    cmp =
      confidenceRank(a.confidenceBadge?.status) - confidenceRank(b.confidenceBadge?.status);
  }
  if (cmp !== 0) return cmp * dir;
  return String(a.lineId).localeCompare(String(b.lineId));
}

/**
 * Pipeline: review → search → sort → (caller renders).
 * Pure — nie mutuje `lines`.
 */
export function buildOfferBoqVisibleLines<T extends OfferBoqVisibleLineInput>(
  args: BuildOfferBoqVisibleLinesArgs<T>,
): T[] {
  const afterReview = filterOfferBoqLinesReviewOnly(args.lines, args.reviewOnly);
  const afterSearch = afterReview.filter((line) =>
    lineMatchesOfferBoqSearch(line, args.searchQuery),
  );
  const sorted = [...afterSearch];
  sorted.sort((a, b) => compareLines(a, b, args.sortKey, args.sortDir));
  return sorted;
}
