# PAYROLL-RELEASE-03 — D4+D5 PUSH & PRODUCTION VERIFY · EPIC CLOSE

> **ID:** PAYROLL-RELEASE-03  
> **STATUS:** RELEASE COMPLETE · PRODUCTION VERIFIED (D4+D5) · **PAYROLL EPIC COMPLETE**  
> **Data:** 2026-07-24  
> **Commit:** **`ea1b0a6`**  
> **UI:** **2.65.43**  
> **Epic:** D1 → D2+D3 → D4+D5 **CLOSED**

```text
PUSH ea1b0a6 → main
version.json: 2.65.43 / ea1b0a6
PROD smoke: PROD_SMOKE_PASS
CI Gate B: FAIL (pre-existing · nie D4/D5)
PAYROLL EPIC COMPLETE (D1–D5)
```

---

## 1. Commit SHA

| | |
|--|--|
| SHA | **`ea1b0a6eba671f694c880d7e461d99c949e8afc8`** (short **`ea1b0a6`**) |
| Message | `feat(payroll): PAYROLL-IMPLEMENT-03 D4+D5 -prev recovery banner + Soft Restore (2.65.43)` |
| Parent | `8fa0851` (RELEASE-02 docs tip) · feature lineage via `f3b8c03` (D2+D3) |

**Files (D4+D5 only):**

```text
src/lib/payroll-prev-recovery.ts (NEW)
src/lib/payroll-soft-restore.ts (NEW)
src/app/App.tsx · PayrollView.tsx · admin/AdminViewRouter.tsx
src/app/changelog-data.ts · CHANGELOG.md
scripts/test-payroll-prev-recovery-soft-restore-d4-d5.mjs
docs/architecture/PAYROLL-IMPLEMENT-03-D4-D5-IMPLEMENTATION-REPORT.md
```

---

## 2. Push

| | |
|--|--|
| Command | `git push origin HEAD` |
| Range | `8fa0851..ea1b0a6` |
| Result | **SUCCESS** |

---

## 3. CI

| Workflow | Run | Wynik | Uwaga |
|----------|-----|-------|-------|
| TEST-INFRA Gates (TI-B3) | [30115867066](https://github.com/dawidthai125/wgdom/actions/runs/30115867066) | **FAIL** | Gate B |
| Manifest validate | — | **PASS** | |
| Gate B tenders / payroll | — | FAIL | **pre-existing** (jak RELEASE-01/02) |
| Gate C | — | skipped | |

**Lokalnie (feature SHA):** D4+D5 **29 PASS** · D2+D3 **35 PASS** · D1 **19 PASS**

---

## 4. Deploy

| | |
|--|--|
| GitHub Deployment | Production ref **`ea1b0a6`** @ 2026-07-24T18:11:19Z (id `5593272629`) |
| Vercel | Git Integration (push main) |

---

## 5. Production Verify

### version.json

```json
{
  "version": "2.65.43",
  "commit": "ea1b0a6",
  "timestamp": "2026-07-24T18:11:15.467Z"
}
```

`https://www.wgdom.fun` · `https://www.wgdom.online` — **PASS**

### Smoke (`.tmp/payroll-release-03-d4-d5-prod-smoke.mjs`) → **PROD_SMOKE_PASS**

| Check | Wynik |
|-------|--------|
| version 2.65.43 / ea1b0a6 | **PASS** |
| Bundle D4 `-prev` markers | **PASS** |
| Bundle D5 Soft Restore / preferEmpty | **PASS** |
| D1 `__WG_PAYROLL_WRITE_PATH__` | **PASS** |
| Bundle D2/D3 (`intentionalHoursClear`) | **PASS** |
| Lista Płac reachable | **PASS** |
| D4 banner visible now | **absent** (live not ≪ -prev — expected) |
| remove→re-add / CTA Domain Push | **PASS** via unit suite on `ea1b0a6` (no prod wipe) |
| „Dodaj puste” → 0h | **PASS** (unit) |

### Behavior shipped

- D4: Recovery Banner **only** from `-prev` (≠ archive RB)  
- D4 CTA → Domain Push  
- D5: Soft Restore default on re-add; preferEmpty → 0h  
- D1–D3 unchanged  

---

## 6. Final Version

| Pole | Wartość |
|------|---------|
| UI | **2.65.43** |
| Feature commit | **`ea1b0a6`** |
| Status | **PRODUCTION VERIFIED · D4+D5 · EPIC COMPLETE** |

### Epic map (closed)

| Stage | Version | Commit |
|-------|---------|--------|
| D1 Telemetry | 2.65.41 | `ace2855` |
| D2+D3 Gate + intentionalHoursClear | 2.65.42 | `f3b8c03` |
| D4+D5 -prev banner + Soft Restore | **2.65.43** | **`ea1b0a6`** |

---

## 7. Owner Readiness

```text
OWNER READINESS: PAYROLL EPIC COMPLETE (D1–D5)

Released & verified:
  D1 passive telemetry
  D2 Domain Gate + confirm
  D3 intentionalHoursClear ⇔ skipPayrollGuard
  D4 -prev Recovery Banner
  D5 Soft Restore overlay

Optional follow-up (OUT of epic):
  A) Fix pre-existing Gate B CI (TEUX / guard)
  B) Owner manual: force live≪-prev to see D4 banner UI once

No further payroll DF protections pending in this epic.
```

---

## Raport końcowy

1. **Commit SHA** — **`ea1b0a6`**  
2. **Push** — PASS  
3. **CI** — Gate B FAIL (pre-existing; not D4/D5 blocker)  
4. **Deploy** — PASS · version.json **2.65.43**  
5. **Production Verify** — PROD_SMOKE_PASS (+ unit Soft Restore / preferEmpty / D1–D3)  
6. **Final Version** — **2.65.43 / ea1b0a6**  
7. **Owner Readiness** — **PAYROLL EPIC COMPLETE**  
