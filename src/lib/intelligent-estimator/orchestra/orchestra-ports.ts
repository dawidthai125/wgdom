/**
 * W1 Orchestra — explicit port contracts (DF §8).
 * Ref bundles used by runtime; no new abstraction layer beyond extraction.
 */

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import type { IkNg02IngestBridgeResult } from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import type { KnrKnowledgeEnvelope } from "@/lib/intelligent-estimator/knr-knowledge";

/** P2 generation / isStale / releaseBridgeBusy — ik-entry-p2-ingest-latch.ts (READ-ONLY). */
export type P2IngestPort = {
  p2RunGenerationRef: MutableRefObject<number>;
  p2BusyOwnerGenRef: MutableRefObject<number | null>;
  p2InFlightFingerprintRef: MutableRefObject<string | null>;
  setIngest: (value: IkNg02IngestBridgeResult | null) => void;
  setBridgeBusy: (value: boolean) => void;
};

/** Stable refs for parent patch — HB1. */
export type ParentBridgePort = {
  onUpdateRef: MutableRefObject<
    ((patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void) | undefined
  >;
  itemRef: MutableRefObject<TenderPipelineItem>;
  athPreviewEnabledRef: MutableRefObject<boolean>;
};

/** IC-SEQ-2 labor settle gate before P6. */
export type P5SettlePort = {
  laborSettledRef: MutableRefObject<boolean>;
  setLaborSettleTick: Dispatch<SetStateAction<number>>;
};

/** Once-per-key dedupe for P5/P6. */
export type OncePerKeyPort = {
  laborAttemptedRef: MutableRefObject<string | null>;
  materialAttemptedRef: MutableRefObject<string | null>;
};

/** KL-3 lookup-only side-channel. */
export type KnrKnowledgePort = {
  knowledgeAttemptedRef: MutableRefObject<string | null>;
  setKnrKnowledge: (value: KnrKnowledgeEnvelope | null) => void;
  setKnowledgeBusy: (value: boolean) => void;
};

/** ingest?.mergedItem ?? item */
export type IngestMergePort = {
  item: TenderPipelineItem;
  ingest: IkNg02IngestBridgeResult | null;
};

export function resolveEffectiveItem(port: IngestMergePort): TenderPipelineItem {
  return port.ingest?.mergedItem ?? port.item;
}

/** chiefSession → P8 read-only advisory. */
export type ChiefAdvisoryPort = {
  chiefSession: ChiefSessionOutput | null;
};

/** pipelineIngest wait 1500ms + dossier refs — HB2. */
export type PipelineWaitPort = {
  hasPipelineIngest: boolean;
  dossierBuildingRef: MutableRefObject<boolean>;
  dossierEnrichingRef: MutableRefObject<boolean>;
};
