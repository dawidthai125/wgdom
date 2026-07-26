# WGDOM-DASHBOARD-BODY-S3 — IMPLEMENT REPORT

> **Status:** **SHIPPED** · tip **`ca08c75`** · **PRODUCTION VERIFIED**  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-DASHBOARD-BODY-S3-DESIGN-FREEZE.md`](./WGDOM-DASHBOARD-BODY-S3-DESIGN-FREEZE.md)  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md) · po S1 `1cf8af2` · S2 `e2e1c58`  
> **Release:** [`WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md`](./WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md)

---

## 1. Summary

Migracja **wyłącznie** widgetu **Notatki operacyjne** do GDS jak S1/S2: `WgCard` soft `as="button"`, unread tint, title `text-sm font-semibold` (bez uppercase), metryki bez `text-[10px]` (`WG_TYPE_LABEL`), klik → `onOpen`, **0 Primary**.

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/DashboardOperationalNotesWidget.tsx` | Raw button → `WgCard as="button"` soft + GDS typography |
| `docs/architecture/WGDOM-DASHBOARD-BODY-S3-IMPLEMENT-REPORT.md` | Ten raport |

**Nietknięte:** `DashboardView.tsx` · `operational-notes-dashboard.ts` · Braki · Pilne · inne widgety.

---

## 3. Przed / po

| | Before | After |
|--|--------|-------|
| Shell | Raw `<button>` `rounded-xl border` | **`WgCard` soft** `as="button"` · `padding="sm"` |
| Unread tint | `bg-primary/5 border-primary/25` | **Zachowany** via `className` |
| Title | `uppercase tracking-wider` · `text-xs` | **`text-sm font-semibold`** |
| Metric labels | `text-[10px] uppercase…` | **`WG_TYPE_LABEL`** |
| Footer | `text-[10px]` | **`text-xs`** |
| Click | `onOpen` | **`onOpen`** (bez zmian) |
| Primary | — | **0** |

---

## 4. Acceptance Criteria (DF)

| ID | Wynik |
|----|--------|
| AC-1 WgCard soft | **PASS** |
| AC-2 title bez uppercase | **PASS** |
| AC-3 brak `text-[10px]` | **PASS** |
| AC-4 metryki total/unread/fromInspector | **PASS** |
| AC-5 onOpen + aria-label | **PASS** |
| AC-6 unread tint | **PASS** |
| AC-7 0 Primary | **PASS** |
| AC-8 tylko ten plik (+ raport) | **PASS** |
| AC-9 DashboardView / inne | **PASS** |
| AC-10 Guard T05 | **PASS** (ui-guard) |

---

## 5. Gates

| Gate | Wynik |
|------|--------|
| Build (`npm run build`) | **PASS** (~43s) |
| Typecheck (`tsc --noEmit`) | **PASS*** — wyłącznie pre-existing `TS5101` `baseUrl` |
| Login smoke P0-A | **PASS** · **11/0** |
| `test:e2e:ui-guard` @ `http://127.0.0.1:4173` (fresh dist) | **9/9 PASS** (~17s) |

\*Brak nowych błędów TS z BODY-S3.

---

## 6. Next gate

```text
Owner GO → COMMIT + PUSH (thin: DashboardOperationalNotesWidget.tsx + DF + ten raport)
```

---

**WGDOM-DASHBOARD-BODY-S3**  
**Etap: IMPLEMENT**  
**Status: COMPLETE** · commit / push — **nie wykonane**
