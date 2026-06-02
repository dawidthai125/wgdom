import { useSyncExternalStore } from "react";
import { getMediaFailureGeneration, subscribeMediaFailures } from "@/lib/media-filter";

/** Odśwież listy miniatur po wykryciu 404 (ukryj brakujące pliki). */
export function useMediaFailureRevision(): number {
  return useSyncExternalStore(subscribeMediaFailures, getMediaFailureGeneration, getMediaFailureGeneration);
}
