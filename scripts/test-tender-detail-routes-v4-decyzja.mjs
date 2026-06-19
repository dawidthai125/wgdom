/**
 * V4 decyzja ?ws= routing — qualification / offer visibility.
 */

import {
  buildTenderDetailPath,
  buildTenderDetailPathFromLegacyWorkspace,
  parseDecyzjaWorkspaceQuery,
  resolveV4EmbedLegacyWorkspace,
} from "../src/lib/tender-detail-routes-v4.ts";

const TID = "test-tender-id";
let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

console.log("=== V4 DECYZJA WS ROUTING ===\n");

ok("overview default path", buildTenderDetailPath(TID, "decyzja") === "/przetargi/test-tender-id/decyzja");
ok(
  "qualification path",
  buildTenderDetailPath(TID, "decyzja", { decyzjaWorkspace: "qualification" })
    === "/przetargi/test-tender-id/decyzja?ws=qualification",
);
ok(
  "offer path",
  buildTenderDetailPath(TID, "decyzja", { decyzjaWorkspace: "offer" })
    === "/przetargi/test-tender-id/decyzja?ws=offer",
);
ok("parse unknown ws → overview", parseDecyzjaWorkspaceQuery("bogus") === "overview");
ok(
  "resolve embed qualification",
  resolveV4EmbedLegacyWorkspace("decyzja", "qualification") === "qualification",
);
ok(
  "resolve embed offer",
  resolveV4EmbedLegacyWorkspace("decyzja", "offer") === "offer",
);
ok(
  "resolve embed default overview",
  resolveV4EmbedLegacyWorkspace("decyzja", null) === "overview",
);
ok(
  "legacy CTA qualification",
  buildTenderDetailPathFromLegacyWorkspace(TID, "qualification")
    === "/przetargi/test-tender-id/decyzja?ws=qualification",
);
ok(
  "legacy CTA offer",
  buildTenderDetailPathFromLegacyWorkspace(TID, "offer")
    === "/przetargi/test-tender-id/decyzja?ws=offer",
);
ok(
  "legacy CTA overview",
  buildTenderDetailPathFromLegacyWorkspace(TID, "overview")
    === "/przetargi/test-tender-id/decyzja",
);
ok(
  "documents unchanged",
  buildTenderDetailPathFromLegacyWorkspace(TID, "documents")
    === "/przetargi/test-tender-id/dokumenty",
);
ok(
  "kosztorys prefer",
  buildTenderDetailPathFromLegacyWorkspace(TID, "documents", { preferKosztorys: true })
    === "/przetargi/test-tender-id/kosztorys",
);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
