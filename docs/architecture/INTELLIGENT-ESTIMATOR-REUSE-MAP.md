# INTELLIGENT ESTIMATOR — REUSE MAP

> **ID:** `INTELLIGENT-ESTIMATOR-REUSE-MAP`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-14  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Rule:** If it is listed here → **DO NOT DUPLICATE**. Extend only with Owner GO.

---

## Legend

| Status | Meaning |
|--------|---------|
| PRODUCTION | On `main` / tip; use as-is |
| KEEP | Exists; do not remove without audit |
| LEGACY | Technical debt; not new pricing SSOT |
| FORBIDDEN_DUP | Creating a parallel module is banned |

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
| INTERNAL-FIRST domain gate (P5.25-FIX) | `src/lib/intelligent-estimator/internal-first-domain.ts` · `internal-first-semantic-match.ts` · `internal-first-text.ts` · `internal-first-research-key.ts` · `internal-first-source-health.ts` | PACKAGE≠MATERIAL≠LABOR price reuse · semantic lookup · researchKey dedupe · source circuit | `domainsCompatibleForFinalPriceReuse` · `lookupInternalFirst` · `InternalFirstSourceHealthTracker` | P5.25 runner · future research | none (pure) | PRODUCTION | **DO NOT DUPLICATE** · no PACKAGE→MATERIAL |
| Work Catalog | `src/lib/work-catalog/*` | Biblioteka + OUR RATE | normalize · lookup · research · accept | F5 · UI · IK | `kw-wgdom-work-catalog` | PRODUCTION | **DO NOT DUPLICATE** |
| Accept | `src/lib/work-catalog/work-rate-accept.ts` | Owner Accept → OUR RATE | `acceptWorkRateResearchCandidate` | useWorkCatalog · labor-research-bridge | catalog | PRODUCTION | Only write gate for research rates |
| Selective research | `src/lib/work-catalog/work-rate-research.ts` | ONE-work research | `runSelectiveWorkRateResearch` | UI · IR · IK | cooldown memory | PRODUCTION | No full-catalogue crawl |
| Identity mapping | `src/lib/work-catalog/work-rate-identity-mapping.ts` | Owner mappings | `listWorkRateIdentityMappings` | research IR | code registry | PRODUCTION | No silent new mappings |
| Labor Evidence | `src/lib/labor-source-evidence/*` | Durable observations | normalize · merge · ingest | IR write GOs | `kw-wgdom-labor-source-evidence` | PRODUCTION | ≠ OUR RATE |
| Price / material catalog | `src/lib/price-intelligence/our-price-catalog.ts` | Material commercial + margin | catalog helpers | Firma UI · F5 | PM / work commercial fields | PRODUCTION | Material plane only |
| DIY selective | `src/lib/price-intelligence/diy-selective-lookup-client.ts` | LM/Casto/OBI lookup | client → Edge | material research | Edge + PM | PRODUCTION | Legal allowlist |
| Position Cost F5 | `src/lib/tender-position-cost/*` | Position cost engine | engine · adapters · cutover | Bid / Hub shadow | ephemeral + bid wire | PRODUCTION | DO NOT second engine |
| Bid calculator | `src/lib/tenders-bid-calculator.ts` | Bid proposal | `computeTenderBidProposal` (and related) | Offer/Bid UI | — | KEEP / LEGACY dual with Offer | No third PLN |
| Chief orchestrator | `src/lib/chief-orchestrator/*` | Case→Task dossier | `runChiefOrchestrator` | Session hooks | in-memory dossier | PRODUCTION | Orchestrator only |
| Cloud sync | `src/lib/cloud-sync.ts` | KV merge/push | persistKey · fetchKeys | whole app | Supabase KV | CORE LOCK | No casual change |
| companyPricePln | `CatalogWork.companyPricePln` | Legacy mixed price field | — | old bid/offer paths | catalog | LEGACY TECHNICAL | **≠ OUR RATE** · no auto-migrate |
| Command Center | `docs/archive/command-center/` | Historical | — | — | — | SUPERSEDED | Do not resurrect |
| NG-10 Autonomous | `src/app/tenders/autonomous/*` · `src/lib/tender-autonomous-run-*.ts` | Old first-screen theater | Gate/Run/timeline | TenderDetailPage | LS `kw-tender-autonomous-run-v1:` | KEEP TEMPORARY (P1–P9) | **DO NOT extend as IK** · decommission map P10 |
| Multi-dwelling / Multi-BOQ | `src/lib/multi-dwelling/*` · `src/lib/multi-boq/*` | N adresów × N przedmiarów · SUM | PackageGate · compose · `lineProvenance` | Hub panel | `kw-multi-dwelling-package-v1` | PRODUCTION | **DO NOT DUPLICATE** |
| Multi-dwelling graph fallback (S6-B) | `src/lib/multi-dwelling/orchestration.ts` | Per-dwelling BOQ dependency graph isolation | `evaluateAllDwellingsInPackage` graph resolve | multi-dwelling package eval | — | PRODUCTION | **S6-B CLOSED** · gdy `boqDependencyGraphsByDwelling` istnieje, miss → **null** (nie kradnie primary graph) · legacy maps null/undefined → primary · **DO NOT** reintroduce steal-primary |
| Outcome Bid S4-B enrich (S6-A) | `src/lib/intelligent-estimator/boq-outcome-s4b-enrichment.ts` | Outcome Bid Document Expert bridge · S2+S3 enrich before cutover | enrich helpers wired from Outcome OfferBoq | `tender-offer-boq-explainability` | none (pure) | PRODUCTION | **S6-A CLOSED** · **nie** zmieniać `resolveBoqPricingQuantity` · reuse only |
| KNR WC P4 trust seam | `src/lib/intelligent-estimator/orchestra/ik-knr-wc-p4-trust-seam.ts` · flag `knr-wc-identity-bridge-feature.ts` | Slice D HIT → trusted tuple → Identity preserve → F5 TRUSTED_MATCH | `promoteSliceDHitToTrustedTuple` | `ik-orchestra-engine` | — | PRODUCTION | **P4 CLOSED** · flag **ON** · **nie** second mapper · preserve `knrHint`/`catalogBasis` · sets `exact_knr` + `high` |
| Ingest | `src/lib/tender-ingest/*` | Lossless docs → artifact pool | registry · contentHash | Multi-BOQ | LS ingest | PRODUCTION | Upstream only |
| Bid PDF | `src/lib/tender-bid-package-pdf.ts` | Oferta PDF | `exportTenderBidPackagePdf` | DetailPanel | — | PRODUCTION | REUSE · no new PDF engine |
| ATH parse / preview PDF | `src/lib/ath-parser.ts` · `ath-kosztorys-pdf.ts` | NORMA input + preview | `parseKosztorysBytes` | Kosztorys UI | — | PRODUCTION | **No ATH writer in repo** |
| IK orchestrator W2 | `src/lib/ik-pricing-orchestrator/*` | Gaps + labor bridge above F5 | `inventoryIkGapsFromShadow` · `runIkLaborGapResearch` | Hub panel | none | PRODUCTION | Extend here — no v2 package |

---

## Forbidden duplicates (explicit)

```text
❌ New TendersModule / TenderWorkspaceV3 / NewWorkCatalog
❌ New Evidence→OUR RATE bridge bypassing Accept
❌ New Classification Gate
❌ New PDF costing engine without AUDIT of existing stack
❌ New Material Catalog KV parallel to Price Memory
❌ New identity engine replacing work-rate-identity-mapping
```

---

## How to extend safely

1. Grep / Glob existing symbol.  
2. Read DF / closeout.  
3. AUDIT → Owner GO → thin DF → IMPLEMENT.  
4. Prefer adapter / allowlist row / Owner mapping over new module.

**STOP.**
