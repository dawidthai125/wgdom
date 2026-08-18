/**
 * WM-RYSUNKI-DIMENSIONS-RECTANGLE-UX-01 — harness T-D / T-F / T-U / T-R / T-M
 */
import assert from "node:assert/strict";
import { DrawingUndoStack } from "../src/lib/wm-technical-drawings/undo.ts";
import {
  DRAWING_DIMENSION_FONT_SIZE,
  DRAWING_DIMENSION_NORMAL_OFFSET,
  DRAWING_RENDER_VERSION,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import {
  canonicalizeSegmentForDimensionOffset,
  dimensionAutoLabel,
} from "../src/lib/wm-technical-drawings/symbols/render-symbol.ts";
import {
  buildDimensionOwnerLabel,
  formatDimensionOwnerLabel,
} from "../src/lib/wm-technical-drawings/dimension-label-format.ts";
import {
  applyRectangleSquareConstraint,
  buildRectangleWalls,
  isRectangleAreaTooSmall,
} from "../src/lib/wm-technical-drawings/rectangle-walls.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { findNearestWall } from "../src/lib/wm-technical-drawings/wall-gap.ts";
import { DRAWING_SCHEMA_VERSION } from "../src/lib/wm-technical-drawings/types.ts";

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}`);
  }
}

console.log("=== WM-RYSUNKI-DIMENSIONS-RECTANGLE-UX-01 ===");

ok("CONST font 14", DRAWING_DIMENSION_FONT_SIZE === 14);
ok("CONST offset 16", DRAWING_DIMENSION_NORMAL_OFFSET === 16);
ok("CONST render version 4", DRAWING_RENDER_VERSION === 4);
ok("schemaVersion still 1", DRAWING_SCHEMA_VERSION === 1);

/* --- T-D canonicalize --- */
const hCanon = canonicalizeSegmentForDimensionOffset({ x1: 100, y1: 50, x2: 0, y2: 50 });
ok("T-D1a H right→left canonical x1<=x2", hCanon.x1 === 0 && hCanon.x2 === 100);
ok("T-D1b H normal points down (ny>0)", hCanon.ny > 0.9 && Math.abs(hCanon.nx) < 0.1);

const vCanon = canonicalizeSegmentForDimensionOffset({ x1: 40, y1: 200, x2: 40, y2: 10 });
ok("T-D2a V bottom→top canonical y1<=y2", vCanon.y1 === 10 && vCanon.y2 === 200);
ok("T-D2b V normal points left (nx<0)", vCanon.nx < -0.9 && Math.abs(vCanon.ny) < 0.1);

const dCanon = canonicalizeSegmentForDimensionOffset({ x1: 0, y1: 0, x2: 30, y2: 40 });
ok("T-D3 diagonal len>0", dCanon.len > 49 && dCanon.len < 51);

const blank = buildDrawingFromTemplate("blank", { jobId: "ux01", address: "Test" });

function dimSvg(x1, y1, x2, y2, label) {
  const d = touchDrawing(blank, {
    objects: [
      {
        id: "dim1",
        type: "dimension",
        x1,
        y1,
        x2,
        y2,
        label,
        symbolId: "dimension-line",
      },
    ],
  });
  return renderDrawingSvg(d, { mode: "edit" });
}

const svgH = dimSvg(0, 100, 200, 100, "110 cm");
ok("T-D1 horizontal render version 4", svgH.includes('data-render-version="4"'));
ok("T-D1 label not at my-10 mid", !svgH.includes('y="90"') || svgH.includes('data-dim-label'));
/* H: mid (100,100), n~(0,1), line@16 → translate(100,116); labelOff@14=28 → (100, 128) */
ok("T-D1 label offset below", svgH.includes('y="128"') && svgH.includes('x="100"'));
ok("T-D4 body uses normalOffset (translate away from mid)", svgH.includes("translate(100 116)") || svgH.includes("translate(100.0 116"));

const svgV = dimSvg(50, 0, 50, 200, "220 cm");
/* V canonical top→bottom, n~(-1,0), mid (50,100), labelOff@14=28 → (22,100) */
ok("T-D2 vertical label left", svgV.includes('x="22"') && svgV.includes('y="100"'));

const svgDiag = dimSvg(0, 0, 80, 60, "diag");
ok("T-D3 diagonal has dim label", svgDiag.includes('data-dim-label="1"') && svgDiag.includes(">diag</text>"));

ok("T-D5 label precedence", svgH.includes(">110 cm</text>") && !svgH.includes(`>${dimensionAutoLabel(0, 100, 200, 100)}</text>`));

ok("T-F1 font-size 14", svgH.includes(`font-size="${DRAWING_DIMENSION_FONT_SIZE}"`));

const svgExport = renderDrawingSvg(
  touchDrawing(blank, {
    objects: [
      { id: "d", type: "dimension", x1: 0, y1: 0, x2: 40, y2: 0, label: "40", symbolId: "dimension-line" },
    ],
  }),
  { mode: "export", showGrid: false },
);
ok("T-F2 export mode uses same renderer", svgExport.includes('data-render-mode="export"'));
ok("T-F2 export font 14", svgExport.includes('font-size="14"'));
ok("T-F2 export no ghost rect", !svgExport.includes("data-ghost-rectangle"));

/* --- T-U --- */
const u1 = buildDimensionOwnerLabel("110", "cm");
ok("T-U1 cm", u1.ok && u1.label === "110 cm");
const u2a = buildDimensionOwnerLabel("1.10", "m");
ok("T-U2 dot m", u2a.ok && u2a.label === "1,10 m");
const u2b = buildDimensionOwnerLabel("1,10", "m");
ok("T-U2 comma m", u2b.ok && u2b.label === "1,10 m");
const uNoConv = buildDimensionOwnerLabel("110", "m");
ok("T-U no cm↔m conversion", uNoConv.ok && uNoConv.label === "110 m");
ok("T-U3 nonnumeric stays", formatDimensionOwnerLabel(1, "cm") === "1 cm");
const autoEmpty = dimensionAutoLabel(0, 0, 50, 0);
ok("T-U auto hypot no unit", autoEmpty === "50" && !autoEmpty.includes("cm") && !autoEmpty.includes("m"));
const outCm = buildDimensionOwnerLabel("0", "cm");
ok("T-U cm range reject 0", !outCm.ok && outCm.reason === "out_of_range");
const outM = buildDimensionOwnerLabel("0.001", "m");
ok("T-U m range reject tiny", !outM.ok && outM.reason === "out_of_range");

const oldLabelSvg = dimSvg(0, 0, 10, 0, "420");
ok("T-U old label 420 unchanged", oldLabelSvg.includes(">420</text>") && !oldLabelSvg.includes("420 cm"));

/* --- T-R --- */
const walls = buildRectangleWalls(10, 20, 110, 80);
ok("T-R1 exactly 4 walls", walls.length === 4 && walls.every((w) => w.type === "wall"));
ok("T-R1 no rectangle type", walls.every((w) => w.type !== "rectangle"));
ok(
  "T-R1 topology A-B-C-D",
  walls[0].x1 === 10 &&
    walls[0].y1 === 20 &&
    walls[0].x2 === 110 &&
    walls[0].y2 === 20 &&
    walls[1].x1 === 110 &&
    walls[1].y2 === 80 &&
    walls[2].x2 === 10 &&
    walls[2].y2 === 80 &&
    walls[3].x2 === 10 &&
    walls[3].y2 === 20,
);
ok("T-R1 thickness+symbol", walls.every((w) => w.thickness === 4 && w.symbolId === "wall-default"));
const wallsExt = buildRectangleWalls(10, 20, 110, 80, 8);
ok("T-R1 external thickness 8", wallsExt.length === 4 && wallsExt.every((w) => w.thickness === 8 && w.type === "wall"));

ok("T-R2 zero width", isRectangleAreaTooSmall(5, 5, 5, 50) === true);
ok("T-R2 zero height", isRectangleAreaTooSmall(5, 5, 50, 5) === true);
ok("T-R2 ok size", isRectangleAreaTooSmall(5, 5, 50, 40) === false);

const sq = applyRectangleSquareConstraint(0, 0, 30, 10);
ok("T-R3 shift square", Math.abs(sq.x2 - sq.x1) === Math.abs(sq.y2 - sq.y1) && sq.x2 === 30 && sq.y2 === 30);
const sqNeg = applyRectangleSquareConstraint(50, 50, 20, 40);
ok("T-R3 preserve direction", sqNeg.x2 < sqNeg.x1 && sqNeg.y2 < sqNeg.y1);

const base = buildDrawingFromTemplate("blank");
const stack = new DrawingUndoStack(base);
const before = stack.getCurrent().objects.length;
const next = touchDrawing(stack.getCurrent(), {
  objects: [...stack.getCurrent().objects, ...buildRectangleWalls(0, 0, 40, 30)],
});
stack.push(next);
ok("T-R4 one push +4", stack.getCurrent().objects.filter((o) => o.type === "wall").length === before + 4);
stack.undo();
ok("T-R4 one undo removes all 4", stack.getCurrent().objects.filter((o) => o.type === "wall").length === before);

const withRect = touchDrawing(blank, {
  objects: buildRectangleWalls(100, 100, 200, 180),
});
const hit = findNearestWall(
  withRect.objects.filter((o) => o.type === "wall"),
  150,
  100,
  28,
);
ok("T-R5 door/window wall hit on rect edge", hit != null && hit.wall.type === "wall");

const ghostEdit = renderDrawingSvg(blank, {
  mode: "edit",
  previewRectangle: { x1: 0, y1: 0, x2: 40, y2: 30 },
});
ok("T-R6 ghost in edit", ghostEdit.includes('data-ghost-rectangle="1"'));
const ghostExport = renderDrawingSvg(blank, {
  mode: "export",
  previewRectangle: { x1: 0, y1: 0, x2: 40, y2: 30 },
});
ok("T-R6 ghost OUT export", !ghostExport.includes("data-ghost-rectangle"));

/* T-M1 — mobile: square constraint is optional caller; free rect always available */
ok("T-M1 free rect without square", !isRectangleAreaTooSmall(0, 0, 40, 25));
ok("T-M1 square helper independent (desktop only wire)", applyRectangleSquareConstraint(0, 0, 10, 40).y2 === 40);

console.log(`\nRESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
