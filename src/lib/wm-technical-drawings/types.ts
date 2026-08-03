/** WM-RYSUNKI-01 P0 — typy domeny rysunków technicznych (Odbiory WM). */

export const WM_TECHNICAL_DRAWINGS_KEY = "kw-wm-technical-drawings";

export const DRAWING_SCHEMA_VERSION = 1 as const;

export const DRAWING_SYMBOL_LIBRARY_VERSION = 1 as const;

export type DrawingStatus = "draft" | "final";

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

/** P0: wall | text. Pozostałe w union pod przyszłe slice — normalize P0 zachowuje unknown types jako passthrough? Nie — drop unknown w P0 poza listą P0+P4 reserved. */
export type DrawingObjectType =
  | "wall"
  | "door"
  | "window"
  | "text"
  | "dimension"
  | "ventilation"
  | "gas_boiler"
  | "measurement_point"
  | "electrical_point"
  | "distribution_board";

/** Typy obiektów obsługiwane w P0 (edycja + render). */
export const DRAWING_P0_OBJECT_TYPES: DrawingObjectType[] = ["wall", "text"];

export const DRAWING_STATUSES: DrawingStatus[] = ["draft", "final"];

export const DRAWING_LINK_STATUSES: DrawingLinkStatus[] = ["linked", "detached", "manual"];

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
  symbolId?: string;
}

/** Obiekty poza P0 — przechowywane przy roundtrip (forward-compat), bez edycji P0. */
export interface DrawingPassthroughObject extends DrawingObjectBase {
  type: Exclude<DrawingObjectType, "wall" | "text">;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  content?: string;
  label?: string;
  width?: number;
  fontSize?: number;
  thickness?: number;
  symbolId?: string;
  wallRefId?: string;
}

export type DrawingObject = DrawingWallObject | DrawingTextObject | DrawingPassthroughObject;

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
}

export interface DrawingDomainReport {
  added: string[];
  updated: string[];
  removed: string[];
}

/** Rozmiary arkusza (px logiczne ≈ PDF pt) — DF §7.3. */
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
