/**
 * WR-SOURCE-EVIDENCE-DB-01 — deterministic dedupeKey (not price-only).
 */

function normToken(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(String(url || "").trim());
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return normToken(url);
  }
}

function pricePart(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "";
  return String(Math.round(Number(v) * 100) / 100);
}

export function buildLaborSourceEvidenceDedupeKey(input: {
  workId: string | null;
  sourceId: string;
  sourceUrl: string;
  observedName: string;
  unit: string;
  region: string;
  priceKind: string;
  priceMin: number | null;
  priceMax: number | null;
  pricePoint: number | null;
}): string {
  const work = input.workId?.trim() ? normToken(input.workId) : "unmatched";
  const sourceId = String(input.sourceId || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "");
  return [
    work,
    sourceId,
    normalizeUrl(input.sourceUrl),
    normToken(input.observedName),
    normToken(input.unit),
    normToken(input.region),
    normToken(input.priceKind),
    pricePart(input.priceMin),
    pricePart(input.priceMax),
    pricePart(input.pricePoint),
  ].join("|");
}
