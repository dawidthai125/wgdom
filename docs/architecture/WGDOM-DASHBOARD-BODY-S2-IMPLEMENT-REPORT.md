# WGDOM-DASHBOARD-BODY-S2 — IMPLEMENT REPORT

> **Status:** IMPLEMENT COMPLETE · **Commit/Push:** NIE  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-DASHBOARD-BODY-S2-DESIGN-FREEZE.md`](./WGDOM-DASHBOARD-BODY-S2-DESIGN-FREEZE.md)  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · po S1 tip `1cf8af2`

---

## 1. Summary

Migracja **wyłącznie** widgetu **Pilne uwagi** do języka GDS jak shipped S1: `WgCard` soft (bez `!p-0`), title `text-sm font-semibold` (bez uppercase), badge `rounded-lg`, CTA **ghost/secondary**, soft accordion rows. Logika, liczniki, API i `DashboardView` — **bez zmian**.

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/DashboardPilneUwagiSection.tsx` | Shell → `WgCard` soft; header/title/badge; expand + body CTAs → `WgButton` ghost/secondary; category badges `rounded-lg`; soft rows + `WG_FOCUS_RING` |
| `docs/architecture/WGDOM-DASHBOARD-BODY-S2-IMPLEMENT-REPORT.md` | Ten raport |

**Nietknięte (potwierdzone):** `DashboardView.tsx` · `dashboard-urgent-today.ts` · Braki · Notatki · Przetargi · Hero/KPI.

---

## 3. Przed / po (skrót)

| | Before | After |
|--|--------|-------|
| Shell | Raw `bg-card border rounded-xl shadow-sm` | **`WgCard` soft** · `padding="sm"` · bez `!p-0` |
| Title | `uppercase tracking-wider` · `text-xs` | **`text-sm font-semibold`** |
| Badge sekcji / kategorii | `rounded-full` · `text-[10px]` | **`rounded-lg`** · `text-xs font-semibold` · te same wartości |
| Expand | Raw button | **`WgButton` ghost** |
| Linki „… →” | Raw underline | **`WgButton` ghost** |
| „Popraw” | `bg-primary/15` raw | **`WgButton` secondary** (nie Primary) |
| Category marker | `▶` + rounded-full badge | Chevron-only + `rounded-lg` badge |
| Primary w Pilne | — | **0** |

---

## 4. Acceptance Criteria (DF)

| ID | Wynik |
|----|--------|
| AC-1 WgCard soft | **PASS** |
| AC-2 title bez uppercase | **PASS** |
| AC-3 badge `urgentTodayTotal` · `rounded-lg` | **PASS** |
| AC-4 expand ghost · te same labele | **PASS** |
| AC-5 collapsed summary | **PASS** |
| AC-6 kategorie / toggle / counts | **PASS** (logika nienaruszona) |
| AC-7 category badge `rounded-lg` | **PASS** |
| AC-8 soft accordion | **PASS** |
| AC-9 0 Primary | **PASS** (grep: brak `variant="primary"`) |
| AC-10 handlery bez zmian | **PASS** |
| AC-11 tylko Pilne file | **PASS** |
| AC-12 inne widgety | **PASS** |
| AC-13 hero Primary contract | **PASS** (ui-guard T05) |

---

## 5. Gates

| Gate | Wynik |
|------|--------|
| Build (`npm run build`) | **PASS** (~36s) |
| Typecheck (`tsc --noEmit`) | **PASS*** — wyłącznie pre-existing `TS5101` `baseUrl` |
| Login smoke P0-A | **PASS** · **11/0** |
| `test:e2e:ui-guard` @ `http://127.0.0.1:4173` (fresh dist) | **9/9 PASS** (~19s) |

\*Brak nowych błędów TS z BODY-S2.

---

## 6. Next gate

```text
Owner GO → COMMIT + PUSH (thin: DashboardPilneUwagiSection.tsx + DF + ten raport)
  → Deploy → PV
```

---

**WGDOM-DASHBOARD-BODY-S2**  
**Etap: IMPLEMENT**  
**Status: COMPLETE** · commit / push — **nie wykonane**
