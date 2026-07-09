# M-03 — Mobile Re-certification · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0** · **BUNDLE CLOSED** · **PRODUCTION VERIFIED**  
> **Data freeze:** 2026-07-09 · **Data closeout:** 2026-07-09  
> **Bundle ID:** **M-03** (STABILIZATION WINDOW · maintenance)  
> **Class:** **FEATURE UI** · #CORE-013 · #CORE-014  
> **Baseline prod:** UI **2.63.79** · commit **`f7878fe`** · **PRODUCTION VERIFIED**  
> **Audyt:** M-03 AUDIT (2026-07-09) — **COMPLETE** · werdykt **WARN**  
> **PLAN:** M-03 PLAN (2026-07-09) — **APPROVED**  
> **Parent:** [`STABILIZATION-WINDOW-PLAN.md`](../STABILIZATION-WINDOW-PLAN.md) § M-03  
> **IMPLEMENT:** **CLOSED** — commits **`0f8a165`** (allowlist) + **`f7878fe`** (release)

```text
CEL FREEZE:
Usunąć breakpoint cliff 392px na Tender Workspace V4 —
spójny mobile chrome budget dla viewportów 360–430px
bez regresji HF-01 @390px.

WORKFLOW: AUDIT ✅ → PLAN ✅ → DESIGN FREEZE ✅ → ARCH REVIEW ✅
          → OWNER GO ✅ → IMPLEMENT ✅ → BUILD ✅ → TEST ✅
          → RELEASE ✅ → VERIFY ✅ → BUNDLE CLOSED ✅
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | Mobile chrome budget — Command Layer + shortcuts · `/przetargi/:tenderId/*` |
| **One Goal** | Breakpoint cliff **392px** — certyfikacja phone **360–430px** |
| **Nowe pole KV** | **Brak** |
| **Nowe tokeny** | **Brak** (`tender-ux-tokens.ts` — **TOKEN FREEZE**, import-only) |
| **Nowa logika biznesowa** | **Brak** — wyłącznie klasy CSS / visibility |
| **Wersja release** | **2.63.79** |
| **Findings zamknięte** | M03-WS-03 · M03-RSP-02 · M03-TCH-02 · M03-WS-04 · M03-SCR-02 |

### Final Decision

**DESIGN FREEZE v1.0 COMPLETE** — bundle **M-03 CLOSED** na prod **2.63.79** @ **`f7878fe`**.

---

## 1. Principles (frozen)

| ID | Zasada |
|----|--------|
| **#M03-001** | **Jedna strategia breakpointów** — trzy semantyczne progi (§2); zakaz nowych wartości ad-hoc (`391`, `390`, `431`). |
| **#M03-002** | **SSOT FIRST** — chrome budget = `test-p0-command-layer-height.mjs` + `e2e/audit-p0-tender-freeze.spec.ts`. |
| **#M03-003** | **REUSE FIRST** — rozszerzenie reguł HF-01; brak nowych komponentów. |
| **#M03-004** | **ZERO DUPLICATE LOGIC** — visibility KPI wyłącznie w jednym miejscu (`TenderDetailCommandLayer`). |
| **#M03-005** | **MOBILE FIRST** — AC weryfikowane na 360–430 przed desktop. |
| **#M03-006** | **TOKEN FREEZE** — brak edycji `tender-ux-tokens.ts`; import `TEUX_FONT_*` dozwolony. |
| **#M03-007** | **HF-01 non-regression** — @390px wszystkie AC-M03 **PASS** (REC-1 baseline). |

---

## 2. Semantyka breakpointów (frozen — jedna strategia)

### 2.1 Trzy progi (SSOT M-03)

| Symbol | Tailwind | Zakres | Semantyka | Zastosowanie |
|--------|----------|--------|-----------|--------------|
| **`#M03-BP-PHONE`** | `max-[430px]:` | **0–430px** | Phone compact chrome — audyt M-03 matrix | Density, touch shortcutów, ukrycie breadcrumb mobile, parity padding kosztorys |
| **`#M03-BP-DETAIL`** | `max-lg:` | **0–1023px** | Immersive detail chrome (mobile + tablet) | Ukrycie `TenderDetailKpiCompact` na tabach ≠ przetarg |
| **`#M03-BP-DESKTOP`** | `lg:` | **≥1024px** | Desktop Command Layer | Bez zmian semantyki poza KPI rule |

### 2.2 Mapowanie viewportów audytu

| Viewport audytu | `#M03-BP-PHONE` | `#M03-BP-DETAIL` | `#M03-BP-DESKTOP` |
|-----------------|-----------------|------------------|-------------------|
| 360 | ✅ | ✅ | — |
| 375 | ✅ | ✅ | — |
| 390 | ✅ | ✅ | — |
| 412 | ✅ | ✅ | — |
| 430 | ✅ | ✅ | — |
| 768 | — | ✅ | — |
| 820 | — | ✅ | — |

### 2.3 Migracja z HF-01 (frozen)

| As-is (HF-01) | To-be (M-03) | Plik |
|---------------|--------------|------|
| `max-[391px]:*` (density) | **`max-[430px]:*`** | `TenderDetailCommandLayer.tsx` |
| `max-[391px]:min-h-11` (shortcuts) | **`min-h-11 max-lg:min-h-8`** | `TenderDetailPage.tsx` |
| `max-[391px]:hidden` (KPI slot) | **`max-lg:hidden 2xl:block`** | `TenderDetailCommandLayer.tsx` L191 |
| `max-[391px]:gap-1` (shortcuts row) | **`max-[430px]:gap-1`** | `TenderDetailPage.tsx` L339 |

### 2.4 Zakaz w tym bundle

| Zakaz | Powód |
|-------|--------|
| Nowe progi (`max-[431px]`, `max-[390px]:` w plikach allowlist) | Jedna strategia §2.1 |
| Edycja `max-[390px]:` w ribbon/strip/tab bar/primary action | Poza scope PLAN |
| Media queries w nowych plikach | Allowlist cap |
| JS `window.innerWidth` / `matchMedia` | CSS-only |

---

## 3. Zamrożona specyfikacja zmian (per plik)

### 3.1 `src/app/TenderDetailCommandLayer.tsx`

#### 3.1.1 Root shell — parity phone padding (AC-M03-08)

**Frozen:** na `#M03-BP-PHONE` oba branchy (`compactKosztorysChrome` true/false) mają **identyczne** klasy phone:

```text
max-[430px]:px-3 max-[430px]:py-1 max-[430px]:space-y-1
```

Desktop branchy (`px-4 sm:px-6`, `py-1.5` vs `py-0.5`) — **bez zmian** poza zamianą `391` → `430` w istniejących regułach phone.

#### 3.1.2 Elementy — zamrożone klasy

| Element | As-is | Frozen to-be |
|---------|-------|--------------|
| Back button density | `max-[391px]:gap-1 max-[391px]:px-1.5` | `max-[430px]:gap-1 max-[430px]:px-1.5` |
| Module nav trigger | `max-[391px]:px-2` | `max-[430px]:px-2` |
| Module nav label „Moduł” | `max-[391px]:hidden` | `max-[430px]:hidden` |
| Breadcrumb mobile (`data-teux7b-mobile-context`) | `md:hidden max-[391px]:hidden` | `md:hidden max-[430px]:hidden` |
| Title density | `max-[391px]:text-[13px] max-[391px]:leading-snug` | `max-[430px]:text-[13px] max-[430px]:leading-snug` |
| **KPI Compact slot** (L190–194) | `max-[391px]:hidden xl:hidden 2xl:block` | **`max-lg:hidden 2xl:block`** |

#### 3.1.3 KPI Compact visibility (frozen logic)

```text
showKpiCompact && !przetargChrome
  → wrapper: max-lg:hidden 2xl:block
  → KPI widoczny TYLKO: viewport ≥1536px (2xl) AND tab ≠ przetarg
  → KPI ukryty: wszystkie viewports <lg (0–1023) oraz lg–xl–2xl na tab ≠ przetarg
```

**Uwaga frozen:** między `lg` (1024) a `2xl` (1536) KPI Compact na tab ≠ przetarg pozostaje **ukryty** — zamierzone (chrome budget > KPI na średnim desktop).

### 3.2 `src/app/TenderDetailPage.tsx`

#### 3.2.1 Shortcuts row (`data-tender-command-shortcuts-row`)

| Element | Frozen class fragment |
|---------|----------------------|
| Row gap | `max-[430px]:gap-1` (zamiast `max-[391px]:gap-1`) |
| Intelligence shortcut | `min-h-11 max-lg:min-h-8` + istniejące `TEUX_FONT_CAPTION` + border/bg |
| Cost shortcut | `min-h-11 max-lg:min-h-8` + istniejące `TEUX_FONT_CAPTION` + border/bg |

**Semantyka touch:** `min-h-11` (44px) na `#M03-BP-PHONE` i tablet detail (`max-lg`); `min-h-8` (32px) dopiero od `lg:` (desktop).

#### 3.2.2 Bez zmian (frozen)

| Element | Powód |
|---------|--------|
| `handleIntelligenceShortcutClick` / scroll root | HF-01 REC-1 — logika zamrożona |
| `TenderWorkflowPrimaryAction` props | Poza scope |
| `workspaceCommandSlot` composition | Poza scope |

---

## 4. Allowlist (frozen)

### 4.1 Produkcja — cap 2 pliki

| # | Plik | Klasa | Dozwolone zmiany |
|---|------|-------|------------------|
| 1 | `src/app/TenderDetailCommandLayer.tsx` | FEATURE UI | §3.1 wyłącznie |
| 2 | `src/app/TenderDetailPage.tsx` | FEATURE UI | §3.2 wyłącznie |

### 4.2 Testy / gates — cap 4 pliki

| # | Plik | Klasa | Dozwolone zmiany |
|---|------|-------|------------------|
| 3 | `scripts/test-p0-command-layer-height.mjs` | TEST | Markery `430` / `max-lg:hidden` KPI |
| 4 | `scripts/test-ng08-hf01-boundary.mjs` | TEST | Markery M-03 (bez zmiany forbidden list) |
| 5 | `e2e/audit-p0-tender-freeze.spec.ts` | TEST | Viewporty 412/430 + AC-M03-08 |
| 6 | `scripts/test-m03-mobile-recert.mjs` | TEST | **Nowy** — boundary gate M-03 (allowlist + markers) |

**Cap bundle:** **6 plików** · **1 commit** · `git add` wyłącznie pozycje 1–6.

### 4.3 Release docs (poza commitem kodu — osobna faza RELEASE)

| Plik | Kiedy |
|------|-------|
| `src/app/changelog-data.ts` | RELEASE (jeśli w allowlist release — **nie** w commicie IMPLEMENT) |
| `CHANGELOG.md` | RELEASE |

> **Frozen:** commit IMPLEMENT = **tylko** §4.1 + §4.2. Changelog w RELEASE GO.

### 4.4 Explicit forbidden (zero diff)

```text
src/lib/cloud-sync.ts
src/app/CloudLoader.tsx
src/app/App.tsx
src/app/hooks/useTenderPipelineRuntime.ts
src/app/hooks/useTenderDocumentsBootstrap.ts
src/app/tenders/strategy/hooks/useTendersPipeline.ts
src/lib/tender-workflow-primary-action.ts
src/lib/tender-ux-tokens.ts
src/lib/tender-detail-routes-v4.ts
src/lib/tender-command-layer-ux.ts
src/app/TenderStatusRibbon.tsx
src/app/TenderWorkflowProcessStrip.tsx
src/app/TenderDetailTabBar.tsx
src/app/TenderWorkflowPrimaryAction.tsx
```

---

## 5. Acceptance Criteria (frozen)

### 5.1 Runtime — chrome budget

| AC | Viewport(y) | Tab(y) | Kryterium | Finding |
|----|-------------|--------|-----------|---------|
| **AC-M03-01** | 360, 375, 390, 412, 430 | przetarg, dokumenty, kosztorys | `[data-tender-command-layer]` height **≤ 50vh** | M03-WS-03, M03-RSP-02 |
| **AC-M03-02** | 360, 375, 390, 412, 430 | przetarg, dokumenty, kosztorys | `[data-tender-detail-scroll-root]` height **> 120px** | M03-SCR-02 |
| **AC-M03-03** | 412, 430 | przetarg | Shortcuty `[data-tender-intelligence-shortcut]`, `[data-tender-cost-shortcut]` **≥ 44×44px** | M03-TCH-02 |
| **AC-M03-04** | 412, 430 | dokumenty, kosztorys | `[data-tender-kpi-compact]` **not visible** | M03-WS-04 |
| **AC-M03-05** | 390 | przetarg, dokumenty | AC-M03-01…04 **PASS** (HF-01 non-regression) | HF-01 REC-1 |
| **AC-M03-06** | ≥1536 (2xl) | dokumenty | `[data-tender-kpi-compact]` **visible** | Guard KPI desktop |
| **AC-M03-07** | 390 | dokumenty | KPI-UX-01: shortcut → `#tender-intelligence-hub` w scroll root viewport | NG-08-03 |

### 5.2 Runtime — tab height parity (nowy)

| AC | Viewport(y) | Tab(y) | Kryterium | Finding |
|----|-------------|--------|-----------|---------|
| **AC-M03-08** | **360, 375, 390, 412, 430** | **przetarg, dokumenty, kosztorys** | **Δ Command Layer ≤ 32px** — gdzie Δ = max(cmdH) − min(cmdH) mierzone na `[data-tender-command-layer]` po ustabilizowaniu layoutu (networkidle + 400ms) | ARCH HF01-007 successor |

**Definicja pomiaru AC-M03-08 (frozen):**

```text
dla każdego viewportu W ∈ {360,375,390,412,430}:
  H = { height(cmdLayer, tab=przetarg),
        height(cmdLayer, tab=dokumenty),
        height(cmdLayer, tab=kosztorys) }
  Δ(W) = max(H) - min(H)
  PASS ⟺ Δ(W) ≤ 32
```

**Weryfikacja:** `e2e/audit-p0-tender-freeze.spec.ts` (nowy test) lub `scripts/test-m03-mobile-recert.mjs` (marker + dokumentacja).

### 5.3 Static gates (BUILD PASS)

| AC | Runner | Oczekiwany wynik |
|----|--------|------------------|
| **AC-M03-10** | `npx vite-node scripts/test-p0-command-layer-height.mjs` | **PASS** |
| **AC-M03-11** | `npx vite-node scripts/test-ng08-hf01-boundary.mjs` | **PASS** |
| **AC-M03-12** | `npx vite-node scripts/test-m03-mobile-recert.mjs` | **PASS** |
| **AC-M03-13** | `npx playwright test e2e/audit-p0-tender-freeze.spec.ts --config=playwright.audit.config.ts` | **PASS** |
| **AC-M03-14** | `npx vite-node scripts/test-tender-command-teux7b.mjs` | **PASS** 32/32 |
| **AC-M03-15** | `npm run build` | **PASS** |

### 5.4 Gate B (RELEASE)

| AC | Runner | Oczekiwany wynik |
|----|--------|------------------|
| **AC-M03-16** | Gate B tenders | **15/15 PASS** |
| **AC-M03-17** | Gate B payroll | **16/16 PASS** |

---

## 6. Rollout (frozen)

| Krok | Akcja | Gate |
|------|-------|------|
| 1 | ARCH REVIEW PASS | Ten dokument + boundary |
| 2 | OWNER GO | ChatGPT / Owner |
| 3 | IMPLEMENT | 1 commit · allowlist §4 |
| 4 | BUILD PASS | AC-M03-10…15 |
| 5 | TEST PASS | AC-M03-01…08 · E2E prod/preview |
| 6 | RELEASE GO | Push `main` → Vercel auto-deploy |
| 7 | PRODUCTION VERIFIED | `curl https://www.wgdom.fun/version.json` → **2.63.79** |
| 8 | BUNDLE CLOSED | `CURRENT-TASK.md` · raport M-03 |

### 6.1 Wersja i changelog

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.79** |
| **Klasa release** | B — patch FEATURE UI (STABILIZATION maintenance) |
| **Label** | `M-03 — Mobile Re-certification (breakpoint cliff 392px)` |
| **Commit** | jeden · M-03 only |

### 6.2 VERIFY (frozen — workflow v2)

```bash
curl -s https://www.wgdom.fun/version.json
```

Sprawdź: `version` = **2.63.79** · `commit` = hash bundle.

**Zakaz:** deployment monitoring · wait for deploy poza standardowym VERIFY.

---

## 7. Rollback (frozen)

| # | Scenariusz | Akcja | Baseline |
|---|------------|-------|----------|
| 1 | Regresja chrome @390px | `git revert <M03-commit>` | **2.63.78** @ `4855a2d` |
| 2 | AC-M03-08 FAIL po deploy | revert + hotfix track | HF-01 baseline |
| 3 | KPI niewidoczny na 2xl | revert — reguła `2xl:block` | — |

**Komenda rollback:**

```bash
git revert <M03-commit-sha> --no-edit
# push po OWNER GO rollback
```

**Po rollback VERIFY:**

```json
{ "version": "2.63.78", "commit": "4855a2d" }
```

**Ryzyko rollback:** Brak migracji KV · brak zmian Edge · rollback = czysty revert CSS.

---

## 8. Ryzyka (frozen)

| ID | Ryzyko | P | Mitygacja |
|----|--------|---|-----------|
| **R-01** | Regresja HF-01 @390px | P0 | AC-M03-05 |
| **R-02** | AC-M03-08 FAIL — kosztorys compact branch | P1 | §3.1.1 padding parity |
| **R-03** | KPI ukryty lg–xl na tab ≠ przetarg | P2 | Zamierzone · AC-M03-06 tylko 2xl |
| **R-04** | Mixed bundle | P0 | Allowlist §4 · #CORE-013 |
| **R-05** | TOKEN thaw temptation | P1 | Forbidden `tender-ux-tokens.ts` |

---

## 9. Boundary Check (#CORE-013 / #CORE-014)

```text
BUNDLE:     M-03 Mobile Re-certification
EPIC:       STABILIZATION · Przetargi UX
CLASS:      FEATURE UI
VERSION:    2.63.79
DATE:       2026-07-09
```

| Check | Werdykt |
|-------|---------|
| #CORE-013 One Bundle · One Goal | **PASS** |
| #CORE-013 jeden commit | **PASS** (frozen) |
| #CORE-013 brak mixed CORE/FEATURE | **PASS** |
| #CORE-014 dominant FEATURE UI | **PASS** |
| #CORE-014 zero forbidden diff | **PASS** (plan) |
| TOKEN FREEZE | **PASS** |
| Protected Core untouched | **PASS** |

---

## 10. Workflow status

```text
M-03 AUDIT           ✅ COMPLETE (WARN)
M-03 PLAN            ✅ APPROVED
M-03 DESIGN FREEZE   ✅ v1.0 (ten plik)
M-03 ARCH REVIEW     ✅ PASS
OWNER GO             ✅ PASS
IMPLEMENT            ✅ CLOSED (0f8a165)
BUILD / TEST         ✅ PASS
RELEASE              ✅ CLOSED (f7878fe · 2.63.79)
PRODUCTION VERIFIED  ✅ PASS
BUNDLE               ✅ CLOSED
```

---

## 11. Następny krok

**Brak kolejnych kroków w ramach M-03.** Następny program w STABILIZATION WINDOW — **nowy bundle od AUDIT** + Owner GO.

---

*SSOT freeze M-03 · Baseline closeout: **2.63.79** @ **f7878fe** · AUDIT: 2026-07-09 · PLAN: 2026-07-09 · CLOSEOUT: 2026-07-09.*
