# WGDOM-HARDENING-01D — Runbook (Operator)

> **ID:** WGDOM-HARDENING-01D  
> **Źródło zamrożone:** [`WGDOM-HARDENING-01D-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01D-DESIGN-FREEZE.md) §7  
> **Canonical script:** `scripts/smoke-wgdom-hardening-01d-edge-546.mjs`  
> **Ledger:** [`WGDOM-HARDENING-01D-TREND-LEDGER.md`](./WGDOM-HARDENING-01D-TREND-LEDGER.md)  
> **Mode:** on-demand only · tooling/docs · **zero** runtime / Cloud Sync / retry 546 / Edge chunk

---

## 1. Kiedy uruchamiać

- Po releasie wpływającym na tenders / pipeline / Edge traffic.  
- W Stabilization Window: okresowo wg Ownera.  
- Przed decyzją o eskalacji **M-EDGE-546** / **H-FAT-PIPELINE**.  
- **Nie** w pętli agenta · **nie** cron bez osobnego Owner GO.

---

## 2. Komendy

### 2.1 Self-test progów (D-T4) — bez prod

```bash
node scripts/smoke-wgdom-hardening-01d-edge-546.mjs --self-test
```

### 2.2 Ocena istniejącego JSON (bez live)

```bash
node scripts/smoke-wgdom-hardening-01d-edge-546.mjs --evaluate-json .tmp/hardening-01d-audit-multi-tender-2.65.40.json
```

### 2.3 Live smoke (prod)

```bash
node scripts/smoke-wgdom-hardening-01d-edge-546.mjs
```

**Wymagane env (C3 — brak hardcoded defaults):**

| Variable | Rola |
|----------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | batch-get listy przetargów |
| `VITE_SUPABASE_PROJECT_ID` | URL Edge |
| `WGDOM_ADMIN_PASS` | logowanie admin UI |

Opcjonalnie te same klucze w `.env` via Vite `loadEnv` — **nie commitować** sekretów.

**Output:**

- `.tmp/hardening-01d-smoke-<ISO>.json`  
- `.tmp/hardening-01d-smoke-latest.json`  

**Exit codes:**

| Code | Znaczenie |
|------|-----------|
| `0` | PASS lub WARN |
| `1` | FAIL (progi lub Sync Storm guard) |
| `2` | Brak wymaganych env (C3) |

---

## 3. Po runie (obowiązkowe przy decision-grade)

1. Odczytaj `thresholds.verdict` + `thresholds.triggers` (+ SUMMARY w konsoli).  
2. Zachowaj artifact JSON.  
3. **Dopisz wiersz** do [`WGDOM-HARDENING-01D-TREND-LEDGER.md`](./WGDOM-HARDENING-01D-TREND-LEDGER.md).  
4. Interpretacja:

| Verdict | Działanie |
|---------|-----------|
| **PASS** | Brak działania |
| **WARN** | Odnotuj; rozważ powtórzenie N=2; **nie** włączaj retry 546 |
| **FAIL** | Owner escalate. Jeśli `any522` / `anyThrash` → tor **Sync Storm / incident**. Jeśli tylko 546 / pipeSet → tor **load / MONITOR** (ew. osobny fat-key epic — **nie** fix w 01D) |

---

## 4. Progi (DF §3.2 — skrót)

| Sygnał | WARN | FAIL |
|--------|------|------|
| `546` | ≥1 | ≥3 **lub** rate > 2% |
| `pipeSet` | >18 | >22 |
| `maxPipeSet` | ≥3 | ≥4 |
| `any522` / `anyThrash` | — | true → FAIL |

`pipeSetBaselinePostA = 13` (post-01A AUDIT).

---

## 5. Zakazy Operatora

- ❌ Retry / swallow HTTP 546 w kodzie lub cloud-sync  
- ❌ Edge chunk „na szybko”  
- ❌ Flip `pipelineBootstrapPersistLocal` na prod bez Owner GO  
- ❌ Traktować PASS jako zamknięcie **H-FAT-PIPELINE**  
- ❌ Ciche włączanie D-V3 attribution (`statusByPath` musi pozostać `null`)  
- ❌ Rozwijanie równolegle `.tmp/final-prod-audit-multi.mjs` (legacy evidence-only)

---

## 6. Baseline artifacts (SSOT empiria)

| Label | Path |
|-------|------|
| Pre-A | `.tmp/final-prod-audit-multi-tender-baseline-2.65.39.json` |
| Post-A | `.tmp/hardening-01d-audit-multi-tender-2.65.40.json` |
