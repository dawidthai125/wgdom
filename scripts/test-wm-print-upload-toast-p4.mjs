/**
 * P4 WM-PRINT-UPLOAD-TOAST — toast po uploadzie szablonu WM Druk.
 */
import { createWmPrintSeedTemplates } from "../src/lib/wm-print/default-templates.ts";
import { addWmPrintTemplateFiles } from "../src/lib/wm-print/templates.ts";
import {
  resolveWmPrintTemplateUploadToast,
  wmPrintFilesAddedLabel,
} from "../src/lib/wm-print/template-upload-toast.ts";

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
};

const GROUP = "ZI";

// --- Toast copy (uploaded vs added) ---
assert(
  resolveWmPrintTemplateUploadToast(1, 1, GROUP) === `Dodano ${wmPrintFilesAddedLabel(1)} do grupy ${GROUP}`,
  "P4-T01 nowy plik — Dodano 1 plik",
);

assert(
  resolveWmPrintTemplateUploadToast(1, 0, GROUP) ===
    `Plik został wgrany, ale nie dodano nowego wpisu do grupy ${GROUP}.`,
  "P4-T02 upload OK, added=0 — bez „Dodano 0 plików”",
);

assert(
  resolveWmPrintTemplateUploadToast(3, 2, GROUP) === `Dodano ${wmPrintFilesAddedLabel(2)} do grupy ${GROUP}`,
  "P4-T03 wiele plików — część dodana",
);

assert(
  resolveWmPrintTemplateUploadToast(3, 0, GROUP) ===
    `Pliki zostały wgrane (3), ale nie dodano nowych wpisów do grupy ${GROUP}.`,
  "P4-T04 wiele plików — żaden wpis w grupie",
);

assert(resolveWmPrintTemplateUploadToast(0, 0, GROUP) === null, "P4-T05 brak uploadu — brak toastu");

// --- addWmPrintTemplateFiles (duplikat id w jednej paczce) ---
const templates = createWmPrintSeedTemplates();
const zi = templates.find((t) => t.name === "ZI");
assert(zi, "seed ZI");

const dupId = "same-file-id-twice";
const fileMeta = {
  id: dupId,
  storagePath: "wm-print/test/a.pdf",
  storageUrl: "https://example.test/a.pdf",
  originalFileName: "a.pdf",
};

const first = addWmPrintTemplateFiles(templates, zi.id, [fileMeta]);
assert(first.added === 1 && first.skipped === 0, "P4-T06 pierwszy wpis added=1");

const duplicateBatch = addWmPrintTemplateFiles(first.templates, zi.id, [
  fileMeta,
  {
    id: crypto.randomUUID(),
    storagePath: "wm-print/test/b.pdf",
    storageUrl: "https://example.test/b.pdf",
    originalFileName: "b.pdf",
  },
]);
assert(duplicateBatch.added === 1 && duplicateBatch.skipped === 1, "P4-T07 duplikat id skipped, drugi added");

const uploadedCount = 2;
const toastDup = resolveWmPrintTemplateUploadToast(uploadedCount, duplicateBatch.added, GROUP);
assert(
  toastDup === `Dodano ${wmPrintFilesAddedLabel(1)} do grupy ${GROUP}`,
  "P4-T08 toast przy partial add (symuluje 2 uploady, 1 wpis)",
);

console.log("\nAll P4 WM-PRINT-UPLOAD-TOAST checks passed.");
