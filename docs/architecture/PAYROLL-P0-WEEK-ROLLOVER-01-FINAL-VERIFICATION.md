# PAYROLL-P0-WEEK-ROLLOVER-01 — FINAL VERIFICATION

> **Data:** 2026-07-19  
> **Tryb:** OWNER VERIFICATION · FINAL VERIFICATION  
> **Zakaz:** nowe funkcje · push (do Owner GO)

---

## Werdykt

```text
FINAL VERIFICATION: PASS
RELEASE READINESS: READY TO COMMIT → GO (push po Owner GO)
```

---

## 1. Build

| Kryterium | Wynik |
|-----------|--------|
| `npm run build` | **PASS** (exit 0) |

---

## 2. Test P0 rollover

| Kryterium | Wynik |
|-----------|--------|
| `npx vite-node scripts/test-payroll-p0-week-rollover-01.mjs` | **20 PASS / 0 FAIL** |

---

## 3–4. Regresje display

| Suite | Wynik |
|-------|--------|
| `test-payroll-display-p0-regression-03.mjs` | **14 PASS / 0 FAIL** |
| `test-payroll-display-p0-regression-04.mjs` | **19 PASS / 0 FAIL** |

---

## 5. Scenariusze ALIGN vs ROLLOVER

### ALIGN

```text
calendar-behind
  + live roster
  + poprzedni tydzień już w archiwum
  → kind = align
  → tylko update etykiet (setWeekFrom/To)
  → roster NIE czyszczony
```

Dowód: T3 (rollover-01) · R1/R2 (reg-03) · R1 (reg-04 `align_defer_rollover` / `bootstrap_align`).

### ROLLOVER

```text
calendar-behind
  + live roster
  + brak archiwum stored week
  → kind = rollover
  → autoArchiveAndAdvance
  → archive → clear roster → advance keys → push
```

Dowód: T1 (rollover-01) · R1b (reg-04 `auto_archive_and_advance` / `real_rollover`).

---

## 6. Scenariusz produkcyjny 13–18 → 20–25

| Krok | Status | Dowód |
|------|--------|--------|
| Stored `2026-07-13`–`2026-07-18` | OK | T1 / T4 |
| Target `2026-07-20`–`2026-07-25` (Nd ≥20:00) | OK | T1 `getPayrollWeekRange` |
| Archive poprzedniego tygodnia | OK | T1 archive has prev · T4 snap |
| Live roster wyczyszczony | OK | T1 / T4 empty |
| KV keys = nowy tydzień | OK | T1 keys advanced · push 4 keys |
| UI labels = nowy tydzień | OK | transition.from/to = current |
| Biweekly: prev week w archiwum, nowy tydzień bez stale hours | OK | T4 |

Uwaga: weryfikacja jednostkowa (symulacja `autoArchiveAndAdvance` + classifier). Brak mutacji prod KV w tym kroku.

---

## 7. App.tsx — tylko integracja PAYROLL-ROLL-001

| Sprawdzenie | Status |
|-------------|--------|
| Logika ALIGN/ROLLOVER w `payroll-cycle.ts` (`classifyPayrollWeekTransition`) | **TAK** |
| `App.tsx` woła classifier + branchuje align vs `autoArchiveAndAdvance` | **TAK** |
| Brak nowej logiki biznesowej w `App.tsx` (poza wiringiem + toast/trace) | **TAK** |
| `cloud-sync.ts` / PWRB / Edge nietknięte | **TAK** |

Fragmenty: `tryPayrollWeekCycle` (align early-return · rollover → istniejące `autoArchiveAndAdvance`) · mount-effect (align-only).

---

## Protected Core

| Obszar | Status |
|--------|--------|
| PWRB | nietknięte |
| `cloud-sync.ts` | brak diff |
| Edge / Supabase | brak diff |

---

## Następny krok

1. Commit bundle PAYROLL-P0-WEEK-ROLLOVER-01 (wykonany w tej sesji Owner Verification).
2. **Czekaj Owner GO** na push `main`.
3. Po push: VERIFY FAST — jedno `curl` `version.json` → oczekiwane **2.65.34**.
