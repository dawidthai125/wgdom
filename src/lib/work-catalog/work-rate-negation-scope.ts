/**
 * WORK-RATE-RESEARCH-NEGATION-SCOPE-01
 *
 * Minimal POSITIVE/NEGATIVE scope for Research family + synonym eligibility.
 * Deterministic · no LLM · no new Research engine · not Catalog KV.
 *
 * SSOT consumers (MVP):
 *   - resolveWorkRateWorkFamily (mask negated spans before classify)
 *   - listWorkRateMatchNamesPl (drop synonyms asserting NEGATIVE_SCOPE)
 */

export type ResearchTextScope = {
  sourceText: string;
  softText: string;
  positiveActions: string[];
  negativeActions: string[];
  negativeObjects: string[];
  /** Inclusive soft-text spans covered by `bez …` (action [+ object]). */
  negatedSpans: ReadonlyArray<{ start: number; end: number; text: string }>;
};

/** Soft-normalize — same contract as softWorkRateFamilyText (keep in sync). */
export function softNegationScopeText(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prepositions / conjunctions that end a `bez …` span. */
const BEZ_SPAN_STOP = new Set([
  "na",
  "w",
  "do",
  "z",
  "ze",
  "po",
  "dla",
  "oraz",
  "i",
  "a",
  "o",
  "u",
  "od",
  "przy",
  "przez",
  "nad",
  "pod",
  "nie",
  "lub",
  "albo",
]);

/**
 * Concept-family roots: negating one expands NEGATIVE_SCOPE to the whole family
 * (reuse Owner grooves vocabulary — zaprawianie ↔ szpachlowanie ↔ zamurowanie …).
 */
const NEGATION_CONCEPT_ROOT_GROUPS: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(["zapraw", "szpachlow", "zamurow", "uzupeln", "napraw"]),
  Object.freeze(["malow", "paint", "farba"]),
  Object.freeze(["demontaz", "wykuc", "kucie", "rozebran"]),
  Object.freeze(["podlaczen"]),
]);

function lemmaRoot(token: string): string {
  const t = softNegationScopeText(token).replace(/[^a-z0-9]/g, "");
  if (!t) return "";
  // Strip common PL inflection tails for root overlap (deterministic, not a stemmer).
  return t
    .replace(/(iania|ienie|enia|aniu|eniu|ania|enie)$/g, "")
    .replace(/(ania|enie|aniu|eniu)$/g, "")
    .replace(/(ow|ach|ami|om|em|ie|u|y|i|a|e)$/g, "");
}

function rootsOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a);
}

function expandNegativeActionRoots(rawTokens: string[]): string[] {
  const seeds = new Set<string>();
  for (const tok of rawTokens) {
    const soft = softNegationScopeText(tok);
    const root = lemmaRoot(tok);
    if (soft) seeds.add(soft.replace(/[^a-z0-9]+/g, ""));
    if (root) seeds.add(root);
  }
  const out = new Set<string>(seeds);
  for (const group of NEGATION_CONCEPT_ROOT_GROUPS) {
    const hit = [...seeds].some((s) =>
      group.some((g) => rootsOverlap(s, g)),
    );
    if (!hit) continue;
    for (const g of group) out.add(g);
  }
  return [...out].filter(Boolean);
}

/**
 * Extract NEGATIVE_SCOPE from Polish `bez` + action (+ optional object) constructions.
 * MVP only — no double-negatives / "nie wymaga".
 */
export function extractResearchNegativeScope(text: string): ResearchTextScope {
  const sourceText = String(text || "");
  const softText = softNegationScopeText(sourceText);
  const negatedSpans: Array<{ start: number; end: number; text: string }> = [];
  const rawActionTokens: string[] = [];
  const negativeObjects: string[] = [];

  const bezRe = /\bbez\b/g;
  let m: RegExpExecArray | null;
  while ((m = bezRe.exec(softText)) !== null) {
    let i = m.index + m[0].length;
    while (softText[i] === " ") i += 1;
    const words: string[] = [];
    let cursor = i;
    while (words.length < 3 && cursor < softText.length) {
      const wm = /^[a-z0-9]+/.exec(softText.slice(cursor));
      if (!wm) break;
      const w = wm[0];
      if (BEZ_SPAN_STOP.has(w)) break;
      words.push(w);
      cursor += w.length;
      while (softText[cursor] === " ") cursor += 1;
    }
    if (words.length === 0) continue;

    let end = i;
    for (const w of words) {
      const at = softText.indexOf(w, end);
      if (at < 0) break;
      end = at + w.length;
    }
    const start = m.index;
    negatedSpans.push({
      start,
      end,
      text: softText.slice(start, end),
    });
    rawActionTokens.push(words[0]!);
    for (const obj of words.slice(1)) negativeObjects.push(obj);
  }

  const negativeActions = expandNegativeActionRoots(rawActionTokens);

  return {
    sourceText,
    softText,
    positiveActions: [],
    negativeActions,
    negativeObjects: [...new Set(negativeObjects)],
    negatedSpans,
  };
}

/** Replace negated `bez …` spans with spaces (length-preserving) for family classify. */
export function maskNegatedResearchSpans(softBlob: string): string {
  const soft = softNegationScopeText(softBlob);
  const scope = extractResearchNegativeScope(soft);
  if (scope.negatedSpans.length === 0) return soft;
  let out = soft;
  for (const span of [...scope.negatedSpans].sort((a, b) => b.start - a.start)) {
    const width = Math.max(0, span.end - span.start);
    out =
      out.slice(0, span.start) + " ".repeat(width) + out.slice(span.end);
  }
  return out.replace(/\s+/g, " ").trim();
}

export function isActionNegated(
  actionLemma: string,
  scope: ResearchTextScope,
): boolean {
  const root = lemmaRoot(actionLemma);
  const soft = softNegationScopeText(actionLemma).replace(/[^a-z0-9]+/g, "");
  return scope.negativeActions.some(
    (n) => rootsOverlap(n, root) || rootsOverlap(n, soft),
  );
}

/**
 * Fail-closed: synonym (or its canonicalConcept) asserts an action in NEGATIVE_SCOPE.
 */
export function isSynonymIneligibleForNegativeScope(input: {
  synonym: string;
  canonicalConcept: string;
  canonicalWorkFamily?: string;
  scope: ResearchTextScope;
}): boolean {
  const { scope } = input;
  if (!scope.negativeActions.length) return false;

  const hay = softNegationScopeText(
    `${input.synonym} ${input.canonicalConcept}`,
  );
  const hayRoots = hay
    .split(/\s+/)
    .map((t) => lemmaRoot(t))
    .filter(Boolean);

  for (const neg of scope.negativeActions) {
    if (hay.includes(neg)) return true;
    if (hayRoots.some((r) => rootsOverlap(r, neg))) return true;
  }

  // Grooves fill table: if fill-family negated, entire Owner grooves/zaprawianie set is INELIGIBLE.
  const groovesFillNegated = scope.negativeActions.some((n) =>
    ["zapraw", "szpachlow", "zamurow", "uzupeln", "napraw"].some((g) =>
      rootsOverlap(n, g),
    ),
  );
  if (
    groovesFillNegated &&
    (input.canonicalWorkFamily === "grooves" ||
      softNegationScopeText(input.canonicalConcept).includes("zapraw"))
  ) {
    return true;
  }

  return false;
}
