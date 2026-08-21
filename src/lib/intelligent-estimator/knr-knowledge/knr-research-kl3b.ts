/**
 * IK-KNR KL-3B — Research-on-MISS (L1 licensed ATH only).
 *
 * Lookup first · explicit Super Admin · ingestAthForKnrOwnerVerify · PENDING_VERIFY.
 * ZERO HTTP / fetch / scraper / LLM · ZERO IkEntryHost · ZERO auto-VERIFIED.
 * Does not call Owner VERIFY approve nor write-router VERIFIED persist.
 *
 * LEGAL path after research: PENDING_VERIFY → KL-6 Owner VERIFY → VERIFIED.
 */

import type { AdminRole } from "@/lib/admin-auth";
import { adminCanVerifyKnrCatalog } from "@/lib/admin-auth";
import type { GlobalKnowledgeLicenceRecord } from "@/lib/global-knowledge/types";
import type { SecurityAuditAction } from "@/lib/security-audit-log";
import { buildSecurityAuditEntry, type SecurityAuditEntry } from "@/lib/security-audit-log";
import type { CatalogBasis } from "@/lib/tenders-bzp-swz";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { emptyKnrCatalogStore } from "./knr-catalog-store";
import { lookupKnrCatalog } from "./knr-catalog-lookup";
import type { KnrRawEvidenceStore } from "./knr-evidence-store";
import { emptyKnrRawEvidenceStore } from "./knr-evidence-store";
import { parseIdentityPartialFromCatalogBasis, foldIdentityKeyV2 } from "./knr-identity-v2";
import type { KnrKnowledgeEnvelope, KnrKnowledgeLineResult } from "./knr-knowledge-envelope";
import { summarizeKnrKnowledgeLines } from "./knr-knowledge-envelope";
import type { KnrLookupStatus } from "./types";
import {
  ingestAthForKnrOwnerVerify,
  type KnrVerifyActor,
} from "./knr-verify-orchestrator";
import type { KnrIngestPipelineResult } from "./knr-ingest-pipeline";
import { createDefaultKnrNormaLicence } from "./knr-legal-gate-runtime";

/** Max L1 files per research call — multi-candidate = CONFLICT (no auto-pick). */
export const KNR_KL3B_MAX_L1_FILES = 1 as const;

/** Caller may pass attempt counter; values ≥ max deny research (anti-loop). */
export const KNR_KL3B_MAX_RESEARCH_ATTEMPTS = 1 as const;

const EMPTY_BASIS: CatalogBasis = {
  family: null,
  catalogId: null,
  tableCode: null,
  rawCode: "",
  display: "",
  normalizedKey: "",
};

const FORBIDDEN_URL_RE =
  /^(https?:\/\/|\/\/|file:|localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\]|metadata\.google)/i;

export type KnrKl3bAthFile = {
  bytes: Uint8Array;
  sourceFilename: string;
  targetDisplayCode: string;
  /** If set — SSRF deny, no fetch. */
  sourceUrl?: string | null;
};

export type KnrKl3bResearchAudit = {
  action: SecurityAuditAction;
  actorId: string;
  actorDisplayName: string;
  at: string;
  outcome: string;
  detail?: string;
};

export type KnrKl3bResolveInput = {
  tenderId: string;
  lineId: string;
  catalogBasis: CatalogBasis | null;
  catalogStore: KnrCatalogStore;
  evidenceStore?: KnrRawEvidenceStore;
  actor?: KnrVerifyActor;
  /** FLAG-1.1: MUST be true to run research. executeKnrResearch alone is insufficient. */
  explicitResearch: boolean;
  executeKnrResearch?: boolean;
  athFiles?: readonly KnrKl3bAthFile[];
  nowIso: string;
  licences?: readonly (GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean })[];
  originId?: string;
  /** 0-based attempt from caller; ≥ MAX blocks research. */
  researchAttemptCount?: number;
  recordAudit?: (entry: SecurityAuditEntry | KnrKl3bResearchAudit) => void;
};

export type KnrKl3bResolveResult = {
  envelope: KnrKnowledgeEnvelope;
  catalogStore: KnrCatalogStore;
  evidenceStore: KnrRawEvidenceStore;
  ingest?: KnrIngestPipelineResult;
  httpRequestCount: 0;
  researchExecuted: boolean;
  verificationFromResearch: false;
};

function copyBasis(basis: CatalogBasis | null): CatalogBasis {
  if (!basis) return { ...EMPTY_BASIS };
  return {
    family: basis.family,
    catalogId: basis.catalogId,
    tableCode: basis.tableCode,
    rawCode: basis.rawCode,
    display: basis.display,
    normalizedKey: basis.normalizedKey,
  };
}

function line(
  lineId: string,
  basis: CatalogBasis | null,
  lookupStatus: KnrLookupStatus,
  extra: Partial<KnrKnowledgeLineResult> = {},
): KnrKnowledgeLineResult {
  return {
    lineId,
    catalogBasis: copyBasis(basis),
    lookupStatus,
    ...extra,
  };
}

function emitAudit(
  input: KnrKl3bResolveInput,
  action: SecurityAuditAction,
  outcome: string,
  detail?: string,
): void {
  const actor = input.actor;
  if (!actor || !input.recordAudit) return;
  input.recordAudit(
    buildSecurityAuditEntry({
      actor: actor.displayName,
      actorUserId: actor.actorId,
      category: "DATA",
      action,
      severity:
        action === "knr_research_denied" || action === "knr_research_conflict" ? "warn" : "info",
      summary: `KNR research ${outcome}`,
      detail,
      at: input.nowIso,
    }),
  );
}

function pack(
  input: KnrKl3bResolveInput,
  lineResult: KnrKnowledgeLineResult,
  extras: {
    catalogStore: KnrCatalogStore;
    evidenceStore: KnrRawEvidenceStore;
    researchExecuted: boolean;
    ingest?: KnrIngestPipelineResult;
  },
): KnrKl3bResolveResult {
  const envelope: KnrKnowledgeEnvelope = {
    tenderId: input.tenderId,
    schemaVersion: 1,
    lineResults: [lineResult],
    summary: summarizeKnrKnowledgeLines([lineResult], {
      researchExecuted: extras.researchExecuted,
      httpRequestCount: 0,
    }),
  };
  return {
    envelope,
    catalogStore: extras.catalogStore,
    evidenceStore: extras.evidenceStore,
    ingest: extras.ingest,
    httpRequestCount: 0,
    researchExecuted: extras.researchExecuted,
    verificationFromResearch: false,
  };
}

function hasForbiddenUrl(files: readonly KnrKl3bAthFile[]): boolean {
  return files.some((f) => {
    const url = String(f.sourceUrl ?? "").trim();
    return url.length > 0 && FORBIDDEN_URL_RE.test(url);
  });
}

function actorRole(actor: KnrVerifyActor | undefined): AdminRole | "anonymous" {
  return actor?.role ?? "anonymous";
}

/**
 * Resolve PENDING/REJECTED gate entries even when CatalogBasis fold ≠ ATH identityKeyV2.
 * Uses evidenceKeyV1 alias (includes non-servable). Ambiguous alias → null (caller → CONFLICT).
 */
function findResearchGateEntry(
  store: KnrCatalogStore,
  identityKeyV2: string,
  evidenceKeyV1: string | null | undefined,
): KnrCatalogEntry | null | "AMBIGUOUS" {
  const direct = store.entries[identityKeyV2];
  if (direct) return direct;

  const aliasKey = evidenceKeyV1?.trim();
  if (!aliasKey) return null;

  const keys = new Set<string>(store.aliasIndex[aliasKey] ?? []);
  for (const [key, entry] of Object.entries(store.entries)) {
    if (entry.evidenceKeyV1 === aliasKey) keys.add(key);
  }
  const found = [...keys]
    .map((k) => store.entries[k])
    .filter((e): e is KnrCatalogEntry => Boolean(e))
    .sort((a, b) => a.identityKeyV2.localeCompare(b.identityKeyV2));

  if (found.length === 0) return null;
  if (found.length > 1) return "AMBIGUOUS";
  return found[0]!;
}

/**
 * Library Research-on-MISS. Does not write browser storage. Does not call write-router.
 * HIT / INVALID / AMBIGUOUS / REJECTED never start research.
 * MISS research requires explicitResearch + super_admin + L1 licensed ATH file.
 */
export async function resolveKnrKnowledgeKl3b(
  input: KnrKl3bResolveInput,
): Promise<KnrKl3bResolveResult> {
  const catalogStore = input.catalogStore ?? emptyKnrCatalogStore(input.nowIso);
  const evidenceStore = input.evidenceStore ?? emptyKnrRawEvidenceStore(input.nowIso);
  const files = input.athFiles ?? [];

  if (!input.catalogBasis) {
    return pack(input, line(input.lineId, null, "LOCAL_MISS", { gapReason: "NO_CATALOG_BASIS" }), {
      catalogStore,
      evidenceStore,
      researchExecuted: false,
    });
  }

  const partial = parseIdentityPartialFromCatalogBasis(input.catalogBasis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const lookup = lookupKnrCatalog(
    {
      identityKeyV2,
      evidenceKeyV1: partial.evidenceKeyV1,
      partialIdentity: partial,
    },
    catalogStore,
  );

  // INVALID / AMBIGUOUS — no research (do not bypass validation).
  if (lookup.status === "INVALID_LOOKUP") {
    const status: KnrLookupStatus =
      lookup.reason === "ALIAS_AMBIGUOUS" ? "CONFLICT" : "INCOMPLETE";
    return pack(
      input,
      line(input.lineId, input.catalogBasis, status, {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: lookup.reason,
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  // LOCAL HIT — Research NOT called.
  if (lookup.status === "LOCAL_HIT") {
    const stale = lookup.entry.verificationStatus === "STALE";
    return pack(
      input,
      line(input.lineId, input.catalogBasis, stale ? "STALE_HIT" : "LOCAL_HIT", {
        identityKeyV2: lookup.identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        normBundle: lookup.normBundle,
        stale,
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  // Catalog may hold PENDING / REJECTED under ATH identity (≠ CatalogBasis fold).
  const existing = findResearchGateEntry(catalogStore, identityKeyV2, partial.evidenceKeyV1);
  if (existing === "AMBIGUOUS") {
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "CONFLICT", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "ALIAS_AMBIGUOUS",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }
  if (existing?.verificationStatus === "REJECTED") {
    emitAudit(input, "knr_research_denied", "REJECTED_BLOCK", existing.identityKeyV2);
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "INCOMPLETE", {
        identityKeyV2: existing.identityKeyV2,
        evidenceKeyV1: existing.evidenceKeyV1,
        gapReason: "REJECTED_NO_RESEARCH",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }
  if (existing?.verificationStatus === "PENDING_VERIFY") {
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "PENDING_VERIFY", {
        identityKeyV2: existing.identityKeyV2,
        evidenceKeyV1: existing.evidenceKeyV1,
        gapReason: "ALREADY_PENDING_VERIFY",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  // LOCAL_MISS — research only if explicit (FLAG-1.1). executeKnrResearch alone is a no-op.
  if (!input.explicitResearch) {
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_DISABLED", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "EXPLICIT_RESEARCH_REQUIRED",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  const attempt = input.researchAttemptCount ?? 0;
  if (attempt >= KNR_KL3B_MAX_RESEARCH_ATTEMPTS) {
    emitAudit(input, "knr_research_denied", "BUDGET_EXCEEDED", String(attempt));
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_UNAVAILABLE", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "RESEARCH_BUDGET_EXCEEDED",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  const role = actorRole(input.actor);
  if (!input.actor || !adminCanVerifyKnrCatalog(role as AdminRole)) {
    emitAudit(input, "knr_research_denied", "ACL_DENIED", String(role));
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_UNAVAILABLE", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "ACL_DENIED",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  if (hasForbiddenUrl(files)) {
    emitAudit(input, "knr_research_denied", "SSRF_DENIED");
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_UNAVAILABLE", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "SSRF_DENIED",
      }),
      { catalogStore, evidenceStore, researchExecuted: false },
    );
  }

  emitAudit(input, "knr_research_explicit", "STARTED", input.lineId);

  if (files.length === 0) {
    emitAudit(input, "knr_research_denied", "RESEARCH_NO_RESULT");
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_NO_RESULT", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "NO_L1_FILE",
      }),
      { catalogStore, evidenceStore, researchExecuted: true },
    );
  }

  // Ranking ≠ authority: >1 file / >1 target → CONFLICT, no auto-pick.
  const targets = new Set(files.map((f) => f.targetDisplayCode.trim()));
  if (files.length > KNR_KL3B_MAX_L1_FILES || targets.size > 1) {
    emitAudit(input, "knr_research_conflict", "MULTI_CANDIDATE", String(files.length));
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "CONFLICT", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "MULTI_CANDIDATE",
      }),
      { catalogStore, evidenceStore, researchExecuted: true },
    );
  }

  const file = files[0]!;
  const ingest = await ingestAthForKnrOwnerVerify({
    bytes: file.bytes,
    sourceFilename: file.sourceFilename,
    capturedAt: input.nowIso,
    nowIso: input.nowIso,
    targetDisplayCode: file.targetDisplayCode,
    ownerActorId: input.actor.actorId,
    catalogStore,
    evidenceStore,
    licences: input.licences ?? [createDefaultKnrNormaLicence()],
    originId: input.originId,
    autoOwnerVerify: false,
  });

  if (!ingest.ok) {
    const legal = ingest.reason === "LEGAL_GATE_REJECT";
    const status: KnrLookupStatus = legal ? "LEGAL_BLOCK" : "RESEARCH_UNAVAILABLE";
    emitAudit(input, "knr_research_denied", ingest.reason, ingest.messagePl);
    return pack(
      input,
      line(input.lineId, input.catalogBasis, status, {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: ingest.reason,
      }),
      {
        catalogStore,
        evidenceStore,
        researchExecuted: true,
        ingest,
      },
    );
  }

  if (ingest.candidate.verificationStatus === "VERIFIED") {
    emitAudit(input, "knr_research_denied", "AUTO_VERIFIED_FORBIDDEN");
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_UNAVAILABLE", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "AUTO_VERIFIED_FORBIDDEN",
      }),
      { catalogStore, evidenceStore: ingest.evidenceStore, researchExecuted: true, ingest },
    );
  }

  if (ingest.outcome !== "PENDING_VERIFY" && ingest.outcome !== "NOOP") {
    emitAudit(input, "knr_research_denied", "UNEXPECTED_OUTCOME", String(ingest.outcome));
    return pack(
      input,
      line(input.lineId, input.catalogBasis, "RESEARCH_UNAVAILABLE", {
        identityKeyV2,
        evidenceKeyV1: partial.evidenceKeyV1,
        gapReason: "UNEXPECTED_INGEST_OUTCOME",
      }),
      { catalogStore: ingest.catalogStore, evidenceStore: ingest.evidenceStore, researchExecuted: true, ingest },
    );
  }

  emitAudit(input, "knr_research_pending", ingest.outcome);
  return pack(
    input,
    line(input.lineId, input.catalogBasis, "PENDING_VERIFY", {
      identityKeyV2: ingest.candidate.identityKeyV2,
      evidenceKeyV1: ingest.candidate.evidenceKeyV1,
      gapReason:
        ingest.outcome === "NOOP" ? "ALREADY_PENDING_OR_MATCH" : "NORMS_NOT_AUTHORITATIVE_YET",
    }),
    {
      catalogStore: ingest.catalogStore,
      evidenceStore: ingest.evidenceStore,
      researchExecuted: true,
      ingest,
    },
  );
}

export const KNR_KNOWLEDGE_KL3B_IMPLEMENTED = true as const;
export const KNR_KL3B_HTTP_ENABLED = false as const;
export const KNR_KL3B_LLM_ENABLED = false as const;
export const KNR_KL3B_SCRAPER_ENABLED = false as const;
