/**
 * GO38 — Owner Review seam for IdentityCandidate.
 *
 * ACCEPT / EDIT_AND_ACCEPT → deferred (no CatalogWork).
 * REJECT → durable REJECTED.
 * REQUEST_RESEARCH → intent only on OWNER_REVIEW.
 */

import type { IdentityOwnerDecisionKind } from "@/lib/work-catalog/identity-candidate-contract";
import {
  IDENTITY_CANDIDATE_EDITABLE_FIELDS,
  type IdentityCandidateEditableField,
  type IdentityCandidateRecord,
} from "@/lib/work-catalog/identity-candidate-types";
import {
  findDurableById,
  upsertDurableCandidate,
} from "@/lib/work-catalog/identity-candidate-store";

export type OwnerReviewAction = Exclude<IdentityOwnerDecisionKind, "PENDING">;

export type OwnerReviewSubmitInput = {
  candidateId: string;
  action: OwnerReviewAction;
  actor: string;
  note?: string | null;
  edits?: Partial<Record<IdentityCandidateEditableField, string | null>>;
  nowIso?: string;
};

export type OwnerReviewSubmitResult =
  | {
      ok: true;
      candidate: IdentityCandidateRecord;
      catalogWorkCreated: false;
      canonicalAcceptExecuted: false;
      researchExecuted: false;
      deferredToGo39?: boolean;
    }
  | { ok: false; code: string; message: string };

function appendAudit(
  c: IdentityCandidateRecord,
  action: IdentityCandidateRecord["auditLog"][number]["action"],
  detail: string,
  actor: string,
  nowIso: string,
): IdentityCandidateRecord {
  return {
    ...c,
    updatedAt: nowIso,
    auditLog: [
      ...c.auditLog,
      {
        id: `ica:${nowIso}:${c.auditLog.length + 1}`,
        at: nowIso,
        action,
        detail,
        actor,
      },
    ],
  };
}

function applyEdits(
  c: IdentityCandidateRecord,
  edits: OwnerReviewSubmitInput["edits"],
): { ok: true; next: IdentityCandidateRecord } | { ok: false; code: string; message: string } {
  if (!edits || Object.keys(edits).length === 0) {
    return { ok: true, next: c };
  }
  for (const key of Object.keys(edits)) {
    if (!(IDENTITY_CANDIDATE_EDITABLE_FIELDS as readonly string[]).includes(key)) {
      return {
        ok: false,
        code: "IMMUTABLE_FIELD",
        message: `Field not editable: ${key}`,
      };
    }
  }
  // Never mutate fingerprint / candidateId / originalEvidence / provenance
  const reviewEdits = {
    ...(c.reviewEdits ?? {}),
    ...Object.fromEntries(
      Object.entries(edits).filter(([, v]) => v !== undefined),
    ),
  };
  return {
    ok: true,
    next: {
      ...c,
      reviewEdits,
      // Surface editable display fields from edits without touching originalEvidence
      label: edits.label != null ? String(edits.label) : c.label,
      description: edits.description != null ? String(edits.description) : c.description,
      unit: edits.unit != null ? String(edits.unit) : c.unit,
      technology: edits.technology !== undefined ? edits.technology : c.technology,
      scope: edits.scope != null ? String(edits.scope) : c.scope,
      slugHint: edits.slugHint !== undefined ? edits.slugHint : c.slugHint,
      fingerprint: c.fingerprint,
      candidateId: c.candidateId,
      originalEvidence: c.originalEvidence,
      provenance: c.provenance,
    },
  };
}

/**
 * Owner Review read model for UI seam.
 */
export function buildOwnerReviewReadModel(candidateId: string): {
  found: boolean;
  candidate: IdentityCandidateRecord | null;
  actions: OwnerReviewAction[];
  acceptCreatesCatalogWork: false;
  editableFields: readonly IdentityCandidateEditableField[];
  immutableFields: string[];
} {
  const candidate = findDurableById(candidateId);
  return {
    found: !!candidate && candidate.status === "OWNER_REVIEW",
    candidate: candidate?.status === "OWNER_REVIEW" ? candidate : candidate,
    actions: ["ACCEPT", "REJECT", "REQUEST_RESEARCH", "EDIT_AND_ACCEPT"],
    acceptCreatesCatalogWork: false,
    editableFields: IDENTITY_CANDIDATE_EDITABLE_FIELDS,
    immutableFields: [
      "candidateId",
      "fingerprint",
      "provenance",
      "originalEvidence",
      "HARD negatives (originalEvidence.negativeEvidence)",
    ],
  };
}

/**
 * Submit Owner Review action — GO38 hard stop on canonical Accept.
 */
export function submitOwnerReviewAction(input: OwnerReviewSubmitInput): OwnerReviewSubmitResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const cur = findDurableById(input.candidateId);
  if (!cur) {
    return { ok: false, code: "NOT_FOUND", message: "Durable candidate not found" };
  }
  if (cur.status === "REJECTED") {
    return { ok: false, code: "ALREADY_REJECTED", message: "Candidate already REJECTED" };
  }
  if (cur.status === "SUPERSEDED") {
    return { ok: false, code: "SUPERSEDED", message: "Candidate SUPERSEDED" };
  }
  if (cur.status !== "OWNER_REVIEW") {
    return {
      ok: false,
      code: "NOT_IN_REVIEW",
      message: `Expected OWNER_REVIEW, got ${cur.status}`,
    };
  }

  // Idempotent: same REJECT already applied
  if (input.action === "REJECT" && cur.ownerDecision.kind === "REJECT" && cur.status === "REJECTED") {
    return {
      ok: true,
      candidate: cur,
      catalogWorkCreated: false,
      canonicalAcceptExecuted: false,
      researchExecuted: false,
    };
  }

  if (input.action === "ACCEPT") {
    let next = appendAudit(
      cur,
      "owner_accept_deferred",
      "ACCEPT recorded — canonical CatalogWork deferred to GO39",
      input.actor,
      nowIso,
    );
    next = {
      ...next,
      ownerDecision: {
        kind: "ACCEPT",
        decidedAt: nowIso,
        note: input.note ?? "GO38: Accept deferred — no CatalogWork",
        canonicalAcceptDeferredToGo39: true,
      },
      // Remain OWNER_REVIEW — do NOT set ACCEPTED_CANONICAL
      status: "OWNER_REVIEW",
      acceptedCanonicalProvenance: null,
      mayWriteCatalogWork: false,
    };
    upsertDurableCandidate(next, nowIso);
    return {
      ok: true,
      candidate: findDurableById(input.candidateId)!,
      catalogWorkCreated: false,
      canonicalAcceptExecuted: false,
      researchExecuted: false,
      deferredToGo39: true,
    };
  }

  if (input.action === "EDIT_AND_ACCEPT") {
    const edited = applyEdits(cur, input.edits);
    if (!edited.ok) return edited;
    let next = appendAudit(
      edited.next,
      "owner_edit",
      `edits=${Object.keys(input.edits ?? {}).join(",")}`,
      input.actor,
      nowIso,
    );
    next = appendAudit(
      next,
      "owner_accept_deferred",
      "EDIT_AND_ACCEPT — edits persisted; canonical deferred to GO39",
      input.actor,
      nowIso,
    );
    next = {
      ...next,
      ownerDecision: {
        kind: "EDIT_AND_ACCEPT",
        decidedAt: nowIso,
        note: input.note ?? "GO38: edits only; Accept deferred",
        canonicalAcceptDeferredToGo39: true,
      },
      status: "OWNER_REVIEW",
      acceptedCanonicalProvenance: null,
      mayWriteCatalogWork: false,
    };
    upsertDurableCandidate(next, nowIso);
    return {
      ok: true,
      candidate: findDurableById(input.candidateId)!,
      catalogWorkCreated: false,
      canonicalAcceptExecuted: false,
      researchExecuted: false,
      deferredToGo39: true,
    };
  }

  if (input.action === "REQUEST_RESEARCH") {
    let next = appendAudit(
      cur,
      "owner_request_research",
      input.note ?? "Owner requested research — intent only",
      input.actor,
      nowIso,
    );
    next = {
      ...next,
      ownerDecision: {
        kind: "REQUEST_RESEARCH",
        decidedAt: nowIso,
        note: input.note ?? null,
        canonicalAcceptDeferredToGo39: false,
      },
      status: "OWNER_REVIEW",
    };
    upsertDurableCandidate(next, nowIso);
    return {
      ok: true,
      candidate: findDurableById(input.candidateId)!,
      catalogWorkCreated: false,
      canonicalAcceptExecuted: false,
      researchExecuted: false,
    };
  }

  if (input.action === "REJECT") {
    let next = appendAudit(
      cur,
      "owner_reject",
      input.note ?? "Owner REJECT",
      input.actor,
      nowIso,
    );
    next = {
      ...next,
      status: "REJECTED",
      persistence: "DURABLE",
      ownerDecision: {
        kind: "REJECT",
        decidedAt: nowIso,
        note: input.note ?? null,
        canonicalAcceptDeferredToGo39: false,
      },
      rejectionHistory: [
        ...next.rejectionHistory,
        { at: nowIso, reason: input.note ?? "REJECT", by: input.actor },
      ],
      acceptedCanonicalProvenance: null,
    };
    upsertDurableCandidate(next, nowIso);
    return {
      ok: true,
      candidate: findDurableById(input.candidateId)!,
      catalogWorkCreated: false,
      canonicalAcceptExecuted: false,
      researchExecuted: false,
    };
  }

  return { ok: false, code: "UNKNOWN_ACTION", message: String(input.action) };
}

/** Schema existence check for ACCEPTED provenance (GO39) — never populated in GO38. */
export function acceptedCanonicalProvenanceSchemaExists(): true {
  return true;
}
