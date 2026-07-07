export type TenderParserLoadingStep = "fetch" | "attachments" | "analysis";

const STEPS: { id: TenderParserLoadingStep; label: string }[] = [
  { id: "fetch", label: "Pobieranie" },
  { id: "attachments", label: "Załączniki" },
  { id: "analysis", label: "Analiza" },
];

export function resolveTenderParserLoadingStep(opts: {
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  hasNoticeHtml?: boolean;
  attachmentCount?: number;
}): TenderParserLoadingStep | null {
  const active = opts.autoRunning
    || opts.dossierBuilding
    || opts.dossierSaving
    || opts.analyzing;
  if (!active) return null;

  if (opts.dossierBuilding || opts.dossierSaving || opts.analyzing) {
    return "analysis";
  }

  if ((opts.attachmentCount ?? 0) > 0 || opts.hasNoticeHtml) {
    return "attachments";
  }

  return "fetch";
}

export function tenderParserSteppedLabelText(step: TenderParserLoadingStep): string {
  const idx = STEPS.findIndex((s) => s.id === step);
  return STEPS.map((s, i) => {
    if (i < idx) return s.label;
    if (i === idx) return s.label;
    return s.label;
  }).join(" → ");
}

export function tenderParserLoadingSteps(): readonly { id: TenderParserLoadingStep; label: string }[] {
  return STEPS;
}
