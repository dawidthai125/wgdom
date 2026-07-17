# THEME-01B — Foundation Closeout

> **Status:** **CLOSED**  
> **Wersja:** 2.65.29  
> **Data:** 2026-07-15  
> **Klasa:** FEATURE UI · #CORE-014 FEATURE PASS

---

## 1. Cel

Fundament obsługi motywów bez zmiany wyglądu produkcji. Dark = domyślny, pixel parity względem 2.65.28.

## 2. Dostarczone artefakty

| Plik | Rola |
|------|------|
| `src/app/theme/theme-engine.ts` | SSOT — klucz `wg-theme`, mapa klas, FOUC helper |
| `src/app/theme/WgdomThemeProvider.tsx` | `next-themes` Provider |
| `src/main.tsx` | Mount Provider (AppUpdateBanner + router + Analytics) |
| `index.html` | Blocking FOUC script |
| `src/app/components/ui/sonner.tsx` | Default `dark` zamiast `system` (prep na wrapper) |
| `scripts/test-theme-01b-foundation.mjs` | Smoke statyczny |

## 3. Decyzja dark parity

Produkcja używa tokenów **`:root`** (ciemny W&G). Klasa **`.dark`** w `theme.css` ma **inny** zestaw oklch — dodanie jej przez next-themes złamałoby parity.

**Rozwiązanie THEME-01B:**

```text
theme=dark  → brak klasy na <html>  → :root (prod)
theme=light → class="light"         → palette w THEME-01C+
```

## 4. Protected Core

| System | Diff |
|--------|------|
| CloudLoader | ❌ |
| cloud-sync | ❌ |
| Payroll merge/runtime | ❌ |
| App.tsx | ❌ |
| IndexedDB / StorageManager | ❌ |
| Supabase Edge | ❌ |

## 5. Testy

| Test | Wynik |
|------|-------|
| `npm run build` | (raport release) |
| `npx vite-node scripts/test-theme-01b-foundation.mjs` | (raport release) |
| Payroll gate B | (raport release) |

## 6. Następny krok

**THEME-01C** — atomowa migracja CSS (#THEME-020) + Shell + Login + UI — **BLOCKED** do Owner GO.

Stan mostowy z §3 **musi** zniknąć w tym samym release co light palette — bez wyjątków.

---

## 6a. #THEME-020 — obowiązek dla 01C

Jeden release, zero pozostawionych aliasów:

- `:root` → Light  
- `.dark` → Production Dark (obecny `:root` 2.65.28)  
- usunąć `.light`, hack `dark: ""`, FOUC dla `.light`  
- **Zakaz** końcowego stanu `:root` Dark + `.dark` Dark

---

## 7. Owner Verification Checklist

- [ ] Cold load (brak `wg-theme` w LS) — wygląd identyczny jak prod dark
- [ ] F5 po zalogowaniu admin — brak białego flasha (FOUC)
- [ ] DevTools → Application → brak nowych kluczy KV poza ewentualnym `wg-theme`
- [ ] Lista Płac — tabela i defer bez regresji wizualnej
- [ ] Roboty / Przetargi — brak zmiany kolorów vs prod
- [ ] `document.documentElement.className` — **puste** przy dark (brak `dark`)

---

## 8. Prompt THEME-01C (Owner GO)

```text
WGDOM THEME-01C — Atomic token migration + Shell + UI (#THEME-020)

Kontekst: THEME-01B most (dark=:root, light=.light) — USUNĄĆ w tym release.

Atomowy scope (jeden deploy):
1. theme.css — :root=Light NEW · .dark=prod :root tokens · DELETE .light · DELETE stary oklch .dark block
2. theme-engine + FOUC + WgdomThemeProvider — standard: dark→"dark", light→""
3. Settings toggle · sonner w App.tsx · shell/login pass
4. Grep: zero ".light" · zero duplicate dark tokens on :root+.dark
5. Gate: dark parity + build + payroll B + theme smoke

ZAKAZ merge 01C bez usunięcia aliasów mostowych.
```
