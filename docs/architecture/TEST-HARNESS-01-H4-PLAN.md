# TEST-HARNESS-01 H4 — PLAN

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Status:** PLAN COMPLETE · **NIE implementować** · **NIE DESIGN FREEZE** bez Owner GO  
> **Data:** 2026-07-20  
> **Owner GO PLAN:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H4-AUDIT.md`](TEST-HARNESS-01-H4-AUDIT.md) · [`TEST-HARNESS-01-H4-RCA.md`](TEST-HARNESS-01-H4-RCA.md)  
> **Parent:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H4 Cloud AC  
> **Baseline prod:** UI **2.65.35** · app **`fce7b78`** · **GREEN**  
> **IMPLEMENT:** **BLOCKED**

---

## 0. Decyzje wejściowe (zamknięte w RCA)

| Decyzja | Wartość |
|---------|---------|
| Primary write-surface | **Wariant A** — Nested `psb-*` via Edge `kv-client` |
| Telemetry `__wgdomSyncMetrics` | **Reporting only** · `batchSetRetries=0 ≠ FAIL` |
| Nowy KV | **NIE** (D4) |
| Dual-writer / N2 | **ZAKAZ** |
| D5 ZERO Core | **BEZ ZMIAN** Protected Core |
| Preferowany klucz domenowy | **`kw-tenders-pipeline`** (+ `kw-tenders-deleted-ids` przy cleanup) |
| Alternatywa (tylko jeśli DF uzna blokadę H1 path) | `kw-jobs` (+ `kw-jobs-deleted-ids`) — bez photos |
| Payroll / Fence | **FORBIDDEN write** · zero interakcji z resurrection fence |

---

## 1. Cel PLANU

Zdefiniować (po późniejszym Owner GO IMPLEMENT) scenariusz **`h4-cloud`**:

```text
preflight
  → batch-get (ALLOWED domain key)
  → nested insert psb-cloud-* (mutate-guard)
  → batch-set (ok:true; non-psb-* preserved)
  → batch-get parity
  → soft metrics snapshot (optional WARNING)
  → cleanup (PSB-001)
```

**Poza zakresem tego etapu:** kod, DESIGN FREEZE, ARCH REVIEW, commit, push, bump wersji UI, zmiany Production.

---

## 2. Zakres implementacji H4

### 2.1 IN

| Element | Opis |
|---------|------|
| Scenariusz `h4-cloud` | Izolowany round-trip Edge KV (get → nested set → get → cleanup) |
| Reuse H0 | markers · allowlist · mutate-guard · cleanup · report · `--allow-prod` · dry-run |
| Reuse `kv-client.mjs` | **Jedyny** klient Edge — bez drugiego wrappera / bez retry loop |
| Reuse wzorców H1 | Nested merge-append · anti-wipe świadomość · deleted-ids przy cleanup · settle jeśli Playwright użyty |
| Soft metrics | Opcjonalny snapshot do `report.json` (WARNING jeśli brak / retries=0) |
| Manifest | Suite `prod-sandbox-h4` · `PROD-SANDBOX-H4` · **manual / Owner** · **nie** gate B/C |
| Thin npm wrapper | Jak H1–H3 (`scripts/test-prod-sandbox-h4.mjs`) |
| README PSB | Sekcja H4 CLI + FORBIDDEN keys |

### 2.2 OUT

| Temat | Powód |
|-------|--------|
| `cloud-sync.ts` / Edge / merge / Theme / App.tsx | **D5 ZERO Core** |
| `payroll-bootstrap-resurrection-fence.ts` / PWRB / Domain Push | Fence + Payroll protected |
| Nowy klucz KV diagnostyczny | D4 |
| Celowy dual-writer / deadlock storm | N2 OUT · RCA |
| H3-B/C · H5 · H0.x Persist Ledger | Osobne GO |
| Pełny UI Przetargi/Roboty (PDF, photos) | H4 = Cloud-only; nie duplikować H1/H2 domeny |
| FAIL na `batchSetRetries=0` | Owner / RCA |
| Duplikacja logiki retry N1 w harness | #PSB-008/009 · SSOT w Core (read-only, nie fork) |
| CI auto-run prod-sandbox | Parent: manual |

---

## 3. Komponenty i pliki (propozycja zmian)

| Plik | Zmiana |
|------|--------|
| `test-infra/prod-sandbox/scenarios/h4-cloud.mjs` | **NOWY** — orchestracja H4 |
| `test-infra/prod-sandbox/runner.mjs` | Rejestracja `h4-cloud` / alias `h4` · help text |
| `test-infra/prod-sandbox/README.md` | Dokumentacja H4 |
| `scripts/test-prod-sandbox-h4.mjs` | **NOWY** thin wrapper |
| `test-infra/test-manifest.json` | Suite + `PROD-SANDBOX-H4` |
| `package.json` | Tylko jeśli potrzeba aliasu npm (opcjonalnie; prefer reuse `test:prod-sandbox -- --scenario h4-cloud`) |
| Opcjonalnie: `cloud-helpers.mjs` (cienki) | **Tylko jeśli** DF uzna, że H1 `tender-helpers` są zbyt domenowe — **reuse first**: prefer wywołania istniejących helperów H1 do seed/cleanup minimalnego markera, bez kopiowania merge |

**Zakaz edycji:** `src/lib/cloud-sync.ts`, `cloud-batch-set-retry.ts`, Edge `index.tsx`, `payroll-*`, `App.tsx` (Core), Theme.

**Bez duplikatu:** nie tworzyć drugiego `batchGet`/`batchSet`; nie kopiować `isTransientBatchSetError` do nowej pętli retry.

---

## 4. Kolejność prac (po Owner GO IMPLEMENT — nie teraz)

```text
H4.0  Wiring
      · runner: h4-cloud w IMPLEMENTED
      · --allow-prod / --dry-run parity z H1
      · manifest PROD-SANDBOX-H4 (manual)

H4.1  Protection gate
      · FORBIDDEN keys deny przed każdym batch-set
      · mutate-guard + session-created psb-*
      · dry-run: zero batch-set

H4.2  Nested write path (Variant A)
      · batch-get kw-tenders-pipeline
      · insert minimal psb-cloud-* (lub równoważny marker)
      · batch-set z preservacją non-psb-*
      · batch-get parity · assert ok:true

H4.3  Cleanup PSB-001
      · remove nested entity + tenders-deleted-ids (wzorzec H1)
      · finally zawsze · exit 4 przy leftovers

H4.4  Soft metrics appendix
      · opcjonalny odczyt metrics do report
      · WARNING only · nigdy FAIL na retries=0

H4.5  Closeout tooling
      · README · report fields · Owner Verification checklist
```

**Jeden bundle = tylko H4** (#PSB-010 / #CORE-013). Nie łączyć z H5 / H3-B / Core.

---

## 5. Integracja z H1 / H2

| Punkt | H1 | H2 | H4 (PLAN) |
|-------|----|----|-----------|
| `kv-client` | ✅ | ✅ | **Reuse** |
| `psb-*` + mutate-guard | ✅ | ✅ | **Reuse** |
| PSB-001 cleanup | ✅ | ✅ | **Reuse** |
| Nested merge-append | `kw-tenders-pipeline` | `kw-jobs` | **Prefer H1 klucz** |
| Deleted-ids | `kw-tenders-deleted-ids` | `kw-jobs-deleted-ids` | **Jak H1** |
| Anti-wipe / settle | Playwright login | Playwright login | **Opcjonalnie** — H4 może być **KV-only** (bez UI) jeśli DF zamrozi; jeśli concurrent browser sync na tym samym koncie jest ryzykiem, reuse settle H1 |
| UI domain steps | PDF / classification | Photos upload/delete | **OUT** — nie powielać |
| Report JSON | D11 | D11 | **Reuse** + pole metrics soft |

**Zasada integracji:** H4 = **cienki Cloud slice** wzorca H1, nie fork H1 scenariusza i nie drugi H2.

---

## 6. Mechanizmy ochrony

### 6.1 FORBIDDEN keys (write) — hard deny

Przed każdym `batch-set` H4 odmawia (fail-loud `PSB_*`) gdy klucz ∈:

- Payroll: `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`, `kw-week-employees-deleted-ids`, `kw-employee-leaves`, `kw-employee-leaves-deleted-ids`
- Auth/ACL: `kw-admin-hash`, `kw-admin-passwords`, `kw-admin-users-config`, `kw-app-settings`
- Billing: `kw-recoverable-charges` (+ deleted-ids)
- Or: payload = full replace bez zachowania non-`psb-*`

### 6.2 Payroll Resurrection Fence

| Reguła | |
|--------|--|
| Zero write na kluczach payroll | |
| Zero importu / wywołań fence | |
| Zero seed tygodnia / roster | |
| H3-A pozostaje jedynym PSB payroll path (RO) | |

### 6.3 Pozostałe

| Mechanizm | Zastosowanie H4 |
|-----------|-----------------|
| `--allow-prod` | Wymagane dla write na prod URL |
| Dry-run | Side-effect free · plan only |
| Mutate-guard | Tylko allowlist / session `psb-*` |
| No dual-writer | Brak 2-tab deadlock induction |
| D5 | Brak PR do Core w bundle H4 |

---

## 7. Strategia testów i kryteria PASS / FAIL / WARNING

### 7.1 Uruchomienie (docelowe)

```text
npm run test:prod-sandbox -- --scenario h4-cloud --dry-run
npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
npm run test:infra -- --suite prod-sandbox-h4   # manual condition
```

### 7.2 Kryteria

| Wynik | Warunek |
|-------|---------|
| **PASS (0)** | Preflight OK · nested set `ok:true` · parity `psb-*` widoczny po get · cleanup 0 leftovers · non-`psb-*` count nie spadł (preservacja) · report zapisany |
| **WARNING** | Metrics niedostępne **lub** `batchSetRetries=0` / brak naturalnego retry — **nie** zmienia exit na FAIL |
| **FAIL precondition (2)** | Brak allow-prod · FORBIDDEN key attempt · `PSB_MUTATE_DENIED` · scenariusz źle skonfigurowany |
| **FAIL scenario (3)** | `batch-set` 5xx / `ok:false` · parity fail · utrata non-sandbox entity wykryta w asercji preservacji |
| **FAIL cleanup (4)** | PSB-001 leftovers po `finally` |

### 7.3 Co **nie** jest kryterium PASS

- Non-zero `batchSetRetries`
- Przejście pełnego UI Przetargi/Roboty
- Re-test DEADLOCK-N1
- Zmiana `version.json` / UI changelog

---

## 8. Ryzyka i mitygacje

| Ryzyko | P | Mitygacja PLAN |
|--------|---|----------------|
| Wipe non-`psb-*` przy złym merge | P0 | Read→filter→write · asercja preservacji · reuse H1 helpers |
| Orphan `psb-*` po crash | P0 | CleanupTracker w `finally` · deleted-ids |
| Browser sync resurrect (jeśli sesja UI równoległa) | P1 | Prefer KV-only **lub** settle/anti-wipe jak H1 (DF wybierze) |
| Agent dopisze retry do Core / kv-client | P0 | D5 + #PSB-008 w DF · review checklist |
| Flaky metrics | P2 | Soft WARNING only |
| Dotknięcie payroll keys | P0 | FORBIDDEN gate przed set |
| Zakres creep (H5/photos/PDF) | P1 | OUT list · jeden bundle H4 |

---

## 9. Kryteria zakończenia implementacji (Definition of Done)

H4 IMPLEMENT uznaje się za **COMPLETE** (przed Owner Verification) gdy:

1. `h4-cloud` zarejestrowany · dry-run exit 0 · allow-prod round-trip PASS na prod.
2. Report w `.tmp/prod-sandbox-out/**` zawiera steps, mutatedIds, cleanup, soft metrics.
3. Zero diff w Protected Core / Payroll / Theme / Edge.
4. Manifest `PROD-SANDBOX-H4` · README zaktualizowane.
5. FORBIDDEN gate udokumentowany i wykonywany.
6. Cleanup PSB-001 PASS także na ścieżce FAIL mid-run (weryfikowalne / zaprojektowane w DF).
7. Brak nowego KV · brak dual-writer · `batchSetRetries=0` nie FAIL.
8. Owner Verification checklist przygotowany (bez commit/push do czasu osobnego GO).

**Release tooling:** jak H0–H3 — UI version **bez bumpu** (tooling-only), o ile Owner nie zdecyduje inaczej.

---

## 10. Open questions dla DESIGN FREEZE (nie blokują PLAN)

| # | Pytanie | Domyślna rekomendacja PLAN |
|---|---------|----------------------------|
| Q1 | H4 = **KV-only** czy wymaga Playwright settle? | **KV-only** domyślnie; settle tylko jeśli Owner obserwuje resurrect |
| Q2 | Soft metrics: Playwright `__wgdomSyncMetrics` vs pominięcie gdy brak page? | **Pomiń / WARNING** — nie wymagaj loginu do PASS |
| Q3 | Minimalny kształt encji `psb-cloud-*` w pipeline | Marker id+title only — DF zamrozi pola |

---

## 11. Wejście do DESIGN FREEZE (stop gate)

| | |
|--|--|
| **Status PLAN** | **COMPLETE · READY FOR DESIGN FREEZE** |
| **Następny etap** | DESIGN FREEZE — tylko po Owner GO |
| **IMPLEMENT** | **BLOCKED** |

```text
PLAN COMPLETE → czekaj OWNER GO
  „GO DESIGN FREEZE TEST-HARNESS-01 H4”
Bez GO: zero DF / ARCH REVIEW / kodu / commit / push / bump wersji.
```

**SSOT łańcuch:** AUDIT → RCA → **ten PLAN** → (DF) → (ARCH REVIEW) → (IMPLEMENT GO).
