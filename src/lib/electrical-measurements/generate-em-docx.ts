import { saveAs } from "file-saver";
import type { Job } from "@/app/app-domain";
import {
  buildElectricalMeasurementDocxPayload,
  rowSpecsForKind,
  type EmDocxGeneratorOptions,
  type EmDocxPayloadInternal,
} from "@/lib/electrical-measurements/em-docx-payload";
import {
  generateEmDocxFromTemplateBytes,
  validateEmDocxBytes,
} from "@/lib/electrical-measurements/em-docx-xml";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import { measurementDocxFileNameForMeasurement } from "@/lib/electrical-measurements/measurement-docx-names";

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

export type { EmDocxGeneratorOptions } from "@/lib/electrical-measurements/em-docx-payload";

const TEMPLATE_FILES: Record<EmDocxDocumentKind, string> = {
  protokol: "protokol.template.docx",
  "dane-informacyjne": "dane-informacyjne.template.docx",
  "badanie-adsc": "badanie-adsc.template.docx",
  "badanie-rezystancji": "badanie-rezystancji.template.docx",
  "parametry-rcd": "parametry-rcd.template.docx",
};

const templateBytesCache = new Map<string, Uint8Array>();

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

function emDocxOutputFileName(kind: EmDocxDocumentKind, measurement: Pick<ElectricalMeasurement, "reportNumber" | "flags">): string {
  return measurementDocxFileNameForMeasurement(measurement, kind);
}

export function emDocxTemplateUrl(kind: EmDocxDocumentKind): string {
  return `/em-measurements/${TEMPLATE_FILES[kind]}`;
}

export async function fetchEmDocxTemplateBytes(kind: EmDocxDocumentKind): Promise<Uint8Array> {
  const file = TEMPLATE_FILES[kind];
  const cached = templateBytesCache.get(file);
  if (cached) return cached;
  const res = await fetch(emDocxTemplateUrl(kind));
  if (!res.ok) {
    throw new Error(`Nie można wczytać szablonu EM: ${file} (${res.status})`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  templateBytesCache.set(file, buf);
  return buf;
}

/** Testy Node — wczytaj szablon z dysku (tylko scripts/). */
export async function loadEmDocxTemplateBytesFromFs(
  kind: EmDocxDocumentKind,
  publicDir: string,
): Promise<Uint8Array> {
  const fs = await import("node:fs/promises");
  const pathMod = await import("node:path");
  const filePath = pathMod.join(publicDir, "em-measurements", TEMPLATE_FILES[kind]);
  const buf = await fs.readFile(filePath);
  return new Uint8Array(buf);
}

export { buildElectricalMeasurementDocxPayload } from "@/lib/electrical-measurements/em-docx-payload";

export async function generateEmDocxBytes(
  kind: EmDocxDocumentKind,
  input: EmDocxGeneratorInput,
  options?: EmDocxGeneratorOptions,
  templateLoader?: (k: EmDocxDocumentKind) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const load = templateLoader ?? fetchEmDocxTemplateBytes;
  const templateBytes = await load(kind);
  const payload = buildElectricalMeasurementDocxPayload(
    input.measurement,
    input.job,
    options,
  ) as EmDocxPayloadInternal;

  const rowSpecs =
    kind === "badanie-adsc" || kind === "badanie-rezystancji" || kind === "parametry-rcd"
      ? rowSpecsForKind(payload, kind)
      : [];

  const bytes = await generateEmDocxFromTemplateBytes(templateBytes, payload.scalars, rowSpecs);
  const validation = await validateEmDocxBytes(bytes);
  if (!validation.ok) {
    throw new Error(`DOCX EM walidacja XML nie powiodła się (${kind}): ${validation.issues.join("; ")}`);
  }
  return bytes;
}

export async function downloadEmDocxDocument(
  kind: EmDocxDocumentKind,
  input: EmDocxGeneratorInput,
  options?: EmDocxGeneratorOptions,
): Promise<void> {
  const bytes = await generateEmDocxBytes(kind, input, options);
  const name = emDocxOutputFileName(kind, input.measurement);
  saveAs(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), name);
}

export const EM_DOCX_DOCUMENT_KINDS: EmDocxDocumentKind[] = [
  "protokol",
  "dane-informacyjne",
  "parametry-rcd",
  "badanie-adsc",
  "badanie-rezystancji",
];
