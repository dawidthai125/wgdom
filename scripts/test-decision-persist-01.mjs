/**
 * DECISION-PERSIST-01 — harness (append-only · hydrate · history · LOCK).
 * npx vite-node scripts/test-decision-persist-01.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  DECISION_PERSIST_LS_KEY,
  buildValidationSnapshot,
  emptyDecisionPersistStore,
  hydrateDecision,
  listDecisionHistory,
  loadDecisionPersistStore,
  recordDecision,
} from "../src/lib/decision-persist/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Minimal LS polyfill for Node. */
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => {
      mem.set(String(k), String(v));
    },
    removeItem: (k) => {
      mem.delete(String(k));
    },
    clear: () => mem.clear(),
  };
}

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(e);
  }
}

function resetStore() {
  localStorage.removeItem(DECISION_PERSIST_LS_KEY);
}

function baseInput(overrides = {}) {
  return {
    tenderId: "tender-1",
    caseId: "case-1",
    action: "approve",
    scenario: "rekomendowany",
    actor: { userId: "dawid", displayName: "Dawid" },
    dossierFinishedAt: "2026-08-08T12:00:00.000Z",
    validationSnapshot: {
      verdict: "validated",
      hardCount: 0,
      softCount: 1,
    },
    ...overrides,
  };
}

console.log("=== DECISION-PERSIST-01 ===\n");

ok("T1 empty store", () => {
  resetStore();
  const s = loadDecisionPersistStore();
  assert.equal(s.version, 1);
  assert.equal(s.records.length, 0);
  assert.deepEqual(emptyDecisionPersistStore(), { version: 1, records: [] });
});

ok("T2 recordDecision appends new UUID", () => {
  resetStore();
  const a = recordDecision(baseInput());
  const b = recordDecision(baseInput({ action: "reject", scenario: null }));
  assert.ok(a);
  assert.ok(b);
  assert.notEqual(a.decisionId, b.decisionId);
  assert.equal(a.audit.kind, "recorded");
  assert.equal(a.schemaVersion, 1);
  assert.equal(listDecisionHistory().length, 2);
});

ok("T3 no lastModified / update fields", () => {
  resetStore();
  const r = recordDecision(baseInput());
  assert.ok(r);
  assert.equal("lastModified" in r, false);
  assert.equal("updatedAt" in r, false);
  const json = JSON.stringify(r);
  assert.equal(json.includes("lastModified"), false);
  assert.equal(json.includes("updatedAt"), false);
});

ok("T4 hydrateDecision latest match fingerprint", () => {
  resetStore();
  recordDecision(
    baseInput({
      action: "needs_review",
      scenario: null,
      createdAt: undefined,
    }),
  );
  const first = listDecisionHistory()[0];
  // second later decision
  const second = recordDecision(
    baseInput({ action: "approve", scenario: "bezpieczny" }),
  );
  assert.ok(second);
  const hydrated = hydrateDecision(
    "tender-1",
    "case-1",
    "2026-08-08T12:00:00.000Z",
  );
  assert.ok(hydrated);
  assert.equal(hydrated.action, "approve");
  assert.equal(hydrated.scenarioStrategy, "bezpieczny");
  assert.equal(hydrated.caseId, "case-1");
  assert.equal(hydrated.decidedAt, second.createdAt);
  assert.ok(first);
});

ok("T5 fingerprint mismatch → null hydrate · history kept", () => {
  resetStore();
  recordDecision(baseInput());
  assert.equal(
    hydrateDecision("tender-1", "case-1", "2026-08-08T99:00:00.000Z"),
    null,
  );
  assert.equal(listDecisionHistory({ tenderId: "tender-1" }).length, 1);
});

ok("T6 listDecisionHistory filter", () => {
  resetStore();
  recordDecision(baseInput({ tenderId: "t-a", caseId: "c-a" }));
  recordDecision(baseInput({ tenderId: "t-b", caseId: "c-b" }));
  assert.equal(listDecisionHistory({ tenderId: "t-a" }).length, 1);
  assert.equal(listDecisionHistory({ caseId: "c-b" }).length, 1);
});

ok("T7 invalid input → null · reject scenario cleared", () => {
  resetStore();
  assert.equal(recordDecision(baseInput({ tenderId: "" })), null);
  assert.equal(recordDecision(baseInput({ caseId: "" })), null);
  const r = recordDecision(
    baseInput({ action: "reject", scenario: "should-clear" }),
  );
  assert.ok(r);
  assert.equal(r.scenario, null);
});

ok("T8 buildValidationSnapshot duck-type", () => {
  const snap = buildValidationSnapshot({
    verdict: "blocked",
    report: { hardCount: 2, softCount: 3 },
  });
  assert.deepEqual(snap, {
    verdict: "blocked",
    hardCount: 2,
    softCount: 3,
  });
  assert.equal(buildValidationSnapshot(null), null);
  assert.equal(buildValidationSnapshot({ verdict: "nope" }), null);
});

ok("T9 storage key locked", () => {
  assert.equal(DECISION_PERSIST_LS_KEY, "kw-decision-persist-v1");
  resetStore();
  recordDecision(baseInput());
  const raw = localStorage.getItem(DECISION_PERSIST_LS_KEY);
  assert.ok(raw);
  assert.equal(raw.includes("kw-tender-decisions"), false);
});

ok("T10 public API names exist on index", () => {
  const idx = fs.readFileSync(
    path.join(root, "src/lib/decision-persist/index.ts"),
    "utf8",
  );
  assert.match(idx, /recordDecision/);
  assert.match(idx, /hydrateDecision/);
  assert.match(idx, /listDecisionHistory/);
  assert.equal(idx.includes("upsert"), false);
  assert.equal(idx.includes("deleteDecision"), false);
});

ok("T11 Host is only persist wire caller in app", () => {
  const host = fs.readFileSync(
    path.join(root, "src/app/decision-workspace/DecisionWorkspaceHost.tsx"),
    "utf8",
  );
  assert.match(host, /recordDecision/);
  assert.match(host, /hydrateDecision/);
  assert.match(host, /kw-decision-workspace|isDecisionWorkspaceEnabled/);

  const appDir = path.join(root, "src/app");
  const hits = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(ent.name)) {
        const src = fs.readFileSync(p, "utf8");
        if (
          src.includes('from "@/lib/decision-persist"') ||
          src.includes("from '@/lib/decision-persist'")
        ) {
          hits.push(path.relative(root, p).replace(/\\/g, "/"));
        }
      }
    }
  }
  walk(appDir);
  assert.deepEqual(hits, [
    "src/app/decision-workspace/DecisionWorkspaceHost.tsx",
  ]);
});

ok("T12 NO TOUCH BC markers (paths unchanged in allowlist spirit)", () => {
  const forbid = [
    "src/lib/execution-expert",
    "src/lib/chief-orchestrator",
    "src/lib/chief-session",
    "src/lib/validation-expert",
    "src/lib/chief-wire-adapters",
    "src/lib/technology-foundation",
  ];
  // harness cannot git-diff; assert decision-persist does not import them
  const api = fs.readFileSync(
    path.join(root, "src/lib/decision-persist/api.ts"),
    "utf8",
  );
  const store = fs.readFileSync(
    path.join(root, "src/lib/decision-persist/store.ts"),
    "utf8",
  );
  const types = fs.readFileSync(
    path.join(root, "src/lib/decision-persist/types.ts"),
    "utf8",
  );
  const blob = api + store + types;
  for (const p of forbid) {
    assert.equal(blob.includes(p), false, `must not import ${p}`);
  }
  assert.equal(blob.includes("tenders-strategy-owner-decisions"), false);
  assert.equal(blob.includes("analyzeValidation"), false);
  assert.equal(blob.includes("analyzeExecution"), false);
});

ok("T13 allowlist paths exist", () => {
  const paths = [
    "src/lib/decision-persist/types.ts",
    "src/lib/decision-persist/store.ts",
    "src/lib/decision-persist/api.ts",
    "src/lib/decision-persist/index.ts",
    "src/app/decision-workspace/DecisionWorkspaceHost.tsx",
    "scripts/test-decision-persist-01.mjs",
  ];
  for (const p of paths) {
    assert.ok(fs.existsSync(path.join(root, p)), p);
  }
});

ok("T14 Hub passes tenderId prop (thin drill)", () => {
  const hub = fs.readFileSync(
    path.join(root, "src/app/TenderWorkflowHubPanel.tsx"),
    "utf8",
  );
  assert.match(hub, /tenderId=\{item\.id\}/);
  assert.equal(hub.includes("recordDecision"), false);
  assert.equal(hub.includes("@/lib/decision-persist"), false);
});

console.log(`\nRESULT  ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
