/**
 * WM-WORKER-SKETCH-01 P1 — Mobile Draw UX
 * Run: npx vite-node scripts/test-wm-worker-sketch-01-p1.mjs
 *
 * Gest: drag-release wall+arrow · snap pipeline · Mobile Chrome · Worker tools
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectWallEndpoints,
  snapAnglePoint,
  snapDrawEnd,
  snapDrawStart,
  snapToNearestEndpoint,
  DRAW_ANGLE_SNAP_DEG,
} from "../src/lib/wm-technical-drawings/snap-draw.ts";
import { isWallPreviewTooShort, wallPreviewMetrics } from "../src/lib/wm-technical-drawings/wall-preview.ts";
import { renderDrawingSvg } from "../src/lib/wm-technical-drawings/render-svg.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) {
    pass++;
    console.log("  PASS", name);
  } else {
    fail++;
    console.error("  FAIL", name);
  }
}

console.log("WM-WORKER-SKETCH-01 P1\n");

const editorSrc = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
const workerSrc = readFileSync(join(root, "src/app/WorkerJobSketchesSection.tsx"), "utf8");
const snapSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/snap-draw.ts"), "utf8");

/* --- Gesture: one model · ZERO two-click wall --- */
ok("no wallGestureMode", !editorSrc.includes("wallGestureMode"));
ok("lineDrawRef present", editorSrc.includes("lineDrawRef"));
ok("completeLineDraw on up", editorSrc.includes("completeLineDraw"));
ok(
  "wall/arrow start sets lineDrawRef (no two-tap finish on 2nd down)",
  /tool === "wall" \|\| tool === "arrow"[\s\S]{0,400}lineDrawRef\.current\s*=/.test(editorSrc),
);
ok(
  "no finishLine on second pointerdown for wall path",
  !/if \(tool === "wall" \|\| tool === "arrow"\) \{\s*if \(!lineStart\)/.test(editorSrc),
);
ok("pointerup calls completeLineDraw", /onPointerUp[\s\S]{0,200}completeLineDraw/.test(editorSrc));
ok("pointercancel clears line draw", /onPointerCancel[\s\S]{0,200}clearWallPreview/.test(editorSrc));
ok("Esc clears wall or arrow", editorSrc.includes('tool === "wall" || tool === "arrow"'));

/* --- Arrow same path --- */
ok("arrow uses lineDrawRef type", /type: "wall" \| "arrow"/.test(editorSrc) || editorSrc.includes('type: tool'));

/* --- Mobile Chrome --- */
ok("mobile chrome branch", editorSrc.includes("P1 Mobile Chrome") || editorSrc.includes("mobileFullscreen ? ("));
ok(
  "PDF OUT of mobile chrome block",
  /aria-label="Elementy"[\s\S]{0,800}?\) : \(/.test(editorSrc) &&
    !/aria-label="Elementy"[\s\S]{0,800}Podgląd PDF/.test(editorSrc),
);
ok("touch-action none mobile surface", editorSrc.includes('touchAction: "none"') || editorSrc.includes("touch-none"));
ok("min-h-11 mobile targets", editorSrc.includes("min-h-11"));

/* --- Worker tools --- */
ok("WORKER_P1_TOOLS", workerSrc.includes("WORKER_P1_TOOLS"));
ok("worker door_room", workerSrc.includes('"door_room"'));
ok("worker window", workerSrc.includes('"window"'));
ok("worker ventilation", workerSrc.includes('"ventilation"'));
ok("worker distribution_board", workerSrc.includes('"distribution_board"'));
ok("worker gas_boiler", workerSrc.includes('"gas_boiler"'));
ok("worker no dimension in allowlist", !/WORKER_P1_TOOLS = \[[^\]]*dimension/.test(workerSrc));

/* --- Snap pipeline --- */
ok("snap-draw module", snapSrc.includes("snapDrawEnd"));
ok("angle step 45", DRAW_ANGLE_SNAP_DEG === 45);

const eps = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
];
ok("endpoint hit", snapToNearestEndpoint({ x: 3, y: 2 }, eps, 14)?.x === 0);
ok("endpoint miss", snapToNearestEndpoint({ x: 50, y: 50 }, eps, 14) === null);

const origin = { x: 0, y: 0 };
const almostHoriz = snapAnglePoint(origin, { x: 100, y: 8 }, true);
ok("angle snap near 0°", Math.abs(almostHoriz.y) < 1e-6 && almostHoriz.x > 90);

const walls = [
  { type: "wall", x1: 10, y1: 10, x2: 200, y2: 10 },
  { type: "text", x: 1, y: 1 },
];
ok("collectWallEndpoints 2", collectWallEndpoints(walls).length === 2);

const endNearEp = snapDrawEnd(
  { x: 202, y: 12 },
  { x: 10, y: 10 },
  { snapEnabled: true, step: 10, endpoints: collectWallEndpoints(walls), endpointEpsPx: 14 },
);
ok("pipeline endpoint wins", endNearEp.x === 200 && endNearEp.y === 10);

const endAngle = snapDrawEnd(
  { x: 100, y: 5 },
  { x: 0, y: 0 },
  { snapEnabled: true, step: 10, endpoints: [], endpointEpsPx: 14 },
);
ok("pipeline angle then grid", Math.abs(endAngle.y) < 1 && endAngle.x >= 90);

const startSnapped = snapDrawStart(
  { x: 14, y: 16 },
  { snapEnabled: true, step: 10, endpoints: [] },
);
ok("start grid", startSnapped.x === 10 && startSnapped.y === 20);

ok("snap OFF passthrough", snapDrawEnd({ x: 33, y: 44 }, origin, { snapEnabled: false, step: 10, endpoints: [] }).x === 33);

/* --- Too short / Ghost --- */
ok("too short", isWallPreviewTooShort(0.5) === true);
ok("long enough", isWallPreviewTooShort(10) === false);
ok("finishLine too-short clears", /zbyt krótka[\s\S]{0,120}clearWallPreview/.test(editorSrc));

const base = buildDrawingFromTemplate("blank", { jobId: "j1", address: "A" });
const withWall = touchDrawing(base, {
  objects: [
    ...base.objects,
    { id: "w1", type: "wall", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 4, symbolId: "wall-default" },
  ],
});
const ghost = renderDrawingSvg(withWall, {
  mode: "edit",
  previewWall: { x1: 0, y1: 0, x2: 80, y2: 0, lengthLabel: "80 px" },
});
ok("Ghost marker", ghost.includes("data-ghost-wall"));
const exportSvg = renderDrawingSvg(withWall, {
  mode: "export",
  previewWall: { x1: 0, y1: 0, x2: 80, y2: 0, lengthLabel: "80 px" },
});
ok("Ghost OUT default export", !exportSvg.includes("data-ghost-wall"));

/* --- Desktop chrome still has PDF --- */
ok("desktop PDF branch exists", editorSrc.includes("Podgląd PDF"));
ok("mobile FS without zoom row in mobile branch", /mobileFullscreen \? \([\s\S]*?aria-label="Elementy"[\s\S]*?\) : \(/.test(editorSrc));

/* --- NO TOUCH markers (source contract) --- */
ok("no schemaVersion bump in snap-draw", !snapSrc.includes("DRAWING_SCHEMA_VERSION"));
ok("editor no cloud-sync import", !editorSrc.includes("cloud-sync"));

console.log(`\n${pass} assertions PASS` + (fail ? ` · ${fail} FAIL` : ""));
if (fail) process.exit(1);
