/**
 * NG-10 — fingerprint analizy i reguła uruchomienia Autonomous Run (pure lib).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { classifyCostDocument, resolvedCostStatus } from "@/lib/tender-data-ssot";
import { isDossierParserStale } from "@/lib/tender-dossier-parser-version";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";
import { AUTONOMOUS_RUN_LS_KEY_PREFIX } from "@/lib/tender-autonomous-run-ux";

export interface AutonomousRunFingerprintParts {
  documents: string;
  swz: string;
  przedmiar: string;
  kosztorys: string;
  wycena: string;
  analiza: string;
}

export interface AutonomousRunPersistedState {
  fingerprint: string;
  completedAt: string;
  outcomeDecision: "GO" | "HOLD" | "NO-GO" | null;
}

export function autonomousRunStorageKey(tenderId: string): string {
  return `${AUTONOMOUS_RUN_LS_KEY_PREFIX}${tenderId}`;
}

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function documentIdsFingerprint(item: TenderPipelineItem): string {
  const bzp = (item.bzpDocuments ?? [])
    .map((d) => d.documentId ?? d.filename ?? "")
    .filter(Boolean)
    .sort();
  const external = item.externalDocDiscovery?.builtAt ?? "";
  const upload = item.uploadedFile?.id ?? item.uploadedFile?.filename ?? "";
  return stableHash(`${bzp.join("|")}::${external}::${upload}`);
}

export function buildAutonomousRunFingerprintParts(
  item: TenderPipelineItem,
  ownerFinanceProposal: TenderBidProposal | null,
  pricingCatalogRevision = 0,
): AutonomousRunFingerprintParts {
  const docCount = countTenderAttachments(item);
  const costDoc = classifyCostDocument(item);
  const dossier = item.tenderDossier;

  return {
    documents: `${docCount}:${documentIdsFingerprint(item)}`,
    swz: item.swzAnalysis?.analyzedAt
      ?? stableHash(JSON.stringify({
        title: item.swzAnalysis?.title ?? "",
        cpv: item.swzAnalysis?.cpvCodes?.length ?? 0,
        wadium: item.swzAnalysis?.wadiumPln ?? null,
      })),
    przedmiar: `${resolvedCostStatus(item)}:${costDoc?.type ?? "none"}`,
    kosztorys: [
      dossier?.builtAt ?? "",
      dossier?.parserVersion ?? "",
      dossier?.kosztorys?.ok ? "1" : "0",
      dossier?.kosztorys?.rowCount ?? 0,
    ].join(":"),
    wycena: [
      ownerFinanceProposal?.computedAt ?? "",
      item.ourEstimatePln ?? "",
      pricingCatalogRevision,
    ].join(":"),
    analiza: [
      item.tenderFit?.assessedAt ?? "",
      item.changeMonitor?.lastCheckedAt ?? "",
      item.changeMonitor?.unseenCount ?? 0,
    ].join(":"),
  };
}

export function buildAutonomousRunFingerprint(
  item: TenderPipelineItem,
  ownerFinanceProposal: TenderBidProposal | null,
  pricingCatalogRevision = 0,
): string {
  const parts = buildAutonomousRunFingerprintParts(
    item,
    ownerFinanceProposal,
    pricingCatalogRevision,
  );
  return stableHash(JSON.stringify(parts));
}

export function deriveAutonomousRunRequired(opts: {
  fingerprint: string;
  lastCompletedFingerprint: string | null;
  pipelineState: PipelineState;
  dossierParserStale?: boolean;
  item?: TenderPipelineItem;
}): boolean {
  const {
    fingerprint,
    lastCompletedFingerprint,
    pipelineState,
    dossierParserStale = opts.item
      ? isDossierParserStale(opts.item.tenderDossier)
      : false,
  } = opts;

  if (lastCompletedFingerprint === null) return true;
  if (fingerprint !== lastCompletedFingerprint) return true;
  if (dossierParserStale) return true;
  if (pipelineState === PipelineState.Failed) return true;

  if (
    pipelineState === PipelineState.Ready
    || pipelineState === PipelineState.Idle
  ) {
    return false;
  }

  return true;
}
