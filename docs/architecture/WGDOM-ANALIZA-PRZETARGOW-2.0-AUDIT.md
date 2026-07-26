# WGDOM — ANALIZA PRZETARGÓW 2.0 · AUDIT + RCA

> **ID:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (czekaj na Owner GO + Design Freeze)  
> **Data:** 2026-07-26  
> **Klasa:** FEATURE / TEUX · **#CORE-013** — zero Payroll / Cloud Sync write-path / Edge merge  
> **Tip SSOT:** [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · UI **2.65.46**  
> **Companion:** [`WGDOM-ANALIZA-PRZETARGOW-2.0-PLAN.md`](WGDOM-ANALIZA-PRZETARGOW-2.0-PLAN.md)

```text
════════════════════════════════════════════════════════
AUDIT ONLY — zero src/** · zero commit · zero push
Następny krok: Owner ACK → DESIGN FREEZE (thin) → Owner GO → IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (sesja AUDIT)

```text
PAYROLL SAFETY GATE
G1 Payroll:      NIE
G2 LocalStorage: NIE   (fingerprint Autonomous = istniejący LS; OUT z P0 bez DF storage)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE   (chrome Przetargi = TEUX; nie App shell)
G9 Routing:      NIE   (V4 routes bez zmian w P0)
Wynik: ALL-NIE (AUDIT ONLY)
Owner GO needed: YES przed IMPLEMENT · STABILIZATION WINDOW ACTIVE
```

**Boundary:** cały EPIC = domena **Przetargi / TEUX** · DS = **TEUX** (nie mieszać z globalnym Wg* bez DF).  
**Protected Core:** nietknięty przy AUDIT; IMPLEMENT nie wolno ruszać `cloud-sync` / Payroll / Edge.

---

## 1. Cel biznesowy (brief Ownera)

Przebudować analizę przetargów tak, aby była **użyteczna dla firmy budowlanej przygotowującej ofertę**:

1. Klasyfikacja dokumentów zgodna z praktyką (SWZ, OPZ, STWiOR, umowa, projekt, rysunki, przedmiar, kosztorys inwestorski/ofertowy, referencje, formularze, oświadczenia, pozostałe).
2. **Brak kosztorysu ≠ błąd** — przedmiar PDF bez cen = dokumentacja umożliwia wycenę.
3. Analiza przedmiaru (KNR/KNNR, pozycje, jednostki, ilości, branże, sekcje) **bez wymogu cen**.
4. Auto-analiza po wejściu / zmianie dokumentów; „Przeanalizuj dokumenty” → **„Uruchom ponownie analizę”**.
5. Pipeline wieloagentowy (dokumenty · formalny · zakres · terminy · finansowy · ryzyka · wycena · rekomendacja) z **pewnoscią per etap**.
6. Podsumowanie kompletności zamiast „Nie znaleziono kosztorysu”.
7. Przebudowa panelu wyników (wysokość, expand, fullscreen, nawigacja sekcji).
8. Wskaźniki: kompletność dokumentacji / formalna / techniczna · gotowość wyceny · ryzyko · pewność AI.
9. UX od wejścia do STARTUJ — uproszczenie pod TEUX.

**Ten dokument = AUDIT + RCA. Plan architektury / backlog / UI / thin slices → PLAN.**

---

## 2. Stan obecny — mapa pipeline’u

### 2.1 Flow (as-is)

```text
TenderDetailPage
  └─ useTenderPipelineRuntime (SSOT facade)
       ├─ useTenderDocumentsBootstrap     → discovery BZP (+ external gdy 0 docs)
       ├─ useTenderDossierHeavyLazy       → cost phase → metadata enrich
       ├─ useTenderPricingAuto            → GATE: cost ≠ NOT_FOUND
       └─ TenderAutonomousGate (NG-10)    → fullscreen run → outcome → workspace

Parse engine (tender-document-resolver.ts)
  buildTenderDocCandidates → ZIP/7Z unpack
  → discoverBestCostDocument (tender-cost-discovery.ts)
  → pickCostParseCandidates → runCostParseLoop → bestKosztorys
  → runMetadataParseLoop (SWZ / metadane)

SSOT output
  item.tenderDossier { kosztorys, scanSummary, … }
  resolvedCostStatus → FOUND_WITH_VALUE | FOUND_NO_VALUE | NOT_FOUND

Decision
  scoreTender → computeTenderDecision (GO/HOLD/NO-GO)
  → applyTenderIntelligenceOverlay → STARTUJ / ANALIZUJ / ODPUŚĆ
```

### 2.2 Kluczowe SSOT (kod)

| Obszar | Plik |
|--------|------|
| Runtime facade | `src/app/hooks/useTenderPipelineRuntime.ts` |
| Bootstrap docs | `src/app/hooks/useTenderDocumentsBootstrap.ts` |
| Heavy parse | `src/app/hooks/useTenderDossierHeavyLazy.ts` |
| Discovery gate | `src/lib/tender-document-discovery.ts` |
| Full discovery | `src/lib/tender-pipeline/tender-full-document-discovery.ts` |
| Attachment gate | `src/lib/tender-pipeline/unified-attachment-gate.ts` |
| Parse engine | `src/lib/tender-document-resolver.ts` |
| Dossier pipeline | `src/lib/tender-dossier-pipeline.ts` |
| Role docs | `src/lib/tender-document-role.ts` |
| Cost discovery | `src/lib/tender-cost-discovery.ts` |
| PDF przedmiar | `src/lib/pdf-przedmiar-heuristic.ts` |
| Cost status UI | `src/lib/tender-data-ssot.ts` |
| Kosztorys phase UX | `src/lib/tender-kosztorys-process-phase.ts` |
| Pricing gate | `src/lib/tender-pipeline/derive-pipeline-readiness.ts` |
| Trust | `src/lib/tender-trust-layer.ts` |
| Decision + labels | `src/lib/tenders-strategy-decision.ts` |
| Intelligence overlay | `src/lib/tender-intelligence-overlay.ts` |
| Documents summary | `src/lib/tender-documents-tab-summary.ts` |
| Operator copy | `src/lib/tender-owner-language-pl.ts` |
| Autonomous | `src/app/tenders/autonomous/TenderAutonomousGate.tsx` |

### 2.3 Co już działa dobrze (REUSE FIRST)

| Asset | Wartość |
|-------|---------|
| Auto bootstrap + lazy heavy na mount | Analiza już startuje bez klikania (częściowo spełnia §4 briefu) |
| `FOUND_NO_VALUE` | Model już rozróżnia przedmiar bez cen vs brak dokumentu |
| `pdf-przedmiar-heuristic.ts` | KNR/KNNR, jednostki, ilości, CASE 1/2/3 — baza pod §3 |
| `classifyDocumentRole` | SWZ/OPZ/STWiOR/przedmiar/kosztorys/formularz — baza pod §2 |
| NG-10 Autonomous | Makro-timeline + outcome + fingerprint — baza „agentów” UX |
| TEUX tokens + Trust layer | Design system detalu przetargu |
| `DocumentsTabSummary` | Zalążek kompletności (SWZ · przedmiar · kosztorys · umowa · formularz) |

---

## 3. Problemy (pełna lista)

### P-A — Semantyka kosztorysu / przedmiaru (ROOT PRODUCT)

| ID | Problem | Dowód |
|----|---------|-------|
| **P-A1** | Terminalny brak kosztorysu prezentowany jako **błąd / warn / blocked**, nie jako normalny stan przetargu budowlanego | `resolvedCostStatus` → `NOT_FOUND` · copy „Nie znaleziono kosztorysu.” (`tender-data-ssot.ts`) · faza E10 (`tender-kosztorys-process-phase.ts`) · Trust `kosztorys_not_found` severity **error** + level **blocked** (`tender-trust-layer.ts`) |
| **P-A2** | Auto-wycena **zablokowana** przy `NOT_FOUND` — nawet gdy jest przedmiar PDF z ilościami niezparsowany / niewykryty jako cost doc | `canComputeTenderPricingAuto` wymaga `resolvedCostStatus !== "NOT_FOUND"` |
| **P-A3** | Confidence AI zawsze **low** bez `kosztorys.ok` | `resolveConfidence` w `tender-intelligence-overlay.ts` |
| **P-A4** | Slot „Kosztorys” w Dokumentach = „Brak” dla wszystkiego poza `FOUND_WITH_VALUE` — nie rozróżnia „nie dostarczono” vs „błąd odczytu” | `buildKosztorysSlot` |
| **P-A5** | Brak jawnego wskaźnika **„Możliwość przygotowania wyceny”** opartego o przedmiar (ilości), nie o cenach inwestora | brak SSOT; pricing gate = proxy kosztorysu |
| **P-A6** | Guide / copy 7Z nadaluje użytkownika do „pobierz kosztorys” gdy archiwum ma same PDF — wzmacnia błędny model mentalny | `GuideView` FAQ Archiwum 7Z |

### P-B — Klasyfikacja dokumentów (niepełna vs brief)

| ID | Problem | Dowód |
|----|---------|-------|
| **P-B1** | `DocumentRole` nie obejmuje: umowa, projekt, rysunki, referencje, oświadczenia, kosztorys inwestorski vs ofertowy, „pozostałe” jako first-class | `tender-document-role.ts` — tylko 9 ról |
| **P-B2** | Klasyfikacja głównie po **nazwie pliku**; PDF bez słów kluczowych → `unknown` | `classifyDocumentRole` |
| **P-B3** | XLSX bez „koszt/przedm” często → `przedmiar` lub formularz — kolizje z ofertą | `isFormalOfferCostFilename` + fallbacki |
| **P-B4** | Summary Dokumenty ma tylko 5 slotów; brak OPZ/STWiOR/projekt/rysunki/referencje | `DocumentsTabSummarySlot` |
| **P-B5** | Display tier (`classifyTenderDocumentDisplayTier`) ≠ role SSOT — dwa słowniki | `tender-workspace-ux` vs `tender-document-role` |

### P-C — Analiza przedmiaru (głębokość)

| ID | Problem | Dowód |
|----|---------|-------|
| **P-C1** | PDF przedmiar: heurystyka istnieje, ale wynik nie napędza **gotowości wyceny** ani multi-agent summary | `pdf-przedmiar-heuristic.ts` vs pricing/trust |
| **P-C2** | Brak jawnego ekstraktu branż / sekcji robót jako produktu UI (częściowo w parserze, słabo w hubie) | Workspace V2 / Insights — focus na kosztorys/ATH |
| **P-C3** | Skan / brak warstwy tekstu (CASE 3) → Trust **blocked** — OK technicznie, ale copy nadal „kosztorys”, nie „przedmiar wymaga OCR” | trust layer PDF path |
| **P-C4** | Discovery PDF przedmiaru zależy od wzorców nazwy (`*_PR.pdf`, „przedmiar”) — milczące PDF „Załącznik 3.pdf” często pomijane | `isPdfPrzedmiarCostFilename` |

### P-D — Orkiestracja analizy (auto vs manual)

| ID | Problem | Dowód |
|----|---------|-------|
| **P-D1** | Copy przycisku nadal **„Przeanalizuj dokumenty”** — sugeruje ręczny primary | `TENDER_OWNER_OPERATOR_COPY.analyzeDocuments` |
| **P-D2** | Legacy hint: „Otwórz Dokumenty lub Wycena aby rozpocząć analizę” — sprzeczny z auto pipeline V4 | `KOSZTORYS_AWAITING_PARSE_HINT` |
| **P-D3** | Auto bootstrap ma **cap 2** prób; heavy ma circuit breaker — użytkownik bez jasnego „uruchom ponownie” jako recovery | bootstrap + heavy lazy |
| **P-D4** | Ręczna `analyzeTenderWithDossier` ≠ lazy cost+metadata path (dwa kontrakty persist) | `tender-dossier-pipeline` vs heavy lazy |
| **P-D5** | Fingerprint Autonomous nie obejmuje pełnej mapy ról dokumentów — zmiana „tylko OPZ” może nie restartować sensownie | `tender-autonomous-run-fingerprint.ts` |
| **P-D6** | „Agenci” w Autonomous to **UX narrative** nad jednym pipeline — brak osobnych wyników + confidence per agent | `tender-autonomous-run-phase.ts` |

### P-E — Rekomendacja STARTUJ / ANALIZUJ / ODPUŚĆ

| ID | Problem | Dowód |
|----|---------|-------|
| **P-E1** | Scoring może dać GO przed kosztorysem; O4 obniża do HOLD bez marży — OK, ale brak ścieżki „wycena z przedmiaru ilościowego” | overlay O4 |
| **P-E2** | Brak kosztorysu ≠ twardy NO-GO, ale **niska pewność + Trust error** psuje zaufanie do rekomendacji | confidence + trust |
| **P-E3** | Werdykt systemu (Decyzja) vs Primary CTA (Przetarg) — dwa kanały zapisu Owner GO; spójne, ale edukacja UX słaba | `TenderDecisionView` + `TenderWorkflowPrimaryAction` |
| **P-E4** | Brief używa „ODRZUĆ”; produkt = **ODPUŚĆ** — nie zmieniać bez DF copy | `DECISION_LABEL_PL` |

### P-F — UX / UI panel wyników

| ID | Problem | Dowód |
|----|---------|-------|
| **P-F1** | Brak jednego „panelu wyników analizy” — rozproszenie: Insights(3) + accordion postępu + Autonomous outcome + Decyzja | hub V2 |
| **P-F2** | Analysis Status Strip schowany w accordionie przy Command Layer — łatwo przeoczyć | `TenderWorkflowHubPanel` |
| **P-F3** | Insights max 3 — reszta „+N w szczegółach” | `HUB_INSIGHTS_VISIBLE_MAX` |
| **P-F4** | 4 różne modele postępu (filary · strip 4 · process 5 · bid prep) — cognitive overload | multiple SSOT UX |
| **P-F5** | Brak trybu fullscreen / expand wyników w workspace (jest tylko Gate fullscreen) | brak komponentu |
| **P-F6** | Operator Action Bar konkuruje o viewport (sticky mobile) | `TenderWorkflowOperatorActionBar` |
| **P-F7** | Kompletność oferty (`TenderOfferCompletenessPanel`) poza głównym hubem | Decyzja / legacy offer |
| **P-F8** | Duplikaty TEUX vs ad-hoc `text-[9px]` w stripach | consistency debt |

### P-G — Architektura / proces

| ID | Problem | Dowód |
|----|---------|-------|
| **P-G1** | EPIC pokrywa semantykę + parser + multi-agent + UI — **za szeroki na jeden DF**; wymaga thin slices | brief Ownera |
| **P-G2** | STABILIZATION WINDOW ACTIVE — IMPLEMENT tylko po Owner GO | MASTER_HANDOFF |
| **P-G3** | TEUX ≠ GDS Wg* — migracja chrome do Wg* **OUT** bez osobnego DF | Decision Tree §6b |
| **P-G4** | Sync Storm / heavy persist — zmiany heavy parse muszą respektować kontrakt local vs cloud (HARDENING) | TENDERS-SYNC-STORM-P0 CLOSED |

---

## 4. RCA (Root Cause Analysis)

### RC-1 — Product model: „kosztorys = centrum prawdy”

**Objaw:** Komunikaty błędu, Trust blocked, pricing gate, confidence low — wszystkie spirają wokół braku pliku ATH/XLS/kosztorysu z cenami.

**Root cause:** Historyczny pipeline (P2-E / Kosztorys Workspace / ATH) zoptymalizowany pod **kosztorys inwestorski / ATH**. `FOUND_NO_VALUE` dodano później (PDF przedmiar), ale **warstwa decyzyjna i trust nie przejęły semantyki „przedmiar wystarczy do wyceny własnej”**.

**Dlaczego nadal boli:** Auto-wycena i intelligence confidence traktują `NOT_FOUND` jak brak materiału do pracy, podczas gdy w praktyce B2B budowlanym **większość postępowań ma przedmiar bez cen**.

### RC-2 — Klasyfikacja dokumentów = filename heuristics, nie model kompletności

**Objaw:** Brak OPZ/umowy/rysunków w summary; unknown PDF; słaba kompletność formalna.

**Root cause:** `DocumentRole` + display tiers powstały jako **priorytet parse**, nie jako **checklisty kompletności oferty**. Brak SSOT „Documentation Completeness Score”.

### RC-3 — „Agenci” = storytelling nad monolitem

**Objaw:** Brief chce osobne etapy z confidence; produkt ma jeden heavy parse + UX Autonomous.

**Root cause:** NG-10 dodał **prezentację** (timeline, activity) bez kontraktu danych per agent. Wyniki formalne/zakres/terminy/ryzyka są rozproszone (SWZ analysis, fit, overlay, trust) bez wspólnego `AnalysisStageResult[]`.

### RC-4 — UX: postęp rozproszony, wyniki schowane

**Objaw:** Mały / nieczytelny „dolny panel”; dużo scrolla; użytkownik klika „Przeanalizuj” mimo auto-run.

**Root cause:** EPIC A/B/C hub celowo schował szczegóły do accordionów + Command Layer; copy operatora nie zaktualizowano do modelu auto; brak dedicated Analysis Results surface.

### Werdykt RCA

```text
PRIMARY:   RC-1 (semantyka kosztorysu ≠ rzeczywistość przedmiaru)
SECONDARY: RC-2 (klasyfikacja), RC-3 (brak stage contract), RC-4 (UX surface)
NOT:       brak auto-pipeline (auto istnieje — problem to semantyka + copy + gates)
```

---

## 5. Ograniczenia obecnego systemu (kontrakt as-is)

1. Discovery wymaga anchor (numer lub HTML ≥ 100).
2. Heavy parse wymaga eligible attachments (BZP / external ≤6 / upload ATH).
3. External docs capped / scored.
4. Formularze ofertowe wykluczane z cost discovery (celowe).
5. Parser version stale → re-parse.
6. Circuit breaker heavy + bootstrap mount cap.
7. PDF bez OCR — CASE 3 nie wyciąga pozycji.
8. TEUX TOKEN FREEZE — zmiany visual przez tokeny / komponenty TEUX, nie ad-hoc parallel DS.
9. Decyzja Owner ≠ automatyczny STARTUJ systemu.

---

## 6. Luki vs brief Ownera (gap matrix)

| Wymaganie brief | Stan as-is | Gap |
|-----------------|------------|-----|
| Bogata klasyfikacja docs | Częściowa (role + tiers) | **DUŻY** — P-B* |
| Brak kosztorysu ≠ błąd | Status legalny, UX/trust jak błąd | **DUŻY** — P-A* |
| Analiza przedmiaru KNR/… | Heurystyka PDF istnieje | **ŚREDNI** — produktize P-C* |
| Auto-analiza | Jest (bootstrap + heavy + Autonomous) | **MAŁY** — copy + re-run P-D1/D2 |
| Multi-agent + confidence | Narrative only | **DUŻY** — RC-3 |
| Kompletność zamiast „nie znaleziono” | Częściowy summary | **DUŻY** — P-A/P-B |
| Panel wyników duży/expand/FS | Brak | **DUŻY** — P-F* |
| Wskaźniki 6 KPI | Rozproszone / brak | **DUŻY** |
| UX do STARTUJ | Działa, złożony | **ŚREDNI** |

---

## 7. Ryzyka IMPLEMENT (wczesne)

| Ryzyko | Mitigation |
|--------|------------|
| Zmiana `resolvedCostStatus` semantyki → regresja wyceny / Gate B tenders | Thin slice: najpierw **presentation + readiness SSOT**, potem gate pricing |
| Multi-agent rewrite całego resolvera | **REUSE** — wrap istniejących faz w `AnalysisStageResult`, nie nowy monolit |
| Sync Storm przy częstszym re-parse | Respektować persist local/cloud; fingerprint; debounce |
| Mieszanie TEUX + Wg* | Zakaz — tylko TEUX w detalu |
| Mixed FEATURE+CORE | Zero cloud-sync / Payroll w commitach EPIC |
| Scope creep „pełny AI agent backend” | OUT — staged lib + UX; LLM OUT bez osobnego briefu |

---

## 8. OUT OF SCOPE (ten EPIC / AUDIT)

- Payroll / Cloud Sync / Edge merge / Domain Push  
- GDS-02 / Wg* migration Przetargi  
- Pełny OCR / zewnętrzny LLM  
- Zmiana reguł scoringu strategicznego portfolio (poza confidence / completeness feed)  
- Re-open NG-04 ATH fidelity / TOKEN FREEZE thaw  
- Commit / push bez Owner GO  

---

## 9. Definition of Done — AUDIT

- [x] Pipeline zmapowany (discovery → parse → status → decision → UX)  
- [x] RCA PRIMARY + SECONDARY  
- [x] Lista problemów P-A…P-G  
- [x] Gap vs brief  
- [x] Gate ALL-NIE (AUDIT)  
- [x] PLAN companion (architektura · backlog · UI · thin slices)  
- [ ] Owner ACK tego AUDIT  
- [ ] Design Freeze pierwszego thin slice  
- [ ] Owner GO → IMPLEMENT  

---

## 10. Rekomendacja dla Ownera

```text
WERDYKT AUDIT:  GO WITH CONDITIONS
NASTĘPNY KROK:  przeczytaj PLAN → wybierz P0 slice (rekomendacja: AP2-S0 Semantyka przedmiaru)
IMPLEMENT:      STOP do Design Freeze + Owner GO
```

**Rekomendowany pierwszy thin slice (szczegóły w PLAN):**  
**AP2-S0 — Semantyka kompletności + „przedmiar wystarczy” + copy (bez zmiany parsera deep).**  
Najwyższy ROI / najniższy blast radius vs RC-1.

---

**AUDIT COMPLETE** · 2026-07-26 · bez zmian `src/**`
