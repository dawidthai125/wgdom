import type { Job } from "@/app/app-domain";
import { parseJobAddressParts } from "@/lib/wm-print/address-vars";
import type { WmPrintGenerateOptions, WmPrintSettings, WmPrintVariableKey } from "@/lib/wm-print/types";

export function formatWmPrintDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy} r.`;
}

export function resolveWmPrintDate(opts: WmPrintGenerateOptions): Date {
  if (opts.dateMode === "custom" && opts.customDate && !Number.isNaN(opts.customDate.getTime())) {
    return opts.customDate;
  }
  return new Date();
}

export function buildWmPrintVariableMap(
  job: Pick<Job, "address" | "flatNumber">,
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
): Record<WmPrintVariableKey, string> {
  const parts = parseJobAddressParts(job.address, job.flatNumber);
  const date = resolveWmPrintDate(opts);
  const dateStr = formatWmPrintDate(date);

  return {
    DATE: dateStr,
    YEAR: String(date.getFullYear()),
    JOB_ADDRESS: parts.fullAddress,
    JOB_STREET: parts.street,
    JOB_BUILDING: parts.building,
    JOB_APARTMENT: parts.apartment,
    JOB_CITY: settings.defaultCity || "Wrocław",
  };
}

export function substituteWmPrintVariables(
  text: string,
  vars: Record<WmPrintVariableKey, string>,
): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}
