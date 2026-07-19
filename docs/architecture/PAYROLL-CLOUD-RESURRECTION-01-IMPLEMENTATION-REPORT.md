# PAYROLL-CLOUD-RESURRECTION-01 — IMPLEMENTATION REPORT

> **Status:** IMPLEMENTATION COMPLETE (code) · **Owner Verification PENDING** · **No push**  
> **Data:** 2026-07-20  
> **Wersja:** **2.65.35** (changelog lokalny; nie na prod do Owner GO release)

---

## 1. Cel

Uniemożliwić odtworzenie przestarzałych danych z LocalStorage na Cloud KV podczas CloudLoader bootstrap (merge → push), zgodnie z RCA / PLAN / DESIGN FREEZE.

---

## 2. Co zaimplementowano

| Wymaganie | Realizacja |
|-----------|------------|
| Bootstrap nie nadpisuje Cloud gdy LS starszy / zarchiwizowany | `bootstrapPayrollPushAllowed` + `bootstrapMergedShouldPush(..., fence)` |
| Walidacja świeżości przed bootstrap push | `evaluatePayrollResurrectionFence` (fingerprint roster × archive × calendar) |
| Cloud pusty + LS = archived/stale → **NIE** push | fence `preferCloudEmpty` / `blockBootstrapPush` |
| merge nie przywraca historycznych snapshotów „bo bogatsze” | `mergeWeekEmployeesForWeekRange` + `mergeArchive` + `applyPayrollResurrectionFenceToBundle` |

### Pliki

| Plik | Rola |
|------|------|
| `src/lib/payroll-bootstrap-resurrection-fence.ts` | **NEW** — SSOT fence (evaluate / fingerprint / strip / push gate) |
| `src/lib/cloud-sync.ts` | merge + finalize bundle + bootstrap push/persist hooks |
| `src/app/CloudLoader.tsx` | calendar ctx → fence → persist empty + gated push |
| `scripts/test-payroll-cloud-resurrection-01.mjs` | **NEW** — T1–T6 (w tym dual-session) |
| `src/app/changelog-data.ts` / `CHANGELOG.md` | **2.65.35** |

### Poza zakresem (DF D-03)

- Przepisanie cloud-sync / PWRB  
- Wyłączenie Payroll Guard  
- Auto-restore z `kw-*-prev`  
- Zmiana modelu wypłat / biweekly  

---

## 3. Ścieżka runtime (po fix)

```text
CloudLoader bootstrap
  → fetch Cloud (intentional empty OK)
  → evaluatePayrollResurrectionFenceForBundle(local, cloud, calendar)
  → finalizePayrollBundleMerge (+ apply fence strip archive clone)
  → persist LS (force empty weekEmployees gdy fence)
  → bootstrapMergedShouldPush(..., fence)  →  BLOKUJE push stale rich LS
```

---

## 4. Acceptance (PLAN) — status kodu

| ID | Kryterium | Status |
|----|-----------|--------|
| A1 | Stale LS nie reseeds empty Cloud | PASS (T1, T5) |
| A2 | Genuine new hours nadal push | PASS (T2) |
| A3 | merge nie klonuje prev→current archive | PASS (T3–T6) |
| A4 | REGRESSION-03/04 + ROLL-001 | PASS |

---

## 5. Werdykt

```text
IMPLEMENTATION COMPLETE (local working tree)
RELEASE: NOT STARTED (czekaj Owner Verification → commit → push)
NO PUSH w tej sesji
```
