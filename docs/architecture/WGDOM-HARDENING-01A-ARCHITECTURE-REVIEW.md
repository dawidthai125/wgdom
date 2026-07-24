# WGDOM-HARDENING-01A — ARCHITECTURE REVIEW

> **ID:** WGDOM-HARDENING-01A  
> **STATUS:** ARCHITECTURE REVIEW COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (ARCH REVIEW only)  
> **Wejście:** [`WGDOM-HARDENING-01A-DESIGN-FREEZE.md`](./WGDOM-HARDENING-01A-DESIGN-FREEZE.md) · PLAN · RCA · AUDIT · Sync Storm P0  
> **Poza zakresem:** implementacja · commit · push  
> **Baseline tip:** `e666443` · UI **2.65.39**

```text
══════════════════════════════════════
WGDOM-HARDENING-01A ARCHITECTURE REVIEW

VERDICT:  PASS (WITH BINDING CONSTRAINTS)
Owner IMPLEMENT readiness: YES — po akceptacji C1–C5
══════════════════════════════════════
```

---

## 1. Zakres przeglądu

| Obszar | Wynik |
|--------|-------|
| SSOT FIRST | **PASS** (+ C1 typy) |
| REUSE FIRST | **PASS** |
| ZERO DUPLICATE LOGIC | **PASS** |
| Sync Storm P0 contracts | **PASS** — brak naruszenia |
| Adapter `bindTenderPipelineOnUpdate` | **PASS** (+ C1 warstwowanie) |
| Przepływ local → local → terminal cloud | **PASS** (+ C2 sync-turn) |
| Kill-switch `pipelineBootstrapPersistLocal` | **PASS** (+ C3 merge default-true) |
| Testy A-T1…A-T9 | **PASS** (+ C4 errata numeracji / C5 cancel case) |
| Regresja / Boundary | **PASS** (projekcja FEATURE) |

---

## 2. Werdykt końcowy

### **PASS (WITH BINDING CONSTRAINTS)**

DF 01A jest **architektonicznie poprawny** względem planu, RCA i kontraktu Sync Storm P0.  
Implementacja może startować **tylko** przy przestrzeganiu wiążących constraintów **C1–C5** (nie zmieniają intencji D1–D10; precyzują lukę warstw / settings / testów).

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy DF narusza P0? | **NIE** |
| Czy wprowadza duplicate persist? | **NIE** (przy reuse istniejących writerów) |
| Czy Boundary FEATURE PASS? | **TAK** (projekcja; zero `cloud-sync` / Edge / Payroll) |
| Owner Ready → IMPLEMENT? | **TAK** — po akceptacji C1–C5 |

---

## 3. Checklist szczegółowy

### 3.1 SSOT FIRST — PASS (+ C1)

| SSOT | Ocena |
|------|--------|
| Persist modes = istniejący `TenderItemUpdateOpts` | **OK** — brak mode `"none"` |
| `updateItem` semantyka bez zmian (D4) | **OK** |
| Jeden adapter pod UI `onUpdate` | **OK** |
| Heavy / Bootstrap / Manual → ten sam `updateItem` | **OK** |

**C1 (BINDING) — lokalizacja typów / warstw:**

- Dziś `TenderItemUpdateOpts` żyje w `src/app/hooks/useTenderDossierHeavyLazy.ts`.  
- DF umieszcza adapter w `src/lib/tender-pipeline/bind-tender-pipeline-on-update.ts`.  
- **lib → app import jest zakazany.**

**Wymagane w IMPLEMENT (wybrać jedną ścieżkę, preferowana A):**

| Ścieżka | Opis |
|--------|------|
| **C1-A (prefer)** | Przenieść / wyekstrahować `TenderItemPersistMode`, `TenderItemUpdateOpts`, `TenderItemOnUpdate` do `src/lib/tender-pipeline/tender-item-persist.ts` (SSOT); heavy + pipeline + adapter importują stamtąd; re-export z heavy dla kompatybilności OK |
| **C1-B** | Adapter umieścić w `src/app/...` (np. obok hooks), nie w `src/lib` |

Bez C1 → FAIL warstwowania przy IMPLEMENT.

### 3.2 REUSE FIRST — PASS

| Element | Ocena |
|---------|--------|
| `syncTenderPipelineLocalOnly` | Reuse — mid-flight |
| `scheduleTenderPipelinePersist(..., { force: true })` | Reuse — terminal (= heavy final path) |
| Brak nowego `persistKey` wrappera | **OK** |
| Brak włączania `pipelinePerfDebouncePersist` jako „fixu” | **OK** (D5) |

Uwaga (info): `force: true` nadal debouncuje **500 ms** (istniejące coalesce) — spójne z heavy final; A-T2 liczy **wywołania mode cloud**, nie natychmiastowy HTTP.

### 3.3 ZERO DUPLICATE LOGIC — PASS

- Zakaz drugiego writer’a w DF — egzekwowalny.  
- Adapter to pure bind (zero logiki biznesowej) — **OK**.  
- Panel bez nowych ścieżek persist — **OK** (D3).

### 3.4 Sync Storm P0 — PASS (no breach)

| Kontrakt P0 | DF 01A | Werdykt |
|-------------|--------|---------|
| E-RUN bez `builtAt` | D6/D7 FORBIDDEN | **PASS** |
| Partial heavy → local | OUT heavy file | **PASS** |
| Final heavy → cloud force | OUT | **PASS** |
| Circuit breaker per-FP | D6 FORBIDDEN | **PASS** |
| Bootstrap residual↓ | Cel H1, nie kill-loop | **PASS** (hardening) |
| Suite P0 must PASS | A-T6 | **PASS** |

**Nie jest** amendmentem kontraktu heavy. Bootstrap terminal cloud + heavy final = nadal zgodne z historycznym DoD P0 („≤1 final + ≤1 bootstrap”).

### 3.5 Adapter `bindTenderPipelineOnUpdate` — PASS (+ C1)

```ts
return (patch, opts) => updateItem(itemId, patch, opts);
```

| Kryterium | Werdykt |
|-----------|---------|
| Forward arity | **PASS** |
| Brak drop opts | **PASS** |
| Brak logiki persist w adapterze | **PASS** |
| Zastępuje znane drop sites (`TenderDetailPage:496`, `TendersView:478`) | **PASS** |
| Warstwowanie pliku | **C1** |

`updateItem(id, { status: "seen" })` w `TendersView` **nie** jest drop-wrapperem `onUpdate` — poza A-T5 pattern (OK).

### 3.6 Przepływ local → local → terminal cloud — PASS (+ C2)

| Krok | Ocena |
|------|--------|
| Discovery → local | **PASS** |
| Shell → local | **PASS** |
| Terminal → ≤1 cloud iff `appliedAnyPatch && !cancelled && flag` | **PASS** |
| Flag OFF: mid bez opts, bez dedykowanego terminal flush | **PASS** (legacy) |
| Empty patch flush | Zaakceptowane w DF; bump `updatedAt` — residual OK |

**C2 (BINDING) — jeden synchroniczny turn:**

Terminal `onUpdate({}, { persist: "cloud" })` **musi** być w tej samej synchronicznej kontynuacji co local shell (bez `await` między local a terminal), żeby functional `setItems` złożył discovery+shell przed cloud snapshot.  
Struktura w DF §3.1 to już gwarantuje — **IMPLEMENT nie wolno** wstawiać `await` między tymi wywołaniami.

### 3.7 Kill-switch — PASS (+ C3)

| Kryterium | Werdykt |
|-----------|---------|
| Default ON (`true`) = nowe zachowanie | **PASS** |
| OFF = pre-01A (cloud per patch, bez extra terminal) | **PASS** |
| Soft rollback L1 bez deploy | **PASS** |
| UI checkbox opcjonalny | **PASS** |

**C3 (BINDING) — semantyka load/merge dla default-true:**

Istniejące `pipelinePerf*` używają `=== true` (default false).  
Nowa flaga default **true** wymaga odwrotnej konwencji:

- `load`: `parsed.pipelineBootstrapPersistLocal !== false` → true  
- `merge`: jawne `false` z remote/local wygrywa jako kill; brak pola → true  
- Helper: `isPipelineBootstrapPersistLocalEnabled()` (mirror innych helperów)

Błędny merge (`=== true` jak perf flags) → flaga zawsze OFF na świeżym LS — **regresja H1**.

### 3.8 Testy A-T1…A-T9 — PASS (+ C4, C5)

| ID | Kompletność | Uwagi |
|----|--------------|-------|
| A-T1 | **OK** | Stub: mid-flight zero `saveTendersPipeline` / `persistKey`; local sync >0 |
| A-T2 | **OK** | Licz mode `"cloud"` == 1 (niekoniecznie sync HTTP — debounce 500 ms) |
| A-T3 | **OK** | Arity adaptera |
| A-T4 | **OK** | Flag OFF legacy |
| A-T5 | **OK** | Grep drop-pattern; whitelist tylko z uzasadnieniem |
| A-T6 | **OK** | Sync Storm P0 suite |
| A-T7 | **OK** | build |
| A-T8 | **OK** | OV Network / thrash |
| A-T9 | **OK** | Mobile OV |

**C4 (BINDING — errata DF, nie zmiana designu):**  
W DF §9 M7 napisano „A-T6 mobile” — kolizja z §10 (A-T6 = P0 suite).  
**Kanoniczne:** A-T6 = P0 · A-T8/A-T9 = OV. IMPLEMENT/OV docs używają §10.

**C5 (BINDING — uzupełnienie testu, nie zmiana designu):**  
Dodać **A-T2b** (Must): `cancelled === true` po local → **0** terminal cloud.  
Uzasadnienie: DF §3.1 ma warunek `!cancelled`; bez asercji łatwy regress.

Harness: A-T1…A-T5 + A-T2b w `test-wgdom-hardening-01a-persist.mjs`; A-T6/A-T7 osobno; A-T8/A-T9 OV checklist.

---

## 4. Wykryte ryzyka regresji

| ID | Ryzyko | Sev | Status | Mitygacja |
|----|--------|-----|--------|-----------|
| R1 | lib→app import typów | HIGH | **C1** | Typy w `lib` lub adapter w `app` |
| R2 | Stary snapshot cloud bez shell (await między update) | HIGH | **C2** | Jeden sync turn |
| R3 | Merge flagi default-true jak perf flags | HIGH | **C3** | `!== false` + helper |
| R4 | Cancel bez asercji → zbędny cloud | MEDIUM | **C5** | A-T2b |
| R5 | Kill app między local a terminal cloud | MEDIUM | Accepted DF | LS + LWW; OV 2. urządzenie |
| R6 | Empty-patch bump `updatedAt` / LWW noise | LOW | Accepted DF | Monitor OV |
| R7 | Terminal cloud + heavy final = 2 cloud/open | LOW | By design P0 DoD | A-T8: brak lawiny |
| R8 | Mixed WT (ARCH-02F/Edge) w tym samym commit | HIGH | Process | #CORE-013 scope-only |
| R9 | A-T1 myli debounce HTTP z mode count | MEDIUM | Test design | Licz wywołania `persist:"cloud"` / schedule force |

**Krytyczne P0 (builtAt / breaker / partial→cloud):** brak ścieżki regresji w DF przy przestrzeganiu OUT.

---

## 5. Boundary Check (#CORE-014) — potwierdzenie

```text
BUNDLE: WGDOM-HARDENING-01A
DOMINANT CLASS: FEATURE / HIGH Tenders persist
TOUCHES PROTECTED CORE: NIE
#CORE-013: scope-only · zakaz mixed z cloud-sync / Edge / Payroll / ARCH-02F
WERDYKT PROJEKCJI: FEATURE PASS
```

`app-settings.ts` = PLATFORM settings (flaga) — dozwolone w FEATURE-adjacent bundle (precedens `pipelinePerf*`).

---

## 6. Rekomendacje (nie otwierają ponownie DF D1–D10)

| # | Rekomendacja | Priorytet |
|---|--------------|-----------|
| Rec1 | Zastosować **C1-A** (typy persist w `lib/tender-pipeline`) | Must przed kodem |
| Rec2 | Helper `isPipelineBootstrapPersistLocalEnabled()` | Must (C3) |
| Rec3 | A-T2b cancel → 0 terminal cloud | Must (C5) |
| Rec4 | Opcjonalnie: `onUpdateItem` na DetailPage też przez adapter (spójność) | Nice |
| Rec5 | AdminSettings checkbox flagi — opcjonalnie w tym samym bundle lub follow-up | Nice |
| Rec6 | Po CLOSE 01A: EPIC D porównanie 546 / Δset | Process |
| Rec7 | Nie bundle’ować 01A z EPIC B1 / C | Process |

---

## 7. Owner Readiness — IMPLEMENT

| Warunek | Stan |
|---------|------|
| AUDIT 01 | ✓ |
| RCA 01 | ✓ |
| PLAN 01 | ✓ |
| DF 01A | ✓ FROZEN |
| ARCH REVIEW 01A | ✓ **PASS (+ constraints)** |
| Boundary projekcja | ✓ FEATURE PASS |
| C1–C5 zaakceptowane przez Ownera | ⏸ **wymagane przed GO IMPLEMENT** |
| IMPLEMENT | ⛔ do jawnego `Owner GO: IMPLEMENT 01A` |

### Formuła GO

```text
Owner GO: IMPLEMENT 01A
+ akceptacja binding constraints C1–C5
```

---

## 8. Binding Constraints — lista kontrolna Ownera

- [ ] **C1** Typy persist SSOT w `lib` (prefer) **lub** adapter poza `lib`  
- [ ] **C2** Brak `await` między local shell a terminal cloud  
- [ ] **C3** Load/merge flagi `!== false` + helper  
- [ ] **C4** Numeracja testów wg DF §10 (A-T6 = P0)  
- [ ] **C5** A-T2b cancel → 0 terminal cloud  

---

## 9. Definition of Done (ARCH REVIEW)

- [x] PASS/FAIL wydany  
- [x] Ryzyka R1–R9  
- [x] Rekomendacje Rec1–Rec7  
- [x] Owner Readiness określony  
- [x] Zero implementacji / commit / push  

**Następny krok:** Owner akceptuje C1–C5 → **`Owner GO: IMPLEMENT 01A`**.

---

```text
WGDOM-HARDENING-01A ARCHITECTURE REVIEW COMPLETE
VERDICT: PASS (WITH BINDING CONSTRAINTS)
```
