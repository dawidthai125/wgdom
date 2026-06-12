/**
 * Prod bundle smoke — v2.50.43 (20.3B+ FULL)
 * node scripts/smoke-prod-bundle-2.50.43.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version", text: "2.50.43", required: true },
  { id: "brand_cc", text: "COMMAND CENTER AI", required: true },
  { id: "health_index_pl", text: "Indeks kondycji", required: true },
  { id: "ai_insights_pl", text: "Wnioski AI", required: true },
  { id: "explainability_pl", text: "Wyjaśnienia scoringu", required: true },
  { id: "pipeline_offers_pl", text: "Lejek ofert", required: true },
  { id: "decision_history_pl", text: "Historia decyzji", required: true },
  { id: "decision_startuj", text: "STARTUJ", required: true },
  { id: "metric_labels_pl", text: "tenders-strategy-ui-labels-pl", required: false },
  { id: "no_health_index_en", text: "Health Index", required: false, mustAbsent: true },
  { id: "no_ai_insights_en", text: ">AI Insights<", required: false, mustAbsent: true },
  { id: "billing_evidence", text: "billing-evidence-", required: true },
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
  console.log(`\n=== Prod 2.50.43 — ${PROD} ===\n`);
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
  let corpus = html;
  for (const a of assets) {
    try {
      const res = await fetch(PROD + a, { headers: { "Cache-Control": "no-cache" } });
      if (res.ok) corpus += "\n" + (await res.text());
    } catch { /* ignore */ }
  }

  let pass = 0;
  let fail = 0;
  for (const m of markers) {
    const found = corpus.includes(m.text);
    const ok = m.mustAbsent ? !found : found;
    console.log(`${ok ? "✓" : "✗"} ${m.id}${m.required ? "" : " (optional)"}${!ok && m.required ? " — REQUIRED" : ""}`);
    if (ok) pass++;
    else if (m.required) {
      fail++;
      exitCode = 1;
    }
  }
  console.log(`\n${PROD}: ${pass} ok, ${fail} required fail`);
}

if (exitCode !== 0) {
  console.log("\n=== Prod bundle 2.50.43 — FAIL ===\n");
  process.exit(exitCode);
}
console.log("\n=== Prod bundle 2.50.43 — ALL PASS ===\n");
