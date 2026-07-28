# COST-REGRESSION-01 — EPIC A DESIGN FREEZE

> **ID:** COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE  
> **EPIC:** COST-REGRESSION-01 · **CHILD:** **A — F2 Brak kosztorysu w dossier**  
> **STATUS:** **DESIGN FREEZE · Owner GO (architektura)** · **IMPLEMENT ZABLOKOWANY** do Owner GO IMPLEMENTATION  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **UI + orchestracja parse (reuse)** · **#CORE-013** — zero Payroll · zero sync merge rewrite · **zero zmian silnika Bid / COST-PIPELINE / AI Cost**  
> **Wejście:** [`COST-REGRESSION-01-PLAN.md`](COST-REGRESSION-01-PLAN.md) · [`COST-REGRESSION-01-TRACE.md`](COST-REGRESSION-01-TRACE.md) · [`COST-REGRESSION-01-AUDIT.md`](COST-REGRESSION-01-AUDIT.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (EPIC A):
  Gdy brak kosztorysu w dossier (F2) — odkryj dlaczego,
  daj CTA, w razie pliku uruchom re-parse (reuse pipeline),
  rozróżnij komunikaty F2 vs F1.
  NIE obchodzić Bid. NIE ruszać COST-PIPELINE.

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*brak nowych LS kluczy w Epic A)
G3 Cloud Sync:   NIE* (*tylko istniejący persist pipeline item po parse — REUSE; bez nowego merge SSOT)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      TAK* (*deep-link tab Dokumenty / Kosztorysy — istniejący router przetargów)

Wynik: Gate GREEN z uwagi G9 = nawigacja w module Przetargi (bez zmiany shell auth).
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Cel Epic A

| Cel | Opis |
|-----|------|
| **Diagnostyka** | Klasyfikacja F2: `!tenderDossier?.kosztorys?.ok` (brak lub nie-ok) **oraz** nie Epic B |
| **Discovery** | Sprawdź, czy w załącznikach / discovery refs jest kandydat przedmiaru (ATH/XLSX/PDF) |
| **CTA** | Jasna akcja Ownera: dołącz plik **lub** „Ponów analizę kosztorysu” |
| **Re-parse** | REUSE istniejącego toru heavy/partial + `athPreviewToSnapshot` — **tylko** gdy F2 i (opcjonalnie) jest kandydat pliku |
| **Copy** | Outcome/sticky **nie** mylą F2 z F1 ani z „silnik Bid zepsuty” |

**Sukces A ≠** zawsze PLN.  
**Sukces A =** F2 wyjaśnione + ścieżka do snapshotu gdy dane istnieją + komunikaty zgodne z macierzą.

---

## 2. Definicja F2 (zamrożona)

```text
isCostRegressionF2(item) =
  !item.tenderDossier?.kosztorys?.ok
  AND NOT isCostRegressionF1(item)

isCostRegressionF1(item) =   // OOS Epic A — tylko do rozróżnienia copy
  kosztorys?.ok === true
  AND (rows.length === 0)
  AND brak usable catalogQuantities
  AND brak ATH total > 0
```

| Signal F2 (TRACE) | Wartość typowa |
|-------------------|----------------|
| `kosztorysOk` | `null` / falsy |
| `parsedAt` | `null` |
| `sourceFilename` | `null` |
| Bid warning | *Brak kosztorysu ATH/XLSX…* |
| Path | OfferBoq null → Catalog → **F2** |

**Zakaz:** zmieniać `computeTenderBidProposal` early-return F2.

---

## 3. Architecture (zamrożona)

### 3.1 Warstwy

| Warstwa | Rola Epic A | Zmiana Bid? |
|---------|-------------|-------------|
| Classifier F2/F1 (pure helper) | UI + CTA gate | NIE |
| Discovery check (reuse gate/docs) | Czy jest kandydat przedmiaru | NIE |
| CTA / Outcome copy | Macierz komunikatów | NIE |
| Re-parse trigger | Woła **istniejący** bootstrap / heavy parse | NIE (tylko dane dossier) |
| Snapshot | `athPreviewToSnapshot` REUSE | NIE |
| Wycena | istniejący `useTenderPricingAuto` po nowym dossier | NIE (konsument) |

### 3.2 Zamrożone warianty z PLAN

| ID | Status w DF |
|----|-------------|
| **A-V1** Diagnostyka + CTA UX | **IN SCOPE — MUST** |
| **A-V2** Re-parse (reuse pipeline) | **IN SCOPE — MUST** gdy discovery znajdzie kandydata **lub** Owner wymusza po upload |
| **A-V3** Batch audit załączników | **OOS IMPLEMENT A** (opcjonalny Evidence Gate / skrypt READ — osobny GO) |
| **A-V4** Fałszywy Bid bez kosztorysu | **ZAKAZ** |
| **A-V5** ensure bez snapshotu | **ZAKAZ / niewykonalne** |

### 3.3 Reguły twarde

1. **Zero** zmian `tenders-bid-calculator.ts` kontraktu F1–F4.  
2. **Zero** zmian `resolveTenderPricingAutoProposal` / flaga COST-PIPELINE.  
3. **Zero** zmian AI Cost / OfferBoq engines / CATALOG-BID ensure semantyki.  
4. Re-parse **tylko** gdy `isCostRegressionF2` — **nie** nadpisuj tenderów z `kosztorys.ok` i ceną.  
5. Epic B (pusty snapshot) — **tylko** inne copy; **bez** logiki recovery PDF w Epic A.  
6. Persist wyniku parse — **wyłącznie** istniejący zapis itemu pipeline (REUSE); bez nowego klucza KV.

---

## 4. Diagram przepływu (zamrożony)

```text
                    ┌─────────────────────────┐
                    │  Tender item (pipeline) │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  Classifier             │
                    │  F2? / F1? / OK?        │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ F1 (Epic B)     │ OK / ma PLN     │ F2 (Epic A)
              ▼                 ▼                 ▼
         [OOS A — copy]    [bez zmian]   ┌──────────────────┐
                                         │  DISCOVERY       │
                                         │  kandydat        │
                                         │  przedmiaru?     │
                                         └────────┬─────────┘
                              ┌───────────────────┼───────────────────┐
                              │ NIE (brak pliku)  │ TAK / po upload   │
                              ▼                   ▼                   │
                    ┌─────────────────┐   ┌─────────────────┐         │
                    │ CTA: Dołącz     │   │ CTA: Ponów      │◄────────┘
                    │ ATH/XLSX/PDF    │   │ analizę         │
                    │ → tab Dokumenty │   │ kosztorysu      │
                    └────────┬────────┘   └────────┬────────┘
                             │                     │
                             │ upload              │ Owner click
                             │                     ▼
                             │            ┌─────────────────┐
                             └───────────►│  RE-PARSE       │
                                          │  (reuse heavy / │
                                          │   bootstrap)    │
                                          └────────┬────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              parse w toku   parse FAIL    parse OK
                                    │              │              │
                                    ▼              ▼              ▼
                              UI: „Trwa…”   UI: nieudany   NOWY SNAPSHOT
                                                              │
                                                              ▼
                                                    useTenderPricingAuto
                                                    (BEZ zmian logiki)
                                                              │
                                              ┌───────────────┼───────────────┐
                                              ▼               ▼               ▼
                                           PLN > 0      nadal F2/F1      inny warning
                                           wycena OK    (copy wg macierzy)
```

**Zasada:** wycena **zawsze** przez istniejący tor po aktualizacji dossier — Epic A **nie** woła `computeTenderBidProposal` z nowymi parametrami.

---

## 5. Discovery (zamrożona semantyka)

### 5.1 Pytanie discovery

„Czy w kontekście tendera jest **kandydat przedmiaru** do parse?”

### 5.2 Źródła (REUSE — nie nowy crawler)

| Źródło | Użycie |
|--------|--------|
| Dokumenty już w item / dossier | Pierwszeństwo |
| Unified attachment / heavy-eligible refs | REUSE gate NG-02 |
| Wynik `runTenderFullDocumentDiscovery` / bootstrap | REUSE — **tylko** trigger, nie rewrite discovery |

### 5.3 Wynik discovery (enum UI)

| Kod | Znaczenie | CTA primary |
|-----|-----------|-------------|
| `no_candidate` | Brak pliku ATH/XLSX/PDF przedmiaru | Dołącz dokument |
| `candidate_ready` | Jest kandydat, brak/nieaktualny kosztorys | Ponów analizę |
| `parse_running` | Heavy/partial w toku | Brak drugiego re-parse (disable) |
| `parse_failed` | Ostatni parse zakończony błędem / bez snapshotu | Ponów / zmień plik |

**Nie** traktuj Epic B (`ok` + 0 rows) jako `no_candidate`.

---

## 6. Re-parse (zamrożona semantyka)

| Reguła | Wartość |
|--------|---------|
| Trigger | CTA „Ponów analizę kosztorysu” **lub** auto po upload przedmiaru w stanie F2 |
| Guard | `isCostRegressionF2(item) === true` |
| Implementacja | **REUSE** istniejącego toru parse (bootstrap / pipeline runtime) — bez nowego parsera |
| Snapshot | Istniejące `athPreviewToSnapshot` (+ CATALOG-BID ensure już w torze) |
| Po sukcesie | Normalny recompute Bid (hook) |
| Po porażce | Stan `parse_failed` + macierz copy |
| Concurrent | Max **1** re-parse per tender (disable CTA) |

**Zakaz:** masowy re-parse wszystkich F2 bez Owner GO (storm).

---

## 7. Macierz komunikatów UI (zamrożona)

### 7.1 Outcome / Offer Run / sticky (warstwa wyceny)

| Stan | Warunek | `phaseLabelPl` / primary copy (PL) | Secondary / hint |
|------|---------|--------------------------------------|------------------|
| **Brak pliku** | F2 ∧ `no_candidate` | **Brak przedmiaru w dokumentach** | „Dołącz ATH, XLSX lub PDF przedmiaru — bez tego nie da się wyliczyć oferty.” |
| **Parse w toku** | F2 ∧ `parse_running` | **Trwa analiza kosztorysu…** | „Po zakończeniu wycena uruchomi się automatycznie.” |
| **Parse nieudany** | F2 ∧ `parse_failed` | **Nie udało się odczytać kosztorysu** | „Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.” |
| **Parse zakończony** (sukces) | `kosztorys.ok` ∧ wycena PLN>0 | **Rekomendacja gotowa** (istniejący happy path) | — |
| **Parse zakończony** (nadal brak PLN) | snapshot jest, ale Bid bez ceny | **Nie** „Brak przedmiaru…” | Przekaż do klasyfikacji F1 / innych warningów (**Epic B** copy) — nie zostawiaj F2 |
| **Legacy (przed A)** | `pricingSettledWithoutBid` ogólny | ~~Brak rekomendowanej ceny~~ | **Zastąp** gdy wykryto F2 — unikaj mylącego ogólnego stringu |

### 7.2 Rozróżnienie F2 vs F1 (obowiązkowe)

| | **F2 (Epic A)** | **F1 (Epic B — tylko copy)** |
|--|-----------------|------------------------------|
| Dane | Brak / nie-ok `kosztorys` | `ok` + 0 rows + 0 qty |
| Primary copy | Brak przedmiaru / nieudany odczyt / w toku | **Przedmiar bez pozycji** (lub równoważne) |
| CTA | Dołącz plik / Ponów analizę | Inny (Epic B DF) — w Epic A wystarczy **nie** używać copy F2 |

### 7.3 CTA (UI)

| Stan | Primary CTA | Secondary |
|------|-------------|-----------|
| Brak pliku | **Dołącz przedmiar** → tab Dokumenty | — |
| Candidate ready | **Ponów analizę kosztorysu** | Dołącz inny plik |
| Parse w toku | disabled + spinner | — |
| Parse nieudany | **Ponów analizę** | Dołącz inny plik |

`data-*` (propozycja allowlist):  
`data-cost-regression-f2` · `data-cost-regression-discovery` · `data-cost-regression-reparse-cta`

---

## 8. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-A1** | Pure `isCostRegressionF2` / rozróżnienie od F1 — test fixture TRACE |
| **AC-A2** | F2 + brak kandydata → copy **Brak przedmiaru…** + CTA Dokumenty; **nie** „silnik zepsuty” |
| **AC-A3** | F2 + kandydat → CTA **Ponów analizę**; klik uruchamia re-parse (reuse) |
| **AC-A4** | Podczas re-parse → copy **Trwa analiza…**; CTA disabled |
| **AC-A5** | Re-parse FAIL → copy **Nie udało się odczytać…** + CTA Ponów |
| **AC-A6** | Re-parse OK → pojawia się `kosztorys` (ok lub jawny F1); Bid przez istniejący hook |
| **AC-A7** | Tender z PLN>0 (fixture OK) — **bez** zmiany `recommendedBidPln` po samym wdrożeniu A (brak auto re-parse) |
| **AC-A8** | F1 fixture (paczka VIII) — copy **nie** jest F2 „brak przedmiaru w dokumentach” (plik jest) |
| **AC-A9** | Diff: **brak** zmian `tenders-bid-calculator` F1–F4 · `useTenderPricingAuto` resolve · COST-PIPELINE flag |
| **AC-A10** | `npm run build` PASS · test pure classifier + copy matrix |
| **AC-A11** | Guard: re-parse **nie** startuje gdy `!isCostRegressionF2` |

---

## 9. Rollback

| Element | Rollback |
|---------|----------|
| Copy / CTA | Revert UI → poprzedni ogólny „Brak rekomendowanej ceny” |
| Classifier helper | Usuń import; brak side effects danych |
| Re-parse wiring | Odłącz CTA; pipeline wraca do ręcznego flow |
| Dane po udanym re-parse | **Zostają** (pożądane); awaryjnie restore item z backup Ownera |
| Regresja Bid PLN | Natychmiastowy revert bundle A (nie „patchuj” kalkulatora) |

---

## 10. Allowlist (IMPLEMENT — po Owner GO)

| Plik / obszar | Zakres |
|---------------|--------|
| Nowy pure helper np. `src/lib/cost-regression-f2.ts` (lub `kosztorys/`) | `isCostRegressionF2` · `isCostRegressionF1` (read-only classify) · discovery status enum |
| Outcome / Offer Run UX | Macierz copy F2 (`tender-offer-run` **prezentacja** lub warstwa nad snapshotem — **bez** zmiany extract PLN) |
| Sticky / Kosztorysy empty | Spójny copy F2 gdy brak OfferBoq przez F2 |
| CTA UI (Detail / Kosztorysy / Outcome) | Deep-link Dokumenty · trigger re-parse |
| Wiring re-parse | REUSE `useTenderDocumentsBootstrap` / pipeline runtime / istniejący heavy — **thin adapter** |
| `scripts/test-cost-regression-01-epic-a.mjs` | AC classifier + copy matrix |
| Changelog + docs closeout | wersja UI przy release |

**Zakaz allowlist:**  
`tenders-bid-calculator.ts` (logika F1–F4) · `useTenderPricingAuto.ts` (`resolveTenderPricingAutoProposal`) · OfferBoq pricing engines · `tenders-bzp-brief` ensure rewrite · cloud-sync merge · Edge · Payroll · Epic B PDF OCR · parser rewrite.

---

## 11. Out of Scope (twarde)

| Obszar | Status |
|--------|--------|
| **EPIC B** (pusty snapshot / PDF Case) | **OOS** |
| Parser rewrite / nowy silnik PDF | **OOS** |
| AI Cost engines | **OOS** |
| Bid Proposal / `computeTenderBidProposal` kontrakt | **OOS** |
| COST-PIPELINE wire / flaga | **OOS** |
| Payroll | **OOS** |
| Cloud Sync (nowy merge / nowe klucze) | **OOS** |
| Batch auto-repair wszystkich F2 | **OOS** (A-V3 osobny GO) |
| Fałszywy Bid bez kosztorysu | **ZAKAZ** |
| WAVE 2 density / search | **OOS** |

---

## 12. Ryzyka

| Ryzyko | Prawdopodobieństwo | Mitygacja DF |
|--------|-------------------|--------------|
| CTA re-parse na złym tenderze nadpisze dossier | Średnie | Guard `isCostRegressionF2` · AC-A11 |
| Copy F2 na F1 (plik jest, 0 rows) | Średnie | Classifier + AC-A8 |
| Storm parse | Niskie–średnie | 1× per tender · brak batch w A |
| Owner oczekuje zawsze PLN po A | Wysokie (produkt) | Copy: sukces = „analiza”, nie gwarancja ceny |
| Scope creep Epic B w A | Średnie | OOS twarde · osobny DF B |
| Zmiana `deriveOfferRunSnapshot` psuje TRE | Średnie | Preferuj warstwę prezentacji nad zmianą extract PLN; test TRE labels |

---

## 13. Kolejność IMPLEMENT (po Owner GO)

| Krok | Deliverable |
|------|-------------|
| M0 | Owner GO IMPLEMENTATION |
| M1 | Pure classifier F2/F1 + testy |
| M2 | Macierz copy Outcome/sticky + CTA Dokumenty (A-V1) |
| M3 | Discovery status + CTA Ponów (wiring) |
| M4 | Re-parse trigger + stany running/failed (A-V2) |
| M5 | Build · changelog · PV |

Thin slices; po M2 już wartość diagnostyczna bez re-parse.

---

## 14. STOP

```text
DESIGN FREEZE COMPLETE — COST-REGRESSION-01 EPIC A (F2)
Dokument: docs/architecture/COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md

Flow: F2 → Discovery → Re-parse → Snapshot → Wycena (reuse)
Macierz: brak pliku · w toku · nieudany · zakończony
Bid / COST-PIPELINE / Epic B / Parser rewrite = OOS

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
