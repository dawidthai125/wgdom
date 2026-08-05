/** WM-DOKUMENTACJA-SZKICE-02 — Placement SSOT (ZERO DUPLICATE · applyJobSketchPlacement only). */

import { isDrawingSoftDeleted, isJobSketch, parseWmTechnicalDrawing } from "@/lib/wm-technical-drawings/normalize";
import { touchDrawing, upsertDrawing } from "@/lib/wm-technical-drawings/report";
import type {
  SketchActorRole,
  SketchPlacement,
  SketchRevisionMeta,
  WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import { SKETCH_REVISION_META_CAP } from "@/lib/wm-technical-drawings/types";

export type PlacementWorkflowError =
  | "stale_revision"
  | "invalid_state"
  | "forbidden"
  | "soft_deleted"
  | "missing_job"
  | "invalid_placement";

export type PlacementApplyResult =
  | {
      ok: true;
      drawings: WmTechnicalDrawing[];
      sketch: WmTechnicalDrawing;
      reception?: WmTechnicalDrawing;
    }
  | { ok: false; reason: PlacementWorkflowError; message: string };

export type PlacementSingleResult =
  | { ok: true; drawing: WmTechnicalDrawing }
  | { ok: false; reason: PlacementWorkflowError; message: string };

function appendMeta(drawing: WmTechnicalDrawing, meta: SketchRevisionMeta): SketchRevisionMeta[] {
  const prev = [...(drawing.revisionMeta ?? []), meta];
  if (prev.length <= SKETCH_REVISION_META_CAP) return prev;
  return prev.slice(prev.length - SKETCH_REVISION_META_CAP);
}

function assertExpectedRevision(
  drawing: WmTechnicalDrawing,
  expectedRevisionNumber: number,
): PlacementSingleResult | null {
  if (drawing.revisionNumber !== expectedRevisionNumber) {
    return {
      ok: false,
      reason: "stale_revision",
      message: "Szkic został zmieniony na innym urządzeniu — odśwież listę.",
    };
  }
  return null;
}

/** D-PUB-03 — documentation ∨ reception ∨ softDeleted. */
export function assertPlacementInvariant(
  placement: SketchPlacement | undefined | null,
  softDeleted: boolean,
): { ok: true } | { ok: false; message: string } {
  if (softDeleted) return { ok: true };
  if (!placement) {
    return { ok: false, message: "Brak placement — wymagane documentation lub reception." };
  }
  if (placement.documentation || placement.reception) return { ok: true };
  return {
    ok: false,
    message: "Niedozwolone: documentation=false i reception=false bez soft-delete.",
  };
}

export function isJobSketchVisibleInDokumentacja(drawing: WmTechnicalDrawing): boolean {
  if (!isJobSketch(drawing) || isDrawingSoftDeleted(drawing)) return false;
  if (drawing.workflowStatus === "resolved") {
    return drawing.placement?.documentation === true;
  }
  return true;
}

export function findLinkedReceptionDrawing(
  drawings: WmTechnicalDrawing[],
  sketch: WmTechnicalDrawing,
): WmTechnicalDrawing | undefined {
  const byId = sketch.receptionDrawingId
    ? drawings.find((d) => d.id === sketch.receptionDrawingId)
    : undefined;
  if (byId && byId.domain === "reception") return byId;
  return drawings.find(
    (d) => d.domain === "reception" && d.sourceSketchId === sketch.id && Boolean(d.sourceSketchId),
  );
}

function newObjectIds(objects: WmTechnicalDrawing["objects"]): WmTechnicalDrawing["objects"] {
  return objects.map((o) => ({ ...o, id: crypto.randomUUID() }));
}

/** Promote-copy — NOWY Reception Drawing (status=final) · 1:1. */
export function createReceptionDrawingFromSketch(
  sketch: WmTechnicalDrawing,
  input: {
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
  },
): WmTechnicalDrawing {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const meta: SketchRevisionMeta = {
    revisionNumber: 1,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "promote",
  };
  const raw = {
    ...sketch,
    id,
    title: (sketch.title || "Szkic").slice(0, 120),
    domain: "reception" as const,
    origin: "admin" as const,
    status: "final" as const,
    workflowStatus: "resolved" as const,
    revisionNumber: 1,
    revisionMeta: [meta],
    objects: newObjectIds(sketch.objects),
    renderedSvg: undefined,
    renderVersion: undefined,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: undefined,
    deletedByRole: undefined,
    editLock: null,
    sourceSketchId: sketch.id,
    receptionDrawingId: null,
    placement: undefined,
    createdByUserId: input.actorUserId,
    createdByRole: input.actorRole,
    createdByName: input.actorName,
    lastEditedByUserId: input.actorUserId,
    lastEditedByRole: input.actorRole,
    linkStatus: sketch.jobId ? ("linked" as const) : ("manual" as const),
  };
  const parsed = parseWmTechnicalDrawing(raw);
  if (!parsed) throw new Error("createReceptionDrawingFromSketch: normalize failed");
  return parsed;
}

/** Undelete — clear deletedAt (REUSE soft-delete contract). */
export function undeleteDrawing(
  drawing: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
  },
): PlacementSingleResult {
  if (!isDrawingSoftDeleted(drawing)) {
    return { ok: false, reason: "invalid_state", message: "Rysunek nie jest usunięty." };
  }
  const stale = assertExpectedRevision(drawing, input.expectedRevisionNumber);
  if (stale) return stale;
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    return { ok: false, reason: "forbidden", message: "Przywracanie tylko dla Administratora." };
  }

  const nextRev = drawing.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "undelete",
  };
  return {
    ok: true,
    drawing: touchDrawing(drawing, {
      deletedAt: null,
      deletedByUserId: undefined,
      deletedByRole: undefined,
      revisionNumber: nextRev,
      revisionMeta: appendMeta(drawing, meta),
      lastEditedByUserId: input.actorUserId,
      lastEditedByRole: input.actorRole,
      editLock: null,
    }),
  };
}

/**
 * Soft-delete Reception linked 1:1 — Admin może wyłączyć Odbiory nawet gdy status=final.
 * A2 NO TOUCH (ukrycie przez deletedAt).
 */
export function softDeleteLinkedReceptionDrawing(
  reception: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
    sourceSketchId: string;
  },
): PlacementSingleResult {
  if (reception.domain !== "reception") {
    return { ok: false, reason: "forbidden", message: "To nie jest rysunek odbiorowy." };
  }
  if (reception.sourceSketchId !== input.sourceSketchId) {
    return { ok: false, reason: "forbidden", message: "Brak powiązania 1:1 ze szkicem." };
  }
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    return { ok: false, reason: "forbidden", message: "Tylko Administrator." };
  }
  if (isDrawingSoftDeleted(reception)) {
    return { ok: false, reason: "soft_deleted", message: "Już usunięty." };
  }
  const stale = assertExpectedRevision(reception, input.expectedRevisionNumber);
  if (stale) return stale;

  const nextRev = reception.revisionNumber + 1;
  const now = new Date().toISOString();
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action: "demote",
  };
  return {
    ok: true,
    drawing: touchDrawing(reception, {
      deletedAt: now,
      deletedByUserId: input.actorUserId,
      deletedByRole: input.actorRole,
      revisionNumber: nextRev,
      revisionMeta: appendMeta(reception, meta),
      lastEditedByUserId: input.actorUserId,
      lastEditedByRole: input.actorRole,
      editLock: null,
    }),
  };
}

/**
 * Jedyny punkt zmiany placement (D-PUB / AR).
 * Atomic: sketch → resolved + placement · promote/undelete/soft-delete reception.
 */
export function applyJobSketchPlacement(
  drawings: WmTechnicalDrawing[],
  sketch: WmTechnicalDrawing,
  input: {
    expectedRevisionNumber: number;
    actorUserId: string;
    actorName: string;
    actorRole: SketchActorRole;
    placement: SketchPlacement;
  },
): PlacementApplyResult {
  if (isDrawingSoftDeleted(sketch)) {
    return { ok: false, reason: "soft_deleted", message: "Szkic został usunięty." };
  }
  if (!isJobSketch(sketch)) {
    return { ok: false, reason: "forbidden", message: "To nie jest szkic Dokumentacji." };
  }
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    return { ok: false, reason: "forbidden", message: "Publikacja tylko dla Administratora." };
  }
  const stale = assertExpectedRevision(sketch, input.expectedRevisionNumber);
  if (stale) return stale;

  const inv = assertPlacementInvariant(input.placement, false);
  if (!inv.ok) return { ok: false, reason: "invalid_placement", message: inv.message };

  const fromAttention =
    sketch.workflowStatus === "submitted" || sketch.workflowStatus === "in_review";
  const fromResolved = sketch.workflowStatus === "resolved";
  const fromLegacyAccepted =
    sketch.workflowStatus === "accepted" || sketch.workflowStatus === "final_source";
  if (!fromAttention && !fromResolved && !fromLegacyAccepted) {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Publikacja tylko ze statusu przesłanego lub już rozstrzygniętego.",
    };
  }

  let list = [...drawings];
  let reception = findLinkedReceptionDrawing(list, sketch);
  let receptionTouched: WmTechnicalDrawing | undefined;

  if (input.placement.reception) {
    if (reception) {
      if (isDrawingSoftDeleted(reception)) {
        const und = undeleteDrawing(reception, {
          expectedRevisionNumber: reception.revisionNumber,
          actorUserId: input.actorUserId,
          actorName: input.actorName,
          actorRole: input.actorRole,
        });
        if (!und.ok) return und;
        reception = und.drawing;
        list = upsertDrawing(list, reception).drawings;
        receptionTouched = reception;
      }
    } else {
      reception = createReceptionDrawingFromSketch(sketch, {
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        actorRole: input.actorRole,
      });
      list = upsertDrawing(list, reception).drawings;
      receptionTouched = reception;
    }
  } else if (reception && !isDrawingSoftDeleted(reception)) {
    const del = softDeleteLinkedReceptionDrawing(reception, {
      expectedRevisionNumber: reception.revisionNumber,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      sourceSketchId: sketch.id,
    });
    if (!del.ok) return del;
    reception = del.drawing;
    list = upsertDrawing(list, reception).drawings;
    receptionTouched = reception;
  }

  const nextRev = sketch.revisionNumber + 1;
  const now = new Date().toISOString();
  const action: SketchRevisionMeta["action"] = input.placement.reception ? "promote" : "resolve";
  const meta: SketchRevisionMeta = {
    revisionNumber: nextRev,
    at: now,
    byUserId: input.actorUserId,
    byRole: input.actorRole,
    byName: input.actorName,
    action,
  };

  const nextSketch = touchDrawing(sketch, {
    workflowStatus: "resolved",
    status: "draft",
    placement: { ...input.placement },
    receptionDrawingId: reception?.id ?? sketch.receptionDrawingId ?? null,
    revisionNumber: nextRev,
    revisionMeta: appendMeta(sketch, meta),
    lastEditedByUserId: input.actorUserId,
    lastEditedByRole: input.actorRole,
    editLock: null,
  });

  list = upsertDrawing(list, nextSketch).drawings;

  return {
    ok: true,
    drawings: list,
    sketch: nextSketch,
    reception: receptionTouched ?? reception,
  };
}
