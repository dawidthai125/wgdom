# MOBILE-FIRST-SCREEN-01 — DESIGN FREEZE

> **ID:** MOBILE-FIRST-SCREEN-01 / MFS-01  
> **STATUS:** **RELEASE IN PROGRESS** · Owner GO RELEASE **TAK** · czeka na tip prod  
> **Data:** 2026-07-25  
> **AUDIT SSOT:** [`MOBILE-UX-SAFARI-02-AUDIT-RCA.md`](MOBILE-UX-SAFARI-02-AUDIT-RCA.md)  
> **Owner Verification:** [`MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md`](MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md)  
> **Release:** [`MOBILE-FIRST-SCREEN-01-RELEASE-REPORT.md`](MOBILE-FIRST-SCREEN-01-RELEASE-REPORT.md)  
> **Baseline prod (pre-release):** UI **2.65.44** @ **`57b059d`**  
> **Typ bundla:** **FEATURE / shell UX** · **NIE** Payroll · **NIE** Cloud Sync · **NIE** scoring/workflow logic · **NIE** write-path  
> **Owner GO (IMPLEMENT):** **TAK**  
> **Owner GO (RELEASE):** **TAK**

```text
════════════════════════════════════════════════════════
MFS-01 = First Screen Chrome Budget na "Wybrany przetarg"
IMPLEMENT DONE (2026-07-25) — Operator A · CTA compact ·
Process collapsed · shortcuts hidden max-lg
════════════════════════════════════════════════════════
```

---

## 0. Cel i granice

### 0.1 Cel główny

Po wejściu w **Wybrany przetarg** (tab domyślny **Przetarg**) użytkownik na iPhone Safari widzi **above the fold**:

1. **Tytuł** przetargu  
2. **Status / primary next-step** (skompresowany CTA)  
3. **Początek właściwej treści** workspace (karta / sekcja hub)  

**bez** konieczności przewijania, żeby w ogóle zobaczyć treść.

Chrome (shell + Command Layer + sticky/fixed bary) **nie może dominować** pierwszego viewportu.

### 0.2 Metryka sukcesu (zamrożona)

| Metryka | BEFORE (szacunek) | AFTER (target) |
|---------|-------------------|----------------|
| **Content visible height** (viewport − chrome stały − chrome sticky) | ≈ **150–220 px** @390 | **≥ 280 px** @390 |
| **Content % viewport** | ≈ **22–30%** | **≥ 38%** @390 (cel **≥ 40%**) |
| **Command Layer wysokość** (bez bannerów admin) | ≈ **280–360 px** | **≤ 200 px** @ max-lg |
| **Operator Bar wysokość** (mobile, tab Przetarg) | ≈ **100–140 px** (2 rzędy) | **≤ 56 px** content + safe (1 rząd) |
| **Scroll, by zobaczyć treść** | często wymagany | **0** (AC) |

Pomiary weryfikacyjne: Chromium mobile + **Owner field Safari** (375 / 390 / 430).

### 0.3 IN SCOPE

| Obszar | Co wolno zmienić |
|--------|------------------|
| Operator Action Bar (mobile) | Layout wiersza, spacer PB, klasy — **bez** zmiany handlerów Upload/Analiza/Eksport |
| Primary CTA (`commandLayerChrome`) | Kompresja prezentacji mobile |
| Command Layer / command slot | Hierarchia, collapse Process Strip, ukrycie shortcuts mobile |
| Header spacing (Command Layer) | `py` / `gap` / title size w istniejących breakpointach |
| Tabs | Tylko kosmetyka label/density jeśli potrzeba budget (opcjonalnie w tym PR) |
| Safe Area / scroll budget | Spacer Operator = 1 rząd; opcjonalnie `.mobile-view-scroll` na detail root |
| First Screen layout | Zgodnie z §6 |

### 0.4 OUT OF SCOPE

| OUT | Powód |
|-----|--------|
| Payroll / Cloud Sync CORE / Edge / merge | Protected |
| Scoring / intelligence algorithms / workflow state machines | Business logic |
| Semantyka Upload / Analiza / Pricing / dossier | Tylko UI chrome |
| L2–L5 lightbox / MUX-* | Osobne tickety |
| Lista przetargów double-PB (`S02-LIST-DOUBLE-PB`) | Osobny slice (nie first-screen detail) |
| Topbar overflow menu (pełny redesign ikon) | P2 — **opcjonalny follow-up**, nie blocker MFS-01 |
| `TenderModuleNavSheet` scroll-lock | MUX-B2 |
| Bannery notatek / sync (logika) | Shell policy — OUT; detail tylko **reaguje** budżetem (§3.3) |
| Desktop `lg+` layout | Bez regresji; zmiany `max-lg` / `max-[430px]` |

### 0.5 Boundary Check

| Check | Werdykt |
|-------|---------|
| FEATURE vs CORE | **FEATURE** shell UX |
| Mixed bundle z Payroll write-path? | **NIE** |
| Zmiana `onUpload` / `onAnalyze` / pipeline? | **NIE** |
| Zmiana `modal-scroll-lock.ts`? | **NIE** |
| Owner GO wymagany? | **TAK** |

---

## 1. Chrome Budget — wyliczenie

### 1.1 Założenia pomiaru

| Parametr | Wartość |
|----------|---------|
| `1rem` | 16px |
| Safe-area top (iPhone notch / Island) | **47–59 px** (model) |
| Safe-area bottom (home indicator) | **34 px** |
| Smoke/emulacja bez notch | safe ≈ **0** |
| Ref. wysokości CSS | 375→**812**, 390→**844**, 430→**932** (nowoczesne iPhone) |
| Scenariusz | Tab **Przetarg**, **bez** banneru notatek/sync, 3 akcje Operator (Upload, Analiza, Eksport), CTA nie-busy |

Wysokości = **szacunek z klas Tailwind + min-h** (kod @ `57b059d`). Field Safari może ±8–12%.

### 1.2 BEFORE — składowe (px)

| Warstwa | Mechanizm | 375 | 390 | 430 | Źródło |
|---------|-----------|----:|----:|----:|--------|
| **A. AdminTopbar** | shrink-0 + safe-top | **103** | **103** | **115**† | `AdminTopbar` py + `min-h` + safe |
| **B. Back + Moduł** | min-h 44 | 44 | 44 | 44 | CommandLayer |
| **C. Title** | 13–15px clamp-1 | 20 | 20 | 20 | CommandLayer |
| **D. Tabs V4** | min-h 44 | 46 | 46 | 46 | TabBar |
| **E. Process Strip** | ribbon + min-h 44 | 52 | 50 | 52 | ProcessStrip |
| **F. Shortcuts** | min-h-11 ×1–2 | 44 | 44 | 44 | command slot |
| **G. Primary CTA** | card + wrap | 88 | 84 | 80 | PrimaryAction |
| **Σ Command (B–G)** | | **294** | **288** | **286** | |
| **H. Operator sticky** | wrap **2 rzędy** + pt + safe-b | **126** | **126** | **126** | OpBar + slot |
| **I. AdminMobileNav** | 52 + safe-b (shell pb) | **86** | **86** | **86** | MobileNav |
| **Σ Chrome (A+ΣCmd+H+I)** | | **609** | **603** | **613** | |

† 430: wyższe safe-top Island ≈ 59.

**Uwaga:** Operator (H) i Nav (I) „zjadają” dół; Nav jest już w `AdminViewRouter` `pb`. Sticky Operator siedzi **nad** nav w scroll root — obie pozycje wliczamy do chrome first-screen.

### 1.3 BEFORE — % viewportu

| Width | H | Chrome px | Chrome % | Content px | Content % |
|------:|--:|----------:|---------:|-----------:|----------:|
| **375** | 812 | 609 | **75%** | 203 | **25%** |
| **390** | 844 | 603 | **71%** | 241 | **29%** |
| **430** | 932 | 613 | **66%** | 319 | **34%** |

Z **bannerem** notatek (~80px) lub sync error (~100px): content spada o kolejne **~10–12 pp** → często **&lt;20%** treści (@390).

### 1.4 AFTER — składowe (px) — zamrożony układ §6

| Warstwa | Zmiana | 375 | 390 | 430 |
|---------|--------|----:|----:|----:|
| **A. Topbar** | bez zmian w MFS-01 | 103 | 103 | 115 |
| **B. Back + Moduł** | bez zmian touch 44 | 44 | 44 | 44 |
| **C. Title** | bez zmian | 20 | 20 | 20 |
| **D. Tabs** | bez zmian (opcjonalnie Dec. label — 0 ΔH) | 46 | 46 | 46 |
| **E. Process** | **collapsed chip** (nie pełny strip) | **36** | **36** | **36** |
| **F. Shortcuts** | **ukryte `max-lg`** | **0** | **0** | **0** |
| **G. CTA** | **compact 1 rząd** | **48** | **48** | **48** |
| **Σ Command (B–G)** | | **194** | **194** | **194** |
| **H. Operator** | **wariant A: 1 rząd + safe** | **90** | **90** | **90** |
| **I. Nav** | bez zmian | 86 | 86 | 86 |
| **Σ Chrome** | | **473** | **473** | **485** |

### 1.5 AFTER — % viewportu

| Width | H | Chrome px | Chrome % | Content px | Content % | vs BEFORE |
|------:|--:|----------:|---------:|-----------:|----------:|-----------|
| **375** | 812 | 473 | **58%** | **339** | **42%** | +17 pp content |
| **390** | 844 | 473 | **56%** | **371** | **44%** | +15 pp |
| **430** | 932 | 485 | **52%** | **447** | **48%** | +14 pp |

**Target AC (≥38% / ≥280px) — spełniony** w modelu bez bannerów.

Z bannerem 80px: @390 content ≈ **291 px / 34%** — nadal ≥280px treści; CTA+treść widoczne. Dalsza kompresja bannerów = OUT (osobny ticket).

---

## 2. Porównanie wariantów Operator Action Bar

| | **A · Horizontal scroll** | **B · 2 primary + More** | **C · Compact Toolbar** | **D · FAB** |
|--|---------------------------|--------------------------|-------------------------|-------------|
| Wysokość | **1 rząd** (~44+pad) | 1 rząd | 1 rząd (ikony) | FAB ≠ toolbar; treść wolna, ale akcje ukryte |
| Odkrywalność | Scroll hint / fade | „Więcej” ukrywa Eksport/e-Z | Ikony wymagają title/aria | Najgorsza dla 3–4 akcji |
| Touch 44px | ✅ | ✅ | ✅ (ostrożnie z gęstością) | ✅ FAB |
| Spacer PB | Prosty = 1× rząd | Prosty | Prosty | Inny model (FAB + sheet) |
| Konflikt z AdminMobileNav | Niski | Niski | Niski | Średni (FAB vs nav) |
| Zgodność z obecnym API | Wysoka | Wysoka (+ menu) | Wysoka | Nowa IA |
| Ryzyko | Słaby hint scroll | Extra tap | Czytelność ikon | Scope creep |

### 2.1 Decyzja zamrożona

```text
WYBÓR: Wariant A — Horizontal scroll (nowrap)
Runner-up (tylko jeśli Owner field FAIL na discovery): B
ODRZUCONE w MFS-01: C (jako osobny polish), D (FAB)
```

**Kontrakt A:**

1. Mobile OpBar: `flex-nowrap overflow-x-auto overscroll-x-contain` · **zakaz** `flex-wrap` / `min-w-[50%]`.  
2. Przyciski: `shrink-0 min-h-[44px]` (bez `flex-1` wymuszającego wrap).  
3. Opcjonalnie: lewy/prawy fade shadow (jak tabs).  
4. Slot sticky: `paddingBottom: max(0.5rem, env(safe-area-inset-bottom))` — **nie dublować** dużego safe jeśli shell już insetuje nav; **zmierz** na Safari (AC).  
5. Content spacer: zamienić stałe `4.75rem` na **`calc(3.25rem + env(safe-area-inset-bottom))`** (1 rząd) **albo** CSS var `--tender-operator-bar-h` ustawiane z jednego rzędu.  
6. **Zero** zmian w `onUpload` / `onAnalyze` / `onExportPdf` / accept MIME.

---

## 3. Primary CTA — wersja mobile (zamrożona)

Dotyczy `TenderWorkflowPrimaryAction` gdy `commandLayerChrome` + viewport `max-lg` (lub `max-[430px]` spójnie z M-03).

| Element | BEFORE | AFTER (freeze) |
|---------|--------|----------------|
| Description | Widoczny / częściowo hidden @430 | **Zawsze ukryty** na `max-lg` (`sr-only` lub nie render) |
| Section label („GŁÓWNA AKCJA”) | Często sr-only @430 | **sr-only** na `max-lg` |
| Title | `line-clamp-1` długi | **`line-clamp-1`**, max ~28–36 znaków wizualnie; bez zwiększania H |
| Layout | flex wrap → 2 linie | **`flex-nowrap`**: title `min-w-0 flex-1` + button `shrink-0` |
| Wysokość karty | ~80–96px | **≤ 48–52px** (py-1.5, bez ciężkiego podwójnego opisu) |
| Border | `border-2` | Dopuszczalne **`border`** (1px) na mobile — mniej „kafelka” |
| Busy label | „Przetwarzam dokumenty…” | **„Przetwarzam…”** (krótki) + spinner |
| Handlers / navigate | bez zmian | bez zmian |

Desktop `lg+`: **bez regresji** (obecny chrome OK).

---

## 4. Process Strip — decyzja

| Opcja | Werdykt |
|-------|---------|
| Zawsze widoczny ribbon na mobile | **ODRZUCONE** — zjada ~50px + multi-nav |
| **Collapsed by default na `max-lg`** | **WYBRANE** |
| Usunąć całkowicie z mobile | ODRZUCONE — traci „Tu jesteś” |

### 4.1 Kontrakt collapse

1. Domyślnie: jeden kontroler **`Proces · {aktywny etap}`** (`min-h-[36px]`, pełna szerokość lub inline), `aria-expanded`.  
2. Expand: pokazuje obecny ribbon `TenderWorkflowProcessStrip variant="ribbon"` **w Command Layer** (lub w sheet — preferowane **inline expand**, bez nowego MUX sheet).  
3. Stan expand: **lokalny React state** (nie LS) — reset przy zmianie `tenderId` opcjonalnie.  
4. `lg+`: zachować obecne zachowanie (ribbon widoczny jak dziś w slotcie).  
5. Nawigacja etapów / `onNavigateTab`: **bez zmian semantyki**.

---

## 5. Shortcuts + Blockers (Command slot)

| Element | Freeze |
|---------|--------|
| Intelligence / Cost shortcut chips | **`hidden max-lg:flex` odwrócone → `hidden lg:flex`** (ukryte na mobile) |
| Blockers chip | **Zostaje** gdy `blockersCount > 0` (P1 informacja) |
| StatusRibbon | nadal `hidden 2xl` — bez zmian |

Uzasadnienie: skróty duplikują taby V4; first-screen = treść, nie trzeci poziom nav.

---

## 6. Finalny layout First Screen (hierarchia)

### 6.1 BEFORE

```text
┌ AdminTopbar ─────────────────────────────┐
│ [opcjonalnie BANNER notatki / sync]       │
├ Command Layer ───────────────────────────┤
│ ← Powrót          [Moduł]                 │
│ Tytuł                                     │
│ [Przetarg][Dokumenty][Kosztorys][Ceny]…   │
│ [Process strip ───────────────────→]      │
│ [Skrót Intelig.] [Skrót Koszt]            │
│ ┌ CTA card (title+desc+button) ─────────┐ │
│ └───────────────────────────────────────┘ │
├ scroll root ─────────────────────────────┤
│ (treść — często poniżej fold)             │
│ …                                         │
│ ▓▓▓ Operator wrap 2 rzędy ▓▓▓ (sticky)   │
└───────────────────────────────────────────┘
┌ AdminMobileNav ──────────────────────────┐
```

### 6.2 AFTER (zamrożone)

```text
┌ AdminTopbar ─────────────────────────────┐  ~100–115px
│ [banner — OUT logiki; jeśli jest, treść↓] │
├ Command Layer (≤200px target) ───────────┤
│ ← Powrót          [Moduł]                 │  44
│ Tytuł                                     │  20
│ [Przetarg][Dokumenty][Kosztorys][Ceny]…   │  46
│ [ Proces · Dokumenty ▾ ]                  │  36  ← collapsed
│ ┌ CTA compact: title ……… [Akcja →] ─────┐ │  48
│ └───────────────────────────────────────┘ │
├ scroll root · treść WIDOCZNA ────────────┤  ≥280px
│ ┌ status / hub / pierwsze karty ────────┐ │
│ │ właściwa treść above the fold         │ │
│ └───────────────────────────────────────┘ │
│ … scroll …                                │
│ ▓ Upload │ Analiza │ Eksport → (1 rząd) ▓ │  sticky A
└───────────────────────────────────────────┘
┌ AdminMobileNav ──────────────────────────┐  ~86
```

### 6.3 Hierarchia komponentów (mobile `max-lg`, tab Przetarg)

| # | Warstwa | Sticky/Fixed? | Widoczność first paint |
|---|---------|---------------|------------------------|
| 1 | `AdminTopbar` | shell | tak |
| 2 | Banners (admin) | shell | jeśli aktywne |
| 3 | Command: back/Moduł | shrink-0 | tak |
| 4 | Command: `h1` | shrink-0 | tak |
| 5 | `TenderDetailTabBar` | shrink-0 | tak |
| 6 | Process **collapsed** control | shrink-0 | tak (chip) |
| 7 | Primary CTA **compact** | shrink-0 | tak |
| 8 | **Content start** (`TenderDetailPanel` / hub) | scroll | **tak (AC)** |
| 9 | Operator Bar **A** | sticky bottom | tak (1 rząd) |
| 10 | `AdminMobileNav` | fixed | tak |

Decyzja sub-tabs / hub wewnętrzne zostają **w content** (nie w Command Layer).

---

## 7. BEFORE / AFTER (jakościowo)

| Aspekt | BEFORE | AFTER |
|--------|--------|-------|
| Co widać po wejściu | Głównie chrome + CTA | Tytuł + CTA kompakt + **treść** |
| Process | Pełny ribbon zawsze | Collapsed |
| Shortcuts | 2 chipy 44px | Ukryte mobile |
| CTA | Duża karta + opis | 1 rząd |
| Operator | Wrap 2–3 rzędy | 1 rząd scroll |
| Content % @390 | ~29% | ~44% (model) |
| Spacer PB | `4.75rem` vs real 2-row | Zgodny z 1-row |

---

## 8. Acceptance Criteria (Owner + emulacja)

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-1** | Po otwarciu detalu (tab Przetarg), **bez scroll**, widoczny fragment właściwej treści hub/workspace | Wymagane |
| **AC-2** | Command Layer (bez bannerów) **≤ 200px** @390 (±16px) | Wymagane |
| **AC-3** | Operator mobile = **jeden** rząd; brak wrap do 2. rzędu przy 3–4 akcjach | Wymagane |
| **AC-4** | CTA mobile: brak description; busy ≤ „Przetwarzam…” | Wymagane |
| **AC-5** | Process domyślnie collapsed; expand pokazuje etapy; nawigacja etapu działa | Wymagane |
| **AC-6** | Upload / Analiza / Eksport nadal dostępne i działają (bez zmiany logiki) | Wymagane |
| **AC-7** | Safe-area: home indicator nie zasłania etykiet OpBar ani nav (field Safari) | Field |
| **AC-8** | `lg+` bez regresji wizualnej Command / OpBar desktop slot | Wymagane |
| **AC-9** | Content visible ≥ **280px** @390 bez bannerów (DevTools measure) | Wymagane |

---

## 9. Lista plików do IMPLEMENT (po Owner GO)

| Plik | Zmiana |
|------|--------|
| `src/app/TenderWorkflowOperatorActionBar.tsx` | Mobile: nowrap + horizontal scroll; klasy przycisków |
| `src/app/TenderDetailPage.tsx` | Spacer PB 1-row; command slot: collapse process, hide shortcuts `max-lg`; opcjonalnie class scroll root |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Compact chrome mobile |
| `src/app/TenderDetailCommandLayer.tsx` | Tylko jeśli potrzeba drobnego spacing — preferuj slot w DetailPage |
| `src/app/TenderWorkflowProcessStrip.tsx` | Ewentualnie export trigger API / props `collapsed` — **lub** wrapper w DetailPage bez zmiany strip |
| `src/styles/mobile.css` | Tylko jeśli dodajemy utility pod fade OpBar / var wysokości — **minimalnie** |

**Nie ruszać:** `modal-scroll-lock.ts`, pipeline, scoring, CloudLoader, Payroll, upload handlers body.

**Docs po IMPLEMENT (osobne polecenie):** Owner Verification + status DF.

---

## 10. Ryzyko regresji

| Ryzyko | Mitigation |
|--------|------------|
| OpBar: użytkownik nie odkryje Eksport (scroll) | Fade shadow + AC field; fallback plan = wariant B |
| Collapse process: gorsza orientacja etapu | Chip pokazuje **aktywny** etap; expand 1 tap |
| Ukryte shortcuts: dłuższa ścieżka | Taby V4 wystarczą; blockers zostaje |
| CTA za krótki title | `title` attr / aria na pełny tekst |
| Spacer za mały → okluzja treści | AC-3 + measure; nie wracać do wrap |
| Spacer za duży → dead-space | Trzymać 1-row calc |
| Desktop regresja | Guard `max-lg` / `lg:hidden` istniejące ścieżki |
| iOS rubber-band | Nie dodajemy nowych sheetów; scroll root SSOT opcjonalnie |

---

## 11. Plan IMPLEMENT (po Owner GO — nie teraz)

```text
Etap 0  Owner GO na ten DF
Etap 1  Operator A + spacer (S02-OPBAR-HEIGHT)     → smoke 390
Etap 2  CTA compact (S02-CTA-DOMINANCE)            → smoke
Etap 3  Process collapse + hide shortcuts          → measure Command ≤200px
Etap 4  Opcjonalnie: detail scroll = .mobile-view-scroll
Etap 5  Emulacja 375/390/430 + checklist AC-1…9
Etap 6  Owner field Safari → PASS / FAIL
Etap 7  Commit / push TYLKO na osobne polecenie
```

**Kolejność w jednym PR dopuszczalna**, jeśli diff trzyma się §9 i Boundary.

---

## 12. Mapowanie na SAFARI-02

| ID audytu | Adresowane w MFS-01? |
|-----------|---------------------|
| S02-CHROME-BUDGET | **TAK** (główny cel) |
| S02-CTA-DOMINANCE / DESC-DUP | **TAK** |
| S02-OPBAR-HEIGHT | **TAK** (wariant A) |
| S02-MULTI-NAV | **Częściowo** (strip collapse + hide shortcuts) |
| S02-TAB-CLIP | Opcjonalnie P2 (krótki label) — nie blocker |
| S02-SCROLL-ROOT | Opcjonalnie Etap 4 |
| S02-LIST-DOUBLE-PB | **NIE** (OUT) |
| S02-SHEET-NOLOCK | **NIE** (MUX-B2) |
| S02-TOPBAR-CLUSTER | **NIE** (follow-up) |
| S02-BANNER-STACK | **NIE** (OUT logiki); budget liczony z bannerem w §1.5 |

---

## 13. Decyzje zamrożone (checklist Owner)

| # | Decyzja | Status |
|---|---------|--------|
| D1 | Cel = content above the fold, nie „ładniejszy pojedynczy widget” | **FREEZE** |
| D2 | Operator = **A Horizontal scroll** | **FREEZE** |
| D3 | CTA mobile compact bez description | **FREEZE** |
| D4 | Process Strip = **collapsed default** `max-lg` | **FREEZE** |
| D5 | Shortcuts ukryte `max-lg` | **FREEZE** |
| D6 | Target content ≥38% / ≥280px @390 | **FREEZE** |
| D7 | Zero business/pipeline/upload logic changes | **FREEZE** |
| D8 | IMPLEMENT tylko po Owner GO | **FREEZE** |

---

## 14. Podpis

| | |
|--|--|
| Ticket | **MOBILE-FIRST-SCREEN-01** |
| Faza | **DESIGN FREEZE READY** |
| IMPLEMENT | **BLOCKED** do Owner GO |
| Kod w tej sesji | **BEZ ZMIAN** |
| Commit / push | **NIE** |

**Koniec DESIGN FREEZE MOBILE-FIRST-SCREEN-01.**  
Oczekiwanie: **Owner GO** → IMPLEMENT według §11, albo korekta decyzji D2–D5.
