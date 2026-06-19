/**
 * TP194A — regresja naprawy mojibake w nazwach Open Nexus.
 * npx vite-node scripts/test-tender-filename-encoding-tp194a.mjs
 */
import {
  repairUtf8Mojibake,
  parseDispositionFilename,
  resolvePlatformazakupowaFilename,
} from "../src/lib/tender-filename-encoding.ts";
import { displayTenderFilename } from "../src/lib/tenders-bzp-filename.ts";
import { normalizeTenderDocumentTitle } from "../src/lib/tender-workspace-ux.ts";
import { classifyDocumentRole } from "../src/lib/tender-document-role.ts";
import { classifyCostDocumentType, discoverBestCostDocument } from "../src/lib/tender-cost-discovery.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};
const assertEq = (name, a, b) => assert(name, a === b);

/** UTF-8 bytes odczytane jako Latin-1 — ten sam wzorzec co Open Nexus CD. */
function toMojibake(utf8) {
  const bytes = new TextEncoder().encode(utf8);
  return String.fromCharCode(...bytes);
}

console.log("TP194A — filename encoding repair\n");

// TP194A-1
assertEq("TP194A-1 Załącznik", repairUtf8Mojibake(toMojibake("Załącznik")), "Załącznik");

// TP194A-2
assertEq("TP194A-2 Ogłoszenie", repairUtf8Mojibake(toMojibake("Ogłoszenie")), "Ogłoszenie");

// TP194A-3
assertEq("TP194A-3 robót", repairUtf8Mojibake(toMojibake("robót")), "robót");

// TP194A-4
const ascii = "SWZ_DZP.242.212.2026.docx";
assertEq("TP194A-4 ASCII unchanged", repairUtf8Mojibake(ascii), ascii);

// Content-Disposition path
const cd = `attachment; filename="${toMojibake("Załącznik nr 2A do SWZ_OPZ_DZP.242.212.2026.docx")}"`;
assert(
  "parseDispositionFilename repairs CD",
  parseDispositionFilename(cd).includes("Załącznik"),
);

// HTML preference when CD mojibake
const resolved = resolvePlatformazakupowaFilename({
  contentDisposition: cd,
  htmlFilename: "Załącznik nr 2A do SWZ_OPZ_DZP.242.212.2026.docx",
  htmlLabel: "Załącznik nr 2A do SWZ_OPZ_DZP.242.212.2026.docx",
});
assertEq(
  "prefer HTML over mojibake CD",
  resolved,
  "Załącznik nr 2A do SWZ_OPZ_DZP.242.212.2026.docx",
);

// Repair-only when HTML empty
const repairedOnly = resolvePlatformazakupowaFilename({
  contentDisposition: `attachment; filename="${toMojibake("Ogłoszenie o zamówieniu_nr 2026.pdf")}"`,
  htmlFilename: "",
  htmlLabel: "",
});
assert(
  "repair CD without HTML",
  repairedOnly.startsWith("Ogłoszenie o zamówieniu"),
);

// Transparent display helpers (legacy cache)
const broken = toMojibake("Załącznik nr 2H do SWZ pożarowym_DZP.pdf");
assert(
  "displayTenderFilename repairs",
  displayTenderFilename(broken).includes("pożarowym"),
);
assert(
  "normalizeTenderDocumentTitle repairs",
  normalizeTenderDocumentTitle(broken).includes("Załącznik"),
);

// Classification unchanged on repaired vs broken for same semantic role (SWZ still SWZ)
const roleBroken = classifyDocumentRole(toMojibake("Załącznik nr 2A do SWZ_OPZ_DZP.docx"));
const roleFixed = classifyDocumentRole("Załącznik nr 2A do SWZ_OPZ_DZP.docx");
assertEq("classifyDocumentRole OPZ stable", roleBroken, roleFixed);
assertEq("classifyDocumentRole OPZ is opz", roleFixed, "opz");

const costBroken = classifyCostDocumentType(broken);
const costFixed = classifyCostDocumentType(repairUtf8Mojibake(broken));
assertEq("discover cost type stable", costBroken.type, costFixed.type);

const disc = discoverBestCostDocument([
  { filename: broken, documentIndex: 1 },
  { filename: repairUtf8Mojibake(broken), documentIndex: 1 },
]);
assertEq("discoverBestCostDocument no false positive", disc.found, false);

console.log("\nTP194A encoding: ALL PASS");
