# NG11-A3 — Discovery Fork · Release Verification

| Pole | Wartość |
|------|---------|
| **Slice** | NG11-A3 |
| **Wersja** | **2.64.0** |
| **Data** | 2026-07-11 |
| **Baseline** | 2.63.99 @ `447a58b` |
| **Status** | **IMPLEMENTATION COMPLETE** · **OWNER QA PENDING** · **PUSH BLOCKED** |

---

## Boundary Check

| Protected Core | Dotyk? | Werdykt |
|----------------|--------|---------|
| Payroll | NIE | **PASS** |
| `cloud-sync.ts` | NIE | **PASS** |
| Edge `tenders-external-discover` | NIE | **PASS** |
| NG10 gate-exit | NIE | **PASS** |
| `App.tsx` CORE | NIE | **PASS** |
| Parser fidelity | NIE | **PASS** |
| Pipeline runtime business logic | NIE (scheduling only) | **PASS** |

**Allowlist (7 plików + test + docs):**

| Plik | Zmiana |
|------|--------|
| `tender-discovery-fork.ts` | **NOWY** — fork scheduler, T1 pool, timeout |
| `tender-full-document-discovery.ts` | fork join wire |
| `useTenderDocumentsBootstrap.ts` | `isCancelled` wire |
| `app-settings.ts` | flaga `pipelinePerfDiscoveryFork` |
| `AdminSettingsModal.tsx` | checkbox Super Admin |
| `test-ng11-discovery-fork.mjs` | **NOWY** — 27 testów + PG-A3 |

---

## Performance Report (PG-A3 harness)

| Metryka | Baseline (waterfall) | Fork ON | Cel | Werdykt |
|---------|---------------------|---------|-----|---------|
| P50 wall (mock BZP 100ms + ext 200ms, empty BZP) | **312 ms** | **204 ms** | −30% | **PASS** (−35%) |
| T1 pool peak | n/a | **≤2** | ≤2 | **PASS** |
| BZP>0 cancel | n/a | discard external | discard | **PASS** (O3) |
| Timeout frozen | n/a | **45 s** | 45 s | **PASS** |

---

## Test Status

| Suite | Wynik |
|-------|-------|
| `test-ng11-discovery-fork.mjs` | **27/27 PASS** |
| `test-tender-full-document-discovery.mjs` | **19/19 PASS** |
| `test-ng11-artifact-cache.mjs` | **21/21 PASS** |
| `test-ng11-debounce-persist.mjs` | **10/10 PASS** |
| `test-ng11-parse-concurrency.mjs` | **11/11 PASS** |
| `test-ng11-unpack-parallel.mjs` | **10/10 PASS** |
| `test-ng11-a1-progressive-heavy.mjs` | **12/12 PASS** |
| `test-tender-autonomous-run-gate-exit.mjs` | **28/28 PASS** |
| **Łącznie** | **138/138 PASS** |

---

## Build

`npm run build` — **PASS**

---

## Rollback

`pipelinePerfDiscoveryFork = false` w ⚙ Super Admin — natychmiastowy powrót do waterfall.

---

## Werdykt

| | |
|---|---|
| **IMPLEMENTATION** | **COMPLETE** |
| **RELEASE GO** | **PENDING OWNER QA** |
| **PUSH** | **BLOCKED** do Owner QA |

---

*NG11-A3 release verification · 2026-07-11*
