# Release Report — 20.5Z.5C Mobile Jobs List Width Fix

**Data:** 2026-06-10  
**Wersja UI:** **2.50.65**  
**Sprint:** **20.5Z.5C** — Mobile-only layout fix (`<640px`)  
**Status:** **RELEASED** · deploy **`82hqixksgPYSD8c5LRbkwEEFusn5`**

---

## Summary

Naprawa regresji mobilnego layoutu w Admin → Roboty: przy braku wybranej roboty lista nie jest zwężona do ~35% — pełna szerokość ekranu. Pusty wrapper panelu szczegółów ukryty na mobile. Desktop/tablet split 35/65 bez zmian.

**Bez zmian:** sync/KV, Edge, model danych, filtry, KPI, kolejki, `JobListCardV2`, logika `selectedJob`.

---

## Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/JobsView.tsx` | `flex-1 sm:flex-[7]` lista; `hidden sm:flex` na pustym wrapperze `flex-[13]` |
| `scripts/smoke-test-jobs-ux-pack-2.50.40.mjs` | `split_list_flex_7` + `mobile_full_width_jobs_list` |
| `src/app/changelog-data.ts` | v2.50.65 |
| `CHANGELOG.md` | wpis 2.50.65 |
| `CURRENT-TASK.md` | baseline 2.50.65 / 5C |
| `docs/PROJECT-HANDOFF.md` | ostatni release 5C |
| `docs/ARCHITECTURE.md` | nagłówek + mobile layout note |
| `AGENTS.md` | wersja UI |
| `.cursor/rules/wgdom-stan-projektu.mdc` | wersja UI |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-jobs-ux-pack-2.50.40.mjs` | **16/16 PASS** |
| Viewport 390×844 (manual) | lista 100%, brak pustej kolumny, detail pełna szerokość po kliku |

---

## Handoff

- [`SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md) — sekcja 20.5Z.5C
- [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) — baseline po release
