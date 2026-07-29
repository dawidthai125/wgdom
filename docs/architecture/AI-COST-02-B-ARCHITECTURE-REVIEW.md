# AI-COST-02-B — ARCHITECTURE REVIEW

> **ID:** AI-COST-02-B-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **DF:** [`AI-COST-02-B-DESIGN-FREEZE.md`](AI-COST-02-B-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`AI-COST-02-B-PLAN.md`](AI-COST-02-B-PLAN.md) · COMPLETE **PASS**  
> **Freeze parent:** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md)  
> **Tip bazowy:** UI **2.65.77** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF AI-COST-02-B Phase 1
        z SSOT · Freeze AI-COST-01 · zasady projektu
WERDYKT: PASS (z uwagami nieblokującymi → IMPLEMENT constraints)
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| AUDIT | **PASS** (Owner) |
| PLAN | **PASS** · READY FOR DF |
| DESIGN FREEZE | **PASS** · FROZEN · READY FOR AR |
| Kod / diff IMPLEMENT | **brak** (review docs + AS-IS kod REUSE) |
| Owner GO IMPLEMENTATION | **oczekuje** na ten raport |

**Metoda:** czytelność DF vs Freeze/SSOT · grepowanie punktów REUSE w kodzie (`explainability` · `validation` · panel · flagi GAP-A/TRE) · boundary allowlista/bloklista · izolacja flagi · rollback.

---

## 1. Zgodność DESIGN FREEZE z SSOT

| SSOT / kontrakt | DF | Werdykt |
|-----------------|-----|---------|
| Tip tylko w `09` | Baseline link · brak bump w DF | **PASS** |
| Direct = OfferBoqDocument | S1 READ · Top-5 z `lineDirect` | **PASS** |
| Oferta = `computeTenderBidProposal` | Bid **ZERO DIFF** logiki · RO summary w Założeniach | **PASS** |
| Explain = S4.1 VM | PRIMARY WRITE `tender-offer-boq-explainability.ts` · zakaz forka | **PASS** |
| AI-COST-01 Freeze (S1–S7) | S4 pricing **ZERO DIFF** · S6 call-only · rozszerzenie **obok** | **PASS** |
| COST-02-A CLOSED | Bloklista controlled-price-source · REUSE origin metadanych | **PASS** |
| COST-BID-GAP-01 GAP-A CLOSED | OUT + READ status only · Anti AC-X4 | **PASS** |
| COST-MULTI / ZIP STABLE | OUT parsers · Discovery READ only | **PASS** |
| Starting Point 02 | Extension: Explain + S7 queue — zgodne §3 Starting Point | **PASS** |

**Wniosek §1:** DF **nie koliduje** z SSOT tip / Direct / Bid / Freeze.

---

## 2. Zasady projektowe

| Zasada | Ocena | Dowód w DF |
|--------|-------|------------|
| **SSOT FIRST** | **PASS** | §5.1 · §13 · Bid/OfferBoq/09 |
| **REUSE FIRST** | **PASS** | R1–R14 · nowe tylko: flag + queue helper + thin UI |
| **ZERO DUPLICATE LOGIC** | **PASS\*** | Zakaz drugiego Bid / Explain VM / scoringu; \*patrz F1 |
| **MOBILE FIRST** | **PASS** | §12 · AC-Q5 · accordion · 44px |
| **Payroll Safety Gate** | **PASS** | §0 ALL-NIE FEATURE · G2 = tylko LS flagi |
| **#CORE-013** | **PASS** | FEATURE only · brak CORE w allowliście |

### F1 (nieblokujące) — doprecyzowanie „impactScore” w Queue

**AS-IS:** W `tender-offer-boq-validation.ts` pole `impactScore` występuje głównie na **czynnikach jakości dokumentu** (quality factors), nie jako uniwersalny score linii. Grupy rekomendacji sortują po **severity**, a issues mają powiązanie z liniami. Panel już ma `reviewOnly` (default **false** — zgodne z D2).

**IMPLEMENT CONSTRAINT (IC-1):** Pure helper `tender-offer-boq-02b-queue.ts` **MUST**:

1. Budować kolejkę z **istniejących** S7 issues / recommendation samples (lineId / LP) — **READ**.  
2. Sortować **impact-first** jako: severity/priority S7 ↓, tie-break **`lineDirect` ↓** (REUSE OfferBoq).  
3. **MUST NOT** zmieniać formuły `impactScore` w `tender-offer-boq-validation.ts` (zgodnie z bloklistą).  
4. **MUST NOT** wprowadzać drugiego algorytmu „AI quality score”.

To realizuje intencję DF Q1 (najpierw największy wpływ) bez naruszenia ZERO DUPLICATE / Freeze S7.

---

## 3. IN → istniejąca architektura (mapowanie)

| IN (DF) | Istniejący punkt (AS-IS) | Werdykt |
|---------|--------------------------|---------|
| E1 origin | `priceOrigin.kind` · `controlled_market` · CK explain w S4.1 | **PASS** — enrichment, nie nowy origin engine |
| E2 dokumenty | `snapshot.sourceFilename` już w explain context; dossier `costDiscovery` / `costCandidateSources` READ | **PASS** — panel ma `item` |
| E3 Top-5 | `lineDirect` / totals OfferBoq | **PASS** — pure sort w explain VM |
| E4 Założenia | Strategy S3 READ · Bid sticky/summary RO · GAP-A LS READ | **PASS** — copy RO |
| E5 no mutate | Explain RO path (istniejący kontrakt) | **PASS** — AC-E5 |
| Q1–Q3 Queue | S7 issues + `reviewOnly` state w panelu | **PASS** + **IC-1** |
| Q4 opt-in | `useState(false)` reviewOnly już w panelu | **PASS** |
| X1 Flag OFF | Wzorzec TRE / GAP-A LS keys w `tenders-v4-config` | **PASS** — nowy cienki `ai-cost-02-b-flag.ts` |

**Wniosek §3:** Wszystkie elementy IN Phase 1 **opierają się na istniejącej architekturze**; nowe pliki = orchestration/presentation only.

---

## 4. Kompletność OUT / ochrona przed drift

| OUT wymagany (Owner) | DF §4 + bloklista §7 | Werdykt |
|----------------------|----------------------|---------|
| Parsery ZIP | OUT + bloklista zip-unpack / Edge | **PASS** |
| ATH parser | OUT | **PASS** |
| Bid Calculator | ZERO DIFF logiki + AC-B1 | **PASS** |
| GAP-A | OUT + Anti AC-X4 + READ only | **PASS** |
| Nowy silnik AI | OUT + Anti AC-X3 | **PASS** |
| Payroll | Gate G1 NIE + bloklista | **PASS** |
| Cloud Sync | G3 NIE + cloud-sync bloklista | **PASS** |
| Storage CORE | Persist NIE + DATA_KEYS/Edge OUT | **PASS** |
| Architektura AI-COST-01 | S4 ZERO DIFF · Freeze obok | **PASS** |
| I3 Competitiveness | D1b OUT Phase 1 | **PASS** |
| Discovery / MULTI write | bloklista | **PASS** |

**Uzupełnienie ochronne (nieblokujące IC-2):**  
Przy PR review egzekwować: `git diff --name-only` ⊆ allowlista DF §6. Changelog/`09` dopiero w release tip — OK.

**Sticky bar (IC-3):** Preferencja Arch Review = **Phase 1 bez zmian** `OfferBoqStickySummaryBar.tsx`, jeśli AC-Q3 spełnione w panelu. Diff sticky tylko gdy PV wykaże konieczność — nadal w allowliście „opcjonalnie”.

**Wniosek §4:** OUT jest **kompletny**; drift poza allowlistę = FAIL PR / amend DF.

---

## 5. Feature Flag — izolacja przy OFF

| Check | Werdykt |
|-------|---------|
| LS key `kw-ai-cost-02-b-explain-queue` | Zamrożony §9 |
| Default **OFF** | Zamrożony · AC-B3 |
| OFF ⇒ brak UI bloków 02-B | Tip parity — **PASS** (wymagane w IMPLEMENT) |
| OFF ⇒ brak zmiany ścieżki S4/S6/Bid | DF: flag tylko UI Explain+Queue — **PASS** (IC-4 poniżej) |
| Izolacja od GAP-A flag | Zakaz wspólnego toggle — **PASS** |
| Rollback L1 = LS=`0` | Parity z TRE/GAP-A wzorcem — **PASS** |

**IC-4 (obowiązkowe IMPLEMENT):**  
Resolver flagi **gate’uje wyłącznie render** sekcji 02-B (Explain enrichment + Queue panel).  
**Zakaz:** `if (flag) { change pricing / catalog / bid inputs }`.  
Test AC-B3: przy braku klucza LS i przy `0` — DOM bez `data-ai-cost-02-b` (lub równoważnego markera) oraz zero zmian totals Bid vs baseline.

**Wniosek §5:** Przy poprawnym IC-4 flaga jest **całkowicie odizolowana od produkcji wyceny** w stanie OFF.

---

## 6. Wpływ na systemy chronione

| System | Wpływ planowany | Werdykt |
|--------|-----------------|---------|
| **AI-COST-01** (S1–S7 core) | Tylko S4.1 enrichment RO + UI | **BRAK wpływu na kontrakt freeze** |
| **ZIP / ATH Parser** | OUT | **BRAK** |
| **Bid Calculator** | READ summary · ZERO DIFF | **BRAK** |
| **GAP-A** | READ status tekst · ZERO DIFF semantyki | **BRAK** |
| **Payroll** | OUT | **BRAK** |
| **Cloud Sync** | OUT | **BRAK** |
| **Storage CORE** | Tylko LS flagi FEATURE | **BRAK** (nie Payroll/week) |
| **Istniejące API** (S6, providers, Edge) | Call-only / ZERO DIFF | **BRAK** |

---

## 7. Ryzyko wdrożenia vs Rollback

| ID | Ryzyko | P | I | Ocena | Rollback |
|----|--------|---|---|-------|----------|
| R1 | Scope creep do Bid/GAP-A | N | W | Mitigowane OUT+AC | L2 tip revert FEATURE |
| R2 | Duplikacja scoringu kolejki | Ś | Ś | **IC-1** | L1 flag OFF |
| R3 | Flag OFF nie gate’uje wszystkiego | N | W | **IC-4** + AC-B3 | L1 |
| R4 | Mobile clutter | Ś | Ś | §12 + accordion | L1 |
| R5 | Oczekiwanie 1,6M | W | Ś | Anti AC-X1 · copy | n/a produkt |
| R6 | Przypadkowy diff sticky | N | N | **IC-3** | L2 |

**Rollback plan DF §11:** **ADEKWATNY**  
- L1 wystarcza do natychmiastowego wyłączenia UX bez redeploy wyceny.  
- L2 izoluje FEATURE od CLOSED EPICs.  
- L3 zakazuje „przy okazji” — **PASS**.

**Ryzyko residualne wdrożenia:** **NISKIE–ŚREDNIE** (głównie UX), akceptowalne przy IC-1…IC-4.

---

## 8. Boundary #CORE-014 (skrót)

| Check | Wynik |
|-------|-------|
| FEATURE vs CORE rozdzielone | **PASS** |
| Allowlista bez `cloud-sync` / Edge / Payroll / parsers / Bid logic | **PASS** |
| Jeden concern Phase 1 | Explain + Queue — **PASS** (spójny UX quality) |
| Flaga default OFF | **PASS** |

---

## 9. IMPLEMENT CONSTRAINTS (wiążące po GO)

| ID | Constraint |
|----|------------|
| **IC-1** | Queue sort = S7 issues severity/priority + `lineDirect` tie-break; **zero** zmiany formuły validation |
| **IC-2** | PR ⊆ allowlista DF §6 |
| **IC-3** | Sticky bar diff tylko jeśli AC-Q3 nie da się w panelu |
| **IC-4** | Flag gate = **UI only**; zero wpływu na pricing/Bid inputs |
| **IC-5** | Marker DOM np. `data-ai-cost-02-b="1"` wyłącznie gdy flag ON (dla AC-B3/PV) |
| **IC-6** | Testy: flag OFF parity · Top-5 · queue order · no mutate Explain |

---

## 10. Decyzja Architecture Review

| | |
|--|--|
| **Werdykt techniczny** | **PASS** (uwagi nieblokujące F1 + IC-1…IC-6) |
| **Decyzja** | **APPROVED FOR OWNER GO** |
| **Nie** | ARCHITECTURE CHANGES REQUIRED |

DF **nie wymaga** amend przed GO. Constraints wchodzą do IMPLEMENT / Arch Review handoff.

---

## 11. Następny krok

```text
1. Owner GO IMPLEMENTATION (jawne)
2. IMPLEMENT Phase 1 ⊆ allowlista + IC-1…IC-6
3. TEST (AC-*) → COMMIT (GO) → PUSH → PV → CLOSEOUT
4. Phase 2 (I3) — osobny DF / amend
```

**Zakaz teraz:** implementacja · commit · push (do Owner GO).

---

**ARCHITECTURE REVIEW STATUS:** **PASS** · **APPROVED FOR OWNER GO**
