# WGDOM-SIDEBAR-REGRESSION-02 — IMPLEMENT REPORT

> **Status:** IMPLEMENT COMPLETE · **Commit/Push:** NIE  
> **Date:** 2026-07-26  
> **RCA:** [`WGDOM-SIDEBAR-REGRESSION-02-RCA.md`](./WGDOM-SIDEBAR-REGRESSION-02-RCA.md)

---

## 1. Summary

Naprawiono poziomy scrollbar Sidebara: tooltip `NavItemWithHint` nie wchodzi już do scrollable overflow ( `display:none` + pozycja w obrębie itemu ).

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/app/app-ui.tsx` | **tylko** `NavItemWithHint` |

**Nietknięte:** `AdminSidebar` · Topbar · tokens · WgButton · LabelWithHint · layout.

---

## 3. Root Cause Verification

| Twierdzenie RCA | Potwierdzenie po fixie |
|-----------------|------------------------|
| Sprawca = `[role=tooltip]` z `left-[calc(100%+6px)]` + `w-max` + opacity/invisible | Usunięte z `NavItemWithHint` |
| `opacity/visibility` liczą się do `scrollWidth` | Zastąpione `hidden` / `group-hover:block` (+ `group-focus-within:block`) |
| Side placement powiększa overflow | Zastąpione `left-0 right-0 top-full` |

---

## 4. Before / after `scrollWidth`

| Środowisko | `.admin-sidebar-scroll` |
|------------|-------------------------|
| **BEFORE (prod `d856dc8`)** | `clientWidth=239` · `scrollWidth=473` · **delta=234** · horizontal scroll **TAK** |
| **AFTER (local preview + fix)** idle | `clientWidth === scrollWidth` · **delta=0** |
| **AFTER** hover (tooltip `display:block`) | `clientWidth === scrollWidth` · **delta=0** · tip nie wystaje poza scrollport |

---

## 5. Potwierdzenie braku poziomego scrollbara

- Idle: **PASS** (`equal: true`)
- Hover first nav item: **PASS** (`equal: true`, `tipPastScroll` ≤ 0)
- Brak `overflow-x: hidden` w fixie

---

## 6. Gates

| Gate | Wynik |
|------|--------|
| Build | **PASS** |
| Typecheck | **PASS*** (tylko pre-existing TS5101 `baseUrl`) |
| Login smoke | **PASS** 11/0 (`test-admin-login-shell-p0a.mjs`) |
| Mobile audit | **PASS** 36/0 |

---

## 7. Zachowane / świadomie zmienione UX

| | |
|--|--|
| Hover show | **TAK** (`group-hover:block`) |
| Keyboard | **TAK** (`group-focus-within:block`) — ulepszenie vs tylko hover |
| `role="tooltip"` | **TAK** |
| Paint (bg/border/blur/shadow/type) | **TAK** |
| Fade/delay animation | **NIE** — niemożliwe z `display:none` bez JS; zaakceptowane DF „jeżeli możliwe” |

---

**OWNER:** gotowe do REVIEW / GO COMMIT.  
**Nie wykonano commit ani push.**
