/**
 * WM-SCHEMATY-V1 Faza 2B — export PDF smoke (SVG → raster @2× → pdf-lib A4 landscape).
 * Uruchom: npx vite-node scripts/test-schematic-pdf-smoke.mjs
 */
import { PDFDocument } from "pdf-lib";
import {
  generateSchematicPdf,
  inspectSchematicPdfBytes,
  schematicPdfFileName,
  SCHEMATIC_PDF_A4_LANDSCAPE,
} from "../src/lib/electrical-schematics/export-pdf.ts";
import { apartment1fLayoutMeta } from "../src/lib/electrical-schematics/layout/apartment-1f-v1.ts";
import { renderSchematicSvg } from "../src/lib/electrical-schematics/render-svg.ts";
import {
  rasterizeSchematicSvgToPngPlaywright,
  SCHEMATIC_DRAFT_WATERMARK_TEXT,
} from "../src/lib/electrical-schematics/render/svg-raster.ts";
import { touchSchematic } from "../src/lib/electrical-schematics/report.ts";
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";
import { APARTMENT_1F_VIEWBOX } from "../src/lib/electrical-schematics/layout/apartment-1f-v1.ts";
import { APARTMENT_3F_VIEWBOX } from "../src/lib/electrical-schematics/layout/apartment-3f-v1.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const rasterize = (svg, width, height, status) =>
  rasterizeSchematicSvgToPngPlaywright(svg, width, height, status);

function build1fDiagram() {
  return buildSchematicFromTemplate("template-apartment-1f-default", {
    diagramId: "pdf-smoke-1f",
    address: "WROCŁAW, UL. ŻYTNIA 18/21",
    documentDate: "2026-06-24",
  });
}

function build3fDiagram() {
  return buildSchematicFromTemplate("template-apartment-3f-default", {
    diagramId: "pdf-smoke-3f",
    address: "WROCŁAW, UL. BENEDYKTYŃSKA 22/13",
    documentDate: "2026-06-24",
  });
}

console.log("=== P01 — render apartment-1f-v1 (4 obwody) ===");
{
  const d = build1fDiagram();
  const meta = apartment1fLayoutMeta(d);
  assert(meta.circuitCount === 4, "P01 four circuits");
  const svg = renderSchematicSvg(d);
  assert(svg.includes("1F"), "P01 meter 1F");
  assert(svg.includes("L, N, PE"), "P01 bus label");
  // V1A: etykieta RCD wieloliniowa (25A / 30mA / 2P / AC)
  assert(
    svg.includes("25A") && svg.includes("30mA") && svg.includes("2P") && svg.includes("AC"),
    "P01 RCD 2P",
  );
  assert(!svg.includes("FR 100A"), "P01 no FR default");
}

console.log("\n=== P02 — nazwa pliku PDF (§ J) ===");
{
  const name = schematicPdfFileName("WROCŁAW, UL. BENEDYKTYŃSKA 22/13", "2026-06-24");
  assert(
    name === "SCHEMAT_WROC_AW_UL_BENEDYKTYNSKA_22_13_2026-06-24.pdf",
    `P02 filename: ${name}`,
  );
}

console.log("\n=== P03 — generacja PDF draft (1F) bez wyjątku ===");
let draftPdfBytes = null;
{
  const d = touchSchematic(build1fDiagram(), { status: "draft" });
  let err = null;
  try {
    const out = await generateSchematicPdf(d, { rasterize });
    draftPdfBytes = out.bytes;
    assert(out.fileName.endsWith(".pdf"), "P03 .pdf extension");
  } catch (e) {
    err = e;
    console.error(e);
  }
  assert(!err, "P03 no throw");
  assert(draftPdfBytes && draftPdfBytes.length > 2000, "P03 pdf size");
  const head = new TextDecoder().decode(draftPdfBytes.slice(0, 5));
  assert(head === "%PDF-", "P03 PDF header");
}

console.log("\n=== P04 — generacja PDF final (3F) bez wyjątku ===");
let finalPdfBytes = null;
{
  const d = touchSchematic(build3fDiagram(), { status: "final" });
  let err = null;
  try {
    const out = await generateSchematicPdf(d, { rasterize });
    finalPdfBytes = out.bytes;
  } catch (e) {
    err = e;
    console.error(e);
  }
  assert(!err, "P04 no throw");
  assert(finalPdfBytes && finalPdfBytes.length > 2000, "P04 pdf size");
}

console.log("\n=== P05 — PDF A4 landscape (pdf-lib) ===");
{
  const info = await inspectSchematicPdfBytes(draftPdfBytes);
  assert(info.pageCount === 1, "P05 one page");
  assert(info.isLandscape, "P05 landscape");
  assert(Math.abs(info.width - SCHEMATIC_PDF_A4_LANDSCAPE.width) < 2, `P05 width ~842 (${info.width})`);
  assert(Math.abs(info.height - SCHEMATIC_PDF_A4_LANDSCAPE.height) < 2, `P05 height ~595 (${info.height})`);
  const doc = await PDFDocument.load(draftPdfBytes, { ignoreEncryption: true });
  assert(doc.getPageCount() === 1, "P05 PDFDocument.load");
}

console.log("\n=== P06 — watermark draft vs brak final (raster) ===");
{
  const base = build1fDiagram();
  const svg = renderSchematicSvg(base);
  const { width, height } = APARTMENT_1F_VIEWBOX;
  const draftPng = await rasterize(svg, width, height, "draft");
  const finalPng = await rasterize(svg, width, height, "final");
  assert(draftPng.length > 100, "P06 draft png");
  assert(finalPng.length > 100, "P06 final png");
  assert(!bytesEqual(draftPng, finalPng), "P06 draft raster differs from final (watermark)");
  assert(SCHEMATIC_DRAFT_WATERMARK_TEXT === "WERSJA ROBOCZA", "P06 watermark text constant");
}

console.log("\n=== P07 — watermark tylko draft PDF (raster diff 3F) ===");
{
  const d = build3fDiagram();
  const svg = renderSchematicSvg(d);
  const { width, height } = APARTMENT_3F_VIEWBOX;
  const draftPng = await rasterize(svg, width, height, "draft");
  const finalPng = await rasterize(svg, width, height, "final");
  assert(!bytesEqual(draftPng, finalPng), "P07 3F draft vs final raster");
}

console.log(`\n=== WYNIK: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
console.log("PDF SMOKE: PASS");
