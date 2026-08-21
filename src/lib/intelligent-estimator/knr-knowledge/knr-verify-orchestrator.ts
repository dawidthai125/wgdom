/**
 * IK-KNR KL-6 — Owner VERIFY orchestrator (sole approve/reject path to VERIFIED).
 *
 * Path: Owner action → FSM → authority → write-router → VERIFIED
 * UI MUST call this module — never persistVerifiedKnrCatalogEntry / localStorage directly.
 * ZERO HTTP · ZERO auto-VERIFIED · ZERO Host · ZERO Research · ZERO pricing
 */

import type { AdminRole } from "@/lib/admin-auth";
import { adminCanVerifyKnrCatalog } from "@/lib/admin-auth";
import type { GlobalKnowledgeLicenceRecord } from "@/lib/global-knowledge/types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrCatalogStore } from "./knr-catalog-store";
import {
  emptyKnrCatalogStore,
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
} from "./knr-catalog-store";
import {
  persistVerifiedKnrCatalogEntry,
  persistVerifiedKnrCatalogEntryInMemory,
} from "./knr-catalog-write-router";
import { lookupKnrCatalog } from "./knr-catalog-lookup";
import type { KnrRawEvidenceStore } from "./knr-evidence-store";
import {
  emptyKnrRawEvidenceStore,
  verifyKnrEvidenceBlobIntegrity,
} from "./knr-evidence-store";
import {
  createDefaultKnrNormaLicence,
  evaluateKnrLegalGate,
  KNR_LICENSED_EXPORT_ORIGIN,
  KNR_NORMA_DEFAULT_LICENCE_ID,
} from "./knr-legal-gate-runtime";
import {
  ingestLicensedAthExport,
  type KnrIngestPipelineInput,
  type KnrIngestPipelineResult,
} from "./knr-ingest-pipeline";
import { buildKnrNormContentHash } from "./knr-content-hash";
import { validateKnrCatalogEntryCandidate } from "./knr-validate-contract";
import { planKnrOwnerVerifyTransition } from "./knr-verify-types";

export const KNR_VERIFY_REJECT_REASON_MIN_CHARS = 10 as const;

/** Session-only MVP — persistent queue is DEFERRED (no Owner GO). */
export const KNR_VERIFY_PERSISTENT_QUEUE_STORAGE_KEY = null;

export const KNR_VERIFY_MVP_SINGLE_ONLY = true as const;

export type KnrVerifyActor = {
  actorId: string;
  role: AdminRole;
  displayName: string;
};

export type KnrVerifyAuditRecord = {
  action: "knr_catalog_verify" | "knr_catalog_reject";
  actorId: string;
  actorDisplayName: string;
  at: string;
  identityKeyV2: string;
  contentHash: string;
  evidenceRefId: string | null;
  outcome: string;
  reason?: string;
};

export type KnrVerifyFailReason =
  | "ACL_DENIED"
  | "MISSING_OWNER_IDENTITY"
  | "CLIENT_VERIFIED_REJECTED"
  | "VALIDATION_FAILED"
  | "MISSING_EVIDENCE"
  | "EVIDENCE_TAMPERED"
  | "LEGAL_GATE_REJECT"
  | "INVALID_TRANSITION"
  | "REJECT_REASON_REQUIRED"
  | "CONTENT_CONFLICT"
  | "CAS_MISMATCH"
  | "STALE_CANDIDATE"
  | "IDENTITY_MISMATCH"
  | "PERSIST_FAILED"
  | "AUTO_OWNER_VERIFY_FORBIDDEN"
  | "PRICING_AUTHORITY_FORBIDDEN";

export type KnrVerifyApproveResult =
  | {
      ok: true;
      outcome: "CREATED" | "NOOP";
      entry: KnrCatalogEntry;
      catalogStore: KnrCatalogStore;
      lookupStatus: "LOCAL_HIT" | "LOCAL_MISS" | "INVALID_LOOKUP";
      httpRequestCount: 0;
      researchExecuted: false;
      audit: KnrVerifyAuditRecord;
    }
  | {
      ok: false;
      reason: KnrVerifyFailReason;
      messagePl: string;
      codes?: string[];
      httpRequestCount: 0;
      researchExecuted: false;
      catalogStore: KnrCatalogStore;
    };

export type KnrVerifyRejectResult =
  | {
      ok: true;
      outcome: "REJECTED";
      entry: KnrCatalogEntry;
      evidenceStore: KnrRawEvidenceStore;
      catalogStore: KnrCatalogStore;
      /** True = no VERIFIED write-router path used. */
      catalogUnchanged: false;
      httpRequestCount: 0;
      researchExecuted: false;
      audit: KnrVerifyAuditRecord;
    }
  | {
      ok: false;
      reason: KnrVerifyFailReason;
      messagePl: string;
      httpRequestCount: 0;
      researchExecuted: false;
      catalogStore?: KnrCatalogStore;
    };

function failApprove(
  reason: KnrVerifyFailReason,
  messagePl: string,
  catalogStore: KnrCatalogStore,
  codes?: string[],
): KnrVerifyApproveResult {
  return {
    ok: false,
    reason,
    messagePl,
    codes,
    httpRequestCount: 0,
    researchExecuted: false,
    catalogStore,
  };
}

function stageNonVerifiedCatalogEntry(
  store: KnrCatalogStore,
  entry: KnrCatalogEntry,
  nowIso: string,
): KnrCatalogStore {
  if (entry.verificationStatus === "VERIFIED") {
    throw new Error("KL-6 stageNonVerified forbids VERIFIED — use write-router.");
  }
  const entries = { ...store.entries, [entry.identityKeyV2]: { ...entry, updatedAt: nowIso } };
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
 * UI ingest entry — ALWAYS autoOwnerVerify:false.
 * Passing true is rejected (auto-VERIFY forbidden).
 */
export async function ingestAthForKnrOwnerVerify(
  input: Omit<KnrIngestPipelineInput, "autoOwnerVerify"> & {
    autoOwnerVerify?: boolean;
  },
): Promise<KnrIngestPipelineResult> {
  if (input.autoOwnerVerify === true) {
    return {
      ok: false,
      reason: "AUTO_OWNER_VERIFY_FORBIDDEN",
      messagePl: "KL-6 wymaga autoOwnerVerify=false — auto-VERIFY zabronione.",
      codes: ["AUTO_OWNER_VERIFY_FORBIDDEN"],
    };
  }
  return ingestLicensedAthExport({
    ...input,
    autoOwnerVerify: false,
  });
}

function evaluateCandidateLegalGate(
  candidate: KnrCatalogEntry,
  nowIso: string,
  licences?: readonly (GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean })[],
) {
  const originId = candidate.provenance.originId || KNR_LICENSED_EXPORT_ORIGIN;
  const licenceId = candidate.provenance.licenceId || KNR_NORMA_DEFAULT_LICENCE_ID;
  return evaluateKnrLegalGate(
    {
      licenceId,
      originId,
      allowedUse: ["knr_norm_persist", "identity"],
      nowIso,
    },
    licences ?? [createDefaultKnrNormaLicence()],
  );
}

function evidencePresent(
  candidate: KnrCatalogEntry,
  evidenceStore: KnrRawEvidenceStore | undefined,
): boolean {
  const ref = candidate.provenance.rawEvidenceRef;
  if (!ref?.refId) return false;
  if (!evidenceStore) return true;
  return Boolean(evidenceStore.blobs[ref.refId]);
}

function promoteToVerified(entry: KnrCatalogEntry, actorId: string, nowIso: string) {
  let current = entry;
  if (current.verificationStatus === "NORMATIVE" || current.verificationStatus === "RESEARCHED") {
    const toPending = planKnrOwnerVerifyTransition({
      entry: current,
      action: "VERIFY",
      actorId,
      nowIso,
    });
    if (!toPending.ok) return toPending;
    current = toPending.entry;
  }
  return planKnrOwnerVerifyTransition({
    entry: current,
    action: "VERIFY",
    actorId,
    nowIso,
  });
}

function actorIdentityOk(actor: KnrVerifyActor): boolean {
  return Boolean(actor.actorId?.trim() && actor.displayName?.trim());
}

/**
 * Sole legal path to VERIFIED catalog entry.
 * Integrity: identity · contentHash · evidence blob · legal · ACL · FSM.
 */
export async function executeKnrOwnerVerifyApprove(input: {
  candidate: KnrCatalogEntry;
  actor: KnrVerifyActor;
  nowIso: string;
  catalogStore?: KnrCatalogStore;
  evidenceStore?: KnrRawEvidenceStore;
  expectedEtag?: string;
  /** Required for UI approval of a specific candidate snapshot. */
  expectedCandidateContentHash?: string;
  expectedIdentityKeyV2?: string;
  licences?: readonly (GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean })[];
  recordAudit?: (record: KnrVerifyAuditRecord) => void;
}): Promise<KnrVerifyApproveResult> {
  const catalogStore = input.catalogStore ?? emptyKnrCatalogStore(input.nowIso);

  if (!adminCanVerifyKnrCatalog(input.actor.role)) {
    return failApprove(
      "ACL_DENIED",
      "Weryfikacja KNR jest dostępna tylko dla Super Administratora.",
      catalogStore,
    );
  }

  if (!actorIdentityOk(input.actor)) {
    return failApprove(
      "MISSING_OWNER_IDENTITY",
      "Brak wiarygodnej tożsamości Ownera (actorId/displayName).",
      catalogStore,
    );
  }

  if (input.candidate.verificationStatus === "VERIFIED") {
    return failApprove(
      "CLIENT_VERIFIED_REJECTED",
      "Odrzucono client-supplied VERIFIED — wymagany orchestrator FSM.",
      catalogStore,
    );
  }

  if (input.candidate.verificationStatus === "REJECTED") {
    return failApprove(
      "INVALID_TRANSITION",
      "Kandydat REJECTED nie może zostać VERIFIED.",
      catalogStore,
    );
  }

  if (
    input.expectedIdentityKeyV2
    && input.expectedIdentityKeyV2 !== input.candidate.identityKeyV2
  ) {
    return failApprove(
      "IDENTITY_MISMATCH",
      "Approval target identityKeyV2 nie zgadza się z candidate.",
      catalogStore,
    );
  }

  if (
    input.expectedCandidateContentHash
    && input.expectedCandidateContentHash !== input.candidate.contentHash
  ) {
    return failApprove("STALE_CANDIDATE", "Kandydat jest nieaktualny — ponów import.", catalogStore);
  }

  const recomputedHash = buildKnrNormContentHash(input.candidate.norms);
  if (
    input.candidate.contentHash.trim()
    && input.candidate.contentHash.trim() !== recomputedHash
  ) {
    return failApprove(
      "STALE_CANDIDATE",
      "Content hash nie zgadza się z normami candidate.",
      catalogStore,
    );
  }

  const pricingProbe = input.candidate as KnrCatalogEntry & Record<string, unknown>;
  for (const key of ["ourRatePln", "sellPrice", "pricePln", "bidPrice", "margin", "markup"]) {
    if (key in pricingProbe && pricingProbe[key] != null) {
      return failApprove(
        "PRICING_AUTHORITY_FORBIDDEN",
        `Odrzucono pole cenowe: ${key}`,
        catalogStore,
        [key],
      );
    }
  }

  const legal = evaluateCandidateLegalGate(input.candidate, input.nowIso, input.licences);
  if (!legal.ok) {
    return failApprove(
      "LEGAL_GATE_REJECT",
      `Legal gate: ${legal.codes.join(", ")}`,
      catalogStore,
      legal.codes,
    );
  }

  if (!evidencePresent(input.candidate, input.evidenceStore)) {
    return failApprove("MISSING_EVIDENCE", "Brak rawEvidenceRef / blobu evidence.", catalogStore);
  }

  if (input.evidenceStore) {
    const refId = input.candidate.provenance.rawEvidenceRef?.refId;
    const blob = refId ? input.evidenceStore.blobs[refId] : undefined;
    if (blob) {
      const integrity = await verifyKnrEvidenceBlobIntegrity({ blob });
      if (!integrity.ok) {
        return failApprove(
          "EVIDENCE_TAMPERED",
          "Integralność evidence naruszona (hash mismatch).",
          catalogStore,
          [integrity.reason],
        );
      }
    }
  }

  const existingRejected = catalogStore.entries[input.candidate.identityKeyV2];
  if (existingRejected?.verificationStatus === "REJECTED") {
    return failApprove(
      "INVALID_TRANSITION",
      "Wpis REJECTED w katalogu — brak promocji do VERIFIED.",
      catalogStore,
    );
  }

  const validated = validateKnrCatalogEntryCandidate({
    entry: input.candidate,
    forVerifiedTarget: true,
  });
  if (validated.validationState !== "PASS") {
    return failApprove(
      "VALIDATION_FAILED",
      `Walidacja: ${validated.codes.join(", ")}`,
      catalogStore,
      validated.codes,
    );
  }

  const prepared: KnrCatalogEntry = {
    ...input.candidate,
    validationState: validated.validationState,
    contentHash: validated.contentHash || input.candidate.contentHash,
    verifiedAt: null,
    verifiedBy: null,
  };

  const existingLookup = lookupKnrCatalog(
    { identityKeyV2: prepared.identityKeyV2, evidenceKeyV1: prepared.evidenceKeyV1 },
    catalogStore,
  );
  if (existingLookup.status === "LOCAL_HIT") {
    const existing = catalogStore.entries[prepared.identityKeyV2];
    if (existing && existing.contentHash === prepared.contentHash) {
      const audit: KnrVerifyAuditRecord = {
        action: "knr_catalog_verify",
        actorId: input.actor.actorId,
        actorDisplayName: input.actor.displayName,
        at: input.nowIso,
        identityKeyV2: prepared.identityKeyV2,
        contentHash: prepared.contentHash,
        evidenceRefId: prepared.provenance.rawEvidenceRef?.refId ?? null,
        outcome: "NOOP",
      };
      input.recordAudit?.(audit);
      return {
        ok: true,
        outcome: "NOOP",
        entry: existing,
        catalogStore,
        lookupStatus: "LOCAL_HIT",
        httpRequestCount: 0,
        researchExecuted: false,
        audit,
      };
    }
    if (existing && existing.contentHash !== prepared.contentHash) {
      return failApprove(
        "CONTENT_CONFLICT",
        "Ten sam identityKeyV2 z innym contentHash.",
        catalogStore,
      );
    }
  }

  const verified = promoteToVerified(prepared, input.actor.actorId, input.nowIso);
  if (!verified.ok) {
    const mapped: KnrVerifyFailReason =
      verified.reason === "MISSING_EVIDENCE"
        ? "MISSING_EVIDENCE"
        : verified.reason === "VALIDATION_INCOMPLETE"
          ? "VALIDATION_FAILED"
          : "INVALID_TRANSITION";
    return failApprove(mapped, verified.messagePl, catalogStore);
  }

  if (verified.entry.verificationStatus !== "VERIFIED") {
    return failApprove(
      "INVALID_TRANSITION",
      "FSM nie ustawił VERIFIED.",
      catalogStore,
    );
  }

  if (!verified.entry.verifiedAt || !verified.entry.verifiedBy) {
    return failApprove(
      "MISSING_OWNER_IDENTITY",
      "VERIFIED wymaga verifiedAt/verifiedBy z orchestratora.",
      catalogStore,
    );
  }

  const persistInput = {
    entry: verified.entry,
    nowIso: input.nowIso,
    expectedEtag: input.expectedEtag,
  };

  const persist = input.catalogStore
    ? persistVerifiedKnrCatalogEntryInMemory({ ...persistInput, store: input.catalogStore })
    : persistVerifiedKnrCatalogEntry(persistInput);

  if (!persist.ok) {
    const reason: KnrVerifyFailReason =
      persist.reason === "CONTENT_CONFLICT"
        ? "CONTENT_CONFLICT"
        : persist.reason === "CAS_MISMATCH"
          ? "CAS_MISMATCH"
          : "PERSIST_FAILED";
    return failApprove(reason, persist.messagePl, persist.store);
  }

  // KL-7-P0 — cloud SSOT push after legal local VERIFY (best-effort · anti-wipe in sync).
  // Dynamic import avoids write-router / KL-1 static cloud-sync coupling.
  if (!input.catalogStore) {
    void import("./knr-catalog-sync")
      .then(({ pushKnrCatalogStoreAfterVerify }) =>
        pushKnrCatalogStoreAfterVerify(persist.store),
      )
      .catch(() => {
        /* offline / unconfigured — local VERIFIED remains */
      });
  }

  const lookup = lookupKnrCatalog(
    {
      identityKeyV2: verified.entry.identityKeyV2,
      evidenceKeyV1: verified.entry.evidenceKeyV1,
    },
    persist.store,
  );

  const audit: KnrVerifyAuditRecord = {
    action: "knr_catalog_verify",
    actorId: input.actor.actorId,
    actorDisplayName: input.actor.displayName,
    at: input.nowIso,
    identityKeyV2: verified.entry.identityKeyV2,
    contentHash: verified.entry.contentHash,
    evidenceRefId: verified.entry.provenance.rawEvidenceRef?.refId ?? null,
    outcome: persist.outcome,
  };
  input.recordAudit?.(audit);

  return {
    ok: true,
    outcome: persist.outcome,
    entry: verified.entry,
    catalogStore: persist.store,
    lookupStatus: lookup.status,
    httpRequestCount: 0,
    researchExecuted: false,
    audit,
  };
}

export function executeKnrOwnerVerifyReject(input: {
  candidate: KnrCatalogEntry;
  actor: KnrVerifyActor;
  nowIso: string;
  reason: string;
  catalogStore?: KnrCatalogStore;
  evidenceStore?: KnrRawEvidenceStore;
  recordAudit?: (record: KnrVerifyAuditRecord) => void;
}): KnrVerifyRejectResult {
  const catalogStore = input.catalogStore ?? emptyKnrCatalogStore(input.nowIso);

  if (!adminCanVerifyKnrCatalog(input.actor.role)) {
    return {
      ok: false,
      reason: "ACL_DENIED",
      messagePl: "Weryfikacja KNR jest dostępna tylko dla Super Administratora.",
      httpRequestCount: 0,
      researchExecuted: false,
      catalogStore,
    };
  }

  if (!actorIdentityOk(input.actor)) {
    return {
      ok: false,
      reason: "MISSING_OWNER_IDENTITY",
      messagePl: "Brak wiarygodnej tożsamości Ownera (actorId/displayName).",
      httpRequestCount: 0,
      researchExecuted: false,
      catalogStore,
    };
  }

  const trimmed = input.reason.trim();
  if (trimmed.length < KNR_VERIFY_REJECT_REASON_MIN_CHARS) {
    return {
      ok: false,
      reason: "REJECT_REASON_REQUIRED",
      messagePl: `Powód odrzucenia musi mieć co najmniej ${KNR_VERIFY_REJECT_REASON_MIN_CHARS} znaków.`,
      httpRequestCount: 0,
      researchExecuted: false,
      catalogStore,
    };
  }

  const rejected = planKnrOwnerVerifyTransition({
    entry: input.candidate,
    action: "REJECT",
    actorId: input.actor.actorId,
    nowIso: input.nowIso,
    reason: trimmed,
  });
  if (!rejected.ok) {
    return {
      ok: false,
      reason: "INVALID_TRANSITION",
      messagePl: rejected.messagePl,
      httpRequestCount: 0,
      researchExecuted: false,
      catalogStore,
    };
  }

  const nextCatalog = stageNonVerifiedCatalogEntry(
    catalogStore,
    rejected.entry,
    input.nowIso,
  );
  const evidenceStore = input.evidenceStore ?? emptyKnrRawEvidenceStore(input.nowIso);
  const audit: KnrVerifyAuditRecord = {
    action: "knr_catalog_reject",
    actorId: input.actor.actorId,
    actorDisplayName: input.actor.displayName,
    at: input.nowIso,
    identityKeyV2: rejected.entry.identityKeyV2,
    contentHash: rejected.entry.contentHash,
    evidenceRefId: rejected.entry.provenance.rawEvidenceRef?.refId ?? null,
    outcome: "REJECTED",
    reason: trimmed,
  };
  input.recordAudit?.(audit);

  return {
    ok: true,
    outcome: "REJECTED",
    entry: rejected.entry,
    evidenceStore,
    catalogStore: nextCatalog,
    catalogUnchanged: false,
    httpRequestCount: 0,
    researchExecuted: false,
    audit,
  };
}

export const KNR_KNOWLEDGE_KL6_IMPLEMENTED = true as const;
