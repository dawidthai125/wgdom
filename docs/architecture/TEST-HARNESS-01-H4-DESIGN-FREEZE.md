# TEST-HARNESS-01 H4 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO IMPLEMENT  
> **Data:** 2026-07-20  
> **Owner GO DESIGN FREEZE:** ✅  
> **Baseline prod:** UI **2.65.35** · app **`fce7b78`** · **GREEN**  
> **Wejście:** [`TEST-HARNESS-01-H4-AUDIT.md`](TEST-HARNESS-01-H4-AUDIT.md) · [`TEST-HARNESS-01-H4-RCA.md`](TEST-HARNESS-01-H4-RCA.md) · [`TEST-HARNESS-01-H4-PLAN.md`](TEST-HARNESS-01-H4-PLAN.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H4 Cloud AC  
> **IMPLEMENT:** **BLOCKED**

---

## 0. Dziedziczenie H0 / H1 (bez zmian kontraktu)

| Zasada | H4 |
|--------|-----|
| D1 Marked entities | **TAK** — encja `psb-cloud-*` (lub `makePsbId("cloud")`) |
| D4 No new KV | **TAK** |
| D5 Zero Protected Core | **TAK** — twarde |
| D6 Prefix `psb-*` | **TAK** |
| D8 Mutate guard | **TAK** — przed każdym write |
| PSB-001 Cleanup Guarantee | **TAK** — `finally` PASS i FAIL |
| #PSB-003 `--allow-prod` | **WYMAGANE** dla write na prod |
| #PSB-004 Dry-run | **TAK** — zero `batch-set` |
| #PSB-008/009 | **TAK** — brak ownership logiki domeny / merge Core |
| #PSB-010 One bundle | **TAK** — tylko H4 |
| #PSB-≠-TI | **TAK** |
| H1 nested merge-append | **TAK** — reuse wzorca na `kw-tenders-pipeline` |
| H1 deleted-ids cleanup | **TAK** — `kw-tenders-deleted-ids` |
| H1/H2 Playwright UI domain | **NIE** — H4 = **KV-only** (zamrożone Q1) |
| H2 photos / storage | **NIE** |
| H3-A payroll RO | **NIE mieszać** — osobny scenariusz |
| H0.x Persist Ledger | **NIE w H4** |
| Dual-writer / N2 | **ZAKAZ** |

---

## 1. Cel zamrożony

Automatyczny scenariusz **`h4-cloud`** na prod: izolowany round-trip Edge KV

```text
batch-get → nested insert psb-* → batch-set (ok:true) → batch-get parity → soft metrics (optional) → cleanup
```

wyłącznie na **nowo utworzonej** encji sandbox w istniejącym kluczu domenowym, z twardym FORBIDDEN gate, preservacją non-`psb-*`, bez zmian Protected Core, bez dual-writer, bez nowego KV.

---

## 2. Ostateczna architektura H4

```text
                    ┌─────────────────────────────┐
                    │  runner.mjs (--scenario h4) │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   H0 preflight              h4-cloud.mjs              report.mjs
   allowlist/markers         (orchestration)           .tmp/.../report.json
   mutate-guard                    │
   cleanup tracker                 │
         │                         ▼
         │              ┌──────────────────────┐
         │              │ kv-client.mjs (SSOT) │
         │              │ batchGet / batchSet  │
         │              └──────────┬───────────┘
         │                         │
         │                         ▼
         │              Edge make-server-0afb8820
         │              /batch-get · /batch-set
         │                         │
         │                         ▼
         │              kw-tenders-pipeline
         │              (+ deleted-ids @ cleanup)
         │
         └──────────► FORBIDDEN keys hard-deny
                      (payroll / auth / billing)

Soft appendix (non-blocking):
  metrics.batchSetRetries → report WARNING if 0 / unavailable
  NO Playwright required · NO __wgdomSyncMetrics required for PASS
```

**Warstwy:**

| Warstwa | Rola H4 |
|---------|---------|
| Harness (test-infra) | Jedyna warstwa zmian |
| Edge KV | Transport under test (read/write sandbox nested) |
| App Cloud Sync / N1 | **Poza ścieżką write** — raw `kv-client` ≠ app retry loop (RCA RC-4 — akceptowane) |
| UI / Playwright | **Poza MVP H4** (KV-only) |
| Payroll Fence | **Nietknięty** — FORBIDDEN write |

---

## 3. Decyzje H4 (D-H4-01 … D-H4-22)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H4-01** | Write-surface | **Nested `psb-*`** (Wariant A) — primary |
| **D-H4-02** | Domain key | **`kw-tenders-pipeline`** only (MVP) |
| **D-H4-03** | Cleanup companion | **`kw-tenders-deleted-ids`** (wzorzec H1) |
| **D-H4-04** | Alternatywa `kw-jobs` | **OUT** MVP — wymaga DF delta + Owner GO |
| **D-H4-05** | Execution mode | **KV-only** — bez Playwright / bez loginu (PLAN Q1 **FROZEN**) |
| **D-H4-06** | Seed model | Always-create `makePsbId("cloud")` · session-created |
| **D-H4-07** | Entity shape | Minimal marker: `{ id, title }` gdzie `title` zaczyna się od `psb-` · **bez** PDF/dossier/photos |
| **D-H4-08** | Merge rule | Read full list → append **one** sandbox entity → write full list **preserving** all non-matching ids |
| **D-H4-09** | Wipe ban | Zakaz replace pustą listą / zakaz drop non-`psb-*` |
| **D-H4-10** | Preservacja assert | Po set: `count(non-psb-*)` ≥ baseline sprzed insert (FAIL jeśli spadł) |
| **D-H4-11** | Parity assert | Po set: sandbox id obecny w `batch-get`; po cleanup: nieobecny |
| **D-H4-12** | `ok:true` | Wymagane na sukces `batch-set`; inaczej FAIL scenario |
| **D-H4-13** | Telemetry | Soft reporting only · **nie** wymagane do PASS |
| **D-H4-14** | `batchSetRetries=0` | **WARNING only** — nigdy FAIL |
| **D-H4-15** | Metrics source | Jeśli brak page/API: pomiń + WARNING (PLAN Q2 **FROZEN**) — **nie** wymuszaj loginu |
| **D-H4-16** | Dual-writer | **ZAKAZ** — zero celowego 2-tab / deadlock |
| **D-H4-17** | New KV | **ZAKAZ** (D4) |
| **D-H4-18** | Core / Edge / Payroll / Theme | **Zero** zmian produkcyjnych (D5) |
| **D-H4-19** | CLI | `npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod` |
| **D-H4-20** | CI | Manual / Owner only — **nie** gate B/C |
| **D-H4-21** | UI version bump | **NIE** (tooling-only, jak H0–H3) |
| **D-H4-22** | Scope lock | Zakaz rozszerzania na H5 / photos / PDF / payroll / N2 w tym samym bundle |

---

## 4. Principles H4 (#H4-001 … #H4-014)

| # | Principle |
|---|-----------|
| **#H4-001** | Never full-replace domain key without preserving non-`psb-*` |
| **#H4-002** | Never `batch-set` FORBIDDEN keys |
| **#H4-003** | Never touch Payroll Resurrection Fence / PWRB / week roster |
| **#H4-004** | Never add retry loop to `kv-client` or Core (N1 SSOT stays in app) |
| **#H4-005** | Never require `__wgdomSyncMetrics` for PASS |
| **#H4-006** | `batchSetRetries=0` = WARNING, not FAIL |
| **#H4-007** | Cleanup in `finally` (PASS and FAIL) — PSB-001 + deleted-ids |
| **#H4-008** | `--allow-prod` required for prod write; dry-run forbids `batch-set` |
| **#H4-009** | Zero Protected Core / Edge / Theme / App version changes |
| **#H4-010** | One scenario bundle = H4 only |
| **#H4-011** | Reuse `kv-client` + H0 guards + H1 cleanup pattern — no duplicate clients |
| **#H4-012** | KV-only MVP — no Playwright dependency |
| **#H4-013** | Reports gitignored (`.tmp/prod-sandbox-out/`) |
| **#H4-014** | Fail-loud `PSB_*` / `H4_*` preconditions |

---

## 5. Zamrożone interfejsy i przepływy danych

### 5.1 CLI (kontrakt)

```text
npm run test:prod-sandbox -- --scenario h4-cloud
npm run test:prod-sandbox -- --scenario h4-cloud --dry-run
npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
npm run test:prod-sandbox -- --scenario h4          # alias → h4-cloud
```

Exit codes (dziedziczone parent DF §6): **0** PASS · **2** precondition · **3** scenario FAIL · **4** cleanup FAIL.

### 5.2 Przepływ danych (zamrożony)

```text
preflight (H0 + --allow-prod | dry-run)
  → FORBIDDEN gate ready
  → makePsbId("cloud") + session.registerCreated + mutateGuard.assertWritable
  → cleanup.track(entity, cleaner)
  → baseline = batchGet([kw-tenders-pipeline])
  → baselineNonPsbCount = count(non-psb-*)
  → dry-run? → plan steps, exit PASS path without set
  → merged = baseline.items ∪ { id, title: psb-… }
  → batchSet([kw-tenders-pipeline], [merged])  → require ok / !5xx
  → after = batchGet([kw-tenders-pipeline])
  → assert sandbox present · nonPsbCount >= baselineNonPsbCount
  → soft metrics → report (WARNING ok)
  → finally cleaner:
        filter out id from pipeline
        append id to kw-tenders-deleted-ids
        batchSet both
  → verify absent · PSB-001 empty leftovers
```

### 5.3 Report fields (min.)

| Pole | Wymagane |
|------|----------|
| `scenario` = `h4-cloud` | TAK |
| `steps[]` | TAK |
| `mutatedIds` | TAK |
| `cleanup` status/code | TAK |
| `preservation.nonPsbBefore/After` | TAK |
| `metrics.batchSetRetries` / `metrics.warning` | NIE (soft) |
| Artefakt | `.tmp/prod-sandbox-out/<runId>/report.json` |

---

## 6. FORBIDDEN keys i Payroll Fence (zamrożone)

### 6.1 FORBIDDEN write (hard deny przed każdym `batch-set`)

| Grupa | Klucze |
|-------|--------|
| Payroll | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`, `kw-week-employees-deleted-ids`, `kw-employee-leaves`, `kw-employee-leaves-deleted-ids` |
| Auth/ACL | `kw-admin-hash`, `kw-admin-passwords`, `kw-admin-users-config`, `kw-app-settings` |
| Billing | `kw-recoverable-charges` (+ deleted-ids) |

Naruszenie → exit **2** (`PSB_*` / `H4_FORBIDDEN_KEY`).

### 6.2 Payroll Resurrection Fence

| Reguła zamrożona |
|------------------|
| Zero write na kluczach payroll |
| Zero importu `payroll-bootstrap-resurrection-fence.ts` |
| Zero seed / hydrate `kw-week-*` |
| H3-A pozostaje jedynym PSB payroll path |

### 6.3 ALLOWED write (wyłącznie)

| Klucz | Operacja |
|-------|----------|
| `kw-tenders-pipeline` | nested append / filter-remove sandbox id |
| `kw-tenders-deleted-ids` | append sandbox id przy cleanup |

---

## 7. Potwierdzenie D5 ZERO Core

| Obszar | H4 zmienia? |
|--------|-------------|
| `src/lib/cloud-sync.ts` | **NIE** |
| `src/lib/cloud-batch-set-retry.ts` | **NIE** |
| `src/lib/payroll-bootstrap-resurrection-fence.ts` | **NIE** |
| Edge `make-server-0afb8820` | **NIE** |
| `App.tsx` / Theme / changelog UI | **NIE** |
| Merge / PWRB / Domain Push | **NIE** |
| `test-infra/prod-sandbox/**` + manifest + thin script | **TAK** (jedyny zakres) |

**Potwierdzenie DF:** H4 = Path A FEATURE/test-infra · **D5 ZERO Core unchanged**.

---

## 8. Mapa integracji H0 / H1 / `kv-client`

| Komponent | Integracja H4 |
|-----------|----------------|
| `markers.mjs` | `makePsbId("cloud")` · `isPsbId` |
| `allowlist.mjs` | Session-created wystarczy; allowlist nie wymagana do always-create |
| `mutate-guard.mjs` | Przed każdym write |
| `cleanup.mjs` | Tracker + PSB-001 |
| `report.mjs` | D11 JSON |
| `kv-client.mjs` | **Jedyny** Edge client — reuse, zero fork |
| `tender-helpers.mjs` (H1) | **Prefer reuse** seed/cleanup primitives jeśli pasują do minimal marker; **zakaz** kopiowania PDF/UI pipeline |
| `job-helpers.mjs` (H2) | **NIE** w MVP (D-H4-04) |
| `payroll-helpers.mjs` (H3) | **NIE** |
| Nowy `cloud-helpers.mjs` | **Tylko jeśli** reuse H1 helpers jest niemożliwy bez przeciągania UI — cienki, bez duplikatu `kv-client` |

---

## 9. Ostateczna lista plików (scope lock)

### 9.1 Pliki do zmiany / utworzenia (IN)

| Plik | Akcja |
|------|-------|
| `test-infra/prod-sandbox/scenarios/h4-cloud.mjs` | CREATE |
| `test-infra/prod-sandbox/runner.mjs` | MODIFY (register `h4-cloud` / `h4`) |
| `test-infra/prod-sandbox/README.md` | MODIFY |
| `scripts/test-prod-sandbox-h4.mjs` | CREATE (thin wrapper) |
| `test-infra/test-manifest.json` | MODIFY (`prod-sandbox-h4` · `PROD-SANDBOX-H4`) |
| `test-infra/prod-sandbox/cloud-helpers.mjs` | CREATE **opcjonalnie** (tylko jeśli konieczne po reuse-check H1) |

### 9.2 Pliki zakazane (OUT)

Wszystkie `src/**` Core · Edge · Payroll · Theme · H5 scenarios · N2 dual-writer tooling · nowy KV.

### 9.3 Potwierdzenie: zakres się nie rozszerzy

Zmiana któregokolwiek z: Playwright mandatory · `kw-jobs` path · nowy KV · Core retry · payroll keys · H5 · photos/PDF · FAIL na retries=0  

→ **wymaga nowego AUDIT / Owner GO** — nie „doróbki” w H4 IMPLEMENT.

---

## 10. Acceptance Criteria (zamrożone)

| Krok | PASS | WARNING | FAIL |
|------|------|---------|------|
| Preflight | H0 OK · allow-prod / dry-run spójne | — | brak allow-prod na write |
| FORBIDDEN gate | deny list aktywna | — | próba set FORBIDDEN |
| Create nested | `psb-*` w pipeline po set | — | mutate denied / set error |
| `ok:true` / HTTP | sukces set | — | 5xx / `ok:false` |
| Preservacja | non-`psb-*` count ≥ baseline | — | spadek count non-sandbox |
| Parity | id widoczny po get | — | brak id |
| Metrics | — | retries=0 / brak API | — (nigdy FAIL) |
| Cleanup | id usunięty · w deleted-ids · tracker empty | — | leftovers → exit **4** |

---

## 11. Out of scope (twarde)

- Playwright / login / UI Przetargi  
- `kw-jobs` / photos / storage  
- Payroll write / fence / H3-B/C  
- Nowy klucz KV  
- Dual-writer / DEADLOCK-N2  
- Retry loop w harness  
- Gate B/C CI  
- UI changelog / version bump  
- H5 Biblioteka · H0.x Persist Ledger  

---

## 12. Checklist gotowości do ARCH REVIEW

- [x] AUDIT COMPLETE  
- [x] RCA COMPLETE · Wariant A primary  
- [x] PLAN COMPLETE  
- [x] DESIGN FREEZE dokument ten plik  
- [x] D5 ZERO Core potwierdzone  
- [x] FORBIDDEN keys + Fence potwierdzone  
- [x] Integracja H0/H1/`kv-client` zamrożona  
- [x] Scope lock (lista plików IN/OUT)  
- [x] AC PASS/WARNING/FAIL zamrożone  
- [x] Q1 KV-only · Q2 metrics soft · Q3 minimal entity — **FROZEN**  
- [ ] ARCH REVIEW dokument — po Owner GO  
- [ ] IMPLEMENT — zablokowany do Owner GO IMPLEMENT  

---

## 13. Stop gate

```text
DESIGN FREEZE H4 COMPLETE → czekaj OWNER GO
  „GO ARCH REVIEW TEST-HARNESS-01 H4”
Bez GO: zero ARCH REVIEW / IMPLEMENT / kodu / commit / push / bump wersji.
```

**Zmiana DF H4** = nowy AUDIT + Owner GO.

---

**Koniec DESIGN FREEZE H4**
