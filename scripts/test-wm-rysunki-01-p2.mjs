/**
 * WM-RYSUNKI-01 P2 — PDF export
 * Run: npx vite-node scripts/test-wm-rysunki-01-p2.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DrawingPdfError,
  drawingPdfFileName,
  generateDrawingPdf,
  inspectDrawingPdfBytes,
} from "../src/lib/wm-technical-drawings/export-pdf.ts";
import { renderDrawingSvg } from "../src/lib/wm-technical-drawings/render-svg.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { DRAWING_PAGE_SIZE_PX } from "../src/lib/wm-technical-drawings/types.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { WM_DRUK_AUDIT_ACTION_LABEL_PL } from "../src/lib/wm-druk-audit.ts";

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

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

/** Minimal 1×1 PNG — wystarczy do embedPng (page size z modelu). */
const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

const fakeRaster = async () => TINY_PNG;

function sampleDrawing(overrides = {}) {
  const base = buildDrawingFromTemplate("blank", {
    jobId: "job-1",
    address: "ul. Testowa 1",
  });
  return touchDrawing(base, {
    documentDate: "2026-08-03",
    title: "Rzut testowy",
    objects: [
      {
        id: "w1",
        type: "wall",
        x1: 40,
        y1: 40,
        x2: 200,
        y2: 40,
        thickness: 4,
      },
    ],
    ...overrides,
  });
}

console.log("WM-RYSUNKI-01 P2 — test-wm-rysunki-01-p2\n");

// --- filename ---
{
  const d = sampleDrawing();
  const name = drawingPdfFileName(d, "Robot #018 Test");
  assert("T01 filename prefix RYSUNEK_", name.startsWith("RYSUNEK_"));
  assert("T02 filename ends pdf", name.endsWith(".pdf"));
  assert("T03 filename has date", name.includes("2026-08-03"));
}

// --- jobLabel required ---
{
  let threw = false;
  try {
    await generateDrawingPdf(sampleDrawing(), { jobLabel: "   ", rasterize: fakeRaster });
  } catch (e) {
    threw = e instanceof DrawingPdfError && /jobLabel/i.test(e.message);
  }
  assert("T04 empty jobLabel → DrawingPdfError", threw);
}

// --- SVG SSOT no grid ---
{
  const d = sampleDrawing({
    grid: { enabled: true, step: 10, snap: true },
  });
  const svgEdit = renderDrawingSvg(d, { showGrid: true });
  const svgPdf = renderDrawingSvg(d, { showGrid: false });
  assert("T05 editor grid present", svgEdit.includes('data-grid="1"'));
  assert("T06 pdf path no grid", !svgPdf.includes('data-grid="1"'));
}

// --- generate A4 landscape ---
{
  const d = sampleDrawing();
  const bytes = await generateDrawingPdf(d, {
    jobLabel: "Robot #018",
    rasterize: fakeRaster,
  });
  assert("T07 bytes non-empty", bytes.byteLength > 100);
  const info = await inspectDrawingPdfBytes(bytes);
  assert("T08 pageCount 1", info.pageCount === 1);
  const sz = DRAWING_PAGE_SIZE_PX.A4.landscape;
  assert("T09 A4 landscape W", Math.abs(info.width - sz.width) < 0.5);
  assert("T10 A4 landscape H", Math.abs(info.height - sz.height) < 0.5);
  const text = Buffer.from(bytes).toString("latin1");
  assert("T11 no watermark string", !text.includes("WERSJA ROBOCZA"));
}

// --- A4 portrait / A3 ---
{
  const portrait = sampleDrawing({
    page: {
      format: "A4",
      orientation: "portrait",
      ...DRAWING_PAGE_SIZE_PX.A4.portrait,
    },
  });
  const b1 = await generateDrawingPdf(portrait, { jobLabel: "Bez roboty", rasterize: fakeRaster });
  const i1 = await inspectDrawingPdfBytes(b1);
  assert(
    "T12 A4 portrait",
    Math.abs(i1.width - 595) < 0.5 && Math.abs(i1.height - 842) < 0.5,
  );

  const a3 = sampleDrawing({
    page: {
      format: "A3",
      orientation: "landscape",
      ...DRAWING_PAGE_SIZE_PX.A3.landscape,
    },
  });
  const b2 = await generateDrawingPdf(a3, { jobLabel: "A3 job", rasterize: fakeRaster });
  const i2 = await inspectDrawingPdfBytes(b2);
  const a3sz = DRAWING_PAGE_SIZE_PX.A3.landscape;
  assert(
    "T13 A3 landscape",
    Math.abs(i2.width - a3sz.width) < 0.5 && Math.abs(i2.height - a3sz.height) < 0.5,
  );

  const a3p = sampleDrawing({
    page: {
      format: "A3",
      orientation: "portrait",
      ...DRAWING_PAGE_SIZE_PX.A3.portrait,
    },
  });
  const b3 = await generateDrawingPdf(a3p, { jobLabel: "A3P", rasterize: fakeRaster });
  const i3 = await inspectDrawingPdfBytes(b3);
  const a3psz = DRAWING_PAGE_SIZE_PX.A3.portrait;
  assert(
    "T14 A3 portrait",
    Math.abs(i3.width - a3psz.width) < 0.5 && Math.abs(i3.height - a3psz.height) < 0.5,
  );
}

// --- determinism layout (same input → same page size; content chrome) ---
{
  const d = sampleDrawing();
  const a = await generateDrawingPdf(d, { jobLabel: "Same Job", rasterize: fakeRaster });
  const b = await generateDrawingPdf(d, { jobLabel: "Same Job", rasterize: fakeRaster });
  const ia = await inspectDrawingPdfBytes(a);
  const ib = await inspectDrawingPdfBytes(b);
  assert("T15 deterministic page size", ia.width === ib.width && ia.height === ib.height);
  assert("T16 deterministic byteLength", a.byteLength === b.byteLength);
}

// --- audit label ---
assert(
  "T17 audit label drawing_pdf_exported",
  WM_DRUK_AUDIT_ACTION_LABEL_PL.drawing_pdf_exported === "Eksport PDF rysunku",
);

// --- source contracts ---
{
  const exportSrc = readSrc("src/lib/wm-technical-drawings/export-pdf.ts");
  const rasterSrc = readSrc("src/lib/wm-technical-drawings/svg-raster.ts");
  const editorSrc = readSrc("src/app/WmPrintDrawingEditor.tsx");
  assert("T18 renderDrawingSvg in export", exportSrc.includes("renderDrawingSvg"));
  assert("T19 showGrid false", exportSrc.includes("showGrid: false"));
  assert("T20 no watermark in raster", !rasterSrc.includes("WERSJA ROBOCZA"));
  assert("T21 jobLabel required opts", exportSrc.includes("jobLabel"));
  assert("T22 DrawingPdfError", exportSrc.includes("class DrawingPdfError"));
  assert("T23 editor preview", editorSrc.includes('runPdfAction("preview")'));
  assert("T24 editor download", editorSrc.includes('runPdfAction("download")'));
  assert("T25 editor print", editorSrc.includes('runPdfAction("print")'));
  assert("T26 session cache fingerprint", editorSrc.includes("pdfSessionRef"));
  assert("T27 changelog 2.65.99", readSrc("src/app/changelog-data.ts").includes("2.65.99"));
  assert(
    "T28 no zip in export-pdf",
    !exportSrc.toLowerCase().includes("includeDrawings") && !exportSrc.includes("generate-zip"),
  );
}

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
