/**
 * OD-OCR-18 — Owner ingest C2 caller wiring tests (T18-1…T18-12).
 * npx vite-node scripts/test-ik-ocr-18-ingest-c2-wire.mjs
 */
import {
  applyIngestArtifactsToPipelineItem,
  clearIngestStore,
  connectIntraPdfDerivedCostDocuments,
  getIngestState,
  retainOwnerFile,
  runOwnerIngestParseWithIntraPdfC2,
} from "../src/lib/tender-ingest/index.ts";
import {
  buildOfferBoqLineIdWithSource,
  buildSourceLineKey,
} from "../src/lib/multi-boq/line-id.ts";
import {
  clearMultiDwellingPackageStore,
  getTenderPackage,
} from "../src/lib/multi-dwelling/index.ts";
import { readFileSync } from "node:fs";

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

function reset() {
  clearIngestStore();
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

function page(pageIndex, text, confidence = 86) {
  return { pageIndex, text, confidence, status: "ok" };
}

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

function previewOk(filename, rows = [{ lp: "1", name: "Poz", quantity: "1", unit: "m2" }]) {
  return {
    ok: true,
    format: "pdf_przedmiar",
    rows,
    warnings: [],
    title: filename,
    extractionMethod: "ocr",
    ocrConfidence: 88,
  };
}

const TID = "tender-od-ocr-18";

console.log("\n=== OD-OCR-18 ingest C2 wire ===\n");

// T18-1 / T18-2 / T18-3 / T18-4 / T18-5
reset();
{
  const bytes = new TextEncoder().encode("%PDF-1.4 przedmiar-wire-test");
  const retained = await retainOwnerFile({
    tenderId: TID,
    originalFilename: "Przedmiar.pdf",
    bytes,
  });
  const P = retained.documentIds[0];
  ok(!!P && retained.documentIds.length === 1, "T18-1 retainOwnerFile returns P.documentId", { P });

  /** @type {any[]} */
  const calls = [];
  await runOwnerIngestParseWithIntraPdfC2({
    tenderId: TID,
    bytesByDocumentId: { [P]: bytes },
    parseDocumentToKosztorys: async (b, filename, opts) => {
      calls.push({
        byteLen: b.byteLength,
        filename,
        force: opts?.forcePdfPrzedmiar,
        intra: opts?.intraPdfDerived ? { ...opts.intraPdfDerived } : null,
      });
      await connectIntraPdfDerivedCostDocuments({
        tenderId: TID,
        parentDocumentId: opts?.intraPdfDerived?.parentDocumentId ?? "",
        parentDisplayName: filename,
        ocr: { pages: makeTpiClassPages() },
      });
      return previewOk(filename);
    },
  });

  ok(calls.length === 1, "T18-2 single parse for one retained P", { n: calls.length });
  ok(
    calls[0]?.intra?.parentDocumentId === P,
    "T18-2 closure receives exact P.documentId",
    calls[0]?.intra,
  );
  ok(calls[0]?.force === true && !!calls[0]?.intra, "T18-3 intraPdfDerived option present", calls[0]);
  ok(calls[0]?.intra?.tenderId === TID, "T18-4 tenderId passed", calls[0]?.intra);
  ok(
    calls[0]?.intra?.parentDisplayName === "Przedmiar.pdf",
    "T18-5 parentDisplayName passed",
    calls[0]?.intra,
  );
}

// T18-6 — other callers remain opt-in (no auto C2 without opts)
{
  const src = readFileSync(
    new URL("../src/lib/tender-document-resolver.ts", import.meta.url),
    "utf8",
  );
  const ath = readFileSync(
    new URL("../src/lib/tender-ath-quick-access.ts", import.meta.url),
    "utf8",
  );
  ok(
    !src.includes("intraPdfDerived") && !ath.includes("intraPdfDerived"),
    "T18-6 dossier/ATH callers do not pass intraPdfDerived",
  );
}

// T18-7 / T18-8 — re-bridge + distinct derived ids
reset();
{
  const bytes = new TextEncoder().encode("%PDF-1.4 before-bridge");
  const retained = await retainOwnerFile({
    tenderId: TID,
    originalFilename: "Przedmiar.pdf",
    bytes,
  });
  const P = retained.documentIds[0];

  await runOwnerIngestParseWithIntraPdfC2({
    tenderId: TID,
    bytesByDocumentId: { [P]: bytes },
    parseDocumentToKosztorys: async (_b, filename, opts) => {
      await connectIntraPdfDerivedCostDocuments({
        tenderId: TID,
        parentDocumentId: opts.intraPdfDerived.parentDocumentId,
        parentDisplayName: filename,
        ocr: { pages: makeTpiClassPages() },
      });
      return previewOk(filename, [
        { lp: "1", name: "A", quantity: "1", unit: "m2" },
        { lp: "2", name: "B", quantity: "2", unit: "m2" },
      ]);
    },
  });

  const st = getIngestState(TID);
  const derived = (st?.documents ?? []).filter((d) => d.source === "derived_cost_segment");
  ok(derived.length === 3, "T18-8 three derived docs", { n: derived.length });
  ok(
    new Set(derived.map((d) => d.documentId)).size === 3,
    "T18-8 distinct sourceDocumentIds",
  );
  ok(
    derived.every((d) => d.parentDocumentId === P),
    "T18-8 parent lineage = P",
  );

  const item = {
    id: TID,
    tenderId: TID,
    title: "T18",
    organizationName: "Org",
  };
  const patch = applyIngestArtifactsToPipelineItem(item);
  const pool =
    patch.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? [];
  const derivedArts = pool.filter((a) =>
    derived.some((d) => d.documentId === a.documentId),
  );
  ok(
    derivedArts.length === 3,
    "T18-7 D artifacts visible in item pool after re-bridge",
    { pool: pool.length, derivedArts: derivedArts.length },
  );
  ok(
    derivedArts.every((a) => a.branch === "construction" || a.branch === "sanitary" || a.branch === "electrical"),
    "T18-7 explicit branches on pool artifacts",
    derivedArts.map((a) => a.branch),
  );
}

// T18-9 line identity unchanged (sourceDocumentId-based)
{
  const id1 = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "doc_d1",
    sourceLineKey: buildSourceLineKey("1", "Poz", 0),
    lp: "1",
    description: "Poz",
    indexInSourceDoc: 0,
  });
  const id2 = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "doc_d2",
    sourceLineKey: buildSourceLineKey("1", "Poz", 0),
    lp: "1",
    description: "Poz",
    indexInSourceDoc: 0,
  });
  const id3 = buildOfferBoqLineIdWithSource({
    tenderId: TID,
    dwellingId: "DX",
    sourceDocumentId: "doc_d3",
    sourceLineKey: buildSourceLineKey("1", "Poz", 0),
    lp: "1",
    description: "Poz",
    indexInSourceDoc: 0,
  });
  ok(id1 !== id2 && id2 !== id3 && id1 !== id3, "T18-9 distinct lineIds for LP=1 across D");
}

// T18-10 Owner Map not auto-populated
{
  const pkg = getTenderPackage(TID);
  ok(
    !pkg || Object.keys(pkg.documentToDwelling ?? {}).length === 0,
    "T18-10 Owner Map not auto-populated",
    pkg?.documentToDwelling,
  );
}

// T18-11 HOLD / no OCR invent — parse returns ok:false → no derived
reset();
{
  const bytes = new TextEncoder().encode("%PDF hold");
  const retained = await retainOwnerFile({
    tenderId: TID,
    originalFilename: "Przedmiar.pdf",
    bytes,
  });
  await runOwnerIngestParseWithIntraPdfC2({
    tenderId: TID,
    bytesByDocumentId: { [retained.documentIds[0]]: bytes },
    parseDocumentToKosztorys: async () => ({
      ok: false,
      format: "pdf_przedmiar",
      rows: [],
      warnings: ["OCR B1 HOLD"],
    }),
  });
  const st = getIngestState(TID);
  const derived = (st?.documents ?? []).filter((d) => d.source === "derived_cost_segment");
  ok(derived.length === 0, "T18-11 HOLD → no derived documents", { n: derived.length });
  const P = st?.documents.find((d) => d.source === "owner_upload");
  ok(P?.parseStatus === "failed", "T18-11 physical parse failed fail-soft", P?.parseStatus);
}

// T18-12 ordinary non-C2 ingest still works (process path without derived when inject skips C2)
reset();
{
  const bytes = new TextEncoder().encode("%PDF plain");
  const r = await retainOwnerFile({
    tenderId: TID,
    originalFilename: "Przedmiar.pdf",
    bytes,
  });
  await runOwnerIngestParseWithIntraPdfC2({
    tenderId: TID,
    bytesByDocumentId: { [r.documentIds[0]]: bytes },
    parseDocumentToKosztorys: async (_b, filename, opts) => {
      ok(
        opts?.intraPdfDerived?.parentDocumentId === r.documentIds[0],
        "T18-12 still receives C2 opts on owner ingest seam",
      );
      return previewOk(filename);
    },
  });
  const st = getIngestState(TID);
  ok(
    (st?.artifacts ?? []).some((a) => a.documentId === r.documentIds[0]),
    "T18-12 physical artifact recorded without derived",
  );
  ok(
    (st?.documents ?? []).filter((d) => d.source === "derived_cost_segment").length === 0,
    "T18-12 no derived when CONNECT not ACCEPT",
  );
}

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===\n`);
if (failed > 0) process.exit(1);
