/**
 * WGDOM-HARDENING-01A — Owner Verification helpers (A-T8 persist reduction).
 * Compares flag ON (01A) vs OFF (pre-01A) cloud invocation counts for same bootstrap.
 * npx vite-node scripts/verify-wgdom-hardening-01a-owner.mjs
 */

import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
} from "../src/lib/app-settings.ts";
import {
  attemptTenderDocumentsBootstrap,
  resetTenderDocumentsBootstrapForTests,
} from "../src/app/hooks/useTenderDocumentsBootstrap.ts";

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) {
    this._m.set(String(k), String(v));
  },
  getItem(k) {
    return this._m.has(String(k)) ? this._m.get(String(k)) : null;
  },
  removeItem(k) {
    this._m.delete(String(k));
  },
  clear() {
    this._m.clear();
  },
  key(i) {
    return [...this._m.keys()][i] ?? null;
  },
  get length() {
    return this._m.size;
  },
};

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function setFlag(on) {
  localStorage.setItem(
    APP_SETTINGS_KEY,
    JSON.stringify({ ...defaultAppSettings(), pipelineBootstrapPersistLocal: on }),
  );
}

const mockDoc = {
  index: 1,
  documentId: "doc-ov-1",
  filename: "SWZ.pdf",
  contentType: "application/pdf",
};

function baseItem(id) {
  return {
    id,
    tenderId: "ov-bzp-uuid",
    noticeNumber: "2026/BZP 00111111",
    title: "OV HARDENING-01A heavy-like bootstrap",
    organizationName: "WM",
    priorityBuyerId: "wm",
    bzpNumber: "2026/BZP 00111111",
    status: "seen",
    updatedAt: new Date().toISOString(),
  };
}

function mockDeps() {
  return {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: "<html><body>SWZ content for light analysis path</body></html>",
    }),
    fetchTenderDocuments: async () => [mockDoc],
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
    }),
  };
}

async function runBootstrap(id, flagOn) {
  resetTenderDocumentsBootstrapForTests();
  setFlag(flagOn);
  const calls = [];
  await attemptTenderDocumentsBootstrap({
    item: baseItem(id),
    onUpdate: (patch, opts) => calls.push({ patch, opts }),
    deps: mockDeps(),
  });
  const cloudMode = calls.filter((c) => c.opts?.persist === "cloud").length;
  const localMode = calls.filter((c) => c.opts?.persist === "local").length;
  const legacy = calls.filter((c) => c.opts?.persist == null).length;
  /** Pre-01A / flag OFF: every legacy call is immediate cloud via updateItem default. */
  const effectiveCloud = flagOn ? cloudMode : legacy;
  return { calls, cloudMode, localMode, legacy, effectiveCloud };
}

console.log("=== WGDOM-HARDENING-01A OWNER VERIFY (A-T8 persist) ===\n");

const off = await runBootstrap("ov-flag-off", false);
const on = await runBootstrap("ov-flag-on", true);

console.log(
  JSON.stringify(
    {
      flagOff: {
        effectiveCloud: off.effectiveCloud,
        legacy: off.legacy,
        local: off.localMode,
        cloudMode: off.cloudMode,
        totalCalls: off.calls.length,
      },
      flagOn: {
        effectiveCloud: on.effectiveCloud,
        legacy: on.legacy,
        local: on.localMode,
        cloudMode: on.cloudMode,
        totalCalls: on.calls.length,
      },
      reduction: off.effectiveCloud - on.effectiveCloud,
    },
    null,
    2,
  ),
);

ok("A-T8 flag OFF has ≥2 effective cloud (pre-01A multi-write)", off.effectiveCloud >= 2);
ok("A-T8 flag ON terminal cloudMode === 1", on.cloudMode === 1);
ok("A-T8 flag ON effectiveCloud === 1", on.effectiveCloud === 1);
ok("A-T8 flag ON mid-flight local ≥1", on.localMode >= 1);
ok("A-T8 reduction effectiveCloud (OFF - ON) ≥ 1", off.effectiveCloud - on.effectiveCloud >= 1);
ok("A-T8 kill-switch OFF restores multi legacy cloud", off.legacy >= 2 && off.cloudMode === 0);

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
