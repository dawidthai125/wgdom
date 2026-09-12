/**
 * GO39 — IdentityCandidate Owner Accept → Canonical CatalogWork.
 *
 * Atomic Accept transaction (KV-safe idempotent protocol).
 * NEVER auto-accepts GK · NEVER invents TPI labor leaf · NEVER OUR RATE / pack / A1.
 *
 * Explicit Owner action + OWNER_REVIEW candidate required.
 */

import {
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import {
  IDENTITY_CANDIDATE_EDITABLE_FIELDS,
  type IdentityCandidateEditableField,
  type IdentityCandidateRecord,
} from "@/lib/work-catalog/identity-candidate-types";
import {
  findDurableById,
  loadIdentityCandidateDurableStore,
  upsertDurableCandidate,
} from "@/lib/work-catalog/identity-candidate-store";
import { TRADE_IDS, type TradeId } from "@/lib/work-catalog/trades";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  CatalogWorkDuplicateIdError,
  catalogWorkExistsInStore,
  insertWorkBothRegions,
} from "@/lib/work-catalog/work-catalog-insert";

function isGkA09LaborLeafCandidate(c: IdentityCandidateRecord): boolean {
  return c.parentContext.parentWorkId === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
}

function downstreamZeros() {
  return {
    gkAutoAccepted: false as const,
    ourRateMutated: false as const,
    packMutated: false as const,
    researchExecuted: false as const,
    financeMutated: false as const,
    g3Mutated: false as const,
    a1Mutated: false as const,
    pass4Mutated: false as const,
    packageMutated: false as const,
  };
}

export type OwnerAcceptAction = "ACCEPT" | "EDIT_AND_ACCEPT";

export type ExecuteIdentityCandidateOwnerAcceptInput = {
  candidateId: string;
  action: OwnerAcceptAction;
  actor: string;
  /** Must be true — GO39 does not infer Owner intent. */
  explicitOwnerAccept: true;
  note?: string | null;
  edits?: Partial<Record<IdentityCandidateEditableField, string | null>>;
  nowIso?: string;
  /** Injected store (tests use isolated empty fixture). */
  catalogStore: WorkCatalogStore;
  /** Persist via saveWorkCatalogRouted — default false (tests / dry). */
  persistCatalog?: boolean;
};

export type ExecuteIdentityCandidateOwnerAcceptResult =
  | {
      ok: true;
      outcome: "CREATED" | "REUSED" | "ALREADY_ACCEPTED";
      candidate: IdentityCandidateRecord;
      catalogWorkId: string;
      catalogStore: WorkCatalogStore;
      catalogPersisted: boolean;
      catalogWorkCreated: boolean;
      catalogWorkReused: boolean;
      /**
       * true only when this Accept CREATED a new CatalogWork for the A09 GK package labor leaf.
       * Never true via auto-accept (auto path does not exist).
       */
      gkWorkCreated: boolean;
      gkAutoAccepted: false;
      ourRateMutated: false;
      packMutated: false;
      researchExecuted: false;
      financeMutated: false;
      g3Mutated: false;
      a1Mutated: false;
      pass4Mutated: false;
      packageMutated: false;
    }
  | {
      ok: false;
      code: string;
      message: string;
      catalogStore: WorkCatalogStore;
      catalogWorkCreated: false;
      catalogWorkReused: false;
      gkWorkCreated: false;
      gkAutoAccepted: false;
      a1Mutated: false;
      packMutated: false;
      ourRateMutated: false;
      researchExecuted: false;
      pass4Mutated: false;
      financeMutated: false;
      g3Mutated: false;
      packageMutated: false;
    };

const FINGERPRINT_MATERIAL_FIELDS = new Set(["unit", "technology", "scope"]);

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

function fail(
  code: string,
  message: string,
  catalogStore: WorkCatalogStore,
  candidate?: IdentityCandidateRecord | null,
  actor = "system",
  nowIso = new Date().toISOString(),
): ExecuteIdentityCandidateOwnerAcceptResult {
  if (candidate && candidate.status === "OWNER_REVIEW") {
    try {
      const next = appendAudit(candidate, "owner_accept_failed", `${code}: ${message}`, actor, nowIso);
      upsertDurableCandidate(
        {
          ...next,
          status: "OWNER_REVIEW",
          acceptedCanonicalProvenance: null,
          mayWriteCatalogWork: false,
        },
        nowIso,
      );
    } catch {
      /* best-effort audit */
    }
  }
  return {
    ok: false,
    code,
    message,
    catalogStore,
    catalogWorkCreated: false,
    catalogWorkReused: false,
    gkWorkCreated: false,
    gkAutoAccepted: false,
    a1Mutated: false,
    packMutated: false,
    ourRateMutated: false,
    researchExecuted: false,
    pass4Mutated: false,
    financeMutated: false,
    g3Mutated: false,
    packageMutated: false,
  };
}

function resolveTradeId(family: string): TradeId {
  if ((TRADE_IDS as readonly string[]).includes(family)) return family as TradeId;
  return "SCIANY_GK";
}

function costSplitForPlane(
  plane: IdentityCandidateRecord["classification"]["intendedPlane"],
): CatalogWork["costSplit"] {
  if (plane === "LABOR_ONLY") return { materialRatio: 0.05, laborRatio: 0.95 };
  if (plane === "MATERIAL_ONLY") return { materialRatio: 0.95, laborRatio: 0.05 };
  if (plane === "PACKAGE") return { materialRatio: 0.5, laborRatio: 0.5 };
  return { materialRatio: 0.5, laborRatio: 0.5 };
}

/** Deterministic mint from fingerprint — never trusts proposedWorkId. */
export function mintCanonicalWorkIdFromFingerprint(fingerprint: string): string {
  let h = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    h ^= fingerprint.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `cc-ic-accept-${hex}`;
}

function applyDisplayEdits(
  c: IdentityCandidateRecord,
  edits: ExecuteIdentityCandidateOwnerAcceptInput["edits"],
): { ok: true; next: IdentityCandidateRecord } | { ok: false; code: string; message: string } {
  if (!edits || Object.keys(edits).length === 0) return { ok: true, next: c };
  for (const key of Object.keys(edits)) {
    if (!(IDENTITY_CANDIDATE_EDITABLE_FIELDS as readonly string[]).includes(key)) {
      return { ok: false, code: "IMMUTABLE_FIELD", message: `Field not editable: ${key}` };
    }
    if (FINGERPRINT_MATERIAL_FIELDS.has(key)) {
      const prev =
        key === "unit"
          ? c.unit
          : key === "technology"
            ? c.technology
            : c.scope;
      const nextVal = edits[key as IdentityCandidateEditableField];
      if (String(prev ?? "") !== String(nextVal ?? "")) {
        return {
          ok: false,
          code: "FINGERPRINT_MATERIAL_CHANGE",
          message:
            "unit/technology/scope edits change fingerprint material — create a new IdentityCandidate (GO36); do not silent-mutate",
        };
      }
    }
  }
  return {
    ok: true,
    next: {
      ...c,
      reviewEdits: { ...(c.reviewEdits ?? {}), ...edits },
      label: edits.label != null ? String(edits.label) : c.label,
      description: edits.description != null ? String(edits.description) : c.description,
      slugHint: edits.slugHint !== undefined ? edits.slugHint : c.slugHint,
      fingerprint: c.fingerprint,
      candidateId: c.candidateId,
      originalEvidence: c.originalEvidence,
      provenance: c.provenance,
      unit: c.unit,
      technology: c.technology,
      scope: c.scope,
    },
  };
}

function findAcceptedWorkIdForFingerprint(fingerprint: string): string | null {
  for (const c of loadIdentityCandidateDurableStore().candidates) {
    if (
      c.fingerprint === fingerprint &&
      c.status === "ACCEPTED_CANONICAL" &&
      c.acceptedCanonicalProvenance?.catalogWorkId
    ) {
      return c.acceptedCanonicalProvenance.catalogWorkId;
    }
  }
  return null;
}

/**
 * Evidence-backed REUSE — exact active CatalogWork by slugHint id + unit match.
 * No similarity / price / KNR-alone.
 */
function tryReuseExistingWork(
  store: WorkCatalogStore,
  candidate: IdentityCandidateRecord,
): { workId: string; reason: string } | null {
  const mapped = findAcceptedWorkIdForFingerprint(candidate.fingerprint);
  if (mapped && catalogWorkExistsInStore(store, mapped)) {
    return { workId: mapped, reason: "fingerprint_provenance_map" };
  }

  const hint = (candidate.slugHint ?? "").trim();
  if (!hint) return null;
  const existing = getWorkByIdFromStore(store, hint, store.activeRegion)
    ?? getWorkByIdFromStore(store, hint, "wroclaw")
    ?? getWorkByIdFromStore(store, hint, "dolnyslask");
  if (!existing || !existing.active) return null;
  if (existing.unit !== candidate.unit) return null;
  return { workId: existing.id, reason: "exact_id_unit_active" };
}

function buildCatalogWorkFromCandidate(
  candidate: IdentityCandidateRecord,
  workId: string,
  nowIso: string,
): CatalogWork {
  return {
    id: workId,
    tradeId: resolveTradeId(candidate.family),
    namePl: candidate.label,
    unit: candidate.unit as CatalogWork["unit"],
    companyPricePln: 0,
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: candidate.description || undefined,
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: costSplitForPlane(candidate.classification.intendedPlane),
    // NEVER set ourWorkRate
  };
}

/**
 * Resolve whether any OWNER_REVIEW candidate is Accept-eligible (read-only).
 * Does not create candidates. Real TPI/GK must not be auto-selected.
 */
export function listOwnerReviewAcceptableCandidates(): IdentityCandidateRecord[] {
  return loadIdentityCandidateDurableStore().candidates.filter(
    (c) =>
      c.status === "OWNER_REVIEW" &&
      !!c.fingerprint &&
      !!c.originalEvidence &&
      c.acceptedCanonicalProvenance == null,
  );
}

export function reportNoAcceptableCandidateIfEmpty(): {
  code: "NO_ACCEPTABLE_CANDIDATE" | "HAS_CANDIDATES";
  count: number;
} {
  const list = listOwnerReviewAcceptableCandidates();
  return {
    code: list.length === 0 ? "NO_ACCEPTABLE_CANDIDATE" : "HAS_CANDIDATES",
    count: list.length,
  };
}

/**
 * Execute Owner Accept → Canonical Work (GO39).
 */
export async function executeIdentityCandidateOwnerAccept(
  input: ExecuteIdentityCandidateOwnerAcceptInput,
): Promise<ExecuteIdentityCandidateOwnerAcceptResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  let store = input.catalogStore;

  if (input.explicitOwnerAccept !== true) {
    return fail("OWNER_ACCEPT_NOT_EXPLICIT", "explicitOwnerAccept must be true", store);
  }
  if (input.action !== "ACCEPT" && input.action !== "EDIT_AND_ACCEPT") {
    return fail("MISSING_OWNER_ACTION", "Owner action ACCEPT or EDIT_AND_ACCEPT required", store);
  }

  const cur = findDurableById(input.candidateId);
  if (!cur) {
    return fail("NOT_FOUND", "Durable candidate not found", store, null, input.actor, nowIso);
  }
  if (cur.status === "REJECTED") {
    return fail("REJECTED", "REJECTED candidate cannot be Accepted", store, cur, input.actor, nowIso);
  }
  if (cur.status === "SUPERSEDED") {
    return fail("SUPERSEDED", "SUPERSEDED candidate cannot be Accepted", store, cur, input.actor, nowIso);
  }
  if (cur.status === "ACCEPTED_CANONICAL" && cur.acceptedCanonicalProvenance?.catalogWorkId) {
    const workId = cur.acceptedCanonicalProvenance.catalogWorkId;
    return {
      ok: true,
      outcome: "ALREADY_ACCEPTED",
      candidate: cur,
      catalogWorkId: workId,
      catalogStore: store,
      catalogPersisted: false,
      catalogWorkCreated: false,
      catalogWorkReused: true,
      gkWorkCreated: false,
      ...downstreamZeros(),
    };
  }
  if (cur.status !== "OWNER_REVIEW") {
    return fail(
      "NOT_IN_REVIEW",
      `Expected OWNER_REVIEW, got ${cur.status}`,
      store,
      cur,
      input.actor,
      nowIso,
    );
  }
  if (!cur.fingerprint || !cur.originalEvidence) {
    return fail("INVALID_FINGERPRINT", "fingerprint/evidence missing", store, cur, input.actor, nowIso);
  }

  let working = appendAudit(
    cur,
    "owner_accept_requested",
    `action=${input.action}`,
    input.actor,
    nowIso,
  );

  if (input.action === "EDIT_AND_ACCEPT") {
    const edited = applyDisplayEdits(working, input.edits);
    if (!edited.ok) {
      return fail(edited.code, edited.message, store, working, input.actor, nowIso);
    }
    working = appendAudit(
      edited.next,
      "owner_edit",
      `edits=${Object.keys(input.edits ?? {}).join(",")}`,
      input.actor,
      nowIso,
    );
  }

  // proposedWorkId must never force id
  if (working.proposedWorkId != null) {
    return fail(
      "PROPOSED_WORK_ID_NOT_NULL",
      "proposedWorkId must remain null until mint (INTENT only)",
      store,
      working,
      input.actor,
      nowIso,
    );
  }

  const reuse = tryReuseExistingWork(store, working);
  if (reuse) {
    const accepted: IdentityCandidateRecord = {
      ...appendAudit(working, "owner_accept_reused", `workId=${reuse.workId};${reuse.reason}`, input.actor, nowIso),
      status: "ACCEPTED_CANONICAL",
      persistence: "DURABLE",
      ownerDecision: {
        kind: input.action,
        decidedAt: nowIso,
        note: input.note ?? `REUSE ${reuse.reason}`,
        canonicalAcceptDeferredToGo39: false,
      },
      acceptedCanonicalProvenance: {
        catalogWorkId: reuse.workId,
        acceptedAt: nowIso,
        fingerprint: working.fingerprint,
        actor: input.actor,
      },
      mayWriteCatalogWork: false,
      mayAssignLaborWorkId: false,
      mayActivatePack: false,
      maySetOurRate: false,
    };
    upsertDurableCandidate(accepted, nowIso);
    return {
      ok: true,
      outcome: "REUSED",
      candidate: findDurableById(input.candidateId)!,
      catalogWorkId: reuse.workId,
      catalogStore: store,
      catalogPersisted: false,
      catalogWorkCreated: false,
      catalogWorkReused: true,
      gkWorkCreated: false,
      ...downstreamZeros(),
    };
  }

  // NEW — MINT_ON_ACCEPT
  const hint = (working.slugHint ?? "").trim();
  let workId = mintCanonicalWorkIdFromFingerprint(working.fingerprint);

  if (hint) {
    if (catalogWorkExistsInStore(store, hint)) {
      // Exists but tryReuse failed (unit mismatch / inactive) → collision fail-closed
      return fail(
        "CANONICAL_ID_COLLISION",
        `slugHint ${hint} collides with existing CatalogWork and is not safe REUSE`,
        store,
        working,
        input.actor,
        nowIso,
      );
    }
    // Free hint may be used as minted id (Owner slug) — still minted at Accept time
    workId = hint;
  }

  if (catalogWorkExistsInStore(store, workId)) {
    // Same fingerprint map should have REUSEd; different identity → fail
    return fail(
      "CANONICAL_ID_COLLISION",
      `minted id ${workId} already exists`,
      store,
      working,
      input.actor,
      nowIso,
    );
  }

  const draft = buildCatalogWorkFromCandidate(working, workId, nowIso);
  try {
    store = insertWorkBothRegions(store, draft, nowIso);
  } catch (e) {
    const msg =
      e instanceof CatalogWorkDuplicateIdError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    return fail("CANONICAL_WRITE_FAILED", msg, store, working, input.actor, nowIso);
  }

  let catalogPersisted = false;
  if (input.persistCatalog === true) {
    const routed = await saveWorkCatalogRouted(store, { previousStore: input.catalogStore });
    if (!routed.ok || ("blocked" in routed && routed.blocked)) {
      // Compensating: do NOT mark ACCEPTED_CANONICAL — leave OWNER_REVIEW + failure audit
      return fail(
        "CATALOG_PERSIST_FAILED",
        "saveWorkCatalogRouted failed/blocked — Accept not completed",
        input.catalogStore,
        working,
        input.actor,
        nowIso,
      );
    }
    catalogPersisted = routed.saved === true;
  }

  const accepted: IdentityCandidateRecord = {
    ...appendAudit(working, "owner_accept_created", `workId=${workId}`, input.actor, nowIso),
    status: "ACCEPTED_CANONICAL",
    persistence: "DURABLE",
    ownerDecision: {
      kind: input.action,
      decidedAt: nowIso,
      note: input.note ?? "CREATED",
      canonicalAcceptDeferredToGo39: false,
    },
    acceptedCanonicalProvenance: {
      catalogWorkId: workId,
      acceptedAt: nowIso,
      fingerprint: working.fingerprint,
      actor: input.actor,
    },
    mayWriteCatalogWork: false,
    mayAssignLaborWorkId: false,
    mayActivatePack: false,
    maySetOurRate: false,
  };
  upsertDurableCandidate(accepted, nowIso);

  const gkWorkCreated = isGkA09LaborLeafCandidate(accepted);

  return {
    ok: true,
    outcome: "CREATED",
    candidate: findDurableById(input.candidateId)!,
    catalogWorkId: workId,
    catalogStore: store,
    catalogPersisted,
    catalogWorkCreated: true,
    catalogWorkReused: false,
    gkWorkCreated,
    ...downstreamZeros(),
  };
}
