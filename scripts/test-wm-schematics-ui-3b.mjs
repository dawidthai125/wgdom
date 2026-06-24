/**
 * WM-SCHEMATY-V1 Faza 3B — UI MVP smoke (lista, CRUD, render, export).
 * Uruchom: npx vite-node scripts/test-wm-schematics-ui-3b.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { WM_PRINT_TABS } from "../src/lib/wm-print/wm-print-tabs.ts";
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";
import { importSchematicFromMeasurement } from "../src/lib/electrical-schematics/import-from-measurement.ts";
import { createEmptyElectricalMeasurement } from "../src/lib/electrical-measurements/report.ts";
import {
  duplicateSchematic,
  removeSchematic,
  touchSchematic,
  upsertSchematic,
} from "../src/lib/electrical-schematics/report.ts";
import { renderSchematicSvg } from "../src/lib/electrical-schematics/render-svg.ts";
import { generateSchematicPdf } from "../src/lib/electrical-schematics/export-pdf.ts";
import { rasterizeSchematicSvgToPngPlaywright } from "../src/lib/electrical-schematics/render/svg-raster.ts";
import { APARTMENT_1F_VIEWBOX } from "../src/lib/electrical-schematics/layout/apartment-1f-v1.ts";
import { SCHEMATIC_UI_START_TEMPLATE_IDS } from "../src/lib/electrical-schematics/schematic-ui-labels.ts";

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

const root = path.resolve(".");

console.log("=== U01 — zakładka Schematy (DESIGN FREEZE) ===");
{
  const keys = WM_PRINT_TABS.map((t) => t.key);
  assert(keys.includes("schematy"), "U01 schematy tab");
  assert(keys.indexOf("schematy") === 2, "U01 after pomiary");
  assert(keys.indexOf("katalog") === 3, "U01 before katalog");
  assert(keys.join(",") === "odbiory,pomiary,schematy,katalog,szablony,historia,ustawienia", "U01 tab order");
}

console.log("\n=== U02 — pliki UI ===");
{
  assert(fs.existsSync(path.join(root, "src/app/WmPrintSchematicsPanel.tsx")), "U02 panel");
  assert(fs.existsSync(path.join(root, "src/app/WmPrintSchematicEditor.tsx")), "U02 editor");
  const wm = fs.readFileSync(path.join(root, "src/app/WmPrintView.tsx"), "utf8");
  assert(wm.includes('tab === "schematy"'), "U02 WmPrintView tab");
  assert(wm.includes("WmPrintSchematicsPanel"), "U02 panel wired");
  const router = fs.readFileSync(path.join(root, "src/app/admin/AdminViewRouter.tsx"), "utf8");
  assert(router.includes("electricalSchematics"), "U02 router props");
  assert(router.includes("onCommitElectricalSchematics"), "U02 commit wired");
}

console.log("\n=== U03 — create from template ===");
let store = [];
{
  const d = buildSchematicFromTemplate("template-apartment-1f-default", {
    diagramId: "ui-3b-create",
    address: "TEST ADRES",
  });
  const { schematics } = upsertSchematic(store, d);
  store = schematics;
  assert(store.length === 1, "U03 created");
  assert(store[0].layoutProfile === "apartment-1f-v1", "U03 layout 1f");
  assert(SCHEMATIC_UI_START_TEMPLATE_IDS.length === 2, "U03 no commercial in UI templates");
}

console.log("\n=== U04 — create from measurement ===");
{
  let m = createEmptyElectricalMeasurement("job-ui-3b");
  m = { ...m, reportNumber: "RAP-UI-3B-2026", supplyType: "ydy-3x4" };
  const d = importSchematicFromMeasurement(m, { address: "UL. TEST 1" });
  const { schematics } = upsertSchematic(store, d);
  store = schematics;
  assert(store.length === 2, "U04 import added");
  assert(store.some((s) => s.linkStatus === "linked"), "U04 linked");
}

console.log("\n=== U05 — duplicate ===");
let duplicateId;
{
  const source = store.find((s) => s.circuits.length > 0) ?? store[0];
  const copy = duplicateSchematic(source, { address: "KOPIA" });
  duplicateId = copy.id;
  const { schematics } = upsertSchematic(store, copy);
  store = schematics;
  assert(store.length === 3, "U05 duplicate count");
  assert(copy.id !== source.id, "U05 new id");
  assert(copy.linkStatus === "manual", "U05 manual link");
}

console.log("\n=== U06 — delete ===");
{
  const { schematics } = removeSchematic(store, duplicateId);
  store = schematics;
  assert(store.length === 2, "U06 after delete");
  assert(!store.find((s) => s.id === duplicateId), "U06 removed");
}

console.log("\n=== U07 — render SVG ===");
{
  const base = store.find((s) => s.circuits.length > 0);
  assert(!!base, "U07 renderable schematic");
  const d = touchSchematic(base, { address: "WROCŁAW, UL. ŻYTNIA 18/21" });
  const svg = renderSchematicSvg(d);
  assert(svg.startsWith("<svg"), "U07 svg");
  assert(svg.includes("1F"), "U07 content");
}

console.log("\n=== U08 — export PDF (draft + final) ===");
{
  const rasterize = (svg, width, height, status) =>
    rasterizeSchematicSvgToPngPlaywright(svg, width, height, status);
  const renderable = store.find((s) => s.circuits.length > 0);
  assert(!!renderable, "U08 renderable schematic");
  const base = touchSchematic(renderable, {
    address: "WROCŁAW, UL. TEST 1/2",
    documentDate: "2026-06-24",
    status: "draft",
  });
  const draftPdf = await generateSchematicPdf(base, { rasterize });
  assert(draftPdf.bytes.length > 2000, "U08 draft pdf size");
  assert(draftPdf.fileName.endsWith(".pdf"), "U08 filename");
  const head = new TextDecoder().decode(draftPdf.bytes.slice(0, 5));
  assert(head === "%PDF-", "U08 PDF header");

  const final = touchSchematic(base, { status: "final" });
  const finalPdf = await generateSchematicPdf(final, { rasterize });
  assert(finalPdf.bytes.length > 2000, "U08 final pdf");

  const draftPng = await rasterize(
    renderSchematicSvg(base),
    APARTMENT_1F_VIEWBOX.width,
    APARTMENT_1F_VIEWBOX.height,
    "draft",
  );
  const finalPng = await rasterize(
    renderSchematicSvg(base),
    APARTMENT_1F_VIEWBOX.width,
    APARTMENT_1F_VIEWBOX.height,
    "final",
  );
  assert(draftPng.length !== finalPng.length || draftPng.some((b, i) => b !== finalPng[i]), "U08 watermark diff");
}

console.log("\n=== U09 — title/address preserve spaces (P0 hotfix) ===");
{
  const base = store.find((s) => s.circuits.length > 0) ?? store[0];
  const trailingSpace = touchSchematic(base, { address: "UL. " });
  assert(trailingSpace.address === "UL. ", "U09 trailing space preserved in address");

  const fullAddress = touchSchematic(base, { address: "WROCŁAW UL. NOWOWIEJSKA 15/2" });
  assert(fullAddress.address === "WROCŁAW UL. NOWOWIEJSKA 15/2", "U09 full address with spaces");

  const titleLong = "SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ";
  const titled = touchSchematic(base, { title: titleLong });
  assert(titled.title === titleLong, "U09 title with internal spaces");

  const titleTrailing = touchSchematic(base, { title: "SCHEMAT " });
  assert(titleTrailing.title === "SCHEMAT ", "U09 title trailing space preserved");
}

console.log(`\n=== WYNIK: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
console.log("UI 3B SMOKE: PASS");
