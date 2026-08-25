import { useEffect, useLayoutEffect, useRef } from "react";
import { useIkOrchestra } from "@/lib/intelligent-estimator/orchestra";
import type {
  IkOrchestraHostInput,
  IkOrchestraSnapshot,
} from "@/lib/intelligent-estimator/orchestra/orchestra-types";

/**
 * W6 — Page-level IK orchestra bridge (always mounted when ikEntryOn).
 * Keeps P7 bid snapshot available on all V4 tabs without duplicating useIkOrchestra in IkEntryHost.
 *
 * Snapshot publish is referentially gated: useIkOrchestra must return a stable object
 * when contents are unchanged (see useMemo on hook return). Publishing a fresh object
 * every render caused TenderDetailPage setState loops → bid-prep TRACE spam (~240/s).
 */
export function IkOrchestraPageBridge({
  onSnapshot,
  ...input
}: IkOrchestraHostInput & {
  onSnapshot: (snapshot: IkOrchestraSnapshot) => void;
}) {
  const orchestra = useIkOrchestra(input);
  const tenderKey = input.item?.id ?? input.item?.tenderId ?? "";
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const publishedRef = useRef<IkOrchestraSnapshot | null>(null);

  // Allow one publish per tender after TenderDetailPage layout reset (same stable orchestra ref).
  useLayoutEffect(() => {
    publishedRef.current = null;
  }, [tenderKey]);

  useEffect(() => {
    if (publishedRef.current === orchestra) return;
    publishedRef.current = orchestra;
    onSnapshotRef.current(orchestra);
  }, [orchestra]);

  return null;
}
