/**
 * HOTFIX DIAG — import prod chunk TenderCenterProView (repro TDZ).
 * Run after: npm run build
 */
import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "dist", "assets");
const chunk = readdirSync(assetsDir).find((f) => f.startsWith("TenderCenterProView-") && f.endsWith(".js"));
if (!chunk) {
  console.error("FAIL — TenderCenterProView chunk not found in dist/assets");
  process.exit(1);
}

// Minimal browser globals for chunk side effects
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.HTMLElement = class HTMLElement {};
globalThis.HTMLAnchorElement = class HTMLAnchorElement extends HTMLElement {};
globalThis.document = {
  documentElement: { style: {}, classList: { add() {}, remove() {} } },
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
};
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {};
}

const url = pathToFileURL(join(assetsDir, chunk)).href;
console.log(`Importing: ${chunk}`);
try {
  await import(url);
  console.log("PASS — chunk imported without throw");
} catch (e) {
  console.error("FAIL —", e?.message ?? e);
  process.exit(1);
}
