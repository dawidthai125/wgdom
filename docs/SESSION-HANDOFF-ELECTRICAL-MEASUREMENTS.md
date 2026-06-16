# SESSION HANDOFF — Pomiary Elektryczne (EM)

> **★★ SSOT modułu Pomiary Elektryczne** · **Prod:** **2.59.44** · commit **`26251ff`** · **2026-06-16**  
> **Powiązane:** WM Druk [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) · ARCHITECTURE § **12.1.10**

---

## 1. Status (2026-06-16)

| Obszar | Status |
|--------|--------|
| **EM-P0** Foundation (model, UI, preview SSOT) | **COMPLETE** (v2.59.28) |
| **EM-P1** Generator DOCX (5 dokumentów) | **COMPLETE** (v2.59.30+) |
| **EM-P1.5** Measurement Value Engine | **COMPLETE** (v2.59.33) |
| **EM-P1.6** Rejestr RAP + naprawy baseline | **COMPLETE** (v2.59.34–36, **2.59.42** P1.6C) |
| **EM-P1.7** Ustawienia globalne pomiarowiec/miernik | **COMPLETE** (v2.59.35) |
| **EM-UX-001** UI w WM Druk (zakładka Pomiary) | **COMPLETE** (v2.59.31) |
| **EM-P2** Katalog Pomiarów | **COMPLETE** (v2.59.37) |
| **EM-P2.5** Raporty testowe TEST-RAP | **COMPLETE** (v2.59.38) |
| **EM-P3** Integracja ZIP odbiorowy WM Druk | **COMPLETE** (v2.59.40) |
| **EM-P3.5** INDEX-POMIARY txt/csv | **COMPLETE** (v2.59.41) |
| **EM-P1R** Template Rebuild (SSOT Word Desktop) | **COMPLETE** (v2.59.43) |
| **EM-P1R-HF001** ADDRESS parity we wszystkich 5 DOCX | **COMPLETE** (v2.59.44) |

**Werdykt:** Moduł **PRODUCTION STABLE** dla generacji DOCX z oryginalnych szablonów Word. Layout 1:1, adres z `jobDisplayTitle(job)` we wszystkich dokumentach.

---

## 2. Co to jest (produkt)

**Pomiary Elektryczne** — raporty pomiarów ochronnych dla robot (instalacje WM):

- **1 robota → wiele raportów RAP** (numer roczny `RAP-NN-YYYY`)
- **5 dokumentów Word** na raport: Protokół · Dane informacyjne · ADSC · Rezystancja · RCD
- **Integracja WM Druk:** ZIP odbiorowy może zawierać folder `Pomiary/` z DOCX aktywnego RAP
- **Katalog:** WM Druk → Katalog → lista RAP, filtry, pobieranie ZIP/DOCX

**UI główne:** `WmPrintView.tsx` → zakładka **Pomiary** (Wariant A: wybór roboty → edycja).  
**Skrót w Robotach:** `JobElectricalMeasurementsPanel.tsx` — podsumowanie + „Otwórz w WM Druk”.

---

## 3. Architektura plików

### 3.1 Domena `src/lib/electrical-measurements/`

| Plik | Rola |
|------|------|
| `types.ts` | Model: `ElectricalMeasurement`, obwody, RCD, flagi TEST |
| `normalize.ts` | Parse legacy — `displayName`, `sortOrder` |
| `merge.ts` | Merge LWW per `id`, filter per `jobId` |
| `report.ts` | CRUD raportów, obwodów, RCD |
| `preview.ts` | **SSOT etykiet** — `buildAdscPreview`, `buildResistancePreview`, `buildRcdPreview` |
| `measurement-value-engine.ts` | **SSOT wartości** — seed, Zs/Rs, oceny (EM-P1.5) |
| `em-docx-payload.ts` | Mapowanie raport → `scalars` + `rowSpecs` (placeholdery DOCX) |
| `em-docx-xml.ts` | Substitute skalarów + `expandEmDocxTemplateRows` (klon wierszy) |
| `generate-em-docx.ts` | Orkiestracja: szablon → payload → bytes |
| `measurement-docx-names.ts` | Nazwy plików wyjściowych |
| `registry.ts` | Rejestr RAP (1 numer ↔ 1 robota) |
| `registry-baseline-repair.ts` | Jednorazowe naprawy prod KV (P1.6B/C) |
| `measurement-catalog.ts` | Katalog Pomiarów (lista, filtry) |
| `measurement-catalog-zip.ts` | ZIP katalogu / wielokrotny |
| `measurement-index-export.ts` | INDEX-POMIARY.txt/csv |
| `sync.ts` | Push KV |
| `settings.ts` | Domyślny pomiarowiec/miernik (global) |
| `test-report.ts` | TEST-RAP (bez wpływu na rejestr) |

### 3.2 UI

| Plik | Rola |
|------|------|
| `src/app/WmPrintView.tsx` | Zakładka Pomiary + Katalog + Ustawienia |
| `src/app/JobElectricalMeasurementsPanel.tsx` | Skrót w detalu roboty |
| `src/app/MeasurementCatalogPanel.tsx` | Katalog RAP |

### 3.3 Szablony (prod assets)

```text
public/em-measurements/
  protokol.template.docx              ← portrait
  dane-informacyjne.template.docx     ← portrait
  badanie-adsc.template.docx          ← landscape · legenda T4
  badanie-rezystancji.template.docx   ← landscape · 16 kol. fixed
  parametry-rcd.template.docx         ← landscape · legenda T4
```

**Źródło prawdy szablonów:** oryginały Word z `Desktop\Dokumenty\Pomiary Elektryczne\`  
**Regeneracja:** `node scripts/templatize-em-p1r-from-ssot.mjs`  
**RETIRED:** `scripts/build-em-docx-templates.mjs` (programowy layout EM-P1B — **nie używać**)

### 3.4 Klucze KV (chmura)

| Klucz | Zawartość |
|-------|-----------|
| `kw-electrical-measurements` | Tablica raportów `ElectricalMeasurement[]` |
| `kw-electrical-measurement-registry` | Rejestr numerów RAP + baseline roczny |
| `kw-electrical-measurement-settings` | Domyślny pomiarowiec, miernik |

Sync: `sync.ts` + merge w `cloud-sync.ts` (jak pozostałe `DATA_KEYS`).

---

## 4. Pipeline generacji DOCX

```text
JobElectricalMeasurementsPanel / WmPrintView
  → downloadEmDocxDocument(kind) / generateEmDocxBytes()
    → loadEmDocxTemplateBytes (public/em-measurements/*.template.docx)
    → buildElectricalMeasurementDocxPayload(measurement, job)
         scalars.ADDRESS = jobDisplayTitle(job)   ← JEDNO ŹRÓDŁO ADRESU
         rowSpecs per kind (ADSC / Rezystancja / RCD)
    → generateEmDocxFromTemplateBytes (em-docx-xml.ts)
         substitute {{SCALARS}}
         expandEmDocxTemplateRows (ROW_SUPPLY_* + ROW_*)
    → validateEmDocxBytes
```

**5 dokumentów — ten sam `ADDRESS`:**

| Dokument | Placeholder adresu | Format w szablonie |
|----------|-------------------|------------------|
| Protokół | `{{ADDRESS}}` | `UŻYTKOWNIK I MIEJSCE POMIARU: {{ADDRESS}}` |
| Dane informacyjne | `{{ADDRESS}}` | `Miejsce pomiaru: {{ADDRESS}}` |
| ADSC | `{{ADDRESS}}` | `Miejsce pomiaru: {{ADDRESS}}` (T1 R3) |
| Rezystancja | `{{ADDRESS}}` | j.w. |
| RCD | `{{ADDRESS}}` | j.w. |

**Nie ma** `SITE_ADDRESS` / `JOB_ADDRESS` w payload — tylko `ADDRESS`.

---

## 5. Historia faz (skrót)

| Faza | Wersja | Commit (przykł.) | Skrót |
|------|--------|------------------|-------|
| P0 | 2.59.28 | — | Model + preview SSOT |
| P1B | 2.59.30 | — | Generator DOCX (później superseded przez P1R) |
| UX-001 | 2.59.31 | — | UI → WM Druk |
| P1.5 | 2.59.33 | — | Value engine + seed |
| P1.6 | 2.59.34–36 | — | Rejestr RAP |
| P1.6C | 2.59.42 | `b79c949` | Registry repair V2 (prod orphans) |
| P2 | 2.59.37 | — | Katalog |
| P2.5 | 2.59.38 | — | TEST-RAP |
| P3 | 2.59.40 | — | ZIP odbiorowy + folder Pomiary/ |
| P3.5 | 2.59.41 | — | INDEX-POMIARY |
| **P1R** | **2.59.43** | **`d6268b1`** | Szablony z Desktop Word SSOT |
| **HF001** | **2.59.44** | **`26251ff`** | Fix hardcoded Sępa → `{{ADDRESS}}` |

---

## 6. Raporty audytu (audit/)

| Raport | Temat |
|--------|-------|
| [`EM-P1R-DOCX-FORENSICS.md`](../audit/EM-P1R-DOCX-FORENSICS.md) | RCA: programowe szablony EM-P1B ≠ Word |
| [`EM-P1R-TEMPLATIZATION-PLAN.md`](../audit/EM-P1R-TEMPLATIZATION-PLAN.md) | Plan placeholderów per dokument |
| [`EM-P1R-TEMPLATE-REBUILD-REPORT.md`](../audit/EM-P1R-TEMPLATE-REBUILD-REPORT.md) | Werdykt P1R IMPLEMENT |
| [`EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md`](../audit/EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md) | Fix adresu Kleczkowska vs Sępa |
| [`EM-P1.6C-REGISTRY-REPAIR-V2-REPORT.md`](../audit/EM-P1.6C-REGISTRY-REPAIR-V2-REPORT.md) | Naprawa rejestru prod |
| [`P0-EM-REGISTRY-AUDIT.md`](../audit/P0-EM-REGISTRY-AUDIT.md) | Audyt read-only KV |

---

## 7. Smoke / testy

```bash
npm run build

# Regresja generatora DOCX
npx vite-node scripts/test-electrical-measurements-p1.mjs          # 32 testy

# P1R layout + RAP-45 / TEST-RAP-001
npx vite-node scripts/test-em-p1r-visual-smoke.mjs                   # 60 testów

# ADDRESS parity (Kleczkowska 26 m.3 × 5 docs)
npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs    # 23 testy

# Rejestr RAP
npx vite-node scripts/test-electrical-measurements-registry-repair-v2.mjs

# Regeneracja szablonów (po zmianie Desktop SSOT)
node scripts/templatize-em-p1r-from-ssot.mjs
```

**Artefakty smoke:** `audit/em-p1r-smoke-out/`, `audit/em-p1r-hotfix-001-out/`

---

## 8. NIE zmieniaj bez polecenia

| Obszar | Zasada |
|--------|--------|
| **preview.ts** | SSOT etykiet — DOCX i UI czytaj stąd |
| **measurement-value-engine.ts** | SSOT wartości liczbowych |
| **em-docx-payload.ts** | Kontrakt placeholderów EM-P1.5 |
| **Wiele raportów / job** | `jobId` nie jest unique |
| **Rejestr RAP** | 1 numer ↔ 1 robota; TEST-RAP poza rejestrem |
| **Szablony** | Nie wracać do `build-em-docx-templates.mjs` |
| **Templatyzacja** | Zachować tblGrid, legendy T4, orientację; tylko placeholdery + 1 wiersz wzorcowy |
| **ADDRESS** | Zawsze `{{ADDRESS}}` = `jobDisplayTitle(job)` we **wszystkich** 5 plikach |

---

## 9. Backlog OPEN (na polecenie)

- Edycja wartości pomiarowych per pole w UI (poza Zs/Rs korektą)
- Eksport PDF z DOCX (obecnie tylko .docx)
- Podgląd DOCX in-browser (obecnie download)
- Automatyczny visual diff Word w CI (obecnie manual + metryki XML)
- Integracja checklisty inspektora ↔ status raportu (częściowo jest)

---

## 10. Następne kroki (typowe dla agenta)

1. **Bug w DOCX/layout** → forensyka XML szablonu → `templatize-em-p1r-from-ssot.mjs` → smoke P1 + P1R  
2. **Bug w danych/wartościach** → `measurement-value-engine.ts` + `preview.ts` parity  
3. **Bug w rejestrze RAP** → `registry.ts` + KV audit read-only first  
4. **Nowa funkcja WM Druk** → czytaj też [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md)

---

*EM handoff · v2.59.44 · 2026-06-16*
