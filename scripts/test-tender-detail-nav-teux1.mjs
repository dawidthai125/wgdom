/**
 * TEUX-1 — SSOT openTenderDetailV4 + map/strategy/list navigation paths.
 */

import { openTenderDetailV4 } from "../src/lib/tender-detail-nav.ts";
import { buildTenderDetailPath } from "../src/lib/tender-detail-routes-v4.ts";

const TID = "tender-uuid-teux1";
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

function mockNavigate() {
  const calls = [];
  const navigate = (path, opts) => {
    calls.push({ path, opts });
  };
  return { navigate, calls };
}

console.log("=== TEUX-1 TENDER DETAIL NAV ===\n");

{
  const { navigate, calls } = mockNavigate();
  openTenderDetailV4(navigate, TID, "przetarg");
  ok("map → przetarg tab", calls[0]?.path === `/przetargi/${TID}/przetarg`);
  ok("map navigate no replace", calls[0]?.opts === undefined);
}

{
  const { navigate, calls } = mockNavigate();
  openTenderDetailV4(navigate, TID, "przetarg");
  ok(
    "helper matches buildTenderDetailPath",
    calls[0]?.path === buildTenderDetailPath(TID, "przetarg"),
  );
}

{
  const { navigate, calls } = mockNavigate();
  openTenderDetailV4(navigate, TID);
  ok("default tab przetarg", calls[0]?.path === buildTenderDetailPath(TID));
}

{
  const { navigate, calls } = mockNavigate();
  openTenderDetailV4(navigate, TID, "decyzja", { replace: true });
  ok("decyzja replace", calls[0]?.opts?.replace === true);
  ok(
    "decyzja path",
    calls[0]?.path === buildTenderDetailPath(TID, "decyzja"),
  );
}

{
  const { navigate, calls } = mockNavigate();
  openTenderDetailV4(navigate, TID, "decyzja", {
    decyzjaWorkspace: "qualification",
  });
  ok(
    "decyzja ws qualification",
    calls[0]?.path
      === buildTenderDetailPath(TID, "decyzja", { decyzjaWorkspace: "qualification" }),
  );
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
