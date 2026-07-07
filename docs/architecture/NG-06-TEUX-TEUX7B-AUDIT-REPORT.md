# NG-06-TEUX — TEUX-7b Command Layer polish · AUDIT REPORT

> **Status:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (wymaga Owner GO)  
> **Tryb:** AUDIT ONLY · zero diff `src/` · zero BUILD/TEST/COMMIT/PUSH  
> **Data audytu:** 2026-07-07  
> **Baseline prod:** UI **2.63.60** · commit **`bc4b232`** · **TEUX-7a CLOSED** · **TOKEN FREEZE ACTIVE**  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) §2.7 · §2.11 M3/M8 · §4 TEUX-7b · §6 Protected Core  
> **NG-03 SSOT:** [`NG-03-DESIGN-FREEZE.md`](../NG-03-DESIGN-FREEZE.md) §2 Command Layer  
> **Poprzedni slice:** [`NG-06-TEUX-TEUX7A-CLOSEOUT.md`](./NG-06-TEUX-TEUX7A-CLOSEOUT.md)

```text
WERDYKT AUDYTU:  READY FOR OWNER GO (IMPLEMENT)
RYZYKO:          ŚREDNIE — collapsible vs AC „Strip+CTA zawsze visible” · regresja P0–P12 CTA
SCOPE CREEP:     WYSOKIE — jeśli refactor Process Strip / intelligence / Operator Bar w tym bundlu
TOKEN FREEZE:    ACTIVE — import tokenów OK · edycja tender-ux-tokens.ts ZAKAZANA
GAP G-10:        OPEN — CTA disabled bez reason → zamyka TEUX-7b (główny)
```

---

## 0. Cel audytu

Przeprowadzić **AUDIT warstwy Command Layer** (detal V4, tab Przetarg): CTA disabled reason (prezentacja), collapsible chrome ≤50vh, breadcrumb mobile context, tab bar scroll shadow — stan as-is @ **2.63.60**, gap vs Design Freeze, granice **#CORE-013 / #CORE-014**, wpływ **TOKEN FREEZE**, plan testu `LIB-TENDER-COMMAND-TEUX7B`.

**Poza audytem:** implementacja, BUILD, TEST, commit, push, TEUX-7c–7z, zmiana logiki `resolveOwnerNextAction` / pipeline / sync.

---

## 1. As-Is (@ 2.63.60 / `bc4b232`)

### 1.1 Mapa komponentów Command Layer

| Slot (NG-03 §2.2) | Komponent | Plik | Stan |
|-------------------|-----------|------|------|
| Nawigacja | Powrót + Moduł (`lg:hidden`) | `TenderDetailCommandLayer.tsx` L83–104 | ✅ TEUX-4 |
| Breadcrumb | 3-poziomowy `nav` | L106–125 | ⚠️ **`hidden md:flex`** na Przetarg — brak na mobile |
| Tytuł | `h1` line-clamp | L127–135 | ✅ density TEUX-4 |
| Tab bar | 5 tabów V4 + scroll | `TenderDetailTabBar.tsx` | ✅ shadow TEUX-4 |
| KPI Compact | 4 komórki | `TenderDetailKpiCompact.tsx` | ✅ ukryte na Przetarg/Kosztorys |
| Status Ribbon | Trust + Process Strip | `TenderStatusRibbon.tsx` | ✅ zawsze rozwinięty |
| Primary CTA | `TenderWorkflowPrimaryAction` | `TenderWorkflowPrimaryAction.tsx` | ⚠️ disabled bez visible reason |

**Montaż Przetarg:** `TenderDetailPage.tsx` L172–198 → `przetargCommandSlot` → `TenderDetailCommandLayer` L152.

### 1.2 CTA disabled — as-is

**SSOT logiki (nie zmieniać w TEUX-7b):** `src/lib/tender-workflow-primary-action.ts`

| Pole `WorkflowPrimaryActionView` | Wartość |
|----------------------------------|---------|
| `disabled` | `busy \|\| nextAction.informationalOnly` |
| `busy` | `autoRunning` / `dossierBuilding` / `dossierSaving` / `analyzing` / pending rows / P4 informational |
| `buttonLabel` | przy `busy` → `TENDER_OWNER_OPERATOR_COPY.analyzingDocuments` („Przetwarzam dokumenty…”) |

**UI (`TenderWorkflowPrimaryAction.tsx`):**

| Tryb | Disabled UX as-is |
|------|-------------------|
| `commandLayerChrome=true` (Przetarg) | Przycisk `disabled:opacity-60` · **brak** osobnej linii „dlaczego wyłączone” |
| Mobile ≤390px | Opis CTA `hidden` (`max-[390px]:hidden` na description) — user nie widzi `view.description` gdy disabled |
| `busy` | Etykieta przycisku zmieniona — **częściowy** sygnał |
| `informationalOnly` (nie busy) | Przycisk disabled + ta sama etykieta co aktywny — **GAP G-10** |

**Brak w repo:** `disabledReason`, `aria-describedby` dla CTA, `title` na disabled button.

### 1.3 Collapsible chrome / wysokość ≤50vh — as-is

| Element | As-is |
|---------|--------|
| `max-h-[50vh]` / `max-h-[280px]` na Command Layer | **BRAK** w CSS — tylko cele NG-03 (historyczny P0 changelog 2.63.x) |
| Collapsible ribbon / KPI / breadcrumb | **BRAK** — cały chrome zawsze expanded |
| Animacja `translateY` 200ms (DF §2.7) | **BRAK** |
| `prefers-reduced-motion` | **BRAK** w Command Layer collapse |
| Trust chips na mobile | Ukryte `max-[390px]:hidden` w `TenderStatusRibbon` — częściowa oszczędność wysokości |

**Szacunek chrome Przetarg @ 390px (always expanded):** Powrót+Moduł (~44px) + tytuł (~20px) + tab bar (~44px) + Process Strip (~36–48px) + CTA block (~56–72px) ≈ **200–228px** (~52–58% viewportu 844px) — **blisko/granicznie** limitu 50vh; dłuższy tytuł / sub-tab Decyzja / KPI na innych tabach mogą przekroczyć.

### 1.4 Breadcrumb mobile — as-is

```tsx
// TenderDetailCommandLayer.tsx L107–108
className={`${przetargChrome ? "hidden md:flex" : "hidden sm:flex"} ...`}
```

| Viewport | Przetarg | Inne taby |
|----------|----------|-----------|
| `< md` (mobile) | **Brak breadcrumb** | Brak `< sm` |
| `md+` | Pełny 3-poziomowy | `sm+` pełny |

**NG-03:** breadcrumb „opcjonalny — ukryty na mobile”. **TEUX-7b DF:** „breadcrumb **mobile context**” — interpretacja: **kompaktowy kontekst** (1 linia: BZP · tab), nie pełny desktop trail.

### 1.5 Tab bar scroll shadow — as-is

| Artefakt | Stan |
|----------|------|
| `useHorizontalScrollShadow` | ✅ `src/app/tenders/mobile/useHorizontalScrollShadow.ts` |
| `TenderDetailTabBar` | ✅ gradient L/R · `data-tender-detail-tabs-scroll-shadow` |
| Gate TEUX-4 | ✅ `LIB-TENDER-MOBILE-TEUX4` 27/27 |

**Wniosek:** M8 **zaimplementowany w TEUX-7b predecessor (TEUX-4)**. TEUX-7b = **regresja + ewentualne dopracowanie** (nie greenfield).

### 1.6 Zależności zamknięte

| Zależność | Status | Wpływ |
|-----------|--------|-------|
| TEUX-4 Mobile chrome | **CLOSED** | Sheet, density, scroll shadow baseline |
| TEUX-7a Lista filtry | **CLOSED** | Brak overlap — lista osobno |
| `test-tender-workflow-primary-action.mjs` | Istnieje | Regresja EPIC C — **obowiązkowa** przy TEUX-7b |
| TOKEN FREEZE | **ACTIVE** | `TEUX_FONT_*` import w Command Layer |

---

## 2. Gap Analysis

Legenda: ❌ GAP vs DF TEUX-7b · ⚠️ częściowy · ✅ OK / defer TEUX-4

| # | Wymaganie DF / AC | As-is | Gap | Priorytet IMPLEMENT |
|---|-------------------|-------|-----|---------------------|
| **T1** | CTA disabled **reason** (prezentacja only) | Opacity + busy label only | ❌ **G-10** | **P0** |
| **T2** | Chrome **≤50vh** mobile Przetarg | Brak enforcement / collapse | ❌ | **P0** |
| **T3** | **Process Strip + CTA** zawsze visible (AC) | Zawsze visible dziś | ✅ baseline — collapse musi **nie** chować Strip+CTA |
| **T4** | Collapsible chrome (ribbon / nadmiar) | Brak | ❌ | **P0** |
| **T5** | Breadcrumb **mobile context** | Ukryty `< md` | ❌ | **P1** |
| **T6** | Tab bar scroll shadow (M8) | TEUX-4 done | ✅ regresja only | **P2** |
| **T7** | Reguły P0–P12 CTA nietknięte | SSOT w `tender-intelligence-next-action.ts` | ✅ jeśli zero diff resolve | **gate** |
| **T8** | `prefers-reduced-motion` na collapse | Brak | ⚠️ opcjonalny DF §2.7 | **P2** |
| **T9** | Desktop ≤280px | Brak enforcement | ⚠️ opcjonalny | **P3** defer |

### 2.1 G-10 — CTA disabled bez reason (szczegóły)

| Scenariusz | `disabled` | Co widzi user dziś | Target TEUX-7b |
|------------|------------|--------------------|----------------|
| `busy` | true | Przycisk „Przetwarzam dokumenty…” + spinner | ✅ OK lub krótki hint pod tytułem |
| `informationalOnly` | true | Przycisk wyszarzony, ta sama etykieta akcji | ❌ **linia reason** z `view.description` lub dedykowany copy |
| `commandLayerChrome` + mobile | true | Brak description (ukryty) | ❌ **`data-teux7b-disabled-reason`** visible ≥11px |

**Rekomendacja implementacji (prezentacja only):**

- Dodać w `TenderWorkflowPrimaryAction.tsx` helper `resolvePrimaryActionDisabledReason(view)` — **bez** zmiany `buildWorkflowPrimaryActionView` logiki (opcjonalnie rozszerzyć view o `disabledReason?: string` **tylko** jeśli pochodzi z istniejących pól `description` / `buttonLabel` / `busy`).
- UI: `<p role="status" data-teux7b-disabled-reason>` pod tytułem gdy `view.disabled`.
- `aria-describedby` na przycisku CTA.

### 2.2 Collapsible chrome — propozycja architektury (AUDIT, nie kod)

```text
TenderDetailCommandLayer
  ├── [always] Powrót · Moduł · mobile breadcrumb (TEUX-7b)
  ├── [always] Tytuł · TabBar · (Decyzja sub-tab)
  ├── [collapsible] Status Ribbon — Trust (desktop) + opcjonalnie rozszerzenia
  │     └── toggle „Status procesu” / auto-collapsed default na mobile
  └── [always] przetargCommandSlot:
        ├── TenderWorkflowProcessStrip  ← ZAWSZE visible (AC)
        └── TenderWorkflowPrimaryAction ← ZAWSZE visible (AC)
```

- LS opcjonalny: `wg-tenders-command-ribbon-collapsed-v1` (UI-only, jak TEUX-7a).
- Animacja: `max-h` + `overflow-hidden` + `transition` ≤200ms lub `translateY` per DF §2.7.

### 2.3 Breadcrumb mobile — propozycja

Jedna linia `< md`:

```text
Przetargi › {bzpNumber|id} › {TAB_LABEL}
```

- `TEUX_FONT_CAPTION` · `truncate` · `aria-label="Kontekst przetargu"`.
- **Nie** duplikować pełnego desktop `nav` — osobny slot `data-teux7b-mobile-context`.

### 2.4 Tab bar scroll shadow — zakres TEUX-7b

| Akcja | Werdykt |
|-------|---------|
| Reimplement shadow | **NIE** — TEUX-4 CLOSED |
| Regresja w `LIB-TENDER-COMMAND-TEUX7B` | **TAK** — skopiować asercje z `test-tender-mobile-teux4.mjs` |
| Migracja tab → `TenderUxChip variant=moduleTab` | **DEFER** — kosmetyka; opcjonalnie P3, nie blokuje GO |

---

## 3. Scope (IN)

| IN | Pliki / obszar |
|----|----------------|
| CTA disabled reason UI | `TenderWorkflowPrimaryAction.tsx` (+ opcjonalnie cienki helper w `src/lib/tender-workflow-primary-action-display.ts` **prezentacja only**) |
| Collapsible ribbon (nie Strip/CTA) | `TenderStatusRibbon.tsx` · `TenderDetailCommandLayer.tsx` · opcj. `TenderCommandLayerCollapsibleSection.tsx` |
| Mobile breadcrumb context | `TenderDetailCommandLayer.tsx` |
| LS UI pref collapse | `TenderDetailPage.tsx` lub `src/lib/tender-command-layer-ux.ts` (nowy, UI-only) |
| Test + manifest | `scripts/test-tender-command-teux7b.mjs` · `test-infra/test-manifest.json` |
| CHANGELOG | **2.63.61** patch |
| Regresja | `scripts/test-tender-workflow-primary-action.mjs` (istniejący, bez diff logiki) |

**Szac. bundle:** **M** — 6–10 plików `src/` + test + manifest.

---

## 4. Out of Scope

| OUT | Powód |
|-----|--------|
| `resolveOwnerNextAction` / P0–P12 reguły | AC: logika nietknięta |
| `useTenderPipelineRuntime` / bootstrap / parser | Protected / pipeline |
| Operator Action Bar redesign | Osobny concern |
| `TenderWorkflowHubPanel` / hosted accordion | Poza Command Layer V4 |
| Lista filtrów / `TendersView` | TEUX-7a CLOSED |
| Copy „AI” / Strategia KPI | TEUX-7d / TEUX-7e |
| Pełny a11y `text-[9px]` sweep | TEUX-7c |
| `tender-ux-tokens.ts` thaw | TOKEN FREEZE |
| Tab bar shadow re-write | TEUX-4 — tylko regresja |

---

## 5. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| R1 | Collapse chowa Process Strip lub CTA | **Wysoki** | Allowlista: collapse **tylko** Trust / opcjonalny ribbon wrapper · AC test T3 |
| R2 | Dotknięcie `tender-workflow-primary-action.ts` logiki disabled | **Wysoki** | Prezentacja w komponencie · zero zmiany `disabled =` formuły |
| R3 | Regresja EPIC C / sticky CTA | Średni | Uruchomić `test-tender-workflow-primary-action.mjs` w gate |
| R4 | Layout shift przy collapse | Średni | `prefers-reduced-motion` · bez animacji na load danych |
| R5 | Scope creep Operator Bar / content accordions | Średni | **STOP** na Command Layer chrome only |
| R6 | Duplikacja TEUX-4 scroll shadow pracy | Niski | Tylko asercje regresji w TEUX-7b test |
| R7 | 50vh nadal przekroczone po collapse | Średni | Field screenshot S03 @ 390px · opcjonalny `max-h-[50dvh]` na `[data-tender-command-layer]` |

---

## 6. Boundary Check (#CORE-013 / #CORE-014)

### 6.1 #CORE-013 — jeden bundle, jeden commit

| Klasyfikacja | Pliki TEUX-7b (projekcja) |
|--------------|---------------------------|
| **FEATURE UI** | `TenderDetailCommandLayer.tsx` · `TenderWorkflowPrimaryAction.tsx` · `TenderStatusRibbon.tsx` · opcj. `tender-command-layer-ux.ts` · test · changelog |
| **MIXED** | **BLOCKED** — zero Payroll/sync/Edge w commicie |

**Werdykt (projekcja):** **PASS** przy allowliście §3.

### 6.2 #CORE-014 — FEATURE boundary

| Strefa | Dotyk TEUX-7b |
|--------|---------------|
| `cloud-sync.ts` / `CloudLoader` / Edge | ❌ **ZERO** |
| `useTenderPipelineRuntime.ts` | ❌ **ZERO** |
| `tender-intelligence-next-action.ts` (reguły P0–P12) | ❌ **ZERO** |
| `tender-workflow-primary-action.ts` | ⚠️ **tylko** opcjonalne pole `disabledReason` derived — prefer **zero diff** |
| `App.tsx` | ❌ **ZERO** |
| `TendersView.tsx` / lista filtrów | ❌ **ZERO** (TEUX-7a) |

**Werdykt (projekcja):** **PASS** jeśli disabled reason = warstwa prezentacji.

### 6.3 Protected Core

| Strefa | Werdykt |
|--------|---------|
| Payroll / PWRB / sync / bootstrap | **ZERO** |
| Pipeline NG-02 orchestrator | **ZERO** |
| Scoring / trust computation | **ZERO** — tylko istniejące props do ribbon |

---

## 7. Wpływ na TOKEN FREEZE

```text
STATUS: ACTIVE (bez zmian po TEUX-7a)

Dozwolone w TEUX-7b:
  ✓ Import TEUX_FONT_CAPTION / TEUX_FONT_TITLE / TEUX_TRANSITION_FAST / TEUX_DURATION_NORMAL
  ✓ Reuse TenderUxChip (moduleTab) — opcjonalnie, nie wymagane do GO

Zakazane:
  ✗ Edycja src/lib/tender-ux-tokens.ts
  ✗ Nowe tokeny typography bez thaw + Owner GO
```

---

## 8. Plan testów

### 8.1 `LIB-TENDER-COMMAND-TEUX7B` (nowy)

**Plik:** `scripts/test-tender-command-teux7b.mjs`

| # | Asercja |
|---|---------|
| A1 | `TenderWorkflowPrimaryAction` zawiera `data-teux7b-disabled-reason` lub `aria-describedby` wiring |
| A2 | Disabled reason render gdy `view.disabled` (grep pattern) |
| A3 | `TenderDetailCommandLayer` — `data-teux7b-mobile-context` lub equivalent mobile breadcrumb |
| A4 | Collapse toggle — `data-tender-command-collapsible` / `aria-expanded` na ribbon section |
| A5 | Process Strip + CTA **nie** wewnątrz collapsible region (struktura plików) |
| A6 | Regresja scroll shadow — `useHorizontalScrollShadow` w `TenderDetailTabBar` |
| A7 | `tokens frozen` — brak `teux7b` w `tender-ux-tokens.ts` |
| A8 | Forbidden libs untouched (cloud-sync, CloudLoader, pipeline hooks, App.tsx) |
| A9 | Brak diff markerów w `tender-intelligence-next-action.ts` |

### 8.2 Regresja obowiązkowa (gate B)

```bash
npx vite-node scripts/test-tender-command-teux7b.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npx vite-node scripts/test-tender-mobile-teux4.mjs          # scroll shadow + density
npm run test:infra -- --gate B --scope tenders
npm run test:infra -- --gate B --scope payroll              # 15/15
```

### 8.3 Manifest

Dodać do `test-infra/test-manifest.json`:

- `id`: `LIB-TENDER-COMMAND-TEUX7B`
- `path`: `scripts/test-tender-command-teux7b.mjs`
- suite: `lib-tender-command-teux7b`
- gate B `scope:tenders`

---

## 9. Allowlista IMPLEMENT (propozycja)

### 9.1 CREATE

| Plik | Rola |
|------|------|
| `scripts/test-tender-command-teux7b.mjs` | Gate TEUX-7b |
| `src/lib/tender-command-layer-ux.ts` | Opcjonalny: LS collapse + `resolvePrimaryActionDisabledReason` (prezentacja) |

### 9.2 MODIFY

| Plik | Dozwolony diff |
|------|----------------|
| `src/app/TenderDetailCommandLayer.tsx` | Mobile context line · collapse wrapper · data attrs |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Disabled reason UI · a11y |
| `src/app/TenderStatusRibbon.tsx` | Collapsible section (Trust opcjonalnie) |
| `src/app/TenderDetailPage.tsx` | Wire collapse state / LS hydrate |
| `test-infra/test-manifest.json` | Wpis TEUX-7b |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **2.63.61** |

### 9.3 NIE DOTYKAĆ

```text
src/lib/tender-ux-tokens.ts
src/lib/tender-intelligence-next-action.ts
src/lib/tender-workflow-primary-action.ts          ← prefer ZERO diff; UI-only w komponencie
src/app/hooks/useTenderPipelineRuntime.ts
src/app/hooks/useTenderDocumentsBootstrap.ts
src/app/tenders/strategy/hooks/useTendersPipeline.ts
src/lib/cloud-sync.ts · CloudLoader · Edge · App.tsx
src/app/TendersView.tsx · tenders/list/*           ← TEUX-7a
src/app/tenders/mobile/TenderModuleNavSheet.tsx    ← TEUX-4
```

---

## 10. Acceptance Criteria — mapa audytu → IMPLEMENT

| AC (DF §4 TEUX-7b) | As-is | Dowód IMPLEMENT |
|--------------------|-------|-----------------|
| Chrome ≤50vh | ⚠️ nie enforced | Collapse default + S03 field / opcj. `max-h-[50dvh]` |
| Process Strip + CTA always visible | ✅ | Test A5 — strip poza collapsible |
| CTA disabled reason | ❌ G-10 | Test A1–A2 |
| Breadcrumb mobile context | ❌ | Test A3 |
| P0–P12 nietknięte | ✅ | Zero diff intelligence + regresja workflow test |
| Tab scroll shadow | ✅ TEUX-4 | Test A6 regresja |

---

## 11. Rekomendacja

```text
╔══════════════════════════════════════════════════════════╗
║  TEUX-7b COMMAND LAYER POLISH — AUDIT COMPLETE           ║
╠══════════════════════════════════════════════════════════╣
║  GAP G-10 (CTA disabled reason)     OPEN → zamyka TEUX-7b ║
║  Collapsible chrome ≤50vh           OPEN                 ║
║  Breadcrumb mobile context          OPEN                 ║
║  Tab scroll shadow (M8)             CLOSED (TEUX-4)      ║
║  #CORE-013 / #CORE-014 (plan)       PASS (projekcja)     ║
║  TOKEN FREEZE                       ACTIVE               ║
╠══════════════════════════════════════════════════════════╣
║  REKOMENDACJA:  ★ READY FOR OWNER GO → IMPLEMENT         ║
║  WARUNEK GO:    prezentacja only · Strip+CTA zawsze ON   ║
║  NASTĘPNY:      Owner GO → IMPLEMENT TEUX-7b (bundle M) ║
╚══════════════════════════════════════════════════════════╝
```

**NOT READY** gdyby Owner wymagał jednocześnie: zmiany reguł P0–P12, thaw tokenów, lub merge z TEUX-7c/7d w jednym commicie.

**Owner action:** `GO IMPLEMENT TEUX-7b` · po IMPLEMENT: **2.63.61** · verify FAST `version.json`.

---

## 12. Powiązane

| Dokument | Rola |
|----------|------|
| [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) | §4 TEUX-7b · M3 · M8 |
| [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md) | G-10 |
| [`NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md`](./NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md) | Scroll shadow baseline |
| [`NG-06-TEUX-TEUX7A-CLOSEOUT.md`](./NG-06-TEUX-TEUX7A-CLOSEOUT.md) | Poprzedni slice CLOSED |
| [`NG-03-DESIGN-FREEZE.md`](../NG-03-DESIGN-FREEZE.md) | Command Layer §2 |
| [`WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) | Gate FEATURE |

---

*AUDIT ONLY · NG-06-TEUX · TEUX-7b Command Layer polish · 2026-07-07 · baseline prod 2.63.60 (`bc4b232`)*
