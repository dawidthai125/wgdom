/** WM-RYSUNKI-01 P0 — Undo/Redo sesji edytora (MR-09: max 50). */

import type { WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";
import { DRAWING_UNDO_STACK_MAX } from "@/lib/wm-technical-drawings/types";
import { parseWmTechnicalDrawing } from "@/lib/wm-technical-drawings/normalize";

export class DrawingUndoStack {
  private past: WmTechnicalDrawing[] = [];
  private future: WmTechnicalDrawing[] = [];
  private current: WmTechnicalDrawing;

  constructor(initial: WmTechnicalDrawing) {
    const parsed = parseWmTechnicalDrawing(initial);
    if (!parsed) throw new Error("DrawingUndoStack: invalid initial");
    this.current = parsed;
  }

  getCurrent(): WmTechnicalDrawing {
    return this.current;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Commit nowej wersji po komendzie (add/move/delete/property). */
  push(next: WmTechnicalDrawing): WmTechnicalDrawing {
    const parsed = parseWmTechnicalDrawing(next);
    if (!parsed) return this.current;
    this.past.push(this.current);
    if (this.past.length > DRAWING_UNDO_STACK_MAX) {
      this.past.shift();
    }
    this.future = [];
    this.current = parsed;
    return this.current;
  }

  /** Zastąp current bez wpisu undo (np. sync zewnętrzny). */
  replace(next: WmTechnicalDrawing): WmTechnicalDrawing {
    const parsed = parseWmTechnicalDrawing(next);
    if (!parsed) return this.current;
    this.current = parsed;
    return this.current;
  }

  undo(): WmTechnicalDrawing {
    if (!this.canUndo()) return this.current;
    const prev = this.past.pop()!;
    this.future.push(this.current);
    this.current = prev;
    return this.current;
  }

  redo(): WmTechnicalDrawing {
    if (!this.canRedo()) return this.current;
    const next = this.future.pop()!;
    this.past.push(this.current);
    this.current = next;
    return this.current;
  }
}
