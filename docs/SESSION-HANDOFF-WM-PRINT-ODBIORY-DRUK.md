# SESSION HANDOFF — Odbiory WM Druk (`wmprint`)

> **★★ Handoff modułu WM Druk** · **Data closeout:** 2026-06-16 · **Prod:** v**2.59.24** (ZI Tauron 2026 **PRODUCTION STABLE**)
> **P0 pollution/KV/runtime:** **CLOSED** · **ZI LiveCycle 2021:** **CLOSED (tombstone)** · **ZI Tauron 2026:** **PRODUCTION STABLE** · SSOT: [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md)
> **Prod validation:** [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md)
> **Historyczne RCA LiveCycle:** [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md)
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
    → generate-zip.ts → generate-docx.ts | generate-pdf-zi-tauron2026.ts | generate-pdf.ts (legacy)
```

### Generowanie ZIP (ścieżka produkcyjna)

```text
buildWmPrintFilesForJob(job, templates, jobDocs, settings, opts)
  → dedupeWmPrintTemplatesByName(getEnabledWmPrintTemplates(...))   ← 2.59.24
  → dla każdego włączonego szablonu:
      DOCX     → generateDocxFromTemplate (placeholdery {{VAR}})
      ZI       → detectLegacyLiveCycle guard → generatePdfZiTauron2026 (§4 99/111/112 + preservation)
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

### Stan prod po cleanup (2026-06-16)

| Metryka | Wartość |
|---------|---------|
| Rekordów templates | **8** (było 99 → 15 → 8) |
| Aktywnych slotów ZI | **1** |
| Tombstone deleted-ids | **147** (w tym legacy LiveCycle) |
| **Canonical ZI UUID** | **`2b22da48-46dc-42a0-8236-d42b5b5562dc`** · plik **`ZI.pdf`** |
| **Legacy ZI UUID (tombstone)** | **`26f02c78-871c-4d65-aeac-d0ca06bf060c`** — usunięty z templates |
| Backup legacy cleanup | `audit/tauron-audit-2026-06-15/p0-wm-druk-zi-legacy-cleanup-backup.json` |
| Raport execute | `audit/tauron-audit-2026-06-15/p0-wm-druk-zi-legacy-cleanup-report.json` |

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
| `generate-pdf.ts` | **Legacy LiveCycle (2021) CLOSED** — font loader + `copyStaticPdfTemplate`; nie używać dla ZI |
| `generate-pdf-zi-tauron2026.ts` | **Generator ZI prod** — Tauron 2026 · guard LiveCycle |
| `zi-tauron2026-form-extract.ts` | pdf.js preservation graft (szyfrowany WM ZI.pdf) |
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

### Seria P0.1 — ZI PDF (placeholdery / demo) — **CLOSED w P0.2A (2.59.19)**

| Wersja | Skrót | Status |
|--------|-------|--------|
| 2.59.9–2.59.14 | P0.1A→1G: XFA mapowanie, updateAppearances, visual overlay, Edge cover | diagnostyka — root cause w demo @ y≈142 |
| Audyt P0.1F | Pipeline wypełnia `/V` poprawnie; UX FAIL przez widoczne widgety demo | PASS audyt / FAIL UX → **naprawione P0.2A** |
| P0.1G | Debug color overlay (dev only) | diagnostyka historyczna |

Artefakty audytu: `audit/p0-1f2-proof.zip`, `scripts/audit-p0-1f*.mjs`, `audit/zi-rca-ulica-bud-lok-REPORT.md`.

### P0 Template Pollution — **CLOSED**

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.59.15** | `0c6b804` | Seed guard — tylko gdy local+cloud puste; parse bez auto-seedu; dedupe name przed push |
| **2.59.16** | `afef743` | Skrypt cleanup + testy + dry-run |
| **2.59.17** | `16ee8f8` | **EXECUTE** prod KV: 99→15, 84 tombstone |
| **2.59.18** | `01211d6` | Hotfix `parseWmPrintTemplates is not defined` w `cloud-sync.ts` |
| **2.59.19** | `1a8c892` | **P0.2A** — strip demo ULICA/BUD/LOK @ y≈142; clean szablon ZI w storage/KV (**superseded P0.3A**) |
| **2.59.20** | pending | **P0.3A** — §3 TextField2[10/9/8] pdflib 24/23/22; bez strip §3; filtr legacy §1 KV |

**Root cause P0.3A:** P0.2A myliło pola §3 z demo; właściwy adres WM = TextField2[8/9/10] @ y≈142, nie TextField5/imie/nazwisko @ §1.

**Root cause pollution:** `App.tsx` seedował 13 rekordów przy pustym localStorage mimo pełnej chmury → merge po UUID → burst +13.

**Root cause runtime 2.59.17:** `cloud-sync.ts:1469` wywołał `parseWmPrintTemplates` bez importu → ReferenceError przy wejściu w moduł.

---

## 5a. P0.2A — demo ULICA/BUD/LOK (v2.59.19 · historyczny)

Usunięto placeholdery demo @ y≈142. **P0.3A** skorygowało mapowanie na właściwe pola §3. **Śledztwo P0.3A→P0.4B** wykazało, że **adres §3 nadal nie renderuje się** w Edge/Chrome/Adobe — patrz §5b.

---

## 5c. ZI Tauron 2026 (**PRODUCTION STABLE · v2.59.24**)

**★★ SSOT:** [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) · validation: [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md)

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.59.22** | `9434787` | Generator + preservation gate + mapping §4 |
| **2.59.23** | `5302498` | pdf.js worker dla preservation w ZIP |
| **2.59.24** | `65051a3` | Tombstone sync · legacy slot cleanup KV · dedupe ZIP |

| Element | Wartość |
|---------|---------|
| Formularz | Tauron ZI 2026 (FormMaker AcroForm, bez XFA) |
| Canonical templateId | **`2b22da48-46dc-42a0-8236-d42b5b5562dc`** · `ZI.pdf` |
| Generator | `generatePdfZiTauron2026()` + `zi-tauron2026-form-extract.ts` |
| Mapping §4 | `Pole tekstowe 99/111/112` → JOB_STREET / JOB_BUILDING / JOB_APARTMENT |
| Preservation | pdf.js graft ze szyfrowanego WM `ZI.pdf` · patch tylko §4 |
| Bundled | `public/wm-print/zi-tauron-2026-template.pdf` |
| Smoke | `test-wm-print-zi-2026-smoke.mjs` · `test-wm-print-zi-2026-preservation-smoke.mjs` · `test-wm-print-zi-zip-post-cleanup.mjs` |

Legacy LiveCycle slot **`26f02c78…`**: **TOMBSTONE** → `audit/archive/legacy-zi-livecycle-2021/`

---

## 5b. ZI Investigation — RCA P0.3A→P0.4B (**CLOSED · historyczne · superseded by ZI 2026**)

**★★ SSOT historyczne:** [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md)

> **Uwaga dla agentów:** poniższe opisuje **stary** formularz LiveCycle i problem §3 @ y≈142. **Nie** stosować do prod po 2.59.22. Aktualny adres obiektu = **§4** pola 99/111/112 (Tauron 2026).

### Problem biznesowy (historyczny — CLOSED)

W sekcji **§3 OKREŚLENIE OBIEKTU** (y≈142) wygenerowany PDF ZI **nie pokazuje** adresu robocy (ulica / budynek / lokal) w Edge, Chrome, Adobe Reader ani wydruku.

### Business mapping — **POTWIERDZONY (nie kwestionować)**

| Zmienna | Qualified name | Widget | pdf-lib idx | y rect |
|---------|----------------|--------|-------------|--------|
| JOB_STREET | TextField2[10] | **429** | 24 | ≈142 |
| JOB_BUILDING | TextField2[9] | **428** | 23 | ≈142 |
| JOB_APARTMENT | TextField2[8] | **427** | 22 | ≈142 |

### Szablon SSOT (hybrid LiveCycle)

| Plik | SHA256 (prefix) | Rola |
|------|-----------------|------|
| `audit/zi-live-template.pdf` | `1d756452…` | SSOT attached/KV |
| `audit/zi-p0-3u-attached-source.pdf` | identyczny | kopia ZIP |
| `audit/zi-p0-3ag-adobe-saved.pdf` | `38c98105…` | referencja Adobe user save (421/420/419 @ y≈440) |

### Co zrobiliśmy (skrót chronologii)

| Faza | Skrót | Werdykt |
|------|-------|---------|
| P0.1F–1G | `/V` OK, overlay, debug colors | UX FAIL |
| P0.2A | strip demo ULICA/BUD/LOK | częściowy — superseded P0.3A |
| P0.3A | mapowanie §3 TextField2[8/9/10] | mapping OK, UX nadal FAIL |
| P0.3AA–AI | ciphertext capacity 5/3/3 | **CLOSED** — twarda granica |
| P0.3AJ | replicate Adobe save | partial — wymaga AP 808–833 |
| P0.3AK | AP render dominance | **CLOSED** — AP rebuild niemożliwy bez Adobe SDK |
| P0.3M–R | Edge render path streams 380..387 | append **martwy**, replace 387 partial |
| P0.3F | strip §3 annots + overlay | **FAIL** UX |
| P0.4A | flatten + burn-in PoC | **FAIL** manual (adres niewidoczny, pola znikają) |
| P0.4B | audit inventory + ten handoff | **CLOSED** |

### Zamknięte ścieżki — **NIE WRACAĆ** bez nowego twardego dowodu

Ciphertext path · Adobe encrypted `/V` RE · AP reverse engineering · XFA datasets · Overlay · Contents append · Contents replace (full) · AP clone · Flatten pdf-lib PoC

### Architektura renderingu Edge (ustalone P0.3R)

```text
Page obj 365 (viewer page 1)
  /Contents [380..387]  ← Edge maluje z TEJ stosy (LiveCycle Designer)
  pdf-lib append stream ← IGNOROWANY przez Edge
  Widget AP 429/428/427 ← ciphertext; capacity 5/3/3
```

### Kod prod (stan repo — bez wdrożenia fix ZI)

`generate-pdf.ts`: `generatePdfFormFromTemplate` — setText + `finalizeZiHybridForm` (overlay) + `stripSection3WidgetAnnots`.  
Eksperyment (nie prod): `generatePdfZiFlattenPoC` — **nie wdrażać** (P0.4A FAIL).

---

## 6. CO BĘDZIEMY ROBIĆ (backlog — priorytety)

### P0 — moduł WM Druk (infra + ZI)

| ID | Temat | Status |
|----|-------|--------|
| Template pollution | seed guard + KV cleanup | **CLOSED** (2.59.15–17) |
| Runtime hotfix | normalizeWmPrintTemplates | **CLOSED** (2.59.18) |
| **ZI Tauron 2026** | migracja + preservation + prod validation | **PRODUCTION STABLE** (2.59.22–24) |
| Legacy LiveCycle slot | tombstone + KV cleanup | **CLOSED** (2.59.24) |

### P1 — backlog (tylko na polecenie)

| Priorytet | Kierunek | Uwagi |
|-----------|----------|-------|
| **P0.5** | Housekeeping kodu/audit (split `generate-pdf.ts`) | plan: [`audit/POST-ZI-CLEANUP-AUDIT.md`](../audit/POST-ZI-CLEANUP-AUDIT.md) |
| **P1** | §4 górny wiersz (pola 95/96/97) — dual-fill | OPEN produktowy · nie blokuje prod |
| **P2** | E2E Playwright modułu wmprint | backlog |

### P2 — rozwój (tylko na polecenie)

- Więcej mapowań PDF form per szablon
- E2E Playwright modułu wmprint
- Export email pakietu odbiorowego

---

## 7. ZI PDF — stan techniczny prod (Tauron 2026)

### Start here (prod)

1. [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) — **SSOT implementacji**
2. [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) — werdykt prod
3. [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md) — tylko historyczne RCA LiveCycle

### Canonical template KV (prod)

```text
UUID: 2b22da48-46dc-42a0-8236-d42b5b5562dc
file: ZI.pdf (Tauron 2026 · FormMaker)
name: ZI
type: pdf_form (override w generate-zip.ts)
enabled: true
```

### Legacy template (tombstone)

```text
UUID: 26f02c78-871c-4d65-aeac-d0ca06bf060c
status: TOMBSTONE (kw-wm-print-deleted-template-ids)
```

### Mapowanie prod (`generate-pdf-zi-tauron2026.ts`)

```text
Pole tekstowe 99  → JOB_STREET
Pole tekstowe 111 → JOB_BUILDING
Pole tekstowe 112 → JOB_APARTMENT
```

### Pipeline prod (ZIP)

```text
generateFromTemplateBytes() gdy name === "ZI"
  → detectLegacyLiveCycleZiForm? throw
  → generatePdfZiTauron2026()
      → pdf.js graft (preservation)
      → patch §4 (99/111/112)
```

### Historyczne mapowanie LiveCycle (nie używać)

<details>
<summary>TextField2[8/9/10] — tylko archiwum RCA</summary>

```text
TextField2[10] → JOB_STREET     (pdflib 24, widget 429)
TextField2[9]  → JOB_BUILDING  (pdflib 23, widget 428)
TextField2[8]  → JOB_APARTMENT (pdflib 22, widget 427)
```

Patrz [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md).
</details>

### Walidacja prod

[`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) — **PRODUCTION VERIFIED** (ZIP Sępa 83/7, preservation + mapping PASS).

### Kluczowe raporty audit (KEEP)

`tauron-audit-2026-06-15/*` · `p0-3ad-business-mapping-report.json` (historyczne LiveCycle) · `POST-ZI-CLEANUP-AUDIT.md`

### Znane pułapki (prod)

| Pułapka | Skutek |
|---------|--------|
| Legacy LiveCycle w KV | **Guard** `detectLegacyLiveCycleZiForm` + tombstone UUID |
| R6 encrypted template | pdf-lib wymaga odszyfrowanej bazy + pdf.js graft |
| Template pollution (2.59.15+) | naprawione — nie seedować ponownie |
| `parseWmPrintTemplates` bez importu | używać `normalizeWmPrintTemplates` w cloud-sync |

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

# ZI Tauron 2026 (prod)
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-tombstone-smoke.mjs

# Publish clean template (OPERACYJNE)
npx vite-node scripts/publish-wm-print-zi-template-p0-2a.mjs --execute

npm run build
```

---

## 9. Czego NIE zmieniać bez polecenia

- **Canonical ZI UUID** `2b22da48-46dc-42a0-8236-d42b5b5562dc` — nie podmieniać na legacy `26f02c78-…`
- **Legacy tombstone** `26f02c78-…` — nie przywracać do KV bez pełnego audytu
- Seed guard semantics (local+cloud empty only)
- `parseWmPrintTemplates` — nie wywoływać auto-seedu; w `cloud-sync` używać **normalizeWmPrintTemplates**
- Merge po UUID — nie zmieniać na merge po name (dedupe tylko przy push)
- Tombstone `deleted-template-ids` — nie czyścić bez backupu
- Pola §4 Tauron **99/111/112** — zmiana tylko po audycie + smoke preservation

---

## 9a. Werdykt sesji (2026-06-15 closeout · aktualizacja P0.5A)

```text
WM DRUK P0 infra          CLOSED (2.59.15–2.59.19) — pollution, KV, runtime
P0 Template Pollution     CLOSED
KV Cleanup                CLOSED (99→8, 1× ZI canonical)
Runtime Hotfix            CLOSED (2.59.18)
ZI LiveCycle 2021         CLOSED — tombstone 26f02c78-…
ZI Tauron 2026            PRODUCTION STABLE (2.59.22–24)
Prod validation           PASS — FINAL-ZI-2026-PROD-VALIDATION.md
Moduł wmprint UI          GO
Reszta WGDOM              GO
```

**Następny agent:** Czytaj [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) → walidacja [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md). **Nie** wracać do LiveCycle/ciphertext/AP bez nowego dowodu.
