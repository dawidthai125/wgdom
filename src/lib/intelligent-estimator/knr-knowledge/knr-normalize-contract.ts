/**
 * IK-KNR KL-5 — normalizeKnrRawEvidence implementation.
 *
 * RAW EVIDENCE → PARSE → candidate KnrCatalogEntry (NORMATIVE · never auto-VERIFIED).
 */

import { buildCatalogBasisFromRawCode } from "@/lib/tenders-bzp-brief";
import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import { createKnrCatalogEntrySkeleton } from "./knr-catalog-entry-types";
import { buildKnrNormContentHash } from "./knr-content-hash";
import {
  KNR_EXPORT_PARSER_VERSION,
  parseAthKnrNormExport,
  type KnrParsedAthPosition,
} from "./knr-export-parser";
import {
  loadKnrEvidenceBytes,
  type KnrRawEvidenceStore,
} from "./knr-evidence-store";
import type { KnrRawEvidence } from "./knr-provenance-types";
import { validateKnrCatalogEntryCandidate } from "./knr-validate-contract";

export type KnrNormalizeInput = {
  raw: KnrRawEvidence;
  catalogBasisHint?: CatalogBasis | null;
  /** Target position code e.g. KNR 2-02 0803-01 */
  targetDisplayCode?: string | null;
  /** Harness / pipeline inline bytes bypass. */
  bytesOverride?: Uint8Array | null;
  evidenceStore?: KnrRawEvidenceStore | null;
  nowIso?: string;
};

export type KnrNormalizeResult =
  | { ok: true; candidate: KnrCatalogEntry; parsed: KnrParsedAthPosition }
  | {
      ok: false;
      reason:
        | "NOT_IMPLEMENTED"
        | "PARSER_ERROR"
        | "LLM_ONLY_DENIED"
        | "UNSUPPORTED_FORMAT"
        | "POSITION_NOT_FOUND"
        | "RMS_INCOMPLETE"
        | "EVIDENCE_MISSING";
      messagePl: string;
    };

function resolveEvidenceBytes(
  raw: KnrRawEvidence,
  input: KnrNormalizeInput,
): Uint8Array | null {
  if (input.bytesOverride?.length) return input.bytesOverride;
  if (raw.payloadRef.kind === "inline_stub") return null;
  const fromStore = loadKnrEvidenceBytes(raw.payloadRef, input.evidenceStore ?? undefined);
  if (fromStore?.length) return fromStore;
  return null;
}

function buildCandidateFromParsed(
  parsed: KnrParsedAthPosition,
  raw: KnrRawEvidence,
  evidenceContentHash: string,
  nowIso: string,
): KnrCatalogEntry {
  const basis = buildCatalogBasisFromRawCode(parsed.displayCode);
  const skeleton = createKnrCatalogEntrySkeleton(
    {
      identityKeyV2: parsed.identityKeyV2,
      evidenceKeyV1: basis.normalizedKey,
      identity: parsed.identity,
      originalSourceCode: parsed.originalSourceCode,
      displayCode: parsed.displayCode,
    },
    nowIso,
  );

  const contentHash = buildKnrNormContentHash(parsed.norms);

  const candidate: KnrCatalogEntry = {
    ...skeleton,
    description: parsed.description,
    unit: parsed.unit,
    norms: parsed.norms,
    verificationStatus: "NORMATIVE",
    validationState: "INCOMPLETE",
    provenance: {
      sourceType: "LICENSED_PROGRAM_EXPORT",
      sourceIdentifier: raw.sourceFilename,
      sourceProgram: "Norma",
      sourceProgramVersion: null,
      acquisitionMethod: "LICENSED_EXPORT",
      capturedAt: raw.capturedAt,
      retrievedAt: nowIso,
      parserVersion: KNR_EXPORT_PARSER_VERSION,
      contentHash,
      rawEvidenceRef: raw.payloadRef,
      importBatchId: null,
      licenceId: raw.licenceId,
      originId: raw.originId,
      revision: 1,
      evidenceMetadata: {
        evidenceBlobHash: evidenceContentHash,
        chapter: parsed.chapter ?? null,
        publisher: parsed.publisher,
        edition: parsed.edition,
        pozycjaId: parsed.pozycjaId,
      },
    },
    contentHash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const validated = validateKnrCatalogEntryCandidate({ entry: candidate, forVerifiedTarget: false });
  return {
    ...candidate,
    validationState: validated.validationState,
    contentHash: validated.contentHash,
  };
}

/** KL-5 — normalize licensed export raw evidence to catalog candidate. */
export function normalizeKnrRawEvidence(input: KnrNormalizeInput): KnrNormalizeResult {
  const { raw } = input;
  const nowIso = input.nowIso ?? new Date().toISOString();

  if (raw.originId.startsWith("scrape_")) {
    return {
      ok: false,
      reason: "LLM_ONLY_DENIED",
      messagePl: "Scraper origin — import zablokowany.",
    };
  }

  if (raw.format !== "ATH") {
    return {
      ok: false,
      reason: "UNSUPPORTED_FORMAT",
      messagePl: `Format ${raw.format} — MVP obsługuje wyłącznie ATH.`,
    };
  }

  const bytes = resolveEvidenceBytes(raw, input);
  if (!bytes?.length) {
    return {
      ok: false,
      reason: "EVIDENCE_MISSING",
      messagePl: "Brak bytes evidence — wymagany zapis w kw-knr-evidence lub bytesOverride.",
    };
  }

  const targetCode =
    input.targetDisplayCode
    ?? input.catalogBasisHint?.rawCode
    ?? null;

  const parsed = parseAthKnrNormExport(bytes, {
    targetDisplayCode: targetCode,
    knrFamilyOnly: true,
  });

  if (!parsed.ok) {
    return {
      ok: false,
      reason:
        parsed.code === "UNSUPPORTED_FORMAT"
          ? "UNSUPPORTED_FORMAT"
          : parsed.code === "RMS_INCOMPLETE"
            ? "RMS_INCOMPLETE"
            : parsed.code === "POSITION_NOT_FOUND"
              ? "POSITION_NOT_FOUND"
              : "PARSER_ERROR",
      messagePl: parsed.messagePl,
    };
  }

  const position = parsed.positions[0];
  if (!position) {
    return {
      ok: false,
      reason: "POSITION_NOT_FOUND",
      messagePl: "Brak pozycji po parse.",
    };
  }

  const evidenceContentHash =
    typeof raw.payloadRef.refId === "string" && raw.payloadRef.refId.startsWith("ev-")
      ? raw.payloadRef.refId.replace(/^ev-/, "")
      : "";

  const candidate = buildCandidateFromParsed(position, raw, evidenceContentHash, nowIso);

  return { ok: true, candidate, parsed: position };
}

export const KNR_NORMALIZE_KL5_IMPLEMENTED = true as const;
