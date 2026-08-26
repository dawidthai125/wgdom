/**
 * A08-P3 IC-P3-LABOR-IDEM-1 — thin idempotency guard at P3 integration boundary.
 * Does NOT change acceptWorkRateResearchCandidate semantics.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";

function roundRatePln(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Stable acceptance identity: workId + unit + marketBase + observation fingerprint. */
export function buildLaborCandidateAcceptFingerprint(
  candidate: WorkRateResearchCandidate,
): string {
  const obsFp = [...candidate.observations]
    .map(
      (o) =>
        `${roundRatePln(o.ratePln)}:${String(o.observedAt ?? "")}:${String(o.regionScope ?? "")}`,
    )
    .sort()
    .join("|");
  return `${candidate.workId.trim()}|${candidate.unit}|${roundRatePln(candidate.marketBaseRatePln)}|${obsFp}`;
}

function findWorkOurRate(
  store: WorkCatalogStore,
  workId: string,
  unit: WorkRateResearchCandidate["unit"],
): { ourRatePln: number; sourceType: string } | null {
  const id = workId.trim();
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const work = store.catalogs[region].works.find((w) => w.id === id);
    if (!work) continue;
    if (work.unit !== unit) return null;
    const rate = work.ourWorkRate;
    if (!rate || !Number.isFinite(rate.ourRatePln) || !(rate.ourRatePln > 0)) {
      return null;
    }
    return { ourRatePln: roundRatePln(rate.ourRatePln), sourceType: rate.sourceType };
  }
  return null;
}

/**
 * True when the same candidate was already accepted: OUR RATE equals market base
 * for workId+unit and history reflects this candidate fingerprint.
 */
export function isLaborAcceptIdempotentNoop(
  store: WorkCatalogStore,
  candidate: WorkRateResearchCandidate,
): boolean {
  const current = findWorkOurRate(store, candidate.workId, candidate.unit);
  if (!current) return false;
  if (current.sourceType !== "ACCEPT") return false;
  const marketBase = roundRatePln(candidate.marketBaseRatePln);
  if (Math.abs(current.ourRatePln - marketBase) > 0.009) return false;

  const workId = candidate.workId.trim();
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const work = store.catalogs[region].works.find((w) => w.id === workId);
    const history = work?.ourWorkRate?.history ?? [];
    const sourceObs = history
      .filter((h) => h.kind === "SOURCE" && h.sourceType === "RESEARCH")
      .map(
        (h) =>
          `${roundRatePln(h.ratePln)}:${String(h.observedAt ?? "")}:${String(h.regionScope ?? "")}`,
      )
      .sort();
    const candidateObs = [...candidate.observations]
      .map(
        (o) =>
          `${roundRatePln(o.ratePln)}:${String(o.observedAt ?? "")}:${String(o.regionScope ?? "")}`,
      )
      .sort();
    if (sourceObs.length > 0 && candidateObs.length > 0) {
      if (sourceObs.join("|") === candidateObs.join("|")) return true;
    }
    // Fallback: market base + ACCEPT sourceType match (single-path accept without obs drift).
    if (candidateObs.length === 0 && current.ourRatePln === marketBase) {
      return true;
    }
  }
  return false;
}
