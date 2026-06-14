import type { WmPrintJobDocument, WmPrintSettings } from "@/lib/wm-print/types";

export const DEFAULT_WM_PRINT_SETTINGS: WmPrintSettings = {
  defaultCity: "Wrocław",
  zipNameSuffix: "ODBIOR_WM",
};

export function normalizeWmPrintSettings(raw: unknown): WmPrintSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WM_PRINT_SETTINGS };
  const s = raw as Partial<WmPrintSettings>;
  return {
    defaultCity: (s.defaultCity ?? DEFAULT_WM_PRINT_SETTINGS.defaultCity).trim() || "Wrocław",
    zipNameSuffix: (s.zipNameSuffix ?? DEFAULT_WM_PRINT_SETTINGS.zipNameSuffix).trim() || "ODBIOR_WM",
  };
}

export function mergeWmPrintSettings(
  local: WmPrintSettings,
  cloud: WmPrintSettings,
): WmPrintSettings {
  return {
    defaultCity: cloud.defaultCity || local.defaultCity,
    zipNameSuffix: cloud.zipNameSuffix || local.zipNameSuffix,
  };
}

export function jobDocsForCompleteness(
  docs: WmPrintJobDocument[],
  jobId: string,
  templateId?: string,
): WmPrintJobDocument | undefined {
  const jobDocs = docs.filter((d) => d.jobId === jobId);
  if (templateId) return jobDocs.find((d) => d.templateId === templateId);
  return undefined;
}
