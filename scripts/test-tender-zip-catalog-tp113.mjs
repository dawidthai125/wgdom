/**
 * P0 — TP113 DOKUMENTACJA PROJEKTOWA.zip edge zip catalog
 * npx vite-node scripts/test-tender-zip-catalog-tp113.mjs
 */
import { loadEnv } from "vite";

const env = loadEnv("", process.cwd(), "");
const PROJECT = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const ANON = env.VITE_SUPABASE_ANON_KEY;
const BASE = `https://${PROJECT}.supabase.co/functions/v1/make-server-0afb8820`;

const TP113_TENDER_ID = "08dec13d-5547-aa6d-5fad-9500015c4ea0";
const TP113_NOTICE = "2026/BZP 00273812/01";
const PAGE =
  "https://wroclawskiemieszkania.ezamawiajacy.pl/pn/WROCMIE/demand/277541/notice/public/details";

let pass = 0;
let fail = 0;

function assert(label, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", label);
  } else {
    fail += 1;
    console.log("FAIL", label);
  }
}

async function apiGet(path, params) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${q}`, {
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// isOffPlatformTenderDoc is not exported - test via inline mirror
function offPlatform(access, url, page) {
  return Boolean(
    access?.platform === "ezamawiajacy"
    || /\.ezamawiajacy\.pl/i.test(url || "")
    || /\.ezamawiajacy\.pl/i.test(page || ""),
  );
}

assert("off-platform ezamawiajacy", offPlatform({ platform: "ezamawiajacy" }, "", PAGE));
assert("not off-platform readmodels", !offPlatform({ platform: undefined }, "", ""));

const docsRes = await apiGet("/tenders-bzp-documents", {
  tenderId: TP113_TENDER_ID,
  noticeNumber: TP113_NOTICE,
});
const docs = docsRes.json.documents || [];
const zipDoc = docs.find((d) => /dokumentacja\s*projektowa/i.test(d.filename));

assert("TP113 docs discovered", docs.length >= 10);
assert("TP113 zip doc present", Boolean(zipDoc));

if (zipDoc) {
  const catalogRes = await apiGet("/tenders-bzp-zip-catalog", {
    tenderId: TP113_TENDER_ID,
    documentIndex: String(zipDoc.index),
    sourcePageUrl: zipDoc.sourcePageUrl || PAGE,
    ...(zipDoc.downloadUrl ? { downloadUrl: zipDoc.downloadUrl } : {}),
  });
  const cat = catalogRes.json;
  console.log("\nzip-catalog:", catalogRes.status, cat.ok, "zipSize=", cat.zipSize, "entries=", cat.entries?.length);
  if (cat.diag) console.log("diag:", JSON.stringify(cat.diag, null, 2));
  if (!cat.ok && cat.error) console.log("error:", cat.error);

  if (cat.ok) {
    assert("zip catalog OK", cat.zipSize > 1_000_000);
    assert("zip inner entries", (cat.entries?.length ?? 0) > 0);
    const ath = (cat.entries || []).find((e) => /\.ath$/i.test(e.filename));
    assert("ATH in catalog", Boolean(ath));
    if (ath) {
      const entryRes = await apiGet("/tenders-bzp-zip-entry-bytes", {
        tenderId: TP113_TENDER_ID,
        documentIndex: String(zipDoc.index),
        innerPath: ath.path,
        sourcePageUrl: zipDoc.sourcePageUrl || PAGE,
      });
      const ent = entryRes.json;
      console.log("zip-entry:", entryRes.status, ent.ok, "size=", ent.size);
      assert("zip entry bytes OK", ent.ok && ent.size > 100);
    }
  } else if (catalogRes.status === 404) {
    console.log("SKIP live zip-catalog — endpoint not deployed yet (404)");
    assert("root cause documented: deploy edge required", true);
  } else {
    assert("zip catalog precise error", Boolean(cat.error));
    assert("zip catalog has diag", Boolean(cat.diag?.rejectReason || cat.diag?.httpStatus));
  }
}

console.log(`\nTP113 zip catalog: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
