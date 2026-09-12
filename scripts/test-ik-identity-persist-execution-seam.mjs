/**
 * IdentityPhase → gated persist execution seam (TPI/729 CLLR durable).
 * Run: npx vite-node scripts/test-ik-identity-persist-execution-seam.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PKG_PATH = join(root, ".tmp", "goa-tpi729-package-payload-v1.json");
const LEAF = "cw.knr.knr-2-02.0815-05.m2";
const CEILING_IDS = [
  "obl_d587326a",
  "obl_a617adb7",
  "obl_2bfaa62a",
  "obl_86778ef",
  "obl_21359cf1",
  "obl_42f45961",
];

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

const env = loadEnv("", process.cwd(), "");
Object.assign(process.env, env);
const anon = env.VITE_SUPABASE_ANON_KEY;
const projectId = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const edge = `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`;

function unwrap(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

function ceilingSnap(lines) {
  return CEILING_IDS.map((id) => {
    const l = (lines || []).find((x) => x.lineId === id);
    return {
      lineId: id,
      catalogWorkId: l?.catalogWorkId ?? null,
      matchMethod: l?.matchMethod ?? null,
    };
  });
}

function allLeaf(snap) {
  return (
    snap.length === CEILING_IDS.length
    && snap.every((x) => x.catalogWorkId === LEAF && x.matchMethod === "auto_contract")
  );
}

// --- Source contract ---
const engineSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts"),
  "utf8",
);
const hookSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"),
  "utf8",
);
ok(
  "SRC-01 IdentityPhase not gated by knrDownstreamDeferred branch",
  !/if\s*\(\s*knrDownstreamDeferred\s*\)\s*\{\s*identityPhase\s*=/.test(engineSrc),
);
ok(
  "SRC-02 IdentityPhase always invoked after Slice D",
  engineSrc.includes("const identityPhase = runIkIdentityPhase({"),
);
ok(
  "SRC-03 comment: Identity runs while KL-3 pending",
  /Identity \+ gated persist MUST run even while KL-3/i.test(engineSrc),
);
ok(
  "SRC-04 hook uses shouldLatchIdentityPersistAttempt",
  hookSrc.includes("shouldLatchIdentityPersistAttempt"),
);
ok(
  "SRC-05 persist effect deps include pkg",
  /\[identityPersistPlanKey, identityContext, effectiveItem, pkg\]/.test(hookSrc),
);

const { normalizeWorkCatalogStore } = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { MULTI_DWELLING_PACKAGE_LS_KEY } = await import("../src/lib/multi-dwelling/constants.ts");
const { upsertTenderPackage, getTenderPackage } = await import("../src/lib/multi-dwelling/store.ts");
const { computeIkOrchestraSyncSnapshot } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts"
);
const {
  runGatedIdentityPersist,
  shouldLatchIdentityPersistAttempt,
  computeOfferBoqIdentityPayloadHash,
} = await import("../src/lib/intelligent-estimator/orchestra/ik-identity-persist-glue.ts");
const { runIkIdentityPhase } = await import(
  "../src/lib/intelligent-estimator/orchestra/ik-identity-phase.ts"
);
const { buildIkExpertAdmissionSummary } = await import(
  "../src/lib/intelligent-estimator/ik-expert-admission.ts"
);

// --- Latch unit ---
ok(
  "LATCH-01 write → latch",
  shouldLatchIdentityPersistAttempt({
    writes: [{ dwellingId: "d", identityHash: "h" }],
    skips: [],
  }) === true,
);
ok(
  "LATCH-02 IDENTICAL_PAYLOAD → latch",
  shouldLatchIdentityPersistAttempt({
    writes: [],
    skips: [{ dwellingId: "d", reason: "IDENTICAL_PAYLOAD" }],
  }) === true,
);
ok(
  "LATCH-03 PACKAGE_NOT_FOUND → no latch (retry)",
  shouldLatchIdentityPersistAttempt({
    writes: [],
    skips: [{ dwellingId: "d", reason: "PACKAGE_NOT_FOUND" }],
  }) === false,
);
ok(
  "LATCH-04 DOCUMENT_MAPPING_REQUIRED → no latch",
  shouldLatchIdentityPersistAttempt({
    writes: [],
    skips: [{ dwellingId: "d", reason: "DOCUMENT_MAPPING_REQUIRED" }],
  }) === false,
);

if (!anon) {
  console.error("SKIP live TPI tests — no VITE_SUPABASE_ANON_KEY");
  console.log(`RESULT ${pass} pass / ${fail} fail (partial)`);
  process.exit(fail > 0 ? 1 : 0);
}

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(Array.isArray(kv.values) ? kv.values[0] : null);
if (!catalog) throw new Error("no catalog");
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));
normalizeWorkCatalogStore(catalog);

const pkgPayload = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const tenderId = Object.keys(pkgPayload.store.byTenderId)[0];
const tenderPkg = structuredClone(pkgPayload.store.byTenderId[tenderId]);
localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(pkgPayload.store));
upsertTenderPackage(tenderPkg);
const pkg = getTenderPackage(tenderId);
const dwellingId = pkg.dwellings[0].dwellingId;
const NOW_MS = Date.now();

const before = ceilingSnap(pkg.dwellings[0].offerBoq?.lines);
ok(
  "FIX-00 before still legacy parent (fixture)",
  before.every((x) => x.catalogWorkId === "legacy-gladzie_tynki-m2" && x.matchMethod === "manual"),
  before[0],
);

const item = {
  id: tenderId,
  tenderId,
  title: "TPI/729 identity persist seam",
  bzpDocuments: [],
};

// Direct IdentityPhase (admission via package lines) — CLLR proof
const masterBoqLines = (pkg.dwellings[0].offerBoq?.lines || []).map((line) => ({
  dwellingId,
  line,
  provenance: { source: "seam-test" },
}));
const admission = buildIkExpertAdmissionSummary({
  documentStatus: "ready",
  readyForExperts: true,
  lines: masterBoqLines.map((r) => r.line),
});
const structuralReport = {
  tenderId,
  status: "ready",
  masterBoq: { lineCount: masterBoqLines.length, status: "ready", readyForExperts: true },
  masterBoqLines,
  expertAdmission: admission,
};

// Engine: KL-3 deferred (knowledge null) but Identity MUST still run via ingest expert
const ingestExpert = {
  ...structuralReport,
  reasons: [],
};
const snapDeferred = computeIkOrchestraSyncSnapshot({
  item,
  effectiveItem: item,
  pkg,
  ingest: {
    phase: "ready",
    started: true,
    completed: true,
    tenderId,
    documentsUsed: 0,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 0,
    extractedLineCount: masterBoqLines.length,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert: ingestExpert,
  },
  historicalIndex: null,
  knrKnowledge: null,
  knowledgeBusy: false,
  flags: {
    identityCoverageOn: false,
    p5LaborOn: false,
    p5ResearchOn: false,
    p6MaterialOn: false,
    p6ResearchOn: false,
    p7F5On: false,
    p8RiskOn: false,
  },
  chiefSession: null,
  manualOverrides: [],
  deferDownstreamUntilKnrKnowledge: true,
});

ok(
  "TEST-A/ENG Identity runs while downstream deferred (not KNR_KNOWLEDGE_PENDING)",
  snapDeferred.identityContext?.status === "ready"
    && !(snapDeferred.identityContext?.reasons || []).includes("KNR_KNOWLEDGE_PENDING"),
  snapDeferred.identityContext,
);
ok(
  "TEST-A/ENG knrDownstreamDeferred forced true",
  snapDeferred.knrDownstreamDeferred === true,
);

const plans = snapDeferred.identityContext?.persistPlans || [];
const planKey =
  plans.length > 0
    ? plans
        .map((p) => `${p.dwellingId}:${p.identityHash}`)
        .sort()
        .join("|")
    : "";
ok("TEST-B identityPersistPlanKey non-empty", planKey.length > 0, planKey);
const planCeiling = plans[0] ? ceilingSnap(plans[0].offerBoq?.lines) : [];
ok("TEST-A/ENG persistPlans carry leaf+auto_contract", allLeaf(planCeiling), planCeiling[0]);

const phaseA = runIkIdentityPhase({
  structuralReport,
  sliceDExpert: structuralReport,
  item,
  package: pkg,
  manualOverrides: [],
  packs: undefined,
  nowMs: NOW_MS,
});
const phaseCeiling = phaseA.context.persistPlans[0]
  ? ceilingSnap(phaseA.context.persistPlans[0].offerBoq?.lines)
  : [];
ok("TEST-A direct IdentityPhase leaf", allLeaf(phaseCeiling), phaseCeiling[0]);

// Owner-scoped: other override → ceiling stays durable clone (no CLLR)
const phaseB = runIkIdentityPhase({
  structuralReport,
  sliceDExpert: structuralReport,
  item,
  package: pkg,
  manualOverrides: [
    {
      dwellingId,
      lineId: "obl_5dcbfe5d",
      catalogWorkId: "legacy-gladzie_tynki-m2",
      matchMethod: "manual",
    },
  ],
  nowMs: NOW_MS,
});
const phaseBCeiling = phaseB.context.persistPlans[0]
  ? ceilingSnap(phaseB.context.persistPlans[0].offerBoq?.lines)
  : [];
ok(
  "TEST-E owner-scoped preserves durable legacy on non-override ceiling",
  phaseBCeiling.every(
    (x) => x.catalogWorkId === "legacy-gladzie_tynki-m2" && x.matchMethod === "manual",
  ),
  phaseBCeiling[0],
);

// TEST C — gated persist write
const plansForPersist = phaseA.context.persistPlans;
const outcome1 = runGatedIdentityPersist({
  tenderId,
  package: pkg,
  plans: plansForPersist,
  sessionGate: new Map(),
});
ok("TEST-C gated persist writes", outcome1.writes.length === 1, outcome1);
ok("TEST-C latch after write", shouldLatchIdentityPersistAttempt(outcome1) === true);

const after = getTenderPackage(tenderId);
const afterCeiling = ceilingSnap(after?.dwellings?.[0]?.offerBoq?.lines);
ok("TEST-C durable package leaf+auto_contract", allLeaf(afterCeiling), afterCeiling[0]);

// TEST D — idempotency
const sessionGate = new Map();
const outcome2 = runGatedIdentityPersist({
  tenderId,
  package: after,
  plans: plansForPersist,
  sessionGate,
});
ok(
  "TEST-D second call IDENTICAL or ALREADY_WRITTEN (no duplicate write)",
  outcome2.writes.length === 0
    && outcome2.skips.some(
      (s) => s.reason === "IDENTICAL_PAYLOAD" || s.reason === "ALREADY_WRITTEN_SESSION",
    ),
  outcome2,
);
const outcome3 = runGatedIdentityPersist({
  tenderId,
  package: getTenderPackage(tenderId),
  plans: plansForPersist,
  sessionGate,
});
ok(
  "TEST-D session gate blocks third write",
  outcome3.writes.length === 0
    && outcome3.skips.some(
      (s) => s.reason === "ALREADY_WRITTEN_SESSION" || s.reason === "IDENTICAL_PAYLOAD",
    ),
  outcome3,
);

const hashBefore = computeOfferBoqIdentityPayloadHash(
  pkgPayload.store.byTenderId[tenderId].dwellings[0].offerBoq.lines,
);
const hashAfter = computeOfferBoqIdentityPayloadHash(after.dwellings[0].offerBoq.lines);
ok("TEST-C identity hash changed after rebind", hashBefore !== hashAfter);

console.log(`RESULT ${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
