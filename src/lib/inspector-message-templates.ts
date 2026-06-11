/**
 * Roboty 2.1 — szablony wiadomości do inspektora (MVP v1).
 * SSOT copy A–D; merge pól z Job; auto-sugestia bez CRM.
 */

import { jobDisplayTitle, jobApprovedPhotos, jobWorkerReports, fmtDate, type Job } from "@/app/app-domain";
import { latestJobFile } from "@/lib/job-documents";
import { inferJobPhase, type JobListStatusJob } from "@/lib/job-list-status";
import { inferHandoverStage, HANDOVER_STAGE_LABELS } from "@/lib/job-wm";
import { reportHasWorkScope } from "@/lib/work-scope-text";

export type InspectorTemplateId = "A" | "B" | "C" | "D";

export const INSPECTOR_TEMPLATE_IDS: InspectorTemplateId[] = ["A", "B", "C", "D"];

export const INSPECTOR_TEMPLATE_META: Record<
  InspectorTemplateId,
  { label: string; shortLabel: string; description: string }
> = {
  A: {
    label: "A — W trakcie · brak zlecenia",
    shortLabel: "Brak zlecenia (w trakcie)",
    description: "Roboty w toku — prośba o zlecenie PDF",
  },
  B: {
    label: "B — Do odbioru · brak kosztorysu",
    shortLabel: "Brak kosztorysu (odbiór)",
    description: "Faza odbioru — zlecenie jest, brakuje kosztorysu",
  },
  C: {
    label: "C — Do odbioru · brak zlecenia",
    shortLabel: "Brak zlecenia (odbiór)",
    description: "Faza odbioru — prośba o zlecenie PDF",
  },
  D: {
    label: "D — Do odbioru · brak obu",
    shortLabel: "Brak zlecenia i kosztorysu",
    description: "Faza odbioru — brakuje zlecenia i kosztorysu",
  },
};

export interface InspectorMessageMergeVars {
  contactName: string;
  senderName: string;
}

export interface InspectorReadyMissingBlock {
  readyLines: string[];
  missingLines: string[];
}

export type InspectorSuggestJob = JobListStatusJob &
  Pick<Job, "address" | "flatNumber" | "client" | "photos" | "workerReports" | "jobFiles" | "plannedHandoverDate">;

function jobAsSuggest(job: Job): InspectorSuggestJob {
  return job as InspectorSuggestJob;
}

/** Po naszej stronie — tylko gdy dane realnie istnieją. */
export function buildInspectorReadyMissingBlock(job: Job): InspectorReadyMissingBlock {
  const readyLines: string[] = [];
  const missingLines: string[] = [];

  const hasPhotoDoc =
    jobApprovedPhotos(job).length > 0 ||
    job.documents.zdjecia ||
    (job.photos || []).some((p) => p.status === "approved" && p.publicUrl);

  if (hasPhotoDoc) readyLines.push("dokumentacja zdjęciowa");

  if (latestJobFile(job, "plan_techniczny")) {
    readyLines.push("plan techniczny");
  }

  const hasWorkerDoc =
    job.documents.zakres ||
    jobWorkerReports(job).some((r) => reportHasWorkScope(r));

  if (hasWorkerDoc) readyLines.push("dokumentacja robót");

  if (!job.documents.zlecenie) missingLines.push("zlecenia");
  if (!job.documents.kosztorys) missingLines.push("kosztorysu");

  return { readyLines, missingLines };
}

function formatContactGreeting(name: string): string {
  const n = name.trim();
  if (!n) return "Dzień dobry";
  return `Dzień dobry ${n}`;
}

function formatPlannedHandover(job: Job): string {
  const d = job.plannedHandoverDate?.trim();
  return d ? fmtDate(d) : "—";
}

function appendReadyMissingSections(body: string, block: InspectorReadyMissingBlock): string {
  const parts = [body.trim()];
  if (block.readyLines.length > 0) {
    parts.push(
      "",
      "Po naszej stronie dostępne:",
      ...block.readyLines.map((line) => `✓ ${line}`),
    );
  }
  if (block.missingLines.length > 0) {
    parts.push(
      "",
      "Brakuje:",
      ...block.missingLines.map((line) => `• ${line}`),
    );
  }
  return parts.join("\n");
}

/** Auto-sugestia: D > C > A > B (zgodnie z PLAN 2.1). */
export function suggestInspectorTemplate(job: Job): InspectorTemplateId {
  const j = jobAsSuggest(job);
  const phase = inferJobPhase(j);
  const handover = phase === "handover";
  const noZlecenie = !j.documents.zlecenie;
  const noKosztorys = !j.documents.kosztorys;

  if (handover && noZlecenie && noKosztorys) return "D";
  if (handover && noZlecenie) return "C";
  if (!noZlecenie && noKosztorys && handover) return "B";
  if (noZlecenie && phase !== "completed") return "A";
  if (handover && noKosztorys) return "B";
  return "A";
}

export function inspectorTemplateSubject(templateId: InspectorTemplateId, job: Job): string {
  const title = jobDisplayTitle(job);
  switch (templateId) {
    case "A":
      return `W&G DOM — prośba o zlecenie, ${title}`;
    case "B":
      return `W&G DOM — prośba o kosztorys, ${title}`;
    case "C":
      return `W&G DOM — prośba o zlecenie (odbiór), ${title}`;
    case "D":
      return `W&G DOM — zlecenie i kosztorys, ${title}`;
  }
}

export function mergeInspectorTemplateBody(
  templateId: InspectorTemplateId,
  job: Job,
  vars: InspectorMessageMergeVars,
): string {
  const j = jobAsSuggest(job);
  const greeting = formatContactGreeting(vars.contactName);
  const title = jobDisplayTitle(job);
  const client = job.client?.trim() || "—";
  const phaseLabel =
    inferJobPhase(j) === "handover"
      ? "przygotowania do odbioru"
      : inferJobPhase(j) === "completed"
        ? "zakończenia"
        : "realizacji";
  const planned = formatPlannedHandover(job);
  const block = buildInspectorReadyMissingBlock(job);
  const stage = HANDOVER_STAGE_LABELS[inferHandoverStage(j)];

  let core = "";

  switch (templateId) {
    case "A":
      core = `${greeting},

Zwracam się w sprawie remontu: ${title} (${client}).

Roboty są w toku (faza: ${phaseLabel}). Do dalszego harmonogramu prac i spójnej dokumentacji prosimy o przekazanie zlecenia (PDF) na tę inwestycję.

Gdyby było możliwe, prosimy o informację o orientacyjnym terminie przekazania zlecenia. W razie potrzeby chętnie uzupełnimy materiały po stronie wykonawcy.

Z góry dziękujemy za współpracę.

Pozdrawiamy,
${vars.senderName}
W&G DOM`;
      break;
    case "B":
      core = `${greeting},

Kontaktujemy się w sprawie mieszkania: ${title} (${client}), które jest w fazie ${phaseLabel}.

Do kompletu dokumentów przed odbiorem brakuje nam jeszcze kosztorysu. Zlecenie mamy odnotowane — uprzejmie prosimy o przekazanie kosztorysu (PDF / NORMA), abyśmy mogli domknąć pakiet dokumentów.

Planowany termin odbioru: ${planned}. Etap WM: ${stage}.

Dziękujemy za pomoc i będziemy wdzięczni za informację, kiedy możemy spodziewać się dokumentu.

Pozdrawiamy,
${vars.senderName}
W&G DOM`;
      break;
    case "C":
      core = `${greeting},

Zwracamy się w sprawie inwestycji: ${title} (${client}) — mieszkanie jest w fazie ${phaseLabel}.

Do przygotowania kompletu pod odbiór potrzebujemy jeszcze zlecenia (PDF). Roboty po stronie wykonawcy są zaawansowane; prosimy o przekazanie zlecenia, abyśmy mogli spójnie domknąć dokumentację przed terminem odbioru (${planned}).

Z góry dziękujemy za współpracę i prosimy o krótką informację zwrotną, gdy dokument będzie gotowy.

Pozdrawiamy,
${vars.senderName}
W&G DOM`;
      break;
    case "D":
      core = `${greeting},

Kontaktujemy się w sprawie: ${title} (${client}), w fazie ${phaseLabel} (planowany odbiór: ${planned}).

Do domknięcia pakietu dokumentów przed odbiorem prosimy jeszcze o:
• zlecenie (PDF),
• kosztorys (PDF / NORMA).

Wiemy, że terminy po stronie inwestora bywają napięte — chcielibyśmy jednak wcześnie zsynchronizować dokumenty, aby odbiór przebiegł sprawnie. Będziemy wdzięczni za informację, kiedy możemy spodziewać się obu dokumentów.

Z góry dziękujemy za współpracę.

Pozdrawiamy,
${vars.senderName}
W&G DOM`;
      break;
  }

  return appendReadyMissingSections(core, block);
}

/** Tekst wpisu activityLog po wysyłce. */
export function inspectorTemplateActivityText(templateId: InspectorTemplateId, recipientEmail: string): string {
  const meta = INSPECTOR_TEMPLATE_META[templateId];
  return `Szablon ${templateId} (${meta.shortLabel}) → ${recipientEmail}`;
}

/** Payload klienta dla send-job-email (tryb szablonu inspektora). */
export function buildInspectorTemplateEmailPayload(
  job: Job,
  templateId: InspectorTemplateId,
  to: string,
  toName: string,
  subject: string,
  introMessage: string,
) {
  return {
    to,
    toName: toName || undefined,
    subject: subject.trim(),
    introMessage: introMessage.trim(),
    jobHeader: {
      address: job.address,
      flatNumber: job.flatNumber,
      client: job.client,
    },
    photos: [] as [],
    reportSections: [] as [],
    mode: "inspector_template" as const,
  };
}

export function inspectorTemplateEmailHasContent(introMessage: string): boolean {
  return introMessage.trim().length >= 40;
}
