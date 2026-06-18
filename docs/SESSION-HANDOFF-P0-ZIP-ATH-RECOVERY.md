# SESSION HANDOFF — P0 ZIP / ATH Recovery (CLOSED)

> **Status:** **CLOSED** · prod **v2.61.4** · commit **`653abe0`** · **2026-06-18**  
> **Powiązane:** P2-H Marketplanet · V4 Kosztorys (`catalogQuantities`) · audyt TP113 Sępa Szarzyńskiego 65A

---

## 1. Problem biznesowy

Przetargi WM (Marketplanet / `*.ezamawiajacy.pl`) często mają:

- **Formularz oferty.xlsx** jako załącznik SWZ (pola KRS, Wykonawca, CEIDG)
- **Prawdziwy przedmiar** w **`DOKUMENTACJA PROJEKTOWA.zip`** (ATH wewnątrz, często **> 15 MB**)

Pipeline błędnie wybierał formularz jako kosztorys albo w ogóle nie otwierał dużego ZIP.

**Przykład walidacji:** TP113 · `08dec13d-5547-aa6d-5fad-9500015c4ea0` · Sępa Szarzyńskiego **65A** · ogłoszenie `2026/BZP 00273812/01`

---

## 2. Root cause (RCA)

| # | Warstwa | Przyczyna |
|---|---------|-----------|
| **A** | Discovery | `Formularz oferty.xlsx` trafiał do `discoverBestCostDocument()` jako jedyny „kosztorys” XLSX |
| **B** | `loadDocBytes` | `preferBzpReadmodelsFirst` dla ZIP → URL BZP readmodels `{tenderId}_{index}` → **HTTP 400** (dokumenty są na **ezamawiajacy**, nie readmodels) |
| **C** | Edge limit | `DOKUMENTACJA PROJEKTOWA.zip` ≈ **112 984 898 B** — stary limit **15 MB** w `downloadEzamawiajacyToken` |
| **D** | Transport | Pełny 108 MB ZIP jako base64 JSON do przeglądarki — niepraktyczne; potrzebna lista/extract po stronie Edge |

**Metryka `sevenZInnerCount = 0` dla TP113:** **nie bug** — TP113 ma **ZIP**, nie 7Z. Od 2.61.4 jest osobno **`zipInnerCount`**.

---

## 3. Co zrobiono (2.61.2 → 2.61.4)

### 2.61.2 — Kosztorys UI (formal filter)

- Filtr formalnych arkuszy w widoku Kosztorys V4 (`buildKosztorysV4Display`)

### 2.61.3 — Kosztorys Source Recovery

- Zakładka Kosztorys: **`catalogQuantities`** jako SSOT tabeli (nie `kosztorys.rows`)
- Commit: `8b05afb`

### 2.61.4 — ZIP ATH Recovery (ten handoff)

| FIX | Zakres | Pliki |
|-----|--------|-------|
| **A** | Wykluczenie formularza ofertowego z discovery | `tender-cost-discovery.ts` · `isFormalOfferCostFilename()` |
| **B** | Off-platform first (ezamawiajacy przed BZP) | `tender-document-resolver.ts` · `loadDocBytes()` |
| **B2** | Inner ZIP bez pełnego downloadu w przeglądarce | Edge `tenders-bzp-zip-catalog` · `tenders-bzp-zip-entry-bytes` |
| **B3** | Limit archiwów **128 MB** na Edge | `make-server-0afb8820/index.tsx` · `maxBytesForDownload()` |
| **C** | Diagnostyka pobierania (`diag` w API) | Edge + `TenderDownloadDiag` w `tenders-bzp.ts` |
| **D** | Inner XLSX bez `koszt/przedm/obmiar` → nie kosztorys | `tender-cost-discovery.ts` · `listZipFiles()` |

**Commit release:** `653abe0` · **Edge deploy:** GitHub Actions `Deploy Supabase Edge Functions` — **PASS**

---

## 4. Edge API (nowe endpointy)

| Endpoint | Rola |
|----------|------|
| `GET /tenders-bzp-zip-catalog` | Pobiera ZIP po sesji ezamawiajacy (do 128 MB), zwraca `{ entries[], zipSize, diag }` |
| `GET /tenders-bzp-zip-entry-bytes` | Pobiera ZIP + ekstrakcja jednego `innerPath` → base64 inner (ATH) |
| `GET /tenders-bzp-document-bytes` | Refactor: `downloadTenderDocumentRaw()` + pole `diag` w odpowiedzi/błędzie |

**Parametry wspólne:** `tenderId`, `documentIndex`, opcjonalnie `sourcePageUrl`, `downloadUrl`.

**Klient:** `fetchTenderZipCatalog()`, `fetchTenderZipEntryBytes()` w `tenders-bzp.ts`.

---

## 5. Pipeline (po fix)

```text
fetchTenderDocuments(tenderId, noticeNumber)   // wymaga noticeNumber dla ezamawiajacy!
  → buildTenderDocCandidates()
       → ZIP: fetchTenderZipCatalog() [Edge] — fallback loadDocBytes + listZipFiles
       → inner ATH → candidates + zipInnerPath
  → discoverBestCostDocument()   // skip isFormalOfferCostFilename
  → parseTenderDocumentCandidate()
       → zipInnerPath: fetchTenderZipEntryBytes() [Edge]
```

---

## 6. Walidacja TP113 (prod po deploy)

```bash
npx vite-node scripts/test-tender-zip-catalog-tp113.mjs
npx vite-node scripts/verify-tp113-zip-ath-recovery.mjs   # pełny dossier parse
```

| Metryka | Oczekiwane (PASS 2026-06-18) |
|---------|------------------------------|
| zipSize | **112 984 898** |
| zipInnerCount | **14** (1 ATH + 13 z Załączniki do umowy.zip) |
| ATH | `SĘPA-SZARZYŃSKIEGO 65a_P_Scalony 24.03.2026_rev1.ATH` |
| discovery | `zip_ath` · conf **0.99** · źródło `DOKUMENTACJA PROJEKTOWA.zip → …ATH` |
| sourceFilename | **nie** `Formularz oferty.xlsx` |
| rowCount | **40** |
| catalogQuantities | **250** |

---

## 7. Operacyjnie — stary snapshot w KV

Jeśli przetarg był analizowany **przed** 2.61.4, w `kw-tenders-pipeline` może zostać stary `tenderDossier.kosztorys.sourceFilename` = Formularz oferty.

**Fix dla użytkownika:** Przetargi → TP113 → **Analizuj** / ponowny skan dossiera (wymusza rebuild z nowym pipeline).

---

## 8. Testy regresji

```bash
npm run build
npx vite-node scripts/test-tender-cost-discovery.mjs      # 17 PASS — TP113 mock
npx vite-node scripts/test-tender-dossier-pipeline.mjs    # 202 PASS
npx vite-node scripts/test-tender-zip-catalog-tp113.mjs # live Edge
npx vite-node scripts/test-v41-kosztorys-workspace.mjs    # Kosztorys V4 UI
```

---

## 9. Kluczowe pliki (nie zmieniaj bez briefu)

| Plik | Rola |
|------|------|
| `src/lib/tender-cost-discovery.ts` | `isFormalOfferCostFilename`, `discoverBestCostDocument` |
| `src/lib/tender-document-resolver.ts` | `loadDocBytes`, `loadZipInnerEntries`, `buildTenderDocCandidates` |
| `src/lib/tenders-bzp.ts` | `fetchTenderZipCatalog`, `fetchTenderZipEntryBytes`, `TenderDownloadDiag` |
| `src/lib/tenders-bzp-doc-parse.ts` | `listZipFiles` — cost-relevant inner |
| `supabase/functions/make-server-0afb8820/index.tsx` | Edge download + zip-catalog + zip-entry-bytes |

**Nie zmieniaj bez polecenia:** limit 15 MB dla PDF/DOCX (tylko ZIP/7Z → 128 MB), semantyka `zipInnerPath`, `sourcePageUrl` Marketplanet.

---

## 10. Backlog OPEN (poza tym P0)

| ID | Temat | Uwagi |
|----|-------|-------|
| **P2-H.7** | Edge magic bytes dla 7Z | Istniejący backlog P2-H |
| **V3.1 Sprint 2** | Landing DECYZJE · Zasoby · Quick Estimate | patrz `docs/V3.1-SPRINT-1-IMPLEMENTATION-PLAN.md` |
| **P3 Export** | Notatki operacyjne PDF/DOCX | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **Bulk rescan** | Masowe odświeżenie dossier WM z ZIP >15 MB | opcjonalnie — tylko na polecenie |

---

## 11. Werdykt

**P0 ZIP / ATH Recovery — CLOSED** (prod 2.61.4, TP113 validated).

Kosztorys pokazuje pozycje robót z ATH gdy dossier został **ponownie zeskanowany** po release.
