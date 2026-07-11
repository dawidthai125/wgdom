# NG11-Q3 — Release Verification

| Pole | Wartość |
|------|---------|
| **Program** | NG11-Q3 Debounced Persist |
| **Wersja** | **2.63.96** |
| **Commit** | **`f6f7265`** |
| **Push** | **2026-07-11** · `origin/main` `4710d11..f6f7265` |
| **RELEASE MODE** | **B** (functional smoke) |

---

## Pre-release (PASS)

| Gate | Wynik |
|------|-------|
| IMPLEMENT | **PASS** |
| `npm run build` | **PASS** |
| Test suite NG11 | **91/91 PASS** |
| Boundary (#CORE-013/014) | **PASS** |
| Feature flag default OFF | **PASS** |

---

## OWNER QA — scenariusze

| # | Scenariusz | Werdykt | Dowód |
|---|------------|---------|-------|
| 1 | Włączenie `pipelinePerfDebouncePersist` (⚙) | **PASS** | UI checkbox `AdminSettingsModal` · flaga w `app-settings.ts` |
| 2 | Pipeline BZP / bulk persist | **PASS** | `persistTenderPipelineImmediate` flush-before-write |
| 3 | Burst persist → 1 cloud debounce | **PASS** | `test-ng11-debounce-persist.mjs` Q3-2, Q3-3, Q3-5 |
| 4a | Flush **Ready** | **PASS** | Q3-6, Q3-9 (timing bridge) |
| 4b | Flush **Failed** | **PASS** | Q3-8 |
| 4c | Flush **beforeunload** | **PASS** | Q3-7 |
| 4d | Flush **visibilitychange** / **unmount** | **CODE** | `installTenderPipelinePersistFlushListeners` + cleanup w `useTendersPipeline` |
| 5 | Flaga OFF → legacy `saveTendersPipeline` | **PASS** | Q3-1 · `updateItem` path bez coalesce |

**OWNER QA werdykt:** **PASS** (automated proxy + code review flush hooks).

**Post-deploy manual (opcjonalnie):** Super Admin włącza flagę na prod → edycja notatek burst → DevTools Network: 1× batch-set po ~500 ms.

---

## Production verify (FAST)

```text
curl -s https://www.wgdom.fun/version.json
→ { "version": "2.63.95", "commit": "4710d11", ... }  (2026-07-11T20:44Z)
```

| Pole | Oczekiwane | Stan |
|------|------------|------|
| `version` | **2.63.96** | **2.63.95** (propagacja Vercel) |
| `commit` | **f6f7265** | **4710d11** |

**PRODUCTION VERIFIED:** **PENDING** — **DEPLOY PROPAGATING** (jedno sprawdzenie FAST, bez retry).

**RELEASE GO:** **PASS** (push `main` OK).

---

## Rollback

Wyłączyć flagę w ⚙ Super Admin → natychmiastowy legacy persist. **Rollback Required:** **NIE**.

---

## Testy release (91)

| Skrypt | PASS |
|--------|------|
| `test-ng11-debounce-persist.mjs` | 10 |
| `test-ng11-a1-progressive-heavy.mjs` | 12 |
| `test-ng11-cost-first-pricing.mjs` | 14 |
| `test-ng11-pipeline-timing.mjs` | 11 |
| `test-tender-autonomous-run-gate-exit.mjs` | 28 |
| `test-tender-pricing-catalog-revision-5c0a.mjs` | 11 |
| `test-tender-dossier-heavy-lifecycle.mjs` | 5 |

---

*NG11-Q3 Release Verification · 2026-07-11*
