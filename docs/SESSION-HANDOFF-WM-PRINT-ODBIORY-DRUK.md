# SESSION HANDOFF — Odbiory WM Druk (`wmprint`)

> **★★ Handoff modułu WM Druk** · **Data closeout:** 2026-06-15 · **Prod:** v**2.59.19** · **ZI-PDF-001 CLOSED**
> **Hasło agenta:** „kontynuuj WGDOM”

---

## 1. Co to jest

**Odbiory WM Druk** — moduł admina do generowania pakietów dokumentów odbiorowych dla robót WM (Wrocławskie Mieszkania).

| Element | Wartość |
|---------|---------|
| **Menu admin** | `wmprint` → etykieta **„Odbiory WM Druk”** |
| **UI** | `src/app/WmPrintView.tsx` (lazy w `AdminViewRouter`) |
| **Domena** | `src/lib/wm-print/*` |
| **Storage** | `make-0afb8820-photos` — prefix `wm-print/` |
| **Sync KV** | 5 kluczy (patrz § 3) |

### Zakładki UI (`WmPrintView`)

| Zakładka | Funkcja |
|----------|---------|
| **Odbiory** | Lista robót WM, filtry, kompletność, ZIP pakietu, upload dokumentów per robota |
| **Szablony** | CRUD grup szablonów, upload plików (DOCX / PDF / PDF form), kolejność |
| **Ustawienia** | Zmienne globalne, domyślny wybór szablonów, tryb daty |

---

## 2. Architektura — przepływ danych

```text
App.tsx
  useLocalStorage("kw-wm-print-*")
  maybeExecuteWmPrintSeed()     ← bootstrap 13 slotów TYLKO gdy local+cloud puste
  commitWmPrint() → pushWmPrintToCloud()

CloudLoader / cloud-sync.ts
  mergeDataKey("kw-wm-print-templates") → mergeWmPrintTemplates()
  UWAGA: używa normalizeWmPrintTemplates(local) — NIE parseWmPrintTemplates bez importu!

wm-print-sync.ts
  merge po UUID + tombstone deleted-ids
  pushWmPrintToCloud → dedupeWmPrintTemplatesByName przed zapisem

WmPrintView.tsx
  Odbiory → downloadWmPrintZip() / downloadWmPrintTemplateFileGenerated()
    → generate-zip.ts → generate-docx.ts | generate-pdf.ts
```

### Generowanie ZIP (ścieżka produkcyjna)

```text
buildWmPrintFilesForJob(job, templates, jobDocs, settings, opts)
  → dla każdego włączonego szablonu:
      DOCX     → generateDocxFromTemplate (placeholdery {{VAR}})
      pdf_form → generatePdfFormFromTemplate (ZI + AcroForm)
      pdf      → copyStaticPdfTemplate (bez zmian)
  → dołącza job_upload docs z wmPrintJobDocs[]
  → JSZip → saveAs
```

**Override ZI:** w `generate-zip.ts` szablon `name === "ZI"` wymusza `type = "pdf_form"` niezależnie od pola `type` w KV.

---

## 3. Klucze chmury (KV)

| Klucz | Model | Merge |
|-------|-------|-------|
| `kw-wm-print-templates` | `WmPrintTemplate[]` | `mergeWmPrintTemplates` — po **UUID** |
| `kw-wm-print-job-docs` | `WmPrintJobDocument[]` | `mergeRecordsById` + tombstone |
| `kw-wm-print-settings` | `WmPrintSettings` | shallow merge |
| `kw-wm-print-deleted-template-ids` | `string[]` | union, max 500 |
| `kw-wm-print-deleted-job-doc-ids` | `string[]` | union, max 500 |

Wszystkie w `DATA_KEYS` / `DEFERRED_BOOTSTRAP_KEYS` w `cloud-sync.ts`.

### Stan prod po cleanup (2026-06-15)

| Metryka | Wartość |
|---------|---------|
| Rekordów templates | **15** (było 99) |
| Tombstone deleted-ids | **132** |
| Canonical ZI UUID | `e911d6a5-3728-4089-bb9a-a4adec6e9c20` |
| Backup przed cleanup | `audit/template-cleanup-backup.json` |
| Raport execute | `audit/template-cleanup-execute-report.json` |

---

## 4. Mapa plików `src/lib/wm-print/`

| Plik | Rola |
|------|------|
| `types.ts` | Typy, klucze KV, `WmPrintVariableKey`, etykiety |
| `templates.ts` | **parseWmPrintTemplates** (parse bez seedu), normalize alias, migrate legacy→files[], dedupe by name |
| `default-templates.ts` | **createWmPrintSeedTemplates** — 13 slotów seed (tylko bootstrap) |
| `wm-print-sync.ts` | merge, push, seed guard, syncFromCloud |
| `template-cleanup.ts` | planWmPrintTemplateCleanup — KEEP/DELETE (operacyjny cleanup KV) |
| `generate-zip.ts` | ZIP pakietu, orchestracja generatorów |
| `generate-docx.ts` | DOCX — zamiana `{{VAR}}` |
| `generate-pdf.ts` | **ZI PDF form** — pdf-lib, XFA strip, updateAppearances, visual overlay |
| `variables.ts` | `buildWmPrintVariableMap`, format dat |
| `address-vars.ts` | JOB_STREET, JOB_BUILDING, JOB_APARTMENT z job |
| `upload.ts` | Upload szablonów/dokumentów → storage |
| `job-documents.ts` | Dokumenty per robota (job_upload layer) |
| `settings.ts` | Ustawienia modułu |
| `filters.ts` | Filtry listy robót |
| `completeness.ts` | % kompletności pakietu |
| `configuration-status.ts` | Status konfiguracji szablonów |
| `template-selection.ts` | Checkboxy wyboru szablonów do ZIP |

---

## 5. CO ZROBILIŚMY (historia sesji 2026-06-14 → 2026-06-15)

### Seria P0.1 — ZI PDF (placeholdery) — **OPEN / nierozwiązane**

| Wersja | Skrót | Status |
|--------|-------|--------|
| 2.59.9–2.59.14 | P0.1A→1G: XFA mapowanie, updateAppearances, visual overlay, Edge cover | **PROBLEM NADAL OTWARTY** |
| Audyt P0.1F | Pipeline wypełnia `/V` poprawnie; PDF użytkownika ≠ PDF audytu (XFA vs stripped) | PASS audyt / FAIL UX |
| P0.1G | Debug color overlay (dev only, `setWmPrintZiDebugColorOverlay`) | diagnostyka, nie fix prod |

**Werdykt audytu P0.1F:** wartości w polach `/V` są poprawne (np. `7`, `83`, `Sępa Szarzyńskiego`), ale **przeglądarka Edge / Acrobat pokazuje placeholdery** `{{JOB_*}}` z warstwy tła (Im0) lub starych widgetów AP — nie z `/V`.

Artefakty audytu: `audit/p0-1f2-proof.zip`, `scripts/audit-p0-1f*.mjs`, `audit/p0-1g-debug-overlay.pdf`.

### P0 Template Pollution — **CLOSED**

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.59.15** | `0c6b804` | Seed guard — tylko gdy local+cloud puste; parse bez auto-seedu; dedupe name przed push |
| **2.59.16** | `afef743` | Skrypt cleanup + testy + dry-run |
| **2.59.17** | `16ee8f8` | **EXECUTE** prod KV: 99→15, 84 tombstone |
| **2.59.18** | `01211d6` | Hotfix `parseWmPrintTemplates is not defined` w `cloud-sync.ts` |
| **2.59.19** | *(push sesji)* | **P0.2A** — strip demo ULICA/BUD/LOK @ y≈142; clean szablon ZI w storage/KV |

**Root cause pollution:** `App.tsx` seedował 13 rekordów przy pustym localStorage mimo pełnej chmury → merge po UUID → burst +13.

**Root cause runtime 2.59.17:** `cloud-sync.ts:1469` wywołał `parseWmPrintTemplates` bez importu → ReferenceError przy wejściu w moduł.

---

## 6. CO BĘDZIEMY ROBIĆ (backlog — priorytety)

### P0 — CLOSED

| ID | Temat | Status |
|----|-------|--------|
| **ZI-PDF-001** | Demo ULICA/BUD/LOK + placeholdery w PDF ZI | **CLOSED** (2.59.19 P0.2A) |

**RCA:** Edge renderował widgety demo `TextField2[8/9/10]` @ y≈142 (F=4) nad overlayem WM. Fix: `stripZiDemoDesignerFields` + oczyszczony szablon w storage.

### P1 — stabilizacja

| Temat | Status |
|-------|--------|
| Regresja smoke prod WM Druk (wejście, ZIP, Szablony) | OPEN |
| Sync localStorage po cleanup (stare 99 UUID u klientów) | monitorować — merge+tombstone powinno wystarczyć |
| Usunięcie debug overlay z `generate-pdf.ts` jeśli nieużywane | backlog |

### P2 — rozwój (tylko na polecenie)

- Więcej mapowań PDF form per szablon (nie tylko ZI hardcoded)
- E2E Playwright modułu wmprint
- Export email pakietu odbiorowego

---

## 7. ZI PDF — stan techniczny (dla następnego agenta)

### Canonical template (prod po P0.2A)

```text
UUID: 26f02c78-871c-4d65-aeac-d0ca06bf060c
fileId: 2155cec9-6ca1-4eec-af1c-7b4d346487a3 (poprzedni c616f1bb-…)
name: ZI
type: pdf_form (override w generate-zip.ts)
```

### Mapowanie pól WM (`generate-pdf.ts` — P0.2A)

```text
TextField5[0]  → JOB_STREET   (pdf-lib index 10)
imie[0]        → JOB_BUILDING (index 9)
nazwisko[1]    → JOB_APARTMENT (index 8)
```

Demo projektanta @ y≈142 (`TextField2[8/9/10]`) — **strip** przy generacji i w szablonie storage (puste /V, widget /F=2).

Legacy map `WM_PRINT_ZI_PDF_FIELD_MAP` (TextField2 indeksy) — bez zmian w kodzie wypełniania.

### Pipeline ZI (`finalizeZiHybridForm`)

1. `setText` na polach AcroForm
2. `updateAppearances(font)` — Noto Sans z `/public/fonts/NotoSans-Regular.ttf`
3. **Visual overlay** — `drawRectangle` + `drawText` na współrzędnych widgetów (P0.1C/1D/1E)
4. Opcjonalnie P0.1G: `wmPrintZiDebugColorOverlay` — kolorowe boxy zamiast tekstu (tylko test)

### Znane pułapki

| Pułapka | Skutek |
|---------|--------|
| Template pollution (naprawione 2.59.15+) | Duplikaty UUID w KV — nie seedować z normalize/parse |
| `parseWmPrintTemplates` bez importu w cloud-sync | Toast runtime — używać `normalizeWmPrintTemplates` |
| batch-set API | Format `{ keys, values }` — **nie** `{ entries }` |
| XFA w szablonie ZI | pdf-lib strip XFA → indeksy zamiast qualified names |
| Edge vs Acrobat vs audyt bytes | Różne warstwy wizualne — `/V` OK ≠ UI OK |

---

## 8. Testy

```bash
# Seed guard (P0 pollution fix)
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs

# Cleanup plan logic
npx vite-node scripts/test-wm-print-template-cleanup.mjs

# Dry-run / execute cleanup KV (OPERACYJNE — tylko na polecenie)
npx vite-node scripts/cleanup-wm-print-template-pollution.mjs
npx vite-node scripts/cleanup-wm-print-template-pollution.mjs --execute

# P0.2A demo strip
npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs

# Publish clean template (OPERACYJNE)
npx vite-node scripts/publish-wm-print-zi-template-p0-2a.mjs --execute

npm run build
```

---

## 9. Czego NIE zmieniać bez polecenia

- **Canonical ZI UUID** `26f02c78-…` — nie zmieniać UUID; plik PDF w storage można podmienić skryptem publish P0.2A
- Seed guard semantics (local+cloud empty only)
- `parseWmPrintTemplates` — nie wywoływać auto-seedu; w `cloud-sync` używać **normalizeWmPrintTemplates**
- Merge po UUID — nie zmieniać na merge po name (dedupe tylko przy push)
- Tombstone `deleted-template-ids` — nie czyścić bez backupu
- Pola `TextField2[8/9/10]` — zmiana tylko po audycie qualified names

---

## 9a. Werdykt sesji

```text
P0 Template Pollution     CLOSED (seed guard + cleanup 99→15 + hotfix 2.59.18)
ZI-PDF-001                CLOSED (2.59.19 P0.2A — demo strip + clean template)
Moduł wmprint UI          GO
Prod KV templates         15 rekordów, ZI file 2155cec9-…
```

**Następny agent:** P1 regresja Edge ZIP end-to-end; nie revertować strip demo bez RCA.
