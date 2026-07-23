# INCIDENT-23-07-CLEANUP-01 — POST RELEASE CLEANUP

> **Status:** **INCIDENT-23-07 CLEANUP COMPLETE**  
> **ID:** INCIDENT-23-07-CLEANUP-01  
> **Po:** TENDERS-SYNC-STORM-P0 **2.65.38**  
> **Cleanup version:** **2.65.39**  
> **Zakazane:** Sync Storm logika · Edge · StorageManager · ARCH-02F · nowe features  

```text
══════════════════════════════════════
INCIDENT-23-07 CLEANUP COMPLETE

VERDICT: PASS
══════════════════════════════════════
```

---

## 1. Tabela instrumentacji

| Instrumentacja | Werdykt | Uzasadnienie |
|----------------|---------|--------------|
| `PAYROLL_STORAGE_TRACE_DIAG_AUTO_ENABLE` | **KEEP (DEBUG)** | Moduł zostaje; **auto-enable → false**. Opt-in: `__WG_PAYROLL_STORAGE_TRACE__.enable()` |
| `PAYROLL_WRITE_TRACE_DIAG_AUTO_ENABLE` | **KEEP (DEBUG)** | j.w. · `__WG_PAYROLL_WRITE_TRACE__.enable()` |
| `PAYROLL_BOOT_PATH_DIAG_AUTO_ENABLE` | **KEEP (DEBUG)** | j.w. · `__WG_PAYROLL_BOOT_PATH__.enable()` |
| `__WG_PAYROLL_*` globals (install) | **KEEP (DEBUG)** | API diagnostyczne; bez auto-active |
| `__wgdomPayrollTrace*` / `payrollTraceEmit` | **KEEP (DEBUG)** | Ring zostaje; **`isPayrollTraceEnabled` default OFF** (włącz: `localStorage wg-payroll-trace=1` / `VITE_DEBUG_PAYROLL_TRACE=1` / `__wgdomPayrollTraceEnable()`) |
| `__WG_PAYROLL_ANTI_LEAK/DISPLAY/BOOTSTRAP_TRACE__` | **KEEP (DEBUG)** | Już opt-in |
| `__WG_JOBS_PHOTOS_LIVE_TRACE__` | **KEEP (DEBUG)** | Już opt-in |
| `__wgdomSyncMetrics` | **KEEP** | Lekki odczyt metryk sync (AC5) — bez kosztu gdy nie wołane |
| `console.info("[sync-metrics]")` | **KEEP (DEBUG)** | Tylko `DEV` lub `VITE_DEBUG_SYNC_METRICS=1` |
| `getDossierTraceLog` / `traceDossierPipeline` | **KEEP** | Używane w UX faz kosztorysu (nie tylko RCA) |
| `console.debug([Dossier trace])` | **KEEP (DEBUG)** | Tylko `import.meta.env.DEV` |
| `heavy.parse_*` / `heavy.persist_*` timing | **KEEP (DEBUG)** | Już za `VITE_PIPELINE_TIMING=1` |
| `heavyRunAttempts` / circuit breaker | **KEEP** | **Logika Sync Storm P0** — nie instrumentacja RCA |
| `HEAVY_E_RUN_DEP_KEYS` | **KEEP** | Kontrakt Sync Storm — nietknięty |
| `__WG_STORAGE__` / storage-telemetry | **KEEP** | ARCH-02 A0 (poza scope cleanup / FORBIDDEN ARCH-02F) |
| Temporary RCA-only dead modules | **REMOVE** | **Brak** — nic nie usunięto jako martwy plik; tylko wyłączono auto-enable |

---

## 2. Zmiany kodu (tylko cleanup)

| Plik | Zmiana |
|------|--------|
| `payroll-kw-week-employees-storage-trace.ts` | `AUTO_ENABLE = false` |
| `payroll-week-employees-write-trace.ts` | `AUTO_ENABLE = false` |
| `payroll-boot-path-trace.ts` | `AUTO_ENABLE = false` |
| `payroll-runtime-trace.ts` | default OFF; opt-in flagi |
| `tender-dossier-trace.ts` | `console.debug` → DEV |
| `App.tsx` | `[sync-metrics]` → DEV / `VITE_DEBUG_SYNC_METRICS` |
| `changelog-data.ts` / `CHANGELOG.md` | **2.65.39** |

**Nietknięte:** Sync Storm hooks · Edge · StorageManager · Cloud protocol · merge.

---

## 3. Gates

| Gate | Wynik |
|------|--------|
| Lint (IDE na zmienionych) | **PASS** (0 diagnostics) |
| `tsc --noEmit` | **PASS źródeł** (pre-existing TS5101 `baseUrl` only) |
| `vite build` | **PASS** |
| `test-tenders-sync-storm-p0.mjs` | **PASS** (24/0) |
| Smoke Dashboard / Payroll / Tenders / MOPS / Jobs / Sync | **PASS** (prod **2.65.39**) |

### Smoke detail (prod `f9d922a` / 2.65.39)

| Scenariusz | Wynik |
|------------|--------|
| Dashboard (Pulpit) | **PASS** |
| Cloud Sync UI reachable | **PASS** |
| Payroll (Lista Płac) | **PASS** |
| Jobs (Roboty) | **PASS** (nav `Roboty9` — badge w label) |
| Tenders | **PASS** |
| MOPS Kamieńskiego | **PASS** |
| Sync Storm `builtAt` stable | **PASS** (1 unique) |
| Diag globals opt-in only | **PASS** (`payrollTraceForced: false`) |

---

## 4. Definition of Done

| DoD | Status |
|-----|--------|
| Brak martwej auto-instrumentacji na prod | **PASS** |
| Brak zmian logiki | **PASS** |
| Build PASS | **PASS** |
| Smoke PASS | **PASS** |
| Sync Storm nietknięty | **PASS** |
| Dokumentacja | **PASS** |
| Commit / deploy | **PASS** `f9d922a` · UI **2.65.39** |

```text
INCIDENT-23-07 CLEANUP COMPLETE
VERDICT: PASS
STOP
```
