# W&G DOM — handoff: incydent Roboty (czarny ekran) + stan Roboty 2.x

> **★ CZYTAJ TO NA START** przy nowym agencie po długiej sesji RCA (czerwiec 2026).  
> Hasło Cursor: **„kontynuuj WGDOM”** → też [`CURRENT-TASK.md`](../CURRENT-TASK.md) i [`.cursor/rules/wgdom-stan-projektu.mdc`](../.cursor/rules/wgdom-stan-projektu.mdc).  
> **Transkrypt czatu (pełna historia):** agent-transcripts `1c53356b-b3ca-40ed-96c3-08aec5edc683` — nie czytaj od zera; ten plik jest skrótem.

**Ostatnia aktualizacja:** 2026-06-04 (po push `99e08c2`)

---

## 1. Stan produkcji (GitHub `main` / Vercel)

| | Wartość |
|---|---------|
| **HEAD `origin/main`** | `99e08c285d5d42698e906769a432746c26d44693` |
| **URL** | https://www.wgdom.fun |
| **Wersja UI w `changelog-data.ts`** | **2.45.33** (Roboty **2.1A** — **nie** zaktualizowano changelogu przy fixie incydentu) |

### Łańcuch commitów Roboty (od najnowszego)

| Commit | Opis | Pliki kluczowe |
|--------|------|----------------|
| **`99e08c2`** | **FIX incydent:** guard `normalizePhone9`, `(emp.name ?? "")`, `(d.phone ?? "")` w wyszukiwarce | `app-domain.ts`, `App.tsx` **tylko** |
| `0c4da46` | Guard `jobAddressKey` — brak `address`/`flatNumber` | `app-domain.ts` |
| `299d3f1` | **Roboty 2.1A** UX listy (prod layout) | `JobListPanelHeader.tsx`, `JobsView.tsx`, `JobListCard.tsx`, … |
| `5b612e4` | **Roboty 2.0 MIN** — KPI, chipy, `job-list-ops.ts` | `JobsView.tsx`, `job-list-ops.ts` |

**Push `99e08c2`:** wykonany na `origin/main` (2026-06-04). Vercel deploy automatyczny z `main`.

---

## 2. Incydent — czarny ekran przy wejściu w Roboty

### Objaw

- `TypeError: Cannot read properties of undefined (reading 'replace')`
- Chunk prod: `panel-jobs-*.js`
- Zakładka **Roboty** — biały/czarny ekran (crash w renderze React)

### Przyczyna (potwierdzona repro lokalnym)

**Plik:** `src/app/app-domain.ts`  
**Funkcja:** `normalizePhone9` — `phone.replace(...)` przy `phone === undefined`

**Łańcuch przy mount listy Roboty (2× na render):**

```text
JobsView mount
  → useMemo productionDirectory [JobsView ~578]
  → JobListPanelHeader render [~78]
      → filterProductionActiveDirectory(directory)
          → isProductionActiveDirectoryEmployee(emp)
              → emp.active && isProductionDirectoryEmployee(emp)
              → isTestDirectoryEmployee(emp)
                  → inferTestAccountHeuristic(emp)   // gdy testAccount nie true/false
                      → normalizePhone9(emp.phone)  // CRASH jeśli undefined
```

**Warunek danych:** rekord `kw-directory` z **`active: true`** (lub truthy) i **brak pola `phone`** (JSON z KV po `JSON.parse` → `undefined`).  
**Nie wystarczy:** `d1` w KV z `active: false` — short-circuit `emp.active &&` **nie** woła `normalizePhone9`.

### Fix wdrożony (`99e08c2`) — tylko kod, bez danych

```ts
// app-domain.ts
normalizePhone9(phone: string | null | undefined) {
  const d = String(phone ?? "").replace(/\D/g, "");
}
inferTestAccountHeuristic: (emp.name ?? "").trim()

// App.tsx — global search (nie mount Roboty, ale ten sam ryzyko)
(d.phone ?? "").includes(q)
```

**NIE zmieniano:** `cloud-sync.ts`, KV, localStorage, merge, struktury danych, `JobsView`, `JobListPanelHeader`, `job-list-ops.ts`.

### Werdykt fixu

- **Usuwa** zidentyfikowany crash mount listy Roboty (łańcuch `filterProductionActiveDirectory` → `normalizePhone9`).
- **Nie gwarantuje** braku innych crashy (chunk load, inne pola, szczegóły roboty).
- **`phone-normalize.ts`** (SMS) — **nie** w commicie `99e08c2`; osobna kopia funkcji — przy undefined w SMS warto ten sam guard **osobnym commitem** jeśli potrzeba.

### Audyt danych (read-only, bez zmian KV)

- **KV:** 12 jobs, 15 directory; rekordy bez `phone` możliwe; `bad-job-1` bez `address` (przechodzi walidację).
- **localStorage vs KV:** LS często **niepełny** (6 jobs vs 12 w KV) — merge przy bootstrap; **nie czyścić LS** bez polecenia.
- Skrypty diag (untracked, **nie commitować** bez polecenia): `scripts/audit-prod-jobs-directory-rca*.mjs`, `scripts/audit-localstorage-vs-kv*.mjs`, `scripts/verify-jobs-mount-crash.mjs`, `scripts/map-*.mjs`, itd.

---

## 3. Roboty 2.1B MIN — **NIE MA w repo**

### Plan (zaakceptowany, zaimplementowany w sesji, **bez commita**)

1. KPI jedna linia: `[5 W toku] [2 Odbiór] …`
2. Usunąć legendę z listy Roboty i z **Filtry ▼**
3. Legenda → Instrukcja / `GuideView`
4. Niższy nagłówek (`min-h-[40px]`, `text-xs`)
5. Wersja docelowa UI: **2.45.34**

### Pliki które **miały** być zmienione

- `JobListPanelHeader.tsx`, `JobsView.tsx`, `GuideView.tsx`
- `changelog-data.ts`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `CURRENT-TASK.md`

### Stan po push `99e08c2`

- **Working tree:** brak diffu tracked względem HEAD.
- **Kod = 2.1A (`299d3f1`)** + fix `99e08c2`: nadal duże KPI 2-wierszowe, `showJobLegend` + `JobListLegend` w **Filtry ▼**.
- **2.45.34** nie istnieje w `changelog-data.ts`.
- **Aby mieć 2.1B MIN:** implementacja **od zera** (lub odzysk z backupu — brak w `git stash` poza `rca-map`).

---

## 4. Mount `JobsView` — co woła `normalizePhone9` (po `99e08c2`)

| Wywołanie | Mount listy? |
|-----------|----------------|
| `useMemo` → `filterProductionActiveDirectory` | **TAK** |
| `JobListPanelHeader` → `filterProductionActiveDirectory` | **TAK** |
| `<select>` pracownik ~1885 | NIE (detail + workers + showAddEntry) |
| `productionDirectory.map` plan ekipy ~1474 | NIE (selectedJob + summary + BZP) |

**Bez** `normalizePhone9` na mount: `wmOverdueIds`, `opsKpi`, `filtered`, `duplicateJobAddressKeys` (`jobAddressKey` z `?? ""` od `0c4da46`).

---

## 5. Zakazy ustalone z użytkownikiem (incydent)

Przy naprawie / RCA **NIE WOLNO** bez wyraźnego polecenia:

- usuwać / modyfikować rekordy w KV (`kw-jobs`, `kw-directory`, …)
- czyścić `localStorage`
- reset / migracja danych
- zmieniać `cloud-sync.ts`, merge, zapis do KV
- commit / push bez potwierdzenia (fix `99e08c2` — push **już zrobiony** na prośbę)

Dopuszczalne: diagnostyka read-only, guardy renderowania, minimalny fix UI.

---

## 6. Następny agent — co robić

### Smoke po deploy `99e08c2` (Vercel)

1. Admin → **Roboty** (lista, bez otwierania roboty).
2. Opcjonalnie: kartoteka z aktywnym pracownikiem bez telefonu — app **nie** powinna paść.

### Jeśli użytkownik chce **Roboty 2.1B MIN**

1. Przeczytaj plan w transkrypcie (query „2.1B MIN”) lub sekcja 3 powyżej.
2. Implementuj **tylko** zakres MIN; **nie** zmieniaj `job-list-ops.ts`, `JobListCard`, sync.
3. Commit + changelog **2.45.34** dopiero na polecenie.
4. `npm run build` + `npx vite-node scripts/test-job-list-ops-2.0-min.mjs`

### Jeśli nowy agent — unikaj wiszenia

- **Nie czytaj** całego `JobsView.tsx` (~2300 linii) — użyj [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.4.
- **Nie** powtarzaj pełnego RCA KV — ten plik + `docs/INCIDENTS-2026-06.md` § Roboty.
- Duplikat importu `appendJobActivity` w `App.tsx` (linia ~20 i ~94) — znany na HEAD; build przechodzi; osobny cleanup opcjonalny.

### Kolejność czytania

```text
1. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← TEN PLIK
2. CURRENT-TASK.md
3. docs/ARCHITECTURE.md § 12.1.4
4. changelog-data.ts → CHANGELOG[0].version (2.45.33)
5. PROJECT-GUIDE.md / AGENTS.md — tylko gdy coś niejasne
```

---

## 7. Komendy pomocnicze

```bash
git log --oneline -8 main
npm run build
npx vite-node scripts/test-job-list-ops-2.0-min.mjs
# repro guard (lokalnie, opcjonalnie):
npx vite-node scripts/verify-jobs-mount-crash.mjs
```

---

## 8. Historia wersji tego dokumentu

| Data | Zmiana |
|------|--------|
| 2026-06-04 | Utworzenie po sesji RCA + push `99e08c2`; stan 2.1B MIN utracony lokalnie |
