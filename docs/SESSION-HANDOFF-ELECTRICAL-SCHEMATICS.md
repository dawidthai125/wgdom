# SESSION HANDOFF — Schematy Jednokreskowe (WM-SCHEMATY-V1)

> **★★ SSOT epica WM-SCHEMATY-V1** · **Status:** **MVP + Visual Fidelity CLOSED** · **2026-06-24**  
> **Baseline WGDOM:** prod **2.62.51** (`78f11cd`) · renderer **v5**  
> **V2 release handoff:** [`SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md)  
> **Specyfikacja zamrożona:** [`WM-SCHEMATY-V1-DESIGN-FREEZE.md`](WM-SCHEMATY-V1-DESIGN-FREEZE.md)  
> **Powiązane:** [`SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) · [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) · ARCHITECTURE § **12.1.21**

---

## 1. Cel epica

**Schematy jednokreskowe** — moduł WM Druk do tworzenia schematów instalacji elektrycznej dla lokali mieszkalnych i użytkowych WM:

- Użytkownik **nie rysuje** — edytuje dane formularza (obwody, MCB, przewody, RCD).
- **SVG** generowane automatycznie z modelu danych.
- **PDF** = produkt końcowy (A4 landscape, raster PNG @2× via pdf-lib w MVP).
- Schemat może powstać **ręcznie** (szablon startowy) lub **jednorazowym importem** z raportu pomiarowego EM (RAP).
- **Brak auto-sync** — zmiana pomiaru nie aktualizuje istniejącego schematu.

**UI docelowe:** nowa zakładka **Schematy** w WM Druk:

```text
Odbiory | Pomiary | Schematy | Katalog Pomiarów | Szablony | Historia | Ustawienia
```

**Domena kodu (planowana):** `src/lib/electrical-schematics/` — **osobna** od `electrical-measurements/` i od WM print (ZI).

---

## 2. Baseline projektu

| Element | Wartość |
|---------|---------|
| **Prod** | https://www.wgdom.fun · **2.62.51** (`78f11cd`) |
| **WM Druk** | ZI Tauron 2026 STABLE · EM-P1R COMPLETE · **Schematy MVP CLOSED** |
| **Zakładki WM Druk (prod)** | Odbiory · Pomiary · **Schematy** · Katalog · Szablony · Historia · Ustawienia |
| **Wzorzec domeny** | `src/lib/electrical-measurements/` (types → normalize → merge → sync → report) |
| **Sync** | `cloud-sync.ts` · merge LWW per `id` |
| **Backend** | Brak zmian Supabase w MVP — tylko frontend + KV |

**Faza 0 (ten handoff):** dokumentacja operacyjna · **bez kodu** · **bez UI**.

---

## 3. DESIGN FREEZE — summary

| Pole | Wartość |
|------|---------|
| **Status** | **DESIGN FREEZE — GO** |
| **Data freeze** | 2026-06-24 |
| **Dokument SSOT** | [`WM-SCHEMATY-V1-DESIGN-FREEZE.md`](WM-SCHEMATY-V1-DESIGN-FREEZE.md) |
| **Poprzednie artefakty** | Architecture & Product Design · Analiza 10 schematów referencyjnych · Final Architecture Review (GO WITH CHANGES) |
| **Brakujące pliki repo** | `WM-SCHEMATY-V1-ARCHITECTURE.md` · `WM-SCHEMATY-V1-REAL-SCHEMATICS-ANALYSIS.md` — treść skonsolidowana w DESIGN FREEZE |

Wszystkie punkty wymagane przed implementacją zostały zamknięte w DESIGN FREEZE § A–J.

---

## 4. Zamrożone decyzje architektoniczne

| # | Decyzja | Wartość |
|---|---------|---------|
| 1 | Domena | Osobna `electrical-schematics/` — nie część pomiaru EM |
| 2 | KV | `kw-electrical-schematics` · merge LWW per `id` |
| 3 | Edycja | Tylko dane — brak edytora CAD, brak drag&drop symboli |
| 4 | Render | SVG = źródło renderowania (auto-generowane) |
| 5 | PDF MVP | Raster PNG @2× → pdf-lib · A4 landscape |
| 6 | RCD MVP | **Jedno** `mainRcd` grupowe — nie tablica |
| 7 | Layout | Profile precyzyjne: `apartment-1f-v1`, `apartment-3f-v1`, `commercial-3f-v1` |
| 8 | Import EM | Jednorazowy · `valueSet.*` **nie** importować |
| 9 | Sync pomiar ↔ schemat | **Brak** auto-sync |
| 10 | `feedFrom` / `position` | **V1.1** — poza MVP |
| 11 | R1 / R6 | **V2** — poza MVP i V1.1 |
| 12 | Presety obwodów | Statyczna biblioteka w kodzie — nie KV, nie user-defined w MVP |
| 13 | ZIP odbiorowy `Schematy/` | **V1.1** — poza MVP |

---

## 5. Model danych (skrót)

**SSOT:** `SingleLineDiagram` + `SchematicCircuit` · `schemaVersion: 1`

### 5.1 Dokument

| Pole | Opis |
|------|------|
| `id` | UUID |
| `title` | Domyślnie: `SCHEMAT JEDNOKRESKOWY INSTALACJI ELEKTRYCZNEJ` |
| `address` | Wymagane do eksportu PDF |
| `documentDate` | ISO `YYYY-MM-DD` |
| `status` | `draft` \| `final` |
| `jobId?` | Opcjonalne powiązanie z robotą |
| `linkStatus` | `linked` \| `detached` \| `manual` |
| `sourceMeasurementId?` | Aktywne tylko gdy `linked` |
| `sourceMeasurementRef?` | Snapshot np. `RAP-45-2026` — zachowany po detach |
| `layoutProfile` | MVP: `apartment-1f-v1` \| `apartment-3f-v1` \| `commercial-3f-v1` |

### 5.2 Zasilanie i ochrona

| Sekcja | MVP |
|--------|-----|
| `supply` | `phase` (1f/3f), `busLabel`, `mainCableLabel` |
| `mainSwitch?` | Opcjonalny FR (np. Benedyktyńska) |
| `meter` | `phases` 1\|3, `label` (domyślnie KWh) |
| `mainBreaker` | MCB główny (typ B/C, In, bieguny, 6kA) |
| `mainRcd` | Jedno RCD grupowe (In, 30mA, bieguny, AC) |
| `circuits[]` | Tablica obwodów posortowana `sortOrder` |

### 5.3 Obwód (`SchematicCircuit`)

| Pole | Opis |
|------|------|
| `id`, `sortOrder` | UUID · kolejność kolumn (1-based) |
| `name` | Wymagane — np. `GN 230V Salon` |
| `presetId?` | Źródło presetu (audyt, re-apply) |
| `loadKind` | socket-1f, lighting-1f, cable-outlet-3f, socket-3f, reserve, other |
| `breakerType`, `ratedCurrentA`, `poles`, `breakingCapacityKa` | MCB obwodu |
| `cableLabel` | Wymagane do PDF |
| `feedFrom?`, `position?` | **V1.1 only** — nie w MVP |

### 5.4 Pola wymagane do eksportu PDF

`address` · `layoutProfile` · `supply.phase` · `mainBreaker` · `mainRcd` · `circuits.length >= 1` · każdy `circuits[].name` · każdy `circuits[].cableLabel`

### 5.5 Import z `ElectricalMeasurement` (mapowanie zamrożone)

| EM | Schemat |
|----|---------|
| `supplyType: ydy-3x4` | `1f`, `YDYp 3x4mm²`, profil `apartment-1f-v1` |
| `supplyType: ydy-5x4` | `3f`, `YDYp 5x4mm²`, profil `apartment-3f-v1` |
| `circuits[].displayName` | `circuits[].name` |
| `circuits[].type` | → `presetId` + `loadKind` |
| `rcds[0]` | `mainRcd` |
| `reportNumber` | `sourceMeasurementRef` + `linkStatus: linked` |
| `valueSet.*` | **NIE importować** |
| TEST-RAP (`flags.test`) | Import dozwolony · `status: draft` · badge TEST |

### 5.6 Konwencja nazwy PDF

```text
SCHEMAT_{ADRES_SLUG}_{YYYY-MM-DD}.pdf
```

Przykład: `SCHEMAT_Benedyktynska_22_13_2026-06-24.pdf` — slug jak `measurement-docx-names`.

---

## 6. Presety obwodów (§ B freeze)

**Lokalizacja (plan):** `src/lib/electrical-schematics/circuit-presets.ts`  
**Kontrakt `applyPreset(presetId, overrides?)`:** uzupełnia pola · nie nadpisuje `id`/`sortOrder` · zapisuje `presetId`.

| `presetId` | Domyślna `name` | MCB | Przewód |
|------------|-----------------|-----|---------|
| `socket-230v` | GN 230V | B16A 1P 6kA | YDYp 3x2,5mm² |
| `lighting` | OŚWIETLENIE | B10A 1P 6kA | YDYp 3x1,5mm² |
| `washer` | GN 230V Pralka | B16A 1P 6kA | YDYp 3x2,5mm² |
| `dishwasher` | GN 230V Zmywarka | B16A 1P 6kA | YDYp 3x2,5mm² |
| `oven` | GN 230V Piekarnik | B16A 1P 6kA | YDYp 3x2,5mm² |
| `induction-hob` | GN 230V Płyta indukcyjna | B16A 1P 6kA | YDYp 3x2,5mm² |
| `electric-stove-3p` | Kuchenka Elektryczna | B16A 3P 6kA | YDYp 5x2,5mm² |
| `boiler` | GN 230V Bojler | B16A 1P 6kA | YDYp 3x2,5mm² |
| `convector` | GN 230V Konwektor | B16A 1P 6kA | YDYp 3x2,5mm² |
| `doorbell` | Dzwonek | B10A 1P 6kA | YDYp 3x1,5mm² |
| `reserve` | REZERWA | B16A 1P 6kA | YDYp 3x2,5mm² |
| `socket-400v` | GN 400V | B32A 3P 6kA | YDY 5x2,5mm² |

**Mapowanie EM `CircuitType` → preset:**

| EM | Preset |
|----|--------|
| `socket-1f` | `socket-230v` |
| `lighting-1f` | `lighting` |
| `socket-3f` | `electric-stove-3p` lub `socket-400v` (heurystyka: „kuchenk” w `displayName` → stove) |

---

## 7. Szablony startowe (§ C freeze)

Szablon = pełny nowy `SingleLineDiagram` z domyślną topologią (≠ preset pojedynczego obwodu).

### 7.1 `template-apartment-3f-default`

- Profil `apartment-3f-v1` · 3F · FR 100A · C25A 3P · RCD 25A 30mA 4P
- 6 obwodów startowych: kuchenka 3P · GN Salon · GN Pokój 1 · GN Pokój 2 · GN Kuchnia · oświetlenie

### 7.2 `template-apartment-1f-default`

- Profil `apartment-1f-v1` · 1F · bez FR · C25A 1P · RCD 25A 30mA 2P
- 4 obwody: GN Salon · GN Kuchnia · oświetlenie ×2

### 7.3 `template-commercial-3f-default`

- Profil `commercial-3f-v1` · 3F · bez FR · RCD 63A 30mA 4P
- 5 obwodów: GN 400V ×2 · GN 230V ×2 · oświetlenie

Wszystkie szablony: `status: draft`, `linkStatus: manual`.

---

## 8. Visual gate — Benedyktyńska 22/13

**Referencje PNG w repo:** [`wm-schematy-v1/visual-references/README.md`](wm-schematy-v1/visual-references/README.md)

| Adres | Plik | Gate |
|-------|------|------|
| Benedyktyńska 22/13 | `benedyktynska-22-13.png` | **PRIMARY** — bloker MVP |
| Żytnia 18/21 | `zytnia-18-21.png` | Regresja commercial-3f (P1) |
| Pereca 24a/29 | `pereca-24a-29.png` | Regresja 10 obwodów · edge V1.1 |

**Historia:** przy Design Freeze (2026-06-24) obrazy **nie były** w repo — dostarczone ponownie przed Fazą 2.

**Referencja PRIMARY:** załącznik W&G DOM · profil `apartment-3f-v1`  
**Dane testowe:** szablon § C.1 + adres `WROCŁAW, UL. BENEDYKTYŃSKA 22/13` · **7 obwodów** (jak oryginał)

### 8.1 Elementy obowiązkowe na PDF/SVG

1. Nagłówek (tytuł + adres)
2. Szyna górna `L1, L2, L3, N, PE`
3. FR (jeśli w modelu)
4. Licznik 3F + KWh
5. Przewód główny (pionowa etykieta)
6. Wyłącznik główny C25A 3P 6kA (lub z modelu)
7. RCD + etykieta
8. Szyna pozioma z kropkami
9. N kolumn obwodów = N obwodów
10. Per obwód: przewód + MCB + symbol końcowy + nazwa pozioma
11. Kuchenka 3P: B16A 3P, 5×2,5
12. Gniazda: B16A 1P, 3×2,5
13. Oświetlenie: B10A 1P, 3×1,5

### 8.2 Tolerancje

- Pozycje symboli ±15% · font inny OK jeśli czytelny A4 landscape
- Kolejność sekcji: zasilanie → FR? → licznik → C25A → RCD → szyna → obwody
- Monochromatyczny czarny OK

### 8.3 PASS / FAIL

**PASS:** wszystkie elementy § 8.1 · kolejność · 7 obwodów · etykiety · PDF A4 landscape OK · manual review operatora („akceptowalny do użytku WM”).

**FAIL:** brak RCD/szyny · obwody nałożone · brak etykiet MCB/przewodu · PDF ucięty · nagłówek bez adresu.

**Bloker release MVP:** visual gate musi przejść PASS przed zamknięciem epica.

---

## 9. Scope — MVP (P0)

| ID | Zakres |
|----|--------|
| M1 | Domena `electrical-schematics/` — types, normalize, merge, sync, report |
| M2 | Presety § 6 + `applyPreset` |
| M3 | Szablony startowe § 7 |
| M4 | Layout + render SVG: `apartment-3f-v1` |
| M5 | Layout + render SVG: `apartment-1f-v1` |
| M6 | Export PDF (raster PNG @2×, pdf-lib, A4 landscape) |
| M7 | Watermark draft `WERSJA ROBOCZA` |
| M8 | UI: zakładka Schematy — lista, search, filtry status |
| M9 | UI: tworzenie ręczne + z pomiaru |
| M10 | UI: edytor formularz + SVG preview |
| M11 | Duplikacja § E freeze |
| M12 | Powiązanie / odłączenie od pomiaru |
| M13 | KV `kw-electrical-schematics` + cloud-sync |
| M14 | Visual gate Benedyktyńska § 8 |
| M15 | Smoke: render snapshot, PDF, import map |

### Reguły statusów (MVP)

| `status` | PDF | Watermark |
|----------|-----|-----------|
| `draft` | ✅ | TAK — `WERSJA ROBOCZA` |
| `final` | ✅ | NIE |

Edycja `final` **nie** degraduje statusu. Duplikacja → zawsze `draft`, `linkStatus: manual`, nowy `id`, pusty `address`.

---

## 10. Scope — P1 (opcjonalnie w MVP, nie blokuje release)

| ID | Zakres |
|----|--------|
| O1 | Layout `commercial-3f-v1` |
| O2 | Link „Utwórz schemat” z WM Druk → Pomiary |
| O3 | Skrót w Robotach |

---

## 11. Scope — V1.1 (osobny epic po MVP)

| ID | Zakres |
|----|--------|
| V1.1-1 | `feedFrom` / `position` na obwodach |
| V1.1-2 | Folder `Schematy/` w ZIP odbiorowym WM (checkbox domyślnie OFF) |
| V1.1-3 | WM Historia — wpis po eksporcie PDF |
| V1.1-4 | PDF wektorowy (svg2pdf) |
| V1.1-5 | „Odśwież z pomiaru” z confirm |

---

## 12. Scope — V2 (osobny epic)

| Element | Opis |
|---------|------|
| `distribution-r1-v1` | Rozdzielnica piętrowa R1 — STV, OP, L.KONTR. |
| `distribution-r6-v1` | Rozdzielnica główna R6 — multi-tier, feeders |
| `schemaVersion: 2` | `protectionKind: mcb \| fuse`, `rcdGroups[]`, `feeders[]` |

**Poza całym projektem:** edytor CAD · auto-sync · import DWG/PDF scan · obliczenia elektryczne.

---

## 13. Planowana struktura plików (§ I freeze)

```text
src/lib/electrical-schematics/
  types.ts                     ← Faza 1A COMPLETE
  normalize.ts                 ← Faza 1A COMPLETE
  circuit-presets.ts           ← Faza 1B COMPLETE
  start-templates.ts           ← Faza 1B COMPLETE
  import-from-measurement.ts   ← Faza 1C COMPLETE
  merge.ts                     ← Faza 1C COMPLETE
  sync.ts                      ← Faza 1C COMPLETE
  report.ts                    ← Faza 1C COMPLETE
  layout/
    apartment-1f-v1.ts
    apartment-3f-v1.ts
    commercial-3f-v1.ts        # P1
  symbols/iec-simplified.ts
  render-svg.ts
  export-pdf.ts

src/app/
  WmPrintSchematicsPanel.tsx
  WmPrintSchematicEditor.tsx

WmPrintView.tsx               # tab "schematy"
wm-print-tabs.ts              # + "schematy"
cloud-sync.ts                 # + kw-electrical-schematics
```

**Smoke (do utworzenia w Fazie 1–4):**

- `scripts/test-schematic-render-apartment-3f.mjs`
- `scripts/test-schematic-pdf-smoke.mjs`
- `scripts/test-schematic-import-from-measurement.mjs`

---

## 14. Kolejność implementacji

```text
Faza 0 — dokumentacja operacyjna (TEN HANDOFF)          ← AKTUALNA
Faza 1 — domena (types, presets, templates, import, merge, sync)
Faza 2 — render (apartment-3f-v1, apartment-1f-v1, export-pdf)
Faza 3 — UI (lista, edytor, zakładka WM Druk)
Faza 4 — QA (visual gate § 8, smoke tests, release workflow B)
```

### Faza 1 — Domena

1. `types.ts` + `normalize.ts` — enumy, model, walidacja eksportu
2. `circuit-presets.ts` + `start-templates.ts`
3. `import-from-measurement.ts`
4. `merge.ts` + `sync.ts` + `report.ts` (CRUD, duplicate, detach)
5. `cloud-sync.ts` + stan w `App.tsx`
6. Smoke import + merge

### Faza 2 — Render / PDF

1. `symbols/iec-simplified.ts`
2. `layout/apartment-3f-v1.ts` — **priorytet visual gate**
3. `layout/apartment-1f-v1.ts`
4. `render-svg.ts` + cache `renderedSvg`
5. `export-pdf.ts` + watermark draft
6. Visual gate Benedyktyńska — manual PASS

### Faza 3 — UI

1. `wm-print-tabs.ts` + `WmPrintView.tsx` — zakładka Schematy
2. `WmPrintSchematicsPanel.tsx` — lista, filtry, search
3. `WmPrintSchematicEditor.tsx` — formularz + preview
4. Flow: szablon / import RAP / duplikacja / final / PDF
5. CHANGELOG + HelpView

### Faza 4 — QA / Release

Workflow **B** ([`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)):

```text
npm run build → smoke test-schematic-*.mjs → commit → push main → curl version.json (FAST)
```

---

## 15. Definition of Done (epic MVP)

Epic **WM-SCHEMATY-V1 MVP** uznany za **CLOSED** gdy:

- [x] Wszystkie pozycje M1–M15 (§ 9) zaimplementowane — **M12:** import `linked` ✅ · `detachSchematicFromMeasurement` w domenie ✅ · przycisk UI „Odłącz” → backlog V1.1
- [x] Visual gate Benedyktyńska 22/13 — **PASS** (manual review operatora)
- [x] Smoke M15: render snapshot · PDF draft/final · import z EM — **PASS** (239 asercji epic)
- [x] KV `kw-electrical-schematics` sync LS ↔ chmura bez regresji — smoke 3A **25/25**
- [x] Zakładka Schematy widoczna w WM Druk na prod — **2.62.49+**
- [x] CHANGELOG + HelpView + ARCHITECTURE § 12.1.21 zaktualizowane
- [x] `docs/PROJECT-HANDOFF-CURRENT.md` — baseline po release (**2.62.51**)
- [x] Visual fidelity V2 — audyt V2C **RECOMMEND RELEASE** · prod **2.62.51**
- [x] Ten handoff — sekcja Status = **MVP + Visual Fidelity CLOSED**

---

## 16. Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| Regresja `cloud-sync.ts` — brak importu merge helpera | Obowiązkowy import w nagłówku `cloud-sync.ts` (lekcja 2.62.39→42) |
| Jakość renderu — subiektywny visual gate | apartment-3f-v1 pierwszy · gate przed release |
| Rozmiar KV — `renderedSvg` w cache | Opcjonalny cache · regeneracja przy zapisie na starcie |
| Vercel ENOENT — untracked pliki `src/` | `git status` + `git ls-files` przed push (P0 deploy unblock) |
| Scope creep — feedFrom/position, R1/R6 | Scope lock § 9–12 — V1.1/V2 tylko na polecenie |
| Zależność od EM bez coupling | Import jednorazowy · brak zapisu do `kw-electrical-measurements` |

---

## 17. Status epica (living)

| Faza | Status | Data |
|------|--------|------|
| **Faza 0** — dokumentacja | **COMPLETE** | 2026-06-24 |
| **Faza 1A** — types + normalize | **COMPLETE** | 2026-06-24 |
| **Faza 1B** — presety + szablony | **COMPLETE** | 2026-06-24 |
| **Faza 1C** — import + merge + sync + report | **COMPLETE** | 2026-06-24 |
| **Faza 1** — domena | **COMPLETE** | 2026-06-24 |
| **Faza 2A** — layout 1F | **COMPLETE** | 2026-06-24 |
| **Faza 2B** — render SVG + PDF | **COMPLETE** | 2026-06-24 |
| **Faza 2** — render | **COMPLETE** | 2026-06-24 |
| **Faza 3A** — cloud sync | **COMPLETE** | 2026-06-24 |
| **Faza 3B** — UI MVP | **COMPLETE** | 2026-06-24 |
| **Faza 3** — integracja + UI | **COMPLETE** | 2026-06-24 |
| **Faza 4** — QA / release readiness | **COMPLETE** | 2026-06-24 |
| **Visual V1A/V1B** — renderer v4 | **COMPLETE** · **2.62.50** | 2026-06-24 |
| **Visual V2** — bus layout v2 · renderer v5 | **COMPLETE** · **2.62.51** | 2026-06-24 |
| **Epic MVP + fidelity** | **CLOSED** · prod **2.62.51** (`78f11cd`) | 2026-06-24 |

---

## 18. Visual fidelity (living)

| Etap | Wersja | Renderer | ~% tuszu vs ref. | Status |
|------|--------|----------|------------------|--------|
| V1 MVP | 2.62.49 | 2→3 | ~55–58% | CLOSED |
| V1A | 2.62.50 | 4 | ~87% | CLOSED |
| V1B | 2.62.50 | 4 | ~92% | CLOSED |
| **V2** | **2.62.51** | **5** | **93.4%** (audyt PDF) | **CLOSED** |

Szczegóły release V2: [`SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md)

---

**Następny krok (backlog, nie MVP):** V1.1 — UI detach · ZIP `Schematy/` · WM Historia po PDF · `feedFrom`/`position` · layout `commercial-3f-v1` w UI · epic R1/R6 (osobny scope).

**Podpis:** WM-SCHEMATY-V1 · epic + visual fidelity **CLOSED** · prod **2.62.51** · 2026-06-24
