/**
 * IK-MIGRATION-01 P2.75 — MULTI-BOQ → dwelling / address mapping.
 * Run: npx vite-node scripts/test-ik-migration-01-p275-dwelling-map.mjs
 *
 * A all mapped · B missing · C ambiguous · D shared · E dup prevent
 * F line count · G provenance · H branch · I qty/unit · J READY · K PARTIAL
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
} from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  assessDwellingMappingCoverage,
  applyExplicitOwnerDwellingMap,
  buildDwellingMappingCandidates,
  computeCompositionLineIntegrity,
  countKeepOneCollapsedFromWarnings,
} from "../src/lib/intelligent-estimator/ik-dwelling-mapping.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";
import { clearMultiDwellingPackageStore } from "../src/lib/multi-dwelling/store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const REAL_TENDER = "08def45d-ead6-5db8-962b-120001d33d37";

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

function row(lp, description, unit, quantity) {
  return { lp, description, unit, quantity: String(quantity), unitPrice: "", total: "" };
}

function snapshot(filename, rows, extra = {}) {
  return {
    ok: extra.ok !== false,
    sourceFilename: filename,
    rowCount: extra.rowCount ?? rows.length,
    rows,
    catalogQuantities: extra.catalog ?? [],
    przedmiar: [],
    categories: [],
    warnings: extra.warnings ?? [],
    parsedAt: "2026-08-15T00:00:00.000Z",
  };
}

function item(overrides = {}) {
  return {
    id: REAL_TENDER,
    tenderId: REAL_TENDER,
    title: "ZZK pustostany",
    status: "seen",
    updatedAt: "2026-08-15T00:00:00.000Z",
    bzpDocuments: [],
    documentsFetchedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function artifact(documentId, filename, rows, branch) {
  return {
    documentId,
    filename,
    branch,
    snapshot: snapshot(filename, rows),
  };
}

function poolArts(...arts) {
  return arts.map((a) => ({
    documentId: a.documentId,
    artifactId: `art:${a.documentId}`,
    filename: a.filename,
    branchHint: a.branch ?? "unknown",
    snapshot: a.snapshot,
  }));
}

// --- Gate A: flag OFF → NG-10 ---
assert("Gate A default ikEntryEnabled false", isIkEntryEnabled(defaultAppSettings()) === false);
assert(
  "Gate A resolve NG-10",
  resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate",
);

// --- Candidates: never authoritative ---
const candArts = poolArts(
  artifact("d1", "Kotlarska 12 lok. 3 el -zp.ATH", [row("1", "Kabel", "m", "10")], "electrical"),
  artifact("d2", "Nasturcjowa 5 bud.ATH", [row("1", "Tynk", "m2", "5")], "construction"),
  artifact("d3", "Przewody wentylacyjne.pdf", [row("1", "Kanał", "m", "20")], "unknown"),
  artifact("d4", "Kotlarska i Ptasia.pdf", [row("1", "X", "szt", "1")], "unknown"),
);
const cands = buildDwellingMappingCandidates(candArts);
assert("C ambiguous candidate", cands.some((c) => c.kind === "ambiguous"));
assert("D shared candidate", cands.some((c) => c.kind === "shared_or_common"));
assert("candidates never authoritative", cands.every((c) => c.authoritative === false && c.needsOwner === true));
assert(
  "no silent SSOT from filename in assess",
  assessDwellingMappingCoverage({ artifacts: candArts, package: null }).allMapped === false,
);

// --- B missing mapping → PARTIAL ---
const missRowsA = [row("1", "A1", "m2", "1"), row("2", "A2", "m2", "2")];
const missRowsB = [row("1", "B1", "m", "3")];
const missItem = item({
  bzpDocuments: [
    { index: 0, documentId: "doc-k", filename: "Kotlarska.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 1, documentId: "doc-n", filename: "Nasturcjowa.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("Kotlarska.ath", missRowsA),
    scanSummary: {
      costBranchArtifacts: [
        artifact("doc-k", "Kotlarska.ath", missRowsA, "construction"),
        artifact("doc-n", "Nasturcjowa.ath", missRowsB, "electrical"),
      ],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const missR = runIkDocumentExpert({ item: missItem });
assert("B missing map → PARTIAL", missR.status === "partial" || missR.status === "hold");
assert("B not READY", missR.masterBoq.readyForExperts === false);
assert("B MULTI_SOURCE reason", missR.reasons.some((r) => /MULTI_SOURCE_NO_DWELLING_MAP/.test(r)));
assert("B ownerMapRequired", missR.dwellingMapping.ownerMapRequired === true);
assert("K PARTIAL/HOLD without map", missR.status === "partial" || missR.status === "hold");

// --- D shared unmapped still blocks READY ---
const sharedItem = item({
  bzpDocuments: [
    { index: 0, documentId: "doc-el", filename: "Żernicka 255 lok. 6 el.ATH", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 1, documentId: "doc-w", filename: "Przewody wentylacyjne.pdf", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("Żernicka 255 lok. 6 el.ATH", [row("1", "Gniazdo", "szt", "4")]),
    scanSummary: {
      costBranchArtifacts: [
        artifact("doc-el", "Żernicka 255 lok. 6 el.ATH", [row("1", "Gniazdo", "szt", "4")], "electrical"),
        artifact("doc-w", "Przewody wentylacyjne.pdf", [row("1", "Kanał", "m", "12")], "unknown"),
      ],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const sharedR = runIkDocumentExpert({ item: sharedItem });
assert("D shared candidate counted", sharedR.dwellingMapping.sharedCandidateCount >= 1);
assert("D shared not READY", sharedR.masterBoq.readyForExperts === false);

// --- A all mapped via EXPLICIT Owner apply ---
clearMultiDwellingPackageStore();
mem.clear();
const rowsK = [row("1", "Kotlarska tynk", "m2", "10"), row("2", "Kotlarska farba", "m2", "8")];
const rowsN = [row("1", "Nasturcjowa kabel", "m", "40")];
const rowsP = [row("1", "Ptasia umywalka", "szt", "1")];
const rowsZ = [row("1", "Żernicka gniazdo", "szt", "6")];
const mapItem = item({
  bzpDocuments: [
    { index: 0, documentId: "doc-kot", filename: "Kotlarska-budowlana.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 1, documentId: "doc-nas", filename: "Nasturcjowa-elektryczne.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 2, documentId: "doc-pta", filename: "Ptasia-sanitarne.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 3, documentId: "doc-zer", filename: "Zernicka-elektryczne.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("Kotlarska-budowlana.ath", rowsK),
    scanSummary: {
      costBranchArtifacts: [
        artifact("doc-kot", "Kotlarska-budowlana.ath", rowsK, "construction"),
        artifact("doc-nas", "Nasturcjowa-elektryczne.ath", rowsN, "electrical"),
        artifact("doc-pta", "Ptasia-sanitarne.ath", rowsP, "sanitary"),
        artifact("doc-zer", "Zernicka-elektryczne.ath", rowsZ, "electrical"),
      ],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const applied = applyExplicitOwnerDwellingMap({
  tenderId: REAL_TENDER,
  expectedDwellingCount: 4,
  dwellings: [
    { dwellingId: "kotlarska", labelPl: "Kotlarska" },
    { dwellingId: "nasturcjowa", labelPl: "Nasturcjowa" },
    { dwellingId: "ptasia", labelPl: "Ptasia" },
    { dwellingId: "zernicka", labelPl: "Żernicka" },
  ],
  mappings: [
    { documentId: "doc-kot", dwellingId: "kotlarska" },
    { documentId: "doc-nas", dwellingId: "nasturcjowa" },
    { documentId: "doc-pta", dwellingId: "ptasia" },
    { documentId: "doc-zer", dwellingId: "zernicka" },
  ],
});
assert("A apply Owner map ok", applied.ok === true && applied.mappedBy === "owner_explicit");
const mappedR = runIkDocumentExpert({
  item: mapItem,
  package: applied.ok ? applied.package : null,
});
assert("A allMapped", mappedR.dwellingMapping.allMapped === true);
assert("A dwellingCount 4", mappedR.masterBoq.dwellingCount === 4);
assert("J MASTER BOQ READY", mappedR.status === "ready" && mappedR.masterBoq.readyForExperts === true);
assert("F source lines 5", mappedR.masterBoq.sourceLineCount === 5);
assert("F composed lines 5", mappedR.masterBoq.composedLineCount === 5);
assert("F integrity ok", mappedR.lineIntegrity.ok === true);
assert("F unexplained loss 0", mappedR.lineIntegrity.unexplainedLoss === 0);
assert("E unexplained dup 0", mappedR.lineIntegrity.unexplainedDuplication === 0);

// --- E KEEP ONE duplicate prevention within dwelling ---
clearMultiDwellingPackageStore();
mem.clear();
const sameRows = [row("1", "Identyczna pozycja", "m2", "7")];
const dupItem = item({
  bzpDocuments: [
    { index: 0, documentId: "dup-a", filename: "a.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
    { index: 1, documentId: "dup-b", filename: "b.ath", contentType: "x", downloadUrl: "u", isSwzHint: false },
  ],
  tenderDossier: {
    kosztorys: snapshot("a.ath", sameRows),
    scanSummary: {
      costBranchArtifacts: [
        artifact("dup-a", "a.ath", sameRows, "construction"),
        artifact("dup-b", "b.ath", sameRows, "construction"),
      ],
    },
    brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
    builtAt: "2026-08-15T00:00:00.000Z",
  },
});
const dupApply = applyExplicitOwnerDwellingMap({
  tenderId: REAL_TENDER,
  dwellings: [{ dwellingId: "one", labelPl: "Jeden lokal" }],
  mappings: [
    { documentId: "dup-a", dwellingId: "one" },
    { documentId: "dup-b", dwellingId: "one" },
  ],
});
const dupR = runIkDocumentExpert({
  item: dupItem,
  package: dupApply.ok ? dupApply.package : null,
});
assert("E KEEP ONE composed 1", dupR.masterBoq.composedLineCount === 1);
assert("E source 2", dupR.masterBoq.sourceLineCount === 2);
assert("E integrity ok with explained loss", dupR.lineIntegrity.ok === true);
assert("E explained loss >= 1", dupR.lineIntegrity.explainedLoss >= 1);

// --- G provenance · H branch · I qty/unit ---
assert("G has provenance", mappedR.masterBoq.hasLineProvenance === true);
const prov = Object.values(mappedR.lineProvenance || {});
assert("G every provenance has sourceDocumentId", prov.length > 0 && prov.every((p) => Boolean(p.sourceDocumentId)));
assert("H branches retained", mappedR.masterBoq.branchCount >= 2);
assert(
  "I qty/unit valid",
  mappedR.validation.missingQuantity === 0 && mappedR.validation.missingUnit === 0,
);

// --- integrity helper unit ---
const integFail = computeCompositionLineIntegrity({
  sourceLineCount: 484,
  composedLineCount: 472,
  keepOneCollapsedRawLines: 0,
});
assert("F unexplained 12 without keepOne", integFail.unexplainedLoss === 12 && integFail.ok === false);
const integOk = computeCompositionLineIntegrity({
  sourceLineCount: 484,
  composedLineCount: 472,
  keepOneCollapsedRawLines: 12,
});
assert("F explained 12 keepOne", integOk.ok === true && integOk.explainedLoss === 12);
assert(
  "keepOne warning parser",
  countKeepOneCollapsedFromWarnings([
    "KEEP ONE contentHash=abc sources=d1,d2,d3",
  ]) === 2,
);

// --- EC truthful ---
const vmMiss = buildIkEntryConversationViewModel(missItem);
assert(
  "EC map required event",
  vmMiss.steps.some((s) => s.event === "DWELLING_MAP_REQUIRED"),
);
assert(
  "EC no false BOQ_READY without map",
  !vmMiss.steps.some((s) => s.event === "BOQ_READY"),
);
const vmMapped = buildIkEntryConversationViewModel(mapItem, {
  package: applied.ok ? applied.package : null,
});
assert(
  "EC map complete when Owner applied",
  vmMapped.steps.some((s) => s.event === "DWELLING_MAP_COMPLETE" || s.event === "BOQ_READY"),
);

// --- reject invent: documentId === dwellingId ---
clearMultiDwellingPackageStore();
mem.clear();
const bad = applyExplicitOwnerDwellingMap({
  tenderId: REAL_TENDER,
  dwellings: [{ dwellingId: "doc-x", labelPl: "Bad" }],
  mappings: [{ documentId: "doc-x", dwellingId: "doc-x" }],
});
assert("reject documentId===dwellingId", bad.ok === false);

// --- source: no ATH writer / no new parser ---
const mapSrc = readSrc("src/lib/intelligent-estimator/ik-dwelling-mapping.ts");
assert("no ATH writer", !/writeAth|ath-writer|ATH_WRITER/i.test(mapSrc));
assert("no invent auto map", !/mapDocumentToDwelling\(\s*\{\s*tenderId[\s\S]*filename/.test(mapSrc));
assert("reuse documentToDwelling", /mapDocumentToDwelling|documentToDwelling/.test(mapSrc));

console.log(`\nP2.75 RESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
