/**
 * AUTONOMOUS MATERIAL SPECIFICATION RECOVERY (AMSR-v1)
 *
 * BOM identity ≠ market price ≠ product SKU.
 * Recover explicit specification attributes from legal sources only — ZERO invent.
 *
 * Ladder:
 * 1. OfferBoq / tender line description
 * 2. Work / technology description (MIN context)
 * 3. ATHED extracted text (windows)
 * 4. TechnologyPack material / notes
 * 5. Existing Knowledge (semantic tokens / prior VALIDATED only)
 * 6. Public BOQ / construction extract (same as ATHED corpus)
 *
 * Feeds AMED/AMPED · does NOT weaken AUT-MAT · LICENSE ≠ Owner.
 */

import { normalizeResearchUnit } from "./market-material-research-provider";
import {
  upsertMaterialEvidenceKnowledge,
} from "./material-evidence-knowledge";
import { extractNamedSystemCandidatesFromText } from "./named-system-market-match";

export const AUTONOMOUS_MATERIAL_SPECIFICATION_RECOVERY_VERSION = "AMSR-v1" as const;

export type MaterialSpecificationLevel =
  | "CATEGORY_GENERIC"
  | "PARTIAL_SPEC"
  | "PRODUCT_SPECIFIC";

export type MaterialSpecificationRecovery = {
  materialCategory: string;
  exactSpecification: string | null;
  specificationLevel: MaterialSpecificationLevel;
  unit: string;
  quantity: number;
  packageBasis: string | null;
  technologyRelation: string | null;
  source: string;
  provenance: string;
  inventedAttributes: false;
  missingSpecDimensions: string[];
};

/**
 * Recover specification ONLY from BOM / evidence text — never invent thickness/class/SKU.
 */
export function recoverMaterialSpecification(input: {
  namePl: string;
  unit: string;
  qtyFactor: number;
  technologyRelation?: string | null;
  source?: string | null;
  provenance?: string | null;
  evidenceText?: string | null;
}): MaterialSpecificationRecovery {
  const name = String(input.namePl || "").trim();
  const unit = normalizeResearchUnit(input.unit) || String(input.unit || "").trim() || "?";
  const evidence = String(input.evidenceText || "").trim();
  const hay = `${name} ${evidence}`;
  const missing: string[] = [];
  const bits: string[] = [];

  const thick = hay.match(/(\d+(?:[.,]\d+)?)\s*mm\b/i);
  const isPanelish = /panel|prospanel|lamin|winyl|\bspc\b/i.test(hay);
  const isBrickish = /ceg[lł]|silikat|bloczek/i.test(hay);
  const isTileish = /p[lł]ytk|glazur|gres|terakota/i.test(hay);

  if (thick && isPanelish) bits.push(`${thick[1]!.replace(",", ".")} mm`);
  else if (isPanelish) missing.push("thickness_mm");

  const thickCm = hay.match(/(\d{1,2}(?:[.,]\d+)?)\s*cm\b/i);
  if (thickCm && isBrickish) bits.push(`${thickCm[1]!.replace(",", ".")} cm`);

  const ac = hay.match(/\bAC\s*([1-6])\b/i);
  if (ac && isPanelish) bits.push(`AC${ac[1]}`);
  else if (isPanelish) missing.push("abrasion_class_AC");

  const brand = hay.match(
    /\b(GoodHome|Swiss\s*Krono|Kronospan|Classen|Quick[\s-]?Step|Barlinek|Weninger|Prospanel)\b/i,
  );
  if (brand) bits.push(brand[1]!.replace(/\s+/g, " "));

  let tech: string | null = null;
  if (/\blaminowan/i.test(hay)) tech = "laminowane";
  else if (/\bSPC\b/i.test(hay)) tech = "spc";
  else if (/\bwinylow/i.test(hay)) tech = "winylowe";
  else if (isPanelish) missing.push("panel_technology_laminate_or_vinyl");

  if (/\bsilikat|wapienno[\s-]?piaskow/i.test(hay)) bits.push("silikat");
  if (/\b(\d{2})\s*[x×]\s*(\d{2})\b/i.test(hay) && isTileish) {
    const fm = hay.match(/\b(\d{2})\s*[x×]\s*(\d{2})\b/i);
    if (fm) bits.push(`${fm[1]}x${fm[2]}`);
  }

  const namedSystems = extractNamedSystemCandidatesFromText(hay);
  if (namedSystems[0]) bits.push(`system:${namedSystems[0]}`);

  const exact = bits.length ? bits.join(" · ") : null;
  const level: MaterialSpecificationLevel =
    exact && ((tech && thick) || (isBrickish && thickCm) || (isTileish && /x/.test(exact)))
      ? thick && ac && tech
        ? "PRODUCT_SPECIFIC"
        : "PARTIAL_SPEC"
      : exact || tech || namedSystems.length
      ? "PARTIAL_SPEC"
      : "CATEGORY_GENERIC";

  const category = name
    .replace(/\d+(?:[.,]\d+)?\s*mm\b/gi, "")
    .replace(/\bAC\s*[1-6]\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    || name;

  return {
    materialCategory: category,
    exactSpecification: exact,
    specificationLevel: level,
    unit,
    quantity: Number.isFinite(input.qtyFactor) ? Number(input.qtyFactor) : 1,
    packageBasis: null,
    technologyRelation: input.technologyRelation || tech,
    source: String(input.source || "bom_material_identity").trim(),
    provenance: String(input.provenance || "MIN_IDENTITY").trim(),
    inventedAttributes: false,
    missingSpecDimensions: level === "CATEGORY_GENERIC"
      ? missing
      : missing.filter((d) => {
        if (d === "thickness_mm" && thick && isPanelish) return false;
        if (d === "abrasion_class_AC" && ac) return false;
        if (d === "panel_technology_laminate_or_vinyl" && tech) return false;
        return true;
      }),
  };
}

export type AmsrSourceTier =
  | "OFFER_BOQ_LINE"
  | "WORK_DESCRIPTION"
  | "ATHED_EXTRACT"
  | "TECHNOLOGY_PACK"
  | "EXISTING_KNOWLEDGE"
  | "PUBLIC_BOQ_EXTRACT"
  | "BOM_IDENTITY_ONLY";

export type AmsrAttributeKey =
  | "named_system"
  | "thickness_mm"
  | "thickness_cm"
  | "abrasion_class_AC"
  | "panel_technology"
  | "brick_type"
  | "tile_format"
  | "bonding_method"
  | "brand"
  | "usage_class";

export type AmsrAttributeHit = {
  key: AmsrAttributeKey;
  value: string;
  sourceTier: AmsrSourceTier;
  sourceRef: string;
  provenance: string;
  evidenceSnippet: string;
  invent: false;
};

export type AmsrNormalizedSpecification = MaterialSpecificationRecovery & {
  namedSystem: string | null;
  thicknessMm: number | null;
  thicknessCm: number | null;
  abrasionClassAc: number | null;
  panelTechnology: "laminowane" | "winylowe" | "spc" | null;
  brickType: string | null;
  tileFormat: string | null;
  bondingMethod: string | null;
  brand: string | null;
  attributeHits: AmsrAttributeHit[];
  sourceLadder: Array<{
    tier: AmsrSourceTier;
    status: "HIT" | "EMPTY" | "NOT_PROVIDED";
    notesPl: string | null;
  }>;
  version: typeof AUTONOMOUS_MATERIAL_SPECIFICATION_RECOVERY_VERSION;
};

export type RunAmsrInput = {
  materialNamePl: string;
  unit: string;
  qtyFactor: number;
  offerBoqDescription?: string | null;
  workDescription?: string | null;
  athedExtractTexts?: readonly string[] | null;
  technologyPackTexts?: readonly string[] | null;
  knowledgeTokens?: readonly string[] | null;
  knowledgeProvenance?: string | null;
  factorSourceRef?: string | null;
  nowIso?: string;
};

function fold(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
}

function snippetAround(text: string, idx: number, radius = 80): string {
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function extractAttributesFromText(input: {
  text: string;
  tier: AmsrSourceTier;
  sourceRef: string;
  provenance: string;
}): AmsrAttributeHit[] {
  const text = String(input.text || "");
  if (!text.trim()) return [];
  const hits: AmsrAttributeHit[] = [];
  const f = fold(text);

  const namedSystems = extractNamedSystemCandidatesFromText(text);
  for (const ns of namedSystems) {
    // Reject door/window leaf adjectives leaking from adjacent ATHED BOQ rows
    if (
      /skrzydl|osciezn|stolark|okienn|drzwiow|zespolon|uchyln|rozwieran/.test(
        fold(ns),
      )
    ) {
      continue;
    }
    const idx = fold(text).indexOf(ns);
    hits.push({
      key: "named_system",
      value: ns,
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, idx >= 0 ? idx : 0),
      invent: false,
    });
  }

  const thick = text.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*mm\b/i);
  if (thick) {
    const near = snippetAround(text, thick.index ?? 0, 40);
    const nearF = fold(near);
    const electrical = /mm\s*2\b|mm2\b|przewod|instalac/i.test(nearF);
    // Reject adjacent BOQ rows (OSB / insulation) — thickness must co-locate with panel identity.
    const foreignProduct =
      /\bosb\b|we[lł]n|styropian|piana|foli|listw|cok[oó][lł]|plyt\w*\s+gips/i.test(nearF);
    const panelCtxLocal =
      /panel|lamin|winyl|\bspc\b|grubosc|grubo[sś][cć]|system:/.test(nearF)
      || namedSystems.some((ns) => nearF.includes(ns));
    if (!electrical && !foreignProduct && panelCtxLocal) {
      hits.push({
        key: "thickness_mm",
        value: String(thick[1]).replace(",", "."),
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: near,
        invent: false,
      });
    }
  }

  const ac = text.match(/\bAC\s*([1-6])\b/i);
  if (ac) {
    hits.push({
      key: "abrasion_class_AC",
      value: `AC${ac[1]}`,
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, ac.index ?? 0),
      invent: false,
    });
  }

  if (/\blaminowan/i.test(text)) {
    hits.push({
      key: "panel_technology",
      value: "laminowane",
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, text.search(/laminowan/i)),
      invent: false,
    });
  } else if (/\bSPC\b/i.test(text)) {
    hits.push({
      key: "panel_technology",
      value: "spc",
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, text.search(/\bSPC\b/i)),
      invent: false,
    });
  } else if (/\bwinylow/i.test(text)) {
    hits.push({
      key: "panel_technology",
      value: "winylowe",
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, text.search(/winylow/i)),
      invent: false,
    });
  }

  // Knowledge tokens alone are not brands — only match brand in longer product/BOQ text.
  if (text.trim().length >= 12) {
    const brand = text.match(
      /\b(GoodHome|Swiss\s*Krono|Kronospan|Classen|Quick[\s-]?Step|Barlinek|Weninger)\b/i,
    );
    if (brand) {
      hits.push({
        key: "brand",
        value: brand[1]!.replace(/\s+/g, " "),
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: snippetAround(text, brand.index ?? 0),
        invent: false,
      });
    }
  }

  const usage = text.match(/\bklas[ay]\s*(?:u[zż]ytkow\w*)?\s*(\d{2})\s*\/\s*(\d{2})\b/i);
  if (usage) {
    hits.push({
      key: "usage_class",
      value: `${usage[1]}/${usage[2]}`,
      sourceTier: input.tier,
      sourceRef: input.sourceRef,
      provenance: input.provenance,
      evidenceSnippet: snippetAround(text, usage.index ?? 0),
      invent: false,
    });
  }

  // Masonry / brick — only when co-located with brick identity (not invent from bare "12 cm")
  const brickNear = /ceg[lł]|silikat|wapienno[\s-]?piaskow|bloczek/i.test(text);
  if (brickNear) {
    if (/\bsilikat|wapienno[\s-]?piaskow/i.test(text)) {
      const idx = text.search(/silikat|wapienno/i);
      hits.push({
        key: "brick_type",
        value: "silikat",
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: snippetAround(text, idx >= 0 ? idx : 0),
        invent: false,
      });
    }
    const cm = text.match(/\b(\d{1,2}(?:[.,]\d+)?)\s*cm\b/i);
    if (cm) {
      hits.push({
        key: "thickness_cm",
        value: String(cm[1]).replace(",", "."),
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: snippetAround(text, cm.index ?? 0),
        invent: false,
      });
    }
  }

  // Tile format e.g. 10x10 / 20×20 — only with tile context
  if (/p[lł]ytk|glazur|gres|terakota|licowan/i.test(text)) {
    const fmtRe = /\b(\d{2})\s*[x×]\s*(\d{2})\s*(?:cm)?\b/gi;
    const formats: string[] = [];
    let fm: RegExpExecArray | null;
    while ((fm = fmtRe.exec(text))) {
      const v = `${fm[1]}x${fm[2]}`;
      if (!formats.includes(v)) formats.push(v);
    }
    // Multiple formats in one text = unresolved variants — do not invent a winner
    if (formats.length === 1) {
      hits.push({
        key: "tile_format",
        value: formats[0]!,
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: snippetAround(text, text.search(/\d{2}\s*[x×]\s*\d{2}/i)),
        invent: false,
      });
    }
    if (/\bna\s+klej|zapraw[ay]\s+klej|metod[aą]\s+kombinowan/i.test(text)) {
      const idx = text.search(/klej|kombinowan/i);
      hits.push({
        key: "bonding_method",
        value: /kombinowan/i.test(text) ? "na_klej_metoda_kombinowana" : "na_klej",
        sourceTier: input.tier,
        sourceRef: input.sourceRef,
        provenance: input.provenance,
        evidenceSnippet: snippetAround(text, idx >= 0 ? idx : 0),
        invent: false,
      });
    }
  }

  return hits;
}

function pickFirst(
  hits: readonly AmsrAttributeHit[],
  key: AmsrAttributeKey,
): AmsrAttributeHit | null {
  return hits.find((h) => h.key === key) ?? null;
}

export function runAutonomousMaterialSpecificationRecovery(
  input: RunAmsrInput,
): AmsrNormalizedSpecification {
  const nowIso = input.nowIso || new Date().toISOString();
  const allHits: AmsrAttributeHit[] = [];
  const ladder: AmsrNormalizedSpecification["sourceLadder"] = [];

  const stages: Array<{
    tier: AmsrSourceTier;
    texts: string[];
    provenance: string;
  }> = [
    {
      tier: "OFFER_BOQ_LINE",
      texts: input.offerBoqDescription ? [String(input.offerBoqDescription)] : [],
      provenance: "tender_offer_boq_line",
    },
    {
      tier: "WORK_DESCRIPTION",
      texts: input.workDescription ? [String(input.workDescription)] : [],
      provenance: "work_or_technology_description",
    },
    {
      tier: "ATHED_EXTRACT",
      texts: [...(input.athedExtractTexts || [])].map(String),
      provenance: "athed_public_extract",
    },
    {
      tier: "TECHNOLOGY_PACK",
      texts: [...(input.technologyPackTexts || [])].map(String),
      provenance: "technology_pack",
    },
    {
      tier: "EXISTING_KNOWLEDGE",
      // Join tokens so bare "10x10" can inherit tile context from sibling "płytkami".
      // Multiple formats in the joined text still refuse a winner (no invent).
      texts: (() => {
        const toks = [...(input.knowledgeTokens || [])].map(String).filter(Boolean);
        if (toks.length === 0) return [] as string[];
        return [toks.join(" "), ...toks];
      })(),
      provenance: String(input.knowledgeProvenance || "knowledge_semantic_token"),
    },
    {
      tier: "PUBLIC_BOQ_EXTRACT",
      texts: [],
      provenance: "public_boq_extract",
    },
  ];

  for (const stage of stages) {
    if (stage.texts.length === 0) {
      ladder.push({ tier: stage.tier, status: "NOT_PROVIDED", notesPl: null });
      continue;
    }
    let stageHits = 0;
    for (let i = 0; i < stage.texts.length; i++) {
      const extracted = extractAttributesFromText({
        text: stage.texts[i]!,
        tier: stage.tier,
        sourceRef: `${stage.tier}:${i}`,
        provenance: stage.provenance,
      });
      stageHits += extracted.length;
      allHits.push(...extracted);
    }
    ladder.push({
      tier: stage.tier,
      status: stageHits > 0 ? "HIT" : "EMPTY",
      notesPl: `hits=${stageHits}`,
    });
  }

  const chosen: AmsrAttributeHit[] = [];
  const seen = new Set<AmsrAttributeKey>();
  for (const h of allHits) {
    if (seen.has(h.key)) continue;
    seen.add(h.key);
    chosen.push(h);
  }

  const named = pickFirst(chosen, "named_system");
  const thick = pickFirst(chosen, "thickness_mm");
  const thickCm = pickFirst(chosen, "thickness_cm");
  const ac = pickFirst(chosen, "abrasion_class_AC");
  const tech = pickFirst(chosen, "panel_technology");
  const brickType = pickFirst(chosen, "brick_type");
  const tileFormat = pickFirst(chosen, "tile_format");
  const bonding = pickFirst(chosen, "bonding_method");
  const brand = pickFirst(chosen, "brand");

  const evidenceParts = [
    named ? `named_system=${named.value}` : "",
    thick ? `${thick.value} mm` : "",
    thickCm ? `${thickCm.value} cm` : "",
    ac ? ac.value : "",
    tech ? tech.value : "",
    brickType ? brickType.value : "",
    tileFormat ? tileFormat.value : "",
    bonding ? bonding.value : "",
    brand ? brand.value : "",
    input.offerBoqDescription || "",
    input.workDescription || "",
  ].filter(Boolean);

  const base = recoverMaterialSpecification({
    namePl: input.materialNamePl,
    unit: input.unit,
    qtyFactor: input.qtyFactor,
    technologyRelation: tech?.value || null,
    source: input.factorSourceRef || chosen[0]?.sourceTier || "amsr",
    provenance: chosen[0]?.provenance || "AMSR-v1",
    evidenceText: evidenceParts.join(" · "),
  });

  let specificationLevel: MaterialSpecificationLevel = base.specificationLevel;
  if (
    specificationLevel === "CATEGORY_GENERIC"
    && (named || thick || thickCm || ac || tech || brickType || tileFormat)
  ) {
    specificationLevel = "PARTIAL_SPEC";
  }
  if (
    brickType
    && thickCm
    && specificationLevel === "PARTIAL_SPEC"
  ) {
    // masonry with type+thickness is product-family specific enough for market match
    specificationLevel = "PARTIAL_SPEC";
  }

  const exactBits = [
    named ? `system:${named.value}` : null,
    brickType ? brickType.value : null,
    thickCm ? `${thickCm.value} cm` : null,
    tileFormat ? tileFormat.value : null,
    bonding ? bonding.value : null,
    base.exactSpecification,
    tech && !String(base.exactSpecification || "").includes(tech.value) ? tech.value : null,
  ].filter(Boolean);

  // Category-aware missing dims: do not demand panel AC/mm for bricks/tiles
  const nameF = fold(input.materialNamePl);
  const panelish = /panel/.test(nameF);
  let missingSpecDimensions = [...base.missingSpecDimensions];
  if (!panelish) {
    missingSpecDimensions = missingSpecDimensions.filter(
      (d) =>
        d !== "thickness_mm"
        && d !== "abrasion_class_AC"
        && d !== "panel_technology_laminate_or_vinyl",
    );
  }
  if (/ceg|silikat|bloczek/.test(nameF) || brickType) {
    if (!brickType) missingSpecDimensions.push("brick_type");
    if (!thickCm) missingSpecDimensions.push("thickness_cm");
  }
  if (/plytk|glazur|gres/.test(nameF)) {
    if (!tileFormat) missingSpecDimensions.push("tile_format");
  }

  const result: AmsrNormalizedSpecification = {
    ...base,
    specificationLevel,
    exactSpecification: exactBits.length ? [...new Set(exactBits)].join(" · ") : null,
    namedSystem: named?.value ?? null,
    thicknessMm: thick ? Number(thick.value) : null,
    thicknessCm: thickCm ? Number(thickCm.value) : null,
    abrasionClassAc: ac ? Number(String(ac.value).replace(/^AC/i, "")) : null,
    panelTechnology: (tech?.value as AmsrNormalizedSpecification["panelTechnology"]) || null,
    brickType: brickType?.value ?? null,
    tileFormat: tileFormat?.value ?? null,
    bondingMethod: bonding?.value ?? null,
    brand: brand?.value ?? null,
    attributeHits: chosen,
    sourceLadder: ladder,
    inventedAttributes: false,
    missingSpecDimensions,
    provenance: [
      "AMSR-v1",
      ...chosen.map((c) => `${c.key}@${c.sourceTier}`),
    ].join("|"),
    source: chosen[0]?.sourceTier || "BOM_IDENTITY_ONLY",
    version: AUTONOMOUS_MATERIAL_SPECIFICATION_RECOVERY_VERSION,
  };

  if (ladder.every((s) => s.status !== "HIT")) {
    result.sourceLadder = [
      ...ladder,
      {
        tier: "BOM_IDENTITY_ONLY",
        status: "HIT",
        notesPl: "category_identity_only_no_spec_attrs",
      },
    ];
  }

  upsertMaterialEvidenceKnowledge({
    id: `mek_spec_${fold(input.materialNamePl).replace(/\s+/g, "_").slice(0, 40)}`,
    kind: "SPECIFICATION_MATCHING",
    materialCategory: result.materialCategory,
    materialKey: null,
    providerId: "amsr_v1",
    sourceUrl: null,
    searchStrategy: null,
    applicability: result.specificationLevel,
    evidenceRefs: chosen.map((c) => `${c.sourceTier}:${c.value}`),
    validationState: chosen.length ? "UNVERIFIED" : "STATUS_ONLY",
    provenance: "AMSR-v1",
    freshnessIso: nowIso,
    payload: {
      namedSystem: result.namedSystem,
      thicknessMm: result.thicknessMm,
      abrasionClassAc: result.abrasionClassAc,
      panelTechnology: result.panelTechnology,
      missingSpecDimensions: result.missingSpecDimensions,
    },
    invent: false,
    priceAsUniversalTruth: false,
  });

  return result;
}

export function materialEvidenceMatchesRecoveredSpecification(input: {
  recovered: AmsrNormalizedSpecification;
  productName: string;
  productSpecificationHint?: string | null;
}): {
  matched: boolean;
  reason: string;
} {
  const product = `${input.productName} ${input.productSpecificationHint || ""}`;
  const pf = fold(product);

  if (input.recovered.namedSystem) {
    const ns = fold(input.recovered.namedSystem);
    if (!pf.includes(ns)) {
      return {
        matched: false,
        reason: `NAMED_SYSTEM_MISMATCH · required=${input.recovered.namedSystem}`,
      };
    }
  }

  if (input.recovered.thicknessMm != null) {
    const t = String(input.recovered.thicknessMm);
    if (!new RegExp(`${t.replace(".", "[.,]")}\\s*mm`).test(product)) {
      return {
        matched: false,
        reason: `THICKNESS_MISMATCH · required=${input.recovered.thicknessMm}mm`,
      };
    }
  }

  if (input.recovered.abrasionClassAc != null) {
    if (!new RegExp(`\\bac\\s*${input.recovered.abrasionClassAc}\\b`, "i").test(product)) {
      return {
        matched: false,
        reason: `AC_MISMATCH · required=AC${input.recovered.abrasionClassAc}`,
      };
    }
  }

  if (input.recovered.panelTechnology) {
    const tech = input.recovered.panelTechnology;
    const ok =
      (tech === "laminowane" && /lamin/.test(pf))
      || (tech === "winylowe" && /winyl/.test(pf))
      || (tech === "spc" && /\bspc\b/.test(pf));
    if (!ok) {
      return {
        matched: false,
        reason: `TECHNOLOGY_MISMATCH · required=${tech}`,
      };
    }
  }

  if (input.recovered.brickType) {
    const bt = fold(input.recovered.brickType);
    if (bt === "silikat") {
      // Silka / wapienno-piaskowe / silikat* are justified aliases — not invent
      if (!/silikat|silka|wapienno|piaskow/.test(pf)) {
        return {
          matched: false,
          reason: `BRICK_TYPE_MISMATCH · required=${input.recovered.brickType}`,
        };
      }
    } else if (!pf.includes(bt)) {
      return {
        matched: false,
        reason: `BRICK_TYPE_MISMATCH · required=${input.recovered.brickType}`,
      };
    }
  }

  if (input.recovered.thicknessCm != null) {
    const t = String(input.recovered.thicknessCm);
    const mm = Math.round(Number(input.recovered.thicknessCm) * 10);
    const hasCm = new RegExp(`${t.replace(".", "[.,]")}\\s*cm`).test(product);
    // PDP often encodes wall thickness as 120 mm (= 12 cm)
    const hasMm =
      Number.isFinite(mm)
      && mm > 0
      && new RegExp(`(?:^|[^0-9])${mm}\\s*mm`).test(product);
    if (!hasCm && !hasMm) {
      return {
        matched: false,
        reason: `THICKNESS_CM_MISMATCH · required=${input.recovered.thicknessCm}cm`,
      };
    }
  }

  if (input.recovered.tileFormat) {
    const [a, b] = String(input.recovered.tileFormat).split(/x/i);
    if (a && b) {
      const re = new RegExp(`${a}\\s*[x×]\\s*${b}`, "i");
      if (!re.test(product)) {
        return {
          matched: false,
          reason: `TILE_FORMAT_MISMATCH · required=${input.recovered.tileFormat}`,
        };
      }
    }
  }

  if (
    input.recovered.specificationLevel === "CATEGORY_GENERIC"
    && !input.recovered.namedSystem
    && input.recovered.thicknessMm == null
    && input.recovered.thicknessCm == null
    && input.recovered.abrasionClassAc == null
    && !input.recovered.panelTechnology
    && !input.recovered.brickType
    && !input.recovered.tileFormat
  ) {
    const hint = fold(input.productSpecificationHint || "");
    if (hint && (/mm|ac[1-6]|lamin|winyl|spc|silikat|\d+\s*x\s*\d+/.test(hint))) {
      return {
        matched: false,
        reason: "BOM_SPECIFICATION_GAP · product_sku_not_justified_by_category_identity",
      };
    }
  }

  // Reject tool/accessory false positives when masonry identity recovered
  if (input.recovered.brickType) {
    if (/brzeszczot|pila|otwornic|wiertl|narzedz/.test(pf)) {
      return { matched: false, reason: "PRODUCT_CLASS_MISMATCH · tool_not_brick" };
    }
  }

  return { matched: true, reason: "SPEC_ATTRIBUTES_ALIGNED_OR_CATEGORY_SOFT" };
}
