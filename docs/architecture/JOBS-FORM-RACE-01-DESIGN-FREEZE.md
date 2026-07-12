# JOBS-FORM-RACE-01 — Utrata znaków w formularzu Robót · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0** — **IMPLEMENT BLOCKED** (czeka na ARCH REVIEW + Owner GO)  
> **Data freeze:** 2026-07-12  
> **Bundle ID:** JOBS-FORM-RACE-01  
> **Class:** **UI / FEATURE** (formularz Roboty — `JobsView.tsx`; **bez** zmian `cloud-sync.ts` / PWRB / Edge)  
> **Baseline prod:** UI **2.65.6** · commit **`aa91640`** · JOBS-ADDRESS-SYNC-01 **CLOSED**  
> **Audyt:** **ACCEPTED** (sesja 2026-07-12 — AUDIT ONLY · RCA COMPLETE)  
> **Powiązane:** [`JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md`](JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md) · [`JOBS-ADDRESS-SYNC-01-CLOSEOUT.md`](JOBS-ADDRESS-SYNC-01-CLOSEOUT.md) · [`ROBOTS-INSPECTOR-01-CLOSEOUT.md`](ROBOTS-INSPECTOR-01-CLOSEOUT.md) · [`CORE-01A-CHANGE-CHECKLIST.md`](CORE-01A-CHANGE-CHECKLIST.md) · [`STABILIZATION-WINDOW-PLAN.md`](../STABILIZATION-WINDOW-PLAN.md)

```text
CEL:     Pola tekstowe formularza Robót (adres, nr mieszkania, klient, uwagi, …)
         nie tracą znaków podczas szybkiego wpisywania.

ZASADA:  Zapis joba musi patchować prevJob w functional updater — nigdy nie
         zastępować całego rekordu snapshotem z closure renderu N.

ZAKAZ:   Zmiana merge chmury / Edge / PWRB / reconcile chain w tym bundle.
         Draft-state + debounce commit jako osobny program (poza scope v1.0).
         Mixed bundle z LP / payroll / przetargi.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Problem** | Podczas wpisywania tekst skraca się (np. `Obornicka` → `Obornic`) |
| **Root cause PRIMARY** | `updateJob()` — `setJobs(prev => map(… ? next : …))` z `next` zbudowanym **poza** functional updater ze snapshotu `{...staleJob, field}` |
| **Root cause SECONDARY** | Równoległe `updateJob({...selectedJob, …})` z innych pól — clobber adresu starszym snapshotem |
| **Root cause TERTIARY** | Controlled input `value={selectedJob.address}` — ujawnia rollback stanu (objaw, nie mechanizm) |
| **Poza scope v1.0** | Sync LWW R-ADDR-2 przy obu stronach non-empty (osobny program jeśli nadal występuje po fix formularza) |
| **Nowe pole KV** | **Brak** |
| **Zmiana Edge / cloud-sync** | **Brak** |
| **Gate release** | JF-T01…T08 PASS + regresja JA + RI + PR + `npm run build` |

**DESIGN FREEZE v1.0 — FROZEN · ARCH REVIEW PENDING · Owner GO PENDING · IMPLEMENT BLOCKED**

---

## 1. RCA Summary

### 1.1 Objaw produkcyjny

| Krok | Oczekiwane | Obserwowane |
|------|------------|-------------|
| Roboty → edycja / nowa robota | Tekst w polu rośnie monotonicznie | OK przez większość czasu |
| Szybkie wpisywanie adresu (`Obornicka`) | Pełny string w UI i stanie | **Skrócenie** (np. `Obornic`) |
| Po JOBS-ADDRESS-SYNC-01 | Adres nie znika po sync (~3 s) | **PASS** — ujawnia race **podczas** pisania |

### 1.2 Przepływ techniczny (formularz)

```text
<input value={selectedJob.address} />          ← controlled (JobsView L1625)
  onChange → updateJob({ ...snapshot, address: e.target.value })
    → validateJobAssignedInspectorForSave
    → syncJobDocuments / normalizeJobWmFields
    → setJobs(prev => prev.map(j => j.id === next.id ? next : j))
         ↑ next z closure — cały Job, nie patch na prev
  → useLocalStorage kw-jobs + applyWriteTimestamps
  → useEffect [jobs] → scheduleAutoCloudSync (2 s debounce)
```

### 1.3 Co naprawił JOBS-ADDRESS-SYNC-01 (kontekst)

| Obszar | Status |
|--------|--------|
| Znikający adres **po** auto-sync (pusty cloud LWW) | **CLOSED** (`mergeJobAddressField`) |
| Utrata znaków **w trakcie** keystroke race | **OPEN** — ten program |

---

## 2. Root Cause

### 2.1 PRIMARY — snapshot overwrite w `updateJob()`

**Lokalizacja:** `src/app/JobsView.tsx` — `updateJob()` (~L795–821).

```text
Antywzorzec:
  1. Handler buduje updated = { ...jobZeRenderuN, address: e.target.value }
  2. Pipeline produkuje next (poza setState)
  3. setJobs(prev => prev.map(j => j.id === next.id ? next : j))
     → next jest zamrożony; kolejny handler może mieć starszy e.target lub starszy snapshot
  4. Jeśli updater A wykona się po B → krótszy adres wygrywa (lost update)
```

**Mechanizm utraty znaków:** controlled input resetuje `value` do `selectedJob.address` po re-renderze ze skróconym stanem.

### 2.2 SECONDARY — `{...selectedJob}` w równoległych polach

**Lokalizacja:** `JobsView.tsx` — client, daty, inspektor, WM subtype, notes, workEntries, materials, photos (~15+ call sites).

Każde `updateJob({ ...selectedJob, poleX: v })` niesie **cały** `selectedJob` z renderu N, w tym **stary** `address`. Równoległa edycja innego pola może cofnąć dłuższy adres wpisywany w tym samym czasie.

### 2.3 TERTIARY — walidacja inspektora (osobny objaw)

`validateJobAssignedInspectorForSave` przed zapisem — bez inspektora **żaden** keystroke nie aktualizuje stanu → input wraca do `""`. To **blokada od zera**, nie skracanie sufiksu; pozostaje bez zmian semantyki (ROBOTS-INSPECTOR).

### 2.4 Odrzucone hipotezy

| Hipoteza | Werdykt |
|----------|---------|
| `jobs.find` vs `selectedJob` (JA01) | **ODRZUCONE** — ten sam snapshot renderu (`selectedJob = jobs.find`) |
| `useMemo` na `selectedJob` | **NIE ISTNIEJE** — derive co render |
| `useEffect` marked reports (L747) | **ODRZUCONE** — mutuje tylko `workerReports` |
| `normalizeJobWmFields` obcina adres | **ODRZUCONE** — nie dotyka `address` |
| Podwójny render jako root cause | **ODRZUCONE** — objaw controlled input |

---

## 3. Architektura wariantów

### 3.1 Wspólne zasady (A i B)

| ID | Zasada |
|----|--------|
| **R-FORM-1** | Zapis pola tekstowego **MUSI** scalać z `prevJob` wewnątrz `setJobs(prev => …)` |
| **R-FORM-2** | Handler **NIE MOŻE** przekazywać pełnego `{...selectedJob}` dla pól skalarnych formularza |
| **R-FORM-3** | Pipeline (`syncJobDocuments`, `normalizeJobWmFields`, walidacja) **po** merge z `prevJob` |
| **R-FORM-4** | Tablice złożone (`workEntries`, `photos`, `materials`, …) — **replace sekcji**, nie shallow spread całego joba z closure |
| **R-FORM-5** | Brak zmian `cloud-sync.ts`, Edge, PWRB, `reconcileAdminBundleWithFreshLocal` |

---

### 3.2 WARIANT A — Minimalny fix (functional merge choke point)

#### Opis

Zachować publiczne API **`updateJob(updated: Job, activity?, guardWorkEntries?)`**. Zmienić **wyłącznie** mechanizm `write()` tak, aby pipeline i commit działały na **`{ ...prevJob, ...delta }`** wewnątrz functional updater.

#### Kontrakt API (zmiana semantyczna, nie sygnatury)

| Typ wywołania | Payload `updated` | Merge |
|---------------|-------------------|-------|
| **Form scalar** (address, flatNumber, client, notes, daty) | `{ id, [pole]: wartość }` — **tylko zmienione pola + id** | `{ ...prevJob, ...updated }` |
| **Domain transform** (`startJobExecution`, `appendBillingJobNote`, upload pliku) | Pełny wynik funkcji domenowej | `{ ...prevJob, ...updated }` — funkcja zwraca kompletny delta |
| **Tablice** (workEntries edit, photos) | Jawna tablica w `updated` | Replace pola tablicowego z `updated` |

#### Pseudoprzepływ

```text
updateJob(updated, activity?, guard?) {
  validate( { ...prevJobPlaceholder, ...updated } )  // prev nieznany — walidacja na merged w updaterze
  write(prev => prev.map(j => {
    if (j.id !== updated.id) return j;
    const base = { ...j, ...updated };              // ← PATCH na prevJob
    let next = syncJobDocuments(base);
    … normalizeJobWmFields …
    return next;
  }));
}
```

**Uwaga implementacyjna (dla IMPLEMENT, nie w tym DF):** walidacja inspektora musi używać `base` po merge, nie gołego `updated`.

#### Zmiany call-site (obowiązkowe w A)

| Obszar | Było | Ma być |
|--------|------|--------|
| Adres / flatNumber | `{ ...job, address }` | `{ id: selectedJobId, address: e.target.value }` |
| Client, notes, daty | `{ ...selectedJob, field }` | `{ id: selectedJobId, field: value }` |
| Inspektor select | `{ ...selectedJob, assignedInspectorId }` | `{ id, assignedInspectorId, updatedAt }` |
| Domain calls | bez zmian | bez zmian (wynik lib już jest delta-complete) |

#### Zalety A

- Jeden punkt zmiany (`updateJob` + ~8–12 call-site formularza summary).
- Brak nowego exportu / migracji InspectorPanel.
- Najszybszy path w **STABILIZATION WINDOW**.
- Wszystkie istniejące wywołania domain pozostają kompatybilne przy merge `{ ...prev, ...updated }`.

#### Wady A

- Kontrakt `updateJob(Job)` **kłamie** typem — faktycznie przyjmuje `JobPatch`.
- Ryzyko regresji jeśli caller nadal przekazuje `{...selectedJob}`.
- Brak wymuszenia w compile-time bez nowego typu.

---

### 3.3 WARIANT B — Docelowa architektura (`patchJob` / `updateJobField`)

#### Opis

Wprowadzić jawne API patch:

```text
patchJob(
  jobId: string,
  patch: JobFormPatch,
  opts?: { activity?, guardWorkEntries? }
): void
```

Gdzie `JobFormPatch = Partial<Pick<Job, …scalarFormFields…>>` (+ ewentualnie tagged union dla tablic).

`updateJob(fullJob)` — **deprecated** dla formularza; pozostaje dla ścieżek domenowych lub staje się cienkim wrapperem `patchJob(id, fullDelta)`.

#### Warstwy

```text
┌─────────────────────────────────────────┐
│  JobsView inputs / child panels         │
│  patchJob(id, { address })              │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  patchJob() — SSOT zapisu formularza    │
│  functional merge + pipeline + validate │
└─────────────────┬───────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  setJobs / applyJobs (bez zmian App)    │
└─────────────────────────────────────────┘
```

Opcjonalnie: `src/lib/job-form-patch.ts` — typ `JobFormPatch`, helper `applyJobPatch(prev, patch)`.

#### Migracja fazowa (B)

| Faza | Zakres |
|------|--------|
| **B0** | `patchJob` + functional merge (jak A wewnętrznie) |
| **B1** | Pola summary: address, flatNumber, client, notes, daty, inspektor |
| **B2** | WM subtype, materials, work entry notes |
| **B3** | Deprecate `updateJob` dla scalarów; lint / grep gate |

#### Zalety B

- Kontrakt compile-time — niemożliwe `{...selectedJob}` bez ostrzeżenia.
- Czytelna architektura; łatwy onboarding agentów.
- Stopniowa migracja bez big-bang.

#### Wady B

- Większy diff niż A (nowy moduł + rename call sites ~36 w JobsView + 7 InspectorPanel jeśli w scope).
- Dwa API równolegle w fazie migracji — ryzyko pomyłki.
- Dłuższy review w oknie stabilizacji.

---

## 4. Blast Radius

| Warstwa | Wariant A | Wariant B |
|---------|-----------|-----------|
| `src/app/JobsView.tsx` | **TAK** — `updateJob` + form onChange | **TAK** — + `patchJob` |
| `src/lib/job-form-patch.ts` (nowy) | Opcjonalnie typy | **TAK** |
| `src/app/InspectorPanel.tsx` | **NIE** v1.0 | Opcjonalnie B3 |
| `src/app/App.tsx` | **NIE** | **NIE** |
| `src/lib/cloud-sync.ts` | **NIE** | **NIE** |
| Edge / PWRB / reconcile | **NIE** | **NIE** |
| `test-infra/test-manifest.json` | **TAK** — nowy LIB-JOBS-FORM-RACE-01 | **TAK** |
| `scripts/test-jobs-form-race-*.mjs` | **TAK** | **TAK** |

**Szacunek call sites (JobsView):** ~36 `updateJob(` — v1.0 migruje **~10–12** (pola tekstowe + select summary); reszta domain/array bez zmian API.

---

## 5. Protected Core Impact

| Obszar Protected Core | Wariant A | Wariant B |
|----------------------|-----------|-----------|
| `cloud-sync.ts` | **GREEN** — brak dotyku | **GREEN** |
| PWRB / `finalizePayrollBundleMerge` | **GREEN** | **GREEN** |
| `runCloudSync` / `applyAdminDataBundle` | **GREEN** | **GREEN** |
| `CloudLoader` payroll | **GREEN** | **GREEN** |
| Edge `make-server-*` | **GREEN** | **GREEN** |
| `App.tsx` CORE handlery | **GREEN** | **GREEN** |

**Klasa bundle:** **FEATURE / UI** — boundary check CORE-01A: **FEATURE PASS** (bez CORE plików).

**#CORE-013:** Jeden bundle, jeden cel — **JOBS-FORM-RACE-01** tylko.

---

## 6. Ryzyka

| ID | Ryzyko | P | M | Mitigacja |
|----|--------|---|---|-----------|
| RK-1 | Caller nadal używa `{...selectedJob}` | Śr | Wys | grep gate w teście; migracja scalarów; code review |
| RK-2 | Walidacja inspektora na niepełnym `updated` | Śr | Śr | Walidacja po `{ ...prev, ...patch }` w updaterze |
| RK-3 | Domain `{ ...prev, ...fullTransform }` nadpisze świeższe pole | N | Wys | Domain functions muszą zwracać tylko zmienione pola LUB pełny merge by design — audyt per call |
| RK-4 | Regresja workEntries guard path | N | Śr | `guardWorkEntries` bez zmian semantyki |
| RK-5 | InspectorPanel divergent API (B) | N | Niski | Poza scope v1.0 |
| RK-6 | Objaw sync R-ADDR-2 nadal widoczny po pauzie 2 s | N | Niski | Osobny ticket; nie mieszać z tym bundle |

---

## 7. Rollback

```bash
git revert <commit-jobs-form-race-01>
git push origin main
```

| Element | Rollback |
|---------|----------|
| Funkcjonalność | Przywraca snapshot overwrite (race wraca) |
| JOBS-ADDRESS-SYNC-01 | **Nie dotknięty** — merge chmury zostaje |
| Dane prod | Brak migracji KV — rollback UI-only |

**Rollback READY** — single revert, brak Edge deploy.

---

## 8. Definition of Done

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| D1 | `npm run build` PASS | CI lokalne |
| D2 | JF-T01…T08 PASS (`scripts/test-jobs-form-race-01.mjs`) | vite-node |
| D3 | Regresja JA-T01…T06 PASS | `test-jobs-address-sync-race.mjs` |
| D4 | Regresja RI-T01…T05 PASS | `test-robots-inspector-01-sync-race.mjs` |
| D5 | Regresja PAYROLL-RACE + PAYROLL-ARCHIVE PASS | istniejące skrypty |
| D6 | Manifest `LIB-JOBS-FORM-RACE-01` w `test-manifest.json` | gate B `scope:jobs` |
| D7 | Prod smoke: szybkie wpisanie `Obornicka` + 4,5 s wait — bez skrócenia | Playwright / manual |
| D8 | CHANGELOG + ARCHITECTURE § Roboty form patch | docs |
| D9 | Brak zmian w allowliście zakazanej (§5) | git diff audit |
| D10 | ARCH REVIEW **APPROVED** + Owner GO | proces |

---

## 9. Acceptance Criteria

### AC1 — Monotoniczne pisanie (PRIMARY)

GIVEN wybrana robota z inspektorem WM  
WHEN użytkownik wpisuje `Obornicka` z prędkością ≥8 znaków/s  
THEN `address` w stanie React i `localStorage kw-jobs` = `Obornicka` bez skróceń pośrednich utrwalonych w stanie.

### AC2 — Równoległe pola (SECONDARY)

GIVEN edycja adresu w toku  
WHEN użytkownik zmienia `housingType` / `client` / datę  
THEN `address` nie cofa się do krótszej wartości.

### AC3 — flatNumber / client / notes

jak AC1 dla pól: `flatNumber`, `client`, `notes` (textarea).

### AC4 — Domain actions bez regresji

GIVEN robota z workEntries / photos  
WHEN `startJobExecution`, upload pliku, billing note  
THEN zachowanie identyczne jak przed fixem (testy regresji).

### AC5 — Sync po wpisaniu (regresja JA01)

GIVEN adres `Obornicka` wpisany i odczekane >3 s auto-sync  
THEN adres pozostaje `Obornicka` (JA-T04/T06 regresja).

### AC6 — Inspektor bez inspektora (unchanged)

GIVEN nowa robota bez inspektora  
WHEN wpis adresu  
THEN walidacja blokuje zapis (istniejące zachowanie ROBOTS-INSPECTOR) — **nie** regresja tego programu.

### AC7 — Protected Core

GIVEN diff release  
THEN zero plików z §5 Protected Core.

---

## 10. Plan testów (lib — szkic)

| ID | Scenariusz |
|----|------------|
| JF-T01 | 20 szybkich patchy adresu symulowanych — końcowy stan = ostatni |
| JF-T02 | Patch adresu + równoległy patch `client` — adres zachowany |
| JF-T03 | Out-of-order updater simulation (A/B) — dłuższy wygrywa |
| JF-T04 | `patchJob` tylko `{ id, flatNumber }` — reszta pól z prev |
| JF-T05 | Domain `startJobExecution` merge — bez utraty address |
| JF-T06 | Walidacja inspektora na merged job |
| JF-T07 | Regresja merge JA01 w `mergeJobsById` (import smoke) |
| JF-T08 | `applyWriteTimestamps` — updatedAt bump bez truncate |

---

## 11. Allowlista IMPLEMENT (propozycja — po Owner GO)

### Wariant A

| Plik | Zmiana |
|------|--------|
| `src/app/JobsView.tsx` | `updateJob` functional merge + scalar onChange |
| `scripts/test-jobs-form-race-01.mjs` | **NEW** |
| `test-infra/test-manifest.json` | `LIB-JOBS-FORM-RACE-01` |
| `src/app/changelog-data.ts` | patch version |
| `CHANGELOG.md` | skrót |

### Wariant B (dodatkowo)

| Plik | Zmiana |
|------|--------|
| `src/lib/job-form-patch.ts` | **NEW** — typ + `applyJobPatch` |
| `src/app/JobsView.tsx` | `patchJob` + migracja faz B1 |

---

## 12. Rekomendacja architektoniczna

### Werdykt: **WARIANT A (v1.0)** → **WARIANT B (v1.1 backlog)**

| Kryterium | A | B |
|-----------|---|---|
| Czas do prod | ★★★ | ★★ |
| Blast radius | ★★★ | ★★ |
| STABILIZATION WINDOW fit | ★★★ | ★★ |
| Compile-time safety | ★ | ★★★ |
| Długoterminowa architektura | ★★ | ★★★ |
| Naprawa root cause | ★★★* | ★★★ |

\* przy warunku migracji scalar call-sites do payload **delta-only** (§3.2).

### Uzasadnienie

1. **Root cause leży w jednym choke poincie** (`updateJob` → `setJobs`) — functional merge `{ ...prevJob, ...delta }` naprawia race **bez** nowego API, o ile scalar handlery przestaną spreadować `selectedJob`.

2. **STABILIZATION WINDOW** — Owner GO dla CORE jest restrykcyjny; A jest **FEATURE PASS**, B wymaga szerszej migracji i dłuższego review przy podobnej logice merge.

3. **Wariant A sam w sobie nie wystarczy**, jeśli zmieni się tylko `write()` a call-site zostawią `{...selectedJob}` — **obowiązkowa** migracja ~10 pól summary (ten sam nakład pracy co B faza B1).

4. **Wariant B** jako **v1.1** — wydzielić `JobFormPatch` + `patchJob()` po udanym prod A; dodać grep/lint „zakaz spread selectedJob w onChange”.

### Decyzja do ARCH REVIEW

| Pytanie | Rekomendacja freeze |
|---------|---------------------|
| IMPLEMENT v1.0 | **A** + delta-only scalar payloads |
| Backlog v1.1 | **B** — formalny `patchJob` + typ w `job-form-patch.ts` |
| Sync R-ADDR-2 mid-typing | **HOLD** — obserwacja po v1.0; osobny program jeśli FAIL |

---

## 13. Sign-off

| Rola | Status | Data |
|------|--------|------|
| AUDIT | **COMPLETE** | 2026-07-12 |
| RCA | **COMPLETE** | 2026-07-12 |
| DESIGN FREEZE v1.0 | **FROZEN** | 2026-07-12 |
| ARCH REVIEW | **PENDING** | — |
| Owner GO | **PENDING** | — |
| IMPLEMENT | **BLOCKED** | — |

---

*Nie implementuj bez ARCH REVIEW APPROVED + Owner GO. Po zamknięciu: `JOBS-FORM-RACE-01-RELEASE-VERIFICATION.md` + closeout.*
