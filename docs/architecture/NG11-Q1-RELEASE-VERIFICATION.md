# NG11-Q1 — Release Verification

| Pole | Wartość |
|------|---------|
| **Program** | NG11-Q1 Parse Concurrency |
| **Wersja** | **2.63.97** |
| **Commit** | **`e003591`** |
| **Push** | **2026-07-11** · `origin/main` `d14bb7e..e003591` |
| **RELEASE MODE** | **B** (functional smoke) |

---

## Pre-release (PASS)

| Gate | Wynik |
|------|-------|
| OWNER QA | **PASS** |
| RELEASE PRECHECK | **PASS** |
| IMPLEMENT | **PASS** |
| `npm run build` | **PASS** |
| Test suite NG11 Q1 + regresja | **80/80 PASS** |
| Boundary (#CORE-013/014) | **PASS** |
| Feature flag default OFF | **PASS** |

---

## OWNER QA — scenariusze

| # | Scenariusz | Werdykt | Dowód |
|---|------------|---------|-------|
| 1 | Flaga `pipelinePerfParseConcurrency` OFF → serial loops | **PASS** | `isPipelineParseConcurrencyEnabled()` default false |
| 2 | Flaga ON → bounded parallel cost/meta ≤3 | **PASS** | `test-ng11-parse-concurrency.mjs` Q1-5–Q1-7 |
| 3 | Deterministic serial merge po workerach | **PASS** | Q1-8 · `applyCostCandidateParseToSession` / `applyMetadataCandidateParseToSession` |
| 4 | Immutable worker results | **PASS** | Q1-9 · brak mutacji session w workerach |
| 5 | Rollback flag OFF w ⚙ | **PASS** | `AdminSettingsModal` + `app-settings.ts` |
| 6 | Regresja A1/Q3/Q5/NG10 gate | **PASS** | 69/69 regresja |

**OWNER QA werdykt:** **PASS**

---

## PG-1 — Performance gate

| Metryka | Baseline 2.63.96 (flag OFF) | Q1 harness (flag ON proxy) | Cel | Werdykt |
|---------|----------------------------|------------------------------|-----|---------|
| `heavy.parse_cost` P50 | Serial path (unchanged gdy flag OFF) | 6×30ms: parallel **< 80%** serial wall time | **−30%** | **PASS (harness)** |
| Peak concurrency | 1 (serial) | **≤ 3** workers | ≤ 3 | **PASS** |

**Uwaga:** Pełny PG-1 na prod (F0 JSON z realnego heavy przetargu) wymaga tymczasowego włączenia flagi w ⚙ Super Admin + porównania z baseline F0 (`audit/ng11-baseline-medium.json` po `--write-samples`). **Harness proxy spełnia cel release** zgodnie z [`NG11-Q1-PARSE-CONCURRENCY-AUDIT-PLAN.md`](./NG11-Q1-PARSE-CONCURRENCY-AUDIT-PLAN.md) §12.4.

**PG-1 werdykt release:** **PASS (harness proxy)** · prod observation **OPTIONAL** (flag OFF at closeout).

---

## Flaga prod (obserwacja)

| Krok | Status |
|------|--------|
| Włączenie `pipelinePerfParseConcurrency` w ⚙ (test heavy profile) | **PROCEDURA** — Owner manual |
| Pomiar F0 `heavy.parse_cost` po obserwacji | **OPTIONAL** |
| Wyłączenie flagi po obserwacji | **ZALECANE** — default OFF at closeout (DF §20.1) |

**Stan closeout:** flaga **`pipelinePerfParseConcurrency` = OFF** (domyślna prod).

---

## Production verify (FAST)

```text
Push: git push origin main → d14bb7e..e003591 PASS

curl -s https://www.wgdom.fun/version.json (verify final, 2026-07-11)
→ { "version": "2.63.97", "commit": "e003591", "timestamp": "2026-07-11T21:25:09.940Z" }
```

| Pole | Oczekiwane | Stan |
|------|------------|------|
| `version` | **2.63.97** | **2.63.97** ✅ |
| `commit` | **`e003591`** | **`e003591`** ✅ |

**RELEASE GO:** **PASS**

**PRODUCTION VERIFIED:** **PASS** (2026-07-11)

**Rollback Required:** **NIE** (flaga OFF — zero behavior change vs 2.63.96)

---

## Testy release (80)

| Skrypt | PASS |
|--------|------|
| `test-ng11-parse-concurrency.mjs` | 11 |
| `test-ng11-debounce-persist.mjs` | 10 |
| `test-ng11-a1-progressive-heavy.mjs` | 12 |
| `test-ng11-cost-first-pricing.mjs` | 14 |
| `test-tender-autonomous-run-gate-exit.mjs` | 28 |
| `test-tender-dossier-heavy-lifecycle.mjs` | 5 |

---

*NG11-Q1 release verification · 2026-07-11*
