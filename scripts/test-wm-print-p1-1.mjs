/**
 * P1.0.1 — multi-file groups: migracja, wiele plików, usuwanie, ZIP.
 */
import JSZip from "jszip";
import {
  migrateWmPrintTemplate,
  addWmPrintTemplateFile,
  removeWmPrintTemplateFile,
  getWmPrintTemplateFiles,
  countWmPrintTemplateFiles,
  purgeLegacyWmPrintTemplateFields,
} from "../src/lib/wm-print/templates.ts";
import { mergeWmPrintTemplates } from "../src/lib/wm-print/wm-print-sync.ts";
import { buildWmPrintFilesForJob, buildWmPrintZipEntryName } from "../src/lib/wm-print/generate-zip.ts";
import { generateDocxFromTemplate } from "../src/lib/wm-print/generate-docx.ts";

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

async function makeDocx(text) {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

console.log("WM Print P1.0.1 — multi-file groups\n");

const legacy = {
  id: "grp-upr",
  name: "Uprawnienia",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 70,
  storagePath: "jobs/wm-print/t1.pdf",
  storageUrl: "https://example.com/t1.pdf",
  originalFileName: "Uprawnienia wykonawcze.pdf",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

const migrated = migrateWmPrintTemplate(legacy);
assert(migrated.files?.length === 1, "migracja: single → files[1]");
assert(migrated.files?.[0]?.originalFileName === "Uprawnienia wykonawcze.pdf", "migracja: zachowany plik");
assert(!migrated.storageUrl, "migracja: legacy storageUrl wyczyszczone");
assert(migrated.files?.[0]?.id === "grp-upr-legacy-0", "migracja: stabilne legacy id");

let templates = [migrated];
templates = addWmPrintTemplateFile(templates, "grp-upr", {
  storagePath: "p2",
  storageUrl: "https://example.com/f2.pdf",
  originalFileName: "Uprawnienia wykonawcze 2.pdf",
});
templates = addWmPrintTemplateFile(templates, "grp-upr", {
  storagePath: "p3",
  storageUrl: "https://example.com/f3.pdf",
  originalFileName: "Izba 2026.pdf",
});
assert(countWmPrintTemplateFiles(templates[0]) === 3, "grupa Uprawnienia (3)");

templates = removeWmPrintTemplateFile(templates, "grp-upr", getWmPrintTemplateFiles(templates[0])[1].id);
assert(countWmPrintTemplateFiles(templates[0]) === 2, "po usunięciu 1 pliku zostają 2");
const names = getWmPrintTemplateFiles(templates[0]).map((f) => f.originalFileName);
assert(!names.includes("Uprawnienia wykonawcze 2.pdf"), "usunięty tylko wskazany plik");
assert(names.includes("Uprawnienia wykonawcze.pdf"), "pozostałe pliki nietknięte");

const gazGroup = {
  id: "grp-gaz",
  name: "Gaz",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 120,
  files: [
    {
      id: "g1",
      storagePath: "g1",
      storageUrl: "https://example.com/gaz1.pdf",
      originalFileName: "Gaz świadectwo wzorcowania 1.pdf",
      sortOrder: 10,
      uploadedAt: "2026-06-14T00:00:00Z",
    },
    {
      id: "g2",
      storagePath: "g2",
      storageUrl: "https://example.com/gaz2.pdf",
      originalFileName: "Gaz świadectwo wzorcowania 2.pdf",
      sortOrder: 20,
      uploadedAt: "2026-06-14T00:00:00Z",
    },
  ],
  createdAt: "2026-06-14T00:00:00Z",
  updatedAt: "2026-06-14T00:00:00Z",
};

const docxBytes = await makeDocx("{{JOB_ADDRESS}}");
const mockFetch = async (url) => {
  if (url.includes("gaz")) return new TextEncoder().encode(`PDF ${url}`);
  return docxBytes;
};

const job = {
  id: "j1",
  address: "Gorlicka 26",
  flatNumber: "6",
  client: "WM",
  startDate: "",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: {},
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [],
};

const zipFiles = await buildWmPrintFilesForJob(
  job,
  [gazGroup],
  [],
  { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" },
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
  undefined,
  mockFetch,
);

assert(zipFiles.length === 2, "ZIP: oba pliki z grupy Gaz");
assert(
  zipFiles.every((f) => f.fileName.includes("Gaz") || f.fileName.includes("Gaz-swie")),
  "ZIP: nazwy z oryginalnych plików",
);

const zip = new JSZip();
for (const f of zipFiles) zip.file(f.fileName, f.bytes);
const zipBytes = await zip.generateAsync({ type: "uint8array" });
const read = await JSZip.loadAsync(zipBytes);
assert(Object.keys(read.files).filter((k) => !k.endsWith("/")).length === 2, "ZIP archiwum: 2 wpisy");

const entryName = buildWmPrintZipEntryName(120, 0, "Gaz świadectwo wzorcowania 1.pdf", "pdf");
assert(entryName.startsWith("120-") || entryName.match(/^\d{2}-/), "ZIP entry naming");

const out = await generateDocxFromTemplate(docxBytes, {
  DATE: "14.06.2026 r.",
  YEAR: "2026",
  JOB_ADDRESS: "Gorlicka 26/6",
  JOB_STREET: "Gorlicka",
  JOB_BUILDING: "26",
  JOB_APARTMENT: "6",
  JOB_CITY: "Wrocław",
});
const outZip = await JSZip.loadAsync(out);
const xml = (await outZip.file("word/document.xml")?.async("string")) ?? "";
assert(xml.includes("Gorlicka 26/6"), "generowanie multi-file: zmienne OK");

// P1.0.1 hotfix — single-click delete: legacy storageUrl + files[] + JSON roundtrip
const dirtyLegacy = {
  id: "grp-dirty",
  name: "Oświadczenia",
  kind: "generated",
  type: "docx",
  enabled: true,
  sortOrder: 50,
  storageUrl: "https://example.com/stale.pdf",
  originalFileName: "stale.pdf",
  files: [
    {
      id: "grp-dirty-legacy-0",
      storagePath: "a",
      storageUrl: "https://example.com/a.pdf",
      originalFileName: "A.pdf",
      sortOrder: 10,
      uploadedAt: "2026-06-01T00:00:00Z",
    },
    {
      id: "mid",
      storagePath: "b",
      storageUrl: "https://example.com/b.pdf",
      originalFileName: "B.pdf",
      sortOrder: 20,
      uploadedAt: "2026-06-02T00:00:00Z",
    },
    {
      id: "c",
      storagePath: "c",
      storageUrl: "https://example.com/c.pdf",
      originalFileName: "C.pdf",
      sortOrder: 30,
      uploadedAt: "2026-06-03T00:00:00Z",
    },
  ],
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};
let dirtyRemoved = removeWmPrintTemplateFile([dirtyLegacy], "grp-dirty", "mid");
dirtyRemoved = JSON.parse(JSON.stringify(dirtyRemoved));
assert(countWmPrintTemplateFiles(dirtyRemoved[0]) === 2, "single-click: 3 → 2 po usunięciu środkowego");
assert(!dirtyRemoved[0].storageUrl, "single-click: legacy storageUrl wyczyszczone");
assert(
  !getWmPrintTemplateFiles(dirtyRemoved[0]).some((f) => f.id === "mid"),
  "single-click: środkowy plik usunięty",
);

// Pusta files[] nie odtwarza legacy
const emptied = purgeLegacyWmPrintTemplateFields({
  ...migrateWmPrintTemplate(dirtyLegacy),
  files: [],
  updatedAt: "2026-06-14T12:00:00Z",
});
assert(countWmPrintTemplateFiles(emptied) === 0, "files[]=[] nie odtwarza legacy");

// Merge LWW — lokalne usunięcie wygrywa z chmurą (union nie przywraca pliku)
const cloudTpl = JSON.parse(JSON.stringify(dirtyLegacy));
const localTpl = dirtyRemoved[0];
localTpl.updatedAt = "2026-06-14T12:00:00Z";
const merged = mergeWmPrintTemplates([localTpl], [cloudTpl], []);
assert(countWmPrintTemplateFiles(merged[0]) === 2, "merge LWW: lokalne 2 pliki, nie union 3");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
