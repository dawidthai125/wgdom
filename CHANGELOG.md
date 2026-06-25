# W&G DOM — changelog (skrót dla agentów AI)

> **Handoff SSOT:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) · **prod 2.62.68** · **Workflow Hub EPIC A**

## 2.62.68 — Workflow Hub (EPIC A)

- **improve:** Przetarg = Workflow Hub (postęp V2, blokery, prep status, operator) · Decyzja = werdykt + ekonomia + GO/HOLD/ODPUŚĆ — bez duplikacji workflow
- **test:** `test-tender-workflow-hub.mjs` · regresja `test-p5-owner-view.mjs` · `test-tender-workspace-ux.mjs`

## 2.62.67 — Przetargi Lista UX V4

- **improve:** uproszczony główny widok listy — banner (klikalny) · Moja kolejka (2 chipy) · Klienci · Filtry zaawansowane (operacyjne, KPI, presety, pipeline)
- **test:** `test-tenders-list-ux.mjs` (V2/V3/V4)

## 2.62.66 — Kosztorys V4 health procesu (P2 timeout / stale)

- **improve:** `deriveKosztorysProcessHealth` · slow 30s / stale 90s / timeout 180s · retry UI · `useKosztorysProcessHealth` (prezentacja only)
- **test:** `test-tender-kosztorys-process-health.mjs` (16) · regresja `test-tender-kosztorys-process-phase.mjs` · `test-p3-ux-analysis-status.mjs`

## 2.62.65 — Kosztorys V4 fazy procesu (P1 technical + saving)

- **improve:** 13 faz technicznych E0–E12 · `deriveKosztorysTechnicalPhase` · faza `saving` (`dossierSaving`) · `resolveKosztorysAwaitingParseDisplay` w Owner View / Wycena / SSOT
- **test:** `test-tender-kosztorys-process-phase.mjs` (18) · regresja `test-p3-ux-analysis-status.mjs`

## 2.62.64 — Kosztorys V4 fazy procesu (P0 UX)

- **improve:** `deriveKosztorysProcessPhase` + `KosztorysProcessStatusBar` — 8 faz biznesowych; błąd parse → „Analiza została przerwana” + ponów
- **test:** `test-tender-kosztorys-process-phase.mjs`

## 2.62.63 — Discovery dokumentów (variant B root-cause)

- **fix:** bramka discovery bez noticeNumber/noticeHtml; documentsFetchedAt tylko po autorytatywnym fetch; noticeHtml do Edge; retry bootstrap po anchor
- **test:** `test-tender-documents-bootstrap-retry.mjs` · regresja `test-smartpzp-mvp.mjs`

## 2.62.62 — Strategia UX.2T (układ decyzyjny)

- **improve:** rekomendacja → dlaczego → działania → ryzyka → pozostałe (zwinięte)
- **test:** `test-tender-strategy-ux.mjs`

## 2.62.61 — Workspace V2 Następny krok (etykieta przycisku)

- **fix:** P5 „Znajdź kosztorys” → przycisk „Przejdź do kosztorysu” (nawigacja na zakładkę Kosztorys)
- **test:** `test-tender-workspace-v2-ux.mjs` (P5/P9 button label parity)

## 2.62.60 — Tender Workspace Automation

- **improve:** auto-checklista · auto timeline · insights 2–3 · auto progress
- **test:** `test-tender-workspace-v2-ux.mjs`

## 2.62.59 — Tender Workspace V2

- **new:** status realizacji 0–100% · następny krok · oś czasu · dokumenty 1-klik · checklista
- **test:** `test-tender-workspace-v2-ux.mjs`

## 2.62.58 — Przetargi Lista UX V3

- **new:** Moja kolejka (decyzje, terminy, kosztorys, referencje) · ulubione presety (localStorage)
- **improve:** sticky toolbar (szukaj, status, filtry, odśwież)
- **new:** komunikaty AI (heurystyki UX)
- **test:** `test-tenders-list-ux.mjs` (kolejka, presety, sort)

## 2.62.57 — Przetargi Lista UX V2

- **improve:** klikalne KPI → filtry · pasek szybkich filtrów (Wszystkie/Moje/…)
- **new:** sekcja „Dzisiaj” (wymaga reakcji) · sort pilne → strategiczne
- **improve:** prefs filtrów w localStorage `wg-tenders-list-filter-prefs-v2`
- **test:** `test-tenders-list-ux.mjs`

## 2.62.56 — Przetargi Lista UX rework

- **improve:** KPI kompakt (4 metryki) · wyszukiwarka + chipy filtrów wyżej · lista bliżej góry ekranu
- **improve:** Pipeline + legenda zwinięte · „Filtry zaawansowane” (lista/status) · ikony CSV/masowy
- **UX-only:** bez zmian BZP, pipeline danych, parserów, sync

## 2.62.55 — WM Schematy Right Edge Clipping Hotfix

- **fix:** ucinanie ostatniego obwodu w PDF — `columnRightInset` 96 px w `bus-layout-v2`
- **fix:** apartment-1f-v1 / 3f-v1 — ostatnia kolumna mieści się w viewBox (MCB + etykiety)
- **test:** `test-schematic-1f-right-edge-margin.mjs` R01–R05 · regresja `test-schematic-v1b-visual-smoke.mjs`

## 2.62.54 — WM Schematy Header Input Spaces Hotfix

- **fix:** spacje w polach Tytuł i Adres (nagłówek PDF) — usunięto `.trim()` przy zapisie w `parseSingleLineDiagram`
- **fix:** fallback DEFAULT_SCHEMATIC_TITLE tylko gdy pole faktycznie puste
- **test:** `test-schematic-header-spaces-hotfix.mjs` · `test-wm-schematics-ui-3b.mjs` U09

## 2.62.53 — WM Druk Detached RAP Crash Hotfix

- **fix:** crash po utworzeniu samodzielnego RAP (`reportNumber` na null selected)
- **fix:** race condition — fallback selectedId → focusedMeasurementId → jobReports[0]
- **fix:** null-safety reportNumber w panelu edycji i Katalogu Pomiarów
- **test:** `test-electrical-measurements-independent-rap.mjs` T8/T9

## 2.62.52 — WM Druk Pomiary UX Upgrade

- **new:** detached RAP (samodzielne pomiary bez Roboty) · edycja RAP z Katalogu · usuwanie single/bulk
- **new:** Registry Guard (CANCELLED w registry) + tombstone `kw-electrical-measurements-deleted-ids`
- **improve:** `linkStatus` linked/detached · `manualAddress` / `manualFlatNumber`
- **test:** `test-electrical-measurements-independent-rap.mjs` · `test-electrical-measurements-catalog-edit.mjs` · `test-electrical-measurements-delete-registry-guard.mjs`

## 2.62.51 — WM Schematy layout scale V2 (renderer v5)

- **improve:** bus layout v2 — szyna do ostatniego obwodu, pełny span kolumn
- **improve:** większe symbole, kropki r=6, viewBox 1360×780 (3F) / 1248×748 (1F)
- **improve:** wykorzystanie strony A4 ~93% tuszu vs referencja WM
- **test:** `test-schematic-v1b-visual-smoke.mjs` · renderer `SCHEMATIC_RENDER_VERSION=5`

## 2.62.50 — WM Schematy visual fidelity (renderer v4)

- **improve:** backbone supply→szyna, RCD tee, spacing, wieloliniowe etykiety MCB/RCD
- **improve:** symbol kuchenki 3P, grubsza szyna, kropki r=5, linie pomocnicze kolumn
- **fix:** podwójna etykieta „Kuchenka Elektryczna”
- **test:** `test-schematic-v1b-visual-smoke.mjs` · renderer `SCHEMATIC_RENDER_VERSION=4`

## 2.62.49 — WM Druk Schematy MVP UI

- Zakładka **Schematy** (między Pomiary a Katalog Pomiarów)
- `WmPrintSchematicsPanel` + `WmPrintSchematicEditor` — lista, edytor, podgląd SVG, eksport PDF
- Sync `kw-electrical-schematics` · smoke `test-wm-schematics-ui-3b.mjs`

## 2.62.48 — P4 WM Druk upload toast

- **fix:** `resolveWmPrintTemplateUploadToast` — brak „Dodano 0 plików” gdy storage OK, added=0
- **test:** `test-wm-print-upload-toast-p4.mjs`

## 2.62.47 — TP203 Address Parser Recovery M1

- **fix:** `parseJobAddressParts` — `m.3`, `lok.`, `mieszkanie`, slash `26/3`, budynek z literą `12A`
- **test:** `test-wm-print-address-parser-tp203.mjs` · manual gate Kleczkowska 95/96/97 PASS

## 2.62.46 — ZI Tauron 2026 · hotfix §5 zgłaszający (P0 OWNER ADDRESS)

- **fix:** `applyAddressSectionFields` — tylko 95–97; §5 z graftu szablonu WM
- **test:** preservation smoke — Szkolna/Stróża/55-081 zachowane

## 2.62.45 — ZI Tauron 2026 · adres §4 dual-fill (P1 ZI-PDF-ADDRESS-COMPLETENESS)

- **improve:** `applyAddressSectionFields` — 95–97 + 99/111/112, 101←JOB_CITY, 102/110 czyszczone
- **test:** `test-wm-print-zi-2026-smoke.mjs` · `test-wm-print-zi-2026-preservation-smoke.mjs`

## 2.62.44 — Lista Płac · godziny ETAP 1 (P0 PAYROLL-HOURS-PERSISTENCE)

- `updateWeekEmployeeDay/Rate/PrevSaturday/PayrollCarryForward` — functional patch w `App.tsx`
- `WeekEmployeeDetail` — `onPatchDay/Rate/PrevSaturday` zamiast `onChange({...safeEmp})`
- Smoke: `scripts/test-payroll-hours-etap1.mjs` (A2/A3/A4)

## 2.62.43 — Lista Płac · koszty do zwrotu ETAP 1 (P0 PAYROLL-EXTRACOSTS-FIDELITY)

- **fix:** `onPatchExtraCosts` — zapis kwoty na `prev` state (bez stale `safeEmp` snapshot)
- **fix:** `updateWeekEmployeeExtraCosts` w `App.tsx` + archiwum
- **test:** `test-payroll-extra-cost-etap1.mjs` · `test-payroll-extra-cost-amount-rca.mjs` · smoke helpers
- **backlog:** ETAP 2 merge fidelity (`mergeExtraCostsById`) — tylko na zgłoszenie autosync/multi-device

## 2.62.37 — Audit Hub localeCompare crash hotfix

- **fix:** `collectAuditHubFilterOptions` — bezpieczny sort `(label ?? "")` przy legacy `actor` undefined
- **fix:** `sortAuditFeed` + adaptery — `feedAt`/`feedActor`; fallback we wszystkich 5 źródłach
- **fix:** `JobsView` — `photo_upload` zapisuje `createdByName` w `activityLog`
- **test:** `test-audit-hub-view-model.mjs` +10 legacy (32 PASS) · adapters 47 PASS

## 2.62.36 — Audit Hub MVP-0B

- **new:** Widok `audit` — Super Admin only; `AuditHubView` lazy; agregacja 5 źródeł bez nowego KV
- **new:** Filtry source/actor/search, KPI, paginacja 50, deep linki (notatki, inspektor, roboty, WM Druk)
- **lib:** `src/lib/audit-hub/*` — adapters, filters, acl, deeplink, view-model
- **test:** `test-audit-hub-adapters.mjs` (47) + `test-audit-hub-view-model.mjs` (22)

## 2.62.35 — Operational Notes Unread Counter Fix

- **fix:** `mergeOperationalNotePair` — fingerprint ACK; brak fałszywego podbijania `contentRev` przy identycznej treści
- **fix:** `pullOperationalNotesAuxFromCloud` catch → fallback localStorage; deferred bootstrap sync read-state
- **fix:** `App.tsx` — `WGDOM_DEFERRED_BOOTSTRAP_EVENT` odświeża notes + read-state w React
- **test:** `test-operational-notes-unread-content-rev.mjs` T1–T5 + regresja p0/p1/sync-race

## 2.62.34 — Work Entry Delete Persistence

- **fix:** `deletedWorkEntryTombstones[]` na `Job` — usunięty wpis pracy nie wraca po sync z chmurą
- **fix:** `mergeWorkEntriesById` filtruje tombstone przed union
- **fix:** JobsView + Pulpit (`fixJobsForConsistencyAlert`) — SSOT `removeWorkEntryFromJobs` / `removeWorkEntriesMatchingFromJobs`
- **test:** `test-payroll-work-entry-merge-fidelity.mjs` T1–T9b (29 PASS)

## 2.62.33 — Formal XLSX UI Guard

- **fix:** Kosztorys V4 — formularz oferty XLSX bez qty>0 nie renderuje fałszywej tabeli pozycji
- **fix:** `resolveEffectiveKosztorysV4CatalogLines` — SSOT display spójny z `resolveCatalogQuantities`
- **test:** `test-v41-kosztorys-workspace.mjs` T09A (63 PASS)

## 2.62.32 — R1-FIX ATH vs Strong PDF Recovery

- **fix:** `pickBetterKosztorys` — silny PDF Recovery (CASE 1, ≥120 poz.) wygrywa nad ATH tier gdy `pdfRows > athRows × 1.05` (np. 150 vs 128)
- **fix:** TP190B-2 zachowany — PDF 132 vs ATH 128 nadal preferuje ATH (ratio 1.031 < 1.05)
- **test:** `test-tp190b-dossier-stability.mjs` R1-FIX 150/128, 150/105, 145/128 + regresja merge/stale (60 PASS)

## 2.62.31 — TP202A Analyze/Dossier Consistency (+ infra deploy unblock)

- **fix:** `dossierFromAnalysisResult` — spread existing dossier; re-analyze nie kasuje `bidProposal` i pól poza analizą
- **fix:** `analyzeTenderWithDossier` — `ourEstimatePln` użytkownika chronione (zgodnie z heavy pipeline)
- **fix:** `runAnalysis` / batch rebuild — `existingDossier` przekazywany do merge wyniku
- **test:** `test-tp202a-analyze-dossier-consistency.mjs` (12 PASS) + regresja dossier/analyze (322 PASS)
- **infra (deploy unblock):** `8a2f6d8` mkdir `dist/` w vite SW + version.json · `d79f7c1` dodany `tender-cost-content-detection.ts` (był untracked od `c869be7`)
- **docs:** `SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md` + aktualizacja handoffów agentów

## 2.62.30 — TP201E-B Layout Corruption Recovery

- **fix:** skip WM footer layout rows — Norma PRO / scalony OBMIAR / `- N -` (LP 115)
- **fix:** WM corruption aliases — `wyłącznikpodłoże`, `pojemkońc.k` → `pojemności kabla` (LP 124)
- **improve:** `UNIT_RE` — j.m. `końc.k` (WM elektryka)
- **improve:** TP182 layout extract 148 → 150 pozycji (+2)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201E-B-1…3 (85 PASS) + TP182/TP201A regresja PASS

## 2.62.29 — TP201E-A PDF Recovery M6A

- **fix:** split złączonych LP — Montaż/Demontaż/Dostawa/Wymiana + RAZEM boundary (fix JS `\b` + `ż`)
- **fix:** kalk/Kalkulacja deferred qty — max 4 layout rows (LP 66)
- **fix:** section trailer allowlist — `3.6 Pomiary elektryczne` (LP 140)
- **improve:** LP action bez KNR — wycena indywidualna (LP 44)
- **improve:** TP182 layout extract 145 → 148 pozycji (+3)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201E-A-1…8 (82 PASS) + TP182/TP201A regresja PASS

## 2.62.28 — TP201D PDF Recovery M5

- **improve:** `metr` / `metr bieżący` / `metr biezacy` / `metr biezący` → `mb` w `normalizePdfBoqUnits` + `UNIT_RE`
- **fix:** kalk. własna — opis marker-only (`d.X.Y` + liczba) nie odrzuca pozycji; fallback „Kalkulacja własna”
- **improve:** TP182 layout extract 142 → 145 pozycji (+3)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201D-1…10 (74 PASS) + TP182/TP201A regresja PASS

## 2.62.27 — TP190C-3B Batch Rebuild Tooling

- **new:** `tp190c-batch-rebuild.ts` + `scripts/tp190c-batch-rebuild.mjs` — batch rebuild parserVersion=3
- **improve:** dry-run domyślnie; `--write` zapisuje KV; obsługa błędów per tender
- **improve:** zgodność TP190B + TP190C-1; przygotowanie migracji 9 stale dossier
- **test:** `test-tp190c-batch-rebuild.mjs` T1–T6 (19 PASS)
- **docs:** `SESSION-HANDOFF-TP190-PARSER-V3.md` + aktualizacja handoffów dla agentów AI

## 2.62.26 — TP190C-2E PDF Extract Parity + Observability

- **fix (2E-A):** Browser ↔ Node parity — legacy pdf.js w vite-node, join fallback gdy layout pusty
- **fix (2E-A):** 3 Maja 5B_9.pdf replay: CASE 3 → CASE 1 (178 rows)
- **improve (2E-B):** `extractError` vs `noTextLayer` — osobny komunikat błędu ekstrakcji PDF
- **test:** `test-tp190c-extract-parity.mjs` + `test-tp190c-extract-observability.mjs` PASS + regresja dossier

## 2.62.25 — TP190C-1 Stale Rebuild Protection

- **fix:** stale snapshot nie odrzucany przed quality gate — `pickBetter(existing, fresh)` przy forced rebuild
- **fix:** ochrona przed downgrade (np. PDF 148 → PDF 0 CASE 3)
- **improve:** `existingKosztorysForRebuildPick` — rebuild + parserVersion=3; TP190B anti-downgrade bez zmian
- **test:** `test-tp190c-stale-rebuild-protection.mjs` TP190C-1…6 PASS + regresja dossier

## 2.62.24 — TP201C-B PDF Recovery M4 (WM)

- **improve:** TP182 +10 pozycji (132 → 142), luka recovery ~21 → ~10, lowercase-start ~1.5% → ~1.4%
- **fix:** `UNIT_RE` — obsługa `pomiar`, `pom.`, `prób.`, `prob.` (sekcja pomiarów elektrycznych)
- **fix:** LP lookahead dla `kalk. własna` (LP+opis w wierszu wyżej)
- **fix:** in-word hyphen rejoin (np. `nis- kiego`, `na- stępny`, `pojem- ności`, `gipsowo - kartonowy`)
- **fix:** LP-aware dedup + alias `Kalkulacja` → `kalk. własna`
- **test:** PASS: `test-tp201a-pdf-description-fidelity.mjs`, `test-tp182-pdf-wm-recovery.mjs`, `test-pdf-przedmiar-heuristic.mjs`, `test-tp190b-dossier-stability.mjs`, `test-tender-dossier-parser-version.mjs`, `test-tender-dossier-pipeline.mjs`

## 2.62.23 — TP190B Dossier Stability

- **fix:** `CURRENT_PARSER_VERSION` 2 → 3; forced rebuild snapshotów v2
- **fix:** anti-downgrade silnego PDF Recovery (PDF 132 nie przegrywa z ATH 40)
- **test:** `test-tp190b-dossier-stability.mjs` TP190B-1…6 PASS

## 2.62.22 — Payroll Sync Stability Pack (przydziały + Sob. poprz.)

- **fix:** `mergeJobsById` — `mergeWorkEntriesById`: union `workEntries` po id; przydziały robót nie znikają po pierwszym „Dodaj robociznę”
- **fix:** `pickPrevSaturdayByTimestamps` — przy remisie `dataUpdatedAt` → `mergePrevSaturdayByRichness` (jak `mergeDaysByRichness`)
- **fix:** Lista Płac — Sob. poprz. z godzinami nie kasowane przez cloud default inactive po sync
- **test:** `test-payroll-work-entry-merge-fidelity.mjs` T1–T6 · `test-payroll-prev-saturday-fidelity.mjs` T1–T6

## 2.62.21 — Payroll P0: merge dni (godziny nie znikają)

- **fix:** `pickDaysByTimestamps` — przy remisie `dataUpdatedAt` → `mergeDaysByRichness` (bogatszy dzień wygrywa; remis → local)
- **fix:** Lista Płac — wpisane godziny pozostają po sync chmury (Pn active + 08:00–17:00 nie kasowane przez cloud inactive)
- **test:** `test-payroll-day-merge-fidelity.mjs` T1–T6

## 2.62.20 — Payroll P0: merge asymmetry (skład nie znika)

- **fix:** `mergeWeekEmployeesForWeekRange` — przy asymetrii pustości wybierana strona niepusta (local pełny + cloud pusty → local; odwrotnie → cloud)
- **fix:** Lista Płac — pracownicy nie znikają po „Odśwież skład” / „Dodaj aktywnych” na nowym tygodniu
- **test:** `test-payroll-week-employee-merge-asymmetry.mjs` T1–T5

## 2.62.19 — PDF Recovery TP201A (description fidelity)

- **fix:** `pdf-przedmiar-heuristic` — granica kodu KNR tylko na numerach normy; pełne opisy (Próba szczelności, Wymiana wkładek, Demontaż oprawek, Izolacja rurociągów)

## 2.62.18 — Bootstrap docs retry (P1 Pack A)

- **fix:** `useTenderDocumentsBootstrap` — guard completed dopiero po sukcesie fetch; błąd sieci nie blokuje retry (remount / zakładka)

## 2.62.17 — V4 bootstrap docs on /kosztorys

- **fix:** Bezpośrednie `/przetargi/:id/kosztorys` uruchamia `useTenderDocumentsBootstrap` → `bzpDocuments` → heavy dossier

## 2.62.16 — SmartPZP MVP

- **new:** Adapter `portal.smartpzp.pl/{tenant}/public/postepowanie` — discovery + JSF download (bez logowania)
- **new:** `discoverSmartPzpDocuments` — real metadata → `bzpDocuments` (`platform: smartpzp`)
- **improve:** READMODELS skip host `smartpzp` · UX badge + CTA „Otwórz postępowanie SmartPZP”

## 2.62.15 — V4 Kwalifikacja / Oferta (?ws=)

- **fix:** `/decyzja?ws=qualification|offer` — TenderQualificationWorkspace + TenderOfferSection widoczne w V4
- **fix:** CTA OwnerView → `buildTenderDetailPathFromLegacyWorkspace` z query ?ws=

## 2.62.14 — STABILITY PATCH pre-SmartPZP

- **fix:** `applyExternalDiscovery` → `pickBetterKosztorys` (SSOT jakości kosztorysu)
- **fix:** `JobFilePreviewModal` — cap 80 wierszy + „Pokaż więcej”
- **improve:** V4 CTA → `/kosztorys` gdy dossier ma kosztorys (`shouldPreferKosztorysV4Tab`)
- **improve:** `saveTendersPipelineLocal` — QuotaExceeded → `console.warn` + telemetria LS
- **improve:** `useTenderDossierHeavyLazy` — błąd parse → `console.error` + telemetria + `dossierParseFailed`

## 2.62.13 — TP200B snapshot fidelity (500 poz.)

- **fix:** `athPreviewToSnapshot` — `SNAPSHOT_PRICED_ROWS_CAP=500` (było 40); `rowCount` = parser output
- **fix:** `shouldReplaceBestKosztorys` → `pickBetterKosztorys` (rowCount SSOT, nie `rows.length`)
- **fix:** `ath_priced` — skalowanie tylko gdy `rowCount > rows.length` (legacy gap)
- **test:** `test-tp200b-snapshot-fidelity.mjs` T1–T6

## 2.62.12 — TP200A.1 external discovery zachowuje parserVersion

- **fix:** `applyExternalDiscovery` — spread istniejącego dossier; nie kasuje `parserVersion`, `scanSummary`, `bidProposal`, `estimatePln`
- **test:** `test-tp200a-external-discovery-preserve-parser-version.mjs` T1–T6

## 2.62.11 — parserVersion + auto-rescan legacy dossier (TP200A)

- **new:** `tenderDossier.parserVersion` — wersjonowanie snapshotu (SSOT `2.62.10`)
- **fix:** legacy KV/LS bez `parserVersion` — lazy Dokumenty/Wycena wymusza ponowny parse
- **fix:** stale rescan ignoruje stary kosztorys w `pickBetter`; merge sync preferuje świeży `parserVersion`
- **test:** `test-tender-dossier-parser-version.mjs` TP200A-1…8

## 2.62.10 — PDF WM recovery: kalk po KNR + unit aliases (TP198B+C)

- **feat:** `parseKalkWlasnaPrzedmiarLine` — kotwica `KNR_IN_LINE` (kalk. własna po normie KNR)
- **feat:** WM aliasy j.m. (`wyp.` / `otw.` / `podej.` / `aparat` / `lokal.`) → `szt`
- **feat:** M4 `m`→`mb`, M5 kalk. własna bez KNR, TP198A bezpieczniejszy klucz dedup
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP196–TP198C; `test-tp182-pdf-wm-recovery.mjs` — **123 pozycji** (baseline 86)

## 2.62.9 — protect existing kosztorys during re-analysis (TP190A)

- **fix:** `analyzeTenderWithDossier` — `pickBetterKosztorys` po parse (re-analyze nie degraduje ATH)
- **fix:** `buildTenderDossierHeavy` — ten sam guard przy lazy dossier
- **test:** `test-tender-dossier-merge-quality.mjs` TP190A-1…5

## 2.62.8 — parallel dossier bytes prefetch (TP192C)

- **improve:** `tender-document-bytes-prefetch` — concurrency 4 przed parse dossier
- **improve:** `buildTenderDossierHeavy` — ~45–55% szybciej download komponentu
- **test:** `test-tender-parallel-bytes-tp192c.mjs`

## 2.62.7 — parallel PZ metadata probe (TP192B)

- **improve:** `mapWithConcurrency` — probe meta dokumentów platformazakupowa (limit 6)
- **improve:** `discoverPlatformaZakupowaDocuments` — ~30–35% szybciej po TP192A
- **test:** `test-tender-parallel-probe-tp192b.mjs`

## 2.62.6 — host detection shortcut (TP192A)

- **improve:** `shouldSkipReadmodelsProbe` — pomiń probe 1..50 dla PZ / logintrade / ezamawiajacy
- **improve:** `discoverTenderDocuments` — HTML przed probe; ~4 s szybszy cold fetch off-platform
- **test:** `test-tender-host-detection-tp192a.mjs`

## 2.62.5 — platformazakupowa filename encoding (TP194A)

- **fix:** `repairUtf8Mojibake` — Content-Disposition UTF-8↔Latin-1 (Załącznik, Ogłoszenie, robót)
- **fix:** `resolvePlatformazakupowaFilename` — HTML label gdy CD ma mojibake
- **improve:** UI legacy cache — `displayTenderFilename` / `normalizeTenderDocumentTitle`
- **test:** `test-tender-filename-encoding-tp194a.mjs` + live 1319989

## 2.62.4 — Loading guard + dossier metadata safety (TP193B)

- **fix:** `useTendersPipeline` — `setLoading(false)` w `finally` na ścieżce cache mount
- **fix:** `isFalsePositiveCriterion` — guard `(c.name ?? "").trim()` (brak crash na awardCriteria bez name)
- **fix:** `buildTenderDossierHeavy` — `applyMetadataConfidence` best-effort; `scanSummary.parsedAt` zawsze
- **test:** `test-tender-dossier-pipeline.mjs` — regresja TP193B

## 2.62.3 — Heavy dossier loop hotfix (TP193A)

- **fix:** `buildTenderDossierHeavy` — `scanSummary.parsedAt` po pierwszym heavy parse (koniec pętli `builtAt`)
- **fix:** Brak wielokrotnych zapisów KV / toastów „Nie udało się zapisać pipeline do chmury”
- **test:** `test-p3-fix-c-performance.mjs` — regresja TP193A

## 2.62.2 — Open Nexus / platformazakupowa.pl (TP191)

- **new:** Adapter publicznych dokumentów Open Nexus — guest session + `/file/get_new/` (transakcja/{id})
- **fix:** UX platform awareness — bez fałszywego komunikatu „login required”
- **improve:** Badge ✓ platformazakupowa.pl · CTA Otwórz postępowanie
- **test:** `test-platformazakupowa-public-documents.mjs` (14 PASS)

## 2.62.1 — docs: P0/P1 Kosztorys Merge Quality handoff (agent AI)

- **docs:** `SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md` — SSOT dla TP113/TP182 merge path
- **docs:** ARCHITECTURE § 12.1.16 · AGENT-ONBOARDING § 6e · AGENTS.md · CURRENT-TASK.md
- **infra (prod):** `4574182` P0 cloud merge · `50d7501` P1 BZP merge · `tender-dossier-merge.ts`

## 2.62.1 — WM PDF przedmiar recovery (TP182)

- **fix:** M1 normalizacja j.m. (`m 2`→`m2`, `szt.`→`szt`) · M2 split BOQ po KNR/d.X.Y
- **fix:** Extended norms — KNR-W, ZKNR, NNRNKB, KNR AT
- **fix:** Merge protection — PDF przedmiar discovery nie przegrywa z formularzem ofertowym XLSX
- **test:** `test-tp182-pdf-wm-recovery.mjs` (≥80 pozycji)

## 2.62.0 — Kosztorys PRO Dashboard (V4.2 + V4.2A UX polish)

- **new:** KOSZTORYS PRO — 8 KPI, TOP 20 pozycji, filtry branżowe, Ocena kosztorysu
- **new:** Pobierz ATH (oryginalny plik)
- **improve:** V4.2A hero KPI above the fold · kompaktowy nagłówek Kosztorys
- **fix:** V4.2A bez „Dominują inne” · marża „Ustal marżę” · filtr Elektryczne · Sanitarne empty state
- **lib:** `tender-kosztorys-pro-dashboard.ts` + reuse P2 scope/fit

## 2.61.5 — Pełna widoczność ATH (P0)

- **fix:** `CATALOG_QUANTITIES_CAP` 250 → 500 (zgodnie z parserem ATH)
- **fix:** `buildCatalogQuantitiesFromPreview` — filter przed slice
- **improve:** KPI Kosztorys `rowCount` / format „pokazane / łącznie” + hint przy obciętym snapshotcie

## 2.61.4 — ZIP ATH Recovery

- **fix:** Duże ZIP do 128 MB (eZamawiający / WM) — Edge zip-catalog + zip-entry-bytes
- **fix:** Wykluczenie formularzy ofertowych z discovery kosztorysu
- **fix:** Recovery ATH z DOKUMENTACJA PROJEKTOWA.zip
- **improve:** Diagnostyka pobierania dokumentów w Edge (HTTP, content-type, final URL)
- **test:** `test-tender-zip-catalog-tp113.mjs`, `test-tender-cost-discovery.mjs`

## 2.61.3 — ATH / Kosztorys Source Recovery

- **fix:** Zakładka Kosztorys korzysta z `catalogQuantities` jako głównego źródła danych (zamiast `kosztorys.rows`)
- **fix:** Przywrócono historyczną ścieżkę wyświetlania pozycji kosztorysowych (do 250 w tabeli)
- **new:** Przycisk „Pełny podgląd ATH” — reuse `JobFilePreviewModal` (do 500 pozycji)
- **fix:** KPI kosztorysu liczone z danych katalogowych
- **fix:** Poprawiony empty state przy braku pozycji
- **unchanged:** ATH parser, parseKosztorysBytes, parseXlsxToKosztorys, dossier pipeline, athPreviewToSnapshot, Intelligence, Scoring, Qualification, Valuation Engine
- **test:** `test-v41-kosztorys-workspace.mjs` (T01–T09, 28/28)

## 2.61.2 — KOSZTORYS HOTFIX

- **fix:** Kosztorys nie renderuje formularzy ofertowych jako pozycji — filtr formalnych arkuszy (KRS, REGON, CEIDG, oferta, wykonawca, oświadczenia)
- **fix:** Walidacja pozycji przed tabelą + empty state dla dokumentów formalnych
- **fix:** KPI kosztorysu po przefiltrowanych danych (`buildKosztorysV4Display`)
- **unchanged:** ATH/SWZ parser, dossier pipeline, Intelligence, Scoring, Qualification, Valuation, backend
- **test:** `test-v41-kosztorys-workspace.mjs` (T01–T05, 16/16)

## 2.61.1 — PRZETARG + KOSZTORYS + KPI PRO

- **new:** Zakładka **Przetarg** — dane, warunki udziału, zakres robót, najważniejsze informacje
- **new:** Zakładka **Kosztorys** — KPI, status ATH, tabela pozycji, „Brak rozpoznanych pozycji”
- **new:** **KPI Bar PRO** — dokumenty, ATH, wycena (ratio + %)
- **improve:** Kolejność zakładek: Przetarg → Dokumenty → Kosztorys → Ceny → Decyzja → Strategia → Materiały
- **unchanged:** ATH/SWZ parser, Intelligence, Qualification, Dossier, Scoring, backend

## 2.61.0 — WGDOM V4 UX NAVIGATION MVP

- **new:** Osobny widok przetargu — `/przetargi/:id/:tab`, breadcrumb, KPI Bar, Tender Detail Page + Tab Bar
- **improve:** Lista bez accordionu — klik → osobny widok; rollback przez `TENDERS_V4_ROUTING = false`
- **unchanged:** ATH, Dossier, Scoring, Qualification, Valuation, Intelligence V3.1

## 2.60.0 — TENDER INTELLIGENCE DASHBOARD V3.1 (SPRINT 1)

- **new:** Zakładka **Intelligence** — werdykt, zakres, ekonomia, jedna akcja
- **new:** Decision Overlay O1–O5 + Reasons Policy (STARTUJ / ANALIZUJ / ODPUŚĆ)
- **new:** Executive Summary na panelu (bez wpływu na modal PDF)
- **new:** `buildTenderIntelligenceContext` — scoringContext SSOT z Providera
- **improve:** Owner View = renderer `intelligenceCtx`; 7 sekcji; OwnerNextSteps usunięte
- **improve:** `version.json` — `version`, `commit`, `timestamp` przy buildzie
- **improve:** Bez zmian: ATH, Dossier, Qualification, Valuation, PDF Preview
- **test:** `test-v31-tender-intelligence.mjs` + regresja P5/P1C/P1D/P2A

## 2.59.53 — P2A Scope From PDF Text

- **new:** Executive Summary wnioskuje główne roboty z `pdfTextPreview` gdy brak `categories[]` i `catalogQuantities[]` (pewność Średnia)
- **improve:** „Pozycje: 0” → „Nie ustalono liczby pozycji” / „W trakcie analizy”
- **test:** `scripts/test-p2a-scope-from-pdf-text.mjs`

## 2.59.49 — Lista Płac Przydziały robót (PAYROLL-ASSIGNMENTS-P1)

- Nowy przełącznik **Przydziały robót** w Liście Płac — edycja `workEntries[]` bez wchodzenia w Roboty
- Walidacja spójności LP↔Roboty (reuse `payrollJobConsistencyAlerts`), badge 🟢🟡🔴
- Smoke: `scripts/test-payroll-assignments-p1.mjs`

## 2.59.48 — Inspektor DESIGN-002 Design System Alignment

- **improve:** section pills jak JobDetailSectionNav · badge pakietu bez emoji · typografia sticky header + JobListPrimaryBadge · karty rounded-xl / spacing admin
- **test:** `test-inspector-design-002.mjs`

## 2.59.47 — Inspektor UX-002 Quick Wins

- **improve:** sticky status pakietu + pakiet above the fold + skróty Pobierz/Checklista/Zdjęcia
- **test:** `test-inspector-ux-002.mjs`

## 2.59.46 — Inspektor P1B Pakiet odbiorowy (download + manifest)

- **new:** InspectorPanel → Pakiet odbiorowy — status, metadane, pobierz ZIP, manifest read-only
- **new:** sync read-only `kw-delivery-package-publications` w inspektorze; manifest przy publikacji admin
- **test:** `test-inspector-delivery-package-p1b.mjs`

## 2.59.45 — Inspektor P1A Published Delivery Package (admin publish)

- **new:** WM Druk → „Opublikuj dla inspektora” — upload ZIP + `kw-delivery-package-publications`
- **new:** fingerprint wejść generacji, supersede ACTIVE, metadata (pliki, rozmiar)
- **test:** `test-delivery-package-publications-p1a.mjs`

## 2.59.44 — Docs: EM handoff + agent onboarding (no code change)

- **docs:** `SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` — SSOT modułu EM dla agentów AI
- **docs:** PROJECT-HANDOFF-CURRENT, CURRENT-TASK, ARCHITECTURE §12.1.10, AGENT-ONBOARDING, AGENTS.md

## 2.59.44 — Pomiary Elektryczne EM-P1R-HOTFIX-001 (ADDRESS parity)

- **fix:** 4 szablony pomiarowych — `Miejsce pomiaru: {{ADDRESS}}` zamiast hardcoded Sępa 83/7
- **test:** `test-em-p1r-hotfix-001-address-parity.mjs` (23 PASS)

## 2.59.43 — Pomiary Elektryczne EM-P1R (Template Rebuild SSOT Word)

- **fix:** 5 szablonów DOCX z oryginalnych formularzy Desktop — layout 1:1, legendy, orientacja
- **improve:** Retire `build-em-docx-templates.mjs` → `templatize-em-p1r-from-ssot.mjs`
- **test:** `test-electrical-measurements-p1.mjs` (32 PASS) · `test-em-p1r-visual-smoke.mjs` (60 PASS)

## 2.59.42 — Pomiary Elektryczne EM-P1.6C (Registry Repair V2)

- **fix:** Jednorazowa naprawa prod KV — usuwa RAP-2-2026 (Brochów), sierocy Cygan bez numeru; `baselineByYear.2026=44`, `repairVersion=2`; katalog/rejestr startują od zera; następny RAP = **RAP-45-2026**
- **test:** `scripts/test-electrical-measurements-registry-repair-v2.mjs`

## 2.59.41 — Pomiary Elektryczne EM-P3.5 (INDEX-POMIARY export)

- New: INDEX-POMIARY.txt + INDEX-POMIARY.csv w ZIP katalogu i w folderze Pomiary/ paczki odbiorowej

## 2.59.40 — Pomiary Elektryczne EM-P3 (integracja ZIP odbiorowy)

- New: WM Druk ZIP odbiorowy — folder Pomiary/ z 5× DOCX aktywnego RAP produkcyjnego
- Improve: struktura Odbiory/ + Pomiary/, checkbox domyślnie ON przy aktywnym RAP; TEST-RAP ignorowany

## 2.59.39 — Pomiary Elektryczne EM-P3A (Katalog UX + Rejestr RAP)

- Improve: ZIP pojedynczy `RAP-X-YYYY_ADRES.zip`, kolumna Robota, wyszukiwanie RAP, deep-link do Roboty
- New: zakładka Rejestr RAP w Katalogu Pomiarów

## 2.59.38 — Pomiary Elektryczne EM-P2.5 (raporty testowe)

- New: TEST-RAP-NNN — bez registry, bez wpływu na numerację produkcyjną, status TESTOWY w katalogu

## 2.59.37 — Pomiary Elektryczne EM-P2 (Katalog Pomiarów)

- New: WM Druk → Katalog Pomiarów — lista RAP, filtry, DOCX/ZIP pojedynczy + wielokrotny, INDEX.txt

## 2.59.36 — Pomiary Elektryczne EM-P1.6B (baseline RAP repair)

- Fix: baseline RAP 2026→44, purge test Kleczkowska/Brochów (RAP-1/2-2026), next RAP-45-2026

## 2.59.35 — Pomiary Elektryczne EM-P1.7 (domyślne ustawienia)
- `kw-electrical-measurement-settings` — pomiarowiec, model/numer miernika
- WM Druk → Ustawienia → sekcja Pomiary; auto-fill nowych raportów; nadpisanie per raport
- Smoke: `test-electrical-measurements-settings-p17.mjs`

## 2.59.34 — Pomiary Elektryczne EM-P1.6 (Rejestr RAP)
- Rejestr `kw-electrical-measurement-registry` — numer RAP przypisany 1× do jobId, bez zwrotu do puli
- UI: numer RAP read-only, status, data przypisania; recreate po usunięciu; checklista Pomiary
- Smoke: `test-electrical-measurements-registry-p16.mjs`

## 2.59.33 — Pomiary Elektryczne EM-P1.5 (Measurement Value Engine)
- Seed RNG: wartości ADSC/RCD/Rezystancja generowane raz, zapis w `valueSet`
- UI: Wyniki pomiarów + Przelicz + korekta Zs/Rs · preview/DOCX ze zapisu
- Smoke: `test-electrical-measurements-p15.mjs`

## 2.59.32 — Notatki operacyjne P0-HOTFIX-002 (read-state race)
- Fix: `runCloudSync` push aux używa `aux.readState` / `aux.auditLog` po pull (nie stale closure)
- Smoke: `test-operational-notes-sync-race-p0.mjs`

## 2.59.31 — Pomiary Elektryczne EM-UX-001 (WM Druk)
- UI Pomiary przeniesione z Roboty → WM Druk (zakładka Pomiary)
- Roboty: skrót + „Otwórz w WM Druk” · deep link z kontekstem roboty

## 2.59.30 — Pomiary Elektryczne EM-P1B (generator DOCX)
- 5× DOCX: Protokół, Dane informacyjne, RCD, ADSC, Rezystancja — XML row cloning + payload SSOT
- UI: przyciski „Generuj …” per dokument w panelu Roboty
- Szablony: `public/em-measurements/*.template.docx` · smoke `test-electrical-measurements-p1.mjs` 32/32

## 2.59.29 — Hotfix sync mergeRecoverableCharges (P0-HOTFIX-001)
- Przywrócony import `mergeRecoverableCharges` / `normalizeRecoverableCharges` w `cloud-sync.ts` (regresja EM-P0 b563ea8)

## 2.59.28 — Pomiary Elektryczne EM-P0 final (korekty 4–6)
- Circuit: `displayName` + `sortOrder` — bez migracji pod EM-P1
- Preview SSOT: `buildAdscPreview` / `buildResistancePreview` / `buildRcdPreview`
- Panel: job summary Raporty/Obwody/RCD + zwijanie szczegółów

## 2.59.27 — Pomiary Elektryczne fundament (EM-P0)
- Domena `src/lib/electrical-measurements/*` + klucz `kw-electrical-measurements`
- Panel Roboty: wiele raportów pomiarowych per robota, preview read-only
- Stub `generate-em-docx.ts` (TODO EM-P1)
- Smoke: `test-electrical-measurements-p0.mjs`

## 2.59.26 — WM Druk historia generowania (WM-HISTORY-001)
- Klucz `kw-wm-print-history` (cap 1000) — metadane PDF/DOCX/ZIP po sukcesie generacji
- Zakładka Historia w WM Druk + panel Historia WM Druk w Robotach
- Smoke: `test-wm-print-history-001.mjs`

## 2.59.25 — WM Druk housekeeping kodu (P0.5B)
- `wm-print-pdf-fonts.ts` + `wm-print-pdf-static.ts`: wydzielenie aktywnych helperów prod
- `generate-pdf.ts`: re-exporty + `@deprecated` legacy LiveCycle — zero zmiany ZIP/ZI/DOCX
- Raport: [`audit/P0.5B-HOUSEKEEPING-REPORT.md`](audit/P0.5B-HOUSEKEEPING-REPORT.md)

## 2.59.24 — WM Druk legacy ZI slot cleanup (P0)
- KV: tombstone `26f02c78…` · jeden aktywny ZI Tauron 2026 (`2b22da48…`)
- `cloud-sync.ts`: merge `kw-wm-print-deleted-template-ids` z chmury przy pull
- `generate-zip.ts`: `dedupeWmPrintTemplatesByName` przed generacją ZIP

## 2.59.23 — Hotfix ZI pdf.js worker (P0)
- `zi-tauron2026-form-extract.ts`: `GlobalWorkerOptions.workerSrc` — fix ZIP „No GlobalWorkerOptions.workerSrc specified”

## 2.59.22 — Odbiory WM Druk ZI Tauron 2026 (GO)
- `generate-pdf-zi-tauron2026.ts` + `zi-tauron2026-form-extract.ts`: Tauron 2026 §4 mapping **99/111/112** + preservation (pdf.js graft na szyfrowanym WM ZI.pdf)
- `public/wm-print/zi-tauron-2026-template.pdf` — bundled SSOT (decrypted blank)
- Legacy LiveCycle CLOSED → `audit/archive/legacy-zi-livecycle-2021/`
- Smoke: `test-wm-print-zi-2026-smoke.mjs` · `test-wm-print-zi-2026-preservation-smoke.mjs`
- SSOT: `docs/ZI-2026-HANDOFF.md`

## 2.59.21 — Odbiory WM Druk ZI Tauron 2026 (dev, superseded)
- Pierwszy generator Tauron 2026 — zastąpiony przez 2.59.22 (mapping + preservation)

## Docs 2026-06-15 — ZI Investigation closeout (P0.4B)

- **`audit/ZI-FINAL-HANDOFF.md`** — SSOT śledztwa ZI (RCA CLOSED, NO-GO, audit inventory, rekomendacje)
- Zaktualizowano: `SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`, `PROJECT-HANDOFF-CURRENT.md`, `ARCHITECTURE.md` §12.1.8, `AGENTS.md`, `CURRENT-TASK.md`
- Inventory: `scripts/_p04b-inventory.json` · `scripts/_readonly-p04b-inventory.mjs`

## 2.59.20 — Odbiory WM Druk P0.3A ZI §3 adres obiektu (repo lokalnie — UX nadal FAIL)
- `generate-pdf.ts`: JOB_* → TextField2[10/9/8] @ y≈142; pdflib index 24/23/22; bez strip §3; filtr legacy §1 KV

## 2.59.19 — Odbiory WM Druk P0.2A ZI demo ULICA/BUD/LOK strip
- `generate-pdf.ts`: `stripZiDemoDesignerFields` — wyczyść/ukryj demo @ y≈142; oczyszczony szablon w storage

## 2.59.18 — Docs: SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK + ARCHITECTURE § 12.1.8

## 2.59.18 — Odbiory WM Druk P0 hotfix parseWmPrintTemplates runtime
- `cloud-sync.ts` merge templates: użyty zaimportowany `normalizeWmPrintTemplates`

## 2.59.17 — Odbiory WM Druk P0 cleanup template pollution EXECUTED
- Prod KV `kw-wm-print-templates`: 99→15, 84 tombstone, canonical ZI OK

## 2.59.16 — Odbiory WM Druk P0 cleanup template pollution (skrypt KV)
- `cleanup-wm-print-template-pollution.mjs` — backup, raport KEEP/DELETE, `--execute` po akceptacji

## 2.59.15 — Odbiory WM Druk P0 fix template pollution (seed guard)
- Seed tylko gdy local+chmura puste; `parseWmPrintTemplates` bez auto-seedu; dedupe name przed push KV

## 2.59.14 — Odbiory WM Druk P0.1E fix ZI Edge (cover + hidden widgets)

- ZI hybrid: biały cover + Noto na stronie + ukrycie widgetów 8/9/10 — Edge bez {{JOB_*}}
- Forensic P0.1E: /V OK ale tło Im0 nad widgetami w Edge

## 2.59.13 — Odbiory WM Druk P0.1D fix ZI /AP widgetów

- ZI hybrid: `updateAppearances(Noto)` tylko pola 8/9/10 — viewer widzi wartości zamiast {{JOB_*}}
- Usunięto overlay content-stream P0.1C (pod warstwą widgetów)

## 2.59.12 — Odbiory WM Druk P0.1C fix ZI widoczny tekst (XFA overlay)

- ZI hybrid/XFA: białe tło + Noto Sans w prostokątach pól 8/9/10 (viewer widzi adres)
- Brak cichego copy-as-is przy błędzie fill; ZI zawsze `pdf_form`
- `diagnoseZiPdfFieldFill` + test forensic P0.1C

## 2.59.11 — Odbiory WM Druk P0.1B fix ZI XFA
- Mapowanie TextField2[8/9/10] · indeks fallback · test `test-wm-print-p0-1b-zi-fix.mjs`

## 2.59.10 — Odbiory WM Druk P0.1A fix DOCX XML
- Bezpieczne czyszczenie `<w:t>` (regresja 2.59.9) · split-run + proofErr · test `test-wm-print-p0-1a-docx-fix.mjs`

## 2.59.9 — Odbiory WM Druk P0 fix generatorów
- PDF statyczne copy-as-is · ZI bez flatten · DOCX split-run · testy `test-wm-print-p0-*.mjs`

## 2.59.8 — Odbiory WM Druk P1.0.5A (deduplikacja kompletności)
- Fix duplikatów braków · % po unikalnych slotach · UI Brakuje (N) · test `test-wm-print-p1-0-5a.mjs`

## 2.59.7 — Odbiory WM Druk P1.0.5 (kompletność vs konfiguracja)
- Kompletność robota tylko ze slotów job_upload · Stan konfiguracji w Szablony · test `test-wm-print-p1-0-5.mjs`

## 2.59.6 — Odbiory WM Druk P1.0.4 (domyślne zaznaczenie)
- Wszystkie aktywne szablony zaznaczone domyślnie · Zaznacz/Odznacz wszystko · licznik · ZIP z wyboru · test `test-wm-print-p1-0-4.mjs`

## 2.59.5 — Odbiory WM Druk P1.1 correction (grupowanie po statusie robota)
- Usunięto niezależny status WM i kw-wm-print-job-statuses · sekcje z jobPhase · test `test-wm-print-p1-1-status-grouping.mjs`

## 2.59.4 — Odbiory WM Druk P1.1 (statusy procesu WM)
- Status WM per robota · sekcje · filtry · sync `kw-wm-print-job-statuses` · test `test-wm-print-p1-1-statuses.mjs`

## 2.59.3 — Odbiory WM Druk P1.0.3 (multi-upload)
- Dodaj pliki: multiple, drag & drop, append, liczniki · test `test-wm-print-p1-0-3.mjs`

## 2.59.2 — Odbiory WM Druk fix usuwania pliku z grupy
- Single-click delete: files[] autorytatywne, merge LWW, push bez union safe-merge

## 2.59.1 — Odbiory WM Druk P1.0.1 (multi-file groups)
- Grupy szablonów: wiele plików, liczniki, ZIP ze wszystkich plików grupy
- Migracja legacy single-file → files[1] · test `test-wm-print-p1-1.mjs`

## 2.59.0 — Odbiory WM Druk (P1)
- Nowy moduł menu: Odbiory WM Druk — szablony, dokumenty per robota, ZIP, kompletność
- Zmienne {{DATE}}/{{JOB_*}} · sync `kw-wm-print-*` · test `test-wm-print-p1.mjs`

## 2.58.1 — Notatki operacyjne HF (Backup Completeness)
- Export/import UI + local snapshot + EMAIL_KV_KEYS — 4 klucze KV (notes, read-state, audit-log, deleted-ids)
- Test: `scripts/test-operational-notes-hotfix-2.58.1.mjs` · **HF CLOSED**

## 2.58.0 — Notatki operacyjne P2A (Inspektor UI)
- Panel inspektora: ikona Notatki operacyjne + badge unread · overlay `OperationalNotesView variant=inspector`
- Create/comment/ACK/read status · sync 4× KV · ACL bez edit/archive/delete/share/audyt
- Test: `scripts/test-operational-notes-p2a.mjs` · **P2 CLOSED**

## 2.57.5 — Notatki operacyjne P2C (Audit UI)
- Sheet Audyt (Super Admin only) · filtry akcji/użytkownika/notatki · wyszukiwanie · paginacja 50 · ACK → wpis audit

## 2.57.4 — Notatki operacyjne P2B (Dashboard widget)
- Widget na Pulpicie: Łącznie · Nieprzeczytane · Od inspektora · ostatnia aktywność · klik → Notatki operacyjne

## 2.57.3 — Sidebar cleanup + Kadry
- Kadry (ex Pracownicy i kontakty) · usunięto KPI „Bieżący tydzień” z sidebara · w-60 · dark scrollbar

## 2.57.2 — Notatki operacyjne P1 (ACK + badge + banner)
- ACK jawne · auto-ACK autora · badge menu + banner · status Przeczytali/Nie przeczytali · fix contentRev przy edycji tytułu

## 2.57.1 — Menu: Pracownicy i kontakty
- Jedna pozycja menu + zakładki Pracownicy | Kontakty · routing `directory` / `contacts` bez zmian KV

## 2.57.0 — Notatki Operacyjne (P0)
- Moduł `OperationalNotesView` + panel `JobOperationalNotesPanel` · 4 klucze KV · ACL staff
- Komentarze, archiwum, logical delete, audit-log (cap 3000), cloud sync
- Test: `scripts/test-operational-notes-p0.mjs`

## 2.56.10 — fix false exclude przebudowa WM (P1 pipeline)
- `matchesTenderExcludeKeyword()` — granica słowa; mirror Edge
- Handoff: `docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` § 7

## 2.56.9 — P3.6 filtry klientów strategicznych (WM/ZZK/MOPS/TBS/Gminy/Uczelnie)
- SSOT: `tenders-strategic-client-filters.ts` · Handoff § 6

## 2.56.8 — P2-G.3C benchmark klasyfikacji prod
- Audyt prod KV: 303 poz. ATH (ZZK×2, Falzmanna) — seed UNKNOWN 16→0
- Mapowania: cokoliki, brodziki, kabiny, przyłącza gaz, plafoniery, roboty przygotowawcze
- `foldPolishText` normalizuje wielokrotne spacje (ATH prod)

## 2.56.7 — P3 stabilizacja wyceny i klasyfikacji
- Wycena UX: 1 alert, zwinięte Benchmark/Materiały/Pozycje/Szczegóły
- Słowniki klasyfikacji 3.1: bruk, dachy, izolacje, zagospodarowanie, rozbiórki
- Benchmark materiałów rynku: HOLD

## 2.56.6 — P3.4A historia materiałów
- `material-history.ts` + `material-impact.ts` — trend i wpływ vs własna historia (90 dni)
- Rozszerzenie `kw-wgdom-cost-catalog-history` o `materialPlnPerUnit`

## 2.56.5 — P3.3D benchmark impact
- `labor-benchmark-impact.ts` — wpływ PLN = odchylenie stawki × ilość (read-only)
- Wycena: hero Benchmark Impact + kolumny w podsumowaniu kategorii

## 2.56.4 — P3.3B benchmark robocizny PRO
- `LaborBenchmarkEdition` — metadata źródeł, data, pokrycie
- `kw-wgdom-cost-catalog-history` — snapshoty przy zmianie rbh; trend 90 dni
- UI triple view + panel Źródło benchmarku w Baza cen

## 2.56.3 — P3.3A benchmark robocizny MVP
- `labor-benchmark.ts` + statyczne zakresy — porównanie read-only, bez wpływu na wycenę

## 2.56.2 — P3.5B override cen per przetarg
- `kw-tender-price-overrides` — nadpisania materiał/robocizna per kategoria × tenderId
- UI Edytuj w podsumowaniu kategorii; źródło Override; hero KPI natychmiast

## 2.56.1 — P3.5 ceny per pozycja kosztorysu
- `tender-catalog-line-pricing.ts` + UI w Wycena → Pozycje kosztorysowe (read-only)
- UNKNOWN bez cen; podsumowanie kategorii; źródło Baza cen / Katalog WGDOM

## 2.56.0 — P3.1 Wycena UX + P3.2.0 Baza cen
- Hero KPI Wycena: koszt własny, marża %, cena oferty; alerty; szczegóły zwinięte
- Zakładka Przetargi → Baza cen (`TenderPriceBasePanel`, `kw-wgdom-cost-catalog`)

## 2.55.10 — P2-H.5C/5D PDF CAD + multi-ATH
- `noTextLayer` w `extractPdfText` → CASE 3 (CAD bez tekstu)
- `scoreCostTitleMatch` + tie-break w `discoverBestCostDocument`
- Sync `costDiscovery.source` z faktycznym źródłem dossier

## 2.55.9 — P2-H.5B PDF przedmiar (heurystyki)
- `pdf-przedmiar-heuristic.ts` — sygnały KNR/Lp./J.m./ilość, ekstrakcja wierszy, `likelyScan` → OCR
- `parseDocumentToKosztorys` — PDF przedmiar z tekstu pdf.js; UX case 1/2/3

## 2.55.8 — P2-H.5A PDF przedmiar (MVP)
- `pdf_przedmiar` / `zip_pdf_przedmiar` — `classifyCostDocumentType`, `discoverBestCostDocument`
- `parseDocumentToKosztorys` — FOUND_NO_VALUE snapshot (`PDF_PRZEDMIAR`, rows `[]`)
- UX: „Znaleziono przedmiar PDF” / „Znaleziono kosztorys w formacie PDF”

## 2.55.7 — P2-H.6 filtr folderów ZIP/7Z
- `isArchiveInnerListableFile()` — basename wymaga rozszerzenia 2–5 znaków
- `listZipFiles` / `list7zFiles` — odrzucenie folderów logicznych (II. PRZEDMIARY itd.)

## 2.55.6 — P2-H.4 UX copy archiwów 7Z
- scanSummary: `sevenZUnpackOk`, `sevenZInnerCount` z `parseTenderDossierDocuments`
- `sevenZKosztorysMissingLine()` — CASE A błąd odczytu vs CASE B brak ATH/XLS/XLSX
- UI: `buildKosztorysStatusLine`, `buildEstimateMissingReason`, cost-snapshot, data-ssot

## 2.55.5 — P2-H.3 obsługa archiwów 7Z
- 7z-wasm (LGPL) — list7zFiles / read7zEntry / pickBestFrom7zBytes; inner ATH/PDF/XLSX jak ZIP
- buildTenderDocCandidates + parseTenderDocumentCandidate + filterOuterArchiveWhenInnerExists
- UI: „Pokaż pliki w 7Z”, JobFilePreviewModal inner preview
- test: `test-tender-7z-archive.mjs` · fixture: `scripts/fixtures/test.7z`

## 2.55.4 — P2-G.2D klasyfikacja C.O. (WM/ZZK/MOPS)
- INSTALACJE_CO (15 kategorii) — grzejniki, głowice termostatyczne, zawory C.O., spuszczenie/odpowietrzenie
- Słownik + phrase rules · test: `test-tender-cost-intelligence.mjs` §24

## 2.55.3 — P2-G.2C klasyfikacja WM/ZZK (wod-kan + gaz + biały montaż)
- HYDRAULIKA rozszerzona (wod-kan) · INSTALACJE_GAZ + ROBOTY_OGOLNOBUDOWLANE (14 kategorii)
- Słownik + phrase rules: rurociągi PVC/PP, WC, gaz, przebicia, kuchnie gazowe → WYPOSAZENIE
- test: `test-tender-cost-intelligence.mjs` §23

## 2.55.2 — P0 hotfix double ZIP unpack (Marketplanet dossier)
- parseTenderDocumentCandidate — jedno rozpakowanie ZIP; fix JSZip „Can't find end of central directory” po poprawnym pobraniu
- selectDossierCandidates — skip outer ZIP gdy są inner kandydaci
- test: `smoke-test-ezamawiajacy-p2h2-double-unpack.mjs`

## 2.55.1 — P0 hotfix Marketplanet ZIP analysis wiring
- sourcePageUrl w loadDocBytes / analyze-local / JobFilePreviewModal (sesja replay)
- Edge guard: repository/download bez sourcePageUrl → 502; walidacja PK/%PDF
- test: `smoke-test-ezamawiajacy-p2h1-hotfix.mjs`

## 2.55.0 — P2-H.1 Marketplanet (ezamawiajacy.pl)
- Generic adapter `*.ezamawiajacy.pl` — sesja JSESSIONID + `repository/download`
- WM / ZZM: auto-discovery dokumentów z ogłoszenia BZP; replay sesji przy pobieraniu bytes
- Priorytet ezamawiajacy przed BIP · test: `smoke-test-ezamawiajacy-p2h1.mjs`

## 2.54.1 — P0 OwnerDecision Store Wiring Fix
- Strategia crash fix: `ownerDecisions.store` w KPI + Wymaga decyzji dziś
- Defensywny `byId ?? {}` w `tender-strategy-ux.ts`

## 2.54.0 — UX.2S Strategy Simplification
- Strategia = centrum decyzji (KPI · decyzje · terminy · monitoring · okazja lite)
- Usunięte z osi: Action Center, Attention, Change/Q&A osobno, KPI rynku
- Analityka collapsed · test: `test-tender-strategy-ux.mjs`

## 2.53.7 — P2-F.6 Offer Completeness Engine
- Workspace Oferta — „Kompletność oferty” (skrót + checklista krytyczne/dodatkowe)
- Reuse P2-F.1–F.5: `offer-completeness.ts` · test: `test-tender-workspace-ux.mjs` § P2-F.6

## 2.53.6 — UX.1D Formal Details Compression
- Szczegóły formalne domyślnie zwinięte — skrót max 5 linii + lazy render karty przetargu
- Dokumenty przed skrótem formalnym w workspace Dokumenty

## 2.53.5 — UX.1C Tender Documents Prioritization
- Czytelne nazwy plików (`normalizeTenderDocumentTitle`) — tylko UI
- TOP 5 „Najważniejsze dokumenty” + zwinięte pozostałe w workspace Dokumenty

## 2.53.4 — UX.1B Tender Workspace Tabs
- 5 workspace lazy render · handoff: `docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`

## 2.53.3 — ARCH-001 Circular Dependency Prevention
- ARCHITECTURE § 11.6 — P0 ARCH RULE, Lessons Learned v2.53.1, raport ryzyka
- scripts/audit-import-cycles.mjs — audyt cykli src/lib

## 2.53.2 — HOTFIX P0 biały ekran (cykl importów app-core)
- ReferenceError at startup — cloud-sync ↔ tender-cost-calibration cycle
- lazy import cloud-sync w kalibracji; session-cache bez importu cloud-sync

## 2.53.1 — UX.1A Tender Workspace Cleanup (MIN)
- Sticky Tender Summary + banner monitoringu → Strategia
- Kolejność: karta → załączniki → kwalifikacja → wycena → oferta → formalia → HTML
- Deduplikacja wyceny/kalibracji/ATH; przygotowanie pod UX.1B workspace tabs

## 2.53.0 — P2-G.3B Historical Cost Calibration (MIN)
- submittedBidPln + submittedAt na pipeline przetargu
- HistoricalCostSnapshot + kw-tender-calibration (sync chmura)
- tender-cost-calibration.ts — delty, summary, hints (N≥10, read-only)
- UI: Kalibracja historyczna (panel wyceny) + 🎯 Kalibracja WGDOM (profil firmy)

## 2.52.9 — P2-G.2C Work Category Refinement
- GLADZIE_TYNKI (m²/mb) + WYPOSAZENIE (szt/kpl) — 12 kategorii MVP
- split GK: zabudowa sucha vs gładzie/tynki/narożniki
- phrase rules + dict + user dict migrate GK→GLADZIE_TYNKI (selektywnie)

## 2.52.8 — P2-G.2D Phrase-Based Classification
- wgdom-phrase-rules.ts (~60 reguł contains/prefix, odmiany PL)
- pipeline: katalog → user dict → phrase rules → słownik branżowy
- inspektor: Top nieznane frazy (zamiast tokenów)

## 2.52.7 — P2-G.2B Cost Category Expansion CORE
- TRANSPORT_UTYLIZACJA + WENTYLACJA (10 kategorii MVP)
- gruz/odpady → transport (≠ ROZBIORKI); wentylacja; pomiary zerowania → ELEKTRYKA
- anti-double-count wasteDisposalWeeklyPln gdy gruz w przedmiarze
- migracja kw-wgdom-cost-catalog + user dict remap ROZBIORKI→TRANSPORT

## 2.52.6 — P2-G.2A Assisted Classification (user learning)
- wgdom-user-classification-dictionary.ts + kw-wgdom-classification-dictionary
- UNKNOWN Inspector: przypisz kategorię → natychmiastowa reklasyfikacja
- Profil firmy: WGDOM Classification Dictionary (edycja, sync chmura)
- Pokrycie klasyfikacji z kolorem (cel 97%+)

## 2.52.5 — P2-G.1F WGDOM Construction Dictionary
- wgdom-construction-dictionary.ts 150+ terminów branżowych
- classifyAthLineCategory + słownik, coverageDelta w inspektorze
- Pokrycie TBS/WM ~82%→~95% bez zmian kalkulatora

## 2.52.4 — P2-G.1E Classification Inspector
- buildClassificationSummary / buildUnknownRows / buildCatalogTuningHints
- TenderBidProposalPanel sekcja Klasyfikacja przedmiaru
- Jakość wyceny z pokrycia % (Wysoka/Dobra/Średnia/Ograniczona)

## 2.52.3 — P2-G.1D UX wyceny discoverability + explainability
- Kafelek Nasza wycena → scroll do TenderBidProposalPanel + hint
- Panel: Skąd/Jak powstała wycena, breakdown domyślnie otwarty
- Profil firmy: 4 sekcje + COST_FIELD_HINTS (bez zmian kalkulatora)

## 2.52.2 — P2-G.1C centrum wyceny UI + katalog chmura
- Nasza wycena multi-linia + źródło + jakość
- TenderBidProposalPanel badge/disclaimer/podstawa kalkulacji
- TenderCompanyProfilePanel WGDOM Cost Catalog + kw-wgdom-cost-catalog

## 2.52.1 — P2-G.1B integracja kalkulatora catalog mode
- catalogQuantities[] snapshot (250 poz.)
- computeTenderBidProposal pricingMode catalog / ath_priced
- Nasza wycena — koszt wykonania gdy FOUND_NO_VALUE

## 2.52.0 — P2-G.1A Tender Cost Intelligence silnik
- wgdom-cost-catalog.ts — 8 kategorii MVP, regiony wroclaw/dolnyslask
- wgdom-ath-classifier.ts — classifyAthLineCategory()
- wgdom-catalog-cost-engine.ts — computeFromCatalogRow(), aggregateCatalogDirectCost()
- test-tender-cost-intelligence.mjs

## 2.51.25 — P2-F.4 hotfix ATH Quick Access Logintrade
- downloadUrl w resolveAthPreviewItem + loadTenderBzpDocumentBytesResolved (ZIP → inner ATH)
- Pełny podgląd dossier + trace platform/downloadUrlResolved

## 2.51.24 — P2-F.5 Works Register Generator
- selectProjectsForTender + PDF/DOCX wykaz robót + rekomendacje w warunkach udziału

## 2.51.23 — P2-F.4 References + ATH Quick Access
- referenceFiles/protocolFiles upload + status referencji vs SWZ
- Karta ofertowa: Otwórz przedmiar / Pobierz PDF (reuse ATH viewer)

## 2.51.22 — P2-F.3 Company Experience Auto-Build
- company-experience-discovery z Robót/faktur/kosztorysów ATH + UI „Odkryte realizacje”
- referenceStatus unknown/available/missing + dedupe + zatwierdzenie → warunki udziału

## 2.51.21 — P2-F.2 Experience & References Qualification
- experienceProjects[] + parser SWZ doświadczenia/referencji + silnik MATCH/MISSING/UNKNOWN

## 2.51.20 — P2-F.1 Warunki udziału vs profil wykonawcy
- kw-company-profile + Profil wykonawcy w ustawieniach przetargów
- checkTenderParticipation: MATCH/MISSING/UNKNOWN, sekcja w karcie ofertowej

## 2.51.19 — P2-F.0 Formal Requirements Extraction
- Model FormalRequirement + detektory SWZ (personel/uprawnienia/członkostwo/doświadczenie)
- Filtr śmieci PDF, UI bullet „Wymagane:”, dopasowanie profilu, [FORMAL TRACE]

## 2.51.18 — P2-E.5 Cost Status UX + ATH Classification
- FOUND_WITH_VALUE / FOUND_NO_VALUE / NOT_FOUND — ATH bez cen ≠ „Kosztorys znaleziony”
- classifyCostDocument(), [COST STATUS TRACE], UI przedmiar vs wyceniony

## 2.51.17 — P2-E.4 ATH Value Recovery + TenderFit Refresh
- extractTotalValueFromAthPreview: netto summary + suma pozycji; estimatePln + tenderFit refresh po analizie

## 2.51.16 — Hotfix Analizuj SWZ
- Import `roleContributesMetadata` w `tender-document-resolver.ts` (ReferenceError prod 2.51.15)

## 2.51.15 — P2-E.3 Tender Data SSOT Cleanup
- `tender-data-ssot.ts`: resolvedTenderValuePln, resolvedCostStatus, resolvedAwardCriteria, [SSOT TRACE]
- Jednolity komunikat braku wartości we wszystkich panelach

> **Źródło prawdy:** tablica `CHANGELOG` w [`src/app/changelog-data.ts`](src/app/changelog-data.ts).  
> UI (zakładka **Zmiany**) czyta stamtąd `CHANGELOG[0].version`.  
> **Przy każdej nowej wersji:** dodaj wpis na górze w `changelog-data.ts` **oraz** zaktualizuj ten plik (ostatnie 5–10 wersji).

**Aktualna wersja UI:** **2.51.14** · **P2-E.2** Cost Snapshot Integration  
**★ SSOT handoff:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) · sesja: [`CURRENT-TASK.md`](../CURRENT-TASK.md)  
**★ Dashboard V2 handoff:** [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md)  
**Backup baseline:** tag `pre-next-feature-2.50.64` · [`docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md)

---

## 2.51.14 (2026-06-12) — P2-E.2 Cost Snapshot Integration

- **Fix:** ATH `summaryLines` → `totalValue`; merge wartości kosztorysu do `swzAnalysis`
- **Fix:** spójne UI — koniec „Kosztorys znaleziony” + „Brak pliku kosztorysowego”
- **New:** `[COST TRACE]` end-to-end (zip_found → ui_state)

## 2.51.13 (2026-06-12) — P2-E.1B ATH ZIP trace + SSOT danych

- **Fix:** Logintrade ZIP→inner ATH — faza kosztorysu przed metadanymi, trace E2E (`zip_opened`, `ath_parsed`, …), `downloadUrl` bez wymogu `platform`
- **Fix:** Wadium SSOT — `wadiumPln` kasowane gdy brak wiarygodnej wartości; UI Fit/checklist używa `formatSwzWadiumDisplay`
- **Fix:** Kryteria SSOT — `swzAnalysis.awardCriteria` w UI; fallback HTML przez `filterReliableAwardCriteria` (bez VAT/Cena 0%)
- **Improve:** ATH z `summaryLines` akceptowany jako kosztorys; trace `value_document_trace` per dokument

## 2.51.12 (2026-06-12) — P2-E.1 Universal Dossier Engine

- **New:** cost discovery ATH/NOR/XML/XLS/ZIP; confidence layer; metadata merge SWZ+STWIOR+OPZ
- **Fix:** downloadUrl propagation Logintrade ZIP → inner ATH
- **Test:** rozszerzony `scripts/test-tender-dossier-pipeline.mjs`

## 2.51.11 (2026-06-12) — P2-E.0 tender dossier pipeline

- **New:** `analyzeTenderWithDossier()` — SWZ + dossier w jednym kliknięciu
- **Fix:** merge `awardCriteria`, wartość z STWIOR, UX kosztorysu/7Z
- **Test:** `scripts/test-tender-dossier-pipeline.mjs`

## 2.51.10 (2026-06-12) — fix wadium extraction SWZ

- **Fix:** `parseWadiumFromSwzText()` — procent vs kwota PLN vs wartość zamówienia; UI/toast bez „Tak 6”
- **Test:** `scripts/test-wadium-extraction.mjs`

## 2.51.9 (2026-06-12) — fix Logintrade SWZ analysis

- `downloadUrl` dla platform zewn. w `analyzeTenderSwzEnhanced`
- Parser wadium — odróżnia % / tysiące od „Tak 6”
- Trace pipeline SWZ w konsoli

---

## 2.51.8 (2026-06-12) — P2-D.3 tenders attention panel

- Strategia → panel „Wymaga uwagi” (max 10) nad zmianami / Q&A
- `tenders-attention.ts` — agregacja bez nowych KPI

---

## 2.51.7 (2026-06-12) — P2-D.2 Q&A monitoring

- `tender-qa-monitor.ts` — NEW_QA, QA_UPDATED, QA_BATCH + AI summary z nazw plików
- Strategia → „Nowe pytania i odpowiedzi”
- Pulpit → „Nowe Q&A” + TenderQaAlert HIGH

---

## 2.51.6 (2026-06-12) — P2-D.1 tender change monitoring

- Snapshot + diff dokumentów i terminów (`tender-change-monitor.ts`)
- Strategia → sekcja „Zmiany w przetargach” + filtry
- Pulpit: Pilne zmiany + Action Center TenderChangeAlert
- Auto-rescan 3 przetargów po BZP merge

---

## 2.51.5 (2026-06-12) — P2-C.2 platform awareness dokumentów

- Komunikaty zamiast „Brak plików” — Logintrade, e-Zamówienia, platformazakupowa.pl, Open Nexus, unknown
- TenderDetailPanel: „Źródło dokumentów” + CTA postępowania PZ
- Telemetria `platformDetected` / `documentsFound` / `documentsMissingReason` (localStorage, bez PII)

---

## 2.51.4 (2026-06-12) — P2-A.3 off-platform document discovery

- **Logintrade adapter** — `getAttachmentUnlogged` z HTML postępowania (publiczne PDF bez konta)
- **Flow:** readmodels → mp-client → host detection → adapter → external discover fallback
- **Edge:** `discoverTenderDocuments`, `tenders-bzp-document-bytes?downloadUrl=`
- **Smoke:** `scripts/smoke-test-off-platform-document-discovery-p2a3.mjs`

---

## 2.51.3 (2026-06-12) — P2-A.2 mp-client document discovery

- **Improve:** gap-tolerant readmodels probe 1–50 (luki w numeracji `_9` → `_10` SWZ)
- **Improve:** `discoverMpClientDocuments` + auto external discover przy 0 plikach
- **Smoke:** `scripts/smoke-test-mp-client-document-discovery-p2a2.mjs`

---

## 2.51.1 (2026-06-12) — Przetargi 3.0 — ETAP 4 rename cleanup

- `src/app/tender-center/` → `src/app/tenders/strategy/`
- `tender-center-*` lib → `tenders-strategy-*`
- CommandCenterHero → TendersStrategyHero; ForecastCommandStrip → TendersStrategyForecastStrip
- ARCHITECTURE + handoff: Command Center removed in v2.51.0

---

## 2.51.0 (2026-06-12) — Przetargi 3.0 — CC runtime removal (ETAP 3)

- TendersProvider konsoliduje snapshot (bez CommandCenterProvider)
- Pulpit: TendersShortcutPanel zamiast CommandCenterExecutivePanel
- DELETE: TenderCenterProView, OwnerDashboard, CommandCenterContext, useCommandCenterExecutiveSnapshot

---

## 2.50.76 (2026-06-12) — Przetargi 3.0 — moduł z zakładkami

- TendersModule: Lista · Strategia · Mapa · Profil firmy · Ustawienia
- TendersProvider + TendersModule (ETAP 2 — tymczasowo nadal wrap CC; usunięte w 2.51.0)
- Strategia = ex-OwnerDashboard; Lista = TendersView listOnly

---

## 2.50.75 (2026-06-12) — Przetargi ETAP 1 — CC cleanup phase 1

- Usunięto Morning Briefing, AI Insights, Learning, Owner Profile, Explainability UI, onboarding, branding CC
- Decyzja GO/HOLD/NO-GO — bezpośredni zapis; alerty strategiczne → `tenders-strategy-alerts.ts`
- Zachowano: pipeline BZP, prognoza 90d, financial capacity, health, portfel decyzji, Tender→Job

---

## 2.50.74 (2026-06-11) — Dashboard V3 — operacje bez Hero

- Usunięto „Najważniejsze dziś” (Hero)
- Sekcje: Braki dokumentów + Pilne uwagi (kategorie)
- KPI: Braki dokumentów + Pilne uwagi zamiast Do ogarnięcia
- Recoverable w Pilnych uwagach (liczba pozycji, nie osobna karta)

---

## 2.50.73 (2026-06-11) — Hero — wyłącznie alerty operacyjne

- „Najważniejsze dziś” — tylko operacje (WM, roboty, dokumenty, płace, inspektor)
- Command Center — Action Center, prognoza, Owner Alerts bez zmian

---

## 2.50.72 (2026-06-11) — Hero — prognoza obciążenia tylko w Command Center

- „Najważniejsze dziś” — bez alertów prognozy obciążenia 30/60 dni (filtr Hero)
- Command Center — Action Center, Owner Alerts, prognoza firmy bez zmian

---

## 2.50.71 (2026-06-11) — Uwaga dziś — sort braków dokumentów

- „Uwaga dziś” → Braki dokumentów — najpierw roboty najbliższe kompletu (najmniej braków); stale ≥7 dni bez zmian na górze
- Hero DZIŚ — bez zmian (osobny ranker)

---

## 2.50.70 (2026-06-11) — Default Inspector Recipient (2.1.1)

- `EmailContact.isDefaultInspector` — jeden domyślny odbiorca inspektora w Kontaktach
- Modal „Kontakt z inspektorem” — auto-odbiorca, „Zmień odbiorcę”, hint wysyłki testowej
- Helpery: `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact`
- Smoke rozszerzony w `smoke-test-inspector-templates-2.1.mjs`

---

## 2.50.69 (2026-06-11) — Inspector Communication Templates (2.1.0)

- Roboty: „Kontakt z inspektorem” — szablony A–D, auto-sugestia, email przez Resend (`send-job-email` + `mode: inspector_template`)
- Kontakty: flaga `isInspector` — domyślny odbiorca
- Treść: sekcje „Po naszej stronie dostępne” / „Brakuje” (zlecenie, kosztorys)
- Historia: `email_sent` + nazwa szablonu

---

## 2.50.68 (2026-06-11) — Dashboard IA Cleanup (20.7E)

* **Improve:** „Najważniejsze dziś” — osobna sekcja Pulpicu (poza „Przetargi — skrót”)
* **Improve:** Neutralna karta + ton dnia jako badge; accordion compact bez zmian rankera
* **Improve:** „Uwaga dziś” — compact accordion, skrót „Braki dokumentów: N”
* **Improve:** Kolejność: KPI → Najważniejsze → Uwaga → Do odzyskania → Przetargi — skrót
* **Improve:** „Przetargi — skrót” — tylko CC liczniki + CTA
* **Improve:** KPI „Do ogarnięcia” — „priorytety i szczegóły poniżej”

## 2.50.67 (2026-06-11) — Hero Compression (20.7D.1)

* **Improve:** KPI first on dashboard — Hero no longer above KPI grid
* **Improve:** Hero DZIŚ compact accordion (collapsed by default, expand for TOP 5)
* **Improve:** Przetargi — skrót embeds Hero compact before Command Center CTA
* **Improve:** Non-tenders admins get standalone Hero compact fallback

## 2.50.66 (2026-06-10) — Dashboard V2 Complete (20.7C.2)

* **New:** Hero DZIŚ — TOP 5 priorytetów nad KPI (unified ranking)
* **New:** Hero dedupe engine vs Uwaga dziś
* **New:** E2E `dashboard-hero.spec.ts`
* **Improve:** Forecast / Action Center — prezentacja slotów zamiast %
* **Improve:** Konsolidacja priorytetów na Pulpicie
* **Improve:** Przetargi — skrót bez duplikatu listy akcji

## 2.50.65 (2026-06-10) — Mobile Jobs List Width Fix (20.5Z.5C)

* **Fix:** Admin → Roboty na urządzeniach mobilnych — lista robót pełna szerokość przy braku wybranej roboty
* **Fix:** Usunięto pustą kolumnę szczegółów rezerwującą ~65% viewportu na `<640px`
* **Fix:** Lepsza czytelność adresów robót na telefonach
* **Improve:** Desktop i tabletowy split 35/65 bez zmian

## Docs (2026-06-10) — Pre-Next-Feature Handoff + Backup

* **Docs:** `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`, `BACKUP-REPORT-2.50.64.md`, `AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`
* **Docs:** zaktualizowano `CURRENT-TASK.md`, `PROJECT-HANDOFF.md`, `AGENTS.md`, `ARCHITECTURE.md`, `BACKUP-SCHEDULE.md`
* **Scripts:** `run-pre-feature-backup-2.50.64.mjs`, `run-storage-full-backup-2.50.64.mjs`, `send-pre-feature-backup-email-2.50.64.mjs`

## 2.50.64 (2026-06-10) — Dashboard Handover Alert (20.5Z.5B)

* **Improve:** Dashboard now surfaces Jobs 2.0 handover phase through a dedicated „Roboty do odbioru” operational alert in Uwaga dziś

## 2.50.63 (2026-06-10) — Admin Navigation Jobs Badge Alignment (20.5Z.5A)

* **Improve:** Roboty menu badge now counts Jobs 2.0 operational phases (W toku + Do odbioru) instead of legacy pending-photo indicator

## 2.50.58 (2026-06-09) — Files Hub Consolidation (20.5A.12)

* **New:** Files Hub — kontrakt + dokumentacja ekipy + załączniki + checklista w Robotach → Pliki
* **Improve:** Media → Pliki read-only z pełnym hubem; liczniki ujednolicone (bez photos/checklisty w count)
* **Improve:** Stub PDF dokumentacji (`worker-report-pdf.ts`) pod sprint 20.5A.12C

---

## 2.50.57 (2026-06-09) — Worker Mobile UX (20.5B.6A.4)

* **New:** Pasek postępu dokumentacji w trybie pracownika (Zdjęcia → Dokumentacja → Wymiary → Obrys)
* **Improve:** Baner edukacyjny, CTA następnego kroku, klikalne kroki → scrollIntoView
* **Improve:** Formularz worker mobile — większe touch targets (admin bez zmian)

---

## 2.50.56 (2026-06-09) — Version Awareness & Update Banner (20.5B.7)

* **New:** Wykrywanie nowej wersji — `/version.json` vs `APP_VERSION`, polling + focus
* **New:** Globalny banner „Odśwież teraz” — bez auto-reload
* **Improve:** HelpView FAQ; build generuje `version.json`

---

## 2.50.55 (2026-06-09) — Dokumentacja Robót Naming Refresh (20.5B.6A.1)

* **Improve:** Zakładka „Dokumentacja” zamiast „Raporty” — admin, pracownik, inspektor
* **Improve:** Hint obrys/wymiary vs plan PDF; help przy „Rysunek/Plan”
* **Improve:** Pulpit — „Nowa dokumentacja od ekipy”; HelpView FAQ

---

## 2.50.54 (2026-06-09) — Roboty UX Pack (20.5B.5)

* **Improve:** Roboty — domyślny filtr „W trakcie”; kolejność faz na liście
* **Improve:** Typ lokalu — etykieta Socjalny (key `komunalny` bez migracji)
* **New:** Pole opcjonalne „Piec gazowy” (Zostaje / Wymiana / Brak)
* **Improve:** FAQ — plan techniczny PDF = „Rysunek/Plan” (docs 20.5B.5D)

---

## 2.50.53 (2026-06-09) — Dashboard WM Cleanup (20.5B.4)

* **Improve:** Pulpit — usunięto osadzone Portfolio WM; KPI „Aktywne WM” + alerty WM pozostają
* **Improve:** Skróty WM kierują do Roboty zamiast scroll do portfolio na Pulpicie

---

## 2.50.52 (2026-06-09) — Generic File Attachments (20.5A.10) ★ RELEASED

* **New:** `jobAttachments[]` — załączniki ogólne (osobno od `jobFiles` kontraktowych)
* **New:** Roboty → Pliki — sekcja Załączniki ogólne (upload/delete admin, podgląd, ZIP)
* **New:** Email — grupy Dokumenty kontraktowe / Załączniki ogólne; activity (+ N załączników)
* **Improve:** sync tombstone merge (wzorzec 20.5B.3)
* **Handoff:** [`docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) · commit **`e6758e5`**

## 2.50.51 (2026-06-09) — File Consistency Hardening (20.5B.3)

* **Fix:** `deletedJobFileTombstones` — merge sync nie przywraca usuniętego pliku
* **Fix:** feed inspektora / Pulpit — ukrywanie orphan upload (R1–R4)
* **Improve:** replace pliku — tombstone + best-effort delete starego storage po uploadzie

---

## 2.50.50 (2026-06-09) — Hotfix usuwanie plików Roboty (P0)

* **Fix:** `JobsView` — import `resolveJobFileStoragePath`; usuwanie w katalogu i panelu email działa po confirm
* **Fix:** try/catch + toast.error przy błędzie storage / wyjątku

---

## 2.50.49 (2026-06-09) — Hotfix plan_techniczny icon (P0)

* **Fix:** `JobAllFilesView` — `CATEGORY_ICONS.plan_techniczny` (Ruler) + fallback `FileText` — crash React #130 po upload planu PDF w Roboty

---

## 2.50.48 (2026-06-09) — Inspektor admin simplification (20.5B.2)

* **Inspektor (admin)** — feed monitoringu; CTA „Otwórz w Robotach” z deep linkiem sekcji
* **Filtry** — Propozycje billing · Uwagi billing · KPI propozycji
* **Roboty → Pliki** — email plików inspektora (`send-job-files-email`)
* **Portfolio WM** — na Pulpicie; usunięto `InspectorAdminJobDetail`

---

## 2.50.47 (2026-06-09) — Plan techniczny PDF (20.5A.9)

* **Nowy typ pliku** — `jobFiles[].kind: "plan_techniczny"` (PDF); upload admin w Robotach → Pliki roboty
* **Checklist** — `documents.rysunek` auto ✅ ze szkicu/wymiarów raportu **lub** planu technicznego PDF
* **Separacja** — szkic terenowy (JPG w raporcie) ≠ plan biurowy (PDF w Plikach); inspektor: podgląd/pobranie bez uploadu
* **Smoke** — `smoke-test-technical-drawing-20.5a9.mjs` (21/21)

---

## 2.50.46 (2026-06-09) — Media Library UX (20.5A.8)

* **Separacja** — Pliki = tylko zlecenie/kosztorys; Zdjęcia = ekipa + inspektor + rysunki raportów
* **Core** — `media-separation.ts` → `collectJobImages()` / `collectJobDocuments()`
* **ZIP** — `Dokumenty ZIP` (jobFiles) · `Zdjęcia ZIP` (wszystkie obrazy)
* **UI** — liczniki tabów MediaView; smoke 18/18

---

## 2.50.45 (2026-06-09) — Role Visibility Hardening (20.5A.7)

* **Polityka UI** — admin/moderator: tylko `(Inspektor)`; inspektor: bez ról admin; super admin: pełny widok
* **Core** — `role-visibility.ts` → `visibleRoleLabelForViewer()`; filtr w `resolveAuthorContact()` + `AuthorAttribution`
* **Bypass** — SMS modal, Do rozliczenia (inline), topbar tooltip
* Smoke: `smoke-test-role-visibility-20.5a7.mjs` (34) + regresja 20.5A.6 (59)

---

## 2.50.44 (2026-06-09) — Billing Proposal (20.5A.6)

* **Inspektor** — Zgłoś pozycję (propozycja + dowody) gdy brak pozycji na robocie; tylko `kw-jobs`
* **Admin** — Zatwierdź (modal → RecoverableCharge) / Odrzuć z powodem; KPI rośnie dopiero po approve
* **Model** — `JobNote.context: billing_proposal`, `proposalStatus`, `createChargeDraftFromProposal()`
* Smoke: `smoke-test-inspector-billing-proposal-20.5a6.mjs` (48) + regresja 20.5A.2–5

---

## 2.50.43 (2026-06-09) — Polonizacja COMMAND CENTER (20.3B+ FULL)

* **CC** — Indeks kondycji, Wnioski AI, Wyjaśnienia scoringu, Lejek ofert, Historia decyzji
* **Decyzje UI** — Startuj / Analizuj / Odpuszczaj (enum bez zmian)
* **Marka** — COMMAND CENTER AI zachowana
* Smoke: `smoke-test-ui-language-20.3b-full.mjs`, `smoke-prod-bundle-2.50.43.mjs`

---

## 2.50.42 (2026-06-09) — Billing Evidence Pack (20.5A.5)

* **Inspektor** — uwaga billing + zdjęcia (do 3) + PDF (1) jako dowód
* **Admin** — podgląd załączników w wątku pozycji (JobFilePreviewModal)
* **Model** — `JobNoteAttachment` w `JobNote.attachments`; upload przez `storage-upload`
* Smoke: `smoke-test-inspector-billing-evidence-20.5a5.mjs`

---

## 2.50.41 (2026-06-09) — Roboty Active Today badge

* **Karta listy** — „Aktywni dziś: N” z `workEntries` na dziś zamiast „Ekipa: N”
* **KPI MID-B** — bez zmian (`executionAssigneeDirectoryIds`)
* Smoke: `smoke-test-jobs-active-today-2.50.41.mjs`

---

## 2.50.40 (2026-06-08) — Roboty UX Pack (desktop workspace)

* **Split 35/65** — lista `flex-[7]`, szczegóły `flex-[13]` na desktopie
* **Detail full width** — `md:max-w-none`; mobile `max-w-3xl` bez zmian
* **Toolbar md+** — KPI compact, grid Lista/Szukaj/Filtry; niższy pasek (~170–180px)
* **Detail compact** — header, nav, phase picker, filter bar (md+)
* Smoke: `smoke-test-jobs-ux-pack-2.50.40.mjs`

---

## 2.50.30 (2026-06-08) — Roboty status + toolbar desktop

* **Fix status** — `defaultJob()` / `awaiting_order` → „W trakcie”, nie „Do odbioru — braki”
* **Toolbar md+** — kompakt KPI, przyciski 32–36px; mobile 44px bez zmian
* **Detail width** — `md:max-w-4xl` w panelu szczegółów
* Smoke: `smoke-test-jobs-status-2.50.30.mjs`, `smoke-test-jobs-toolbar-2.50.30.mjs`

---

## 2.50.20 (2026-06-08) — Desktop Layout Fix

* **Admin laptop/desktop** — `overflow: hidden` na html/body; scroll tylko w widokach
* **min-w-0** — AdminViewRouter, Pulpit, Media (flex bez poziomego wypychania)
* Smoke: `smoke-test-desktop-layout-2.50.20.mjs` + `e2e/desktop-layout.spec.ts`

---

## 2.50.10 (2026-06-08) — Mobile Fix Pack

* **Toolbar mobile** — kompaktowe odstępy KPI (`max-md:`), więcej miejsca na listę robót
* **Touch 44px** — Lista/Kolejki, fazy, Filtry dodatkowe
* **Kolejki** — bez sticky nagłówków sekcji (czytelniejszy scroll)
* Smoke: `smoke-test-mobile-fix-pack-2.50.1.mjs`

---

## 2.50.00 (2026-06-08) — Roboty 2.0 MID-B

* **Lista / Kolejki** — widok operacyjny: WM po terminie, BZP wymaga startu, Bez ekipy, Do odbioru — braki, Gotowe do zdania, Dokumenty >7 dni
* **Filtr lidera** — Filtry ▼ → Lider realizacji (`executionLeadDirectoryId`)
* **Badge odbiorów** — „Do odbioru — braki” vs „Gotowe do zdania” (prezentacja; bez zmian sync/KV)
* Smoke: `smoke-test-jobs-2.0-midb.mjs`

---

## 2.49.90 (2026-06-08) — Polonizacja UI (Sprint 20.3B MIN)

* **Pulpit / CC executive** — Centrum działań, Indeks kondycji, priorytety PL, Okazja/Strategiczny
* **Przetargi** — przyciski Startuj / Analizuj / Odpuszczaj (`DECISION_LABEL_PL`)
* **Inspektor** — Portfolio WM; billing — Administrator zamiast Admin
* Smoke: `smoke-test-ui-language-20.3b.mjs`

---

## 2.49.80 (2026-06-08) — Uwagi inspektora do pozycji billing (Sprint 20.5A.4)

* **Inspektor** — „Zgłoś uwagę” przy pozycji Do rozliczenia (read-only kwot, zapis tylko kw-jobs)
* **Admin** — wątek inspektor ↔ admin na robocie i w module; Pulpit — prefiks „Do rozliczenia”
* **WM** — notatki WM bez mieszania z uwagami billing
* Smoke: `smoke-test-inspector-billing-notes-20.5a4.mjs`

---

**Poprzednia:** **2.49.70** · Sprint 20.5A.3A Inspector Billing Review

**Performance 2.x (seria CLOSED):** tagi `v2.45.37-perf-2.3c`, `v2.45.38-perf-2.4a` · baza Performance `35614f0`

---

## 2.49.70 (2026-06-08) — Inspektor × Do rozliczenia read-only (Sprint 20.5A.3A)

* **Inspektor** — sekcja WM: kwoty, KPI, historia settlementów (read-only)
* **Badge 💰** na liście robót inspektora przy nierozliczonych pozycjach
* **Sync** — `kw-recoverable-charges` read-only w `InspectorPanel` (bez push billing)
* Smoke: `smoke-test-inspector-billing-20.5a3a.mjs`

---

## 2.49.60 (2026-06-08) — Closed week przy zablokowanym rolloverze (Sprint 20.1D)

* **`isPayrollWeekClosedForUi`** — tydzień w tyle kalendarza + blockers → nadal operacyjny
* PayrollView / defer ⏭ / snapshot refresh / leave overlay — nowa semantyka
* Smoke: `smoke-test-payroll-week-closed-20.1d.mjs` (T1–T6)

## 2.49.50 (2026-06-08) — Roboty admin photo upload fix

* **JobsView** — import `prepareWatermarkedPhoto` (regresja od v2.45.17 lazy-load)
* catch + toast przy błędzie uploadu
* Smoke: `smoke-test-jobs-admin-photo-upload.mjs`

## 2.49.40 (2026-06-07) — Pulpit alerty listy płac (Sprint 20.1C.2)

* **DashboardView** — alerty payroll używają `listPayrollRolloverBlockers` (kasa sobotnia), nie `!settled`
* PRZENIESIONO / biweekly accrual / urlop — brak fałszywych alarmów na pulpicie
* Smoke: `smoke-test-payroll-dashboard-20.1c2.mjs` (T1–T5)

## 2.49.30 (2026-06-07) — Sync rollover listy płac (Sprint 20.1C.1)

* **applyBootstrapPayrollMerge** — brak richness override gdy cloud week ≠ target week (fix F5 leak)
* **pushPayrollWeekAfterRollover** — atomowy push KV po rolloverze (`skipPayrollGuard`)
* **persistPayrollRoster** — `skipPayrollGuard` przy Odśwież skład / replace roster
* **Smoke** — `smoke-test-payroll-rollover-sync-20.1c1.mjs`, integracja STALE_KV

---

## 2.49.20 (2026-06-07) — Rollover listy płac — kasa sobotnia (Sprint 20.1C)

* **payroll-rollover.ts** — `calcEmployeeSaturdayCash`, `blocksPayrollRollover`, `hasPayrollRolloverBlockers`
* **Auto-rollover** — blokada tylko gdy `!settled && saturdayCash > 0` (nie każde Oczekuje)
* **Zwolnienia** — PRZENIESIONO, biweekly narastający, urlop, net ≤ 0
* **Bez zmian** — MODEL A carry, archiwum, `computePayrollCashSplit`, sync KV

---

## 2.49.10 (2026-06-07) — Tworzenie pozycji z roboty (Sprint 20.5A.2)

* **Modal** — ➕ Dodaj do rozliczenia na karcie roboty; zapis bez nawigacji do modułu
* **Preset** — `buildRecoverableChargeDraftFromJob()` — job, klient, adres (UI), inspektor (lider ekipy)
* **Deep link** — `pendingRecoverableChargeCreatePreset` → moduł z formularzem create (consumed once)
* **Bez zmian** — KV, sync, merge, dashboard KPI, settlement workflow

---

## 2.49.00 (2026-06-06) — Roboty ↔ Do rozliczenia (Sprint 20.5A.1)

* **Helpery** — `getRecoverableChargesForJob()`, `getRecoverableChargesRecoveredOnJob()`, `getRecoverableChargeJobStats()`
* **Lista robót** — badge 💰 (liczba nierozliczonych) + tooltip PLN do odzyskania
* **Przegląd roboty** — karta Do rozliczenia: KPI, pozycje źródłowe (max 5), rozliczenia na tej robocie (max 5)
* **Deep link** — klik pozycji → moduł Do rozliczenia z zaznaczeniem (`pendingRecoverableChargeId`)
* **Bez zmian** — model, KV, sync, merge, dashboard KPI, tworzenie pozycji z roboty

---

## 2.48.30 (2026-06-06) — Top listy + KPI czasowe (Sprint 20.4C.2C)

* **Helpery** — `computeRecoverableChargesTimeStats()` + `computeRecoverableChargesTopLists()` (TOP 5)
* **Moduł** — sekcja Statystyki odzyskiwania: miesiąc/rok/średni czas/zamknięte + 3 rankingi
* **Pulpit** — link „Zobacz analizę odzyskiwania” (bez nowych kafelków)
* **Legacy** — `legacy-migration-*` wykluczone z KPI czasu i rankingu odzyskanych
* **Bez zmian** — model, merge, Inspector, Payroll

---

## 2.48.20 (2026-06-06) — Alerty odzyskiwania (Sprint 20.4C.2B)

* **Helper** — `computeRecoverableChargesAlerts()` — typy kwota / wiek / częściowe / aktywność; `attentionCount` +1 (nie +N)
* **Pulpit** — sekcja Wymaga uwagi (max 3); próg alarmu wieku **> 90 dni** (zamiast 30)
* **Moduł** — pełna lista alertów z filtrami; klik → szczegóły pozycji
* **attentionCount** — Pulpit +1 gdy jakikolwiek alert billing
* **Bez zmian** — model, merge, top listy (20.4C.2C)

---

## 2.48.10 (2026-06-06) — Aging odzyskiwania (Sprint 20.4C.2A)

* **Helper** — `computeRecoverableChargesReportingStats()` — jedno przejście, kubełki 0–30 / 31–60 / 61–90 / 90+ dni (open + partial)
* **Pulpit** — skrót aging na karcie Do odzyskania (sumy PLN)
* **Moduł** — sekcja Analiza odzyskiwania (liczba pozycji + PLN per kubełek)
* **Smoke** — suma aging = Do odzyskania; settled wykluczone
* **Bez zmian** — model, merge, cloud-sync, Payroll, Leaves, Inspector, alerty, top listy (20.4C.2B/2C)

---

## 2.48.00 (2026-06-06) — Dashboard Do odzyskania (Sprint 20.4C.1)

* **Pulpit** — karta Do odzyskania: 4 KPI, najstarsza pozycja, klik → moduł
* **Stany** — pusty (brak pozycji) i alarmowy (≥ 2 000 PLN lub > 30 dni)
* **Bez** — aging, top list, eksport, Command Center, zmian modelu

---

## 2.47.10 (2026-06-06) — Settlement Workflow UI (Sprint 20.4B)

* **Workflow** — przycisk Rozlicz, modal (kwota, robota docelowa, typ, notatka, onBehalfOf)
* **Status** — wyłącznie wyliczany z ledgeru; usunięty ręczny dropdown
* **KPI** — Do rozliczenia / Rozliczone częściowo / Odzyskano (PLN)
* **Historia** — sekcja rozliczeń w panelu szczegółów; badge open+partial
* **Bez zmian** — merge, cloud-sync, Payroll, Leaves, Inspector

---

## 2.47.00 (2026-06-06) — Settlement Foundation (Sprint 20.4A)

* **Model** — `RecoverableChargeSettlement`, `settlements[]`, `amountSettled`, `amountRemaining` w `recoverable-charges.ts`
* **Domain** — `sumSettlements`, `deriveChargeAmounts`, `applySettlement`, `validateSettlementDraft`
* **Merge** — union settlements po `id`; po merge obowiązkowy `deriveChargeAmounts`
* **Legacy** — migracja przy normalize: settled → wpis syntetyczny; partial bez ledgeru → open
* **Bez UI** — przycisk Rozlicz, historia, KPI i integracje Jobs/Inspektor w Sprint 20.4B

---

## 2.46.01 (2026-06-06) — UI Language Policy MIN (Sprint 20.3B)

* **Do rozliczenia** — statusy PL, mini-KPI „Do rozliczenia”, usunięty tekst developerski z panelu szczegółów
* **Inspektor** — Centrum działań, filtr Od administratora
* **Menu** — Zdjęcia i pliki (zamiast Media)
* **Lista płac** — placeholder `odbiorca@firma.pl`

---

## 2.46.00 (2026-06-06) — Do rozliczenia foundation (Sprint 20.3A)

* **Nowość** — moduł **Do rozliczenia** (`RecoverableCharge`, KV `kw-recoverable-charges`)
* **CRUD** — pozycja z roboty lub standalone; status 🔴🟡🟢; panel szczegółów (read-only)
* **Menu** — **Media** = Zdjęcia + Pliki robot
* **Sync** — `kw-recoverable-charges-deleted-ids`, deferred bootstrap, backup JSON

---

## 2.45.41 (2026-06-06) — Carry totals sidebar (Sprint 20.1B.1)

* **Fix** — Sidebar / topbar / Pulpit: suma sobotnia wyklucza ⏭ PRZENIESIONO (spójnie z tabelą i PDF)
* **Helper** — `computePayrollCashSplitWithCarry()` w `payroll-carry-forward.ts`

---

## 2.45.40 (2026-06-06) — Panel inspektora UX (Sprint 20.2A)

* **Pulpit** — KPI, „Dzisiaj”, Action Center (max 3)
* **Postęp kontroli** 0–100% — `computeInspectionProgress()` bez nowych KV
* **Karty robót** — brakujące do odbioru, ostatnia aktywność, 🔴🟠🟢
* **Checklist** w grupach + licznik dokumentów
* **FAB 📷** — szybkie zdjęcie z aparatu
* **Fix 20.2A.1** — postęp % bez double-count zlecenie/kosztorys (documents 50% + etap 25%)

---

## 2.45.39 (2026-06-06) — Carry workflow fix (Sprint 20.1B) — **Released** · `74e65d9`

* **saved ≠ closed** — „Zapisz tydzień” to backup; defer ⏭ możliwy do rolloveru payroll
* **Live payroll** na aktywnym tygodniu (zapisanym) — lista, PDF/DOCX z bieżącego stanu
* **Snapshot freeze** tylko dla tygodnia **historycznego** (`isPayrollWeekClosed`)
* **`refreshSavedActiveWeekSnapshot`** — archiwum odświeżane po defer, settled, edycji
* **`canDeferPayroll`** — blokada `closed_week` (nie `archived_week`)
* **`isPayrollWeekClosed()`** — `weekFrom/weekTo ≠ getPayrollWeekRange()`
* Regresja 20.0A urlopy + 20.1A carry — PASS

---

## 2.45.38 (2026-06-06) — Odroczenie wypłaty (Sprint 20.1A) — **Released** · `f24fafe`

* **Deferred Payroll Payment** — ⏭ „Przenieś na następny tydzień” (tygodniówka, jednorazowo)
* **Frozen Amount Model (MODEL A)** — kwota zamrożona w momencie kliknięcia; bez przeliczenia po zmianie godzin/stawki
* **Archive Freeze** — `carryForwardOut` / `carryForwardIn` w `EmployeeSnapshot`; historyczne PDF/DOCX niezmienne
* **PDF/DOCX support** — PRZENIESIONO (W1); suma z adnotacją przen. (W2)
* Pole `payrollCarryForward` na `WeekEmployee` (`kw-week-employees`) — bez nowego klucza KV / Edge deploy
* Biweekly — **zablokowane** w V1; urlop blokuje przeniesienie
* Sync: `pickPayrollCarryForward` w `mergeWeekEmployeeRecord`

---

## 2.45.37 (2026-06-06) — Nieobecności pracowników (Sprint 20.0A) — **Released** · `778f616`

* KV `kw-employee-leaves` + tombstone `kw-employee-leaves-deleted-ids` — urlop / chorobowe / bezpłatny (tygodnie Pn–So)
* Lista płac + PDF/DOCX — status zamiast kwoty; overlay live; archiwum zamrożone (`leaveStatus` w snapshot)
* Biweekly — cash split zerowany w tygodniu urlopu
* Walidacja overlap + blokada tygodni w archiwum (frontend + Edge batch-set)

---

## Performance 2.4A (2026-06-06) — **CLOSED** · tag `v2.45.38-perf-2.4a`

* (`35614f0`) Usunięto chunk `shared-inspector` z `manualChunks` + martwe importy `App.tsx`
* Startup JS: **1119 KB** (4 requesty); brak `shared-inspector` i `pdfjs` w preload
* **Bez bumpu UI** — wpis tylko w tym pliku (dla agentów AI)

---

## Performance 2.3C (2026-06-06) — **CLOSED** · tag `v2.45.37-perf-2.3c`

* (`c922b44`) Lazy load parsera dokumentów przetargowych (`tenders-bzp-doc-parse`)
* Parser stack (pdfjs, xlsx, doc-parse) poza cold startem; startup JS **1244 KB**
* Synthetic runtime verification PASS
* **Bez bumpu UI** — wpis tylko w tym pliku (dla agentów AI)

---

## 2.45.36 (2026-06-05) — Performance 2.2C **CLOSED**

* Usunięto reguły `manualChunks` dla `panel-jobs|payroll|tenders|inspector*` — prawdziwe lazy ładowanie zakładek admina
* Startup: brak fetch 5 paneli przed kliknięciem (lazy `JobsView`, `PayrollView`, `TenderCenterProView`, `InspectorPanel`, `InspectorAdminView`)
* Tag release: `v2.45.36-perf-2.2c`

---

## 2.45.35 (2026-06-05) — Performance 2.1A + 2.1B + 2.1C **CLOSED**

* **2.1A** (`deb5d37`) — dedup snapshot CC: `scoreAllActionableTenderOpportunities`, współdzielone `marketKpi`, reuse forecast `none`
* **2.1B** (`b27bc18`) — `CommandCenterProvider` tylko dla Pulpitu i Przetargów (`AdminViewRouter`)
* **2.1C** — `tenders-pipeline-session-cache.ts`: module-scope cache TTL 60 s; cache hit w `useTendersPipeline`; patch przy zapisie pipeline/keywords
* **2.1C+** — hotfix `wgdom-deferred-bootstrap`: hydrate z localStorage zamiast invalidate (Pulpit → Roboty → Pulpit <60 s)
* Tag release: `v2.45.35-perf-2.1`
* Smoke prod: Pulpit ↔ Przetargi i Pulpit → Roboty → Pulpit — 0 dodatkowego pipeline/autoAward przy cache hit

---

## 2.45.34 (2026-06-04) — Performance 1.1C + 1.2A + 1.3A+

- Usunięcie legacy `tenderDashStats` (`App.tsx`, `DashboardView`, `AdminViewRouter`)
- `useTendersPipeline` — award/BZP w tle; szybszy placeholder COMMAND CENTER AI
- `CloudLoader` + `cloud-sync` — CORE/DEFERRED bootstrap; event `wgdom-deferred-bootstrap`
- `CommandCenterContext` — odświeżenie profilu firmy po deferred bootstrap
- Tag release: `v2.45.34-perf-1.3a`

---

## 2.45.33 (2026-06-04) — Roboty 2.1A (UX listy)

- `JobListPanelHeader.tsx` — KPI poziomy, Filtry ▼, kolejność CTA → KPI → szukaj → fazy
- `JobListCard.tsx` — uproszczona karta (klient • termin, stała kolejność badge)
- Logika 2.0 (`job-list-ops.ts`) — bez zmian

---

## 2.45.32 (2026-06-04) — Roboty 2.0 MIN

- `src/lib/job-list-ops.ts` — KPI, chipy, sort pilności
- `JobsView` — pasek KPI + chipy; `JobListCard` — BZP, Ekipa: 0/N, termin
- Test: `scripts/test-job-list-ops-2.0-min.mjs`

---

## Dokumentacja (2026-06-04) — handoff dla agentów AI (bez bump UI)

- [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md) — indeks sesji, commity, zakazy
- [`docs/jobs-2.0-product-audit.md`](docs/jobs-2.0-product-audit.md) — audyt Roboty 2.0
- [`docs/dead-code-audit-2026-06.md`](docs/dead-code-audit-2026-06.md) — martwy kod
- [`docs/permissions-roles-audit-2026-06.md`](docs/permissions-roles-audit-2026-06.md) — uprawnienia Przetargów PASS
- Zaktualizowano: `CURRENT-TASK.md`, `AGENTS.md`, `ARCHITECTURE.md`, `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 2.45.31 (2026-06-03) — FAZA 9.0.1: status + termin kontraktu (pracownik)

- `resolveWorkerContractStatusLabel`, `resolveWorkerContractDateLabel` — karty „Twoje kontrakty”

## 2.45.30 (2026-06-03) — FAZA 9.0: Twoje kontrakty (pracownik)

- `isWorkerOnExecutionTeam` + sekcje w `WorkerPhotoView` (plan ekipy → widoczność)
- Bez zmian grafiku, payroll, TC, Executive

## 2.45.29 (2026-06-03) — ETAP 8.5 FULL: planowa ekipa (B lite)

- Pola `executionLeadDirectoryId`, `executionAssigneeDirectoryIds` w `Job` (`kw-jobs`)
- Baner kontraktu: lider + multi-select, `assignExecutionTeam`, badge na liście
- Merge w `mergeJobsById`; bez payroll / grafiku / Edge

## 2.45.28 (2026-06-03) — ETAP 8.5 MIN: Start Execution

- **new** Baner przetargu w Robotach — „Rozpocznij realizację” (`startJobExecution` → `jobPhase` + `handoverStage` + `activityLog`)
- Bez nowych kluczy KV / pipeline

---

## 2.45.27 (2026-06-03) — ETAP 8.4: daty SWZ → Job

- **improve** `resolveJobDraftDatesFromTender` — fallback: `implementationDeadlineRaw`, potem `contractPeriod` (jednoznaczne wzorce)
- **fix** Bez nadpisywania dat z umowy (8.1); `plannedHandoverDate` nadal z `endDate` (8.2)
- **fix (Edge, bez bump UI)** PAYROLL SYNC FIX A — `settled` / `settledUpdatedAt` osobno od `dataWinner` w `mergeWeekEmployeeRecordByTimestamps`; union zawsze przez merge rekordu

---

## 2.45.26 (2026-06-03) — ETAP 8.3: Executive Win CTA + KPI

- **new** Pulpit — KPI „Wygrane bez roboty”, `TenderJobLinkButtons` na karcie okazji i w Action Center (won-realization)
- **improve** Ten sam flow Utwórz / Otwórz robotę co w COMMAND CENTER (bez nowych komponentów)

---

## 2.45.25 (2026-06-03) — ETAP 8.2: realizacja kontraktu po Create Job

- **improve** `plannedHandoverDate` z terminem realizacji; sync dokumentów po plikach z przetargu
- **improve** Baner kontraktu w Robotach (kwota, daty, BZP)

---

## 2.45.24 (2026-06-03) — ETAP 8.1: mapowanie roboty z wygranego

- **improve** `awardValuePln` → `invoiceAmount` (priorytet nad SWZ i naszym szacunkiem)
- **improve** `contractDate` → `startDate`, `implementationDays` → `endDate` (gdy oba źródła dostępne)

---

## 2.45.23 (2026-06-03) — ETAP 8.0A: jeden pipeline Classic × CC

- **fix** Jedna instancja `useTendersPipeline` — linkedJobId widoczny w CC i Classic bez F5
- **improve** R1: lekki reload z storage przy wejściu w Classic (bez BZP merge)

---

## 2.45.22 (2026-06-03) — ETAP 8.0: roboty z COMMAND CENTER

- **new** CC — „Utwórz robotę” / „Otwórz robotę” przy statusie wygrany (okazja, briefing, Action Center)
- **improve** `executeCreateJobFromTender` — wspólny handler Classic + CC

---

## 2.45.21 (2026-06-03) — COMMAND CENTER UX (ETAP 7G.1)

- **improve** „Co wymaga uwagi” — max 5, skrót, Pokaż wszystkie, Szczegóły
- **improve** Kolejność sekcji CC; kompaktowy briefing i Hero
- **fix** Zdolność finansowa w OwnerDashboard (`financialCapacityEnabled: true`)

---

## Docs — ETAP 7G executive dashboard (2026-06-03)

- **new** [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) — mapa plików, hook, legacy stats, ryzyka deploy
- **improve** `ARCHITECTURE.md` § 6.1, § 12.1.3 · `AGENTS.md` START HERE · `CURRENT-TASK.md` · `wgdom-stan-projektu.mdc`
- **Kod prod:** `7d49be2` — `feat(dashboard): integrate command center executive summary`

---

## Stabilność sync (main, bez bump UI — 2026-06-02)

Wdrożone commity infra (prod @ `92d574e`):

| Commit | Temat |
|--------|--------|
| `db1d05a` | Payroll Guard — `wouldBlockPayrollShrink` |
| `c9db032` | P11 — `applyBootstrapPayrollMerge` w CloudLoader |
| `92d574e` | P15 — fix merge `kw-admin-passwords` |

Szczegóły, procedury KV, UI media na gałęzi audit → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

---

## 2.45.15 (2026-05-25) — Optymalizacja Web + Mobile

- **improve** Lazy load: Przetargi, Inspektor admin, Pliki robot — szybszy start
- **improve** Główny JS −25% gzip, osobne chunki pdfjs/przetargi, preconnect Supabase
- **improve** docs/OPTIMIZATION.md

## 2.45.14 (2026-05-25) — Lista płac: niedziela 20:00

- **improve** Nd od 20:00 — auto-archiwum + nowy tydzień (gdy wszyscy rozliczeni)
- **fix** Alerty gdy tydzień zostaje w tyle po przejściu

## 2.45.13 (2026-05-25) — Docs AI: START HERE

- **new** `PROJECT-GUIDE.md`, `CHANGELOG.md`, `CURRENT-TASK.md` — struktura dla agentów
- **improve** AGENTS.md START HERE, Known Issues, reguły Cursor, ARCHITECTURE v2.45.12

## 2.45.12 (2026-05-25) — Przetargi: mapa OSM i słownik

- **fix** Mapa przetargów Wrocław — kafelki OpenStreetMap zamiast pustego SVG
- **improve** Słownik słów kluczowych — podgląd wbudowanych haseł, licznik wbudowanych/własnych

## 2.45.11 (2026-05-25) — Docs dla AI

- ARCHITECTURE.md § 12.1.1–12.1.2, AGENTS.md, ROZWOJ.md, wgdom-stan-projektu

## 2.45.10 (2026-05-25) — Galeria admin ZIP

- Pobieranie ZIP całej roboty / kategorii (przed / w trakcie / po)

## 2.45.9 (2026-05-25) — Mapa przetargów (SVG — zastąpione w 2.45.12)

- Tymczasowa mapa SVG po awarii staticmap OSM

## 2.45.8 (2026-05-25) — Przetargi: akcje i alerty

- Chipy „wymaga działania”, auto-wynik BZP, alerty pulpitu, .ics, porównanie cen

## 2.45.7 (2026-05-25) — Przetargi: SWZ, wadium, wyniki

- Analiza SWZ pdf.js, wadium + blokada, wyniki BZP, pakiet PDF, historia szacunku

## 2.45.0–2.45.6 — Zarządzanie sekcją przetargów

- Karta ofertowa, profil firmy v6, BIP discover, kalkulator oferty — szczegóły w App.tsx

---

Pełna historia (setki wpisów) → **`CHANGELOG` w `App.tsx`**.
