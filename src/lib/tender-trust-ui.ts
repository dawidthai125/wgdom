/**
 * NG-01.2 — mapowanie wizualne Trust Layer (bez logiki biznesowej).
 */

import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type {
  WorkflowProcessStripStage,
  WorkflowProcessStripStageId,
  WorkflowProcessStripStageStatus,
} from "@/lib/tender-workflow-process-strip";
import {
  findTrustDimension,
  type TenderTrustAssessment,
  type TenderTrustDimension,
  type TenderTrustDimensionId,
  type TenderTrustLevel,
} from "@/lib/tender-trust-layer";

export type TenderTrustSurfaceId =
  | "hub"
  | "documents"
  | "kosztorys"
  | "pricing"
  | "detail"
  | "process_strip";

export type TenderTrustTone = "success" | "warning" | "error" | "neutral";

/** Surface Policy — viewport dla limitów chipów (nie hardkodować w komponentach). */
export type TenderTrustViewport = "compact" | "wide";

const TRUST_LEVEL_RANK: Record<TenderTrustLevel, number> = {
  trusted: 0,
  unknown: 1,
  partial: 2,
  blocked: 3,
};

/** SSOT limitów chipów per powierzchnia × viewport. */
const TRUST_CHIP_LIMIT_POLICY: Partial<
  Record<TenderTrustSurfaceId, Record<TenderTrustViewport, number>>
> = {
  hub: { compact: 2, wide: 3 },
  detail: { compact: 2, wide: 3 },
};

export interface TrustChipDisplaySlice {
  visible: TenderTrustDimension[];
  hidden: TenderTrustDimension[];
  hiddenCount: number;
}

export interface ProcessStripStagePresentation {
  iconKind: "trust" | "workflow";
  trustIcon: string | null;
  workflowStatus: WorkflowProcessStripStageStatus;
  buttonClassName: string;
  title: string;
}

export interface DocumentsTrustBadgeView {
  level: TenderTrustLevel;
  labelPl: string;
  title: string;
}

const SHORT_LABELS: Record<TenderTrustLevel, string> = {
  trusted: "Wiarygodne",
  partial: "Niepełne",
  blocked: "Zablokowane",
  unknown: "W toku",
};

const ICONS: Record<TenderTrustLevel, string> = {
  trusted: "✓",
  partial: "!",
  blocked: "×",
  unknown: "…",
};

const SURFACE_DIMENSIONS: Record<TenderTrustSurfaceId, TenderTrustDimensionId[]> = {
  hub: ["documents", "parse", "kosztorys", "pricing", "metadata", "sync"],
  documents: ["documents", "parse", "sync"],
  kosztorys: ["kosztorys", "parse"],
  pricing: ["pricing", "kosztorys"],
  detail: ["documents", "parse", "kosztorys", "pricing", "metadata", "sync"],
  process_strip: ["documents", "parse", "kosztorys", "pricing"],
};

export const TRUST_DIMENSION_BY_STRIP_STAGE: Partial<
  Record<WorkflowProcessStripStageId, TenderTrustDimensionId>
> = {
  documents: "documents",
  analysis: "parse",
  kosztorys: "kosztorys",
  wycena: "pricing",
};

export function trustDimensionToV4Tab(id: TenderTrustDimensionId): TenderDetailV4TabId {
  switch (id) {
    case "kosztorys":
      return "kosztorys";
    case "pricing":
      return "ceny";
    default:
      return "dokumenty";
  }
}

export function trustLevelToIcon(level: TenderTrustLevel): string {
  return ICONS[level];
}

export function trustLevelToTone(level: TenderTrustLevel): TenderTrustTone {
  switch (level) {
    case "trusted":
      return "success";
    case "partial":
      return "warning";
    case "blocked":
      return "error";
    default:
      return "neutral";
  }
}

export function trustLevelShortLabelPl(level: TenderTrustLevel): string {
  return SHORT_LABELS[level];
}

export function trustLevelToStripStatus(level: TenderTrustLevel): WorkflowProcessStripStageStatus {
  switch (level) {
    case "trusted":
      return "done";
    case "partial":
      return "partial";
    case "blocked":
      return "missing";
    default:
      return "missing";
  }
}

export function trustToneClass(tone: TenderTrustTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300";
    default:
      return "border-border bg-secondary/40 text-muted-foreground";
  }
}

export function trustDimensionChipLabel(dim: TenderTrustDimension): string {
  return `${dim.labelPl} · ${trustLevelShortLabelPl(dim.level)}`;
}

export function getTrustDimensionsForSurface(
  assessment: TenderTrustAssessment,
  surfaceId: TenderTrustSurfaceId,
): TenderTrustDimension[] {
  const ids = SURFACE_DIMENSIONS[surfaceId];
  return ids
    .map((id) => findTrustDimension(assessment, id))
    .filter((d): d is TenderTrustDimension => d != null);
}

export function trustStageOverlayLevel(
  assessment: TenderTrustAssessment,
  stageId: WorkflowProcessStripStageId,
): TenderTrustLevel | null {
  const dimId = TRUST_DIMENSION_BY_STRIP_STAGE[stageId];
  if (!dimId) return null;
  return findTrustDimension(assessment, dimId)?.level ?? null;
}

export function pickPrimaryTrustMessage(
  assessment: TenderTrustAssessment,
  focus?: TenderTrustDimensionId[],
): string {
  if (!focus || focus.length === 0) {
    return assessment.overallLabelPl;
  }
  for (const id of focus) {
    const dim = findTrustDimension(assessment, id);
    if (!dim || dim.level === "trusted") continue;
    const prioritized = dim.reasons.find((r) => r.severity === "error")
      ?? dim.reasons.find((r) => r.severity === "warn")
      ?? dim.reasons[0];
    if (prioritized) return prioritized.messagePl;
  }
  return assessment.overallLabelPl;
}

export function collectFocusReasons(
  assessment: TenderTrustAssessment,
  focus: TenderTrustDimensionId[],
) {
  const out: TenderTrustAssessment["dimensions"][number]["reasons"] = [];
  for (const id of focus) {
    const dim = findTrustDimension(assessment, id);
    if (dim) out.push(...dim.reasons);
  }
  return out;
}

export function shouldShowTrustBanner(
  assessment: TenderTrustAssessment,
  focus?: TenderTrustDimensionId[],
): boolean {
  if (!focus || focus.length === 0) {
    return assessment.overall !== "trusted";
  }
  return focus.some((id) => {
    const level = findTrustDimension(assessment, id)?.level;
    return level != null && level !== "trusted";
  });
}

export function resolveTrustViewport(isMobile: boolean): TenderTrustViewport {
  return isMobile ? "compact" : "wide";
}

export function getTrustChipLimit(
  surface: TenderTrustSurfaceId,
  viewport: TenderTrustViewport,
): number {
  const policy = TRUST_CHIP_LIMIT_POLICY[surface] ?? TRUST_CHIP_LIMIT_POLICY.hub;
  return policy?.[viewport] ?? policy?.wide ?? 3;
}

export function sortTrustDimensionsByPriority(
  dimensions: TenderTrustDimension[],
): TenderTrustDimension[] {
  return [...dimensions].sort(
    (a, b) => TRUST_LEVEL_RANK[b.level] - TRUST_LEVEL_RANK[a.level],
  );
}

export function pickNonTrustedDimensions(
  dimensions: TenderTrustDimension[],
): TenderTrustDimension[] {
  return sortTrustDimensionsByPriority(
    dimensions.filter((d) => d.level !== "trusted"),
  );
}

export function sliceTrustDimensionsForDisplay(
  dimensions: TenderTrustDimension[],
  limit: number,
): TrustChipDisplaySlice {
  const filtered = pickNonTrustedDimensions(dimensions);
  const visible = filtered.slice(0, limit);
  const hidden = filtered.slice(limit);
  return {
    visible,
    hidden,
    hiddenCount: hidden.length,
  };
}

export function pickDimensionsForSurfaceDisplay(
  assessment: TenderTrustAssessment,
  surfaceId: TenderTrustSurfaceId,
  viewport: TenderTrustViewport,
): TrustChipDisplaySlice {
  const dimensions = getTrustDimensionsForSurface(assessment, surfaceId);
  return sliceTrustDimensionsForDisplay(
    dimensions,
    getTrustChipLimit(surfaceId, viewport),
  );
}

export function shouldRenderHubTrustBanner(assessment: TenderTrustAssessment): boolean {
  return shouldShowTrustBanner(assessment);
}

export function workflowStripStatusClass(status: WorkflowProcessStripStageStatus): string {
  switch (status) {
    case "done":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "partial":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    default:
      return "border-border bg-secondary/40 text-muted-foreground";
  }
}

export function pickStripStageTrustMessage(
  assessment: TenderTrustAssessment,
  stageId: WorkflowProcessStripStageId,
): string | null {
  const dimId = TRUST_DIMENSION_BY_STRIP_STAGE[stageId];
  if (!dimId) return null;
  const dim = findTrustDimension(assessment, dimId);
  if (!dim || dim.level === "trusted") return null;
  return pickPrimaryTrustMessage(assessment, [dimId]);
}

export function buildProcessStripStagePresentation(
  stage: Pick<WorkflowProcessStripStage, "label" | "hint" | "status">,
  trustLevel: TenderTrustLevel | null,
  trustMessage: string | null,
): ProcessStripStagePresentation {
  const trustActive = trustLevel != null && trustLevel !== "trusted";
  if (trustActive) {
    const title = trustMessage
      ? `${stage.label}: ${trustMessage}`
      : stage.hint
        ? `${stage.label}: ${stage.hint}`
        : stage.label;
    return {
      iconKind: "trust",
      trustIcon: trustLevelToIcon(trustLevel),
      workflowStatus: stage.status,
      buttonClassName: trustToneClass(trustLevelToTone(trustLevel)),
      title,
    };
  }
  return {
    iconKind: "workflow",
    trustIcon: null,
    workflowStatus: stage.status,
    buttonClassName: workflowStripStatusClass(stage.status),
    title: stage.hint ? `${stage.label}: ${stage.hint}` : stage.label,
  };
}

export function pickDocumentsTrustBadge(
  assessment: TenderTrustAssessment,
): DocumentsTrustBadgeView | null {
  const focus: TenderTrustDimensionId[] = ["documents", "parse", "sync"];
  if (!shouldShowTrustBanner(assessment, focus)) return null;
  const worst = focus.reduce<TenderTrustLevel>((worstLevel, id) => {
    const level = findTrustDimension(assessment, id)?.level ?? "trusted";
    return TRUST_LEVEL_RANK[level] > TRUST_LEVEL_RANK[worstLevel] ? level : worstLevel;
  }, "trusted");
  if (worst === "trusted") return null;
  return {
    level: worst,
    labelPl: `Jakość · ${trustLevelShortLabelPl(worst)}`,
    title: pickPrimaryTrustMessage(assessment, focus),
  };
}

export function pickKosztorysInlineHint(assessment: TenderTrustAssessment): string | null {
  const focus: TenderTrustDimensionId[] = ["kosztorys", "parse"];
  if (!shouldShowTrustBanner(assessment, focus)) return null;
  return pickPrimaryTrustMessage(assessment, focus);
}

export function pickFocusWorstTrustLevel(
  assessment: TenderTrustAssessment,
  focus: TenderTrustDimensionId[],
): TenderTrustLevel {
  return focus.reduce<TenderTrustLevel>((worstLevel, id) => {
    const level = findTrustDimension(assessment, id)?.level ?? "trusted";
    return TRUST_LEVEL_RANK[level] > TRUST_LEVEL_RANK[worstLevel] ? level : worstLevel;
  }, "trusted");
}

export function pickKosztorysInlineHintView(
  assessment: TenderTrustAssessment,
): { message: string; level: TenderTrustLevel } | null {
  const focus: TenderTrustDimensionId[] = ["kosztorys", "parse"];
  if (!shouldShowTrustBanner(assessment, focus)) return null;
  return {
    message: pickPrimaryTrustMessage(assessment, focus),
    level: pickFocusWorstTrustLevel(assessment, focus),
  };
}

export function pickPricingBlockedMessage(
  assessment: TenderTrustAssessment,
  proposalWarning?: string | null,
): string {
  if (proposalWarning) return proposalWarning;
  const pricingDim = findTrustDimension(assessment, "pricing");
  const fromTrust = pricingDim?.reasons.find((r) => r.severity === "error")
    ?? pricingDim?.reasons.find((r) => r.severity === "warn")
    ?? pricingDim?.reasons[0];
  if (fromTrust) return fromTrust.messagePl;
  const kosztorysDim = findTrustDimension(assessment, "kosztorys");
  const fromKosztorys = kosztorysDim?.reasons.find((r) => r.severity === "error")
    ?? kosztorysDim?.reasons[0];
  if (fromKosztorys) return fromKosztorys.messagePl;
  return "Kalkulator oferty — wczytaj i sparsuj kosztorys.";
}

export function formatTrustOverflowLabel(hiddenCount: number): string {
  return `+${hiddenCount}`;
}
