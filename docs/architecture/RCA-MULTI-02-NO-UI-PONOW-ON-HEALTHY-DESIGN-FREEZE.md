# RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY — DESIGN FREEZE

> **ID:** RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE  
> **EPIC / CHILD:** FORCE HEAVY RESCAN (operacyjny follow-up COST-MULTI-02)  
> **STATUS:** **DESIGN FREEZE · IMPLEMENT COMPLETE (F0–F3)** · UI **2.65.76**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Klasa:** UX + Heavy orchestracja · **#CORE-013**  
> **Wejście:** [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY.md) · [`COST-MULTI-02-DESIGN-FREEZE.md`](COST-MULTI-02-DESIGN-FREEZE.md) · PV [`../verification/COST-MULTI-02-PRODUCTION-VERIFY-08dee335.md`](../verification/COST-MULTI-02-PRODUCTION-VERIFY-08dee335.md)  
> **Impl:** [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-IMPLEMENTATION-REPORT.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-IMPLEMENTATION-REPORT.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (FORCE HEAVY RESCAN):
  Dać użytkownikowi jawne CTA na healthy dossier
  + Soft Heavy Invalidate
  + REUSE istniejącego Heavy Pipeline
  → wypełnić costCandidateSources / branchWinnerArtifacts
  → COST-MULTI-02 może przejść w AGGREGATE.

  NIE Discovery · NIE parsery · NIE Bid formulas
  NIE Aggregate merge rewrite · NIE cloud-sync.ts · NIE Payroll.

IMPLEMENT: F0–F3 COMPLETE (UI 2.65.76).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*brak nowych DATA_KEYS; flaga w kodzie;
                      soft invalidate = patch istniejącego tenderDossier
                      w pipeline item — jak dziś po Heavy)
G3 Cloud Sync:   NIE* (*bez edycji cloud-sync.ts; persist itemu
                      REUSE istniejący coalesce / onUpdate)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE* (*bez nowych tras; CTA w Kosztorys / banner MULTI)

Wynik: Gate GREEN.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Cel zamrożony

| Cel | Opis |
|-----|------|
| **CTA na healthy** | Użytkownik widzi i może kliknąć force rescan, gdy dossier jest „gotowy”, ale brakuje pól MULTI-02 |
| **Soft Heavy Invalidate** | Tymczasowo `tenderDossierHeavyParseDone === false` **bez** kasowania Discovery ONE na stałe i bez zmiany turnieju |
| **REUSE Heavy** | Po invalidate → istniejący E-RUN (`buildTenderDossierCostPhase` + enrichment) |
| **Efekt MULTI-02** | Po sukcesie: sources + artifacts → `resolveCostBidInput` może dać `AGGREGATE` |
| **Rollback** | Flaga OFF = zachowanie tipu 2.65.75 (brak CTA force / brak invalidate) |

**Sukces ≠** nowe parsery / nowy Aggregate.  
**Sukces =** na fixture `08dee335` po CTA: Live ścieżka jak PV local heavy (AGGREGATE Bid ≫ ONE).

**Zamrożony pakiet RCA:** rekomendacja **A + D** (jawne CTA + soft invalidate; banner jako powierzchnia).  
**Odrzucone w v1:** Wariant B (globalna zmiana semantyki retry), Wariant C (background auto-rescan listy).

---

## 2. OUT OF SCOPE (zamrożone)

| Obszar | Status |
|--------|--------|
| Discovery `discoverBestCostDocument` / turniej ONE | **OOS** |
| Algorytmy ZIP / 7Z / ATH / PDF / XLSX | **OOS** |
| Formuły Bid / marża / OfferBoq engines | **OOS** |
| `resolveCostBidInput` / Aggregate merge (COST-MULTI-02) | **OOS** — tylko **konsumuje** wynik Heavy |
| CostPackage / BranchPackage klasyfikacja (COST-MULTI-01) | **OOS** — bez zmian polityk |
| `cloud-sync.ts` / nowe DATA_KEYS / Payroll | **OOS** |
| Auto-rescan całej listy / background C | **OOS v1** |
| Zmiana globalnego `retryDossierParse` dla wszystkich fail paths bez flagi | **OOS** (unikamy B) |

**REUSE dozwolone:**

- `useTenderDossierHeavyLazy` E-RUN / `retryDossierParse` (po invalidate)
- `buildTenderDossierCostPhase` / `enrichTenderDossierMetadataPhase`
- `CostMultiPackageBanner` / `TenderKosztorysWorkspace` / process status bar (powierzchnie CTA)
- Istniejący persist `onUpdate` pipeline item

---

## 3. Kontrakt produktu (zamrożony)

### 3.1 Nazwa CTA (SSOT copy)

| Kontekst | Label (PL) | `data-*` |
|----------|------------|----------|
| Primary (Kosztorys / banner) | **Uzupełnij odczyty branż** | `data-force-heavy-rescan="1"` |
| Alternatywa (confirm title / Super Admin) | Wymuś ponowną analizę | ten sam handler |

**Zakaz:** reuse etykiety F2 „Ponów analizę kosztorysu” na healthy sukcesie — myli z Epic A / CR-02 (brak kosztorysu).

### 3.2 Kiedy CTA jest widoczne

Wszystkie warunki **TAK** (v1):

| # | Warunek |
|---|---------|
| 1 | Feature `COST_MULTI_02_FORCE_RESCAN_CTA === true` |
| 2 | `COST_MULTI_02_AGGREGATE_BID === true` (bez sensu force pod Aggregate Bid OFF) |
| 3 | `tenderDossierHeavyParseDone(dossier) === true` |
| 4 | `dossier.kosztorys?.ok === true` (healthy ONE path) |
| 5 | Brak pełnych pól MULTI-02:  
`!(Array.isArray(costCandidateSources) && costCandidateSources.length >= 1)`  
**OR**  
`!(Array.isArray(branchWinnerArtifacts) && branchWinnerArtifacts.length >= 1)`  
*(dla single-branch: po force i tak ONE — CTA znika gdy sources+artifacts wypełnione)* |
| 6 | Hook Heavy dostępny (`onRetryParse` / `forceHeavyRescan` podpięty) |
| 7 | Nie w trakcie `dossierBuilding` / `dossierSaving` |

**Super Admin (opcjonalne v1.1, nie blokuje v1):** zawsze widoczne CTA force na Kosztorys (nawet gdy artifacts pełne) — poza minimalnym DF; v1 = tabela powyżej.

**Niewidoczne gdy:** flaga OFF · F2 aktywne (tam zostaje istniejące „Ponów analizę kosztorysu”) · brak dossier · Heavy w toku.

### 3.3 Confirm dialog (zamrożony)

```text
Tytuł: Uzupełnij odczyty branż
Treść: System ponownie przeanalizuje dokumenty kosztowe.
       Nie zmienia wyboru głównego kosztorysu (ONE).
       Może potrwać przy dużym ZIP.
[Anuluj] [Uruchom]
```

Bez confirm = **zakaz** (R5 RCA — przypadkowy klik).

---

## 4. Soft Heavy Invalidate (zakres zamrożony)

### 4.1 Cel invalidate

Sprawić, by **przed** startem E-RUN:

```text
tenderDossierHeavyParseDone(dossier) === false
```

bez trwałego niszczenia Discovery ONE i bez ruszania parserów.

### 4.2 Dozwolony patch (v1 — jeden kanoniczny sposób)

**Zamrożony mechanizm:** addycyjne pole sesji/dossier:

```text
tenderDossier.forceHeavyRescanAt: ISO string | undefined
```

oraz zmiana bramy:

```text
tenderDossierHeavyParseDone(dossier):
  if (dossier.forceHeavyRescanAt) return false;  // NOWE — tylko ten wyjątek
  // ... istniejąca logika parserVersion / kosztorys.ok / parsedAt
```

**Alternatywa odrzucona w v1:** bump `parserVersion` do stale (fałszywy sygnał stale parsera w Trust / UI).  
**Alternatywa odrzucona w v1:** `kosztorys = null` (miga pusty Kosztorys, myli operatora).

### 4.3 Co invalidate **NIE** robi

| Zakaz | |
|-------|--|
| Nie wywołuje Discovery | |
| Nie zmienia `kosztorys` (ONE) przed Heavy | Heavy może podmienić ONE wg istniejących reguł `shouldReplaceBestKosztorys` — **bez** zmian tych reguł w tym epicu |
| Nie czyści `bzpDocuments` / external docs | |
| Nie edytuje CostPackage / BranchPackage kodu | |
| Nie czyści ręcznie `branchWinnerArtifacts` przed startem | nowy Heavy nadpisze scanSummary addycyjnie jak w MULTI-02 B1 |
| Nie omija circuit breaker `HEAVY_MAX_RUNS_PER_KEY` | |

### 4.4 Czyszczenie flagi force

Po **udanym** terminalu Heavy (`heavyDone` znów true **bez** `forceHeavyRescanAt`):

```text
forceHeavyRescanAt = undefined  (w tym samym persist final dossier)
```

Przy fail (e11): flaga może zostać lub zostać wyczyszczona + CTA wraca — **zamrożone:** wyczyść flagę i ustaw `dossierParseFailed` jak dziś, CTA force nadal spełnia §3.2 jeśli artifacts puste.

---

## 5. Przepływ runtime (zamrożony)

```text
[UI] Klik „Uzupełnij odczyty branż” → Confirm OK
        │
        ▼
forceHeavyRescan(itemId):
  1. patch local item.tenderDossier.forceHeavyRescanAt = nowISO
     persist: local-first (jak partial Heavy) — REUSE onUpdate
  2. clearDossierInflightForItem(itemId)
  3. retryTenderPipelinePhase(itemId, "heavy")  // no-op danych — OK
  4. retryDossierParse()  // retryNonce++
        │
        ▼
E-RUN (useTenderDossierHeavyLazy):
  tenderDossierHeavyParseDone → false (bo forceHeavyRescanAt)
  gate.canStartHeavyParse → jak dziś
  buildTenderDossierCostPhase(...)   // REUSE — zapisuje sources + artifacts
  enrichTenderDossierMetadataPhase(...)
  final persist cloud (istniejąca ścieżka)
  clear forceHeavyRescanAt
        │
        ▼
MULTI-01 resolveCostPackageFromItem (bez zmian kodu)
MULTI-02 resolveCostBidInput → ONE | AGGREGATE | MANUAL_HOLD
Bid / OfferBoq → istniejący wire kosztorysForBid
```

**Zakaz:** drugi równoległy Heavy orchestrator.  
**Zakaz:** wywołanie parserów „ad hoc” poza Heavy.

---

## 6. Przepływ UX (zamrożony)

```text
Kosztorys tab (healthy, missing MULTI-02 fields)
  ┌─────────────────────────────────────────────┐
  │ Process status (e9 ready) — bez zmian e11   │
  │ [Uzupełnij odczyty branż]  ← NOWE CTA       │
  │ (opcjonalnie w CostMultiPackageBanner)      │
  └─────────────────────────────────────────────┘
        │ click + confirm
        ▼
  Busy: dossierBuilding / „Trwa uzupełnianie odczytów branż…”
  CTA disabled
        │
        ▼ success
  Banner MULTI-01/02 jak dziś (multi_ready / Aggregate overlay)
  CTA znika (§3.2 punkt 5 niespełniony)
        │
        ▼ fail
  e11 + istniejące „Spróbuj ponownie” + CTA force nadal jeśli missing fields
```

**Powierzchnie v1 (min 1, max 2):**

1. **Wymagane:** `TenderKosztorysWorkspace` — obok / pod `KosztorysProcessStatusBar`  
2. **Opcjonalne v1:** przycisk w `CostMultiPackageBanner` gdy banner widoczny; gdy AS-IS `single` bez banneru — wystarczy (1)

**Outcome F2:** bez zmian (nadal tylko przy braku kosztorysu).

---

## 7. Feature Flag

| Flaga | Default (po Owner GO IMPLEMENT) | Znaczenie |
|-------|----------------------------------|-----------|
| `COST_MULTI_02_FORCE_RESCAN_CTA` | **true** | Pokazuje CTA + umożliwia `forceHeavyRescan` |
| `COST_MULTI_02_AGGREGATE_BID` | już **true** (02) | Wymagana do sensownego CTA (§3.2) |

```text
OFF → brak CTA, brak patch forceHeavyRescanAt, brak zmiany heavyDone
    = tip 2.65.75 operacyjnie (MULTI-02 kod zostaje)
```

Lokalizacja: kod (jak `COST_MULTI_02_AGGREGATE_BID`) — **bez** nowego AppSettings KV w v1.

---

## 8. Telemetry (zamrożona, lekka)

Bez nowego backendu. Reuse console / istniejące pipeline timing jeśli dostępne.

| Event | Pola |
|-------|------|
| `force_heavy_rescan_click` | tenderId, hadSources, hadArtifacts |
| `force_heavy_rescan_confirm` | tenderId |
| `force_heavy_rescan_start` | tenderId, forceHeavyRescanAt |
| `force_heavy_rescan_done` | tenderId, ok, elapsedMs, sourcesN, artifactsN, bidMode |
| `force_heavy_rescan_fail` | tenderId, errorClass |

`data-force-heavy-rescan` + `data-force-heavy-busy` dla PV Playwright.

---

## 9. Rollback Plan

```text
1. COST_MULTI_02_FORCE_RESCAN_CTA = false
2. (opcjonalnie) revert commitów force-rescan
3. CTA znika; heavyDone bez wyjątku forceHeavyRescanAt
4. MULTI-01/02 bez zmian
5. Orphan forceHeavyRescanAt w starym dossier:
   - harmless jeśli flaga OFF (CTA nie czyta)
   - przy ON: heavyDone false → jeden reskan — OK
6. Brak migracji wstecznej KV
```

| Kryterium rollback PASS | |
|-------------------------|--|
| R1 | Healthy bez missing fields — bez regresji Bid |
| R2 | F2 „Ponów” nadal działa przy braku kosztorysu |
| R3 | Flaga OFF = brak force path |

---

## 10. Acceptance Criteria

### 10.1 CTA / UX

| ID | Kryterium |
|----|-----------|
| **AC-FR-01** | Healthy + missing sources/artifacts + flagi ON → widoczne CTA „Uzupełnij odczyty branż” |
| **AC-FR-02** | Confirm wymagany przed startem |
| **AC-FR-03** | Podczas Heavy CTA disabled + busy sygnał |
| **AC-FR-04** | Po sukcesie z wypełnionymi fields CTA znika |
| **AC-FR-05** | Flaga OFF → brak CTA |

### 10.2 Runtime / invalidate

| ID | Kryterium |
|----|-----------|
| **AC-FR-10** | `forceHeavyRescan` ustawia `forceHeavyRescanAt` → `heavyDone === false` |
| **AC-FR-11** | E-RUN startuje mimo wcześniejszego healthy ONE |
| **AC-FR-12** | Po sukcesie `forceHeavyRescanAt` wyczyszczone |
| **AC-FR-13** | Circuit breaker Heavy nie obchodzony |
| **AC-FR-14** | Nie wywołano Discovery turniej jako osobnego kroku force |

### 10.3 Efekt MULTI-02 (konsumpcja)

| ID | Kryterium |
|----|-----------|
| **AC-FR-20** | Fixture `08dee335` po force: `costCandidateSources.length >= 4` (lub ≥2) i `branchWinnerArtifacts` usable ≥2 |
| **AC-FR-21** | `resolveCostBidInput.mode === AGGREGATE` (gdy warunki 02 spełnione) |
| **AC-FR-22** | `dossier.kosztorys` nadal ONE Discovery (Pensjonat), nie `AGGREGATE:N-branches` |
| **AC-FR-23** | Single-branch tender: po force Bid ONE ±ε (brak regresji) |

### 10.4 Negatywne

| ID | Kryterium |
|----|-----------|
| **AC-FR-N1** | Brak zmian plików parserów / `tender-cost-discovery` turniej |
| **AC-FR-N2** | Brak edycji `cloud-sync.ts` / Payroll |
| **AC-FR-N3** | Brak zmian formuł `computeTenderBidProposal` / Aggregate merge lib |
| **AC-FR-N4** | F2 CTA path nie zepsuty |

---

## 11. Scenariusze testowe

### 11.1 Jednostkowe (vite-node)

| ID | Scenario | Expect |
|----|----------|--------|
| T1 | `heavyDone` true + `forceHeavyRescanAt` set | `heavyDone` false |
| T2 | clear force po „final” dossier | `heavyDone` true gdy reszta OK |
| T3 | `shouldShowForceHeavyRescanCta(item)` — missing artifacts | true |
| T4 | pełne artifacts + sources | false |
| T5 | flaga OFF | false |
| T6 | F2 active (brak kosztorys.ok) | force CTA false (F2 ma swoje) |

### 11.2 Integracyjne

| ID | Scenario | Expect |
|----|----------|--------|
| I1 | Synthetic healthy ONE bez sources → force patch → mock E-RUN arm | start Heavy |
| I2 | Fixture plików jak 08dee335 (4 PDF) po heavy | AGGREGATE + Bid > ONE |
| I3 | Single PDF tender | ONE, CTA znika po artifacts=1/sources=1 |

### 11.3 Prod / Playwright (po release)

| ID | Scenario | Expect |
|----|----------|--------|
| P1 | version.json tip | PASS |
| P2 | Otwórz `08dee335` /kosztorys | CTA widoczne AS-IS |
| P3 | Confirm → wait Heavy | arts≥2, `data-cost-bid-mode=AGGREGATE` lub Bid ≫ 292k |
| P4 | Odśwież | CTA zniknęło; ONE filename Pensjonat w dossier |

---

## 12. Etapy IMPLEMENT (wysoki poziom) — po Owner GO

| Etap | Zakres | AC |
|------|--------|-----|
| **F0** | Lib: `forceHeavyRescanAt` + zmiana `tenderDossierHeavyParseDone` + `shouldShowForceHeavyRescanCta` + flaga | T1–T6 |
| **F1** | `forceHeavyRescan()` wire w pipeline runtime | AC-FR-10–14 |
| **F2** | UX CTA + confirm + busy na Kosztorys (+ opcjonalnie banner) | AC-FR-01–05 |
| **F3** | Testy + changelog + PV 08dee335 | AC-FR-20–23, P1–P4 |

**Zakaz w IMPLEMENT:** rozszerzać poza F0–F3; nie wciągać Wariantu C.

---

## 13. Ryzyka (zamrożone mitigacje)

| ID | Ryzyko | Mitigation w DF |
|----|--------|-----------------|
| R1 | Długi ZIP Heavy | Confirm + busy copy |
| R2 | Sync Storm | REUSE onUpdate coalesce; local-first patch force |
| R3 | Miga pusty Kosztorys | Nie nullujemy `kosztorys` |
| R4 | Pętla reskanów | Circuit breaker; CTA znika po fields |
| R5 | False CTA na single | Po force fields wypełnione → CTA OFF; Bid ONE OK |
| R6 | Mylenie z F2 | Osobny label „Uzupełnij odczyty branż” |

---

## 14. Podsumowanie Owner

| Decyzja | Wartość |
|---------|---------|
| Pakiet | **A + D** (CTA + soft invalidate + REUSE Heavy) |
| Invalidate | `forceHeavyRescanAt` + wyjątek w `heavyDone` |
| Label | **Uzupełnij odczyty branż** |
| Flaga | `COST_MULTI_02_FORCE_RESCAN_CTA` |
| OOS | Discovery · parsery · Bid · Aggregate rewrite · Sync · Payroll · auto C |
| Następny krok | **Owner GO IMPLEMENTATION** |

---

**MODE:** DOCS ONLY — Design Freeze gotowy.  
**STOP — czekam na Owner GO do IMPLEMENTATION.**
