/**
 * Prod bundle smoke — v2.50.54 (20.5B.5 Roboty UX Pack)
 * node scripts/smoke-prod-bundle-2.50.54.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version", text: "2.50.54", required: true },
  { id: "default_filter", text: '"in_progress"', required: true },
  { id: "socjalny_label", text: "Socjalny", required: true },
  { id: "gas_furnace_label", text: "Piec gazowy", required: true },
  { id: "gas_furnace_zostaje", text: "Zostaje", required: true },
  { id: "gas_furnace_wymiana", text: "Wymiana", required: true },
  { id: "gas_furnace_brak", text: "Brak", required: true },
  { id: "gas_furnace_field", text: "gasFurnaceStatus", required: true },
  { id: "tab_in_progress", text: "W trakcie", required: true },
  { id: "tab_handover", text: "Do odbioru", required: true },
  { id: "tab_delivered", text: "Zdane", required: true },
  { id: "jobs_view", text: "JobsView", required: true },
  { id: "inspector_panel", text: "InspectorPanel", required: true },
  { id: "job_meta_pickers", text: "JobMetaPickers", required: false },
  { id: "pack_gas_furnace", text: "Piec gazowy:", required: true },
  { id: "ux_pack_label", text: "Roboty UX Pack", required: false },
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
  console.log(`\n=== Prod 2.50.54 — ${PROD} ===\n`);
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
    const r = await fetch(PROD + a, { headers: { "Cache-Control": "no-cache" } });
    if (r.ok) corpus += await r.text();
  }

  console.log(`Assets scanned: ${assets.size}`);
  for (const m of markers) {
    const found = corpus.includes(m.text);
    const ok = m.mustBeAbsent ? !found : found;
    console.log(`${ok ? "PASS" : "FAIL"}  ${m.id} — ${m.mustBeAbsent ? `absent: ${m.text}` : m.text}`);
    if (m.required && !ok) exitCode = 1;
  }
}

process.exit(exitCode);
