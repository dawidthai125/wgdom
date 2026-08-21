/**
 * IK-KNR KL-5 — Licensed export ingest pipeline.
 *
 * Legal Gate → evidence store → parse → normalize → validate → PENDING_VERIFY
 * ZERO HTTP · ZERO auto-VERIFIED · ZERO write-router VERIFIED persist
 * Provider / ingest ≠ VERIFIED authority · Owner VERIFY = KL-6 only
 */

import type { GlobalKnowledgeLicenceRecord } from "@/lib/global-knowledge/types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrCatalogStore } from "./knr-catalog-store";
import {
  emptyKnrCatalogStore,
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
} from "./knr-catalog-store";
import { KNR_EXPORT_PARSER_VERSION } from "./knr-export-parser";
import {
  storeKnrEvidenceBlob,
  type KnrRawEvidenceStore,
} from "./knr-evidence-store";
import {
  createDefaultKnrNormaLicence,
  evaluateKnrLegalGate,
  KNR_LICENSED_EXPORT_ORIGIN,
  KNR_NORMA_DEFAULT_LICENCE_ID,
} from "./knr-legal-gate-runtime";
import { normalizeKnrRawEvidence } from "./knr-normalize-contract";
import type { KnrRawEvidence } from "./knr-provenance-types";
import { validateKnrCatalogEntryCandidate } from "./knr-validate-contract";
import { planKnrOwnerVerifyTransition } from "./knr-verify-types";

export type KnrIngestPipelineInput = {
  bytes: Uint8Array;
  sourceFilename: string;
  capturedAt: string;
  nowIso: string;
  licenceId?: string;
  originId?: string;
  targetDisplayCode: string;
  ownerActorId: string;
  licences?: readonly (GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean })[];
  evidenceStore?: KnrRawEvidenceStore;
  catalogStore?: KnrCatalogStore;
  /**
   * KL-5: must be false / omitted.
   * `true` is rejected — auto Owner VERIFY is KL-6 only.
   */
  autoOwnerVerify?: boolean;
};

export type KnrIngestPipelineResult =
  | {
      ok: true;
      outcome: "NOOP" | "PENDING_VERIFY";
      candidate: KnrCatalogEntry;
      catalogStore: KnrCatalogStore;
      evidenceStore: KnrRawEvidenceStore;
      httpRequestCount: 0;
      researchExecuted: false;
    }
  | {
      ok: false;
      reason:
        | "LEGAL_GATE_REJECT"
        | "NORMALIZE_FAILED"
        | "VALIDATION_FAILED"
        | "VERIFY_FAILED"
        | "CONTENT_CONFLICT"
        | "AUTO_OWNER_VERIFY_FORBIDDEN"
        | "PRICING_AUTHORITY_FORBIDDEN";
      messagePl: string;
      codes?: string[];
    };

/** Stage PENDING_VERIFY into local catalog working set — never VERIFIED. */
function stagePendingKnrCatalogEntry(
  store: KnrCatalogStore,
  entry: KnrCatalogEntry,
  nowIso: string,
): KnrCatalogStore {
  if (entry.verificationStatus === "VERIFIED") {
    throw new Error("KL-5 stagePending forbids VERIFIED — use KL-6 write-router.");
  }
  const nextEntry: KnrCatalogEntry = {
    ...entry,
    updatedAt: nowIso,
  };
  const entries = { ...store.entries, [nextEntry.identityKeyV2]: nextEntry };
  return normalizeKnrCatalogStore(
    {
      ...store,
      entries,
      aliasIndex: rebuildKnrAliasIndex(entries),
      updatedAt: nowIso,
    },
    nowIso,
  );
}

/**
 * Ingest licensed ATH export → evidence + PENDING_VERIFY candidate.
 * Does not promote to VERIFIED. Does not call persistVerifiedKnrCatalogEntry.
 */
export async function ingestLicensedAthExport(
  input: KnrIngestPipelineInput,
): Promise<KnrIngestPipelineResult> {
  if (input.autoOwnerVerify === true) {
    return {
      ok: false,
      reason: "AUTO_OWNER_VERIFY_FORBIDDEN",
      messagePl: "KL-5 zabronione autoOwnerVerify=true — VERIFIED tylko przez Owner VERIFY (KL-6).",
    };
  }

  const licenceId = input.licenceId ?? KNR_NORMA_DEFAULT_LICENCE_ID;
  const originId = input.originId ?? KNR_LICENSED_EXPORT_ORIGIN;
  const licences = input.licences ?? [createDefaultKnrNormaLicence()];

  const legal = evaluateKnrLegalGate(
    {
      licenceId,
      originId,
      allowedUse: ["knr_norm_persist", "identity"],
      nowIso: input.nowIso,
    },
    licences,
  );

  if (!legal.ok) {
    return {
      ok: false,
      reason: "LEGAL_GATE_REJECT",
      messagePl: `Legal gate reject: ${legal.codes.join(", ")}`,
      codes: legal.codes,
    };
  }

  const evidenceResult = await storeKnrEvidenceBlob({
    bytes: input.bytes,
    sourceFilename: input.sourceFilename,
    format: "ATH",
    capturedAt: input.capturedAt,
    originId,
    licenceId,
    parserVersion: KNR_EXPORT_PARSER_VERSION,
    nowIso: input.nowIso,
    storeOverride: input.evidenceStore,
  });

  const raw: KnrRawEvidence = {
    format: "ATH",
    parserVersion: KNR_EXPORT_PARSER_VERSION,
    sourceFilename: input.sourceFilename,
    capturedAt: input.capturedAt,
    payloadRef: evidenceResult.ref,
    originId,
    licenceId,
  };

  const normalized = normalizeKnrRawEvidence({
    raw,
    targetDisplayCode: input.targetDisplayCode,
    bytesOverride: input.bytes,
    evidenceStore: evidenceResult.store,
    nowIso: input.nowIso,
  });

  if (!normalized.ok) {
    return {
      ok: false,
      reason: "NORMALIZE_FAILED",
      messagePl: normalized.messagePl,
    };
  }

  let candidate = normalized.candidate;

  // Pricing fields must never survive normalize — belt-and-suspenders.
  const pricingProbe = candidate as KnrCatalogEntry & Record<string, unknown>;
  for (const key of ["ourRatePln", "sellPrice", "pricePln", "bidPrice", "margin", "markup"]) {
    if (key in pricingProbe && pricingProbe[key] != null) {
      return {
        ok: false,
        reason: "PRICING_AUTHORITY_FORBIDDEN",
        messagePl: `Odrzucono pole cenowe w candidate: ${key}`,
        codes: [key],
      };
    }
  }

  const validated = validateKnrCatalogEntryCandidate({
    entry: candidate,
    forVerifiedTarget: true,
  });

  if (validated.validationState !== "PASS") {
    return {
      ok: false,
      reason: "VALIDATION_FAILED",
      messagePl: `Walidacja: ${validated.codes.join(", ")}`,
      codes: validated.codes,
    };
  }

  candidate = {
    ...candidate,
    validationState: validated.validationState,
    contentHash: validated.contentHash,
    verificationStatus: "NORMATIVE",
    verifiedAt: null,
    verifiedBy: null,
  };

  let catalogStore = input.catalogStore ?? emptyKnrCatalogStore(input.nowIso);
  const existing = catalogStore.entries[candidate.identityKeyV2];

  if (existing) {
    const existingHash =
      existing.contentHash.trim() || validated.contentHash;
    if (existingHash === candidate.contentHash) {
      return {
        ok: true,
        outcome: "NOOP",
        candidate:
          existing.verificationStatus === "PENDING_VERIFY" ? existing : candidate,
        catalogStore,
        evidenceStore: evidenceResult.store,
        httpRequestCount: 0,
        researchExecuted: false,
      };
    }
    return {
      ok: false,
      reason: "CONTENT_CONFLICT",
      messagePl: "Ten sam identityKeyV2 z innym contentHash.",
    };
  }

  const pending = planKnrOwnerVerifyTransition({
    entry: candidate,
    action: "VERIFY",
    actorId: input.ownerActorId,
    nowIso: input.nowIso,
  });
  if (!pending.ok || pending.nextStatus !== "PENDING_VERIFY") {
    return {
      ok: false,
      reason: "VERIFY_FAILED",
      messagePl: pending.ok
        ? `Oczekiwano PENDING_VERIFY, otrzymano ${pending.nextStatus}`
        : pending.messagePl,
    };
  }

  if (pending.entry.verificationStatus === "VERIFIED") {
    return {
      ok: false,
      reason: "AUTO_OWNER_VERIFY_FORBIDDEN",
      messagePl: "KL-5 odmówił wyniku VERIFIED.",
    };
  }

  catalogStore = stagePendingKnrCatalogEntry(catalogStore, pending.entry, input.nowIso);

  return {
    ok: true,
    outcome: "PENDING_VERIFY",
    candidate: pending.entry,
    catalogStore,
    evidenceStore: evidenceResult.store,
    httpRequestCount: 0,
    researchExecuted: false,
  };
}

export const KNR_KNOWLEDGE_KL5_PIPELINE_IMPLEMENTED = true as const;
