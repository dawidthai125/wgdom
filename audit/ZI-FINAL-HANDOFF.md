# ZI PDF — Final Handoff (P0.4B)

> **Data:** 2026-06-15 · **Status:** **Śledztwo ZI CLOSED — brak rozwiązania prod**  
> **Werdykt biznesowy:** §3 adres (ulica/budynek/lokal) **niewidoczny** w viewerach docelowych · **P0.4A Flatten PoC = FAIL**  
> **Tryb:** READ ONLY closeout · bez implementacji · bez commit/push/deploy

---

## Spis treści

1. [Problem](#1-problem)
2. [Co zostało potwierdzone](#2-co-zostało-potwierdzone)
3. [Co zostało obalone](#3-co-zostało-obalone)
4. [Zamknięte ścieżki RCA](#4-zamknięte-ścieżki-rca)
5. [Aktualny stan](#5-aktualny-stan)
6. [Otwarte pytania](#6-otwarte-pytania)
7. [Rekomendacje dla nowego śledztwa](#7-rekomendacje-dla-nowego-śledztwa)
8. [Inventory audit/ (P0.4B)](#8-inventory-audit-p04b)
9. [Plan reorganizacji katalogu](#9-plan-reorganizacji-katalogu)

---

## 1. Problem

**Objaw biznesowy:** Po wygenerowaniu formularza **ZI** (Tauron — zgłoszenie gotowości instalacji) z modułu **Odbiory WM Druk**, w pliku PDF w sekcji **§3 OKREŚLENIE OBIEKTU** (y≈142) użytkownik **nie widzi** poprawnego adresu robocy (np. *Sępa Szarzyńskiego / 83 / 7*) w:

- Microsoft Edge
- Google Chrome
- Adobe Acrobat Reader
- wydruku / „Drukuj → Zapisz jako PDF”

**Kontekst techniczny:** Szablon ZI w storage prod to **hybrid PDF** — Adobe LiveCycle Designer + AcroForm + **szyfrowane ciphertext `/V`** na widgetach §3 (429/428/427). Pipeline prod (`generate-pdf.ts`) używa **pdf-lib `setText`** → UTF-16 `/V`, bez pełnej ścieżki Adobe AP/ciphertext.

**Oddzielnie zamknięte (nie ten problem):** P0 Template Pollution (99→15 szablonów KV) — **CLOSED** v2.59.17–18.

---

## 2. Co zostało potwierdzone

| # | Ustalenie | Dowód |
|---|-----------|-------|
| 1 | **§3 prod mapping:** `TextField2[10/9/8]` → JOB_STREET/BUILDING/APARTMENT @ **y≈142**, widgety **429/428/427**, pdf-lib idx **24/23/22** | `p0-3ad-business-mapping-report.json` |
| 2 | **SSOT szablonu** (attached ZIP = live KV): SHA256 `1d756452854685961f08c1f58b1060df22817ede4df1230ad08b8462a415416f` | `zi-live-template.pdf`, `zi-p0-3u-attached-source.pdf` |
| 3 | **Adobe user save** (referencja): wypełnia **421/420/419 @ y≈440** (inny wiersz niż §3 prod); ciphertext + AP 830/832/833 | `zi-p0-3ag-adobe-saved.pdf`, `p0-3aj-replicate-user-save-report.json` |
| 4 | **Ciphertext capacity §3:** 5/3/3 znaki to **twarda granica XOR-decode**, nie placeholder ULICA/BUD/LOK | `p0-3ai-true-capacity-report.json`, `p0-3ae-real-capacity-report.json` |
| 5 | **pdf-lib `/V`** ≠ Adobe ciphertext — inna ścieżka binarna; `/V` w audycie OK, **UX FAIL** | `p0-3af-verify-p0-3g-report.json`, `zi-p0-3f-local-wgdom-sepa-83-7.pdf` |
| 6 | **Edge render path:** aktywna warstwa = oryginalne strumienie LiveCycle **380..387** na page obj **365** (viewer page 1) | `p0-3r-root-cause-confirmed-report.json`, `p0-3s-stream-ownership-report.json` |
| 7 | **Append overlay / drawText / nowy stream po `/Contents` = martwe dla Edge** na live SSOT | P0.3O, P0.3Q append FAIL; P0.3Q replace stream 387 partial PASS |
| 8 | **AP render (Adobe save):** Reader/Edge wizualnie z **AP** (Form XObject encrypted); pdf.js field API = fallback `/V`/AP | `p0-3ak-ap-render-path-report.json` |
| 9 | **AP rebuild / clone 830→429 = praktycznie niemożliwe** bez Adobe SDK | `p0-3ak-ap-render-path-report.json` §D |
| 10 | **XFA datasets flip** — nie naprawia §3 w Edge | `p0-3x-xfa-extraction-report.json`, eksperymenty P0.3X |
| 11 | **P0.4A flatten PoC:** burn-in w strumieniu + dopięcie do `/Contents` — **proxy PASS**, **manual FAIL** (adres niewidoczny; część pól znika po flatten) | `p0-4a-flatten-poc-report.json`, `zi-p0-4a-flatten-poc-sepa-83-7.pdf` |

---

## 3. Co zostało obalone

| Hipoteza | Werdykt |
|----------|---------|
| Błędna strona / zły page object | **Obalone** — §3 = page 365 = viewer page 1 (`p0-3p-page-identity-report.json`) |
| Edge ignoruje całą zawartość strony | **Obalone** — replace stream 387 zmienia rendering (`p0-3r`) |
| `updateAppearances(Noto)` + flatten naprawia hybrid ZI | **Obalone** — flatten psuje pola LiveCycle; UX nadal FAIL |
| `stripSection3WidgetAnnots` wystarczy | **Obalone** — orphan widgets; append i tak ignorowany |
| Overlay biały cover + drawText (P0.1E–P0.3F) | **Obalone** — append martwy dla Edge |
| XFA dataset manipulation | **Obalone** |
| Przedłużenie ciphertext >5 znaków na 429 | **Obalone** |
| Klonowanie AP Adobe na widget §3 | **Obalone** |
| Flatten + burn-in bez Adobe (P0.4A) | **Obalone** — manual FAIL |

---

## 4. Zamknięte ścieżki RCA

| Ścieżka | Status | Ostatni etap |
|---------|--------|--------------|
| Ciphertext XOR / capacity / P0.3Z matrix | **CLOSED** | P0.3AI |
| Adobe AP reverse engineering | **CLOSED** | P0.3AK |
| XFA datasets extraction/flip | **CLOSED** | P0.3X |
| Overlay / append content stream | **FAIL → CLOSED** | P0.3R |
| pdf-lib setText + strip annots (prod P0.3F) | **FAIL → CLOSED** | P0.3AF |
| Flatten + burn-in PoC | **FAIL → CLOSED** | P0.4A |
| Stream 387 in-place full replace | **Partial PASS / not prod-safe** | P0.3Q replace |

**Nie kontynuować** na obecnym szablonie LiveCycle: ciphertext, AP graft, append overlay, flatten pdf-lib.

---

## 5. Aktualny stan

| Obszar | Stan |
|--------|------|
| **Moduł WM Druk (KV, pollution, sync)** | **GO** — P0 pollution CLOSED |
| **ZI PDF §3 adres w Edge/Chrome/Adobe** | **NO-GO** — brak prod fix |
| **Pipeline prod `generatePdfFormFromTemplate`** | Wypełnia `/V`, overlay — **UX FAIL §3** |
| **P0.4A `generatePdfZiFlattenPoC`** | Eksperyment w kodzie — **nie wdrażać** (manual FAIL) |
| **Handoff modułu** | `docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` — wymaga aktualizacji werdyktu ZI (osobna sesja) |

**Kluczowe artefakty SSOT (nie usuwać):**

- `audit/zi-live-template.pdf`
- `audit/zi-p0-3u-attached-source.pdf`
- `audit/zi-new-template-prod.pdf`
- `audit/zi-p0-3ag-adobe-saved.pdf`
- `audit/p0-3r-root-cause-confirmed-report.json`
- `audit/p0-3ad-business-mapping-report.json`
- `audit/p0-3ak-ap-render-path-report.json`
- `audit/p0-4a-flatten-poc-report.json`
- Ten plik: `audit/ZI-FINAL-HANDOFF.md`

---

## 6. Otwarte pytania

1. **Czy Tauron udostępnia wersję ZI bez LiveCycle/ciphertext** (czysty AcroForm + standardowe AP)?
2. **Czy akceptowalny jest workflow Adobe-only** (ręczne wypełnienie 421/420/419 lub §3 w Acrobat) — poza automatyzacją WGDOM?
3. **Czy możliwy jest minimalny patch strumienia 387** tylko w paśmie y≈142 bez utraty etykiet z replace (P0.3Q usunął m.in. „Numer umowy…”)?
4. **Czy Adobe PDF Services / LiveCycle API** (płatna ścieżka) jest dopuszczalna biznesowo?
5. **Czy zmiana mapowania prod na wiersz y≈440** (421/420/419) pomoże, skoro tam działa Adobe user path — wymaga weryfikacji wizualnej w Edge na wierszu §2 vs §3.

---

## 7. Rekomendacje dla nowego śledztwa

### Kierunki DO rozważenia (nowa sesja)

| Priorytet | Kierunek | Uwagi |
|-----------|----------|-------|
| **P1** | **Nowy szablon ZI** (plain AcroForm od Tauron / re-export Designer) | Najniższe ryzyko techniczne długoterminowo |
| **P2** | **Adobe PDF Services** lub oficjalny save-path automation | Koszt + infrastruktura |
| **P3** | **Forensic decode + surgical patch strumienia 387** | Wysokie ryzyko regresji etykiet; tylko READ ONLY do proof |
| **P4** | **Zmiana produktu:** ZI jako DOCX/oddzielny proces | Obejście PDF hybrid |

### Kierunki NIE rozważać dalej

- pdf-lib append overlay / drawText na page 365
- pdf-lib flatten hybrid LiveCycle
- Reverse engineering AP 808–833
- Ciphertext padding / P0.3Z matrix extensions
- XFA dataset flip

### Definition of Done (przyszłe rozwiązanie)

- [ ] Edge + Chrome + Adobe Reader: §3 pokazuje JOB_STREET / JOB_BUILDING / JOB_APARTMENT
- [ ] Druk → PDF zachowuje adres
- [ ] Pozostałe pola formularza nie znikają
- [ ] Pipeline WM Druk ZIP bez regresji innych szablonów

---

## 8. Inventory audit/ (P0.4B)

**Skan:** 2026-06-15 · **207 plików** · **~49.3 MB łącznie**

| Typ | Liczba |
|-----|--------|
| pdf | 134 |
| json | 63 |
| zip | 4 |
| md | 2 |
| txt | 1 |
| js | 3 |

**Machine-readable pełna tabela:** `scripts/_p04b-inventory.json` (kolumny: file, size, date, type, category, lastRef).

### Podsumowanie kategorii (propozycja)

| Kategoria | Pliki | Rozmiar | Opis |
|-----------|-------|---------|------|
| **A) KEEP / SSOT** | 82 | ~12.0 MB | Szablony SSOT, raporty końcowe RCA, proof PDF po 1/s ścieżkę |
| **B) ARCHIVE** | 21 | ~7.8 MB | Warianty pośrednie (smoke, flatten variants, pipeline A/B) |
| **C) TEMP / DELETE** | 104 | ~29.5 MB | Macierze probe (3AA/3AB/3Z), hide-stream grid, prod dumps, `_tmp*` |

### A) KEEP — lista (82 plików)

<details>
<summary>Rozwiń pełną listę KEEP</summary>

```
audit/final-zi-from-zip.pdf
audit/p0-1f-reconcile-report.json
audit/p0-1f2-proof-report.json
audit/p0-1f2-proof.zip
audit/p0-1f4-layer-report.json
audit/p0-1f4-template-raw.pdf
audit/p0-1g-debug-overlay.pdf
audit/p0-2b-wm-address-rca-report.json
audit/p0-2c-wm-visible-proof-report.json
audit/p0-3-old-vs-new-template-report.json
audit/p0-3aa-payload-limit-report.json
audit/p0-3ab-ciphertext-model-report.json
audit/p0-3ac-field-capacity-mapping-report.json
audit/p0-3ad-business-mapping-report.json
audit/p0-3ae-real-capacity-report.json
audit/p0-3af-verify-p0-3g-report.json
audit/p0-3ag-address-field-discovery.json
audit/p0-3ag-adobe-saved-forensic-report.json
audit/p0-3ag-executive-summary.json
audit/p0-3ah-field-pairing-report.json
audit/p0-3ai-true-capacity-report.json
audit/p0-3aj-replicate-user-save-report.json
audit/p0-3ak-ap-render-path-report.json
audit/p0-3ak-variants/* (6 PDF)
audit/p0-3b-rca-prod-gen.txt
audit/p0-3d-edge-experiment-report.json
audit/p0-3d-local-validation-manifest.json
audit/p0-3e-variant-b-readonly-report.json
audit/p0-3f-local-validation-manifest.json
audit/p0-3g-hard-rca-report.json
audit/p0-3h-visible-vs-invisible-report.json
audit/p0-3i-ap-preservation-report.json
audit/p0-3j-original-ap-report.json
audit/p0-3k-ap-content-rca-report.json
audit/p0-3k-pdfjs-fieldvalues.json
audit/p0-3k-v-encoding-report.json
audit/p0-3l-source-of-truth-report.json
audit/p0-3m-live-template-forensic-report.json
audit/p0-3n-j-vs-f-differential-report.json
audit/p0-3o-a-overlay-colors-report.json
audit/p0-3p-page-identity-report.json
audit/p0-3q-content-injection-report.json
audit/p0-3r-root-cause-confirmed-report.json
audit/p0-3s-stream-ownership-report.json
audit/p0-3t-ap-switch-report.json
audit/p0-3v-dawid-vs-sepa-report.json
audit/p0-3y-designer-v-rca-report.json
audit/p0-4a-flatten-poc-report.json
audit/p0-template-pollution-report.json
audit/SEPA_*_P0-3D-LOCAL.zip
audit/SEPA_*_P0-3F-LOCAL.zip
audit/template-cleanup-backup.json
audit/template-cleanup-execute-report.json
audit/template-cleanup-report.json
audit/TRACE-REPORT.json
audit/zi-before-zip.pdf
audit/zi-from-pipeline.pdf
audit/zi-live-template.pdf
audit/zi-new-template-fields-pdfjs.json
audit/zi-new-template-forensic-report.json
audit/zi-new-template-FORENSIC.md
audit/zi-new-template-prod.pdf
audit/zi-new-template-xfa-deep.json
audit/zi-old-template.pdf
audit/zi-p0-2a-publish-report.json
audit/zi-p0-2c-proof-sepa-83-7.pdf
audit/zi-p0-3ag-adobe-saved.pdf
audit/zi-p0-3f-local-wgdom-sepa-83-7.pdf
audit/zi-p0-3j-original-ap.pdf
audit/zi-p0-3o-overlay-colors.pdf
audit/zi-p0-3q-append.pdf
audit/zi-p0-3q-replace.pdf
audit/zi-p0-3u-attached-source.pdf
audit/zi-p0-4a-flatten-poc-sepa-83-7.pdf
audit/zi-rca-ulica-bud-lok-REPORT.md
audit/zi-smoke-sepa-83-7-report.json
audit/zi-smoke-sepa-83-7.pdf
audit/ZI-FINAL-HANDOFF.md
```

</details>

### B) ARCHIVE — lista (21 plików)

```
audit/p0-3u-hard-reset-forensic-report.json
audit/p0-3w-xfa-dataset-diff-report.json
audit/p0-3x-xfa-extraction-report.json
audit/p0-3z-ciphertext-prove-report.json
audit/zi-new-job-fields.pdf
audit/zi-p0-2a-smoke-sepa-83-7.pdf
audit/zi-p0-3a-smoke-sepa-83-7.pdf
audit/zi-p0-3b-prod-template-gen.pdf
audit/zi-p0-3d-baseline-no-fix.pdf
audit/zi-p0-3d-local-wgdom-sepa-83-7.pdf
audit/zi-p0-3d-variant-a-flatten.pdf
audit/zi-p0-3d-variant-a-flatten-no-overlay.pdf
audit/zi-p0-3d-variant-b-strip-annots.pdf
audit/zi-p0-3f-smoke-sepa-83-7.pdf
audit/zi-p0-3i-baseline-full-pipeline.pdf
audit/zi-p0-3i-no-updateAppearances.pdf
audit/zi-p0-3m-f-full-pipeline.pdf
audit/zi-p0-3m-j-original-ap.pdf
audit/zi-p0-3t-a-original.pdf
audit/zi-template-job-fields.pdf
audit/zi-template-p0-2a-cleaned.pdf
```

### C) TEMP / SAFE TO DELETE — lista (104 plików, ~29.5 MB)

Grupy (pełna lista w `scripts/_p04b-inventory.json`, category=DELETE):

| Grupa | Przykłady | Uzasadnienie |
|-------|-----------|-------------|
| `_tmp*` / `_test*` | `_tmp-burntest.pdf`, `_tmp-p03l-live.pdf`, `_test-clean.pdf` | Artefakty sesji debug |
| `prod-*.js` | `prod-WmPrintView.js`, `prod-app-core.js`, `prod-index.js` | Dump bundle prod — odtwarzalny z Vercel |
| `trace-full.zip` | | Duplikat trace; jest `TRACE-REPORT.json` |
| `zi-p0-3aa-*` (24 PDF) | probe Thai/Dawid/ULICA… | Macierz limitu payload — wnioski w JSON |
| `zi-p0-3ab-*` (16 PDF) | w428-BUD, w429-SEPA… | Proby ciphertext — wnioski w P0.3AB/AI |
| `zi-p0-3z-*` (28 PDF) | s1/s2/s4 matrix | Ciphertext prove — wnioski w raporcie |
| `zi-p0-3s-hide-*` (9 PDF) | hide-380..387, hide-all | Stream ownership grid — wnioski w P0.3S |
| `zi-p0-3x-exp-*`, `zi-p0-3y-exp*` | | XFA/designer eksperymenty — CLOSED |
| `zi-p0-3t-b/c/d-*` | | AP switch warianty — w raporcie P0.3T |
| `zi-p0-3aj-proof-*`, `zi-p0-3aj-vonly*` | | Proofy pośrednie P0.3AJ |
| `zi-rca-ulica-bud-lok-zi-*.json` (5) | | Duplikaty RCA per plik — jest REPORT.md |
| `zi-smoke-sepa-83-7-deep.json` | | Stub 18 B |

**Uwaga:** DELETE = „bezpieczne po archiwizacji” — **najpierw przenieść do `archive-2026-06-15/`**, potem ewentualnie usunąć po review.

---

## 9. Plan reorganizacji katalogu

**Status:** PLAN ONLY — **nie wykonano** przeniesień (P0.4B READ ONLY).

### Docelowa struktura

```text
audit/
├── ZI-FINAL-HANDOFF.md          ← ten plik (root audit — widoczny)
├── zi-investigation-final/      ← KEEP (82 pliki)
├── archive-2026-06-15/          ← ARCHIVE (21) + opcjonalnie DELETE po review
└── temp-delete-candidates/      ← DELETE (104) — staging przed usunięciem
```

### Mapowanie plików

| Źródło (dziś `audit/…`) | Cel |
|-------------------------|-----|
| 82 pliki KEEP (§8A) | `audit/zi-investigation-final/` — zachować podstrukturę `p0-3ak-variants/` |
| 21 plików ARCHIVE (§8B) | `audit/archive-2026-06-15/` |
| 104 pliki DELETE (§8C) | `audit/temp-delete-candidates/` → po 30 dniach / potwierdzeniu → usunąć |
| `template-cleanup-backup.json` | **KEEP** w final (operacyjny backup KV) |
| `prod-*.js`, `trace-full.zip` | temp-delete-candidates (pierwsi kandydaci) |

### Procedura wykonania (przyszła sesja — nie teraz)

1. `mkdir audit/zi-investigation-final audit/archive-2026-06-15 audit/temp-delete-candidates`
2. `git mv` / przeniesienie wg list §8 (zachować ścieżki w JSON jeśli skrypty odwołują się do starych nazw — zaktualizować skrypty lub dodać symlinki)
3. Spakować `temp-delete-candidates/` → `archive-2026-06-15/zi-delete-staging-2026-06-15.zip` (backup przed rm)
4. Zaktualizować `docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` — ZI-PDF-001 **REOPEN / NO-GO**
5. Commit osobny: `chore(audit): reorganize ZI investigation artifacts`

### Skrypt inventory (reuse)

```bash
npx vite-node scripts/_readonly-p04b-inventory.mjs
# → scripts/_p04b-inventory.json
```

---

## Łańcuch dowodowy (skrót)

```text
P0.1F → /V OK, UX FAIL
P0.2A → demo strip CLOSED (superseded P0.3A)
P0.3A–AD → mapping §3 @142
P0.3AA–AI → ciphertext capacity CLOSED
P0.3AJ → Adobe save path replicated (partial)
P0.3AK → AP path CLOSED → flatten/burn-in suggested
P0.3M–R → Edge append dead; stream 387 active
P0.3S → stream ownership map
P0.4A → flatten+burn-in FAIL (manual)
P0.4B → ten handoff
```

---

*Koniec śledztwa ZI PDF hybrid LiveCycle · brak prod fix · archiwizacja audit/ według §9 w osobnej sesji.*
