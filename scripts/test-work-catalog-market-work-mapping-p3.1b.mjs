/**
 * P3.1B — testy słownika mapowania źródeł rynku → roboty WGDOM.
 * npx vite-node scripts/test-work-catalog-market-work-mapping-p3.1b.mjs
 */
import {
  buildMarketWorkMappingIndexForOrigin,
  createEmptyMarketWorkMappingStore,
  findMapping,
  listMappings,
  registerMapping,
  resolveMappingBatch,
  validateMappings,
} from "../src/lib/work-catalog/market-work-mapping.ts";

const TS = "2026-06-28T15:00:00.000Z";

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

let store = createEmptyMarketWorkMappingStore(TS);

const reg1 = registerMapping(store, {
  origin: "kb_pl",
  externalId: "KB-MAL-01",
  workId: "malowanie-scian-m2",
  confidence: 0.9,
  aliases: ["KB-MAL-ALT"],
  updatedAt: TS,
});
store = reg1.store;

console.log("=== WORK CATALOG MARKET WORK MAPPING P3.1B ===\n");

assert("register ok", reg1.result.ok === true);
assert("list count 1", listMappings(store).length === 1);

// ─── mapowanie ─────────────────────────────────────────────────────────────

const byPrimary = findMapping(store, "kb_pl", "KB-MAL-01");
assert("find primary", byPrimary?.mapping.workId === "malowanie-scian-m2");
assert("find via externalId", byPrimary?.matchedVia === "externalId");

const byAlias = findMapping(store, "kb_pl", "kb-mal-alt");
assert("find alias case-insensitive", byAlias?.matchedVia === "alias");

const index = buildMarketWorkMappingIndexForOrigin(store, "kb_pl");
assert("adapter index hit", index.byExternalCode["kb-mal-01"]?.workId === "malowanie-scian-m2");

// ─── confidence ────────────────────────────────────────────────────────────

assert("confidence preserved", byPrimary?.mapping.confidence === 0.9);

const regLow = registerMapping(store, {
  origin: "interbud",
  externalId: "INT-1",
  workId: "legacy-malowanie-m2",
  confidence: 0.55,
  aliases: [],
});
assert("low confidence valid", regLow.result.ok === true);

// ─── duplikaty ─────────────────────────────────────────────────────────────

const dup = registerMapping(regLow.store, {
  origin: "interbud",
  externalId: "INT-1",
  workId: "other-work",
  confidence: 0.8,
  aliases: [],
});
assert("duplicate rejected", dup.result.ok === false && dup.result.reason === "duplicate_external");

const replace = registerMapping(regLow.store, {
  origin: "interbud",
  externalId: "INT-1",
  workId: "legacy-malowanie-m2",
  confidence: 0.88,
  aliases: [],
}, { allowReplace: true });
assert("replace allowed", replace.result.ok === true && replace.result.replaced === true);

// ─── brak mapowania ────────────────────────────────────────────────────────

const report = resolveMappingBatch(replace.store, [
  { origin: "kb_pl", externalId: "KB-MAL-01" },
  { origin: "kb_pl", externalId: "UNKNOWN-999" },
  { origin: "kb_pl", externalId: "" },
  { origin: "kb_pl", externalId: "KB-MAL-01" },
]);

assert("report matched", report.matched.length === 1);
assert("report unmatched", report.unmatched.length === 1);
assert("report rejected empty + dup batch", report.rejected.length === 2);
assert("unmatched reason", report.unmatched[0].reason === "not_found");

// ─── validateMappings ──────────────────────────────────────────────────────

const valid = validateMappings(listMappings(replace.store), {
  knownWorkIds: new Set(["malowanie-scian-m2", "legacy-malowanie-m2"]),
});
assert("validateMappings ok", valid.ok === true);

const invalid = validateMappings([
  {
    origin: "kb_pl",
    externalId: "X",
    workId: "missing-work",
    confidence: 2,
    aliases: [],
  },
]);
assert("validateMappings invalid shape", invalid.ok === false);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
