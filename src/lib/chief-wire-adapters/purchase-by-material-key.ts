/**
 * PRICE-INTELLIGENCE-01 P1 — projekcja Purchase keyed by BOM materialKey.
 * SSOT: kw-offer-boq-company-knowledge · REUSE find/nameKey · bez nowego store.
 */

import {
  buildCompanyKnowledgeNameKey,
  findCompanyKnowledgeEntry,
  type CompanyKnowledgeEntry,
  type CompanyKnowledgeStore,
} from "@/lib/tender-offer-boq-company-knowledge";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { eticsPackV1, kostkaPackV1 } from "@/lib/technology-foundation/fixtures";
import { listAllPacks } from "@/lib/technology-foundation/pack-registry";
import type { PackMaterialRecipeLine, TechnologyPack } from "@/lib/technology-foundation/types";
import type { CompanyCostRo } from "@/lib/cost-expert";

export interface MaterialPurchaseAlias {
  materialKey: string;
  namePl: string;
  unit: string;
}

function materialLinesFromPack(pack: TechnologyPack): MaterialPurchaseAlias[] {
  return (pack.materials ?? []).map((m: PackMaterialRecipeLine) => ({
    materialKey: m.materialKey,
    namePl: m.namePl,
    unit: m.unit,
  }));
}

/** Aliasy materialKey ↔ nazwa/jednostka z TF (fixtures + zarejestrowane packi). */
export function collectMaterialPurchaseAliases(
  packs?: readonly TechnologyPack[],
): MaterialPurchaseAlias[] {
  const out = new Map<string, MaterialPurchaseAlias>();
  const push = (a: MaterialPurchaseAlias) => {
    if (!a.materialKey || out.has(a.materialKey)) return;
    out.set(a.materialKey, a);
  };
  for (const a of materialLinesFromPack(eticsPackV1())) push(a);
  for (const a of materialLinesFromPack(kostkaPackV1())) push(a);
  const registry = packs ?? listAllPacks();
  for (const p of registry) {
    for (const a of materialLinesFromPack(p)) push(a);
  }
  return [...out.values()];
}

function entryUnitPrice(entry: CompanyKnowledgeEntry): number | null {
  const price = entry.lastUnitPricePln ?? entry.avgUnitPricePln;
  if (typeof price !== "number" || !Number.isFinite(price) || !(price > 0)) return null;
  return price;
}

function scoreEntryForAlias(entry: CompanyKnowledgeEntry, alias: MaterialPurchaseAlias): number {
  const aliasKey = buildCompanyKnowledgeNameKey(alias.namePl);
  if (!aliasKey || entry.nameKey !== aliasKey) return -1;
  if (entry.category !== "material") return -1;
  let score = 10 + entry.occurrenceCount;
  if (foldPolishText(entry.unit || "") === foldPolishText(alias.unit || "")) score += 100;
  if (entry.primarilyFromUser) score += 5;
  return score;
}

function pickBestEntry(
  store: CompanyKnowledgeStore,
  alias: MaterialPurchaseAlias,
): CompanyKnowledgeEntry | null {
  const exact = findCompanyKnowledgeEntry(store, {
    namePl: alias.namePl,
    category: "material",
    unit: alias.unit,
  });
  if (exact && entryUnitPrice(exact) != null) return exact;

  let best: CompanyKnowledgeEntry | null = null;
  let bestScore = -1;
  for (const entry of store.entries) {
    const score = scoreEntryForAlias(entry, alias);
    if (score < 0) continue;
    if (entryUnitPrice(entry) == null) continue;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

/**
 * Buduje mapę Purchase pod kluczem materialKey (kontrakt Cost Expert / BOM).
 * Nie wymyśla cen — tylko istniejące wpisy company knowledge.
 */
export function projectPurchaseByMaterialKey(
  store: CompanyKnowledgeStore,
  aliases: readonly MaterialPurchaseAlias[] = collectMaterialPurchaseAliases(),
): CompanyCostRo["purchaseByMaterialKey"] {
  const out: Record<string, { unitPricePln: number; labelPl?: string }> = {};

  for (const alias of aliases) {
    const entry = pickBestEntry(store, alias);
    if (!entry) continue;
    const price = entryUnitPrice(entry);
    if (price == null) continue;
    out[alias.materialKey] = {
      unitPricePln: price,
      labelPl: entry.namePl,
    };
  }

  // Bezpośrednie seed/test: namePl === materialKey (mat.*)
  for (const entry of store.entries) {
    const price = entryUnitPrice(entry);
    if (price == null) continue;
    const directKey =
      typeof entry.namePl === "string" && entry.namePl.startsWith("mat.")
        ? entry.namePl
        : typeof entry.nameKey === "string" && entry.nameKey.startsWith("mat.")
          ? entry.nameKey
          : null;
    if (!directKey || out[directKey]) continue;
    out[directKey] = {
      unitPricePln: price,
      labelPl: entry.namePl,
    };
  }

  return Object.freeze(out);
}
