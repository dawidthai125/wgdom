# COST-BID-GAP-01 / GAP-A — IMPLEMENTATION REPORT

> **ID:** COST-BID-GAP-01-GAP-A-IMPLEMENTATION  
> **Data:** 2026-07-29  
> **Status:** **IMPLEMENT COMPLETE** · build PASS · test PASS · **commit/push czekają na Owner** (lub wykonane na GO)  
> **UI:** **2.65.77**  
> **DF:** [`COST-BID-GAP-01-DESIGN-FREEZE.md`](COST-BID-GAP-01-DESIGN-FREEZE.md)  
> **AR:** [`COST-BID-GAP-01-ARCHITECTURE-REVIEW.md`](COST-BID-GAP-01-ARCHITECTURE-REVIEW.md) **PASS**  
> **Owner GO IMPLEMENTATION:** **TAK**

---

## 1. Co zaimplementowano

| Element | Opis |
|---------|------|
| Flaga | `COST_BID_GAP_01_CATALOG_CAL` · LS `kw-cost-bid-gap-01-catalog-cal` · **default OFF** |
| Classifier GAP-A | Extra keywords (hydrant / murowe / elektryka / …) gdy flaga ON — **nie** parser |
| Kalibracja stawek | Mnożniki materiału per kategoria + lepszy UNKNOWN fallback (tylko ON) |
| Market REUSE | Overlay materiału z `marketQuotes` Work Catalog gdy match + cena > seed |
| Wire | `wgdom-catalog-cost-engine.ts` — direct upstream Bid |
| SSOT Bid | `computeTenderBidProposal` **bez zmian** pliku kalkulatora |
| Testy | `scripts/test-cost-bid-gap-01-catalog-cal.mjs` (9 PASS) |

### Pliki (allowlist)

| Plik | Akcja |
|------|--------|
| `src/lib/tenders-v4-config.ts` | flaga + test override |
| `src/lib/cost-bid-gap-01-catalog-cal.ts` | **NOWY** |
| `src/lib/wgdom-catalog-cost-engine.ts` | wire GAP-A |
| `src/lib/tender-catalog-line-pricing.ts` | mapowanie source `market` |
| `scripts/test-cost-bid-gap-01-catalog-cal.mjs` | **NOWY** |
| `src/app/changelog-data.ts` | 2.65.77 |
| `CHANGELOG.md` | skrót |
| docs COST-BID-GAP-01-* | proces |

### Deny — nietknięte

`tenders-bid-calculator.ts` · `cost-multi-02*` · Discovery · parsers · `company-labor-cost.ts` · payroll · `cloud-sync.ts`

---

## 2. Acceptance (projekcja)

| AC | Wynik |
|----|--------|
| AC1 AGGREGATE/ONE | Nietknięte (OOS) — oczekiwane PASS na PV |
| AC2 Bid SSOT | PASS (T8) |
| AC3 direct↑ lub UNKNOWN↓ | PASS (T4) |
| AC4 UNKNOWN &lt; baseline | PASS na fixture testowym (T4) |
| AC5 market + fallback | PASS (T5/T6) |
| AC6 no hardcode / AI-first | PASS (T9) |
| AC7 costModel | PASS (deny) |
| AC8 flaga OFF = baseline | PASS (T1/T2/T7) |
| AC9 testy + build | PASS |
| AC10 Core poza diff | PASS |

---

## 3. Rollback

```text
localStorage['kw-cost-bid-gap-01-catalog-cal'] = '0'
# lub brak klucza + default false
→ zachowanie catalog Bid jak tip 2.65.76
```

---

## 4. Owner Verification (checklist)

1. Tip po deploy: `version.json` → **2.65.77**  
2. Flaga OFF (domyślnie): fixture `08dee335` Bid catalog ≈ **1 061 000** (parity)  
3. Włączyć LS=`1`: UNKNOWN↓ / direct↑ na wycenie catalog (probe lub UI catalog path)  
4. Aggregate mode / ONE Pensjonat **bez zmian**  
5. Brak hardcode 1,6M  

---

## 5. Boundary

| #CORE-013 | PASS — jeden concern GAP-A |
| #CORE-014 | FEATURE PASS |
| AI-COST Freeze | PASS — Bid calculator nietknięty |

---

## 6. Werdykt IMPLEMENT

```text
IMPLEMENTATION COMPLETE (kod + testy + build)
RELEASE: czeka na commit/push (Owner) + PV tip
```
