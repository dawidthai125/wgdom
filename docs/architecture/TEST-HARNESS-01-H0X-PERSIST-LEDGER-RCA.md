# TEST-HARNESS-01 H0.x — Persist Ledger · RCA

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Etap:** **RCA COMPLETE**  
> **Data:** 2026-07-21  
> **Owner GO RCA:** ✅  
> **AUDIT SSOT:** [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md)  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · **PRODUCTION VERIFIED · GREEN**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · D5 ZERO Core · #PSB-001…015  
> **IMPLEMENT / kod / commit / push:** **ZAKAZ** na tym etapie

---

## 1. Werdykt RCA

```text
══════════════════════════════════════
RCA COMPLETE

DECISION: Wariant C — Hybrid
  Primary  = File Persist Ledger
  Secondary = Optional KV scan safety net
  Signals  = Complement only
  KV ledger (E) = REJECT

→ rekomendacja: OWNER GO → PLAN
══════════════════════════════════════
```

| Pole | Wartość |
|------|---------|
| **Root Cause** | Brak trwałego rejestru open entities poza pamięcią procesu |
| **Decyzja** | **Hybrid C** (A primary + B optional) |
| **Core / Payroll / Theme / Edge** | **ZERO wpływu** (tooling-only) |
| **Następny** | **PLAN** — po Owner GO |

---

## 2. Root Cause

### 2.1 Problem observable

1. Scenariusz `--allow-prod` tworzy encję `psb-*` w Production KV (`batch-set`).  
2. `CleanupTracker.track()` trzyma cleaner **tylko w RAM**.  
3. Crash / `kill -9` / hard abort → `finally` / `runAll()` **nie** wykonuje się.  
4. Nowy proces runnera startuje z **pustym** trackerem.  
5. PSB-001 Cleanup Guarantee obowiązuje wyłącznie **w ramach sesji** → orphan `psb-*` zostaje w KV.

### 2.2 Root Cause (locked)

```text
ROOT CAUSE (single):

  Cleanup Guarantee (PSB-001) jest zaimplementowany jako
  in-process CleanupTracker bez durable open-set.

  Cross-process durability = 0
  ⇒ interrupt po udanym (lub częściowym) write
    nie jest recoverable przez ten sam mechanizm H0.
```

### 2.3 Contributing factors (nie root)

| Factor | Rola |
|--------|------|
| Brak uniwersalnego recovery w `runner.mjs` | Umożliwia orphan persistence |
| Orphan-scrub tylko w H1/H2 (ad hoc) | Partial mitigation · **nie** SSOT · duplikacja |
| SIGKILL / power loss omija signal handlers | Pokazuje dlaczego D alone failuje |
| Nested write-surfaces (H4/H5) | Wymagają `kind` + cleaner — nie samego id |

### 2.4 Non-causes (wykluczone)

| Hipoteza | Werdykt |
|----------|---------|
| Bug merge / cloud-sync | **NIE** — harness pisze Edge KV poza Core path UI |
| Brak PSB-001 w sesji | **NIE** — in-session działa (H0–H5 PASS) |
| Need nowego KV domenowego | **NIE** — ledger lokalny wystarczy (#PSB-006) |
| Payroll / Theme regresja | **NIE** — poza powierzchnią write H0.x |

---

## 3. Porównanie wariantów

| Kryterium | A File ledger | B KV scan | C Hybrid | D Signals | E KV ledger |
|-----------|---------------|-----------|----------|-----------|-------------|
| Recovery po kill mid-run | **TAK** (jeśli flush) | TAK (jeśli encja w KV) | **TAK** | NIE (SIGKILL) | TAK |
| Orphany sprzed H0.x | NIE | **TAK** | **TAK** (scan) | NIE | częściowo |
| #PSB-006 (no new KV) | **PASS** | PASS | **PASS** | PASS | **FAIL** |
| Egress / czas | niski | wyższy | średni (scan opt-in) | niski | średni |
| REUSE cleaners | TAK | TAK | **TAK** | TAK | TAK |
| Concurrent runners | lock file | idempotent | lock + idempotent | n/a | race KV |
| Złożoność DF | niska | średnia | średnia+ | niska | wysoka + Core risk |
| ALIGN H0 FINAL §6 | **pkt 1–3** | pkt 4 | **pkt 1–4** | — | — |
| Werdykt | Viable MVP | Safety net | **SELECT** | Complement | **REJECT** |

### Uzasadnienie skrótowe

- **A** rozwiązuje główny gap (cross-run po track), ale nie czyści historycznych orphanów sprzed ledger.  
- **B** łapie historię i „ledger miss”, ale jest droższy i wymaga mapy kształtów KV — nie powinien być jedynym mechanizmem.  
- **C** = A primary + B secondary (flag) — dokładnie rekomendacja H0 §6 + AUDIT.  
- **D** poprawia graceful Ctrl+C; **nie** zastępuje ledger.  
- **E** łamie #PSB-006, dodaje chmurowy stan harness, zbędna złożoność / ryzyko sync adjacency.

---

## 4. Ostateczna decyzja architektoniczna

```text
LOCKED DECISION — H0.x Persist Ledger

Primary:   File Persist Ledger (Wariant A)
Secondary: Optional KV scan safety net (Wariant B) — default OFF
           env: PSB_H0X_SCAN=1
Complement: SIGINT/SIGTERM → best-effort runAll + ledger flush (Wariant D)
REJECT:    KV open-ledger key (Wariant E)
```

| Zasada | Decyzja |
|--------|---------|
| Gdzie żyje open-set | `.tmp/prod-sandbox-out/h0x-open-entities.json` (gitignore — już `.tmp/prod-sandbox-out/`) |
| Kto czyta recovery | **`runner.mjs` na starcie** (jeden path — ZERO DUPLICATE vs scrub w scenariuszach) |
| Kto pisze ledger | Warstwa wokół `CleanupTracker.track` / `untrack` / po udanym cleanerze (PLAN: wrapper lub PersistLedger API) |
| Scenariusze H1/H2 scrub | **DEPRECATE lokalny scrub** na rzecz H0.x recovery (PLAN: usunąć lub no-op po wiring) |
| Dry-run | Recovery **write = 0** (#PSB-004); ledger R/W lokalny OK; KV cleanup tylko `--allow-prod` |
| New KV / Core / Edge | **FORBIDDEN** |

---

## 5. Schemat Persist Ledger

### 5.1 Plik

| Pole | Wartość |
|------|---------|
| **Path** | `.tmp/prod-sandbox-out/h0x-open-entities.json` |
| **Format** | JSON object (nie NDJSON) — atomic rewrite via temp+rename |
| **Git** | Ignored (#PSB-014) |

### 5.2 Schema (zamrożona na RCA → DF)

```json
{
  "schemaVersion": 1,
  "updatedAt": "ISO-8601",
  "lockOwner": null,
  "entities": [
    {
      "id": "psb-catalog-…",
      "kind": "catalog",
      "kvKey": "kw-wgdom-work-catalog",
      "scenario": "h5-biblioteka",
      "status": "pending",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "pid": 12345,
      "meta": {}
    }
  ]
}
```

| Pole entity | Wymagane | Semantyka |
|-------------|----------|-----------|
| `id` | TAK | musi `psb-*` |
| `kind` | TAK | klucz do cleaner registry |
| `kvKey` | TAK | allowlisted write-surface (audit/recovery) |
| `scenario` | TAK | diagnostyka / report |
| `status` | TAK | `pending` \| `open` \| `cleaning` |
| `createdAt` / `updatedAt` | TAK | ISO |
| `pid` | ZALECANE | concurrency / stale owner hint |
| `meta` | NIE | np. region hint H5 — bez PII |

### 5.3 Status lifecycle

```text
(absent)
   │ track() + ledger upsert
   ▼
pending  ──► (przed batch-set)
   │ batch-set ok:true
   ▼
open
   │ cleanup start
   ▼
cleaning
   │ cleaner ok / verify absent
   ▼
(removed from ledger)
```

- `pending` po crash **bez** udanego set → recovery: verify absent → **prune** (nie FAIL).  
- `open`/`cleaning` po crash → recovery: uruchom cleaner → verify absent → prune lub leftover FAIL.

---

## 6. Cleaner registry

### 6.1 Zasada

```text
kind → async cleanup(ctx) 
  ctx = { kv, id, kvKey, dryRun, assertWritable }
REUSE istniejących helperów — ZERO nowego domain merge.
```

### 6.2 Registry MVP (LOCKED)

| `kind` | Prefiks id (konwencja) | `kvKey` | Cleaner REUSE |
|--------|------------------------|---------|---------------|
| `tender` | `psb-tender-*` | `kw-tenders-pipeline` | `cleanupSandboxTender` (H1) |
| `cloud` | `psb-cloud-*` | `kw-tenders-pipeline` | `cleanupSandboxTender` (H4 — ten sam helper) |
| `job` | `psb-job-*` | `kw-jobs` | `cleanupSandboxJob` (H2) |
| `catalog` | `psb-catalog-*` / H5 fixture | `kw-wgdom-work-catalog` | remove work row RMW (H5 `catalog-helpers` path) |
| `other` | `psb-*` (H0 preflight mocks) | — | no-op / local-only · **no KV write** |

### 6.3 Reguły registry

1. Unknown `kind` → **FAIL loud** `PSB_H0X_UNKNOWN_KIND` (nie silent skip).  
2. Cleaner **zawsze** przez mutate-guard / assertWritable (`psb-*` only).  
3. H3-A: brak create → registry nie używany.  
4. Scan net (opcjonalny): odkrywa kandydatów po prefiksie/`psb-*` + maps na `kind` heurystyką prefiksu; bez match → WARNING + skip (nie delete blindly).

### 6.4 Integracja ze scenariuszami

| Dziś | Po H0.x (PLAN) |
|------|----------------|
| H1/H2 lokalny orphan-scrub | Zastąpione przez runner recovery (lub thin call do shared recover) |
| H4/H5 tylko `finally` | + ledger track przy create · recovery na starcie dowolnego scenario |

---

## 7. Timing względem `batch-set`

### 7.1 Decyzja (LOCKED)

```text
ORDER (allow-prod write path):

1. mutate-guard / FORBIDDEN assert
2. cleanup.track(...) 
3. ledger upsert status=pending   ← BEFORE batch-set
4. batch-set(...)
5. on ok:true  → ledger status=open
6. on ok:false → ledger prune (pending failed) OR leave pending + report
7. on scenario success path untrack/cleanup → ledger remove
8. finally PSB-001 runAll → ledger remove per cleaned id
```

### 7.2 Uzasadnienie

| Strategia | Orphan jeśli crash między set a ledger | False open jeśli set FAIL |
|-----------|----------------------------------------|---------------------------|
| Ledger **po** set | **TAK — źle** | NIE |
| Ledger **przed** set (`pending`) | NIE | TAK — **OK** jeśli recovery = verify-absent → prune |

**Wybór:** ledger **przed** `batch-set` + status `pending`/`open` + idempotent recovery.

### 7.3 Flush

- Po każdej mutacji ledger: **atomic write** (temp file + rename).  
- Windows: unikać partial JSON.  
- Best-effort `fsync` jeśli dostępne (nie blokuje DF jeśli niedostępne).

---

## 8. Concurrency model

### 8.1 Decyzja (LOCKED)

```text
Single-writer Persist Ledger per machine workspace.

Lock file: .tmp/prod-sandbox-out/h0x.lock
  contents: { pid, startedAt, scenario }
```

| Sytuacja | Zachowanie |
|----------|------------|
| Drugi runner startuje, lock żywy (pid exists) | **FAIL loud** `PSB_H0X_LOCK_HELD` (exit ≠ 0) |
| Lock stale (pid dead) | Przejmij lock + recovery |
| Dry-run | Lock **opcjonalny** / soft — prefer no conflict with allow-prod |
| Równoległe scenariusze | **ZAKAZ** w H0.x MVP (#PSB-010 spirit) |

### 8.2 Multi-machine

Poza zakresem MVP — ledger jest **lokalny**. Orphany na innym hoście → tylko optional scan na tym hoście z `--allow-prod`.

---

## 9. Recovery flow po crash / kill

```text
runner start (--allow-prod)
  │
  ├─ acquire h0x.lock (or fail)
  ├─ load h0x-open-entities.json
  ├─ for each entity (LIFO by updatedAt):
  │     status pending|open|cleaning
  │       → registry[kind].cleanup(...)
  │       → verify absent in kvKey
  │       → PASS: prune from ledger
  │       → FAIL: leftover list + PSB-001 style FAIL
  │
  ├─ if PSB_H0X_SCAN=1:
  │     batch-get(SCAN_KEYS) → find psb-* not in allowlist non-sandbox
  │       → map kind by prefix → cleanup → report WARNING counts
  │
  ├─ release path continues → run requested scenario
  │     (scenario track/ledger as normal + in-session PSB-001)
  │
  └─ on process exit (finally): release lock · flush ledger
```

### 9.1 SCAN_KEYS (gdy flag ON) — kandydat DF

| Key | Kind heurystyka |
|-----|-----------------|
| `kw-tenders-pipeline` | `psb-tender-*` → tender · `psb-cloud-*` → cloud |
| `kw-jobs` | `psb-job-*` → job |
| `kw-wgdom-work-catalog` | `psb-*` w `works[]` → catalog |

**Nigdy** scan payroll / auth / billing / cost-catalog (#PSB + H5 REJECT surface).

### 9.2 Test dowodowy (PLAN/DF)

1. `--allow-prod`: create → ledger `open` → **exit bez cleanup** (symulacja kill; nie wymaga OS kill).  
2. Re-run: recovery usuwa encję · ledger empty · exit 0.  
3. Dry-run: zero KV mutation.  
4. Concurrent second allow-prod: lock FAIL.

---

## 10. Potwierdzenie braku wpływu (LOCKED)

| Warstwa | Wpływ H0.x | Dowód decyzji |
|---------|------------|---------------|
| **Protected Core** (`cloud-sync`, merge, fence) | **ZERO** | OUT · #PSB-007 · D5 |
| **D5 ZERO Core** | **ZACHOWANE** | brak edycji Core path |
| **Payroll** | **ZERO** | brak payroll keys w ledger/scan · H3-B/C OUT |
| **Theme** | **ZERO** | brak UI/theme plików |
| **Edge** | **ZERO** | reuse istniejącego `kv-client` / batch API · **bez** zmian `supabase/functions/**` |
| **UI / version bump** | **ZERO** | tooling-only tip (jak H4/H5) |
| **New KV** | **ZERO** | file ledger · E REJECT |

```text
D5 ZERO Core: CONFIRMED for H0.x decision scope
```

---

## 11. Open questions → PLAN (nie blokują decyzji C)

| # | Pytanie | Sugestia RCA |
|---|---------|--------------|
| Q1 | Czy H0 preflight dostaje scenariusz `h0x-recover`? | TAK — thin suite `prod-sandbox-h0x` |
| Q2 | Czy scan default OFF na zawsze? | TAK MVP · Owner może ON |
| Q3 | Czy atomic rename na wszystkich FS Windows? | PLAN: wzorzec jak report.mjs / verify |
| Q4 | Meta region dla H5 dual-region? | `meta.region` optional · cleaner już dual-verify w H5 |

---

## 12. Mapowanie AUDIT → RCA

| AUDIT | RCA |
|-------|-----|
| Prefer C | **SELECT C** |
| E REJECT | **CONFIRMED REJECT** |
| Timing before/after set | **BEFORE** + `pending`/`open` |
| Cleaner registry | **LOCKED** tabela §6 |
| Concurrent | **Single-writer lock** |
| Next | PLAN |

---

## 13. Stop gate

```text
RCA COMPLETE → czekaj OWNER GO
  „GO PLAN TEST-HARNESS-01 H0.x”
Bez GO: zero PLAN / DF / kodu / commit / push.
```

**Koniec RCA H0.x**
