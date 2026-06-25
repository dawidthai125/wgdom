import type { ReactNode } from "react";

export function StrategyGuidanceSection({
  title,
  subtitle,
  testId,
  children,
}: {
  title: string;
  subtitle?: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3" data-testid={testId}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
