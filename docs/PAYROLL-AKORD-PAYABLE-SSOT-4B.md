# PAYROLL AKORD V1 — Payable & Domain SSOT

> **STATUS:** **CLOSED / PRODUCTION VERIFIED** · **AKORD V1 COMPLETE**  
> **Aktualizacja:** 2026-09-14  
> **Tip:** UI **2.66.226** · commit **`892e04c4`** · live: `https://www.wgdom.fun/version.json`  
> **Protected core:** [`AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md`](AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md)  
> **CAS piecework:** [`PAYROLL-PIECEWORK-CLOUD-CAS-4A.md`](PAYROLL-PIECEWORK-CLOUD-CAS-4A.md)  
> **Zakaz:** AKORD **nie** uprawnia do zmiany PWRB / `kw-week-employees` CAS / settlement ACK / ExtraCosts F1 / Manual Adj LWW / early-payout writers.

```text
HISTORY NOTE — Phase 4B first integration used:
  displayNetPay ≈ resolveAkordPayable (Σ remaining) + extras/manual
That formula is SUPERSEDED by commits:
  028c3925 (week advances ≠ remaining)
  892e04c4 (biweekly cash gets pieceworkState)
Do NOT reopen remaining-as-weekly-payout.
```

---

## 1. Models

| Model | Default | Persistence |
|-------|---------|-------------|
| **HOURLY** | yes (`compensationModel` missing/invalid → hourly) | Directory → week employee snapshot |
| **AKORD** | opt-in | Directory `compensationModel: "akord"` |

- One shared Lista Płac (no second payroll module).
- Model is a durable directory property; week snapshot preserves historical model.

---

## 2. HOURLY (unchanged)

Attendance · from/to · hours · rate · prevSaturday · carry · biweekly · settlement · ExtraCosts · Manual Adjustment · early payout · PDF — **existing semantics**. AKORD must not regress hourly.

---

## 3. AKORD attendance (P3)

- Presence only: was / was not (no from–to hours).
- Attendance does **not** generate hours or pay.
- DayData `zaliczka` on AKORD days does not drive AKORD piecework pay (hourly zaliczki path separate).

---

## 4. Durable piecework (P2 + 4A)

| Entity | Role |
|--------|------|
| `PieceworkJob` | Links to existing Job SSOT (`jobId`) |
| `PieceworkAllocation` | Stable id · `directoryId` · `pieceworkJobId` · `agreedAmount` |
| `PieceworkAdvance` | Durable advance ledger · stable id · soft-delete / LWW |

**KV:** `kw-payroll-piecework` (+ `kw-payroll-piecework-meta` revision).  
**Cloud authoritative** · LS = cache.  
**Writes:** `commitPieceworkOp` → `pushPayrollPieceworkToCloudSafe` (dedicated piecework CAS).  
**No** new CAS writer for `kw-week-employees`.

**V1 does not store:** m² · m² rate · auto m²×rate.

**Relations:** one Job → many employees; one employee → many allocations/jobs.

**Hard cap:** `SUM(active advances) ≤ agreedAmount` per allocation (Cloud + local reject).

---

## 5. What Advance is NOT

`PieceworkAdvance` ≠ `DayData.zaliczka` ≠ `payrollManualAdjustment` ≠ `payrollEarlyPayouts`.

AKORD early payout = **HOLD** (no EarlyPayoutPanel for akord).

---

## 6. ★ FINAL PAYOUT SEMANTICS (028c3925 + 892e04c4)

### Two concepts (must stay separate)

| Concept | Function | Enters weekly / Saturday payable? |
|---------|----------|-----------------------------------|
| **AKORD balance / remaining** | `resolveAkordPayable` / `resolveAkordBalance` = Σ(`agreedAmount − active advances`) | **NO** — informational only („Pozostało z akordu”) |
| **AKORD period contribution** | `resolveAkordWeekAdvances(directoryId, state, weekFrom, weekTo)` | **YES** — only advances in that payroll week range |

```text
agreedAmount  ≠  automatic weekly payout
remaining     ≠  Saturday cash
```

### Ordinary (non-biweekly) week

```
displayNetPay / settlement / Saturday (weekly path) =
  SUM(active PieceworkAdvance in [weekFrom, weekTo])
  + approved ExtraCosts
  + Manual Adjustment
  − DayData zaliczki (usually 0 on AKORD)
```

Week membership: `paidAt` date in `[weekFrom, weekTo]` **or** advance `weekFrom`/`weekTo` tags exact match (existing Payroll week definition — no new calendar).

### Biweekly

Existing Payroll cycle: payout Saturday = `biweeklyAnchorDate + N×14`.

On **non-payout** week: row may show accrued current-week advances; **Saturday cash = 0** for biweekly net.

On **payout** week: `calcBiweeklyRowDisplay` injects:

- `akordThisWeek` = advances in current week  
- `akordPrevWeek` = advances in previous week range  

**Exactly once** into `displayNet` / settlement / cash.

### Cash split SSOT (892e04c4)

```text
PayrollView
  → computePayrollCashSplit(..., { pieceworkState })
  → calcBiweeklyRowDisplay(..., { pieceworkState })
  → resolveAkordWeekAdvances
  → biweeklyPayoutNet → totalSaturdayCash
  → PDF cashTotalSaturday
```

**Invariant:** payout-week **row display == Saturday cash contribution** for AKORD (same `displayNet`).  
Forbidden regression: row shows advances but `totalSaturdayCash = 0` because `pieceworkState` was dropped.

---

## 7. Mandatory examples

**A** — anchor `2026-09-19` · W1 advance 500 · W2 payout week no new advance  

| | Display | Saturday cash |
|--|---------|---------------|
| W1 | 500 accrued | **0** |
| W2 | **500** | **500** |

**B** — W1 500 · W2 200 · W2 payout → **700** (not 1200 / 1000 / 1400).

**C** — W1 500 · W2 payout 500 · W3 no advance → W3 **0** (no replay).

**D** — W1 500 · W2 200 payout · W3 100 non-payout → W2 cash **700** · W3 display **100** · W3 cash **0**.

**Remaining example:** agreed 1500 · advances 700 → remaining **800** ≠ Saturday payout (payout uses week advances only, e.g. 700 in scenario B).

**Non-biweekly weekly:** previous advances 500 · current 200 → contribution **200** · remaining **800**.

---

## 8. Settlement / PDF / Archive

| Surface | SSOT |
|---------|------|
| Settlement | `resolveSettlementPayableAmount` → `calcWeekEmployeeForPayroll` / `calcBiweeklyRowDisplay` + piecework |
| Live PDF netPay | same Lista Płac row SSOT |
| PDF Saturday aggregate | `cashTotalSaturday` from cash split |
| Live piecework | `kw-payroll-piecework` durable |
| Sunday archive | freezes week `netPay` / AKORD contribution at save (`freezeAkordArchivePayables`) |
| Historical Archive/PDF | frozen snapshot values — **not** live remaining |

Later live advances **must not** mutate historical `savedWeeks[].employees[].netPay`.

---

## 9. UI (4C)

- Polish labels; sky/info banner (not yellow primary).
- Banner: uzgodniona kwota **nie** jest automatycznie doliczana do wypłaty tygodniowej/sobotniej; do wypłaty wchodzą tylko zaliczki z bieżącego tygodnia (biweekly: + prev week on payout Saturday per §6).
- Job picker: **only** Job `status === "in_progress"` („w trakcie”). Empty: „Brak robót w trakcie.”

---

## 10. Closed workstreams

| Phase | Scope | Commit (tip of phase) | Tests (evidence) | Prod |
|-------|-------|----------------------|------------------|------|
| **P1** | `compensationModel` hourly\|akord | `192b2a93` | `test-payroll-compensation-model-p1.mjs` **37 PASS** | YES (chain on main) |
| **P2** | Durable piecework domain | `0c878fce` | `test-payroll-piecework-p2.mjs` **67 PASS** | YES |
| **P3** | AKORD attendance | `a9fd187e` | `test-payroll-akord-attendance-p3.mjs` **46 PASS** | YES |
| **4A** | Piecework Cloud CAS + hard cap | `0e3fa0cb` | `test-payroll-piecework-cas-p4a.mjs` **37 PASS** | YES |
| **4B** | First payable wire (later corrected) | `0aa49a99` | `test-payroll-akord-payable-p4b.mjs` (suite retained; semantics updated) **35 PASS** | YES |
| **4C** | UI · archive freeze · PDF | `872502c1` | `test-payroll-akord-ui-archive-pdf-p4c.mjs` | YES |
| **4C.1** | Historical Archive/PDF freeze consistency | `5fe46912` | same 4C suite **84 PASS** (incl. 4C.1) | YES |
| **RCA/FIX weekly** | remaining ≠ weekly payable | `028c3925` | week-advance **39 PASS** + 4B/4C updated | YES |
| **RCA/FIX cash** | biweekly cash + pieceworkState | `892e04c4` | biweekly-cash **27 PASS** | YES · tip **2.66.226** |

Acceptance gate: **PAYROLL_AKORD_PAYOUT_FIX_ACCEPTED** (local) · tip on `origin/main` **`892e04c4`**.

Carry regression: `smoke-test-payroll-carry-forward-20.1b.mjs` **PASS**. Build **PASS** at closeout.

---

## 11. Agent rules

- **SEARCH BEFORE CREATE** — do not invent second payable SSOT.
- Do not reinject `resolveAkordPayable` (remaining) into `applyAkordPayableToCalc` / biweekly / cash.
- Do not drop `pieceworkState` from `computePayrollCashSplit`.
- New AKORD behavior → AUDIT → Owner GO → tests including cash split path.
