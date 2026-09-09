/**
 * GO24 — Orchestra G2 phase: evaluate AUTO_RATE + AUTO_BOM independently
 * after trusted identity, before P7 Position Cost.
 *
 * Independent: rate PASS + BOM FAIL is legal (and vice versa).
 * No research · no invent · no Finance unlock.
 */

import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";
import {
  applyAutoBomAcceptToLine,
  applyAutoRateAcceptToLine,
  evaluateAutoBomContract,
  evaluateAutoRateContract,
  type AutoBomContractResult,
  type AutoRateContractResult,
} from "./auto-g2-accept-contract";

export const IK_AUTO_G2_PHASE_SCHEMA_VERSION = 1 as const;

export type IkAutoG2LineResult = {
  dwellingId: string;
  lineId: string;
  lp: string | null;
  catalogWorkId: string | null;
  trusted: boolean;
  rate: AutoRateContractResult;
  bom: AutoBomContractResult;
};

export type IkAutoG2PhaseResult = {
  schemaVersion: typeof IK_AUTO_G2_PHASE_SCHEMA_VERSION;
  evaluatedAtIso: string;
  lineResults: IkAutoG2LineResult[];
  counts: {
    linesEvaluated: number;
    trusted: number;
    autoRateAccept: number;
    rateException: number;
    autoBomAccept: number;
    bomException: number;
    rateIdempotentNoop: number;
    bomIdempotentNoop: number;
    overwriteBlocked: number;
  };
  /** Expert with OfferBoq lines patched by G2 provenance (in-memory). */
  postG2Expert: IkDocumentExpertReport;
  /** Package with dwelling OfferBoq lines patched (in-memory · host may persist). */
  package: TenderPackage | null;
};

function patchLinesInDoc(
  lines: OfferBoqLine[] | undefined,
  patchByLineId: Map<string, OfferBoqLine>,
): OfferBoqLine[] | undefined {
  if (!lines) return lines;
  return lines.map((l) => patchByLineId.get(l.lineId) ?? l);
}

export function runIkAutoG2Phase(input: {
  expert: IkDocumentExpertReport;
  package: TenderPackage | null;
  store?: WorkCatalogStore;
  nowMs?: number;
}): IkAutoG2PhaseResult {
  const nowMs = input.nowMs ?? Date.now();
  const store = input.store ?? loadWorkCatalogStoreLocal();
  const lineResults: IkAutoG2LineResult[] = [];
  const patchByKey = new Map<string, OfferBoqLine>(); // dwellingId::lineId
  const patchByLineId = new Map<string, OfferBoqLine>();

  const pkg = input.package;
  const dwellings = pkg?.dwellings ?? [];

  // Prefer package dwelling lines (durable identity after G1); fall back to master OfferBoq.
  type Ref = { dwellingId: string; line: OfferBoqLine };
  const refs: Ref[] = [];

  if (dwellings.length > 0) {
    for (const d of dwellings) {
      const lines = d.offerBoq?.lines ?? [];
      for (const line of lines) {
        refs.push({ dwellingId: d.dwellingId, line });
      }
    }
  } else if (input.expert.offerBoq?.lines?.length) {
    for (const line of input.expert.offerBoq.lines) {
      refs.push({ dwellingId: "", line });
    }
  }

  let autoRateAccept = 0;
  let rateException = 0;
  let autoBomAccept = 0;
  let bomException = 0;
  let rateIdempotentNoop = 0;
  let bomIdempotentNoop = 0;
  let overwriteBlocked = 0;
  let trustedCount = 0;

  for (const ref of refs) {
    const trusted = hasCompleteTrustedIdentityTuple(ref.line);
    // Evaluate all billable-ish lines; untrusted always EXCEPTION
    const rate = evaluateAutoRateContract({
      line: ref.line,
      store,
      nowMs,
      requireTrustedIdentity: true,
    });
    const bom = evaluateAutoBomContract({
      line: ref.line,
      nowMs,
      positionQuantity: ref.line.quantity,
      requireTrustedIdentity: true,
    });

    if (trusted) trustedCount += 1;
    if (rate.decision === "AUTO_RATE_ACCEPT") autoRateAccept += 1;
    else rateException += 1;
    if (bom.decision === "AUTO_BOM_ACCEPT") autoBomAccept += 1;
    else bomException += 1;
    if (rate.idempotentNoop) rateIdempotentNoop += 1;
    if (bom.idempotentNoop) bomIdempotentNoop += 1;
    if (rate.overwriteBlocked || bom.overwriteBlocked) overwriteBlocked += 1;

    let next = ref.line;
    // Independent apply — rate and BOM do not require each other
    next = applyAutoRateAcceptToLine(next, rate);
    next = applyAutoBomAcceptToLine(next, bom);

    const key = `${ref.dwellingId}::${ref.line.lineId}`;
    patchByKey.set(key, next);
    patchByLineId.set(ref.line.lineId, next);

    lineResults.push({
      dwellingId: ref.dwellingId,
      lineId: ref.line.lineId,
      lp: ref.line.lp ?? null,
      catalogWorkId: ref.line.catalogWorkId ?? null,
      trusted,
      rate,
      bom,
    });
  }

  let nextPkg: TenderPackage | null = pkg;
  if (pkg && dwellings.length > 0) {
    nextPkg = {
      ...pkg,
      dwellings: dwellings.map((d) => {
        if (!d.offerBoq?.lines) return d;
        const lines = d.offerBoq.lines.map((l) => {
          const key = `${d.dwellingId}::${l.lineId}`;
          return patchByKey.get(key) ?? l;
        });
        return {
          ...d,
          offerBoq: { ...d.offerBoq, lines },
        };
      }),
    };
  }

  const postG2Expert: IkDocumentExpertReport = {
    ...input.expert,
    offerBoq: input.expert.offerBoq
      ? {
          ...input.expert.offerBoq,
          lines: patchLinesInDoc(input.expert.offerBoq.lines, patchByLineId) ?? [],
        }
      : input.expert.offerBoq,
    masterBoqLines: (input.expert.masterBoqLines ?? []).map((ref) => {
      const patched = patchByLineId.get(ref.line.lineId);
      if (!patched) return ref;
      return { ...ref, line: patched };
    }),
  };

  return {
    schemaVersion: IK_AUTO_G2_PHASE_SCHEMA_VERSION,
    evaluatedAtIso: new Date(nowMs).toISOString(),
    lineResults,
    counts: {
      linesEvaluated: lineResults.length,
      trusted: trustedCount,
      autoRateAccept,
      rateException,
      autoBomAccept,
      bomException,
      rateIdempotentNoop,
      bomIdempotentNoop,
      overwriteBlocked,
    },
    postG2Expert,
    package: nextPkg,
  };
}
