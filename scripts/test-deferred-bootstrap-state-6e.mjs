/**
 * Bundle #6E — deferred bootstrap state + unified hydration.
 * npx vite-node scripts/test-deferred-bootstrap-state-6e.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-6e-deferred";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-6e";

import {
  createInitialDeferredBootstrapState,
  markDeferredBootstrapDone,
  markDeferredBootstrapRunning,
} from "../src/lib/deferred-bootstrap-state.ts";
import { collectDeferredAdminHydrationPatch } from "../src/lib/deferred-bootstrap-hydrate.ts";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "../src/lib/deferred-bootstrap-types.ts";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT as CLOUD_SYNC_EVENT } from "../src/lib/cloud-sync.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    fail += 1;
    return;
  }
  console.log(`PASS: ${msg}`);
  pass += 1;
}

console.log("=== T-6E-1 — FSM phase transitions ===");
let state = createInitialDeferredBootstrapState();
assert(state.phase === "idle" && state.generation === 0, "initial idle generation 0");
state = markDeferredBootstrapRunning(state);
assert(state.phase === "running" && state.generation === 0, "running keeps generation 0");
state = markDeferredBootstrapDone(state);
assert(state.phase === "done" && state.generation === 1, "done increments generation");
state = markDeferredBootstrapDone(state);
assert(state.phase === "done" && state.generation === 2, "done increments again");

console.log("\n=== T-6E-5 — event name backward compat ===");
assert(
  WGDOM_DEFERRED_BOOTSTRAP_EVENT === CLOUD_SYNC_EVENT,
  "event name matches cloud-sync export",
);
assert(
  WGDOM_DEFERRED_BOOTSTRAP_EVENT === "wgdom-deferred-bootstrap",
  "event name unchanged",
);

console.log("\n=== T-6E-2 — hydrate contacts from LS ===");
storage.clear();
localStorage.setItem(
  "kw-contacts",
  JSON.stringify([{ id: "c1", email: "a@b.c", name: "Test", tags: [] }]),
);
const patchContacts = await collectDeferredAdminHydrationPatch();
assert(
  Array.isArray(patchContacts.contacts) && patchContacts.contacts.length === 1,
  "contacts hydrated from LS",
);
assert(patchContacts.contacts[0].id === "c1", "contact id preserved");

console.log("\n=== T-6E-3 — tombstone filter employee leaves ===");
storage.clear();
localStorage.setItem(
  "kw-employee-leaves",
  JSON.stringify([
    { id: "leave-1", employeeId: "e1", from: "2026-01-01", to: "2026-01-02" },
    { id: "leave-2", employeeId: "e2", from: "2026-01-03", to: "2026-01-04" },
  ]),
);
localStorage.setItem(
  "kw-employee-leaves-deleted-ids",
  JSON.stringify(["leave-2"]),
);
const patchLeaves = await collectDeferredAdminHydrationPatch();
assert(
  patchLeaves.employeeLeaves?.length === 1 && patchLeaves.employeeLeaves[0].id === "leave-1",
  "deleted leave filtered from hydration patch",
);

console.log(`\nDEFERRED BOOTSTRAP #6E: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
