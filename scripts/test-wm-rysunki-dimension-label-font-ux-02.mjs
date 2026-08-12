/**
 * WM-RYSUNKI-DIMENSION-LABEL-FONT-UX-02 — harness T-L / T-F / T-E
 * Run: npx vite-node scripts/test-wm-rysunki-dimension-label-font-ux-02.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DrawingUndoStack } from "../src/lib/wm-technical-drawings/undo.ts";
import {
  DRAWING_DIMENSION_FONT_SIZE,
  DRAWING_DIMENSION_FONT_SIZES,
  DRAWING_DIMENSION_NORMAL_OFFSET,
  DRAWING_RENDER_VERSION,
  dimensionLabelExtraOffset,
  dimensionLabelOffset,
  renderDrawingSvg,
  resolveDimensionFontSize,
} from "../src/lib/wm-technical-drawings/render-svg.ts";
import { canonicalizeSegmentForDimensionOffset } from "../src/lib/wm-technical-drawings/symbols/render-symbol.ts";
import { parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";
import { touchDrawing } from "../src/lib/wm-technical-drawings/report.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { DRAWING_SCHEMA_VERSION } from "../src/lib/wm-technical-drawings/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const editorSrc = readFileSync(join(root, "src/app/WmPrintDrawingEditor.tsx"), "utf8");
const exportPdfSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/export-pdf.ts"), "utf8");
const zipSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/zip-entries.ts"), "utf8");
const renderSrc = readFileSync(join(root, "src/lib/wm-technical-drawings/render-svg.ts"), "utf8");

let pass = 0;
let fail = 0;
function ok(name, cond) {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.error(`FAIL ${name}`);
  }
}

console.log("=== WM-RYSUNKI-DIMENSION-LABEL-FONT-UX-02 ===");

ok("schemaVersion still 1", DRAWING_SCHEMA_VERSION === 1);
ok("CONST normalOffset 16", DRAWING_DIMENSION_NORMAL_OFFSET === 16);
ok("CONST default font 14", DRAWING_DIMENSION_FONT_SIZE === 14);
ok("CONST sizes 12/14/18/24", DRAWING_DIMENSION_FONT_SIZES.join(",") === "12,14,18,24");
ok("CONST render version 4", DRAWING_RENDER_VERSION === 4);

/* f(font) grows and clears half-glyph */
const extras = DRAWING_DIMENSION_FONT_SIZES.map((s) => dimensionLabelExtraOffset(s));
ok(
  "f grows 12→24",
  extras[0] < extras[1] && extras[1] < extras[2] && extras[2] < extras[3],
);
ok(
  "f clears half glyph",
  DRAWING_DIMENSION_FONT_SIZES.every((s) => dimensionLabelExtraOffset(s) > s / 2),
);

const blank = buildDrawingFromTemplate("blank", { jobId: "dim-label-font", address: "Test" });

function mkDim(partial) {
  return {
    id: partial.id ?? "dim1",
    type: "dimension",
    x1: partial.x1,
    y1: partial.y1,
    x2: partial.x2,
    y2: partial.y2,
    label: partial.label ?? "3,44 m",
    symbolId: "dimension-line",
    ...(partial.fontSize != null ? { fontSize: partial.fontSize } : {}),
  };
}

function dimSvg(partial, mode = "edit") {
  return renderDrawingSvg(touchDrawing(blank, { objects: [mkDim(partial)] }), { mode });
}

function parseDimLabel(svg) {
  const m = svg.match(
    /data-dim-label="1"[^>]*\sx="([^"]+)"\s+y="([^"]+)"([^>]*)font-size="([^"]+)"/,
  );
  if (!m) {
    const m2 = svg.match(
      /data-dim-label="1"[^>]*font-size="([^"]+)"[^>]*\sx="([^"]+)"\s+y="([^"]+)"/,
    );
    if (!m2) return null;
    return { fontSize: Number(m2[1]), x: Number(m2[2]), y: Number(m2[3]), attrs: "" };
  }
  return { x: Number(m[1]), y: Number(m[2]), attrs: m[3], fontSize: Number(m[4]) };
}

/* --- LABEL --- */
const off14 = dimensionLabelOffset(14);
ok("labelOff default = 16+f(14)", off14 === 16 + dimensionLabelExtraOffset(14) && off14 > 16);

const svgH = dimSvg({ id: "h", x1: 0, y1: 100, x2: 200, y2: 100, label: "3,44 m" });
const labH = parseDimLabel(svgH);
const canH = canonicalizeSegmentForDimensionOffset({ x1: 0, y1: 100, x2: 200, y2: 100 });
ok("T-L1 horizontal label below line", labH != null && labH.y === canH.my + canH.ny * off14 && labH.y > 100 + 16);
ok("T-L1 no rotate", labH != null && !/rotate\(-90/.test(labH.attrs) && !svgH.includes(`rotate(-90 ${labH.x} ${labH.y})`));
ok(
  "T-L2 horizontal no overlap (gap > half font)",
  labH != null && labH.y - (100 + 16) === dimensionLabelExtraOffset(14) && dimensionLabelExtraOffset(14) > 14 / 2,
);
ok("T-L2 body line still at 16", svgH.includes("translate(100 116)") || svgH.includes("translate(100.0 116"));

const svgV = dimSvg({ id: "v", x1: 50, y1: 0, x2: 50, y2: 200, label: "2,20 m" });
const labV = parseDimLabel(svgV);
const canV = canonicalizeSegmentForDimensionOffset({ x1: 50, y1: 0, x2: 50, y2: 200 });
ok(
  "T-L3 vertical rotate -90",
  labV != null && svgV.includes(`transform="rotate(-90 ${labV.x} ${labV.y})"`),
);
ok(
  "T-L4 vertical offset (left of line)",
  labV != null &&
    labV.x === canV.mx + canV.nx * off14 &&
    labV.x < 50 - 16 &&
    Math.abs(labV.x - (50 - off14)) < 0.01,
);

const svgDiag = dimSvg({ id: "d", x1: 0, y1: 0, x2: 80, y2: 60, label: "diag" });
ok(
  "T-L5 diagonal regression (label + no -90)",
  svgDiag.includes('data-dim-label="1"') &&
    svgDiag.includes(">diag</text>") &&
    !svgDiag.includes("rotate(-90"),
);

/* --- FONT --- */
ok("T-F1 default 14", labH != null && labH.fontSize === 14 && resolveDimensionFontSize(undefined) === 14);

for (const size of DRAWING_DIMENSION_FONT_SIZES) {
  const svg = dimSvg({
    id: `f${size}`,
    x1: 0,
    y1: 50,
    x2: 100,
    y2: 50,
    label: `S${size}`,
    fontSize: size,
  });
  const lab = parseDimLabel(svg);
  const expectedY = 50 + dimensionLabelOffset(size);
  ok(
    `T-F new ${size}`,
    lab != null && lab.fontSize === size && lab.y === expectedY && svg.includes(`>S${size}</text>`),
  );
}

const stack = new DrawingUndoStack(blank);
const withDim = touchDrawing(blank, {
  objects: [mkDim({ id: "resize", x1: 0, y1: 10, x2: 100, y2: 10, label: "1,00 m", fontSize: 14 })],
});
stack.push(withDim);
const resized = touchDrawing(stack.getCurrent(), {
  objects: stack.getCurrent().objects.map((o) =>
    o.id === "resize" && o.type === "dimension" ? { ...o, fontSize: 24 } : o,
  ),
});
stack.push(resized);
ok(
  "T-F6 existing dimension resize",
  stack.getCurrent().objects.find((o) => o.id === "resize")?.fontSize === 24 &&
    renderDrawingSvg(stack.getCurrent()).includes('font-size="24"'),
);
stack.undo();
ok(
  "T-F8 one resize = one undo",
  stack.getCurrent().objects.find((o) => o.id === "resize")?.fontSize === 14,
);

ok(
  "T-F7 selected value reflected (editor UI)",
  editorSrc.includes("Rozmiar czcionki wymiaru") &&
    editorSrc.includes("dimensionFontSize") &&
    editorSrc.includes("dimensionFontControlValue") &&
    editorSrc.includes("applyDimensionFontSize") &&
    editorSrc.includes("DRAWING_DIMENSION_FONT_SIZES") &&
    !editorSrc.includes("dimensionFontSize = textFontSize") &&
    editorSrc.includes("tool === \"dimension\" || selectedDimension"),
);

const legacyRaw = {
  ...blank,
  objects: [
    {
      id: "legacy",
      type: "dimension",
      x1: 0,
      y1: 0,
      x2: 40,
      y2: 0,
      label: "legacy",
      symbolId: "dimension-line",
    },
  ],
};
const legacyParsed = parseWmTechnicalDrawing(legacyRaw);
const legacyDim = legacyParsed.objects.find((o) => o.id === "legacy");
ok("T-F9 legacy JSON → no fontSize field", legacyDim && legacyDim.fontSize === undefined);
ok(
  "T-F9 legacy render 14",
  renderDrawingSvg(legacyParsed).includes('font-size="14"') &&
    renderDrawingSvg(legacyParsed).includes(">legacy</text>"),
);

const with24 = touchDrawing(blank, {
  objects: [mkDim({ id: "persist", x1: 0, y1: 0, x2: 50, y2: 0, label: "P", fontSize: 18 })],
});
const roundTrip = parseWmTechnicalDrawing(JSON.parse(JSON.stringify(with24)));
ok(
  "T-F10 fontSize persists reload",
  roundTrip.objects.find((o) => o.id === "persist")?.fontSize === 18 &&
    renderDrawingSvg(roundTrip).includes('font-size="18"'),
);

/* invalid normalize → omit */
const bad = parseWmTechnicalDrawing({
  ...blank,
  objects: [{ id: "bad", type: "dimension", x1: 0, y1: 0, x2: 10, y2: 0, fontSize: "nope", symbolId: "dimension-line" }],
});
ok("invalid fontSize → undefined", bad.objects[0]?.fontSize === undefined);

/* --- EXPORT (SSOT renderDrawingSvg) --- */
const exportObj = mkDim({ id: "ex", x1: 0, y1: 20, x2: 120, y2: 20, label: "exp", fontSize: 24 });
const exportSvg = renderDrawingSvg(touchDrawing(blank, { objects: [exportObj] }), {
  mode: "export",
  showGrid: false,
});
ok("T-E1 PDF path uses renderDrawingSvg fontSize", exportPdfSrc.includes("renderDrawingSvg") && exportSvg.includes('font-size="24"'));
ok(
  "T-E2 PNG path uses export SVG fontSize",
  editorSrc.includes("rasterizeDrawingSvgToPng") &&
    editorSrc.includes('mode: "export"') &&
    exportSvg.includes('font-size="24"') &&
    exportSvg.includes(`y="${20 + dimensionLabelOffset(24)}"`),
);
ok(
  "T-E3 ZIP uses PDF SSOT (generateDrawingPdf → renderDrawingSvg)",
  zipSrc.includes("generateDrawingPdf") &&
    exportPdfSrc.includes("renderDrawingSvg") &&
    exportSvg.includes('data-render-mode="export"') &&
    exportSvg.includes('font-size="24"'),
);

/* line offset frozen in source */
ok("line normalOffset stays 16 in render", renderSrc.includes("DRAWING_DIMENSION_NORMAL_OFFSET") && DRAWING_DIMENSION_NORMAL_OFFSET === 16);
ok(
  "label uses dimensionLabelOffset not line-only",
  renderSrc.includes("dimensionLabelOffset") && renderSrc.includes("resolveDimensionFontSize"),
);

/* session independence */
ok(
  "dimensionFontSize ≠ textFontSize state",
  editorSrc.includes("useState(DRAWING_DIMENSION_FONT_SIZE)") &&
    editorSrc.includes("useState(TEXT_DEFAULT_FONT_SIZE)") &&
    editorSrc.includes("fontSize: dimensionFontSize"),
);

console.log(`\nRESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
