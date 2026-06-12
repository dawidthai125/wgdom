/**
 * Action Center — warstwa prezentacji (20.7C.2C).
 * Sloty zamiast % dla akcji forecast; silnik buildActionCenter bez zmian.
 */

import type { OwnerActionItem } from "@/lib/tenders-strategy-action-center";
import { formatForecastSlots } from "@/lib/tenders-strategy-forecast-display";
import {
  primaryForecastScenario,
  type Forecast90DaysResult,
} from "@/lib/tenders-strategy-forecast-90d";

function forecastHorizonDaysFromActionId(id: string): number | null {
  if (id.includes("30")) return 30;
  if (id.includes("60")) return 60;
  if (id.includes("90")) return 90;
  return null;
}

function slotsPhrase(forecast: Forecast90DaysResult, days: number): string | null {
  const primary = primaryForecastScenario(forecast);
  const horizon = primary.horizons.find((h) => h.days === days);
  if (!horizon) return null;
  const slots = formatForecastSlots(horizon.activeJobs, forecast.maxConcurrentProjects);
  return slots.overLabel ? `${slots.primaryLabel} ${slots.overLabel}` : slots.primaryLabel;
}

function replacePercentUtilization(text: string, slotPhrase: string): string {
  return text
    .replace(/\(\d+%\)/g, slotPhrase)
    .replace(/\d+% obłożenia/gi, slotPhrase)
    .replace(/\d+%\)/g, `${slotPhrase})`)
    .replace(/\(+\d+% obłożenia\)/gi, slotPhrase);
}

/** Tytuł akcji — forecast utilization jako sloty. */
export function formatActionCenterItemTitle(
  item: OwnerActionItem,
  forecast?: Forecast90DaysResult | null,
): string {
  if (!forecast || !item.id.startsWith("forecast-")) return item.title;
  const days = forecastHorizonDaysFromActionId(item.id);
  if (days == null) return item.title;
  const phrase = slotsPhrase(forecast, days);
  if (!phrase) return item.title;

  if (item.id === "forecast-30-critical") {
    return `Krytyczne obciążenie za 30 dni — ${phrase}`;
  }
  if (item.id === "forecast-60-overload") {
    return `Możliwe przeciążenie za 60 dni — ${phrase}`;
  }
  if (item.id === "forecast-90-low") {
    return `Niskie obłożenie za 90 dni — ${phrase}`;
  }
  if (item.id === "forecast-90-moderate-low") {
    return `Niskie obłożenie za 90 dni — ${phrase}`;
  }

  return replacePercentUtilization(item.title, phrase);
}

/** Opis / reason — usuń % utilization jeśli forecast action. */
export function formatActionCenterItemDescription(
  item: OwnerActionItem,
  forecast?: Forecast90DaysResult | null,
): string {
  if (!item.description) return item.description;
  if (!forecast || !item.id.startsWith("forecast-")) return item.description;
  const days = forecastHorizonDaysFromActionId(item.id);
  if (days == null) return item.description;
  const phrase = slotsPhrase(forecast, days);
  if (!phrase) return item.description;
  return replacePercentUtilization(item.description, phrase);
}

export function formatActionCenterItemReason(
  item: OwnerActionItem,
  forecast?: Forecast90DaysResult | null,
): string {
  if (!forecast || !item.id.startsWith("forecast-")) return item.reason;
  const days = forecastHorizonDaysFromActionId(item.id);
  if (days == null) return item.reason;
  const phrase = slotsPhrase(forecast, days);
  if (!phrase) return item.reason;
  return replacePercentUtilization(item.reason, phrase);
}
