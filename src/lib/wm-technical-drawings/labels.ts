/** WM-RYSUNKI-01 P0 — etykiety UI. */

import type { DrawingStatus } from "@/lib/wm-technical-drawings/types";

export const DRAWING_STATUS_LABELS: Record<DrawingStatus, string> = {
  draft: "Roboczy",
  final: "Finalny",
};
