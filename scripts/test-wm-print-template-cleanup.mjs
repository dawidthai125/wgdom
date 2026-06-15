/**
 * P0 — WM Print template pollution cleanup plan
 */
import { planWmPrintTemplateCleanup, applyWmPrintTemplateCleanup } from "../src/lib/wm-print/template-cleanup.ts";

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

function tpl(id, name, createdAt, files = []) {
  return {
    id,
    name,
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 10,
    files,
    createdAt,
    updatedAt: createdAt,
  };
}

console.log("P0 WM Print template cleanup plan\n");

// 1. puste duplikaty — zostaje najstarszy
const dupEmpty = [
  tpl("a1", "ZI", "2026-06-14T22:23:00.000Z"),
  tpl("a2", "ZI", "2026-06-14T22:24:00.000Z"),
  tpl("a3", "ZI", "2026-06-15T05:13:00.000Z"),
];
const p1 = planWmPrintTemplateCleanup(dupEmpty);
assert(p1.keep.length === 1 && p1.keep[0].id === "a1", "3 puste ZI => KEEP najstarszy a1");
assert(p1.delete.length === 2, "3 puste ZI => DELETE 2");
assert(p1.delete.every((d) => d.filesCount === 0), "DELETE tylko filesCount=0");

// 2. rekord z plikami zawsze KEEP
const withFiles = [
  tpl("old", "ZI", "2026-06-14T22:23:00.000Z"),
  tpl("zi-pdf", "ZI", "2026-06-15T00:00:00.000Z", [
    { id: "f1", storageUrl: "https://x/z.pdf", storagePath: "z", originalFileName: "zi.pdf", sortOrder: 10, uploadedAt: "2026-06-15T00:00:00.000Z" },
  ]),
];
const p2 = planWmPrintTemplateCleanup(withFiles);
assert(p2.keep.some((k) => k.id === "zi-pdf"), "ZI z plikami => KEEP");
assert(p2.keep.some((k) => k.id === "old"), "najstarszy pusty => KEEP");
assert(p2.delete.length === 0, "brak DELETE gdy tylko 1 pusty starszy + 1 z plikami");

// 3. apply zwraca keptTemplates
const applied = applyWmPrintTemplateCleanup(dupEmpty);
assert(applied.length === 1 && applied[0].id === "a1", "apply => 1 rekord");

// 4. unikalna pusta nazwa — KEEP
const singleEmpty = [tpl("only", "Gaz", "2026-06-14T22:23:00.000Z")];
const p4 = planWmPrintTemplateCleanup(singleEmpty);
assert(p4.delete.length === 0, "jedyny pusty Gaz => KEEP");
assert(p4.keep.length === 1, "jedyny pusty Gaz => 1 KEEP");

// 5. dwa z plikami tej samej nazwy — oba KEEP
const twoFiles = [
  tpl("f1", "Oświadczenia", "2026-06-10T00:00:00.000Z", [
    { id: "x1", storageUrl: "https://a/1.docx", storagePath: "1", originalFileName: "1.docx", sortOrder: 10, uploadedAt: "2026-06-10T00:00:00.000Z" },
  ]),
  tpl("f2", "Oświadczenia", "2026-06-11T00:00:00.000Z", [
    { id: "x2", storageUrl: "https://a/2.docx", storagePath: "2", originalFileName: "2.docx", sortOrder: 10, uploadedAt: "2026-06-11T00:00:00.000Z" },
  ]),
];
const p5 = planWmPrintTemplateCleanup(twoFiles);
assert(p5.keep.length === 2, "2x ta sama nazwa z plikami => oba KEEP");
assert(p5.delete.length === 0, "brak DELETE gdy oba mają pliki");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
