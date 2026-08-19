/**
 * IK-KNR-EXPERT Slice A — catalogBasis evidence passthrough (T-SRC-1…4 + companions).
 *
 * npx vite-node scripts/test-ik-knr-expert-slice-a.mjs
 *
 * ZERO settings write · ZERO KV · ZERO Research HTTP · ZERO A08-P3.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  athPreviewToSnapshot,
  buildCatalogBasisFromRawCode,
  ensureKosztorysCatalogQuantities,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  composeDwellingOfferBoq,
  mergeDwellingArtifactLines,
} from "../src/lib/multi-boq/index.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

function previewRow(opts) {
  return {
    lp: opts.lp ?? "6",
    code: opts.code ?? "",
    description: opts.description ?? "Skasowanie wykwitów i zacieków",
    unit: opts.unit ?? "m2",
    quantity: opts.quantity ?? "12,5",
    unitPrice: "",
    total: "",
  };
}

function makePreview(row) {
  return {
    ok: true,
    format: "text",
    rows: [row],
    categories: [],
    warnings: [],
    summaryLines: [],
  };
}

function mergeCompose(snapshot, tenderId = "tender-slice-a") {
  const merged = mergeDwellingArtifactLines([
    {
      documentId: "doc-mops-6",
      artifactId: "art-mops-6",
      filename: "Miernicza_15_7_modernizacja PRZEDMIAR.pdf",
      branchHint: "unknown",
      snapshot,
    },
  ]);
  const dwellingSnap = {
    tenderId,
    dwellingId: "d1",
    sourceDocumentIds: ["doc-mops-6"],
    sourceArtifactIds: ["art-mops-6"],
    lines: merged.lines,
    completeness: merged.completeness,
    warnings: merged.warnings,
  };
  const composed = composeDwellingOfferBoq({ snapshot: dwellingSnap, builtAt: "2026-08-18T00:00:00.000Z" });
  return { merged, dwellingSnap, composed };
}

const DESC = "Skasowanie wykwitów i zacieków";
const CODE = "KNR 4-01 1202-07";

console.log("=== IK-KNR-EXPERT SLICE A ===\n");

const basisDirect = buildCatalogBasisFromRawCode(CODE);
assert("builder family KNR", basisDirect?.family === "KNR");
assert("builder catalogId 4-01", basisDirect?.catalogId === "4-01");
assert("builder tableCode 1202-07", basisDirect?.tableCode === "1202-07");
assert("builder rawCode as-is", basisDirect?.rawCode === CODE);
assert("builder empty → null", buildCatalogBasisFromRawCode("") === null);
assert(
  "builder does not read description",
  buildCatalogBasisFromRawCode("KNR 4-01")?.tableCode == null,
);

const withCode = athPreviewToSnapshot(makePreview(previewRow({ code: CODE, description: DESC })), "mops.pdf");
const withoutCode = athPreviewToSnapshot(makePreview(previewRow({ code: "", description: DESC })), "mops.pdf");

assert(
  "T-SRC-1 qty catalogBasis from AthPreviewRow.code",
  withCode.catalogQuantities?.[0]?.catalogBasis?.rawCode === CODE,
  withCode.catalogQuantities?.[0]?.catalogBasis,
);
assert(
  "T-SRC-1 rows catalogBasis + code",
  withCode.rows[0]?.code === CODE && withCode.rows[0]?.catalogBasis?.rawCode === CODE,
);
assert(
  "T-SRC-1 description not concatenated",
  withCode.catalogQuantities?.[0]?.description === DESC && withCode.rows[0]?.description === DESC,
);

const rebuilt = ensureKosztorysCatalogQuantities({
  ...withCode,
  catalogQuantities: [],
});
assert(
  "T-SRC-1 ensureKosztorysCatalogQuantities preserves catalogBasis",
  rebuilt.catalogQuantities?.[0]?.catalogBasis?.rawCode === CODE,
  rebuilt.catalogQuantities?.[0]?.catalogBasis,
);

const pathWith = mergeCompose(withCode);
const pathWithout = mergeCompose(withoutCode);

assert("merge ready with code", pathWith.merged.completeness === "ready");
assert("merge ready without code", pathWithout.merged.completeness === "ready");
assert(
  "T-SRC-2 dwelling catalogBasis",
  pathWith.merged.lines[0]?.catalogBasis?.rawCode === CODE,
);
assert("T-SRC-2 compose ok", pathWith.composed.ok === true);
const offerWith = pathWith.composed.ok ? pathWith.composed.document.lines[0] : null;
const offerWithout = pathWithout.composed.ok ? pathWithout.composed.document.lines[0] : null;
assert("T-SRC-2 Master BOQ catalogBasis", offerWith?.catalogBasis?.rawCode === CODE);
assert(
  "T-SRC-2 provenance catalogBasis",
  pathWith.composed.ok
    && pathWith.composed.lineProvenance[offerWith.lineId]?.catalogBasis?.rawCode === CODE,
);

assert("T-SRC-3 legacy no catalogBasis still composes", pathWithout.composed.ok === true);
assert("T-SRC-3 legacy catalogBasis absent/null", !offerWithout?.catalogBasis?.rawCode);

assert("T-SRC-4 catalogWorkId with = null", offerWith?.catalogWorkId === null);
assert("T-SRC-4 catalogWorkId without = null", offerWithout?.catalogWorkId === null);
assert("T-SRC-4 knrHint unchanged", offerWith?.knrHint === offerWithout?.knrHint);
assert(
  "T-SRC-4 knrHint not from catalogBasis",
  offerWith?.knrHint !== CODE && offerWith?.knrHint !== offerWith?.catalogBasis?.display,
);
assert("T-SRC-4 description unchanged", offerWith?.description === DESC && offerWithout?.description === DESC);
assert(
  "T-SRC-4 contentHash unchanged",
  pathWith.merged.lines[0]?.contentHash === pathWithout.merged.lines[0]?.contentHash,
);
assert(
  "T-SRC-4 sourceLineKey unchanged",
  pathWith.merged.lines[0]?.sourceLineKey === pathWithout.merged.lines[0]?.sourceLineKey,
);

const a1With = classifyEstimatorPricingPlane({
  workId: offerWith?.catalogWorkId ?? null,
  materialKey: null,
  namePl: offerWith?.description ?? "",
  unit: offerWith?.unit ?? "",
});
const a1Without = classifyEstimatorPricingPlane({
  workId: offerWithout?.catalogWorkId ?? null,
  materialKey: null,
  namePl: offerWithout?.description ?? "",
  unit: offerWithout?.unit ?? "",
});
assert("T-A1 plane unchanged", a1With.plane === a1Without.plane);
assert("T-A1 UNKNOWN without Owner HIT", a1With.plane === "UNKNOWN");

const mapCtx = { works: [], mappedAt: "2026-08-18T00:00:00.000Z", cenyMaterialowUplift: false };
const mappedWith = mapOfferBoqLine(offerWith, mapCtx);
const mappedWithout = mapOfferBoqLine(offerWithout, mapCtx);
assert("T-P5 mapped catalogWorkId baseline", mappedWith.catalogWorkId === mappedWithout.catalogWorkId);
assert("T-P5 mapped knrHint baseline", mappedWith.knrHint === mappedWithout.knrHint);
assert(
  "T-P5 mapper still ignores catalogBasis for identity",
  mappedWith.catalogWorkId === offerWith.catalogWorkId,
);

const mappingSrc = readSrc("src/lib/tender-offer-boq-mapping.ts");
assert("T-P5P6P7P8 mapper still keys knrHint", /normalizeKnrKey\(line\.knrHint\)/.test(mappingSrc));
assert("T-P5P6P7P8 mapper does not read catalogBasis", !/line\.catalogBasis/.test(mappingSrc));
assert(
  "T-P5P6P7P8 classification-gate untouched by catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/classification-gate.ts")),
);
assert(
  "T-P5P6P7P8 ik-classification untouched by catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-classification.ts")),
);
assert(
  "T-P5P6P7P8 labor expert not in Slice A",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts")),
);
assert(
  "T-P5P6P7P8 material expert not in Slice A",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-material-expert.ts")),
);

const settingsSrc = readSrc("src/lib/app-settings.ts");
assert("T-FLAG no ikKnrEnabled", !/\bikKnrEnabled\b/.test(settingsSrc));
assert("T-FLAG no knrExpertEnabled", !/\bknrExpertEnabled\b/.test(settingsSrc));
assert("T-FLAG no ikRoomEnabled", !/\bikRoomEnabled\b/.test(settingsSrc));
assert("T-FLAG no expertConversationEnabled", !/\bexpertConversationEnabled\b/.test(settingsSrc));

console.log(`\n=== ${fail === 0 ? "PASS" : "FAIL"} ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
