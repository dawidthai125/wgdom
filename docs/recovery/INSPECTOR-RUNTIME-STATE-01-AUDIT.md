# INSPECTOR-RUNTIME-STATE-01 — Audyt stanu runtime inspektora

> **Status:** **CLOSED** · **PRODUCTION VERIFIED** · **GREEN**  
> **Data:** 2026-07-08  
> **Bundle:** **INSPECTOR-RUNTIME-STATE-01**  
> **Commit fix:** **`e9720de`** · prod **2.63.73** @ `e9720de`  
> **Owner smoke:** Szymon **15** · Zofia **2** · Dashboard/Roboty/Assignment **PASS**  
> **Zakres audytu (historyczny):** ścieżka **localStorage → React state → UI inspektora**

**Powiązane:**

- [`INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md`](./INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md) — owner evidence **VERIFIED**
- [`INSPECTOR-VISIBILITY-01-RCA-INVESTIGATION.md`](./INSPECTOR-VISIBILITY-01-RCA-INVESTIGATION.md) — hipotezy KV/session (superseded przez ten audyt dla gałęzi UI=0)
- [`INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md`](./INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md) — KV probe PASS (15× szymon)

---

## 0. Werdykt audytu

| Warstwa | Wynik |
|---------|--------|
| Server KV | **PASS** — 17 robót, 15× `assignedInspectorId === "szymon"` |
| Cloud Sync (badge SUCCESS) | **PASS** — pull/merge zapisuje do `localStorage` |
| Filtr `filterJobsForInspector` | **PASS** — ręczny snippet: 15 widocznych dla `session.id === "szymon"` |
| `localStorage["kw-jobs"]` | **PASS** — **17** pozycji |
| **React `jobsAll` w `InspectorPanel`** | **FAIL** — pozostaje `[]` mimo poprawnego LS |
| UI Dashboard / Roboty | **FAIL** — **0** (konsekwencja pustego `jobsAll`) |

**Root cause (code, potwierdzony statycznie):** literówka w destrukturyzacji `useState` — setter nazwany `setJobsAllAll`, podczas gdy cały komponent wywołuje nieistniejące `setJobsAll`. Każde wywołanie rzuca `ReferenceError`, połykane przez `catch { /* ignore */ }` → stan React **nigdy** nie jest hydratowany.

**Regresja:** commit `f85b42c` · **INSPECTOR-JOB-ASSIGN-001** · v2.63.13 (2026-07-01).

---

## 1. Owner runtime evidence (VERIFIED)

| Metryka | Wartość |
|---------|---------|
| `localStorage kw-jobs.length` | **17** |
| `visibleJobs("szymon")` (filtr na LS) | **15** |
| `session.id` | **`"szymon"`** |
| `diagnosis` | **`MATCHES_OR_EXCEEDS_KV`** |
| UI Dashboard KPI | **0 jobs** |
| UI Roboty (lista) | **0 jobs** |
| Sync badge | **SUCCESS** |

**Interpretacja:** Dane w persistence layer są poprawne. UI czyta **wyłącznie** izolowany stan React w `InspectorPanel`, który nie został zaktualizowany.

---

## 2. Architektura — inspektor ≠ admin

Panel inspektora **nie** korzysta z globalnego stanu `App.tsx` / `JobsView` / `CloudLoader` admina.

```text
index.tsx
└─ AppInnerWithAuth
   ├─ appMode === "admin"  → AppInner (App.tsx) — osobny useLocalStorage / jobs
   └─ appMode === "inspector" && inspectorSession
      └─ lazy InspectorPanel session={inspectorSession}
         └─ WŁASNY useState jobsAll  ← JEDYNE źródło listy robót w UI inspektora
```

**Wejście sesji:** `AppInnerWithAuth.tsx` — `enterInspector` → `sessionStorage wg-session-mode=inspector` → `InspectorPanel`.

Brak React Context / Zustand / Redux dla `kw-jobs` w ścieżce inspektora.

---

## 3. Component tree (widoki zależne od `jobsAll`)

```text
InspectorPanel
├─ jobsVisible = useMemo(filterJobsForInspector(jobsAll, inspectorId))
├─ filteredJobs = useMemo(jobsVisible + search + filter status)
│
├─ mainTab === "dashboard"
│  └─ InspectorDashboard jobs={jobsVisible}
│     └─ computeInspectorKpiStats(jobs) → KPI „Aktywne” = 0 gdy jobs=[]
│
├─ mainTab === "jobs"  (UI owner: „Roboty”)
│  └─ lista InspectorJobCard × filteredJobs
│
├─ mainTab === "portfolio"  → WmPortfolioView jobs={jobsVisible}
├─ mainTab === "gallery"      → InspectorJobPhotosGalleryView jobs={jobsVisible}
├─ mainTab === "files"        → JobFilesBrowser jobs={jobsVisible}
│
└─ selectedJob → detal robota (selectedJob z jobsVisible.find)
```

**Dashboard KPI i Roboty** — ten sam pipeline: `jobsAll` → `jobsVisible` → (opcjonalnie `filteredJobs` na zakładce jobs).

---

## 4. Hook tree — przepływ `kw-jobs`

```text
[1] useState jobsAll          initial: []
    setter zadeklarowany:     setJobsAllAll  ← BUG
    setter używany w kodzie:  setJobsAll     ← NIE ISTNIEJE W SCOPE

[2] useMemo jobsVisible
    deps: [jobsAll, inspectorId]
    fn: filterJobsForInspector(jobsAll, inspectorId)

[3] useMemo filteredJobs
    deps: [jobsVisible, search, filter]
    fn: status filter + search + sort

[4] useEffect (mount, []) — hydratacja LS
    read localStorage["kw-jobs"]
    → normalizeJobsValue + normalizeJob
    → setJobsAll(cachedJobs)   ← ReferenceError → catch ignore

[5] useCallback refreshFromCloud
    fetchKeysFromCloud(["kw-jobs", ...])
    → mergeJobsById(local, cloud, tombstones)
    → setJobsAll(normalized)   ← ReferenceError → outer catch → retry setJobsAll → ignore

[6] useEffect ([refreshFromCloud]) — sync po mount
    refreshFromCloud(true)

[7] useEffect — storage listener (cross-tab)
    StorageEvent key kw-jobs → setJobsAll(parsed)

[8] useCallback persistJobs / updateJob
    setJobsAll(...) przy edycji inspektora
```

**Refs pomocnicze (nie zastępują state):**

- `jobsRef.current = jobsAll` — kolejka zdjęć offline
- `lastAppliedJobsJsonRef` — deduplikacja zapisów JSON

---

## 5. State tree

```text
PERSISTENCE (OK)
  localStorage["kw-jobs"]           → 17 Job[]
  localStorage["kw-jobs-deleted-ids"] → merge w refreshFromCloud (nie wyjaśnia UI=0 przy LS=17)

REACT (FAIL)
  jobsAll: InspectorJob[]           → []  (initial, nigdy zaktualizowany)
  jobsVisible: InspectorJob[]       → []  (filter na pustym jobsAll)
  filteredJobs: InspectorJob[]      → []  (filter „active”|… na pustym jobsVisible)

UI PROPS
  InspectorDashboard.jobs           → jobsVisible → []
  Roboty lista                      → filteredJobs → []

SESSION (OK)
  session.id (inspectorId)          → "szymon"
```

**Ręczny filtr w konsoli** (`visibleJobs` na `JSON.parse(localStorage…)`) omija React — stąd **15** w konsoli vs **0** w UI.

---

## 6. Ścieżka runtime krok po kroku

```text
localStorage (kw-jobs) = 17
        │
        ▼
useEffect mount (InspectorPanel ~L369)
        │  JSON.parse + normalize OK
        │  setJobsAll(cachedJobs)
        ▼
ReferenceError: setJobsAll is not defined
        │  catch { /* ignore */ }  (~L377)
        ▼
jobsAll pozostaje []
        │
        ├─► refreshFromCloud(true) — ten sam błąd przy setJobsAll(normalized)
        │
        ▼
jobsVisible = filterJobsForInspector([], "szymon") → []
        │
        ├─► InspectorDashboard → KPI activeCount = 0
        └─► Roboty → filteredJobs.length = 0
```

**`loading`:** `setLoading(false)` wykonuje się na końcu mount effect (~L424) **niezależnie** od sukcesu hydratacji jobs — użytkownik widzi dashboard z zerami, nie nieskończony spinner.

**Sync badge SUCCESS:** `refreshFromCloud` kończy merge i zapis do `localStorage`; awaria dotyczy tylko aktualizacji React state po merge.

---

## 7. Exact divergence point

**Plik:** `src/app/InspectorPanel.tsx`  
**Linia:** **299**

```typescript
const [jobsAll, setJobsAllAll] = useState<InspectorJob[]>([]);
```

**Wywołania `setJobsAll` (setter niezdefiniowany):**

| Linia | Kontekst |
|-------|----------|
| 375 | Hydratacja LS przy mount |
| 438 | `persistJobs` |
| 508 | `updateJob` |
| 672 | `refreshFromCloud` — po merge |
| 770 | `refreshFromCloud` catch fallback |
| 804 | `storage` event listener |

**Diff regresji (`f85b42c`):**

```diff
- const [jobs, setJobs] = useState<InspectorJob[]>([]);
+ const [jobsAll, setJobsAllAll] = useState<InspectorJob[]>([]);
  ...
- setJobs(cachedJobs);
+ setJobsAll(cachedJobs);
```

Rename `jobs` → `jobsAll` wykonany poprawnie w wywołaniach, **błędnie** w destrukturyzacji hooka (`setJobsAllAll` zamiast `setJobsAll`).

---

## 8. Odpowiedzi na pytania audytu

### 8.1 Gdzie powstaje stan React dla robót inspektora?

`InspectorPanel` — `useState<InspectorJob[]>` linia 299. **Izolowany** od admin `App.tsx`.

### 8.2 Gdzie ładowane jest `kw-jobs`?

| Etap | Mechanizm | Aktualizuje React? |
|------|-----------|-------------------|
| Mount | `useEffect` → `localStorage.getItem("kw-jobs")` | **Nie** (bug setter) |
| Sync | `refreshFromCloud` → `fetchKeysFromCloud` + `mergeJobsById` | **Nie** (bug setter) |
| Cross-tab | `window.storage` listener | **Nie** (bug setter) |
| Zapis inspektora | `persistJobs` / `updateJob` | **Nie** (bug setter) |

`localStorage` **jest** aktualizowany przez `refreshFromCloud` (linie 672–673) — stąd LS=17 przy React=[].

### 8.3 Skąd czytają widoki inspektora?

| Widok | Źródło | Typ |
|-------|--------|-----|
| Dashboard KPI | prop `jobs={jobsVisible}` | `useMemo` z `jobsAll` |
| Roboty lista | `filteredJobs` | `useMemo` z `jobsVisible` |
| Portfolio / Galeria / Pliki | `jobsVisible` | props |
| Detal robota | `selectedJob` z `jobsVisible.find` | derived |

**Nie** czytają bezpośrednio z `localStorage` ani z admin context.

### 8.4 Gdzie runtime staje się pusty mimo LS=17?

**Linia 299 + pierwsze `setJobsAll` w mount effect (375)** — pierwszy punkt rozbieżności LS vs React.

### 8.5 Sprawdzone hipotezy (wykluczone)

| Hipoteza | Werdykt |
|----------|---------|
| Stale `useMemo` / złe deps | **NIE** — `jobsAll` faktycznie `[]` |
| Duplikat stanu admin vs inspector | **NIE** — osobne drzewo; symptom tylko inspector |
| `filter === "active"` ukrywa wszystko | **NIE** — przy `jobsVisible=[]` także „Wszystkie” = 0; owner: 0 na Dashboard (bez filtra statusu) |
| `session.id` mismatch | **NIE** — evidence: `szymon`, visibleJobs=15 na LS |
| Tombstones wycina wszystkie | **NIE** — LS ma 17; merge nie jest przyczyną pustego React state |
| Hydration SSR | **NIE** — czysty CSR, Vite SPA |

---

## 9. Dlaczego build przechodzi, a prod się psuje

- `npm run build` = **`vite build` only** — **bez** `tsc --noEmit` w pipeline (`package.json`).
- Błąd jest **runtime** (`ReferenceError`), nie składni bundlera.
- TypeScript przy `tsc` powinien zgłosić `Cannot find name 'setJobsAll'` — nie jest egzekwowany przy release.

---

## 10. Minimal presentation / runtime fix (PROPONOWANY — NIE IMPLEMENTOWAĆ)

**Zmiana 1 linii** w `InspectorPanel.tsx:299`:

```diff
- const [jobsAll, setJobsAllAll] = useState<InspectorJob[]>([]);
+ const [jobsAll, setJobsAll] = useState<InspectorJob[]>([]);
```

**Oczekiwany efekt po fixie:**

1. Mount effect: `jobsAll` = 17 (z LS) natychmiast.
2. `jobsVisible` = 15 (`filterJobsForInspector`).
3. Dashboard KPI > 0 (wg statusów `in_progress`).
4. Roboty — lista wg filtra (domyślnie „Aktywne”).

**Opcjonalne hardening (backlog, poza minimal fix):**

- Smoke: mount `InspectorPanel` z seeded `localStorage kw-jobs` → assert `jobsVisible.length > 0`.
- CI: `tsc --noEmit` lub eslint `no-undef` na `src/app`.
- W mount effect: nie połykać `ReferenceError` w cichym `catch` dla ścieżki jobs (fail-loud dev).

**Poza zakresem tego bundle:** sync, KV, assignment, Edge, Payroll.

---

## 11. Weryfikacja po IMPLEMENT (checklist dla ownera)

1. Login inspektor Szymon → Dashboard: KPI „Aktywne” > 0 (jeśli są remonty w toku).
2. Zakładka Roboty → „Wszystkie” → **15** adresów (nie 17 — 2× Zofia to expected).
3. Konsola — opcjonalnie: brak `ReferenceError` przy ładowaniu.
4. Pull-to-refresh → liczby stabilne.
5. `npm run build` PASS + changelog patch (osobny release INSPECTOR-RUNTIME-STATE-01).

---

## 12. Mapowanie na INSPECTOR-VISIBILITY-01

| Wcześniejsza hipoteza | Status po tym audycie |
|----------------------|------------------------|
| H-ID-MISMATCH (session) | **OBLANA** — runtime JSON |
| H-TOMB-DEVICE / pusty cache | **OBLANA** — LS=17 |
| H-05 filtr UI „Aktywne” | **OBLANA** — Dashboard też 0 |
| Runtime state bug | **POTWIERDZONA** — `setJobsAllAll` typo |

**OWNER GO:** nadal **WITHHELD** do osobnej decyzji na bundle **INSPECTOR-RUNTIME-STATE-01** (1-line fix + release B).

---

## 13. Kluczowe pliki (referencja)

| Plik | Rola |
|------|------|
| `src/app/InspectorPanel.tsx` | Stan `jobsAll`, hydratacja, sync, UI tabs |
| `src/app/AppInnerWithAuth.tsx` | Routing inspector vs admin |
| `src/lib/inspector-job-assignment.ts` | `filterJobsForInspector` |
| `src/app/InspectorDashboard.tsx` | Prezentacja KPI z prop `jobs` |
| `src/lib/inspector-dashboard.ts` | `computeInspectorKpiStats` |

---

*Audyt zakończony. Brak implementacji zgodnie z mandate AUDIT ONLY.*
