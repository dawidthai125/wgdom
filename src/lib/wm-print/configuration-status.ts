import { countWmPrintTemplateFiles, getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

export interface WmPrintConfigurationStatus {
  total: number;
  configured: number;
  missing: string[];
  complete: boolean;
}

/** Czy grupa szablonu jest skonfigurowana (ma pliki lub jest slotem wgrywanym). */
export function isWmPrintTemplateGroupConfigured(t: WmPrintTemplate): boolean {
  if (t.kind === "job_upload") return true;
  return countWmPrintTemplateFiles(t) > 0;
}

export function computeWmPrintConfigurationStatus(templates: WmPrintTemplate[]): WmPrintConfigurationStatus {
  const enabled = getEnabledWmPrintTemplates(templates);
  const missing: string[] = [];
  let configured = 0;

  for (const t of enabled) {
    if (isWmPrintTemplateGroupConfigured(t)) {
      configured += 1;
    } else {
      missing.push(t.name);
    }
  }

  return {
    total: enabled.length,
    configured,
    missing,
    complete: missing.length === 0,
  };
}
