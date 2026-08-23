/**
 * W6-1 — Dual Bid SSOT read adapter (routing only · no PLN compute · no LS write).
 *
 * Multi package → authoritative = existing P7 output (runIkP7PositionCostBid / orchestra).
 * Legacy catalog/runtime path unchanged when costPipeline OFF or single-dwelling.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { isCostPipeline01Enabled } from "@/lib/tenders-v4-config";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";

export type TenderBidUiAuthoritativeSource = "legacy" | "p7_multi" | "none";

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
    return {
      authoritativeSource: "legacy",
      proposal: opts.legacyProposal,
      recommendedBidPln: opts.legacyProposal?.recommendedBidPln ?? null,
      pdfExportBlocked: false,
      uiStatus: "legacy",
      packageGatePass: null,
      reasonsPl: [],
      gapNotePln: null,
    };
  }

  if (opts.pkg?.mode !== "multi") {
    return {
      authoritativeSource: "legacy",
      proposal: opts.legacyProposal,
      recommendedBidPln: opts.legacyProposal?.recommendedBidPln ?? null,
      pdfExportBlocked: false,
      uiStatus: "legacy",
      packageGatePass: null,
      reasonsPl: [],
      gapNotePln: null,
    };
  }

  const p7 = opts.p7Report;
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
      gapNotePl: "PackageGate FAIL — brak authoritative bid (bez fallback TOR B).",
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

  return {
    authoritativeSource: "p7_multi",
    proposal: p7.proposal,
    recommendedBidPln:
      p7.recommendedBidPln ?? p7.proposal.recommendedBidPln ?? null,
    pdfExportBlocked: false,
    uiStatus: "ready",
    packageGatePass: p7.packageGatePass,
    reasonsPl: p7.reasonsPl,
    gapNotePl: null,
  };
}
