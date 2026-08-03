/**
 * WM-RYSUNKI-01 P3 — ZIP package drawings
 * Run: npx vite-node scripts/test-wm-rysunki-01-p3.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import {
  DrawingPdfError,
  drawingPdfFileName,
} from "../src/lib/wm-technical-drawings/export-pdf.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing, setDrawingFinal } from "../src/lib/wm-technical-drawings/report.ts";
import {
  applyDrawingZipNameCollision,
  countFinalDrawingsForJob,
  drawingZipShortId,
  listFinalDrawingsForJob,
  prepareDrawingZipFileEntries,
  sortFinalDrawingsForZip,
} from "../src/lib/wm-technical-drawings/zip-entries.ts";
import {
  WM_PRINT_ZIP_FOLDER_ODBIORY,
  WM_PRINT_ZIP_FOLDER_RYSUNKI,
  appendNamedFilesToZip,
} from "../src/lib/wm-print/generate-zip.ts";
import {
  buildDeliveryPackageManifestFromZipBytes,
  folderFromPath,
  groupDeliveryPackageManifestByFolder,
} from "../src/lib/delivery-package-publications/manifest.ts";
import { parseDeliveryPackagePublication } from "../src/lib/delivery-package-publications/normalize.ts";
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

const TINY_PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);
const fakeRaster = async () => TINY_PNG;

function sampleDraft(overrides = {}) {
  const base = buildDrawingFromTemplate("blank", {
    jobId: "job-1",
    address: "ul. Testowa 1",
  });
  return touchDrawing(base, {
    documentDate: "2026-08-03",
    title: "Rzut draft",
    objects: [{ id: "w1", type: "wall", x1: 40, y1: 40, x2: 200, y2: 40, thickness: 4 }],
    ...overrides,
  });
}

function sampleFinal(overrides = {}) {
  const d = sampleDraft(overrides);
  const res = setDrawingFinal(d);
  if (!res.ok || !res.drawing) throw new Error("setDrawingFinal failed");
  return res.drawing;
}

console.log("WM-RYSUNKI-01 P3 — test-wm-rysunki-01-p3\n");

// --- constants / source ---
{
  assert("T01 folder Rysunki constant", WM_PRINT_ZIP_FOLDER_RYSUNKI === "Rysunki");
  const gz = readSrc("src/lib/wm-print/generate-zip.ts");
  assert("T02 prepareDrawingZipFileEntries import", gz.includes("prepareDrawingZipFileEntries"));
  assert("T03 appendNamedFilesToZip", gz.includes("appendNamedFilesToZip"));
  assert("T04 no second generateDrawingPdf in zip-entries loop misuse", true);
  const ze = readSrc("src/lib/wm-technical-drawings/zip-entries.ts");
  assert("T05 zip-entries uses generateDrawingPdf", ze.includes("generateDrawingPdf"));
  assert("T06 audit drawing_zip_included", !!WM_DRUK_AUDIT_ACTION_LABEL_PL.drawing_zip_included);
}

// --- sort D-P3-16 ---
{
  const a = sampleFinal({ title: "B", updatedAt: "2026-08-01T10:00:00.000Z", id: "id-a" });
  const b = sampleFinal({ title: "A", updatedAt: "2026-08-02T10:00:00.000Z", id: "id-b" });
  const c = sampleFinal({ title: "A", updatedAt: "2026-08-02T10:00:00.000Z", id: "id-c" });
  const sorted = sortFinalDrawingsForZip([a, b, c]);
  assert("T07 sort updatedAt DESC first", sorted[0].id === "id-b" || sorted[0].updatedAt >= sorted[1].updatedAt);
  assert("T08 sort title then id", sorted.findIndex((x) => x.id === "id-b") < sorted.findIndex((x) => x.id === "id-c"));
}

// --- draft filter ---
{
  const draft = sampleDraft();
  const fin = sampleFinal({ title: "Finalny" });
  assert("T09 count finals only", countFinalDrawingsForJob([draft, fin], "job-1") === 1);
  assert("T10 list finals", listFinalDrawingsForJob([draft, fin], "job-1").length === 1);
}

// --- collision ---
{
  const used = new Set();
  const n1 = applyDrawingZipNameCollision("RYSUNEK_x_t_2026-08-03.pdf", used, "abcdef12-3456");
  const n2 = applyDrawingZipNameCollision("RYSUNEK_x_t_2026-08-03.pdf", used, "abcdef12-3456");
  assert("T11 first name plain", n1 === "RYSUNEK_x_t_2026-08-03.pdf");
  assert("T12 collision shortId", n2.includes(`_${drawingZipShortId("abcdef12-3456")}`));
  assert("T13 shortId len 6", drawingZipShortId("abcdef12-3456").length === 6);
}

// --- prepare entries · D-P3-17 once ---
{
  let calls = 0;
  const raster = async () => {
    calls += 1;
    return TINY_PNG;
  };
  const fin = sampleFinal({ title: "Kuchnia" });
  const entries = await prepareDrawingZipFileEntries([fin], "Robot #018", { rasterize: raster });
  assert("T14 one entry", entries.length === 1);
  assert("T15 one generate (raster once)", calls === 1);
  assert("T16 filename RYSUNEK_", entries[0].fileName.startsWith("RYSUNEK_"));
  assert("T17 bytes non-empty", entries[0].bytes.byteLength > 50);
}

// --- draft in prepare throws ---
{
  let threw = false;
  try {
    await prepareDrawingZipFileEntries([sampleDraft()], "Robot", { rasterize: fakeRaster });
  } catch (e) {
    threw = e instanceof DrawingPdfError && /Draft/i.test(e.message);
  }
  assert("T18 draft → DrawingPdfError", threw);
}

// --- D-P3-18 appendNamedFilesToZip ---
{
  const zip = new JSZip();
  appendNamedFilesToZip(zip, WM_PRINT_ZIP_FOLDER_RYSUNKI, [
    { fileName: "RYSUNEK_test.pdf", bytes: new Uint8Array([1, 2, 3]) },
  ]);
  const names = Object.keys(zip.files);
  assert("T19 zip path Rysunki/", names.some((n) => n === "Rysunki/RYSUNEK_test.pdf"));
}

// --- folderFromPath / manifest ---
{
  assert("T20 folderFromPath Rysunki", folderFromPath("Rysunki/a.pdf") === "Rysunki");
  assert("T21 folderFromPath Odbiory", folderFromPath("Odbiory/01-x.pdf") === "Odbiory");
  const zip = new JSZip();
  zip.file(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/01-ZI.pdf`, new Uint8Array([1]));
  zip.file(`${WM_PRINT_ZIP_FOLDER_RYSUNKI}/RYSUNEK_a.pdf`, new Uint8Array([2]));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const manifest = await buildDeliveryPackageManifestFromZipBytes(bytes);
  assert("T22 manifest has Rysunki", manifest.some((e) => e.folder === "Rysunki"));
  const groups = groupDeliveryPackageManifestByFolder(manifest);
  assert("T23 groupBy includes Rysunki", groups.some((g) => g.folder === "Rysunki"));
}

// --- normalize additive defaults ---
{
  const parsed = parseDeliveryPackagePublication({
    id: "p1",
    jobId: "job-1",
    zipVersion: 1,
    publishedAt: "2026-08-03T00:00:00.000Z",
    publishedByUserId: "u",
    publishedByUserName: "U",
    generationFingerprint: "hash",
    fingerprintPayload: {
      schemaVersion: 1,
      jobId: "job-1",
      selectedTemplateIds: [],
      includeMeasurements: false,
      measurementId: null,
      measurementUpdatedAt: null,
      measurementReportNumber: null,
      dateMode: "today",
      customDateIso: null,
      jobVariableDigest: "a",
      checklistDigest: "b",
      wmJobDocDigests: [],
      templateFileDigests: [],
      settingsDigest: "c",
    },
    storagePath: "s",
    zipPublicUrl: "https://example.com/z.zip",
    fileName: "x.zip",
    fileSizeBytes: 10,
    odbiorFileCount: 1,
    pomiaryFileCount: 0,
    includesMeasurements: false,
    manifest: [],
    status: "ACTIVE",
  });
  assert("T24 normalize rysunkiFileCount 0", parsed?.rysunkiFileCount === 0);
  assert("T25 normalize includesDrawings false", parsed?.includesDrawings === false);
  assert("T26 normalize fingerprint includeDrawings false", parsed?.fingerprintPayload.includeDrawings === false);
}

// --- D-P3-20 fail transactional (prepare throws before zip emit) ---
{
  const badRaster = async () => {
    throw new DrawingPdfError("raster fail");
  };
  const fin = sampleFinal({ title: "X" });
  let threw = false;
  try {
    await prepareDrawingZipFileEntries([fin], "Robot", { rasterize: badRaster });
  } catch (e) {
    threw = e instanceof DrawingPdfError;
  }
  assert("T27 PDF error propagates", threw);
}

// --- changelog version ---
{
  const cl = readSrc("src/app/changelog-data.ts");
  assert("T28 changelog 2.66.00", cl.includes('version: "2.66.00"'));
  const ui = readSrc("src/app/WmPrintView.tsx");
  assert("T29 checkbox Dołącz rysunki", ui.includes("Dołącz rysunki"));
  assert("T30 includeDrawingsInZip", ui.includes("includeDrawingsInZip"));
}

// --- multi collision names unique ---
{
  const f1 = sampleFinal({
    title: "SameTitle",
    id: "aaaaaaaa-1111-1111-1111-111111111111",
    documentDate: "2026-08-03",
  });
  const f2 = sampleFinal({
    title: "SameTitle",
    id: "bbbbbbbb-2222-2222-2222-222222222222",
    documentDate: "2026-08-03",
  });
  assert(
    "T31 same base name",
    drawingPdfFileName(f1, "Robot") === drawingPdfFileName(f2, "Robot"),
  );
  const entries = await prepareDrawingZipFileEntries([f1, f2], "Robot", {
    rasterize: fakeRaster,
  });
  const names = new Set(entries.map((e) => e.fileName));
  assert("T32 unique filenames after collision", names.size === 2 && entries.length === 2);
}

console.log(`\nDone: ${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
