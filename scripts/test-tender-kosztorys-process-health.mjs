/**
 * P2 UX — deriveKosztorysProcessHealth (prezentacja only).
 * npx vite-node scripts/test-tender-kosztorys-process-health.mjs
 */

import {
  buildKosztorysActivityFingerprint,
  deriveKosztorysProcessHealth,
  isKosztorysProcessHealthMonitored,
  KOSZTORYS_HEALTH_SLOW_MS,
  KOSZTORYS_HEALTH_STALE_MS,
  KOSZTORYS_HEALTH_TIMEOUT_MS,
  KOSZTORYS_HEALTH_SLOW_MESSAGE,
  KOSZTORYS_HEALTH_STALE_MESSAGE,
  KOSZTORYS_HEALTH_TIMEOUT_MESSAGE,
  tickKosztorysActivityClock,
  applyKosztorysHealthToPhaseView,
} from "../src/lib/tender-kosztorys-process-health.ts";
import { deriveKosztorysProcessPhase } from "../src/lib/tender-kosztorys-process-phase.ts";
import {
  clearDossierTraceLog,
} from "../src/lib/tender-dossier-trace.ts";

const TENDER_ID = "bzp-health-test";
const BASE_NOW = Date.parse("2026-06-25T12:00:00.000Z");

function baseItem(overrides = {}) {
  return {
    id: "item-health-1",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00012345",
    title: "Health test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    bzpDocuments: [
      {
        index: 1,
        documentId: "doc-1",
        filename: "kosztorys.ath",
        contentType: "application/octet-stream",
      },
    ],
    ...overrides,
  };
}

function healthInput(overrides = {}) {
  const session = {
    dossierBuilding: true,
    lazyEnabled: true,
    ...(overrides.session ?? {}),
  };
  const lastActivityAtMs = overrides.lastActivityAtMs ?? BASE_NOW - 10_000;
  const monitoringStartedAtMs = overrides.monitoringStartedAtMs ?? BASE_NOW - 60_000;
  const nowMs = overrides.nowMs ?? BASE_NOW;
  delete overrides.session;
  delete overrides.lastActivityAtMs;
  delete overrides.monitoringStartedAtMs;
  delete overrides.nowMs;
  return {
    item: baseItem(),
    session,
    lastActivityAtMs,
    monitoringStartedAtMs,
    nowMs,
    retryNonce: 0,
    ...overrides,
  };
}

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

console.log("=== KOSZTORYS PROCESS HEALTH P2 ===\n");

// healthy — krótka bezczynność
ok(
  "healthy < 30s",
  deriveKosztorysProcessHealth(healthInput())?.status === "healthy",
);

// slow — 35s
ok(
  "slow >= 30s",
  deriveKosztorysProcessHealth(
    healthInput({ lastActivityAtMs: BASE_NOW - KOSZTORYS_HEALTH_SLOW_MS - 5_000 }),
  )?.status === "slow",
);

ok(
  "slow message",
  deriveKosztorysProcessHealth(
    healthInput({ lastActivityAtMs: BASE_NOW - 35_000 }),
  )?.message === KOSZTORYS_HEALTH_SLOW_MESSAGE,
);

ok(
  "slow bez retry",
  deriveKosztorysProcessHealth(
    healthInput({ lastActivityAtMs: BASE_NOW - 35_000 }),
  )?.showRetry === false,
);

// stale — 95s
ok(
  "stale >= 90s",
  deriveKosztorysProcessHealth(
    healthInput({
      lastActivityAtMs: BASE_NOW - KOSZTORYS_HEALTH_STALE_MS - 5_000,
      monitoringStartedAtMs: BASE_NOW - 120_000,
    }),
  )?.status === "stale",
);

ok(
  "stale message + retry",
  (() => {
    const h = deriveKosztorysProcessHealth(
      healthInput({
        lastActivityAtMs: BASE_NOW - 95_000,
        monitoringStartedAtMs: BASE_NOW - 120_000,
      }),
    );
    return h?.message === KOSZTORYS_HEALTH_STALE_MESSAGE && h.showRetry === true;
  })(),
);

// timeout — 185s
ok(
  "timeout >= 180s",
  deriveKosztorysProcessHealth(
    healthInput({
      lastActivityAtMs: BASE_NOW - KOSZTORYS_HEALTH_TIMEOUT_MS - 5_000,
      monitoringStartedAtMs: BASE_NOW - 200_000,
    }),
  )?.status === "timeout",
);

ok(
  "timeout message + retry",
  (() => {
    const h = deriveKosztorysProcessHealth(
      healthInput({
        lastActivityAtMs: BASE_NOW - 185_000,
        monitoringStartedAtMs: BASE_NOW - 200_000,
      }),
    );
    return h?.message === KOSZTORYS_HEALTH_TIMEOUT_MESSAGE && h.showRetry === true;
  })(),
);

// retry — fingerprint change resets clock
ok(
  "retry reset activity clock",
  (() => {
    const fp1 = buildKosztorysActivityFingerprint({
      technicalPhaseKey: "e6:e6c",
      retryNonce: 0,
    });
    const fp2 = buildKosztorysActivityFingerprint({
      technicalPhaseKey: "e6:e6c",
      retryNonce: 1,
    });
    const resetAt = tickKosztorysActivityClock({
      nowMs: BASE_NOW,
      fingerprint: fp2,
      prevFingerprint: fp1,
      prevLastActivityAtMs: BASE_NOW - 120_000,
      monitoringStartedAtMs: BASE_NOW - 180_000,
      traceActivityMs: null,
    });
    const h = deriveKosztorysProcessHealth(
      healthInput({
        lastActivityAtMs: resetAt,
        monitoringStartedAtMs: BASE_NOW - 180_000,
        nowMs: BASE_NOW,
        session: { dossierBuilding: true, lazyEnabled: true },
        retryNonce: 1,
      }),
    );
    return h?.status === "healthy";
  })(),
);

// saving — monitorowany
ok(
  "saving monitored",
  isKosztorysProcessHealthMonitored({ dossierSaving: true }),
);

ok(
  "saving slow",
  deriveKosztorysProcessHealth(
    healthInput({
      session: { dossierSaving: true, dossierBuilding: false, lazyEnabled: true },
      lastActivityAtMs: BASE_NOW - 40_000,
    }),
  )?.status === "slow",
);

// trace reset
ok(
  "trace reset activity",
  (() => {
    const traceActivityMs = BASE_NOW - 5_000;
    const staleMs = BASE_NOW - 100_000;
    const refreshed = tickKosztorysActivityClock({
      nowMs: BASE_NOW,
      fingerprint: buildKosztorysActivityFingerprint({
        traceHeadAt: new Date(traceActivityMs).toISOString(),
        traceHeadStep: "ath_parsed",
        technicalPhaseKey: "e6:e6c",
        retryNonce: 0,
      }),
      prevFingerprint: buildKosztorysActivityFingerprint({
        technicalPhaseKey: "e6:e6c",
        retryNonce: 0,
      }),
      prevLastActivityAtMs: staleMs,
      monitoringStartedAtMs: BASE_NOW - 200_000,
      traceActivityMs,
    });
    const h = deriveKosztorysProcessHealth(
      healthInput({
        lastActivityAtMs: refreshed,
        monitoringStartedAtMs: BASE_NOW - 200_000,
        nowMs: BASE_NOW,
      }),
    );
    return h?.status === "healthy" && refreshed === traceActivityMs;
  })(),
);

// phase change reset via fingerprint
ok(
  "phase change fingerprint",
  (() => {
    const a = buildKosztorysActivityFingerprint({ technicalPhaseKey: "e6:e6a", retryNonce: 0 });
    const b = buildKosztorysActivityFingerprint({ technicalPhaseKey: "e6:e6c", retryNonce: 0 });
    return a !== b;
  })(),
);

ok(
  "phase change reset clock",
  (() => {
    const resetAt = tickKosztorysActivityClock({
      nowMs: BASE_NOW,
      fingerprint: buildKosztorysActivityFingerprint({ technicalPhaseKey: "e5", retryNonce: 0 }),
      prevFingerprint: buildKosztorysActivityFingerprint({ technicalPhaseKey: "e6:e6c", retryNonce: 0 }),
      prevLastActivityAtMs: BASE_NOW - 100_000,
      monitoringStartedAtMs: BASE_NOW - 120_000,
      traceActivityMs: null,
    });
    return resetAt === BASE_NOW;
  })(),
);

// not monitored when idle
ok(
  "idle not monitored",
  deriveKosztorysProcessHealth(
    healthInput({
      item: baseItem({ bzpDocuments: [] }),
      session: {
        lazyEnabled: true,
        dossierBuilding: false,
        dossierSaving: false,
        autoRunning: false,
      },
    }),
  ) === null,
);

// apply health preserves phase label
ok(
  "apply health stale hint",
  (() => {
    const phase = deriveKosztorysProcessPhase(baseItem(), { dossierBuilding: true, lazyEnabled: true });
    const next = applyKosztorysHealthToPhaseView(phase, "stale", KOSZTORYS_HEALTH_STALE_MESSAGE, true);
    return next.hint === KOSZTORYS_HEALTH_STALE_MESSAGE && next.showRetry === true;
  })(),
);

clearDossierTraceLog();

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
