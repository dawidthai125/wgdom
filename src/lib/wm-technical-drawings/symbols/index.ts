/** WM-RYSUNKI-01 P1+P3A — zamknięta biblioteka symboli (D-P1-11 · MR-P3A-06). */

export type DrawingSymbolId =
  | "wall-default"
  | "door-swing"
  | "door-room"
  | "door-entrance"
  | "window-rect"
  | "vent-grid"
  | "gas-boiler"
  | "text-label"
  | "dimension-line"
  | "arrow-straight"
  | "unknown"
  | "point-measure"
  | "point-electrical"
  | "board-distribution"
  | "distribution-board";

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

/**
 * MR-P3A-06 — wspólny glyph literowy (G / W / R / P).
 * Styl: prostokąt + okrąg + litera (jak historyczny piec G).
 */
export function letterStampPaths(letter: string, w = 36, h = 44): string {
  const cx = w / 2;
  const cy = h / 2;
  const safe = String(letter).slice(0, 1).replace(/[<>&"]/g, "");
  return [
    `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="2" fill="none" stroke="#1e293b" stroke-width="2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#1e293b" stroke-width="1.5"/>`,
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" fill="#1e293b" font-family="system-ui,sans-serif">${safe}</text>`,
  ].join("");
}

/**
 * Canonical swing door — viewBox 36×72 so renderSymbol origin (viewBox center)
 * sits on the opening (y=36). Hinge at (0,36) = local (−18, 0). Leaf + quarter arc in −Y.
 * ZERO letters. defaultWidth 36 = DEFAULT_DOOR_GAP_WIDTH_PX.
 */
function doorSwingPaths(): string {
  return [
    `<line x1="0" y1="36" x2="0" y2="0" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M 36 36 A 36 36 0 0 0 0 0" fill="none" stroke="#1e293b" stroke-width="1.5"/>`,
    `<circle cx="0" cy="36" r="1.75" fill="#1e293b"/>`,
  ].join("");
}

const DOOR_SWING: SymbolDef = def("door-swing", 36, 72, doorSwingPaths());
/** Legacy ids — same glyph as canonical swing (normalize maps to door-swing). */
const DOOR_ROOM: SymbolDef = DOOR_SWING;
const DOOR_ENTRANCE: SymbolDef = DOOR_SWING;

const WINDOW: SymbolDef = def(
  "window-rect",
  48,
  16,
  [
    `<rect x="1" y="3" width="46" height="10" fill="none" stroke="#1e293b" stroke-width="2"/>`,
    `<line x1="24" y1="3" x2="24" y2="13" stroke="#1e293b" stroke-width="1.5"/>`,
  ].join(""),
);

const VENT: SymbolDef = def("vent-grid", 36, 44, letterStampPaths("W"));

const BOILER: SymbolDef = def("gas-boiler", 36, 44, letterStampPaths("G"));

const BOARD: SymbolDef = def("board-distribution", 36, 44, letterStampPaths("R"));
const BOARD_ALT: SymbolDef = def("distribution-board", 36, 44, letterStampPaths("R"));

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

const REGISTRY: Record<string, SymbolDef> = {
  "wall-default": WALL,
  "door-swing": DOOR_SWING,
  "door-room": DOOR_ROOM,
  "door-entrance": DOOR_ENTRANCE,
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
  "distribution-board": BOARD_ALT,
};

export function getSymbolDef(symbolId: string | undefined | null): SymbolDef {
  if (symbolId && REGISTRY[symbolId]) return REGISTRY[symbolId];
  return UNKNOWN;
}

export function listClosedSymbolIds(): string[] {
  return Object.keys(REGISTRY);
}

const LEGACY_DOOR_SYMBOL_IDS = new Set(["door-swing", "door-room", "door-entrance"]);

/** SSOT door alias map — parseDoor + resolveDoorSymbolId. */
export function canonicalDoorSymbolId(symbolId: string | undefined | null): string {
  const s = (symbolId || "").trim();
  if (!s || LEGACY_DOOR_SYMBOL_IDS.has(s)) return "door-swing";
  return "door-swing";
}

/** Render-time wrapper — same SSOT as parseDoor. */
export function resolveDoorSymbolId(symbolId: string | undefined | null): string {
  return canonicalDoorSymbolId(symbolId);
}
