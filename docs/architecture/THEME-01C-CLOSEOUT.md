# THEME-01C — Atomic Migration Closeout

> **Status:** **CLOSED** (IMPLEMENT complete · Owner verification pending)  
> **Wersja:** **2.65.30**  
> **Baseline dark parity:** prod **2.65.28** · `d896852`  
> **Slice:** THEME-01C · **#THEME-020** satisfied  
> **Następny:** **THEME-01D BLOCKED** — czeka na Owner GO

---

## 1. Architecture Migration Report

### Cel

Atomowa migracja z modelu mostowego THEME-01B do standardu **next-themes / Tailwind / shadcn**:

| Warstwa | Przed (01B) | Po (01C) |
|---------|-------------|----------|
| CSS `:root` | Production Dark | **Light Theme** |
| CSS `.dark` | Stary oklch (nieprod) | **Production Dark** (ex-`:root` 2.65.28) |
| `theme=dark` | brak klasy → `:root` | **`class="dark"`** |
| `theme=light` | `class="light"` | **brak klasy** → `:root` |
| next-themes `value` | `{ dark: "", light: "light" }` | **usunięte** (domyślny standard) |
| FOUC | `.light` gdy light | **`.dark`** gdy absent lub dark |

### Pliki zmienione (bundle THEME-01C)

| Plik | Zmiana |
|------|--------|
| `src/styles/theme.css` | `:root` light · `.dark` prod · usunięty stary oklch `.dark` |
| `src/app/theme/theme-engine.ts` | Standard SSOT · FOUC `.dark` · parity constants |
| `src/app/theme/WgdomThemeProvider.tsx` | Standard `ThemeProvider` bez `value` hack |
| `index.html` | FOUC script `.dark` |
| `src/app/AdminSettingsModal.tsx` | Przełącznik Ciemny/Jasny (`useTheme`) |
| `src/app/App.tsx` | `Toaster` z `@/app/components/ui/sonner` |
| `src/styles/mobile.css` | Scrollbar sidebar theme-aware |
| `scripts/test-theme-01c-atomic-migration.mjs` | Smoke + token parity |
| `src/app/changelog-data.ts` | 2.65.30 |
| `docs/ARCHITECTURE.md` §2.1 | Model docelowy |

### Nietknięte (Protected Core)

CloudLoader · cloud-sync · Payroll merge/runtime · IndexedDB · Supabase Edge · Jobs merge · StorageManager · LOCALSTORAGE-ARCH-02

### Checklist architektoniczna (#THEME-020)

| Gate | Status |
|------|--------|
| `:root` = Light | ✅ `#f4f5f7` |
| `.dark` = Production Dark | ✅ `#111827` + pełna paleta prod |
| brak `.light` w theme layer | ✅ grep theme paths PASS |
| brak aliasów 01B | ✅ brak `value={{ dark: ""…` |
| chart.tsx standard | ✅ `{ light: "", dark: ".dark" }` |
| next-themes standard | ✅ `attribute="class"` |
| Tailwind `@custom-variant dark` | ✅ bez zmian |
| shadcn tokeny | ✅ semantic vars w obu blokach |

---

## 2. Dark Parity Report

**Gate:** Domyślny motyw **dark** musi być pixel-perfect względem prod **2.65.28**.

### Metoda weryfikacji

1. **Token parity (automated):** smoke porównuje `.dark` z prod tokenami:
   - `--background: #111827`
   - `--primary: #C0392B`
   - `--card: #1a2332`
   - `--foreground: #f0f2f5`
2. **Mechanizm:** `theme=dark` (default) → `html.dark` → `.dark { … }` = identyczne wartości co ex-`:root` prod.
3. **FOUC:** pierwszy paint z `class="dark"` gdy brak pref lub `wg-theme=dark`.

### Werdykt

| Test | Wynik |
|------|-------|
| Token smoke (29 asserts) | **PASS** |
| Domyślny dark bez regresji CSS | **PASS** (logiczna równość tokenów) |
| Owner visual spot-check prod | **PENDING** (po deploy) |

**Uwaga:** Light theme w `:root` nie wpływa na dark — dark aktywuje się wyłącznie przez `.dark`.

---

## 3. Release Report

```text
RELEASE MODE: FAST RELEASE
Jeden spójny bundle THEME-01C · <15 plików · build+smoke PASS · bez Protected Core.
```

| Sekcja | Wynik |
|--------|-------|
| BUILD | **PASS** (`npm run build`) |
| THEME smoke | **PASS** (`test-theme-01c-atomic-migration.mjs` · 29/29) |
| Payroll Gate B | **PASS** (`npm run test:infra -- --gate B --scope payroll`) |
| CloudLoader / sync | **NIE DOTYKANE** |
| CHANGELOG | **2.65.30** |

### Pliki do `git add` (bundle release)

```text
index.html
src/styles/theme.css
src/styles/mobile.css
src/app/theme/theme-engine.ts
src/app/theme/WgdomThemeProvider.tsx
src/app/AdminSettingsModal.tsx
src/app/App.tsx
src/app/changelog-data.ts
scripts/test-theme-01c-atomic-migration.mjs
CHANGELOG.md
docs/ARCHITECTURE.md
docs/architecture/THEME-01C-CLOSEOUT.md
docs/architecture/THEME-01-DESIGN-FREEZE.md
```

**Uwaga:** `src/app/theme/` był **untracked** — wymaga jawnego `git add` przed push (P0 ENOENT).

### RELEASE READINESS

**RELEASE NOT READY** do push — pliki implementacji **untracked / unstaged**. Commit na polecenie Ownera.

---

## 4. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | `:root` Light · `.dark` Production Dark | ✅ |
| 2 | Usunięty most 01B (`.light`, value hack) | ✅ |
| 3 | Standard next-themes / Tailwind / shadcn / chart | ✅ |
| 4 | Przełącznik motywu Super Admin | ✅ |
| 5 | Toaster theme-aware (`ui/sonner`) | ✅ |
| 6 | Dark parity token gate | ✅ |
| 7 | build PASS | ✅ |
| 8 | Payroll Gate B PASS | ✅ |
| 9 | Theme smoke PASS | ✅ |
| 10 | ARCHITECTURE §2.1 + closeout docs | ✅ |
| 11 | CHANGELOG 2.65.30 | ✅ |
| 12 | Commit + push + prod verify | ⏳ Owner |
| 13 | THEME-01D **nie** rozpoczęty | ✅ |

---

## 5. Owner Verification Checklist

Po deploy **2.65.30** na https://www.wgdom.fun:

- [ ] `curl -s https://www.wgdom.fun/version.json` → `"version": "2.65.30"`
- [ ] Hard refresh — **domyślnie ciemny** wygląd identyczny jak przed migracją (Pulpit, Roboty, Lista Płac)
- [ ] ⚙ Super Admin → **Wygląd aplikacji** → **Jasny** — tło jaśniejsze, czytelność OK
- [ ] Przełącz **Ciemny** — powrót do prod dark
- [ ] Odśwież stronę — motyw zapamiętany (`localStorage` `wg-theme`)
- [ ] Toast (np. zapis) — kolory zgodne z motywem
- [ ] Mobile sidebar scroll — widoczny thumb w obu motywach
- [ ] **Nie** testować regresji Payroll/sync — poza zakresem wizualnym

---

## 6. CHANGELOG

Zob. `src/app/changelog-data.ts` **2.65.30** · skrót `CHANGELOG.md`.

---

## 7. Prompt dla THEME-01D (BLOCKED — nie startować)

```text
# WGDOM — THEME-01D — Owner GO required

Kontekst: THEME-01C CLOSED · :root=Light · .dark=Production Dark · 2.65.30

CEL: Light/Dark polish UI w widokach operacyjnych (CSS/tokens only):
- DashboardView (Pulpit)
- PayrollView (Lista Płac — tabela, KPI, bez logiki merge)

ZASADY:
- #CORE-013/#CORE-014 — ZERO Protected Core
- NIE dotykać cloud-sync, CloudLoader, Payroll merge/runtime
- REUSE semantic tokens (bg-background, text-foreground, border-border)
- Zamienić hardcoded hex/rgba w tych widokach na tokeny gdzie regresja light
- Dark parity gate — dark musi zostać identyczny z 2.65.28
- Bez nowych KV · pref motywu nadal localStorage wg-theme

TESTY: build · test-theme-01c-atomic-migration.mjs · Gate B payroll

OUTPUT: THEME-01D-CLOSEOUT · Owner checklist · CHANGELOG patch
```

---

## Werdykt slice

**THEME-01C IMPLEMENTATION COMPLETE** · commit/push **na polecenie Ownera** · **THEME-01D BLOCKED**.
