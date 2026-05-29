import { FileText, FolderOpen, Users, Camera, ClipboardList, LayoutList } from "lucide-react";

export type JobDetailSection = "summary" | "documents" | "files" | "workers" | "photos" | "reports";

const SECTIONS: { id: JobDetailSection; label: string; icon: typeof FileText }[] = [
  { id: "summary", label: "Dane", icon: LayoutList },
  { id: "documents", label: "Dokumenty", icon: FileText },
  { id: "files", label: "Pliki", icon: FolderOpen },
  { id: "workers", label: "Pracownicy", icon: Users },
  { id: "photos", label: "Zdjęcia", icon: Camera },
  { id: "reports", label: "Raporty", icon: ClipboardList },
];

export function JobDetailSectionNav({
  active,
  onSelect,
  fileCount,
}: {
  active: JobDetailSection;
  onSelect: (section: JobDetailSection) => void;
  fileCount?: number;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-2 bg-background/95 backdrop-blur border-b border-border mb-4">
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              active === id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={12}/>
            {label}
            {id === "files" && typeof fileCount === "number" && fileCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                active === id ? "bg-primary-foreground/20" : "bg-background"
              }`}>
                {fileCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function scrollToJobSection(section: JobDetailSection) {
  const el = document.getElementById(`job-section-${section}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}
