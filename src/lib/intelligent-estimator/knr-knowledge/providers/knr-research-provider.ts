/**
 * IK-KNR KL-0 — KnrResearchProvider interface (no HTTP · ordered L1→L5).
 */

import type { KnrSourceProvider } from "./knr-source-provider";
import {
  stubKnrResearchResult,
  type KnrResearchRequest,
  type KnrResearchResult,
} from "../knr-research-types";

export interface KnrResearchProvider {
  readonly providers: readonly KnrSourceProvider[];
  execute(request: KnrResearchRequest): Promise<KnrResearchResult>;
}

/** KL-0 contract-only research provider — never performs HTTP. */
export class KnrKl0StubResearchProvider implements KnrResearchProvider {
  readonly providers: readonly KnrSourceProvider[] = [];

  async execute(request: KnrResearchRequest): Promise<KnrResearchResult> {
    return stubKnrResearchResult(request, new Date().toISOString());
  }
}
