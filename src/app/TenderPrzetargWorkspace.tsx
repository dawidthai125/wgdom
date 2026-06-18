import { useMemo, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import {
  buildParticipationDisplayGroups,
  buildPrzetargExecutiveBundle,
  buildPrzetargHighlights,
  buildPrzetargKeyFacts,
  buildPrzetargWorkScopeLabels,
  hasParticipationDisplayData,
} from "@/lib/tender-detail-v4-display";

function BlockShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 bg-secondary/30">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function KeyFactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-3 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm sm:text-base font-semibold text-foreground mt-1 leading-snug break-words">{value}</p>
    </div>
  );
}

export function TenderPrzetargWorkspace({
  item,
  swz,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
}) {
  const bundle = useMemo(() => buildPrzetargExecutiveBundle(item), [item]);
  const keyFacts = useMemo(() => buildPrzetargKeyFacts(item, swz), [item, swz]);
  const participationGroups = useMemo(() => buildParticipationDisplayGroups(swz), [swz]);
  const workScope = useMemo(() => buildPrzetargWorkScopeLabels(item, bundle), [item, bundle]);
  const highlights = useMemo(() => buildPrzetargHighlights(item, swz, bundle), [item, swz, bundle]);

  return (
    <div className="space-y-4">
      <BlockShell title="Podstawowe dane">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {keyFacts.map((fact) => (
            <KeyFactCard key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-muted-foreground">
          <span className="font-mono">{item.bzpNumber || "—"}</span>
          {item.organizationCity && <span>· {item.organizationCity}</span>}
          {item.ezamowieniaUrl && (
            <a
              href={item.ezamowieniaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <ExternalLink size={11} />
              e-Zamówienia
            </a>
          )}
        </div>
      </BlockShell>

      <BlockShell title="Warunki udziału">
        {!hasParticipationDisplayData(swz) ? (
          <p className="text-sm text-muted-foreground">Nie wykryto wymagań</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {participationGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">{group.label}</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {group.items.slice(0, 6).map((line, i) => (
                    <li key={`${group.label}-${i}`} className="break-words">{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </BlockShell>

      <BlockShell title="Zakres robót">
        {workScope.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nie ustalono głównych grup robót w dokumentach.</p>
        ) : (
          <ul className="space-y-2">
            {workScope.map((work, i) => (
              <li
                key={`${work}-${i}`}
                className="text-sm font-medium text-foreground px-3 py-2 rounded-lg bg-secondary/40 border border-border/50"
              >
                {work}
              </li>
            ))}
          </ul>
        )}
      </BlockShell>

      <BlockShell title="Najważniejsze informacje">
        {highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak skróconych informacji z dokumentów.</p>
        ) : (
          <ul className="space-y-2">
            {highlights.map((line, i) => (
              <li key={i} className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
                {line}
              </li>
            ))}
          </ul>
        )}
      </BlockShell>
    </div>
  );
}
