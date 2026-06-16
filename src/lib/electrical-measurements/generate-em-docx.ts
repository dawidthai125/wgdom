/**
 * EM-P1 — generator DOCX protokołów pomiarowych.
 * TODO EM-P1: implementacja — NIE w EM-P0.
 */

import type { Job } from "@/app/app-domain";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";

export type EmDocxDocumentKind =
  | "protokol"
  | "dane-informacyjne"
  | "badanie-adsc"
  | "badanie-rezystancji"
  | "parametry-rcd";

export interface EmDocxGeneratorInput {
  measurement: ElectricalMeasurement;
  job: Pick<Job, "id" | "address" | "flatNumber">;
}

export interface EmDocxGeneratorOptions {
  /** EM-P0.5: domyślne wartości z ustawień firmy. */
  defaults?: {
    technicianName?: string;
    meterModel?: string;
    meterSerialNumber?: string;
  };
}

// TODO EM-P1: generateEmDocxBytes(kind, input, options?): Promise<Uint8Array>
// TODO EM-P1: downloadEmDocxDocument(kind, input, options?): Promise<void>
// TODO EM-P1: downloadEmDocxPack(input, options?): Promise<void>

export function emDocxDocumentKindLabel(kind: EmDocxDocumentKind): string {
  const labels: Record<EmDocxDocumentKind, string> = {
    protokol: "Protokół z pomiarów ochronnych",
    "dane-informacyjne": "Dane informacyjne",
    "badanie-adsc": "Badanie ochrony przed porażeniem",
    "badanie-rezystancji": "Badanie rezystancji obwodów",
    "parametry-rcd": "Parametry zabezpieczeń różnicowo-prądowych",
  };
  return labels[kind];
}
