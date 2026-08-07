import type { ReactNode } from "react";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";

export function ExpertField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const v = (value ?? "").trim();
  if (!v || v === "—") return null;
  return (
    <div>
      <p className={`${TEUX_SECTION_TITLE} text-muted-foreground mb-0.5`}>{label}</p>
      <p className={`${TEUX_FONT_BODY} text-foreground/90 whitespace-pre-wrap`}>{v}</p>
    </div>
  );
}

export function ExpertEmpty({ label }: { label: string }) {
  return (
    <p className={`${TEUX_FONT_BODY} text-muted-foreground`} data-expert-empty>
      {label}
    </p>
  );
}

export function ExpertSubTitle({ children }: { children: string }) {
  return (
    <p className={`${TEUX_SECTION_TITLE} text-muted-foreground mt-2 mb-1`}>{children}</p>
  );
}

export function ExpertPanelShell({
  role,
  titlePl,
  children,
}: {
  role: string;
  titlePl: string;
  children: ReactNode;
}) {
  return (
    <details
      className="rounded-lg border border-border/70 bg-background/50"
      data-expert-panel={role}
    >
      <summary className="px-3 py-2 min-h-[40px] cursor-pointer list-none flex items-center gap-2 touch-manipulation">
        <span className={`${TEUX_FONT_CAPTION} font-semibold`}>{titlePl}</span>
        <span className={`${TEUX_FONT_CAPTION} text-muted-foreground ml-auto`}>
          tylko odczyt
        </span>
      </summary>
      <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">{children}</div>
    </details>
  );
}
