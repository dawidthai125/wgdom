# WGDOM-HARDENING-01B0 — RCA (Root Cause Analysis)

> **ID:** WGDOM-HARDENING-01B0  
> **STATUS:** RCA COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (RCA only)  
> **Wejście:** [`WGDOM-HARDENING-01B0-AUDIT.md`](./WGDOM-HARDENING-01B0-AUDIT.md) · [`WGDOM-HARDENING-01-RCA.md`](./WGDOM-HARDENING-01-RCA.md) §3 H3 · PLAN EPIC B · Sync Storm P0 · AI/07 **H-FP-CHURN**  
> **Poza zakresem:** PLAN · DF · implementacja · zmiana limitów breakera · `HEAVY_E_RUN_DEP_KEYS` · `builtAt` · B1 · CORE · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`e349506`** · EPIC A/D **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01B0 RCA COMPLETE

Root:    Per-FP breaker by design (P0 G2/T3) → bounded churn
Gap:     No prod telemetry for FP churn / heavyRunAttempts
Mode:    H3-C monitor-only · no B1 / no semantics change
══════════════════════════════════════
```

---

## 0. Zasady analizy

| Zasada | Zastosowanie w RCA 01B0 |
|--------|-------------------------|
| **SSOT FIRST** | Jedna mapa `heavyRunAttempts` · jeden FP heavy (`buildHeavyParseDocumentFingerprint`) · kontrakt `HEAVY_E_RUN_DEP_KEYS` / T3/T8 |
| **REUSE FIRST** | Warianty B0 budują na istniejących test getters + wzorcu monitora 01D — bez drugiego breakera |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej Map attempts / drugiego E-RUN effectu; telemetria = odczyt istniejącego stanu lub instrumentacja obserwacyjna |
| **MOBILE FIRST** | Bounded churn = powtórny heavy parse na CPU/baterii/egress; monitor ma wykryć regresję rate zanim Owner rozważy B1 |

**Legenda**

| Termin | Znaczenie |
|--------|-----------|
| **Infinite storm** | Klasa 23.07: pętla bez skutecznego limitu (np. `builtAt`↔E-RUN) |
| **Bounded churn (H-FP-CHURN)** | Legalne, ograniczone ≤2 heavy runs **na każdy** nowy docs-FP |
| **B0 / H3-C** | Monitor-only — bez zmiany semantyki breakera |
| **B1 / H3-A·B** | Zmiana limitu/scope/cooldown — **OUT** 01B0 |

---

## 1. Root Cause

### 1.1 Werdykt

**Root Cause (semantyka):** Circuit breaker Sync Storm P0 jest **celowo** skotwiczony do klucza `(itemId, gateFingerprint, retryNonce)` z limitem **`HEAVY_MAX_RUNS_PER_KEY = 2`**.  
Gdy discovery / BZP / upload zmienia zestaw dokumentów, `gateFingerprint` się zmienia → powstaje **nowy klucz** → licznik `heavyRunAttempts` startuje od zera → system może wykonać do **2** kolejnych pełnych E-RUN.

To **nie** jest defekt „breaker nie działa”. To **zamierzona polityka G2/T3**: zatrzymaj infinite retry **tego samego** zestawu docs, ale **pozwól** na heavy po legalnym discovery growth.

**Root Cause (luka 01B0):** brak produkcyjnej / Stabilization telemetrii mierzącej:
- ile unikalnych FP / item / sesja,
- rozkład `heavyRunAttempts`,
- liczbę breaker trips,
- korelację z Δ discovery files.

Bez tych metryk residual **H-FP-CHURN** pozostaje **MONITOR** oparty o kod + smoke thrash=false, nie o mierzalny rate.

### 1.2 Czego RCA **nie** twierdzi

| Twierdzenie | Status |
|-------------|--------|
| Breaker jest zepsuty / max≠2 | **Fałsz** (T8) |
| H3 = powrót Sync Storm infinite | **Obalone** (deps bez `builtAt`; live thrash=false) |
| Trzeba natychmiast zmienić limit / global cap (B1) | **Nieudowodnione** — brak rate; B1 OUT |
| `builtAt` jest w E-RUN deps | **Fałsz** |
| Autonomous FP (M3) = ten sam problem | **Fałsz klasyfikacji** — osobne SSOT |

### 1.3 Lokalny vs systemowy

| | |
|--|--|
| **Klasa** | **Systemowy** — kontrakt niezawodności heavy (Sync Storm P0 / CORE-adjacent) |
| **Lokalny bug UI** | Brak |
| **App leverage 01B0** | Obserwowalność (H3-C), nie zmiana limitu |

---

## 2. Mechanizm

### 2.1 Łańcuch discovery growth → FP → bounded heavy runs

```text
[A] Discovery growth / docs change
      bzpDocuments ↑  ·  externalDocDiscovery.files ↑  ·  uploadedFile change
            │
            ▼
[B] buildHeavyParseDocumentFingerprint(item)
      parts = origin:id:filename (+ upload + tenderId [+ parserVersion w stringu])
            │
            ▼
[C] gateFingerprint (useMemo) zmienia się
      → E-RUN useEffect deps: [..., gateFingerprint, ...]
            │
            ▼
[D] heavyRunKey = `${itemId}::${gateFingerprint}::${retryNonce}`
      Map miss → attempts = 0
            │
            ├─ attempts < 2  → bump + full heavy E-RUN (cost + enrich + persist path)
            └─ attempts ≥ 2  → circuit trip (dossierParseFailed) dla TEGO klucza
            │
            ▼
[E] Kolejny growth → NOWY FP → NOWY klucz → znów ≤2 runs
      = bounded churn (H-FP-CHURN)
      ≠ infinite na stałym FP
```

### 2.2 Dlaczego breaker eliminuje infinite storm, a zostawia bounded churn

| Wymiar | Infinite storm (23.07 class) | Per-FP breaker (P0) |
|--------|----------------------------|---------------------|
| **Trigger pętli** | Persist/`builtAt` → re-render → E-RUN bez limitu | Tylko zmiana **docs FP** (lub retryNonce / enable) |
| **Co limituje** | Brak skutecznego limitu przed P0 | **2** attempts / **ten sam** klucz FP |
| **Czy ten sam zestaw docs może kręcić w nieskończoność?** | Tak (klasa storm) | **Nie** — po 2 trip |
| **Czy nowy zestaw docs może odpalić heavy?** | N/A | **Tak** — nowy FP = świeży counter (T3) |
| **Skutek uboczny** | Outage / 522 / thrash | **Bounded churn**: suma ≤2 × (liczba unikalnych FP w sesji) |

**Wniosek mechaniczny:**  
Breaker rozwiązuje problem **„ten sam FP, nieskończone retry”**.  
**Nie** rozwiązuje (i nie ma) problemu **„wiele FP w czasie = wiele paczek ≤2 runs”** — to jest świadomy trade-off T3 vs global hard-stop.

### 2.3 Co **nie** napędza H-FP-CHURN (P0 intact)

```text
builtAt / partial local persist     → NIE w E-RUN deps  → nie resetuje breakera
parserVersion w useMemo deps heavy  → NIE (tylko w stringu FP; L1 stale możliwe)
retryNonce (user CTA)               → celowo nowy klucz (nie churn discovery)
```

### 2.4 Brakujące metryki telemetryczne (do PLAN/DF)

| # | Metryka | Po co |
|---|---------|-------|
| **M1** | `uniqueGateFingerprintCount` / item / sesja (lub smoke window) | Skala discovery churn |
| **M2** | Histogram / max `heavyRunAttempts` per key | Czy zbliżamy się do trip |
| **M3** | `breakerTripCount` (attempts≥2) | False-fail vs ochrona |
| **M4** | Korelacja M1 z `Δ externalDocDiscovery.files` / bzp count | Causal link growth→churn |
| **M5** | Guard Sync Storm: `anyThrash` / uniqueBuiltAt policy (REUSE 01D/Final Audit) | Nie mylić z infinite |
| **M6** | Opcjonalnie: czas E-RUN / mobile proxy (ms) | MOBILE FIRST cost |

**Stan dziś:** M2 częściowo w pamięci Map (bez eksportu ops); M3 tylko UX fail string; M1/M4 **brak**; error LS telemetry ≠ churn.

**REUSE:** test getters `getHeavyRunAttemptsForTest` / `bump…` + wzorzec 01D (progi + ledger + on-demand) — bez drugiej logiki breakera.

---

## 3. Uzasadnienie architektury H3-C monitor-only (01B0)

| Kryterium | Dlaczego H3-C |
|-----------|----------------|
| **Przyczyna = kontrakt, nie bug** | Zmiana limitu = zmiana P0 (G2/T3) |
| **Evidence gap** | Bez M1–M4 B1 byłby spekulacją |
| **Ryzyko B1** | Global cap → false terminal fail po legalnym discovery (RCA H3-A) |
| **STABILIZATION** | Tip GREEN; najniższy blast = tooling/docs (+ ewentualnie KEEP DEBUG opt-in w DF) |
| **MOBILE FIRST** | Alert na churn rate chroni telefon bez blokowania re-parse |
| **REUSE / ZERO DUPLICATE** | Jeden breaker; monitor czyta / raportuje, nie kopiuje semantyki |
| **01A + 01D już** | Czystszy Network; 546 monitor; B0 domyka trzeci sygnał (heavy) |

**H3-C nie oznacza „ignoruj churn”.** Oznacza: **zmierz → progi → ledger → decyzja Owner o B1 dopiero z DF Sync Storm amendment**.

---

## 4. Risk

| ID | Ryzyko | Sev | Mitygacja RCA → PLAN |
|----|--------|-----|----------------------|
| **R1** | Bounded churn niedostrzeżony → regresja mobile CPU/egress | HIGH | B0 metryki M1–M4 |
| **R2** | Scope creep B1 w 01B0 | CRITICAL (proces) | Zakaz w DF; osobny epic |
| **R3** | Zmiana `HEAVY_E_RUN_DEP_KEYS` / max 2 „przy okazji” | CRITICAL | Zakaz jawny |
| **R4** | Mylenie z Sync Storm / thrash | HIGH | Guard M5 w każdym raporcie |
| **R5** | Mylenie z Autonomous FP (M3/`builtAt`) | MEDIUM | OUT 01B0; osobny EPIC E |
| **R6** | Telemetria PII | LOW | hash itemId; bez tytułów |
| **R7** | Duplikacja smoke vs 01D | MEDIUM | Osobne metryki heavy; nie mieszać z 546 Network |

**Residual risk:** **HIGH (bounded) + MEDIUM (observability)** — tip pozostaje GREEN; nie CRITICAL active incident.

---

## 5. Recommendation

1. **Przyjąć Root Cause:** per-FP breaker by design → H-FP-CHURN bounded; luka = brak telemetrii churn.  
2. **PLAN 01B0 = H3-C only** — metryki M1–M5 (+ M6 opt.), runbook, ledger/progi; **zero** zmiany limitu/deps/`builtAt`.  
3. **B1 (H3-A/B) OUT** do czasu evidence + Sync Storm DF amendment + Owner GO.  
4. **REUSE** wzorca 01D i Sync Storm T3/T8; **ZERO DUPLICATE** breakera.  
5. **H-FP-CHURN** w AI/07 pozostaje **MONITOR / MITIGATED** do CLOSE B0 (nawet po monitorze — rate może być WARN, nie „FIXED forever”).

```text
RCA → Owner GO → PLAN 01B0 (H3-C)
    → DF 01B0 → ARCH → IMPLEMENT (tooling/docs)
```

---

## 6. Owner Readiness do PLAN

| Kryterium | Stan |
|-----------|------|
| Root Cause | ✔ |
| Mechanizm growth→FP→bounded runs | ✔ |
| Infinite vs bounded | ✔ |
| Brakujące metryki | ✔ (§2.4) |
| Uzasadnienie H3-C | ✔ |
| Zakazy B1/deps/builtAt/CORE | ✔ |
| Implementacja / commit / push | Nie (zgodne z GO) |

```text
OWNER READINESS: READY FOR PLAN (01B0)

Next allowed step: Owner GO → WGDOM-HARDENING-01B0 PLAN
Forbidden without GO: DESIGN FREEZE · IMPLEMENT · commit · push
Forbidden always in 01B0: breaker limits · HEAVY_E_RUN_DEP_KEYS · builtAt · B1 · CORE
```

---

## 7. Raport końcowy (Owner card)

| # | Pole | Wartość |
|---|------|---------|
| **1** | **Root Cause** | Per-FP breaker (P0 G2/T3) by design → discovery growth resetuje klucz → bounded ≤2 heavy/FP; **plus** brak prod telemetrii churn |
| **2** | **Mechanizm** | docs↑ → `gateFingerprint`↑ → E-RUN restart → nowy `heavyRunKey` → ≤2 runs; infinite na stałym FP zablokowane |
| **3** | **Ryzyko** | HIGH bounded load (mobile); CRITICAL tylko przy ślepym B1 / zmianie deps |
| **4** | **Recommendation** | **H3-C monitor-only (01B0)**; M1–M5; zakaz B1/limits/`builtAt` |
| **5** | **Owner Readiness do PLAN** | **READY** |
