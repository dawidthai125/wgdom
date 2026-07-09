# NG-09-01 — Inspector Workspace Frame · Bundle Closeout

> **Status:** **NG-09-01 CLOSED** · **DEPLOY PROPAGATING**  
> **Prod:** UI **2.63.80** (expected) · commit **`566fa0d`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-09  
> **Verify (1× curl):** `2.63.79` @ `cc7ba83` — **DEPLOY PROPAGATING** (Vercel)  
> **Parent:** NG-09 Inspector Workspace Modernization · slice **1/5**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Wydzielenie Workspace Frame — `InspectorShell`, `InspectorCommandLayer`, `InspectorSidebar`; SSOT nawigacji L1; mobile bottom nav + desktop sidebar |
| **Deliverable** | Frame composition · command layer parity · nav SSOT · job detail bottom-nav hide |
| **Complexity** | **S** — 3 pliki NEW + 2 MOD |
| **Rollback** | `git revert <commit>` |

---

## 2. Zakres zamknięty (allowlist)

| Plik | Akcja | Status |
|------|-------|--------|
| `src/app/inspector/InspectorShell.tsx` | NEW | **CLOSED** |
| `src/app/inspector/InspectorCommandLayer.tsx` | NEW | **CLOSED** |
| `src/app/inspector/InspectorSidebar.tsx` | NEW | **CLOSED** |
| `src/app/InspectorNavigation.tsx` | MOD — `INSPECTOR_MAIN_TAB_DEFS` SSOT | **CLOSED** |
| `src/app/InspectorPanel.tsx` | MOD — shell wiring | **CLOSED** |
| `src/app/InspectorHelp.tsx` | unchanged | **CLOSED** |

**Poza zakresem (zgodnie z GO):** NG-09-02 View Router · sync extraction · Protected Core · App.tsx · CloudLoader · cloud-sync.ts · Payroll · Edge.

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | Desktop sidebar `md+` + workspace flex (DF-07) | **PASS** |
| D2 | Mobile bottom nav + hide on job detail | **PASS** |
| D3 | Command Layer parity (sync, notes, help, logout) | **PASS** |
| D4 | SSOT 5 tabów — zero duplicate tab list | **PASS** |
| D5 | Zero diff Protected Core | **PASS** |
| D6 | `smoke-test-inspector-20.2a.mjs` | **PASS** 22/22 |
| D7 | Manual QA (mobile/desktop/frame/nav/job/command) | **PASS** |
| D8 | `npm run build` | **PASS** |
| D9 | CHANGELOG **2.63.80** · verify FAST | **DEPLOY PROPAGATING** (curl → 2.63.79 @ cc7ba83) |
| D10 | #CORE-013 / #CORE-014 | **PASS** |
| D11 | Release commit | **PASS** **`566fa0d`** |

**Maintenance debt (osobny task):** `smoke-test-inspector-scroll-20.1d1.mjs` T6 — regex oczekuje `renderBottomNav()` w gałęzi jobs (pre-shell); nie blokuje release.

---

## 4. Production verification

```text
curl -s https://www.wgdom.fun/version.json  (2026-07-09, jedno sprawdzenie)
→ version: 2.63.79  (STALE — oczekiwane 2.63.80)
→ commit:  cc7ba83  (STALE — oczekiwane 566fa0d)
→ push:    566fa0d on origin/main — SUCCESS
```

| Check | Werdykt |
|-------|---------|
| Push origin/main | **PASS** · **`566fa0d`** |
| UI version (curl) | **DEPLOY PROPAGATING** |
| PRODUCTION VERIFIED | **PENDING** — owner: jedno curl gdy Vercel skończy → oczekiwane **2.63.80** / **566fa0d** |

---

## 5. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden bundle | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / Cloud Sync / CloudLoader / Edge / App.tsx CORE | **NO DIFF** |

---

## 6. Następny krok programu NG-09

| Bundle | Status |
|--------|--------|
| **NG-09-01** Workspace Frame | **CLOSED** |
| **NG-09-02** View Router | **BLOCKED** — wymaga AUDIT + Owner GO |
| NG-09-03…05 | **BLOCKED** |
