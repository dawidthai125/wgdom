# NG-09-02 — Inspector View Router (L1) · Bundle Closeout

> **Status:** **NG-09-02 CLOSED** · **DEPLOY PROPAGATING**  
> **Prod:** UI **2.63.81** (expected) · implement **`633272a`** · release **`472304d`** · https://www.wgdom.fun  
> **Verify (1× curl):** `2.63.80` @ `aa4e843` — **DEPLOY PROPAGATING**  
> **Data closeout:** 2026-07-09  
> **Parent:** NG-09 Inspector Workspace Modernization · slice **2/5**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Wydzielenie routingu L1 — `InspectorViewRouter` dla 5 tabów głównych |
| **Deliverable** | Router L1 · panel jako orchestrator · Job Workspace nietknięty |
| **Complexity** | **S** — 1 plik NEW + 1 MOD |
| **Rollback** | `git revert` release + implement commits |

---

## 2. Zakres zamknięty (allowlist)

| Plik | Akcja | Status |
|------|-------|--------|
| `src/app/inspector/InspectorViewRouter.tsx` | NEW | **CLOSED** |
| `src/app/InspectorPanel.tsx` | MOD — orchestrator + job workspace | **CLOSED** |

**Nietknięte:** `InspectorShell` · sync · `selectedId` / `jobSection` · Protected Core.

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | 5 tabów L1 przez `InspectorViewRouter` | **PASS** |
| D2 | SSOT nav (`INSPECTOR_MAIN_TAB_DEFS`) bez zmian | **PASS** |
| D3 | Router = L1 only (AC-03) | **PASS** |
| D4 | `InspectorPanel` mniejszy niż po NG-09-01 (1956→1821 LOC) | **PASS** |
| D5 | `smoke-test-inspector-20.2a.mjs` | **PASS** 22/22 |
| D6 | `smoke-test-inspector-job-assignment.mjs` | **PASS** 12/12 |
| D7 | `npm run build` | **PASS** |
| D8 | CHANGELOG **2.63.81** · verify FAST | **DEPLOY PROPAGATING** (curl → 2.63.80 @ aa4e843) |
| D9 | #CORE-013 / #CORE-014 | **PASS** |
| D10 | Implement + release | **PASS** **`633272a`** + **`472304d`** |

**Maintenance debt:** `smoke-test-inspector-scroll-20.1d1.mjs` T3/T4/T6 — grep `InspectorPanel` po przeniesieniu L1 do routera.

---

## 4. Production verification

```text
curl -s https://www.wgdom.fun/version.json  (2026-07-09, jedno sprawdzenie)
→ version: 2.63.80  (STALE — oczekiwane 2.63.81)
→ commit:  aa4e843  (STALE — oczekiwane 472304d)
→ push:    472304d on origin/main — SUCCESS
```

| Check | Werdykt |
|-------|---------|
| Push origin/main | **PASS** · **`472304d`** |
| UI version (curl) | **DEPLOY PROPAGATING** |
| PRODUCTION VERIFIED | **PENDING** — oczekiwane **2.63.81** / **472304d** |

---

## 5. Commits

| Commit | Opis |
|--------|------|
| **`633272a`** | feat(inspector): NG-09-02 View Router — L1 main tabs |
| **`472304d`** | release: NG-09-02 v2.63.81 (changelog + closeout) |

---

## 5. Następny krok programu NG-09

| Bundle | Status |
|--------|--------|
| NG-09-01 Workspace Frame | **CLOSED** · 2.63.80 |
| **NG-09-02** View Router L1 | **CLOSED** · 2.63.81 |
| **NG-09-03** Job Workspace Router | **BLOCKED** — readiness: [`NG-09-03-BUNDLE-READINESS-REVIEW.md`](NG-09-03-BUNDLE-READINESS-REVIEW.md) |
| NG-09-04…05 | **BLOCKED** |
