# CATALOG-BID-01 — RCA

> **ID:** CATALOG-BID-01  
> **PHASE:** RCA ONLY · **OWNER GO**  
> **MODE:** bez implementacji · bez commit · bez push · bez BUGFIX  
> **Data:** 2026-07-28  
> **Kontekst:** COST-PIPELINE-01 **ZAMKNIĘTY** (OfferBoq → OK · Fallback → OK · Outcome → OK).  
> Problem **nie** leży w COST-PIPELINE — leży w **ścieżce catalog Bid**.

```text
════════════════════════════════════════════════════════
PYTANIE WŁAŚCICIELA:
  Dlaczego computeCatalogBidProposalForPricingAuto()
  zwraca ok:false oraz recommendedBidPln = null
  dla znacznej części przetargów?
════════════════════════════════════════════════════════
```

---

## 1. Werdykt (skrót)

| Pole | Wartość |
|------|---------|
| **Root Cause (klasa)** | **Brak wejścia wyceny** — `kosztorys` bez cen ATH **i** bez dodatnich ilości (`catalogQuantities` / `rows.quantity`) → `resolveTenderBidPricingMode` = `null` → early `ok:false` |
| **Najczęstszy warning (TRACE T2)** | *„Brak cen w kosztorysie i brak ilości do wyceny katalogowej — wczytaj przedmiar ATH.”* |
| **`ok:false` ⇔ `recommendedBidPln=null`** | **Tak** — w `computeTenderBidProposal` każdy early-return `ok:false` ustawia **wszystkie** pola PLN na `null`. Sukces (`ok:true`) **zawsze** ustawia `recommendedBidPln = roundPln(recommended)` |
| **Czy każdy tender „z ceną wcześniej” musi dostać cenę z catalog?** | **NIE** — catalog wymaga **ilości z przedmiaru**; historyczna cena mogła pochodzić z **ATH priced**, **OfferBoq/AI Cost** lub innego SSOT — nie z katalogu |

---

## 2. Opis pipeline (catalog Bid)

`computeCatalogBidProposalForPricingAuto` **nie** liczy Bid samodzielnie — to cienki adapter:

1. Ładuje profil firmy (`loadCompanyProfileLocal`)
2. Resolvuje aktywny katalog (`resolveActiveCatalogForTender` → Work Catalog / seed)
3. Wywołuje **`computeTenderBidProposal(...)`** z:
   - `kosztorys: item.tenderDossier?.kosztorys`
   - `swz`, `fit`, `costModel`, `catalog`, `priceOverrides`
   - **bez** `offerBoqDirect` (to ścieżka OfferBoq, nie catalog)

W COST-PIPELINE (po BUGFIX-01) catalog jest wywoływany **tylko** gdy Gate = true **i** OfferBoq → Bid = null.

```text
┌─────────────────────────────────────────────────────────────┐
│  useTenderPricingAuto / resolveTenderPricingAutoProposal    │
│  (COST-PIPELINE — poza zakresem tego RCA, już CLOSED)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ OfferBoq null → fallback
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  computeCatalogBidProposalForPricingAuto                    │
│  src/app/hooks/useTenderPricingAuto.ts ~L48–66              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  computeTenderBidProposal                                   │
│  src/lib/tenders-bid-calculator.ts ~L249                    │
│                                                             │
│  resolveTenderBidPricingMode(kosztorys)                     │
│    ├─ !kosztorys.ok          → null                         │
│    ├─ ATH total > 0          → "ath_priced"                 │
│    ├─ qty lines > 0          → "catalog"                    │
│    └─ else                   → null                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   early ok:false    ath_priced path    catalog path
   (mode null)       (ATH totals)       aggregateCatalogDirectCost
         │                 │                 │
         │                 │            direct ≤ 0 → ok:false
         │                 │            direct > 0 → tail Kp/marża
         │                 └────────┬────────┘
         │                          ▼
         │                   ok:true + recommendedBidPln
         ▼
   ok:false + recommendedBidPln=null
```

---

## 3. Miejsca utraty Bid (gdzie Bid przestaje być możliwy)

| # | Punkt | Warunek | Efekt |
|---|--------|---------|--------|
| **L1** | Brak / zły kosztorys | `!kosztorys?.ok` | Bid niemożliwy (brak SSOT przedmiaru) |
| **L2** | Brak ATH **i** brak ilości | `resolveTenderBidPricingMode` = `null` | Bid niemożliwy — **główna utrata** |
| **L3** | Mode = `ath_priced`, ale suma ATH ≤ 0 | Race / niespójność parse | Bid niemożliwy (rzadkie) |
| **L4** | Mode = `catalog`, `aggregate.totals.direct ≤ 0` | Ilości puste po filtrze **lub** agregat zerowy | Bid niemożliwy |
| **L5** | (po sukcesie direct) | Tail Kp / marża / fit | **Nie** zeruje Bid — zawsze `ok:true` + PLN |

**Wniosek:** Bid „znika” **przed** tailem oferty (Kp, ZUS, marża). Utrata jest na **wejściu mode / ilości / ATH**, nie na bibliotekach cen w sensie „katalog pusty = zawsze 0” (UNKNOWN ma fallback stawek).

---

## 4. Wszystkie ścieżki `ok:false` (+ `recommendedBidPln=null`)

Źródło: `src/lib/tenders-bid-calculator.ts` · funkcja `computeTenderBidProposal`.

| ID | Warunek | Przyczyna | Plik | Funkcja | Linia (approx) | Warning |
|----|---------|-----------|------|---------|----------------|---------|
| **F1** | `!offerBoqDirect && (!pricingMode \|\| !kosztorys?.ok)` **oraz** `kosztorys?.ok === true` | Mode = `null`: brak ATH total **i** brak qty > 0 | `tenders-bid-calculator.ts` | `computeTenderBidProposal` | **278–293** | *Brak cen w kosztorysie i brak ilości do wyceny katalogowej — wczytaj przedmiar ATH.* |
| **F2** | Jak F1, ale `kosztorys?.ok` falsy / brak | Brak poprawnego snapshotu kosztorysu | j.w. | j.w. | **278–293** | *Brak kosztorysu ATH/XLSX — wczytaj załącznik…* |
| **F3** | `pricingMode === "ath_priced"` **i** `(athTotal == null \|\| athTotal <= 0)` | Mode ATH, ale suma nieczytelna | j.w. | j.w. | **359–372** | *Brak sumy kosztorysu inwestora…* |
| **F4** | Gałąź catalog: `agg.totals.direct <= 0` | Brak dodatniego kosztu direct po agregacji | j.w. | j.w. | **403–416** | *Przedmiar bez cen — brak pozycji z dodatnią ilością…* |

### Warunki pomocnicze (nie są osobnym `return`, ale zasilają F1/F4)

| Helper | Warunek → efekt | Plik | Linia |
|--------|-----------------|------|-------|
| `resolveTenderBidPricingMode` | `!kosztorys?.ok` → `null` | `tenders-bid-calculator.ts` | **168** |
| j.w. | ATH total > 0 → `"ath_priced"` (nie catalog) | j.w. | **169–171** |
| j.w. | `resolveCatalogQuantities(...).length > 0` → `"catalog"` | j.w. | **172** |
| j.w. | else → `null` | j.w. | **173** |
| `resolveCatalogQuantities` | brak `kosztorys` → `[]` | j.w. | **151–152** |
| j.w. | `catalogQuantities` — filtr `parseQty(quantity) > 0` | j.w. | **152–153** |
| j.w. | fallback `rows` — wymaga `description` + qty > 0 | j.w. | **155–162** |
| `parseQty` | puste / nieparsowalne / ≤ 0 → `0` | j.w. | **67–70** |
| `aggregateCatalogDirectCost` | suma material+labor → `direct`; 0 wierszy ⇒ direct 0 | `wgdom-catalog-cost-engine.ts` | **170–208** |

**Uwaga adaptera:** `computeCatalogBidProposalForPricingAuto` (`useTenderPricingAuto.ts` **L48–66**) **nie** dodaje własnych `ok:false` — tylko przekazuje wynik `computeTenderBidProposal`.

---

## 5. Wszystkie ścieżki `recommendedBidPln = null`

| ID | Skąd | Opis |
|----|------|------|
| **N1–N4** | Identyczne z **F1–F4** | Każdy early-return ustawia `recommendedBidPln: null` (oraz floor/aggressive/safe/costPrice) |
| **N5** | Warstwa COST-PIPELINE (poza catalog) | `resolveTenderPricingAutoProposal` może zwrócić **`proposal: null`** gdy catalog `ok:false` / PLN ≤ 0 — to **konsument** wyniku catalog, nie przyczyna w silniku |

**Nie istnieje** ścieżka `ok:true` + `recommendedBidPln: null` w `computeTenderBidProposal` — sukces kończy się `recommendedBidPln: roundPln(recommended)` (**L567–570**).

---

## 6. Czy problem wynika z…?

| Hipoteza | Werdykt | Uzasadnienie |
|----------|---------|--------------|
| **Puste ilości** | **TAK — główna** | F1: `resolveCatalogQuantities` → `[]` → mode `null` (przy braku ATH) |
| **quantity (parsowanie)** | **TAK — wkład** | `parseQty` odrzuca puste / ≤0 / zły format → linie wypadają z wyceny |
| **KNR** | **NIE bezpośrednio** | Catalog nie wymaga kodu KNR do Bid; KNR może wpływać na jakość klasyfikacji ATH, nie na early F1 |
| **Mapowanie robót / klasyfikator** | **CZĘŚCIOWO / rzadko F4** | UNKNOWN i tak dostaje `getUnknownFallbackRate` — zwykle **nie** zeruje direct przy qty > 0 |
| **Biblioteka robót (Work Catalog)** | **NIE jako F1** | Pusty Work Catalog → seed `defaultWgdomCostCatalog`; nie wyjaśnia F1 |
| **Ceny (stawki)** | **NIE jako F1** | F1 odpala **zanim** agregacja cen; F4 teoretycznie przy zerowych stawkach wszystkich linii (mało prawdopodobne przy seed) |
| **Parser / dossier** | **TAK — root upstream** | Snapshot bez `ok`, bez `totalValue`/row totals, bez qty → F1/F2 |
| **Walidacja** | **TAK — gate mode** | `resolveTenderBidPricingMode` = twarda walidacja wejścia |
| **Inne** | Fit / SWZ / marża | **Nie** blokują Bid po wejściu w ścieżkę sukcesu |

---

## 7. Tabela: Warunek → Efekt → Odzysk Bid → Ryzyko

| Warunek | Efekt | Czy można odzyskać Bid? | Ryzyko |
|---------|-------|-------------------------|--------|
| Brak `kosztorys` / `ok:false` | F2 · PLN null | Tak — wczytać / naprawić ATH·XLSX·PDF przedmiar | Wysokie — brak SSOT |
| `ok:true`, brak ATH total, qty = 0 | F1 · PLN null (**najczęstsze**) | Tak — uzupełnić `catalogQuantities` / `rows.quantity` **albo** ATH z cenami | Wysokie — typowy „przedmiar bez ilości” |
| ATH total > 0 | Mode `ath_priced` · Bid OK (nie catalog) | Już „odzyskany” inną ścieżką | Niskie — inny SSOT niż catalog |
| Qty > 0, agregat direct > 0 | Mode `catalog` · Bid OK | — | Niskie — wycena orientacyjna (UNKNOWN %) |
| Qty > 0, direct ≤ 0 | F4 · PLN null | Tak — sprawdzić stawki / qty / override | Średnie — rzadkie przy seed |
| Mode ATH, suma ≤ 0 | F3 · PLN null | Tak — naprawić `totalValue` / row totals | Średnie — niespójność snapshot |
| Wysoki % UNKNOWN przy Bid OK | Bid jest, ale warning | Tak — poprawić klasyfikację / Baza cen | Średnie — jakość, nie obecność ceny |
| OfferBoq null + F1 | Outcome „Brak rekomendowanej ceny” | Tak — OfferBoq **lub** qty/ATH | Wysokie — widoczne po COST-PIPELINE fallback |

---

## 8. Ranking przyczyn (dla „znacznej części przetargów”)

| Rank | Przyczyna | Ścieżka | Pewność |
|------|-----------|---------|---------|
| **1** | Brak dodatnich ilości w snapshot (`catalogQuantities` / `rows`) **przy** braku cen ATH | **F1** | **WYSOKA** (TRACE T2 warning exact match) |
| **2** | Brak / niepoprawny kosztorys (`!kosztorys.ok`) | **F2** | WYSOKA (część przetargów bez dossier) |
| **3** | Upstream: parser / merge nie wypełnia qty mimo „jest przedmiar” | zasila **F1** | ŚREDNIA–WYSOKA (hipoteza produktowa — wymaga osobnego probe prod) |
| **4** | Agregat catalog `direct ≤ 0` mimo qty | **F4** | NISKA–ŚREDNIA |
| **5** | ATH mode bez sumy | **F3** | NISKA |
| **6** | Pusta biblioteka / złe mapowanie KNR | — | **NISKA** jako przyczyna `ok:false` (wpływ na jakość, nie F1) |

---

## 9. Root Cause

### RC-1 (PRIMARY) — Gate wejścia wyceny

`computeTenderBidProposal` wymaga **jednego** z:

1. cen ATH (`ath_priced`), **albo**
2. dodatnich ilości (`catalog`), **albo**
3. `offerBoqDirect` (nie używane w `computeCatalogBidProposalForPricingAuto`).

Dla znacznej części przetargów po COST-PIPELINE fallback:

- OfferBoq = null (osobny temat AI Cost / BOQ),
- kosztorys **bez** sumy ATH / row totals,
- **i** bez linii z `quantity > 0`,

→ `resolveTenderBidPricingMode` = `null` → **F1** → `ok:false` + `recommendedBidPln=null`.

To **nie** jest regresja COST-PIPELINE. To **kontrakt catalog Bid**: bez ilości / ATH **nie ma** Bid.

### RC-2 (SECONDARY / upstream)

Jeśli biznesowo „przetarg ma przedmiar”, a snapshot ma puste qty — root leży **powyżej** kalkulatora (parser, dossier merge, `catalogQuantities` build), nie w Kp/marży ani w Work Catalog seed.

### RC-3 (NON-CAUSE dla F1)

Klasyfikator UNKNOWN, Work Catalog, KNR, marża, fit — **nie** generują F1. UNKNOWN przy qty > 0 zwykle nadal daje `direct > 0` (fallback rate).

---

## 10. Czy wszystkie przetargi, które wcześniej miały cenę, powinny dostać cenę z catalog?

**NIE.**

| Wcześniejsze źródło ceny | Czy catalog „musi” odtworzyć? | Dlaczego |
|--------------------------|-------------------------------|----------|
| **ATH priced** (`ath_priced`) | Nie przez catalog — przez ATH path w tym samym `computeTenderBidProposal` | Catalog jest tylko gdy **brak** ATH total |
| **OfferBoq / AI Cost** | Nie — to L1 COST-PIPELINE | Catalog to **fallback**, nie zamiennik OfferBoq |
| **Catalog z qty** | Tak — jeśli qty nadal w snapshot | Wtedy Bid powinien wrócić |
| **UI / override / ręczna** | Niekoniecznie | Inny SSOT |
| **Szacunek SWZ bez przedmiaru** | Nie | Catalog **nie** wycenia z samego `estimatedValuePln` |

**Zasada:** „Miał cenę” ≠ „musi mieć cenę z catalog”. Catalog Bid jest **warunkowy względem ilości (lub ATH)**. Po przejściu przez warstwę catalog **bez** tych danych — **poprawne** jest `ok:false`.

---

## 11. Dowód TRACE (COST-PIPELINE-01-TRACE-LOCAL)

Tender **T2-empty-lines** (Gate true, OfferBoq false, fallback true):

```text
catalogBid_result: ok:false, pricingMode:null, recommendedBidPln:null
warnings0: "Brak cen w kosztorysie i brak ilości do wyceny katalogowej — wczytaj przedmiar ATH."
return_source: catalog_no_price
```

→ Dokładnie ścieżka **F1** · RC-1.

---

## 12. Rekomendacja (tylko kierunek — **bez** IMPLEMENT w tym RCA)

| Priorytet | Kierunek | Uwaga |
|-----------|----------|-------|
| **R1** | **Nie** „naprawiać” COST-PIPELINE — CLOSED | Fallback działa poprawnie |
| **R2** | Przed BUGFIX: **pomiar prod** — % przetargów z Gate+OfferBoq null w klasach F1 / F2 / F4 | Potwierdzić Rank 1 |
| **R3** | Jeśli F1 dominuje przy „jest przedmiar w UI”: RCA/BUGFIX **upstream qty** (`catalogQuantities` / rows), nie stawek | Osobny ticket |
| **R4** | Jeśli F1 przy świadomie pustym przedmiarze: UX copy „Brak ilości — nie da się wycenić katalogowo” (już blisko warninga) | UX, nie silnik |
| **R5** | **Zakaz** wymuszania Bid z samego SWZ `estimatedValuePln` bez briefu Ownera | Zmiana kontraktu biznesowego |
| **R6** | Nie mylić wysokiego UNKNOWN% z `ok:false` | To problem jakości, nie obecności ceny |

---

## 13. Allowlist / zakazy (na BUGFIX — dopiero po Owner GO)

**Poza zakresem CATALOG-BID-01 BUGFIX (domyślnie):**

- rewrite AI-COST / OfferBoq,
- parser ATH/PDF,
- Edge / KV / sync merge,
- zmiana `resolveTenderBidPricingMode` bez briefu (kontrakt wyceny).

**Kandydat allowlist (po GO):**

- diagnostyka / testy jednostkowe ścieżek F1–F4,
- ewentualny wąski fix **tylko** jeśli Owner wskaże konkretną klasę (np. qty recovery) — **osobny DESIGN FREEZE**.

---

## 14. STOP

```text
RCA COMPLETE — CATALOG-BID-01
Dokument: docs/architecture/CATALOG-BID-01-RCA.md

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do BUGFIX.
```
)