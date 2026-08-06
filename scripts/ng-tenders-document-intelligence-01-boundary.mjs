/**
 * Boundary verification — DI Phase A must not touch OUT surfaces.
 * npx vite-node scripts/ng-tenders-document-intelligence-01-boundary.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/lib/document-intelligence");
const FORBIDDEN = [
  "cloud-sync",
  "CloudLoader",
  "payroll",
  "cost-knowledge",
  "ai-cost",
  "make-server",
  "supabase",
  "kw-",
  "localStorage",
  "App.tsx",
  "AdminViewRouter",
];

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith(".ts"));
let fail = 0;

for (const f of files) {
  const text = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const bad of FORBIDDEN) {
    if (text.toLowerCase().includes(bad.toLowerCase())) {
      // allow comment mentions of OUT scope
      const lines = text.split("\n").filter((l) => l.toLowerCase().includes(bad.toLowerCase()));
      const real = lines.filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/OUT|Phase B|no KF|no AI-COST|Merged/i.test(l));
      if (real.length) {
        console.error(`FAIL ${f} contains ${bad}:`, real[0].trim());
        fail += 1;
      }
    }
  }
}

// Wire files — only allowed DI imports into existing parse/resolver (EXTEND)
const wireFiles = [
  "src/lib/tenders-bzp-doc-parse.ts",
  "src/lib/tender-document-resolver.ts",
];
for (const wf of wireFiles) {
  const text = fs.readFileSync(wf, "utf8");
  if (!text.includes("document-intelligence")) {
    console.error(`FAIL ${wf} missing document-intelligence import`);
    fail += 1;
  }
}

if (fail > 0) {
  console.error(`BOUNDARY FAIL (${fail})`);
  process.exit(1);
}
console.log(`BOUNDARY PASS (${files.length} DI files, ${wireFiles.length} wire files)`);
