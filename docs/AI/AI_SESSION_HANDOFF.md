# AI SESSION HANDOFF — Foundation Lib Phase 0 + docs consolidation

> **Dla:** nowej sesji ChatGPT / Cursor **bez** historii czatu  
> **Data:** 2026-07-28  
> **Ticket:** DOCUMENTATION CONSOLIDATION (Foundation Lib) — docs-only · **bez commit** do decyzji Ownera  
> **Poprzedni:** AI-DOCS-CONSOLIDATION-03 · COST-02-A CLOSED · AI-DOCS-PAYROLL-GUARD-02 ACTIVE

---

## START (obowiązkowe)

1. **[`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)** — stan · baseline · NEXT · zakazy.  
2. **[`AI_ENTRY.md`](AI_ENTRY.md)** — ścieżka procesu.  
3. **[`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)** — G1–G9 przed IMPLEMENT.  
4. Tip: **[`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)** lub `https://www.wgdom.fun/version.json`.  
5. Gdy temat = Foundation Lib / FND-*: **[`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md)**.  
6. `FEATURE_IMPLEMENTATION_CHECKLIST.md` przed IMPLEMENT.  
7. `CURRENT-TASK.md` — status Ownera.

**DEPRECATED:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

---

## Co właśnie domknięto

- **Foundation Lib Phase 0 COMPLETE** · FND-01…05 na `origin/main` tip **`bed8dd8`** · SSOT w repo.  
- **FND-06 Observability = BLOCKED** (brak Impl Spec → ADR/Blueprint).  
- **App nie używa jeszcze** `wgdom-foundation` (Przetargi/Roboty/Kadry/Kosztorysy).  
- **UI Foundation v1.0 COMPLETE** (≠ Foundation Lib) · Body S1–S4 · COST-02-A CLOSED.

---

## Czego NIE robić w nowej sesji

- Nie startuj od Continuity / losowego `PAYROLL-*` / starego tipu w rules.  
- Nie implementuj CORE Payroll / sync / Edge bez Owner GO.  
- Nie mieszaj FEATURE + CORE (#CORE-013).  
- Nie powielaj numeru wersji w wielu plikach — bump tylko w `09`.  
- Nie re-open **UI Foundation** / BODY S1–S4 bez briefu Ownera.  
- Nie implementuj **FND-06** / nie zmieniaj FND-01…05 bez Spec + ACR; nie podłączaj domen do `wgdom-foundation` bez EPIC.  
- Nie myl **Foundation Lib** (`wgdom-foundation`) z **UI Foundation** (GDS).

---

## Raport AUDIT

[`../architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md`](../architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md)
