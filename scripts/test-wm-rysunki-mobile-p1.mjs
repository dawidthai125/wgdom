/**
 * WM-RYSUNKI-MOBILE-01 P1 — smoke (render mode + chrome/prompt markers)
 * Run: npx vite-node scripts/test-wm-rysunki-mobile-p1.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DRAWING_HIT_LINE_WIDTH_SVG,
  DRAWING_HIT_POINT_RADIUS_SVG,
  renderDrawingSvg,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";

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

console.log("WM-RYSUNKI-MOBILE-01 P1 — test-wm-rysunki-mobile-p1\n");

const drawing = buildDrawingFromTemplate("blank", {
  jobId: "job-test",
  address: "Test 1",
});
drawing.objects = [
  ...drawing.objects,
  {
    id: "wall-1",
    type: "wall",
    x1: 40,
    y1: 40,
    x2: 200,
    y2: 40,
    thickness: 4,
    symbolId: "wall-default",
  },
  {
    id: "txt-1",
    type: "text",
    x: 80,
    y: 80,
    content: "A",
    fontSize: 14,
    symbolId: "text-label",
  },
];

const editSvg = renderDrawingSvg(drawing, { mode: "edit", showGrid: false });
const exportSvg = renderDrawingSvg(drawing, { mode: "export", showGrid: false });
const defaultSvg = renderDrawingSvg(drawing, { showGrid: false });

assert("T01 edit has data-hit", editSvg.includes('data-hit="1"'));
assert("T02 edit has hit-layer", editSvg.includes('data-hit-layer="1"'));
assert("T03 edit data-render-mode", editSvg.includes('data-render-mode="edit"'));
assert("T04 export no data-hit", !exportSvg.includes('data-hit="1"'));
assert("T05 export mode attr", exportSvg.includes('data-render-mode="export"'));
assert("T06 default = export (DFC-P1-01)", !defaultSvg.includes('data-hit="1"'));
assert("T07 default mode attr export", defaultSvg.includes('data-render-mode="export"'));
assert("T08 hit line width SVG units", DRAWING_HIT_LINE_WIDTH_SVG === 24);
assert("T09 hit point radius SVG units", DRAWING_HIT_POINT_RADIUS_SVG === 22);
assert("T10 edit hit uses SVG width const", editSvg.includes(`stroke-width="${DRAWING_HIT_LINE_WIDTH_SVG}"`));

const editor = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
assert("T11 editor mode edit", editor.includes('mode: "edit"'));
assert("T12 no window.prompt call", !/window\.prompt\s*\(/.test(editor));
assert("T13 inputDialog state", editor.includes("inputDialog"));
assert("T14 touch-target tools", editor.includes("touch-target"));
assert("T15 clientToSvgPoint REUSE", editor.includes("clientToSvgPoint") && editor.includes("getScreenCTM"));
assert("T16 mobile toolbar scroll", editor.includes("overflow-x-auto"));

const panel = readFileSync(join(root, "src/app/WmPrintDrawingsPanel.tsx"), "utf8");
assert("T17 panel touch-target chrome", panel.includes("touch-target"));
assert("T18 create menu portal sheet", panel.includes("aria-label=\"Nowy rysunek\""));
assert("T19 create outside close", panel.includes("setShowCreateMenu(false)"));
assert("T20 no absolute create dropdown", !panel.includes("absolute right-0 z-20 mt-1 w-72"));

const exportPdf = readFileSync(join(root, "src/lib/wm-technical-drawings/export-pdf.ts"), "utf8");
assert("T21 pdf mode export", exportPdf.includes('mode: "export"'));

const cl = readFileSync(join(root, "src/app/changelog-data.ts"), "utf8");
assert("T22 changelog 2.66.05", cl.includes('version: "2.66.05"'));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
