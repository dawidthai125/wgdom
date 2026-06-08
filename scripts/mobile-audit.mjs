#!/usr/bin/env node
/**
 * Statyczny audyt mobile — uruchom: node scripts/mobile-audit.mjs
 * Nie zastępuje testów na prawdziwym telefonie, ale wykrywa regresje w kodzie.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const checks = [];
const fails = [];
const warns = [];

function pass(id, msg) {
  checks.push({ id, status: "pass", msg });
}
function fail(id, msg) {
  fails.push({ id, msg });
  checks.push({ id, status: "fail", msg });
}
function warn(id, msg) {
  warns.push({ id, msg });
  checks.push({ id, status: "warn", msg });
}

function read(path) {
  const full = join(root, path);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

function grepFiles(dir, pattern, ext = ".tsx") {
  const out = [];
  function walk(d) {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name);
      if (name.isDirectory() && !name.name.includes("node_modules")) walk(p);
      else if (name.name.endsWith(ext) || name.name.endsWith(".ts") || name.name.endsWith(".css")) {
        const c = readFileSync(p, "utf8");
        if (pattern.test(c)) out.push(p.replace(root, "").replace(/\\/g, "/"));
      }
    }
  }
  walk(join(root, dir));
  return out;
}

// ─── Pliki wymagane ───
for (const f of [
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/offline.html",
  "src/styles/mobile.css",
  "src/lib/capacitor-native.ts",
  "src/lib/native-app-bridge.ts",
  "src/lib/mobile-keyboard.ts",
  "src/lib/deep-link.ts",
  "ios/App/App/Info.plist",
]) {
  existsSync(join(root, f)) ? pass("files", f) : fail("files", `Brak pliku: ${f}`);
}

// ─── Manifest ───
const manifestRaw = read("public/manifest.webmanifest");
if (manifestRaw) {
  try {
    const m = JSON.parse(manifestRaw);
    m.id ? pass("manifest", `id=${m.id}`) : fail("manifest", "Brak pola id");
    m.display === "standalone" ? pass("manifest", "display=standalone") : warn("manifest", `display=${m.display}`);
    const maskable = (m.icons || []).filter((i) => String(i.purpose || "").includes("maskable"));
    maskable.length >= 1 ? pass("manifest", `${maskable.length} ikon maskable`) : fail("manifest", "Brak ikon maskable");
    (m.icons || []).length >= 4 ? pass("manifest", `${m.icons.length} ikon`) : warn("manifest", "Mało ikon w manifeście");
  } catch (e) {
    fail("manifest", `JSON invalid: ${e.message}`);
  }
}

// ─── SW precache ───
const sw = read("public/sw.js") || "";
sw.includes("offline.html") ? pass("sw", "offline.html w SW") : fail("sw", "SW nie cache'uje offline.html");
sw.includes("apple-touch-icon") ? pass("sw", "apple-touch-icon w precache") : warn("sw", "Brak apple-touch-icon w precache");

// ─── index.html mobile ───
const html = read("index.html") || "";
html.includes("viewport-fit=cover") ? pass("html", "viewport-fit=cover") : fail("html", "Brak viewport-fit=cover");
html.includes("manifest.webmanifest") ? pass("html", "link manifest") : fail("html", "Brak linku manifest");

// ─── mobile.css ───
const mobileCss = read("src/styles/mobile.css") || "";
mobileCss.includes("touch-target") ? pass("css", "klasa touch-target") : fail("css", "Brak .touch-target");
mobileCss.includes("font-size: 16px") ? pass("css", "input 16px anti-zoom iOS") : fail("css", "Brak reguły 16px inputów");
mobileCss.includes("overscroll-contain") || mobileCss.includes("overflow-y-auto") ? pass("css", "scroll iOS") : warn("css", "Sprawdź momentum scroll");

// ─── Capacitor ───
const cap = read("capacitor.config.ts") || "";
cap.includes("errorPath") ? pass("cap", "errorPath offline") : fail("cap", "Brak errorPath w capacitor.config");
cap.includes("CAPACITOR_USE_BUNDLE") ? pass("cap", "tryb bundle opcjonalny") : warn("cap", "Brak CAPACITOR_USE_BUNDLE");

// ─── iOS plist ───
const plist = read("ios/App/App/Info.plist") || "";
for (const key of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "CFBundleURLTypes"]) {
  plist.includes(key) ? pass("ios", key) : fail("ios", `Brak ${key}`);
}

// ─── Android deep links ───
const manifest = read("android/app/src/main/AndroidManifest.xml") || "";
manifest.includes('android:scheme="wgdom"') ? pass("android", "scheme wgdom") : fail("android", "Brak deep link wgdom");

// ─── PWA w natywce wyłączone ───
const pwaInstall = read("src/lib/pwa-install.ts") || "";
pwaInstall.includes("isNativePlatform()") && pwaInstall.includes("return")
  ? pass("native", "SW wyłączony w Capacitor")
  : fail("native", "SW może konfliktować z WebView");

const pwaBanner = read("src/app/PwaInstallBanner.tsx") || "";
pwaBanner.includes("isNativeApp()") ? pass("native", "baner PWA ukryty w natywce") : fail("native", "Baner PWA widoczny w APK");

// ─── Kolejki offline ───
const pq = read("src/lib/photo-queue.ts") || "";
pq.includes('"inspector"') || pq.includes("'inspector'") ? pass("queue", "kolejka inspektora") : fail("queue", "Brak kind inspector w photo-queue");

// ─── Heurystyki mobile shell / PTR (nie tylko App.tsx — refaktor Performance 2.x) ───
const app = read("src/app/App.tsx") || "";
const workerView = read("src/app/WorkerPhotoView.tsx") || "";
const inspectorPanel = read("src/app/InspectorPanel.tsx") || "";

const has100dvh =
  (mobileCss.includes("100dvh") && mobileCss.includes("admin-app-shell")) || html.includes("100dvh");
has100dvh ? pass("app", "100dvh") : fail("app", "Brak 100dvh w shellu");

app.includes("safe-area-inset") ? pass("app", "safe-area") : fail("app", "Brak safe-area-inset");

const hasOverscroll =
  mobileCss.includes("overscroll-contain")
  || mobileCss.includes("overscroll-behavior: contain")
  || app.includes("overscroll-contain");
hasOverscroll ? pass("app", "overscroll-contain") : warn("app", "Mało overscroll-contain");

app.includes("Toaster") ? pass("app", "toasty admin") : warn("app", "Brak Toaster w adminie");

const hasPtr =
  workerView.includes("usePullToRefresh") || inspectorPanel.includes("usePullToRefresh");
hasPtr ? pass("app", "PTR worker/inspektor") : fail("app", "Brak PTR u pracownika");

app.includes("registerNativeBackHandler") ? pass("app", "native back") : fail("app", "Brak obsługi Wstecz");

// Małe touch targets — heurystyka (py-1 bez min-h na button)
const smallButtons = (app.match(/className="[^"]*py-1[^"]*"/g) || []).length;
smallButtons > 80 ? warn("touch", `${smallButtons} elementów z py-1 — przejrzyj touch targets ręcznie`) : pass("touch", `py-1 count=${smallButtons} (akceptowalne)`);

// ─── Raport ───
const passed = checks.filter((c) => c.status === "pass").length;
console.log("\n=== WGDOM Mobile Audit (statyczny) ===\n");
console.log(`✓ ${passed}  ✗ ${fails.length}  ⚠ ${warns.length}\n`);

if (fails.length) {
  console.log("BŁĘDY:");
  fails.forEach((f) => console.log(`  ✗ [${f.id}] ${f.msg}`));
}
if (warns.length) {
  console.log("\nOSTRZEŻENIA:");
  warns.forEach((w) => console.log(`  ⚠ [${w.id}] ${w.msg}`));
}

console.log("\n---");
console.log(fails.length === 0 ? "Statyczny audyt: OK" : "Statyczny audyt: NIE PRZESZEDŁ");
console.log("Następny krok: npm run test:mobile (Playwright na żywej stronie)\n");

process.exit(fails.length > 0 ? 1 : 0);
