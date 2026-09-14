# INTELLIGENT ESTIMATOR — REUSE MAP

> **ID:** `INTELLIGENT-ESTIMATOR-REUSE-MAP`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-09-14 · AUT-MAT session reconcile + cold-start  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §15 · §27 · §31–§33  
> **Session:** [`IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md`](./IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md)  
> **Rule:** If it is listed here → **DO NOT DUPLICATE**. Extend only with Owner GO.  
> **Law:** ★★ IK IS ITS FUNCTION TREE ★★ — Tree → Orchestra → Experts → Catalogs → Persist → Reuse

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

## 0. Cold-start: SEARCH BEFORE CREATE

Before ANY Expert / Provider / Parser / Catalog / Gate / Accept / Research / Price / BOM / Identity / Knowledge / persistence:

1. Grep/Glob in `src/lib` + `src/app`
2. Read **this map** + Master §8 / §15 / §27
3. Locate Decision Tree node → Orchestra node → Expert → Catalog/Evidence
4. Classify residual: ENGINE | DATA | RESEARCH | IDENTITY | UNIT | PERSISTENCE | SAFETY | OWNER EXCEPTION | ARCHITECTURE
5. Classify action: **REUSE | CONNECT | VERIFY | NEW**
6. `NEW` only after documented GAP + seam + Owner GO

Default: **NO REBUILD**.

---

## 1. Expert map (domain executors — NOT duplicate engines)

| Expert | Location | Responsibility | Key APIs | Input | Output | Persist | Orchestra node | MUST NOT own |
|--------|----------|----------------|----------|-------|--------|---------|----------------|--------------|
| **Document** | `orchestra/ik-document-expert*` · `runIkDocumentExpert` | Docs → Master/OfferBoq · admission | `runIkDocumentExpert` | tender docs | ADMITTED lines · OfferBoq | OfferBoq / dwelling | Document → C2 | Finance / OUR RATE / PM |
| **Identity** | `ik-identity-phase` · CIE/CIV/AID/AIR | Trusted workId/unit | `runIkIdentityPhase` · AUTO G1 | ADMITTED | trusted identity | OfferBoq (gated) | G1 | Catalog invent / rates |
| **KNR** | `ik-knr-expert` | KNR hints / PENDING_VERIFY | KNR expert + KL | lines · catalogBasis | hints | `kw-knr-catalog` | KNR / P4 | OUR RATE PLN invent |
| **Classification** | `classification-gate.ts` · `ik-classification*` | Plane LABOR/MATERIAL/COMPOUND/UNKNOWN | `classifyEstimatorPricingPlane` | text/unit | plane | none | pre-P5/P6 | Research / Accept |
| **Labor** | `ik-labor-expert` | OUR RATE path | P5 · AUT-R1 | LABOR lines | rateStatus · CURRENT | Work Catalog · Labor Evidence | P5 | Material PM / Finance |
| **Material** | `ik-material-expert` | PM / SELL path | P6 · **AUT-MAT** | MATERIAL / BOM comps | priceStatus · SELL | Price Memory (`marketQuotes`) | P6 | Labor OUR RATE / Bid stack |
| **Work Catalog** | `src/lib/work-catalog/*` | Canonical work + rates | lookup · research · accept | workId+unit | OUR RATE / hosts | `kw-wgdom-work-catalog` | Knowledge / P5 | Parallel catalog KV |
| **Orchestra** | `orchestra/*` · `ik-orchestra-engine` · `ik-orchestra-runtime` · `useIkOrchestra` | **ONLY** sequencer | engine + hook | tender package | snapshot / gates | OfferBoq attestations | whole chain | Expert logic / second tree |

---

## 2. Catalog / knowledge / evidence map (durable authority ≠ Expert ≠ Orchestra)

| Catalog / store | Location | Responsibility | MUST NOT confuse with |
|-----------------|----------|----------------|------------------------|
| **Work Catalog** | `src/lib/work-catalog/*` · KV `kw-wgdom-work-catalog` | Canonical work identity · OUR RATE · hosts · durable work knowledge | Expert · Orchestra · research quote |
| **Price / material catalog** | `price-intelligence/our-price-catalog.ts` | Material commercial + margin helpers | OUR RATE labor |
| **Price Memory** | `price-intelligence/price-memory.ts` · `CatalogWork.marketQuotes` | Material commercial CURRENT after Accept | Research quote · TechnologyPack PLN |
| **Technology Pack** | `technology-foundation/*` · pack registry | BOM qtyFactor / steps · technology | Price Memory / OUR RATE |
| **Labor Evidence** | `labor-source-evidence/*` · `kw-wgdom-labor-source-evidence` | Durable labor observations | OUR RATE (until AUT-R1/Accept) |
| **Material Evidence** | MEK / material-source-evidence (plane) | Durable material observations | PM CURRENT (until AUT-MAT) |

---

## 3. Module map

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
| **AUT-R1** | `aut-r1-accept-contract.ts` · `aut-r1-accept.ts` · `aut-r1-from-durable-evidence.ts` | Autonomous Labor Accept under §0.2 | `evaluateAutR1LaborAcceptContract` · tryAutR1* | `ik-labor-expert` / P5 | Work Catalog | PRODUCTION | **≠** invent · **≠** unit auto-convert · **no** Labor Rate Engine 2 |
| Selective research | `src/lib/work-catalog/work-rate-research.ts` | ONE-work research | `runSelectiveWorkRateResearch` | UI · IR · IK | cooldown memory | PRODUCTION | No full-catalogue crawl |
| Identity mapping | `src/lib/work-catalog/work-rate-identity-mapping.ts` | Owner mappings | `listWorkRateIdentityMappings` | research IR | code registry | PRODUCTION | No silent new mappings |
| Labor Evidence | `src/lib/labor-source-evidence/*` | Durable observations | normalize · merge · ingest | IR write GOs | `kw-wgdom-labor-source-evidence` | PRODUCTION | ≠ OUR RATE |
| Price / material catalog | `src/lib/price-intelligence/our-price-catalog.ts` | Material commercial + margin | catalog helpers | Firma UI · F5 | PM / work commercial fields | PRODUCTION | Material plane only |
| **Price Memory** | `price-intelligence/price-memory.ts` · `manual-price-research.ts` | CURRENT marketQuotes after Accept | `lookupPriceMemory` · `commitMarketQuotesImport` · `acceptManualMarketPriceResearchPure` | Material Expert · F5 · BidCutover | `CatalogWork.marketQuotes` | PRODUCTION | **THIS ALREADY EXISTS — REUSE** |
| **Material SELL** | `material-sell-adapter.ts` · `computeSellPricePln` | base (PM) × commercial margin → SELL | `resolveMaterialInputFromPriceMemory` | Position Cost | derived | PRODUCTION | **≠** research→direct sell · **≠** Finance Bid stack |
| **AUT-MAT** | `aut-mat-accept-contract.ts` · `aut-mat-accept.ts` | Autonomous material PM Accept under §0.2 | `evaluateAutMatMaterialAcceptContract` · `tryAutMatAcceptMaterialCandidate` · `acceptMaterialResearchCandidate` | `ik-material-expert` / P6 | Price Memory | PRODUCTION · Accept capability **`e43acb19`** | **no** Material Accept path 2 · **no** Material Price Engine 2 |
| **`priceNet` contract** | `mmr-selective-diy-provider.ts` | Observed retail **GROSS** PLN assigned to `priceNet` | `priceNet = priceGrossPln` | DIY parse → Accept | quote cells | PRODUCTION | **Do not** treat as VAT-net |
| Economy product hosts | `economy-product-hosts-seed.ts` · `apply-economy-product-hosts.ts` | Ensure `cw.product.*` hosts | `applyEconomyProductHostsToWorkCatalog` | AUT-MAT hosts | Work Catalog | PRODUCTION | Atlas host **≠** `mat.grunt` |
| Commercial margin floor | `applyGlobalCommercialMarginFloorToStore` · `OWNER_AUTHORIZED_MATERIAL_GLOBAL_MARGIN_FLOOR_PCT` | Material commercial margin (e.g. **20%**) | floor apply | PM → SELL | Work Catalog commercial | PRODUCTION | **≠** Kp / profit / Bid Finance minMargin |
| DIY selective | `src/lib/price-intelligence/diy-selective-lookup-client.ts` | LM/Casto/OBI lookup | client → Edge | material research | Edge + PM | PRODUCTION | Legal allowlist · LM primary Accept · Casto/OBI corroboration only |
| IK Orchestra | `src/lib/intelligent-estimator/orchestra/*` | **ONLY** sequencer | `ik-orchestra-engine` · `use-ik-orchestra` | Hub / Host | OfferBoq attestations | PRODUCTION | **DO NOT** second Orchestra |
| AUTO G1 / G2 | `auto-g1-accept-contract.ts` · `auto-g2-accept-contract.ts` | Routine identity / rate∥BOM attestation | evaluate contracts | Orchestra | OfferBoq | PRODUCTION | attestation ≠ Catalog invent |
| ACLC | `autonomous-canonical-leaf-create.ts` (+ WC create) | Canonical leaf create | `executeKnrWcCatalogWorkCreate` | KNR/Knowledge path | Work Catalog | PRODUCTION / WIP_LOCAL verify | **no** P31 leaf engine |
| LABOR_ONLY_AUTO_BOM_V1 | `orchestra/labor-only-auto-bom-v1-contract.ts` | Labor-only BOM under HARD contract | contract evaluate | G2 BOM / P6 | OfferBoq/pack | PRODUCTION / WIP_LOCAL verify | **no** per-KNR BOM engines |
| CCR-v1 | `knr-knowledge/knr-corpus-conflict-resolution-v1.ts` | Corpus conflict resolution | CCR helpers | KNR/Knowledge | catalog/knowledge | PRODUCTION / WIP_LOCAL verify | **no** one-off conflict scripts |
| Position Cost F5 | `src/lib/tender-position-cost/*` | Position cost engine | `computePositionCost` | Bid / Hub shadow | ephemeral + bid wire | PRODUCTION | DO NOT second engine |
| Bid calculator | `src/lib/tenders-bid-calculator.ts` | Bid proposal | `computeTenderBidProposal` | Offer/Bid UI | — | KEEP / LEGACY dual | No third PLN |
| Chief orchestrator | `src/lib/chief-orchestrator/*` | Case→Task dossier | `runChiefOrchestrator` | Session hooks | in-memory dossier | PRODUCTION | ≠ IK Orchestra |
| Cloud sync | `src/lib/cloud-sync.ts` | KV merge/push | persistKey · fetchKeys | whole app | Supabase KV | CORE LOCK | No casual change · Accept quotes: bump **`updatedAt`** + **`intent`** push |
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

## 4. AUT-MAT Accept — REUSE THIS PATH

```text
evaluateAutMatMaterialAcceptContract
  → tryAutMatAcceptMaterialCandidate
  → acceptMaterialResearchCandidate
  → marketQuotes (Price Memory CURRENT)
  → computeSellPricePln(base, marginPct) → SELL
```

Verified capability (`e43acb19`):

| Material | Host | priceNet (GROSS) | Margin | SELL |
|----------|------|------------------|--------|------|
| Paint `mat.farba_lateksowa_wewnetrzna` | `cw.product.farba_lateksowa_wewnetrzna` | 10.00 PLN/l | 20% | **12.00** |
| Atlas `mat.atlas_uni_grunt` | `cw.product.atlas_uni_grunt` | 4.24 PLN/l | 20% | **5.09** |

**HARD:** `mat.grunt` MISSING is correct — do not alias to Atlas.  
**HARD:** Casto/OBI = corroboration only — do not average.  
**HARD:** After Accept, bump `updatedAt` + push **`intent`** (union alone can LWW-lose quotes).

---

## Forbidden duplicates (explicit)

```text
❌ New TendersModule / TenderWorkspaceV3 / NewWorkCatalog
❌ New Evidence→OUR RATE bridge bypassing Accept / AUT-R1
❌ New Classification Gate
❌ New PDF costing engine without AUDIT of existing stack
❌ New Material Catalog KV parallel to Price Memory
❌ New Material Accept path parallel to AUT-MAT
❌ New identity engine replacing CIE/CIV/AID/AIR / work-rate-identity-mapping
❌ New Orchestra / Chief-as-Orchestra / TPI parallel runtime
❌ New Labor Rate Engine 2 / Material Price Engine 2 / Finance Engine 2
❌ New P31 Rate Engine / Transport Rate Engine / Technology Engine 2
❌ New external source registry parallel to Evidence/Knowledge
❌ Chat-only architecture (must persist to Master / this map / code)
```

---

## How to extend safely

1. Grep / Glob existing symbol.  
2. Read Master §8 / §15 / §27 / §31–§36 + DF / closeout.  
3. AUDIT → Owner GO → thin DF → IMPLEMENT.  
4. Prefer adapter / allowlist row / Owner mapping / Evidence reuse over new module.  
5. Classify: **REUSE | CONNECT | VERIFY | EXTEND EXISTING | NEW** — `NEW` is exception.  
6. Classify residual **ENGINE vs DATA/RESEARCH** before claiming “missing engine”.

**STOP.**
