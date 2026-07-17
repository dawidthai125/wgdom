# THEME-01 — Design Freeze v1.1

> **Status:** **APPROVED** · **THEME-01B CLOSED** · **THEME-01C CLOSED** (2.65.30) · **#THEME-020** satisfied  
> **Klasa:** FEATURE UI · #CORE-014  
> **Baseline prod (pre-theme):** 2.65.28 · `d896852`

## Scope v1

- Dark ↔ Light toggle (System v1.1)
- `next-themes` + `wg-theme` localStorage
- Zero Protected Core diff
- Dark default = prod parity

## Principles

#THEME-001 … #THEME-019 — Architecture Review 2026-07-14.

### #THEME-020 — Atomic CSS model migration (Owner 2026-07-15)

Migracja do modelu standardowego shadcn/next-themes:

```text
:root  = Light palette
.dark  = Production Dark (tokeny prod 2.65.28 — przeniesione z :root)
```

**Obowiązkowo atomowo** w **jednym release THEME-01C** (jeden spójny bundle + jeden deploy).

**ZABRONIONE** po release THEME-01C (stan końcowy epic slice C):

| Stan | Dozwolone? |
|------|------------|
| `:root` = Dark **oraz** `.dark` = Dark (duplikat) | ❌ |
| `.light` = Light jako docelowy selector | ❌ |
| `:root` = Dark bez migracji (model 01B) | ❌ po closeout 01C |

**Tymczasowe aliasy** (np. `.light`, `value={{ dark: "", light: "light" }}`, FOUC dla `.light`):

- dozwolone **wyłącznie wewnątrz trwającego release THEME-01C**
- **muszą zostać usunięte** przed zamknięciem THEME-01C (ten sam PR / ten sam deploy — nie „follow-up”)

**Gate closeout THEME-01C:**

1. `theme.css` — dokładnie jeden dark block (`.dark` = prod palette); `:root` = light only  
2. `theme-engine.ts` — `value={{ light: "", dark: "dark" }}` (standard next-themes)  
3. `index.html` FOUC — `class="dark"` gdy `wg-theme` absent lub `dark`; brak `.light`  
4. Brak selektora `.light` w warstwie motywu (grep theme paths PASS)  
5. Dark parity token gate vs prod 2.65.28  
6. Smoke `test-theme-01c-atomic-migration.mjs`

## Stan przejściowy THEME-01B (do startu 01C)

THEME-01B **świadomie** zostawił model mostowy (dark parity bez migracji CSS):

```text
theme=dark  → brak klasy  → :root (prod dark)   ← USUNĄĆ w 01C
theme=light → .light       ← USUNĄĆ w 01C
```

Ten stan jest **dopuszczalny tylko między 01B a atomowym 01C**. Nie jest modelem docelowym.

## Docelowy stan po THEME-01C

```text
theme=dark  → class="dark"  → .dark tokens (= prod)
theme=light → brak klasy    → :root tokens (= light)
defaultTheme="dark"
enableSystem=false (v1)
```

## Phases

| Phase | Status |
|-------|--------|
| THEME-01A Audit + Review + DF | CLOSED |
| **THEME-01B Foundation** | **CLOSED** · 2.65.29 · stan mostowy |
| **THEME-01C** Shell + token migration + UI | BLOCKED — Owner GO · **#THEME-020 atomic** |
| THEME-01D–H | PLANNED |

## SSOT

- `src/app/theme/theme-engine.ts`
- `src/app/theme/WgdomThemeProvider.tsx`
- `src/styles/theme.css` (migracja atomowa w 01C)
- `src/main.tsx` (Provider mount)
- `index.html` (FOUC inline script — aktualizacja w 01C)
