# WGDOM-HARDENING-01 — AUDIT (Evidence Report)

> **ID:** WGDOM-HARDENING-01  
> **STATUS:** AUDIT COMPLETE  
> **Data:** 2026-07-24  
> **Zakres:** H1–H3 · M1–M3 (Final Audit residual)  
> **Zakazane w tej fazie:** RCA · PLAN · DESIGN · implementacja · commit · push  
> **Baseline tip:** `e666443` · UI **2.65.39** · Final Audit Sync Storm **PRODUCTION READY**  
> **Źródła SSOT:** `docs/architecture/WGDOM-FINAL-PRODUCTION-AUDIT-01.md` · `docs/AI/07_KNOWN_RISKS.md` · `docs/AI/09_PRODUCTION_BASELINE.md`

```text
══════════════════════════════════════
WGDOM-HARDENING-01 AUDIT COMPLETE
Scope: H1–H3 · M1–M3
Mode:  evidence-only (no RCA/PLAN/code)
══════════════════════════════════════
```

---

## 0. Metoda

1. Odczyt findingów Final Audit (H1–H3, M1–M3) jako hipotez.
2. Potwierdzenie / obalenie wyłącznie przez: kod tip (working tree odczyt read-only) + artefakt live smoke `.tmp/final-prod-audit-multi-tender.json`.
3. Brak zmian w `src/` · brak commit · brak push.
4. Ocena ryzyka względem klasy Sync Storm 23.07 (infinite thrash) vs residual load / contract / monitor.

---

## 1. Macierz werdyktów

| ID | Claim (Final Audit) | Status | Risk (residual) |
|----|---------------------|--------|-----------------|
| **H1** | Bootstrap `onUpdate` bez `persist:"local"` → immediate fat cloud | **Confirmed** | HIGH (load) · **nie** Sync Storm infinite |
| **H2** | Legacy/panel path gubi persist opts → cloud | **Confirmed** | HIGH (contract) · heavy path **nie** ominięty |
| **H3** | Circuit breaker per fingerprint — brak global hard-stop | **Confirmed** | HIGH (bounded churn) · **nie** infinite |
| **M1** | Deadlock retry ×4 (`40P01`) amplifier | **Confirmed** | MEDIUM (conditional amplifier) |
| **M2** | Edge **546×2** w multi-open smoke | **Confirmed** | MEDIUM (observational / platform) |
| **M3** | Autonomous FP zawiera `dossier.builtAt` | **Confirmed** | MEDIUM (gate UI) · **nie** E-RUN |

**False Positive / Not Reproduced:** *brak* w zakresie H1–H3 / M1–M3.

---

## 2. H1 — Bootstrap local persist

### Status
**Confirmed**

### Claim
Discovery / shell bootstrap woła `onUpdate(patch)` **bez** `{ persist: "local" }`. Przy `pipelinePerfDebouncePersist=false` (default) każdy patch = natychmiastowy `saveTendersPipeline` (LS + `persistKey` fat KV).

### Evidence

| Dowód | Lokalizacja |
|-------|-------------|
| Typ bootstrap **bez** opts | `useTenderDocumentsBootstrap.ts:145` — `onUpdate: (patch) => void` |
| Discovery persist shell | `:206` — `onUpdate(discovery.patch)` |
| Shell dossier/SWZ persist | `:252` — `onUpdate(shellPatch)` |
| Hook strip opts | `:329` — `onUpdate: (patch) => onUpdateRef.current(patch)` |
| Default debounce OFF | `app-settings.ts:75` — `pipelinePerfDebouncePersist: false` |
| `updateItem` bez mode → immediate cloud | `useTendersPipeline.ts:283–288` — `else { void saveTendersPipeline(next) }` |
| `saveTendersPipeline` = LS + cloud | `tenders-bzp.ts:699–702` — `persistKey(TENDERS_PIPELINE_KEY, items)` |
| Live residual writes | `.tmp/final-prod-audit-multi-tender.json` — Δset ≤3 / open · sum Δset=22 / 11 opens · `anyThrash=false` |

### Root area
`src/app/hooks/useTenderDocumentsBootstrap.ts` → `useTendersPipeline.updateItem` (default branch) → `saveTendersPipeline` / fat key `kw-tenders-pipeline`.

### Risk
- **HIGH** pod względem load / egress / Edge pressure przy otwarciu Dokumentów.  
- **Nie** odtwarza klasy Sync Storm 23.07 (brak pętli `builtAt` ↔ E-RUN) — Final Audit §3: „Residual load — nie klasyczny storm”.  
- Bounded w empirii (max Δset=3 / open).

### Recommendation (AUDIT only — nie PLAN)
W kolejnej fazie RCA/PLAN: rozważyć jawny `{ persist: "local" }` (lub debounce) dla bootstrap discovery/shell, **bez** zmiany kontraktu heavy P0. Nie mieszać z FEATURE UI.

---

## 3. H2 — Persist contract consistency

### Status
**Confirmed**

### Claim
Legacy / panel wrappers podają `onUpdate` z **jednym** argumentem → gubią `opts.persist` → zawsze default cloud path.

### Evidence

| Dowód | Lokalizacja |
|-------|-------------|
| Runtime path **forwarduje** opts (OK) | `TenderDetailPage.tsx:158–160` — `pipeline.updateItem(..., opts)` → `useTenderPipelineRuntime` |
| Legacy embed **drop** opts | `TenderDetailPage.tsx:496` — `onUpdate={(patch) => pipeline.updateItem(item.id, patch)}` |
| List accordion host **drop** opts | `TendersView.tsx:478` — j.w. |
| Panel type deklaruje opts | `TenderDetailPanel.tsx:108` — `opts?: { persist?: "local" \| "cloud" }` |
| Panel **nigdy** nie przekazuje `persist` w call sites | grep `onUpdate(...persist` w `TenderDetailPanel.tsx` → **0 hits** |
| Jedyny producent `{ persist }` w app | `useTenderDossierHeavyLazy.ts:242,279,312` — path przez runtime `onUpdateItem`, **nie** przez legacy wrapper |

### Root area
UI adapters: `TenderDetailPage` legacy workspace · `TendersView` hosted panel · kontrakt `TenderDetailPanel.onUpdate`.

### Risk
- **HIGH** jako niespójność kontraktu persist (SSOT `TenderItemUpdateOpts` vs realne call sites).  
- **Nie** omija Sync Storm P0 na heavy E-RUN (heavy używa `onUpdateItem` z forwardem opts).  
- Manualne patch’e z panelu = zawsze cloud (obecne zachowanie + brak emitów `persist` z panelu).

### Recommendation (AUDIT only)
Ujednolicić kontrakt: albo forward `opts` we wszystkich wrapperach, albo zawęzić typ panelu (bez fałszywej obietnicy `persist`). Osobno od H1 (bootstrap).

---

## 4. H3 — Global Circuit Breaker / fingerprint scope

### Status
**Confirmed**

### Claim
Circuit breaker jest **per** `(itemId, gateFingerprint, retryNonce)` z max **2** — nowy fingerprint = nowy klucz (reset limitu). Brak globalnego hard-stop na item.

### Evidence

| Dowód | Lokalizacja |
|-------|-------------|
| Komentarz + mapa attempts | `useTenderDossierHeavyLazy.ts:24–26` |
| Max 2 / key | `:26` — `HEAVY_MAX_RUNS_PER_KEY = 2` |
| Key composition | `:86–87` — `` `${itemId}::${gateFingerprint}::${retryNonce}` `` |
| Trip breaker | `:194–200` |
| E-RUN deps (bez `builtAt`) | `:29–35`, `:349` — `HEAVY_E_RUN_DEP_KEYS` |
| FP z dokumentów (docs churn) | `:163–172` — `buildHeavyParseDocumentFingerprint` |
| FP string zawiera `parserVersion` (L1 osobno) | `unified-attachment-gate.ts:144` — ale useMemo deps heavy **bez** `parserVersion`/`builtAt` |
| Live | multi-tender: `anyThrash=false`, max `uniqueBuiltAt=2` |

### Root area
`src/app/hooks/useTenderDossierHeavyLazy.ts` — circuit breaker scope · `gateFingerprint` w E-RUN deps.

### Risk
- **HIGH** residual: wzrost dokumentów → nowy FP → do 2 dodatkowych heavy runs (bounded, nie infinite).  
- **Nie** false positive względem claimu „brak global breaker”.  
- **Nie** Sync Storm infinite — Final Audit: „Bounded restarts (≤2 / FP)”.

### Recommendation (AUDIT only)
RCA/PLAN: rozważyć breaker **per itemId** (global) vs obecny per-FP — trade-off: ochrona przed churn vs legalne re-parse po nowych docs. Nie ruszać `HEAVY_E_RUN_DEP_KEYS` bez DF Sync Storm.

---

## 5. M1 — Deadlock retry review

### Status
**Confirmed**

### Claim
Retry `batch-set` do **4** HTTP przy transient `deadlock` / `40P01` nadal aktywny — potencjalny amplifier load (nie dotyczy HTML CF 522).

### Evidence

| Dowód | Lokalizacja |
|-------|-------------|
| Delays + max attempts | `cloud-batch-set-retry.ts:7–10` — delays `[250,500,1000]` → **4** attempts |
| Klasyfikator tylko deadlock/40P01 | `:16–19` — `status ≥ 500` ∧ (`deadlock detected` \| `40p01`) |
| Użycie w sync | `cloud-sync.ts:2950–3015` — loop + `isTransientBatchSetError` |
| Decyzja obowiązująca | `docs/AI/12_DECISION_LOG.md` **D-13** — retry tylko 40P01 (nie CF 522) |
| N2 gated | `docs/AI/09` — `CLOUD-P0-DEADLOCK-N2` READY · **GATED** |

### Root area
`src/lib/cloud-batch-set-retry.ts` + `cloud-sync.ts` batch-set push loop. CORE Sync.

### Risk
- **MEDIUM** — amplifier **warunkowy** (tylko przy prawdziwym DB deadlock).  
- Nie odtworzony w smoke Final Audit jako 522/storm.  
- Zmiana bez Owner GO = naruszenie D-13 / CORE.

### Recommendation (AUDIT only)
Review w ramach N2 (gated): czy ×4 nadal adekwatne pod load fat pipeline; **nie** rozszerzać retry na inne 5xx/HTML. Wymaga CORE Owner GO.

---

## 6. M2 — Edge 546 monitoring

### Status
**Confirmed** (observational)

### Claim
W live multi-open (11 przetargów) Edge zwrócił **546×2** (brak 522) — sygnał obciążenia, nie Sync Storm.

### Evidence

| Dowód | Wartość |
|-------|---------|
| Artefakt | `.tmp/final-prod-audit-multi-tender.json` · `at: 2026-07-24T00:45:59.180Z` |
| `netTotals.status` | `200: 414` · `546: 2` · **brak** `522` |
| `anyThrash` / `any522` | `false` / `false` |
| Pipe | max Δset=3 · max Δget=5 · totals pipe set/get 22/46 |
| Docs | Final Audit §1 M2 · §6 · `docs/AI/07` **M-EDGE-546** = MONITOR |

### Root area
Platform / Edge / fat `kw-tenders-pipeline` under concurrent open — **brak** lokalnego defektu aplikacji wyizolowanego w tym AUDIT (poza residual load H1/H-FAT).

### Risk
- **MEDIUM** — sporadyczny 546 ≠ outage; eskalacja przy wzroście multi-open / fat payload.  
- Nie potwierdza powrotu klasy 23.07.

### Recommendation (AUDIT only)
Monitoring: próg alertu na rate 546 w smoke multi-tender; korelacja z H1 fat writes. Chunk Edge = osobny gated epic (nie ten AUDIT).

---

## 7. M3 — Fingerprint consistency (Autonomous vs Heavy)

### Status
**Confirmed**

### Claim
`buildAutonomousRunFingerprint` / parts zawierają `dossier.builtAt` (+ `parserVersion`) → może wymusić ponowny Autonomous Gate UI. **Nie** jest w E-RUN deps heavy.

### Evidence

| Dowód | Lokalizacja |
|-------|-------------|
| `kosztorys` part zawiera `builtAt` | `tender-autonomous-run-fingerprint.ts:69–74` |
| `deriveAutonomousRunRequired` na zmianę FP | `:117–118` — `fingerprint !== lastCompletedFingerprint` → `true` |
| Heavy E-RUN **bez** `builtAt` | `HEAVY_E_RUN_DEP_KEYS` · deps effect `:349` |
| Kontrast SSOT | Final Audit M3 · D-12 Sync Storm P0 |

### Root area
`src/lib/tender-autonomous-run-fingerprint.ts` (Autonomous Gate) — **osobna klasa** od heavy E-RUN.

### Risk
- **MEDIUM** — re-run UI gate / autonomous po partial dossier updates.  
- **Nie** restartuje heavy parse przez `builtAt` (P0 intact).  
- Mylenie z H3 / Sync Storm = błąd klasyfikacji.

### Recommendation (AUDIT only)
Osobny ticket/fingerprint policy dla Autonomous (czy `builtAt` ma być w FP). Nie łączyć z H3 breaker bez DF.

---

## 8. Cross-check vs Sync Storm P0

| Hipoteza „wraca 23.07” | Wynik AUDIT |
|------------------------|-------------|
| H1 bootstrap cloud | Residual N× fat write / open — **nie** E-RUN↔builtAt loop |
| H2 drop opts | Nie omija heavy `{persist:local\|cloud}` |
| H3 per-FP breaker | Bounded ≤2 / FP — live thrash=false |
| M1 retry | Tylko 40P01; nie CF 522 |
| M2 546 | Load signal; 522=0 |
| M3 autonomous builtAt | Gate UI only |

**Wniosek:** wszystkie 6 findingów **Confirmed**; żadne nie obala P0 ani nie klasyfikuje się jako CRITICAL Sync Storm regression.

---

## 9. Boundary / process notes (dla kolejnych faz)

| Zasada | Implikacja |
|--------|------------|
| SSOT FIRST | Persist mode SSOT = `TenderItemUpdateOpts` + `updateItem`; heavy = `HEAVY_E_RUN_DEP_KEYS` |
| REUSE FIRST / ZERO DUPLICATE | Nie dodawać drugiego persist pipeline; naprawiać call sites / typy |
| STABILIZATION + Owner GO | H1–H3 / M1 = CORE-adjacent → IMPLEMENT tylko po RCA→DF→Owner GO |
| Mixed WT | Lokalne WIP ARCH-02F / Edge chunk **poza** scope HARDENING — nie mieszać commitów (#CORE-013) |

---

## 10. Definition of Done (AUDIT)

| ✔ | Kryterium |
|---|-----------|
| ✔ | H1–H3 · M1–M3 mają Status / Evidence / Root area / Risk / Recommendation |
| ✔ | Zero False Positive w zakresie |
| ✔ | Brak RCA / PLAN / DESIGN / kodu / commit / push |
| ✔ | Artefakt live 546 zachowany jako evidence path |

**Następny dozwolony krok:** Owner GO → **RCA** (per finding lub epic-level), potem PLAN.

---

```text
WGDOM-HARDENING-01 AUDIT COMPLETE
```
