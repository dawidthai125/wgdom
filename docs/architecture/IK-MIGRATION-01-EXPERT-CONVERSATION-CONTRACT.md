# IK-MIGRATION-01 — EXPERT CONVERSATION CONTRACT

> **ID:** `IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT`  
> **STATUS:** P0 FROZEN  
> **Parent:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **REUSE UI:** `src/app/expert-conversation/ExpertConversationSurface.tsx`  
> **REUSE VM dziś:** `src/lib/expert-conversation-ui/` (Trace 7 kroków — **za wąskie** na IK; rozszerzyć, nie nowy store)  
> **Data:** 2026-08-15

```text
EC = warstwa rozmowy nad RZECZYWISTYM execution.
NIE projekcja NG-10.
NIE LLM store.
NIE Bid.ok jako research.
```

---

## 1. Surface

Docelowy first-screen IK: **istniejący** `ExpertConversationSurface`.  
Branding KEEP (`INTELIGENTNY_KOSZTORYSANT_TITLE_PL` / author).  
Skip / Continue KEEP (closeout UX).

**Nie** montować `TenderAutonomousRunScreen` jako IK.

Dziś Surface jest za Hub + `chiefDossierVm` (D). P1: montaż z IK-entry **niezależnie od D**, VM z pipeline facts aż P4 poda Chief.

---

## 2. Zakazane źródła semantyki

- `AUTONOMOUS_TIMELINE_STEP_LABELS`
- `AUTONOMOUS_AI_AGENT_LABELS`
- `PipelineState` jako dowód „wyliczono”
- `ownerFinanceProposal.ok` jako labor/material done
- statyczne „Wyliczenie materiałów” / „Oceniam opłacalność.” bez artefaktu

---

## 3. Event contract (LOCKED)

```text
IkConversationEvent
  id: string
  at: ISO
  actor: Chief | Document | Labor | Material | Control | Pricing | Risk
  status: pending | active | done | blocked | skipped | hold | partial | gap
  messagePl: string          # z faktu
  detailPl?: string
  sourceRef: {
    kind: document | classify | identity | labor_lookup | labor_research
        | evidence | candidate | material_lookup | material_research
        | product_offer | position_cost | bid | risk | chief_decision
        | hold | boq_ready | extraction
    tenderId: string
    lineId?: string
    dwellingId?: string
    workId?: string
    materialKey?: string
    documentId?: string
    artifact: /* istniejący obiekt / id / count — nie string znikąd */
  }
```

**Reguła:** brak `artifact` → nie wolno `status=done` na tej operacji. Pisz `hold` / `partial` / `gap` + powód.

VM zostaje **thin**: mapuje fakty → eventy. **Zero** ponownego pricing w VM.

---

## 4. Aktorzy vs kod

| Aktor | Runtime | Przykład FACT |
|-------|---------|----------------|
| Document | pipeline, ingest, resolver, snapshots | N docs, K przedmiarów, X linii |
| Labor | Gate, catalog, `runIkLaborGapResearch`, Evidence, Accept | CURRENT 546 / MISS → candidate |
| Material | Gate, PM, Phase2 DIY | HIT reuse / oferta LM URL+cena |
| Pricing | F5 shadow, Bid, PackageDirect | position + dwelling + total |
| Control | Validation Expert, shadow gaps | HARD/SOFT |
| Risk | `intelligenceCtx.overlay`, trust | count + powody |
| Chief | `runChiefOrchestrator` result | blocked/ready_for_decydent |

---

## 5. Przykład (Material) — dozwolony tylko z evidence

```text
EXPERT: Material
FACT: Price Memory MISS
SOURCE: materialKey + lineId
ACTION: Phase2 DIY started
RESULT: product + source URL + price
NEXT: Owner Accept → PM persist → SELL → F5 bump
```

Bez HTTP/candidate: **nie** „znalazłem cenę w Castoramie”.

---

## 6. Kolejność komunikatów (biznes)

1. Document Expert (discovery → extraction → BOQ READY/PARTIAL)  
2. Classification / identity  
3. Labor  
4. Material  
5. Position Cost / Bid / SUM adresów  
6. Risk  
7. Chief decision / recommendation  

P1 implementuje **tylko warstwę 1 (fakty pipeline)** + szczere pending na resztę.

---

## 7. P1 vs P5+

| | P1 | P5+ |
|--|----|-----|
| EC visible przy IK-entry | TAK | TAK |
| Document counts | TAK jeśli pipeline ma dane | TAK |
| Labor research events | NIE (pending) | TAK |
| Fałszywy complete costing | FORBIDDEN | FORBIDDEN |

---

## 8. STOP

Nowy `kw-ik-chat-*` = FORBIDDEN. Rozszerzenie `expert-conversation-ui` types + mapper = dozwolone po GO P1, w granicy thin VM.
