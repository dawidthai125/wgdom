# PAYROLL-CLOUD-RECOVERY — Etap 2 B6 · DESIGN FREEZE (Edge Parity)

> **Status:** **DESIGN FREEZE DRAFT** — czeka na akceptację właściciela repo · **IMPLEMENT: NO GO**  
> **Data freeze:** 2026-07-01 · **wersja dokumentu:** v1.0  
> **Baseline prod:** **v2.63.22** (`187afb8`) · **STABILIZATION WINDOW:** ACTIVE  
> **Audyt źródłowy:** [`PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md`](PAYROLL-CLOUD-RECOVERY-B6-AUDIT.md) — **zatwierdzony**  
> **Powiązane (CLOSED):** [`PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B5-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) · [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md)

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Epic ID** | PAYROLL-CLOUD-RECOVERY — **Etap 2 · B6** |
| **Bundle** | **B6** — Edge Parity: `kw-week-employees` merge `directoryId` vs UUID |
| **Ticket legacy** | Edge parity (backlog Etap 2) |
| **Principles** | **Brak nowych** — obowiązują istniejące **#001–#013** (P0 roster + guard) |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu danych** | **Brak** |
| **Zmiana klienta merge (B4/P0)** | **Brak zmiany semantyki** — klient pozostaje SSOT; Edge doprowadzany do parity |
| **Deploy** | **Supabase Edge** (wymagany) + opcjonalnie Vercel (shared module / changelog) |
| **IMPLEMENT** | **Zabroniony** do akceptacji tego dokumentu |

```text
AUDIT B6:        COMPLETE
DESIGN FREEZE:   DRAFT — oczekuje akceptacji właściciela repo
IMPLEMENT:       NO GO
```

---

## 1. Goal

**Problem:** Klient (P0 v2.63.15 + B4) scala `kw-week-employees` po **`weekEmployeeMergeKey`** (`dir:{directoryId}` pierwszeństwo). Edge `batch-set` scala po **`emp.id` (UUID)** i przy wykryciu „rozszerzenia rosteru” wywołuje `mergeWeekEmployeesKeepPrevRoster`, co **odrzuca** nowe osoby dodane z innego urządzenia — w sprzeczności z P0 #009 (union po tożsamości biznesowej, nie po UUID).

**Cel B6:** Ujednolicić **jedną semantykę merge listy rosteru** między klientem a Edge — tożsamość i union zgodne z `mergeWeekEmployees` / `weekEmployeeMergeKey` — bez zmiany modelu KV, bez regresji B3/B4/B5, bez nowych Principles.

**Sukces biznesowy:** Dodanie pracownika z Kadr (admin lub worker) przez `pushKeysToCloudSafe` lub Edge `batch-set` **nie ginie** w KV, gdy serwer ma starszy snapshot z innymi UUID; ten sam `directoryId` nigdy nie daje dwóch wierszy w KV po merge serwerowym.

---

## 2. RCA summary

| Warstwa | As-is | Root cause |
|---------|-------|------------|
| **Klient pull/merge** | `mergeWeekEmployees` → `weekEmployeeMergeKey` | **Poprawne** (P0 SSOT) |
| **Edge batch-set** | `mergeWeekEmployeesUnion` → map key = `emp.id` | **UUID SSOT** — primary gap |
| **Edge expansion guard** | `hasWeekEmployeesRosterExpansion` → `mergeWeekEmployeesKeepPrevRoster` | Traktuje **nowy UUID** jako atak stale device → **utrata** nowego `directoryId` |
| **Testy P0** | Mock `batch-set` = direct KV write | **Nie wykrywają** Edge UUID semantics |

**Scenariusz referencyjny (potwierdzony w audycie E2):**

```text
KV: N osób
Worker → pushKeysToCloudSafe(["kw-week-employees"])
  Klient mergeDataKey: N+1 (union po directoryId) ✓
  Edge expansion guard: KeepPrevRoster → N osób ✗
```

**Nie jest root cause B6:** `finalizePayrollBundleMerge`, `CloudSyncMutationGuard`, B5 UI, `payroll-cycle`, rollover — pozostają bez zmian semantycznych.

---

## 3. Current client merge semantics

Źródło: `src/lib/cloud-sync.ts` (P0 + B4, **bez zmian w B6**).

### 3.1 Tożsamość — `weekEmployeeMergeKey`

```text
IF directoryId (trim) → "dir:{directoryId}"
ELSE IF name (normalized) → "name:{normalizedName}"
ELSE → "id:{uuid}"
```

### 3.2 Lista — `mergeWeekEmployees(local, cloud)`

```text
indexByMergeKey(local), indexByMergeKey(cloud)
allKeys = union kluczy
PER key:
  l AND c → mergeWeekEmployeeRecord(l, c)
  l only → l
  c only → c
→ collapseWeekEmployeesByIdentity
```

Zasady P0 wiążące:
- **#001** — tożsamość = `directoryId`
- **#009** — union; starszy snapshot chmury **nie** oznacza usunięcia lokalnej osoby
- **#010** — nowe rekordy wymagają `directoryId`; legacy name/id tylko historycznie

### 3.3 Rekord — `mergeWeekEmployeeRecord`

Per matched merge key: `days`, `prevSaturday`, `extraCosts`, `rate`, `settled`, `payrollCarryForward` — timestamps + richness (pełna implementacja klienta).

### 3.4 Bundle — `finalizePayrollBundleMerge` (B4, frozen)

```text
alignWeekRangeInMerged
→ sanitizeWeekEmployeesForTargetRange (używa mergeWeekEmployees)
→ week mismatch guard 20.1C.1
→ P11 richness override (mergeWeekEmployees([], cloudEmps))
```

Runtime-only: `applyRuntimePayrollAntiLeak` — **bez zmian B6**.

### 3.5 Push guards (klient, frozen)

| Mechanizm | Rola |
|-----------|------|
| `wouldBlockPayrollShrink` / `applyPayrollGuardBeforePush` | Blokada push przy −50% metryk |
| `replaceWeekEmployeesKeys` | Bypass Edge merge (admin roster push) |
| `CloudSyncMutationGuard` | Defer auto-sync podczas mutacji (B3) |

---

## 4. Current Edge merge semantics

Źródło: `supabase/functions/make-server-0afb8820/index.tsx`.

### 4.1 `batch-set` — `kw-week-employees`

```text
prev = kv.get("kw-week-employees")
next = incoming
IF prev != null:
  IF intentionalClear (pusty + archiwum w batch) → skip guards
  ELSE IF isSuspiciousPayrollShrink → mergeWeekEmployeesUnion(prev, next)   // UUID key
  ELSE IF hasWeekEmployeesRosterExpansion → mergeWeekEmployeesKeepPrevRoster  // DROP new UUIDs
IF forceReplaceWeekEmployees → skip all above
kv.set(next)
```

### 4.2 `mergeWeekEmployeesUnion` (as-is)

- Map key: **`String(emp.id)`** (UUID)
- Collision: `mergeWeekEmployeeRecordByTimestamps`
- Brak `weekEmployeeMergeKey`, brak `name:` fallback

### 4.3 `mergeWeekEmployeesKeepPrevRoster` (as-is)

- Iteruje **prev** UUID; aktualizuje tylko matching UUID z next
- **Nowe UUID w next są odrzucane**

### 4.4 `mergeWeekEmployeeRecordByTimestamps` (as-is)

- Parity **settled** (FIX A, 2026-06-03) z klientem
- **Brak:** `prevSaturday`, `extraCosts`, `payrollCarryForward` (poza scope MIN B6)

### 4.5 Inne ścieżki Edge

| Endpoint | Merge roster |
|----------|----------------|
| `restore-payroll-backup` | `mergeWeekEmployeesUnion` (UUID) |
| `batch-get` | Brak merge |

---

## 5. Required parity target

**Zasada freeze:** Edge **MUSI** implementować **tę samą semantykę union listy** co klient `mergeWeekEmployees`, dla wszystkich ścieżek Edge modyfikujących `kw-week-employees`.

### 5.1 Target — tożsamość (MUST)

| Element | Target |
|---------|--------|
| Klucz union | `weekEmployeeMergeKey` — identyczna kolejność: `dir:` → `name:` → `id:` |
| Ten sam człowiek, 2 UUID | **1 rekord** po merge |
| Nowy `directoryId` w next | **Zachowany** w wyniku KV |
| Legacy bez `directoryId` | `name:` / `id:` fallback jak klient |

### 5.2 Target — batch-set guards (MUST)

| Guard | Target behavior |
|-------|-----------------|
| `isSuspiciousPayrollShrink` | Nadal aktywny; akcja: **union po merge key** (nie UUID) |
| `hasWeekEmployeesRosterExpansion` | **FREEZE DECISION:** wykrywać nowe **`weekEmployeeMergeKey`**, nie surowe UUID; akcja: **`mergeWeekEmployeesUnion` (parity)** — **usunąć** `mergeWeekEmployeesKeepPrevRoster` dla roster expansion |
| `forceReplaceWeekEmployees` | **Bez zmian** — bypass jak dziś |
| `isIntentionalWeekClear` | **Bez zmian** |

**Uzasadnienie usunięcia KeepPrevRoster:** Przy union po `directoryId`, „stary telefon” z duplikatem tej samej osoby scala się do jednego klucza; nowa osoba z nowym `directoryId` to **legalny add** (P0 #009), nie stale expansion do odrzucenia.

### 5.3 Target — rekord-level (SHOULD / poza MIN)

| Pole | B6 MIN | B6.2 (opcjonalny follow-up) |
|------|--------|-------------------------------|
| `settled` | Już parity (FIX A) | — |
| `days`, `rate` | Zachować obecne Edge behavior przy union | Pełna parity `pickDaysByRichness` |
| `prevSaturday`, `extraCosts`, `carry` | **Bez zmiany w B6 MIN** | Port z klienta |

### 5.4 SSOT implementacji merge key (FREEZE DECISION)

| Opcja | Decyzja freeze |
|-------|----------------|
| **A (MIN)** | Nowy plik `src/lib/payroll-week-employee-merge.ts` — pure functions: `weekEmployeeMergeKey`, `mergeWeekEmployeesList` (kernel union). Klient: `cloud-sync.ts` **importuje** (bez zmiany zachowania). Edge: **import tego samego pliku** jeśli Deno deploy to wspiera; inaczej **mirror 1:1** w `index.tsx` + test parity wymusza zgodność |
| **B (odrzucona)** | Tylko kopia w Edge bez shared — wyższy drift; dozwolona tylko jeśli import Deno zablokowany, **z obowiązkowym** testem mirror |

**Klient `mergeWeekEmployeeRecord`:** pozostaje w `cloud-sync.ts`; Edge przy union wywołuje `mergeWeekEmployeeRecordByTimestamps` (MIN) — bez pełnego portu rekordu.

---

## 6. Scope

### 6.1 Bundle B6 — zakres IMPLEMENT (plan)

| ID | Element | Opis |
|----|---------|------|
| **B6-1** | Edge union po `weekEmployeeMergeKey` | Zastąpić UUID map w `mergeWeekEmployeesUnion` |
| **B6-2** | Expansion guard fix | `hasWeekEmployeesRosterExpansion` po merge key; akcja = union parity; **usunąć** `mergeWeekEmployeesKeepPrevRoster` z ścieżki expansion |
| **B6-3** | `restore-payroll-backup` | Ten sam union co batch-set shrink |
| **B6-4** | Shared merge kernel (opcja A) | `src/lib/payroll-week-employee-merge.ts` + wire client import (refactor bez zmiany zachowania) |
| **B6-5** | Test `scripts/test-payroll-edge-parity-b6.mjs` | **NOWY** — E1, E2, E7 + mirror handler |
| **B6-6** | Docs release | `changelog-data.ts`, `CHANGELOG.md`, `docs/ARCHITECTURE.md` §11.2 (jedna linia) |

### 6.2 Pliki objęte IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `supabase/functions/make-server-0afb8820/index.tsx` | **PRIMARY** — Edge merge parity |
| `src/lib/payroll-week-employee-merge.ts` | **NOWY** (jeśli opcja A) — shared kernel |
| `src/lib/cloud-sync.ts` | **MINOR** — import shared kernel; **semantyka `mergeWeekEmployees` bez zmian** |
| `scripts/test-payroll-edge-parity-b6.mjs` | **NOWY** |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | po IMPLEMENT |
| `docs/ARCHITECTURE.md` §11.2 | jedna linia — B6 Edge directoryId parity |

### 6.3 Zachowania zachowane (explicit)

| Warstwa | Plik | Status |
|---------|------|--------|
| B3 Guard | `cloud-sync-mutation-guard.ts` | **Bez zmian** |
| B4 finalize | `finalizePayrollBundleMerge`, `applyBootstrapPayrollMerge`, anti-leak | **Bez zmian** |
| B5 UI | `PayrollView`, `payroll-display.ts` | **Bez zmian** |
| payroll-cycle | `payroll-cycle.ts` | **Bez zmian** |
| rollover | `payroll-rollover.ts`, `App.tsx` rollover orchestration | **Bez zmian** |
| Klient push guards | `wouldBlockPayrollShrink`, `replaceWeekEmployeesKeys` | **Bez zmian** |
| `batch-get` | Odczyt bez merge | **Bez zmian** |

---

## 7. Out of scope

| Element | Powód wyłączenia |
|---------|------------------|
| Pełna parity `mergeWeekEmployeeRecord` na Edge (prevSat, extraCosts, carry) | B6.2 / osobny follow-up |
| Zmiana `finalizePayrollBundleMerge` / P11 / anti-leak | B4 CLOSED |
| `CloudSyncMutationGuard` API / timing | B3 CLOSED |
| B5 closed week UI | B5 CLOSED |
| Per-week `kw-week-employees` w KV | Nowy model danych |
| Zmiana `payroll-cycle` / `isPayrollWeekClosedForUi` | 20.1B/20.1D CLOSED |
| `App.tsx` rollover / `autoArchiveAndAdvance` | Poza RCA Edge |
| `pushKeysToCloudSafe` zawsze `replaceWeekEmployeesKeys` | Obchodzi symptom (B6-O3 odrzucone) |
| Egress / partial bundle / `DATA_KEYS` split | ARCHITECTURE §11.4 — osobny epic |
| `TEST-INFRA-001` Playwright | Osobny epic |
| Nowe Principles **#014+** | Zakaz |
| Zmiana `mergeArchive` / `mergeJobs` na Edge | Poza `kw-week-employees` |
| Worker / Inspector UI changes | Nie wymagane jeśli Edge parity naprawione |

---

## 8. SSOT principles

### 8.1 Istniejące Principles (wiążące — bez nowych)

Obowiązują **#001–#013** z P0 roster + guard. B6 **realizuje** #001 i #009 na warstwie Edge — **nie wprowadza** nowych numerów.

| # | Zastosowanie w B6 |
|---|-------------------|
| **#001** | Edge union po `directoryId` |
| **#009** | Edge nie odrzuca lokalnego add przy starszym KV |
| **#010** | Edge `name:` / `id:` fallback jak klient dla legacy |

### 8.2 SSOT warstw po B6

| Warstwa | SSOT po B6 |
|---------|------------|
| **Merge key (biznes)** | `weekEmployeeMergeKey` — **shared** klient + Edge |
| **Union listy rosteru** | `mergeWeekEmployees` (klient) ≡ Edge union kernel |
| **Merge rekordu (klient)** | `mergeWeekEmployeeRecord` — `cloud-sync.ts` |
| **Merge rekordu (Edge MIN)** | `mergeWeekEmployeeRecordByTimestamps` — settled parity; reszta frozen |
| **Bundle payroll (klient)** | `finalizePayrollBundleMerge` — B4, bez zmian |
| **Push timing** | `CloudSyncMutationGuard` — B3, bez zmian |
| **Wyświetlanie LP** | `displayEmployees` — B5, bez zmian |

### 8.3 Zakazy duplikacji

- **Zakaz** trzeciej semantyki merge (np. osobny UUID union na Edge po B6)
- **Zakaz** zmiany klienta `mergeWeekEmployees` behavior bez aktualizacji Edge i testu B6
- **Zakaz** „fix” wyłącznie przez `replaceWeekEmployeesKeys` w `pushKeysToCloudSafe`

---

## 9. Acceptance Criteria

| ID | Kryterium | Weryfikacja |
|----|-----------|-------------|
| **B6-AC1** | Ten sam `directoryId`, różne UUID → **1 rekord** po Edge union | test C1 |
| **B6-AC2** | Nowy `directoryId` w next (worker path) → **obecny** w wyniku Edge merge; **nie** KeepPrevRoster drop | test C2 |
| **B6-AC3** | `hasWeekEmployeesRosterExpansion` używa **merge key**, nie UUID | code review + test C3 |
| **B6-AC4** | `restore-payroll-backup` — union po merge key | test C4 |
| **B6-AC5** | Klient `mergeWeekEmployees` — **bez regresji** semantyki | `test-payroll-add-from-directory-merge-p0.mjs` |
| **B6-AC6** | B4 finalize — bez regresji | `test-payroll-bootstrap-runtime-parity-b4.mjs` |
| **B6-AC7** | B3 Guard — bez regresji | `test-payroll-roster-guard-phase2.mjs` |
| **B6-AC8** | B5 closed week UI — bez regresji | `test-payroll-closed-week-ui-rca2.mjs` |
| **B6-AC9** | 20.1B carry — bez regresji | `smoke-test-payroll-carry-forward-20.1b.mjs` + `pre-commit-verify-20.1b.mjs` |
| **B6-AC10** | `test-payroll-edge-parity-b6.mjs` — **PASS** | automatyczny |
| **B6-AC11** | `npm run build` PASS | BUILD gate |
| **B6-AC12** | Edge deploy + prod verify (health / smoke batch-set) | manual + opcjonalny script |
| **B6-AC13** | Brak nowych KV / Principles | code review |

---

## 10. Files affected

### 10.1 IMPLEMENT (kod)

| Plik | Typ zmiany |
|------|------------|
| `supabase/functions/make-server-0afb8820/index.tsx` | **PRIMARY** |
| `src/lib/payroll-week-employee-merge.ts` | **NEW** (shared kernel — opcja A) |
| `src/lib/cloud-sync.ts` | **MINOR** — import shared; behavior unchanged |
| `scripts/test-payroll-edge-parity-b6.mjs` | **NEW** |

### 10.2 Release docs (po IMPLEMENT)

| Plik |
|------|
| `src/app/changelog-data.ts` |
| `CHANGELOG.md` |
| `docs/ARCHITECTURE.md` §11.2 |
| `docs/PAYROLL-CLOUD-RECOVERY-B6-DESIGN-FREEZE.md` (status → APPROVED) |
| `docs/PAYROLL-CLOUD-RECOVERY-B6-CLOSEOUT.md` (po VERIFY) |

### 10.3 Read-only reference (bez zmian B6)

| Plik |
|------|
| `src/lib/cloud-sync-mutation-guard.ts` |
| `src/lib/payroll-cycle.ts` |
| `src/lib/payroll-rollover.ts` |
| `src/app/PayrollView.tsx` |
| `src/app/WorkerPhotoView.tsx` (konsument — fix przez Edge) |
| `src/app/App.tsx` |

---

## 11. Test plan

### 11.1 Nowy — `scripts/test-payroll-edge-parity-b6.mjs`

**Uruchomienie:** `npx vite-node scripts/test-payroll-edge-parity-b6.mjs`

**Strategia:** Eksport lub mirror funkcji Edge merge (po IMPLEMENT) + import `weekEmployeeMergeKey` / union kernel ze shared module. Test **nie** mockuje `batch-set` jako direct KV write.

| ID | Scenariusz | Wejście | Oczekiwane |
|----|------------|--------|------------|
| **C1** | Ten sam `directoryId`, różne UUID | prev: `[{id:a, dir:X}]`, next: `[{id:b, dir:X}]` | **1** rekord; merge key `dir:X` |
| **C2** | Worker add (expansion path) | prev: N osób, next: N+1 z nowym `dir:Y` | Wynik **N+1**; `dir:Y` obecny |
| **C3** | Expansion detection | next ma nowy merge key, nie nowy UUID przy tym samym dir | Brak ścieżki KeepPrevRoster |
| **C4** | Restore backup union | prev current + backup z tym samym dir, różne UUID | 1 rekord per dir |
| **C5** | Legacy bez `directoryId` | name match | 1 rekord po `name:` key |
| **C6** | Shrink richness | prev bogaty, next ubogi | Union po merge key (nie pusty niespodziewany drop osób z dir tylko w prev) |

### 11.2 Gate regresji (obowiązkowe przed release)

```bash
# B6 — nowy
npx vite-node scripts/test-payroll-edge-parity-b6.mjs

# P0 roster (klient)
npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
npx vite-node scripts/test-payroll-week-employee-merge-asymmetry.mjs

# Settled parity (istniejący)
npx vite-node scripts/test-payroll-settled-merge-fix-a.mjs

# B3 Guard
npx vite-node scripts/test-payroll-roster-guard-phase2.mjs

# B4 bootstrap/runtime
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs

# B5 closed week UI
npx vite-node scripts/test-payroll-closed-week-ui-rca2.mjs

# 20.1B carry
npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs
npx vite-node scripts/pre-commit-verify-20.1b.mjs

# BUILD
npm run build
```

### 11.3 Smoke manualny (po Edge deploy)

| ID | Kroki | Oczekiwane |
|----|-------|------------|
| **S1** | Worker: dodaj osobę do tygodnia → sync | Osoba w KV po odświeżeniu admina |
| **S2** | Admin: dodaj z Kadr → inna karta admin pull | Oba urządzenia widzą tę samą osobę (jeden `directoryId`) |
| **S3** | Admin `runCloudSync` | Bez regresji; guard defer nadal działa |
| **S4** | Rollover + nowy tydzień | Bez regresji 20.1C anti-leak |

---

## 12. Release plan

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.23** (patch) — rekomendacja freeze |
| **Typ** | BUGFIX sync / data integrity |
| **Deploy 1 (wymagany)** | **Supabase Edge** — `supabase functions deploy make-server-0afb8820` (lub projektowy odpowiednik) |
| **Deploy 2 (warunkowy)** | **Vercel** — tylko jeśli IMPLEMENT dotyka `src/lib/` (shared module import w kliencie) |
| **KV migration** | **Brak** |
| **Frontend impact** | **Minimalny** — changelog + ewent. shared module import; **brak** zmian UI LP |

### 12.1 Kolejność release

```text
Akceptacja DESIGN FREEZE (ten dokument)
  → IMPLEMENT B6
  → testy §11.2 PASS
  → npm run build PASS
  → commit na polecenie właściciela
  → DEPLOY EDGE (pierwszy, krytyczny)
  → DEPLOY VERCEL (jeśli zmiany w src/)
  → VERIFY: health + opcjonalnie smoke batch-set / version.json
  → CLOSEOUT doc
```

### 12.2 Werdykty release

| Werdykt | Znaczenie |
|---------|-----------|
| **RELEASE GO** | Testy + build PASS; Edge deploy OK |
| **PRODUCTION VERIFIED** | Edge live + smoke S1/S2 PASS |

**Uwaga:** Sam `version.json` na Vercel **nie** potwierdza Edge parity — wymagana weryfikacja deploy Edge.

---

## 13. Rollback plan

| Krok | Akcja |
|------|-------|
| **1** | Redeploy poprzedniej wersji Edge function (`index.tsx` sprzed B6) z historii deploy Supabase / git tag `v2.63.22` |
| **2** | Jeśli Vercel deploy był: revert commit B6 frontend → redeploy Vercel **2.63.22** |
| **3** | KV **nie wymaga** migracji — dane w `kv-week-employees` pozostają; po rollback Edge znowu UUID semantics (znany stan) |
| **4** | Klient pull `mergeWeekEmployees` nadal naprawia lokalny widok po F5/sync — jak przed B6 |
| **5** | Komunikat: rollback do **2.63.22** baseline `187afb8` |

**Ryzyko rollback:** Osoby dodane wyłącznie przez fixed Edge path mogą wymagać admin `runCloudSync` po rollback — akceptowalne.

---

## GO / NO GO

| Etap | Status |
|------|--------|
| **AUDIT B6** | **COMPLETE** |
| **DESIGN FREEZE** | **DRAFT** — oczekuje akceptacji właściciela repo |
| **IMPLEMENT** | **NO GO** |

---

*SSOT freeze B6: ten plik · bez implementacji do DESIGN FREEZE GO.*
