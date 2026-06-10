/**
 * Prod bundle smoke — v2.50.58 (20.5A.12 Files Hub + 12B.1-min counters)
 * node scripts/smoke-prod-bundle-2.50.58.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version_changelog", text: "2.50.58", required: true },
  { id: "files_hub_label", text: "Files Hub Consolidation (20.5A.12)", required: false },
  { id: "hub_contract_section", text: "Dokumenty kontraktowe", required: true },
  { id: "hub_reports_section", text: "Dokumentacja robót", required: true },
  { id: "hub_attachments_section", text: "Załączniki ogólne", required: true },
  { id: "hub_checklist_section", text: "Checklista odbiorowa", required: true },
  { id: "hub_goto_docs", text: "Przejdź do dokumentacji", required: true },
  { id: "hub_goto_documents", text: "Przejdź do dokumentów", required: true },
  { id: "hub_chunk", text: "JobFilesHub", required: true },
  { id: "files_hub_index", text: "countFilesHubItems", required: false },
  { id: "all_files_hub", text: "countAllFilesHubItems", required: false },
  { id: "media_pliki_copy", text: "dokumentacja ekipy", required: true },
  { id: "version_awareness_banner", text: "Dostępna nowa wersja WGDOM", required: true },
  { id: "version_refresh_btn", text: "Odśwież teraz", required: true },
  { id: "version_visibility", text: "visibilitychange", required: true },
  { id: "version_reload", text: "location.reload", required: true },
  { id: "version_json_path", text: "/version.json", required: true },
  { id: "worker_progress", text: "Postęp dokumentacji", required: true },
  { id: "dokumentacja_robot", text: "Dokumentacja robót", required: true },
  { id: "jobs_view", text: "JobsView", required: true },
  { id: "media_view", text: "MediaView", required: true },
  { id: "media_separation", text: "jobAttachments", required: true },
  { id: "plan_techniczny", text: "plan_techniczny", required: true },
  { id: "generic_attachments", text: "Załączniki ZIP", required: true },
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
  console.log(`\n=== Prod 2.50.58 — ${PROD} ===\n`);

  try {
    const vr = await fetch(`${PROD}/version.json?_=${Date.now()}`, { cache: "no-store" });
    const vj = await vr.json();
    const ok = vr.ok && vj.version === "2.50.58";
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
  let requiredPass = 0;
  let requiredFail = 0;
  for (const m of markers) {
    const found = corpus.includes(m.text);
    const ok = m.mustBeAbsent ? !found : found;
    console.log(`${ok ? "PASS" : "FAIL"}  ${m.id} — ${m.mustBeAbsent ? `absent: ${m.text}` : m.text}`);
    if (m.required) {
      if (ok) requiredPass++;
      else {
        requiredFail++;
        exitCode = 1;
      }
    }
  }
  console.log(`Required: ${requiredPass} pass, ${requiredFail} fail`);
}

process.exit(exitCode);
