/**
 * OD-OCR-45 — ingest persist uses authoritative cloud body (T1–T14).
 * npx vite-node scripts/test-od-ocr-45-ingest-persist-authoritative.mjs
 * No live KV SET / ingest / restore.
 */
import {
  buildIngestArtifactCloudCandidate,
  clearIngestStore,
  emptyIngestState,
  persistIngestArtifactPatchToCloud,
  upsertIngestState,
} from "../src/lib/tender-ingest/index.ts";
import { pruneExpiredUntouched } from "../src/lib/tenders-bzp.ts";
import { stripTenderPipelineForCloud } from "../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts";
import {
  buildTenderPipelineGuard,
  verifyPipelineBodyGuardIkFinalBidParity,
} from "../src/lib/tender-pipeline/tender-pipeline-guard.ts";
import { evaluatePipelineSnapshotWriteSafety } from "../src/lib/tender-pipeline-write-safety.ts";

const OCDS = "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c";
const STUB = "bzp:TPI/729/2026";
const SRODA = "08deff6c-bc34-619e-b346-0300010ce2e5";
const CHROBREGO = "08df0363-7b22-e462-ab56-940001283cba";

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

function snap(filename, rowCount) {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array.from({ length: Math.min(rowCount, 3) }, (_, i) => ({
      lp: String(i + 1),
      name: `row-${i + 1}`,
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-09-03T20:48:23.847Z",
  };
}

function item(id, extra = {}) {
  return {
    id,
    title: id,
    status: "new",
    updatedAt: "2026-09-01T00:00:00.000Z",
    addedAt: "2026-09-01T00:00:00.000Z",
    organizationName: "X",
    organizationCity: "Y",
    ...extra,
  };
}

function artsOf(x) {
  return (
    x?.tenderDossier?.scanSummary?.costBranchArtifacts
    || x?.tenderDossier?.scanSummary?.branchWinnerArtifacts
    || []
  );
}

function buildCloud470() {
  const items = [
    item(OCDS, {
      retention: "pinned",
      ingestMode: "owner_requested",
      status: "seen",
      ocdsId: OCDS,
      tenderDossier: {
        brief: { fields: [], scopeDescription: null },
        kosztorys: null,
        builtAt: "2026-09-03T20:42:09.538Z",
        scanSummary: null,
      },
    }),
    item(STUB, {
      retention: "normal",
      ingestMode: "owner_requested",
      status: "seen",
      bzpNumber: "TPI/729/2026",
    }),
    item(SRODA, {
      ingestMode: "fixture_pin",
      retention: "pinned",
      status: "seen",
      tenderDossier: {
        brief: { fields: [] },
        kosztorys: null,
        builtAt: "2026-09-02T03:46:31.032Z",
        scanSummary: {
          scannedAt: "2026-09-02T03:46:31.032Z",
          documentCount: 8,
          parsedCount: 8,
          warnings: [],
          costBranchArtifacts: Array.from({ length: 8 }, (_, i) => ({
            filename: `sroda-${i}.ath`,
          })),
          branchWinnerArtifacts: Array.from({ length: 8 }, (_, i) => ({
            filename: `sroda-${i}.ath`,
          })),
        },
      },
    }),
    item(CHROBREGO, {
      status: "seen",
      submittingOffersDate: "2027-01-01T00:00:00.000Z",
      ikFinalBid: { netPln: 159000, kind: "ik_g3_final_bid" },
    }),
  ];
  for (let i = 0; i < 67; i += 1) {
    items.push(item(`keep-${i}`, { status: "interested" }));
  }
  for (let i = 0; i < 399; i += 1) {
    items.push(item(`drop-${i}`, { status: i < 347 ? "new" : "seen" }));
  }
  return items;
}

function seedTpiArtifacts() {
  const st = emptyIngestState(OCDS, {
    ingestMode: "owner_requested",
    retention: "pinned",
    ocdsId: OCDS,
  });
  st.artifacts = [
    {
      documentId: "doc_fe40d3c9-dd56-4a28-95d7-9ee6487df271",
      filename: "Przedmiar.pdf",
      contentHash: "6d0a94022bba30dbe455fc146129e0fe0d326d547333df1b7e568788bd264f8a",
      snapshot: snap("Przedmiar.pdf", 90),
    },
    {
      documentId: "doc_d72273aa-ace4-4095-a769-054c314b661a",
      filename: "Przedmiar.pdf#p0-13:construction",
      contentHash: "d9f132bb",
      branch: "construction",
      snapshot: snap("Przedmiar.pdf#p0-13:construction", 69),
    },
    {
      documentId: "doc_ee5f265c-d74d-4fe4-a947-36424957845c",
      filename: "Przedmiar.pdf#p14-18:sanitary",
      contentHash: "fe75354d",
      branch: "sanitary",
      snapshot: snap("Przedmiar.pdf#p14-18:sanitary", 3),
    },
    {
      documentId: "doc_04ccda4e-1d16-479d-be42-ac1cc45171c4",
      filename: "Przedmiar.pdf#p19-22:electrical",
      contentHash: "1ce50cac",
      branch: "electrical",
      snapshot: snap("Przedmiar.pdf#p19-22:electrical", 18),
    },
  ];
  upsertIngestState(st);
}

function reset() {
  clearIngestStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

reset();
const cloud = buildCloud470();
ok(cloud.length === 470, "T0 fixture cloud=470", cloud.length);
const local70 = pruneExpiredUntouched(cloud);
ok(local70.length === 70, "T0 fixture prune=70", local70.length);
ok(local70.some((x) => x.id === OCDS), "T0 prune keeps TPI");
ok(!local70.some((x) => x.id === STUB), "T0 prune drops stub");

// T2 — no artifacts → no write
reset();
{
  let pushed = 0;
  const result = await persistIngestArtifactPatchToCloud(OCDS, {
    fetchPipelineAndGuard: async () => [cloud, { itemCount: 470, bundleRevision: 9 }],
    pushPipeline: async () => {
      pushed += 1;
    },
  });
  ok(result.wrote === false && pushed === 0 && result.itemCount === 470, "T2 no patch → no destructive write");
}

// T1 + T3–T8 + T12 + T14
reset();
seedTpiArtifacts();
{
  const built = buildIngestArtifactCloudCandidate(cloud, OCDS);
  ok(built.shouldWrite === true, "T1 shouldWrite");
  ok(built.candidate.length === 470, "T1 result count=470 (not 471)", built.candidate.length);
  const tpi = built.candidate.find((x) => x.id === OCDS);
  const shells = artsOf(tpi);
  ok(shells.length === 4, "T1 TPI artifact shells=4", shells.length);
  const ids = new Set(built.candidate.map((x) => x.id));
  ok(
    cloud.every((x) => ids.has(x.id)) && ids.size === 470,
    "T3 all 470 unrelated IDs preserved",
  );
  const sroda = built.candidate.find((x) => x.id === SRODA);
  ok(artsOf(sroda).length === 8, "T4 Środa preserved (8 shells)");
  const ch = built.candidate.find((x) => x.id === CHROBREGO);
  ok(ch?.ikFinalBid?.netPln === 159000 && ch?.ikFinalBid?.kind === "ik_g3_final_bid", "T5 Chrobrego Final Bid");
  ok(built.candidate.some((x) => x.id === STUB), "T6 stub preserved on cloud candidate");
  ok(tpi?.id === OCDS && tpi?.ocdsId === OCDS, "T14 canonical TPI remains OCDS");

  const lean = stripTenderPipelineForCloud(built.candidate);
  const leanTpi = lean.find((x) => x.id === OCDS);
  const leanShells = artsOf(leanTpi);
  ok(leanShells.length === 4, "T7 artifact shells survive lean", leanShells.length);
  ok(
    leanShells.every((a) => !a.snapshot) && leanTpi?._cloudLean?.omitted?.includes("artifact.snapshot"),
    "T8 artifact.snapshot omission remains valid",
  );
  ok(
    leanShells.some((a) => a.documentId === "doc_fe40d3c9-dd56-4a28-95d7-9ee6487df271" && a.filename === "Przedmiar.pdf"),
    "T7 P shell",
  );
  ok(
    leanShells.some((a) => a.branch === "construction" && String(a.filename).includes("p0-13")),
    "T7 D1 construction p0-13",
  );
  ok(
    leanShells.some((a) => a.branch === "sanitary" && String(a.filename).includes("p14-18")),
    "T7 D2 sanitary p14-18",
  );
  ok(
    leanShells.some((a) => a.branch === "electrical" && String(a.filename).includes("p19-22")),
    "T7 D3 electrical p19-22",
  );

  const again = buildIngestArtifactCloudCandidate(built.candidate, OCDS);
  ok(artsOf(again.candidate.find((x) => x.id === OCDS)).length === 4, "T12 second patch idempotent (4 not 8)");

  let pushedItems = null;
  const persistResult = await persistIngestArtifactPatchToCloud(OCDS, {
    fetchPipelineAndGuard: async () => [cloud, { itemCount: 470, bundleRevision: 9 }],
    pushPipeline: async (items) => {
      pushedItems = items;
    },
  });
  ok(persistResult.wrote === true && persistResult.itemCount === 470, "T1 persist wrote 470");
  ok(pushedItems?.length === 470, "T1 push payload length 470");
  ok(pruneExpiredUntouched(cloud).length === 70, "T13 pruned local remains 70");
  ok(pushedItems?.length !== 70, "T13 pruned 70 is not written to cloud");
}

// T9 guard parity
reset();
seedTpiArtifacts();
{
  const built = buildIngestArtifactCloudCandidate(cloud, OCDS);
  const lean = stripTenderPipelineForCloud(built.candidate);
  const guard = buildTenderPipelineGuard(lean, {
    bundleRevision: 10,
    bundleAt: "2026-09-04T06:00:00.000Z",
    deletedIds: [],
  });
  const parity = verifyPipelineBodyGuardIkFinalBidParity(lean, guard);
  ok(guard.itemCount === 470 && parity.ok, "T9 guard body parity", parity);
}

// T10 concurrent +1 ID
reset();
seedTpiArtifacts();
{
  const built = buildIngestArtifactCloudCandidate(cloud, OCDS);
  const cloud471 = [...cloud, item("concurrent-extra-1", { status: "new" })];
  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud471,
    localItems: built.candidate,
    deletedIds: [],
  });
  ok(verdict.allowed === false && verdict.localCount === 470 && verdict.cloudCount === 471, "T10 cloud +1 between read/write → BLOCK");
}

// T11 write-safety fail-closed
reset();
{
  const pruned = pruneExpiredUntouched(cloud);
  const blockedPrune = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: pruned,
    deletedIds: [],
  });
  ok(blockedPrune.allowed === false && blockedPrune.localCount === 70, "T11 pruned 70 vs cloud 470 BLOCK");

  seedTpiArtifacts();
  const built = buildIngestArtifactCloudCandidate(cloud, OCDS);
  const allowed = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: built.candidate,
    deletedIds: [],
  });
  ok(allowed.allowed === true && allowed.localCount === 470, "T11 authoritative candidate 470 ALLOW");

  let threw = false;
  try {
    await persistIngestArtifactPatchToCloud(OCDS, {
      fetchPipelineAndGuard: async () => {
        throw new Error("network");
      },
      pushPipeline: async () => {},
    });
  } catch (e) {
    threw = e?.code === "CLOUD_PIPELINE_UNAVAILABLE";
  }
  ok(threw, "T11 GET fail → UNAVAILABLE fail-closed");
}

console.log(`\nOD-OCR-45 ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
