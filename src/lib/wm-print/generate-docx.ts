import JSZip from "jszip";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";
import { substituteWmPrintVariables } from "@/lib/wm-print/variables";

const DOCX_XML_PATHS = [
  "word/document.xml",
  "word/header1.xml",
  "word/header2.xml",
  "word/header3.xml",
  "word/footer1.xml",
  "word/footer2.xml",
  "word/footer3.xml",
];

export async function generateDocxFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templateBytes);

  for (const path of DOCX_XML_PATHS) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async("string");
    const replaced = substituteWmPrintVariables(xml, vars);
    zip.file(path, replaced);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function generatePdfTextFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  const decoder = new TextDecoder("latin1");
  const encoder = new TextEncoder();
  let text = decoder.decode(templateBytes);
  text = substituteWmPrintVariables(text, vars);
  return encoder.encode(text);
}
