import type { ReactNode } from "react";

/** NG-03.5 — mobile card stack (≤390px); desktop używa tabeli obok. */
export function TenderMobileTableCards({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`lg:hidden space-y-2 ${className}`} data-tender-mobile-cards>
      {children}
    </div>
  );
}

export function TenderDesktopTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hidden lg:block ${className}`} data-tender-desktop-table>
      {children}
    </div>
  );
}

export function TenderMobileRowCard({
  title,
  subtitle,
  fields,
  badge,
  footer,
}: {
  title: string;
  subtitle?: string;
  fields: { label: string; value: ReactNode; fullWidth?: boolean }[];
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-2">
      <div className="min-w-0">
        {badge}
        <p className="text-xs font-semibold text-foreground leading-snug break-words">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5 break-words">{subtitle}</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        {fields.map((f) => (
          <div key={f.label} className={f.fullWidth ? "col-span-2" : "min-w-0"}>
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd className="font-medium text-foreground break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
      {footer}
    </article>
  );
}
