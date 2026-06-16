/**
 * P0 — symulacja generacji ZI z prod KV (post-cleanup): brak LiveCycle guard.
 */
import { loadEnv } from "vite";
import { parseJobAddressParts } from "../src/lib/wm-print/address-vars.ts";
import {
  buildWmPrintFilesForJob,
  generateFromTemplateBytes,
} from "../src/lib/wm-print/generate-zip.ts";
import { detectLegacyLiveCycleZiForm } from "../src/lib/wm-print/generate-pdf-zi-tauron2026.ts";
import { getEnabledWmPrintTemplates, dedupeWmPrintTemplatesByName, parseWmPrintTemplates } from "../src/lib/wm-print/templates.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const LEGACY_ID = "26f02c78-871c-4d65-aeac-d0ca06bf060c";
const CANONICAL_ID = "2b22da48-46dc-42a0-8236-d42b5b5562dc";

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const kvRes = await fetch(`${BASE}/batch-get`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ keys: ["kw-wm-print-templates", "kw-wm-print-deleted-template-ids"] }),
});
const kvJson = await kvRes.json();
const templates = parseWmPrintTemplates(kvJson?.values?.[0] ?? []);
const deletedIds = kvJson?.values?.[1] ?? [];

const zi = getEnabledWmPrintTemplates(templates).filter((t) => t.name === "ZI");
const deduped = dedupeWmPrintTemplatesByName(getEnabledWmPrintTemplates(templates)).filter((t) => t.name === "ZI");

const assert = (c, m) => {
  if (!c) throw new Error(`FAIL: ${m}`);
  console.log(`PASS: ${m}`);
};

assert(!templates.some((t) => t.id === LEGACY_ID), "legacy not in KV templates");
assert(deletedIds.includes(LEGACY_ID), "legacy in tombstones");
assert(zi.length === 1, `single ZI in KV (got ${zi.length})`);
assert(zi[0].id === CANONICAL_ID, "canonical ZI id");
assert(deduped.length === 1, "dedupe single ZI");

const job = {
  id: "b7053423-1512-4fc4-9670-058d1ade6cad",
  address: "Sępa Szarzyńskiego 83",
  flatNumber: "7",
};
const vars = buildWmPrintVariableMap(job, DEFAULT_WM_PRINT_SETTINGS, { dateMode: "today" });
assert(vars.JOB_STREET === "Sępa Szarzyńskiego", "address parse street");

const ziTpl = deduped[0];
const url = ziTpl.files?.[0]?.storageUrl;
assert(!!url, "ZI storageUrl");
const sourceBytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
assert(!detectLegacyLiveCycleZiForm(sourceBytes), "prod ZI.pdf not legacy");

let threw = "";
try {
  await generateFromTemplateBytes(ziTpl, sourceBytes, vars);
} catch (e) {
  threw = e instanceof Error ? e.message : String(e);
}
assert(!threw.includes("LiveCycle"), `no LiveCycle error (got: ${threw || "none"})`);

const out = await generateFromTemplateBytes(ziTpl, sourceBytes, vars);
assert(!!out && out.length > 50000, `ZI PDF generated (${out?.length ?? 0} bytes)`);

const files = await buildWmPrintFilesForJob(job, templates, [], DEFAULT_WM_PRINT_SETTINGS, { dateMode: "today" });
const ziFile = files.find((f) => f.templateId === CANONICAL_ID);
assert(!!ziFile, "ZIP pipeline includes canonical ZI");
assert(files.every((f) => f.templateId !== LEGACY_ID), "ZIP pipeline excludes legacy id");

console.log("\n=== P0 ZI ZIP SIMULATION PASS ===");
console.log("ZI entry:", ziFile?.fileName, ziFile?.bytes.length, "bytes");
