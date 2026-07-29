# CENY-MATERIAŁÓW-04 P1-A — OPS PATCH #2 COMPLETE (D-P1-F2)

> **ID:** CENY-MATERIAŁÓW-04-P1-A-OPS-PATCH-2-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS PATCH · **BEZ COMMIT** · **BEZ PUSH**  
> **Powód:** Owner Verification RE-RUN **FAILED** (residual: ogrodzenia → obrzeża)  
> **Zakres:** wyłącznie dane Work Catalog (`namePl` · `keywords` · `descriptionPl`)  
> **OUT:** AI-COST · scoring · providerzy · heurystyki · Bid · Cloud Sync CORE  
> **Evidence:** `.tmp/ceny-materialow-04-p1a-ops-patch2.mjs` · `…-ops-patch2-report.json` · `…-ops-patch2-validation.json`  
> **OV RE-RUN FAIL:** [`CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-RERUN-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-RERUN-COMPLETE.md)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-A OPS PATCH #2 COMPLETE
Decyzja: READY FOR OWNER VERIFICATION
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR OWNER VERIFICATION** |
| **Nie** | PATCH REQUIRES IMPROVEMENTS |
| Git commit / push | **NIE** |

Gate: Quotes 10/10 · known false **0** · new false **0** · risky generics **0** · `08dec13d` ogrodzenia ≠ P1-A · `08decd0e` clean · CM/HE/C1/C2/unmatched = baseline patch#1.

---

## 2. Blokada (przed)

| Tender | Linia | Błędny match |
|--------|-------|----------------|
| `08dec13d` | Ogrodzenia systemowe… **ustawienie** i dzierżawa | `p1a-obrzeza-betonowe-mb` |

**Przyczyna:** token `ustawienie` w `namePl` / `descriptionPl` (scored via `hay.includes`).

---

## 3. Poprawki

### 3.1 `p1a-obrzeza-betonowe-mb` (blokada)

| | |
|--|--|
| **Przyczyna** | Generyczny token `ustawienie` → linie ogrodzeń z „ustawienie”. |
| **namePl** | `Obrzeża chodnikowe 20x6 / 30x8 — ustawienie` → **`Obrzeża chodnikowe 20x6 / 30x8`** |
| **descriptionPl** | `Ustawienie obrzeży…` → **`Obrzeża chodnikowe 20x6 lub 30x8 na podsypce`** |
| **keywords** | Pełne frazy obrzeży (wymiary); bez gołego „ustawienie”. |
| **Mapping** | `08dec13d` ogrodzenia: `catalogWorkId = null` (nie P1-A). |

### 3.2 `p1a-kostka-brukowa-m2` (scan preemptywny)

| | |
|--|--|
| **Przyczyna** | Gołe `ułożenie` w name/desc — ta sama klasa ryzyka co `ustawienie`. |
| **namePl** | `… — ułożenie mechaniczne` → **`… — mechanicznie na podsypce`** |
| **descriptionPl** | bez „Ułożenie…” |
| **keywords** | bez zmian (frazy, w tym „ulozenie kostki”). |
| **Mapping** | KPI bez regresji; true matche kostki utrzymane (keywords). |

### 3.3 Scan generycznych tokenów (po patchu)

Lista ryzykowna w name/desc: `ustawienie` · `montaz` · `wykonanie` · `rozebranie` · `dzierzawa` · `ulozenie`.

| Wynik | **0** trafień na 10× `p1a-*` |
|-------|------------------------------|

Keywords mogą zawierać te słowa **tylko w pełnych frazach** (OK — scoring keywords = substring frazy).

---

## 4. Walidacja (18 przetargów)

| Metryka | Patch #1 | Patch #2 |
|---------|----------|----------|
| CM avg ON | 67.6% | **67.6%** |
| HE avg ON | 32.4% | **32.4%** |
| C1 | 34 | **34** |
| C2 | 35 | **35** |
| Unmatched DROGI | 11 (−73.2%) | **11 (−73.2%)** |
| Known false | 1 (OV RE-RUN) | **0** |
| New false | 0 | **0** |
| Quotes P1-A | 10/10 | **10/10** |

**Wpływ na CM / HE / Coverage:** brak (identyczny baseline).

---

## 5. Focus tenders

### `08dec13d`

| Linia ogrodzeń | workId po patchu |
|----------------|------------------|
| … ustawienie i dzierżawa | **`null`** |
| … rozebranie | **`null`** |
| False P1-A | **0** |

### `08decd0e`

| | Wartość |
|--|---------|
| False | **0** |
| P1-A matches | **22** |
| CM / HE | **70.2% / 29.8%** |
| Δ vs P0 | **−34.8%** (HE→CM, bez false) |

---

## 6. OUT

| Obszar | Status |
|--------|--------|
| AI-COST / scoring / Bid / cloud-sync / providerzy / heurystyki | **bez zmian kodu** |
| Zmiana | cloud WC: 2 roboty × (wrocław + dolnyśląsk) |

---

## 7. Następny krok

| | |
|--|--|
| **Owner** | Owner Verification RE-RUN #2 |
| Po PASS | READY FOR COMMIT (osobny GO) |
| **P1-B** | po PASS OV + decyzja Owner |

**BEZ COMMIT. BEZ PUSH.**
