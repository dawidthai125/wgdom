/**
 * P0 — Template Pollution Fix: seed guard + name dedupe
 */
import { createWmPrintSeedTemplates } from "../src/lib/wm-print/default-templates.ts";
import { parseWmPrintTemplates, dedupeWmPrintTemplatesByName } from "../src/lib/wm-print/templates.ts";
import { mergeWmPrintTemplates } from "../src/lib/wm-print/wm-print-sync.ts";

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

console.log("P0 WM Print seed guard\n");

// 1. pusty local + pełna chmura => merge bez nowych seed UUID
const cloudFull = [
  { id: "e911d6a5-3728-4089-bb9a-a4adec6e9c20", name: "ZI", kind: "generated", type: "pdf_form", enabled: true, sortOrder: 50, files: [{ id: "f1", storageUrl: "https://x/a.pdf", storagePath: "a", originalFileName: "zi.pdf", sortOrder: 10, uploadedAt: "2026-06-14T00:00:00.000Z" }], createdAt: "2026-06-14T00:00:00.000Z", updatedAt: "2026-06-14T00:00:00.000Z" },
];
const mergedEmptyLocal = mergeWmPrintTemplates([], cloudFull, []);
assert(mergedEmptyLocal.length === 1, "pusty local + chmura 1 => merge 1 rekord");
assert(mergedEmptyLocal[0].id === "e911d6a5-3728-4089-bb9a-a4adec6e9c20", "zachowany id z chmury");
assert(parseWmPrintTemplates([]).length === 0, "parse [] nie seeduje");

// 2. pusta chmura + pusty local => explicit seed 13
const seeded = createWmPrintSeedTemplates();
assert(seeded.length === 13, "pusta chmura => seed 13 rekordów");
assert(seeded.every((t) => t.id && t.name), "seed ma id i name");

// 3. restart — parse istniejącej chmury nie dodaje rekordów
const parsedAgain = parseWmPrintTemplates(cloudFull);
assert(parsedAgain.length === 1, "restart parse chmury => 0 nowych");
const mergedRestart = mergeWmPrintTemplates(parsedAgain, cloudFull, []);
assert(mergedRestart.length === 1, "restart merge => 1 rekord");

// 4. normalize nie seeduje pustej tablicy
assert(parseWmPrintTemplates([]).length === 0, "normalize/parse [] => 0");

// 5. name uniqueness guard
const dupes = [
  ...cloudFull,
  { id: "dup-zi", name: "ZI", kind: "generated", type: "pdf", enabled: true, sortOrder: 50, files: [], createdAt: "2026-06-15T00:00:00.000Z", updatedAt: "2026-06-15T00:00:00.000Z" },
];
const deduped = dedupeWmPrintTemplatesByName(dupes);
assert(deduped.length === 1, "dedupe 2x ZI => 1");
assert(deduped[0].id === "e911d6a5-3728-4089-bb9a-a4adec6e9c20", "dedupe preferuje rekord z plikami");

// 6. merge cloud nie wywołuje seed burst
const cloudNorm = parseWmPrintTemplates(cloudFull);
assert(cloudNorm.length === cloudFull.length, "parse cloud bez dodatkowych slotów");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
