/**
 * WM-RYSUNKI-01 P3B — Interactive Drawing UX
 * Run: npx vite-node scripts/test-wm-rysunki-01-p3b.mjs
 */
import {
  DRAWING_SCHEMA_VERSION,
  DRAWING_SYMBOL_LIBRARY_VERSION,
} from "../src/lib/wm-technical-drawings/types.ts";
import { parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import {
  DRAWING_GHOST_WALL_STROKE,
  DRAWING_RENDER_VERSION,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import {
  isWallPreviewTooShort,
  wallPreviewMetrics,
} from "../src/lib/wm-technical-drawings/wall-preview.ts";

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

console.log("WM-RYSUNKI-01 P3B — test-wm-rysunki-01-p3b\n");

assert("T01 schemaVersion stays 1", DRAWING_SCHEMA_VERSION === 1);
assert("T02 symbol library unchanged 3", DRAWING_SYMBOL_LIBRARY_VERSION === 3);
assert("T03 render version 4 (DIM-RECT UX)", DRAWING_RENDER_VERSION === 4);
assert("T04 ghost stroke #f59e0b", DRAWING_GHOST_WALL_STROKE === "#f59e0b");

const m = wallPreviewMetrics(0, 0, 120, 0, 10);
assert("T05 lengthPx 120", Math.abs(m.lengthPx - 120) < 1e-9);
assert("T06 cells 12", m.cells === 12);
assert("T07 label has px + krat", m.lengthLabel.includes("120 px") && m.lengthLabel.includes("12"));

const m2 = wallPreviewMetrics(0, 0, 30, 40, 10);
assert("T08 hypot 50", Math.abs(m2.lengthPx - 50) < 1e-9);
assert("T09 cells 5", m2.cells === 5);

const mNoStep = wallPreviewMetrics(0, 0, 10, 0);
assert("T10 no step → no cells", mNoStep.cells === undefined && mNoStep.lengthLabel === "10 px");

assert("T11 too short 0.5", isWallPreviewTooShort(0.5) === true);
assert("T12 ok length 1", isWallPreviewTooShort(1) === false);

const base = buildDrawingFromTemplate("blank", {
  jobId: "job-p3b",
  title: "P3B",
  createdByUserId: "u1",
});
const withWall = touchDrawing(base, {
  objects: [
    {
      id: "w1",
      type: "wall",
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      thickness: 4,
      symbolId: "wall-default",
    },
  ],
});

const svgDefault = renderDrawingSvg(withWall);
assert("T13 default SVG no ghost", !svgDefault.includes("data-ghost-wall"));
assert("T14 default no ghost group", !svgDefault.includes("data-ghost-wall-group"));

const svgPdfLike = renderDrawingSvg(withWall, { showGrid: false });
assert("T15 PDF-like no ghost", !svgPdfLike.includes("data-ghost-wall"));

const svgGhost = renderDrawingSvg(withWall, {
  mode: "edit",
  showGrid: true,
  previewWall: {
    x1: 100,
    y1: 0,
    x2: 200,
    y2: 0,
    lengthLabel: "100 px · ≈10 krat.",
  },
});
assert("T16 ghost marker", svgGhost.includes('data-ghost-wall="1"'));
assert("T17 ghost stroke amber", svgGhost.includes(DRAWING_GHOST_WALL_STROKE));
assert("T18 ghost dash", svgGhost.includes("stroke-dasharray"));
assert("T19 ghost label", svgGhost.includes("data-ghost-label") && svgGhost.includes("100 px"));
assert("T20 no data-id on ghost line group content", !/data-ghost-wall="1"[^>]*data-id=/.test(svgGhost));

const parsed = parseWmTechnicalDrawing(withWall);
assert("T21 parse keeps schema 1", parsed?.schemaVersion === 1);
assert(
  "T22 wall has no length/ghost fields",
  parsed?.objects[0]?.type === "wall" &&
    !("length" in (parsed.objects[0] || {})) &&
    !("ghost" in (parsed.objects[0] || {})),
);

const json = JSON.stringify(withWall);
assert("T23 JSON serialize no ghost keys", !json.includes("previewWall") && !json.includes("ghost"));

/* continuous semantics: N walls, not polyline — model check only */
const two = touchDrawing(withWall, {
  objects: [
    ...withWall.objects,
    {
      id: "w2",
      type: "wall",
      x1: 100,
      y1: 0,
      x2: 100,
      y2: 80,
      thickness: 4,
      symbolId: "wall-default",
    },
  ],
});
assert(
  "T24 continuous = 2 wall objects",
  two.objects.filter((o) => o.type === "wall").length === 2,
);

console.log(`\nP3B result: ${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
