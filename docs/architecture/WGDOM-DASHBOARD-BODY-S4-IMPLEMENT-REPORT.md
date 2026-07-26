# WGDOM-DASHBOARD-BODY-S4 — IMPLEMENT REPORT

> **Status:** **SHIPPED** · tip **`bd0f239`** · **PRODUCTION VERIFIED**  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-DASHBOARD-BODY-S4-DESIGN-FREEZE.md`](./WGDOM-DASHBOARD-BODY-S4-DESIGN-FREEZE.md)  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · po S1–S3  
> **Release:** [`WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md`](./WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md)

---

## 1. Summary

Migracja **wyłącznie** skrótu **Przetargi** do GDS: `WgCard` soft, soft KPI tiles (bez `TEUX_*`), CTA **`WgButton` secondary**. Logika liczników / `handleOpenStrategy` / API — **bez zmian**.

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/tenders/components/TendersShortcutPanel.tsx` | Shell → `WgCard`; tiles GDS; CTA secondary; usunięto `tender-ux-tokens` |
| `docs/architecture/WGDOM-DASHBOARD-BODY-S4-IMPLEMENT-REPORT.md` | Ten raport |

**Nietknięte:** `DashboardView.tsx` · pipeline/scoring · pełny TEUX module · S1–S3 widgety.

---

## 3. Przed / po

| | Before | After |
|--|--------|-------|
| Shell / loading | Raw `section` border shadow-sm | **`WgCard` soft** |
| Title | `font-bold tracking-wide` | **`text-sm font-semibold`** |
| Subtitle | `text-[11px]` | **`text-xs`** |
| KPI | `TEUX_KPI_*` + violet/amber nested cards | Soft GDS tiles · `WG_TYPE_LABEL` · warn/info tones |
| CTA | Solid Primary `bg-primary` | **`WgButton` `variant="secondary"`** |
| Counts / nav | — | **Bez zmian** |

---

## 4. Acceptance Criteria (DF)

| ID | Wynik |
|----|--------|
| AC-1 WgCard soft | **PASS** |
| AC-2 title semibold | **PASS** |
| AC-3 subtitle `text-xs` | **PASS** |
| AC-4 trzy formuły liczników | **PASS** |
| AC-5 brak TEUX_* | **PASS** |
| AC-6 CTA secondary · 0 Primary | **PASS** |
| AC-7 handleOpenStrategy | **PASS** |
| AC-8 tylko ten plik (+ raport) | **PASS** |
| AC-9 DashboardView / inne | **PASS** |
| AC-10 Guard T05 | **PASS** (ui-guard) |

---

## 5. Gates

| Gate | Wynik |
|------|--------|
| Build (`npm run build`) | **PASS** (~62s) |
| Typecheck (`tsc --noEmit`) | **PASS*** — wyłącznie pre-existing `TS5101` `baseUrl` |
| Login smoke P0-A | **PASS** · **11/0** |
| `test:e2e:ui-guard` @ `http://127.0.0.1:4173` (fresh dist) | **9/9 PASS** (~20.5s) |

\*Brak nowych błędów TS z BODY-S4.

---

## 6. Next gate

```text
Owner GO → COMMIT + PUSH (thin: TendersShortcutPanel.tsx + DF + ten raport)
```

---

**WGDOM-DASHBOARD-BODY-S4**  
**Etap: IMPLEMENT**  
**Status: COMPLETE** · commit / push — **nie wykonane**
