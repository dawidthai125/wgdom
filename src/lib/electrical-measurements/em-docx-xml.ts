import JSZip from "jszip";

const DOCX_XML_PATH_PATTERN = /^word\/(document|header\d*|footer\d*|header|footer)\.xml$/;

export function listEmDocxXmlPartPaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((p) => DOCX_XML_PATH_PATTERN.test(p) && !zip.files[p].dir)
    .sort();
}

const WT_TEXT_RE = /^(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)$/;

export function escapeEmDocxTextContent(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setWtTextContent(wtFull: string, newText: string): string {
  const m = wtFull.match(WT_TEXT_RE);
  if (!m) return wtFull;
  return `${m[1]}${escapeEmDocxTextContent(newText)}${m[3]}`;
}

/** Scala split-run Word i podmienia {{PLACEHOLDER}} w akapicie. */
export function substituteEmDocxParagraphVariables(
  paragraphXml: string,
  vars: Record<string, string>,
): string {
  const runs: { full: string; start: number }[] = [];
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  let combined = "";
  while ((m = re.exec(paragraphXml)) !== null) {
    runs.push({ full: m[0], start: m.index });
    combined += m[1];
  }
  if (!runs.length) return paragraphXml;

  let substituted = combined;
  for (const [key, value] of Object.entries(vars)) {
    substituted = substituted.split(`{{${key}}}`).join(value ?? "");
  }
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

export function substituteEmDocxVariablesInXml(
  xml: string,
  vars: Record<string, string>,
): string {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) =>
    substituteEmDocxParagraphVariables(para, vars),
  );
}

export interface EmDocxXmlValidation {
  ok: boolean;
  issues: string[];
}

export function validateEmDocxXml(xml: string): EmDocxXmlValidation {
  const issues: string[] = [];
  const pairs: [string, string][] = [
    ["w:t", "</w:t>"],
    ["w:r", "</w:r>"],
    ["w:tr", "</w:tr>"],
    ["w:tc", "</w:tc>"],
  ];
  for (const [open, close] of pairs) {
    const o = (xml.match(new RegExp(`<${open}\\b`, "g")) || []).length;
    const c = (xml.match(new RegExp(close, "g")) || []).length;
    if (o !== c) issues.push(`${open} imbalance: ${o}/${c}`);
  }
  return { ok: issues.length === 0, issues };
}

export async function validateEmDocxBytes(bytes: Uint8Array): Promise<EmDocxXmlValidation> {
  const zip = await JSZip.loadAsync(bytes);
  const issues: string[] = [];
  for (const p of listEmDocxXmlPartPaths(zip)) {
    const xml = await zip.file(p)?.async("string");
    if (!xml) continue;
    const v = validateEmDocxXml(xml);
    if (!v.ok) issues.push(`${p}: ${v.issues.join("; ")}`);
  }
  return { ok: issues.length === 0, issues };
}

function substituteRowVariables(rowXml: string, vars: Record<string, string>): string {
  return substituteEmDocxVariablesInXml(rowXml, vars);
}

export interface EmDocxRowCloneSpec {
  /** Marker w wierszu wzorcowym, np. ROW_LP lub ROW_SUPPLY_LP */
  marker: string;
  rows: Record<string, string>[];
  /** Jeśli true — podmienia wiersz wzorcowy zamiast klonować (N=1, bez duplikatu). */
  substituteInPlace?: boolean;
}

/**
 * Znajduje <w:tr> zawierający {{marker}} i zastępuje jednym lub wieloma wierszami.
 */
export function expandEmDocxTemplateRows(
  xml: string,
  specs: EmDocxRowCloneSpec[],
): string {
  let result = xml;
  for (const spec of specs) {
    const placeholder = `{{${spec.marker}}}`;
    const trRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
    let match: RegExpExecArray | null = null;
    let templateRow: string | null = null;
    let start = -1;
    while ((match = trRe.exec(result)) !== null) {
      if (match[0].includes(placeholder)) {
        templateRow = match[0];
        start = match.index;
        break;
      }
    }
    if (!templateRow || start < 0) continue;

    const dataRows = spec.rows.length ? spec.rows : [];
    let replacement = "";
    if (dataRows.length === 0) {
      replacement = "";
    } else if (spec.substituteInPlace && dataRows.length === 1) {
      replacement = substituteRowVariables(templateRow, dataRows[0]);
    } else {
      replacement = dataRows.map((rowVars) => substituteRowVariables(templateRow!, rowVars)).join("");
    }

    result = result.slice(0, start) + replacement + result.slice(start + templateRow.length);
  }
  return result;
}

export async function generateEmDocxFromTemplateBytes(
  templateBytes: Uint8Array,
  scalars: Record<string, string>,
  rowSpecs: EmDocxRowCloneSpec[] = [],
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templateBytes);
  for (const path of listEmDocxXmlPartPaths(zip)) {
    const entry = zip.file(path);
    if (!entry) continue;
    let xml = await entry.async("string");
    xml = expandEmDocxTemplateRows(xml, rowSpecs);
    xml = substituteEmDocxVariablesInXml(xml, scalars);
    zip.file(path, xml);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
