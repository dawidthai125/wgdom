/** WM-WORKER-SKETCH-01 P0 — create / submit / soft-delete / L0 expectedRevision. */
/** WM-DOKUMENTACJA-SZKICE-01 P0 — needs_changes / accept / resubmit (bez Promote). */

import { isDrawingSoftDeleted, parseWmTechnicalDrawing } from "@/lib/wm-technical-drawings/normalize";
import { touchDrawing, upsertDrawing } from "@/lib/wm-technical-drawings/report";
import { buildDrawingFromTemplate } from "@/lib/wm-technical-drawings/templates";
import type {
  SketchActorRole,
  SketchOrigin,
  SketchRevisionMeta,
  WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import { SKETCH_REVISION_META_CAP } from "@/lib/wm-technical-drawings/types";

export type SketchWorkflowError =
  | "stale_revision"
  | "invalid_state"
  | "forbidden"
  | "soft_deleted"
  | "missing_job";

export type SketchWorkflowResult =
  | { ok: true; drawing: WmTechnicalDrawing }
  | { ok: false; reason: SketchWorkflowError; message: string };

function appendMeta(
  drawing: WmTechnicalDrawing,
  meta: SketchRevisionMeta,
): SketchRevisionMeta[] {
  const prev = [...(drawing.revisionMeta ?? []), meta];
  if (prev.length <= SKETCH_REVISION_META_CAP) return prev;
  return prev.slice(prev.length - SKETCH_REVISION_META_CAP);
}

function hasSubmitInHistory(drawing: WmTechnicalDrawing): boolean {
  return (drawing.revisionMeta ?? []).some(
    (m) => m.action === "submit" || m.action === "resubmit",
  );
}

export function assertExpectedRevision(
  drawing: WmTechnicalDrawing,
  expectedRevisionNumber: number,
): SketchWorkflowResult | null {
  if (drawing.revisionNumber !== expectedRevisionNumber) {
    return {
      ok: false,
      reason: "stale_revision",
      message: "Szkic został zmieniony na innym urządzeniu — odśwież listę.",
    };
  }
  return null;
}

function assertJobSketch(drawing: WmTechnicalDrawing): SketchWorkflowResult | null {
  if (drawing.domain !== "job_sketch") {
    return {
      ok: false,
      reason: "forbidden",
      message: "To nie jest szkic techniczny Dokumentacji.",
    };
  }
  return null;
}

export function createWorkerSketch(input: {
  jobId: string;
  address?: string;
  title?: string;
  workerUserId: string;
  workerName: string;
  templateId?: "blank" | "works_sketch" | "floor_plan_apartment";
}): SketchWorkflowResult {
  return createJobSketch({
    jobId: input.jobId,
    address: input.address,
    title: input.title,
    actorUserId: input.workerUserId,
    actorName: input.workerName,
    actorRole: "worker",
    origin: "worker",
    templateId: input.templateId,
  });
}

/** Admin / Inspector — własny szkic w Dokumentacji (domena A). */
export function createJobSketch(input: {
  jobId: string;
  address?: string;
  title?: string;
  actorUserId: string;
  actorName: string;
  actorRole: SketchActorRole;
  origin: Extract<SketchOrigin, "worker" | "inspector" | "admin">;
  templateId?: "blank" | "works_sketch" | "floor_plan_apartment";
}): SketchWorkflowResult {
  const jobId = input.jobId.trim();
  if (!jobId) return { ok: false, reason: "missing_job", message: "Brak roboty." };

  const base = buildDrawingFromTemplate(input.templateId ?? "works_sketch", {
    jobId,
    address: input.address,
    title: input.title,
  });
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: 1,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "create",
  };
  const next = parseWmTechnicalDrawing({
    ...base,
    domain: "job_sketch",
    origin: input.origin,
    workflowStatus: "worker_draft",
    status: "draft",
    revisionNumber: 1,
    revisionMeta: [meta],
    createdByUserId: input.actorUserId,
    createdByRole: input.actorRole,
    createdByName: input.actorName,
    lastEditedByUserId: input.actorUserId,
    lastEditedByRole: input.actorRole,
    photoIds: [],
    deletedAt: null,
    editLock: null,
    comments: [],
    updatedAt: now,
  });
  if (!next) return { ok: false, reason: "invalid_state", message: "Nie udało się utworzyć szkicu." };
  return { ok: true, drawing: next };
}

/** P0: worker_draft → submitted */
export function submitWorkerSketch(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    workerUserId: string;
    workerName: string;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic został usunięty." };
  }
  const domainErr = assertJobSketch(drawing);
  if (domainErr) return domainErr;
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (drawing.origin !== "worker") {
    return { ok: false, reason: "forbidden", message: "To nie jest szkic pracownika." };
  }
  if (drawing.workflowStatus !== "worker_draft") {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Można przesłać tylko szkic w statusie roboczym.",
    };
  }
  if (drawing.createdByUserId && drawing.createdByUserId !== input.workerUserId) {
    return { ok: false, reason: "forbidden", message: "Możesz przesłać tylko własny szkic." };
  }

  const nextRev = drawing.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.workerUserId,
    byRole: "worker",
    byName: input.workerName,
    action: "submit",
  };
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      workflowStatus: "submitted",
      status: "draft",
      revisionNumber: nextRev,
      revisionMeta: appendMeta(drawing, meta),
      lastEditedByUserId: input.workerUserId,
      lastEditedByRole: "worker",
      editLock: null,
    }),
  };
}

/** needs_changes → submitted (Worker resubmit). */
export function resubmitWorkerSketch(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    workerUserId: string;
    workerName: string;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic został usunięty." };
  }
  const domainErr = assertJobSketch(drawing);
  if (domainErr) return domainErr;
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (drawing.createdByUserId && drawing.createdByUserId !== input.workerUserId) {
    return { ok: false, reason: "forbidden", message: "Możesz ponownie przesłać tylko własny szkic." };
  }
  if (drawing.workflowStatus !== "needs_changes") {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Ponowne przesłanie tylko ze statusu „Do poprawy”.",
    };
  }

  const nextRev = drawing.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.workerUserId,
    byRole: "worker",
    byName: input.workerName,
    action: "resubmit",
  };
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      workflowStatus: "submitted",
      status: "draft",
      revisionNumber: nextRev,
      revisionMeta: appendMeta(drawing, meta),
      lastEditedByUserId: input.workerUserId,
      lastEditedByRole: "worker",
      editLock: null,
    }),
  };
}

/** submitted → needs_changes (Inspector | Admin). */
export function markJobSketchNeedsChanges(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic został usunięty." };
  }
  const domainErr = assertJobSketch(drawing);
  if (domainErr) return domainErr;
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (input.actorRole !== "inspector" && input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    return { ok: false, reason: "forbidden", message: "Brak uprawnień do odesłania szkicu." };
  }
  if (drawing.workflowStatus !== "submitted" && drawing.workflowStatus !== "in_review") {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Odesłać można tylko szkic przesłany do weryfikacji.",
    };
  }

  const nextRev = drawing.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "needs_changes",
  };
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      workflowStatus: "needs_changes",
      status: "draft",
      revisionNumber: nextRev,
      revisionMeta: appendMeta(drawing, meta),
      lastEditedByUserId: input.actorUserId,
      lastEditedByRole: input.actorRole,
      editLock: null,
    }),
  };
}

/** submitted | in_review → accepted (Admin ONLY). */
export function acceptJobSketch(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic został usunięty." };
  }
  const domainErr = assertJobSketch(drawing);
  if (domainErr) return domainErr;
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    return { ok: false, reason: "forbidden", message: "Accept tylko dla Administratora." };
  }
  if (drawing.workflowStatus !== "submitted" && drawing.workflowStatus !== "in_review") {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Zaakceptować można tylko szkic przesłany do weryfikacji.",
    };
  }

  const nextRev = drawing.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "accept",
  };
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      workflowStatus: "accepted",
      status: "draft",
      revisionNumber: nextRev,
      revisionMeta: appendMeta(drawing, meta),
      lastEditedByUserId: input.actorUserId,
      lastEditedByRole: input.actorRole,
      editLock: null,
    }),
  };
}

/** A3 — soft-delete; Worker tylko własny worker_draft nigdy nie submitted. */
export function softDeleteWorkerSketch(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    workerUserId: string;
    workerName: string;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic już usunięty." };
  }
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (drawing.origin !== "worker" && drawing.domain !== "job_sketch") {
    return { ok: false, reason: "forbidden", message: "To nie jest szkic pracownika." };
  }
  if (drawing.workflowStatus !== "worker_draft" || hasSubmitInHistory(drawing)) {
    return {
      ok: false,
      reason: "forbidden",
      message: "Usunąć można tylko własny szkic roboczy przed przesłaniem.",
    };
  }
  if (drawing.createdByUserId && drawing.createdByUserId !== input.workerUserId) {
    return { ok: false, reason: "forbidden", message: "Możesz usunąć tylko własny szkic." };
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      deletedAt: now,
      deletedByUserId: input.workerUserId,
      deletedByRole: "worker",
      editLock: null,
      lastEditedByUserId: input.workerUserId,
      lastEditedByRole: "worker",
    }),
  };
}

/** Admin/SA soft-delete (A3) — non-final; nie hard-remove. */
export function softDeleteDrawing(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    userId: string;
    role: string;
    name?: string;
  },
): SketchWorkflowResult {
  if (isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "soft_deleted", message: "Już usunięty." };
  }
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (drawing.status === "final" && input.role !== "super_admin") {
    return {
      ok: false,
      reason: "forbidden",
      message: "Finalny rysunek: najpierw demote albo soft-delete SA.",
    };
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      deletedAt: now,
      deletedByUserId: input.userId,
      deletedByRole: input.role,
      editLock: null,
      lastEditedByUserId: input.userId,
      lastEditedByRole: input.role,
    }),
  };
}

export function upsertSketchInList(
  drawings: WmTechnicalDrawing[],
  drawing: WmTechnicalDrawing,
): WmTechnicalDrawing[] {
  return upsertDrawing(drawings, drawing).drawings;
}
