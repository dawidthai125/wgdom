# TEST-HARNESS-01 H5 — PLAN

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Status:** PLAN COMPLETE · **NIE implementować** · **NIE DESIGN FREEZE** bez Owner GO  
> **Data:** 2026-07-20  
> **Owner GO PLAN:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H5-AUDIT.md`](TEST-HARNESS-01-H5-AUDIT.md) · [`TEST-HARNESS-01-H5-RCA.md`](TEST-HARNESS-01-H5-RCA.md)  
> **Parent:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 Biblioteka AC (**supersede** assert klucza — patrz §0)  
> **Baseline prod:** UI **2.65.35** · tip **`1addd97`** · app feature **`fce7b78`** · **GREEN**  
> **IMPLEMENT:** **BLOCKED**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · MOBILE FIRST · D5 ZERO Core

---

## 0. Decyzje wejściowe (zamknięte w RCA — zatwierdzone Owner)

| Decyzja | Wartość |
|---------|---------|
| Primary write-surface | **`kw-wgdom-work-catalog`** (Wariant A) |
| `kw-wgdom-cost-catalog` | **REJECT** dla H5 |
| Parent PLAN literal cost-catalog | **SUPERSEDED** — assert persist = work-catalog |
| Nowy KV | **NIE** (D4) |
| Path MVP | **KV-only** (Playwright UI = OUT / soft optional — nie gate PASS) |
| D5 ZERO Core | **BEZ ZMIAN** Protected Core / Edge / merge / Payroll / Theme |
| Model wiersza | `CatalogWork` z `id`/`namePl` prefix `psb-*` · pole `keywords[]` |
| Region domyślny | `activeRegion` ze store **lub** `wroclaw` jeśli pusty — DF zamrozi |

---

## 1. Cel PLANU

Zdefiniować (po późniejszym Owner GO IMPLEMENT) scenariusz **`h5-biblioteka`**:

```text
preflight (--allow-prod | dry-run)
  → batch-get kw-wgdom-work-catalog
  → CREATE CatalogWork psb-* (+ keywords)
  → batch-set (RMW · non-psb-* preserved · bump updatedAt)
  → batch-get · assert create + keywords
  → EDIT keywords / name (tylko psb-*)
  → batch-set · batch-get · assert edit
  → DELETE psb-* z works[]
  → batch-set · batch-get · assert brak wiersza
  → PSB-001 cleanup (finally) · 0 orphan psb-*
```

**Poza zakresem tego etapu:** kod, DESIGN FREEZE, ARCH REVIEW, commit, push, bump UI, zmiany Production.

---

## 2. Dokładny zakres implementacji H5

### 2.1 IN

| Element | Opis |
|---------|------|
| Scenariusz `h5-biblioteka` | CRUD sandbox wiersza Biblioteki Robót na prod KV |
| Alias CLI | `h5` → `h5-biblioteka` (jak `h4` → `h4-cloud`) |
| Write key | **Wyłącznie** `kw-wgdom-work-catalog` |
| Operacje | Create → keyword → edit → delete → parity po każdym kroku |
| Reuse H0 | markers · allowlist `catalogRowIds` · mutate-guard · cleanup · report · `--allow-prod` · dry-run |
| Reuse H4 pattern | KV-only · FORBIDDEN gate przed `batch-set` · nested RMW · preservacja non-sandbox · soft WARNING nie FAIL |
| Helper | Cienki `catalog-helpers.mjs` (build/upsert/remove `psb-*` w store) — **nie** kopiować `mergeWorkCatalogStore` |
| Manifest | Suite `prod-sandbox-h5` · `PROD-SANDBOX-H5` · **manual / Owner** · **nie** Gate B/C |
| Thin wrapper | `scripts/test-prod-sandbox-h5.mjs` |
| README PSB | Sekcja H5 CLI + zakaz cost-catalog / bundles |
| Docs AC | DF H5 zamrozi supersession klucza vs parent PLAN |

### 2.2 OUT

| Temat | Powód |
|-------|--------|
| `kw-wgdom-cost-catalog` (read/write/mutate keywords seed) | RCA **REJECT** · P0 ATH |
| `kw-wgdom-cost-catalog-history` | Poza AC |
| `kw-wgdom-work-bundles` / market quotes commit | Poza AC · R-H5-10 |
| `cloud-sync.ts` / Edge / merge / Theme / App Core | **D5** |
| Przywrócenie sync cost-catalog do `DATA_KEYS` | Scope creep · D5 |
| Payroll keys / fence / PWRB | FORBIDDEN |
| `kw-app-settings` (włączanie ACL Biblioteki) | OUT — nie naprawiać UI |
| Playwright mandatory / login UI Biblioteka | Stability WARNING · ACL — nie gate PASS |
| H3-B/C · H0.x · H4 reopen · N2 | Osobne GO |
| CI auto-run prod-sandbox | Parent: manual |
| Duplikacja `kv-client` / retry loop | #PSB-008/009 |

---

## 3. Lista plików do modyfikacji / utworzenia

| Plik | Akcja |
|------|--------|
| `test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs` | **NOWY** — orchestracja H5 |
| `test-infra/prod-sandbox/catalog-helpers.mjs` | **NOWY** — build/upsert/remove `psb-*` w kształcie store (bez importu Core merge) |
| `test-infra/prod-sandbox/runner.mjs` | Rejestracja `h5-biblioteka` / `h5` · help (H5 implemented) |
| `test-infra/prod-sandbox/forbidden-keys.mjs` | **Rozszerzenie** — gate H5: ALLOWED write = `{ kw-wgdom-work-catalog }` · FORBIDDEN = payroll/auth/billing + **cost-catalog** + **work-bundles** + tenders/jobs write (H5 nie pisze H1/H2 keys) · REUSE pattern H4, bez duplikacji listy payroll |
| `test-infra/prod-sandbox/README.md` | Dokumentacja H5 · supersession klucza |
| `scripts/test-prod-sandbox-h5.mjs` | **NOWY** thin wrapper |
| `test-infra/test-manifest.json` | Suite `prod-sandbox-h5` · `PROD-SANDBOX-H5` |
| `package.json` | Tylko jeśli potrzeba aliasu (opcjonalnie; prefer `test:prod-sandbox -- --scenario h5-biblioteka`) |

**Zakaz edycji:** `src/lib/cloud-sync.ts`, `src/lib/work-catalog/**` (logika produktu), `src/lib/wgdom-cost-catalog*`, Edge `index.tsx`, `payroll-*`, Theme, `App.tsx` Core, `version.json`.

**Bez duplikatu:** nie forkować drugiego Edge clienta; nie reimplementować `mergeWorkCatalogStore` w harnessie; nie kopiować H1 `tender-helpers` do katalogu.

---

## 4. Kolejność etapów implementacji (po Owner GO IMPLEMENT — nie teraz)

```text
H5.0  Wiring
      · runner: h5-biblioteka / h5 w IMPLEMENTED
      · --allow-prod / --dry-run parity z H4
      · manifest PROD-SANDBOX-H5 (manual)

H5.1  Protection gate
      · FORBIDDEN keys (H4 payroll/auth/billing + cost-catalog + bundles + non-catalog domain writes)
      · ALLOWED write = tylko kw-wgdom-work-catalog
      · mutate-guard + session-created psb-* (kind: catalog)
      · dry-run: zero batch-set

H5.2  Create + keyword (RMW)
      · batch-get work-catalog
      · upsert CatalogWork psb-* z keywords[]
      · preservacja wszystkich non-psb-* works (+ drugi region nietknięty poza koniecznym RMW)
      · bump store.updatedAt (+ slice.updatedAt)
      · batch-set · batch-get parity (id + keywords)

H5.3  Edit
      · zmiana keywords (i/lub namePl) tylko na psb-*
      · parity po get
      · asercja: żaden non-psb-* nie zmienił keywords/id

H5.4  Delete + Cleanup PSB-001
      · usuń psb-* z works[]
      · batch-set · assert brak
      · finally cleanup · exit 4 przy leftovers
      · brak orphan psb-* w obu regionach (weryfikacja)

H5.5  Closeout tooling
      · README · report fields · Owner Verification checklist
```

**Jeden bundle = tylko H5** (#PSB-010). Nie łączyć z H3-B, cost-catalog, Core, UI ACL.

---

## 5. Punkty REUSE z H0 i H4

| Punkt | H0 | H4 | H5 (PLAN) |
|-------|----|----|-----------|
| `runner.mjs` / exit codes 0/2/3/4 | ✅ | ✅ | **Reuse** |
| `kv-client.mjs` | ✅ | ✅ | **Reuse** — jedyny client |
| `markers.mjs` · `kind: "catalog"` · `makePsbId("catalog")` | ✅ | — | **Reuse** |
| `allowlist.mjs` · `PSB_CATALOG_ROW_IDS` | ✅ | — | **Reuse** (allowlist OR session-created) |
| `mutate-guard.mjs` | ✅ | ✅ | **Reuse** |
| `cleanup.mjs` · PSB-001 | ✅ | ✅ | **Reuse** |
| `report.mjs` | ✅ | ✅ | **Reuse** |
| `--allow-prod` · dry-run | ✅ | ✅ | **Reuse** |
| FORBIDDEN gate pattern | — | ✅ | **Reuse pattern** · osobna ALLOWED lista (work-catalog only) |
| Nested RMW + preservacja | — | ✅ (tenders) | **Reuse pattern** na `works[]` |
| Soft WARNING ≠ FAIL | — | metrics | **Reuse principle** (opcjonalne pola report) |
| `tender-helpers` / cloud seed H4 | — | ✅ | **NIE** — inna domena |
| `mergeWorkCatalogStore` | Core | — | **NIE importować do write path** |

**Zasada:** H5 = **cienki Biblioteka slice** na fundamencie H0 + wzorcu bezpieczeństwa H4 — nie fork H4 scenariusza i nie drugi H1.

---

## 6. Integracja z `kw-wgdom-work-catalog`

### 6.1 Kontrakt klucza

| | |
|--|--|
| **KV key** | `kw-wgdom-work-catalog` |
| **SSOT typ** | `WorkCatalogStore` (`schemaVersion` 4) |
| **Kolekcja wierszy** | `catalogs[region].works: CatalogWork[]` |
| **Keyword AC** | `CatalogWork.keywords: string[]` na wierszu sandbox |
| **Merge app** | `mergeWorkCatalogStore` = LWW **całego** store po `updatedAt` — harness musi RMW + bump czasu |

### 6.2 Minimalny wiersz sandbox (do zamrożenia w DF)

Pola **wymagane** do stabilnego create (orientacja PLAN — DF doprecyzuje enumy):

| Pole | Reguła PLAN |
|------|-------------|
| `id` | `psb-…` (session) **lub** allowlist catalog id |
| `namePl` | prefix `psb-` (czytelność + D6) |
| `keywords` | niepusta tablica testowa (np. `["psb-h5-kw"]`) |
| `tradeId` / `unit` / `companyPricePln` / `freshnessStatus` / `active` / `source` / `updatedAt` | wartości minimalne zgodne z normalizerem produktu — **bez** kopiowania logiki merge; DF zamrozi stałe fixture |
| `source` | prefer `"custom"` (nie udawać seed) |

### 6.3 Przepływ RMW (logiczny — nie kod)

```text
get(store)
  → deep-preserve catalogs / works non-psb-*
  → apply mutation tylko na psb-* w wybranym regionie
  → store.updatedAt = now (ISO)
  → set(store)
  → get · assert
```

**Zakaz:** `batch-set` pustego / default-only store; `batch-set` bez prior get; write do drugiego klucza „przy okazji”.

### 6.4 Supersession Parent AC

| Parent (stary) | H5 PLAN (nowy) |
|----------------|----------------|
| Persist assert `kw-wgdom-cost-catalog` | Persist assert **`kw-wgdom-work-catalog`** |
| „row” w cost categories | **`CatalogWork`** w `works[]` |

---

## 7. Mechanizmy ochrony

### 7.1 P0 wipe

| Kontrola | Opis |
|----------|------|
| RMW obowiązkowy | Zawsze `batch-get` przed pierwszym write |
| Preservacja | Asercja: liczba (lub fingerprint) non-`psb-*` works **nie maleje** po create/edit; po delete wraca do baseline non-psb |
| Zakaz replace-all „from scratch” | Payload = produkcja ∪ mutacja sandbox |
| Region isolation | Mutacja w jednym regionie; drugi region: zero ubytku non-psb |
| LWW race | Bump `updatedAt` na store; nie pisać starszego snapshotu |

### 7.2 Orphan `psb-*`

| Kontrola | Opis |
|----------|------|
| Session register | Każdy utworzony id → `CleanupTracker` / markers `kind: catalog` |
| PSB-001 | `finally` zawsze — PASS i FAIL mid-run |
| Exit 4 | Leftover `psb-*` w work-catalog po cleanup |
| Dual-region scan | Cleanup / leftover check na `wroclaw` **i** `dolnyslask` |
| Dry-run | Zero create → cleanup no-op OK |

### 7.3 Keyword seed contamination

| Kontrola | Opis |
|----------|------|
| **REJECT cost-catalog** | Zero read-modify-write `kw-wgdom-cost-catalog` |
| FORBIDDEN key | `kw-wgdom-cost-catalog` (+ history opcjonalnie deny write) na liście H5 |
| Scope keywords | Tylko `CatalogWork.keywords` wiersza `psb-*` |
| Asercja non-psb | Po edit: keywords non-`psb-*` **niezmienione** (snapshot przed/po) |
| Brak mutacji kategorii ATH | Zero kontaktu z `WgdomCostCategoryDef.keywords` |

### 7.4 Pozostałe (Payroll / Theme / Edge / Core)

| Mechanizm | |
|-----------|--|
| FORBIDDEN payroll/auth/billing | Jak H4 |
| Zero Theme / UI version | Tooling-only |
| Zero Edge code change | Tylko istniejące API via `kv-client` |
| D5 | Brak PR do `src/lib/**` produktu w bundle H5 |
| `--allow-prod` | Wymagane dla write |
| Mutate-guard | Tylko allowlist / session `psb-*` |

---

## 8. Kryteria PASS / FAIL / WARNING

### 8.1 Uruchomienie (docelowe)

```text
npm run test:prod-sandbox -- --scenario h5-biblioteka --dry-run
npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod
npm run test:infra -- --suite prod-sandbox-h5   # manual / Owner
```

### 8.2 Kryteria

| Wynik | Warunek |
|-------|---------|
| **PASS (0)** | Preflight OK · create `psb-*` + keywords widoczne po get · edit widoczny · delete = brak wiersza · non-`psb-*` zachowane · cleanup 0 leftovers · zero write poza `kw-wgdom-work-catalog` · report zapisany |
| **WARNING** | Opcjonalne pola report (np. brak UI verify) — **nie** zmienia exit na FAIL |
| **FAIL precondition (2)** | Brak `--allow-prod` · FORBIDDEN key · `PSB_MUTATE_DENIED` · dry-run violation |
| **FAIL scenario (3)** | `batch-set` 5xx / `ok:false` · parity fail · ubytek non-`psb-*` · zmiana keywords non-sandbox · write do cost-catalog |
| **FAIL cleanup (4)** | PSB-001 leftovers (`psb-*` nadal w store) |

### 8.3 Co **nie** jest kryterium PASS

- Widoczność przycisku Biblioteka w UI / ACL admin
- Mutacja / obecność `kw-wgdom-cost-catalog`
- Playwright login
- Zmiana `version.json` / CHANGELOG UI
- Gate B/C CI green

---

## 9. Definition of Done

H5 IMPLEMENT uznaje się za **COMPLETE** (przed Owner Verification) gdy:

1. `h5-biblioteka` zarejestrowany · dry-run exit **0** · allow-prod CRUD round-trip **PASS** na prod.  
2. Write-surface = **tylko** `kw-wgdom-work-catalog` · cost-catalog **nietknięty**.  
3. Report w `.tmp/prod-sandbox-out/**`: steps, mutatedIds, cleanup, preservacja non-psb.  
4. Zero diff w Protected Core / Payroll / Theme / Edge / `src/lib/work-catalog/**` / cost-catalog libs.  
5. Manifest `PROD-SANDBOX-H5` · README zaktualizowane · FORBIDDEN gate aktywny.  
6. Cleanup PSB-001 PASS także na ścieżce FAIL mid-run (zaprojektowane w DF).  
7. Brak nowego KV · brak Playwright jako hard dependency PASS.  
8. Owner Verification checklist przygotowany (commit/push tylko na osobne GO).

**Release tooling:** UI version **bez bumpu** (jak H0–H4), o ile Owner nie zdecyduje inaczej.

---

## 10. Potwierdzenie braku wpływu (D5 / Payroll / Theme / Edge)

| Warstwa | Wpływ H5 PLAN | Dowód zakresu |
|---------|---------------|---------------|
| **D5 ZERO Core** | **BRAK** | Zakaz edycji `cloud-sync.ts`, merge, CloudLoader, fence |
| **Payroll** | **BRAK** | FORBIDDEN keys · zero week/roster |
| **Theme** | **BRAK** | Brak plików theme / UI shell |
| **Edge Function** | **BRAK zmian kodu** | Tylko istniejący `batch-get`/`batch-set` via `kv-client` |
| **Production app behavior** | **BRAK zamierzonej zmiany** | Tooling-only · transient `psb-*` z cleanup |
| **Cost catalog / ATH** | **BRAK** | REJECT + FORBIDDEN write |

---

## 11. Ryzyka i mitygacje (PLAN)

| Ryzyko | P | Mitygacja |
|--------|---|-----------|
| Wipe non-`psb-*` | P0 | RMW + asercja preservacji |
| Orphan `psb-*` | P0 | PSB-001 dual-region |
| Keyword seed (cost-catalog) | P0 | REJECT + FORBIDDEN |
| LWW race app↔harness | P1 | Bump `updatedAt` · krótki run · nie pisać stale get |
| Schema/normalizer reject minimal row | P1 | DF zamrozi minimalny fixture zgodny z produktem |
| Scope creep (UI ACL / bundles) | P1 | OUT list · jeden bundle |
| Agent „naprawi” cost-catalog sync | P0 | D5 + RCA REJECT w DF checklist |

---

## 12. Open questions dla DESIGN FREEZE (nie blokują PLAN)

| # | Pytanie | Domyślna rekomendacja PLAN |
|---|---------|----------------------------|
| Q1 | Region mutacji: tylko `activeRegion` vs zawsze `wroclaw` | **activeRegion** z get; fallback `wroclaw` |
| Q2 | Minimalny zestaw pól `CatalogWork` | DF zamrozi stałe fixture (tradeId/unit/price/…) |
| Q3 | Czy allowlist `PSB_CATALOG_ROW_IDS` wymagany gdy always-create? | **Nie** — always-create `psb-*` + cleanup wystarczy (jak H1/H4) |
| Q4 | Soft UI Playwright verify | **OUT MVP** — WARNING opcjonalny później |

---

## 13. Wejście do DESIGN FREEZE (stop gate)

| | |
|--|--|
| **Status PLAN** | **COMPLETE · READY FOR DESIGN FREEZE** |
| **Następny etap** | DESIGN FREEZE — tylko po Owner GO |
| **IMPLEMENT** | **BLOCKED** |

```text
PLAN COMPLETE → czekaj OWNER GO
  „GO DESIGN FREEZE TEST-HARNESS-01 H5”
Bez GO: zero DF / ARCH REVIEW / kodu / commit / push / bump wersji.
```

**SSOT łańcuch:** AUDIT → RCA → **ten PLAN** → (DF) → (ARCH REVIEW) → (IMPLEMENT GO).

**Koniec PLAN H5**
