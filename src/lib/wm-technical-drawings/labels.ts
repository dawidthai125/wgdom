/** WM-RYSUNKI-01 P0 — etykiety UI. */

import type { DrawingStatus, SketchWorkflowStatus } from "@/lib/wm-technical-drawings/types";

export const DRAWING_STATUS_LABELS: Record<DrawingStatus, string> = {
  draft: "Roboczy",
  final: "Finalny",
};

export const SKETCH_WORKFLOW_STATUS_LABELS: Record<SketchWorkflowStatus, string> = {
  worker_draft: "Szkic",
  submitted: "Przesłany",
  in_review: "W weryfikacji",
  needs_changes: "Do poprawy",
  accepted: "Zaakceptowany",
};
