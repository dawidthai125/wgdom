# W&G DOM — handoff Performance 2.x (2026-06-06)

> **★ Seria CLOSED** — prod `35614f0` · tag `v2.45.38-perf-2.4a` · https://www.wgdom.fun  
> Hasło: **„kontynuuj WGDOM”** → [`CURRENT-TASK.md`](../CURRENT-TASK.md) i [`.cursor/rules/wgdom-stan-projektu.mdc`](../.cursor/rules/wgdom-stan-projektu.mdc).

**Data zamknięcia serii:** 2026-06-06  
**Prod `origin/main` HEAD:** `35614f0` — Performance **2.4A** · tag `v2.45.38-perf-2.4a`  
**Poprzedni release Performance:** `c922b44` — Performance **2.3C** · tag `v2.45.37-perf-2.3c`

**Powiązane dokumenty:**

- Performance 1.x (CLOSED): [`SESSION-HANDOFF-PERFORMANCE-2026-06.md`](SESSION-HANDOFF-PERFORMANCE-2026-06.md)
- Incydent Roboty: [`SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md)

---

## Performance Series Final Results

### Baseline (2.2C — `49129f1`)

| Metryka | Wartość |
|---------|---------|
| Startup JS | **2417 KB** |
| Startup requests | **6** |

### Final (2.4A — `35614f0`)

| Metryka | Wartość |
|---------|---------|
| Startup JS | **1119 KB** |
| Startup requests | **4** |

### Delta (2.2C → 2.4A)

| Metryka | Zmiana |
|---------|--------|
| Startup JS | **−1298 KB (−53.7%)** |
| Startup requests | **−2** |

### Release tagi (Performance 2.x, prod)

```text
v2.45.36-perf-2.2c
v2.45.37-perf-2.3c
v2.45.38-perf-2.4a
```

---

## 1. Chronologia Performance 2.x

| Sprint | Status | Commit / tag | Skrót |
|--------|--------|--------------|-------|
| **2.1A/B/C** | **CLOSED** | `cb21391`… / `v2.45.35-perf-2.1` | dedup CC, Provider scope, pipeline cache |
| **2.2C** | **CLOSED** | `49129f1` / `v2.45.36-perf-2.2c` | usunięto `panel-*` z `manualChunks` → lazy panele |
| **2.3A** | **CLOSED** | READ ONLY | RCA: `shared-inspector` hub ~1.1 MB przy starcie |
| **2.3C** | **CLOSED** | `c922b44` / `v2.45.37-perf-2.3c` | lazy parser SWZ; parser stack poza startem |
| **2.4A** | **CLOSED** | `35614f0` / `v2.45.38-perf-2.4a` | usunięto `shared-inspector`; martwe importy `App.tsx` |

**Werdykt serii:** **Performance 2.x CLOSED** — brak otwartych sprintów.

---

## 2. Performance 2.3C (`c922b44`)

- lazy load tender document parser (`tenders-bzp-doc-parse`)
- parser stack (pdfjs, xlsx, doc-parse) **usunięty ze startu**
- synthetic runtime verification PASS (vite-node + browser pdfjs)
- prod smoke: Login / Dashboard / Przetargi PASS
- startup JS: **1244 KB** (vs 2417 KB przy 2.2C)
- release: **`v2.45.37-perf-2.3c`**

---

## 3. Performance 2.4A (`35614f0`)

### Zmiany (wyłącznie bundling / dead imports)

| Plik | Zmiana |
|------|--------|
| `vite.config.ts` | Usunięto regułę `shared-inspector` z `manualChunks` |
| `src/app/App.tsx` | Usunięto martwe importy (~120 linii); brak zmian UI/funkcjonalnych |

### Prod bundle (wgdom.fun)

| Metryka | 2.3C | 2.4A |
|---------|------|------|
| Entry | `index-BQkWgR3B.js` 516 KB | `index-CYKnqK4C.js` 670 KB |
| Startup JS | 1244 KB | **1119 KB** |
| Startup requests | 5 | **4** |
| `shared-inspector` preload | TAK (340 KB) | **BRAK** |
| `pdfjs` preload | BRAK | **BRAK** |

### Weryfikacja prod

- deployment: `dpl_3PLyZnEqvbJvDTzEys471nw43Jh6` · Ready
- smoke: Login / Dashboard / Przetargi / Inspektor / Console — **PASS**
- release: **`v2.45.38-perf-2.4a`**

---

## 4. Stan prod — `manualChunks` (po 2.4A)

```text
app-core      — supabase.ts + cloud-sync.ts
pdfjs         — pdfjs / worker (lazy, nie preload)
pdfmake       — pdfmake / pdfkit / fontkit
ui-vendor     — @radix-ui
panel-guide   — GuideView + changelog-data
shared-inspector — USUNIĘTE (2.4A)
panel-jobs|payroll|tenders|inspector* — USUNIĘTE (2.2C)
```

**`modulePreload.resolveDependencies`** — filtruje preload `panel-*` (legacy po 2.2A).

---

## 5. Pliki kluczowe

| Plik | Rola |
|------|------|
| `vite.config.ts` | `manualChunks`, `modulePreload.resolveDependencies` |
| `src/app/admin/AdminViewRouter.tsx` | `React.lazy` paneli admina |
| `src/app/App.tsx` | shell admina — oczyszczony (2.4A) |
| `docs/ARCHITECTURE.md` § 17.5 | bundling / wydajność |

---

## 6. Pułapki dla AI

1. **Seria Performance 2.x jest CLOSED** — nie rozpoczynaj nowych optymalizacji bez polecenia.
2. **Nie przywracaj** reguł `panel-jobs|payroll|tenders|inspector*` ani `shared-inspector` w `manualChunks`.
3. **Nie dodawaj** nowego wymuszonego chunka „shared-*” bez smoke build + graf chunków.
4. **Testy użytkownika** — głównie **Vercel**, nie localhost.
5. **Nie zmieniaj** sync/KV/LS bez polecenia i ARCHITECTURE § 11.

---

## 7. Szybki start (nowy agent)

```text
1. docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md  ← TEN PLIK (seria CLOSED)
2. CURRENT-TASK.md
3. docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md      ← 1.x CLOSED
4. docs/ARCHITECTURE.md § 17.5
```
