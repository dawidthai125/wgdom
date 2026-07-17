/**
 * THEME-01C — Atomic migration smoke + dark parity tokens.
 * Run: npx vite-node scripts/test-theme-01c-atomic-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WG_LIGHT_BACKGROUND,
  WG_PROD_DARK_BACKGROUND,
  WG_THEME_DARK_DOCUMENT_CLASS,
  buildThemeFoucInlineScript,
  parseThemeCssBlocks,
  resolveWgThemeDocumentClass,
} from "../src/app/theme/theme-engine.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(name, ok, detail = "") {
  if (!ok) throw new Error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  console.log(`PASS ${name}`);
}

const themePaths = [
  "src/styles/theme.css",
  "src/app/theme/theme-engine.ts",
  "src/app/theme/WgdomThemeProvider.tsx",
  "index.html",
  "src/app/components/ui/sonner.tsx",
  "src/app/components/ui/chart.tsx",
];

const mainTsx = read("src/main.tsx");
const indexHtml = read("index.html");
const themeEngine = read("src/app/theme/theme-engine.ts");
const providerTsx = read("src/app/theme/WgdomThemeProvider.tsx");
const themeCss = read("src/styles/theme.css");
const appTsx = read("src/app/App.tsx");
const chartTsx = read("src/app/components/ui/chart.tsx");

const { rootBackground, darkBackground } = parseThemeCssBlocks(themeCss);

assert("main.tsx mounts WgdomThemeProvider", mainTsx.includes("WgdomThemeProvider"));
assert(":root = light background", rootBackground === WG_LIGHT_BACKGROUND, rootBackground ?? "null");
assert(".dark = production dark background", darkBackground === WG_PROD_DARK_BACKGROUND, darkBackground ?? "null");
assert("theme.css has .dark block", /\.dark\s*\{/.test(themeCss));
assert("theme.css no .light selector", !/\.light\s*\{/.test(themeCss));

for (const rel of themePaths) {
  const src = read(rel);
  assert(`${rel} no .light class bridge`, !src.includes('classList.add("light")') && !src.includes("classList.add('light')"));
  assert(`${rel} no 01B value hack`, !src.includes('dark: ""') && !src.includes('light: "light"'));
}

assert("index.html FOUC adds dark class", indexHtml.includes('classList.add("dark")'));
assert("FOUC inline matches buildThemeFoucInlineScript", indexHtml.includes(buildThemeFoucInlineScript()));
assert("resolveWgThemeDocumentClass dark", resolveWgThemeDocumentClass("dark") === WG_THEME_DARK_DOCUMENT_CLASS);
assert("resolveWgThemeDocumentClass light", resolveWgThemeDocumentClass("light") === null);
assert("provider standard next-themes (no value map)", !providerTsx.includes("value="));
assert("provider attribute class", providerTsx.includes('attribute="class"'));
assert("App.tsx Toaster from ui/sonner", appTsx.includes('@/app/components/ui/sonner'));
assert("App.tsx no WgdomThemeProvider import", !appTsx.includes("WgdomThemeProvider"));
assert("chart.tsx standard THEMES", chartTsx.includes('light: ""') && chartTsx.includes('dark: ".dark"'));

const prodDarkTokens = [
  "--background: #111827",
  "--primary: #C0392B",
  "--card: #1a2332",
  "--foreground: #f0f2f5",
];
for (const token of prodDarkTokens) {
  const darkBlock = themeCss.match(/\.dark\s*\{[\s\S]*?\}/)?.[0] ?? "";
  assert(`.dark contains ${token}`, darkBlock.includes(token));
}

console.log("\nTHEME-01C atomic migration smoke: ALL PASS");
