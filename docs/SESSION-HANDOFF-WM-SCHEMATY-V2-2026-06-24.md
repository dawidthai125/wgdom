# SESSION HANDOFF — WM Schematy Visual Fidelity V2 (2.62.50–51)

> **★★ Release visual fidelity** · **Status:** **CLOSED** · **2026-06-24**  
> **Prod:** **2.62.51** (`78f11cd`) · **PRODUCTION VERIFIED**  
> **Epic SSOT:** [`SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) · ARCHITECTURE § **12.1.21**  
> **Audyt release:** `audit/WM-SCHEMATY-V2C-PDF-SIDE-BY-SIDE-AUDIT.md` — **RECOMMEND RELEASE**

---

## 1. Zakres release

Wyłącznie **renderer / layout / symbole** — bez zmian sync, UI, modelu danych, importu EM, PDF pipeline (raster).

| Wersja | Commit | Renderer | Skrót |
|--------|--------|----------|-------|
| **2.62.50** | `c149116` | **v4** | V1A + V1B — backbone, RCD tee, kropki r=5, fix kuchenki |
| **2.62.51** | `78f11cd` | **v5** | V2 — bus layout v2, pełny span kolumn, większe symbole, viewBox |

**Nie ruszać bez audytu:** `cloud-sync.ts` · `App.tsx` · `WmPrintSchematicsPanel` · `import-from-measurement.ts` · `export-pdf.ts` (raster path).

---

## 2. Visual Fidelity — timeline

| Etap | ~szerokość tuszu vs A4 | Ocena | Commit |
|------|------------------------|-------|--------|
| **V1** (MVP 2.62.49) | ~55–58% | Funkcjonalny, za wąski | MVP UI |
| **V1A** (2.62.50) | ~87% | Duży skok — backbone, RCD tee | `c149116` |
| **V1B** (2.62.50) | ~92% | Kropki, linie kolumn, fix duplikatu kuchenki | `c149116` |
| **V2** (2.62.51) | **93.4%** PDF vs **92.5%** ref. WM | **B+** (audyt V2C) | `78f11cd` |

**Audyt V2C (PDF side-by-side):** referencja Benedyktyńska 22/13 · backbone zgodny · RCD tee zgodny · symbole ±5% · **V2D nie wymagane**.

---

## 3. Zmiany techniczne V2 (renderer v5)

### 3.1 Bus layout v2

**Plik:** `src/lib/electrical-schematics/layout/bus-layout-v2.ts`

- `resolveBusLayoutV2()` — szyna pozioma kończy się przy **ostatnim obwodzie** (nie pełna szerokość viewBox)
- Kolumny obwodów **równomiernie** na dostępnej szerokości (usunięty cap `maxCircuitSpacing`)
- Gate 7 (Benedyktyńska): bus cluster span **≥90%** (smoke: 98.1%)

### 3.2 ViewBox i marginesy

| Profil | viewBox | marginX | feedBackboneX |
|--------|---------|---------|---------------|
| `apartment-3f-v1` | **1360×780** | 24 | 72 |
| `apartment-1f-v1` | **1248×748** | 24 | 72 |

### 3.3 Symbole (skalowanie ~1.25× vs V1B)

- Licznik: 58×88 · MCB: 32/42 · RCD: r=14 · kropki szyny: **r=6**
- Fonty etykiet: +10–15%

### 3.4 Renderer version

```ts
// render-svg.ts
export const SCHEMATIC_RENDER_VERSION = 5;
```

Bump wersji invaliduje cache `renderedSvg` po deploy.

---

## 4. Pliki release (2.62.51)

```text
src/lib/electrical-schematics/layout/bus-layout-v2.ts          ← NOWY
src/lib/electrical-schematics/layout/apartment-3f-v1.ts
src/lib/electrical-schematics/layout/apartment-1f-v1.ts
src/lib/electrical-schematics/symbols/iec-simplified.ts
src/lib/electrical-schematics/render/svg-utils.ts
src/lib/electrical-schematics/render-svg.ts
scripts/test-schematic-v1b-visual-smoke.mjs
scripts/test-schematic-render-apartment-3f.mjs
src/app/changelog-data.ts
CHANGELOG.md
```

---

## 5. Smoke (workflow B)

```bash
npm run build
npx vite-node scripts/test-schematic-v1b-visual-smoke.mjs      # 16 PASS · gate span ≥90%
npx vite-node scripts/test-schematic-render-apartment-3f.mjs   # 31 PASS · R05 version 5
npx vite-node scripts/test-schematic-pdf-smoke.mjs               # 22 PASS
npx vite-node scripts/test-wm-schematics-ui-3b.mjs               # 29 PASS
```

**Pełny epic smoke (regresja):** presets 77 · merge 29 · import 29 · cloud 25 · UI 29.

---

## 6. Werdykt epica

| Epic | Status |
|------|--------|
| **WM-SCHEMATY MVP** (M1–M15) | **CLOSED** · 2.62.49 |
| **Visual fidelity V1A/V1B** | **CLOSED** · 2.62.50 |
| **Visual fidelity V2** | **CLOSED** · 2.62.51 |

**Backlog (nie MVP, tylko na polecenie):**

- V1.1 — `feedFrom`/`position` · ZIP `Schematy/` · WM Historia · PDF wektorowy · UI detach
- P1 — `commercial-3f-v1` layout w UI · link z Pomiarów
- V2 epic (oryginalny scope) — R1/R6 · `schemaVersion: 2` · multi-RCD · feeders

---

## 7. Pułapki dla programisty

| Pułapka | Mitigacja |
|---------|-----------|
| Mylenie **V2 layout scale** z **V2 epic R1/R6** | Ten release = tylko layout/renderer v5; R1/R6 nadal poza scope |
| Regresja szerokości przy nowych obwodach | Smoke gate 7 + gate 10 (dense) muszą PASS |
| Zmiana `export-pdf.ts` bez potrzeby | MVP = raster PNG @2× — nie ruszać bez briefu V1.1 |
| Commit z `audit/_tmp*` | Artefakty audytu **nie** w git release |

---

**Podpis:** WM-SCHEMATY visual fidelity **CLOSED** · prod **2.62.51** · 2026-06-24
