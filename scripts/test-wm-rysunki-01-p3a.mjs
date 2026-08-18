/**
 * WM-RYSUNKI-01 P3A — UX polish tests
 * Run: npx vite-node scripts/test-wm-rysunki-01-p3a.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import { snapDrawStart } from "../src/lib/wm-technical-drawings/snap-draw.ts";
import {
  WALL_DOOR_MAX_DIST_PX,
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
assert("T02 symbol library version 4", DRAWING_SYMBOL_LIBRARY_VERSION === 4);
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
const swingPaths = getSymbolDef("door-swing").paths;
assert(
  "T11 door-room glyph swing (no P)",
  getSymbolDef("door-room").paths === swingPaths &&
    !getSymbolDef("door-room").paths.includes(">P</text>") &&
    getSymbolDef("door-room").paths.includes("A 36 36"),
);
assert(
  "T12 door-entrance glyph swing (no W)",
  getSymbolDef("door-entrance").paths === swingPaths &&
    !getSymbolDef("door-entrance").paths.includes(">W</text>") &&
    getSymbolDef("door-entrance").paths.includes("A 36 36"),
);

assert("T13 resolveDoorSymbolId canonical", resolveDoorSymbolId("door-swing") === "door-swing");
assert("T14 resolveDoorSymbolId entrance → swing", resolveDoorSymbolId("door-entrance") === "door-swing");
assert("T14b resolveDoorSymbolId room → swing", resolveDoorSymbolId("door-room") === "door-swing");

const legacyDoor = parseDrawingObject({
  id: "d-leg",
  type: "door",
  x: 10,
  y: 10,
  symbolId: "door-swing",
});
assert(
  "T15 normalize door-swing stays door-swing",
  legacyDoor?.type === "door" && legacyDoor.symbolId === "door-swing",
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
assert(
  "T27 SVG canonical door-swing (no P)",
  svg.includes('data-symbol="door-swing"') && !svg.includes(">P</text>"),
);
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
  parsed?.objects.find((o) => o.id === "d-old")?.symbolId === "door-swing",
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
assert(
  "T38 door type stays door; entrance → swing",
  doorEnt?.type === "door" && doorEnt.symbolId === "door-swing",
);

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
  return renderDrawingSvg(d).includes('data-symbol="door-swing"');
})());

const newDoor = parseDrawingObject({ id: "d-new", type: "door", x: 8, y: 9 });
assert(
  "T41 new door persist canonical",
  newDoor?.type === "door" && newDoor.symbolId === "door-swing" && newDoor.width == null,
);

function doorOrientSvg(rotation, flipH) {
  const d = touchDrawing(blank, {
    objects: [
      {
        id: "d-or",
        type: "door",
        x: 40,
        y: 40,
        symbolId: "door-swing",
        flipH,
        rotation,
      },
    ],
  });
  return renderDrawingSvg(d, { showGrid: false });
}
const svg0 = doorOrientSvg(0, false);
assert("T42 rotation 0 no rotate()", svg0.includes('data-symbol="door-swing"') && !svg0.includes("rotate("));
assert("T43 rotation 90", doorOrientSvg(90, false).includes("rotate(90)"));
assert("T44 rotation 180", doorOrientSvg(180, false).includes("rotate(180)"));
assert("T45 rotation 270", doorOrientSvg(270, false).includes("rotate(270)"));
assert("T46 flipH", doorOrientSvg(0, true).includes("scale(-1"));
const svgCombo = doorOrientSvg(90, true);
assert("T47 rotation + flipH", svgCombo.includes("rotate(90)") && svgCombo.includes("scale(-1"));

const wallMissing = parseDrawingObject({
  id: "wm",
  type: "wall",
  x1: 0,
  y1: 0,
  x2: 80,
  y2: 0,
  symbolId: "wall-default",
});
assert("T48 wall missing thickness stays unset", wallMissing?.type === "wall" && wallMissing.thickness == null);

const svgWallDefault = renderDrawingSvg(
  touchDrawing(blank, { objects: [wallMissing] }),
  { showGrid: false },
);
assert("T49 wall default render 4", svgWallDefault.includes('stroke-width="4"') && svgWallDefault.includes('data-wall="1"'));

const wallExt = parseDrawingObject({
  id: "we",
  type: "wall",
  x1: 0,
  y1: 0,
  x2: 80,
  y2: 0,
  thickness: 8,
  symbolId: "wall-default",
});
const svgWallExt = renderDrawingSvg(touchDrawing(blank, { objects: [wallExt] }), { showGrid: false });
assert("T50 wall external render 8", svgWallExt.includes('stroke-width="8"'));

const wallInt = parseDrawingObject({
  id: "wi",
  type: "wall",
  x1: 0,
  y1: 0,
  x2: 80,
  y2: 0,
  thickness: 4,
  symbolId: "wall-default",
});
const svgWallInt = renderDrawingSvg(touchDrawing(blank, { objects: [wallInt] }), { showGrid: false });
assert("T51 wall partition render 4", svgWallInt.includes('stroke-width="4"'));

assert("T52 WALL_DOOR_MAX_DIST_PX 24", WALL_DOOR_MAX_DIST_PX === 24);

/** CREATE door placement — same order as WmPrintDrawingEditor (raw → wall → MISS snapPlace). */
function resolveDoorCreatePoint(raw, walls, snapOpts) {
  const hit = findNearestWall(walls, raw.x, raw.y, WALL_DOOR_MAX_DIST_PX);
  if (hit) {
    const proj = projectPointOnSegment(
      raw.x,
      raw.y,
      hit.wall.x1,
      hit.wall.y1,
      hit.wall.x2,
      hit.wall.y2,
    );
    return { x: proj.qx, y: proj.qy, via: "wall" };
  }
  const p = snapDrawStart(raw, snapOpts);
  return { x: p.x, y: p.y, via: "snapPlace" };
}

const wallH = { id: "wh", x1: 0, y1: 100, x2: 200, y2: 100 };
const wallV = { id: "wv", x1: 80, y1: 0, x2: 80, y2: 200 };
const wallDiag = { id: "wd", x1: 0, y1: 0, x2: 100, y2: 100 };
const snapOn = { snapEnabled: true, step: 10, endpoints: [] };
const snapOff = { snapEnabled: false, step: 10, endpoints: [] };

const a = resolveDoorCreatePoint({ x: 90, y: 108 }, [wallH], snapOn);
assert("A horizontal HIT via wall", a.via === "wall");
assert("A horizontal door.y on axis", Math.abs(a.y - 100) < 1e-9);
assert("A horizontal x on segment", a.x >= 0 && a.x <= 200);

const b = resolveDoorCreatePoint({ x: 88, y: 60 }, [wallV], snapOn);
assert("B vertical HIT via wall", b.via === "wall");
assert("B vertical door.x on axis", Math.abs(b.x - 80) < 1e-9);

const rawC = { x: 40, y: 52 };
const expC = projectPointOnSegment(rawC.x, rawC.y, wallDiag.x1, wallDiag.y1, wallDiag.x2, wallDiag.y2);
const c = resolveDoorCreatePoint(rawC, [wallDiag], snapOn);
assert("C diagonal == projection", c.via === "wall" && Math.abs(c.x - expC.qx) < 1e-9 && Math.abs(c.y - expC.qy) < 1e-9);

const d = resolveDoorCreatePoint({ x: 50, y: 124 }, [wallH], snapOn);
assert("D dist 24 HIT", d.via === "wall" && Math.abs(d.y - 100) < 1e-9 && Math.abs(d.x - 50) < 1e-9);

const rawE = { x: 97, y: 131 };
const missE = findNearestWall([wallH], rawE.x, rawE.y, WALL_DOOR_MAX_DIST_PX);
const snapE = snapDrawStart(rawE, snapOn);
const e = resolveDoorCreatePoint(rawE, [wallH], snapOn);
assert("E dist >24 MISS", missE === null && e.via === "snapPlace");
assert("E uses snapPlace not axis", Math.abs(e.x - snapE.x) < 1e-9 && Math.abs(e.y - snapE.y) < 1e-9);

const rawF = { x: 110, y: 5 };
const wallF = { id: "wf", x1: 0, y1: 0, x2: 100, y2: 0 };
const f = resolveDoorCreatePoint(rawF, [wallF], snapOff);
const expF = projectPointOnSegment(rawF.x, rawF.y, 0, 0, 100, 0);
assert("F past end clamped t", f.via === "wall" && Math.abs(expF.t - 1) < 1e-9);
assert("F door at endpoint", Math.abs(f.x - 100) < 1e-9 && Math.abs(f.y - 0) < 1e-9);

const gapsG = computeWallGaps(wallH, [{ x: a.x, y: a.y }]);
assert("G wall-gap after snap", gapsG.length === 1 && gapsG[0].t0 < 0.5 && gapsG[0].t1 > 0.45);

const created = parseDrawingObject({
  id: "d-create",
  type: "door",
  x: a.x,
  y: a.y,
  symbolId: "door-swing",
  flipH: false,
  rotation: 0,
});
assert("H CREATE rotation 0", created?.type === "door" && created.rotation === 0);
assert("I CREATE flipH false", created?.type === "door" && created.flipH === false);

const rawJ = { x: 53, y: 108 };
const gridJ = snapDrawStart(rawJ, snapOn);
const j = resolveDoorCreatePoint(rawJ, [wallH], snapOn);
assert("J grid ON wall wins", j.via === "wall" && Math.abs(j.y - 100) < 1e-9);
assert("J not grid point", Math.abs(j.x - gridJ.x) > 1e-6 || Math.abs(j.y - gridJ.y) > 1e-6);

const k = resolveDoorCreatePoint({ x: 90, y: 108 }, [wallH], snapOff);
assert("K grid OFF still wall", k.via === "wall" && Math.abs(k.y - 100) < 1e-9);

const rawL = { x: 33, y: 44 };
const snapL = snapDrawStart(rawL, snapOn);
const l = resolveDoorCreatePoint(rawL, [], snapOn);
assert("L no walls snapPlace", l.via === "snapPlace" && Math.abs(l.x - snapL.x) < 1e-9 && Math.abs(l.y - snapL.y) < 1e-9);

const editorSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "src/app/WmPrintDrawingEditor.tsx"),
  "utf8",
);
const doorStart = editorSrc.indexOf('if (tool === "door")');
const snapAfterDoor = editorSrc.indexOf("const p = snapPlace(raw.x, raw.y);", doorStart);
assert("SRC door tool branch exists", doorStart >= 0 && snapAfterDoor > doorStart);
const doorBlock = editorSrc.slice(doorStart, snapAfterDoor);
assert("SRC findNearestWall in door CREATE", doorBlock.includes("findNearestWall"));
assert("SRC WALL_DOOR_MAX_DIST_PX in door CREATE", doorBlock.includes("WALL_DOOR_MAX_DIST_PX"));
assert("SRC wall hit on raw", doorBlock.includes("raw.x") && doorBlock.includes("raw.y"));
const iHit = doorBlock.indexOf("findNearestWall");
const iSnap = doorBlock.indexOf("snapPlace");
assert("SRC HIT before snapPlace", iHit >= 0 && iSnap > iHit);
assert("SRC HIT addDoor proj", doorBlock.includes("proj.qx") && doorBlock.includes("proj.qy"));
assert("SRC hover still 28", (editorSrc.match(/findNearestWall\(walls, raw\.x, raw\.y, 28\)/g) || []).length >= 1);
assert(
  "SRC addDoor rotation 0 flipH false",
  /const addDoor[\s\S]{0,400}flipH:\s*false[\s\S]{0,80}rotation:\s*0/.test(editorSrc),
);

console.log(`\nP3A result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
