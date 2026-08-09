/**
 * Inteligentny Kosztorysant UX — conversation VM + Hub wire + locks.
 * npx vite-node scripts/test-inteligentny-kosztorysant-ux.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { idleChiefSessionOutput } from "../src/lib/chief-session/index.ts";
import { buildChiefDossierViewModel } from "../src/lib/chief-dossier-ui/index.ts";
import {
  INTELIGENTNY_KOSZTORYSANT_AUTHOR_PL,
  INTELIGENTNY_KOSZTORYSANT_TITLE_PL,
  buildExpertConversationViewModel,
  conversationStepDelayMs,
  scaleConversationDelays,
} from "../src/lib/expert-conversation-ui/index.ts";

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

// —— Branding labels ——
ok(
  "branding title",
  INTELIGENTNY_KOSZTORYSANT_TITLE_PL === "Inteligentny Kosztorysant",
);
ok(
  "author credit",
  INTELIGENTNY_KOSZTORYSANT_AUTHOR_PL ===
    "w pełni stworzony przez Dawida Thai Thanh",
);

// —— D OFF / null dossier ⇒ conversation invisible ——
{
  const hidden = buildExpertConversationViewModel(null);
  ok("D OFF / null ⇒ not visible", hidden.visible === false);
  ok("D OFF / null ⇒ zero steps", hidden.steps.length === 0);
}

{
  const idle = buildExpertConversationViewModel(
    buildChiefDossierViewModel(idleChiefSessionOutput()),
  );
  ok("idle dossier ⇒ visible (Session stack present)", idle.visible === true);
  ok("idle has chief_start", idle.steps[0]?.id === "chief_start");
  ok(
    "order EE→ME→PE→Cost→Offer",
    idle.steps.map((s) => s.id).join(",") ===
      "chief_start,execution,materials,pricing,cost,offer,chief_final",
  );
}

// —— Ready dossier mapping from real Trace co ——
{
  const readyLike = {
    ...buildChiefDossierViewModel(idleChiefSessionOutput()),
    uiPhase: "ready",
    sessionStatus: "ready_for_decydent",
    sessionStatusLabelPl: "Gotowe dla Decydenta",
    caseStatus: "ready_for_decydent",
    caseStatusLabelPl: "Gotowy dla Decydenta",
    emptyMessagePl: null,
    showTraces: true,
    showTimeline: true,
    showOffer: true,
    taskRows: [
      {
        id: "T1_execution",
        labelPl: "T1",
        status: "done",
        statusLabelPl: "Gotowe",
        statusColor: "success",
        statusIconKey: "taskDone",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
      {
        id: "T2_materials",
        labelPl: "T2",
        status: "done",
        statusLabelPl: "Gotowe",
        statusColor: "success",
        statusIconKey: "taskDone",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
      {
        id: "T3_pricing",
        labelPl: "T3",
        status: "done",
        statusLabelPl: "Gotowe",
        statusColor: "success",
        statusIconKey: "taskDone",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
      {
        id: "T4_cost",
        labelPl: "T4",
        status: "done",
        statusLabelPl: "Gotowe",
        statusColor: "success",
        statusIconKey: "taskDone",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
      {
        id: "T5_offer",
        labelPl: "T5",
        status: "done",
        statusLabelPl: "Gotowe",
        statusColor: "success",
        statusIconKey: "taskDone",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
    ],
    traceSlots: [
      {
        role: "execution",
        roleLabelPl: "Wykonanie",
        iconKey: "hammer",
        contract: {
          co: "REAL_EE_CO",
          dlaczego: "REAL_EE_WHY",
          naPodstawieCzego: "boq",
          pewnosc: "high",
          pewnoscLabelPl: "Wysoka",
          blokery: [],
          zgodnosc: "aligned",
          zgodnoscLabelPl: "Zgodne",
          zgodnoscOpisPl: "",
        },
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "materials",
        roleLabelPl: "Materiały",
        iconKey: "package",
        contract: {
          co: "REAL_ME_CO",
          dlaczego: "",
          naPodstawieCzego: "ee",
          pewnosc: "medium",
          pewnoscLabelPl: "Średnia",
          blokery: [],
          zgodnosc: "aligned",
          zgodnoscLabelPl: "Zgodne",
          zgodnoscOpisPl: "",
        },
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "pricing",
        roleLabelPl: "Ceny",
        iconKey: "trending",
        contract: {
          co: "REAL_PE_CO",
          dlaczego: "",
          naPodstawieCzego: "me",
          pewnosc: "medium",
          pewnoscLabelPl: "Średnia",
          blokery: [],
          zgodnosc: "aligned",
          zgodnoscLabelPl: "Zgodne",
          zgodnoscOpisPl: "",
        },
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "cost",
        roleLabelPl: "Koszt",
        iconKey: "calculator",
        contract: {
          co: "REAL_COST_CO",
          dlaczego: "",
          naPodstawieCzego: "pe",
          pewnosc: "high",
          pewnoscLabelPl: "Wysoka",
          blokery: [],
          zgodnosc: "aligned",
          zgodnoscLabelPl: "Zgodne",
          zgodnoscOpisPl: "",
        },
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "offer",
        roleLabelPl: "Oferta",
        iconKey: "badge",
        contract: {
          co: "REAL_OFFER_CO",
          dlaczego: "",
          naPodstawieCzego: "cost",
          pewnosc: "high",
          pewnoscLabelPl: "Wysoka",
          blokery: [],
          zgodnosc: "aligned",
          zgodnoscLabelPl: "Zgodne",
          zgodnoscOpisPl: "",
        },
        emptyLabelPl: "Brak wyniku",
        defaultOpen: true,
      },
    ],
    primaryRecommendation: {
      strategy: "balanced",
      offerPricePln: 12345,
      summaryPl: "ok",
      breakdown: {
        materialsPurchasePln: 1,
        labourPln: 1,
        equipmentPln: 0,
        auxiliaryPln: 0,
        riskBufferPln: 0,
        marginPln: 0,
        offerPricePln: 12345,
      },
    },
    blockersPl: [],
    orchestrationNotesPl: ["G-EE PASS", "G-OFFER PASS"],
    readyForDecision: true,
  };

  const vm = buildExpertConversationViewModel(readyLike);
  ok("ready visible", vm.visible === true);
  ok("readyForDecision", vm.readyForDecision === true);
  ok("maps EE co", vm.steps.find((s) => s.id === "execution")?.messagePl === "REAL_EE_CO");
  ok("maps ME co", vm.steps.find((s) => s.id === "materials")?.messagePl === "REAL_ME_CO");
  ok("maps PE co", vm.steps.find((s) => s.id === "pricing")?.messagePl === "REAL_PE_CO");
  ok("maps Cost co", vm.steps.find((s) => s.id === "cost")?.messagePl === "REAL_COST_CO");
  ok("maps Offer co", vm.steps.find((s) => s.id === "offer")?.messagePl === "REAL_OFFER_CO");
  ok(
    "offer PLN passthrough",
    vm.steps.find((s) => s.id === "offer")?.offerPricePln === 12345,
  );
  ok(
    "no fake LLM fluff in EE",
    !/Analizuję zakres/i.test(vm.steps.find((s) => s.id === "execution")?.messagePl ?? ""),
  );
  ok(
    "EE detail from dlaczego",
    vm.steps.find((s) => s.id === "execution")?.detailPl === "REAL_EE_WHY",
  );
  ok(
    "all experts done",
    ["execution", "materials", "pricing", "cost", "offer"].every(
      (id) => vm.steps.find((s) => s.id === id)?.status === "done",
    ),
  );
}

// —— Blocked / skipped ——
{
  const blocked = {
    ...buildChiefDossierViewModel(idleChiefSessionOutput()),
    uiPhase: "blocked",
    emptyMessagePl: "Zablokowano",
    blockersPl: ["G-EE FAIL"],
    taskRows: [
      {
        id: "T1_execution",
        labelPl: "T1",
        status: "failed",
        statusLabelPl: "Błąd",
        statusColor: "destructive",
        statusIconKey: "taskFailed",
        failReasonPl: "G-EE FAIL: test",
        startedAt: null,
        finishedAt: null,
      },
      {
        id: "T2_materials",
        labelPl: "T2",
        status: "skipped",
        statusLabelPl: "Pominięte",
        statusColor: "muted",
        statusIconKey: "taskSkipped",
        failReasonPl: null,
        startedAt: null,
        finishedAt: null,
      },
    ],
    traceSlots: [
      {
        role: "execution",
        roleLabelPl: "Wykonanie",
        iconKey: "hammer",
        contract: null,
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "materials",
        roleLabelPl: "Materiały",
        iconKey: "package",
        contract: null,
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "pricing",
        roleLabelPl: "Ceny",
        iconKey: "trending",
        contract: null,
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "cost",
        roleLabelPl: "Koszt",
        iconKey: "calculator",
        contract: null,
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
      {
        role: "offer",
        roleLabelPl: "Oferta",
        iconKey: "badge",
        contract: null,
        emptyLabelPl: "Brak wyniku",
        defaultOpen: false,
      },
    ],
    primaryRecommendation: null,
  };
  const vm = buildExpertConversationViewModel(blocked);
  ok("blocked hasBlocked", vm.hasBlocked === true);
  ok(
    "EE blocked status",
    vm.steps.find((s) => s.id === "execution")?.status === "blocked",
  );
  ok(
    "EE failReason message",
    vm.steps.find((s) => s.id === "execution")?.messagePl === "G-EE FAIL: test",
  );
  ok(
    "ME skipped",
    vm.steps.find((s) => s.id === "materials")?.status === "skipped",
  );
}

// —— Timing clamps ——
{
  const d = conversationStepDelayMs(10, "normal");
  ok("normal delay in range", d >= 350 && d <= 600);
  const scaled = scaleConversationDelays([1000, 1000, 1000, 1000, 1000, 1000, 1000], "normal");
  const sum = scaled.reduce((a, b) => a + b, 0);
  ok("scaled total ≤ 4000", sum <= 4000);
  ok("min delay ≥ 80 after scale", scaled.every((x) => x >= 80));
}

// —— Hub wire / selectors / KEEP Trace ——
{
  const hub = read("src/app/TenderWorkflowHubPanel.tsx");
  ok("Hub imports brand", hub.includes("InteligentnyKosztorysantBrand"));
  ok("Hub imports conversation", hub.includes("ExpertConversationSurface"));
  ok("Hub KEEP ChiefDossierSurface", hub.includes("ChiefDossierSurface"));
  ok("Hub KEEP DecisionWorkspaceHost", hub.includes("DecisionWorkspaceHost"));
  ok(
    "Conversation before Trace in eksperci JSX",
    (() => {
      const eksperci = hub.slice(hub.indexOf('data-s4-step="eksperci"'));
      return (
        eksperci.indexOf("<ExpertConversationSurface") >= 0 &&
        eksperci.indexOf("<ChiefDossierSurface") >
          eksperci.indexOf("<ExpertConversationSurface")
      );
    })(),
  );
}

{
  const brand = read("src/app/expert-conversation/InteligentnyKosztorysantBrand.tsx");
  ok("brand data attr title", brand.includes("data-inteligentny-kosztorysant-title"));
  ok("brand data attr author", brand.includes("data-inteligentny-kosztorysant-author"));
  ok("brand uses SSOT title const", brand.includes("INTELIGENTNY_KOSZTORYSANT_TITLE_PL"));
}

{
  const surface = read("src/app/expert-conversation/ExpertConversationSurface.tsx");
  ok("skip control", surface.includes("data-expert-conversation-skip"));
  ok("continue control", surface.includes("data-expert-conversation-continue"));
  ok("reduced motion", surface.includes("prefersReducedMotion"));
  ok("no engine sleep 5s", !/setTimeout\(\s*[^,]*,\s*5\d{3}/.test(surface));
  ok("scroll to decision", surface.includes("decision-workspace-surface"));
}

{
  const vmSrc = read("src/lib/expert-conversation-ui/view-model.ts");
  ok("VM from ChiefDossierViewModel", vmSrc.includes("ChiefDossierViewModel"));
  ok("no analyzeExecution", !vmSrc.includes("analyzeExecution"));
  ok("no runChief", !vmSrc.includes("runChiefOrchestrator"));
  ok("no recordDecision", !vmSrc.includes("recordDecision"));
}

// —— No new flag / store / PLN ——
{
  const all = [
    read("src/lib/expert-conversation-ui/view-model.ts"),
    read("src/lib/expert-conversation-ui/types.ts"),
    read("src/app/expert-conversation/ExpertConversationSurface.tsx"),
    read("src/app/TenderWorkflowHubPanel.tsx"),
  ].join("\n");
  ok("no new kw- store", !/kw-expert-conversation|kw-inteligentny/.test(all));
  ok("no new AppSettings field", !/inteligentnyKosztorysantEnabled|expertConversationEnabled/.test(all));
  ok("no third PLN invent", !/thirdPln|primaryPlnSsot/.test(all));
}

// —— Protected WIP untouched in this feature (source presence only) ——
{
  ok(
    "useTenderOfferRun not imported by UX",
    !read("src/app/TenderWorkflowHubPanel.tsx").includes("useTenderOfferRun"),
  );
  ok(
    "bid-time-load-guard not imported",
    !read("src/lib/expert-conversation-ui/view-model.ts").includes("bid-time-load-guard"),
  );
}

console.log(`\n=== Inteligentny Kosztorysant UX: ${passed} PASS ===`);
