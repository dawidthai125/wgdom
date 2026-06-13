/**
 * ARCH-001 — audyt importów w src/lib: cykle ESM, P0 cloud-sync, side effects.
 * Bez zewnętrznych zależności. Uruchom: node scripts/audit-import-cycles.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const libRoot = join(root, "src/lib");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function toLibId(absPath) {
  const rel = relative(libRoot, absPath).replace(/\\/g, "/");
  return rel.endsWith(".ts") || rel.endsWith(".tsx") ? rel : `${rel}.ts`;
}

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith("@/lib/")) return null;
  const sub = spec.slice(6);
  const base = join(libRoot, sub);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ];
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return toLibId(c);
    } catch { /* ignore */ }
  }
  return null;
}

function parseImports(content) {
  const deps = [];
  const importRe = /^import\s+(?:type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/gm;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const raw = m[0];
    if (/^import\s+type\s+/.test(raw) || /^import\s+\{[^}]*\btype\b/.test(raw)) {
      // type-only import line — skip runtime edge (TS erases)
      if (/^import\s+type\s+/.test(raw)) continue;
      const inner = raw.match(/\{([\s\S]+?)\}/);
      if (inner) {
        const names = inner[1].split(",").map((s) => s.trim()).filter(Boolean);
        const allType = names.every((n) => /^type\s+/.test(n));
        if (allType) continue;
      }
    }
    deps.push(m[1]);
  }
  const dynRe = /import\s*\(\s*["'](@\/lib\/[^"']+)["']\s*\)/g;
  while ((m = dynRe.exec(content)) !== null) {
    deps.push(`dynamic:${m[1]}`);
  }
  return deps;
}

function buildGraph(files) {
  const graph = new Map();
  const fileContent = new Map();
  for (const file of files) {
    const id = toLibId(file);
    const content = readFileSync(file, "utf8");
    fileContent.set(id, content);
    const edges = [];
    for (const spec of parseImports(content)) {
      if (spec.startsWith("dynamic:")) continue;
      const target = resolveSpec(file, spec);
      if (target) edges.push(target);
    }
    graph.set(id, edges);
  }
  return { graph, fileContent };
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = [];
  const inStack = new Set();

  function dfs(node) {
    visited.add(node);
    inStack.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      if (inStack.has(next)) {
        const idx = stack.indexOf(next);
        cycles.push([...stack.slice(idx), next]);
        continue;
      }
      if (!visited.has(next)) dfs(next);
    }
    stack.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) dfs(node);
  }
  return cycles;
}

function reachableFrom(graph, start) {
  const seen = new Set();
  const q = [start];
  while (q.length) {
    const n = q.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const e of graph.get(n) ?? []) {
      if (!seen.has(e)) q.push(e);
    }
  }
  return seen;
}

function hasStaticCloudSyncImport(content) {
  return /^import\s+(?!type)[\s\S]*?\sfrom\s+["']@\/lib\/cloud-sync["']/m.test(content)
    || /^import\s+\{[^}]*\}\s+from\s+["']@\/lib\/cloud-sync["']/m.test(content);
}

function moduleLevelWindowListener(content) {
  return /if\s*\(\s*typeof\s+window\s*!==?\s*["']undefined["']\s*\)[\s\S]{0,400}?addEventListener\s*\(/m.test(content);
}

const files = walk(libRoot);
const { graph, fileContent } = buildGraph(files);
const cycles = findCycles(graph);
const cloudSyncId = "cloud-sync.ts";
const fromCloudSync = reachableFrom(graph, cloudSyncId);

const p0Violations = [];
for (const id of fromCloudSync) {
  if (id === cloudSyncId) continue;
  const content = fileContent.get(id) ?? "";
  if (hasStaticCloudSyncImport(content)) {
    p0Violations.push(id);
  }
}

const moduleListeners = [];
for (const [id, content] of fileContent) {
  if (moduleLevelWindowListener(content)) {
    moduleListeners.push(id);
  }
}

const cloudRelatedCycles = cycles.filter((c) => c.some((n) => n === cloudSyncId || n.includes("tender")));

/** Risk heuristics for report */
const riskRows = [];

function addRisk(module, risk, reason, recommendation) {
  riskRows.push({ module, risk, reason, recommendation });
}

addRisk("cloud-sync.ts", "HIGH", "Centralny orchestrator sync + app-core chunk", "Nowe merge helpery bez importu consumerów; P0 ARCH RULE");
addRisk("tenders-sync.ts", "HIGH", "Bezpośredni uczestnik merge cloud-sync", "Bez importu cloud-sync; unikać głębokich importów feature");
addRisk("tender-cost-calibration.ts", "MEDIUM", "Był w cyklu P0 (naprawiony dynamic import)", "Zachować lazy import cloud-sync; bez value-import tenders-bzp");
addRisk("tenders-pipeline-session-cache.ts", "MEDIUM", "Module-level window listener + łańcuch tenders-bzp", "Stała zdarzenia lokalna (fix 2.53.2); listener opóźnić do init()");
addRisk("tenders-bzp.ts", "MEDIUM", "Import cloud-sync + session-cache + learn", "Nie importować z modułów w drzewie cloud-sync");
addRisk("tenders-bzp-learn.ts", "MEDIUM", "Top-level cloud-sync import; używany przez tenders-bzp", "Rozważyć dynamic import persist");
addRisk("wgdom-cost-catalog-store.ts", "MEDIUM", "Store + cloud-sync (poza drzewem merge)", "OK jeśli poza app-core init chain");
addRisk("recoverable-charges.ts", "LOW", "Merge participant — brak importu cloud-sync", "Utrzymać separację");
addRisk("employee-leaves.ts", "LOW", "Merge participant — brak importu cloud-sync", "Utrzymać separację");
addRisk("payroll-cycle.ts", "LOW", "Brak cloud-sync w lib/payroll", "OK");

const report = {
  scannedFiles: files.length,
  cyclesFound: cycles.length,
  cycles: cycles.slice(0, 20),
  cloudRelatedCycles: cloudRelatedCycles.slice(0, 10),
  cloudSyncReachableCount: fromCloudSync.size,
  p0StaticImportViolations: p0Violations,
  moduleLevelWindowListeners: moduleListeners,
  dynamicCloudSyncImports: [...fileContent.entries()]
    .filter(([, c]) => /import\s*\(\s*["']@\/lib\/cloud-sync["']/.test(c))
    .map(([id]) => id),
  riskReport: riskRows,
};

console.log(JSON.stringify(report, null, 2));

console.error(`\nARCH-001 audit: ${cycles.length} cycle(s), ${p0Violations.length} P0 violation(s), ${moduleListeners.length} module listener(s)`);

// Informacyjny werdykt — szczegóły w JSON (exit 0; P0 violations = backlog dokumentowany w ARCHITECTURE § 11.6)
process.exit(0);
