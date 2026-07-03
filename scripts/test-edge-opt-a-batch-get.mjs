/**
 * EDGE-OPT-A — order-preserving batch-get (A1 rdzeń).
 * npx vite-node scripts/test-edge-opt-a-batch-get.mjs
 *
 * Testuje czysty rdzeń helpera (kv-batch-order.ts), którego kv.mget używa 1:1.
 * Kontrakt DESIGN FREEZE §4 / AC1–AC5.
 */
import {
  orderValuesByKeys,
  mgetWith,
} from "../supabase/functions/make-server-0afb8820/kv-batch-order.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}
const J = (x) => JSON.stringify(x);
const V = (k) => ({ id: k, payload: `val-${k}` });
const rows = (...ks) => ks.map((k) => ({ key: k, value: V(k) }));
const shuffle = (arr) => arr.map((x) => x).sort(() => Math.random() - 0.5);

console.log("=== EDGE-OPT-A BATCH-GET ORDER-PRESERVING ===\n");

// ─── T-A1 — kolejność zachowana (DB zwraca w innej kolejności) (AC2) ─────────
{
  const keys = ["k3", "k1", "k2"];
  const dbRows = rows("k1", "k2", "k3"); // kolejność fizyczna DB ≠ keys
  const out = orderValuesByKeys(keys, dbRows);
  assert("T-A1 length == keys.length", out.length === 3);
  assert("T-A1 order == input order", J(out) === J([V("k3"), V("k1"), V("k2")]));
}

// ─── T-A2 — brakujący klucz → null (AC3) ────────────────────────────────────
{
  const keys = ["k1", "kX", "k2"];
  const dbRows = rows("k1", "k2"); // kX nieobecny
  const out = orderValuesByKeys(keys, dbRows);
  assert("T-A2 length == keys.length", out.length === 3);
  assert("T-A2 missing → null at right pos", out[1] === null);
  assert("T-A2 present preserved", J(out[0]) === J(V("k1")) && J(out[2]) === J(V("k2")));
}

// ─── T-A3 — duplikaty kluczy (AC4) ──────────────────────────────────────────
{
  const keys = ["k1", "k1"];
  const dbRows = rows("k1"); // DB zwraca 1 wiersz
  const out = orderValuesByKeys(keys, dbRows);
  assert("T-A3 duplicates → [v,v]", J(out) === J([V("k1"), V("k1")]));
  const keysMix = ["k1", "k2", "k1"];
  const outMix = orderValuesByKeys(keysMix, rows("k1", "k2"));
  assert("T-A3 mixed dup order", J(outMix) === J([V("k1"), V("k2"), V("k1")]));
}

// ─── T-A4 — pusta lista → [] BEZ zapytania (AC5) ────────────────────────────
await (async () => {
  let calls = 0;
  const fetchRows = async () => { calls += 1; return []; };
  const out = await mgetWith([], fetchRows);
  assert("T-A4 empty → []", Array.isArray(out) && out.length === 0);
  assert("T-A4 zero DB queries", calls === 0);
})();

// ─── T-A5 — golden parity: nowy helper == Promise.all(kv.get) (wire) (AC6) ──
await (async () => {
  // Symulacja stanu KV
  const store = new Map([
    ["a", V("a")], ["b", V("b")], ["c", V("c")], ["e", V("e")],
  ]);
  const keys = ["c", "a", "missing", "b", "a", "e"]; // braki + duplikaty + kolejność

  // Referencja: Promise.all(keys.map(kv.get)) — get zwraca undefined dla braku,
  // co po JSON (odpowiedź HTTP) staje się null. Odwzorowujemy semantykę „po drucie".
  const getBased = keys.map((k) => (store.has(k) ? store.get(k) : null));

  // Kandydat: mgetWith z fetchRows zwracającym wiersze w LOSOWEJ kolejności.
  const fetchRows = async (ks) => {
    const present = ks.filter((k) => store.has(k));
    const uniq = [...new Set(present)];
    return shuffle(uniq.map((k) => ({ key: k, value: store.get(k) })));
  };
  const candidate = await mgetWith(keys, fetchRows);

  assert("T-A5 length parity", candidate.length === getBased.length);
  assert("T-A5 golden parity (order+null+dup)", J(candidate) === J(getBased));

  // Bonus kontrakt §4/§7: błąd DB propaguje się (throw)
  let threw = false;
  try {
    await mgetWith(["x"], async () => { throw new Error("db-fail"); });
  } catch (e) {
    threw = e instanceof Error && e.message === "db-fail";
  }
  assert("T-A5 throw on DB error", threw);
})();

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
