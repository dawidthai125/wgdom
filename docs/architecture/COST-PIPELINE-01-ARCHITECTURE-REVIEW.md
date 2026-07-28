# COST-PIPELINE-01 — Architecture Review (Kosztorys ofertowy)

> **ID:** COST-PIPELINE-01-ARCHITECTURE-REVIEW  
> **MODE:** **ARCHITECTURE REVIEW ONLY** — **bez** IMPLEMENT · commit · push · Design Freeze  
> **PROGRAM:** Przebudowa doświadczenia „Kosztorysy” → jeden model **kosztorysu ofertowego WGDOM**  
> **NIE jest:** TRE-03 · refaktoryzacja kodu · nowy silnik wyceny  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Wejścia:** [`COST-ESTIMATE-01-RCA.md`](COST-ESTIMATE-01-RCA.md) · [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md) · [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) · TRE-01/02 CLOSEOUT  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
CEL: decyzja architektoniczna — JEDEN model kosztorysu ofertowego
     łączący Outcome · Pełny kosztorys · Bid · (później) PDF/eksport.
ZAKAZ teraz: IMPLEMENT · TRE-03 · rewrite parserów / Bid / AI-COST rdzenia.
Po AR → czekaj na Owner GO → Design Freeze wycinka.
════════════════════════════════════════════════════════
```

---

## 0. Werdykt skrótowy (rekomendacja)

| Pytanie | Rekomendacja AR |
|---------|-----------------|
| **1. SSOT?** | **Warstwowy SSOT:** (1) wejście pozycji = `TenderKosztorysSnapshot` · (2) **kosztorys ofertowy / direct** = **`OfferBoqDocument`** · (3) **cena końcowa oferty** = **`TenderBidProposal`** (`computeTenderBidProposal`) |
| **2. OfferBoq = główny Cost Estimate?** | **TAK** — jako SSOT **rozwinięcia kosztorysu ofertowego** (nie jako drugi kalkulator marży) |
| **3. Recommendation Result z tego samego DTO?** | **TAK pośrednio** — Result czyta Bid; Bid musi być zasilany **tym samym** OfferBoq (S6 `offer_boq_ai`), nie równoległym trybem `catalog` |
| **4. Zakładka Kosztorysy = rozwinięcie tego modelu?** | **TAK** — CTA i tab = drill-down OfferBoq + Bid; ATH/przedmiar = **wejście / dowód**, nie „pełny kosztorys” |
| **5–8** | patrz §6–§9 |

**Kierunek:** **nie** budować trzeciego modelu — **domknąć** już zamrożony łańcuch AI-COST Freeze (OfferBoq → Bid adapter), którego Outcome **dziś omija** (używa `catalog` w `useTenderPricingAuto`).

---

## 1. Obecną architektura (AS-IS)

### 1.1 Dwa pipeline’y (Owner) + trzecia gałąź UI

```text
PIPELINE A — „Kosztorysy / SSOT inwestorski”
  ATH / przedmiar
    → parser (dossier.kosztorys)
    → tender-data-ssot (FOUND_* / resolveTenderValue)
    → Kosztorys Pro / BOQ Explorer (ATH + katalog display)
    → CTA „Pokaż pełny kosztorys” ląduje TU

PIPELINE B — „Outcome / Recommendation”
  ATH / przedmiar
    → parser
    → (ilości) → Biblioteka Robót (aggregate catalog)
    → computeTenderBidProposal (tryb catalog)     ← BEZ OfferBoq
    → Offer Run / Recommendation Result
    → Outcome UI (np. 280 700 zł)

PIPELINE C — „AI COST panel” (istnieje, ale nie napędza Outcome)
  ten sam snapshot
    → OfferBoq S1…S4 (+ S5/S5.1)
    → integrateOfferBoqWithBidProposal (S6)       ← TYLKO w explainability
    → OfferBoqCostIntelligencePanel
```

**Krytyczny fakt kodu:** `integrateOfferBoqWithBidProposal` / `offerBoqDirect` jest używane w **`tender-offer-boq-explainability.ts`**, **nie** w `useTenderPricingAuto`. Outcome i panel AI mogą liczyć **różne** kwoty.

### 1.2 Role dokumentów dziś

| Artefakt | Rola AS-IS | Problem |
|----------|-----------|---------|
| `TenderKosztorysSnapshot` | SSOT **wejścia** pozycji + status inwestorski | Często `FOUND_NO_VALUE` (brak cen inwestora) — poprawne biznesowo, źle jako „pełny kosztorys” |
| `tender-data-ssot` | SSOT **wartości zamówienia / dokumentu** | Nie zna Bid / OfferBoq |
| `OfferBoqDocument` | Model AI Cost (Freeze) | **Nie** jest SSOT Outcome |
| `TenderBidProposal` | SSOT ceny końcowej (Freeze) | Outcome zasila go **catalog**, nie OfferBoq |
| Recommendation Result | View-model TRE | Czyta Bid — OK; źródło Bid niespójne z tabem Kosztorysy |

### 1.3 CTA produktowe (TRE-01/02)

„Pokaż pełny kosztorys” → `handleTre01ShowCostEstimate` → tab **`kosztorys`** = **reuse Hub workspace inwestorskiego**, nie drill-down kosztorysu ofertowego.  
Zgodne z DF TRE (reuse powierzchni), **niezgodne** z Product SSOT / wizją Ownera po Outcome First.

---

## 2. Problemy

| ID | Problem | Skutek biznesowy |
|----|---------|------------------|
| **P1** | Dwa (trzy) pipeline’y wyceny | Outcome 280 700 zł ≠ „pełny kosztorys” |
| **P2** | CTA nazywa „pełny kosztorys”, otwiera analizę ATH / SSOT inwestorski | Użytkownik myśli, że system „nie ma kosztorysu” |
| **P3** | `FOUND_NO_VALUE` mylone z brakiem wyceny WGDOM | Fałszywy alarm przy poprawnym Bid |
| **P4** | AI-COST Freeze opisuje 1 łańcuch; runtime Outcome go omija | Dryf od zamrożonej architektury |
| **P5** | Brak jednego DTO „kosztorys ofertowy” dla Outcome + tab + (później) PDF | Niemożliwa spójna oferta / eksport bez decyzji AR |
| **P6** | Kosztorys Pro / BOQ Explorer = trzeci display pricing (katalog) | Kolejna niespójność sum |

---

## 3. Analiza biznesowa

### 3.1 Realność przetargów publicznych

Wykonawca zwykle **nie** dostaje kosztorysu inwestorskiego z cenami. Dostaje przedmiar / SWZ / projekt / STWiORB.  
Rola WGDOM = **wygenerować kosztorys ofertowy** (pozycje + koszty własne + oferta), nie „pokazać ATH inwestora jako pełny kosztorys”.

### 3.2 Obietnica Product SSOT

```text
1 klik → rekomendowana cena oferty
     → [Pokaż pełny kosztorys] = drill-down TEJ samej rekomendacji
```

AS-IS łamie drugą połowę obietnicy.

### 3.3 Co zostaje wartościowe z Pipeline A

- Parsowanie przedmiaru / ATH jako **wejście**  
- `FOUND_WITH_VALUE` / `FOUND_NO_VALUE` jako **klasyfikacja dokumentu źródłowego** (nie jako „brak oferty”)  
- Podgląd źródła ATH (dowód / audyt)

To **nie** znika — schodzi do warstwy **Input / Evidence**.

---

## 4. Docelowa architektura (TO-BE)

### 4.1 Jedna oś główna

```text
Przedmiar / ATH / PDF (dokumenty)
        │
        ▼
   Parser / dossier
        │
        ▼
 TenderKosztorysSnapshot          ← SSOT WEJŚCIA pozycji (Freeze: bez zmian roli)
        │
        ▼
 Biblioteka Robót (mapping)
        │
        ▼
 AI COST (OfferBoq S1…S5.1)       ← SSOT KOSZTORYSU OFERTOWEGO (direct / linie)
        │
        ▼
 Bid adapter S6 → computeTenderBidProposal
        │                           ← SSOT CENY KOŃCOWEJ OFERTY (Kp/marża)
        ▼
 Recommendation Result / Outcome  ← ten sam Bid (+ digest OfferBoq)
        │
        ▼
 Pełny kosztorys (tab)            ← drill-down OfferBoqDocument (+ Bid stack)
        │
        ▼
 Oferta / PDF / Eksport           ← backlog; to samo DTO (osobny DF)
```

### 4.2 Warstwy SSOT (proponowany kontrakt)

| Warstwa | SSOT | Odpowiada na |
|---------|------|--------------|
| **L0 Input** | `TenderKosztorysSnapshot` + `resolvedCostStatus` | Co było w dokumentach? Czy inwestor dał ceny? |
| **L1 Offer cost** | **`OfferBoqDocument`** | Jaki jest kosztorys ofertowy WGDOM (linie, komponenty, direct)? |
| **L2 Offer price** | **`TenderBidProposal`** | Jaka jest rekomendowana cena oferty (PLN)? |
| **L3 Presentation** | Recommendation Result · UI Kosztorysy · (później PDF) | Widoki — **bez** własnej matematyki oferty |

**Zakaz TO-BE:** drugi kalkulator marży/Kp w UI · Outcome z `catalog` równolegle do OfferBoq · CTA do „pełnego kosztorysu” = tylko ATH SSOT.

### 4.3 Diagram przepływu (docelowy)

```text
                    ┌─────────────────────────┐
                    │   Dokumenty przetargu   │
                    │  (przedmiar · SWZ · …)   │
                    └───────────┬─────────────┘
                                │ parse
                                ▼
                    ┌─────────────────────────┐
                    │ TenderKosztorysSnapshot │  L0 INPUT
                    │ + cost status (FOUND_*) │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
     (opcjonalnie RO)                    ┌──────────────────┐
     Podgląd ATH / Evidence              │   OfferBoq S1-S5 │  L1 OFFER COST
                                         │   + Work Catalog │
                                         └────────┬─────────┘
                                                  │ S6 adapter
                                                  ▼
                                         ┌──────────────────┐
                                         │ TenderBidProposal│  L2 OFFER PRICE
                                         └────────┬─────────┘
                                                  │
                         ┌────────────────────────┼────────────────────────┐
                         ▼                        ▼                        ▼
                  Outcome / Result         Tab Kosztorysy            PDF / Eksport
                  (cena L2)                (drill-down L1+L2)        (backlog DF)
```

---

## 5. Odpowiedzi na pytania Ownera

### 1. Który model powinien zostać SSOT?

**Nie jeden plik — trzy warstwy** (§4.2).  
Dla pytania „jaki jest kosztorys ofertowy?” → **`OfferBoqDocument`**.  
Dla pytania „jaka jest cena oferty?” → **`TenderBidProposal`**.  
Dla pytania „co było w ATH?” → **`TenderKosztorysSnapshot` + tender-data-ssot** (Input).

### 2. Czy OfferBoq powinien stać się głównym Cost Estimate?

**TAK** — jako główny **Cost Estimate ofertowy** (rozwinięcie pozycji / direct).  
**NIE** — jako generator `recommendedBidPln` (to zostaje Bid).

### 3. Czy Recommendation Result powinien korzystać z tego samego DTO?

**TAK w łańcuchu:** Result = view-model nad **Bid**, a Bid zasilany z **tego samego** OfferBoq (S6).  
Result **nie** musi embedować całego OfferBoq w UI Outcome; musi mieć **ten sam run / digest / kwotę** co drill-down.

### 4. Czy zakładka Kosztorysy powinna wyświetlać rozwinięcie tego samego modelu?

**TAK.** Primarny content = OfferBoq (+ Bid stack / walidacja).  
ATH / FOUND_* = sekcja **Źródło / Evidence** (secondary), nie hero „pełnego kosztorysu”.

### 5. Jakie moduły wymagają zmian? (kierunek — nie lista IMPLEMENT)

| Moduł | Zmiana (kierunek AR) |
|-------|----------------------|
| `useTenderPricingAuto` / runtime Outcome | Preferować ścieżkę OfferBoq → S6 → Bid zamiast samego `catalog` |
| `TenderDetailPage` CTA | Deep-link do OfferBoq / sekcji kosztorysu ofertowego |
| `TenderKosztorysWorkspace` | Primarny layout = OfferBoq; ATH demoted |
| `tender-recommendation-result` / Offer Run | Opcjonalnie: ref do OfferBoq runId/digest (bez nowej ceny) |
| Copy / SSOT UX | Oddzielić „brak cen inwestora” od „brak kosztorysu ofertowego” |
| (później) PDF / eksport | Konsumować L1+L2 — osobny DF |

### 6. Jakie moduły pozostaną bez zmian?

| Moduł | Powód |
|-------|--------|
| Parsery ATH/PDF/7z / dossier merge | L0 Input — REUSE |
| Work Catalog / marketQuotes (COST-02-A) | Provider w S4 — REUSE |
| AI-COST S1–S5.1, S7 (Freeze) | Silniki — REUSE |
| `computeTenderBidProposal` (rdzeń Kp/marża) | SSOT L2 — REUSE |
| Cloud-sync / Edge / Payroll | Poza zakresem |
| TRE Outcome shell (layout) | REUSE; zmienia się **źródło danych**, nie nowy ekran wyniku |
| `tender-data-ssot` semantyka FOUND_* | Zostaje dla L0; **nie** zastępuje L1/L2 |

### 7. Czy można zachować pełny REUSE obecnego AI COST?

**TAK — i to jest preferowana ścieżka.**  
AI-COST-01 Freeze **już** definiuje docelowy łańcuch. Brakuje **runtime wiring** Outcome + **UX primacy** tabu Kosztorysy, nie nowego silnika.

### 8. Minimalna migracja bez przepisywania silników?

Patrz **§9**. Skrót: **wire + UX + jeden Bid path**, nie rewrite.

---

## 6. Wpływ na moduły (macierz)

| Obszar | AS-IS | TO-BE | Wysiłek (orient.) |
|--------|-------|-------|-------------------|
| Parser / dossier | Input | Input (bez zmian roli) | — |
| tender-data-ssot | Myślany „kosztorys” | Tylko L0 Evidence | Niski (copy/UX) |
| OfferBoq AI-COST | Panel boczny | **SSOT L1** + źródło Bid | Średni (wire) |
| Bid calculator | Catalog **lub** offer_boq_ai | **Prefer offer_boq_ai** gdy OfferBoq ready; catalog = fallback DF | Średni |
| TRE Outcome | Catalog Bid | Bid z OfferBoq | Średni |
| Tab Kosztorysy | ATH-first | OfferBoq-first | Średni–wysoki UX |
| Kosztorys Pro / BOQ Explorer | Hero | Secondary / Evidence | Średni |
| PDF / eksport | — | Backlog | Osobny DF |
| Sync / Edge | — | Bez zmian | — |

---

## 7. Ryzyka

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Różnica kwot catalog vs OfferBoq po przełączeniu Outcome | **Wysokie** | Owner QA · A/B na wybranych przetargach · jasny changelog |
| OfferBoq wolniejszy / niepełny (UNKNOWN) przy Outcome | **Średnie** | Fallback catalog **tylko** wg DF + uczciwy status (nie fałszywa cena) |
| Naruszenie AI-COST Freeze (Kp w AI-COST) | **Wysokie** | Zakaz — Bid zostaje L2 |
| Payroll / sync kollateral | **Niskie** przy wire-only | Gate G1–G9 |
| Scope creep TRE-03 / explain / Decision | **Średnie** | Ten AR ≠ TRE-03; osobne DF |
| Utrata dowodu ATH | **Niskie** | Sekcja Evidence obowiązkowa w DF |
| Dwukrotne liczenie Bid (panel + Outcome) | **Średnie** | Jedna funkcja runtime wspólna dla Outcome i tabu |

---

## 8. Plan migracji (minimalny, bez rewrite silników)

```text
FAZA 0 — DECYZJA (ten dokument)
  Owner akceptuje warstwowy SSOT L0/L1/L2
  → GO Design Freeze wycinka (nie cały PDF/eksport naraz)

FAZA 1 — DESIGN FREEZE (proponowany wycinek „Wire + CTA”)
  IN:
    · Runtime: OfferBoq → S6 → Bid dla Outcome (gdy ready)
    · CTA / tab: OfferBoq jako pełny kosztorys
    · Copy SSOT: FOUND_NO_VALUE ≠ brak oferty
  OUT:
    · Rewrite parserów / Bid Kp / Edge / sync
    · PDF / e-składanie
    · Usunięcie ATH evidence
    · TRE-03 explain/Decision

FAZA 2 — IMPLEMENT (tylko po GO DF)
  Thin wire + UX primacy · testy kwot Outcome ≡ tab
  · catalog path = jawny fallback (DF)

FAZA 3 — PDF / Eksport (osobny DF)
  Konsumuje L1+L2 — zero nowego kalkulatora
```

**Zasada migracji:** najpierw **jedno źródło ceny** (Outcome = tab), potem bogatszy eksport.

---

## 9. Rekomendacja końcowa

```text
════════════════════════════════════════════════════════
REKOMENDACJA ARCHITEKTONICZNA — COST-PIPELINE-01

1. Przyjąć warstwowy SSOT:
   L0 Snapshot/dokument · L1 OfferBoq · L2 Bid Proposal

2. OfferBoq = główny Cost Estimate OFERTOWY (drill-down).

3. Recommendation Result = Bid zasilany z OfferBoq (S6),
   nie równoległy catalog-only path.

4. Zakładka Kosztorysy = rozwinięcie OfferBoq (+ Bid);
   ATH = Evidence, nie „pełny kosztorys”.

5. PEŁNY REUSE AI-COST Freeze — brak nowego silnika.

6. Minimalna migracja = wire runtime + UX primacy + DF,
   nie refaktor monolitów.

7. NIE startować IMPLEMENT / TRE-03 bez Owner GO + Design Freeze.

NASTĘPNY KROK: Owner GO → COST-PIPELINE-01 Design Freeze
               (wycinek Wire+CTA; PDF poza DF-1).
════════════════════════════════════════════════════════
```

---

## 10. Co świadomie poza tym AR

- Szczegółowy allowlist plików IMPLEMENT (→ DF)  
- Decyzja „usuń catalog całkowicie” vs „fallback forever” (→ DF)  
- Persistencja OfferBoq w KV / sync (domyślnie **nie** w DF-1; compute on read jak dziś panel)  
- TRE-03, Autonomous rewrite, FND-06  

---

## 11. Powiązane dokumenty

| Dokument | Relacja |
|----------|---------|
| [`COST-ESTIMATE-01-RCA.md`](COST-ESTIMATE-01-RCA.md) | Dowód rozjazdu AS-IS |
| [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) | Już zamrożony łańcuch L1→L2 |
| [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) | Obietnica 1 klik → cena → pełny kosztorys |
| [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md) | Blueprint Outcome / Bid / AI-COST |
| TRE-01/02 | Outcome First — **nie** zmieniać bez DF; CTA semantics do korekty w DF-1 |

---

**Koniec COST-PIPELINE-01-ARCHITECTURE-REVIEW.**  
**STOP — czekaj na Owner GO do Design Freeze.**
