# IK AUTONOMY-05 — OD-2 Owner Decision

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-05-OD2-OWNER-DECISION` |
| **Status** | **OD-2 APPROVED** · **OD-2b ACCEPTED** · **READY FOR DESIGN FREEZE** |
| **Date** | 2026-08-17 |
| **Mode** | OWNER DECISION ONLY · **NO IMPLEMENT** · **NO DF** · **NO KV** |
| **Plan** | [`IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-PLAN.md`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-PLAN.md) |
| **Production** | **2.66.89** / **`d62eb2a`** (unchanged) |

```text
OD-2            = APPROVED
OD-2b           = ACCEPTED
Option B        = APPROVED
P5 AUTO         = READY (plan · post-DF implement)
P6 AUTO         = READY (plan · post-DF implement)
Kill-switch OFF = READY (plan · stored "OFF")
Design Freeze   = ALLOWED (next step · not created here)
Code            = ZERO
Settings write  = ZERO
Commit          = NOT DONE
```

---

## OD-2 — Option B

**APPROVED.**

Istniejące klucze `AppSettings` (bez nowej flagi):

| Key | Docelowy typ |
|-----|----------------|
| `ikLaborE2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |
| `ikMaterialE2eEnabled` | `"AUTO" \| "OFF" \| "ON"` |

Semantyka runtime (MODE A only):

| Mode | Zachowanie |
|------|------------|
| **AUTO** | IK ON ∧ Master BOQ READY → P5/P6 MODE A · read-only · `executeResearch=false` |
| **OFF** | Jawny, trwały Owner kill-switch → P5/P6 HOLD |
| **ON** | MODE A jak legacy opt-in · read-only · `executeResearch=false` |

**Nie dotyczy tej decyzji:** Research default ON · D · P7/P4/P8 auto · nowe flagi · implementacja · migracja KV w tej turze.

---

## OD-2b — Legacy `false` → AUTO (B-POLICY)

**ACCEPTED.**

Owner świadomie potwierdza:

- Historyczne **`false`** w boolean contract **nie** jest dowiedzionym explicit Owner kill-switch.
- Po migracji kontraktu enum: legacy **`false` → `"AUTO"`** (B-POLICY).
- Owner, który wcześniej odznaczył P5/P6 w ⚙, **może** po migracji otrzymać AUTO zamiast trwałego HOLD — akceptowane w zamian za osiągnięcie polityki „IK ON + BOQ READY → MODE A bez ręcznego P5/P6”.
- Od migracji w górę: **jawny HOLD = tylko `"OFF"`** (zapisany enum + UI 3-stany + confirmation przy AUTO→OFF).

---

## Backward compatibility (frozen by OD-2)

| Legacy stored | Po normalizacji |
|---------------|-----------------|
| **missing** | **AUTO** |
| **true** | **ON** |
| **false** | **AUTO** (B-POLICY · OD-2b) |

Research levers (`ikLaborResearchEnabled`, `ikMaterialResearchEnabled`) pozostają **boolean** · **CONDITIONAL** · `=== true` only.

---

## Safety (unchanged · binding)

| | |
|--|--|
| Research | **CONDITIONAL** |
| Research Accept | **OWNER** |
| Price Commit | **OWNER** |
| Final Bid | **OWNER** |
| D | **HARD STOP / FALSE** |
| P1 | **CLOSED** |
| P2 | **KEEP GAP** |
| Composite | **CLOSED** |

**Out of scope / no change:** Classification · P1 · P2 · Composite engine · F5 · PM · CatalogWork · Accept · Chief · P8 · D · Research engine.

AUTO **must not** enable: Research HTTP · Accept · price commit · PRICE_DEMAND · CatalogWork · PM write · Edge lease · tender mutation · D.

---

## If NO (not taken)

Gdyby OD-2 = REJECTED lub OD-2b REJECTED → Option **E** · P5/P6 manual ⚙ · STOP implementacji. **Nie dotyczy** — Owner wybrał YES + B-POLICY.

---

## Next step (not this turn)

1. **Design Freeze** — osobny dokument · zamrożenie kontraktu § OD-2 · load/merge/save/UI same release · T01–T20.
2. **Implement** — dopiero po DF + Owner GO implement · **zero** settings write w tej decyzji.

---

## STOP

```text
OD-2     = APPROVED
OD-2b    = ACCEPTED
DF       = ALLOWED · NOT CREATED
CODE     = ZERO
KV       = ZERO
```
