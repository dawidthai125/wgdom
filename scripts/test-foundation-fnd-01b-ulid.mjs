/**
 * FND-01b — generator ULID + createId (bez npm).
 * Run: npx vite-node scripts/test-foundation-fnd-01b-ulid.mjs
 */
import {
  PREFIX,
  createUlid,
  createId,
  encodeUlid,
  decodeUlidTime,
  resetUlidMonotonicStateForTests,
  parseId,
  isValidId,
  isValidUlidBody,
  ULID_LENGTH,
} from "../src/lib/wgdom-foundation/id/index.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

console.log("=== FND-01b ULID generator + createId ===\n");

resetUlidMonotonicStateForTests();

const u1 = createUlid();
assert("createUlid length", u1.length === ULID_LENGTH);
assert("createUlid valid body", isValidUlidBody(u1) === true);
assert("createUlid decode time ~now", Math.abs(decodeUlidTime(u1) - Date.now()) < 60_000);

const snap = createId("snapshot");
assert("createId prefix", snap.startsWith(PREFIX.snapshot));
assert("createId valid typed", isValidId(snap, "snapshot") === true);
assert("createId parse", parseId(snap)?.type === "snapshot");
assert("createId bid", isValidId(createId("bid"), "bid") === true);

resetUlidMonotonicStateForTests();
const set = new Set();
for (let i = 0; i < 1000; i++) {
  set.add(createUlid());
}
assert("1000 ulids unique", set.size === 1000);

resetUlidMonotonicStateForTests();
const idSet = new Set();
for (let i = 0; i < 1000; i++) {
  idSet.add(createId("foundation"));
}
assert("1000 createId unique", idSet.size === 1000);

resetUlidMonotonicStateForTests();
const tFixed = 1_700_000_000_000;
const a = createUlid({ nowMs: tFixed });
const b = createUlid({ nowMs: tFixed });
const c = createUlid({ nowMs: tFixed });
assert("monotonic same-ms a < b", a < b);
assert("monotonic same-ms b < c", b < c);
assert(
  "monotonic same-ms same time component",
  decodeUlidTime(a) === tFixed && decodeUlidTime(c) === tFixed,
);

resetUlidMonotonicStateForTests();
const earlier = createUlid({ nowMs: tFixed });
const later = createUlid({ nowMs: tFixed + 5 });
assert("monotonic later time orders", earlier < later);

/** Spec-compatible time encoding for 1469918176385 → 01ARYZ6S41 */
const SPEC_TIME = 1469918176385;
const zeros = new Uint8Array(16);
const gZero = encodeUlid(SPEC_TIME, zeros);
assert("golden time prefix 01ARYZ6S41", gZero.startsWith("01ARYZ6S41"));
assert("golden zeros round-trip time", decodeUlidTime(gZero) === SPEC_TIME);
assert("golden zeros full", gZero === "01ARYZ6S410000000000000000");

const fixed = Uint8Array.from([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]);
const gFixed = encodeUlid(SPEC_TIME, fixed);
assert("golden fixed vector", gFixed === "01ARYZ6S41123456789ABCDEFG");
assert("golden fixed time", decodeUlidTime(gFixed) === SPEC_TIME);

resetUlidMonotonicStateForTests();
const injected = createUlid({
  nowMs: SPEC_TIME,
  random: (buf) => {
    for (let i = 0; i < buf.length; i++) buf[i] = fixed[i];
  },
});
assert("createUlid injected = encodeUlid", injected === gFixed);

resetUlidMonotonicStateForTests();
const injectedId = createId("snapshot", {
  nowMs: SPEC_TIME,
  random: (buf) => {
    for (let i = 0; i < buf.length; i++) buf[i] = fixed[i];
  },
});
assert("createId injected golden", injectedId === `snap_${gFixed}`);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
