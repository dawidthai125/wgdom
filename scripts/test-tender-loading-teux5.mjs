/**
 * TEUX-5 — Loading skeletons: module init, lista, dokumenty, BOQ, stepped parser label.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  resolveTenderParserLoadingStep,
  tenderParserSteppedLabelText,
} from "../src/app/tenders/loading/tender-loading-step-label.ts";

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

console.log("=== TEUX-5 TENDER LOADING ===\n");

const skeleton = readSrc("src/app/tenders/loading/TenderUxSkeleton.tsx");
ok("TenderUxSkeleton wraps ui/skeleton", skeleton.includes('from "@/app/components/ui/skeleton"'));
ok("TEUX5 surface bg-secondary/60", skeleton.includes("bg-secondary/60"));
ok("animate-pulse via Skeleton base", skeleton.includes("TenderUxSkeleton"));

ok("resolve fetch step", resolveTenderParserLoadingStep({ autoRunning: true }) === "fetch");
ok(
  "resolve attachments step",
  resolveTenderParserLoadingStep({ autoRunning: true, attachmentCount: 2 }) === "attachments",
);
ok(
  "resolve analysis step",
  resolveTenderParserLoadingStep({ autoRunning: true, dossierBuilding: true }) === "analysis",
);
ok("resolve null when idle", resolveTenderParserLoadingStep({}) === null);
ok(
  "stepped label format",
  tenderParserSteppedLabelText("attachments").includes("Pobieranie")
    && tenderParserSteppedLabelText("attachments").includes("Analiza"),
);

const moduleShell = readSrc("src/app/tenders/loading/TenderModuleLoadingShell.tsx");
ok("module loading data attr T1", moduleShell.includes("data-teux5-module-loading"));
ok("list loading 3 cards", moduleShell.includes("cardCount = 3"));

const listSkel = readSrc("src/app/tenders/list/TenderListCardSkeleton.tsx");
ok("list card skeleton", listSkel.includes("data-teux5-list-card-skeleton"));

const summarySkel = readSrc("src/app/tenders/loading/TenderDocumentsSummarySkeleton.tsx");
ok("docs summary skeleton T2", summarySkel.includes("data-teux5-documents-summary-skeleton"));

const attachSkel = readSrc("src/app/tenders/loading/TenderDocumentsAttachmentsSkeleton.tsx");
ok("docs attachments skeleton", attachSkel.includes("data-teux5-documents-attachments-skeleton"));

const boqSkel = readSrc("src/app/tenders/loading/TenderBoqTableSkeleton.tsx");
ok("boq skeleton 8 rows T3", boqSkel.includes("rowCount = 8") && boqSkel.includes("data-teux5-boq-skeleton"));

const stepped = readSrc("src/app/tenders/loading/TenderParserSteppedLabel.tsx");
ok("parser stepped label", stepped.includes("data-teux5-parser-stepped-label"));

const tendersModule = readSrc("src/app/tenders/TendersModule.tsx");
ok("TendersModule uses loading shell", tendersModule.includes("TenderModuleLoadingShell"));
ok("TendersModule no loading text only", !tendersModule.includes("TENDERS_MODULE_LABELS.loading"));

const tendersView = readSrc("src/app/TendersView.tsx");
ok("TendersView uses loading shell", tendersView.includes("TenderModuleLoadingShell"));
ok("TendersView no pipeline loading text", !tendersView.includes("Ładowanie pipeline przetargów"));

const docsWs = readSrc("src/app/TenderDocumentsWorkspace.tsx");
ok("documents workspace summary skeleton", docsWs.includes("TenderDocumentsSummarySkeleton"));

const attachPanel = readSrc("src/app/TenderAttachmentsPanel.tsx");
ok("attachments panel skeleton", attachPanel.includes("TenderDocumentsAttachmentsSkeleton"));
ok("attachments no scan text", !attachPanel.includes("Skanowanie załączników BZP"));

const kosztorys = readSrc("src/app/TenderKosztorysWorkspace.tsx");
ok("kosztorys boq skeleton wired", kosztorys.includes("TenderBoqTableSkeleton"));

const detailPanel = readSrc("src/app/TenderDetailPanel.tsx");
ok("detail stepped label wired", detailPanel.includes("TenderParserSteppedLabel"));
ok("detail no old autoRunning text", !detailPanel.includes("Ładowanie ogłoszenia i załączników"));

ok("global skeleton.tsx untouched", !readSrc("src/app/components/ui/skeleton.tsx").includes("TEUX5"));
ok("tokens frozen", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux5"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-workflow-primary-action.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden untouched ${p}`, !src.includes("TEUX5") && !src.includes("teux5"));
}

const cta = readSrc("src/lib/tender-workflow-primary-action.ts");
ok("CTA logic file has no TEUX-5 diff markers", !cta.includes("TenderUxSkeleton"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
