/**
 * WGDOM-HARDENING-01A — SSOT types for tender pipeline item persist modes.
 * Heavy / bootstrap / UI adapters import from here (C1-A: no lib→app).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export type TenderItemPersistMode = "local" | "cloud";

export type TenderItemUpdateOpts = {
  persist?: TenderItemPersistMode;
};

export type TenderItemOnUpdate = (
  patch: Partial<TenderPipelineItem>,
  opts?: TenderItemUpdateOpts,
) => void;
