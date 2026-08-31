/**
 * IK F5 Auto Gap — Technology / BOM research (READ + CANDIDATE only).
 *
 * Sources (ordered):
 *  1. ACTIVE TechnologyPack for exact workId (normally already used by F5)
 *  2. APPROVED / REVIEW pack for exact same workId → candidate
 *  3. Historical Owner-approved packs via optional port (hard provenance)
 *  4. Norm/KNR structured BOM via optional port (hard materialKey+qtyFactor+provenance)
 *
 * ZERO invent · ZERO LABOR_ONLY from MISSING · ZERO Catalog/TechnologyPack persist
 * ZERO cross-dwelling copy by description similarity
 */

import { listAllPacks } from "@/lib/technology-foundation";
import type {
  PackMaterialRecipeLine,
  TechnologyPack,
  TechnologyPackLifecycle,
} from "@/lib/technology-foundation";
import { validateRecipeLine } from "@/lib/tender-position-cost/bom-technology-adapter";

export const IK_BOM_RESEARCH_RESOLVER_ID = "bom-research-v1" as const;
export const IK_BOM_RESEARCH_SCHEMA_VERSION = 1 as const;

export const DEFAULT_BOM_CONFIDENCE_THRESHOLD = 0.85;

export type IkBomGapCode =
  | "BRAK_TECHNOLOGII_BOM"
  | "BRAK_NORMY_MATERIALOWEJ"
  | "BRAK_KONWERSJI_JEDNOSTEK";

export type IkBomGapJob = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  lp: string;
  workId: string;
  unit: string;
  quantity: number;
  description: string;
  gapCode: IkBomGapCode | string;
};

export type IkBomEvidence = {
  sourceKind:
    | "TECHNOLOGY_PACK_ACTIVE"
    | "TECHNOLOGY_PACK_APPROVED"
    | "TECHNOLOGY_PACK_REVIEW"
    | "OWNER_APPROVED_HISTORICAL"
    | "NORM_STRUCTURED";
  sourceRef: string;
  excerpt?: string;
  retrievedAt: string;
};

export type IkBomResearchCandidate = {
  schemaVersion: typeof IK_BOM_RESEARCH_SCHEMA_VERSION;
  workId: string;
  packDraft: {
    packId: string;
    packVersion: string;
    namePl: string;
    materials: PackMaterialRecipeLine[];
    /** Minimal step binding for run-scoped ACTIVE pack. */
    catalogWorkId: string;
    definitionId: string;
    packCapabilities: string[];
  };
  lifecycleHint: "CANDIDATE";
  confidence: number;
  evidence: IkBomEvidence[];
  resolverId: typeof IK_BOM_RESEARCH_RESOLVER_ID;
  validation: { ok: boolean; rejects: string[] };
  dwellingId: string;
  lineId: string;
  invent: false;
  writeClass: "EPHEMERAL";
};

export type IkEphemeralBomBasis = {
  type: "EPHEMERAL_BOM";
  candidateId: string;
  workId: string;
  dwellingId: string;
  lineId: string;
  materials: PackMaterialRecipeLine[];
  packId: string;
  packVersion: string;
  namePl: string;
  definitionId: string;
  packCapabilities: string[];
  attestation: {
    resolverId: typeof IK_BOM_RESEARCH_RESOLVER_ID;
    confidence: number;
    threshold: number;
    evidence: IkBomEvidence[];
    builtAt: string;
    reasonPl: string;
  };
  invent: false;
};

export type RunIkBomGapResearchResult =
  | {
      status: "ACTIVE_OK";
      pack: TechnologyPack;
      messagePl: string;
    }
  | {
      status: "CANDIDATE";
      candidate: IkBomResearchCandidate;
      ephemeral: IkEphemeralBomBasis;
      messagePl: string;
    }
  | {
      status: "HOLD";
      reason:
        | "NO_DWELLING"
        | "NO_WORK_ID"
        | "AMBIGUOUS"
        | "NO_EVIDENCE"
        | "VALIDATION_FAIL"
        | "CONFIDENCE"
        | "UNKNOWN_MATERIAL_KEY"
        | "INVENT_FORBIDDEN"
        | "CROSS_DWELLING_FORBIDDEN";
      rejects: string[];
      messagePl: string;
      candidatesConsidered: number;
    }
  | {
      status: "REJECT";
      reason: string;
      rejects: string[];
      messagePl: string;
    };

export type IkBomGapResearchPorts = {
  /** Extra packs (tests / historical Owner) — not persisted. */
  extraPacks?: readonly TechnologyPack[] | null;
  /**
   * Hard-proven norm BOM for exact workId. Must include materialKey+unit+qtyFactor+provenance.
   * Returning invented keys is forbidden — validation rejects unknown materialKeys.
   */
  lookupNormBom?: ((workId: string) => TechnologyPack | null) | null;
  /** Known material keys (catalog / demand). Empty → only keys already on candidate packs pass if allowPackNativeKeys. */
  knownMaterialKeys?: ReadonlySet<string> | readonly string[] | null;
  /**
   * When true (default), materialKeys present on APPROVED/REVIEW/ACTIVE pack recipes
   * are treated as known (pack already curated). Unknown keys from norm port still checked.
   */
  allowPackNativeKeys?: boolean;
  confidenceThreshold?: number;
  nowMs?: number;
};

function lifecycleRank(lc: TechnologyPackLifecycle): number {
  switch (lc) {
    case "ACTIVE":
      return 4;
    case "APPROVED":
      return 3;
    case "REVIEW":
      return 2;
    default:
      return 0;
  }
}

function packsForExactWorkId(
  workId: string,
  packs: readonly TechnologyPack[],
  lifecycles: ReadonlySet<TechnologyPackLifecycle>,
): TechnologyPack[] {
  const id = String(workId ?? "").trim();
  if (!id) return [];
  return packs
    .filter((p) => lifecycles.has(p.lifecycle))
    .filter((p) => p.steps.some((s) => s.catalogWorkId === id))
    .sort((a, b) => {
      const lr = lifecycleRank(b.lifecycle) - lifecycleRank(a.lifecycle);
      if (lr !== 0) return lr;
      return `${a.packId}@${a.packVersion}`.localeCompare(`${b.packId}@${b.packVersion}`);
    });
}

function knownKeySet(
  known: IkBomGapResearchPorts["knownMaterialKeys"],
): Set<string> {
  if (!known) return new Set();
  if (known instanceof Set) return new Set([...known].map((k) => String(k).trim()).filter(Boolean));
  return new Set([...known].map((k) => String(k).trim()).filter(Boolean));
}

export function validateBomCandidateMaterials(
  materials: readonly PackMaterialRecipeLine[],
  opts: {
    knownMaterialKeys: ReadonlySet<string>;
    allowPackNativeKeys: boolean;
    packNativeKeys?: ReadonlySet<string>;
  },
): { ok: boolean; rejects: string[] } {
  const rejects: string[] = [];
  for (const line of materials) {
    const err = validateRecipeLine(line);
    if (err) rejects.push(err);
    const mk = String(line.materialKey ?? "").trim();
    if (!mk) continue;
    const packOk = opts.allowPackNativeKeys && opts.packNativeKeys?.has(mk);
    const knownOk = opts.knownMaterialKeys.has(mk);
    if (!packOk && !knownOk) {
      rejects.push(`UNKNOWN_MATERIAL_KEY:${mk}`);
    }
    const kind = line.factorSourceKind;
    if (kind === "owner_approved" || kind === "norm_ref") {
      if (!String(line.factorSourceRef ?? "").trim()) {
        rejects.push(`MISSING_PROVENANCE_REF:${mk}`);
      }
    }
  }
  if (materials.length === 0) {
    rejects.push("EMPTY_MATERIALS");
  }
  return { ok: rejects.length === 0, rejects };
}

function packNativeMaterialKeys(pack: TechnologyPack): Set<string> {
  return new Set(
    pack.materials.map((m) => String(m.materialKey ?? "").trim()).filter(Boolean),
  );
}

function confidenceForLifecycle(lc: TechnologyPackLifecycle): number {
  if (lc === "ACTIVE") return 1;
  if (lc === "APPROVED") return 0.95;
  if (lc === "REVIEW") return 0.88;
  return 0;
}

function candidateFromPack(
  job: IkBomGapJob,
  pack: TechnologyPack,
  evidence: IkBomEvidence[],
  confidence: number,
  threshold: number,
  validation: { ok: boolean; rejects: string[] },
  nowIso: string,
): { candidate: IkBomResearchCandidate; ephemeral: IkEphemeralBomBasis } {
  const candidateId = `bomcand:${job.dwellingId}:${job.lineId}:${pack.packId}@${pack.packVersion}`;
  const candidate: IkBomResearchCandidate = {
    schemaVersion: IK_BOM_RESEARCH_SCHEMA_VERSION,
    workId: job.workId,
    packDraft: {
      packId: pack.packId,
      packVersion: pack.packVersion,
      namePl: pack.namePl,
      materials: pack.materials.map((m) => ({ ...m })),
      catalogWorkId: job.workId,
      definitionId: pack.definitionId,
      packCapabilities: [...pack.packCapabilities],
    },
    lifecycleHint: "CANDIDATE",
    confidence,
    evidence,
    resolverId: IK_BOM_RESEARCH_RESOLVER_ID,
    validation,
    dwellingId: job.dwellingId,
    lineId: job.lineId,
    invent: false,
    writeClass: "EPHEMERAL",
  };
  const ephemeral: IkEphemeralBomBasis = {
    type: "EPHEMERAL_BOM",
    candidateId,
    workId: job.workId,
    dwellingId: job.dwellingId,
    lineId: job.lineId,
    materials: pack.materials.map((m) => ({ ...m })),
    packId: pack.packId,
    packVersion: pack.packVersion,
    namePl: pack.namePl,
    definitionId: pack.definitionId,
    packCapabilities: [...pack.packCapabilities],
    attestation: {
      resolverId: IK_BOM_RESEARCH_RESOLVER_ID,
      confidence,
      threshold,
      evidence,
      builtAt: nowIso,
      reasonPl: `BOM candidate z ${pack.lifecycle} pack ${pack.packId}@${pack.packVersion}`,
    },
    invent: false,
  };
  return { candidate, ephemeral };
}

/**
 * Convert validated ephemeral BOM basis → run-scoped ACTIVE TechnologyPack
 * (in-memory only — never registerPack).
 */
export function ephemeralBomBasisToRunScopedPack(
  basis: IkEphemeralBomBasis,
): TechnologyPack {
  return {
    packId: `ephemeral.${basis.packId}`,
    packVersion: `run-${basis.packVersion}`,
    definitionId: basis.definitionId || "def.ephemeral.bom",
    packCapabilities:
      basis.packCapabilities.length > 0
        ? [...basis.packCapabilities]
        : ["cap.ephemeral_bom"],
    lifecycle: "ACTIVE",
    namePl: basis.namePl || `Ephemeral BOM ${basis.workId}`,
    stages: [{ stageId: "stage.ephemeral", order: 1, namePl: "Ephemeral" }],
    steps: [
      {
        stepId: "step.ephemeral",
        stageId: "stage.ephemeral",
        order: 1,
        namePl: "Ephemeral work step",
        catalogWorkId: basis.workId,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: basis.materials.map((m) => ({ ...m })),
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

export function mergeEphemeralBomPacksIntoRunPacks(
  basePacks: readonly TechnologyPack[],
  bases:
    | ReadonlyMap<string, IkEphemeralBomBasis>
    | Readonly<Record<string, IkEphemeralBomBasis>>
    | readonly IkEphemeralBomBasis[]
    | null
    | undefined,
): TechnologyPack[] {
  const out = [...basePacks];
  if (!bases) return out;
  const list: IkEphemeralBomBasis[] = Array.isArray(bases)
    ? [...bases]
    : bases instanceof Map
      ? [...bases.values()]
      : Object.values(bases);
  const seenWork = new Set<string>();
  for (const b of list) {
    if (!b || b.type !== "EPHEMERAL_BOM") continue;
    if (b.invent !== false) continue;
    const wid = String(b.workId ?? "").trim();
    if (!wid || seenWork.has(wid)) continue;
    seenWork.add(wid);
    out.push(ephemeralBomBasisToRunScopedPack(b));
  }
  return out;
}

/**
 * Research BOM for a single gap job. Never invents; never LABOR_ONLY.
 */
export function runIkBomGapResearch(
  job: IkBomGapJob,
  ports: IkBomGapResearchPorts = {},
): RunIkBomGapResearchResult {
  const dwellingId = String(job.dwellingId ?? "").trim();
  const workId = String(job.workId ?? "").trim();
  const lineId = String(job.lineId ?? "").trim();
  const threshold = ports.confidenceThreshold ?? DEFAULT_BOM_CONFIDENCE_THRESHOLD;
  const nowMs = ports.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const known = knownKeySet(ports.knownMaterialKeys);
  const allowPackNative = ports.allowPackNativeKeys !== false;

  if (!dwellingId) {
    return {
      status: "HOLD",
      reason: "NO_DWELLING",
      rejects: ["MISSING_DWELLING_ID"],
      messagePl: "Brak dwellingId — HOLD (MULTI_DWELLING).",
      candidatesConsidered: 0,
    };
  }
  if (!workId) {
    return {
      status: "HOLD",
      reason: "NO_WORK_ID",
      rejects: ["MISSING_WORK_ID"],
      messagePl: "Brak workId — HOLD.",
      candidatesConsidered: 0,
    };
  }
  if (!lineId) {
    return {
      status: "HOLD",
      reason: "NO_EVIDENCE",
      rejects: ["MISSING_LINE_ID"],
      messagePl: "Brak lineId — HOLD.",
      candidatesConsidered: 0,
    };
  }

  const allPacks = [
    ...listAllPacks(),
    ...(ports.extraPacks ?? []),
  ];

  // 1) ACTIVE
  const active = packsForExactWorkId(workId, allPacks, new Set(["ACTIVE"]));
  if (active.length === 1) {
    return {
      status: "ACTIVE_OK",
      pack: active[0]!,
      messagePl: "ACTIVE TechnologyPack już istnieje dla workId.",
    };
  }
  if (active.length > 1) {
    return {
      status: "HOLD",
      reason: "AMBIGUOUS",
      rejects: ["AMBIGUOUS_ACTIVE_PACKS"],
      messagePl: "Wiele ACTIVE packów dla workId — HOLD.",
      candidatesConsidered: active.length,
    };
  }

  // 2) APPROVED / REVIEW
  const approvedReview = packsForExactWorkId(
    workId,
    allPacks,
    new Set(["APPROVED", "REVIEW"]),
  );

  // 3) Historical port packs already in extraPacks with owner_approved factors
  // 4) Norm port
  const normPack = ports.lookupNormBom?.(workId) ?? null;
  const pool: TechnologyPack[] = [...approvedReview];
  if (normPack) {
    const binds = normPack.steps.some((s) => s.catalogWorkId === workId);
    if (binds) pool.push(normPack);
  }

  if (pool.length === 0) {
    return {
      status: "HOLD",
      reason: "NO_EVIDENCE",
      rejects: ["NO_PACK_OR_NORM"],
      messagePl: "Brak APPROVED/REVIEW/norm BOM evidence — HOLD (bez invent).",
      candidatesConsidered: 0,
    };
  }

  if (pool.length > 1) {
    // Dominant: highest lifecycle rank + single packId family
    const topRank = lifecycleRank(pool[0]!.lifecycle);
    const tops = pool.filter((p) => lifecycleRank(p.lifecycle) === topRank);
    if (tops.length !== 1) {
      return {
        status: "HOLD",
        reason: "AMBIGUOUS",
        rejects: ["AMBIGUOUS_CANDIDATE_PACKS"],
        messagePl: "Wiele równorzędnych BOM candidates — HOLD (bez auto-pick).",
        candidatesConsidered: pool.length,
      };
    }
    pool.length = 0;
    pool.push(tops[0]!);
  }

  const pack = pool[0]!;
  const confidence = confidenceForLifecycle(pack.lifecycle)
    || (normPack === pack ? 0.9 : 0);
  if (confidence < threshold) {
    return {
      status: "HOLD",
      reason: "CONFIDENCE",
      rejects: [`CONFIDENCE:${confidence}<${threshold}`],
      messagePl: "Confidence poniżej progu — HOLD.",
      candidatesConsidered: 1,
    };
  }

  const nativeKeys = packNativeMaterialKeys(pack);
  const validation = validateBomCandidateMaterials(pack.materials, {
    knownMaterialKeys: known,
    allowPackNativeKeys: allowPackNative,
    packNativeKeys: nativeKeys,
  });
  if (!validation.ok) {
    const unknown = validation.rejects.some((r) => r.startsWith("UNKNOWN_MATERIAL_KEY"));
    return {
      status: "HOLD",
      reason: unknown ? "UNKNOWN_MATERIAL_KEY" : "VALIDATION_FAIL",
      rejects: validation.rejects,
      messagePl: "Walidacja BOM candidate FAIL — HOLD.",
      candidatesConsidered: 1,
    };
  }

  const sourceKind: IkBomEvidence["sourceKind"] =
    pack.lifecycle === "APPROVED"
      ? "TECHNOLOGY_PACK_APPROVED"
      : pack.lifecycle === "REVIEW"
        ? "TECHNOLOGY_PACK_REVIEW"
        : normPack === pack
          ? "NORM_STRUCTURED"
          : "OWNER_APPROVED_HISTORICAL";

  const evidence: IkBomEvidence[] = [
    {
      sourceKind,
      sourceRef: `TechnologyPack=${pack.packId}@${pack.packVersion}|lifecycle=${pack.lifecycle}`,
      excerpt: pack.namePl,
      retrievedAt: nowIso,
    },
  ];

  const { candidate, ephemeral } = candidateFromPack(
    job,
    pack,
    evidence,
    confidence,
    threshold,
    validation,
    nowIso,
  );

  if (candidate.workId !== workId || ephemeral.workId !== workId) {
    return {
      status: "REJECT",
      reason: "WORK_ID_MISMATCH",
      rejects: ["WORK_ID_MISMATCH"],
      messagePl: "Candidate workId ≠ line workId.",
    };
  }
  if (candidate.dwellingId !== dwellingId || candidate.lineId !== lineId) {
    return {
      status: "HOLD",
      reason: "CROSS_DWELLING_FORBIDDEN",
      rejects: ["SCOPE_MISMATCH"],
      messagePl: "Scope dwelling/line mismatch — HOLD.",
      candidatesConsidered: 1,
    };
  }
  if (candidate.invent !== false || ephemeral.invent !== false) {
    return {
      status: "HOLD",
      reason: "INVENT_FORBIDDEN",
      rejects: ["INVENT_FLAG"],
      messagePl: "Invent flag — HARD HOLD.",
      candidatesConsidered: 1,
    };
  }

  return {
    status: "CANDIDATE",
    candidate,
    ephemeral,
    messagePl: ephemeral.attestation.reasonPl,
  };
}
