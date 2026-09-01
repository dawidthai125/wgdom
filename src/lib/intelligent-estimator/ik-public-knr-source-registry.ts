/**
 * PublicKnrSourceRegistry — curated public sources for IK KNR discovery.
 *
 * BY_KEY = preferred · registry = generic fallback when BY_KEY empty.
 * Merged into effective allowlist at discovery time (never client raw URL).
 * ZERO paywall · ZERO scrape_* · ZERO invent.
 */

import type { KnrDiscoveryAllowlistEntry } from "./knr-knowledge/knr-discovery-allowlist";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  listKnrDiscoveryAllowlist,
} from "./knr-knowledge/knr-discovery-allowlist";
import type { PublicKnrSourceKind } from "./ik-public-knr-types";
import type { KnrOnDemandMissKey } from "./knr-knowledge/knr-discovery-on-demand";
import { selectKnrDiscoverySourceIds } from "./knr-knowledge/knr-discovery-source-selection";

export type PublicKnrRegistryEntry = {
  sourceId: string;
  url: string;
  hostname: string;
  originId: string;
  sourceKind: PublicKnrSourceKind;
  active: boolean;
  /** Higher = try earlier within same score band. */
  priority: number;
  title?: string;
  /** Table codes e.g. 1124-01, 0402-03 */
  tableCodeHints?: readonly string[];
  /** evidenceKeyV1 e.g. KNR|4-03|1124-01 */
  evidenceKeyHints?: readonly string[];
  keywordHints?: readonly string[];
};

/**
 * Curated public KNR evidence documents (Owner-reviewed URLs).
 * Extends — does not replace — KNR_DISCOVERY_HTTP_ALLOWLIST.
 */
export const PUBLIC_KNR_SOURCE_REGISTRY: readonly PublicKnrRegistryEntry[] =
  Object.freeze([
    {
      sourceId: "pub_bip_wcrs_wroclaw_1414",
      hostname: "bip.wcrs.wroclaw.pl",
      url: "https://bip.wcrs.wroclaw.pl/attachments/download/1414",
      originId: "knr_official_public_document",
      sourceKind: "BIP",
      active: true,
      priority: 90,
      title: "BIP WCRS Wrocław — przedmiar instalacji elektrycznej",
      tableCodeHints: ["1124-01"],
      evidenceKeyHints: ["KNR|4-03|1124-01", "KNR-W|4-03|1124-01"],
      keywordHints: ["demontaż łączników", "1124-01"],
    },
    {
      sourceId: "pub_bip_krakow_134490",
      hostname: "www.bip.krakow.pl",
      url: "https://www.bip.krakow.pl/plik.php?mode=shw&new=t&wer=0&zid=134490",
      originId: "knr_official_public_document",
      sourceKind: "BIP",
      active: true,
      priority: 85,
      title: "BIP Kraków — kosztorys instalacji elektrycznej",
      tableCodeHints: ["1124-01"],
      evidenceKeyHints: ["KNR|4-03|1124-01", "KNR-W|4-03|1124-01"],
      keywordHints: ["1124/01", "demontaż"],
    },
    {
      sourceId: "pub_gov_pl_attachment_5adfc3cc",
      hostname: "www.gov.pl",
      url: "https://www.gov.pl/attachment/5adfc3cc-773a-4d3a-aeaa-7a27d823a338",
      originId: "knr_government_public",
      sourceKind: "GOVERNMENT",
      active: true,
      priority: 80,
      title: "gov.pl — przedmiar robót publicznych",
      tableCodeHints: ["1124-01"],
      evidenceKeyHints: ["KNR|4-03|1124-01", "KNR-W|4-03|1124-01"],
    },
    {
      sourceId: "pub_wody_gov_przedmiar_101750",
      hostname: "przetargi.wody.gov.pl",
      url: "https://przetargi.wody.gov.pl/wp/postepowania-przetargow/download/101750,Zalacznik-nr-3Przedmiar-robot.html",
      originId: "knr_government_public",
      sourceKind: "PUBLIC_TENDER",
      active: true,
      priority: 75,
      title: "Wody Polskie — przedmiar HTML",
      tableCodeHints: ["1124-01"],
      evidenceKeyHints: ["KNR-W|4-03|1124-01"],
    },
    {
      sourceId: "pub_caritas_wroclaw_elektr_pdf",
      hostname: "wroclaw.caritas.pl",
      url: "https://wroclaw.caritas.pl/wp-content/uploads/2024/05/Zalacznik-nr-9-przedmiar-dla-robot-remontowych-dotyczacych-instalacji-elektrycznej.pdf",
      originId: "knr_official_public_document",
      sourceKind: "PUBLIC_PDF",
      active: true,
      priority: 70,
      title: "Caritas Wrocław — przedmiar instalacji elektrycznej",
      tableCodeHints: ["1124-01"],
      keywordHints: ["1124-01", "demontaż łączników"],
    },
    {
      sourceId: "pub_zut_edu_0402_03",
      hostname: "www.zamowienia.zut.edu.pl",
      url: "https://www.zamowienia.zut.edu.pl/fileadmin/pliki/dzinwestycji/przedmiar_zamienny.pdf",
      originId: "knr_university_public",
      sourceKind: "UNIVERSITY",
      active: true,
      priority: 85,
      title: "ZUT — przedmiar zamienny",
      tableCodeHints: ["0402-03"],
      evidenceKeyHints: ["KNR|13-21|0402-03"],
      keywordHints: ["różnicowo-prądow", "0402-03"],
    },
    {
      sourceId: "pub_samorzad_gov_0402_03",
      hostname: "samorzad.gov.pl",
      url: "https://samorzad.gov.pl/attachment/19cf011b-48ea-420f-8160-ec1ec4d4c46c",
      originId: "knr_government_public",
      sourceKind: "GOVERNMENT",
      active: true,
      priority: 80,
      title: "samorzad.gov.pl — przedmiar",
      tableCodeHints: ["0402-03"],
      evidenceKeyHints: ["KNR|13-21|0402-03"],
      keywordHints: ["0402-03", "przeciwporażeniow"],
    },
    {
      sourceId: "pub_superszkolna_bip_0402_03",
      hostname: "bip-v1-files.superszkolna.pl",
      url: "https://bip-v1-files.superszkolna.pl/sites/47636/wiadomosci/224477/files/14_przedmiar_ohp__poddasze_v2.pdf",
      originId: "knr_official_public_document",
      sourceKind: "BIP",
      active: true,
      priority: 75,
      title: "BIP szkoła — przedmiar OHP",
      tableCodeHints: ["0402-03"],
      evidenceKeyHints: ["KNR|13-21|0402-03"],
    },
  ]);

export type PublicKnrSourceSelectionReason =
  | "BY_KEY"
  | "REGISTRY_EVIDENCE_KEY"
  | "REGISTRY_TABLE_CODE"
  | "REGISTRY_KEYWORD"
  | "REGISTRY_PRIORITY_FALLBACK"
  | "EMPTY";

export type SelectPublicKnrRegistrySourcesResult = {
  sourceIds: readonly string[];
  reason: PublicKnrSourceSelectionReason;
  matchedEntries: readonly PublicKnrRegistryEntry[];
  scores: Readonly<Record<string, number>>;
};

function tableCodeFromMiss(miss: KnrOnDemandMissKey): string {
  const item = String(miss.identity?.item ?? "").trim();
  const table = String(miss.identity?.table ?? "").trim();
  if (table && item) return `${table}-${item}`;
  const parts = String(miss.evidenceKeyV1 ?? "").split("|");
  return parts.length >= 3 ? parts.slice(2).join("-") : "";
}

function scoreRegistryEntry(
  entry: PublicKnrRegistryEntry,
  miss: KnrOnDemandMissKey,
  queries: readonly string[],
): number {
  let score = entry.priority;
  const ek = String(miss.evidenceKeyV1 ?? "").trim();
  const nk = String(miss.normalizedKey ?? ek).trim();
  const tableCode = tableCodeFromMiss(miss);

  if (entry.evidenceKeyHints?.some((h) => h === ek || h === nk)) {
    score += 40;
  }
  if (tableCode && entry.tableCodeHints?.includes(tableCode)) {
    score += 30;
  }
  const queryBlob = queries.join(" ").toLowerCase();
  for (const kw of entry.keywordHints ?? []) {
    if (queryBlob.includes(String(kw).toLowerCase())) score += 10;
  }
  if (entry.sourceKind === "BIP" || entry.sourceKind === "GOVERNMENT") {
    score += 10;
  }
  return score;
}

/**
 * Rank registry entries for a missing KNR. Returns top N sourceIds by score.
 */
export function selectPublicKnrRegistrySources(opts: {
  miss: KnrOnDemandMissKey;
  queries?: readonly string[];
  maxSources?: number;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
}): SelectPublicKnrRegistrySourcesResult {
  const max = opts.maxSources ?? 10;
  const registry = opts.registryOverride ?? PUBLIC_KNR_SOURCE_REGISTRY;
  const queries = opts.queries ?? [];
  const active = registry.filter((e) => e.active);
  const scored = active
    .map((entry) => ({
      entry,
      score: scoreRegistryEntry(entry, opts.miss, queries),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const scores: Record<string, number> = {};
  for (const s of scored) scores[s.entry.sourceId] = s.score;

  if (!scored.length) {
    return {
      sourceIds: [],
      reason: "EMPTY",
      matchedEntries: [],
      scores,
    };
  }

  const top = scored.slice(0, max);
  const topScore = top[0]!.score;
  let reason: PublicKnrSourceSelectionReason = "REGISTRY_PRIORITY_FALLBACK";
  const ek = String(opts.miss.evidenceKeyV1 ?? "").trim();
  const tableCode = tableCodeFromMiss(opts.miss);

  if (top.some((t) => t.entry.evidenceKeyHints?.includes(ek))) {
    reason = "REGISTRY_EVIDENCE_KEY";
  } else if (top.some((t) => tableCode && t.entry.tableCodeHints?.includes(tableCode))) {
    reason = "REGISTRY_TABLE_CODE";
  } else if (
    top.some((t) =>
      (t.entry.keywordHints ?? []).some((kw) =>
        queries.join(" ").toLowerCase().includes(String(kw).toLowerCase()),
      ),
    )
  ) {
    reason = "REGISTRY_KEYWORD";
  }

  return {
    sourceIds: top.map((t) => t.entry.sourceId),
    reason,
    matchedEntries: top.map((t) => t.entry),
    scores,
  };
}

/**
 * BY_KEY preferred → registry fallback.
 */
export function selectPublicKnrDiscoverySources(opts: {
  miss: KnrOnDemandMissKey;
  queries?: readonly string[];
  maxSources?: number;
  sourceIdsOverride?: readonly string[] | null;
  keyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  familyMapOverride?: Readonly<Record<string, readonly string[]>> | null;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
}): {
  sourceIds: readonly string[];
  selectionReason: PublicKnrSourceSelectionReason | "OVERRIDE" | "BY_KEY" | "FAMILY" | "EMPTY";
  byKeyReason?: string;
  registryReason?: PublicKnrSourceSelectionReason;
  registryScores?: Readonly<Record<string, number>>;
} {
  if (opts.sourceIdsOverride != null) {
    const ids = opts.sourceIdsOverride.filter(Boolean);
    return {
      sourceIds: ids,
      selectionReason: ids.length ? "OVERRIDE" : "EMPTY",
    };
  }

  const byKey = selectKnrDiscoverySourceIds({
    evidenceKeyV1: opts.miss.evidenceKeyV1,
    normalizedKey: opts.miss.normalizedKey,
    family: opts.miss.family,
    keyMapOverride: opts.keyMapOverride,
    familyMapOverride: opts.familyMapOverride,
  });

  if (byKey.sourceIds.length) {
    return {
      sourceIds: byKey.sourceIds,
      selectionReason: byKey.reason === "FAMILY" ? "FAMILY" : "BY_KEY",
      byKeyReason: byKey.reason,
    };
  }

  const reg = selectPublicKnrRegistrySources({
    miss: opts.miss,
    queries: opts.queries,
    maxSources: opts.maxSources,
    registryOverride: opts.registryOverride,
  });

  return {
    sourceIds: reg.sourceIds,
    selectionReason: reg.sourceIds.length ? reg.reason : "EMPTY",
    registryReason: reg.reason,
    registryScores: reg.scores,
  };
}

function registryEntryToAllowlist(entry: PublicKnrRegistryEntry): KnrDiscoveryAllowlistEntry {
  const priorityMap: Record<
    PublicKnrSourceKind,
    KnrDiscoveryAllowlistEntry["priority"]
  > = {
    BIP: "GOVERNMENT",
    GOVERNMENT: "GOVERNMENT",
    LOCAL_GOV: "GOVERNMENT",
    UNIVERSITY: "UNIVERSITY",
    PUBLIC_TENDER: "OFFICIAL_PUBLIC_DOCUMENT",
    PUBLIC_PDF: "OFFICIAL_PUBLIC_DOCUMENT",
    PUBLIC_COST_ESTIMATE: "OFFICIAL_PUBLIC_DOCUMENT",
    PUBLIC_ARCHIVE: "OFFICIAL_PUBLIC_DOCUMENT",
    PUBLIC_CONSTRUCTION: "OFFICIAL_PUBLIC_DOCUMENT",
    PUBLIC_KNR_CATALOG: "OTHER",
    OTHER_PUBLIC: "OTHER",
  };
  let url = entry.url;
  // Normalize http→https when hostname matches (legal fetch prefers https)
  if (url.startsWith("http://")) {
    try {
      const u = new URL(url);
      u.protocol = "https:";
      url = u.toString();
    } catch {
      /* keep original */
    }
  }
  return {
    sourceId: entry.sourceId,
    hostname: entry.hostname,
    url,
    originId: entry.originId,
    active: entry.active,
    priority: priorityMap[entry.sourceKind] ?? "OTHER",
  };
}

/**
 * Merge production allowlist + registry (dedupe by sourceId).
 */
export function buildPublicKnrEffectiveAllowlist(opts?: {
  baseAllowlist?: readonly KnrDiscoveryAllowlistEntry[] | null;
  registryOverride?: readonly PublicKnrRegistryEntry[] | null;
}): readonly KnrDiscoveryAllowlistEntry[] {
  const base = opts?.baseAllowlist ?? listKnrDiscoveryAllowlist(null);
  const registry = opts?.registryOverride ?? PUBLIC_KNR_SOURCE_REGISTRY;
  const seen = new Set<string>();
  const out: KnrDiscoveryAllowlistEntry[] = [];
  for (const e of base) {
    if (seen.has(e.sourceId)) continue;
    seen.add(e.sourceId);
    out.push(e);
  }
  for (const r of registry.filter((x) => x.active)) {
    if (seen.has(r.sourceId)) continue;
    seen.add(r.sourceId);
    out.push(registryEntryToAllowlist(r));
  }
  return Object.freeze(out);
}

export function listPublicKnrRegistryActive(
  override?: readonly PublicKnrRegistryEntry[] | null,
): readonly PublicKnrRegistryEntry[] {
  return (override ?? PUBLIC_KNR_SOURCE_REGISTRY).filter((e) => e.active);
}

export const PUBLIC_KNR_SOURCE_REGISTRY_IMPLEMENTED = true as const;
