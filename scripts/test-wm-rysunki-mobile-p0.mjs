/**
 * WM-RYSUNKI-MOBILE-01 P0 — smoke (static + viewport helper)
 * Run: npx vite-node scripts/test-wm-rysunki-mobile-p0.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clampDrawingPan,
  clampDrawingZoom,
  DRAWING_ZOOM_DEFAULT,
  DRAWING_ZOOM_MAX,
  DRAWING_ZOOM_MIN,
  nextZoomIn,
  nextZoomOut,
} from "../src/lib/wm-technical-drawings/drawing-viewport.ts";

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

console.log("WM-RYSUNKI-MOBILE-01 P0 — test-wm-rysunki-mobile-p0\n");

assert("T01 zoom default 1", DRAWING_ZOOM_DEFAULT === 1);
assert("T02 clamp high", clampDrawingZoom(99) === DRAWING_ZOOM_MAX);
assert("T03 clamp low", clampDrawingZoom(0.01) === DRAWING_ZOOM_MIN);
assert("T04 clamp nan", clampDrawingZoom(Number.NaN) === DRAWING_ZOOM_DEFAULT);
assert("T05 zoom in", nextZoomIn(1) > 1 && nextZoomIn(1) <= DRAWING_ZOOM_MAX);
assert("T06 zoom out", nextZoomOut(1) < 1 && nextZoomOut(1) >= DRAWING_ZOOM_MIN);
assert("T07 pan clamp", Math.abs(clampDrawingPan(99999, 320, 1)) < 99999);

const panel = readFileSync(join(root, "src/app/WmPrintDrawingsPanel.tsx"), "utf8");
assert("T08 createPortal", panel.includes("createPortal"));
assert("T09 document.body", panel.includes("document.body"));
assert("T10 modal-overlay", panel.includes("modal-overlay"));
assert("T11 modal-lightbox", panel.includes("modal-lightbox"));
assert("T12 NOT modal-sheet root", !/className=\"[^\"]*modal-sheet[^\"]*modal-overlay/.test(panel));
assert("T13 useModalScrollLock", panel.includes("useModalScrollLock"));
assert("T14 app-height", panel.includes("--app-height"));
assert("T15 data-testid fs", panel.includes('data-testid="wm-drawing-fs"'));
assert("T16 matchMedia 767", panel.includes("max-width: 767px"));

const editor = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
assert("T17 wm-drawing-surface", editor.includes("wm-drawing-surface"));
assert("T18 setPointerCapture", editor.includes("setPointerCapture"));
assert("T19 onPointerCancel", editor.includes("onPointerCancel"));
assert("T20 leave no onPointerUp", !/onPointerLeave=\{ \(\) => \{\s*setHoverWallId\(null\);\s*onPointerUp\(\);/.test(editor));
assert("T21 mobileFullscreen prop", editor.includes("mobileFullscreen"));
assert("T22 viewScale ephemeral", editor.includes("viewScale") && editor.includes("viewPan"));
assert("T23 no leave-commit pattern", !editor.includes("onPointerLeave={() => {\n          setHoverWallId(null);\n          onPointerUp();"));

const css = readFileSync(join(root, "src/styles/mobile.css"), "utf8");
assert("T24 css touch-action none", css.includes(".wm-drawing-surface") && css.includes("touch-action: none"));

const cl = readFileSync(join(root, "src/app/changelog-data.ts"), "utf8");
assert("T25 changelog 2.66.04", cl.includes('version: "2.66.04"'));

/* Ghost / P3B.1 regression markers still present */
assert("T26 clearWallPreview still used", editor.includes("clearWallPreview"));
assert("T27 finishLine wall path", editor.includes('finishLine("wall"') || editor.includes("finishLine(tool, lineStart"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
