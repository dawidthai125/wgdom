/**
 * Shared keyword / surface hygiene (CK-01 A1 + Foundation TS-A1).
 * Pure — false-map protection.
 */

export const COST_KNOWLEDGE_BANNED_BARE_TOKENS = [
  "winidur",
  "gzyms",
  "impregnacja",
  "piec",
  "kołki",
  "kolki",
  "rura",
  "folia",
  "bruzd",
  "tynk",
  "farba",
  "kabel",
] as const;

export function foldPlToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function assertMultiWordKeywords(
  keywords: readonly string[],
  contextId: string,
): void {
  for (const kw of keywords) {
    const tokens = foldPlToken(kw).split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      throw new Error(`hygiene: keyword must be multi-word: "${kw}" (${contextId})`);
    }
  }
}

export function assertNoBannedBareInSurface(
  namePl: string,
  descriptionPl: string,
  contextId: string,
  banned: readonly string[] = COST_KNOWLEDGE_BANNED_BARE_TOKENS,
): void {
  const surface = foldPlToken(`${namePl} ${descriptionPl}`);
  const surfaceTokens = new Set(surface.split(/[^a-z0-9]+/).filter((t) => t.length >= 4));
  for (const bare of banned) {
    const bareFold = foldPlToken(bare);
    if (surfaceTokens.has(bareFold)) {
      throw new Error(`hygiene: banned bare token in name/description: "${bare}" (${contextId})`);
    }
  }
}

export function assertKeywordHygieneSpec(spec: {
  id: string;
  namePl: string;
  descriptionPl: string;
  keywords: readonly string[];
}): void {
  assertMultiWordKeywords(spec.keywords, spec.id);
  assertNoBannedBareInSurface(spec.namePl, spec.descriptionPl, spec.id);
}
