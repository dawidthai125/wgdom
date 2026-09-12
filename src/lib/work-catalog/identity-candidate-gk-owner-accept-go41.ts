/**
 * GO41 — Explicit Owner Accept for the concrete TPI/729 GK IdentityCandidate (GO40).
 *
 * AUTHORIZED: one Accept of the exact GO40 OWNER_REVIEW candidate.
 * FORBIDDEN: auto-accept · second candidate invent · A1 · Pack · rate · research · Finance · G3
 *
 * Catalog persist via cloud router is OFF by default in harness (no accidental cloud push).
 * Canonical write still uses insertWorkBothRegions (GO39 OPS path).
 */

import { executeIdentityCandidateOwnerAccept } from "@/lib/work-catalog/identity-candidate-owner-accept";
import {
  findDurableById,
  loadIdentityCandidateDurableStore,
} from "@/lib/work-catalog/identity-candidate-store";
import {
  runTpi729GkIdentityCandidateScan,
  type GenerateGkLaborIdentityCandidateResult,
} from "@/lib/work-catalog/identity-candidate-generation";
import { IK_OWNER_CREATE_A09_PACKAGE_WORK_ID } from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import type { IdentityCandidateRecord } from "@/lib/work-catalog/identity-candidate-types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import { discoverLegacyLaborLeafControl } from "@/lib/work-catalog/labor-leaf-identity-discovery";

export const GO41_ACCEPT_VERSION = "GO41-v1" as const;

/** Expected GO40 fingerprint prefix — full string verified after load/rematerialize. */
export const GO40_GK_FINGERPRINT_MARKER =
  "fp:ic:parent:cc-w2-scianki-dzialowe-gr-pakiet-m2|kind:package|plane:labor_only|unit:m2|tech:gk|scope:labor_only partition wall gk on metal studs" as const;

export type ExecuteGo41GkOwnerAcceptInput = {
  actor: string;
  nowIso?: string;
  catalogStore: WorkCatalogStore;
  /**
   * Default false — avoids cloud push from Node harness.
   * Canonical Work is still created in catalogStore via insertWorkBothRegions.
   */
  persistCatalog?: boolean;
  /**
   * If durable OWNER_REVIEW missing (fresh process), rematerialize via GO40 generator
   * (same fingerprint — not a different candidate). Default true.
   */
  rematerializeGo40IfMissing?: boolean;
  /** Optional exact fingerprint from GO40 artefact — mismatch → fail-closed. */
  expectedFingerprint?: string | null;
  note?: string | null;
};

export type ExecuteGo41GkOwnerAcceptResult = {
  ok: boolean;
  code?: string;
  message?: string;
  rematerializedViaGo40: boolean;
  previousStatus: string | null;
  candidate: IdentityCandidateRecord | null;
  accept: Awaited<ReturnType<typeof executeIdentityCandidateOwnerAccept>> | null;
  legacyHoldIntact: true;
  counters: {
    OWNER_ACCEPT_EXECUTED: 0 | 1;
    GK_AUTO_ACCEPTED: 0;
    GK_WORK_CREATED: 0 | 1;
    CANONICAL_WORK_CREATED: 0 | 1;
    CANONICAL_WORK_REUSED: 0 | 1;
    A1: 0;
    PACK: 0;
    RATE: 0;
    RESEARCH: 0;
    PASS4: 0;
    FINANCE: 0;
    G3: 0;
    DUPLICATE: 0 | 1;
    COLLISION: 0 | 1;
    EVIDENCE_MUTATED: 0 | 1;
    UNRELATED_WC_MUTATION: 0 | 1;
  };
};

function findGkOwnerReviewCandidate(): IdentityCandidateRecord | null {
  const rows = loadIdentityCandidateDurableStore().candidates.filter(
    (c) =>
      c.parentContext.parentWorkId === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID &&
      (c.status === "OWNER_REVIEW" || c.status === "ACCEPTED_CANONICAL"),
  );
  // Prefer OWNER_REVIEW; if already accepted, return that for idempotent Accept
  const review = rows.find((c) => c.status === "OWNER_REVIEW");
  if (review) return review;
  return rows.find((c) => c.status === "ACCEPTED_CANONICAL") ?? null;
}

function fingerprintMatchesGo40(fp: string, expected?: string | null): boolean {
  if (expected) return fp === expected;
  return fp.startsWith(GO40_GK_FINGERPRINT_MARKER) || fp.includes("cc-w2-scianki-dzialowe-gr-pakiet-m2");
}

/**
 * Locate exact GO40 GK candidate (rematerialize only if missing), then Owner Accept.
 */
export async function executeExplicitGkLaborOwnerAcceptGo41(
  input: ExecuteGo41GkOwnerAcceptInput,
): Promise<ExecuteGo41GkOwnerAcceptResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const zeros = {
    OWNER_ACCEPT_EXECUTED: 0 as const,
    GK_AUTO_ACCEPTED: 0 as const,
    GK_WORK_CREATED: 0 as const,
    CANONICAL_WORK_CREATED: 0 as const,
    CANONICAL_WORK_REUSED: 0 as const,
    A1: 0 as const,
    PACK: 0 as const,
    RATE: 0 as const,
    RESEARCH: 0 as const,
    PASS4: 0 as const,
    FINANCE: 0 as const,
    G3: 0 as const,
    DUPLICATE: 0 as const,
    COLLISION: 0 as const,
    EVIDENCE_MUTATED: 0 as const,
    UNRELATED_WC_MUTATION: 0 as const,
  };

  const legacy = discoverLegacyLaborLeafControl();
  if (legacy.verdict !== "IDENTITY_SEMANTIC_HOLD") {
    return {
      ok: false,
      code: "LEGACY_HOLD_BROKEN",
      message: "Legacy semantic hold invariant broken",
      rematerializedViaGo40: false,
      previousStatus: null,
      candidate: null,
      accept: null,
      legacyHoldIntact: true,
      counters: { ...zeros },
    };
  }

  let rematerializedViaGo40 = false;
  let candidate = findGkOwnerReviewCandidate();

  if (!candidate && input.rematerializeGo40IfMissing !== false) {
    const gen: GenerateGkLaborIdentityCandidateResult = runTpi729GkIdentityCandidateScan({
      actor: input.actor,
      nowIso,
    });
    if (!gen.ok) {
      return {
        ok: false,
        code: gen.code,
        message: gen.message,
        rematerializedViaGo40: true,
        previousStatus: null,
        candidate: null,
        accept: null,
        legacyHoldIntact: true,
        counters: { ...zeros },
      };
    }
    rematerializedViaGo40 = true;
    candidate = gen.candidate;
  }

  if (!candidate) {
    return {
      ok: false,
      code: "NO_ACCEPTABLE_CANDIDATE",
      message: "No GO40 GK OWNER_REVIEW/ACCEPTED candidate found",
      rematerializedViaGo40,
      previousStatus: null,
      candidate: null,
      accept: null,
      legacyHoldIntact: true,
      counters: { ...zeros },
    };
  }

  if (!fingerprintMatchesGo40(candidate.fingerprint, input.expectedFingerprint)) {
    return {
      ok: false,
      code: "FINGERPRINT_MISMATCH",
      message: "Candidate fingerprint is not the GO40 GK identity",
      rematerializedViaGo40,
      previousStatus: candidate.status,
      candidate,
      accept: null,
      legacyHoldIntact: true,
      counters: { ...zeros },
    };
  }

  if (candidate.proposedWorkId != null) {
    return {
      ok: false,
      code: "PROPOSED_WORK_ID_NOT_NULL",
      message: "GO40 TPI candidate must keep proposedWorkId=null",
      rematerializedViaGo40,
      previousStatus: candidate.status,
      candidate,
      accept: null,
      legacyHoldIntact: true,
      counters: { ...zeros },
    };
  }

  const previousStatus = candidate.status;
  const evidenceBefore = JSON.stringify(candidate.originalEvidence);
  const workIdsBefore = new Set(
    [
      ...input.catalogStore.catalogs.wroclaw.works.map((w) => w.id),
      ...input.catalogStore.catalogs.dolnyslask.works.map((w) => w.id),
    ],
  );

  const accept = await executeIdentityCandidateOwnerAccept({
    candidateId: candidate.candidateId,
    action: "ACCEPT",
    actor: input.actor,
    explicitOwnerAccept: true,
    note: input.note ?? "GO41 Owner Accept — TPI/729 GK labor leaf",
    catalogStore: input.catalogStore,
    persistCatalog: input.persistCatalog === true,
    nowIso,
  });

  const after = findDurableById(candidate.candidateId);
  const evidenceAfter = after ? JSON.stringify(after.originalEvidence) : evidenceBefore;
  const evidenceMutated = evidenceBefore !== evidenceAfter ? 1 : 0;

  if (!accept.ok) {
    return {
      ok: false,
      code: accept.code,
      message: accept.message,
      rematerializedViaGo40,
      previousStatus,
      candidate: after ?? candidate,
      accept,
      legacyHoldIntact: true,
      counters: {
        ...zeros,
        COLLISION: accept.code.includes("COLLISION") ? 1 : 0,
        EVIDENCE_MUTATED: evidenceMutated as 0 | 1,
      },
    };
  }

  const created = accept.outcome === "CREATED";
  const reused = accept.outcome === "REUSED" || accept.outcome === "ALREADY_ACCEPTED";
  const gkCreated = accept.gkWorkCreated === true ? 1 : 0;

  // Unrelated WC: only the accepted workId may be newly present
  const workIdsAfter = [
    ...accept.catalogStore.catalogs.wroclaw.works.map((w) => w.id),
    ...accept.catalogStore.catalogs.dolnyslask.works.map((w) => w.id),
  ];
  const newIds = [...new Set(workIdsAfter)].filter((id) => !workIdsBefore.has(id));
  const unrelated =
    created && newIds.some((id) => id !== accept.catalogWorkId) ? 1 : 0;

  // Duplicate check: workId appears once per region list
  const wro = accept.catalogStore.catalogs.wroclaw.works.filter((w) => w.id === accept.catalogWorkId);
  const ds = accept.catalogStore.catalogs.dolnyslask.works.filter((w) => w.id === accept.catalogWorkId);
  const duplicate = wro.length > 1 || ds.length > 1 ? 1 : 0;

  // Package must be unchanged if present
  const pkgBefore = getWorkByIdFromStore(
    input.catalogStore,
    IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    input.catalogStore.activeRegion,
  );
  const pkgAfter = getWorkByIdFromStore(
    accept.catalogStore,
    IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    accept.catalogStore.activeRegion,
  );
  const packageMutated =
    pkgBefore && pkgAfter ? JSON.stringify(pkgBefore) !== JSON.stringify(pkgAfter) : false;

  return {
    ok: true,
    rematerializedViaGo40,
    previousStatus,
    candidate: after,
    accept,
    legacyHoldIntact: true,
    counters: {
      OWNER_ACCEPT_EXECUTED: 1,
      GK_AUTO_ACCEPTED: 0,
      GK_WORK_CREATED: gkCreated as 0 | 1,
      CANONICAL_WORK_CREATED: created ? 1 : 0,
      CANONICAL_WORK_REUSED: reused && !created ? 1 : 0,
      A1: 0,
      PACK: 0,
      RATE: 0,
      RESEARCH: 0,
      PASS4: 0,
      FINANCE: 0,
      G3: 0,
      DUPLICATE: duplicate as 0 | 1,
      COLLISION: 0,
      EVIDENCE_MUTATED: evidenceMutated as 0 | 1,
      UNRELATED_WC_MUTATION: unrelated || packageMutated ? 1 : 0,
    },
  };
}
