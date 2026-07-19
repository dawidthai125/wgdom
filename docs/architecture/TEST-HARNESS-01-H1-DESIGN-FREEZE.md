# TEST-HARNESS-01 H1 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H1** · Tender Production Sandbox  
> **Status:** DESIGN FREEZE · **H1 IMPLEMENTED** (Owner Verification pending) · H2–H5 **NOT STARTED**  
> **NIE implementować H2–H5** bez jawnego Owner GO  
> **Data:** 2026-07-19 · H1 impl: 2026-07-19  
> **Owner:** always-create `psb-*` tender + pełny cleanup  
> **Fundament H0:** markers · allowlist · mutate-guard · **PSB-001 Cleanup Guarantee**  
> **H1 report:** [`TEST-HARNESS-01-H1-IMPLEMENTATION-REPORT.md`](TEST-HARNESS-01-H1-IMPLEMENTATION-REPORT.md)  
> **RCA / PLAN / Review:** [`TEST-HARNESS-01-H1-RCA.md`](TEST-HARNESS-01-H1-RCA.md) · [`TEST-HARNESS-01-H1-PLAN.md`](TEST-HARNESS-01-H1-PLAN.md) · [`TEST-HARNESS-01-H1-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H1-ARCHITECTURE-REVIEW.md)

---

## 0. Dziedziczenie H0 (bez zmian)

| Zasada H0 | H1 |
|-----------|-----|
| D1 Marked entities | **TAK** — tender `psb-tender-…` |
| D5 Zero Protected Core | **TAK** |
| D6 Prefix `psb-*` | **TAK** |
| D8 Mutate guard | **TAK** — przed każdym write |
| PSB-001 Cleanup Guarantee | **TAK** — `finally` po PASS i FAIL |
| #PSB-≠-TI | **TAK** — nie mieszać z Payroll Preview |
| #PSB-003 `--allow-prod` | **WYMAGANE** dla H1 (prod write) |
| #PSB-004 Dry-run | **TAK** — zero side effects |
| H0.x Persist Ledger | **NIE w H1** — gap zostaje, dokumentowany |

---

## 1. Cel zamrożony

Automatyczny scenariusz `h1-tender` na prod: pełna ścieżka PDF→proposal→save wyłącznie na **nowo utworzonym** tenderze `psb-*`, z twardym cleanup (pipeline + tombstone).

---

## 2. Decyzje H1 (D-H1-01 … D-H1-14)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H1-01** | Seed model | **Always create** nowy tender (`makePsbId("tender")`) — nie reuse realnych |
| **D-H1-02** | Create path | **KV seed** `kw-tenders-pipeline` (read → merge append → batch-set); UI nie ma blank create |
| **D-H1-03** | Mutate scope | Tylko encja sesji `psb-*` (+ ewentualnie `PSB_TENDER_IDS` nie używane w MVP always-create) |
| **D-H1-04** | PDF | Fixture lokalny committed/`fixtures/sample-przedmiar.pdf` · UI „Wgraj SWZ” |
| **D-H1-05** | Analysis PASS | Brak Application error · `uploadedFile` **lub** dossier/kosztorys partial ready · `pipelineState ≠ Failed` (jeśli dostępne) |
| **D-H1-06** | Classification | Non-empty path / UI wynik; **UNKNOWN → WARNING**, nie FAIL |
| **D-H1-07** | Proposal | UI reachable **lub** derived proposal/pricingReady* non-null — **bez** assertu kwoty PLN |
| **D-H1-08** | Save | `batch-get kw-tenders-pipeline` zawiera sandbox item ze śladami upload/estimate |
| **D-H1-09** | Cleanup | Usuń z pipeline **oraz** append `kw-tenders-deleted-ids` · tracker H0 |
| **D-H1-10** | Catalog | **Read-only** — zero zapisów do `kw-wgdom-cost-catalog` |
| **D-H1-11** | Core / Edge | **Zero** zmian kodu produkcyjnego |
| **D-H1-12** | CLI | `npm run test:prod-sandbox -- --scenario h1-tender --allow-prod` |
| **D-H1-13** | CI | Manual / Owner only — **nie** gate B/C |
| **D-H1-14** | Timeout | Bounded waits (np. analysis ≤ N s) → FAIL scenario, potem cleanup |

---

## 3. Principles H1 (#H1-001 … #H1-012)

| # | Principle |
|---|-----------|
| **#H1-001** | Never seed/replace entire pipeline — merge-append only |
| **#H1-002** | Never touch non-`psb-*` tender IDs |
| **#H1-003** | Cleanup must tombstone (`kw-tenders-deleted-ids`) |
| **#H1-004** | Cleanup in `finally` (PASS and FAIL) — PSB-001 |
| **#H1-005** | Classification UNKNOWN is WARNING, not FAIL |
| **#H1-006** | No assert on exact bid PLN / full BZP discovery success |
| **#H1-007** | Catalog / company profile / keywords — read-only |
| **#H1-008** | `--allow-prod` required; dry-run forbids batch-set & UI write |
| **#H1-009** | Zero Protected Core / Edge / classifier code changes |
| **#H1-010** | One scenario bundle = H1 only |
| **#H1-011** | Reports gitignored (`.tmp/prod-sandbox-out/`) |
| **#H1-012** | Fail-loud `PSB_*` / `H1_*` preconditions |

---

## 4. Kontrakt kroków AC

| Krok | PASS | WARNING | FAIL |
|------|------|---------|------|
| Preflight | H0 modules OK · `--allow-prod` | — | brak allow-prod / dry-run conflict |
| Create | item `psb-*` w pipeline (batch-get) | — | mutate denied / seed error |
| PDF import | `uploadedFile` set **lub** file w dossier | wolny upload ale sukces | timeout / Application error |
| Analysis | state nie-Failed · brak crash | partial dossier | crash / Failed |
| Classification | wynik/path widoczny | UNKNOWN / weak fixture | wyjątek klasyfikatora / crash |
| Proposal | panel / object reachable | puste liczby ale obiekt istnieje | brak surface + crash |
| Save | batch-get potwierdza pola sandbox | sync icon flaky | brak persystencji sandbox |
| Cleanup | brak item w pipeline · id w deleted-ids · tracker empty | storage orphan | leftover pipeline / exit **4** |

---

## 5. Cleanup (kontrakt zamrożony)

```text
cleaner(tenderId):
  assert isPsbId(tenderId)
  assertWritable / session-created
  batch-get kw-tenders-pipeline
  filter out tenderId
  batch-set kw-tenders-pipeline (merged list)
  batch-get kw-tenders-deleted-ids
  append tenderId (uniq)
  batch-set kw-tenders-deleted-ids
  return { ok: true }
```

Po cleanup: opcjonalny verify batch-get — brak id w pipeline.

---

## 6. Selectory UI (zamrożone wskazówki)

| Akcja | Selector / path |
|-------|-----------------|
| Detail | `/przetargi/{id}/…` (`buildTenderDetailPath`) |
| Upload | `[data-tender-workflow-hub="operator"] input[type=file]` lub `[data-tender-operator-action-bar] input[type=file]` |
| Lista | `[data-tender-id="{id}"]` (opcjonalnie) |

Brak zależności od niestabilnych klas CSS.

---

## 7. Pliki planowane (IMPLEMENT)

```text
test-infra/prod-sandbox/scenarios/h1-tender.mjs
test-infra/prod-sandbox/fixtures/sample-przedmiar.pdf
test-infra/prod-sandbox/runner.mjs          # register h1-tender
test-infra/test-manifest.json               # PROD-SANDBOX-H1 suite
docs/architecture/TEST-HARNESS-01-H1-*      # te docs + później impl report
```

**Zakaz edycji:** `src/lib/cloud-sync.ts`, Edge, classifier produkcyjny, Payroll.

---

## 8. Exit codes

Bez zmian względem H0 DF §6: `0` PASS · `2` precondition · `3` scenario FAIL · `4` cleanup FAIL.

---

## 9. Acceptance Design Freeze

1. Owner akceptuje D-H1-01…14 + #H1-001…012  
2. Owner akceptuje always-create + tombstone cleanup  
3. Jawne GO: `IMPLEMENT TEST-HARNESS-01 H1`

---

## 10. Zakazy

- Implementacja przed GO  
- Reuse realnego przetargu „na skróty”  
- `batch-set` całego pipeline bez read-merge  
- Start H2 w tym samym bundle  
- Implementacja H0.x „przy okazji”  

---

**DESIGN FREEZE STATUS:** READY · czekaj na Owner GO.
