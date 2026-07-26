# WGDOM — ANALIZA PRZETARGÓW 2.0 · PLAN (architektura · backlog · UI · thin slices)

> **ID:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **PLAN DRAFT** · **DESIGN FREEZE NOT STARTED** · **IMPLEMENT BLOCKED**  
> **Data:** 2026-07-26  
> **SSOT AUDIT:** [`WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md`](WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md)  
> **Tip:** [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
Nie implementuj z tego dokumentu.
Owner ACK AUDIT → DF per thin slice → Owner GO → IMPLEMENT → PV → next slice.
```

---

## 1. Zasady architektury (niezmienne)

| Zasada | Zastosowanie w EPIC |
|--------|---------------------|
| **SSOT FIRST** | Jeden model kompletności docs · jeden `AnalysisStageResult` · tip tylko w `09` |
| **REUSE FIRST** | Rozszerz `DocumentRole`, `resolvedCostStatus` consumers, PDF heurystykę, NG-10 timeline — nie nowy monolit |
| **ZERO DUPLICATE LOGIC** | Jedna funkcja „gotowość wyceny”; Trust/overlay/summary czytają SSOT |
| **THIN SLICE FIRST** | Jeden concern · osobny DF · osobny commit · PV |
| **TEUX only** | Detal Przetargi = TEUX; Wg* OUT |
| **#CORE-013** | Zero Payroll / cloud-sync write-path w commitach FEATURE |
| **STABILIZATION** | Start EPIC tylko po Owner GO |

---

## 2. Propozycja nowej architektury pipeline’u

### 2.1 Target mental model

```text
DOKUMENTY (fakty)
  → Klasyfikacja ról + kompletność dokumentacji
  → Przedmiar / kosztorys (opcjonalny)
  → Gotowość wyceny (ilości LUB ceny)

AGENCYJNE ETAPY (wyniki + confidence)
  → Formalny · Zakres · Terminy · Finansowy · Ryzyka · Wycena · Rekomendacja

UI
  → Analysis Results Surface (expand / fullscreen)
  → KPI strip (6 wskaźników)
  → Decyzja STARTUJ / ANALIZUJ / ODPUŚĆ (istniejący overlay + Owner)
```

### 2.2 Nowy kontrakt danych (propozycja — DF zamrozi typy)

```ts
/** Propozycja — nie kod produkcyjny do czasu DF */
type DocClass =
  | "swz" | "opz" | "stwior" | "umowa" | "projekt" | "rysunki"
  | "przedmiar" | "kosztorys_inwestorski" | "kosztorys_ofertowy"
  | "referencje" | "formularze" | "oswiadczenia" | "pozostale";

type DocPresence = "present" | "absent" | "partial" | "unreadable";

interface DocumentationCompleteness {
  slots: Record<DocClass, { presence: DocPresence; confidence: number; sources: string[] }>;
  score: number; // 0–100
  pricingFeasibility: "ready" | "partial" | "blocked";
  /** true gdy przedmiar z ilościami LUB kosztorys z cenami LUB ATH z rowCount */
  canPrepareValuation: boolean;
}

type AnalysisAgentId =
  | "documents"
  | "formal"
  | "scope"
  | "deadlines"
  | "finance"
  | "risks"
  | "valuation"
  | "recommendation";

interface AnalysisStageResult {
  id: AnalysisAgentId;
  status: "idle" | "running" | "done" | "skipped" | "failed";
  confidence: "low" | "medium" | "high";
  summaryPl: string;
  findings: string[]; // max N
  blockers: string[];
  updatedAt?: string;
}

interface TenderAnalysisBundleV2 {
  documentation: DocumentationCompleteness;
  stages: AnalysisStageResult[];
  indicators: {
    docCompleteness: number;
    formalCompleteness: number;
    technicalCompleteness: number;
    valuationReadiness: number;
    riskLevel: "low" | "medium" | "high";
    aiConfidence: "low" | "medium" | "high";
  };
  fingerprint: string; // do auto re-run
}
```

### 2.3 Mapowanie agentów → istniejący kod (REUSE)

| Agent | Źródło as-is (reuse) | Nowy deliverable |
|-------|----------------------|------------------|
| **Dokumenty** | discovery + `classifyDocumentRole` + summary | `DocumentationCompleteness` |
| **Formalny** | SWZ analysis · participation · fit | stage result + formal score |
| **Zakres robót** | PDF przedmiar rows · OPZ/STWiOR text signals | branże/sekcje + rowCount |
| **Terminy** | SWZ dates · overlay O1 | stage + risk feed |
| **Finansowy** | wadium · wartość · bid proposal | stage (bez wymogu kosztorysu) |
| **Ryzyka** | trust + overlay blockers | stage |
| **Wycena** | pricing auto + catalog | stage; gate = `canPrepareValuation` |
| **Rekomendacja** | `computeTenderDecision` + overlay | stage + confidence z bundle |

**Implementacja agentów w P0–P1:** pure lib aggregators + UX — **nie** osobne procesy Edge/LLM.

### 2.4 Semantyka kosztorysu / przedmiaru (target)

| Stan | Znaczenie UI | Trust | Pricing |
|------|--------------|-------|---------|
| Kosztorys z cenami | ✅ Kosztorys inwestorski | ok | auto OK |
| Przedmiar z ilościami (bez cen) | ✅ Przedmiar · ❌ Kosztorys (nie dostarczono) | **info/warn**, nie error blocked | **auto OK** (wycena własna) |
| Brak przedmiaru i kosztorysu | ❌ Brak materiału ilościowego | warn/blocked wyceny | blocked |
| PDF skan bez tekstu | ⚠️ Nieczytelny przedmiar | warn + OCR hint | blocked do ręcznego / OCR |
| Błąd unpack 7Z | błąd techniczny (osobny) | error tech | n/a |

**Zakaz copy:** „Nie znaleziono kosztorysu” jako primary failure.  
**Zastąp:** kompletność slotów + „Możliwość przygotowania wyceny: TAK/NIE”.

### 2.5 Auto-analiza (target)

```text
ON ENTER / ON DOCS FINGERPRINT CHANGE
  if !analysisFresh(fingerprint) → run pipeline (istniejący bootstrap + heavy)
  show Analysis Results Surface (progress + stages)

MANUAL
  Button label: "Uruchom ponownie analizę"
  = force re-run (nonce++) — recovery / po uploadzie
```

---

## 3. Backlog EPIC-ów (podział P0 / P1 / P2)

### P0 — Semantyka + kompletność + copy (odblokowuje wartość biznesową)

| ID | Slice | Cel | Allowlist (orientacyjny) | OUT |
|----|-------|-----|--------------------------|-----|
| **AP2-S0** | Semantyka wyceny z przedmiaru | SSOT `canPrepareValuation` · Trust nie-error przy przedmiarze · copy E10/data-ssot | lib: data-ssot, trust, kosztorys-process-phase, analysis-status, readiness; copy owner-language | parser rewrite · UI fullscreen |
| **AP2-S1** | Documentation Completeness v1 | Rozszerzenie ról + summary slotów (SWZ/OPZ/Umowa/Przedmiar/Kosztorys/…) + „wycena TAK” | document-role, documents-tab-summary, DocumentsSummaryHeader | LLM · OCR |
| **AP2-S2** | Re-run copy + hint cleanup | „Uruchom ponownie analizę” · usuń legacy „Otwórz Dokumenty…” | tender-owner-language-pl, analysis-status-ux, OperatorActionBar | fingerprint redesign |

### P1 — Produktywizacja przedmiaru + stage contract + wskaźniki

| ID | Slice | Cel | OUT |
|----|-------|-----|-----|
| **AP2-S3** | Przedmiar insights (KNR/jm/ilości/sekcje) w hubie | Feed z `pdf-przedmiar-heuristic` → stage „scope” + UI sekcja | OCR |
| **AP2-S4** | `TenderAnalysisBundleV2` + 8 stage results | Aggregator lib + testy; Autonomous czyta stages | nowy Edge agent |
| **AP2-S5** | KPI strip 6 wskaźników | Command Layer / hub — TEUX | zmiana scoringu portfolio |
| **AP2-S6** | Pricing gate na `canPrepareValuation` | Włączenie auto-wyceny przy FOUND_NO_VALUE / przedmiar rows | zmiana kalkulatora CORE |

### P2 — Surface wyników + UX polish + deep classify

| ID | Slice | Cel | OUT |
|----|-------|-----|-----|
| **AP2-S7** | Analysis Results Surface | Wyższy panel · expand · collapse sekcji · nav | Wg* |
| **AP2-S8** | Fullscreen analysis mode | Z workspace (nie tylko Gate) | nowe routing CORE |
| **AP2-S9** | Content-based classification | Sygnały z treści PDF/DOCX dla ról | OCR full |
| **AP2-S10** | UX journey simplify | Redukcja 4 modeli postępu → 1 strip + surface | re-open Foundation |
| **AP2-S11** | Autonomous ↔ BundleV2 parity | Timeline = stage ids; partial exit z completeness | LLM |

### Priorytet rekomendowany Ownerowi

```text
1) AP2-S0  ← start po GO (RC-1)
2) AP2-S1
3) AP2-S2
4) AP2-S4 (kontrakt) → S5 → S3 → S6
5) AP2-S7 / S8 (UI) gdy semantyka stabilna
```

---

## 4. Propozycja zmian UI

### 4.1 Analysis Results Surface (target)

```text
┌─────────────────────────────────────────────────────────────┐
│ Analiza przetargu                    [Rozwiń] [Pełny ekran] │
│ ●●●●○○  pewność AI: średnia · ryzyko: średnie               │
├──────────────┬──────────────────────────────────────────────┤
│ SEKCJE       │  TREŚĆ SEKCJI (scroll wewnętrzny)            │
│ • Dokumenty  │  Kompletność:                                │
│ • Formalne   │   ✅ SWZ  ✅ OPZ  ✅ Umowa  ✅ Przedmiar      │
│ • Zakres     │   ❌ Kosztorys inwestorski (nie dostarczono)  │
│ • Terminy    │                                              │
│ • Finanse    │  Możliwość przygotowania wyceny: ✅ TAK      │
│ • Ryzyka     │                                              │
│ • Wycena     │  … findings …                                │
│ • Werdykt    │                                              │
└──────────────┴──────────────────────────────────────────────┘
 KPI: Kompl. dok. | Formalna | Techniczna | Wycena | Ryzyko | AI
```

**Wymagania briefu → mapowanie:**

| Wymaganie | Realizacja |
|-----------|------------|
| Znacznie większa wysokość | Surface min ~50–70vh desktop; mobile sheet |
| Rozszerzenie | Toggle expand (token TEUX) |
| Fullscreen | Overlay TEUX (reuse wzorca Autonomous / modal frame TEUX) |
| Mniej przewijania strony | Scroll **wewnątrz** surface; hub mniej accordionów |
| Czytelność | Typografia TEUX_FONT_* · mniej 9px |
| Nawigacja sekcji | Lista sekcji = `AnalysisStageResult.id` |
| Zwijanie bloków | Collapse per stage |

### 4.2 KPI strip (6)

| KPI | Źródło |
|-----|--------|
| Kompletność dokumentacji | `documentation.score` |
| Kompletność formalna | agent formal |
| Kompletność techniczna | agent scope + przedmiar |
| Gotowość do wyceny | `canPrepareValuation` → 0/50/100 |
| Poziom ryzyka | trust + overlay blockers |
| Pewność AI | min/agg stage confidences |

### 4.3 Operator / CTA

| As-is | Target |
|-------|--------|
| „Przeanalizuj dokumenty” | **„Uruchom ponownie analizę”** |
| Primary CTA P* | Bez zmian logiki P1–P12 w S0; późniejszy slice może dodać „Przejrzyj analizę” → scroll do Surface |
| Autonomous Gate | Zostaje; outcome pokazuje kompletność + wycena TAK/NIE |

### 4.4 Design system

- **TEUX** exclusively (`tender-ux-tokens`, `TenderUx*`).
- Nie wprowadzać kart Wg* do detalu.
- Trust components reuse (`TrustBanner` / chips) z nowymi severity (info zamiast error dla „brak kosztorysu”).

---

## 5. Plan implementacji etapami (Thin Slice Workflow)

```text
Dla KAŻDEGO slice AP2-S*:
  AUDIT (delta) → RCA (jeśli regresja) → PLAN/DF → Arch Review
  → Owner GO → IMPLEMENT (allowlist) → BUILD → TEST
  → COMMIT (na prośbę) → PUSH (na prośbę) → PV (version.json raz)
  → CLOSE → dopiero następny slice
```

### 5.1 AP2-S0 — Design Freeze outline (do zamrożenia po GO)

**IN**

- SSOT helper `canPrepareValuation(item)` (przedmiar rows / FOUND_NO_VALUE / FOUND_WITH_VALUE).
- Trust: `kosztorys_not_found` → nie `error/blocked` gdy przedmiar obecny; nowy reason `kosztorys_not_provided` (info).
- Copy: E10 + `resolvedCostStatus` display + Guide FAQ 7Z (docs/copy only jeśli w allowlist).
- Pricing readiness: przygotowanie pod S6 (flag lub soft) — **domyślnie bez zmiany gate w S0** jeśli Owner chce maksymalnie cienko; **rekomendacja audytu:** S0 zmienia **prezentację**, S6 zmienia **gate**.

**OUT**

- Nowy parser · multi-agent UI · fullscreen · role enum pełny · Wg*.

**Testy**

- Unit: canPrepareValuation · trust severity · process phase label.
- Regresja: Gate B `--scope tenders` (gdy CORE-adjacent — tu FEATURE).
- Manual: przetarg z samym PDF przedmiarem → brak „błąd braku kosztorysu” jako primary.

**AC (propozycja)**

1. Przy samym przedmiarze z ilościami: UI mówi „Kosztorys nie dostarczono” + „Wycena możliwa: TAK”.
2. Przy braku przedmiaru i kosztorysu: „Wycena możliwa: NIE” (bez fałszywego sukcesu).
3. Zero zmian Payroll/sync.
4. ui-guard / tenders smoke bez regresji shell.

### 5.2 Szacunek kolejności (orientacyjny)

| Slice | Effort | Risk |
|-------|--------|------|
| S0 | S | M (trust consumers) |
| S1 | M | M |
| S2 | XS | L |
| S3 | M | M |
| S4 | L | M |
| S5 | S | L |
| S6 | M | **H** (pricing) |
| S7–S8 | L | M (UX) |
| S9 | L | H |
| S10–S11 | M | M |

---

## 6. Problemy → slice mapping

| Problem IDs | Slice |
|-------------|-------|
| P-A1…A6, RC-1 | **S0**, S6 |
| P-B1…B5, RC-2 | **S1**, S9 |
| P-C1…C4 | **S3**, S9 |
| P-D1…D2 | **S2** |
| P-D3…D6, RC-3 | **S4**, S11 |
| P-E* | S4, S5 (feed), overlay later |
| P-F*, RC-4 | **S7**, S8, S10 |
| P-G* | proces / DF discipline |

---

## 7. Kryteria sukcesu EPIC (Definition of Done — całość)

- [ ] Brak kosztorysu nie jest primary error gdy jest przedmiar
- [ ] Kompletność dokumentów czytelna (checklist + wycena TAK/NIE)
- [ ] Auto-analiza = default; ręczny = „Uruchom ponownie”
- [ ] Stage results z confidence widoczne w Surface
- [ ] 6 KPI na hubie
- [ ] Surface: wysokość / expand / fullscreen / nav / collapse
- [ ] Thin slices CLOSED z PV
- [ ] Protected Core GREEN · zero mixed CORE

---

## 8. Decyzje wymagane od Ownera (przed DF S0)

| # | Pytanie | Rekomendacja audytu |
|---|---------|---------------------|
| Q1 | Start od **AP2-S0**? | **TAK** |
| Q2 | S0 tylko prezentacja, gate pricing w **S6**? | **TAK** (niższy risk) |
| Q3 | Zostawić etykietę **ODPUŚĆ** (nie ODRZUĆ)? | **TAK** |
| Q4 | Autonomous Gate zostaje jako first-run? | **TAK** (parity w S11) |
| Q5 | Czy odpalać EPIC mimo STABILIZATION WINDOW? | Wymaga **jawnego Owner GO** |

---

## 9. Linki

| | |
|--|--|
| AUDIT + RCA | [`WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md`](WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md) |
| Entry | [`docs/AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) |
| Master | [`docs/AI/MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md) |
| Kosztorys phase handoff | [`docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md`](../SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md) |
| NG-10 DF | [`docs/architecture/NG-10-DESIGN-FREEZE.md`](NG-10-DESIGN-FREEZE.md) |

---

**PLAN DRAFT** · czekaj na Owner ACK + odpowiedzi Q1–Q5 · potem DF AP2-S0
