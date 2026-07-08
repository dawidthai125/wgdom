# NG-07-TEUX-01 — Lista Przetargów UX · Bundle Closeout

> **Status:** **NG-07-TEUX-01 CLOSED FINAL** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.72** · `version.json` commit **`08a6649`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-08 · **verify:** 2026-07-08 (`curl version.json` → **2.63.72** @ `08a6649` PASS)  
> **Owner GO:** APPROVED  
> **Audyt:** [`NG-07-TEUX-01-UX-AUDIT.md`](./NG-07-TEUX-01-UX-AUDIT.md)  
> **Design Freeze:** [`NG-07-TEUX-01-DESIGN-FREEZE.md`](./NG-07-TEUX-01-DESIGN-FREEZE.md) v1.0

```text
PRE-VERIFY:  PASS (build + gate B tenders 15/15)
PUSH:        PASS (08a6649 → origin/main)
PROD:        PRODUCTION VERIFIED (version.json 2.63.72 @ 08a6649)
RELEASE:     GO (FEATURE/UI only · #CORE-013)
BUNDLE:      CLOSED FINAL (4/4 slices)
TOKEN FREEZE: ACTIVE (import-only)
```

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | UX pulpitu listy Przetargów (`/przetargi` → Lista) — KPI, compaction, karty, desktop density |
| **Class** | FEATURE UI · **bez** pipeline / sync / payroll / parser / Edge |
| **Slices** | NG-07-01…04 (4 commity) |
| **Rollback** | `git revert 08a6649` … `f70c829` (per slice) |

---

## 2. Timeline slice’ów

| Slice | Wersja | Commit | Zakres |
|-------|--------|--------|--------|
| **NG-07-01** | **2.63.69** | `f70c829` | KPI dashboard · CTA dedup · insight banner tokens |
| **NG-07-02** | **2.63.70** | `6262e3e` | Tab/search compaction · section typography · inline counters |
| **NG-07-03** | **2.63.71** | `b231f43` | Badge cap · card hierarchy · empty states |
| **NG-07-04** | **2.63.72** | `08a6649` | max-w-7xl · filtry full width · card separators · desktop density |

---

## 3. Acceptance Criteria (epic)

| AC | Status |
|----|--------|
| UX-01 duplicate CTA removed | **PASS** (NG-07-01) |
| UX-02 mobile KPI visible | **PASS** (NG-07-01) |
| UX-03 truncation / badge cap | **PASS** (NG-07-03) |
| UX-04 module chrome compaction | **PASS** (NG-07-01/02) |
| UX-05 max-w-4xl removed | **PASS** (NG-07-04) |
| UX-06 section typography unified | **PASS** (NG-07-02) |
| Long-list scanability (SS-07) | **PASS** (NG-07-04) |
| Desktop width alignment (SS-09) | **PASS** (NG-07-04) |
| Gate B tenders smoke | **PASS** (15/15) |
| Prod verify `version.json` | **PASS** · **2.63.72** |

---

## 4. Pliki kluczowe (post-epic)

| Plik | Rola |
|------|------|
| `src/app/tenders/list/TenderListKpiDashboard.tsx` | KPI strip lista |
| `src/app/tenders/TendersModule.tsx` | Compact header |
| `src/app/TendersView.tsx` | Lista · filtry · density · max-w-7xl |
| `src/app/tenders/list/tender-list-card-model.ts` | Badge cap · severity |
| `src/app/tenders/list/TenderListMobileCard.tsx` | Mobile card |
| `src/app/tenders/list/TenderListDesktopCard.tsx` | Desktop card density |
| `src/app/tenders/list/TenderListFiltersPanel.tsx` | Desktop filters panel |

---

## 5. Werdykt

```text
NG-07-TEUX-01 — BUNDLE CLOSED FINAL · PRODUCTION VERIFIED
STABILIZATION WINDOW — kolejny FEATURE tylko Owner GO
```

**Nie zmieniaj bez polecenia:** `tender-ux-tokens.ts` (TOKEN FREEZE) · pipeline · sync · payroll merge.

---

*Epic closeout · 2026-07-08 · NG-07-TEUX-01*
