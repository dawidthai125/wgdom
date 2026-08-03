/** WM-RYSUNKI-01 P1 — zamknięta biblioteka symboli (D-P1-11: defaultWidth/Height). */

export type DrawingSymbolId =
  | "wall-default"
  | "door-swing"
  | "window-rect"
  | "vent-grid"
  | "gas-boiler"
  | "text-label"
  | "dimension-line"
  | "arrow-straight"
  | "unknown"
  | "point-measure"
  | "point-electrical"
  | "board-distribution";

export interface SymbolViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SymbolBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** SymbolDef — viewBox + localBounds + defaultWidth/Height (D-P1-11). */
export interface SymbolDef {
  symbolId: DrawingSymbolId;
  viewBox: SymbolViewBox;
  localBounds: SymbolBounds;
  /** D-P1-11 */
  defaultWidth: number;
  defaultHeight: number;
  /** Fragment SVG wewnątrz viewBox (bez root <svg>). */
  paths: string;
}

function def(
  symbolId: DrawingSymbolId,
  w: number,
  h: number,
  paths: string,
): SymbolDef {
  return {
    symbolId,
    viewBox: { x: 0, y: 0, w, h },
    localBounds: { x: 0, y: 0, w, h },
    defaultWidth: w,
    defaultHeight: h,
    paths,
  };
}

const DOOR: SymbolDef = def(
  "door-swing",
  40,
  40,
  [
    `<line x1="0" y1="20" x2="40" y2="20" stroke="#1e293b" stroke-width="3"/>`,
    `<path d="M 0 20 A 28 28 0 0 1 28 0" fill="none" stroke="#1e293b" stroke-width="1.5"/>`,
    `<line x1="0" y1="20" x2="0" y2="0" stroke="#1e293b" stroke-width="2"/>`,
  ].join(""),
);

const WINDOW: SymbolDef = def(
  "window-rect",
  48,
  16,
  [
    `<rect x="1" y="3" width="46" height="10" fill="none" stroke="#1e293b" stroke-width="2"/>`,
    `<line x1="24" y1="3" x2="24" y2="13" stroke="#1e293b" stroke-width="1.5"/>`,
  ].join(""),
);

const VENT: SymbolDef = def(
  "vent-grid",
  28,
  28,
  [
    `<rect x="2" y="2" width="24" height="24" fill="none" stroke="#1e293b" stroke-width="1.5"/>`,
    `<line x1="6" y1="8" x2="22" y2="8" stroke="#64748b" stroke-width="1"/>`,
    `<line x1="6" y1="14" x2="22" y2="14" stroke="#64748b" stroke-width="1"/>`,
    `<line x1="6" y1="20" x2="22" y2="20" stroke="#64748b" stroke-width="1"/>`,
  ].join(""),
);

const BOILER: SymbolDef = def(
  "gas-boiler",
  36,
  44,
  [
    `<rect x="4" y="4" width="28" height="36" rx="2" fill="none" stroke="#1e293b" stroke-width="2"/>`,
    `<circle cx="18" cy="22" r="8" fill="none" stroke="#1e293b" stroke-width="1.5"/>`,
    `<text x="18" y="26" text-anchor="middle" font-size="9" fill="#1e293b" font-family="system-ui,sans-serif">G</text>`,
  ].join(""),
);

const ARROW: SymbolDef = def(
  "arrow-straight",
  40,
  12,
  [
    `<line x1="0" y1="6" x2="32" y2="6" stroke="#1e293b" stroke-width="2"/>`,
    `<polygon points="32,2 40,6 32,10" fill="#1e293b"/>`,
  ].join(""),
);

const DIMENSION: SymbolDef = def(
  "dimension-line",
  40,
  16,
  [
    `<line x1="0" y1="8" x2="40" y2="8" stroke="#334155" stroke-width="1.25"/>`,
    `<line x1="0" y1="2" x2="0" y2="14" stroke="#334155" stroke-width="1.25"/>`,
    `<line x1="40" y1="2" x2="40" y2="14" stroke="#334155" stroke-width="1.25"/>`,
  ].join(""),
);

const UNKNOWN: SymbolDef = def(
  "unknown",
  24,
  24,
  [
    `<rect x="2" y="2" width="20" height="20" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 2"/>`,
    `<text x="12" y="16" text-anchor="middle" font-size="12" fill="#94a3b8">?</text>`,
  ].join(""),
);

const WALL: SymbolDef = def("wall-default", 40, 4, `<line x1="0" y1="2" x2="40" y2="2" stroke="#1e293b" stroke-width="4"/>`);

const TEXT: SymbolDef = def("text-label", 40, 16, ``);

const POINT_M: SymbolDef = def("point-measure", 12, 12, `<circle cx="6" cy="6" r="4" fill="none" stroke="#64748b"/>`);
const POINT_E: SymbolDef = def("point-electrical", 12, 12, `<circle cx="6" cy="6" r="4" fill="none" stroke="#64748b"/>`);
const BOARD: SymbolDef = def("board-distribution", 20, 20, `<rect x="2" y="2" width="16" height="16" fill="none" stroke="#64748b"/>`);

const REGISTRY: Record<string, SymbolDef> = {
  "wall-default": WALL,
  "door-swing": DOOR,
  "window-rect": WINDOW,
  "vent-grid": VENT,
  "gas-boiler": BOILER,
  "text-label": TEXT,
  "dimension-line": DIMENSION,
  "arrow-straight": ARROW,
  unknown: UNKNOWN,
  "point-measure": POINT_M,
  "point-electrical": POINT_E,
  "board-distribution": BOARD,
};

export function getSymbolDef(symbolId: string | undefined | null): SymbolDef {
  if (symbolId && REGISTRY[symbolId]) return REGISTRY[symbolId];
  return UNKNOWN;
}

export function listClosedSymbolIds(): string[] {
  return Object.keys(REGISTRY);
}
