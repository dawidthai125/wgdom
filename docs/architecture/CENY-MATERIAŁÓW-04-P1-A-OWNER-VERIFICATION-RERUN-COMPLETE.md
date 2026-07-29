# CENY-MATERIAŁÓW-04 P1-A — OWNER VERIFICATION RE-RUN COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-RERUN-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OWNER VERIFICATION · PO REMEDIACJI D-P1-F · **BEZ COMMIT** · **BEZ PUSH**  
> **Poprzedni OV:** [`CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-COMPLETE.md) · **FAILED**  
> **Patch:** [`CENY-MATERIAŁÓW-04-P1-A-OPS-PATCH-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-OPS-PATCH-COMPLETE.md)  
> **Evidence:** `.tmp/ceny-materialow-04-p1a-owner-verification-rerun.json` · `.tmp/ceny-materialow-04-p1a-owner-verification.json`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-A OWNER VERIFICATION RE-RUN COMPLETE
Decyzja: OWNER VERIFICATION FAILED
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **OWNER VERIFICATION FAILED** |
| **Nie** | READY FOR COMMIT |

**Blokada:** nadal **1** known false match (D-P1-F) poza listą naprawioną w patchu:

| Tender | Linia | Work P1-A |
|--------|-------|-----------|
| `08dec13d` | „Ogrodzenia systemowe z przęseł przenośnych - **ustawienie** i dzierżawa…” | `p1a-obrzeza-betonowe-mb` |

**Przyczyna:** token `ustawienie` w `namePl` / `descriptionPl` obrzeży (`… — ustawienie` / `Ustawienie obrzeży…`) score’uje na linii ogrodzeń z „ustawienie”. Patch usunął `montaż`/`betonowe`/`rozebranie`, ale **nie** generyczne `ustawienie`.

---

## 2. Checklist vs DF / AR / patch goal

| # | Check | Wynik |
|---|-------|--------|
| 1 | Wszystkie **10** robót P1-A w cloud WC | **PASS** |
| 2 | Quotes **10/10** · origin `wgdom` · price = `companyPricePln` | **PASS** |
| 3 | Import CSV → `commitMarketQuotesImport` (P3.3) | **PASS** (OPS evidence · CSV + pipeline; brak scrapera) |
| 4 | Brak zmian AI-COST / providerów / heurystyk / Bid / `cloud-sync.ts` / scoring | **PASS** (`git diff` OUT = pusto vs tip) |
| 5a | Known false matches = 0 | **FAIL** (**1**) |
| 5b | New false matches = 0 | **PASS** (**0**) |
| 6 | `08decd0e` · zero false · HE→CM uzasadnione | **PASS** |
| 7 | KPI C1 / C2 · Hard · Soft | **PASS** |
| 8 | Walidacja tych samych **18** przetargów | **PASS** (próbka OK; fail = 1 false global) |

---

## 3. Katalog (cloud)

| Metryka | Wartość |
|---------|---------|
| P1-A | **10/10** · active · expected IDs |
| Product Quotes P1-A | **10/10** · `wgdom` · quote = companyPrice |
| Unexpected / missing IDs | **0** |

---

## 4. KPI (18 przetargów)

| Metryka | P0 | Po patch / RE-RUN |
|---------|-----|-------------------|
| CM avg ON | 65.7% | **67.6%** |
| HE avg ON | 34.3% | **32.4%** |
| C1 | 0 | **34** |
| C2 | — | **35** |
| Unmatched DROGI | 41 | **11 (−73.2%)** |

| Gate | Wynik |
|------|--------|
| Hard: ≥3 works · Quotes 100% · unmatched ↓ | **PASS** |
| Soft: HE ≤ P0 · CM ≥ P0 | **PASS** |
| Unexplained regressions (Δ direct ≤ −5% poza uzasadnionym focus) | **PASS** (0) |

---

## 5. Sprawa `08decd0e`

| | P0 | RE-RUN |
|--|----|--------|
| directPln | 430 110.99 | **280 472.79** |
| Δ | — | **−34.8%** |
| HE % | **62.5%** | **29.8%** |
| CM % | 37.5% | **70.2%** |
| P1-A matches | — | **22** |
| Known / new false | 1 / — | **0 / 0** |
| Origin P1-A | — | **100% `controlled_market`** |
| Quote = companyPrice | — | **TAK** |

Spadek direct = **uzasadniony** HE→CM przy `companyPricePln` na poprawnych liniach DROGI. Blokujące false z OV#1 (ścieki) — **usunięte**.

---

## 6. False matche — porównanie OV#1 → RE-RUN

| Przypadek OV#1 | Status RE-RUN |
|----------------|---------------|
| Ścieki → obrzeża | **CLEAR** |
| Ogrodzenia / barierki / rynny → rozebranie obrzeży | **CLEAR** (rozebranie) |
| Ścianka z cegieł → rozebranie chodników | **CLEAR** |
| Opaska / ławy / warstwa zbrojona | **CLEAR** |
| **Ogrodzenia — ustawienie/dzierżawa → obrzeża** | **NOWY residual / niezałatany w D-P1-F** |

| | Count |
|--|------:|
| Known false (lista OV#1 + rozszerzona) | **1** |
| New false (semantic_mismatch poza known) | **0** |

---

## 7. OUT confirmation

| Obszar | Diff tip `src` (verify) |
|--------|-------------------------|
| `tender-offer-boq-mapping.ts` | **brak** |
| Pricing engine / AI-COST | **brak** |
| `cloud-sync.ts` | **brak** |
| Bid / heurystyki / providerzy | **brak** w zakresie P1-A |

Mutacje P1-A = wyłącznie dane WC (cloud) + docs / `.tmp` evidence.

---

## 8. Remediation (wymagane przed READY FOR COMMIT)

```text
OPS PATCH #2 (WC only · bez scoringu):
1. p1a-obrzeza-betonowe-mb — usunąć token „ustawienie” z namePl/descriptionPl
   (np. name: „Obrzeża chodnikowe 20x6 / 30x8”; desc bez „Ustawienie …”)
2. Keywords pozostawić jako pełne frazy obrzeży (bez gołego „ustawienie”)
3. Ponowny Owner Verification RE-RUN
4. Dopiero wtedy READY FOR COMMIT
```

---

## 9. Następny krok

```text
OPS PATCH P1-A #2 (ustawienie → ogrodzenia)
  → Owner Verification RE-RUN #2
  → READY FOR COMMIT (oczekiwane)
  → potem P1-B
```

**Zakaz teraz:** git commit · push.

---

**OV RE-RUN STATUS:** **COMPLETE** · **OWNER VERIFICATION FAILED**
