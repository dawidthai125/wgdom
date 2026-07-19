# TEST-HARNESS-01 H2 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H2** · Jobs Production Sandbox  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO  
> **Data:** 2026-07-19  
> **Owner:** always-create `psb-job-*` + pełny cleanup  
> **Fundament H0:** markers · allowlist · mutate-guard · **PSB-001 Cleanup Guarantee**  
> **Wzorce H1:** anti-wipe login→settle→seed→LS hydrate · hybrid KV+Playwright · cleanup retry  
> **RCA / PLAN / Review:** [`TEST-HARNESS-01-H2-RCA.md`](TEST-HARNESS-01-H2-RCA.md) · [`TEST-HARNESS-01-H2-PLAN.md`](TEST-HARNESS-01-H2-PLAN.md) · [`TEST-HARNESS-01-H2-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H2-ARCHITECTURE-REVIEW.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H2 AC  
> **Produkt (read-only SSOT):** [`JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md`](JOBS-PHOTOS-DELETE-SYNC-01-DESIGN-FREEZE.md)

---

## 0. Dziedziczenie H0 / H1 (bez zmian)

| Zasada | H2 |
|--------|-----|
| D1 Marked entities | **TAK** — job `psb-job-…` |
| D5 Zero Protected Core | **TAK** |
| D6 Prefix `psb-*` | **TAK** |
| D8 Mutate guard | **TAK** — przed każdym write |
| PSB-001 Cleanup Guarantee | **TAK** — `finally` po PASS i FAIL |
| #PSB-≠-TI | **TAK** — nie mieszać z Payroll Preview |
| #PSB-003 `--allow-prod` | **WYMAGANE** (prod write) |
| #PSB-004 Dry-run | **TAK** — zero side effects |
| H1 anti-wipe order | **TAK** — login → settle → seed → hydrate `kw-jobs` |
| H0.x Persist Ledger | **NIE w H2** — gap dokumentowany |

**Uwaga kolejności programu:** parent DF D12 sugerował H0→H4→H2… — **Owner override:** H0→H1→**H2** (ten slice).

---

## 1. Cel zamrożony

Automatyczny scenariusz `h2-jobs-photos` na prod: upload + sync + delete + weryfikacja braku resurrection wyłącznie na **nowo utworzonym** jobie `psb-*`, z twardym cleanup (lista jobów + tombstone).

---

## 2. Decyzje H2 (D-H2-01 … D-H2-16)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H2-01** | Seed model | **Always create** nowy job (`makePsbId("job")`) — nie mutate realnych |
| **D-H2-02** | Create path | **KV seed** `kw-jobs` (read → merge append → batch-set); minimalne pola joba wymagane przez UI |
| **D-H2-03** | Mutate scope | Tylko encja sesji `psb-job-*` (+ opcjonalnie `PSB_JOB_IDS` **nie** używane w MVP always-create) |
| **D-H2-04** | Assets | Fixture lokalny `fixtures/sample-job-photo.jpg` (lub PNG) · UI upload gallery / input file |
| **D-H2-05** | N / M | Default **N=2**, **M=1** (konfigurowalne env `PSB_H2_UPLOAD_N` / `PSB_H2_DELETE_M`, M&lt;N) |
| **D-H2-06** | Upload PASS | `batch-get`: job ma ≥ N wpisów w `photos[]` z non-empty URL/`id` |
| **D-H2-07** | Sync PASS | po upload: photos widoczne w KV **lub** po bounded wait auto-sync — SSOT = `batch-get kw-jobs` |
| **D-H2-08** | Delete path | UI delete → produktowy `removePhotoWithTombstone` (obserwacja; **zero** zmian lib) |
| **D-H2-09** | Propagation PASS | po wait ≥ **3 s** (debounce+margin): usunięte `id` **nie** w `photos[]` · obecne w `deletedPhotoTombstones[]` |
| **D-H2-10** | Resurrection FAIL | jeśli po wait usunięte `id` wraca w `photos[]` → scenario **FAIL** (potem cleanup) |
| **D-H2-11** | Cleanup | Usuń job z `kw-jobs` **oraz** append `kw-jobs-deleted-ids` · tracker H0 |
| **D-H2-12** | Storage blob | **Nie** wymagaj delete obiektu storage do PASS — orphan = WARNING max |
| **D-H2-13** | Core / Edge | **Zero** zmian kodu produkcyjnego |
| **D-H2-14** | CLI | `npm run test:prod-sandbox -- --scenario h2-jobs-photos --allow-prod` |
| **D-H2-15** | CI | Manual / Owner only — **nie** gate B/C |
| **D-H2-16** | Timeout | Bounded waits (upload/sync/delete) → FAIL scenario, potem cleanup |

---

## 3. Principles H2 (#H2-001 … #H2-014)

| # | Principle |
|---|-----------|
| **#H2-001** | **Sync Stability Window** — po delete odczekaj ustalone okno (default **5000** ms, env `PSB_H2_SYNC_STABILITY_MS`, min 2000) **przed** verify no resurrection |
| **#H2-001b** | Never seed/replace entire `kw-jobs` — merge-append only |
| **#H2-002** | Never touch non-`psb-*` job IDs |
| **#H2-003** | Cleanup must tombstone (`kw-jobs-deleted-ids`) |
| **#H2-004** | Cleanup in `finally` (PASS and FAIL) — PSB-001 |
| **#H2-005** | Delete propagation = SSOT `batch-get` tombstone parity (nie tylko UI) |
| **#H2-006** | Wait ≥ sync debounce before propagation assert |
| **#H2-007** | Storage blob leftover = WARNING, not FAIL |
| **#H2-008** | No assert on watermark pixels / EXIF / exact byte size |
| **#H2-009** | `--allow-prod` required; dry-run forbids batch-set & UI write |
| **#H2-010** | Zero Protected Core / Edge / `job-photos.ts` / `cloud-sync` changes |
| **#H2-011** | One scenario bundle = H2 only |
| **#H2-012** | Reports gitignored (`.tmp/prod-sandbox-out/`) |
| **#H2-013** | Fail-loud `PSB_*` / `H2_*` preconditions |
| **#H2-014** | Anti-wipe: hydrate `localStorage` `kw-jobs` from cloud after seed (H1 pattern) |

---

## 4. Kontrakt kroków AC

| Krok | PASS | WARNING | FAIL |
|------|------|---------|------|
| Preflight | H0 modules OK · `--allow-prod` | — | brak allow-prod |
| Create | job `psb-*` w `kw-jobs` (batch-get) | — | mutate denied / seed error |
| Hydrate | LS zawiera seed id | — | wipe po navigate (retry once; potem FAIL) |
| Upload N | ≥ N photos z id+URL | wolny upload | timeout / Application error |
| Sync | batch-get parity z UI count | sync icon flaky | photos znikają z KV |
| Delete M | UI usunął; tombstones rosną | — | delete UI niedostępny |
| Propagation | tombstone parity · brak resurrection po wait | soft F5 flaky ale KV OK | resurrection w KV |
| Cleanup | brak joba w `kw-jobs` · id w deleted-ids · tracker empty | storage orphan | leftover job / exit **4** |

Zgodność z parent DF § H2 AC: create · upload N · delete M · sync tombstone · cleanup.

---

## 5. Cleanup (kontrakt zamrożony)

```text
cleaner(jobId):
  assert isPsbId(jobId)
  assertWritable / session-created
  batch-get kw-jobs
  filter out jobId
  batch-set kw-jobs (merged list)
  batch-get kw-jobs-deleted-ids
  append jobId if missing
  batch-set kw-jobs-deleted-ids
  retry ≤ 5 if late UI push reintroduces job
  verify absent from kw-jobs
```

Exit **4** jeśli leftovers po `finally` (PSB-001).

---

## 6. Stable Assertions (H2-001 analog H1-001)

Weryfikowane wyłącznie:

- create job `psb-*`
- upload N (obecność w KV)
- sync persist
- delete M + tombstone parity
- no resurrection po wait
- cleanup

**Nie** porównywane: wymiary watermarku, hash pliku, pełna galeria UI pixel-perfect, blob storage GC.

---

## 7. Pliki planowane (IMPLEMENT — nie tworzyć teraz)

```text
test-infra/prod-sandbox/
  scenarios/h2-jobs-photos.mjs
  job-helpers.mjs
  fixtures/sample-job-photo.jpg   # (+ opcjonalnie #2)
  runner.mjs                      # rejestracja h2-jobs-photos
  README.md                       # docs H2
scripts/test-prod-sandbox-h2.mjs  # thin wrapper --allow-prod
test-infra/test-manifest.json     # suite prod-sandbox-h2 / PROD-SANDBOX-H2
docs/architecture/TEST-HARNESS-01-H2-*.md  # ten zestaw AUDIT (+ later impl reports)
```

**Zakaz edycji:** `src/lib/cloud-sync.ts` · `job-photos.ts` · `App.tsx` CORE · Edge · payroll.

---

## 8. Open questions (nie blokują freeze)

| # | Pytanie | Default DF |
|---|---------|------------|
| Q1 | Seed minimalnych pól joba (adres/status) przez KV vs UI create? | **KV seed** (jak H1) |
| Q2 | Czy F5 hard reload wymagany do PASS? | **NIE** — KV SSOT; F5 opcjonalny soft |
| Q3 | Worker UI vs Admin UI? | **Admin** ścieżka (JobsView) w MVP |
| Q4 | H0.x przed H2? | **NIE** — session cleanup wystarczy |
| Q5 | Allowlist mutate-existing? | **NIE w MVP** — always-create |

---

## 9. Status freeze

**DESIGN FREEZE v1.0 — FROZEN** · Architecture Review: **APPROVE DESIGN** · **BLOCK IMPLEMENT**.

Czekaj na Owner GO: `IMPLEMENT TEST-HARNESS-01 H2`.
