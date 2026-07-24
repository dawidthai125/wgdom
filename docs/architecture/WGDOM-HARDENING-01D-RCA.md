# WGDOM-HARDENING-01D — RCA (Root Cause Analysis)

> **ID:** WGDOM-HARDENING-01D  
> **STATUS:** RCA COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (RCA only)  
> **Wejście:** [`WGDOM-HARDENING-01D-AUDIT.md`](./WGDOM-HARDENING-01D-AUDIT.md) · [`WGDOM-HARDENING-01-RCA.md`](./WGDOM-HARDENING-01-RCA.md) §5 M2 · [`WGDOM-HARDENING-01-PLAN.md`](./WGDOM-HARDENING-01-PLAN.md) EPIC D · 01A OV/CLOSE · Supabase Edge status **546** = `WORKER_RESOURCE_LIMIT`  
> **Poza zakresem:** PLAN · DESIGN FREEZE · implementacja · runtime · retry 546 · Cloud Sync · Edge chunk · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`82e4532`** · EPIC A **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01D RCA COMPLETE

Root:    Edge WORKER_RESOURCE_LIMIT under fat multi-open load
Mode:    root-cause only · monitor-scope · no runtime fix
══════════════════════════════════════
```

---

## 0. Zasady analizy

| Zasada | Zastosowanie w RCA 01D |
|--------|------------------------|
| **SSOT FIRST** | Empiria: AUDIT 01D artefakty + Final Audit baseline; klasa 546 = docs Supabase; residual M2 = PLAN EPIC D |
| **REUSE FIRST** | Warianty budują na `.tmp/final-prod-audit-multi.mjs` — bez drugiego smoke / bez drugiej logiki Network |
| **ZERO DUPLICATE LOGIC** | Monitoring = agregacja już zbieranych `response.status` + pipe counters; nie dublować cloud-sync / Edge handlers |
| **MOBILE FIRST** | pipeSet / allSet = proxy egress i koszt open Dokumentów na słabym linku; monitor chroni przed regresją egress bez „fixu” w runtime |

**Legenda**

| Klasa | Znaczenie |
|-------|-----------|
| **Objaw** | HTTP 546 w multi-open smoke |
| **Przyczyna pierwotna (klasa)** | Przekroczenie limitu zasobów izolatu Edge przy obciążeniu fat KV + concurrency |
| **Dźwignia ruchu (app)** | Liczba / rozmiar `batch-set`/`batch-get` na `kw-tenders-pipeline` (m.in. residual H1 przed 01A) |
| **Nie-przyczyna** | Sync Storm `builtAt`↔E-RUN · CF 522 · lokalny bug UI „generujący 546” |

---

## 1. Root Cause

### 1.1 Werdykt

**Root Cause (klasa platformowa):** sporadyczny HTTP **546** w multi-open to odpowiedź Edge **`WORKER_RESOURCE_LIMIT`** — izolat został zabity z powodu przekroczenia limitu **CPU / memory / concurrent ops** (docs Supabase), nie z powodu osobnego defectu aplikacji ani klasy Sync Storm 23.07.

**Root Cause (dźwignia obciążenia w WGDOM):** przy tipie **2.65.39** residual **fat pipeline traffic** (bootstrap cloud bez `persist:"local"` + monolityczny `kw-tenders-pipeline` + 11× concurrent open) podnosił wolumen Edge (`pipeSet=22`, `allSet=38`, `200×414`) do strefy, w której **2** requesty skończyły się resource-limitem.

**Po EPIC A (2.65.40):** ta sama procedura smoke pokazała **↓ pipeSet 22→13** i **546 2→0**. To jest **spójne z** modelem „mniej / lżejszy ruch → mniejsza szansa na resource-limit”, ale **nie jest** jeszcze dowodem kauzalnym „H1 alone caused both 546s”.

### 1.2 Co RCA **nie** twierdzi

| Twierdzenie | Status |
|-------------|--------|
| 546 = Sync Storm / 522 | **Obalone** |
| 546 = bug w React effect | **Obalone** |
| Każdy pipeSet zawsze powoduje 546 | **Fałsz** (rate ~0.5% Edge responses @ baseline) |
| 0×546 @ 2.65.40 = H-FAT CLOSED | **Fałsz** — fat key nadal istnieje |
| pipeSet↓ **udowodniło** kauzalnie zanik 546 | **Nie** — silna korelacja, brak izolacji |

### 1.3 Lokalny vs systemowy

| | |
|--|--|
| **Klasa** | **Systemowy (platform + fat data plane)** |
| **Lokalny fix w UI** | Brak sensu jako „naprawa 546” |
| **App leverage już zastosowany** | EPIC A (M2-B w PLAN) — redukcja mid-flight cloud |
| **Pozostały residual** | H-FAT-PIPELINE + brak ciągłego monitora rate 546 |

---

## 2. Mechanizm

### 2.1 Łańcuch przyczynowo-objawowy (model)

```text
[A] Open Dokumentów × N (multi-tender)
      │
      ├─ bootstrap / shell patches
      │     pre-01A: onUpdate() → default cloud → fat batch-set (H1)
      │     post-01A: mid-flight persist:"local" → ≤1 terminal cloud
      │
      ├─ heavy / coalesce / inne batch-get|set (bundle, non-pipe)
      │
      └─ monolityczny kw-tenders-pipeline (H-FAT)
            │
            ▼
[B] Edge isolate: CPU + memory + concurrent ops pressure
            │
            ▼
[C] Większość requestów → 200
    Sporadycznie przekroczony limit → HTTP 546 (WORKER_RESOURCE_LIMIT)
            │
            ▼
[D] Klient widzi fail pojedynczego Edge call
    ≠ thrash builtAt · ≠ CF 522 storm
```

### 2.2 Jak redukcja pipeSet wiąże się z zanikiem 546

| Krok | Pre-01A (baseline) | Post-01A (2.65.40) | Efekt na [B] |
|------|--------------------|--------------------|--------------|
| Mid-flight bootstrap cloud | Tak (H1) | Nie (local) | Mniej fat **writes** |
| Effective cloud / open (A-T8) | 2 | 1 | Mniej serializacji + KV upsert work |
| Live `pipeSet` (11 open) | **22** | **13** (−41%) | Mniej Edge write invocations |
| Live `allSet` | 38 | 29 | Mniej całkowitego write pressure |
| Live Edge responses `200` | 414 | 311 | Mniejszy wolumen isolate work |
| Live `546` | **2** | **0** | Objaw poniżej progu w tym runie |

**Mechanizm powiązania (fizyczny):**  
`batch-set` na fat key jest **ciężki** dla Edge (parse body, serialize, KV/Postgres path). Każdy uniknięty mid-flight cloud write:

1. zmniejsza **liczbę** ciężkich invocacji,  
2. zmniejsza **okna współbieżności** write+read przy szybkim multi-open,  
3. zmniejsza **średnie zużycie CPU/memory** izolatu w sesji smoke,

co **podnosi dystans** do limitu `WORKER_RESOURCE_LIMIT`. Przy baseline rate ~2/414, spadek wolumenu o ~25–40% jest **wystarczający**, by w jednym powtórzeniu wylosować **0** zdarzeń — bez zmiany limitu platformy i bez „naprawy 546”.

### 2.3 Dlaczego Kamieńskiego `ΔpipeSet=2` nie zmienił się

Ten sam tender: `ΔpipeSet` 2→2. Redukcja totali pochodzi głównie z **top** opens (`maxPipeSet` 3→2, typowe `ΔpipeSet` 3→1). To wspiera model: 01A ucina **nadmiarowe** mid-flight pipe sets na cięższych ścieżkach, nie „wyłącza cloud w ogóle”.

### 2.4 Co mechanizm wyklucza

```text
builtAt thrash ≥4     → anyThrash=false obu runs
CF 522 / HTML timeout → 522 absent obu runs
App code path "return 546" → nie istnieje
Retry amplifier 546   → nie w zakresie; zakazany (analog D-13)
```

---

## 3. Korelacja vs kauzalność

### 3.1 Co jest **skorelowane** (AUDIT)

| Zmienna X | Zmienna Y | Obserwacja |
|-----------|-----------|------------|
| EPIC A ON (2.65.40) | pipeSet ↓ | Confirmed live + A-T8 |
| pipeSet ↓ | 546 ↓ (2→0) | Confirmed w parze runów |
| Tip Sync Storm GREEN | 522=0 | Confirmed (nie mylić z 546) |

### 3.2 Ocena kauzalności

| Hipoteza kauzalna | Siła | Uzasadnienie |
|-------------------|------|--------------|
| **H_c1:** ↓ fat pipe writes **zmniejsza prawdopodobieństwo** 546 | **Prawdopodobna (mechanistyczna)** | Zgodna z definicją 546 (resource limit) + mierzonym ↓ wolumenu |
| **H_c2:** EPIC A **spowodował** zanik obu 546 w tym runie | **Słaba–średnia** | N=1 · top10 set drift · brak attribution endpoint · brak typu limitu (CPU vs mem) |
| **H_c3:** 546 zniknęło **tylko** przez szum platformy / cold isolate | **Możliwa konkurencyjna** | Nie wykluczona bez powtórzeń N≥3 i Dashboard |
| **H_c4:** 546 było bugiem UI naprawionym „przy okazji” 01A | **Odrzucona** | Brak kodu 546; 01A nie zmienia Edge |

**Werdykt RCA:**  
Traktować związek pipeSet↔546 jako **korelację wspartą mechanizmem platformowym**, wystarczającą do decyzji **monitor-only + nie-retry**, **niewystarczającą** do deklaracji „01A naprawił 546” lub do otwarcia Edge chunk.

### 3.3 Metryki dodatkowe do potwierdzenia związku (kauzalność / izolacja)

| # | Metryka | Po co | Skąd (REUSE / bez runtime app) |
|---|---------|-------|--------------------------------|
| **M1** | `status["546"]` **per request URL** (`batch-set` vs `batch-get` vs inne) | Attribution: write-heavy vs read-heavy | Rozszerzenie listenera w **istniejącym** smoke (bez logiki biznesowej) |
| **M2** | `sb-error-code` / body `WORKER_RESOURCE_LIMIT` + Dashboard: Memory vs CPU Time | Potwierdzenie klasy limitu | Edge logs (PAT) lub response headers w smoke |
| **M3** | Powtórzenia smoke **N≥3** na tym samym tipie (ta sama lista id jeśli możliwe) | Odfiltrowanie szumu N=1 | REUSE multi.mjs · Stabilization Window |
| **M4** | Payload size proxy: bytes `batch-set` body / `kw-tenders-pipeline` | Oddzielić **count** writes od **cost** per write | Playwright request sizes (tooling) |
| **M5** | Concurrent in-flight Edge count (max overlapping) | Hipoteza concurrency limit | Timestamps request/response w smoke |
| **M6** | A/B kill-switch: `pipelineBootstrapPersistLocal=false` na **staging** lub controlled Owner session | Prawie-kauzalny test 01A | Flaga już istnieje — **nie** prod flip bez GO |
| **M7** | Trend `546_rate = 546/(200+546+…)` vs `pipeSet` w czasie | Stabilization chart | Runbook 01D |
| **M8** | Guard `any522` + thrash | Nie mylić z regress storm | Już w smoke |

**Minimum do „kauzalność wzmocniona” (nie wymagane do PLAN M2-A):** M1 + M3 (+ M2 jeśli PAT).  
**Minimum do CLOSE monitor-epic:** M7 w runbooku + progi — bez czekania na pełną kauzalność.

---

## 4. Uzasadnienie architektury monitor-only (M2-A)

| Kryterium | Dlaczego M2-A |
|-----------|----------------|
| **Objaw ≠ defect app** | Brak lokalnego handlera; 546 = platform limit |
| **Primary leverage już zrobiony** | M2-B = EPIC A **CLOSED** — dalsze „leczenie ruchu” w 01D = scope creep |
| **Retry 546 = anty-pattern** | Maskuje resource limit; ryzyko amplifiera (D-13 analog); OUT |
| **Edge chunk = inny epic** | M2-C / H-FAT — wysoki blast radius; GATED; nie Stabilization micro-fix |
| **MOBILE FIRST** | Monitor chroni przed regresją egress (pipeSet↑ + 546↑) bez bundlowania nowego kodu w SPA |
| **REUSE / ZERO DUPLICATE** | Jeden smoke + runbook + progi; zero drugiej ścieżki sync |
| **Production GREEN** | Najniższy blast radius w Stabilization Window |
| **Kauzalność niepełna** | Przy niepewności kauzalnej **obserwuj**, nie „naprawiaj na ślepo” |

**M2-A nie oznacza „ignoruj 546”.** Oznacza: **mierz rate, alertuj trend, koreluj z pipeSet, eskaluj do Owner tylko przy przekroczeniu progu** — bez zmian `src/` CORE.

---

## 5. Warianty rozwiązania (**bez ingerencji w runtime app**)

> Uwaga: M2-B (redukcja load w kodzie) **już dostarczone** przez 01A — nie jest wariantem „do zrobienia” w 01D. M2-C (chunk) = **OUT** (runtime/Edge). Poniżej tylko warianty **tooling/docs/ops**.

### Wariant D-V1 — **Monitor smoke + progi (prefer M2-A core)**

| | |
|--|--|
| **Idea** | Utrwalić REUSE multi-tender smoke jako gate Stabilization: raport `546`, `pipeSet`, `any522`, porównanie do baseline |
| **IN** | Docs runbook · progi · opcjonalnie skrypt w `scripts/` jako kopia/wrapper istniejącego `.tmp` harness (bez nowej logiki Network) |
| **OUT** | `src/**` · Edge · retry · cloud-sync |
| **Pros** | Zero prod blast · natychmiastowa wartość · zgodne z PLAN D-T1…D-T3 |
| **Cons** | Nie zmniejsza dalej 546; wymaga ręcznego/Owner uruchomienia |
| **Rollback** | Usunąć skrypt/docs — zero wpływu app |

### Wariant D-V2 — **Evidence pack / trend ledger (docs-only)**

| | |
|--|--|
| **Idea** | SSOT tabela w `docs/architecture/` (lub AI/07): data · tip · 546 · pipeSet · maxPipeSet · any522 · link do JSON |
| **IN** | Tylko dokumentacja + procedury wpisu po każdym smoke |
| **OUT** | Automatyzacja CI obowiązkowa · runtime |
| **Pros** | Najlżejszy; MOBILE/ops visibility bez kodu |
| **Cons** | Łatwo o drift procesu; brak alertu „maszynowego” |
| **Rollback** | N/A (docs) |

### Wariant D-V3 — **Attribution enrichment w istniejącym smoke (tooling-only)**

| | |
|--|--|
| **Idea** | W **tym samym** listenerze response: zliczaj `546` per pathname (`/batch-set` vs `/batch-get`); opcjonalnie loguj `sb-error-code` |
| **IN** | Minimalna zmiana harnessu REUSE (nie app) |
| **OUT** | Zmiana semantyki persist · retry · Edge function code |
| **Pros** | Domknięcie M1 z §3.3 — wzmacnia kauzalność bez runtime |
| **Cons** | Nieco więcej utrzymania skryptu; nadal N-runs potrzebne |
| **Rollback** | Revert skryptu |

**Rekomendowany zestaw do PLAN:** **D-V1 jako must** + **D-V2 jako SSOT trend** + **D-V3 opcjonalnie w DF** (jeśli Owner chce attribution przed CLOSE).

---

## 6. Risk

| ID | Ryzyko | Sev | Mitygacja RCA → PLAN |
|----|--------|-----|----------------------|
| **R1** | Fałszywe uznanie 546 za „naprawione na zawsze” | MEDIUM | Progi + trend; H-FAT pozostaje MONITOR |
| **R2** | Retry / swallow 546 w przyszłym WIP | HIGH | Zakaz jawny w DF 01D |
| **R3** | Top-set / data drift psuje porównania | LOW | Logować id set + scores w raporcie |
| **R4** | Agent loop / ciągły polling prod | LOW | Smoke on-demand; zakaz watchera |
| **R5** | Mylenie 546 z 522 / Sync Storm | HIGH (proces) | Guard `any522` + thrash w każdym raporcie |
| **R6** | Scope creep do Edge chunk pod hasłem 01D | HIGH | M2-C OUT; osobny epic + CORE GO |
| **R7** | Mobile regress: pipeSet↑ bez alertu | MEDIUM | Alert łączony: 546 **lub** pipeSet vs baseline |

**Residual risk po RCA:** **MEDIUM (MONITOR)** — nie CRITICAL; nie blokuje tip GREEN.

---

## 7. Recommendation

1. **Przyjąć Root Cause:** 546 = Edge resource-limit pod fat multi-open load; pipeSet↓ po 01A = **mechanistycznie spójna** redukcja ciśnienia; kauzalność **nie** domknięta.  
2. **PLAN 01D = M2-A** (D-V1 + D-V2; D-V3 opcjonalnie) — **zero runtime**.  
3. **Nie** otwierać retry, Cloud Sync, Edge chunk w tym EPIC.  
4. Do kauzalności „wzmocnionej” (opcjonalnie po PLAN/DF): metryki M1+M3 (±M2).  
5. **H-FAT-PIPELINE** i **M-EDGE-546** zostają MONITOR w `docs/AI/07` do czasu osobnego epica / serii trendów.

```text
RCA → PLAN slice 01D (monitor-only)
   → DF 01D (progi, format, zakazy)
   → ARCH (FEATURE PASS jeśli zero src CORE)
   → Owner GO IMPLEMENT (tooling/docs only)
```

---

## 8. Owner Readiness do PLAN

| Kryterium | Stan |
|-----------|------|
| Root Cause sformułowany | ✔ |
| Mechanizm pipeSet↔546 opisany | ✔ |
| Korelacja vs kauzalność rozdzielone | ✔ |
| Metryki do wzmocnienia kauzalności | ✔ (§3.3) |
| Uzasadnienie M2-A | ✔ |
| 2–3 warianty bez runtime | ✔ D-V1 / D-V2 / D-V3 |
| Zakazy OUT | ✔ |
| Implementacja / commit / push | Nie wykonane (zgodne z GO) |

```text
OWNER READINESS: READY FOR PLAN (01D)

Next allowed step: Owner GO → WGDOM-HARDENING-01D PLAN
Forbidden without GO: DESIGN FREEZE · IMPLEMENT · commit · push
```

---

## 9. Raport końcowy (Owner card)

| # | Pole | Wartość |
|---|------|---------|
| **1** | **Root Cause** | Edge **`WORKER_RESOURCE_LIMIT` (HTTP 546)** pod obciążeniem fat `kw-tenders-pipeline` + multi-open; dźwignia app = wolumen ciężkich Edge calls (w tym residual H1 pre-01A) |
| **2** | **Mechanizm** | ↓ mid-flight fat `batch-set` → ↓ CPU/mem/concurrency pressure izolatu → ↓ P(546); empiria: pipeSet 22→13, 546 2→0 |
| **3** | **Korelacja vs kauzalność** | **Silna korelacja + spójny mechanizm**; kauzalność **nie udowodniona** (N=1, set drift, brak attribution/limit-type) |
| **4** | **Risk** | **MEDIUM MONITOR**; HIGH tylko przy retry/chunk scope creep |
| **5** | **Recommendation** | **M2-A monitor-only** (D-V1+D-V2; D-V3 opt.); nie deklarować „546 fixed”; nie ruszać runtime |
| **6** | **Owner Readiness do PLAN** | **READY** |
