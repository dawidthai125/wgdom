/**
 * WR-LABOR-EVIDENCE-QUALITY-01 D1 — evidence scopeTag (semantic).
 * Applied AFTER identity match · BEFORE qualify / median aggregation.
 * ZERO price hard-cap · ZERO namesLooselyMatch threshold change.
 */

export type WorkRateEvidenceScopeTag =
  | "walls_ceilings"
  | "joinery"
  | "artistic"
  | "unscoped";

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Classify a source row name into an evidence scope dimension.
 * Order: artistic → joinery → walls_ceilings → unscoped.
 * Never uses rate/price.
 */
export function classifyWorkRateEvidenceScopeTag(
  workNamePl: string,
): WorkRateEvidenceScopeTag {
  const n = norm(workNamePl);
  if (!n) return "unscoped";

  if (
    /artystyczn|dekoracyjn|fantazyjn|specjalistyczn|ornament|stiuk/.test(n)
  ) {
    return "artistic";
  }

  if (
    /\bdrzwi\b|\bokn|\bbalustrad|\bporecz|\bporęcz|\brur\b|\brury\b|\bkaloryfer|\bgrzejnik|\bparapet/.test(
      n,
    ) ||
    /\bmalowanie\s+(drzwi|okien|okna|balustrad|poreczy|poręczy|rur)\b/.test(n)
  ) {
    return "joinery";
  }

  // walls / ceilings (incl. 1×/2× · biała/kolor when surface named)
  if (/\bscian|\bsufit/.test(n)) {
    return "walls_ceilings";
  }

  return "unscoped";
}

/**
 * Owner-approved primary pool for a catalog work.
 * `null` = no scope filter (identity-only path, e.g. grooves / plaster synonyms).
 */
export function listAllowedWorkRateEvidenceScopeTags(input: {
  workId: string;
  namePl: string;
}): readonly WorkRateEvidenceScopeTag[] | null {
  const id = String(input.workId || "").trim();
  const n = norm(input.namePl);
  // D-PAINT-SCOPE: legacy-malowanie-m2 / generic "Malowanie (m2)" → walls_ceilings only
  if (
    id === "legacy-malowanie-m2" ||
    n === "malowanie" ||
    n === "malowanie m2"
  ) {
    return Object.freeze(["walls_ceilings"] as const);
  }
  return null;
}

export function isWorkRateEvidenceScopeAllowed(
  tag: WorkRateEvidenceScopeTag,
  allowed: readonly WorkRateEvidenceScopeTag[] | null,
): boolean {
  if (allowed == null) return true;
  return allowed.includes(tag);
}
