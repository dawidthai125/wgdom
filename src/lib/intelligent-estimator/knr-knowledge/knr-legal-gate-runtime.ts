/**
 * IK-KNR KL-5 — Legal gate runtime (REUSE global-knowledge/legal-gate.ts).
 *
 * Origin knr_licensed_export · deny scrape_* · no scraper fallback.
 */

import {
  evaluateLegalGate,
  isOriginDenied,
} from "@/lib/global-knowledge/legal-gate";
import type { GlobalKnowledgeLicenceRecord } from "@/lib/global-knowledge/types";
import type { KnrKnowledgeAllowedUse, KnrLegalGateInput } from "./knr-legal-gate-types";
import { isKnrScraperOrigin } from "./knr-legal-gate-types";

export const KNR_LICENSED_EXPORT_ORIGIN = "knr_licensed_export" as const;

export const KNR_NORMA_DEFAULT_LICENCE_ID = "knr-norma-owner" as const;

export type KnrLegalGateEvalResult = {
  ok: boolean;
  codes: string[];
  evaluated: true;
  licence: GlobalKnowledgeLicenceRecord | null;
};

/** Default Owner licence record for Norma ATH import (local-only MVP). */
export function createDefaultKnrNormaLicence(
  overrides?: Partial<GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean }>,
): GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean } {
  return {
    licenceId: KNR_NORMA_DEFAULT_LICENCE_ID,
    labelPl: "Norma KNR licensed export (Owner)",
    originsAllowed: [KNR_LICENSED_EXPORT_ORIGIN, "user_controlled_import"],
    allowedUse: ["identity"],
    active: true,
    validTo: null,
    knrNormPersist: true,
    notes: "KL-5 local import — OD-KNR-LICENSE-1 APPROVE",
    ...overrides,
  };
}

function hasKnrNormPersistAllowed(
  licence: (GlobalKnowledgeLicenceRecord & { knrNormPersist?: boolean }) | null,
  requested: KnrKnowledgeAllowedUse[],
): boolean {
  if (!licence) return false;
  if (!requested.includes("knr_norm_persist")) return true;
  return licence.knrNormPersist === true;
}

/**
 * Evaluate legal gate for KNR licensed export import.
 * Maps knr_licensed_export → user_controlled_import for global gate bridge.
 */
export function evaluateKnrLegalGate(
  input: KnrLegalGateInput,
  licences: readonly GlobalKnowledgeLicenceRecord[],
): KnrLegalGateEvalResult {
  const codes: string[] = [];
  const originId = String(input.originId || "").trim();

  if (isKnrScraperOrigin(originId) || isOriginDenied(originId)) {
    codes.push("ORIGIN_DENIED");
    return { ok: false, codes, evaluated: true, licence: null };
  }

  const bridgeOrigin =
    originId === KNR_LICENSED_EXPORT_ORIGIN ? "user_controlled_import" : originId;

  const globalUses = (input.allowedUse ?? []).filter(
    (u): u is GlobalKnowledgeLicenceRecord["allowedUse"][number] =>
      u === "identity" || u === "lexicon" || u === "graph" || u === "indicative_rate",
  );

  const gate = evaluateLegalGate(
    {
      licenceId: input.licenceId,
      originId: bridgeOrigin,
      allowedUse: globalUses.length ? globalUses : ["identity"],
      nowIso: input.nowIso,
    },
    licences,
  );

  codes.push(...gate.codes);

  const licence = gate.licence;
  if (licence && !licence.originsAllowed.includes(originId) && originId === KNR_LICENSED_EXPORT_ORIGIN) {
    if (!licence.originsAllowed.includes(KNR_LICENSED_EXPORT_ORIGIN)) {
      codes.push("ORIGIN_NOT_ON_LICENCE");
    }
  }

  if (!hasKnrNormPersistAllowed(licence, input.allowedUse ?? [])) {
    codes.push("KNR_NORM_PERSIST_DENIED");
  }

  const ok = gate.ok && !codes.includes("ORIGIN_NOT_ON_LICENCE") && !codes.includes("KNR_NORM_PERSIST_DENIED");

  return { ok, codes: [...new Set(codes)], evaluated: true, licence };
}

export const KNR_KNOWLEDGE_KL5_LEGAL_GATE_IMPLEMENTED = true as const;
