# NG11-Q2 — Release Verification

| Pole | Wartość |
|------|---------|
| **Program** | NG11-Q2 Parallel Archive Unpack |
| **Wersja** | **2.63.98** |
| **Commit** | **`608c9ec`** |
| **Push** | **2026-07-11** · `origin/main` `19a526c..608c9ec` |
| **RELEASE MODE** | **B** (functional smoke) |

---

## Pre-release (PASS)

| Gate | Wynik |
|------|-------|
| OWNER QA | **PASS** |
| RELEASE PRECHECK | **PASS** |
| IMPLEMENT | **PASS** |
| `npm run build` | **PASS** |
| Test suite NG11 Q2 + regresja | **76/76 PASS** |
| Boundary (#CORE-013/014) | **PASS** |
| Feature flag default OFF | **PASS** |

---

## OWNER QA — scenariusze (`pipelinePerfUnpackParallel`)

| # | Scenariusz | Werdykt | Dowód |
|---|------------|---------|-------|
| 1 | **ZIP** — inner candidates z archiwum ZIP | **PASS** | `test-tender-7z-archive.mjs` · `buildTenderDocCandidates inner` · trace `zip_inner_files_found` |
| 2 | **7Z** — inner candidates z archiwum 7Z | **PASS** | `test-tender-7z-archive.mjs` · `buildTenderDocCandidates inner ath/xlsx/pdf` |
| 3 | **Mixed archive** — ZIP + 7Z w jednym dossier | **PASS** | `unpackTasks[]` per doc · merge serial po kolejności wejścia |
| 4 | **Heavy dossier** — progressive heavy bez regresji | **PASS** | `test-ng11-a1-progressive-heavy.mjs` **12/12** |
| 5 | Flaga OFF → serial unpack (domyślnie) | **PASS** | `isPipelineUnpackParallelEnabled()` default false |
| 6 | Flaga ON → bounded parallel ≤2 | **PASS** | `test-ng11-unpack-parallel.mjs` Q2-5 · Q2-6 |
| 7 | Deterministic serial merge | **PASS** | Q2-7 · końcowy `sort` bez zmian |
| 8 | Parser fidelity — brak zmian w parserach | **PASS** | brak diff w `wgdom-7z-archive.ts` / parserach · regresja A1/Q1 |
| 9 | Rollback flag OFF w ⚙ | **PASS** | `AdminSettingsModal` + `app-settings.ts` |

**OWNER QA werdykt:** **PASS**

---

## PG-Q2 — Performance gate

| Metryka | Baseline (serial mock) | Q2 harness (parallel ×2) | Cel | Werdykt |
|---------|------------------------|----------------------------|-----|---------|
| Unpack wall time P50 | **249 ms** (4×50ms) | **125 ms** | **−40%** | **PASS** (reduction **49.8%**) |
| Peak workers | 1 (serial) | **≤ 2** | ≤ 2 | **PASS** |

**PG-Q2 werdykt release:** **PASS (harness proxy)** · prod F0 observation **OPTIONAL** (flag OFF at closeout).

---

## Flaga prod (obserwacja)

| Krok | Status |
|------|--------|
| Włączenie `pipelinePerfUnpackParallel` w ⚙ (test heavy profile) | **PROCEDURA** — Owner manual |
| Pomiar F0 `heavy.archive_unpack` po obserwacji | **OPTIONAL** |
| Wyłączenie flagi po obserwacji | **ZALECANE** — default OFF at closeout (DF §20.1) |

**Stan closeout:** flaga **`pipelinePerfUnpackParallel` = OFF** (domyślna prod).

---

## Production verify (FAST)

```text
Push: git push origin main → 19a526c..608c9ec PASS

curl -s https://www.wgdom.fun/version.json (verify final, 2026-07-11)
→ { "version": "2.63.98", "commit": "608c9ec", "timestamp": "2026-07-11T21:37:33.560Z" }
```

| Pole | Oczekiwane | Stan |
|------|------------|------|
| `version` | **2.63.98** | **2.63.98** ✅ |
| `commit` | **`608c9ec`** | **`608c9ec`** ✅ |

**RELEASE GO:** **PASS**

**PRODUCTION VERIFIED:** **PASS** (2026-07-11)

**Rollback Required:** **NIE** (flaga OFF — zero behavior change vs 2.63.97)

---

## Testy release (76)

| Skrypt | PASS |
|--------|------|
| `test-ng11-unpack-parallel.mjs` | 10 |
| `test-ng11-parse-concurrency.mjs` | 11 |
| `test-ng11-debounce-persist.mjs` | 10 |
| `test-ng11-a1-progressive-heavy.mjs` | 12 |
| `test-tender-autonomous-run-gate-exit.mjs` | 28 |
| `test-tender-dossier-heavy-lifecycle.mjs` | 5 |

---

## Pre-existing failures (out of scope Q2 bundle)

| Skrypt | FAIL | Klasyfikacja |
|--------|------|--------------|
| `test-tender-7z-archive.mjs` | `classify inner xlsx` (1) | **PRE-EXISTING** · `classifyCostDocumentType` — nie dotyczy unpack concurrency |
| `test-tender-dossier-pipeline.mjs` | `TP193B heavy scanSummary.parsedAt` (1) | **PRE-EXISTING** · heavy timing/metadata — poza allowlistą Q2 |
| `test-tender-dossier-pipeline.mjs` | `TP193B heavy parse done` (1) | **PRE-EXISTING** · j.w. |

**Uwaga:** Testy `buildTenderDocCandidates` w suite 7Z (**PASS**) potwierdzają brak regresji unpack w Q2.

---

*NG11-Q2 release verification · PRODUCTION VERIFIED · 2026-07-11*
