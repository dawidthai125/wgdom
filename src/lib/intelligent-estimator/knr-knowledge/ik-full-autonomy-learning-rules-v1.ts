/**
 * IK Full Autonomy — durable learning rules (RULE 01–25).
 * ENGINE ≠ DATA ≠ RESEARCH gap classes. No invent PLN.
 */

export const IK_FULL_AUTONOMY_LEARNING_RULES_VERSION = "v1" as const;

export type IkAutonomyGapClass = "ENGINE" | "DATA" | "RESEARCH" | "IDENTITY" | "FINANCE";

export type IkFullAutonomyLearningRule = {
  id: string;
  titlePl: string;
  gapClass: IkAutonomyGapClass;
  hard: boolean;
  notePl: string;
};

export const IK_FULL_AUTONOMY_LEARNING_RULES_V1: readonly IkFullAutonomyLearningRule[] =
  Object.freeze([
    { id: "RULE_01", titlePl: "KEEP engines — no rebuild AUT-R1/AUT-MAT/F5/BidCutover", gapClass: "ENGINE", hard: true, notePl: "SEARCH BEFORE CREATE." },
    { id: "RULE_02", titlePl: "No Finance invent · no companyPrice→OUR RATE", gapClass: "FINANCE", hard: true, notePl: "Silent invent FORBIDDEN." },
    { id: "RULE_03", titlePl: "No r-g×hourly invent PLN", gapClass: "RESEARCH", hard: true, notePl: "Evidence PLN only via AUT-R1." },
    { id: "RULE_04", titlePl: "No force-bind identity", gapClass: "IDENTITY", hard: true, notePl: "GO33/AIR fail-closed." },
    { id: "RULE_05", titlePl: "TechnologyPack durable cloud", gapClass: "DATA", hard: true, notePl: "kw-technology-packs." },
    { id: "RULE_06", titlePl: "ACLC CREATE must persist WC", gapClass: "DATA", hard: true, notePl: "productionMutation after save." },
    { id: "RULE_07", titlePl: "IdentityCandidates cloud OWNER_REVIEW+", gapClass: "DATA", hard: true, notePl: "kw-identity-candidates ≠ CatalogWork." },
    { id: "RULE_08", titlePl: "Multi-dwelling package cloud", gapClass: "DATA", hard: true, notePl: "kw-multi-dwelling-package-v1." },
    { id: "RULE_09", titlePl: "DISCOVERED ≠ TRUSTED Evidence", gapClass: "RESEARCH", hard: true, notePl: "Promote required." },
    { id: "RULE_10", titlePl: "Host-lock KEEP-5/APF/Owner core unchanged", gapClass: "ENGINE", hard: true, notePl: "SSRF + promote extension only." },
    { id: "RULE_11", titlePl: "Material Evidence durable MEK", gapClass: "DATA", hard: true, notePl: "kw-wgdom-material-source-evidence." },
    { id: "RULE_12", titlePl: "Research cooldown durable TTL", gapClass: "ENGINE", hard: true, notePl: "kw-work-rate-research-cooldown." },
    { id: "RULE_13", titlePl: "AUT-G3-PERSIST after gates", gapClass: "ENGINE", hard: true, notePl: "Fail any gate → no persist." },
    { id: "RULE_14", titlePl: "recommendedBid ≠ ikFinalBid ≠ submittedBid", gapClass: "FINANCE", hard: true, notePl: "Never conflate." },
    { id: "RULE_15", titlePl: "READY_TO_BID = conjunction only", gapClass: "FINANCE", hard: true, notePl: "No parallel state machine." },
    { id: "RULE_16", titlePl: "KL-3 pending ≠ terminal FAIL", gapClass: "ENGINE", hard: true, notePl: "KNR_DOWNSTREAM_PENDING diag." },
    { id: "RULE_17", titlePl: "Flags refresh without remount", gapClass: "ENGINE", hard: true, notePl: "flagEpoch on focus/storage." },
    { id: "RULE_18", titlePl: "Clear attempt latches on KL-3 defer", gapClass: "ENGINE", hard: true, notePl: "Resume AutoG2/P5 once." },
    { id: "RULE_19", titlePl: "TPI 1205-09 HOLD — no invent", gapClass: "RESEARCH", hard: true, notePl: "ChatGPT sources documented · no PLN." },
    { id: "RULE_20", titlePl: "TPI 1205-05 HOLD — no invent", gapClass: "IDENTITY", hard: true, notePl: "Identity/unit HOLD." },
    { id: "RULE_21", titlePl: "Identity HOLDs unchanged without GO", gapClass: "IDENTITY", hard: true, notePl: "0135/0602/0216/0401." },
    { id: "RULE_22", titlePl: "FULL AUTONOMY TRUE only after Global PV", gapClass: "ENGINE", hard: true, notePl: "Build alone ≠ TRUE." },
    { id: "RULE_23", titlePl: "ENGINE≠DATA≠RESEARCH gap classes", gapClass: "ENGINE", hard: true, notePl: "Classify residual before invent." },
    { id: "RULE_24", titlePl: "Payroll core untouched", gapClass: "ENGINE", hard: true, notePl: "G1 NIE · Shared CORE pattern only." },
    { id: "RULE_25", titlePl: "Surgical git — no WIP .tmp", gapClass: "ENGINE", hard: true, notePl: "Release discipline per commit." },
  ]);

export function listIkFullAutonomyLearningRules(): readonly IkFullAutonomyLearningRule[] {
  return IK_FULL_AUTONOMY_LEARNING_RULES_V1;
}

export function classifyAutonomyGap(ruleId: string): IkAutonomyGapClass | null {
  return IK_FULL_AUTONOMY_LEARNING_RULES_V1.find((r) => r.id === ruleId)?.gapClass ?? null;
}
