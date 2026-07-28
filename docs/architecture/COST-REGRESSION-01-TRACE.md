# COST-REGRESSION-01 — TRACE (prod KV)

> **ID:** COST-REGRESSION-01-TRACE  
> **MODE:** **READ ONLY** · **bez implementacji** · **bez commit** · **bez push**  
> **Owner GO:** TRACE  
> **Data:** 2026-07-28  
> **Źródło:** `kw-tenders-pipeline` (Edge `batch-get`) · compute lokalne = tip kodu (`resolveTenderPricingAutoProposal`, OfferBoq, catalog)  
> **Artefakty robocze:** `.tmp/cost-regression-01-trace-failures.json` · `.tmp/cost-regression-01-trace-out.json`  
> **Wejście:** [`COST-REGRESSION-01-AUDIT.md`](COST-REGRESSION-01-AUDIT.md)

```text
════════════════════════════════════════════════════════
CEL: udowodnić / odrzucić H3 (legacy snapshot / catalogQuantities)
na 3–5+ rzeczywistych przetargach WM.
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Krok | Opis |
|------|------|
| 1 | Odczyt `kw-tenders-pipeline` (292 pozycji) |
| 2 | Filtr WM: `organizationName` zawiera „Wrocławskie Mieszkania” → **13** |
| 3 | Dla każdego: `computeRuntimeBidFromOfferBoq` → `computeCatalogBidProposal…` → `resolveTenderPricingAutoProposal` |
| 4 | Metryki qty: `catalogQuantities` · `hasUsableCatalogQuantities` · `resolveCatalogQuantities` · `rows` |
| 5 | Symulacja „po ensure”: `ensureKosztorysCatalogQuantities(k)` + ponowny `computeTenderBidProposal` |
| 6 | Cutover CATALOG-BID-01: `parsedAt >= 2026-07-28` (= dzień tipu **2.65.68**) |

**Ograniczenia:** brak historycznego KV „przed” — porównanie stary vs aktualny = **AS-IS snapshot** vs **ensure(AS-IS)** (symulacja re-normalizacji, nie drugi dump czasu).

---

## 1. Census WM (cała populacja w pipeline)

| Metryka | Wartość |
|---------|---------|
| WM w pipeline | **13** |
| Z `recommendedBidPln > 0` | **6** |
| Bez ceny („Brak rekomendowanej ceny”) | **7** |

### 1.1 Klasa wśród **7 bez ceny**

| Klasa | n | Warning | Opis |
|-------|---|---------|------|
| **F2** — brak `kosztorys` | **6** | *Brak kosztorysu ATH/XLSX…* | `kosztorysOk=null` · brak `parsedAt` · brak pliku |
| **F1** — pusty snapshot | **1** | *Brak cen… i brak ilości…* | `kosztorysOk=true` · plik PDF · **0** rows · **0** catalogQuantities |

**Wniosek census:** objaw „wiele WM bez ceny” **nie** jest jednorodnym F1 z martwych `catalogQuantities`. Dominuje **brak sparsowanego kosztorysu (F2)**.

---

## 2. Tabela TRACE — 5 przetargów (szczegół)

Dobór: **3 FAIL** (F2 + F1) + **2 OK** (kontrast: OfferBoq mimo słabego catalog).

| ID | Nazwa (skrót) | Utworzenie (`addedAt`) | Klasa |
|----|---------------|------------------------|-------|
| `08dede90-…2abe42` | Wymiana źródeł ciepła… | 2026-07-10 | **FAIL · F2** |
| `08dee401-…5521cf` | Pustostany paczka VIII | 2026-07-17 | **FAIL · F1** |
| `08dee7ec-…da7716` | Pustostany (inny pakiet) | 2026-07-22 | **FAIL · F2** |
| `08dee8b8-…da8677` | Pustostany paczka XI | 2026-07-23 | **OK · OfferBoq** |
| `08deb669-…83597a` | Grafit Namysłowska 8 | 2026-05-29 | **OK · OfferBoq** (catalog martwy) |

---

## 3. Pełny TRACE per przetarg

### 3.1 `08dede90-ee22-95c4-ebd1-6500012abe42` — FAIL F2

| Pole | Wartość |
|------|---------|
| Nazwa | Zaprojektowanie i wykonanie… wymiany nieekologicznych źródeł ciepła… |
| Org | Wrocławskie Mieszkania Sp. z o. o. |
| Data utworzenia | **2026-07-10T18:39:35.262Z** (`addedAt`) |
| OfferBoq istnieje | **NIE** |
| OfferBoq `directPln` / totals | — |
| `catalogQuantities` | 0 / dodatnie 0 |
| ATH totals | brak (`kosztorys` null) |
| `pricingMode` | `null` |
| `recommendedBidPln` | `null` |
| `ok` | `false` |
| warnings | *Brak kosztorysu ATH/XLSX — wczytaj załącznik…* |
| Path | OfferBoq **null** → Catalog → **F2** (nie F1) |
| `athPreviewToSnapshot` po 2.65.68 | **NIE** (`parsedAt=null`) |
| ensure(AS-IS) | n/a (brak snapshotu) |

### 3.2 `08dee401-840b-fa4f-ebd1-6500015521cf` — FAIL F1

| Pole | Wartość |
|------|---------|
| Nazwa | Pustostany Gminy Wrocław – **paczka VIII** |
| Data utworzenia | **2026-07-17T14:20:36.432Z** |
| OfferBoq | **NIE** (`directPln` null) |
| `catalogQuantities` | **0** / dodatnie **0** / usable **false** |
| `rows` | **0** |
| ATH `totalValue` | `null` |
| Plik | `3-go Maja 2A_1 - przedmiar.pdf` |
| `parsedAt` | **2026-07-25T11:56:30.375Z** → **przed** cutover 2.65.68 |
| `pricingMode` | `null` |
| `recommendedBidPln` | `null` |
| `ok` | `false` |
| warnings | *Brak cen w kosztorysie i brak ilości…* (**F1**) |
| Path | OfferBoq null → Catalog → **F1** |
| ensure zmienia snapshot? | **NIE** (`ensureWouldChange=false`) |
| PLN po ensure | nadal `null` (brak rows do odbudowy qty) |

**Uwaga H3:** to **nie** jest „martwe qty blokujące fallback rows” — **nie ma ani qty, ani rows**. To pusty / nieudany parse, nie klasyczny bug CATALOG-BID dead-catalog.

### 3.3 `08dee7ec-a9a3-3a6a-ebd1-650001da7716` — FAIL F2

| Pole | Wartość |
|------|---------|
| Nazwa | Pustostany Gminy Wrocław (inny wpis) |
| Data utworzenia | **2026-07-22T19:49:23.663Z** |
| OfferBoq | **NIE** |
| `kosztorysOk` | `null` |
| `catalogQuantities` / rows / ATH | wszystko puste |
| Path | OfferBoq null → Catalog → **F2** |
| warnings | *Brak kosztorysu ATH/XLSX…* |
| po 2.65.68 snapshot | **NIE** |

### 3.4 `08dee8b8-8e1d-e41d-ebd1-650001da8677` — OK (kontrast)

| Pole | Wartość |
|------|---------|
| Nazwa | Pustostany – **paczka XI** |
| Data utworzenia | **2026-07-23T20:54:07.900Z** |
| OfferBoq | **TAK** · `directPln=125654.79` · lines=167 |
| `catalogQuantities` | 167 / dodatnie **166** / usable **true** |
| `pricingMode` (resolved) | **`offer_boq_ai`** |
| `recommendedBidPln` | **282200** |
| `ok` | `true` |
| Path | **OfferBoq** (catalog skipped) |
| `parsedAt` | **2026-07-28T08:57:53.029Z** → **TAK** po cutover 2.65.68 |

### 3.5 `08deb669-db90-79a1-5fad-95000183597a` — OK mimo martwego catalog

| Pole | Wartość |
|------|---------|
| Nazwa | Grafit, Namysłowska 8 |
| Data utworzenia | **2026-05-29T19:19:25.291Z** |
| OfferBoq | **TAK** · `directPln=5809.52` · lines=45 |
| `catalogQuantities` | **45** / dodatnie **0** / usable **false** |
| `resolveCatalogQuantities` | **0** |
| `rows` | **0** |
| Catalog alone | F1 (`pricingMode=null`, PLN null) |
| Resolved Outcome | **`offer_boq_ai` · PLN 23300 · ok true** |
| Path | **OfferBoq** ratuje wynik |
| `parsedAt` | 2026-06-13 → przed 2.65.68 |
| ensure | `ensureWouldChange=true`, ale nadal **brak** usable qty (brak rows) — **nie** odzyskuje catalog Bid |

**Dowód przeciw H3 jako uniwersalnej przyczynie Outcome:** martwy catalog **nie** blokuje ceny, gdy OfferBoq ma `directPln > 0`.

---

## 4. Porównanie (wszystkie analizowane)

### 4.1 Pytania Ownera

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy **wszystkie** kończą w F1? | **NIE** — wśród FAIL: **1× F1**, **6× F2**; wśród OK: OfferBoq |
| Czy przyczyna identyczna? | **NIE** — min. **2 klasy** (F2 brak kosztorysu · F1 pusty snapshot) |
| Czy H3 potwierdzona? | **ODRZUCONA** jako główna / uniwersalna |
| Więcej niż jedna klasa? | **TAK** |

### 4.2 H3 — definicja vs dowód

H3 (AUDIT): *„`catalogQuantities` martwe / puste; `ensure…` nie odpalone (brak re-snapshot po 2.65.68)”*.

| Test H3 | Wynik |
|---------|-------|
| Dominująca przyczyna FAIL WM = martwe `catalogQuantities` przy istniejących rows? | **NIE** — FAIL niemal zawsze **bez** kosztorysu lub z **0 rows** |
| Czy `ensure` na FAIL odzyskuje Bid? | **NIE** (F1 VIII: ensure bez zmian; F2: brak snapshotu) |
| Czy legacy martwy catalog = brak ceny Outcome? | **NIE** — Grafit: catalog F1, Outcome **OK** przez OfferBoq |
| Czy brak re-snapshot po 2.65.68 koreluje z FAIL? | **Częściowo przypadkowe** — FAIL często `parsedAt=null`; OK też bywa sprzed cutover (Grafit) jeśli OfferBoq działa |

```text
H3: ODRZUCONA
```

---

## 5. Nowy ranking hipotez (po TRACE)

| Rank | ID | Hipoteza | Pewność | Dowód TRACE |
|------|-----|----------|---------|-------------|
| **1** | **H-F2** | Brak `tenderDossier.kosztorys` (nie wczytano / nie sparsowano przedmiaru) → catalog F2 → „Brak rekomendowanej ceny” | **WYSOKA** | **6/7** FAIL WM |
| **2** | **H-PARSE-EMPTY** | Snapshot `ok:true` ale **0 rows / 0 qty** (PDF przedmiar bez warstwy ilości) → F1; ensure nie pomaga | **ŚREDNIA** | 1/7 FAIL (paczka VIII) |
| **3** | **H-VIS** | Sticky / Outcome ujawnia brak ceny na tenderach bez dossier — wrażenie „regresji WAVE 2” | **ŚREDNIA** | UI-only 2.65.70; census niezależny od tipu UI |
| **4** | **H3** | Legacy martwe `catalogQuantities` bez ensure | **NISKA** (odrzucona jako primary) | FAIL ≠ ten wzorzec; OK z martwym catalog nadal ma PLN |
| **5** | **H6** | Regresja silnika 2.65.70 | **BARDZO NISKA** | potwierdzone AUDIT + brak w ścieżce TRACE compute |

---

## 6. Dowody (skrót techniczny)

| Dowód | Źródło |
|-------|--------|
| Census 13 WM · 7 bez PLN · 6 F2 · 1 F1 | `.tmp/cost-regression-01-trace-failures.json` |
| Paczka VIII F1 + ensure no-op | TRACE §3.2 · `parsedAt` 2026-07-25 |
| Grafit: catalog F1, Outcome OfferBoq OK | TRACE §3.5 |
| Paczka XI: qty usable + OfferBoq OK po cutover | TRACE §3.4 |
| Runtime path OfferBoq→Catalog | logi `[TRACE]` `fallback_entered` / `return_source` |

`computeTenderBidProposal` **jest** wywoływane na FAIL (catalog fallback). Bid **powstaje** jako obiekt `ok:false`.

---

## 7. Werdykt końcowy

| Pole | Wartość |
|------|---------|
| **H3** | **ODRZUCONA** |
| Główna klasa objawu WM | **F2 — brak kosztorysu w dossier** |
| Druga klasa | **F1 — pusty snapshot (bez rows/qty)** |
| Homogeniczność | **NIE** |
| WAVE 2 jako przyczyna Bid null | **NIE** |

```text
TRACE COMPLETE — COST-REGRESSION-01
H3 = ODRZUCONA
Next (bez IMPLEMENT): Owner GO → PLAN pod H-F2 / H-PARSE-EMPTY
(np. brak ATH w załącznikach vs nieudany heavy parse).

Bez implementacji.
Bez commit.
Bez push.
STOP — czekam na Owner GO.
```
