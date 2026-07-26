# WGDOM-SIDEBAR-REGRESSION-02 — RCA

> **Status:** RCA COMPLETE · **Implement:** NIE · **Commit/Push:** NIE  
> **Date:** 2026-07-26  
> **Prod tip:** `d856dc8` / feature shell `5888a76` · UI **2.65.46**  
> **Objaw:** poziomy pasek przewijania na dole lewego Sidebara

---

## 1. Root Cause

**Tooltip `NavItemWithHint` w `src/app/app-ui.tsx` (wersja na produkcji)** jest pozycjonowany **na prawo od itemu** (`left-[calc(100%+6px)]`) z `w-max max-w-[240px]` i ukrywany przez **`opacity-0` + `visibility: hidden`** (nadal `display: block`).

W kontenerze `.admin-sidebar-scroll` (`overflow-y-auto`) takie absolutnie pozycjonowane dzieci **nadal wchodzą do scrollable overflow** → `scrollWidth > clientWidth` → **horizontal scrollbar**, nawet gdy tooltip jest „niewidoczny”.

To **nie** jest regresja z `WG_FOCUS_RING` / A11Y-01 / Topbar. To **release gap**: fix tooltipa został lokalnie w WT, ale **nie wszedł** w thin SHELL-RELEASE-01 (tylko 3 pliki).

---

## 2. Dokładny element (DevTools / prod measure)

| Pole | Wartość |
|------|---------|
| **Pierwszy sprawca** | `div[role="tooltip"]` wewnątrz `NavItemWithHint` |
| **Tekst (przykład)** | „Podsumowanie tygodnia, alerty…” (hint Pulpit) |
| **Klasy (prod)** | `absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 … w-max max-w-[240px] … opacity-0 invisible …` |
| **Kontener** | `.admin-sidebar-scroll` |
| **Prod measure** | `clientWidth: 239` · `scrollWidth: 473` · **delta ≈ 234px** |
| **Tooltip rect** | `right ≈ 473` vs scrollport `right ≈ 239` · **pastBy ≈ 234px** |
| **Stan wizualny** | `opacity: 0` · `visibility: hidden` · `display: block` · `position: absolute` · `left: 221px` |

**Nie** winne (prod/local measure przy obecnym Sidebar UI-01C):

- `groupNavItems` / section headers (`truncate`)
- badge / rail (`before:` absolute w obrębie buttona)
- label `truncate` + `min-w-0` na buttonie (w `5888a76`)
- icon `shrink-0`
- `WG_FOCUS_RING` / A11Y-01 (`focus-visible` — nie wpływa na layout)
- `AdminTopbar`

---

## 3. Porównanie commitów

| Commit | `AdminSidebar` | `NavItemWithHint` (`app-ui.tsx`) | Horizontal scroll |
|--------|----------------|----------------------------------|-------------------|
| **`cf76d28`** (Roboty) | stary flat nav + `NavItemWithHint` | tooltip **side** `left-[calc(100%+6px)]` + opacity/invisible | **TAK** (ten sam mechanizm tooltipa) |
| **`5888a76`** (App Shell) | UI-01C: sekcje, rail, `min-w-0`, `WG_FOCUS_RING` | **bez zmian** — nadal side tooltip | **TAK** — widoczniejsze po polishu / „ponownie” po lokalnym fixie |
| **Lokalne WT** | = `5888a76` | **naprawione** (nie wypuszczone): `hidden` + `left-0 right-0 top-full` + `min-w-0 w-full` | **NIE** (zweryfikowane lokalnie: delta 0) |

**Dlaczego „po App Shell”:**  

1. Shell wypchnął nowy Sidebar (`5888a76`), ale **nie** `app-ui.tsx`.  
2. Lokalnie podczas UI-01C bugfixu scrollbar był już załatany w `app-ui` (komentarz w WT: *„visibility/opacity nadal liczą się do scrollWidth”*).  
3. Po deployu Owner widzi prod **bez** tego fixa → scrollbar „wraca” względem localhost WT.

---

## 4. Checklist §1–§4 (wynik)

| Check | Wynik |
|-------|--------|
| Element z `scrollWidth > clientWidth` | **Tak** — `.admin-sidebar-scroll` przez tooltips |
| `min-width` / `w-fit` / `whitespace-nowrap` na nav button | Nie jako przyczyna (buttony delta 0) |
| `width > parent` | Tooltip `w-max` wystaje **poza** parent |
| `groupNavItems` / badge / rail / label / icon | Nie powodują overflow |
| `AdminSidebar` 01C | Zawierał już mitigacje `min-w-0`; **niewystarczające** wobec side tooltip |
| `AdminTopbar` / `WG_FOCUS_RING` / tokeny | **Nie** wprowadziły regresji layoutu sidebara |

---

## 5. Dlaczego overflow wrócił

1. Side tooltip jest w DOM jako `display:block` + absolute poza prawą krawędzią itemu.  
2. Spec/CSS: absoluty w scroll containerze rozszerzają **scrollable overflow** mimo `visibility:hidden` / `opacity:0`.  
3. `overflow-y-auto` na `.admin-sidebar-scroll` ujawnia to jako **poziomy** scrollbar.  
4. Thin release App Shell **nie** dołączył lokalnego fixa `app-ui.tsx`.

**Zakaz maskowania:** `overflow-x: hidden` na scroll/aside — **nie** usuwa przyczyny (tooltip nadal „szerszy” w modelu overflow; tylko chowa pasek).

---

## 6. Minimalny fix (NIE zaimplementowany w tym etapie)

**Plik:** `src/app/app-ui.tsx` → `NavItemWithHint` tylko.

1. Wrapper: `relative min-w-0 w-full` (już w lokalnym WT).  
2. Tooltip: **nie** `left-[calc(100%+6px)]` + `w-max`.  
3. Ukrywanie: **`hidden` / `group-hover:block`** zamiast `opacity-0 invisible` (żeby **nie** liczyć się do `scrollWidth` gdy ukryty).  
4. Pozycja: w obrębie szerokości itemu, np. `left-0 right-0 top-full` (jak lokalny WT) **lub** portal poza sidebar tree.

Referencja już w WT (nie na tipie):

```tsx
<div className="relative min-w-0 w-full group/navhint">
  {children}
  <div
    role="tooltip"
    className="absolute left-0 right-0 top-full mt-1 z-[100] hidden group-hover/navhint:block …"
  >
    {hint}
  </div>
</div>
```

**OUT fixu:** Dashboard, Topbar, tokens, `overflow-x-hidden`, zmiana szerokości `w-60`.

---

## 7. Evidence

```text
PROD https://www.wgdom.fun @ d856dc8
.admin-sidebar-scroll: clientWidth=239 scrollWidth=473 delta=234
firstCause: [role=tooltip] left=calc(100%+6px) pastBy=234 opacity=0 visibility=hidden
```

```text
LOCAL preview (WT z fixem app-ui): scroll delta=0 · offenders=[]
```

---

**OWNER:** RCA zamknięte. Następny krok = cienki fix `app-ui.tsx` (Owner GO IMPLEMENT) — **bez** `overflow-x: hidden`.
