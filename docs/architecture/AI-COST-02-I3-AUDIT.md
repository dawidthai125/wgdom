# AI-COST-02 I3 — AUDIT

> **ID:** AI-COST-02-I3-AUDIT  
> **EPIC:** AI-COST-02 · **Slice:** **I3** — Competitiveness / quality signals (RO)  
> **STATUS:** **AUDIT ACCEPTED** · DESIGN FREEZE → [`AI-COST-02-I3-DESIGN-FREEZE.md`](./AI-COST-02-I3-DESIGN-FREEZE.md)  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO CODE**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** AI-COST-02 **I3** · STATUS APPROVED · Owner **AUDIT ACCEPTED** · **GO DESIGN FREEZE**  
> **Parents:** [`WGDOM-AI-COST-02-STARTING-POINT.md`](./WGDOM-AI-COST-02-STARTING-POINT.md) · [`AI-COST-02-B-CLOSEOUT.md`](./AI-COST-02-B-CLOSEOUT.md) · [`AI-COST-02-B-DESIGN-FREEZE.md`](./AI-COST-02-B-DESIGN-FREEZE.md) · [`AI-COST-02-B-PLAN.md`](./AI-COST-02-B-PLAN.md) · [`WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md`](./WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md)  
> **Zależności CLOSED (REUSE):** AI-COST-01 FROZEN · COST-02-A · AI-COST-02-B Phase 1 (I1+I2) · Work Catalog marketQuotes · SMART-PRICING P0–P2 (nie rewrite)

```text
════════════════════════════════════════════════════════
AI-COST-02 I3 AUDIT — Competitiveness RO

COST-02-A = CLOSED (controlled_market / marketQuotes)
AI-COST-02-B Phase 1 = CLOSED (Explain I1 + Queue I2 · flag OFF)
I3 = sygnały konkurencyjności / jakości RO (vs Quotes / CK / catalog)
OUT: win-probability · Bid rewrite · pricing rewrite · Save Quotes
     · LLM · Cloud · Payroll · SMART ownership

Live tip: 2.65.95 / 99c6337 (SSOT · SMART P2 CLOSED)
Owner: AUDIT ACCEPTED · GO DESIGN FREEZE (osobny DF)
NEXT: Owner ACCEPTED DF → GO IMPLEMENT (nie teraz)
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT I3

| Pytanie | Cel |
|---------|-----|
| Co oznacza I3 w 02-B? | PLAN: *Quality / competitiveness signals RO* — pozycja vs marketQuotes / CK / catalog · **bez** win-probability |
| Dlaczego teraz? | Phase 1 CLOSED · residual I3 w CLOSEOUT / NEXT-EPIC · Owner GO AUDIT |
| Co REUSE? | Explain panel 02-B · controlled_market · marketQuotes · OfferBoq RO |
| Co nie ruszać? | S1–S7 core · Bid calculator · GAP-A/B · SMART Save/Publish |
| Jaki thin slice? | RO sygnały + UI w istniejącym Cost Intelligence · flaga OFF |

**OUT tego AUDIT:** wireframe pixel-perfect · pełny DF · IMPLEMENT · silnik wygranej · hardcode 1,6M.

---

## 1. Production baseline

### 1.1 Live tip

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **UI** | **2.65.95** |
| **Deploy / live tip** | **`99c6337`** (SMART-PRICING-01 P2 · CLOSED · PV) |
| **Feature tip (P2)** | **`99c63373`** |
| **SSOT tip** | [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Protected Core** | **GREEN** |
| **STABILIZATION** | **ACTIVE** · tryb **UTRZYMANIE** |
| **Aktywny IMPLEMENT** | **Brak** |

### 1.2 Domknięte zależności

| Slice | Status | Relacja do I3 |
|-------|--------|----------------|
| **AI-COST-01** | **FROZEN** · FIELD READY | S1–S7 **REUSE RO** · zakaz przebudowy |
| **COST-02-A** | **CLOSED** · `1e6fb12` / 2.65.62 | `controlled_market` + `marketQuotes` = **główne źródło benchmarku** |
| **AI-COST-02-B Phase 1** | **CLOSED** · `9dc113e7` / 2.65.78 | I1 Explain + I2 Queue **REUSE** · I3 było **OUT** |
| **SMART-PRICING-01 P0–P2** | **CLOSED** | Detect/Evidence/One-shot — **nie** ownership I3; sygnały mogą **wskazywać** brak Quotes (RO), bez Save |
| GLOBAL-UX-02 | FULLY CLOSED | UX unrelated |

### 1.3 Kontrakt residual z 02-B

Z [`AI-COST-02-B-CLOSEOUT.md`](./AI-COST-02-B-CLOSEOUT.md):

> I3 Competitiveness = OUT (osobny thin slice) · Phase 2 / I3 = osobny DF + GO

Z [`AI-COST-02-B-PLAN.md`](./AI-COST-02-B-PLAN.md) **I3**:

> Quality / competitiveness signals RO — pozycja vs marketQuotes / CK / catalog (gdy dostępne); **bez** win-probability engine

Z [`AI-COST-02-B-DESIGN-FREEZE.md`](./AI-COST-02-B-DESIGN-FREEZE.md) **D1b**:

> Competitiveness RO (I3) · **OUT Phase 1** · osobny thin slice / Phase 2 po PV

**Wniosek:** I3 = **nowy thin slice** pod AI-COST-02 (nie re-open Phase 1 02-B bez briefu).

---

## 2. AS-IS (co już jest w kodzie)

| Obszar | Stan | Uwaga I3 |
|--------|------|----------|
| `OfferBoqCostIntelligencePanel` | Explain 02-B + Queue + SMART wire | Naturalny **surface** UI |
| `presentOfferBoqExplainabilityView` / `cost02b` | Enrichment RO | Rozszerzać **obok**, nie fork VM |
| `controlled_market` / `marketQuotes` | COST-02-A | Benchmark rynkowy per komponent/praca |
| Company Knowledge hints | S5.1 | Sygnał „firma vs rynek” (RO) |
| S7 validation `impactScore` | Queue 02-B | I3 **nie** musi zmieniać formuły impact |
| Flaga `kw-ai-cost-02-b-explain-queue` | default OFF | I3: **osobna** flaga (rekomendacja) lub gated pod 02-B ON |
| SMART Detect / Evidence | P0–P2 CLOSED | Uzupełnia brak Quotes — I3 = **porównanie** wyceny vs rynek, nie One-shot |

**Luka produktowa:** operator widzi Explain/Queue i origin `controlled_market`, ale **nie** ma zwartego, RO widoku „jak pozycja / oferta leży względem rynku / CK” (Δ%, band, ostrzeżenia) — to jest I3.

---

## 3. Definicja I3 (AUDIT — do zamrożenia w DF)

### 3.1 IN (propozycja)

| IN | Opis |
|----|------|
| **Sygnały konkurencyjności RO** | Per linia / agregat: porównanie `lineDirect` / unit vs benchmark z **marketQuotes** (REUSE COST-02-A) i opc. CK |
| **Status jakości** | Proste etykiety (np. poniżej / w paśmie / powyżej rynku) — **heurystyka deterministyczna**, nie ML |
| **UI** | Blok / wiersze w **istniejącym** Cost Intelligence (REUSE panel 02-B) — bez nowego „Competitiveness App” |
| **Pure helpers + testy** | View-model RO · zero mutacji OfferBoq / Bid |
| **Feature flag** | default **OFF** |
| **Docs** | DF · IMPL · PV · CLOSE po ścieżce release |

### 3.2 OUT (twarde — rekomendacja AUDIT)

| OUT | Powód |
|-----|--------|
| **Win-probability / szansa wygrania** | Starting Point §4.3 · osobny EPIC |
| **Bid calculator rewrite** / Kp / marża w AI-COST | Freeze Bid |
| **Pricing engine rewrite** / nowy `OfferBoqPriceSourceProvider` | COST-02-A ownership; I3 = **odczyt** |
| **Hardcode 1,6M** / global multiplier / target-hacking | Zakaz 02-B |
| **GAP-A / GAP-B / GAP-C** implementacja | Osobne GO |
| **LLM / autopilot oferty** | Zakaz |
| **Save Quotes / SMART Save / MS Publish** | Ownership SMART/MS · P3 |
| **One-shot Bid materializacja** | SMART — nie I3 |
| **Cloud Sync / DATA_KEYS / Payroll** | Gate CORE |
| **Przebudowa S1–S7 core** | AI-COST-01 FROZEN |
| **Parser / ZIP / Discovery rewrite** | OUT 02-B |
| **Re-open 02-B Phase 1** (zmiana I1/I2 AC) | Osobny amend |

---

## 4. Relacja do SMART-PRICING (boundary)

| | SMART-PRICING | AI-COST-02 I3 |
|--|---------------|---------------|
| Cel | Brak / propozycja **ceny rynkowej** do decyzji | **Pozycja wyceny** względem rynku / CK |
| Write Quotes | P3 only (jeszcze OUT) | **Nigdy** w I3 |
| One-shot | Session overlay | **OUT** I3 |
| UI | Evidence panel | Cost Intelligence competitiveness RO |
| REUSE | marketQuotes RO | marketQuotes RO + lineDirect RO |

**Zakaz:** I3 nie staje się drugim SMART (Evidence/One-shot/Save).  
**Dozwolone:** I3 może **linkować fokus** do linii / wskazywać „brak Quotes” RO (Detect) bez ownership Detect.

---

## 5. Blast radius

### 5.1 IN (oczekiwany)

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| `src/lib/tender-offer-boq-explainability.ts` (lub nowy thin `*-competitiveness*.ts`) | Duplikacja VM | Rozszerzać RO · pure |
| `OfferBoqCostIntelligencePanel.tsx` | Clutter | Thin block · flaga OFF |
| Odczyt WC `marketQuotes` / CK | Coupling | REUSE istniejących helperów COST-02-A |
| Flag module | Nowy LS FEATURE | Nie DATA_KEYS · nie Cloud |

### 5.2 OUT (STOP)

| Obszar | Powód |
|--------|--------|
| `tenders-bid-calculator.ts` | Bid rewrite |
| `tender-offer-boq-pricing-engine.ts` (rewrite) | Pricing ownership |
| `cloud-sync.ts` · Payroll\* | CORE |
| SMART commit / MS publish | Ownership |
| Validation `impactScore` formula change | 02-B zakaz (chyba że osobny GO) |

---

## 6. Allowlist (propozycja → DF)

```text
IN:
  src/lib/** — thin competitiveness RO helpers (nazwa DF)
    └─ prefer: nowy plik obok explainability / 02-b queue
  src/lib/ai-cost-02-*-flag.ts (lub rozszerzenie flagi — decyzja DF)
  src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx — thin UI wire
  (opc.) src/app/** mały komponent prezentacji RO
  scripts/test-ai-cost-02-i3-*.mjs
  docs/architecture/AI-COST-02-I3-* (po GO)

OUT:
  tenders-bid-calculator.ts (logika)
  tender-offer-boq-pricing-engine.ts (rewrite)
  cloud-sync · Payroll · SMART commit/publish · MS accept/publish
  GAP-A/B modules · parsers · Discovery
```

---

## 7. Thin Slice (rekomendacja)

```text
THIN I3 (jedna paczka):
  1) Pure: per-line Δ vs marketQuotes average / controlled_market (gdy dostępne)
  2) Pure: opc. vs CK hint (gdy dostępne) — bez schema CK
  3) Agregat RO: ile linii poniżej/powyżej pasma
  4) UI: sekcja „Konkurencyjność (RO)” w Cost Intelligence (flaga OFF)
  5) Testy unit + regresja 02-B smoke
  6) Docs DF→…→CLOSE

NIE W THIN:
  win% · Bid rewrite · Save Quotes · LLM · hardcode target PLN
```

### Semantyka flag (rekomendacja AUDIT)

| Opcja | Opis | Werdykt AUDIT |
|-------|------|----------------|
| **A** | Nowa `kw-ai-cost-02-i3-competitiveness` default OFF | **Rekomendowana** — izolacja od 02-B |
| B | Ta sama flaga 02-B | Mniejsza kontrola; I3 włączone z Explain |
| C | I3 wymaga 02-B ON | Możliwa **dodatkowo** do A |

**Rekomendacja DF:** **A** (+ opc. I3⇒02-B ON jeśli Owner chce spójnego Explain).

---

## 8. Ryzyka

| ID | Ryzyko | Sev | Mitigacja |
|----|--------|-----|-----------|
| **R-I3-01** | Scope creep → win-probability | **P0** | OUT §3.2 · AC bez % wygranej |
| **R-I3-02** | Hardcode 1,6M / „domknij ofertę” | **P0** | Zakaz · sukces ≠ ΔPLN Bid |
| **R-I3-03** | Duplikacja SMART Evidence | **P1** | Boundary §4 |
| **R-I3-04** | Touch pricing engine „żeby Δ było ładne” | **P0** | Allowlist · RO only |
| **R-I3-05** | Brak Quotes → fałszywy alarm | **P1** | Stan „brak benchmarku” · nie „drogo” |
| **R-I3-06** | Mobile clutter | **P2** | Accordion · Top-N · flaga OFF |
| **R-I3-07** | Payroll/Cloud accidental | **P0** | Gate ALL-NIE |

---

## 9. Payroll Safety Gate (przewidywany)

```text
PAYROLL SAFETY GATE — AI-COST-02 I3
G1 Payroll:      NIE
G2 LS CORE schema/budget: NIE  (FEATURE flag OK)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell root:   NIE
G9 Routing:      NIE
Wynik: ALL-NIE (jeśli diff ⊆ allowlist)
```

---

## 10. Definition of Done (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| **AC-I3-1** | Diff ⊆ allowlist |
| **AC-I3-2** | Sygnały **RO only** · 0 mutacji OfferBoq / Bid / Quotes |
| **AC-I3-3** | Źródła benchmarku = REUSE marketQuotes / controlled_market / CK (gdy są) |
| **AC-I3-4** | **0** win-probability · **0** hardcode target PLN |
| **AC-I3-5** | Flaga default OFF · OFF = parity tip (brak UI I3) |
| **AC-I3-6** | Regresja 02-B Explain+Queue (gdy flaga 02-B) PASS |
| **AC-I3-7** | Build + smoke I3 PASS |
| **AC-I3-8** | Gate ALL-NIE |
| **AC-I3-9** | Boundary SMART: brak One-shot/Save w I3 |

---

## 11. Rollback

| Warstwa | Akcja |
|---------|--------|
| **Flag** | OFF → parity tip |
| **Git** | revert thin commit — brak migracji danych |
| **OfferBoq / Bid / Quotes** | nietknięte (RO) |

**Rollback cost:** niski.

---

## 12. Owner Verification (szkic → DF)

| # | Check |
|---|-------|
| **OV-1** | Flaga OFF → brak UI I3 · tip parity |
| **OV-2** | Flaga ON → widoczne sygnały RO vs rynek (gdy Quotes) |
| **OV-3** | Brak Quotes → stan „brak benchmarku”, nie fałszywe „drogo” |
| **OV-4** | 0 zapis OfferBoq / Bid / Quotes po otwarciu I3 |
| **OV-5** | 02-B Explain+Queue nadal działa |
| **OV-6** | Brak win% / target 1,6M w UI |
| **OV-7** | Diff ⊆ allowlist · Gate ALL-NIE |
| **OV-8** | Mobile: czytelne · bez overflow krytycznego |

---

## 13. Otwarte decyzje Ownera (O-I3-*) — **ZAMKNIĘTE**

| ID | Decyzja Owner | Status |
|----|---------------|--------|
| **O-I3-01** | ID = **AI-COST-02-I3** | **ACCEPTED** |
| **O-I3-02** | Flaga **`kw-ai-cost-02-i3-competitiveness`** · default **OFF** | **ACCEPTED** |
| **O-I3-03** | I3 = **rozszerzenie Explain 02-B** (UI ⇒ 02-B ON ∧ I3 ON) | **ACCEPTED** |
| **O-I3-04** | Agregacja **linia + summary** | **ACCEPTED** |
| **O-I3-05** | Progi % w DF (`BAND_HALF_PCT=10` · `OUTLIER_PCT=25`) | **ACCEPTED** → DF |
| **O-I3-06** | CK = **wyłącznie RO hint** | **ACCEPTED** |
| **O-I3-07** | REUSE **marketQuotes** + **controlled_market** | **ACCEPTED** |

---

## 14. Rekomendacja DESIGN FREEZE

```text
Werdykt AUDIT:
  I3 = READY FOR DESIGN FREEZE
  IMPLEMENT = ZABLOKOWANY do Owner GO DF + GO IMPLEMENT
  Thin = competitiveness RO vs marketQuotes/CK · UI w Cost Intelligence
  OUT = win% · Bid/pricing rewrite · Save Quotes · LLM · 1,6M hack
  Flaga = default OFF (osobna, rekomendacja)
```

| Decyzja | Rekomendacja |
|---------|--------------|
| **Czy robić I3?** | **TAK** — residual 02-B · Starting Point §4.2 |
| **Czy teraz IMPLEMENT?** | **NIE** — najpierw **DESIGN FREEZE I3** |
| **Czy łączyć z SMART P3 / GAP-B?** | **NIE** |
| **Czy win-probability?** | **NIE** |
| **Sukces AC** | Jakość sygnałów RO + UX · **nie** Δ Bid PLN |

---

## 15. Owner Acceptance Checklist

```text
[x] Akceptuję IN §3.1 / OUT §3.2
[x] Akceptuję boundary SMART §4
[x] Akceptuję Thin Slice §7 · allowlist §6
[x] Akceptuję DoD §10 · Rollback §11 · OV §12
[x] Potwierdzam: brak IMPLEMENT / commit / push w tym etapie
[x] Następny krok: GO DESIGN FREEZE I3 → AI-COST-02-I3-DESIGN-FREEZE.md
```

---

## 16. Werdykt

**AI-COST-02 I3 AUDIT = ACCEPTED**

- Tip **2.65.95** / **`99c6337`** · Core **GREEN**  
- DF: [`AI-COST-02-I3-DESIGN-FREEZE.md`](./AI-COST-02-I3-DESIGN-FREEZE.md) · **FROZEN**  
- **Czekam na:** Owner **ACCEPTED DF** → **GO IMPLEMENT**  

**Nie** IMPLEMENT · **nie** commit · **nie** push bez osobnego GO.
