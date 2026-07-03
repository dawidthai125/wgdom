# PAYROLL — Cloud Sync Performance AUDIT (read-only)

> **Typ:** Audyt wydajności synchronizacji chmurowej — redukcja liczby requestów i obciążenia Supabase **bez** pogorszenia bezpieczeństwa sync (merge/LWW/tombstones/SSOT).
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** v2.63.27
> **Metoda:** Analiza statyczna klient + Edge. Bez implementacji, BUILD, TEST, COMMIT.
> **Zakaz projektowania implementacji** — tylko ocena + warianty. Nie „zwiększmy timer 15→60 s” (to nie architektura).
> **Workflow:** AUDIT → RAPORT → STOP.

---

## 0. Model transportu (fakty bazowe)

| Element | Wartość | Plik |
|---------|---------|------|
| Endpoint pull | `POST {API_BASE}/batch-get` | `cloud-sync.ts:2640` |
| Endpoint push | `POST {API_BASE}/batch-set` (`kv.mset` — **jedna instrukcja**) | `cloud-sync.ts:2182` · `index.tsx:707` |
| Liczba kluczy DATA_KEYS | **30** | `cloud-sync.ts:117–148` |
| Klucze w batch-get (bundle + tombstones) | **~40** (30 + 10 `*-deleted-ids`) | `cloud-sync.ts:2505–2517` |
| Debounce auto-sync | 2 000 ms | `cloud-sync-throttle.ts:14` |
| Pull throttle (focus/visibility) | 15 000 ms leading-edge | `cloud-sync-throttle.ts:17` |
| No-change push skip | `bundleFingerprint` | `cloud-sync-throttle.ts:39` · `App.tsx:764` |
| Metryki | `__wgdomSyncMetrics()` `{batchGet,batchSet,pushSkipped}` | `App.tsx:933` |

**Kluczowa obserwacja wstępna:** jeden `runCloudSync` = **3 batch-get + 1–2 batch-set** (główny bundle + aux notatki + aux Audit Hub). Fingerprint pomija **tylko** główny batch-set; aux round-tripy i batch-get **nie są** pomijane.

---

## CZĘŚĆ 1 — Źródła batch-get (PULL)

| # | Trigger | Plik / funkcja | Kto wywołuje | Częstotliwość | Dublowanie? |
|---|---------|----------------|--------------|---------------|-------------|
| G-1 | **Bootstrap CORE** | `CloudLoader.tsx:59` `fetchKeysFromCloud([CORE(6)+aux])` | mount aplikacji | 1× na start | Nie |
| G-2 | **Bootstrap DEFERRED** | `CloudLoader.tsx:56` `fetchAndMergeDeferredBootstrap()` | po CORE | 1× na start | Nie (osobna faza) |
| G-3 | **runCloudSync → pull** | `App.tsx:751` → `pullAndMergeDataBundle` → `computeMergedDataBundle:2486` → `fetchKeysFromCloud` (~40) | auto-sync (edycje), settled, manual | co ~2 s debounce przy edycji | Chronione `syncInFlightRef`/`pendingCloudSyncRef` |
| G-4 | **runCloudSync → aux notatki** | `App.tsx:756` `pullOperationalNotesAuxFromCloud` | wewnątrz każdego `runCloudSync` | jak G-3 | **Redundantny round-trip** (osobny batch-get) |
| G-5 | **runCloudSync → aux Audit Hub** | `App.tsx:778` `refreshAuditHubAuxFromCloud` | wewnątrz każdego `runCloudSync` | jak G-3 | **Redundantny round-trip** |
| G-6 | **pullFromCloudAndMerge (focus)** | `App.tsx:994` `window.addEventListener("focus")` | przełączenie okna | throttle 15 s (`shouldPullNow`) | Współdzielony throttle z G-7 |
| G-7 | **pullFromCloudAndMerge (visibility)** | `App.tsx:993` `visibilitychange` | powrót do karty | throttle 15 s | **Często razem z G-6** → throttle dedupuje do 1 |
| G-8 | **pullFromCloudAndMerge (2. efekt)** | `App.tsx:924` | zależny od `pullFromCloudAndMerge` | throttle 15 s | jw. |
| G-9 | **aux pull podczas pullFromCloudAndMerge** | `App.tsx:710,714` (notatki + Audit Hub) | każdy pull focus/visibility | jak G-6/7 | **2 dodatkowe batch-get na każdy pull** |
| G-10 | Moduły lazy (poza sync core) | `tenders-bzp.ts:646`, `wgdom-cost-catalog-store.ts:118`, `work-catalog-sync.ts:51,75`, `InspectorPanel.tsx:646`, `LoginScreen.tsx:139` | wejście do modułu | ad-hoc | Osobne, poza pętlą Payroll |

**Wniosek CZĘŚĆ 1:** każdy pełny sync generuje **3 batch-get** (G-3+G-4+G-5). Focus/visibility (G-6…G-9) — również **3 batch-get** na jeden przepuszczony pull. Throttle 15 s chroni tylko pull focus/visibility; **nie** chroni pętli auto-sync z edycji (debounce 2 s).

---

## CZĘŚĆ 2 — Źródła batch-set (PUSH)

| # | Trigger | Plik / funkcja | Kto wywołuje | Częstotliwość | Dublowanie? |
|---|---------|----------------|--------------|---------------|-------------|
| S-1 | **Główny bundle** | `App.tsx:768` `pushMergedDataBundleToCloud` → `pushKeysToCloud` (~38 kluczy) | `runCloudSync` gdy fingerprint ≠ ostatni | co sync ze zmianą | ✅ Skip przez `bundleFingerprint` (AC4) |
| S-2 | **Aux notatki** | `App.tsx:772` `pushOperationalNotesToCloud` | każdy `runCloudSync` | **zawsze** (bez fingerprint) | **Nie pomijany** — osobny batch-set |
| S-3 | **Bootstrap push** (admin pw / users) | `CloudLoader.tsx:103–116` | start, gdy różnica | rzadko | Nie |
| S-4 | **Roster EXPLICIT** | `cloud-sync.ts:2236` `pushKeysToCloud(["kw-week-employees"], replace)` | operacje składu | per operacja | force-replace (intencjonalne) |
| S-5 | **Leaves / charges push** | `cloud-sync.ts:2315,2336` `pushKeysToCloudSafe` | edycje urlopów/billing | per akcja | osobny KV |
| S-6 | **Moduły (catalog/tenders/work)** | `wgdom-cost-catalog-store.ts` `persistKey`, `work-catalog-sync.ts`, `tenders-*` | zapis w module | ad-hoc | poza pętlą Payroll |

**Wniosek CZĘŚĆ 2:** najkosztowniejszy jest **S-1** — pojedynczy `kv.mset` na ~38 kluczy (przyczyna ryzyka `batch-set 500` = statement timeout, F3/S7-2). **S-2** to dodatkowy, niepomijany push na każdym sync.

---

## CZĘŚĆ 3 — Co powoduje pobranie (analiza triggerów)

| Trigger | Dlaczego uruchamia sync | Potrzebny? | Redundantny? | Współdzielenie |
|---------|-------------------------|:----------:|:------------:|----------------|
| **Edycja danych** (`App.tsx:976–980` useEffect na 20+ stanach) | dowolna zmiana stanu → `scheduleAutoCloudSync` (debounce 2 s) | ✅ | ⚠️ deps obejmują **wszystkie** domeny (payroll, wm, electrical, tenders) → edycja payroll odpala push całego bundla | **TAK** — jedna pętla dla wszystkich domen (za szeroka) |
| **settled 400 ms** (`App.tsx:1629`) | natychmiastowy sync po „Rozliczony” | ✅ (UX) | ⚠️ osobny, krótszy timer omija debounce 2 s | Można złączyć z debounce |
| **focus** (G-6) | pobierz świeże po powrocie do okna | ✅ | ⚠️ zwykle równocześnie z visibility | throttle 15 s dedupuje |
| **visibilitychange** (G-7) | jw. | ✅ | ⚠️ duplikat focus | throttle 15 s |
| **60 s interval** (`App.tsx:1764`) | cykl tygodnia payroll (rollover) — **nie** sync bezpośrednio | ✅ (rollover) | ⚠️ `autoArchiveAndAdvance` zmienia stan → **pośrednio** odpala auto-sync | — |
| **manual retry** (`App.tsx:2062`) | ręczny przycisk | ✅ | Nie | — |
| **bootstrap** (G-1/G-2) | pierwsze załadowanie | ✅ | Nie | CORE + DEFERRED już rozdzielone |
| **aux notatki / Audit Hub** (G-4/G-5/G-9) | dociągnięcie stanów pobocznych | ✅ | ⚠️ **osobne round-tripy** na każdy sync/pull | Można złączyć do 1 batch-get |

**Wniosek CZĘŚĆ 3:** największa redundancja architektoniczna = **(a) jedna pętla auto-sync dla wszystkich domen** (edycja payroll niesie WM/electrical/tenders/catalog) oraz **(b) 3 osobne batch-get na sync** (główny + 2 aux).

---

## CZĘŚĆ 4 — Bundle (~40 kluczy: czy Payroll potrzebuje wszystkiego)

Grupy domenowe w DATA_KEYS (30):

| Domena | Klucze | Potrzebne przy edycji **Payroll**? |
|--------|--------|:----------------------------------:|
| **Payroll core** | `kw-directory`, `kw-week-employees`, `kw-archive`, `kw-weekFrom`, `kw-weekTo`, `kw-employee-leaves` | ✅ TAK |
| **Billing (styczne)** | `kw-recoverable-charges` | ⚠️ pośrednio (KPI) |
| **Jobs/Roboty** | `kw-jobs`, `kw-contacts`, `kw-operational-notes` | ❌ NIE (dla samej płacy) |
| **WM Druk** | `kw-wm-print-*` (4), `kw-delivery-package-publications` | ❌ NIE |
| **Electrical** | `kw-electrical-*` (4) | ❌ NIE |
| **Tenders** | `kw-tenders-*` (3), `kw-tender-*` (2), `kw-company-profile` | ❌ NIE |
| **Cost/Work catalog** | `kw-wgdom-cost-catalog(+history)`, `kw-wgdom-classification-dictionary`, `kw-wgdom-work-catalog`, `kw-wgdom-work-bundles` | ❌ NIE |

**Ocena:** edycja godziny/premii pracownika pobiera i wypycha **~40 kluczy**, z czego realnie dotyczy Payroll **~6–7**. Reszta (WM, electrical, tenders, catalog — często **duże** ładunki) podróżuje bez powodu.

**Czy możliwy logiczny podział bundli (Payroll / Tender / WM / Catalog) bez łamania SSOT?**
✅ **TAK — koncepcyjnie bezpieczny.** SSOT to **klucz KV + reguła merge**, nie „jeden bundle transportowy”. Podział dotyczy **tylko transportu** (które klucze lecą w danym batch-get/set), nie zmienia merge/LWW/tombstonów. Warunki:
- tombstony muszą jechać z odpowiednią domeną (np. `*-deleted-ids` payroll z Payroll Bundle),
- klucze współdzielone między domenami (np. `kw-directory` używany i przez Payroll, i przez Jobs) muszą być przypisane do „wspólnego rdzenia” lub pobierane przez obie ścieżki,
- bootstrap nadal ładuje całość (CORE + DEFERRED), podział dotyczy sync bieżącego.

---

## CZĘŚĆ 5 — Resource exhaustion (skala)

Założenie: aktywna edycja → sync co ~2 s (debounce). 1 sync = **3 batch-get + 1–2 batch-set ≈ 4–5 requestów**.

| Scenariusz | batch-get/min | batch-set/min | Requesty/min (łącznie) |
|------------|:-------------:|:-------------:|:----------------------:|
| 1 urządzenie, ciągła edycja (30 sync/min) | ~90 | ~30–60 | **~120–150** |
| 1 urządzenie, focus/visibility flapping (throttle 15 s → 4/min) | ~12 | 0 | ~12 |
| **2 urządzenia** edytujące | ~180 | ~60–120 | **~240–300** |
| **5 urządzeń** | ~450 | ~150–300 | **~600–750** |
| **10 urządzeń** | ~900 | ~300–600 | **~1200–1500** |

**Najgorszy przypadek:** wiele urządzeń jednocześnie edytujących ten sam tydzień płac → liniowa kumulacja + każdy batch-set to `kv.mset` na ~38 kluczy (duży payload) → **eskalacja ryzyka `batch-set 500` (statement timeout)** wraz z payloadem i współbieżnością.

**Najbardziej kosztowne operacje (ranking):**
1. **S-1 batch-set całego bundla** — jeden `kv.mset` ~38 kluczy (payload + timeout risk). 🔴
2. **G-3 batch-get ~40 kluczy** — duża egress (zawiera cost-catalog/work-catalog/history — bulk). 🔴
3. **G-4/G-5 aux batch-get** — 2 dodatkowe round-tripy na każdy sync. 🟠
4. **S-2 aux notatki push** — niepomijany batch-set na każdy sync. 🟠

---

## CZĘŚĆ 6 — Cache (dane quasi-statyczne)

Klucze zmieniane rzadko, a pobierane w **każdym** batch-get:

| Klucz | Zmienność | Rozmiar | Musi być w każdym pull? |
|-------|-----------|---------|:-----------------------:|
| `kw-wgdom-cost-catalog` | rzadko (import/edycja katalogu) | **duży** | ❌ |
| `kw-wgdom-cost-catalog-history` | rośnie, rzadko czytany bieżąco | **duży** | ❌ |
| `kw-wgdom-classification-dictionary` | prawie statyczny | średni | ❌ |
| `kw-wgdom-work-catalog` | rzadko | **duży** | ❌ |
| `kw-wgdom-work-bundles` | rzadko | średni | ❌ |
| `kw-company-profile` / `kw-tenders-company-profile` | rzadko | mały/średni | ❌ |
| `kw-directory` | rzadko (kartoteka) | średni | ⚠️ (używany przez płace) |

**Ocena:** ~5–7 kluczy to dane **praktycznie statyczne w trakcie sesji**, mimo to pobierane co 2 s przy edycji płac. To główny kandydat do cache z inwalidacją po wersji/`updatedAt` — **bez** zmiany SSOT (nadal ten sam klucz, ta sama reguła merge; zmienia się tylko „kiedy pobrać”).

---

## CZĘŚĆ 7 — Propozycje (3 warianty — bez projektowania implementacji)

### WARIANT A — LOW RISK (redukcja round-tripów, bez zmian merge)
**Zakres:** złączyć 3 batch-get w 1 (główny bundle + klucze aux notatek + aux Audit Hub w jednym `fetchKeysFromCloud`); rozszerzyć skip fingerprint na push aux (S-2), gdy brak zmian; scalić timer settled 400 ms z debounce.
- **Korzyści:** ~3 batch-get → 1 na sync (−66% pull round-tripów); mniej batch-set aux.
- **Ryzyko:** niskie — kolejność merge notatek/Audit Hub do zachowania; brak zmian LWW/tombstonów.
- **SSOT:** bez wpływu (te same klucze, ta sama reguła merge).
- **Production:** natychmiastowa ulga na liczbie requestów; brak zmiany zachowania danych.

### WARIANT B — MEDIUM (logiczny podział bundli + cache quasi-statyczny)
**Zakres:** rozdzielić transport na **Payroll Bundle / Jobs Bundle / WM Bundle / Electrical Bundle / Tender Bundle / Catalog Bundle**; sync bieżący wypycha/pobiera tylko domenę edytowaną (routing per zmiana). Klucze quasi-statyczne (Część 6) pobierane warunkowo (marker wersji/`updatedAt`), inaczej z local.
- **Korzyści:** edycja płac = ~6–7 kluczy zamiast ~40; drastyczna redukcja payloadu batch-set (łagodzi F3/500) i egress.
- **Ryzyko:** średnie — poprawne przypisanie tombstonów do domen; klucze współdzielone (`kw-directory`) do „rdzenia”; fingerprint per bundle; regresja merge/parity klient↔Edge do przetestowania.
- **SSOT:** zachowany (podział **transportu**, nie źródła prawdy); wymaga jawnej mapy klucz→bundle.
- **Production:** wymaga starannego rollout + testów; największy zysk wydajności bez zmiany semantyki.

### WARIANT C — LONG TERM (conditional fetch / realtime — zmiana modelu transportu)
**Zakres:** (1) ETag/`If-None-Match` lub per-key `updatedAt` po stronie Edge → `batch-get` zwraca tylko zmienione klucze (304 dla reszty); (2) opcjonalnie Supabase Realtime — pull tylko po powiadomieniu o zmianie, eliminacja pollingu focus/visibility/interval; (3) per-key wersjonowanie (przy okazji adresuje LU-3 clock skew / RC-2 optimistic-lock).
- **Korzyści:** eliminacja redundantnej egress i pollingu; skalowanie do wielu urządzeń; fundament pod optimistic concurrency.
- **Ryzyko:** wysokie — zmiana kontraktu Edge (`batch-get`/`batch-set`), migracja, wersjonowanie KV; szeroka regresja.
- **SSOT:** wzmacnia (wersjonowanie per klucz), ale wymaga przeprojektowania warstwy transportu i Edge.
- **Production:** duży, ale odległy zysk; osobny EPIC z pełnym cyklem AUDIT→DESIGN FREEZE→IMPLEMENT.

---

## 8. Podsumowanie ryzyk i rekomendacja kolejności (bez implementacji)

| Ustalenie | Waga |
|-----------|------|
| 3 batch-get na sync (główny + 2 aux) | 🟠 redukowalne (Wariant A) |
| ~40 kluczy w każdym pull/push mimo edycji tylko płac | 🔴 architektura bundla (Wariant B) |
| `kv.mset` całego bundla = ryzyko `batch-set 500` | 🔴 (spójne z F3/S7-2) |
| Dane quasi-statyczne pobierane co 2 s | 🟠 cache (Wariant B) |
| Polling focus/visibility/interval | 🟢 częściowo chroniony throttle 15 s; docelowo realtime (Wariant C) |

**Kolejność (do decyzji właściciela, poza tym audytem):** A (szybka ulga, low-risk) → B (największy zysk, medium) → C (long-term, osobny EPIC). **Uwaga governance:** wszystkie warianty **nie** ruszają merge/LWW/tombstonów/SSOT poza tym, co opisano; każdy wymaga osobnego DESIGN FREEZE. **Nie** kolidować z aktywnym P0 (S7-5 / F1) — wydajność to osobny bundle.

---

## 9. Ograniczenia audytu
- Analiza statyczna; realne liczby requestów/min do potwierdzenia z `__wgdomSyncMetrics()` (Production Observation S7-4A).
- Rozmiary payloadów (cost-catalog/work-catalog) szacowane jakościowo — do zmierzenia w Network (HAR).
- Warianty = **ocena**, nie projekt implementacji (zgodnie ze zleceniem).

---

*SSOT audytu wydajności sync: ten plik. Read-only — bez implementacji, refactorów, BUILD, COMMIT. Workflow: AUDIT → RAPORT → STOP.*
