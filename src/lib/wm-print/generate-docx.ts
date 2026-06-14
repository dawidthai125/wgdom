import JSZip from "jszip";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";
import { substituteWmPrintVariables } from "@/lib/wm-print/variables";

const DOCX_XML_PATH_PATTERN = /^word\/(document|header\d*|footer\d*|header|footer)\.xml$/;

export function listDocxXmlPartPaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((p) => DOCX_XML_PATH_PATTERN.test(p) && !zip.files[p].dir)
    .sort();
}

/** Pojedynczy akapit DOCX — scala <w:t> przed podmianą (fix split-run Word, P0-C). */
export function substituteParagraphWmPrintVariables(
  paragraphXml: string,
  vars: Record<WmPrintVariableKey, string>,
): string {
  const runs: { full: string; text: string; start: number }[] = [];
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  let combined = "";
  while ((m = re.exec(paragraphXml)) !== null) {
    runs.push({ full: m[0], text: m[1], start: m.index });
    combined += m[1];
  }
  if (!runs.length) return paragraphXml;

  const substituted = substituteWmPrintVariables(combined, vars);
  if (substituted === combined) return paragraphXml;

  let result = "";
  let cursor = 0;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    result += paragraphXml.slice(cursor, r.start);
    result += i === 0 ? r.full.replace(r.text, substituted) : r.full.replace(r.text, "");
    cursor = r.start + r.full.length;
  }
  result += paragraphXml.slice(cursor);
  return result;
}

export function substituteWmPrintVariablesInDocxXml(
  xml: string,
  vars: Record<WmPrintVariableKey, string>,
): string {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) =>
    substituteParagraphWmPrintVariables(para, vars),
  );
}

export async function generateDocxFromTemplate(
  templateBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templateBytes);
  const paths = listDocxXmlPartPaths(zip);

  for (const path of paths) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async("string");
    zip.file(path, substituteWmPrintVariablesInDocxXml(xml, vars));
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** @deprecated P0-A — nie używać dla binarnych PDF. Zostaje dla testów legacy. */
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
