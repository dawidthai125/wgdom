# IK AUTONOMY-05 — Explicit AUTO / OFF / ON · DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE READY FOR ARCH REVIEW** |
| **Date** | 2026-08-17 |
| **Mode** | DESIGN FREEZE ONLY · NO IMPLEMENT · NO KV WRITE |
| **Source of truth** | [`IK-AUTONOMY-05-OD2-OWNER-DECISION.md`](./IK-AUTONOMY-05-OD2-OWNER-DECISION.md) |
| **Production** | **2.66.89** / **`d62eb2a`** |

```text
OD-2   = APPROVED
OD-2b  = ACCEPTED
P5/P6  = "AUTO" | "OFF" | "ON"
NO NEW ENGINE
NO NEW FLAG
```

---

## 1. Context

`IkEntryHost` ma już bindingi P5/P6 i uruchamia istniejące eksperckie silniki. Bloker AUTONOMY-04 dotyczył wyłącznie semantyki booleana (`true/false`) i braku rozróżnienia AUTO vs explicit OFF.

Ten freeze zamraża kontrakt Option B dla istniejących kluczy P5/P6.

---

## 2. Owner Decisions OD-2 / OD-2b

Zamrożone decyzje:

- `OD-2 = APPROVED`
- `OD-2b = ACCEPTED`
- Legacy map:
  - `true -> ON`
  - `missing -> AUTO`
  - `false -> AUTO`
- Jedyny trwały kill-switch po migracji: `OFF`.

---

## 3. Current State

Obecnie:

- `ikLaborE2eEnabled` i `ikMaterialE2eEnabled` są boolean.
- `loadAppSettingsLocal` robi `=== true`, więc missing/enum collapse do `false`.
- `AdminSettingsModal` zapisuje checkbox (`true/false`) pełnym blobem przez `saveAppSettings`.
- `CloudLoader` i `syncAppSettingsFromCloud` materializują merge do LS jako pełny obiekt.

Skutek: obecny kontrakt nie utrzymuje AUTO/OFF/ON.

---

## 4. Problem

Potrzebny jest jednocześnie:

1. AUTO uruchamiające read-only MODE A po `IK ON + BOQ READY`,
2. jawny i trwały kill-switch Ownera,
3. brak nowej flagi i brak nowego engine.

Boolean nie spełnia (1)+(2). Option B spełnia.

---

## 5. Target Contract

Te same klucze (`ikLaborE2eEnabled`, `ikMaterialE2eEnabled`) przyjmują:

- `"AUTO"`
- `"OFF"`
- `"ON"`

Semantyka:

```text
MODE A RUN = ikEntryEnabled
             ∧ masterBoq.readyForExperts
             ∧ mode in {AUTO, ON}
             ∧ executeResearch = false

HOLD       = mode == OFF OR !ikEntryEnabled OR !ready
```

Brak nowego orchestratora, brak nowego engine.

---

## 6. P5 AUTO / OFF / ON

| Mode | Zachowanie |
|------|------------|
| AUTO | Labor MODE A auto, read-only, `executeResearch=false` |
| ON | Labor MODE A auto, read-only, `executeResearch=false` |
| OFF | Labor HOLD (explicit Owner kill-switch) |

P5 MODE A nie może wykonywać:

- HTTP Research
- Accept
- zapisu ceny
- CatalogWork mutation

MISS pozostaje GAP/RESEARCH_SKIPPED.

---

## 7. P6 AUTO / OFF / ON

| Mode | Zachowanie |
|------|------------|
| AUTO | Material MODE A auto, read-only, `executeResearch=false` |
| ON | Material MODE A auto, read-only, `executeResearch=false` |
| OFF | Material HOLD (explicit Owner kill-switch) |

P6 MODE A:

- może czytać Price Memory / istniejące read paths,
- nie może robić Research HTTP,
- nie może robić Accept,
- nie może pisać PRICE_DEMAND / CatalogWork / PM.

P1/P2 protections bez zmian:

- `mat.inv.* -> P1_INVOICE_HOST`, nigdy DIY research,
- P2 gaps pozostają gaps.

---

## 8. Legacy Migration

Deterministyczny mapping:

| Legacy | New |
|--------|-----|
| `true` | `ON` |
| `missing` | `AUTO` |
| `false` | `AUTO` |

Uzasadnienie: historyczne `false` nie jest dowiedzionym explicit OFF (mix default/coerce/full-blob save).

Po migracji: AUTO/OFF/ON są rozłączne semantycznie.

---

## 9. Settings Load / Merge / Save Contract

Freeze wymaga jednego spójnego kontraktu (w jednym releasie):

1. **Load**: parse mode (`AUTO|OFF|ON`) + normalize legacy (`true/false/missing`).
2. **Merge**: merge mode, gdzie explicit `OFF` jest trwałe i nie ginie przy hydration.
3. **Save**: zapisywany jest enum, nie bool.
4. **CloudLoader/sync**: zapisują enum po merge, nie bool collapse.

Zakaz częściowej migracji (np. sam UI bez load/merge).

---

## 10. Admin UI Contract

Super Admin:

- P5 control: `AUTO / OFF / ON`
- P6 control: `AUTO / OFF / ON`

Wymagane copy:

- AUTO: "IK automatycznie wykonuje read-only MODE A"
- ON: "MODE A wymuszony"
- OFF: "IK nie uruchamia tego eksperta"

OFF ma być świadomą decyzją Ownera (confirmation).  
Brak nowej flagi. Brak zmian D.

---

## 11. Research Boundary

Research zostaje **CONDITIONAL**.

AUTO P5/P6 nie może ustawiać `executeResearch=true`.

Research uruchamia się wyłącznie istniejącym kontraktem MODE B (`ik*ResearchEnabled === true` + istniejące guardy).  
Research candidate zawsze wymaga Owner Accept.

`Evidence != OUR RATE`, `Research != Accept`.

---

## 12. Accept / Price / Final Bid Boundary

Read-only core może analizować i przygotować dane, ale nie może:

- Accept candidate,
- commitować ceny,
- mutować OUR RATE / Price Memory,
- zatwierdzać final bid,
- wykonywać decision persist biznesowy.

Statusy zamrożone:

- Research Accept = OWNER
- Price Commit = OWNER
- Final Bid = OWNER
- D = HARD STOP / FALSE

---

## 13. Autonomy Walk

Reuse existing flow:

`Document -> Classification -> P5 -> P6 -> Composite -> P7 -> Chief -> P8`

Zasady:

- brak nowego walk engine,
- brak nowego orchestratora,
- brak zmian engine Composite/P1/P2/F5.

Composite pozostaje CLOSED i działa existing consumerem.

---

## 14. Safety Invariants

1. D = false.  
2. P1 unchanged.  
3. P2 KEEP GAP.  
4. Composite CLOSED.  
5. CatalogWork = 471.  
6. AUTO != Research.  
7. AUTO != Accept.  
8. AUTO != Price Commit.  
9. OFF = explicit kill-switch.  
10. ON = MODE A.  
11. AUTO = MODE A.  
12. MODE A = `executeResearch=false`.  
13. GAP != 0 PLN.  
14. NO EVIDENCE != 0 PLN.  
15. Evidence != OUR RATE.  
16. No auto Accept.  
17. No unit remapping.  
18. No business write in AUTO MODE A.  
19. No PRICE_DEMAND persistence in AUTO MODE A.  
20. No Edge research lease in AUTO MODE A.  
21. `mat.inv.*` never enters DIY Research.  
22. P2 product identity gaps remain gaps.  
23. Composite parent remains COMPOUND.  
24. Composite does not enter F5/P7 bid path.  

---

## 15. Migration Invariants

- Nie wolno używać `|| true`.
- Nie wolno mapować legacy `false` na explicit `OFF`.
- Nie wolno wdrażać częściowo: load/merge/save/UI/CloudLoader muszą być spójne.
- Roll-forward ma być idempotentny: ponowny load nie zmienia już zmapowanych wartości.

---

## 16. Test Matrix

Definicja (bez uruchamiania teraz):

- T01 legacy true -> ON
- T02 legacy missing -> AUTO
- T03 legacy false -> AUTO
- T04 explicit AUTO -> MODE A
- T05 explicit ON -> MODE A
- T06 explicit OFF -> HOLD
- T07 P5 AUTO + P6 AUTO
- T08 P5 OFF + P6 AUTO
- T09 P5 AUTO + P6 OFF
- T10 P5 OFF + P6 OFF
- T11 AUTO -> `executeResearch=false`
- T12 AUTO -> zero business writes
- T13 AUTO -> zero Accept
- T14 AUTO -> D unchanged false
- T15 `mat.inv.*` blocked
- T16 canonical `mat.*` allowed
- T17 P2 KEEP GAP unchanged
- T18 P1 regression
- T19 Composite regression
- T20 CatalogWork remains 471
- T21 Admin save preserves enum
- T22 Cloud merge preserves enum
- T23 legacy migration idempotent
- T24 Research remains conditional
- T25 Final Bid remains Owner-only

---

## 17. Non-goals

OUT:

- Research redesign / V2 / provider redesign
- P2 expansion / invoice-host redesign
- Classification V2
- Composite/F5/P7/Chief/P8 redesign
- D changes
- CatalogWork cleanup
- Accept / PM redesign
- nowe flagi P5/P6
- auto Accept / auto Price Commit / auto Final Bid

---

## 18. Rollback

Rollback kontraktu B ma być fail-safe:

- starszy kod traktuje enum jako false -> HOLD,
- nie uruchamia przypadkowo Research/Accept,
- nie narusza D/P1/P2/Composite invariants.

Enum values w KV nie mogą wymusić auto-write biznesowego po rollbacku.

---

## 19. Implementation Sequence

Po arch review (nie teraz):

1. Zmiana typu/normalizera dla P5/P6 modes.
2. Update load/merge/save/CloudLoader (spójny release).
3. Update helperów `isIkP5/P6*Active` do mode semantics.
4. Update Admin UI na 3-stanowe controls.
5. Update test harness + T01–T25.
6. PV read-only core na real tender (bez claims Research, jeśli brak legal MISS).

Zero nowego engine i zero nowych flag.

---

## 20. Acceptance Criteria (A1–A15)

A1. `IK ON + BOQ READY + P5=AUTO` uruchamia P5 MODE A.  
A2. `IK ON + BOQ READY + P6=AUTO` uruchamia P6 MODE A.  
A3. `P5/P6=OFF` daje HARD HOLD (trwały kill-switch).  
A4. `P5/P6=ON` uruchamia MODE A.  
A5. AUTO/ON nie uruchamia Research (`executeResearch=false`).  
A6. Research pozostaje CONDITIONAL (osobny kontrakt MODE B).  
A7. Research Accept pozostaje OWNER.  
A8. Price Commit i Final Bid pozostają OWNER.  
A9. D pozostaje false (HARD STOP).  
A10. P1 unchanged (`mat.inv.*` blocked).  
A11. P2 KEEP GAP unchanged.  
A12. Composite CLOSED unchanged, parent COMPOUND, no F5 feed.  
A13. No business write w AUTO MODE A (Catalog/PM/PRICE_DEMAND/lease/tender).  
A14. GAP/NO EVIDENCE nigdy nie staje się 0 PLN.  
A15. Legacy migration deterministic: true->ON, missing->AUTO, false->AUTO.  

---

## 21. Owner Approval Gate

Gate przed implementacją:

- OD-2 APPROVED
- OD-2b ACCEPTED
- Design Freeze przechodzi ARCH REVIEW

Dopiero potem: implementacja.  
W tym kroku: **brak** kodu, **brak** migracji, **brak** settings/KV write.

---

## Freeze Status

```text
DESIGN FREEZE = READY FOR ARCH REVIEW
IMPLEMENTATION = NOT STARTED
CODE/SETTINGS/KV/DEPLOY = ZERO
```
