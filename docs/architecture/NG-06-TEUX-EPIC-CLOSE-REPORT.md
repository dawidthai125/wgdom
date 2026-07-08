# NG-06 — Tender Experience (TEUX) EPIC CLOSE REPORT

> **Status dokumentu:** **FINAL** · **Epic NG-06-TEUX = COMPLETE** · **PRODUCTION VERIFIED**  
> **Data closeout:** 2026-07-08  
> **Production:** **2.63.66** · commit **`80cf911`** · implement smoke **`2d94b0d`** · **PRODUCTION VERIFIED** (curl 2026-07-08T05:48Z)  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) · [`NG-06-TEUX-PHASE1-CLOSEOUT.md`](./NG-06-TEUX-PHASE1-CLOSEOUT.md)  
> **Smoke SSOT:** `SMOKE-TEUX-NG06` · `scripts/test-tenders-teux-smoke.mjs`

---

## 1. Executive summary

Epic **NG-06-TEUX** dostarcza **design system i warstwę UX** modułu Przetargi: nawigacja V4 URL, tokeny wizualne, karty listy, mobile chrome, skeletony, empty states oraz polish slices (filtry, Command Layer, a11y, copy, Strategia/Pulpit, hosted deprecation guard). **Zero zmian** pipeline NG-02, parserów, sync i payroll.

| Pole | Wartość |
|------|---------|
| **Epic** | NG-06 Tender Experience & Design System (TEUX) |
| **Status epic** | **COMPLETE** · **PRODUCTION VERIFIED** |
| **Wersje prod** | **2.63.54** → **2.63.66** |
| **Slice count** | Phase 1: TEUX-1…6 · Phase 2: TEUX-7a…7f · Closeout: **TEUX-7z** |
| **Outstanding prod bugs** | **NONE** (epic UX) |
| **TOKEN FREEZE** | **ACTIVE** (`tender-ux-tokens.ts` od TEUX-2) |

---

## 2. Timeline releasów

| Slice | Wersja | Commit (impl.) | Zakres skrót | Status |
|-------|--------|----------------|--------------|--------|
| TEUX-1 | 2.63.54 | `5a8b820` | `openTenderDetailV4` · mapa → URL | **CLOSED** |
| TEUX-2 | 2.63.55 | `3eb70a0` | `tender-ux-tokens` · TOKEN FREEZE | **CLOSED** |
| TEUX-3 | 2.63.56 | `7a0ae83` | Mobile/desktop cards | **CLOSED** |
| TEUX-4 | 2.63.57 | `d965311` | Mobile sheet · safe-area | **CLOSED** |
| TEUX-5 | 2.63.58 | `061fc9a` | Loading skeletons | **CLOSED** |
| TEUX-6 | 2.63.59 | `ead4de7` | Empty states | **CLOSED** |
| TEUX-7a | 2.63.60 | `bc4b232` | Filtry collapsible + FAB | **CLOSED** |
| TEUX-7b | 2.63.61 | `d1e782b` | Command Layer polish | **CLOSED** |
| TEUX-7c | 2.63.62 | `75f82f2` | Accessibility pass | **CLOSED** |
| TEUX-7d | 2.63.63 | `129f22d` | Copy integrity | **CLOSED** |
| TEUX-7e | 2.63.64 | `f0a49cf` | Strategia + Pulpit KPI | **CLOSED** |
| TEUX-7f | 2.63.65 | `e0d4e47` | Hosted deprecation guard | **CLOSED** |
| **TEUX-7z** | **2.63.66** | `2d94b0d` / docs `80cf911` | Smoke agregat + epic closeout | **CLOSED** · **VERIFIED** |

---

## 3. Deliverables (skrót)

| Warstwa | SSOT |
|---------|------|
| Nawigacja V4 | `tender-detail-nav.ts` · `TENDERS_V4_ROUTING=true` |
| Design tokens | `tender-ux-tokens.ts` (**import-only po TEUX-2**) |
| Lista | `TenderListMobileCard` · `TenderListDesktopCard` |
| Mobile | `TenderModuleNavSheet` · Command Layer density |
| Loading / Empty | `TenderUxSkeleton` · `TenderUxEmptyState` |
| Polish | filtry · a11y · copy · KPI Pulpit · hosted doc |
| Test agregat | **`SMOKE-TEUX-NG06`** (12 child LIB-TENDER-*) |

---

## 4. Gapy Visual Inventory — stan końcowy

| Gap | Status |
|-----|--------|
| G-01 Navigation mapa | **CLOSED** (TEUX-1) |
| G-02 List cards | **CLOSED** (TEUX-3) |
| G-04 Mobile chrome | **CLOSED** (TEUX-4) |
| G-06 Filtry | **CLOSED** (TEUX-7a) |
| G-07 Loading | **CLOSED** (TEUX-5) |
| G-08 Empty states | **CLOSED** (TEUX-6) |
| G-11 A11y | **CLOSED** (TEUX-7c) |
| G-12 Pulpit KPI | **CLOSED** (TEUX-7e) |
| G-13 Hosted dual runtime | **CLOSED** (TEUX-7f doc — **bez** delete) |
| G-03b Copy „AI” | **CLOSED** (TEUX-7d) |

---

## 5. Boundary cumulative (#CORE-013 / #CORE-014)

| Strefa | Werdykt epic |
|--------|--------------|
| #CORE-013 — jeden bundle = jeden cel (×14 slice + 7z) | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Protected Core (sync · payroll · Edge · pipeline) | **NO DIFF** across epic |
| `tender-ux-tokens.ts` po TEUX-2 | **NO DIFF** (TOKEN FREEZE) |

---

## 6. Stabilization & defer

| Element | Status |
|---------|--------|
| **Z-04** smoke Przetargi NG-01–04 (TI-B4) | **PASS** |
| **Z-05** mobile re-cert (M-03) | **DEFERRED** — TEUX-3/4 shipped; pełna cert osobno |
| **M-06** deprecation map hosted | **CLOSED** (TEUX-7f) |
| Fizyczne usunięcie hosted | **DEFERRED** — osobny bundle Owner GO |

---

## 7. Metryki closeout

| Metryka | Wartość |
|---------|---------|
| **Bundlery implement** | **13** (TEUX-1…7f) + **1** closeout (7z) |
| **Smoke agregat** | **12/12** child PASS (`SMOKE-TEUX-NG06`) |
| **Gate B tenders** | PASS (scope:tenders) |
| **Gate B payroll** | **15/15** (#TEUX-013) |
| **Prod verify** | **2.63.66** @ `80cf911` (2026-07-08T05:48Z) |

### Komendy testów (copy-paste)

```bash
npm run test:infra -- --suite smoke-teux
npx vite-node scripts/test-tenders-teux-smoke.mjs
npm run test:infra -- --gate B --scope tenders
npm run test:infra -- --gate B --scope payroll
```

---

## 8. Werdykt

```text
NG-06-TEUX EPIC — COMPLETE · PRODUCTION VERIFIED
Phase 1 (TEUX-1…6) + Phase 2 (TEUX-7a…7f) + Closeout (TEUX-7z) — COMPLETE
TOKEN FREEZE — ACTIVE
```

**Poza roadmapą epic (defer):** hosted removal · Z-05 mobile re-cert · TOKEN thaw · Cloud Sync S7.

**Powiązane epici (osobne, nie w scope TEUX):** NG-01 Trust · NG-02 Pipeline · NG-03 Workspace · NG-04 BOQ PRO.

---

*Epic closeout · 2026-07-08 · NG-06-TEUX-7z*
