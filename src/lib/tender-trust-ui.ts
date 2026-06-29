/**
 * NG-01.2 — mapowanie wizualne Trust Layer (bez logiki biznesowej).
 */

import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { WorkflowProcessStripStageId } from "@/lib/tender-workflow-process-strip";
import type { WorkflowProcessStripStageStatus } from "@/lib/tender-workflow-process-strip";
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
