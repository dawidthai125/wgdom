/**
 * P5.25-FIX — research key dedupe (domain + unit + semantic key).
 * Same key → RETAIN existing candidate · no re-research.
 * Pure session helper · ZERO HTTP by itself.
 */

import { mapInternalFirstUnit, softInternalFirstText } from "./internal-first-text";
import { normalizeInternalFirstDomain } from "./internal-first-domain";

export function buildInternalFirstResearchKey(args: {
  description: string;
  unit: string;
  domain: string;
}): string {
  const domain = normalizeInternalFirstDomain(args.domain);
  const unit = mapInternalFirstUnit(args.unit);
  const desc = softInternalFirstText(args.description).slice(0, 120);
  return `${domain}|${unit}|${desc}`;
}

export type RetainedResearchCandidate = {
  researchKey: string;
  groupNo?: string;
  base: number;
  source?: string;
  retainedAt: string;
};

/**
 * In-run dedupe: first result wins; later same key → RETAIN (no new HTTP).
 */
export class InternalFirstResearchKeyDedupe {
  private readonly seen = new Map<string, RetainedResearchCandidate>();

  has(key: string): boolean {
    return this.seen.has(key);
  }

  get(key: string): RetainedResearchCandidate | undefined {
    return this.seen.get(key);
  }

  remember(candidate: RetainedResearchCandidate): void {
    if (!this.seen.has(candidate.researchKey)) {
      this.seen.set(candidate.researchKey, candidate);
    }
  }

  size(): number {
    return this.seen.size;
  }
}
