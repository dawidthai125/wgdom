# TENDERS-SYNC-STORM-P0 — ROOT CAUSE FIX PLAN

> **Status:** **ROOT CAUSE FIX PLAN COMPLETE** · **IMPLEMENT COMPLETE** (patrz [`TENDERS-SYNC-STORM-P0-IMPLEMENT-REPORT.md`](TENDERS-SYNC-STORM-P0-IMPLEMENT-REPORT.md)) · **OWNER VERIFICATION ⏸**  
> **ID:** TENDERS-SYNC-STORM-P0  
> **Data:** 2026-07-23  
> **Owner GO → PLAN:** ✅  
> **Owner GO → IMPLEMENT:** ✅  
> **Wejście:** [`MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md`](MOPS-TENDER-REGRESSION-01-INCIDENT-TIMELINE.md) · PLATFORM RCA H2 (skutek)  
> **Baseline tip:** `ef882d3` · UI **2.65.35** (prod) · WT changelog **2.65.38**  
> **Commit / push:** **ZAKAZ** do Owner GO

```text
WORKFLOW:
  ROOT CAUSE LOCKED ✅
  → OWNER GO → PLAN ✅
  → ROOT CAUSE FIX PLAN ✅
  → OWNER GO → IMPLEMENT ✅
  → IMPLEMENT COMPLETE ✅
  → OWNER GO → OWNER VERIFICATION ⏸
```

---

## 0. Werdykt PLANU

```text
══════════════════════════════════════
ROOT CAUSE FIX PLAN COMPLETE

BREAK CYCLE AT:
  useTenderDossierHeavyLazy useEffect deps
  — usunąć builtAt / wynik parse z deps startujących workera
  — nie cancelować enrichment wyłącznie z powodu persist onUpdate

STOP STORM:
  1) Fix pętli effect (PRIMARY)
  2) Wymusić coalesce/debounce na ścieżce heavy (SECONDARY)
  3) Partial = local/session only; cloud persist ≤ 1× final (TERTIARY)
  4) Circuit breaker per itemId (GUARD)

DELTA (bez new KV):
  Faza 1 = „delta behawioralna” (mniej zapisów)
  Faza 2 = opcjonalny patch API later (OUT tego P0 jeśli schema)

Payroll / StorageManager / Edge merge: ZERO semantic change
══════════════════════════════════════
```

| Pole | Wartość |
|------|---------|
| **Primary file** | `src/app/hooks/useTenderDossierHeavyLazy.ts` |
| **Secondary** | `useTendersPipeline.updateItem` · `tender-pipeline-persist-coalesce` · `app-settings` default |
| **OUT tego PLANU** | New KV keys · Edge schema · Payroll · StorageManager API · Platform 522 remediacja |

---

## 1. Dokładne miejsce przerwania cyklu

### 1.1 Cykl (LOCKED)

```text
heavy useEffect start
  → buildTenderDossierCostPhase
  → onUpdate({ tenderDossier })     // nowy builtAt (± parserVersion)
  → updateItem → saveTendersPipeline / persistKey FULL
  → React: item.tenderDossier.builtAt zmienił się
  → useEffect deps hit
  → cleanup: cancelled=true
  → effect re-run (heavy nie „done”)
  → …∞
```

### 1.2 Punkt przerwania (PRIMARY — obowiązkowy)

**Plik:** `src/app/hooks/useTenderDossierHeavyLazy.ts` · `useEffect` ~L150–277

| Zmiana | Opis |
|--------|------|
| **B1** | Deps **startu workera** = tylko: `enabled`, `itemId`, `gateFingerprint` (docs), `athPreviewEnabled`, `retryNonce` |
| **B2** | **USUNĄĆ** z deps: `item.tenderDossier?.builtAt`, `parserVersion`, `kosztorys?.ok`, `scanSummary?.parsedAt`, oraz `heavyParseDocuments` jeśli już pokryte przez `gateFingerprint` |
| **B3** | Cleanup **nie** ustawia `cancelled=true` przy samym re-renderze z persist — cancel tylko przy: unmount, `itemId` change, `retryNonce`, zmiana `gateFingerprint` (nowe dokumenty) |
| **B4** | Trzymać `runGeneration` / `AbortController` keyed by `(itemId, gateFingerprint)` — persist nie inkrementuje generation |

**Jedno zdanie:** *persist wyniku heavy nie może być sygnałem do ponownego startu heavy.*

### 1.3 Punkt przerwania (SECONDARY)

| Miejsce | Zmiana |
|---------|--------|
| `updateItem` / coalesce | Ścieżka heavy: zawsze `scheduleTenderPipelinePersist` (debounce), nigdy natychmiastowy `saveTendersPipeline` przy partial |
| Default settings | `pipelinePerfDebouncePersist: true` **lub** force-on dla writer `heavy-dossier` bez globalnej flagi UI |

---

## 2. Które `useEffect` rozdzielić

| # | Effect dziś | Po FIX |
|---|-------------|--------|
| **E-RUN** | Start heavy + cancel + persist (jedno) | **Tylko** orkiestracja async parse (stable deps) |
| **E-UI-PARTIAL** | (dziś L105–116) | Zostaje — tylko flagi `partialPersistPending` / `dossierSaving` |
| **E-UI-FINAL** | (dziś L118–130) | Zostaje — completion UI gdy `tenderDossierHeavyParseDone` |
| **E-BOOTSTRAP** | `useTenderDocumentsBootstrap` | **Bez zmian w P0** poza: nie zwiększać storm (cap już 2); opcjonalnie nie zmieniać bootstrapKey od samej długości HTML w osobnym GO |

**Zasada:** E-RUN ≠ E-UI. Completion fields mogą odświeżać UI effects; **nie** wolno im restartować E-RUN.

---

## 3. Które dane **nie mogą** aktualizować `builtAt` (w sensie triggera)

`builtAt` może nadal istnieć na dossier (merge LWW) — ale:

| Pole | Może istnieć na obiekcie? | Może być w deps E-RUN? | Może powodować cloud persist przy każdym ticku? |
|------|---------------------------|-------------------------|--------------------------------------------------|
| `builtAt` | TAK | **NIE** | Partial: **NIE** (local only) |
| `parserVersion` stamp mid-flight | TAK | **NIE** (tylko w gateFingerprint jeśli docs się nie zmieniają — ostrożnie) | Partial: **NIE** |
| `kosztorys.ok` | TAK | **NIE** | Final: TAK (1×) |
| `scanSummary.parsedAt` | TAK | **NIE** | Final: TAK (1×) |
| Doc list / notice fingerprint | TAK | **TAK** (gateFingerprint) | Bootstrap: ograniczone |

**Reguła:** `builtAt = metadata zapisu`, nie `builtAt = sygnał re-parse`.

Opcja implementacyjna (PLAN): przy partial patch **nie bumpować** `builtAt` aż do final enrich — albo bump lokalnie, ale E-RUN tego nie widzi.

---

## 4. Jak uniknąć: onUpdate → persist → reload → onUpdate

```text
DZIŚ:
  onUpdate → setItems → persist cloud → re-render → effect deps → onUpdate

PO FIX:
  onUpdate(local) → setItems
       ├─ E-RUN: IGNORUJE (deps stable / generation)
       ├─ E-UI: aktualizuje spinnery
       └─ persist cloud: TYLKO wg polityki §5–§6
```

Konkretne środki (warstwowo):

1. **Stable E-RUN deps** (§1) — łamie „reload → onUpdate”.  
2. **`onUpdate` options** (bez łamania callerów):  
   `onUpdate(patch, { persist?: "none" | "local" | "cloud" })`  
   - partial heavy → `"local"` (LS lean + session + state)  
   - final heavy → `"cloud"` (coalesce 1×)  
3. **Nie** invalidować `pipeline` session cache przy heavy partial.  
4. **Nie** ustawiać `pipeline.loading=true` przy updateItem.

„Reload” w objawach Ownera = **re-render + restart effect**, nie `location.reload` — plan adresuje to, nie browser reload.

---

## 5. Jak zapisywać wyłącznie delta (bez new KV)

KV dziś = **jeden** klucz `kw-tenders-pipeline` → fizyczny POST i tak niesie pełny JSON value (limit platformy).  
**P0 nie wymaga nowego schematu.**

### Faza D1 — delta behawioralna (IN tego PLANU)

| Zasada | Efekt |
|--------|-------|
| Partial heavy → **brak** `persistKey` / `pushKeysToCloudSafe` | 0 fat get+set na partial |
| Local: `saveTendersPipelineLocal` + `patchPipelineSessionCache` OK | UI/cold zachowane |
| Final heavy → **jeden** coalesce cloud write | 1× get+set zamiast N |
| No-change fingerprint (opcjonalnie REUSE S7-4) | skip push jeśli blob identyczny |

### Faza D2 — delta API (OUT / osobne GO)

- Osobny klucz per tender **lub** Edge patch-merge by id — **zmiana kontraktu KV** → poza P0.  
- Nie blokuje DoD P0.

**DoD P0 delta:** *liczba cloud write na jedno otwarcie detalu ≤ 1 (final) + ewentualnie 1 bootstrap, nie dziesiątki.*

---

## 6. Jeden autosave na jedną rzeczywistą zmianę

| Mechanizm | Opis |
|-----------|------|
| **S1** | Debounce/coalesce **ON** dla writer heavy (500 ms, istniejący `tender-pipeline-persist-coalesce`) |
| **S2** | `cloudInFlight` — kolejne schedule nadpisuje `pendingItems`, nie mnoży równoległych batch-set |
| **S3** | Partial nie woła cloud (§5) |
| **S4** | Final: dokładnie jedna ścieżka `persistTenderPipelineImmediate` **lub** flush debounce — nie oba |
| **S5** | Guard: jeśli `JSON.stringify` fingerprint itemu (lub dossier) == lastPushed → skip |

**Definicja „rzeczywistej zmiany”:** zmiana treści dossier/docs widoczna dla użytkownika / done, nie sam tick `builtAt`.

---

## 7. Zabezpieczenie przed kolejnym heavy dossier

| Guard | Opis |
|-------|------|
| **G1** | Max **1** concurrent heavy per `itemId` (już `dossierInflightIds` — **nie clearować** na cancel z persist) |
| **G2** | Max **2** pełne uruchomienia E-RUN na `(itemId, gateFingerprint)` / mount; potem stop + `dossierParseFailed` / CTA retry |
| **G3** | Po `tenderDossierHeavyParseDone` → E-RUN no-op (już jest) — upewnić się, że final zawsze ustawia `parsedAt` **lub** akceptuje terminal fail bez loop |
| **G4** | Terminal fail: ustaw `scanSummary.parsedAt` lub flagę `heavyTerminalAt` żeby `done`/stop spełnione bez ∞ |
| **G5** | Global soft rate-limit cloud pipeline writes (np. max 1 / 2s) — opcjonalnie, defense in depth |

---

## 8. Testy regresyjne

| ID | Test | Cel |
|----|------|-----|
| **T1** | Unit: mock heavy — po `onUpdate(partial)` effect **nie** restartuje (spy start count = 1) | Break cycle |
| **T2** | Unit: `builtAt` bump w item **nie** zwiększa run generation | Deps |
| **T3** | Unit: zmiana `gateFingerprint` (nowy doc) → dozwolony 2. run | Legitimate re-parse |
| **T4** | Unit/integration: licznik `getTenderPipelineCloudWriteCountForTests` przy 5 partial + 1 final ≤ **1–2** | Storm |
| **T5** | `tenderDossierHeavyParseDone` + terminal fail path stops loop | G4 |
| **T6** | Debounce coalesce: 10× schedule → 1 cloud write | S1–S2 |
| **T7** | Regresja: bootstrap + open detail bez MOPS mock — smoke | Happy path |
| **T8** | Brak regresji merge payroll / cloud-sync non-tenders | Isolacja |

Nowy skrypt (propozycja): `scripts/test-tenders-sync-storm-p0.mjs`.

---

## 9. Wpływ na inne systemy

| System | Wpływ P0 |
|--------|----------|
| **Payroll** | **ZERO** — nie w ścieżce |
| **Cloud Sync (ogólny)** | Tylko mniejsza częstotliwość `persistKey(kw-tenders-pipeline)`; merge/LWW **bez zmian** |
| **StorageManager** | **ZERO** API; mniej wywołań `persistKey` → mniej `saveSync` |
| **Edge** | Mniej batch-get/set + mniej powtórzeń document-bytes; **zero** zmiany handlerów merge |
| **Platform 522** | FIX zmniejsza ryzyko **powtórzenia** exhaustion; **nie zastępuje** remediacji SUPABASE-KV-522-01 jeśli project już stuck |

---

## 10. Plan migracji bez łamania API

```text
Faza M0  — DF / ARCH note (krótka) — opcjonalnie równolegle z IMPLEMENT
Faza M1  — E-RUN deps + cancel policy + inflight (breaking: brak dla callerów)
Faza M2  — onUpdate persist mode (opcjonalny 2. arg; default = obecne zachowanie dla non-heavy)
Faza M3  — heavy partial = local only; final = coalesce cloud
Faza M4  — debounce default true LUB force dla heavy writer
Faza M5  — circuit breaker G2–G4
Faza M6  — testy T1–T8 + changelog UI bump
```

### Kompatybilność API

| API | Breaking? |
|-----|-----------|
| `persistKey(key, value)` | **NIE** |
| `saveTendersPipeline(items)` | **NIE** |
| `updateItem(id, patch)` | **NIE** jeśli 2. arg opcjonalny |
| `useTenderDossierHeavyLazy` public return | **NIE** (te same flagi UI) |
| Feature flags NG11-Q* | Zachowane; P0 może **force** bezpieczne defaulty |

### Feature flag (zalecane)

`tendersSyncStormP0Fix: true` (lub po prostu ship on) — rollback = wyłączenie flagi wraca do starych deps **tylko awaryjnie** (niezalecane długo).

---

## 11. Kolejność IMPLEMENT (gdy Owner GO)

```text
P0-S.1  Break E-RUN deps + cancel/generation          ★ must
P0-S.2  Inflight: nie clear na persist-driven cleanup ★ must
P0-S.3  Partial persist = local only                  ★ must
P0-S.4  Coalesce/debounce na heavy cloud              ★ must
P0-S.5  Circuit breaker G2–G4                         should
P0-S.6  Testy T1–T8 + changelog                       must
P0-S.7  BUILD → TEST → OWNER VERIFICATION
        (nie otwierać MOPS na prod aż platform UP)
```

---

## 12. DoD FIX

```text
DoD =
  T1–T8 PASS
  ∧ cloud writes / open detail ≤ 2
  ∧ brak restartu heavy po samym builtAt bump
  ∧ ZERO payroll/merge/Edge semantic diff
  ∧ npm run build PASS
```

---

## 13. Zakazy (ten etap)

- ❌ Implementacja  
- ❌ Commit / push  
- ❌ New KV / Edge schema  
- ❌ „Przy okazji” Platform 522 restart (osobny playbook)

---

## 14. Następny krok

```text
ROOT CAUSE FIX PLAN COMPLETE

Czekam na: OWNER GO → IMPLEMENT
```
