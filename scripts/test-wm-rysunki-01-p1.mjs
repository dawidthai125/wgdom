/**
 * WM-RYSUNKI-01 P1 — toolset MVP tests
 * Run: npx vite-node scripts/test-wm-rysunki-01-p1.mjs
 */
import {
  DRAWING_SCHEMA_VERSION,
  DRAWING_SYMBOL_LIBRARY_VERSION,
  DRAWING_P1_OBJECT_TYPES,
  DRAWING_OBJECTS_SOFT_WARN,
  ROOM_LABEL_DEFAULT_CONTENT,
  ROOM_LABEL_DEFAULT_FONT_SIZE,
} from "../src/lib/wm-technical-drawings/types.ts";
import {
  parseDrawingObject,
  parseWmTechnicalDrawing,
  validateDrawingForFinal,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import {
  duplicateSelectedObjects,
  rotateObjectBy,
  setDrawingFinal,
  toggleDoorFlipH,
  touchDrawing,
} from "../src/lib/wm-technical-drawings/report.ts";
import {
  DRAWING_RENDER_VERSION,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import {
  getSymbolDef,
  listClosedSymbolIds,
} from "../src/lib/wm-technical-drawings/symbols/index.ts";
import {
  dimensionAutoLabel,
  renderSymbol,
  symbolTransformAttr,
} from "../src/lib/wm-technical-drawings/symbols/render-symbol.ts";

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

console.log("WM-RYSUNKI-01 P1 — test-wm-rysunki-01-p1\n");

assert("T01 schemaVersion stays 1", DRAWING_SCHEMA_VERSION === 1);
assert("T02 symbol library version 3", DRAWING_SYMBOL_LIBRARY_VERSION === 3);
assert("T03 render version 4", DRAWING_RENDER_VERSION === 4);
assert("T04 soft warn threshold 300", DRAWING_OBJECTS_SOFT_WARN === 300);
assert(
  "T05 P1 editable includes arrow+door",
  DRAWING_P1_OBJECT_TYPES.includes("arrow") &&
    DRAWING_P1_OBJECT_TYPES.includes("door") &&
    DRAWING_P1_OBJECT_TYPES.includes("dimension"),
);

const ids = listClosedSymbolIds();
assert("T06 closed registry has door-swing", ids.includes("door-swing"));
assert("T07 closed registry has arrow-straight", ids.includes("arrow-straight"));

const doorDef = getSymbolDef("door-swing");
assert(
  "T08 D-P1-11 door defaultWidth/Height",
  doorDef.defaultWidth > 0 && doorDef.defaultHeight > 0,
);
for (const sid of [
  "door-swing",
  "window-rect",
  "vent-grid",
  "gas-boiler",
  "arrow-straight",
  "dimension-line",
]) {
  const d = getSymbolDef(sid);
  assert(
    `T09 SymbolDef ${sid} has defaults`,
    typeof d.defaultWidth === "number" &&
      typeof d.defaultHeight === "number" &&
      d.defaultWidth > 0 &&
      d.defaultHeight > 0,
  );
}

const tf = symbolTransformAttr(100, 50, 90, true, 1, 1);
assert("T10 MR-P1-05 translate first", tf.startsWith("translate(100 50)"));
assert("T11 MR-P1-05 rotate then scale flip", tf.includes("rotate(90)") && tf.includes("scale(-1 1)"));

const doorSvg = renderSymbol({
  symbolId: "door-swing",
  x: 40,
  y: 40,
  rotationDeg: 0,
  flipH: true,
  dataId: "d1",
});
assert("T12 renderSymbol flipH scale", doorSvg.includes("scale(-1") && doorSvg.includes('data-id="d1"'));
assert("T13 renderSymbol uses door-swing", doorSvg.includes('data-symbol="door-swing"'));

assert(
  "T14 MR-P1-08 dimensionAutoLabel no unit",
  dimensionAutoLabel(0, 0, 100, 0) === "100" && !dimensionAutoLabel(0, 0, 100, 0).includes("cm"),
);
assert("T15 dimensionAutoLabel round", dimensionAutoLabel(0, 0, 10.6, 0) === "11");

const doorRaw = parseDrawingObject({
  id: "door1",
  type: "door",
  x: 10,
  y: 20,
  symbolId: "door-swing",
  flipH: true,
  wallRefId: "MUST_STRIP",
  rotation: 90,
});
assert("T16 door flipH kept", doorRaw?.type === "door" && doorRaw.flipH === true);
assert("T16b legacy door-swing → door-room", doorRaw?.type === "door" && doorRaw.symbolId === "door-room");
assert("T17 MR-P1-06 wallRefId stripped", doorRaw && !("wallRefId" in doorRaw));

const arrowRaw = parseDrawingObject({
  id: "a1",
  type: "arrow",
  x1: 0,
  y1: 0,
  x2: 50,
  y2: 0,
  symbolId: "arrow-straight",
});
assert("T18 arrow in KNOWN", arrowRaw?.type === "arrow");

const blank = buildDrawingFromTemplate("blank", { jobId: "job-p1", address: "P1 Test" });
const withObjs = touchDrawing(blank, {
  objects: [
    {
      id: "w1",
      type: "wall",
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      symbolId: "wall-default",
    },
    {
      id: "door1",
      type: "door",
      x: 50,
      y: 40,
      symbolId: "door-swing",
      flipH: true,
      rotation: 0,
    },
    {
      id: "win1",
      type: "window",
      x: 80,
      y: 40,
      symbolId: "window-rect",
    },
    {
      id: "dim1",
      type: "dimension",
      x1: 0,
      y1: 100,
      x2: 120,
      y2: 100,
      symbolId: "dimension-line",
    },
    {
      id: "arr1",
      type: "arrow",
      x1: 10,
      y1: 200,
      x2: 80,
      y2: 200,
      symbolId: "arrow-straight",
    },
    {
      id: "vent1",
      type: "ventilation",
      x: 200,
      y: 100,
      symbolId: "vent-grid",
    },
    {
      id: "boil1",
      type: "gas_boiler",
      x: 250,
      y: 100,
      symbolId: "gas-boiler",
    },
    {
      id: "txt1",
      type: "text",
      x: 30,
      y: 300,
      content: ROOM_LABEL_DEFAULT_CONTENT,
      fontSize: ROOM_LABEL_DEFAULT_FONT_SIZE,
      symbolId: "text-label",
    },
  ],
});

const svg = renderDrawingSvg(withObjs);
assert("T19 SVG render version 4", svg.includes('data-render-version="4"'));
assert("T20 SVG has door flip", svg.includes("door-room") && svg.includes("scale(-1"));
assert("T21 SVG has window", svg.includes("window-rect"));
assert("T22 SVG has vent+boiler", svg.includes("vent-grid") && svg.includes("gas-boiler"));
assert("T23 SVG has arrow", svg.includes("arrow-straight"));
assert("T24 SVG dimension label 120 no unit", svg.includes(">120<") && !svg.includes("120 cm"));
assert("T25 room label preset text", svg.includes(ROOM_LABEL_DEFAULT_CONTENT));
assert("T26 wall still special-case line", svg.includes("<line") && svg.includes('data-id="w1"'));

const flipped = toggleDoorFlipH(withObjs.objects.find((o) => o.id === "door1"));
assert("T27 toggle flipH off", flipped.type === "door" && flipped.flipH === false);

const rotated = rotateObjectBy(
  { id: "d", type: "door", x: 0, y: 0, symbolId: "door-swing", rotation: 0 },
  90,
);
assert("T28 D-P1-12 rotate 90", rotated.rotation === 90);
const r180 = rotateObjectBy(rotated, 180);
assert("T29 rotate 180 cumulative", r180.rotation === 270);
const r270 = rotateObjectBy({ id: "d", type: "door", x: 0, y: 0, symbolId: "door-swing", rotation: 0 }, 270);
assert("T30 rotate 270", r270.rotation === 270);

const wallRot = rotateObjectBy(
  { id: "w", type: "wall", x1: 0, y1: 0, x2: 100, y2: 0, symbolId: "wall-default" },
  90,
);
assert(
  "T31 rotate wall segment 90",
  wallRot.type === "wall" &&
    Math.abs(wallRot.x1 - 50) < 1e-6 &&
    Math.abs(wallRot.y1 - (-50)) < 1e-6,
);

const { drawing: dupped, newIds } = duplicateSelectedObjects(withObjs, ["door1", "txt1"], 10);
assert("T32 dup selection", newIds.length === 2 && dupped.objects.length === withObjs.objects.length + 2);

assert("T33 validate final OK with job", validateDrawingForFinal(withObjs).ok === true);
const fin = setDrawingFinal(withObjs);
assert("T34 setDrawingFinal", fin.ok === true && fin.drawing?.status === "final");

const noLink = touchDrawing(buildDrawingFromTemplate("blank", {}), {
  jobId: undefined,
  address: undefined,
  linkStatus: "manual",
});
assert("T35 final blocked without job/address", setDrawingFinal(noLink).ok === false);

const roundtrip = parseWmTechnicalDrawing(
  JSON.parse(
    JSON.stringify({
      ...withObjs,
      objects: [
        ...withObjs.objects,
        {
          id: "door-legacy",
          type: "door",
          x: 1,
          y: 2,
          symbolId: "door-swing",
          wallRefId: "x",
          flipH: true,
        },
      ],
    }),
  ),
);
assert("T36 P0+P1 JSON roundtrip", roundtrip != null && roundtrip.schemaVersion === 1);
const legacyDoor = roundtrip?.objects.find((o) => o.id === "door-legacy");
assert("T37 strip wallRefId on roundtrip", legacyDoor?.type === "door" && !("wallRefId" in legacyDoor));

assert(
  "T38 room preset constants",
  ROOM_LABEL_DEFAULT_CONTENT === "Pomieszczenie" && ROOM_LABEL_DEFAULT_FONT_SIZE === 18,
);

console.log(`\nDone: ${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
