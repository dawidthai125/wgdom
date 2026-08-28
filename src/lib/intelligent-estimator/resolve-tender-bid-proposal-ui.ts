/**
 * W6-1 + W4 CONNECT — Dual Bid SSOT read adapter (routing only · no PLN compute · no LS write).
 *
 * Canonical IK bid = existing P7 (`runIkP7PositionCostBid` / Orchestra snapshot).
 * - multi_package → authoritative P7 (W6-1)
 * - legacy_single → authoritative P7 when report present (W4 CONNECT)
 * Legacy `computeTenderBidProposal` path = LEGACY-PARALLEL when costPipeline OFF
 *   or P7 report absent (Orchestra not yet published).
 *
 * No second bid engine · no G3 Final Bid persist.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { isCostPipeline01Enabled } from "@/lib/tenders-v4-config";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";

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
  gapNotePl: string | null;
};

function legacyResolution(
  legacyProposal: TenderBidProposal | null,
): TenderBidUiResolution {
  return {
    authoritativeSource: "legacy",
    proposal: legacyProposal,
    recommendedBidPln: legacyProposal?.recommendedBidPln ?? null,
    pdfExportBlocked: false,
    uiStatus: "legacy",
    packageGatePass: null,
    reasonsPl: [],
    gapNotePl: null,
  };
}

function resolveReadyP7(opts: {
  p7: IkP7PositionCostBidReport;
  source: "p7_multi" | "p7_single";
}): TenderBidUiResolution {
  const { p7, source } = opts;
  return {
    authoritativeSource: source,
    proposal: p7.proposal,
    recommendedBidPln:
      p7.recommendedBidPln ?? p7.proposal?.recommendedBidPln ?? null,
    pdfExportBlocked: false,
    uiStatus: "ready",
    packageGatePass: p7.packageGatePass,
    reasonsPl: p7.reasonsPl,
    gapNotePl: null,
  };
}

export function resolveTenderBidProposalForUi(opts: {
  item: TenderPipelineItem;
  pkg: TenderPackage | null;
  p7Report: IkP7PositionCostBidReport | null;
  legacyProposal: TenderBidProposal | null;
  costPipeline01Enabled?: boolean;
}): TenderBidUiResolution {
  void opts.item;
  const costPipelineOn =
    opts.costPipeline01Enabled ?? isCostPipeline01Enabled();

  if (!costPipelineOn) {
    return legacyResolution(opts.legacyProposal);
  }

  const p7 = opts.p7Report;
  const isMulti = opts.pkg?.mode === "multi";

  // —— Multi package (W6-1) ——
  if (isMulti) {
    if (!p7 || p7.mode !== "multi_package") {
      return {
        authoritativeSource: "none",
        proposal: null,
        recommendedBidPln: null,
        pdfExportBlocked: true,
        uiStatus: "pending",
        packageGatePass: null,
        reasonsPl: ["Oczekiwanie na P7 package bid (IK orchestra)."],
        gapNotePl: "BID PROPOSAL GAP — brak P7 report.",
      };
    }

    if (p7.packageGatePass === false) {
      const gateReasons =
        p7.packageGate?.reasonsPl?.length
          ? p7.packageGate.reasonsPl
          : p7.reasonsPl;
      return {
        authoritativeSource: "none",
        proposal: null,
        recommendedBidPln: null,
        pdfExportBlocked: true,
        uiStatus: "blocked",
        packageGatePass: false,
        reasonsPl: gateReasons,
        gapNotePl:
          "PackageGate FAIL — brak authoritative bid (bez fallback TOR B).",
      };
    }

    if (!p7.proposal?.ok || p7.bidOk !== true) {
      return {
        authoritativeSource: "none",
        proposal: null,
        recommendedBidPln: null,
        pdfExportBlocked: true,
        uiStatus: p7.status === "gap" ? "gap" : "hold",
        packageGatePass: p7.packageGatePass,
        reasonsPl: p7.reasonsPl,
        gapNotePl: "BID PROPOSAL GAP — P7 proposal.ok=false.",
      };
    }

    return resolveReadyP7({ p7, source: "p7_multi" });
  }

  // —— Single dwelling (W4 CONNECT) ——
  // When Orchestra published a P7 single report, P7 is canonical (not a second calculator).
  // When P7 absent → LEGACY-PARALLEL computeTenderBidProposal path.
  if (p7?.mode === "legacy_single") {
    if (p7.cutoverGatePass === false) {
      return {
        authoritativeSource: "none",
        proposal: null,
        recommendedBidPln: null,
        pdfExportBlocked: true,
        uiStatus: "blocked",
        packageGatePass: null,
        reasonsPl: p7.reasonsPl,
        gapNotePl: "CutoverGate FAIL — brak authoritative P7 bid (bez fallback TOR B).",
      };
    }

    if (!p7.proposal?.ok || p7.bidOk !== true) {
      return {
        authoritativeSource: "none",
        proposal: null,
        recommendedBidPln: null,
        pdfExportBlocked: true,
        uiStatus: p7.status === "gap" ? "gap" : p7.status === "hold" ? "hold" : "pending",
        packageGatePass: null,
        reasonsPl: p7.reasonsPl,
        gapNotePl: "BID PROPOSAL GAP — P7 single proposal not ready.",
      };
    }

    return resolveReadyP7({ p7, source: "p7_single" });
  }

  return legacyResolution(opts.legacyProposal);
}
