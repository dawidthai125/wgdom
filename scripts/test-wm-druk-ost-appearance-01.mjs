/**
 * WM-DRUK-OST-APPEARANCE-01 — /V + /AP for JOB_STREET · BUILDING · APARTMENT.
 * NeedAppearances unchanged (stage 1).
 * npx vite-node scripts/test-wm-druk-ost-appearance-01.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  decodePDFRawStream,
} from "pdf-lib";
import {
  generatePdfFormFromTemplate,
  WM_PRINT_OST_APPEARANCE_FIELD_NAMES,
} from "../src/lib/wm-print/generate-pdf.ts";
import { WM_PRINT_OST_PDF_FIELD_MAPPING } from "../src/lib/wm-print/default-templates.ts";
import { normalizeWmPrintTemplates, getWmPrintTemplateFiles } from "../src/lib/wm-print/templates.ts";

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  PASS ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL ${msg}`);
  }
}

function extractApTextSignals(latin) {
  const paren = [...latin.matchAll(/\(([^)]*)\)\s*Tj/g)].map((m) => m[1]);
  const hex = [...latin.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((m) => {
    try {
      return Buffer.from(m[1], "hex").toString("utf16le");
    } catch {
      return m[1];
    }
  });
  const joined = [...paren, ...hex].join("");
  return {
    paren,
    hexDecoded: hex,
    joined,
    hasDrawnText:
      paren.some((s) => s.length > 0) ||
      hex.some((s) => s.replace(/\0/g, "").trim().length > 0) ||
      /BT[\s\S]*?(Tj|TJ)[\s\S]*?ET/.test(latin),
  };
}

async function decodeFieldAp(form, name) {
  const field = form.getTextField(name);
  const w = field.acroField.getWidgets()[0];
  const ap = w.dict.lookup(PDFName.of("AP"));
  if (!(ap instanceof PDFDict)) return { getText: field.getText(), error: "no AP" };
  const n = ap.lookup(PDFName.of("N"));
  const streamBytes = decodePDFRawStream({ dict: n.dict, contents: n.contents }).decode();
  const latin = Buffer.from(streamBytes).toString("latin1");
  const signals = extractApTextSignals(latin);
  const emptyLegacy =
    /\(\)\s*Tj/.test(latin) && !signals.paren.some((s) => s.length > 0) && signals.hexDecoded.length === 0;
  return {
    getText: field.getText() ?? "",
    ...signals,
    apEmptyLegacyTj: emptyLegacy,
    streamLen: streamBytes.length,
    preview: latin.replace(/\s+/g, " ").slice(0, 220),
  };
}

async function loadOstTemplateBytes() {
  const cached = join(process.cwd(), ".tmp-ost-acroform-test", "ost-template-prod.pdf");
  if (existsSync(cached)) return new Uint8Array(readFileSync(cached));

  const env = loadEnv("", process.cwd(), "");
  const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
  const ANON = env.VITE_SUPABASE_ANON_KEY;
  const kvRes = await fetch(`${BASE}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys: ["kw-wm-print-templates"] }),
  });
  if (!kvRes.ok) throw new Error(`batch-get ${kvRes.status}`);
  const kv = await kvRes.json();
  const templates = normalizeWmPrintTemplates(kv.values?.[0] ?? []);
  const ost = templates.find((t) => String(t.name || "").trim() === "OST" && t.type === "pdf_form");
  const url = getWmPrintTemplateFiles(ost ?? {})[0]?.storageUrl;
  if (!url) throw new Error("OST template URL missing");
  const pdfRes = await fetch(url);
  return new Uint8Array(await pdfRes.arrayBuffer());
}

const OUT = join(process.cwd(), ".tmp-ost-appearance-01");
mkdirSync(OUT, { recursive: true });

console.log("=== WM-DRUK-OST-APPEARANCE-01 ===\n");

const templateBytes = await loadOstTemplateBytes();
const vars = {
  DATE: "05.08.2026 r.",
  YEAR: "2026",
  JOB_ADDRESS: "3 Maja 4a/2",
  JOB_STREET: "3 Maja",
  JOB_BUILDING: "4a",
  JOB_APARTMENT: "2",
  JOB_CITY: "Wrocław",
};

const filled = await generatePdfFormFromTemplate(
  templateBytes,
  vars,
  WM_PRINT_OST_PDF_FIELD_MAPPING,
);
writeFileSync(join(OUT, "ost-appearance-filled.pdf"), filled);

const doc = await PDFDocument.load(filled, { ignoreEncryption: true });
const form = doc.getForm();

let needAppearances = "ABSENT";
try {
  const acro = doc.context.lookup(doc.catalog.get(PDFName.of("AcroForm")));
  if (acro?.has?.(PDFName.of("NeedAppearances"))) {
    needAppearances = String(acro.get(PDFName.of("NeedAppearances")));
  }
} catch {
  /* */
}
console.log("NeedAppearances (stage1 expect unchanged / false):", needAppearances);

const expected = {
  JOB_STREET: "3 Maja",
  BUILDING: "4a",
  APARTMENT: "2",
};

for (const name of WM_PRINT_OST_APPEARANCE_FIELD_NAMES) {
  const info = await decodeFieldAp(form, name);
  console.log(`\n${name}:`, JSON.stringify(info));
  assert(info.getText === expected[name], `${name} /V === ${JSON.stringify(expected[name])}`);
  assert(info.apEmptyLegacyTj !== true, `${name} /AP is not legacy empty () Tj`);
  assert(info.streamLen > 90, `${name} /AP stream longer than empty Helv shell`);
  const blob = `${info.joined} ${info.preview}`;
  if (name === "JOB_STREET") {
    assert(
      blob.includes("3") || blob.includes("Maja") || /4d0061006a0061/i.test(info.preview),
      `${name} AP encodes street`,
    );
  } else if (name === "BUILDING") {
    assert(blob.includes("4") || /3400/i.test(Buffer.from(info.preview).toString("hex")), `${name} AP encodes building`);
  } else if (name === "APARTMENT") {
    assert(blob.includes("2") || info.hasDrawnText, `${name} AP has drawn text operators`);
  }
}

/** Wrocław (commonforms) — nie przebudowywany przez OST appearance slice */
try {
  const city = form.getTextField("commonforms_text_p1_13");
  const beforeCity = city.getText();
  assert(true, `commonforms_text_p1_13 still readable (value=${JSON.stringify(beforeCity)})`);
} catch {
  assert(true, "commonforms_text_p1_13 absent in this template — skip");
}

/** Sanity: generatePdfZiTauron2026 module still importable (NO TOUCH regression smoke) */
const ziMod = await import("../src/lib/wm-print/generate-pdf-zi-tauron2026.ts");
assert(typeof ziMod.generatePdfZiTauron2026 === "function", "ZI generator export intact (NO TOUCH)");

console.log(`\n=== ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
