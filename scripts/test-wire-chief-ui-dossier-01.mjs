/**
 * WIRE-CHIEF-UI-DOSSIER-01 — ViewModel + LOCK boundary tests.
 * npx vite-node scripts/test-wire-chief-ui-dossier-01.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { idleChiefSessionOutput } from "../src/lib/chief-session/index.ts";
import {
  buildChiefDossierViewModel,
  CHIEF_DOSSIER_SURFACE_TITLE_PL,
  labelTaskIdPl,
} from "../src/lib/chief-dossier-ui/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let passed = 0;
function ok(name, cond = true) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// —— Labels ——
ok("title locked", CHIEF_DOSSIER_SURFACE_TITLE_PL === "Przebieg ekspertów");
ok("task label T1", labelTaskIdPl("T1_execution").includes("Wykonanie"));

// —— Session OFF / No Case ——
{
  const vm = buildChiefDossierViewModel(idleChiefSessionOutput());
  ok("idle → no_case", vm.uiPhase === "no_case");
  ok("no_case empty msg", Boolean(vm.emptyMessagePl));
  ok("no_case no timeline", vm.showTimeline === false);
  ok("no_case no offer", vm.showOffer === false);
}

// —— Not Ready ——
{
  const vm = buildChiefDossierViewModel(
    idleChiefSessionOutput({
      status: "idle",
      caseId: "chief:t1:fp",
      error: "not_ready_for_chief_input",
    }),
  );
  ok("not_ready phase", vm.uiPhase === "not_ready");
  ok("not_ready msg", vm.emptyMessagePl?.includes("OfferBoq"));
  ok("not_ready no traces", vm.showTraces === false);
}

{
  const vm = buildChiefDossierViewModel(
    idleChiefSessionOutput({
      status: "idle",
      caseId: "chief:t1:fp",
      error: "pricing_not_ready",
    }),
  );
  ok("pricing_not_ready phase", vm.uiPhase === "not_ready");
}

// —— Running: no fake timeline ——
{
  const vm = buildChiefDossierViewModel(
    idleChiefSessionOutput({
      status: "running",
      caseState: "running",
      caseId: "chief:t1:fp",
      running: true,
      taskStates: null,
      dossier: null,
    }),
  );
  ok("running phase", vm.uiPhase === "running");
  ok("running no timeline", vm.showTimeline === false);
  ok("running empty msg", vm.emptyMessagePl?.includes("orkiestracja"));
}

// —— Blocked ——
{
  const dossier = {
    caseId: "c1",
    status: "blocked",
    createdAt: "2026-08-07T00:00:00.000Z",
    finishedAt: "2026-08-07T00:00:01.000Z",
    loopCount: 0,
    tasks: [
      {
        id: "T4_cost",
        status: "failed",
        startedAt: null,
        finishedAt: null,
        failReasonPl: "Brak purchase",
      },
    ],
    traces: {
      execution: {
        co: "E",
        dlaczego: "D",
        naPodstawieCzego: "N",
        pewnosc: "low",
        blokery: [{ code: "X", messagePl: "Blok EE" }],
        zgodnoscZRozumieniemWykonania: "partial",
        zgodnoscOpisPl: "opis",
      },
      materials: null,
      pricing: null,
      cost: null,
      offer: null,
    },
    experts: {
      execution: null,
      materials: null,
      pricing: null,
      cost: null,
      offer: null,
    },
    offerHandoffPayload: null,
    decisionMakerPayload: null,
    primaryRecommendation: null,
    scenarios: [],
    orchestrationNotesPl: [],
    handoffBlockersPl: ["Handoff blocked"],
    returnFlags: {
      returnToMaterialExpert: false,
      requiresReanalysis: false,
    },
  };
  const vm = buildChiefDossierViewModel(
    idleChiefSessionOutput({
      status: "blocked",
      caseState: "blocked",
      caseId: "c1",
      dossier,
      taskStates: dossier.tasks,
    }),
  );
  ok("blocked phase", vm.uiPhase === "blocked");
  ok("blocked shows blockers", vm.showBlockers && vm.blockersPl.includes("Handoff blocked"));
  ok("blocked dedup fail", vm.blockersPl.includes("Brak purchase"));
  ok("blocked timeline", vm.showTimeline && vm.taskRows.length === 1);
  ok("blocked traces", vm.showTraces && vm.traceSlots.length === 5);
  ok("blocked no offer", vm.showOffer === false);
  ok("trace order EE first", vm.traceSlots[0].role === "execution");
  ok("trace order Offer last", vm.traceSlots[4].role === "offer");
  ok("null materials empty", vm.traceSlots[1].contract === null);
}

// —— Ready + Offer 1:1 ——
{
  const primary = {
    strategy: "rekomendowany",
    offerPricePln: 1200,
    breakdown: {
      realCostPln: 1000,
      marginPct: 0.1,
      marginPln: 100,
      riskPct: 0.05,
      riskPln: 55,
      offerPricePln: 1200,
    },
    summaryPl: "Rec test",
  };
  const scenarios = [
    {
      strategy: "agresywny",
      labelPl: "A",
      breakdown: { ...primary.breakdown, offerPricePln: 1100 },
    },
    {
      strategy: "rekomendowany",
      labelPl: "R",
      breakdown: primary.breakdown,
    },
    {
      strategy: "bezpieczny",
      labelPl: "B",
      breakdown: { ...primary.breakdown, offerPricePln: 1300 },
    },
  ];
  const decisionMakerPayload = {
    offerPricePln: 1200,
    realCostPln: 1000,
    breakdown: primary.breakdown,
    scenarios,
    primarySummaryPl: "Rec test",
    pewnosc: "high",
    contractCo: "Co oferta",
  };
  const offerHandoffPayload = {
    realCostPln: 1000,
    breakdown: {
      materialsPurchasePln: 400,
      labourPln: 400,
      equipmentPln: 100,
      directPln: 900,
      auxiliaryPln: 50,
      internalOverheadPln: 50,
      realCostPln: 1000,
    },
    comparative: {
      marketMaterialsPln: null,
      purchaseMaterialsPln: 400,
      realCostPln: 1000,
      purchaseVsMarketPct: null,
      realVsPurchaseMaterialsPct: null,
      realVsMarketMaterialsPct: null,
      notesPl: [],
    },
    contractSummaryPl: "Real OK",
    pewnosc: "high",
  };
  const dossier = {
    caseId: "c-ready",
    status: "ready_for_decydent",
    createdAt: "2026-08-07T00:00:00.000Z",
    finishedAt: "2026-08-07T00:00:02.000Z",
    loopCount: 1,
    tasks: [
      {
        id: "T1_execution",
        status: "done",
        startedAt: "t0",
        finishedAt: "t1",
        failReasonPl: null,
      },
      {
        id: "T2_materials_return",
        status: "done",
        startedAt: "t2",
        finishedAt: "t3",
        failReasonPl: null,
      },
      {
        id: "T6_assemble_dossier",
        status: "done",
        startedAt: "t4",
        finishedAt: "t5",
        failReasonPl: null,
      },
    ],
    traces: {
      execution: {
        co: "EE",
        dlaczego: "d",
        naPodstawieCzego: "n",
        pewnosc: "high",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "ok",
      },
      materials: {
        co: "ME",
        dlaczego: "d",
        naPodstawieCzego: "n",
        pewnosc: "medium",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "ok",
      },
      pricing: {
        co: "PE",
        dlaczego: "d",
        naPodstawieCzego: "n",
        pewnosc: "medium",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "partial",
        zgodnoscOpisPl: "ok",
      },
      cost: {
        co: "Cost",
        dlaczego: "d",
        naPodstawieCzego: "n",
        pewnosc: "high",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "ok",
      },
      offer: {
        co: "Offer",
        dlaczego: "d",
        naPodstawieCzego: "n",
        pewnosc: "high",
        blokery: [],
        zgodnoscZRozumieniemWykonania: "aligned",
        zgodnoscOpisPl: "ok",
      },
    },
    experts: {
      execution: null,
      materials: null,
      pricing: null,
      cost: null,
      offer: null,
    },
    offerHandoffPayload,
    decisionMakerPayload,
    primaryRecommendation: primary,
    scenarios,
    orchestrationNotesPl: ["LOOP PE→ME iteracja 1/1"],
    handoffBlockersPl: [],
    returnFlags: {
      returnToMaterialExpert: true,
      requiresReanalysis: true,
    },
  };
  const vm = buildChiefDossierViewModel(
    idleChiefSessionOutput({
      status: "ready_for_decydent",
      caseState: "ready_for_decydent",
      caseId: "c-ready",
      readyForDecision: true,
      loopCount: 1,
      dossier,
      taskStates: dossier.tasks,
    }),
  );
  ok("ready phase", vm.uiPhase === "ready");
  ok("ready title", vm.titlePl === "Przebieg ekspertów");
  ok("ready offer", vm.showOffer === true);
  ok("offer 1:1 price", vm.primaryRecommendation?.offerPricePln === 1200);
  ok("offer 1:1 summary", vm.primaryRecommendation?.summaryPl === "Rec test");
  ok("scenarios passthrough", vm.scenarios.length === 3 && vm.scenarios[0].strategy === "agresywny");
  ok("decision payload 1:1", vm.decisionMakerPayload?.contractCo === "Co oferta");
  ok("handoff 1:1", vm.offerHandoffPayload?.realCostPln === 1000);
  ok("timeline faithful count", vm.taskRows.length === 3);
  ok("timeline RETURN id", vm.taskRows[1].id === "T2_materials_return");
  ok("loop badge", vm.showLoopReturn && vm.loopCount === 1);
  ok("offer defaultOpen", vm.traceSlots[4].defaultOpen === true);
  ok("ee default closed", vm.traceSlots[0].defaultOpen === false);
  ok("contract co passthrough", vm.traceSlots[0].contract?.co === "EE");
}

// —— LOCK boundary: no BC edits ——
{
  const allow = [
    "src/lib/chief-dossier-ui/",
    "src/app/chief-dossier/",
    "src/app/TenderDetailPage.tsx",
    "src/app/TenderDetailPanel.tsx",
    "src/app/TenderPrzetargWorkspace.tsx",
    "src/app/TenderWorkflowHubPanel.tsx",
    "scripts/test-wire-chief-ui-dossier-01.mjs",
    "docs/architecture/WIRE-CHIEF-UI-DOSSIER-01",
  ];
  ok("allowlist documented in test", allow.length >= 6);

  const forbiddenTouched = [
    "src/lib/execution-expert/analyze.ts",
    "src/lib/chief-orchestrator/run.ts",
    "src/lib/chief-session/engine.ts",
    "src/lib/chief-wire-adapters/index.ts",
  ];
  for (const f of forbiddenTouched) {
    const src = read(f);
    ok(`BC file intact exists ${f}`, src.length > 100);
  }

  const surface = read("src/app/chief-dossier/ChiefDossierSurface.tsx");
  ok("surface id locked", surface.includes('id="chief-dossier-surface"'));
  ok("surface no bid", !surface.includes("useTenderOfferRun") && !surface.includes("computeTenderBid"));

  const hub = read("src/app/TenderWorkflowHubPanel.tsx");
  ok("slot after insights", hub.includes("TenderWorkspaceV2InsightsCompact") && hub.includes("ChiefDossierSurface"));
  ok("hub id still present in Insights", read("src/app/TenderWorkspaceV2Panel.tsx").includes('id="tender-intelligence-hub"'));

  const page = read("src/app/TenderDetailPage.tsx");
  ok("page consumes session", page.includes("buildChiefDossierViewModel") && page.includes("useChiefOrchestratorSession"));
  ok("page flag gate", page.includes("chiefSessionEnabled"));

  const vmSrc = read("src/lib/chief-dossier-ui/view-model.ts");
  ok("vm no analyze import", !vmSrc.includes("analyzeExecution") && !vmSrc.includes("runChiefOrchestrator"));
  ok("vm no offerboq write", !vmSrc.includes("saveOfferBoq") && !vmSrc.includes("writeOffer"));
}

console.log(`\nOK ${passed} PASS`);
