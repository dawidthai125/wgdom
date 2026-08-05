/** WM-DOKUMENTACJA-SZKICE-01 P2a — Dashboard groups (job-centric · DF-DASH-01…10). */

import {
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
  isJobSketchAttentionStatus,
  type JobSketchViewerRole,
} from "@/lib/wm-technical-drawings/job-sketch-list";
import type { SketchRevisionMeta, SketchWorkflowStatus, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export type JobSketchDashboardPriority = "HIGH" | "NORMAL";

export type JobSketchDashboardKind = "needs_changes" | "submitted" | "resubmit";

export type JobSketchDashboardSketchRow = {
  drawingId: string;
  title: string;
  kind: JobSketchDashboardKind;
  workflowStatus: SketchWorkflowStatus;
  actorName: string;
  actorRole: string;
  at: string;
};

export type JobSketchDashboardJobGroup = {
  jobId: string;
  jobLabel: string;
  priority: JobSketchDashboardPriority;
  attentionCount: number;
  sketches: JobSketchDashboardSketchRow[];
};

export type JobSketchDashboardJobRef = {
  id: string;
  address?: string;
  flatNumber?: string;
};

const ROLE_LABEL_PL: Record<string, string> = {
  worker: "Pracownik",
  inspector: "Inspektor",
  admin: "Administrator",
  super_admin: "Super Admin",
  moderator: "Moderator",
};

export function jobSketchActorRoleLabel(role: string): string {
  return ROLE_LABEL_PL[role] || role || "—";
}

export function jobSketchKindLabel(kind: JobSketchDashboardKind): string {
  if (kind === "needs_changes") return "Do poprawy";
  if (kind === "resubmit") return "Ponownie przesłany";
  return "Przesłany";
}

/** Relative time PL (DF-DASH-03/08). */
export function formatJobSketchRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (diffSec < 60) return "przed chwilą";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? "1 minutę temu" : `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH === 1 ? "1 godzinę temu" : `${diffH} godz. temu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "wczoraj";
  if (diffD < 7) return `${diffD} dni temu`;
  return new Date(t).toLocaleDateString("pl-PL");
}

function lastMeta(drawing: WmTechnicalDrawing): SketchRevisionMeta | undefined {
  const meta = drawing.revisionMeta;
  if (!meta || meta.length === 0) return undefined;
  return meta[meta.length - 1];
}

function resolveKind(drawing: WmTechnicalDrawing): JobSketchDashboardKind {
  if (drawing.workflowStatus === "needs_changes") return "needs_changes";
  const last = lastMeta(drawing);
  if (last?.action === "resubmit") return "resubmit";
  return "submitted";
}

function resolveActorMeta(drawing: WmTechnicalDrawing, kind: JobSketchDashboardKind): SketchRevisionMeta | undefined {
  const meta = drawing.revisionMeta ?? [];
  const reversed = [...meta].reverse();
  if (kind === "needs_changes") {
    return reversed.find((m) => m.action === "needs_changes") ?? lastMeta(drawing);
  }
  if (kind === "resubmit") {
    return reversed.find((m) => m.action === "resubmit") ?? lastMeta(drawing);
  }
  return (
    reversed.find((m) => m.action === "submit" || m.action === "resubmit") ?? lastMeta(drawing)
  );
}

export function buildJobSketchDashboardSketchRow(drawing: WmTechnicalDrawing): JobSketchDashboardSketchRow {
  const kind = resolveKind(drawing);
  const meta = resolveActorMeta(drawing, kind);
  return {
    drawingId: drawing.id,
    title: drawing.title || "Szkic",
    kind,
    workflowStatus: drawing.workflowStatus,
    actorName: (meta?.byName && meta.byName.trim()) || "—",
    actorRole: (meta?.byRole && meta.byRole.trim()) || drawing.lastEditedByRole || "worker",
    at: meta?.at || drawing.updatedAt,
  };
}

function jobPriority(sketches: JobSketchDashboardSketchRow[]): JobSketchDashboardPriority {
  return sketches.some((s) => s.kind === "needs_changes") ? "HIGH" : "NORMAL";
}

function formatJobLabel(job: JobSketchDashboardJobRef): string {
  const street = (job.address ?? "").trim() || "Bez adresu";
  const flat = (job.flatNumber ?? "").trim();
  return flat ? `${street} / ${flat}` : street;
}

/**
 * Job-centric Dashboard groups (P2a).
 * Attention only: submitted | needs_changes | in_review.
 * Sort jobs: HIGH → NORMAL, then label.
 * Deep-link target: jobs → reports → drawingId (never wm_print).
 */
export function buildJobSketchDashboardGroups(
  jobs: JobSketchDashboardJobRef[],
  drawings: WmTechnicalDrawing[],
  opts: {
    viewerRole: JobSketchViewerRole;
    viewerUserId?: string;
  },
): JobSketchDashboardJobGroup[] {
  const groups: JobSketchDashboardJobGroup[] = [];

  for (const job of jobs) {
    if (!job?.id) continue;
    const attentionCount = countPendingJobSketches(drawings, job.id, opts);
    if (attentionCount <= 0) continue;

    const list = filterJobSketchesForDokumentacja(drawings, job.id, opts).filter((d) =>
      isJobSketchAttentionStatus(d.workflowStatus),
    );
    if (list.length === 0) continue;

    const sketches = list.map(buildJobSketchDashboardSketchRow);
    // Within job: needs_changes first, then by time desc
    sketches.sort((a, b) => {
      const pa = a.kind === "needs_changes" ? 0 : 1;
      const pb = b.kind === "needs_changes" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return b.at.localeCompare(a.at);
    });

    groups.push({
      jobId: job.id,
      jobLabel: formatJobLabel(job),
      priority: jobPriority(sketches),
      attentionCount,
      sketches,
    });
  }

  groups.sort((a, b) => {
    const pa = a.priority === "HIGH" ? 0 : 1;
    const pb = b.priority === "HIGH" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.jobLabel.localeCompare(b.jobLabel, "pl");
  });

  return groups;
}

/** Total attention sketches across groups (SSOT via countPending per job). */
export function countJobSketchDashboardPendingTotal(groups: JobSketchDashboardJobGroup[]): number {
  return groups.reduce((sum, g) => sum + g.attentionCount, 0);
}

/** Deep-link contract — tests lock this. */
export const JOB_SKETCH_DASHBOARD_DEEP_LINK = {
  view: "jobs" as const,
  section: "reports" as const,
  neverWmPrint: true,
};
