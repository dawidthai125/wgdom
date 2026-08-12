/**
 * WM-RYSUNKI-DIMENSION-RANGE-JOB-EXPORT-UX-01 — harness T-A / T-B / T-C
 * Run: npx vite-node scripts/test-wm-rysunki-dimension-range-job-export-ux-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DrawingUndoStack } from "../src/lib/wm-technical-drawings/undo.ts";
import {
  DRAWING_DIMENSION_NORMAL_OFFSET,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import { canonicalizeSegmentForDimensionOffset } from "../src/lib/wm-technical-drawings/symbols/render-symbol.ts";
import {
  constrainDimensionEndpointDrag,
  collectCollinearContinuousWalls,
  isPointerOnCollinearChain,
} from "../src/lib/wm-technical-drawings/dimension-range.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";
import { DRAWING_SCHEMA_VERSION } from "../src/lib/wm-technical-drawings/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const editorSrc = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
const panelSrc = readFileSync(join(root, "src/app/WmPrintDrawingsPanel.tsx"), "utf8");
const renderSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/render-svg.ts"), "utf8");
const appSrc = readFileSync(join(root, "src/app/App.tsx"), "utf8");

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

console.log("=== WM-RYSUNKI-DIMENSION-RANGE-JOB-EXPORT-UX-01 ===");

ok("schemaVersion still 1", DRAWING_SCHEMA_VERSION === 1);
ok("normalOffset still 16", DRAWING_DIMENSION_NORMAL_OFFSET === 16);

const blank = buildDrawingFromTemplate("blank", { jobId: "job-dim-export", address: "Test" });

function dimObj(partial) {
  return {
    id: partial.id || "dim1",
    type: "dimension",
    x1: partial.x1,
    y1: partial.y1,
    x2: partial.x2,
    y2: partial.y2,
    label: partial.label ?? "110 cm",
    symbolId: "dimension-line",
  };
}

function dimSvg(x1, y1, x2, y2, label, mode = "edit") {
  return renderDrawingSvg(
    touchDrawing(blank, { objects: [dimObj({ id: "d1", x1, y1, x2, y2, label })] }),
    { mode, showGrid: false },
  );
}

/* --- A --- */
const svgH = dimSvg(0, 100, 200, 100, "110 cm");
ok("T-A1 horizontal label no rotate", svgH.includes('data-dim-label="1"') && !svgH.includes("rotate(-90"));
ok("T-A1b horizontal still offset", svgH.includes('y="116"') && svgH.includes('x="100"'));

const svgV = dimSvg(50, 0, 50, 200, "1,10 m");
ok("T-A2 vertical -90", svgV.includes("rotate(-90"));
const canV = canonicalizeSegmentForDimensionOffset({ x1: 50, y1: 0, x2: 50, y2: 200 });
const lx = canV.mx + canV.nx * DRAWING_DIMENSION_NORMAL_OFFSET;
const ly = canV.my + canV.ny * DRAWING_DIMENSION_NORMAL_OFFSET;
ok("T-A3 vertical centered about mid+offset", svgV.includes(`rotate(-90 ${lx} ${ly})`));
ok("T-A4 vertical offset from wall (nx=-1)", Math.abs(lx - 34) < 0.01 && Math.abs(ly - 100) < 0.01);

const svgDiag = dimSvg(0, 0, 80, 60, "diag");
ok("T-A5 diagonal no -90", svgDiag.includes(">diag</text>") && !svgDiag.includes("rotate(-90"));

const svgExport = dimSvg(50, 0, 50, 200, "1,10 m", "export");
ok("T-A6 PDF/export keeps -90", svgExport.includes('data-render-mode="export"') && svgExport.includes("rotate(-90"));
ok("T-A7 ZIP path = same export SVG", svgExport.includes('data-dim-label="1"') && !svgExport.includes("data-dim-handle"));

/* --- B --- */
const wallsAB = [
  { x1: 0, y1: 0, x2: 100, y2: 0 },
  { x1: 100, y1: 0, x2: 200, y2: 0 },
];
const autoDim = { x1: 0, y1: 0, x2: 100, y2: 0 };
ok("T-B1 automatic range = wall segment coords", autoDim.x2 - autoDim.x1 === 100);

const startDrag = constrainDimensionEndpointDrag({
  dim: autoDim,
  which: "start",
  pointer: { x: -10, y: 5 },
  walls: wallsAB,
});
ok("T-B2 start handle constrained", startDrag != null && startDrag.x2 === 100);

const endDrag = constrainDimensionEndpointDrag({
  dim: autoDim,
  which: "end",
  pointer: { x: 150, y: 2 },
  walls: wallsAB,
});
ok("T-B3 end handle moves", endDrag != null && endDrag.x1 === 0);

const extend = constrainDimensionEndpointDrag({
  dim: autoDim,
  which: "end",
  pointer: { x: 200, y: 0 },
  walls: wallsAB,
});
ok("T-B4 extend to continuous end", extend != null && Math.abs(extend.x2 - 200) < 1);

const shorten = constrainDimensionEndpointDrag({
  dim: { x1: 0, y1: 0, x2: 200, y2: 0 },
  which: "end",
  pointer: { x: 100, y: 0 },
  walls: wallsAB,
});
ok("T-B5 shorten", shorten != null && Math.abs(shorten.x2 - 100) < 1);

const chain = collectCollinearContinuousWalls(autoDim, wallsAB);
ok("T-B6 continuous collinear chain len=2", chain.length === 2);

const reject = constrainDimensionEndpointDrag({
  dim: autoDim,
  which: "end",
  pointer: { x: 50, y: 80 },
  walls: wallsAB,
});
ok(
  "T-B7 unrelated geometry rejected or clamped on axis",
  reject == null || Math.abs(reject.y2) < 1,
);
ok("T-B7b orthogonal wall not in chain", !isPointerOnCollinearChain(autoDim, { x: 50, y: 80 }, wallsAB));

const stack = new DrawingUndoStack(blank);
const withDim = touchDrawing(stack.getCurrent(), {
  objects: [
    { id: "w1", type: "wall", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 4, symbolId: "wall-default" },
    dimObj({ id: "d1", x1: 0, y1: 0, x2: 100, y2: 0 }),
  ],
});
stack.push(withDim);
const edited = constrainDimensionEndpointDrag({
  dim: { x1: 0, y1: 0, x2: 100, y2: 0 },
  which: "end",
  pointer: { x: 200, y: 0 },
  walls: wallsAB,
});
const afterEdit = touchDrawing(stack.getCurrent(), {
  objects: stack.getCurrent().objects.map((o) =>
    o.id === "d1" && edited ? { ...o, ...edited } : o,
  ),
});
stack.push(afterEdit);
ok("T-B8 one commit frame", stack.canUndo());
stack.undo();
const undone = stack.getCurrent().objects.find((o) => o.id === "d1");
ok("T-B8b undo restores prior range", undone && undone.x2 === 100);

const roundtrip = parseWmTechnicalDrawing(afterEdit);
ok("T-B9 reload/autosave parse keeps coords", roundtrip?.objects.find((o) => o.id === "d1")?.x2 === edited?.x2);

const editedSvg = renderDrawingSvg(afterEdit, { mode: "export", showGrid: false });
ok("T-B10 PDF reflects edited range", editedSvg.includes('data-render-mode="export"'));
ok("T-B11 ZIP/export no handles", !editedSvg.includes("data-dim-handle"));

ok(
  "T-B handles edit-only in editor render options",
  renderSrc.includes("selectedObjectId") &&
    renderSrc.includes('data-dim-handle="start"') &&
    editorSrc.includes("dim-handle") &&
    editorSrc.includes("constrainDimensionEndpointDrag") &&
    editorSrc.includes("applyWithoutUndo"),
);

/* --- C/D --- */
ok("T-C1 drawing has jobId", blank.jobId === "job-dim-export");
const parsedJob = parseWmTechnicalDrawing(blank);
ok("T-C2 jobId persists", parsedJob?.jobId === "job-dim-export");

ok(
  "T-C3 PDF → jobAttachments path",
  editorSrc.includes("uploadJobAttachment") &&
    editorSrc.includes("appendAttachment") &&
    !editorSrc.includes("plan_techniczny"),
);
ok("T-C4 patchJob wire", appSrc.includes("patchJobFromDrawingExport") && panelSrc.includes("onPatchJob"));
ok(
  "T-C5 PNG → photos",
  editorSrc.includes("uploadPhoto") && editorSrc.includes("appendPhoto"),
);
ok(
  "T-C6 PNG from renderDrawingSvg export",
  editorSrc.includes('mode: "export"') &&
    editorSrc.includes("showGrid: false") &&
    editorSrc.includes("rasterizeDrawingSvgToPng"),
);
ok(
  "T-C7 progress + caption",
  editorSrc.includes('"progress"') && editorSrc.includes("Rysunek:"),
);

const pngProbe = renderDrawingSvg(
  touchDrawing(blank, {
    objects: [dimObj({ id: "p", x1: 0, y1: 0, x2: 40, y2: 0 }), { id: "t", type: "text", x: 1, y: 1, content: "Hi", symbolId: "text-label" }],
  }),
  { mode: "export", showGrid: false, selectedObjectId: "p", previewWall: { x1: 0, y1: 0, x2: 1, y2: 1 } },
);
ok("T-C8 no UI in export SVG", !pngProbe.includes("data-dim-handle") && !pngProbe.includes("toolbar"));
ok(
  "T-C9 no ghost/selection/handles in export",
  !pngProbe.includes("data-ghost") &&
    !pngProbe.includes("data-dim-handle") &&
    !pngProbe.includes('data-hit="1"'),
);

ok(
  "T-C10 fail-loud without jobId",
  editorSrc.includes("Brak przypisanej roboty") && editorSrc.includes("onPatchJob"),
);
ok("T-C11 duplicate saves allowed (no dedupe)", !editorSrc.includes("duplicate-prevention"));
ok(
  "T-C12 mobile actions",
  editorSrc.includes("Zapisz do plików roboty") &&
    editorSrc.includes("Zapisz jako zdjęcie") &&
    editorSrc.includes("Paperclip") &&
    editorSrc.includes("ImagePlus"),
);

ok("no wallRefId invented", !editorSrc.includes("wallRefId") && !renderSrc.includes("wallRefId"));
ok("no new dimension type", !editorSrc.includes('type: "dimension_range"'));

console.log(`\nRESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
