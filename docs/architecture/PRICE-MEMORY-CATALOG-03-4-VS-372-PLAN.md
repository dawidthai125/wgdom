# PRICE-MEMORY-CATALOG-03 — PLAN: MATERIAL CATALOG 372 + PRICE MEMORY STATUS

> **STATUS:** **PLAN COMPLETE** · **IMPLEMENTATION COMPLETE** · see [`PRICE-MEMORY-CATALOG-03-IMPLEMENTATION-CLOSEOUT.md`](./PRICE-MEMORY-CATALOG-03-IMPLEMENTATION-CLOSEOUT.md)  
> **DATA:** 2026-08-11  
> **PRIOR AUDIT:** [`PRICE-MEMORY-CATALOG-03-4-VS-372-AUDIT.md`](./PRICE-MEMORY-CATALOG-03-4-VS-372-AUDIT.md) · **VERDICT = E (B+C)**  
> **BASELINE prior:** UI **2.66.29** · live **`be718b4`** · CATALOG-02 **PRODUCTION VERIFIED · GREEN**  
> **IMPL UI:** **2.66.30** · harness **35 PASS** · awaiting Production Verify

---

## 1. Problem

**Firma → Nasz katalog cen** pokazuje ~**4** pozycje (PI31 ETICS), mimo **372** materialKeys w seedzie zakupów Zygmunt.

Biznesowo katalog ma być **listą naszych materiałów** + statusem ceny, a nie listą wyłącznie Price Memory HIT.

---

## 2. Current architecture

```text
useWorkCatalog (LS/KV kw-wgdom-work-catalog)
        ↓
buildOurPriceCatalogRows
  collectCandidateMaterialKeys (MAP ∪ mat.inv z cw.inv w store ∪ …)
        ↓
  resolveDemandProductIdentityExact
        ↓
  evaluateMaterialCache / lookupPriceMemory
        ↓
  if MISSING || !hit → SKIP          ← HIT-only gate
        ↓
  isOurPriceCatalogMaterialHost
        ↓
  row (basePrice zawsze > 0)
        ↓
OurPriceCatalogPanel (filter ALL · page 100 · ZERO HTTP)
```

| Warstwa | Rola dziś |
|---------|-----------|
| Price Memory | SSOT ceny **oraz** de facto SSOT widoczności |
| Seed Zygmunt | w kodzie; ensure tylko w **Chief** (`buildChiefPricingOptionsRo`) |
| CATALOG-02 | MATERIAL ONLY — labor blocklist — **KEEP** |

---

## 3. 4 vs 372 (LOCK z AUDIT)

| Stan store | Rows w katalogu | Skład |
|------------|----------------:|-------|
| Bez seeda Zygmunt, z PI31 | **4** | ETICS approved Quotes |
| Ze seedem Zygmunt | **372** | 286 CURRENT + 86 STALE + 0 MISSING + 0 LABOR |

**372 nie są utracone** — nie są podłączone do ścieżki UI katalogu + builder jest HIT-only.

---

## 4. Root cause (LOCK)

1. **`buildOurPriceCatalogRows` = HIT-only** → brak wiersza bez Price Memory HIT.  
2. **`ensureZygmuntInvoicePurchaseSeedLocal` nie na ścieżce Firma → katalog**.  
3. Bez `cw.inv.*` w store → brak kandydatów `mat.inv.*`.

---

## 5. Material candidate source (REUSE FIRST)

**Canonical źródło listy (bez nowej bazy):**

| Priorytet | Źródło | Uwagi |
|-----------|--------|-------|
| 1 | Seed Zygmunt **372** (`mat.inv.*` / hosty `cw.inv.*` + 1× ETICS) | Zakupy — idempotent upsert |
| 2 | `DEFAULT_MATERIAL_MARKET_MAP` (`mat.*`) | Identity MAP |
| 3 | Hosty już w store: `cw.product.*`, `wc.market.*`, identity-backed materials | REUSE |
| 4 | Keywords `mat.*` na eligible hostach | jak C02 |

**Resolver:** wyłącznie `resolveDemandProductIdentityExact` + istniejące prefixy / blocklist labor.

**Zakaz:** `materialCatalogStore`, drugie KV, drugi Price Memory, invent mapowań.

---

## 6. Seed lifecycle — decyzja PLAN

### Opcje (z briefu)

| | Opcja | Ocena |
|---|--------|-------|
| A | REUSE ensure przy ładowaniu katalogu | Bezpieczne: lokalne, idempotent, **ZERO HTTP** |
| B | Seed tylko we wcześniejszym lifecycle | Dziś = Chief — Owner nie wchodzi w Chief ⇒ 4 |
| C | Katalog tylko czyta store, bez seed | Nie rozwiązuje 4 vs 372 bez wcześniejszego ensure |
| D | Mały wspólny initializer | SSOT call-site dla Chief + katalog |

### **REKOMENDACJA PLAN = A + D (SSOT FIRST)**

1. **Jeden** istniejący mechanizm: `ensureZygmuntInvoicePurchaseSeedLocal` → `applyZygmuntInvoicePurchaseSeedToWorkCatalog` (już upsert po `catalogWorkId`, skip gdy ten sam quote).  
2. **Wspólny thin entry** (np. helper „ensure material purchase seed for work catalog”) wołany z:
   - Chief (jak dziś),
   - **oraz** wejścia w **Nasz katalog cen** / `useWorkCatalog` gdy sekcja `pricecatalog` (jednorazowo / gdy store bez seed marker — do ustalenia w IMPL).  
3. Na ścieżce UI katalogu: preferuj **`pushCloud: false`** przy open (lokalny ensure + istniejący sync work-catalog), żeby uniknąć stormu 372× cloud przy każdym wejściu. Chief może nadal `pushCloud: true` gdy `changed`.  
4. **Nie** kopiować logiki seeda; **nie** nowy seed engine.

**Invariants seed:**

- ZERO live fetch  
- Idempotent (brak duplikatów `cw.inv.*`)  
- Nie niszczy `commercialPricing` / innych Quotes (leroy/castorama)  
- Szybki (pure LS upsert)

---

## 7. Price Memory boundary

| | |
|--|--|
| **SSOT ceny** | `lookupPriceMemory` · `marketQuotes` · `marketQuoteHistory` · `evaluateMaterialCache` — **NO BREAKING CHANGE** |
| **SSOT listy materiałów** | **Material candidates** (seed ∪ MAP ∪ eligible hosts) — **NIE** HIT |
| Second DB / KV / provider | **ZERO** |

```text
MATERIAL CANDIDATE  →  widoczność w katalogu
PRICE MEMORY        →  CURRENT | STALE | MISSING (+ opcjonalnie baza z Quote)
```

### Historical purchase vs market price

Seed Zygmunt dziś zapisuje zakup jako `marketQuotes.wgdom` (HISTORICAL PURCHASE w opisie hosta).  
Po ensure: materiały mają bazę z zakupu → status CURRENT/STALE (nie „puste MISSING”).

**PLAN LOCK (v1):**

- Pokazuj cenę z Price Memory (w tym zakup wgdom) jako **cenę bazową znaną**, ze statusem PE.  
- Etykieta/źródło już rozróżnia origins (coverage UI).  
- **NIE** inventuj osobnego silnika „purchase vs DIY” w tym slice — ewentualny UX chip „zakup / rynek” = backlog, nie blocker 372.  
- **MISSING** w v1 dotyczy kandydatów **bez** żadnego Quote (np. MAP bez hosta / nowy materiał) — nie kasuj ich z listy.

---

## 8. CURRENT / STALE / MISSING

REUSE `evaluateMaterialCache` / istniejąca semantyka PE — **bez** nowego freshness engine.

| Status | Widoczność | Cena bazowa | Sell | Akcja |
|--------|------------|-------------|------|-------|
| **CURRENT** | TAK | z Memory | derived jeśli marża | opcjonalnie force refresh (C4) |
| **STALE** | TAK | ostatnia znana + timestamp + change | derived jeśli marża | Aktualizuj |
| **MISSING** | TAK | **—** (null) | **—** (nie inventuj) | Aktualizuj (ONE key) |

Filtr UI `MISSING` staje się **żywy** dopiero po zmianie buildera.

---

## 9. Builder changes

**Dziś:** HIT → row.  
**Docelowo:**

```text
MATERIAL CANDIDATE (mat.*)
        ↓
resolveDemandProductIdentityExact
        ↓
reject LABOR / invalid identity
        ↓
ensure host exists OR row bez work (prefer: host z seed/MAP)
        ↓
evaluateMaterialCache
        ↓
row {
  materialKey, namePl, unit, workId?,
  freshness: CURRENT|STALE|MISSING,
  basePrice: number | null,
  sellPrice: number | null,
  ...
}
```

### Konkretne zmiany (zakres IMPL)

| Element | Zmiana |
|---------|--------|
| `OurPriceCatalogRow.basePrice` | `number \| null` (MISSING) |
| Gate `if MISSING \|\| !hit) continue` | **USUNĄĆ** — MISSING emituje row |
| `collectCandidateMaterialKeys` | po ensure: seed keys obecne; opcjonalnie jawna unia z `ZYGMUNT…SEED` materialKeys (REUSE data, nie nowa baza) |
| Host gate | C02 `isOurPriceCatalogMaterialHost` — **KEEP** |
| Dedup | po `workId` / `materialKey` — bez duplikatów |

UI: bez nowego layoutu; kolumny jak dziś + czytelny status; baza „—” przy MISSING.

---

## 10. Storage

| | |
|--|--|
| KV | wyłącznie **`kw-wgdom-work-catalog`** |
| Seed | materializuje `CatalogWork` (`cw.inv.*`) + Quotes wgdom w store |
| Normalize | C1 `commercialPricing` preserve — **KEEP** |
| Duplikaty | upsert po `catalogWorkId` — już w apply |

Bezpieczeństwo lifecycle: seed w store jest **zgodny** z WorkCatalog; katalog handlowy może go ensure’ować lokalnie.

---

## 11. Idempotency

- `applyZygmunt…`: jeśli quote już ten sam → `changed: false`.  
- Wielokrotne wejście w katalog → **0** nowych duplikatów.  
- Test: seed 2× → works count stabilny (372 unique hosts / region).

---

## 12. Labor separation

| | |
|--|--|
| MATERIAL ONLY (C02) | **ABSOLUTNE** |
| Blocklist labor | przed row |
| Catch-all CatalogWork→Quotes | **NIE WRACA** |
| `companyPricePln` / Biblioteka / Bid / labor-benchmark | **NO TOUCH** |

---

## 13. Manual refresh

| | |
|--|--|
| C4 CURRENT force | **KEEP** |
| C5 Accept → `commitMarketQuotesImport` | **KEEP** |
| ONE materialKey · max 3 shops | **KEEP** |
| LIVE-ADAPTERS-08 | **NO TOUCH** |
| Auto research on open | **ZERO** |
| Background refresh 372 | **ZERO** |

---

## 14. Margin

- `commercialPricing.marginPct` — preserve przez seed / normalize / reload.  
- Research / Accept **nie** zmienia marży.  
- Global MAX — semantyka CATALOG-01 — **KEEP**.

---

## 15. Sell price

```text
base != null && margin != null  →  sell = base × (1 + margin/100)
MISSING lub brak marży         →  sell = null (UI „—”)
```

Nie inventuj bazy ani marży.

---

## 16. Performance

| Wejście katalogu | Wymaganie |
|------------------|-----------|
| Market HTTP | **0** |
| Research | **0** auto |
| Seed lokalny | OK jeśli idempotent + szybki |
| Full catalogue | **ZERO** |

---

## 17. Regression risk

| Obszar | Ryzyko | Mitygacja |
|--------|--------|-----------|
| CATALOG-01 commercial | Niski | reuse helpers |
| CATALOG-02 labor | Średni | blocklist + no catch-all |
| Invoice seed | Niski | ten sam apply |
| LIVE-08 / MMR-02 | Niski | no adapter change |
| Biblioteka / Bid | Niski | NO TOUCH companyPricePln |
| Cloud volume | Średni | `pushCloud:false` na open UI |
| UI nullable base | Średni | typy + testy MISSING |

---

## 18. Test plan (minimum)

| # | Test |
|---|------|
| 1 | Fresh store → po ensure: material candidates |
| 2 | Seed → **372** materials w katalogu |
| 3 | Brak duplikatów po 2× ensure |
| 4 | CURRENT ≈ **286** (przy fixed `nowMs` jak AUDIT) |
| 5 | STALE ≈ **86** |
| 6 | MISSING widoczny gdy kandydat bez Quote |
| 7 | LABOR = **0** |
| 8 | Open catalog → **0** live HTTP |
| 9 | No market research on open |
| 10 | Manual refresh ONE materialKey |
| 11 | CURRENT force refresh (C4) |
| 12 | Accept → commit (C5) |
| 13 | Margin persists |
| 14 | Sell recalculates / null gdy MISSING |
| 15 | History persists |
| 16 | CATALOG-01 regression |
| 17 | CATALOG-02 regression |
| 18 | LIVE-ADAPTERS-08 |
| 19 | MMR-02 |
| 20 | invoice seed regression |

Harness: rozszerzyć / dodać `scripts/test-price-memory-catalog-03.mjs`.

---

## 19. Implementation steps (po GO)

1. Thin shared ensure entry (REUSE Zygmunt) + wire do katalogu (pushCloud policy per Owner).  
2. Rozszerzyć `collectCandidateMaterialKeys` (unia seed keys REUSE).  
3. Builder: row dla MISSING; `basePrice` nullable.  
4. UI: „—” dla ceny/sell przy MISSING; status chip; bez nowego layoutu.  
5. Typy + panel null-safe.  
6. Harness T1–T20 + regresje C01/C02/seed/LIVE/MMR.  
7. Build → allowlist commit → push → PV (ZERO research).

**Pliki (oczekiwane):** `our-price-catalog.ts`, `OurPriceCatalogPanel.tsx`, ewentualnie `useWorkCatalog` / mały ensure helper, test harness, changelog, docs.

---

## 20. Rollback

1. Revert commita buildera + wire ensure.  
2. Brak migracji schema wymaganej.  
3. Seed w KV może zostać (nieszkodliwy); UI wraca do HIT-only.  
4. Baseline awaryjny: **2.66.29** / CATALOG-02.

---

## 21. Non-goals

- Tender Wire full  
- Full catalogue / 372×3 HTTP  
- Auto/background research  
- Nowa baza / KV / drugi Memory  
- Zmiana globalnej semantyki `lookupPriceMemory` (breaking)  
- Przywrócenie LABOR do katalogu  
- Nowy layout / redesign Firma  
- Osobny silnik „purchase ≠ market” (backlog)  
- Implementacja bez **OWNER GO**

---

## 22. Owner decisions (do potwierdzenia przed / przy GO)

| # | Decyzja | Rekomendacja PLAN |
|---|---------|-------------------|
| D1 | Semantyka listy = candidates, nie HIT | **TAK — LOCK** |
| D2 | Seed ensure na ścieżce katalogu | **TAK — REUSE ensure (A+D)** |
| D3 | `pushCloud` przy open katalogu | **Prefer `false`** (sync osobno) — Owner może wymusić true |
| D4 | MISSING rows w v1 | **TAK** (nullable base) |
| D5 | Po seedzie 372 z ceną zakupu = baza | **TAK v1** (Memory SSOT); rozdział purchase/market UX = backlog |
| D6 | Labor | **ZERO w katalogu** |
| D7 | HTTP on open | **ZERO** |
| D8 | Design Freeze osobny? | Opcjonalny — scope wąski; GO może iść z PLAN |

---

## Semantic change (LOCK)

```text
OBECNIE:   Price Memory HIT  =  materiał widoczny
DOCELOWO:  Material Candidate =  materiał widoczny
           Price Memory       =  CURRENT | STALE | MISSING
```

---

## Final status

```text
==================================================
PRICE-MEMORY-CATALOG-03

AUDIT: COMPLETE
PLAN: COMPLETE

CURRENT: 286
STALE: 86
MISSING: 0 (przy pełnym seedzie Quotes; MISSING UI żywy dla kandydatów bez Quote)
MATERIAL CANDIDATES: 372
LABOR: 0

OPEN CATALOG HTTP: 0
AUTO RESEARCH: ZERO

MATERIAL CATALOG: SEPARATE FROM PRICE MEMORY HIT
PRICE MEMORY: PRICE SSOT
SEED: REUSE EXISTING (ensure A+D)
SECOND DB: ZERO
NEW KV: ZERO

IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED

NEXT: OWNER GO IMPLEMENT
==================================================
```
