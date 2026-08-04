/**
 * WM-RYSUNKI-01 P3B.1 — Continuous Drawing UX Fix
 * Run: npx vite-node scripts/test-wm-rysunki-01-p3b1.mjs
 *
 * Kontrakt: po wall SUCCESS → clearWallPreview (idle) · tool wall sticky (UI).
 * Model/PDF/schema — bez zmian vs P3B.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DRAWING_SCHEMA_VERSION,
  DRAWING_SYMBOL_LIBRARY_VERSION,
} from "../src/lib/wm-technical-drawings/types.ts";
import { DRAWING_RENDER_VERSION, renderDrawingSvg } from "../src/lib/wm-technical-drawings/render-svg.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

console.log("WM-RYSUNKI-01 P3B.1 — test-wm-rysunki-01-p3b1\n");

assert("T01 schemaVersion 1", DRAWING_SCHEMA_VERSION === 1);
assert("T02 library 3", DRAWING_SYMBOL_LIBRARY_VERSION === 3);
assert("T03 render 3", DRAWING_RENDER_VERSION === 3);

const editorSrc = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");

assert(
  "T04 no setLineStart(end) after wall (P3B chain removed)",
  !/type === "wall"[\s\S]{0,120}setLineStart\(end\)/.test(editorSrc) &&
    !editorSrc.includes("setLineStart(end)"),
);

assert(
  "T05 finishLine SUCCESS uses clearWallPreview",
  editorSrc.includes("clearWallPreview()") &&
    /commit\(touchDrawing[\s\S]{0,200}clearWallPreview\(\)/.test(editorSrc),
);

assert(
  "T06 no setTool after finishLine wall path",
  !/finishLine[\s\S]{0,800}setTool\(/.test(editorSrc.split("const finishLine")[1]?.slice(0, 900) || ""),
);

assert(
  "T07 setSelectedId retained after commit",
  /commit\(touchDrawing[\s\S]{0,80}setSelectedId\(obj\.id\)/.test(editorSrc),
);

assert(
  "T08 wall hint Esc anuluje podgląd (nie łańcuch)",
  editorSrc.includes("Esc anuluje podgląd") &&
    !editorSrc.includes("Esc = koniec rysowania ścian"),
);

const guideSrc = readFileSync(join(root, "src/app/GuideView.tsx"), "utf8");
assert(
  "T09 Guide: no continuous chain copy",
  !guideSrc.includes("kolejne odcinki od ostatniego punktu") &&
    guideSrc.includes("kolejna ściana od nowego pierwszego kliknięcia"),
);

assert(
  "T10 changelog tip 2.66.03",
  readFileSync(join(root, "src/app/changelog-data.ts"), "utf8").includes('version: "2.66.03"'),
);

/* Idle derive: bez lineStart → brak Ghost (kontrakt AC-P3B1-01/03) */
const base = buildDrawingFromTemplate("blank", {
  jobId: "job-p3b1",
  title: "P3B.1",
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
const svgIdle = renderDrawingSvg(withWall);
assert("T11 idle SVG no ghost", !svgIdle.includes("data-ghost-wall"));

const svgGhost = renderDrawingSvg(withWall, {
  mode: "edit",
  previewWall: {
    x1: 100,
    y1: 0,
    x2: 180,
    y2: 0,
    lengthLabel: "80 px",
  },
});
assert("T12 mid-draw ghost still works", svgGhost.includes("data-ghost-wall"));

/* DFC-P1-01 — ghost OUT export even if previewWall passed */
const svgGhostExport = renderDrawingSvg(withWall, {
  mode: "export",
  previewWall: {
    x1: 100,
    y1: 0,
    x2: 180,
    y2: 0,
    lengthLabel: "80 px",
  },
});
assert("T12b ghost OUT export", !svgGhostExport.includes("data-ghost-wall"));

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
assert("T13 model still N walls (not polyline)", two.objects.filter((o) => o.type === "wall").length === 2);

const parsed = parseWmTechnicalDrawing(two);
assert("T14 parse schema 1", parsed?.schemaVersion === 1);

console.log(`\nP3B.1 result: ${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
