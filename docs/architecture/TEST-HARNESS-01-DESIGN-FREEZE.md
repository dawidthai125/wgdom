# TEST-HARNESS-01 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Production Sandbox Harness  
> **Status:** DESIGN FREEZE · **H0 IMPLEMENTED** (Owner Verification pending) · H1–H5 **NOT STARTED**  
> **NIE implementować H1–H5** bez jawnego Owner GO  
> **Data:** 2026-07-19 · H0 impl: 2026-07-19  
> **Model izolacji (Owner):** **Marked entities** (prefix + allowlist ID)  
> **H0 report:** [`TEST-HARNESS-01-H0-IMPLEMENTATION-REPORT.md`](TEST-HARNESS-01-H0-IMPLEMENTATION-REPORT.md)  
> **RCA / PLAN / Review:** [`TEST-HARNESS-01-RCA.md`](TEST-HARNESS-01-RCA.md) · [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) · [`TEST-HARNESS-01-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-ARCHITECTURE-REVIEW.md)

---

## 0. Status względem TI-B2.1

| Element | Reguła zamrożona |
|---------|------------------|
| Payroll Preview harness (`e2e` seed) | **Bez zmian** — nadal Preview First / `UNSAFE_TARGET` |
| `#018` sandbox w kontekście Payroll seed | **Nadal SUPERSEDED** dla tego harnessa |
| TEST-HARNESS-01 | **Nowa klasa** — Production Sandbox Harness (PSB) |
| Relacja | PSB **nie** cofa TI-B2.1; **nie** wznawia `O-PROD-HARNESS-L5` |

**Principle #PSB-≠-TI:** zakaz współdzielenia seed API Payroll Preview z runnerem PSB.

---

## 1. Cel zamrożony

Automatyczny harness umożliwia **bezpieczne** pełne scenariusze E2E na prod **wyłącznie** na encjach oznaczonych jako sandbox, z hard-stop poza allowlistą i **obowiązkowym cleanup**.

---

## 2. Decyzje zamrożone (D1–D12)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D1** | Izolacja | **Marked entities** + allowlist ID (nie osobny KV namespace) |
| **D2** | Środowisko docelowe | `prod` tylko z `--allow-prod`; dodatkowo `dry-run` |
| **D3** | Lokalizacja kodu | `test-infra/prod-sandbox/**` + opcjonalnie cienki wpis manifestu `class: prod-sandbox` |
| **D4** | Nowy klucz KV | **NIE** w MVP |
| **D5** | Protected Core (`cloud-sync`, Edge, merge) | **ZERO zmian** w tym bundle |
| **D6** | Prefix markera | Encje tworzone przez harness: ID/title/name zaczyna się od `psb-` **lub** pole `harnessSandbox === true` (gdy model domeny pozwala) |
| **D7** | Allowlist | Env lub plik lokalny (gitignore): `PSB_JOB_IDS`, `PSB_TENDER_IDS`, `PSB_CATALOG_ROW_IDS`, `PSB_PAYROLL_WEEK_ID` |
| **D8** | Mutate guard | Przed każdym write: ID ∈ allowlist **lub** nowo utworzony z prefixem `psb-` w tej sesji; inaczej `PSB_MUTATE_DENIED` (fail-loud) |
| **D9** | Cleanup | Każdy scenariusz kończy się fazą cleanup; fail scenariusz jeśli cleanup nie usunie artefaktów sesji |
| **D10** | Auth | Istniejące konta testowe / admin — **bez** commitowania haseł; tylko env |
| **D11** | Report | JSON per run: steps, asserts, network 5xx, console errors, mutated IDs, cleanup status |
| **D12** | Kolejność IMPLEMENT | H0 → H4 → H2 → H5 → H1 → H3 |

---

## 3. Principles (#PSB-001 … #PSB-015)

| # | Principle |
|---|-----------|
| **#PSB-001** | Never touch non-sandbox entities |
| **#PSB-002** | Allowlist or session-created `psb-*` only |
| **#PSB-003** | `--allow-prod` required for any prod write |
| **#PSB-004** | Dry-run must be side-effect free |
| **#PSB-005** | Cleanup is part of PASS criteria |
| **#PSB-006** | No new KV keys in MVP |
| **#PSB-007** | No Protected Core edits in this program |
| **#PSB-008** | SSOT import only — nie kopiować merge/klassifierów |
| **#PSB-009** | Harness never owns domain logic (#014 parity) |
| **#PSB-010** | One scenario bundle at a time (align #CORE-013 gdy kiedyś CORE) |
| **#PSB-011** | Fail-loud preconditions (`PSB_*` errors) ≠ soft skip |
| **#PSB-012** | Payroll save nigdy na aktywnym tygodniu operacyjnym bez osobnego Owner GO |
| **#PSB-013** | Storage uploads tylko pod sandbox job / path z markerem |
| **#PSB-014** | Reports to `.tmp/` / gitignored out — nie commitować artefaktów |
| **#PSB-015** | #PSB-≠-TI — izolacja od Payroll Preview harness |

---

## 4. Marker & allowlist (kontrakt)

### 4.1 Tworzone encje

```text
job.id / job.title          → prefix "psb-"  OR  job.meta.harnessSandbox === true
tender.id / tender.title    → prefix "psb-"  OR  explicit allowlist ID
catalog row id / name       → prefix "psb-"
photo / attachment          → powiązane wyłącznie z sandbox job
```

### 4.2 Preflight (obowiązkowy)

1. `version.json` match opcjonalny pin (`PSB_EXPECT_VERSION`)  
2. `--allow-prod` obecne  
3. Allowlist załadowana (może być pusta **tylko** jeśli scenariusz wyłącznie tworzy `psb-*` i cleanup je usuwa)  
4. Dla H2 mutate-existing: ≥1 `PSB_JOB_IDS`  
5. Target URL = prod host allowlist (`www.wgdom.fun`)

### 4.3 Mutate guard (pseudokod zamrożony)

```text
assertWritable(entity):
  if entity.id in allowlist → OK
  if entity.id startsWith "psb-" AND createdInThisRun → OK
  else throw PSB_MUTATE_DENIED
```

---

## 5. Scenariusze — kontrakty AC

### H1 Tender — AC

| Krok | Assert |
|------|--------|
| Open sandbox tender | ID allowlist / `psb-*` |
| PDF upload | fixture PDF; dokument widoczny w dossier sandbox |
| Analysis | brak Application error; state ≠ crash |
| Classification | wynik widoczny / nie-empty path (tolerancja: UNKNOWN OK jeśli fixture słaby — oznacz WARNING nie FAIL na klasyfikator) |
| Proposal | UI proposal reachable |
| Save | push/sync indicator OK **lub** `batch-get` potwierdza zmianę sandbox tender |
| Cleanup | usunięcie/restore stanu sandbox; report `cleanup=PASS` |

### H2 Jobs — AC

| Krok | Assert |
|------|--------|
| Create | job `psb-*` w liście / KV |
| Upload N photos | N URL w job |
| Delete M photos | M tombstone / count spada |
| Sync | `batch-get kw-jobs` zawiera tombstone parity |
| Cleanup | job usunięty lub tombstoned; storage orphans = 0 w zakresie sesji |

### H3 Payroll — AC (policy zamrożona)

| Tryb | Zachowanie |
|------|------------|
| **H3-A (MVP default)** | Open + week + **KPI verify** · **bez** „Zapisz tydzień” na prod |
| **H3-B (opcjonalny, osobny GO)** | Save tylko gdy `PSB_PAYROLL_WEEK_ID` allowlist **i** week ≠ current operational week |
| **H3-C (ACCEPTABLE alt)** | Save na preview; KPI read-only na prod |

**Zamrożone:** MVP = **H3-A**. H3-B/C tylko po dodatkowym Owner GO.

### H4 Cloud — AC

| Krok | Assert |
|------|--------|
| batch-get | allowlist keys OK |
| batch-set | tylko payload sandbox-entity; response `ok:true` |
| retry | jeśli N1 retry wystąpi — `batchSetRetries` w report (obserwacja); brak wymuszania deadlock |
| metrics | snapshot w report |

### H5 Biblioteka — AC

| Krok | Assert |
|------|--------|
| Create `psb-*` row | obecny w catalog |
| Keyword | zapisany |
| Edit | zmiana widoczna po re-fetch |
| Delete | brak wiersza; cleanup PASS |

---

## 6. CLI (zamrożony kształt)

```bash
npm run test:prod-sandbox -- --scenario h0-preflight
npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod
npm run test:prod-sandbox -- --scenario h1-tender --allow-prod --dry-run
npm run test:prod-sandbox -- --scenario all --allow-prod   # dopiero po zielonych pojedynczych
```

Exit codes:

| Code | Znaczenie |
|------|-----------|
| 0 | PASS |
| 2 | Precondition / `PSB_*` |
| 3 | Scenario FAIL |
| 4 | Cleanup FAIL |

---

## 7. Integracja z test-infra

| Element | Reguła |
|---------|--------|
| Manifest | Nowy suite `PROD-SANDBOX-*` · `environment: prod` · wymaga `--allow-prod` |
| Gate B/C istniejące | **Nie** blokować CI przez prod-sandbox (suite **manual / Owner**) |
| TI-B3 | Nie mieszać — CI gate to osobny backlog |
| Payroll Guard S1 | Bez zmian |

---

## 8. Pliki planowane (IMPLEMENT — nie tworzyć teraz)

```text
test-infra/prod-sandbox/
  README.md
  runner.mjs
  allowlist.example.json
  markers.mjs
  mutate-guard.mjs
  report.mjs
  scenarios/
    h0-preflight.mjs
    h1-tender.mjs
    h2-jobs-photos.mjs
    h3-payroll.mjs
    h4-cloud.mjs
    h5-biblioteka.mjs
  fixtures/
    sample-przedmiar.pdf   # mały fixture
scripts/  (opcjonalnie cienki wrapper npm)
package.json              # script test:prod-sandbox
test-infra/test-manifest.json  # wpis suite
docs/architecture/TEST-HARNESS-01-*  # te docs
```

---

## 9. Acceptance — Design Freeze COMPLETE gdy

1. Owner akceptuje D1–D12 + principles  
2. Owner akceptuje H3-A jako MVP payroll  
3. Owner przygotuje / zatwierdzi ≥1 sandbox job ID na allowlist (dla H2 mutate-existing) **lub** zgodę na always-create `psb-*`  
4. Jawne Owner GO: `IMPLEMENT TEST-HARNESS-01 H0` (lub szerszy zakres)

---

## 10. Zakazy

- Implementacja przed GO  
- Commit haseł / allowlist z prawdziwymi sekretami  
- `git add -A` przy release docs  
- Mutacja realnych jobów „tymczasowo”  
- Edycja `cloud-sync.ts` / Edge w tym programie  
- Wznawianie Payroll L5 prod seed pod płaszczykiem PSB  

---

**DESIGN FREEZE STATUS:** READY · czekaj na Owner GO.
