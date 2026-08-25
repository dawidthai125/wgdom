/**
 * IK Analysis Surface — presentation contract smoke (no runtime engines).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let failed = 0;
function ok(name, cond) {
  if (cond) console.log(`PASS ${name}`);
  else {
    console.error(`FAIL ${name}`);
    failed += 1;
  }
}

const surface = read("src/app/intelligent-estimator/IkAnalysisSurface.tsx");
const detail = read("src/app/TenderDetailPage.tsx");
const host = read("src/app/intelligent-estimator/IkEntryHost.tsx");
const modal = read("src/app/ui/WgModalFrame.tsx");
const bridge = read("src/app/intelligent-estimator/IkOrchestraPageBridge.tsx");

ok("surface reuses WgModalFrame", /WgModalFrame/.test(surface));
ok("surface size xl", /size=\"xl\"/.test(surface));
ok("surface data marker", /data-ik-analysis-surface=\"1\"/.test(surface));
ok("no second orchestra in surface", !/useIkOrchestra/.test(surface));
ok("no Observation rebuild in surface", !/buildAnalysisObservation/.test(surface));
ok("DetailPage mounts IkEntryHost", /IkEntryHost/.test(detail));
ok("DetailPage wraps Host in IkAnalysisSurface", /IkAnalysisSurface[\s\S]*IkEntryHost|IkAnalysisSurface/.test(detail) && /IkEntryHost/.test(detail));
ok("DetailPage keeps Bridge", /IkOrchestraPageBridge/.test(detail));
ok("Host still mounts LiveViz + EC", /LiveVisualizationView/.test(host) && /ExpertConversationSurface/.test(host));
ok("WgModalFrame has xl size", /xl:/.test(modal));
ok("Bridge unchanged useIkOrchestra", /useIkOrchestra/.test(bridge));
ok("open CTA present", /data-ik-analysis-surface-open-cta/.test(detail));
ok("no F5 engine import in surface", !/computePositionCost|tender-position-cost/.test(surface));
ok("handoff slot outside body", /data-ik-analysis-handoff-slot/.test(surface));
ok("DetailPage wires handoff", /IkAnalysisHandoffStrip/.test(detail));
ok("no Phase 5 final populate in DetailPage handoff path", !/final:\s*\{[^}]*summary/.test(detail));

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS");
