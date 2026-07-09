# NG-09-01 — Inspector Workspace Frame · Bundle Closeout

> **Status:** **NG-09-01 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.80** · commit **TBD post-push** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-09  
> **Owner GO:** RELEASE GO · IMPLEMENT REVIEW PASS  
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
| D9 | CHANGELOG **2.63.80** · verify FAST | **PENDING post-push** |
| D10 | #CORE-013 / #CORE-014 | **PASS** |

**Maintenance debt (osobny task):** `smoke-test-inspector-scroll-20.1d1.mjs` T6 — regex oczekuje `renderBottomNav()` w gałęzi jobs (pre-shell); nie blokuje release.

---

## 4. Production verification

```text
curl -s https://www.wgdom.fun/version.json
→ version: 2.63.80
→ commit:  <release commit>
```

| Check | Werdykt |
|-------|---------|
| UI version | **2.63.80** |
| PRODUCTION VERIFIED | **TBD** — jedno curl po push |

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
