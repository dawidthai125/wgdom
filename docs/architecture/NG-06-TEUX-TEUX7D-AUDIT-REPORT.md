# NG-06-TEUX — TEUX-7d Copy integrity · AUDIT REPORT

> **Status:** **AUDIT COMPLETE** · **TEUX-7d CLOSED** (`129f22d` · 2.63.63)  
> **Tryb:** AUDIT ONLY · zero diff `src/` · zero BUILD/TEST/COMMIT/PUSH  
> **Data audytu:** 2026-07-07  
> **Baseline prod:** UI **2.63.62** · commit **`75f82f2`** · **TEUX-7c CLOSED** · **PRODUCTION VERIFIED** · **TOKEN FREEZE ACTIVE**  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7d · [`NG-06-TEUX-TEUX7D-AUDIT-READINESS.md`](./NG-06-TEUX-TEUX7D-AUDIT-READINESS.md)  
> **Poprzedni slice:** [`NG-06-TEUX-TEUX7C-CLOSEOUT.md`](./NG-06-TEUX-TEUX7C-CLOSEOUT.md)

```text
WERDYKT AUDYTU:  ★ READY FOR OWNER GO (IMPLEMENT)
RYZYKO:          NISKIE (bundle S) — copy-only · brak logiki pipeline/intelligence
SCOPE CREEP:     ŚREDNIE — pełny Strategia/Pulpit/legacy hosted → defer TEUX-7e/7f
TOKEN FREEZE:    ACTIVE — zero edycji tender-ux-tokens.ts
GAP G-03:        CZĘŚCIOWY — UI lista bez „AI” w treści · FAQ/docs nazewnictwo OPEN
```

---

## 0. Cel audytu

Ocena **copy integrity** modułu Przetargów (lista + workflow V4): user-facing „AI”, spójność komunikatów, CTA, empty states, tooltips, etykiety, parity mobile/desktop — stan as-is @ **2.63.62**, gap vs Design Freeze § TEUX-7d, granice **#CORE-013 / #CORE-014**, wpływ **TOKEN FREEZE**, plan `LIB-TENDER-COPY-TEUX7D`.

**Poza audytem:** implementacja, BUILD, TEST, commit, push, TEUX-7e/7f, pipeline/sync/payroll/Edge/App.tsx CORE.

---

## 1. As-Is (@ 2.63.62 / `75f82f2`)

### 1.1 User-facing „AI” — grep `src/` (runtime UI)

| Lokalizacja | Treść user-facing | Werdykt |
|-------------|-------------------|---------|
| `GuideView.tsx` L378 | FAQ **„Komunikaty AI (Lista)”** + „Heurystyki UX bez chmury **AI**” | ❌ **G-03** — jedyne literalne „AI” w UI workflow/lista |
| `TendersView.tsx` banner | Teksty z `buildTendersListAiInsight` — **bez** słowa „AI” | ✅ copy OK |
| `TendersView.tsx` | Ikona `Sparkles` przy bannerze + CTA | ⚠️ semantyka „AI” bez tekstu — opcjonalnie bez zmiany ikony |
| `tenders-strategy-ui-labels-pl.ts` | **„Wnioski AI”** | ➖ **OUT** → TEUX-7e (`tenders/strategy/**`) |
| `changelog-data.ts` | historyczne wpisy „AI” / COMMAND CENTER | ➖ tab Zmiany — **nie** lista/workflow live; opcjonalny skrót w nowym wpisie przy IMPLEMENT |
| `TenderWorkspaceTabBar` | Etykieta **„Intelligence”** (EN) z `TENDER_OWNER_TAB_LABELS` | ⚠️ legacy hosted (`embedV4ChromeHidden=false`) — defer **TEUX-7f** lub P2 |

**Wniosek:** AC DF „brak AI w UI listy/workflow” jest **prawie spełniony** w runtime copy bannera/CTA; **GAP** = FAQ Instrukcja + nazewnictwo dev (`aiInsight*`) + semantyka Sparkles.

### 1.2 Lista — banner insight (heurystyki)

**SSOT tekstu:** `src/lib/tenders-list-ux.ts` → `buildTendersListAiInsight()`

| Warunek | Przykładowy copy |
|---------|------------------|
| `needs_decision > 0` | „Masz dziś N przetargów wymagających decyzji.” |
| best opportunity | „Największy potencjał ma przetarg {label}.” |
| brak pilnych | „Nie wykryto pilnych zadań.” |
| terminy | „Przejrzyj kolejkę — są terminy do ogarnięcia.” |

| Aspekt | Stan |
|--------|------|
| Język | ✅ PL, operacyjny |
| Nazwa API | ⚠️ `TendersListAiInsight`, `buildTendersListAiInsight`, `aiInsightClass` — **nie** user-facing; rename opcjonalny w 7d |
| Interakcja | ✅ klik → kolejka „Do decyzji” gdy `bannerQueueAction` |
| Spójność z FAQ | ❌ FAQ mówi „AI”, UI mówi heurystyki — **G-03**

### 1.3 Workflow — CTA wording

**SSOT logiki (nie zmieniać):** `tender-workflow-primary-action.ts` · `tender-intelligence-next-action.ts`

| Warstwa | Copy as-is | Werdykt |
|---------|------------|---------|
| Nagłówek sticky | **„Główna akcja”** | ✅ spójne PL |
| `view.title` / `view.description` | z reguł P0–P12 | ✅ PL (np. „Pobierz dokumenty”, „Znajdź kosztorys”) |
| Disabled reason (7b) | `resolvePrimaryActionDisabledReason` | ✅ PL |
| Busy label | „Przetwarzam dokumenty…” | ✅ |
| Operator bar | `TENDER_OWNER_OPERATOR_COPY` | ✅ PL |
| Sparkles przy CTA | ikona dekoracyjna | ⚠️ jak banner — bez tekstu „AI” |

**Mobile/desktop parity (GAP copy):**

| Element | Desktop | Mobile ≤390px (command layer) | Werdykt |
|---------|---------|-------------------------------|---------|
| CTA `view.description` | widoczny | `hidden` (`max-[390px]:hidden`) | ⚠️ **P1** — user mobile nie widzi opisu akcji |
| CTA disabled reason (7b) | widoczny pod przyciskiem | widoczny (krótszy) | ✅ |
| Nagłówek „Główna akcja” | `text-[10px]` | `sr-only` na ≤390px | ⚠️ **P2** — etykieta sekcji ukryta na najwęższym mobile |

### 1.4 Empty-state wording

**SSOT:** `TenderUxEmptyState` (TEUX-6) — tytuły spójne „Brak …”

| Powierzchnia | Tytuł | CTA primary | Werdykt |
|--------------|-------|-------------|---------|
| Lista pusta baza | Brak aktywnych przetargów | Odśwież z BZP | ✅ |
| Lista filtry | Brak przetargów dla filtrów | Wyczyść filtry | ✅ |
| Dokumenty | Brak dokumentów | Wyszukaj zewnętrzne (warunkowo) | ✅ |
| Kosztorys | Brak kosztorysu | Przejdź do Dokumentów | ✅ |
| Mapa | Brak markerów we Wrocławiu | — | ✅ |
| Przetarg hub | Brak skróconych informacji z dokumentów | — | ✅ PL, bez „AI” |
| Zakres robót empty | Nie ustalono głównych grup robót… | — | ✅ |

**Wniosek:** empty states **CLOSED** po TEUX-6 — 7d tylko regresja grep, bez nowego SSOT.

### 1.5 Tooltip / title consistency

| Miejsce | `title` / tooltip | Widoczny label | Werdykt |
|---------|-------------------|----------------|---------|
| Odśwież BZP | „Odśwież z BZP” | „Odśwież” / „Pobieranie…” | ⚠️ **P2** — rozszerzenie OK, nie błąd |
| Analiza docs | `TENDER_OWNER_HINT_COPY.analyzeDocumentsTitle` | „Przeanalizuj dokumenty” | ✅ ten sam SSOT w Operator bar + BidPrep |
| Process strip stage | `presentation.title` = `aria-label` | etykieta etapu | ✅ (TEUX-7c) |
| Filtry preset pin | „Odepnij” / „Przypnij preset” | ikona | ✅ |
| Bulk toggle | aria-label pełny | „Zaznacz wiele” | ✅ (TEUX-7c) |

### 1.6 Etykiety zakładek / modułu

| SSOT | Wartość | Użycie V4 prod |
|------|---------|----------------|
| `TENDER_DETAIL_V4_TAB_LABELS` | Przetarg · Dokumenty · Kosztorys · Ceny · Decyzja | ✅ Tab bar detalu |
| `TENDERS_MODULE_LABELS` | Lista · Strategia · … | ✅ |
| `TENDER_OWNER_TAB_LABELS.overview` | **„Intelligence”** | ⚠️ tylko `TenderWorkspaceTabBar` hosted |
| `TENDER_INTELLIGENCE_SECTION_COPY.verdict` | „Werdykt” | ✅ Decyzja / hub |

### 1.7 Workspace insights (legacy V2 panel)

`buildWorkspaceV2Insights` — copy PL operacyjny („Wadium blokuje start.”, „Brak kosztorysu ATH…”). **Bez „AI”.** Panel `TenderWorkspaceV2Panel` — poza głównym V4 Command Layer path; **nie** priorytet 7d jeśli nie user-facing na prod V4.

---

## 2. Gap Analysis

| Gap ID | Opis | Priorytet | Stan @ 2.63.62 | Bundle |
|--------|------|-----------|----------------|--------|
| **G-03** | User-facing „AI” / mylące nazewnictwo | **P1** | CZĘŚCIOWY — FAQ OPEN; banner copy OK | **TEUX-7d** |
| **G-03a** | FAQ „Komunikaty AI” → „Komunikaty rekomendacji” / „Podpowiedzi listy” | P1 | OPEN | 7d |
| **G-03b** | Rename `aiInsight*` → `listInsight*` (dev clarity) | P2 | OPEN opcjonalny | 7d |
| **G-03c** | Sparkles bez zmiany vs zamiana ikony | P3 | OPEN — Owner | opcjonalny |
| **G-COPY-01** | CTA description ukryty mobile command layer | P1 | OPEN | 7d (copy/layout prezentacja) |
| **G-COPY-02** | „Główna akcja” sr-only na ≤390px | P2 | OPEN | 7d opcjonalny |
| **G-COPY-03** | EN „Intelligence” legacy tab | P2 | OPEN | defer **7f** |
| **G-COPY-04** | „Wnioski AI” Strategia | P1 | OPEN | defer **7e** |

---

## 3. Ryzyka

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Scope creep → Strategia/Pulpit/CC rebrand | **Średnie** | Allowlista plików §5 · defer 7e |
| Rename symboli `aiInsight` → regresja importów | **Niskie** | Tylko 2 pliki + test statyczny |
| Zmiana logiki `buildTendersListAiInsight` | **Wysokie** jeśli dotknięte | **ZAKAZ** — copy/FAQ/nazwy only |
| Fałszywe alarmy testu grep („EMAIL”, „DETAIL”) | **Niskie** | `\bAI\b` + allowlista plików |
| Mylenie „Rekomendacja systemu” z chmurą AI | **Niskie** | FAQ explicit: heurystyki lokalne |

---

## 4. Boundary Check (#CORE-013 / #CORE-014)

### 4.1 #CORE-013 — Runtime Freeze (jeden cel / jeden commit)

| Check | Werdykt |
|-------|---------|
| Bundle = wyłącznie copy / FAQ / rename prezentacyjny | **PASS** (projekcja) |
| Brak diff `cloud-sync.ts`, `CloudLoader`, Edge, payroll | **PASS** |
| Brak mixed bundle z TEUX-7e/7c | **PASS** — osobny commit 7d |
| Szac. plików `src/` | **4–8** (bundle **S**) |

### 4.2 #CORE-014 — FEATURE Boundary Check

| Check | Werdykt |
|-------|---------|
| Klasa bundle | **FEATURE UI** (copy) |
| Allowlista zgodna z DF § TEUX-7d | **PASS** (projekcja §5) |
| Brak `tenders/strategy/**` | **PASS** |
| Brak `tender-ux-tokens.ts` edit | **PASS** |
| Brak `resolveOwnerNextAction` / pipeline | **PASS** |

### 4.3 Protected Core — potwierdzenie

**Brak wymaganych zmian** w: `useTenderPipelineRuntime`, `useTenderDocumentsBootstrap`, `App.tsx` CORE, sync merge.

---

## 5. TOKEN FREEZE impact

| Element | Wpływ TEUX-7d |
|---------|----------------|
| `tender-ux-tokens.ts` | **ZERO** — import only, bez edycji |
| Typography w CTA mobile | ewentualne klasy Tailwind lokalne w `TenderWorkflowPrimaryAction.tsx` — **OK** bez thaw |
| `TenderUxChip` / empty state | bez zmian tokenów |

---

## 6. Proponowany zakres IMPLEMENT (po Owner GO)

### 6.1 IN scope

| Plik | Zmiana |
|------|--------|
| `src/app/GuideView.tsx` | FAQ: „Komunikaty AI” → SSOT copy bez „AI”; doprecyzowanie heurystyk |
| `src/lib/tenders-list-ux.ts` | Opcjonalny rename typu/funkcji `*AiInsight*` → `*ListInsight*` (**bez** zmiany tekstów) |
| `src/app/TendersView.tsx` | Rename `aiInsightClass` / zmienne; opcjonalnie `data-teux7d-list-insight` |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Copy parity mobile: pokazać skrócony opis lub `line-clamp-2` zamiast `hidden` |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | Wpis **2.63.63** przy IMPLEMENT |
| `scripts/test-tender-copy-teux7d.mjs` | Nowy gate |
| `test-infra/test-manifest.json` | `LIB-TENDER-COPY-TEUX7D` + gate B tenders |

### 6.2 OUT of scope (explicit defer)

| Obszar | Defer |
|--------|-------|
| `tenders/strategy/**`, `tenders-strategy-ui-labels-pl.ts` („Wnioski AI”) | **TEUX-7e** |
| Pulpit KPI / Action Center copy | **TEUX-7e** |
| Legacy hosted `TenderWorkspaceTabBar` „Intelligence” | **TEUX-7f** |
| Historyczne wpisy `changelog-data.ts` | nie edytować |
| Marka COMMAND CENTER AI (archiwum CC) | poza listą/workflow V4 |
| `tender-intelligence-*.ts` logika / nazwy typów | poza copy pass |

---

## 7. Test plan — `LIB-TENDER-COPY-TEUX7D`

**Runner:** `npx vite-node scripts/test-tender-copy-teux7d.mjs`  
**Gate:** `npm run test:infra -- --gate B --scope tenders` (po dodaniu do manifestu)

| ID | Asercja |
|----|---------|
| T1 | `GuideView` — brak `\bAI\b` w sekcji Przetargi FAQ (lub tylko dozwolone frazy po DF) |
| T2 | Allowlista UI: `TendersView`, `TenderWorkflowPrimaryAction`, `TenderPrzetargWorkspace`, `TenderListFiltersPanel` — brak `\bAI\b` w string literals |
| T3 | `buildTendersListAiInsight` / rename — teksty output bez „AI” |
| T4 | `tender-ux-tokens.ts` — brak `teux7d` / bez diff markerów |
| T5 | Forbidden: `cloud-sync.ts`, `App.tsx`, `useTenderPipelineRuntime` — brak `teux7d` |
| T6 | `tenders/strategy/**` — **nie** wymagane zmiany (regresja: brak importu test-only) |
| T7 | `TENDER_DETAIL_V4_TAB_LABELS` — PL etykiety bez „Intelligence” |
| T8 | Regresja: `LIB-TENDER-A11Y-TEUX7C`, `LIB-TENDER-COMMAND-TEUX7B`, `LIB-TENDER-FILTERS-TEUX7A` |

**Regresja obowiązkowa:** gate B tenders + payroll 15/15 (#TEUX-013).

---

## 8. Workflow po audycie

```text
AUDIT TEUX-7d  ✅ (ten dokument)
     ↓
PLAN           — allowlista plików + mapa stringów (Owner review)
     ↓
DESIGN FREEZE  — delta copy SSOT (tabela stary→nowy) · jeśli Owner wymaga nowych fraz
     ↓
ARCH REVIEW    — krótki (bundle S)
     ↓
OWNER GO
     ↓
IMPLEMENT      — jeden commit · 2.63.63
```

**Proponowany SSOT copy (draft — do zatwierdzenia Owner):**

| Było | Propozycja |
|------|------------|
| „Komunikaty AI (Lista)” | **„Podpowiedzi listy (rekomendacje)”** |
| „…bez chmury AI” | **„…reguły lokalne w aplikacji (bez zewnętrznego modelu)”** |
| `aiInsight` (kod) | `listInsight` (opcjonalnie) |

---

## 9. Acceptance Criteria (DF § TEUX-7d) — projekcja

| AC | Audyt |
|----|-------|
| Brak „AI” w UI listy/workflow user-facing | **CZĘŚCIOWY** — FAQ OPEN |
| HelpView FAQ zsynchronizowany | **OPEN** |
| `LIB-TENDER-COPY-TEUX7D` | **PLAN** — brak skryptu |
| #CORE-013 / #CORE-014 | **PASS** (projekcja) |
| TOKEN FREEZE | **PASS** |
| Zero logiki intelligence/pipeline | **PASS** |

---

## 10. Rekomendacja

```text
╔══════════════════════════════════════════════════════════╗
║  TEUX-7d COPY INTEGRITY — AUDIT COMPLETE                 ║
╠══════════════════════════════════════════════════════════╣
║  G-03 user-facing „AI”     CZĘŚCIOWY (FAQ + nazwy kodu)  ║
║  Lista banner copy         OK (heurystyki PL)              ║
║  Empty states              OK (TEUX-6 SSOT)                ║
║  CTA mobile parity         OPEN (opis ukryty ≤390px)     ║
║  Strategia „Wnioski AI”    DEFER → TEUX-7e               ║
║  #CORE-013 / #CORE-014     PASS (projekcja)              ║
║  TOKEN FREEZE              ACTIVE                        ║
╠══════════════════════════════════════════════════════════╣
║  REKOMENDACJA:  ★ READY FOR OWNER GO → IMPLEMENT         ║
║  BUNDLE:        S (4–8 plików src/)                      ║
║  WARUNEK GO:    bez Strategii · bez thaw tokenów         ║
╚══════════════════════════════════════════════════════════╝
```

**NOT READY** gdyby Owner wymagał jednocześnie: pełnego rebrandu Strategii („Wnioski AI”), zmiany logiki `buildTendersListAiInsight`, lub merge z TEUX-7e w jednym commicie.

---

## 11. Powiązane

| Dokument | Rola |
|----------|------|
| [`NG-06-TEUX-TEUX7D-AUDIT-READINESS.md`](./NG-06-TEUX-TEUX7D-AUDIT-READINESS.md) | Wejście audytu |
| [`NG-06-TEUX-TEUX7C-CLOSEOUT.md`](./NG-06-TEUX-TEUX7C-CLOSEOUT.md) | Poprzedni slice VERIFIED |
| [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md) | G-03 |
| [`NG-06-TEUX-TEUX7A-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7A-AUDIT-REPORT.md) | Banner defer 7d |

---

*AUDIT ONLY · NG-06-TEUX · TEUX-7d Copy integrity · 2026-07-07 · baseline prod 2.63.62 (`75f82f2`)*
