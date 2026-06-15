/**
 * P0.4B READ ONLY — inventory + categorization (writes scripts/_p04b-inventory.json only)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const ROOT = process.cwd();
const AUDIT = join(ROOT, "audit");
const OUT = join(ROOT, "scripts", "_p04b-inventory.json");

const KEEP_PATTERNS = [
  /^audit\/zi-live-template\.pdf$/,
  /^audit\/zi-p0-3u-attached-source\.pdf$/,
  /^audit\/zi-new-template-prod\.pdf$/,
  /^audit\/zi-p0-3ag-adobe-saved\.pdf$/,
  /^audit\/zi-old-template\.pdf$/,
  /^audit\/template-cleanup-backup\.json$/,
  /^audit\/template-cleanup-execute-report\.json$/,
  /^audit\/template-cleanup-report\.json$/,
  /^audit\/p0-template-pollution-report\.json$/,
  /^audit\/p0-3ad-business-mapping-report\.json$/,
  /^audit\/p0-3ab-ciphertext-model-report\.json$/,
  /^audit\/p0-3ai-true-capacity-report\.json$/,
  /^audit\/p0-3aj-replicate-user-save-report\.json$/,
  /^audit\/p0-3ak-ap-render-path-report\.json$/,
  /^audit\/p0-3r-root-cause-confirmed-report\.json$/,
  /^audit\/p0-4a-flatten-poc-report\.json$/,
  /^audit\/p0-3ag-adobe-saved-forensic-report\.json$/,
  /^audit\/p0-3ag-executive-summary\.json$/,
  /^audit\/p0-3ag-address-field-discovery\.json$/,
  /^audit\/p0-3ae-real-capacity-report\.json$/,
  /^audit\/p0-3ac-field-capacity-mapping-report\.json$/,
  /^audit\/p0-3aa-payload-limit-report\.json$/,
  /^audit\/p0-3af-verify-p0-3g-report\.json$/,
  /^audit\/p0-3g-hard-rca-report\.json$/,
  /^audit\/p0-3h-visible-vs-invisible-report\.json$/,
  /^audit\/p0-3n-j-vs-f-differential-report\.json$/,
  /^audit\/p0-3q-content-injection-report\.json$/,
  /^audit\/p0-3s-stream-ownership-report\.json$/,
  /^audit\/p0-3p-page-identity-report\.json$/,
  /^audit\/p0-3l-source-of-truth-report\.json$/,
  /^audit\/p0-3m-live-template-forensic-report\.json$/,
  /^audit\/p0-3-old-vs-new-template-report\.json$/,
  /^audit\/zi-rca-ulica-bud-lok-REPORT\.md$/,
  /^audit\/zi-new-template-FORENSIC\.md$/,
  /^audit\/zi-new-template-fields-pdfjs\.json$/,
  /^audit\/zi-new-template-forensic-report\.json$/,
  /^audit\/zi-new-template-xfa-deep\.json$/,
  /^audit\/TRACE-REPORT\.json$/,
  /^audit\/p0-1f-reconcile-report\.json$/,
  /^audit\/p0-1f2-proof-report\.json$/,
  /^audit\/p0-1f4-layer-report\.json$/,
  /^audit\/p0-2b-wm-address-rca-report\.json$/,
  /^audit\/p0-2c-wm-visible-proof-report\.json$/,
  /^audit\/p0-3ah-field-pairing-report\.json$/,
  /^audit\/p0-3y-designer-v-rca-report\.json$/,
  /^audit\/p0-3v-dawid-vs-sepa-report\.json$/,
  /^audit\/p0-3k-ap-content-rca-report\.json$/,
  /^audit\/p0-3j-original-ap-report\.json$/,
  /^audit\/p0-3i-ap-preservation-report\.json$/,
  /^audit\/p0-3d-edge-experiment-report\.json$/,
  /^audit\/p0-3e-variant-b-readonly-report\.json$/,
  /^audit\/p0-3f-local-validation-manifest\.json$/,
  /^audit\/p0-3d-local-validation-manifest\.json$/,
  /^audit\/zi-smoke-sepa-83-7-report\.json$/,
  /^audit\/zi-p0-2a-publish-report\.json$/,
  /^audit\/p0-3t-ap-switch-report\.json$/,
  /^audit\/p0-3o-a-overlay-colors-report\.json$/,
  /^audit\/p0-3k-v-encoding-report\.json$/,
  /^audit\/p0-3k-pdfjs-fieldvalues\.json$/,
  /^audit\/p0-3b-rca-prod-gen\.txt$/,
  /^audit\/p0-1f4-template-raw\.pdf$/,
  /^audit\/p0-1g-debug-overlay\.pdf$/,
  /^audit\/p0-1f2-proof\.zip$/,
  /^audit\/zi-p0-3q-append\.pdf$/,
  /^audit\/zi-p0-3q-replace\.pdf$/,
  /^audit\/zi-p0-3o-overlay-colors\.pdf$/,
  /^audit\/zi-p0-3j-original-ap\.pdf$/,
  /^audit\/zi-p0-3f-local-wgdom-sepa-83-7\.pdf$/,
  /^audit\/zi-p0-4a-flatten-poc-sepa-83-7\.pdf$/,
  /^audit\/zi-p0-2c-proof-sepa-83-7\.pdf$/,
  /^audit\/zi-smoke-sepa-83-7\.pdf$/,
  /^audit\/final-zi-from-zip\.pdf$/,
  /^audit\/zi-before-zip\.pdf$/,
  /^audit\/zi-from-pipeline\.pdf$/,
  /^audit\/p0-3ak-variants\//,
  /^audit\/SEPA_SZARZYNSKIEGO_83_7_ODBIOR_WM_P0-3[DF]-LOCAL\.zip$/,
  /^audit\/ZI-FINAL-HANDOFF\.md$/,
];

const DELETE_PATTERNS = [
  /^audit\/_/,
  /^audit\/prod-/,
  /^audit\/trace-full\.zip$/,
  /^audit\/zi-p0-3z-/,
  /^audit\/zi-p0-3aa-/,
  /^audit\/zi-p0-3ab-/,
  /^audit\/zi-p0-3s-hide-/,
  /^audit\/zi-p0-3t-[bcd]-/,
  /^audit\/zi-p0-3x-exp-/,
  /^audit\/zi-p0-3y-exp/,
  /^audit\/zi-p0-3aj-proof-/,
  /^audit\/zi-p0-3aj-adobe-v-swap\.pdf$/,
  /^audit\/zi-p0-3aj-vonly-test\.pdf$/,
  /^audit\/zi-p0-3c-flatten-sim\.pdf$/,
  /^audit\/zi-p0-3p-page-marker\.pdf$/,
  /^audit\/zi-p0-3w-settext-sepa-experiment\.pdf$/,
  /^audit\/zi-rca-ulica-bud-lok-zi-.*\.json$/,
  /^audit\/zi-smoke-sepa-83-7-deep\.json$/,
  /^audit\/_inventory/,
];

function categorize(rel) {
  if (KEEP_PATTERNS.some((p) => p.test(rel))) return "KEEP";
  if (DELETE_PATTERNS.some((p) => p.test(rel))) return "DELETE";
  return "ARCHIVE";
}

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else files.push(p.replace(/\\/g, "/"));
  }
}
walk(AUDIT);

const refCorpus = [];
function collectRefs(dir) {
  for (const name of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(ROOT, dir, name.name);
    if (name.isDirectory()) {
      collectRefs(join(dir, name.name).replace(/\\/g, "/"));
      continue;
    }
    const ext = extname(name.name).toLowerCase();
    if (![".mjs", ".md", ".json", ".ts", ".tsx", ".txt"].includes(ext)) continue;
    try {
      refCorpus.push({ path: p.replace(/\\/g, "/"), text: readFileSync(p, "utf8") });
    } catch {
      /* skip */
    }
  }
}
for (const d of ["scripts", "docs", "audit"]) collectRefs(d);

function lastRefFor(baseName, selfPath) {
  for (const { path, text } of refCorpus) {
    if (path === selfPath) continue;
    if (text.includes(baseName)) return path;
  }
  return "—";
}

const rows = files.map((f) => {
  const st = statSync(f);
  const rel = f.includes("/audit/") ? f.slice(f.indexOf("audit/")) : f;
  const ext = extname(f).slice(1).toLowerCase() || "other";
  return {
    file: rel,
    size: st.size,
    date: st.mtime.toISOString().slice(0, 10),
    type: ext,
    category: categorize(rel),
    lastRef: lastRefFor(basename(f), f.replace(/\\/g, "/")),
  };
});
rows.sort((a, b) => a.file.localeCompare(b.file));

const summary = {
  count: rows.length,
  totalBytes: rows.reduce((s, r) => s + r.size, 0),
  byCategory: { KEEP: 0, ARCHIVE: 0, DELETE: 0 },
  bytesByCategory: { KEEP: 0, ARCHIVE: 0, DELETE: 0 },
  byType: {},
};
for (const r of rows) {
  summary.byCategory[r.category]++;
  summary.bytesByCategory[r.category] += r.size;
  summary.byType[r.type] = (summary.byType[r.type] || 0) + 1;
}

writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
