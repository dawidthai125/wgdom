import type { NavigateFunction } from "react-router";
import {
  buildTenderDetailPath,
  type DecyzjaV4EmbedWorkspace,
  type TenderDetailV4TabId,
  TENDER_DETAIL_V4_DEFAULT_TAB,
} from "@/lib/tender-detail-routes-v4";

export type OpenTenderDetailV4Options = {
  decyzjaWorkspace?: DecyzjaV4EmbedWorkspace;
  replace?: boolean;
};

/** SSOT nawigacji do detalu V4 — wrap `buildTenderDetailPath` + `navigate` (TEUX-1). */
export function openTenderDetailV4(
  navigate: NavigateFunction,
  tenderId: string,
  tab: TenderDetailV4TabId = TENDER_DETAIL_V4_DEFAULT_TAB,
  opts?: OpenTenderDetailV4Options,
): void {
  const path = buildTenderDetailPath(
    tenderId,
    tab,
    opts?.decyzjaWorkspace ? { decyzjaWorkspace: opts.decyzjaWorkspace } : undefined,
  );
  navigate(path, opts?.replace ? { replace: true } : undefined);
}
