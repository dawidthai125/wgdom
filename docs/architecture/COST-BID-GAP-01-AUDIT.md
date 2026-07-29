# COST-BID-GAP-01 — AUDIT

> **ID:** COST-BID-GAP-01  
> **MODE:** AUDIT ONLY · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Wejście sesji:** Owner PROJECT START · cold start po COST-MULTI  
> **Tip prod (live):** **2.65.76** @ `06dee9a` — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależność:** COST-MULTI **CLOSED · PRODUCTION VERIFIED** · AI-COST-01 **FROZEN** · COST-02-A **CLOSED**

```text
════════════════════════════════════════════════════════
PROBLEM: Aggregate Bid ~1,06M ≪ Owner ~1,6M
         (fixture 08dee335 · MOPS Kamieńskiego)
NIE jest to: Discovery rewrite · MULTI-03 · sum(all)
NIE jest to: brak Branch winners (to już CLOSED)
════════════════════════════════════════════════════════
```

---

## 0. Onboarding (potwierdzenie)

| Check | Wynik |
|-------|-------|
| `AI_ENTRY` / `MASTER_HANDOFF` / Continuity UPDATE-01 | **READ** |
| `CURRENT-TASK.md` | NEXT = **COST-BID-GAP-01** (BACKLOG → start AUDIT) |
| `09_PRODUCTION_BASELINE` + live `version.json` | UI **2.65.76** · commit **`06dee9a`** |
| COST-MULTI | **CLOSED · PRODUCTION VERIFIED** |
| Następny EPIC (rekomendacja) | **COST-BID-GAP-01** |

**Stabilization Window:** ACTIVE — IMPLEMENT tylko po DF + Arch Review + **Owner GO IMPLEMENTATION**.

---

## 1. Problem biznesowy (SSOT liczb)

Fixture: `08dee335-f338-1f30-ebd1-65000155122a` (MOPS Kamieńskiego / Pensjonat).

| Stan | Bid PLN | Źródło |
|------|---------|--------|
| ONE (Pensjonat) | **292 800** | Discovery `dossier.kosztorys` · catalog |
| **AGGREGATE** (4 Branch winners) | **1 061 000** | FINAL PV · `resolveCostBidInput=AGGREGATE` |
| **Owner (ręcznie, komplet)** | **~1 600 000** | cel biznesowy (nie liczba z KV) |
| Δ MULTI (ONE→AGG) | **+768 200** (+262%) | **CLOSED** w COST-MULTI |
| Δ GAP (AGG→Owner) | **~−539 000** (~**−34%** vs Owner) | **OPEN** — ten EPIC |
| Współczynnik AGG / Owner | **~0,66** | potrzebny uplift ≈ **+51%** na Bid AGG |

**Dowody:**

- [`../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md`](../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md) — Bid forBid **1 061 000**, mode AGGREGATE, 4 artifacts KV  
- [`COST-MULTI-CLOSEOUT.md`](COST-MULTI-CLOSEOUT.md) §4 / §7 — luka vs 1,6M **OUT** serii MULTI  
- [`NEXT-EPIC-CANDIDATES.md`](NEXT-EPIC-CANDIDATES.md) C1  

**Świadoma decyzja serii MULTI:** suma **Branch winners** (katalog/qty), **nie** obietnica auto 1,6M.

---

## 2. Co już jest domknięte (nie re-open)

| Warstwa | Status | Zakaz |
|---------|--------|-------|
| Discovery ONE turniej | STABLE | rewrite „żeby było 1,6M” |
| CostPackage / BranchPackage | COST-MULTI-01 CLOSED | |
| Aggregate → Bid/OfferBoq | COST-MULTI-02 CLOSED | drugi `resolveCostBidInput` |
| Force Heavy Rescan | RCA-02 CLOSED | bump `parserVersion` jako force |
| AI-COST-01 S1–S7 + Bid tail | **FROZEN** | drugi kalkulator oferty |
| COST-02-A controlled market | CLOSED | scraping / przebudowa Bid |
| Payroll / `cloud-sync.ts` | OOS | Safety Gate |

**Polityka Branch Winners zostaje.** `sum(all)` = **odrzucone** (MULTI-03).

---

## 3. Architektura ścieżki wyceny (AS-IS)

```text
Branch winners (4 PDF) → Aggregate snapshot (196 catalog qty)
        ↓
resolveCostBidInput → kosztorysForBid (AGGREGATE)
        ↓
[ścieżka A] catalog → computeTenderBidProposal(pricingMode=catalog)
[ścieżka B] OfferBoq / AI Cost S1–S7 → direct → ten sam Bid tail (Kp/marża)
        ↓
costModel: kpPct / profitPct / riskReservePct / minMarginPct / overhead
        ↓
recommendedBidPln
```

**Fixture FINAL PV:** ścieżka **catalog** · `pricingMode=catalog` · Bid **1 061 000**  
(OfferBoq Aggregate lines=196 obecne; Bid PV raportowany z catalog path.)

**SSOT oferty:** wyłącznie `computeTenderBidProposal` (`tenders-bid-calculator.ts`).  
Default `company-labor-cost` (orientacyjnie): `kpPct=14`, `profitPct=8`, `riskReservePct=4`, `minMarginPct=5` (+ overhead tygodniowy).

---

## 4. Hipotezy root cause luki (do weryfikacji w RCA / DF)

Hipotezy **nie są** jeszcze zamrożone — AUDIT je szereguje do pomiaru.

### H1 — Stawki katalogowe ≪ stawki Ownera / rynku (P0 kandydat)

Aggregate ma **ilości** (196 linii), ale ceny jednostkowe z katalogu WGDOM mogą być zaniżone vs ręczna wycena Ownera / marketQuotes.

| Sygnał | Znaczenie |
|--------|-----------|
| Bid PV = **catalog** | bezpośredni wpływ stawek katalogu |
| COST-02-A market | provider istnieje, ale **nie** musi być ścieżką Bid na tym fixture |
| Work Catalog P3.3 | UX/dane rynkowe nadal backlog |

**Test:** dekompozycja `costStack` + `directCost` vs Owner; porównanie sample pozycji catalog vs marketQuotes vs Owner.

### H2 — Stack Kp / zysk / ryzyko / marża min ≠ model Ownera (P0/P1)

Owner ~1,6M może zawierać wyższy narzut niż default `costModel` (14/8/4/5 + overhead).

| Orientacja | |
|------------|--|
| AGG Bid | 1 061 000 |
| Cel | 1 600 000 |
| Uplift | × **~1,51** |

Czysty „suwak marży” bez zmiany direct może domknąć lukę **tylko jeśli** Owner celuje w ten sam direct × wyższy stack. Jeśli direct jest zaniżony (H1/H3), sama marża **nie wystarczy** bez zawyżenia nienaturalnego.

**Test:** odczyt `costStack` z fixture; reverse-engineer required `profitPct`/`minMarginPct` przy stałym direct; wywiad Owner (jak liczył 1,6M).

### H3 — Niekompletność pozycji / fidelity przedmiaru (P1 · TP200B-adjacent)

Branch winners mają rows=80+43+63+10, ale PDF może gubić pozycje (cap `rows`, heurystyki) → zaniżony direct nawet przy AGGREGATE.

**Test:** porównanie sum qty/rows vs PDF Owner; flaga „dziury” w OfferBoq/S7.

### H4 — Overlap / polityka branż (P2 · raczej NIE główna)

`scope_overlap_unchecked` w PV. Owner mógł liczyć inaczej zakres finishes∩construction — ale **nie** tłumaczy sam ~0,5M bez dowodu.

**Test:** lista winner filenames vs lista Ownera „co weszło do 1,6M”.

### H5 — Ścieżka AI Cost (`offer_boq_ai`) vs catalog (P1)

Jeśli Owner ocenia / oczekuje wyceny z AI Cost + market, a PV liczy **catalog**, luka może być „wrong path UX”, nie tylko liczby.

**Test:** Bid `offer_boq_ai` na tym samym Aggregate vs catalog na `08dee335`.

### H6 — Brakujące branże / dokumenty (P2 · niski po MULTI)

MULTI ma 4 branże. Owner mówił o „~6 przedmiarach” w ZIP — AUDIT MULTI-01: 4 PDF przedmiarowe (+ SWZ/DOCX). Hipoteza „brak 2 branż” = **słaba** bez nowego dowodu Ownera.

---

## 5. Werdykt AUDIT (klasyfikacja)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy problem jest realny na prod? | **TAK** — AGG 1 061 000 vs cel ~1,6M |
| Czy COST-MULTI „nie domknął”? | **NIE** — MULTI domknął **zakres branżowy**; luka cenowa = **OUT** by design |
| Czy re-open MULTI / Discovery? | **NIE** — bez nowego RCA Discovery |
| Czy `sum(all)`? | **NIE** — zakaz |
| Główna klasa problemu? | **PRICING / CALIBRATION** (stawki + stack Bid + ewent. fidelity), nie pipeline Discovery |
| Blast radius przy złym IMPLEMENT? | **Wysoki** — `computeTenderBidProposal` / freeze AI-COST / catalog |
| Payroll Gate (orientacja FEATURE)? | G1–G9 oczekiwane **NIE** jeśli scope = wycena Bid/catalog/market only |

**RC roboczy (do potwierdzenia pomiarami):**  
Luka ≈ **zaniżony koszt bezpośredni i/lub niedopasowany stack marżowy** względem modelu Ownera na Aggregate catalog — **nie** brak Branch Aggregate.

---

## 6. In / Out of scope (propozycja EPIC)

### IN (kandydaci thin slice — wybór w DF)

1. **Pomiar gap** — fixture `08dee335`: `costStack`, direct, catalog vs OfferBoq vs market sample.  
2. **Kalibracja wejścia cen** — REUSE COST-02-A / Work Catalog quotes → wpływ na Bid (bez scrapingu).  
3. **Kalibracja stacku Bid** — parametry `costModel` / profil firmy (Kp, zysk, ryzyko, minMargin) **tylko** jeśli Owner GO + DF; **bez** duplikacji formuł poza `computeTenderBidProposal`.  
4. **Explainability luki** — UI „dlaczego ~1,06M a nie ~1,6M” (RO), bez przepisywania silnika.  
5. Opcjonalnie thin: przełączenie / preferencja ścieżki catalog vs `offer_boq_ai` na Aggregate (UX + wire, nie drugi kalkulator).

### OUT (twarde)

- Discovery / turniej ONE / parsers rewrite  
- Force Rescan rewrite / MULTI-01/02 re-open  
- `sum(all)` / MULTI-03  
- Drugi generator oferty / lokalna Kp/marża w OfferBoq  
- Payroll / `cloud-sync.ts` / Edge merge  
- FND-06 / Hub delete / e-składanie  
- Auto „dopasuj do 1,6M” bez modelu (target-hacking)

---

## 7. Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| Zmiana default `costModel` psuje inne przetargi | Feature flag + profil per company; PV multi-fixture |
| „Suwak do 1,6M” bez dowodu stawek | Najpierw H1 measurement; zakaz hardcode target |
| Naruszenie AI-COST Freeze | Tylko adapter / provider / Bid tail SSOT |
| Pomylenie z TP200B (fidelity) | Osobny slice C4 jeśli H3 PASS; nie mieszać w jednym DF |
| Persist race (C5) | OOS tego EPIC chyba że Owner wskaże ops-first |

---

## 8. Acceptance (EPIC — robocze, do zamrożenia w DF)

| ID | Kryterium |
|----|-----------|
| A1 | Fixture `08dee335` nadal `resolveCostBidInput=AGGREGATE` · ONE Pensjonat bez zmian |
| A2 | Udokumentowana dekompozycja luki (direct vs stack vs missing qty) z liczbami |
| A3 | Po IMPLEMENT (wybrany slice): Bid bliżej modelu Ownera **albo** explain „co brakuje” z dowodem — bez target-hack |
| A4 | Jedyny generator oferty = `computeTenderBidProposal` |
| A5 | Flagi rollback; Payroll/Sync nietknięte |
| A6 | Testy jednostkowe + PV na `08dee335` |

---

## 9. Pytania do Ownera (blokują zamrożenie DF)

1. Jak liczona była ręczna **~1,6M** — direct+narzuty, ATH inwestora, czy „na oko” rynkowe?  
2. Czy cel to **recommendedBid ≈ 1,6M**, czy **direct ≈ X** + własna marża?  
3. Preferencja pierwszego thin slice: **(A) stawki/market**, **(B) costModel/marża**, **(C) explain-only**, **(D) fidelity pozycji**?  
4. Czy Bid ma iść domyślnie `offer_boq_ai` (AI Cost) na Aggregate, czy zostać przy catalog?  
5. Czy wolno zmieniać **default** `costModel` globalnie, czy tylko override w profilu firmy / per tender?

---

## 10. PLAN (workflow WGDOM) — bez IMPLEMENT

```text
[DONE]  Onboarding + AUDIT (ten dokument)
[NEXT]  Owner answers §9  (opcjonalnie równolegle: measurement probe READ-ONLY)
[NEXT]  RCA thin (COST-BID-GAP-01-RCA.md) — potwierdź H1–H5 liczbami
[NEXT]  DESIGN FREEZE (1 thin slice) — allowlist plików · flagi · AC · OUT
[NEXT]  Architecture Review
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (na prośbę) → PUSH → PV → CLOSEOUT
```

### Proponowana kolejność thin slices (po DF)

| Slice | Temat | Gdy |
|-------|-------|-----|
| **GAP-M0** | Measurement / RCA liczbowy (docs + read-only probe) | natychmiast po GO pomiaru |
| **GAP-A** | Stawki / market overlay → Bid (REUSE COST-02-A) | H1 potwierdzona |
| **GAP-B** | Kalibracja `costModel` (profil) | H2 potwierdzona · Owner GO na defaults |
| **GAP-C** | Explainability luki RO | zawsze wartościowe; może iść równolegle thin |
| **GAP-D** | Fidelity / TP200B handoff | tylko jeśli H3 |

**Rekomendacja startu DF:** **GAP-M0 → GAP-A** (ceny), z **GAP-C** jako thin UX; **GAP-B** dopiero po odpowiedzi Ownera na model marży.

### Payroll Safety Gate (preview — przed IMPLEMENT)

```text
PAYROLL SAFETY GATE (COST-BID-GAP-01 — założenie FEATURE wyceny)
G1 Payroll:      NIE
G2 LocalStorage: NIE  (chyba że flaga LS jak inne cost flags — wtedy TAK wąsko)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE  (chyba że OfferBoq provider — TAK wąsko, nie Payroll)
G8 Shell:        NIE
G9 Routing:      NIE
Wynik: ALL-NIE (przy allowlist wyceny) | re-check po DF
Owner GO needed: YES (Stabilization + wycena Bid)
```

---

## 11. Artefakty / linki

| Dokument | Rola |
|----------|------|
| Ten plik | **AUDIT** |
| [`NEXT-EPIC-CANDIDATES.md`](NEXT-EPIC-CANDIDATES.md) | C1 uzasadnienie |
| [`COST-MULTI-CLOSEOUT.md`](COST-MULTI-CLOSEOUT.md) | seria CLOSED |
| [`AI-CONTINUITY-UPDATE-01-REPORT.md`](AI-CONTINUITY-UPDATE-01-REPORT.md) | cold-start |
| [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) | Bid SSOT |
| [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md) | market / kolejne slice |
| *(następne)* `COST-BID-GAP-01-RCA.md` · `COST-BID-GAP-01-DESIGN-FREEZE.md` | po GO |

---

## 12. Werdykt sesji

```text
ONBOARDING: PASS
COST-MULTI: CLOSED · PRODUCTION VERIFIED (2.65.76)
NEXT EPIC: COST-BID-GAP-01
AUDIT: COMPLETE (docs)
IMPLEMENT: NIE (zablokowane)
DESIGN FREEZE: NIE (czekaj odpowiedzi Ownera §9 + RCA/M0)
COMMIT/PUSH: NIE
```

**Czekam na Owner GO** do: (1) odpowiedzi §9, (2) GAP-M0 measurement, (3) DESIGN FREEZE wybranego slice.
