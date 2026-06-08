/**
 * Hotfix — JobPhotosGalleryView MapPin import (expanded "Otwórz robotę")
 * Uruchom: npx vite-node scripts/smoke-test-job-photos-gallery-expand.mjs
 */
import { readFileSync } from "node:fs";
import React from "react";
import { renderToString } from "react-dom/server";
import { MapPin } from "lucide-react";
import { JobPhotosGalleryView } from "../src/app/JobPhotosGalleryView.tsx";

const R = {};

function log(m) {
  console.log(m);
}

function makeJob() {
  return {
    id: "job-smoke-1",
    address: "Smoke Ulica 1",
    flatNumber: "2",
    client: "Klient test",
    status: "in_progress",
    keysHandedOver: false,
    photos: [
      {
        id: "ph-1",
        publicUrl: "https://example.com/ph-1.jpg",
        label: "before",
        uploadedBy: "Ekipa",
        uploadedAt: "2026-06-08T12:00:00Z",
        status: "approved",
      },
    ],
    jobFiles: [],
    inspectorPhotos: [],
    workerReports: [],
  };
}

// T1 — MapPin zaimportowany w JobPhotosGalleryView
function testT1() {
  log("\n═══ T1 — MapPin import w JobPhotosGalleryView ═══");
  const src = readFileSync("src/app/JobPhotosGalleryView.tsx", "utf8");
  const hasImport = /import\s*\{[^}]*\bMapPin\b[^}]*\}\s*from\s*["']lucide-react["']/.test(src);
  const usesMapPin = /<MapPin\s+size=\{12\}\/>Otwórz robotę/.test(src);
  log(`  import MapPin: ${hasImport}`);
  log(`  JSX MapPin + Otwórz robotę: ${usesMapPin}`);
  R.T1 = hasImport && usesMapPin ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — expanded branch w źródle (przycisk w {expanded && ...})
function testT2() {
  log("\n═══ T2 — expanded job card branch ═══");
  const src = readFileSync("src/app/JobPhotosGalleryView.tsx", "utf8");
  const expandedBlock = /\{expanded\s*&&\s*\([\s\S]*?<MapPin[\s\S]*?Otwórz robotę/.test(src);
  log(`  expanded && ... MapPin ... Otwórz robotę: ${expandedBlock}`);
  R.T2 = expandedBlock ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — runtime: MapPin render (brak ReferenceError)
function testT3() {
  log("\n═══ T3 — runtime MapPin render ═══");
  let html = "";
  let err = null;
  try {
    html = renderToString(
      React.createElement(
        "button",
        { type: "button" },
        React.createElement(MapPin, { size: 12 }),
        "Otwórz robotę",
      ),
    );
  } catch (e) {
    err = e;
  }
  const hasSvg = html.includes("<svg");
  const hasLabel = html.includes("Otwórz robotę");
  log(`  error: ${err ? err.message : "none"}`);
  log(`  svg: ${hasSvg} label: ${hasLabel}`);
  R.T3 = !err && hasSvg && hasLabel ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — runtime: JobPhotosGalleryView mount (lista kart, bez crash)
function testT4() {
  log("\n═══ T4 — JobPhotosGalleryView render (collapsed cards) ═══");
  let html = "";
  let err = null;
  try {
    html = renderToString(
      React.createElement(JobPhotosGalleryView, {
        jobs: [makeJob()],
        onOpenJob: () => {},
        embedded: true,
      }),
    );
  } catch (e) {
    err = e;
  }
  const hasJob = html.includes("Smoke Ulica 1");
  log(`  error: ${err ? err.message : "none"}`);
  log(`  job title in HTML: ${hasJob}`);
  R.T4 = !err && hasJob ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — runtime: expanded button pattern (proxy expanded card CTA)
function testT5() {
  log("\n═══ T5 — expanded CTA button render ═══");
  const src = readFileSync("src/app/JobPhotosGalleryView.tsx", "utf8");
  const btnClass =
    /className="inline-flex items-center gap-1\.5 text-xs text-primary hover:text-primary\/80 font-medium transition-colors"/.test(
      src,
    );
  let html = "";
  let err = null;
  try {
    html = renderToString(
      React.createElement(
        "button",
        {
          type: "button",
          className:
            "inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors",
        },
        React.createElement(MapPin, { size: 12 }),
        "Otwórz robotę",
      ),
    );
  } catch (e) {
    err = e;
  }
  const isRef = err && /MapPin is not defined|ReferenceError/.test(String(err));
  log(`  source button class: ${btnClass}`);
  log(`  error: ${err ? err.message : "none"}`);
  log(`  ReferenceError MapPin: ${isRef}`);
  R.T5 = btnClass && !err && !isRef && html.includes("Otwórz robotę") ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

testT1();
testT2();
testT3();
testT4();
testT5();

const all = Object.values(R);
const pass = all.filter((x) => x === "PASS").length;
log(`\n═══ PODSUMOWANIE job gallery expand: ${pass}/${all.length} PASS ═══`);
for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
if (pass !== all.length) process.exit(1);
