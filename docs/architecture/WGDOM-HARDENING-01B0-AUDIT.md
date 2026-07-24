# WGDOM-HARDENING-01B0 — AUDIT (Evidence Report)

> **ID:** WGDOM-HARDENING-01B0  
> **STATUS:** AUDIT COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (AUDIT only)  
> **Zakres:** Circuit Breaker Telemetry · **H-FP-CHURN** · `heavyRunAttempts` · per-FP breaker · bounded vs infinite · discovery growth  
> **Zakazane w tej fazie:** implementacja · zmiana breakera / limitów · `HEAVY_E_RUN_DEP_KEYS` · `builtAt` · B1 · CORE · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`e349506`** · EPIC A/D **CLOSED** · **STABILIZATION WINDOW ACTIVE**  
> **Źródła SSOT:**  
> - [`WGDOM-HARDENING-01-AUDIT.md`](./WGDOM-HARDENING-01-AUDIT.md) §H3  
> - [`WGDOM-HARDENING-01-RCA.md`](./WGDOM-HARDENING-01-RCA.md) §3 H3  
> - [`WGDOM-HARDENING-01-PLAN.md`](./WGDOM-HARDENING-01-PLAN.md) EPIC B · B0=H3-C  
> - [`WGDOM-FINAL-PRODUCTION-AUDIT-01.md`](./WGDOM-FINAL-PRODUCTION-AUDIT-01.md)  
> - [`docs/AI/07_KNOWN_RISKS.md`](../AI/07_KNOWN_RISKS.md) **H-FP-CHURN**  
> - [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> - kod tip: `src/app/hooks/useTenderDossierHeavyLazy.ts` · `unified-attachment-gate.ts` · `scripts/test-tenders-sync-storm-p0.mjs`

```text
══════════════════════════════════════
WGDOM-HARDENING-01B0 AUDIT COMPLETE

H-FP-CHURN: Confirmed (bounded residual) · Not Reproduced (infinite storm)
Gap:       No prod telemetry for FP churn / heavyRunAttempts
Mode:      evidence-only · no B1 / no deps change
══════════════════════════════════════
```

---

## 0. Metoda

1. **SSOT FIRST** — Final Audit H3 + HARDENING-01 AUDIT/RCA/PLAN EPIC B + AI/07.  
2. **REUSE FIRST** — odczyt istniejącego kontraktu Sync Storm P0 (T3/T8) i live multi-tender artefaktów (01D/Final Audit); bez nowego harnessu w AUDIT.  
3. **ZERO DUPLICATE** — brak drugiej mapy breakera / drugiej logiki E-RUN w rekomendacjach AUDIT.  
4. **MOBILE FIRST** — churn = koszt CPU/baterii/egress przy ponownym heavy na telefonie; monitor ma chronić przed regresją bez zmiany limitu.  
5. Read-only kod tip **2.65.40** / `23d7723` lineage (heavy hook).

**Poza zakresem AUDIT:** zmiana `HEAVY_MAX_RUNS_PER_KEY`, scope klucza, deps, B1, Autonomous FP (M3/E).

---

## 1. Status H-FP-CHURN

| Claim | Status | Komentarz |
|-------|--------|-----------|
| Breaker jest **per** `(itemId, gateFingerprint, retryNonce)`, max **2** | **Confirmed** | Kod + T3/T8 |
| Nowy FP (discovery growth) **resetuje** licznik attempts | **Confirmed** | By design G2/T3 |
| Brak **global** hard-stop per `itemId` | **Confirmed** | Intentional P0 |
| H-FP-CHURN = **bounded** re-parse (≤2 / FP), nie infinite Sync Storm | **Confirmed** | Final Audit + live thrash=false |
| Infinite storm (`builtAt`↔E-RUN) odtworzony przez H3 | **Not Reproduced / Obalone** | deps bez `builtAt`; thrash=false |
| Prod mierzy rate churn FP / `heavyRunAttempts` | **Gap Confirmed** | Brak metryki churn; tylko error telemetry LS |
| `H-FP-CHURN` w AI/07 | **MONITOR / MITIGATED** · EPIC B | Zgodne z empirią |

**Aggregate:** residual **Confirmed** jako ryzyko obciążenia (bounded) + **luka obserwowalności** → uzasadnia **B0 (H3-C)**; **nie** uzasadnia natychmiastowego B1.

---

## 2. Evidence

### 2.1 Circuit breaker / `heavyRunAttempts` (kod)

| Fakt | Lokalizacja |
|------|-------------|
| Mapa attempts | `useTenderDossierHeavyLazy.ts:31–32` — `heavyRunAttempts = Map` |
| Max / key | `:33` — `HEAVY_MAX_RUNS_PER_KEY = 2` |
| Klucz | `:87–88` — `` `${itemId}::${gateFingerprint}::${retryNonce}` `` |
| Trip | `:195–200` — `attempts >= 2` → `dossierParseFailed` + komunikat circuit breaker |
| Bump przed run | `:202` — `set(runKey, attempts + 1)` |
| E-RUN deps | `:36–42`, `:350` — `HEAVY_E_RUN_DEP_KEYS` **bez** `builtAt` |
| Test API | `:386–408` — `get/bumpHeavyRunAttemptsForTest` (tylko test) |

### 2.2 `gateFingerprint` vs discovery growth

| Fakt | Lokalizacja |
|------|-------------|
| FP = docs set (+ upload + tenderId + `parserVersion` w stringu) | `unified-attachment-gate.ts:138–144` |
| Heavy `useMemo` deps FP | `useTenderDossierHeavyLazy.ts:164–173` — **id, tenderId, bzpDocuments, externalDocDiscovery.files, uploadedFile** — **bez** `builtAt` |
| Zmiana docs → nowy FP → E-RUN restart | deps `:350` zawierają `gateFingerprint` |
| L1 (osobno): `parserVersion` w stringu FP, ale **nie** w useMemo deps | Final Audit L1 / AUDIT H3 — stale FP możliwy; **bezpieczniejsze vs storm** |

**Discovery growth mechanizm (AUDIT):**

```text
externalDocDiscovery.files ↑  lub  bzpDocuments ↑  lub  uploadedFile change
  → buildHeavyParseDocumentFingerprint() zmienia się
  → useEffect E-RUN re-fire
  → heavyRunKey = itemId::NEW_FP::retryNonce  (nowy klucz)
  → attempts start od 0 → do 2 pełnych heavy runs
  ≠ infinite loop na tym samym FP
  ≠ builtAt w E-RUN deps
```

### 2.3 Bounded churn vs infinite storm

| Sygnał | Infinite Sync Storm (23.07) | H-FP-CHURN (H3 residual) |
|--------|----------------------------|---------------------------|
| Trigger | `builtAt` / partial → cloud → restart | Zmiana **docs fingerprint** |
| Limit | Brak skutecznego (przed P0) | **≤2 / FP key** |
| Live thrash (`uniqueBuiltAt≥4`) | Klasa incydentu | **false** (Final Audit + 01D post) |
| Live 522 | Klasa platform storm | **0** |
| Contract test | — | **T3** (new FP = fresh counter) · **T8** (max=2) |

### 2.4 Empiria live (REUSE artefaktów)

| Artefakt | Thrash / 522 | Uwaga vs H3 |
|----------|--------------|-------------|
| Final Audit multi-tender (2.65.39) | anyThrash=false · 522=0 · max uniqueBuiltAt=2 | Brak dowodu infinite; **nie** mierzy unique FP / breaker trips |
| 01D post-A (2.65.40) | anyThrash=false · 522=0 | j.w. — pipe/546 focus, nie breaker telemetry |

### 2.5 Istniejąca telemetria (luka vs B0 need)

| Mechanizm | Co zbiera | Czy wystarczy na H-FP-CHURN? |
|-----------|-----------|------------------------------|
| `logDossierParseErrorTelemetry` / LS ring | Błędy parse (message, itemId) | **Nie** — nie liczy FP changes / attempts |
| `heavyRunAttempts` Map | In-memory session | **Nieeksportowane** do ops (tylko test getters) |
| Sync Storm P0 suite | Kontrakt T3/T8 | **Tak** dla semantyki; **nie** dla rate prod |
| 01D smoke | 546 / pipeSet | Ortogonalne |

**Gap:** brak SSOT metryki: `uniqueGateFingerprints / session`, `heavyRunAttempts by key`, `breakerTrips`, korelacja z discovery file count.

### 2.6 Kontrakt testowy (REUSE)

```text
scripts/test-tenders-sync-storm-p0.mjs
  T3: same FP → attempts === max(2); new FP → attempts === 1
  T8: HEAVY_MAX_RUNS_PER_KEY === 2
```

To **potwierdza** zamierzoną semantykię breakera; **nie** mierzy częstości churn w prod.

---

## 3. Root area

| Warstwa | Ocena |
|---------|--------|
| **Klasa** | **Systemowy kontrakt Sync Storm P0** (G2/T3) — nie lokalny bug |
| **Moduł** | `useTenderDossierHeavyLazy.ts` + `buildHeavyParseDocumentFingerprint` |
| **Przyczyna residual** | Per-FP scope **celowo** pozwala legalny re-parse przy discovery growth → bounded churn |
| **Nie-przyczyna** | Infinite storm · `builtAt` w E-RUN · brak breakera |
| **Observability root gap** | Brak produkcyjnego / smoke licznika churn FP i breaker trips |

---

## 4. Risk

| ID | Ryzyko | Sev | Stan |
|----|--------|-----|------|
| **R-B0-1** | Discovery growth → N× (≤2) heavy runs / item → CPU/egress mobile | **HIGH** (bounded) | MITIGATED limitem 2/FP; **niezmierzony rate** |
| **R-B0-2** | Blind B1 (global cap) → false fail legalnego re-parse | **CRITICAL** jeśli zrobione źle | OUT tego AUDIT; wymaga evidence B0 |
| **R-B0-3** | Zmiana `HEAVY_E_RUN_DEP_KEYS` / limit bez DF | **CRITICAL** | Zakazane w 01B0 |
| **R-B0-4** | Mylenie H3 z M3 Autonomous `builtAt` FP | **MEDIUM** | Osobne SSOT; OUT 01B0 |
| **R-B0-5** | Brak telemetrii → decyzje na anegdocie | **MEDIUM** | Cel B0 |
| **R-B0-6** | parserVersion w FP string vs deps (L1) | **LOW** | Osobny residual; nie storm |

**Residual H-FP-CHURN:** pozostaje **MONITOR / MITIGATED** — nie CLOSED, nie CRITICAL active incident.

---

## 5. Recommendation

1. **Przyjąć H-FP-CHURN jako Confirmed bounded residual** + **Confirmed observability gap**.  
2. **EPIC 01B0 = H3-C only (monitor):** metryki / smoke / runbook wokół:
   - unique `gateFingerprint` per item/session  
   - `heavyRunAttempts` (eksport testowy lub KEEP DEBUG opt-in — DF zdecyduje)  
   - breaker trip count  
   - korelacja z discovery file Δ  
3. **REUSE:** wzorzec 01D (progi + ledger + on-demand); **nie** dublować Network smoke 546.  
4. **ZERO** zmian: limitu 2, klucza breakera, `HEAVY_E_RUN_DEP_KEYS`, `builtAt`, B1.  
5. **B1** (H3-A/B) dopiero po B0 evidence + Sync Storm DF amendment + Owner GO CORE-adjacent.  
6. **Nie** bundle’ować z EPIC E (Autonomous FP).

```text
AUDIT → Owner GO → RCA 01B0 (H3-C scope)
       → PLAN → DF 01B0 → ARCH → IMPLEMENT (tooling/docs)
```

---

## 6. Owner Readiness do RCA

| Kryterium | Stan |
|-----------|------|
| Status H-FP-CHURN | ✔ Confirmed bounded + gap telemetry |
| Evidence kod + test + live | ✔ |
| Bounded vs infinite rozdzielone | ✔ |
| Discovery growth opisany | ✔ |
| Zakazy B1/deps/builtAt | ✔ |
| Implementacja / commit / push | Nie (zgodne z GO) |

```text
OWNER READINESS: READY FOR RCA (01B0)

Next allowed step: Owner GO → WGDOM-HARDENING-01B0 RCA
Forbidden without GO: PLAN · DF · IMPLEMENT · commit · push
Forbidden always in 01B0: breaker semantics · limits · HEAVY_E_RUN_DEP_KEYS · builtAt · B1
```

---

## 7. Raport końcowy (Owner card)

| # | Pole | Wartość |
|---|------|---------|
| **1** | **Status H-FP-CHURN** | **Confirmed** (bounded residual · MITIGATED/MONITOR) · infinite storm **Not Reproduced** · telemetry **Gap Confirmed** |
| **2** | **Evidence** | `heavyRunAttempts` Map · max 2 · key z FP · T3/T8 · live thrash=false · FP z docs set · brak prod churn metrics |
| **3** | **Root area** | Sync Storm P0 per-FP breaker by design + docs fingerprint w E-RUN deps · observability gap |
| **4** | **Risk** | HIGH bounded load (R-B0-1); CRITICAL tylko przy ślepym B1 (R-B0-2) |
| **5** | **Recommendation** | RCA→PLAN **H3-C monitor-only (01B0)**; zakaz B1/deps/`builtAt` |
| **6** | **Owner Readiness do RCA** | **READY** |
