/**
 * WM-RYSUNKI-TEXT-ERASER-UX-01 — harness T-T / T-E / T-M
 * Run: npx vite-node scripts/test-wm-rysunki-text-eraser-ux-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DrawingUndoStack } from "../src/lib/wm-technical-drawings/undo.ts";
import { renderDrawingSvg } from "../src/lib/wm-technical-drawings/render-svg.ts";
import { parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import {
  DRAWING_SCHEMA_VERSION,
  TEXT_DEFAULT_FONT_SIZE,
} from "../src/lib/wm-technical-drawings/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const editorSrc = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
const exportPdfSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/export-pdf.ts"), "utf8");
const zipSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/zip-entries.ts"), "utf8");

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

console.log("=== WM-RYSUNKI-TEXT-ERASER-UX-01 ===");

ok("schemaVersion still 1", DRAWING_SCHEMA_VERSION === 1);
ok("TEXT_DEFAULT_FONT_SIZE 14", TEXT_DEFAULT_FONT_SIZE === 14);

const blank = buildDrawingFromTemplate("blank", { jobId: "text-eraser", address: "Test" });

function mkText(partial) {
  return {
    id: partial.id,
    type: "text",
    x: partial.x ?? 40,
    y: partial.y ?? 40,
    content: partial.content ?? "Tekst",
    symbolId: "text-label",
    ...(partial.fontSize != null ? { fontSize: partial.fontSize } : {}),
    ...(partial.fontWeight ? { fontWeight: partial.fontWeight } : {}),
    ...(partial.locked ? { locked: true } : {}),
  };
}

/** Eraser domain path — same filter+commit semantics as editor (no second engine). */
function eraseById(drawing, id) {
  const obj = drawing.objects.find((o) => o.id === id);
  if (!obj) return { drawing, committed: false, reason: "missing" };
  if (obj.locked === true) return { drawing, committed: false, reason: "locked" };
  return {
    drawing: touchDrawing(drawing, { objects: drawing.objects.filter((o) => o.id !== id) }),
    committed: true,
    reason: "ok",
  };
}

/* --- TEXT --- */
const multi = touchDrawing(blank, {
  objects: [
    mkText({ id: "t1", x: 10, y: 20, content: "A", fontSize: 12 }),
    mkText({ id: "t2", x: 50, y: 60, content: "B", fontSize: 24, fontWeight: "bold" }),
    mkText({ id: "t3", x: 90, y: 100, content: "C" }),
  ],
});
ok("T-T1 multiple text objects", multi.objects.filter((o) => o.type === "text").length === 3);

ok(
  "T-T2 click placement (snapPlace + dialog in editor)",
  editorSrc.includes("snapPlace") &&
    editorSrc.includes('tool === "text"') &&
    editorSrc.includes('kind: "text"') &&
    editorSrc.includes("setInputDialog"),
);

const svg12 = renderDrawingSvg(
  touchDrawing(blank, { objects: [mkText({ id: "s12", content: "S12", fontSize: 12 })] }),
);
ok("T-T3 font size 12", svg12.includes('font-size="12"') && svg12.includes(">S12</text>"));

const svg24 = renderDrawingSvg(
  touchDrawing(blank, { objects: [mkText({ id: "s24", content: "S24", fontSize: 24 })] }),
);
ok("T-T4 font size 24", svg24.includes('font-size="24"') && svg24.includes(">S24</text>"));

const svgBold = renderDrawingSvg(
  touchDrawing(blank, {
    objects: [mkText({ id: "sb", content: "Bold", fontSize: 14, fontWeight: "bold" })],
  }),
);
ok("T-T5 bold", svgBold.includes('font-weight="bold"') && svgBold.includes(">Bold</text>"));

const svgNormalOmit = renderDrawingSvg(
  touchDrawing(blank, { objects: [mkText({ id: "sn", content: "Norm", fontSize: 14 })] }),
);
ok(
  "T-T6 normal (omit fontWeight)",
  svgNormalOmit.includes(">Norm</text>") && !svgNormalOmit.includes('font-weight="'),
);

const svgIndep = renderDrawingSvg(multi);
ok(
  "T-T7 independent styles",
  svgIndep.includes('font-size="12"') &&
    svgIndep.includes('font-size="24"') &&
    svgIndep.includes('font-weight="bold"') &&
    (svgIndep.match(/data-id="t/g) || []).length >= 3,
);

const oldRaw = {
  ...blank,
  objects: [{ id: "old", type: "text", x: 5, y: 5, content: "Legacy", symbolId: "text-label" }],
};
const oldParsed = parseWmTechnicalDrawing(oldRaw);
ok("T-T8a old text parse ok", oldParsed != null && oldParsed.schemaVersion === 1);
const oldObj = oldParsed.objects.find((o) => o.id === "old");
ok("T-T8b old text no fontWeight field", oldObj && oldObj.type === "text" && oldObj.fontWeight == null);
const oldSvg = renderDrawingSvg(oldParsed);
ok(
  "T-T8c old text renders without bold attr",
  oldSvg.includes(">Legacy</text>") && !oldSvg.includes('font-weight="'),
);

const boldNorm = parseWmTechnicalDrawing({
  ...blank,
  objects: [
    { id: "b1", type: "text", x: 1, y: 1, content: "X", fontWeight: "bold" },
    { id: "n1", type: "text", x: 2, y: 2, content: "Y", fontWeight: "normal" },
    { id: "bad", type: "text", x: 3, y: 3, content: "Z", fontWeight: "heavy" },
  ],
});
ok(
  "T-T8d normalize bold keep / normal+invalid omit",
  boldNorm.objects.find((o) => o.id === "b1")?.fontWeight === "bold" &&
    boldNorm.objects.find((o) => o.id === "n1")?.fontWeight == null &&
    boldNorm.objects.find((o) => o.id === "bad")?.fontWeight == null,
);

const pdfSvg = renderDrawingSvg(
  touchDrawing(blank, {
    objects: [mkText({ id: "pdf", content: "PDF", fontSize: 18, fontWeight: "bold" })],
  }),
  { mode: "export", showGrid: false },
);
ok(
  "T-T9 PDF path = renderDrawingSvg export",
  exportPdfSrc.includes("renderDrawingSvg") &&
    pdfSvg.includes('data-render-mode="export"') &&
    pdfSvg.includes('font-size="18"') &&
    pdfSvg.includes('font-weight="bold"'),
);

ok(
  "T-T10 ZIP uses export-pdf (same SVG SSOT) · no zip API change",
  zipSrc.includes("generateDrawingPdf") &&
    !zipSrc.includes("fontWeight") &&
    pdfSvg.includes(">PDF</text>"),
);

const stackTxt = new DrawingUndoStack(blank);
const withTxt = touchDrawing(stackTxt.getCurrent(), {
  objects: [mkText({ id: "u1", content: "UndoMe", fontSize: 12, fontWeight: "bold" })],
});
stackTxt.push(withTxt);
ok("T-T11a text committed", stackTxt.getCurrent().objects.some((o) => o.id === "u1"));
stackTxt.undo();
ok("T-T11b undo restores pre-text", !stackTxt.getCurrent().objects.some((o) => o.id === "u1"));

ok(
  "T-T session UI + keep Text tool",
  editorSrc.includes("textFontSize") &&
    editorSrc.includes("textBold") &&
    editorSrc.includes("TEXT_DEFAULT_FONT_SIZE") &&
    editorSrc.includes("Pogrubienie") &&
    editorSrc.includes("Rozmiar czcionki") &&
    editorSrc.includes("tool remains \"text\"") &&
    !/setTool\(\s*[\"']select[\"']\s*\)/.test(
      editorSrc.slice(editorSrc.indexOf("confirmInputDialog"), editorSrc.indexOf("confirmInputDialog") + 800),
    ),
);

/* --- ERASER --- */
function baseObjs() {
  return [
    { id: "w1", type: "wall", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 4, symbolId: "wall-default" },
    { id: "d1", type: "door", x: 50, y: 0, symbolId: "door-room" },
    { id: "win1", type: "window", x: 80, y: 0, symbolId: "window-rect" },
    mkText({ id: "tx1", content: "E", fontSize: 14 }),
    {
      id: "dim1",
      type: "dimension",
      x1: 0,
      y1: 40,
      x2: 60,
      y2: 40,
      label: "60",
      symbolId: "dimension-line",
    },
    { id: "v1", type: "ventilation", x: 20, y: 80, symbolId: "vent-grid" },
    { id: "lock1", type: "wall", x1: 0, y1: 200, x2: 40, y2: 200, thickness: 4, symbolId: "wall-default", locked: true },
  ];
}

let scene = touchDrawing(blank, { objects: baseObjs() });
ok("T-E1 wall", eraseById(scene, "w1").committed && !eraseById(scene, "w1").drawing.objects.some((o) => o.id === "w1"));
ok("T-E2 door", eraseById(scene, "d1").committed && !eraseById(scene, "d1").drawing.objects.some((o) => o.id === "d1"));
ok("T-E3 window", eraseById(scene, "win1").committed);
ok("T-E4 text", eraseById(scene, "tx1").committed);
ok("T-E5 dimension", eraseById(scene, "dim1").committed);
ok("T-E6 symbol (ventilation)", eraseById(scene, "v1").committed);

const one = eraseById(scene, "w1");
ok(
  "T-E7 exactly one object",
  one.committed &&
    one.drawing.objects.length === scene.objects.length - 1 &&
    one.drawing.objects.every((o) => o.id !== "w1") &&
    one.drawing.objects.some((o) => o.id === "d1"),
);

const overlapSvg = renderDrawingSvg(scene, { mode: "edit" });
const idOrder = [...overlapSvg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
ok(
  "T-E8 topmost = DOM/render order (array order preserved)",
  idOrder.includes("w1") &&
    idOrder.includes("v1") &&
    idOrder.indexOf("w1") < idOrder.indexOf("v1") &&
    !editorSrc.includes("zIndex") /* editor does not invent zIndex sort for eraser */,
);

const stackE = new DrawingUndoStack(scene);
const erased = eraseById(stackE.getCurrent(), "tx1");
ok("T-E9a erase commit", erased.committed);
stackE.push(erased.drawing);
ok("T-E9b gone", !stackE.getCurrent().objects.some((o) => o.id === "tx1"));
stackE.undo();
ok("T-E9c undo restore", stackE.getCurrent().objects.some((o) => o.id === "tx1"));

let cur = scene;
const r1 = eraseById(cur, "w1");
cur = r1.drawing;
const r2 = eraseById(cur, "d1");
cur = r2.drawing;
ok(
  "T-E10 repeated eraser",
  r1.committed &&
    r2.committed &&
    !cur.objects.some((o) => o.id === "w1") &&
    !cur.objects.some((o) => o.id === "d1") &&
    editorSrc.includes('tool === "eraser"') &&
    !/setTool\(\s*[\"']select[\"']\s*\)/.test(
      editorSrc.slice(editorSrc.indexOf('tool === "eraser"'), editorSrc.indexOf('tool === "eraser"') + 600),
    ),
);

ok(
  "T-E11 ESC/tool exit contract",
  editorSrc.includes('if (e.key === "Escape") setInputDialog(null)') &&
    editorSrc.includes('toolBtn("select"') &&
    (editorSrc.includes('"Wybierz"') || editorSrc.includes('"Zaznacz"')) &&
    editorSrc.includes('toolBtn("eraser", "Gumka"'),
);

const lockHit = eraseById(scene, "lock1");
ok("T-E12 locked object NOT deleted", !lockHit.committed && lockHit.reason === "locked");
ok(
  "T-E12b still present",
  lockHit.drawing.objects.some((o) => o.id === "lock1" && o.locked === true),
);

const stackLock = new DrawingUndoStack(scene);
const beforePast = stackLock.canUndo();
const lockRes = eraseById(stackLock.getCurrent(), "lock1");
ok("T-E13a locked no commit payload", !lockRes.committed);
if (lockRes.committed) stackLock.push(lockRes.drawing);
ok(
  "T-E13b locked click creates NO undo frame",
  !lockRes.committed && stackLock.canUndo() === beforePast,
);
ok(
  "T-E13c editor skips locked before commit",
  editorSrc.includes("obj.locked === true") &&
    editorSrc.includes('tool === "eraser"') &&
    /if \(obj\.locked === true\) return;/.test(
      editorSrc.slice(editorSrc.indexOf('tool === "eraser"'), editorSrc.indexOf('tool === "eraser"') + 500),
    ),
);

/* --- MOBILE --- */
ok(
  "T-M1 text placement shared (no mobile fork)",
  editorSrc.includes("mobileFullscreen") &&
    editorSrc.includes('toolBtn("text", "Tekst"') &&
    editorSrc.includes('tool === "text"'),
);
ok(
  "T-M2 eraser on mobile toolbar",
  editorSrc.includes('toolBtn("eraser", "Gumka", <Eraser size={18}') &&
    editorSrc.includes('toolBtn("eraser", "Gumka", <Eraser size={14}'),
);
const renderSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/render-svg.ts"), "utf8");
ok(
  "T-M3 no mobile architecture / hitbox bump · r=22 SSOT",
  !editorSrc.includes("hitbox") &&
    editorSrc.includes("closest?.(\"[data-id]\")") &&
    renderSrc.includes("DRAWING_HIT_POINT_RADIUS_SVG = 22"),
);

console.log(`\nRESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
