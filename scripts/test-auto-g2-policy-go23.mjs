/**
 * GO23 — policy consistency tests for AUTO_G2_ACCEPT (no runtime mutation).
 * node scripts/test-auto-g2-policy-go23.mjs
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
  join(root, "docs/architecture/AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md"),
  "utf8",
);
const accept = readFileSync(
  join(root, "src/lib/work-catalog/work-rate-accept.ts"),
  "utf8",
);
const bom = readFileSync(
  join(root, "src/lib/tender-position-cost/bom-technology-adapter.ts"),
  "utf8",
);
const laborOnly = readFileSync(
  join(root, "src/lib/tender-position-cost/labor-only-classification.ts"),
  "utf8",
);

// 1. Canonical CURRENT rate AUTO REUSE authorized
ok(
  /AUTO_RATE_ACCEPT[\s\S]*REUSE|REUSE CURRENT|YES \(conditional\)/.test(master + df),
  "1 CURRENT rate AUTO REUSE authorized in policy",
);

// 2. Unauthorized rate cannot AUTO
ok(
  /companyPricePln ≠ OUR RATE|Evidence ≠ OUR RATE|FORBIDDEN/.test(master + df),
  "2 unauthorized rate sources blocked",
);

// 3. Research candidate does not silently become OUR RATE
ok(
  /OPEN R1|default \*\*NO\*\*|research ≠ silent Accept|NIGDY auto-write bez Accept/.test(
    df + master + accept,
  ),
  "3 research candidate not silent OUR RATE",
);

// 4. Unit mismatch blocks
ok(/Unit compatibility exact|UNIT_MISMATCH|unit must match/.test(df + accept), "4 unit mismatch blocks");

// 5. Stale source policy present
ok(/STALE|OPEN POLICY DECISION R2|R2/.test(df), "5 STALE handling documented (R2 OPEN)");

// 6. TechnologyPack AUTO BOM when authorized
ok(
  /AUTO_BOM_ACCEPT|resolveTechnologyBomForWork|TechnologyPack singleton/.test(df + master),
  "6 TechnologyPack AUTO BOM authorized",
);

// 7. Missing BOM fails closed
ok(
  /MISSING_BOM[\s\S]*EXCEPTION|LOCKED default|BRAK_TECHNOLOGII_BOM/.test(df + bom),
  "7 missing BOM fails closed",
);

// 8. LABOR_ONLY cannot be invented
ok(
  /MISSING_BOM ≠ invent LABOR_ONLY|NEVER derived from missing|deriving LABOR_ONLY from MISSING_BOM/.test(
    df + laborOnly + master,
  ),
  "8 LABOR_ONLY invent prohibited",
);

// 9. Stronger/fresher not overwritten
ok(/never.*overwrite|NO overwrite|Overwrite precedence/i.test(df), "9 overwrite precedence present");

// 10. Idempotent
ok(/Idempotent|idempotenc/i.test(df), "10 idempotency required");

// 11. Provenance auditable
ok(/Provenance|sourceType|packId/.test(df), "11 provenance auditable");

// 12. Finance derived
ok(/Finance.*derived|BidCutoverGate/.test(df + master), "12 Finance remains derived");

// 13. G3 Owner
ok(/G3 Final Bid[\s\S]*?\|\s*\*\*no\*\*/.test(master), "13 G3 remains Owner Auto=no");

// 14. G1 AUTO remains
ok(/AUTO_G1_ACCEPT|YES \(routine\)/.test(master), "14 G1 AUTO remains functional in policy");

// 15. dossier.kosztorys untouched
ok(/dossier\.kosztorys/.test(master) && /Never|NEVER|↛/.test(master), "15 dossier.kosztorys hard rule");

// Framework + supersede banners
ok(/Decision ID[\s\S]*AUTO_G2_ACCEPT/.test(df), "DF AUTO_G2_ACCEPT exists");
ok(/AUTO_RATE_ACCEPT/.test(df) && /AUTO_BOM_ACCEPT/.test(df), "DF separates RATE and BOM");
ok(/GO23|SUPERSEDING AMENDMENT|§12\.2\.3/.test(autonomy03), "AUTONOMY-03 has GO23 amendment");
ok(/GO23|AUTO-G2-ACCEPT/.test(p3df), "AUTONOMY-08-P3 DF has GO23 amendment");
ok(/HISTORY \(pre-GO23\).*G2/.test(master) || /superseded by §12\.2\.3/.test(master), "pre-GO23 G2 Auto=no marked HISTORY");
ok(/RUNTIME NOT IMPLEMENTED|GO23 = policy|POLICY ONLY|RUNTIME IMPLEMENTED \(GO24\)/i.test(df), "GO23 policy DF present (runtime may be GO24+)");


// GO22 baseline artefact unchanged (no TPI mutation)
const GO22 = join(root, ".tmp/goa-tpi729-auto-g2-v1.json");
const PKG = join(root, ".tmp/goa-tpi729-package-payload-auto-g1-v1.json");
if (existsSync(GO22) && existsSync(PKG)) {
  const go22 = JSON.parse(readFileSync(GO22, "utf8").replace(/^\uFEFF/, ""));
  const pkgHash = createHash("sha256").update(readFileSync(PKG)).digest("hex");
  const expected = go22?.packageHash || go22?.mutationAudit?.packageHash;
  ok(expected === pkgHash, `GO21 package hash unchanged vs GO22 (${pkgHash.slice(0, 12)}…)`);
  ok(go22?.counts?.trustedIncomplete === 7, "GO22 trusted-incomplete still 7 (reference)");
  ok(go22?.counts?.ready === 52, "GO22 ready still 52 (reference)");
} else {
  ok(false, "GO22/package artefacts present for hash check");
}

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS — GO23 G2 policy suite");
