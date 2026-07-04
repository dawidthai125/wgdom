# SYNC-ARCH-01 · RC-B-1A · PWRB Architecture · DESIGN FREEZE

> **Status:** `PWRB ARCHITECTURE FROZEN`  
> **Tryb:** AUDIT + DESIGN · **IMPLEMENT = NIE**  
> **Data:** 2026-07-04  
> **Supersedes:** warstwa architektoniczna z RC-B-1 v2 §1.3 (uproszczona)  
> **Wymaga:** [`SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md) (I-1…I-4, G-0)  
> **Blokuje:** IMPLEMENT RC-B-1 dopóki RC-B-1A + RC-B-1 v2 nie są wdrożone **w jednym bundle**

```text
CEL:           Jedna warstwa domenowa PWRB — brak bocznych ścieżek modyfikacji tombstonów.
PROBLEM:       PRE-IMPLEMENTATION REPO AUDIT — BYP-1…BYP-6 (facade, import, RS/Edge).
ROZWIĄZANIE:   Facade module + visibility matrix + CI gate.
WERDYKT:       PWRB ARCHITECTURE FROZEN
```

---

## 0. Relacja dokumentów

| Dokument | Zakres |
|----------|--------|
| **RC-B-1 v2** | Semantyka tombstone/revoke, I-1…I-4, testy DC-T* |
| **RC-B-1A (ten)** | Warstwy, facade API, visibility, zakazy, CI |
| **RC-B-1 IMPLEMENT** | Jeden bundle: v2 + RC-B-1A + RC-B-1k/l/m |

---

## 1. Warstwy architektury

```text
┌─────────────────────────────────────────────────────────────┐
│  UI LAYER                                                    │
│  App.tsx · PayrollView.tsx · AdminSettingsModal (restore)   │
│  Dozwolone: wyłącznie import z @/lib/payroll-week-roster-   │
│             bundle (PWRB Facade)                             │
└────────────────────────────┬────────────────────────────────┘
                             │ pwrAdd | pwrRemove | pwrReconcile
                             │ pwrPush (via facade) | pwrImportMerge
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  PWRB FACADE                                                 │
│  src/lib/payroll-week-roster-bundle.ts          [NOWY SSOT] │
│  · walidacja G-0 przed/po mutacji                           │
│  · jedyny publiczny entry point mutacji pary PWRB           │
│  · orchestracja: roster + tombstones + push                  │
└────────────────────────────┬────────────────────────────────┘
                             │ wywołania kernel (internal)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  CLOUD SYNC KERNEL                                           │
│  src/lib/cloud-sync.ts (sekcja PWRB — oznaczona)            │
│  · tombstone CRUD (private exports)                          │
│  · mergeWeekEmployeesForWeekRange / sanitize               │
│  · computeMergedDataBundle + I-1                            │
│  · pushWeekEmployeesToCloud + I-4 (internal, wołane z facade)│
└────────────────────────────┬────────────────────────────────┘
                             │ saveDeletedIdsToKey / getItem
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  STORAGE                                                     │
│  localStorage: kw-week-employees                             │
│                kw-week-employees-deleted-ids                  │
│  Zapis tombstones: WYŁĄCZNIE przez kernel saveDeleted*       │
└────────────────────────────┬────────────────────────────────┘
                             │ batch-set (coupled PWRB)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  EDGE                                                        │
│  supabase/functions/make-server-0afb8820/index.tsx          │
│  · I-2 pair normalization                                    │
│  · deleted-ids REPLACE przy coupled push (RC-B-1e)          │
│  · S7-5-2 filter przed UNION rosteru                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Przepływ danych (mutacja domenowa)

```text
UI intent
  → Facade (G-0 check)
    → Kernel mutate LS (roster + tombstones atomically in logic)
      → Storage (LS)
    → Facade pwrPush
      → Kernel pushWeekEmployeesToCloud (I-4)
        → Edge batch-set (I-2)
          → KV
```

### 1.2 Przepływ danych (sync / pull)

```text
runCloudSync / CloudLoader / pullAndMerge
  → pwrPullMerge (facade — thin wrapper)
    → computeMergedDataBundle
      → UNION tombstones → I-1 strip → save LS
      → finalize → sanitize
  → apply bundle to UI state
```

### 1.3 RS push (S1-1) — poza domain push

```text
pushMergedDataBundleToCloud (RS)
  → filterRsPushKeysAndValues WYKLUCZA payroll + tombstones
  → tombstones NIE idą RS push (zamierzone)
  → jedyny cloud writer tombstonów domain intent: I-4 coupled push
  → pull C1 nadal CZYTA tombstones z KV (S7-5-1)
```

---

## 2. Publiczne API PWRB Facade

**Plik SSOT:** `src/lib/payroll-week-roster-bundle.ts`  
**Eksport:** tylko poniższe symbole + typy pomocnicze.

### 2.1 `pwrAdd`

```typescript
pwrAdd(params: {
  weekFrom: string;
  weekTo: string;
  directoryIds: string[];
  directory: DirectoryEntry[];
  currentRoster: WeekEmployee[];
}): PwrMutationResult
```

| Pole | Opis |
|------|------|
| **INPUT** | ids z kartoteki, bieżący roster, zakres tygodnia |
| **OUTPUT** | `{ roster, tombstones, pushed: boolean }` |
| **Działanie** | dedup → `weekEmployeeFromDir` → **revoke** tombstones dla new emps → G-0 → `pwrPush` |
| **Invariant** | G-0, I-4 |
| **Failure** | offline: LS spójny, `pushed: false`; toast z kernel |

### 2.2 `pwrRemove`

```typescript
pwrRemove(params: {
  weekFrom: string;
  weekTo: string;
  employeeId: string;
  currentRoster: WeekEmployee[];
}): PwrMutationResult
```

| Pole | Opis |
|------|------|
| **INPUT** | id wpisu rosteru |
| **OUTPUT** | roster −1, tombstones +`tombstoneId(W,K)` |
| **Działanie** | append tombstone (kernel private) → G-0 → `pwrPush` |
| **Invariant** | S2 — T musi powstać; G-0 po remove |
| **Failure** | id nieznany → no-op |

### 2.3 `pwrPush`

```typescript
pwrPush(params: {
  roster: WeekEmployee[];
  tombstones?: string[];  // default: kernel read after reconcile
  options?: { skipPayrollGuard?: boolean };
}): Promise<void>
```

| Pole | Opis |
|------|------|
| **INPUT** | spójna para PWRB (pre-reconcile wewnętrznie) |
| **OUTPUT** | LS + HTTP batch-set oba klucze |
| **Działanie** | `reconcileTombstonesWithRoster` → collapse roster → I-4 push |
| **Invariant** | G-0, I-4; Edge I-2 |
| **Failure** | throw → UI toast; LS już zapisany |

### 2.4 `pwrPullMerge`

```typescript
pwrPullMerge(params: {
  localBundle: unknown[];
}): Promise<{ merged: unknown[]; cloudReachable: boolean }>
```

| Pole | Opis |
|------|------|
| **INPUT** | bundle wartości DATA_KEYS z LS |
| **OUTPUT** | scalony bundle po finalize |
| **Działanie** | delegacja `computeMergedDataBundle` (I-1 w kernel) |
| **Invariant** | I-1 strip przed finalize |
| **Failure** | offline → merge lokalny only |

### 2.5 `pwrReconcile`

```typescript
pwrReconcile(params: {
  weekFrom: string;
  weekTo: string;
  roster: WeekEmployee[];
  tombstones?: string[];
}): string[]
```

| Pole | Opis |
|------|------|
| **INPUT** | roster (źródło prawdy dla G-0), opcjonalne tombstones |
| **OUTPUT** | tombstones' spełniające G-0 |
| **Działanie** | usuń `tombstoneId(W,K)` gdzie K ∈ roster; week-scope guard |
| **Invariant** | I-3 |
| **Wywołania** | import, restore, post-`restoreLocalDataSnapshot`, pre-`pwrPush` |

### 2.6 `pwrImportMerge` (pomocnicze, public)

```typescript
pwrImportMerge(params: {
  weekFrom: string;
  weekTo: string;
  localRoster: WeekEmployee[];
  importedRoster: WeekEmployee[];
  localTombs: string[];
  importedTombs: string[];
}): { roster: WeekEmployee[]; tombstones: string[] }
```

| Pole | Opis |
|------|------|
| **INPUT** | fragmenty z JSON importu |
| **OUTPUT** | merged roster (union) + merged tombs (union) + **pwrReconcile** |
| **Zastępuje** | ślepe `Object.entries` dla PWRB keys w `importBackup` |

---

## 3. Zabronione wywołania

### 3.1 Reguły twarde (prod `src/`)

| ID | Zakaz | Dotyczy |
|----|-------|---------|
| **Z-1** | `import { addDeletedWeekEmployeeKey } from "@/lib/cloud-sync"` | Wszystkie pliki **poza** `payroll-week-roster-bundle.ts` i `cloud-sync.ts` |
| **Z-2** | `import { saveDeletedWeekEmployeeKeys } from "@/lib/cloud-sync"` | j.w. |
| **Z-3** | `localStorage.setItem("kw-week-employees-deleted-ids"` lub `setItem(WEEK_EMPLOYEES_DELETED_KEYS_KEY` | Całe `src/` |
| **Z-4** | `localStorage.setItem("kw-week-employees"` w mutacji rosteru poza kernel/facade | `src/app/**` (UI nie zapisuje LS rosteru bezpośrednio po RC-B-1A) |
| **Z-5** | `Object.entries(data).forEach(setItem)` obejmujące PWRB keys bez `pwrImportMerge` | `importBackup` |

### 3.2 Dozwolone wyjątki

| Obszar | Wyjątek |
|--------|---------|
| `src/lib/cloud-sync.ts` | kernel — jedyny plik z `saveDeletedWeekEmployeeKeys` / `addDeletedWeekEmployeeKey` |
| `src/lib/payroll-week-roster-bundle.ts` | facade — woła kernel |
| `supabase/.../index.tsx` | Edge KV — nie LS |
| `scripts/**` | testy, audyty readonly; **nie** prod |
| `filterDeletedWeekEmployees` import | dozwolony w testach S2/S6/S7-5 i Edge parity |

### 3.3 Migracja UI (RC-B-1A implement)

| Plik dziś | Dziś | Po RC-B-1A |
|-----------|------|------------|
| `App.tsx` | `addDeletedWeekEmployeeKey` + `persistPayrollRoster` | `pwrRemove` / `pwrAdd` |
| `App.tsx` `importBackup` | generic `setItem` | `pwrImportMerge` + jawny zapis PWRB keys |
| `App.tsx` `restorePayrollFromCloud` | merge roster only | `pwrReconcile` + push |
| `CloudLoader.tsx` | bootstrap merge | post-bootstrap `pwrReconcile` (RC-B-1h) |

---

## 4. Visibility matrix — istniejące funkcje

### 4.1 `cloud-sync.ts` — po RC-B-1A

| Symbol | Dziś | Po RC-B-1A | Konsumenci |
|--------|------|------------|------------|
| `addDeletedWeekEmployeeKey` | **public export** | **@internal** — tylko facade/kernel | facade |
| `saveDeletedWeekEmployeeKeys` | **public export** | **@internal** | kernel, I-1, I-3 |
| `removeDeletedWeekEmployeeKeysForWeek` | brak | **@internal** (new) | facade |
| `reconcileTombstonesWithRoster` | brak | **@internal** (new) | facade, import, CloudLoader |
| `getDeletedWeekEmployeeKeys` | public | **@internal** | facade, kernel, diagnostics |
| `mergeDeletedWeekEmployeeKeys` | public | **@internal** | kernel pull, pwrImportMerge |
| `normalizeDeletedWeekEmployeeKeys` | public | **@internal** | kernel, Edge parity tests |
| `weekEmployeeTombstoneId` | public | **public** | Edge, testy S2, facade |
| `deletedWeekEmployeeMergeKeySet` | public | **public** | merge/sanitize, S6, Edge |
| `filterDeletedWeekEmployees` | public | **public** | sanitize, S6, Edge — **read/filter only** |
| `eligibleArchiveWeekEmployees` | public | **public** | S6 UI — read only |
| `mergeWeekEmployeesForWeekRange` | public | **public** | sync kernel |
| `sanitizeWeekEmployeesForTargetRange` | public | **public** | finalize path |
| `pushWeekEmployeesToCloud` | public | **@internal** | facade `pwrPush` only |
| `computeMergedDataBundle` | public | **public** | CloudLoader; prefer `pwrPullMerge` w nowym kodzie |
| `WEEK_EMPLOYEES_DELETED_KEYS_KEY` | public | **public const** | kernel, Edge, testy; **Z-3** zakazuje UI `setItem` |

**Implementacja `@internal`:** JSDoc `@internal` + CI gate (§5); opcjonalnie przeniesienie private fn do `cloud-sync-pwrb-kernel.ts` w tym samym bundle.

### 4.2 `payroll-week-roster-bundle.ts` — nowy

| Symbol | Visibility |
|--------|------------|
| `pwrAdd` | **public** |
| `pwrRemove` | **public** |
| `pwrPush` | **public** |
| `pwrPullMerge` | **public** |
| `pwrReconcile` | **public** |
| `pwrImportMerge` | **public** |
| `PwrMutationResult` | **public type** |

### 4.3 `payroll-week-employee-merge.ts`

Bez zmian visibility — `weekEmployeeMergeKey` pozostaje **public** (SSOT tożsamości).

### 4.4 Edge

Bez zmian API; RC-B-1e dodaje I-2 + REPLACE w gałęzi coupled.

---

## 5. Reguły CI / lint (wykrywanie obejść)

### 5.1 Nowy skrypt — `scripts/audit-pwrb-boundary.mjs`

**Gate:** `npm run audit:pwrb` · opcjonalnie `test-infra` manifest tier B.

| Reguła | Metoda | FAIL gdy |
|--------|--------|----------|
| **CI-PWRB-1** | Ripgrep `src/` (exclude `cloud-sync.ts`, `payroll-week-roster-bundle.ts`) | import `addDeletedWeekEmployeeKey` |
| **CI-PWRB-2** | j.w. | import `saveDeletedWeekEmployeeKeys` |
| **CI-PWRB-3** | Ripgrep `src/` | `setItem\s*\(\s*['\"]kw-week-employees-deleted-ids` lub `WEEK_EMPLOYEES_DELETED_KEYS_KEY` |
| **CI-PWRB-4** | Ripgrep `src/app/` | `addDeletedWeekEmployeeKey` (jakakolwiek forma) |
| **CI-PWRB-5** | Parse `importBackup` w `App.tsx` | `Object.entries` zapisuje PWRB keys bez `pwrImportMerge` |
| **CI-PWRB-6** | Ripgrep `src/app/` | `pushWeekEmployeesToCloud` bezpośrednio (po migracji → tylko facade) |

**PASS:** 0 naruszeń · **FAIL:** wypisz plik:linia + regułę.

### 5.2 `package.json` (przy IMPLEMENT)

```json
"audit:pwrb": "node scripts/audit-pwrb-boundary.mjs"
```

### 5.3 Test regresji — `test-pwrb-boundary-rcb.mjs`

| ID | Test |
|----|------|
| BND-T1 | Skan `src/app` — brak forbidden imports |
| BND-T2 | `pwrReconcile` + roster z X → tombs bez `::dir:X` |
| BND-T3 | Facade `pwrRemove` → `pwrAdd` → G-0 holds |
| BND-T4 | `pwrImportMerge` ze stale tombs → G-0 |

### 5.4 Opcjonalny ESLint (post-MVP)

`no-restricted-imports` w `src/app/**`:

```json
{
  "paths": [
    {
      "name": "@/lib/cloud-sync",
      "importNames": ["addDeletedWeekEmployeeKey", "saveDeletedWeekEmployeeKeys"],
      "message": "Użyj @/lib/payroll-week-roster-bundle (PWRB Facade)."
    }
  ]
}
```

**RC-B-1A MVP:** skrypt `audit-pwrb-boundary.mjs` wystarczy (zgodnie z TEST-INFRA — bez nowego ESLint bez polecenia).

---

## 6. Mapowanie BYP → domknięcie

| Bypass (repo audit) | Domknięcie RC-B-1A |
|---------------------|-------------------|
| BYP-1 App direct `addDeletedWeekEmployeeKey` | `pwrRemove` + Z-1/CI-PWRB-4 |
| BYP-2 import `setItem` | `pwrImportMerge` + Z-5 |
| BYP-3 restore snapshot asymetria | `pwrReconcile` w CloudLoader (RC-B-1h) |
| BYP-4 push bez tombs | `pwrPush` / I-4 |
| BYP-5 RS exclusion | dokumentowane §1.3 — nie bypass |
| BYP-6 Edge UNION | RC-B-1e + I-2 |

---

## 7. Zakres bundle IMPLEMENT (RC-B-1 + RC-B-1A)

| ID | Element |
|----|---------|
| RC-B-1a…j | z v2 (revoke, I-1…I-4, Edge, testy DC-T*) |
| **RC-B-1k** | `payroll-week-roster-bundle.ts` — facade API §2 |
| **RC-B-1l** | `importBackup` → `pwrImportMerge` (Z-5) |
| **RC-B-1m** | `audit-pwrb-boundary.mjs` + `test-pwrb-boundary-rcb.mjs` |
| **RC-B-1n** | `@internal` / visibility matrix §4 |
| **RC-B-1o** | App.tsx migracja na facade |

**Jeden bundle, jeden commit series, jeden deploy.**

---

## 8. Impact Analysis (RC-B-1A)

| Obszar | Wpływ |
|--------|-------|
| **App.tsx** | Importy tombstone kernel → facade; mniejsza powierzchnia regresji |
| **cloud-sync.ts** | Demote exports; logika bez zmian semantyki v2 |
| **Testy S2/S7-5** | Nadal importują `filterDeleted*` / `mergeWeekEmployeesForWeekRange` — OK |
| **Edge** | Bez zmian API publicznego |
| **Developer UX** | Jedna dokumentacja „jak mutować roster" |
| **CI** | +1 audit script (~2s) |

---

## 9. Test Plan (RC-B-1A dodatek do v2)

| Suite | Zakres |
|-------|--------|
| v2 DC-T1…T9 | distributed consistency |
| **BND-T1…T4** | boundary + facade |
| **CI-PWRB-1…6** | static audit |
| Regresje S2, S7-5, B4 | bez zmian |

**Gate IMPLEMENT:** `audit:pwrb` PASS + `test-pwrb-boundary-rcb.mjs` PASS + regresje v2.

---

## 10. Werdykt

```text
PWRB ARCHITECTURE FROZEN
```

**Warunki zamrożenia spełnione:**

1. Warstwy UI → Facade → Kernel → Storage → Edge — zdefiniowane (§1).  
2. Publiczne API — 5 core + `pwrImportMerge` (§2).  
3. Zakazy Z-1…Z-5 + wyjątki (§3).  
4. Visibility matrix — public / @internal (§4).  
5. CI gate CI-PWRB-1…6 (§5).  
6. Domknięcie BYP-1…6 z repo audit (§6).  
7. Spójność z RC-B-1 v2 I-1…I-4 — bez konfliktu.

**IMPLEMENT RC-B-1** może startować jako **RC-B-1 + RC-B-1A** jeden bundle (§7).

**Nie wymaga ADDITIONAL DESIGN** — o ile IMPLEMENT obejmuje RC-B-1k/l/m/n/o w tym samym release.

---

## 11. Referencje

| Plik | Rola |
|------|------|
| [`SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md) | Semantyka revoke + I-1…I-4 |
| `src/lib/cloud-sync.ts` | Kernel (baseline) |
| `src/app/App.tsx` | UI do migracji |
| PRE-IMPLEMENTATION REPO AUDIT (sesja 2026-07-04) | BYP-1…8 |

---

*Ostatnia aktualizacja: 2026-07-04 · SYNC-ARCH-01 RC-B-1A · PWRB ARCHITECTURE FROZEN*
