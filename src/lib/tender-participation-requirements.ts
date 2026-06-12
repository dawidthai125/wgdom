/**
 * P2-F.1 — wymagania udziału w postępowaniu wyciągane z SWZ (rozszerzenie P2-F.0).
 */

import {
  extractFormalRequirements,
  type FormalRequirement,
} from "@/lib/tender-formal-requirements";
import { parsePlnAmount } from "@/lib/tenders-bzp-swz";

export type TenderParticipationRequirementType =
  | "personnel"
  | "license"
  | "experience"
  | "insurance"
  | "finance"
  | "reference";

/** Klucz dopasowania do profilu wykonawcy. */
export type ParticipationRequirementKey =
  | "kierownikBudowy"
  | "kierownikSanitarny"
  | "kierownikElektryczny"
  | "kierownikDrogowy"
  | "kierownikRobot"
  | "piib"
  | "sep"
  | "sepD"
  | "sepE"
  | "udt"
  | "uprawnieniaBudowlane"
  | "experienceProjects"
  | "experienceValue"
  | "experienceSimilar"
  | "ocInsurance"
  | "financialCapacity"
  | "references";

export interface TenderParticipationRequirement {
  type: TenderParticipationRequirementType;
  label: string;
  required: boolean;
  key?: ParticipationRequirementKey;
  minProjects?: number;
  minValuePln?: number;
  minReferences?: number;
  confidence: number;
  sourceText?: string;
}

const CONFIDENCE_MIN = 0.55;

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function personnelKey(label: string): ParticipationRequirementKey {
  const f = fold(label);
  if (/sanitarn/.test(f)) return "kierownikSanitarny";
  if (/elektrycz/.test(f)) return "kierownikElektryczny";
  if (/drogow/.test(f)) return "kierownikDrogowy";
  if (/budow/.test(f)) return "kierownikBudowy";
  return "kierownikRobot";
}

function licenseKey(label: string): ParticipationRequirementKey {
  const f = fold(label);
  if (/\bpiib\b|czlonkostwo/.test(f)) return "piib";
  if (/sep/.test(f) && /\bd\b|grupa\s+d/.test(f)) return "sepD";
  if (/sep/.test(f) && /\be\b|grupa\s+e/.test(f)) return "sepE";
  if (/sep/.test(f)) return "sep";
  if (/udt/.test(f)) return "udt";
  if (/uprawnienia budowlane/.test(f)) return "uprawnieniaBudowlane";
  return "uprawnieniaBudowlane";
}

function formalToParticipation(req: FormalRequirement): TenderParticipationRequirement | null {
  if (req.confidence < CONFIDENCE_MIN) return null;
  if (req.type === "personnel") {
    return {
      type: "personnel",
      label: req.label,
      required: true,
      key: personnelKey(req.label),
      confidence: req.confidence,
      sourceText: req.sourceText,
    };
  }
  if (req.type === "license" || req.type === "membership") {
    return {
      type: "license",
      label: req.label,
      required: true,
      key: licenseKey(req.label),
      confidence: req.confidence,
      sourceText: req.sourceText,
    };
  }
  if (req.type === "experience") {
    return {
      type: "experience",
      label: req.label,
      required: true,
      key: "experienceSimilar",
      confidence: req.confidence,
      sourceText: req.sourceText,
    };
  }
  return null;
}

function parseMinPlnFromSnippet(snippet: string): number | null {
  const m = snippet.match(
    /(?:minimum|co najmniej|min\.)\s+([\d\s.,]{3,20})\s*(?:zł|pln|zl)/i,
  );
  if (!m) return null;
  return parsePlnAmount(m[1]).value;
}

function parseMinProjects(snippet: string): number | null {
  const f = fold(snippet);
  const m = f.match(/(?:minimum|co najmniej|min\.)\s+(\d{1,3})\s+(?:zakonczon[a-z]+\s+)?(?:robot|realizac)/);
  if (m) return parseInt(m[1], 10);
  if (/(?:minimum|co najmniej)\s+(?:dwie|2)\s+robot/.test(f)) return 2;
  if (/(?:minimum|co najmniej)\s+(?:trzy|3)\s+realizac/.test(f)) return 3;
  return null;
}

function detectExtendedRequirements(text: string): TenderParticipationRequirement[] {
  const hits: TenderParticipationRequirement[] = [];
  const f = fold(text);

  const ocPatterns = [
    /polisa\s+oc[^.]{0,120}/gi,
    /ubezpieczen[^.]{0,40}odpowiedzialnosci cywilnej[^.]{0,120}/gi,
    /sum[aę]\s+ubezpieczenia[^.]{0,120}/gi,
  ];
  for (const re of ocPatterns) {
    const m = text.match(re);
    if (m) {
      const snippet = m[0];
      const minPln = parseMinPlnFromSnippet(snippet);
      hits.push({
        type: "insurance",
        label: minPln != null
          ? `Polisa OC min. ${minPln.toLocaleString("pl-PL")} zł`
          : "Polisa OC",
        required: true,
        key: "ocInsurance",
        minValuePln: minPln ?? undefined,
        confidence: minPln != null ? 0.9 : 0.78,
        sourceText: snippet.slice(0, 160),
      });
      break;
    }
  }

  if (/srodki finansowe|zdolnosc kredytowa|zdolnosc finansowa|sytuacja finansowa/.test(f)) {
    hits.push({
      type: "finance",
      label: "Zdolność finansowa / środki finansowe",
      required: true,
      key: "financialCapacity",
      confidence: 0.75,
    });
  }

  const expProject = parseMinProjects(text);
  if (expProject != null) {
    hits.push({
      type: "experience",
      label: `Minimum ${expProject} zakończonych robót`,
      required: true,
      key: "experienceProjects",
      minProjects: expProject,
      confidence: 0.86,
    });
  }

  const valuePatterns = [
    /(?:minimum|co najmniej)[^,.]{0,60}([\d\s.,]{4,20})\s*(?:zł|pln|zl)/gi,
    /(?:wartosc|kwota)[^,.]{0,40}(?:minimum|co najmniej)[^,.]{0,40}([\d\s.,]{4,20})/gi,
  ];
  for (const re of valuePatterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const pln = parsePlnAmount(match[1]).value;
      if (pln != null && pln >= 50_000) {
        hits.push({
          type: "experience",
          label: `Doświadczenie min. ${pln.toLocaleString("pl-PL")} zł`,
          required: true,
          key: "experienceValue",
          minValuePln: pln,
          confidence: 0.84,
          sourceText: match[0].slice(0, 160),
        });
        break;
      }
    }
    if (hits.some((h) => h.key === "experienceValue")) break;
  }

  const refM = f.match(/(?:minimum|co najmniej)\s+(\d{1,2})\s+referenc/i);
  if (refM) {
    hits.push({
      type: "reference",
      label: `Minimum ${refM[1]} referencji`,
      required: true,
      key: "references",
      minReferences: parseInt(refM[1], 10),
      confidence: 0.85,
    });
  }

  return hits;
}

function dedupeRequirements(
  items: TenderParticipationRequirement[],
): TenderParticipationRequirement[] {
  const byKey = new Map<string, TenderParticipationRequirement>();
  for (const item of items) {
    const k = `${item.type}|${item.key ?? fold(item.label)}`;
    const existing = byKey.get(k);
    if (!existing || item.confidence > existing.confidence) {
      byKey.set(k, item);
    }
  }
  return [...byKey.values()]
    .filter((r) => r.confidence >= CONFIDENCE_MIN)
    .sort((a, b) => b.confidence - a.confidence);
}

/** Ekstrakcja wymagań udziału z tekstu SWZ. */
export function extractParticipationRequirements(text: string): TenderParticipationRequirement[] {
  if (!text?.trim()) return [];
  const formal = extractFormalRequirements(text);
  const fromFormal = formal
    .map(formalToParticipation)
    .filter((r): r is TenderParticipationRequirement => r != null);
  const extended = detectExtendedRequirements(text);
  return dedupeRequirements([...fromFormal, ...extended]);
}

export function mergeParticipationRequirements(
  a: TenderParticipationRequirement[] | undefined,
  b: TenderParticipationRequirement[] | undefined,
): TenderParticipationRequirement[] | undefined {
  const merged = dedupeRequirements([...(a ?? []), ...(b ?? [])]);
  return merged.length > 0 ? merged : undefined;
}
