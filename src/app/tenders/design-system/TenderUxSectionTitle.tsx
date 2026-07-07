import type { ReactNode } from "react";
import { TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";

/** Nagłówek sekcji listy / workspace (TEUX-2). */
export function TenderUxSectionTitle({
  children,
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "h2" | "h3";
}) {
  return (
    <Tag className={`${TEUX_SECTION_TITLE} ${className}`} data-tender-ux-section-title>
      {children}
    </Tag>
  );
}
