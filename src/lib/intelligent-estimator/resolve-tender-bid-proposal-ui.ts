/**
 * W6-1 + W4 CONNECT — Dual Bid SSOT read adapter (routing only · no PLN compute · no LS write).
 *
 * Canonical IK P7 bid = existing P7 (`runIkP7PositionCostBid` / Orchestra snapshot).
 * - multi_package → authoritative P7 (W6-1)
 * - legacy_single → authoritative P7 when report present (W4 CONNECT)
 * Legacy `computeTenderBidProposal` path = LEGACY-PARALLEL when costPipeline OFF
 *   or P7 report absent (Orchestra not yet published).
 *
 * G3 Final Bid (`item.ikFinalBid`) is a SEPARATE Owner record (DF P4).
 * G3 ≠ P7 recommendedBid · ≠ submittedBid · ≠ ourEstimate · never invents P7 PASS.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { isCostPipeline01Enabled } from "@/lib/tenders-v4-config";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";
import {
  formatIkG3FinalBidStatusPl,
  readIkG3FinalBid,
  type IkG3FinalBidRecord,
} from "./ik-g3-final-bid";

export type TenderBidUiAuthoritativeSource =
  | "legacy"
  | "p7_multi"
  | "p7_single"
  | "none";

export type TenderBidUiStatus =
  | "legacy"
  | "ready"
  | "hold"
  | "gap"
  | "blocked"
  | "pending";

export type TenderBidUiResolution = {
  authoritativeSource: TenderBidUiAuthoritativeSource;
  proposal: TenderBidProposal | null;
  recommendedBidPln: number | null;
  /** Design Freeze — packageGate FAIL / proposal GAP blocks PDF export CTA. */
  pdfExportBlocked: boolean;
  uiStatus: TenderBidUiStatus;
  packageGatePass: boolean | null;
  reasonsPl: string[];
  /**
   * P7 preparation gap note (Cutover/PackageGate).
   * When G3 Final Bid is persisted, this must NOT falsely claim “no Owner bid”.
   */
  gapNotePl: string | null;
  /** G3 Owner Final Bid read from pipeline item — ≠ P7. */
  g3FinalBid: IkG3FinalBidRecord | null;
  /** Presentation status for G3 (null when absent). */
  g3NotePl: string | null;
  /** True when Owner G3 Final Bid is present on the tender item. */
  g3Persisted: boolean;
};

const P7_CUTOVER_FAIL_PRE_G3 =
  "CutoverGate FAIL — brak authoritative P7 bid (bez fallback TOR B).";
const P7_CUTOVER_FAIL_WITH_G3 =
  "P7 prep: CutoverGate FAIL (preparation only — G3 Final Bid osobno).";
const P7_PACKAGE_FAIL_PRE_G3 =
  "PackageGate FAIL — brak authoritative bid (bez fallback TOR B).";
const P7_PACKAGE_FAIL_WITH_G3 =
  "P7 prep: PackageGate FAIL (preparation only — G3 Final Bid osobno).";

function withG3(
  base: Omit<TenderBidUiResolution, "g3FinalBid" | "g3NotePl" | "g3Persisted">,
  g3: IkG3FinalBidRecord | null,
): TenderBidUiResolution {
  return {
    ...base,
    g3FinalBid: g3,
    g3NotePl: formatIkG3FinalBidStatusPl(g3),
    g3Persisted: g3 != null,
  };
}

function legacyResolution(
  legacyProposal: TenderBidProposal | null,
  g3: IkG3FinalBidRecord | null,
): TenderBidUiResolution {
  return withG3(
    {
      authoritativeSource: "legacy",
      proposal: legacyProposal,
      recommendedBidPln: legacyProposal?.recommendedBidPln ?? null,
      pdfExportBlocked: false,
      uiStatus: "legacy",
      packageGatePass: null,
      reasonsPl: [],
      gapNotePl: null,
    },
    g3,
  );
}

function resolveReadyP7(opts: {
  p7: IkP7PositionCostBidReport;
  source: "p7_multi" | "p7_single";
  g3: IkG3FinalBidRecord | null;
}): TenderBidUiResolution {
  const { p7, source, g3 } = opts;
  return withG3(
    {
      authoritativeSource: source,
      proposal: p7.proposal,
      recommendedBidPln:
        p7.recommendedBidPln ?? p7.proposal?.recommendedBidPln ?? null,
      pdfExportBlocked: false,
      uiStatus: "ready",
      packageGatePass: p7.packageGatePass,
      reasonsPl: p7.reasonsPl,
      gapNotePl: null,
    },
    g3,
  );
}

export function resolveTenderBidProposalForUi(opts: {
  item: TenderPipelineItem;
  pkg: TenderPackage | null;
  p7Report: IkP7PositionCostBidReport | null;
  legacyProposal: TenderBidProposal | null;
  costPipeline01Enabled?: boolean;
}): TenderBidUiResolution {
  const g3 = readIkG3FinalBid(opts.item);
  const costPipelineOn =
    opts.costPipeline01Enabled ?? isCostPipeline01Enabled();

  if (!costPipelineOn) {
    return legacyResolution(opts.legacyProposal, g3);
  }

  const p7 = opts.p7Report;
  const isMulti = opts.pkg?.mode === "multi";

  // —— Multi package (W6-1) ——
  if (isMulti) {
    if (!p7 || p7.mode !== "multi_package") {
      return withG3(
        {
          authoritativeSource: "none",
          proposal: null,
          recommendedBidPln: null,
          pdfExportBlocked: true,
          uiStatus: "pending",
          packageGatePass: null,
          reasonsPl: ["Oczekiwanie na P7 package bid (IK orchestra)."],
          gapNotePl: g3
            ? "P7 prep: brak P7 report (G3 Final Bid osobno)."
            : "BID PROPOSAL GAP — brak P7 report.",
        },
        g3,
      );
    }

    if (p7.packageGatePass === false) {
      const gateReasons =
        p7.packageGate?.reasonsPl?.length
          ? p7.packageGate.reasonsPl
          : p7.reasonsPl;
      return withG3(
        {
          authoritativeSource: "none",
          proposal: null,
          recommendedBidPln: null,
          pdfExportBlocked: true,
          uiStatus: "blocked",
          packageGatePass: false,
          reasonsPl: gateReasons,
          gapNotePl: g3 ? P7_PACKAGE_FAIL_WITH_G3 : P7_PACKAGE_FAIL_PRE_G3,
        },
        g3,
      );
    }

    if (!p7.proposal?.ok || p7.bidOk !== true) {
      return withG3(
        {
          authoritativeSource: "none",
          proposal: null,
          recommendedBidPln: null,
          pdfExportBlocked: true,
          uiStatus: p7.status === "gap" ? "gap" : "hold",
          packageGatePass: p7.packageGatePass,
          reasonsPl: p7.reasonsPl,
          gapNotePl: g3
            ? "P7 prep: proposal.ok=false (G3 Final Bid osobno)."
            : "BID PROPOSAL GAP — P7 proposal.ok=false.",
        },
        g3,
      );
    }

    return resolveReadyP7({ p7, source: "p7_multi", g3 });
  }

  // —— Single dwelling (W4 CONNECT) ——
  // When Orchestra published a P7 single report, P7 is canonical (not a second calculator).
  // When P7 absent → LEGACY-PARALLEL computeTenderBidProposal path.
  // G3 never overrides CutoverGate / never fills recommendedBidPln.
  if (p7?.mode === "legacy_single") {
    if (p7.cutoverGatePass === false) {
      return withG3(
        {
          authoritativeSource: "none",
          proposal: null,
          recommendedBidPln: null,
          pdfExportBlocked: true,
          uiStatus: "blocked",
          packageGatePass: null,
          reasonsPl: p7.reasonsPl,
          gapNotePl: g3 ? P7_CUTOVER_FAIL_WITH_G3 : P7_CUTOVER_FAIL_PRE_G3,
        },
        g3,
      );
    }

    if (!p7.proposal?.ok || p7.bidOk !== true) {
      return withG3(
        {
          authoritativeSource: "none",
          proposal: null,
          recommendedBidPln: null,
          pdfExportBlocked: true,
          uiStatus: p7.status === "gap" ? "gap" : p7.status === "hold" ? "hold" : "pending",
          packageGatePass: null,
          reasonsPl: p7.reasonsPl,
          gapNotePl: g3
            ? "P7 prep: single proposal not ready (G3 Final Bid osobno)."
            : "BID PROPOSAL GAP — P7 single proposal not ready.",
        },
        g3,
      );
    }

    return resolveReadyP7({ p7, source: "p7_single", g3 });
  }

  return legacyResolution(opts.legacyProposal, g3);
}
