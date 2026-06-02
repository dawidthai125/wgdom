/**
 * P15 — merge admin password overrides + bootstrap push guard
 * Run: npx vite-node scripts/test-p15-admin-password-merge.mjs
 */
import {
  mergeAdminPasswordOverrides,
  shouldPushAdminPasswordOverridesOnBootstrap,
} from "../src/lib/admin-auth.ts";

const H = {
  dawid: "20fa3a3dd3eefceb3edff7d9281256df237d0107614ee2b77ca07b097313a6a4",
  pawel: "514a115c99899197548bc450844917f6e458ec87b53f312b00ff137872b313be",
  szymon: "15622045e35f20d0605271bd81cfdcba236fd33560c26e50f88d8c76440eec7f",
};

const t1Local = { dawid: H.dawid, pawel: H.pawel, szymon: H.szymon };
const t1Cloud = { dawid: H.dawid, pawel: H.pawel };
const t1Merged = mergeAdminPasswordOverrides(t1Local, t1Cloud);
const t1Pass =
  !("szymon" in t1Merged) &&
  t1Merged.dawid === H.dawid &&
  t1Merged.pawel === H.pawel &&
  Object.keys(t1Merged).length === 2;

const t2Local = { dawid: H.dawid, pawel: H.pawel };
const t2Cloud = { dawid: H.dawid, pawel: H.pawel, szymon: H.szymon };
const t2Merged = mergeAdminPasswordOverrides(t2Local, t2Cloud);
const t2Pass =
  t2Merged.dawid === H.dawid &&
  t2Merged.pawel === H.pawel &&
  t2Merged.szymon === H.szymon &&
  Object.keys(t2Merged).length === 3;

const t3Merged = mergeAdminPasswordOverrides(t1Local, t1Cloud);
const t3NoPush = !shouldPushAdminPasswordOverridesOnBootstrap(t1Local, t1Cloud, t3Merged);
const t3Pass = t3NoPush && !("szymon" in t3Merged);

const pass = t1Pass && t2Pass && t3Pass;

console.log(
  JSON.stringify(
    {
      test: "P15 admin password merge",
      case1_localSzymonRemoved: { merged: t1Merged, pass: t1Pass },
      case2_cloudHasSzymon: { merged: t2Merged, pass: t2Pass },
      case3_bootstrapNoRestore: {
        merged: t3Merged,
        wouldPush: shouldPushAdminPasswordOverridesOnBootstrap(t1Local, t1Cloud, t3Merged),
        pass: t3Pass,
      },
      pass,
    },
    null,
    2,
  ),
);
process.exit(pass ? 0 : 1);
