/**
 * ATH/PDF autonomous reconciliation — Środa regression + unit gates.
 * npx vite-node scripts/test-multi-boq-ath-pdf-reconcile-sroda.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import {
  mergeDwellingArtifactLines,
  normalizeBoqLineForMerge,
  parseCanonicalQuantity,
  normalizeUnitFamily,
  canReconcileAthPdfPair,
  composeDwellingOfferBoq,
  countExtractableLinesFromArtifacts,
} from "../src/lib/multi-boq/index.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";
import { countKeepOneCollapsedFromWarnings } from "../src/lib/intelligent-estimator/ik-dwelling-mapping.ts";

Object.assign(process.env, loadEnv("", join(process.cwd()), ""));

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

function makeSnap(filename, rows) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount: rows.length,
    rows: rows.map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
      code: r.code ?? "",
      unitPrice: "",
      total: "",
    })),
  };
}

function art(documentId, filename, branchHint, rows) {
  return {
    documentId,
    artifactId: `art-${documentId}`,
    filename,
    branchHint,
    snapshot: makeSnap(filename, rows),
  };
}

// ─── TEST 4: format qty ─────────────────────────────────────────────
{
  const a = parseCanonicalQuantity("4\t4\t\t1");
  const b = parseCanonicalQuantity("4,00");
  ok("T4 canonical qty match", a.canonical === b.canonical && a.canonical === "4");
  const m = mergeDwellingArtifactLines([
    art("ath", "p.ath", "unknown", [
      { lp: "1", description: "Roboty", unit: "szt.", quantity: "4\t4\t\t1" },
    ]),
    art("pdf", "p.pdf", "unknown", [
      { lp: "1", description: "Roboty", unit: "szt", quantity: "4,00" },
    ]),
  ]);
  ok("T4 merge ready", m.completeness === "ready", m);
  ok("T4 one line", m.lines.length === 1, { n: m.lines.length });
  ok("T4 both sources", m.lines[0]?.sourceDocumentIds?.length === 2);
}

// ─── TEST 5: unit punctuation ─────────────────────────────────────
{
  const m = mergeDwellingArtifactLines([
    art("ath", "a.ath", "unknown", [
      { lp: "2", description: "Bateria", unit: "szt.", quantity: "1" },
    ]),
    art("pdf", "b.pdf", "unknown", [
      { lp: "2", description: "Bateria", unit: "szt", quantity: "1,00" },
    ]),
  ]);
  ok("T5 unit punct ready", m.completeness === "ready");
  ok("T5 unit punct one line", m.lines.length === 1);
}

// ─── TEST 6: description parser noise (KNR suffix) ─────────────────
{
  const m = mergeDwellingArtifactLines([
    art("ath", "a.ath", "unknown", [
      {
        lp: "1",
        description: "Wymiana kuchenki elektrycznej czteropalnikowej.",
        unit: "szt.",
        quantity: "4\t4\t\t1",
      },
    ]),
    art("pdf", "b.pdf", "unknown", [
      {
        lp: "1",
        description: "Wymiana kuchenki elektrycznej czteropalnikowej. szt d.1 1309-09 R*1,50 analogia 4",
        unit: "szt",
        quantity: "4,00",
      },
    ]),
  ]);
  ok("T6 desc noise ready", m.completeness === "ready", m);
  ok("T6 desc noise one line", m.lines.length === 1);
}

// ─── TEST 2: material qty conflict ────────────────────────────────
{
  const m = mergeDwellingArtifactLines([
    art("ath", "a.ath", "unknown", [
      { lp: "3", description: "Ta sama pozycja", unit: "szt.", quantity: "4" },
    ]),
    art("pdf", "b.pdf", "unknown", [
      { lp: "3", description: "Ta sama pozycja", unit: "szt", quantity: "6,00" },
    ]),
  ]);
  ok("T2 qty conflict hold", m.completeness === "conflict", m);
  const composed = composeDwellingOfferBoq({
    snapshot: {
      tenderId: "t",
      dwellingId: "d",
      sourceDocumentIds: ["a.ath", "b.pdf"],
      sourceArtifactIds: [],
      lines: m.lines,
      completeness: m.completeness,
      warnings: m.warnings,
    },
  });
  ok("T2 compose blocked", !composed.ok && composed.reason === "CONFLICT_HOLD");
}

// ─── TEST 3: unit material conflict ─────────────────────────────
{
  const m = mergeDwellingArtifactLines([
    art("ath", "a.ath", "unknown", [
      {
        lp: "4",
        description: "Pełna pozycja opisowa robót instalacyjnych",
        unit: "msc.",
        quantity: "4",
      },
    ]),
    art("pdf", "b.pdf", "unknown", [
      {
        lp: "4",
        description: "Pełna pozycja opisowa robót instalacyjnych",
        unit: "szt",
        quantity: "4,00",
      },
    ]),
  ]);
  ok("T3 unit conflict hold", m.completeness === "conflict", m);
}

// ─── canReconcile unit tests ──────────────────────────────────────
{
  ok(
    "normalize unit family",
    normalizeUnitFamily("szt.") === normalizeUnitFamily("szt"),
  );
  const athNorm = normalizeBoqLineForMerge({
    lp: "1",
    description: "X",
    unit: "szt.",
    quantityRaw: "4",
    sourceKind: "ath",
  });
  const pdfNorm = normalizeBoqLineForMerge({
    lp: "1",
    description: "X",
    unit: "szt",
    quantityRaw: "4,00",
    sourceKind: "pdf",
  });
  ok(
    "canReconcile format pair",
    canReconcileAthPdfPair(
      { sourceKind: "ath", lp: "1", description: "X", unit: "szt.", normalized: athNorm },
      { sourceKind: "pdf", lp: "1", description: "X", unit: "szt", normalized: pdfNorm },
    ),
  );
}

// ─── REAL ŚRODA (network + kv-slim fixture) ───────────────────────
const kvPaths = [
  process.env.SRODA_KV_SLIM,
  "C:\\Users\\dawid\\AppData\\Local\\Temp\\wgdom-sroda-rca\\kv-slim.json",
  join(process.cwd(), "scripts/fixtures/sroda-kv-slim.json"),
].filter(Boolean);

const kvPath = kvPaths.find((p) => existsSync(p));
let srodaSkipped = false;

if (!kvPath) {
  srodaSkipped = true;
  console.log("SKIP ŚRODA integration — brak kv-slim (ustaw SRODA_KV_SLIM)");
} else {
  const kvSlim = JSON.parse(readFileSync(kvPath, "utf8"));
  const ownerMapPath =
    process.env.SRODA_OWNER_MAP
    ?? "C:\\Users\\dawid\\AppData\\Local\\Temp\\wgdom-sroda-owner-go\\after.json";
  const ownerGo = existsSync(ownerMapPath)
    ? JSON.parse(readFileSync(ownerMapPath, "utf8"))
    : null;

  const { buildTenderDossierHeavy } = await import("../src/lib/tender-dossier-pipeline.ts");
  const { clearTenderDocumentBytesCache } = await import("../src/lib/tender-document-bytes-cache.ts");
  const { buildArtifactPoolFromItem } = await import("../src/lib/multi-boq/artifact-pool.ts");

  clearTenderDocumentBytesCache();
  const built = await buildTenderDossierHeavy({
    item: {
      id: kvSlim.id,
      tenderId: kvSlim.tenderId,
      title: kvSlim.title,
      noticeHtml: kvSlim.noticeHtml ?? null,
      noticeNumber: kvSlim.noticeNumber,
    },
    docs: kvSlim.bzpDocuments ?? [],
    noticeHtml: kvSlim.noticeHtml ?? null,
    existingSwz: null,
    existingDossier: null,
    athPreviewEnabled: true,
  });

  const item = {
    id: kvSlim.id,
    tenderId: kvSlim.tenderId,
    noticeNumber: kvSlim.noticeNumber,
    bzpDocuments: kvSlim.bzpDocuments ?? [],
    documentsFetchedAt: kvSlim.documentsFetchedAt ?? new Date().toISOString(),
    noticeHtml: kvSlim.noticeHtml ?? null,
    tenderDossier: built.tenderDossier,
  };

  const pool = buildArtifactPoolFromItem(item);
  const dwellings = ["piastow-1", "piastow-3", "piastow-11", "piastow-15"];
  const documentToDwelling = ownerGo?.package?.documentToDwelling ?? {};

  let rawTotal = 0;
  let canonicalTotal = 0;
  let conflictDw = 0;

  for (const dw of dwellings) {
    const athDoc = Object.entries(documentToDwelling).find(
      ([d, id]) => id === dw && /\.ath/i.test(d),
    )?.[0];
    const pdfDoc = Object.entries(documentToDwelling).find(
      ([d, id]) => id === dw && /\.pdf/i.test(d),
    )?.[0];
    const athArt = pool.find((a) => a.documentId === athDoc || a.filename === athDoc);
    const pdfArt = pool.find((a) => a.documentId === pdfDoc || a.filename === pdfDoc);
    if (!athArt || !pdfArt) {
      ok(`ŚRODA ${dw} artifacts`, false, { athDoc, pdfDoc });
      continue;
    }
    rawTotal += countExtractableLinesFromArtifacts([athArt, pdfArt]);
    const merged = mergeDwellingArtifactLines([athArt, pdfArt]);
    if (merged.completeness === "conflict") conflictDw++;
    canonicalTotal += merged.lines.length;
    ok(`ŚRODA ${dw} ready`, merged.completeness === "ready", {
      c: merged.completeness,
      w: merged.warnings.slice(0, 3),
      n: merged.lines.length,
    });
    ok(`ŚRODA ${dw} 21 lines`, merged.lines.length === 21, { n: merged.lines.length });
  }

  ok("ŚRODA raw 168", rawTotal === 168, { rawTotal });
  ok("ŚRODA canonical 84", canonicalTotal === 84, { canonicalTotal });
  ok("ŚRODA conflicts 0", conflictDw === 0, { conflictDw });

  if (ownerGo?.package) {
    const dwellingBase = (dwellingId) => ({
      dwellingId,
      labelPl: ownerGo.perDwelling?.[dwellingId]?.labelPl ?? dwellingId,
      sourceDocumentIds: ownerGo.perDwelling?.[dwellingId]?.sourceDocumentIds ?? [],
    });

    // Fresh-resolve path (offerBoq null) — regression baseline.
    const pkgFresh = {
      tenderId: kvSlim.id,
      mode: "multi",
      expectedDwellingCount: 4,
      documentToDwelling,
      dwellings: dwellings.map((dwellingId) => ({
        ...dwellingBase(dwellingId),
        offerBoq: null,
      })),
    };
    const expertFresh = runIkDocumentExpert({ item, package: pkgFresh });
    ok("ŚRODA fresh-path expert ready", expertFresh.status === "ready", {
      status: expertFresh.status,
      reasons: expertFresh.reasons,
    });
    ok("ŚRODA fresh-path readyForExperts", expertFresh.masterBoq?.readyForExperts === true, expertFresh.masterBoq);
    ok("ŚRODA fresh-path composed 84", expertFresh.masterBoq?.composedLineCount === 84, expertFresh.masterBoq);

    // Production path: Attach BOQ cache — offerBoq pre-filled + costSnapshot.warnings.
    const prodDwellings = [];
    let prodKeepOneWarnings = 0;
    for (const dw of dwellings) {
      const athDoc = Object.entries(documentToDwelling).find(
        ([d, id]) => id === dw && /\.ath/i.test(d),
      )?.[0];
      const pdfDoc = Object.entries(documentToDwelling).find(
        ([d, id]) => id === dw && /\.pdf/i.test(d),
      )?.[0];
      const athArt = pool.find((a) => a.documentId === athDoc || a.filename === athDoc);
      const pdfArt = pool.find((a) => a.documentId === pdfDoc || a.filename === pdfDoc);
      if (!athArt || !pdfArt) {
        ok(`ŚRODA prod-path ${dw} artifacts`, false, { athDoc, pdfDoc });
        continue;
      }
      const merged = mergeDwellingArtifactLines([athArt, pdfArt]);
      const snapshot = {
        tenderId: kvSlim.id,
        dwellingId: dw,
        sourceDocumentIds: [athArt.documentId, pdfArt.documentId],
        sourceArtifactIds: [athArt.artifactId, pdfArt.artifactId],
        lines: merged.lines,
        completeness: merged.completeness,
        warnings: merged.warnings,
      };
      prodKeepOneWarnings += countKeepOneCollapsedFromWarnings(snapshot.warnings ?? []);
      ok(
        `ŚRODA prod-path ${dw} costSnapshot KEEP ONE warnings`,
        (snapshot.warnings ?? []).some((w) => w.startsWith("KEEP ONE contentHash=")),
        snapshot.warnings?.slice(0, 2),
      );
      const composed = composeDwellingOfferBoq({ snapshot });
      ok(`ŚRODA prod-path ${dw} compose`, composed.ok, composed.reason ?? merged.completeness);
      if (!composed.ok) continue;
      prodDwellings.push({
        ...dwellingBase(dw),
        offerBoq: composed.document,
        costSnapshot: snapshot,
        lineProvenance: composed.lineProvenance,
      });
    }

    ok("ŚRODA prod-path keepOne warnings sum 84", prodKeepOneWarnings === 84, { prodKeepOneWarnings });

    const pkgProd = {
      tenderId: kvSlim.id,
      mode: "multi",
      expectedDwellingCount: 4,
      documentToDwelling,
      dwellings: prodDwellings,
    };
    const expertProd = runIkDocumentExpert({ item, package: pkgProd });
    const li = expertProd.lineIntegrity;
    ok("ŚRODA prod-path raw 168", li?.sourceLineCount === 168, li);
    ok("ŚRODA prod-path composed 84", li?.composedLineCount === 84, li);
    ok("ŚRODA prod-path keepOneExplained 84", li?.explainedLoss === 84, li);
    ok("ŚRODA prod-path gap 0", li?.unexplainedLoss === 0, li);
    ok("ŚRODA prod-path lineIntegrity ok", li?.ok === true, li?.reasons);
    ok("ŚRODA prod-path expert ready", expertProd.status === "ready", {
      status: expertProd.status,
      reasons: expertProd.reasons,
    });
    ok("ŚRODA prod-path readyForExperts", expertProd.masterBoq?.readyForExperts === true, expertProd.masterBoq);
    ok("ŚRODA prod-path masterReady", expertProd.masterBoq?.readyForExperts === true, expertProd.masterBoq);

    // LP5 / LP9 / LP12 — ATH/PDF reconciliation on real Środa piastow-1.
    const piastow1Ath = Object.entries(documentToDwelling).find(
      ([d, id]) => id === "piastow-1" && /\.ath/i.test(d),
    )?.[0];
    const piastow1Pdf = Object.entries(documentToDwelling).find(
      ([d, id]) => id === "piastow-1" && /\.pdf/i.test(d),
    )?.[0];
    const ath1 = pool.find((a) => a.documentId === piastow1Ath || a.filename === piastow1Ath);
    const pdf1 = pool.find((a) => a.documentId === piastow1Pdf || a.filename === piastow1Pdf);
    if (ath1 && pdf1) {
      const m1 = mergeDwellingArtifactLines([ath1, pdf1]);
      for (const lp of [5, 9, 12]) {
        ok(
          `ŚRODA piastow-1 LP${lp} ATH_PDF_RECONCILED`,
          m1.warnings.some((w) => w.includes(`ATH_PDF_RECONCILED lp=${lp} `)),
          m1.warnings.filter((w) => w.includes(`lp=${lp}`)),
        );
      }
    }
  }
}

console.log(`\nATH/PDF RECONCILE: ${pass} PASS / ${fail} FAIL${srodaSkipped ? " (ŚRODA skipped)" : ""}`);
if (fail > 0) process.exit(1);
