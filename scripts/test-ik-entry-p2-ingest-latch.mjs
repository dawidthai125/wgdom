/**
 * IK-REAL-TENDER-BOQ-INGEST-BLOCKER — P2 Host latch T01–T12.
 * Pure predicates + Host source contracts. Zero bridge mutation.
 *
 * Run: npx vite-node scripts/test-ik-entry-p2-ingest-latch.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));

import {
  buildP2IngestFingerprint,
  isP2AttemptStale,
  p2CleanupInvalidate,
  shouldReleaseBridgeBusy,
  shouldSuppressP2DoubleStart,
} from "../src/lib/intelligent-estimator/ik-entry-p2-ingest-latch.ts";
import { needsIkNg02Ingest } from "../src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

console.log("=== IK ENTRY P2 INGEST LATCH T01–T12 ===\n");

// --- Host source contracts (HB1 / HB2 / banlist) ---
assert("HB1: onUpdateRef present", /onUpdateRef\.current\s*=\s*onUpdate/.test(hostSrc));
assert(
  "HB1: P2 effect deps omit onUpdate",
  /Intentionally NOT: onUpdate \(HB1\)/.test(hostSrc)
    && !/,\s*onUpdate,\s*\n\s*athPreviewEnabled/.test(hostSrc),
);
assert("HB2: dossierBuildingRef", /dossierBuildingRef\.current\s*=\s*dossierBuilding/.test(hostSrc));
assert("HB2: dossierEnrichingRef", /dossierEnrichingRef\.current\s*=\s*dossierEnriching/.test(hostSrc));
assert(
  "P2 attemptedRef removed",
  !/const attemptedRef\b/.test(hostSrc) && !/attemptedRef\.current/.test(hostSrc),
);
assert("generation guard", /p2RunGenerationRef/.test(hostSrc));
assert("owner-safe busy", /p2BusyOwnerGenRef/.test(hostSrc));
assert("isStale / latch helpers wired", /isP2AttemptStale|shouldReleaseBridgeBusy/.test(hostSrc));
assert("no readyForExperts=true force in Host", !/readyForExperts\s*=\s*true/.test(hostSrc));
assert("still calls runIkNg02IngestBridge", /runIkNg02IngestBridge/.test(hostSrc));

const baseItem = {
  id: "08def932-550d-d6f5-962b-1200014aa6e7",
  tenderId: "2026/BZP 00391783",
  status: "seen",
  updatedAt: "2026-01-01",
  title: "MOPS",
  bzpDocuments: [{ index: 0, filename: "a.pdf", downloadUrl: "https://x" }],
  documentsFetchedAt: "2026-01-01T00:00:00.000Z",
  tenderDossier: null,
};

assert("fingerprint stable on tenderFit-like noise", (() => {
  const a = buildP2IngestFingerprint({ ...baseItem, tenderFit: { score: 1 } });
  const b = buildP2IngestFingerprint({ ...baseItem, tenderFit: { score: 99 } });
  return a === b && needsIkNg02Ingest(baseItem) === true;
})());

assert("fingerprint changes when needs flips", (() => {
  const withRows = {
    ...baseItem,
    tenderDossier: {
      kosztorys: { ok: true, rows: [{ id: "1" }], rowCount: 1 },
    },
  };
  return (
    buildP2IngestFingerprint(baseItem) !== buildP2IngestFingerprint(withRows)
    && needsIkNg02Ingest(withRows) === false
  );
})());

// Simulate latch machine for T01–T12
function sim() {
  let runGen = 0;
  let busyOwner = null;
  let inFlightFp = null;
  let busy = false;
  let ingest = null;
  const log = [];

  function begin(fp) {
    if (
      shouldSuppressP2DoubleStart({
        fingerprint: fp,
        inFlightFingerprint: inFlightFp,
        busyOwnerGen: busyOwner,
      })
    ) {
      log.push("suppress");
      return null;
    }
    const generation = ++runGen;
    busyOwner = generation;
    inFlightFp = fp;
    busy = true;
    log.push(`begin:${generation}`);
    return generation;
  }

  function isStale(generation, cancelled) {
    return isP2AttemptStale({
      cancelled,
      generation,
      runGenerationCurrent: runGen,
    });
  }

  function releaseIfOwner(generation) {
    if (
      shouldReleaseBridgeBusy({
        generation,
        runGenerationCurrent: runGen,
        busyOwnerGen: busyOwner,
      })
    ) {
      busy = false;
      busyOwner = null;
      inFlightFp = null;
      log.push(`release:${generation}`);
      return true;
    }
    log.push(`release-skip:${generation}`);
    return false;
  }

  function cleanup(generation) {
    const inv = p2CleanupInvalidate({
      generation,
      runGenerationCurrent: runGen,
      busyOwnerGen: busyOwner,
    });
    runGen = inv.nextRunGeneration;
    if (inv.releaseBusy) {
      busy = false;
      busyOwner = inv.nextBusyOwner;
      inFlightFp = null;
      log.push(`cleanup-release:${generation}`);
    } else {
      log.push(`cleanup-bump:${generation}->${runGen}`);
    }
  }

  function success(generation, cancelled) {
    if (isStale(generation, cancelled)) {
      log.push("stale-skip-success");
      releaseIfOwner(generation);
      return;
    }
    ingest = { phase: "completed", readyForExperts: undefined };
    log.push("success");
    releaseIfOwner(generation);
  }

  function error(generation, cancelled) {
    if (isStale(generation, cancelled)) {
      log.push("stale-skip-error");
      releaseIfOwner(generation);
      return;
    }
    ingest = { phase: "blocked", reasons: ["BRIDGE_THROW:x"] };
    log.push("error");
    releaseIfOwner(generation);
  }

  return {
    get busy() {
      return busy;
    },
    get ingest() {
      return ingest;
    },
    get busyOwner() {
      return busyOwner;
    },
    get runGen() {
      return runGen;
    },
    get inFlightFp() {
      return inFlightFp;
    },
    get log() {
      return log;
    },
    begin,
    isStale,
    releaseIfOwner,
    cleanup,
    success,
    error,
    setIngest(v) {
      ingest = v;
    },
  };
}

// T01 success
{
  const s = sim();
  const g = s.begin("fpA");
  s.success(g, false);
  assert("T01 success · busy false", s.busy === false && s.ingest?.phase === "completed");
  assert("T01 success · owner null", s.busyOwner === null);
}

// T02 cancel
{
  const s = sim();
  const g = s.begin("fpA");
  s.cleanup(g); // cancel
  assert("T02 cancel · busy false", s.busy === false);
  assert("T02 cancel · not stale block on retry", s.begin("fpA") != null);
}

// T03 error
{
  const s = sim();
  const g = s.begin("fpA");
  s.error(g, false);
  assert("T03 error · busy false + blocked", s.busy === false && s.ingest?.phase === "blocked");
}

// T04 early return before BEGIN — no begin called
{
  const s = sim();
  assert("T04 early before BEGIN · busy never true", s.busy === false && s.busyOwner === null);
}

// T05 retry after cancel
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.cleanup(g1);
  const g2 = s.begin("fpA");
  s.success(g2, false);
  assert("T05 retry after cancel", g2 != null && s.ingest?.phase === "completed" && s.busy === false);
}

// T06 retry after error (re-entry)
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.error(g1, false);
  const g2 = s.begin("fpA");
  s.success(g2, false);
  assert("T06 retry after error", g2 != null && s.ingest?.phase === "completed");
}

// T07 stale generation
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.cleanup(g1);
  assert("T07 stale after cleanup", s.isStale(g1, true) === true);
}

// T08 double start
{
  const s = sim();
  const g1 = s.begin("fpA");
  const g2 = s.begin("fpA");
  assert("T08 double start suppressed", g1 != null && g2 === null && s.busy === true);
  s.cleanup(g1);
}

// T09 unmount during request
{
  const s = sim();
  const g = s.begin("fpA");
  s.cleanup(g);
  s.success(g, true);
  assert("T09 unmount · no live ingest from stale", s.ingest == null && s.busy === false);
}

// T10 rapid fingerprint change
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.cleanup(g1);
  const g2 = s.begin("fpB");
  s.success(g2, false);
  assert("T10 rapid change · new wins", s.ingest?.phase === "completed" && s.busy === false);
}

// T11 old success after new start
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.cleanup(g1);
  const g2 = s.begin("fpB");
  s.success(g1, true); // old
  assert("T11 old success skipped", s.ingest == null);
  s.success(g2, false);
  assert("T11 new success applied", s.ingest?.phase === "completed");
  assert("T11 busy owned by new then released", s.busy === false);
}

// T12 old cancel after new start
{
  const s = sim();
  const g1 = s.begin("fpA");
  // new starts: cleanup old then begin new (React order)
  s.cleanup(g1);
  const g2 = s.begin("fpB");
  // spurious old cleanup again should not clear new busy
  const inv = p2CleanupInvalidate({
    generation: g1,
    runGenerationCurrent: s.runGen,
    busyOwnerGen: s.busyOwner,
  });
  assert("T12 old cancel does not release new owner", inv.releaseBusy === false);
  assert("T12 new still busy", s.busy === true && s.busyOwner === g2);
  s.cleanup(g2);
  assert("T12 new cleanup releases", s.busy === false);
}

// Owner-safe: old finally after new begin
{
  const s = sim();
  const g1 = s.begin("fpA");
  s.cleanup(g1);
  const g2 = s.begin("fpB");
  const released = s.releaseIfOwner(g1);
  assert("old finally cannot clear new busy", released === false && s.busy === true && s.busyOwner === g2);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
