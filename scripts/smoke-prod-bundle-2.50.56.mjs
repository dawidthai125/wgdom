/**
 * Prod bundle smoke — v2.50.56 (20.5B.7 Version Awareness)
 * node scripts/smoke-prod-bundle-2.50.56.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version_changelog", text: "2.50.56", required: true },
  { id: "version_awareness_label", text: "Version Awareness & Update Banner", required: true },
  { id: "banner_copy", text: "Dostępna nowa wersja WGDOM", required: true },
  { id: "refresh_button", text: "Odśwież teraz", required: true },
  { id: "dismiss_button", text: "Później", required: true },
  { id: "version_check_hook", text: "useAppVersionCheck", required: false },
  { id: "fetch_version_json", text: "/version.json", required: true },
  { id: "location_reload", text: "location.reload", required: true },
  { id: "dismiss_key", text: "wg-update-banner-dismiss", required: true },
  { id: "poll_interval", text: "5 * 60 * 1000", required: false },
  { id: "visibility_listener", text: "visibilitychange", required: true },
  { id: "focus_listener", text: 'addEventListener("focus"', required: true },
  { id: "app_update_banner", text: "AppUpdateBanner", required: false },
  { id: "dokumentacja_robot", text: "Dokumentacja robót", required: true },
  { id: "jobs_view", text: "JobsView", required: true },
  { id: "inspector_panel", text: "InspectorPanel", required: true },
  { id: "no_auto_reload", text: "Aktualizacja za", required: true, mustBeAbsent: true },
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
  console.log(`\n=== Prod 2.50.56 — ${PROD} ===\n`);

  // version.json artifact
  try {
    const vr = await fetch(`${PROD}/version.json?_=${Date.now()}`, { cache: "no-store" });
    const vj = await vr.json();
    const ok = vr.ok && vj.version === "2.50.56";
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
