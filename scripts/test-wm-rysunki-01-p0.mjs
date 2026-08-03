/**
 * WM-RYSUNKI-01 P0 — foundation tests
 * Run: npx vite-node scripts/test-wm-rysunki-01-p0.mjs
 */
import {
  DRAWING_SCHEMA_VERSION,
  DRAWING_UNDO_STACK_MAX,
  WM_TECHNICAL_DRAWINGS_KEY,
} from "../src/lib/wm-technical-drawings/types.ts";
import {
  normalizeWmTechnicalDrawings,
  parseWmTechnicalDrawing,
  snapCoord,
  validateDrawingForSave,
  validateDrawingForFinal,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import { mergeWmTechnicalDrawings, serializeWmTechnicalDrawingsForStorage } from "../src/lib/wm-technical-drawings/merge.ts";
import {
  buildDrawingFromTemplate,
} from "../src/lib/wm-technical-drawings/templates.ts";
import { DRAWING_TEMPLATE_IDS } from "../src/lib/wm-technical-drawings/types.ts";
import {
  duplicateDrawing,
  removeDrawing,
  upsertDrawing,
  touchDrawing,
} from "../src/lib/wm-technical-drawings/report.ts";
import { renderDrawingSvg } from "../src/lib/wm-technical-drawings/render-svg.ts";
import { DrawingUndoStack } from "../src/lib/wm-technical-drawings/undo.ts";
import {
  forceWmRysunki01ForTests,
  isWmRysunki01Enabled,
  WM_RYSUNKI_01_LS_KEY,
} from "../src/lib/wm-technical-drawings/flag.ts";
import { getVisibleWmPrintTabs, WM_PRINT_TABS } from "../src/lib/wm-print/wm-print-tabs.ts";
import { DATA_KEYS } from "../src/lib/cloud-sync.ts";
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

console.log("WM-RYSUNKI-01 P0 — test-wm-rysunki-01-p0\n");

assert("T01 KV key", WM_TECHNICAL_DRAWINGS_KEY === "kw-wm-technical-drawings");
assert("T02 schemaVersion 1", DRAWING_SCHEMA_VERSION === 1);
assert("T03 DATA_KEYS contains drawings", DATA_KEYS.includes("kw-wm-technical-drawings"));
assert("T04 flag key", WM_RYSUNKI_01_LS_KEY === "kw-wm-rysunki-01");

forceWmRysunki01ForTests(false);
assert("T05 flag default OFF (forced)", isWmRysunki01Enabled() === false);
assert(
  "T06 tabs hide rysunki when OFF",
  getVisibleWmPrintTabs().every((t) => t.key !== "rysunki"),
);
forceWmRysunki01ForTests(true);
assert("T07 flag ON", isWmRysunki01Enabled() === true);
assert(
  "T08 tabs show rysunki after Odbiory",
  getVisibleWmPrintTabs()[0].key === "odbiory" && getVisibleWmPrintTabs()[1].key === "rysunki",
);
forceWmRysunki01ForTests(null);

assert("T09 templates count", DRAWING_TEMPLATE_IDS.length === 7);

const d0 = buildDrawingFromTemplate("blank", { jobId: "job-1", address: "Test 1" });
assert("T10 create blank linked", d0.linkStatus === "linked" && d0.jobId === "job-1" && d0.objects.length === 0);
assert("T11 validate save empty objects OK", validateDrawingForSave(d0).ok === true);

const dFloor = buildDrawingFromTemplate("floor_plan_apartment", { jobId: "job-1" });
assert("T12 floor template has guide walls", dFloor.objects.filter((o) => o.type === "wall").length === 4);

const withWall = touchDrawing(d0, {
  objects: [
    {
      id: "w1",
      type: "wall",
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      symbolId: "wall-default",
    },
  ],
});
assert("T13 touch wall", withWall.objects.length === 1 && withWall.objects[0].type === "wall");

const { drawings: list1 } = upsertDrawing([], withWall);
const { drawings: list2 } = upsertDrawing(list1, touchDrawing(withWall, { title: "A" }));
assert("T14 upsert update same id", list2.length === 1 && list2[0].title === "A");

const copy = duplicateDrawing(list2[0]);
assert("T15 duplicate new id draft", copy.id !== list2[0].id && copy.status === "draft" && copy.title.includes("(kopia)"));
const { drawings: list3 } = upsertDrawing(list2, copy);
const { drawings: list4, report } = removeDrawing(list3, list2[0].id);
assert("T16 hard-delete MR-02", list4.length === 1 && list4[0].id === copy.id && report.removed.includes(list2[0].id));

const merged = mergeWmTechnicalDrawings(
  [{ ...copy, updatedAt: "2026-01-01T00:00:00.000Z", title: "local" }],
  [{ ...copy, updatedAt: "2026-02-01T00:00:00.000Z", title: "cloud" }],
);
assert("T17 LWW cloud wins", merged.length === 1 && merged[0].title === "cloud");

const roundtrip = serializeWmTechnicalDrawingsForStorage(merged);
assert("T18 serialize roundtrip", roundtrip[0].id === copy.id);

const unknownVer = parseWmTechnicalDrawing({
  ...d0,
  schemaVersion: 99,
  title: "coerce",
});
assert("T19 MR-04 coerce schemaVersion", unknownVer?.schemaVersion === 1 && unknownVer.title === "coerce");

assert("T20 snap", snapCoord(14, 10, true) === 10 && snapCoord(16, 10, true) === 20);
assert("T21 snap off", snapCoord(14, 10, false) === 14);

const svg = renderDrawingSvg(withWall, { showGrid: true });
assert("T22 svg has wall line", svg.includes("<line") && svg.includes('data-id="w1"'));
assert("T23 svg grid when showGrid", svg.includes('data-grid="1"'));
const svgNoGrid = renderDrawingSvg(withWall, { showGrid: false });
assert("T24 svg no grid default export path", !svgNoGrid.includes('data-grid="1"'));

const stack = new DrawingUndoStack(d0);
stack.push(withWall);
assert("T25 undo capacity const", DRAWING_UNDO_STACK_MAX === 50);
assert("T26 can undo", stack.canUndo() === true);
const undone = stack.undo();
assert("T27 undo restores", undone.objects.length === 0);
stack.redo();
assert("T28 redo", stack.getCurrent().objects.length === 1);

const noJobFinal = validateDrawingForFinal({ ...d0, jobId: undefined, linkStatus: "manual", address: "" });
assert("T29 final requires job or address", noJobFinal.ok === false);
const finalOk = validateDrawingForFinal(d0);
assert("T30 final with job OK", finalOk.ok === true);

assert(
  "T31 WM_PRINT_TABS includes rysunki",
  WM_PRINT_TABS.some((t) => t.key === "rysunki"),
);

const tabsSrc = readFileSync(join(root, "src/lib/wm-print/wm-print-tabs.ts"), "utf8");
assert("T32 tab order Odbiory then Rysunki", /odbiory[\s\S]*rysunki[\s\S]*pomiary/.test(tabsSrc));

const normEmptyPoints = normalizeWmTechnicalDrawings([
  { ...d0, objects: [] },
]);
assert("T33 points never required for normalize", normEmptyPoints[0].objects.length === 0);

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
