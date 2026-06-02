import { Camera, Eye, ImagePlus, type LucideIcon } from "lucide-react";
import type { InspectorPhotoLabel } from "@/lib/job-wm";

export type CrewPhotoLabel = "before" | "after" | "progress";

export type PhotoLabelSectionMeta = {
  icon: LucideIcon;
  accent: string;
  border: string;
  zipFolder: string;
};

export const PHOTO_LABEL_NAMES: Record<CrewPhotoLabel, string> = {
  before: "Przed remontem",
  after: "Po remoncie / odbiór",
  progress: "W realizacji",
};

export const PHOTO_LABEL_SHORT: Record<CrewPhotoLabel, string> = {
  before: "Przed",
  after: "Po / odbiór",
  progress: "Realizacja",
};

export const PHOTO_LABEL_ORDER: CrewPhotoLabel[] = ["before", "progress", "after"];

let photoLabelSectionCache: Record<CrewPhotoLabel, PhotoLabelSectionMeta> | undefined;

/** Lazy init — unika TDZ przy circular chunk (lucide w ui-vendor ↔ panel-jobs). */
export function getPhotoLabelSection(): Record<CrewPhotoLabel, PhotoLabelSectionMeta> {
  if (!photoLabelSectionCache) {
    photoLabelSectionCache = {
      before: { icon: Camera, accent: "text-blue-400", border: "border-blue-500/20", zipFolder: "przed" },
      progress: { icon: ImagePlus, accent: "text-yellow-400", border: "border-yellow-500/20", zipFolder: "w-realizacji" },
      after: { icon: Eye, accent: "text-green-400", border: "border-green-500/20", zipFolder: "po-odbior" },
    };
  }
  return photoLabelSectionCache;
}

export const INSPECTOR_PHOTOS_SECTION = {
  label: "Zdjęcia inspektora",
  hint: "Usterki, stan przed/po odbiorze — dodajesz w tej galerii (kategoria + opis).",
  zipFolder: "inspektor",
  accent: "text-emerald-400",
  border: "border-emerald-500/20",
} as const;

export type { InspectorPhotoLabel } from "@/lib/job-wm";

export const INSPECTOR_PHOTO_LABEL_NAMES: Record<InspectorPhotoLabel, string> = {
  defect: "Usterka",
  in_progress: "W realizacji",
  before_handover: "Przed odbiorem",
  after_handover: "Po odbiorze",
};

export const INSPECTOR_PHOTO_LABEL_ORDER: InspectorPhotoLabel[] = [
  "defect",
  "in_progress",
  "before_handover",
  "after_handover",
];

let inspectorPhotoLabelSectionCache: Record<InspectorPhotoLabel, PhotoLabelSectionMeta> | undefined;

export function getInspectorPhotoLabelSection(): Record<InspectorPhotoLabel, PhotoLabelSectionMeta> {
  if (!inspectorPhotoLabelSectionCache) {
    inspectorPhotoLabelSectionCache = {
      defect: { icon: Camera, accent: "text-red-400", border: "border-red-500/20", zipFolder: "usterka" },
      in_progress: { icon: ImagePlus, accent: "text-yellow-400", border: "border-yellow-500/20", zipFolder: "w-realizacji" },
      before_handover: { icon: Eye, accent: "text-blue-400", border: "border-blue-500/20", zipFolder: "przed-odbiorem" },
      after_handover: { icon: Eye, accent: "text-green-400", border: "border-green-500/20", zipFolder: "po-odbiorem" },
    };
  }
  return inspectorPhotoLabelSectionCache;
}

export function normalizeInspectorPhotoLabel(label?: string): InspectorPhotoLabel {
  if (label && label in INSPECTOR_PHOTO_LABEL_NAMES) return label as InspectorPhotoLabel;
  return "before_handover";
}
