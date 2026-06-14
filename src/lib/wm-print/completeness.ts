import type { Job } from "@/app/app-domain";
import { getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import type { WmPrintCompleteness, WmPrintJobDocument, WmPrintTemplate } from "@/lib/wm-print/types";

/**
 * Kompletność robota — wyłącznie sloty wgrywane per robota (job_upload).
 * Szablony generowane (wspólne) nie wpływają na % przy robocie (P1.0.5).
 */
export function computeWmPrintCompleteness(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
): WmPrintCompleteness {
  const slots = getEnabledWmPrintTemplates(templates).filter((t) => t.kind === "job_upload");
  const missing: string[] = [];
  let present = 0;

  for (const t of slots) {
    const linked = jobDocs.filter((d) => d.jobId === job.id && d.templateId === t.id);
    if (linked.length > 0) {
      present += 1;
    } else {
      missing.push(t.name);
    }
  }

  const total = slots.length;
  const percent = total === 0 ? 100 : Math.round((present / total) * 100);

  return {
    total,
    present,
    percent: Math.min(100, percent),
    missing,
  };
}
