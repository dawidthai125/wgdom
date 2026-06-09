import type { JobDetailSection } from "@/app/JobDetailSectionNav";
import type { InspectorActivityType, InspectorFeedItem } from "@/lib/job-activity";

export type InspectorFeedDeepLink = {
  section: JobDetailSection;
  sectionLabel: string;
};

const SECTION_LABELS: Record<JobDetailSection, string> = {
  summary: "Przegląd",
  documents: "Dokumenty",
  files: "Pliki",
  workers: "Pracownicy",
  photos: "Zdjęcia",
  reports: "Dokumentacja",
};

export function inspectorFeedSectionLabel(section: JobDetailSection): string {
  return SECTION_LABELS[section];
}

export function resolveInspectorFeedDeepLink(
  item: Pick<InspectorFeedItem, "type">,
): InspectorFeedDeepLink {
  const section = resolveInspectorActivitySection(item.type);
  return { section, sectionLabel: SECTION_LABELS[section] };
}

export function resolveInspectorActivitySection(type: InspectorActivityType): JobDetailSection {
  switch (type) {
    case "inspector_document":
      return "documents";
    case "inspector_file":
      return "files";
    case "inspector_photo":
      return "photos";
    case "inspector_stage":
    case "inspector_note":
    case "inspector_billing_note":
    case "inspector_billing_proposal":
      return "summary";
    default:
      return "summary";
  }
}
