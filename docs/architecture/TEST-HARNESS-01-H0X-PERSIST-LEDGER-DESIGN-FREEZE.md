# TEST-HARNESS-01 H0.x — Persist Ledger · DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO IMPLEMENT  
> **Data:** 2026-07-21  
> **Owner GO DESIGN FREEZE:** ✅  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · app feature **`fce7b78`** · **GREEN**  
> **Wejście:** [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-PLAN.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-PLAN.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) · H0 FINAL VERIFY §6  
> **IMPLEMENT:** **BLOCKED**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · D5 ZERO Core · #PSB-001…015

---

## 0. Dziedziczenie H0 / parent (bez regresji)

| Zasada | H0.x |
|--------|------|
| D4 No new KV | **TAK** — file ledger only · KV ledger **REJECT** |
| D5 Zero Protected Core | **TAK** — twarde |
| D8 Mutate guard | **TAK** — recovery i scenario writes |
| D9 / PSB-001 Cleanup Guarantee | **TAK** — in-session **zostaje**; H0.x = cross-process durability |
| #PSB-001 Never touch | **TAK** — mutate-guard · tylko `psb-*` |
| #PSB-003 `--allow-prod` | **WYMAGANE** dla recovery KV write |
| #PSB-004 Dry-run | **TAK** — zero `batch-set` |
| #PSB-005 Cleanup part of PASS | **TAK** — recovery leftovers = FAIL |
| #PSB-006 No new KV | **TAK** |
| #PSB-007 No Core | **TAK** |
| #PSB-008/009 | **TAK** — REUSE cleaners · zero domain ownership |
| #PSB-010 One bundle | **TAK** — tylko H0.x |
| #PSB-014 Reports in `.tmp/` | **TAK** — ledger + lock w out dir |
| H1–H5 scenarios | **RELEASED** — wiring bridge · scrub de-dupe |
| H3-B/C · N2 · ARCH-02F | **OUT** tego bundle |
| UI version bump | **NIE** |

---

## 1. Cel zamrożony

Warstwa **Persist Ledger** dla Production Sandbox:

```text
Cross-process recovery orphanów psb-* po crash/kill runnera
  + single-writer lock
  + optional KV scan safety net
  + REUSE cleanerów H1/H2/H4/H5
  + bez nowego KV · bez Core/Payroll/Theme/Edge
```

In-session **PSB-001 Cleanup Guarantee** pozostaje SSOT dla PASS/FAIL w ramach procesu. H0.x **nie zastępuje** trackera — **uzupełnia** go o durability.

---

## 2. Architektura H0.x (FROZEN)

```text
                         ┌─────────────────────────────┐
                         │     runner.mjs (CLI)        │
                         │  --allow-prod | --dry-run   │
                         └──────────────┬──────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
        h0x-lock.mjs            persist-ledger.mjs          cleaner-registry.mjs
        acquire/release         pending→open→…→prune        kind → REUSE cleaner
        stale takeover          atomic JSON IO                    │
              │                         │                         │
              │         ┌───────────────┴───────────────┐         │
              │         ▼                               ▼         │
              │   CleanupTracker                  kv-client.mjs
              │   (H0 · in-session)               (SSOT · no fork)
              │         │                               │
              └─────────┴───────────────────────────────┘
                                        │
                    recovery (allow-prod only KV writes)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              tenders-pipeline      kw-jobs        kw-wgdom-work-catalog
              (tender/cloud)         (job)              (catalog)
```

| Warstwa | Rola |
|---------|------|
| `h0x-lock.mjs` | Single-writer concurrency |
| `persist-ledger.mjs` | Durable open-set + status machine |
| `cleaner-registry.mjs` | kind → existing helpers |
| `cleanup.mjs` | Bridge hooks · PSB-001 semantyka bez regresji |
| `runner.mjs` | Orchestracja: lock → recover → scan? → scenario |
| `scenarios/h0x-recover.mjs` | Dowód AC / symulacja kill |
| Edge / Core / UI | **Poza zmianami** |

**Hybrid C (FROZEN):**

| Warstwa | Mechanizm | Default |
|---------|-----------|---------|
| Primary | File ledger | **ON** |
| Secondary | KV scan | **OFF** · `PSB_H0X_SCAN=1` |
| Complement | SIGINT/SIGTERM best-effort | **ON** (nie gwarantuje vs SIGKILL) |
| KV cloud ledger | — | **REJECT** |

---

## 3. Decyzje H0.x (D-H0X-01 … D-H0X-28)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H0X-01** | Architektura | **Hybrid C** |
| **D-H0X-02** | KV ledger (E) | **REJECT** |
| **D-H0X-03** | Ledger path | `.tmp/prod-sandbox-out/h0x-open-entities.json` |
| **D-H0X-04** | Lock path | `.tmp/prod-sandbox-out/h0x.lock` |
| **D-H0X-05** | Lock module | **Osobny** `h0x-lock.mjs` (nie inline w ledger) |
| **D-H0X-06** | schemaVersion | **`1`** |
| **D-H0X-07** | Status machine | **`pending` → `open` → `cleaning` → `closed` → prune** |
| **D-H0X-08** | Timing vs batch-set | **`pending` BEFORE** set · **`open` AFTER** `ok:true` |
| **D-H0X-09** | Atomic IO | temp file + rename · no partial JSON |
| **D-H0X-10** | Recovery order | **lock → ledger recover → optional scan → scenario** |
| **D-H0X-11** | Scan default | **OFF** |
| **D-H0X-12** | Scan env | `PSB_H0X_SCAN=1` |
| **D-H0X-13** | SCAN_KEYS | `kw-tenders-pipeline` · `kw-jobs` · `kw-wgdom-work-catalog` **only** |
| **D-H0X-14** | Scan never | payroll · auth · billing · cost-catalog · arbitrary keys |
| **D-H0X-15** | Registry kinds | `tender` · `cloud` · `job` · `catalog` · `other` |
| **D-H0X-16** | Unknown kind | **FAIL loud** `PSB_H0X_UNKNOWN_KIND` |
| **D-H0X-17** | Concurrency | Single-writer · `PSB_H0X_LOCK_HELD` |
| **D-H0X-18** | Stale lock | Dead pid → takeover + WARNING · then recover |
| **D-H0X-19** | Dry-run | Zero `batch-set` · ledger R/W lokalny dozwolony dla testów symulacji |
| **D-H0X-20** | H1/H2 orphan-scrub | **DEPRECATE** — delegacja do H0.x recovery (ZERO DUPLICATE) |
| **D-H0X-21** | Scenario CLI | `h0x-recover` · alias `h0x` |
| **D-H0X-22** | Manifest | `prod-sandbox-h0x` · `PROD-SANDBOX-H0X` · **nie** Gate B/C |
| **D-H0X-23** | UI / CHANGELOG bump | **NIE** |
| **D-H0X-24** | Core / Edge / Payroll / Theme | **ZERO** zmian |
| **D-H0X-25** | Signals | Complement only · nie primary durability |
| **D-H0X-26** | `closed` retention | Prune **synchronicznie** po `closed` (brak historii closed w MVP) |
| **D-H0X-27** | `pending` + absent | Recovery **prune PASS** (nie FAIL) |
| **D-H0X-28** | Scope lock | Zakaz H3-B/C · N2 · Core · new KV · mixed bundles |

---

## 4. Principles H0.x (#H0X-001 … #H0X-012)

| # | Principle |
|---|-----------|
| **#H0X-001** | Durability complements PSB-001 — never replaces in-session cleanup |
| **#H0X-002** | Ledger before write — never after-only |
| **#H0X-003** | Only `psb-*` · mutate-guard on every recovery write |
| **#H0X-004** | Fail loud — lock / unknown kind / corrupt ledger / leftovers |
| **#H0X-005** | REUSE cleaners — zero new domain merge |
| **#H0X-006** | One recovery path in runner — no parallel scrub SSOT |
| **#H0X-007** | Single-writer lock per workspace |
| **#H0X-008** | Scan is optional safety net — never sole mechanism |
| **#H0X-009** | No new KV · no Core · no Edge code change |
| **#H0X-010** | Dry-run side-effect free on Production KV |
| **#H0X-011** | Idempotent recovery — verify absent before prune |
| **#H0X-012** | One H0.x bundle at a time |

---

## 5. Interfejsy (FROZEN)

### 5.1 Paths / constants

```text
H0X_OUT_DIR          = .tmp/prod-sandbox-out
H0X_LEDGER_PATH      = {H0X_OUT_DIR}/h0x-open-entities.json
H0X_LOCK_PATH        = {H0X_OUT_DIR}/h0x.lock
H0X_SCHEMA_VERSION   = 1
```

### 5.2 `persist-ledger.mjs`

```text
export function getLedgerPath(): string

export async function loadLedger(): Promise<LedgerDoc>
  // missing file → empty doc { schemaVersion:1, entities:[] }
  // corrupt → throw PSB_H0X_LEDGER_CORRUPT

export async function saveLedgerAtomic(doc: LedgerDoc): Promise<void>
  // temp + rename

export async function ledgerUpsert(entity: LedgerEntity): Promise<void>
export async function ledgerSetStatus(id: string, status: LedgerStatus): Promise<void>
export async function ledgerPrune(id: string): Promise<void>
export async function ledgerListRecoverable(): Promise<LedgerEntity[]>
  // status ∈ { pending, open, cleaning }
```

**Types (FROZEN):**

```text
LedgerStatus = "pending" | "open" | "cleaning" | "closed"

LedgerEntity = {
  id: string,                 // psb-*
  kind: "tender"|"cloud"|"job"|"catalog"|"other",
  kvKey: string,
  scenario: string,
  status: LedgerStatus,
  createdAt: string,          // ISO-8601
  updatedAt: string,
  pid?: number,
  meta?: Record<string, unknown>
}

LedgerDoc = {
  schemaVersion: 1,
  updatedAt: string,
  entities: LedgerEntity[]
}
```

**Zakaz:** persist secrets · non-`psb-*` ids · payroll keys w `kvKey`.

### 5.3 `h0x-lock.mjs`

```text
export async function acquireH0xLock(opts: {
  pid: number,
  scenario: string,
  startedAt?: string
}): Promise<void>
  // live foreign pid → throw PSB_H0X_LOCK_HELD
  // stale pid → takeover + WARNING

export async function releaseH0xLock(opts?: { pid?: number }): Promise<void>
  // release only if owner matches (best-effort)

export function getLockPath(): string
```

**Lock file JSON (FROZEN):**

```text
{ "pid": number, "scenario": string, "startedAt": ISO-8601 }
```

### 5.4 `cleaner-registry.mjs`

```text
export async function runCleaner(ctx: {
  kind: string,
  id: string,
  kvKey: string,
  kv: KvClient,
  dryRun: boolean,
  assertWritable: (args) => void,
  meta?: Record<string, unknown>
}): Promise<{ ok: boolean, detail?: string }>
  // unknown kind → throw PSB_H0X_UNKNOWN_KIND
```

| kind | Cleaner REUSE (FROZEN) |
|------|------------------------|
| `tender` | `cleanupSandboxTender` |
| `cloud` | `cleanupSandboxTender` |
| `job` | `cleanupSandboxJob` |
| `catalog` | H5 catalog remove RMW (`catalog-helpers` path) |
| `other` | **no KV write** · local/no-op `{ ok: true }` |

### 5.5 Bridge z `CleanupTracker` (FROZEN semantyka)

| Event | Ledger |
|-------|--------|
| Przed create `batch-set` | `ledgerUpsert` status **`pending`** (+ in-memory `track`) |
| Po `batch-set` `ok:true` | `ledgerSetStatus(id, "open")` |
| Po `batch-set` `ok:false` | `ledgerPrune(id)` (lub verify-absent → prune) |
| Start cleanup | `cleaning` |
| Cleanup ok + absent | `closed` → `ledgerPrune` |
| `untrack` po udanym delete w scenariuszu | prune jeśli jeszcze w ledger |

Implementacja bridge: wrapper API **lub** hook w `cleanup.mjs` — **DF nie wymusza** jednego stylu kodu, wymusza **semantykę eventów** powyżej.

---

## 6. Przepływy lifecycle i recovery (FROZEN)

### 6.1 Write path (scenario allow-prod)

```text
assertWritable / FORBIDDEN
  → track(psb-*)
  → ledgerUpsert(pending)     // D-H0X-08
  → batch-set
  → ok:true  → ledger open
  → ok:false → prune pending
  → … scenario …
  → cleanup → cleaning → closed → prune
  → PSB-001 runAll (in-session)
```

### 6.2 Recovery path (runner start, allow-prod)

```text
acquireH0xLock
  → loadLedger
  → for entity in LIFO(updatedAt) where recoverable:
        ledgerSetStatus(cleaning)   // best-effort
        runCleaner(...)
        verify absent on kvKey
        if absent → closed → prune
        else → leftover FAIL
  → if PSB_H0X_SCAN=1: scan SCAN_KEYS → prefix→kind → cleaner
       unmappable psb-* → WARNING skip (nie FAIL MVP)
  → run requested scenario
  → finally: PSB-001 · releaseH0xLock
```

### 6.3 Dry-run

```text
No acquire hard-fail required for second dry-run
No batch-set
Recovery reports intended actions only (or skip KV recover)
h0x-recover may manipulate local ledger file for simulation
```

---

## 7. Kolejność implementacji H0.x.0–H0.x.6 (FROZEN)

| Etap | Zakres | Gate wyjścia |
|------|--------|--------------|
| **H0.x.0** | Wiring modułów + constants + stub scenario | Import/load PASS |
| **H0.x.1** | Ledger lifecycle atomic + statuses | Local round-trip PASS |
| **H0.x.2** | Lock acquire/release/stale | Contention → `PSB_H0X_LOCK_HELD` |
| **H0.x.3** | Tracker bridge + pending/open timing | Create path ledger correct |
| **H0.x.4** | Runner recovery + registry | Kill sim → purge PASS |
| **H0.x.5** | Optional scan + H1/H2 scrub de-dupe | Scan OFF default · non-psb untouched |
| **H0.x.6** | Manifest · README · signals · IMPLEMENT report | DoD |

---

## 8. Concurrency i stale takeover (FROZEN)

| Reguła | Wartość |
|--------|---------|
| Model | **Single-writer** per repo workspace |
| Live lock + other pid | **`PSB_H0X_LOCK_HELD`** · exit ≠ 0 · no wait queue |
| Stale lock (pid dead) | **Takeover** · log WARNING · rewrite lock · proceed recovery |
| Pid liveness | Platform check (Windows/POSIX) — best-effort; ambiguous → prefer FAIL loud jeśli nie da się potwierdzić dead |
| Parallel scenarios | **ZAKAZ** MVP |
| Multi-machine | OUT — ledger lokalny |

---

## 9. Failure handling (FROZEN)

| Kod | Kiedy | Exit |
|-----|-------|------|
| `PSB_H0X_LOCK_HELD` | Drugi allow-prod writer | FAIL |
| `PSB_H0X_UNKNOWN_KIND` | kind ∉ registry | FAIL |
| `PSB_H0X_LEDGER_CORRUPT` | JSON nieparsowalny | FAIL |
| Leftover after recover | Encja nadal w KV | FAIL (PSB-001 style / exit 4) |
| `pending` + absent | — | **PASS** prune |
| Scan unmappable | — | WARNING · skip |
| Signal path fail | — | best-effort · report |

**Zakaz soft-skip** corrupt ledger lub unknown kind.

---

## 10. Scope lock (FROZEN)

### IN

- `test-infra/prod-sandbox/persist-ledger.mjs`
- `test-infra/prod-sandbox/h0x-lock.mjs`
- `test-infra/prod-sandbox/cleaner-registry.mjs`
- `cleanup.mjs` / `runner.mjs` bridge + recovery
- `scenarios/h0x-recover.mjs`
- H1/H2 scrub de-dupe
- Minimal wiring H4/H5 create paths jeśli bridge nie jest transparentny
- README · manifest · `scripts/test-prod-sandbox-h0x.mjs`
- Docs łańcucha H0.x

### OUT

| OUT | Powód |
|-----|--------|
| `cloud-sync.ts` / Core merge / fence | D5 · #PSB-007 |
| Edge function source | D-H0X-24 |
| Payroll write / H3-B/C | Scope |
| Theme / App UI / CHANGELOG bump | Tooling-only |
| New KV key | #PSB-006 · E REJECT |
| cost-catalog / auth / billing writes | Never touch |
| Gate B/C auto | Manual Owner |
| Rewrite H1–H5 scenarios from scratch | REUSE only |

---

## 11. PASS / FAIL criteria (FROZEN)

### PASS

| ID | Kryterium |
|----|-----------|
| **AC-01** | `h0x-recover --dry-run` exit 0 · zero KV `batch-set` |
| **AC-02** | Symulacja: ledger entity `open` + KV present → re-run allow-prod → absent + ledger empty · exit 0 |
| **AC-03** | Drugi równoległy allow-prod → `PSB_H0X_LOCK_HELD` |
| **AC-04** | Unknown kind → FAIL loud |
| **AC-05** | `pending` + absent → prune PASS |
| **AC-06** | Scan default OFF; ON → zero non-`psb-*` mutation |
| **AC-07** | H1/H2 bez drugiego scrub SSOT |
| **AC-08** | Zero diff Core / Edge / Payroll / Theme / UI version |
| **AC-09** | In-session PSB-001 nadal egzekwowane w scenariuszach H0–H5 |

### FAIL

| ID | Kryterium |
|----|-----------|
| **AF-01** | Orphan `open` nadal w KV po recovery |
| **AF-02** | Recovery write poza SCAN_KEYS / poza `psb-*` |
| **AF-03** | Corrupt ledger soft-skipped |
| **AF-04** | Bridge omija ledger na create path |

---

## 12. Definition of Done (FROZEN)

```text
H0.x DoD =
  H0.x.0 … H0.x.6 COMPLETE
  + npm run build PASS
  + AC-01 … AC-09 PASS
  + Owner Verification checklist PASS
  + IMPLEMENTATION REPORT
  + zero Core / Payroll / Theme / Edge / UI bump
```

COMMIT / PUSH / PRODUCTION VERIFY — tylko po osobnych Owner GO.

---

## 13. Potwierdzenie braku wpływu (FROZEN)

| Warstwa | Wpływ | Egzekucja |
|---------|-------|-----------|
| **Protected Core** | **ZERO** | Zakaz plików `src/lib/cloud-sync*` |
| **D5 ZERO Core** | **ZACHOWANE** | ARCH REVIEW + file list |
| **Payroll** | **ZERO** | Poza registry · poza SCAN_KEYS |
| **Theme** | **ZERO** | Brak UI/theme |
| **Edge** | **ZERO** | Brak `supabase/functions/**` |
| **UI / version.json** | **ZERO** | Tooling tip only |
| **New KV** | **ZERO** | File ledger |

```text
D5 ZERO Core: CONFIRMED — DESIGN FREEZE LOCK
```

---

## 14. Komendy (po IMPLEMENT)

```bash
npm run test:prod-sandbox -- --scenario h0x-recover --dry-run
npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
PSB_H0X_SCAN=1 npm run test:prod-sandbox -- --scenario h0x-recover --allow-prod
npm run test:infra -- --suite prod-sandbox-h0x
```

---

## 15. Stop gate

```text
══════════════════════════════════════
DESIGN FREEZE COMPLETE

IMPLEMENT: BLOCKED
→ czekaj OWNER GO → ARCH REVIEW
══════════════════════════════════════
```

Bez GO ARCH / IMPLEMENT: zero kodu · zero commit · zero push.

**Koniec DESIGN FREEZE H0.x**
