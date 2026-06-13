/**
 * WM P1 — false exclude „przebudowa” vs „budowa budynku”
 * npx vite-node scripts/test-tender-exclude-renovation-budowa.mjs
 */
import {
  isExcludedTenderTitle,
  matchesTenderExcludeKeyword,
  TENDER_EXCLUDE_KEYWORDS,
} from "../src/lib/tenders-bzp-keywords.ts";
import { scoreTenderNotice } from "../src/lib/tenders-bzp.ts";

let pass = 0;
let fail = 0;
function assert(label, cond) {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`); }
  else { fail += 1; console.error(`  ✗ ${label}`); }
}

const WM_ORG = {
  organizationName: "Wrocławskie Mieszkania Sp. z o.o.",
  organizationCity: "Wrocław",
  cpvCode: "45211000-2",
};

function scoreTitle(orderObject) {
  return scoreTenderNotice({ ...WM_ORG, orderObject }, { priorityOrg: true });
}

console.log("1. matchesTenderExcludeKeyword — granica słowa budowa*\n");
assert("przebudowa budynku ≠ budowa budynku", !matchesTenderExcludeKeyword(
  "remont i przebudowa budynku wielorodzinnego",
  "budowa budynku",
));
assert("rozbudowa budynku ≠ budowa budynku", !matchesTenderExcludeKeyword(
  "rozbudowa budynku szkolnego",
  "budowa budynku",
));
assert("nadbudowa budynku ≠ budowa budynku", !matchesTenderExcludeKeyword(
  "nadbudowa budynku usługowego",
  "budowa budynku",
));
assert("budowa budynku mieszkalnego = exclude", matchesTenderExcludeKeyword(
  "budowa budynku mieszkalnego wielorodzinnego",
  "budowa budynku",
));
assert("budowa budynków = exclude", matchesTenderExcludeKeyword(
  "budowa budynków komunalnych",
  "budowa budynk",
));

console.log("\n2. isExcludedTenderTitle — PASS (remont/przebudowa)\n");
const passTitles = [
  "REMONT I PRZEBUDOWA BUDYNKU WIELORODZINNEGO PRZY UL. SĘPA SZARZYŃSKIEGO 65A WE WROCŁAWIU",
  "PRZEBUDOWA LOKALI MIESZKALNYCH",
  "MODERNIZACJA I PRZEBUDOWA OBIEKTU",
  "REMONT DACHU I PRZEBUDOWA PODDASZA",
];
for (const t of passTitles) {
  assert(`nie excluded: ${t.slice(0, 45)}…`, !isExcludedTenderTitle(t));
}

console.log("\n3. isExcludedTenderTitle — EXCLUDE (nowa budowa)\n");
const excludeTitles = [
  "BUDOWA NOWEGO BUDYNKU",
  "BUDOWA BUDYNKU MIESZKALNEGO",
  "BUDOWA ZESPOŁU BUDYNKÓW",
];
for (const t of excludeTitles) {
  assert(`excluded: ${t}`, isExcludedTenderTitle(t));
}

console.log("\n4. scoreTenderNotice WM — referencyjny Sępa\n");
const ref = scoreTitle(
  "REMONT I PRZEBUDOWA BUDYNKU WIELORODZINNEGO PRZY UL. SĘPA SZARZYŃSKIEGO 65A WE WROCŁAWIU",
);
assert("WM Sępa excluded=false", !ref.excluded);
assert("WM Sępa score>0", ref.score > 0);

console.log("\n5. Regresja ZZK / TBS / Gmina — próbki tytułów\n");
const zzk = scoreTenderNotice({
  organizationName: "Zarząd Zasobu Komunalnego we Wrocławiu",
  organizationCity: "Wrocław",
  orderObject: "Remont i modernizacja pustostanów — wymiana instalacji wod-kan",
  cpvCode: "45232410-0",
}, { priorityOrg: true });
assert("ZZK remont pustostanów OK", !zzk.excluded && zzk.score > 0);

const tbs = scoreTenderNotice({
  organizationName: "TBS Wrocław",
  organizationCity: "Wrocław",
  orderObject: "Wykończenie lokali mieszkalnych w budynku TBS",
  cpvCode: "45421000-4",
}, { priorityOrg: true });
assert("TBS wykończenie OK", !tbs.excluded && tbs.score > 0);

const gmina = scoreTenderNotice({
  organizationName: "Gmina Wrocław",
  organizationCity: "Wrocław",
  orderObject: "Remont elewacji budynku użyteczności publicznej",
  cpvCode: "45443000-0",
}, { priorityOrg: true });
assert("Gmina remont elewacji OK", !gmina.excluded && gmina.score > 0);

const newBuild = scoreTenderNotice({
  ...WM_ORG,
  orderObject: "BUDOWA BUDYNKU MIESZKALNEGO WIELORODZINNEGO",
}, { priorityOrg: true });
assert("nowa budowa WM nadal excluded", newBuild.excluded);

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail === 0) {
  console.log("\nRCA potwierdzone: TENDER_EXCLUDE_KEYWORDS → budowa budynku → substring w przebudowa budynku — NAPRAWIONE");
}
process.exit(fail ? 1 : 0);
