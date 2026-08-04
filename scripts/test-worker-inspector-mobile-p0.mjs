/**
 * WORKER-INSPECTOR-MOBILE-01 WIM-P0 — smoke (static markers)
 * Run: npx vite-node scripts/test-worker-inspector-mobile-p0.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name);
  }
}

console.log("WORKER-INSPECTOR-MOBILE-01 WIM-P0 — test-worker-inspector-mobile-p0\n");

const css = readFileSync(join(root, "src/styles/mobile.css"), "utf8");
assert("T01 .worker-shell rule", css.includes(".worker-shell"));
assert("T02 .inspector-shell rule", css.includes(".inspector-shell"));
assert("T03 shells use --app-height", /\.worker-shell,\s*\n\.inspector-shell\s*\{[^}]*--app-height/.test(css) || css.includes("var(--app-height, 100dvh)"));
assert("T04 shells overflow hidden", /worker-shell[\s\S]*?overflow:\s*hidden/.test(css));
assert("T05 admin-app-shell still SSOT", css.includes(".admin-app-shell") && css.includes("var(--app-height, 100dvh)"));

const worker = readFileSync(join(root, "src/app/WorkerPhotoView.tsx"), "utf8");
assert("T06 worker-shell class", worker.includes("worker-shell"));
assert("T07 no raw height 100dvh style", !/style=\{\{\s*height:\s*["']100dvh["']/.test(worker));
assert("T08 mobile-view-scroll", worker.includes("mobile-view-scroll"));
assert("T09 data-keyboard-aware", worker.includes("data-keyboard-aware"));

const shell = readFileSync(join(root, "src/app/inspector/InspectorShell.tsx"), "utf8");
assert("T10 inspector-shell class", shell.includes("inspector-shell"));
assert("T11 no h-[100dvh] on shell", !shell.includes("h-[100dvh]"));

const panel = readFileSync(join(root, "src/app/InspectorPanel.tsx"), "utf8");
assert("T12 panel relative min-h-0", panel.includes('className="relative min-h-0"'));
assert("T13 panel no h-[100dvh]", !/className="relative h-\[100dvh\]"/.test(panel));
assert("T14 panel no h-full owner", !/className="relative h-full/.test(panel));

const auth = readFileSync(join(root, "src/app/AppInnerWithAuth.tsx"), "utf8");
assert("T15 suspense height --app-height", auth.includes('height: "var(--app-height, 100dvh)"'));
assert("T16 suspense maxHeight --app-height", auth.includes('maxHeight: "var(--app-height, 100dvh)"'));
assert("T17 suspense not min-h-only", !auth.includes("min-h-[100dvh]") && !auth.includes("min-h-[var(--app-height"));

const viewport = readFileSync(join(root, "src/lib/app-viewport.ts"), "utf8");
assert("T18 app-viewport sets --app-height", viewport.includes('"--app-height"'));
assert("T19 visualViewport", viewport.includes("visualViewport"));

const cl = readFileSync(join(root, "src/app/changelog-data.ts"), "utf8");
assert("T20 changelog 2.66.06", cl.includes('version: "2.66.06"'));

/* OUT guards — no capture/privacy redesign in this slice markers stay as-is; ensure we did not strip cloud-sync */
const cloud = readFileSync(join(root, "src/lib/cloud-sync.ts"), "utf8");
assert("T21 cloud-sync untouched size guard", cloud.length > 1000);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
