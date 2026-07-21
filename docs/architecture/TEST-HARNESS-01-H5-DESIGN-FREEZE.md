# TEST-HARNESS-01 H5 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO IMPLEMENT  
> **Data:** 2026-07-20  
> **Owner GO DESIGN FREEZE:** ✅  
> **Baseline prod:** UI **2.65.35** · tip **`1addd97`** · app feature **`fce7b78`** · **GREEN**  
> **Wejście:** [`TEST-HARNESS-01-H5-AUDIT.md`](TEST-HARNESS-01-H5-AUDIT.md) · [`TEST-HARNESS-01-H5-RCA.md`](TEST-HARNESS-01-H5-RCA.md) · [`TEST-HARNESS-01-H5-PLAN.md`](TEST-HARNESS-01-H5-PLAN.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 Biblioteka AC — **superseded klucz persist** (§2.1)  
> **IMPLEMENT:** **BLOCKED**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · MOBILE FIRST · D5 ZERO Core

---

## 0. Dziedziczenie H0 / H4 (bez zmian kontraktu parent)

| Zasada | H5 |
|--------|-----|
| D1 Marked entities | **TAK** — `CatalogWork` `psb-*` |
| D4 No new KV | **TAK** |
| D5 Zero Protected Core | **TAK** — twarde |
| D6 Prefix `psb-*` | **TAK** — `id` i `namePl` |
| D8 Mutate guard | **TAK** — przed każdym write |
| PSB-001 Cleanup Guarantee | **TAK** — `finally` PASS i FAIL · dual-region scan |
| #PSB-003 `--allow-prod` | **WYMAGANE** dla write na prod |
| #PSB-004 Dry-run | **TAK** — zero `batch-set` |
| #PSB-008/009 | **TAK** — brak ownership merge Core / klasyfikacji |
| #PSB-010 One bundle | **TAK** — tylko H5 |
| #PSB-≠-TI | **TAK** |
| H4 KV-only + FORBIDDEN + RMW | **TAK** — wzorzec bezpieczeństwa |
| H4 write `kw-tenders-pipeline` | **NIE** — H5 nie pisze kluczy H1/H4 |
| H1/H2 Playwright UI | **NIE** — H5 = **KV-only** |
| H3-A payroll RO | **NIE mieszać** |
| cost-catalog write | **ZAKAZ** (RCA REJECT) |
| H0.x Persist Ledger | **NIE w H5** |
| Dual-writer / N2 | **ZAKAZ** |

---

## 1. Cel zamrożony

Automatyczny scenariusz **`h5-biblioteka`** na prod: bezpieczny CRUD wiersza sandbox Biblioteki Robót

```text
batch-get kw-wgdom-work-catalog
  → CREATE CatalogWork psb-* + keywords
  → EDIT (keywords / namePl) tylko psb-*
  → DELETE psb-*
  → parity po każdym kroku
  → PSB-001 cleanup (0 orphan)
```

wyłącznie na **`kw-wgdom-work-catalog`**, z RMW anti-wipe, FORBIDDEN (w tym cost-catalog), bez zmian Protected Core, bez Playwright jako hard dependency, bez nowego KV.

---

## 2. Ostateczna architektura H5

```text
                    ┌──────────────────────────────┐
                    │  runner.mjs (--scenario h5)  │
                    └──────────────┬───────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   H0 preflight              h5-biblioteka.mjs           report.mjs
   allowlist/markers         (orchestration)             .tmp/.../report.json
   mutate-guard                    │
   cleanup tracker                 │
         │                         ▼
         │              ┌──────────────────────┐
         │              │ catalog-helpers.mjs  │
         │              │ build/upsert/remove  │
         │              │ psb-* in store shape │
         │              └──────────┬───────────┘
         │                         │
         │                         ▼
         │              ┌──────────────────────┐
         │              │ kv-client.mjs (SSOT) │
         │              │ batchGet / batchSet  │
         │              └──────────┬───────────┘
         │                         │
         │                         ▼
         │              Edge make-server-0afb8820
         │                         │
         │                         ▼
         │              kw-wgdom-work-catalog
         │              (CatalogWork[] per region)
         │
         └──────────► FORBIDDEN keys hard-deny
                      (payroll / auth / billing /
                       cost-catalog / bundles /
                       tenders / jobs)
```

**Warstwy:**

| Warstwa | Rola H5 |
|---------|---------|
| Harness (`test-infra/prod-sandbox`) | Jedyna warstwa zmian |
| Edge KV | Transport — raw `kv-client` |
| App `mergeWorkCatalogStore` | **Poza ścieżką write** — harness nie importuje merge; LWW respektowane przez bump `updatedAt` |
| UI / Playwright / ACL Biblioteka | **Poza MVP** (KV-only) |
| Cost catalog / ATH | **Nietknięty** — FORBIDDEN |
| Payroll Fence | **Nietknięty** — FORBIDDEN |

### 2.1 Supersession Parent AC (zamrożona)

| Parent (historyczny) | H5 DF (obowiązuje) |
|----------------------|--------------------|
| Persist `kw-wgdom-cost-catalog` | Persist **`kw-wgdom-work-catalog`** |
| „row” = category seed | **`CatalogWork`** w `catalogs[region].works[]` |

---

## 3. Decyzje H5 (D-H5-01 … D-H5-24)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H5-01** | Write-surface | **`kw-wgdom-work-catalog` only** |
| **D-H5-02** | cost-catalog | **REJECT** — zero RMW / zero keyword seed |
| **D-H5-03** | work-bundles / history | **OUT** — zero write |
| **D-H5-04** | Execution mode | **KV-only** — bez Playwright / bez loginu (PLAN Q4 **FROZEN**) |
| **D-H5-05** | Seed model | Always-create `makePsbId("catalog")` · session-created · allowlist **nie wymagany** (PLAN Q3 **FROZEN**) |
| **D-H5-06** | Region | `store.activeRegion` jeśli `wroclaw`\|`dolnyslask`; else **`wroclaw`** (PLAN Q1 **FROZEN**) |
| **D-H5-07** | Entity shape | Minimal `CatalogWork` — §5.4 fixture **FROZEN** |
| **D-H5-08** | Keyword AC | `keywords` na wierszu `psb-*` · niepusta tablica testowa |
| **D-H5-09** | RMW rule | `batch-get` → mutate tylko `psb-*` w jednym regionie → bump `updatedAt` (store + slice) → `batch-set` |
| **D-H5-10** | Wipe ban | Zakaz set pustego/default-only store · zakaz drop non-`psb-*` |
| **D-H5-11** | Preservacja assert | Po create/edit: fingerprint/count non-`psb-*` ≥ baseline; keywords non-psb niezmienione |
| **D-H5-12** | Dual-region orphan | Cleanup + leftover check na **obu** regionach |
| **D-H5-13** | Parity | Po create: id+keywords; po edit: nowe keywords; po delete: brak id |
| **D-H5-14** | `ok:true` | Wymagane na sukces `batch-set` |
| **D-H5-15** | Soft WARNING | Opcjonalne UI-verify / report extras — **nigdy** FAIL |
| **D-H5-16** | New KV | **ZAKAZ** (D4) |
| **D-H5-17** | Core / Edge / Payroll / Theme | **Zero** zmian produkcyjnych (D5) |
| **D-H5-18** | CLI | `npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod` |
| **D-H5-19** | Alias | `h5` → `h5-biblioteka` |
| **D-H5-20** | CI | Manual / Owner only — **nie** gate B/C |
| **D-H5-21** | UI version bump | **NIE** (tooling-only) |
| **D-H5-22** | Scope lock | Zakaz H3-B/C · H0.x · cost-catalog sync revive · UI ACL · bundles · N2 w tym samym bundle |
| **D-H5-23** | Helper | **Wymagany** `catalog-helpers.mjs` — cienki; **zakaz** importu `mergeWorkCatalogStore` |
| **D-H5-24** | H4 tenders/jobs keys | H5 **nie** `batch-set` `kw-tenders-*` / `kw-jobs*` |

---

## 4. Principles H5 (#H5-001 … #H5-014)

| # | Principle |
|---|-----------|
| **#H5-001** | Never write `kw-wgdom-cost-catalog` (or mutate its seed keywords) |
| **#H5-002** | Never full-replace work-catalog without preserving non-`psb-*` works |
| **#H5-003** | Never `batch-set` FORBIDDEN keys |
| **#H5-004** | Never touch Payroll / Theme / Edge code / Core merge |
| **#H5-005** | Never import or reimplement `mergeWorkCatalogStore` in harness write path |
| **#H5-006** | Always RMW: get → mutate psb-* → bump `updatedAt` → set |
| **#H5-007** | Cleanup in `finally` (PASS and FAIL) — PSB-001 dual-region |
| **#H5-008** | `--allow-prod` required for prod write; dry-run forbids `batch-set` |
| **#H5-009** | KV-only MVP — no Playwright dependency for PASS |
| **#H5-010** | One scenario bundle = H5 only |
| **#H5-011** | Reuse `kv-client` + H0 guards + H4 FORBIDDEN pattern — no duplicate clients |
| **#H5-012** | Keywords only on sandbox `CatalogWork` — assert non-psb keywords unchanged |
| **#H5-013** | Reports gitignored (`.tmp/prod-sandbox-out/`) |
| **#H5-014** | Fail-loud `PSB_*` / `H5_FORBIDDEN_KEY` preconditions |

---

## 5. Zamrożone interfejsy i przepływy danych

### 5.1 CLI (kontrakt)

```text
npm run test:prod-sandbox -- --scenario h5-biblioteka
npm run test:prod-sandbox -- --scenario h5-biblioteka --dry-run
npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod
npm run test:prod-sandbox -- --scenario h5              # alias → h5-biblioteka
npm run test:infra -- --suite prod-sandbox-h5           # manual / Owner
```

Exit codes (parent DF §6): **0** PASS · **2** precondition · **3** scenario FAIL · **4** cleanup FAIL.

### 5.2 Przepływ danych (zamrożony)

```text
preflight (H0 + --allow-prod | dry-run)
  → FORBIDDEN gate ready (H5 allowlist write)
  → id = makePsbId("catalog") + session.registerCreated(kind: catalog)
  → mutateGuard.assertWritable(id, catalog)
  → cleanup.track(id, cleaner)
  → store0 = batchGet([kw-wgdom-work-catalog])
  → region = resolveRegion(store0)   // D-H5-06
  → baseline = snapshotNonPsb(store0, both regions)
  → dry-run? → plan steps, exit PASS without set
  → store1 = upsertPsbWork(store0, region, fixture(id))  // CREATE + keywords
  → bumpUpdatedAt(store1)
  → batchSet([kw-wgdom-work-catalog], [store1]) → ok:true
  → assert create + keywords · preservacja non-psb
  → store2 = editPsbWork(store1, id, { keywords: [...] })  // EDIT
  → bumpUpdatedAt(store2) → batchSet → assert edit · non-psb keywords unchanged
  → store3 = removePsbWork(store2, id)  // DELETE
  → bumpUpdatedAt(store3) → batchSet → assert absent
  → finally cleaner:
        remove any remaining psb-* for this session id (both regions)
        batchSet if needed
  → verify absent both regions · PSB-001 empty leftovers
```

### 5.3 Report fields (min.)

| Pole | Wymagane |
|------|----------|
| `scenario` = `h5-biblioteka` | TAK |
| `steps[]` (create/edit/delete/cleanup) | TAK |
| `writeKey` = `kw-wgdom-work-catalog` | TAK |
| `region` | TAK |
| `mutatedIds` | TAK |
| `cleanup` status/code | TAK |
| `preservation.nonPsbBefore/After` | TAK |
| `preservation.nonPsbKeywordsUnchanged` | TAK |
| Artefakt | `.tmp/prod-sandbox-out/<runId>/report.json` |

### 5.4 Fixture `CatalogWork` (zamrożony minimalny kształt)

| Pole | Wartość zamrożona |
|------|-------------------|
| `id` | session `psb-…` |
| `namePl` | `"psb-h5-" + shortId` (prefix `psb-`) |
| `tradeId` | **`MALOWANIE`** (pierwszy element `TRADE_IDS` — zamrożony) |
| `unit` | `"szt"` |
| `companyPricePln` | `1` |
| `keywords` | `["psb-h5-kw"]` przy create; edit → `["psb-h5-kw-edited"]` |
| `freshnessStatus` | `"ok"` |
| `active` | `true` |
| `favorite` | `false` |
| `usageCount` | `0` |
| `source` | `"custom"` |
| `updatedAt` | ISO now |
| `marketQuotes` / legacy market fields | **pominięte** (opcjonalne) |
| `legacyCategoryId` / `costSplit` | **pominięte** |

**Zasada:** fixture wystarczająco bogaty, by raw store przeszedł typowy normalize po stronie app **bez** wywoływania merge w harnessie. Jeśli normalizer prod odrzuci wiersz — **FAIL scenario (3)**, nie „naprawa” Core.

---

## 6. FORBIDDEN / ALLOWED / anti-wipe / PSB-001 (zamrożone)

### 6.1 FORBIDDEN write (hard deny przed każdym `batch-set`)

| Grupa | Klucze |
|-------|--------|
| Payroll | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`, `kw-week-employees-deleted-ids`, `kw-employee-leaves`, `kw-employee-leaves-deleted-ids` |
| Auth/ACL | `kw-admin-hash`, `kw-admin-passwords`, `kw-admin-users-config`, `kw-app-settings` |
| Billing | `kw-recoverable-charges` (+ deleted-ids) |
| **Cost catalog (H5)** | **`kw-wgdom-cost-catalog`**, `kw-wgdom-cost-catalog-history` |
| **Bundles** | **`kw-wgdom-work-bundles`** |
| **Inne domeny PSB** | `kw-tenders-pipeline`, `kw-tenders-deleted-ids`, `kw-jobs`, `kw-jobs-deleted-ids` |

Naruszenie → exit **2** (`H5_FORBIDDEN_KEY` / `PSB_*`).

**Implementacja gate:** REUSE pattern z `forbidden-keys.mjs` (H4) — rozszerzenie o H5 ALLOWED/FORBIDDEN **bez** duplikacji listy payroll (wspólny zbiór bazowy + H5-specific).

### 6.2 ALLOWED write (wyłącznie)

| Klucz | Operacja |
|-------|----------|
| **`kw-wgdom-work-catalog`** | nested upsert/edit/remove `psb-*` w `works[]` + bump `updatedAt` |

### 6.3 RMW anti-wipe (zamrożone)

1. Każdy write poprzedzony `batch-get` tego samego klucza.  
2. Mutacja wyłącznie wierszy spełniających `isPsbId(id)` **lub** session-registered id.  
3. Po create/edit: `nonPsbCount(region) >= baseline` **oraz** drugi region bez ubytku non-psb.  
4. Po edit: hash/JSON keywords wszystkich non-psb **identyczny** jak baseline.  
5. Zakaz `batch-set` bez prior get w tej samej sesji kroku.

### 6.4 PSB-001 orphan (zamrożone)

1. `cleanup.track` przed pierwszym write.  
2. `finally` zawsze — także po FAIL mid-edit.  
3. Cleaner usuwa session id z **obu** regionów.  
4. Leftover scan: dowolne `psb-*` z tej sesji → exit **4**.  
5. Dry-run: zero track write → cleanup no-op PASS.

### 6.5 Keyword seed contamination (zamrożone)

| Reguła |
|--------|
| Zero kontaktu z `kw-wgdom-cost-catalog` |
| Keywords tylko na `CatalogWork` `psb-*` |
| Asercja non-psb keywords unchanged |
| Zakaz „przywracania” sync cost-catalog w bundle H5 |

---

## 7. Potwierdzenie D5 ZERO Core · Payroll · Theme · Edge

| Obszar | H5 zmienia? |
|--------|-------------|
| `src/lib/cloud-sync.ts` | **NIE** |
| `src/lib/work-catalog/**` (merge/store/sync) | **NIE** |
| `src/lib/wgdom-cost-catalog*` | **NIE** |
| `src/lib/payroll-*` / fence | **NIE** |
| Edge `make-server-0afb8820` | **NIE** |
| Theme / App Core / changelog UI / `version.json` | **NIE** |
| `test-infra/prod-sandbox/**` + manifest + thin script + docs H5 | **TAK** (jedyny zakres) |

**Potwierdzenie DF:** H5 = Path A FEATURE/test-infra · **D5 ZERO Core unchanged** · Payroll/Theme/Edge **bez wpływu kodu**.

---

## 8. Integracja H0 / H4

| Komponent | Integracja H5 |
|-----------|----------------|
| `markers.mjs` | `makePsbId("catalog")` · `kind: "catalog"` · `isPsbId` |
| `allowlist.mjs` | Session-created wystarczy; `PSB_CATALOG_ROW_IDS` opcjonalne |
| `mutate-guard.mjs` | Przed każdym write |
| `cleanup.mjs` | Tracker + PSB-001 |
| `report.mjs` | D11 JSON + pola §5.3 |
| `kv-client.mjs` | **Jedyny** Edge client |
| `forbidden-keys.mjs` | Rozszerzenie H5 ALLOWED/FORBIDDEN (pattern H4) |
| H4 `h4-cloud.mjs` | **Nie wywoływać** — tylko wzorzec RMW/gate |
| `tender-helpers` / `job-helpers` / `payroll-helpers` | **NIE** |
| `catalog-helpers.mjs` | **NOWY** — jedyny builder store shape dla H5 |

---

## 9. Sekwencja implementacji H5.0 → H5.5 (zamrożona)

```text
H5.0  Wiring — runner + manifest PROD-SANDBOX-H5 + dry-run parity
H5.1  Protection gate — FORBIDDEN/ALLOWED + mutate-guard + dry-run zero set
H5.2  Create + keyword — RMW upsert + preservacja + parity
H5.3  Edit — keywords (i/lub namePl) + non-psb keywords unchanged
H5.4  Delete + PSB-001 cleanup — dual-region · exit 4 leftovers
H5.5  Closeout tooling — README · report · Owner Verification checklist
```

Kolejność **obowiązkowa**. Nie łączyć z innymi slice’ami.

---

## 10. Ostateczna lista plików (scope lock)

### 10.1 Pliki do zmiany / utworzenia (IN)

| Plik | Akcja |
|------|-------|
| `test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs` | CREATE |
| `test-infra/prod-sandbox/catalog-helpers.mjs` | CREATE |
| `test-infra/prod-sandbox/runner.mjs` | MODIFY (register `h5-biblioteka` / `h5`) |
| `test-infra/prod-sandbox/forbidden-keys.mjs` | MODIFY (H5 gate) |
| `test-infra/prod-sandbox/README.md` | MODIFY |
| `scripts/test-prod-sandbox-h5.mjs` | CREATE |
| `test-infra/test-manifest.json` | MODIFY (`prod-sandbox-h5` · `PROD-SANDBOX-H5`) |
| Docs `TEST-HARNESS-01-H5-*` | Już / dalsze etapy docs — poza kodem produktu |

### 10.2 Pliki zakazane (OUT)

Wszystkie `src/**` produktu · Edge · Payroll · Theme · cost-catalog revive · H3-B/C · H0.x · N2 · Playwright mandatory · nowy KV.

### 10.3 Scope lock

Zmiana któregokolwiek z: Playwright hard PASS · cost-catalog write · Core merge · payroll keys · bundles · UI ACL · Gate B/C auto · bump UI version  
→ **wymaga nowego Owner GO** (poza tym DF).

---

## 11. Kryteria PASS / FAIL / WARNING (zamrożone)

| Wynik | Warunek |
|-------|---------|
| **PASS (0)** | Create+keywords · edit · delete parity · non-psb preservacja · non-psb keywords unchanged · cleanup 0 leftovers · tylko `kw-wgdom-work-catalog` · report OK |
| **WARNING** | Soft extras (np. brak UI) — nie zmienia exit |
| **FAIL (2)** | Brak `--allow-prod` · FORBIDDEN · `PSB_MUTATE_DENIED` · dry-run set attempt |
| **FAIL (3)** | 5xx / `ok:false` · parity fail · wipe non-psb · keyword contamination non-psb · write złego klucza |
| **FAIL (4)** | PSB-001 leftovers |

**Nie jest PASS:** UI Biblioteka · cost-catalog · `version.json` · CI Gate B/C.

---

## 12. Definition of Done (zamrożone)

H5 IMPLEMENT = **COMPLETE** (przed Owner Verification) gdy:

1. `h5-biblioteka` zarejestrowany · dry-run **0** · allow-prod CRUD **PASS**.  
2. Write-surface wyłącznie `kw-wgdom-work-catalog` · cost-catalog nietknięty.  
3. Report z polami §5.3.  
4. Zero diff Core / Payroll / Theme / Edge / `src/lib/work-catalog/**`.  
5. Manifest + README + FORBIDDEN gate.  
6. Cleanup PSB-001 na PASS i FAIL mid-run.  
7. Brak nowego KV · brak Playwright hard dependency.  
8. Owner Verification checklist gotowy (commit/push na osobne GO).

---

## 13. Acceptance — DESIGN FREEZE COMPLETE gdy

1. Owner akceptuje D-H5-01…24 + #H5-001…014.  
2. Owner akceptuje supersession parent AC → work-catalog.  
3. Owner akceptuje fixture §5.4 + region D-H5-06.  
4. Jawne Owner GO: `IMPLEMENT TEST-HARNESS-01 H5` (po ARCH REVIEW + Owner GO IMPLEMENT).

---

## 14. Wejście do ARCH REVIEW (stop gate)

| | |
|--|--|
| **Status DF** | **COMPLETE · READY FOR ARCH REVIEW** |
| **Następny etap** | ARCHITECTURE REVIEW — tylko po Owner GO |
| **IMPLEMENT** | **BLOCKED** |

```text
DESIGN FREEZE COMPLETE → czekaj OWNER GO
  „GO ARCH REVIEW TEST-HARNESS-01 H5”
Bez GO: zero ARCH REVIEW / kodu / commit / push / bump wersji.
```

**SSOT łańcuch:** AUDIT → RCA → PLAN → **ten DF** → (ARCH REVIEW) → (Owner GO IMPLEMENT).

**Koniec DESIGN FREEZE H5**
