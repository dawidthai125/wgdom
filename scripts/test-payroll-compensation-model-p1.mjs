/**
 * PAYROLL AKORD Phase 1 — compensationModel (Kadry / directory).
 * npx vite-node scripts/test-payroll-compensation-model-p1.mjs
 *
 * Does not write production. Does not touch CAS / PWRB / week merge writers.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p1";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p1";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

import {
  directoryCompensationModel,
  normalizePayrollCompensationModel,
  pickCompensationModelForMerge,
  stampDirectoryCompensationModel,
  weekEmployeeCompensationModel,
} from "../src/lib/payroll-compensation-model.ts";
import {
  calcWeekEmployee,
  defaultDirEmployee,
  defaultDays,
  weekEmployeeFromDir,
} from "../src/app/app-domain.ts";
import { mergeDirectory } from "../src/lib/cloud-sync.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name);
  }
}

function dir(overrides = {}) {
  return {
    id: "dir-1",
    name: "Piotrek",
    phone: "+48 500 000 001",
    position: "Murarz",
    defaultRate: "42",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    ...overrides,
  };
}

assert("missing → hourly", normalizePayrollCompensationModel(undefined) === "hourly");
assert("null → hourly", normalizePayrollCompensationModel(null) === "hourly");
assert("empty string → hourly", normalizePayrollCompensationModel("") === "hourly");
assert("explicit hourly", normalizePayrollCompensationModel("hourly") === "hourly");
assert("explicit akord", normalizePayrollCompensationModel("akord") === "akord");
assert("invalid HOURLY → hourly", normalizePayrollCompensationModel("HOURLY") === "hourly");
assert("invalid piecework → hourly", normalizePayrollCompensationModel("piecework") === "hourly");
assert("invalid number → hourly", normalizePayrollCompensationModel(1) === "hourly");

assert("directory missing → hourly", directoryCompensationModel({}) === "hourly");
assert("directory null → hourly", directoryCompensationModel(null) === "hourly");
assert("directory akord", directoryCompensationModel({ compensationModel: "akord" }) === "akord");
assert("week missing → hourly", weekEmployeeCompensationModel({}) === "hourly");
assert("week akord", weekEmployeeCompensationModel({ compensationModel: "akord" }) === "akord");

const fresh = defaultDirEmployee();
assert("defaultDirEmployee omits compensationModel", !("compensationModel" in fresh));
assert("defaultDirEmployee reads hourly", directoryCompensationModel(fresh) === "hourly");

const stampedSame = stampDirectoryCompensationModel(dir(), dir({ compensationModel: "hourly" }), "2026-09-14T12:00:00.000Z");
assert("stamp same hourly does not write field", stampedSame.compensationModel === undefined);
assert("stamp same hourly no clock", stampedSame.compensationModelUpdatedAt === undefined);

const toAkord = stampDirectoryCompensationModel(dir(), dir({ compensationModel: "akord" }), "2026-09-14T12:00:00.000Z");
assert("stamp hourly→akord writes akord", toAkord.compensationModel === "akord");
assert("stamp hourly→akord clocks", toAkord.compensationModelUpdatedAt === "2026-09-14T12:00:00.000Z");

const toHourly = stampDirectoryCompensationModel(
  dir({ compensationModel: "akord", compensationModelUpdatedAt: "2026-09-01T00:00:00.000Z" }),
  dir({ compensationModel: "hourly" }),
  "2026-09-14T15:00:00.000Z",
);
assert("stamp akord→hourly writes hourly", toHourly.compensationModel === "hourly");
assert("stamp akord→hourly new clock", toHourly.compensationModelUpdatedAt === "2026-09-14T15:00:00.000Z");

const jsonRound = JSON.parse(JSON.stringify(toAkord));
assert("JSON round-trip keeps akord", directoryCompensationModel(jsonRound) === "akord");
assert("JSON round-trip keeps clock", jsonRound.compensationModelUpdatedAt === "2026-09-14T12:00:00.000Z");

const staleLocal = [dir({
  compensationModel: "hourly",
  compensationModelUpdatedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
})];
const newerCloud = [dir({
  compensationModel: "akord",
  compensationModelUpdatedAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-14T12:00:00.000Z",
})];
const mergedStaleLocal = mergeDirectory(staleLocal, newerCloud, []);
assert("mergeDirectory stale LS does not overwrite newer Cloud", directoryCompensationModel(mergedStaleLocal[0]) === "akord");

const mergedStaleCloud = mergeDirectory(newerCloud, staleLocal, []);
assert("mergeDirectory newer local wins stale Cloud", directoryCompensationModel(mergedStaleCloud[0]) === "akord");

assert(
  "field clock prefers newer compensationModelUpdatedAt",
  pickCompensationModelForMerge(
    { compensationModel: "hourly", compensationModelUpdatedAt: "2026-09-14T10:00:00.000Z" },
    { compensationModel: "akord", compensationModelUpdatedAt: "2026-09-14T11:00:00.000Z" },
  ) === "akord",
);

const hourlyWeek = weekEmployeeFromDir(dir());
assert("fromDir hourly omits snapshot field", hourlyWeek.compensationModel === undefined);
assert("fromDir hourly reads hourly", weekEmployeeCompensationModel(hourlyWeek) === "hourly");
assert("fromDir copies rate", hourlyWeek.rate === "42");
assert("fromDir directoryId", hourlyWeek.directoryId === "dir-1");
assert("fromDir days inactive (PURE fingerprint)", Object.values(hourlyWeek.days).every((d) => d.active === false));

const akordWeek = weekEmployeeFromDir(dir({ compensationModel: "akord" }));
assert("fromDir akord snapshots akord", akordWeek.compensationModel === "akord");
assert("fromDir invalid snapshots hourly (omit)", weekEmployeeFromDir(dir({ compensationModel: "nope" })).compensationModel === undefined);

const existingWeek = weekEmployeeFromDir(dir());
const laterDir = dir({ compensationModel: "akord" });
assert("Kadry change does not mutate existing week row", existingWeek.compensationModel === undefined);
assert("next fromDir sees new model", weekEmployeeFromDir(laterDir).compensationModel === "akord");

const hourlyCalcEmp = {
  ...hourlyWeek,
  days: {
    ...defaultDays(),
    Pn: { active: true, from: "07:00", to: "16:00", zaliczka: "" },
  },
};
const calcHourly = calcWeekEmployee(hourlyCalcEmp);
const calcTaggedAkordSameHours = calcWeekEmployee({ ...hourlyCalcEmp, compensationModel: "akord" });
assert("Phase 1 calc unchanged for hourly hours", calcHourly.weekHours > 0 && calcHourly.grossPay > 0);
assert(
  "Phase 3: akord snapshot zeros hourly calc (attendance ≠ amount)",
  calcTaggedAkordSameHours.weekHours === 0 && calcTaggedAkordSameHours.grossPay === 0,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
