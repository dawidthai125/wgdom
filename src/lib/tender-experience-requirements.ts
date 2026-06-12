/**
 * P2-F.2 — ekstrakcja wymagań doświadczenia/referencji z SWZ.
 */

import { parsePlnAmount } from "@/lib/tenders-bzp-swz";

export interface ExperienceRequirement {
  minProjects: number;
  minValuePln: number | null;
  category: string | null;
  referenceRequired: boolean;
  /** Okres w latach (np. ostatnie 5 lat). */
  periodYears: number | null;
  confidence: number;
  label: string;
  sourceText?: string;
}

const CONFIDENCE_MIN = 0.55;

const experienceTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const TRACE_MAX = 30;

export function traceExperienceExtraction(detail: Record<string, unknown>): void {
  experienceTraceBuffer.unshift({ at: new Date().toISOString(), detail });
  if (experienceTraceBuffer.length > TRACE_MAX) experienceTraceBuffer.length = TRACE_MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[EXPERIENCE TRACE]", detail);
  }
}

export function getExperienceTraceLog(): typeof experienceTraceBuffer {
  return [...experienceTraceBuffer];
}

export function clearExperienceTraceLog(): void {
  experienceTraceBuffer.length = 0;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

const CATEGORY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /robot(?:y|ach)\s+podobn(?:e|ych)/i, label: "roboty podobne" },
  { re: /robot(?:y|ach)\s+remontow(?:e|ych)/i, label: "roboty remontowe" },
  { re: /robot(?:y|ach)\s+budowlan(?:e|ych)/i, label: "roboty budowlane" },
  { re: /robot(?:y|ach)\s+instalacyjn(?:e|ych)/i, label: "roboty instalacyjne" },
  { re: /robot(?:y|ach)\s+elektryczn(?:e|ych)/i, label: "roboty elektryczne" },
  { re: /robot(?:y|ach)\s+sanitarn(?:e|ych)/i, label: "roboty sanitarne" },
];

function parseWordCount(word: string): number | null {
  const f = fold(word);
  if (/^(\d+)$/.test(f)) return parseInt(f, 10);
  if (/jedn|1/.test(f)) return 1;
  if (/dwie|dwoch|2/.test(f)) return 2;
  if (/trzy|3/.test(f)) return 3;
  if (/cztery|4/.test(f)) return 4;
  if (/piec|5/.test(f)) return 5;
  return null;
}

function parseMinProjectsFromText(text: string): number | null {
  const f = fold(text);
  const patterns = [
    /(?:minimum|co najmniej|min\.)\s+(\d{1,2}|jedna|jedn[aą]|dwie|trzy|cztery|pie[cć])\s+(?:zakonczon[a-z]+\s+)?(?:robot|realizac)/i,
    /(?:minimum|co najmniej)\s+(\d{1,2})\s+(?:zakonczon[a-z]+\s+)?(?:robot|realizac)/i,
    /(?:wykonan[a-z]+\s+)?(?:minimum|co najmniej)\s+(\d{1,2})\s+robot/i,
  ];
  for (const re of patterns) {
    const m = f.match(re);
    if (m) {
      const n = parseWordCount(m[1]) ?? parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function parseMinValuePln(text: string): number | null {
  const patterns = [
    /(?:warto[sś]ci|kwocie|nie mniejszej ni[zż]|co najmniej)\s+([\d\s.,]{3,20})\s*(?:z[lł]|pln)/gi,
    /(?:minimum|co najmniej)\s+([\d\s.,]{3,20})\s*(?:z[lł]|pln)/gi,
    /([\d\s.,]{4,20})\s*(?:z[lł]|pln)\s*(?:kazd[aą]|each|na robot)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const pln = parsePlnAmount(m[1]).value;
      if (pln != null && pln >= 10_000) return pln;
    }
  }
  return null;
}

function detectCategory(text: string): string | null {
  const f = fold(text);
  for (const { re, label } of CATEGORY_PATTERNS) {
    if (re.test(f)) return label;
  }
  return null;
}

function detectPeriodYears(text: string): number | null {
  const f = fold(text);
  const m = f.match(/(?:w\s+)?okresie\s+ostatnich\s+(\d{1,2})\s+lat/);
  if (m) return parseInt(m[1], 10);
  const m2 = f.match(/w\s+ciagu\s+ostatnich\s+(\d{1,2})\s+lat/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function detectReferenceRequired(text: string): boolean {
  const f = fold(text);
  return /referencj|nalezyte wykonanie|swiadectw[aą]\s+(?:dobrego|nalezytego)\s+wykonania/.test(f);
}

function buildLabel(req: Omit<ExperienceRequirement, "label" | "confidence" | "sourceText">): string {
  const parts: string[] = [];
  parts.push(`Minimum ${req.minProjects} ${req.minProjects === 1 ? "realizacja" : "realizacje"}`);
  if (req.minValuePln != null) {
    parts.push(`> ${req.minValuePln.toLocaleString("pl-PL")} zł`);
  }
  if (req.category) parts.push(`(${req.category})`);
  if (req.periodYears != null) parts.push(`— ostatnie ${req.periodYears} lat`);
  if (req.referenceRequired) parts.push("+ referencje");
  return parts.join(" ");
}

function extractFromSection(text: string): ExperienceRequirement[] {
  const hits: ExperienceRequirement[] = [];
  const sectionMarkers = [
    /zdolnosc techniczna/i,
    /zdolnosc zawodowa/i,
    /doswiadczen/i,
    /referencj/i,
    /warunki udzialu/i,
  ];
  const chunks: string[] = [text];
  for (const marker of sectionMarkers) {
    const idx = text.search(marker);
    if (idx >= 0) chunks.push(text.slice(idx, idx + 4000));
  }
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const sentences = chunk.split(/(?<=[.;])\s+/);
    for (const sentence of sentences) {
      const f = fold(sentence);
      if (!/(?:robot|realizac|doswiadczen|referencj|wykonan)/.test(f)) continue;

      const minProjects = parseMinProjectsFromText(sentence) ?? (/(?:co najmniej|minimum)\s+jedn/.test(f) ? 1 : null);
      const minValuePln = parseMinValuePln(sentence);
      const category = detectCategory(sentence);
      const periodYears = detectPeriodYears(sentence);
      const referenceRequired = detectReferenceRequired(sentence);
      const similarOnly = /robot(?:y|ach)\s+podobn/.test(f);

      if (minProjects == null && minValuePln == null && !referenceRequired && !similarOnly) continue;

      const req: ExperienceRequirement = {
        minProjects: minProjects ?? (referenceRequired ? 1 : 2),
        minValuePln,
        category: category ?? (similarOnly ? "roboty podobne" : null),
        referenceRequired,
        periodYears,
        confidence: 0.72,
        label: "",
        sourceText: sentence.trim().slice(0, 200),
      };

      if (minProjects != null && minValuePln != null) req.confidence = 0.92;
      else if (minProjects != null || minValuePln != null) req.confidence = 0.86;
      if (referenceRequired) req.confidence = Math.max(req.confidence, 0.84);

      req.label = buildLabel(req);
      const key = `${req.minProjects}|${req.minValuePln}|${req.category}|${req.referenceRequired}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(req);
    }
  }

  return hits.filter((r) => r.confidence >= CONFIDENCE_MIN);
}

/** Ekstrakcja wymagań doświadczenia z tekstu SWZ. */
export function extractExperienceRequirements(text: string): ExperienceRequirement[] {
  if (!text?.trim()) {
    traceExperienceExtraction({ inputLength: 0, requirements: [] });
    return [];
  }
  const requirements = extractFromSection(text);
  traceExperienceExtraction({
    inputLength: text.length,
    count: requirements.length,
    requirements: requirements.map((r) => ({
      minProjects: r.minProjects,
      minValuePln: r.minValuePln,
      category: r.category,
      referenceRequired: r.referenceRequired,
    })),
  });
  return requirements;
}

export function mergeExperienceRequirements(
  a: ExperienceRequirement[] | undefined,
  b: ExperienceRequirement[] | undefined,
): ExperienceRequirement[] | undefined {
  const seen = new Map<string, ExperienceRequirement>();
  for (const r of [...(a ?? []), ...(b ?? [])]) {
    const key = `${r.minProjects}|${r.minValuePln}|${r.category}|${r.referenceRequired}`;
    const existing = seen.get(key);
    if (!existing || r.confidence > existing.confidence) seen.set(key, r);
  }
  const merged = [...seen.values()].filter((r) => r.confidence >= CONFIDENCE_MIN);
  return merged.length > 0 ? merged : undefined;
}
