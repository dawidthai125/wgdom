/**
 * Prod bundle smoke — v2.50.55 (20.5B.6A.1 Dokumentacja Robót Naming)
 * node scripts/smoke-prod-bundle-2.50.55.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version", text: "2.50.55", required: true },
  { id: "tab_dokumentacja", text: "Dokumentacja robót", required: true },
  { id: "panel_title", text: "Dokumentacja robót", required: true },
  { id: "panel_subtitle", text: "Zakres prac · Wymiary · Obrys lokalu", required: true },
  { id: "obrys_hint", text: "Obrys lokalu i wymiary są materiałem źródłowym", required: true },
  { id: "plan_pdf_hint", text: "Nie są planem technicznym PDF", required: true },
  { id: "rysunek_plan_help", text: "plan techniczny PDF", required: true },
  { id: "worker_title", text: "Dokumentacja robót", required: true },
  { id: "worker_list", text: "Twoja dokumentacja", required: true },
  { id: "dashboard_alert", text: "Nowa dokumentacja od ekipy", required: true },
  { id: "inspector_nav", text: "Dokumentacja", required: true },
  { id: "inspector_short", text: 'short: "Dok."', required: false },
  { id: "naming_label", text: "Dokumentacja Robót — Naming Refresh", required: false },
  { id: "no_raporty_tab", text: 'label: "Raporty"', required: true, mustBeAbsent: true },
  { id: "no_raport_budowy", text: "Raport z budowy", required: true, mustBeAbsent: true },
  { id: "no_zakresy_wymiary", text: "Zakresy i wymiary", required: true, mustBeAbsent: true },
  { id: "no_nowe_raporty", text: "Nowe raporty od pracowników", required: true, mustBeAbsent: true },
  { id: "jobs_view", text: "JobsView", required: true },
  { id: "inspector_panel", text: "InspectorPanel", required: true },
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
  console.log(`\n=== Prod 2.50.55 — ${PROD} ===\n`);
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
