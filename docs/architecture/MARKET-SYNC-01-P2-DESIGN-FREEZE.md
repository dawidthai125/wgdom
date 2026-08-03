# MARKET-SYNC-01 P2 — DESIGN FREEZE

> **ID:** MARKET-SYNC-01-P2-DESIGN-FREEZE  
> **EPIC:** MARKET-SYNC-01 · **Slice:** **P2** — Historia cen · alerty Δ% · coverage retail · szablon providerów  
> **STATUS:** **DESIGN FREEZE · ACCEPTED** · **IMPLEMENT COMPLETE** (local) · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **MODE:** DF FROZEN · IMPLEMENT wg allowlisty · OV: [`MARKET-SYNC-01-P2-OWNER-VERIFICATION.md`](./MARKET-SYNC-01-P2-OWNER-VERIFICATION.md)  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE\*** (\*G2 = FEATURE staging/history/flag — nie Payroll)  
> **Wejście:** AUDIT **ACCEPTED** · Owner pipeline **DESIGN FREEZE ▶** · [`MARKET-SYNC-01-P2-AUDIT.md`](./MARKET-SYNC-01-P2-AUDIT.md)  
> **Parents:** [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) · [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md) · [`MARKET-SYNC-01-P1-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P1-DESIGN-FREEZE.md)  
> **Baseline tip:** UI **2.65.95** / **`869b4c5`** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (MARKET-SYNC-01 P2):
  PriceHistory ring + Δ% alerts + coverage RO
  + OBI/Bricoman provider templates (nie full sync)
  — REUSE P0/P1 Accept · staging · Kill Switch · commit*
  — BEZ scraper · N:M · multi-undo · drugiego Quotes path
  — BEZ AI-COST · Bid · Cloud CORE · Payroll
  — History NIE wchodzi do average engine (K-MS-4)

IMPLEMENT zakazany do: Owner ACCEPTED DF + GO IMPLEMENT.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — MARKET-SYNC-01 P2

G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE: staging history + opc. flaga P2
                        — bez migracji LP / Storage CORE)
G3 Cloud Sync:   NIE*  (*publish Quotes = wyłącznie istniejący P1
                        commitMarketQuotesImport — ZERO rewrite cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
Owner GO IMPLEMENT: dopiero po ACCEPTED DF + osobnym GO
```

Naruszenie G3 / Payroll / nowego DATA_KEY Cloud → **STOP** · amend DF.

---

## 1. Cel architektoniczny (zamrożony)

Zamrozić **cienkie rozszerzenie ops** Market Sync:

1. **PriceHistory** — append-only ring przy Accept.  
2. **Δ% alert** — wyróżnienie dużych skoków (nie blokada Publish).  
3. **Coverage retail RO** — KPI matched / accepted / published / linked.  
4. **Szablon providerów** — OBI / Bricoman (+ PSB stub) bez pełnego sync produkcyjnego.

**Sukces P2 ≠** drift Bid · **≠** full multi-shop.  
**Sukces P2 =** AC-MS-P2-* · flaga OFF = parity tip · K-MS-4 PASS · regresja P0/P1 PASS.

---

## 2. Decyzje Ownera / AUDIT zamrożone (O-MS-P2 → D-P2)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P2-01** | Cap historii | **`24`** punktów / `(marketProductId × providerId)` |
| **D-P2-02** | Próg alertu Δ% | **`10`** (`PRICE_ALERT_PCT = 10`) |
| **D-P2-03** | Flaga P2 | **`kw-market-sync-01-p2`** · default **OFF** |
| **D-P2-04** | N:M `linkedWorkIds` | **OUT P2** (N:1 z P1 pozostaje) |
| **D-P2-05** | `psb` | **Stub only** (jak OBI/Bricoman — bez full sync) |
| **D-P2-06** | Persist history | **W `kw-market-sync-01-staging`** (pole `priceHistory[]`) |
| **D-P2-07** | Moment append | **Accept** (`decision === "accepted"`) — nie Import · nie Publish |
| **D-P2-08** | History → average | **NIGDY** (K-MS-4 / AC-6) |
| **D-P2-09** | Quotes write | **Tylko** P1 `commitMarketQuotesImport` + Kill Switch — **ZERO** nowego path |
| **D-P2-10** | Alert vs Publish | Highlight only — **nie** blokuje Guard/Publish |
| **D-P2-11** | SMART staging RO | Soft migrate · **brak** breaking change pól używanych przez SMART |

Zmiana D-P2-\* = **amend DF** + Owner GO.

---

## 3. Zakres funkcjonalny IN (zamrożony)

| ID | Wymaganie FROZEN |
|----|------------------|
| **H1** | Typ `PriceHistoryEntry` + tablica w staging store |
| **H2** | `appendPriceHistoryOnAccept` — pure · cap 24 · FIFO/prune oldest |
| **H3** | Wire w `decideProviderQuoteStatus` / Accept path gdy status → `accepted` |
| **H4** | Pure query: last price · ΔPLN · Δ% vs previous accepted point |
| **A1** | `isPriceAlert(deltaPct)` ⇔ `\|deltaPct\| ≥ 10` |
| **A2** | UI highlight wierszy / timeline z alertem — copy PL |
| **C1** | Coverage RO: counts imported/matched/accepted/published · products with link · quotes with history |
| **C2** | UI strip / sekcja „Coverage (RO)” za flagą P2 |
| **T1** | Timeline UI: ostatnie N punktów per produkt×provider (N≤24) |
| **P1t** | Provider templates: fixture/CSV stub headers dla `obi` · `bricoman` · `psb` — **bez** produkcyjnego ingest pack |
| **X1** | Feature flag default OFF · OFF = brak UI P2 (timeline/coverage/templates) |
| **X2** | Testy smoke P2 + regresja P0/P1 |
| **X3** | Docs IMPL/PV/CLOSE po GO IMPLEMENT |

**Uwaga:** Gdy flaga P2 OFF — **preferowane** ZERO append history (parity store). DF binding: append **tylko** gdy `isMarketSyncP2Enabled() === true`.

---

## 4. Zakres funkcjonalny OUT (zamrożony — twarde)

```text
✗ Scraper / licensed API / cron / auto-publish
✗ Pełny sync produkcyjny OBI / Bricoman / PSB
✗ N:M linkedWorkIds
✗ Multi-undo / cloud-only rollback engine
✗ publishFactor UI / kalibracja ≠ 1.0
✗ Drugi tor Quotes / applyMarketQuotes* poza commit
✗ Zmiana Kill Switch default ON / semantyki KS
✗ Fuzzy match ON
✗ PriceHistory → computeMarketAverageForWork / controlled_market input
✗ AI-COST / Bid / Scoring / Parser rewrite
✗ Cloud Sync CORE / cloud-sync.ts / nowy DATA_KEYS
✗ Payroll / bootstrap / week
✗ SMART Save / One-shot / Evidence rewrite
✗ DIY enabledOrigins default ON
✗ CM-04 P3 / Wave 2 / SMART P3
✗ Re-open AC P0/P1 bez amend
```

---

## 5. Kontrakt PriceHistory (zamrożony)

### 5.1 Typ

```ts
/** Semantyka FROZEN — nazwy ostateczne ⊆ IMPLEMENT */

interface PriceHistoryEntry {
  id: string;                    // ph-{uuid|hash}
  marketProductId: string;
  providerId: ProviderId;        // leroy|castorama|obi|…
  providerSku: string;
  pricePln: number;              // > 0
  at: string;                    // ISO = Accept time (caller / accept ts)
  sourceKind: MarketSyncSourceKind;
  syncRunId: string | null;
  quoteId: string;               // ProviderQuote.id źródłowego Accept
}
```

### 5.2 Cap / prune

| Stała | Wartość FROZEN |
|-------|----------------|
| **`PRICE_HISTORY_CAP`** | **`24`** |
| Klucz ring | `(marketProductId, providerId)` |
| Prune | Po append: sort `at` ASC · drop oldest aż `length ≤ 24` |

### 5.3 Append rules

```text
WHEN Accept decision = accepted
 AND isMarketSyncP2Enabled()
 AND quote.marketProductId present
 AND quote.grossPrice (price) > 0
THEN append PriceHistoryEntry
ELSE no history write

Idempotencja: ponowny Accept tej samej quoteId już w history
  → NIE duplikuj (skip lub replace same quoteId — DF: SKIP duplicate quoteId)
```

### 5.4 Anti-kontrakt

```text
✗ Feed Import → history
✗ Publish → history (Publish nie jest źródłem ring)
✗ History → average engine
✗ Mutacja Product Quotes z history helpera
```

---

## 6. Kontrakt alertów Δ% (zamrożony)

| Stała | Wartość |
|-------|---------|
| **`PRICE_ALERT_PCT`** | **`10`** |

```text
deltaPct = ((newPrice - prevPrice) / prevPrice) * 100
  gdy prevPrice > 0; inaczej alert = false (brak previous = first point)

isAlert = |deltaPct| >= PRICE_ALERT_PCT
```

UI: badge / wiersz „Δ% alert (≥10%)” — **nie** zmienia Guard · Dry Run · Kill Switch · Publish enablement.

REUSE: logika Δ może współistnieć z P1 `delta.ts` (Quotes vs incoming) — P2 alert = vs **ostatni punkt PriceHistory** (produkt×provider), niekoniecznie vs WC Quotes.

---

## 7. Kontrakt Coverage RO (zamrożony)

```ts
interface MarketSyncCoverageView {
  productCount: number;
  quoteCount: number;
  acceptedCount: number;
  publishedCount: number;
  linkedProductCount: number;     // linkedWorkIds.length === 1
  historyEntryCount: number;
  productsWithHistory: number;
  alertCount: number;             // current feed rows z isAlert (opc. Preview)
}
```

Pure `buildMarketSyncCoverageView(store)` — **0** I/O poza argumentami.

---

## 8. Kontrakt UI (zamrożony)

### 8.1 Surface

| Element | FROZEN |
|---------|--------|
| Host | `MarketSyncPreviewPanel.tsx` (Super Admin → Biblioteka → Market Sync) |
| Opc. | `MarketSyncP2HistoryPanel.tsx` / `MarketSyncP2CoverageStrip.tsx` thin |
| Gate | `isMarketSyncP2Enabled()` |

### 8.2 Widoczność

```text
UI P2 WIDOCZNE ⇔ isMarketSyncP2Enabled() === true
OFF ⇒ brak timeline · coverage · templates · brak append history
```

### 8.3 Bloki

| Blok | Treść |
|------|-------|
| Coverage strip | KPI RO §7 |
| Timeline | Last points · price · at · Δ% · alert badge |
| Templates | Download/copy stub CSV OBI · Bricoman · PSB |
| Zakaz copy | „Auto-publish” · „Scrape now” · „Save to Bid” |

### 8.4 Mobile

Jedna kolumna · touch ≥44px na akcje timeline expand · brak krytycznego overflow.

---

## 9. Feature Flag (zamrożony)

| Pole | Wartość FROZEN |
|------|----------------|
| **LS key** | `kw-market-sync-01-p2` |
| **Moduł** | `src/lib/market-sync/p2-flag.ts` (**NOWY**) |
| **Default** | **OFF** (`false`) |
| **ON** | raw `"1"` |
| **Test override** | `forceMarketSyncP2ForTests(on \| null)` |
| **Zakaz** | Default ON w release bez Owner GO ops |
| **Zakaz** | Wspólny toggle z Kill Switch Publish |

**Rollback L1:** `localStorage.setItem('kw-market-sync-01-p2','0')`.

---

## 10. Provider templates (zamrożony)

| Provider | P2 |
|----------|-----|
| `obi` | Stub CSV header + przykładowy wiersz fixture |
| `bricoman` | Stub CSV header + przykładowy wiersz fixture |
| `psb` | Stub only (D-P2-05) |
| `leroy` / `castorama` | **REUSE** P0/P1 — bez zmiany kontraktu importu |

**Zakaz:** produkcyjny full catalog sync · scraper adapters · scheduled fetch.

---

## 11. Allowlist (FROZEN)

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/lib/market-sync/types.ts` | `PriceHistoryEntry` · opc. pole na store |
| `src/lib/market-sync/staging-store.ts` | Load/save/normalize `priceHistory[]` |
| `src/lib/market-sync/accept.ts` | Thin wire append gdy P2 ON + accepted |
| `src/lib/market-sync/price-history.ts` | **NOWY** — append · cap · Δ% · alert · query |
| `src/lib/market-sync/coverage.ts` | **NOWY** — pure coverage RO |
| `src/lib/market-sync/p2-flag.ts` | **NOWY** — flag §9 |
| `src/lib/market-sync/index.ts` | Re-export |
| `src/app/market-sync/MarketSyncPreviewPanel.tsx` | Thin UI P2 |
| `src/app/market-sync/MarketSyncP2*.tsx` | **NOWY** opc. thin components |
| `scripts/test-market-sync-01-p2.mjs` | **NOWY** smoke |
| `scripts/fixtures/market-sync/*` lub `public/` stub CSV | Opc. templates |
| Regresja (run): `test-market-sync-01-p0*.mjs` · `p1*.mjs` | Bez zmiany kontraktu P0/P1 |
| `changelog-data.ts` · `CHANGELOG.md` | Po IMPLEMENT + Owner GO release |
| Docs `MARKET-SYNC-01-P2-*` · tip `09` | Po release / closeout |

**Zasada:** żaden plik spoza listy. Rozszerzenie = **amend DF** + Owner GO.

**Preferuj ZERO DIFF:** `publish.ts` · `kill-switch.ts` · `guard.ts` · `dry-run.ts` · `commit-market-quotes.ts` · average engine · SMART modules.

---

## 12. Bloklista (FROZEN)

| Plik / obszar | Zakaz |
|---------------|-------|
| `work-catalog/commit-market-quotes.ts` | Rewrite / drugi path |
| `work-catalog/market-average-engine.ts` | Input z PriceHistory |
| `cloud-sync.ts` · `DATA_KEYS` | CORE |
| Payroll\* | CORE |
| `tenders-bid-calculator.ts` · AI-COST pricing | OUT |
| SMART Save / One-shot / Evidence rewrite | Ownership SMART |
| Scraper / cron modules | P3 |

---

## 13. Punkty REUSE (zamrożone)

| # | REUSE | Użycie P2 |
|---|-------|-----------|
| **R1** | Staging store P0/P1 | Persist history |
| **R2** | `decideProviderQuoteStatus` / Accept | Append hook |
| **R3** | `MarketSyncPreviewPanel` | Host UI |
| **R4** | ProviderId union (już zawiera obi/…) | Templates |
| **R5** | P1 Delta / Preview buckets | Współistnienie · nie replace |
| **R6** | Kill Switch + `commit*` | Publish unchanged |
| **R7** | Wzorzec flagi P1 / SMART | `p2-flag.ts` |

**ZERO DUPLICATE:** jeden history helper · zero drugiego Quotes writer · zero drugiego average.

---

## 14. Boundary SMART (zamrożony)

| Reguła | FROZEN |
|--------|--------|
| Pola staging używane przez SMART Evidence | Soft-add `priceHistory` · nie usuwaj/rename pól RO |
| SMART Save / commit | **OUT** P2 |
| MS P2 nie woła SMART APIs | **FROZEN** |

---

## 15. Definition of Done / AC (zamrożone)

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-MS-P2-1** | Diff ⊆ allowlist §11 | review |
| **AC-MS-P2-2** | Append on Accept gdy P2 ON · cap 24 · skip dup quoteId | unit |
| **AC-MS-P2-3** | P2 OFF → brak append · brak UI P2 | unit + OV |
| **AC-MS-P2-4** | K-MS-4: history nie w average | unit / grep |
| **AC-MS-P2-5** | Alert \|Δ%\|≥10 · nie blokuje Publish | unit + UI |
| **AC-MS-P2-6** | Coverage RO view | unit + UI |
| **AC-MS-P2-7** | Templates OBI/Bricoman/PSB stub | fixture |
| **AC-MS-P2-8** | Publish path = wyłącznie P1 commit + KS | grep + P1 smoke |
| **AC-MS-P2-9** | Regresja P0 + P1 smoke PASS | CI/local |
| **AC-MS-P2-10** | Build PASS · Gate ALL-NIE | checklist |
| **AC-MS-P2-11** | SMART staging RO non-breaking | static review |

### Anti-AC

| ID | Anti |
|----|------|
| **AC-X1** | Auto-publish / cron / scraper |
| **AC-X2** | N:M / multi-undo / publishFactor UI |
| **AC-X3** | DIY enabledOrigins default ON |
| **AC-X4** | Bid target PLN jako sukces |

---

## 16. Rollback Strategy (zamrożona)

```text
L1 — Natychmiast:
  localStorage.setItem('kw-market-sync-01-p2', '0')
  → UI P2 OFF · brak nowych append · P0/P1 Preview/Accept/Publish bez zmian

L2 — Tip revert (Owner GO):
  revert commitów allowlisty P2
  → nie ruszać P0/P1 · SMART · WC commit · Payroll · Cloud

L3 — Zakaz rollbacku „przy okazji”:
  P1 Publish · Kill Switch · origins DIY · SMART P0–P2
```

**Uwaga:** Quotes już opublikowane przez P1 **nie** cofają się przez P2 OFF.

---

## 17. Owner Verification (zamrożony)

| # | Check |
|---|-------|
| **OV-1** | P2 OFF → brak timeline/coverage/templates · P0/P1 OK |
| **OV-2** | P2 ON · Accept → wpis history |
| **OV-3** | Cap 24 egzekwowany |
| **OV-4** | Dup Accept tej samej quoteId → brak duplikatu |
| **OV-5** | Δ% ≥10% → alert UI · Publish nadal możliwy (przy KS ON + guard) |
| **OV-6** | Coverage RO widoczne |
| **OV-7** | Templates stub dostępne · brak full sync |
| **OV-8** | Average/controlled_market bez history input |
| **OV-9** | SMART Evidence staging (gdy SMART ON) bez regresji |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE |

---

## 18. Test plan (zamrożony szkic)

| Case | Oczekiwanie |
|------|-------------|
| Flag default OFF | `false` |
| Accept + P2 ON | +1 history |
| Accept + P2 OFF | 0 history |
| 25 accept same MP×provider | length === 24 |
| Δ 12% vs prev | isAlert true |
| Δ 5% | isAlert false |
| First point | no alert |
| Coverage counts | spójne ze store |
| P0/P1 smoke | PASS |
| Grep: average ← priceHistory | 0 hits |

---

## 19. Etapy po FREEZE

```text
1. Owner ACCEPTED DESIGN FREEZE (§20)
2. Owner GO IMPLEMENT
3. IMPLEMENT allowlisty §11
4. OWNER VERIFICATION
5. COMMIT (GO) → PUSH → PRODUCTION VERIFY → P2 CLOSE
6. P3 / scraper / N:M / SMART P3 = NIE bez osobnego Owner GO
```

---

## 20. Owner Acceptance Checklist

```text
[ ] Akceptuję D-P2-01…11 (§2)
[ ] Akceptuję IN §3 / OUT §4
[ ] Akceptuję kontrakty History §5 · Alert §6 · Coverage §7 · UI §8 · Flag §9
[ ] Akceptuję allowlist §11 · DoD §15 · Rollback §16 · OV §17
[ ] Potwierdzam: brak IMPLEMENT / commit / push do osobnego GO IMPLEMENT
```

---

## 21. Zakaz IMPLEMENT z tego dokumentu

Ten plik **nie** jest kodem.  
**IMPLEMENT** dopiero po: **Owner ACCEPTED DF** + **Owner GO IMPLEMENT**.

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**Slice:** MARKET-SYNC-01 P2 · history · Δ% · coverage · templates · flag OFF  
**Pipeline:** AUDIT ✅ → **DF ▶** → IMPLEMENT → OV → COMMIT → PUSH → PV → P2 CLOSE  
**Next:** Owner **ACCEPTED DF** → **GO IMPLEMENT**
