# TEST-HARNESS-01 H5 — RCA

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Etap:** **RCA COMPLETE** · **NIE implementować** · **NIE PLAN** bez Owner GO  
> **Data:** 2026-07-20  
> **Owner GO RCA:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H5-AUDIT.md`](TEST-HARNESS-01-H5-AUDIT.md) **ACCEPTED**  
> **Baseline prod:** UI **2.65.35** · tip **`1addd97`** · app feature **`fce7b78`** · **PRODUCTION VERIFIED · GREEN**  
> **Klasa problemu:** luka coverage / test-infra — **nie** bug produkcyjny  
> **IMPLEMENT:** **BLOCKED**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · MOBILE FIRST · D5 ZERO Core

---

## 0. Problem statement (potwierdzony)

Parent DF/PLAN wymagają scenariusza H5:

```text
Create psb-* → keyword → edit → delete → batch-get parity → cleanup PASS
```

Runner (`1addd97`) zwraca `PSB_SCENARIO_NOT_IMPLEMENTED` dla H5. Stability sweep kończy Bibliotekę **WARNING** (skip write).

**Blokada bezpiecznego startu:** Parent PLAN literal wskazuje persist na `kw-wgdom-cost-catalog`, podczas gdy produktowa Biblioteka Robót + CRUD wierszy z `keywords[]` żyją w `kw-wgdom-work-catalog`. Bez jednoznacznej decyzji write-surface PLAN/DF nie mogą zamrozić AC.

H5 **nie** naprawia UI ACL Biblioteki, ATH classifier, Payroll, Theme ani Edge.

---

## 1. Root cause (warstwy)

| ID | Przyczyna | Typ |
|----|-----------|-----|
| **RC-1** | Slice H5 nigdy nie zaimplementowany; H0–H4 zamknięte/released — naturalna kolejność D12 | Coverage / kolejność |
| **RC-2** | Stability celowo skip write Biblioteki → WARNING maskuje lukę formalnego harnessa | Coverage gap |
| **RC-3** | **SSOT drift:** PLAN (`cost-catalog`) ≠ produktowy model Biblioteki (`work-catalog`) | Architektura / docs |
| **RC-4** | Legacy cost catalog = **fixed seed categories** (keywords na kategorii) — brak naturalnego Create/Delete wiersza `psb-*` bez trucizny klasyfikacji | Model domeny |
| **RC-5** | `kw-wgdom-cost-catalog` **wyciszony** w sync app (`DATA_KEYS` bez tego klucza; changelog: deferred fetch/merge/push) — literał PLAN jest **stale** względem aktywnej chmury | Sync / SSOT |

**Nie-RC (wykluczone):** bug prod UI 2.65.35 · regresja H4 · defect Edge API · potrzeba nowego KV (D4) · zmiana Core.

---

## 2. Constraints (wejście porównania)

| Constraint | Reguła |
|------------|--------|
| **D5 ZERO Core** | Zero zmian `cloud-sync.ts` / Edge / merge / Payroll / Theme / App version |
| **D4** | Brak nowego klucza KV |
| **#PSB-001…015** | Tylko `psb-*` / allowlist · mutate-guard · cleanup · dry-run |
| **Parent H5 AC** | Create · keyword · edit · delete · cleanup |
| **REUSE FIRST** | H0 runner + H4 KV-only pattern · zero drugiego clienta |
| **Payroll / Theme / Edge** | Zero wpływu funkcjonalnego |

---

## 3. Wariant A — `kw-wgdom-work-catalog` (preferowany AUDIT)

### Definicja

Write-surface = **Work Catalog Store** (`WORK_CATALOG_STORAGE_KEY`):

- Model: `CatalogWork` z polem `keywords: string[]`, `id`, `namePl`, `active`, …
- Operacja H5: nested RMW — `batch-get` → upsert/edit/delete wyłącznie wierszy `id`/`name` z prefixem `psb-*` w `catalogs[region].works[]` → bump `updatedAt` → `batch-set` → parity → cleanup
- Klucz **jest** w `DATA_KEYS` i ma dedykowany merge `mergeWorkCatalogStore` (LWW całego store)

### 3.1 Wpływ na architekturę

| Aspekt | Ocena |
|--------|--------|
| Warstwa testów | Nowy scenariusz PSB w istniejącej architekturze H0/H4 — **FEATURE/test-infra** |
| Model danych | Zgodny z produktem „Biblioteka Robót” (`types.ts` SSOT) |
| Sync app | Aktywny klucz chmury — harness ćwiczy **tę samą** powierzchnię co UI Biblioteki |
| Merge LWW store-level | Wymaga dyscypliny RMW + bump `updatedAt` (ryzyko wyścigu P1 — mitygowalne bez Core) |
| Edge | Tylko `batch-get`/`batch-set` przez `kv-client` — **bez** zmiany Edge |

### 3.2 Zgodność z SSOT

| SSOT | Zgodność |
|------|----------|
| Produkt Biblioteka Robót | **TAK** — `kw-wgdom-work-catalog` |
| Parent H5 AC (CRUD + keyword) | **TAK** — keyword na wierszu `CatalogWork` |
| Parent PLAN literal `cost-catalog` | **NIE** (literał) — wymaga **korekty AC w PLAN/DF** (docs), nie zmiany produktu |
| D1 Marked entities / D6 `psb-*` | **TAK** — naturalne `id` / `namePl` z prefixem |
| D4 / D5 | **TAK** |

**Werdykt SSOT:** wariant A = **SSOT produktowy**. Literał PLAN jest **do supersedowania** w DF H5 (nie w kodzie Core).

### 3.3 REUSE

| Komponent | REUSE |
|-----------|--------|
| `kv-client` · runner · markers · mutate-guard · cleanup · allowlist `catalogRowIds` | **TAK** |
| H4 nested + FORBIDDEN pattern | **TAK** (pattern; nowa allowlista kluczy katalogu) |
| H1 `tender-helpers` | **NIE kopiować** — osobny cienki `catalog-helpers` (ZERO DUPLICATE domeny) |
| `mergeWorkCatalogStore` w harnessie | **NIE** — raw nested RMW; merge zostaje SSOT app |

### 3.4 Ryzyko P0

| Ryzyko | P | Ocena wariantu A |
|--------|---|------------------|
| Wipe katalogu (replace-all) | P0 | **Kontrolowane** przy obowiązkowym RMW + preservacja non-`psb-*` |
| Keyword seed / trucizna ATH | P0 | **Niskie** — nie edytuje kategorii cost-catalog; tylko własny wiersz `psb-*` |
| Orphan `psb-*` | P0 | **Kontrolowane** — PSB-001 `finally` (jak H1/H2/H4) |
| Wyścig LWW store | P1 | RMW + świeży `updatedAt`; nie pisać pustego store |

### 3.5 D5 ZERO Core

**PASS.** Zero konieczności edycji `cloud-sync`, merge, Edge, App. Tylko `test-infra/prod-sandbox/**` + docs + manifest.

### 3.6 Payroll · Theme · Edge

| Obszar | Wpływ |
|--------|--------|
| Payroll | **ZERO** — klucz poza payroll; FORBIDDEN gate jak H4 |
| Theme | **ZERO** |
| Edge Function | **ZERO zmian kodu** — użycie istniejącego API |
| UI / CHANGELOG version | **ZERO** (tooling) |

### 3.7 Złożoność implementacji (orientacyjna — nie projekt)

| | |
|--|--|
| Effort | **Niski–średni** (0.5–1 d jak Parent PLAN H5) |
| Główna praca | Jeden scenariusz + helper wiersza `CatalogWork` minimalnego + wiring runner/manifest |
| Pułapka | RMW + LWW `updatedAt` · schema v4 pola wymagane przez normalizer |

### 3.8 Rekomendacja wariantu A

**REKOMENDOWANY jako PRIMARY write-surface H5.**

---

## 4. Wariant B — `kw-wgdom-cost-catalog`

### Definicja

Write-surface = **legacy WGDOM Cost Catalog** (`WGDOM_COST_CATALOG_KEY`):

- Model: stałe `categories[]` z ID typu `ELEKTRYKA`, `MALOWANIE`, … + `keywords: string[]` **na kategorii**
- Normalizer (`normalizeWgdomCostCatalogStore`) mapuje **wyłącznie** po `def.categories` — obce ID kategorii **nie** stają się trwałymi „wierszami sandbox”
- Klucz **nie** jest w aktualnym `DATA_KEYS` (sync wyciszony / deferred); w `DATA_KEYS` zostaje m.in. `kw-wgdom-cost-catalog-history` oraz **`kw-wgdom-work-catalog`**

### 4.1 Wpływ na architekturę

| Aspekt | Ocena |
|--------|--------|
| Warstwa testów | Formalnie możliwy raw Edge write, ale **mijający** aktywny produkt Biblioteki |
| Model danych | Brak Create/Delete wiersza — tylko mutacja keyword/rates na seed |
| Sync app | Harness pisałby klucz, którego app **nie traktuje** jako aktywnego SSOT sync → fałszywe poczucie coverage |
| Klasyfikacja ATH / wycena | Keywords kategorii = silnik klasyfikacji — mutacja = wpływ na ranking pozycji przetargowych |
| Edge | Bez zmiany kodu Edge, ale zły kontrakt danych |

### 4.2 Zgodność z SSOT

| SSOT | Zgodność |
|------|----------|
| Parent PLAN literal | **TAK** (tekst) |
| Produkt „Biblioteka Robót” | **NIE** |
| Parent H5 AC Create/Delete row | **SŁABA / FAŁSZYWA** — brak encji wiersza; „create” musiałby fałszować kategorię lub doklejać poza normalizerem |
| D6 marked entities | **Wymuszone** na polach seed (niebezpieczne) lub niemożliwe jako nowy ID |
| Aktywny cloud DATA_KEYS | **NIE** — klucz poza aktywną listą sync |

**Werdykt SSOT:** zgodność z **przestarzałym literałem PLAN**, **niezgodność** z SSOT produktowym i sync.

### 4.3 REUSE

| Komponent | REUSE |
|-----------|--------|
| H0/H4 KV infrastructure | Technicznie **TAK** |
| Semantyka H5 AC (CRUD row) | **NIE** — nie mapuje się 1:1 |
| Helpers work-catalog | **NIE** — inny model |
| Klasyfikatory / seed defs | Zakaz ownership (#PSB-009) — nie „naprawiać” seed w harnessie |

### 4.4 Ryzyko P0

| Ryzyko | P | Ocena wariantu B |
|--------|---|------------------|
| Wipe katalogu | P0 | **Wysokie** przy błędnym replace-all całego store |
| Keyword seed / trucizna ATH | P0 | **WYSOKIE — inherentne** — R2 „keyword” = edycja seed category keywords |
| Orphan `psb-*` | P0 | **Słaba semantyka** — brak naturalnego wiersza; „orphan” może oznaczać trwale zmienione keywords prod |
| False coverage | P1 | Test „zielony” na kluczu poza aktywnym sync Biblioteki |
| History side-effect | P1 | `kw-wgdom-cost-catalog-history` — OUT, ale łatwy drift jeśli agent „przy okazji” |

### 4.5 D5 ZERO Core

**Warunkowy PASS** tylko jeśli harness nie „przywraca” cost-catalog do `DATA_KEYS` / nie odwraca wyciszenia sync.  
**FAIL ryzyka procesowego:** Agent może zaproponować „naprawę sync cost-catalog” = **naruszenie D5** i scope creep poza H5.

### 4.6 Payroll · Theme · Edge

| Obszar | Wpływ |
|--------|--------|
| Payroll | **ZERO** bezpośredni |
| Theme | **ZERO** |
| Edge kod | **ZERO** |
| **Wycena / klasyfikacja przetargów** | **WYSOKI wpływ biznesowy** (nie Payroll, ale **operacyjny P0**) |

### 4.7 Złożoność implementacji

| | |
|--|--|
| Effort | **Niski technicznie, wysoki ryzykownie** |
| Główna praca | Mutacja keywords na istniejącej kategorii + „cleanup” = restore keywords |
| Pułapka | Cleanup musi odtworzyć **dokładny** stan seed — flaky przy concurrent admin edit; Create/Delete AC niespełnialne uczciwie |

### 4.8 Rekomendacja wariantu B

**ODRZUCONY jako PRIMARY write-surface H5.**  
Dopuszczalny wyłącznie jako osobny program (np. „Cost Catalog keyword regression”) po **osobnym Owner GO** — **nie** w H5 Biblioteka.

---

## 5. Macierz porównawcza (A vs B)

| Kryterium | **A `work-catalog`** | **B `cost-catalog`** |
|-----------|----------------------|----------------------|
| 1. Wpływ architektury | Scenariusz na aktywnym SSOT Biblioteki | Write na wyciszonym/legacy kluczu |
| 2. Zgodność SSOT | Produkt **TAK** · PLAN literal do korekty docs | PLAN literal **TAK** · produkt **NIE** |
| 3. REUSE H0/H4 | **TAK** + naturalny CRUD row | **TAK** infra · **NIE** semantyka AC |
| 4. P0 wipe | Kontrolowane RMW | Wysokie przy replace-all |
| 4. P0 keyword seed | **Niskie** | **Inherentne P0** |
| 4. P0 orphan | PSB-001 standard | Cleanup = restore seed (kruche) |
| 5. D5 ZERO Core | **PASS** | PASS tylko bez „reaktywacji” sync |
| 6. Payroll / Theme / Edge | ZERO | ZERO kodu · **wpływ ATH/wycena** |
| 7. Złożoność | Niska–średnia, czysta | Niska, ale AC fałszywe / ryzykowne |
| 8. Werdykt | **PRIMARY** | **REJECT** dla H5 |

---

## 6. Rekomendacja końcowa (jednoznaczna)

```text
══════════════════════════════════════
RCA REKOMENDACJA

Write-surface H5 = WARIANT A
  kw-wgdom-work-catalog

Wariant B (kw-wgdom-cost-catalog) = REJECT
  dla TEST-HARNESS-01 H5
══════════════════════════════════════
```

### Uzasadnienie (skrót)

1. **SSOT produktowy** Biblioteki Robót = work-catalog (`CatalogWork.keywords`), nie legacy cost categories.  
2. Parent H5 AC (Create / Edit / Delete wiersza) mapuje się **naturalnie** na A; na B jest **sztuczne lub niemożliwe** bez trucizny seed.  
3. `kw-wgdom-cost-catalog` jest **poza aktywnym `DATA_KEYS`** (wyciszenie sync) — literał PLAN jest **stale** (RC-5).  
4. A zachowuje **D5 ZERO Core**, REUSE H0/H4, izolację Payroll/Theme/Edge.  
5. B wprowadza **P0 inherentne** na keywords klasyfikacji ATH — nieakceptowalne w STABILIZATION WINDOW.

### Konsekwencje dla PLAN / DF (bez IMPLEMENT)

Po Owner GO → PLAN należy:

1. **Supersedować** assert persist: `kw-wgdom-work-catalog` (nie cost-catalog).  
2. Zamrozić: nested RMW · tylko `psb-*` w `works[]` · bump `updatedAt` · PSB-001.  
3. Zamrozić: KV-only MVP (Playwright opcjonalny / soft — ACL UI OUT).  
4. FORBIDDEN: payroll · auth · settings · `kw-wgdom-work-bundles` · mutacja cost-catalog seed.  
5. **Nie** przywracać sync `kw-wgdom-cost-catalog` w tym programie.

---

## 7. Werdykt RCA

| | |
|--|--|
| **RCA** | **COMPLETE** |
| **Primary write-surface** | **A — `kw-wgdom-work-catalog`** |
| **Secondary / H5** | **B — REJECT** |
| **IMPLEMENT** | **BLOCKED** |
| **Następny etap** | czekaj **Owner GO → PLAN** |
| **Production** | nietknięte · **GREEN** |

```text
TEST-HARNESS-01 H5 — RCA COMPLETE
Rekomendacja: WARIANT A (kw-wgdom-work-catalog)
Czekaj OWNER GO → PLAN
```

**Koniec RCA H5** · SSOT: `docs/architecture/TEST-HARNESS-01-H5-RCA.md`
