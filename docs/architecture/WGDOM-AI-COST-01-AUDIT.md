# WGDOM — AI-COST-01 · AUDIT + RCA (AI Kosztorysant)

> **ID:** WGDOM-AI-COST-01  
> **STATUS:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (czekaj na Owner GO + Design Freeze thin slice)  
> **Data:** 2026-07-26  
> **Klasa:** FEATURE / TEUX · **#CORE-013** — zero Payroll / Cloud Sync write-path / Edge merge  
> **Tip SSOT:** [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · UI **2.65.51** (AP2-S4)  
> **Companion:** [`WGDOM-AI-COST-01-ARCHITECTURE.md`](WGDOM-AI-COST-01-ARCHITECTURE.md)

```text
════════════════════════════════════════════════════════
AUDIT ONLY — zero src/** · zero commit · zero push
Następny krok: Owner ACK → DESIGN FREEZE (COST-S0/S1) → Owner GO → IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (sesja AUDIT)

```text
PAYROLL SAFETY GATE
G1 Payroll:      NIE
G2 LocalStorage: NIE   (future override KV = istniejący wzorzec; OUT z AUDIT)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE   (V4 tabs — bez zmian w AUDIT)
Wynik: ALL-NIE (AUDIT ONLY)
Owner GO needed: YES przed IMPLEMENT · STABILIZATION WINDOW ACTIVE
```

**Boundary:** domena **Przetargi / TEUX** · ewentualne Work Catalog = istniejący SSOT cen (nie payroll).  
**Protected Core:** nietknięty.

---

## 1. Cel biznesowy (brief Ownera)

WGDOM ma stać się **AI Kosztorysantem**:

```text
Przetarg
  → Analiza dokumentów (AP2)
  → Rozpoznanie przedmiaru
  → Automatyczne przygotowanie kosztorysu ofertowego
  → Wyliczenie kosztów (M + R + S + Kp)
  → Cena ofertowa + rentowność
  → Rekomendacja AI
  → Ręczna korekta każdej pozycji
  → Gotowa oferta
```

Ten dokument = **AUDIT + RCA**. Architektura / model / UI / źródła cen / roadmap → **ARCHITECTURE**.

---

## 2. Stan obecny — mapa (as-is)

### 2.1 Pipeline Przetargi (powiązany)

```text
TenderDetailPage
  └─ useTenderPipelineRuntime
       ├─ bootstrap / heavy lazy     → TenderKosztorysSnapshot
       ├─ useTenderPricingAuto       → Pricing Gate + computeTenderBidProposal
       └─ Autonomous Gate (NG-10)    → OUT z AI-COST (nie przebudowywać)

AP2 S0–S4 (LIVE 2.65.47–51)
  S0 canPrepareValuation / semantyka przedmiaru
  S1 kompletność + gotowość wyceny
  S2 auto-analiza UX
  S3 deep facts (SWZ / przedmiar / umowa)
  S4 Business Risk Engine (docs-only)
```

### 2.2 Co już istnieje (REUSE FIRST)

| Warstwa | Pliki / API | Co daje AI-COST |
|---------|-------------|-----------------|
| **Parser ATH/PDF** | `ath-parser.ts`, `pdf-przedmiar-heuristic.ts`, `ath-kosztorys-pdf.ts` | LP · opis · jm · ilość · (ATH: R/M/S w breakdown kategorii) |
| **Snapshot** | `TenderKosztorysSnapshot`, `TenderCostLine`, `TenderCatalogQuantityLine` | SSOT pozycji przedmiaru (cap 500) |
| **Dossier pipeline** | `tender-dossier-pipeline.ts`, cost discovery | Heavy parse → kosztorys |
| **Bid calculator** | `tenders-bid-calculator.ts` → `TenderBidProposal` | Aggregat: robocizna + materiały + Kp + overhead + marża + bid |
| **Catalog engine** | `wgdom-catalog-cost-engine.ts`, `tender-active-catalog.ts` | Koszt bezpośredni M+R z katalogu |
| **Ceny firmy** | Work Catalog · `TenderCompanyCostModel` · `company-labor-cost.ts` | Region, RBH, kpPct, profitPct, overhead |
| **Override** | `tender-price-overrides.ts` | Dziś: **per kategoria**, nie per LP |
| **UI Kosztorys** | `TenderKosztorysWorkspace`, BOQ Explorer, `TenderBidProposalPanel` | KPI + tabela ATH vs WGDOM + panel oferty |
| **AP2** | completeness · deep intelligence · business risk | Gate jakości docs + kontekst (nie silnik cen) |
| **Market (legal)** | work-catalog marketQuotes / CSV adapters | Ingest kontrolowany — **zakaz scrapingu** |

### 2.3 Co jest dziś „wyceną”, a nie „kosztorysantem”

| Obecne zachowanie | Limit vs cel Ownera |
|-------------------|---------------------|
| Jedna **propozycja ceny** (`recommendedBidPln`) | Brak pełnego kosztorysu ofertowego **pozycja × pozycja** z M/R/S/Kp/marżą |
| Katalog → agregacja po kategoriach | Brak mapowania AI opis↔norma z pewnością per LP |
| Override kategorii | Brak edycji ceny **każdej** pozycji |
| Sprzęt | ATH pokazuje kn= sprzęt; bid = głównie `toolWearWeeklyPln` (proxy), nie linia S |
| AP2 S4 werdykt | Ryzyko **dokumentacyjne** — nie kosztowe / rentownościowe 1:1 |
| Pricing Gate | Blokuje auto przy `NOT_FOUND`; nie buduje BOQ ofertowego |

---

## 3. REUSE inventory (konkret)

### MUST REUSE (zakaz duplikatu)

1. `computeTenderBidProposal` / `TenderBidProposal` — rozszerzać, nie pisać drugiego kalkulatora oferty.  
2. `TenderKosztorysSnapshot` + `catalogQuantities` — źródło pozycji.  
3. `canPrepareValuation` + `canComputeTenderPricingAuto` — bramy gotowości.  
4. `resolveActiveCatalogForTender` + Work Catalog — SSOT cen robót/materiałów.  
5. `TenderCompanyCostModel` + labor fully-loaded — parametry firmy.  
6. BOQ Explorer UI — baza tabeli pozycji (rozszerzyć o edycję / breakdown).  
7. AP2 S1/S3 — sygnały kompletności i przedmiaru jako wejście do COST.

### NICE REUSE

- `tender-cost-calibration.ts`, bid-quality, construction-scope  
- AP2-S4 jako **równoległy** panel ryzyka (nie mieszać z Pricing Gate)  
- Market CSV ingest (P3 work-catalog) jako przyszłe źródło

### DO NOT REUSE AS PRICE ENGINE

- Scraping KB.pl / Google / marketplaces  
- `BusinessVerdict` S4 jako jedyny werdykt oferty  
- Zmiana Autonomous Gate „przy okazji”

---

## 4. RCA — dlaczego nie jesteśmy jeszcze AI Kosztorysantem

### PRIMARY RC-1 — Model agregatu zamiast kosztorysu pozycyjnego

**Objaw:** Owner widzi „rekomendowaną cenę”, nie edytowalny kosztorys ofertowy pozycji.  
**Przyczyna:** historyczny produkt = **bid proposal** (suma) oparty o kategorie katalogu / ATH total, nie o **OfferBoqLine** z pełnym rozbiciem M/R/S/Kp/marża.  
**Skutek:** brak ścieżki „popraw jedną pozycję → przelicz całość”.

### CONTRIBUTING

| ID | Problem | Skutek |
|----|---------|--------|
| **RC-2** | Matching opis→katalog = keywords/UNKNOWN % | Słaba pewność AI per pozycja |
| **RC-3** | Override tylko per kategoria | Nie da się skorygować pojedynczej LP |
| **RC-4** | Sprzęt nie jest first-class w silniku wyceny | Niepełny kosztorys budowlany |
| **RC-5** | AP2 inteligencja oderwana od liczb oferty | Fakty S3 nie karmią BOQ |
| **RC-6** | Dual catalog (work vs legacy cost) | Ryzyko driftu cen — Work Catalog = SSOT |

### PRIMARY FIX DIRECTION

```text
Nie budować „nowego kalkulatora obok”.
Zbudować Offer Costorysant Layer:
  Snapshot pozycji → OfferBoq (M/R/S/Kp/marża per LP)
  → agregat = istniejący TenderBidProposal (REUSE)
  → UI edycji LP → recompute
```

---

## 5. Dane już dostępne do budowy kosztorysu

| Dane | Skąd | Użycie COST |
|------|------|-------------|
| LP, opis, jm, ilość | ATH / PDF heuristic / catalogQuantities | Wiersze BOQ |
| Kategorie / branże | snapshot.categories, construction-scope, S3 | Mapowanie + filtry |
| KNR/KNNR hints | pdf heuristic, S3 przedmiar insights | Matching katalogu |
| ATH unitPrice/total | gdy FOUND_WITH_VALUE | Seed / porównanie |
| Ceny katalogowe M+R | Work Catalog / cost engine | Domyślna wycena |
| Parametry firmy | costModel (kp, profit, RBH, overhead) | Kp, marża, labor rate |
| Overrides | price-overrides (kategoria) | Start; rozszerzyć do LP |
| Kompletność / gotowość | AP2-S1 | Gate „czy startować COST” |
| Ryzyka docs | AP2-S4 | Input do ryzyka **kosztowego** (osobny moduł) |
| Kryteria / wadium / terminy | AP2-S3 facts | Kapitał obrotowy, bufor czasu (późniejsze slice) |

---

## 6. UI do ponownego użycia

| Komponent | Ścieżka | Rola w COST |
|-----------|--------|-------------|
| `TenderKosztorysWorkspace` | app | Shell zakładki Kosztorys |
| BOQ Explorer | `tender-kosztorys-boq-explorer` + section | Tabela pozycji |
| `TenderBidProposalPanel` | app | Podsumowanie ceny (góra) |
| `TenderCatalogLinePricingSection` | app | Wzorzec override / transparency |
| `TenderDocumentsSummaryHeader` | app | AP2 kontekst (nie zastępuje COST) |
| Work Catalog / Price Base tabs | tenders tabs | Konfiguracja źródeł cen |

---

## 7. Gate (FEATURE)

G1–G9 **ALL-NIE** dla planowanego EPIC (o ile IMPLEMENT nie rusza Payroll/sync).  
Zmiana Pricing Gate tylko w osobnym DF + Owner GO (np. COST-S5 alignment z AP2-S6).

---

## 8. Werdykt AUDIT

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy budować od zera? | **NIE** — REUSE parserów, snapshotu, bid calculatora, katalogu, UI Kosztorys |
| Czy brakuje warstwy? | **TAK** — pozycyjny Offer BOQ + silniki M/R/S + edycja LP + pewność AI |
| Czy scraping? | **ZAKAZ** — tylko źródła kontrolowane / user |
| Czy implementować teraz? | **NIE** — tylko dokumenty; IMPLEMENT po Owner GO |

**Następny dokument:** [`WGDOM-AI-COST-01-ARCHITECTURE.md`](WGDOM-AI-COST-01-ARCHITECTURE.md)

---

**AI-COST-01 AUDIT + RCA** · 2026-07-26 · **AUDIT COMPLETE** · **NO CODE**
