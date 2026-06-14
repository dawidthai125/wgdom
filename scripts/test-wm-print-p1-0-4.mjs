/**
 * P1.0.4 — domyślne zaznaczenie wszystkich szablonów, akcje masowe, ZIP z wyboru.
 */
import JSZip from "jszip";
import {
  createDefaultWmPrintTemplateSelection,
  countWmPrintTemplateSelection,
  toggleWmPrintTemplateSelection,
  selectAllWmPrintTemplates,
  deselectAllWmPrintTemplates,
} from "../src/lib/wm-print/template-selection.ts";
import { buildWmPrintFilesForJob } from "../src/lib/wm-print/generate-zip.ts";
import {
  addWmPrintTemplateFiles,
  countWmPrintTemplateFiles,
  removeWmPrintTemplateFile,
  getWmPrintTemplateFiles,
  wmPrintTemplateGroupLabel,
} from "../src/lib/wm-print/templates.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

function mockFile(id, name, order = 10) {
  return {
    id,
    storagePath: `path/${id}`,
    storageUrl: `https://example.com/${id}`,
    originalFileName: name,
    sortOrder: order,
    uploadedAt: "2026-06-14T00:00:00Z",
  };
}

const templates = [
  {
    id: "t1",
    name: "Oświadczenie kierownika",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 10,
    files: [mockFile("f1", "osw-kier.pdf")],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "t2",
    name: "Gaz wzorcowanie",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 20,
    files: [mockFile("g1", "gaz-1.pdf"), mockFile("g2", "gaz-2.pdf")],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "t3",
    name: "Wyłączony",
    kind: "generated",
    type: "pdf",
    enabled: false,
    sortOrder: 30,
    files: [mockFile("x1", "off.pdf")],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

const job = { id: "job-1", address: "Gorlicka 26/6, Wrocław", status: "active" };

const fetchBytes = async (url) => {
  const name = url.split("/").pop() ?? "file";
  return new TextEncoder().encode(`bytes-${name}`);
};

console.log("WM Print P1.0.4 — domyślne zaznaczenie szablonów\n");

// 1. Domyślnie wszystkie aktywne zaznaczone
let selected = createDefaultWmPrintTemplateSelection(templates);
assert(selected.size === 2, "wszystkie szablony zaznaczone po otwarciu (tylko enabled)");
assert(selected.has("t1") && selected.has("t2"), "t1 i t2 zaznaczone");
assert(!selected.has("t3"), "wyłączony szablon pominięty");

let counts = countWmPrintTemplateSelection(templates, selected);
assert(counts.selected === 2 && counts.total === 2, "licznik 2 / 2");

// 2. Odznaczenie pojedynczego
selected = toggleWmPrintTemplateSelection(selected, "t2");
assert(!selected.has("t2") && selected.has("t1"), "odznaczenie pojedynczego dokumentu");
counts = countWmPrintTemplateSelection(templates, selected);
assert(counts.selected === 1 && counts.total === 2, "licznik 1 / 2 po odznaczeniu");

// 3. Zaznacz wszystko
selected = deselectAllWmPrintTemplates();
selected = selectAllWmPrintTemplates(templates);
assert(selected.size === 2, "zaznacz wszystko");
counts = countWmPrintTemplateSelection(templates, selected);
assert(counts.selected === 2, "licznik po zaznacz wszystko");

// 4. Odznacz wszystko
selected = deselectAllWmPrintTemplates();
assert(selected.size === 0, "odznacz wszystko");
counts = countWmPrintTemplateSelection(templates, selected);
assert(counts.selected === 0 && counts.total === 2, "licznik 0 / 2");

// 5. ZIP tylko zaznaczone (bez Gaz)
selected = createDefaultWmPrintTemplateSelection(templates);
selected = toggleWmPrintTemplateSelection(selected, "t2");
const zipPartial = await buildWmPrintFilesForJob(
  job,
  templates,
  [],
  { defaultCity: "Wrocław", zipNameSuffix: "" },
  { dateMode: "today" },
  [...selected],
  fetchBytes,
);
assert(zipPartial.length === 1, "ZIP: tylko zaznaczone szablony (1 plik z t1)");
assert(zipPartial.some((z) => z.fileName.includes("osw-kier")), "ZIP: zawiera Oświadczenie kierownika");
assert(!zipPartial.some((z) => z.fileName.includes("gaz")), "ZIP: bez odznaczonego Gaz");

// 6. ZIP pełny komplet (wszystkie zaznaczone)
const zipFull = await buildWmPrintFilesForJob(
  job,
  templates,
  [],
  { defaultCity: "Wrocław", zipNameSuffix: "" },
  { dateMode: "today" },
  [...createDefaultWmPrintTemplateSelection(templates)],
  fetchBytes,
);
assert(zipFull.length === 3, "ZIP pełny: 3 pliki (1 + 2 z Gaz)");

// 7. Dokumenty robota bez szablonu — zawsze w ZIP
const jobDocs = [
  {
    id: "d1",
    jobId: "job-1",
    name: "Dodatkowy skan",
    storagePath: "jobs/d1.pdf",
    storageUrl: "https://example.com/extra-scan.pdf",
    originalFileName: "extra-scan.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
];
const zipWithExtra = await buildWmPrintFilesForJob(
  job,
  templates,
  jobDocs,
  { defaultCity: "Wrocław", zipNameSuffix: "" },
  { dateMode: "today" },
  ["t1"],
  fetchBytes,
);
assert(zipWithExtra.length === 2, "ZIP: zaznaczony szablon + dokument robota bez slotu");
assert(zipWithExtra.some((z) => z.jobDocId === "d1"), "ZIP: dokument przypisany do roboty zawsze dołączony");

// 8. Regresja P1.0.3 — multi-upload + ZIP
const baseGroup = {
  id: "grp-upr",
  name: "Uprawnienia",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 70,
  files: [],
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};
let batch = addWmPrintTemplateFiles([baseGroup], "grp-upr", [
  { id: "f1", storagePath: "p1", storageUrl: "https://example.com/upr1.pdf", originalFileName: "uprawnienia.pdf" },
  { id: "f2", storagePath: "p2", storageUrl: "https://example.com/izba.pdf", originalFileName: "izba.pdf" },
  { id: "f3", storagePath: "p3", storageUrl: "https://example.com/sep.pdf", originalFileName: "sep.pdf" },
]);
assert(batch.added === 3, "regresja P1.0.3: upload 3 plików");
assert(wmPrintTemplateGroupLabel(batch.templates[0]) === "Uprawnienia (3)", "regresja: licznik Uprawnienia (3)");

const gazGroup = {
  id: "grp-gaz",
  name: "Gaz",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 120,
  files: [mockFile("g1", "wzorcowanie-gaz-1.pdf"), mockFile("g2", "wzorcowanie-gaz-2.pdf")],
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};
const zipReg = await buildWmPrintFilesForJob(
  job,
  [gazGroup],
  [],
  { defaultCity: "Wrocław", zipNameSuffix: "" },
  { dateMode: "today" },
  undefined,
  fetchBytes,
);
assert(zipReg.length === 2, "regresja P1.0.3: ZIP 2 pliki Gaz (undefined = wszystkie)");

let regTemplates = addWmPrintTemplateFiles([baseGroup], "grp-upr", [
  { id: "r1", storagePath: "a", storageUrl: "https://example.com/a.pdf", originalFileName: "A.pdf" },
  { id: "r2", storagePath: "b", storageUrl: "https://example.com/b.pdf", originalFileName: "B.pdf" },
  { id: "r3", storagePath: "c", storageUrl: "https://example.com/c.pdf", originalFileName: "C.pdf" },
]).templates;
regTemplates = removeWmPrintTemplateFile(regTemplates, "grp-upr", "r2");
assert(countWmPrintTemplateFiles(regTemplates[0]) === 2, "regresja P1.0.1: usuwanie środkowego");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
