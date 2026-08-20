/**
 * IK-KNR KL-5 — minimal ATH INI helpers (pattern: ath-parser.ts · no PLN preview).
 */

export function decodeAthCp1250(bytes: Uint8Array): string {
  try {
    return new TextDecoder("windows-1250", { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("iso-8859-2", { fatal: false }).decode(bytes);
  }
}

export function cleanAthText(s: string): string {
  return s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").trim();
}

export type AthIniSection = {
  title: string;
  body: string;
};

export function splitAthIniSections(text: string): AthIniSection[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const starts: { title: string; index: number }[] = [];
  const re = /^\[([^\]]+)\]/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    starts.push({ title: match[1], index: match.index });
  }
  const out: AthIniSection[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const { title, index } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : normalized.length;
    const chunk = normalized.slice(index, end);
    const body = chunk.replace(/^\[[^\]]+\]\n?/, "");
    out.push({ title, body });
  }
  return out;
}

export function parseIniField(block: string, key: string): string | undefined {
  const re = new RegExp(`^${key}=(.*)$`, "m");
  const match = block.match(re);
  return match ? match[1] : undefined;
}

export function firstTabToken(s: string): string {
  const t = s.split("\t")[0]?.trim() ?? "";
  return cleanAthText(t);
}

export function firstNumericToken(s: string): string {
  const t = firstTabToken(s);
  const m = t.match(/-?\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
}
