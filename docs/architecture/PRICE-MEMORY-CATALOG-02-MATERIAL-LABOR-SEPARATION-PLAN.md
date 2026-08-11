# PRICE-MEMORY-CATALOG-02 — MATERIAL / LABOR SEPARATION PLAN

> **STATUS:** **PRODUCTION VERIFIED · GREEN** · see [`PRICE-MEMORY-CATALOG-02-PRODUCTION-VERIFY.md`](./PRICE-MEMORY-CATALOG-02-PRODUCTION-VERIFY.md) · [`IMPL`](./PRICE-MEMORY-CATALOG-02-IMPLEMENTATION-CLOSEOUT.md)  
> **DATA:** 2026-08-11  
> **PRIOR AUDIT:** [`PRICE-MEMORY-CATALOG-02-MATERIAL-LABOR-SEPARATION-AUDIT.md`](./PRICE-MEMORY-CATALOG-02-MATERIAL-LABOR-SEPARATION-AUDIT.md) · **RECOMMENDATION = B**  
> **PRIOR PROD:** PRICE-MEMORY-CATALOG-01 · UI **2.66.28** · PRODUCTION VERIFIED · GREEN  
> **LIVE:** UI **2.66.29** / **`be718b4`** · feature **`9a2c3563`** · MATERIAL ONLY

---

## 1. Objective

Naprawić semantykę **Firma → Nasz katalog cen** tak, aby lista była:

```text
MATERIAL IDENTITY → materialKey → resolver → Price Memory HIT → row
```

a **nie**:

```text
CatalogWork → marketQuotes → blind lookup(catalogWorkId) → row
```

**Hard invariants:**

| Warstwa | Semantyka |
|---------|-----------|
| Price Memory | **MATERIAL ONLY** |
| Nasz katalog cen | **MATERIAL ONLY** |
| Labor / Work / pakiety | **SEPARATE** |
| `companyPricePln` / Bid / labor-benchmark / TenderPriceBasePanel | **UNCHANGED** |
| `lookupPriceMemory` (global) | **UNCHANGED** — fix w builderze |
| Nowa klasyfikacja / KV / provider | **NO** |

Naprawiamy **źródło danych w lib**, nie maskujemy LABOR w React UI.

---

## 2. Current root cause

Plik: `src/lib/price-intelligence/our-price-catalog.ts` → `buildOurPriceCatalogRows`.

### Wejście buildera dziś

1. `WorkCatalogStore` (region aktywny)
2. `collectCandidateMaterialKeys` — MAP + invoice + `mat.*` keywords + identity-by-workId
3. **Catch-all:** każdy `CatalogWork` z `marketQuotes`

### Jak powstają rows

| Krok | Zachowanie | Problem |
|------|------------|---------|
| A | `materialKey` → `evaluateMaterialCache` → HIT | Zasadniczo OK |
| B | Catch-all: `lookupPriceMemory({ catalogWorkId: work.id, materialKey: identity\|\|inv\|\|work.id })` | **BUG** |
| C | UI tylko renderuje | Nie filtruje LABOR |

`resolveWorkId` przy ustawionym `catalogWorkId` zwraca HIT bez material identity.  
`isLaborCatalogWorkBlockedForProductQuotes` **nie jest egzekwowane** w catch-all.

**Secondary:** fallback `candidateWorkIds` może wskazać labor host, gdy product nie ma Quotes — po HIT wymagany check allowlist hosta.

---

## 3. Target architecture

```text
MATERIAL KEY SOURCES
  · DEFAULT_MATERIAL_MARKET_MAP
  · mat.inv.* (invoice / 372)
  · mat.* keywords (tylko gdy identity OK)
        ↓
resolveDemandProductIdentityExact (+ invoice mat.inv ↔ cw.inv)
        ↓
REJECT: identity null | labor-blocked | host nie-material
        ↓
evaluateMaterialCache / lookupPriceMemory (materialKey PRIMARY)
        ↓
HIT + eligible host
        ↓
Nasz Katalog Cen row
```

---

## 4. Material identity

REUSE (bez nowego registry):

- `mat.*` / `mat.inv.*`
- `DEFAULT_MATERIAL_MARKET_MAP`
- `resolveDemandProductIdentityExact`
- `isProductCatalogWorkId` (`cw.product.*`)
- `isInvoicePurchaseCatalogWorkId` (`cw.inv.*`)
- `wc.market.*`
- `preferProductCatalogWorkId`

**Dozwolone w katalogu** (gdy identity + Memory HIT): klej, płyty GK, farby, grunty, gładzie, tynki, WC, umywalki, baterie, rury, przewody, materiały instalacyjne, 372 `mat.inv.*`.

**Nie** klasyfikować po nazwie-only, unit-only, `companyPricePln`.

---

## 5. Labor boundary

| Poza katalogiem | SSOT (NO TOUCH) |
|-----------------|-----------------|
| Malowanie / montaż / układanie (praca) / rbh | Seed Biblioteki · cost model · labor-benchmark* · TenderPriceBasePanel |
| Cena firmy roboty | `companyPricePln` |
| Pakiety | `WorkBundle` (już poza builderem) |

Przykład **układanie płytek**:

- MATERIAL w katalogu: płytki / klej / fuga  
- LABOR poza: „układanie płytek”

---

## 6. Builder change

**Główny plik:** `our-price-catalog.ts`

### STEP 1 — Usunąć blind catch-all

Usunąć pętlę „każdy work z marketQuotes → lookup(catalogWorkId)”.

Opcjonalny recovery **tylko** gdy exact identity material + eligible host + lookup po `materialKey` (nie `work.id` jako fake key). Preferencja: **w ogóle nie skanować wszystkich works**.

### STEP 2 — Wymusić material identity

Dla każdego kandydata `materialKey`:

1. `identity = resolveDemandProductIdentityExact({ materialKey })`
2. `null` → SKIP
3. labor-blocked(`identity.catalogWorkId`) → SKIP

### STEP 3 — Odrzucić LABOR najwcześniej

**Przed** `evaluateMaterialCache` / `lookupPriceMemory` w pętli katalogu.

### STEP 4 — Lookup tylko dla material identity

`evaluateMaterialCache({ materialKey })` — bez blind `catalogWorkId` labor seed.  
Opcjonalnie `catalogWorkId = identity.catalogWorkId` **tylko** gdy eligible.

### STEP 5 — Po HIT: walidacja hosta

`hit.workId` musi przejść allowlist: product ∪ inv ∪ `wc.market.` ∪ identity host ∧ ¬labor-blocked.

### STEP 6 — Zacisnąć `collectCandidateMaterialKeys`

Zachować MAP + invoice keys z store.  
Keywords `mat.*` tylko gdy identity ≠ null.  
Nie wołać blind identity dla każdego arbitrary `work.id`.

UI (`OurPriceCatalogPanel`): bez filtra LABOR — dane mają być czyste z lib.

---

## 7. Resolver reuse

| Helper | Rola |
|--------|------|
| `resolveDemandProductIdentityExact` | Gate identity |
| `isLaborCatalogWorkBlockedForProductQuotes` | Deny labor |
| `isProductCatalogWorkId` / invoice helpers / `wc.market.` | Allowlist host |
| `DEFAULT_MATERIAL_MARKET_MAP` | Kandydaci |
| `evaluateMaterialCache` / `lookupPriceMemory` | HIT bez zmiany globalnej semantyki |

Opcjonalny thin lokalny: `isOurPriceCatalogMaterialHost(workId)` — **nie** nowy system klasyfikacji.

**NIE** zmieniać `lookupPriceMemory` breaking-change.

---

## 8. Price Memory boundary

| Element | Plan |
|---------|------|
| `marketQuotes` / `marketQuoteHistory` | NO TOUCH |
| `lookupPriceMemory` semantics | NO TOUCH |
| Accept / commit | NO TOUCH |
| LIVE-ADAPTERS / MMR / Legal / D1 | NO TOUCH |
| `commercialPricing` | NO TOUCH |

Fix = **SELECTION / IDENTITY** w builderze.

---

## 9. Data flow

```text
① Keys = MAP ∪ invoice mat.inv from store ∪ gated mat.* keywords
② identity = resolveDemandProductIdentityExact({ materialKey })
   if !identity | laborBlocked → skip
③ cache = evaluateMaterialCache({ materialKey })
   if MISSING | !hit → skip
④ if !eligibleHost(hit.workId) → skip
⑤ rowFromHit → dedupe workId → search / freshness / pagination
⑥ UI render
```

### 372 materialKeys

- Resolver natywnie obsługuje `mat.inv.*` → `cw.inv.*`.
- Po seedzie w store: keys z `cw.inv.*` → HIT gdy Quotes obecne.
- **Nie inventować** brakujących Quotes.

| Metryka | Oczekiwanie |
|---------|-------------|
| Unikalne keys w seed data | **372** |
| Wiersze invoice w katalogu przy pełnym seed+Quotes | **= liczba HIT** (typowo 372) |
| Utrata material HIT vs przed | **0** |
| Labor rows | mogą spaść do **0** (cel, nie regresja) |

Wszystkie 372 mogą być obsłużone przez istniejący resolver **o ile** odpowiadające `cw.inv.*` mają Quotes w store.

---

## 10. Regression risk

| Obszar | Ryzyko | Mitygacja |
|--------|--------|-----------|
| CATALOG-01 C1–C5 / marża / sell | Niski | Bez zmian persist/refresh |
| Invoice 372 | Niski | Test count + HIT sample |
| LIVE-08 / MMR-02 | Zero | NO TOUCH research |
| Biblioteka / labor / Bid / Cost | Zero | NO TOUCH |
| Tender BOM → Memory | Zero | Osobny flow |
| False negative materiału | Średni | Allowlist + testy MAP/product/inv/wc.market |
| False positive labor | Cel ZERO | Testy labor+Quotes |

Fix katalogu **nie** zmienia flow wyceny przetargów.

---

## 11. Test plan

| ID | Assercja |
|----|----------|
| T1 | Katalog = tylko MATERIAL |
| T2 | LABOR (blocklist + Quotes) → 0 wierszy |
| T3 | WORK seed (`malowanie-*` + Quotes) → 0 wierszy |
| T4 | Pakiety nie wchodzą |
| T5 | MATERIAL Memory HIT → wiersz PASS |
| T6 | 372 seed nieutracony (keys=372; HIT rows zachowane) |
| T7 | CURRENT open: fetchCalls=0 |
| T8 | STALE open: fetchCalls=0 |
| T9 | Manual refresh ONE materialKey działa |
| T10 | C4 force CURRENT PASS |
| T11 | C5 Accept→commit PASS |
| T12 | Marża bez zmian |
| T13 | Sell derived OK |
| T14 | Historia Price Memory nienaruszona |
| T15 | Biblioteka Robót bez zmian |
| T16 | `companyPricePln` UNTOUCHED |
| T17 | Bid `minMarginPct` UNTOUCHED |

Plus: build · seed harness · LIVE-08 · MMR-02.

---

## 12. Implementation steps

| Step | Działanie |
|------|-----------|
| 1 | Popraw źródło rows w `buildOurPriceCatalogRows` |
| 2 | Wymuś material identity |
| 3 | Odrzuć LABOR/WORK przed lookupiem |
| 4 | Price Memory lookup tylko dla material identity |
| 5 | Nie zmieniać Price Memory schema |
| 6 | Zacisnij `collectCandidateMaterialKeys` |
| 7 | Harness CATALOG-02 (T1–T17) |
| 8 | `npm run build` |
| 9 | Existing regressions |
| 10 | Commit allowlist · push · Production Verify |

**Pliki:** `our-price-catalog.ts` · `scripts/test-price-memory-catalog-02.mjs` (lub rozszerzenie 01) · docs/changelog po GO.

---

## 13. Non-goals

- Zakładka „Robocizna”
- Pole `CatalogWork.kind` / nowe KV / druga baza
- Zmiana globalna `lookupPriceMemory`
- Wire marży → Bid/przedmiar (P3)
- Filter tylko w React UI
- Invent Quotes
- Research przy otwarciu / full catalogue
- Zmiana Legal / D1 / adapters

---

## 14. Rollback plan

1. Revert commita buildera + harness.  
2. Brak migracji KV — dane Quotes/marże nietknięte.  
3. Baseline awaryjny: CATALOG-01 **2.66.28**.

---

## 15. Production verification plan

1. Jednorazowy `version.json` (nowa wersja changelog).  
2. Bundle: `pricecatalog` · Nasz katalog cen · `commercialPricing`.  
3. Smoke Owner: brak malowania/montażu; materiały/invoice obecne.  
4. **Bez** masowego research.  
5. Open catalog → ZERO live market HTTP.  
6. Closeout + tip `docs/AI/09_PRODUCTION_BASELINE.md`.

---

## STOP

```text
PLAN COMPLETE
IMPLEMENTATION: NONE
COMMIT: NONE
PUSH: NONE
PRODUCTION: UNCHANGED
NEXT: OWNER GO IMPLEMENT
```
