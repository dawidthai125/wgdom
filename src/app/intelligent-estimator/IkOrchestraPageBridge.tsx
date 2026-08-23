/**
 * W6 — Page-level IK orchestra bridge (always mounted when ikEntryOn).
 * Keeps P7 bid snapshot available on all V4 tabs without duplicating useIkOrchestra in IkEntryHost.
 */

import { useEffect } from "react";
import { useIkOrchestra } from "@/lib/intelligent-estimator/orchestra";
import type {
  IkOrchestraHostInput,
  IkOrchestraSnapshot,
} from "@/lib/intelligent-estimator/orchestra/orchestra-types";

export function IkOrchestraPageBridge({
  onSnapshot,
  ...input
}: IkOrchestraHostInput & {
  onSnapshot: (snapshot: IkOrchestraSnapshot) => void;
}) {
  const orchestra = useIkOrchestra(input);

  useEffect(() => {
    onSnapshot(orchestra);
  }, [orchestra, onSnapshot]);

  return null;
}
