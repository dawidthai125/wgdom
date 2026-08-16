/**
 * P5.32-FIX — LOCAL ↔ EDGE PASS2 category route parity + P5.31 route→URL (no HTTP).
 * npx vite-node scripts/test-ik-migration-01-p532-fix-edge-category-route-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  resolveWorkRatePass2Url,
  resolveWorkRateSelectiveLookupRequest,
} from "../src/lib/work-catalog/index.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const ROOT = path.resolve(import.meta.dirname, "..");
const EDGE_PATH = path.join(
  ROOT,
  "supabase/functions/make-server-0afb8820/index.tsx",
);

function extractEdgeMap(src) {
  const re =
    /const WORK_RATE_PASS2_CATEGORY_URLS: Record<string, string> = Object\.freeze\(\{([\s\S]*?)\}\);/;
  const m = src.match(re);
  if (!m) throw new Error("EDGE_MAP_BLOCK_NOT_FOUND");
  const map = {};
  const pairRe = /"([^"]+)"\s*:\s*\n?\s*"([^"]+)"/g;
  let pm;
  while ((pm = pairRe.exec(m[1]))) {
    map[pm[1]] = pm[2];
  }
  return map;
}

const localPairs = WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map(
  (e) => `${e.sourceId}::${e.categoryKey}`,
);
const localMap = Object.fromEntries(
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST.map((e) => [
    `${e.sourceId}::${e.categoryKey}`,
    e.url,
  ]),
);

const edgeSrc = fs.readFileSync(EDGE_PATH, "utf8");
const edgeMap = extractEdgeMap(edgeSrc);
const edgeKeys = Object.keys(edgeMap).sort();
const localKeys = Object.keys(localMap).sort();

// A size + parity
ok("A local allowlist size 9", WORK_RATE_PASS2_CATEGORY_ALLOWLIST.length === 9);
ok("A edge map size 9", edgeKeys.length === 9, edgeKeys);
ok(
  "A LOCAL_KEYS == EDGE_KEYS",
  JSON.stringify(localKeys) === JSON.stringify(edgeKeys),
  { localKeys, edgeKeys },
);
ok(
  "A LOCAL_URLS == EDGE_URLS",
  localKeys.every((k) => localMap[k] === edgeMap[k]),
  localKeys.filter((k) => localMap[k] !== edgeMap[k]),
);

// B legacy 5 present
for (const k of [
  "kb_pl::grooves",
  "kb_pl::plaster",
  "cennikremontow_pl::painting",
  "cennikremontow_pl::electrical",
  "cennikremontow_pl::plumbing",
]) {
  ok(`B legacy ${k}`, Boolean(edgeMap[k] && localMap[k]));
}

// C P5.31 four present
const p531 = [
  [
    "flooring",
    "kb_pl",
    "https://kb.pl/cenniki/uslugi/cennik-ukladania-paneli-podlogowych-w-calej-polsce/",
  ],
  [
    "repairs_wall",
    "kb_pl",
    "https://kb.pl/cenniki/uslugi/cennik-wyburzania-scian-dzialowych/",
  ],
  [
    "repairs_opening",
    "kb_pl",
    "https://kb.pl/cenniki/uslugi/cennik-wykucia-otworow-w-scianie-i-stropie-sprawdzamy-ceny/",
  ],
  [
    "joinery_finish",
    "cennikremontow_pl",
    "https://cennikremontow.pl/uslugi-stolarskie-cennik/",
  ],
];
for (const [key, sourceId, url] of p531) {
  const pair = `${sourceId}::${key}`;
  ok(`C edge has ${pair}`, edgeMap[pair] === url, edgeMap[pair]);
  ok(`C local resolve ${pair}`, resolveWorkRatePass2Url(sourceId, key) === url);
  const req = resolveWorkRateSelectiveLookupRequest({
    sourceId,
    query: `smoke-${key}`,
    categoryKey: key,
  });
  ok(
    `C lookup ${pair} PASS2 no unknown`,
    req.ok === true &&
      req.discoveryMethod === "PASS2_CATEGORY" &&
      req.categoryKey === key &&
      req.url === url,
    req,
  );
}

// D OWNER_REVIEW / deferred absent
for (const bad of [
  "repairs",
  "repairs_electrical",
  "repairs_appliance",
  "repairs_finish",
  "repairs_floor_trim",
  "repairs_biocide",
  "sealing_protection",
]) {
  ok(
    `D absent ${bad}`,
    !edgeKeys.some((k) => k.endsWith(`::${bad}`)) &&
      !localPairs.some((k) => k.endsWith(`::${bad}`)),
  );
}
ok("D G187 not a category key", !edgeKeys.some((k) => /G187|g187/i.test(k)));

// E shops hosts forbidden
ok(
  "E no DIY shops",
  !Object.values(edgeMap).some((u) => /leroy|castorama|obi/i.test(u)),
);

console.log(`\nP5.32-FIX parity: ${passed} PASS · ${failed} FAIL`);
if (failed > 0) process.exit(1);
