/**
 * HOTFIX DIAG — import OwnerDashboard via Vite (dev graph).
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {};
}

const label = process.argv[2] ?? "baseline";
console.log(`\n=== DIAG import OwnerDashboard [${label}] ===`);
try {
  const m = await import("../src/app/tenders/strategy/components/OwnerDashboard.tsx");
  console.log(`PASS — OwnerDashboard export: ${typeof m.OwnerDashboard}`);
} catch (e) {
  console.error(`FAIL — ${e?.message ?? e}`);
  if (e?.stack) console.error(e.stack.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}
