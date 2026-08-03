# MARKET-SYNC-01 P3 — DESIGN FREEZE

> **ID:** MARKET-SYNC-01-P3-DESIGN-FREEZE  
> **EPIC:** MARKET-SYNC-01 · **Slice:** **P3** — Ingest adapter spine (Legal-gated)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **IMPLEMENT ZABLOKOWANY** do Owner **GO IMPLEMENT** (+ Legal PASS dla live)  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO CODE**  
> **Data:** 2026-08-03  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE\*** (\*G2 = FEATURE flag/staging — nie Payroll)  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT [`MARKET-SYNC-01-P3-AUDIT.md`](./MARKET-SYNC-01-P3-AUDIT.md)  
> **SSOT P2:** [`MARKET-SYNC-01-P2-CLOSE.md`](./MARKET-SYNC-01-P2-CLOSE.md)  
> **Parents:** [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) · [`MARKET-SYNC-01-AUDIT.md`](./MARKET-SYNC-01-AUDIT.md) · P1 [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md) · P0 [`MARKET-SYNC-01-P0-CLOSEOUT.md`](./MARKET-SYNC-01-P0-CLOSEOUT.md)  
> **Baseline:** UI **2.65.95** / feature tip **`18830c1`** · Docs **`99969f33`** · **GREEN** · **PRODUCTION VERIFIED**  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (MARKET-SYNC-01 P3):
  Zamrozić JEDEN ingest adapter → staging Preview
  + flaga P3 default OFF
  + single-provider architecture
  — BEZ live HTTP/scrape do Legal PASS (Legal Gate = OPEN · BLOCKER)
  — BEZ auto-publish · BEZ cron
  — BEZ drugiego write Quotes
  — BEZ Cloud CORE · Payroll · AI-COST · SMART Save

Pipeline FROZEN (nie zmieniać):
  Ingest/CSV → Normalize · Match → Staging Preview
  → Accept → Guard → Dry Run → Delta → Summary
  → Kill Switch → commitMarketQuotesImport → Undo single

IMPLEMENT zakazany do: Owner GO IMPLEMENT.
LIVE ingest (network/scrape) zakazany do: Legal PASS + GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — MARKET-SYNC-01 P3

G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE: kw-market-sync-01-p3 + staging —
                        bez migracji LP / Storage CORE)
G3 Cloud Sync:   NIE*  (*publish Quotes = wyłącznie istniejący P1
                        commitMarketQuotesImport — ZERO rewrite cloud-sync.ts /
                        ZERO nowego DATA_KEYS)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
Owner GO IMPLEMENT: dopiero po ACCEPTED DF + osobnym GO
Legal Gate: OPEN → blocks LIVE implementation (D-P3-10)
```

Naruszenie G3 / Payroll / nowego DATA_KEY Cloud / auto-publish / cron → **STOP** · amend DF.

---

## 1. Objective (zamrożony)

Zamrozić **cienkie rozszerzenie ops** Market Sync:

1. **Jeden** interfejs `MarketSyncIngestAdapter` + implementacja **mock** (fixture) → SyncRun → istniejący tor Preview.  
2. **Feature flag** `kw-market-sync-01-p3` default **OFF** (tip parity).  
3. **Single-provider** — dokładnie jeden `providerId` w scope tego slice IMPLEMENT.  
4. **Legal Gate OPEN** — blokuje **live** ingest (HTTP / scraper / credentials); mock-only dozwolony po GO IMPLEMENT.  
5. **ZERO** zmian semantyki: Preview → Accept → `commitMarketQuotesImport`.

**Sukces P3 (ten DF) ≠** live scrape · **≠** multi-shop · **≠** auto-publish.  
**Sukces P3 =** AC-MS-P3-* · flaga OFF = tip parity · Legal blocker egzekwowany · regresja P0/P1/P2 + K-MS-4 PASS.

**Thin slice tego DF:** = AUDIT **P3-A** (spine + mock).  
**P3-B (live 1 provider)** = **poza** tym DF — wymaga Legal PASS + amend DF lub nowy DF + Owner GO.

---

## 2. Architecture (zamrożona)

### 2.1 Pipeline (FROZEN — odziedziczony P0–P2)

```text
[P3 NEW] IngestAdapter.run(ctx) → raw rows / CSV-equivalent
              │
              ▼
         Normalize · Match          ← REUSE P0
              │
              ▼
         Staging Preview            ← kw-market-sync-01-staging (FEATURE)
              │
              ▼
         Accept / Reject / Defer    ← REUSE P1 (+ P2 history gdy P2 ON)
              │
              ▼
         Guard · Dry Run · Delta · Summary
              │
              ▼
         Kill Switch (default OFF)
              │
              ▼
         runMarketSyncPublish
              → commitMarketQuotesImport   ★ JEDYNY WRITE Quotes
              │
              ▼
         Undo single
```

**Zakaz omijania** dowolnego kroku Preview / Accept / KS przed Publish.

### 2.2 Komponenty P3 (FROZEN)

| Komponent | Rola |
|-----------|------|
| `p3-flag.ts` | Flaga LS · default OFF |
| `ingest-adapter.ts` | **Jeden** interfejs + **jedna** implementacja w slice (`MockIngestAdapter`) |
| `ingest-run.ts` | Pure/orchestration: adapter → normalize/import path → staging (bez Publish) |
| UI thin CTA | „Pobierz (P3 / mock)” widoczne **tylko** gdy flaga ON · **nie** „Auto-publish” |
| Types | Rozszerzenie `MarketSyncSourceKind` o `licensed_api` \| `scraper` (meta SyncRun) — **użycie live** = Legal PASS |

### 2.3 Single-provider + one adapter (FROZEN)

```text
W jednym IMPLEMENT slice P3:
  · dokładnie 1× MarketSyncIngestAdapter implementation (Mock)
  · dokładnie 1× providerId bound w ctx / config (D-P3-02)
  · 0× drugi adapter równoległy
  · 0× multi-provider fan-out
```

Drugi provider / live adapter = **nowy** GO (+ Legal dla tego kanału).

### 2.4 Legal Gate (FROZEN · OPEN)

| Stan | Znaczenie |
|------|-----------|
| **Legal Gate = OPEN** | Brak Owner Legal PASS w repo / sesji |
| **Mock IMPLEMENT** | Dozwolony **po** GO IMPLEMENT · **bez** network |
| **Live IMPLEMENT** | **ZABLOKOWANY** do Legal PASS + jawnego Owner GO (D-P3-10) |
| **Scraper live** | Dodatkowo wymaga D-P3-01 ścieżki scraper + Legal PASS — **OUT** tego DF IMPLEMENT |

---

## 3. Decyzje D-P3-01…D-P3-10 (FROZEN)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P3-01** | Kanał w scope tego DF | **`licensed_api` first** w typach/meta · **scraper live = OUT** tego DF (dopiero amend + Legal PASS). Mock używa `sourceKind` testowy / `manual`\|`csv_export` równoważny fixture |
| **D-P3-02** | Provider | **Single-provider only** — dokładnie **jeden** `providerId` wybrany przy GO IMPLEMENT spośród: `obi` \| `bricoman` \| `psb` \| `leroy` \| `castorama` \| `other`. Multi-shop = **OUT** |
| **D-P3-03** | Flaga | **`kw-market-sync-01-p3`** · default **OFF** · moduł `p3-flag.ts` |
| **D-P3-04** | Trigger ingest | **Tylko** manual Admin CTA · **zero** cron / scheduler / Edge timer |
| **D-P3-05** | Secrets | **Zakaz** sekretów w FE bundle · mock bez credentials · live secrets = poza tym DF (Owner + ewentualny CORE brief) |
| **D-P3-06** | Persist | Wyłącznie **FEATURE staging** `kw-market-sync-01-staging` · **bez** `DATA_KEYS` / Cloud |
| **D-P3-07** | Quotes write | **Tylko** P1 `commitMarketQuotesImport` + Kill Switch · **ZERO** nowego path · **ZERO** `applyMarketQuotes*` poza commit |
| **D-P3-08** | P2 history | **REUSE** — append przy Accept gdy P2 ON · **K-MS-4**: history **NIGDY** → average |
| **D-P3-09** | N:M / publishFactor | **OUT** — N:1 z P1 · `publishFactor = 1.0` bez UI |
| **D-P3-10** | Legal blocker | **Legal Gate pozostaje OPEN** · **blocks live implementation** · mock-only do Legal PASS |

Zmiana D-P3-\* = **amend DF** + Owner GO.

---

## 4. IN (zamrożony zakres funkcjonalny)

| ID | Wymaganie FROZEN |
|----|------------------|
| **I1** | Interfejs `MarketSyncIngestAdapter` (pure contract: input ctx → rows / errors) |
| **I2** | Dokładnie **jedna** implementacja w slice: `MockIngestAdapter` (fixture) |
| **I3** | `runMarketSyncP3Ingest` (nazwa ostateczna ⊆ IMPLEMENT) → SyncRun + staging Preview path **REUSE** P0 import/normalize/match |
| **I4** | Flaga `kw-market-sync-01-p3` default OFF · OFF = brak CTA P3 · brak auto-ingest |
| **I5** | UI: thin CTA Super Admin Market Sync · widoczne ⇔ flaga ON |
| **I6** | SyncRun / quote meta: `sourceKind` rozszerzone o `licensed_api` \| `scraper` (dla przyszłego live) — **live call = blocked** (D-P3-10) |
| **I7** | Single `providerId` w ctx ingestu (D-P3-02) |
| **I8** | Po ingest: Admin nadal robi Preview review → Accept → … → Publish jak P1 |
| **I9** | Testy: mock ingest · flag matrix · regresja P0/P1/P2 · K-MS-4 |
| **I10** | Docs OV / PV / CLOSE po ścieżce release (po GO IMPLEMENT) |
| **I11** | Legal Gate dokumentowany w UI/docs hint: „Live zablokowane — Legal OPEN” |

---

## 5. OUT (zamrożony — twarde)

```text
✗ Live HTTP / licensed API call (do Legal PASS)
✗ Live scraper / crawler / headless fetch
✗ Auto-publish / Publish bez Preview+Accept
✗ Daily cron / Edge scheduler / background worker
✗ Drugi MarketSyncIngestAdapter w tym samym slice
✗ Multi-provider / multi-shop fan-out
✗ Drugi tor Quotes / applyMarketQuotes* poza commit
✗ Rewrite commitMarketQuotesImport / kill-switch semantyki / default KS ON
✗ Cloud Sync CORE / cloud-sync.ts / nowy DATA_KEYS
✗ Payroll / bootstrap / week
✗ AI-COST (w tym I3) / Bid calculator / pricing engine / scoring / parser
✗ SMART Save / One-shot / Evidence rewrite
✗ N:M linkedWorkIds
✗ publishFactor UI / kalibracja ≠ 1.0
✗ Fuzzy match ON
✗ PriceHistory → computeMarketAverageForWork
✗ DIY enabledOrigins default ON
✗ CM-04 P3 / Wave 2 / SMART P3 (osobne GO)
✗ Re-open AC P0/P1/P2 bez amend
✗ Sekrety API w repo / client bundle
```

---

## 6. Allowlist (FROZEN)

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/lib/market-sync/types.ts` | Thin: `MarketSyncSourceKind` += `licensed_api` \| `scraper` · opc. ingest meta SyncRun |
| `src/lib/market-sync/p3-flag.ts` | **NOWY** — flaga §8 |
| `src/lib/market-sync/ingest-adapter.ts` | **NOWY** — interface + `MockIngestAdapter` |
| `src/lib/market-sync/ingest-run.ts` | **NOWY** — wire adapter → P0 import/staging (bez Publish) |
| `src/lib/market-sync/index.ts` | Re-export P3 |
| `src/app/market-sync/MarketSyncPreviewPanel.tsx` | Thin CTA P3 za flagą |
| `src/app/market-sync/MarketSyncP3*.tsx` | **NOWY** opc. thin panel/CTA |
| `scripts/test-market-sync-01-p3.mjs` | **NOWY** smoke |
| `fixtures/market-sync-01/p3-mock-*.{csv,json}` | **NOWY** opc. fixture mock |
| Regresja (run only): `test-market-sync-01-p0*.mjs` · `p1*.mjs` · `p2*.mjs` | Bez zmiany kontraktu P0–P2 |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Po IMPLEMENT + Owner GO release |
| Docs `MARKET-SYNC-01-P3-*` · tip `09` | Po release / closeout |

**Zasada:** żaden plik spoza listy. Rozszerzenie = **amend DF** + Owner GO.

**Preferuj ZERO DIFF:** `publish.ts` · `kill-switch.ts` · `guard.ts` · `dry-run.ts` · `accept.ts` (semantyka) · `commit-market-quotes.ts` · `cloud-sync.ts` · average engine · SMART · AI-COST · Payroll.

**Uwaga:** `accept.ts` — **ZERO DIFF preferowane**. Jeśli wire wymagany = **tylko** po amend DF (obecnie **OUT** allowlisty change).

---

## 7. Bloklista (FROZEN)

| Plik / obszar | Zakaz |
|---------------|-------|
| `work-catalog/commit-market-quotes.ts` | Rewrite / drugi path |
| `work-catalog/market-average-engine.ts` | Input z history / P3 |
| `cloud-sync.ts` · `DATA_KEYS` | CORE |
| Payroll\* · CloudLoader payroll | CORE |
| `tenders-bid-calculator.ts` · AI-COST\* | OUT |
| SMART Save / One-shot / Evidence | Ownership SMART |
| `supabase/functions/**` cron/scrape | OUT tego DF |
| Nowy Edge secret store „przy okazji” | CORE brief |

---

## 8. Feature Flag (zamrożony)

| Pole | Wartość FROZEN |
|------|----------------|
| **LS key** | `kw-market-sync-01-p3` |
| **Moduł** | `src/lib/market-sync/p3-flag.ts` |
| **Default** | **OFF** (`false`) |
| **ON** | raw `"1"` |
| **Test override** | `forceMarketSyncP3ForTests(on \| null)` |
| **Zakaz** | Default ON w release bez Owner GO ops |
| **Zakaz** | Wspólny toggle z Kill Switch / P2 / SMART |

```text
UI P3 + ingest CTA WIDOCZNE ⇔ isMarketSyncP3Enabled() === true
OFF ⇒ tip parity · brak mock ingest z UI · brak live
```

**Rollback L1:** `localStorage.setItem('kw-market-sync-01-p3','0')`.

---

## 9. Kontrakt adaptera (zamrożony szkic typów)

```ts
/** Semantyka FROZEN — nazwy ostateczne ⊆ IMPLEMENT */

type MarketSyncP3ProviderId = ProviderId; // dokładnie 1 w ctx

interface MarketSyncIngestContext {
  providerId: MarketSyncP3ProviderId; // D-P3-02 single
  sourceKind: "licensed_api" | "scraper" | "csv_export" | "manual";
  /** Live network — wolno tylko gdy Legal PASS; mock = false */
  allowLiveNetwork: boolean;
}

interface MarketSyncIngestResult {
  ok: boolean;
  rows: /* raw quote/product rows compatible with P0 import */;
  errors: string[];
  sourceKind: MarketSyncSourceKind;
  providerId: ProviderId;
}

interface MarketSyncIngestAdapter {
  readonly id: string; // np. "mock-v1"
  run(ctx: MarketSyncIngestContext): Promise<MarketSyncIngestResult> | MarketSyncIngestResult;
}
```

**Reguły FROZEN:**

```text
IF allowLiveNetwork === true AND Legal Gate !== PASS
  → adapter / ingest-run MUST refuse (error, 0 staging write)

MockIngestAdapter:
  · allowLiveNetwork ignored or forced false
  · returns fixture rows for single providerId
  · 0 fetch / 0 secrets
```

---

## 10. Risks (zamrożone · akceptowane przy DF)

| ID | Ryzyko | Mitigacja FROZEN |
|----|--------|------------------|
| **R1** | Live mimo Legal OPEN | D-P3-10 · `allowLiveNetwork` refuse · OV-LEGAL |
| **R2** | Auto-publish „dla wygody” | OUT · AC-P3-3 · OV-PUB |
| **R3** | Drugi write Quotes | D-P3-07 · bloklista · smoke |
| **R4** | Multi-adapter / multi-provider | D-P2-02 · one adapter · one providerId |
| **R5** | Secrets w FE | D-P3-05 |
| **R6** | Popsucie SMART staging | Soft-add only · ZERO rename RO fields |
| **R7** | History→average | D-P3-08 · K-MS-4 test |
| **R8** | Cron „przy okazji” | D-P3-04 · bloklista Edge |

---

## 11. Rollback (zamrożony)

```text
L1 — Natychmiast (ops, bez redeploy):
  localStorage.setItem('kw-market-sync-01-p3', '0')
  → brak CTA / ingest P3 · Preview/Accept/Publish P0–P2 bez zmian

L2 — Tip revert (tylko Owner GO):
  revert commitów allowlisty FEATURE P3
  → nie ruszać P0–P2 / WC commit / SMART / AI-COST / Payroll / Cloud

L3 — Zakaz rollbacku „przy okazji”:
  MS P2 history · P1 Kill Switch · commit* · SMART · Payroll
```

**DoD rollback:** flaga OFF = tip parity (AC-P3-4).  
**Rollback cost:** niski (FEATURE · mock · brak migracji).

---

## 12. Owner Verification (zamrożony checklist)

| # | Check | Pass |
|---|-------|------|
| **OV-1** | P3 OFF → brak CTA ingest P3 · tip parity | |
| **OV-2** | P3 ON → CTA mock widoczne · **brak** „Auto-publish” / „Cron” | |
| **OV-3** | Mock ingest → wiersze w Preview · **bez** auto Accept/Publish | |
| **OV-4** | Po mock: Accept → Guard → Dry Run → KS → commit\* działa jak P1 | |
| **OV-5** | Kill Switch OFF → Publish zablokowany (regresja P1) | |
| **OV-6** | 0 drugi tor Quotes (brak apply* poza commit) | |
| **OV-7** | `allowLiveNetwork=true` bez Legal PASS → refuse · 0 staging write | |
| **OV-8** | Single providerId w ctx · brak multi-shop UI | |
| **OV-9** | Diff ⊆ allowlist · Gate ALL-NIE | |
| **OV-10** | Regresja P0/P1/P2 smoke PASS · K-MS-4 PASS | |
| **OV-11** | Brak AI-COST / SMART Save / Payroll / Cloud CORE w diff | |
| **OV-12** | Legal Gate hint: live blocked / OPEN | |

**Ops flagi:**

```js
localStorage.setItem('kw-market-sync-01-p3', '1')
// Rollback L1
localStorage.setItem('kw-market-sync-01-p3', '0')
```

---

## 13. Test plan (zamrożony)

| Case | Oczekiwanie |
|------|-------------|
| Flag OFF | Brak UI P3 · `isMarketSyncP3Enabled()===false` |
| Flag ON · mock run | Rows w staging Preview · SyncRun created |
| Mock · single provider | Wszystkie rows = wybrany `providerId` |
| Live refuse | `allowLiveNetwork=true` + Legal OPEN → error · 0 write |
| Publish path | Nadal tylko `commitMarketQuotesImport` po Accept+KS |
| Auto-publish | Brak ścieżki kodu / CTA |
| Cron | Brak schedulera w allowliście |
| K-MS-4 | Average **nie** czyta PriceHistory |
| Regresja P0 | Import CSV ręczny nadal działa |
| Regresja P1 | Accept/Publish/Undo/KS |
| Regresja P2 | History/coverage gdy P2 ON |

Artefakt: `scripts/test-market-sync-01-p3.mjs` (+ run istniejących p0/p1/p2).

---

## 14. Definition of Done / AC (zamrożone)

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-P3-1** | Legal Gate udokumentowany · live blocked gdy OPEN | OV-7 · OV-12 |
| **AC-P3-2** | `sourceKind` licensed_api\|scraper w typach · live nieużywane bez Legal | Unit / diff |
| **AC-P3-3** | Preview → Accept → commit\* · **0** auto-publish | OV-3 · OV-4 |
| **AC-P3-4** | Flaga default OFF → tip parity | OV-1 |
| **AC-P3-5** | Dokładnie 1 adapter + 1 provider w slice | Diff / OV-8 |
| **AC-P3-6** | Diff ⊆ allowlist · Gate ALL-NIE | Review |
| **AC-P3-7** | Kill Switch default OFF niezmieniony | OV-5 |
| **AC-P3-8** | 0 Cloud CORE / Payroll / AI-COST / SMART Save | OV-11 |
| **AC-P3-9** | 0 cron | Diff |
| **AC-P3-10** | Regresja P0/P1/P2 + K-MS-4 PASS | Test |
| **AC-P3-11** | Build + `test-market-sync-01-p3.mjs` PASS | CI/local |

### Anti-AC

| ID | Anti |
|----|------|
| **AC-X1** | Live scrape/API bez Legal PASS |
| **AC-X2** | Auto-publish / cron |
| **AC-X3** | Drugi write Quotes |
| **AC-X4** | Multi-provider w jednym IMPLEMENT |

---

## 15. Punkty REUSE (zamrożone)

| # | REUSE | Użycie P3 |
|---|-------|-----------|
| **R1** | P0 `import-csv` / normalize / match | Wejście po adapterze |
| **R2** | Staging store | Persist Preview |
| **R3** | P1 Accept → … → `commit*` + KS | Jedyny Publish |
| **R4** | P2 history/coverage/flag | Niezależne · REUSE przy Accept |
| **R5** | `MarketSyncPreviewPanel` | Host CTA |
| **R6** | Wzorzec `p2-flag.ts` | `p3-flag.ts` |

**ZERO DUPLICATE:** jeden adapter · zero drugiego Quotes writer · zero average fork.

---

## 16. Boundary SMART / AI-COST / WC (zamrożony)

| Reguła | FROZEN |
|--------|--------|
| SMART staging RO fields | Soft-add tylko · brak breaking rename |
| SMART Save / One-shot | **OUT** |
| AI-COST | **OUT** |
| WC Quotes write | **Tylko** `commitMarketQuotesImport` |
| MS P3 nie woła SMART/AI-COST APIs | **FROZEN** |

---

## 17. Etapy po FREEZE

```text
1. Owner ACCEPTED DESIGN FREEZE (checklist §18)
2. (Opc.) Architecture Review — jeśli Owner wymaga
3. Owner GO IMPLEMENT  →  mock-only ⊆ allowlist
4. TEST → OV → COMMIT (GO) → PUSH → PV → CLOSE
5. Live provider (P3-B) = NIE bez Legal PASS + amend/nowy DF + GO
6. SMART P3 / CM-04 P3 / cron = NIE bez osobnego Owner GO
```

---

## 18. Owner Acceptance Checklist

```text
[ ] Akceptuję Objective §1 · Architecture §2
[ ] Akceptuję D-P3-01…D-P3-10 (§3)
[ ] Akceptuję IN §4 / OUT §5
[ ] Akceptuję Allowlist §6 · Bloklistę §7 · Flagę §8
[ ] Akceptuję Risks §10 · Rollback §11 · OV §12 · Test plan §13 · AC §14
[ ] Potwierdzam: Preview → Accept → commitMarketQuotesImport zachowane
[ ] Potwierdzam: flaga default OFF · single-provider · one adapter
[ ] Potwierdzam: Legal Gate OPEN blocks live implementation
[ ] Potwierdzam: brak auto-publish · cron · Cloud CORE · Payroll · AI-COST · SMART Save
[ ] Potwierdzam: brak IMPLEMENT / commit / push do osobnego GO IMPLEMENT
```

---

## 19. Zakaz IMPLEMENT z tego dokumentu

Ten plik **nie** jest kodem.  
**IMPLEMENT** dopiero po: **Owner ACCEPTED DF** + **Owner GO IMPLEMENT**.  
**LIVE ingest** dodatkowo: **Legal PASS** (D-P3-10).

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**Slice:** MARKET-SYNC-01 P3-A · ingest spine + mock · flag OFF · Legal OPEN blocks live  
**Next:** Owner ACCEPTED DF → **GO IMPLEMENT** (mock-only) · **albo** HOLD / amend
