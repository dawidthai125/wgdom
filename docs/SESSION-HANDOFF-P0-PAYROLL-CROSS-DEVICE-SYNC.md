# SESSION HANDOFF — P0 Payroll Cross-Device Sync CLOSE

> **Status:** **FULLY CLOSED** · **prod 2.63.85** @ **`88650be`** · fix S2 **`e819124`** · observation **2026-07-11** · **BASELINE LOCKED**  
> **SSOT baseline:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) · [`CURRENT-TASK.md`](../CURRENT-TASK.md)  
> **Incident SSOT:** [`INCIDENTS.md`](INCIDENTS.md) · **Architecture:** [`architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md`](architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md)

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Incydent** | P0 Payroll Cross-Device Sync (2026-07-10) |
| **Status** | **FULLY CLOSED** · **Observation Complete** |
| **Prod version** | **2.63.85** |
| **Prod commit (HEAD)** | **`88650be`** |
| **Fix commit** | **`e819124`** (SYNC-ARCH-01 S2) |
| **Verify deploy** | **PASS** (`curl version.json` → **2.63.85** @ **88650be**) |
| **Regression** | S2 **18/18** · S1 RS-no-payroll **22/22** · Guard **4/4** |
| **Cloud T+24h** | roster **15** · tombstones **6** · duplicates **0** |

---

## 2. Root cause (dla agenta)

**SYNC-ARCH-01 S1-1** (`7ad4e06`, v2.63.28) usunął Payroll z RS Push. **S2 Domain Push** dla mutacji pól `kw-week-employees` nie został ukończony — edycje godzin, stawek, bonusów, potrąceń zapisywały się tylko do `localStorage`.

---

## 3. Fix architektury (S2 — ACTIVE)

| Warstwa | Plik / mechanizm |
|---------|------------------|
| **Domain Push facade** | `src/lib/payroll-domain-sync.ts` — `schedulePayrollDomainPush()` (debounce 1s) |
| **Handler** | `bindPayrollDomainPushHandler` → `persistPayrollRoster` → `pwrPush({ skipPayrollGuard: true })` → `pushWeekEmployeesToCloud` |
| **Wiring** | `src/app/App.tsx` — `commitLivePayrollRosterEdit(next)` na wszystkich live mutacjach `kw-week-employees` |

**Zasady (#CORE-015 / #CORE-016):**

- Każda mutacja **pól** LP → **Domain Push** (nie RS Push).
- RS Push **bez** `kw-week-employees` — by design (S1-1).
- Mutacje **składu** (add/remove) → **PWRB** (`payroll-week-roster-bundle.ts`).
- Zmiany sync → **Regression Contract Tests** obowiązkowe.

SSOT szczegółowy: [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)

---

## 4. Timeline commitów

| Commit | Zakres |
|--------|--------|
| **`e819124`** | fix(payroll): S2 domain push mutacji pól LP |
| **`2525dd6`** | docs(incident): closeout + changelog v2.63.85 |
| **`70122b6`** | docs(incident): observation T+24h FULLY CLOSED |
| **`88650be`** | docs(baseline): post-P0 baseline lock + CORE-015/016 |

---

## 5. Testy (obowiązkowe przy zmianach payroll/sync)

```bash
node scripts/test-sync-arch-01-s2-domain-push-cross-device.mjs   # 18/18
node scripts/test-sync-arch-01-s1-rs-no-payroll.mjs              # 22/22
node scripts/test-payroll-guard-phase.mjs                        # 4/4
npm run build
```

---

## 6. Następny krok

**STABILIZATION WINDOW ACTIVE** — brak nowych bundle bez:

```
AUDIT → PLAN → DESIGN FREEZE → ARCHITECT REVIEW → OWNER GO
```

**Out of scope (osobne slice'y):** S2-3 partial (`doSaveWeek` archive domain push) · S3 `pullPayrollDomainFromCloud` · batch-set 500 (H1) · AC8–AC11 multi-device observation.
