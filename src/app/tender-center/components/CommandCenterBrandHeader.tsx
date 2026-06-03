import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";

export function CommandCenterBrandHeader({
  showTestBadge = false,
  refreshButton,
}: {
  showTestBadge?: boolean;
  refreshButton?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-br from-primary/10 via-card to-violet-500/5 border-b border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles size={20} className="text-primary shrink-0" aria-hidden />
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-primary">
                {COMMAND_CENTER_BRAND.title}
              </p>
              {showTestBadge && (
                <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                  Super Admin · test
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight text-foreground">
              {COMMAND_CENTER_BRAND.tagline}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {COMMAND_CENTER_BRAND.authorLine}
              <br />
              <span className="font-medium italic">{COMMAND_CENTER_BRAND.authorName}</span>
            </p>
            <p className="text-sm text-foreground/80 max-w-2xl pt-0.5">
              {COMMAND_CENTER_BRAND.subtitle}
            </p>
          </div>
          {refreshButton}
        </div>
      </div>
    </div>
  );
}
