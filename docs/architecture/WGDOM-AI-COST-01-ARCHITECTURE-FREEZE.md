# WGDOM — AI-COST-01 ARCHITECTURE FREEZE

> **ID:** AI-COST-01-FREEZE-01  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **EPIC COMPLETE** · **FIELD READY** · **PRODUCTION VERIFIED**  
> **Data:** 2026-07-27  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · UI **2.65.61** (feature **`87610b5`**)  
> **SSOT pokrewne:** [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) · [`WGDOM-AI-COST-01-LESSONS-LEARNED.md`](WGDOM-AI-COST-01-LESSONS-LEARNED.md)  
> **Język:** polski

```text
Ten dokument ZAMRAŻA architekturę AI-COST-01.
Zmiana rdzenia wymaga nowego Design Freeze + Owner GO.
Nie implementuj AI-COST-02 z tego pliku — tylko punkt startowy osobnego EPIC.
```

---

## 1. Status końcowy

| Pole | Wartość |
|------|---------|
| EPIC | **AI-COST-01 COMPLETE** |
| Stabilizacja | **STAB-01 COMPLETE** |
| RWAT | **PASS** (po STAB: brak P0/P1) |
| Prod | **PRODUCTION VERIFIED** · UI **2.65.61** |
| Rola | Asysta kosztorysanta (nie autonomiczny „wyślij ofertę”) |

---

## 2. Diagram pipeline (finalny)

```text
Dokumenty przetargu (ATH/PDF)
        │  REUSE parsers / dossier
        ▼
TenderKosztorysSnapshot          ← SSOT wejścia pozycji
        │
        ▼
[S1] OfferBoqDocument            tender-offer-boq.ts
        │
        ▼
[S2] Mapping → Work Catalog      tender-offer-boq-mapping.ts
        │
        ▼
[S3] Cost Intelligence           tender-offer-boq-cost-intelligence.ts
        │  kind · strategy · dekompozycja (bez cen)
        ▼
[S4] Pricing Engine              tender-offer-boq-pricing-engine.ts
        │  komponenty M/R/S/… · multi-provider · BEZ Kp/marży
        │  STAB-1: preservacja user_approved / user_changed
        ▼
[S4.1] Explainability            tender-offer-boq-explainability.ts
        │
        ├─► [S5] Edycja komponentów     tender-offer-boq-component-edit.ts
        ├─► [S5.1] Company Knowledge    tender-offer-boq-company-knowledge.ts
        │
        ▼
[S6] Bid Adapter                 tender-offer-boq-bid-adapter.ts
        │  offerBoqDirect → computeTenderBidProposal (SSOT oferty)
        ▼
TenderBidProposal                tenders-bid-calculator.ts  ← JEDYNY generator oferty
        │  Kp · overhead · marża · recommendedBid
        ▼
[S7] Validation / Gotowość       tender-offer-boq-validation.ts
        │  STAB-2: rekomendacje grupowane
        ▼
UI Kosztorys                     OfferBoqCostIntelligencePanel.tsx
```

**Telemetria (STAB-6):** `tender-offer-boq-ai-quality-telemetry.ts` — lokalne LS, bez wysyłki.

---

## 3. Moduły S1–S7 + STAB-01

| Moduł | Plik SSOT | Odpowiedzialność | Zamrożone |
|-------|-----------|------------------|-----------|
| **S1** | `tender-offer-boq.ts` | Model `OfferBoqDocument` / linie / totals (bez oferty) | Kontrakt typów rdzenia |
| **S2** | `tender-offer-boq-mapping.ts` | Mapowanie → katalog + confidence | Interfejs match |
| **S3** | `tender-offer-boq-cost-intelligence.ts` | Klasyfikacja kind + strategia (bez cen) | Enum kinds / strategies |
| **S4** | `tender-offer-boq-pricing-engine.ts` | Ceny komponentów · providers · merge user | Brak Kp/marży w silniku |
| **S4.1** | `tender-offer-boq-explainability.ts` | ViewModel RO + orkiestracja present | |
| **S5** | `tender-offer-boq-component-edit.ts` | Patch / approve / historia | |
| **S5.1** | `tender-offer-boq-company-knowledge.ts` | Wiedza firmy + provider | Schema store (bez przebudowy arch) |
| **S6** | `tender-offer-boq-bid-adapter.ts` | Adapter → Bid Proposal | Tryb `offer_boq_ai` |
| **S7** | `tender-offer-boq-validation.ts` | Issues · score · gotowość · grupy rekomendacji | |
| **STAB-01** | (w powyższych) | Ochrona edycji · szum · klasyfikacja · coverage · explain · telemetry | Zachowania P1-fix |

**Bid Proposal (poza AI-COST, REUSE):** `tenders-bid-calculator.ts` — **jedyny** silnik Kp / marży / ceny ofertowej.

---

## 4. Zależności

| Zależność | Kierunek | Uwaga |
|-----------|----------|-------|
| Parsery ATH/PDF / dossier | WEJŚCIE | **Nie** przebudowywać w AI-COST |
| Work Catalog | S2/S4 | Źródło cen katalogowych |
| Company cost model | S4/S6 | `fullyLoadedHourly` — REUSE |
| Company Knowledge LS | S5.1 | Lokalne; nie cloud KV w V1 |
| Bid Proposal | S6→ | REUSE; AI dostarcza tylko direct |
| AP2 Analiza przetargów | Równoległa | Docs/ryzyko ≠ liczby oferty |

---

## 5. Granice odpowiedzialności

| Warstwa | Robi | Nie robi |
|---------|------|----------|
| AI-COST | Propozycja kosztu bezpośredniego + explain + walidacja | Drugi kalkulator oferty |
| Bid Proposal | Kp, marża, recommendedBid, costStack | Dekompozycja przedmiaru |
| Parsery | Snapshot pozycji | Wycena |
| Company Knowledge | Preferencja cen z historii decyzji | Scraping rynku |
| UI panel | Edycja + prezentacja | Zmiana kontraktu S6 |

---

## 6. Punkty rozszerzeń (dozwolone bez łamania freeze)

1. **Nowy `OfferBoqPriceSourceProvider`** — w łańcuchu S4 (bez zewnętrznego scrapingu bez GO).  
2. **Reguły klasyfikacji S3** — rozszerzanie sygnałów (jak STAB-3), nie nowy klasyfikator LLM.  
3. **Heurystyki S4** — kalibracja stawek domenowych.  
4. **Rozszerzenie Work Catalog** — największy dźwigniowy wpływ na jakość.  
5. **UI filtrów / kolejek weryfikacji** — na grupach rekomendacji S7.  
6. **AI-COST-02** — nowe funkcje biznesowe (patrz Starting Point); **nie** przebudowa S1–S7.

---

## 7. Objęte zamrożeniem (NIE zmieniać bez nowego DF + Owner GO)

- Kontrakt: AI Cost **nie** liczy Kp / marży / VAT / brutto oferty.  
- Bid Proposal = **jedyny** generator oferty.  
- Preservacja `user_approved` / `user_changed` przy reprice.  
- Brak drugiego modelu OfferBoq / drugiego Pricing Engine.  
- Brak przebudowy parserów ATH/PDF „przy okazji”.  
- Brak przebudowy architektury Company Knowledge (schema).  
- Tryb `offer_boq_ai` w adapterze S6.

---

## 8. Dopuszczone do rozwoju (po Owner GO / osobny EPIC)

- Modele cen rynkowych / konkurencyjność / predykcja szans (**AI-COST-02+**).  
- Bogatsza Biblioteka Robót.  
- UX kolejki weryfikacji.  
- Oficjalne feedy cen (nie scraping ad-hoc).  
- Cloud sync wiedzy firmy (jeśli brief).

---

## 9. Indeks dokumentów EPIC

| Dokument | Rola |
|----------|------|
| Ten plik | **Architecture Freeze** |
| [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) | SSOT przepływu |
| [`WGDOM-AI-COST-01-LESSONS-LEARNED.md`](WGDOM-AI-COST-01-LESSONS-LEARNED.md) | Lekcje |
| [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md) | Start kolejnego EPIC |
| `WGDOM-AI-COST-01-COST-S*-*` | DF/RR slice'ów |
| `WGDOM-AI-COST-01-STAB-01-*` | Stabilizacja |
| `WGDOM-AI-COST-01-RWAT-01-REPORT.md` | RWAT bazowy |

**Historyczny draft:** [`WGDOM-AI-COST-01-ARCHITECTURE.md`](WGDOM-AI-COST-01-ARCHITECTURE.md) — **SUPERSEDED** przez ten FREEZE.
