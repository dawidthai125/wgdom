# WGDOM-HARDENING-01 — RCA (Root Cause Analysis)

> **ID:** WGDOM-HARDENING-01  
> **STATUS:** RCA COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (RCA only)  
> **Wejście:** [`WGDOM-HARDENING-01-AUDIT.md`](./WGDOM-HARDENING-01-AUDIT.md) · Final Audit · Sync Storm P0 docs · Deadlock N1/N2  
> **Poza zakresem:** PLAN · DESIGN FREEZE · implementacja · refactor · commit · push  
> **Baseline tip:** `e666443` · UI **2.65.39**

```text
══════════════════════════════════════
WGDOM-HARDENING-01 RCA COMPLETE
Scope: H1–H3 · M1–M3
Mode:  root-cause only (no PLAN/DF/code)
══════════════════════════════════════
```

---

## 0. Zasady analizy

| Zasada | Zastosowanie w RCA |
|--------|-------------------|
| **SSOT FIRST** | Jedna prawda: `TenderItemUpdateOpts` + `updateItem`; heavy = `HEAVY_E_RUN_DEP_KEYS`; retry = `isTransientBatchSetError`; Autonomous FP ≠ Heavy FP |
| **REUSE FIRST / ZERO DUPLICATE** | Warianty nie mogą wprowadzać drugiego merge/persist/breaker — tylko zmiana call sites / polityki / flag |
| **MOBILE FIRST** | Wpływ: liczba fat `batch-set` na telefonie (egress, bateria, timeout) przy open Dokumentów |
| **Sync Storm P0** | Residual ≠ regresja P0; P0 celowo zostawił bootstrap / per-FP breaker poza „kill loop” |

**Legenda lokalny vs systemowy**

| Klasa | Znaczenie |
|-------|-----------|
| **Lokalny** | Jeden call site / jeden moduł; fix nie wymaga zmiany kontraktu CORE |
| **Systemowy** | Kontrakt wielowarstwowy (UI→hook→persist→Edge) lub polityka współdzielona między domenami |

---

## 1. H1 — Bootstrap local persist

### 1.1 Root Cause

Bootstrap discovery/shell **nigdy nie dostał** kontraktu `persist: "local"|"cloud"` wprowadzonego w Sync Storm P0 dla heavy.  
Przy `pipelinePerfDebouncePersist = false` (default produkcyjny) każde `onUpdate(patch)` bez `opts` = **natychmiastowy** `saveTendersPipeline` = full fat KV write.

**Przyczyna pierwotna:** świadome wyłączenie bootstrapu z zakresu P0 (**E-BOOTSTRAP: bez zmian w P0**), przy jednoczesnym pozostawieniu NG11-Q3 debounce jako opt-in OFF → residual cloud writes na open.

### 1.2 Mechanizm działania

```text
useTenderDocumentsBootstrap
  → onUpdate(discovery.patch)     // brak opts
  → onUpdate(shellPatch)          // brak opts
       ↓
useTendersPipeline.updateItem(id, patch)   // mode = undefined
       ↓
isDebouncePersistActive() === false
       ↓
saveTendersPipeline(next)
  = saveTendersPipelineLocal + persistKey(kw-tenders-pipeline)
       ↓
Edge batch-set  (fat payload)
```

Hook bootstrap dodatkowo **strip’uje** arity: `(patch) => onUpdateRef.current(patch)` — nawet gdy runtime przekazuje callback zdolny przyjąć `opts`.

### 1.3 Dlaczego obecna implementacja tak wygląda

| Decyzja historyczna | Skutek |
|---------------------|--------|
| Sync Storm P0 fix-plan: **E-BOOTSTRAP poza P0** | Kill-loop `builtAt↔E-RUN` bez ryzyka regresji discovery |
| NG11-Q3: flaga debounce default **OFF** | Bezpieczeństwo multi-tab / flush / nie gubić cloud przy crash — kosztem burst write |
| Bootstrap starszy niż `TenderItemUpdateOpts` | Typ `onUpdate: (patch) => void` nie ewoluował z P0 |
| DoD P0 tolerował „≤1 final + ewentualnie 1 bootstrap” | Residual H1 uznany za acceptable residual, nie blocker READY |

### 1.4 Zakres wpływu

| Warstwa | Wpływ |
|---------|-------|
| UI / mobile | 1–2 (typ.) fat cloud write przy pierwszym open Dokumentów |
| Cloud / Edge | Load + egress na `kw-tenders-pipeline`; korelacja z M2 (546) |
| Payroll / Jobs | **Brak** bezpośredni |
| Heavy E-RUN | **Brak** restartu od bootstrap (P0 deps stable) |
| Empiria | Δset ≤3 / open · thrash=false |

### 1.5 Ryzyko regresji (przy przyszłej zmianie)

| Zmiana | Ryzyko |
|--------|--------|
| Bootstrap → local only | Utrata cloud durability discovery przy kill app przed final heavy |
| Włączenie debounce globalnie | Multi-tab reorder / utrata write przy crash (znane Q3) |
| Zmiana `saveTendersPipeline` semantyki | CORE Sync — szeroka regresja |

### 1.6 Powiązania z Sync Storm P0

- **Nie** jest root cause 23.07.  
- P0 **świadomie** nie zamykał H1.  
- H1 zwiększa **baseline load**, nie tworzy infinite loop.

### 1.7 Lokalny vs systemowy

**Systemowy (wąski):** jeden producent (bootstrap) × wspólny SSOT `updateItem` default-cloud. Fix lokalny w call sites możliwy, ale semantyka „kiedy cloud” jest polityką pipeline.

### 1.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **H1-A** | Bootstrap `onUpdate(..., { persist: "local" })` + 1× cloud na settled/final bootstrap | Mirror heavy partial/local |
| **H1-B** | Włączyć / wymusić debounce coalesce dla writerów bootstrap (flaga lub force schedule) | Bez zmiany typów bootstrap |
| **H1-C** | Zostawić cloud bootstrap; redukować payload / częstotliwość (shell thinner / single coalesce) | Nie zmieniać trybu persist |

### 1.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **HIGH** (load) |
| **Arch impact** | Niski–średni: rozszerzenie użycia istniejącego `TenderItemUpdateOpts` — **bez** nowego persist SSOT |
| **Priorytet hardening** | P1 (H1 epic lead) |

---

## 2. H2 — Persist contract consistency

### 2.1 Root Cause

Po wprowadzeniu `TenderItemUpdateOpts` w Sync Storm P0 **tylko** ścieżka runtime/heavy została podpięta pod forward `opts`.  
Legacy embed (`TenderDetailPage` workspace) i list host (`TendersView`) zawężają callback do `(patch) => updateItem(id, patch)` — **gubią** drugi argument.  
Dodatkowo `TenderDetailPanel` deklaruje opts w typie, ale **żaden** call site panelu nie emituje `persist` → kontrakt „papierowy”.

### 2.2 Mechanizm działania

```text
Heavy (OK):
  useTenderDossierHeavyLazy
    → onUpdate(patch, { persist: "local"|"cloud" })
    → TenderDetailPage.onUpdateItem  // forward opts
    → updateItem(..., opts)

Legacy (DROP):
  TenderDetailPanel / Hosted
    → onUpdate(patch)                // panel i tak bez opts
    → wrapper: updateItem(id, patch) // arity 2 dropped even if panel passed opts
    → default cloud branch
```

### 2.3 Dlaczego obecna implementacja tak wygląda

| Decyzja | Skutek |
|---------|--------|
| P0 minimal blast radius | Tylko heavy + `updateItem` + runtime — nie pełny audit UI wrappers |
| Legacy accordion / embed V4 | Stare closures `(patch) => …` skopiowane bez opts |
| Panel API „na zapas” z opts | Typ wyprzedził emit — dryf SSOT deklaratywny vs rzeczywisty |

### 2.4 Zakres wpływu

| Ścieżka | Skutek dziś |
|---------|-------------|
| Heavy E-RUN | **Intact** (nie idzie przez legacy wrapper) |
| Manual UI w panelu | Zawsze cloud (zgodne z brakiem emitów `persist`) |
| Przyszły emit `persist:"local"` z panelu | **Cicho złamany** przez wrapper |
| Mobile | Każdy manual patch = fat write (historyczne zachowanie) |

### 2.5 Ryzyko regresji

| Zmiana | Ryzyko |
|--------|--------|
| Forward opts wszędzie | Niskie, jeśli panel nadal nie emituje |
| Panel zaczyna emitować local | Zmiana durability UX — wymaga DF |
| Usunięcie opts z typu panelu | Breaking type — bezpieczniejsze semantycznie |

### 2.6 Powiązania z Sync Storm P0

- **Nie** omija P0 na heavy.  
- Jest **incomplete rollout** kontraktu P0 w warstwie UI.  
- Final Audit: „H2 ≠ obejście E-RUN local”.

### 2.7 Lokalny vs systemowy

**Systemowy (kontrakt):** niespójność SSOT typ ↔ adapters. Poszczególne wrappery = lokalne, ale problem jest wzorcem w wielu plikach.

### 2.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **H2-A** | Wszystkie wrappery: `(patch, opts?) => updateItem(id, patch, opts)` | Restore arity |
| **H2-B** | Zawęzić typ `TenderDetailPanel.onUpdate` do `(patch) => void` | Usunąć fałszywą obietnicę |
| **H2-C** | Jedna funkcja adapter SSOT `bindPipelineUpdateItem(pipeline, id)` reuse | ZERO DUPLICATE closures |

### 2.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **HIGH** (contract integrity) · LOW (obecny runtime storm) |
| **Arch impact** | Niski: hygiene kontraktu; nie zmienia Edge/Payroll |
| **Priorytet** | P1 (razem z H1 — ten sam SSOT persist) |

---

## 3. H3 — Circuit breaker scope (per fingerprint)

### 3.1 Root Cause

Breaker w Sync Storm P0 został **zaprojektowany** jako limit **2** na klucz `(itemId, gateFingerprint, retryNonce)`, nie jako globalny hard-stop na `itemId`.  
Wzrost dokumentów zmienia `gateFingerprint` → **nowy klucz** → licznik attempts reset → do 2 kolejnych pełnych E-RUN.

To nie jest „dziura w implementacji limitu”, tylko **wybrana semantyka** G2/T3 (legalny re-parse po nowych docs).

### 3.2 Mechanizm działania

```text
docs change → buildHeavyParseDocumentFingerprint ↑
  → gateFingerprint w E-RUN deps zmienia się
  → effect restart
  → heavyRunKey = itemId::NEW_FP::retryNonce
  → attempts map miss → 0 → allow run (max 2 per NEW key)
```

`builtAt` / partial local **nie** resetują breakera (P0).  
`retryNonce` (CTA user) celowo otwiera nowy klucz.

### 3.3 Dlaczego obecna implementacja tak wygląda

| Decyzja P0 | Uzasadnienie |
|-----------|--------------|
| G2: max 2 / `(itemId, gateFingerprint)` | Stop infinite retry **tego samego** zestawu docs |
| T3: nowy FP = świeży counter | Nowe załączniki **muszą** móc odpalić heavy |
| Global per-item cap **nie** w DoD P0 | Uniknąć permanentnego „parse failed” po legalnym discovery growth |
| Final Audit H3 | Residual: bounded churn, nie infinite |

### 3.4 Zakres wpływu

| Scenariusz | Skutek |
|------------|--------|
| Stabilne docs, fail×2 | Stop + CTA — OK |
| Discovery dogrywa pliki mid-session | N× (≤2) heavy re-parse — CPU/Edge |
| Storm builtAt | **Nie** (FP bez builtAt w deps memo) |
| Mobile | Koszt re-parse na słabszym CPU |

### 3.5 Ryzyko regresji

| Zmiana | Ryzyko |
|--------|--------|
| Global cap per itemId | Fałszywy terminal fail gdy discovery doda docs po 2 próbach |
| Cap łączny (sum across FP) | Potrzeba telemetrii / reset policy |
| Usunięcie FP z E-RUN deps | Regresja Sync Storm class / stale docs |

### 3.6 Powiązania z Sync Storm P0

- **Integralna część** kontraktu P0 (G2/T3).  
- H3 = napięcie między „anti-loop” a „allow growth”.  
- Zmiana scope breakera = **zmiana P0 contract** → wymaga DF Sync Storm / Owner GO CORE.

### 3.7 Lokalny vs systemowy

**Systemowy:** polityka niezawodności heavy pipeline (CORE-adjacent HIGH).

### 3.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **H3-A** | Dodatkowy global counter per `itemId` (np. max N runs / session) **obok** per-FP | Soft global hard-stop |
| **H3-B** | Zostawić per-FP; rate-limit / cooldown między FP changes | Bez zmiany klucza |
| **H3-C** | Status quo + telemetria churn FP (monitor only) | Zero change semantyki |

### 3.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **HIGH** (bounded) |
| **Arch impact** | **Wysoki** przy zmianie semantyki breakera (P0 contract) |
| **Priorytet** | P1 — ale wrażliwszy architektonicznie niż H1/H2 |

---

## 4. M1 — Deadlock retry (40P01 ×4)

### 4.1 Root Cause

CLOUD-P0-DEADLOCK-**N1** celowo dodaje do **4** HTTP `batch-set` przy transient Postgres deadlock (`40P01` / `deadlock detected`).  
Przy prawdziwym deadlocku pod fat key / concurrent writers retry **zwielokrotnia** obciążenie Edge/DB (amplifier).  
Przy CF 522 HTML / innych 5xx — **nie** retry (D-13) — więc nie amplifikuje klasy 23.07 platform timeout.

### 4.2 Mechanizm działania

```text
pushKeysToCloud
  for attempt 1..4
    delay [0, 250, 500, 1000]
    fetch batch-set
    if !ok && isTransientBatchSetError(status, body) && attempt < 4
      continue
    else throw / success
```

Klasyfikator SSOT: wyłącznie `cloud-batch-set-retry.ts` (ZERO DUPLICATE).

### 4.3 Dlaczego obecna implementacja tak wygląda

| Decyzja | Skutek |
|---------|--------|
| N1 = client retry | Szybka mitygacja bez deploy Edge sort |
| N2 = sort keys w `kv.mset` | **GATED** — eliminacja przyczyny deadlocka, nie symptomu |
| D-13: nie retry CF 522 | Oddzielenie DB deadlock od origin timeout |
| Max 4 | Trade-off success rate vs load |

### 4.4 Zakres wpływu

| Domeny | Wpływ |
|--------|-------|
| Wszystkie `persistKey` / Domain Push | Wspólna pętla retry |
| Fat `kw-tenders-pipeline` | Największy koszt przy retry |
| Payroll | Też objęty — ostrożność CORE |
| Sync Storm 522 HTML | **Nie** amplifikowany N1 |

### 4.5 Ryzyko regresji

| Zmiana | Ryzyko |
|--------|--------|
| Zmniejszenie attempts | Więcej hard-fail przy prawdziwym 40P01 |
| Rozszerzenie klasyfikatora na inne 5xx | Powrót amplifiera platform (zakaz D-13) |
| N2 sort bez N1 | Osobny Edge deploy; N1 może zostać jako belt |

### 4.6 Powiązania z Sync Storm P0

- Ortogonalne: N1 sprzed / obok Sync Storm.  
- Przy storm **nie** było 40P01-driven loop w Final Audit.  
- Przy H1 fat writes + deadlock → M1 pogarsza load (warunkowo).

### 4.7 Lokalny vs systemowy

**Systemowy:** warstwa Cloud Sync CORE — wszystkie domeny.

### 4.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **M1-A** | Status quo N1 + implement N2 (sort keys) | Usuń przyczynę; retry zostaje belt |
| **M1-B** | Zmniejsz `BATCH_SET_MAX_ATTEMPTS` / delays dla large payloads | Ogranicz amplifier |
| **M1-C** | Retry budget per klucz / per okno czasu | Circuit na retry, nie tylko na heavy |

### 4.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **MEDIUM** (conditional) |
| **Arch impact** | **Wysoki** (CORE Sync / Edge) — wymaga Owner GO CORE |
| **Priorytet** | P2 / gated N2 alignment |

---

## 5. M2 — Edge status 546 (monitoring)

### 5.1 Root Cause

W live multi-open (11 przetargów, tip 2.65.39) Edge zwrócił **2× HTTP 546** przy **0× 522** i `anyThrash=false`.  
To **objaw obciążenia** origin/Edge pod residual fat traffic (H1 + fat pipeline + concurrent open), nie osobny defect w React effect loop.

**Brak** w tym RCA dowodu z Dashboard logs (Final Audit: brak PAT) — klasyfikacja = observational / platform-adjacent.

### 5.2 Mechanizm działania

```text
11× open detail (bootstrap cloud + heavy final coalesce + inne batch-*)
  → Edge / upstream pressure
  → sporadyczny 546 (2 / 414×200)
  ≠ builtAt thrash
  ≠ CF 522 class 23.07
```

### 5.3 Dlaczego „implementacja” tak wygląda

Nie ma dedykowanego „kodu 546” w app.  
Obecny stack: monolityczny `kw-tenders-pipeline` + residual bootstrap cloud + brak Edge chunk na tip Sync Storm — **architektura fat key** (H-FAT-PIPELINE MONITOR) + H1.

### 5.4 Zakres wpływu

| Obszar | Wpływ |
|--------|-------|
| UX | Sporadyczny fail pojedynczego requestu (jeśli nie obsłużony) |
| Storm class | **Nie** |
| Ops | Sygnał monitoringu multi-open |

### 5.5 Ryzyko regresji

Sam monitoring nie regresuje.  
Agresywny „fix 546” bez klasyfikacji → ryzyko maskowania / amplifiera (analog D-13).

### 5.6 Powiązania z Sync Storm P0

- Empiria **wspiera** READY (522=0).  
- 546 = residual capacity, nie dowód że P0 fałszywe.  
- Korelacja z H1 load.

### 5.7 Lokalny vs systemowy

**Systemowy (platform + fat data plane)** — nie lokalny bug UI.

### 5.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **M2-A** | Monitor-only: alert rate 546 w smoke multi-tender | Zero code change app |
| **M2-B** | Redukcja load (H1 / coalesce) jako primary | Leczyć przyczynę ruchu |
| **M2-C** | Edge chunk / fat-key epic (gated, osobny) | Leczyć rozmiar payloadu |

### 5.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **MEDIUM** |
| **Arch impact** | Niski (monitor) → wysoki dopiero przy chunk epic |
| **Priorytet** | P2 monitor; zależny od H1 |

---

## 6. M3 — Autonomous fingerprint vs `builtAt`

### 6.1 Root Cause

Istnieją **dwa** fingerprint SSOT o różnych politykach:

| System | `builtAt` w FP? | Cel |
|--------|-----------------|-----|
| Heavy E-RUN (`HEAVY_E_RUN_DEP_KEYS` / docs FP) | **NIE** (P0) | Anti Sync Storm |
| Autonomous Run (`tender-autonomous-run-fingerprint`) | **TAK** (w części `kosztorys`) | Re-run gate gdy „analiza się zestarzała” |

Po partial/final dossier update `builtAt` zmienia Autonomous FP → `deriveAutonomousRunRequired` → ponowny gate UI.  
**Nie** restartuje heavy E-RUN.

### 6.2 Mechanizm działania

```text
heavy partial/final → dossier.builtAt (metadata zapisu)
  → buildAutonomousRunFingerprintParts.kosztorys includes builtAt
  → fingerprint hash ≠ lastCompleted
  → Autonomous required = true
  → UI gate / agent UX re-run
  ✗ nie wchodzi w E-RUN deps
```

### 6.3 Dlaczego obecna implementacja tak wygląda

| Era | Decyzja |
|-----|---------|
| NG-10 Autonomous | FP ma wykryć „treść analizy się zmieniła” — `builtAt` = tani sygnał świeżości dossier |
| Sync Storm P0 | Odłączył `builtAt` **tylko** od heavy E-RUN; Autonomous poza blast radius P0 |
| Reguła P0 docs | `builtAt = metadata zapisu, nie sygnał re-parse` — dotyczy E-RUN; Autonomous nadal używa metadata jako sygnału |

### 6.4 Zakres wpływu

| Obszar | Wpływ |
|--------|-------|
| Autonomous Gate / NG-10 UX | Możliwy zbędny re-run |
| Heavy parse / cloud storm | **Brak** |
| Mobile | Extra UI work, nie fat loop |

### 6.5 Ryzyko regresji

| Zmiana | Ryzyko |
|--------|--------|
| Usunięcie `builtAt` z Autonomous FP | Pominięcie re-run gdy dossier realnie nowy a docs FP ten sam |
| Wyrównanie Autonomous do Heavy FP | Zmiana semantyki NG-10 — DF Autonomous |
| Dodanie `builtAt` do Heavy deps | **ZAKAZ** — powrót Sync Storm class |

### 6.6 Powiązania z Sync Storm P0

- **Ortogonalne** do kill-loop P0.  
- Ryzyko klasifikacyjne: mylenie M3 z H3/E-RUN.  
- P0 nie „zepsuł” Autonomous — zostawił wcześniejszą politykę.

### 6.7 Lokalny vs systemowy

**Systemowy (fingerprint policy multi-SSOT):** dwa legalne SSOT fingerprintów bez wspólnej macierzy pól.

### 6.8 Warianty rozwiązania (bez wyboru)

| # | Wariant | Idea |
|---|---------|------|
| **M3-A** | Autonomous `kosztorys` FP bez `builtAt` (docs/ok/rowCount/parserVersion only) | Zbliżenie do P0 filozofii |
| **M3-B** | Macierz SSOT „które pola w którym FP” (Heavy vs Autonomous vs Gate) | Dokument + ewentualna zmiana pól |
| **M3-C** | Status quo + UX debounce autonomous required | Bez zmiany FP |

### 6.9 Ocena ryzyka i wpływu na architekturę

| | |
|--|--|
| **Residual risk** | **MEDIUM** |
| **Arch impact** | Średni (NG-10 SSOT); **zero** na P0 heavy jeśli nie ruszać E-RUN |
| **Priorytet** | P2 / osobna klasa od H3 |

---

## 7. Macierz zbiorcza (RCA)

| ID | Root cause (1 zdanie) | Lokalny/Systemowy | Sync Storm P0 | Residual risk | Arch sensitivity |
|----|----------------------|-------------------|---------------|---------------|------------------|
| **H1** | Bootstrap poza P0 + default immediate cloud | Systemowy (wąski) | Residual load, nie loop | HIGH | Medium |
| **H2** | Incomplete rollout `opts` w UI wrappers | Systemowy (kontrakt) | Nie omija heavy | HIGH contract | Low |
| **H3** | Per-FP breaker by design (G2/T3) | Systemowy | Część kontraktu P0 | HIGH bounded | **High** |
| **M1** | N1 retry ×4 jako mitygacja 40P01 | Systemowy CORE | Ortogonalny; amplifier warunkowy | MEDIUM | **High** |
| **M2** | Obciążenie Edge przy fat + multi-open | Systemowy platform | Empiria READY | MEDIUM | Low→High (chunk) |
| **M3** | Autonomous FP używa `builtAt`; Heavy nie | Systemowy (dual FP) | Ortogonalny | MEDIUM | Medium |

---

## 8. Wpływ na architekturę (cross-cutting)

```text
                    ┌─────────────────────────────┐
                    │  Fat key kw-tenders-pipeline │
                    └──────────────┬──────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
     H1 bootstrap cloud      H2 contract drift        M2 Edge 546
     (writer policy)         (UI arity)               (symptom)
           │                       │
           └──────────┬────────────┘
                      ▼
              updateItem persist SSOT
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   Heavy P0 (local/cloud)    Default cloud branch
         │
         ▼
   H3 breaker per-FP  ←── P0 contract
         │
         ✗ (no builtAt)
         
   M3 Autonomous FP ←── builtAt (osobny SSOT)
   
   M1 retry ─── cloud-sync CORE (wszystkie klucze)
```

**Wnioski architektoniczne (bez PLAN):**

1. H1+H2 dzielą **ten sam** SSOT persist — naturalny klaster hardening.  
2. H3 zmienia **kontrakt P0** — nie wolno bundle’ować z H1 jako „quick fix”.  
3. M3 nie wolno „naprawiać” przez dodanie `builtAt` do Heavy.  
4. M1/M2 wymagają świadomości CORE/Edge; M2 nie jest samodzielnym bugfixem UI.  
5. ZERO DUPLICATE: nie tworzyć drugiego `saveTendersPipeline` / drugiego breakera / drugiego retry classifier.

---

## 9. Definition of Done (RCA)

| ✔ | Kryterium |
|---|-----------|
| ✔ | H1–H3 · M1–M3: Root Cause · Mechanizm · Dlaczego tak · Impact · Regresja · Sync Storm · Lokalny/Systemowy · 2–3 warianty |
| ✔ | Brak wyboru wariantu / brak PLAN / brak DF / brak kodu |
| ✔ | Spójność z AUDIT (wszystkie Confirmed) |

**Następny dozwolony krok:** Owner GO → **PLAN** (klastry: Persist contract H1+H2 · Breaker H3 · Retry/Platform M1+M2 · Autonomous FP M3).

---

```text
WGDOM-HARDENING-01 RCA COMPLETE
```
