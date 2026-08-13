/**
 * MULTI-BOQ-WORK-IDENTITY-01 — bridge structural OfferBoq → Product Mapper.
 *
 * REUSE `mapOfferBoqDocument` only · ZERO new matcher / engine / catalog.
 * Identity producer SSOT remains tender-offer-boq-mapping.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import {
  mapOfferBoqDocument,
  type OfferBoqMappingContext,
} from "@/lib/tender-offer-boq-mapping";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";

export type MapComposedDwellingOfferBoqInput = {
  document: OfferBoqDocument;
  /** Test / inject — default: active works from local Work Catalog store. */
  works?: CatalogWork[];
  mappedAt?: string;
  documentContext?: string | null;
  /** Default: AppSettings CM-01 flag (same as legacy explainability path). */
  cenyMaterialowUplift?: boolean;
};

/**
 * Apply existing Product Mapper to a Multi-BOQ composed (structural) OfferBoq.
 * Does not invent catalogWorkId — Mapper owns MATCHED / AMBIGUOUS / UNMATCHED.
 */
export function mapComposedDwellingOfferBoq(
  input: MapComposedDwellingOfferBoqInput,
): OfferBoqDocument {
  const doc = input.document;
  const store = loadWorkCatalogStoreLocal();
  const works =
    input.works ?? listActiveWorksForRegion(store, store.activeRegion);

  const ctx: OfferBoqMappingContext = {
    works,
    mappedAt: input.mappedAt,
    documentContext:
      input.documentContext ??
      doc.parserSnapshotRef?.sourceFilename ??
      null,
    cenyMaterialowUplift:
      input.cenyMaterialowUplift ?? isCenyMaterialow01Enabled(),
  };

  return mapOfferBoqDocument(doc, ctx);
}
