/**
 * P3.6 — smoke filtrów klientów strategicznych
 * npx vite-node scripts/test-tenders-strategic-client-filters.mjs
 */
import {
  STRATEGIC_CLIENT_FILTERS,
  matchesStrategicClientFilter,
  countStrategicClientFilters,
} from "../src/lib/tenders-strategic-client-filters.ts";

let pass = 0;
let fail = 0;
function assert(label, cond) {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`); }
  else { fail += 1; console.error(`  ✗ ${label}`); }
}

const samples = [
  { org: "Wrocławskie Mieszkania Sp. z o.o.", expect: "wm" },
  { org: "Zarząd Zasobu Komunalnego we Wrocławiu", expect: "zzk" },
  { org: "Miejski Ośrodek Pomocy Społecznej we Wrocławiu", city: "Wrocław", expect: "mops" },
  { org: "TBS Wrocław", expect: "tbs" },
  { org: "Gmina Wrocław", expect: "gminy" },
  { org: "Zarząd Inwestycji Miejskich we Wrocławiu", expect: "gminy" },
  { org: "Uniwersytet Wrocławski", city: "Wrocław", expect: "uczelnie" },
  { org: "Politechnika Wrocławska", city: "Wrocław", expect: "uczelnie" },
];

console.log("P3.6 strategic client filters\n");
assert("6 filtrów zdefiniowanych", STRATEGIC_CLIENT_FILTERS.length === 6);
assert("MOPS na liście", STRATEGIC_CLIENT_FILTERS.some((f) => f.id === "mops"));

for (const s of samples) {
  const item = {
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    organizationName: s.org,
    title: "",
    organizationCity: s.city ?? "Wrocław",
  };
  assert(`${s.expect} ← ${s.org.slice(0, 40)}`, matchesStrategicClientFilter(item, s.expect));
  for (const f of STRATEGIC_CLIENT_FILTERS) {
    if (f.id !== s.expect) {
      assert(`nie ${f.shortLabel} dla ${s.expect}`, !matchesStrategicClientFilter(item, f.id));
    }
  }
}

const counts = countStrategicClientFilters(samples.map((s) => ({
  priorityBuyerId: null,
  priorityBuyerLabel: null,
  organizationName: s.org,
  title: "",
  organizationCity: s.city ?? "Wrocław",
})));
assert("count wm >= 1", counts.wm >= 1);
assert("count mops >= 1", counts.mops >= 1);

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
