# NG-06-TEUX — TEUX-7b Command Layer polish · Bundle Closeout

> **Status:** **TEUX-7b CLOSED**  
> **Prod:** UI **2.63.61** (post-push verify)  
> **Data closeout:** 2026-07-07  
> **Owner GO:** APPROVED (IMPLEMENT + RELEASE)  
> **Audyt:** [`NG-06-TEUX-TEUX7B-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7B-AUDIT-REPORT.md)

```text
TOKEN FREEZE: ACTIVE (import-only)
GAP G-10: CLOSED
```

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | CTA disabled reason · collapsible trust ribbon · mobile breadcrumb context |
| **Deliverable** | `tender-command-layer-ux.ts` + Command Layer / Ribbon / PrimaryAction |
| **Complexity** | **M** — 10 plików, 1 commit |
| **Rollback** | `git revert <commit>` |
| **TOKEN FREEZE** | **ACTIVE** — import-only |

---

## 2. Acceptance Criteria (DF §4 TEUX-7b)

| AC | Status |
|----|--------|
| CTA disabled reason (prezentacja only) | **PASS** |
| Process Strip + CTA zawsze widoczne | **PASS** |
| Collapsible sygnały zaufania | **PASS** |
| Mobile breadcrumb context (`data-teux7b-mobile-context`) | **PASS** |
| Tab scroll shadow regresja (TEUX-4) | **PASS** |
| P0–P12 / `resolveOwnerNextAction` nietknięte | **PASS** |
| `LIB-TENDER-COMMAND-TEUX7B` | **PASS** 31/31 |
| Gate B tenders + payroll | **PASS** 10/10 + 15/15 |
| CHANGELOG **2.63.61** | **PASS** |

---

## 3. Gapy zamknięte

| Gap | Opis | Status |
|-----|------|--------|
| **G-10** | CTA disabled bez reason | **CLOSED** |

**Defer:** a11y sweep → **TEUX-7c** · copy AI → **TEUX-7d**

---

## 4. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / sync / CloudLoader / Edge / App.tsx | **NO DIFF** |
| `tender-workflow-primary-action.ts` logika | **NO DIFF** |
| `tender-intelligence-next-action.ts` | **NO DIFF** |

---

## 5. Pliki bundla

| Plik | Rola |
|------|------|
| `src/lib/tender-command-layer-ux.ts` | LS trust collapsed + `resolvePrimaryActionDisabledReason` |
| `src/app/TenderDetailCommandLayer.tsx` | Mobile context line |
| `src/app/TenderStatusRibbon.tsx` | Collapsible trust · Process Strip always on |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Disabled reason UI + a11y |
| `src/app/GuideView.tsx` | FAQ Command Layer + CTA |
| `scripts/test-tender-command-teux7b.mjs` | Gate `LIB-TENDER-COMMAND-TEUX7B` |
| `test-infra/test-manifest.json` | Manifest entry |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **2.63.61** |

---

## 6. Testy

```bash
npx vite-node scripts/test-tender-command-teux7b.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npm run test:infra -- --gate B --scope tenders
npm run test:infra -- --gate B --scope payroll
```

---

## 7. Następny slice

**TEUX-7c** — a11y sweep (na Owner GO po audycie)

---

*NG-06-TEUX · TEUX-7b CLOSED · 2026-07-07*
