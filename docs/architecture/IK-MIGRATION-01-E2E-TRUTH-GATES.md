# IK-MIGRATION-01 — E2E TRUTH GATES

> **ID:** `IK-MIGRATION-01-E2E-TRUTH-GATES`  
> **STATUS:** P0 FROZEN  
> **Parent:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **Data:** 2026-08-15

```text
DONE ≠ build ≠ tsc ≠ „komponent się renderuje” ≠ „event w UI”
DONE = REAL RUNTIME + EVIDENCE + REGRESSION + OWNER VERIFY
```

Każda faza P1–P10 **musi** przejść **Gate A** i **Gate B**. Brak jednego = **NO-GO**, stop epic.

---

## 1. GATE A — nie psuć WGDOM

Przed/po zmianie:

1. BEFORE SNAPSHOT (git SHA, `version.json` jeśli prod, flaga IK)
2. CHANGE (explicit files)
3. BUILD
4. TEST (harness fazy + istniejące relevant)
5. ROUTING `/przetargi/…/przetarg`
6. RUNTIME: DetailPage, Hub/V4, Kosztorys workspace, TendersContext
7. REGRESSION minimum (poniżej)
8. NG-10 dependency check: default `ikEntryEnabled=false` → Gate nadal działa (aż P10)
9. Dual Outcome / D / Offer PLN — **nie** zmienione przypadkiem
10. Payroll / cloud-sync — **zero** diff

### Regression minimum (każda faza)

| Powierzchnia | Dowód |
|--------------|--------|
| `/przetarg` | otwiera się, nie biały ekran |
| `TenderDetailPage` | tabs V4 |
| Hub | `TenderWorkflowHubPanel` |
| Kosztorys | `TenderKosztorysWorkspace` |
| F5 / Position Cost | gdy OfferBoq istnieje — cutover nadal liczy (nie NaN / nie silent 0) |
| Bid | `useTenderPricingAuto` / proposal kształt |
| PDF | `exportTenderBidPackagePdf` nadal wywoływalny (nie musi być nowy layout) |
| ATH | parse/preview quick-access |
| Mobile | first-screen scroll, touch, brak H-overflow |
| Existing tender flow | lista → detal |
| Existing pricing | C-MODE-1a: brak OfferBoq → GAP, nie companyPrice |

Psucie = **NO-GO**.

---

## 2. GATE B — IK naprawdę wykonał operację

Pytanie: **czy runtime wykonał X i mamy evidence?**  
Nie: czy UI napisało X?

| Kłamstwo NG-10 (zakazane w IK) | Prawda |
|--------------------------------|--------|
| `Bid.ok` ⇒ materiały wyliczone | F5 `materialsResolved` / SELL lub jawny GAP |
| `intelligenceCtx` ⇒ opłacalność | `marginPct` / Bid finance **lub** HOLD „brak marży” |
| 12 kroków done | każdy krok ma `sourceRef` |
| „Research” | HTTP count / candidate object / CURRENT reuse log |

### Minimalny target E2E (pełny system — nie P1)

```text
TENDER → DOCUMENTS → PRZEDMIAR(Y) → EXTRACT → VALIDATE
→ MASTER BOQ → CLASSIFICATION → LABOR → MATERIAL
→ POSITION COST → BID → RISK → CHIEF → EC → PDF
(+ ATH preview; ATH write = GAP AD-IK-M10)
```

P1 Gate B = **subset** (Document facts only). Nie twierdzić P1 = pełny E2E.

---

## 3. Per-faza Truth (Gate B)

| Faza | Musi wykazać (evidence) | NIE wystarczy |
|------|-------------------------|---------------|
| **P1** | IK host ON; EC z pipeline facts; OFF = NG-10; brak fałszywego costing | ładny chat |
| **P2** | lista dokumentów, cost docs, przedmiary, row counts, PARTIAL jeśli extraction nie full | „dokumenty znalezione” bez liczb |
| **P3** | per linia plane + identity status + HOLD COMPOUND/UNKNOWN | Gate zaimportowany, nieużyty |
| **P4** | `runChiefOrchestrator` result (tasks/blocked) bez zmiany Dual Outcome | dossier UI bez `enabled` |
| **P5** | CURRENT reuse 0 HTTP **lub** candidate + Accept → OUR RATE persist | sam scanGaps click leftover |
| **P6** | PM HIT reuse **lub** DIY oferta (produkt, cena, URL) → persist | „Wyliczam materiały” z Bid.ok |
| **P7** | F5 line → Bid; SUM dwells = package | nowy number w headerze bez shadow |
| **P8** | risk z overlay/Validation; decision z DW/overlay | Agent ryzyka NG-10 |
| **P9** | live `08def45d` Owner PASS | localhost only |
| **P10** | Gate A bez NG-10 wrapper; zero importów autonomous-run w app | usunięte pliki + czerwony test |

---

## 4. Procedura etapu

```text
BEFORE SNAPSHOT
→ CHANGE (allowlist files)
→ BUILD
→ TEST
→ ROUTING TEST
→ RUNTIME TEST
→ REGRESSION (Gate A)
→ NG-10 DEPENDENCY CHECK
→ IK TRUTH CHECK (Gate B)
→ OWNER VERIFY
→ COMMIT explicit / PUSH tylko na GO
```

Real tender referencyjny P9: `08def45d-ead6-5db8-962b-120001d33d37`.  
Kontrola F5: drugi przetarg **z istniejącym OfferBoq** (AUDIT-01: ten id miał snapshot 0 linii).

---

## 5. Evidence bag (minimal)

| Operacja | Evidence |
|----------|----------|
| Discovery | `bzpDocuments[]` / external discovery `builtAt` / count |
| Przedmiar | `classifyCostDocument`, snapshot `rowCount`, filenames |
| Extraction | linie z qty+unit; missing-line count |
| Classification | `EstimatorClassifyResult` per workId/materialKey |
| Labor lookup | `ourRate.status` CURRENT/MISSING |
| Labor research | `httpFetchCount`, candidate id, evidence etag |
| Accept | catalog `sourceType=ACCEPT`, history |
| Material | cache usability; DIY offer URL+price |
| F5 | `ShadowPositionCostLineResult[]` |
| Bid | `TenderBidProposal` + packageDirect |
| SUM | `aggregatePackageDirect` vs Σ dwelling |

UI bez wiersza evidence = Gate B FAIL.

---

## 6. STOP

P0 freeze. Implementacja nie startuje bez Owner GO P1 i bez tej procedury.
