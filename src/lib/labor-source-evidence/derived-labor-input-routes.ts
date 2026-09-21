/**
 * OFN-01 — Owner GO Derived Labor Input Routes (exact URL + sourceId).
 * Explicit auditable allowlist for multi-source derivation inputs.
 * ZERO wildcards · ZERO host-wide open · ZERO internet dump.
 *
 * TPI/729 example routes (Owner GO IMPLEMENT OFN-01):
 *   · finn.pl — KNR 2-02 0815-04 labor norm 0.5093 r-g/m²
 *   · bzg.pl — Cr Q2 2026 = 52.30 PLN/r-g (INTERCENBUD published via BZG)
 *   · BIP Kobylin — KNR 2-02 1118-09 labor norm 1.0664 r-g/m² (PRICE PERSISTENCE)
 *   · SR Zielona Góra — KNR-W 2-02 2003-03 labor norm 2.27 r-g/m² (PRICE PERSISTENCE)
 */

import { normalizeOwnerLaborEvidenceUrl } from "@/lib/labor-source-evidence/owner-authorized-routes";
import type { DerivedLaborInputRole } from "@/lib/labor-source-evidence/types";

export const OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED =
  "OWNER_AUTHORIZED_DERIVED_LABOR_INPUT_ROUTE" as const;

export type OwnerDerivedLaborInputSourceId =
  | "finn_kosztorys_nakladowy_0815_04_norm"
  | "bzg_tynkarskie_cr_q2_2026"
  | "bip_kobylin_1118_09_labor_norm"
  | "sr_zielona_gora_2003_03_labor_norm";

export type OwnerDerivedLaborInputRoute = {
  sourceId: OwnerDerivedLaborInputSourceId;
  url: string;
  host: string;
  role: DerivedLaborInputRole;
  ownerStatus: typeof OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED;
  documentObservedAt: string | null;
  periodLabel: string | null;
  notePl: string;
  /**
   * Optional exact-leaf bind — when set, derived upsert may only attach this
   * input to the listed workId + unit (PRICE PERSISTENCE · no KNR lookalike).
   */
  boundWorkId?: string | null;
  boundUnit?: string | null;
};

export const OWNER_DERIVED_LABOR_INPUT_ROUTES = Object.freeze([
  Object.freeze({
    sourceId: "finn_kosztorys_nakladowy_0815_04_norm",
    url: "https://res.finn.pl/eurzad/341/3/11099/kosztorys%20%20nak%C5%82adowy.pdf",
    host: "res.finn.pl",
    role: "labor_norm" as const,
    ownerStatus: OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
    documentObservedAt: null,
    periodLabel: null,
    notePl:
      "res.finn.pl kosztorys nakładowy — KNR 2-02 0815-04 labor norm 0.5093 r-g/m² (input A · ≠ OUR RATE).",
    boundWorkId: null,
    boundUnit: null,
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
    boundWorkId: null,
    boundUnit: null,
  }),
  Object.freeze({
    sourceId: "bip_kobylin_1118_09_labor_norm",
    url: "https://kobylin.bip.net.pl/?action=save&bar_id=730&id=739&p=document",
    host: "kobylin.bip.net.pl",
    role: "labor_norm" as const,
    ownerStatus: OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
    documentObservedAt: null,
    periodLabel: null,
    notePl:
      "BIP Kobylin — KNR 2-02 1118-09 labor norm 1.0664 r-g/m² (PRICE PERSISTENCE · ≠ OUR RATE · leaf-only).",
    boundWorkId: "cw.knr.knr-2-02.1118-09.m2",
    boundUnit: "m2",
  }),
  Object.freeze({
    sourceId: "sr_zielona_gora_2003_03_labor_norm",
    url: "https://zielona-gora.sr.gov.pl/download.php?id=2073&inst=1",
    host: "zielona-gora.sr.gov.pl",
    role: "labor_norm" as const,
    ownerStatus: OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
    documentObservedAt: null,
    periodLabel: null,
    notePl:
      "SR Zielona Góra — KNR-W 2-02 2003-03 labor norm 2.27 r-g/m² (PRICE PERSISTENCE · ≠ OUR RATE · leaf-only · ≠ package).",
    boundWorkId: "cw.knr.knr-2-02.2003-03.m2",
    boundUnit: "m2",
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

/**
 * When a derived input route declares boundWorkId / boundUnit, the observation
 * must match — prevents KNR lookalike reuse across leaves.
 */
export function assertOwnerDerivedLaborInputLeafBind(input: {
  sourceId: string;
  workId: string | null | undefined;
  unit: string | null | undefined;
}): { ok: true } | { ok: false; messagePl: string } {
  const route = resolveOwnerDerivedLaborInputRoute(input.sourceId);
  if (!route) return { ok: true };
  const boundId = String(route.boundWorkId || "").trim();
  const boundUnit = String(route.boundUnit || "").trim().toLowerCase();
  if (!boundId && !boundUnit) return { ok: true };
  const workId = String(input.workId || "").trim();
  const unit = String(input.unit || "").trim().toLowerCase();
  if (boundId && workId !== boundId) {
    return {
      ok: false,
      messagePl: `Derived input „${route.sourceId}” bound to workId „${boundId}” — got „${workId || "(empty)"}” — HOLD.`,
    };
  }
  if (boundUnit && unit !== boundUnit) {
    return {
      ok: false,
      messagePl: `Derived input „${route.sourceId}” bound to unit „${boundUnit}” — got „${unit || "(empty)"}” — HOLD.`,
    };
  }
  return { ok: true };
}

export function extractHostFromUrl(urlStr: string): string {
  try {
    return new URL(String(urlStr || "").trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
