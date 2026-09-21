# INTELLIGENT ESTIMATOR — REUSE MAP

> **ID:** `INTELLIGENT-ESTIMATOR-REUSE-MAP`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** **2026-09-21** · **Decision C PRODUCTION CLOSEOUT** · prior M3 docs reconcile · prior 2026-09-16 RMS/ATH→KL3 + MODEL C · prior 2026-09-15 Gap Job freeze · prior 2026-09-14 AUT-MAT  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) **§6A** · **§13.4–13.6** · §15 · §24 · §27 · §31–§33  
> **Continuity (latest pointer):** [`IK-MASTER-CONTINUITY-HANDOFF-2026-09-20.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-09-20.md) — return-to-IK · Tender Freeze **CLOSED / OUTSIDE IK**  
> **Session seams (09-16):** [`IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md) · [`IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md`](./IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md) · `.tmp/IK_MODEL_C_ARCHITECTURE_FREEZE_REPORT.md`  
> **Tender Freeze closeout:** [`TENDER-DETAIL-FREEZE-INCIDENT-CLOSEOUT.md`](./TENDER-DETAIL-FREEZE-INCIDENT-CLOSEOUT.md)  
> **LIVE tip:** **FETCH** `/version.json` · expected **2.66.231 / `50bce20`** · documentary [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Rule:** If it is listed here → **DO NOT DUPLICATE**. Extend only with Owner GO.  
> **Law:** ★★ IK IS ITS FUNCTION TREE ★★ — DECISION TREE → ORCHESTRA → EXPERTS → CATALOGS / KNOWLEDGE / EVIDENCE / RESEARCH → PERSISTENCE → REUSE  
> **HARD:** `DISPATCH_CONTRACT = PARTIAL` ≠ missing feature · **IkGapJob ≠ Accept Engine** (Master §6A) · **ATH = auxiliary normative source ≠ tender input** · **RMS ≠ OUR RATE** · tests touching canonical discovery writer → **`discoveryPersistIo` only** · **DECISION C ARCH CLOSED + RUNTIME COMPLETE + PV @ `50bce20d` (`OWNER_HARD_WINS`)** · HARD minting UI/API still OPEN · **MODEL C FROZEN** · **OPEN NODE (bid) = `OWNER_FINANCE_NOT_OK`** · **GLOBAL IK PV = NO** · **Full Autonomy = NO**  
> **Git truth:** status `PRODUCTION` = confirmed by `git ls-files` on `main`; **WIP_LOCAL** = working tree only (see §5 · Master §6A note)

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
| **Technology Pack** | `technology-foundation/*` · pack registry · KV `kw-technology-packs` (`packId@@packVersion`) | BOM qtyFactor / steps · technology · Catalog First `hydratePackRegistryFromDurable` | Price Memory / OUR RATE |
| **Labor Evidence** | `labor-source-evidence/*` · `kw-wgdom-labor-source-evidence` | Durable labor observations | OUR RATE (until AUT-R1/Accept) |
| **Material Evidence** | MEK / material-source-evidence (plane) | Durable material observations | PM CURRENT (until AUT-MAT) |
| **KNR Catalog** | `kw-knr-catalog` · KL / P4 | KNR knowledge (PENDING_VERIFY / VERIFY) | Work Catalog identity · OUR RATE |
| **KNR Discovery Evidence** | `knr-knowledge/knr-discovery-evidence-{store,merge,sync}.ts` · KV `kw-knr-discovery-evidence` | Norms evidence for V1-HARD (Owner HARD · public on-demand · ATH `ath_l1_aux_*`) · canonical writer `saveKnrDiscoveryEvidenceStore` | OUR RATE · KNR Catalog · Work Catalog · **Decision C LIVE `OWNER_HARD_WINS` @ `50bce20d`** · durable `authorityHold` · ATH cannot mint HARD |

**Canonical catalogs (cold-start):** LABOR → Work Catalog / OUR RATE · MATERIAL → Price Memory / Material Knowledge · KNR → KNR Catalog / KNR Discovery Evidence · LABOR+MATERIAL / COMPOUND → TechnologyPack / BOM. Always **Catalog First**; on MISS → `RESEARCH → EVIDENCE → VALIDATE → ACCEPT → CANONICAL CATALOG → REUSE` (never one-shot research).

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
| IK Gap Job (MODEL C) | `src/lib/ik-pricing-orchestrator/*` | Typed gap inventory + optional dispatch to research bridges | `inventoryIkGapsFromShadow` · `IkGapJob` · `labor-research-bridge` (**main**) · `dispatchIkGapJob` · material/technology bridges (**WIP_LOCAL**) | Shadow / Hub | none | PRODUCTION (inventory + labor bridge) · **WIP_LOCAL** (typed dispatch `dispatch-gap-job.ts`) | **≠** Accept · **≠** Orchestra · **≠** Catalog · PARTIAL dispatch = OK · **inventory / dispatch carrier only** |
| ATESD / ATA / Pack | `ik-atesd-technology-phase` · `autonomous-technology-*` · `pack-registry` | Technology Accept → durable pack | ATA → `persistAcceptedTechnologyPackViaRegisterSeam` → `registerPack` → `upsertTechnologyPackDurable` | Orchestra ATESD | `kw-technology-packs` | PRODUCTION (ATA · registry · store) · **WIP_LOCAL** (ATA ACCEPT → durable CONNECT · `persisted` real boolean; HEAD = `persisted: false` literal) | **≠** OUR RATE · **≠** qtyFactor invent · **no second pack persistence path** |
| **Normative RMS → V1-HARD adapter** | `knr-knowledge/normative-rms-to-discovery-v1-adapter.ts` · `knr-host-kl3-adapter.ts` (MISS wire) | RMS (ATH AUX / public PARTIAL) → discovery evidence V1-HARD | `adaptAthRmsToDiscoveryV1Hard` | KL3 host on Catalog First MISS | `athRmsWire.discoveryStore` → §5 persist | PRODUCTION (`ca0e9545`) | **thin adapter** · RMS ≠ OUR RATE · r-g ≠ PLN · M=0 → NO_MATERIAL_NORM only per frozen contract |
| **Historical ATH → KL3 mapper** | `historical-executed/historical-ath-kl3-files.ts` · `historical-executed-host-hydrate.ts` · `use-ik-orchestra.ts` | completed jobs `historicalIndex` + real ATH bytes → `KnrKl3bAthFile[]` per line | mapper + hydrate | `executeKl3KnowledgeLookup(athFiles)` | none (mapper) | PRODUCTION (`b037c8c9`) | **thin mapper** · fail-closed (no bytes / no index / mismatch) · CONFLICT on multi-candidate · **no fuzzy first/last** · per-line filter (`MAX_L1_FILES=1`) · ATH = AUX ≠ tender input |
| **KL3 canonical persistence seam** | `orchestra/ik-orchestra-runtime.ts` | `executeKl3KnowledgeLookup` → `persistKl3DiscoveryEvidence` → `merge(local, ath)` → etag gate → `saveKnrDiscoveryEvidenceStore` | `persistKl3DiscoveryEvidence(store, io)` | KL3 host complete (async) | `kw-knr-discovery-evidence` | PRODUCTION (`a07ab4be` · **HISTORY tip** 2.66.230 · ≠ CURRENT LIVE **`50bce20`** · HISTORY mid-chain Tender Freeze **`cc210d9`**) | REUSE canonical writer · **`merged ⊇ local`** · no new store/writer · no ATH-only filter (`MIXED` accepted) |
| **`discoveryPersistIo` test seam** | `orchestra/ik-orchestra-runtime.ts` (`Kl3DiscoveryEvidencePersistIo`) | Inject `loadLocal` / `save` in tests → **zero production I/O** | `executeKl3KnowledgeLookup({ discoveryPersistIo })` | `scripts/test-*kl3*.mjs` (incl. `test-historical-ath-kl3-wire.mjs` J · `test-kl3-discovery-evidence-persist.mjs`) | mock | PRODUCTION (`3bfecc7f`) | **MANDATORY** in every KL3 test · add `globalThis.fetch` guard · do not invent a second seam |
| **Canonical discovery writer** | `knr-discovery-evidence-sync.ts` (`saveKnrDiscoveryEvidenceStore`) · `knr-discovery-evidence-merge.ts` (`mergeKnrDiscoveryEvidenceStoreDetailed` · authority-aware resolver · `pickConflictLayer1`) · `knr-discovery-evidence-store.ts` (`isValidOwnerHardAuthority` · `isDestructiveKnrDiscoveryReplace` · `upsertKnrDiscoveryEvidenceOffline`) | Only writer for `kw-knr-discovery-evidence` | save / merge / guard | KL3 persist · ops scripts · CloudLoader bootstrap | `kw-knr-discovery-evidence` | PRODUCTION · **Decision C COMPLETE @ `50bce20d`** | REUSE only · **do not** invent second conflict engine · HARD minting UI/API = separate Owner GO |

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

## 5. Session 2026-09-16 seams — REUSE THIS (Master §13.4–13.6 · closeout [`2026-09-16`](./IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md))

| Seam | Existing implementation | Role | Reuse rule | Forbidden duplicate |
|------|-------------------------|------|------------|---------------------|
| `IkGapJob` inventory / dispatch carrier | `ik-pricing-orchestrator/inventory-gaps.ts` (`inventoryIkGapsFromShadow`, main) · `dispatch-gap-job.ts` + bridges (**WIP_LOCAL**) | Typed inventory of ShadowGapCodes → optional dispatch → existing bridges → STOP | Every gap gets explicit outcome (`RESEARCHABLE \| HOLD \| OWNER_EXCEPTION \| SYSTEM_ERROR \| RESOLVED`) · `DISPATCH_CONTRACT = PARTIAL` is correct | Universal Orchestra / Research / Accept / Catalog · `IkGapJob → Identity` (cycle) · `IkGapJob → runIkKnrExpert` without Owner GO |
| Model C domain boundaries | Master §6A | LABOR → AUT-R1 · MATERIAL → AUT-MAT · TECHNOLOGY → ATA · BOM → existing path · KNR → Orchestra/KL/P4 · IDENTITY → G1 upstream · EQUIPMENT/TRANSPORT/WASTE → HOLD / Owner policy | Accept stays in domain Experts / ATESD | Universal Adapter „for 100% dispatch” |
| Historical ATH mapper | `historical-executed/historical-ath-kl3-files.ts` | historicalIndex + real bytes → `KnrKl3bAthFile[]` per line (fail-closed) | Feed `executeKl3KnowledgeLookup(athFiles)` only · ATH = AUX | Second ATH parser · fuzzy match · Historical `authority=true` |
| RMS → V1-HARD adapter | `knr-knowledge/normative-rms-to-discovery-v1-adapter.ts` (`adaptAthRmsToDiscoveryV1Hard`) | R → labor norm r-g evidence · M=0 → NO_MATERIAL_NORM (frozen contract) → `upsertKnrDiscoveryEvidenceOffline` → `evaluateLaborOnlyAutoBomV1Contract` | Thin adapter · RMS ≠ OUR RATE · r-g ≠ PLN | RMS engine 2 · `r-g → PLN` · RMS → Work Catalog |
| KL3 canonical persistence seam | `orchestra/ik-orchestra-runtime.ts` `persistKl3DiscoveryEvidence` | `merge(local, athRmsWire.discoveryStore)` → etag gate → `saveKnrDiscoveryEvidenceStore` | `merged ⊇ local` · async · V1 eventual consistency accepted | Direct cloud write from KL3 · new discovery store · ATH-only filter |
| `discoveryPersistIo` test safety seam | `Kl3DiscoveryEvidencePersistIo` in `ik-orchestra-runtime.ts` | Test injection of `loadLocal` / `save` → zero production I/O | **Mandatory** in all `executeKl3KnowledgeLookup` tests + `globalThis.fetch` guard | Running KL3 tests against real `KL3_DISCOVERY_PERSIST_IO` (incident `0909-04`) |
| TechnologyPack durable persistence seam | `work-catalog/autonomous-technology-evidence-discovery.ts` `persistAcceptedTechnologyPackViaRegisterSeam` → `registerPack` → `upsertTechnologyPackDurable` (**WIP_LOCAL**) · `hydratePackRegistryFromDurable` (main) | ATA ACCEPT → `kw-technology-packs` → Catalog First reuse next tender | Built in memory ≠ persisted · `persisted` must be real boolean | Second pack persistence path · KB-03 router minting packs |

**Decision C:** **ARCH CLOSED** · **RUNTIME COMPLETE** · **PRODUCTION VERIFIED** @ **`50bce20d` / 2.66.231** · **`OWNER_HARD_WINS`** → [`ADR-DECISION-C-KNR-DISCOVERY-EVIDENCE-WRITER-PRECEDENCE.md`](./ADR-DECISION-C-KNR-DISCOVERY-EVIDENCE-WRITER-PRECEDENCE.md). L1 safe deterministic · L2 unsafe ACTIVE/ACTIVE → CONFLICT + durable `authorityHold` · L3 exactly one valid HARD wins · L3b two HARD different hashes → OWNER_EXCEPTION · legacy ≠ HARD · ATH/public cannot mint HARD · `conflicts[]` diagnostic only · CONFLICT consumers fail closed. **HARD minting UI/API still OPEN** (separate Owner GO).

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
❌ Universal Accept Engine / IkGapJobAcceptEngine / CentralAcceptEngine
❌ Treat DISPATCH_CONTRACT=PARTIAL as mandate to connect KNR/IDENTITY/BOM/Accept into IkGapJob
❌ IkGapJob → runIkIdentityPhase (cycle risk) · IkGapJob → runIkKnrExpert without new Owner architecture GO
❌ Second TechnologyPack persistence path bypassing registerPack / upsertTechnologyPackDurable
❌ Mandatory MaterialSourceEvidence store gate before AUT-MAT without Owner GO
❌ Second KNR discovery evidence store / writer parallel to saveKnrDiscoveryEvidenceStore
❌ Second ATH parser / Historical ATH mapper with fuzzy matching · ATH treated as tender input
❌ RMS engine 2 · RMS → OUR RATE · r-g → PLN without canonical rate contract
❌ KL3 test invoking executeKl3KnowledgeLookup without discoveryPersistIo (production write)
❌ Second conflict engine / second discovery KV parallel to Decision C authority-aware merge
❌ Claiming WIP_LOCAL (dispatch-gap-job · pack durable CONNECT) as PRODUCTION / PV
❌ Owner HARD minting UI/API without separate Owner GO (OD-DC-DF-4)
```

---

## How to extend safely

1. Grep / Glob existing symbol.  
2. Read Master §6A / §8 / §13 / §15 / §27 / §31–§36 + DF / latest closeout.  
3. AUDIT → Owner GO → thin DF → IMPLEMENT.  
3a. Cursor blocked (unknown source / function / norm / price / plane)? → **STOP · do not guess · escalate to ChatGPT/Owner** (Master §27.3).  
4. Prefer adapter / allowlist row / Owner mapping / Evidence reuse over new module.  
5. Classify: **REUSE | CONNECT | VERIFY | EXTEND EXISTING | NEW** — `NEW` is exception.  
6. Classify residual **ENGINE vs DATA/RESEARCH** before claiming “missing engine”.

**STOP.**

*Decision C PRODUCTION CLOSEOUT 2026-09-21 · ARCH CLOSED · RUNTIME COMPLETE · PV @ 50bce20d / 2.66.231 · MODEL C FROZEN · HARD minting OPEN · tip FETCH 2.66.231/`50bce20` · docs only · NO runtime commit in this GO*
