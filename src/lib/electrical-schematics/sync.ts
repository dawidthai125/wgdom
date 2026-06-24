import { pushKeysToCloud } from "@/lib/cloud-sync";
import { mergeElectricalSchematics } from "@/lib/electrical-schematics/merge";
import { normalizeElectricalSchematics } from "@/lib/electrical-schematics/normalize";
import {
  ELECTRICAL_SCHEMATICS_KEY,
  type SingleLineDiagram,
} from "@/lib/electrical-schematics/types";

export { ELECTRICAL_SCHEMATICS_KEY, mergeElectricalSchematics, normalizeElectricalSchematics };

/** Zapis LS + push KV — przygotowane pod kw-electrical-schematics (wire w cloud-sync w późniejszej fazie). */
export async function pushElectricalSchematicsToCloud(schematics: SingleLineDiagram[]): Promise<void> {
  const normalized = normalizeElectricalSchematics(schematics);
  try {
    localStorage.setItem(ELECTRICAL_SCHEMATICS_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([ELECTRICAL_SCHEMATICS_KEY], [normalized]);
}

export function readElectricalSchematicsFromLocalStorage(): SingleLineDiagram[] {
  try {
    const raw = localStorage.getItem(ELECTRICAL_SCHEMATICS_KEY);
    if (!raw) return [];
    return normalizeElectricalSchematics(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function mergeElectricalSchematicsFromSources(
  local: unknown,
  cloud: unknown,
): SingleLineDiagram[] {
  return mergeElectricalSchematics(local, cloud);
}
