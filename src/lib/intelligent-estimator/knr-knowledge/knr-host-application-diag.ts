/**
 * IK-KNR ETAP 11 — Host application diagnostic batch (PURE).
 *
 * Envelope (KL-3) + Master BOQ qty/unit READ-ONLY → orchestrateKnrHostApplication.
 * ZERO P7 feed · ZERO BOQ write · ZERO Research · ZERO second matcher.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { KnrCatalogStore } from "./knr-catalog-store";
import type { KnrKnowledgeLineResult } from "./knr-knowledge-envelope";
import {
  orchestrateKnrHostApplication,
  type KnrHostApplicationInput,
  type KnrHostApplicationResult,
} from "./knr-host-application-orchestrator";

export const KNR_KNOWLEDGE_KL_HOST_APP_DIAG_IMPLEMENTED = true as const;

export type KnrHostAppDiagBoqLine = {
  lineId: string;
  quantity: number | null | undefined;
  unit: string | null | undefined;
};

export type KnrHostAppDiagSummary = {
  status: "skipped" | "ready" | "busy" | "idle";
  priced: number;
  partial: number;
  hold: number;
  skipped: number;
  reject: number;
};

export type KnrHostAppDiagBatchInput = {
  readyForExperts: boolean;
  knowledgeLines: readonly KnrKnowledgeLineResult[];
  /** Master BOQ lines keyed by lineId — READ ONLY quantities/units. */
  boqByLineId: ReadonlyMap<string, KnrHostAppDiagBoqLine> | Readonly<Record<string, KnrHostAppDiagBoqLine>>;
  catalogStore: KnrCatalogStore;
  workCatalogStore: WorkCatalogStore;
  nowMs: number;
  nowIso: string;
  identityInput?: KnrHostApplicationInput["identityInput"];
};

function boqLookup(
  map: KnrHostAppDiagBatchInput["boqByLineId"],
  lineId: string,
): KnrHostAppDiagBoqLine | undefined {
  if (map instanceof Map) return map.get(lineId);
  return map[lineId];
}

function skippedResult(
  lineId: string,
  knowledge: KnrKnowledgeLineResult | null,
  holdReason: KnrHostApplicationResult["holdReason"],
): KnrHostApplicationResult {
  return {
    lineId,
    envelopeLookupStatus: knowledge?.lookupStatus ?? null,
    identityKeyV2: knowledge?.identityKeyV2
      ? String(knowledge.identityKeyV2).trim() || null
      : null,
    catalogLookupStatus: null,
    verificationStatus: null,
    app1: null,
    bridge: null,
    finalStatus: "SKIPPED",
    holdReason,
    verificationFromOrchestrator: false,
  };
}

export function summarizeKnrHostAppDiag(
  results: readonly KnrHostApplicationResult[],
  readyForExperts: boolean,
): KnrHostAppDiagSummary {
  if (!readyForExperts) {
    return {
      status: "skipped",
      priced: 0,
      partial: 0,
      hold: 0,
      skipped: 0,
      reject: 0,
    };
  }
  let priced = 0;
  let partial = 0;
  let hold = 0;
  let skipped = 0;
  let reject = 0;
  for (const r of results) {
    switch (r.finalStatus) {
      case "PRICED":
        priced += 1;
        break;
      case "PARTIAL":
        partial += 1;
        break;
      case "HOLD":
        hold += 1;
        break;
      case "REJECT":
        reject += 1;
        break;
      default:
        skipped += 1;
        break;
    }
  }
  return { status: "ready", priced, partial, hold, skipped, reject };
}

/**
 * Pure batch for Host diagnostic wire.
 * Does not mutate BOQ · does not call Research/VERIFY · does not invent PLN.
 */
export function runKnrHostApplicationDiagBatch(
  input: KnrHostAppDiagBatchInput,
): KnrHostApplicationResult[] {
  if (!input.readyForExperts) {
    return [];
  }

  const out: KnrHostApplicationResult[] = [];

  for (const knowledge of input.knowledgeLines) {
    const lineId = String(knowledge.lineId ?? "").trim() || "unknown";
    const boq = boqLookup(input.boqByLineId, lineId);
    const qty = boq?.quantity;
    const unit = String(boq?.unit ?? "").trim();

    if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) {
      out.push(skippedResult(lineId, knowledge, "NO_BOQ_QUANTITY"));
      continue;
    }
    if (!unit) {
      out.push(skippedResult(lineId, knowledge, "NO_BOQ_UNIT"));
      continue;
    }

    out.push(
      orchestrateKnrHostApplication({
        lineId,
        knowledgeLine: knowledge,
        boqQuantity: qty,
        boqUnit: unit,
        catalogStore: input.catalogStore,
        workCatalogStore: input.workCatalogStore,
        nowMs: input.nowMs,
        nowIso: input.nowIso,
        identityInput: input.identityInput,
      }),
    );
  }

  return out;
}
