/**
 * HOTFIX DIAG — ładuje prod chunk TenderCenterProView w przeglądarce (repro TDZ).
 * Wymaga: npm run build && npm run preview (port 4173)
 */
import { chromium } from "@playwright/test";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "dist", "assets");
const chunk = readdirSync(assetsDir).find(
  (f) => f.startsWith("TenderCenterProView-") && f.endsWith(".js"),
);
if (!chunk) {
  console.error("FAIL — brak chunka TenderCenterProView w dist/assets");
  process.exit(1);
}

const label = process.argv[2] ?? "step";
const chunkUrl = `/assets/${chunk}`;
const previewBase = process.env.PREVIEW_URL ?? "http://127.0.0.1:4173";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(`${previewBase}/`, { waitUntil: "networkidle", timeout: 20_000 });

const result = await page.evaluate(async (url) => {
  try {
    await import(url);
    return { ok: true, via: "dynamic-import-after-index" };
  } catch (e) {
    return { ok: false, err: e?.message ?? String(e) };
  }
}, chunkUrl);

await browser.close();

const tdz = errors.find(
  (e) =>
    e.includes("before initialization") ||
    e.includes("Cannot access"),
);
console.log(`\n=== DIAG browser chunk [${label}] ===`);
console.log(`Chunk: ${chunk}`);
console.log(`Script load: ${JSON.stringify(result)}`);
if (tdz) {
  console.log(`FAIL — ${tdz}`);
  process.exit(1);
}
if (errors.length > 0) {
  console.log("Other errors:", errors.slice(0, 3).join(" | "));
}
console.log("PASS — brak TDZ przy ładowaniu chunka");
