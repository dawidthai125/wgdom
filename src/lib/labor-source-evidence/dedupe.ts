/**
 * WR-SOURCE-EVIDENCE-DB-01 — deterministic dedupeKey (not price-only).
 * OFN-01: derived observations include formula + input fingerprint
 * so same result with different inputs does NOT collide.
 */

import type { LaborSourceEvidenceDerivation } from "@/lib/labor-source-evidence/types";

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

/** Fingerprint of derivation inputs — order-independent by role+sourceId. */
export function buildDerivedLaborDerivationFingerprint(
  derivation: LaborSourceEvidenceDerivation | null | undefined,
): string {
  if (!derivation || !Array.isArray(derivation.inputs)) return "";
  const parts = derivation.inputs
    .map((i) =>
      [
        normToken(i.role),
        normToken(i.sourceId),
        normalizeUrl(i.sourceUrl),
        pricePart(i.inputValue),
        normToken(i.inputUnit),
        asIsoDay(i.observedAt),
      ].join(":"),
    )
    .sort();
  return [
    normToken(derivation.formulaId),
    normToken(derivation.formulaVersion),
    ...parts,
  ].join("|");
}

function asIsoDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return normToken(iso);
  return new Date(t).toISOString().slice(0, 10);
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
  derivation?: LaborSourceEvidenceDerivation | null;
}): string {
  const work = input.workId?.trim() ? normToken(input.workId) : "unmatched";
  const sourceId = String(input.sourceId || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "");
  const base = [
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
  ];
  if (input.priceKind === "derived") {
    const fp = buildDerivedLaborDerivationFingerprint(input.derivation);
    base.push(fp || "missing-derivation");
  }
  return base.join("|");
}
