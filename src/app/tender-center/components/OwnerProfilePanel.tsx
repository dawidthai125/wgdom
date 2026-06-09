import { UserCircle2, Lightbulb } from "lucide-react";
import {
  ownerTypeTone,
  type OwnerProfile,
  type OwnerType,
} from "@/lib/tender-center-owner-profile";
import type { TenderDecision } from "@/lib/tender-center-decision";
import { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
import { SECTION_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";

function decisionLabel(d: TenderDecision | null): string {
  return d != null ? DECISION_LABEL_PL[d] : "—";
}

function ownerTypeDescription(type: OwnerType): string {
  switch (type) {
    case "OSTROŻNY":
      return `${DECISION_LABEL_PL.GO} < 35% — ostrożna selekcja przetargów`;
    case "WYWAŻONY":
      return `${DECISION_LABEL_PL.GO} 35–60% — zrównoważone podejście`;
    case "AGRESYWNY":
      return `${DECISION_LABEL_PL.GO} > 60% — wysoka gotowość do startu`;
  }
}

export function OwnerProfilePanel({ profile }: { profile: OwnerProfile }) {
  const hasData = profile.totalDecisions > 0;

  return (
    <div className="space-y-4 pb-2">
      {profile.ownerType && (
        <div
          className={`rounded-xl border px-4 py-4 text-center ${ownerTypeTone(profile.ownerType)}`}
        >
          <p className="text-[10px] uppercase tracking-wider opacity-80">Typ właściciela</p>
          <p
            className="text-2xl font-bold mt-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {profile.ownerType}
          </p>
          <p className="text-xs mt-1 opacity-90">{ownerTypeDescription(profile.ownerType)}</p>
        </div>
      )}

      {!hasData && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Profil decyzyjny pojawi się po zapisaniu pierwszych decyzji w Pamięci decyzji.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Profil ryzyka
          </p>
          <p className="text-sm font-semibold mt-1 leading-snug">{profile.riskProfile}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Preferowana decyzja
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {decisionLabel(profile.preferredDecision)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Liczba decyzji
          </p>
          <p
            className="text-xl font-bold mt-1 tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {profile.totalDecisions}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/15 px-3 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Preferowana wielkość kontraktu
        </p>
        <p className="text-sm font-semibold">{profile.preferredContractSize}</p>
      </div>

      <div className="rounded-xl border border-border bg-secondary/15 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <UserCircle2 size={14} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide">{SECTION_LABEL_PL.topReasons}</p>
        </div>
        {profile.topReasons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych o powodach.</p>
        ) : (
          <ul className="space-y-1.5">
            {profile.topReasons.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{r.label}</span>
                <span
                  className="font-bold tabular-nums text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ({r.count})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide">Wnioski</p>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground/90">
          {profile.profileInsights.map((insight, i) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
