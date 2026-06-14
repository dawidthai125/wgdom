import type { Job } from "@/app/app-domain";
import { getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import { jobDocsForCompleteness } from "@/lib/wm-print/settings";
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
      const doc = jobDocsForCompleteness(jobDocs, job.id, t.id);
      if (doc) {
        present += 1;
      } else {
        missing.push(t.name);
      }
    } else if (t.storageUrl) {
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
