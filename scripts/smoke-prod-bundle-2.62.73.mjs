/**
 * Prod bundle smoke — v2.62.73 (P0 Payroll Cloud Recovery Etap 1)
 * node scripts/smoke-prod-bundle-2.62.73.mjs [url]
 */
const PROD = process.argv[2] || "https://www.wgdom.fun";

const markers = [
  { id: "version_changelog", text: "2.62.73", required: true },
  { id: "guard_const", text: "PAYROLL_GUARD_BLOCKED_MESSAGE", required: true },
  { id: "guard_helper", text: "isPayrollGuardBlockedError", required: true },
  { id: "guard_toast_id", text: "admin-cloud-sync-payroll-guard", required: true },
  { id: "guard_user_copy", text: "ochrona przed utratą danych", required: true },
  { id: "payroll_recovery_label", text: "P0 Payroll Cloud Recovery", required: true },
];

async function collectAssets(html, base) {
  const assets = new Set([...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]));
  const queue = [...assets];
  const chunks = [];
  while (queue.length) {
    const a = queue.pop();
    const res = await fetch(base + a, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) continue;
    const js = await res.text();
    chunks.push(js);
    for (const m of js.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)) {
      const path = "/" + m[0];
      if (!assets.has(path)) {
        assets.add(path);
        queue.push(path);
      }
    }
  }
  return { assets, all: chunks.join("\n") };
}

let exitCode = 0;
console.log(`\n=== Prod 2.62.73 — ${PROD} ===\n`);

try {
  const vr = await fetch(`${PROD}/version.json`, { cache: "no-store" });
  const vj = await vr.json();
  const ok = vr.ok && vj.version === "2.62.73";
  console.log(`${ok ? "PASS" : "FAIL"}  version_json — ${JSON.stringify(vj)}`);
  if (!ok) exitCode = 1;
} catch (e) {
  console.log(`FAIL  version_json — ${e.message}`);
  exitCode = 1;
}

let html;
try {
  const res = await fetch(PROD, { headers: { "Cache-Control": "no-cache" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  html = await res.text();
} catch (e) {
  console.log(`BLOCKED  fetch — ${e.message}`);
  process.exit(2);
}

if (html.includes("Vercel Security Checkpoint") || html.includes("vercel-security")) {
  console.log("BLOCKED  Vercel Security Checkpoint");
  process.exit(2);
}

const { assets, all } = await collectAssets(html, PROD);
console.log(`INFO  assets scanned: ${assets.size}`);

for (const m of markers) {
  const found = all.includes(m.text);
  const ok = m.required ? found : true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${m.id}${found ? "" : " — missing: " + m.text}`);
  if (m.required && !found) exitCode = 1;
}

console.log(`\n=== ${exitCode === 0 ? "SMOKE PASS" : "SMOKE FAIL"} ===\n`);
process.exit(exitCode);
