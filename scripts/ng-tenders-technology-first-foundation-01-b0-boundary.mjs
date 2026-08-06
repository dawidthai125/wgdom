/**
 * Boundary — Technology Foundation B0 must not touch OUT surfaces / prices.
 * npx vite-node scripts/ng-tenders-technology-first-foundation-01-b0-boundary.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/lib/technology-foundation");
const FORBIDDEN_IMPORT_OR_TOUCH = [
  "cloud-sync",
  "CloudLoader",
  "payroll",
  "ai-cost",
  "cost-knowledge",
  "offer-boq",
  "OfferBoq",
  "make-server",
  "supabase",
  "localStorage",
  "App.tsx",
  "AdminViewRouter",
  "kw-",
];

/** Price tokens that must not appear as field keys / pricing API in B0 lib. */
const PRICE_TOKENS = [
  "unitPrice",
  "companyPrice",
  "recommendedBid",
  "pricePln",
];

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".ts"));
let fail = 0;

function isCommentOrDocLine(line) {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    /OUT|NO TOUCH|TF-1|never|forbid|MUST NOT|without PLN|Never PLN|no PLN|price forbid/i.test(t)
  );
}

for (const f of files) {
  const text = fs.readFileSync(path.join(ROOT, f), "utf8");

  for (const bad of FORBIDDEN_IMPORT_OR_TOUCH) {
    if (!text.toLowerCase().includes(bad.toLowerCase())) continue;
    const lines = text.split("\n").filter((l) => l.toLowerCase().includes(bad.toLowerCase()));
    const real = lines.filter((l) => !isCommentOrDocLine(l));
    if (real.length) {
      console.error(`FAIL ${f} contains ${bad}:`, real[0].trim());
      fail += 1;
    }
  }

  for (const tok of PRICE_TOKENS) {
    // Allow only inside identity.ts FORBIDDEN_PRICE_RE / assert messages as string literals in regex
    if (f === "identity.ts" && tok !== "recommendedBid") {
      // identity may list tokens in regex — OK
      continue;
    }
    if (f === "identity.ts") continue;

    const re = new RegExp(`\\b${tok}\\b`);
    if (!re.test(text)) continue;
    const lines = text.split("\n").filter((l) => re.test(l));
    const real = lines.filter((l) => !isCommentOrDocLine(l));
    // allow string mentions inside assertNoPriceTokens tests paths only in identity
    if (real.length) {
      console.error(`FAIL ${f} price token ${tok}:`, real[0].trim());
      fail += 1;
    }
  }
}

// B0 must NOT wire into App / tenders UI / payroll
const mustNotImportTf = [
  "src/app/App.tsx",
  "src/lib/cloud-sync.ts",
];
for (const wf of mustNotImportTf) {
  if (!fs.existsSync(wf)) continue;
  const text = fs.readFileSync(wf, "utf8");
  if (text.includes("technology-foundation")) {
    console.error(`FAIL ${wf} must not import technology-foundation in B0`);
    fail += 1;
  }
}

if (fail > 0) {
  console.error(`BOUNDARY FAIL (${fail})`);
  process.exit(1);
}
console.log(`BOUNDARY PASS (${files.length} technology-foundation files, no OUT wires)`);
