# WM-RYSUNKI-MOBILE-01 MOBILE-P1 — DESIGN FREEZE (THIN)

> **STATUS:** **DESIGN FREEZE · FROZEN**  
> **ID:** WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P1**  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DOCS ONLY · **NO IMPLEMENT** do Owner GO IMPLEMENT · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04 · **thin amend AR:** 2026-08-04 (D-M1-02 default export · D-M1-08 CTM REUSE)  
> **Następne:** Owner **GO IMPLEMENT** (po AR PASS) · AR → [`WM-RYSUNKI-MOBILE-01-P1-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-P1-ARCHITECTURE-REVIEW.md)  
> **Reuse:** `.touch-target` (`mobile.css`) · Ghost OUT export pattern (P3B) · `clientToSvgPoint` + CTM · portal FS P0  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P1 DESIGN FREEZE — FROZEN (THIN)

IN:
  edit-only hitboxes · mode edit|export
  44×44 (tools · Lista/Final · selection · zoom ±/Reset)
  toolbar mobile · selection toolbar
  window.prompt → inline/modal
  create menu mobile UX
  D-M1-08 hit użyteczny przy zoom/pan P0 (viewport)

OUT:
  JSON · Cloud · PDF/ZIP semantics · Ghost/P3B.1
  Payroll · AI · CORE · P2 landscape/orientation

P0 shell = REUSE (nie reimplement)
AR: PASS WITH DF CORRECTIONS (amend done) → READY IMPLEMENT
IMPLEMENT: zakazany do Owner GO IMPLEMENT P1
════════════════════════════════════════════════════════
```

---

## 0. Cel slice (1 zdanie)

**MOBILE-P1** czyni edycję Rysunków na telefonie **trafialną i sterowalną** (hit ≥ touch, chrome ≥44px, input bez `window.prompt`, create menu w viewport) — **bez** zmiany JSON/sync/PDF/ZIP/Ghost oraz **bez** P2 landscape.

### 0.1 Relacja dokumentów

| Dokument | Rola |
|----------|------|
| Epic DF | SSOT decyzji mobile całego EPIC · **FROZEN** |
| **Ten plik** | **SSOT slice MOBILE-P1** — wygrywa konflikty **wewnątrz P1**; nie otwiera P2 |
| P1 AUDIT | Wejście evidence · **ACCEPTED** |
| P0 CLOSE / DF | Shell portal/gesty/zoom — **REUSE**, nie dublować |

**Konflikt P1 vs epic DF:** ten plik doprecyzowuje (D-M1-08 · AC zoom chrome). Semantyka wall/Ghost/PDF = WM-RYSUNKI-01.

### 0.2 Zasady FROZEN

| Zasada | Wiązanie |
|--------|----------|
| **SSOT FIRST** | JSON `WmTechnicalDrawing` — **zero** schema bump |
| **REUSE FIRST** | `.touch-target` · CTM/`clientToSvgPoint` · Ghost OUT → hit OUT export · P0 portal/surface |
| **ZERO DUPLICATE** | Jeden `mode` na render · hit tylko edit |
| **THIN SLICE** | Tylko D-M1-01…08 · bez landscape/history/PDF preview polish |

---

## 1. PAYROLL SAFETY GATE

```text
PAYROLL SAFETY GATE — MOBILE-P1

G1–G9: FEATURE thin · UI/hit/input only
Cloud drawings / merge / DATA_KEY: ZERO
schemaVersion / normalize / types shape: ZERO
PDF/ZIP fingerprint / folder rules: ZERO (tylko mode:"export" wire)
Ghost / P3B.1 finishLine STOP: ZERO zmian semantyki
Payroll / AI / CORE: OUT
P2 landscape / orientation / history: OUT

Wynik: FEATURE mobile hit/chrome/input only
```

---

## 2. Scope IN / OUT (FROZEN)

### 2.1 IN — decyzje D-M1

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **D-M1-01** | Touch hitboxes | Invisible hit geometry **edit-only** (`data-hit` / szeroki transparent stroke lub równoważny pad) dla wall · dimension · arrow · door/window/stamps · text (min. pad). |
| **D-M1-02** | Render mode | `renderDrawingSvg({ mode: "edit" \| "export" })` (lub równoważne). Hit **tylko** `edit`. **Default `mode` = `"export"`** (fail-safe — istniejący `export-pdf` bez zmian wywołania nadal bezpieczny). Editor preview **musi** jawnie podać `mode: "edit"`. PDF/ZIP path = **`export`** · **zero** hit w stringu SVG. |
| **D-M1-03** | Min touch 44×44 | Chrome ≥ **44×44 CSS px** (REUSE `.touch-target` / `min-h-[44px] min-w-[44px]`): Lista · Final · Duplikuj · Usuń (panel) · tool buttons · selection actions · **zoom ± · Reset** (chrome P0). |
| **D-M1-04** | Toolbar mobile | `<md` / `mobileFullscreen`: większe cele · `title`/`aria-label` · **horizontal scroll ALBO 2-row wrap** — **zakaz** ucinania narzędzi poza reach. |
| **D-M1-05** | Selection toolbar | Te same 44px · Obrót / Duplikuj / Usuń / flip drzwi — reachability na telefonie. |
| **D-M1-06** | `window.prompt` OUT | Wymiar „Długość” + Tekst → **inline field lub thin modal** w edytorze (w FS portal). **Zakaz** `window.prompt` w ścieżce Rysunki. Desktop: ten sam UI (AC regresja). |
| **D-M1-07** | Create menu | Lista: menu **w viewport** · outside-click i/lub close · safe-area · prefer **bottom-sheet / anchored** — **zakaz** gołego `absolute` uciętego poza ekran. |
| **D-M1-08** | Hit @ P0 zoom/pan | Hit-test **względem aktualnego viewportu** przez **REUSE** `clientToSvgPoint` + `svg.getScreenCTM()` (CTM obejmuje CSS `transform` na wrapperze zoom/pan P0). Hit overlays w **SVG user units** (stały/min pad). Użyteczność selekcji przy zoom ≠ 1. Hit **nie** wpływa na export SVG / PDF / ZIP. **Zakaz** zapisu skali/hitów do JSON. **OUT P1:** dynamiczny pad ≈ stałe px ekranu (`stroke ∝ 1/viewScale`) — tylko jeśli AR/OV wykaże FAIL AC-M1-07 przy samym padzie SVG. |

### 2.2 OUT (twarde · P1)

| OUT | Powód |
|-----|-------|
| JSON `schemaVersion` / shape / normalize breaking | Model frozen |
| Cloud Sync / merge drawings / Edge | Stabilization |
| PDF/ZIP **semantics** / fingerprint / folder rules | P2/P3 CLOSED — tylko thin `mode:"export"` |
| Ghost / P3B.1 wall STOP / continuous | CLOSED |
| Payroll / AI / CORE | Zakaz |
| **P2** landscape / orientation / history-back / PDF preview polish / z-index contract / hover cleanup / mid-draw cancel UI | Osobny slice |
| CAD / DXF / multi-select / layers | Poza EPIC |
| Reimplement P0 portal / gesture / zoom clamp lib | REUSE P0 |
| Zmiana default `wmRysunkiEnabled` | P1B policy |

---

## 3. Boundary (FROZEN)

```text
┌─ P0 shell (REUSE) ──────────────────────────────────┐
│ createPortal body · modal-lightbox · app-height     │
│ .wm-drawing-surface · touch-action · zoom/pan CSS   │
│   └─ SVG render ──────────────────────────────────┐ │
│        mode:"edit"  → visual + data-hit overlays  │ │
│        mode:"export"→ visual only (PDF/ZIP)       │ │
│        hit-test ← clientToSvgPoint(CTM + zoom)    │ │
│   └─ chrome 44px · toolbar · selection · input    │ │
└───────────────────────────────────────────────────┘ │
Lista (poza FS): create menu D-M1-07                  │
DATA JSON: bez zmian · zoom/hit ephemeral             │
GHOST / wall STOP: bez zmian                          │
└─────────────────────────────────────────────────────┘
```

| Granica | Reguła |
|---------|--------|
| Edit SVG | Może zawierać `data-hit` / niewidoczne stroke |
| Export SVG | **Identyczny kontrakt wizualny** tip — **bez** hit |
| Desktop `≥md` | P3B.1 + nowy UI wymiar/tekst PASS · bez wymogu FS |
| Mobile `<md` | FS P0 + P1 hit/chrome/input |
| Zoom state | Ephemeral P0 — hit musi działać; **nie** JSON |

---

## 4. Risks (FROZEN awareness)

| ID | Ryzyko | Mitygacja DF |
|----|--------|--------------|
| **R-01** | Hit w PDF/ZIP | `mode:"export"` · smoke: brak `data-hit` w export string |
| **R-P1-01** / **D-M1-08** | Hit przy zoom≠1 / pan | CTM + test zoom in/out + select |
| **R-P1-02** | Toolbar overflow w FS | D-M1-04 wrap lub scroll |
| **R-P1-03** / **R-07** | Modal + iOS keyboard w portal | Thin modal · visualViewport / keyboard-inset REUSE |
| **R-08** | Regresja Ghost/P3B.1 | Smoke P3B.1 · zero change `clearWallPreview` |
| **R-P1-05** | Redesign całego desktop chrome | Mobile-first / `mobileFullscreen` · desktop PASS only |
| **R-02** | `touch-action` na listę | Scope surface — create menu poza surface |

---

## 5. Acceptance Criteria (FROZEN)

| AC | Kryterium |
|----|-----------|
| **AC-M1-01** | Selekcja ściany / wymiaru / strzałki / stamp palcem możliwa (edit hit) |
| **AC-M1-02** | PDF / ZIP / `mode:"export"` **bez** `data-hit` / widocznych hit overlays |
| **AC-M1-03** | Tool · Lista · Final · selection · **zoom ± · Reset** ≥ **44×44** CSS px |
| **AC-M1-04** | Zero `window.prompt` w flow wymiar / tekst (źródło editor) |
| **AC-M1-05** | Create menu w pełni w viewport + zamknięcie outside i/lub jawny close |
| **AC-M1-06** | Desktop: wymiar / tekst nowym UI PASS · P3B.1 wall STOP PASS |
| **AC-M1-07** | Przy zoom ≠ 1 (P0 ±): selekcja obiektu palcem / pointerem **PASS** (D-M1-08) |
| **AC-M1-08** | Regresja P0: portal FS · scroll lock · pan/zoom Reset nadal PASS |

---

## 6. File Allowlist (FROZEN)

### 6.1 IN

| Plik | Rola |
|------|------|
| `src/app/WmPrintDrawingEditor.tsx` | Toolbar 44px · selection · prompt→inline/modal · hit-test wiring |
| `src/app/WmPrintDrawingsPanel.tsx` | Lista/Final 44px · create menu UX |
| `src/lib/wm-technical-drawings/render-svg.ts` | `mode` + hit overlays |
| `src/lib/wm-technical-drawings/symbols/render-symbol.ts` | hit padding stamps |
| `src/lib/wm-technical-drawings/symbols/index.ts` | **tylko jeśli** hit defs |
| `src/lib/wm-technical-drawings/export-pdf.ts` | thin wire `mode:"export"` jeśli potrzeba |
| `src/styles/mobile.css` | ○ opcjonalnie reuse `.touch-target` / helper |
| `scripts/test-wm-rysunki-mobile-p1.mjs` | **NEW** smoke |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | bump UI przy GO COMMIT |

### 6.2 OUT — zakaz

| Plik / obszar |
|---------------|
| `cloud-sync.ts` · Edge · `merge.ts` drawings |
| `types.ts` schema bump · `normalize.ts` breaking |
| `wall-preview.ts` semantyka Ghost |
| `zip-entries.ts` kontrakt |
| `drawing-viewport.ts` — **nie** zmieniać clamp P0 bez regresji |
| `Payroll*` · AI · `app-viewport.ts` rewrite |
| P2-only UI (landscape chrome, history.pushState, …) |
| Niepowiązany WIP |

**Changelog:** bump przy Owner GO COMMIT P1 (konwencja repo).

---

## 7. Release Plan (FROZEN)

| Krok | Warunek | Deliverable |
|------|---------|-------------|
| 1 | Ten DF **FROZEN** | Owner **GO ARCHITECTURE REVIEW** |
| 2 | AR **PASS** | Owner **GO IMPLEMENT P1** |
| 3 | Implement + build + `test-wm-rysunki-mobile-p1` + P3B.1 | Owner **OV** (device + desktop) |
| 4 | OV PASS | Owner **GO COMMIT** → **PUSH** → **PV** → **CLOSE P1** |
| 5 | P1 CLOSED | **WAITING** Owner GO AUDIT **MOBILE-P2** (nie auto) |

```text
ZAKAZ:
  · implement bez GO IMPLEMENT P1
  · łączenie P1+P2 w jednym release
  · commit/push bez Owner GO
```

**Tryb release:** **FAST RELEASE** (&lt;15 plików, jeden bundle) — potwierdzić w raporcie.

---

## 8. Test Plan (FROZEN)

### 8.1 Automat / smoke

| Test | Cel |
|------|-----|
| `scripts/test-wm-rysunki-mobile-p1.mjs` **NEW** | edit SVG ma hit · export **nie** · brak `window.prompt` w editor · mode default export-safe |
| `test-wm-rysunki-mobile-p0.mjs` | Regresja P0 shell |
| `test-wm-rysunki-01-p3b1.mjs` | Ghost/STOP |
| `npm run build` | PASS |

### 8.2 Desktop regresja

| # | Scenario | Expect |
|---|----------|--------|
| D1 | Wall 2-click STOP P3B.1 | PASS |
| D2 | Wymiar / tekst bez `window.prompt` | PASS |
| D3 | PDF preview/download bez hit artefacts | PASS |
| D4 | ≥md bez force portal | PASS |

### 8.3 Device / mobile (Owner OV)

| # | Scenario | Expect |
|---|----------|--------|
| S1 | Select thin wall / dimension palcem | Hit reliable |
| S2 | Zoom ± potem select | AC-M1-07 PASS |
| S3 | Toolbar / Lista / Final / selection | ≥44px feel |
| S4 | Dimension + text | Inline/modal · keyboard OK w FS |
| S5 | Create drawing menu | Visible · closable |
| S6 | Safari iOS + Chrome Android | AC-M1-01…08 |

---

## 9. Mapowanie AUDIT → DF

| AUDIT / epic | Ten DF |
|--------------|--------|
| D-M1-01…07 | **POTWIERDZONE** |
| AC-M1-03 + zoom chrome | **AC-M1-03** |
| R-P1-01 hit@zoom | **D-M1-08** · **AC-M1-07** |
| Allowlist §6.2 | **§6** ten plik |
| THIN | **POTWIERDZONE** |

---

## 10. NEXT

```text
STATUS: MOBILE-P1 DESIGN FREEZE FROZEN
Czekaj: OWNER GO → ARCHITECTURE REVIEW
IMPLEMENT / COMMIT / PUSH: NIE
```

---

*Thin DESIGN FREEZE MOBILE-P1 · bez implementacji / commit / push.*
