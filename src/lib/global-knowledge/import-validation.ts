/**
 * GLOBAL-KNOWLEDGE-E1A — Import validation (pure, bez zapisu / bez ingestu danych).
 */

import {
  buildCanonicalGlobalId,
  buildGlobalContentHash,
  canonicalizeNormCode,
} from "./canonical-id";
import { evaluateLegalGate, type LegalGateRejectCode } from "./legal-gate";
import {
  validateLifecycleFields,
  type LifecycleValidationCode,
} from "./lifecycle";
import type {
  GlobalKnowledgeAllowedUse,
  GlobalKnowledgeConfidence,
  GlobalKnowledgeEntry,
  GlobalKnowledgeImportCandidate,
  GlobalKnowledgeLicenceRecord,
  GlobalKnowledgeLifecycle,
} from "./types";

export type ImportValidationCode =
  | LegalGateRejectCode
  | LifecycleValidationCode
  | "MISSING_NAME"
  | "MISSING_KIND"
  | "MISSING_IMPORTED_BY"
  | "INDICATIVE_RATE_NOT_IN_E1A"
  | "ENTRY_HAS_PRICE_FIELD";

export interface ImportValidationOk {
  ok: true;
  codes: [];
  entry: GlobalKnowledgeEntry;
}

export interface ImportValidationFail {
  ok: false;
  codes: ImportValidationCode[];
  entry: null;
}

export type ImportValidationResult = ImportValidationOk | ImportValidationFail;

const KINDS = new Set(["norm", "technology", "material", "pack_ref", "other"]);

/**
 * Waliduje kandydata importu i buduje entry (bez mutacji store).
 * E1A: indicative_rate w allowedUse → REJECT; pola ceny → REJECT.
 */
export function validateGlobalKnowledgeImportCandidate(
  candidate: GlobalKnowledgeImportCandidate,
  licences: readonly GlobalKnowledgeLicenceRecord[],
  opts?: { nowIso?: string },
): ImportValidationResult {
  const codes: ImportValidationCode[] = [];
  const nowIso = opts?.nowIso ?? new Date().toISOString();

  if (!candidate?.namePl?.trim()) codes.push("MISSING_NAME");
  if (!KINDS.has(candidate?.kind)) codes.push("MISSING_KIND");
  if (!candidate?.provenance?.importedBy?.trim()) codes.push("MISSING_IMPORTED_BY");

  const rawAny = candidate as unknown as Record<string, unknown>;
  if (
    rawAny &&
    (rawAny.unitPricePln != null ||
      rawAny.pricePln != null ||
      rawAny.indicativeRatePln != null ||
      rawAny.marketQuotes != null)
  ) {
    codes.push("ENTRY_HAS_PRICE_FIELD");
  }

  const allowedUse = candidate.provenance?.allowedUse ?? [];
  if (allowedUse.includes("indicative_rate")) {
    codes.push("INDICATIVE_RATE_NOT_IN_E1A");
  }

  const legal = evaluateLegalGate(
    {
      licenceId: candidate.provenance?.licenceId ?? "",
      originId: candidate.provenance?.originId ?? "",
      allowedUse: allowedUse.filter((u) => u !== "indicative_rate") as GlobalKnowledgeAllowedUse[],
      nowIso,
    },
    licences,
  );
  if (!legal.ok) codes.push(...legal.codes);

  const lifecycle: GlobalKnowledgeLifecycle = candidate.lifecycle ?? "ACTIVE";
  const life = validateLifecycleFields({
    lifecycle,
    supersededBy: candidate.supersededBy,
  });
  if (!life.ok) codes.push(...life.codes);

  if (codes.length) {
    return { ok: false, codes, entry: null };
  }

  const revision = candidate.revision?.trim() || "1";
  const normCode = canonicalizeNormCode(candidate.normCode ?? null);
  const contentHash = buildGlobalContentHash({
    kind: candidate.kind,
    namePl: candidate.namePl,
    unit: candidate.unit,
    normCode,
    revision,
  });
  const globalId = buildCanonicalGlobalId({
    kind: candidate.kind,
    namePl: candidate.namePl,
    unit: candidate.unit,
    normCode,
    revision,
  });
  const confidence: GlobalKnowledgeConfidence = candidate.confidence ?? "medium";

  const entry: GlobalKnowledgeEntry = {
    globalId,
    kind: candidate.kind,
    namePl: candidate.namePl.trim(),
    unit: candidate.unit ?? null,
    normCode,
    lifecycle,
    supersededBy: candidate.supersededBy ?? null,
    confidence,
    revision,
    validFrom: candidate.validFrom ?? nowIso,
    validTo: candidate.validTo ?? null,
    provenance: {
      originId: candidate.provenance.originId,
      licenceId: candidate.provenance.licenceId,
      sourceFilename: candidate.provenance.sourceFilename ?? null,
      importedAt: candidate.provenance.importedAt ?? nowIso,
      importedBy: candidate.provenance.importedBy,
      contentHash,
      allowedUse: allowedUse.filter((u) => u !== "indicative_rate"),
    },
  };

  // re-validate lifecycle with globalId for self-ref
  const life2 = validateLifecycleFields({
    lifecycle: entry.lifecycle,
    supersededBy: entry.supersededBy,
    globalId: entry.globalId,
  });
  if (!life2.ok) {
    return { ok: false, codes: life2.codes, entry: null };
  }

  return { ok: true, codes: [], entry };
}
