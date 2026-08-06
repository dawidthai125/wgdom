# NG-TENDERS-WORKSPACE-01 — CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** NG-TENDERS-WORKSPACE-01-CLOSEOUT  
> **Production Version:** **2.66.19**  
> **Feature / Deploy Commit:** **`182dd9af`** (`182dd9af446e83e8e773f53689333698f81ac4a9`) · tip short **`182dd9a`**  
> **Data:** 2026-08-06  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
NG-TENDERS-WORKSPACE-01 — CLOSED

2.66.19 / 182dd9af
Workspace Architecture v2 (Wariant B)
Przegląd = kanoniczny start
4 top-level: Przegląd · Kolejka · Mapa · Firma
AC-RETURN (module tab → detal → powrót)
Firma = Hub (sekcje, nie top-level)
Hidden Global Module Nav w Tender Workspace
P0 + P0.1 (Menu → Przegląd)

NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Workspace Architecture v2

| Element | Treść |
|---------|--------|
| **DF** | Wariant B LOCKED — max **4** top-level · start ≠ „Dziś” / ≠ „Strategia” |
| **Top-level** | **Przegląd** (`review`) · **Kolejka** (`queue`) · **Mapa** (`map`) · **Firma** (`company`) |
| **Kanoniczny start** | **Przegląd** — Menu / Pulpit / legacy Strategia → `openTendersAtReviewTab()` + event `wgdom-tenders-canonical-start` |
| **Detal `/przetargi/:id`** | **bez** Global Module Header/TabBar (desktop + mobile) — `hideModuleChrome` gdy `v4Detail` |
| **Local tabs** | V4 bez zmian (5 zakładek) · GO/HOLD tylko w Decyzja |
| **AC-RETURN** | `saveTendersReturnContext` / `consume` · Przegląd↔Tender · Kolejka↔Tender · default deep-link = `queue` |
| **Firma Hub** | `TendersCompanyTab` — sekcje `profile` / `workcatalog` / `pricebase` / `settings` (nie top-level) |
| **Legacy migration** | `list→queue` · `strategy→review` · `profile\|workcatalog\|pricebase\|settings→company` (+ section w sessionStorage) |
| **P0.1** | `goToView("tenders")` zawsze Przegląd (nie last LS tab) |

---

## 2. Zakres zmian

| Element | Treść |
|---------|--------|
| **IN** | Tab IDs v2 · shell 4 tabs · Firma hub · AC-RETURN · hide module chrome · entry remap · P0.1 Menu→Przegląd · changelog **2.66.18–2.66.19** · testy P0/P0.1 |
| **OUT** | Cloud Sync · Payroll · Edge · Pipeline · Parser · Publication · KV · Process Strip / local V4 rewrite · GO/HOLD poza Decyzją |
| **Test** | `scripts/test-ng-tenders-workspace-01-p0.mjs` · `scripts/test-ng-tenders-workspace-01-p01.mjs` · regresje nav (TEUX4, work-catalog, empty-states, …) |
| **Commit** | `182dd9af446e83e8e773f53689333698f81ac4a9` · message `feat(tenders): introduce workspace architecture v2` |

**Kluczowe pliki:** `tenders-module-nav.ts` · `tenders-module-labels.ts` · `tender-module-nav-sheet.ts` · `TendersModule.tsx` · `TendersProvider.tsx` · `TendersCompanyTab.tsx` · `App.tsx`

---

## 3. Boundary — **NO TOUCH**

| Warstwa | Status |
|---------|--------|
| Cloud Sync | **NO TOUCH** |
| Payroll | **NO TOUCH** |
| Edge (`make-server-0afb8820`) | **NO TOUCH** |
| Pipeline / Parser | **NO TOUCH** |
| Publication | **NO TOUCH** |
| KV keys | **NO TOUCH** (tylko LS tab + sessionStorage return/section) |

---

## 4. Known Residuals — **NOT PART OF THIS EPIC**

| Residual | Uwaga |
|----------|--------|
| **TEST-INFRA Gates** — `LIB-TENDER-STRATEGY-TEUX7E` | Gate B tenders FAIL · KPI token imports w ShortcutPanel · **pre-existed** na tipie `e871fed6` · **NOT PART OF THIS EPIC** |
| **Mobile Smoke** — Jobs / `Dokumentacja` button | mobile-e2e FAIL · poza Przetargi workspace · **NOT PART OF THIS EPIC** |
| **Legacy Happy Path E2E** | `list-column-missing` (Jobs) + Dokumentacja · workflow LEGACY · **NOT PART OF THIS EPIC** |

Tip deploy **PRODUCTION VERIFIED** niezależnie od residual CI (jak wcześniejsze tipy).

Payroll Gate B w TI: **PASS**.

---

## 5. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.19** |
| **Commit** | **`182dd9af`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.19` / `182dd9a` |
| **GitHub** | https://github.com/dawidthai125/wgdom/commit/182dd9af446e83e8e773f53689333698f81ac4a9 |

---

## 6. NEXT

**WAITING FOR NEXT OWNER GO.**

---

*CLOSEOUT · NG-TENDERS-WORKSPACE-01 · 2026-08-06*
