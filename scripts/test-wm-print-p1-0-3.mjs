/**
 * P1.0.3 — multi-upload: wiele plików naraz, append, liczniki, ZIP, regresja P1.0.1.
 */
import JSZip from "jszip";
import {
  migrateWmPrintTemplate,
  addWmPrintTemplateFiles,
  removeWmPrintTemplateFile,
  getWmPrintTemplateFiles,
  countWmPrintTemplateFiles,
  wmPrintTemplateGroupLabel,
} from "../src/lib/wm-print/templates.ts";
import { buildWmPrintFilesForJob } from "../src/lib/wm-print/generate-zip.ts";

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

console.log("WM Print P1.0.3 — multi-upload\n");

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

// 1. Upload 3 plików jednocześnie
let batch = addWmPrintTemplateFiles([baseGroup], "grp-upr", [
  { id: "f1", storagePath: "p1", storageUrl: "https://example.com/upr1.pdf", originalFileName: "uprawnienia.pdf" },
  { id: "f2", storagePath: "p2", storageUrl: "https://example.com/izba.pdf", originalFileName: "izba.pdf" },
  { id: "f3", storagePath: "p3", storageUrl: "https://example.com/sep.pdf", originalFileName: "sep.pdf" },
]);
assert(batch.added === 3, "upload 3 plików jednocześnie");
assert(countWmPrintTemplateFiles(batch.templates[0]) === 3, "grupa ma 3 pliki");
assert(wmPrintTemplateGroupLabel(batch.templates[0]) === "Uprawnienia (3)", "licznik Uprawnienia (3)");

// 2. Append do istniejącej grupy (3 + 2 = 5)
const append = addWmPrintTemplateFiles(batch.templates, "grp-upr", [
  { id: "f4", storagePath: "p4", storageUrl: "https://example.com/extra1.pdf", originalFileName: "dodatkowy-1.pdf" },
  { id: "f5", storagePath: "p5", storageUrl: "https://example.com/extra2.pdf", originalFileName: "dodatkowy-2.pdf" },
]);
assert(append.added === 2, "append 2 plików");
assert(countWmPrintTemplateFiles(append.templates[0]) === 5, "Uprawnienia (5)");
assert(wmPrintTemplateGroupLabel(append.templates[0]) === "Uprawnienia (5)", "licznik 3 → 5");

// 3. Brak utraty wcześniejszych plików
const names = getWmPrintTemplateFiles(append.templates[0]).map((f) => f.originalFileName);
assert(names.includes("uprawnienia.pdf"), "zachowany uprawnienia.pdf");
assert(names.includes("izba.pdf"), "zachowany izba.pdf");
assert(names.includes("sep.pdf"), "zachowany sep.pdf");
assert(names.includes("dodatkowy-2.pdf"), "zachowany nowy plik");

// 4. Duplikat ID — pomijany; ta sama nazwa inny ID — dodany
const dup = addWmPrintTemplateFiles(append.templates, "grp-upr", [
  { id: "f3", storagePath: "dup", storageUrl: "https://example.com/dup.pdf", originalFileName: "sep.pdf" },
  { id: "f6", storagePath: "p6", storageUrl: "https://example.com/sep2.pdf", originalFileName: "sep.pdf" },
]);
assert(dup.added === 1 && dup.skipped === 1, "duplikat id pominięty, ta sama nazwa OK");
assert(countWmPrintTemplateFiles(dup.templates[0]) === 6, "po duplikacie id: 6 plików");

// 5. ZIP zawiera wszystkie pliki grupy Gaz (multi-file)
const gazGroup = migrateWmPrintTemplate({
  id: "grp-gaz",
  name: "Gaz",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 120,
  files: [
    mockFile("g1", "wzorcowanie-gaz-1.pdf", 10),
    mockFile("g2", "wzorcowanie-gaz-2.pdf", 20),
  ],
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
});

const job = {
  id: "job-1",
  address: "Gorlicka 26/6, Wrocław",
  status: "active",
};

const fetchBytes = async (url) => {
  const name = url.split("/").pop() ?? "file";
  return new TextEncoder().encode(`bytes-${name}`);
};

const zipItems = await buildWmPrintFilesForJob(
  job,
  [gazGroup],
  [],
  { defaultCity: "Wrocław", zipNameSuffix: "" },
  { dateMode: "today" },
  undefined,
  fetchBytes,
);
assert(zipItems.length === 2, "ZIP: 2 pliki z grupy Gaz");
assert(
  zipItems.some((z) => z.fileName.includes("wzorcowanie-gaz-1")),
  "ZIP: wzorcowanie-gaz-1.pdf",
);
assert(
  zipItems.some((z) => z.fileName.includes("wzorcowanie-gaz-2")),
  "ZIP: wzorcowanie-gaz-2.pdf",
);

const zip = new JSZip();
for (const item of zipItems) zip.file(item.fileName, item.bytes);
const zipBytes = await zip.generateAsync({ type: "uint8array" });
const read = await JSZip.loadAsync(zipBytes);
assert(Object.keys(read.files).filter((k) => !k.endsWith("/")).length === 2, "ZIP archiwum: 2 wpisy");

// 6. Regresja P1.0.1 — usuwanie środkowego z grupy 3
let regTemplates = addWmPrintTemplateFiles([baseGroup], "grp-upr", [
  { id: "r1", storagePath: "a", storageUrl: "https://example.com/a.pdf", originalFileName: "A.pdf" },
  { id: "r2", storagePath: "b", storageUrl: "https://example.com/b.pdf", originalFileName: "B.pdf" },
  { id: "r3", storagePath: "c", storageUrl: "https://example.com/c.pdf", originalFileName: "C.pdf" },
]).templates;
regTemplates = removeWmPrintTemplateFile(regTemplates, "grp-upr", "r2");
assert(countWmPrintTemplateFiles(regTemplates[0]) === 2, "regresja P1.0.1: 3 → 2 po usunięciu środkowego");
assert(
  !getWmPrintTemplateFiles(regTemplates[0]).some((f) => f.id === "r2"),
  "regresja: środkowy usunięty",
);

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
