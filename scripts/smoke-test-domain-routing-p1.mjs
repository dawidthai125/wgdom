/**
 * Sprint P1 — domain routing smoke (prod HTTP)
 * Uruchom: npx vite-node scripts/smoke-test-domain-routing-p1.mjs
 */
const CANONICAL = "https://www.wgdom.fun";
const R = {};

function log(m) {
  console.log(m);
}

async function headNoFollow(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "manual" });
  return {
    status: res.status,
    location: res.headers.get("location") || "",
  };
}

async function followChain(url, max = 8) {
  let current = url;
  const chain = [];
  for (let i = 0; i < max; i++) {
    const res = await fetch(current, { method: "HEAD", redirect: "manual" });
    chain.push({ url: current, status: res.status, location: res.headers.get("location") || "" });
    if (res.status < 300 || res.status >= 400 || !res.headers.get("location")) {
      return { finalUrl: current, chain, finalStatus: res.status };
    }
    current = new URL(res.headers.get("location"), current).href;
  }
  return { finalUrl: current, chain, finalStatus: 0 };
}

function hostOf(url) {
  return new URL(url).hostname.toLowerCase();
}

// T1 — wgdom.fun → 30x → www.wgdom.fun
async function testT1() {
  log("\n═══ T1 — wgdom.fun apex redirect ═══");
  const { status, location } = await headNoFollow("https://wgdom.fun/");
  const ok = status >= 300 && status < 400 && location.includes("www.wgdom.fun");
  log(`  status=${status} location=${location}`);
  R.T1 = ok ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — wgdom.online → www.wgdom.online lub www.wgdom.fun (po P1 deploy)
async function testT2() {
  log("\n═══ T2 — wgdom.online redirect chain ═══");
  const { finalUrl, chain } = await followChain("https://wgdom.online/");
  const host = hostOf(finalUrl);
  const ok = host === "www.wgdom.fun" || host === "www.wgdom.online";
  log(`  chain: ${chain.map((c) => `${c.status} ${c.url}`).join(" → ")}`);
  log(`  final=${host}`);
  R.T2 = ok ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — www.wgdom.fun → 200
async function testT3() {
  log("\n═══ T3 — www.wgdom.fun OK ═══");
  const res = await fetch(CANONICAL, { method: "HEAD", redirect: "follow" });
  log(`  status=${res.status}`);
  R.T3 = res.status === 200 ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — HTML bundle (Vite index + assets)
async function testT4() {
  log("\n═══ T4 — HTML bundle ═══");
  const html = await fetch(CANONICAL).then((r) => r.text());
  const hasModule = html.includes('type="module"') && html.includes("/assets/");
  const hasRoot = html.includes('<div id="root">') || html.includes("id=\"root\"");
  log(`  module+assets=${hasModule} root=${hasRoot} len=${html.length}`);
  R.T4 = hasModule && hasRoot && html.length > 500 ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

async function main() {
  log("Sprint P1 — domain routing smoke");
  log(`CANONICAL=${CANONICAL}`);
  await testT1();
  await testT2();
  await testT3();
  await testT4();

  const all = Object.values(R);
  const pass = all.filter((x) => x === "PASS").length;
  log(`\n═══ WYNIK: ${pass}/${all.length} PASS ═══`);
  for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
  if (all.some((x) => x !== "PASS")) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
