# W&G DOM — changelog (skrót dla agentów AI)

## 2.53.4 — UX.1B Tender Workspace Tabs
- 5 workspace: Przegląd · Dokumenty · Kwalifikacja · Wycena · Oferta (lazy render)
- TenderWorkspaceTabBar, TenderDocumentsWorkspace, TenderQualificationWorkspace, TenderOverviewShortcuts
- Kafelki → workspace nav; Przegląd ≤ 1 ekran

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
