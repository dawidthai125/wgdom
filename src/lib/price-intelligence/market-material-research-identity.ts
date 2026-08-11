/**
 * MARKET-MATERIAL-RESEARCH-01 — deterministic researchJobId (Hard SF identity).
 * materialKey + sourceScope + regionScope — NO fuzzy identity.
 */

export const MMR_DEFAULT_SOURCE_SCOPE = "default" as const;

/** Must stay within Stage A researchJobId charset: ^[\w.:|@/-]+$ */
export function buildMaterialResearchJobId(opts: {
  materialKey: string;
  sourceScope?: string;
  regionScope?: string;
}): string {
  const mk = String(opts.materialKey || "").trim();
  const source = String(opts.sourceScope || MMR_DEFAULT_SOURCE_SCOPE).trim() || MMR_DEFAULT_SOURCE_SCOPE;
  const region = String(opts.regionScope || "wroclaw").trim() || "wroclaw";
  if (!mk) throw new Error("materialKey required for researchJobId");
  const id = `${mk}|${source}|${region}`;
  if (id.length > 256 || !/^[\w.:|@/-]+$/.test(id)) {
    throw new Error(`invalid researchJobId composition: ${id}`);
  }
  return id;
}

export function dedupeNeededMaterialKeys(
  lines: readonly {
    materialKey: string;
    catalogWorkId: string;
    namePl?: string;
    unit: string;
    region?: string;
    tenderId?: string | null;
  }[],
): {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: string;
  region: string;
  tenderIds: string[];
  occurrenceCount: number;
}[] {
  const byKey = new Map<
    string,
    {
      materialKey: string;
      catalogWorkId: string;
      namePl: string;
      unit: string;
      region: string;
      tenderIds: string[];
      occurrenceCount: number;
    }
  >();

  for (const line of lines) {
    const materialKey = String(line.materialKey || "").trim();
    if (!materialKey) continue;
    const region = String(line.region || "wroclaw").trim() || "wroclaw";
    /** Dedup key = materialKey (+ region when regional quotes apply). */
    const dedupKey = `${materialKey}|${region}`;
    const prev = byKey.get(dedupKey);
    const tenderId = typeof line.tenderId === "string" ? line.tenderId.trim() : "";
    if (!prev) {
      byKey.set(dedupKey, {
        materialKey,
        catalogWorkId: String(line.catalogWorkId || "").trim(),
        namePl: String(line.namePl || materialKey).trim() || materialKey,
        unit: String(line.unit || "").trim(),
        region,
        tenderIds: tenderId ? [tenderId] : [],
        occurrenceCount: 1,
      });
      continue;
    }
    prev.occurrenceCount += 1;
    if (tenderId && !prev.tenderIds.includes(tenderId)) prev.tenderIds.push(tenderId);
    if (!prev.catalogWorkId && line.catalogWorkId) {
      prev.catalogWorkId = String(line.catalogWorkId).trim();
    }
    if (!prev.unit && line.unit) prev.unit = String(line.unit).trim();
  }

  return [...byKey.values()];
}
