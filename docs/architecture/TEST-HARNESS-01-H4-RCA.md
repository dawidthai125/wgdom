# TEST-HARNESS-01 H4 — RCA

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Etap:** **RCA COMPLETE** · **NIE implementować** · **NIE PLAN** bez Owner GO  
> **Data:** 2026-07-20  
> **Owner GO RCA:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H4-AUDIT.md`](TEST-HARNESS-01-H4-AUDIT.md) **ACCEPTED**  
> **Baseline prod:** UI **2.65.35** · app **`fce7b78`** · **PRODUCTION VERIFIED · GREEN**  
> **Klasa problemu:** luka coverage / test-infra — **nie** bug produkcyjny  
> **IMPLEMENT:** **BLOCKED**

---

## 0. Problem statement (potwierdzony)

Brak formalnego scenariusza Production Sandbox:

```text
batch-get → batch-set (sandbox-only) → retry observe → metrics snapshot → cleanup
```

Parent DF § H4 AC jest zamrożony; H0–H3-A **RELEASED**; `kv-client.mjs` istnieje; runner zwraca `PSB_SCENARIO_NOT_IMPLEMENTED` dla H4.

H4 **nie** naprawia Cloud Sync, Resurrection Fence ani N1 — te są **CLOSED / GREEN**. H4 dostarcza **bezpieczną, izolowaną regresję transportu Edge KV** pod PSB-001.

---

## 1. Root cause (RCA)

| ID | Przyczyna | Typ |
|----|-----------|-----|
| **RC-1** | Slice H4 nigdy nie został zaimplementowany mimo parent D12 (H0→H4…) — Owner override: H0→H1→H2→H3-A | Decyzyjna / kolejność |
| **RC-2** | Pokrycie Cloud „przy okazji” H1/H2 (nested domena) + H3-A RO **nie** spełnia izolowanego kontraktu H4 AC | Coverage gap |
| **RC-3** | Brak zamrożonego **write-surface** (nested vs telemetry vs nowy KV) blokował bezpieczny start — ryzyko wipe przy full-key `batch-set` | Architektura / DF gap |
| **RC-4** | Dwie ścieżki HTTP: raw Edge (`kv-client`) ≠ app push z N1 retry (`cloud-batch-set-retry` + `__wgdomSyncMetrics`) — bez rozdzielenia assertów H4 miesza warstwy | Architektura |
| **RC-5** | `batchSetRetries` jest **probabilistyczny** na spokojnym prod; traktowanie `0` jako FAIL = flaky | Semantyka AC |

**Nie-RC (wykluczone):** awaria prod, regresja fence, regresja rollover, defect Edge API, potrzeba DEADLOCK-N2.

---

## 2. Constraints zamrożone z AUDIT / Parent DF (wejście porównania)

| Constraint | Reguła |
|------------|--------|
| **D5 ZERO Core** | Zero zmian `cloud-sync.ts` / Edge / merge / Payroll / Theme / App version |
| **D4** | Brak nowego klucza KV w MVP |
| **#PSB-001…015** | Allowlist / `psb-*` / mutate-guard / cleanup / dry-run / no Core logic ownership |
| **Forbidden dual-writer** | Zakaz celowego 2-tab deadlock / storm (N2 OUT) |
| **`batchSetRetries=0 ≠ FAIL`** | Metrics = snapshot / WARNING; FAIL tylko 5xx / `ok:false` / mutate denied / cleanup FAIL |
| **Izolacja od Production data** | Mutacje wyłącznie sandbox-entity; nigdy replace-all bez filtracji |
| **REUSE FIRST** | `kv-client`, H0 guards, wzorce H1/H2 nested + anti-wipe |
| **Payroll fence** | Zero write na kluczach payroll / week roster |

### 2.1 FORBIDDEN keys (write) — RCA baseline

H4 **nigdy** nie wykonuje `batch-set` na:

| Grupa | Klucze (min. set) | Powód |
|-------|-------------------|--------|
| **Payroll rdzeń** | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive` | Resurrection / PWRB / Domain Push |
| **Payroll tombstones / leaves** | `kw-week-employees-deleted-ids`, `kw-employee-leaves`, `kw-employee-leaves-deleted-ids` | Roster resurrection / overlay |
| **Auth / ACL** | `kw-admin-hash`, `kw-admin-passwords`, `kw-admin-users-config`, `kw-app-settings` | Security |
| **Billing settlements** | `kw-recoverable-charges` (+ deleted-ids) | Ledger operacyjny |
| **Pełny replace non-sandbox** | Jakikolwiek klucz z payloadem = cała produkcyjna kolekcja bez zachowania non-`psb-*` | Wipe P0 |

**ALLOWED write (wariant A):** wyłącznie **nested** encja `psb-*` wewnątrz istniejącego klucza domenowego już używanego przez PSB (preferencja: wzorzec H1 `kw-tenders-pipeline` + `kw-tenders-deleted-ids` **lub** wzorzec H2 `kw-jobs` + `kw-jobs-deleted-ids`) — z read-merge-filter-write i cleanup.

**ALLOWED read:** dowolne klucze potrzebne do preflight / parity sandbox (w tym RO payroll jak H3-A — **bez** set).

---

## 3. Wariant A — Nested `psb-*` write-surface

### Definicja

H4 primary path:

```text
preflight (--allow-prod | dry-run)
  → batch-get(klucz domenowy ALLOWED)
  → wstaw / zaktualizuj wyłącznie encję psb-* (mutate-guard)
  → batch-set(ten sam klucz, payload = produkcja ∪ psb-*  LUB  produkcja z usuniętym psb-* przy cleanup)
  → batch-get parity (encja obecna / usunięta)
  → opcjonalnie: snapshot metrics (obserwacja, nie gate FAIL)
  → PSB-001 cleanup
```

Write-surface = **Edge KV nested sandbox** przez istniejący `kv-client` · **nie** nowy KV · **nie** full-key wipe.

### 3.1 Zalety

- Spełnia Parent DF H4 AC: `batch-get` + `batch-set` + `ok:true` + cleanup.
- REUSE FIRST: ten sam wzorzec co H1/H2 (seed nested, anti-wipe, tombstone deleted-ids, hydrate lessons).
- Deterministyczny PASS/FAIL na transporte Edge (status, `ok`, parity ID).
- Izolacja danych: non-`psb-*` pozostają nietknięte przy poprawnym merge.
- D5: zero potrzeby edycji Core — harness only.
- Dry-run: plan mutacji bez `batch-set` (już w H0/H1).

### 3.2 Wady

- `kv-client.batchSet` **omija** pętlę N1 w app → **nie** gwarantuje inkrementu `batchSetRetries`.
- Wymaga dyscypliny merge (błąd = wipe) — wyższe ryzyko operatorskie niż pure RO.
- Krótkotrwała obecność `psb-*` w produkcyjnym kluczu domenowym (akceptowane już przez H1/H2).
- Możliwa kolizja z równoległym browser sync (lekcja H1) — wymaga settle / anti-resurrect jak H1.

### 3.3 Wpływ na D5 ZERO Core

| | |
|--|--|
| **Impact** | **ZERO** — tylko `test-infra/prod-sandbox/**` (+ manifest suite) |
| **Ryzyko naruszenia** | Niskie, o ile agent nie „dopisze retry” do Core |

### 3.4 Ryzyko regresji

| Ryzyko | P | Mitygacja RCA |
|--------|---|----------------|
| Wipe non-sandbox | P0 | Read → filter → write; mutate-guard; never replace-all na ślepo |
| Orphan `psb-*` | P0 | PSB-001 + deleted-ids (jak H1/H2) |
| Browser resurrect | P1 | Wzorzec H1 settle / re-filter |
| Dotknięcie FORBIDDEN | P0 | Hard deny lista §2.1 |

### 3.5 REUSE FIRST

| Reuse | Źródło |
|-------|--------|
| `kv-client.mjs` | H0/H1/H2 |
| markers / mutate-guard / cleanup / report / allowlist | H0 |
| Nested seed + deleted-ids + anti-wipe | H1 tender-helpers / H2 job-helpers |
| Exit codes / runner registration pattern | H1–H3 |
| **Nie reuse** | Logika domeny Przetargi/Roboty (PDF, photos UI) — H4 = Cloud-only |

### 3.6 Wpływ na Payroll Resurrection Fence

| | |
|--|--|
| **Impact** | **Brak**, o ile FORBIDDEN keys przestrzegane |
| **Ryzyko** | Tylko przy błędnym włączeniu `kw-week-*` do write — **zakazane** |
| **Fence / `payroll-bootstrap-resurrection-fence.ts`** | Poza zakresem H4 · zero interakcji |

### 3.7 Wpływ na Cloud Sync

| | |
|--|--|
| **Kod sync** | Bez zmian (D5) |
| **Runtime** | Krótki dodatkowy `batch-set` sandbox — jak H1/H2; może wywołać naturalny pull na innych sesjach |
| **N1 retry path** | Nie ćwiczy bezpośrednio (raw Edge) — akceptowalne: AC „retry observe” ≠ „force retry” |
| **Merge / PWRB / Domain Push** | Nie dotyka |

### 3.8 Zgodność z SSOT

| SSOT | A |
|------|---|
| Parent DF § H4 AC (get/set/metrics) | **TAK** (set = primary; metrics = soft) |
| D4 brak nowego KV | **TAK** |
| D5 ZERO Core | **TAK** |
| #PSB-008/009 no domain logic ownership | **TAK** (transport + markers only) |
| N1 CLOSED observe-only | **TAK** (brak dual-writer) |
| PLAN § H4 nested sandbox | **TAK** |

### 3.9 Zakres zmian (orientacyjny — nie IMPLEMENT)

| IN | OUT |
|----|-----|
| `scenarios/h4-cloud.mjs` | Core / Edge / UI version |
| Rejestracja w `runner.mjs` | Nowy KV |
| Manifest `PROD-SANDBOX-H4` | H3-B/C, H5, N2 |
| Reuse helpers H0 (+ cienkie cloud-helpers jeśli potrzeba, bez duplikatu merge domeny) | Fork drugiego KV clienta |
| Report: steps, `ok`, mutatedIds, cleanup, **opcjonalny** metrics snapshot | FAIL na `batchSetRetries=0` |

### 3.10 Rekomendacja cząstkowa A

**AKCEPTUJ jako primary write-surface H4.**

---

## 4. Wariant B — Telemetry (`__wgdomSyncMetrics`) write-surface

### Definicja

H4 primary path oparty o **obserwację** metryk sync w runtime app:

```text
preflight
  → (opcjonalnie) otwórz app / zaloguj
  → odczyt __wgdomSyncMetrics() / getSyncMetrics
  → zapisz batchSetRetries (+ inne) do report
  → PASS jeśli metrics API osiągalne
```

„Write-surface” w nazwie Ownera = **powierzchnia weryfikacji** oparta o telemetry, nie o celowy nested KV write. Aby w ogóle zobaczyć non-zero retries, trzeba by **sprowokować** sync (UI save / natural traffic) — to albo:

- **B1 (pure telemetry RO):** zero celowego `batch-set` harnessa;
- **B2 (telemetry + incidental write):** write przez UI/CloudLoader — wtedy realny write-surface wraca do domeny / Core path, nie do izolowanego Edge harness.

RCA ocenia **B jako primary** (bez A). Hybryda A+soft metrics = §6.

### 4.1 Zalety

- Ćwiczy **rzeczywisty** SSOT metryk app (`__wgdomSyncMetrics` / `cloud-sync-throttle`).
- Przy B1: **minimalne** ryzyko wipe KV (brak harness `batch-set`).
- D5 łatwe do utrzymania przy czystym odczycie metrics.
- Blisko semantyki „retry observe” z AC.

### 4.2 Wady

- **Nie spełnia** Parent DF H4 AC wymagającego `batch-set` sandbox + `ok:true` jako assert.
- `batchSetRetries=0` jest **normą** na spokojnym prod → bez soft-WARNING scenariusz jest pusty albo flaky.
- B2 (wymuszenie write przez UI) = **nieizolowany** write, ryzyko payroll/jobs, blisko dual-session side effects; słaby REUSE H0 mutate-guard na Edge.
- Nie weryfikuje izolowanego kontraktu Edge `batch-get`/`batch-set` (to robi już częściowo H1/H2 domenowo — B nie domyka luki izolacji Cloud).
- Playwright + login cięższy niż thin Edge round-trip.
- Mylące jako „write-surface”: telemetry jest **read model**.

### 4.3 Wpływ na D5 ZERO Core

| | |
|--|--|
| **B1** | **ZERO** Core |
| **B2** | Presja na „dopisać hooki / force sync / expose metrics” → ryzyko naruszenia D5 |
| **Ocena** | B1 bezpieczne, ale **niekompletne** względem AC |

### 4.4 Ryzyko regresji

| Ryzyko | P | Uwaga |
|--------|---|--------|
| Flaky FAIL na retries=0 | P1 | Narusza regułę Ownera jeśli źle zamrożone |
| B2 UI write na złym module | P0 | Może dotknąć payroll / real jobs |
| Fałszywy PASS bez realnego Cloud write | P1 | Coverage theater |
| Dual-writer przy „stymulacji” N1 | P1 | Zakazane |

### 4.5 REUSE FIRST

| | |
|--|--|
| Reuse | H3-A pattern (RO observe), App metrics API |
| Słaby reuse | H1/H2 nested KV guards — B1 ich nie używa do write |
| Duplikat | Ryzyko drugiego „metrics poller” zamiast jednego read `__wgdomSyncMetrics` |

### 4.6 Wpływ na Payroll Resurrection Fence

| | |
|--|--|
| **B1** | Brak |
| **B2** | **Wysokie**, jeśli stymulacja sync idzie przez Lista Płac / bootstrap — **niedopuszczalne** jako primary H4 |

### 4.7 Wpływ na Cloud Sync

| | |
|--|--|
| **B1** | Zero mutacji; tylko odczyt metryk (może być 0) |
| **B2** | Ćwiczy app push path + N1, ale **miesza** H4 z domeną i narusza izolację „Cloud slice” |
| **Wniosek** | B nie izoluje Edge od Production workflow |

### 4.8 Zgodność z SSOT

| SSOT | B jako primary |
|------|----------------|
| Parent DF § H4 `batch-set` sandbox | **NIE** (B1) / **częściowo nieizolowane** (B2) |
| D4 / D5 | B1 TAK · B2 ryzykowne |
| N1 observe-only | TAK (semantyka), ale bez deterministycznego set |
| PLAN § H4 nested **lub** telemetry-only | Telemetry-only = **słabsze** pokrycie (AUDIT A3/A5) |
| `batchSetRetries=0 ≠ FAIL` | Wymaga soft semantics — OK, ale wtedy AC set nadal pusty |

### 4.9 Zakres zmian (orientacyjny)

| IN | OUT |
|----|-----|
| Playwright read metrics | Spełnienie pełnego H4 AC |
| Report snapshot | Deterministyczny Edge set assert |
| | Bezpieczny izolowany Cloud write proof |

### 4.10 Rekomendacja cząstkowa B

**ODRZUĆ jako primary write-surface.**  
**DOPUŚĆ wyłącznie jako soft observational appendix** do A (nie gate FAIL).

---

## 5. Porównanie syntetyczne A vs B

| Kryterium | A Nested `psb-*` | B Telemetry primary |
|-----------|------------------|---------------------|
| 1. Zalety | Pełny AC get/set; reuse H1/H2; determinism | Niskie ryzyko wipe (B1); SSOT metrics |
| 2. Wady | Omija N1 loop; wymaga merge discipline | Nie spełnia set AC; flaky/puste retries |
| 3. D5 ZERO Core | ✅ | B1 ✅ · B2 ⚠️ |
| 4. Regresja | P0 kontrolowane guardami | B1 niska coverage · B2 P0 domena |
| 5. REUSE FIRST | ✅ silne | ⚠️ słabe vs H1/H2 write |
| 6. Resurrection Fence | ✅ zero (FORBIDDEN) | B1 ✅ · B2 ❌ ryzyko |
| 7. Cloud Sync kod | ✅ zero zmian | ✅/⚠️ |
| 8. SSOT / Parent AC | ✅ | ❌ jako primary |
| 9. Zakres | Scenariusz + runner + manifest | Metrics-only = under-scope |
| 10. Werdykt | **PRIMARY** | **NIE primary** · soft only |

**Wariant C (nowy KV diagnostyczny):** ponownie **ODRZUCONY** (D4) — bez osobnego Owner GO poza tym RCA.

---

## 6. Rekomendacja końcowa (jednoznaczna)

### 6.1 Decyzja architektoniczna

```text
H4 write-surface = WARIANT A (Nested psb-* via Edge kv-client)
H4 metrics       = SOFT APPENDIX (obserwacja __wgdomSyncMetrics LUB report field
                     batchSetRetries z runa — NIE wymagane do PASS;
                     batchSetRetries=0 ≠ FAIL)
H4 dual-writer   = ZAKAZ
H4 FORBIDDEN     = §2.1 (payroll + auth + full wipe)
H4 Core          = D5 ZERO
```

### 6.2 Uzasadnienie

1. **Parent DF / PLAN** wymagają `batch-set` sandbox + `ok:true` — tylko A to dostarcza izolowanie i deterministycznie.
2. **REUSE FIRST** — H1/H2 już udowodniły bezpieczny nested pattern; H4 powinien być **cieńszym** Cloud slice tego wzorca, nie nową filozofią telemetry.
3. **D5 ZERO Core** — A nie potrzebuje zmian sync; B2 naciskałby na Core/UI.
4. **Resurrection Fence** — A z FORBIDDEN keys = zero interakcji z payroll bootstrap.
5. **N1** — CLOSED; H4 nie re-testuje deadlock. Observacja retries jest **nice-to-have**, nie proof. Raw Edge round-trip ≠ app retry loop (RC-4) — świadomie akceptujemy: izolujemy **Edge transport**, nie reimplementujemy N1.
6. **Izolacja od Production** — nested `psb-*` + mutate-guard + PSB-001 > telemetry theater bez set.

### 6.3 Preferowany klucz domenowy (wskazanie RCA → PLAN)

| Preferencja | Klucz | Uzasadnienie |
|-------------|-------|--------------|
| **1 (preferowany)** | `kw-tenders-pipeline` (+ `kw-tenders-deleted-ids` przy cleanup) | H1 helpers dojrzałe; mniejsza powierzchnia niż photos/storage H2 |
| **2 (alternatywa)** | `kw-jobs` (+ `kw-jobs-deleted-ids`) | Też sprawdzone w H2; większa złożoność (photos OUT dla H4) |
| **Zakaz** | Payroll / auth / charges | §2.1 |

H4 **nie** powiela UI PDF/photos — tylko minimalny marker entity `psb-cloud-*` (lub reuse id pattern) pod kątem round-trip.

### 6.4 Semantyka PASS / WARNING / FAIL (RCA → wejście PLAN)

| Wynik | Warunek |
|-------|---------|
| **FAIL** | Brak `--allow-prod` (gdy wymagane) · mutate denied · `batch-set` !ok / 5xx · parity sandbox fail · cleanup leftovers · write na FORBIDDEN |
| **WARNING** | `batchSetRetries=0` lub metrics niedostępne (brak page / API) |
| **PASS** | get→set→get parity sandbox OK · cleanup PASS · (metrics opcjonalnie w report) |

---

## 7. Co H4 **nie** rozwiązuje

- CLOUD-P0-DEADLOCK-N2 / sztuczny deadlock
- H0.x Persist Ledger
- H3-B/C payroll save
- H5 Biblioteka
- Zmiany Protected Core / fence / rollover
- CI Gate B/C auto prod
- Nowy klucz KV

---

## 8. Wejście do PLAN (stop gate)

| | |
|--|--|
| **Status RCA** | **COMPLETE** |
| **Rekomendacja** | **Wariant A primary** + soft metrics appendix · **B odrzucony jako primary** |
| **IMPLEMENT** | **BLOCKED** |
| **Następny etap** | **PLAN** — wyłącznie po Owner GO |

```text
RCA COMPLETE → czekaj OWNER GO
  „GO PLAN TEST-HARNESS-01 H4”
Bez GO: zero PLAN / DESIGN FREEZE / ARCH REVIEW / kodu / commit / push / bump wersji.
```

**Deliverable:** ten plik · [`TEST-HARNESS-01-H4-AUDIT.md`](TEST-HARNESS-01-H4-AUDIT.md) pozostaje SSOT wejścia.
