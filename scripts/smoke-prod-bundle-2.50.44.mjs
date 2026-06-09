/**
 * Prod bundle smoke — v2.50.44 (20.5A.6 Billing Proposal)
 * node scripts/smoke-prod-bundle-2.50.44.mjs [url]
 */
const BASES = process.argv[2]
  ? [process.argv[2]]
  : ["https://www.wgdom.fun", "https://www.wgdom.online"];

const markers = [
  { id: "version", text: "2.50.44", required: true },
  { id: "proposal_cta", text: "Zgłoś pozycję", required: true },
  { id: "proposal_section", text: "Zgłoszenia inspektora", required: true },
  { id: "proposal_modal", text: "Zgłoś pozycję do rozliczenia", required: true },
  { id: "approve_title", text: "Zatwierdź zgłoszenie inspektora", required: true },
  { id: "billing_proposal_context", text: "billing_proposal", required: true },
  { id: "idempotency_already", text: "Zgłoszenie zostało już zatwierdzone", required: true },
  { id: "idempotency_duplicate", text: "Pozycja już istnieje dla tego zgłoszenia", required: true },
  { id: "reject_confirm", text: "Potwierdź odrzucenie", required: true },
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
  console.log(`\n=== Prod 2.50.44 — ${PROD} ===\n`);
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
    const ok = found;
    console.log(`${ok ? "✓" : "✗"} ${m.id}${!ok && m.required ? " — REQUIRED" : ""}`);
    if (ok) pass++;
    else if (m.required) {
      fail++;
      exitCode = 1;
    }
  }
  console.log(`\n${fail === 0 ? "ALL PASS" : "FAIL"} (${pass}/${markers.length})`);
}

process.exit(exitCode);
