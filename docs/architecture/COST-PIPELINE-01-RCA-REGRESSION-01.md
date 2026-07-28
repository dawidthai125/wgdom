# COST-PIPELINE-01 — RCA-REGRESSION-01

> **ID:** COST-PIPELINE-01-RCA-REGRESSION-01  
> **MODE:** **RCA ONLY** — **zero** IMPLEMENT · BUGFIX · commit · push  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Objaw Owner:** **KAŻDY** przetarg natychmiast → **„Brak rekomendowanej ceny”** (nie pojedynczy tender · nie parser)  
> **Baseline:** COST-PIPELINE-01 feature **`c7b608a`** · UI **2.65.66** · DF [`COST-PIPELINE-01-DESIGN-FREEZE.md`](COST-PIPELINE-01-DESIGN-FREEZE.md)  
> **Powiązane:** TRE-02-HOTFIX-01 (`deriveOfferRunSnapshot` → terminal `insufficient_data`)

```text
════════════════════════════════════════════════════════
WERDYKT SKRÓT:
  Bid ginie w useTenderPricingAuto gdy flaga COST-PIPELINE-01 = ON
  i computeRuntimeBidFromOfferBoq() zwraca null —
  wtedy kod ZWRACA proposal: null i NIE wchodzi w catalog Bid.

  ROOT CAUSE = odcięcie fallbacku catalog (DF §2.2 „preferuj status”)
  + OfferBoq runtime często nie gotowy / direct ≤ 0
  + TRE HOTFIX mapuje Bid null → natychmiast „Brak rekomendowanej ceny”.

  Klasa: RUNTIME / HOOK (useTenderPricingAuto) · nie parser · nie Edge.
════════════════════════════════════════════════════════
```

---

## 0. Objaw vs oczekiwanie

| | |
|--|--|
| **AS-IS (po 2.65.66)** | Outcome: „Brak rekomendowanej ceny” na **wszystkich** (lub ogromnej większości) przetargach, od razu |
| **PRZED COST-PIPELINE-01** | Outcome/Bid z **`computeTenderBidProposal` tryb `catalog`** (agregacja przedmiaru × katalog) w `useTenderPricingAuto` |
| **NIE wygląda na** | pojedynczy zły ATH · błąd parsera · Edge · sync Payroll |

---

## 1. Ścieżka Bid (AS-IS po COST-PIPELINE-01)

```text
useTenderPipelineRuntime
  → useTenderPricingAuto({ item, swz, … })
       │
       ├─ !canComputeTenderPricingAuto → proposal = null
       │
       ├─ isCostPipeline01Enabled() === true  (DEFAULT ON, LS brak klucza)
       │     │
       │     ├─ computeRuntimeBidFromOfferBoq(item)
       │     │     ├─ buildOfferBoqDocumentForPipelineItem  (S1–S4)
       │     │     │     └─ null jeśli brak snapshot/linii
       │     │     ├─ integrateOfferBoqWithBidProposal (S6)
       │     │     │     └─ null jeśli directPln ≤ 0 (adapter)
       │     │     └─ null jeśli pricingMode≠offer_boq_ai
       │     │         lub recommendedBidPln null/≤0
       │     │
       │     ├─ runtime OK  → proposal = runtime.proposal   ✅ offer_boq_ai
       │     └─ runtime null → proposal = null              ❌ FALLBACK SKIPPED
       │
       └─ isCostPipeline01Enabled() === false (R0)
             → computeTenderBidProposal({ catalog, … })     ✅ catalog (legacy)
```

**Outcome UI:**

```text
bidProposal (null)
  → deriveOfferRunSnapshot (TRE-02-HOTFIX-01)
  → pricingSettledWithoutBid
  → lifecycleStatus = insufficient_data
  → phaseLabelPl = „Brak rekomendowanej ceny”
```

To tłumaczy **natychmiastowość** i **uniwersalność** objawu: nie czekamy na parser — Pricing/Ready + Bid null = terminal label.

---

## 2. Odpowiedzi na hipotezy (1–8)

### H1 — Czy `computeRuntimeBidFromOfferBoq()` jest wywoływane?

| | |
|--|--|
| **Tak** | Dla **każdego** itemu, dla którego `canComputeTenderPricingAuto` = true **oraz** `isCostPipeline01Enabled()` = true |
| **Gdzie** | `src/app/hooks/useTenderPricingAuto.ts` L58–64 |
| **Jak często** | Przy każdym `useMemo` pricing (zmiana item/dossier/swz/revision) — **per otwarty detal przetargu** |

### H2 — Jaką wartość zwraca?

Z kodu (bez live logów prod) możliwe wyniki:

| Wynik | Warunek |
|-------|---------|
| **`null`** | brak linii przedmiaru · `buildOfferBoq…` null · adapter `directPln≤0` · Bid bez `recommendedBidPln>0` |
| **`{ proposal, document, usedOfferBoqDirect: true }`** | OfferBoq z `directPln>0` + S6 OK |

**Regresja Ownera („wszystkie”) ⇒ w praktyce dominuje `null`.**  
Poprawny Bid `offer_boq_ai` występuje tylko gdy pełny łańcuch S1–S6 da `directPln>0` (test wire: fixture z 1 pozycją + katalog lokalny — PASS w CI, nie = stan typowego tendera prod).

### H3 — Czy OfferBoq istnieje w runtime?

| Warstwa | Stan |
|---------|------|
| **Source** | **Compute-on-read** z `item.tenderDossier.kosztorys` — **brak** osobnego KV/provider OfferBoq |
| **Hook** | Budowa w `computeRuntimeBidFromOfferBoq` / panel Explainability — **ta sama funkcja build**, ale Outcome **nie** czyta panelu |
| **Cache** | Brak trwałego cache OfferBoq w runtime pricing |
| **Storage** | Work Catalog + Company Knowledge + Company Profile z **localStorage** (wejście S2–S4) — nie OfferBoq document |
| **Provider** | Brak React Context OfferBoq — tylko funkcje pure + LS katalog |

**Wniosek:** OfferBoq „istnieje” tylko jeśli uda się go **zbudować teraz**. Nie ma gotowego DTO w pipeline state. Jeśli S4 nie wyceni komponentów (`directPln` null/0), runtime traktuje OfferBoq jako **niegotowy** → `null`.

### H4 — Czy `useTenderPricingAuto` wchodzi w `offer_boq_ai`?

| Ścieżka | Kiedy |
|---------|--------|
| **Próba OfferBoq** | Zawsze gdy flaga ON + gate pricing |
| **Skuteczny `offer_boq_ai`** | Tylko gdy `runtime` ≠ null |
| **W regresji** | Prawie zawsze: **próba TAK · sukces NIE** → wychodzi z `proposal: null` **bez** `pricingMode` |

Nie „nigdy nie trafia” w kod OfferBoq — **trafia i odpada**.

### H5 — Czy fallback catalog jest osiągalny?

| | |
|--|--|
| **Przy fladze ON (prod default)** | **NIE** — martwy kod poniżej `if (isCostPipeline01Enabled())` |
| **Przy R0 `kw-cost-pipeline-01=0`** | **TAK** — pełny legacy `computeTenderBidProposal({ catalog })` |

### H6 — Czy jest warunek odcinający fallback?

**TAK — explicite:**

```58:64:src/app/hooks/useTenderPricingAuto.ts
    if (isCostPipeline01Enabled()) {
      const runtime = computeRuntimeBidFromOfferBoq({ item, swz: swz ?? null });
      if (runtime) {
        return { priceOverrides: overrides, proposal: runtime.proposal };
      }
      // DF §2.2: OfferBoq niedostępny → preferuj status (null), nie milczący catalog.
      return { priceOverrides: overrides, proposal: null };
    }
```

To jest **dokładne miejsce**, w którym Bid staje się `null` dla całej populacji tenderów bez gotowego OfferBoq.

Dodatkowe `return null` wewnątrz `computeRuntimeBidFromOfferBoq` (L688–705) — przyczyny „dlaczego runtime failed”, ale **odcięcie catalog** jest w hooku.

### H7 — Czy Bid kończy jako NULL dla wszystkich?

**Semantyka:** `bidProposal === null` (nie obiekt z `ok:false`).  
Outcome: `extractRecommendedBidPln(null)` → brak ceny → HOTFIX → „Brak rekomendowanej ceny”.

Dla każdego tendera, gdzie OfferBoq runtime fail: **tak, NULL**.  
Jeśli Owner widzi **100%** tenderów — OfferBoq runtime praktycznie nigdy nie przechodzi gate’ów sukcesu na prod (albo prawie nigdy).

### H8 — Czy COST-PIPELINE-01 usunął poprzedni runtime Bid?

**Funkcjonalnie TAK (gdy flaga ON):**

- **Przed:** zawsze (po gate) `computeTenderBidProposal` z **catalog**  
- **Po:** catalog tylko przy fladze OFF; przy ON — wyłącznie OfferBoq lub **null**

Nie usunięto funkcji catalog z repo — **usunięto ją ze ścieżki Outcome**.

---

## 3. Gdzie dokładnie ginie Bid? (mapa NULL)

| # | Lokalizacja | Warunek | Skutek |
|---|-------------|---------|--------|
| **N0** | `canComputeTenderPricingAuto` false | brak heavy/partial / `NOT_FOUND` | `proposal=null` (było też wcześniej) |
| **N1 ★★★** | `useTenderPricingAuto` L63–64 | flaga ON + `runtime===null` | **`proposal=null` · catalog SKIP** |
| **N2** | `buildOfferBoqDocumentForPipelineItem` | brak snapshot/linii | runtime null → N1 |
| **N3** | `buildOfferBoqBidAdapterPayload` | `directPln` null/≤0 | `integrate…` null → N1 |
| **N4** | `computeRuntimeBidFromOfferBoq` | mode≠`offer_boq_ai` / bid≤0 | runtime null → N1 |
| **N5** | `deriveOfferRunSnapshot` | Bid null + settled | UI „Brak rekomendowanej ceny” |

**Pierwsze miejsce regresji produktowej (vs 2.65.65):** **N1** — wcześniej przy tym samym stanie dossier szedł **catalog** i często dawał `recommendedBidPln>0`.

---

## 4. Dlaczego „wszystkie” przetargi?

1. **Flaga default ON** — cała produkcja na ścieżce OfferBoq-only.  
2. **Catalog odcięty** — nie ma drugiej szansy na cenę.  
3. **OfferBoq ≠ catalog:** ten sam przedmiar może dać cenę katalogową Bid, a AI Cost (S4) może mieć `directPln=0` (brak dopasowań / pusty Work Catalog lokalnie / unpriced).  
4. **TRE-02-HOTFIX** zamienia „null Bid” na **głośny** terminal status (zamiast wiecznego spinnera) — wygląda jak totalna awaria.

To **nie wymaga** błędu parsera na każdym tenderze.

---

## 5. Klasyfikacja problemu

| Kandydat | Werdykt |
|----------|---------|
| **hook `useTenderPricingAuto`** | **PRIMARY** — odcięcie fallback |
| **runtime `computeRuntimeBidFromOfferBoq`** | **SECONDARY** — często null (brak L1 ready) |
| provider / selector React | NIE — brak OfferBoq provider |
| cache OfferBoq | NIE — brak cache |
| feature flag | **WSPÓŁUCZESTNIK** — `COST_PIPELINE_01_DEFAULT=true` |
| storage | **WKŁAD** — LS Work Catalog wpływa na S4, ale nie jest root odcięcia ceny |
| parser / Edge / Decision | **NIE** |
| TRE HOTFIX | **WZMACNIACZ UX** (mapowanie null→label), nie przyczyna null |

---

## 6. ROOT CAUSE (jedno zdanie)

**ROOT CAUSE:** W `useTenderPricingAuto`, przy domyślnie włączonym COST-PIPELINE-01, gdy `computeRuntimeBidFromOfferBoq()` zwraca `null`, hook **zwraca `proposal: null` i świadomie pomija catalog Bid** (DF §2.2) — przez to Outcome (po TRE HOTFIX) pokazuje „Brak rekomendowanej ceny” na przetargach, które wcześniej miały cenę z catalog.

**Kod dowodowy:** `src/app/hooks/useTenderPricingAuto.ts` L57–64.  
**Decyzja DF:** [`COST-PIPELINE-01-DESIGN-FREEZE.md`](COST-PIPELINE-01-DESIGN-FREEZE.md) §2.2 — „domyślnie preferuj status, nie milczącą drugą cenę”.  
**Regresja produktowa:** preferowanie statusu **bez** działającego OfferBoq na większości tenderów = **pusta Outcome**.

---

## 7. Mapa tymczasowych logów `[PIPELINE]` (NIE wdrożone — RCA ONLY)

> Na życzenie Ownera: logi diagnostyczne **bez zmiany logiki**.  
> W tej sesji **nie dodano** ich do kodu (ZERO IMPLEMENTACJI / ZERO COMMIT).  
> Poniżej gotowa mapa pod Owner GO do diagnostyki / BUGFIX.

### 7.1 `useTenderPricingAuto` (wewnątrz `useMemo`, po gate)

```text
[PIPELINE] flag=ON|OFF
[PIPELINE] OfferBoq runtime called=yes|no
[PIPELINE] OfferBoq exists=yes|no
[PIPELINE] OfferBoq positions=<n>
[PIPELINE] OfferBoq total(directPln)=<n|null>
[PIPELINE] Bid source=offer_boq_ai|catalog|null
[PIPELINE] Bid value=<recommendedBidPln|null>
[PIPELINE] Fallback entered=yes|no
[PIPELINE] Fallback skipped=yes|no
[PIPELINE] Reason=<…>
[PIPELINE] Final Bid=<…>
[PIPELINE] Reason NULL=<…>
```

### 7.2 `computeRuntimeBidFromOfferBoq`

```text
[PIPELINE] build doc null → Reason NULL=no_snapshot_or_lines
[PIPELINE] adapter null → Reason NULL=direct_pln_le_0
[PIPELINE] mode/bid fail → Reason NULL=bad_mode_or_bid
[PIPELINE] OK → Bid source=offer_boq_ai Bid value=…
```

### 7.3 Oczekiwany dump przy regresji (hipoteza potwierdzona kodem)

```text
flag=ON
OfferBoq runtime called=yes
OfferBoq exists=no  (lub exists=yes + total=0)
Fallback entered=no
Fallback skipped=yes
Reason=DF_status_prefer_no_catalog
Final Bid=null
Reason NULL=runtime_null_catalog_cut
```

### 7.4 Szybka weryfikacja Ownera bez kodu (R0)

W konsoli przeglądarki na prod:

```js
localStorage.setItem('kw-cost-pipeline-01','0'); location.reload();
```

Jeśli ceny wracają → **potwierdzenie ROOT CAUSE (odcięty catalog)** bez deployu.

Przywrócenie ścieżki COST-PIPELINE:

```js
localStorage.removeItem('kw-cost-pipeline-01'); // lub ='1'
```

---

## 8. Co NIE jest root cause

- Parser ATH / dossier merge rewrite  
- TRE-03 / Decision / Autonomous  
- Edge / cloud-sync  
- Usunięcie `computeTenderBidProposal` z repo  
- Sam UI Outcome (tylko wyświetla Bid)  
- Sam TRE HOTFIX (poprawnie pokazuje brak Bid; nie kasuje Bid)

---

## 9. Implikacje pod przyszły BUGFIX (tylko wskazówki — **NIE implementować teraz**)

Bez zmiany architektury DF możliwe kierunki (wymagają Owner GO + ewentualnie ACR do DF §2.2):

| Opcja | Idea | Ryzyko |
|-------|------|--------|
| **A — R0 natychmiast** | `kw-cost-pipeline-01=0` | Przywraca catalog; OfferBoq wire OFF |
| **B — Fallback catalog gdy OfferBoq null** | Po N1: catalog zamiast null | Dual-price ryzyko — DF świadomie zakazywał milczącego |
| **C — Jawny status + catalog oznaczony** | Catalog tylko z metką „legacy/fallback” | Zgodne z duchem DF „jawny fallback” |
| **D — Default flag OFF do stabilizacji OfferBoq** | `COST_PIPELINE_01_DEFAULT=false` | Wire OFF na tipie |

**Zakaz w BUGFIX bez GO:** rewrite AI-COST · parser · Foundation · Edge.

---

## 10. DoD RCA

| # | Kryterium | Status |
|---|-----------|--------|
| R1 | Miejsce NULL zidentyfikowane | **PASS** — `useTenderPricingAuto` L63–64 |
| R2 | ROOT CAUSE sformułowany | **PASS** |
| R3 | Hipotezy 1–8 rozstrzygnięte | **PASS** |
| R4 | Zero fix / commit / push | **PASS** |
| R5 | Czekaj Owner GO BUGFIX | **STOP** |

---

## 11. STOP

```text
RCA COMPLETE
BUGFIX: BLOCKED — czekaj na Owner GO

Natychmiastowa mitigacja Owner (bez kodu):
  localStorage['kw-cost-pipeline-01']='0' + reload
```

**Koniec COST-PIPELINE-01-RCA-REGRESSION-01.**
