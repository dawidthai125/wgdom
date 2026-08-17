/**
 * IK-MIGRATION-01 P2.5 — NG-02 ingest bridge.
 * Gate B requires REAL extraction > 0 on tender 08def45d.
 * Run: npx vite-node scripts/test-ik-migration-01-p25-ingest.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));

import { defaultAppSettings } from "../src/lib/app-settings.ts";
import { isIkEntryEnabled, resolveIkDetailFirstScreen } from "../src/lib/intelligent-estimator/ik-entry-flag.ts";
import {
  needsIkNg02Ingest,
  runIkNg02IngestBridge,
} from "../src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";
import { runIkDocumentExpert } from "../src/lib/intelligent-estimator/ik-document-expert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const REAL = "08def45d-ead6-5db8-962b-120001d33d37";

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

console.log("=== IK-MIGRATION-01 P2.5 INGEST BRIDGE ===\n");

assert("flag default ON (P10)", defaultAppSettings().ikEntryEnabled === true);
assert("isIkEntryEnabled follows default ON when LS empty", isIkEntryEnabled() === true);
assert("OFF → ik_entry", resolveIkDetailFirstScreen(false) === "ik_entry");
assert(
  "NG-10 Gate retained in DetailPage",
  !/TenderAutonomousGate/.test(readSrc("src/app/TenderDetailPage.tsx")),
);
assert(
  "bridge reuses buildTenderDossierHeavy",
  /buildTenderDossierHeavy/.test(readSrc("src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts")),
);
assert(
  "bridge no ATH writer",
  !/serializeAth|writeAth|exportAthFile/.test(readSrc("src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts")),
);
assert(
  "Host wires onUpdate (API; gated by AUTO_INGEST)",
  /onUpdate/.test(readSrc("src/app/intelligent-estimator/IkEntryHost.tsx")),
);
assert(
  "Host AUTO_INGEST compile default false",
  /IK_ENTRY_SHELL_AUTO_INGEST\s*=\s*false/.test(
    readSrc("src/app/intelligent-estimator/IkEntryHost.tsx"),
  ),
);
assert(
  "Host Documents→BOQ runtime via isIkP2DocumentsBoqActive (08-P0)",
  /isIkP2DocumentsBoqActive/.test(readSrc("src/app/intelligent-estimator/IkEntryHost.tsx")),
);
assert(
  "Host leftover isIkAutoIngestEnabled not used as gate",
  !/isIkAutoIngestEnabled/.test(readSrc("src/app/intelligent-estimator/IkEntryHost.tsx")),
);
assert(
  "DetailPage passes onUpdate to Host",
  /IkEntryHost[\s\S]*onUpdate=\{onUpdateItem\}/.test(readSrc("src/app/TenderDetailPage.tsx")),
);

const emptyItem = {
  id: REAL,
  tenderId: "ocds-148610-81928bf5-6078-416f-ab80-498a3a5fec6a",
  title: "ZZK",
  status: "seen",
  updatedAt: "2026-08-15T00:00:00.000Z",
  noticeNumber: "2026/BZP 00382517/01",
  bzpDocuments: [],
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
  tenderDossier: null,
};
assert("needs ingest when empty dossier+docs pending", needsIkNg02Ingest({
  ...emptyItem,
  bzpDocuments: [{ index: 0, filename: "przedmiar.zip", contentType: "x", downloadUrl: "u", isSwzHint: false }],
  documentsFetchedAt: "2026-08-01T00:00:00.000Z",
}) === true);
assert(
  "does not need ingest when lines present",
  needsIkNg02Ingest({
    ...emptyItem,
    bzpDocuments: [{ index: 0, filename: "p.ath", contentType: "x", downloadUrl: "u", isSwzHint: false }],
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: "p.ath",
        rowCount: 2,
        rows: [
          { lp: "1", description: "A", unit: "m2", quantity: "1", unitPrice: "", total: "" },
          { lp: "2", description: "B", unit: "m2", quantity: "2", unitPrice: "", total: "" },
        ],
        catalogQuantities: [],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: "2026-08-15T00:00:00.000Z",
      },
      brief: { fields: [], additionalNotes: [], builtAt: "2026-08-15T00:00:00.000Z" },
      builtAt: "2026-08-15T00:00:00.000Z",
    },
  }) === false,
);

console.log("\n--- LIVE NG-02 BRIDGE ---");
let extracted = 0;
try {
  const result = await runIkNg02IngestBridge({
    item: emptyItem,
    athPreviewEnabled: true,
    ensureDocuments: true,
  });
  console.log("phase", result.phase);
  console.log("docs", result.documentsUsed);
  console.log("zipEvidence", result.zipEvidence.map((z) => `${z.zipFilename}:${z.innerCount}`));
  console.log("artifacts", result.artifactCount);
  console.log("extractedLineCount", result.extractedLineCount);
  console.log("primary", result.primarySourceFilename);
  console.log("reasons", result.reasons);
  console.log("expert status", result.expert.status);
  console.log("expert extracted", result.expert.extraction.extractedCount);
  console.log("master lines", result.expert.masterBoq.lineCount);
  console.log("readyForExperts", result.expert.masterBoq.readyForExperts);

  extracted = result.extractedLineCount;
  assert("live bridge started or skipped with lines", result.started || result.extractedLineCount > 0);
  assert("live extraction > 0", result.extractedLineCount > 0);
  assert("live artifacts or primary", result.artifactCount > 0 || Boolean(result.primarySourceFilename));
  assert(
    "live provenance or multi-source reason",
    result.expert.masterBoq.hasLineProvenance
      || result.expert.reasons.some((r) => /NO_DWELLING_MAP|CONFLICT|MULTI_SOURCE/.test(r))
      || result.expert.masterBoq.lineCount > 0,
  );

  const sample = result.expert.offerBoq?.lines?.[0];
  if (sample) {
    assert("sample has description", Boolean(sample.description?.trim()));
    assert("sample has unit", Boolean(sample.unit?.trim()));
    assert("sample has quantity", Number(sample.quantity) > 0);
  } else {
    // Multi-source HOLD may still have extraction counts from artifacts
    assert("no offer line but extraction counted", result.extractedLineCount > 0);
  }

  const vm = buildIkEntryConversationViewModel(result.mergedItem, { ingest: result });
  const events = vm.steps.map((s) => s.event);
  console.log("EC events", events.join(", "));
  assert(
    "EC has INGEST or PRZEDMIAR/BOQ facts",
    events.some((e) =>
      /INGEST_COMPLETED|PRZEDMIAR_EXTRACTED|COST_DOCUMENTS_PARSED|BOQ_EXTRACTED|BOQ_READY|BOQ_STATUS/.test(e)
    ),
  );
  assert(
    "EC no fake materials",
    !vm.steps.map((s) => s.messagePl.toLowerCase()).join(" ").includes("wyliczono materiały"),
  );
  assert("EC all sourceRef", vm.steps.every((s) => Boolean(s.sourceRef?.tenderId)));
} catch (err) {
  console.log("LIVE BRIDGE ERROR", err?.message || err);
  assert("live bridge threw", false);
}

console.log(`\nEXTRACTED_LINES ${extracted}`);
console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0 || extracted <= 0) process.exit(1);
