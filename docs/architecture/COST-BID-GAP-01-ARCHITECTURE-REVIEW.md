# COST-BID-GAP-01 / GAP-A — ARCHITECTURE REVIEW

> **ID:** COST-BID-GAP-01-GAP-A-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **DF:** [`COST-BID-GAP-01-DESIGN-FREEZE.md`](COST-BID-GAP-01-DESIGN-FREEZE.md) — **FINAL · GAP-A**  
> **RCA:** [`COST-BID-GAP-01-RCA.md`](COST-BID-GAP-01-RCA.md) — **zatwierdzone**  
> **Tip bazowy:** **2.65.76**

```text
════════════════════════════════════════════════════════
REVIEW: zgodność planowanej implementacji GAP-A
        z DESIGN FREEZE FINAL + AI-COST Freeze + CORE
WERDYKT: PASS (z uwagami nieblokującymi)
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| AUDIT · PLAN · RCA-0…6 | COMPLETE · RCA zatwierdzone |
| DESIGN FREEZE GAP-A | **FINAL** |
| Kod / diff IMPLEMENT | **brak** (review docs + architektura AS-IS) |
| Owner GO IMPLEMENTATION | **oczekuje** na ten raport |

---

## 1. Zgodność zakresu IN (pytanie Ownera §1)

| Concern IN (wymagany) | DF §2–§3 | Allowlist §4.1 | Werdykt |
|-----------------------|----------|----------------|---------|
| Kalibracja **direct katalogowego** | I1–I2 · cel §2.1–2.2 | `wgdom-cost-catalog` · `wgdom-catalog-cost-engine` · `tender-active-catalog` · `tender-catalog-line-pricing` | **PASS** |
| Eliminacja / redukcja **UNKNOWN** | I4 · AC4 | `wgdom-ath-classifier` (+ keywords w katalogu) · **nie** parser | **PASS** |
| **REUSE** `marketQuotes` / controlled market | I3 · AC5 | `tender-offer-boq-controlled-price-source` REUSE + thin `cost-bid-gap-01*` bridge | **PASS** |
| Jeden SSOT **`computeTenderBidProposal`** | I8 · AC2 · cel §2.5 | Bid calculator **READ-ONLY** (formuły Kp/marży); direct↑ upstream | **PASS** |

**Wniosek §1:** Planowana implementacja **pozostaje wyłącznie** w zamrożonym IN. Nie rozszerza się na Outcome/AI-first ani na Bid tail.

---

## 2. Potwierdzenie OUT (pytanie Ownera §2)

| OUT (wymagany) | DF | Werdykt |
|----------------|-----|---------|
| Aggregate / `cost-multi-02` write | O1 · deny-list | **PASS — poza zakresem** |
| COST-MULTI / Force Rescan | O2 | **PASS** |
| Discovery / ONE mutacja | O3 | **PASS** |
| Parsery ATH/PDF/ZIP / Heavy | O4 | **PASS** |
| Company Cost Model / `company-labor-cost` | O5 · AC7 · deny | **PASS** |
| Payroll | O6 · Gate G1 | **PASS** |
| `cloud-sync` / CloudLoader / Edge | O7 · Gate G3 | **PASS** |
| AI-first (`offer_boq_ai` jako fix) | O10 · NIE-AC | **PASS** |
| Drugi kalkulator / lokalna Kp·marża | O8 · AI-COST SSOT | **PASS** |
| Hardcode / AC = 1,6 mln | O9 · NIE-AC · AC6 | **PASS** |

**Wniosek §2:** Wszystkie pozycje OUT są **jawnie zamrożone** i spójne z RCA (H2/H5 odrzucone jako primary).

---

## 3. Weryfikacje formalne (pytanie Ownera §3)

### 3.1 #CORE-013 — jeden cel, zero mixed FEATURE+CORE

| Check | Wynik |
|-------|-------|
| Jeden concern = catalog direct (+ UNKNOWN + market REUSE) | **TAK** |
| Osobny commit kodu vs docs | **Zdefiniowane** |
| Zakaz cloud-sync / payroll / Edge w bundlu | **TAK** (O6–O7) |
| Zakaz „przy okazji” MULTI / costModel / Discovery | **TAK** |

**Werdykt #CORE-013:** **PASS**

### 3.2 #CORE-014 — FEATURE Boundary / Protected Core

| Check | Wynik |
|-------|-------|
| Allowlist bez Protected Core | **TAK** |
| Deny: `cloud-sync.ts`, payroll\*, CloudLoader, Edge | **TAK** |
| Klasa dominująca FEATURE | **TAK** |
| Shared FEATURE (global seed stawek) — uświadomione | **TAK** (§7.4 DF + flaga) |

**Werdykt #CORE-014:** **FEATURE PASS** (projekcja; powtórka na staged diff przed COMMIT)

### 3.3 AI-COST-01 Architecture Freeze / SSOT

| Reguła Freeze / SSOT | Zgodność GAP-A |
|----------------------|----------------|
| Oferta końcowa tylko w `computeTenderBidProposal` | **TAK** — direct↑ upstream, bez drugiej ścieżki Kp/marży |
| Zakaz drugiego kalkulatora oferty | **TAK** |
| S1–S7 bez przebudowy | **TAK** — O10; pricing-engine na deny (AI path) |
| COST-02-A market = REUSE provider, bez scrapingu | **TAK** — I3 |
| Adapter S6 nie liczy marży | **Nienaruszone** (GAP-A nie idzie AI-first) |

**Uwaga architektoniczna (nie FAIL):** `createControlledMarketPriceProvider` dziś żyje w torze OfferBoq. DF poprawnie wymaga **thin bridge** (`cost-bid-gap-01*`) do **catalog engine** — to jest rozszerzenie **obok** Freeze (REUSE API), nie rewrite S4. IMPLEMENT nie może wciągać `applyOfferBoqPricing` jako „naprawy” catalog Bid.

**Werdykt AI-COST Freeze:** **PASS**

### 3.4 Rollback — flaga `COST_BID_GAP_01_CATALOG_CAL`

| Check | Wynik |
|-------|-------|
| Nazwa flagi zamrożona w DF §5 | **TAK** |
| Default `false` → `true` po PV | **TAK** |
| OFF = baseline tip 2.65.76 (Bid ~1 061 000, bez market overlay) | **TAK** · AC8 |
| Rollback ≠ revert MULTI/Discovery/sync | **TAK** |

**Werdykt rollback:** **PASS**

### 3.5 Acceptance Criteria — kompletność

| AC | Treść (skrót) | Mierzalność | Ocena |
|----|---------------|-------------|-------|
| AC1 | AGGREGATE + ONE Pensjonat | PV | **OK** |
| AC2 | Jeden Bid SSOT | test/code | **OK** |
| AC3 | Direct > 614 095 **lub** UNKNOWN ≤15% @ non-worse direct | probe | **OK** (patrz uwaga U1) |
| AC4 | UNKNOWN &lt; 62 | probe | **OK** (patrz U2) |
| AC5 | Market REUSE + fallback bez crash | test A/B | **OK** |
| AC6 | Brak hardcode 1,6M / AI-first | review | **OK** |
| AC7 | costModel niezmieniony | diff deny | **OK** |
| AC8 | Flaga OFF = baseline | test | **OK** |
| AC9 | Testy + build | lokalne | **OK** |
| AC10 | Core poza diff | Boundary | **OK** |
| NIE-AC | 1,6M / offer_boq wymuszenie / sum(all) / costModel-fix | jawne | **OK** |

**Werdykt AC:** **PASS** (kompletne; uwagi U1–U2 poniżej nie blokują)

---

## 4. Uwagi (nieblokujące) — obowiązkowe przy IMPLEMENT

| ID | Uwaga | Rekomendacja dla IMPLEMENT |
|----|-------|----------------------------|
| **U1** | AC3 jest **OR** (direct↑ **lub** UNKNOWN≤15%). Teoretycznie sam spadek UNKNOWN bez uplift direct spełnia AC3, a PRIMARY RC = underpricing. | Priorytet IMPLEMENT: **najpierw** ścieżki dające **direct↑** (stawki + market overlay). Redukcja UNKNOWN jako współbieżna; nie zamykać slice wyłącznie na AC4 bez AC3-direct, jeśli market/stawki dały się podłączyć. |
| **U2** | Tytuł DF mówi „eliminacja UNKNOWN”, AC4 wymaga tylko **&lt; 62**. | Traktować AC4 jako **minimum**; cel operacyjny = zbliżenie do progu AC3 (≤15% = ≤29/196) na fixture. |
| **U3** | DF dopuszcza wyjątek edycji `tenders-bid-calculator.ts` („1-liniowy pass-through”). | **Arch Review zaostrza:** dla GAP-A edycja `tenders-bid-calculator.ts` = **STOP** domyślnie. Cała kalibracja w catalog engine / bridge / flag. |
| **U4** | Globalny bump seed katalogu = Shared FEATURE cross-tender. | IMPLEMENT: zmiany stawek **za flagą**; PV min. 1 fixture dodatkowy (nie tylko `08dee335`) przed Owner smoke. |
| **U5** | Live UI (COST-PIPELINE-01) może pokazywać `offer_boq_ai` (~949 k), podczas gdy GAP-A celuje w **catalog path**. | PV / Owner smoke: weryfikować **catalog Bid** (probe jak RCA) **oraz** nie regresować Outcome; **nie** „naprawiać” luki przez AI-first. |
| **U6** | Work Catalog może być pusty (RCA probe). | AC5 fallback obowiązkowy; uplift market **nie** jest jedyną ścieżką sukcesu — seed/classifier pozostają IN. |

**Żadna z U1–U6 nie obniża werdyktu do FAIL** — DF jest spójny z RCA i Freeze; uwagi zawężają IMPLEMENT.

---

## 5. Macierz zgodności RCA ↔ DF ↔ AR

| RCA | DF GAP-A | AR |
|-----|----------|-----|
| H1 PRIMARY — catalog direct / UNKNOWN / brak market na catalog | IN I1–I4 | **Aligned** |
| H2 costModel niewystarczający | OUT O5 | **Aligned** |
| H5 AI niżej | OUT O10 | **Aligned** |
| Aggregate OK | OUT O1 · AC1 | **Aligned** |
| Thin slice = GAP-A | One Bundle | **Aligned** |

---

## 6. Checklist DF §9 — odhaczenie Arch Review

- [x] RCA PRIMARY = H1; GAP-A = właściwy thin slice  
- [x] IN/OUT spójne z RCA  
- [x] Allowlist / deny kompletne (z zaostrzeniem U3)  
- [x] SSOT Bid = `computeTenderBidProposal`  
- [x] Market = REUSE COST-02-A; brak scrapingu  
- [x] UNKNOWN = classifier/katalog, nie parser  
- [x] costModel poza scope  
- [x] #CORE-013 / #CORE-014 PASS  
- [x] AC1–AC10 + NIE-AC kompletne  
- [x] Rollback flagą `COST_BID_GAP_01_CATALOG_CAL`  
- [x] Brak zależności HEAVY-PERSIST / TP200B  
- [x] AI-COST-01 Freeze nie naruszony  

```text
Architecture Review: ☑ PASS
Uwagi: U1–U6 (nieblokujące) — obowiązują przy IMPLEMENT
```

---

## 7. Werdykt końcowy

```text
╔══════════════════════════════════════════════════════╗
║  ARCHITECTURE REVIEW — COST-BID-GAP-01 / GAP-A      ║
║  WERDYKT: PASS                                       ║
╚══════════════════════════════════════════════════════╝
```

| Pole | Wartość |
|------|---------|
| **PASS / FAIL** | **PASS** |
| Blokery | **BRAK** |
| Uwagi | U1–U6 (nieblokujące) |
| IMPLEMENT | Nadal **zablokowany** do **Owner GO IMPLEMENTATION** |
| Commit / push | **NIE** (ta sesja) |

---

## 8. Rekomendacja dla Owner GO

**Rekomendacja Architektury:** wydać **Owner GO IMPLEMENTATION = TAK** dla thin slice **GAP-A**, pod warunkami:

1. Przestrzegać allowlist DF §4.1 + **twardego zakazu** edycji `tenders-bid-calculator.ts` (U3).  
2. Priorytet: **direct↑** (stawki + opcjonalny market bridge), nie sam classifier.  
3. Flaga `COST_BID_GAP_01_CATALOG_CAL` default **OFF** do PV.  
4. **Nie** obiecywać Bid = 1 600 000 w GAP-A.  
5. PV: fixture `08dee335` (AC1–AC5, AC8) + krótki regres inny przetarg catalog (U4).  
6. Commit / push dopiero na osobne polecenie Ownera po IMPLEMENT + testach.

```text
Owner GO IMPLEMENTATION:  (oczekuje jawnego TAK / NIE Ownera)
Po TAK → wolno rozpocząć IMPLEMENT wg DF + U1–U6.
```

---

## 9. Następny krok procesu

```text
AUDIT ✓ → PLAN ✓ → RCA ✓ → DF FINAL ✓ → ARCH REVIEW ✓ PASS
→ Owner GO IMPLEMENTATION (czekamy)
→ IMPLEMENT (po GO)
→ TEST → commit/push na prośbę → PV → CLOSEOUT
```
