/**
 * GO77 — F5 Cloud-Lean Master BOQ Restoration — T1–T12
 * npx vite-node scripts/test-ik-f5-cloud-lean-master-boq-go77.mjs
 *
 * ZERO cloud write · ZERO Accept · structural only.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  offerBoqStructuralContinuityEqual,
  resolveF5SafeDwellingId,
  runIkDocumentExpert,
} from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { resolveIkExpertAdmission } from "../src/lib/intelligent-estimator/ik-expert-admission.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { computeCompositionLineIntegrity } from "../src/lib/intelligent-estimator/ik-dwelling-mapping.ts";

const OCDS = "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c";
const DW = "kosciuszki-46-4";
const LIVE_DOC = `${OCDS}_3`;
const PAYLOAD = join(process.cwd(), ".tmp", "goa-tpi729-package-payload-v1.json");
const ITEM_DUMP = join(process.cwd(), ".tmp", "goa-tpi729-go74-item-dump.json");

let pass = 0;
let fail = 0;
const results = {};

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${msg}`);
  } else {
    fail += 1;
    console.error(`FAIL ${msg}`);
  }
}

function admit(rep) {
  return resolveIkExpertAdmission({
    status: rep.status,
    masterBoq: rep.masterBoq,
    masterBoqLines: rep.masterBoqLines,
    offerBoq: rep.offerBoq,
    expertAdmission: rep.expertAdmission,
  });
}

function catalogQty(i, partial = {}) {
  const qty = partial.quantity ?? i + 1;
  const qtyStr = String(partial.quantityRaw ?? qty).replace(".", ",");
  return {
    lp: String(partial.lp ?? i + 1),
    description: partial.description ?? `Pozycja testowa ${i + 1}`,
    // tender-offer-boq linesFromCatalogQuantities reads c.quantity as quantityRaw string
    quantity: qtyStr,
    unit: partial.unit ?? "m2",
    quantityExpressionRaw: partial.quantityExpressionRaw ?? null,
  };
}

function makeKosztorys(n, filename = "Przedmiar.pdf") {
  const catalogQuantities = Array.from({ length: n }, (_, i) => catalogQty(i));
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: n,
    rows: [],
    catalogQuantities,
    warnings: [],
  };
}

function makeItem(opts = {}) {
  const kosztorys = opts.kosztorys ?? makeKosztorys(opts.n ?? 3);
  const poolArts = opts.poolArts ?? [];
  return {
    id: OCDS,
    tenderId: OCDS,
    title: "F5 TPI fixture",
    bzpDocuments: [
      {
        documentId: LIVE_DOC,
        filename: "Przedmiar.pdf",
        isSwzHint: false,
      },
    ],
    tenderDossier: {
      kosztorys,
      scanSummary:
        poolArts.length > 0
          ? { branchWinnerArtifacts: poolArts, costBranchArtifacts: poolArts }
          : {},
    },
  };
}

function makePkg(opts = {}) {
  const docId = opts.documentId ?? LIVE_DOC;
  const allMapped = opts.allMapped !== false;
  const offerBoq = opts.offerBoq === undefined ? null : opts.offerBoq;
  const map = allMapped
    ? { [docId]: DW }
    : { "doc_historical_stale_aaaa": DW }; // historical id ≠ live inventory → !allMapped
  const sourceDocumentIds = allMapped
    ? [docId]
    : ["doc_historical_stale_aaaa"];
  return {
    tenderId: OCDS,
    mode: "multi",
    schemaVersion: 1,
    expectedDwellingCount: 1,
    documentToDwelling: map,
    dwellings: [
      {
        dwellingId: DW,
        labelPl: "Kościuszki 46/4",
        sourceDocumentIds,
        offerBoq,
        lineProvenance: null,
        costSnapshot: null,
        f5Gate: null,
        subtotals: null,
      },
    ],
  };
}

function poolArt(documentId, lineCount) {
  const catalogQuantities = Array.from({ length: lineCount }, (_, i) => catalogQty(i, {
    description: `Pool line ${i + 1}`,
  }));
  return {
    documentId,
    filename: "Przedmiar.pdf",
    branch: "unknown",
    snapshot: {
      ok: true,
      sourceFilename: "Przedmiar.pdf",
      rowCount: lineCount,
      rows: [],
      catalogQuantities,
      warnings: [],
    },
  };
}

// --- helper unit ---
{
  assert(resolveF5SafeDwellingId([{ dwellingId: DW, sourceDocumentIds: [LIVE_DOC] }]) === DW, "safe dwelling single");
  assert(
    resolveF5SafeDwellingId([
      { dwellingId: "a", sourceDocumentIds: ["1"] },
      { dwellingId: "b", sourceDocumentIds: ["2"] },
    ]) === null,
    "safe dwelling rejects multi-source dwellings",
  );
  const a = buildOfferBoqFromSnapshot({ tenderId: OCDS, snapshot: makeKosztorys(2) });
  const b = structuredClone(a);
  assert(offerBoqStructuralContinuityEqual(a, b) === true, "continuity equal clone");
  b.lines[0].lineId = "obl_tampered";
  assert(offerBoqStructuralContinuityEqual(a, b) === false, "continuity rejects lineId mismatch");
}

// T1: pool=0 + valid OfferBoq path (allMapped cleared → C2 dossier fallback)
{
  const item = makeItem({ n: 5 });
  const pkg = makePkg({ allMapped: true, offerBoq: null, documentId: LIVE_DOC });
  const beforeKoszt = structuredClone(item.tenderDossier.kosztorys);
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  const ok =
    rep.masterBoqLines.length === 5
    && adm.expertChainMayProceed === true
    && adm.documentStatus !== "hold"
    && JSON.stringify(item.tenderDossier.kosztorys) === JSON.stringify(beforeKoszt);
  assert(ok, "T1 pool=0 valid dossier → master=5 mayProceed");
  results.T1 = {
    master: rep.masterBoqLines.length,
    mayProceed: adm.expertChainMayProceed,
    status: rep.status,
    reasons: rep.reasons.slice(0, 8),
  };
}

// T2: pool=0 + empty OfferBoq (no kosztorys lines)
{
  const emptySnap = {
    ok: true,
    sourceFilename: "Przedmiar.pdf",
    rowCount: 0,
    rows: [],
    catalogQuantities: [],
    warnings: [],
  };
  const item = makeItem({ kosztorys: emptySnap });
  const pkg = makePkg({ allMapped: true, offerBoq: null });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  assert(
    rep.masterBoqLines.length === 0 && adm.expertChainMayProceed === false,
    "T2 pool=0 empty OfferBoq → master=0 mayProceed=false",
  );
  results.T2 = {
    master: rep.masterBoqLines.length,
    mayProceed: adm.expertChainMayProceed,
    status: rep.status,
    reasons: rep.reasons.slice(0, 8),
  };
}

// T3: genuine UNEXPLAINED_DUPLICATION when sourcePool > 0 (guard must remain)
{
  const item = makeItem({ n: 5 });
  // Pool with only 1 extractable line while attach has 5 matching dossier
  const arts = [poolArt(LIVE_DOC, 1)];
  item.tenderDossier.scanSummary = {
    branchWinnerArtifacts: arts,
    costBranchArtifacts: arts,
  };
  const canonical = buildOfferBoqFromSnapshot({
    tenderId: OCDS,
    snapshot: item.tenderDossier.kosztorys,
  });
  const pkg = makePkg({ allMapped: true, offerBoq: canonical, documentId: LIVE_DOC });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  const hasDup = (rep.reasons || []).some((r) => r.includes("UNEXPLAINED_DUPLICATION"));
  assert(
    hasDup && (rep.status === "hold" || adm.globalIntegrityBlocker === true),
    "T3 sourcePool>0 unexplained duplication → HOLD",
  );
  results.T3 = {
    master: rep.masterBoqLines.length,
    status: rep.status,
    mayProceed: adm.expertChainMayProceed,
    hasDup,
    reasons: rep.reasons.slice(0, 10),
  };
}

// T4: pool>0 normal compose path — F5 inactive; behavior uses pool when compose works
{
  const item = makeItem({ n: 3 });
  const arts = [poolArt(LIVE_DOC, 3)];
  item.tenderDossier.scanSummary = {
    branchWinnerArtifacts: arts,
    costBranchArtifacts: arts,
  };
  // Clear dossier catalog to force pool compose authority for lines when offerBoq null
  // Keep dossier for inventory; pool has usable snapshots
  const pkg = makePkg({ allMapped: true, offerBoq: null, documentId: LIVE_DOC });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const f5Hit = (rep.reasons || []).some((r) =>
    r.includes("F5_CLOUD_LEAN") || r.includes("CLOUD_LEAN_EMPTY_POOL_DOSSIER_BASELINE"),
  );
  assert(
    !f5Hit || rep.masterBoqLines.length > 0,
    "T4 pool>0 — F5 cloud-lean fallback not required / path unchanged",
  );
  // Stronger: pool>0 should not emit CLOUD_LEAN_EMPTY_POOL baseline
  assert(
    !(rep.reasons || []).some((r) => r.includes("CLOUD_LEAN_EMPTY_POOL_DOSSIER_BASELINE")),
    "T4 pool>0 — no cloud-lean empty-pool baseline reason",
  );
  results.T4 = {
    master: rep.masterBoqLines.length,
    status: rep.status,
    f5Hit,
    reasons: rep.reasons.slice(0, 10),
  };
}

// T5: schedule / invalid lineage → no F5 push
{
  const sched = makeKosztorys(3, "Harmonogram_rzeczowo_finansowy.pdf");
  const item = makeItem({ kosztorys: sched });
  item.bzpDocuments = [
    { documentId: LIVE_DOC, filename: "Harmonogram_rzeczowo_finansowy.pdf" },
  ];
  const pkg = makePkg({ allMapped: true, offerBoq: null });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  assert(
    rep.masterBoqLines.length === 0 && adm.expertChainMayProceed === false,
    "T5 schedule lineage → no master / mayProceed false",
  );
  results.T5 = {
    master: rep.masterBoqLines.length,
    status: rep.status,
    reasons: rep.reasons.slice(0, 8),
  };
}

// T6: mismatched lineId in package vs dossier → CONTINUITY HOLD
{
  const item = makeItem({ n: 3 });
  const canonical = buildOfferBoqFromSnapshot({
    tenderId: OCDS,
    snapshot: item.tenderDossier.kosztorys,
  });
  const bad = structuredClone(canonical);
  bad.lines[1].lineId = "obl_WRONG_LINE_ID";
  const pkg = makePkg({ allMapped: true, offerBoq: bad, documentId: LIVE_DOC });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  assert(
    (rep.reasons || []).some((r) => r.includes("F5_CONTINUITY_HOLD"))
      && rep.status === "hold"
      && adm.expertChainMayProceed === false,
    "T6 lineId mismatch → F5_CONTINUITY_HOLD",
  );
  results.T6 = {
    master: rep.masterBoqLines.length,
    status: rep.status,
    mayProceed: adm.expertChainMayProceed,
    reasons: rep.reasons.slice(0, 8),
  };
}

// T7: quantity mismatch → HOLD
{
  const item = makeItem({ n: 3 });
  const canonical = buildOfferBoqFromSnapshot({
    tenderId: OCDS,
    snapshot: item.tenderDossier.kosztorys,
  });
  const bad = structuredClone(canonical);
  bad.lines[0].quantity = 999;
  const pkg = makePkg({ allMapped: true, offerBoq: bad, documentId: LIVE_DOC });
  const rep = runIkDocumentExpert({ item, package: pkg });
  assert(
    (rep.reasons || []).some((r) => r.includes("F5_CONTINUITY_HOLD")) && rep.status === "hold",
    "T7 quantity mismatch → HOLD",
  );
  results.T7 = { status: rep.status, reasons: rep.reasons.slice(0, 6) };
}

// T8: unit mismatch → HOLD
{
  const item = makeItem({ n: 3 });
  const canonical = buildOfferBoqFromSnapshot({
    tenderId: OCDS,
    snapshot: item.tenderDossier.kosztorys,
  });
  const bad = structuredClone(canonical);
  bad.lines[0].unit = "kpl";
  const pkg = makePkg({ allMapped: true, offerBoq: bad, documentId: LIVE_DOC });
  const rep = runIkDocumentExpert({ item, package: pkg });
  assert(
    (rep.reasons || []).some((r) => r.includes("F5_CONTINUITY_HOLD")) && rep.status === "hold",
    "T8 unit mismatch → HOLD",
  );
  results.T8 = { status: rep.status, reasons: rep.reasons.slice(0, 6) };
}

// T9: TPI/729 89-line (payload/dump if present, else synthetic 89)
{
  let item;
  let n = 89;
  if (existsSync(ITEM_DUMP)) {
    item = JSON.parse(readFileSync(ITEM_DUMP, "utf8"));
    // Ensure pool empty for F5 path
    if (item.tenderDossier?.scanSummary) {
      item.tenderDossier.scanSummary = {
        ...item.tenderDossier.scanSummary,
        branchWinnerArtifacts: [],
        costBranchArtifacts: [],
      };
    }
    n = item.tenderDossier?.kosztorys?.catalogQuantities?.length
      || item.tenderDossier?.kosztorys?.rowCount
      || 89;
  } else {
    item = makeItem({ n: 89 });
  }
  // Live map to inventory przedmiar id if present
  const invDoc =
    item.bzpDocuments?.[0]?.documentId
    || item.uploadedFile?.id
    || LIVE_DOC;
  const pkg = makePkg({ allMapped: true, offerBoq: null, documentId: invDoc });
  // If inventory uses different id, align map + bzp
  if (!item.bzpDocuments?.length) {
    item.bzpDocuments = [{ documentId: invDoc, filename: "Przedmiar.pdf" }];
  }
  const before = structuredClone(item.tenderDossier?.kosztorys ?? null);
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  const expected = Math.min(n, rep.offerBoq?.lines?.length || n);
  assert(
    rep.masterBoqLines.length === expected && expected >= 1 && adm.expertChainMayProceed === true,
    `T9 TPI lines master=${rep.masterBoqLines.length} expected≈${expected} mayProceed`,
  );
  assert(
    JSON.stringify(item.tenderDossier?.kosztorys ?? null) === JSON.stringify(before),
    "T9/T12 dossier.kosztorys unchanged",
  );
  results.T9 = {
    master: rep.masterBoqLines.length,
    mayProceed: adm.expertChainMayProceed,
    status: rep.status,
    admitted: adm.admittedCount,
  };
}

// T10: idempotent — two runs same inputs → same master count, no growth
{
  const item = makeItem({ n: 4 });
  const pkg = makePkg({ allMapped: true, offerBoq: null });
  const r1 = runIkDocumentExpert({ item, package: pkg });
  const r2 = runIkDocumentExpert({ item, package: pkg });
  assert(
    r1.masterBoqLines.length === 4
      && r2.masterBoqLines.length === 4
      && r1.masterBoqLines.length === r2.masterBoqLines.length,
    "T10 idempotent rerun — no duplicates across runs",
  );
  const ids1 = r1.masterBoqLines.map((x) => x.line.lineId);
  assert(new Set(ids1).size === ids1.length, "T10 no duplicate lineIds within run");
  results.T10 = { master1: r1.masterBoqLines.length, master2: r2.masterBoqLines.length };
}

// T11: no price / OUR RATE / BOM on restored lines
{
  const item = makeItem({ n: 3 });
  const pkg = makePkg({ allMapped: true, offerBoq: null });
  const rep = runIkDocumentExpert({ item, package: pkg });
  const lines = rep.masterBoqLines.map((r) => r.line);
  const clean = lines.every(
    (l) =>
      (l.totalPln == null || l.totalPln === 0)
      && l.catalogWorkId == null
      && !l.autoG2Rate
      && !l.autoG2Bom
      && (l.laborRatePlnPerH == null || l.laborRatePlnPerH === 0),
  );
  assert(clean && lines.length === 3, "T11 no price/OUR RATE/BOM invent");
  results.T11 = { lines: lines.length, clean };
}

// T12 already covered in T9; explicit PARTIAL path also
{
  const item = makeItem({ n: 3 });
  const before = structuredClone(item.tenderDossier.kosztorys);
  const pkg = makePkg({ allMapped: false, offerBoq: null }); // PARTIAL C1
  const rep = runIkDocumentExpert({ item, package: pkg });
  const adm = admit(rep);
  assert(
    rep.masterBoqLines.length === 3
      && adm.expertChainMayProceed === true
      && JSON.stringify(item.tenderDossier.kosztorys) === JSON.stringify(before),
    "T12 PARTIAL C1 push + dossier unchanged",
  );
  results.T12 = {
    master: rep.masterBoqLines.length,
    mayProceed: adm.expertChainMayProceed,
    dossierUnchanged: true,
  };
}

// Integrity helper: source>0 still fails when composed exceeds
{
  const bad = computeCompositionLineIntegrity({
    sourceLineCount: 2,
    composedLineCount: 89,
  });
  assert(
    bad.ok === false && bad.unexplainedDuplication > 0,
    "integrity guard: source>0 composed>source still FAIL",
  );
}

console.log(`\nGO77 F5 T1–T12: ${pass} PASS / ${fail} FAIL`);
if (fail) {
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, results }, null, 2));
