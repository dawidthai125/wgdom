# W&G DOM — handoff Performance 1.x (2026-06-05)

> **★ Nowa sesja — START tutaj** jeśli temat to wydajność startu, CloudLoader, COMMAND CENTER AI, lub stan po release `v2.45.34-perf-1.3a`.  
> Hasło sesji: **„kontynuuj WGDOM”** → też [`CURRENT-TASK.md`](../CURRENT-TASK.md) i [`.cursor/rules/wgdom-stan-projektu.mdc`](../.cursor/rules/wgdom-stan-projektu.mdc).

**Data handoff:** 2026-06-05  
**Prod `main` (HEAD):** `a6cdb4a` — Performance 1.1C + 1.2A + 1.3A+  
**Tag release:** `v2.45.34-perf-1.3a`  
**Wersja UI:** **2.45.34** w [`changelog-data.ts`](../src/app/changelog-data.ts)  
**URL:** https://www.wgdom.fun

**Transkrypt sesji (performance + release):** `agent-transcripts/5cf13bdf-a21c-4564-8e42-68192622d416`

---

## 1. Werdykt — Performance 1.x MIN **CLOSED**

| Sprint | Status | Commit / środowisko |
|--------|--------|---------------------|
| **1.1C** — usunięcie `tenderDashStats` | **DONE** | w `a6cdb4a` |
| **1.2A** — award/BZP w tle w pipeline | **DONE** | w `a6cdb4a` |
| **1.3A+** — CloudLoader CORE/DEFERRED + event profilu CC | **DONE** | w `a6cdb4a` |
| **Release** — commit, tag, push, deploy, pomiar prod | **DONE** | 2026-06-05 |

**Nie rozpoczynaj kolejnych sprintów performance (1.4, 1.5…) bez wyraźnego polecenia użytkownika.**

---

## 2. Co zostało zrobione (technicznie)

### 2.1 Sprint 1.1C — legacy `tenderDashStats`

Usunięto duplikat fetchu statystyk BZP z `App.tsx` (useEffect `loadTendersPipeline` + `tenderDashStats`). Pulpit korzysta **wyłącznie** z COMMAND CENTER AI (`CommandCenterExecutivePanel` + `useCommandCenterExecutiveSnapshot`).

| Plik | Zmiana |
|------|--------|
| `src/app/App.tsx` | usunięto stan/effect `tenderDashStats`, prop do routera |
| `src/app/DashboardView.tsx` | usunięto prop `tendersStats` / `void _legacyTendersStats` |
| `src/app/admin/AdminViewRouter.tsx` | usunięto prop drilling |

**Weryfikacja:** `grep tenderDashStats` w `src/` → 0 wyników (poza docs).

### 2.2 Sprint 1.2A — szybszy COMMAND CENTER AI

`useTendersPipeline` — `setLoading(false)` zaraz po `loadTendersPipeline` + `syncTenderKeywordsAndRescore`. `autoFetchAwardResults` i `runBzpMerge` w **IIFE w tle** (nie blokują placeholder → marka).

| Plik | Zmiana |
|------|--------|
| `src/app/tenders/strategy/hooks/useTendersPipeline.ts` | fast path loading=false; award/BZP deferred |

### 2.3 Sprint 1.3A+ — CloudLoader lite bootstrap

**Faza 1 (CORE):** `batch-get` tylko `BOOTSTRAP_CORE_KEYS` (6 kluczy) + tombstones + admin keys → `setReady(true)`.

**Faza 2 (DEFERRED):** `void fetchAndMergeDeferredBootstrap()` — pipeline, profil firmy, słownik, kontakty → event `wgdom-deferred-bootstrap`.

| Plik | Zmiana |
|------|--------|
| `src/lib/cloud-sync.ts` | `BOOTSTRAP_CORE_KEYS`, `BOOTSTRAP_DEFERRED_KEYS`, `fetchAndMergeDeferredBootstrap`, event |
| `src/app/CloudLoader.tsx` | dwufazowy bootstrap |
| `src/app/tenders/strategy/context/CommandCenterContext.tsx` | listener event → `bumpProfileVersion()` |

**CORE (6):** `kw-directory`, `kw-week-employees`, `kw-archive`, `kw-weekFrom`, `kw-weekTo`, `kw-jobs`.

**DEFERRED (4 + tombstone):** `kw-tenders-pipeline`, `kw-tenders-company-profile`, `kw-tenders-custom-keywords`, `kw-contacts`, `kw-contacts-deleted-ids`.

---

## 3. Release (2026-06-05)

| Krok | Wynik |
|------|--------|
| Build | `npm run build` — **PASS** |
| Commit | `a6cdb4a` — `perf: CloudLoader lite bootstrap + CC fast path + remove legacy tenderDashStats` |
| CHANGELOG | **2.45.34** — Performance 1.1C + 1.2A + 1.3A+ |
| Tag | `v2.45.34-perf-1.3a` → `a6cdb4a` |
| Push | `origin/main` + tag — **OK** |
| Deploy | Vercel auto po push — **OK** (`Last-Modified` ~07:12 UTC) |
| Supabase | **bez zmian** (tylko frontend) |

**CI:** GitHub Action *Mobile smoke tests* — FAIL na statycznym `audit:mobile` (brak `100dvh`, brak PTR) — **pre-existing**, nie blokuje deployu Vercel.

---

## 4. Pomiary wydajności

### Metodologia

Playwright, 3 runy (cold + 2× warm), sesja admin wstrzyknięta po `CloudLoader ready` + `page.reload()` (jak baseline 1.1B).

### Baseline’y (przed release)

| Metryka (mediana) | 1.1B prod | 1.2B preview | 1.3B preview |
|-------------------|-----------|--------------|--------------|
| nav → CloudLoader ready | 6462 ms | 4566 ms | 2228 ms |
| ready → Dashboard | 1092 ms | 1161 ms | 894 ms |
| Dashboard → placeholder CC | 4 ms | 5 ms | 5 ms |
| placeholder → marka CC | 4913 ms | 815 ms | 809 ms |
| nav → pełny Dashboard | 12471 ms | 6546 ms | 3457 ms |

### AFTER — prod `a6cdb4a` (2026-06-05, mediana 3 runów)

| Metryka | AFTER (ms) | Δ vs 1.1B | Δ vs 1.3B preview |
|---------|------------|-----------|-------------------|
| nav → ready | **2685** | −3777 (−58,5%) | +457 |
| ready → Dashboard | **901** | −191 (−17,5%) | +7 |
| Dashboard → placeholder | **8** | +4 | +3 |
| placeholder → marka | **842** | −4071 (−82,9%) | +33 |
| nav → pełny Dashboard | **4445** | −8026 (−64,4%) | +988 |

**Interpretacja:** ogromny zysk vs stary prod (1.1B). Vs lokalny preview 1.3B prod jest ~1 s wolniejszy (sieć/CDN). Segment placeholder→marka stabilny (~800 ms).

**Najwolniejszy etap po release:** nadal **nav → CloudLoader ready** (~60% czasu do marki CC).

### Znane ograniczenie pomiaru

Segment **ready → Dashboard** (~900 ms) zawiera **drugi CORE bootstrap po `reload`** po wstrzyknięciu sesji — artefakt metody Playwright, nie typowego logowania (`enterAdmin()` bez reload). Audyt 1.4 (READ ONLY) wskazał to jako kolejny potencjalny sprint.

---

## 5. TOP bottlenecki pozostałe (po 1.x)

1. CloudLoader CORE `batch-get` × **2** (start + reload admin) — ~500–900 ms każdy
2. `batch-set` bootstrap push w fazie 1
3. Reload po wstrzyknięciu sesji (architektura testów / opcjonalnie produktu)
4. `loadTendersPipeline` + `syncTenderKeywords` (~600–700 ms łącznie)
5. CC snapshot CPU (health, forecast, action center)
6. Eager chunk `index-*.js` + mount Dashboard
7. Tło: `autoFetchAwardResults`, `runBzpMerge` (nie blokują marki)
8. Post-login: `backup-status` ×3, `pullAndMerge` (~2 s debounce)

**Rekomendacja na przyszłość (bez polecenia — NIE implementować):** sprint na eliminację podwójnego CORE bootstrap (kategoria CloudLoader).

---

## 6. Łańcuch commitów na `main` (kontekst)

```text
a6cdb4a  perf: CloudLoader lite bootstrap + CC fast path + remove legacy tenderDashStats  ← PROD
a213a65  Roboty 2.1B MIN: restore UI layout and card refresh
2b71385  Roboty 2.1B MIN - Phase 1 KPI header
99e08c2  fix(directory): normalizePhone9 (incydent czarny ekran Roboty)
```

**Uwaga wersji UI:** CHANGELOG **2.45.34** = Performance release. Roboty 2.1B było w commitach `2b71385`/`a213a65` bez osobnego bumpu wersji przed perf (planowany 2.45.34 był wcześniej rezerwowany na 2.1B).

---

## 7. Zakazy dla programisty (chyba że user każe)

- **NIE** zmieniać `BOOTSTRAP_CORE_KEYS` / `BOOTSTRAP_DEFERRED_KEYS` bez audytu safety
- **NIE** przywracać `tenderDashStats`
- **NIE** blokować award/BZP na ścieżce krytycznej CC (regresja 1.2A)
- **NIE** zmieniać KV/LS/sync merge przy pracy nad performance
- **NIE** commitować skryptów `scripts/audit-*`, `scripts/map-*`, `scripts/verify-*` bez polecenia

---

## 8. Szybki start nowej sesji

```text
1. docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md  ← ten plik (performance CLOSED)
2. CURRENT-TASK.md
3. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← jeśli temat Roboty / incydent
4. docs/ARCHITECTURE.md § 11.5 (CloudLoader CORE/DEFERRED)
5. docs/tender-center-7g-executive.md  ← CC na Pulpicie
```

**Smoke po zmianach performance:** login admin → Pulpit → widoczna marka **„W&G DOM — Przetargi Strategia”** (nie tylko placeholder).
