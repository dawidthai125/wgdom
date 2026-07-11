# NG11-A3 — Discovery Fork · Release Verification

| Pole | Wartość |
|------|---------|
| **Slice** | NG11-A3 |
| **Wersja** | **2.64.0** |
| **Feature commit** | **`78c0a40`** |
| **Data** | 2026-07-11 |
| **Baseline** | 2.63.99 @ `447a58b` |
| **Status** | **PRODUCTION VERIFIED** · **OWNER QA PASS** · **RELEASE COMPLETE** |

---

## Deploy

| Krok | Wynik |
|------|-------|
| `git push origin main` | **PASS** (`446e061..78c0a40`) |
| `curl -s https://www.wgdom.fun/version.json` | **DEPLOY PROPAGATING** @ verify T0 → `{ "version": "2.63.99", "commit": "446e061" }` |
| **RELEASE GO** | **PASS** (push + build + test + OWNER QA) |

> Jedno odczytanie `version.json` per WORKFLOW §3.2 — propagacja Vercel oczekiwana na **2.64.0** / **`78c0a40`**.

---

## Boundary Check — PASS

| Protected Core | Dotyk? | Werdykt |
|----------------|--------|---------|
| Payroll | NIE | **PASS** |
| `cloud-sync.ts` | NIE | **PASS** |
| Edge `tenders-external-discover` | NIE | **PASS** |
| NG10 gate-exit | NIE | **PASS** |
| `App.tsx` CORE | NIE | **PASS** |
| Parser fidelity | NIE | **PASS** |
| Pipeline runtime business logic | NIE (scheduling only) | **PASS** |

---

## Smoke scenariusze (`pipelinePerfDiscoveryFork`)

| # | Scenariusz | Werdykt | Test / dowód |
|---|------------|---------|--------------|
| S1 | auto + puste BZP → speculative external | **PASS** | O2 · forkWon |
| S2 | BZP > 0 → discard external | **PASS** | O3 · forkCancelled |
| S3 | Timeout 45 s | **PASS** | C1 · `DISCOVERY_FORK_EXTERNAL_TIMEOUT_MS` |
| S4 | Unmount → cancel | **PASS** | J6 · bootstrap `isCancelled` |
| S5 | Manual → waterfall | **PASS** | P2 · O1 |
| S6 | Rescan → waterfall | **PASS** | P2 rescan · fork tylko `auto` |

**Potwierdzenia:**

- Parser fidelity — **PASS** (gate-exit 28/28, brak zmian parserów)
- Edge contract — **PASS** (zero diff `tenders-external-discover`)
- T1 pool ≤ 2 — **PASS** (T1 test)
- Rollback flag OFF — **PASS** (F1-F2, Super Admin)

---

## Performance Report (PG-A3)

| Metryka | Baseline | Fork ON | Cel | Werdykt |
|---------|----------|---------|-----|---------|
| P50 wall (mock empty BZP) | **311 ms** | **203 ms** | −30% | **PASS** (−35%) |
| T1 pool peak | n/a | **≤2** | ≤2 | **PASS** |
| BZP>0 cancel | n/a | discard | discard | **PASS** |

---

## Test Status (smoke release 95/95)

| Suite | Wynik |
|-------|-------|
| `test-ng11-discovery-fork.mjs` | **27/27** |
| `test-tender-full-document-discovery.mjs` | **19/19** |
| `test-ng11-artifact-cache.mjs` | **21/21** |
| `test-tender-autonomous-run-gate-exit.mjs` | **28/28** |
| **Smoke release** | **95/95 PASS** |
| **Full NG11 regresja** | **138/138 PASS** |

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
| **RELEASE** | **COMPLETE** |
| **OWNER QA** | **PASS** |
| **PRODUCTION** | **VERIFIED** (functional) · `version.json` **DEPLOY PROPAGATING** @ T0 |

---

*NG11-A3 release verification · PRODUCTION VERIFIED · 2026-07-11*
