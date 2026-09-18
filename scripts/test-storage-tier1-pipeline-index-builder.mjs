/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 2: NEW-02 FULL → INDEX builder.
 * Design Freeze v1.1 §2.2 / §2.3 / §A.4 / §A.6. Reader detection (§2.4 `detectPipelineLsKind`),
 * dual-write (§3.2) and LS cutover are Phase 3–5 scope and NOT covered here.
 *
 * Run: npx vite-node scripts/test-storage-tier1-pipeline-index-builder.mjs
 */

import { installIdbStub } from "./_lib/idb-memory-stub.mjs";

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) { this._m.set(String(k), String(v)); },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};

let pass = 0;
let fail = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; failures.push(name); console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail) : ""); }
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const idb = installIdbStub({ mode: "ok" });
idb.reset();
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");

const {
  tryBuildTenderPipelineLsIndex: tryBuild,
  buildTenderPipelineLsIndex: build,
  PIPELINE_INDEX_BASE_FIELDS,
  PIPELINE_INDEX_NESTED_FIELDS,
  PIPELINE_INDEX_MARKER_FIELD,
  PipelineIndexBuildRejectedError,
  validatePipelineFullForWrite,
  parsePipelineIdbEnvelope,
} = cold;

// ---------------------------------------------------------------------------
// Fixtures — FULL with every heavy / FULL-only field from DF §2.2 "Nie w INDEX"
// ---------------------------------------------------------------------------

function fullItem(n, extra = {}) {
  const id = `t-${String(n).padStart(4, "0")}`;
  return {
    id,
    bzpNumber: `2026/BZP ${n}`,
    noticeNumber: `N-${n}`,
    title: `Remont lokalu ${n}`,
    organizationName: "Wrocławskie Mieszkania",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45453000-7",
    publicationDate: "2026-09-01",
    submittingOffersDate: n % 3 === 0 ? null : "2026-09-20T10:00:00.000Z",
    orderType: "roboty budowlane",
    tenderId: `ocds-${n}`,
    moIdentifier: `MO-${n}`,
    status: n % 2 === 0 ? "new" : "analyzing",
    notes: "prywatna notatka — FULL only",
    relevanceScore: 40 + (n % 50),
    matchedKeywords: ["remont", "lokal"],
    isWroclaw: true,
    priorityBuyerId: n % 4 === 0 ? "wm" : null,
    priorityBuyerLabel: n % 4 === 0 ? "WM" : null,
    addedAt: "2026-09-01T08:00:00.000Z",
    updatedAt: `2026-09-1${n % 10}T09:00:00.000Z`,
    ezamowieniaUrl: `https://ezamowienia.gov.pl/${n}`,
    bzpDocuments: [{ name: "SWZ.pdf", url: "https://x/swz.pdf", kind: "swz" }],
    documentsFetchedAt: "2026-09-02T00:00:00.000Z",
    swzAnalysis: {
      estimatedValuePln: 120000 + n,
      estimatedValueRaw: `${120000 + n} zł`,
      wadiumPln: 2000,
      wadiumRaw: "2 000 zł",
      wadiumPercent: 1.5,
      referenceRequirement: "1 robota 100k",
      qualificationHints: ["h1"],
      formalRequirements: [{ kind: "x" }],
      participationRequirements: [{ kind: "y" }],
      experienceRequirements: [{ kind: "z" }],
      implementationDeadlineRaw: "60 dni",
      implementationDays: 60,
      technicalRequirements: ["tr1", "tr2"],
      tableExtracts: ["row a", "row b"],
      costLines: [{ name: "c", qty: 1 }],
      parsedAt: "2026-09-02T01:00:00.000Z",
      source: "pdf",
      sourceFilename: "SWZ.pdf",
      profitabilityHint: "good",
      profitabilityNote: "długa notatka opłacalności — FULL only",
      awardCriteria: [{ name: "cena", weightPct: 60, maxPoints: 60, description: "" }],
    },
    uploadedFile: { name: "kosztorys.xlsx", dataUrl: "data:...", size: 1234 },
    ourEstimatePln: 99000 + n,
    linkedJobId: n % 5 === 0 ? `job-${n}` : null,
    tenderState: "ongoing",
    noticeHtml: `<html><body>${"x".repeat(2000)}</body></html>`,
    noticeHtmlFetchedAt: "2026-09-02T02:00:00.000Z",
    tenderDossier: {
      brief: { summary: "brief" },
      kosztorys: { ok: true, rows: Array.from({ length: 40 }, (_, i) => ({ lp: i + 1, name: `poz ${i}`, qty: 1 })), rowCount: 40 },
      catalogQuantities: [{ code: "KNR", qty: 3 }],
      bidProposal: { recommendedBidPln: 111000 },
      scanSummary: { artifacts: [{ snapshot: { big: "…" } }] },
    },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"], matchedProfileItems: ["p1"], computedAt: "2026-09-02T03:00:00.000Z" },
    externalDocDiscovery: { links: ["https://bip"], files: [] },
    estimateHistory: [{ pln: 95000, at: "2026-09-01T00:00:00.000Z" }],
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: n % 7 === 0, source: "bzp" },
    awardFetchAttemptedAt: "2026-09-25T00:00:00.000Z",
    submittedBidPln: 105000,
    submittedAt: "2026-09-19T00:00:00.000Z",
    ikFinalBid: { v: 1, finalBidPln: 104500, approvedAt: "2026-09-18T00:00:00.000Z", approvedBy: "owner", basis: { estimatePln: 99000 } },
    changeMonitor: { lastCheckedAt: "2026-09-10T00:00:00.000Z", events: [{ at: "2026-09-10", kind: "docs_changed" }] },
    qaMonitor: { lastCheckedAt: "2026-09-10T00:00:00.000Z", events: [{ at: "2026-09-10", q: "?", a: "!" }] },
    ocdsId: `ocds-${n}`,
    ingestMode: "owner_requested",
    retention: "pinned",
    sourceUrls: ["https://bip/x"],
    ...extra,
  };
}

const FULL = Array.from({ length: 12 }, (_, i) => fullItem(i + 1));
const SEQ = 7;

const HEAVY_OR_FULL_ONLY_KEYS = [
  "noticeHtml", "noticeHtmlFetchedAt", "tenderDossier", "kosztorys", "rows", "catalogQuantities", "bidProposal",
  "scanSummary", "snapshot", "bzpDocuments", "uploadedFile", "externalDocDiscovery", "changeMonitor", "qaMonitor",
  "events", "estimateHistory", "notes", "orderType", "moIdentifier", "noticeNumber", "ezamowieniaUrl",
  "documentsFetchedAt", "submittedBidPln", "submittedAt", "ocdsId", "ingestMode", "retention", "sourceUrls",
  "_cloudLean", "_coldRowsCount", "_rowsOmitted", "awardFetchAttemptedAt",
  // nested FULL-only
  "winnerName", "amountPln", "source", "reasons", "matchedProfileItems", "computedAt", "referenceRequirement",
  "qualificationHints", "formalRequirements", "participationRequirements", "experienceRequirements",
  "implementationDeadlineRaw", "technicalRequirements", "tableExtracts", "costLines", "parsedAt", "sourceFilename",
  "profitabilityNote", "awardCriteria",
];

function collectKeysDeep(value, out = new Set()) {
  if (Array.isArray(value)) { for (const v of value) collectKeysDeep(v, out); return out; }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) { out.add(k); collectKeysDeep(v, out); }
  }
  return out;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const ALLOWED_TOP = new Set([...PIPELINE_INDEX_BASE_FIELDS, ...Object.keys(PIPELINE_INDEX_NESTED_FIELDS), PIPELINE_INDEX_MARKER_FIELD]);

// ---------------------------------------------------------------------------
// T-INDEX-BUILDER-FULL
// ---------------------------------------------------------------------------
const r = tryBuild(FULL, SEQ);
assert("T-INDEX-BUILDER-FULL result ok", r.ok === true && r.seq === SEQ);
assert("T-INDEX-BUILDER-FULL length preserved", r.ok && r.index.length === FULL.length);
assert("T-INDEX-BUILDER-FULL output classified INDEX (NEW-08)", r.ok && repr.classifyPipelineRepresentation(r.index) === "INDEX");
assert("T-INDEX-BUILDER-FULL hasLsIndexMarker", r.ok && repr.hasLsIndexMarker(r.index) === true);
const frozenSig = build(FULL, SEQ);
assert("T-INDEX-BUILDER-FULL frozen signature (DF §2.3) equals result variant", sameJson(frozenSig, r.index));
assert("T-INDEX-BUILDER-FULL frozen signature returns a new array (not input)", frozenSig !== FULL && frozenSig[0] !== FULL[0]);
const INDEX = r.index;

// ---------------------------------------------------------------------------
// T-INDEX-ALLOWLIST — exactly DF §2.3 keys, nothing else
// ---------------------------------------------------------------------------
assert("T-INDEX-ALLOWLIST base list = 22 fields (DF §2.2 rows, §2.3 Pick 18 + 4 nullable)", PIPELINE_INDEX_BASE_FIELDS.length === 22);
assert("T-INDEX-ALLOWLIST nested = 3 projections (awardResult, tenderFit, swzAnalysis)",
  sameJson(Object.keys(PIPELINE_INDEX_NESTED_FIELDS), ["awardResult", "tenderFit", "swzAnalysis"]));
{
  let allOk = true;
  let exactOk = true;
  for (const it of INDEX) {
    const keys = Object.keys(it);
    if (!keys.every((k) => ALLOWED_TOP.has(k))) allOk = false;
    if (keys.length !== ALLOWED_TOP.size) exactOk = false;
  }
  assert("T-INDEX-ALLOWLIST every top-level key ∈ allow-list", allOk, INDEX[0] && Object.keys(INDEX[0]));
  assert("T-INDEX-ALLOWLIST every item has exactly allow-list keys (22 + 3 + marker = 26)", exactOk, INDEX[0] && Object.keys(INDEX[0]).length);
}
{
  // DF type shape: every listed field present as own property (nullable ones as null when absent)
  const it = INDEX[0];
  assert("T-INDEX-ALLOWLIST nullable fields are own properties", ["ikFinalBid", "linkedJobId", "ourEstimatePln", "tenderState", "awardResult", "tenderFit", "swzAnalysis"].every((k) => Object.prototype.hasOwnProperty.call(it, k)));
}

// ---------------------------------------------------------------------------
// T-INDEX-NO-HEAVY — no heavy / FULL-only key anywhere in the tree
// ---------------------------------------------------------------------------
{
  const keys = collectKeysDeep(INDEX);
  const leaked = HEAVY_OR_FULL_ONLY_KEYS.filter((k) => keys.has(k));
  assert("T-INDEX-NO-HEAVY zero FULL-only keys in INDEX tree", leaked.length === 0, leaked);
  const json = JSON.stringify(INDEX);
  assert("T-INDEX-NO-HEAVY noticeHtml body absent", !json.includes("<html>") && !json.includes("xxxxxxxx"));
  assert("T-INDEX-NO-HEAVY kosztorys rows absent", !json.includes("\"lp\":") && !json.includes("poz 0"));
  assert("T-INDEX-NO-HEAVY events absent", !json.includes("docs_changed"));
  assert("T-INDEX-NO-HEAVY snapshot absent", !json.includes("\"snapshot\""));
  const fullBytes = JSON.stringify(FULL).length;
  assert("T-INDEX-NO-HEAVY INDEX materially smaller than FULL (>3x)", json.length * 3 < fullBytes, { index: json.length, full: fullBytes });
}

// ---------------------------------------------------------------------------
// T-INDEX-MARKER / T-INDEX-SEQUENCE
// ---------------------------------------------------------------------------
assert("T-INDEX-MARKER every item has _lsIndex {v:1, seq}", INDEX.every((it) => it._lsIndex && it._lsIndex.v === 1 && it._lsIndex.seq === SEQ && Object.keys(it._lsIndex).length === 2));
assert("T-INDEX-MARKER marker object not shared between items", INDEX[0]._lsIndex !== INDEX[1]._lsIndex);
assert("T-INDEX-SEQUENCE marker seq = passed localSeq", INDEX.every((it) => it._lsIndex.seq === SEQ));
{
  const r2 = tryBuild(FULL, 42);
  assert("T-INDEX-SEQUENCE different seq → different marker, same payload", r2.ok && r2.index.every((it) => it._lsIndex.seq === 42)
    && sameJson(r2.index.map(({ _lsIndex, ...rest }) => rest), INDEX.map(({ _lsIndex, ...rest }) => rest)));
}
{
  // Integration with Phase 1 localSeq contract: seq comes from ACKed envelope, never invented by builder.
  const wr = await cold.setPipelineColdMemory(FULL, { writer: "phase2-test" });
  assert("T-INDEX-SEQUENCE Phase 1 write ACK ok", wr.ok === true && wr.localSeq >= 1);
  const meta = cold.getPipelineColdEnvelopeMeta();
  const r3 = tryBuild(cold.getPipelineColdMemory(), wr.localSeq);
  assert("T-INDEX-SEQUENCE INDEX built from ACKed RAM FULL carries envelope.localSeq", r3.ok && meta && r3.index.every((it) => it._lsIndex.seq === meta.localSeq && it._lsIndex.seq === wr.localSeq));
  // Builder never touched IDB: raw envelope still FULL (no marker), same localSeq.
  const raw = idb.getRaw(cold.PIPELINE_COLD_IDB_KEY)?.value;
  const parsed = parsePipelineIdbEnvelope(raw);
  assert("T-INDEX-SEQUENCE builder did not write IDB (envelope FULL, OK, same seq)", parsed.status === "OK" && parsed.envelope.localSeq === wr.localSeq && !repr.hasLsIndexMarker(parsed.envelope.items), parsed.status);
  assert("T-INDEX-SEQUENCE builder did not write localStorage", globalThis.localStorage.length === 0);
}

// ---------------------------------------------------------------------------
// T-INDEX-DETERMINISTIC
// ---------------------------------------------------------------------------
{
  const a = tryBuild(FULL, SEQ);
  const b = tryBuild(FULL, SEQ);
  assert("T-INDEX-DETERMINISTIC same FULL + same seq → identical JSON", a.ok && b.ok && sameJson(a.index, b.index));
  assert("T-INDEX-DETERMINISTIC identical key order", a.ok && b.ok && sameJson(Object.keys(a.index[3]), Object.keys(b.index[3])));
  assert("T-INDEX-DETERMINISTIC stable vs earlier build", a.ok && sameJson(a.index, INDEX));
}

// ---------------------------------------------------------------------------
// T-INDEX-NO-MUTATION
// ---------------------------------------------------------------------------
{
  const snapshot = JSON.stringify(FULL);
  const frozen = deepFreeze(JSON.parse(snapshot));
  let threw = null;
  let out = null;
  try { out = tryBuild(frozen, SEQ); } catch (e) { threw = e; }
  assert("T-INDEX-NO-MUTATION deep-frozen FULL builds without throwing (strict mode)", threw === null && out && out.ok, threw && String(threw));
  assert("T-INDEX-NO-MUTATION FULL JSON unchanged after build", JSON.stringify(FULL) === snapshot);
  assert("T-INDEX-NO-MUTATION FULL items have no _lsIndex after build", !repr.hasLsIndexMarker(FULL) && repr.classifyPipelineRepresentation(FULL) === "FULL");
  assert("T-INDEX-NO-MUTATION FULL still validates as FULL", validatePipelineFullForWrite(FULL).ok === true);
}

// ---------------------------------------------------------------------------
// T-INDEX-REJECTS-INDEX (+ INDEX_INVALID, NOT_ARRAY, full_invalid, seq_invalid)
// ---------------------------------------------------------------------------
{
  const ri = tryBuild(INDEX, SEQ + 1);
  assert("T-INDEX-REJECTS-INDEX result index_not_full", ri.ok === false && ri.reason === "index_not_full");
  let err = null;
  try { build(INDEX, SEQ + 1); } catch (e) { err = e; }
  assert("T-INDEX-REJECTS-INDEX frozen signature throws PipelineIndexNotFullError (NEW-08)", err instanceof repr.PipelineIndexNotFullError && err.code === "PIPELINE_INDEX_NOT_FULL");

  const mixed = [FULL[0], INDEX[1]];
  const rm = tryBuild(mixed, SEQ);
  assert("T-INDEX-REJECTS-INDEX mixed collection → index_invalid (never partial INDEX)", rm.ok === false && rm.reason === "index_invalid");
  let errM = null;
  try { build(mixed, SEQ); } catch (e) { errM = e; }
  assert("T-INDEX-REJECTS-INDEX mixed throws PipelineIndexNotFullError", errM instanceof repr.PipelineIndexNotFullError);

  const rDiffSeq = tryBuild([INDEX[0], { ...INDEX[1], _lsIndex: { v: 1, seq: 999 } }], SEQ);
  assert("T-INDEX-REJECTS-INDEX differing seq → index_invalid", rDiffSeq.ok === false && rDiffSeq.reason === "index_invalid");

  // INDEX → INDEX → FULL impossible: re-marking with a fresh seq is refused, marker cannot be "refreshed" via builder.
  const rRe = tryBuild(INDEX.map((it) => ({ ...it })), 1000);
  assert("T-INDEX-REJECTS-INDEX INDEX→INDEX re-build refused", rRe.ok === false && rRe.reason === "index_not_full");

  assert("T-INDEX-REJECTS not_array", tryBuild(null, SEQ).reason === "not_array" && tryBuild({ items: FULL }, SEQ).reason === "not_array" && tryBuild("x", SEQ).reason === "not_array");
  let errNa = null;
  try { build(null, SEQ); } catch (e) { errNa = e; }
  assert("T-INDEX-REJECTS not_array throws PipelineIndexBuildRejectedError", errNa instanceof PipelineIndexBuildRejectedError && errNa.reason === "not_array" && errNa.code === "PIPELINE_INDEX_BUILD_REJECTED");

  const dup = tryBuild([FULL[0], { ...FULL[1], id: FULL[0].id }], SEQ);
  assert("T-INDEX-REJECTS full_invalid duplicate_id", dup.ok === false && dup.reason === "full_invalid" && dup.validationReason === "duplicate_id");
  const noId = tryBuild([FULL[0], { ...FULL[1], id: "" }], SEQ);
  assert("T-INDEX-REJECTS full_invalid item_without_id", noId.ok === false && noId.reason === "full_invalid" && noId.validationReason === "item_without_id");
  const notObj = tryBuild([FULL[0], 5], SEQ);
  assert("T-INDEX-REJECTS full_invalid item_not_object", notObj.ok === false && notObj.reason === "full_invalid");

  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", undefined, null]) {
    const rs = tryBuild(FULL, bad);
    assert(`T-INDEX-REJECTS seq_invalid (${String(bad)})`, rs.ok === false && rs.reason === "seq_invalid");
  }
  const rEmpty = tryBuild([], SEQ);
  assert("T-INDEX EMPTY FULL → empty INDEX collection (no items, nothing to mark)", rEmpty.ok === true && rEmpty.index.length === 0);
}

// ---------------------------------------------------------------------------
// T-INDEX-REJECTS-LEGACY-LEAN / T-INDEX-REJECTS-CLOUD-LEAN — DF-defined behaviour (§A.4, §8.2, §A.5.3)
// LEAN classes are FULL-compatible, recognised by the CALLER (provenance), never by the builder (§A.4 ii).
// The builder must therefore: never recover heavy data, never emit LEAN markers, never act as FULL recovery.
// ---------------------------------------------------------------------------
{
  const legacyLean = FULL.map((it) => {
    const { noticeHtml, ...rest } = it;
    return {
      ...rest,
      tenderDossier: { ...it.tenderDossier, kosztorys: { ...it.tenderDossier.kosztorys, rows: [], _coldRowsCount: 40 } },
    };
  });
  const rl = tryBuild(legacyLean, SEQ);
  assert("T-INDEX-REJECTS-LEGACY-LEAN builder is not a LEAN→FULL recovery (no rows / dossier in output)", rl.ok && !collectKeysDeep(rl.index).has("_coldRowsCount") && !collectKeysDeep(rl.index).has("tenderDossier"));
  assert("T-INDEX-REJECTS-LEGACY-LEAN projection identical to FULL projection (heavy fields irrelevant to INDEX)", rl.ok && sameJson(rl.index, INDEX));
  assert("T-INDEX-REJECTS-LEGACY-LEAN LEAN input still classified by NEW-08 as shape FULL (provenance = caller)", repr.classifyPipelineRepresentation(legacyLean) === "FULL");

  const cloudLean = FULL.map((it) => ({
    ...it,
    noticeHtml: undefined,
    tenderDossier: { ...it.tenderDossier, kosztorys: { ...it.tenderDossier.kosztorys, rows: [], _rowsOmitted: true } },
    _cloudLean: { v: 1, omitted: ["noticeHtml", "kosztorys.rows", "artifact.snapshot", "changeMonitor.events", "qaMonitor.events"] },
  }));
  const rc = tryBuild(cloudLean, SEQ);
  assert("T-INDEX-REJECTS-CLOUD-LEAN _cloudLean marker never projected into INDEX", rc.ok && !collectKeysDeep(rc.index).has("_cloudLean") && !collectKeysDeep(rc.index).has("_rowsOmitted"));
  assert("T-INDEX-REJECTS-CLOUD-LEAN projection identical to FULL projection", rc.ok && sameJson(rc.index, INDEX));

  // No reverse path exists in the module surface: nothing consumes INDEX to produce FULL.
  const exportNames = Object.keys(cold);
  const reverse = exportNames.filter((n) => /fromIndex|indexToFull|restoreIndex|rebuildFull|unindex|promote/i.test(n));
  assert("T-INDEX-REJECTS no INDEX→FULL export in cold module", reverse.length === 0, reverse);
}

// ---------------------------------------------------------------------------
// T-INDEX-NO-FULL-PROMOTION — INDEX cannot pass any FULL gate (Phase 1 backstops)
// ---------------------------------------------------------------------------
{
  const v = validatePipelineFullForWrite(INDEX);
  assert("T-INDEX-NO-FULL-PROMOTION validatePipelineFullForWrite(INDEX) → index_not_full", v.ok === false && v.reason === "index_not_full");
  const env = { schemaVersion: 1, bundleRevision: 0, localSeq: SEQ, itemCount: INDEX.length, writtenAt: new Date().toISOString(), maxUpdatedAt: "", items: INDEX };
  const p = parsePipelineIdbEnvelope(env);
  assert("T-INDEX-NO-FULL-PROMOTION envelope with INDEX items → CORRUPT item_index_marker", p.status === "CORRUPT" && p.reason === "item_index_marker");
  const pArr = parsePipelineIdbEnvelope(INDEX);
  assert("T-INDEX-NO-FULL-PROMOTION raw INDEX array is not LEGACY_ARRAY", pArr.status === "CORRUPT" && pArr.reason === "item_index_marker");

  const before = cold.getPipelineColdMemory();
  const wr = await cold.setPipelineColdMemory(INDEX, { writer: "phase2-test-index" });
  assert("T-INDEX-NO-FULL-PROMOTION setPipelineColdMemory(INDEX) refused", wr.ok === false && wr.reason === "validation_failed" && wr.validationReason === "index_not_full");
  assert("T-INDEX-NO-FULL-PROMOTION coldMem untouched by INDEX", cold.getPipelineColdMemory() === before && !repr.hasLsIndexMarker(cold.getPipelineColdMemory()));
  const raw = idb.getRaw(cold.PIPELINE_COLD_IDB_KEY)?.value;
  assert("T-INDEX-NO-FULL-PROMOTION IDB envelope untouched by INDEX", parsePipelineIdbEnvelope(raw).status === "OK" && !repr.hasLsIndexMarker(raw.items));

  // Stripping the marker to "fake FULL" is a forbidden conversion; the module offers no helper for it.
  assert("T-INDEX-NO-FULL-PROMOTION no marker-strip helper exported", !Object.keys(cold).some((n) => /strip.*Index|remove.*Marker|unmark/i.test(n)));
}

// ---------------------------------------------------------------------------
// T-INDEX-NESTED-PROJECTIONS
// ---------------------------------------------------------------------------
{
  const it = INDEX[0];
  const src = FULL[0];
  assert("T-INDEX-NESTED awardResult exactly {isUs, fetchedAt}", sameJson(Object.keys(it.awardResult), ["isUs", "fetchedAt"]) && it.awardResult.isUs === src.awardResult.isUs && it.awardResult.fetchedAt === src.awardResult.fetchedAt);
  assert("T-INDEX-NESTED tenderFit exactly {fitLabel, winChancePct}", sameJson(Object.keys(it.tenderFit), ["fitLabel", "winChancePct"]) && it.tenderFit.fitLabel === "strong" && it.tenderFit.winChancePct === 55);
  assert("T-INDEX-NESTED swzAnalysis exactly 7 allow-listed keys", sameJson(Object.keys(it.swzAnalysis), [...PIPELINE_INDEX_NESTED_FIELDS.swzAnalysis])
    && it.swzAnalysis.profitabilityHint === "good" && it.swzAnalysis.estimatedValuePln === src.swzAnalysis.estimatedValuePln
    && it.swzAnalysis.estimatedValueRaw === src.swzAnalysis.estimatedValueRaw && it.swzAnalysis.implementationDays === 60
    && it.swzAnalysis.wadiumPercent === 1.5 && it.swzAnalysis.wadiumPln === 2000 && it.swzAnalysis.wadiumRaw === "2 000 zł");
  assert("T-INDEX-NESTED nested objects are new objects (not FULL references)", it.awardResult !== src.awardResult && it.tenderFit !== src.tenderFit && it.swzAnalysis !== src.swzAnalysis);

  const bare = fullItem(99, { awardResult: undefined, tenderFit: null, swzAnalysis: undefined, ikFinalBid: undefined, linkedJobId: undefined, ourEstimatePln: undefined, tenderState: undefined });
  delete bare.awardResult;
  delete bare.swzAnalysis;
  const rb = tryBuild([bare], SEQ);
  const b = rb.ok && rb.index[0];
  assert("T-INDEX-NESTED missing awardResult → null (DF `| null`, no fake object)", b && b.awardResult === null);
  assert("T-INDEX-NESTED tenderFit null → null", b && b.tenderFit === null);
  assert("T-INDEX-NESTED missing swzAnalysis → null", b && b.swzAnalysis === null);
  assert("T-INDEX-NESTED missing ikFinalBid/linkedJobId/ourEstimatePln/tenderState → null (DF `?? null`)", b && b.ikFinalBid === null && b.linkedJobId === null && b.ourEstimatePln === null && b.tenderState === null);
  assert("T-INDEX-NESTED no fake defaults (0/false/[]/\"\") for absent nullable fields", b && ![b.ikFinalBid, b.linkedJobId, b.ourEstimatePln, b.tenderState, b.awardResult, b.tenderFit, b.swzAnalysis].some((v) => v === 0 || v === false || v === "" || (Array.isArray(v) && v.length === 0)));

  const swzNoWadiumPct = fullItem(98);
  delete swzNoWadiumPct.swzAnalysis.wadiumPercent;
  const rw = tryBuild([swzNoWadiumPct], SEQ);
  assert("T-INDEX-NESTED optional wadiumPercent absent → undefined (dropped by JSON), not invented", rw.ok && rw.index[0].swzAnalysis.wadiumPercent === undefined && !JSON.stringify(rw.index[0]).includes("wadiumPercent"));
}

// ---------------------------------------------------------------------------
// T-INDEX-ID-PRESERVATION / T-INDEX-UPDATEDAT-PRESERVATION / T-INDEX-IKFINALBID-PRESERVATION
// ---------------------------------------------------------------------------
assert("T-INDEX-ID-PRESERVATION ids preserved in order", sameJson(INDEX.map((i) => i.id), FULL.map((i) => i.id)));
assert("T-INDEX-ID-PRESERVATION count preserved (no dedup, no filter)", INDEX.length === FULL.length);
assert("T-INDEX-UPDATEDAT-PRESERVATION updatedAt preserved 1:1", INDEX.every((it, i) => it.updatedAt === FULL[i].updatedAt));
assert("T-INDEX-IKFINALBID-PRESERVATION ikFinalBid preserved (deep equal)", INDEX.every((it, i) => sameJson(it.ikFinalBid, FULL[i].ikFinalBid)));
assert("T-INDEX base scalar fields preserved 1:1", INDEX.every((it, i) => ["title", "status", "submittingOffersDate", "publicationDate", "organizationName", "organizationCity", "organizationProvince", "cpvCode", "tenderId", "bzpNumber", "relevanceScore", "isWroclaw", "priorityBuyerId", "priorityBuyerLabel", "addedAt", "linkedJobId", "ourEstimatePln", "tenderState"].every((k) => it[k] === FULL[i][k])));
assert("T-INDEX matchedKeywords preserved (same values)", INDEX.every((it, i) => sameJson(it.matchedKeywords, FULL[i].matchedKeywords)));

// ---------------------------------------------------------------------------
// P-2 observation — INDEX build + serialize for 505 synthetic items (DF §14, informational)
// ---------------------------------------------------------------------------
{
  const big = Array.from({ length: 505 }, (_, i) => fullItem(i + 1));
  // warm-up
  tryBuild(big, 1);
  const t0 = performance.now();
  const rb = tryBuild(big, 2);
  const t1 = performance.now();
  const json = JSON.stringify(rb.index);
  const t2 = performance.now();
  const fullJson = JSON.stringify(big);
  console.log(`P-2 OBS build(505)=${(t1 - t0).toFixed(2)}ms serialize(505)=${(t2 - t1).toFixed(2)}ms indexBytes=${json.length} fullBytes=${fullJson.length} ratio=${(fullJson.length / json.length).toFixed(1)}x`);
  assert("P-2 OBS 505 items build+serialize measured", rb.ok && rb.index.length === 505);
}

console.log(`\nPhase 2 INDEX builder: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) { console.log("FAILURES:", failures); process.exit(1); }
