# AI-COST-02-B — DESIGN FREEZE

> **ID:** AI-COST-02-B-DESIGN-FREEZE  
> **Parent:** WGDOM-AI-COST-02 · thin slice **02-B** (Explain + Queue)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **IMPLEMENT ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-29  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE\*** (\*G2 = wyłącznie nowy klucz flagi FEATURE — nie Payroll)  
> **Wejście:** AUDIT **PASS** · PLAN **PASS** ([`AI-COST-02-B-PLAN.md`](AI-COST-02-B-PLAN.md) · [`AI-COST-02-B-PLAN-COMPLETE.md`](AI-COST-02-B-PLAN-COMPLETE.md))  
> **Baseline tip:** UI **2.65.77** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależności CLOSED:** AI-COST-01 **FROZEN** · COST-02-A **CLOSED** · COST-BID-GAP-01/GAP-A **CLOSED** · COST-MULTI **CLOSED** · P0-RETRY **CLOSED** · ZIP **STABLE**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (AI-COST-02-B Phase 1):
  Explainability RO + Impact-first Review Queue
  — OBOK freeze AI-COST-01
  — BEZ parserów / ZIP / ATH / Bid calculator / GAP-A
  — BEZ nowego silnika AI / Payroll / Cloud Sync / Storage CORE

IMPLEMENT zakazany do: Architecture Review PASS + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*jedyny wyjątek FEATURE: nowy klucz flagi
                        kw-ai-cost-02-b-explain-queue — bez kasowania/migracji LP)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (bez nowych tras)

Wynik: ALL-NIE · FEATURE (flag LS = wzorzec GAP-A / TRE)
Owner GO CORE: NIE
Owner GO IMPLEMENT (slice): TAK — po Arch Review PASS
```

Jeżeli IMPLEMENT naruszy G3 / Payroll / `cloud-sync.ts` / Storage CORE → **STOP** · nowy DF.

---

## 1. Cel architektoniczny (zamrożony)

Zamrozić **cienkie rozszerzenie warstwy prezentacji i workflow weryfikacji** kosztorysu AI:

1. **Explainability (RO)** — użytkownik rozumie: origin kwot, dokumenty źródłowe, Top-K wpływu, założenia silnika.  
2. **Queue (impact-first)** — użytkownik wie, od której pozycji zacząć review; widzi licznik pozostałych.

**Efekt:** wyższa jakość decyzji człowieka na pozycjach o największym wpływie na direct — **bez** zmiany generatora oferty, **bez** hardcodu kwot, **bez** przebudowy S1–S7 core.

**Sukces EPIC ≠** Bid == Owner ~1,6M.  
**Sukces EPIC =** Explain + Queue zgodne z AC · flaga OFF = parity tip.

---

## 2. Decyzje produktowe zamrożone (z PLAN COMPLETE D1–D4)

| ID | Decyzja | Wartość FROZEN |
|----|---------|----------------|
| **D1** | Scope Phase 1 | **Explain (I1) + Queue (I2)** tylko |
| **D1b** | Competitiveness RO (I3) | **OUT Phase 1** · osobny thin slice / Phase 2 po PV |
| **D2** | Default filtr `reviewOnly` gdy N>0 | **NIE** — chip opt-in |
| **D3** | Top-K wpływu | **K = 5** |
| **D4** | Feature flag | default **OFF** · LS `kw-ai-cost-02-b-explain-queue` |

Zmiana D1–D4 = **amend DF** + Owner GO.

---

## 3. Zakres funkcjonalny IN (zamrożony)

### 3.1 Explainability (RO)

| ID | Wymaganie zamrożone |
|----|---------------------|
| **E1** | Prezentacja **origin** kwoty komponentu (catalog / controlled_market / company_knowledge / heuristic / user — REUSE istniejących origin kinds; bez nowych silników) |
| **E2** | Blok **dokumentów źródłowych**: `kosztorys.sourceFilename` oraz, gdy dostępne, ścieżka ZIP→plik / `costDiscovery` / skrót `costCandidateSources` — **READ ONLY** z dossier |
| **E3** | Ranking **Top-5** pozycji po wpływie na direct (`lineDirect` / udział % w sumie) — RO |
| **E4** | Sekcja **Założenia silnika** (RO): mapping confidence · strategy S3 (gdy dostępna) · „AI = direct, bez Kp/marży” · Bid = osobna warstwa (odczyt summary Bid, bez edycji) · status flagi GAP-A ON/OFF jako **tekst statusu** (bez toggle GAP-A) |
| **E5** | Otwarcie Explain **nie mutuje** cen / `user_changed` / OfferBoq |

### 3.2 Queue (impact-first)

| ID | Wymaganie zamrożone |
|----|---------------------|
| **Q1** | Lista / panel „Do weryfikacji” sortowany po S7 **`impactScore` ↓** (REUSE `tender-offer-boq-validation`) |
| **Q2** | Klik pozycji → fokus / scroll do linii OfferBoq |
| **Q3** | **Review counter**: pozostało / łącznie (bazowane na istniejących sygnałach review / unresolved — bez nowego persist modelu) |
| **Q4** | Filtr `reviewOnly` = **opt-in chip** (D2) — nie force default |
| **Q5** | Mobile: jedna kolumna · touch ≥44px · brak horizontal overflow krytyczny |

### 3.3 Cross-cutting IN

| ID | Wymaganie |
|----|-----------|
| **X1** | Feature flag default **OFF** (§7) |
| **X2** | Pure helpers + testy unit (§11) |
| **X3** | Thin UI PL · Mobile First |
| **X4** | Docs DF / IMPL / PV / CLOSEOUT po ścieżce release |

---

## 4. Zakres funkcjonalny OUT (zamrożony — twarde)

```text
✗ Parsery ZIP / unpack / zip-catalog Edge
✗ ATH parser / PDF przedmiar parsers
✗ Bid Calculator (tenders-bid-calculator.ts logika)
✗ COST-BID-GAP-01 / GAP-A (classifier · rates · default ON · semantyka flagi)
✗ GAP-B / GAP-C implementacja
✗ Nowy silnik AI / LLM pricing / autopilot oferty
✗ Drugi kalkulator oferty / Kp / marża w AI-COST
✗ Payroll / Domain Push / PWRB / fence
✗ Cloud Sync / cloud-sync.ts / DATA_KEYS / Edge
✗ Storage CORE / bootstrap / week keys
✗ Architektura AI-COST-01 S1–S7 core (przebudowa)
✗ Pricing engine rewrite / nowy OfferBoqPriceSourceProvider
✗ Discovery rewrite / COST-MULTI Aggregate/Branch/Force rewrite
✗ Company Knowledge schema / cloud CK
✗ Predykcja szans wygrania
✗ COSTORYS Wave 3 (virtualization / dense grid)
✗ TRE-03 / Autonomous / e-składanie
✗ Hardcode 1,6M / global multiplier / target-hacking
✗ Nowe trasy / shell rewrite / parallel GDS components
✗ Mixed FEATURE+CORE (#CORE-013)
✗ Phase 1 Competitiveness RO (I3) — OUT do Phase 2
```

---

## 5. Zakres techniczny (zamrożony)

### 5.1 Warstwa danych / logiki

| Warstwa | Zachowanie FROZEN |
|---------|-------------------|
| S1 OfferBoqDocument | **READ** — bez nowego modelu dokumentu |
| S2 Mapping | **READ** — zero diff preferowane |
| S3 Cost Intelligence | **READ** — strategy do Założeń |
| S4 Pricing | **ZERO DIFF** — brak nowego providera w 02-B |
| S4.1 Explainability | **PRIMARY WRITE** — enrichment view-model RO |
| S5 / S5.1 | **ZERO DIFF** semantyki edycji / CK (REUSE prezentacji) |
| S6 Bid adapter | **Call-only / ZERO DIFF** |
| S7 Validation | **READ** scoringu; dopuszczalny **cienki pure helper** sort/filter **bez** zmiany `impactScore` formula |
| Bid calculator | **READ** pól summary do Założeń — **ZERO DIFF pliku logiki** |
| Dossier scan/kosztorys | **READ** pól dokumentów |
| GAP-A flag | **READ status** — **ZERO DIFF** semantyki |

### 5.2 Warstwa UI

| Element | Zachowanie FROZEN |
|---------|-------------------|
| `OfferBoqCostIntelligencePanel` | Thin UI Explain blocks + Queue (za flagą) |
| Sticky summary bar | Opcjonalnie counter „Do weryfikacji: N” — bez nowego sticky konkurującego z Offer bar |
| Accordion Explain | REUSE W1 — domyślnie collapsed OK; sekcje 02-B wewnątrz |
| Outcome / TRE | **ZERO DIFF** wymagany |

### 5.3 Persist

| | FROZEN |
|--|--------|
| Nowy persist wyceny | **NIE** |
| Nowy KV / Edge | **NIE** |
| Jedyny nowy LS | Flaga `kw-ai-cost-02-b-explain-queue` |
| Telemetria | Opcjonalne eventy w **istniejącym** LS telemetry module — bez cloud; nie wymagane AC Phase 1 |

---

## 6. Komponenty objęte zmianami (allowlista FROZEN)

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/lib/tender-offer-boq-explainability.ts` | Enrichment RO: origin surface · documents block · Top-5 · assumptions · view fields |
| `src/lib/tender-offer-boq-02b-queue.ts` (**NOWY**, nazwa ostateczna w tej roli) | Pure: sort/filter kolejki z S7 issues + counter — **bez** nowego scoringu |
| `src/lib/ai-cost-02-b-flag.ts` (**NOWY**, cienki) | Resolve flag default OFF · LS key |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Thin UI Explain + Queue za flagą |
| `src/app/kosztorys/OfferBoqStickySummaryBar.tsx` | **Opcjonalnie** counter N — tylko jeśli AC-Q3 wymaga widoczności poza panelem |
| `scripts/test-ai-cost-02-b-explain-queue.mjs` (**NOWY**) | Unit/regresja AC |
| Regresja (uruchomienie): `scripts/test-cost-s4*.mjs` / `test-cost-stab-01.mjs` / `test-cost-s7*.mjs` | Bez zmiany kontraktu STAB; dopuszczalne asercje „flag OFF = parity” |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wpis UI **po** IMPLEMENT + Owner GO release |
| Docs `AI-COST-02-B-*` · tip `09` · `CURRENT-TASK` | Po release / closeout |

**Zasada:** żaden plik spoza listy. Rozszerzenie = **amend DF** + Owner GO.

---

## 7. Komponenty wyłączone (bloklista FROZEN)

| Plik / obszar | Zakaz |
|---------------|-------|
| `src/lib/tenders-bid-calculator.ts` | Logika Bid / Kp / marża / stack |
| `src/lib/tender-offer-boq-bid-adapter.ts` | Omijanie Bid / zmiana kontraktu S6 |
| `src/lib/tender-offer-boq-pricing-engine.ts` | Rewrite S4 / nowy provider |
| `src/lib/tender-offer-boq-controlled-price-source.ts` | Zmiana COST-02-A |
| `src/lib/tender-offer-boq-mapping.ts` | S2 rewrite |
| `src/lib/tender-offer-boq-cost-intelligence.ts` | S3 rewrite |
| `src/lib/tender-offer-boq-company-knowledge.ts` | Schema CK |
| `src/lib/tender-offer-boq-component-edit.ts` | Semantyka preservacji (preferuj ZERO DIFF) |
| `src/lib/tender-offer-boq-validation.ts` | Zmiana formuły `impactScore` / nowy quality engine — **tylko READ** (helper poza plikiem) |
| `src/lib/tender-offer-boq.ts` | Nowy model dokumentu (preferuj ZERO DIFF) |
| `src/lib/cost-bid-gap-01-*` / flaga GAP-A | Re-open GAP-A |
| `src/lib/cost-parser-zip-unpack.ts` · parsers ATH/PDF · Edge zip | ZIP/ATH |
| `src/lib/tender-cost-discovery.ts` · cost-multi-* | Discovery / MULTI |
| `src/lib/cloud-sync.ts` · `DATA_KEYS` · Edge functions | Cloud / Storage CORE |
| Payroll / bootstrap / week | Payroll |
| `src/lib/wgdom-foundation/**` | Foundation wiring |
| TRE Outcome rewrite | Poza slice |

---

## 8. Punkty REUSE (zamrożone — komplet)

| # | REUSE | Użycie w 02-B |
|---|-------|---------------|
| R1 | `presentOfferBoqExplainabilityView` | Baza Explain — rozszerzać, nie forkać |
| R2 | Origin / confidence badges (S4.1 istniejące) | E1 |
| R3 | COST-02-A `controlled_market` metadane | Origin market w Explain |
| R4 | S5.1 Company Knowledge explain fields | Origin CK |
| R5 | `tender-offer-boq-validation` groups + `impactScore` | Queue sort |
| R6 | Filtr `reviewOnly` (COSTORYS W1) | Q4 opt-in |
| R7 | Accordion Explain + Sticky Offer bar | Chrome |
| R8 | `OfferBoqDocument` / `lineDirect` / totals | Top-5 |
| R9 | `tenderDossier.kosztorys.sourceFilename` | Dokumenty |
| R10 | `scanSummary.costDiscovery` · `costCandidateSources` | Dokumenty (READ) |
| R11 | Bid proposal summary (istniejący view/sticky) | Założenia stack RO |
| R12 | Flaga GAP-A resolve (READ) | Status tekstowy w Założeniach |
| R13 | STAB preservacja user_* | Zero naruszeń |
| R14 | S6 `integrateOfferBoqWithBidProposal` | Call-only path |

**ZERO DUPLICATE:** zakaz drugiego Explain VM, drugiej kolejki scoringu, drugiego Bid.

---

## 9. Feature Flag (zamrożony)

| Pole | Wartość FROZEN |
|------|----------------|
| **Const / nazwa** | `AI_COST_02_B_EXPLAIN_QUEUE` (kod) |
| **LS key** | `kw-ai-cost-02-b-explain-queue` |
| **Default** | **OFF** |
| **OFF** | Brak UI Explain enrichment 02-B + Queue 02-B (= tip parity) |
| **ON** (`1` / `true`) | Explain E1–E5 + Queue Q1–Q5 widoczne |
| **Zakaz** | Wspólny toggle z `COST_BID_GAP_01_CATALOG_CAL` |
| **Zakaz** | Default ON w Phase 1 release bez osobnego Owner GO ops |

---

## 10. Acceptance Criteria (zamrożone)

### Explain

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-E1** | Przy flag ON, dla wycenionej linii widać **origin** kwoty komponentu | Origin label widoczny |
| **AC-E2** | Przy flag ON widać **dokument źródłowy** (`sourceFilename` lub równoważny dostępny sygnał) | Tekst / ścieżka |
| **AC-E3** | Przy flag ON widać **Top-5** pozycji wpływu na direct | ≤5 pozycji, posortowane |
| **AC-E4** | Przy flag ON widać sekcję **Założenia** (AI bez Kp · Bid osobno · status GAP-A RO) | Sekcja obecna |
| **AC-E5** | Otwarcie Explain nie zmienia `user_changed` / kwot | Snapshot before/after równy |

### Queue

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-Q1** | Flag ON → kolejka posortowana po `impactScore` ↓ | Porządek zgodny z S7 |
| **AC-Q2** | Klik pozycji fokusuje linię OfferBoq | Scroll/highlight |
| **AC-Q3** | Counter pozostałych aktualizuje się po resolve/approve | Licznik spójny |
| **AC-Q4** | `reviewOnly` nie jest force-default | Chip opt-in |
| **AC-Q5** | Mobile 375px: kolejka używalna bez krytycznego overflow | Smoke |

### Boundary / Flag

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-B1** | Zero diff logiki `tenders-bid-calculator.ts` | `git diff` clean pliku |
| **AC-B2** | Zero diff parser ZIP / ATH / discovery / GAP-A modules | allowlist only |
| **AC-B3** | Flag default OFF → UI bez bloków 02-B | Parity |
| **AC-B4** | Testy `test-ai-cost-02-b-explain-queue.mjs` PASS | CI/local |
| **AC-B5** | Regresja STAB / S7 smoke PASS | Uruchomienie |

### Anti-AC (nie wolno wymagać)

| ID | Anti |
|----|------|
| **AC-X1** | Bid == 1,6M Owner |
| **AC-X2** | Auto-approve / auto-price |
| **AC-X3** | Nowy silnik AI |
| **AC-X4** | Zmiana default GAP-A |

---

## 11. Rollback Strategy (zamrożona)

```text
L1 — Natychmiast (ops, bez redeploy):
  localStorage.setItem('kw-ai-cost-02-b-explain-queue', '0')
  # lub removeItem
  → UI 02-B OFF · wycena Bid/AI path bez zmian

L2 — Tip revert (tylko Owner GO):
  revert commitów allowlisty FEATURE 02-B
  → nie ruszać GAP-A / P0-RETRY / MULTI / parsers

L3 — Zakaz rollbacku „przy okazji”:
  COST-BID-GAP-01 · ZIP · Payroll · Cloud
```

**DoD rollback test:** AC-B3 weryfikowalne po L1.

---

## 12. Mobile First (zamrożone)

| Reguła | FROZEN |
|--------|--------|
| Layout | Jedna kolumna na `< md` |
| Touch | min-h 44px na CTA kolejki / chipy |
| Explain | Accordion — bez ściany kart w first paint |
| Top-5 | Nad listą lub w accordion „Wpływ” — nie 5 sticky |
| Sticky | Nie dodawać drugiego sticky konkurującego z Offer Summary bez uzasadnienia AC |

---

## 13. Zgodność z zasadami (zamrożona weryfikacja)

| Zasada | Werdykt DF |
|--------|------------|
| **SSOT FIRST** | Direct = OfferBoq · Oferta = Bid · Tip = `09` · Explain = S4.1 VM |
| **REUSE FIRST** | R1–R14 — zero nowego silnika |
| **ZERO DUPLICATE LOGIC** | Helper kolejki nie duplikuje `impactScore`; Explain nie forkuje VM |
| **MOBILE FIRST** | §12 |
| **Payroll Safety Gate** | §0 ALL-NIE FEATURE |
| **AI-COST-01 Freeze** | Rozszerzenie obok (RO+UX) · S4 pricing ZERO DIFF |
| **#CORE-013** | FEATURE only bundle |

---

## 14. Fixtures PV (zamrożone)

| Fixture | Cel |
|---------|-----|
| `08dee335` | Top-5 · Queue · Założenia · Bid RO · flag OFF/ON |
| `08dee178` | Dokument ZIP→ATH w Explain (po P0-RETRY) |

---

## 15. Etapy po FREEZE

```text
1. Architecture Review (osobny dokument) → PASS/FAIL
2. Owner GO IMPLEMENTATION
3. IMPLEMENT Phase 1 (allowlista)
4. TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
5. Phase 2 (I3) — tylko nowy DF lub amend + GO
```

---

## 16. Zakaz IMPLEMENT z tego dokumentu

Ten plik **nie** jest kodem.  
**IMPLEMENT** dopiero po: **Architecture Review PASS** + **Owner GO IMPLEMENTATION**.

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**Phase 1:** Explain + Queue · Flag OFF · Top-5 · reviewOnly opt-in  
**Next:** Architecture Review
