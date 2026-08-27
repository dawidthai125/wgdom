/**
 * SYNC-ARCH-01 S1-1 — RS push excludes Payroll keys + no replaceWeekEmployeesKeys.
 * Run: npx vite-node scripts/test-sync-arch-01-s1-rs-no-payroll-push.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-sync-arch-s1";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-sync-arch-s1";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

let lastBatchSetBody = null;
const batchSetBodies = [];

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-set")) {
    const body = JSON.parse(opts.body);
    batchSetBodies.push(body);
    lastBatchSetBody = body;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (u.includes("/batch-get")) {
    const { keys } = JSON.parse(opts.body);
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  throw new Error(`unexpected fetch: ${u}`);
};

const {
  DATA_KEYS,
  RS_PUSH_EXCLUDED_PAYROLL_KEYS,
  RS_PUSH_EXCLUDED_CATALOG_DATA_KEYS,
  RS_PUSH_EXCLUDED_DOMAIN_SYNC_KEYS,
  filterRsPushKeysAndValues,
  pushMergedDataBundleToCloud,
  pushWeekEmployeesToCloud,
} = await import("../src/lib/cloud-sync.ts");

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

// ── filterRsPushKeysAndValues (pure) ─────────────────────────────────────────
{
  const keys = ["kw-jobs", "kw-week-employees", "kw-weekFrom", "kw-archive", "kw-directory"];
  const values = [1, 2, 3, 4, 5];
  const { keys: outK, values: outV } = filterRsPushKeysAndValues(keys, values);
  assert("filter usuwa 3 payroll data keys", outK.length === 2 && outK[0] === "kw-jobs" && outK[1] === "kw-directory");
  assert("filter zachowuje wartości non-payroll", outV[0] === 1 && outV[1] === 5);
}

for (const excluded of RS_PUSH_EXCLUDED_DOMAIN_SYNC_KEYS) {
  const { keys: outK } = filterRsPushKeysAndValues([excluded, "kw-jobs"], [null, []]);
  assert(`filter wyklucza ${excluded}`, outK.length === 1 && outK[0] === "kw-jobs");
}

assert(
  "RS_PUSH_EXCLUDED_CATALOG includes work-catalog",
  RS_PUSH_EXCLUDED_CATALOG_DATA_KEYS.includes("kw-wgdom-work-catalog"),
);

// ── pushMergedDataBundleToCloud (integration mock) ─────────────────────────
{
  const merged = DATA_KEYS.map((k) => {
    if (k === "kw-week-employees") return [{ id: "e1", name: "Test" }];
    if (k === "kw-weekFrom") return "2026-06-01";
    if (k === "kw-weekTo") return "2026-06-06";
    if (k === "kw-archive") return [{ weekFrom: "2026-05-01" }];
    if (k === "kw-jobs") return [{ id: "j1" }];
    return null;
  });

  lastBatchSetBody = null;
  batchSetBodies.length = 0;
  await pushMergedDataBundleToCloud(merged);

  assert("batch-set wywołany", batchSetBodies.length > 0);
  const rsBody = batchSetBodies.find(
    (body) =>
      Array.isArray(body.keys)
      && body.keys.includes("kw-jobs")
      && body.workCatalogCas !== true,
  );
  assert("RS batch-set body captured", rsBody != null);
  const { keys, replaceWeekEmployeesKeys, replaceJobsKeys, replaceDirectoryKeys } = rsBody;

  for (const excluded of RS_PUSH_EXCLUDED_PAYROLL_KEYS) {
    assert(`RS push nie zawiera ${excluded}`, !keys.includes(excluded));
  }

  assert("RS push nadal zawiera kw-jobs", keys.includes("kw-jobs"));
  assert("RS push replaceWeekEmployeesKeys puste", (replaceWeekEmployeesKeys ?? []).length === 0);
  assert("RS push replaceJobsKeys zachowane", (replaceJobsKeys ?? []).includes("kw-jobs"));
  assert("RS push replaceDirectoryKeys zachowane", (replaceDirectoryKeys ?? []).includes("kw-directory"));
  assert("RS push mniejszy niż pełny bundle", keys.length < DATA_KEYS.length + 9);
  assert(
    "catalog follow-up uses CAS when present",
    batchSetBodies.some((body) => body.workCatalogCas === true) || batchSetBodies.length === 1,
  );
}

// ── domain push nadal używa replace (regresja INV-2 / INV-4) ─────────────────
{
  lastBatchSetBody = null;
  batchSetBodies.length = 0;
  await pushWeekEmployeesToCloud([{ id: "e2", name: "Domain" }], { skipPayrollGuard: true });
  const domainBody = batchSetBodies.at(-1) ?? lastBatchSetBody;
  assert("domain pushWeekEmployees uses payroll CAS", domainBody?.payrollWeekCas === true);
  assert("domain pushWeekEmployees zawiera klucz", (domainBody?.keys ?? []).includes("kw-week-employees"));
}

console.log("\n---");
console.log(`SYNC-ARCH-01 S1-1: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
