# COSTORYS-UX-01 — WAVE 1 DESIGN FREEZE

> **ID:** COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE  
> **EPIC:** COSTORYS-UX-01 · **WAVE:** **1 — Quick Wins**  
> **STATUS:** **DESIGN FREEZE · Owner GO** · **IMPLEMENT COMPLETE** (UI **2.65.69**) · patrz [`COSTORYS-UX-01-WAVE-1-CLOSEOUT.md`](COSTORYS-UX-01-WAVE-1-CLOSEOUT.md)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **UI-only** · **#CORE-013** — zero Payroll · zero sync merge · zero Edge · **zero logiki Bid/AI-COST**  
> **Wejście:** [`COSTORYS-UX-01-AUDIT.md`](COSTORYS-UX-01-AUDIT.md) · Owner zaakceptował kierunek  
> **Powiązane CLOSED (nie ruszać):** CATALOG-BID-01 · COST-PIPELINE-01 · AI-COST-01 FROZEN  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (WAVE 1):
  Widoczność ceny oferty + szerokość + mniej chrome
  przed listą pozycji. Zero Compact / Table / Virtual.

ZAMROŻONE W WAVE 1:
  1) Sticky Offer Summary Bar
  2) Full Width zakładka Kosztorysy
  3) Accordion: Jakość AI · Wiedza · Explainability · Readiness
  4) Evidence L0 domyślnie zwinięte (gdy L1 dostępne)
  5) Filtr „Tylko do weryfikacji”

IMPLEMENT: COMPLETE (2.65.69) — patrz CLOSEOUT.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*brak nowej flagi LS w W1 — stan UI ephemeral w komponencie)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE*  (*bez nowego URL; filtr nie w query)

Wynik: Gate GREEN (UI-only prezentacja).
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE.
```

\*Opcjonalny persist filtra/accordion w LS = **poza W1** (wymagałoby G2 + brief).

---

## 1. Cel WAVE 1

Skrócić dystans użytkownika do:

1. **widocznej ceny oferty** (L2 Bid summary) podczas scrolla listy L1,  
2. **pełnej szerokości** desktop przy pracy na pozycji,  
3. **krótszego chrome** nad listą (explainability schowane),  

bez zmiany sposobu liczenia oferty, bez Compact Mode i bez virtualizacji.

**Sukces W1 ≠** „czytelność 500 pozycji rozwiązana” — to Wave 2/3.  
**Sukces W1 =** cena nie znika + mniej pustki + mniej scrollu do listy + filtr review.

---

## 2. Architecture (zamrożona)

### 2.1 Warstwy (bez zmiany SSOT danych)

| Warstwa | SSOT | Rola W1 |
|---------|------|---------|
| **L2** | `TenderBidProposal` / `offerSummary` (już w explainability view) | **Sticky Offer Summary Bar** — tylko prezentacja istniejących pól |
| **L1** | `OfferBoqDocument` / lines | Lista pozycji **bez** zmiany kart/komponentów (W2) |
| **L0** | ATH / BOQ Explorer | **Collapsed by default** gdy L1 ma źródło |

### 2.2 Reguły twarde W1

1. **Zero** zmian `computeTenderBidProposal` / OfferBoq engines / CATALOG-BID / parser.  
2. Sticky bar **czyta** istniejące display fields (`directCostDisplay`, `recommendedBidDisplay`, `reviewRequiredCount`) — **nie** przelicza.  
3. **Jeden** sticky poziom w scrollu zakładki: **Offer Summary Bar** (nie dublować sticky z Process Strip jako drugi „cenowy” pasek).  
4. Full width **tylko** gdy `activeTab === "kosztorys"` — inne taby bez zmian (`max-w-7xl` zostaje).  
5. Accordion sekcji explainability: **domyślnie zamknięte**; otwarcie nie zmienia danych.  
6. Filtr „Tylko do weryfikacji”: filtruje **widoczność linii** po `line.requiresUserReview === true` (już w view model) — bez zmiany flag w dokumencie przy samym włączeniu filtra.  
7. Evidence: `defaultCollapsed = hasOfferBoqSource` — użytkownik może rozwinąć.

### 2.3 Sticky hierarchy (zamrożona)

```text
Viewport admin / Tender detail
├─ App chrome / tab bar          (poza W1)
├─ Process Strip / Status        (istniejący — NIE dokładać drugiego sticky Bid)
└─ Scroll: mobile-view-scroll
   ├─ [STICKY W1] Offer Summary Bar   ← jedyny sticky cenowy w tabie
   │     sticky top w obrębie scroll container
   │     z-index poniżej modal/dropdown, powyżej treści listy
   ├─ Title L1 (opcjonalnie skrócony)
   ├─ KPI mini (6 kart) — zostają w flow LUB zwinięte w „Podsumowanie AI” (patrz §3)
   ├─ Accordion group (closed)
   ├─ Filtr chip: Tylko do weryfikacji
   ├─ Lista pozycji (AS-IS LineExplainCard)
   └─ Evidence L0 (collapsed header)
```

**Konflikt z BOQ Explorer sticky search:** po W1 Evidence jest zwinięte — sticky search L0 nie konkuruje, dopóki użytkownik nie rozwinie Evidence. Po rozwinięciu: dopuszczalne dwa sticky w długim scrollu; **nie** naprawiać w W1 (OOS).

### 2.4 Skład Sticky Offer Summary Bar

| Element | Źródło (read-only) | Wymagany |
|---------|-------------------|----------|
| Label „Oferta” / „Rekomendacja” | copy PL | TAK |
| **Cena rekomendowana** | `offerSummary.recommendedBidDisplay` (lub „—” gdy niedostępna) | TAK |
| **Koszt bezpośredni** | summary / offerSummary `directCostDisplay` | TAK |
| **Do weryfikacji** | `summary.reviewRequiredCount` | TAK |
| Chip/toggle filtra | stan UI `reviewOnly` | TAK (akcja = ten sam filtr §5) |

**Nie w sticky W1:** pełny cost stack · Kp · marża · audit trail · quality score (zostają w accordion).

Gdy Bid niedostępny: bar pokazuje Direct + „Brak rekomendowanej ceny” + review count — **bez** wymuszania wyceny.

---

## 3. ASCII layout (TO-BE WAVE 1)

### 3.1 Desktop 1920

```text
|<—— full width content (pad 16–24px, BEZ max-w-7xl) ————————————————>|
| Tab: Kosztorysy                                                       |
|═══════════════════════════════════════════════════════════════════════|
| ▓ STICKY ▓  Rekomendacja  142 300 zł  ·  Direct  98 400 zł  ·  Review 12 │
| ▓        ▓  [ Tylko do weryfikacji ]                                     │
|═══════════════════════════════════════════════════════════════════════|
| Kosztorys ofertowy (AI Cost)                                          |
| [KPI×6 — krótki rząd, bez zmiany logiki]                              |
|                                                                       |
| ▸ Szczegóły wyceny (Jakość · Wiedza · Explainability · Readiness)     |
|   (accordion CLOSED)                                                  |
|                                                                       |
| Pozycje — edycja komponentów                                          |
| ▼ / ▸ LineExplainCard … (AS-IS — bez Compact)                         |
| …                                                                     |
| ▸ Dowód / przedmiar (ATH)   [CLOSED domyślnie]                        |
```

### 3.2 Desktop 1280

```text
|<—— full width (pad 16px) ————————————————>|
| ▓ sticky: Rekomendacja · Direct · Review  |
|   [Tylko do weryfikacji]                  |
| KPI 2×3 lub 3×2 (wrap OK)                 |
| ▸ Szczegóły wyceny                        |
| Lista pozycji (karty AS-IS)               |
| ▸ Evidence                                |
```

Na 1280: sticky może zawijać 2 linie (cena + filtr) — **dozwolone**; min wysokość sticky ≤ ~88px.

### 3.3 Accordion „Szczegóły wyceny” (jedna grupa)

```text
▸ Szczegóły wyceny
  ├─ Baza wiedzy firmy          (było zawsze otwarte)
  ├─ Wpływ AI / Explainability  (BidImpact + opcjonalnie „dlaczego”)
  ├─ Gotowość oferty (Readiness)
  └─ Ocena jakości AI (+ rekomendacje)
```

**Wariant zamrożony W1:** **jeden** accordion z czterema podsekcjami wewnętrznymi **albo** cztery niezależne accordion itemy — oba OK, byle **wszystkie domyślnie closed**. Preferencja implementacyjna: **jeden** parent „Szczegóły wyceny” (mniej clutter).

KPI summary (6 kart: pozycje / review / …) — **zostają nad accordionem** (szybki skan); nie wrzucamy ich do sticky (sticky ma tylko Bid+Direct+Review).

---

## 4. Responsive behavior

| Breakpoint | Full width | Sticky | Accordion | Filtr | Evidence |
|------------|------------|--------|-----------|-------|----------|
| **≥1280 desktop** | TAK (`max-w-none` na tab kosztorys) | TAK | closed | chip | collapsed |
| **1920+** | TAK (wykorzystanie gutters) | TAK single row preferowany | closed | chip | collapsed |
| **Tablet ~768–1279** | TAK w tabie | TAK (wrap 2 linie OK) | closed | chip full width | collapsed |
| **Mobile &lt;768** | już full | **TAK** kompakt: cena + review; Direct opcjonalnie w 2. linii | closed | chip | collapsed |

### 4.1 Mobile impact (W1)

| Zmiana | Impact | Reguła |
|--------|--------|--------|
| Sticky bar | Pozytywny (cena widoczna) | Touch ≥44px na chipie filtra; nie zasłaniać CTA systemowych |
| Full width | Neutralny | Już full |
| Accordion closed | Pozytywny (mniej scrollu) | Domyślnie closed też na mobile |
| Evidence collapsed | Pozytywny | Nagłówek z `aria-expanded` |
| Filtr review | Pozytywny | Ten sam stan co desktop |

**Zakaz W1 mobile:** bottom sheet drawer · zmiana `LineExplainCard` / `EditableComponentCard` wysokości.

---

## 5. Filtr „Tylko do weryfikacji”

| Pole | Wartość zamrożona |
|------|-------------------|
| **Label PL** | `Tylko do weryfikacji` |
| **Stan** | `boolean reviewOnly` w panelu (React state) |
| **Predykat** | pokaż linię gdy `line.requiresUserReview === true` |
| **Gdy filtr ON i 0 linii** | empty state: „Brak pozycji wymagających weryfikacji.” |
| **Persist** | **NIE** (W1) — reset przy zmianie `item.id` |
| **Sticky** | Toggle dostępny też ze sticky bara (ta sama flaga) |

**Nie filtruje** komponentów wewnątrz linii osobno — filtr na poziomie **linii** OfferBoq.

---

## 6. Evidence domyślnie zwinięte

| Warunek | Zachowanie |
|---------|------------|
| `hasOfferBoqSource === true` | L0 section **collapsed** na mount / zmianę tendera |
| `hasOfferBoqSource === false` | L0 może zostać otwarte (użytkownik szuka dowodu / pusty L1) |
| User toggle | Zapamiętany tylko w sesji komponentu (nie LS) |

Nagłówek collapsed: tytuł „Dowód / przedmiar (ATH)” + krótki hint + chevron.

---

## 7. Allowlist (IMPLEMENT — po Owner GO)

| Plik | Zakres W1 |
|------|-----------|
| `src/app/TenderDetailPage.tsx` | Conditional: tab `kosztorys` → bez `max-w-7xl` (np. `max-w-none`); inne taby bez zmian |
| `src/app/TenderKosztorysWorkspace.tsx` | Evidence collapsed default; ewentualny wrapper sticky host |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Sticky bar · accordion explainability · filtr reviewOnly · kolejność sekcji |
| Opcjonalnie mały presentational component | np. `OfferBoqStickySummaryBar.tsx` w `src/app/kosztorys/` — **UI-only** |
| `scripts/test-costorys-ux-01-wave1.mjs` (lub równoważny) | AC: filtr · default accordion closed · full-width class branch |
| Changelog + docs closeout | wersja UI przy release |

**Zakaz allowlist:** `tenders-bid-calculator.ts` · `tender-offer-boq*.ts` (silniki) · `useTenderPricingAuto` · cloud-sync · Edge · parser.

---

## 8. Out of Scope (WAVE 1 — twarde)

| Obszar | Status |
|--------|--------|
| Compact Mode | **OOS → Wave 2** |
| Dense Table | **OOS → Wave 3** |
| Virtualization | **OOS → Wave 3** |
| Drawer / bottom sheet edycji | **OOS → Wave 2** |
| Pin / resize columns | **OOS → Wave 3** |
| Sortowanie | **OOS → Wave 2/3** |
| Search (nowy) | **OOS** (istniejący search BOQ L0 nietknięty poza collapse) |
| Zmiany AI Cost / OfferBoq model | **OOS** |
| Zmiany Bid Proposal / Kp / marża | **OOS** |
| Parser / dossier merge / CATALOG-BID | **OOS** |
| Zmiana wysokości `EditableComponentCard` | **OOS → Wave 2** |
| Persist LS filtra / accordion | **OOS** |
| Zmiana `max-w-7xl` na innych tabach | **OOS** |

---

## 9. Acceptance Criteria

| ID | Kryterium | Mierzalne |
|----|-----------|-----------|
| **AC-1** | Na tab Kosztorysy kontener treści **nie** jest ograniczony `max-w-7xl` | Snapshot class / visual 1920: treść sięga padów strony |
| **AC-2** | Inne taby (np. Przegląd) **nadal** `max-w-7xl` | Regresja layout |
| **AC-3** | Sticky Offer Summary Bar widoczny przy scrollu listy pozycji | Desktop 1280 + 1920 |
| **AC-4** | Sticky pokazuje rekomendację (lub brak) + direct + review count | Pola z istniejącego view |
| **AC-5** | Sekcje Wiedza / Explainability / Readiness / Jakość AI **domyślnie zamknięte** | Mount → closed |
| **AC-6** | Evidence L0 collapsed gdy OfferBoq available | Mount |
| **AC-7** | Filtr „Tylko do weryfikacji” ukrywa linie bez `requiresUserReview` | Pure / UI test |
| **AC-8** | Włączenie filtra **nie** mutuje dokumentu OfferBoq / Bid | Referencja doc unchanged |
| **AC-9** | `recommendedBidPln` / direct **identyczne** przed/po W1 (smoke porównawczy) | Zero logiki |
| **AC-10** | Mobile: sticky nie łamie touch 44px na chipie; brak nowego drawer | Smoke |
| **AC-11** | Build PASS | `npm run build` |

---

## 10. Rollback

| Scenariusz | Akcja |
|------------|-------|
| Sticky zasłania CTA / psuje scroll | Revert sticky; zostaw full width + accordion |
| Full width psuje inny tab | Sprawdź AC-2; revert conditional class |
| Filtr myli użytkowników | Default OFF; lub revert chip |
| Regresja ceny Bid | Natychmiastowy revert całego W1 — nie „łatka” silnika |

Rollback = **git revert** bundle W1. Brak feature-flag wymaganej w DF (opcjonalna flaga = OOS chyba że Owner doda w IMPLEMENT brief).

---

## 11. Desktop 1280 / 1920 — checklist wizualna

| Check | 1280 | 1920 |
|-------|------|------|
| Brak dużych pustych gutterów vs AS-IS | TAK | TAK (wyraźny zysk) |
| Sticky czytelny (cena nie ucięta) | TAK (wrap OK) | TAK (1 linia preferowana) |
| Accordion closed → lista wyżej na ekranie | TAK | TAK |
| Evidence nie zajmuje pierwszego ekranu | TAK | TAK |

---

## 12. Ryzyka W1

| Ryzyko | Mitygacja |
|--------|-----------|
| Utrata discoverability explainability | Accordion z jasnym tytułem „Szczegóły wyceny”; KPI 6 zostają widoczne |
| Podwójny sticky (Process + Offer) | Hierarchy §2.3 — nie sticky’ować Process jako cenę |
| `position: sticky` w `overflow` parent | Sticky **wewnątrz** `mobile-view-scroll`; test 1280/1920 |
| Filtr ukrywa wszystkie linie | Empty state AC-7 |
| Scope creep → Compact | Twardy OOS §8 |

---

## 13. Migration / kolejność IMPLEMENT (po GO)

| Krok | Działanie |
|------|-----------|
| M0 | Owner GO IMPLEMENTATION |
| M1 | Full width conditional |
| M2 | Accordion + Evidence collapsed |
| M3 | Sticky bar + filtr review |
| M4 | Testy AC + build |
| M5 | Changelog · commit/push **tylko na polecenie Ownera** |

---

## 14. Relacja do Wave 2 / 3

| Wave | Po W1 |
|------|-------|
| **W2** Compact · collapsed components · sort | Buduje na krótszym chrome z W1 |
| **W3** Virtualization · pin · resize | Nie zaczynać w W1 |

---

## 15. STOP

```text
DESIGN FREEZE COMPLETE — COSTORYS-UX-01 WAVE 1
Dokument: docs/architecture/COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
