# NG-06-TEUX — Phase 1 (Core) · Epic Closeout

> **Status:** **NG-06 PHASE 1 COMPLETE**  
> **Prod:** UI **2.63.59** · commit **`ead4de7`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-07  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md)  
> **Visual Inventory:** [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md)

```text
╔══════════════════════════════════════════════════════════════╗
║  NG-06-TEUX — PHASE 1 (CORE)                                 ║
║  Zakres: TEUX-1 … TEUX-6                                     ║
║  Status: COMPLETE                                            ║
║  Prod:   2.63.54 → 2.63.59                                   ║
╠══════════════════════════════════════════════════════════════╣
║  TOKEN FREEZE:  ACTIVE (od TEUX-2)                           ║
║  PHASE 2:       TEUX-7+ POLISH — READY FOR AUDIT             ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 1. Zakres Phase 1

**Phase 1** = liniowy łańcuch bundli core modułu Przetargi (Design Freeze §3): nawigacja → tokeny → karty → mobile → loading → empty states.

**Poza Phase 1:** TEUX-7+ polish slices (osobne commity · Owner GO per slice).

---

## 2. Timeline bundli (CLOSED)

| Bundle | Wersja | Commit | Closeout / Release |
|--------|--------|--------|-------------------|
| **TEUX-1** Navigation | 2.63.54 | `5a8b820` | [`NG-06-TEUX-TEUX1-CLOSEOUT.md`](./NG-06-TEUX-TEUX1-CLOSEOUT.md) |
| **TEUX-2** Design Tokens | 2.63.55 | `3eb70a0` | [`NG-06-TEUX-TEUX2-CLOSEOUT.md`](./NG-06-TEUX-TEUX2-CLOSEOUT.md) |
| **TEUX-3** List Cards | 2.63.56 | `7a0ae83` | combined release TEUX-3/4 |
| **TEUX-4** Mobile Chrome | 2.63.57 | `d965311` | [`NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md`](./NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md) |
| **TEUX-5** Loading | 2.63.58 | `061fc9a` | [`NG-06-TEUX-TEUX5-CLOSEOUT.md`](./NG-06-TEUX-TEUX5-CLOSEOUT.md) |
| **TEUX-6** Empty States | **2.63.59** | **`ead4de7`** | [`NG-06-TEUX-TEUX6-CLOSEOUT.md`](./NG-06-TEUX-TEUX6-CLOSEOUT.md) |

**Prod verified:** `version.json` → `2.63.59` / `ead4de7` (2026-07-07).

---

## 3. Deliverables Phase 1 (skrót)

| Warstwa | SSOT / artefakt |
|---------|-----------------|
| Nawigacja V4 | `openTenderDetailV4` · `tender-detail-nav.ts` |
| Design tokens | `tender-ux-tokens.ts` · `TenderUxBadge` (**TOKEN FREEZE**) |
| Lista kart | `TenderListMobileCard` · `TenderListDesktopCard` |
| Mobile | `TenderModuleNavSheet` · tab shadow · safe-area |
| Loading | `TenderUxSkeleton` · shells lista/docs/BOQ |
| Empty | `TenderUxEmptyState` · lista/mapa/docs/kosztorys |

**Test gates (manifest):** `LIB-TENDER-DETAIL-NAV-TEUX1` · `TEUX2` · `TEUX3` · `TEUX4` · `TEUX5` · `TEUX6`

---

## 4. Gapy Visual Inventory — Phase 1

| Gap | Opis | Phase 1 |
|-----|------|---------|
| G-07 | Loading bez skeleton | **CLOSED** (TEUX-5) |
| G-08 | Niespójne empty states | **CLOSED** (TEUX-6) |
| G-01…G-06, G-09…G-13 | Filtry · a11y · copy · Strategia · legacy | **OPEN** → Phase 2 (TEUX-7+) |

---

## 5. Boundary cumulative (Phase 1)

| Strefa | Werdykt |
|--------|---------|
| #CORE-013 — jeden bundle = jeden commit (×6) | **PASS** |
| #CORE-014 — FEATURE UI allowlista | **PASS** |
| Protected Core (Payroll · sync · Edge · parser SSOT) | **NO DIFF** across TEUX-1…6 |
| `tender-ux-tokens.ts` po TEUX-2 | **NO DIFF** (TOKEN FREEZE) |

---

## 6. TOKEN FREEZE

```text
STATUS: ACTIVE (wiążące dla Phase 2)

Ustanowiony: TEUX-2 (2.63.55)
Potwierdzony: TEUX-3 … TEUX-6 — import-only

Phase 2 (TEUX-7+): bez thaw bez explicit Owner GO + MID/EPIC review
```

---

## 7. Phase 2 — TEUX-7+ roadmap

| Slice | Opis | Status |
|-------|------|--------|
| **TEUX-7a** | Lista — filtry collapsible + FAB | **READY FOR AUDIT** |
| **TEUX-7b** | Command Layer polish | **READY FOR AUDIT** |
| **TEUX-7c** | Accessibility pass | **READY FOR AUDIT** |
| **TEUX-7d** | Copy integrity (AI rebrand) | **READY FOR AUDIT** |
| **TEUX-7e** | Strategia + Pulpit alignment | **READY FOR AUDIT** |
| **TEUX-7f** | Hosted deprecation guard | **READY FOR AUDIT** |
| **TEUX-7z** | Epic closeout smoke agregat | **BLOCKED** (po 7a–7f) |

**Gate:** TEUX-7+ wymaga **TEUX-6 CLOSED** — **SPEŁNIONE**.

**Następny krok Owner:** wybór slice → `AUDIT TEUX-7x` → Owner GO → IMPLEMENT (osobny bundle).

**Zakaz:** automatyczny start TEUX-7 IMPLEMENT bez AUDIT.

---

## 8. Werdykt Phase 1

```text
NG-06-TEUX PHASE 1 (TEUX-1…6) — COMPLETE
PRODUCTION: 2.63.59 · ead4de7 — VERIFIED
TEUX-7+ — READY FOR AUDIT (nie IMPLEMENT)
```

---

*NG-06-TEUX · Phase 1 Core Closeout · 2026-07-07*
