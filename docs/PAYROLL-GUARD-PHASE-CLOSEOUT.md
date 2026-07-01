# PAYROLL-CLOUD-RECOVERY — Guard Phase · SERIES CLOSEOUT

> **Status:** **SERIES CLOSED** · **Data closeout:** 2026-07-01  
> **Prod baseline:** **v2.63.20** (`6afd9fd`) · **PRODUCTION VERIFIED**  
> **STABILIZATION WINDOW:** ACTIVE

---

## 1. Cel serii Guard Phase

Seria **B3 → B3.1 → B3.2** domyka koordynację mutacji składu listy płac (`kw-week-employees`) podczas operacji push/pull/auto-sync chmury.

**Problem biznesowy:** auto-sync (pull-merge, `runCloudSync`, `scheduleAutoCloudSync`) mógł nadpisać świeży skład tygodnia LP podczas zapisu do KV — szczególnie po dodaniu z Kadr, sync stawek z kartoteki i przejściu tygodnia (rollover).

**Cel architektoniczny:** ujednolicić ochronę mutacji rosteru pod **`CloudSyncMutationGuard`** (scope `kw-week-employees`) — ten sam wzorzec co Przydziały robót (`kw-jobs`, v2.63.16) i Roboty → Pracownicy (`workEntries`, v2.63.17).

**Werdykt serii:** trzy warstwy ochrony (guard + suppress + legacy ref) zredukowane do **dwóch SSOT** (guard + suppress); legacy ref usunięty w B3.2.

| Release | Commit | Bundle | Skrót |
|---------|--------|--------|-------|
| **2.63.18** | `45eddaa` | **B3** | Guard Phase 2 — R1/R2 |
| **2.63.19** | `91d02de` | **B3.1** | Guard Rollover — R3 |
| **2.63.20** | `6afd9fd` | **B3.2** | Cleanup `payrollRosterPushRef` |

**SSOT design freeze:** [`PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md) · B3.1 AUDIT + DESIGN FREEZE (2026-07-01)

---

## 2. Zakres B3, B3.1 i B3.2

### B3 — Guard Phase 2 (v2.63.18)

| ID | Ścieżka | Mechanizm |
|----|---------|-----------|
| **R1** | `persistPayrollRoster` | `withKwWeekEmployeesAsyncMutation` + `pushWeekEmployeesToCloud` |
| **R2** | `syncWeekRatesFromDirectory` (async push) | ten sam guard przy push składu + archiwum |

**Pliki:** `src/lib/cloud-sync-mutation-guard.ts` (`withKwWeekEmployeesAsyncMutation`, `KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS=6000`) · `src/app/App.tsx`  
**Test:** `scripts/test-payroll-roster-guard-phase2.mjs` (15 PASS)

W B3 **zachowano** równolegle `payrollRosterPushRef` (defense in depth do czasu B3.2).

### B3.1 — Guard Rollover (v2.63.19)

| ID | Ścieżka | Mechanizm |
|----|---------|-----------|
| **R3** | `autoArchiveAndAdvance` → `pushPayrollWeekAfterRollover` | `withKwWeekEmployeesAsyncMutation` + suppress 6000 ms |

**Problem:** rollover zerował lokalny skład nowego tygodnia, podczas gdy KV nadal mógł trzymać poprzedni tydzień — auto-sync adoptował stare godziny (smoke 20.1C.1 integration).

**Test:** `smoke-test-payroll-rollover-sync-20.1c1.mjs` · `smoke-test-payroll-rollover-sync-integration-20.1c1.mjs`

### B3.2 — payrollRosterPushRef cleanup (v2.63.20)

| Element | Akcja |
|---------|--------|
| **D0** | Usunięto deklarację `payrollRosterPushRef` |
| **C1–C3** | Usunięto early-return w `pullFromCloudAndMerge`, `runCloudSync`, `scheduleAutoCloudSync` |
| **W1–W3b** | Usunięto set/finally na R1, R2, R3 |

**Plik:** wyłącznie `src/app/App.tsx` (−12 linii).  
**Bez zmian:** `cloud-sync.ts`, Edge, `mergeWeekEmployees`, API guarda.

---

## 3. Usunięte race conditions

| # | Scenariusz | Przed serią | Po B3.2 |
|---|------------|-------------|---------|
| **RC-1** | Dodanie pracownika z Kadr + auto-sync | Skład mógł zniknąć / cofnąć się | Guard blokuje pull-merge-push; suppress defer |
| **RC-2** | Sync stawek z kartoteki (push składu w tle) | Auto-sync mógł nadpisać świeży roster | R2 pod guardem; bez podwójnego ref |
| **RC-3** | Rollover tygodnia (pusty nowy tydzień vs stary KV) | F5/bootstrap adoptował 495 h z poprzedniego tygodnia | R3 guard + Payroll Guard shrink na pustym push |
| **RC-4** | Równoległy pull podczas push rosteru | `payrollRosterPushRef` + guard — duplicate, ryzyko desync flag | Jedna warstwa: `isBlocked()` + suppress |
| **RC-5** | Token guarda po zakończeniu push | Ryzyko leak przy wyjątku | `withKwWeekEmployeesAsyncMutation` finally `end(token)` |

**Regresja:** testy B3 (15) · rollover 20.1C.1 (5 + integration) · merge P0 (16) · guard unit (10) — **PASS** przy release 2.63.20.

---

## 4. Migracja z payrollRosterPushRef do CloudSyncMutationGuard

### Faza 1 — P0 (2.63.15–16)

- **2.63.15:** merge UNION po `directoryId` — naprawa utraty składu przy sync.
- **2.63.16:** `CloudSyncMutationGuard` dla `kw-jobs` (Przydziały LP).
- **`payrollRosterPushRef`:** wprowadzony wcześniej jako legacy flag in-flight push rosteru (CHANGELOG 2.63.15).

### Faza 2 — B3 (2.63.18): guard równolegle z ref

```text
begin('kw-week-employees') + payrollRosterPushRef=true + suppress
  → push
  → finally: end(token) + payrollRosterPushRef=false
```

Konsumenci sync: **oba** warunki (`payrollRosterPushRef` **lub** `isBlocked()`).

### Faza 3 — B3.1 (2.63.19): R3 rollover pod guardem

`pushPayrollWeekAfterRollover` objęty tym samym wzorcem co R1/R2.

### Faza 4 — B3.2 (2.63.20): ref usunięty

```text
begin('kw-week-employees') + suppressAutoSyncUntilRef
  → push
  → finally: end(token)
```

Konsumenci sync: **`cloudSyncMutationGuard.isBlocked()`** + **`suppressAutoSyncUntilRef`** — bez `payrollRosterPushRef`.

**Pliki SSOT guarda:** `src/lib/cloud-sync-mutation-guard.ts` · konsumenci w `src/app/App.tsx` (`pullFromCloudAndMerge`, `runCloudSync`, `scheduleAutoCloudSync`).

---

## 5. Pozostawione mechanizmy (suppressAutoSyncUntilRef)

`suppressAutoSyncUntilRef` **pozostaje** — celowo poza scope B3.2.

| Rola | Dlaczego zostaje |
|------|------------------|
| **Defer auto-sync po mutacji** | Okno czasowe (4.5–12 s) niezależne od tokenów guarda — chroni przed wake/timer/sync mount |
| **scheduleAutoCloudSync delay** | `appDelay = suppressUntil - now` — harmonogram bez natychmiastowego pull po zapisie |
| **Inne mutacje App** | Import backupu, zapis tygodnia, delete jobs — suppress bez guard roster |

Guard i suppress są **komplementarne**: guard = aktywna mutacja KV (token + scope); suppress = ogólny cooldown UI/sync niezwiązany wyłącznie z rosterem.

**Nie usuwać** `suppressAutoSyncUntilRef` bez osobnego audytu (poza scope Guard Phase).

---

## 6. Wnioski architektoniczne

1. **Jeden guard, wiele scope'ów** — `kw-jobs` i `kw-week-employees` współdzielą `CloudSyncMutationGuard`; parallel tokens per scope (B3-T3, T12-guard).
2. **Async push wymaga `withKwWeekEmployeesAsyncMutation`** — sync helper nie wystarczy dla fire-and-forget push (R1/R2/R3).
3. **Defense in depth → simplify** — B3 celowo zostawił ref do weryfikacji; B3.2 potwierdził, że guard + suppress wystarczą.
4. **Payroll Guard shrink** (`applyPayrollGuardBeforePush`) — osobna warstwa (#008); nie mylić z MutationGuard.
5. **mergeWeekEmployees UNION** (P0) — nadal SSOT merge; Guard Phase nie zmienia modelu danych.
6. **STABILIZATION WINDOW** — seria zamknięta bez nowych epiców; kolejne bundle Etap 2 (B4–B6) tylko na polecenie.

---

## 7. Powiązania z backlogiem (B4 / B5 / B6)

| ID | Temat | Relacja do Guard Phase | Status |
|----|-------|------------------------|--------|
| **B4** | RCA-3: `finalizePayrollBundleMerge` SSOT | Bootstrap + runtime merge — **CLOSED** v2.63.21 (`b3d5664`) | **CLOSED** — [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) |
| **B5** | RCA-2: closed week + archiwum UI | Semantyka saved/closed vs sync; ortogonalne do guard push | **OPEN** |
| **B6** | Edge Parity — merge `directoryId` vs UUID | Warstwa Edge `batch-set`; guard klienta nie zastępuje | **OPEN** |
| **TEST-INFRA-001** | Harness Playwright LP L0–L5 | Design APPROVED; prod smoke wymaga TI-B2 sandbox job IDs | **READY · NOT STARTED** |

**Łańcuch prod PAYROLL (pełny):**

```text
2.63.15 roster UNION · 2.63.16 guard LP Przydziały · 2.63.17 B1+B2
→ 2.63.18 B3 · 2.63.19 B3.1 · 2.63.20 B3.2 (Guard Phase CLOSED)
→ 2.63.21 B4 (Bootstrap Merge SSOT CLOSED)
```

**Następny aktywny backlog Etap 2 (na polecenie):** B5 · B6 · TEST-INFRA-001.

---

## Werdykt closeout

```text
SERIES CLOSED — PAYROLL Guard Phase B3 / B3.1 / B3.2
BASELINE v2.63.20 · COMMIT 6afd9fd · PRODUCTION VERIFIED
Guard SSOT: CloudSyncMutationGuard (kw-week-employees) + suppressAutoSyncUntilRef
Legacy payrollRosterPushRef: REMOVED (B3.2)
Backlog Etap 2 OPEN: B5 · B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE
```
