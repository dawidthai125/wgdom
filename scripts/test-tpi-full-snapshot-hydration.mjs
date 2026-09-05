/**
 * TPI FULL Snapshot Hydration — DESIGN-C regression (T1–T15).
 * npx vite-node scripts/test-tpi-full-snapshot-hydration.mjs
 */
import {
  applyIngestArtifactsToPipelineItem,
  clearIngestStore,
  hydratePipelineItemsFromIngestRegistry,
  isUsableCostArtifactSnapshot,
  preferCostBranchArtifact,
  upsertIngestState,
  emptyIngestState,
} from "../src/lib/tender-ingest/index.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";
import { stripTenderPipelineForCloud } from "../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts";
import { buildArtifactPoolFromItem } from "../src/lib/multi-boq/artifact-pool.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { TENDER_INGEST_LS_KEY } from "../src/lib/tender-ingest/constants.ts";

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

let pass = 0;
let fail = 0;

function ok(cond, label, extra) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`, extra ?? "");
  }
}

function reset() {
  clearIngestStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

const TPI_ID = "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c";

const DOCS = {
  P: { documentId: "doc-p-przedmiar", filename: "Przedmiar.pdf", branch: "construction" },
  D1: { documentId: "doc-d1-construction", filename: "Przedmiar.pdf → D1", branch: "construction" },
  D2: { documentId: "doc-d2-sanitary", filename: "Przedmiar.pdf → D2", branch: "sanitary" },
  D3: { documentId: "doc-d3-electrical", filename: "Przedmiar.pdf → D3", branch: "electrical" },
};

function fullSnap(tag, rowCount = 3) {
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    lp: String(i + 1),
    name: `${tag} poz ${i + 1}`,
    quantity: String(10 + i),
    unit: "m2",
    knr: `KNR-${tag}-${i + 1}`,
  }));
  return {
    ok: true,
    sourceFilename: `${tag}.pdf`,
    parsedAt: "2026-07-01T12:00:00.000Z",
    rows,
    catalogQuantities: rows.map((r) => ({
      code: r.knr,
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
    })),
    warnings: [],
  };
}

function sentinelSnap() {
  return {
    ok: false,
    sourceFilename: "",
    parsedAt: "1970-01-01T00:00:00.000Z",
    rows: [],
    catalogQuantities: [],
    warnings: ["merge_sentinel"],
  };
}

function shellArt(meta) {
  return {
    documentId: meta.documentId,
    filename: meta.filename,
    branch: meta.branch,
    // shell — no snapshot or sentinel
  };
}

function artWithSnap(meta, snap) {
  return {
    documentId: meta.documentId,
    filename: meta.filename,
    branch: meta.branch,
    snapshot: snap,
  };
}

function baseItem(id = TPI_ID, extras = {}) {
  return {
    id,
    tenderId: id,
    title: "TPI test",
    organizationName: "TPI",
    organizationCity: "Wrocław",
    bzpNumber: "2026/BZP 00381353/01",
    noticeNumber: "",
    publicationDate: "2026-01-01",
    submittingOffersDate: null,
    cpvCode: "",
    orderType: "",
    status: "interested",
    relevanceScore: 80,
    notes: "",
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extras,
  };
}

function itemWithArts(arts, id = TPI_ID) {
  const now = "2026-01-01T00:00:00.000Z";
  return baseItem(id, {
    tenderDossier: {
      brief: { title: "TPI" },
      kosztorys: null,
      builtAt: now,
      scanSummary: {
        scannedAt: now,
        documentCount: arts.length,
        parsedCount: arts.filter((a) => a.snapshot?.ok).length,
        warnings: [],
        branchWinnerArtifacts: arts,
        costBranchArtifacts: arts,
      },
    },
  });
}

function seedRegistry(tenderId, artifacts) {
  const st = emptyIngestState(tenderId);
  upsertIngestState({
    ...st,
    artifacts: artifacts.map((a) => ({
      documentId: a.documentId,
      filename: a.filename,
      contentHash: `hash-${a.documentId}`,
      snapshot: a.snapshot,
      branch: a.branch,
    })),
    documents: artifacts.map((a) => ({
      documentId: a.documentId,
      tenderId,
      source: "owner_upload",
      originalFilename: a.filename,
      displayName: a.filename,
      contentHash: `hash-${a.documentId}`,
      mimeType: "application/pdf",
      size: 1000,
      ingestStatus: "retained",
      classHint: "COST",
      parseStatus: "parsed",
      warnings: [],
    })),
    ingestPhase: "INGEST_COMPLETE",
    parsePhase: "PARSE_COMPLETE",
  });
}

function usableCount(item) {
  const arts =
    item?.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? item?.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? [];
  return arts.filter((a) => isUsableCostArtifactSnapshot(a?.snapshot)).length;
}

function byDocId(item) {
  const arts =
    item?.tenderDossier?.scanSummary?.costBranchArtifacts
    ?? item?.tenderDossier?.scanSummary?.branchWinnerArtifacts
    ?? [];
  const m = new Map();
  for (const a of arts) m.set(a.documentId, a);
  return m;
}

console.log("=== TPI FULL SNAPSHOT HYDRATION DESIGN-C ===\n");

// --- T1: registry FULL → hydrate → FULL restored ---
{
  reset();
  console.log("T1 registry FULL → pipeline hydrate");
  const regArts = [
    artWithSnap(DOCS.P, fullSnap("P", 5)),
    artWithSnap(DOCS.D1, fullSnap("D1", 4)),
    artWithSnap(DOCS.D2, fullSnap("D2", 3)),
    artWithSnap(DOCS.D3, fullSnap("D3", 2)),
  ];
  seedRegistry(TPI_ID, regArts);
  const shells = [shellArt(DOCS.P), shellArt(DOCS.D1), shellArt(DOCS.D2), shellArt(DOCS.D3)];
  const pipeline = [itemWithArts(shells)];
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry(pipeline);
  ok(hydratedCount === 1, "T1 hydratedCount=1");
  ok(usableCount(items[0]) === 4, "T1 usable FULL count=4", usableCount(items[0]));
  ok(isUsableCostArtifactSnapshot(byDocId(items[0]).get(DOCS.P.documentId)?.snapshot), "T1 P FULL");
}

// --- T2: cloud lean + registry FULL ---
{
  reset();
  console.log("T2 cloud lean + registry FULL");
  const regArts = [artWithSnap(DOCS.P, fullSnap("P", 6))];
  seedRegistry(TPI_ID, regArts);
  const fullLocal = itemWithArts([artWithSnap(DOCS.P, fullSnap("P", 6))]);
  const leanCloud = stripTenderPipelineForCloud([fullLocal])[0];
  ok(!leanCloud.tenderDossier?.scanSummary?.costBranchArtifacts?.[0]?.snapshot, "T2 cloud omits snapshot");
  const merged = mergeTenderPipelineForCloud([], [leanCloud]);
  const { items } = hydratePipelineItemsFromIngestRegistry(merged);
  ok(usableCount(items[0]) === 1, "T2 FULL restored after lean merge");
  ok(items[0].tenderDossier.scanSummary.costBranchArtifacts[0].snapshot.rows.length === 6, "T2 rows=6");
}

// --- T3: cloud lean + local sentinel + registry FULL → FULL wins ---
{
  reset();
  console.log("T3 lean + sentinel + registry FULL");
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, fullSnap("P", 7))]);
  const localSent = itemWithArts([artWithSnap(DOCS.P, sentinelSnap())]);
  const lean = stripTenderPipelineForCloud([
    itemWithArts([{ ...shellArt(DOCS.P), snapshot: undefined }]),
  ])[0];
  const merged = mergeTenderPipelineForCloud([localSent], [lean]);
  const { items } = hydratePipelineItemsFromIngestRegistry(merged);
  const snap = byDocId(items[0]).get(DOCS.P.documentId)?.snapshot;
  ok(isUsableCostArtifactSnapshot(snap), "T3 registry FULL wins over sentinel");
  ok(snap?.ok === true && snap.rows.length === 7, "T3 rows from registry");
}

// --- T4: existing pipeline FULL + weaker registry → no downgrade ---
{
  reset();
  console.log("T4 no downgrade existing FULL");
  const strong = fullSnap("P-strong", 10);
  const weak = { ...sentinelSnap(), ok: false, rows: [] };
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, weak)]);
  const pipeline = [itemWithArts([artWithSnap(DOCS.P, strong)])];
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry(pipeline);
  ok(hydratedCount === 0, "T4 no hydrate when already FULL");
  ok(byDocId(items[0]).get(DOCS.P.documentId).snapshot.rows.length === 10, "T4 strong retained");
  // also via prefer + apply
  const patch = applyIngestArtifactsToPipelineItem(pipeline[0]);
  const after = { ...pipeline[0], ...patch };
  ok(byDocId(after).get(DOCS.P.documentId).snapshot.rows.length === 10, "T4 applyIngest no downgrade");
}

// --- T5: no registry FULL → remain partial / no fabrication ---
{
  reset();
  console.log("T5 no registry → no fabrication");
  const pipeline = [itemWithArts([shellArt(DOCS.P), artWithSnap(DOCS.D1, sentinelSnap())])];
  const before = JSON.stringify(pipeline[0].tenderDossier);
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry(pipeline);
  ok(hydratedCount === 0, "T5 hydratedCount=0");
  ok(usableCount(items[0]) === 0, "T5 still no usable FULL");
  ok(JSON.stringify(items[0].tenderDossier) === before, "T5 dossier unchanged");
}

// --- T6: all 4 TPI artifacts map by documentId ---
{
  reset();
  console.log("T6 multi-artifact documentId mapping");
  const regArts = [
    artWithSnap(DOCS.P, fullSnap("P", 2)),
    artWithSnap(DOCS.D1, fullSnap("D1", 3)),
    artWithSnap(DOCS.D2, fullSnap("D2", 4)),
    artWithSnap(DOCS.D3, fullSnap("D3", 5)),
  ];
  seedRegistry(TPI_ID, regArts);
  const { items } = hydratePipelineItemsFromIngestRegistry([
    itemWithArts([shellArt(DOCS.P), shellArt(DOCS.D1), shellArt(DOCS.D2), shellArt(DOCS.D3)]),
  ]);
  const m = byDocId(items[0]);
  ok(m.get(DOCS.P.documentId)?.snapshot.rows.length === 2, "T6 P→doc-p");
  ok(m.get(DOCS.D1.documentId)?.snapshot.rows.length === 3, "T6 D1");
  ok(m.get(DOCS.D2.documentId)?.snapshot.rows.length === 4, "T6 D2");
  ok(m.get(DOCS.D3.documentId)?.snapshot.rows.length === 5, "T6 D3");
  ok(m.get(DOCS.D1.documentId)?.branch === "construction", "T6 D1 branch");
  ok(m.get(DOCS.D2.documentId)?.branch === "sanitary", "T6 D2 branch");
  ok(m.get(DOCS.D3.documentId)?.branch === "electrical", "T6 D3 branch");
}

// --- T7: hydrate twice → idempotent ---
{
  reset();
  console.log("T7 idempotent double hydrate");
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, fullSnap("P", 4))]);
  const first = hydratePipelineItemsFromIngestRegistry([itemWithArts([shellArt(DOCS.P)])]);
  ok(first.hydratedCount === 1, "T7 first hydrate");
  const second = hydratePipelineItemsFromIngestRegistry(first.items);
  ok(second.hydratedCount === 0, "T7 second hydrate no churn");
  ok(
    byDocId(second.items[0]).get(DOCS.P.documentId).snapshot.rows.length === 4,
    "T7 FULL stable",
  );
}

// --- T8: restored → buildArtifactPoolFromItem usable ---
{
  reset();
  console.log("T8 artifact pool");
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, fullSnap("P", 5))]);
  const { items } = hydratePipelineItemsFromIngestRegistry([itemWithArts([shellArt(DOCS.P)])]);
  const pool = buildArtifactPoolFromItem(items[0]);
  ok(pool.length >= 1, "T8 pool non-empty");
  ok(pool[0].documentId === DOCS.P.documentId, "T8 pool documentId");
  ok(pool[0].snapshot?.ok === true, "T8 pool snapshot.ok");
}

// --- T9: restored → OfferBoq lines > 0 ---
{
  reset();
  console.log("T9 OfferBoq from restored snapshot");
  const snap = fullSnap("P", 8);
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, snap)]);
  const { items } = hydratePipelineItemsFromIngestRegistry([itemWithArts([shellArt(DOCS.P)])]);
  const restored = byDocId(items[0]).get(DOCS.P.documentId).snapshot;
  const boq = buildOfferBoqFromSnapshot({ tenderId: TPI_ID, snapshot: restored });
  ok((boq.lines?.length ?? 0) > 0, "T9 OfferBoq lines > 0", boq.lines?.length);
}

// --- T10: cloud push remains lean ---
{
  reset();
  console.log("T10 cloud lean after hydrate");
  seedRegistry(TPI_ID, [artWithSnap(DOCS.P, fullSnap("P", 3))]);
  const { items } = hydratePipelineItemsFromIngestRegistry([itemWithArts([shellArt(DOCS.P)])]);
  ok(items[0].tenderDossier.scanSummary.costBranchArtifacts[0].snapshot, "T10 local has snapshot");
  const lean = stripTenderPipelineForCloud(items);
  const leanArt = lean[0]?.tenderDossier?.scanSummary?.costBranchArtifacts?.[0]
    ?? lean[0]?.tenderDossier?.scanSummary?.branchWinnerArtifacts?.[0];
  ok(!leanArt?.snapshot, "T10 cloud omits artifact.snapshot");
}

// --- T11/T12 run separately as OD-OCR scripts ---

// --- T13: wrong tenderId → no cross-attach ---
{
  reset();
  console.log("T13 no cross-attach");
  seedRegistry("other-tender-xyz", [artWithSnap(DOCS.P, fullSnap("P", 9))]);
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry([
    itemWithArts([shellArt(DOCS.P)], TPI_ID),
  ]);
  ok(hydratedCount === 0, "T13 no hydrate wrong tender");
  ok(usableCount(items[0]) === 0, "T13 TPI still empty");
}

// --- T14: non-cost BZP document → no false cost snapshot ---
{
  reset();
  console.log("T14 non-cost no false attachment");
  // Registry empty for this SWZ-only item — hydrate must not invent cost snaps
  const swzItem = baseItem("bzp-swz-only", {
    bzpDocuments: [
      {
        index: 0,
        documentId: "swz-1",
        filename: "SWZ.pdf",
        contentType: "application/pdf",
        downloadUrl: "https://example/swz",
        isSwzHint: true,
      },
    ],
    tenderDossier: {
      brief: { title: "SWZ" },
      kosztorys: null,
      builtAt: "2026-01-01T00:00:00.000Z",
      scanSummary: {
        scannedAt: "2026-01-01T00:00:00.000Z",
        documentCount: 1,
        parsedCount: 0,
        warnings: [],
        branchWinnerArtifacts: [],
        costBranchArtifacts: [],
      },
    },
  });
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry([swzItem]);
  ok(hydratedCount === 0, "T14 no hydrate");
  ok(
    (items[0].tenderDossier.scanSummary.costBranchArtifacts ?? []).length === 0,
    "T14 no fabricated cost artifacts",
  );
}

// --- T15: non-TPI tender no regression ---
{
  reset();
  console.log("T15 non-TPI unchanged");
  const other = itemWithArts(
    [artWithSnap({ documentId: "x1", filename: "kosztorys.pdf", branch: "construction" }, fullSnap("X", 2))],
    "other-tender-abc",
  );
  const before = usableCount(other);
  const { items, hydratedCount } = hydratePipelineItemsFromIngestRegistry([other]);
  ok(hydratedCount === 0, "T15 no hydrate without registry");
  ok(usableCount(items[0]) === before, "T15 existing FULL preserved");
}

// --- Prefer helper unit ---
{
  console.log("preferCostBranchArtifact unit");
  const a = artWithSnap(DOCS.P, fullSnap("A", 5));
  const b = artWithSnap(DOCS.P, sentinelSnap());
  ok(preferCostBranchArtifact(a, b) === a, "prefer keeps usable over sentinel");
  ok(preferCostBranchArtifact(b, a) === a, "prefer upgrades sentinel to FULL");
  ok(isUsableCostArtifactSnapshot(fullSnap("z", 1)), "usable ok=true");
  ok(!isUsableCostArtifactSnapshot(sentinelSnap()), "sentinel not usable");
}

// Registry key sanity
{
  ok(TENDER_INGEST_LS_KEY === "kw-tender-ingest-v1", "registry key kw-tender-ingest-v1");
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
