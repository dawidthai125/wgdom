# TRE-01 — DESIGN FREEZE (Slice A)

> **ID:** TRE-01-DESIGN-FREEZE-01  
> **EPIC:** TENDER RECOMMENDATION ENGINE (TRE-01)  
> **Slice:** **A — Offer Run Spine + Outcome MVP**  
> **STATUS:** **DESIGN FREEZE · Owner GO** · Slice A **CLOSED** · **PRODUCTION VERIFIED** (`74ac6a0` / 2.65.63)  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **#CORE-013** — zero Payroll write-path / zero zmiany semantyki cloud-sync merge / zero Edge  
> **Nadrzędne:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md) · [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md) · [`TRE-01-ARCHITECTURE-REVIEW.md`](TRE-01-ARCHITECTURE-REVIEW.md)  
> **Foundation:** [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md)  
> **Wycena SSOT:** [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) · Architecture Freeze  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **RELEASE / CLOSE:** [`TRE-01-RELEASE-REPORT.md`](TRE-01-RELEASE-REPORT.md) · [`TRE-01-CLOSEOUT.md`](TRE-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal:
  Offer Run (thin) + Recommendation Result + Outcome UI MVP
  + Foundation spine (FND-01…05, niewidoczna)
  + REUSE: pipeline · AI-COST · Bid · trust · docs/dossier
Zakaz: rewrite silników · FND-06 · Hub delete · e-składanie
Slice A CLOSED — TRE-02 tylko po nowym DF + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (wypełnienie przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*tylko klucz/stan Offer Run — DF §4.5; NIE kw-week-*)
G3 Cloud Sync:   NIE   (brak zmiany merge / DATA_KEYS / Edge batch)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE   (nie CloudLoader / nie shared payroll hooks)
G7 Providers:    NIE*  (*TendersProvider tylko jeśli konieczne do mountu Outcome — bez payroll)
G8 Shell:        NIE   (chrome app; Outcome = powierzchnia Przetargi)
G9 Routing:      TAK*  (*domyślne lądowanie po otwarciu detalu — DF §5; bez zmiany modelu URL V4 poza default tab/landing)

Wynik Gate: wymaga Boundary Check przy IMPLEMENT (G2/G9).
Owner GO: WYMAGANE przed kodem.
STABILIZATION WINDOW: ACTIVE — bez GO = brak IMPLEMENT.
```

\*Szczegóły G2/G9 zamrożone w §4–§5 — nie rozszerzać bez ACR.

---

## 1. Cel Slice A

Po **jednym kliknięciu** w przetarg użytkownik trafia na **Outcome UI MVP** z:

- **rekomendowaną ceną oferty (PLN)** ze **Silnika Rekomendacji Oferty (Bid Proposal)**, albo  
- **uczciwym statusem** (trwa wyliczanie / wymaga przeglądu / brak danych krytycznych),

oraz CTA **„Pokaż pełny kosztorys”** (reuse istniejącego kosztorysu/snapshotu).

W tle: **Offer Run** (cienka orkiestracja) + **Foundation FND-01…05** (niewidoczna).

**Nie** budujemy nowego modułu od zera. **Nie** przepisujemy AI-COST / Bid / parserów / discovery / dossier / trust / sync / Edge.

---

## 2. IN SCOPE (zamrożone)

### 2.1 Produkt / zachowanie

| # | IN |
|---|-----|
| I1 | Utworzenie **Offer Run** przy wyborze/otwarciu przetargu |
| I2 | Mapowanie sygnałów **istniejącego** pipeline/runtime → status Run (bez reimplementacji parse) |
| I3 | **Recommendation Result** — jedna liczba PLN z Bid (gdy dostępna) + status jakości |
| I4 | **Outcome UI MVP** jako **domyślne lądowanie** po otwarciu detalu (gdy flaga TRE Slice A ON) |
| I5 | CTA **Pokaż pełny kosztorys** → istniejąca powierzchnia kosztorysu / snapshot (nawigacja, nie nowy silnik) |
| I6 | Hub / dotychczasowy detal V4 dostępny jako **recovery / ekspert** (nie usunięty) |
| I7 | Foundation spine na Run: FND-01…05 (patrz §4.4) — **zero UI Foundation** |
| I8 | Feature flag / przełącznik umożliwiający rollback defaultu do Hub-first |
| I9 | Testy lib/UI zgodnie z §9 + wpis changelog + docs tip wg procesu release |
| I10 | Boundary Check #CORE-014 przed commit |

### 2.2 Allowlist plików (kontrakt — jawny `git add`)

> Implementacja **może** tylko pliki z tej listy (lub ACR + Owner GO na rozszerzenie).  
> Ścieżki nowe = do utworzenia w Slice A; istniejące = tylko zmiany w zakresie DF.

| Plik / obszar | Rola |
|---------------|------|
| `src/lib/tender-offer-run.ts` (**NOWY**) | Model Offer Run · status · mapowanie sygnałów runtime → fazy Run |
| `src/lib/tender-recommendation-result.ts` (**NOWY**) | Pure: Bid + trust/validation → Recommendation Result view-model |
| `src/lib/tender-offer-run-foundation.ts` (**NOWY**) | Spine FND-01…05 dla Run (id · digest · errors · audit · events) — bez UI |
| `src/app/hooks/useTenderOfferRun.ts` (**NOWY**) | Cienki hook: start Run · obserwacja istniejącego runtime · wynik |
| `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx` (**NOWY**) | Outcome UI MVP |
| `src/app/TenderDetailPage.tsx` | Default landing → Outcome gdy flaga ON; link/recovery do Hub |
| `src/lib/tenders-v4-config.ts` **lub** `src/lib/app-settings.ts` / flaga TRE | Feature flag Slice A (jedno miejsce — wybrać przy IMPLEMENT, nie oba bez ACR) |
| `scripts/test-tre-01-offer-run.mjs` (**NOWY**) | Testy Run + Recommendation Result + Foundation spine (bez UI Foundation) |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wersja UI Slice A |
| `docs/architecture/TRE-01-DESIGN-FREEZE.md` | Ten DF |
| `docs/AI/09_PRODUCTION_BASELINE.md` · `CURRENT-TASK.md` | Tip / status po release (docs) |

**Opcjonalnie (tylko jeśli konieczne do mountu — ACR w RR):**

| Plik | Warunek |
|------|---------|
| `src/app/tenders/TendersModule.tsx` | Wyłącznie nawigacja default — bez Strategii/Mapy |
| `src/lib/tender-detail-routes-v4.ts` | Wyłącznie jeśli default tab wymaga stałej (preferować landing w Page bez nowej trasy) |

### 2.3 Foundation — obowiązkowy minimalny zestaw Slice A

| Pakiet | Obowiązek Slice A |
|--------|-------------------|
| **FND-01** | `runId` przy starcie; powiązanie z id postępowania (BZP) bez podmiany numeru BZP |
| **FND-02** | Co najmniej digest wyniku rekomendacji gdy cena dostępna; opcjonalnie digest snapshotu jeśli już w pamięci Run |
| **FND-03** | Mapowanie błędów krytycznych → status wyniku (nie raw dump w UI) |
| **FND-04** | Audit: `run.created` · `recommendation.issued` (gdy cena) |
| **FND-05** | Eventy: `run.started` · `offer.recommended` lub `run.failed` / `run.degraded`; opcjonalnie `documents.ready` **tylko** jeśli sygnał już istnieje w runtime |

---

## 3. OUT OF SCOPE (twarde)

| # | OUT |
|---|-----|
| O1 | Przepisanie / refaktor AI-COST S1–S7 |
| O2 | Przepisanie Bid Proposal / drugi kalkulator Kp/marży |
| O3 | Zmiana parserów ATH/PDF/ZIP/7z / discovery / dossier merge quality |
| O4 | Zmiana trust engine (logika) — tylko **odczyt** do statusu |
| O5 | Zmiany `cloud-sync.ts` merge · `DATA_KEYS` · Edge `tenders-bzp-*` |
| O6 | FND-06 Observability |
| O7 | Usunięcie Workflow Hub / 5 tabów V4 / Strategii / Map |
| O8 | Rozbudowa Autonomous theater / nowi „agenci” UI |
| O9 | E-składanie oferty na platformie zamawiającego |
| O10 | Pełna orkiestracja zastępująca `useTenderPipelineRuntime` |
| O11 | Migracja wszystkich ID domenowych na FND-01 |
| O12 | Widoczny UI Foundation (feed eventów, audyt, digest hex) |
| O13 | Persist fat Run do `kw-tenders-pipeline` (zakaz Sync Storm) |
| O14 | Payroll / Domain Push / PWRB / CloudLoader |
| O15 | GDS-02 / TEUX token thaw |
| O16 | Dalsze slice TRE (wymagania→marża deep, pełny orchestrator) |

**Naruszenie OUT = STOP IMPLEMENT · ACR + Owner GO.**

---

## 4. Interfejsy pomiędzy warstwami

### 4.1 Outcome UI ← Recommendation Result

**Outcome UI konsumuje wyłącznie view-model Recommendation Result:**

| Pole (kontrakt logiczny) | Znaczenie |
|--------------------------|-----------|
| `recommendedOfferPln` | `number \| null` — cena z Bid; `null` = brak rekomendacji |
| `qualityStatus` | `ready` \| `review_required` \| `insufficient_data` \| `running` |
| `statusLabelPl` | Krótki tekst statusu (bez Foundation) |
| `tenderTitle` / `bzpRef` | Identyfikacja postępowania (display) |
| `canShowCostEstimate` | Czy CTA kosztorys aktywne |
| `runPhaseLabelPl` (opcjonalnie) | Jedna linia „Trwa wyliczanie…” — bez listy faz |

**Zakaz UI:** liczenie marży · wywołanie AI-COST bezpośrednio · render eventów Foundation.

### 4.2 Offer Run ← istniejący runtime / pipeline

| Kierunek | Kontrakt |
|----------|----------|
| Offer Run **odczytuje** | Sygnały już dostępne z runtime detalu (documents/dossier/pricing/trust/bid) |
| Offer Run **nie wywołuje** | Nowych ścieżek parse / Edge batch / sync merge |
| Offer Run **emituje** | Status Run + Foundation events/audit (wewnętrznie) |
| Offer Run **dostarcza** | Wejście do Recommendation Result (artefakty już policzone) |

### 4.3 Recommendation Result ← Bid + jakość

| Źródło | Użycie |
|--------|--------|
| **Bid Proposal** (`computeTenderBidProposal` / istniejący wynik na item) | **Jedyna** wartość `recommendedOfferPln` |
| **AI-COST** | Pośrednio — tylko jeśli już zasila Bid przez istniejący adapter; Slice A **nie** buduje nowego łańcucha S1–S7 |
| **Trust / validation** | Mapowanie na `qualityStatus` |
| **FND-03** | Błędy krytyczne Run → `insufficient_data` / failed |

**Zakaz:** suma „na skróty” w Recommendation Result z pominięciem Bid.

### 4.4 Offer Run ↔ Foundation

| Foundation | Interfejs Slice A |
|------------|-------------------|
| FND-01 | `createId` / validate → `runId`; store powiązania `tenderPipelineItemId` |
| FND-02 | `createDigest` na payloadu rekomendacji (i opcjonalnie snapshot) |
| FND-03 | `FoundationError` / serialize wewnętrznie; UI dostaje tylko status PL |
| FND-04 | `createAuditRecord` — run.created · recommendation.issued |
| FND-05 | `createEvent` — run.started · offer.recommended · run.failed/degraded |

**Zakaz:** eksport Foundation typów do props React Outcome.

### 4.5 Persist Offer Run (G2)

| Reguła | Wartość |
|--------|---------|
| Cel | Idempotencja / odtworzenie `runId` w sesji; audyt/eventy w pamięci lub **minimalny** lokalny store |
| **Zakaz** | Zapis fat Run do `kw-tenders-pipeline` |
| **Zakaz** | Nowe klucze w `DATA_KEYS` / cloud batch w Slice A |
| Dozwolone | Session/memory-first; jeśli LS — osobny wąski klucz Run **poza** pipeline (nazwa w IMPLEMENT RR), bez sync |

---

## 5. Punkty integracji z istniejącym modułem

| Punkt | Zachowanie Slice A |
|-------|-------------------|
| **Lista → otwarcie detalu** | Bez zmiany wyszukiwania; po wejściu default = Outcome (flaga ON) |
| **`TenderDetailPage`** | Montuje istniejący runtime (REUSE) + `useTenderOfferRun` + Outcome MVP |
| **`useTenderPipelineRuntime`** | **Nietknięta odpowiedzialność**; Offer Run tylko obserwuje |
| **Workflow Hub** | Recovery: jawne wejście „Szczegóły / Hub” z Outcome |
| **Tab Kosztorys / istniejący workspace** | Cel CTA „Pokaż pełny kosztorys” |
| **Tab Ceny / AI Cost panel** | Nie usuwane; nie są defaultem Slice A |
| **Decyzja GO/HOLD** | OUT — opcjonalnie link drugorzędny, nie ekran MVP |
| **Strategia / Mapa / Ustawienia** | Nietknięte |
| **Autonomous Gate** | Nie rozbudowywać; jeśli obecny — nie może blokować Outcome (preferować Outcome nad teatrem; bez rewrite Autonomous) |
| **TendersProvider / snapshot** | REUSE danych listy; bez nowych KPI Strategii |

### Feature flag

| Stan | UX |
|------|-----|
| **TRE-01 Slice A = OFF** (default do PV Ownera) | Zachowanie obecne (Hub-first / dotychczasowy detal) |
| **ON** | Outcome-first default |

Rollback = flaga OFF (patrz §7).

---

## 6. Ryzyka implementacyjne

| ID | Ryzyko | Sev | Kontrola DF |
|----|--------|-----|-------------|
| IR1 | Scope creep → rewrite runtime | H | OUT O10 · allowlist |
| IR2 | Fat LS/pipeline write | H | §4.5 zakaz |
| IR3 | Druga cena w UI | H | Bid only · Outcome jedyny default |
| IR4 | Foundation w UI | M | Zakaz §4.1 / O12 |
| IR5 | Naruszenie AI-COST Freeze | H | Brak zmian S1–S7 · Bid SSOT |
| IR6 | Regresja otwarcia detalu / V4 URL | M | Minimalna zmiana Page · test nawigacji |
| IR7 | Autonomous vs Outcome race | M | Outcome nie zależy od teatru; flaga |
| IR8 | Mixed CORE | H | Gate · zero cloud-sync |
| IR9 | Fałszywy status `ready` | M | Trust/validation obowiązkowe w Result |
| IR10 | Allowlist creep (changelog-only commit zagarnia WIP) | M | Jawny `git add` · zakaz `git add -A` |

---

## 7. Plan rollback

| Poziom | Akcja | Skutek |
|--------|-------|--------|
| **R0 — flaga OFF** | Wyłączenie TRE-01 Slice A | Natychmiastowy powrót Hub-first / dotychczasowy detal; kod Slice A martwy |
| **R1 — revert commit Slice A** | Revert allowlist commit(ów) | Usunięcie Outcome default + Offer Run z prod tip |
| **R2 — hotfix nawigacji** | Przywrócenie poprzedniego default landing w `TenderDetailPage` | Gdy flaga zawodna |
| **Nigdy w rollbacku** | Zmiana Bid / AI-COST / sync / Edge „w drugą stronę” | Silniki nietknięte = rollback prosty |

**Warunek release:** R0 musi działać **bez** redeployu silników (flaga w ustawieniach/config build).

---

## 8. Kryteria akceptacji (AC)

### Produkt (Product SSOT)

| ID | Kryterium |
|----|-----------|
| AC-P1 | Po otwarciu przetargu (flaga ON) użytkownik widzi Outcome z ceną **lub** uczciwym statusem — **bez** obowiązkowego Huba |
| AC-P2 | Gdy Bid ma rekomendację — Outcome pokazuje **tę** kwotę PLN (jedyna prawda) |
| AC-P3 | CTA „Pokaż pełny kosztorys” otwiera istniejący kosztorys/snapshot gdy dostępny |
| AC-P4 | Brak UI Foundation (brak feedu eventów/audytu/digest) |
| AC-P5 | Hub dostępny jako recovery |
| AC-P6 | Flaga OFF przywraca poprzednie zachowanie |

### Architektura / REUSE

| ID | Kryterium |
|----|-----------|
| AC-A1 | Zero zmian semantyki AI-COST / Bid calculator / parserów / discovery / dossier / trust engine / Edge / cloud-sync merge |
| AC-A2 | `recommendedOfferPln` pochodzi wyłącznie z Bid Proposal |
| AC-A3 | Offer Run nie reimplementuje heavy parse |
| AC-A4 | Diff ⊆ allowlist DF (lub ACR) |

### Foundation

| ID | Kryterium |
|----|-----------|
| AC-F1 | Każdy Run ma `runId` (FND-01) |
| AC-F2 | Przy wydanej rekomendacji: digest (FND-02) + audit recommendation.issued (FND-04) + event offer.recommended (FND-05) |
| AC-F3 | Start Run: audit/event created/started |
| AC-F4 | Błąd krytyczny mapowany przez FND-03 → status UI PL |
| AC-F5 | FND-06 nieobecny |

### Jakość / proces

| ID | Kryterium |
|----|-----------|
| AC-Q1 | Testy Slice A PASS |
| AC-Q2 | `npm run build` PASS |
| AC-Q3 | Boundary #CORE-013/#014 PASS |
| AC-Q4 | Changelog + tip docs wg procesu (po GO release) |

---

## 9. Kryteria zakończenia TRE-01 Slice A (Definition of Done)

Slice A = **COMPLETE** tylko gdy **wszystkie** punkty:

```text
□ Owner GO na TEN Design Freeze
□ IMPLEMENT ⊆ allowlist
□ AC-P1…P6 PASS (Owner QA lub uzgodniony smoke)
□ AC-A1…A4 PASS
□ AC-F1…F5 PASS
□ AC-Q1…Q3 PASS
□ Feature flag R0 zweryfikowany (OFF = poprzednie UX)
□ Brak zmian OUT (O1–O16)
□ Release docs (changelog · 09 · CURRENT-TASK) — przy release
□ Architecture Review + DF powiązane w RR
□ Commit tylko na prośbę Ownera · push tylko na prośbę Ownera
```

**Slice A ≠ cały EPIC TRE-01.**  
Kolejne slice (głębsza orkiestracja, wymagania→marża, pełne eventy documents.*) = **nowy DF**.

---

## 10. Zgodność dokumentów nadrzędnych (check)

| Dokument | Slice A |
|----------|---------|
| Product SSOT §1 / §11 | Outcome-first · bramka ceny PASS |
| Architecture Blueprint | Offer Run thin · Foundation · Bid · Outcome MVP |
| Architecture Review TRE-01 | Start = Slice A — **ten DF go zamraża** |
| Foundation Phase 0 | FND-01…05; FND-06 OUT; UI nie eksponuje |
| AI-COST Freeze / SSOT | REUSE; Bid jedyny generator oferty |
| Workflow v2.63 | Hub = recovery, nie default |

---

## 11. Decyzja Ownera

| Werdykt | Skutek |
|---------|--------|
| **GO** | Odblokowanie IMPLEMENT Slice A według tego DF |
| **GO WITH CHANGES** | ACR do DF → ponowny Freeze → GO |
| **NO GO** | Brak kodu; DF pozostaje DRAFT/HOLD |

```text
Owner decision: GO
Data: 2026-07-28
Podpis/ACK: Owner GO (TRE-01-IMPLEMENTATION-SLICE-A)
```

---

## 12. Status dokumentu

| Pole | Wartość |
|------|---------|
| **Kontrakt implementacyjny Slice A** | **TEN PLIK** |
| **IMPLEMENT** | **CLOSED** — Slice A shipped · PV |
| **Commit / push** | Feature **`74ac6a0`** · dalsze tylko docs tip / Owner GO |

---

**Koniec TRE-01-DESIGN-FREEZE.**  
Oczekiwanie na decyzję Ownera: **GO / NO GO**.
