/**
 * P1.0.5 — kompletność robót vs stan konfiguracji modułu.
 */
import { computeWmPrintCompleteness } from "../src/lib/wm-print/completeness.ts";
import { computeWmPrintConfigurationStatus } from "../src/lib/wm-print/configuration-status.ts";
import {
  createDefaultWmPrintTemplateSelection,
  countWmPrintTemplateSelection,
  toggleWmPrintTemplateSelection,
} from "../src/lib/wm-print/template-selection.ts";

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

function mockFile(id, name) {
  return {
    id,
    storagePath: `path/${id}`,
    storageUrl: `https://example.com/${id}`,
    originalFileName: name,
    sortOrder: 10,
    uploadedAt: "2026-06-14T00:00:00Z",
  };
}

const templates = [
  {
    id: "gen-osw",
    name: "Oświadczenie kierownika",
    kind: "generated",
    type: "docx",
    enabled: true,
    sortOrder: 10,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "gen-izba",
    name: "Izba",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 20,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "gen-gaz",
    name: "Gaz",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 30,
    files: [mockFile("g1", "gaz.pdf")],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "slot-kom",
    name: "Kominiarz",
    kind: "job_upload",
    type: "pdf",
    enabled: true,
    sortOrder: 40,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "slot-pom",
    name: "Pomiary elektryczne",
    kind: "job_upload",
    type: "pdf",
    enabled: true,
    sortOrder: 50,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
  {
    id: "slot-went",
    name: "Wentylacja",
    kind: "job_upload",
    type: "pdf",
    enabled: true,
    sortOrder: 60,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];

const job = { id: "job-1", address: "Gorlicka 26/6", status: "active" };

const jobDocs = [
  {
    id: "d1",
    jobId: "job-1",
    templateId: "slot-kom",
    name: "Kominiarz",
    storagePath: "p1",
    storageUrl: "https://example.com/kom.pdf",
    originalFileName: "kom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
  {
    id: "d2",
    jobId: "job-1",
    templateId: "slot-pom",
    name: "Pomiary elektryczne",
    storagePath: "p2",
    storageUrl: "https://example.com/pom.pdf",
    originalFileName: "pom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
];

console.log("WM Print P1.0.5 — kompletność vs konfiguracja\n");

// 1. Brak szablonu (generated bez plików) nie wpływa na kompletność robót
const comp = computeWmPrintCompleteness(job, templates, jobDocs);
assert(comp.percent === 67, "kompletność 67% (2/3 slotów)");
assert(comp.missing.length === 1 && comp.missing[0] === "Wentylacja", "brakuje tylko Wentylacja");
assert(!comp.missing.some((m) => m.includes("Oświadczenie")), "brak szablonu generated nie w missing robota");
assert(!comp.missing.some((m) => m.includes("Izba")), "Izba (brak pliku) nie w missing robota");
assert(!comp.missing.some((m) => m.includes("brak szablonu")), "żaden komunikat brak szablonu przy robocie");

// 2. Pełna kompletność gdy wszystkie sloty wypełnione — mimo pustych generated
const fullDocs = [
  ...jobDocs,
  {
    id: "d3",
    jobId: "job-1",
    templateId: "slot-went",
    name: "Wentylacja",
    storagePath: "p3",
    storageUrl: "https://example.com/went.pdf",
    originalFileName: "went.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
];
const compFull = computeWmPrintCompleteness(job, templates, fullDocs);
assert(compFull.percent === 100, "100% gdy wszystkie sloty robota wypełnione");
assert(compFull.missing.length === 0, "brak missing przy pełnej robocie");

// 3. Stan konfiguracji — brakujące grupy generated bez plików
const cfg = computeWmPrintConfigurationStatus(templates);
assert(cfg.configured === 4, "4/6 skonfigurowanych (Gaz + 3 sloty)");
assert(cfg.total === 6, "6 aktywnych grup");
assert(!cfg.complete, "konfiguracja niekompletna");
assert(cfg.missing.includes("Oświadczenie kierownika"), "config: brakuje Oświadczenie kierownika");
assert(cfg.missing.includes("Izba"), "config: brakuje Izba");
assert(!cfg.missing.includes("Kominiarz"), "slot job_upload zawsze skonfigurowany");
assert(!cfg.missing.includes("Gaz"), "Gaz z plikiem skonfigurowany");

// 4. Wszystkie generated z plikami → config complete
const templatesOk = templates.map((t) =>
  t.kind === "generated" && t.files.length === 0
    ? { ...t, files: [mockFile(`f-${t.id}`, `${t.name}.pdf`)] }
    : t,
);
const cfgOk = computeWmPrintConfigurationStatus(templatesOk);
assert(cfgOk.complete, "✓ wszystkie grupy skonfigurowane");
assert(cfgOk.missing.length === 0, "brak missing w config");

// 5. Robota bez uploadów — 0% (tylko sloty)
const compEmpty = computeWmPrintCompleteness(job, templates, []);
assert(compEmpty.percent === 0, "0% bez dokumentów robota");
assert(compEmpty.missing.length === 3, "3 brakujące sloty");
assert(compEmpty.missing.includes("Kominiarz"), "missing: Kominiarz");

// 6. Regresja P1.0.4 — selekcja szablonów
let selected = createDefaultWmPrintTemplateSelection(templates);
assert(selected.size === 6, "regresja P1.0.4: domyślnie wszystkie enabled");
selected = toggleWmPrintTemplateSelection(selected, "gen-gaz");
const counts = countWmPrintTemplateSelection(templates, selected);
assert(counts.selected === 5 && counts.total === 6, "regresja P1.0.4: licznik 5/6");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
