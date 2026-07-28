# COST-REGRESSION-01 — AUDIT + RCA

> **ID:** COST-REGRESSION-01  
> **MODE:** **READ ONLY** · **bez implementacji** · **bez commit** · **bez push**  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Objaw:** wiele przetargów WM → **„Brak rekomendowanej ceny”** (po tipie UI **2.65.70**)  
> **Kontekst tip:** feature WAVE 2 **`ef122a5`** · tip docs **`9c28488`** · prior CATALOG-BID-01 **`e10efa9`** / **2.65.68**

```text
════════════════════════════════════════════════════════
WERDYKT SKRÓT:
  2.65.70 (COSTORYS-UX WAVE 2) NIE zmienia Bid / OfferBoq engines /
  COST-PIPELINE / catalogQuantities.

  Objaw = ta sama klasa co CATALOG-BID-01 / COST-PIPELINE RCA:
  TenderBidProposal powstaje, ale często ok:false ·
  recommendedBidPln=null · pricingMode=null (F1) —
  bo brak ATH total > 0 i brak użytecznych ilości.

  Korelacja czasowa z WAVE 2 ≠ przyczynowość w silniku wyceny.
  Sticky Offer Bar (WAVE 1+) zwiększa widoczność „Brak…”.
════════════════════════════════════════════════════════
```

---

## 0. Zakres audytu (pytania Ownera)

| # | Pytanie | Odpowiedź (skrót) |
|---|---------|-------------------|
| **1** | Czy `TenderBidProposal` powstaje? | **Tak** (obiekt) — często `ok:false`; Outcome czyta `recommendedBidPln` |
| **2** | Czy `recommendedBidPln == null`? | **Tak** przy F1–F4 / gate; UI wymaga `> 0` |
| **3** | Czy `pricingMode == null`? | **Tak** przy F1 (brak ATH + brak qty) — najczęstsze |
| **4** | Czy `catalogQuantities` obecne? | **Często nie / martwe** na legacy dossier (bez re-snapshot) |
| **5** | Czy OfferBoq ma dodatnie ilości? | **Często nie** → `directPln ≤ 0` → runtime OfferBoq = **null** |
| **6** | Czy `computeTenderBidProposal` jest wołane? | **Tak** — OfferBoq S6 **lub** catalog fallback |
| **7** | Dane czy logika? | **Głównie DANE (wejście wyceny)** + znana logika gate F1; **nie** regresja kodu 2.65.70 |
| **8** | vs CATALOG-BID-01? | **Ta sama klasa F1**; fix 2.65.68 działa przy `athPreviewToSnapshot`; **nie cofnięty** w 2.65.69–70 |

---

## 1. AUDIT — ścieżka wyceny (AS-IS tip)

```text
Outcome / TRE Offer Run
  ← bidProposal z useTenderPipelineRuntime
       ← useTenderPricingAuto
            ├─ !canComputeTenderPricingAuto → proposal = null
            └─ resolveTenderPricingAutoProposal (COST-PIPELINE ON)
                 ├─ computeRuntimeBidFromOfferBoq
                 │     ├─ doc OfferBoq
                 │     ├─ integrate → computeTenderBidProposal(offerBoqDirect)
                 │     └─ null jeśli brak direct>0 / mode≠offer_boq_ai / PLN≤0
                 │           → FALLBACK catalog
                 └─ computeCatalogBidProposalForPricingAuto
                       → computeTenderBidProposal(kosztorys, catalog)
                            → resolveTenderBidPricingMode
                                 ATH>0 → ath_priced
                                 qty>0 → catalog
                                 else → null → F1 ok:false · PLN null

Sticky Kosztorysy (WAVE 1/2 UI)
  ← offerSummary.recommendedBidDisplay z Explainability / Bid S6
  ← fallback string „Brak rekomendowanej ceny” gdy brak available PLN
```

### 1.1 Czy Bid Proposal „powstaje”?

| Warstwa | Co powstaje | Kiedy UI mówi „Brak…” |
|---------|-------------|------------------------|
| `computeTenderBidProposal` | **Zawsze obiekt** `TenderBidProposal` | `ok:false` ⇒ wszystkie PLN `null` |
| `resolveTenderPricingAutoProposal` | obiekt **lub** (przy gate) `null` | `recommendedBidPln` nie `> 0` |
| `deriveOfferRunSnapshot` | label | `pricingSettledWithoutBid` → **„Brak rekomendowanej ceny”** (`tender-offer-run.ts`) |
| Sticky bar | display string | brak `offerSummary.available` / brak PLN → ten sam tekst |

**Wniosek:** problem rzadko jest „brak wywołania silnika”; typowo jest **wywołanie + wynik bez ceny**.

### 1.2 `recommendedBidPln` / `pricingMode`

Źródło: `src/lib/tenders-bid-calculator.ts` (bez zmian w `ef122a5`).

| Stan | `pricingMode` | `recommendedBidPln` | Warning (typ.) |
|------|---------------|---------------------|----------------|
| **F1** | `null` | `null` | Brak cen ATH i brak ilości katalogowych |
| **F2** | `null` | `null` | Brak kosztorysu |
| Sukces catalog / ATH / OfferBoq | `catalog` / `ath_priced` / `offer_boq_ai` | `roundPln(...)` | — |

**Nie istnieje** `ok:true` + `recommendedBidPln:null` w kalkulatorze.

### 1.3 `catalogQuantities` / OfferBoq qty

| Tor | Warunek ceny | Uwagi |
|-----|--------------|-------|
| Catalog | `resolveCatalogQuantities` → linie z **qty > 0** (z `catalogQuantities` lub fallback `rows`) | CATALOG-BID-01: `ensureKosztorysCatalogQuantities` **tylko** przy `athPreviewToSnapshot` |
| OfferBoq | `doc.totals.directPln > 0` w adapterze | Bez dodatnich ilości / wyceny komponentów → `buildOfferBoqBidAdapterPayload` = **null** → runtime **null** → catalog |

**Legacy WM dossier** zapisany przed 2.65.68 z pustymi / martwymi `catalogQuantities` **nie** dostaje automatycznego ensure, dopóki nie przejdzie ponownie przez snapshot ATH.

### 1.4 Czy `computeTenderBidProposal` jest wywoływane?

| Ścieżka | Wywołanie | Plik |
|---------|-----------|------|
| OfferBoq OK | Tak (`integrateOfferBoqWithBidProposal`) | `tender-offer-boq-bid-adapter.ts` |
| OfferBoq null | Tak (`computeCatalogBidProposalForPricingAuto`) | `useTenderPricingAuto.ts` |
| Gate false | **Nie** — `proposal=null` przed resolve | `useTenderPricingAuto` |

Po **BUGFIX-01** (`fdfdc05` / 2.65.67): OfferBoq null **zawsze** wchodzi w catalog (nie early `return null`).

### 1.5 Diff 2.65.70 vs silnik wyceny

`git show ef122a5 --stat` — **wyłącznie**:

- `OfferBoqCostIntelligencePanel.tsx` (UI density/search/sort)
- `offer-boq-ux-wave2.ts` (pure UI helpers)
- test + changelog + docs WAVE 2

**Zero** plików: `tenders-bid-calculator.ts` · `useTenderPricingAuto.ts` · `tenders-bzp-brief.ts` · OfferBoq pricing engines · COST-PIPELINE config.

---

## 2. Porównanie z CATALOG-BID-01 (CLOSED)

| | CATALOG-BID-01 | COST-REGRESSION-01 (ten audyt) |
|--|----------------|--------------------------------|
| Objaw | Część tenderów · catalog `ok:false` · PLN null | Wiele WM · „Brak rekomendowanej ceny” |
| Root class | **F1** — brak ATH total + brak qty > 0 | **Ta sama klasa** (dane wejścia) |
| Fix | `ensureKosztorysCatalogQuantities` / build qty > 0 przed kalkulatorem | **Już na tipie** od **2.65.68** — **nie cofnięty** |
| Limit fixu | Działa przy **następnym** `athPreviewToSnapshot`; legacy KV bez reparse | Wyjaśnia **trwałość** objawu mimo tipu 2.65.70 |
| Tip korelacji | 2.65.68 | 2.65.70 = **UI only** — nie nowa przyczyna F1 |

Powiązane (historyczne):

- [`CATALOG-BID-01-RCA.md`](CATALOG-BID-01-RCA.md) — F1 SSOT  
- [`COST-PIPELINE-01-RCA-REGRESSION-01.md`](COST-PIPELINE-01-RCA-REGRESSION-01.md) — odcięcie fallbacku (naprawione BUGFIX-01)  
- [`COST-PIPELINE-01-RCA-BUGFIX-02.md`](COST-PIPELINE-01-RCA-BUGFIX-02.md) — po fallbacku catalog też może zwrócić `catalog_no_price`

---

## 3. RCA — root cause

### 3.1 Root cause (produkcyjny)

**Klasa: BRAK WEJŚCIA WYCENY (dane snapshotu)**  

Dla typowego WM bez cen ATH w `kosztorys` i bez użytecznych ilości:

1. OfferBoq: `directPln ≤ 0` / brak linii → `computeRuntimeBidFromOfferBoq` = **null**  
2. Catalog: `resolveTenderBidPricingMode` = **null** → **F1** → `ok:false`, `pricingMode:null`, `recommendedBidPln:null`  
3. Outcome / sticky mapują to na **„Brak rekomendowanej ceny”**

### 3.2 Co NIE jest root causeem 2.65.70

| Hipoteza | Werdykt |
|----------|---------|
| WAVE 2 zepsuł `computeTenderBidProposal` | **ODRZUCONA** (brak w diff) |
| WAVE 2 zepsuł COST-PIPELINE / OfferBoq engines | **ODRZUCONA** |
| WAVE 2 cofnął CATALOG-BID-01 | **ODRZUCONA** |
| WAVE 2 zmienił kontrakt F1–F4 | **ODRZUCONA** |

### 3.3 Co może wyglądać jak „regresja po 2.65.70”

| Efekt | Mechanizm |
|-------|-----------|
| **Większa widoczność** | Sticky Offer Bar (WAVE 1, 2.65.69) + gęstsza lista (WAVE 2) — „Brak…” zawsze w pierwszym ekranie Kosztorysów |
| **Korelacja czasowa** | Owner testuje po deployu WAVE 2; problem danych istniał wcześniej / nadal na legacy dossier |
| **Dwa UI, jeden string** | Outcome (`tender-offer-run`) **i** sticky (`OfferBoqCostIntelligencePanel`) — ten sam copy; sticky **nie** woła catalog fallback przy wyświetlaniu |

---

## 4. Hipotezy (ranked)

| ID | Hipoteza | Prawdopodobieństwo | Jak zweryfikować (READ / TRACE) |
|----|----------|--------------------|----------------------------------|
| **H1** | Legacy dossier WM: brak ATH total + brak qty > 0 → F1 catalog | **WYSOKIE** | TRACE `lineHint` + `catalogBid_result.pricingMode=null` + warning F1 |
| **H2** | OfferBoq null (brak dodatnich qty/direct) → catalog → też F1 | **WYSOKIE** | `OfferBoq_exists=false`, `fallback_entered=true`, `return_source=catalog_no_price` |
| **H3** | `catalogQuantities` martwe / puste; `ensure…` nie odpalone (brak re-snapshot) | **WYSOKIE** | Porównaj KV snapshot przed/po `athPreviewToSnapshot`; CATALOG-BID closeout limit |
| **H4** | Widoczność sticky — stary problem wygląda jak nowa regresja 2.65.70 | **ŚREDNIE–WYSOKIE** | Ten sam tender na Outcome przed WAVE 2 (jeśli logi) / porównaj tip 2.65.68 vs 2.65.70 na tych samych ID |
| **H5** | Gate `canComputeTenderPricingAuto=false` → proposal null | **ŚREDNIE** | TRACE `null_site=gate` |
| **H6** | Regresja kodu Bid wprowadzona w `ef122a5` | **BARDZO NISKIE** | Diff allowlist — już audytowany |
| **H7** | Work Catalog / stawki zerują direct (F4) | **NISKIE** | warning F4; qty>0 ale direct≤0 |

---

## 5. Dowody

### 5.1 Git / tip

| Fakt | Dowód |
|------|-------|
| WAVE 2 = UI only | `git show ef122a5 --stat` — panel + `offer-boq-ux-wave2.ts` + docs/test |
| CATALOG-BID fix nadal w historii | `e10efa9` przed `3e57e8d` / `ef122a5`; brak revertu `ensureKosztorysCatalogQuantities` |
| BUGFIX-01 catalog fallback nadal w kodzie | `useTenderPricingAuto.ts` L132–160: `runtime` null → `computeCatalogBidProposalForPricingAuto` |

### 5.2 Kod (kontrakt)

| Fakt | Plik |
|------|------|
| F1: mode null → PLN null | `tenders-bid-calculator.ts` ~278–293 |
| OfferBoq runtime wymaga PLN>0 | `tender-offer-boq-explainability.ts` `computeRuntimeBidFromOfferBoq` ~704–706 |
| Adapter wymaga `directPln > 0` | `tender-offer-boq-bid-adapter.ts` `buildOfferBoqBidAdapterPayload` |
| Outcome label | `tender-offer-run.ts` ~171–174 |
| Sticky fallback string | `OfferBoqCostIntelligencePanel.tsx` ~896 |
| ensure qty tylko przy snapshot | `tenders-bzp-brief.ts` `athPreviewToSnapshot` → `ensureKosztorysCatalogQuantities` |

### 5.3 Spójność z wcześniejszymi RCA

| Dokument | Zgodność |
|----------|----------|
| CATALOG-BID-01-RCA | F1 = brak qty + brak ATH — **tak** |
| COST-PIPELINE RCA-01 | OfferBoq null bez fallbacku — **naprawione** w 2.65.67; nie wraca w 2.65.70 |
| COST-PIPELINE RCA-BUGFIX-02 | „Brak…” po fallbacku = catalog_no_price — **tak** |

### 5.4 Brak dowodu (tego audytu)

- Brak live TRACE `[TRACE]` z konkretnych ID przetargów WM Ownera (wymaga sesji przeglądarki / GO na diagnostykę).  
- Brak porównania KV `kosztorys` przed/po reparse dla tych ID.

---

## 6. Dane vs logika — werdykt

| Warstwa | Werdykt |
|---------|---------|
| **Logika Bid (F1–F4)** | Stabilna · **nie** zmieniona w 2.65.70 |
| **Logika COST-PIPELINE** | Fallback catalog ON · **nie** zmieniona w 2.65.70 |
| **Dane dossier** | **Główny winowajca** — brak użytecznego wejścia (qty / ATH) na wielu WM |
| **UI 2.65.70** | **Nie powoduje** null Bid; może **ujawniać** istniejący brak ceny |

```text
PROBLEM = DANE (+ znany gate F1)
NIE = regresja silnika wprowadzona przez COSTORYS-UX-01 WAVE 2
```

---

## 7. Rekomendacje (tylko kierunek — bez IMPLEMENT)

1. **Owner GO TRACE** na 2–3 WM z objawem: `OfferBoq_exists`, `fallback_entered`, `pricingMode`, `catalogQty`, `warnings0`.  
2. Sprawdzić, czy te dossier kiedykolwiek przeszły **`athPreviewToSnapshot` po 2.65.68**.  
3. Nie łączyć naprawy z WAVE 2 UI — osobny ticket (dane / ensure-on-read / reparse), po Design Freeze.  
4. Opcjonalnie: rozróżnić copy sticky „Brak oferty AI” vs Outcome catalog — **tylko po AUDIT+GO** (OOS tego dokumentu).

---

## 8. STOP

```text
AUDIT + RCA COMPLETE — COST-REGRESSION-01
Bez implementacji.
Bez commit.
Bez push.

STATUS: READ ONLY DONE
Czekam na Owner GO (TRACE / PLAN / IMPLEMENT) — nie startować naprawy bez GO.
```
