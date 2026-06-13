import { loadEnv } from "vite";
import { classifyAthLineCategory, classifyAthLineCategoryWithoutDictionary } from "../src/lib/wgdom-ath-classifier.ts";
import { restoreDefaultUserClassificationDictionaryStore, setUserClassificationDictionaryCache } from "../src/lib/wgdom-user-classification-dictionary.ts";

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const res = await fetch(`${BASE}/batch-get`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ keys: ["kw-tenders-pipeline", "kw-wgdom-classification-dictionary"] }),
});
const j = await res.json();
const items = Array.isArray(j.values?.[0]) ? j.values[0] : JSON.parse(j.values?.[0] ?? "[]");
const userDict = typeof j.values?.[1] === "object" && j.values[1]?.entries
  ? j.values[1]
  : JSON.parse(j.values?.[1] ?? '{"entries":[]}');

setUserClassificationDictionaryCache(userDict);

for (const item of items) {
  const rows = item.tenderDossier?.kosztorys?.catalogQuantities;
  if (!rows?.length) continue;
  console.log("\n===", item.title?.slice(0, 60), "===");
  console.log("org:", item.organizationName);
  console.log("file:", item.tenderDossier?.kosztorys?.sourceFilename);
  console.log("rows:", rows.length, "userDict entries:", userDict.entries?.length ?? 0);
  let unk = 0, unkNoDict = 0;
  const unkDesc = new Map();
  const unkNoDictDesc = new Map();
  for (const r of rows) {
    const cat = classifyAthLineCategory(r.description, r.unit);
    const catNo = classifyAthLineCategoryWithoutDictionary(r.description, r.unit);
    if (cat === "UNKNOWN") {
      unk++;
      unkDesc.set(r.description, (unkDesc.get(r.description) || 0) + 1);
    }
    if (catNo === "UNKNOWN") {
      unkNoDict++;
      unkNoDictDesc.set(r.description, (unkNoDictDesc.get(r.description) || 0) + 1);
    }
  }
  console.log("UNKNOWN with dict:", unk, "without dict:", unkNoDict);
  const unkFull = new Map();
  for (const r of rows) {
    const cat = classifyAthLineCategory(r.description, r.unit);
    if (cat === "UNKNOWN") unkFull.set(r.description, (unkFull.get(r.description) || 0) + 1);
  }
  if (unkFull.size) {
    console.log("  UNKNOWN (pełny klasyfikator):");
    for (const [d, c] of [...unkFull.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${c}× ${d.slice(0, 75)}`);
    }
  }
}

setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
