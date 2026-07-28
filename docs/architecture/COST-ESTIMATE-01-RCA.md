# WGDOM — RCA COST-ESTIMATE-01

> **ID:** COST-ESTIMATE-01-RCA  
> **MODE:** **RCA ONLY** — **bez** IMPLEMENT · commit · push  
> **Kontekst:** po **TRE-02-HOTFIX-01** (Outcome OK · „Trwa wycena…” naprawione · Recommendation Result z ceną)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Prior HOTFIX:** [`TRE-02-HOTFIX-01-CLOSEOUT.md`](TRE-02-HOTFIX-01-CLOSEOUT.md) · [`TRE-02-HOTFIX-RCA.md`](TRE-02-HOTFIX-RCA.md)

```text
════════════════════════════════════════════════════════
WERDYKT RCA: ROOT CAUSE FOUND
Klasa: ARCHITECTURE / SSOT SPLIT (nie regresja HOTFIX-01)
Problem NIE jest w deriveOfferRunSnapshot (TRE mapper).
FOUND_NO_VALUE + null + fallback = poprawny SSOT wartości
  INWESTORSKIEJ z ATH bez cen — niezależny od Bid PLN.
„Pełny kosztorys” ≠ Recommendation Result (dwa pipeline’y).
════════════════════════════════════════════════════════
```

---

## 0. Objawy (Owner)

| Objaw | Status w kodzie |
|-------|-----------------|
| Outcome działa · cena Bid widoczna | OK — osobny pipeline Bid |
| „Trwa wycena…” naprawione | OK — HOTFIX-01 |
| ATH sparsowane · status Gotowe | OK — dossier / Kosztorys Pro |
| `resolvedCostStatus = FOUND_NO_VALUE` | **Oczekiwane** przy ATH bez cen jednostkowych |
| `resolvedTenderValuePln = null` | **Oczekiwane** — SSOT nie bierze Bid |
| `valueSource = fallback` | **Oczekiwane** — gałąź FOUND_NO_VALUE w `resolveTenderValue` |
| „Pokaż pełny kosztorys” nie pokazuje „kompletnego” kosztorysu | **Luka produktowa / rozjazd pipeline’ów** — nie uszkodzony mapper Outcome |

---

## 1. Gdzie powstaje Full Cost Estimate

Nie ma jednego obiektu „FullCostEstimate”. Są **trzy równoległe konstrukcje**:

### A) Snapshot inwestorski (ATH / przedmiar) — SSOT dokumentów

| | |
|--|--|
| **Źródło** | Heavy parse → `item.tenderDossier.kosztorys` (`TenderKosztorysSnapshot`) |
| **Pola** | `ok`, `rows[]`, `catalogQuantities[]`, `totalValue`, `rowCount`, … |
| **Klasyfikacja wartości** | `resolvedCostStatus` / `resolveTenderValue` w **`src/lib/tender-data-ssot.ts`** |

### B) Recommendation / Bid (to, co Outcome pokazuje jako cenę)

| | |
|--|--|
| **Funkcja** | `computeTenderBidProposal` — **`src/lib/tenders-bid-calculator.ts`** |
| **Hook** | `useTenderPricingAuto` → `useTenderPipelineRuntime` |
| **Tryb typowy przy FOUND_NO_VALUE** | `pricingMode: "catalog"` (ilości × katalog WGDOM) |
| **Wynik** | `recommendedBidPln` → Offer Run → Outcome |

**Nie** zapisuje wyniku do `resolvedTenderValuePln` / nie zmienia `FOUND_NO_VALUE`.

### C) „Pełny kosztorys” UI (CTA Outcome)

| | |
|--|--|
| **CTA** | `TenderRecommendationOutcomeView` → `onShowCostEstimate` |
| **Nawigacja** | `TenderDetailPage.handleTre01ShowCostEstimate` → tab **`kosztorys`** (`setTre01ForceWorkspace(true)` + `handleTabChange("kosztorys")`) |
| **Workspace** | `TenderKosztorysWorkspace` |
| **BOQ / Summary (inwestor + katalog)** | `buildKosztorysBoqExplorerView` · `buildKosztorysProDashboard` · `buildKosztorysV4Stats` |
| **Full Estimate AI (OfferBoq DTO)** | `buildOfferBoqExplainabilityView` — **`src/lib/tender-offer-boq-explainability.ts`** |

Łańcuch OfferBoq (Full Estimate DTO):

```text
tenderDossier.kosztorys
  → buildOfferBoqFromSnapshot          (tender-offer-boq.ts)
  → mapOfferBoqDocument                (tender-offer-boq-mapping.ts)
  → applyOfferBoqCostIntelligence      (tender-offer-boq-cost-intelligence.ts)
  → applyOfferBoqPricing               (tender-offer-boq-pricing-engine.ts)
  → presentOfferBoqExplainabilityView  (DTO → UI cards)
  → OfferBoqCostIntelligencePanel      (UI)
```

**TRE DF:** CTA = reuse istniejącego workspace kosztorysu — **nie** nowy silnik i **nie** projekcja Bid PLN na SSOT wartości zamówienia.

---

## 2. Czy powstaje komplet danych?

| Warstwa | Kompletność przy typowym ATH bez cen | Komentarz |
|---------|--------------------------------------|-----------|
| ATH parse (`kosztorys.ok`, rows / catalogQuantities) | **Tak (strukturalnie)** | Stąd „Gotowe” / ATH sparsowane |
| Wartość inwestorska (`totalValue` / sumy cen ATH) | **Nie** | To definiuje `FOUND_NO_VALUE` |
| Bid `recommendedBidPln` | **Tak** (osobno) | Outcome pokazuje cenę |
| SSOT `resolvedTenderValuePln` | **null** | **Celowo** nie czyta Bid |
| OfferBoq Full Estimate (linie + komponenty) | **Częściowo** | Budowany **on-demand** na tabie; ceny AI/katalog ≠ Bid aggregate 1:1; UNKNOWN / review_required typowe |

**Wniosek:** kompletność **ceny ofertowej Outcome** ≠ kompletność **SSOT wartości zamówienia** ≠ kompletność **tabeli ATH z cenami inwestora**.

---

## 3. Czy DTO jest kompletne?

### 3.1 SSOT TRACE (to, co Owner cytuje)

Powstaje w:

| | |
|--|--|
| **Plik** | `src/lib/tender-data-ssot.ts` |
| **Funkcja** | `traceSsotSnapshot` → woła `resolveTenderValue` + `resolvedCostStatus` |

```246:252:src/lib/tender-data-ssot.ts
export function resolvedCostStatus(item: TenderPipelineItem): ResolvedCostStatus {
  const k = item.tenderDossier?.kosztorys;
  const scan = item.tenderDossier?.scanSummary;
  const found = Boolean(k?.ok) || Boolean(scan?.kosztorysFound);
  if (!found) return "NOT_FOUND";
  if (kosztorysHasPricedValue(k)) return "FOUND_WITH_VALUE";
  return "FOUND_NO_VALUE";
}
```

```200:237:src/lib/tender-data-ssot.ts
export function resolveTenderValue(...) {
  // 1) swz.estimatedValuePln → source "swz"
  // 2) plnFromKosztorys(totalValue) → "dossier"
  // 3) dossier.estimatePln → "estimate"
  // 4) FOUND_NO_VALUE → pln: null, source: "fallback"   ← TU
  // 5) else → fallback
}
```

**DTO SSOT jest „kompletne” semantycznie:** dokument znaleziony, **bez** wycenionej wartości inwestorskiej → `FOUND_NO_VALUE` + `pln: null` + `fallback`.  
**Nie jest bugiem mappera** — to kontrakt P2-E.5 / AP2-S0.

### 3.2 OfferBoq Document (Full Estimate)

| | |
|--|--|
| **Budowa** | `buildOfferBoqFromSnapshot` |
| **Warunek pustki** | brak `catalogQuantities` **i** brak `rows` → `available: false` |
| **Status startowy** | często `structural_only` / później częściowo wycenione komponentami |

DTO OfferBoq **nie** jest tym samym, co Bid Proposal z Outcome.  
`useTenderPricingAuto` **nie** przekazuje `offerBoqDirect` do Bid — Outcome idzie trybem **`catalog`**, nie `offer_boq_ai`.

---

## 4. Czy UI dostaje niepełne dane?

**Tak — względem oczekiwania „skoro Outcome ma cenę, pełny kosztorys też powinien mieć pełną wycenę / SSOT value”.**

Faktyczny flow CTA:

```208:211:src/app/TenderDetailPage.tsx
  const handleTre01ShowCostEstimate = useCallback(() => {
    setTre01ForceWorkspace(true);
    handleTabChange("kosztorys");
  }, [handleTabChange]);
```

UI tabu `kosztorys` dostaje:

1. **ATH bez cen jednostkowych** → kolumny ATH puste (`athUnitPrice` / `athTotal` null w BOQ Explorer).  
2. **SSOT / Summary** oparte o `resolvedCostStatusDisplay` / brak `totalValue` → komunikaty „brak wartości” / fallback.  
3. **Kosztorys Pro „Wartość wyceny”** z `pricingTotalPln` (katalog WGDOM) — **może** pokazać kwotę, ale to **nie** jest `resolvedTenderValuePln` i **nie** musi równać się Outcome Bid.  
4. **OfferBoq panel** — osobna, późniejsza wycena komponentowa; może wyglądać „niekompletnie” (UNKNOWN, review).

UI **nie gubi** Bid PLN z Outcome — **w ogóle go nie wstrzykuje** do SSOT / ATH table.

---

## 5. Mapper czy wcześniej?

| Hipoteza | Werdykt |
|----------|---------|
| Regresja TRE-02-HOTFIX-01 (`deriveOfferRunSnapshot`) | **NIE** — HOTFIX dotyczy tylko terminal `running` → `insufficient_data` |
| Mapper Outcome / Recommendation Result | **NIE** — cena Bid wyświetlana poprawnie |
| Parser ATH „nie sparsował” | **NIE** (Owner: ATH sparsowane · Gotowe) — struktura jest; **brakuje cen inwestora** |
| **SSOT wcześniej / równolegle** (`tender-data-ssot.ts`) | **TAK — źródło cytowanych pól** |
| **Rozjazd pipeline Bid vs Full Estimate UI** | **TAK — root cause doświadczenia „niekompletny kosztorys”** |

```text
ROOT CAUSE (doświadczenie użytkownika):

1. PRIMARY (fakty SSOT):
   ATH bez wycenionych pozycji → resolvedCostStatus=FOUND_NO_VALUE
   → resolveTenderValue → pln=null, valueSource=fallback
   Plik: src/lib/tender-data-ssot.ts
   Funkcje: resolvedCostStatus · resolveTenderValue · (traceSsotSnapshot)

2. SECONDARY (produkt / architektura):
   Outcome pokazuje recommendedBidPln z computeTenderBidProposal (catalog),
   a CTA „Pokaż pełny kosztorys” otwiera workspace inwestorski + OfferBoq,
   który NIE jest projekcją Bid i NIE aktualizuje SSOT wartości zamówienia.
   Pliki: TenderDetailPage.handleTre01ShowCostEstimate
          TenderKosztorysWorkspace
          buildOfferBoqExplainabilityView
          useTenderPricingAuto / computeTenderBidProposal
```

**Miejsce zatrzymania oczekiwań:** między **Bid Recommendation Result** a **SSOT / ATH Full Cost UI** — brak mostu danych, nie uszkodzony terminal mapper HOTFIX.

---

## 6. Przepływ (ATH → Full Estimate UI) z punktem rozjazdu

```text
ATH / ZIP
  → parser (heavy) → tenderDossier.kosztorys
       │
       ├─► resolvedCostStatus / resolveTenderValue     ← FOUND_NO_VALUE / null / fallback
       │     (SSOT wartości INWESTORSKIEJ)
       │
       ├─► computeTenderBidProposal (catalog)          ← recommendedBidPln > 0
       │     → Offer Run → Outcome „Rekomendowana cena”
       │
       └─► CTA „Pokaż pełny kosztorys”
             → tab kosztorys
             → BOQ Explorer (ATH prices puste)
             → Kosztorys Pro (osobna wycena katalogowa UI)
             → OfferBoq Explainability (osobny Full Estimate DTO)
                    ▲
                    └── BRAK mostu z Outcome Bid PLN / SSOT
```

---

## 7. Odpowiedzi punktowe (Owner)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| **1** | Gdzie powstaje Full Cost Estimate? | (a) snapshot ATH w dossier; (b) Bid catalog w `computeTenderBidProposal`; (c) OfferBoq w `buildOfferBoqExplainabilityView` — CTA otwiera (a)+(c), nie (b) jako SSOT |
| **2** | Czy powstaje komplet danych? | Struktura ATH: tak. Ceny inwestora: nie (`FOUND_NO_VALUE`). Cena Bid: tak (osobno). OfferBoq: częściowo on-demand |
| **3** | Czy DTO jest kompletne? | SSOT DTO kompletne **dla kontraktu FOUND_NO_VALUE**. OfferBoq ≠ Bid. Brak DTO łączącego Outcome↔SSOT value |
| **4** | Czy UI dostaje niepełne dane? | UI dostaje poprawne dane ATH-bez-cen + osobne wyceny; wygląda „niekompletnie” względem Outcome |
| **5** | Mapper czy wcześniej? | **Wcześniej / równolegle:** `tender-data-ssot` + **rozjazd pipeline’ów**. **Nie** mapper TRE HOTFIX |

---

## 8. Co to NIE jest

- Awaria Edge / batch / auth  
- Cofnięcie HOTFIX-01  
- Outcome, które „gubi” cenę  
- Parser, który „nie znalazł ATH” (skoro `ok` / Gotowe)

---

## 9. Minimalny kierunek naprawy (tylko wskazówka — **NIE IMPLEMENTUJ**)

Wymaga **osobnego DF + Owner GO** (poza tym RCA):

| Opcja | Idea | Ryzyko |
|-------|------|--------|
| **P** | UX copy: przy FOUND_NO_VALUE + Bid OK jasno „brak wartości inwestora · oferta = wycena katalogowa WGDOM” | Niskie |
| **Q** | Most SSOT: opcjonalny display Bid / catalog valuation obok fallback (bez zmiany semantyki FOUND_NO_VALUE) | Średnie — pilnować P2-E.5 |
| **R** | CTA → deep-link do OfferBoq / sekcji wyceny własnej zamiast oczekiwać ATH z cenami | Średnie produktowo |
| **S** | Zasilenie Bid z `offer_boq_ai` (jedna ścieżka Full Estimate → Bid) | Wysokie — AI-COST / Bid · osobny epic |

**Zakaz w tym RCA:** IMPLEMENT · sync · Edge · parser rewrite · TRE-03.

---

## 10. Następny krok

```text
RCA COMPLETE · ROOT CAUSE FOUND
Czekaj na Owner GO + Design Freeze (jeśli naprawa)
Bez GO: zero IMPLEMENT / commit / push
```

**Koniec COST-ESTIMATE-01-RCA.**
