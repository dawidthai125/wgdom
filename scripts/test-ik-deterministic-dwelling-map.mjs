/**
 * Owner GO — deterministic multi-premiare dwelling mapping
 * Run: npx vite-node scripts/test-ik-deterministic-dwelling-map.mjs
 */
import {
  parseUnambiguousDwellingFromFilename,
  proposeDeterministicDwellingMap,
  ensureDeterministicFilenameDwellingMap,
  assessDwellingMappingCoverage,
} from "../src/lib/intelligent-estimator/ik-dwelling-mapping.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { classifyCostDocumentType } from "../src/lib/tender-cost-discovery.ts";
import { isFinancialScheduleNotCostFilename } from "../src/lib/tender-cost-discovery.ts";
import { clearMultiDwellingPackageStore } from "../src/lib/multi-dwelling/store.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};

// --- 1 Pure filename → dwelling ---
const wygodna = parseUnambiguousDwellingFromFilename(
  "Wygodna_10_6_PRZEDMIAR.pdf",
);
const prusa = parseUnambiguousDwellingFromFilename("Prusa_42_9_PRZEDMIAR.pdf");
const dubois = parseUnambiguousDwellingFromFilename(
  "Dubois_22A_21_PRZEDMIAR.pdf",
);

assert("Wygodna label", wygodna?.labelPl === "Wygodna 10/6");
assert("Wygodna id", wygodna?.dwellingId === "wygodna-10-6");
assert("Prusa label", prusa?.labelPl === "Prusa 42/9");
assert("Prusa id", prusa?.dwellingId === "prusa-42-9");
assert("Dubois label", dubois?.labelPl === "Dubois 22A/21");
assert("Dubois id", dubois?.dwellingId === "dubois-22a-21");
assert(
  "zał. variant Wygodna",
  parseUnambiguousDwellingFromFilename(
    "Wygodna_10_6_PRZEDMIAR - zał. 11.pdf",
  )?.labelPl === "Wygodna 10/6",
);

// --- 2 Ambiguous → HOLD ---
assert(
  "ambiguous multi-street null",
  parseUnambiguousDwellingFromFilename("Wygodna_i_Prusa_PRZEDMIAR.pdf") == null,
);
assert(
  "street only null",
  parseUnambiguousDwellingFromFilename("Wygodna_PRZEDMIAR.pdf") == null,
);
assert(
  "no street null",
  parseUnambiguousDwellingFromFilename("random_kosztorys.pdf") == null,
);
assert(
  "shared hold",
  parseUnambiguousDwellingFromFilename("Wentylacja_wspolna.pdf") == null,
);

const ambProp = proposeDeterministicDwellingMap([
  { documentId: "a", filename: "Wygodna_i_Prusa_PRZEDMIAR.pdf" },
  { documentId: "b", filename: "Dubois_22A_21_PRZEDMIAR.pdf" },
]);
assert("ambiguous proposal HOLD", ambProp.status === "hold");

// --- 3 Multi-source 3/3 ---
const arts = [
  {
    documentId: "doc-wygodna",
    filename: "Wygodna_10_6_PRZEDMIAR.pdf",
  },
  {
    documentId: "doc-prusa",
    filename: "Prusa_42_9_PRZEDMIAR.pdf",
  },
  {
    documentId: "doc-dubois",
    filename: "Dubois_22A_21_PRZEDMIAR.pdf",
  },
];
const prop = proposeDeterministicDwellingMap(arts);
assert("multi proposal ready", prop.status === "ready");
assert("multi 3 dwellings", prop.status === "ready" && prop.dwellings.length === 3);
assert("multi 3 mappings", prop.status === "ready" && prop.mappings.length === 3);

clearMultiDwellingPackageStore();
const tenderId = "08def932-550d-d6f5-962b-1200014aa6e7";
const ensured = ensureDeterministicFilenameDwellingMap({
  tenderId,
  artifacts: arts,
});
assert("ensure applied", ensured.ok && ensured.applied === true);
assert(
  "ensure mappedBy",
  ensured.ok && ensured.applied && ensured.mappedBy === "deterministic_filename_unambiguous",
);

const cov = assessDwellingMappingCoverage({
  artifacts: arts.map((a, i) => ({
    ...a,
    artifactId: `a${i}`,
    branchHint: "unknown",
    snapshot: {
      ok: true,
      sourceFilename: a.filename,
      rows: [
        {
          lp: "1",
          description: "Malowanie",
          unit: "m2",
          quantity: "10",
          unitPrice: "",
          total: "",
        },
      ],
      rowCount: 1,
      warnings: [],
    },
  })),
  package: ensured.ok && ensured.applied ? ensured.package : null,
});
assert("coverage allMapped", cov.allMapped === true);
assert("no MULTI_SOURCE reason", !cov.reasons.some((r) => r.includes("MULTI_SOURCE_NO_DWELLING_MAP")));
assert("no OWNER_MAP_REQUIRED", !cov.reasons.some((r) => r.includes("OWNER_MAP_REQUIRED")));

// --- 4–5 Document Expert OfferBoq / Master per dwelling ---
clearMultiDwellingPackageStore();
function snap(filename, n) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: n,
    rows: Array.from({ length: n }, (_, i) => ({
      lp: String(i + 1),
      description: `Poz ${i + 1} ${filename}`,
      unit: "m2",
      quantity: String(10 + i),
      unitPrice: "",
      total: "",
    })),
    warnings: [],
    parsedAt: "2026-08-31T00:00:00.000Z",
  };
}

const item = {
  id: tenderId,
  tenderId,
  title:
    "Modernizacja lokali mieszkalnych Wygodna 10/6, Prusa 42/9, Dubois 22A/21",
  status: "seen",
  updatedAt: "2026-08-31T00:00:00.000Z",
  documentsFetchedAt: "2026-08-31T00:00:00.000Z",
  bzpDocuments: arts.map((a) => ({
    filename: a.filename,
    documentId: a.documentId,
  })),
  tenderDossier: {
    scanSummary: {
      kosztorysFound: true,
      costDiscovery: {
        found: true,
        type: "pdf_przedmiar",
        source: "Prusa_42_9_PRZEDMIAR.pdf",
        confidence: 0.82,
      },
      costBranchArtifacts: arts.map((a) => ({
        filename: a.filename,
        documentId: a.documentId,
        branch: "construction",
        snapshot: snap(a.filename, a.filename.startsWith("Prusa") ? 25 : 20),
      })),
    },
    kosztorys: snap("Prusa_42_9_PRZEDMIAR.pdf", 25),
  },
};

clearMultiDwellingPackageStore();
const expert = runIkDocumentExpert({ item });
console.log(
  "expert.debug",
  JSON.stringify(
    {
      status: expert.status,
      dwellingCount: expert.dwellingCount,
      mode: expert.masterBoq?.mode,
      masterLines: expert.masterBoq?.lineCount,
      dwellings: expert.dwellings?.map((d) => ({
        id: d.dwellingId,
        lines: d.lineCount,
        ok: d.composeOk,
        src: d.sourceDocumentIds,
      })),
      reasons: expert.reasons?.slice(0, 12),
    },
    null,
    2,
  ),
);
assert(
  "expert no MULTI_SOURCE",
  !expert.reasons.some((r) => r.includes("MULTI_SOURCE_NO_DWELLING_MAP")),
);
assert(
  "expert deterministic reason",
  expert.reasons.some((r) => r.includes("DETERMINISTIC_FILENAME_DWELLING_MAP")),
);
assert(
  "expert mode multi",
  expert.masterBoq?.mode === "multi" || (expert.dwellings?.length ?? 0) === 3,
);
assert(
  "expert dwellingCount 3",
  expert.dwellingCount === 3 || (expert.dwellings?.length ?? 0) === 3,
);
assert("expert offerBoq present", (expert.offerBoq?.lines?.length ?? 0) > 0);
assert(
  "expert master lines > 0",
  (expert.masterBoq?.lineCount ?? expert.masterBoqLines?.length ?? 0) > 0,
);
assert(
  "expert dwelling units 3",
  (expert.dwellings?.length ?? 0) === 3,
);

const sources = new Set(
  (expert.dwellings ?? []).flatMap((u) => u.sourceDocumentIds ?? []),
);
assert("sources keep 3 docs", sources.size === 3);

// --- 6 F5 eligibility: lines exist, no invent prices ---
assert(
  "F5 input lines",
  (expert.offerBoq?.lines?.length ?? 0) > 0
    || (expert.masterBoqLines?.length ?? 0) > 0,
);
assert(
  "no invented unit prices on lines",
  (expert.offerBoq?.lines ?? []).every(
    (l) => !l.unitPrice || l.unitPrice === "" || Number(l.unitPrice) === 0,
  ),
);

// --- 7 Paczka XI style PDF przedmiar still classifies ---
assert(
  "paczka-like przedmiar classify",
  classifyCostDocumentType("something_przedmiar.pdf").type === "pdf_przedmiar",
);

// --- 8 Harmonogram regression ---
assert(
  "harmonogram classify none",
  classifyCostDocumentType(
    "TP167_Zał. nr 11 do SWZ - Harmonogram rzeczowo-finansowy.xlsx",
  ).type === "none",
);
assert(
  "harmonogram financial schedule",
  isFinancialScheduleNotCostFilename(
    "TP167_Zał. nr 11 do SWZ - Harmonogram rzeczowo-finansowy.xlsx",
  ) === true,
);

clearMultiDwellingPackageStore();
const harmItem = {
  id: "08defd1c-7dd3-05f6-962b-12000115ca6c",
  tenderId: "08defd1c-7dd3-05f6-962b-12000115ca6c",
  title: "Wyszyńskiego 105A",
  status: "seen",
  updatedAt: "2026-08-31T00:00:00.000Z",
  documentsFetchedAt: "2026-08-31T00:00:00.000Z",
  bzpDocuments: [
    {
      filename: "Harmonogram rzeczowo-finansowy.xlsx",
      documentId: "harm-1",
    },
  ],
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "Harmonogram rzeczowo-finansowy.xlsx",
      rows: Array.from({ length: 5 }, (_, i) => ({
        lp: String(i + 1),
        description: "Etap",
        unit: "kpl",
        quantity: "1",
        unitPrice: "",
        total: "",
      })),
      rowCount: 5,
      warnings: [],
    },
  },
};
const harmExpert = runIkDocumentExpert({ item: harmItem });
assert(
  "harmonogram NOT_MASTER_BOQ_SCHEDULE",
  harmExpert.reasons.some((r) => r.includes("NOT_MASTER_BOQ_SCHEDULE")),
);

console.log(JSON.stringify({ pass, fail, expertStatus: expert.status, dwellingCount: expert.dwellingCount }, null, 2));
if (fail > 0) process.exit(1);
