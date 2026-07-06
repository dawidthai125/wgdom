# #5C-5C F3 — Telemetria i obserwacja POST F2

> **Status:** **OBSERVATION ACTIVE** (read-only · bez IMPLEMENT F3)  
> **Ostatnia aktualizacja:** 2026-07-06  
> **Prod baseline:** **2.63.53** · **`e3daa6d`**  
> **SSOT freeze:** [`CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md`](./CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md) § F3.8  
> **F2 closeout:** [`CORE-5C-5C-F2-CLOSEOUT.md`](./CORE-5C-5C-F2-CLOSEOUT.md)

---

## 1. Dla agentów AI — co pilnować

| Obszar | Sygnał zdrowia | Akcja przy P0 |
|--------|----------------|---------------|
| **Work Catalog** | zapis tylko `saveWorkCatalogRouted`; read work SSOT | **NIE** przywracać legacy router bez AUDIT |
| **Payroll** | zero diff F1/F2 w sync LP | [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |
| **Cloud Sync** | deferred bootstrap bez `kw-wgdom-cost-catalog` w sync plane (#5C-5A) | **NIE** dodawać legacy key do `DATA_KEYS` |
| **ONE-SHOT migrate** | `console.info` w DevTools: skip vs `ONE_SHOT_MIGRATE` | Zbierz T5; **NIE** usuwać bootstrapu bez F3 GO |

**Zakaz bez Owner GO:** IMPLEMENT F3 · ONE-SHOT sunset · delete `wgdom-cost-catalog-store.ts` · zmiany `cloud-sync.ts` poza planowany minimal F3-R05.

---

## 2. ONE-SHOT migrate — call graph (prod)

```text
CloudLoader → fetchAndMergeDeferredBootstrap (cloud-sync)
  → finalizeWorkCatalogAfterDeferredMerge (work-catalog-bootstrap.ts)
       skip: already_migrated | priced_work_exists | legacy_empty
       migrate: legacy_present + pusty work bez migratedFromLegacyAt
       → migrateLegacyCostCatalogStoreToWorkCatalog
       → saveWorkCatalogRouted (post-F2)
```

**Scenariusz A:** `migratedFromLegacyAt` set → zero legacy LS read.  
**Scenariusz B:** legacy LS z danymi + work pusty → ONE-SHOT (ryzyko F3).  
**Telemetria:** brak pipeline serwerowego — tylko KV audit + DevTools + LS forensics.

---

## 3. Macierz telemetrii T1–T7 (gate AUDIT F3)

| ID | Metryka | Próg GO | Źródło | Stan (2026-07-06) |
|----|---------|---------|--------|-------------------|
| **T1** | `migratedFromLegacyAt` na kontach admin | **100%** | KV `kw-wgdom-work-catalog` / backup | **NOT COLLECTED** |
| **T2** | Scenariusz B (legacy LS + pusty work) | **0** znanych | LS forensics per urządzenie | **NOT VERIFIED** |
| **T3** | `catalogWriteMode` | **work_only** (lub ops-approved) | `kw-app-settings` | **NOT AUDITED** |
| **T4** | Soak od #5C-5B (**2.63.51**, 2026-07-06) | **≥ 14 dni** | release log | **~0 dni** → review **~2026-07-20** |
| **T4b** | Soak F2 (**2.63.53**) | **≥ 48 h** bez P0 katalogu | monitoring | **~0 h** → review **2026-07-08** |
| **T5** | Zdarzenia ONE-SHOT | brak nieoczekiwanych po T1=100% | DevTools log | **NO PIPELINE** |
| **T6** | LS legacy discovery | tabela urządzeń × klucze LS | ręczny odczyt LS | **NOT COLLECTED** |
| **T7** | Runbook ops manual migrate | opublikowany + sandbox PASS | DF §F3.5 | **NOT STARTED** |

**Werdykt telemetrii:** **0/7 PASS** → **AUDIT F3 = NO GO**

### Szablon T6 (właściciel)

| Urządzenie / konto | `kw-wgdom-work-catalog` | `migratedFromLegacyAt` | `kw-wgdom-cost-catalog` (LS) | Scenariusz |
|--------------------|-------------------------|--------------------------|------------------------------|------------|
| Dawid / desktop | | | | A / B / — |
| Stanisław | | | | |
| Pawel | | | | |

---

## 4. Harmonogram obserwacji (bez kodu)

| Kiedy | Działanie |
|-------|-----------|
| **D+0…D+2** | Monitor `version.json`; brak P0 Work Catalog / Payroll / Sync |
| **D+1…D+3** | Zbierz **T1, T3, T6** (KV + LS) |
| **≥ 2026-07-08** | **T4b** — 48 h soak F2 |
| **≥ 2026-07-20** | **T4** — 14 dni soak #5C-5B |
| **Przed AUDIT F3** | **T7** runbook + sandbox |

---

## 5. GO / NO GO — przyszły AUDIT F3

| Warunek | Status |
|---------|--------|
| F1 + F2 CLOSED | **TAK** |
| T1–T7 spełnione | **NIE** |
| Runbook ops | **NIE** |
| Owner GO F3 | **brak** |

**Rekomendacja:** **NO GO** na AUDIT/IMPLEMENT F3 do zebrania evidencji.

---

## 6. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`CORE-5C-5C-LEGACY-CLEANUP-AUDIT.md`](./CORE-5C-5C-LEGACY-CLEANUP-AUDIT.md) | Removal matrix · call graph |
| [`CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md`](./CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md) | ONE-SHOT semantics |
| [`AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md) | Kontekst sesji |
| [`AGENT-APP-MAP.md`](../AGENT-APP-MAP.md) | Mapa widoków · KV · sync |
