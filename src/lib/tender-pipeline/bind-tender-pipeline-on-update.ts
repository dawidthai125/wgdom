/**
 * WGDOM-HARDENING-01A — SSOT adapter: pipeline.updateItem → onUpdate(patch, opts?).
 * Forwards TenderItemUpdateOpts arity (H2). Zero persist business logic.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type {
  TenderItemOnUpdate,
  TenderItemUpdateOpts,
} from "@/lib/tender-pipeline/tender-item-persist";

export function bindTenderPipelineOnUpdate(
  updateItem: (
    id: string,
    patch: Partial<TenderPipelineItem>,
    opts?: TenderItemUpdateOpts,
  ) => void,
  itemId: string,
): TenderItemOnUpdate {
  return (patch, opts) => updateItem(itemId, patch, opts);
}
