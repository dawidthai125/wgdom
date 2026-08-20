/**
 * IK-KNR KL-0 — Identity v2 (extensible · OPEN until OD-KNR-SAMPLE-1 / OD-KNR-ID-1).
 *
 * Slice A catalogBasis.normalizedKey = evidenceKeyV1 hint only — NOT VERIFIED catalog key.
 * Does NOT mutate catalogBasis · knrHint · catalogWorkId.
 */

import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogFamily } from "./types";

/** Fields marked optional may remain OPEN until real licensed export sample. */
export type KnrIdentityV2 = {
  family: KnrCatalogFamily;
  catalog: string;
  /** OPEN — likely REQUIRED for VERIFIED after sample (OD-KNR-ID-1). */
  publisher?: string | null;
  /** OPEN — edition string from export metadata. */
  edition?: string | null;
  chapter?: string | null;
  /** OPEN — split from tableCode e.g. "0101" from "0101-01". */
  table?: string | null;
  /** OPEN — e.g. "01" from "0101-01". */
  column?: string | null;
  item?: string | null;
  variant?: string | null;
};

export type KnrIdentityV2Partial = Partial<KnrIdentityV2> & {
  family?: KnrCatalogFamily;
  catalog?: string;
};

/** Slice A evidence alias — lookup hint, not authoritative alone. */
export type KnrEvidenceKeyV1 = string;

const IDENTITY_FOLD_SEP = "|";

function foldToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Deterministic fold for available identity fields.
 * Incomplete until publisher/edition confirmed — REQUIRES OD-KNR-ID-1 for VERIFIED key policy.
 */
export function foldIdentityKeyV2(identity: KnrIdentityV2Partial): string {
  const parts = [
    foldToken(identity.family ?? "OTHER"),
    foldToken(identity.catalog),
    foldToken(identity.publisher),
    foldToken(identity.edition),
    foldToken(identity.chapter),
    foldToken(identity.table),
    foldToken(identity.column),
    foldToken(identity.item),
    foldToken(identity.variant),
  ];
  return parts.join(IDENTITY_FOLD_SEP);
}

/** True when minimum fields for a catalog lookup attempt exist (not VERIFIED policy). */
export function hasMinimumKnrIdentityPartial(identity: KnrIdentityV2Partial): boolean {
  return Boolean(foldToken(identity.family) && foldToken(identity.catalog));
}

/**
 * Read-only parse from frozen Slice A catalogBasis evidence.
 * Export file fields (KL-5+) override this hint when both present.
 */
export function parseIdentityPartialFromCatalogBasis(
  catalogBasis: CatalogBasis,
): KnrIdentityV2Partial & { evidenceKeyV1: KnrEvidenceKeyV1; originalSourceCode: string } {
  const family = (catalogBasis.family ?? "OTHER") as KnrCatalogFamily;
  return {
    family,
    catalog: catalogBasis.catalogId ?? "",
    table: catalogBasis.tableCode,
    evidenceKeyV1: catalogBasis.normalizedKey,
    originalSourceCode: catalogBasis.rawCode,
  };
}

/**
 * Whether identity has fields design marks as likely REQUIRED for VERIFIED persist.
 * OPEN until Owner approves OD-KNR-ID-1 after sample review.
 */
export function isKnrIdentityV2VerifiedReady(
  identity: KnrIdentityV2Partial,
): boolean {
  return (
    hasMinimumKnrIdentityPartial(identity)
    && Boolean(foldToken(identity.publisher))
    && Boolean(foldToken(identity.edition))
    && Boolean(foldToken(identity.table))
  );
}
