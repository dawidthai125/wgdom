/** WM-RYSUNKI-01 — typy domeny rysunków technicznych (P0+P1). */

export const WM_TECHNICAL_DRAWINGS_KEY = "kw-wm-technical-drawings";

export const DRAWING_SCHEMA_VERSION = 1 as const;

/** Bump przy ship biblioteki symboli (P1=2 · P3A=3 — W/P/W/R). */
export const DRAWING_SYMBOL_LIBRARY_VERSION = 3 as const;

export type DrawingStatus = "draft" | "final";

/** WM-WORKER-SKETCH-01 / WM-DOKUMENTACJA-SZKICE-01 / -02 — oś procesu (≠ DrawingStatus paczki). */
export type SketchWorkflowStatus =
  | "worker_draft"
  | "submitted"
  | "in_review"
  | "needs_changes"
  | "resolved"
  /** @deprecated legacy — normalize → resolved */
  | "accepted"
  /** @deprecated legacy — normalize → resolved */
  | "final_source";

/** WM-DOKUMENTACJA-SZKICE-02 — miejsce życia Job Sketch (SSOT lokalizacji). */
export interface SketchPlacement {
  documentation: boolean;
  reception: boolean;
}

/** DOMENA A vs B — jeden store, dwie semantyki. */
export type DrawingDomain = "job_sketch" | "reception";

export type SketchOrigin = "worker" | "inspector" | "admin" | "wm_druk";

export type SketchRevisionAction =
  | "create"
  | "autosave_checkpoint"
  | "submit"
  | "review_save"
  | "needs_changes"
  | "resubmit"
  | "accept"
  | "resolve"
  | "promote"
  | "demote"
  | "review_open"
  | "undelete";

export type SketchActorRole = "worker" | "inspector" | "admin" | "super_admin" | "moderator";

export interface SketchRevisionMeta {
  revisionNumber: number;
  at: string;
  byUserId: string;
  byRole: string;
  byName?: string;
  action: SketchRevisionAction;
}

export interface SketchEditLock {
  holderUserId: string;
  holderRole: string;
  holderName: string;
  deviceId?: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface SketchComment {
  id: string;
  x: number;
  y: number;
  text: string;
  authorUserId: string;
  authorRole: string;
  authorName: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  anchorObjectId?: string;
}

export type DrawingLinkStatus = "linked" | "detached" | "manual";

export type DrawingPageFormat = "A4" | "A3";

export type DrawingPageOrient = "portrait" | "landscape";

export type DrawingTemplateId =
  | "blank"
  | "floor_plan_apartment"
  | "boiler_room"
  | "basement"
  | "garage"
  | "distribution_room"
  | "works_sketch";

export type DrawingObjectType =
  | "wall"
  | "door"
  | "window"
  | "text"
  | "dimension"
  | "arrow"
  | "ventilation"
  | "gas_boiler"
  | "measurement_point"
  | "electrical_point"
  | "distribution_board";

/** Typy obiektów edytowalne w P0. */
export const DRAWING_P0_OBJECT_TYPES: DrawingObjectType[] = ["wall", "text"];

/** Typy obiektów edytowalne w P1 (DF). */
export const DRAWING_P1_OBJECT_TYPES: DrawingObjectType[] = [
  "wall",
  "door",
  "window",
  "text",
  "dimension",
  "arrow",
  "ventilation",
  "gas_boiler",
];

/** Typy obiektów edytowalne w P3A (P1 + rozdzielnia). */
export const DRAWING_P3A_OBJECT_TYPES: DrawingObjectType[] = [
  ...DRAWING_P1_OBJECT_TYPES,
  "distribution_board",
];

export const DRAWING_STATUSES: DrawingStatus[] = ["draft", "final"];

export const SKETCH_WORKFLOW_STATUSES: SketchWorkflowStatus[] = [
  "worker_draft",
  "submitted",
  "in_review",
  "needs_changes",
  "resolved",
  "accepted",
  "final_source",
];

export const DRAWING_DOMAINS: DrawingDomain[] = ["job_sketch", "reception"];

export const SKETCH_ORIGINS: SketchOrigin[] = ["worker", "inspector", "admin", "wm_druk"];

export const SKETCH_REVISION_ACTIONS: SketchRevisionAction[] = [
  "create",
  "autosave_checkpoint",
  "submit",
  "review_save",
  "needs_changes",
  "resubmit",
  "accept",
  "resolve",
  "promote",
  "demote",
  "review_open",
  "undelete",
];

export const DRAWING_LINK_STATUSES: DrawingLinkStatus[] = ["linked", "detached", "manual"];

/** Soft-warn / caps — WM-WORKER-SKETCH-01. */
export const SKETCH_REVISION_META_CAP = 20;
export const SKETCH_PHOTO_IDS_CAP = 12;
export const SKETCH_COMMENTS_CAP = 50;

export const DRAWING_PAGE_FORMATS: DrawingPageFormat[] = ["A4", "A3"];

export const DRAWING_PAGE_ORIENTS: DrawingPageOrient[] = ["portrait", "landscape"];

export const DRAWING_TEMPLATE_IDS: DrawingTemplateId[] = [
  "blank",
  "floor_plan_apartment",
  "boiler_room",
  "basement",
  "garage",
  "distribution_room",
  "works_sketch",
];

export interface DrawingPage {
  format: DrawingPageFormat;
  orientation: DrawingPageOrient;
  width: number;
  height: number;
}

export interface DrawingGrid {
  enabled: boolean;
  step: number;
  snap: boolean;
}

export interface DrawingObjectBase {
  id: string;
  type: DrawingObjectType;
  rotation?: number;
  locked?: boolean;
  zIndex?: number;
}

export interface DrawingWallObject extends DrawingObjectBase {
  type: "wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness?: number;
  symbolId?: string;
}

export interface DrawingTextObject extends DrawingObjectBase {
  type: "text";
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  /** WM-RYSUNKI-TEXT-ERASER-UX-01 — omit / missing → render normal. */
  fontWeight?: "normal" | "bold";
  symbolId?: string;
}

export interface DrawingDoorObject extends DrawingObjectBase {
  type: "door";
  x: number;
  y: number;
  width?: number;
  symbolId: string;
  /** Mirror lokalny X (DF). */
  flipH?: boolean;
}

export interface DrawingWindowObject extends DrawingObjectBase {
  type: "window";
  x: number;
  y: number;
  width?: number;
  symbolId: string;
}

/** MR-P3A-04 — stamp union (wentylacja / piec / rozdzielnia). */
export interface DrawingStampObject extends DrawingObjectBase {
  type: "ventilation" | "gas_boiler" | "distribution_board";
  x: number;
  y: number;
  symbolId: string;
}

export interface DrawingDimensionObject extends DrawingObjectBase {
  type: "dimension";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Pusta → auto liczba długości bez jednostki (MR-P1-08). */
  label?: string;
  /**
   * WM-RYSUNKI-DIMENSION-LABEL-FONT-UX-02 — label font (12/14/18/24).
   * Missing → render default 14 (schemaVersion stays 1).
   */
  fontSize?: number;
  symbolId?: string;
}

export interface DrawingArrowObject extends DrawingObjectBase {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  symbolId: string;
}

/** P4 / forward — punkty poza edycją P3A; wallRefId strip. */
export interface DrawingPassthroughObject extends DrawingObjectBase {
  type: "measurement_point" | "electrical_point";
  x?: number;
  y?: number;
  label?: string;
  symbolId?: string;
}

export type DrawingObject =
  | DrawingWallObject
  | DrawingTextObject
  | DrawingDoorObject
  | DrawingWindowObject
  | DrawingStampObject
  | DrawingDimensionObject
  | DrawingArrowObject
  | DrawingPassthroughObject;

export interface WmTechnicalDrawing {
  id: string;
  schemaVersion: typeof DRAWING_SCHEMA_VERSION;
  title: string;
  templateId: DrawingTemplateId;
  status: DrawingStatus;
  jobId?: string;
  linkStatus: DrawingLinkStatus;
  address?: string;
  documentDate: string;
  notes?: string;
  page: DrawingPage;
  objects: DrawingObject[];
  grid: DrawingGrid;
  renderedSvg?: string;
  renderVersion?: number;
  createdAt: string;
  updatedAt: string;
  /** WM-WORKER-SKETCH-01 / WM-DOKUMENTACJA-SZKICE-01 — additive (normalize defaults). */
  domain: DrawingDomain;
  origin: SketchOrigin;
  workflowStatus: SketchWorkflowStatus;
  revisionNumber: number;
  revisionMeta?: SketchRevisionMeta[];
  createdByUserId?: string;
  createdByRole?: SketchActorRole | string;
  createdByName?: string;
  lastEditedByUserId?: string;
  lastEditedByRole?: string;
  photoIds: string[];
  deletedAt?: string | null;
  deletedByUserId?: string;
  deletedByRole?: string;
  editLock?: SketchEditLock | null;
  comments?: SketchComment[];
  /** WM-DOKUMENTACJA-SZKICE-02 — lokalizacja (Job Sketch). */
  placement?: SketchPlacement;
  /** Job Sketch → Reception Drawing (1:1). */
  receptionDrawingId?: string | null;
  /** Reception Drawing → Job Sketch (1:1). */
  sourceSketchId?: string;
}

export interface DrawingDomainReport {
  added: string[];
  updated: string[];
  removed: string[];
}

export const DRAWING_PAGE_SIZE_PX: Record<
  DrawingPageFormat,
  Record<DrawingPageOrient, { width: number; height: number }>
> = {
  A4: {
    landscape: { width: 842, height: 595 },
    portrait: { width: 595, height: 842 },
  },
  A3: {
    landscape: { width: 1191, height: 842 },
    portrait: { width: 842, height: 1191 },
  },
};

export const DEFAULT_DRAWING_GRID: DrawingGrid = {
  enabled: true,
  step: 10,
  snap: true,
};

export const DRAWING_UNDO_STACK_MAX = 50;

/** Soft warn MR-05 / MR-P1-03. */
export const DRAWING_OBJECTS_SOFT_WARN = 300;

/** Preset „Opis pomieszczenia” (DF). */
export const ROOM_LABEL_DEFAULT_CONTENT = "Pomieszczenie";
export const ROOM_LABEL_DEFAULT_FONT_SIZE = 18;
export const TEXT_DEFAULT_FONT_SIZE = 14;
