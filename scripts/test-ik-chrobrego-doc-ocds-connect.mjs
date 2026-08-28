/**
 * OD-CHROBREGODOC — OCDS document fetch CONNECT (no prod KV write).
 * Run: npx vite-node scripts/test-ik-chrobrego-doc-ocds-connect.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
Object.assign(process.env, loadEnv("", process.cwd(), ""));

import {
  buildDocumentDiscoveryFetchInput,
  canRunDocumentDiscovery,
  resolveEzamowieniaDocumentsTenderId,
  runTenderDocumentDiscovery,
} from "../src/lib/tender-document-discovery.ts";
import { needsIkNg02Ingest } from "../src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts";
import { fetchTenderDocuments } from "../src/lib/tenders-bzp.ts";

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

const PIPE = "08df0363-7b22-e462-ab56-940001283cba";
const OCDS = "ocds-148610-6f859612-6631-426b-83fc-830bfec1c888";
const NOTICE = "2026/BZP 00408278/01";

const chrobregoItem = {
  id: PIPE,
  tenderId: OCDS,
  title: "Wykonanie remontu … Chrobrego 34a",
  noticeNumber: NOTICE,
  bzpNumber: "2026/BZP 00408278",
  bzpDocuments: [],
  documentsFetchedAt: null,
  noticeHtml: null,
  tenderDossier: null,
};

// —— Pure resolve ——
ok(
  "resolve prefers OCDS over pipeline UUID",
  resolveEzamowieniaDocumentsTenderId(chrobregoItem) === OCDS,
);
ok(
  "buildDocumentDiscoveryFetchInput uses OCDS",
  buildDocumentDiscoveryFetchInput(chrobregoItem)?.tenderId === OCDS,
);
ok("canRunDocumentDiscovery true for Chrobrego anchors", canRunDocumentDiscovery(chrobregoItem));
ok(
  "needsIkNg02Ingest empty attachments still false (A08-P0 T06)",
  needsIkNg02Ingest(chrobregoItem) === false,
);

// —— Source CONNECT locks ——
const bridgeSrc = readSrc("src/lib/intelligent-estimator/ik-ng02-ingest-bridge.ts");
const orchSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const discSrc = readSrc("src/lib/tender-document-discovery.ts");
ok("bridge imports resolveEzamowieniaDocumentsTenderId", /resolveEzamowieniaDocumentsTenderId/.test(bridgeSrc));
ok("bridge records DOCS_API_TENDER_ID", /DOCS_API_TENDER_ID=/.test(bridgeSrc));
ok("orchestra allows ensureDocs without needsIkNg02Ingest alone", /ensureDocs/.test(orchSrc) && /canRunDocumentDiscovery/.test(orchSrc));
ok("discovery exports resolveEzamowieniaDocumentsTenderId", /export function resolveEzamowieniaDocumentsTenderId/.test(discSrc));

// —— Live Edge READ-ONLY (no pipeline write) ——
{
  const docsUuid = await fetchTenderDocuments({ tenderId: PIPE, noticeNumber: NOTICE });
  const docsOcds = await fetchTenderDocuments({ tenderId: OCDS, noticeNumber: NOTICE });
  ok("Edge UUID+notice → 0 docs (known)", docsUuid.length === 0);
  ok("Edge OCDS+notice → 8 docs", docsOcds.length === 8, docsOcds.length);
  ok(
    "PRZEDMIAR present in OCDS listing",
    docsOcds.some((d) => /PRZEDMIAR/i.test(d.filename || "")),
  );
}

// —— Discovery SSOT patch (in-memory only · no onUpdate/cloud) ——
{
  const discovery = await runTenderDocumentDiscovery(chrobregoItem);
  ok("discovery ran", discovery.ran === true);
  ok("discovery authoritative", discovery.authoritative === true);
  ok("discovery patch bzpDocuments length 8", (discovery.patch.bzpDocuments?.length ?? 0) === 8);
  ok(
    "discovery sets documentsFetchedAt",
    typeof discovery.patch.documentsFetchedAt === "string"
      && discovery.patch.documentsFetchedAt.length > 10,
  );
  const input = buildDocumentDiscoveryFetchInput(chrobregoItem);
  ok("discovery fetch input was OCDS", input?.tenderId === OCDS);
}

console.log(
  `\nCHROBREGO DOC OCDS CONNECT: ${fail === 0 ? "PASS" : "FAIL"} (${pass} pass, ${fail} fail)`,
);
console.log("NOTE: no prod KV write · no G2 Accept · dossier heavy not executed in this harness");
process.exit(fail === 0 ? 0 : 1);
