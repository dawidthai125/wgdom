/**
 * Weryfikacja poprawności linków w komplecie dokumentacji AI‑handoff.
 * Sprawdza wszystkie relatywne linki markdown (pomija http/https i kotwice #).
 * Run: node scripts/verify-ai-docs-links.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DOCS = [
  "AI-START-HERE.md",
  "PROJECT-STATUS.md",
  "AI-HANDOFF.md",
  "CURSOR-HANDOFF.md",
  "ROADMAP.md",
  "CHANGELOG-SUMMARY.md",
  "TECHNICAL-DEBT.md",
];

const LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
let total = 0;
let broken = 0;
const brokenList = [];

for (const doc of DOCS) {
  const abs = resolve(ROOT, doc);
  if (!existsSync(abs)) {
    broken++;
    brokenList.push(`${doc} — DOKUMENT NIE ISTNIEJE`);
    continue;
  }
  const content = readFileSync(abs, "utf8");
  let m;
  while ((m = LINK_RE.exec(content)) !== null) {
    let target = m[1].trim();
    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) continue;
    target = target.split("#")[0];
    if (!target) continue;
    total++;
    const resolved = resolve(dirname(abs), target);
    if (!existsSync(resolved)) {
      broken++;
      brokenList.push(`${doc} → ${target}`);
    }
  }
}

console.log(
  JSON.stringify(
    { test: "verify-ai-docs-links", documents: DOCS.length, linksChecked: total, broken, brokenList },
    null,
    2,
  ),
);
process.exit(broken === 0 ? 0 : 1);
