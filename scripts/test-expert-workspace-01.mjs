/**
 * WIRE-EXPERTS-UI-01 — harness (VM passthrough · phase · order · BOM depth).
 * npx vite-node scripts/test-expert-workspace-01.mjs
 *
 * Zero Expert/Chief/Session/Validation/Adapters/TF BC edits · fixtures only.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExpertWorkspaceViewModel } from "../src/lib/expert-workspace-ui/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(e);
  }
}

function baseContract(role) {
  return {
    co: `co-${role}`,
    dlaczego: `dlaczego-${role}`,
    naPodstawieCzego: `base-${role}`,
    pewnosc: "medium",
    blokery: [],
    zgodnoscZRozumieniemWykonania: "aligned",
    zgodnoscOpisPl: "ok",
  };
}

function fixtureDossier(overrides = {}) {
  return {
    caseId: "case-ew-1",
    status: "ready_for_decydent",
    createdAt: "2026-08-08T00:00:00.000Z",
    finishedAt: "2026-08-08T00:01:00.000Z",
    loopCount: 0,
    tasks: [],
    traces: {
      execution: baseContract("ee"),
      materials: baseContract("me"),
      pricing: baseContract("pe"),
      cost: baseContract("cost"),
      offer: baseContract("offer"),
    },
    experts: {
      execution: {
        contract: baseContract("ee"),
        selection: {
          packId: "pack-1",
          packVersion: "1",
          namePl: "Pack Test",
          score: 0.9,
          matchReasonsPl: ["r1"],
          matchedLineIds: ["L1"],
        },
        technologyDecision: "allow",
        plan: {
          planId: "plan-1",
          planRevision: "rev-1",
          packId: "pack-1",
          packVersion: "1",
          stages: [
            {
              stageId: "s1",
              order: 1,
              namePl: "Etap 1",
              steps: [
                {
                  stepId: "st1",
                  stageId: "s1",
                  order: 1,
                  namePl: "Krok",
                  catalogWorkId: "w1",
                  quantity: 2,
                },
              ],
            },
          ],
        },
        bundle: {
          bundleId: "b1",
          namePl: "Bundle",
          packId: "pack-1",
          packVersion: "1",
          planRevision: "rev-1",
          steps: [
            {
              order: 1,
              workId: "w1",
              quantityDefault: 2,
              notePl: "",
              stepId: "st1",
              stageId: "s1",
            },
          ],
        },
        bom: {
          bomId: "bom-1",
          packId: "pack-1",
          packVersion: "1",
          planRevision: "rev-1",
          materials: [
            {
              bomLineId: "bm1",
              materialKey: "m1",
              namePl: "Mat",
              unit: "m2",
              quantity: 10,
            },
            {
              bomLineId: "bm2",
              materialKey: "m2",
              namePl: "Mat2",
              unit: "kg",
              quantity: 3,
            },
          ],
          equipment: [
            {
              bomLineId: "be1",
              equipmentKey: "e1",
              namePl: "Eq",
              unit: "h",
              quantity: 1,
            },
          ],
          labour: [
            {
              bomLineId: "bl1",
              labourKey: "lab1",
              namePl: "Rob",
              hours: 5,
            },
          ],
        },
        gapsAndRisks: [
          {
            kind: "execution_risk",
            code: "G1",
            messagePl: "gap",
          },
        ],
        pack: {
          packId: "pack-1",
          packVersion: "1",
          definitionId: "d1",
          packCapabilities: [],
          lifecycle: "active",
          namePl: "Pack Test",
          stages: [],
          steps: [],
          dependencies: [],
          materials: [],
          equipment: [],
          labour: [],
          regulatory: [],
        },
      },
      materials: {
        contract: baseContract("me"),
        lines: [
          {
            materialKey: "m1",
            namePl: "Mat",
            unit: "m2",
            quantity: 10,
            conformity: "zgodny",
          },
        ],
        gapsAndRisks: [],
        variants: [],
        completeness: "kompletny",
        completenessNotePl: "ok",
        packMaterialCoverage: { required: 1, present: 1, conforming: 1 },
      },
      pricing: {
        contract: baseContract("pe"),
        lines: [
          {
            materialKey: "m1",
            namePl: "Mat",
            quantity: 10,
            unit: "m2",
            mappedWorkId: "w1",
            mapLabelPl: "map",
            marketPricePln: 12.5,
            originCount: 1,
            sources: [
              {
                origin: "catalog",
                pricePln: 12.5,
                regionCode: "PL-DS",
                coverage: "full",
                confidence: 0.8,
                updatedAt: "2026-08-01",
                fallbackUsed: false,
              },
            ],
            dominantCoverage: "full",
            freshness: "ok",
            freshestUpdatedAt: "2026-08-01",
            trend: "flat",
            trendDeltaPct: null,
            spreadPct: null,
            priceRisk: "low",
            riskNotesPl: [],
            requiresReanalysis: false,
            returnToMaterialExpert: false,
            returnReasonPl: null,
          },
        ],
        requiresReanalysis: false,
        returnToMaterialExpert: false,
        returnReasonsPl: [],
        reanalysisMaterialKeys: [],
      },
      cost: {
        contract: baseContract("cost"),
        completenessOk: true,
        materialLines: [
          {
            materialKey: "m1",
            namePl: "Mat",
            quantity: 10,
            unit: "m2",
            purchaseUnitPln: 10,
            purchaseTotalPln: 100,
            marketUnitPln: 12,
            marketTotalPln: 120,
          },
        ],
        labourLines: [],
        equipmentLines: [],
        breakdown: {
          materialsPurchasePln: 100,
          labourPln: 0,
          equipmentPln: 0,
          directPln: 100,
          auxiliaryPln: 0,
          internalOverheadPln: 0,
          realCostPln: 100,
        },
        comparative: {
          marketMaterialsPln: 120,
          purchaseMaterialsPln: 100,
          realCostPln: 100,
          purchaseVsMarketPct: -16.67,
          realVsPurchaseMaterialsPct: 0,
          realVsMarketMaterialsPct: -16.67,
          notesPl: ["n1"],
        },
        handoffToOfferExpert: true,
        handoffBlockersPl: [],
        offerHandoffPayload: {
          realCostPln: 100,
          breakdown: {
            materialsPurchasePln: 100,
            labourPln: 0,
            equipmentPln: 0,
            directPln: 100,
            auxiliaryPln: 0,
            internalOverheadPln: 0,
            realCostPln: 100,
          },
          comparative: {
            marketMaterialsPln: 120,
            purchaseMaterialsPln: 100,
            realCostPln: 100,
            purchaseVsMarketPct: null,
            realVsPurchaseMaterialsPct: null,
            realVsMarketMaterialsPct: null,
            notesPl: [],
          },
          contractSummaryPl: "handoff ok",
          pewnosc: "medium",
        },
      },
      offer: {
        contract: baseContract("offer"),
        primaryRecommendation: {
          strategy: "rekomendowany",
          offerPricePln: 120,
          breakdown: {
            realCostPln: 100,
            marginPct: 0.15,
            marginPln: 15,
            riskPct: 0.05,
            riskPln: 5,
            offerPricePln: 120,
          },
          summaryPl: "reco",
        },
        scenarios: [
          {
            strategy: "agresywny",
            labelPl: "Agresywny",
            breakdown: {
              realCostPln: 100,
              marginPct: 0.1,
              marginPln: 10,
              riskPct: 0.02,
              riskPln: 2,
              offerPricePln: 112,
            },
          },
        ],
        signalToDecisionMaker: true,
        decisionMakerPayload: {
          offerPricePln: 120,
          realCostPln: 100,
          breakdown: {
            realCostPln: 100,
            marginPct: 0.15,
            marginPln: 15,
            riskPct: 0.05,
            riskPln: 5,
            offerPricePln: 120,
          },
          scenarios: [],
          primarySummaryPl: "reco",
          pewnosc: "medium",
          contractCo: "co-offer",
        },
      },
    },
    offerHandoffPayload: null,
    decisionMakerPayload: null,
    primaryRecommendation: null,
    scenarios: [],
    orchestrationNotesPl: [],
    handoffBlockersPl: [],
    returnFlags: {
      returnToMaterialExpert: false,
      requiresReanalysis: false,
    },
    ...overrides,
  };
}

ok("T1 null dossier → hidden", () => {
  const vm = buildExpertWorkspaceViewModel({ dossier: null });
  assert.equal(vm.uiPhase, "hidden");
});

ok("T2 running phase → hidden", () => {
  const vm = buildExpertWorkspaceViewModel({
    dossier: fixtureDossier(),
    dossierUiPhase: "running",
  });
  assert.equal(vm.uiPhase, "hidden");
});

ok("T3 ready phase → ready + 5 panels", () => {
  const vm = buildExpertWorkspaceViewModel({
    dossier: fixtureDossier(),
    dossierUiPhase: "ready",
  });
  assert.equal(vm.uiPhase, "ready");
  assert.equal(vm.execution.hasResult, true);
  assert.equal(vm.materials.hasResult, true);
  assert.equal(vm.pricing.hasResult, true);
  assert.equal(vm.cost.hasResult, true);
  assert.equal(vm.offer.hasResult, true);
});

ok("T4 null experts → empty panels still present", () => {
  const d = fixtureDossier({
    experts: {
      execution: null,
      materials: null,
      pricing: null,
      cost: null,
      offer: null,
    },
  });
  const vm = buildExpertWorkspaceViewModel({
    dossier: d,
    dossierUiPhase: "ready",
  });
  assert.equal(vm.execution.hasResult, false);
  assert.equal(vm.materials.hasResult, false);
  assert.equal(vm.pricing.hasResult, false);
  assert.equal(vm.cost.hasResult, false);
  assert.equal(vm.offer.hasResult, false);
});

ok("T5 BOM full lists no truncate", () => {
  const vm = buildExpertWorkspaceViewModel({
    dossier: fixtureDossier(),
    dossierUiPhase: "blocked",
  });
  assert.equal(vm.execution.bom.materials.length, 2);
  assert.equal(vm.execution.bom.equipment.length, 1);
  assert.equal(vm.execution.bom.labour.length, 1);
  assert.equal(vm.execution.bom.materials[1].materialKey, "m2");
});

ok("T6 passthrough selection score (no recompute)", () => {
  const vm = buildExpertWorkspaceViewModel({
    dossier: fixtureDossier(),
    dossierUiPhase: "finished_other",
  });
  assert.equal(vm.execution.selection.score, 0.9);
  assert.equal(vm.cost.breakdown.find((r) => r.labelPl === "Real Cost").valuePl, "100");
  assert.equal(vm.offer.primary.offerPricePln, 120);
});

ok("T7 allowlist paths exist", () => {
  const files = [
    "src/lib/expert-workspace-ui/index.ts",
    "src/lib/expert-workspace-ui/types.ts",
    "src/lib/expert-workspace-ui/labels.ts",
    "src/lib/expert-workspace-ui/view-model.ts",
    "src/app/expert-workspace/ExpertWorkspaceSurface.tsx",
    "src/app/expert-workspace/ExecutionDetailsPanel.tsx",
    "src/app/expert-workspace/MaterialsDetailsPanel.tsx",
    "src/app/expert-workspace/PricingDetailsPanel.tsx",
    "src/app/expert-workspace/CostDetailsPanel.tsx",
    "src/app/expert-workspace/OfferDetailsPanel.tsx",
    "src/app/chief-dossier/ChiefDossierSurface.tsx",
  ];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(root, f)), f);
  }
});

ok("T8 no analyze* imports in expert-workspace-ui view-model", () => {
  const src = fs.readFileSync(
    path.join(root, "src/lib/expert-workspace-ui/view-model.ts"),
    "utf8",
  );
  assert.equal(/analyze(Execution|Materials|Market|Real|Offer|Validation)/.test(src), false);
  assert.equal(/runChiefOrchestrator/.test(src), false);
});

ok("T9 Surface panel order locked in source", () => {
  const src = fs.readFileSync(
    path.join(root, "src/app/expert-workspace/ExpertWorkspaceSurface.tsx"),
    "utf8",
  );
  const body = src.slice(src.indexOf("return ("));
  const iEe = body.indexOf("<ExecutionDetailsPanel");
  const iMe = body.indexOf("<MaterialsDetailsPanel");
  const iPe = body.indexOf("<PricingDetailsPanel");
  const iCost = body.indexOf("<CostDetailsPanel");
  const iOffer = body.indexOf("<OfferDetailsPanel");
  assert.ok(iEe >= 0 && iMe > iEe && iPe > iMe && iCost > iPe && iOffer > iCost);
});

ok("T10 Slot A mount under Trace in ChiefDossierSurface", () => {
  const src = fs.readFileSync(
    path.join(root, "src/app/chief-dossier/ChiefDossierSurface.tsx"),
    "utf8",
  );
  const body = src.slice(src.indexOf("return ("));
  const iTrace = body.indexOf("<ChiefExpertTraceList");
  const iEw = body.indexOf("<ExpertWorkspaceSurface");
  assert.ok(iTrace >= 0 && iEw > iTrace);
});

ok("T11 no new feature flag kw-expert", () => {
  const vmSrc = fs.readFileSync(
    path.join(root, "src/lib/expert-workspace-ui/view-model.ts"),
    "utf8",
  );
  const appSrc = fs.readFileSync(
    path.join(root, "src/app/expert-workspace/ExpertWorkspaceSurface.tsx"),
    "utf8",
  );
  assert.equal(/kw-expert/.test(vmSrc + appSrc), false);
  assert.equal(/localStorage/.test(vmSrc + appSrc), false);
});

ok("T12 Offer decision note present (no CTA actions in Surface)", () => {
  const vm = buildExpertWorkspaceViewModel({
    dossier: fixtureDossier(),
    dossierUiPhase: "ready",
  });
  assert.match(vm.offer.decisionNotePl, /Decision Workspace/);
  const surface = fs.readFileSync(
    path.join(root, "src/app/expert-workspace/ExpertWorkspaceSurface.tsx"),
    "utf8",
  );
  assert.equal(/\bonClick\b/.test(surface), false);
  assert.equal(/\b(approve|reject|retry|rerun)\b/i.test(surface), false);
  assert.equal(/<button\b/i.test(surface), false);
});

console.log("");
console.log(`Result: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
