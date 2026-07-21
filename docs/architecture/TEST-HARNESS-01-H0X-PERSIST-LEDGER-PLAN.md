# TEST-HARNESS-01 H0.x — Persist Ledger · PLAN

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Status:** PLAN COMPLETE · **NIE implementować** · **NIE DESIGN FREEZE** bez Owner GO  
> **Data:** 2026-07-21  
> **Owner GO PLAN:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md)  
> **Parent:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) · H0 FINAL VERIFY §6  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · app feature **`fce7b78`** · **GREEN**  
> **IMPLEMENT:** **BLOCKED**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · D5 ZERO Core · #PSB-001…015

---

## 0. Decyzje wejściowe (zamknięte w RCA — zatwierdzone Owner)

| Decyzja | Wartość |
|---------|---------|
| Architektura | **Hybrid C** — file ledger primary + optional KV scan |
| KV ledger (E) | **REJECT** (#PSB-006) |
| Ledger path | `.tmp/prod-sandbox-out/h0x-open-entities.json` |
| Lock path | `.tmp/prod-sandbox-out/h0x.lock` |
| Lifecycle status | **`pending` → `open` → `cleaning` → `closed`** (potem prune z pliku) |
| Timing vs `batch-set` | Ledger upsert **`pending` BEFORE** set → **`open` AFTER** `ok:true` |
| Cleaner registry | tender/cloud → `cleanupSandboxTender` · job → `cleanupSandboxJob` · catalog → H5 RMW · unknown → **FAIL** |
| Recovery order | **lock → ledger recovery → optional scan → scenario** |
| Scan | Default **OFF** · `PSB_H0X_SCAN=1` |
| Signals (D) | Complement only (SIGINT/SIGTERM best-effort) |
| D5 ZERO Core | **BEZ ZMIAN** Core / Edge / Payroll / Theme |
| Nowy KV | **NIE** |

---

## 1. Cel PLANU

Zdefiniować (po późniejszym Owner GO IMPLEMENT) warstwę **H0.x Persist Ledger**:

```text
runner start (--allow-prod)
  → acquire h0x.lock
  → load h0x-open-entities.json
  → recover each open entity (cleaner registry + verify absent)
  → optional SCAN_KEYS if PSB_H0X_SCAN=1
  → run scenario
       track → ledger pending → batch-set → ledger open
       … work …
       cleanup → ledger cleaning → closed → prune
  → in-session PSB-001 finally (unchanged contract)
  → release lock
```

**Poza zakresem tego etapu:** kod, DESIGN FREEZE, ARCH REVIEW, commit, push, bump UI, zmiany Production feature.

---

## 2. Etapy implementacji (H0.x.0 → H0.x.6)

| Etap | Nazwa | Zakres | Exit |
|------|-------|--------|------|
| **H0.x.0** | Wiring | Moduły `persist-ledger.mjs` · `cleaner-registry.mjs` · paths/constants · dry-run no-op KV | Unit/self-check w h0-preflight lub nowy `h0x-recover` stub |
| **H0.x.1** | Ledger lifecycle | Atomic read/write · upsert `pending`/`open`/`cleaning`/`closed` · prune · schemaVersion=1 | Ledger round-trip lokalny PASS |
| **H0.x.2** | Lock lifecycle | `h0x.lock` acquire/release · stale pid · `PSB_H0X_LOCK_HELD` | Concurrent second allow-prod FAIL loud |
| **H0.x.3** | Tracker bridge | Hook `CleanupTracker.track` / `untrack` / post-clean → ledger (wrapper API) · **BEFORE** batch-set contract dokumentowany dla scenariuszy | Create path pisze `pending`→`open` |
| **H0.x.4** | Recovery + registry | Runner start: recover · registry kinds · verify absent · leftovers → FAIL | Symulacja kill: leave `open` → re-run purge PASS |
| **H0.x.5** | Optional scan + scrub de-dupe | `PSB_H0X_SCAN=1` · SCAN_KEYS · deprecate H1/H2 lokalny orphan-scrub (delegacja / usunięcie) | Scan OFF default · ON nie rusza non-psb |
| **H0.x.6** | Closeout tooling | Scenario/suite `prod-sandbox-h0x` · README · signal complement · IMPLEMENT report · Owner checklist | DoD §10 |

**Jeden bundle = tylko H0.x** (#PSB-010). Nie łączyć z H3-B/C · Core · UI.

---

## 3. Lista plików do modyfikacji / utworzenia

| Plik | Akcja |
|------|--------|
| `test-infra/prod-sandbox/persist-ledger.mjs` | **NOWY** — load/save atomic · upsert/prune · status transitions |
| `test-infra/prod-sandbox/h0x-lock.mjs` | **NOWY** — acquire/release/stale (lub sekcja w persist-ledger — DF wybierze jeden plik vs dwa) |
| `test-infra/prod-sandbox/cleaner-registry.mjs` | **NOWY** — kind → cleaner REUSE |
| `test-infra/prod-sandbox/cleanup.mjs` | **Rozszerzenie** — opcjonalny hook/bridge do ledger (bez zmiany semantyki in-session PSB-001) |
| `test-infra/prod-sandbox/runner.mjs` | Recovery na starcie · lock · env `PSB_H0X_SCAN` · rejestracja `h0x-recover` |
| `test-infra/prod-sandbox/scenarios/h0x-recover.mjs` | **NOWY** — dowód: seed ledger orphan / symulacja leave-open → recover PASS |
| `test-infra/prod-sandbox/scenarios/h1-tender.mjs` | Usunięcie / delegacja lokalnego orphan-scrub → H0.x |
| `test-infra/prod-sandbox/scenarios/h2-jobs-photos.mjs` | j.w. |
| `test-infra/prod-sandbox/scenarios/h4-cloud.mjs` | Wiring track+ledger timing (jeśli bridge nie jest w 100% transparentny) |
| `test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs` | j.w. (catalog kind) |
| `test-infra/prod-sandbox/README.md` | Sekcja H0.x · lock · scan flag · recovery |
| `scripts/test-prod-sandbox-h0x.mjs` | **NOWY** thin wrapper |
| `test-infra/test-manifest.json` | Suite `prod-sandbox-h0x` · `PROD-SANDBOX-H0X` · manual / Owner |
| Docs `TEST-HARNESS-01-H0X-*` | DF / ARCH / IMPLEMENT później — nie w PLAN execute |

**Zakaz edycji:** `src/lib/cloud-sync.ts`, Edge `supabase/functions/**`, `payroll-*`, Theme, `App.tsx` Core, `changelog-data.ts`, `version.json`, nowe klucze KV.

**Opcjonalnie (DF):** `h0-preflight.mjs` — asserty API ledger w dry-run (bez prod write).

---

## 4. Reuse istniejących komponentów H0–H5

| Komponent | Slice | Rola w H0.x |
|-----------|-------|-------------|
| `markers.mjs` / `isPsbId` | H0 | Hard filter id |
| `mutate-guard.mjs` | H0 | assertWritable w recovery |
| `CleanupTracker` / PSB-001 | H0 | In-session guarantee **zostaje**; ledger = durability layer |
| `allowlist.mjs` | H0 | Nigdy nie czyścić non-allowlist / non-psb |
| `kv-client.mjs` | H0 | Jedyny klient · **nie fork** |
| `report.mjs` · out dir | H0 | Report recovery counts · #PSB-014 |
| `cleanupSandboxTender` | H1/H4 | kind `tender` / `cloud` |
| `cleanupSandboxJob` | H2 | kind `job` |
| `catalog-helpers` remove RMW | H5 | kind `catalog` |
| `forbidden-keys` | H4/H5 | Scan **nie** obejmuje payroll/cost-catalog |
| Runner CLI / `--allow-prod` / dry-run | H0 | Recovery write tylko allow-prod |

**ZERO DUPLICATE:** jeden recovery path w runnerze — H1/H2 scrub przestaje być drugim SSOT.

---

## 5. Mechanizmy ledger lifecycle

### 5.1 Plik i schema

| Pole | Wartość |
|------|---------|
| Path | `.tmp/prod-sandbox-out/h0x-open-entities.json` |
| Write | temp + atomic rename |
| `schemaVersion` | `1` |

Entity (PLAN → DF zamrozi 1:1 z RCA):

`id` · `kind` · `kvKey` · `scenario` · `status` · `createdAt` · `updatedAt` · `pid` · `meta?`

### 5.2 Status machine (Owner-locked)

```text
(absent)
   │ track + ledger upsert
   ▼
pending  ── BEFORE batch-set
   │ batch-set ok:true
   ▼
open
   │ cleanup begins
   ▼
cleaning
   │ cleaner ok + verify absent
   ▼
closed   ── terminal record
   │ prune from entities[]
   ▼
(absent from file)
```

| Transition | Trigger |
|------------|---------|
| → `pending` | Przed pierwszym ryzykownym `batch-set` tworzącego encję |
| `pending` → `open` | `batch-set` zwrócił `ok:true` |
| `pending` → prune | `batch-set` `ok:false` **lub** recovery verify-absent |
| `open` → `cleaning` | Start cleaner (sesja lub recovery) |
| `cleaning` → `closed` | Cleaner `ok` + verify absent |
| `closed` → prune | Natychmiast po `closed` (plik nie trzyma historii closed długoterminowo) |

**Uwaga:** `closed` = jawny terminal w state machine (Owner); storage może prune synchronicznie po `closed` (brak retencji closed w MVP).

### 5.3 API (szkic — DF nazwie eksporty)

| Operacja | Semantyka |
|----------|-----------|
| `ledgerUpsert(entity)` | Insert/update + flush |
| `ledgerSetStatus(id, status)` | Transition + flush |
| `ledgerPrune(id)` | Remove + flush |
| `ledgerListOpen()` | All non-absent for recovery |
| `ledgerLoad()` / `ledgerSaveAtomic()` | IO |

---

## 6. Lock lifecycle

```text
acquire(lockPath, { pid, scenario, startedAt })
  if lock exists:
    if pid alive → throw PSB_H0X_LOCK_HELD
    else → stale takeover (log WARNING) + rewrite lock
  else → write lock
release():
  delete lock if owner pid matches
```

| Reguła | Wartość |
|--------|---------|
| Scope | Single-writer per workspace |
| Second `--allow-prod` | **FAIL loud** · nie czekaj / nie queue |
| Dry-run | Soft: prefer nie blokować; **nie** recovery-write KV |
| Crash z lockiem | Następny start: stale pid → takeover + recovery |
| Complement signals | SIGINT/SIGTERM → best-effort `runAll` + ledger flush + release |

---

## 7. Recovery flow

```text
1. Parse CLI · resolve scenario
2. If --allow-prod:
     acquire h0x.lock
     load ledger
     for entity in LIFO(updatedAt):
       if status in (pending, open, cleaning):
         set cleaning (best-effort)
         registry[kind](ctx)   // unknown kind → FAIL
         verify absent on kvKey
         if absent → closed → prune
         else → leftover + FAIL
     if PSB_H0X_SCAN=1:
       batch-get(SCAN_KEYS)
       discover psb-* not already handled
       map kind by prefix · cleanup · WARNING counts
3. Run scenario (existing H0–H5)
4. finally: in-session PSB-001 · ledger sync · release lock
```

### SCAN_KEYS (gdy ON)

| Key | Prefiks → kind |
|-----|----------------|
| `kw-tenders-pipeline` | `psb-tender-*` → tender · `psb-cloud-*` → cloud |
| `kw-jobs` | `psb-job-*` → job |
| `kw-wgdom-work-catalog` | `psb-*` w `works[]` → catalog |

**Nigdy:** payroll · auth · billing · `kw-wgdom-cost-catalog`.

---

## 8. Failure handling

| Kod / sytuacja | Zachowanie | Exit |
|----------------|------------|------|
| `PSB_H0X_LOCK_HELD` | Drugi writer | ≠ 0 (FAIL) |
| `PSB_H0X_UNKNOWN_KIND` | Brak cleaner | FAIL leftovers |
| `PSB_H0X_LEDGER_CORRUPT` | JSON broken | FAIL loud (backup `.bak` opcjonalnie w DF) |
| Cleaner `ok:false` | Leftover list · PSB-001 style | exit 4 / FAIL |
| `pending` + absent | Prune · nie FAIL | PASS |
| Scan finds non-mappable `psb-*` | WARNING + skip delete | nie FAIL MVP |
| Dry-run + ledger open | Report-only recovery plan · **0** `batch-set` | 0 |
| Signal mid-run | Best-effort cleanup · nie gwarantuje vs SIGKILL | — |

In-session PSB-001 **nie** jest zastępowane — H0.x go **uzupełnia**.

---

## 9. PASS / FAIL criteria

### 9.1 PASS (suite `prod-sandbox-h0x` / scenario `h0x-recover`)

| # | Kryterium |
|---|-----------|
| P1 | Dry-run: exit 0 · zero KV writes |
| P2 | Symulacja: ledger `open` leftover → re-run `--allow-prod` → entity absent · ledger empty · exit 0 |
| P3 | Lock: drugi równoległy allow-prod → `PSB_H0X_LOCK_HELD` |
| P4 | Unknown kind w ledger → FAIL loud (nie silent) |
| P5 | `pending` bez KV entity → prune PASS |
| P6 | Scan default OFF · z `PSB_H0X_SCAN=1` nie mutuje non-`psb-*` |
| P7 | H1/H2 bez zduplikowanego scrub SSOT (delegacja) |
| P8 | Zero diff Protected Core / Edge / Payroll / Theme / UI version |

### 9.2 FAIL

| # | Kryterium |
|---|-----------|
| F1 | Orphan `psb-*` z ledger `open` nadal w KV po recovery |
| F2 | Recovery napisał payroll / cost-catalog / non-psb |
| F3 | Corrupt ledger zignorowany (soft skip) |
| F4 | Bridging łamie in-session PSB-001 (PASS bez cleanup) |

---

## 10. Definition of Done

```text
H0.x DoD =
  H0.x.0–H0.x.6 DONE
  + BUILD PASS (npm run build)
  + h0x-recover dry-run PASS
  + h0x-recover allow-prod recovery PASS (symulacja kill)
  + lock contention FAIL loud PASS
  + Owner Verification checklist PASS
  + docs IMPLEMENT report
  + zero Core/Payroll/Theme/Edge/UI bump
```

**Po DoD:** COMMIT / PUSH / PRODUCTION VERIFY tylko po osobnych Owner GO (jak H4/H5).

---

## 11. Potwierdzenie braku wpływu (PLAN lock)

| Warstwa | Wpływ | Jak egzekwowane |
|---------|-------|-----------------|
| **Protected Core** | **ZERO** | Zakaz ścieżek `src/lib/cloud-sync*` |
| **D5 ZERO Core** | **ZACHOWANE** | Review plików + ARCH |
| **Payroll** | **ZERO** | Poza registry · poza SCAN_KEYS |
| **Theme** | **ZERO** | Brak plików theme/UI |
| **Edge** | **ZERO** | Brak edycji `supabase/functions/**` · reuse `kv-client` |
| **UI / version.json** | **ZERO** | Tooling-only tip |
| **New KV** | **ZERO** | File ledger · E REJECT |

```text
D5 ZERO Core: CONFIRMED for H0.x PLAN scope
```

---

## 12. Komendy docelowe (po IMPLEMENT)

```bash
npm run test:prod-sandbox -- --scenario h0x-recover --dry-run
npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
PSB_H0X_SCAN=1 npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
npm run test:infra -- --suite prod-sandbox-h0x
```

---

## 13. Ryzyka PLAN → DF

| Ryzyko | Mitigacja DF |
|--------|--------------|
| Scenariusze omijają bridge i nie piszą ledger | Obowiązkowy API / wrapper; AC: create bez ledger = FAIL self-check |
| Windows atomic rename | Wzorzec jak `report.mjs` · test na Win |
| Stale lock false positive | pid liveness check |
| H5 dual-region | `meta` + istniejący dual verify H5 w cleaner path |

---

## 14. Stop gate

```text
PLAN COMPLETE → czekaj OWNER GO
  „GO DESIGN FREEZE TEST-HARNESS-01 H0.x”
Bez GO: zero DF / ARCH / IMPLEMENT / kodu / commit / push.
```

**Koniec PLAN H0.x**
