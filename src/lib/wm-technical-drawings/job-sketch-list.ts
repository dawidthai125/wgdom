/** WM-DOKUMENTACJA-SZKICE-01 P0 — filtry ACL · sort · pending badge (domena A). */

import { isDrawingSoftDeleted, isJobSketch } from "@/lib/wm-technical-drawings/normalize";
import type { SketchWorkflowStatus, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export type JobSketchViewerRole = "worker" | "inspector" | "admin" | "super_admin" | "moderator";

/** DF sort: submitted → needs_changes → accepted → worker_draft → final_source */
const WORKFLOW_SORT_RANK: Record<SketchWorkflowStatus, number> = {
  submitted: 0,
  in_review: 1,
  needs_changes: 2,
  accepted: 3,
  worker_draft: 4,
  final_source: 5,
};

export function jobSketchWorkflowSortRank(status: SketchWorkflowStatus): number {
  return WORKFLOW_SORT_RANK[status] ?? 99;
}

export function compareJobSketchesForList(a: WmTechnicalDrawing, b: WmTechnicalDrawing): number {
  const ra = jobSketchWorkflowSortRank(a.workflowStatus);
  const rb = jobSketchWorkflowSortRank(b.workflowStatus);
  if (ra !== rb) return ra - rb;
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function filterJobSketchesForDokumentacja(
  drawings: WmTechnicalDrawing[],
  jobId: string,
  opts: {
    viewerRole: JobSketchViewerRole;
    viewerUserId?: string;
  },
): WmTechnicalDrawing[] {
  if (!jobId) return [];
  const role = opts.viewerRole;
  const isWorker = role === "worker";

  return drawings
    .filter((d) => d.jobId === jobId && isJobSketch(d) && !isDrawingSoftDeleted(d))
    .filter((d) => {
      if (!isWorker) return true;
      if (!opts.viewerUserId) return false;
      return !d.createdByUserId || d.createdByUserId === opts.viewerUserId;
    })
    .sort(compareJobSketchesForList);
}

/** Badge Pending — liczba submitted (+ in_review) widoczna dla roli. */
export function countPendingJobSketches(
  drawings: WmTechnicalDrawing[],
  jobId: string,
  opts: {
    viewerRole: JobSketchViewerRole;
    viewerUserId?: string;
  },
): number {
  return filterJobSketchesForDokumentacja(drawings, jobId, opts).filter(
    (d) => d.workflowStatus === "submitted" || d.workflowStatus === "in_review",
  ).length;
}

export function canAcceptJobSketch(role: JobSketchViewerRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function canMarkNeedsChanges(role: JobSketchViewerRole): boolean {
  return role === "inspector" || role === "admin" || role === "super_admin";
}

export function canWorkerEditJobSketch(
  drawing: WmTechnicalDrawing,
  workerUserId: string,
): boolean {
  if (drawing.domain !== "job_sketch") return false;
  if (drawing.createdByUserId && drawing.createdByUserId !== workerUserId) return false;
  return (
    drawing.workflowStatus === "worker_draft" || drawing.workflowStatus === "needs_changes"
  );
}
