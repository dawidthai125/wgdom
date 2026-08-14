# INTELLIGENT ESTIMATOR — ARCHITECTURE

> **ID:** `INTELLIGENT-ESTIMATOR-ARCHITECTURE`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-14  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Reuse map:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)

---

## 1. Warstwy (top → bottom)

```text
UI Przetargi (TendersModule · Detail · Hub · Kosztorys · Expert Conversation)
  → Chief / Experts / Decision Workspace (orchestration + RO panels)
  → OfferBoq / Document pipeline / Ingest / Multi-BOQ
  → Classification Gate
  → LABOR plane: Work Catalog · research · Evidence · Accept · OUR RATE
  → MATERIAL plane: Price Memory · DIY selective · SELL · margin
  → F5 Position Cost → PackageGate → Bid / Offer primary
  → Cloud sync / Edge (make-server-0afb8820) — CORE LOCK bez Owner GO
```

---

## 2. Tenders (EXISTING — DO NOT REBUILD)

| Component | Path | Notes |
|-----------|------|-------|
| Module shell | `src/app/tenders/TendersModule.tsx` | Entry Przetargi |
| Detail page | `src/app/TenderDetailPage.tsx` | Tabs / workspace host |
| Kosztorys WS | `src/app/TenderKosztorysWorkspace.tsx` | Kosztorys UI |
| Documents WS | `src/app/TenderDocumentsWorkspace.tsx` | Dokumenty |
| Qualification WS | `src/app/TenderQualificationWorkspace.tsx` | Kwalifikacja |
| Hub panel | `src/app/TenderWorkflowHubPanel.tsx` | Hub + Expert Conversation surface |
| Tab bar | `src/app/TenderWorkspaceTabBar.tsx` | Workspace tabs |
| Provider / pipeline | `src/app/tenders/` + `src/lib/tenders-bzp.ts` | Pipeline BZP |
| Workflow SSOT | `docs/WORKFLOW-ARCHITECTURE-v2.63.md` | Hub · CTA · tabs |

**Expert Conversation (presentation):**

| File | Role |
|------|------|
| `src/app/expert-conversation/ExpertConversationSurface.tsx` | Chat-like surface |
| `src/lib/expert-conversation-ui.ts` | ViewModel from Chief dossier |
| Closeout | `docs/architecture/INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT.md` |

UX docelowy: Messenger-like **presentation** nad istniejącym pipeline — **nie** nowy chat engine / store.

---

## 3. Documents / BOQ

| Concern | Path |
|---------|------|
| Document resolver | `src/lib/tender-document-resolver.ts` |
| Dossier / merge | `src/lib/tender-dossier-merge.ts` (i powiązane) |
| PDF przedmiar heuristics | `src/lib/pdf-przedmiar-heuristic.ts` |
| 7z | `src/lib/wgdom-7z-archive.ts` |
| Ingest | `src/lib/tender-ingest/` |
| OfferBoq adapters | `src/lib/execution-expert/offer-boq-adapter.ts` · `src/lib/chief-wire-adapters/offer-boq.ts` |
| Multi-BOQ / dwelling | docs + libs pod `MULTI-BOQ-*` / `tender-ingest` (CLOSED features) |

---

## 4. Classification

| Symbol | Path |
|--------|------|
| `classifyEstimatorPricingPlane` | `src/lib/intelligent-estimator/classification-gate.ts` |
| Barrel | `src/lib/intelligent-estimator/index.ts` |
| DF | `docs/architecture/INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE-DESIGN-FREEZE.md` |

---

## 5. Labor stack

| Concern | Path |
|---------|------|
| Work Catalog store / KV | `src/lib/work-catalog/work-catalog-store.ts` · key `kw-wgdom-work-catalog` |
| Sync | `src/lib/work-catalog/work-catalog-sync.ts` |
| Write router | `src/lib/catalog-write-router.ts` → `saveWorkCatalogRouted` |
| Identity mapping | `src/lib/work-catalog/work-rate-identity-mapping.ts` |
| Selective research | `src/lib/work-catalog/work-rate-research.ts` → `runSelectiveWorkRateResearch` |
| Qualify / median | `src/lib/work-catalog/work-rate-qualify.ts` |
| marketBase / proposed | `src/lib/work-catalog/work-rate-market-base.ts` |
| Accept | `src/lib/work-catalog/work-rate-accept.ts` → `acceptWorkRateResearchCandidate` |
| Manual OUR RATE | `src/lib/work-catalog/work-rate-patch.ts` |
| IE Wave-1 IR | `src/lib/work-catalog/ie-labor-selective-research-identity-ready-wave-1.ts` |
| Evidence DB | `src/lib/labor-source-evidence/` · key `kw-wgdom-labor-source-evidence` |
| UI Nasz Katalog Robót | `src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx` |
| Hook Accept | `src/app/hooks/useWorkCatalog.ts` → `acceptOurWorkRateResearch` |
| IK labor gap panel | `src/app/ik-pricing/IkLaborGapResearchPanel.tsx` |
| Bridge | `src/lib/ik-pricing-orchestrator/labor-research-bridge.ts` |

**Allowlisted labor sources (Legal PASS):** KB.pl · SCCOT · Extradom · CennikRemontow.pl — nowe hosty tylko Owner GO.

---

## 6. Material stack

| Concern | Path |
|---------|------|
| Our price catalog / PM UI model | `src/lib/price-intelligence/our-price-catalog.ts` |
| DIY selective client | `src/lib/price-intelligence/diy-selective-lookup-client.ts` |
| Edge | `mmr-diy-selective-lookup` (Supabase function) |
| F5 material SELL adapter | `src/lib/tender-position-cost/material-sell-adapter.ts` |
| Separation plan | `docs/architecture/PRICE-MEMORY-CATALOG-02-MATERIAL-LABOR-SEPARATION-PLAN.md` |

Material hosts (Legal): Leroy Merlin · Castorama · OBI (+ hurtownie po allowlist). Preferencja: **najniższa poprawna cena zakupu** + marża WGDOM osobno.

---

## 7. Pricing / Bid

| Concern | Path |
|---------|------|
| Position Cost engine | `src/lib/tender-position-cost/engine.ts` |
| OUR RATE → F5 | `src/lib/tender-position-cost/our-rate-labor-adapter.ts` |
| Bid cutover F5 | `src/lib/tender-position-cost/bid-position-cost-cutover.ts` |
| Barrel | `src/lib/tender-position-cost/index.ts` |
| Bid calculator | `src/lib/tenders-bid-calculator.ts` |
| Continuity | `docs/AI/10_TENDER_PRICING_CONTINUITY.md` |

---

## 8. Chief / Experts

| Concern | Path |
|---------|------|
| Chief run | `src/lib/chief-orchestrator/run.ts` |
| Dossier / gates | `src/lib/chief-orchestrator/` |
| Wire adapters | `src/lib/chief-wire-adapters/` |
| Validation expert | (VALIDATION-EXPERT-01 — lib + DF w `docs/architecture/`) |
| Decision persist | `kw-decision-persist-v1` (local) — DF DECISION-PERSIST-01 |

---

## 9. PDF / export

Istniejący stack (REUSE first — nie nowy silnik):

- WM Druk / ZI / EM DOCX — `src/lib/electrical-measurements/`, `generate-pdf-zi-*`, `WmPrintView`
- Tender/job email/ZIP — istniejące job/tender pack helpers
- Kosztorys PDF preview/download — **najpierw** znaleźć consumers w repo; **nie** invent nowego PDF pipeline bez AUDIT

---

## 10. Sync / Edge

| Concern | Path |
|---------|------|
| Cloud sync | `src/lib/cloud-sync.ts` |
| Edge | `supabase/functions/make-server-0afb8820/index.tsx` |
| ADR | `docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md` (PROPOSED) |

**Payroll = Protected Core.** Nie zmieniaj merge bez Gate.

---

## 11. UX target (presentation)

Lista przetargów → wybór → workspace IK.

Header: **Inteligentny Kosztorysant** + credit Owner.  
Konwersacja ekspertów = prawdziwy stan pipeline (nie fikcyjne postępy).  
Final cost estimate: pełna tabela pozycji + źródła CURRENT/REUSE/RESEARCH/ACCEPT/OWNER + HOLD/GAP + sumy — REUSE F5/Offer data; PDF = późniejszy REUSE stack.

**STOP — no code in this doc.**
