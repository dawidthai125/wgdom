/**
 * Prod bundle smoke — v2.50.62 (20.5A.12B.1-full JobAllFilesView Hub Alignment)
 * node scripts/smoke-prod-bundle-2.50.62.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version_json", text: "2.50.62", required: true },
  { id: "changelog_12b1", text: "JobAllFilesView Full Hub Alignment", required: true },
  { id: "group_hub_content", text: "groupHubContentByJob", required: true },
  { id: "hub_address_group", text: "JobHubAddressGroup", required: false },
  { id: "all_files_hub_sections", text: "Dokumentacja robót", required: true },
  { id: "all_files_attachments", text: "Załączniki ogólne", required: true },
  { id: "contract_layer_chip", text: "Dokumenty kontraktowe", required: true },
  { id: "export_pdf_ui", text: "Eksportuj PDF", required: true },
  { id: "files_hub", text: "JobFilesHub", required: true },
  { id: "cross_tab_key", text: "wg-update-server-version", required: true },
  { id: "version_banner", text: "Dostępna nowa wersja WGDOM", required: true },
  { id: "plan_techniczny", text: "plan_techniczny", required: true },
  { id: "no_old_group_files", text: "groupFilesByJob(jobs)", required: true, mustBeAbsent: true },
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
  console.log(`\n=== Prod 2.50.62 — ${PROD} ===\n`);

  try {
    const vr = await fetch(`${PROD}/version.json?_=${Date.now()}`, { cache: "no-store" });
    const vj = await vr.json();
    const ok = vr.ok && vj.version === "2.50.62";
    console.log(`${ok ? "PASS" : "FAIL"}  version_json — ${JSON.stringify(vj)}`);
    if (!ok) exitCode = 1;
  } catch (e) {
    console.log(`FAIL  version_json — ${e.message}`);
    exitCode = 1;
  }

  let html;
  try {
    const res = await fetch(PROD, { headers: { "Cache-Control": "no-cache" } });
    html = await res.text();
  } catch (e) {
    console.log(`BLOCKED  fetch — ${e.message}`);
    exitCode = 2;
    continue;
  }

  const assets = await collectAssets(html, PROD);
  console.log(`Assets scanned: ${assets.size}`);
  let corpus = html;
  for (const a of assets) {
    const r = await fetch(PROD + a, { headers: { "Cache-Control": "no-cache" } });
    if (r.ok) corpus += await r.text();
  }

  let reqFail = 0;
  for (const m of markers) {
    const found = corpus.includes(m.text);
    const ok = m.mustBeAbsent ? !found : found;
    console.log(`${ok ? "PASS" : "FAIL"}  ${m.id}${m.mustBeAbsent ? " (absent)" : ""}`);
    if (m.required && !ok) reqFail++;
  }
  console.log(`Required failures: ${reqFail}`);
  if (reqFail) exitCode = 1;
}

process.exit(exitCode);
