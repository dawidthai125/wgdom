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
    const pkg = {
      tenderId: kvSlim.id,
      mode: "multi",
      expectedDwellingCount: 4,
      documentToDwelling,
      dwellings: dwellings.map((dwellingId) => ({
        dwellingId,
        labelPl: ownerGo.perDwelling?.[dwellingId]?.labelPl ?? dwellingId,
        sourceDocumentIds: ownerGo.perDwelling?.[dwellingId]?.sourceDocumentIds ?? [],
        offerBoq: null,
      })),
    };
    const expert = runIkDocumentExpert({ item, package: pkg });
    ok("ŚRODA expert ready", expert.status === "ready", {
      status: expert.status,
      reasons: expert.reasons,
    });
    ok("ŚRODA readyForExperts", expert.masterBoq?.readyForExperts === true, expert.masterBoq);
    ok("ŚRODA composed 84", expert.masterBoq?.composedLineCount === 84, expert.masterBoq);
  }
}

console.log(`\nATH/PDF RECONCILE: ${pass} PASS / ${fail} FAIL${srodaSkipped ? " (ŚRODA skipped)" : ""}`);
if (fail > 0) process.exit(1);
