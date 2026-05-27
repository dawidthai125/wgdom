import { Phone } from "lucide-react";
import type { AdminRole } from "@/lib/admin-auth";
import { resolveAuthorContact } from "@/lib/content-author-contact";
import type { JobNoteAuthorRole } from "@/lib/job-wm";

export function AuthorAttribution({
  name,
  directory,
  noteRole,
  reportAdminRole,
  className = "",
  accentClass = "text-foreground/90 font-medium",
}: {
  name: string;
  directory: { name: string; phone: string }[];
  noteRole?: JobNoteAuthorRole;
  reportAdminRole?: AdminRole | "worker";
  className?: string;
  accentClass?: string;
}) {
  const resolved = resolveAuthorContact(name, {
    directory,
    noteRole,
    reportAdminRole,
  });

  const title = resolved.phone
    ? `${resolved.name}${resolved.roleLabel ? ` · ${resolved.roleLabel}` : ""} — tel. ${resolved.phone}`
    : resolved.roleLabel
      ? `${resolved.name} · ${resolved.roleLabel}`
      : resolved.name;

  return (
    <span className={`relative inline-flex items-center gap-1 group/author max-w-full ${className}`}>
      <span
        className={`cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 ${accentClass}`}
        title={title}
      >
        {resolved.name}
      </span>
      {resolved.roleLabel && resolved.kind !== "worker" && (
        <span className="text-[10px] text-muted-foreground shrink-0">({resolved.roleLabel})</span>
      )}
      {resolved.phone && (
        <span
          className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-50 hidden group-hover/author:flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] shadow-lg"
          role="tooltip"
        >
          <Phone size={11} className="text-primary shrink-0"/>
          <a href={`tel:${resolved.phone.replace(/\s/g, "")}`} className="text-primary font-medium pointer-events-auto">
            {resolved.phone}
          </a>
        </span>
      )}
    </span>
  );
}
