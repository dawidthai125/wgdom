/**
 * MOBILE-P0-S1 — Sprint 1 scroll stabilization smoke (static architecture)
 * Run: npx vite-node scripts/smoke-test-mobile-scroll-p0-s1.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
let pass = 0;
let fail = 0;

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const indexHtml = read("index.html");
const mobileCss = read("src/styles/mobile.css");
const appViewport = read("src/lib/app-viewport.ts");
const modalLock = read("src/lib/modal-scroll-lock.ts");
const tendersView = read("src/app/TendersView.tsx");
const tendersProvider = read("src/app/tenders/context/TendersProvider.tsx");
const appTsx = read("src/app/App.tsx");
const mobileKeyboard = read("src/lib/mobile-keyboard.ts");

assert("T1 index.html uses var(--app-height) on mobile shell", /var\(--app-height,\s*100dvh\)/.test(indexHtml));
assert("T2 mobile.css admin-app-shell uses --app-height", mobileCss.includes("var(--app-height, 100dvh)"));
assert("T3 mobile.css defines .mobile-view-scroll", mobileCss.includes(".mobile-view-scroll"));
assert("T4 mobile-view-scroll touch-action pan-y", mobileCss.includes("touch-action: pan-y"));
assert("T5 app-viewport sets --app-height for all viewports", appViewport.includes('setProperty("--app-height"'));
assert("T6 app-viewport listens visualViewport resize", appViewport.includes('visualViewport?.addEventListener("resize"'));
assert("T7 modal-scroll-lock reconcileModalScrollLock", modalLock.includes("reconcileModalScrollLock"));
assert("T8 App goToView calls reconcile", appTsx.includes("reconcileModalScrollLock()"));
assert("T9 TendersView data-mobile-scroll-root tenders-list", tendersView.includes('data-mobile-scroll-root="tenders-list"'));
assert("T10 TendersView mobile-view-scroll class", tendersView.includes("mobile-view-scroll"));
assert("T11 TendersView mobile pb bottom nav", tendersView.includes("max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]"));
assert("T12 TendersView filters sticky md+ only", tendersView.includes("md:sticky md:top-0 z-30"));
assert("T13 TendersProvider flex-1 min-h-0 wrapper", tendersProvider.includes("flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden"));
assert("T14 mobile-keyboard scrollIntoView behavior auto", mobileKeyboard.includes('behavior: "auto"'));

console.log(`\n${pass}/${pass + fail} PASS`);
if (fail > 0) {
  process.exit(1);
}
