/**
 * W3 CONNECT — Chief.start → Orchestra snapshot seam (CONNECT-only).
 * Run: npx vite-node scripts/test-ik-w3-chief-orchestra-connect.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chiefSessionDelegatesIkToOrchestra,
  resolveW3ChiefOrchestraConnect,
} from "../src/lib/intelligent-estimator/orchestra/chief-start-orchestra-connect.ts";
import {
  createChiefSessionEngine,
  idleChiefSessionOutput,
} from "../src/lib/chief-session/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// —— Pure resolver ——
const idle = resolveW3ChiefOrchestraConnect({
  ikEntryOn: false,
  chiefStartDelegatedToOrchestra: false,
  chiefSession: idleChiefSessionOutput(),
  orchestraSnapshot: null,
});
ok("idle when IK off", idle.status === "idle" && idle.ikSequencer === null);
ok("T1–T4 LEGACY-PARALLEL flag always true", idle.chiefTasksLegacyParallel === true);

const delegated = resolveW3ChiefOrchestraConnect({
  ikEntryOn: true,
  chiefStartDelegatedToOrchestra: true,
  chiefSession: idleChiefSessionOutput({
    status: "running",
    caseId: "chief:t-w3:1",
    requestId: 3,
    ikSequencerDelegation: "orchestra",
  }),
  orchestraSnapshot: null,
});
ok("delegated without snapshot", delegated.status === "delegated");
ok("delegated sequencer=orchestra", delegated.ikSequencer === "orchestra");
ok("delegated not attached", delegated.orchestraAttached === false);

const connected = resolveW3ChiefOrchestraConnect({
  ikEntryOn: true,
  chiefStartDelegatedToOrchestra: true,
  chiefSession: idleChiefSessionOutput({
    status: "ready_for_decydent",
    caseId: "chief:t-w3:2",
    requestId: 4,
    ikSequencerDelegation: "orchestra",
  }),
  // minimal non-null stand-in — resolver only checks presence
  orchestraSnapshot: { flags: {} },
});
ok("connected with snapshot", connected.status === "connected");
ok("connected attached", connected.orchestraAttached === true);
ok(
  "helper reads stamp",
  chiefSessionDelegatesIkToOrchestra(
    idleChiefSessionOutput({ ikSequencerDelegation: "orchestra" }),
  ) === true,
);
ok(
  "helper null stamp",
  chiefSessionDelegatesIkToOrchestra(idleChiefSessionOutput()) === false,
);

// —— Engine stamps delegation without changing run() ——
function stubChiefResult(caseId) {
  return {
    caseId,
    status: "ready_for_decydent",
    tasks: [],
    loopCount: 0,
    experts: {},
    dossier: { caseId },
  };
}

function stubRuntimeRo() {
  return {
    readyForChiefInput: true,
    offerBoq: { recomputeToken: "tok" },
    pricing: {},
    company: {},
    offerStrategy: {},
    meta: { sources: {} },
  };
}

let ran = 0;
const engine = createChiefSessionEngine({
  isEnabled: () => true,
  schedule: (fn) => fn(),
  run: (input) => {
    ran += 1;
    return stubChiefResult(input.caseId);
  },
});

const started = engine.start({
  caseId: "chief:t-w3-engine",
  pricingReady: true,
  ikSequencerDelegation: "orchestra",
  runtimeRo: stubRuntimeRo(),
});
ok("engine start accepted", started === true);
ok("engine invoked LEGACY run once", ran === 1);
ok(
  "engine stamped orchestra delegation",
  engine.getSnapshot().ikSequencerDelegation === "orchestra",
);

const engineNoIk = createChiefSessionEngine({
  isEnabled: () => true,
  schedule: (fn) => fn(),
  run: (input) => stubChiefResult(input.caseId),
});
engineNoIk.start({
  caseId: "chief:t-w3-no-ik",
  pricingReady: true,
  runtimeRo: stubRuntimeRo(),
});
ok(
  "no stamp without delegation",
  engineNoIk.getSnapshot().ikSequencerDelegation === null,
);

// —— Static seam: no second orchestrator / page wires CONNECT ——
const pageSrc = readSrc("src/app/TenderDetailPage.tsx");
const hookSrc = readSrc("src/app/hooks/useChiefOrchestratorSession.ts");
const connectSrc = readSrc(
  "src/lib/intelligent-estimator/orchestra/chief-start-orchestra-connect.ts",
);
const runSrc = readSrc("src/lib/chief-orchestrator/run.ts");

ok("page resolves W3 connect", pageSrc.includes("resolveW3ChiefOrchestraConnect"));
ok(
  "page delegates under ikEntryOn",
  pageSrc.includes("delegateIkSequencingToOrchestra: ikEntryOn"),
);
ok("page keeps IkOrchestraPageBridge", pageSrc.includes("IkOrchestraPageBridge"));
ok("page keeps Host orchestra consumption", pageSrc.includes("orchestra={ikOrchestraSnapshot}"));
ok("hook accepts delegate flag", hookSrc.includes("delegateIkSequencingToOrchestra"));
ok(
  "connect declares LEGACY-PARALLEL lock",
  connectSrc.includes("chiefTasksLegacyParallel"),
);
ok(
  "connect forbids second sequencer claim",
  connectSrc.includes("ONLY IK sequencer") || connectSrc.includes("LEGACY-PARALLEL"),
);
ok(
  "runChiefOrchestrator file still present (T1–T4 not deleted)",
  /T1|task|runChiefOrchestrator/.test(runSrc) && runSrc.length > 100,
);
ok("no new OrchestraEngine class in connect", !/class\s+OrchestraEngine/.test(connectSrc));

console.log(`\nW3 CONNECT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
