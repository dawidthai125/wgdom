/**
 * GO20 — policy consistency tests for AUTO_G1_ACCEPT (no runtime mutation).
 * node scripts/test-auto-g1-policy-go20.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("PASS:", msg);
  }
}

const master = readFileSync(
  join(root, "docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md"),
  "utf8",
);
const autonomy03 = readFileSync(
  join(root, "docs/architecture/IK-AUTONOMY-03-AUTONOMY-POLICY.md"),
  "utf8",
);
const p3df = readFileSync(
  join(root, "docs/architecture/IK-AUTONOMY-08-P3-DESIGN-FREEZE.md"),
  "utf8",
);
const df = readFileSync(
  join(root, "docs/architecture/AUTO-G1-ACCEPT-DECISION-FRAMEWORK.md"),
  "utf8",
);
const offerBoq = readFileSync(join(root, "src/lib/tender-offer-boq.ts"), "utf8");
const trusted = readFileSync(
  join(root, "src/lib/intelligent-estimator/ik-identity-trusted-preserve.ts"),
  "utf8",
);

// 1. Routine G1 AUTO permitted in Master
ok(
  /G1 Identity \(routine\)[\s\S]*?\|\s*\*\*YES \(routine\)\*\*/.test(master) ||
    /G1 routine AUTO = YES/.test(master) ||
    /\*\*YES \(routine\)\*\*/.test(master),
  "1 routine G1 AUTO permitted in Master §20",
);

// 2. Manual Accept not required for routine
ok(
  /exception \/ correction only|escalation only|EXCEPTION \/ HOLD/.test(master),
  "2 manual Accept framed as exception/escalation",
);

// 3. Manual Accept remains valid as exception
ok(
  /G1 Identity \(exception\)/.test(master) && /matchMethod: manual|`manual`/.test(master),
  "3 manual exception path preserved",
);

// 4. No first-candidate authorization
ok(
  /first candidate|FORBIDDEN AS ROUTINE|arbitrary first/.test(master + df),
  "4 first-candidate prohibited in policy",
);

// 5. Unresolved → EXCEPTION/HOLD
ok(/EXCEPTION\s*\/\s*HOLD|EXCEPTION\/HOLD/.test(master + df), "5 EXCEPTION/HOLD model present");

// 6. Invalid unit blocked
ok(/INVALID_UNIT|NIEPRAWIDŁOWA_JEDNOSTKA|do not auto-fix/.test(master), "6 invalid unit remains blocked");

// 7. lineId continuity
ok(/lineId/.test(df) && /continuity/.test(df.toLowerCase() + master.toLowerCase()), "7 lineId continuity mandatory");

// 8. Package persistence SSOT
ok(/runGatedIdentityPersist|kw-multi-dwelling-package/.test(df + master), "8 package persistence referenced");

// 9. dossier.kosztorys untouched
ok(/dossier\.kosztorys/.test(master) && /Never|NEVER|↛/.test(master), "9 dossier.kosztorys hard rule");

// 10. Finance not unlocked by G1 alone
ok(
  /Finance.*derived|not unlocked by G1|BidCutoverGate/.test(df + master),
  "10 Finance not unlocked merely by G1 AUTO",
);

// 11. G3 Owner-controlled
ok(/G3 Final Bid[\s\S]*?\|\s*\*\*no\*\*/.test(master), "11 G3 remains Owner Auto=no");

// Supersede banners
ok(/GO20|SUPERSEDE|SUPERSEDING AMENDMENT/.test(autonomy03), "AUTONOMY-03 has GO20 amendment");
ok(/GO20|SUPERSEDING AMENDMENT/.test(p3df), "AUTONOMY-08-P3 DF has GO20 amendment");
ok(/Decision ID[\s\S]*AUTO_G1_ACCEPT/.test(df), "DF AUTO_G1_ACCEPT exists");

// Enum auto_contract present (GO21)
ok(/\|\s*"auto_contract"/.test(offerBoq) || /"auto_contract"/.test(offerBoq), "OfferBoqMatchMethod includes auto_contract (GO21)");
ok(/auto_contract/.test(trusted), "TRUSTED_MATCH includes auto_contract");

// Historical Auto=no marked history in Master
ok(/HISTORY \(pre-GO20\).*G1 Auto/.test(master) || /superseded by §12\.2\.1/.test(master), "pre-GO20 Auto=no marked HISTORY");

// TPI package unchanged vs GO19 baseline
const PKG = join(root, ".tmp/goa-tpi729-package-payload-v1.json");
const GO19 = join(root, ".tmp/goa-tpi729-autonomous-g1-v1.json");
if (existsSync(PKG) && existsSync(GO19)) {
  const pkgHash = createHash("sha256").update(readFileSync(PKG)).digest("hex");
  const go19 = JSON.parse(readFileSync(GO19, "utf8").replace(/^\uFEFF/, ""));
  const expected = go19?.mutationAudit?.packageHash;
  ok(expected === pkgHash, `TPI package hash unchanged vs GO19 (${pkgHash.slice(0, 12)}…)`);
} else {
  ok(false, "GO19/package artefacts present for hash check");
}

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS — GO20 policy suite");
