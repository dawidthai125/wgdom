/**
 * PRICE-INTELLIGENCE-01 P3.1 — ensure approved seed in local stores (+ optional cloud push).
 */

import { pushKeysToCloud } from "@/lib/cloud-sync";
import {
  loadCompanyKnowledgeStoreLocal,
  saveCompanyKnowledgeStoreLocal,
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
} from "@/lib/tender-offer-boq-company-knowledge";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
} from "@/lib/work-catalog/work-catalog-store";
import { pushWorkCatalogStoreToCloudSafe } from "@/lib/work-catalog/work-catalog-cloud-push";
import {
  applyPi31ApprovedPurchaseToKnowledge,
  applyPi31ApprovedQuotesToWorkCatalog,
} from "./apply-etics-approved-seed";

export interface EnsurePi31Result {
  catalogChanged: boolean;
  knowledgeChanged: boolean;
  worksUpserted: number;
  knowledgeUpserted: number;
  catalogStore: ReturnType<typeof loadWorkCatalogStoreLocal>;
  knowledgeStore: ReturnType<typeof loadCompanyKnowledgeStoreLocal>;
}

/**
 * Idempotent: dopina brakujące WGDOM approved Quotes + Purchase knowledge.
 * Zapisuje LS; opcjonalnie push do cloud (DATA_KEYS).
 * Zwraca znormalizowane store'y (nawet gdy LS niedostępne — seed in-memory).
 */
export function ensurePi31EticsApprovedDataLocal(opts?: {
  pushCloud?: boolean;
}): EnsurePi31Result {
  const cat = applyPi31ApprovedQuotesToWorkCatalog(loadWorkCatalogStoreLocal());
  if (cat.changed) {
    saveWorkCatalogStoreLocal(cat.store);
  }

  const kn = applyPi31ApprovedPurchaseToKnowledge(loadCompanyKnowledgeStoreLocal());
  if (kn.changed) {
    saveCompanyKnowledgeStoreLocal(kn.store);
  }

  if (opts?.pushCloud && (cat.changed || kn.changed) && typeof window !== "undefined") {
    if (cat.changed) {
      void pushWorkCatalogStoreToCloudSafe(cat.store, { mode: "union" }).catch(() => {
        /* soft — mirror best-effort */
      });
    }
    if (kn.changed) {
      void pushKeysToCloud([OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY], [kn.store]).catch(() => {
        /* soft */
      });
    }
  }

  return {
    catalogChanged: cat.changed,
    knowledgeChanged: kn.changed,
    worksUpserted: cat.worksUpserted,
    knowledgeUpserted: kn.entriesUpserted,
    catalogStore: cat.store,
    knowledgeStore: kn.store,
  };
}
