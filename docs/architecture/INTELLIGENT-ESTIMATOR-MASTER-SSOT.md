# INTELLIGENT ESTIMATOR — MASTER SSOT

> **ID:** `INTELLIGENT-ESTIMATOR-MASTER-SSOT`  
> **STATUS:** **ACTIVE** · **★★ SSOT Inteligentnego Kosztorysanta**  
> **Data:** 2026-08-18  
> **Mode:** DOCUMENTATION ONLY  
> **Tip produkcji:** wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Snapshot baseline (historyczny wiersz):** UI **2.66.59** / commit **`9bcc558`** (PASS2 CR discovery) — Tablica OUR RATE Accept **VERIFIED** (data GO, nie osobny tip UI)  
> **Sesja Autonomy 2026-08-18:** [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) — A08-P0/P1/P2 CLOSED · **nie** zastępuje tego kontraktu

```text
════════════════════════════════════════════════════════
NIE BUDUJ OD NOWA.
SEARCH BEFORE CREATE.
Przetargi + kosztorysowanie JUŻ ISTNIEJĄ.
IK = ORCHESTRATOR, nie drugi TenderModule / Catalog / Pricing.
════════════════════════════════════════════════════════
```

---

## 0. Co to jest WGDOM

**W&G DOM** — aplikacja operacyjna (React/Vite): Roboty, Lista Płac, WM Druk, **Przetargi**, Inteligentny Kosztorysant (IK).  
Prod: https://www.wgdom.fun · repo `main` · FE deploy = `git push origin main` → Vercel (**zakaz** `vercel deploy`).

---

## 1. Co to jest Inteligentny Kosztorysant

```text
GŁÓWNY IK (Chief / orchestration / UX Expert Conversation)
  + Eksperci domenowi
```

| Rola | Odpowiedzialność | NIE jest |
|------|------------------|----------|
| **IK (Chief)** | Orchestracja Case→Task→dossier · prezentacja rozmowy ekspertów | Drugim TenderModule / parserem / pricing engine |
| **Dokument / BOQ Expert** | Dokumenty, ATH/PDF/BOQ, identity linii | Nowym storage KV |
| **Material Expert** | Price Memory · DIY research · SELL | Labor OUR RATE |
| **Labor Expert** | Work Catalog · research · Evidence · Accept · OUR RATE | Material Price Memory |
| **Validation / Control** | Findings Hard/Soft · consistency | Auto-Accept stawek |

**IK nie tworzy drugiej domeny Przetargów.** REUSE: `TendersModule`, OfferBoq, F5 Position Cost, Work Catalog, Price Memory, Evidence, Accept.

---

## 2. Hard locks (NO REBUILD)

**FORBIDDEN bez Owner GO + AUDIT:**

- nowy `TendersModule` / Tender Workspace / TenderDetail
- nowy Work Catalog / Material Catalog / Price Memory / Evidence / OUR RATE / Accept
- nowy parser BOQ/ATH / identity engine / classification engine
- nowy labor/material research engine
- nowy PDF engine (najpierw REUSE istniejącego stacku)
- `Evidence → OUR RATE` bez Candidate + Owner Accept
- `companyPricePln → OUR RATE`
- `pkt ≡ mb` bez dowodu
- research dla **COMPOUND** / **UNKNOWN**
- `git add -A` · `vercel deploy`

---

## 3. Mapa dokumentów SSOT (ten zestaw)

| Dokument | Rola |
|----------|------|
| **TEN PLIK** | Master kontrakt IK |
| [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) | ★★ Sesja Autonomy 05–08 · A08-P2 **CLOSED** · **nie** drugi kontrakt |
| [`INTELLIGENT-ESTIMATOR-ARCHITECTURE.md`](./INTELLIGENT-ESTIMATOR-ARCHITECTURE.md) | Warstwy + ścieżki plików |
| [`INTELLIGENT-ESTIMATOR-DATA-FLOW.md`](./INTELLIGENT-ESTIMATOR-DATA-FLOW.md) | LABOR / MATERIAL / Classification flows |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) | Component → file → status → DO NOT DUPLICATE |
| [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md) | Tip · Tablica · HOLD/GAP |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Cold-start ChatGPT + protokół Cursor |
| Tip UI/commit | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| Cold-start projekt | [`../AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md) |
| Entry procesu | [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) · Gate payroll |
| **IK-MIGRATION-01** | [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) · [`DESIGN-FREEZE`](./IK-MIGRATION-01-DESIGN-FREEZE.md) — P0–P9 **LOCKED / COMPLETE** · **nie** next = GO P2 Document Expert |

**Historyczne (nie tip):** [`INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md`](./INTELLIGENT-ESTIMATOR-CONTINUITY-HANDOFF.md) — Technology Foundation slices (paint/primer/cable) · **tip = 09**, nie ten plik.

---

## 4. Classification Gate (przed research)

**SSOT:** `classifyEstimatorPricingPlane` — `src/lib/intelligent-estimator/classification-gate.ts`

Owner map (freeze):

| Plane | Count |
|-------|------:|
| LABOR | 29 |
| MATERIAL | 24 |
| COMPOUND | 6 |
| UNKNOWN | 30 |

| Plane | Routing |
|-------|---------|
| LABOR | Work Catalog → research przy MISS |
| MATERIAL | Price Memory → material research przy MISS |
| COMPOUND | **HOLD** · zero research · zero invent |
| UNKNOWN | **HOLD** · zero research · zero invent |

Miss → **UNKNOWN**. Classification **BEFORE** source selection.

---

## 5. Evidence ≠ OUR RATE

```text
Evidence (KV kw-wgdom-labor-source-evidence)
  → Candidate (ephemeral research)
  → Owner Decision
  → acceptWorkRateResearchCandidate
  → ourWorkRate (CatalogWork)
```

| Warstwa | Znaczenie |
|---------|-----------|
| SOURCE RANGE | np. 312–780 |
| marketBase (DERIVED) | midpoint / mediana |
| proposed | marketBase × (1+margin/100) |
| OUR RATE | dopiero po Accept |

**NIGDY:** Evidence write ≠ Accept · pricePoint Evidence ≠ auto 546.

Szczegóły: [`IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md`](./IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md)

---

## 6. Pricing value layers (nie mieszać)

| Symbol | Znaczenie |
|--------|-----------|
| purchase / DIY low | cena zakupu materiału (świadomie niska → marża osobno) |
| marketBase | DERIVED rynek labor |
| companyPricePln | LEGACY TECHNICAL — **≠** OUR RATE |
| ourWorkRate | firmowa stawka robocizny (SSOT labor) |
| SELL | materiał po marży commercialPricing |
| marginPct | WGDOM commercial |
| Position Cost / Bid / Offer | warstwy oferty — REUSE F5 / Bid / Offer |

---

## 7. Legacy Przetargi

Stary tor Bid / TRE / DecisionView **NIE jest kasowany** teraz.

Proces rozłączania: AUDIT → consumers → seam → DF → Owner GO → migrate → PV → cleanup.  
**NIE:** delete module · rewrite · clone V2/V3.

TM-01 EPIC CLOSED (S0–S9). Inteligentny Kosztorysant UX CLOSED (presentation).  
Workflow Przetargu: [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md).

---

## 8. Aktualny stan (skrót)

Patrz [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md).

| Item | Status |
|------|--------|
| Tablica | Evidence VALID · OUR RATE **546** ACCEPT · **CLOSED** |
| Podejście | HOLD · UNIT_EQUIVALENCE **UNPROVEN** (pkt vs mb) |
| Wykwity | SOURCE GAP REAL |
| ACTIVE EPIC IMPLEMENT | **NONE** bez Owner GO |
| **IK-MIGRATION-01** | P0–P9 **LOCKED / COMPLETE** · [`FINAL-HANDOFF`](./IK-MIGRATION-01-FINAL-HANDOFF.md) · **nie** next = GO P2 Document Expert |
| **AUTONOMY-05…07** | COMPLETE / CLOSED · P5–P8 `"AUTO"\|"OFF"\|"ON"` · Research **CONDITIONAL** |
| **AUTONOMY-08 P0** | **COMPLETE / CLOSED** · IK ON ⇒ Documents→BOQ |
| **AUTONOMY-08 P1** | **COMPLETE / CLOSED** · `ikEntryEnabled` jedyny biznesowy switch |
| **AUTONOMY-08 P2** | **COMPLETE / CLOSED** · Research-on-Miss · Entry ∧ P5/P6 AUTO\|ON → permission · leftover `ik*ResearchEnabled` no-op · [`CLOSEOUT`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-IMPLEMENTATION-CLOSEOUT.md) · [`PV`](./IK-AUTONOMY-08-P2-RESEARCH-ON-MISS-PRODUCTION-VERIFY.md) |
| **AUTONOMY-08 epic** | **NOT CLOSED** |
| Tip produkcji | **czytaj 09** (2.66.95 / `1f5d871c`) |

---

## 9. NEXT

Tylko **Owner GO** → **AUDIT** → DF → IMPLEMENT.

**IK AUTONOMY-08 P2:** **COMPLETE / CLOSED**. **Nie** reopen. **Nie** start A08-P3.

**IK-MIGRATION-01:** P0–P9 LOCKED — **nie** wracaj do „GO P1 entry shell” / „GO P2 Document Expert” jako next.

Kandydaci poza tym slice: residual C1–C6 · PACKAGE layer (COMPOUND HOLD freeze zostaje aż do osobnego GO) · labor unit proof (Podejście).  
**NIE** invent S10 / drugiego TenderModule / auto-Accept / global D=ON jako IK / REMOVE NG-10.

Sesja: [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md).

**STOP.**
