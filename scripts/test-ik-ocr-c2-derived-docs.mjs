/**
 * OD-OCR-15 C2 — Intra-PDF derived cost documents CONNECT tests (T1–T16).
 * npx vite-node scripts/test-ik-ocr-c2-derived-docs.mjs
 */
import {
  acceptIntraPdfCostSegments,
  applyIngestArtifactsToPipelineItem,
  clearIngestStore,
  computeDerivedSegmentContentHash,
  connectIntraPdfDerivedCostDocuments,
  emptyIngestState,
  expandZipArchive,
  getIngestState,
  normalizeSegmentText,
  proposeIntraPdfCostSegments,
  registerDerivedCostDocument,
  upsertIngestState,
} from "../src/lib/tender-ingest/index.ts";
import {
  buildOfferBoqLineIdWithSource,
  buildSourceLineKey,
} from "../src/lib/multi-boq/line-id.ts";
import {
  composeDwellingOfferBoq,
  resolveDwellingCostSnapshotForPricing,
} from "../src/lib/multi-boq/index.ts";
import {
  clearMultiDwellingPackageStore,
  enableMultiDwellingMode,
  getTenderPackage,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
  confirmDwelling,
} from "../src/lib/multi-dwelling/index.ts";

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

let passed = 0;
let failed = 0;

function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`, extra ?? "");
  }
}

const TID = "tender-c2-ocr-15";

function page(pageIndex, text, confidence = 86) {
  return { pageIndex, text, confidence, status: "ok" };
}

/** TPI/729-class OCR pages (0-based): construction / sanitary / electrical. */
function makeTpiClassPages() {
  const pages = [];
  for (let i = 0; i < 14; i++) {
    pages.push(
      page(
        i,
        `Przedmiar Poszcz. Razem Lp. Podstawa\n${i + 1} KNR 401-0701-1100 Skucie tynkow m2 10,00\nNorma STANDARD`,
      ),
    );
  }
  pages.push(
    page(
      14,
      `Przedmiar Lp. Podstawa Opis\nPRZEDMIAR: 1\nInstalacja wodociagowa\n1 KNR-W 4-02 Demontaz zaworu szt 1,000`,
    ),
  );
  for (let i = 15; i < 19; i++) {
    pages.push(
      page(i, `Przedmiar\n${i} KNR-W 2-15 Baterie umywalkowe szt 1\nInstalacja kanalizacji`),
    );
  }
  pages.push(
    page(
      19,
      `ZGMTBS Sp. z o.o.\nPRZEDMIAR ROBOT ORGBUD-SERWIS Poznan\nKOBRA wer. 11\n1 KNR 508-0813-03-00 IZOiEPB ORGBUD W-wa szt 1`,
    ),
  );
  for (let i = 20; i < 23; i++) {
    pages.push(
      page(
        i,
        `PRZEDMIAR ROBOT ORGBUD-SERWIS\nKOBRA wer. 11\n${i} KNR 403-1001-01-00 IZOiEPB ORGBUD W-wa szt 2`,
      ),
    );
  }
  return pages;
}

function art(documentId, filename, branchHint, lines) {
  return {
    documentId,
    artifactId: `art:test:${documentId}`,
    filename,
    branchHint,
    snapshot: {
      ok: true,
      sourceFilename: filename,
      rows: lines.map((l) => ({
        lp: l.lp,
        description: l.description,
        unit: l.unit ?? "szt",
        quantity: l.quantity ?? "1",
        unitPrice: "",
        total: "",
      })),
      rowCount: lines.length,
      warnings: [],
    },
  };
}

function setupMulti(dwellings) {
  enableMultiDwellingMode(TID, { expectedDwellingCount: dwellings.length });
  setExpectedDwellingCount(TID, dwellings.length);
  for (const d of dwellings) {
    confirmDwelling({
      tenderId: TID,
      dwellingId: d.dwellingId,
      labelPl: d.labelPl ?? d.dwellingId,
    });
  }
}

function reset() {
  clearIngestStore();
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

console.log("\n=== OD-OCR-15 C2 derived docs ===\n");

reset();
{
  console.log("T7/T8 HOLD paths");
  const weak = acceptIntraPdfCostSegments([
    page(0, "Przedmiar robot budowlanych bez restartu"),
    page(1, "kolejna strona tez slabasignal"),
  ]);
  ok(weak.status === "hold", "T8 weak-only HOLD", weak);
  const amb2 = acceptIntraPdfCostSegments([
    page(0, "PRZEDMIAR: 1 KNR-W Instalacja wodociagowa"),
  ]);
  ok(amb2.status === "hold", "T7 HOLD no prior construction segment", amb2.warnings);
}

reset();
{
  console.log("T3/T9/T10/T11/T14 connect + lineage");
  upsertIngestState({
    ...emptyIngestState(TID),
    documents: [
      {
        documentId: "doc_physical_p",
        tenderId: TID,
        source: "owner_upload",
        originalFilename: "Przedmiar.pdf",
        displayName: "Przedmiar.pdf",
        contentHash: "parenthash",
        mimeType: "application/pdf",
        size: 100,
        ingestStatus: "retained",
        classHint: "COST",
        parseStatus: "parsed",
        warnings: [],
      },
    ],
  });

  const pages = makeTpiClassPages();
  ok(pages.length === 23, "TPI-class 23 pages");

  const seg = acceptIntraPdfCostSegments(pages);
  ok(seg.status === "accept", "T3 segmentation ACCEPT", seg.warnings);
  ok(seg.accepted.length === 3, "T3 three accepted segments", seg.accepted);
  ok(seg.accepted[0]?.branch === "construction", "T3 BOQ1 construction");
  ok(seg.accepted[1]?.branch === "sanitary", "T3 BOQ2 sanitary");
  ok(seg.accepted[2]?.branch === "electrical", "T3 BOQ3 electrical");
  ok(
    seg.accepted[0]?.startPageIndex === 0 && seg.accepted[0]?.endPageIndex === 13,
    "T11 range BOQ1 0-13",
    seg.accepted[0],
  );
  ok(
    seg.accepted[1]?.startPageIndex === 14 && seg.accepted[1]?.endPageIndex === 18,
    "T11 range BOQ2 14-18",
    seg.accepted[1],
  );
  ok(
    seg.accepted[2]?.startPageIndex === 19 && seg.accepted[2]?.endPageIndex === 22,
    "T11 range BOQ3 19-22",
    seg.accepted[2],
  );

  const connected = await connectIntraPdfDerivedCostDocuments({
    tenderId: TID,
    parentDocumentId: "doc_physical_p",
    parentDisplayName: "Przedmiar.pdf",
    ocr: { pages },
  });
  ok(connected.status === "accepted", "T3 connect accepted", connected.warnings);
  ok(connected.derivedDocumentIds.length === 3, "T3 three derived ids");

  const state = getIngestState(TID);
  const derived = state.documents.filter((d) => d.source === "derived_cost_segment");
  ok(derived.length === 3, "T14 derived_cost_segment count");
  ok(derived.every((d) => d.source === "derived_cost_segment"), "T14 not owner_upload");
  ok(derived.every((d) => d.parentDocumentId === "doc_physical_p"), "T10 parentDocumentId");
  ok(
    derived.every((d) => typeof d.startPageIndex === "number" && typeof d.endPageIndex === "number"),
    "T11 page indexes present",
  );
  ok(state.artifacts.length === 3, "T3 three artifacts");
  ok(state.artifacts.every((a) => a.branch), "branch explicit on artifacts");

  const again = await connectIntraPdfDerivedCostDocuments({
    tenderId: TID,
    parentDocumentId: "doc_physical_p",
    parentDisplayName: "Przedmiar.pdf",
    ocr: { pages },
  });
  ok(again.status === "accepted", "T9 rerun accepted");
  ok(
    again.derivedDocumentIds.join("|") === connected.derivedDocumentIds.join("|"),
    "T9 idempotent derived ids",
    { first: connected.derivedDocumentIds, second: again.derivedDocumentIds },
  );
  const state2 = getIngestState(TID);
  ok(
    state2.documents.filter((d) => d.source === "derived_cost_segment").length === 3,
    "T9 no duplicate derived docs",
  );
}

{
  console.log("contentHash");
  const a = await computeDerivedSegmentContentHash({
    parentDocumentId: "P",
    startPageIndex: 0,
    endPageIndex: 1,
    normalizedSegmentText: normalizeSegmentText("  hello\n\nworld  "),
  });
  const b = await computeDerivedSegmentContentHash({
    parentDocumentId: "P",
    startPageIndex: 0,
    endPageIndex: 1,
    normalizedSegmentText: "hello\n\nworld",
  });
  ok(a === b && a.length === 64, "segment contentHash stable");
}

reset();
{
  console.log("T1/T2/T4/T5/T6/T13 Multi-BOQ");
  setupMulti([
    { dwellingId: "D01", labelPl: "Lokal 1" },
    { dwellingId: "D02", labelPl: "Lokal 2" },
  ]);

  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-a", dwellingId: "D01" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-b", dwellingId: "D02" });
  const a1 = art("phys-a", "a-construction.pdf", "construction", [{ lp: "1", description: "Prace A" }]);
  const b1 = art("phys-b", "b-electrical.pdf", "electrical", [{ lp: "1", description: "Prace B" }]);
  const r1 = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [a1, b1],
  });
  ok(r1.completeness === "ready" && r1.lines.length === 1, "T1 D01 one mapped doc", r1);
  ok(r1.sourceDocumentIds.includes("phys-a"), "T1 source phys-a");

  clearMultiDwellingPackageStore();
  setupMulti([{ dwellingId: "D01", labelPl: "Lokal 1" }]);
  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-c", dwellingId: "D01" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-e", dwellingId: "D01" });
  const c = art("phys-c", "c-construction.pdf", "construction", [
    { lp: "5", description: "Pozycja A", quantity: "1" },
  ]);
  const e = art("phys-e", "e-electrical.pdf", "electrical", [
    { lp: "5", description: "Pozycja B", quantity: "2" },
  ]);
  const r2 = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [c, e],
  });
  const composed2 = composeDwellingOfferBoq({ snapshot: r2 });
  ok(composed2.ok && composed2.document.lines.length === 2, "T2/T5 KEEP BOTH same LP distinct branch", {
    n: composed2.ok ? composed2.document.lines.length : 0,
    c: r2.completeness,
  });

  clearMultiDwellingPackageStore();
  setupMulti([{ dwellingId: "D01", labelPl: "Lokal 1" }]);
  const c2 = art("phys-c2", "c2-construction.pdf", "construction", [
    { lp: "7", description: "Wariant Alpha" },
  ]);
  const c3 = art("phys-c3", "c3-construction.pdf", "construction", [
    { lp: "7", description: "Wariant Beta" },
  ]);
  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-c2", dwellingId: "D01" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "phys-c3", dwellingId: "D01" });
  const r6 = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "D01",
    artifacts: [c2, c3],
  });
  ok(r6.completeness === "conflict", "T6 CONFLICT HOLD", r6.warnings);

  clearMultiDwellingPackageStore();
  setupMulti([{ dwellingId: "DX", labelPl: "Jeden lokal" }]);
  const d1 = art("der-1", "P#p0-13:construction", "construction", [
    { lp: "1", description: "Skucie tynkow", quantity: "10" },
  ]);
  const d2 = art("der-2", "P#p14-18:sanitary", "sanitary", [
    { lp: "1", description: "Demontaz zaworu", quantity: "1" },
  ]);
  const d3 = art("der-3", "P#p19-22:electrical", "electrical", [
    { lp: "1", description: "Tablica mieszkaniowa", quantity: "1" },
  ]);
  for (const id of ["der-1", "der-2", "der-3"]) {
    const m = mapDocumentToDwelling({ tenderId: TID, documentId: id, dwellingId: "DX" });
    ok(m.ok, `T13 map ${id}->DX`);
  }
  const pkg = getTenderPackage(TID);
  ok(pkg.documentToDwelling["der-1"] === "DX", "T13 no invent dwellings");
  const r3 = resolveDwellingCostSnapshotForPricing({
    tenderId: TID,
    dwellingId: "DX",
    artifacts: [d1, d2, d3],
  });
  ok(r3.completeness === "ready" && r3.lines.length === 3, "T3 three lines composed", r3);
  const composed3 = composeDwellingOfferBoq({ snapshot: r3 });
  ok(composed3.ok && composed3.document.lines.length === 3, "T3 compose 3 lines");

  const idA = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "der-1",
    sourceLineKey: buildSourceLineKey("1", "Skucie tynkow", 0),
    lp: "1",
    description: "Skucie tynkow",
    indexInSourceDoc: 0,
  });
  const idB = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "der-2",
    sourceLineKey: buildSourceLineKey("1", "Demontaz zaworu", 0),
    lp: "1",
    description: "Demontaz zaworu",
    indexInSourceDoc: 0,
  });
  const idC = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "der-3",
    sourceLineKey: buildSourceLineKey("1", "Tablica mieszkaniowa", 0),
    lp: "1",
    description: "Tablica mieszkaniowa",
    indexInSourceDoc: 0,
  });
  ok(idA !== idB && idB !== idC && idA !== idC, "T4 distinct lineIds for LP=1x3");

  const pkg2 = getTenderPackage(TID);
  ok(!!pkg2 && pkg2.mode === "multi", "T15 package loads");
}

reset();
{
  console.log("T12 ZIP lineage");
  const emptyZip = Uint8Array.from([]);
  const expanded = await expandZipArchive({
    tenderId: TID,
    originalFilename: "x.zip",
    bytes: emptyZip,
  });
  ok(expanded.ok === false, "T12 corrupt zip not inventing children");
  upsertIngestState(emptyIngestState(TID));
  const { document } = await registerDerivedCostDocument({
    tenderId: TID,
    parentDocumentId: "parentX",
    startPageIndex: 0,
    endPageIndex: 0,
    segmentText: "1 KNR test m2 1",
  });
  ok(document.parentArchiveId === undefined, "T12 derived has no parentArchiveId");
  ok(document.parentDocumentId === "parentX", "T12 uses parentDocumentId");
}

{
  console.log("T16 imports");
  const { runIkDocumentExpert } = await import("../src/lib/intelligent-estimator/ik-document-expert.ts");
  ok(typeof runIkDocumentExpert === "function", "T16 Document Expert export intact");
  const orch = await import("../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
  ok(Object.keys(orch).length > 0, "T16 Orchestra module loads", Object.keys(orch).slice(0, 8));
}

reset();
{
  console.log("branch bridge");
  upsertIngestState({
    ...emptyIngestState(TID),
    documents: [],
    artifacts: [
      {
        documentId: "d-bridge",
        filename: "Przedmiar.pdf",
        contentHash: "h1",
        branch: "sanitary",
        snapshot: {
          ok: true,
          sourceFilename: "Przedmiar.pdf",
          rows: [{ lp: "1", description: "x", unit: "szt", quantity: "1", unitPrice: "", total: "" }],
          rowCount: 1,
          warnings: [],
        },
      },
    ],
  });
  const patch = applyIngestArtifactsToPipelineItem({
    id: TID,
    tenderId: TID,
    title: "t",
    organizationName: "o",
  });
  const arts = patch.tenderDossier?.scanSummary?.branchWinnerArtifacts ?? [];
  ok(arts[0]?.branch === "sanitary", "bridge prefers explicit branch over filename", arts[0]);
}

void proposeIntraPdfCostSegments;

console.log(`\n=== RESULT ${passed} passed / ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
