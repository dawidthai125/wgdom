# INTELLIGENT ESTIMATOR — REUSE MAP

> **ID:** `INTELLIGENT-ESTIMATOR-REUSE-MAP`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-09-12 · cold-start reconcile (AUT-R1 / AUT-MAT / Orchestra pointers)  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §31–§33  
> **Rule:** If it is listed here → **DO NOT DUPLICATE**. Extend only with Owner GO.

---

## Legend

| Status | Meaning |
|--------|---------|
| PRODUCTION | On `main` / tip; use as-is |
| KEEP | Exists; do not remove without audit |
| LEGACY | Technical debt; not new pricing SSOT |
| FORBIDDEN_DUP | Creating a parallel module is banned |
| WIP_LOCAL | Present in working tree; confirm `git ls-files` before claiming tip PV |

---

## Map

| Component / Module | File(s) | Responsibility | Public / key APIs | Consumers | Data store | Status | Reuse rule |
|--------------------|---------|----------------|-------------------|-----------|------------|--------|------------|
| TendersModule | `src/app/tenders/TendersModule.tsx` | Przetargi shell | module routes/views | App admin router | pipeline KV via tenders libs | PRODUCTION | **DO NOT DUPLICATE** |
| TenderDetailPage | `src/app/TenderDetailPage.tsx` | Tender detail host | tabs / workspace | TendersModule | — | PRODUCTION | DO NOT DUPLICATE |
| TenderKosztorysWorkspace | `src/app/TenderKosztorysWorkspace.tsx` | Kosztorys UI | workspace tab | DetailPage | — | PRODUCTION | DO NOT DUPLICATE |
| TenderWorkflowHubPanel | `src/app/TenderWorkflowHubPanel.tsx` | Hub + conversation mount | Hub CTA | Detail | — | PRODUCTION | DO NOT DUPLICATE |
| Expert Conversation UI | `src/app/expert-conversation/*` · `src/lib/expert-conversation-ui.ts` | Presentation VM | `buildExpertConversationViewModel` | HubPanel | none (VM) | PRODUCTION | Presentation only — no new chat store |
| Document resolver | `src/lib/tender-document-resolver.ts` | Docs → kosztorys snapshot | resolve helpers | pipeline / dossier | tender docs | PRODUCTION | DO NOT reinvent parsers blindly |
| Classification Gate | `src/lib/intelligent-estimator/classification-gate.ts` | Plane LABOR/MATERIAL/COMPOUND/UNKNOWN | `classifyEstimatorPricingPlane` | research guards · IR wave | none (pure) | PRODUCTION | **SSOT** — before research |
| INTERNAL-FIRST domain gate (P5.25-FIX) | `src/lib/intelligent-estimator/internal-first-*.ts` | PACKAGE≠MATERIAL≠LABOR price reuse | `domainsCompatibleForFinalPriceReuse` · `lookupInternalFirst` | P5.25 runner · research | none (pure) | PRODUCTION | **DO NOT DUPLICATE** |
| Work Catalog | `src/lib/work-catalog/*` | Biblioteka + OUR RATE | normalize · lookup · research · accept | F5 · UI · IK | `kw-wgdom-work-catalog` | PRODUCTION | **DO NOT DUPLICATE** |
| Accept (Owner Exception) | `src/lib/work-catalog/work-rate-accept.ts` | Owner Accept → OUR RATE | `acceptWorkRateResearchCandidate` | useWorkCatalog · **AUT-R1** | catalog | PRODUCTION | Only write gate for research rates |
| **AUT-R1** | `aut-r1-accept-contract.ts` · `aut-r1-accept.ts` · `aut-r1-from-durable-evidence.ts` | Autonomous Labor Accept under §0.2 | `evaluateAutR1LaborAcceptContract` · tryAutR1* | `ik-labor-expert` / P5 | Work Catalog | PRODUCTION (tip `36401b6b`) | **≠** invent · **≠** unit auto-convert · **no** Labor Rate Engine 2 |
| Selective research | `src/lib/work-catalog/work-rate-research.ts` | ONE-work research | `runSelectiveWorkRateResearch` | UI · IR · IK | cooldown memory | PRODUCTION | No full-catalogue crawl |
| Identity mapping | `src/lib/work-catalog/work-rate-identity-mapping.ts` | Owner mappings | `listWorkRateIdentityMappings` | research IR | code registry | PRODUCTION | No silent new mappings |
| Labor Evidence | `src/lib/labor-source-evidence/*` | Durable observations | normalize · merge · ingest | IR write GOs | `kw-wgdom-labor-source-evidence` | PRODUCTION | ≠ OUR RATE |
| Price / material catalog | `src/lib/price-intelligence/our-price-catalog.ts` | Material commercial + margin | catalog helpers | Firma UI · F5 | PM / work commercial fields | PRODUCTION | Material plane only |
| **AUT-MAT** | `aut-mat-accept-contract.ts` · `aut-mat-accept.ts` | Autonomous material PM Accept under §0.2 | contract + accept | `ik-material-expert` / P6 | Price Memory | PRODUCTION (tip `a4d3dc8`) | **no** Material Price Engine 2 |
| DIY selective | `src/lib/price-intelligence/diy-selective-lookup-client.ts` | LM/Casto/OBI lookup | client → Edge | material research | Edge + PM | PRODUCTION | Legal allowlist |
| IK Orchestra | `src/lib/intelligent-estimator/orchestra/*` | **ONLY** sequencer | `ik-orchestra-engine` · `use-ik-orchestra` | Hub / Host | OfferBoq attestations | PRODUCTION | **DO NOT** second Orchestra |
| AUTO G1 / G2 | `auto-g1-accept-contract.ts` · `auto-g2-accept-contract.ts` | Routine identity / rate∥BOM attestation | evaluate contracts | Orchestra | OfferBoq | PRODUCTION | attestation ≠ Catalog invent |
| ACLC | `autonomous-canonical-leaf-create.ts` (+ WC create) | Canonical leaf create | `executeKnrWcCatalogWorkCreate` | KNR/Knowledge path | Work Catalog | PRODUCTION / WIP_LOCAL verify | **no** P31 leaf engine |
| LABOR_ONLY_AUTO_BOM_V1 | `orchestra/labor-only-auto-bom-v1-contract.ts` | Labor-only BOM under HARD contract | contract evaluate | G2 BOM / P6 | OfferBoq/pack | PRODUCTION / WIP_LOCAL verify | **no** per-KNR BOM engines |
| CCR-v1 | `knr-knowledge/knr-corpus-conflict-resolution-v1.ts` | Corpus conflict resolution | CCR helpers | KNR/Knowledge | catalog/knowledge | PRODUCTION / WIP_LOCAL verify | **no** one-off conflict scripts |
| Position Cost F5 | `src/lib/tender-position-cost/*` | Position cost engine | `computePositionCost` | Bid / Hub shadow | ephemeral + bid wire | PRODUCTION | DO NOT second engine |
| Bid calculator | `src/lib/tenders-bid-calculator.ts` | Bid proposal | `computeTenderBidProposal` | Offer/Bid UI | — | KEEP / LEGACY dual | No third PLN |
| Chief orchestrator | `src/lib/chief-orchestrator/*` | Case→Task dossier | `runChiefOrchestrator` | Session hooks | in-memory dossier | PRODUCTION | ≠ IK Orchestra |
| Cloud sync | `src/lib/cloud-sync.ts` | KV merge/push | persistKey · fetchKeys | whole app | Supabase KV | CORE LOCK | No casual change |
| companyPricePln | `CatalogWork.companyPricePln` | Legacy mixed price field | — | old bid/offer paths | catalog | LEGACY TECHNICAL | **≠ OUR RATE** |
| Command Center | `docs/archive/command-center/` | Historical | — | — | — | SUPERSEDED | Do not resurrect |
| NG-10 Autonomous | `src/app/tenders/autonomous/*` · `src/lib/tender-autonomous-run-*.ts` | Old first-screen theater | Gate/Run/timeline | TenderDetailPage | LS | KEEP TEMPORARY | **DO NOT extend as IK** |
| Multi-dwelling / Multi-BOQ | `src/lib/multi-dwelling/*` · `src/lib/multi-boq/*` | N adresów × N przedmiarów · SUM | PackageGate · compose | Hub panel | `kw-multi-dwelling-package-v1` | PRODUCTION | **DO NOT DUPLICATE** |
| KNR WC P4 trust seam | `orchestra/ik-knr-wc-p4-trust-seam.ts` | Slice D HIT → trusted tuple | `promoteSliceDHitToTrustedTuple` | `ik-orchestra-engine` | — | PRODUCTION | **nie** second mapper |
| Ingest | `src/lib/tender-ingest/*` | Lossless docs → artifact pool | registry · contentHash | Multi-BOQ | LS ingest | PRODUCTION | Upstream only |
| Bid PDF | `src/lib/tender-bid-package-pdf.ts` | Oferta PDF | `exportTenderBidPackagePdf` | DetailPanel | — | PRODUCTION | no new PDF engine |
| ATH parse / preview PDF | `src/lib/ath-parser.ts` · `ath-kosztorys-pdf.ts` | NORMA input + preview | `parseKosztorysBytes` | Kosztorys UI | — | PRODUCTION | **No ATH writer in repo** |
| IK orchestrator W2 | `src/lib/ik-pricing-orchestrator/*` | Gaps + labor bridge above F5 | `inventoryIkGapsFromShadow` · `runIkLaborGapResearch` | Hub panel | none | PRODUCTION | **≠** replace Orchestra |

---

## Forbidden duplicates (explicit)

```text
❌ New TendersModule / TenderWorkspaceV3 / NewWorkCatalog
❌ New Evidence→OUR RATE bridge bypassing Accept / AUT-R1
❌ New Classification Gate
❌ New PDF costing engine without AUDIT of existing stack
❌ New Material Catalog KV parallel to Price Memory
❌ New identity engine replacing CIE/CIV/AID/AIR / work-rate-identity-mapping
❌ New Orchestra / Chief-as-Orchestra / TPI parallel runtime
❌ New Labor Rate Engine 2 / Material Price Engine 2 / Finance Engine 2
❌ New P31 Rate Engine / Transport Rate Engine / Technology Engine 2
❌ New external source registry parallel to Evidence/Knowledge
```

---

## How to extend safely

1. Grep / Glob existing symbol.  
2. Read Master §8 / §31–§36 + DF / closeout.  
3. AUDIT → Owner GO → thin DF → IMPLEMENT.  
4. Prefer adapter / allowlist row / Owner mapping / Evidence reuse over new module.  
5. Classify: **REUSE | CONNECT | VERIFY | EXTEND EXISTING | NEW** — `NEW` is exception.

**STOP.**
