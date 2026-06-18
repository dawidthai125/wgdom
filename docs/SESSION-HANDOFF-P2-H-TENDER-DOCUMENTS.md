# SESSION HANDOFF — P2-H Tender Documents & Dossier Pipeline

> **Status:** **P2-H.1–H.6 COMPLETE** · **P2-H.7 OPEN** (Edge magic bytes 7Z)  
> **★ Post-P2-H:** **P0 ZIP ATH Recovery** — [`SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md`](SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md) (**v2.61.4 CLOSED**) — duże ZIP WM >15 MB, zip-catalog, formal offer exclusion  
> **Baseline prod (P2-H):** **v2.55.10** · **aktualny prod:** **v2.61.4**  
> **Data:** 2026-06-13 (aktualizacja wskazówka P0: 2026-06-18)  
> **Hasło agenta:** „kontynuuj WGDOM”

**Czytaj ten plik przy:** załącznikach przetargowych, ZIP/7Z, Marketplanet, dossier, kosztorys ATH, analizie SWZ, platformach off-BZP.

---

## 1. Co to jest P2-H

Seria sprintów **dokumenty przetargowe** — pobieranie z platform zamawiających, rozpakowywanie archiwów, pipeline dossier → kosztorys → karta ofertowa.

**Nie dotyka:** Command Center, Dashboard, scoringu listy przetargów, strategii GO/HOLD.

| Sprint | Wersja | Commit | Zakres |
|--------|--------|--------|--------|
| **P2-H.1** | 2.55.0 | *(prod)* | Marketplanet `*.ezamawiajacy.pl` — sesja JSESSIONID, discover + download |
| **P2-H.1 hotfix** | 2.55.1 | *(prod)* | `sourcePageUrl` w document-bytes + JobFilePreviewModal |
| **P2-H.2** | 2.55.2 | *(prod)* | Double ZIP unpack fix · `filterOuterArchiveWhenInnerExists` |
| **P2-G.2C/2D** | 2.55.3–4 | `329d883` | Klasyfikacja ATH WM/ZZK (wod-kan, gaz, C.O.) — **osobna seria P2-G** |
| **P2-H.3** | **2.55.5** | **`d725c24`** | **7Z archive support** (7z-wasm LGPL) |

---

## 2. Architektura pipeline dokumentów

```text
discoverTenderDocuments (Edge)
  readmodels (e-Zamówienia) → mp-client → off-platform adapters
    ├── ezamawiajacy.pl (P2-H.1)
    ├── logintrade.net
    ├── platformazakupowa.pl (lista tylko — brak public API)
    └── BIP / external crawl

buildTenderDocCandidates (client)
  outer docs + inner z ZIP/7Z (max 20 inner / archiwum)

discoverBestCostDocument → parseTenderDocumentCandidate → parseTenderDossierDocuments
  ATH/NOR/XML/XLS/XLSX · PDF/DOCX = tekst SWZ (bez tabel kosztorysu)

analyzeTenderWithDossier → TenderBidPrepPanel (karta ofertowa)
```

### Kluczowe pliki (SSOT)

| Plik | Rola |
|------|------|
| `src/lib/tender-document-resolver.ts` | **`buildTenderDocCandidates`**, `parseTenderDocumentCandidate`, `parseTenderDossierDocuments`, `filterOuterArchiveWhenInnerExists` |
| `src/lib/tenders-bzp-doc-parse.ts` | PDF/DOCX/XLSX/ZIP/7Z parse · lazy import ciężkich lib |
| `src/lib/wgdom-7z-archive.ts` | **P2-H.3** — `list7zFiles`, `read7zEntry`, `pickBestFrom7zBytes` (7z-wasm) |
| `src/lib/tender-cost-discovery.ts` | `discoverBestCostDocument` — typy ATH/NOR/XML/XLS/XLSX + `zip_*` dla inner |
| `src/lib/tender-dossier-pipeline.ts` | `analyzeTenderWithDossier`, `buildKosztorysStatusLine`, scanSummary |
| `src/lib/tender-ezamawiajacy.ts` | Klient discover/download Marketplanet |
| `src/lib/tender-platform-adapters.ts` | Host detection, Logintrade, platform URLs |
| `src/lib/tenders-bzp-filename.ts` | `isZipFilename`, `is7zFilename`, `scoreTenderFilename` |
| `src/lib/tender-document-role.ts` | `classifyDocumentRole`, re-export `is7zFilename` |
| `src/lib/tender-analysis-coverage.ts` | Tabela wsparcia typów plików |
| `src/app/TenderAttachmentsPanel.tsx` | UI „Pokaż pliki w ZIP/7Z” |
| `src/app/JobFilePreviewModal.tsx` | Podgląd inner z archiwum |
| `supabase/functions/.../index.tsx` | Edge: discover, document-bytes, magic bytes guard |

### Edge endpoints

| Endpoint | Uwagi |
|----------|--------|
| `GET /tenders-bzp-documents` | `?tenderId=&noticeNumber=` |
| `GET /tenders-bzp-document-bytes` | `downloadUrl` + **`sourcePageUrl`** obowiązkowe dla Marketplanet |
| `POST /tenders-external-discover` | BIP + priorytet ezamawiajacy |

**Marketplanet:** bez `sourcePageUrl` → **502** „Marketplanet session replay required”.

---

## 3. ZIP vs 7Z — zachowanie (P2-H.2 + P2-H.3)

| Operacja | ZIP (JSZip) | 7Z (7z-wasm) |
|----------|-------------|--------------|
| List inner | `listZipFiles` | `list7zFiles` (-slt, score≥6) |
| Read inner | `readZipEntry` | `read7zEntry` (cache extract) |
| Best file | `pickBestFromZipBytes` | `pickBestFrom7zBytes` |
| Inner w kandydacie | `zipInnerPath` (ta sama nazwa pola dla ZIP i 7Z) |
| Outer skip | `filterOuterArchiveWhenInnerExists` | ten sam helper |
| Max inner | 20 | 20 |

**Biblioteka 7Z:** `7z-wasm@1.2.0` — **GNU LGPL** (OK komercyjnie).  
**Odrzucono:** `archive-wasm` (GPL-3.0).

**Bundle:** WASM ~1.65 MB w chunku `tenders-bzp-doc-parse` (lazy).

---

## 4. Cost discovery — co liczy się jako kosztorys

`discoverBestCostDocument()` rozpoznaje:

- `.ath`, `.nor`, `.xml`, `.xlsx`, `.xls`
- Inner z archiwum: nazwa `"outer.7z → plik.ath"` → typ `zip_ath` (litera „zip” = inner archive, nie format)

**NIE kosztorys (obecnie):**

- PDF przedmiaru (`*_PR.pdf`) — tekst SWZ OK, **brak ekstrakcji tabel**
- Foldery w 7Z bez rozszerzenia (np. `II. PRZEDMIARY` score 35 — znany edge case)

---

## 5. Audyt prod — Kąty Wrocławskie (READ ONLY, 2026-06-13)

**Przetarg:** Modernizacja toalet UMiG Kąty Wrocławskie  
**tenderId:** `ocds-148610-4ae89f77-4442-4aae-9e7e-6cd048af333e`  
**Platforma:** ezamawiajacy (4 docs)

### Werdykt audytu

| Pytanie | Odpowiedź |
|---------|-----------|
| P2-H.3 bug? | **NIE** — 14 MB 7Z pobrane, rozpakowane, 20 inner candidates |
| Dlaczego „Wykryto wyłącznie archiwum 7Z”? | **Archiwum bez ATH/XLS** — tylko PDF projektów/przedmiarów |
| Root cause | **A) brak kosztorysu w archiwum** + **mylący komunikat UX** |

**Zawartość 7Z (35 ścieżek):** PAB, PT, STWiOR, decyzje — **wyłącznie PDF**.  
Przedmiary: `*_PR.pdf` w folderze `II. PRZEDMIARY` — nie ATH/XLSX.

**Skrypty audytu (lokalne):**

```bash
npx vite-node scripts/audit-p2h3-katy-7z.mjs
npx vite-node scripts/audit-p2h3-katy-candidates.mjs
```

---

## 6. OPEN — P2-H.4 i backlog

### P2-H.4 — UX copy 7Z (rekomendowany następny krok)

**Problem:** `buildKosztorysStatusLine()` pokazuje „Wykryto wyłącznie archiwum 7Z” gdy `sevenZipCount>0 && ath=0 && xlsx=0`, **nawet gdy 7Z zostało rozpakowane**.

**Fix (minimalny):**

1. Dodać do `scanSummary`: `sevenZInnerCount` / `sevenZUnpackOk`
2. Rozróżnić komunikaty:
   - unpack fail → „Nie udało się odczytać archiwum 7Z”
   - unpack OK, brak ATH/XLS → „Archiwum 7Z rozpakowane — brak pliku kosztorysowego (ATH/XLS/XLSX)”

**Pliki:** `tender-dossier-pipeline.ts`, `tender-document-resolver.ts` (trace → summary).

### Backlog produktowy (bez polecenia)

| ID | Temat | Uwagi |
|----|-------|-------|
| P2-H.5 | PDF przedmiar (`*_PR.pdf`) w cost discovery | Wymaga parsera tabel PDF lub heurystyki |
| P2-H.6 | `list7zFiles` — pominąć wpisy bez rozszerzenia pliku | Fix folder `II. PRZEDMIARY` w pickBest |
| P2-H.7 | Edge `assertDownloadMagicBytes` — magic 7z (`37 7a bc af`) | Obecnie 7z przechodzi bez walidacji |

**Nie startować** bez AUDIT → RCA → PLAN.

---

## 7. Testy regresji

| Test | Komenda | PASS (baseline) |
|------|---------|-----------------|
| Dossier + P2-F | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` | 163 |
| 7Z archive | `npx vite-node scripts/test-tender-7z-archive.mjs` | 21 |
| Analysis coverage | `npx vite-node scripts/test-tender-analysis-coverage.mjs` | 26 |
| Cost intelligence | `npx vite-node scripts/test-tender-cost-intelligence.mjs` | 357 |
| Marketplanet smoke | `npx vite-node scripts/smoke-test-ezamawiajacy-p2h1.mjs` | T1–T10 |
| ZIP double unpack | `npx vite-node scripts/smoke-test-ezamawiajacy-p2h2-double-unpack.mjs` | — |
| Workspace UX | `npx vite-node scripts/test-tender-workspace-ux.mjs` | 48 |

**Fixture 7Z:** `scripts/fixtures/test.7z` (sample.ath, sample.xlsx, sample.pdf)  
**Regeneracja:** `npx vite-node scripts/create-7z-fixture.mjs`

---

## 8. Platformy — stan wsparcia

| Platforma | Discover | Download | ZIP | 7Z | Uwagi |
|-----------|----------|----------|-----|-----|-------|
| e-Zamówienia readmodels | ✓ | ✓ | ✓ | ✓ | Standard BZP |
| **ezamawiajacy.pl** | ✓ | ✓ + sourcePageUrl | ✓ | ✓ | WM, ZZM, UMiG Kąty… |
| logintrade.net | ✓ | ✓ | ✓ | ✓ | ZZK Wrocław |
| platformazakupowa.pl | częściowo | ręcznie | — | — | Brak public API listy |
| BIP / external | ✓ crawl | ✓ | ✓ | ✓ | POST external-discover |

---

## 9. Wznowienie pracy (agent)

```text
1. docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md  ← TEN PLIK (dokumenty/dossier)
2. docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md     ← 5 workspace tabs
3. docs/PROJECT-HANDOFF-CURRENT.md                  ← baseline prod
4. docs/ARCHITECTURE.md § 12.1.7                    ← P2-H technicznie
5. CURRENT-TASK.md
6. curl -s https://www.wgdom.fun/version.json       → 2.55.5
```

**Przed zmianą w dossier/archiwach:**

```bash
npx vite-node scripts/test-tender-7z-archive.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npm run build
```

**Release:** workflow B — [`docs/WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)

---

## 10. Mapa powiązanych handoffów

| Temat | Dokument |
|-------|----------|
| UX workspace (5 tabs) | `SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md` |
| Kwalifikacja P2-F | `SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md` |
| Cost intelligence P2-G | `ARCHITECTURE.md` § 12.1.6 |
| Baseline prod | `PROJECT-HANDOFF-CURRENT.md` |

**Werdykt P2-H.3:** **COMPLETE** · prod verified · następny logiczny krok: **P2-H.4 UX copy**
