# PAYROLL-CLOUD-RECOVERY — Etap 2 B4 · CLOSEOUT

> **Status:** **CLOSED** · **Data closeout:** 2026-07-01  
> **Prod baseline:** **v2.63.21** (`b3d5664`) · **PRODUCTION VERIFIED**  
> **STABILIZATION WINDOW:** ACTIVE

---

## 1. Cel bundle B4

**Problem (RCA-3):** Dwa równoległe pipeline merge payroll — bootstrap (`CloudLoader` → `applyBootstrapPayrollMerge`) i runtime (`computeMergedDataBundle` → pull/focus sync) — miały **różną** logikę P11 richness override. Skutek: local 0 h + bogata chmura naprawiane przy F5 (bootstrap), ale **nie** przy pull/sync w tej samej sesji.

**Cel:** Jeden SSOT merge payroll po `mergeAllDataKeys` — bootstrap i runtime identyczne; anti-leak rollover wyłącznie w ścieżce runtime.

| Release | Commit | Skrót |
|---------|--------|-------|
| **2.63.21** | `b3d5664` | **B4** — `finalizePayrollBundleMerge` SSOT |

**Powiązane (CLOSED):** [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md)

---

## 2. Architektura merge payroll (SSOT po B4)

```text
mergeAllDataKeys(local, cloud)
        │
        ▼
finalizePayrollBundleMerge(merged, local, cloud)     ← SSOT bootstrap + runtime
  ├── alignWeekRangeInMerged
  ├── sanitizeWeekEmployeesForTargetRange
  ├── week mismatch guard (20.1C.1) — nie adoptuj innego tygodnia
  └── P11 richness override — chmura bogatsza → mergeWeekEmployees([], cloudEmps)

Ścieżka bootstrap (CloudLoader):
  applyBootstrapPayrollMerge → finalizePayrollBundleMerge

Ścieżka runtime (pull / focus sync):
  computeMergedDataBundle
    → finalizePayrollBundleMerge
    → applyRuntimePayrollAntiLeak          ← tylko runtime (rollover leak)
```

### Funkcje (`src/lib/cloud-sync.ts`)

| Funkcja | Ścieżka | Rola |
|---------|---------|------|
| `finalizePayrollBundleMerge` | bootstrap + runtime | align · sanitize · week mismatch · P11 richness |
| `applyBootstrapPayrollMerge` | bootstrap | wrapper → `finalizePayrollBundleMerge` |
| `applyRuntimePayrollAntiLeak` | runtime only | pusty nowy tydzień po rolloverze — nie przenoś osób z KV |
| `computeMergedDataBundle` | runtime | finalize + anti-leak |
| `sanitizeWeekEmployeesForTargetRange` | wewnętrzna | odrzuca rekordy spoza docelowego zakresu |
| `alignWeekRangeInMerged` | wewnętrzna | spójność `kw-weekFrom` / `kw-weekTo` |

**Nie mylić z:**
- `CloudSyncMutationGuard` (B3) — blokuje sync **podczas** mutacji push rosteru
- `applyPayrollGuardBeforePush` — blokuje push gdy shrink >50%
- `mergeWeekEmployees` UNION (P0 2.63.15) — merge per rekord przy `mergeDataKey`

---

## 3. Scenariusze naprawione

| # | Scenariusz | Przed B4 | Po B4 |
|---|------------|----------|-------|
| **S1** | Local 0 h, bogata chmura, F5 | Bootstrap P11 OK | Bez zmian (SSOT) |
| **S2** | Local 0 h, bogata chmura, focus/pull sync | Runtime **bez** P11 — UI zostaje 0 h | Runtime = bootstrap — godziny wracają |
| **S3** | Rollover — pusty nowy tydzień vs stary KV | Anti-leak tylko w runtime (OK) | Bez zmian — `applyRuntimePayrollAntiLeak` |
| **S4** | Week mismatch (inny tydzień w chmurze) | Bootstrap miał guard 20.1C.1 | Ten sam guard w obu ścieżkach |

---

## 4. Pliki i testy

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync.ts` | Ekstrakcja `finalizePayrollBundleMerge` + `applyRuntimePayrollAntiLeak` |
| `scripts/test-payroll-bootstrap-runtime-parity-b4.mjs` | **NOWY** — parity bootstrap vs runtime (13 PASS) |

**Regresja (PASS przy release):**
- `test-payroll-bootstrap-runtime-parity-b4.mjs` (13)
- `test-p11-bootstrap-payroll.mjs`
- `smoke-test-payroll-rollover-sync-20.1c1.mjs` (5)
- `smoke-test-payroll-rollover-sync-integration-20.1c1.mjs`
- `test-payroll-refresh-team-race-p0.mjs` (4)

---

## 5. Backlog Etap 2 (po B4)

| ID | Temat | Status |
|----|-------|--------|
| **B1–B4** | Etap 2 MIN + Guard + Bootstrap SSOT | **CLOSED** |
| **B5** | RCA-2: closed week + archiwum UI | **OPEN** |
| **B6** | Edge Parity — merge `directoryId` vs UUID | **OPEN** |
| **TEST-INFRA-001** | Harness Playwright LP L0–L5 | **READY · NOT STARTED** |

**Łańcuch prod PAYROLL (pełny):**

```text
2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2
→ 2.63.18 B3 · 2.63.19 B3.1 · 2.63.20 B3.2 (Guard Phase CLOSED)
→ 2.63.21 B4 (Bootstrap Merge SSOT CLOSED)
```

---

## Werdykt closeout

```text
CLOSED — PAYROLL-CLOUD-RECOVERY Etap 2 B4
BASELINE v2.63.21 · COMMIT b3d5664 · PRODUCTION VERIFIED
SSOT merge: finalizePayrollBundleMerge (bootstrap + runtime)
Anti-leak: applyRuntimePayrollAntiLeak (runtime only)
Backlog Etap 2 OPEN: B5 · B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE
```
