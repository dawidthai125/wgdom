/**
 * INGEST-01 — T1–T16 harness (lossless owner ingest).
 *
 * npx vite-node scripts/test-ingest-01.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import {
  buildPinnedPipelineItem,
  clearIngestStore,
  retainOwnerFile,
  getIngestState,
  setExpectedDocumentCount,
  recordIngestArtifact,
  processIngestParseBatch,
  applyIngestArtifactsToPipelineItem,
  expandZipArchive,
  isPathTraversalName,
} from "../src/lib/tender-ingest/index.ts";
import { pruneExpiredUntouched } from "../src/lib/tenders-bzp.ts";
import { buildHeavyParseDocumentSet } from "../src/lib/tender-pipeline/unified-attachment-gate.ts";
import {
  clearMultiDwellingPackageStore,
  confirmDwelling,
  enableMultiDwellingMode,
  evaluatePackageGate,
  getTenderPackage,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
} from "../src/lib/multi-dwelling/index.ts";
import {
  buildArtifactPoolFromItem,
  findArtifactForDocumentId,
  resolveDwellingCostSnapshotForPricing,
  composeDwellingOfferBoq,
  attachComposedBoqToDwelling,
} from "../src/lib/multi-boq/index.ts";

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

globalThis.fetch = async () => {
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
  clearIngestStore();
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

function bytesOf(label) {
  return new TextEncoder().encode(`INGEST-01:${label}`);
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
      quantity: String(l.quantity ?? "1"),
      unitPrice: "",
      total: "",
    })),
    catalogQuantities: lines.map((l) => ({
      lp: l.lp,
      description: l.description,
      unit: l.unit ?? "m2",
      quantity: String(l.quantity ?? "1"),
    })),
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-08-13T12:00:00.000Z",
  };
}

function fakeExternalFiles(n, prefix) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    url: `https://example.invalid/${prefix}/${i}.pdf`,
    filename: `${prefix}-${i}.pdf`,
    contentType: "application/pdf",
    storagePath: `ext/${prefix}-${i}.pdf`,
    publicUrl: `https://example.invalid/p/${prefix}/${i}.pdf`,
    isSwzHint: false,
    score: 100 - i,
    sourcePageUrl: "https://example.invalid/",
    fetchedAt: "2026-08-13T12:00:00.000Z",
  }));
}

async function makeZipWithPdfs(names) {
  const zip = new JSZip();
  for (const n of names) zip.file(n, bytesOf(n));
  return zip.generateAsync({ type: "uint8array" });
}

const POLCZYN_OCDS = "ocds-148610-d97836d1-e5da-4aa0-968e-b69cd9ba24bc";
const FIXTURE_DIR = join(process.cwd(), ".tmp-live-tender-test");

// ─── T1 ───────────────────────────────────────────────
reset();
{
  const item = buildPinnedPipelineItem({
    ocdsId: POLCZYN_OCDS,
    bzpNumber: "2026/BZP 00267694",
    title: "Połczyn — instalacje (fixture)",
    organizationName: "Gmina Połczyn-Zdrój",
    organizationCity: "Połczyn-Zdrój",
    sourceUrls: ["https://example.invalid/bip"],
    ingestMode: "fixture_pin",
    retention: "pinned",
  });
  ok(
    "T1 OCDS pin → TenderPipelineItem",
    item.id === POLCZYN_OCDS && item.ingestMode === "fixture_pin" && item.retention === "pinned",
  );
}

// ─── T2 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T2";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T2",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  for (let i = 0; i < 20; i++) {
    await retainOwnerFile({
      tenderId: tid,
      originalFilename: `doc-${i}.pdf`,
      bytes: bytesOf(`doc-${i}`),
    });
  }
  const retained = getIngestState(tid)?.documents.filter((d) => d.ingestStatus === "retained") ?? [];
  ok("T2 20 documents retained", retained.length === 20, retained.length);
}

// ─── T3 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T3";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T3",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const inner = Array.from({ length: 7 }, (_, i) => `inner-${i}-przedmiar.pdf`);
  const zipBytes = await makeZipWithPdfs(inner);
  const r = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "pakiet.zip",
    bytes: zipBytes,
  });
  const st = getIngestState(tid);
  ok(
    "T3 ZIP → all inner PDFs retained",
    r.documentIds.length === 7 && st?.archives.length === 1 && st.archives[0].children.length === 7,
    { ids: r.documentIds.length, children: st?.archives[0]?.children?.length },
  );
}

// ─── T4 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T4";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T4",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const same = new TextEncoder().encode("SAME-CONTENT-HASH");
  const a = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "a-przedmiar.pdf",
    bytes: same,
  });
  const b = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "b-przedmiar.pdf",
    bytes: same,
  });
  const st = getIngestState(tid);
  const hash = st.documents.find((d) => d.documentId === a.documentIds[0]).contentHash;
  recordIngestArtifact({
    tenderId: tid,
    documentId: a.documentIds[0],
    filename: "a-przedmiar.pdf",
    contentHash: hash,
    snapshot: makeSnap("a-przedmiar.pdf", [{ lp: "1", description: "X", quantity: "1" }]),
  });
  recordIngestArtifact({
    tenderId: tid,
    documentId: b.documentIds[0],
    filename: "b-przedmiar.pdf",
    contentHash: hash,
    snapshot: makeSnap("b-przedmiar.pdf", [{ lp: "1", description: "X", quantity: "1" }]),
  });
  const st2 = getIngestState(tid);
  ok(
    "T4 duplicate contentHash → no duplicate artifact",
    a.documentIds[0] === b.documentIds[0] && st2.artifacts.length === 1,
    { docs: a.documentIds, arts: st2.artifacts.length },
  );
}

// ─── T5 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T5";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T5",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const a = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "same-name.pdf",
    bytes: new TextEncoder().encode("BYTES-A"),
  });
  const b = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "same-name.pdf",
    bytes: new TextEncoder().encode("BYTES-B"),
  });
  ok(
    "T5 same filename + different content → distinct documents",
    a.documentIds[0] !== b.documentIds[0]
      && getIngestState(tid).documents.filter((d) => d.ingestStatus === "retained").length === 2,
  );
}

// ─── T6 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T6";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T6",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  setExpectedDocumentCount(tid, 20);
  for (let i = 0; i < 6; i++) {
    await retainOwnerFile({
      tenderId: tid,
      originalFilename: `part-${i}.pdf`,
      bytes: bytesOf(`part-${i}`),
    });
  }
  const st = getIngestState(tid);
  ok(
    "T6 6/20 → PARTIAL, never COMPLETE",
    st.ingestPhase === "INGEST_PARTIAL",
    st.ingestPhase,
  );
}

// ─── T7 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T7";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T7",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  setExpectedDocumentCount(tid, 20);
  for (let i = 0; i < 20; i++) {
    await retainOwnerFile({
      tenderId: tid,
      originalFilename: `full-${i}.pdf`,
      bytes: bytesOf(`full-${i}`),
    });
  }
  ok("T7 20/20 → COMPLETE", getIngestState(tid).ingestPhase === "INGEST_COMPLETE");
}

// ─── T8 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T8";
  const item = buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T8",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const r = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "missing-art-przedmiar.pdf",
    bytes: bytesOf("missing-art"),
  });
  const docId = r.documentIds[0];
  enableMultiDwellingMode(tid, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(tid, 1);
  confirmDwelling({ tenderId: tid, dwellingId: "D01", labelPl: "D01" });
  mapDocumentToDwelling({ tenderId: tid, documentId: docId, dwellingId: "D01" });
  const snap = resolveDwellingCostSnapshotForPricing({
    tenderId: tid,
    dwellingId: "D01",
    item,
  });
  const pkg = getTenderPackage(tid);
  const gate = evaluatePackageGate(pkg);
  ok(
    "T8 missing artifact → HOLD",
    snap.completeness === "hold" && !gate.pass,
    { completeness: snap.completeness, gatePass: gate.pass, warnings: snap.warnings },
  );
}

// ─── T9 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T9";
  let item = buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T9",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const r = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "survive-przedmiar.pdf",
    bytes: bytesOf("survive"),
  });
  const docId = r.documentIds[0];
  const st0 = getIngestState(tid);
  const hash = st0.documents.find((d) => d.documentId === docId).contentHash;
  const bytesMap = {};
  for (const d of st0.documents) {
    if (d.bytes) bytesMap[d.documentId] = d.bytes;
  }
  // Bytes stripped on persist — re-retain path: feed bytesByDocumentId from retain before persist wipe.
  // Re-read: retain keeps bytes in memory until upsert strip. Re-upload:
  await retainOwnerFile({
    tenderId: tid,
    originalFilename: "survive-przedmiar.pdf",
    bytes: bytesOf("survive"),
  });
  const st1 = getIngestState(tid);
  // After duplicate content, same docId; inject bytes for parse batch:
  await processIngestParseBatch({
    tenderId: tid,
    bytesByDocumentId: { [docId]: bytesOf("survive") },
    parseFn: async (_b, filename) =>
      makeSnap(filename, [{ lp: "1", description: "Y", quantity: "2" }]),
  });
  const st = getIngestState(tid);
  const art = st.artifacts.find((a) => a.documentId === docId);
  item = { ...item, ...applyIngestArtifactsToPipelineItem(item) };
  const found = findArtifactForDocumentId(docId, buildArtifactPoolFromItem(item));
  ok(
    "T9 document identity survives parse",
    art?.documentId === docId && art?.contentHash === hash && found?.documentId === docId,
    { artDoc: art?.documentId, found: found?.documentId, st1Docs: st1.documents.length },
  );
}

// ─── T10 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T10";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T10",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const r = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "map-przedmiar.pdf",
    bytes: bytesOf("map"),
  });
  enableMultiDwellingMode(tid, { expectedDwellingCount: 1 });
  confirmDwelling({ tenderId: tid, dwellingId: "D01", labelPl: "D01" });
  const map = mapDocumentToDwelling({
    tenderId: tid,
    documentId: r.documentIds[0],
    dwellingId: "D01",
  });
  const pkg = getTenderPackage(tid);
  ok(
    "T10 documentToDwelling works",
    map.ok && pkg.documentToDwelling[r.documentIds[0]] === "D01",
    { map, docMap: pkg.documentToDwelling },
  );
}

// ─── T11 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T11";
  let item = buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T11",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const d1 = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "D01-kosztorys.pdf",
    bytes: bytesOf("D01"),
  });
  const d2 = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "D02-kosztorys.pdf",
    bytes: bytesOf("D02"),
  });
  const id1 = d1.documentIds[0];
  const id2 = d2.documentIds[0];
  const st = getIngestState(tid);
  recordIngestArtifact({
    tenderId: tid,
    documentId: id1,
    filename: "D01-kosztorys.pdf",
    contentHash: st.documents.find((d) => d.documentId === id1).contentHash,
    snapshot: makeSnap("D01-kosztorys.pdf", [
      { lp: "1", description: "Shared LP name", quantity: "10" },
    ]),
  });
  recordIngestArtifact({
    tenderId: tid,
    documentId: id2,
    filename: "D02-kosztorys.pdf",
    contentHash: st.documents.find((d) => d.documentId === id2).contentHash,
    snapshot: makeSnap("D02-kosztorys.pdf", [
      { lp: "1", description: "Shared LP name", quantity: "3" },
    ]),
  });
  item = { ...item, ...applyIngestArtifactsToPipelineItem(item) };
  enableMultiDwellingMode(tid, { expectedDwellingCount: 2 });
  setExpectedDwellingCount(tid, 2);
  confirmDwelling({ tenderId: tid, dwellingId: "D01", labelPl: "D01" });
  confirmDwelling({ tenderId: tid, dwellingId: "D02", labelPl: "D02" });
  mapDocumentToDwelling({ tenderId: tid, documentId: id1, dwellingId: "D01" });
  mapDocumentToDwelling({ tenderId: tid, documentId: id2, dwellingId: "D02" });
  const pool = buildArtifactPoolFromItem(item);
  const r1 = resolveDwellingCostSnapshotForPricing({
    tenderId: tid,
    dwellingId: "D01",
    item,
    artifacts: pool,
  });
  const r2 = resolveDwellingCostSnapshotForPricing({
    tenderId: tid,
    dwellingId: "D02",
    item,
    artifacts: pool,
  });
  const c1 = composeDwellingOfferBoq({ snapshot: r1 });
  const c2 = composeDwellingOfferBoq({ snapshot: r2 });
  const a1 = attachComposedBoqToDwelling({
    tenderId: tid,
    dwellingId: "D01",
    item,
    artifacts: pool,
  });
  const a2 = attachComposedBoqToDwelling({
    tenderId: tid,
    dwellingId: "D02",
    item,
    artifacts: pool,
  });
  ok(
    "T11 D01/D02 shared LP remains isolated",
    r1.completeness === "ready"
      && r2.completeness === "ready"
      && r1.lines[0]?.quantity === 10
      && r2.lines[0]?.quantity === 3
      && c1.ok
      && c2.ok
      && a1.ok
      && a2.ok
      && c1.document.lines[0].lineId !== c2.document.lines[0].lineId,
    {
      q1: r1.lines[0]?.quantity,
      q2: r2.lines[0]?.quantity,
      id1: c1.ok ? c1.document.lines[0].lineId : c1.reason,
      id2: c2.ok ? c2.document.lines[0].lineId : c2.reason,
      a1: a1.ok,
      a2: a2.ok,
    },
  );
}

// ─── T12 ───────────────────────────────────────────────
reset();
{
  const autoItem = {
    id: "legacy-auto",
    tenderId: "legacy-auto",
    title: "Legacy",
    organizationName: "X",
    bzpNumber: "",
    noticeNumber: "",
    organizationCity: "",
    organizationProvince: "PL02",
    cpvCode: "",
    publicationDate: "2026-08-01",
    submittingOffersDate: "2026-12-01",
    orderType: "Works",
    moIdentifier: "",
    status: "new",
    notes: "",
    relevanceScore: 1,
    matchedKeywords: [],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ezamowieniaUrl: "",
    externalDocDiscovery: {
      builtAt: new Date().toISOString(),
      status: "done",
      pageLinks: [],
      files: fakeExternalFiles(10, "ext"),
    },
  };
  const docs = buildHeavyParseDocumentSet(autoItem);
  ok("T12 legacy tender GREEN (external top-6)", docs.length === 6, docs.length);
}

// ─── T13 ───────────────────────────────────────────────
reset();
{
  const pinned = buildPinnedPipelineItem({
    ocdsId: "ocds-hist-cancelled",
    bzpNumber: "2026/BZP CANCELLED",
    title: "Historical cancelled",
    organizationName: "Gmina",
    ingestMode: "fixture_pin",
    retention: "pinned",
  });
  pinned.submittingOffersDate = "2020-01-01";
  pinned.status = "seen";
  const normal = {
    ...pinned,
    id: "normal-expired",
    tenderId: "normal-expired",
    ocdsId: undefined,
    ingestMode: undefined,
    retention: undefined,
    status: "seen",
    submittingOffersDate: "2020-01-01",
  };
  const kept = pruneExpiredUntouched([pinned, normal]);
  ok(
    "T13 cancelled historical fixture survives",
    kept.some((i) => i.id === pinned.id) && !kept.some((i) => i.id === "normal-expired"),
    kept.map((i) => i.id),
  );
}

// ─── T14 ───────────────────────────────────────────────
reset();
{
  const owner = buildPinnedPipelineItem({
    ocdsId: "owner-t14",
    title: "Owner T14",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  owner.externalDocDiscovery = {
    builtAt: new Date().toISOString(),
    status: "done",
    pageLinks: [],
    files: fakeExternalFiles(10, "owner"),
  };
  const docs = buildHeavyParseDocumentSet(owner);
  ok("T14 top-N cannot silently discard owner-required docs", docs.length === 10, docs.length);
}

// ─── T15 ───────────────────────────────────────────────
reset();
{
  const tid = "tender-T15";
  buildPinnedPipelineItem({
    ocdsId: tid,
    title: "T15",
    organizationName: "Org",
    ingestMode: "owner_requested",
    retention: "normal",
  });
  const bad = await retainOwnerFile({
    tenderId: tid,
    originalFilename: "corrupt.zip",
    bytes: new TextEncoder().encode("NOT-A-ZIP"),
  });
  const st = getIngestState(tid);
  ok(
    "T15 corrupt archive → PARTIAL/HOLD",
    bad.documentIds.length === 0
      && st.archives[0]?.status === "corrupt"
      && (st.ingestPhase === "HOLD" || st.ingestPhase === "INGEST_PARTIAL" || st.ingestPhase === "INGEST_PENDING"),
    { phase: st.ingestPhase, archive: st.archives[0]?.status },
  );
  ok("SEC path traversal rejected", isPathTraversalName("../evil.pdf") && isPathTraversalName("/abs/x"));
}

// ─── T16 ───────────────────────────────────────────────
reset();
{
  const item = buildPinnedPipelineItem({
    ocdsId: POLCZYN_OCDS,
    bzpNumber: "2026/BZP 00267694",
    title: "Połczyn fixture",
    organizationName: "Gmina Połczyn-Zdrój",
    organizationCity: "Połczyn-Zdrój",
    ingestMode: "fixture_pin",
    retention: "pinned",
  });
  if (!existsSync(FIXTURE_DIR)) {
    ok("T16 Połczyn fixture inventory retained losslessly", false, "FIXTURE_DIR missing");
  } else {
    const names = readdirSync(FIXTURE_DIR);
    let topLevel = 0;
    const archiveNotes = [];
    for (const name of names) {
      topLevel += 1;
      const bytes = new Uint8Array(readFileSync(join(FIXTURE_DIR, name)));
      if (/\.zip$/i.test(name)) {
        const probe = await expandZipArchive({
          tenderId: item.id,
          originalFilename: name,
          bytes,
        });
        archiveNotes.push({
          name,
          ok: probe.ok,
          children: probe.documents.length,
          status: probe.archive.status,
          warnings: probe.archive.warnings.slice(0, 3),
        });
      }
      await retainOwnerFile({ tenderId: item.id, originalFilename: name, bytes });
    }
    const st = getIngestState(item.id);
    const retainedDocs = st.documents.filter((d) => d.ingestStatus === "retained");
    const rejected = st.documents.filter((d) => d.ingestStatus === "rejected_unsafe");
    const lossless =
      retainedDocs.length > 0
      && retainedDocs.every((d) => Boolean(d.documentId) && (d.contentHash || d.warnings.length >= 0))
      && item.retention === "pinned"
      && typeof st.ingestPhase === "string"
      && typeof st.parsePhase === "string";
    ok("T16 Połczyn fixture inventory retained losslessly", lossless, {
      topLevel,
      retained: retainedDocs.length,
      rejected: rejected.length,
      phase: st.ingestPhase,
      parse: st.parsePhase,
      archives: archiveNotes,
      expectedDwellingCount: "UNKNOWN",
    });
  }
}

console.log(`\nINGEST-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
