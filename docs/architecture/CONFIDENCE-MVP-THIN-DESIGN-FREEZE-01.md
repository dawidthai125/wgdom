# CONFIDENCE-MVP — THIN DESIGN FREEZE 01

> **ID:** CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01  
> **STATUS:** **THIN DESIGN FREEZE · FROZEN** (oczekuje Owner GO IMPLEMENT)  
> **MODE:** DESIGN ONLY · **NO IMPLEMENTATION**  
> **Data:** 2026-07-31  
> **Parent:** [`AI-ARCHITECTURE-V2-DESIGN-FREEZE.md`](AI-ARCHITECTURE-V2-DESIGN-FREEZE.md)  
> **Selection:** [`AI-V2-P0-SELECTION-01.md`](AI-V2-P0-SELECTION-01.md) · Readiness [`AI-V2-IMPLEMENTATION-READINESS-01.md`](AI-V2-IMPLEMENTATION-READINESS-01.md)  
> **Audit:** [`CONFIDENCE-ENGINE-AUDIT-01.md`](CONFIDENCE-ENGINE-AUDIT-01.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Po zatwierdzeniu Ownera:** **jedyna** podstawa IMPLEMENT Confidence MVP

```text
════════════════════════════════════════════════════════
THIN DESIGN FREEZE — Confidence MVP (AI v2 P0 first)

Architektura AI v2 = NIE ZMIENIAĆ.
Zakres = minimalny semafor wiarygodności analizy (RO).
Zero wpływu na AI-COST · Bid · SMART · History · Scope Gap.
formulaVersion = "confidence-mvp-1"
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

## 1. Cel MVP (jedno zdanie)

Użytkownik widzi **Pewność analizy** (0–100 + band + drivers) przy koszyku AI-COST/Oferty — **bez** zmiany wyceny i oferty.

---

## 2. Minimalny zakres MVP (IN / OUT)

### 2.1 IN (allowlist funkcjonalny)

| # | Element |
|---|---------|
| 1 | Pure lib: `buildConfidenceReport(input) → ConfidenceReport` |
| 2 | Typy: `ConfidenceReport`, `ConfidenceBand`, `ConfidenceDriver`, `ConfidenceBadgeModel` |
| 3 | UI: `ConfidenceBadge` (+ rozwijane `ConfidenceDrivers`) w panelu Kosztorys / Oferta |
| 4 | Wire: odczyt metryk z już zbudowanego OfferBoq + SMART detect + S7 + Bid (call-only) |
| 5 | Flaga LS: `kw-confidence-mvp` — **default OFF** (opt-in; parity tip gdy OFF) |
| 6 | Unit test + krótki smoke/OV checklist |
| 7 | Changelog UI + bump wersji **tylko** gdy flaga może być ON dla użytkownika / lub wpis „flaga OFF” wg praktyki repo |

### 2.2 OUT (zakaz)

| # | Zakaz |
|---|-------|
| 1 | Mutacja OfferBoq / komponentów / cen |
| 2 | Mutacja / przeliczenie Bid / `recommendedBidPln` |
| 3 | Zmiany SMART Detect / Quotes / MS / Library / Alias |
| 4 | History Engine · Scope Gap (nawet jako opcjonalne wejścia w MVP) |
| 5 | Blokada CTA oferty przy `low` |
| 6 | Explainability MACRO panel |
| 7 | Persist score do KV / cloud |
| 8 | Zmiana wzoru S7 `qualityScore` |
| 9 | Zmiana AI-ARCHITECTURE-V2 pipeline / guardrails |
| 10 | Payroll / `cloud-sync.ts` / Edge |

### 2.3 Allowlist plików (propozycja IMPL — do respektowania w GO)

| Plik | Rola |
|------|------|
| `src/lib/confidence-engine/types.ts` | **NOWY** — typy MVP |
| `src/lib/confidence-engine/build-confidence-report.ts` | **NOWY** — pure builder |
| `src/lib/confidence-engine/index.ts` | **NOWY** — re-export |
| `src/app/confidence/ConfidenceBadge.tsx` | **NOWY** — UI badge + drivers |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | **THIN** — mount badge (obok KPI / oferty), wire flagi |
| `scripts/test-confidence-mvp.mjs` | **NOWY** — unit |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | Wpis wersji |
| Docs tip / DF closeout | Po release (osobno) |

**Zakaz:** edycja `tenders-bid-calculator.ts`, `tender-offer-boq-pricing-engine.ts`, `smart-pricing/detect.ts`, mapping CC-01.

---

## 3. Interfejs wejściowy (FROZEN)

```ts
/** Confidence MVP — tylko odczyt; brak History/Scope. */
interface ConfidenceMvpInput {
  /** Wymagane do score; brak → fail-soft report unavailable */
  lineCount: number;
  mappedCount: number;
  /** Linie z priceOrigin.kind === controlled_market (jak TV-01) */
  quotesPricedCount: number;
  /** S7 — cytat, nie przeliczamy */
  s7QualityScore: number | null;
  /** averageConfidence OfferBoq → high=100, medium=60, low=25; null = pomiń czynnik */
  averagePricingConfidence: "high" | "medium" | "low" | null;
  /** SMART Detect — null = pomiń czynnik (renormalizacja) */
  smartMissingCount: number | null;
  smartMissingUnmappedCount: number | null;
  /** Bid */
  bidOk: boolean | null;
  bidWarningCount: number | null;
  /** Docs: true jeśli jest przedmiar/snapshot OK; SWZ osobno */
  hasKosztorysSnapshot: boolean;
  hasSwzSignal: boolean;
  computedAtIso: string;
}
```

**Źródła tip (REUSE call-only):**

| Pole | Skąd |
|------|------|
| line/mapped/quotes | pętla `OfferBoqDocument.lines` (jak TV-01) |
| s7QualityScore | `evaluateOfferBoqValidation(…).qualityScore` |
| averagePricingConfidence | adapter Bid payload / pricingStats / explain view |
| SMART | `detectMissingPrices(…)` summary |
| bidOk / warnings | `TenderBidProposal` |
| docs | `item.tenderDossier` — kosztorys ok + obecność swz |

---

## 4. Interfejs wyjściowy (FROZEN)

```ts
type ConfidenceBand = "low" | "medium" | "high";

interface ConfidenceDriver {
  id: string;
  labelPl: string;
  /** Udział w score po wadze, ze znakiem (ujemny = obniża) */
  impact: number;
  evidencePl: string;
}

interface ConfidenceReport {
  available: boolean;
  emptyReasonPl: string | null;
  score0to100: number;           // 0..100 integer
  band: ConfidenceBand;
  drivers: ConfidenceDriver[];   // top 3–5 po |impact|
  disclaimerPl: string;
  formulaVersion: "confidence-mvp-1";
  computedAt: string;
  /** Debug / OV — nie musi być w UI */
  factorsUsed: string[];
}
```

Stały disclaimer:

```text
Ocena wiarygodności całej analizy — nie zmienia wyceny ani oferty.
To nie jest „AI Quality Score” gotowości kosztorysu (S7).
```

---

## 5. ConfidenceReport — wzór MVP (FROZEN)

### 5.1 Wagi MVP (tylko czynniki tip; suma 100)

| Czynnik `id` | Waga | Score czynnika 0–100 |
|--------------|-----:|----------------------|
| `quote_coverage` | **28** | `(quotesPricedCount / lineCount) * 100` |
| `mapping_coverage` | **22** | `(mappedCount / lineCount) * 100` |
| `s7_quality` | **18** | `s7QualityScore` (0–100); brak → **pomiń + renormalizuj** |
| `pricing_confidence` | **12** | high=100, medium=60, low=25; brak → pomiń |
| `smart_coverage` | **12** | `100 - (smartMissingCount/lineCount)*100`; brak SMART → pomiń |
| `docs` | **5** | hasKosztorys=60 + hasSwz=40 (max 100); brak kosztorysu → available=false |
| `bid_health` | **3** | bidOk===false → 0; ok + warnings≥2 → 50; ok → 100; null → pomiń |

**Anti double-count:** `smart_coverage` jest jedynym penaltym „braków SMART”; nie dodawać osobno unmapped poza `mapping_coverage`.

### 5.2 Agregacja

```text
Dla czynników obecnych (nie-null / nie-pomiń):
  score = round( sum(weight_i * factorScore_i) / sum(weights_present) )
band:
  high   ≥ 75
  medium ≥ 50
  low    < 50
```

### 5.3 Drivers

- Policz `impact_i = weight_i * (factorScore_i - 50) / sum(weights_present)` (przybliżenie kierunku).  
- Pokaż **top 5** po `|impact|`.  
- `labelPl` / `evidencePl` po polsku, np. „Quotes: 67% linii (−)”.

---

## 6. ConfidenceBadge (FROZEN UX)

| Element | Spec |
|---------|------|
| Etykieta | **Pewność analizy** |
| Wartość | `{score}/100` |
| Band | Wysoka / Średnia / Niska (kolor: green / amber / red — REUSE tokenów tip jeśli istnieją) |
| Pozycja | `OfferBoqCostIntelligencePanel` — w strefie summary **obok** „AI Quality Score” (S7), **nie zamiast**; widoczne też gdy oferta dostępna |
| Expand | Klik / accordion → `ConfidenceDrivers` |
| Flaga OFF | Komponent **nie renderuje się** (pełna parity tip) |
| Low band | Tylko wizualne ostrzeżenie — **bez** disable CTA |

---

## 7. ConfidenceDrivers (FROZEN UX)

| Element | Spec |
|---------|------|
| Lista | 3–5 pozycji: label + krótki evidence |
| Znak | Prefiks lub kolor: (+) / (−) wg znaku impact |
| Linki | MVP: **brak** deep-link (OUT); P1+ |
| Stopka | `disclaimerPl` + `formulaVersion` małą czcionką (opcjonalnie tylko w expand) |

---

## 8. Fail-soft (FROZEN)

| Warunek | Zachowanie |
|---------|------------|
| Flaga OFF | Brak UI · brak wywołania wymagającego (opc. nie buduj report) |
| `lineCount < 1` | `available: false`, emptyReason: brak pozycji |
| Brak S7 / SMART / Bid / pricing confidence | Pomiń czynnik, **renormalizuj** wagi obecnych |
| History / Scope nieistniejące | **Ignoruj** (MVP nie czyta) |
| Błąd w builderze | `available: false` + powód; UI ukryj lub „niedostępne” — **nie** psuj panelu AI-COST |
| SMART missing = 100% unmapped | Score spada via mapping + smart — OK |

---

## 9. Brak wpływu (FROZEN — potwierdzenie)

| Moduł | Wpływ MVP |
|-------|-----------|
| **AI-COST** | Brak — tylko odczyt dokumentu / S7 |
| **Bid** | Brak — tylko odczyt `ok` / warnings |
| **SMART** | Brak — tylko odczyt Detect summary |
| **History** | Brak — nie wywoływane |
| **Scope Gap** | Brak — nie wywoływane |

Invariant testowy: `recommendedBidPln` przed = po zbudowaniu ConfidenceReport.

---

## 10. Definition of Ready (DoR)

Przed startem IMPLEMENT:

- [ ] Owner **zaakceptował** ten Thin DF  
- [ ] Owner GO IMPLEMENT (jawne)  
- [ ] Gate G1–G9 ALL-NIE potwierdzone w raporcie IMPL  
- [ ] Allowlist plików bez Shared CORE  
- [ ] Brak otwartego konfliktu z innym release bundle  

---

## 11. Definition of Done (DoD)

- [ ] `buildConfidenceReport` + typy w allowlist  
- [ ] Unit test PASS (`test-confidence-mvp.mjs`)  
- [ ] UI badge + drivers za flagą `kw-confidence-mvp`  
- [ ] Default flaga **OFF** · OFF = parity tip  
- [ ] Brak zmian Bid/pricing/SMART detect/mapping engines  
- [ ] `npm run build` PASS  
- [ ] Changelog zgodnie z widocznością  
- [ ] Raport IMPLEMENT z blokiem BUILD/TEST/GIT/RELEASE (wg rules)  
- [ ] **Bez commit/push** aż Owner poleci  

---

## 12. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| AC-01 | Przy fladze OFF UI Confidence nie występuje |
| AC-02 | Przy fladze ON i OfferBoq z liniami: badge pokazuje score 0–100 i band |
| AC-03 | Expand pokazuje ≥3 drivers z evidence PL |
| AC-04 | Disclaimer widoczny (badge title/tooltip lub expand) |
| AC-05 | Score **nie** zmienia `recommendedBidPln` / OfferBoq totals |
| AC-06 | Tender wysoki Quotes (≥95%) ma score **wyższy** niż tender z Quotes ≤70% (fixture/unit) |
| AC-07 | Brak SMART w input → report nadal `available` (renormalizacja) |
| AC-08 | Copy nie myli z „AI Quality Score” S7 |
| AC-09 | Zero zapisów do KV confidence |

---

## 13. Test Plan

| # | Test | Oczekiwanie |
|---|------|-------------|
| T1 | Unit: fixture high quotes/mapped → band high lub medium-high | PASS |
| T2 | Unit: fixture low mapping → score < high fixture | PASS |
| T3 | Unit: omit s7 → available true, factorsWithout s7 | PASS |
| T4 | Unit: lineCount 0 → available false | PASS |
| T5 | Unit: bidOk false → bid_health obniża / driver (−) | PASS |
| T6 | Build | PASS |
| T7 | OV ręczny: flaga ON na 1 przetargu tip/preview | Badge widoczny |
| T8 | OV: flaga OFF | Brak badge |
| T9 | Regresja: Bid PLN niezmieniony (porównanie przed/po w OV) | PASS |

**Poza MVP:** E2E Playwright — nie wymagane (thin A/B).

---

## 14. Rollback Plan

| Poziom | Akcja |
|--------|-------|
| **Natychmiast (ops)** | `localStorage.removeItem('kw-confidence-mvp')` lub `= '0'` → UI znika |
| **Kod** | Revert commitów allowlist; flaga default OFF chroni tip przed GO ON |
| **Dane** | Brak migracji / brak KV — rollback danych N/A |

---

## 15. Miejsce w pipeline AI v2 (bez zmiany architektury)

```text
… → AI-COST → Bid → S7 → SMART
         ↓ (odczyt)
   Confidence MVP (ten slice)
         ↓
   UI Badge  (Scope/History/Explain = jeszcze nie)
```

---

## 16. Status Freeze

```text
CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01 = FROZEN
IMPLEMENT = BLOCKED do Owner GO
Zmiana zakresu = amend DF + ponowne GO
```

**DESIGN ONLY · NO IMPLEMENTATION · 2026-07-31**
