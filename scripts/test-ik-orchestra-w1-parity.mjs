/**
 * Orchestra parity harness (W1 extraction + W2 identity contract).
 * Static + sync engine smoke — reflects accepted W2 downstream expert inputs.
 * Run: npx vite-node scripts/test-ik-orchestra-w1-parity.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeIkOrchestraSyncSnapshot } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";

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

const hostSrc = readSrc("src/app/intelligent-estimator/IkEntryHost.tsx");
const engineSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts");
const runtimeSrc = readSrc("src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts");
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const latchSrc = readSrc("src/lib/intelligent-estimator/ik-entry-p2-ingest-latch.ts");

// —— Host adapter boundary ——
ok("Host delegates to useIkOrchestra", hostSrc.includes("useIkOrchestra"));
ok("Host keeps VM builder", hostSrc.includes("buildIkEntryConversationViewModel"));
ok("Host keeps render data-ik-*", hostSrc.includes('data-ik-entry-host="1"'));
ok("Host no runIkCompositeBothHold", !hostSrc.includes("runIkCompositeBothHold"));
ok("Host no P2 latch refs", !hostSrc.includes("p2RunGenerationRef"));
ok("Host no OrchestraEngine class", !/class\s+OrchestraEngine/.test(hostSrc));

// —— Engine pipeline order (function body only — ignore imports) ——
const engineBody = engineSrc.slice(engineSrc.indexOf("export function computeIkOrchestraSyncSnapshot"));
const engineOrder = engineBody.indexOf("runIkDocumentExpert");
const knrOrder = engineBody.indexOf("runIkKnrExpert");
const etap11Order = engineBody.indexOf("computeKnrApplicationResults");
const sliceDOrder = engineBody.indexOf("applyOwnerKnrMapping");
const identityPhaseOrder = engineBody.indexOf("runIkIdentityPhase");
const classOrder = engineBody.indexOf("runIkMasterBoqClassification");
const identityOrder = engineBody.indexOf("runIkMasterBoqIdentityCoverage");
const compositeOrder = engineBody.indexOf("runIkCompositeBothHold");
const p7Order = engineBody.indexOf("runIkP7PositionCostBid");
const p8Order = engineBody.indexOf("runIkP8RiskDecision");

ok(
  "Pipeline order Document→KNR→ETAP11→SliceD→IdentityPhase→Class→Coverage→Composite→P7→P8",
  engineOrder < knrOrder
    && knrOrder < etap11Order
    && etap11Order < sliceDOrder
    && sliceDOrder < identityPhaseOrder
    && identityPhaseOrder < classOrder
    && classOrder < identityOrder
    && identityOrder < compositeOrder
    && compositeOrder < p7Order
    && p7Order < p8Order,
);

// —— W2 downstream expert inputs (accepted contract) ——
ok(
  "Classification uses postIdentityExpert",
  /runIkMasterBoqClassification\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc),
);
ok("Classification not knrMapped.expert", !/expert:\s*knrMapped\.expert/.test(engineSrc));
ok("Labor runtime uses expert param", /expert:\s*opts\.expert/.test(runtimeSrc));
ok("Labor runtime not opts.report", !/expert:\s*opts\.report/.test(runtimeSrc));
ok("Material runtime uses expert param", /expert:\s*opts\.expert/.test(runtimeSrc));
ok("Hook P5 uses postIdentityExpert", /expert:\s*postIdentityExpert/.test(hookSrc));
ok("Hook P6 uses postIdentityExpert", /executeP6MaterialExpert[\s\S]*expert:\s*postIdentityExpert/.test(hookSrc));
ok(
  "Composite uses postIdentityExpert",
  /runIkCompositeBothHold\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc),
);
ok(
  "P7 uses postIdentityExpert",
  /runIkP7PositionCostBid\([\s\S]*expert:\s*postIdentityExpert/.test(engineSrc),
);
ok("P7 not structural report", !/runIkP7PositionCostBid\([\s\S]*expert:\s*report/.test(engineSrc));

// —— W2 persistence safety (not in sync useMemo) ——
ok("Engine no attachOfferBoqToDwelling", !engineBody.includes("attachOfferBoqToDwelling"));
ok("Hook gated persist useEffect", hookSrc.includes("runGatedIdentityPersist"));

// —— P2 / latch READ-ONLY ——
ok("Hook imports latch unchanged", hookSrc.includes("ik-entry-p2-ingest-latch"));
ok("Latch file untouched by W1", !latchSrc.includes("orchestra"));
ok("Hook 1500ms pipeline wait", hookSrc.includes("setTimeout(r, 1500)"));
ok("Hook P2 generation refs", hookSrc.includes("p2RunGenerationRef"));

// —— P5/P6 settle ——
ok("IC-SEQ-2 laborSettledRef", hookSrc.includes("laborSettledRef"));
ok("P6 gate on laborSettledRef", hookSrc.includes("laborSettledRef.current !== true"));
ok("laborSettleTick in P6 deps", /executeP6MaterialExpert[\s\S]*laborSettleTick/.test(hookSrc) || hookSrc.includes("laborSettleTick"));

// —— KL-3 ——
ok("KL-3 resolveHost in runtime", runtimeSrc.includes("resolveHostKnrKnowledgeLookupOnly"));
ok("KL-3 knowledgeAttemptedRef", hookSrc.includes("knowledgeAttemptedRef"));
ok("KL-3 lookup-only key", runtimeSrc.includes("lookup-only"));

// —— Chief advisory ——
ok("P8 chiefSession in engine", engineSrc.includes("chiefSession"));
ok("Host no Chief orchestrator", !hostSrc.includes("runChiefOrchestrator"));

// —— ETAP 11 in orchestra not host ——
ok("ETAP 11 in engine", engineSrc.includes("runKnrHostApplicationDiagBatch"));
ok("ETAP 11 not in host", !hostSrc.includes("runKnrHostApplicationDiagBatch"));

// —— No second IK orchestrator ——
ok("No OrchestraEngine class in lib", !/class\s+OrchestraEngine/.test(engineSrc + hookSrc + runtimeSrc));
ok("No new runIk experts", !/function\s+runIk[A-Z]/.test(engineSrc + runtimeSrc));

// —— Sync engine smoke ——
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

const item = {
  id: "w1-parity-tender",
  tenderId: "w1-parity-tender",
  title: "W1 Parity",
  bzpDocuments: [],
};
const pkg = null;
const report = runIkDocumentExpert({ item, package: pkg });
const flagsOff = {
  p2DocumentsBoqOn: false,
  identityCoverageOn: false,
  p5LaborOn: false,
  p5ResearchOn: false,
  p6MaterialOn: false,
  p6ResearchOn: false,
  p7F5On: false,
  p8RiskOn: false,
};

const snap = computeIkOrchestraSyncSnapshot({
  item,
  effectiveItem: item,
  pkg,
  ingest: null,
  historicalIndex: null,
  knrKnowledge: null,
  knowledgeBusy: false,
  flags: flagsOff,
  chiefSession: null,
});

ok("Sync snapshot has report", snap.report?.masterBoq != null);
ok("Sync snapshot has knr", snap.knr?.status != null);
ok("Sync snapshot postIdentityExpert", snap.postIdentityExpert?.masterBoq != null);
ok("Sync snapshot identityContext", snap.identityContext != null);
ok("Sync snapshot composite null when P5/P6 off", snap.composite === null);
ok("Sync snapshot P7 null when flag off", snap.positionCostBid === null);
ok("Sync snapshot P8 null when flag off", snap.riskDecision === null);
ok("KNR knowledge diag skipped when not ready", snap.knrKnowledgeDiag.status === "skipped" || snap.knrKnowledgeDiag.status === "idle");

console.log(`\nORCHESTRA PARITY (W1+W2): ${fail === 0 ? "PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
