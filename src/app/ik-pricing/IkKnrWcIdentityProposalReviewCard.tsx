/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2 UI — Owner Review card (per proposal).
 * Reuses IkLaborCandidateReviewCard layout pattern · ZERO authority writes.
 */

import type {
  KnrWcIdentityProposal,
  KnrWcOwnerDecision,
  KnrWcSimilarWork,
} from "@/lib/intelligent-estimator/knr-wc-identity-bridge-types";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { WgButton } from "@/app/ui";

const HOLD_UNIT_TABLE_CODES = new Set(["1305-01", "1305-02"]);

const OWNER_DECISION_OPTIONS: Array<{
  value: Exclude<KnrWcOwnerDecision, "unset">;
  labelPl: string;
}> = [
  { value: "REUSE_EXISTING", labelPl: "REUSE — istniejąca pozycja WC" },
  { value: "CREATE_NEW", labelPl: "CREATE — nowa pozycja (staging · P3)" },
  { value: "HOLD", labelPl: "HOLD — odłożone" },
  { value: "HOLD_UNIT", labelPl: "HOLD_UNIT — jednostka wymaga decyzji" },
  { value: "HOLD_EVIDENCE", labelPl: "HOLD_EVIDENCE — brak dowodu" },
  { value: "REJECT", labelPl: "REJECT — odrzuć propozycję" },
];

export type IkKnrWcIdentityProposalReviewCardProps = {
  proposal: KnrWcIdentityProposal;
  ownerDecision: KnrWcOwnerDecision;
  selectedWorkId: string | null;
  onOwnerDecision: (decision: KnrWcOwnerDecision) => void;
  onSelectSimilarWork: (work: KnrWcSimilarWork) => void;
  onClose?: () => void;
};

function isHoldUnitTable(tableCode: string): boolean {
  return HOLD_UNIT_TABLE_CODES.has(String(tableCode || "").trim());
}

function isCreateBlocked(proposal: KnrWcIdentityProposal): boolean {
  return (
    proposal.unitStatus === "HOLD_UNIT" ||
    isHoldUnitTable(proposal.tableCode) ||
    proposal.recommendation === "HOLD_UNIT"
  );
}

export function IkKnrWcIdentityProposalReviewCard({
  proposal,
  ownerDecision,
  selectedWorkId,
  onOwnerDecision,
  onSelectSimilarWork,
  onClose,
}: IkKnrWcIdentityProposalReviewCardProps) {
  const createBlocked = isCreateBlocked(proposal);
  const duplicateHigh = proposal.duplicateRisk === "HIGH";

  return (
    <div
      className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 space-y-3"
      data-ik-knr-wc-proposal-review
      data-proposal-id={proposal.proposalId}
      data-normalized-key={proposal.normalizedKey}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`${TEUX_SECTION_TITLE} text-foreground`}>
            KNR → WC Identity — Owner Review
          </p>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
            {proposal.displayCode} · {proposal.normalizedKey}
          </p>
        </div>
        {onClose ? (
          <WgButton type="button" variant="ghost" onClick={onClose} data-ik-knr-wc-review-close>
            Zamknij
          </WgButton>
        ) : null}
      </div>

      <p
        className={`${TEUX_FONT_CAPTION} font-semibold text-violet-900 dark:text-violet-200`}
        data-ik-knr-wc-advisory-disclaimer
      >
        Sugestia systemu ≠ decyzja Ownera. Propozycja nie jest tożsamością CatalogWork.
      </p>

      {proposal.staleEvidence ? (
        <p
          className={`${TEUX_FONT_CAPTION} font-medium text-amber-800 dark:text-amber-200`}
          data-ik-knr-wc-stale-evidence
        >
          staleEvidence — dowód upstream mógł się zmienić (advisory).
        </p>
      ) : null}

      {proposal.unitRevalidationRequired ? (
        <p
          className={`${TEUX_FONT_CAPTION} font-medium text-amber-800 dark:text-amber-200`}
          data-ik-knr-wc-unit-revalidation
        >
          unitRevalidationRequired — jednostka wymaga ponownej weryfikacji.
        </p>
      ) : null}

      {duplicateHigh ? (
        <p
          className={`${TEUX_FONT_CAPTION} font-semibold text-destructive`}
          data-ik-knr-wc-duplicate-high
        >
          duplicateRisk=HIGH — wybierz REUSE świadomie lub HOLD/REJECT.
        </p>
      ) : null}

      {proposal.unitStatus === "HOLD_UNIT" || isHoldUnitTable(proposal.tableCode) ? (
        <p
          className={`${TEUX_FONT_CAPTION} font-semibold text-amber-900 dark:text-amber-100`}
          data-ik-knr-wc-hold-unit
        >
          HOLD_UNIT ({proposal.tableCode}) — CREATE zablokowany · prob→szt zabronione.
        </p>
      ) : null}

      <section data-ik-knr-wc-system-suggestion>
        <p className={`${TEUX_FONT_CAPTION} font-bold uppercase tracking-wide text-muted-foreground`}>
          Sugestia systemu
        </p>
        <dl className={`${TEUX_FONT_BODY} mt-1 grid grid-cols-2 gap-x-3 gap-y-1`}>
          <dt className="text-muted-foreground">recommendation</dt>
          <dd data-ik-knr-wc-recommendation>{proposal.recommendation}</dd>
          <dt className="text-muted-foreground">verificationState</dt>
          <dd data-ik-knr-wc-verification>{proposal.verificationState}</dd>
          <dt className="text-muted-foreground">duplicateRisk</dt>
          <dd data-ik-knr-wc-duplicate-risk>{proposal.duplicateRisk}</dd>
          <dt className="text-muted-foreground">discoveryStatus</dt>
          <dd data-ik-knr-wc-discovery>{proposal.discoveryStatus}</dd>
          <dt className="text-muted-foreground">sourceStatus</dt>
          <dd data-ik-knr-wc-source>{proposal.sourceStatus}</dd>
        </dl>
      </section>

      <section>
        <p className={`${TEUX_FONT_CAPTION} font-bold uppercase tracking-wide text-muted-foreground`}>
          Pozycja KNR
        </p>
        <dl className={`${TEUX_FONT_BODY} mt-1 grid grid-cols-2 gap-x-3 gap-y-1`}>
          <dt className="text-muted-foreground">tableCode</dt>
          <dd>{proposal.tableCode}</dd>
          <dt className="text-muted-foreground">unitRaw</dt>
          <dd data-ik-knr-wc-unit-raw>{proposal.unitRaw || "—"}</dd>
          <dt className="text-muted-foreground">officialNamePl</dt>
          <dd>{proposal.officialNamePl || "—"}</dd>
          <dt className="text-muted-foreground">descriptionPl</dt>
          <dd className="col-span-2">{proposal.descriptionPl || "—"}</dd>
        </dl>
      </section>

      {proposal.similarWorks.length > 0 ? (
        <section data-ik-knr-wc-similar-works>
          <p className={`${TEUX_FONT_CAPTION} font-bold uppercase tracking-wide text-muted-foreground`}>
            similarWorks (advisory)
          </p>
          <ul className="mt-1 space-y-1">
            {proposal.similarWorks.map((sw) => (
              <li key={sw.workId}>
                <button
                  type="button"
                  className={`w-full text-left rounded-md border px-2 py-1.5 ${TEUX_FONT_BODY} ${
                    selectedWorkId === sw.workId
                      ? "border-violet-500 bg-violet-500/20"
                      : "border-border/60 bg-background/50"
                  }`}
                  data-ik-knr-wc-similar-work
                  data-work-id={sw.workId}
                  onClick={() => onSelectSimilarWork(sw)}
                >
                  {sw.namePl} · {sw.workId} · {sw.unit}
                  {sw.active ? "" : " · nieaktywna"}
                  <span className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                    {" "}
                    · score={sw.score.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {proposal.knrEvidenceRefs.length > 0 ? (
        <section data-ik-knr-wc-evidence>
          <p className={`${TEUX_FONT_CAPTION} font-bold uppercase tracking-wide text-muted-foreground`}>
            evidence
          </p>
          <ul className={`${TEUX_FONT_CAPTION} mt-1 list-disc pl-4 text-muted-foreground`}>
            {proposal.knrEvidenceRefs.map((ev, i) => (
              <li key={`${ev.kind}-${ev.refId}-${i}`}>
                {ev.kind}: {ev.refId}
                {ev.detail ? ` — ${ev.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {proposal.specialRiskNotes.length > 0 ? (
        <ul className={`${TEUX_FONT_CAPTION} list-disc pl-4 text-amber-900 dark:text-amber-100`}>
          {proposal.specialRiskNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <section data-ik-knr-wc-owner-decision>
        <p className={`${TEUX_FONT_CAPTION} font-bold uppercase tracking-wide text-foreground`}>
          Decyzja Ownera
        </p>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`} data-ik-knr-wc-owner-current>
          Aktualna: {ownerDecision === "unset" ? "nie ustawiono" : ownerDecision}
          {selectedWorkId ? ` · selectedWorkId=${selectedWorkId}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {OWNER_DECISION_OPTIONS.map((opt) => {
            const disabled =
              opt.value === "CREATE_NEW" && createBlocked;
            return (
              <WgButton
                key={opt.value}
                type="button"
                variant={ownerDecision === opt.value ? "primary" : "secondary"}
                disabled={disabled}
                data-ik-knr-wc-owner-option={opt.value}
                onClick={() => onOwnerDecision(opt.value)}
              >
                {opt.labelPl}
              </WgButton>
            );
          })}
        </div>
        {ownerDecision === "REUSE_EXISTING" && !selectedWorkId ? (
          <p className={`${TEUX_FONT_CAPTION} text-destructive mt-2`}>
            Wybierz similarWork powyżej (staging selectedWorkId).
          </p>
        ) : null}
        {ownerDecision === "CREATE_NEW" ? (
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-2`}>
            CREATE — tylko staging. CatalogWork powstanie w P3 (osobne GO).
          </p>
        ) : null}
      </section>
    </div>
  );
}
