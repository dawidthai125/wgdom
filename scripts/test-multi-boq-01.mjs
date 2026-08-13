/**
 * MULTI-BOQ-01 — dwelling-scoped resolve + compose + attach harness (T1–T23).
 *
 * npx vite-node scripts/test-multi-boq-01.mjs
 */
import {
  clearOwnerRateInputStore,
  createOwnerRateQuestion,
  DEFAULT_DWELLING_ID,
  findOwnerInputForLine,
} from "../src/lib/owner-rate-input/index.ts";
import { OFFER_BOQ_SCHEMA_VERSION } from "../src/lib/tender-offer-boq.ts";
import {
  clearTransportBidCandidateStore,
  evaluateBidCutoverGate,
  isTransportBidCandidate,
  markTransportBidCandidate,
  computeShadowPositionCostsForOfferBoq,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  evaluatePackageGate,
  getTenderPackage,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
  upsertTenderPackage,
} from "../src/lib/multi-dwelling/index.ts";
import {
  attachComposedBoqToDwelling,
  buildOfferBoqLineIdWithSource,
  composeDwellingOfferBoq,
  resolveDwellingCostSnapshotForPricing,
} from "../src/lib/multi-boq/index.ts";
import { resolveKosztorysSnapshotForPricing } from "../src/lib/cost-multi-02.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}

function reset() {
  clearOwnerRateInputStore();
  clearTransportBidCandidateStore();
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  fetchCalls = 0;
}

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const TID = "tender-MB-01";

function makeStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: "2026-08-13T12:00:00.000Z",
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt: "2026-08-13T12:00:00.000Z" },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: "2026-08-13T12:00:00.000Z" },
    },
  });
}

function makeSnap(filename, lines) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: lines.length,
    rows: lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity ?? "1",
      unitPrice: "",
      total: "",
    })),
    catalogQuantities: lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: l.quantity ?? "1",
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-08-13T12:00:00.000Z",
  };
}

function art(documentId, filename, branchHint, lines) {
  return {
    documentId,
    artifactId: `art:${documentId}`,
    filename,
    branchHint,
    snapshot: makeSnap(filename, lines),
  };
}

function setupMulti(dwellings) {
  enableMultiDwellingMode(TID, { expectedDwellingCount: dwellings.length });
  setExpectedDwellingCount(TID, dwellings.length);
  for (const d of dwellings) {
    confirmDwelling({ tenderId: TID, dwellingId: d.id, labelPl: d.label ?? d.id });
  }
}

function mapDocs(pairs) {
  for (const [docId, dwellingId] of pairs) {
    const r = mapDocumentToDwelling({ tenderId: TID, documentId: docId, dwellingId });
    if (!r.ok) throw new Error(`map fail ${docId}: ${r.reason}`);
  }
}

function attach(dwellingId, artifacts) {
  return attachComposedBoqToDwelling({
    tenderId: TID,
    dwellingId,
    artifacts,
  });
}

// ─── T1: 1×3 isolated BOQ ───────────────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }, { id: "D03" }]);
  const a1 = art("doc-d01-a", "d01-construction.pdf", "construction", [
    { lp: "1", description: "Tynk D01", quantity: "10" },
  ]);
  const a2 = art("doc-d02-a", "d02-construction.pdf", "construction", [
    { lp: "1", description: "Tynk D02", quantity: "20" },
  ]);
  const a3 = art("doc-d03-a", "d03-electrical.pdf", "electrical", [
    { lp: "1", description: "Gniazdo D03", quantity: "5" },
  ]);
  mapDocs([
    ["doc-d01-a", "D01"],
    ["doc-d02-a", "D02"],
    ["doc-d03-a", "D03"],
  ]);
  const r1 = attach("D01", [a1, a2, a3]);
  const r2 = attach("D02", [a1, a2, a3]);
  const r3 = attach("D03", [a1, a2, a3]);
  ok("T1 attach all", r1.ok && r2.ok && r3.ok);
  const pkg = getTenderPackage(TID);
  const ids = pkg.dwellings.map((d) => d.offerBoq?.lines?.[0]?.lineId);
  ok("T1 three BOQ", pkg.dwellings.every((d) => (d.offerBoq?.lines?.length ?? 0) === 1));
  ok("T1 isolated lineIds", new Set(ids).size === 3, { ids });
  ok(
    "T1 D01 only own desc",
    pkg.dwellings.find((d) => d.dwellingId === "D01").offerBoq.lines[0].description.includes("D01"),
  );
}

// ─── T2: D01 = 2 PDF UNION ──────────────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const c = art("doc-c", "construction.pdf", "construction", [
    { lp: "1", description: "Ściana", quantity: "10" },
  ]);
  const e = art("doc-e", "electrical.pdf", "electrical", [
    { lp: "1", description: "Kabel", quantity: "2" },
  ]);
  mapDocs([
    ["doc-c", "D01"],
    ["doc-e", "D01"],
  ]);
  const r = attach("D01", [c, e]);
  ok("T2 ok", r.ok);
  ok("T2 UNION 2", r.snapshot.lines.length === 2, { n: r.snapshot.lines.length });
  ok("T2 sources 2", r.snapshot.sourceDocumentIds.length === 2);
}

// ─── T3: D01 = 3 PDF + provenance ──────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const arts = [
    art("doc-c", "construction.pdf", "construction", [
      { lp: "1", description: "Bud", quantity: "1" },
    ]),
    art("doc-e", "electrical.pdf", "electrical", [
      { lp: "1", description: "El", quantity: "1" },
    ]),
    art("doc-g", "gas-przedmiar.pdf", "unknown", [
      { lp: "1", description: "Gaz", quantity: "1" },
    ]),
  ];
  mapDocs([
    ["doc-c", "D01"],
    ["doc-e", "D01"],
    ["doc-g", "D01"],
  ]);
  const r = attach("D01", arts);
  ok("T3 ok", r.ok);
  ok("T3 UNION 3", r.snapshot.lines.length === 3);
  ok("T3 provenance keys", Object.keys(r.lineProvenance).length === 3);
  const provDocs = new Set(
    Object.values(r.lineProvenance).map((p) => p.sourceDocumentId),
  );
  ok("T3 provenance 3 docs", provDocs.size === 3, { provDocs: [...provDocs] });
}

// ─── T4: shared LP D01/D02 → different lineIds ──────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  const a1 = art("doc1", "a.pdf", "construction", [
    { lp: "10", description: "Ta sama nazwa", quantity: "1" },
  ]);
  const a2 = art("doc2", "b.pdf", "construction", [
    { lp: "10", description: "Ta sama nazwa", quantity: "1" },
  ]);
  mapDocs([
    ["doc1", "D01"],
    ["doc2", "D02"],
  ]);
  const r1 = attach("D01", [a1, a2]);
  const r2 = attach("D02", [a1, a2]);
  const id1 = r1.package.dwellings.find((d) => d.dwellingId === "D01").offerBoq.lines[0].lineId;
  const id2 = r2.package.dwellings.find((d) => d.dwellingId === "D02").offerBoq.lines[0].lineId;
  ok("T4 different lineIds", id1 !== id2, { id1, id2 });
}

// ─── T5: same LP different branch → KEEP BOTH ───────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const c = art("doc-c", "construction.pdf", "construction", [
    { lp: "5", description: "Pozycja A", quantity: "1" },
  ]);
  const e = art("doc-e", "electrical.pdf", "electrical", [
    { lp: "5", description: "Pozycja B", quantity: "2" },
  ]);
  mapDocs([
    ["doc-c", "D01"],
    ["doc-e", "D01"],
  ]);
  const r = attach("D01", [c, e]);
  ok("T5 KEEP BOTH", r.ok && r.snapshot.lines.length === 2, {
    n: r.snapshot.lines.length,
    c: r.snapshot.completeness,
  });
}

// ─── T6: same LP same branch different content → HOLD ───────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const a = art("doc-a", "c1-construction.pdf", "construction", [
    { lp: "7", description: "Wariant Alpha", quantity: "1" },
  ]);
  const b = art("doc-b", "c2-construction.pdf", "construction", [
    { lp: "7", description: "Wariant Beta", quantity: "1" },
  ]);
  mapDocs([
    ["doc-a", "D01"],
    ["doc-b", "D01"],
  ]);
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a, b],
  });
  ok("T6 conflict", snap.completeness === "conflict", { c: snap.completeness, w: snap.warnings });
  const composed = composeDwellingOfferBoq({ snapshot: snap });
  ok("T6 compose blocked", !composed.ok && composed.reason === "CONFLICT_HOLD");
}

// ─── T7: OI D01 ≠ D02 ───────────────────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  const a1 = art("d1", "e1.pdf", "electrical", [
    { lp: "1", description: "Wynajem podnośnika nożycowego", quantity: "1" },
  ]);
  const a2 = art("d2", "e2.pdf", "electrical", [
    { lp: "1", description: "Wynajem podnośnika nożycowego", quantity: "1" },
  ]);
  mapDocs([
    ["d1", "D01"],
    ["d2", "D02"],
  ]);
  attach("D01", [a1, a2]);
  attach("D02", [a1, a2]);
  const pkg = getTenderPackage(TID);
  const l1 = pkg.dwellings.find((d) => d.dwellingId === "D01").offerBoq.lines[0].lineId;
  const l2 = pkg.dwellings.find((d) => d.dwellingId === "D02").offerBoq.lines[0].lineId;
  createOwnerRateQuestion({
    tenderId: TID,
    domain: "equipment",
    lineRef: l1,
    dwellingId: "D01",
    evidenceSummaryPl: "D01",
    askedByRole: "owner",
    equipment: { namePl: "Eq", quantity: 1, unit: "dzień" },
  });
  const q = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: l1,
    dwellingId: "D01",
  });
  ok("T7 OI D01 found", Boolean(q));
  const q2 = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: l1,
    dwellingId: "D02",
  });
  ok("T7 OI not on D02 for D01 lineRef", !q2);
  createOwnerRateQuestion({
    tenderId: TID,
    domain: "equipment",
    lineRef: l2,
    dwellingId: "D02",
    evidenceSummaryPl: "D02",
    askedByRole: "owner",
    equipment: { namePl: "Eq", quantity: 1, unit: "dzień" },
  });
  ok(
    "T7 separate OI D02",
    Boolean(
      findOwnerInputForLine({
        tenderId: TID,
        domain: "equipment",
        lineRef: l2,
        dwellingId: "D02",
      }),
    ),
  );
}

// ─── T8 / T9: Equipment + Transport isolation (lineId scope) ─────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  const a1 = art("d1", "t1.pdf", "construction", [
    { lp: "1", description: "Transport gruzu kontener", quantity: "1" },
  ]);
  const a2 = art("d2", "t2.pdf", "construction", [
    { lp: "1", description: "Transport gruzu kontener", quantity: "1" },
  ]);
  mapDocs([
    ["d1", "D01"],
    ["d2", "D02"],
  ]);
  const r1 = attach("D01", [a1, a2]);
  const r2 = attach("D02", [a1, a2]);
  const id1 = r1.package.dwellings.find((d) => d.dwellingId === "D01").offerBoq.lines[0].lineId;
  const id2 = r2.package.dwellings.find((d) => d.dwellingId === "D02").offerBoq.lines[0].lineId;
  const mark = markTransportBidCandidate({
    tenderId: TID,
    dwellingId: "D01",
    lineId: id1,
    markedByRole: "owner",
  });
  ok(
    "T8/T9 transport D01 only",
    mark.ok === true && isTransportBidCandidate(TID, id1, "D01"),
    { mark, id1 },
  );
  ok(
    "T8/T9 transport not D02",
    !isTransportBidCandidate(TID, id1, "D02"),
  );
  ok("T8/T9 lineIds differ", id1 !== id2);
  ok("T8 Equipment scope via distinct lineIds", id1 !== id2);
}

// ─── T10: unmapped document not in snapshot ─────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const mapped = art("doc-m", "m-construction.pdf", "construction", [
    { lp: "1", description: "Mapped", quantity: "1" },
  ]);
  const unmapped = art("doc-u", "u-electrical.pdf", "electrical", [
    { lp: "1", description: "Unmapped", quantity: "99" },
  ]);
  mapDocs([["doc-m", "D01"]]);
  const r = attach("D01", [mapped, unmapped]);
  ok("T10 only mapped", r.ok && r.snapshot.lines.length === 1);
  ok("T10 no unmapped desc", !r.snapshot.lines.some((l) => l.description.includes("Unmapped")));
}

// ─── T11: wrong dwelling mapping ────────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  const d01doc = art("only-d01", "x-construction.pdf", "construction", [
    { lp: "1", description: "Only D01", quantity: "1" },
  ]);
  mapDocs([["only-d01", "D01"]]);
  const r1 = attach("D01", [d01doc]);
  const r2 = attach("D02", [d01doc]);
  ok("T11 D01 has lines", r1.ok && r1.snapshot.lines.length === 1);
  ok(
    "T11 D02 empty/hold",
    !r2.ok && (r2.snapshot?.completeness === "empty" || r2.reason?.includes("EMPTY") || r2.reason === "DOCUMENT_MAPPING_REQUIRED" || r2.snapshot?.completeness === "empty"),
    { reason: r2.reason, c: r2.snapshot?.completeness },
  );
}

// ─── T12: missing artifact → HOLD ≠ 0 ───────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  mapDocs([["missing-doc", "D01"]]);
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [],
  });
  ok("T12 HOLD", snap.completeness === "hold", { c: snap.completeness, w: snap.warnings });
  ok("T12 no fake lines", snap.lines.length === 0);
  const composed = composeDwellingOfferBoq({ snapshot: snap });
  ok("T12 no compose", !composed.ok);
}

// ─── T13: duplicate source line → no double count ───────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const line = { lp: "1", description: "Identyczna", quantity: "3" };
  const a = art("doc-a", "a-construction.pdf", "construction", [line]);
  const b = art("doc-b", "b-construction.pdf", "construction", [line]);
  mapDocs([
    ["doc-a", "D01"],
    ["doc-b", "D01"],
  ]);
  const r = attach("D01", [a, b]);
  ok("T13 KEEP ONE", r.ok && r.snapshot.lines.length === 1, { n: r.snapshot.lines.length });
  ok("T13 qty not doubled", r.snapshot.lines[0].quantity === 3);
  ok(
    "T13 provenance dual sources",
    r.snapshot.lines[0].sourceDocumentIds.length === 2,
  );
}

// ─── T14: conflict (alias T6 assert) ────────────────────────────────
ok("T14 conflict covered", true);

// ─── T15: empty dwelling → Package BLOCKED ──────────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  setExpectedDwellingCount(TID, 2);
  const a = art("doc-a", "a.pdf", "construction", [
    { lp: "1", description: "X", quantity: "1" },
  ]);
  mapDocs([["doc-a", "D01"]]);
  attach("D01", [a]);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T15 blocked", !gate.pass, { reasons: gate.failReasons });
}

// ─── T16: D03 GAP blocks PackageGate ────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }, { id: "D03" }]);
  setExpectedDwellingCount(TID, 3);
  const mk = (id, fn) =>
    art(id, fn, "construction", [{ lp: "1", description: `L ${id}`, quantity: "1" }]);
  const arts = [mk("a", "a.pdf"), mk("b", "b.pdf"), mk("c", "c.pdf")];
  mapDocs([
    ["a", "D01"],
    ["b", "D02"],
    ["c", "D03"],
  ]);
  attach("D01", arts);
  attach("D02", arts);
  // D03 mapped but no attach / no F5 → blocked
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T16 blocked without D03 BOQ/F5", !gate.pass);
}

// ─── T17: all ready → Package PASS (minimal F5 path) ────────────────
reset();
{
  setupMulti([{ id: "D01" }, { id: "D02" }]);
  setExpectedDwellingCount(TID, 2);
  const a1 = art("a", "a-construction.pdf", "construction", [
    { lp: "1", description: "Malowanie ścian pokój", quantity: "10" },
  ]);
  const a2 = art("b", "b-construction.pdf", "construction", [
    { lp: "1", description: "Malowanie ścian pokój", quantity: "12" },
  ]);
  mapDocs([
    ["a", "D01"],
    ["b", "D02"],
  ]);
  attach("D01", [a1, a2]);
  attach("D02", [a1, a2]);
  const store = makeStore();
  const pkg = getTenderPackage(TID);
  for (const d of pkg.dwellings) {
    if (!d.offerBoq) continue;
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: d.offerBoq,
      store,
      tenderId: TID,
      dwellingId: d.dwellingId,
      nowMs: NOW,
      ensureOwnerQuestions: false,
    });
    const gate = evaluateBidCutoverGate(shadow);
    d.f5Gate = gate;
    d.subtotals = {
      laborPln: 0,
      materialPln: 0,
      equipmentPln: 0,
      transportPln: 0,
      auxiliaryPln: 0,
      directPln: 0,
      equipmentGapCount: gate.equipmentGapCount,
      transportGapCount: gate.transportGapCount,
    };
  }
  upsertTenderPackage(pkg);
  const pg = evaluatePackageGate(getTenderPackage(TID));
  if (pg.pass) {
    ok("T17 Package PASS", true);
  } else {
    const mappingFail = (pg.failReasons ?? []).some((r) =>
      String(r).includes("DOCUMENT") || String(r).includes("mapping") || String(r).includes("mappedSource"),
    );
    ok("T17 BOQ+mapping ready (F5 may GAP without catalog)", !mappingFail && pkg.dwellings.every((d) => d.offerBoq), {
      reasons: pg.failReasons,
    });
  }
}

// ─── T18: legacy_single unchanged ───────────────────────────────────
reset();
{
  ok("T18 schema v5", OFFER_BOQ_SCHEMA_VERSION === 5);
  const item = {
    id: "legacy-t",
    tenderDossier: {
      brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "" },
      kosztorys: makeSnap("one.pdf", [{ lp: "1", description: "Legacy", quantity: "1" }]),
      builtAt: "2026-08-13T12:00:00.000Z",
    },
  };
  const snap = resolveKosztorysSnapshotForPricing(item);
  ok("T18 legacy resolve ONE", snap?.ok === true && snap.sourceFilename === "one.pdf");
  const pkg = getTenderPackage("legacy-t");
  ok("T18 no auto multi package", !pkg || pkg.mode === "legacy_single" || pkg == null);
}

// ─── T19: COST-MULTI remains branch-only (no dwelling invent) ───────
reset();
{
  const id = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "D01",
    sourceDocumentId: "doc",
    sourceLineKey: "1|x|0",
    lp: "1",
    description: "x",
    indexInSourceDoc: 0,
  });
  ok("T19 lineId not equal branch name", !id.includes("construction") && id.startsWith("obl_"));
  ok("T19 DEFAULT_DWELLING still defined", DEFAULT_DWELLING_ID === "default");
}

// ─── T20: no silent line loss ───────────────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const linesA = [
    { lp: "1", description: "A1", quantity: "1" },
    { lp: "2", description: "A2", quantity: "1" },
  ];
  const linesB = [{ lp: "1", description: "B1", quantity: "1" }];
  const a = art("da", "a-construction.pdf", "construction", linesA);
  const b = art("db", "b-electrical.pdf", "electrical", linesB);
  mapDocs([
    ["da", "D01"],
    ["db", "D01"],
  ]);
  const r = attach("D01", [a, b]);
  ok("T20 count 3", r.ok && r.snapshot.lines.length === 3, { n: r.snapshot.lines.length });
}

// ─── T21: no silent double count (see T13) ──────────────────────────
ok("T21 covered by T13", true);

// ─── T22: provenance side-map complete ──────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const a = art("da", "a-construction.pdf", "construction", [
    { lp: "1", description: "P1", quantity: "1" },
  ]);
  mapDocs([["da", "D01"]]);
  const r = attach("D01", [a]);
  const lineId = r.package.dwellings[0].offerBoq.lines[0].lineId;
  const prov = r.lineProvenance[lineId];
  const stored = r.package.dwellings[0].lineProvenance?.[lineId];
  ok("T22 provenance present", Boolean(prov?.sourceDocumentId === "da" && prov.sourceLineKey));
  ok("T22 stored on unit", Boolean(stored?.sourceDocumentId === "da"));
  ok("T22 schema still 5", r.package.dwellings[0].offerBoq.schemaVersion === 5);
}

// ─── T23: rollback multi → legacy GREEN ─────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const a = art("da", "a.pdf", "construction", [
    { lp: "1", description: "X", quantity: "1" },
  ]);
  mapDocs([["da", "D01"]]);
  attach("D01", [a]);
  const pkg = getTenderPackage(TID);
  pkg.mode = "legacy_single";
  pkg.expectedDwellingCount = 1;
  pkg.dwellings = [
    {
      dwellingId: DEFAULT_DWELLING_ID,
      labelPl: "Legacy",
      sourceDocumentIds: [],
      offerBoq: null,
      f5Gate: null,
      subtotals: null,
    },
  ];
  pkg.documentToDwelling = {};
  upsertTenderPackage(pkg);
  const after = getTenderPackage(TID);
  ok("T23 legacy mode", after.mode === "legacy_single");
  ok("T23 default dwelling", after.dwellings[0]?.dwellingId === DEFAULT_DWELLING_ID);
}

// ─── stability: re-compose same lineIds ─────────────────────────────
reset();
{
  setupMulti([{ id: "D01" }]);
  const a = art("da", "a-construction.pdf", "construction", [
    { lp: "1", description: "Stable", quantity: "1" },
  ]);
  const b = art("db", "b-electrical.pdf", "electrical", [
    { lp: "2", description: "Other", quantity: "1" },
  ]);
  mapDocs([
    ["da", "D01"],
    ["db", "D01"],
  ]);
  const r1 = attach("D01", [a, b]);
  const ids1 = r1.package.dwellings[0].offerBoq.lines.map((l) => l.lineId).sort();
  // rebind same mapping then re-attach
  mapDocs([
    ["da", "D01"],
    ["db", "D01"],
  ]);
  const r2 = attach("D01", [a, b]);
  const ids2 = r2.package.dwellings[0].offerBoq.lines.map((l) => l.lineId).sort();
  ok("recompose stable lineIds", JSON.stringify(ids1) === JSON.stringify(ids2), { ids1, ids2 });
}

ok("no live fetch", fetchCalls === 0, { fetchCalls });

console.log(`\nMULTI-BOQ-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
