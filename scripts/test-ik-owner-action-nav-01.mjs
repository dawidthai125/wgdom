/**
 * IK-OWNER-ACTION-NAV-01 — Queue presentation honesty (static + resolve mapping).
 * ZERO resolver semantic changes · ZERO Handoff / DetailPage.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveIkOwnerActionDeepLink } from "../src/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink.ts";
import { deriveIkOwnerActionNavStatus } from "../src/app/intelligent-estimator/IkOwnerActionQueueNavigate.tsx";

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

const navSrc = read("src/app/intelligent-estimator/IkOwnerActionQueueNavigate.tsx");
const deeplink = read("src/lib/intelligent-estimator/orchestra/ik-owner-action-deeplink.ts");
const handoff = read("src/lib/intelligent-estimator/ik-analysis-handoff-ui.ts");
const detail = read("src/app/TenderDetailPage.tsx");

// --- Presentation contract in QueueNavigate ---
ok("honesty marker", /data-ik-owner-action-nav-honesty=\"1\"/.test(navSrc));
ok("status data attr", /data-ik-owner-action-status=\{status\}/.test(navSrc));
ok("gap data attr", /data-ik-owner-action-gap=\{status === \"gap\" \? \"1\" : \"0\"\}/.test(navSrc));
ok("chief-off attr preserved", /data-ik-owner-action-chief-off/.test(navSrc));
ok("resolved attr preserved", /data-ik-owner-action-resolved/.test(navSrc));
ok("disabled based on !ok", /const disabled = !resolution\.ok/.test(navSrc));
ok("no navigate when disabled", /if \(disabled\) return;/.test(navSrc));
ok("badge Chief OFF", /Chief OFF/.test(navSrc));
ok("badge GAP", /STATUS_BADGE_PL[\s\S]*gap:\s*\"GAP\"/.test(navSrc));
ok("no setInterval", !/setInterval/.test(navSrc));
ok("no polling", !/setInterval|requestAnimationFrame/.test(navSrc));
ok("still uses resolveIkOwnerActionDeepLink", /resolveIkOwnerActionDeepLink\(item, deepLinkContext\)/.test(navSrc));
ok("still uses navigateIkOwnerActionTarget", /navigateIkOwnerActionTarget/.test(navSrc));

// --- Frozen outs ---
ok("Handoff file not modified by this epic contract", /pickFirstNavigableOwnerAction/.test(handoff));
ok("deeplink guard CHIEF_OFF unchanged", /reason: \"CHIEF_OFF\"/.test(deeplink));
ok("classification_hold still GAP in resolver", /case \"classification_hold\"[\s\S]*gapResolution/.test(deeplink));

// --- derive mapping ---
const laborItem = {
  domain: "labor_accept",
  deepLink: "ik:accept:labor:dw:L1:work",
  lineRef: "L1",
  dwellingId: "dw",
  blockerCode: "OWNER_ACCEPT_LABOR",
  labelPl: "Labor",
};
const laborRes = resolveIkOwnerActionDeepLink(laborItem);
ok("labor navigable resolve", laborRes.ok === true);
ok("labor status navigable", deriveIkOwnerActionNavStatus(laborRes) === "navigable");

const materialItem = {
  domain: "material_accept",
  deepLink: "ik:accept:material:dw:M1",
  lineRef: "M1",
  dwellingId: "dw",
  blockerCode: "OWNER_ACCEPT_MATERIAL",
  labelPl: "Material",
};
const chiefOff = resolveIkOwnerActionDeepLink(materialItem, {
  chiefDossierAvailable: false,
});
ok("material CHIEF_OFF resolve", !chiefOff.ok && chiefOff.reason === "CHIEF_OFF");
ok("material status chief_off", deriveIkOwnerActionNavStatus(chiefOff) === "chief_off");

const classItem = {
  domain: "classification_hold",
  deepLink: "ik:classification:compound",
  lineRef: "*",
  dwellingId: "*",
  blockerCode: "COMPOUND_HOLD",
  labelPl: "COMPOUND",
};
const classRes = resolveIkOwnerActionDeepLink(classItem);
ok("classification GAP resolve", !classRes.ok && classRes.reason === "GAP");
ok("classification status gap", deriveIkOwnerActionNavStatus(classRes) === "gap");

const identityItem = {
  domain: "identity",
  deepLink: "ik:identity:gap:dw:X1",
  lineRef: "X1",
  dwellingId: "dw",
  blockerCode: "BRAK_IDENTYFIKACJI_ROBOTY",
  labelPl: "Identity",
};
const idRes = resolveIkOwnerActionDeepLink(identityItem);
ok("identity navigable", idRes.ok === true && deriveIkOwnerActionNavStatus(idRes) === "navigable");

const f5Line = {
  domain: "f5_blocker",
  deepLink: "ik:f5-gap:dw:F1:OTHER",
  lineRef: "F1",
  dwellingId: "dw",
  blockerCode: "SOME_OTHER_GAP",
  labelPl: "F5",
};
const f5Res = resolveIkOwnerActionDeepLink(f5Line);
ok(
  "f5+line navigable or gap-with-line",
  f5Res.ok === true && deriveIkOwnerActionNavStatus(f5Res) === "navigable",
);

const parseFail = resolveIkOwnerActionDeepLink({
  domain: "labor_accept",
  deepLink: "bad-link",
  lineRef: "L",
  dwellingId: "d",
  blockerCode: "X",
  labelPl: "bad",
});
ok("PARSE_FAIL maps to gap status", !parseFail.ok && deriveIkOwnerActionNavStatus(parseFail) === "gap");

// --- Epic must not have edited DetailPage / handoff in this change set (content still present) ---
ok("DetailPage still wires Queue via Host (untouched contract)", /IkEntryHost/.test(detail));

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS");
