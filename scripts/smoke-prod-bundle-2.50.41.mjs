/**
 * Prod bundle smoke — v2.50.41
 * node scripts/smoke-prod-bundle-2.50.41.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version", text: "2.50.41", required: true },
  { id: "active_today_badge", text: "Aktywni dziś:", required: true },
  { id: "active_today_helper", text: "jobActiveWorkerCountOnDate", required: true },
  { id: "teal_badge", text: "bg-teal-500/12", required: true },
  { id: "no_ekipa_zero_card", text: "Ekipa: 0", required: false, mustAbsent: true },
  { id: "midb_no_team", text: "jobOpsHasNoExecutionTeam", required: true },
  { id: "mobile_44", text: "min-h-[44px]", required: true },
];

async function collectAssets(html, base) {
  const assets = new Set([...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]));
  const queue = [...assets];
  while (queue.length) {
    const a = queue.pop();
    const res = await fetch(base + a, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) continue;
    const js = await res.text();
    for (const m of js.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)) {
      const path = "/" + m[0];
      if (!assets.has(path)) {
        assets.add(path);
        queue.push(path);
      }
    }
  }
  return assets;
}

let exitCode = 0;

for (const PROD of BASES) {
  console.log(`\n=== Prod 2.50.41 — ${PROD} ===\n`);
  let html;
  try {
    const res = await fetch(PROD, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    console.log(`BLOCKED  fetch — ${e.message}`);
    exitCode = 2;
    continue;
  }

  if (html.includes("Vercel Security Checkpoint") || html.includes("vercel-security")) {
    console.log("BLOCKED  Vercel Security Checkpoint");
    exitCode = 2;
    continue;
  }

  const assets = await collectAssets(html, PROD);
  let allJs = "";
  let jobsJs = "";
  for (const a of assets) {
    const res = await fetch(PROD + a, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) continue;
    const js = await res.text();
    allJs += js;
    if (a.includes("JobsView") || a.includes("JobListCard")) jobsJs += js;
  }

  for (const m of markers) {
    const hay = m.id.includes("ekipa") || m.id.includes("active") ? jobsJs || allJs : allJs;
    const present = hay.includes(m.text);
    const ok = m.mustAbsent ? !present : present;
    console.log(`${ok ? "PASS" : "FAIL"} [${m.required ? "REQ" : "OPT"}] ${m.id}`);
    if (m.required && !ok) exitCode = 1;
  }

  console.log(`Assets crawled: ${assets.size}`);
}

if (exitCode === 2) {
  console.log("\n=== Prod bundle 2.50.41 — BLOCKED ===\n");
  process.exit(2);
}
if (exitCode) process.exit(1);
console.log("\n=== Prod bundle 2.50.41 — ALL PASS ===\n");
