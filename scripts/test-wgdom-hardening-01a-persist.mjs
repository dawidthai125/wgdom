/**
 * WGDOM-HARDENING-01A — Persist SSOT gates (A-T1…A-T5 + A-T2b).
 * npx vite-node scripts/test-wgdom-hardening-01a-persist.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
} from "../src/lib/app-settings.ts";
import { bindTenderPipelineOnUpdate } from "../src/lib/tender-pipeline/bind-tender-pipeline-on-update.ts";
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
    return this._m.length ?? this._m.size;
  },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

function setBootstrapLocalFlag(on) {
  localStorage.setItem(
    APP_SETTINGS_KEY,
    JSON.stringify({ ...defaultAppSettings(), pipelineBootstrapPersistLocal: on }),
  );
}

const ITEM_ID = "h01a-bootstrap-item";
const TENDER_ID = "h01a-bzp-uuid";
const mockDoc = {
  index: 1,
  documentId: "doc-1",
  filename: "SWZ.pdf",
  contentType: "application/pdf",
};

function baseItem(overrides = {}) {
  return {
    id: ITEM_ID,
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00099999",
    title: "HARDENING-01A test",
    organizationName: "WM",
    priorityBuyerId: "wm",
    bzpNumber: "2026/BZP 00099999",
    status: "seen",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockDeps() {
  return {
    fetchTenderNoticeDetails: async () => ({
      tenderState: "Open",
      htmlBody: "<html><body>SWZ content for light analysis</body></html>",
    }),
    fetchTenderDocuments: async () => [mockDoc],
    discoverExternalTenderDocs: async () => ({
      builtAt: new Date().toISOString(),
      files: [],
    }),
  };
}

function classifyCalls(calls) {
  const mid = [];
  const terminal = [];
  const legacy = [];
  for (const c of calls) {
    const mode = c.opts?.persist;
    if (mode === "local") mid.push(c);
    else if (mode === "cloud") terminal.push(c);
    else legacy.push(c);
  }
  return { mid, terminal, legacy };
}

console.log("=== WGDOM-HARDENING-01A Persist SSOT ===\n");

// A-T3 — adapter arity
{
  const seen = [];
  const updateItem = (id, patch, opts) => {
    seen.push({ id, patch, opts });
  };
  const onUpdate = bindTenderPipelineOnUpdate(updateItem, "item-x");
  onUpdate({ notes: "n" }, { persist: "local" });
  ok(
    "A-T3 bind forwards opts.persist=local",
    seen.length === 1
      && seen[0].id === "item-x"
      && seen[0].opts?.persist === "local"
      && seen[0].patch?.notes === "n",
  );
}

// A-T1 / A-T2 — flag ON: mid local, exactly 1 terminal cloud
{
  resetTenderDocumentsBootstrapForTests();
  setBootstrapLocalFlag(true);
  const calls = [];
  await attemptTenderDocumentsBootstrap({
    item: baseItem(),
    onUpdate: (patch, opts) => calls.push({ patch, opts }),
    deps: mockDeps(),
  });
  const { mid, terminal, legacy } = classifyCalls(calls);
  ok("A-T1 mid-flight uses persist:local (≥1)", mid.length >= 1);
  ok("A-T1 no legacy/default mid calls before terminal", legacy.length === 0);
  ok("A-T2 exactly 1 terminal persist:cloud", terminal.length === 1);
  ok(
    "A-T2 terminal is empty-patch flush",
    terminal.length === 1 && Object.keys(terminal[0].patch ?? {}).length === 0,
  );
}

// A-T2b — cancel after start → no terminal cloud
{
  resetTenderDocumentsBootstrapForTests();
  setBootstrapLocalFlag(true);
  const calls = [];
  let cancelAfterDiscovery = false;
  await attemptTenderDocumentsBootstrap({
    item: baseItem({ id: "h01a-cancel" }),
    onUpdate: (patch, opts) => calls.push({ patch, opts }),
    isCancelled: () => cancelAfterDiscovery,
    deps: {
      fetchTenderNoticeDetails: async () => {
        cancelAfterDiscovery = true;
        return {
          tenderState: "Open",
          htmlBody: "<html><body>SWZ cancel path</body></html>",
        };
      },
      fetchTenderDocuments: async () => [mockDoc],
      discoverExternalTenderDocs: async () => ({
        builtAt: new Date().toISOString(),
        files: [],
      }),
    },
  });
  const { terminal } = classifyCalls(calls);
  ok("A-T2b cancel → 0 terminal cloud", terminal.length === 0);
}

// A-T4 — flag OFF → legacy (no persist opts), no dedicated terminal cloud
{
  resetTenderDocumentsBootstrapForTests();
  setBootstrapLocalFlag(false);
  const calls = [];
  await attemptTenderDocumentsBootstrap({
    item: baseItem({ id: "h01a-legacy" }),
    onUpdate: (patch, opts) => calls.push({ patch, opts }),
    deps: mockDeps(),
  });
  const { mid, terminal, legacy } = classifyCalls(calls);
  ok("A-T4 flag OFF — no persist:local", mid.length === 0);
  ok("A-T4 flag OFF — no dedicated terminal cloud", terminal.length === 0);
  ok("A-T4 flag OFF — legacy calls without opts (≥1)", legacy.length >= 1);
}

// A-T5 — grep gate drop-pattern
{
  const dropRe = /onUpdate=\{\(patch\)\s*=>\s*pipeline\.updateItem\(/;
  const appDir = join(ROOT, "src", "app");
  const hits = [];

  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(name.name)) continue;
      const src = readFileSync(p, "utf8");
      if (dropRe.test(src)) hits.push(p.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
    }
  }
  walk(appDir);
  ok("A-T5 no drop-pattern onUpdate={(patch) => pipeline.updateItem(", hits.length === 0);
  if (hits.length) console.log("    hits:", hits.join(", "));
}

// C1 — types live in lib (no app import from bind)
{
  const bindSrc = readFileSync(
    join(ROOT, "src/lib/tender-pipeline/bind-tender-pipeline-on-update.ts"),
    "utf8",
  );
  const typesSrc = readFileSync(
    join(ROOT, "src/lib/tender-pipeline/tender-item-persist.ts"),
    "utf8",
  );
  ok("C1 bind does not import from @/app/", !bindSrc.includes("@/app/"));
  ok("C1 tender-item-persist SSOT exists", typesSrc.includes("TenderItemUpdateOpts"));
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
