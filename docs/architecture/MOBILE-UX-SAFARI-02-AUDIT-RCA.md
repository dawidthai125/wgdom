# MOBILE-UX-SAFARI-02 — AUDIT + RCA

> **ID:** MOBILE-UX-SAFARI-02  
> **STATUS:** **AUDIT COMPLETE** · **DESIGN FREEZE:** NIE · **IMPLEMENT:** BLOCKED  
> **Data:** 2026-07-25  
> **Powierzchnia:** Lista przetargów → Wybrany przetarg (V4 detail) · **iPhone Safari**  
> **Baseline prod (kod app):** **2.65.44** @ **`57b059d`** · tip docs `5e84a07`  
> **Zakaz:** zero `src/**` · zero commit · zero push

```text
════════════════════════════════════════════════════════
AUDIT + RCA ONLY
NIE DESIGN FREEZE · NIE IMPLEMENT · NIE COMMIT/PUSH
════════════════════════════════════════════════════════
```

---

## 0. Evidence base / ograniczenia

| Źródło | Status |
|--------|--------|
| Fizyczne screeny Ownera (Safari iPhone) w czacie / workspace | **NIE DOSTARCZONE** w tej sesji |
| Mobile visual smoke (viewport mobile, detal przetargu) | **UŻYTE** jako referencje S1–S4 |
| Kod SSOT (`TenderDetailPage`, Command Layer, TabBar, Operator Bar, Admin shell) | **UŻYTY** do RCA |
| Poprzednie audyty | `MOBILE-UX-AUDIT-01` (M-TENDER-CHROME, M-SAFE-SPACER, M-OVERLAY-NOLOCK) · `NG-08-TEUX-UX-AUDIT` (RSP-02, ACT-*) · M-03 CLOSED |

**Screenshot reference map (sesja):**

| ID | Plik | Co widać |
|----|------|----------|
| **S1** | `.tmp-visual-smoke/screenshots/mobile/01-przetarg.png` | Tab Przetarg · CTA / primary action · Operator Upload/Analiza/Eksport · bottom nav |
| **S2** | `.tmp-visual-smoke/screenshots/mobile/02-cost-tab.png` | Kosztorys path · multi-tier nav · truncated CTA title |
| **S3** | `.tmp-visual-smoke/screenshots/mobile/03-dokumenty.png` | Dokumenty · summary card · CTA card · section header |
| **S4** | `.tmp-visual-smoke/screenshots/mobile/05-command-layer.png` | Command Layer + cloud/notes banner stack · process strip · Operator bar 2+1 wrap |

> **Uwaga metodologiczna:** S1–S4 to emulacja mobile / smoke, nie formalny field cert Safari. RCA kodowa jest niezależna od tego. **Owner może dołączyć własne screeny Safari** — ID problemów pozostają; mapowanie „Screen” należy uzupełnić o S-Owner-*.

---

## 1. Executive Summary

Widok **Wybrany przetarg** na telefonie to **warstwowy chrome stack**:

```text
AdminTopbar (logo + 5–6 ikon, safe-area-top)
+ opcjonalnie banner notatek / błąd sync
+ TenderDetailCommandLayer (back · Moduł · title · tabs · process strip · shortcuts · PRIMARY CTA)
+ [data-tender-detail-scroll-root]  ← jedyny scroll content
    └── treść tabów
    └── Operator Action Bar  (sticky bottom, tylko tab Przetarg)
+ AdminMobileNav              (fixed bottom, z-40)
```

**Werdykt:** flow jest **używalny**, ale **first-screen chrome budget jest przekroczony** (historycznie RSP-02 / M-TENDER-CHROME). Największe ryzyka Safari:

1. **P1 — chrome density** (Command Layer + CTA + process strip + banners) → mało miejsca na treść.  
2. **P1 — Operator sticky vs spacer `4.75rem`** przy wrap 2 rzędów → możliwa okluzja treści / dead-space.  
3. **P1 — lista: podwójny bottom padding** (`AdminViewRouter` + `TendersView`) → M-SAFE-SPACER.  
4. **P2 — tabs / process strip overflow** → „Decy…” i nieczytelne etapy.  
5. **P2 — detail scroll root ≠ `.mobile-view-scroll`** → brak `-webkit-overflow-scrolling: touch`.  
6. **P2 — Tender sheets bez scroll-lock** (M-OVERLAY-NOLOCK).

**Brak P0** potwierdzonego (crash / totalnie niedostępny flow / wipe). Potencjalne P0 tylko gdy Owner potwierdzi na fizycznym Safari: sticky Operator Bar nachodzi na AdminMobileNav **lub** treść niemożliwa do przewinięcia ponad panel.

**Gotowość powierzchni Przetargi (mobile detail): ~58–65%** (zgodnie z AUDIT-01 ~65% lista; detail chrome obniża first-screen).

---

## 2. Architektura (SSOT) — co jest fixed / sticky / scroll

| Warstwa | Mechanizm | Safe-area | Plik |
|---------|-----------|-----------|------|
| AdminTopbar | `shrink-0` (mobile nie sticky CSS) | `paddingTop: max(0.75rem, env(safe-area-inset-top))` | `AdminTopbar.tsx` ~79 |
| Command Layer | `shrink-0` sibling (zamrożony nad scrollem) | brak własnego inset | `TenderDetailCommandLayer.tsx` ~91–97 |
| Detail scroll | `overflow-y-auto overscroll-contain` · **NIE** `.mobile-view-scroll` | PB: `4.75rem+safe` gdy Operator ON, else `max(1rem, safe)` | `TenderDetailPage.tsx` ~461–471 |
| Operator Action Bar | **`sticky bottom-0`** wewnątrz scroll root · `lg:hidden` | `paddingBottom: max(1rem, env(safe-area-inset-bottom))` | `TenderDetailPage.tsx` ~516–524 |
| AdminMobileNav | **`fixed bottom-0` z-40** | `paddingBottom: env(safe-area-inset-bottom)` | `AdminMobileNav.tsx` ~35–37 |
| Shell content inset | `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` | tak | `AdminViewRouter.tsx` ~467 |
| Lista scroll | `.mobile-view-scroll` + `max-md:pb-[calc(6rem+env(...))]` | tak (plus router) | `TendersView.tsx` ~507 |
| viewport | `viewport-fit=cover` | umożliwia env() | `index.html` |

**Kluczowe:** Operator Bar **nie** jest `position:fixed` względem viewportu — jest `sticky` w scroll root, który już leży **nad** bottom nav dzięki paddingowi shella. To poprawne architektonicznie, ale **wysokość realnego sticky panelu** może przekroczyć założony spacer.

---

## 3. Pełna lista problemów

### P0 — blocker

| ID | Problem | Screen | Status |
|----|---------|--------|--------|
| — | Brak P0 potwierdzonego w tej sesji | — | **Brak** |

> **Watchlist (podnieś do P0 po field FAIL):** Operator sticky + AdminMobileNav overlap; content nieprzewijalny ponad panel; home indicator zasłania etykiety nav mimo `env()`.

---

### P1 — wysoki wpływ

| ID | Problem | Screen | Lokalizacja |
|----|---------|--------|-------------|
| **S02-CHROME-BUDGET** | First-screen: Topbar + banner + Command Layer + tabs + process strip + shortcuts + Primary CTA → treść prawie poza fold | S1, S2, S4 | Command slot `TenderDetailPage` ~312–381; CommandLayer |
| **S02-CTA-DOMINANCE** | Primary action card (`border-2`, pełna szerokość chrome) + długi busy label („Przetwarzam dokumenty…”) dominuje layout; title `line-clamp-1` („Odpuść — term…”) | S1–S4 | `TenderWorkflowPrimaryAction.tsx` ~119–198 |
| **S02-DESC-DUP** | Opis CTA powtórzony wizualnie (description + powtórzenie komunikatu terminu) | S1, S2, S4 | PrimaryAction + intelligence copy |
| **S02-OPBAR-HEIGHT** | Mobile Operator Bar: `flex-wrap` + `min-w-[calc(50%-0.25rem)]` → 2–3 rzędy (Upload\|Analiza / Eksport). Spacer content = **stałe `4.75rem`** — za mało przy 2 rzędach × 44px + safe-area | S1, S4 | `TenderWorkflowOperatorActionBar.tsx` ~87–94; `TenderDetailPage.tsx` ~465, ~518–519 |
| **S02-LIST-DOUBLE-PB** | Lista: `AdminViewRouter` **3.5rem+safe** **oraz** `TendersView` **6rem+safe** → nadmierny dead-space / niespójny spacer | (lista — brak S-list w smoke) | `AdminViewRouter.tsx` ~467; `TendersView.tsx` ~507 |
| **S02-BANNER-STACK** | Banner notatek i/lub cloud error siedzi **nad** Command Layer → dalsze ścięcie content budget; na Safari z URL bar = jeszcze mniej | S4 | Admin shell banners + CommandLayer |
| **S02-MULTI-NAV** | Trzy poziomy nawigacji naraz: V4 tabs + ProcessStrip + (w content) sub-tabs Podsumowanie/Kosztorys | S1–S3 | ProcessStrip w command slot; workspaces |

---

### P2 — średni

| ID | Problem | Screen | Lokalizacja |
|----|---------|--------|-------------|
| **S02-TAB-CLIP** | Tab „Decyzja” ucięty do „Decy…”; wymaga horizontal scroll; shadow hint istnieje, ale discovery słabe | S1–S4 | `TenderDetailTabBar.tsx` ~39–65 |
| **S02-STRIP-OVERFLOW** | Process strip ribbon: `whitespace-nowrap` + overflow-x → etapy wyglądają na truncated / „…” | S1, S2, S4 | `TenderWorkflowProcessStrip.tsx` ~115–131 |
| **S02-SCROLL-ROOT** | Detail scroll **bez** `.mobile-view-scroll` → brak `-webkit-overflow-scrolling: touch` / `touch-action: pan-y` SSOT | (kod) | `TenderDetailPage.tsx` ~461–466 vs `mobile.css` ~11–17 |
| **S02-SHEET-NOLOCK** | `TenderModuleNavSheet` / filter sheet: `fixed inset-0` bez `useModalScrollLock` + markerów | (Moduł) | M-OVERLAY-NOLOCK |
| **S02-TOPBAR-CLUSTER** | 5–6× `min-w-[44px]` ikon w jednym rzędzie z logo na ≤375px → wizualny tłok / łatwy miss-tap mimo formalnego 44px | S1–S4 | `AdminTopbar.tsx` ~113–199 |
| **S02-TITLE-CLAMP** | `h1` `line-clamp-1` + `max-[430px]:text-[13px]` — długie tytuły BZP nieczytelne | S1–S4 | CommandLayer ~167–175 |
| **S02-CARD-WRAP** | Karty KPI / WARTOŚĆ: długi wrap zwiększa wysokość; asymetria CTA vs tekst w primary card | S3 | content cards + PrimaryAction flex |
| **S02-SAFE-BOTTOM-VIS** | Na smoke (safe-area≈0) etykiety nav „przyklejone” do krawędzi — na prawdziwym iPhonie `env()` jest w kodzie, ale **brak field potwierdzenia** | S1–S4 | AdminMobileNav ~37 |
| **S02-MEM-SCROLL** | Scroll persist tylko kosztorys/ceny; inne taby tracą pozycję (NG-08 MEM) | — | `TenderDetailPage` cost persist |
| **S02-BREADCRUMB-BP** | Mobile breadcrumb: `md:hidden max-[430px]:hidden` → znika ≤430px (OK density), ale kontekst ginie; >430 & <768 pokazuje się | S1 (gdy viewport >430) | CommandLayer ~121–141 |

---

### P3 — niski

| ID | Problem | Screen |
|----|---------|--------|
| **S02-LABEL-10PX** | Bottom nav `text-[10px]` — czytelność | S1–S4 |
| **S02-ACTIVE-WIECEJ** | Wejście w Przetargi przez „Więcej” → active „Więcej” zamiast kontekstu Przetargi | S1–S4 |
| **S02-FOCUS-SHEET** | Brak focus trap / Escape na module sheet | — |

---

## 4. Checklist A–H (wyniki)

### A. Bottom Action Panel (Operator + Admin nav)

| Pytanie | Werdykt | Sev |
|---------|---------|-----|
| Czy fixed/sticky panel zasłania treść? | **Ryzyko TAK** gdy Operator wrap >1 rząd vs spacer `4.75rem` | **P1** S02-OPBAR-HEIGHT |
| Content `padding-bottom`? | TAK — `4.75rem+safe` gdy bar ON | OK / niedoszacowane |
| `env(safe-area-inset-bottom)`? | TAK na Operator + AdminMobileNav + shell | OK kodowo |
| Ostatnia sekcja w pełni ponad panel? | **Conditional** — zależy od realnej wysokości wrap | **P1** |
| Panel vs formularze/karty/CTA? | Operator tylko tab Przetarg; Primary CTA w chrome (nie bottom) | P1 chrome |
| Dead-space? | Lista: **tak** (double PB). Detail: możliwy over/under-spacer | **P1** / P2 |

### B. Header (375 / 390 / 430)

| Width | Ocena |
|------:|-------|
| **375** | Logo + 5–6 ikon = cluster **P2**; title 13px clamp; breadcrumb ukryty (≤430) |
| **390** | Tabs `text-[11px]` / `px-2.5`; nadal Decyzja clip |
| **430** | Cliff M-03 złagodzony (`max-[430px]`); breadcrumb nadal hidden ≤430; tuż powyżej pojawia się |

Wysokość Command Layer: zmienna (tabs + strip + CTA) — **nie stała**; to główny problem, nie sam topbar.

### C. Tabs (Przetarg…Decyzja)

| Kryterium | Werdykt |
|-----------|---------||
| min-width | brak sztywnego min-w; `shrink-0` + padding |
| touch target | `min-h-[44px]` ✅ |
| overflow-x | TAK + scroll shadows ✅ |
| wrapping | nie (zamierzone scroll) |
| active state | primary fill ✅ |
| spacing | `gap-1` OK; Decyzja discovery **P2** |

### D. Cards

Marginesy/padding OK-ish (`px-4` / `TEUX` tokens). Problemy: wrap długich wartości, CTA card asymetria, powtórzony copy — **P1/P2**.

### E. CTA („Przejdź do kwalifikacji” / primary)

W Command Layer na **wszystkich** tabach (NG-08-01). Proporcje mobile: button `min-h-[44px]` OK, ale **karta CTA dominuje** first-screen — **P1** S02-CTA-DOMINANCE. Nie jest bottom-sticky (ACT-02 docs drift — historyczny).

### F. Scroll

| Element | Werdykt |
|---------|---------|
| Scroll root | `[data-tender-detail-scroll-root]` |
| Sticky | Operator `sticky bottom-0` |
| Fixed | AdminMobileNav |
| Overscroll | `overscroll-contain` na root |
| Rubber-band | ryzyko przy sheetach bez lock (**P2**) |
| iOS | brak `-webkit-overflow-scrolling` na detail root (**P2**) |

### G. Safe Area

| | |
|--|--|
| Top | Topbar `env(safe-area-inset-top)` ✅ |
| Bottom | Nav + Operator + shell ✅ w kodzie |
| Field | **NIE POTWIERDZONE** na fizycznym Safari w tej sesji |

### H. Responsywność (320–430)

| px | Ryzyko |
|---:|--------|
| 320 | P1 chrome; tabs/strip ciężkie; topbar overflow wizualny |
| 360–375 | Główny target problemów S02-* |
| 390 | Tokeny `max-[390px]` aktywne |
| 393–402 | Jak 390 |
| 414–430 | M-03 density; Decyzja nadal scroll |

---

## 5. RCA per problem (Root Cause → Minimal fix → Regresja)

### S02-CHROME-BUDGET — **P1**

| | |
|--|--|
| **RCA** | Command slot zawsze montuje ProcessStrip + shortcuts + PrimaryAction; banners admin dokładają wysokość; Command Layer jest `shrink-0` (nie scrolluje). |
| **Minimal fix** | Na `max-lg`: (1) ukryć ProcessStrip za „Proces” disclosure **lub** (2) przenieść strip do scroll content; (3) kompaktować CTA do jednego wiersza bez description. |
| **Regresja** | Nawigacja etapów trudniejsza; Owner może nie widzieć „you are here”. |
| **Boundary** | FEATURE UI · zero Payroll/Cloud write-path. |

### S02-CTA-DOMINANCE / S02-DESC-DUP — **P1**

| | |
|--|--|
| **RCA** | `commandLayerChrome` = bordered card + title clamp + description; busy label długi; copy intelligence powtarza ten sam powód. |
| **Minimal fix** | Mobile: jedna linia title + CTA button; description `sr-only` lub tooltip; busy = ikona + krótkie „Przetwarzam…”. Deduplikacja copy w warstwie view-model. |
| **Regresja** | Mniej kontekstu bez tapnięcie w szczegóły. |
| **Boundary** | FEATURE UI / copy — nie zmienia scoringu. |

### S02-OPBAR-HEIGHT — **P1**

| | |
|--|--|
| **RCA** | Spacer zakłada ~1 rząd (`4.75rem`); mobile layout wymusza wrap 2–3 przy 3–4 akcjach × 44px. Sticky bar rośnie; content PB nie. |
| **Minimal fix** | A) `flex-nowrap` + horizontal scroll toolbar **lub** B) spacer = CSS var mierząca real height **lub** C) max 2 primary + „Więcej”. Usunąć duplikację safe-area z PB jeśli shell już insetuje (audit pomiarowy). |
| **Regresja** | Za duży spacer = dead-space; za mały = okluzja. |
| **Boundary** | FEATURE shell · nie zmienia upload/analyze handlers. |

### S02-LIST-DOUBLE-PB — **P1**

| | |
|--|--|
| **RCA** | Historyczny drift: router chroni bottom nav; lista dodała własny `6rem` (FAB + nav) bez SSOT. |
| **Minimal fix** | Jedna zmienna CSS `--admin-mobile-bottom-inset`; lista tylko dodaje delta pod FAB. |
| **Regresja** | Ostatnie karty pod nav jeśli niedoszacowane. |
| **Boundary** | FEATURE layout. |

### S02-BANNER-STACK — **P1**

| | |
|--|--|
| **RCA** | Banners renderowane w shell powyżej modułu; detail nie kompaktuje chrome gdy banner visible. |
| **Minimal fix** | Auto-collapse Command Layer extras gdy banner height > N; lub banner toast zamiast full-width card na detail route. |
| **Regresja** | Mniejsza widoczność sync/notes. |
| **Boundary** | FEATURE · nie sync CORE. |

### S02-MULTI-NAV — **P1**

| | |
|--|--|
| **RCA** | V4 tabs + ProcessStrip + workspace sub-nav powstały w kolejnych epicach bez budżetu first-screen. |
| **Minimal fix** | Na mobile: ProcessStrip tylko na tab Przetarg **i** collapsed; sub-nav zostaje w content. |
| **Regresja** | Dłuższa ścieżka do etapu. |
| **Boundary** | FEATURE IA. |

### S02-TAB-CLIP / S02-STRIP-OVERFLOW — **P2**

| | |
|--|--|
| **RCA** | 5 tabów + długie labelki > 375px; strip `whitespace-nowrap`. |
| **Minimal fix** | Krótsze labelki mobile („Dec.”) **lub** scroll-snap + always-visible right fade; strip: ikona-only ≤390px z `aria-label`. |
| **Regresja** | Learnability. |

### S02-SCROLL-ROOT — **P2**

| | |
|--|--|
| **RCA** | Detail dostał własny scroller; nie podpięto klasy SSOT `.mobile-view-scroll`. |
| **Minimal fix** | Dodać `.mobile-view-scroll` (lub te same 4 deklaracje) do `[data-tender-detail-scroll-root]`. |
| **Regresja** | Niskie — alignment do SSOT. |
| **Boundary** | FEATURE CSS. |

### S02-SHEET-NOLOCK — **P2**

| | |
|--|--|
| **RCA** | M-OVERLAY-NOLOCK — sheet hand-rolled. |
| **Minimal fix** | MUX-B2 pattern: lock + `.modal-overlay` / sheet markers. |
| **Regresja** | Jak MUX-A (lock without markers = P1). |

### S02-TOPBAR-CLUSTER — **P2**

| | |
|--|--|
| **RCA** | Wszystkie utility zawsze widoczne na mobile. |
| **Minimal fix** | Overflow menu „⋯” dla backup/import; zostaw sync + search + logout. |
| **Regresja** | Extra tap. |

---

## 6. Boundary Check

| Zakaz | Status |
|-------|--------|
| Payroll CORE / write-path | **OUT** |
| Cloud Sync merge / Edge | **OUT** (banner UI only) |
| Scoring / intelligence algorithms | **OUT** (tylko prezentacja CTA) |
| `modal-scroll-lock.ts` allowlist | zmieniać tylko w osobnym MUX ticketcie |
| Stabilization Window | Naprawy = **FEATURE / shell UX** po DF + Owner GO |

---

## 7. Quick Wins / Medium / Architekturalne

### Quick Wins (≤1–2 PR, niski risk)

1. **S02-SCROLL-ROOT** — class SSOT na detail scroll  
2. **S02-CTA** — mobile: ukryj description; skróć busy label  
3. **S02-TAB-CLIP** — krótszy label „Decyzja” → „Dec.” na `max-[390px]`  
4. **S02-STRIP** — ikona-only ≤390px  

### Medium

1. **S02-OPBAR-HEIGHT** — nowrap scroll **lub** dynamic spacer  
2. **S02-LIST-DOUBLE-PB** — SSOT bottom inset  
3. **S02-TOPBAR-CLUSTER** — overflow menu  
4. **S02-SHEET-NOLOCK** — MUX-B2  

### Architekturalne

1. **S02-CHROME-BUDGET / MULTI-NAV** — redesign mobile Command Layer (budżet wysokości, progressive disclosure)  
2. **S02-BANNER-STACK** — shell notification policy vs detail routes  
3. Jednolity **Mobile Chrome Budget** token (`--tender-mobile-chrome-max`) egzekwowany w DF  

---

## 8. Rekomendowana kolejność napraw

```text
1. S02-OPBAR-HEIGHT          ← okluzja / dead-space (mierzalne)
2. S02-LIST-DOUBLE-PB        ← lista first impression
3. S02-CTA-DOMINANCE + DUP   ← quick visual win
4. S02-SCROLL-ROOT           ← iOS momentum SSOT
5. S02-TAB-CLIP + STRIP      ← discovery
6. S02-CHROME-BUDGET         ← DF osobny (02A/02B)
7. S02-SHEET-NOLOCK          ← MUX-B2 / 02C
8. S02-TOPBAR-CLUSTER        ← polish 02D
```

---

## 9. Propozycja EPIC-ów (bez DF)

| Epic | Zakres | Główne ID | Typ |
|------|--------|-----------|-----|
| **MOBILE-UX-SAFARI-02A** | Bottom Action Panel (Operator sticky + spacer + vs AdminMobileNav) | S02-OPBAR-HEIGHT | Medium |
| **MOBILE-UX-SAFARI-02B** | Header + Tabs + Process strip density | S02-TAB-CLIP, S02-STRIP, S02-TOPBAR, S02-TITLE | Medium |
| **MOBILE-UX-SAFARI-02C** | Spacing + Safe Area + list inset SSOT + scroll root SSOT | S02-LIST-DOUBLE-PB, S02-SCROLL-ROOT, S02-SAFE-BOTTOM-VIS | Quick/Medium |
| **MOBILE-UX-SAFARI-02D** | Mobile Polish (CTA compact, copy dedupe, chrome budget, banners) | S02-CHROME, S02-CTA, S02-DESC, S02-BANNER, S02-MULTI-NAV | Arch + Polish |
| *(osobno)* **MUX-B2** | Tender sheets scroll-lock | S02-SHEET-NOLOCK | Kontrakt MUX-A |

**Następny krok procesu (nie w tym tickecie):** Owner dołącza screeny Safari → uzupełnienie mapy Screen → **DESIGN FREEZE** wybranego epica (02A rekomendowany pierwszy) → Owner GO → IMPLEMENT.

---

## 10. Co NIE wchodzi w ten ticket

- Implementacja / refaktor `src/**`  
- DESIGN FREEZE  
- Commit / push  
- Zmiany Payroll / Cloud Sync CORE  
- Formalny field cert (wymaga Owner PASS/FAIL na urządzeniu)

---

## 11. Podpis audytu

| | |
|--|--|
| Ticket | **MOBILE-UX-SAFARI-02** |
| Faza | **AUDIT + RCA COMPLETE** |
| DF | **NIE UTWORZONO** |
| Kod | **BEZ ZMIAN** |
| Commit/push | **NIE** |

**Koniec raportu MOBILE-UX-SAFARI-02.**
