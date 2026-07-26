# WGDOM-DASHBOARD-BODY-S1 — IMPLEMENT REPORT

> **Status:** IMPLEMENT COMPLETE · **Commit/Push:** NIE  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-DASHBOARD-BODY-S1-DESIGN-FREEZE.md`](./WGDOM-DASHBOARD-BODY-S1-DESIGN-FREEZE.md)  
> **Parent:** [`WGDOM-DASHBOARD-BODY-01-AUDIT.md`](./WGDOM-DASHBOARD-BODY-01-AUDIT.md)

---

## 1. Summary

Migracja **wyłącznie** widgetu **Braki dokumentów** do języka GDS: `WgCard` soft (bez `!p-0`), badge bez `rounded-full`, expand / „Wszystkie roboty →” jako `WgButton` ghost, usunięty amber `border-l-4`, soft rows zamiast card-farm. Logika, liczniki, API i pozostałe widgety — **bez zmian**.

**Owner GO override vs DF:** shell **bez** `!p-0` (DF sugerował `!p-0` jak W08) — zaimplementowano `padding="sm"` + wewnętrzny header/body rhythm.

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/DashboardView.tsx` | Blok Braki (~W05): `WgCard` + `WgButton` ghost + soft rows + tokeny focus; import `WG_FOCUS_RING` |

**Helpers (nie część release allowlist):**

| Plik | Rola |
|------|------|
| `scripts/shot-dashboard-body-s1-braki.mjs` | Before/After screenshot |
| `scripts/verify-dashboard-body-s1-braki.mjs` | DOM assert + reshot |

**Docs:** ten raport (+ DF już wcześniej).

---

## 3. Przed / po

| | Before | After |
|--|--------|-------|
| Shell | Raw `bg-card border rounded-xl shadow-sm` | **`WgCard`** soft · `border-border/60` · soft shadow · `p-4` (bez `!p-0`) |
| Count badge | `rounded-full font-bold` | `rounded-lg font-semibold` |
| Expand | Raw `<button>` underline | **`WgButton` `variant="ghost"`** |
| Body rail | `border-l-4 border-l-amber-500/50` | **Usunięte** |
| Job rows | Nested `rounded-xl border` card-farm | Soft `rounded-lg border border-border/60 bg-secondary/10` (stale: amber tint) |
| CTA „Wszystkie roboty →” | Raw link | **`WgButton` ghost** · **nie** Primary |
| Dane / sort / toggle / titles | — | **Bez zmian** |

**Screenshoty:**

- Before: `tmp-ui-review/dashboard-body-s1/braki-before.png`
- After: `tmp-ui-review/dashboard-body-s1/braki-after.png`

(E2E seed · lokalny Vite `127.0.0.1:5176` · expanded)

**DOM verify (after):**

```text
className: bg-card border border-border/60 shadow-[0_4px_24px…] rounded-xl p-4 overflow-hidden
hasBorderL4: false
count badge: … rounded-lg … (nie rounded-full)
row: rounded-lg border … border-amber-500/35 bg-amber-500/5
```

---

## 4. Acceptance Criteria (DF)

| ID | Wynik |
|----|--------|
| AC-1 WgCard soft | **PASS** |
| AC-2 title + count · brak `rounded-full` na badge sekcji | **PASS** |
| AC-3 expand/collapse · `aria-expanded` · te same labele | **PASS** |
| AC-4 navigate job id | **PASS** (handler nienaruszony) |
| AC-5 toggle docs / lock titles | **PASS** (handler nienaruszony) |
| AC-6 CTA ghost · nie Primary | **PASS** |
| AC-7 brak amber `border-l-4` | **PASS** |
| AC-8 soft rows | **PASS** |
| AC-9 touch / wrap chips | **PASS** (`WG_TOUCH_MIN` na chipach) |
| AC-10 tylko Braki w `DashboardView` | **PASS** |
| AC-11 semantyka length / stale / REQUIRED_DOCS | **PASS** |
| AC-12 hero Primary contract | **PASS** (nie ruszany) |

---

## 5. Gates

| Gate | Wynik |
|------|--------|
| Build (`npm run build`) | **PASS** (~35s) |
| Typecheck (`tsc --noEmit`) | **PASS*** — wyłącznie pre-existing `TS5101` `baseUrl` |
| Login smoke (`test-admin-login-shell-p0a.mjs`) | **PASS** · **11/0** |

\*Brak nowych błędów TS z BODY-S1.

---

## 6. OUT (potwierdzone nietknięte)

- Pilne · Notatki · Przetargi · Pracuje dziś · Roboty w trakcie · Finanse · Hero · KPI  
- `dashboard-urgent-today.ts` · toggle/lock helpers · navigate API  
- Primary CTA w sekcji Braki — **brak**

---

## 7. Next gate

```text
Owner GO → COMMIT + PUSH (thin: DashboardView.tsx + ten raport + DF)
  → opcjonalnie PV screenshot na tipie
```

---

**WGDOM-DASHBOARD-BODY-S1**  
**Etap: IMPLEMENT**  
**Status: COMPLETE** · commit / push — **nie wykonane**
