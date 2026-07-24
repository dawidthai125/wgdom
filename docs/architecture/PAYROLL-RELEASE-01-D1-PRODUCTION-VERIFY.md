# PAYROLL-RELEASE-01 — D1 PUSH & PRODUCTION VERIFY

> **ID:** PAYROLL-RELEASE-01  
> **STATUS:** **CLOSED** · RELEASE COMPLETE · PRODUCTION VERIFIED (D1)  
> **Data:** 2026-07-24  
> **Commit:** **`ace2855`**  
> **UI:** **2.65.41**  
> **EPIC:** Hours-wipe protection · **CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **Zakaz (historyczny etap):** D2–D5 nie wdrażane w tym release  

```text
PUSH ace2855 → main
version.json: 2.65.41 / ace2855
PROD smoke: __WG_PAYROLL_WRITE_PATH__ PASS
CI Gate B: FAIL (pre-existing · nie D1)
```

---

## 1. Push

| | |
|--|--|
| Command | `git push origin HEAD` |
| Range | `fcf66b0..ace2855` |
| Result | **SUCCESS** |

---

## 2. CI

| Workflow | Run | Wynik | Uwaga |
|----------|-----|-------|-------|
| TEST-INFRA Gates (TI-B3) | [30108026725](https://github.com/dawidthai125/wgdom/actions/runs/30108026725) | **FAIL** | Gate B |
| Gate B tenders | — | FAIL `LIB-TENDER-COPY-TEUX7D` | **pre-existing** (też na `fcf66b0`) |
| Gate B payroll | — | FAIL `LIB-PAYROLL-GUARD-FAIL-LOUD` / `guard message` | **pre-existing** (też na `fcf66b0`); lokalnie **4 PASS** |
| Manifest validate | — | **PASS** | |
| Gate C | — | skipped | po Gate B fail |

**Werdykt CI vs D1:** failure **nie jest regresją D1** (identyczne failing suites na tipie docs 01B0). Local D1 smoke + guard-fail-loud PASS.

---

## 3. Deploy

| | |
|--|--|
| GitHub Deployment | Production ref **`ace2855`** @ 2026-07-24T16:09:08Z |
| Vercel | Git Integration (push main) |

---

## 4. Production Verify

### version.json

```json
{
  "version": "2.65.41",
  "commit": "ace2855",
  "timestamp": "2026-07-24T16:09:00.173Z"
}
```

`https://www.wgdom.fun` · `https://www.wgdom.online` — **PASS**

### Bundle

Live `app-core-*.js` zawiera markery D1 (`payroll.write_path` / `__WG_PAYROLL_WRITE_PATH__`).

### Playwright prod smoke (read-only)

Script: `.tmp/payroll-release-01-d1-prod-smoke.mjs` → **PROD_SMOKE_PASS**

| Check | Wynik |
|-------|--------|
| `__WG_PAYROLL_WRITE_PATH__` present | **PASS** |
| `.dump` / `.enable` / `.disable` | **PASS** |
| kill-switch disable → `localStorage=0` | **PASS** |
| enable clears kill-switch | **PASS** |
| console opt-in default OFF (`wg-payroll-trace` unset) | **PASS** |
| zero `[payroll-write-path]` console hits without opt-in | **PASS** |
| **No payroll hours mutation** in smoke | **PASS** |

`dump()` na świeżej sesji: `eventCountBefore: 0` (oczekiwane — brak mutacji LP w smoke). Po realnej edycji LP Owner może zobaczyć eventy `payroll.write_path`.

### Behavior

D1 pasywne — brak zmiany Domain Push / guard / SSOT; brak wdrożenia D2–D5.

---

## 5. Final Version

| Pole | Wartość |
|------|---------|
| UI | **2.65.41** |
| Feature commit | **`ace2855`** |
| Status | **PRODUCTION VERIFIED · D1 ONLY** |

---

## 6. Owner Readiness

```text
OWNER READINESS: D1 RELEASED & VERIFIED · EPIC CLOSED

Historical next (DONE):
  A) IMPLEMENT D2+D3 — DONE @ 2.65.42 / f3b8c03
  B) D4+D5 — DONE @ 2.65.43 / ea1b0a6

EPIC CLOSE: PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md
Out of epic: Gate B CI → osobny EPIC
```

---

## Raport końcowy

1. **Push** — PASS (`ace2855`)  
2. **CI** — Gate B FAIL (pre-existing; not D1 blocker for PV)  
3. **Deploy** — PASS · version.json **2.65.41**  
4. **Production Verify** — globals + kill-switch + console opt-in PASS  
5. **Final Version** — **2.65.41 / ace2855**  
6. **Owner Readiness** — D1 CLOSED for release  
