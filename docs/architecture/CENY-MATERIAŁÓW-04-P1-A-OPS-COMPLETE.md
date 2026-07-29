# CENY-MATERIAŁÓW-04 P1-A — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-A-OPS-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS IMPLEMENTATION · Owner GO **APPROVED**  
> **Grupa:** **P1-A — Chodniki i nawierzchnie**  
> **Klasa:** FEATURE-DATA / OPS · **bez** zmian AI-COST / providerów / heurystyk / Bid / Cloud Sync CORE  
> **Pipeline Quotes:** CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC  
> **Evidence:** `.tmp/ceny-materialow-04-p1a-*.json` · `.tmp/ceny-materialow-04-p1a-quotes.csv`  
> **Git commit / push:** **NIE** (czeka na Owner Verification)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-A OPS COMPLETE
Decyzja: READY FOR P1-B
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR P1-B** |
| **Nie** | P1-A REQUIRES IMPROVEMENTS (jako werdykt końcowy) |

**Uwaga KPI K-P1-3:** 1 sprawa (`08decd0e`) ma Δ direct **−35%** vs P0 — **uzasadnione** (patrz §6): wcześniej HE **62.5%** na tej sprawie; po mapowaniu na `controlled_market` z `companyPricePln` spada wycena HE→katalog. Match semantyczny kostka/podbudowa/koryto/rozebranie — OK. False matches (ścieki / ława m³) usunięte keyword patch.

---

## 2. Co dodano

| Metryka | Wartość |
|---------|---------|
| Nowe roboty P1-A | **10** (cap 3–12) |
| Product Quotes na nowych | **10/10 (100%)** |
| Komórki Quotes (wgdom×wroclaw) | **10** (+ heal 34 legacy) |
| Aktywne roboty WC po OPS | **44** (34 legacy + 10 P1-A) |
| Product Quotes łącznie | **44/44** |

### Lista robót P1-A

| ID | Nazwa | Unit | PLN |
|----|-------|------|-----|
| `p1a-rozebranie-chodnikow-m2` | Rozebranie chodników z płyt betonowych | m2 | 28.5 |
| `p1a-rozebranie-kostki-m2` | Rozebranie nawierzchni z kostki betonowej | m2 | 32 |
| `p1a-rozebranie-podbudowy-m2` | Rozebranie podbudowy | m2 | 38 |
| `p1a-rozebranie-obrzezy-mb` | Rozebranie obrzeży betonowych | mb | 22 |
| `p1a-podbudowa-kruszywa-m2` | Podbudowa z kruszywa | m2 | 48 |
| `p1a-nawierzchnia-betonowa-m2` | Nawierzchnia betonowa | m2 | 95 |
| `p1a-obrzeza-betonowe-mb` | Obrzeża betonowe na podsypce | mb | 55 |
| `p1a-koryto-jezdni-chodnik-m2` | Wykonanie koryta | m2 | 24 |
| `p1a-nawierzchnia-plyty-m2` | Nawierzchnia z płyt drogowych | m2 | 85 |
| `p1a-kostka-brukowa-m2` | Kostka brukowa — ułożenie | m2 | 110 |

**OUT grupy (D-P1-F):** izolacje bitumiczne pionowe · opłaty pasa ruchu — nie seedowane.

---

## 3. Incydent Quotes P0 (naprawiony w OPS)

Przy starcie P1-A cloud WC miał **0** product Quotes na legacy-34 (`updatedAt` cofnięty do 2026-07-21 — nadpisanie starszym stanem poza tym slice).

**Heal (REUSE P3.3):** CSV dla wszystkich 44 robót → `commitMarketQuotesImport` → **44/44** product Quotes → cloud verify PASS.

Backup: `.tmp/ceny-materialow-04-p1a-catalog-backup.json` · healed: `.tmp/ceny-materialow-04-p1a-catalog-healed.json`.

---

## 4. Coverage KPI (P1-A)

| KPI | Baseline | Po P1-A | Wynik |
|-----|----------|---------|--------|
| **K-P1-C1** linie BOQ → nowe roboty | 0 | **35** | **PASS** |
| **K-P1-C2** DROGI nadal HE/unmatched | — | **35** | raport |
| Unmatched linie DROGI | **41** | **11** | **−73.2%** |
| Soft HE avg 18 | **34.3%** | **32.4%** | ↓ |
| Soft CM avg 18 | **65.7%** | **67.6%** | ↑ |

---

## 5. Walidacja 18 przetargów (vs P0)

| Share materiałów avg 18 (CM-01 ON) | P0 | P1-A | Δ |
|------------------------------------|----|------|---|
| **controlled_market** | 65.7% | **67.6%** | **+1.9 pp** |
| **work_catalog** | 0% | 0% | 0 |
| **heuristic_estimate** | 34.3% | **32.4%** | **−1.9 pp** |

| Hard slice | Wynik |
|------------|--------|
| ≥3 nowe roboty | **PASS** (10) |
| 100% product Quotes | **PASS** |
| Unmatched bucket ↓ | **PASS** (−73%) |
| Regresje bez uzasadnienia | **0** (1 uzasadniona — §6) |

---

## 6. Regresja uzasadniona — `08decd0e`

| | P0 | P1-A |
|--|----|------|
| directPln | ~430.1 k | ~279.1 k |
| Δ | — | **−151 k (−35%)** |
| HE share | **62.5%** | niski (linie → CM) |

**Uzasadnienie (K-P1-3):** spadek = zamiana wysokiego `heuristic_estimate` na `controlled_market` przy `companyPricePln` Ownera na nowo zmapowanych liniach chodnikowych — nie regresja matchingu ani utrata Quotes. Keyword patch usunął fałszywe trafienia (ścieki, ława m³→mb).

**Opcja Owner:** kalibracja `companyPricePln` P1-A w górę (OPS) bez zmian AI-COST — poza CLOSE P1-A.

---

## 7. OUT honorowane

Brak zmian: AI-COST · providerzy · heurystyki · Bid · `cloud-sync.ts` · costModel · scrapery · nowe tabele · auto-seed.

---

## 8. Rollback P1-A

| L | Akcja |
|---|--------|
| L1 | `active=false` na `p1a-*` |
| L2 | Rollback Quotes P3.3 + dezaktywacja works |
| L3 | Restore `.tmp/ceny-materialow-04-p1a-catalog-backup.json` **lub** healed P0+Quotes bez P1-A |

---

## 9. Następny krok

```text
Owner Verification P1-A
  → (opc.) kalibracja cen 08decd0e
  → Owner GO OPS P1-B (ogrodzenia)
```

**Git commit/push:** dopiero po pozytywnym Owner Verification (zgodnie z briefem).

---

**P1-A STATUS:** **COMPLETE** · **READY FOR P1-B**
