/**
 * KL-7-P1 — Details / History / Offline proposed update (offline only).
 * T1–T22 · ZERO HTTP · ZERO invent VERIFIED · ZERO 12J / Owner map / OUR RATE.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import {
  appendKnrCatalogHistory,
  capKnrCatalogHistory,
  KNR_CATALOG_HISTORY_CAP,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-history.ts";
import {
  compareKnrCatalogUpdate,
  asNonAuthorityProposedEntry,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-update-compare.ts";
import {
  applyKnrCatalogProposedUpdateOffline,
  buildOfflineProposedFixtureFromCurrent,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-proposed-update.ts";
import {
  emptyKnrCatalogStore,
  normalizeKnrCatalogEntry,
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import { persistVerifiedKnrCatalogEntryInMemory } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts";
import { mergeKnrCatalogStoreDetailed } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge.ts";
import {
  lookupKnrCatalog,
  isKnrCatalogEntryServable,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-lookup.ts";
import { buildKnrNormContentHash } from "../src/lib/intelligent-estimator/knr-knowledge/knr-content-hash.ts";
import { foldIdentityKeyV2 } from "../src/lib/intelligent-estimator/knr-knowledge/knr-identity-v2.ts";
import { OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { buildKnrCatalogUiRows } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-ui.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-08-22T10:00:00.000Z";

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function buildEntry(overrides = {}) {
  const identity = {
    family: "KNR",
    catalog: "4-01",
    publisher: "TEST-PUB",
    edition: "2020",
    table: "0101",
    column: "01",
    item: "01",
    ...(overrides.identity || {}),
  };
  const identityKeyV2 = overrides.identityKeyV2 ?? foldIdentityKeyV2(identity);
  const evidenceKeyV1 =
    overrides.evidenceKeyV1 ?? `${identity.family}|${identity.catalog}|1202-07`;
  const norms = overrides.norms ?? {
    laborNorms: [
      {
        kind: "R",
        code: "R1",
        description: "robocizna",
        unit: "r-g",
        quantity: 1.2,
        sourceRef: "src-r",
      },
    ],
    materialNorms: [
      {
        kind: "M",
        code: "M1",
        description: "materiał",
        unit: "kg",
        quantity: 3,
        sourceRef: null,
      },
    ],
    equipmentNorms: [
      {
        kind: "S",
        code: "S1",
        description: "sprzęt",
        unit: "m-h",
        quantity: 0.5,
        sourceRef: null,
      },
    ],
  };
  const contentHash = overrides.contentHash ?? buildKnrNormContentHash(norms);
  return {
    schemaVersion: 1,
    identityKeyV2,
    evidenceKeyV1,
    identity,
    originalSourceCode: "4-01 1202-07",
    displayCode: "KNR 4-01 1202-07",
    description: "Opis testowy",
    unit: "m2",
    norms,
    provenance: {
      sourceType: "LICENSED_PROGRAM_EXPORT",
      sourceIdentifier: "ath-fixture",
      acquisitionMethod: "LICENSED_EXPORT",
      capturedAt: NOW,
      retrievedAt: NOW,
      parserVersion: "test-p1",
      contentHash,
      rawEvidenceRef: { refId: "ev-1", contentHash: "blob-1" },
      revision: 0,
    },
    verificationStatus: overrides.verificationStatus ?? "PENDING_VERIFY",
    validationState: "PASS",
    lifecycleState: "ACTIVE",
    contentHash,
    verifiedAt: overrides.verifiedAt ?? null,
    verifiedBy: overrides.verifiedBy ?? null,
    createdAt: NOW,
    updatedAt: NOW,
    catalogRevision: overrides.catalogRevision,
    history: overrides.history,
    proposedUpdate: overrides.proposedUpdate ?? null,
    ...overrides.rest,
  };
}

function asVerified(entry) {
  return {
    ...entry,
    verificationStatus: "VERIFIED",
    verifiedAt: NOW,
    verifiedBy: "owner-dawid",
    validationState: "PASS",
  };
}

// --- T1 details render (panel markers) ---
const panel = readSrc("src/app/knr-catalog/KnrCatalogPanel.tsx");
ok("T1 details sections present", panel.includes("IDENTYFIKACJA") && panel.includes("NORMY") && panel.includes("WERYFIKACJA") && panel.includes("PROVENANCE") && panel.includes("OPS"));
ok("T1 no PLN in panel code", !/ourRatePln|pricePln|companyPrice/i.test(panel.replace(/\/\*[\s\S]*?\*\//g, "")));

// --- T2 history append-only ---
const h0 = [];
const h1 = appendKnrCatalogHistory(h0, {
  version: 1,
  at: NOW,
  kind: "VERIFY_APPROVE",
  contentHash: "aaa",
});
const h2 = appendKnrCatalogHistory(h1, {
  version: 1,
  at: "2026-08-22T11:00:00.000Z",
  kind: "PROPOSED_UPDATE",
  contentHash: "bbb",
  previousContentHash: "aaa",
});
ok("T2 append-only length", h1.length === 1 && h2.length === 2 && h0.length === 0);

// --- T3 history cap ---
const many = [];
for (let i = 0; i < KNR_CATALOG_HISTORY_CAP + 5; i += 1) {
  many.push({
    version: i,
    at: `2026-08-22T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`,
    kind: "OWNER_REVIEW",
    contentHash: `h${i}`,
  });
}
const capped = capKnrCatalogHistory(many);
ok("T3 history cap 50", capped.length === 50 && capped[0].contentHash === "h5");

// --- T4 revision only on authority ---
let store = emptyKnrCatalogStore(NOW);
const v1 = asVerified(buildEntry());
const p1 = persistVerifiedKnrCatalogEntryInMemory({ entry: v1, nowIso: NOW, store });
ok("T4 first revise=1", p1.ok && p1.outcome === "CREATED" && p1.store.entries[v1.identityKeyV2].catalogRevision === 1);
store = p1.store;
const proposed = buildOfflineProposedFixtureFromCurrent(store.entries[v1.identityKeyV2], NOW);
const propRes = applyKnrCatalogProposedUpdateOffline({
  identityKeyV2: v1.identityKeyV2,
  proposed,
  nowIso: NOW,
  storeOverride: store,
});
ok(
  "T4 proposed does not bump revision",
  propRes.ok
    && propRes.entry.catalogRevision === 1
    && propRes.entry.verificationStatus === "VERIFIED",
);
store = propRes.store;

const v2Norms = {
  ...v1.norms,
  laborNorms: [{ ...v1.norms.laborNorms[0], quantity: 2.5 }],
};
const v2Hash = buildKnrNormContentHash(v2Norms);
const v2 = asVerified({
  ...v1,
  norms: v2Norms,
  contentHash: v2Hash,
  provenance: { ...v1.provenance, contentHash: v2Hash },
});
const noFlag = persistVerifiedKnrCatalogEntryInMemory({
  entry: v2,
  nowIso: NOW,
  store,
});
ok("T22 conflict without supersede flag", noFlag.ok === false && noFlag.reason === "CONTENT_CONFLICT");

const superRes = persistVerifiedKnrCatalogEntryInMemory({
  entry: v2,
  nowIso: NOW,
  store,
  allowAuthoritySupersede: true,
  actorId: "owner-dawid",
  actorDisplayName: "Dawid",
});
ok(
  "T4 supersede bumps revision",
  superRes.ok
    && superRes.outcome === "SUPERSEDED"
    && superRes.store.entries[v1.identityKeyV2].catalogRevision === 2,
);

// --- T5–T11 compare ---
const base = buildEntry();
const same = compareKnrCatalogUpdate(base, { ...base });
ok("T5 SAME_HASH", same.status === "SAME_HASH");

const rChange = compareKnrCatalogUpdate(base, {
  ...base,
  norms: {
    ...base.norms,
    laborNorms: [{ ...base.norms.laborNorms[0], quantity: 9 }],
  },
  contentHash: "diff-r",
});
ok("T6 R change DIFF_REVIEW", rChange.status === "DIFF_REVIEW" && rChange.diffFlags.normsR === true);

const mChange = compareKnrCatalogUpdate(base, {
  ...base,
  norms: {
    ...base.norms,
    materialNorms: [{ ...base.norms.materialNorms[0], quantity: 99 }],
  },
  contentHash: "diff-m",
});
ok("T7 M change", mChange.diffFlags.normsM === true && mChange.status === "DIFF_REVIEW");

const sChange = compareKnrCatalogUpdate(base, {
  ...base,
  norms: {
    ...base.norms,
    equipmentNorms: [{ ...base.norms.equipmentNorms[0], quantity: 7 }],
  },
  contentHash: "diff-s",
});
ok("T8 S change", sChange.diffFlags.normsS === true);

const unitChange = compareKnrCatalogUpdate(base, {
  ...base,
  unit: "m3",
  contentHash: "diff-u",
});
ok("T9 unit CONFLICT", unitChange.status === "CONFLICT" && unitChange.diffFlags.unit === true);

const fam = compareKnrCatalogUpdate(base, {
  ...base,
  identity: { ...base.identity, family: "KNR-W" },
  evidenceKeyV1: "KNR-W|4-01|1202-07",
  identityKeyV2: foldIdentityKeyV2({ ...base.identity, family: "KNR-W" }),
  contentHash: "diff-f",
});
ok("T10 family mismatch CONFLICT", fam.status === "CONFLICT" && fam.diffFlags.family === true);

ok(
  "T11 KNR ≠ KNR-W reasons",
  fam.reasonsPl.some((r) => /KNR↔KNR-W|family/i.test(r)),
);

// --- T12 proposed cannot become VERIFIED ---
const spoof = asNonAuthorityProposedEntry(asVerified(buildEntry({ contentHash: "x" })));
ok(
  "T12 asNonAuthority strips VERIFIED",
  spoof.verificationStatus !== "VERIFIED" && spoof.verifiedAt == null,
);
ok(
  "T12 proposed bag keeps current VERIFIED",
  propRes.entry.verificationStatus === "VERIFIED"
    && propRes.entry.proposedUpdate?.proposedEntry?.verificationStatus !== "VERIFIED",
);

// --- T13 STALE separate ---
const staleEntry = buildEntry({
  verificationStatus: "STALE",
  rest: { verifiedAt: NOW, verifiedBy: "owner" },
});
ok("T13 STALE status preserved on entry", staleEntry.verificationStatus === "STALE");
const uiStale = buildKnrCatalogUiRows({
  entries: [
    {
      ...staleEntry,
      verifiedAt: NOW,
      verifiedBy: "owner",
    },
  ],
  nowMs: Date.parse(NOW),
});
ok("T13 UI shows STALE verification", uiStale[0]?.verificationStatus === "STALE");

// --- T14 source rendering ---
ok("T14 panel shows sourceType/sourceIdentifier", panel.includes("sourceType") && panel.includes("sourceIdentifier"));

// --- T15 Owner Map unchanged ---
ok("T15 owner map length 1", OWNER_KNR_MAPPINGS.length === 1);
ok(
  "T15 owner map frozen key",
  OWNER_KNR_MAPPINGS[0]?.normalizedKey === "KNR-W|4-01|1202-07",
);

// --- T16 OUR RATE untouched ---
const ourRate = readSrc("src/lib/work-catalog/work-rate-accept.ts");
ok("T16 work-rate-accept unchanged marker exists", ourRate.includes("appendOurWorkRateHistory"));
const gitOur = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-proposed-update.ts");
ok("T16 KNR proposed has no ourRate", !/ourRatePln|companyPrice/i.test(gitOur));

// --- T17 12J unchanged (files still WIP / not imported by P1) ---
const p1Files = [
  "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-history.ts",
  "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-update-compare.ts",
  "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-proposed-update.ts",
  "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts",
];
for (const f of p1Files) {
  const src = readSrc(f);
  ok(`T17 ${f} no work-rate-preserve`, !src.includes("work-rate-preserve"));
}

// --- T18 catalog hit HTTP=0 ---
store = superRes.store;
const hit = lookupKnrCatalog(
  { identityKeyV2: v1.identityKeyV2, evidenceKeyV1: v1.evidenceKeyV1 },
  store,
);
ok("T18 LOCAL_HIT after supersede", hit.status === "LOCAL_HIT");
ok("T18 panel/update compare offline (no fetch in compare)", !readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-update-compare.ts").includes("fetch("));

// --- T19 Host unpriced without VERIFIED — structural lookup miss ---
const pendingStore = emptyKnrCatalogStore(NOW);
const pending = buildEntry({ verificationStatus: "STRUCTURAL" });
pendingStore.entries[pending.identityKeyV2] = pending;
pendingStore.aliasIndex = rebuildKnrAliasIndex(pendingStore.entries);
const miss = lookupKnrCatalog(
  { identityKeyV2: pending.identityKeyV2, evidenceKeyV1: pending.evidenceKeyV1 },
  pendingStore,
);
ok("T19 non-VERIFIED LOCAL_MISS", miss.status === "LOCAL_MISS");
ok("T19 STRUCTURAL not servable", isKnrCatalogEntryServable(pending) === false);

// --- T20 cloud merge preserves history ---
const localHist = buildEntry({
  verificationStatus: "VERIFIED",
  verifiedAt: NOW,
  verifiedBy: "a",
  history: [
    { version: 1, at: NOW, kind: "VERIFY_APPROVE", contentHash: v1.contentHash },
  ],
});
localHist.contentHash = v1.contentHash;
localHist.norms = v1.norms;
const cloudHist = {
  ...localHist,
  history: [
    {
      version: 1,
      at: "2026-08-22T09:00:00.000Z",
      kind: "PROPOSED_UPDATE",
      contentHash: "old",
      previousContentHash: "older",
    },
    { version: 1, at: NOW, kind: "VERIFY_APPROVE", contentHash: v1.contentHash },
  ],
};
const localStore = normalizeKnrCatalogStore({
  schemaVersion: 1,
  updatedAt: NOW,
  etag: "l",
  entries: { [localHist.identityKeyV2]: localHist },
  aliasIndex: {},
  tombstones: [],
});
const cloudStore = normalizeKnrCatalogStore({
  schemaVersion: 1,
  updatedAt: NOW,
  etag: "c",
  entries: { [cloudHist.identityKeyV2]: cloudHist },
  aliasIndex: {},
  tombstones: [],
});
const merged = mergeKnrCatalogStoreDetailed(localStore, cloudStore);
const mh = merged.store.entries[localHist.identityKeyV2]?.history ?? [];
ok("T20 merge preserves ≥2 history", mh.length >= 2);

// --- T21 empty cloud cannot wipe local VERIFIED ---
const emptyCloud = emptyKnrCatalogStore(NOW);
const wipe = mergeKnrCatalogStoreDetailed(localStore, emptyCloud);
ok(
  "T21 anti-wipe",
  wipe.store.entries[localHist.identityKeyV2]?.verificationStatus === "VERIFIED",
);

// --- T22 already covered above ---

// normalize preserves history
const round = normalizeKnrCatalogEntry({
  ...v1,
  verificationStatus: "VERIFIED",
  verifiedAt: NOW,
  verifiedBy: "x",
  history: h2,
  catalogRevision: 1,
});
ok("normalize keeps history", (round?.history?.length ?? 0) === 2);

// panel update button
ok("panel AKTUALIZUJ", panel.includes("Aktualizuj") && panel.includes("data-knr-catalog-update"));

console.log(`\nOK ${passed} assertions`);
