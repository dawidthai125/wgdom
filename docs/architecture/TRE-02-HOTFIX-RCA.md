# TRE-02 — HOTFIX RCA (Outcome First · „Trwa wycena…”)

> **ID:** TRE-02-HOTFIX-RCA  
> **INCIDENT:** Outcome First zatrzymuje się na „Trwa wycena…” · brak Recommendation Result z ceną / uczciwym terminalem  
> **MODE:** **RCA ONLY** — **bez** IMPLEMENT · commit · push  
> **PRIORITY:** **P0**  
> **Prod:** UI **2.65.64** · tip **`ac6f9e4`** / feature **`a39533d`**  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Wejścia:** TRE-01 CLOSEOUT · TRE-02 AR/DF/RELEASE/PV FINAL · kod Offer Run / Outcome / Pipeline

```text
════════════════════════════════════════════════════════
WERDYKT RCA: ROOT CAUSE FOUND
Klasa: FRONTEND · Offer Run mapper (deriveOfferRunSnapshot)
NIE: Edge · batch-get/set · 401/403/500 · infra
NIE: TRE-02 zmiana kolejności init (tylko default ON)
Czekaj na Owner GO → HOTFIX
════════════════════════════════════════════════════════
```

---

## 1. Root Cause

**Offer Run traktuje stan `PipelineState.Pricing` (oraz `pricingReadyPartial`) jako wieczny „busy / running”**, nawet gdy wycena Bid **już się domknęła bez użytecznej ceny** (`bidProposal == null` albo `ok: false`, albo `recommendedBidPln` ≤ 0).

W efekcie Outcome renderuje Recommendation Result ze statusem **`running`** i etykietą **`Trwa wycena…`** — **bez terminalnego** przejścia do `insufficient_data` / „Brak rekomendowanej ceny”.

To narusza obietnicę TRE-02 DF **AC-P3** (*Brak ceny → uczciwy status*) oraz Product SSOT (Outcome ma pokazać cenę **albo** uczciwy status — nie nieskończony spinner/label).

**Dlaczego „część przetargów”:** tylko te, gdzie pipeline wchodzi w Pricing (dossier/partial gotowe), a Bid **nie** zwraca `recommendedBidPln > 0` (brak ATH/cen, `ok:false`, `NOT_FOUND` cost gate, zerowa rekomendacja, itd.). Przetargi z poprawną wyceną Bid przechodzą do ceny — stąd PV PASS + incydent selektywny.

**Rola TRE-02:** **wzmacniacz widoczności**, nie nowy silnik. TRE-02 tylko `TRE_01_SLICE_A_DEFAULT=true`. Bug mappera istnieje od TRE-01 Slice A; wcześniej był rzadziej widoczny (Outcome za flagą OFF / Hub-first).

---

## 2. Dokładny plik / funkcja / blok

| | |
|--|--|
| **Plik** | `src/lib/tender-offer-run.ts` |
| **Funkcja** | `deriveOfferRunSnapshot` |
| **Blok** | linie **111–180** (szczególnie **111–119** `busy` + **157–171** gałąź pricing) |

### 2.1 `busy` obejmuje cały `Pricing` jako „w toku”

```111:119:src/lib/tender-offer-run.ts
  const busy =
    signals.autoRunning ||
    signals.dossierBuilding ||
    signals.dossierSaving ||
    signals.pipelineState === PipelineState.Notice ||
    signals.pipelineState === PipelineState.Discovery ||
    signals.pipelineState === PipelineState.External ||
    signals.pipelineState === PipelineState.Heavy ||
    signals.pipelineState === PipelineState.Pricing;
```

`PipelineState.Pricing` jest ustawiane gdy dossier jest gotowe **częściowo/ciężko**, ale **`pricingReadyFinal` jeszcze nie** — a `pricingReadyFinal` wymaga `ownerFinanceProposal?.ok === true` (`derive-pipeline-readiness.ts`).  
Gdy Bid wraca `ok:false` / `null`, stan **zostaje na Pricing na zawsze**.

### 2.2 Gałąź, która maluje „Trwa wycena…” i nigdy nie wychodzi

```157:171:src/lib/tender-offer-run.ts
  } else if (busy || signals.pricingReadyPartial || signals.pricingReadyFinal) {
    if (signals.pipelineState === PipelineState.Pricing || signals.pricingReadyPartial) {
      phase = "pricing";
      phaseLabelPl = "Trwa wycena…";
    } else if (
      signals.pipelineState === PipelineState.Heavy ||
      signals.dossierBuilding
    ) {
      phase = "documents";
      phaseLabelPl = "Analiza dokumentów…";
    } else {
      phase = "documents";
      phaseLabelPl = "Pobieranie dokumentów…";
    }
    lifecycleStatus = "running";
```

Warunek terminalny „Brak rekomendowanej ceny” jest **później** i **nieosiągalny**, gdy `busy`/`pricingReadyPartial`/`pricingReadyFinal` nadal true:

```172:175:src/lib/tender-offer-run.ts
  } else if (signals.pipelineState === PipelineState.Ready && !hasBidRecommendation) {
    phase = "degraded";
    lifecycleStatus = "insufficient_data";
    phaseLabelPl = "Brak rekomendowanej ceny";
```

### 2.3 Definicja „mamy cenę” (Offer Run) vs „pricing ready” (pipeline)

| Warstwa | Warunek „sukcesu” |
|---------|-------------------|
| Offer Run `hasBidRecommendation` | `recommendedBidPln` number && finite && **`> 0`** (`extractRecommendedBidPln`) |
| `pricingReadyPartial/Final` | `ownerFinanceProposal?.ok === true` (+ heavy/metadata) |

Rozjazd: `ok:true` + `recommendedBidPln: 0` → pipeline „ready/partial”, Offer Run **bez** rekomendacji → nadal gałąź **running / Trwa wycena…** (repro C poniżej).

---

## 3. Dlaczego spinner / label nie znika

1. Outcome UI (`TenderRecommendationOutcomeView`) przy braku ceny pokazuje **`result.runPhaseLabelPl`** (nie osobny spinner HTTP).
2. `runPhaseLabelPl` pochodzi ze snapshotu Offer Run.
3. Snapshot zostaje w `lifecycleStatus: "running"` + `phaseLabelPl: "Trwa wycena…"`.
4. React **dostaje** Recommendation Result (`recommendation != null`) — to **nie** jest wiszący `runId` bootstrap (`Trwa wyliczanie…` w `TenderDetailPage`).
5. Każdy re-render z tymi samymi sygnałami (Pricing + brak ceny) **ponownie** mapuje na running → UI „stoi”.

**Nie** jest to `loading=true` z requestu batch, który „zapomniał” o SUCCESS.

---

## 4. Klasyfikacja problemu

| Hipoteza | Werdykt |
|----------|---------|
| **Frontend** | **TAK — ROOT** (`deriveOfferRunSnapshot`) |
| Backend / Edge | **NIE** (HAR: 200; wycena Bid jest **client-side** `computeTenderBidProposal`) |
| Polling batch-get | **NIE** (Offer Run **nie** polluje SUCCESS wyceny; batch = sync KV) |
| React state „loading” zapomniany | **NIE** (stan = derived snapshot `running`) |
| Race / useEffect TRE-02 init order | **NIE** (TRE-02 = tylko default flagi; hooki pipeline nadal mountują się **przed** early-return Outcome) |
| Offer Run | **TAK — ROOT** |
| Outcome UI | **NIE** (poprawnie konsumuje Result; pokazuje phase label) |
| Bid / AI-COST silnik | **NIE root** (brak ceny bywa poprawny; brakuje **terminalnego mapowania**) |
| TRE-02 regression silnika | **NIE** — **regresja UX widoczności** (default ON) |

---

## 5. Przepływ etapami (START → RENDER) + punkt zatrzymania

```text
Lista → TenderDetailPage (tab przetarg)
  → isTre01SliceAEnabled() = true (TRE-02 default)
  → useTenderPipelineRuntime (bootstrap + heavy + pricing auto)   ← DZIAŁA
  → useTenderOfferRun → deriveOfferRunSnapshot                    ← TU ZATRZYMANIE SEMANTYCZNE
  → buildTenderRecommendationResult (quality=running)
  → TenderRecommendationOutcomeView (nagłówek = „Trwa wycena…”)
```

| Etap | Co się dzieje | Status |
|------|----------------|--------|
| **START** | Wejście w detal · Outcome default ON | OK |
| **REQUEST** | Bootstrap dokumentów / heavy (auto) · **brak** osobnego `startAnalysis()` w ścieżce TRE | OK / N/A |
| **RESPONSE** | Edge/KV 200 · item/dossier w stanie; Bid sync `useMemo` | OK (infra) |
| **STATE UPDATE** | `pipelineState=Pricing` lub `pricingReadyPartial` · `hasBidRecommendation=false` | **STUCK MAP** |
| **RENDER** | Outcome: `runPhaseLabelPl="Trwa wycena…"` · `qualityStatus=running` | **UI ZATRZYMANE** |

### 5.1 Czy `startAnalysis()` zawsze jest wywoływane?

**Nie istnieje** funkcja `startAnalysis()` w ścieżce TRE Outcome.  
Odpowiednik: auto `useTenderDocumentsBootstrap` + `useTenderDossierHeavyLazy` + `useTenderPricingAuto` w `useTenderPipelineRuntime` — **uruchamiane** (hooki przed early-return Outcome).

### 5.2 Wcześniejszy return?

- `TenderDetailPage`: early-return Outcome **po** hookach — **nie** blokuje pipeline.
- `deriveOfferRunSnapshot`: **nie** early-return z pipeline; **błędnie** zostaje w gałęzi running.

### 5.3 useEffect pipeline?

Bootstrap/heavy: tak. Offer Run bootstrap Foundation (`runId`): tak — po `runId` Recommendation istnieje (stąd „Trwa **wycena**…”, nie „Trwa **wyliczanie**…”).

### 5.4 Kolejność init po TRE-02?

**Bez zmian** w `TenderDetailPage` / Offer Run. Tylko `TRE_01_SLICE_A_DEFAULT = true`.

### 5.5 Polling batch → SUCCESS?

Niezwiązane z zejściem z „Trwa wycena…”. Frontend **nie** czeka na batch SUCCESS, by ustawić Recommendation gotową.

### 5.6 Backend SUCCESS ignorowany?

**Nie** dla tej etykiety. Sukces wyceny = lokalny Bid `recommendedBidPln > 0`.

### 5.7 Backend nigdy nie zwraca SUCCESS wyceny?

Backend nie jest SSOT tej etykiety. „Sukces” ceny = Bid client-side.

---

## 6. Dowód (repro lokalne)

Skrypt: `.tmp/tre02-hotfix-rca-repro.mjs` (`npx vite-node`)

| Case | Wejście | Wynik `deriveOfferRunSnapshot` |
|------|---------|--------------------------------|
| **A** | `Pricing` + `bid.ok=false` | `pricing` / `running` / **„Trwa wycena…”** |
| **B** | `Pricing` + `bid=null` | `pricing` / `running` / **„Trwa wycena…”** |
| **C** | `Ready` + `pricingReadyFinal/Partial` + `recommendedBidPln=0` | `pricing` / `running` / **„Trwa wycena…”** |
| **D** | `Ready` + `recommendedBidPln=100000` | `ready` / review_required — **OK** |
| **E** | `Idle` + brak bid | „Analiza w toku…” (inna etykieta) |

---

## 7. Mapa pól stanu (loading / ready / …)

| Symbol | Gdzie ustawiane | Rola w incydencie |
|--------|-----------------|-------------------|
| `autoRunning` | `useTenderDocumentsBootstrap` | busy docs — **nie** root „wycena” |
| `dossierBuilding` / `dossierSaving` | heavy lazy | busy docs |
| `pipelineState` | `derivePipelineState` | **Pricing stuck** gdy brak `pricingReadyFinal` |
| `pricingReadyPartial/Final` | `derivePricingReady*` | mogą trzymać gałąź running nawet przy braku ceny Offer Run |
| `bidProposal` | `useTenderPricingAuto` → `computeTenderBidProposal` | `ok:false` / null / pln≤0 = brak rekomendacji |
| `hasBidRecommendation` | `deriveOfferRunSnapshot` | false → nie wychodzi z running w Pricing |
| `lifecycleStatus` / `phase` / `phaseLabelPl` | Offer Run | **stuck `running` + „Trwa wycena…”** |
| `qualityStatus` / `runPhaseLabelPl` | `buildTenderRecommendationResult` | passthrough running |
| `recommendationReady` / `outcomeReady` | **brak** takich flag w kodzie TRE | — |
| `tre01Recommendation` | `useTenderOfferRun` | **non-null** przy stuck (Outcome już widoczny) |
| `data-tre-01-outcome-loading` | tylko gdy `!recommendation` (bootstrap `runId`) | inny string: „Trwa wyliczanie…” |

---

## 8. Minimalny zakres HOTFIX (propozycja — **NIE IMPLEMENTUJ** bez GO)

**Cel:** terminalny Outcome przy braku ceny, bez rewrite Bid/AI-COST/sync/Edge.

| # | Zmiana | Plik |
|---|--------|------|
| H1 | W `deriveOfferRunSnapshot`: gdy **brak** `hasBidRecommendation` **oraz** brak aktywnego I/O (`!autoRunning && !dossierBuilding && !dossierSaving`) **oraz** wycena „osiągalna/zakończona negatywnie” (`pipelineState === Pricing` **lub** `pricingReadyPartial/Final` **lub** `bidProposal?.ok === false` **lub** bid policzony z `recommendedBidPln`≤0) → **`insufficient_data` / degraded** („Brak rekomendowanej ceny” / równoważne AC-P3) zamiast wiecznego `running` + „Trwa wycena…” | `src/lib/tender-offer-run.ts` |
| H2 | Testy regresji: case A/B/C → **nie** `running`/`Trwa wycena…`; case D bez regresji | `scripts/test-tre-01-offer-run.mjs` (+ ewentualnie cienki `test-tre-02-hotfix-*.mjs`) |
| H3 | Changelog patch + tip docs po Owner GO release | `changelog-data.ts` · `CHANGELOG.md` |

**Poza HOTFIX (zakaz bez DF):** Bid calculator rewrite · AI-COST · cloud-sync · Edge · Hub delete · Offer Run V2 · Autonomous · FND-06 · zmiana default TRE-02 (chyba R1 rollback produktowy).

**Opcjonalny mitigation Owner (bez kodu):** R0 `localStorage['kw-tre-01-slice-a']='0'` → Hub-first (objaw Outcome znika; root mapper zostaje).

---

## 9. Ryzyko zmian

| Ryzyko | Poziom | Komentarz |
|--------|--------|-----------|
| Za wczesne `insufficient_data` (docs jeszcze lecą) | **Średnie** | Mitigacja: wymagać `!autoRunning && !dossierBuilding && !dossierSaving` |
| Ukrycie prawdziwego „jeszcze liczę” przy wolnym heavy | **Niskie–średnie** | Heavy ma własne etykiety („Analiza dokumentów…”); nie mylić z Pricing |
| Regresja happy-path z ceną | **Niskie** | Gałąź `hasBidRecommendation` bez zmian kolejności |
| Payroll / sync / Edge | **Brak** przy H1–H2 only |
| Stabilization / #CORE-013 | **Niskie** — thin lib mapper + testy |

---

## 10. Co wykluczono

- Awaria Edge / auth / batch 5xx (fakty Ownera + model kodu).
- TRE-02 zmiana kolejności inicjalizacji `TenderDetailPage`.
- Outcome nie mountuje pipeline (hooki są **przed** return).
- Osobny React `loading` flag nieczyszczony po SUCCESS.
- Potrzeba nowego silnika ceny w HOTFIX.

---

## 11. Następny krok

```text
RCA COMPLETE · ROOT CAUSE FOUND
Czekaj na Owner GO → HOTFIX (H1–H3)
Bez GO: zero IMPLEMENT / commit / push
```

**Koniec TRE-02-HOTFIX-RCA.**
