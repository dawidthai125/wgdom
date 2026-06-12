/**
 * P2-F.0 — ekstrakcja wymagań formalnych z SWZ (personel, uprawnienia, członkostwo, doświadczenie).
 */

import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import type { TenderRequirementStatus } from "@/lib/tenders-bzp-fit";

export type FormalRequirementType = "personnel" | "license" | "experience" | "membership";

export interface FormalRequirement {
  type: FormalRequirementType;
  label: string;
  count?: number;
  confidence: number;
  sourceText?: string;
}

export const FORMAL_REQUIREMENTS_UNKNOWN_LABEL =
  "Nie udało się jednoznacznie ustalić wymagań formalnych z dokumentów.";

const CONFIDENCE_MIN = 0.55;

const formalTraceBuffer: { at: string; detail: Record<string, unknown> }[] = [];
const FORMAL_TRACE_MAX = 40;

export function traceFormalExtraction(
  detail: Record<string, unknown>,
): void {
  formalTraceBuffer.unshift({ at: new Date().toISOString(), detail });
  if (formalTraceBuffer.length > FORMAL_TRACE_MAX) formalTraceBuffer.length = FORMAL_TRACE_MAX;
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[FORMAL TRACE]", detail);
  }
}

export function getFormalTraceLog(): typeof formalTraceBuffer {
  return [...formalTraceBuffer];
}

export function clearFormalTraceLog(): void {
  formalTraceBuffer.length = 0;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Sekcje SWZ z warunkami udziału / zdolnością. */
const SECTION_MARKERS = [
  /warunki udzia[łl]u w post[eę]powaniu/i,
  /warunki udzia[łl]u/i,
  /zdolno[sś][ćc] techniczna/i,
  /zdolno[sś][ćc] zawodowa/i,
  /osoby skierowane do realizacji/i,
  /personel kluczowy/i,
  /wymagania wobec wykonawcy/i,
  /kwalifikacje zawodowe/i,
  /uprawnienia zawodowe/i,
];

const SECTION_END = [
  /kryteria oceny ofert/i,
  /termin skladania ofert/i,
  /termin składania ofert/i,
  /wadium/i,
  /informacje o post[eę]powaniu/i,
  /§\s*\d+/i,
];

function extractQualificationSections(text: string): string {
  const folded = text;
  let best = "";
  for (const marker of SECTION_MARKERS) {
    const idx = folded.search(marker);
    if (idx < 0) continue;
    let end = folded.length;
    for (const endRe of SECTION_END) {
      const e = folded.slice(idx + 20).search(endRe);
      if (e >= 0) end = Math.min(end, idx + 20 + e);
    }
    const chunk = folded.slice(idx, Math.min(end, idx + 8000));
    if (chunk.length > best.length) best = chunk;
  }
  return best.length > 80 ? best : text;
}

/** Odrzuca urwane fragmenty PDF i numerację punktów. */
export function isFormalRequirementGarbage(label: string, sourceText?: string): boolean {
  const raw = normalizeSpaces(label);
  const f = fold(raw);
  if (raw.length < 8) return true;
  if (/^\d+[\.)]\s*$/.test(raw)) return true;
  if (/^uprawnienia budowlane\s+\d{1,2}$/.test(f)) return true;
  if (/i bedaca czlonkiem\s+\d/.test(f)) return true;
  if (/uprawnieniem zamawiaj/.test(f)) return true;
  if (/wobec ktorego wykonawca/.test(f)) return true;
  if (/uprawnienia budowlane i bedaca/.test(f)) return true;
  if (/^[a-z]/.test(raw) && !/^(sep|udt|piib|oiib)\b/i.test(raw)) return true;
  if (/^(oraz|oraz|lub|oraz|ktory|ktora|w\s+tym)\b/.test(f)) return true;
  if (/\b\d{1,2}\s*$/.test(raw) && !/kierownik|osob|robot|realizac/i.test(f)) return true;
  if (sourceText && fold(sourceText).length > 20 && fold(sourceText) === f && !/[.!?]$/.test(raw)) {
    if (/^(uprawnien|wpis|polisa)/.test(f) && raw.length > 120) return true;
  }
  return false;
}

interface DetectorHit {
  type: FormalRequirementType;
  label: string;
  count?: number;
  confidence: number;
  sourceText?: string;
}

function parsePersonnelCount(snippet: string): number | undefined {
  const f = fold(snippet);
  if (/(?:minimum|co najmniej|min\.)\s+(?:jedn[aą]|1)\s+(?:osob|kierownik)/.test(f)) return 1;
  const m = f.match(/(?:minimum|co najmniej|min\.)\s+(\d{1,2})\s+(?:osob|kierownik)/);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

function runDetectors(text: string): DetectorHit[] {
  const hits: DetectorHit[] = [];
  const f = fold(text);

  const personnelPatterns: { re: RegExp; label: string; conf: number }[] = [
    { re: /kierownik\s+robot(?:ow)?\s+budowlanych/gi, label: "Kierownik robót budowlanych", conf: 0.88 },
    { re: /kierownik\s+budowy/gi, label: "Kierownik budowy", conf: 0.85 },
    { re: /kierownik\s+robot(?:ow)?\s+elektrycznych/gi, label: "Kierownik robót elektrycznych", conf: 0.88 },
    { re: /kierownik\s+robot(?:ow)?\s+sanitarnych/gi, label: "Kierownik robót sanitarnych", conf: 0.88 },
    { re: /kierownik\s+branzy\s+drogowej/gi, label: "Kierownik branży drogowej", conf: 0.86 },
    { re: /kierownik\s+robot(?:ow)?/gi, label: "Kierownik robót", conf: 0.72 },
  ];
  for (const { re, label, conf } of personnelPatterns) {
    if (re.test(f)) {
      const idx = f.search(re);
      const snippet = text.slice(Math.max(0, idx - 40), idx + 120);
      hits.push({
        type: "personnel",
        label,
        count: parsePersonnelCount(snippet) ?? 1,
        confidence: conf,
        sourceText: normalizeSpaces(snippet).slice(0, 160),
      });
    }
  }

  const licensePatterns: { test: RegExp; reject?: RegExp; label: string; conf: number }[] = [
    {
      test: /uprawnienia\s+budowlane(?:\s+w\s+odpowiedniej\s+specjalnosci)?/i,
      reject: /uprawnienia\s+budowlane\s+\d{1,2}\b/i,
      label: "Uprawnienia budowlane",
      conf: 0.92,
    },
    {
      test: /(?:posiadac|posiadajac)[^,.]{0,40}uprawnienia\s+budowlane/i,
      label: "Uprawnienia budowlane",
      conf: 0.9,
    },
    {
      test: /minimum\s+jedn[aą]\s+osob[aąę][^,.]{0,80}uprawnieniami\s+budowlanymi/i,
      label: "Uprawnienia budowlane",
      conf: 0.93,
    },
    {
      test: /(?:co\s+najmniej|minimum)\s+jedn[aą]\s+osob[aąę]\s+z\s+uprawnieniami\s+budowlanymi/i,
      label: "Uprawnienia budowlane",
      conf: 0.93,
    },
    {
      test: /uprawnieniami\s+budowlanymi/i,
      reject: /uprawnieniami\s+budowlanymi\s+\d{1,2}\b/i,
      label: "Uprawnienia budowlane",
      conf: 0.88,
    },
    { test: /\bsep\b|swiadectw[aą]\s+kwalifikacyjn[aąe]\s+(?:grupy\s+)?[12]/i, label: "Uprawnienia SEP", conf: 0.9 },
    { test: /(?:kategori[aą]|grupa)\s+[de]\b|swiadectw[aą]\s+kwalifikacyjn[aąe]\s+[de]/i, label: "Uprawnienia D/E (SEP)", conf: 0.85 },
    { test: /\budt\b|urzad\s+dozoru\s+technicznego/i, label: "Uprawnienia UDT", conf: 0.88 },
    { test: /certyfikat(?:y)?\s+branzow(?:e|y|ych)/i, label: "Certyfikaty branżowe", conf: 0.8 },
  ];
  for (const { test, reject, label, conf } of licensePatterns) {
    if (test.test(f) && !(reject?.test(f))) {
      const idx = f.search(test);
      const snippet = text.slice(Math.max(0, idx - 30), idx + 100);
      hits.push({ type: "license", label, confidence: conf, sourceText: normalizeSpaces(snippet).slice(0, 160) });
    }
  }

  const membershipPatterns: { test: RegExp; label: string; conf: number }[] = [
    { test: /\bpiib\b|polska\s+izba\s+inzynierow\s+budownictwa/i, label: "Członkostwo PIIB", conf: 0.92 },
    { test: /dolnoslaska\s+izba\s+inzynierow\s+budownictwa|\bdiib\b/i, label: "Członkostwo DIIB", conf: 0.9 },
    { test: /izba\s+inzynierow\s+budownictwa|\boiib\b/i, label: "Członkostwo izby inżynierów budownictwa", conf: 0.88 },
    { test: /czlon(?:ek|kiem|kostwa)[^,.]{0,60}izb[aąy]\s+inzynierow/i, label: "Członkostwo izby inżynierów budownictwa", conf: 0.9 },
    { test: /czlon(?:ek|kiem|kostwa)[^,.]{0,20}\s+piib\b/i, label: "Członkostwo PIIB", conf: 0.91 },
  ];
  for (const { test, label, conf } of membershipPatterns) {
    if (test.test(f)) {
      hits.push({ type: "membership", label, confidence: conf });
    }
  }

  const experiencePatterns: { test: RegExp; label: string; conf: number }[] = [
    { test: /doswiadczen(?:ie|ia)[^,.]{0,80}robot(?:ach|y)\s+podobnych/i, label: "Doświadczenie w robotach podobnych", conf: 0.88 },
    { test: /(?:minimum|co najmniej)\s+\d{1,3}\s+(?:zakonczonych\s+)?(?:robot|realizac)/i, label: "Minimum zakończonych robót", conf: 0.86 },
    { test: /(?:minimum|co najmniej)\s+\d{1,3}\s+realizac/i, label: "Minimum realizacji referencyjnych", conf: 0.84 },
    { test: /wykonan(?:ie|ia)[^,.]{0,40}(?:co najmniej|minimum)[^,.]{0,40}robot/i, label: "Doświadczenie w wykonywaniu robót", conf: 0.82 },
  ];
  for (const { test, label, conf } of experiencePatterns) {
    if (test.test(f)) {
      hits.push({ type: "experience", label, confidence: conf });
    }
  }

  return hits;
}

function dedupeRequirements(hits: DetectorHit[]): FormalRequirement[] {
  const byKey = new Map<string, FormalRequirement>();
  for (const h of hits) {
    const key = `${h.type}|${fold(h.label)}`;
    const existing = byKey.get(key);
    if (!existing || h.confidence > existing.confidence) {
      byKey.set(key, {
        type: h.type,
        label: h.label,
        count: h.count,
        confidence: h.confidence,
        sourceText: h.sourceText,
      });
    }
  }
  return [...byKey.values()]
    .filter((r) => r.confidence >= CONFIDENCE_MIN)
    .filter((r) => !isFormalRequirementGarbage(r.label, r.sourceText))
    .sort((a, b) => b.confidence - a.confidence);
}

/** Główna ekstrakcja wymagań formalnych z tekstu SWZ. */
export function extractFormalRequirements(text: string): FormalRequirement[] {
  if (!text?.trim()) {
    traceFormalExtraction({ inputLength: 0, sectionLength: 0, rawHits: 0, accepted: 0, requirements: [] });
    return [];
  }
  const section = extractQualificationSections(text);
  const rawHits = runDetectors(section);
  const requirements = dedupeRequirements(rawHits);
  traceFormalExtraction({
    inputLength: text.length,
    sectionLength: section.length,
    rawHits: rawHits.length,
    accepted: requirements.length,
    requirements: requirements.map((r) => ({ type: r.type, label: r.label, confidence: r.confidence })),
  });
  return requirements;
}

/** Format jednej linii wymagania (bullet). */
export function formatFormalRequirementLine(req: FormalRequirement): string {
  if (req.type === "personnel" && req.count != null && req.count > 0) {
    return `${req.count} ${req.label.charAt(0).toLowerCase()}${req.label.slice(1)}`;
  }
  return req.label;
}

/** Lista bulletów do UI. */
export function formatFormalRequirementsBullets(requirements: FormalRequirement[]): string {
  if (requirements.length === 0) return FORMAL_REQUIREMENTS_UNKNOWN_LABEL;
  return requirements.map((r) => `• ${formatFormalRequirementLine(r)}`).join("\n");
}

export interface FormalRequirementMatch {
  requirement: FormalRequirement;
  status: TenderRequirementStatus;
  companyNote: string;
}

function profileMatchesLicense(label: string, profile: TenderCompanyProfile): TenderRequirementStatus {
  const f = fold(label);
  const licenses = profile.licenses.map(fold).join(" ");
  const strengths = profile.strengths.map(fold).join(" ");
  const hay = `${licenses} ${strengths}`;

  if (/sep/.test(f) && /sep/.test(hay)) return "met";
  if (/uprawnienia budowlane/.test(f) && /(izba inzynierow|diib|iib|inzynierow budownictwa|uprawnienia budowlane)/.test(hay)) {
    return "partial";
  }
  if (/udt/.test(f) && /udt/.test(hay)) return "met";
  if (/certyfikat/.test(f) && /(certyfikat|branz)/.test(hay)) return "partial";
  if (/d\/e|sep/.test(f) && /sep/.test(hay)) return "met";
  return "unknown";
}

function profileMatchesMembership(label: string, profile: TenderCompanyProfile): TenderRequirementStatus {
  const hay = fold(profile.licenses.join(" "));
  if (/piib|diib|oiib|izba inzynierow/.test(fold(label))) {
    if (/izba inzynierow|diib|piib|oiib/.test(hay)) return "partial";
    return "gap";
  }
  return "unknown";
}

function profileMatchesPersonnel(label: string, profile: TenderCompanyProfile): TenderRequirementStatus {
  const f = fold(label);
  const hay = fold([...profile.licenses, ...profile.strengths].join(" "));
  if (/elektrycz/.test(f) && /elektrycz/.test(hay)) return "partial";
  if (/sanitarn/.test(f) && /sanitarn/.test(hay)) return "partial";
  if (/drogo/.test(f)) return "unknown";
  if (/budowl/.test(f) && /(ogolnobudowlane|remont|wykończen|roboty budowl)/.test(hay)) return "partial";
  return "unknown";
}

function profileMatchesExperience(_label: string, profile: TenderCompanyProfile): TenderRequirementStatus {
  if (profile.referenceCount >= 3 && profile.referenceExperiencePln >= 100_000) return "partial";
  if (profile.totalReferencesPln >= 500_000) return "met";
  return "unknown";
}

/** Dopasowanie wymagań formalnych do profilu WGDOM. */
export function matchFormalRequirementsToProfile(
  requirements: FormalRequirement[],
  profile: TenderCompanyProfile,
): FormalRequirementMatch[] {
  return requirements.map((req) => {
    let status: TenderRequirementStatus = "unknown";
    if (req.type === "license") status = profileMatchesLicense(req.label, profile);
    else if (req.type === "membership") status = profileMatchesMembership(req.label, profile);
    else if (req.type === "personnel") status = profileMatchesPersonnel(req.label, profile);
    else if (req.type === "experience") status = profileMatchesExperience(req.label, profile);

    const companyNote = status === "met"
      ? "✓ zgodne z profilem firmy"
      : status === "partial"
        ? "✓ prawdopodobnie zgodne — weryfikuj w SWZ"
        : status === "gap"
          ? "⚠ brak potwierdzenia w profilu"
          : "⚠ wymaga weryfikacji";

    return { requirement: req, status, companyNote };
  });
}

export function formatFormalRequirementsProfileBullets(
  matches: FormalRequirementMatch[],
): string {
  if (matches.length === 0) return "—";
  return matches.map((m) => {
    const icon = m.status === "met" ? "✓" : m.status === "partial" ? "✓" : "⚠";
    return `${icon} ${m.requirement.label} — ${m.companyNote.replace(/^[✓⚠]\s*/, "")}`;
  }).join("\n");
}

/** Agregowany status dla checklisty Fit. */
export function aggregateFormalRequirementStatus(
  matches: FormalRequirementMatch[],
): TenderRequirementStatus {
  if (matches.length === 0) return "unknown";
  if (matches.some((m) => m.status === "gap")) return "gap";
  if (matches.every((m) => m.status === "met")) return "met";
  if (matches.some((m) => m.status === "met" || m.status === "partial")) return "partial";
  return "unknown";
}

/** Merge formalRequirements z wielu dokumentów SWZ (dedupe po type+label). */
export function mergeFormalRequirements(
  a: FormalRequirement[] | undefined,
  b: FormalRequirement[] | undefined,
): FormalRequirement[] | undefined {
  const merged = dedupeRequirements([
    ...(a ?? []).map((r) => ({
      type: r.type,
      label: r.label,
      count: r.count,
      confidence: r.confidence,
      sourceText: r.sourceText,
    })),
    ...(b ?? []).map((r) => ({
      type: r.type,
      label: r.label,
      count: r.count,
      confidence: r.confidence,
      sourceText: r.sourceText,
    })),
  ]);
  return merged.length > 0 ? merged : undefined;
}
