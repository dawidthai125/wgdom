/**
 * JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 — in-memory activation smoke
 */
import {
  logJobsPhotosLiveTrace,
  jobsPhotosLiveTraceFindFirstRegression,
  jobsPhotosLiveTraceDump,
  registerJobsPhotosSelectedJobId,
  isJobsPhotosLiveTraceEnabled,
  setJobsPhotosLiveTraceEnabled,
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

if (isJobsPhotosLiveTraceEnabled()) bad("T0 trace off by default");
else ok("T0 trace off by default");

logJobsPhotosLiveTrace({
  event: "setJobs",
  caller: "test",
  origin: "render",
  jobs: [{ id: JOB_ID, photos: [{ id: "a" }] }],
});
if (jobsPhotosLiveTraceDump().length !== 0) bad("T1 no events when trace off");
else ok("T1 no events when trace off");

globalThis.__WG_ENABLE_JOBS_PHOTO_TRACE__ = true;
if (!isJobsPhotosLiveTraceEnabled()) bad("T2 window flag enables trace");
else ok("T2 window flag enables trace");

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

if (jobsPhotosLiveTraceDump().length < 2) bad("T3 eventCount > 0 after enable");
else ok("T3 eventCount > 0 after enable");

const first = jobsPhotosLiveTraceFindFirstRegression();
if (!first) bad("T4 findFirstRegression detects drop");
else if (first.caller !== "test.drop") bad("T4 caller", first.caller);
else if (first.selectedJobPhotosLength !== 0) bad("T4 photosLength", first.selectedJobPhotosLength);
else if (first.prevPhotosLength !== 6) bad("T4 prevPhotosLength", first.prevPhotosLength);
else if (first.selectedJobId !== JOB_ID) bad("T4 selectedJobId", first.selectedJobId);
else ok("T4 findFirstRegression 6→0 + selectedJobId");

setJobsPhotosLiveTraceEnabled(false);
globalThis.__WG_ENABLE_JOBS_PHOTO_TRACE__ = false;
const beforeDisableCount = jobsPhotosLiveTraceDump().length;
logJobsPhotosLiveTrace({
  event: "setJobs",
  caller: "test.after-disable",
  origin: "render",
  jobs: jobs6,
  prevJobs: jobs0,
});
if (jobsPhotosLiveTraceDump().length !== beforeDisableCount) bad("T5 no new events when disabled");
else ok("T5 no new events when disabled");

setJobsPhotosLiveTraceEnabled(true);
if (!isJobsPhotosLiveTraceEnabled()) bad("T6 enable() API");
else ok("T6 enable() API");

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
