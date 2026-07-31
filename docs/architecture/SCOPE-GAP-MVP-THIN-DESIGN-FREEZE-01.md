# SCOPE-GAP-MVP — THIN DESIGN FREEZE 01

> **ID:** SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01  
> **STATUS:** **THIN DESIGN FREEZE · FROZEN** (oczekuje Owner GO IMPLEMENT)  
> **MODE:** DESIGN ONLY · **NO IMPLEMENTATION**  
> **Data:** 2026-07-31  
> **Parent:** [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md)  
> **Planning:** [`AI-V2-P0-NEXT-PLANNING-01.md`](AI-V2-P0-NEXT-PLANNING-01.md) · Selection [`AI-V2-P0-SELECTION-01.md`](AI-V2-P0-SELECTION-01.md)  
> **Audit:** [`SCOPE-GAP-ENGINE-AUDIT-01.md`](SCOPE-GAP-ENGINE-AUDIT-01.md)  
> **Wzorzec RO:** [`CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.md`](CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.md) · Confidence **FULLY CLOSED**  
> **Tip:** live **2.65.92** / `00a5d873` · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Po zatwierdzeniu Ownera:** **jedyna** podstawa IMPLEMENT Scope Gap MVP

```text
════════════════════════════════════════════════════════
THIN DESIGN FREEZE — Scope Gap Engine MVP (AI v2 P0.2)

Architektura AI v2 = NIE ZMIENIAĆ.
Zakres = ostrzeżenia luk zakresu (expected − present) · RO.
Zero wpływu na AI-COST · Bid · Quotes · SMART Detect · OfferBoq.
engineVersion = "scope-gap-mvp-1"
History peers = OUT w MVP (P1).
Feature flag: kw-scope-gap-mvp · default OFF
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1–G9: ALL-NIE (FEATURE UI/lib RO · brak Payroll / cloud-sync CORE)
Owner GO CORE: NIE
Owner GO IMPLEMENT: wymagany po akceptacji tego DF
Klasa: FEATURE / TEUX
```

---

## 1. Odpowiedzialność modułu (SRP)

**Jedno pytanie:** *Czego prawdopodobnie brakuje w zakresie robót względem typowego / oczekiwanego zestawu dla tego typu inwestycji?*

| Moduł | Pytanie | Write? |
|-------|---------|--------|
| **AI-COST** | Ile kosztują pozycje **obecne**? | Tak |
| **SMART** | Które linie bez useful Quotes? | Nie (Detect) |
| **Bid** | Jaka oferta? | Tak (SSOT) |
| **Confidence** (CLOSED) | Na ile ufać całej analizie? | Nie |
| **History** (P1) | Jak wyglądały podobne realizacje? | Nie |
| **Scope Gap MVP** | **Czego brakuje w zakresie?** | **Nie** |

```text
Scope Gap ≠ SMART
  SMART: „ta linia nie ma ceny Quotes”
  Scope: „w tym typie robót zwykle jest wywóz — a w przedmiarze go nie widać”

Scope Gap ≠ AI-COST / Bid
  Scope: ostrzeżenie dla człowieka
  AI-COST/Bid: liczby oferty — nietknięte

Scope Gap ≠ Confidence
  Confidence: semafor wiarygodności
  Scope: lista luk zakresu (osobny UI)
```

**Stała zasada produktu (FROZEN):**

- **nie** modyfikuje Bid / `recommendedBidPln`  
- **nie** modyfikuje AI-COST / OfferBoq / komponentów  
- **nie** zapisuje danych (KV / cloud / Quotes / Library)  
- **jedynie** wykrywa potencjalne luki zakresowe i **prezentuje** je użytkownikowi  

---

## 2. Minimalny zakres MVP (IN / OUT)

### 2.1 IN (allowlist funkcjonalny)

| # | Element |
|---|---------|
| 1 | Pure lib: `buildScopeGapReport(input) → ScopeGapReport` |
| 2 | Typy: `ScopeGapReport`, `ScopeGapWarning`, `ScopeGapSeverity`, `ScopeGapRuleCode` |
| 3 | Pack reguł MVP: **`scope-gap-mvp-1`** — mały allowlist kodów (patrz §5) |
| 4 | Mechanizm: `expectedSet(template) − presentSet(text blob)` → warnings |
| 5 | UI: panel / lista **„Luki zakresu”** (RO) w Kosztorys / workspace — obok, **nie zamiast** SMART |
| 6 | Flaga LS: **`kw-scope-gap-mvp`** — **default OFF** |
| 7 | Unit test + OV checklist |
| 8 | Changelog (flaga OFF / opt-in) wg praktyki repo |

### 2.2 OUT (zakaz)

| # | Zakaz |
|---|-------|
| 1 | Auto-insert / patch pozycji OfferBoq lub przedmiaru |
| 2 | Mutacja / przeliczenie Bid / AI-COST / Quotes / Library / Alias |
| 3 | Zmiany `smart-pricing/detect.ts` (tylko **odczyt** summary jako filtr anti-dup) |
| 4 | **History Engine peers** jako wejście MVP (P1) |
| 5 | Wpływ na Confidence formula (Confidence CLOSED; Scope nie merge) |
| 6 | Blokada CTA oferty przy ostrzeżeniach |
| 7 | Persist warnings do KV / cloud |
| 8 | Fuzzy matching / nowe silniki mapowania |
| 9 | Zmiana AI-ARCHITECTURE-V2 pipeline / guardrails |
| 10 | Payroll / `cloud-sync.ts` / Edge |
| 11 | Naprawa residual CI TEUX6 / jobs-mobile w tym slice |

### 2.3 Allowlist plików (propozycja IMPL)

| Plik | Rola |
|------|------|
| `src/lib/scope-gap/types.ts` | **NOWY** |
| `src/lib/scope-gap/rules-mvp-1.ts` | **NOWY** — expected packs + keyword present |
| `src/lib/scope-gap/build-scope-gap-report.ts` | **NOWY** — pure builder |
| `src/lib/scope-gap/flag.ts` | **NOWY** — `kw-scope-gap-mvp` |
| `src/lib/scope-gap/index.ts` | **NOWY** |
| `src/app/scope-gap/ScopeGapWarningsPanel.tsx` | **NOWY** — UI RO |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` **lub** thin mount w workspace Kosztorys | **THIN** — wire flagi + panel |
| `scripts/test-scope-gap-mvp.mjs` | **NOWY** |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | Wpis wersji |

**Zakaz edycji:** `tenders-bid-calculator.ts`, `tender-offer-boq-pricing-engine.ts`, `smart-pricing/detect.ts`, mapping CC-01, `cloud-sync.ts`, Confidence formula (`confidence-mvp-1`).

---

## 3. Interfejs wejściowy (FROZEN)

```ts
/** Scope Gap MVP — tylko odczyt; History peers OUT. */
type ScopeGapInvestmentTemplate =
  | "pustostan_remont"
  | "elewacja"
  | "instalacje"
  | "generic_unknown";

interface ScopeGapMvpInput {
  /** Blob obecności: opisy linii OfferBoq (+ opc. tytuł przetargu). */
  presentTextBlob: string;
  /** Szablon expected — z heurystyki tip (tytuł / buyer / work-scope), nie z History. */
  investmentTemplate: ScopeGapInvestmentTemplate;
  /** false → fail-soft: available=false lub warnings=[] wg §8 */
  hasOfferBoqLines: boolean;
  lineCount: number;
  /** Opcjonalnie: synonimy / hit z SWZ (już znormalizowany tekst) — null = pomiń warstwę SWZ */
  swzTextBlob: string | null;
  /**
   * Anti-dup ze SMART: kody/powody Detect — Scope NIE emituje warningów
   * które są tylko „brak Quotes / unmapped”. Null = brak filtra.
   */
  smartMissingLineIds: string[] | null;
  computedAtIso: string;
}
```

**Źródła tip (REUSE call-only):**

| Pole | Skąd |
|------|------|
| `presentTextBlob` | Join `OfferBoqDocument.lines[].description` (+ tytuł item) |
| `investmentTemplate` | Heurystyka RO z tytułu / `priorityBuyer` / work-scope groups (deterministyczna tabela w `rules-mvp-1`) |
| `hasOfferBoqLines` / `lineCount` | OfferBoq |
| `swzTextBlob` | Opcjonalnie `swzAnalysis` / brief text — bez nowego parsera |
| `smartMissingLineIds` | `detectMissingPrices` summary (tylko ID linii missing) — **nie** zmienia Detect |

**History Engine:** **nie czytany** w MVP.

---

## 4. Interfejs wyjściowy (FROZEN)

```ts
type ScopeGapSeverity = "info" | "warn" | "high";

type ScopeGapRuleCode =
  | "WASTE_DISPOSAL"
  | "PREP_WORKS"
  | "PROTECTION"
  | "MEASUREMENTS"
  | "SCAFFOLDING"
  | "TRAFFIC_ORG";

interface ScopeGapWarning {
  id: string;                 // scope_gap:{code}
  code: ScopeGapRuleCode;
  labelPl: string;
  severity: ScopeGapSeverity;
  confidence: number;         // 0..1
  rationalePl: string;
  evidencePresentPl: string;  // co uznano za obecne / brak
  sources: Array<"rule" | "swz">;
}

interface ScopeGapReport {
  available: boolean;
  emptyReasonPl: string | null;
  engineVersion: "scope-gap-mvp-1";
  investmentTemplate: ScopeGapInvestmentTemplate;
  warnings: ScopeGapWarning[];   // posortowane: high → warn → info; cap 8
  disclaimerPl: string;
  computedAt: string;
}
```

Stały disclaimer:

```text
Ostrzeżenia luk zakresu — nie zmieniają wyceny ani oferty.
To nie jest SMART (brak Quotes) ani AI Quality Score (S7).
```

**Nigdy w output:** nowe linie OfferBoq, kwoty PLN, `catalogWorkId` do auto-bind, rekomendacja Bid.

---

## 5. Reguły MVP (`scope-gap-mvp-1`) — FROZEN allowlist

### 5.1 Pack expected (minimalny)

| Template | Expected codes (MVP) |
|----------|----------------------|
| `pustostan_remont` | WASTE_DISPOSAL · PREP_WORKS · PROTECTION · MEASUREMENTS |
| `elewacja` | SCAFFOLDING · PROTECTION · WASTE_DISPOSAL · TRAFFIC_ORG |
| `instalacje` | MEASUREMENTS · PREP_WORKS |
| `generic_unknown` | **tylko** WASTE_DISPOSAL **jeśli** present hint demol/rozbiór (inaczej warnings=[]) |

### 5.2 Present detection (deterministyczne keywords PL)

Każdy `code` ma listę tokenów (case-insensitive, substring po normalizacji whitespace).  
Przykłady (IMPL może doprecyzować w `rules-mvp-1.ts`, **bez** nowych kodów poza §5):

| Code | Przykładowe tokeny present |
|------|----------------------------|
| WASTE_DISPOSAL | wywóz, gruz, kontener, utylizacja, odpad |
| PREP_WORKS | przygotowaw, rozebranie, demonta, skucie |
| PROTECTION | zabezpiecz, folia, osłona, bariera |
| MEASUREMENTS | pomiar, RCD, protokół pomiar |
| SCAFFOLDING | rusztowan |
| TRAFFIC_ORG | organizacja ruchu, zajęcie pasa, oznakowanie drogow |

### 5.3 Emisja warning

```text
Dla każdego code ∈ expected(template):
  jeśli !present(code, presentTextBlob ∪ swzTextBlob?):
    emit warning (severity z §5.4)
  Cap: max 8 warnings.
```

### 5.4 Severity / confidence (MVP)

| Warunek | severity | confidence |
|---------|----------|------------|
| Brak w przedmiarze + expected + (opc.) brak w SWZ | `warn` | 0.55 |
| Brak w przedmiarze + expected + SWZ też sugeruje potrzebę (hit expected w SWZ, brak present w ATH) | `high` | 0.75 |
| `generic_unknown` + demol hint + brak wywozu | `warn` | 0.45 |
| Domyślnie nie używać `high` bez drugiego źródła (SWZ) | — | — |

### 5.5 Anti-duplikacja ze SMART

- Scope Gap **nie** emituje ostrzeżeń typu „brak ceny” / „unmapped”.  
- `smartMissingLineIds` służy wyłącznie do **nie** sugerowania „dodaj linię” i do copy (opc.): nie łączyć z Detect bannerem.  
- Osobna etykieta UI: **„Luki zakresu”** ≠ banner SMART.

---

## 6. Interfejs z AI-COST · SMART · History

| System | Kierunek | Kontrakt MVP |
|--------|----------|--------------|
| **AI-COST / OfferBoq** | Scope **czyta** lines / opisy | Zero write · zero pricing |
| **Bid** | **Brak** zależności (nie czytać `recommendedBidPln` do logiki) | Zero write |
| **SMART Detect** | Scope **czyta** opcjonalnie missing IDs | Zero change Detect |
| **S7 / Confidence** | **Brak** sprzężenia w MVP | Osobne UI |
| **History Engine** | **OUT** | P1 dopiero |

```text
Pipeline (bez zmiany Architecture DF):

Documents → AI-COST → Bid → S7 → SMART
                              ↓ read
                     Scope Gap MVP (ten DF)
                              ↓
                     UI „Luki zakresu” (flag)
                     Confidence (już tip; niezależny)
```

Architecture DF: History **przed** Scope gdy obie aktywne — w MVP History absent → Scope na regułach (**legalne**).

---

## 7. UI (FROZEN UX)

| Element | Spec |
|---------|------|
| Tytuł | **Luki zakresu** |
| Pozycja | Panel Kosztorys / OfferBoq intelligence — **osobna sekcja**; nie zastępuje SMART ani Confidence |
| Lista | `labelPl` + `severity` + krótki `rationalePl` |
| Cap | ≤ 8 pozycji |
| Flaga OFF | Komponent **nie renderuje się** (parity tip) |
| Ostrzeżenia | Tylko wizualne — **bez** disable CTA oferty |
| Deep-link do LP | MVP: **opcjonalnie** OUT (jak Confidence P1+) — default brak |
| Stopka | `disclaimerPl` + `engineVersion` |

---

## 8. Feature flag (FROZEN)

| Pole | Wartość |
|------|---------|
| Klucz | **`kw-scope-gap-mvp`** |
| Default | **OFF** (`false`) |
| ON | `localStorage.setItem('kw-scope-gap-mvp','1')` |
| OFF / rollback | `'0'` / `removeItem` |
| Zachowanie OFF | Brak UI · brak wymogu budowania reportu (opc. skip) |

---

## 9. Fail-soft (FROZEN)

| Warunek | Zachowanie |
|---------|------------|
| Flaga OFF | Brak UI |
| `!hasOfferBoqLines` / `lineCount < 1` | `available: false` lub `warnings: []` + emptyReason; **nie** crash panelu AI-COST |
| `generic_unknown` bez demol hint | `warnings: []` · `available: true` |
| Brak SWZ | Reguły tylko z przedmiaru (severity `warn`) |
| Brak SMART summary | Ignoruj filtr anti-dup |
| History nieistniejący | **Ignoruj** (MVP nie czyta) |
| Exception w builderze | `available: false` + powód; UI „niedostępne” / ukryj — **nie** psuj wyceny |
| 0 luk | Pusta lista + krótki copy „Brak typowych ostrzeżeń zakresu (MVP)” |

---

## 10. Brak wpływu (FROZEN — potwierdzenie)

| Moduł | Wpływ MVP |
|-------|-----------|
| **AI-COST** | Brak — tylko odczyt opisów linii |
| **Bid** | Brak — zero odczytu do logiki / zero write |
| **SMART** | Brak — tylko opcjonalny odczyt missing IDs |
| **Quotes / Library** | Brak |
| **Confidence** | Brak zmian formula / UI Confidence |
| **History** | Brak wywołań |

Invariant testowy: `recommendedBidPln` przed = po `buildScopeGapReport`.

---

## 11. Definition of Ready (DoR)

- [ ] Owner **zaakceptował** ten Thin DF  
- [ ] Owner GO IMPLEMENT (jawne)  
- [ ] Gate G1–G9 ALL-NIE w raporcie IMPL  
- [ ] Allowlist plików bez Shared CORE  
- [ ] Residual TEUX6 / jobs-mobile **nie** w zakresie slice  

---

## 12. Definition of Done (DoD)

- [ ] `buildScopeGapReport` + `scope-gap-mvp-1` + typy  
- [ ] Unit test PASS (`test-scope-gap-mvp.mjs`)  
- [ ] UI za flagą `kw-scope-gap-mvp` default OFF  
- [ ] Brak zmian Bid / pricing / SMART detect / mapping / Confidence formula  
- [ ] `npm run build` PASS  
- [ ] Changelog  
- [ ] Raport IMPLEMENT (BUILD/TEST/GIT)  
- [ ] **Bez commit/push** aż Owner poleci  

---

## 13. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| AC-01 | Flaga OFF → brak UI Scope Gap |
| AC-02 | Flaga ON + pustostan blob bez „wywóz” → warning `WASTE_DISPOSAL` (gdy template pustostan) |
| AC-03 | Present „wywóz gruzu” → brak warning WASTE_DISPOSAL |
| AC-04 | Disclaimer widoczny (expand / stopka) |
| AC-05 | Score/Bid/`recommendedBidPln` / OfferBoq totals **bez zmian** |
| AC-06 | Copy nie myli ze SMART / S7 / Confidence |
| AC-07 | Cap ≤ 8 warnings |
| AC-08 | Zero zapisów KV scope-gap |
| AC-09 | `generic_unknown` bez demol → brak fałszywego packu pustostan |

---

## 14. Test Plan

| # | Test | Oczekiwanie |
|---|------|-------------|
| T1 | Unit: pustostan + brak wywozu → ≥1 warning WASTE | PASS |
| T2 | Unit: ten sam + token wywóz → 0 WASTE | PASS |
| T3 | Unit: lineCount 0 → fail-soft | PASS |
| T4 | Unit: Bid object immutable po builderze | PASS |
| T5 | Unit: engineVersion `scope-gap-mvp-1` | PASS |
| T6 | Flag default OFF | PASS |
| T7 | Build | PASS |
| T8 | OV: flaga ON na 1 przetargu z OfferBoq | Lista widoczna |
| T9 | OV: flaga OFF | Brak UI |

**Poza MVP:** E2E Playwright — nie wymagane (thin A/B).

---

## 15. Rollback Plan

| Poziom | Akcja |
|--------|-------|
| **Ops** | `localStorage` `kw-scope-gap-mvp` = `0` / remove |
| **Kod** | Revert allowlist; default OFF chroni tip |
| **Dane** | Brak migracji — N/A |

---

## 16. Status Freeze

```text
SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01 = FROZEN
IMPLEMENT = BLOCKED do Owner GO
Zmiana zakresu / nowych ScopeGapRuleCode = amend DF + ponowne GO
History peers / auto-insert = OUT (osobny DF)
```

**DESIGN ONLY · NO IMPLEMENTATION · 2026-07-31**
