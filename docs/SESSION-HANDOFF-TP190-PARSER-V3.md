# SESSION HANDOFF — TP190 Parser v3 + Batch Rebuild

> **Status:** **TP190A→TP190C-3B CLOSED** (prod **2.62.27** · `df2524f`) · **TP190C-3C batch write prod** — **OPEN** (na osobne polecenie)  
> **Baseline prod:** **v2.62.27** · commit **`df2524f`**  
> **SSOT wersji parsera:** `CURRENT_PARSER_VERSION = 3` w `tender-dossier-parser-version.ts`  
> **Powiązane:** [`SESSION-HANDOFF-PDF-WM-RECOVERY.md`](SESSION-HANDOFF-PDF-WM-RECOVERY.md) · [`SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md`](SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md) · [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md)

---

## 1. Problem biznesowy

Po rollout PDF WM Recovery (TP196–TP198C, prod 2.62.10) użytkownik nadal widział **stare snapshoty kosztorysu** w KV/LocalStorage:

1. **Brak `parserVersion`** lub wersja `< 3` — dossier nie był automatycznie przebudowywany po poprawkach parsera.
2. **Re-analyze / lazy dossier** mogło **zdegradować** dobry ATH/PDF do pustego XLS lub CASE 3 (0 rows).
3. **Silny PDF recovery** (≥120 poz., CASE 1) przegrywał z ATH przy merge mimo wyższej jakości biznesowej.
4. **Node vs Browser** — vite-node zwracał `noTextLayer` dla PDF z tekstem → fałszywy CASE 3 w audytach/skryptach.
5. **9 stale dossier** na prod KV (`kosztorys.ok` + `parserVersion ≠ 3`) — wymaga batch migracji.

---

## 2. Łańcuch TP190 (co zrobiliśmy)

| ID | Wersja | Commit (skrót) | Cel | Kluczowe pliki |
|----|--------|----------------|-----|----------------|
| **TP190A** | 2.62.9 | `73093e4` | Quality guard przy re-analyze / lazy dossier — `pickBetterKosztorys` | `tender-dossier-pipeline.ts` |
| **TP200A** | 2.62.11 | `6b3ca8a` | `parserVersion` + `isDossierParserStale` + lazy rescan | `tender-dossier-parser-version.ts` |
| **TP190B** | 2.62.23 | `dd82593` | `CURRENT_PARSER_VERSION=3`; anti-downgrade PDF vs ATH | `tender-dossier-merge.ts` |
| **TP201C-B** | 2.62.24 | `b0792c4` | PDF WM M4 fidelity (+10 poz. TP182) | `pdf-przedmiar-heuristic.ts` |
| **TP190C-1** | 2.62.25 | `43ebc3f` | `existingKosztorysForRebuildPick` — stale rebuild bez downgrade | `tender-dossier-parser-version.ts` |
| **TP190C-2E-A** | 2.62.26 | `c869be7` | PDF extract parity Browser ↔ Node (legacy pdf.js) | `tenders-bzp-doc-parse.ts` |
| **TP190C-2E-B** | 2.62.26 | `c869be7` | `extractError` vs `noTextLayer` observability | `pdf-przedmiar-heuristic.ts`, pipeline |
| **TP190C-2C** | — | lokalnie | Discovery tie-break przy remisie źródeł | `tender-dossier-merge.ts`, `tender-document-resolver.ts` |
| **TP190C-3** | — | audyt | Operational rebuild audit — 9 stale, 0 downgrade, GO | `audit-tp190c3-operational-rebuild.mjs` |
| **TP190C-3B** | **2.62.27** | **`df2524f`** | Batch rebuild tooling (dry-run / `--write`) | `tp190c-batch-rebuild.ts` |

**Równolegle (nie TP190):** Payroll sync stability 2.62.20–2.62.22 · TP201A KNR descriptions 2.62.19.

---

## 3. Architektura — pipeline dossier (skrót dla agentów)

```text
TenderPipelineItem (kw-tenders-pipeline)
  └── tenderDossier
        ├── parserVersion          ← CURRENT_PARSER_VERSION (=3)
        ├── kosztorys              ← TenderKosztorysSnapshot (SSOT wyceny)
        ├── brief, scanSummary, …

Ścieżki parse:
  UI „Przeanalizuj dokumenty” / lazy Dokumenty-Wycena
    → analyzeTenderWithDossier()
         ├── existingKosztorysUnlessStale()     [lazy — null gdy stale]
         ├── existingKosztorysForRebuildPick() [forced rebuild — pickBetter z existing]
         └── tender-document-resolver.ts       [discovery + parse loop]
    → dossierFromAnalysisResult() → stamp parserVersion=3

Merge (ochrona jakości):
  mergeTenderDossierByQuality()     [cloud sync P0, BZP refresh P1]
  pickBetterKosztorys()             [tier ATH>PDF>XLS; TP190B PDF strong vs ATH]
  isStrongPdfRecoveryCase1()        [≥120 rows CASE 1 nie przegrywa z małym ATH]

Batch rebuild (TP190C-3B):
  isStaleDossierCandidate()         [kosztorys.ok && parserVersion≠3]
  rebuildTenderPipelineItem()       [ten sam kontrakt co UI analyze]
  runTp190cBatchRebuild()           [dry-run domyślnie; per-tender error isolation]
```

### Ranking jakości źródeł (nie zmieniać bez audytu)

```text
ATH > NOR > PDF przedmiar > ZIP PDF > XLSX kosztorys > formularz ofertowy > brak
```

Szczegóły: **ARCHITECTURE § 12.1.16** · handoff P0/P1.

---

## 4. Kluczowe pliki (mapa)

| Plik | Rola |
|------|------|
| `src/lib/tender-dossier-parser-version.ts` | `CURRENT_PARSER_VERSION`, stale detection, `existingKosztorys*` |
| `src/lib/tender-dossier-merge.ts` | `pickBetterKosztorys`, `mergeTenderDossierByQuality`, TP190B anti-downgrade |
| `src/lib/tender-dossier-pipeline.ts` | `analyzeTenderWithDossier`, `dossierFromAnalysisResult`, lazy rescan |
| `src/lib/tender-document-resolver.ts` | Discovery dokumentów, parse loop, ATH/PDF/XLS |
| `src/lib/pdf-przedmiar-heuristic.ts` | PDF WM przedmiar (TP196–TP201C) |
| `src/lib/tenders-bzp-doc-parse.ts` | pdf.js extract — Browser + Node parity (TP190C-2E-A) |
| `src/lib/tp190c-batch-rebuild.ts` | **SSOT** batch rebuild (TP190C-3B) |
| `scripts/tp190c-batch-rebuild.mjs` | CLI prod KV: dry-run / `--write` |
| `src/app/TenderDetailPanel.tsx` | UI trigger analyze + lazy dossier |

---

## 5. Testy (smoke obowiązkowy)

```bash
# TP190 core
npx vite-node scripts/test-tp190c-batch-rebuild.mjs              # 19 PASS
npx vite-node scripts/test-tp190c-stale-rebuild-protection.mjs   # 13 PASS
npx vite-node scripts/test-tp190b-dossier-stability.mjs          # 14 PASS
npx vite-node scripts/test-tender-dossier-parser-version.mjs     # 17 PASS
npx vite-node scripts/test-tender-dossier-merge-quality.mjs      # TP190A + P0/P1
npx vite-node scripts/test-tender-dossier-pipeline.mjs           # 206 PASS

# PDF recovery regresja
npx vite-node scripts/test-tp190c-extract-parity.mjs
npx vite-node scripts/test-tp190c-extract-observability.mjs
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs

npm run build
```

---

## 6. Operacje — batch rebuild prod KV

**Audyt TP190C-3 (read-only):** 9 stale dossier · symulacja 0 downgrade · avg +34.7 rows.

```bash
# DRY RUN (domyślnie — bez zapisu)
npx vite-node scripts/tp190c-batch-rebuild.mjs

# ZAPIS prod KV (tylko na świadome polecenie właściciela)
npx vite-node scripts/tp190c-batch-rebuild.mjs --write
```

Raport JSON: `audit/tp190c3b-batch-rebuild-report.json` (generowany przez skrypt; **nie commitować** do repo).

**Wymaga:** `.env` z `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_ANON_KEY`.

---

## 7. Co dalej (backlog)

| Priorytet | ID | Cel | Status |
|-----------|-----|-----|--------|
| **P0** | **TP190C-3C** | Batch `--write` na prod KV (9 stale dossier) | **OPEN** — tooling gotowy |
| P1 | **TP190C-2C** | Discovery tie-break — commit jeśli lokalne zmiany OK | lokalnie |
| P1 | **TP200B** | Kosztorys fidelity — `rows` cap 40, parse loop `pickBetter` | PLANNED |
| P2 | smartpzp.pl adapter | discover stub | częściowo (SmartPZP MVP 2.62.x) |
| P3 | PDF OCR | skany CASE 3 bez tekstu | HOLD |

**Bump `CURRENT_PARSER_VERSION`:** tylko gdy zmienia się logika parse/merge — wymusza rescan wszystkich dossier z heavy parse.

---

## 8. Pułapki (nie ruszać bez briefu)

| Pułapka | Szczegół |
|---------|----------|
| `existingKosztorys` vs `existingKosztorysForRebuildPick` | Stale rebuild **musi** widzieć existing przy pickBetter (TP190C-1) |
| `noTextLayer` vs `extractError` | CASE 3 ze skanu ≠ błąd pdf.js — osobne pola (TP190C-2E-B) |
| Node pdf.js | Używaj legacy build + `DOMMatrix` shim w skryptach (wzorzec `tp190c-batch-rebuild.mjs`) |
| Batch write | **Nigdy** domyślnie — tylko `--write` lub `TP190C_BATCH_WRITE=1` |
| Merge cloud/BZP | Osobna warstwa `mergeTenderDossierByQuality` — nie mieszać z analyze pick |

---

## 9. Werdykt

**TP190A→TP190C-3B: CLOSED** (prod 2.62.27).  
**Następny krok operacyjny:** TP190C-3C batch write prod (na polecenie).  
**Następny epic techniczny:** TP200B kosztorys fidelity.
