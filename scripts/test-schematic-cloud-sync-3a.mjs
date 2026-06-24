/**
 * WM-SCHEMATY-V1 Faza 3A — integracja cloud-sync + storage (bez UI).
 * Uruchom: npx vite-node scripts/test-schematic-cloud-sync-3a.mjs
 */
import {
  BOOTSTRAP_DEFERRED_KEYS,
  DATA_KEYS,
  mergeDataKey,
  mergeIncomingWithStored,
} from "../src/lib/cloud-sync.ts";
import { serializeElectricalSchematicsForStorage } from "../src/lib/electrical-schematics/merge.ts";
import { normalizeElectricalSchematics } from "../src/lib/electrical-schematics/normalize.ts";
import {
  computeSchematicDomainReport,
  upsertSchematic,
} from "../src/lib/electrical-schematics/report.ts";
import {
  mergeElectricalSchematicsFromSources,
  pushElectricalSchematicsToCloud,
  readElectricalSchematicsFromLocalStorage,
} from "../src/lib/electrical-schematics/sync.ts";
import { buildSchematicFromTemplate } from "../src/lib/electrical-schematics/start-templates.ts";
import { ELECTRICAL_SCHEMATICS_KEY } from "../src/lib/electrical-schematics/types.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const d1 = buildSchematicFromTemplate("template-apartment-1f-default", {
  diagramId: "sync-3a-1",
  address: "Adres A",
});
const d2 = buildSchematicFromTemplate("template-apartment-3f-default", {
  diagramId: "sync-3a-2",
  address: "Adres B",
});

console.log("=== C01 — DATA_KEYS + deferred bootstrap ===");
{
  assert(DATA_KEYS.includes(ELECTRICAL_SCHEMATICS_KEY), "C01 in DATA_KEYS");
  assert(BOOTSTRAP_DEFERRED_KEYS.includes(ELECTRICAL_SCHEMATICS_KEY), "C01 in BOOTSTRAP_DEFERRED_KEYS");
  assert(ELECTRICAL_SCHEMATICS_KEY === "kw-electrical-schematics", "C01 KV name");
}

console.log("\n=== C02 — normalize invalid / valid ===");
{
  assert(normalizeElectricalSchematics(null).length === 0, "C02 null → []");
  assert(normalizeElectricalSchematics([{ id: "" }]).length === 0, "C02 drop invalid");
  const norm = normalizeElectricalSchematics([d1]);
  assert(norm.length === 1, "C02 one valid");
  assert(norm[0].layoutProfile === "apartment-1f-v1", "C02 layout preserved");
}

console.log("\n=== C03 — mergeDataKey (cloud-sync) LWW ===");
{
  const local = [{ ...d1, updatedAt: "2026-06-20T10:00:00.000Z", address: "LOCAL" }];
  const cloud = [{ ...d1, updatedAt: "2026-06-21T10:00:00.000Z", address: "CLOUD" }];
  const merged = mergeDataKey(ELECTRICAL_SCHEMATICS_KEY, local, cloud);
  assert(Array.isArray(merged), "C03 array");
  assert(merged.length === 1, "C03 one item");
  assert(merged[0].address === "CLOUD", "C03 cloud wins LWW");
}

console.log("\n=== C04 — merge union + mergeIncomingWithStored ===");
{
  const union = mergeDataKey(ELECTRICAL_SCHEMATICS_KEY, [d1], [d2]);
  assert(union.length === 2, "C04 union two ids");
  const stored = [{ ...d1, updatedAt: "2026-06-22T12:00:00.000Z", address: "STORED" }];
  const incoming = [{ ...d1, updatedAt: "2026-06-21T12:00:00.000Z", address: "INCOMING" }];
  const merged = mergeIncomingWithStored(ELECTRICAL_SCHEMATICS_KEY, stored, incoming);
  assert(merged[0].address === "STORED", "C04 stored wins over incoming");
}

console.log("\n=== C05 — merge strips invalid via normalize ===");
{
  const merged = mergeDataKey(ELECTRICAL_SCHEMATICS_KEY, [d1, { id: "" }], []);
  assert(merged.length === 1, "C05 invalid stripped in merge");
  assert(merged[0].id === "sync-3a-1", "C05 valid kept");
}

console.log("\n=== C06 — LS roundtrip (mock) ===");
{
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  const payload = serializeElectricalSchematicsForStorage([d1, d2]);
  storage.set(ELECTRICAL_SCHEMATICS_KEY, JSON.stringify(payload));
  const fromLs = readElectricalSchematicsFromLocalStorage();
  assert(fromLs.length === 2, "C06 LS read count");
  assert(fromLs.some((d) => d.id === "sync-3a-1"), "C06 LS id sch-1");
  assert(fromLs.some((d) => d.id === "sync-3a-2"), "C06 LS id sch-2");
  delete globalThis.localStorage;
}

console.log("\n=== C07 — mergeElectricalSchematicsFromSources ===");
{
  const merged = mergeElectricalSchematicsFromSources([d1], [d2]);
  assert(merged.length === 2, "C07 two from sources");
}

console.log("\n=== C08 — report upsert ===");
{
  const { schematics, report } = upsertSchematic([], d1);
  assert(schematics.length === 1, "C08 upsert add");
  assert(report.added.includes("sync-3a-1"), "C08 report added");
  const updated = { ...d1, address: "Nowy adres", updatedAt: new Date().toISOString() };
  const second = upsertSchematic(schematics, updated);
  const domainReport = computeSchematicDomainReport(schematics, second.schematics);
  assert(second.schematics[0].address === "Nowy adres", "C08 update address");
  assert(domainReport.updated.includes("sync-3a-1"), "C08 report updated");
}

console.log("\n=== C09 — pushElectricalSchematicsToCloud writes LS ===");
{
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  try {
    await pushElectricalSchematicsToCloud([d1]);
  } catch {
    /* push może fail bez Supabase — LS zapis jest pierwszy */
  }
  assert(storage.has(ELECTRICAL_SCHEMATICS_KEY), "C09 LS write");
  const parsed = JSON.parse(storage.get(ELECTRICAL_SCHEMATICS_KEY));
  assert(Array.isArray(parsed) && parsed.length === 1, "C09 LS payload");
  assert(parsed[0].id === "sync-3a-1", "C09 LS diagram id");
  delete globalThis.localStorage;
}

console.log(`\n=== WYNIK: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
console.log("CLOUD SYNC 3A: PASS");
