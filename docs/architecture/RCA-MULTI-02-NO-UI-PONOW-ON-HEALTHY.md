# RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY

> **ID:** RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY  
> **EPIC powiązany:** COST-MULTI-02 (IMPLEMENT COMPLETE · architektonicznie PASS)  
> **STATUS:** **AUDIT PASS · DESIGN FREEZE GOTOWY** · IMPLEMENT ZABLOKOWANY do Owner GO IMPLEMENTATION  
> **MODE:** DOCS ONLY · READ ONLY · **bez kodu · bez commit · bez push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Wejście:** [`COST-MULTI-02-DESIGN-FREEZE.md`](COST-MULTI-02-DESIGN-FREEZE.md) · [`COST-MULTI-02-CLOSEOUT.md`](COST-MULTI-02-CLOSEOUT.md) · [`../verification/COST-MULTI-02-PRODUCTION-VERIFY-08dee335.md`](../verification/COST-MULTI-02-PRODUCTION-VERIFY-08dee335.md)  
> **Design Freeze:** [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
Problem operacyjny (nie regresja formuł Bid):

  Healthy dossier (kosztorys.ok + parserVersion aktualny)
  → brak CTA „Ponów analizę” / „Spróbuj ponownie”
  → retryDossierParse nie startuje Heavy (heavyDone short-circuit)
  → brak costCandidateSources / branchWinnerArtifacts w starym KV
  → resolveCostBidInput = ONE → Bid legacy (~292k na 08dee335)

  mimo że COST-MULTI-02 (2.65.75) jest na prod i po świeżym heavy
  daje AGGREGATE (~1,06 mln na tym samym fixture).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (dla przyszłego IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*ew. flaga UI / token invalidate — bez nowego DATA_KEYS)
G3 Cloud Sync:   NIE* (*bez edycji cloud-sync.ts; persist itemu pipeline jak dziś)
G4–G9:           NIE (Payroll / routing / shell)

Wynik: Gate GREEN na etapie Design.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Root Cause

### 1.1 Werdykt

**Root Cause = złożenie dwóch zamierzonych (historycznie) bezpieczników:**

| Warstwa | Mechanizm | Skutek na healthy dossier |
|---------|-----------|---------------------------|
| **A. UX** | CTA „Ponów” tylko w stanach F2 / fail / stale | Przy `kosztorys.ok` użytkownik **nie widzi** przycisku |
| **B. Runtime** | `tenderDossierHeavyParseDone` short-circuit w E-RUN | Nawet wywołanie `retryDossierParse` **nie uruchamia** Heavy |

To **nie** jest:

- Feature Flag COST-MULTI-02 (flaga ON, resolver działa po świeżym heavy)
- awaria Discovery / parserów
- zmiana Bid / OfferBoq
- brak ZIP w dokumentach (ZIP jest; PV potwierdził 4 PDF branżowe)

To **jest** luka produktowa po COST-MULTI-02: nowa semantyka wymaga **reskanu addycyjnego** (`costCandidateSources` + `branchWinnerArtifacts`), a stary kontrakt „Heavy Done = koniec” tego nie przewiduje.

### 1.2 Łańcuch przyczynowy (fixture `08dee335`)

```text
KV dossier (2026-07-23)
  parserVersion = CURRENT (4)
  kosztorys.ok = true (Pensjonat / ONE)
  scanSummary.costCandidateSources = brak
  scanSummary.branchWinnerArtifacts = brak
        │
        ▼
tenderDossierHeavyParseDone(dossier) === true
        │
        ├─► deriveKosztorysTechnicalPhase → e9 (ready)
        │     showRetry = false  (tylko e11)
        │
        ├─► isCostRegressionF2 → false (bo kosztorys.ok)
        │     primaryCta "reparse" NIE renderuje się
        │
        └─► useTenderDossierHeavyLazy E-RUN:
              if (heavyDone) return;   ← retryNonce bez znaczenia
        │
        ▼
CostPackage.resolve → single / BEST_SINGLE (tylko legacy source)
resolveCostBidInput → ONE
Bid → ~292 800 PLN
```

Po **równoważniku Ponów** (local heavy, PV 2026-07-28): 4 sources + 4 artifacts → `AGGREGATE` → Bid **1 061 000 PLN**. Architektura 02 działa; **operacyjnie nie da się jej „włączyć” z UI na healthy item**.

### 1.3 Dowody w kodzie (SSOT)

**Heavy Done (twarda brama):**

```183:188:src/lib/tender-dossier-pipeline.ts
export function tenderDossierHeavyParseDone(dossier: TenderDossier | null | undefined): boolean {
  if (!dossier) return false;
  if (dossier.parserVersion !== CURRENT_PARSER_VERSION) return false;
  if (!dossier.kosztorys?.ok && !dossier.scanSummary?.parsedAt) return false;
  return true;
}
```

**E-RUN short-circuit (retry nie przebija):**

```180:188:src/app/hooks/useTenderDossierHeavyLazy.ts
    const live = itemRef.current;
    if (tenderDossierHeavyParseDone(live.tenderDossier)) {
      setPartialPersistPending(false);
      // ...
      return;
    }
```

`retryDossierParse` jedynie czyści inflight + `retryNonce++` — **nie** invaliduje dossier, **nie** omija `heavyDone`.

**Status bar — retry tylko na fail (e11) lub health stale/timeout:**

```157:157:src/lib/tender-kosztorys-process-phase.ts
    showRetry: technicalId === "e11",
```

```295:296:src/lib/tender-kosztorys-process-phase.ts
  if (heavyDone) {
    return kosztorysOk ? { technicalId: "e9" } : { technicalId: "e10" };
```

```187:187:src/lib/tender-kosztorys-process-health.ts
  const showRetry = (status === "stale" || status === "timeout") && !session.dossierParseFailed;
```

**F2 „Ponów analizę kosztorysu” — tylko gdy F2 aktywne (brak ok kosztorysu):**

```150:151:src/lib/cost-regression-f2.ts
  if (item.tenderDossier?.kosztorys?.ok) return false;
  return !isCostRegressionF1(item);
```

Przy healthy ONE F2 = OFF → brak CTA „Ponów analizę kosztorysu” w Outcome / sticky / empty.

**Pipeline retry „heavy” nie czyści dossier:**

```13:18:src/lib/tender-pipeline/tender-pipeline-retry.ts
export function retryTenderPipelinePhase(itemId: string, scope: PipelineRetryScope): void {
  clearDossierInflightForItem(itemId);
  if (scope === "heavy") return;
  // discovery/full — reset bootstrap; heavy-only = no-op na danych
}
```

### 1.4 Klasyfikacja blokady

| Hipoteza | Werdykt |
|----------|---------|
| `heavyDone` | **TAK — twarda brama runtime** |
| dossier status (e9 ready) | **TAK — UX; `showRetry=false`** |
| UX (F2 tylko przy braku kosztorysu) | **TAK — drugi niezależny filtr CTA** |
| Feature Flag MULTI-02 | **NIE** (flaga ON; problem bez flagi też by istniał dla artefaktów) |
| Discovery / parser | **NIE** (po force heavy działają) |
| Bid / OfferBoq | **NIE** (konsumują wejście; nie blokują reskanu) |

---

## 2. Analiza obecnego UX

### 2.1 Gdzie w ogóle jest „Ponów”

| Powierzchnia | Etykieta | Warunek widoczności |
|--------------|----------|---------------------|
| `KosztorysProcessStatusBar` | „Spróbuj ponownie” | `phase.showRetry` (e11) **lub** health stale/timeout |
| F2 empty / sticky / Outcome | „Ponów analizę kosztorysu” | `isCostRegressionF2` + `primaryCta === "reparse"` |
| MULTI-02 banner copy | tekst „uruchom Ponów analizę…” | gdy HOLD / missing artifacts — **bez** własnego przycisku force |

### 2.2 Co widzi użytkownik na healthy 08dee335 (PV Playwright)

- Faza procesu: ready / healthy (`data-kosztorys-health` bez retry)
- Brak „Ponów” / „Spróbuj ponownie” w DOM
- Dostępne: „Analiza”, „Przejdź do analizy” (ścieżka autonomiczna / nawigacja — **nie** tożsame z force Heavy + artefakty MULTI-02)
- Brak bannerów MULTI-01/02 (CostPackage = `single` bez `costCandidateSources`)

### 2.3 Semantyka biznesowa luki

| Oczekiwanie po COST-MULTI-02 | Rzeczywistość healthy |
|------------------------------|------------------------|
| Po deploy: możliwość zbudowania Aggregate | Stary ONE w KV wygląda „gotowy” |
| CTA + Heavy → artefakty → AGGREGATE Bid | Brak CTA; Heavy nie startuje |
| Copy HOLD mówi „Ponów” | Przy AS-IS nawet nie ma HOLD (bo `single`) |

**Wniosek UX:** komunikaty MULTI-02 zakładają istnienie CTA, którego healthy path **nie eksponuje**.

---

## 3. Możliwe rozwiązania (Design Proposal)

**Wspólne zakazy (wszystkie warianty):**

- nie zmieniać Discovery turniej ONE  
- nie zmieniać algorytmów ZIP/ATH/PDF/XLSX  
- nie zmieniać formuł Bid / OfferBoq  
- nie edytować `cloud-sync.ts` / Payroll  
- nie przepisywać COST-MULTI-02 resolvera (tylko **wejście** Heavy / UX force)

**Wspólny warunek sukcesu:**

```text
Po akcji użytkownika (lub auto-refresh):
  Heavy cost phase przebiega z pełną listą costCandidates
  → scanSummary.costCandidateSources N≥2 (gdy multi)
  → branchWinnerArtifacts z usable snapshotami
  → resolveCostBidInput może przejść w AGGREGATE
  → dossier.kosztorys (ONE Discovery) pozostaje bez nadpisania Aggregatem
```

---

### Wariant A — Nowe CTA „Wymuś ponowną analizę” (+ soft invalidate)

**Opis:** Jawny przycisk na Kosztorys (i opcjonalnie Outcome) widoczny gdy:

- `heavyDone && kosztorys.ok`, **oraz**
- sygnał MULTI: `costCandidateSources` puste **lub** `branchWinnerArtifacts` niepełne przy podejrzeniu multi (np. ≥2 kandydatów z nazw plików / ZIP inners już znanych z dokumentów), **lub**
- Owner/Super Admin zawsze (węższy ACL — opcjonalnie)

Akcja:

1. Soft-invalidate dossier **tylko** pod Heavy: np. wyczyść `scanSummary.parsedAt` + ustaw `parserVersion` stale **albo** flaga sesji `forceHeavyRescanToken` + tymczasowe `kosztorys` zachowane w UI shadow  
2. Wywołaj istniejący `retryDossierParse` **po** invalidate, tak by `tenderDossierHeavyParseDone === false`  
3. Prefer: **nie** kasować ONE z UI natychmiast (loading overlay); po heavy merge jak dziś

| Kryterium | Ocena |
|-----------|--------|
| UX | **Wysoki plus** — użytkownik rozumie intencję; zgodne z copy MULTI-02 |
| Wydajność | 1× Heavy na żądanie (PDF×N) — akceptowalne, jawne |
| KV | Update `tenderDossier` jak po normalnym heavy (istniejący persist) |
| Regresja | Niskie jeśli invalidate jest wąski (nie Discovery); ryzyko Sync Storm jeśli podwójny cloud write — reuse istniejącego coalescingu |
| Rollback | Ukryć CTA / flaga `FORCE_HEAVY_RESCAN_CTA=false` |

**Ryzyko własne:** przypadkowy klik → długi reskan; mitigacja: confirm dialog + busy state.

---

### Wariant B — Invalidate Heavy / session cache + ponowny Heavy (bez nowego copy)

**Opis:** Rozszerzyć `retryTenderPipelinePhase(..., "heavy")` + `retryDossierParse` tak, by **zawsze** unieważniały warunek `heavyDone` (np. bump `forceRescanGeneration` w itemie / sessionStorage + short-circuit omija gdy `force`).

CTA: reuse istniejącego „Spróbuj ponownie” / F2 label — pokazać też na e9 gdy `needsMulti02Artifacts`.

| Kryterium | Ocena |
|-----------|--------|
| UX | Średni — etykieta „Spróbuj ponownie” myląca przy sukcesie; lepiej zmienić label gdy force |
| Wydajność | Jak A |
| KV | Jak A |
| Regresja | **Średnie/wysokie** — zmiana semantyki globalnego retry wpływa na wszystkie ścieżki fail/stale; łatwo odblokować niechciane pętle Heavy |
| Rollback | Trudniejszy (zmiana core retry) — wymaga feature flag wokół invalidate |

**Uwaga:** Samo „Invalidate session artifact cache” (NG11-A2) **nie wystarczy** — cache jest session-only i często OFF; brama to `heavyDone` na dossier w stanie itemu, nie LRU.

---

### Wariant C — Background Refresh po wersji / fingerprint MULTI-02

**Opis:** Przy wejściu w Kosztorys / po deploy tip:

- jeśli `COST_MULTI_02_AGGREGATE_BID` ON  
- i `heavyDone`  
- i brak `branchWinnerArtifacts` / `costCandidateSources`  
- i dokumenty sugerują multi (ZIP z ≥2 PDF przedmiar / lista plików)

→ **auto** soft-invalidate + Heavy w tle (bez kliknięcia), z bannerem „Uzupełniam odczyty branż…”.

Opcjonalnie: tylko gdy `parserVersion` bump **lub** nowy fingerprint `multi02ArtifactSchemaVersion`.

| Kryterium | Ocena |
|-----------|--------|
| UX | Wygodne, ale zaskoczenie (CPU/sieć); trudniejszy mental model |
| Wydajność | **Wysoki koszt** — reskan wielu przetargów przy nawigacji / bootstrap |
| KV | Masowe zapisy dossier — ryzyko Sync Storm / thundering herd |
| Regresja | Wysokie (koszt, race z edycją użytkownika, baterie mobile) |
| Rollback | Flaga OFF zatrzymuje auto; już zapisane artefakty zostają (OK) |

**Rekomendacja względem C:** tylko jako **Phase 2** (scoped: jeden item po otwarciu detail, nigdy lista).

---

### Wariant D (uzupełniający) — CTA tylko z banneru MULTI-01/02

**Opis:** Nie zmieniać globalnego status bara; dodać primary button w `CostMultiPackageBanner` / HOLD overlay: „Uzupełnij odczyty branż (Heavy)”.

Warunek widoczności węższy: tylko gdy MULTI-01 widzi multi **lub** gdy po nazwach plików w ZIP da się podejrzewać multi mimo `single` (heurystyka — ostrożnie).

Dla 08dee335 AS-IS CostPackage=`single` (brak sources) — **heurystyka nazw z dokumentów** albo najpierw lekki „enumerate ZIP inners” bez pełnego parse (może być OOS jeśli zbyt blisko Discovery).

| Kryterium | Ocena |
|-----------|--------|
| UX | Dobry kontekst; słaby gdy banner się nie pokazuje (jak AS-IS single) |
| Wydajność / KV / rollback | Jak A |
| Regresja | Niska jeśli tylko banner |

**Wniosek:** D dobrze jako **miejsce CTA**, ale AS-IS wymaga albo A (CTA zawsze przy missing artifacts schema), albo lekkiego sygnału „multi suspected”.

---

## 4. Rekomendacja

### 4.1 Preferowany kierunek: **A + D (CTA jawne + soft invalidate)**

```text
1) Nowy kontrakt: forceHeavyRescan(item)
   - ustawia heavyDone = false bez kasowania Discovery ONE na stałe
   - potem retryDossierParse / E-RUN normalną ścieżką
2) CTA widoczne na healthy gdy:
   - brak costCandidateSources LUB brak branchWinnerArtifacts
   - (opcjonalnie AND) dokumenty zawierają ZIP/≥2 kandydatów kosztowych
3) Label: „Wymuś ponowną analizę” / „Uzupełnij odczyty branż”
4) Confirm + busy + telemetria (start/end/error)
5) Flaga: COST_MULTI_02_FORCE_RESCAN_CTA (default true po Owner GO)
```

**Dlaczego nie B jako first:** zbyt szeroka zmiana semantyki retry.  
**Dlaczego nie C jako first:** koszt i Sync Storm; PV pokazał, że **jeden** świadomy reskan wystarcza.

### 4.2 Co świadomie NIE robić w v1

- Auto-rescan całej listy przetargów  
- Nadpisanie `dossier.kosztorys` Aggregatem  
- Omijanie parserów „w tle Bid”  
- Zmiana `tenderDossierHeavyParseDone` bez ścieżki force (złamałoby Sync Storm / anti-reentry)

---

## 5. Ryzyka

| ID | Ryzyko | Mitigation |
|----|--------|------------|
| R1 | Force Heavy przy dużym ZIP (45 MB+) — długi wait | Busy UI, nie blokować całej app, timeout messaging |
| R2 | Sync Storm (local vs cloud overwrite) | Reuse istniejący persist coalesce; nie nowy batch-set pattern |
| R3 | Utrata ONE w UI podczas reskanu | Soft invalidate; trzymać poprzedni snapshot do podmiany |
| R4 | Pętla reskanów | Circuit breaker `HEAVY_MAX_RUNS_PER_KEY` już istnieje — nie obchodzić |
| R5 | Heurystyka „multi suspected” false positive | CTA zawsze dostępne dla Super Admin; dla innych — tylko missing MULTI-02 fields |
| R6 | Użytkownik myli force z Discovery | Copy: „nie zmienia wyboru ONE; uzupełnia branże do wyceny” |

---

## 6. Plan implementacji (wysoki poziom) — **po Owner GO**

```text
Etap 0 — Design Freeze krótkiego epiku (np. COST-MULTI-02-FORCE-RESCAN)
  Gate GREEN · zakazy OOS jak wyżej · AC + rollback

Etap 1 — Lib force
  forceInvalidateDossierForHeavyRescan(item) → patch dossier
  tak by tenderDossierHeavyParseDone === false
  BEZ ruszania discoverBestCostDocument

Etap 2 — Wire retry
  forceHeavyRescan() = invalidate + retryDossierParse
  test jednostkowy: healthy → force → E-RUN start (mock)

Etap 3 — UX CTA
  Status bar / banner MULTI / Outcome (minimal surface)
  Confirm · busy · data-attr do PV

Etap 4 — Testy + PV
  Fixture 08dee335: AS-IS ONE → CTA → AGGREGATE
  Single-branch: force nie psuje Bid (ONE)
  Rollback flaga OFF

Etap 5 — Release
  changelog · VERIFY FAST · closeout
```

**Szacunek:** mały epic UI+orchestracja (nie parser).  
**Zależności:** COST-MULTI-02 CLOSED (już).  
**Następny krok procesowy:** Owner GO na Design Freeze / wybór wariantu (rekomendacja **A+D**).

---

## 7. Acceptance Criteria (dla przyszłego IMPLEMENT)

| ID | Kryterium |
|----|-----------|
| AC-F1 | Healthy dossier z `kosztorys.ok` pokazuje CTA force gdy brak MULTI-02 artifacts/sources (albo zawsze Super Admin) |
| AC-F2 | Klik CTA → Heavy startuje mimo wcześniejszego `heavyDone === true` |
| AC-F3 | Po sukcesie: `costCandidateSources` i `branchWinnerArtifacts` wypełnione (gdy multi) |
| AC-F4 | `resolveCostBidInput` może przejść w `AGGREGATE` na 08dee335 |
| AC-F5 | `dossier.kosztorys` nadal ONE Discovery (Pensjonat), nie Aggregate |
| AC-F6 | Flaga OFF → brak CTA / brak force; zachowanie 2.65.75 |
| AC-F7 | Brak zmian Discovery / parserów / Bid formulas / Payroll / cloud-sync.ts |

---

## 8. Podsumowanie dla Ownera

| Pytanie | Odpowiedź |
|---------|-----------|
| Dlaczego brak „Ponów”? | Healthy = e9 + F2 OFF → UI celowo bez retry |
| Co blokuje Heavy? | `tenderDossierHeavyParseDone` na początku E-RUN |
| Flaga? | Nie |
| Da się Force bez naruszania OOS? | **Tak** — soft invalidate + istniejący Heavy |
| Rekomendacja | **Wariant A (+ D)** — jawne CTA + wąski invalidate |
| Teraz | **STOP** — czekamy na Owner GO (Design Freeze / IMPLEMENT) |

---

**MODE:** DOCS ONLY — dokument zapisany; **brak implementacji, commit, push.**
