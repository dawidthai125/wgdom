# JOBS-ADDRESS-SYNC-01 — Address / flatNumber field-level merge · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0** — **IMPLEMENT BLOCKED** (czeka na ARCH REVIEW + Owner GO)  
> **Data freeze:** 2026-07-12  
> **Bundle ID:** JOBS-ADDRESS-SYNC-01  
> **Class:** **CORE-adjacent** (wąski patch `mergeJobsById` + lib jobs + test harness)  
> **Baseline prod:** UI **2.65.5** · commit **`9307386`** · **STABILIZATION WINDOW ACTIVE**  
> **Audyt:** **ACCEPTED** (sesja 2026-07-12 — AUDIT ONLY, RCA udowodnione symulacją lib)  
> **Powiązane:** [`PAYROLL-RACE-01-DESIGN-FREEZE.md`](../PAYROLL-RACE-01-DESIGN-FREEZE.md) · [`architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md`](ROBOTS-INSPECTOR-01-CLOSEOUT.md) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`architecture/CORE-01A-CHANGE-CHECKLIST.md`](CORE-01A-CHANGE-CHECKLIST.md)

```text
CEL:     Adres (address) i numer mieszkania (flatNumber) nie mogą znikać z formularza
         nowej roboty po auto-sync (~2 s) ani po pull/merge chmury.

ZASADA:  Field-level merge — non-empty wins over empty dla pól identyfikacyjnych roboty.
         Reuse wzorzec semantyczny jak assignedInspectorId, ALE osobny helper jobs-only.
         Minimalny blast radius — jeden punkt w mergePair, zero Edge/PWRB/reconcile rewrite.
         One Bundle = One Goal — tylko JOBS-ADDRESS-SYNC-01.

ZAKAZ:   Zmiana Edge · PWRB · finalizePayrollBundleMerge · payroll roster semantics.
         Rozszerzanie na inne pola Job (client, notes, invoice*) w tym bundle.
         Osobny reconcile path zamiast fixu w mergePair (duplikacja logiki).
         Mixed bundle z LP / payroll / FEATURE UI poza allowlistą §9.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Problem** | Roboty → Nowa robota → wpisany `address` + `flatNumber` znikają po ~1–3 s (auto-sync debounce 2000 ms) |
| **Root cause PRIMARY** | `mergeJobsById` / `mergePair` — LWW po `updatedAt` nadpisuje skalary z rekordu-chmury **pustego**, gdy `updatedAt` chmury > lokalnego |
| **Root cause SECONDARY** | `reconcileJobsWithFreshLocal` używa tego samego LWW — nie ratuje pól gdy `merged.updatedAt > fresh.updatedAt` |
| **Root cause TERTIARY (UX)** | `onChange` w `JobsView` spreaduje `selectedJob` (stale closure) — amplifikuje objaw po apply |
| **Pole danych** | `address`, `flatNumber` (UI: „adres”, „nr mieszkania”) — **nie** `apartmentNumber` |
| **Ścieżka create** | `addJob()` → `defaultJob()` (`JobsView.tsx`) — brak `createJob()` w admin path |
| **Nowe pole KV** | **Brak** |
| **Zmiana Edge** | **Brak** |
| **Zmiana PWRB / LP merge** | **Brak** |
| **Zmiana reconcile chain** | **Brak** (ROBOTS-INSPECTOR `finalBundle` parity bez zmian) |
| **Zmiana `mergeJobsById`** | **Tak — wąska** (tylko merge `address` + `flatNumber` w `mergePair`) |
| **Gate release** | JA-T01…JA-T06 PASS + regresja RI + PR + `npm run build` |

**DESIGN FREEZE v1.0 — FROZEN · ARCH REVIEW PENDING · Owner GO PENDING · IMPLEMENT BLOCKED**

---

## 1. Opis problemu — LWW dla `address` / `flatNumber`

### 1.1 Objaw produkcyjny

| Krok użytkownika | Oczekiwane | Obserwowane |
|------------------|------------|-------------|
| Roboty → **Nowa robota** | Pusta robota, formularz edycji | OK |
| Wpisanie **adresu** i **nr mieszkania** | Pola pozostają wypełnione | OK przez chwilę |
| Oczekiwanie ~1–3 s (auto-sync) | Dane zostają | **Pola czyszczą się** (pusty string w UI) |
| Zapis / dalsza edycja | Adres zachowany | Często pusty adres w stanie React + LS |

Timing koreluje z `AUTO_SYNC_DEBOUNCE_MS = 2000` (`cloud-sync-throttle.ts`) + czas `fetchKeysFromCloud`.

### 1.2 Przepływ techniczny (SSOT)

```text
addJob() / updateJob()
  → setJobs() [useLocalStorage + applyWriteTimestamps dla kw-jobs]
  → localStorage kw-jobs
  → useEffect [jobs] → scheduleAutoCloudSync (debounce 2 s)
  → runCloudSync() / pullFromCloudAndMerge()
       → pullAndMergeDataBundle(adminDataBundle())
            → prepareDataBundleForCloudPush (LS ⊕ React)
            → mergeAllDataKeys → mergeJobsById(local, cloud)   ← utrata pól
       → reconcileAdminBundleWithFreshLocal()
            → reconcileJobsWithFreshLocal (ten sam LWW)        ← nie naprawia
       → applyAdminDataBundle() → setJobs(normalizeJobsList)  ← UI „znika”
       → pushMergedDataBundleToCloud(finalBundle)
```

### 1.3 Dlaczego LWW gubi skalary

W `mergeJobsById` → `mergePair` (`cloud-sync.ts`):

1. Wybierany jest **newer** rekord po `jobUpdatedTs()` (`updatedAt` → `activityLog` → `startDate`).
2. Skalary (`address`, `flatNumber`, `client`, …) pochodzą z **`pick = { ...older, ...newer }`** — cały wiersz identyfikacyjny z wygrywającej strony.
3. **Brak** dedykowanego merge dla `address` / `flatNumber` (w przeciwieństwie do `assignedInspectorId` → `mergeAssignedInspectorId` z regułą non-empty wins).

### 1.4 Scenariusz RC (udowodniony symulacją)

```text
Lokal (po edycji użytkownika):
  address: "ul. Test", flatNumber: "5", updatedAt: T5 (10:00:05)

Chmura (wcześniejszy push pustej nowej roboty):
  address: "", flatNumber: "", updatedAt: T8 (10:00:08)  — mergePair / latestTs przy push

mergeAllDataKeys:
  T8 > T5 → chmura wygrywa LWW → address="" , flatNumber=""

reconcileJobsWithFreshLocal(fresh T5, merged T8):
  ponownie T8 > T5 → reconcile NIE przywraca pól
```

**Wniosek:** Sam reconcile (wzorce PAYROLL-RACE-01 / ROBOTS-INSPECTOR-01) **nie wystarcza** dla pól skalarnych identyfikacyjnych — wymagany **field-level merge** w `mergePair`.

### 1.5 Co NIE jest root cause

| Hipoteza | Werdykt |
|----------|---------|
| `useEffect` w `JobsView` czyści adres | **ODRZUCONE** — żaden efekt nie mutuje `address`/`flatNumber` |
| `isValidJobRecord` usuwa robotę z listy | **ODRZUCONE** — job z `client: "Wrocławskie Mieszkania"` zostaje; giną tylko pola |
| `normalizeJob` stripuje pola | **ODRZUCONE** — `address ?? ""`, bez czyszczenia |
| Brak `reconcileJobsWithFreshLocal` | **ODRZUCONE** — już jest (ROBOTS-INSPECTOR-01); niewystarczający dla LWW |

---

## 2. Architektura rozwiązania — field-level merge

### 2.1 Kierunek (PRIMARY)

Rozszerzyć **`mergePair`** w `mergeJobsById` o jawny merge pól identyfikacyjnych adresu **przed** finalnym `updatedAt`, używając **nowego helpera domenowego jobs-only** (§3).

```text
mergePair(prev, j):
  … istniejąca logika LWW (updatedAt, jobMergeScore) …
  pick = { ...older, ...newer }

  address:    mergeJobAddressFields(prev.address, j.address, preferNewerTs)
  flatNumber: mergeJobAddressFields(prev.flatNumber, j.flatNumber, preferNewerTs)

  … jobFiles, workEntries, assignedInspectorId (bez zmian) …
  updatedAt: newer.updatedAt ?? older.updatedAt ?? latestTs
```

### 2.2 Semantyka `mergeJobAddressFields` (normatywna)

| Reguła | Opis |
|--------|------|
| **R-ADDR-1** | Jeśli **dokładnie jedna** strona ma wartość niepustą (po `trim`) → zwróć **niepustą** |
| **R-ADDR-2** | Jeśli **obie** niepuste i **różne** → zwróć wartość ze strony **preferNewerTs** (`jTs >= prevTs` → prefer `j`, inaczej `prev`) |
| **R-ADDR-3** | Jeśli **obie** puste → `""` |
| **R-ADDR-4** | Jeśli **obie** niepuste i **identyczne** (po `trim`) → ta wartość |
| **R-ADDR-5** | Normalizacja: `trim()`; `null`/`undefined` → `""` |

**Intencja:** Pusty snapshot chmury z wyższym `updatedAt` **nie może** skasować świeżo wpisanego adresu / lokalu.

**Analogia:** Semantycznie jak `mergeAssignedInspectorId`, ale **osobny moduł** — bez importu z `inspector-job-assignment.ts` (§3).

### 2.2a Co pozostaje pod LWW (bez zmian w tym bundle)

| Pole / kolekcja | Merge |
|-----------------|-------|
| `workEntries`, `photos`, `jobFiles`, `jobNotes`, … | Istniejące funkcje merge — **bez zmian** |
| `assignedInspectorId` | `mergeAssignedInspectorId` — **bez zmian** |
| `client`, `notes`, `invoice*`, `status`, daty | LWW via `pick` — **poza scope** |
| `updatedAt` job | Nadal z LWW / `latestTs` — **bez zmian** |

### 2.3 Dlaczego fix w `mergePair`, a nie tylko w reconcile

| Opcja | Ocena |
|-------|-------|
| **A — `mergePair` (WYBRANE)** | Jedna ścieżka SSOT: sync, bootstrap `CloudLoader`, import backup, restore — wszystkie używają `mergeJobsById` |
| B — tylko `reconcileJobsWithFreshLocal` | Nie chroni import/restore/merge bez reconcile |
| C — suppress sync po `addJob` | Mitigacja UX, nie naprawa merge; multi-device nadal zepsute |

### 2.4 Niemutowalność ścieżki sync (ROBOTS-INSPECTOR parity)

**Bez zmian** względem prod `9307386`:

```text
finalReconciledBundle = reconcileAdminBundleWithFreshLocal(merged)
applyAdminDataBundle(finalBundle)
pushMergedDataBundleToCloud(finalBundle)
fingerprint = rsBundleFingerprintFromMerged(finalBundle)
```

Field-level merge działa **wewnątrz** `mergeJobsById`, więc `finalBundle` automatycznie niesie poprawne pola — **brak** nowej asymetrii apply vs push.

### 2.5 Opcjonalny UX hardening (SECONDARY — tylko jeśli ARCH zaakceptuje w tym samym bundle)

| Element | Opis | Priorytet |
|---------|------|-----------|
| **UX-1** | `onChange` adresu/lokalu: functional update `setJobs(prev => …)` zamiast `{...selectedJob}` | P1 opcjonalny |
| **UX-2** | `suppressAutoSyncUntilRef` +4500 ms po `addJob()` | **Poza scope v1.0** — tylko backlog |

**Freeze v1.0 PRIMARY:** wyłącznie field-level merge + testy. UX-1 **dopuszczalny** w tym samym commicie jeśli ≤10 linii i #CORE-014 PASS.

---

## 3. Nowy helper domenowy (jobs-only, bez współdzielenia między domenami)

### 3.1 Lokalizacja

| Plik | Rola |
|------|------|
| **`src/lib/job-address-fields.ts`** | **NOWY** — pure functions, zero React, zero sync |

### 3.2 API freeze

```typescript
/** Normalizacja pojedynczego pola tekstowego adresu/lokalu. */
export function normalizeJobAddressField(value: unknown): string;

/**
 * Field-level merge dla address | flatNumber.
 * @param preferB — true = preferuj wartość z b przy konflikcie obu niepustych.
 */
export function mergeJobAddressField(
  a: unknown,
  b: unknown,
  preferB: boolean,
): string;

/** Merge pary pól na rekordzie job (opcjonalny wrapper dla czytelności mergePair). */
export function mergeJobAddressScalarPair(
  prev: { address?: unknown; flatNumber?: unknown },
  next: { address?: unknown; flatNumber?: unknown },
  preferNext: boolean,
): { address: string; flatNumber: string };
```

### 3.3 Granice modułu (wiążące)

| Dozwolone | Zabronione |
|-----------|------------|
| Pure string logic, trim, preferB | Import z `inspector-job-assignment.ts` |
| Import w `cloud-sync.ts` `mergePair` | Import w `App.tsx`, `JobsView.tsx` (poza ewent. testami) |
| Unit test bez DOM | Współdzielenie z EM / WM / Inspector / Payroll |
| Eksport do `scripts/test-jobs-address-sync-race.mjs` | Logika merge `workEntries` |

### 3.4 Zależności importu

```text
job-address-fields.ts  ← cloud-sync.ts (mergePair only)
                       ← scripts/test-jobs-address-sync-race.mjs
```

**ARCH-001:** `job-address-fields.ts` **nie importuje** `cloud-sync.ts` (brak cykli — zgodnie z ARCH-001 dla lib).

---

## 4. Minimalny blast radius

### 4.1 Zakres IN

| Warstwa | Zmiana |
|---------|--------|
| **Lib jobs** | Nowy `job-address-fields.ts` (~40–60 LOC) |
| **Cloud sync** | `mergePair` w `mergeJobsById` — **2 wywołania** helpera + spread w return (~8–15 LOC net) |
| **Test** | `scripts/test-jobs-address-sync-race.mjs` (JA-T01…T06) |
| **Manifest** | `test-infra/test-manifest.json` — wpis `LIB-JOBS-ADDRESS-SYNC-01` |
| **Docs** | CHANGELOG po IMPLEMENT (nie w tym DF commit) |

### 4.2 Zakres OUT (twardy zakaz w bundle)

| Obszar | Powód |
|--------|-------|
| `reconcileJobsWithFreshLocal` / `reconcileAdminBundleWithFreshLocal` | Fix w merge SSOT — brak duplikacji |
| `App.tsx` `runCloudSync` / `applyAdminDataBundle` | Zachowanie bez zmian |
| Edge `index.tsx` | Brak deploy backend |
| `finalizePayrollBundleMerge`, PWRB, payroll-week-* | #CORE-013 |
| `mergeWorkEntriesById`, `mergeAssignedInspectorId` | Osobne domeny |
| `isValidJobRecord` / walidacja formularza | Osobny ticket |
| `create-job-from-tender.ts` | Ten sam merge jeśli przez `mergeJobsById` — **bez** osobnych zmian |

### 4.3 #CORE-013 / #CORE-014

| Gate | Werdykt oczekiwany |
|------|-------------------|
| **#CORE-013** | **PASS** — jeden bundle CORE-adjacent; zero plików payroll/LP |
| **#CORE-014** | Allowlista §9 — **żadnych** plików spoza listy |

### 4.4 Szacunek diff

| Metryka | Wartość |
|---------|---------|
| Pliki produkcyjne | **2** (`job-address-fields.ts`, `cloud-sync.ts`) |
| Pliki test + manifest | **2** |
| Opcjonalny UX (`JobsView.tsx`) | **+1** |
| **Łącznie** | **4–5 plików** → FAST RELEASE eligible po IMPLEMENT |

---

## 5. Definition of Done

DoD obowiązuje **dopiero po Owner GO + IMPLEMENT** — poniżej jako kontrakt release.

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| **D1** | `mergeJobAddressField` zaimplementowany zgodnie z R-ADDR-1…5 | Code review + JA-T01…T04 |
| **D2** | `mergePair` używa helpera dla `address` i `flatNumber` | Grep + JA-T02 |
| **D3** | **JA-T01…T06** — **6/6 PASS** | `npx vite-node scripts/test-jobs-address-sync-race.mjs` |
| **D4** | Regresja **ROBOTS-INSPECTOR-01** — RI-T01…T05 PASS | `test-robots-inspector-01-sync-race.mjs` |
| **D5** | Regresja **PAYROLL-RACE-01** — T-RACE-01…09 PASS | `test-payroll-race-apply-reconcile.mjs` |
| **D6** | Regresja **PAYROLL-ARCHIVE-01** (jeśli dotyczy kw-jobs w bundle) | harness PR |
| **D7** | `npm run build` PASS | CI lokalny |
| **D8** | Gate payroll **16/16** bez regresji | `npm run test:infra -- --scope payroll` |
| **D9** | CHANGELOG + wersja patch (+0.1) | `changelog-data.ts` |
| **D10** | Owner smoke: Nowa robota → adres + lokal → **12 s** auto-sync → pola **zostają** | QA manual prod/preview |
| **D11** | `docs/architecture/JOBS-ADDRESS-SYNC-01-RELEASE-VERIFICATION.md` wypełniony | Po deploy |
| **D12** | Protected Core checklist — **GREEN** | §8 |

**IMPLEMENT COMPLETE** = D1–D10 PASS przed push.

---

## 6. Acceptance Criteria — JA-T01…JA-T06

Plik testowy: **`scripts/test-jobs-address-sync-race.mjs`**  
Manifest: **`LIB-JOBS-ADDRESS-SYNC-01`** · tier **A** (gate merge lib)

### JA-T01 — non-empty wins over empty (cloud newer timestamp)

**Given:** `mergeJobsById(local, cloud)`  
- local: `{ id, address: "ul. Test", flatNumber: "5", updatedAt: T5 }`  
- cloud: `{ id, address: "", flatNumber: "", updatedAt: T8 }` gdzie **T8 > T5**

**When:** `mergePair` przez `mergeJobsById`

**Then:** wynik ma `address === "ul. Test"`, `flatNumber === "5"`

### JA-T02 — `mergeAllDataKeys` path (prepare + cloud)

**Given:** `valuesForMerge` z LS (adres T5) vs `cloudValues` (pusty T8, T8 > T5) — symulacja RCA audytu

**When:** `mergeDataKey("kw-jobs", valuesForMerge, cloud)`

**Then:** scalony job zachowuje `address` i `flatNumber` z lokalnej strony

### JA-T03 — `reconcileJobsWithFreshLocal` po złym merged

**Given:** `staleMerged` bundle z pustym adresem (T8) + `freshLocal` z adresem (T5), T8 > T5

**When:** `reconcileJobsWithFreshLocal(staleMerged, freshLocal)`

**Then:** `finalBundle[kw-jobs]` zachowuje niepusty `address` / `flatNumber`  
*(dzięki fixowi w mergeJobsById wewnątrz reconcile)*

### JA-T04 — konflikt obu niepustych — prefer newer timestamp

**Given:**  
- prev: `{ address: "Stary adres 1", updatedAt: T_old }`  
- j: `{ address: "Nowy adres 2", updatedAt: T_new }`, **T_new > T_old**

**When:** merge

**Then:** `address === "Nowy adres 2"`

**And:** odwrotna kolejność timestampów → wygrywa starszy rekord zgodnie z `preferB`

### JA-T05 — regresja `assignedInspectorId` (ROBOTS-INSPECTOR)

**Given:** scenariusz RI-T01 (inspector local fresh vs cloud stale)

**When:** `mergeJobsById` + `reconcileJobsWithFreshLocal`

**Then:** `assignedInspectorId` **bez regresji** — RI-T01…T05 nadal PASS

### JA-T06 — full chain `finalBundle` parity (apply = push)

**Given:** react stale empty, cloud empty T8, fresh LS z adresem T5 (T5 < T8)

**When:**  
1. `staleMerged = mergeJobsById(react, cloud)`  
2. `finalBundle = reconcileAdminBundleWithFreshLocal(staleMerged, { jobs: freshLS })`  
3. `fp = rsBundleFingerprintFromMerged(finalBundle)`

**Then:**  
- `jobsFromBundle(finalBundle)` ma niepusty `address`  
- fingerprint stabilny przy ponownym wywołaniu na tym samym `finalBundle`  
- **brak** asymetrii: ten sam `finalBundle` nadaje się do apply i push (wzorzec RI-T03/T04)

---

## 7. Rollback

### 7.1 Strategia

| Poziom | Akcja |
|--------|-------|
| **L1 — git revert** | Pojedynczy commit bundle JOBS-ADDRESS-SYNC-01 → `git revert <sha>` → push `main` |
| **L2 — verify** | `curl -s https://www.wgdom.fun/version.json` — wersja poprzednia |
| **L3 — smoke** | RI-T01 PASS na revertowanym HEAD (inspector niezależny) |

### 7.2 Warunki rollbacku

- JA-T05 FAIL (regresja inspector) na prod  
- Owner zgłasza nową utratę `workEntries` / innych pól job  
- Gate payroll **FAIL** po deploy

### 7.3 Dane

**Brak migracji KV.** Rollback kodu wystarczy — następny sync rozpropaguje merge ze starą logiką LWW.  
**Ryzyko:** roboty z adresem naprawionym przez nowy merge pozostają w chmurze — **akceptowalne** (nie gorzej niż stan po udanym fix).

---

## 8. Protected Core impact

### 8.1 Klasyfikacja

| Pole | Wartość |
|------|---------|
| **Dotknięty moduł** | `cloud-sync.ts` → `mergeJobsById` / `mergePair` |
| **Klasa CORE-01A** | **CORE** (Cloud Sync kernel) — zmiana **wąska**, uzasadniona AUDIT + DF |
| **Wymaga Owner GO** | **TAK** — STABILIZATION WINDOW + Protected Core |

### 8.2 Macierz wpływu

| Moduł Protected Core | Wpływ |
|----------------------|-------|
| **Payroll / LP** | **NONE** — zero plików payroll |
| **PWRB** | **NONE** |
| **CloudLoader bootstrap** | **READ-ONLY** korzyść — ten sam `mergeJobsById` |
| **Edge batch-get/set** | **NONE** |
| **`finalizePayrollBundleMerge`** | **NONE** |
| **`mergeWeekEmployees`** | **NONE** |
| **`reconcileAdminBundleWithFreshLocal`** | **NONE** (kod bez zmian) |
| **`mergeJobsById`** | **LOW** — 2 pola, helper pure |
| **`App.tsx` CORE** | **NONE** (v1.0) |

### 8.3 Werdykt oczekiwany

| Gate | Przed IMPLEMENT | Po IMPLEMENT |
|------|-----------------|--------------|
| Protected Core | **GREEN** | **GREEN** (przy JA-T05 + payroll gate PASS) |
| #CORE-013 mixed bundle | — | **PASS** |
| #CORE-014 boundary | — | **PASS** (allowlista §9) |

### 8.4 Konflikt historyczny z PAYROLL-RACE-01 Principle

PAYROLL-RACE-01 freeze mówił „Zakaz zmiany `mergeJobsById`” w kontekście **reconcile-only** fix.  
**JOBS-ADDRESS-SYNC-01** jest **nowym, zatwierdzonym AUDIT** programem z **węższym** field-level patch — nie zmienia `workEntries`, payroll, ani LWW globalnego `updatedAt`.

**ARCH musi potwierdzić:** wyjątek od PAYROLL-RACE zakazu jest **świadomy i scoped**.

---

## 9. Lista plików (allowlista IMPLEMENT)

### 9.1 Obowiązkowe (commit bundle)

| Plik | Akcja |
|------|-------|
| `src/lib/job-address-fields.ts` | **CREATE** |
| `src/lib/cloud-sync.ts` | **EDIT** — `mergePair` only |
| `scripts/test-jobs-address-sync-race.mjs` | **CREATE** |
| `test-infra/test-manifest.json` | **EDIT** — `LIB-JOBS-ADDRESS-SYNC-01` |

### 9.2 Opcjonalne (wymaga uzasadnienia w PR, max 1 plik)

| Plik | Akcja | Warunek |
|------|-------|---------|
| `src/app/JobsView.tsx` | **EDIT** — functional `onChange` UX-1 | ARCH approval |

### 9.3 Po release (osobny commit docs)

| Plik | Akcja |
|------|-------|
| `src/app/changelog-data.ts` | IMPLEMENT commit lub docs follow-up per workflow |
| `CHANGELOG.md` | skrót |
| `docs/architecture/JOBS-ADDRESS-SYNC-01-RELEASE-VERIFICATION.md` | **CREATE** po verify |
| `docs/ARCHITECTURE.md` | § merge jobs address — 1 akapit |
| `docs/AGENT-CONTINUITY-GUIDE.md` | closeout |

### 9.4 Zabronione w bundle

Wszystkie pliki spoza §9.1–9.2, w tym: `App.tsx`, `CloudLoader.tsx`, Edge, payroll-*, `inspector-job-assignment.ts`.

---

## 10. Ryzyka

| ID | Ryzyko | P | I | Mitigacja |
|----|--------|---|---|-----------|
| **RK-1** | Regresja `assignedInspectorId` / RI | M | H | JA-T05 + pełny RI harness przed push |
| **RK-2** | Regresja `workEntries` merge | L | H | JA-T05 + PAYROLL-RACE T-RACE; **nie dotykać** `mergeWorkEntriesById` |
| **RK-3** | Konflikt intencji: użytkownik **świadomie** czyści adres, chmura ma starszy niepusty | L | M | R-ADDR-2: przy obu niepustych wygrywa newer ts; świadome wyczyszczenie wymaga `updatedAt` bump (istniejący `applyWriteTimestamps`) |
| **RK-4** | Multi-device: dwa urządzenia edytują różne adresy tej samej roboty | L | M | Poza scope — LWW newer w R-ADDR-2; dokumentacja known limitation |
| **RK-5** | ARCH odrzuci zmianę `mergeJobsById` jako naruszenie CORE | M | M | Wąski scope 2 pól + AUDIT RCA + regresja RI/PR |
| **RK-6** | `preferB` odwrotna kolejność ingest w `mergeJobsById` (cloud first, local second) | M | H | Testy JA-T01/JA-T02 muszą używać **realnej** kolejności `mergeJobsById(local, cloud)` |
| **RK-7** | Stale closure UI nadal myli użytkownika mimo poprawnego merge | M | L | UX-1 opcjonalny; D10 owner smoke |
| **RK-8** | Import backup / restore inny path | L | M | JA-T02 przez `mergeDataKey`; bootstrap używa tego samego `mergeJobsById` |

---

## 11. Principles (wiążące — #JA-001…#JA-008)

| ID | Zasada |
|----|--------|
| **#JA-001** | **Non-empty wins over empty** dla `address` i `flatNumber` — nadrzędne względem samego LWW timestamp przy konflikcie pusty/pełny |
| **#JA-002** | Helper **tylko** w `src/lib/job-address-fields.ts` — jobs domain, zero cross-import inspector |
| **#JA-003** | Zmiana **wyłącznie** w `mergePair` return — nie duplikować w reconcile |
| **#JA-004** | `reconcileAdminBundleWithFreshLocal` / `finalBundle` — **bez zmian API** |
| **#JA-005** | Test JA-T01…T06 **blokuje** release |
| **#JA-006** | Regresja RI + PAYROLL-RACE **blokuje** release |
| **#JA-007** | One bundle = one goal — **#CORE-013** |
| **#JA-008** | IMPLEMENT **BLOCKED** bez ARCH REVIEW PASS + Owner GO |

---

## 12. Workflow po freeze

```text
AUDIT (2026-07-12)     ✓ COMPLETE
DESIGN FREEZE v1.0       ✓ FROZEN (ten dokument)
ARCH REVIEW              ⏸ PENDING
Owner GO                 ⏸ PENDING
IMPLEMENT                ⛔ BLOCKED
BUILD + JA-T01…T06       ⏸
REGRESJA RI + PR           ⏸
COMMIT + PUSH              ⏸
VERIFY version.json        ⏸
RELEASE VERIFICATION       ⏸
CLOSEOUT                   ⏸
```

---

## 13. Odniesienia audytu

| Artefakt | Lokalizacja |
|----------|-------------|
| Symulacja RCA #1 | `.tmp/audit-job-address-race.mjs` (reconcile fail T8 > T5) |
| Symulacja RCA #2 | `.tmp/audit-job-address-race3.mjs` (mergeAllDataKeys fail) |
| Pole UI | `JobsView.tsx` ~1625–1629 (`address`, `flatNumber`) |
| Debounce | `AUTO_SYNC_DEBOUNCE_MS = 2000` |

---

*Dokument gotowy do **ARCH REVIEW**. IMPLEMENT zabroniony do **Owner GO**.*
