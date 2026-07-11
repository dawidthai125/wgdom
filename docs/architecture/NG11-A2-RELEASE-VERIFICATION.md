# NG11-A2 — Release Verification

| Pole | Wartość |
|------|---------|
| **Program** | NG11-A2 Dossier Artifact Cache |
| **Wersja** | **2.63.99** |
| **Commit** | **`447a58b`** |
| **Push** | **2026-07-11** · `origin/main` `f758079..447a58b` |
| **RELEASE MODE** | **B** (functional smoke) |

---

## Pre-release (PASS)

| Gate | Wynik |
|------|-------|
| OWNER QA | **PASS** |
| RELEASE PRECHECK | **PASS** |
| IMPLEMENT | **PASS** |
| `npm run build` | **PASS** |
| Test suite A2 + regresja NG11 | **92/92 PASS** (release smoke) |
| Boundary (#CORE-013/014) | **PASS** |
| Feature flag default OFF | **PASS** |

---

## OWNER QA — scenariusze (`pipelinePerfArtifactCache`)

| # | Scenariusz | Werdykt | Dowód |
|---|------------|---------|-------|
| 1 | **Cache miss** → pełny parse | **PASS** | `test-ng11-artifact-cache.mjs` A2-6 · A2-19 miss path |
| 2 | **Retry** → cache hit | **PASS** | A2-19 PG-A2 harness · hit P50 ≈ 0 ms |
| 3 | **Cost phase hit** | **PASS** | A2-7 · A2-9 telemetry cost |
| 4 | **Full phase hit** | **PASS** | A2-8 full miss after cost · full store + cost phase full hit path |
| 5 | **Parser stale** → force miss | **PASS** | A2-12 · A2-13 `isDossierParserStale` guard |
| 6 | **LRU eviction** cap 12 | **PASS** | A2-14 · A2-15 · A2-16 |
| 7 | Flaga OFF → brak cache (domyślnie) | **PASS** | A2-1 · A2-17 · A2-18 |
| 8 | **CURRENT_PARSER_VERSION** w kluczu | **PASS** | A2-4 fingerprint normalize |
| 9 | **Parser fidelity** — brak zmian parserów | **PASS** | allowlist bez parserów · regresja A1 **12/12** · gate **28/28** |
| 10 | **Q1/Q2/Q3** bez regresji | **PASS** | Q1 **11/11** · Q2 **10/10** · Q3 **10/10** |
| 11 | Rollback flag OFF w ⚙ | **PASS** | `AdminSettingsModal` + `app-settings.ts` |

**OWNER QA werdykt:** **PASS**

---

## PG-A2 — Performance gate

| Metryka | Baseline (miss mock) | A2 harness (hit) | Cel | Werdykt |
|---------|----------------------|------------------|-----|---------|
| Retry parse wall P50 | **47 ms** | **0 ms** | **−50%** | **PASS** (reduction **100%** mock) |
| Hit skips parse work | parseDelay 40 ms | hit &lt; 40 ms | skip | **PASS** (A2-20) |

**PG-A2 werdykt release:** **PASS (harness proxy)** · prod F0 observation **OPTIONAL** (flag OFF at closeout).

---

## Flaga prod (obserwacja)

| Krok | Status |
|------|--------|
| Włączenie `pipelinePerfArtifactCache` w ⚙ (retry dossier profile) | **PROCEDURA** — Owner manual |
| Pomiar F0 hit rate po obserwacji | **OPTIONAL** |
| Wyłączenie flagi po obserwacji | **ZALECANE** — default OFF at closeout (DF §20.1) |

**Stan closeout:** flaga **`pipelinePerfArtifactCache` = OFF** (domyślna prod).

---

## Production verify (FAST)

```text
Push: git push origin main → f758079..447a58b PASS

curl -s https://www.wgdom.fun/version.json (verify final, 2026-07-11)
→ { "version": "2.63.99", "commit": "447a58b", "timestamp": "2026-07-11T22:03:43.647Z" }
```

| Pole | Oczekiwane | Stan |
|------|------------|------|
| `version` | **2.63.99** | **2.63.99** ✅ |
| `commit` | **`447a58b`** | **`447a58b`** ✅ |

**PRODUCTION VERIFIED:** **TAK**

---

## Test matrix (release smoke)

| Suite | Wynik |
|-------|-------|
| `test-ng11-artifact-cache.mjs` | **21/21** |
| `test-ng11-a1-progressive-heavy.mjs` | **12/12** |
| `test-ng11-parse-concurrency.mjs` | **11/11** |
| `test-ng11-unpack-parallel.mjs` | **10/10** |
| `test-ng11-debounce-persist.mjs` | **10/10** |
| `test-tender-autonomous-run-gate-exit.mjs` | **28/28** |
| **RAZEM** | **92/92 PASS** |

---

## Boundary (PASS)

**Nie dotknięto:** Payroll · `cloud-sync.ts` kernel · `App.tsx` CORE · Edge · NG10 gate · `wgdom-7z-archive.ts` internals · parsery fidelity · KV `kw-tender-dossier-artifacts`.

---

## Werdykt końcowy

| | |
|---|---|
| **RELEASE GO** | **PASS** |
| **PRODUCTION VERIFIED** | **PASS** |
| **NG11-A2** | **CLOSED** |

---

*NG11-A2 release verification · PRODUCTION VERIFIED · 2026-07-11*
