/**
 * IK-KNR KL-0 — Norm payload content hash (REUSE pattern: global-knowledge/canonical-id).
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import type { KnrNormBundle } from "./knr-catalog-entry-types";

export function buildKnrNormContentHash(norms: KnrNormBundle): string {
  const payload = JSON.stringify({
    R: norms.laborNorms.map(stableNormLine),
    M: norms.materialNorms.map(stableNormLine),
    S: norms.equipmentNorms.map(stableNormLine),
  });
  return fnv1aHex(payload);
}

function stableNormLine(line: {
  kind: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  sourceRef?: string | null;
}) {
  return {
    kind: line.kind,
    code: line.code.trim(),
    description: line.description.trim(),
    unit: line.unit.trim(),
    quantity: line.quantity,
    sourceRef: line.sourceRef ?? null,
  };
}
