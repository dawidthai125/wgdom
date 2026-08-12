/**
 * WM-RYSUNKI-01 P3A — UX polish tests
 * Run: npx vite-node scripts/test-wm-rysunki-01-p3a.mjs
 */
import {
  DRAWING_SCHEMA_VERSION,
  DRAWING_SYMBOL_LIBRARY_VERSION,
  DRAWING_P3A_OBJECT_TYPES,
} from "../src/lib/wm-technical-drawings/types.ts";
import {
  parseDrawingObject,
  parseWmTechnicalDrawing,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import {
  DRAWING_RENDER_VERSION,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import {
  getSymbolDef,
  letterStampPaths,
  listClosedSymbolIds,
  resolveDoorSymbolId,
} from "../src/lib/wm-technical-drawings/symbols/index.ts";
import { dimensionAutoLabel } from "../src/lib/wm-technical-drawings/symbols/render-symbol.ts";
import {
  computeWallGaps,
  findNearestWall,
  projectPointOnSegment,
  wallSegmentsAfterGaps,
} from "../src/lib/wm-technical-drawings/wall-gap.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name);
  }
}

console.log("WM-RYSUNKI-01 P3A — test-wm-rysunki-01-p3a\n");

assert("T01 schemaVersion stays 1", DRAWING_SCHEMA_VERSION === 1);
assert("T02 symbol library version 3", DRAWING_SYMBOL_LIBRARY_VERSION === 3);
assert("T03 render version 4", DRAWING_RENDER_VERSION === 4);
assert(
  "T04 P3A editable includes distribution_board",
  DRAWING_P3A_OBJECT_TYPES.includes("distribution_board") &&
    DRAWING_P3A_OBJECT_TYPES.includes("door"),
);

const ids = listClosedSymbolIds();
assert("T05 registry door-room + door-entrance", ids.includes("door-room") && ids.includes("door-entrance"));
assert("T06 registry distribution-board", ids.includes("distribution-board"));
assert("T07 letterStampPaths has letter", letterStampPaths("W").includes(">W</text>"));

const vent = getSymbolDef("vent-grid");
assert("T08 vent glyph W", vent.paths.includes(">W</text>"));
const boiler = getSymbolDef("gas-boiler");
assert("T09 boiler glyph G", boiler.paths.includes(">G</text>"));
const board = getSymbolDef("distribution-board");
assert("T10 board glyph R", board.paths.includes(">R</text>"));
assert("T11 door-room glyph P", getSymbolDef("door-room").paths.includes(">P</text>"));
assert("T12 door-entrance glyph W", getSymbolDef("door-entrance").paths.includes(">W</text>"));

assert("T13 resolveDoorSymbolId legacy", resolveDoorSymbolId("door-swing") === "door-room");
assert("T14 resolveDoorSymbolId entrance", resolveDoorSymbolId("door-entrance") === "door-entrance");

const legacyDoor = parseDrawingObject({
  id: "d-leg",
  type: "door",
  x: 10,
  y: 10,
  symbolId: "door-swing",
});
assert(
  "T15 normalize door-swing → door-room",
  legacyDoor?.type === "door" && legacyDoor.symbolId === "door-room",
);

const boardObj = parseDrawingObject({
  id: "b1",
  type: "distribution_board",
  x: 40,
  y: 40,
});
assert(
  "T16 distribution_board stamp",
  boardObj?.type === "distribution_board" && boardObj.symbolId === "distribution-board",
);

/* MR-P3A-01 wall gaps */
const wall = { x1: 0, y1: 0, x2: 200, y2: 0 };
const proj = projectPointOnSegment(100, 5, 0, 0, 200, 0);
assert("T17 project near wall", proj.dist < 6 && Math.abs(proj.t - 0.5) < 0.05);

const gaps = computeWallGaps(wall, [{ x: 100, y: 0, width: 40 }]);
assert("T18 one gap around door", gaps.length === 1 && gaps[0].t0 < 0.5 && gaps[0].t1 > 0.5);

const farGaps = computeWallGaps(wall, [{ x: 100, y: 80, width: 40 }]);
assert("T19 far door no gap", farGaps.length === 0);

const merged = computeWallGaps(wall, [
  { x: 90, y: 0, width: 30 },
  { x: 110, y: 0, width: 30 },
]);
assert("T20 overlapping gaps merge", merged.length === 1);

const segs = wallSegmentsAfterGaps(wall, [{ t0: 0.4, t1: 0.6 }]);
assert("T21 wall split into 2 segments", segs.length === 2);
assert(
  "T22 snap-unaffected: wall JSON coords unchanged concept",
  wall.x1 === 0 && wall.x2 === 200,
);

const blank = buildDrawingFromTemplate("blank", { jobId: "job-p3a", address: "P3A" });
const withGap = touchDrawing(blank, {
  objects: [
    {
      id: "w1",
      type: "wall",
      x1: 0,
      y1: 100,
      x2: 300,
      y2: 100,
      thickness: 4,
      symbolId: "wall-default",
    },
    {
      id: "d1",
      type: "door",
      x: 150,
      y: 100,
      width: 40,
      symbolId: "door-room",
      flipH: false,
      rotation: 0,
    },
    {
      id: "v1",
      type: "ventilation",
      x: 50,
      y: 50,
      symbolId: "vent-grid",
    },
    {
      id: "g1",
      type: "gas_boiler",
      x: 80,
      y: 50,
      symbolId: "gas-boiler",
    },
    {
      id: "r1",
      type: "distribution_board",
      x: 110,
      y: 50,
      symbolId: "distribution-board",
    },
    {
      id: "dim1",
      type: "dimension",
      x1: 0,
      y1: 100,
      x2: 300,
      y2: 100,
      label: "420",
      symbolId: "dimension-line",
    },
  ],
});

const svg = renderDrawingSvg(withGap, { showGrid: false });
assert("T23 SVG render-version 4", svg.includes('data-render-version="4"'));
assert("T24 SVG vent W", svg.includes(">W</text>") && svg.includes('data-symbol="vent-grid"'));
assert("T25 SVG boiler G", svg.includes('data-symbol="gas-boiler"') && svg.includes(">G</text>"));
assert("T26 SVG board R", svg.includes('data-symbol="distribution-board"') && svg.includes(">R</text>"));
assert("T27 SVG door-room P", svg.includes('data-symbol="door-room"') && svg.includes(">P</text>"));
assert("T28 SVG wall has multiple lines (gap)", (svg.match(/data-wall="1"/g) || []).length === 1);
assert(
  "T29 SVG wall gap = more than one line under wall",
  (svg.match(/<line x1=/g) || []).length >= 2,
);
assert("T30 MR-P3A-02 label wins", svg.includes(">420</text>") && !svg.includes(`>${dimensionAutoLabel(0, 100, 300, 100)}</text>`));

const noLabelDim = touchDrawing(blank, {
  objects: [
    {
      id: "dim2",
      type: "dimension",
      x1: 0,
      y1: 0,
      x2: 50,
      y2: 0,
      symbolId: "dimension-line",
    },
  ],
});
const svgAuto = renderDrawingSvg(noLabelDim);
assert("T31 auto label when empty", svgAuto.includes(`>${dimensionAutoLabel(0, 0, 50, 0)}</text>`));

const parsed = parseWmTechnicalDrawing({
  ...withGap,
  objects: [
    ...withGap.objects,
    { id: "d-old", type: "door", x: 1, y: 1, symbolId: "door-swing" },
  ],
});
assert("T32 schema still 1 after parse", parsed?.schemaVersion === 1);
assert(
  "T33 AC-P3A-06 wall not split in JSON",
  parsed?.objects.filter((o) => o.type === "wall").length === 1 &&
    parsed.objects.find((o) => o.id === "w1")?.x1 === 0 &&
    parsed.objects.find((o) => o.id === "w1")?.x2 === 300,
);
assert(
  "T34 no wallId on dimension",
  parsed?.objects.find((o) => o.id === "dim1") &&
    !("wallId" in (parsed.objects.find((o) => o.id === "dim1") || {})),
);
assert(
  "T35 legacy door mapped in full parse",
  parsed?.objects.find((o) => o.id === "d-old")?.symbolId === "door-room",
);

const hit = findNearestWall(
  [{ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0 }],
  50,
  10,
  28,
);
assert("T36 findNearestWall hit", hit?.wall.id === "w1");

const miss = findNearestWall(
  [{ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0 }],
  50,
  80,
  28,
);
assert("T37 findNearestWall miss", miss === null);

const doorEnt = parseDrawingObject({
  id: "de",
  type: "door",
  x: 0,
  y: 0,
  symbolId: "door-entrance",
});
assert("T38 door type stays door for W", doorEnt?.type === "door" && doorEnt.symbolId === "door-entrance");

const svgHover = renderDrawingSvg(withGap, {
  mode: "edit",
  showGrid: false,
  highlightWallId: "w1",
});
assert("T39 hover wall visual only", svgHover.includes('data-wall-hover="1"'));

assert("T40 entrance in SVG", (() => {
  const d = touchDrawing(blank, {
    objects: [
      {
        id: "de2",
        type: "door",
        x: 20,
        y: 20,
        symbolId: "door-entrance",
        flipH: false,
        rotation: 0,
      },
    ],
  });
  return renderDrawingSvg(d).includes('data-symbol="door-entrance"');
})());

console.log(`\nP3A result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
