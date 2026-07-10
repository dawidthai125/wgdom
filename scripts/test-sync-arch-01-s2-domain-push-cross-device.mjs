/**
 * SYNC-ARCH-01 S2 — domain push cross-device regression (godziny, stawki, premie/potracenia).
 * Run: npx vite-node scripts/test-sync-arch-01-s2-domain-push-cross-device.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-sync-arch-s2";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-sync-arch-s2";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

const kvStore = {};
let lastBatchSetBody = null;

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-set")) {
    lastBatchSetBody = JSON.parse(opts.body);
    const { keys, values } = lastBatchSetBody;
    keys.forEach((k, i) => { kvStore[k] = values[i]; });
    return { ok: true, text: async () => "" };
  }
  if (u.includes("/batch-get")) {
    const { keys } = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }) };
  }
  throw new Error(`unexpected fetch: ${u}`);
};

const { defaultDay } = await import("../src/app/app-domain.ts");
const {
  bindPayrollDomainPushHandler,
  flushPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
} = await import("../src/lib/payroll-domain-sync.ts");
const { pwrPush } = await import("../src/lib/payroll-week-roster-bundle.ts");
const {
  computeMergedDataBundle,
  pushMergedDataBundleToCloud,
  DATA_KEYS,
} = await import("../src/lib/cloud-sync.ts");

const WEEK_FROM = "2026-07-07";
const WEEK_TO = "2026-07-12";

let pass = 0;
let fail = 0;

function ok(name, cond) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
}

function baseEmp(overrides = {}) {
  return {
    id: "emp-1",
    directoryId: "dir-1",
    name: "Jan Kowalski",
    rate: "32",
    rateUpdatedAt: "2026-07-07T08:00:00.000Z",
    dataUpdatedAt: "2026-07-07T08:00:00.000Z",
    days: {
      Pn: { ...defaultDay(), active: true, from: "07:00", to: "15:00", zaliczka: "" },
      Wt: { ...defaultDay() },
      Śr: { ...defaultDay() },
      Cz: { ...defaultDay() },
      Pt: { ...defaultDay() },
      So: { ...defaultDay() },
    },
    prevSaturday: { ...defaultDay() },
    extraCosts: [],
    ...overrides,
  };
}

function localBundle(roster) {
  return DATA_KEYS.map((k) => {
    if (k === "kw-week-employees") return roster;
    if (k === "kw-weekFrom") return WEEK_FROM;
    if (k === "kw-weekTo") return WEEK_TO;
    if (k === "kw-archive") return [];
    if (k === "kw-jobs") return [];
    if (k === "kw-directory") return [];
    return null;
  });
}

async function devicePush(roster) {
  lastBatchSetBody = null;
  let pushPromise = Promise.resolve();
  bindPayrollDomainPushHandler((next) => {
    pushPromise = pwrPush({
      roster: next,
      weekFrom: WEEK_FROM,
      weekTo: WEEK_TO,
      options: { skipPayrollGuard: true },
    });
  });
  schedulePayrollDomainPush(roster);
  flushPayrollDomainPush();
  unbindPayrollDomainPushHandler();
  await pushPromise;
}

async function devicePull(localRoster = []) {
  if (localRoster.length > 0) {
    lsStore["kw-week-employees"] = JSON.stringify(localRoster);
  } else {
    delete lsStore["kw-week-employees"];
  }
  lsStore["kw-weekFrom"] = WEEK_FROM;
  lsStore["kw-weekTo"] = WEEK_TO;
  const { merged } = await computeMergedDataBundle(localBundle(localRoster));
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  return merged[empIdx];
}

async function scenario(name, editFn) {
  console.log(`\n-- ${name} --`);
  kvStore["kw-week-employees"] = [baseEmp()];
  const phoneRoster = [editFn(baseEmp())];
  await devicePush(phoneRoster);
  ok("batch-set zawiera kw-week-employees", lastBatchSetBody?.keys?.includes("kw-week-employees"));
  ok("replaceWeekEmployeesKeys", lastBatchSetBody?.replaceWeekEmployeesKeys?.includes("kw-week-employees"));
  const desktopRoster = await devicePull();
  const cloudEmp = desktopRoster[0];
  return { phoneRoster, cloudEmp };
}

// 1. Telefon godziny → komputer
{
  const { phoneRoster, cloudEmp } = await scenario("S2-1 telefon godziny → komputer", (emp) => ({
    ...emp,
    days: {
      ...emp.days,
      Pn: { ...emp.days.Pn, from: "06:00", to: "14:00" },
    },
    dataUpdatedAt: "2026-07-10T10:00:00.000Z",
  }));
  ok("godziny Pn widoczne na komputerze", cloudEmp?.days?.Pn?.from === "06:00" && cloudEmp?.days?.Pn?.to === "14:00");
  ok("LWW dataUpdatedAt", cloudEmp?.dataUpdatedAt === phoneRoster[0].dataUpdatedAt);
}

// 2. Komputer A → Komputer B (stawka jako proxy drugiego urządzenia)
{
  const { cloudEmp } = await scenario("S2-2 komputer A → komputer B godziny", (emp) => ({
    ...emp,
    days: {
      ...emp.days,
      Wt: { ...emp.days.Wt, active: true, from: "08:00", to: "16:00" },
    },
    dataUpdatedAt: "2026-07-10T11:00:00.000Z",
  }));
  ok("Wt aktywne na B", cloudEmp?.days?.Wt?.active === true);
}

// 3. Telefon stawka → komputer
{
  const { cloudEmp } = await scenario("S2-3 telefon stawka → komputer", (emp) => ({
    ...emp,
    rate: "38",
    rateUpdatedAt: "2026-07-10T12:00:00.000Z",
  }));
  ok("stawka widoczna", cloudEmp?.rate === "38");
}

// 4. Telefon premia (extraCosts approved) → komputer
{
  const { cloudEmp } = await scenario("S2-4 telefon premia → komputer", (emp) => ({
    ...emp,
    extraCosts: [{ id: "ec-1", description: "Premia", amount: "200", status: "approved" }],
    dataUpdatedAt: "2026-07-10T13:00:00.000Z",
  }));
  ok("premia widoczna", cloudEmp?.extraCosts?.[0]?.amount === "200");
}

// 5. Telefon potrącenie / zaliczka → komputer
{
  const { cloudEmp } = await scenario("S2-5 telefon zaliczka + potrącenie → komputer", (emp) => ({
    ...emp,
    days: {
      ...emp.days,
      Pn: { ...emp.days.Pn, zaliczka: "150" },
    },
    extraCosts: [{ id: "ec-2", description: "Potrącenie", amount: "50", status: "approved" }],
    dataUpdatedAt: "2026-07-10T14:00:00.000Z",
  }));
  ok("zaliczka Pn", cloudEmp?.days?.Pn?.zaliczka === "150");
  ok("potrącenie extraCosts", cloudEmp?.extraCosts?.[0]?.description === "Potrącenie");
}

// RS push nadal bez payroll
console.log("\n-- S2-6 RS push regression --");
{
  const merged = DATA_KEYS.map((k) => {
    if (k === "kw-week-employees") return [baseEmp()];
    if (k === "kw-jobs") return [{ id: "j1" }];
    return k === "kw-weekFrom" ? WEEK_FROM : k === "kw-weekTo" ? WEEK_TO : null;
  });
  lastBatchSetBody = null;
  await pushMergedDataBundleToCloud(merged);
  ok("RS batch-set bez kw-week-employees", !lastBatchSetBody?.keys?.includes("kw-week-employees"));
}

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
