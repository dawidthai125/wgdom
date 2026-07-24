# WGDOM-HARDENING-01B0 — Runbook (Operator)

> **ID:** WGDOM-HARDENING-01B0  
> **Źródło zamrożone:** [`WGDOM-HARDENING-01B0-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01B0-DESIGN-FREEZE.md) §7  
> **Canonical script:** `scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs`  
> **Ledger:** [`WGDOM-HARDENING-01B0-TREND-LEDGER.md`](./WGDOM-HARDENING-01B0-TREND-LEDGER.md)  
> **Mode:** on-demand only · tooling/docs · **zero** runtime / breaker semantics / limits / B1  
> **Nie mylić z:** [`WGDOM-HARDENING-01D-RUNBOOK.md`](./WGDOM-HARDENING-01D-RUNBOOK.md) (Edge 546)

---

## 1. Kiedy uruchamiać

- Po releasie wpływającym na heavy / tenders / gateFingerprint.  
- W Stabilization Window: okresowo wg Ownera.  
- **Przed** decyzją o eskalacji **B1** (H3-A/B) — ten smoke **nie** startuje B1.  
- **Nie** w pętli agenta · **nie** cron bez osobnego Owner GO.

---

## 2. Komendy

### 2.1 Self-test progów (B0-T4) — bez prod

```bash
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --self-test
```

### 2.2 Ocena istniejącego JSON (bez live)

```bash
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --evaluate-json .tmp/hardening-01b0-smoke-latest.json
```

### 2.3 Full contract + Sync Storm (M1–M5)

```bash
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
# równoważnie:
npx vite-node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs
```

Plain `node` auto-reexec przez `vite-node` (import SSOT FP / test getters — C2/C3).

Opcjonalnie bez Sync Storm (Operator musi wtedy odpalić suite osobno dla B0-T2):

```bash
npx vite-node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --skip-sync-storm
node scripts/test-tenders-sync-storm-p0.mjs
# (Sync Storm: npx vite-node scripts/test-tenders-sync-storm-p0.mjs)
```

### 2.4 Opcjonalny `--live` (C8 — env fail-fast)

```bash
node scripts/smoke-wgdom-hardening-01b0-fp-churn.mjs --live
```

**Wymagane env (brak hardcoded secrets):**

| Variable | Rola |
|----------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | obecność sprawdzana (fail-fast) |
| `VITE_SUPABASE_PROJECT_ID` | obecność sprawdzana (fail-fast) |

Brak → **exit 2**. DoD 01B0 **nie** wymaga Playwright live.

**Output:**

- `.tmp/hardening-01b0-smoke-<ISO>.json`  
- `.tmp/hardening-01b0-smoke-latest.json`  

**Exit codes:**

| Code | Znaczenie |
|------|-----------|
| `0` | PASS lub WARN |
| `1` | FAIL |
| `2` | Brak wymaganych env (`--live`, C8) |

---

## 3. Po runie (obowiązkowe przy decision-grade)

1. Odczytaj `thresholds.verdict` + `thresholds.triggers` (+ SUMMARY).  
2. Zachowaj artifact JSON.  
3. **Dopisz wiersz** do [`WGDOM-HARDENING-01B0-TREND-LEDGER.md`](./WGDOM-HARDENING-01B0-TREND-LEDGER.md).  
4. Interpretacja:

| Verdict | Działanie |
|---------|-----------|
| **PASS** | Brak działania · **nie** oznacza H-FP-CHURN FIXED |
| **WARN** | Odnotuj (np. M1=3..4 lub M3≥1 z growth) · **nie** startuj B1 · **nie** podnoś limitu |
| **FAIL** | Owner escalate. Jeśli `M5_anyThrash` / Sync Storm → tor **Sync Storm / incident**. Jeśli `M2>2` → regresja limitu P0. Jeśli `M3` anomalia bez growth → Owner. **Nie** zmieniaj limitu / deps / `builtAt` w 01B0 |

---

## 4. Progi (DF §4 — skrót)

| Sygnał | WARN | FAIL |
|--------|------|------|
| M5a `anyThrash` | — | true |
| M5b Sync Storm T3/T8 | — | suite FAIL |
| M1 unique FP / item | 3–4 | ≥5 |
| M2 max attempts | — | >2 |
| M3 trips | ≥1 (z growth) | ≥3 **lub** (≥1 **and** M4=0) |
| M4 | informacyjny | użyty w regule M3 |

`includeM6=false` — brak duration w DoD.

---

## 5. Zakazy Operatora

- ❌ B1 / global cap / cooldown  
- ❌ Zmiana `HEAVY_MAX_RUNS_PER_KEY` / `HEAVY_E_RUN_DEP_KEYS` / `builtAt`  
- ❌ Traktować PASS jako **H-FP-CHURN FIXED**  
- ❌ Mieszać z 01D 546 / Autonomous FP / Edge chunk  
- ❌ Ciche `includeM6=true`  
- ❌ Druga Map attempts / skopiowany algorytm FP  

---

## 6. Related

| | |
|--|--|
| DF | [`WGDOM-HARDENING-01B0-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01B0-DESIGN-FREEZE.md) |
| ARCH | [`WGDOM-HARDENING-01B0-ARCHITECTURE-REVIEW.md`](./WGDOM-HARDENING-01B0-ARCHITECTURE-REVIEW.md) |
| Risk | `docs/AI/07_KNOWN_RISKS.md` → **H-FP-CHURN** = MONITOR/MITIGATED |
