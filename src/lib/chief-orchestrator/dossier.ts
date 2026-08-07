/**
 * Chief Orchestrator — assemble dossier (agregat RO, bez narracji domenowej).
 */

import type {
  ChiefCaseStatus,
  ChiefDecydentDossier,
  ChiefExpertSnapshots,
  ChiefTaskRecord,
} from "./types";

export function assembleDecydentDossier(opts: {
  caseId: string;
  status: ChiefCaseStatus;
  createdAt: string;
  finishedAt: string;
  loopCount: number;
  tasks: ChiefTaskRecord[];
  experts: ChiefExpertSnapshots;
  orchestrationNotesPl: string[];
}): ChiefDecydentDossier {
  const { experts } = opts;
  const pe = experts.pricing;
  const cost = experts.cost;
  const offer = experts.offer;

  return {
    caseId: opts.caseId,
    status: opts.status,
    createdAt: opts.createdAt,
    finishedAt: opts.finishedAt,
    loopCount: opts.loopCount,
    tasks: opts.tasks.map((t) => ({ ...t })),
    traces: {
      execution: experts.execution?.contract ?? null,
      materials: experts.materials?.contract ?? null,
      pricing: experts.pricing?.contract ?? null,
      cost: experts.cost?.contract ?? null,
      offer: experts.offer?.contract ?? null,
    },
    experts: {
      execution: experts.execution,
      materials: experts.materials,
      pricing: experts.pricing,
      cost: experts.cost,
      offer: experts.offer,
    },
    offerHandoffPayload: cost?.offerHandoffPayload ?? null,
    decisionMakerPayload: offer?.decisionMakerPayload ?? null,
    primaryRecommendation: offer?.primaryRecommendation ?? null,
    scenarios: offer?.scenarios ?? [],
    orchestrationNotesPl: [...opts.orchestrationNotesPl],
    handoffBlockersPl: [...(cost?.handoffBlockersPl ?? [])],
    returnFlags: {
      returnToMaterialExpert: pe?.returnToMaterialExpert === true,
      requiresReanalysis: pe?.requiresReanalysis === true,
    },
  };
}
