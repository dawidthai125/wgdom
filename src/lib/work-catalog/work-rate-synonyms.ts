/**
 * WORK-RATE-RESEARCH-DISCOVERY-01 — Owner-curated synonym table.
 * DISCOVERY + MATCHING only · NEVER invent PLN / Candidate / OUR RATE.
 */

export type WorkRateOwnerSynonymRow = {
  canonicalWorkFamily:
    | "repairs"
    | "grooves"
    | "sealing_protection"
    | "painting"
    | "plaster"
    | "priming";
  canonicalConcept: string;
  synonym: string;
  allowedForDiscovery: true;
  allowedForMatching: true;
};

/** Deterministic Owner table — no runtime LLM. */
export const WORK_RATE_OWNER_SYNONYMS: readonly WorkRateOwnerSynonymRow[] =
  Object.freeze([
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "wykwity",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "zaciek",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "zacieki",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "usuwanie wykwitów",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "usuwanie zacieków",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "repairs",
      canonicalConcept: "skasowanie wykwitów / zacieków",
      synonym: "skasowanie wykwitów",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "grooves",
      canonicalConcept: "zaprawianie bruzd",
      synonym: "bruzdy",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "grooves",
      canonicalConcept: "zaprawianie bruzd",
      synonym: "zaprawianie bruzd",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "grooves",
      canonicalConcept: "zaprawianie bruzd",
      synonym: "zamurowanie bruzd",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "grooves",
      canonicalConcept: "zaprawianie bruzd",
      synonym: "uzupełnienie bruzd",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      /** KB-BRUZDY-POLICY-01 — Owner-approved exact alias (match only). */
      canonicalWorkFamily: "grooves",
      canonicalConcept: "zaprawianie bruzd",
      synonym: "szpachlowanie bruzd po kablach",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "sealing_protection",
      canonicalConcept: "zabezpieczenie okien folią",
      synonym: "zabezpieczenie folią",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "sealing_protection",
      canonicalConcept: "zabezpieczenie okien folią",
      synonym: "zabezpieczenie okien folią",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "sealing_protection",
      canonicalConcept: "zabezpieczenie okien folią",
      synonym: "zabezpieczenie stolarki folią",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "sealing_protection",
      canonicalConcept: "zabezpieczenie okien folią",
      synonym: "osłona okien folią",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    // Note: bare "folia" omitted — high false-positive risk (insulation / underfloor).
    /**
     * WR-LABOR-EVIDENCE-QUALITY-01 D1 — plaster primary identity `gladzenie_scian`.
     * Exact labor-only aliases only · NOT bare fuzzy · NOT auto-eq of every tynk/szpachla row.
     * canonicalConcept ties to catalog bucket "Gładzie / tynki" for listWorkRateMatchNamesPl.
     */
    {
      canonicalWorkFamily: "plaster",
      canonicalConcept: "Gładzie / tynki",
      synonym: "Gładzenie ścian",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
    {
      canonicalWorkFamily: "plaster",
      canonicalConcept: "Gładzie / tynki",
      synonym: "Gładź gipsowa",
      allowedForDiscovery: true,
      allowedForMatching: true,
    },
  ]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Alternate match names for parser — includes namePl + matching synonyms
 * whose concept overlaps the expected name (deterministic).
 */
export function listWorkRateMatchNamesPl(expectedNamePl: string): string[] {
  const expected = String(expectedNamePl || "").trim();
  if (!expected) return [];
  const out = [expected];
  const seen = new Set([norm(expected)]);
  const en = norm(expected);
  for (const row of WORK_RATE_OWNER_SYNONYMS) {
    if (!row.allowedForMatching) continue;
    const syn = row.synonym.trim();
    const concept = norm(row.canonicalConcept);
    const sn = norm(syn);
    // Attach synonym only when expected relates to concept or synonym tokens
    const related =
      en.includes(concept) ||
      concept.includes(en) ||
      en.split(" ").some((t) => t.length > 3 && concept.includes(t)) ||
      concept.split(" ").some((t) => t.length > 3 && en.includes(t));
    if (!related) continue;
    if (seen.has(sn)) continue;
    seen.add(sn);
    out.push(syn);
  }
  return out;
}

/** Which synonym string was used for a successful match (if any). */
export function detectWorkRateSynonymUsed(input: {
  expectedNamePl: string;
  foundNamePl: string;
  matchedViaAlternate?: string | null;
}): string | null {
  if (input.matchedViaAlternate) return input.matchedViaAlternate;
  const found = norm(input.foundNamePl);
  const expected = norm(input.expectedNamePl);
  if (!found || found === expected) return null;
  for (const row of WORK_RATE_OWNER_SYNONYMS) {
    if (!row.allowedForMatching) continue;
    if (found === norm(row.synonym) || found.includes(norm(row.synonym))) {
      return row.synonym;
    }
  }
  return null;
}
