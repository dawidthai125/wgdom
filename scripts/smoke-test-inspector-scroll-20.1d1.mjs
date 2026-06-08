/**
 * Sprint 20.1D.1 — Inspector Gallery/Files wheel scroll (single scroll container)
 * Uruchom: npx vite-node scripts/smoke-test-inspector-scroll-20.1d1.mjs
 */
import { readFileSync } from "node:fs";

const R = {};

function log(m) {
  console.log(m);
}

function countOverflowYAuto(src) {
  return (src.match(/overflow-y-auto/g) || []).length;
}

function galleryBranch(panelSrc) {
  const m = panelSrc.match(/!selectedJob && mainTab === "gallery"[\s\S]*?!selectedJob && mainTab === "files"/);
  return m ? m[0] : "";
}

function filesBranch(panelSrc) {
  const m = panelSrc.match(/!selectedJob && mainTab === "files"[\s\S]*?!selectedJob && mainTab === "jobs"/);
  return m ? m[0] : "";
}

function portfolioBranch(panelSrc) {
  const m = panelSrc.match(/!selectedJob && mainTab === "portfolio"[\s\S]*?!selectedJob && mainTab === "gallery"/);
  return m ? m[0] : "";
}

function dashboardBranch(panelSrc) {
  const m = panelSrc.match(/!selectedJob && mainTab === "dashboard"[\s\S]*?!selectedJob && mainTab === "portfolio"/);
  return m ? m[0] : "";
}

function jobsBranch(panelSrc) {
  const m = panelSrc.match(/!selectedJob && mainTab === "jobs"[\s\S]*?ref=\{listScrollRef\}[\s\S]*?renderBottomNav\(\)/);
  return m ? m[0] : "";
}

const panel = readFileSync("src/app/InspectorPanel.tsx", "utf8");
const galleryView = readFileSync("src/app/InspectorJobPhotosGalleryView.tsx", "utf8");
const filesBrowser = readFileSync("src/app/JobFilesBrowser.tsx", "utf8");
const portfolioView = readFileSync("src/app/WmPortfolioView.tsx", "utf8");
const mediaView = readFileSync("src/app/MediaView.tsx", "utf8");

// T1 — Gallery: jeden scroll container w komponencie
function testT1() {
  log("\n═══ T1 — Gallery single scroll container ═══");
  const one = countOverflowYAuto(galleryView) === 1;
  const hasRef = /ref=\{scrollRef\}/.test(galleryView);
  const shellHidden = /overflow-hidden[\s\S]*ref=\{scrollRef\}[\s\S]*overflow-y-auto/.test(galleryView);
  log(`  overflow-y-auto count: ${countOverflowYAuto(galleryView)} (expect 1)`);
  log(`  scrollRef on scroller: ${hasRef}`);
  R.T1 = one && hasRef && shellHidden ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — Files: jeden scroll container gdy scrollRef (inspector)
function testT2() {
  log("\n═══ T2 — Files single scroll container ═══");
  const one = countOverflowYAuto(filesBrowser) === 1;
  const hasRef = /ref=\{scrollRef\}/.test(filesBrowser);
  const scrollPad = /scrollRef \? "" : "pb-20/.test(filesBrowser);
  log(`  overflow-y-auto count: ${countOverflowYAuto(filesBrowser)} (expect 1)`);
  log(`  scrollRef on scroller: ${hasRef}`);
  log(`  inspector bez pb-20 gdy scrollRef: ${scrollPad}`);
  R.T2 = one && hasRef && scrollPad ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — galleryScrollRef przekazany z InspectorPanel
function testT3() {
  log("\n═══ T3 — galleryScrollRef wiring ═══");
  const branch = galleryBranch(panel);
  const passesRef = /scrollRef=\{galleryScrollRef\}/.test(branch);
  const noOuterScroll = !/ref=\{galleryScrollRef\}[^>]*overflow-y-auto/.test(branch);
  const usesPull = /galleryPull/.test(branch);
  log(`  scrollRef prop: ${passesRef}`);
  log(`  brak outer overflow-y-auto na galleryScrollRef: ${noOuterScroll}`);
  log(`  pull-to-refresh: ${usesPull}`);
  R.T3 = passesRef && noOuterScroll && usesPull ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — filesScrollRef przekazany z InspectorPanel
function testT4() {
  log("\n═══ T4 — filesScrollRef wiring ═══");
  const branch = filesBranch(panel);
  const passesRef = /scrollRef=\{filesScrollRef\}/.test(branch);
  const noOuterScroll = !/ref=\{filesScrollRef\}[^>]*overflow-y-auto/.test(branch);
  const usesPull = /filesPull/.test(branch);
  log(`  scrollRef prop: ${passesRef}`);
  log(`  brak outer overflow-y-auto na filesScrollRef: ${noOuterScroll}`);
  log(`  pull-to-refresh: ${usesPull}`);
  R.T4 = passesRef && noOuterScroll && usesPull ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — brak nested overflow-y-auto w gałęziach gallery/files panelu
function testT5() {
  log("\n═══ T5 — no nested overflow-y-auto in panel branches ═══");
  const g = countOverflowYAuto(galleryBranch(panel));
  const f = countOverflowYAuto(filesBranch(panel));
  log(`  gallery branch overflow-y-auto: ${g} (expect 0)`);
  log(`  files branch overflow-y-auto: ${f} (expect 0)`);
  R.T5 = g === 0 && f === 0 ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

// T6 — Portfolio bez regresji (wzorzec WmPortfolioView)
function testT6() {
  log("\n═══ T6 — Portfolio pattern unchanged ═══");
  const branch = portfolioBranch(panel);
  const oneInView = countOverflowYAuto(portfolioView) === 1;
  const panelPasses = /scrollRef=\{portfolioScrollRef\}/.test(branch);
  const noOuterInPanel = countOverflowYAuto(branch) === 0;
  const dashCount = countOverflowYAuto(dashboardBranch(panel));
  const jobsHasListScroll = /ref=\{listScrollRef\}[\s\S]*overflow-y-auto/.test(jobsBranch(panel));
  const mediaOuterScroll = countOverflowYAuto(mediaView);
  const photosGallery = readFileSync("src/app/JobPhotosGalleryView.tsx", "utf8");
  const mediaSingleChildScroll =
    countOverflowYAuto(photosGallery) === 1 && countOverflowYAuto(filesBrowser) === 1;
  log(`  WmPortfolioView overflow-y-auto: ${countOverflowYAuto(portfolioView)}`);
  log(`  panel portfolio scrollRef: ${panelPasses}`);
  log(`  dashboard branch scroll count: ${dashCount}`);
  log(`  jobs listScrollRef scroller: ${jobsHasListScroll}`);
  log(`  MediaView outer scroll count: ${mediaOuterScroll}`);
  log(`  admin media children single scroll: ${mediaSingleChildScroll}`);
  R.T6 = oneInView && panelPasses && noOuterInPanel && dashCount === 1 && jobsHasListScroll
    && mediaOuterScroll === 0 && mediaSingleChildScroll
    ? "PASS"
    : "FAIL";
  log(`T6: ${R.T6}`);
}

testT1();
testT2();
testT3();
testT4();
testT5();
testT6();

const all = Object.values(R);
const pass = all.filter((x) => x === "PASS").length;
log(`\n═══ PODSUMOWANIE inspector scroll 20.1D.1: ${pass}/${all.length} PASS ═══`);
for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
if (pass !== all.length) process.exit(1);
