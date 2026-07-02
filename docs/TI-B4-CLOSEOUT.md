# TI-B4 — Smoke Aggregator NG-01–NG-04 · CLOSEOUT

> **Status:** **CLOSED** · **Data closeout:** 2026-07-02  
> **Prod baseline:** **v2.63.27** (commit po release)  
> **STABILIZATION WINDOW:** ACTIVE  
> **Design freeze:** TI-B4 DESIGN FREEZE v1.0  
> **Powiązane:** [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) · [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) · [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md)

---

## 1. Zakres MVP

| Element | Opis | Gate |
|---------|------|------|
| **Thin wrapper** | `scripts/test-tenders-stabilization-smoke.mjs` — spawnSync, fail-fast, 12 child | Obowiązkowy |
| **Manifest SSOT** | `test-infra/test-manifest.json` v1.1.0 — wpis `SMOKE-TENDERS-NG01-04` | Obowiązkowy |
| **Suite** | `smoke-stabilization-ng01-04` | Obowiązkowy |
| **Orchestrator** | `scope:tenders` w `resolveTestsForScope()` | Obowiązkowy |
| **Release Gate B** | `--gate B --scope tenders` | Obowiązkowy |
| **Lifecycle docs** | `TEST-INFRA-LIFECYCLE.md` · `STABILIZATION-WINDOW-PLAN.md` M-02 | Obowiązkowy |

**Poza MVP (nie implementowano):** nowe testy biznesowe · Gate C · CI (TI-B3) · E2E Przetargi · suite `lib-ng02-core` / `lib-ng04-core`.

**Nowe pole KV:** brak · **Zmiana modelu danych:** brak · **Zmiana sync/merge:** brak

---

## 2. Wykonane elementy

### Agregator (Principles #027–#032)

- Zero importów `src/` — wyłącznie `spawnSync('npx', ['vite-node', path])`
- SSOT kolejności 12 child w pliku agregatora (#028)
- Fail-fast · raport PASS/FAIL per child

### 12 child scripts (reuse)

| Epic | Skrypty |
|------|---------|
| NG-01 | `test-tender-trust-layer.mjs` |
| NG-02 | pipeline P0 · bootstrap retry · unified gate · heavy lifecycle |
| NG-03 | command layer · tab SSOT P0 |
| NG-04 | BOQ explorer · benchmark · ATH fidelity · epic close |
| cross | `test-tender-kosztorys-process-health.mjs` |

### Manifest 1.1.0

- `SMOKE-TENDERS-NG01-04` — class smoke · `condition: scope:tenders` · tier B
- Suite `smoke-stabilization-ng01-04`
- Wpis w `gate-b-relevant`

### Komendy

```bash
npm run test:infra -- --suite smoke-stabilization-ng01-04
npm run test:infra -- --gate B --scope tenders
```

### Release

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.27** |
| **Message** | `feat(test-infra): implement TI-B4 smoke aggregator` |
| **Artefakt R-02** | `test-tenders-stabilization-smoke.mjs` |
| **Maintenance** | M-02 CLOSED |

---

## 3. Wpływ na AD-10 (STABILIZATION WINDOW)

| Kryterium | Przed TI-B4 | Po TI-B4 |
|-----------|-------------|----------|
| **Z-01** | PARTIAL | bez zmian |
| **Z-02** | PASS | bez zmian |
| **Z-03** | PASS | bez zmian |
| **Z-04** | FAIL | **PASS** |
| **Z-05** | PARTIAL | bez zmian |
| **Z-06** | PARTIAL | bez zmian |
| **Z-07** | FAIL | bez zmian |
| **Okno stabilizacji** | CONTINUES | CONTINUES |

**Z-04 PASS** = smoke agregat Przetargi wykonany przez orchestrator z wynikiem PASS lokalnie + artefakt w repo.

---

## 4. Backlog post-TI-B4

| ID | Element | Status |
|----|---------|--------|
| **TI-B1** | Ekstrakcja `removeWeekEmployee()` do lib | OPEN |
| **TI-B2** | `HARNESS_SANDBOX_JOB_IDS` przed prod harness | OPEN · P0 gate |
| **TI-B3** | CI GitHub Actions — gate B/C z orchestratora | OPEN |
| **TI-B4** | Smoke agregat NG-01–04 | **CLOSED** |

---

## 5. Werdykt

**TI-B4 CLOSED** — smoke agregat NG-01–NG-04 w TEST-INFRA, Gate B `scope:tenders`, M-02 domknięte.

**Następny krok (opcjonalny):** TI-B3 CI gate — tylko na polecenie.
