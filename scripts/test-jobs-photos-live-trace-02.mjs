/**
 * JOBS-PHOTOS-LIVE-INSTRUMENTATION-02 — smoke findFirstRegression + flag gate
 */
import {
  logJobsPhotosLiveTrace,
  jobsPhotosLiveTraceFindFirstRegression,
  registerJobsPhotosSelectedJobId,
  isJobsPhotosLiveTraceEnabled,
} from "../src/lib/jobs-photos-live-trace.ts";

const JOB_ID = "trace-test-job";
let pass = 0;
let fail = 0;

function ok(label) {
  pass++;
  console.log(`  PASS ${label}`);
}
function bad(label, detail) {
  fail++;
  console.error(`  FAIL ${label}`, detail ?? "");
}

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
};

if (isJobsPhotosLiveTraceEnabled()) bad("T0 flag off by default");
else ok("T0 flag off by default");

logJobsPhotosLiveTrace({
  event: "setJobs",
  caller: "test",
  origin: "render",
  jobs: [{ id: JOB_ID, photos: [{ id: "a" }] }],
});
if (jobsPhotosLiveTraceFindFirstRegression() != null) bad("T1 no log when flag off");
else ok("T1 no log when flag off");

localStorage.setItem("wg-jobs-photos-live-trace", "1");
registerJobsPhotosSelectedJobId(JOB_ID);

const jobs6 = [{ id: JOB_ID, photos: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` })) }];
const jobs0 = [{ id: JOB_ID, photos: [] }];

logJobsPhotosLiveTrace({
  event: "setJobs",
  caller: "test.seed",
  origin: "render",
  jobs: jobs6,
  prevJobs: [],
});
logJobsPhotosLiveTrace({
  event: "setJobs",
  caller: "test.drop",
  origin: "sync",
  jobs: jobs0,
  prevJobs: jobs6,
});

const first = jobsPhotosLiveTraceFindFirstRegression();
if (!first) bad("T2 findFirstRegression detects drop");
else if (first.caller !== "test.drop") bad("T2 caller", first.caller);
else if (first.selectedJobPhotosLength !== 0) bad("T2 photosLength", first.selectedJobPhotosLength);
else if (first.prevPhotosLength !== 6) bad("T2 prevPhotosLength", first.prevPhotosLength);
else ok("T2 findFirstRegression detects 6→0 drop");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
