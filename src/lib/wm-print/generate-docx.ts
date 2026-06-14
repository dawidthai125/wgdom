import JSZip from "jszip";
import type { WmPrintVariableKey } from "@/lib/wm-print/types";
import { substituteWmPrintVariables } from "@/lib/wm-print/variables";

const DOCX_XML_PATH_PATTERN = /^word\/(document|header\d*|footer\d*|header|footer)\.xml$/;

export function listDocxXmlPartPaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((p) => DOCX_XML_PATH_PATTERN.test(p) && !zip.files[p].dir)
    .sort();
}

const WT_TEXT_RE = /^(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)$/;

/** Escapuje treść wstawianą do <w:t> (nie modyfikuje atrybutów tagu). */
export function escapeWmPrintDocxTextContent(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Podmienia wyłącznie tekst wewnątrz <w:t>…</w:t>, tagi bez zmian (P0.1A). */
export function setWtTextContent(wtFull: string, newText: string): string {
  const m = wtFull.match(WT_TEXT_RE);
  if (!m) return wtFull;
  return `${m[1]}${escapeWmPrintDocxTextContent(newText)}${m[3]}`;
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
    result += setWtTextContent(r.full, i === 0 ? substituted : "");
    cursor = r.start + r.full.length;
  }
  result += paragraphXml.slice(cursor);
  return result;
}

export interface WmPrintDocxXmlValidation {
  ok: boolean;
  issues: string[];
}

/** Walidacja fragmentu DOCX XML — bilans tagów (P0.1A). */
export function validateWmPrintDocxXml(xml: string): WmPrintDocxXmlValidation {
  const issues: string[] = [];
  const pairs: [string, string][] = [
    ["w:t", "</w:t>"],
    ["w:r", "</w:r>"],
  ];
  for (const [open, close] of pairs) {
    const o = (xml.match(new RegExp(`<${open}\\b`, "g")) || []).length;
    const c = (xml.match(new RegExp(close, "g")) || []).length;
    if (o !== c) issues.push(`${open} imbalance: ${o}/${c}`);
  }
  if (/<w:txml:space/i.test(xml)) issues.push("corrupt w:t tag (w:txml:space)");
  return { ok: issues.length === 0, issues };
}

export async function validateWmPrintDocxBytes(bytes: Uint8Array): Promise<WmPrintDocxXmlValidation> {
  const zip = await JSZip.loadAsync(bytes);
  const issues: string[] = [];
  for (const path of listDocxXmlPartPaths(zip)) {
    const xml = await zip.file(path)?.async("string");
    if (!xml) continue;
    const v = validateWmPrintDocxXml(xml);
    if (!v.ok) issues.push(`${path}: ${v.issues.join("; ")}`);
  }
  return { ok: issues.length === 0, issues };
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
