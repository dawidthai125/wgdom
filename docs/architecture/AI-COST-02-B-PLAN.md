# AI-COST-02-B — PLAN

> **ID:** AI-COST-02-B-PLAN  
> **MODE:** **PLAN ONLY** · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Status procesu:** PLAN (ten dokument) → DESIGN FREEZE → Arch Review → Owner GO → IMPLEMENT  
> **Tip prod:** **2.65.77** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Punkt startowy:** [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md)  
> **Zależności CLOSED:** AI-COST-01 **FROZEN** · COST-02-A **CLOSED** · COST-BID-GAP-01/GAP-A **CLOSED** · COST-MULTI **CLOSED** · AI-COST-PARSER-01 P0-RETRY **CLOSED · PV** · ZIP **STABLE**

```text
════════════════════════════════════════════════════════
CEL EPIC (One Bundle = One Goal — warstwa jakości):
  Zwiększyć jakość wyceny AI-COST oraz jakość uzasadnienia
  (Explain) + czytelność kolejki weryfikacji — OBOK freeze AI-COST-01.

  NIE: naprawa parserów / ZIP / ATH / Heavy pipeline
  NIE: hardcode kwot / target-hacking do ~1,6M
  NIE: re-open COST-BID-GAP-01 / GAP-A
  NIE: nowy silnik AI / drugi kalkulator oferty
════════════════════════════════════════════════════════
```

---

## 0. Kontekst wejściowy

| Pole | Stan |
|------|------|
| AI-COST-PARSER-01 P0-RETRY | **CLOSED** · PV **PASS** · feature `e88d689f` |
| Production UI | **2.65.77** |
| Parser ZIP | **STABLE** (świeży Heavy OK na fixture) |
| SSOT | **FINALIZED** |
| Residual wycena | Bid GAP-A ON ≈ **1,21M** vs Owner ≈ **1,6M** — **nie** cel „dopchnąć”; cel = **rozumieć + poprawiać jakość wejść AI** |

**Workflow:**

```text
[NOW]   PLAN           → TEN DOKUMENT
[NEXT]  DESIGN FREEZE  → thin allowlist + AC zamrożone
[NEXT]  Architecture Review + Boundary #CORE-014
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
```

---

## 1. Odpowiedzi na pytania Ownera

### 1.1 Jak zmniejszyć różnicę AI ↔ realny kosztorys **bez hardcodu**?

Różnica (AI / Bid vs „realna” wycena Ownera) **nie** jest celem numerycznym release’u. Zmniejszanie luki = **jakość decyzji człowieka na właściwych pozycjach** + **lepsze wykorzystanie już istniejących źródeł cen**, nie skalowanie wyniku.

| Dźwignia (IN 02-B) | Mechanizm (REUSE) | Dlaczego bez hardcodu |
|--------------------|-------------------|------------------------|
| **A. Impact-first review** | S7 `impactScore` / grupy rekomendacji → kolejka „najpierw największy wpływ na direct” | User koryguje drogie błędy; suma zbliża się naturalnie |
| **B. Transparentność luk jakości** | Explain RO: % UNKNOWN / low confidence / brak market / brak CK | User wie *co* psuje wycenę, nie „magiczna liczba” |
| **C. Lepsze pokrycie źródeł już dostępnych** | REUSE COST-02-A `controlled_market` · CK S5.1 · catalog rates (GAP-A flaga **as-is**, bez re-open) | Więcej pozycji z uzasadnioną stawką = mniej fallbacków |
| **D. Asumpcje silnika widoczne** | Explain: origin · strategy · Kp/marża tylko jako **odczyt Bid** (RO), nie edycja w AI | Zaufanie + świadoma korekta user_changed |

| Dźwignia **OUT** (świadomie) | Powód |
|------------------------------|--------|
| GAP-B stack / costModel tuning | Osobny DF — **nie** re-open COST-BID-GAP-01 |
| Hardcode 1,6M / mnożnik globalny | Zakaz freeze + lessons |
| Zmiana `computeTenderBidProposal` | SSOT oferty — tylko konsument |
| Parsery / ZIP / Discovery | Parser STABLE · poza celem EPIC |

**Sukces jakościowy (mierzalny bez target-hack):**

1. Spadek udziału pozycji `requiresUserReview` / low confidence wśród **Top-N impact** po review (fixture).  
2. Wzrost udziału komponentów z `controlled_market` / CK / catalog (gdy flaga GAP-A ON — **bez** zmiany flagi w tym EPIC).  
3. Czas do pierwszej korekty krytycznej pozycji ↓ (UX kolejki).  
4. **Opcjonalnie MONITOR:** Δ Bid vs Owner — raportowana, **nie** AC pass/fail.

---

### 1.2 Jak poprawić Explain (skąd kwota · dokumenty · wpływ · założenia)?

**REUSE FIRST:** `presentOfferBoqExplainabilityView` (`tender-offer-boq-explainability.ts`) + panel `OfferBoqCostIntelligencePanel` + sticky summary (COSTORYS-UX W1/W2).

| Pytanie użytkownika | Propozycja PLAN (RO) | Źródło danych (istniejące) |
|---------------------|----------------------|----------------------------|
| Skąd każda kwota? | Karta komponentu: **origin** · rate · qty · formula skrót · confidence badge | S4 pricing + COST-02-A origin `controlled_market` |
| Które dokumenty wpłynęły? | Blok „Źródło przedmiaru”: `sourceFilename` · ścieżka ZIP→ATH · `costDiscovery` / `costCandidateSources` (READ dossier) | `tenderDossier.kosztorys` · `scanSummary` (MULTI CLOSED — tylko odczyt) |
| Które pozycje największy wpływ? | Ranking Top-K po `lineDirect` / udział % w sumie direct · link do kolejki S7 | OfferBoq totals + S7 `impactScore` |
| Jakie założenia silnika? | Sekcja „Założenia”: mapping confidence · strategy S3 · brak Kp w AI · Bid stack = osobna warstwa (link RO do Bid summary) · flaga GAP-A ON/OFF jako **status** (nie przełącznik w 02-B) | Freeze diagram + Bid proposal fields RO |

**Zasada UI:** Explain = **read-only transparency**. Edycja cen pozostaje w S5 (istniejąca). Nie budować drugiego „explain engine”.

**Mobile First:** jedna kolumna · accordion (już W1) · Top-K + założenia nad długą listą · touch ≥44px · bez nowych sticky kolizji z Offer bar.

---

### 1.3 Jak poprawić Queue / Workflow analizy?

**Problem dziś:** dużo sygnałów F2 / Outcome / OfferBoq; kosztorysant nie wie **od czego zacząć**.

| Krok UX (propozycja) | Zachowanie |
|----------------------|------------|
| 1. Wejście Kosztorys | Sticky: suma direct + oferta Bid (REUSE) + **„Do weryfikacji: N”** |
| 2. Kolejka | Lista/chipy z S7: posortowane po `impactScore` ↓ · grupy high/medium (REUSE `tender-offer-boq-validation.ts`) |
| 3. Fokus | Klik → scroll/highlight linii · filtr `reviewOnly` (już W1) jako default gdy N>0 **opcjonalnie za flagą** |
| 4. Postęp | Licznik „zweryfikowano / pozostało” (czysto UI ze stanu `user_approved` / resolved) |
| 5. Done | Gdy kolejka pusta lub tylko low — komunikat gotowości S7 (REUSE quality explain) |

**OUT kolejki:** nowy state machine pipeline Heavy · drugi Offer Run · Autonomous rewrite · TRE-03.

---

### 1.4 REUSE FIRST — co wykorzystać

| Warstwa | Moduł / artefakt | Rola w 02-B |
|---------|------------------|-------------|
| S1–S3 | OfferBoq · mapping · cost intelligence | **bez zmian kontraktu** · odczyt |
| S4 | Pricing + `OfferBoqPriceSourceProvider` · COST-02-A | REUSE providerów; **bez** nowego scrapingu |
| S4.1 | `tender-offer-boq-explainability.ts` | **PRIMARY** rozszerzenie RO |
| S5 / S5.1 | Edit · Company Knowledge | REUSE preservacji user · CK explain |
| S6 | `integrateOfferBoqWithBidProposal` | Call-only |
| S7 | `tender-offer-boq-validation.ts` · grupy · `impactScore` | **PRIMARY** kolejka |
| UI | `OfferBoqCostIntelligencePanel` · Sticky bar · F2 copy | Thin UX |
| Dossier | `kosztorys.sourceFilename` · `scanSummary.costDiscovery` · `costCandidateSources` | Explain „dokumenty” |
| Bid | `computeTenderBidProposal` / proposal RO fields | Założenia stack (odczyt) |
| Telemetria | `tender-offer-boq-ai-quality-telemetry.ts` | Opcjonalne eventy LS (bez cloud) |
| Flagi | `COST_BID_GAP_01_CATALOG_CAL` | **READ status only** — nie zmieniać semantyki |

---

### 1.5 Czego **NIE wolno** robić

```text
✗ Nowy silnik AI / LLM pricing / „autopilot oferty”
✗ Drugi kalkulator oferty / Kp / marża w warstwie AI-COST
✗ Edycja tenders-bid-calculator.ts (logika) — tylko RO konsumcja
✗ Re-open / rozszerzenie COST-BID-GAP-01 GAP-A (classifier · rates · default ON)
✗ GAP-B stack / costModel w tym EPIC (osobny DF jeśli kiedykolwiek)
✗ Parsery ATH/PDF · Edge zip-catalog · Discovery rewrite · Heavy pipeline
✗ ZIP unpack / P0-RETRY soft-invalidate (CLOSED)
✗ COST-MULTI Aggregate / Branch / Force Rescan rewrite
✗ Payroll · cloud-sync.ts · DATA_KEYS · Edge · fence
✗ Foundation FND-06 · App wiring Foundation
✗ Hardcode 1,6M / global multiplier / target-hacking
✗ sum(all) zamiast Branch Winners
✗ Mixed FEATURE+CORE (#CORE-013)
✗ Nowa trasa / shell rewrite / GDS parallel components
```

---

## 2. Zakres IN

| ID | IN | Thin slice note |
|----|----|-----------------|
| **I1** | **Explain enrichment RO** — źródło kwoty · dokumenty · Top-K wpływu · założenia silnika | Primary value |
| **I2** | **Review Queue UX** — sort/filter po S7 `impactScore` · licznik · fokus linii | Primary UX |
| **I3** | **Quality / competitiveness signals RO** — pozycja vs marketQuotes / CK / catalog (gdy dostępne); **bez** win-probability engine | Opcjonalnie Phase B w tym samym DF lub sub-slice |
| **I4** | Pure helpers + testy unit (explain/queue view-model) | Obowiązkowe |
| **I5** | Thin UI w `OfferBoqCostIntelligencePanel` (+ sticky jeśli potrzeba) · Mobile First | Obowiązkowe |
| **I6** | Feature flag default **OFF** | Obowiązkowe |
| **I7** | Docs: DF · IMPL · PV · CLOSEOUT | Obowiązkowe |

**Proponowany One Bundle na pierwszy release po DF:** **I1 + I2 + I4 + I5 + I6** (Explain + Queue).  
**I3** — w tym samym DF jako **Phase 2** albo osobny thin slice **02-B2** po PV Phase 1.

---

## 3. Zakres OUT

| ID | OUT |
|----|-----|
| **O1** | Parsery · ZIP · ATH · Heavy · Discovery |
| **O2** | COST-BID-GAP-01 re-open · GAP-B/C implementacja |
| **O3** | Zmiana Bid calculator / costModel / Payroll |
| **O4** | Nowy price provider / scraping / legal feed poza COST-02-A |
| **O5** | Predykcja szans wygrania (Starting Point §4.3) — osobny EPIC |
| **O6** | Cloud sync Company Knowledge |
| **O7** | COSTORYS Wave 3 (virtualization / dense grid) |
| **O8** | TRE-03 · Autonomous · e-składanie |
| **O9** | Telemetria A/B/C/D ZIP · Edge changes |

---

## 4. Analiza wpływu

| Obszar | Wpływ | Kierunek |
|--------|-------|----------|
| Kosztorysant (desktop/mobile) | **Wysoki pozytywny** | Szybsze zrozumienie wyceny + kolejka |
| Zaufanie do AI | **Wysoki** | Explain założeń zmniejsza „czarną skrzynkę” |
| Liczba Bid (PLN) | **Pośredni** | Poprzez lepsze review; **nie** AC numeryczny |
| AI-COST-01 freeze | **Neutralny** przy thin RO + S7 UX | Ryzyko przy „przypadkowym” touch S4 core |
| Bid / Payroll / Sync | **Zero** przy allowliście FEATURE | Gate GREEN |
| Parser / ZIP | **Zero** | OUT |
| Perf list długich | **Średni** | Top-K + accordion; bez virtualization (O7) |

---

## 5. Analiza ryzyk

| ID | Ryzyko | P | I | Mitygacja |
|----|--------|---|---|-----------|
| R1 | Scope creep → Bid/GAP-B | Śr | Wys | DF hard OUT · AC bez target PLN |
| R2 | Duplikacja explain / drugi VM | Śr | Śr | Rozszerzać `presentOfferBoqExplainabilityView` only |
| R3 | Naruszenie freeze S1–S7 | Niski | Wys | Arch Review · allowlist · testy regresji S4/S6/S7 |
| R4 | Mobile clutter | Śr | Śr | Accordion · Top-K≤5 · jedna CTA kolejki |
| R5 | Flaga GAP-A myli użytkowników | Niski | Śr | Status RO „kalibracja catalog: ON/OFF” bez toggle w 02-B |
| R6 | Oczekiwanie „domknięcia do 1,6M” | Wys | Śr | Copy + AC: sukces = jakość explain/queue, nie ΔPLN |
| R7 | Payroll/Shared accidental | Niski | Wys | Safety Gate ALL-NIE · zero `cloud-sync` |

---

## 6. Proponowane etapy wdrożenia

| Etap | Nazwa | Deliverable | Gate |
|------|-------|-------------|------|
| **E0** | DESIGN FREEZE | Zamrożenie I1+I2 (+I3?) · allowlist · AC · flag | Owner answers |
| **E1** | Arch Review | Boundary PASS · Gate G1–G9 | Reviewer |
| **E2** | IMPLEMENT Phase 1 | Explain RO + Queue UX + flag OFF + testy | Owner GO |
| **E3** | TEST / smoke | Unit + manual mobile/desktop fixture | — |
| **E4** | COMMIT / PUSH / PV | Tip · PV checklist | Owner GO |
| **E5** | CLOSEOUT Phase 1 | Docs tip | — |
| **E6** | (opcjonalnie) Phase 2 I3 | Competitiveness RO | Osobny GO jeśli nie w E0 |

---

## 7. Feature Flag (propozycja)

| Pole | Wartość |
|------|---------|
| **Nazwa** | `AI_COST_02_B_EXPLAIN_QUEUE` (robocza) |
| **LS key** | `kw-ai-cost-02-b-explain-queue` |
| **Default** | **OFF** (= tip parity bez nowej kolejki/explain blocks) |
| **ON** | Explain enrichment + impact queue UX |
| **Rollback** | `localStorage` = `0` / `removeItem` |
| **Zakaz** | Mieszanie z `COST_BID_GAP_01_CATALOG_CAL` w jednym toggle |

Flaga **potrzebna** — izoluje UX/quality od baseline wyceny i umożliwia szybki rollback bez revert kodu tipu.

---

## 8. Acceptance Criteria (draft → DF zamraża)

### AC — Explain

| ID | Kryterium |
|----|-----------|
| AC-E1 | Dla wycenionej linii użytkownik widzi **origin** kwoty komponentu (catalog / market / CK / heuristic / user) |
| AC-E2 | Widoczny jest **dokument źródłowy** kosztorysu (`sourceFilename` / ścieżka ZIP→plik gdy dostępna) |
| AC-E3 | Widoczny jest ranking **Top-K** pozycji po wpływie na direct (K≥3, K≤10) |
| AC-E4 | Widoczna jest sekcja **Założenia** (mapping · brak Kp w AI · Bid jako osobna warstwa) — RO |
| AC-E5 | Brak mutacji cen przy otwarciu Explain |

### AC — Queue

| ID | Kryterium |
|----|-----------|
| AC-Q1 | Przy flag ON lista „Do weryfikacji” sortowana po S7 `impactScore` ↓ |
| AC-Q2 | Klik pozycji fokusuje linię w OfferBoq |
| AC-Q3 | Licznik pozostałych pozycji review aktualizuje się po `user_approved` / resolve |
| AC-Q4 | Mobile: kolejka używalna bez horizontal overflow · touch target OK |

### AC — Boundary

| ID | Kryterium |
|----|-----------|
| AC-B1 | `tenders-bid-calculator.ts` **bez** diff logiki (lub zero diff pliku) |
| AC-B2 | Zero zmian parser / zip-unpack / discovery |
| AC-B3 | Zero zmian COST-BID-GAP-01 allowlist / semantyki flagi |
| AC-B4 | Flag default OFF → UI parity baseline |
| AC-B5 | Testy pure explain/queue **PASS** |

### AC — **NIE**

| ID | Anti-AC |
|----|---------|
| AC-X1 | Bid == Owner 1,6M |
| AC-X2 | Auto-approve pozycji |
| AC-X3 | Nowy silnik AI |

---

## 9. Rollback Plan

```text
1. Natychmiast (ops):
   localStorage['kw-ai-cost-02-b-explain-queue'] = '0'
   # lub removeItem
   → Explain/Queue 02-B UKRYTE; wycena Bid/AI bez zmian ścieżki

2. Tip revert (tylko Owner):
   revert commitów allowlisty 02-B (FEATURE only)

3. Nie rollbackować:
   COST-BID-GAP-01 · P0-RETRY · MULTI · parsers
```

---

## 10. Zgodność z zasadami

| Zasada | Jak spełnione |
|--------|----------------|
| **SSOT FIRST** | Direct = OfferBoq · Oferta = Bid · Tip = `09` · Explain = view-model S4.1 |
| **REUSE FIRST** | S4.1 · S7 · COST-02-A · panel · dossier fields · sticky |
| **ZERO DUPLICATE** | Zakaz drugiego Bid / explain engine / kolejki poza S7 |
| **MOBILE FIRST** | Accordion · Top-K · single column · 44px |
| **Payroll Safety Gate** | G1–G9 = **ALL-NIE** (FEATURE UI + pure helpers; brak Payroll/sync/Edge) |
| **#CORE-013** | Bundle FEATURE only |
| **AI-COST-01 Freeze** | Rozszerzenie **obok** (RO + UX), nie przebudowa S1–S7 core |

### Payroll Safety Gate (przewidywany)

```text
G1 Payroll: NIE · G2 LS*: TAK tylko nowy klucz flagi FEATURE (nie Payroll keys)
G3 Cloud Sync: NIE · G4 Bootstrap: NIE · G5 Week: NIE
G6 Shared hooks: NIE · G7 Providers: NIE · G8 Shell: NIE · G9 Routing: NIE
→ Gate GREEN przy DF (doprecyzować G2 jako FEATURE flag only)
```

\* Nowy klucz LS flagi = akceptowalny wzorzec jak GAP-A / TRE — **nie** Payroll domain.

---

## 11. Proponowana allowlista (draft — DF zamraża)

| Plik | Rola |
|------|------|
| `src/lib/tender-offer-boq-explainability.ts` | Enrichment RO |
| `src/lib/tender-offer-boq-validation.ts` | **READ**/ew. ekspozycja sort helper — prefer pure wrapper bez zmiany scoringu |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Thin UI |
| `src/app/kosztorys/OfferBoqStickySummaryBar.tsx` | Opcjonalnie licznik kolejki |
| `scripts/test-ai-cost-02-b-*.mjs` | Testy |
| Docs architecture 02-B-* | DF/IMPL/PV/CLOSE |

**Preferencja:** zero diff `tender-offer-boq-pricing-engine.ts` / `tenders-bid-calculator.ts` / parsers.

---

## 12. Fixtures / PV (draft)

| Fixture | Użycie |
|---------|--------|
| `08dee335` (GAP-A residual) | Explain Top-K · queue · Bid RO assumptions |
| `08dee178` (po P0-RETRY ATH OK) | Dokument ZIP→ATH w Explain źródeł |

PV: flag OFF/ON · mobile viewport · regression Bid parity OFF.

---

## 13. Relacja do innych EPIC-ów

| EPIC | Relacja |
|------|---------|
| COST-BID-GAP-01 | **CLOSED** — 02-B **nie** wznawia; czyta status flagi |
| GAP-B / GAP-C | Backlog **poza** 02-B; Explain 02-B pokrywa intencję GAP-C częściowo (RO) bez re-label |
| Work Catalog P3.3 | Komplementarne (dane) — nie blokuje 02-B |
| TP200B | Kompletność pozycji — OUT |
| AI-COST-02-A | REUSE provider |
| P0-RETRY | CLOSED · ZIP STABLE — OUT |

---

## 14. Rekomendacja PLAN → DF

Plan jest **spójny, thin, zgodny z freeze** i odpowiada na 5 pytań Ownera bez naruszenia OUT.

**Wymagane w DESIGN FREEZE (decyzje Ownera):**

1. Phase 1 = tylko **I1+I2** czy od razu **+I3**?  
2. Domyślny filtr `reviewOnly` przy N>0 — TAK/NIE?  
3. Top-K = 5 czy 10?  
4. Nazwa finalna flagi LS.

---

**PLAN STATUS:** **COMPLETE**  
**Werdykt:** → patrz [`AI-COST-02-B-PLAN-COMPLETE.md`](AI-COST-02-B-PLAN-COMPLETE.md)
