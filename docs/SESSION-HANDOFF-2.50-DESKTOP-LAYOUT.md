# SESSION HANDOFF — Seria 2.50.x (Roboty MID-B → Mobile → CI → Desktop Layout)

> **Status:** **CLOSED** (2.50.00 → 2.50.10 → CI P0 → **2.50.20**)  
> **Prod baseline:** **`5a664c2`** · **v2.50.20** · deploy **`4981097719`**  
> **Data:** 2026-06-08

---

## 1. Szybki kontekst dla nowej sesji

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.50.00** | `860e8d9` | Roboty 2.0 MID-B — Lista/Kolejki, filtr lidera |
| **2.50.10** | `4427b7a` | Mobile Fix Pack — toolbar compact, touch 44px, kolejki bez sticky |
| **CI P0** | `74a013d` | Mobile Test Infrastructure — audit + Playwright CI zielone |
| **2.50.20** | **`5a664c2`** | **Desktop Layout Fix** — eliminacja podwójnego scrollbara admin |

**Produkcja:** https://www.wgdom.fun · https://www.wgdom.online  
**Źródło wersji UI:** `CHANGELOG[0].version` w `src/app/changelog-data.ts`

**Nie zmieniaj bez polecenia:** logika sync/KV, billing 20.5A.x, payroll carry, MID-B kolejki, mobile shell `<768px`.

---

## 2. Desktop Layout Fix 2.50.20 — problem i rozwiązanie

### Problem (RCA)

Na laptopie/desktopie (≥768px) admin widział **dwa pionowe scrollbary**:

1. **Dokument** (`html`/`body`) — wcześniej `@media (min-width: 768px)` ustawiał `overflow-y: auto`
2. **Widok** — każdy panel admina ma własny `overflow-y-auto` / `overflow-auto` (Pulpit, Roboty, Lista płac, Media…)

Efekt: scroll „na całym oknie” + scroll wewnątrz listy/tabeli. Poziomy scroll całego okna przy szerokich tabelach (Payroll) przez brak `min-w-0` w łańcuchu flex.

### Fix A (wdrożony)

| Warstwa | Zmiana |
|---------|--------|
| `index.html` | md+: `html, body, #root` → `overflow: hidden`, wysokość `var(--app-height)` |
| `src/styles/mobile.css` | `.admin-app-shell` md+: `padding-top: var(--app-viewport-offset-top)`, `box-sizing: border-box`, `min-height: 0` |
| `AdminViewRouter.tsx` | `min-w-0` na głównym flex container |
| `DashboardView.tsx` | `min-w-0` na scroll container |
| `MediaView.tsx` | `min-w-0` na root flex |

**Mobile (`<768px`):** bez zmian — bazowe `overflow: hidden` w `index.html` od dawna.

### Model scrollu (architektura)

```text
html/body (#root)     overflow: hidden     ← dokument NIE scrolluje (2.50.20)
└─ .admin-app-shell   height: var(--app-height), pt: offset topbar
   └─ AdminViewRouter flex min-h-0 min-w-0 overflow-hidden
      └─ [aktywny widok]  overflow-y-auto / overflow-auto  ← JEDYNY scroll pionowy
         ├─ DashboardView   → overflow-y-auto na głównym panelu
         ├─ JobsView       → lista/kolejki — wewnętrzny scroll
         ├─ PayrollView    → overflow-x-auto TYLKO w tabeli
         └─ MediaView      → min-w-0, bez wypychania poziomego
```

Widoki nieaktywne są **odmontowywane** (`AdminViewRouter`) — scroll resetuje się przy zmianie zakładki.

**Powiązane:** `src/lib/app-viewport.ts` — desktop synchronizuje `--app-height` z `visualViewport` (Chrome, pasek zakładek).

---

## 3. Pliki kluczowe (2.50.20)

| Plik | Rola |
|------|------|
| `index.html` | CSS shell: mobile + desktop overflow |
| `src/styles/mobile.css` | `.admin-app-shell`, safe-area, touch |
| `src/app/admin/AdminViewRouter.tsx` | Router widoków admina, `min-w-0` |
| `src/app/DashboardView.tsx` | Pulpit — internal scroll |
| `src/app/MediaView.tsx` | Media — containment poziomy |
| `e2e/desktop-layout.spec.ts` | 1366×768, 1280×720 — brak scrollu dokumentu |
| `e2e/desktop-smoke.spec.ts` | Desktop smoke + `overflow: hidden` |
| `scripts/smoke-test-desktop-layout-2.50.20.mjs` | T1–T7 static (13 checków) |
| `playwright.config.ts` | `desktop-(smoke\|layout).spec.ts` |

---

## 4. Testy i regression gate

### Smoke statyczny

```bash
npx vite-node scripts/smoke-test-desktop-layout-2.50.20.mjs   # 13/13
npm run audit:mobile                                            # 36✓
```

### Playwright (prod domyślnie)

```bash
npm run test:mobile    # 39 testów: 11 desktop + 28 mobile
```

**Uwaga:** Przed deployem 2.50.20 testy `desktop-layout` na prod **FAIL** (stary `overflow-y: auto`). Po deploy — **39/39 PASS**.

Lokalnie przed release: `npm run build` → `npx vite preview` → `PW_BASE_URL=http://127.0.0.1:4173 npm run test:mobile`.

### Regression gate (post-deploy 2.50.20)

| Skrypt | Wynik |
|--------|-------|
| `smoke-test-mobile-fix-pack-2.50.1.mjs` | 14/14 |
| `smoke-test-jobs-2.0-midb.mjs` | 21/21 |
| `smoke-test-inspector-billing-notes-20.5a4.mjs` | 28/28 |
| `smoke-test-inspector-billing-20.5a3a.mjs` | 28/28 |
| `smoke-test-inspector-20.2a.mjs` | ALL PASS |

---

## 5. Seria 2.50.10 + CI (kontekst)

### Mobile Fix Pack (`4427b7a`, v2.50.10)

- Kompaktowy toolbar KPI na mobile (`max-md:`)
- Touch target 44px — Lista/Kolejki, fazy, Filtry
- Kolejki: **bez sticky** nagłówków sekcji (Lista nadal ma sticky miesiąca)
- Smoke: `smoke-test-mobile-fix-pack-2.50.1.mjs`

### CI / Mobile Test Infrastructure P0 (`74a013d`)

- `scripts/mobile-audit.mjs` — 100dvh, PTR, overscroll
- `e2e/chunk-helpers.ts` — InspectorPanel alias + crawl chunków
- GitHub Actions mobile-audit + mobile-e2e **PASS**

---

## 6. Release 2.50.20 — podsumowanie deploy

| Pole | Wartość |
|------|---------|
| Commit | `5a664c28886f245703a6db19b374b39af0c5ab6f` |
| Message | `fix(layout): eliminate desktop double scrollbars in admin views (2.50.20)` |
| Deploy ID | `4981097719` |
| Pliki | 11 (+192 / −21 linii) |

**Weryfikacja prod:** HTTP 200 · bundle `2.50.20` · `index.html` komentarz `2.50.20` + `overflow: hidden`.

---

## 7. Następne kroki (backlog — nie rozpoczynaj bez polecenia)

- Ręczny smoke zalogowanego admina (Pulpit/Roboty/Payroll po loginie) — opcjonalnie właściciel
- 20.5A.5+ (zdjęcia do uwag billing)
- 20.3B+ (pełny CC polonizacja)
- Roboty 2.0 FULL — tylko na polecenie

---

## 8. Czytaj też

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) § 6.2 (shell admin), § 14 (PWA/e2e)
- [`CURRENT-TASK.md`](../CURRENT-TASK.md) — baseline prod
- [`AGENTS.md`](../AGENTS.md) — START HERE
