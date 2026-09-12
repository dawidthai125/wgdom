/**
 * MATERIAL_IDENTITY_NORMALIZATION_v1 (MIN-v1.1)
 *
 * Raw M-line / PDF token → canonical material candidate OR reject.
 * ZERO invent · ZERO TPI hacks · generic construction lexicon + structural rules.
 * Does NOT weaken AUT-MAT — only cleans AMPED / technology BOM inputs.
 * v1.1: OCR-concat reject · work-scope strip · canonical demand key when safe
 *        · never generic-substitute named-system materials.
 */

import { resolveMaterialCoverageExact } from "@/lib/pricing-expert/material-market-map";
import { extractNamedSystemCandidatesFromText } from "@/lib/price-intelligence/named-system-market-match";

export const MATERIAL_IDENTITY_NORMALIZATION_VERSION = "MIN-v1.1" as const;

export type MaterialIdentityRejectReason =
  | "EMPTY"
  | "TOO_SHORT"
  | "ROOM_OR_SPACE"
  | "GEOMETRY_OR_AREA_FRAGMENT"
  | "OPERATION_OR_LABOR"
  | "DOCUMENT_META"
  | "EQUIPMENT"
  | "NOT_MATERIAL_SEMANTICS"
  | "UNIT_INCOMPATIBLE_WITH_NAME"
  | "SOFT_LANGUAGE"
  | "BOQ_NOISE_CONTEXT";

export type MaterialIdentityNormalizationStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_CONTEXT";

export type NormalizedMaterialIdentityCandidate = {
  rawText: string;
  normalizedName: string;
  materialKey: string | null;
  unit: string;
  quantity: number | null;
  source: string;
  provenance: string;
  extractionLocation: string | null;
  confidence: number;
  normalizationRationale: string[];
  status: "ACCEPTED";
  invent: false;
};

export type MaterialIdentityNormalizationResult =
  | NormalizedMaterialIdentityCandidate
  | {
      status: "REJECTED" | "NEEDS_CONTEXT";
      rawText: string;
      rejectReasons: MaterialIdentityRejectReason[];
      normalizationRationale: string[];
      invent: false;
    };

/** Generic PL construction material head-nouns / categories (not product SKUs). */
const MATERIAL_HEAD_RE =
  /\b(panel|panele|panel[oó]w|p[lł]ytk|p[lł]yta|p[lł]yty|klej|zapraw|farb|grunt|foli|styropian|we[lł]n|gips|g[lł]ad[zź]|cement|piasek|ceg[lł]|silikat|bloczek|bloczki|siatk|silikon|piank|masa\s+klej|terakota|glazur|gres|laminat|parkiet|deska|deski|listwa|listwy|mdf|pcv|pvc|osb|papa|membran|izolacj|wylewk|szlicht|tynk|szpachl|impregnat|lakier|olej|kruszyw|armatur|rur[ay]|kszta[lł]tk|kabel|przew[oó]d|puszk|opraw)\w*/i;

/**
 * Structural / covering materials take priority over binders when a work
 * description lists both (e.g. "cegły SILIKAT … — zaprawa klejowa").
 * Prevents TechnologyPack BOM from binding AUT-MAT brick evidence to glue.
 * Note: bare "izolacj*" alone is weak — scored lower than explicit panel/brick nouns.
 */
const STRUCTURAL_MATERIAL_RE =
  /\b(ceg[lł]|silikat|bloczek|bloczki|panel|panele|p[lł]ytk|p[lł]yt[ay]|osb|styropian|we[lł]n|gres|glazur|terakota|laminat|parkiet|deska|deski|foli|papa|membran|wylewk|szlicht|tynk|g[lł]ad[zź])\w*/i;

/** Weak structural category — only when no stronger noun available. */
const WEAK_STRUCTURAL_RE = /\b(izolacj)\w*/i;

const BINDER_OR_AUX_MATERIAL_RE =
  /\b(zapraw|klej|grunt|farb|szpachl|impregnat|lakier|masa\s+klej|silikon|piank)\w*/i;

/** Cut z-phrase / material clause before operational verbs. */
const MATERIAL_CLAUSE_STOP_RE =
  /\s+(?:wykonan\w*|montowan\w*|uk[lł]adan\w*|na\s+zapraw\w*|do\s+wyrob\w*|zamurowan\w*)\b/i;

/** Work-scope / layer adjectives hanging off material heads (not product identity). */
const WORK_SCOPE_SUFFIX_RE =
  /\s+(?:na\s+(?:ścian\w*|scian\w*|sufit\w*|pod[lł]og\w*|posadzk\w*)|jednowarstwowa\w*|dwuwarstwowa\w*|trójwarstwowa\w*|wewn[eę]trzn\w*|zewn[eę]trzn\w*)\b.*$/i;

export function isPrimaryStructuralMaterialName(namePl: string): boolean {
  const n = String(namePl || "").trim();
  if (!n || !isLikelyConstructionMaterialName(n)) return false;
  if (STRUCTURAL_MATERIAL_RE.test(n)) return true;
  // Bare izolacja alone is weak structural — still structural for binder preference,
  // but loses to panel/brick via score.
  return WEAK_STRUCTURAL_RE.test(n);
}

export function isSecondaryBinderMaterialName(namePl: string): boolean {
  const n = String(namePl || "").trim();
  if (!n) return false;
  return (
    BINDER_OR_AUX_MATERIAL_RE.test(n)
    && !STRUCTURAL_MATERIAL_RE.test(n)
    && !WEAK_STRUCTURAL_RE.test(n)
  );
}

export function scoreMaterialNounPriority(namePl: string): number {
  return materialNounPriorityScore(namePl);
}

function materialNounPriorityScore(namePl: string): number {
  const n = String(namePl || "").trim();
  if (STRUCTURAL_MATERIAL_RE.test(n) && isLikelyConstructionMaterialName(n)) return 100;
  if (WEAK_STRUCTURAL_RE.test(n) && isLikelyConstructionMaterialName(n)) return 40;
  if (isLikelyConstructionMaterialName(n) && !isSecondaryBinderMaterialName(n)) {
    return 50;
  }
  if (isSecondaryBinderMaterialName(n)) return 10;
  return 0;
}

/**
 * OCR / extract garbage: "IzolacjeIzolacj", doubled stems, camelConcat without spaces.
 */
export function isOcrConcatMaterialGarbage(namePl: string): boolean {
  const n = String(namePl || "").trim();
  if (!n) return true;
  if (/\s/.test(n) === false && /[a-ząćęłńóśźż]{5,}[A-ZĄĆĘŁŃÓŚŹŻ]/.test(n)) {
    return true;
  }
  const folded = foldPl(n).replace(/[^a-z0-9]/g, "");
  // doubled stem e.g. izolacjeizolacj
  if (folded.length >= 10) {
    for (let len = 4; len <= Math.floor(folded.length / 2); len += 1) {
      const a = folded.slice(0, len);
      const b = folded.slice(len, len * 2);
      if (a === b || b.startsWith(a.slice(0, Math.max(4, len - 2)))) {
        return true;
      }
    }
  }
  return false;
}

function stripWorkScopeSuffix(name: string): string {
  let n = String(name || "").trim();
  n = n.replace(WORK_SCOPE_SUFFIX_RE, "").trim();
  // "Gładź gipsowa na sufitach jednowarstwowa" when regex missed
  n = n.replace(/\s+na\s+(ścian\w*|scian\w*|sufit\w*).*$/i, "").trim();
  n = n.replace(/\s+(jedno|dwu|trój)warstwow\w*$/i, "").trim();
  return n;
}

function hasNamedSystemSignal(...texts: Array<string | null | undefined>): boolean {
  for (const t of texts) {
    if (!t) continue;
    if (extractNamedSystemCandidatesFromText(String(t)).length > 0) return true;
  }
  return false;
}

const ROOM_SPACE_RE =
  /\b(kuchni\w*|[lł]azien\w*|salon\w*|pok[oó]j\w*|korytarz\w*|piwnic\w*|strych\w*|gara[zż]\w*|pomieszczen\w*|lokal\w*|mieszkani\w*|budynk\w*)\b/i;

const GEOMETRY_RE =
  /\b(powierzchni\w*|powierzchnia|obw[oó]d\w*|d[lł]ugo[sś][cć]|szeroko[sś][cć]|wysoko[sś][cć]|obj[eę]to[sś][cć]|wymiar\w*|ponad)\b/i;

const OPERATION_LABOR_RE =
  /\b(odbici\w*|odbicie|demonta[zż]\w*|monta[zż]\w*|rozebran\w*|wykucie|wyku[cć]|uk[lł]adan\w*|przygotowan\w*|czyszczen\w*|mycie|malowan\w*|szlifowan\w*|ci[eę]ci\w*|wiercen\w*|robot\w*|robocizn\w*|wykonanie|przer[oó]b\w*)\b/i;

const DOCUMENT_META_RE =
  /\b(opis|pozycj\w*|razem|suma|wariant|typ|uwaga|tabela|strona|lp\.?|przedmiar|kosztorys|analogia|kod)\b/i;

const EQUIPMENT_RE =
  /\b(sprz[eę]t\w*|kopark\w*|d[zź]wig\w*|rusztowan\w*|agregat\w*)\b/i;

const SOFT_RE = /\b(typowe|zwykle|ok\.|oko[lł]o|approx|~|szacunk)\b/i;

function foldPl(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
}

function slugMaterialKey(name: string): string {
  return `mat.min.${foldPl(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 56)}`;
}

/**
 * Generic semantic gate — construction / market material vs noise.
 * Not a hard-coded reject list of three TPI tokens.
 */
export function isLikelyConstructionMaterialName(namePl: string): boolean {
  const n = String(namePl || "").trim();
  if (n.length < 3) return false;
  const folded = foldPl(n);
  if (ROOM_SPACE_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) return false;
  if (GEOMETRY_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) return false;
  if (OPERATION_LABOR_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) return false;
  if (DOCUMENT_META_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) return false;
  if (EQUIPMENT_RE.test(n)) return false;
  if (SOFT_RE.test(n)) return false;
  // Accept when material head noun present
  if (MATERIAL_HEAD_RE.test(n)) return true;
  // Multi-token product-like phrase without room/op noise
  const tokens = folded.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (tokens.length >= 2 && !ROOM_SPACE_RE.test(n) && !OPERATION_LABOR_RE.test(n)) {
    // Still require at least one material-ish stem or known building product pattern
    return MATERIAL_HEAD_RE.test(n);
  }
  return false;
}

export function classifyMaterialIdentityNoise(
  namePl: string,
): MaterialIdentityRejectReason[] {
  const n = String(namePl || "").trim();
  const reasons: MaterialIdentityRejectReason[] = [];
  if (!n) reasons.push("EMPTY");
  else if (n.length < 3) reasons.push("TOO_SHORT");
  if (n && isOcrConcatMaterialGarbage(n)) {
    reasons.push("NOT_MATERIAL_SEMANTICS");
  }
  if (ROOM_SPACE_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) reasons.push("ROOM_OR_SPACE");
  if (GEOMETRY_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) {
    reasons.push("GEOMETRY_OR_AREA_FRAGMENT");
  }
  if (OPERATION_LABOR_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) {
    reasons.push("OPERATION_OR_LABOR");
  }
  if (DOCUMENT_META_RE.test(n) && !MATERIAL_HEAD_RE.test(n)) {
    reasons.push("DOCUMENT_META");
  }
  if (EQUIPMENT_RE.test(n)) reasons.push("EQUIPMENT");
  if (SOFT_RE.test(n)) reasons.push("SOFT_LANGUAGE");
  if (reasons.length === 0 && !MATERIAL_HEAD_RE.test(n)) {
    reasons.push("NOT_MATERIAL_SEMANTICS");
  }
  return reasons;
}

function polishMaterialPhraseNominative(name: string): string {
  return String(name || "")
    .replace(/\bpaneli\b/gi, "panele")
    .replace(/\bpodłogowych\b/gi, "podłogowe")
    .replace(/\bpodlogowych\b/gi, "podlogowe")
    .replace(/\bpłytek\b/gi, "płytki")
    .replace(/\bplytek\b/gi, "plytki")
    .replace(/\bcegieł\b/gi, "cegły")
    .replace(/\bcegiel\b/gi, "cegly")
    .replace(/\bklejowej\b/gi, "klejowa")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract explicit material noun from technology / work description.
 * E.g. "Posadzki z paneli podłogowych" → "panele podłogowe".
 * When description lists structural + binder (cegły SILIKAT — zaprawa),
 * prefer structural — TechnologyPack must not bind brick AUT-MAT to glue.
 * Context supports candidate — does not invent SKUs or piece consumption.
 */
export function extractMaterialNounFromWorkDescription(description: string): {
  namePl: string;
  rationale: string[];
} | null {
  const desc = String(description || "").trim();
  if (!desc) return null;
  const rationale: string[] = [];
  const candidates: Array<{ namePl: string; score: number; why: string }> = [];

  const pushCandidate = (raw: string, why: string) => {
    let name = String(raw || "").trim().replace(/\s+/g, " ");
    name = name.replace(MATERIAL_CLAUSE_STOP_RE, "").trim();
    name = name.replace(/\s+(m2|m²|mb|szt|kg|l)\b.*$/i, "").trim();
    name = stripWorkScopeSuffix(name);
    name = polishMaterialPhraseNominative(name);
    if (!name || name.length < 3 || name.length >= 80) return;
    if (!isLikelyConstructionMaterialName(name)) return;
    candidates.push({ namePl: name, score: materialNounPriorityScore(name), why });
  };

  // Prefer "… z/ze <material phrase>" BEFORE whole-description head match
  // (avoids accepting "Posadzki z paneli…" as material identity).
  const zMatch = desc.match(
    /\b(?:z|ze)\s+([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9\s\-]{2,60}?)(?:\s*$|,|;|\.|—|\/|(?=\s+wykonan)|(?=\s+na\s+zapraw)|(?=\s+do\s+wyrob)|(?=\s*-\s*zamurowan))/i,
  );
  if (zMatch?.[1]) {
    pushCandidate(zMatch[1], "work_description_z_phrase");
  }

  // Spec clauses after em-dash / slash — collect ALL, then pick by priority
  // (do NOT reverse-prefer trailing "zaprawa klejowa" over "cegły / SILIKAT").
  const dashParts = desc.split(/\s*[—–]\s*|\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  for (const part of dashParts) {
    if (part === desc && /\b(?:z|ze)\s+/i.test(desc)) continue;
    const looksWorkTitle =
      /^(posadzk|robot|monta[zż]|uk[lł]adan|wykonan|demonta[zż]|tynkow|malowan|ścianki|scianki)/i.test(
        part,
      );
    if (looksWorkTitle) continue;
    if (MATERIAL_HEAD_RE.test(part) && part.length < 80) {
      pushCandidate(part, "work_description_spec_clause");
    }
  }

  // Leading material head in description (non-capturing wrap — avoid group concat bugs)
  const headRe = new RegExp(
    `^${MATERIAL_HEAD_RE.source}(?:[\\s\\-]+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9]+){0,5}`,
    "i",
  );
  const head = desc.match(headRe);
  if (head?.[0]) {
    let name = head[0].trim().replace(/\s+/g, " ").slice(0, 80);
    name = name.replace(/(\b\w{3,}\b)\1+/gi, "$1");
    pushCandidate(name, "work_description_material_head");
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.namePl.length - b.namePl.length);
  const best = candidates[0]!;
  rationale.push(best.why);
  if (isPrimaryStructuralMaterialName(best.namePl)) {
    rationale.push("prefer_structural_over_binder");
  }
  if (
    candidates.some((c) => isSecondaryBinderMaterialName(c.namePl))
    && isPrimaryStructuralMaterialName(best.namePl)
  ) {
    rationale.push("rejected_trailing_binder_clause");
  }
  return { namePl: best.namePl, rationale };
}

export type NormalizeMaterialIdentityInput = {
  rawText: string;
  unit?: string | null;
  quantity?: number | null;
  source?: string | null;
  provenance?: string | null;
  extractionLocation?: string | null;
  /** Surrounding line / cell text for BOQ noise detection. */
  contextText?: string | null;
  /** Technology / work description — may recover material noun. */
  workDescription?: string | null;
  existingMaterialKey?: string | null;
};

/**
 * Normalize one raw extract into a canonical material candidate or reject.
 */
export function normalizeMaterialIdentity(
  input: NormalizeMaterialIdentityInput,
): MaterialIdentityNormalizationResult {
  const rawText = String(input.rawText || "").trim();
  const rationale: string[] = [];
  const context = String(input.contextText || "");
  const unit = String(input.unit || "").trim().toLowerCase().replace("²", "2");

  if (!rawText) {
    return {
      status: "REJECTED",
      rawText,
      rejectReasons: ["EMPTY"],
      normalizationRationale: ["empty_raw"],
      invent: false,
    };
  }

  // BOQ noise: "o powierzchni ponad 5 m2", room deductions next to qty
  if (
    /\bo\s+powierzchni\b/i.test(context)
    || /\bponad\s+\d/i.test(context)
    || /\b(kuchni|łazien|lazien).{0,40}\d+[.,]\d+\s*\*\s*\d/i.test(context)
  ) {
    rationale.push("boq_geometry_or_room_deduction_context");
    return {
      status: "REJECTED",
      rawText,
      rejectReasons: ["BOQ_NOISE_CONTEXT"],
      normalizationRationale: rationale,
      invent: false,
    };
  }

  let name = rawText.replace(/\s+/g, " ").trim();
  // Strip leading M-codes
  name = name.replace(/^M[\d.]*\s+/i, "").trim();

  let rejectReasons = classifyMaterialIdentityNoise(name);

  const hardNoiseReject = (reasons: string[]) =>
    reasons.some((r) =>
      r === "ROOM_OR_SPACE"
      || r === "OPERATION_OR_LABOR"
      || r === "GEOMETRY_OR_AREA_FRAGMENT"
      || r === "BOQ_NOISE_CONTEXT"
      || r === "DOCUMENT_META"
    );

  // OCR garbage / weak extract → prefer explicit material noun from work description.
  // Never invent a material from work desc when the extract is clear room/operation/geometry noise.
  if (
    (isOcrConcatMaterialGarbage(name)
      || (rejectReasons.length > 0 && !hardNoiseReject(rejectReasons)))
    && input.workDescription
  ) {
    const recovered = extractMaterialNounFromWorkDescription(input.workDescription);
    if (
      recovered
      && scoreMaterialNounPriority(recovered.namePl) > scoreMaterialNounPriority(name)
    ) {
      rationale.push(...recovered.rationale, "prefer_work_description_over_weak_extract");
      name = recovered.namePl;
      rejectReasons = classifyMaterialIdentityNoise(name);
    }
  }

  // Work-title lines ("murowanie z cegły", "Posadzki z paneli…") → extract material noun.
  // Skip when raw already has a clean material head (avoid re-extract doubling).
  const looksWorkTitle =
    /^(posadzk|robot|monta[zż]|uk[lł]adan|wykonan|demonta[zż]|tynkow|malowan|murowan|ok[lł]adzin)/i.test(
      name,
    )
    || (/\b(?:z|ze)\s+/i.test(name) && name.split(/\s+/).length >= 3);
  const alreadyCleanMaterial =
    rejectReasons.length === 0 && MATERIAL_HEAD_RE.test(name) && !isOcrConcatMaterialGarbage(name);
  if (looksWorkTitle && !alreadyCleanMaterial && input.workDescription) {
    const recovered = extractMaterialNounFromWorkDescription(input.workDescription);
    if (recovered) {
      rationale.push(...recovered.rationale, "work_title_to_material_noun");
      name = recovered.namePl;
      rejectReasons = classifyMaterialIdentityNoise(name);
    }
  } else if (looksWorkTitle && !alreadyCleanMaterial) {
    const recovered = extractMaterialNounFromWorkDescription(name);
    if (recovered) {
      rationale.push(...recovered.rationale, "work_title_to_material_noun");
      name = recovered.namePl;
      rejectReasons = classifyMaterialIdentityNoise(name);
    }
  }

  // Context recovery: only for weak/empty semantics — not clear room/operation/geometry noise
  // (batch layer recovers from work description once when all lines rejected).
  if (rejectReasons.length > 0 && !hardNoiseReject(rejectReasons) && input.workDescription) {
    const recovered = extractMaterialNounFromWorkDescription(input.workDescription);
    if (recovered) {
      rationale.push(...recovered.rationale, "context_recovery_from_work_description");
      name = recovered.namePl;
      rejectReasons = classifyMaterialIdentityNoise(name);
    }
  }

  if (rejectReasons.length > 0) {
    return {
      status: MATERIAL_HEAD_RE.test(name) ? "NEEDS_CONTEXT" : "REJECTED",
      rawText,
      rejectReasons,
      normalizationRationale: rationale.length ? rationale : ["semantic_reject"],
      invent: false,
    };
  }

  // Unit sanity: room-like units alone don't validate; materials in m2 OK for coverings
  if (unit === "m2" || unit === "m3") {
    rationale.push("unit_area_or_volume_ok_for_covering");
  }
  // Unit sanity: covering products (panels/tiles/boards) rarely sold as kg/l as the primary identity
  const headIsCovering = /^(panel|panele|panel[oó]w|p[lł]ytk|p[lł]yta|p[lł]yty|deska|deski|listwa|listwy)\b/i.test(
    name,
  );
  if ((unit === "kg" || unit === "l") && headIsCovering) {
    return {
      status: "REJECTED",
      rawText,
      rejectReasons: ["UNIT_INCOMPATIBLE_WITH_NAME"],
      normalizationRationale: ["unit_material_mismatch"],
      invent: false,
    };
  }

  rationale.push("material_head_noun_accepted");
  const qty =
    typeof input.quantity === "number" && Number.isFinite(input.quantity)
      ? input.quantity
      : null;

  let polished = polishMaterialPhraseNominative(name);
  const beforeScope = polished;
  polished = stripWorkScopeSuffix(polished);
  if (polished !== beforeScope) {
    rationale.push("stripped_work_scope_suffix");
  }
  // Drop proprietary -owych adjectives for generic alias lookup (named-system kept as signal)
  const namedInScope = hasNamedSystemSignal(
    polished,
    input.workDescription,
    rawText,
  );
  let aliasName = polished;
  if (namedInScope) {
    const stems = extractNamedSystemCandidatesFromText(
      `${polished} ${input.workDescription || ""} ${rawText}`,
    );
    for (const stem of stems) {
      const re = new RegExp(`\\b${stem}\\w*\\b`, "ig");
      aliasName = aliasName.replace(re, " ").replace(/\s+/g, " ").trim();
    }
    if (aliasName && aliasName !== polished) {
      rationale.push("named_system_stripped_for_generic_alias_attempt");
    }
  }
  aliasName = polishMaterialPhraseNominative(aliasName || polished);

  // Canonical demand key — only when map/alias hits AND named-system is not forcing AMSM-only.
  // Named system present → keep descriptive mat.min key (no generic panel_laminowany substitution).
  const existingKey = String(input.existingMaterialKey || "").trim();
  let materialKey = existingKey || slugMaterialKey(polished);
  if (!namedInScope) {
    const coverage =
      resolveMaterialCoverageExact({
        materialKey: existingKey.startsWith("mat.min.") ? null : existingKey || null,
        namePl: aliasName,
        unit: unit || null,
      })
      || resolveMaterialCoverageExact({
        materialKey: existingKey.startsWith("mat.min.") ? null : existingKey || null,
        namePl: aliasName,
        unit: "kg",
      })
      || resolveMaterialCoverageExact({
        materialKey: existingKey.startsWith("mat.min.") ? null : existingKey || null,
        namePl: aliasName,
        unit: "m2",
      });
    if (coverage?.materialKey) {
      materialKey = coverage.materialKey;
      rationale.push(`canonical_demand_key:${coverage.materialKey}`);
    } else if (!existingKey || existingKey.startsWith("mat.min.")) {
      materialKey = slugMaterialKey(aliasName || polished);
    }
  } else {
    rationale.push("named_system_present · skip_generic_demand_substitution");
    if (!existingKey || existingKey.startsWith("mat.min.") || isOcrConcatMaterialGarbage(existingKey)) {
      materialKey = slugMaterialKey(aliasName || polished);
    }
  }

  return {
    status: "ACCEPTED",
    rawText,
    normalizedName: aliasName || polished,
    materialKey,
    unit,
    quantity: qty,
    source: String(input.source || "unknown"),
    provenance: String(input.provenance || input.source || "min-v1.1"),
    extractionLocation: input.extractionLocation ?? null,
    confidence: rationale.includes("context_recovery_from_work_description")
      || rationale.includes("prefer_work_description_over_weak_extract")
      ? 0.78
      : 0.9,
    normalizationRationale: [
      ...rationale,
      ...(polished !== name ? ["nominative_polish"] : []),
    ],
    invent: false,
  };
}

export type NormalizeMaterialBatchLine = {
  materialKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
  sourceRef: string;
  evidenceRefs?: readonly string[];
  contextText?: string | null;
};

export type NormalizeMaterialBatchResult = {
  version: typeof MATERIAL_IDENTITY_NORMALIZATION_VERSION;
  accepted: NormalizedMaterialIdentityCandidate[];
  rejected: Array<{
    rawText: string;
    materialKey: string;
    rejectReasons: MaterialIdentityRejectReason[];
    rationale: string[];
  }>;
  invent: false;
};

/**
 * Batch-normalize BOM / ATHED hard material hits for AMPED / ATA.
 */
export function normalizeMaterialIdentityBatch(input: {
  lines: readonly NormalizeMaterialBatchLine[];
  workDescription?: string | null;
}): NormalizeMaterialBatchResult {
  const accepted: NormalizedMaterialIdentityCandidate[] = [];
  const rejected: NormalizeMaterialBatchResult["rejected"] = [];

  for (const line of input.lines) {
    const r = normalizeMaterialIdentity({
      rawText: line.namePl || line.materialKey,
      unit: line.unit,
      quantity: line.qtyFactor,
      source: line.sourceRef,
      provenance: line.sourceRef,
      extractionLocation: line.sourceRef,
      contextText: line.contextText ?? line.namePl,
      workDescription: input.workDescription,
      existingMaterialKey: isOcrConcatMaterialGarbage(line.materialKey)
        || String(line.materialKey || "").startsWith("mat.min.")
        ? null
        : line.materialKey,
    });
    if (r.status === "ACCEPTED") {
      accepted.push(r);
    } else {
      rejected.push({
        rawText: r.rawText,
        materialKey: line.materialKey,
        rejectReasons: r.rejectReasons,
        rationale: r.normalizationRationale,
      });
    }
  }

  // Prefer stronger work-description noun over weak accepted extracts (izolacj vs panele)
  if (accepted.length > 0 && input.workDescription) {
    const noun = extractMaterialNounFromWorkDescription(input.workDescription);
    if (noun) {
      const bestAcceptedScore = Math.max(
        ...accepted.map((a) => scoreMaterialNounPriority(a.normalizedName)),
      );
      if (scoreMaterialNounPriority(noun.namePl) > bestAcceptedScore) {
        const n = normalizeMaterialIdentity({
          rawText: noun.namePl,
          unit: input.lines[0]?.unit || "m2",
          quantity: 1,
          source: input.lines[0]?.sourceRef || "work_description",
          provenance: "work_description_prefer_over_weak_extract",
          extractionLocation: "work_description",
          workDescription: input.workDescription,
        });
        if (n.status === "ACCEPTED") {
          return {
            version: MATERIAL_IDENTITY_NORMALIZATION_VERSION,
            accepted: [
              {
                ...n,
                quantity: 1,
                normalizationRationale: [
                  ...n.normalizationRationale,
                  "batch_prefer_work_description_structural",
                ],
              },
            ],
            rejected: [
              ...rejected,
              ...accepted.map((a) => ({
                rawText: a.rawText,
                materialKey: a.materialKey || "",
                rejectReasons: ["NOT_MATERIAL_SEMANTICS"] as MaterialIdentityRejectReason[],
                rationale: ["replaced_by_stronger_work_description_noun"],
              })),
            ],
            invent: false,
          };
        }
      }
    }
  }

  // If all raw lines rejected, try pure work-description recovery once
  if (
    accepted.length === 0
    && input.workDescription
    && isLikelyConstructionMaterialName(
      extractMaterialNounFromWorkDescription(input.workDescription)?.namePl || "",
    )
  ) {
    const recovered = extractMaterialNounFromWorkDescription(input.workDescription)!;
    const unit = input.lines[0]?.unit || "m2";
    const source = input.lines[0]?.sourceRef || "work_description";
    const n = normalizeMaterialIdentity({
      rawText: recovered.namePl,
      unit,
      quantity: 1,
      source,
      provenance: `work_description_explicit_material|${source}`,
      extractionLocation: "work_description",
      workDescription: input.workDescription,
    });
    if (n.status === "ACCEPTED") {
      accepted.push({
        ...n,
        quantity: 1,
        normalizationRationale: [
          ...n.normalizationRationale,
          "boq_work_unit_equals_material_qty_factor_1",
        ],
        confidence: Math.min(n.confidence, 0.82),
      });
    }
  }

  return {
    version: MATERIAL_IDENTITY_NORMALIZATION_VERSION,
    accepted,
    rejected,
    invent: false,
  };
}
