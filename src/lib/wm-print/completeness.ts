import type { Job } from "@/app/app-domain";
import { getEnabledWmPrintTemplates, countWmPrintTemplateFiles } from "@/lib/wm-print/templates";
import type { WmPrintCompleteness, WmPrintJobDocument, WmPrintTemplate } from "@/lib/wm-print/types";

export function computeWmPrintCompleteness(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
): WmPrintCompleteness {
  const enabled = getEnabledWmPrintTemplates(templates);
  const missing: string[] = [];
  let present = 0;

  for (const t of enabled) {
    if (t.kind === "job_upload") {
      const linked = jobDocs.filter((d) => d.jobId === job.id && d.templateId === t.id);
      if (linked.length > 0) {
        present += 1;
      } else {
        missing.push(t.name);
      }
    } else if (countWmPrintTemplateFiles(t) > 0) {
      present += 1;
    } else {
      missing.push(`${t.name} (brak szablonu)`);
    }
  }

  const adjustedTotal = enabled.length;
  const percent = adjustedTotal === 0 ? 100 : Math.round((present / adjustedTotal) * 100);

  return {
    total: adjustedTotal,
    present,
    percent: Math.min(100, percent),
    missing,
  };
}
