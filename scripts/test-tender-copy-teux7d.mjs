/**
 * TEUX-7d — Copy integrity: no user-facing "AI" in lista/workflow allowlist.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function readSrc(rel) {
  return readFileSync(`${ROOT}/${rel}`, "utf8");
}

function noUserFacingAi(src, label) {
  const aiWord = /\bAI\b/;
  const lines = src.split("\n");
  const hits = lines.filter((line) => {
    if (!aiWord.test(line)) return false;
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return false;
    if (line.includes("aria-hidden")) return false;
    return true;
  });
  ok(`${label} no \\bAI\\b in strings`, hits.length === 0);
}

console.log("=== TEUX-7d TENDER COPY INTEGRITY ===\n");

const guide = readSrc("src/app/GuideView.tsx");
const tendersStart = guide.indexOf('id:"tenders"');
// CI-1: slice ends at ng10-autonomous-agent (exclusive). Old end `directory`
// incorrectly included Autonomous Agent FAQ ("agentów AI") → false positive.
const ng10Start = guide.indexOf('id:"ng10-autonomous-agent"', tendersStart);
const directoryStart = guide.indexOf('id:"directory"', tendersStart);
const tendersEnd =
  ng10Start > tendersStart ? ng10Start : directoryStart > tendersStart ? directoryStart : -1;
const przetargiSection =
  tendersStart >= 0 && tendersEnd > tendersStart
    ? guide.slice(tendersStart, tendersEnd)
    : guide;
ok("GuideView Przetargi slice excludes Autonomous Agent", !przetargiSection.includes('id:"ng10-autonomous-agent"'));
ok("GuideView Przetargi FAQ — Podpowiedzi listy", przetargiSection.includes("Podpowiedzi listy (rekomendacje)"));
ok("GuideView no Komunikaty AI", !przetargiSection.includes("Komunikaty AI"));
noUserFacingAi(przetargiSection, "GuideView Przetargi section");

const tendersView = readSrc("src/app/TendersView.tsx");
ok("TendersView buildTendersListInsight import", tendersView.includes("buildTendersListInsight"));
ok("TendersView no buildTendersListAiInsight", !tendersView.includes("buildTendersListAiInsight"));
ok("TendersView listInsightClass", tendersView.includes("listInsightClass"));
ok("TendersView data-teux7d-list-insight", tendersView.includes("data-teux7d-list-insight"));
ok("TendersView no aiInsight variable", !tendersView.match(/\baiInsight\b/));
noUserFacingAi(tendersView, "TendersView");

const primaryAction = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
ok("CTA description data attr", primaryAction.includes("data-teux7d-cta-description"));
// MFS-01: description hidden on max-lg (compact first-screen); desktop lg+ keeps copy.
ok(
  "CTA description hidden on mobile (MFS-01)",
  primaryAction.includes("hidden lg:block") && primaryAction.includes("data-teux7d-cta-description"),
);
ok(
  "CTA no line-clamp-2 mobile description (MFS-01)",
  !primaryAction.includes("line-clamp-2 sm:line-clamp-1"),
);
noUserFacingAi(primaryAction, "TenderWorkflowPrimaryAction");

const listUx = readSrc("src/lib/tenders-list-ux.ts");
ok("list ux buildTendersListInsight", listUx.includes("export function buildTendersListInsight"));
ok("list ux TendersListInsight type", listUx.includes("export interface TendersListInsight"));
ok("list ux no buildTendersListAiInsight", !listUx.includes("buildTendersListAiInsight"));
ok("list insight texts no AI word", !listUx.match(/text:\s*`[^`]*\bAI\b/));

const przetargWs = readSrc("src/app/TenderPrzetargWorkspace.tsx");
noUserFacingAi(przetargWs, "TenderPrzetargWorkspace");

const filters = readSrc("src/app/tenders/list/TenderListFiltersPanel.tsx");
noUserFacingAi(filters, "TenderListFiltersPanel");

const v4tabs = readSrc("src/lib/tender-detail-routes-v4.ts");
ok("V4 tab labels no Intelligence", !v4tabs.includes('"Intelligence"'));

ok("tokens frozen — no teux7d edits", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux7d"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/App.tsx",
  "src/lib/tender-intelligence-next-action.ts",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden ${p} no teux7d`, !src.includes("teux7d"));
}

ok("strategy untouched — no teux7d in strategy hooks", !readSrc("src/app/tenders/strategy/hooks/useTendersPipeline.ts").includes("teux7d"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
