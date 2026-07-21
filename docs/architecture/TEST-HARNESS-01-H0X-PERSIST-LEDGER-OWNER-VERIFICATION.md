# TEST-HARNESS-01 H0.x — OWNER VERIFICATION REPORT

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Etap:** OWNER VERIFICATION  
> **Data:** 2026-07-21  
> **Owner GO Verification:** ✅  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · **PRODUCTION VERIFIED · GREEN**  
> **COMMIT / PUSH:** **NIE** (czekaj Owner GO → COMMIT)

---

## 1. Werdykt

```text
══════════════════════════════════════
OWNER VERIFICATION — PASS
══════════════════════════════════════
```

| # | Kryterium | Wynik |
|---|-----------|-------|
| 1 | Recovery po crash/kill | **PASS** — kill-sim: create → ledger `open` → in-memory clear → recover → absent from KV |
| 2 | Ledger lifecycle `pending→open→cleaning→closed→prune` | **PASS** — API self-check + kill-sim + `ledgerCloseAndPrune` |
| 3 | Lock lifecycle acquire → release → stale takeover | **PASS** — held live FAIL loud · stale dead-pid takeover · release |
| 4 | Optional scan (`PSB_H0X_SCAN=1`) | **PASS** — `scanned:true` · `scanRemoved=0` (brak orphanów po ledger recover) |
| 5 | Recovery idempotentne | **PASS** — podwójny `recoverOpenEntities` + podwójny `h0x-recover --allow-prod` → exit 0 · ledger 0 |
| 6 | REUSE cleanerów tender / job / catalog | **PASS** — `cleaner-registry.mjs` → `cleanupSandboxTender` / `cleanupSandboxJob` / `cleanupSandboxCatalogWork` |
| 7 | Brak orphan `psb-*` | **PASS** — post-idle scan pipeline/jobs/catalog = **0** |
| 8 | Brak nowych kluczy KV | **PASS** — file ledger + file lock only (D4 / #PSB-006) |
| 9 | Brak wpływu Core / Payroll / Theme / Edge / D5 | **PASS** — tooling-only; zero diff w Protected Core / Edge / Payroll / Theme / changelog |

**Exit codes (Owner Verification runs):** wszystkie `0` · `scenarioStatus=PASS` · `cleanupStatus=PASS`

---

## 2. Dowody uruchomienia

### 2.1 Dry-run (ledger + lock, zero KV writes)

```text
npm run test:prod-sandbox -- --scenario h0x-recover --dry-run

outDir=.tmp/prod-sandbox-out/h0x-recover-mrusiiql
PASS    h0x.ledger-path / ledger-upsert / ledger-prune
PASS    h0x.pending-absent-seed
PASS    h0x.unknown-kind: PSB_H0X_UNKNOWN_KIND
PASS    h0x.lock-acquire / lock-held (PSB_H0X_LOCK_HELD) / lock-release
PASS    h0x.dry-run-recover / h0x.dry-run: zero KV writes
exitCode=0
```

### 2.2 Allow-prod — kill-sim recovery

```text
npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod

outDir=.tmp/prod-sandbox-out/h0x-recover-mrusij3u
PASS    h0x.kill-sim-seed: created psb-tender-mrusij4a-36onyzcp · ledger open
PASS    h0x.kill-sim-ledger: in-memory cleared · ledger still open
PASS    h0x.kill-sim-kv: entity present in pipeline
PASS    h0x.recover: recovered=2 scanRemoved=0
PASS    h0x.recover-verify: absent from KV
PASS    h0x.ledger-empty / h0x.pending-absent: pruned PASS
exitCode=0
```

| Meta | Wartość |
|------|---------|
| Sandbox id (przykład) | `psb-tender-mrusij4a-36onyzcp` |
| Symulacja | crash = wyczyszczony in-memory tracker, ledger nadal `open` |
| Po recover | entity absent · ledger recoverable **0** |

### 2.3 Allow-prod + optional scan

```text
$env:PSB_H0X_SCAN='1'; npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod

outDir=.tmp/prod-sandbox-out/h0x-recover-mrusiv92
PASS    h0x.recover: recovered=2 scanRemoved=0
exitCode=0
```

Dodatkowy dowód idle (bez równoległego scenariusza):

```text
recoverOpenEntities({ scan: true }) × 2
r1/r2: status=PASS · recovered=0 · leftovers=0 · scanned=true · scanRemoved=0
orphan-psb-count=0 · ledger entities=0 · lock absent
→ OV-IDLE-PASS
```

`scanRemoved=0` jest oczekiwane, gdy ledger recovery już usunął orphan przed skanem (safety net, nie primary path).

### 2.4 Idempotencja (podwójny allow-prod)

```text
h0x-recover --allow-prod  → exit 0 (mruskpw2)
h0x-recover --allow-prod  → exit 0 (mrusl3fu)
```

Drugi przebieg ponownie tworzy kill-sim i czyści — nie zostawia orphanów. Po idle: `recoverOpenEntities` ×2 = no-op PASS.

### 2.5 Stale lock takeover (poza scenariuszem, direct)

```text
seed h0x.lock pid=999999001 (dead)
→ WARNING h0x.lock stale takeover: dead pid=999999001 → new pid=…
→ acquire OK · release → lock absent
PASS stale-takeover · PASS lock-release-after-stale
```

Live hold: scenariusz dry-run / allow-prod → `PSB_H0X_LOCK_HELD` (FAIL loud) PASS.

---

## 3. Ledger + lock lifecycle (mapowanie)

| Etap | Dowód |
|------|--------|
| `pending` | `ledgerUpsert` self-check · `trackPending` przed `batch-set` (bridge) |
| `open` | kill-sim seed po udanym create |
| `cleaning` | `recoverOpenEntities` → `ledgerSetStatus(..., "cleaning")` |
| `closed` → `prune` | `ledgerCloseAndPrune` po cleaner ok + absent |
| Lock acquire | `acquireH0xLock` |
| Lock release | `releaseH0xLock` · SIGINT/SIGTERM best-effort w runner |
| Stale takeover | dead pid → overwrite + WARNING |

Ledger path (SSOT): `.tmp/prod-sandbox-out/h0x-open-entities.json`  
Lock path (SSOT): `.tmp/prod-sandbox-out/h0x.lock`

Po OV: ledger `entities: []` · lock **absent**.

---

## 4. REUSE cleanerów

| Kind | Cleaner (REUSE) | Źródło |
|------|-----------------|--------|
| `tender` / `cloud` | `cleanupSandboxTender` | `tender-helpers.mjs` (H1/H4) |
| `job` | `cleanupSandboxJob` | `job-helpers.mjs` (H2) |
| `catalog` | `cleanupSandboxCatalogWork` | `catalog-helpers.mjs` (H5) |
| unknown | FAIL loud `PSB_H0X_UNKNOWN_KIND` | self-check PASS |

Wiring scenariuszy H1/H2/H4/H5: `LedgerCleanupTracker` + `trackPending` (bridge) — bez forków cleanerów.

Scan keys (READ existing only): pipeline · `kw-jobs` · `kw-wgdom-work-catalog` — **bez** nowego klucza KV.

---

## 5. D5 ZERO Core — potwierdzenie

| Obszar | Diff w bundle H0.x? |
|--------|---------------------|
| `src/lib/cloud-sync.ts` | **NIE** |
| Payroll / PWRB / fence | **NIE** |
| Theme / UI changelog / `version.json` | **NIE** |
| Edge `supabase/functions/**` | **NIE** |
| Nowe klucze KV | **NIE** |
| H0.x tooling | **TAK** — `test-infra/prod-sandbox/**` · `scripts/test-prod-sandbox-h0x.mjs` · manifest · docs H0.x |

---

## 6. Poprzednie bramki

| Bramka | Status |
|--------|--------|
| AUDIT → RCA → PLAN → DF → ARCH REVIEW | ✅ |
| Owner GO IMPLEMENT | ✅ |
| BUILD (`npm run build`) | PASS (sesja IMPLEMENT) |
| Dry-run H0.x | **PASS** (ten raport) |
| Allow-prod H0.x | **PASS** (ten raport) |
| Optional scan | **PASS** (ten raport) |

---

## 7. Plan COMMIT (NIE wykonać bez Owner GO → COMMIT)

### 7.1 Pliki do `git add` (wyłącznie H0.x)

```text
test-infra/prod-sandbox/persist-ledger.mjs
test-infra/prod-sandbox/h0x-lock.mjs
test-infra/prod-sandbox/cleaner-registry.mjs
test-infra/prod-sandbox/ledger-bridge.mjs
test-infra/prod-sandbox/h0x-recovery.mjs
test-infra/prod-sandbox/scenarios/h0x-recover.mjs
test-infra/prod-sandbox/catalog-helpers.mjs
test-infra/prod-sandbox/runner.mjs
test-infra/prod-sandbox/scenarios/h1-tender.mjs
test-infra/prod-sandbox/scenarios/h2-jobs-photos.mjs
test-infra/prod-sandbox/scenarios/h4-cloud.mjs
test-infra/prod-sandbox/scenarios/h5-biblioteka.mjs
test-infra/prod-sandbox/README.md
test-infra/test-manifest.json
scripts/test-prod-sandbox-h0x.mjs
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-PLAN.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-DESIGN-FREEZE.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-ARCHITECTURE-REVIEW.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-IMPLEMENTATION-REPORT.md
docs/architecture/TEST-HARNESS-01-H0X-PERSIST-LEDGER-OWNER-VERIFICATION.md
```

### 7.2 Zakaz staging

- `src/app/**`, `src/lib/**` (poza tooling), Edge, Theme, Payroll Core  
- Continuity WIP (`AGENTS.md`, `CURRENT-TASK.md`, …) — osobno / po CLOSE  
- `.tmp/**`, inne untracked poza H0.x

### 7.3 Proponowany komunikat

```text
test(infra): TEST-HARNESS-01 H0.x persist ledger cross-process recovery

File ledger + lock + REUSE cleaners; kill-sim recovery; no new KV / no Core.
```

---

## 8. Następny krok

```text
OWNER GO → COMMIT
```

Potem: PUSH → PRODUCTION VERIFY (baseline UI **2.65.35** bez bumpu) → POST RELEASE → CLOSE.

**COMMIT / PUSH w tej sesji Owner Verification: NIE wykonano.**
