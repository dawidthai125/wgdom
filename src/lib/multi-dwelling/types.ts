/**
 * MULTI-DWELLING-01 — Design Freeze A′ types (wrapper · no OfferBoq schema bump).
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { BidCutoverGateResult } from "@/lib/tender-position-cost/bid-position-cost-cutover";
import { MULTI_DWELLING_PACKAGE_SCHEMA_VERSION } from "@/lib/multi-dwelling/constants";
import type {
  DwellingCostSnapshot,
  DwellingLineProvenance,
} from "@/lib/multi-boq/types";

export type TenderPackageMode = "legacy_single" | "multi";

export type DwellingSubtotals = {
  laborPln: number;
  materialPln: number;
  equipmentPln: number;
  transportPln: number;
  auxiliaryPln: number;
  directPln: number;
  equipmentGapCount: number;
  transportGapCount: number;
};

/**
 * Optional COST-MULTI branch artifact pointer — NOT dwelling identity.
 * Branch layer stays orthogonal inside a dwelling.
 */
export type DwellingCostMultiRef = {
  /** Informative only — branch codes / winner filenames. */
  branchSummaryPl?: string | null;
  sourceDocumentCount?: number | null;
};

export type DwellingCostUnit = {
  dwellingId: string;
  labelPl: string;
  sourceDocumentIds: string[];
  /** null until Owner maps documents and BOQ is attached. */
  offerBoq: OfferBoqDocument | null;
  /** MULTI-BOQ-01 — canonical dwelling snapshot (not tender dossier.kosztorys). */
  costSnapshot?: DwellingCostSnapshot | null;
  /** MULTI-BOQ-01 — provenance side-map keyed by OfferBoq lineId (schema v5 untouched). */
  lineProvenance?: Record<string, DwellingLineProvenance> | null;
  costMulti?: DwellingCostMultiRef | null;
  f5Gate: BidCutoverGateResult | null;
  subtotals: DwellingSubtotals | null;
};

export type TenderPackage = {
  tenderId: string;
  expectedDwellingCount: number;
  dwellings: DwellingCostUnit[];
  mode: TenderPackageMode;
  /** Display label for package UI (not identity). */
  labelPl?: string;
  /**
   * Owner-confirmed document → dwelling map.
   * Filename / AI = HINT only — never write SSOT dwellingId from filename alone.
   */
  documentToDwelling: Record<string, string>;
};

export type PackageGateFailReason =
  | "EXPECTED_COUNT_INVALID"
  | "COUNT_MISMATCH"
  | "MISSING_DWELLING"
  | "DUPLICATE_DWELLING"
  | "EMPTY_REQUIRED_DWELLING"
  | "BOQ_NOT_IMPORTED"
  | "F5_FAIL"
  | "NO_DWELLINGS"
  | "DOCUMENT_MAPPING_MISSING"
  | "DOCUMENT_MAPPING_MISMATCH"
  | "DOCUMENT_MAPPING_UNKNOWN"
  | "DOCUMENT_MAPPING_ORPHAN_TARGET"
  | "DOCUMENT_MAPPING_DUPLICATE"
  | "DOCUMENT_MAPPING_INVALID_IDENTITY";

export type PackageGateResult = {
  pass: boolean;
  expectedDwellingCount: number;
  uniqueDwellingCount: number;
  completeDwellingCount: number;
  reasonsPl: string[];
  failReasons: PackageGateFailReason[];
};

export type MultiDwellingPackageStore = {
  version: typeof MULTI_DWELLING_PACKAGE_SCHEMA_VERSION;
  /** tenderId → package (offerBoq may be omitted in LS for size — runtime attaches). */
  byTenderId: Record<string, TenderPackage>;
};
