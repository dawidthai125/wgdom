# PAYROLL-ANTI-LEAK-FIX-01 — Release Verification Report

> **Program:** PAYROLL-ANTI-LEAK-FIX-01 · **PAYROLL-ANTI-LEAK-PRODUCTION-SMOKE-01**  
> **Design Freeze:** [`docs/architecture/PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md`](../architecture/PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md)  
> **Release:** UI **2.65.14** · commit **`26f3eb5`** · 2026-07-13  
> **Baseline:** **2.65.13** @ `309609e` (JOBS-SYNC-FIX-01 CLOSED) · payroll roster loss P0 → **CLOSED**

| Pole | Wartość |
|------|---------|
| **STATUS** | **CLOSED** |
| **PRODUCTION VERIFIED** | **TAK** — `version.json` **2.65.14** @ **`26f3eb5`** |
| **Prod smoke** | **PASS** — **12/12** (readonly KV + UI focus/refresh/second context) |

**Powiązane:** PAYROLL-WEEK-DATA-LOSS-01 (audit) · PAYROLL-ROSTER-ROOT-CAUSE-01 (RCA) · JOBS-SYNC-FIX-01 (MF-2 nie zastępuje fixa focus pull)

---

## 1. Root Cause (potwierdzony)

Łańcuch z `PAYROLL-ROSTER-ROOT-CAUSE-01` (prod readonly KV + runtime trace):

```text
Cloud KV (14) ✓
  ↓ batch-get
mergeAllDataKeys → 14 ✓
  ↓
finalizePayrollBundleMerge → 14 ✓
  ↓
applyRuntimePayrollAntiLeak → 0 ✗  ← PIERWSZY PUNKT UTRATY
  ↓
reconcileAdminBundleWithFreshLocal (fresh React []) → 0
  ↓
applyAdminDataBundle → setWeekEmployees([]) → UI 0
```

| ID | Przyczyna | Skutek |
|----|-----------|--------|
| **RC-AL-1** | `applyRuntimePayrollAntiLeak` — predykat zbyt szeroki | Pusty lokalny snapshot + bogate archiwum + merged z chmury → **kasowanie poprawnego rosteru** |
| **RC-AL-2** | Brak rozróżnienia same-week Cloud SSOT vs cross-week leak | Focus pull / visibility po wpisie godzin → **0 osób** mimo Cloud 14 |
| **RC-AL-3** | `applyAdminDataBundle` / `setWeekEmployees` | Tylko **executor** — materializują błąd z anti-leak |

**Nie było root cause:** `mergeAllDataKeys`, `finalizePayrollBundleMerge`, `reconcileAdminBundleWithFreshLocal` (logika week-scope), Edge, KV zapis, Jobs/Directory/Tender/WM.

**Warunek strzału (przed fixem):**

```text
payrollSource.length === 0
AND archive richness ≥ 8
AND merged roster > 0
→ merged[kw-week-employees] = []
```

(bez sprawdzenia `cloudWeekKey === targetWeekKey` ani intent cross-week)

---

## 2. Design Freeze

**SSOT:** [`PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md`](../architecture/PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md) — **OWNER REVIEW** → **APPROVED (Wariant B)** → **IMPLEMENTED** → **CLOSED**

| Faza | Status |
|------|--------|
| PAYROLL-WEEK-DATA-LOSS-01 | **COMPLETE** |
| PAYROLL-ROSTER-ROOT-CAUSE-01 | **CONFIRMED** |
| Design freeze | **CLOSED** |
| Owner GO implementacji | **GO** |
| PAYROLL-ANTI-LEAK-FIX-01 | **CLOSED** |

---

## 3. Wariant B — Bezpieczny (zaimplementowany)

Anti-leak strzela **wyłącznie** przy wykrytym **cross-week leak** lub **stale archive republish**, nie przy pustym lokalu per se.

```text
FIRE anti-leak ONLY WHEN:
  payrollSource.length === 0
  AND archiveRich (≥8)
  AND mergedRoster.length > 0
  AND (
    cloudWeekKey !== targetWeekKey
    OR localKey !== cloudKey
    OR staleArchiveRepublishUnderTargetWeek
  )

SKIP (same-week Cloud SSOT):
  cloudWeekKey === targetWeekKey
  AND cloud roster > 0
  AND NOT staleArchiveRepublish
```

| Element | Plik |
|---------|------|
| `applyRuntimePayrollAntiLeak(merged, valuesForMerge, cloudValues)` | `src/lib/cloud-sync.ts` |
| `isStaleArchiveRosterRepublishedUnderTargetWeek()` | `src/lib/cloud-sync.ts` |
| `computeMergedDataBundle` — przekazanie `cloudValues` | `src/lib/cloud-sync.ts` |
| Trace `reason`: `cross_week_leak` \| `stale_archive_republish` \| `skipped_same_week_cloud_ssot` | `src/lib/cloud-sync.ts` |

**Poza zakresem (zachowane):** `mergeAllDataKeys`, `finalizePayrollBundleMerge`, `reconcileAdminBundleWithFreshLocal`, `applyAdminDataBundle`, Edge, KV.

**Commit implementacji:** **`26f3eb5`** — `fix(payroll): PAYROLL-ANTI-LEAK-FIX-01 — same-week cloud SSOT guard (v2.65.14)`

---

## 4. BUILD / TEST (pre-release)

| Gate | Wynik |
|------|-------|
| `npm run build` | **PASS** |
| `scripts/test-payroll-anti-leak-same-week-cloud-p0.mjs` (T-AL-01…05) | **7/7 PASS** |
| `scripts/test-payroll-bootstrap-runtime-parity-b4.mjs` (T-AL-06) | **13/13 PASS** |
| `scripts/test-payroll-refresh-team-race-p0.mjs` (T-AL-03, T3) | **4/4 PASS** |
| `scripts/smoke-test-payroll-rollover-sync-20.1c1.mjs` (T-AL-07) | **5/5 PASS** |

---

## 5. Production Verify

### `version.json` (jednorazowo)

```json
{
  "version": "2.65.14",
  "commit": "26f3eb5",
  "timestamp": "2026-07-13T07:01:03.477Z"
}
```

| Check | Oczekiwane | Wynik |
|-------|------------|-------|
| `version` | **2.65.14** | **PASS** |
| `commit` | **26f3eb5** | **PASS** |
| Bundle markers (`skipped_same_week_cloud_ssot`, `cross_week_leak`, `stale_archive_republish`) | obecne | **PASS** |

**PRODUCTION VERIFIED**

---

## 6. Production Smoke — PAYROLL-ANTI-LEAK-PRODUCTION-SMOKE-01

**Tydzień prod:** `2026-07-13`…`2026-07-18` · Cloud roster **14** · Pn active **11**

| # | Scenariusz | Wynik |
|---|------------|-------|
| 0 | Deploy gate `version.json` | **PASS** |
| 0b | Bundle anti-leak markers | **PASS** |
| 1 | Nowy tydzień (readonly KV) | **PASS** |
| 2 | Wszyscy pracownicy w rosterze (readonly) | **PASS** — **14** |
| 3 | Godziny wpisane (readonly) | **PASS** — **11** aktywnych Pn |
| 4 | Odczekaj 5s / 10s / 30s | **PASS** — LS **14** |
| 5 | Alt+Tab → powrót (visibility sim) | **PASS** |
| 6 | Focus pull | **PASS** — LS **14** |
| 7 | Refresh (F5) | **PASS** — LS **14**, UI rows **14** |
| 8 | Drugie urządzenie (fresh context) | **PASS** — LS **14** |
| 9 | Payroll roster poprawny | **PASS** — UI = Cloud = **14** |
| 10 | Historyczny rollover (archive + regresja release) | **PASS** — 7 bogatych tygodni archiwum; T-AL-02/02b ON |

**Smoke: PASS** (12/12)

Artefakt (lokalny, niecommitowany): `.tmp/payroll-anti-leak-prod-smoke-01.mjs`

---

## 7. Protected Core (post-deploy)

| Obszar | Status |
|--------|--------|
| `finalizePayrollBundleMerge` / B4 SSOT | **GREEN** — bez zmian |
| `mergeAllDataKeys` | **GREEN** — bez zmian |
| Payroll Guard / PWRB | **GREEN** — 20.1C.1 **5/5** |
| P-INV-5 rollover anti-leak | **GREEN** — T3 / T-AL-02 zachowane |
| Jobs / Directory / Tender / WM | **GREEN** — bez zmian |

---

## 8. Lessons Learned

1. **Runtime-only guard musi znać week scope** — predykat oparty wyłącznie na `payrollSource.length === 0` + bogate archiwum jest niewystarczający; Cloud SSOT bieżącego tygodnia musi być wyłączony z anti-leak.
2. **MF-2 (write-first) nie naprawia focus pull** — auto-sync po lokalnej mutacji omija apply, ale `visibilitychange` → `pullFromCloudAndMerge` nadal przechodzi pełny pipeline z anti-leak.
3. **`localKey !== cloudKey` po align** — sam `cloudWeekKey !== targetWeekKey` nie wystarcza po `alignWeekRangeInMerged`; cross-week intent wymaga porównania z lokalnym zakresem tygodnia.
4. **Stale archive republish to osobny wektor** — stary roster pod nowymi kluczami tygodnia wymaga osobnego helpera (`isStaleArchiveRosterRepublishedUnderTargetWeek`), nie tylko mismatch kluczy.
5. **KV prod było poprawne** — fix wyłącznie runtime apply; brak migracji KV, brak restore; RCA wymagał trace pipeline stage-by-stage, nie batch-get alone.
6. **Wariant C (usunięcie anti-leak) pozostaje follow-up** — po stabilizacji SYNC-ARCH; P0 wymagał doprecyzowania predykatu (Wariant B), nie przebudowy architektury.

---

## 9. VERSION / GIT

| Pole | Wartość |
|------|---------|
| Changelog | **2.65.14** |
| Release commit | **`26f3eb5`** |
| Poprzedni prod | **2.65.13** @ `309609e` |

---

## 10. HOTFIX CLASSIFICATION

BUGFIX  
UX

---

## 11. WERDYKT

| Program | Status |
|---------|--------|
| **PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01** | **CLOSED** |
| **PAYROLL-ANTI-LEAK-FIX-01** | **CLOSED** |
| **PAYROLL-ANTI-LEAK-PRODUCTION-SMOKE-01** | **CLOSED** |

**RELEASE GO** · **PRODUCTION VERIFIED** · **SMOKE PASS** · **PROGRAM CLOSED**
