/**
 * SYNC-ARCH-01 RC-A HOTFIX — lokalny test CORS (OPTIONS → POST batch-set).
 * Weryfikuje allowHeaders w Edge index + symuluje preflight/POST z X-WGDOM-Trace-Id.
 *
 * npx vite-node scripts/test-edge-cors-trace-rc-a-hotfix.mjs
 */
import { readFileSync } from "node:fs";
import http from "node:http";

const EDGE_INDEX = "supabase/functions/make-server-0afb8820/index.tsx";
const TRACE_HEADER = "X-WGDOM-Trace-Id";
const ALLOW_HEADERS = ["Content-Type", "Authorization", "apikey", TRACE_HEADER];

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== SYNC-ARCH-01 RC-A CORS HOTFIX TEST ===\n");

// T1 — static: Edge index allowHeaders contains trace header
{
  const src = readFileSync(EDGE_INDEX, "utf8");
  const m = src.match(/allowHeaders:\s*\[([\s\S]*?)\]/);
  assert("T1 allowHeaders block present", Boolean(m));
  assert("T1 X-WGDOM-Trace-Id in allowHeaders", /X-WGDOM-Trace-Id/.test(m?.[1] ?? ""));
}

// T2/T3 — mini CORS server (parity z hono cors allowHeaders)
const server = http.createServer((req, res) => {
  const reqHeaders = req.headers["access-control-request-headers"] ?? "";
  const allow =
    ALLOW_HEADERS.join(", ") +
    (reqHeaders.toLowerCase().includes("x-wgdom-trace-id") ? "" : "");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", ALLOW_HEADERS.join(", "));
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/batch-set") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 404;
  res.end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const optRes = await fetch(`${base}/batch-set`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://www.wgdom.fun",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, x-wgdom-trace-id",
    },
  });
  const allowHdr = optRes.headers.get("access-control-allow-headers") ?? "";
  assert("T2 OPTIONS status 204", optRes.status === 204);
  assert(
    "T2 OPTIONS Allow-Headers includes x-wgdom-trace-id",
    allowHdr.toLowerCase().includes("x-wgdom-trace-id"),
  );

  const postRes = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [TRACE_HEADER]: "http-test-rc-a",
    },
    body: JSON.stringify({ keys: ["kw-week-employees"], values: [[]] }),
  });
  const postJson = await postRes.json().catch(() => ({}));
  assert("T3 POST batch-set HTTP 200", postRes.status === 200);
  assert("T3 POST body ok:true", postJson.ok === true);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
