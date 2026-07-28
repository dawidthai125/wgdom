# COSTORYS-UX-01 — UX Audit (Kosztorys ofertowy · Desktop)

> **ID:** COSTORYS-UX-01  
> **PHASE:** UX AUDIT · **MODE:** RCA + UX (bez implementacji)  
> **OWNER GO:** TAK  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Kontekst:** CATALOG-BID-01 **COMPLETE** · Bid / AI Cost / oferta działają — **ten audyt NIE dotyczy logiki wyceny**  
> **Zakres ekranu:** zakładka **Kosztorysy** · L1 `OfferBoqCostIntelligencePanel` (+ L0 Evidence / BOQ Explorer jako kontekst)  
> **Kod (read-only):** `TenderDetailPage.tsx` · `TenderKosztorysWorkspace.tsx` · `OfferBoqCostIntelligencePanel.tsx` · `KosztorysBoqExplorerSection.tsx`

```text
════════════════════════════════════════════════════════
WERDYKT SKRÓT:
  Layout desktop jest zoptymalizowany pod „wyjaśnialność AI”,
  nie pod przeglądanie 150–500 pozycji oferty.

  Największy gap UX: niska gęstość + brak sticky ceny oferty
  + kontener max-w-7xl + komponenty jako pełne formularze.

  Rekomendacja: EPIC COSTORYS-UX w 3 falach (W1 quick wins →
  W2 density/table → W3 virtualization/pro tools).
════════════════════════════════════════════════════════
```

**Bez kodu · bez commit · bez push.**

---

## 1. Mapa ekranu (stan AS-IS)

```text
TenderDetailPage
└─ scroll container (mobile-view-scroll)
   └─ max-w-7xl mx-auto px-4/6     ← kontener ~1280px
      └─ TenderKosztorysWorkspace
         ├─ ProcessStatusBar
         ├─ Bridge → Ceny
         ├─ ★ L1 OfferBoqCostIntelligencePanel   ← KOSZTORYS OFERTOWY
         │    ├─ Title + intro
         │    ├─ KPI grid (6 kart)
         │    ├─ Baza wiedzy firmy (4 KPI + lista)
         │    ├─ Wpływ AI na ofertę
         │    ├─ Podsumowanie oferty (Bid) + cost stack
         │    ├─ Gotowość oferty
         │    ├─ Ocena jakości AI + rekomendacje
         │    └─ Pozycje: LineExplainCard[] (accordion)
         │         └─ open → EditableComponentCard[] (pełny form)
         └─ L0 Evidence (ATH / KOSZTORYS PRO / BOQ Explorer)
              └─ tabela ATH (sticky search) · preview 20 / „pokaż wszystkie”
```

### 1.1 Hierarchy (AS-IS)

| Warstwa | Treść | Priorytet wizualny dziś | Priorytet biznesowy |
|---------|-------|-------------------------|---------------------|
| A | Meta procesu / bridge | średni | niski |
| B | KPI AI + wiedza firmy | **wysoki** (dużo miejsca) | średni |
| C | Bid / cena rekomendowana | średni (w środku scrolla) | **najwyższy** |
| D | Jakość AI / rekomendacje | wysoki | średni (przed ofertą) |
| E | Lista pozycji + komponenty | niski (daleko w dół) | **najwyższy przy pracy** |
| F | Evidence ATH | secondary (OK) | dowód |

**Problem hierarchy:** cena oferty i lista pozycji toną pod stosem kart explainability.

---

## 2. Ocena UX (desktop)

Skala 1–5 (5 = dobre).

| Wymiar | Ocena | Komentarz |
|--------|-------|-----------|
| **Hierarchy** | **2** | Explainability przed operacją; Bid nie jest „kotwicą” viewportu |
| **Spacing** | **2** | `space-y-4` + karty `p-3/p-4` + wiele sekcji → duża pustka pionowa |
| **Density** | **1–2** | Komponent = pełny formularz; pozycja = szeroka karta; mało wierszy / viewport |
| **Typography** | **3** | TEUX tokens spójne; caption/meta OK; brak trybu compact |
| **Czytelność @150–500** | **1** | Scroll maraton; utrata kontekstu ceny; brak wirtualizacji listy OfferBoq |
| **Workflow** | **2** | CTA Outcome → OfferBoq OK; potem użytkownik tonie w KPI zanim dojdzie do pozycji |
| **Ergonomia** | **2** | Szerokość ograniczona `max-w-7xl`; brak sticky Bid; edycja komponentu zbyt wysoka |
| **Mobile (impact)** | **3** | Karty mobile już istnieją (BOQ); OfferBoq accordion lepiej na wąsko niż tabela — ale gęstość też zła |

**Średnia desktop operacyjny:** ~**2.1 / 5** — funkcjonalnie kompletny, UX operacyjny dla dużych BOQ **niedostateczny**.

---

## 3. Obserwacje Ownera → potwierdzenie w kodzie

| # | Obserwacja Ownera | Potwierdzenie | Kotwica |
|---|-------------------|---------------|---------|
| **1** | Tabela/szczegóły zbyt wąskie, puste boki | **TAK** | `TenderDetailPage`: `max-w-7xl mx-auto` — na ≥1600–1920px duże gutters |
| **2** | Duże kosztorysy = długi scroll | **TAK** | 5–6 bloków summary **przed** listą + N kart linii; L0 Evidence poniżej |
| **3** | Lista komponentów zbyt wysoka | **TAK** | `EditableComponentCard`: badge row + 6–8 pól form + rationale + checkbox — zawsze pełna wysokość gdy linia otwarta |
| **4** | Podsumowanie oferty znika po scrollu | **TAK** | `OfferSummarySection` w flow dokumentu; **brak** sticky bar dla Bid |
| **5** | Czytelność 150–500 pozycji | **TAK** | OfferBoq = lista kart (nie dense table); brak virtual list; BOQ Evidence: „pokaż wszystkie” bez virtualizacji |

---

## 4. Odpowiedzi na pytania audytu

### 4.1 Czy szczegóły → FULL WIDTH?

**TAK (rekomendacja: conditional full-bleed na zakładce Kosztorysy).**

| Opcja | Werdykt |
|-------|---------|
| Zostawić `max-w-7xl` | NIE dla operacji 150+ pozycji |
| `max-w-none` / `max-w-[1600px]` tylko na `kosztorys` | **TAK — Wave 1** |
| Pełny bleed edge-to-edge z paddingiem 16–24px | **TAK** na desktop ≥1280 |

Uzasadnienie: tabela z 8–10 kolumnami i opisem potrzebuje szerokości; gutters `max-w-7xl` marnują surface.

### 4.2 Compact Mode dla listy pozycji?

**TAK — obowiązkowy dla OfferBoq lines.**

| Tryb | Zachowanie |
|------|------------|
| **Comfort** (dziś) | Karty + pełne wyjaśnienia |
| **Compact** (docelowy default ≥50 pozycji) | 1 wiersz: LP · opis clamp · qty · direct · confidence · chevron |
| **Focus edit** | Expand jednej pozycji; reszta compact |

### 4.3 Komponenty: Collapsed → Expandable?

**TAK — domyślnie collapsed (summary chip), expand on demand.**

Dziś: linia jest accordion (OK), ale **komponenty wewnątrz = zawsze pełny form**.  
Docelowo:

```text
[Linia collapsed] → expand
  [Komponent row compact: nazwa · kat · qty · cena · total · ✓]
      → click → panel edycji (drawer / inline expand)
```

### 4.4 Sticky Summary Bar?

**TAK — P0 UX.**

Zawartość minimalna:

```text
| Direct XXX zł | Rekomendacja YYY zł | Do weryfikacji N | [Filtr: review] |
```

Sticky w obrębie scrolla zakładki (pod chrome tabów), nie całego window jeśli koliduje z Process Strip — **jeden** sticky poziom (nie dwa konkurujące).

### 4.5 Tabela: resize / sort / filter / pin / virtualization?

| Feature | OfferBoq (L1) | BOQ Evidence (L0) | Priorytet |
|---------|---------------|-------------------|-----------|
| **Filters** | Już częściowo (review / search — rozszerzyć) | Już category + search | W1–W2 |
| **Sorting** | Po direct / confidence / LP | Po wartości / LP | W2 |
| **Virtualization** | **TAK krytyczne** @150+ | **TAK** przy „pokaż wszystkie” | W2–W3 |
| **Pin columns** | LP + Direct (sticky cols) | LP + Opis | W3 |
| **Resize columns** | Nice-to-have | Nice-to-have | W3 |
| Dense table vs cards | **Hybrid:** compact rows + expand | Table OK | W2 |

### 4.6 Skala pozycji — czy układ jest optymalny?

| N pozycji | AS-IS | Werdykt |
|-----------|-------|---------|
| **~100** | Uciążliwy, ale używalny | **Marginal** — Compact + sticky wystarczy |
| **~300** | Scroll + utrata Bid | **Niewystarczający** |
| **~500** | Cap snapshot / lista kart | **Fail operacyjny** bez virtualizacji + compact |
| **~1000** | Poza komfortem UI + limity snapshot (500) | **Wymaga** table + virtual + filtry; ewentualnie paginacja sekcji |

---

## 5. Największe problemy (ranking)

| Rank | Problem | Impact | Effort | Wave |
|------|---------|--------|--------|------|
| **P1** | Brak **Sticky Offer Summary** (cena znika) | Krytyczny workflow | Niski | **W1** |
| **P2** | **Niska gęstość** komponentów (pełny form zawsze) | Krytyczny @N linii | Średni | **W1–W2** |
| **P3** | Kontener **`max-w-7xl`** → puste boki | Wysoki (desktop wide) | Niski | **W1** |
| **P4** | **Stos sekcji explainability** przed listą (KPI×N) | Wysoki scroll | Średni | **W1** |
| **P5** | Brak **Compact Mode** listy pozycji | Wysoki | Średni | **W2** |
| **P6** | Brak **virtualizacji** listy OfferBoq / „wszystkie” BOQ | Wysoki @300+ | Wysoki | **W2–W3** |
| **P7** | Podwójna narracja L1+L0 (AI Cost + PRO + Explorer) bez clear progressive disclosure | Średni | Średni | **W2** |
| **P8** | Brak sort / pin / resize w dense table | Średni (pro) | Wysoki | **W3** |

---

## 6. Makiety ASCII

### 6.1 AS-IS (desktop wide)

```text
|← gutter →|======== max-w-7xl (~1280) ========|← gutter →|
           | Process · Bridge                    |
           | [KPI][KPI][KPI][KPI][KPI][KPI]     |
           | [ Wiedza firmy .............. ]     |
           | [ Wpływ AI .................. ]     |
           | [ Podsumowanie oferty ....... ]     |  ← znika po scroll
           | [ Gotowość ][ Jakość AI ..... ]     |
           |                                     |
           | ▼ Pozycja 1 (karta ~80–120px)       |
           | ▼ Pozycja 2                         |
           | ... scroll ...                      |
           | (otwarta) komponent FORM ~280px+    |
           | ...                                 |
           | ─ Evidence ATH / BOQ table ─        |
```

### 6.2 TO-BE Wave 1 (quick wins)

```text
|==== full width tab Kosztorysy (pad 16–24) ============|
| [STICKY] Direct · Rekomendacja · Review N · Filtr     |
|-------------------------------------------------------|
| Summary (collapsed by default) ▸ KPI / Jakość / Wiedza|
|-------------------------------------------------------|
| Pozycje (compact rows)                                |
| LP | Opis…              | Direct | ★ | ▸              |
| 01 | Malowanie ścian…   | 12 400 | 🟢 | ▸              |
| 02 | Gładź…             |  8 200 | 🟡 | ▾              |
|    └─ Komponenty (compact chips) → [Edytuj]           |
| Evidence ATH  [▸ zwinięte domyślnie]                  |
```

### 6.3 TO-BE Wave 2–3 (operacyjny)

```text
| STICKY SUMMARY BAR                                    |
|-------------------------------------------------------|
| TOOLBAR: Search · Filter · Sort · Compact|Comfort     |
|-------------------------------------------------------|
| VIRTUAL TABLE / ROW LIST (sticky: LP | Direct)        |
| LP | Opis (flex)     | jm | qty | Direct | Conf | ··· |
| ... only visible rows rendered ...                    |
|-------------------------------------------------------|
| DRAWER (right): edycja komponentów wybranej pozycji   |
```

---

## 7. Propozycja nowego layoutu (architektura UX)

### 7.1 Zasady zamrożone (propozycja DF-ready)

1. **Outcome price always visible** — sticky bar z `recommendedBidPln` + direct.  
2. **Scan first, edit second** — lista dense; edycja w expand/drawer.  
3. **Explainability on demand** — jakość AI / wiedza / audit trail w accordion „Szczegóły wyceny”, nie nad listą.  
4. **Width follows work** — zakładka Kosztorysy ≥ pełna szerokość content area (bez sztucznego `max-w-7xl`).  
5. **One primary sticky** — albo summary bar, albo table header — nie dwa poziomy walczące.  
6. **L0 Evidence secondary** — zwinięte domyślnie po sukcesie L1.  
7. **Zero zmiana logiki Bid / AI Cost / CATALOG-BID** — tylko prezentacja.

### 7.2 Struktura docelowa

```text
┌─ Sticky Offer Bar (L2 Bid summary) ───────────────────┐
├─ Toolbar (search / filters / density) ────────────────┤
├─ Primary: Offer lines (compact / virtual) ────────────┤
│     expand → components compact → edit drawer         │
├─ Secondary accordion: Explainability & Knowledge ─────┤
└─ Tertiary: Evidence ATH / BOQ Explorer ───────────────┘
```

---

## 8. Desktop impact

| Zmiana | Efekt |
|--------|-------|
| Full width | Więcej kolumn widocznych; mniej horizontal scroll w BOQ |
| Sticky Bid | Stały kontekst ceny przy weryfikacji pozycji |
| Compact + collapsed components | 3–5× więcej pozycji na viewport |
| Virtualization | Płynność @300–500 |
| Drawer edit | Mniej „skakania” wysokości listy przy edycji |

**Ryzyko desktop:** zbyt agresywne ukrycie explainability → spadek zaufania do AI. Mitygacja: łatwy accordion + badge confidence w wierszu.

---

## 9. Mobile impact

| Temat | Ocena |
|-------|-------|
| Sticky summary | **Pożądany** (mały chip: cena + review count) |
| Full width | N/A (już full) |
| Compact rows | **Krytyczne** — karty `TenderMobileRowCard` też za wysokie przy N dużym |
| Drawer edit | Naturalny pattern mobile (bottom sheet) |
| Virtualization | Pożądana, ale Wave 3; Wave 1 nie psuć touch 44px |
| L0 Evidence | Zostawić collapsible — mniej scrollu |

**Zasada:** Wave 1–2 desktop-first, ale **nie regresja** mobile (min touch, bez hover-only).

---

## 10. Quick wins (bez zmiany silników)

| ID | Quick win | Effort | Wartość |
|----|-----------|--------|---------|
| **QW-1** | Sticky bar: Direct + Rekomendacja + Review | S | ★★★★★ |
| **QW-2** | `max-w-7xl` → full width na tab `kosztorys` | S | ★★★★ |
| **QW-3** | Zwiń domyślnie: Wiedza / Jakość AI / Bid impact / Readiness w jeden accordion | S | ★★★★ |
| **QW-4** | Komponenty: widok 1-linijkowy + „Edytuj” | M | ★★★★★ |
| **QW-5** | Evidence L0 collapsed by default gdy OfferBoq available | S | ★★★ |
| **QW-6** | Filtr szybki: „Tylko do weryfikacji” nad listą | S | ★★★★ |

---

## 11. EPIC proposal — COSTORYS-UX

```text
EPIC: COSTORYS-UX
Cel: Desktop operacyjny dla 100–500 pozycji kosztorysu ofertowego
Bez: zmiany Bid calculator · AI-COST engines · parser · Edge · sync
Wejście: Owner GO + Design Freeze per Wave
```

### Wave 1 — Visibility & Width (P0)

- Sticky Offer Summary Bar  
- Full-width tab Kosztorysy  
- Progressive disclosure explainability (accordion)  
- Evidence collapsed when L1 ready  
- Quick filter „Do weryfikacji”

**AC W1:** cena rekomendowana widoczna bez scroll-back; ≥30% mniej wysokości chrome nad listą; brak regresji Bid PLN.

### Wave 2 — Density & Scan (P1)

- Compact Mode (default ≥50 linii)  
- Components collapsed → expandable / drawer  
- Sort by LP / direct / confidence  
- Search scoped to lines  
- Comfort mode zachowany

**AC W2:** ≥3× więcej pozycji w pierwszym viewportcie vs AS-IS; edycja nie rozpycha całej listy.

### Wave 3 — Scale & Pro Table (P2)

- Virtualization OfferBoq lines (+ BOQ „pokaż wszystkie”)  
- Optional dense data-table mode  
- Pin LP + Direct  
- Column resize (opcjonalnie)  
- Performance budget @500 rows

**AC W3:** 500 pozycji — scroll 60fps target; memory bez renderu 500 DOM kart naraz.

---

## 12. Plan wdrożenia (etapy)

```text
WAVE 1 ─── Quick UX (1 thin slice)
  DF → IMPLEMENT → smoke visual desktop 1280/1920 → PV
       │
WAVE 2 ─── Density (po Owner GO)
  DF density · drawer pattern · tests interakcji
       │
WAVE 3 ─── Scale
  DF virtualization · allowlist lib · perf harness
```

| Wave | Zależności | Nie mieszać |
|------|------------|-------------|
| W1 | Brak (UI-only) | AI-COST rewrite |
| W2 | W1 sticky/width | Zmiana modelu OfferBoq |
| W3 | W2 compact row model | Payroll / sync |

---

## 13. Poza zakresem tego audytu

- Logika `computeTenderBidProposal` / CATALOG-BID / COST-PIPELINE  
- Parser ATH / PDF  
- Zmiana limitu 500 snapshot  
- Redesign całego Tender Hub  
- Implementacja (ten dokument = AUDIT ONLY)

---

## 14. Rekomendowana architektura UX (STOP)

```text
REKOMENDACJA WŁAŚCICIELA (do akceptacji):

1. Sticky Offer Bar = SSOT widoczności ceny (L2) podczas pracy na L1.
2. Full width na zakładce Kosztorysy.
3. Lista pozycji Compact-first; komponenty collapsed.
4. Explainability schowana pod accordion.
5. Virtualization dopiero Wave 3 (po density).
6. Start: WAVE 1 po osobnym DESIGN FREEZE + Owner GO IMPLEMENTATION.

NIE implementować z tego audytu.
```

---

## 15. STOP

```text
UX AUDIT COMPLETE — COSTORYS-UX-01
Dokument: docs/architecture/COSTORYS-UX-01-AUDIT.md

Bez kodu.
Bez commit.
Bez push.

Czekam na Owner GO → Design Freeze WAVE 1 (lub decyzja zakresu).
```
