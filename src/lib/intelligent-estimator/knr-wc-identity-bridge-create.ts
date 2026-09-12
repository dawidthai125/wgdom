/**
 * IK-KNR-WC-IDENTITY-BRIDGE P3 — CatalogWork CREATE.
 * OWNER_CREATE (ownerDecision=CREATE_NEW + P3) OR AUTONOMOUS_CREATE_V1 (ACLC evidence PASS).
 * REUSE P5.26 insert + saveWorkCatalogRouted · zero A1/map/pricing/HTTP invent.
 */

import {
  canWriteWorkCatalog,
  saveWorkCatalogRouted,
  type CatalogWriteBlockReason,
} from "@/lib/catalog-write-router";
import type { AppSettings } from "@/lib/app-settings";
import { isTradeId, type TradeId } from "@/lib/work-catalog/trades";
import {
  catalogWorkExistsInStore,
  insertWorkBothRegions,
  CatalogWorkDuplicateIdError,
} from "@/lib/work-catalog/work-catalog-insert";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { normalizeWgdomCostUnit, type WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";
import { isKnrWcIdentityBridgeP3CreateRuntimeEnabled } from "./knr-wc-identity-bridge-feature";
import type {
  KnrWcIdentityProposal,
  KnrWcOwnerDecision,
} from "./knr-wc-identity-bridge-types";

export const KNR_WC_HOLD_UNIT_TABLE_CODES = new Set<string>([]);

export type KnrWcCreateBlockReason =
  | "p3_runtime_off"
  | "owner_decision_not_create"
  | "proposed_unit_missing"
  | "hold_unit"
  | "hold_unit_table"
  | "legacy_only"
  | "work_id_exists"
  | "work_id_invalid"
  | "name_missing"
  | "confirm_duplicate_high_required"
  | "confirm_stale_evidence_required"
  | "autonomous_auth_invalid"
  | "autonomous_duplicate_high"
  | "autonomous_stale_evidence";

/** ACLC-v1 — evidence-gated CREATE without Owner runtime. */
export type KnrWcAutonomousCreateAuthorization = {
  version: "ACLC-v1";
  pass: true;
  auditWhy: string;
  policyVersion: string;
};

export type KnrWcCreateAssertInput = {
  proposal: KnrWcIdentityProposal;
  ownerDecision: KnrWcOwnerDecision;
  workId: string;
  store: WorkCatalogStore;
  runtimeP3Enabled?: boolean;
  settings?: AppSettings;
  confirmDuplicateHigh?: boolean;
  confirmStaleEvidence?: boolean;
  /**
   * When ACLC-v1 PASS: authorizes CREATE without ownerDecision=CREATE_NEW
   * and without P3 UI runtime gate. Evidence controls remain fail-closed.
   */
  autonomousAuthorization?: KnrWcAutonomousCreateAuthorization | null;
};

export type KnrWcCreateAssertResult =
  | { ok: true }
  | { ok: false; reason: KnrWcCreateBlockReason; message: string };

export type KnrWcCreateExecuteInput = KnrWcCreateAssertInput & {
  nowIso?: string;
  /**
   * `memory_only` — insert into returned store only (dry-run / Orchestra in-memory).
   * Never calls saveWorkCatalogRouted. Default `routed` preserves Owner P3 path.
   */
  persistMode?: "routed" | "memory_only";
};

export type KnrWcCreateExecuteResult =
  | {
      ok: true;
      saved: true;
      workId: string;
      catalogWorksCreated: 1;
      store?: WorkCatalogStore;
      persistMode: "routed" | "memory_only";
    }
  | {
      ok: true;
      saved: false;
      blocked: CatalogWriteBlockReason;
      workId: string;
      store?: WorkCatalogStore;
      persistMode: "routed" | "memory_only";
    }
  | {
      ok: false;
      reason: KnrWcCreateBlockReason | "duplicate_work_id" | "persist_error";
      message: string;
    };

/** Mirror P2 UI HOLD_UNIT blockers — shared SSOT for P3 lib/tests. */
export function isKnrWcCreateBlockedByProposal(proposal: KnrWcIdentityProposal): boolean {
  return (
    proposal.unitStatus === "HOLD_UNIT"
    || KNR_WC_HOLD_UNIT_TABLE_CODES.has(String(proposal.tableCode ?? "").trim())
    || proposal.recommendation === "HOLD_UNIT"
  );
}

export function suggestCatalogWorkIdFromProposal(proposal: KnrWcIdentityProposal): string {
  const raw = (
    proposal.officialNamePl
    || proposal.descriptionPl
    || proposal.displayCode
    || proposal.tableCode
    || "knr-wc"
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const unit = proposal.proposedUnit || "item";
  const slug = raw || "knr-wc";
  return `knr-wc-${slug}-${unit}`.replace(/--+/g, "-");
}

function resolveTradeId(proposal: KnrWcIdentityProposal): TradeId {
  if (proposal.proposedTradeId && isTradeId(proposal.proposedTradeId)) {
    return proposal.proposedTradeId;
  }
  return "POZOSTALE";
}

function isValidAutonomousAuthorization(
  auth: KnrWcAutonomousCreateAuthorization | null | undefined,
): auth is KnrWcAutonomousCreateAuthorization {
  return (
    !!auth
    && auth.version === "ACLC-v1"
    && auth.pass === true
    && typeof auth.auditWhy === "string"
    && auth.auditWhy.trim().length >= 12
    && typeof auth.policyVersion === "string"
    && auth.policyVersion.trim().length > 0
  );
}

export function assertKnrWcCreateAllowed(input: KnrWcCreateAssertInput): KnrWcCreateAssertResult {
  const autonomousOk = isValidAutonomousAuthorization(input.autonomousAuthorization);
  if (input.autonomousAuthorization != null && !autonomousOk) {
    return {
      ok: false,
      reason: "autonomous_auth_invalid",
      message: "AUTONOMOUS_CREATE_V1 authorization invalid — fail-closed.",
    };
  }

  const runtimeOk =
    typeof input.runtimeP3Enabled === "boolean"
      ? input.runtimeP3Enabled
      : isKnrWcIdentityBridgeP3CreateRuntimeEnabled();
  // OWNER path: P3 runtime required. AUTONOMOUS_CREATE_V1: evidence contract replaces P3 UI gate.
  if (!runtimeOk && !autonomousOk) {
    return {
      ok: false,
      reason: "p3_runtime_off",
      message: "P3 CREATE runtime OFF (flag / IK gate).",
    };
  }

  // OWNER_CREATE OR AUTONOMOUS_CREATE_V1
  if (input.ownerDecision !== "CREATE_NEW" && !autonomousOk) {
    return {
      ok: false,
      reason: "owner_decision_not_create",
      message: "CREATE wymaga ownerDecision=CREATE_NEW lub AUTONOMOUS_CREATE_V1 PASS.",
    };
  }

  if (isKnrWcCreateBlockedByProposal(input.proposal)) {
    const table = String(input.proposal.tableCode ?? "").trim();
    if (KNR_WC_HOLD_UNIT_TABLE_CODES.has(table)) {
      return {
        ok: false,
        reason: "hold_unit_table",
        message: `HOLD_UNIT table ${table} — CREATE zablokowany.`,
      };
    }
    return {
      ok: false,
      reason: "hold_unit",
      message: "HOLD_UNIT — CREATE zablokowany (unit policy).",
    };
  }

  if (!input.proposal.proposedUnit || !normalizeWgdomCostUnit(input.proposal.proposedUnit)) {
    return {
      ok: false,
      reason: "proposed_unit_missing",
      message: "Brak legalnego proposedUnit (WgdomCostUnit).",
    };
  }

  if (!canWriteWorkCatalog(input.settings)) {
    return {
      ok: false,
      reason: "legacy_only",
      message: "catalogWriteMode=legacy_only blokuje zapis Work Catalog.",
    };
  }

  const workId = String(input.workId ?? "").trim();
  if (!workId || workId.startsWith("proposal:")) {
    return {
      ok: false,
      reason: "work_id_invalid",
      message: "workId musi być realnym identyfikatorem CatalogWork (nie stub proposal:).",
    };
  }

  if (catalogWorkExistsInStore(input.store, workId)) {
    return {
      ok: false,
      reason: "work_id_exists",
      message: `workId ${workId} już istnieje w katalogu.`,
    };
  }

  const namePl = (
    input.proposal.officialNamePl
    || input.proposal.descriptionPl
    || input.proposal.displayCode
    || ""
  ).trim();
  if (!namePl) {
    return {
      ok: false,
      reason: "name_missing",
      message: "Brak namePl do utworzenia CatalogWork.",
    };
  }

  if (input.proposal.duplicateRisk === "HIGH") {
    if (autonomousOk) {
      return {
        ok: false,
        reason: "autonomous_duplicate_high",
        message: "duplicateRisk=HIGH — AUTONOMOUS_CREATE fail-closed (no Owner confirm).",
      };
    }
    if (input.confirmDuplicateHigh !== true) {
      return {
        ok: false,
        reason: "confirm_duplicate_high_required",
        message: "duplicateRisk=HIGH — wymagane jawne potwierdzenie Ownera.",
      };
    }
  }

  if (input.proposal.staleEvidence === true) {
    if (autonomousOk) {
      return {
        ok: false,
        reason: "autonomous_stale_evidence",
        message: "staleEvidence — AUTONOMOUS_CREATE fail-closed (no Owner confirm).",
      };
    }
    if (input.confirmStaleEvidence !== true) {
      return {
        ok: false,
        reason: "confirm_stale_evidence_required",
        message: "staleEvidence — wymagane jawne potwierdzenie Ownera.",
      };
    }
  }

  return { ok: true };
}

export function buildCatalogWorkDraftFromProposal(
  proposal: KnrWcIdentityProposal,
  workId: string,
  nowIso: string,
): CatalogWork {
  const unit = proposal.proposedUnit as WgdomCostUnit;
  const namePl = (
    proposal.officialNamePl
    || proposal.descriptionPl
    || proposal.displayCode
    || workId
  ).trim();

  const work: CatalogWork = {
    id: workId.trim(),
    tradeId: resolveTradeId(proposal),
    namePl,
    unit,
    companyPricePln: 0,
    commercialPricing: {
      marginPct: 0,
      updatedAt: nowIso,
      source: "owner",
    },
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: proposal.descriptionPl?.trim() || undefined,
    keywords: namePl
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 8),
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0, laborRatio: 1 },
  };

  return withFreshnessStatus(work, Date.parse(nowIso));
}

export async function executeKnrWcCatalogWorkCreate(
  input: KnrWcCreateExecuteInput,
): Promise<KnrWcCreateExecuteResult> {
  const gate = assertKnrWcCreateAllowed(input);
  if (!gate.ok) {
    return { ok: false, reason: gate.reason, message: gate.message };
  }

  const workId = String(input.workId).trim();
  const nowIso = input.nowIso ?? new Date().toISOString();
  const persistMode = input.persistMode ?? "routed";

  let nextStore: WorkCatalogStore;
  try {
    const draft = buildCatalogWorkDraftFromProposal(input.proposal, workId, nowIso);
    nextStore = insertWorkBothRegions(input.store, draft, nowIso);
  } catch (err) {
    if (err instanceof CatalogWorkDuplicateIdError) {
      return {
        ok: false,
        reason: "duplicate_work_id",
        message: err.message,
      };
    }
    return {
      ok: false,
      reason: "persist_error",
      message: err instanceof Error ? err.message : "insert failed",
    };
  }

  console.info("KNR_WC_CREATE", {
    normalizedKey: input.proposal.normalizedKey,
    workId,
    tenderId: input.proposal.tenderId,
    persistMode,
    autonomous: Boolean(input.autonomousAuthorization?.pass),
  });

  if (persistMode === "memory_only") {
    return {
      ok: true,
      saved: true,
      workId,
      catalogWorksCreated: 1,
      store: nextStore,
      persistMode: "memory_only",
    };
  }

  const saveResult = await saveWorkCatalogRouted(
    nextStore,
    { previousStore: input.store, updatedAtIso: nowIso },
    input.settings,
  );

  if (!saveResult.ok) {
    return {
      ok: false,
      reason: "persist_error",
      message: String(saveResult.error),
    };
  }

  if (!saveResult.saved) {
    return {
      ok: true,
      saved: false,
      blocked: saveResult.blocked,
      workId,
      persistMode: "routed",
    };
  }

  return {
    ok: true,
    saved: true,
    workId,
    catalogWorksCreated: 1,
    persistMode: "routed",
  };
}
