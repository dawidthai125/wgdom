/**
 * Pass-2 Content + COND-8f Section scoring (inside sample; max page score).
 */

import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { DI_SAMPLE_PAGES } from "./types";

const BOQ_CONTENT_RE =
  /przedmiar|kosztorys|ilo[sś][cć]|pozycj|jednostk|nak[łl]ad|podstawa|robocizn|mater[iy]a[łl]|sprz[eę]t|wykaz\s+zakres|zakres\s+rzeczowo|rzeczowo[\s-]*finansow|formularz\s+cenow/gi;

const SECTION_HEADERS: { re: RegExp; weight: number; label: string }[] = [
  { re: /przedmiar\s+rob[oó]t/i, weight: 1, label: "przedmiar robót" },
  { re: /kosztorys\s+(ofertowy|szczeg[oó]łowy)/i, weight: 0.95, label: "kosztorys" },
  { re: /wykaz\s+zakresu?\s+rzeczowo/i, weight: 0.9, label: "wykaz zakresu" },
  { re: /zakres\s+rzeczowo[\s-]*finansow/i, weight: 0.9, label: "zakres rzeczowo-finansowy" },
  { re: /zestawienie\s+rob[oó]t/i, weight: 0.85, label: "zestawienie robót" },
  { re: /specyfikacja\s+techniczna|stwiorb|\bst\b/i, weight: 0.35, label: "ST/OPZ soft" },
];

function contentHitDensity(text: string): number {
  const t = String(text || "");
  if (!t.trim()) return 0;
  const matches = t.match(BOQ_CONTENT_RE);
  const hits = matches?.length ?? 0;
  const norm = Math.min(1, hits / 12);
  return norm;
}

export function scoreSectionOnPage(pageText: string): { score: number; label: string | null } {
  let best = 0;
  let label: string | null = null;
  for (const h of SECTION_HEADERS) {
    if (h.re.test(pageText)) {
      if (h.weight > best) {
        best = h.weight;
        label = h.label;
      }
    }
  }
  return { score: best, label };
}

export function samplePagesForContent(
  pageTexts: readonly string[] | undefined,
  fullText: string | null | undefined,
  maxPages = DI_SAMPLE_PAGES,
): string[] {
  if (pageTexts && pageTexts.length > 0) {
    return pageTexts.slice(0, maxPages).map((p) => String(p || ""));
  }
  const full = String(fullText || "");
  if (!full.trim()) return [];
  // Approximate page splits on form-feed or ~3500 chars
  const parts = full.includes("\f")
    ? full.split("\f")
    : full.match(/[\s\S]{1,3500}/g) ?? [full];
  return parts.slice(0, maxPages);
}

export function scoreContentAndSection(input: {
  pageTexts?: readonly string[];
  fullText?: string | null;
}): {
  contentScore: number;
  sectionBoost: number;
  sampledPages: number;
  evidence: DiEvidence[];
} {
  const pages = samplePagesForContent(input.pageTexts, input.fullText);
  if (pages.length === 0) {
    return {
      contentScore: 0,
      sectionBoost: 0,
      sampledPages: 0,
      evidence: [],
    };
  }

  let maxContent = 0;
  let maxSection = 0;
  let bestSectionLabel: string | null = null;
  for (const page of pages) {
    const c = contentHitDensity(page);
    if (c > maxContent) maxContent = c;
    const sec = scoreSectionOnPage(page);
    if (sec.score > maxSection) {
      maxSection = sec.score;
      bestSectionLabel = sec.label;
    }
  }

  // 8f: section is boost inside content sample (not a gate before read)
  const sectionBoost = maxSection * 0.2;
  const contentScore = Math.min(1, maxContent + sectionBoost * 0.5);

  const evidence: DiEvidence[] = [];
  if (contentScore > 0.15) {
    evidence.push(
      createEvidence({
        source: "Content",
        polarity: "support",
        evidenceStrength: contentScore >= 0.5 ? "HIGH" : contentScore >= 0.25 ? "MEDIUM" : "LOW",
        summary: `Content sample score=${contentScore.toFixed(2)} (${pages.length} pages)`,
        atPass: "P2",
      }),
    );
  }
  if (bestSectionLabel) {
    evidence.push(
      createEvidence({
        source: "Section",
        polarity: "support",
        evidenceStrength: maxSection >= 0.85 ? "HIGH" : "MEDIUM",
        summary: `Section=${bestSectionLabel}`,
        detail: `sectionBoost=${sectionBoost.toFixed(2)}`,
        atPass: "P2-8f",
      }),
    );
  }

  return { contentScore, sectionBoost, sampledPages: pages.length, evidence };
}
