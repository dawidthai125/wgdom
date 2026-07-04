# PAYROLL Runtime Trace — First RCA (deterministic loss point)

> **Data:** 2026-07-04  
> **Wersja trace:** **2.63.29**  
> **SSOT:** [`PAYROLL-RUNTIME-TRACE-SPEC.md`](PAYROLL-RUNTIME-TRACE-SPEC.md) §11  
> **Status prod incydentu:** **OPEN** — poniższy RCA z symulacji lokalnej; prod wymaga dwóch dumpów

---

## Werdykt RCA (symulacja lokalna)

```text
PIERWSZY PUNKT UTRATY subjectPresent: TRUE → FALSE

Event:  sync.merge.payroll.finalize
Phase:  MERGE
Klasa:  RC-04b (Merge richness override)
```

---

## 1. Scenariusz testowy

| Krok | Urządzenie | Akcja |
|------|------------|-------|
| 1 | A (chrome-desktop) | Add `dir-new` → domain push |
| 2 | B (iphone-safari) | Bootstrap merge (symulacja refresh) |
| 3 | A | `computeMergedDataBundle` (symulacja runCloudSync) |
| 4 | A | **Adversarial:** cloud bogatszy od local → richness override |

**operationId:** `op-trace-repro-20260704`  
**subjectMergeKey:** `dir:dir-new`  
**Komenda:** `npx vite-node scripts/test-payroll-runtime-trace-repro.mjs`

---

## 2. Timeline skrót (adversarial)

```text
payroll.roster.ui.add              subjectState=CREATED   subjectPresent=true
payroll.roster.push.start          subjectPresent=true
payroll.roster.ls.write (G6)       subjectPresent=true
sync.http.batch_set.result         ok=true
edge.kv.week_employees.write       writtenCount=2
sync.merge.all_keys.week_employees local=true cloud=true out=true
sync.merge.payroll.finalize        richnessOverride=true  subjectPresent=FALSE  ← FIRST LOSS
```

---

## 3. Event utraty (pełny)

```json
{
  "event": "sync.merge.payroll.finalize",
  "phase": "MERGE",
  "richnessOverride": true,
  "localR": 24,
  "cloudR": 67,
  "localActiveDays": 5,
  "cloudActiveDays": 6,
  "out": {
    "count": 1,
    "subjectPresent": false,
    "subjectState": "OVERWRITTEN",
    "subjectMergeKey": "dir:dir-new"
  }
}
```

---

## 4. Klasyfikacja RC Matrix

| Pole | Wartość |
|------|---------|
| **Klasa** | **RC-04b** |
| **Nazwa** | Merge richness override |
| **Warunek §11.2** | `richnessOverride=true` + `finalize.out.subjectPresent=false` |
| **Pierwszy event** | E10 `sync.merge.payroll.finalize` |
| **Gałąź** | MERGE (nie KV) — `batch-get` raw miałby subject=true |

**Reguła priorytetu §11.1:** Priorytet 4 (MERGE) — nie RC-03*, bo utrata następuje po merge, nie w surowym KV.

---

## 5. Happy path (bez utraty)

W tym samym skrypcie scenariusz A→B→A **bez** adversarial:

- `eventCount`: 15
- `subjectPresent` po sync: **true**
- `firstSubjectLoss`: **null**

→ Trace poprawnie rozróżnia brak incydentu vs punkt utraty.

---

## 6. Prod repro (wymagane do zamknięcia incydentu)

Symulacja **nie zastępuje** prod Chrome/Safari. Procedura:

1. Deploy **2.63.29**
2. Na **obu** urządzeniach przed add:
   ```javascript
   __wgdomPayrollTraceSetOperation('op-prod-YYYYMMDD-HHMM')
   ```
3. A: `__wgdomPayrollTraceSetDevice('chrome-desktop')` → dodaj pracownika
4. B: `__wgdomPayrollTraceSetDevice('iphone-safari')` → refresh ≤30s
5. A: refresh po ≥10s
6. Export:
   ```javascript
   __wgdomPayrollTraceDump('op-prod-YYYYMMDD-HHMM')
   ```
   na **A i B** (KG-3)

**Deterministyczny prod RCA** = `firstSubjectLoss` z dumpu A (post-sync) skorelowany z timeline B (bootstrap).

---

## 7. Hipoteza robocza (nie fix)

Jeśli prod potwierdzi ten sam event:

- **Przyczyna mechaniczna:** `finalizePayrollBundleMerge` adoptuje bogatszą chmurę (`cloudR > localR` lub `cloudActiveDays > localActiveDays`) i **zastępuje** lokalny roster cloud-only — nowy pracownik z minimalnymi dniami ginie.
- **Nie S2 w tym kroku** — wymaga Owner GO po prod dump.
- **Alternatywy do wykluczenia na prod:** RC-03b (bootstrap push), RC-04a (pick_side), RC-05 (apply) — trace je rozdziela po `firstSubjectLoss.event`.

---

## 8. Werdykt

| Kryterium | Status |
|-----------|--------|
| Trace identyfikuje pierwszy FALSE | **PASS** (symulacja adversarial) |
| Klasa RC jednoznaczna | **RC-04b** (w symulacji) |
| Prod incydent zamknięty | **OPEN** — czeka na dumpy prod |
| Fix wdrożony | **NIE** — zgodnie z zakresem |

---

**Ostatnia aktualizacja:** 2026-07-04 · First RCA · trace v2.63.29
