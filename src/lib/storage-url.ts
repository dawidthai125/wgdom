import { supabaseProjectId } from "@/config/supabase";

const OLD_PROJECT = "kchwyjlnkdlymwvsnfiu";

/** URL ze starego projektu Supabase lub nieznanego bucketa — zdjęcie już nie istnieje. */
export function isDeadStorageUrl(url: string | undefined | null): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  if (url.includes(OLD_PROJECT)) return true;
  if (url.includes("make-0afb8820-photos") && supabaseProjectId && !url.includes(supabaseProjectId)) {
    return true;
  }
  return false;
}

export const UNAVAILABLE_PHOTO_LABEL = "Zdjęcie niedostępne (stary storage)";
