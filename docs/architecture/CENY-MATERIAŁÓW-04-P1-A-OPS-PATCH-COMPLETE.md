# CENY-MATERIAŁÓW-04 P1-A — OPS PATCH COMPLETE (D-P1-F)

> **ID:** CENY-MATERIAŁÓW-04-P1-A-OPS-PATCH-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS PATCH · **BEZ COMMIT** · **BEZ PUSH**  
> **Powód:** Owner Verification **FAILED** (false matche D-P1-F)  
> **Zakres:** wyłącznie dane Work Catalog (`namePl` · `keywords` · `descriptionPl`) dla 10 robót `p1a-*`  
> **OUT (bez zmian):** AI-COST · providerzy · heurystyki · scoring engine · Bid Calculator · Cloud Sync CORE  
> **Evidence:** `.tmp/ceny-materialow-04-p1a-ops-patch.mjs` · `…-ops-patch-report.json` · `…-ops-patch-validation.json`  
> **OV FAIL:** [`CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-COMPLETE.md)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-A OPS PATCH COMPLETE
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

Gate: Quotes 100% · **0** known false matches na 18 przetargach · **0** false na `08decd0e` · C1 > 0 · unmatched DROGI ↓ vs P0.

---

## 2. Root cause (bez zmiany scoringu)

`scoreWorkAgainstLine` (`tender-offer-boq-mapping.ts`) dodaje punkty za:

- tokeny `namePl` (len ≥ 4) przez `hay.includes(token)`,
- tokeny `descriptionPl` (len ≥ 5) — ten sam mechanizm,
- pełne frazy `keywords` jako substring.

**OUT zabrania zmiany scoringu** → korekta wyłącznie w WC. Samo zawężenie `namePl`/`keywords` **nie wystarczyło**, gdy `descriptionPl` nadal zawierało generyczne tokeny (`rozebranie`, `betonowej`, `wykonanie`, `montaż`). Dlatego patch obejmuje też **`descriptionPl`** (nadal dane Work Catalog, nie silnik).

---

## 3. Poprawki per robota

### 3.1 `p1a-rozebranie-chodnikow-m2`

| | |
|--|--|
| **Przyczyna** | Token `rozebranie` w name/desc → score na każdej linii „Rozebranie …” (m.in. **ścianka z cegieł**). |
| **Zmiana** | `namePl`: „Zdjęcie płyt chodnikowych 50x50x7”; `descriptionPl` bez „Rozebranie…”; keywords = pełne frazy („rozebranie chodników…”). |
| **Mapping** | Ścianka/cegła nie dostaje tokenu `rozebranie` z P1-A; true match chodników dalej przez keywords. |

### 3.2 `p1a-rozebranie-kostki-m2`

| | |
|--|--|
| **Przyczyna** | `descriptionPl` z `rozebranie` / `betonowej` → obce rozebrania / elementy betonowe. |
| **Zmiana** | name/desc: „Zdjęcie kostki brukowej…”; keywords pełne frazy kostki. |
| **Mapping** | Brak generycznego `rozebranie` w tokenach name/desc. |

### 3.3 `p1a-rozebranie-podbudowy-m2`

| | |
|--|--|
| **Przyczyna** | `rozebranie` + `betonowej` → m.in. **opaska betonowa**. |
| **Zmiana** | name/desc: „Zdjęcie warstwy podbudowy nośnej mineralno-bitumicznej”; keywords z pełnymi frazami podbudowy. |
| **Mapping** | Opaska nie wygrywa na gołym `betonowej` z desc P1-A. |

### 3.4 `p1a-rozebranie-obrzezy-mb`

| | |
|--|--|
| **Przyczyna** | `rozebranie` w name/desc → **ogrodzenia / barierki / rynny** (rozebranie + unit mb). |
| **Zmiana** | name/desc: „Zdjęcie obrzeży chodnikowych…”; keywords tylko „rozebranie obrzeży…”. |
| **Mapping** | Obce rozebrania liniowe nie dostają tokenu `rozebranie` z tej roboty. |

### 3.5 `p1a-obrzeza-betonowe-mb`

| | |
|--|--|
| **Przyczyna** | Token `montaz` ⊆ **montaż rynien**; `betonowe` ⊆ **ścieki** prefabrykatów betonowych. |
| **Zmiana** | `namePl`: „Obrzeża chodnikowe 20x6 / 30x8 — ustawienie” (bez „Montaż”); desc bez gołego „betonowych”; keywords = „obrzeża betonowe o wymiarach…”. |
| **Mapping** | Ścieki / rynny nie wygrywają na `montaz`/`betonowe` z name/desc. |

### 3.6 `p1a-kostka-brukowa-m2`

| | |
|--|--|
| **Przyczyna** | `betonowej` w description → **ławy pod krawężniki z mieszanki betonowej**. |
| **Zmiana** | desc: „Ułożenie kostki brukowej 8 cm na podsypce” (bez `betonowej`); keywords z frazami kostki. |
| **Mapping** | Ławy nie łapią tokenu `betonowej` z P1-A kostki. |

### 3.7 `p1a-koryto-jezdni-chodnik-m2`

| | |
|--|--|
| **Przyczyna** | `wykonanie` w description → **Wykonanie warstwy zbrojonej** (elewacja). |
| **Zmiana** | desc bez „wykonanie”; name: koryto gruntowe…; keywords z pełnymi frazami koryta. |
| **Mapping** | Elewacyjna warstwa zbrojona nie score’uje na `wykonanie` z koryta. |

### 3.8 `p1a-nawierzchnia-betonowa-m2` · `p1a-nawierzchnia-plyty-m2` · `p1a-podbudowa-kruszywa-m2`

| | |
|--|--|
| **Przyczyna** | Luźne / zbędne tokeny desc (`betonowych`, „pod nawierzchnię”). |
| **Zmiana** | Zawężone desc; keywords pozostają frazami produktowymi. |
| **Mapping** | Mniejsza powierzchnia false-positive bez utraty true matchów DROGI. |

---

## 4. Walidacja po patchu (te same 18)

| Metryka | P0 | Po P1-A OV | Po OPS PATCH |
|---------|-----|------------|--------------|
| CM avg ON | 65.7% | 67.6% | **67.6%** |
| HE avg ON | 34.3% | 32.4% | **32.4%** |
| C1 (linie → P1-A) | 0 | 35 | **34** |
| C2 | — | 35 | **35** |
| Unmatched DROGI | 41 | 11 | **11 (−73.2%)** |
| Known false hits | — | **10** | **0** |
| Quotes P1-A | — | 10/10 | **10/10** |

| Gate | Wynik |
|------|--------|
| Usunięcie wszystkich known false matchy | **PASS** (`falseHits: []`) |
| Brak nowych known false matchy | **PASS** (ta sama lista FALSE_CASES) |
| Quotes / OUT silnika | **PASS** (brak zmian kodu OUT) |

C1 35→34: jeden true match mniej po bezpieczniejszych tokenach — akceptowalne (C1>0, unmatched bez regresji).

---

## 5. Sprawa `08decd0e`

| | P0 | Po patchu |
|--|----|-----------|
| directPln | 430 110.99 | **280 472.79** |
| Δ | — | **−34.8%** |
| CM / HE | 37.5% / 62.5% | **70.2% / 29.8%** |
| P1-A matches | — | **22** |
| False matches | 1 (ścieki→obrzeża) | **0** |
| Origin materiałów P1-A | — | wszystkie `controlled_market` |

Spadek vs P0 nadal wynika z HE→CM + `companyPricePln` na poprawnych liniach DROGI — **bez** false matchy z listy OV.

---

## 6. Focus checklist (Owner Verification)

| Przypadek | Status po patchu |
|-----------|------------------|
| Ścieki prefabrykatów | nie mapuje na `p1a-obrzeza-*` |
| Obrzeża betonowe (true) | keywords wymiarowe utrzymane |
| Rozebranie obrzeży (true) | keywords „rozebranie obrzeży…” |
| Rozebranie chodników (true) | keywords chodnikowe |
| Ścianki z cegieł | nie mapuje na `p1a-rozebranie-chodnikow-*` |
| Ogrodzenia / barierki / rynny | nie mapują na `p1a-rozebranie-obrzezy-*` / obrzeża |

---

## 7. OUT confirmation

| Obszar | Status |
|--------|--------|
| AI-COST / providerzy / heurystyki | **bez zmian kodu** |
| Scoring / Bid / Cloud Sync CORE | **bez zmian kodu** |
| Zmiana | wyłącznie cloud WC: `namePl` · `keywords` · `descriptionPl` dla 10×`p1a-*` (wrocław + dolnyśląsk) |

---

## 8. Następny krok

| | |
|--|--|
| **Owner** | ponowna Owner Verification (D-P1-F) |
| Po PASS | dopiero decyzja commit (osobny GO) |
| **P1-B** | dopiero po PASS OV + decyzja Owner |

**BEZ COMMIT. BEZ PUSH.**
