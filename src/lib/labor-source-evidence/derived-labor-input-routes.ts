/**
 * OFN-01 — Owner GO Derived Labor Input Routes (exact URL + sourceId).
 * Explicit auditable allowlist for multi-source derivation inputs.
 * ZERO wildcards · ZERO host-wide open · ZERO internet dump.
 *
 * TPI/729 example routes (Owner GO IMPLEMENT OFN-01):
 *   · finn.pl — KNR 2-02 0815-04 labor norm 0.5093 r-g/m²
 *   · bzg.pl — Cr Q2 2026 = 52.30 PLN/r-g (INTERCENBUD published via BZG)
 */

import { normalizeOwnerLaborEvidenceUrl } from "@/lib/labor-source-evidence/owner-authorized-routes";
import type { DerivedLaborInputRole } from "@/lib/labor-source-evidence/types";

export const OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED =
  "OWNER_AUTHORIZED_DERIVED_LABOR_INPUT_ROUTE" as const;

export type OwnerDerivedLaborInputSourceId =
  | "finn_kosztorys_nakladowy_0815_04_norm"
  | "bzg_tynkarskie_cr_q2_2026";

export type OwnerDerivedLaborInputRoute = {
  sourceId: OwnerDerivedLaborInputSourceId;
  url: string;
  host: string;
  role: DerivedLaborInputRole;
  ownerStatus: typeof OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED;
  documentObservedAt: string | null;
  periodLabel: string | null;
  notePl: string;
};

export const OWNER_DERIVED_LABOR_INPUT_ROUTES = Object.freeze([
  Object.freeze({
    sourceId: "finn_kosztorys_nakladowy_0815_04_norm",
    url: "https://res.finn.pl/eurzad/341/3/11099/kosztorys%20%20nak%C5%82adczy.pdf",
    host: "res.finn.pl",
    role: "labor_norm" as const,
    ownerStatus: OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
    documentObservedAt: null,
    periodLabel: null,
    notePl:
      "res.finn.pl kosztorys nakładowy — KNR 2-02 0815-04 labor norm 0.5093 r-g/m² (input A · ≠ OUR RATE).",
  }),
  Object.freeze({
    sourceId: "bzg_tynkarskie_cr_q2_2026",
    url: "https://bzg.pl/poradnik/artykul/sporzadzanie-przedmiaru-i-kosztorysu-robot-tynkarskich/id/72106",
    host: "bzg.pl",
    role: "labor_cost_rate" as const,
    ownerStatus: OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
    documentObservedAt: "2026-04-01T00:00:00.000Z",
    periodLabel: "Q2 2026",
    notePl:
      "BZG poradnik — Cr Q2 2026 = 52.30 PLN/r-g (INTERCENBUD · input B · ≠ OUR RATE).",
  }),
] satisfies readonly OwnerDerivedLaborInputRoute[]);

/** Composite top-level sourceId for LABOR_NORM_X_RATE derived observations. */
export const DERIVED_LABOR_COMPOSITE_SOURCE_ID = "derived_labor_norm_x_rate_v1" as const;

export function isOwnerDerivedLaborInputSourceId(
  sourceId: string,
): sourceId is OwnerDerivedLaborInputSourceId {
  return OWNER_DERIVED_LABOR_INPUT_ROUTES.some(
    (r) => r.sourceId === String(sourceId || "").trim(),
  );
}

export function isDerivedLaborCompositeSourceId(sourceId: string): boolean {
  return String(sourceId || "").trim() === DERIVED_LABOR_COMPOSITE_SOURCE_ID;
}

export function resolveOwnerDerivedLaborInputRoute(
  sourceId: string,
): OwnerDerivedLaborInputRoute | null {
  return (
    OWNER_DERIVED_LABOR_INPUT_ROUTES.find(
      (r) => r.sourceId === String(sourceId || "").trim(),
    ) ?? null
  );
}

export function resolveOwnerDerivedLaborInputRouteByUrl(
  urlStr: string,
): OwnerDerivedLaborInputRoute | null {
  const n = normalizeOwnerLaborEvidenceUrl(urlStr);
  return (
    OWNER_DERIVED_LABOR_INPUT_ROUTES.find(
      (r) => normalizeOwnerLaborEvidenceUrl(r.url) === n,
    ) ?? null
  );
}

export function listOwnerDerivedLaborInputSourceIds(): readonly OwnerDerivedLaborInputSourceId[] {
  return OWNER_DERIVED_LABOR_INPUT_ROUTES.map((r) => r.sourceId);
}

export function extractHostFromUrl(urlStr: string): string {
  try {
    return new URL(String(urlStr || "").trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
