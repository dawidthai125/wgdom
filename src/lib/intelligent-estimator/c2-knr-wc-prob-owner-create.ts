/**
 * C2 MOPS — dedicated KNNR 1305-01/02 prob CatalogWork (Owner batch M3).
 *
 * SSOT for workIds · names · P3 CREATE gate · deterministic harness bootstrap.
 * ZERO OUR RATE · ZERO companyPrice seed · ZERO KV write from this module alone.
 */

import type { AppSettings } from "@/lib/app-settings";
import {
  assertKnrWcCreateAllowed,
  type KnrWcCreateExecuteInput,
  type KnrWcCreateExecuteResult,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-create";
import { buildKnrWcIdentityProposals } from "@/lib/intelligent-estimator/knr-wc-identity-bridge";
import type { KnrWcIdentityProposal } from "@/lib/intelligent-estimator/knr-wc-identity-bridge-types";
import {
  catalogWorkExistsInStore,
  insertWorkBothRegions,
} from "@/lib/work-catalog/work-catalog-insert";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { withFreshnessStatus } from "@/lib/work-catalog/freshness";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";

export const C2_KNR_WC_1305_01_WORK_ID = "knnr-wc-knnr-5-1305-01-prob" as const;
export const C2_KNR_WC_1305_02_WORK_ID = "knnr-wc-knnr-5-1305-02-prob" as const;

export const C2_KNR_WC_PROB_WORK_IDS = new Set<string>([
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
]);

export const C2_KNR_WC_NORMALIZED_KEY_1305_01 = "KNNR|5|1305-01" as const;
export const C2_KNR_WC_NORMALIZED_KEY_1305_02 = "KNNR|5|1305-02" as const;

export type C2KnrWcProbTableCode = "1305-01" | "1305-02";

const C2_TABLE_META: Record<
  C2KnrWcProbTableCode,
  {
    workId: string;
    normalizedKey: string;
    attemptSemantics: "first_probe" | "next_probe";
    namePl: string;
  }
> = {
  "1305-01": {
    workId: C2_KNR_WC_1305_01_WORK_ID,
    normalizedKey: C2_KNR_WC_NORMALIZED_KEY_1305_01,
    attemptSemantics: "first_probe",
    namePl:
      "Sprawdzenie samoczynnego wyłączania zasilania — pierwsza próba (KNNR 5·1305-01)",
  },
  "1305-02": {
    workId: C2_KNR_WC_1305_02_WORK_ID,
    normalizedKey: C2_KNR_WC_NORMALIZED_KEY_1305_02,
    attemptSemantics: "next_probe",
    namePl:
      "Sprawdzenie samoczynnego wyłączania zasilania — następna próba (KNNR 5·1305-02)",
  },
};

/** Deterministic C2 lineId → tableCode (MOPS OPS-SMOKE-09). */
export const C2_MOPS_LINE_TABLE_CODE: Readonly<Record<string, C2KnrWcProbTableCode>> =
  Object.freeze({
    obl_443daba: "1305-01",
    obl_98c5edeb: "1305-01",
    obl_255b64ed: "1305-02",
    obl_9cfa9270: "1305-02",
    obl_8c5285d0: "1305-01",
    obl_1816d62a: "1305-02",
  });

export function isC2KnrWcProbWorkId(workId: string | null | undefined): boolean {
  const id = String(workId ?? "").trim();
  return id.length > 0 && C2_KNR_WC_PROB_WORK_IDS.has(id);
}

export function c2KnrWcProbTableCodeForWorkId(
  workId: string | null | undefined,
): C2KnrWcProbTableCode | null {
  const id = String(workId ?? "").trim();
  if (id === C2_KNR_WC_1305_01_WORK_ID) return "1305-01";
  if (id === C2_KNR_WC_1305_02_WORK_ID) return "1305-02";
  return null;
}

export function buildC2KnrWcProbCatalogWork(
  tableCode: C2KnrWcProbTableCode,
  nowIso: string,
): CatalogWork {
  const meta = C2_TABLE_META[tableCode];
  const work: CatalogWork = {
    id: meta.workId,
    tradeId: "ELEKTRYKA",
    namePl: meta.namePl,
    unit: "prob",
    companyPricePln: 0,
    legacyCategoryId: "ELEKTRYKA",
    commercialPricing: {
      marginPct: 0,
      updatedAt: nowIso,
      source: "owner",
    },
    updatedAt: nowIso,
    freshnessStatus: "missing",
    descriptionPl: meta.namePl,
    keywords: meta.namePl
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 8),
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0, laborRatio: 1 },
  };
  return withFreshnessStatus(work, Date.parse(nowIso));
}

export function buildC2KnrWcProbProposal(
  tableCode: C2KnrWcProbTableCode,
  tenderId = "mops-c2-batch",
): KnrWcIdentityProposal {
  const meta = C2_TABLE_META[tableCode];
  const batch = buildKnrWcIdentityProposals({
    tenderId,
    keys: [
      {
        normalizedKey: meta.normalizedKey,
        family: "KNNR",
        catalogId: "5",
        tableCode,
        unitRaw: "prob",
        descriptionPl: meta.namePl,
        officialNamePl: meta.namePl,
      },
    ],
    featureEnabled: true,
  });
  const proposal = batch.proposals[0];
  if (!proposal) {
    throw new Error(`C2 proposal missing for ${tableCode}`);
  }
  return {
    ...proposal,
    proposedTradeId: "ELEKTRYKA",
    officialNamePl: meta.namePl,
    descriptionPl: meta.namePl,
  };
}

export type C2KnrWcProbOwnerCreateInput = Omit<
  KnrWcCreateExecuteInput,
  "proposal" | "ownerDecision" | "workId"
> & {
  tableCode: C2KnrWcProbTableCode;
  tenderId?: string;
};

/**
 * Owner M3 CREATE — P3 gate + Owner-specified CatalogWork draft (no price / OUR RATE).
 */
export async function executeC2KnrWcProbOwnerCreate(
  input: C2KnrWcProbOwnerCreateInput,
): Promise<KnrWcCreateExecuteResult> {
  const meta = C2_TABLE_META[input.tableCode];
  const proposal = buildC2KnrWcProbProposal(input.tableCode, input.tenderId);
  const nowIso = input.nowIso ?? new Date().toISOString();

  const gate = assertKnrWcCreateAllowed({
    ...input,
    proposal,
    ownerDecision: "CREATE_NEW",
    workId: meta.workId,
  });
  if (!gate.ok) {
    return { ok: false, reason: gate.reason, message: gate.message };
  }

  const draft = buildC2KnrWcProbCatalogWork(input.tableCode, nowIso);
  let nextStore: WorkCatalogStore;
  try {
    nextStore = insertWorkBothRegions(input.store, draft, nowIso);
  } catch (err) {
    return {
      ok: false,
      reason: "persist_error",
      message: err instanceof Error ? err.message : "insert failed",
    };
  }

  console.info("KNR_WC_CREATE", {
    normalizedKey: meta.normalizedKey,
    workId: meta.workId,
    tenderId: proposal.tenderId,
    batch: "C2-M3",
  });

  const saveResult = await saveWorkCatalogRouted(
    nextStore,
    { previousStore: input.store, updatedAtIso: nowIso },
    input.settings,
  );

  if (!saveResult.ok) {
    return {
      ok: false,
      reason: "persist_error",
      message: String(saveResult.error),
    };
  }

  if (!saveResult.saved) {
    return {
      ok: true,
      saved: false,
      blocked: saveResult.blocked,
      workId: meta.workId,
    };
  }

  return {
    ok: true,
    saved: true,
    workId: meta.workId,
    catalogWorksCreated: 1,
  };
}

/** Harness helper — both C2 works via P3 Owner CREATE (idempotent when workId exists). */
export async function ensureC2KnrWcProbOwnerCatalogWorks(
  store: WorkCatalogStore,
  options: {
    settings?: AppSettings;
    nowIso?: string;
    runtimeP3Enabled?: boolean;
    tenderId?: string;
  } = {},
): Promise<{ store: WorkCatalogStore; created: string[] }> {
  const created: string[] = [];
  let current = store;

  for (const tableCode of ["1305-01", "1305-02"] as const) {
    const meta = C2_TABLE_META[tableCode];
    if (catalogWorkExistsInStore(current, meta.workId)) continue;

    const result = await executeC2KnrWcProbOwnerCreate({
      tableCode,
      store: current,
      settings: options.settings,
      nowIso: options.nowIso,
      runtimeP3Enabled: options.runtimeP3Enabled ?? true,
      tenderId: options.tenderId,
    });
    if (!result.ok) {
      throw new Error(`C2 CREATE failed ${tableCode}: ${result.message}`);
    }
    if (!result.saved) {
      throw new Error(`C2 CREATE blocked ${tableCode}: ${result.blocked}`);
    }
    created.push(meta.workId);
    current = loadWorkCatalogStoreLocal();
  }

  return { store: current, created };
}
