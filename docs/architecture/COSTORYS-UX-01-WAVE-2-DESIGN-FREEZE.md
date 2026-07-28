# COSTORYS-UX-01 — WAVE 2 DESIGN FREEZE

> **ID:** COSTORYS-UX-01-WAVE-2-DESIGN-FREEZE  
> **EPIC:** COSTORYS-UX-01 · **WAVE:** **2 — Density & Scan**  
> **STATUS:** **DESIGN FREEZE · Owner GO (architektura)** · **IMPLEMENT ZABLOKOWANY** do Owner GO IMPLEMENTATION  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **UI-only** · **#CORE-013** — zero Payroll · zero sync · zero Edge · **zero logiki Bid / AI-COST / OfferBoq engines**  
> **Wejście:** WAVE 1 **CLOSED** · [`COSTORYS-UX-01-WAVE-2-BACKLOG.md`](COSTORYS-UX-01-WAVE-2-BACKLOG.md) · [`COSTORYS-UX-01-AUDIT.md`](COSTORYS-UX-01-AUDIT.md) · [`COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md`](COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (WAVE 2):
  Gęsta lista pozycji + skan (search/sort) bez zmiany wyceny.

SLICES:
  2.1 Compact Mode + Comfort Toggle
  2.2 Collapsed Components + Inline Expand
  2.3 Search L1 ∩ filtr „Tylko do weryfikacji”
  2.4 Sort: LP · Direct · Confidence

ZACHOWAĆ Z WAVE 1:
  Sticky Offer Bar · full width · accordion · Evidence collapsed · review filter

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*brak persist LS w W2 — density/search/sort ephemeral)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (*search/sort nie w URL w W2)

Wynik: Gate GREEN (UI-only).
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE.
```

---

## 1. Cel WAVE 2

Po WAVE 1 użytkownik widzi cenę i mniej chrome. WAVE 2 ma:

1. **3×+ pozycji** w pierwszym viewportcie (Compact),  
2. **edycję komponentów bez „form hell”** (Collapsed + Inline Expand),  
3. **skan listy** Search + Sort na tym samym pipeline co filtr review W1.

**Sukces W2 ≠** virtualizacja 500 DOM.  
**Sukces W2 =** density + scan UI-only na istniejącym `OfferBoqExplainLineCard` / component view model.

---

## 2. Architecture (zamrożona)

### 2.1 Warstwy

| Warstwa | Rola W2 | Zmiana danych? |
|---------|---------|----------------|
| Sticky Offer Bar (W1) | Bez zmian kontraktu | NIE |
| Toolbar density / search / sort | Nowy UI pod sticky | NIE (tylko widok) |
| Lista linii | Compact lub Comfort | NIE |
| Expand linii | Collapsed component rows → inline edit | Patch/approve **reuse** istniejących handlerów |
| Accordion / Evidence (W1) | Bez zmian | NIE |

### 2.2 Reguły twarde

1. **Zero** zmian `computeTenderBidProposal` · OfferBoq pricing engines · COST-PIPELINE · parser · CATALOG-BID.  
2. `patchOfferBoqComponentInDocument` / `approveOfferBoqComponentInDocument` — **reuse**, bez nowego API.  
3. Search / sort / density / reviewOnly — **tylko widok**; reset przy `item.id`.  
4. **Jeden** sticky cenowy (W1). Toolbar search/sort: **w flow** pod sticky **albo** sticky **razem** z Offer Bar jako jedna belka — **zakaz** dwóch konkurujących sticky pasków.  
5. **Drawer / bottom sheet = OOS** — wyłącznie **Inline Expand**.  
6. Kolejność slice w IMPLEMENT: **2.1 → 2.2 → 2.3 → 2.4** (zgodnie z backlogiem).

### 2.3 Density default

| Warunek | Default density |
|---------|-----------------|
| `view.lines.length >= 50` | **Compact** |
| `view.lines.length < 50` | **Comfort** (obecne karty) |
| User toggle | Nadpisuje default do końca sesji panelu (nie LS) |

---

## 3. Anatomia wiersza Compact (Slice 2.1) — ZAMROŻONA

### 3.1 Layout (jedna linia, desktop)

```text
┌─ Compact Line Row (min-h ≥ 44px touch) ──────────────────────────────────────┐
│ [▸] │ LP │ Opis (clamp 1) ……… │ Direct PLN │ ★conf │ [rev?] │ n komp │     │
└─────┴────┴────────────────────┴────────────┴───────┴────────┴────────┘
  (1)   (2)  (3)                  (4)          (5)     (6)      (7)
```

| # | Element | Źródło (read-only display) | Reguły |
|---|---------|----------------------------|--------|
| **1** | Chevron | lokalny `open` | `aria-expanded`; cały wiersz klikalny **lub** chevron+opis (min target 44px) |
| **2** | LP | `line.lp` | `font-mono`; szerokość stała ~3–4ch |
| **3** | Opis | `line.description` | `line-clamp-1`; `title` = pełny opis |
| **4** | Direct | `line.lineDirectDisplay` | `tabular-nums`; align right |
| **5** | Confidence | `line.confidenceBadge` | REUSE badge W1 (emoji/label); compact size |
| **6** | Review flag | `line.requiresUserReview` | Opcjonalny chip amber / ikona; ukryty gdy false |
| **7** | Component count | `line.componentCount` | np. `3` lub `3 komp.`; muted |

**Nie w Compact row (tylko po expand):** strategia wyceny · dekompozycja · „Dlaczego AI…” · pełne komponenty.

### 3.2 Comfort (toggle)

= obecny `LineExplainCard` header (multi-line opis, typ, komponenty, direct) — **bez regresji** względem W1.

### 3.3 Comfort Toggle UI

| Element | Spec |
|---------|------|
| Label | `Zwarty` / `Komfort` (lub ikony density) |
| Pozycja | Toolbar pod Sticky Offer Bar, obok Search/Sort |
| `data-*` | `data-offer-boq-density="compact\|comfort"` |

---

## 4. Anatomia Component Row (Slice 2.2) — ZAMROŻONA

Gdy linia **expanded**, lista komponentów **nie** renderuje od razu pełnego `EditableComponentCard`.

### 4.1 Collapsed Component Row (default)

```text
┌─ Component Row (collapsed) ─────────────────────────────────────────────────┐
│ [status] │ Nazwa ……… │ Kat │ qty+jm │ Cena/j │ Total │ ★ │ [✓ Zatwierdź] │ [Edytuj] │
└──────────┴───────────┴─────┴────────┴────────┴───────┴───┴────────────────┴─────────┘
```

| Element | Źródło | Reguły |
|---------|--------|--------|
| Edit status | `component.editStatus` / label | Badge kompaktowy (jak dziś) |
| Nazwa | `component.namePl` | `line-clamp-1` |
| Kategoria | label z `OFFER_BOQ_PRICED_CATEGORY_LABELS_PL` | skrót OK |
| qty + jm | `quantity` · `unit` | tabular |
| Cena/j | `unitPricePln` | tabular; „—” gdy null |
| Total | `component.totalDisplay` | tabular bold |
| Confidence | `component.confidenceBadge` | compact |
| Zatwierdź | `onApprove` | **1 klik bez expand** (REUSE) |
| Edytuj | lokalny `editingComponentId` | otwiera Inline Expand |

Opcjonalne chipy (jeśli miejsce): wiedza firmy / controlled market — **max 1** ikona; szczegóły w expand.

### 4.2 Inline Expand (edycja)

```text
┌─ Component Row (expanded inline) ───────────────────────────────────────────┐
│ (ten sam nagłówek collapsed)                                                │
│ ┌─ Edit panel (pod wierszem, w obrębie linii) ────────────────────────────┐ │
│ │ Pola jak obecny EditableComponentCard:                                  │ │
│ │   nazwa · kategoria · origin · qty · unit · unitPrice · review checkbox │ │
│ │   rationale (read) · company knowledge explain (read)                   │ │
│ │ [Zamknij edycję]                                                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Reguła | Wartość |
|--------|---------|
| Max jednocześnie otwartych edit | **1** komponent na linię (lub 1 globalnie w panelu) |
| Pattern | **Inline** pod wierszem — **nie** Drawer |
| Handlery | `onPatch` / `onApprove` bez zmian kontraktu |
| Zamknięcie | „Zamknij edycję” · toggle Edytuj · zmiana linii |

### 4.3 Meta linii po expand (Comfort/Compact wspólne)

Po otwarciu linii (przed komponentami) — **skrócona** sekcja meta:

- Strategia + dekompozycja (1–2 linie)  
- „Dlaczego AI…” — **domyślnie collapsed** (`▸ Uzasadnienie AI`) w W2  

(żeby expand Compact nie wracał do pełnego chrome W1).

---

## 5. Pipeline widoku (zamrożony)

```text
view.lines  (OfferBoqExplainLineCard[] — SSOT explainability, bez mutacji)
    │
    ▼
① reviewOnly filter     (WAVE 1 — requiresUserReview === true)
    │
    ▼
② search filter         (WAVE 2.3 — query na lp + description, case-insensitive)
    │
    ▼
③ sort                  (WAVE 2.4 — LP | direct | confidence)
    │
    ▼
④ render                (Compact rows lub Comfort cards)
```

### 5.1 Kontrakt pure helper (propozycja allowlist)

```text
buildOfferBoqVisibleLines({
  lines,
  reviewOnly: boolean,
  searchQuery: string,
  sortKey: "lp" | "direct" | "confidence",
  sortDir: "asc" | "desc",
}): OfferBoqExplainLineCard[]
```

- **Pure** · bez side effects · testowalny.  
- **Nie** mutuje `lines` / `OfferBoqDocument`.  
- Kolejność zawsze: **review → search → sort** (nie sort przed search).

### 5.2 Search (Slice 2.3)

| Pole | Spec |
|------|------|
| Scope | Tylko L1 OfferBoq lines — **nie** BOQ Explorer L0 |
| Pola | `lp`, `description` (trim, case-fold; PL diakrytyki: preferuj istniejący fold jeśli łatwy REUSE, inaczej `toLowerCase`) |
| UI | Input w toolbarze; placeholder „Szukaj pozycji (LP, opis)…” |
| Integracja review | `visible = reviewOnly ∩ search` — oba chipy widoczne gdy aktywne |
| Empty | „Brak pozycji dla filtra / wyszukiwania.” |
| Reset | `item.id` change → `searchQuery = ""` |

### 5.3 Sort (Slice 2.4)

| `sortKey` | Porównanie |
|-----------|------------|
| `lp` | natural / localeCompare na `line.lp` |
| `direct` | numeryczny z `line.lineDirectPln` **jeśli dostępne w view model**; inaczej parse z display **tylko w helperze widoku** — preferuj pole liczbowe już w `OfferBoqExplainLineCard` jeśli istnieje; **zakaz** zapisu do dokumentu |
| `confidence` | kolejność: low &lt; medium/review &lt; high (lub odwrotnie przy desc) wg `confidenceBadge.status` |

Default sort: **`lp` asc** (stabilny jak dziś).  
UI: select lub segment „LP · Direct · Pewność” + kierunek.

**Uwaga:** jeśli `lineDirectPln` nie jest w typie publicznym karty — DF dopuszcza **read** z istniejącego pola numerycznego w explainability **albo** parse display w pure helper; **nie** dodawać nowego silnika wyceny.

---

## 6. ASCII layout (TO-BE WAVE 2)

### 6.1 Desktop 1920

```text
|==== full width (W1) ========================================================|
| ▓ STICKY (W1) Rekomendacja · Direct · Review · [Tylko do weryfikacji]      │
|-----------------------------------------------------------------------------|
| Toolbar: [Szukaj…………] [LP▾] [Direct] [Pewność]   [Zwarty|Komfort]         │
|-----------------------------------------------------------------------------|
| ▸ Szczegóły wyceny (W1 accordion)                                           │
|-----------------------------------------------------------------------------|
| Pozycje (Compact)                                                           │
| ▸ 01 │ Malowanie ścian…     │ 12 400 │ 🟢 │     │ 2 │                       │
| ▾ 02 │ Gładź gipsowa…       │  8 200 │ 🟡 │ rev │ 3 │                       │
|   ├─ ▸ Uzasadnienie AI                                                      │
|   ├─ [ok] Farba… │ mat │ 120 m2 │ 18 │ 2160 │ 🟢 │ [✓] [Edytuj]            │
|   └─ [..] Robocizna… │ … │ [Edytuj] → inline fields…                        │
| ▸ 03 │ …                                                                    │
|-----------------------------------------------------------------------------|
| ▸ Evidence ATH (W1 collapsed)                                               │
```

### 6.2 Desktop 1280

Jak 1920; toolbar może zawijać 2 linie (search full width, sort+density w drugim rzędzie). Compact kolumny: opis flex; Direct+conf zawsze widoczne.

### 6.3 Mobile (&lt;768)

```text
| ▓ Sticky: Rekomendacja · Review · [filtr]     │
| [Szukaj…………………………………]                     │
| [Sort▾] [Zwarty|Komfort]                      │
| ▸ 01 Opis…     12400  🟢  ▸                   │
| ▾ 02 Opis…      8200  🟡  ▾                   │
|   [Component rows stacked / wrap]             │
|   [Edytuj] → inline panel full width          │
```

Touch: wiersz Compact i przyciski ≥44px; brak hover-only.

---

## 7. Desktop

| Temat | Spec W2 |
|-------|---------|
| Density | Default Compact przy ≥50 linii |
| Sticky | Zachować W1; toolbar nie walczy o sticky |
| Full width | Zachować W1 |
| Compact columns | Opis elastyczny; Direct/conf nie ucinać poniżej 1280 |
| Inline edit | Max szerokość kontenera linii; grid pól jak dziś `sm:grid-cols-2` |
| AC viewport | ≥**3×** pozycji widocznych vs Comfort na tym samym viewport 1280×800 (mierzone na mock ≥50 linii) |

---

## 8. Mobile

| Temat | Spec W2 |
|-------|---------|
| Compact | Domyślnie przy ≥50; opis clamp 1; meta w 2. linii OK jeśli brak miejsca |
| Component row | Może wrap do 2 linii; Approve + Edytuj zawsze widoczne |
| Inline expand | Full width pod wierszem — **nie** Drawer |
| Search | Full width; font ≥16px unikając zoom iOS (wzorzec inputów app) |
| Regresja W1 | Sticky + filtr review działają |

---

## 9. Acceptance Criteria

| ID | Kryterium | Slice |
|----|-----------|-------|
| **AC-D1** | Default Compact gdy `lines.length >= 50`; Comfort gdy &lt;50 | 2.1 |
| **AC-D2** | Toggle Comfort ↔ Compact działa bez reload; persist tylko w stanie React | 2.1 |
| **AC-D3** | Compact row zawiera: chevron · LP · opis clamp1 · direct · confidence · (opc.) review · count | 2.1 |
| **AC-D4** | ≥3× pozycji w pierwszym viewport vs Comfort (fixture ≥50) | 2.1 |
| **AC-C1** | Po expand linii komponenty startują jako Collapsed rows (nie pełny form) | 2.2 |
| **AC-C2** | „Edytuj” otwiera Inline Expand; max 1 aktywna edycja | 2.2 |
| **AC-C3** | „Zatwierdź” na collapsed row woła istniejący approve **bez** otwarcia form | 2.2 |
| **AC-C4** | Patch w inline używa istniejącego `onPatch` — dokument zmienia się jak dziś | 2.2 |
| **AC-S1** | Search filtruje po `lp` + `description`; case-insensitive | 2.3 |
| **AC-S2** | Pipeline: reviewOnly → search → sort (kolejność zamrożona) | 2.3/2.4 |
| **AC-S3** | Search + reviewOnly łącznie; empty state gdy 0 | 2.3 |
| **AC-S4** | Search nie mutuje `OfferBoqDocument` / `view.lines` źródłowych | 2.3 |
| **AC-O1** | Sort LP / Direct / Confidence + kierunek; default LP asc | 2.4 |
| **AC-O2** | Sort tylko widok; reset przy `item.id` | 2.4 |
| **AC-W1** | Sticky Offer Bar + full width + accordion + Evidence — bez regresji W1 | all |
| **AC-X1** | Brak Drawer / virtualization / dense table w diff | all |
| **AC-X2** | Brak zmian plików silników Bid / AI Cost / COST-PIPELINE / parser | all |
| **AC-B1** | `npm run build` PASS | all |
| **AC-T1** | Pure testy pipeline review→search→sort | 2.3/2.4 |

---

## 10. Allowlist (IMPLEMENT — po Owner GO)

| Plik / obszar | Zakres |
|---------------|--------|
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Density · toolbar · render Compact · collapsed components · wire pipeline |
| `src/app/kosztorys/OfferBoqStickySummaryBar.tsx` | Ewentualnie tylko jeśli wspólny toolbar — **preferuj nie psuć** W1 |
| `src/app/kosztorys/offer-boq-ux-wave1.ts` **lub** nowy `offer-boq-ux-wave2.ts` | Pure: `buildOfferBoqVisibleLines`, density default helper |
| Opcjonalnie: `OfferBoqCompactLineRow.tsx` · `OfferBoqCollapsedComponentRow.tsx` | Presentational UI-only |
| `scripts/test-costorys-ux-01-wave2.mjs` | AC pipeline + density default |
| Changelog + docs closeout | wersja UI przy release |

**Zakaz allowlist:** `tenders-bid-calculator.ts` · `tender-offer-boq.ts` (model/engines poza display) · `tender-offer-boq-pricing-engine.ts` (logika cen) · `useTenderPricingAuto` · cloud-sync · Edge · parser · drawer libs.

\*Dozwolony **read** typów/`presentOfferBoqExplainabilityView` bez zmiany semantyki wyceny.

---

## 11. Out of Scope (WAVE 2 — twarde)

| Obszar | Status |
|--------|--------|
| Virtualization | **OOS → Wave 3** |
| Dense Table / AG Grid | **OOS → Wave 3** |
| Pin / resize columns | **OOS → Wave 3** |
| **Drawer / bottom sheet** | **OOS** (Inline Expand only) |
| AI Cost engines / OfferBoq model rewrite | **OOS** |
| Bid Proposal / Kp / marża | **OOS** |
| Parser / dossier / CATALOG-BID | **OOS** |
| COST-PIPELINE orchestration | **OOS** |
| Search w BOQ Evidence L0 | **OOS** (osobny tor) |
| Persist LS density/search/sort | **OOS** |
| URL query sync | **OOS** |
| Zmiana API patch/approve | **OOS** |

---

## 12. Rollback

| Scenariusz | Akcja |
|------------|-------|
| Compact nieczytelny | Default Comfort; lub revert Slice 2.1 |
| Inline edit psuje approve | Revert 2.2; zostaw Compact |
| Search/sort mylą | Default off query + LP asc; revert 2.3/2.4 |
| Regresja sticky / Bid display | Natychmiastowy revert całego W2 bundle |
| Regresja PLN oferty | Revert — **nie** „naprawiać” silnika Bid |

Rollback = **git revert** slice’ów W2. Preferowane osobne commity per slice 2.1→2.4 dla łatwego revertu częściowego.

---

## 13. Kolejność IMPLEMENT (po Owner GO)

| Krok | Slice | Deliverable |
|------|-------|-------------|
| M0 | — | Owner GO IMPLEMENTATION |
| M1 | **2.1** | Compact + Comfort toggle + test density |
| M2 | **2.2** | Collapsed component rows + inline expand |
| M3 | **2.3** | Search + integracja reviewOnly w `buildOfferBoqVisibleLines` |
| M4 | **2.4** | Sort LP/Direct/Confidence |
| M5 | — | Build · changelog · PV |

Każdy slice: build PASS + relevant test przed następnym (thin slice).

---

## 14. Ryzyka (skrót DF)

| Ryzyko | Mitygacja |
|--------|-----------|
| Drugi sticky toolbar | §2.2 #4 |
| Parse Direct do sortu kruchy | Preferuj pole numeryczne; testy |
| Utrata discoverability „Dlaczego AI” | Accordion w expand linii |
| Scope creep Drawer | OOS twarde |
| Scope creep Virtualization | OOS → W3 |

---

## 15. STOP

```text
DESIGN FREEZE COMPLETE — COSTORYS-UX-01 WAVE 2
Dokument: docs/architecture/COSTORYS-UX-01-WAVE-2-DESIGN-FREEZE.md

Slices zamrożone: 2.1 Compact · 2.2 Collapsed+Inline · 2.3 Search · 2.4 Sort
Pipeline: review → search → sort → render
Drawer / Virtualization / Bid / AI Cost = OOS

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
