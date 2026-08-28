/** Przy nowych funkcjach uzupełnij: CHANGELOG (ten plik), GuideView helpSections, navItems.hint, LabelWithHint. */

export type ChangelogItemType = "new" | "fix" | "improve";

export interface ChangelogRelease {
  date: string;
  version: string;
  label: string;
  items: { type: ChangelogItemType; text: string }[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    date: "2026-08-28",
    version: "2.66.119",
    label: "PAYROLL DELETE P0 — FIFO mutacji składu",
    items: [
      {
        type: "fix",
        text: "P0: mutacje kw-week-employees (pwrPush/pwrRemove/pwrAdd + withKwWeekEmployeesAsyncMutation) serializowane FIFO — ADD i REMOVE nie lecą równolegle; stale ADD nie przywraca osoby po Usuń. isBlocked() bez zmian (tylko auto-pull). Test: test-payroll-delete-fifo-p0.mjs.",
      },
    ],
  },
  {
    date: "2026-08-28",
    version: "2.66.118",
    label: "PAYROLL P0 — scoped hours-down intent contract",
    items: [
      {
        type: "fix",
        text: "P0 intent redesign: hours-down vs cloud tylko z scoped hoursIntents (emp+day+from/to) weryfikowanymi względem chmury. payrollDomainUserWrite / bare intentionalHoursClear NIE autoryzują hours-down. Sanitize mieszanych delta; stale 660→347 BLOCK. Edge 409 bez intentów. Test: test-payroll-p0-hours-down-protection.mjs R1–R15.",
      },
    ],
  },
  {
    date: "2026-08-28",
    version: "2.66.117",
    label: "PAYROLL P0 — hours-down write protection",
    items: [
      {
        type: "fix",
        text: "P0: cichy zapis hours-down do kw-week-employees zablokowany (bootstrap/merge/safe) gdy outgoing < cloud bez świadomej mutacji. Luka: guard >50% przepuszczał 660→347 (~47%). Domain PWRB (pwrPush) = payrollDomainUserWrite; intentionalHoursClear / rollover bez zmian. Edge 409 payroll_hours_down_blocked. Test: test-payroll-p0-hours-down-protection.mjs.",
      },
    ],
  },
  {
    date: "2026-08-27",
    version: "2.66.116",
    label: "IK C2 MOPS — KNNR 1305 prob OD-01 + OUR RATE 60/20",
    items: [
      {
        type: "new",
        text: "OD-01 Variant A: `prob` first-class unit (wgdom-cost-catalog, work-rate bridge). C2 M3: `knnr-wc-knnr-5-1305-01-prob` + `knnr-wc-knnr-5-1305-02-prob` (LABOR, margin 0%). M5 OUR RATE Owner 60/20 PLN/prob. M6 OWNER_KNR mappings · M8 provisional skip · M10 LABOR_ONLY. Test: test-ik-od01-prob-unit-platform · test-ik-c2-batch-m3-m8 · test-ik-c2-batch-m5-m10.",
      },
    ],
  },
  {
    date: "2026-08-24",
    version: "2.66.115",
    label: "PAYROLL-WEEK-ROSTER-INVARIANT-01 — ALIGN 0h / quarantine / D-F4 clear",
    items: [
      {
        type: "fix",
        text: "Incydent 24.08: ALIGN z historycznymi godzinami → quarantine rollover (`quarantine_historical_hours_under_stale_labels`); fence D-F3; `intentionalHoursClear` w batch-set + Edge skip-union (D-F4). #R04 ALIGN 0h zachowane. Test: regression-04 R1/R1c · invariant-01 · rollover T-INC.",
      },
    ],
  },
  {
    date: "2026-08-23",
    version: "2.66.114",
    label: "IK-OWNER-MAP A01-S1 — WM LP4 oczyszczenie identity",
    items: [
      {
        type: "new",
        text: "Owner identity A01-S1: `lim-ik-a01-lp4-oczyszczenie-wm` → `cc-w2-oczyszczenie-podloza` (exact WM LP4 BOQ · m2). LP5 impregnacja EXCLUDED · zmywanie HOLD. Test: test-labor-identity-mapping-a01-s1.mjs.",
      },
    ],
  },
  {
    date: "2026-08-22",
    version: "2.66.113",
    label: "IK-KNR WC Identity Bridge P3 — Owner CREATE (flag OFF)",
    items: [
      {
        type: "new",
        text: "P3 WC CREATE: knr-wc-identity-bridge-create.ts + work-catalog-insert.ts (P5.26 reuse) · IkKnrWcIdentityCreateExecutor (Hub additive) · saveWorkCatalogRouted only · KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED=false. Zero A1/map/pricing/HTTP · P2 UI frozen. Test: test-ik-knr-wc-identity-bridge-p3.mjs.",
      },
    ],
  },
  {
    date: "2026-08-22",
    version: "2.66.112",
    label: "IK-KNR FT-10 — secondary DSEC tableCode (CatalogBasis)",
    items: [
      {
        type: "improve",
        text: "FT-10 Variant B: resolveCatalogBasisFromSourceRow uzupełnia tableCode z description wyłącznie po kotwicy d.X(.Y) + pojedynczy token ^\\d{3,4}-\\d{2}$. Expert description-blind. Bez Slice D / A1 / pricing / HTTP. Test: test-ik-knr-ft10-secondary-tablecode.mjs.",
      },
    ],
  },
  {
    date: "2026-08-22",
    version: "2.66.111",
    label: "IK-KNR KL-7-P1 — KNR details / history / offline update",
    items: [
      {
        type: "new",
        text: "KL-7-P1: szczegóły Katalogu KNR · append-only history (cap 50) · offline proposed update + diff (SAME_HASH/DIFF_REVIEW/CONFLICT) · VERIFIED tylko przez KL-6 supersede. Zero HTTP/scraper/PLN/KNR→KNR-W/12J. Test: test-knr-catalog-p1.mjs.",
      },
    ],
  },
  {
    date: "2026-08-21",
    version: "2.66.110",
    label: "IK-KNR KL-7-P0 — Cloud KNR SSOT + CATALOG_HIT",
    items: [
      {
        type: "new",
        text: "KL-7-P0: kw-knr-catalog w cloud-sync (deferred) + per-entry merge anti-wipe · CATALOG_HIT = VERIFIED+ACTIVE · push po Owner VERIFY (best-effort). Cloud ≠ authority. Zero discovery/HTTP/PLN/KNR→KNR-W/12J. Test: test-knr-catalog-cloud-p0.mjs.",
      },
    ],
  },
  {
    date: "2026-08-21",
    version: "2.66.109",
    label: "IK-KNR KL-7-UX-1 — Katalog KNR (Firma, read-only)",
    items: [
      {
        type: "new",
        text: "KL-7-UX-1: Przetargi → Firma → Katalog KNR (4. katalog). REUSE catalog-shared (toolbar/pager/freshness). Read-only local/fixture · zero HTTP/discovery/VERIFY/cloud write · zero PLN/OUR RATE/marża. Test: test-knr-catalog-ui-kl7-ux1.mjs.",
      },
    ],
  },
  {
    date: "2026-08-19",
    version: "2.66.103",
    label: "PAYROLL P0 — FE O2 CAS-ready client",
    items: [
      {
        type: "improve",
        text: "Lista płac — klient CAS-ready (FE O2): Worker extraCosts przez pwrPush (payrollWeekCas + expectedRevision), bez forceReplace i bez silent catch. Admin ten sam tor. Kompatybilne ze starym Edge (O1 jeszcze nie wdrożone). Test: test-payroll-worker-o1-o2.mjs (27).",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.102",
    label: "Odbiory WM — Rysunki door-swing + grubość ścian",
    items: [
      {
        type: "improve",
        text: "Rysunki WM: jeden tool Drzwi (canonical door-swing, bez P/W). Legacy door-room / door-entrance → door-swing (normalize-on-read). Ściana: chipy Zewnętrzna (8) / Działowa (4) — session only. Prostokąt bierze aktywną grubość. Library v4. Test: test-wm-rysunki-01-p3a.mjs.",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.101",
    label: "IK-KNR-EXPERT Slice D — Owner KNR mapping",
    items: [
      {
        type: "improve",
        text: "IK-KNR-EXPERT Slice D (Owner GO): Owner-confirmed KNR → CatalogWork — exact tabela w kodzie, overlay catalogWorkId na kopii linii Master BOQ dla istniejącego P3. Zero mutation bez legalnego HIT. Zero knrHint / mapper / A1-call / Research / nowych flag. Test: test-ik-knr-expert-slice-d.mjs.",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.100",
    label: "IK-KNR-EXPERT Slice C3 — KNR host + chrome",
    items: [
      {
        type: "improve",
        text: "IK-KNR-EXPERT Slice C3 (Owner GO): KNR podpięty do istniejącego IkEntryHost — opts.knr + IkExpertRoomChrome nad istniejącą ExpertConversationSurface. Aktor Knr, lokalny collapse, zero Hub/mapper/A1/Research/nowych flag. Test: test-ik-knr-expert-slice-c3.mjs (T-ROOM-1…30).",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.99",
    label: "IK-KNR-EXPERT Slice C2 — KNR conversation adapter",
    items: [
      {
        type: "improve",
        text: "IK-KNR-EXPERT Slice C2 (Owner GO): buildIkKnrConversation — IkKnrExpertReport → max 3 kroki laik + max 3 examplesHold. Zero host/chrome/Hub/actorFromStep, zero catalogWorkId/knrHint/mapper/A1/Research, zero nowych flag. Test: test-ik-knr-expert-slice-c2.mjs (T-ROOM-C2-1…18).",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.96",
    label: "IK Role Activation",
    items: [
      {
        type: "improve",
        text: "IK Role Activation (Owner GO): Super Admin ALWAYS ON. Administrator / Moderator — dostęp do IK osobnymi flagami (domyślnie OFF), sterowane z ⚙. Inspector / worker / brak sesji — OFF. Leftover ikEntryEnabled nie blokuje Super Admina. A08-P2 UNCHANGED. Test: test-ik-role-activation.mjs.",
      },
    ],
  },
  {
    date: "2026-08-18",
    version: "2.66.95",
    label: "IK AUTONOMY-08 P2 Research-on-Miss",
    items: [
      {
        type: "improve",
        text: "IK AUTONOMY-08 P2 (Owner GO): Research-on-Miss autonomy. IK ON ∧ P5/P6 AUTO|ON → executeResearch permitted; HTTP tylko na prawdziwy MISS. Bez dodatkowego przełącznika Research (checkboxy Technical usunięte). COMPOUND/UNKNOWN/BOTH/UNRESOLVED HOLD. Research ≠ Accept. P5 settled (laborSettledRef) przed P6. Test: test-ik-autonomy-08-p2-research-on-miss.mjs.",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.94",
    label: "IK AUTONOMY-08 P1 Settings Unification",
    items: [
      {
        type: "improve",
        text: "IK AUTONOMY-08 P1 (Owner GO): Super Admin ⚙ — jedyny biznesowy switch IK = ikEntryEnabled. P3–P8 + Research przeniesione do TECHNICAL / ADVANCED / EMERGENCY (collapsed, dzieci w DOM). AUTO_INGEST nie wraca. D HARD STOP osobno. AppSettings/KV/runtime A05–A08/P0 UNCHANGED. Test: test-ik-autonomy-08-p1-settings-unification.mjs.",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.93",
    label: "IK AUTONOMY-08 P0 Documents → BOQ Autonomous Activation",
    items: [
      {
        type: "improve",
        text: "IK AUTONOMY-08 P0 (Owner GO OD-08-1): IK ON implikuje Documents→BOQ. isIkP2DocumentsBoqActive := ikEntryEnabled === true. IkEntryHost gating przez helper (nie ikAutoIngestEnabled). Leftover klucz zostaje w AppSettings bez migracji KV. Admin: usunięty checkbox AUTO_INGEST. Research/Accept/P7/P8/D/A05–A07 UNCHANGED. Test: test-ik-autonomy-08-p0-documents-boq.mjs.",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.92",
    label: "IK AUTONOMY-07 P8 Autonomous Risk / Decision Prepare",
    items: [
      {
        type: "new",
        text: "IK AUTONOMY-07 (Owner GO): P8 ikRiskDecisionE2eEnabled = AUTO|OFF|ON (ta sama klucz, bez nowej flagi). AUTO/ON = autonomiczne przygotowanie read-only (Risk overlay → Validation → DW in-memory). OFF = kill-switch (OFF wygrywa w merge). B-POLICY: true→ON, missing/false/malformed→AUTO. Bez nowej bramki BOQ. Research/Accept/Price Commit/Final Bid/D/Chief bez zmian. P1 CLOSED · P2 KEEP GAP · Composite CLOSED · P7 UNCHANGED · CatalogWork 471. Test: test-ik-autonomy-07-p8-autonomous-risk-decision.mjs.",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.91",
    label: "IK AUTONOMY-06 P7 Autonomous Bid Calculation",
    items: [
      {
        type: "new",
        text: "IK AUTONOMY-06 (Owner GO): P7 ikF5E2eEnabled = AUTO|OFF|ON (ta sama klucz, bez nowej flagi). AUTO/ON = autonomiczna kalkulacja read-only (Position Cost → F5 → Bid in-memory). OFF = kill-switch (OFF wygrywa w merge). B-POLICY: true→ON, missing/false→AUTO. Research/Accept/Price Commit/Final Bid/D bez zmian. P1 CLOSED · P2 KEEP GAP · Composite CLOSED · feedsP7Bid=false · CatalogWork 471. Test: test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs (T01–T32).",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.90",
    label: "IK AUTONOMY-05 Explicit AUTO / OFF / ON",
    items: [
      {
        type: "new",
        text: "IK AUTONOMY-05 (Owner GO): P5/P6 levers = AUTO|OFF|ON (te same klucze, bez nowej flagi). AUTO/ON = read-only MODE A (executeResearch=false). OFF = jawny kill-switch (OFF wygrywa w merge). Legacy B-POLICY: true→ON, missing/false→AUTO. Research/Accept/Price Commit/Final Bid/D bez zmian. P1 CLOSED · P2 KEEP GAP · Composite CLOSED · CatalogWork 471. Test: test-ik-autonomy-05-explicit-auto-off-on.mjs (T01–T25).",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.89",
    label: "IK Composite Position Orchestration",
    items: [
      {
        type: "new",
        text: "IK COMPOSITE (Owner GO): konsument BOTH_HOLD w IkEntryHost — decomp → TechnologyPack → leaf Material/Labor → PositionCostInput → computePositionCost (NO CHANGE). Start tylko P5∧P6 (bez nowej flagi). Classification Gate rodzica UNCHANGED. GAP ≠ 0 PLN · zero auto-Accept · XOR F5. P1/P2/D/CatalogWork 471 nienaruszone. Test: test-ik-composite-position-orchestration.mjs (T01–T20).",
      },
    ],
  },
  {
    date: "2026-08-17",
    version: "2.66.88",
    label: "IK P1 Invoice Host Collision",
    items: [
      {
        type: "fix",
        text: "IK P1 (Owner GO): G1 — Product Mapper wyklucza cw.inv.* z scoringu BOQ (isInvoicePurchaseCatalogWorkId w mapOfferBoqLineCore). G2 — mat.inv.* HARD-FORBID DIY Research (researchEligible + assertMaterialResearchAllowed przed mat.* allow). PM CURRENT reuse przed gate. CatalogWork 471 · D unchanged · ZERO nowych silników. Test: test-ik-p1-invoice-host-collision.mjs.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.87",
    label: "IK-MIGRATION-01 P10 NG-10 → IK first-screen",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P10 (Owner GO): NG-10 Autonomous Gate/Run/Outcome DECOMMISSION. /przetarg first-screen = IkEntryHost (ikEntryEnabled default ON). TRE-01: auto Outcome-first SUPERSEDED — Recovery CTA dla Expert ON oraz Expert OFF+sliceA; Outcome tylko po CTA. IK≠D · CatalogWork 471 UNTOUCHED · ZERO nowych silników. Test: test-ik-migration-01-p10-implementation.mjs (A10).",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.86",
    label: "IK-MIGRATION-01 P9 Owner Verify",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P9 (Owner GO): Owner Verify live tender 08def45d… — Gate A → Gate B → Owner Verify. REUSE Truth Gates. BRAK ikP9* lever. D snapshot/diff=0 · RESEARCH=0 · ACCEPT=0 · CatalogWork 471 UNTOUCHED. Marker UI na Tender Detail. Controlled Owner Verify = ręczny. STOP — bez auto P10.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.85",
    label: "IK-MIGRATION-01 P8 Risk → Decision",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P8 (Owner GO): Risk overlay → Validation → P4 Chief → Decision Workspace → EC pod IK — ikRiskDecisionE2eEnabled (default OFF). REUSE tender-intelligence-overlay / validation-expert / buildDecisionWorkspaceViewModel / P4 Chief. RESEARCH=0 · HTTP=0 · CatalogWork 471 UNTOUCHED · zero auto-Accept · IK≠D. Prod: P8 OFF. STOP — bez auto P9.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.84",
    label: "IK-MIGRATION-01 P7 Position Cost → Bid",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P7 (Owner GO): Position Cost → F5 cutover → Bid → SUM → EC pod IK — ikF5E2eEnabled (default OFF). REUSE boq-shadow-adapter / bid-position-cost-cutover / computeTenderBidProposal / PackageGate / aggregatePackageDirect. RESEARCH=0 · HTTP=0 · CatalogWork 471 READ · Price Memory READ · zero Accept. Prod: P7 OFF. STOP — bez auto P8.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.83",
    label: "IK-MIGRATION-01 P6 Material E2E",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P6 (Owner GO): Material E2E pod IK — ikMaterialE2eEnabled / ikMaterialResearchEnabled (default OFF). MODE A = Price Memory + identity (0 HTTP). MODE B = selective DIY tylko przy executeResearch===true + budget MMR-02 (≤8 claims / ≤24 shop HTTP). Accept → Price Memory. Zero auto-Accept · CatalogWork 471 UNTOUCHED · F5=P7. Prod: P6 OFF. STOP — bez auto P7.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.82",
    label: "IK-MIGRATION-01 P5 Labor E2E",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P5 (Owner GO): Labor E2E pod IK — ikLaborE2eEnabled / ikLaborResearchEnabled (default OFF). MODE A = CURRENT + internal-first (0 HTTP). MODE B = selective research tylko przy executeResearch===true + budget 24/4. REUSE P5.26-E matcher. Zero auto-Accept · Material=P6 · F5=P7. Prod: P5 OFF. STOP — bez auto P6.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.81",
    label: "IK-MIGRATION-01 P4 Chief Wiring",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P4 (Owner GO): Chief Wiring pod IK — AppSettings.ikChiefWiringEnabled (default OFF), seam IK ON ∧ P4 ON ∧ pricingReady → useChiefOrchestratorSession (REUSE T1–T6). IK ≠ D (nie flipuje expertAiDecydentEnabled). EXECUTE_RESEARCH/RUN_RATE_EXPERTS OFF. Labor=P5 · Material=P6. Prod: P4 OFF. STOP — bez auto P5.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.80",
    label: "IK-MIGRATION-01 P3 Classification + Identity",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P3 (Owner GO): A1 Classification → Identity → handoff → STOP. Jedyny lever IDENTITY_COVERAGE (AppSettings.ikIdentityCoverageEnabled, default OFF). P2 READY → klasyfikacja sync (0 HTTP). Coverage ON = diagnostyka identity bez research/Accept/CatalogWrite/F5/Bid. EXECUTE_RESEARCH i RUN_RATE_EXPERTS pozostają OFF. REUSE classification-gate + ik-identity-coverage. Prod: coverage OFF. STOP — bez auto P4.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.79",
    label: "IK-MIGRATION-01 P2 Documents→BOQ controlled AUTO_INGEST",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P2 (Owner GO): kontrolowany AUTO_INGEST (AppSettings.ikAutoIngestEnabled, default OFF). IK ON ∧ AUTO ON → NG-02 ingest → Document Expert → OfferBoq/Master BOQ (READY|PARTIAL|HOLD|GAP). IK ON samo = Entry Shell. EXECUTE_RESEARCH/RUN_RATE_EXPERTS/IDENTITY_COVERAGE pozostają OFF. REUSE — zero V2. Prod: AUTO OFF. STOP — bez auto P3.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.78",
    label: "IK-MIGRATION-01 P1 entry shell harden",
    items: [
      {
        type: "fix",
        text: "IK-MIGRATION-01 P1 (Owner GO): R1 harden — IkEntryHost Entry Shell: AUTO_INGEST/EXECUTE_RESEARCH/RUN_RATE_EXPERTS/IDENTITY_COVERAGE default OFF. IK ON = EC + pipeline facts only (bez HTTP research, bez cloud ingest write). ikEntryEnabled OFF = NG-10 UNCHANGED. Chief ≠ D. Plumbing P2.5/P5 zachowany za guardami.",
      },
    ],
  },
  {
    date: "2026-08-16",
    version: "2.66.77",
    label: "IK-MIGRATION-01 P0 Design Freeze implementation",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P0 (Owner GO): kontrakt IkConversationEvent + AD-IK-M05 (sourceRef wymagany dla faktu zweryfikowanego; enforce done→hold bez sourceRef). REUSE ikEntryEnabled OFF / DetailPage seam / ExpertConversationSurface. Touch EC 44px. Chief ≠ D. NG-10 retained. Test: test-ik-migration-01-p0-implementation.mjs. STOP — bez auto P1.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.76",
    label: "IK P5.16-B Commercial pricing contract",
    items: [
      {
        type: "fix",
        text: "IK-MIGRATION-01 P5.16-B (Owner GO): Labor C1 — Accept zapisuje marketBase jako OUR RATE; SELL = computeSellPricePln w resolveLaborInputFromOurWorkRate (bez double margin). Zaprawianie → OWNER_APPROVED_LABOR_ONLY. Zawór → MATERIAL_SUPPLY thin Work-Quotes→SELL (bez invent mat.*/BOM). ikEntryEnabled OFF · NG-10 RETAINED · F5/Bid/PDF UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.75",
    label: "IK P5.13 Material research entry",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5.13: Material Demand (MATERIAL + Work Identity) może wejść w Supplier Research bez pre-existing mat.* — klucz demand.work.<workId> · Price Memory po Accept na catalogWorkId. ZERO invent mat.*/auto-Accept · zaprawianie LABOR bez zmian. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.74",
    label: "IK P5.11 Zaprawianie COMPOUND→LABOR",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5.11: Owner GO — cc-p0c-w1-zaprawianie-bruzd COMPOUND→LABOR; usunięte MATERIALS_REQUIRED/Wave1 pending (folia bez zmian). P4-REAL: 4 linie → Candidate 20 PLN/mb (Accept REQUIRED). ZERO invent/auto-Accept. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.73",
    label: "IK P5.9 Material identity Owner norm",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5.9: identity-only — Wave1 zaprawianie pozostaje PENDING_OWNER_NORM (brak materialKey+qtyFactor; 0 packs). Zawór = PRODUCT_IDENTITY_GAP (brak mat.*/cw.product.*). ZERO invent/pricing/research. Harness A–Q. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.72",
    label: "IK P5-REAL Material Expert (ZZK focus)",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5-REAL: Material Expert na ZZK — focus 2 MATERIAL + 4 COMPOUND → NO_MATERIAL_COMPONENT (brak mat.*, Wave1 PENDING). ZERO invent/auto-Accept. Harness: Accept + second Price Memory HIT. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.71",
    label: "IK P4-REAL Labor Expert (44 trusted Work)",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P4-REAL: Labor Expert na 44 trusted Work (ZZK) — CURRENT HIT/MISS, research tylko LABOR+MISS, ZERO invent/auto-Accept. Live: 31 HIT · 7 GAP · 0 candidates. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.70",
    label: "IK P5.7 Owner unit compatibility (otw./aparat ↔ szt)",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5.7: Owner GO — lokalna kompatybilność jednostek dla 2 Work ID (otw.↔szt / aparat↔szt). Bez globalnego normalizeWgdomCostUnit. TRUSTED WORK 34→44 na ZZK. Qty/sourceUnit zachowane. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.69",
    label: "IK P5.6 Wave 2 Work Identity seed audit",
    items: [
      {
        type: "improve",
        text: "IK-MIGRATION-01 P5.6: Wave 2 seed audit — prod Work Catalog już ma 8/8 W2 + Quotes; ZERO nowych fake works. Coverage z katalogiem: TRUSTED WORK 34 (vs 0 przy pustym LS). INVALID_UNIT (otw./aparat) = OWNER_REVIEW. ikEntryEnabled OFF · NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.68",
    label: "IK P5.5 Identity Coverage (audit · ZERO invent)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P5.5: Identity Coverage audit na Master BOQ — Product Mapper + Alias Pack + Material exact. ZERO invent/fuzzy/pricing/research. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.67",
    label: "IK P5 Material Expert (identity → Price Memory / research)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P5: Material Expert — resolveDemandProductIdentityExact → evaluateMaterialCache → executeMaterialResearchPhase2 tylko identity+MISS. ZERO auto-Accept / invent z namePl / F5. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.66",
    label: "IK P4 Labor Expert (identity → CURRENT / research)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P4: Labor Expert — mapOfferBoqLine → work identity → classify A1 → lookupWorkRate → runIkLaborGapResearch tylko LABOR+MISS. ZERO auto-Accept / Material / F5. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.65",
    label: "IK P3 Classification Gate (Master BOQ → plane)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P3: Classification Gate na Master BOQ (classifyEstimatorPricingPlane A1) — plane LABOR/MATERIAL/COMPOUND/UNKNOWN, handoff do ekspertów bez research/wyceny. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.64",
    label: "IK P2.75-B Owner dwelling map → Master BOQ READY",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P2.75-B: jawna Owner map (documentToDwelling) na ZZK pustostany → compose wszystkich lokali + integralność linii. Hint filename ≠ SSOT. Wentylacja = common dwelling. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
      {
        type: "fix",
        text: "Branch hint: budowlany/el; puste parse EXCLUDE (nie HOLD całego lokalu); LP markup → sanitize; raw vs extractable explained gdy integrity OK.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.63",
    label: "IK P2.75 dwelling mapping (Owner documentToDwelling)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P2.75: MULTI-BOQ → dwelling REUSE documentToDwelling (Owner). Filename = evidence only, never silent SSOT. Multi-source bez mapy → PARTIAL/HOLD (nie READY). Integralność linii + KEEP ONE. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.62",
    label: "IK P2.5 NG-02 ingest bridge (real BOQ extraction)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P2.5: mostek na istniejący NG-02 heavy (buildTenderDossierHeavy) — ZIP→ATH/XLS/PDF→dossier→Document Expert. Na realnym ZZK pustostany extraction > 0. ZERO nowego parsera / ATH writer / research. Flaga ikEntryEnabled default OFF. NG-10 RETAINED.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.61",
    label: "IK Document Expert P2 (Master BOQ orchestration)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P2: Document Expert — discovery ról dokumentów → identyfikacja kosztorysów/przedmiarów → extraction/walidacja → Master BOQ (OfferBoq v5 + multi-boq compose + lineProvenance). HOLD/PARTIAL tylko przy realnej luce danych. ZERO Labor/Material research, ZERO ATH writer, ZERO delete NG-10. Flaga ikEntryEnabled default OFF.",
      },
    ],
  },
  {
    date: "2026-08-15",
    version: "2.66.60",
    label: "IK Entry Shell P1 (NG-10 controlled replacement)",
    items: [
      {
        type: "new",
        text: "IK-MIGRATION-01 P1: flaga ikEntryEnabled (AppSettings, default OFF, niezależna od Expert AI / D). /przetarg OFF = NG-10 1:1; ON = IkEntryHost + ExpertConversationSurface z faktami pipeline (dokumenty / SWZ / BOQ status). ZERO delete NG-10. ZERO research / F5 / ATH writer. Produkcja: flaga OFF.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.59",
    label: "PASS2 CR discovery amendment (local)",
    items: [
      {
        type: "improve",
        text: "IE-LABOR IR Wave-1 PASS2/CR DISCOVERY AMENDMENT (local, undeployed): CennikRemontow PASS2 electrical→instalacje-elektryczne-cennik (Tablica) · plumbing→instalacje-wodno-kanalizacyjno-gazowe-cennik (Podejście) · family routing tablica/podejście · Edge allowlist mirror · Wykwity HOLD (no repairs PASS2) · ZERO new hosts/mappings/aliases · ZERO Accept / OUR RATE / margin · SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.58",
    label: "IE Labor Selective Research Identity-Ready Wave-1 (local)",
    items: [
      {
        type: "new",
        text: "IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1 (local, undeployed): jeden batch 3 LABOR (Tablica · Podejście · Wykwity) · A1 preflight→FETCH→PARSE→IDENTITY→SCOPE→QUALIFY · A2 partial UNION APPEND Evidence · A3 Wave-1 exact_normalized / D1 synonym · KEEP-4 only · ZERO Accept / OUR RATE / margin / Catalog mutate / new hosts / new mappings · SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.57",
    label: "Intelligent Estimator Classification Gate (local)",
    items: [
      {
        type: "new",
        text: "INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE (local, undeployed): SSOT classifyEstimatorPricingPlane · Owner map 29 LABOR / 24 MATERIAL / 6 COMPOUND / 30 UNKNOWN · miss→UNKNOWN · A2 hard guard w runSelectiveWorkRateResearch · A3 material research guards (wire/orchestrate/refresh) · A4 BRAK_STAWKI_ROBOT tylko LABOR · A5 bez Material Catalog KV · ZERO Evidence populate / Catalog write / Accept / OUR RATE / margin / hosts / PASS2 · SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.56",
    label: "Labor identity Wave-1 mappings (local)",
    items: [
      {
        type: "new",
        text: "WR-LABOR-IDENTITY-MAPPING-WAVE-1 (local, undeployed): 2 Owner-approved exact_normalized mappings — Tablica←Montaż skrzynki rozdzielczej · Podejście←Wykonanie podejścia wodno-kanalizacyjnego (CR) · HOLD: oprawa/zawór/gniazdo/wyłącznik/white/demolition/waste · ZERO Evidence populate / Catalog / Accept / OUR RATE / hosts / PASS2 · SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.55",
    label: "Labor identity mapping (local)",
    items: [
      {
        type: "new",
        text: "WR-LABOR-IDENTITY-MAPPING-01 (local, undeployed): Hybrid C identity gate · exact_normalized · catalogUnit+observedUnit · legacy buckets FORBIDDEN · alias cap 12 · ambiguity→UNMATCHED · REUSE D1 synonyms/scope · ZERO Evidence populate / Catalog / Accept / OUR RATE / hosts / PASS2 / qualify / median · SOURCE GAP OPEN · NICHE NOT CLAIMED.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.54",
    label: "Labor source evidence DB (local)",
    items: [
      {
        type: "new",
        text: "WR-SOURCE-EVIDENCE-DB-01 (local, undeployed): osobny SSOT kw-wgdom-labor-source-evidence · schema+provenance+dedupeKey · union-by-dedupeKey · etag/CAS · caps 8000/80/2000/200 · UNMATCHED STORE · REUSE D1 identity/scope · ZERO UI/hosts/import/Accept/OUR RATE/margin/Work Catalog mutate · SOURCE GAP OPEN · NICHE NOT CLAIMED.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.53",
    label: "Labor evidence quality D1 (local)",
    items: [
      {
        type: "improve",
        text: "WR-LABOR-EVIDENCE-QUALITY-01 D1 (local, undeployed): plaster gladzenie_scian Owner synonyms · painting walls_ceilings scopeTag przed medianą · grooves KEEP · ZERO threshold/qualify/median rewrite · ZERO Accept/OUR RATE/margin/PASS2 MAX/hosts · C catalog split DEFERRED · SOURCE GAP OPEN · NICHE NOT CLAIMED.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.52",
    label: "PASS2 Allowlist Wave-1 (local)",
    items: [
      {
        type: "new",
        text: "WR-PASS2-ALLOWLIST-WAVE-1 Option D (local, undeployed): kb_pl grooves KEEP + plaster L1 · cennikremontow painting P1 · MAX=2 · synonym „szpachlowanie bruzd po kablach” KEEP · repairs/sealing DEFER · ZERO new hosts · F5/qualify/median/Accept/OUR RATE/margin UNCHANGED · SOURCE GAP OPEN · NICHE NOT CLAIMED.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.51",
    label: "Work catalog migration safety (local)",
    items: [
      {
        type: "fix",
        text: "WORK-CATALOG-MIGRATION-SAFETY-01 — pusta sesja / 34× legacy-* NIE nadpisuje authoritative Work Catalog (merge + persist + bootstrap). Brak twardego 460. Legalna migracja tylko gdy chmura pusta. Marża/OUR RATE/Accept UNCHANGED. SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.50",
    label: "Catalog UI unification (local)",
    items: [
      {
        type: "improve",
        text: "WORK-RATE-CATALOG-UI-UNIFICATION-01 — Nasz Katalog Robót: ten sam chrome co Nasz katalog cen (filtry/search/pager 100/tabela/footer/marża Zapisz). Shared CommercialMarginEditor + GlobalBar. Labor rows = active ∧ ¬materialHost. Global labor IDs = cały dataset (nie rows.map). Stawka z marżą = computeSellPricePln (derived, ≠ OUR RATE). Materiały: ten sam editor/parser + listMaterialWorkIdsForCommercialMarginFloor. Bez seed marży / Accept / W2. SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.49",
    label: "Labor global minimum margin (local)",
    items: [
      {
        type: "new",
        text: "Nasz Katalog Robót — Super Admin: Minimalna marża dla wszystkich robót (MAX z per-work, REUSE applyGlobalCommercialMarginFloor). Tylko aktywne labor IDs (bez material host). Bez seed / Bid / OUR RATE / Accept. 2.66.48 per-work UNCHANGED. SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.48",
    label: "Labor commercial margin UI (local)",
    items: [
      {
        type: "new",
        text: "WORK-RATE KB-BRUZDY — Nasz Katalog Robót: per-work Marża WGDOM (%) (REUSE commercialPricing / updateCommercialMargin). UNKNOWN do Owner Zapisz · bez seed/auto-margin/global floor labor · companyPrice ≠ marża · Accept/OUR RATE UNCHANGED · SOURCE GAP OPEN.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.47",
    label: "Work Rate KB Bruzdy Policy-01 (local)",
    items: [
      {
        type: "new",
        text: "WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01 (local, undeployed): Owner synonym „szpachlowanie bruzd po kablach” · PASS2 KB national repairs URL (grooves) · range 15–25 → marketBase 20 (DERIVED) · REUSE commercialPricing/computeSellPricePln → proposed OUR RATE · NATIONAL/POLSKA (bez silent WROCLAW) · Evidence 3-warstwy · UI Owner review · width NOT_SPECIFIED · SOURCE GAP OPEN do PV · F5/qualify/median/Accept boundary UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-14",
    version: "2.66.46",
    label: "Work Rate Research Discovery-01 INFRA PASS2 (local)",
    items: [
      {
        type: "new",
        text: "WORK-RATE-RESEARCH-DISCOVERY-01 INFRA PASS2 (local, undeployed): Owner-curated category URL allowlist plumbing — client→sourceId+categoryKey (nigdy URL) · Edge resolve · PASS1 canonical zachowany · pusta allowlista = PASS1 only · synonimy Owner-only (match) · telemetry NO_PAGE_HIT/PARSE_EMPTY/… · Evidence provenance · ZERO invent PLN · ZERO niche claim (wykwity/bruzdy/folia = SOURCE GAP OPEN) · F5/qualify/Accept/OUR RATE UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-13",
    version: "2.66.45",
    label: "IK E2E wire W0–W2 + Labor Expert Recommendation (local)",
    items: [
      {
        type: "new",
        text: "INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W0–W2 (local, undeployed): po Owner Accept dual bump (pricingCatalogRevision + chiefRefreshNonce) → F5 recompute; gap inventory BRAK_STAWKI_ROBOT; Hub selective research → Candidate → Owner Accept → ourWorkRate → CURRENT REUSE. F5/mapper/qualify/accept engine UNCHANGED · ZERO companyPrice→OUR RATE · materiały W3 później · live CANDIDATE proof nadal pending (research-data coverage).",
      },
      {
        type: "new",
        text: "IK-LABOR-EXPERT-REC-01 (local): Labor Rate Evidence Pack + RO expert recommendation (stance/confidence/findings · provenance · delta vs previous OUR RATE). Anti-invent: candidateRatePln = suggestedRatePln only · companyPrice excluded · expertMayWrite/Accept=false · aiAutoAccept=false · Owner = jedyna Accept authority · istniejący Accept path bez zmian.",
      },
    ],
  },
  {
    date: "2026-08-13",
    version: "2.66.44",
    label: "Multi-BOQ work identity + LABOR_ONLY F5 wire",
    items: [
      {
        type: "new",
        text: "MULTI-BOQ-WORK-IDENTITY-01: Multi-BOQ compose → mapOfferBoqDocument → trusted catalogWorkId → F5 (bez nowego matchera). OUR-RATE-BOM-COVERAGE-01: jawne LABOR_ONLY (Owner allowlist) → materials[] puste · BOM nie wymagany · MISSING_BOM ≠ labor-only. Wave 1 MATERIALS_REQUIRED = pending Owner normy / GAP. companyPricePln ≠ OUR RATE.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.43",
    label: "C-MODE-1a — usunięcie legacy Bid fallback",
    items: [
      {
        type: "fix",
        text: "C-MODE-1a: OfferBoq null → jawny GAP (bez ath_priced / catalog / companyPricePln). F5 Position Cost UNCHANGED · ATH KEEP INPUT · legacy catalog KEEP TECHNICAL.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.42",
    label: "Position Cost — Bid cutover (Faza 5)",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 5: OfferBoq → Position Cost (OUR RATE+BOM+SELL) → Bid stack (Kp/profit/minMargin bez zmian). Cutover gate · jawne GAP · ZERO companyPricePln · ZERO HTTP. ATH/catalog untouched (F6).",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.41",
    label: "Position Cost — BOQ shadow (Faza 4)",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 4: OfferBoq/przedmiar → work identity → OUR RATE + BOM + Price Memory SELL → Position Cost (SHADOW). Bez cutover Bid/Offer · jawne GAP · ZERO companyPricePln · ZERO HTTP. F5 tylko Owner GO.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.40",
    label: "Position Cost — BOM / Technology (Faza 3)",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 3: workId → TechnologyPack/BOM (qtyFactor×qty) → Price Memory SELL + OUR RATE → Position Cost. C-BOM-1…5 · bez invent norm · ZERO Bid/Offer cutover · ZERO HTTP. F4+ nie w tym releasie.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.39",
    label: "Position Cost — materiał SELL (Faza 2)",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 2: materialKey → Price Memory → commercialPricing → computeSellPricePln → Position Cost. C-MID-1 · C-PRICE-1 · C-MARGIN-1 · bez BOM · ZERO Bid/Offer cutover · ZERO HTTP. F3+ nie w tym releasie.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.38",
    label: "Position Cost — OUR RATE (Faza 1)",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 1: Nasz Katalog Robót → lookupWorkRate (CURRENT/STALE/MISSING) → computePositionCost. C-EMPTY · C-CPLN-1 · ZERO HTTP/research · bez Bid/Offer/Price Memory cutover. F2+ nie w tym releasie.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.37",
    label: "Position Cost Engine (Faza 0) — pure lib",
    items: [
      {
        type: "new",
        text: "TENDER-BOQ-PRICING-REBUILD-01 FAZA 0: pure Position Cost Engine (labor OUR RATE × qty + Σ material SELL × qty). ZERO HTTP · bez Bid/Offer/Price Memory/Work Rate lookup · bez companyPricePln. F1+ nie w tym releasie.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.36",
    label: "Stawki robót — parser realnych cenników",
    items: [
      {
        type: "fix",
        text: "WORK-RATE-REAL-WORLD-VALIDATION-03: parser tabel KB.pl / Extradom / CennikRemontow + kanoniczne URL cenników. SCCOT ceny „od …” i pakiety pokoi → REJECT. Selective ONE work · bez full catalogue. Bid/Offer/Price Memory UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.35",
    label: "Stawki robót — selective research rynkowy (P2)",
    items: [
      {
        type: "new",
        text: "WORK-RATE-SELECTIVE-RESEARCH-02: Aktualizuj stawkę rynkową dla jednej roboty (KB.pl / SCCOT / Extradom / CennikRemontow.pl) → kwalifikacja labor-only → mediana → Owner Accept → OUR RATE. CACHE-FIRST, bez full catalogue, bez auto-zapisu. Bid/Offer/Price Memory/companyPricePln UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.34",
    label: "Stawki robót — Legal PASS (Owner)",
    items: [
      {
        type: "improve",
        text: "WORK_RATE_LEGAL_GATE = PASS (Owner Attestation): KB.pl, SCCOT, Extradom, CennikRemontow.pl VERIFIED. Selective research authorized · full catalogue FORBIDDEN · dowody prywatne poza repo. Brak adapterów/live HTTP (P2 osobno). Material Legal Gate UNCHANGED. Bid/Offer/companyPricePln/Price Memory ZERO TOUCH.",
      },
    ],
  },
  {
    date: "2026-08-12",
    version: "2.66.33",
    label: "Nasz Katalog Robót — UI Firma (P1)",
    items: [
      {
        type: "new",
        text: "WORK-CATALOG-REBUILD-01 P1: Firma → Nasz Katalog Robót — lista z Biblioteki, OUR RATE (AKTUALNA/PRZETERMINOWANA/BRAK STAWKI), Owner Edit, historia, filtry. Bez companyPricePln jako ceny, ZERO HTTP, research BLOCKED. Bid/Offer/Price Memory UNCHANGED.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.32",
    label: "Nasz Katalog Robót — fundament OUR RATE (P0)",
    items: [
      {
        type: "new",
        text: "WORK-CATALOG-REBUILD-01 P0: model OUR RATE na kw-wgdom-work-catalog (workId+unit), normalize C1, lookup cache-first ZERO HTTP, Owner edit bez companyPricePln, historia 24, freshness 90 dni, research BLOCKED. companyPricePln = TECHNICAL LEGACY FIELD (bez seed/fallback). Bid/Offer/Price Memory UNCHANGED. UI katalogu = P1.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.31",
    label: "Nasz katalog cen — czytelne etykiety PL",
    items: [
      {
        type: "improve",
        text: "PRICE-MEMORY-CATALOG-03 UI polish: AKTUALNA / PRZETERMINOWANA / BRAK CENY zamiast CURRENT/STALE/MISSING. Filtry, podsumowanie, kolumny i komunikaty po polsku. Logika Price Memory bez zmian.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.30",
    label: "Nasz katalog cen — 372 materiałów + status Price Memory",
    items: [
      {
        type: "fix",
        text: "PRICE-MEMORY-CATALOG-03: Firma → Nasz katalog = lista materiałów (seed 372), nie tylko HIT. Status CURRENT/STALE/MISSING. Ensure Zygmunt lokalnie (pushCloud=false). ZERO HTTP przy otwarciu. Labor nadal poza katalogiem.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.29",
    label: "Nasz katalog cen — tylko materiały",
    items: [
      {
        type: "fix",
        text: "PRICE-MEMORY-CATALOG-02: Firma → Nasz katalog cen pokazuje wyłącznie materiały (materialKey → identity → Price Memory). Usunięto catch-all CatalogWork→Quotes. Robocizna / montaż / pakiety robót poza katalogiem. Bez zmian Price Memory / companyPricePln / Bid.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.28",
    label: "Nasz katalog cen — warstwa handlowa Price Memory",
    items: [
      {
        type: "new",
        text: "PRICE-MEMORY-CATALOG-01: Firma → Nasz katalog cen — lista Price Memory, marża commercialPricing, globalna min (MAX), cena z marżą derived, force refresh ONE materialKey (także CURRENT) → Accept → commit. Bez drugiej bazy cen / full catalogue / wire Bid.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.27",
    label: "Real Source — selective live DIY adapters",
    items: [
      {
        type: "new",
        text: "LIVE-ADAPTERS-08: cienkie adaptery Leroy/Castorama/OBI — research tylko MISSING/STALE materialKey; direct+regular; średnia; Edge proxy mmr-diy-selective-lookup; CURRENT→REUSE 0 HTTP; bez katalogu/scrape masowego.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.26",
    label: "Real Source — Owner Legal PASS (LM/Casto/OBI)",
    items: [
      {
        type: "improve",
        text: "Legal Gate PASS + D1 VERIFIED (Owner Attestation Leroy/Castorama/OBI) — selective research uprawniony; liveHttpEligible=true; adaptery sklepów nadal ADAPTER_NOT_IMPLEMENTED (wymaga GO IMPLEMENT). Dowody prywatne Ownera — nie w repo.",
      },
    ],
  },
  {
    date: "2026-08-11",
    version: "2.66.25",
    label: "Price Memory — seed faktur Zygmunt",
    items: [
      {
        type: "new",
        text: "HISTORICAL PURCHASE seed z faktur Zygmunt → Price Memory (marketQuotes.wgdom + historia); 372 materialKey; cache-first REUSE; research live nadal zablokowany (Legal OPEN / D1 UNKNOWN). Bez scrapingu LM/Casto/OBI.",
      },
    ],
  },
  {
    date: "2026-08-10",
    version: "2.66.24",
    label: "Kosztorys — mokry jastrych cementowy V1",
    items: [
      {
        type: "new",
        text: "ECONOMY_WET_CEMENT_SCREED_V1: Atlas POSTAR 10 · 2.0 kg/m²/mm · mat.jastrych_cementowy · eligibility wet-only · qty = area × thickness × 2.0 (Option A). Bez dry/samopoziom/anhydryt.",
      },
    ],
  },
  {
    date: "2026-08-09",
    version: "2.66.23",
    label: "Price Intelligence — WGDOM approved ETICS",
    items: [
      {
        type: "improve",
        text: "PRICE-INTELLIGENCE-01 P3.1: zatwierdzone ceny WGDOM (4× ETICS) w marketQuotes + Purchase company knowledge; mirror kw-offer-boq-company-knowledge w DATA_KEYS. Bez SQL Price DB / zewnętrznych providerów / scrapingu.",
      },
    ],
  },
  {
    date: "2026-08-07",
    version: "2.66.22",
    label: "Katalog — Alias Wave 2 MED",
    items: [
      {
        type: "improve",
        text: "CATALOG-WAVE-2: 8 wąskich aliasów TOP100 (przebijanie, mocowanie aparatów, osprzęt, wykwity, oczyszczenie, GK, zawór odcinający, wnęki) + seed Library/Quotes. Cel TV-01 Quotes ≥82%. Bez AI-COST / Bid / S4.",
      },
    ],
  },
  {
    date: "2026-08-07",
    version: "2.66.21",
    label: "Przetargi — luki zakresu Stage A",
    items: [
      {
        type: "improve",
        text: "SCOPE-COMPLETENESS-01 Stage A (RO): silnik scope-completeness-a1, głębsze tokeny luk zakresu, cap 12. Flaga kw-scope-gap-mvp domyślnie OFF — nie zmienia wyceny ani oferty.",
      },
    ],
  },
  {
    date: "2026-08-06",
    version: "2.66.20",
    label: "Koszt — Knowledge Engine A0+A1",
    items: [
      {
        type: "new",
        text: "NG-TENDERS-COST-KNOWLEDGE-01 Thin Slice: KPI Harness (RO) + Library Fill seed + Quotes REUSE (feature tip 9c0901d6).",
      },
    ],
  },
  {
    date: "2026-08-06",
    version: "2.66.19",
    label: "Przetargi — start zawsze Przegląd",
    items: [
      {
        type: "fix",
        text: "Menu → Przetargi zawsze otwiera Przegląd (nie ostatnią zakładkę). DESIGN FREEZE kanoniczny start.",
      },
    ],
  },
  {
    date: "2026-08-06",
    version: "2.66.18",
    label: "Przetargi — Workspace v2 (P0)",
    items: [
      {
        type: "improve",
        text: "Przetargi: 4 zakładki — Przegląd · Kolejka · Mapa · Firma. Pulpit i dawna Strategia otwierają Przegląd; Biblioteka Robót w Firmie.",
      },
      {
        type: "fix",
        text: "Detal przetargu: bez paska zakładek modułu (wszystkie ekrany). Powrót przywraca poprzedni kontekst (Przegląd/Kolejka/…).",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.17",
    label: "Rysunki — cofnięcie Finalnego",
    items: [
      {
        type: "fix",
        text: "Odbiory→Rysunki: status Finalny↔Roboczy (toggle). Usunięcie Finalnego wymaga najpierw Roboczy (komunikat bez „demote”). Soft-delete używa roli z sesji admina.",
      },
      {
        type: "improve",
        text: "Audit WM Druk: drawing_finalized · drawing_unfinalized. ZIP Odbiory przelicza listę Final po cofnięciu statusu.",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.16",
    label: "Szkice — Publication Workflow (placement)",
    items: [
      {
        type: "new",
        text: "Dokumentacja→Szkice: zamiast Accept decyzje Admin — Do poprawy · Usuń · Dokumentacja · Odbiory · Dokumentacja+Odbiory (placement). Promote-copy 1:1 do Odbiorów bez zmiany A2. Pulpit zamyka sprawę po decyzji. Inspektor bez publikacji.",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.15",
    label: "Pulpit — Szkice Techniczne (P2a)",
    items: [
      {
        type: "new",
        text: "Pulpit Admin/Inspektor: sekcja Szkice Techniczne (job-centric) — oczekujące submitted/needs_changes, autor+rola+czas, Otwórz → Dokumentacja (nie Odbiory→Rysunki). Flaga Szkice pracownika OFF = ukryte. Badge panelu = ten sam licznik attention.",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.14",
    label: "Dokumentacja — Szkice Techniczne (review P0)",
    items: [
      {
        type: "new",
        text: "Dokumentacja robót → Szkice Techniczne (Admin/Inspektor): lista szkiców job, Needs Changes, Accept (tylko Admin); Worker: resubmit po „Do poprawy”; badge oczekujących; sort submitted→needs_changes→accepted→draft. Odbiory→Rysunki bez zmian (A2).",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.13",
    label: "Szkice — rysowanie Mobile First (P1)",
    items: [
      {
        type: "improve",
        text: "Rysunki / Szkice: ściana i strzałka — przeciągnij i puść (jeden gest na telefonie i desktopie); Ghost podczas gestu; Snap = siatka · kąt 45° · punkty końcowe.",
      },
      {
        type: "improve",
        text: "Szkice pracownika: Mobile Chrome (duże przyciski, bez PDF/zoom) + elementy drzwi/okno/wentylacja/rozdzielnia/piec (oprócz ściany i tekstu).",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.12",
    label: "Szkice pracownika — fundament P0",
    items: [
      {
        type: "new",
        text: "Panel pracownika → Dokumentacja → Szkice (flaga Super Admin ⚙ Moduły → Szkice pracownika, domyślnie OFF): tworzenie/edycja ściana+tekst, przesłanie do weryfikacji, soft-delete; ten sam silnik co Rysunki WM (kw-wm-technical-drawings).",
      },
      {
        type: "improve",
        text: "Rysunki WM: lista Odbiory→Rysunki ukrywa szkice robocze pracownika (non-final); usuwanie = soft-delete (anti-resurrection LWW).",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.11",
    label: "WM Druk — OST widoczny adres w PDF",
    items: [
      {
        type: "fix",
        text: "Odbiory WM: po wypełnieniu OST przebudowywane jest appearance (/AP) pól JOB_STREET, BUILDING i APARTMENT — adres widoczny w Chrome PDF Viewer (wcześniej tylko /V).",
      },
    ],
  },
  {
    date: "2026-08-05",
    version: "2.66.10",
    label: "WM Druk — OST zawsze w paczce ZIP",
    items: [
      {
        type: "improve",
        text: "Odbiory WM: aktywny formularz OST (pdf_form z wgranym plikiem) jest zawsze generowany on-the-fly i dołączany do ZIP Odbiory/ — niezależnie od odznaczenia; bez zapisu filled PDF.",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.09",
    label: "WM Druk — migracja mapowania OST",
    items: [
      {
        type: "fix",
        text: "WM Druk: historyczne sloty OST bez pdfFieldMapping dostają mapowanie adresu (JOB_STREET/BUILDING/APARTMENT) przy starcie/sync — bez zmian generatora PDF.",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.08",
    label: "Odbiory WM — formularz OST",
    items: [
      {
        type: "new",
        text: "WM Druk: slot OST (pdf_form) — wypełnienie adresu jak ZI w pipeline ZIP/download; aliasy BUILDING/APARTMENT tylko w mapowaniu pól; upload szablonu WM-Druk-OST.pdf w ustawieniach szablonów.",
      },
      {
        type: "fix",
        text: "pdf_form (nie-ZI): wypełnianie wyłącznie z mapowania szablonu — bez legacy mapy/indeksów LiveCycle ZI (OST bezpieczny).",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.07",
    label: "Worker — aparat i paragon mobile P1a",
    items: [
      {
        type: "fix",
        text: "Panel pracownika: aparat = 1 zdjęcie (bez multi+capture), galeria bez zmian; paragon osobno Aparat i Plik/PDF; wybór pliku przez HiddenFileInput (privacy shield nie zasłania pickera).",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.06",
    label: "Worker + Inspektor — viewport mobile P0",
    items: [
      {
        type: "fix",
        text: "Panel pracownika i inspektora: wysokość shell z visualViewport (--app-height), jak admin — mniej uciętego dolnego chrome na Safari/Android; bez zmian upload/capture/Cloud.",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.05",
    label: "Odbiory WM — Rysunki mobile P1",
    items: [
      {
        type: "improve",
        text: "Rysunki na telefonie: większe cele dotyku (hit edit-only + przyciski 44×44), pasek narzędzi przewijany, modal zamiast promptu (tekst/wymiar), menu Nowy rysunek w viewport — bez zmiany PDF/Cloud/JSON.",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.04",
    label: "Odbiory WM — Rysunki mobile P0",
    items: [
      {
        type: "improve",
        text: "Rysunki na telefonie: pełnoekranowy edytor (portal), blokada scrolla tła, zoom ± / Reset oraz przeciąganie widoku — bez konfliktu z gestem rysowania.",
      },
    ],
  },
  {
    date: "2026-08-04",
    version: "2.66.03",
    label: "Odbiory WM — Rysunki P3B.1 UX ścian",
    items: [
      {
        type: "fix",
        text: "Rysunki: po utworzeniu ściany podgląd Ghost znika — narzędzie Ściana zostaje aktywne. Kolejna ściana dopiero po nowym pierwszym kliknięciu (bez auto-łańcucha).",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.66.02",
    label: "Odbiory WM — Rysunki P3B podgląd ścian",
    items: [
      {
        type: "new",
        text: "Rysunki: Ghost Line przy rysowaniu ściany (podgląd + długość px / kratki). Ciągłe rysowanie od ostatniego punktu · Esc kończy. Podgląd tylko w edytorze — nie w PDF/ZIP/JSON.",
      },
      {
        type: "improve",
        text: "Ściana: odrzut zbyt krótkiego odcinka. Snap bez zmian. Ten sam renderDrawingSvg → PDF → ZIP.",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.66.01",
    label: "Odbiory WM — Rysunki P3A UX polish",
    items: [
      {
        type: "improve",
        text: "Rysunki: wentylacja W · drzwi P/W · rozdzielnia R · luka w ścianie tylko na rysunku · wymiar ze ściany (popup Długość). Ten sam SVG → PDF → ZIP.",
      },
      {
        type: "new",
        text: "Toolbar: Drzwi P / Drzwi W + Rozdzielnia. Hover ściany przy wstawianiu drzwi (tylko podgląd).",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.66.00",
    label: "Odbiory WM — Rysunki P3 w paczce ZIP",
    items: [
      {
        type: "new",
        text: "ZIP Odbiory: checkbox „Dołącz rysunki” → folder Rysunki/ (tylko Final). PDF = generateDrawingPdf (P2). Manifest + fingerprint additive.",
      },
      {
        type: "improve",
        text: "Fail-loud: błąd PDF blokuje cały ZIP. Nazwy RYSUNEK_… + _{shortId} przy kolizji. Audit drawing_zip_included.",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.65.99",
    label: "Odbiory WM — Rysunki P2 PDF export",
    items: [
      {
        type: "new",
        text: "Rysunki WM: Podgląd PDF · Pobierz PDF · Drukuj — jeden generator (SVG→PNG@2×→pdf-lib). A4/A3 portrait/landscape z arkusza. Nagłówek: nazwa roboty + data.",
      },
      {
        type: "improve",
        text: "Bez watermark/ZIP/CAD. Sesja Preview→Download→Print reuse bytes. SSOT: renderDrawingSvg. Audit drawing_pdf_exported.",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.65.98",
    label: "Odbiory WM — Rysunki P1B rollout (AppSettings)",
    items: [
      {
        type: "new",
        text: "Rysunki WM: Super Admin ⚙ → Moduły → Rysunki WM oraz mirror w WM → Ustawienia. SSOT: AppSettings.wmRysunkiEnabled (chmura). Domyślnie OFF.",
      },
      {
        type: "improve",
        text: "One-shot promote z legacy LS kw-wm-rysunki-01=1 → AppSettings (potem LS usuwane). FORCE OFF: LS=0. Toggle bez przeładowania strony. PDF/ZIP/P2 — OUT.",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.65.97",
    label: "Odbiory WM — Rysunki P1 toolset (flaga OFF)",
    items: [
      {
        type: "new",
        text: "Rysunki P1: drzwi (obrót + odbicie), okno, wymiar, strzałka, wentylacja, piec, opis pomieszczenia; biblioteka symbols/; obrót 90/180/270°; draft→Final. Sync bez zmian KV.",
      },
      {
        type: "improve",
        text: "Jeden pipeline renderSymbol → SVG. Soft warn >300 obiektów. PDF/ZIP/punkty — OUT (kolejne slice). Flaga kw-wm-rysunki-01 nadal default OFF.",
      },
    ],
  },
  {
    date: "2026-08-03",
    version: "2.65.96",
    label: "Odbiory WM — Rysunki P0 (flaga OFF)",
    items: [
      {
        type: "new",
        text: "WM Druk → zakładka Rysunki (po Odbiory): szkice techniczne powiązane z robotą — szablony, ściana, tekst, siatka/snap, autosave, undo/redo, duplikacja. Sync kw-wm-technical-drawings.",
      },
      {
        type: "improve",
        text: "Flaga localStorage kw-wm-rysunki-01 (domyślnie OFF). Włączenie: ustaw '1'. PDF/ZIP/drzwi/okna — kolejne slice.",
      },
    ],
  },
  {
    date: "2026-07-31",
    version: "2.65.95",
    label: "Detekcja dokumentów — przedmiar vs oferta (aliasy + copy)",
    items: [
      {
        type: "improve",
        text: "Przetargi: spójne nazewnictwo Doc.D1 Przedmiar · Doc.D2 dokumenty wspierające · Doc.D3 kosztorys ofertowy. Aliasy BOQ / Bill of Quantities / kosztorys ślepy → przedmiar.",
      },
      {
        type: "fix",
        text: "Komunikaty: brak przedmiaru · PDF wymaga OCR · brak odczytu · brak kosztorysu ofertowego — zamiast mylącego „brak kosztorysu”. Bez zmian AI/Bid/OCR/Confidence/Scope/SMART.",
      },
    ],
  },
  {
    date: "2026-07-31",
    version: "2.65.93",
    label: "Scope Gap MVP — Luki zakresu (flaga OFF)",
    items: [
      {
        type: "new",
        text: "Scope Gap MVP (AI v2): panel „Luki zakresu” w Kosztorys — ostrzeżenia braków typowych robót względem szablonu inwestycji. Read-only — nie zmienia wyceny ani oferty.",
      },
      {
        type: "improve",
        text: "Flaga localStorage kw-scope-gap-mvp (domyślnie OFF). Włączenie: ustaw '1'. Tip parity gdy wyłączone. History Engine poza MVP.",
      },
    ],
  },
  {
    date: "2026-07-31",
    version: "2.65.92",
    label: "Confidence MVP — Pewność analizy (flaga OFF)",
    items: [
      {
        type: "new",
        text: "Confidence MVP (AI v2): wskaźnik „Pewność analizy” (0–100 + drivers) obok AI Quality Score (S7). Read-only — nie zmienia wyceny ani oferty.",
      },
      {
        type: "improve",
        text: "Flaga localStorage kw-confidence-mvp (domyślnie OFF). Włączenie: ustaw '1'. Tip parity gdy wyłączone.",
      },
    ],
  },
  {
    date: "2026-07-31",
    version: "2.65.91",
    label: "Catalog Coverage P0e — FULL Library Seed",
    items: [
      {
        type: "new",
        text: "Catalog Coverage (P0e): seed FULL — zaprawianie/zamurowanie bruzd, zabezpieczenie powierzchni folią (1 ID), multiswitch antenowy — z Quotes. Bez zmian Negation Guard / Alias Pack.",
      },
      {
        type: "improve",
        text: "Coverage TV-01: odblokowanie reserved Product ID Wave 1 (DATA FIRST). BIZ: jedno Product ID folia (okna/drzwi/podłogi/stolarka).",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.90",
    label: "Catalog Coverage P0d-A — Precision + SAFE Seed",
    items: [
      {
        type: "fix",
        text: "Catalog Coverage (P0d-A): Negation Guard — „bez zaprawiania bruzd” nie mapuje się na zaprawianie (Alias i Core). Multiswitch tylko po słowie multiswitch (bez gołego RTV/SAT).",
      },
      {
        type: "new",
        text: "Biblioteka: seed SAFE — Zawór odpowietrzający + Montaż stop ptaków (z Quotes). FULL (zaprawianie/folia/multiswitch) = osobny etap P0e.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.89",
    label: "Catalog Coverage P0c — Alias Resolver",
    items: [
      {
        type: "new",
        text: "Catalog Coverage (P0c): Alias Resolver Wave 1 — deterministyczne Alias→Product ID (6 reguł LOW) po Normalizerze, przed Product Mapperem. Tylko pozycje eligible.",
      },
      {
        type: "improve",
        text: "Bez zapisu Library/Quotes. Brak work w katalogu = no-op (DATA FIRST). piece_demontaz wymaga demontaż/rozebranie + piec/trzon. FEATURE-DATA only.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.88",
    label: "Catalog Coverage P0b — Normalizer",
    items: [
      {
        type: "new",
        text: "Catalog Coverage (P0b): Normalizer opisu przed mapowaniem OfferBoq — KNR/d.x/krotność, średnice (fi), jm, format. Tylko pozycje eligible (po Noise Filter).",
      },
      {
        type: "improve",
        text: "Opis oryginalny ATH bez zmian w UI (SSOT). Scoring Product Mapper bez zmian reguł — thin pre-map. Bez zapisu Library/Quotes. FEATURE-DATA only.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.87",
    label: "Catalog Coverage P0a — Noise Filter",
    items: [
      {
        type: "new",
        text: "Catalog Coverage (P0a): Noise Filter przed mapowaniem OfferBoq — wyklucza pozycje niemateriałowe (kalkulacja własna, transport, artefakty LP, puste opisy). Bez zapisu do katalogu / Quotes.",
      },
      {
        type: "improve",
        text: "„Dostawa i montaż …” pozostaje w mapowaniu (nie jest transport-noise). Product Mapper bez zmian scoringu — thin pre-map. FEATURE-DATA only.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.86",
    label: "Smart Pricing P0 — Detect braków cen",
    items: [
      {
        type: "new",
        text: "Smart Pricing (P0): wykrywanie braków użytecznej ceny rynkowej w wycenie (Quotes-first). Banner + oznaczenie pozycji bez ceny. Tylko odczyt Product Quotes (conf ≥0.50, ≤180 dni).",
      },
      {
        type: "improve",
        text: "Bez One-shot / Evidence / Save / Publish / MARKET-SYNC lookup / commitMarketQuotesImport. Punkty rozszerzeń P1–P3 przygotowane (niedostępne). FEATURE-DATA only.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.85",
    label: "Market Sync P1 — Accept + Publish",
    items: [
      {
        type: "new",
        text: "Market Sync (P1): Accept/Reject/Defer (staging), link N:1 workId, Guard → Dry Run → Delta → Publish Summary → Kill Switch → commitMarketQuotesImport. Origins leroy/castorama w Quotes; średnia DIY default OFF. Undo single (capture/restore).",
      },
      {
        type: "improve",
        text: "Kill Switch MARKET_SYNC_PUBLISH_ENABLED default OFF (fail-closed w lib). Idempotencja re-Publish = noop. Bez AI-COST / Cloud Sync CORE / Payroll / drugiego toru Quotes.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.84",
    label: "Market Sync P0 — Preview staging (DIY)",
    items: [
      {
        type: "new",
        text: "Market Sync (P0): model MarketProduct + ProviderQuote, import CSV → Match → Preview (STOP). Super Admin: Biblioteka → Market Sync Preview. Staging wyłącznie local-first (kw-market-sync-01-staging).",
      },
      {
        type: "improve",
        text: "Bez Accept/Publish · bez commitMarketQuotesImport · bez zapisu Product Quotes / controlled_market / Cloud Sync CORE. Fuzzy OFF. Eksport/import JSON staging + odświeżenie Match.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.83",
    label: "Ceny materiałów — P1-C elewacje / ocieplenia (WC)",
    items: [
      {
        type: "new",
        text: "Biblioteka Robót (cloud): 7 robót P1-C elewacje/ocieplenia (ETICS) z product Quotes (CSV → commitMarketQuotesImport / P3.3). Bez zmian AI-COST, scoringu, Bid ani Cloud Sync CORE. P1-A i P1-B nienaruszone.",
      },
      {
        type: "improve",
        text: "Mapowanie OfferBoq: bezpieczne namePl/descriptionPl + pełne frazy keywords (OPS patch) — zero known/new false matchy; unmatched ELEWACJE ≈ 40 tys. PLN (−82.9% vs audit) na próbce 18.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.82",
    label: "Ceny materiałów — P1-B ogrodzenia (WC)",
    items: [
      {
        type: "new",
        text: "Biblioteka Robót (cloud): 7 robót P1-B ogrodzenia z product Quotes (CSV → commitMarketQuotesImport / P3.3). Bez zmian AI-COST, scoringu, Bid ani Cloud Sync CORE. P1-A nienaruszone.",
      },
      {
        type: "improve",
        text: "Mapowanie OfferBoq: bezpieczne namePl/descriptionPl + pełne frazy keywords (OPS patch) — zero known/new false matchy; unmatched OGRODZENIA 0 na próbce 18.",
      },
    ],
  },
  {
    date: "2026-07-30",
    version: "2.65.81",
    label: "Ceny materiałów — P1-A chodniki i nawierzchnie (WC)",
    items: [
      {
        type: "new",
        text: "Biblioteka Robót (cloud): 10 robót P1-A chodniki/nawierzchnie z product Quotes (CSV → commitMarketQuotesImport / P3.3). Bez zmian AI-COST, scoringu, Bid ani Cloud Sync CORE.",
      },
      {
        type: "improve",
        text: "Mapowanie OfferBoq: węższe namePl/keywords/descriptionPl po Owner Verification (D-P1-F / D-P1-F2) — zero known/new false matchy na próbce 18.",
      },
    ],
  },
  {
    date: "2026-07-29",
    version: "2.65.80",
    label: "Ceny materiałów — uplift WC / marketQuotes (Phase 1)",
    items: [
      {
        type: "new",
        text: "Opcjonalnie (flaga kw-ceny-materialow-01): lepsze mapowanie stolarki/oddymiania do Biblioteki Robót, KPI udziału originów materiałów oraz podgląd braków marketQuotes. Domyślnie wyłączone.",
      },
      {
        type: "improve",
        text: "REUSE controlled_market / costSplit / P3.3 — bez zmiany kolejności providerów, bez Bid Calculator, bez Cloud Sync i bez nowych zapytań Supabase.",
      },
    ],
  },
  {
    date: "2026-07-29",
    version: "2.65.79",
    label: "Biblioteka Robót — Market Pricing UX (P3.3)",
    items: [
      {
        type: "new",
        text: "Opcjonalnie (flaga kw-wc-p33-market-pricing-ux): import CSV cen rynkowych z zapisem marketQuotes (commit/rollback) oraz panel pokrycia rynku. Domyślnie wyłączone.",
      },
      {
        type: "improve",
        text: "REUSE silnika P3.1/P3.2 i istniejącego podglądu CSV — bez zmiany ceny firmy, parserów, Bid ani Payroll.",
      },
    ],
  },
  {
    date: "2026-07-29",
    version: "2.65.78",
    label: "Kosztorys — Explain + kolejka weryfikacji (AI-COST-02-B)",
    items: [
      {
        type: "new",
        text: "Opcjonalnie (flaga kw-ai-cost-02-b-explain-queue): kolejka weryfikacji wg wpływu (severity S7 + direct) oraz rozszerzone wyjaśnienie wyceny — origin kwot, dokumenty źródłowe, Top-5 wpływu i założenia silnika. Domyślnie wyłączone.",
      },
      {
        type: "improve",
        text: "Bez zmian kalkulatora oferty, parserów ani GAP-A — wyłącznie prezentacja REUSE istniejącego OfferBoq / S7.",
      },
    ],
  },
  {
    date: "2026-07-29",
    version: "2.65.77",
    label: "Kosztorys — kalibracja wyceny katalogowej (GAP-A)",
    items: [
      {
        type: "improve",
        text: "Lepsza klasyfikacja pozycji przedmiaru (mniej „nieznanych”) oraz kalibracja stawek katalogowych przy wycenie oferty — bez zmiany sumowania branż (Aggregate).",
      },
      {
        type: "new",
        text: "Gdy w Bibliotece Robót są ceny rynkowe (marketQuotes), wycena katalogowa może je wykorzystać jako kontrolowany benchmark. Flaga COST_BID_GAP_01_CATALOG_CAL (domyślnie wyłączona do weryfikacji).",
      },
    ],
  },
  {
    date: "2026-07-29",
    version: "2.65.76",
    label: "Kosztorys — Uzupełnij odczyty branż (force Heavy)",
    items: [
      {
        type: "new",
        text: "Gdy kosztorys jest gotowy, ale brakuje odczytów branż: przycisk „Uzupełnij odczyty branż” (z potwierdzeniem) uruchamia ponowną analizę dokumentów — bez kasowania głównego pliku ONE.",
      },
      {
        type: "improve",
        text: "Po uzupełnieniu odczytów wycena Aggregate z MULTI-02 może wejść w życie na przetargach wielobranżowych. Flaga COST_MULTI_02_FORCE_RESCAN_CTA.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.75",
    label: "COST-MULTI-02 — Aggregate Bid z branż",
    items: [
      {
        type: "new",
        text: "Gdy jest kilka przedmiarów branżowych i pełne odczyty: wycena oferty liczy sumę Branch winners (Aggregate), nie tylko jeden plik ONE.",
      },
      {
        type: "improve",
        text: "Przy braku odczytów branż lub HOLD: ostrzeżenie + fallback ONE; Discovery ONE w dossier bez zmian. Flaga COST_MULTI_02_AGGREGATE_BID.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.74",
    label: "COST-MULTI-01 — pakiet wielobranżowy (sygnał ONE niepełne)",
    items: [
      {
        type: "new",
        text: "Kosztorysy: gdy w dokumentach jest kilka przedmiarów branżowych, widać listę i komunikat, że wycena z jednego pliku (ONE) może być niepełna — bez automatycznego sumowania do oferty.",
      },
      {
        type: "improve",
        text: "Klasyfikacja branż / wariant / opcja / rewizja; polityka SUM_BRANCH_WINNERS lub HOLD — bez zmiany kalkulatora oferty.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.73",
    label: "COST-PARSER-01 — ZIP unpack A/B/C + 1× retry",
    items: [
      {
        type: "fix",
        text: "Gdy Heavy nie otworzy ZIP: komunikat „Nie udało się odczytać archiwum ZIP” (nie myli z brakiem kosztorysu w środku) — jedna automatyczna ponowna próba odczytu.",
      },
      {
        type: "improve",
        text: "Po udanym unpacku: osobne komunikaty — brak ATH/XLSX/PDF w ZIP vs nieudany odczyt kandydata — bez zmiany kalkulatora oferty.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.72",
    label: "COST-REGRESSION-02 — Discovery ZIP (archive_candidate)",
    items: [
      {
        type: "fix",
        text: "Gdy w dokumentach jest ZIP/7Z, Discovery nie mówi już „Brak przedmiaru w dokumentach” — uznaje archiwum za kandydata i proponuje Ponów analizę.",
      },
      {
        type: "improve",
        text: "Po heavy bez kosztorysu: komunikat „Nie znaleziono kosztorysu w archiwum ZIP” zamiast mylącego braku przedmiaru — bez zmiany kalkulatora oferty.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.71",
    label: "COST-REGRESSION-01 EPIC A — diagnostyka F2 (brak kosztorysu)",
    items: [
      {
        type: "fix",
        text: "Gdy brak kosztorysu w dossier: jasny komunikat (brak przedmiaru / analiza w toku / nieudany odczyt) zamiast ogólnego „Brak rekomendowanej ceny”.",
      },
      {
        type: "improve",
        text: "CTA: Dołącz przedmiar → Dokumenty albo Ponów analizę kosztorysu (gdy plik jest) — bez zmiany kalkulatora oferty.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.70",
    label: "COSTORYS-UX-01 WAVE 2 — zwarta lista · skan · sort",
    items: [
      {
        type: "improve",
        text: "Kosztorysy: tryb Zwarty/Komfort — więcej pozycji na ekranie; komponenty jako wiersze z edycją inline.",
      },
      {
        type: "improve",
        text: "Szukaj po LP/opisie i sortuj (LP · Direct · Pewność) razem z filtrem „Tylko do weryfikacji”.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.69",
    label: "COSTORYS-UX-01 WAVE 1 — sticky oferta · full width · mniej chrome",
    items: [
      {
        type: "improve",
        text: "Kosztorysy: pasek oferty (rekomendacja · direct · weryfikacja) zostaje widoczny przy przewijaniu pozycji.",
      },
      {
        type: "improve",
        text: "Zakładka Kosztorysy na pełną szerokość; szczegóły AI w accordionie; Evidence ATH zwinięte; filtr „Tylko do weryfikacji”.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.68",
    label: "CATALOG-BID-01 — ilości catalogQuantities przed wyceną",
    items: [
      {
        type: "fix",
        text: "Przedmiar z ilościami poprawnie trafia do wyceny katalogowej — mniej przypadków „Brak rekomendowanej ceny” przy pustym OfferBoq.",
      },
      {
        type: "improve",
        text: "catalogQuantities budowane tylko z pozycji z dodatnią ilością; martwe wpisy bez qty nie blokują wyceny. Kontrakt Bid (F1–F4) bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.67",
    label: "COST-PIPELINE-01-BUGFIX-01 — fallback catalog gdy OfferBoq niedostępny",
    items: [
      {
        type: "fix",
        text: "Gdy kosztorys ofertowy AI nie da ceny, Outcome wraca do wyceny katalogowej zamiast od razu pokazywać „Brak rekomendowanej ceny”.",
      },
      {
        type: "improve",
        text: "Kolejność: OfferBoq → catalog → dopiero wtedy brak ceny. Architektura L0/L1/L2 bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.66",
    label: "COST-PIPELINE-01 — OfferBoq → Bid · pełny kosztorys ofertowy",
    items: [
      {
        type: "improve",
        text: "Rekomendowana cena oferty (Outcome) liczy się z kosztorysu ofertowego AI (OfferBoq → Bid), nie z równoległego katalogu.",
      },
      {
        type: "improve",
        text: "„Pokaż pełny kosztorys ofertowy” otwiera zakładkę Kosztorysy na sekcji OfferBoq; ATH zostaje jako dowód (Evidence).",
      },
      {
        type: "improve",
        text: "Rollback bez redeployu silników: localStorage kw-cost-pipeline-01=0 przywraca wycenę katalogową Outcome.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.65",
    label: "TRE-02-HOTFIX-01 — Outcome bez wiecznego „Trwa wycena…”",
    items: [
      {
        type: "fix",
        text: "Gdy wycena Bid zakończy się bez rekomendowanej ceny, Outcome pokazuje „Brak rekomendowanej ceny” zamiast nieskończonego „Trwa wycena…”.",
      },
      {
        type: "improve",
        text: "Spinner / „Trwa wycena…” tylko przy faktycznie trwającym pobieraniu lub analizie dokumentów.",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.64",
    label: "TRE-02 — Outcome First (domyślny ekran rekomendacji)",
    items: [
      {
        type: "improve",
        text: "Po otwarciu przetargu domyślnie widać rekomendowaną cenę oferty (lub status wyliczania) — zamiast od razu pełnego Hubu.",
      },
      {
        type: "improve",
        text: "„Szczegóły / Hub” nadal dostępne jako recovery; wyłączenie: localStorage kw-tre-01-slice-a=0 (rollback bez zmiany silników).",
      },
    ],
  },
  {
    date: "2026-07-28",
    version: "2.65.63",
    label: "TRE-01 Slice A — Outcome MVP (rekomendowana cena oferty)",
    items: [
      {
        type: "new",
        text: "Po otwarciu przetargu (flaga TRE-01) ekran Outcome z rekomendowaną ceną oferty z Bid Proposal — bez przepisywania wyceny AI.",
      },
      {
        type: "improve",
        text: "Hub / szczegóły V4 pozostają jako recovery; wyłączenie flagi przywraca dotychczasowy detal (rollback R0).",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.62",
    label: "AI-COST-02 / COST-02-A — modele cenowe (kontrolowany benchmark)",
    items: [
      {
        type: "new",
        text: "Kontrolowane źródło cen rynkowych w wycenie AI (marketQuotes Biblioteki Robót, tylko odczyt) — region i aktualność widoczne przy komponencie.",
      },
      {
        type: "improve",
        text: "Badge „Benchmark rynkowy” w panelu kosztorysu — bez scrapingu i bez zmiany kalkulatora oferty (Kp/marża nadal w Bid Proposal).",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.61",
    label: "AI-COST-01-STAB-01 — stabilizacja Field Ready",
    items: [
      {
        type: "fix",
        text: "Ponowna wycena AI nie nadpisuje zatwierdzonych ani ręcznie zmienionych komponentów — decyzja użytkownika ma pierwszeństwo (sugestia AI osobno).",
      },
      {
        type: "improve",
        text: "Rekomendacje jakości oferty są grupowane z licznością (np. „Brak dopasowania — 128 wystąpień”) zamiast tysięcy pojedynczych pozycji.",
      },
      {
        type: "fix",
        text: "Lepsza klasyfikacja: sprzątanie/porządki, zabezpieczenia, odbiory, próby, dokumentacja powykonawcza oraz sprawdzenia.",
      },
      {
        type: "improve",
        text: "Większe pokrycie propozycji wyceny (heurystyki domenowe) + jasne wyjaśnienie braku ceny i lokalna telemetria jakości AI.",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.60",
    label: "AI-COST-01 / COST-S7 — walidacja jakości oferty",
    items: [
      {
        type: "new",
        text: "AI Validation Engine (RO): wykrywanie braków i ryzyk kosztorysu/oferty (braki cen, niska pewność, review, niespójności ilości/jednostek/źródła ceny).",
      },
      {
        type: "improve",
        text: "Panel Kosztorys: „Gotowość oferty” (kompletność, AI Quality Score, status), rekomendacje z priorytetami oraz Explainability „Ocena jakości AI”.",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.59",
    label: "AI-COST-01 / COST-S6 — integracja Bid Proposal",
    items: [
      {
        type: "new",
        text: "AI Kosztorysant — koszt bezpośredni z AI Cost przekazywany do istniejącego modułu Bid Proposal (Kp, marża, cena rekomendowana). Adapter bez duplikacji logiki.",
      },
      {
        type: "improve",
        text: "Panel Kosztorys: „Wpływ AI na ofertę”, podsumowanie oferty (costStack SSOT), ścieżka audytu AI Cost → Adapter → Bid Proposal → Wynik.",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.58",
    label: "AI-COST-01 / COST-S5.1 — wiedza firmy",
    items: [
      {
        type: "new",
        text: "AI Kosztorysant — lokalna baza wiedzy firmy z zatwierdzeń i korekt komponentów; AI wykorzystuje ją przy kolejnych wycenach jako dodatkowe źródło.",
      },
      {
        type: "improve",
        text: "Explainability: wpływ wiedzy firmy (podobne przypadki, data, pewność). Panel statystyk RO. Bez Kp/marży/oferty (prep COST-S6).",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.57",
    label: "AI-COST-01 / COST-S5 — edycja komponentów",
    items: [
      {
        type: "new",
        text: "Przetargi → Kosztorys — edycja komponentów wyceny AI: ilość, cena, kategoria, źródło, zatwierdzenie; natychmiastowe przeliczenie kosztu bezpośredniego pozycji.",
      },
      {
        type: "improve",
        text: "Status Propozycja AI / Zatwierdzony / Zmieniony + historia zmian. Panel summary: zaakceptowane · zmienione · tylko AI. Bez Kp, marży i ceny ofertowej (prep COST-S6).",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.56",
    label: "AI-COST-01 / COST-S4.1 — Explainability RO",
    items: [
      {
        type: "new",
        text: "Przetargi → Kosztorys — panel AI Cost Intelligence (tylko odczyt): typ, strategia, komponenty wyceny, źródła, pewność 🟢🟡🔴 oraz uzasadnienie „Dlaczego AI…”.",
      },
      {
        type: "improve",
        text: "Podsumowanie zbiorcze (pozycje, weryfikacja, dekompozycja, koszt bezpośredni). Bez edycji, bez Kp/marży/oferty. Silniki S3/S4 bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.55",
    label: "AI-COST-01 / COST-S4 — AI Pricing Engine",
    items: [
      {
        type: "new",
        text: "AI Kosztorysant — propozycja wyceny pozycji: komponenty (M/R/S/transport/pomocnicze), źródła cen, pewność i agregacja kosztu bezpośredniego (bez marży i ceny ofertowej).",
      },
      {
        type: "improve",
        text: "Jeden AI Pricing Engine z wymiennymi providerami (Biblioteka Robót, stawki kategorii, model firmy, heurystyka). Bez scrapingu i bez przebudowy Bid Proposal.",
      },
    ],
  },
  {
    date: "2026-07-27",
    version: "2.65.54",
    label: "AI-COST-01 / COST-S3 — AI Cost Intelligence",
    items: [
      {
        type: "new",
        text: "AI Kosztorysant — klasyfikacja pozycji (typ), strategia przyszłej wyceny oraz inteligentna dekompozycja tylko tam, gdzie ma wartość (bez cen).",
      },
      {
        type: "improve",
        text: "Model OfferBoqCostIntelligence z pewnością, uzasadnieniem PL i planem silników S4. Malowanie / oprawa LED bez zbędnego rozbijania. Bid Proposal i parsery bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.53",
    label: "AI-COST-01 / COST-S2 — Mapping Engine",
    items: [
      {
        type: "new",
        text: "AI Kosztorysant — mapowanie pozycji przedmiaru do Biblioteki Robót: catalogWorkId, kategoria, pewność HIGH/MEDIUM/LOW, matchedBy oraz uzasadnienie AI (bez wyceny).",
      },
      {
        type: "improve",
        text: "Model OfferBoq gotowy na wielu kandydatów (dostawa+montaż). REUSE klasyfikatora ATH i Work Catalog. Bez parserów, Bid Proposal i Pricing Gate bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.52",
    label: "AI-COST-01 / COST-S1 — OfferBoq model",
    items: [
      {
        type: "new",
        text: "Fundament AI Kosztorysanta: model OfferBoq / OfferBoqLine budowany ze snapshotu przedmiaru (LP, opis, ilość, jm) — pola M/R/S, Kp, marża i źródła wyceny gotowe pod kolejne Slice.",
      },
      {
        type: "improve",
        text: "Bez nowych parserów i bez wyceny. Bid Proposal, Pricing Gate i Autonomous Gate bez zmian. Przygotowanie pod edycję pozycji i transparentność AI.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.51",
    label: "AP2-S4 — Business Risk Engine",
    items: [
      {
        type: "new",
        text: "Przetargi → Dokumenty — ocena biznesowa na faktach S3: rekomendacja STARTUJ / STARTUJ WARUNKOWO / ODPUŚĆ z uzasadnieniem, ryzyka wg 5 kategorii, mocne strony, Business Fit (tylko z dokumentacji).",
      },
      {
        type: "improve",
        text: "Każda ocena wskazuje dokument, fakt i regułę decyzyjną (bez czarnej skrzynki). Pricing/Autonomous Gate i overlay.displayDecision bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.50",
    label: "AP2-S3 — deep intelligence + Najważniejsze informacje",
    items: [
      {
        type: "new",
        text: "Przetargi → Dokumenty — panel „Najważniejsze informacje” (terminy, wadium, gwarancja, przedmiar, kryteria, formalne…) z źródłem i pewnością ekstrakcji.",
      },
      {
        type: "improve",
        text: "Agregacja treści SWZ/przedmiaru/umowy z istniejących parserów (bez nowych modeli AI). Klauzule umowy tylko wyodrębnione — bez oceny ryzyka. Pricing/Autonomous Gate bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.49",
    label: "AP2-S2 — auto-analiza UX + Uruchom ponownie",
    items: [
      {
        type: "improve",
        text: "Przetargi — analiza dokumentów jako proces w tle (istniejący pipeline); przycisk „Uruchom ponownie analizę”; historia ostatniej analizy + etapy postępu na Dokumentach.",
      },
      {
        type: "fix",
        text: "Usunięto legacy hinty „Otwórz Dokumenty aby rozpocząć analizę”. Wyniki (kompletność, gotowość wyceny) nie chowają się za skeletonem, gdy dane już są.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.48",
    label: "AP2-S1 — kompletność dokumentacji + gotowość wyceny",
    items: [
      {
        type: "new",
        text: "Przetargi → Dokumenty — sekcja „Kompletność dokumentacji” (14 slotów: SWZ/OPZ/STWiOR/przedmiar/projekt/rysunki/…) oraz wskaźnik gotowości wyceny (gotowy / z ryzykiem / niewystarczająca).",
      },
      {
        type: "improve",
        text: "Rozszerzona klasyfikacja ról dokumentów + sygnały z dossier (costDiscovery/kategorie). Brak kosztorysu inwestorskiego = info/N-D, nie błąd. Pricing/Autonomous Gate bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.47",
    label: "AP2-S0 — semantyka przedmiaru / brak kosztorysu ≠ błąd",
    items: [
      {
        type: "fix",
        text: "Przetargi — przedmiar PDF (FOUND_NO_VALUE) = podstawa wyceny; brak kosztorysu inwestorskiego = INFO (nie ERROR); pewność AI z jakości dokumentów, nie z samego braku ATH.",
      },
      {
        type: "improve",
        text: "Copy: „Zamawiający nie udostępnił kosztorysu inwestorskiego” · „Wykryto przedmiar robót — możliwe przygotowanie wyceny”. Pricing Gate / Autonomous Gate bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.46",
    label: "LOGIN-UI-01 — mobile hotfix (font + back)",
    items: [
      {
        type: "fix",
        text: "Login — inputy text-base (≥16px, bez zoom iOS) · toolbar chrome po treści w DOM (strzałka wstecz mobile-flows).",
      },
    ],
  },
  {
    date: "2026-07-26",
    version: "2.65.45",
    label: "Login screen — premium UI refresh",
    items: [
      {
        type: "improve",
        text: "Ekran logowania — spokojny hero, karty glass 24px, większe inputy, toolbar (motyw Light/Dark/System, hymny, język PL/EN, About), status Production/wersja/commit oraz footer. Zero zmian logiki auth/routingu.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.44",
    label: "Theme toggle — Inspektor + Pracownik",
    items: [
      {
        type: "improve",
        text: "Motyw Jasny/Ciemny — ten sam przełącznik co w panelu Admin/Moderator także w Panelu Inspektora i Panelu Pracownika (SSOT ThemeToggle, bez zmian Providera).",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.43",
    label: "PAYROLL-IMPLEMENT-03 D4+D5 — -prev recovery banner + Soft Restore",
    items: [
      {
        type: "fix",
        text: "Lista Płac — D4 baner odzysku z kw-week-employees-prev (≠ archiwum) + Domain Push CTA; D5 Soft Restore overlay przy re-add (weekEmployeeFromDir PURE). Bez zmian D1–D3 / SSOT / W1–W2 entry.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.42",
    label: "PAYROLL-IMPLEMENT-02 D2+D3 — domain gate + intentionalHoursClear",
    items: [
      {
        type: "fix",
        text: "Lista Płac — D2 Domain Gate + confirm przy wyzerowaniu godzin (D14); D3 skipPayrollGuard wyłącznie gdy intentionalHoursClear=true. Cancel = brak zapisu Cloud. Bez D4/D5.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.41",
    label: "PAYROLL-IMPLEMENT-01 D1 — write-path telemetry (passive)",
    items: [
      {
        type: "improve",
        text: "Lista Płac — stały pierścień forensic write-path (hoursBefore/After, source, intentionalHoursClear) na domain flush / pwrPush / pwrAdd / pwrRemove. 100% pasywny: bez wpływu na Domain Push, guardy, Cloud Sync ani SSOT. Konsola tylko opt-in (wg-payroll-trace); kill-switch wg-payroll-write-path-telemetry=0.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.40",
    label: "HARDENING-01A — Persist SSOT (bootstrap local + opts forward)",
    items: [
      {
        type: "improve",
        text: "Przetargi: bootstrap discovery/shell zapisuje mid-flight lokalnie i robi ≤1 terminal cloud (coalesce). Kill-switch pipelineBootstrapPersistLocal (domyślnie ON). Adapter bindTenderPipelineOnUpdate forwarduje persist opts — bez zmiany Heavy E-RUN / Sync Storm P0.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.39",
    label: "INCIDENT-23-07 cleanup — diag instrumentation off by default",
    items: [
      {
        type: "improve",
        text: "Ślady diagnostyczne Payroll/RCA (storage/write/boot path, ring payroll-trace, sync-metrics console) domyślnie wyłączone na produkcji — włączenie ręczne przez flagi / VITE_DEBUG_*. Bez zmiany logiki Sync Storm ani sync.",
      },
    ],
  },
  {
    date: "2026-07-24",
    version: "2.65.38",
    label: "TENDERS-SYNC-STORM-P0 — heavy dossier sync storm",
    items: [
      {
        type: "fix",
        text: "Ciężkie dossier (Przetargi): partial zapis tylko lokalnie, cloud max 1× na final; builtAt nie restartuje parse — brak lawiny batch-get/set przy otwarciu dużego przetargu.",
      },
    ],
  },
  {
    date: "2026-07-20",
    version: "2.65.35",
    label: "PAYROLL-CLOUD-RESURRECTION-01 — bootstrap freshness fence",
    items: [
      {
        type: "fix",
        text: "Lista Płac — stary LocalStorage z innej sesji nie nadpisuje już pustej chmury przy starcie aplikacji. Bootstrap nie wypycha przestarzałego lub już zarchiwizowanego tygodnia; merge nie przywraca bogatego lokalnego snapshotu tylko dlatego, że jest „pełniejszy” niż Cloud.",
      },
    ],
  },
  {
    date: "2026-07-19",
    version: "2.65.34",
    label: "PAYROLL-P0-WEEK-ROLLOVER-01 — rollover vs bootstrap align",
    items: [
      {
        type: "fix",
        text: "Lista Płac — przy przejściu tygodnia (Nd ≥20:00) poprzedni tydzień trafia do archiwum, skład jest czyszczony i zapis idzie do chmury. Samo przesunięcie dat bez archiwizacji (błąd REGRESSION-04) nie występuje przy realnym rolloverze; align etykiet zostaje tylko gdy poprzedni tydzień jest już w archiwum (bootstrap).",
      },
    ],
  },
  {
    date: "2026-07-17",
    version: "2.65.33",
    label: "CLOUD-P0-DEADLOCK-N1 — retry transient batch-set",
    items: [
      {
        type: "fix",
        text: "Synchronizacja chmury — przy chwilowym deadlocku bazy (40P01) zapis jest ponawiany automatycznie (do 4 prób). Komunikat błędu dopiero po wyczerpaniu prób.",
      },
    ],
  },
  {
    date: "2026-07-17",
    version: "2.65.32",
    label: "TENDER-P0.1 — Active Catalog Classifier SSOT",
    items: [
      {
        type: "fix",
        text: "Wycena katalogowa — klasyfikacja pozycji przedmiaru używa keywords z aktywnej Biblioteki Robót (ten sam katalog co stawki), a nie stałego seeda. Pure pass-through parametru — bez zmiany Payroll/Cloud/Jobs.",
      },
    ],
  },
  {
    date: "2026-07-17",
    version: "2.65.31",
    label: "THEME-01D.1 — TopBar theme toggle",
    items: [
      {
        type: "improve",
        text: "Motyw aplikacji — szybki przełącznik Ciemny/Jasny w górnym pasku (obok Hymnów). Ten sam motyw co w ⚙ Ustawienia. Widoczny na tablecie i desktopie.",
      },
    ],
  },
  {
    date: "2026-07-15",
    version: "2.65.30",
    label: "THEME-01C — Atomic theme migration (Light/Dark standard)",
    items: [
      {
        type: "improve",
        text: "Motyw aplikacji — :root = jasny, .dark = dotychczasowy ciemny prod. Standard next-themes/Tailwind/shadcn. Przełącznik Ciemny/Jasny w ⚙ Super Admin. Domyślnie ciemny — bez regresji wyglądu.",
      },
    ],
  },
  {
    date: "2026-07-15",
    version: "2.65.29",
    label: "THEME-01B — Theme foundation (dark parity)",
    items: [
      {
        type: "improve",
        text: "Motyw aplikacji — fundament next-themes (WgdomThemeProvider, wg-theme localStorage, FOUC guard). Domyślnie ciemny jak dotychczas; brak zmian wyglądu prod. Light palette — kolejny etap.",
      },
    ],
  },
  {
    date: "2026-07-14",
    version: "2.65.28",
    label: "LOCALSTORAGE-ARCH-02 A–E — cold store + telemetry",
    items: [
      {
        type: "improve",
        text: "localStorage — snapshot bundles + jobs snaps → IndexedDB; pipeline lean LS + cold IDB; WM bez double-write cold; audit rings w IDB; window.__WG_STORAGE__ (report/largest/budget/writers/history). Bez zmian Payroll/CloudLoader/merge.",
      },
    ],
  },
  {
    date: "2026-07-14",
    version: "2.65.27",
    label: "PAYROLL-P0-FIX-01 — QuotaExceeded ≠ bootstrap FAILED",
    items: [
      {
        type: "fix",
        text: "P0 — CloudLoader: localStorage.setItem przez safeSetLocalStorageJson / persistBootstrapMergedKey; QuotaExceeded logowany jako storage-failure, nie przerywa bootstrapu. SUCCESS = fetch+merge. Payroll persist first + in-memory handoff → Lista Płac bez czekania na pull.",
      },
    ],
  },
  {
    date: "2026-07-14",
    version: "2.65.26-diag",
    label: "PAYROLL-P0-RCA-07 — bootstrap path timeline (A vs B)",
    items: [
      {
        type: "improve",
        text: "DIAG ONLY — window.__WG_PAYROLL_BOOT_PATH__ (.report/.verdict): timeline BOOT_TIMEOUT vs BOOT_SUCCESS+persist skip → INIT=0. Bez zmian logiki Payroll/Sync/CloudLoader. Usunąć po Architecture Review.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.25-diag",
    label: "PAYROLL-P0-DIAGNOSTIC-02 — sourceFunction na każdym setWeekEmployees",
    items: [
      {
        type: "improve",
        text: "DIAG ONLY — write-trace sourceFunction na każdym setWeekEmployees (kolejka FIFO · firstRestore()); pullFromCloudAndMerge/runCloudSync/… Bez zmian logiki. Usunąć po zrzucie WRITE 0→14.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.24-diag",
    label: "PAYROLL-P0-REGRESSION-06 — storage timeline only (tymczasowy)",
    items: [
      {
        type: "improve",
        text: "DIAG ONLY — window.__WG_PAYROLL_STORAGE_TRACE__: każdy GET/SET/REMOVE localStorage[kw-week-employees] (timestamp, size, count, caller, stack) + BOOT_SNAPSHOT przed mount + CloudLoader PHASE. Bez zmian logiki Payroll/Sync. Usunąć po zrzucie Ownera.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.23-diag",
    label: "PAYROLL-P0-DIAGNOSTIC-01 — write-trace only (tymczasowy)",
    items: [
      {
        type: "improve",
        text: "DIAG ONLY — window.__WG_PAYROLL_WRITE_TRACE__ (enable/report/download/clear); każdy write weekEmployees + recompute production/display. Bez zmian logiki Payroll/Sync. Usunąć po zrzucie Ownera.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.22",
    label: "PAYROLL-P0-REGRESSION-04 — mount bez wipe rosteru (lifecycle align)",
    items: [
      {
        type: "fix",
        text: "Lista płac — P0: tryPayrollWeekCycle najpierw alignuje stale weekFrom/weekTo przy żywym rosterze (resolvePayrollOperationalWeekKeys), dopiero potem rollover; koniec setWeekEmployees([]) na mount → Topbar/KPI/tabela 14 od razu bez pull.",
      },
      {
        type: "improve",
        text: "test-payroll-display-p0-regression-04.mjs — bootstrap→mount→14 bez pull.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.21",
    label: "PAYROLL-P0-REGRESSION-03 — natychmiastowy render LP (bez ~20 s pull)",
    items: [
      {
        type: "fix",
        text: "Lista płac — P0: żywy roster + stale weekFrom/weekTo po rolloverze → natychmiastowe wyrównanie kluczy (resolvePayrollOperationalWeekKeys); koniec czekania na pullFromCloudAndMerge ~15–20 s.",
      },
      {
        type: "fix",
        text: "Auto-sync suppress — bumpAutoSyncSuppress (Math.max) zamiast nadpisywania 60 s bootstrap window (wmPrint seed / commity); kw-employee-leaves w BOOTSTRAP_CORE_KEYS.",
      },
      {
        type: "improve",
        text: "test-payroll-display-p0-regression-03.mjs — stale keys + CORE leaves.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.20",
    label: "PAYROLL-P0-REGRESSION-02 — natychmiastowy render tabeli LP (nowy tydzień)",
    items: [
      {
        type: "fix",
        text: "Lista płac — P0 regresja po nowym tygodniu: kanoniczne porównanie Pn–So (So/Nd) w isPayrollWeekClosedForUi + guard display na bieżącym tygodniu; tabela od razu po Ctrl+Shift+R (bez 60–120 s collapse).",
      },
      {
        type: "improve",
        text: "payroll-cycle — SSOT payrollWeekRangeKey / findPayrollWeekSnapshot; smoke test-payroll-display-p0-regression-02.mjs.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.19",
    label: "PAYROLL-DISPLAY-UNLOCK-TRACE-02 — findFirstDisplayUnlock (tymczasowa diagnostyka)",
    items: [
      {
        type: "improve",
        text: "Lista płac — __WG_PAYROLL_DISPLAY_TRACE__.findFirstDisplayUnlock() z diff 0→N; download() eksportuje firstDisplayUnlock + calendarBehind; bez zmiany logiki display.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.18",
    label: "PAYROLL-BOOTSTRAP-RACE-FIX-01 — CloudLoader bootstrap gate (CORE)",
    items: [
      {
        type: "fix",
        text: "Lista płac — naprawa race F5: CloudLoader otwiera aplikację dopiero po zapisie CORE do localStorage (bootstrapPhase SUCCESS); usunięty równoległy fallback 3 s powodujący pusty roster po Ctrl+Shift+R.",
      },
      {
        type: "improve",
        text: "CloudLoader — bootstrapPhase PENDING/SUCCESS/FAILED/TIMEOUT; offline escape 15 s zamiast bezwarunkowego ready @ 3 s.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.17",
    label: "PAYROLL-DISPLAY-RUNTIME-TRACE-01 — diagnostyka warstwy renderu LP (tymczasowa)",
    items: [
      {
        type: "improve",
        text: "Lista płac — tymczasowy runtime trace warstwy display (flaga __WG_PAYROLL_DISPLAY_TRACE__) — resolvePayrollDisplayEmployees + PayrollView; bez zmiany logiki.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.16",
    label: "PAYROLL-BOOTSTRAP-RUNTIME-TRACE-01 — diagnostyka F5 bootstrap (tymczasowa)",
    items: [
      {
        type: "improve",
        text: "Lista płac — tymczasowy runtime trace bootstrap F5 (flaga __WG_PAYROLL_BOOTSTRAP_TRACE__) — CloudLoader → tryPayrollWeekCycle; bez zmiany logiki merge.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.15",
    label: "PAYROLL-ANTI-LEAK-RUNTIME-TRACE-01 — diagnostyka P0 (tymczasowa)",
    items: [
      {
        type: "improve",
        text: "Lista płac — tymczasowy runtime trace applyRuntimePayrollAntiLeak (flaga __WG_PAYROLL_ANTI_LEAK_TRACE__) — tylko audyt P0, bez zmiany logiki merge.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.14",
    label: "PAYROLL-ANTI-LEAK-FIX-01 — cross-week leak guard (Wariant B)",
    items: [
      {
        type: "fix",
        text: "Lista płac — applyRuntimePayrollAntiLeak nie czyści poprawnego rosteru bieżącego tygodnia z chmury (focus pull / same-week Cloud SSOT).",
      },
      {
        type: "fix",
        text: "Anti-leak strzela wyłącznie przy cross-week leak lub stale republish archiwum pod nowymi kluczami tygodnia — P-INV-5 bez regresji.",
      },
      {
        type: "improve",
        text: "Trace sync.merge.payroll.anti_leak — reason: cross_week_leak | stale_archive_republish | skipped_same_week_cloud_ssot.",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.13",
    label: "JOBS-SYNC-FIX-01 — admin bundle write-first + reconcile fresh",
    items: [
      {
        type: "fix",
        text: "Auto-sync po lokalnej mutacji — write-first: bez applyAdminDataBundle w tym samym cyklu (koniec cofania zdjęć 2→3).",
      },
      {
        type: "fix",
        text: "Reconcile przed apply/push — React snapshot nowszy od localStorage wygrywa (MF-1).",
      },
      {
        type: "improve",
        text: "Generation guard — starszy bundle sync nie nadpisuje nowszego stanu React (MF-3).",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.12",
    label: "JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 — trace in-memory activation",
    items: [
      {
        type: "improve",
        text: "Instrumentacja photos trace — aktywacja in-memory (__WG_ENABLE_JOBS_PHOTO_TRACE__ / enable()); bez localStorage (QuotaExceeded).",
      },
    ],
  },
  {
    date: "2026-07-13",
    version: "2.65.11",
    label: "JOBS-PHOTOS-LIVE-INSTRUMENTATION-02 — diagnostic trace (Owner only)",
    items: [
      {
        type: "improve",
        text: "Tymczasowa instrumentacja diagnostyczna zdjęć robót — aktywna wyłącznie po localStorage wg-jobs-photos-live-trace=1; zero zmian logiki sync/upload.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.10",
    label: "JOBS-PHOTOS-DELETE-SYNC-01 — Usunięte zdjęcia nie wracają po sync",
    items: [
      {
        type: "fix",
        text: "Roboty → Zdjęcia — usunięcie zapisuje tombstone (deletedPhotoTombstones); merge chmury nie przywraca skasowanych zdjęć ekipy.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.9",
    label: "JOBS-ASSETS-SYNC-01 — Zdjęcia robót nie znikają po sync",
    items: [
      {
        type: "fix",
        text: "Roboty → Zdjęcia — merge chmury nie nadpisuje już photos[] (union po id w mergeJobsById); upload i storage bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.8",
    label: "NG11-FF-01 — Panel Super Admin: sekcja Developer",
    items: [
      {
        type: "improve",
        text: "Ustawienia Super Admina — przełączniki NG11 Pipeline Performance przeniesione do zwijanej sekcji Developer (Experimental / Kill Switches); logika flag bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.7",
    label: "JOBS-FORM-RACE-01 — Formularz Robót bez utraty znaków",
    items: [
      {
        type: "fix",
        text: "Roboty — pola formularza (adres, klient, uwagi, daty, WM) nie tracą znaków podczas szybkiego wpisywania (functional merge w updateJob).",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.6",
    label: "JOBS-ADDRESS-SYNC-01 — Adres roboty nie znika po sync",
    items: [
      {
        type: "fix",
        text: "Roboty — adres i nr mieszkania nie są nadpisywane pustą wartością z chmury po auto-sync (field-level merge w kw-jobs).",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.5",
    label: "ROBOTS-INSPECTOR-01 — Inspektor WM nie znika po sync",
    items: [
      {
        type: "fix",
        text: "Roboty — wybór inspektora WM nie cofa się po auto-sync z chmurą (reconcile kw-jobs + ten sam bundle apply/push/fingerprint).",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.4",
    label: "PAYROLL-ARCHIVE-01 — Archiwum stale apply reconcile",
    items: [
      {
        type: "fix",
        text: "Archiwum — edycja dnia roboczego nie cofa się po synchronizacji z chmurą (reconcile kw-archive po merge, wzorzec PAYROLL-RACE-01).",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.3",
    label: "NG11-P0.2 — BZP documents transport (414 fix)",
    items: [
      {
        type: "fix",
        text: "Przetargi — NG11-P0.2: discovery BZP nie wysyła noticeHtml w URL GET gdy jest numer ogłoszenia — koniec HTTP 414 przy Autonomous Bootstrap.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.2",
    label: "NG11-P0.1-A — Bootstrap deferred retry",
    items: [
      {
        type: "fix",
        text: "Przetargi — NG11-P0.1-A: bootstrap ponawia discovery po zmianie anchor (bootstrapKey drift) — koniec utraty dokumentów przy Autonomous Run.",
      },
    ],
  },
  {
    date: "2026-07-12",
    version: "2.65.1",
    label: "NG11-P0 — Discovery Unification",
    items: [
      {
        type: "fix",
        text: "Przetargi — NG11-P0: discoverTenderDocumentsSSOT — manual „Odśwież BZP” i Autonomous/bootstrap używają tego samego core fetch BZP + monitory.",
      },
      {
        type: "fix",
        text: "Intelligence czyta discoveryMergedItem (patch discovery przed sync pipeline) — koniec fałszywego „brak dokumentów” przy auto.",
      },
      {
        type: "improve",
        text: "Bootstrap: persist discovery patch przed shell SWZ/dossier; session guards nie blokują retry przy 0 załącznikach.",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.65.0",
    label: "NG11-A5 — Strategic vs Economic",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-A5: jawny split decyzji strategicznej (T0) i ekonomicznej (Q5) w kontekście intelligence — strategicDecisionReady / economicDecisionReady / economicDecisionFinalReady.",
      },
      {
        type: "improve",
        text: "Lib-only additive — overlay.displayDecision bez zmian (NG10 gate-exit frozen); mapowanie economicDecisionReady = pricingReadyPartial.",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.64.0",
    label: "NG11-A3 — Discovery Fork",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-A3: auto bootstrap może startować external discovery równolegle z BZP; gdy BZP zwróci dokumenty, wynik external jest odrzucany (timeout 45 s).",
      },
      {
        type: "improve",
        text: "Super Admin — flaga pipelinePerfDiscoveryFork w ustawieniach (domyślnie wyłączona; rollback bez deployu).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.99",
    label: "NG11-A2 — Dossier Artifact Cache",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-A2: sesyjny cache wyniku heavy parse dossier (fazy cost/full, LRU 12) przy ponownym parse z tym samym fingerprint — głównie retry po błędzie.",
      },
      {
        type: "improve",
        text: "Super Admin — flaga pipelinePerfArtifactCache w ustawieniach (domyślnie wyłączona; rollback bez deployu).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.98",
    label: "NG11-Q2 — Parallel Archive Unpack dossier",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-Q2: rozpakowanie archiwów ZIP/7Z w dossier może działać do 2 równolegle; merge kandydatów pozostaje sekwencyjny i deterministyczny.",
      },
      {
        type: "improve",
        text: "Super Admin — flaga pipelinePerfUnpackParallel w ustawieniach (domyślnie wyłączona; rollback bez deployu).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.97",
    label: "NG11-Q1 — Parse Concurrency dossier",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-Q1: fazy kosztorysu i metadanych SWZ mogą parsować do 3 plików równolegle (osobne pule); merge wyników pozostaje sekwencyjny i deterministyczny.",
      },
      {
        type: "improve",
        text: "Super Admin — flaga pipelinePerfParseConcurrency w ustawieniach (domyślnie wyłączona; rollback bez deployu).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.96",
    label: "NG11-Q3 — Debounced Persist pipeline",
    items: [
      {
        type: "improve",
        text: "Przetargi — NG11-Q3: zapis lokalny pipeline natychmiastowy; synchronizacja chmury kw-tenders-pipeline grupowana (500 ms) z flush przy Ready/Failed, ukryciu karty i zamknięciu.",
      },
      {
        type: "improve",
        text: "Super Admin — flaga pipelinePerfDebouncePersist w ustawieniach (domyślnie wyłączona; rollback bez deployu).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.95",
    label: "NG11 Wave 1 — Progressive Heavy + Cost-first Pricing",
    items: [
      {
        type: "improve",
        text: "Przetargi — pipeline NG11-A1: progressive heavy build (faza kosztorysu + metadata w tle) z partial persist i sygnałami partialDossierReady / dossierEnriching.",
      },
      {
        type: "improve",
        text: "Przetargi — pipeline NG11-Q5: wcześniejsza wycena po partialDossierReady (pricingReadyPartial) i recompute po zakończeniu metadata (pricingReadyFinal).",
      },
      {
        type: "improve",
        text: "Przetargi — PipelineState: Pricing przed Ready; timing pricing.compute_partial / pricing.compute_final (dev telemetry).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.94",
    label: "NG10 — Autonomous Agent UX Complete",
    items: [
      {
        type: "improve",
        text: "Przetargi — Autonomous Agent: timeline 12 kroków i 5 makrogrup postępu analizy (mobile: zwijany panel Postęp analizy).",
      },
      {
        type: "improve",
        text: "Przetargi — Dziennik analizy: pełny feed agentów (osiągnięcia, status, komunikaty live) z auto-scroll.",
      },
      {
        type: "improve",
        text: "Przetargi — Status kontekstowy podczas analizy (np. pobieranie BZP, wycena, opłacalność bez pełnego kosztorysu).",
      },
      {
        type: "improve",
        text: "Przetargi — Przejście do rekomendacji: ekran „Przygotowuję prezentację wyników” z podsumowaniem osiągnięć i snapshotem postępu.",
      },
      {
        type: "improve",
        text: "Przetargi — Limit czasu ~2 min: pasek postępu (po 30 s), komunikat T-30 oraz FAQ „Dlaczego analiza może potrwać dłużej?”.",
      },
      {
        type: "improve",
        text: "Przetargi — Analiza częściowa: chip powodu (limit czasu, brak załączników, dokumenty w toku, wycena w toku) przed ekranem rekomendacji.",
      },
      {
        type: "improve",
        text: "Instrukcja — nowa sekcja FAQ Autonomous Agent (timeline, dziennik, timeout, analiza częściowa).",
      },
    ],
  },
  {
    date: "2026-07-11",
    version: "2.63.91",
    label: "TENDER-WORKSPACE-LAYOUT — scrollowalne accordiony Przetarg",
    items: [
      {
        type: "improve",
        text: "Przetarg — accordiony „Szczegóły postępu”, „Informacje o przetargu” i „Przygotowanie oferty”: wspólny komponent z limitem wysokości i wewnętrznym scrollem (stabilniejszy układ na mobile).",
      },
      {
        type: "improve",
        text: "Tokeny layout accordionów Workspace w tender-ux-tokens — jednakowe max-height desktop/mobile.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.90",
    label: "NG10-HOTFIX-02 — Autonomous Gate timeout bez discovery",
    items: [
      {
        type: "fix",
        text: "Przetargi — Autonomous Agent: po 150 s przejście do rekomendacji nawet gdy pobieranie dokumentów nie zakończyło się (scoring + decyzja HOLD/GO/NO-GO gotowe).",
      },
      {
        type: "improve",
        text: "Ekran rekomendacji — watchout gdy dokumentacja nadal się pobiera po wyjściu timeout.",
      },
      {
        type: "fix",
        text: "Po wejściu do Workspace (AC-11) gate nie przejmuje ponownie ekranu — Workspace uzupełnia się o nowe dane z pipeline.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.89",
    label: "NG10-HOTFIX-01 — Autonomous Gate partial + timeout",
    items: [
      {
        type: "fix",
        text: "Przetargi — Autonomous Agent: po 150 s lub przy analizie częściowej (HOLD/NO-GO) przejście do ekranu rekomendacji zamiast nieskończonego S1 (np. „Oceniam opłacalność”).",
      },
      {
        type: "fix",
        text: "Po wejściu do Workspace gate nie przejmuje ponownie pełnego ekranu w tej samej sesji — pipeline może dokończyć pracę w tle.",
      },
      {
        type: "improve",
        text: "Ekran rekomendacji — banner analizy częściowej i watchout przy przekroczeniu czasu automatycznej analizy.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.88",
    label: "PAYROLL-SIM-01 — Symulacja wypłaty",
    items: [
      {
        type: "new",
        text: "Lista Płac — tryb „Symulacja wypłaty”: tymczasowe wykluczenie osób z sumy wypłaty tygodnia (tylko UI, bez zmiany danych Payroll).",
      },
      {
        type: "improve",
        text: "Eksport PDF/Word/Email listy płac — zawsze pełne dane; symulacja nie wpływa na dokumenty.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.87",
    label: "P0-A — Logowanie iOS Safari (shell)",
    items: [
      {
        type: "fix",
        text: "Logowanie admina/inspektora — try/finally na spinnerze «Zaloguj»; brak nieskończonego passLoading przy błędzie crypto lub localStorage.",
      },
      {
        type: "fix",
        text: "Zapamiętaj hasło — fail-safe: błąd szyfrowania nie blokuje wejścia po poprawnym haśle; czytelne komunikaty PL (Safari, quota).",
      },
      {
        type: "improve",
        text: "Instrukcja — FAQ logowanie iPhone/Safari i kanoniczny adres www.wgdom.fun.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.86",
    label: "NG-10 — Autonomous Tender Workspace",
    items: [
      {
        type: "new",
        text: "Przetargi — Autonomous Agent: pełnoekranowa analiza przy pierwszym wejściu lub gdy dane się zmieniły (fingerprint LS); ekran agenta z feedem, ETA i osiągnięciami pipeline.",
      },
      {
        type: "new",
        text: "Przetargi — ekran rekomendacji (GO / HOLD / NO-GO) przed wejściem do Workspace; CTA zapisuje fingerprint i odsłania NG-08 frame z Executive Brief.",
      },
      {
        type: "improve",
        text: "Pulpit → przetarg: wejście z alertu na zakładkę Przetarg (zamiast Decyzja) — spójność z Autonomous Run.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.85",
    label: "P0 Payroll Cross-Device Sync — SYNC-ARCH-01 S2",
    items: [
      {
        type: "fix",
        text: "Lista Płac — edycje godzin, stawek, premii i potrąceń synchronizują się między urządzeniami (SYNC-ARCH-01 S2: debounced domain push → pwrPush → pushWeekEmployeesToCloud; bez przywracania Payroll do RS push).",
      },
      {
        type: "fix",
        text: "Incydent P0 Payroll Cross-Device Sync — CLOSED · production smoke PASS 2026-07-10 · commit e819124.",
      },
    ],
  },
  {
    date: "2026-07-10",
    version: "2.63.84",
    label: "NG-09-05 — Inspector Program Closeout & Polish",
    items: [
      {
        type: "improve",
        text: "Panel inspektora — InspectorOverlays: wydzielenie warstwy overlay (lightbox, preview, FAB, Toaster, notatki operacyjne); buildRecoverableStatsByJobId — dedup stats; panel orchestrator bez inline overlay JSX.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.83",
    label: "NG-09-04 — Inspector Data Sync Layer",
    items: [
      {
        type: "improve",
        text: "Panel inspektora — Data Sync Layer: wydzielenie useInspectorDataSync (refresh, persist, op-notes commit, cloud UI); InspectorPanel jako orchestrator nawigacji/overlays; bez zmian merge/cloud keys.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.82",
    label: "NG-09-03 — Inspector Job Workspace (L2)",
    items: [
      {
        type: "improve",
        text: "Panel inspektora — Job Workspace L2: wydzielenie InspectorJobWorkspace (6 sekcji job detail); InspectorPanel jako orchestrator stanu/sync; L1 router bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.81",
    label: "NG-09-02 — Inspector View Router (L1)",
    items: [
      {
        type: "improve",
        text: "Panel inspektora — View Router L1: wydzielenie InspectorViewRouter (Dashboard, Roboty, Galeria, Pliki, Portfolio); cieńszy orchestrator InspectorPanel; Job Workspace bez zmian.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.80",
    label: "NG-09-01 — Inspector Workspace Frame",
    items: [
      {
        type: "improve",
        text: "Panel inspektora — Workspace Frame: Command Layer, sidebar desktop (md+), bottom nav mobile, SSOT 5 tabów L1; job detail ukrywa bottom nav.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.79",
    label: "M-03 — Mobile Re-certification",
    items: [
      {
        type: "fix",
        text: "Detal przetargu — mobile re-cert 360–430px: breakpoint cliff 392px (max-[430px]), KPI ukryte do 2xl na tabach ≠ przetarg, skróty min-h-11, parity padding Command Layer (AC-M03-08).",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.78",
    label: "NG-08-HF-01 — Visual Smoke Remediation",
    items: [
      {
        type: "fix",
        text: "Detal przetargu — remediacja Visual Smoke: gęstszy Command Layer (mobile ≤50vh, desktop ≤280px), skróty w jednym wierszu z dotykiem 44px na mobile, przewijanie hubu Podsumowanie oferty w obszarze treści.",
      },
    ],
  },
  {
    date: "2026-07-09",
    version: "2.63.77",
    label: "NG-08-05 — Tender Cost Workspace",
    items: [
      {
        type: "improve",
        text: "Kosztorys i Ceny — most nawigacji między tabami, skrót wyceny w Command Layer i hubie Przetargu, typografia TEUX na wycenie, pamięć scrollu per tab kosztowy.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.76",
    label: "NG-08-04 — Tender Documents Workspace",
    items: [
      {
        type: "improve",
        text: "Zakładka Dokumenty — spójne nagłówki sekcji TEUX, pamięć rozwiniętych grup załączników (round-trip między zakładkami), zwinięte metadane analizy SWZ, większe pola dotyku na mobile.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.75",
    label: "NG-08-03 — Tender Workspace Intelligence",
    items: [
      {
        type: "improve",
        text: "Detal przetargu — kanoniczny hub Podsumowanie oferty na Przetargu (insights + skrót kontekstu), chip skrótu w Command Layer na wszystkich zakładkach (≤1 klik z Dokumentów), typografia TEUX na Decyzji.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.74",
    label: "NG-08-02 — Tender Workspace Progress",
    items: [
      {
        type: "improve",
        text: "Detal przetargu — Process Strip na wszystkich zakładkach workspace (WF-02), highlight „Tu jesteś”, chip blockerów, postęp V2 widoczny poza accordionem na Przetargu, most Kosztorys ↔ pasek procesu.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.73",
    label: "NG-08-01 — Tender Workspace Frame",
    items: [
      {
        type: "improve",
        text: "Detal przetargu — Workspace Frame: breadcrumb Decyzja › sub-sekcja, CTA workflow na wszystkich zakładkach, kontekst continuity w menu Moduł, content max-w-7xl jak lista.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.72",
    label: "NG-07-04 — Lista Przetargów desktop density",
    items: [
      {
        type: "improve",
        text: "Lista przetargów desktop — pełna szerokość content (max-w-7xl), filtry bez cap max-w-4xl, separatory między kartami i ciaśniejsze wiersze dla długiej listy.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.71",
    label: "NG-07-03 — Lista Przetargów karty + empty states",
    items: [
      {
        type: "improve",
        text: "Karty listy przetargów — badge cap 3/4, urgency w top-3, czytelniejsza hierarchia tytuł → zamawiający → KPI; desktop meta Traf./Wad.",
      },
      {
        type: "improve",
        text: "Empty state listy — bez duplikatu Odśwież (SSOT: nagłówek modułu); typografia TEUX zamiast text-[10px].",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.70",
    label: "NG-07-02 — Lista Przetargów first-screen compaction",
    items: [
      {
        type: "improve",
        text: "Przetargi → Lista — zwarty pasek zakładek, wyszukiwarka i banner; licznik wyników w nagłówkach sekcji Dzisiaj/Lista.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.69",
    label: "NG-07-01 — Lista Przetargów KPI dashboard + CTA dedup",
    items: [
      {
        type: "new",
        text: "Przetargi → Lista — panel KPI nad listą (aktywne, do zgłoszenia, ≤7 dni, wymaga decyzji); kliknięcie filtruje listę.",
      },
      {
        type: "improve",
        text: "Nagłówek modułu Przetargi — kompaktowy; jedno przycisk „Odśwież z BZP” (bez duplikatu w pasku wyszukiwania).",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.68",
    label: "PAYROLL-RACE-01 — reconcile przed apply + guard edycji LP",
    items: [
      {
        type: "fix",
        text: "Lista Płac — szybkie edycje dni i przydziałów robót nie cofają się już po synchronizacji chmury (reconcile ze świeżym LocalStorage przed apply).",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.67",
    label: "SMS-UI-01 — Wyczyść wybór odbiorców",
    items: [
      {
        type: "fix",
        text: "SMS pilne — „Wyczyść wybór” nie jest już nadpisywane po synchronizacji chmury; przy otwarciu modala nadal domyślnie zaznaczeni wszyscy z numerem.",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.66",
    label: "NG-06-TEUX-7z — Epic closeout smoke",
    items: [
      {
        type: "improve",
        text: "Testy — smoke agregat NG-06 TEUX (SMOKE-TEUX-NG06): regresja UX Przetargów TEUX-1…7f jednym poleceniem.",
      },
      {
        type: "improve",
        text: "Dokumentacja — formalne zamknięcie epicu NG-06 Tender Experience (design system + polish slices).",
      },
    ],
  },
  {
    date: "2026-07-08",
    version: "2.63.65",
    label: "NG-06-TEUX-7f — Hosted deprecation guard",
    items: [
      {
        type: "improve",
        text: "Przetargi — udokumentowana ścieżka legacy accordion (hosted); prod pozostaje na routingu V4 URL.",
      },
      {
        type: "improve",
        text: "Dev — ostrzeżenie w konsoli przy użyciu TenderDetailPanelHosted (rollback TENDERS_V4_ROUTING=false).",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.64",
    label: "NG-06-TEUX-7e — Strategia + Pulpit",
    items: [
      {
        type: "improve",
        text: "Pulpit — skrót Przetargów: 3 KPI (pilne terminy, decyzje, wygrane bez roboty) zamiast 5; pełny monitoring w Strategii.",
      },
      {
        type: "improve",
        text: "Strategia — ujednolicone etykiety KPI (tokeny TEUX) i SSOT copy bez „Wnioski AI”.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.63",
    label: "NG-06-TEUX-7d — Copy integrity",
    items: [
      {
        type: "improve",
        text: "Instrukcja i lista Przetargów — podpowiedzi listy bez etykiety „AI”; banner to heurystyki lokalne (decyzje, potencjał, terminy).",
      },
      {
        type: "improve",
        text: "Główna akcja na mobile — krótki opis CTA widoczny w Command Layer (line-clamp), bez zmiany logiki rekomendacji.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.62",
    label: "NG-06-TEUX-7c — Accessibility pass",
    items: [
      {
        type: "improve",
        text: "Lista Przetargów — tryb „Zaznacz wiele”: checkbox z etykietą głosową, klawiaturą (Spacja/Enter) i aria-pressed na przełączniku trybu.",
      },
      {
        type: "improve",
        text: "Pasek procesu, chipy zaufania, skróty Przeglądu i podzakładki Decyzji — min. 12 px na elementach interaktywnych, aria-label tam gdzie brakowało.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.61",
    label: "NG-06-TEUX-7b — Command Layer polish",
    items: [
      {
        type: "improve",
        text: "Przetarg → Główna akcja: widoczny powód wyłączenia przycisku (busy lub krok procesu) — bez zmiany logiki CTA.",
      },
      {
        type: "improve",
        text: "Command Layer mobile — kontekst jedną linią (Przetargi › numer › zakładka); zwijane sygnały zaufania; pasek procesu i CTA zawsze widoczne.",
      },
      {
        type: "improve",
        text: "Opcjonalny zapis stanu zwinięcia sygnałów zaufania w przeglądarce (UI-only).",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.60",
    label: "NG-06-TEUX-7a — Filtry listy Przetargów",
    items: [
      {
        type: "improve",
        text: "Lista Przetargów — filtry w panelu SSOT (kolejka, klienci, zakres, presety) z chipami TenderUxChip.",
      },
      {
        type: "improve",
        text: "Mobile — przycisk FAB otwiera arkusz filtrów; desktop — zwijany blok „Więcej filtrów” (więcej miejsca na karty).",
      },
      {
        type: "improve",
        text: "Opcjonalny zapis stanu zwinięcia filtrów w przeglądarce (UI-only).",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.59",
    label: "NG-06-TEUX-6 — Empty states Przetargów",
    items: [
      {
        type: "improve",
        text: "Moduł Przetargi — wspólny komponent TenderUxEmptyState (ikona, tytuł, opis, CTA).",
      },
      {
        type: "improve",
        text: "Lista — dwa scenariusze pustej listy (pusta baza vs filtry) z przyciskami Wyczyść filtry / Odśwież z BZP.",
      },
      {
        type: "improve",
        text: "Mapa — empty state z CTA Przejdź do listy; dokumenty platformy i kosztorys — ujednolicony UI z zachowaną logiką platformy.",
      },
      {
        type: "improve",
        text: "Kosztorys — przycisk Przejdź do Dokumentów (deep link V4).",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.58",
    label: "NG-06-TEUX-5 — Loading skeletons Przetargów",
    items: [
      {
        type: "improve",
        text: "Moduł Przetargi — skeleton nagłówka, tabów i 3 kart listy zamiast samego tekstu „Ładowanie…”.",
      },
      {
        type: "improve",
        text: "Dokumenty — skeleton podsumowania (5 slotów) i załączników podczas skanowania BZP.",
      },
      {
        type: "improve",
        text: "Kosztorys BOQ — 8-row skeleton podczas przetwarzania; stepped label Pobieranie → Załączniki → Analiza.",
      },
      {
        type: "improve",
        text: "TenderUxSkeleton — spójny wrapper na ui/skeleton (TOKEN FREEZE bez zmian tokenów).",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.57",
    label: "NG-06-TEUX-4 — Mobile chrome Przetargów",
    items: [
      {
        type: "new",
        text: "TenderModuleNavSheet — z detalu mobile przejdź do Strategii, Mapy, Profilu bez powrotu do listy.",
      },
      {
        type: "improve",
        text: "Command Layer — przycisk Moduł w jednym rzędzie z Powrót; density pass ≤390px.",
      },
      {
        type: "improve",
        text: "Tab bar detalu — scroll shadow; Operator Action Bar safe-area max(1rem, inset-bottom).",
      },
      {
        type: "improve",
        text: "test: LIB-TENDER-MOBILE-TEUX4 — gate B scope:tenders.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.56",
    label: "NG-06-TEUX-3 — karty listy Przetargów",
    items: [
      {
        type: "new",
        text: "TenderListMobileCard i TenderListDesktopCard — severity stripe, TenderUxBadge, KPI row (Termin · Trafność · Wadium).",
      },
      {
        type: "improve",
        text: "Lista Przetargów — mobile < lg / desktop ≥ lg; badge overflow +N; bulk touch 44px.",
      },
      {
        type: "improve",
        text: "test: LIB-TENDER-LIST-CARDS-TEUX3 — gate B scope:tenders.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.55",
    label: "NG-06-TEUX-2 — Design Tokens (foundation)",
    items: [
      {
        type: "new",
        text: "SSOT tender-ux-tokens.ts — typography, spacing, color roles, motion (TOKEN FREEZE do MID EPIC REVIEW).",
      },
      {
        type: "new",
        text: "TenderUxBadge, TenderUxChip, TenderUxSectionTitle — design-system modułu Przetargi.",
      },
      {
        type: "improve",
        text: "Adopcja tokenów: TendersModule (tab bar + header) i TenderDetailKpiCompact (KPI 11px).",
      },
      {
        type: "improve",
        text: "test: LIB-TENDER-UX-TOKENS-TEUX2 — gate B scope:tenders.",
      },
    ],
  },
  {
    date: "2026-07-07",
    version: "2.63.54",
    label: "NG-06-TEUX-1 — nawigacja V4 z mapy Przetargów",
    items: [
      {
        type: "fix",
        text: "Mapa przetargów — klik marker otwiera detal V4 (/przetargi/:id/przetarg) zamiast rozwijania accordion na liście.",
      },
      {
        type: "improve",
        text: "SSOT helper openTenderDetailV4 — wspólna nawigacja ze Strategii, listy i mapy.",
      },
      {
        type: "improve",
        text: "test: LIB-TENDER-DETAIL-NAV-TEUX1 — gate nawigacji TEUX-1.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.53",
    label: "Core — legacy compat cleanup F2 (#5C-5C)",
    items: [
      {
        type: "improve",
        text: "Usunięto martwe ścieżki zapisu legacy catalog (router, save store, compat UI) — prod nadal work_only + resolveCatalogForEngine.",
      },
      {
        type: "improve",
        text: "test: LIB-5C-5C-LEGACY-CLEANUP-F2 — gate router/compat + zero persistKey kw-wgdom-cost-catalog.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.52",
    label: "Core — legacy cleanup F1 orphan reconcile (#5C-5C)",
    items: [
      {
        type: "improve",
        text: "Usunięto martwy orchestrator reconcile (PB-WRITE-C) i eksporty z public API Work Catalog — bez zmian deferred bootstrap ONE-SHOT.",
      },
      {
        type: "improve",
        text: "test: LIB-5C-5C-LEGACY-CLEANUP-F1 — suite smoke-work-catalog-p2-mvp → 30 testIds.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.51",
    label: "Core — bootstrap/reconcile decouple (#5C-5B)",
    items: [
      {
        type: "improve",
        text: "Deferred bootstrap — finalizeWorkCatalogAfterDeferredMerge bez cyklicznego odczytu legacy i bez reconcile; ONE-SHOT migrate tylko przy pustym Work Catalog.",
      },
      {
        type: "improve",
        text: "Lista Płac / Payroll — bez zmian kodu; obowiązkowy gate Payroll Bootstrap Integrity przy release.",
      },
      {
        type: "improve",
        text: "test: LIB-5C-5B-BOOTSTRAP-DECOUPLE — suite smoke-work-catalog-p2-mvp → 29 testIds.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.50",
    label: "Core — legacy KV sync quiesce (#5C-5A)",
    items: [
      {
        type: "improve",
        text: "Cloud sync — wyciszenie synchronizacji kw-wgdom-cost-catalog (deferred fetch/merge/push); historia kw-wgdom-cost-catalog-history bez zmian.",
      },
      {
        type: "improve",
        text: "Bootstrap/reconcile — nadal czytają local legacy; runtime wyceny bez zmian (Work Catalog SSOT).",
      },
      {
        type: "improve",
        text: "test: LIB-LEGACY-KV-SYNC-QUIESCE-5C5A — gate sync quiesce; suite smoke-work-catalog-p2-mvp → 28 testIds.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.49",
    label: "Przetargi — history SSOT from Work Catalog (#5C-3D)",
    items: [
      {
        type: "improve",
        text: "Historia stawek — snapshot po zapisie Biblioteki Robót (Work Catalog → kw-wgdom-cost-catalog-history); neutralny loader w Ustawieniach wyceny.",
      },
      {
        type: "improve",
        text: "Trend/benchmark — „Brak danych historycznych” gdy brak snapshotów w oknie 90 dni (bez backfillu legacy).",
      },
      {
        type: "improve",
        text: "test: LIB-HISTORY-SSOT-5C3D — gate history SSOT; suite smoke-work-catalog-p2-mvp → 27 testIds.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.48",
    label: "Przetargi — dead UX cleanup (#5C-3C)",
    items: [
      {
        type: "improve",
        text: "Ustawienia wyceny — usunięto martwy CTA „Zapisz bazę cen”; scalony intro + jedno CTA do Biblioteki Robót.",
      },
      {
        type: "improve",
        text: "Copy SSOT — calculator / GuideView / WorkCatalogView bez „Baza cen” i „katalog WGDOM”; WGDOM_COST_REGION_LABELS w wgdom-cost-catalog.",
      },
      {
        type: "improve",
        text: "test: LIB-DEAD-UX-CLEANUP-5C3C — grep gate dead UX; suite smoke-work-catalog-p2-mvp → 26 testIds.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.47",
    label: "Przetargi — preview data SSOT cutover (#5C-3B)",
    items: [
      {
        type: "improve",
        text: "Ustawienia wyceny — stawki kategorii z resolveActiveCatalogForTender() (Work Catalog SSOT); buildPriceBasePreviewRows() pure.",
      },
      {
        type: "improve",
        text: "pricingCatalogRevision invaliduje podgląd stawek po zapisie Biblioteki Robót (bez F5).",
      },
      {
        type: "improve",
        text: "test: LIB-PREVIEW-SSOT-5C3B — parity preview ↔ resolver; historia trend → #5C-3D.",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.46",
    label: "Przetargi — UX copy & navigation cutover (#5C-3A)",
    items: [
      {
        type: "improve",
        text: "CATALOG_UX_SOURCE_LABEL — jedna etykieta „Biblioteka Robót” we wszystkich widokach źródła wyceny; usunięto „Katalog WGDOM” z UI.",
      },
      {
        type: "improve",
        text: "Zakładka pricebase → „Ustawienia wyceny”; CTA Wycena/UNKNOWN → Biblioteka Robót; GuideView i FAQ zsynchronizowane z SSOT.",
      },
      {
        type: "improve",
        text: "test: LIB-UX-COPY-CUTOVER-5C3A — grep gate copy + nawigacja (preview loader bez zmian — #5C-3B).",
      },
    ],
  },
  {
    date: "2026-07-06",
    version: "2.63.45",
    label: "Przetargi — Write SSOT work_only default (#5C-2)",
    items: [
      {
        type: "improve",
        text: "catalogWriteMode domyślnie work_only — formalny Write SSOT Biblioteki Robót; legacy write tylko w testach routera.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.44",
    label: "Przetargi — Read SSOT Work Catalog only (#5C-1)",
    items: [
      {
        type: "improve",
        text: "resolveActiveCatalogForTender() — work-only read path: zero legacy KV w resolverze, zawsze Biblioteka Robót w UI wyceny.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.43",
    label: "Przetargi — odświeżanie wyceny po zapisie Biblioteki Robót (#5C-0A)",
    items: [
      {
        type: "fix",
        text: "pricingCatalogRevision — globalny token invalidacji React: wycena, BOQ, benchmark i pipeline odświeżają się po zmianie ceny/aktywności w Bibliotece Robót (bez reloadu).",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.42",
    label: "Deferred bootstrap — unified React hydration (#6E)",
    items: [
      {
        type: "improve",
        text: "DeferredBootstrapState (idle/running/done) — jednolite odświeżenie React po zakończeniu deferred bootstrap; Work Catalog i moduły admin czytają świeży LS bez race mountu.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.41",
    label: "Work Catalog P2.10 — Roboty ulubione",
    items: [
      {
        type: "improve",
        text: "Biblioteka Robót → Roboty: gwiazdka ulubione na karcie robota (zapis do chmury), chip filtr Ulubione, sortowanie ulubionych na górze listy oraz licznik ulubionych w nagłówku.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.40",
    label: "Work Catalog P2.9 — Pakiety filtry i badge kroków",
    items: [
      {
        type: "improve",
        text: "Biblioteka Robót → Pakiety: filtr Ulubione (współpracuje z wyszukiwaniem, branżą i aktywnością), badge osieroconych lub nieaktywnych kroków na liście oraz licznik ulubionych w nagłówku.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.39",
    label: "Work Catalog P2.8 — Pakiety UX MIN",
    items: [
      {
        type: "improve",
        text: "Biblioteka Robót → Pakiety: walidacja zapisu (min. 1 krok, poprawna robota w katalogu), ulubione z sortowaniem na górze listy oraz opcjonalny szacowany czas realizacji (dni).",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.38",
    label: "Work Catalog P2.7 — Pakiety robót MIN",
    items: [
      {
        type: "new",
        text: "Biblioteka Robót — zakładka Pakiety: CRUD pakietów robót (nazwa, branża, kroki z ilością i notatką, reorder, duplikacja, aktywność) z sync kw-wgdom-work-bundles.",
      },
      {
        type: "improve",
        text: "Usuwanie pakietu wymaga potwierdzenia w dialogu; po zapisie pozostaje zaznaczony edytowany pakiet.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.37",
    label: "Work Catalog P2 — test manifest sync",
    items: [
      {
        type: "improve",
        text: "Test manifest — suite smoke-work-catalog-p2-mvp (golden + P2.1–P2.6, scope:work-catalog) dla regresji Biblioteki Robót MVP.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.36",
    label: "Roboty 2.0 MIN — instrukcja i test manifest",
    items: [
      {
        type: "improve",
        text: "Instrukcja — FAQ Roboty opisuje 3 KPI (W toku, Do odbioru, BZP) i widoczne kolejki, zgodnie z UI prod od 20.5Z.4A.",
      },
      {
        type: "improve",
        text: "Test manifest — LIB-JOBS-LIST-OPS-20-MIN (scope:jobs) dla regresji job-list-ops.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.35",
    label: "Przetargi — instrukcja Dokumenty (7 grup)",
    items: [
      {
        type: "improve",
        text: "Instrukcja — zakładka Dokumenty opisuje listę w 7 grupach biznesowych (accordion), zgodnie z UI na produkcji od wersji 2.62.72+.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.34",
    label: "Mobile — stabilizacja scrollu (MOBILE-P0-S1)",
    items: [
      {
        type: "fix",
        text: "Safari iOS — wysokość shell z visualViewport (--app-height), scroll w widokach Przetargi i Pulpit bez utkniętego sticky.",
      },
      {
        type: "improve",
        text: "Reset blokady scrollu modala przy zmianie widoku — brak „zamrożonego” ekranu po nawigacji.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.33",
    label: "Platform sync — reconcile notatek operacyjnych",
    items: [
      {
        type: "fix",
        text: "Auto-sync nie cofa już archiwizacji notatki operacyjnej — świeży LocalStorage jest scalany po zakończeniu pull z chmury.",
      },
    ],
  },
  {
    date: "2026-07-05",
    version: "2.63.32",
    label: "Przetargi — Owner View: roboty z PDF i liczba pozycji",
    items: [
      {
        type: "improve",
        text: "Podgląd przedmiaru/kosztorysu PDF — uczciwa liczba pozycji (W trakcie analizy / Nie ustalono liczby pozycji zamiast fałszywego 0)",
      },
      {
        type: "new",
        text: "Executive Summary (P2A) — główne roboty z tekstu PDF gdy brak działów i katalogu w snapshot (Case 2 przedmiar); rozszerzony słownik branż (sanitarne, wykończeniowe)",
      },
    ],
  },
  {
    date: "2026-07-04",
    version: "2.63.31",
    label: "RC-B — usunięcie artefaktów debug payroll pipeline",
    items: [
      {
        type: "improve",
        text: "RC-B debug cleanup — usunięto __wgdomPayrollPipelineDebug, console.warn RC-B i helpery diagnostyczne (logika PWRB/merge/sync bez zmian)",
      },
    ],
  },
  {
    date: "2026-07-04",
    version: "2.63.30",
    label: "SYNC-ARCH-01 RC-B-1 — PWRB Facade + tombstone revocation",
    items: [
      {
        type: "fix",
        text: "RC-B-1 — re-add pracownika nie blokuje stale tombstone (I-1…I-4, G-0); facade payroll-week-roster-bundle",
      },
      {
        type: "improve",
        text: "I-4 coupled push roster+tombstones; Edge I-2 pair normalization; import/restore przez pwrImportMerge/pwrReconcile",
      },
      {
        type: "new",
        text: "Testy audit-pwrb-boundary + test-pwrb-boundary-rcb + test-payroll-tombstone-revocation-rcb",
      },
    ],
  },
  {
    date: "2026-07-04",
    version: "2.63.29",
    label: "PAYROLL Runtime Trace — logger diagnostyczny v1.1",
    items: [
      {
        type: "new",
        text: "Runtime Trace — ring buffer 300 eventów + __wgdomPayrollTraceDump(operationId?) wg SSOT v1.1 (emitters P0/P1, GAP-A/B/C)",
      },
      {
        type: "new",
        text: "Konsola: __wgdomPayrollTraceSetDevice / __wgdomPayrollTraceSetOperation + localStorage wg-payroll-trace-operation-id przed repro",
      },
      {
        type: "new",
        text: "Testy — test-payroll-runtime-trace-compliance.mjs (35) + test-payroll-runtime-trace-repro.mjs",
      },
    ],
  },
  {
    date: "2026-07-04",
    version: "2.63.28",
    label: "SYNC-ARCH-01 S1 — RS push bez payroll + fingerprint non-payroll",
    items: [
      {
        type: "improve",
        text: "S1-1 — Full Bundle RS push wyklucza payroll (kw-week-employees, kw-weekFrom, kw-weekTo, kw-archive + tombstones); brak replaceWeekEmployeesKeys w RS",
      },
      {
        type: "improve",
        text: "S1-2 — AC4 no-change=no-push: fingerprint tylko RS subset (rsBundleFingerprintFromMerged); edycja LP bez zmiany non-payroll nie wymusza batch-set",
      },
      {
        type: "new",
        text: "Testy SYNC-ARCH-01 S1 — test-sync-arch-01-s1-rs-no-payroll-push.mjs (22) + test-sync-arch-01-s2-rs-fingerprint.mjs (13)",
      },
    ],
  },
  {
    date: "2026-07-02",
    version: "2.63.27",
    label: "TI-B4 — smoke agregat Przetargi NG-01–NG-04",
    items: [
      {
        type: "new",
        text: "Smoke agregat Przetargi — test-tenders-stabilization-smoke.mjs (12 child lib NG-01–04, fail-fast)",
      },
      {
        type: "new",
        text: "Manifest test-infra 1.1.0 — SMOKE-TENDERS-NG01-04 · suite smoke-stabilization-ng01-04 · scope:tenders",
      },
      {
        type: "improve",
        text: "Release gate B Przetargów — npm run test:infra -- --gate B --scope tenders (Z-04)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.26",
    label: "TEST-INFRA-001 — manifest + orchestrator + Payroll Harness S1",
    items: [
      {
        type: "new",
        text: "Infrastruktura testowa TEST-INFRA-001 MVP — manifest SSOT (test-infra/test-manifest.json), orchestrator (npm run test:infra), klasy lib/smoke/e2e/audit",
      },
      {
        type: "new",
        text: "Payroll Harness E2E preview — PAYROLL-GUARD-S1 (Lista Płac → Przydziały robót) w gate C",
      },
      {
        type: "improve",
        text: "Release gates A/B/C mapowane na suite z manifestu — zero hardcoded list w orchestratorze",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.25",
    label: "Audit Hub — świeżość feedu (AH-REG-1)",
    items: [
      {
        type: "fix",
        text: "Audit Hub — wpisy security log widoczne od razu po akcji (notify + listener); sync chmury odświeża AUX audytu",
      },
      {
        type: "improve",
        text: "refreshAuditHubAuxFromCloud — jeden pull security + wm-druk w runCloudSync i pullFromCloudAndMerge",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.24",
    label: "Lista Płac — Restore Banner False Positive",
    items: [
      {
        type: "fix",
        text: "Baner „Przywróć z archiwum” — tylko gdy archiwum ma więcej dni roboczych lub godzin (payrollMetrics); bez fałszywych alarmów przy zgodnych sumach LP",
      },
      {
        type: "improve",
        text: "Opis banera dopasowany do rzeczywistej logiki porównania (godziny i dni w archiwum vs bieżąca lista)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.23",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B6 (Edge Parity)",
    items: [
      {
        type: "fix",
        text: "Edge batch-set — union kw-week-employees po directoryId (weekEmployeeMergeKey); dodanie z Kadr/worker nie ginie przy expansion guard",
      },
      {
        type: "improve",
        text: "SSOT payroll-week-employee-merge.ts — wspólna semantyka merge listy klient + Edge; restore-payroll-backup ten sam union",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.22",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B5 (Closed Week UI)",
    items: [
      {
        type: "fix",
        text: "Lista płac — tydzień historyczny (closed): jedno źródło wyświetlania displayEmployees (snapshot lub pusty); panel szczegółów i eksport bez split-brain z live kw-week-employees",
      },
      {
        type: "improve",
        text: "Tydzień closed — tryb read-only w LP: brak mutacji rosteru, przydziałów i edycji dni/stawek; empty state gdy brak archiwum",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.21",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B4 (Bootstrap Merge SSOT)",
    items: [
      {
        type: "fix",
        text: "Lista płac — ujednolicony merge payroll bootstrap (F5) i runtime (pull/sync): finalizePayrollBundleMerge SSOT; P11 richness override także przy focus sync, nie tylko przy odświeżeniu strony",
      },
      {
        type: "improve",
        text: "Anti-leak po rolloverze pozostaje wyłącznie w ścieżce runtime (applyRuntimePayrollAntiLeak)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.20",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B3.2 (payrollRosterPushRef cleanup)",
    items: [
      {
        type: "improve",
        text: "Lista płac — usunięto legacy payrollRosterPushRef; defer pull/auto-sync wyłącznie przez CloudSyncMutationGuard + suppress (push składu, sync stawek z kartoteki, rollover)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.19",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B3.1 (Guard Rollover)",
    items: [
      {
        type: "fix",
        text: "Przejście tygodnia listy płac (rollover) — push do chmury chroniony CloudSyncMutationGuard (scope kw-week-employees); auto-sync nie nadpisuje pustego nowego tygodnia",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.18",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY Etap 2 B3 (Guard Phase 2)",
    items: [
      {
        type: "improve",
        text: "Lista płac — push składu tygodnia przez CloudSyncMutationGuard (scope kw-week-employees); ten sam mechanizm co Przydziały w LP",
      },
      {
        type: "fix",
        text: "Sync stawek z kartoteki — auto-sync nie nadpisuje składu podczas zapisu do chmury (guard + zachowany payrollRosterPushRef)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.17",
    label: "Lista Płac + Roboty — PAYROLL-CLOUD-RECOVERY Etap 2",
    items: [
      {
        type: "fix",
        text: "Lista płac — błąd zapisu składu do chmury (dodanie/usunięcie z Kadr) pokazuje toast zamiast cichego niepowodzenia",
      },
      {
        type: "fix",
        text: "Roboty → Pracownicy — edycja wpisów workEntries chroniona CloudSyncMutationGuard (ten sam wzorzec co Przydziały w LP)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.16",
    label: "Lista Płac — Przydziały robót sync guard P0",
    items: [
      {
        type: "fix",
        text: "Przydziały robót — pierwszy wybór roboty w dropdown nie cofa się po synchronizacji chmury (CloudSyncMutationGuard)",
      },
      {
        type: "improve",
        text: "Auto-sync — blokada pull/merge podczas edycji workEntries (token begin/end, recovery reset przy bootstrap)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.15",
    label: "Lista Płac — PAYROLL-CLOUD-RECOVERY P0 (dodanie z Kadr)",
    items: [
      {
        type: "fix",
        text: "Lista płac — dodanie pracownika z Kadr nie znika po synchronizacji chmury (merge UNION po directoryId, nie UUID-subset)",
      },
      {
        type: "fix",
        text: "Dodaj z kartyoteki — brak duplikatu tej samej osoby w składzie tygodnia (dedup po directoryId)",
      },
      {
        type: "improve",
        text: "Auto-sync chmury — nie nadpisuje świeżo dodanego składu podczas push listy płac (payrollRosterPushRef + suppress)",
      },
    ],
  },

  {
    date: "2026-07-01",
    version: "2.63.13",
    label: "INSPECTOR-JOB-ASSIGN-001 — przypisanie inspektora WM",
    items: [
      {
        type: "new",
        text: "Roboty — obowiązkowe pole Inspektor WM przy tworzeniu i edycji roboty (assignedInspectorId)",
      },
      {
        type: "improve",
        text: "Panel inspektora — widzi tylko roboty przypisane do swojego konta; notatki operacyjne z linkedJobId tylko dla własnych robót",
      },
      {
        type: "fix",
        text: "Sync inspektora — pełna tablica kw-jobs w jobsAll; jobsVisible tylko do UI (#012)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.12",
    label: "NG-04.4 — Polish & EPIC Close",
    items: [
      {
        type: "improve",
        text: "BOQ Explorer — polish UX/a11y: hierarchia nagłówka, Benchmark rbh, tooltip ATH tylko przy braku ceny/dopasowania, empty states (#010 Polish Only)",
      },
      {
        type: "improve",
        text: "HelpView FAQ Kosztorys PRO — BOQ Explorer, benchmark rbh, wyjaśnienia ATH; EPIC NG-04 zamknięty",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.11",
    label: "NG-04.3 — ATH Fidelity",
    items: [
      {
        type: "new",
        text: "Przetargi → Kosztorys BOQ Explorer: deterministyczne tooltipy ATH (priced / brak ceny / brak dopasowania) — Principles #008–#009",
      },
      {
        type: "improve",
        text: "Source chip (typ dokumentu, pewność, plik) + CTA do pełnego podglądu ATH — derived cache buildBoqAthPresentationCache, bez re-parse",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.10",
    label: "NG-04.2 — Benchmark per Line",
    items: [
      {
        type: "new",
        text: "Przetargi → Kosztorys BOQ Explorer: badge benchmarku robocizny per linia (below/ok/above) — reuse LaborBenchmarkStatusBadge",
      },
      {
        type: "improve",
        text: "Derived UI cache buildBoqLaborBenchmarkCache — brak rebuild przy search/filter; Principles #004–#007 (Presentation Metadata Only)",
      },
    ],
  },
  {
    date: "2026-07-01",
    version: "2.63.9",
    label: "NG-04.1 — Kosztorys BOQ Explorer",
    items: [
      {
        type: "new",
        text: "Przetargi → Kosztorys: BOQ Explorer — unified tabela ATH + WGDOM, search, filtry branżowe (ViewModel SSOT · Principle #001–#003)",
      },
      {
        type: "improve",
        text: "TOP 20 pozycji kosztowych — selectTopCostRows() SSOT; brak rebuild ViewModel przy search/filter (Lazy Rendering First)",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.8",
    label: "P0 — Tender Detail tab SSOT",
    items: [
      {
        type: "fix",
        text: "Przetargi V4 — aktywny tab detalu (Przetarg/Dokumenty/…) ze SSOT URL; przełączanie zakładek znów aktualizuje workspace po klienckim navigate",
      },
      {
        type: "fix",
        text: "Deep link / detal V4 — synchronizacja modułowego activeTab=Lista z URL (brak „dwóch layoutów” przy zapisanym tabie Strategia)",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.7",
    label: "NG-03.7 — Polish & EPIC CLOSE",
    items: [
      {
        type: "improve",
        text: "Przetargi V4 — touch targets ≥44 px (taby, CTA, Action Bar, accordiony); tablet 640–1023 px: immersive detal, karty zamiast tabel, sticky Action Bar",
      },
      {
        type: "improve",
        text: "NG-03 EPIC CLOSE — HelpView (Command Layer · Action Bar · Portfolio · Mobile Cards); micro-copy i dostępność accordionów",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.6",
    label: "P0 — Command Layer height (Przetarg)",
    items: [
      {
        type: "fix",
        text: "Przetargi → detal Przetarg: Command Layer mieści się w limicie Design Freeze (≤280 px desktop · ≤50vh mobile) — treść znów scrolluje",
      },
      {
        type: "improve",
        text: "Status Ribbon compact + ultra-compact (≤390 px); postęp analizy przeniesiony do accordionu Szczegóły postępu",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.5",
    label: "NG-03.6 — Strategy Bridge (Przetarg)",
    items: [
      {
        type: "improve",
        text: "Przetarg → Pozycja w portfolio (score, decyzja, ranking) + link do modułu Strategia z kontekstem przetargu",
      },
      {
        type: "improve",
        text: "Strategia — karta kontekstu po przejściu z detalu; powrót do przetargu zachowuje tenderId",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.4",
    label: "NG-03.5 — Mobile Cards (Przetarg)",
    items: [
      {
        type: "improve",
        text: "Przetargi → Kosztorys, Ceny i Dokumenty na telefonie: tabele jako karty (bez poziomego scrollu ≤390 px); desktop bez zmian",
      },
      {
        type: "improve",
        text: "Przetargi → Ceny: pozycje UNKNOWN w widoku kartowym z przypisaniem kategorii na mobile",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.3",
    label: "NG-03.4 — Workspace Density (Przetarg)",
    items: [
      {
        type: "improve",
        text: "Przetargi → mniejsza gęstość — V2 skrócone w accordionie postępu (bez osi czasu i siatki dokumentów), checklista max 5 + rozwiń",
      },
      {
        type: "improve",
        text: "Przetargi → Przygotowanie oferty i warunki udziału zwinięte domyślnie; skrót kwalifikacji z linkiem do Decyzja",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.2",
    label: "NG-03.3 — Operator Action Bar",
    items: [
      {
        type: "improve",
        text: "Przetargi → Operator Action Bar — Upload, Analiza, e-Zamówienia i Eksport PDF w osobnym pasku (desktop pod Command Layer, mobile sticky na dole)",
      },
      {
        type: "improve",
        text: "Przetargi → bez duplikacji akcji w sekcji operatora i nagłówku karty ofertowej gdy Action Bar aktywny",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.1",
    label: "NG-03.2 — Tender Workspace Command Layer",
    items: [
      {
        type: "improve",
        text: "Przetargi → Command Layer — KPI Compact (4 komórki), Status Ribbon (Trust + Process Strip + postęp analizy) i Primary CTA w sticky chrome na zakładce Przetarg",
      },
      {
        type: "improve",
        text: "Przetargi → Hub — V2 postęp i informacje o przetargu domyślnie zwinięte (accordion); pełne KPI (8) w sekcji Informacje",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.63.0",
    label: "NG-03.1 — Tender Workspace Navigation",
    items: [
      {
        type: "improve",
        text: "Przetargi → detal V4 — 5 aktywnych tabów (bez placeholderów Strategia/Materiały); stare URL /strategia i /materialy przekierowują na Przetarg",
      },
      {
        type: "improve",
        text: "Przetargi → Decyzja — widoczne sub-taby Przegląd · Kwalifikacja · Oferta (?ws= bez zmian)",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.62.99",
    label: "NG-03 P0 — zakładka Ceny (priceOverrides runtime)",
    items: [
      {
        type: "fix",
        text: "Przetargi → Ceny — naprawa ReferenceError tenderPriceOverrides; override cen z SSOT useTenderPricingAuto przez pipelineRuntime",
      },
    ],
  },
  {
    date: "2026-06-30",
    version: "2.62.98",
    label: "NG-02.1C — Production Bootstrap Fix",
    items: [
      {
        type: "fix",
        text: "Przetargi — auto discovery: brak fałszywego ukończenia przy 0 dokumentów (discoveryCompleted tylko gdy są załączniki)",
      },
      {
        type: "fix",
        text: "Przetargi — reset sticky bootstrap przy settled-empty; ponowne wejście uruchamia discovery jak „Odśwież BZP”",
      },
      {
        type: "fix",
        text: "Przetargi — zapis dokumentów BZP po cleanup effect (apply-on-success); koniec utraty patch przy race bootstrapKey",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.97",
    label: "NG-02.1B — Pipeline Lifecycle Stabilization",
    items: [
      {
        type: "fix",
        text: "Przetargi — auto discovery ponawia skan przy pustym settled (0 załączników); koniec rozjazdu pipeline vs „Odśwież BZP”",
      },
      {
        type: "fix",
        text: "Heavy Parse — naprawa deadlock inflight po przełączeniu zakładek; retry heavy nie resetuje discovery",
      },
      {
        type: "improve",
        text: "SSOT runTenderFullDocumentDiscovery — jedna ścieżka: bootstrap · Odśwież BZP · Szukaj u zamawiającego · rescan monitora",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.96",
    label: "NG-02.1A — Unified Attachment Gate",
    items: [
      {
        type: "fix",
        text: "Przetargi — Heavy Parse startuje także przy samych plikach external (SmartPZP/BIP); koniec zawieszonej fazy e5 bez workera",
      },
      {
        type: "improve",
        text: "SSOT bramki załączników — deriveUnifiedAttachmentGate · buildHeavyParseDocumentSet (BZP + external, dedup URL)",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.95",
    label: "NG-02 — Tender Automation Pipeline P0",
    items: [
      {
        type: "new",
        text: "Przetargi — automatyczny pipeline po otwarciu (dokumenty, kosztorys, wycena) na każdej zakładce V4; SSOT useTenderPipelineRuntime",
      },
      {
        type: "improve",
        text: "External discovery — auto-parse plików u zamawiającego w bootstrap (bez osobnego kliknięcia)",
      },
      {
        type: "improve",
        text: "Health kosztorysu — monitor fazy e5 (koniec „zawieszonej analizy”); retry po zmianie zakładek",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.94",
    label: "NG-01-UX-HF-001 — Trust UI Surface Policy",
    items: [
      {
        type: "improve",
        text: "Przetarg — mniej powtórzeń statusów: banner trust tylko przy problemie, chipy z limitem i +N, bez duplikatu Prep Status",
      },
      {
        type: "improve",
        text: "Pasek procesu — jedna ikona na etap (trust ma priorytet nad postępem workflow)",
      },
      {
        type: "improve",
        text: "Kosztorys / Dokumenty / Wycena — jedna dominująca powierzchnia statusowa na zakładkę (badge, inline hint, pojedynczy komunikat)",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.93",
    label: "NG-01.2 — Tender Trust Layer UI",
    items: [
      {
        type: "new",
        text: "Jakość danych przetargowych — banner i chipy trust na Przetargu, Dokumentach, Kosztorysie i Wycenie (SSOT buildTenderTrustAssessment)",
      },
      {
        type: "improve",
        text: "Pasek procesu oferty — ikony trust przy etapach (overlay; logika postępu bez zmian)",
      },
      {
        type: "improve",
        text: "Wycena — komunikaty o braku kosztorysu z warstwy trust zamiast osobnej logiki missingKosztorys",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.92",
    label: "SUPER ADMIN ACL — Instrukcja i Zmiany",
    items: [
      {
        type: "improve",
        text: "Instrukcja i Zmiany — osobne pozycje menu; domyślnie tylko Super Administrator",
      },
      {
        type: "improve",
        text: "⚙ Ustawienia: przełączniki „Instrukcja dla administratorów” i „Zmiany dla administratorów” (AppSettings, chmura)",
      },
      {
        type: "fix",
        text: "Bez uprawnień — ukryte menu i przekierowanie na Pulpit przy ręcznym wejściu",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.91",
    label: "PB-WRITE-C — Reconcile legacy → Biblioteka Robót",
    items: [
      {
        type: "improve",
        text: "PB-WRITE-C: reconcile legacy Bazy cen → Work Catalog po starcie (idempotentny, LWW po updatedAt)",
      },
      {
        type: "fix",
        text: "Nie nadpisuje robót z nowszym work.updatedAt; wynik PBWriteReconcileResult w logach",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.90",
    label: "WC-P2.1-HF1 — Biblioteka Robót embedded scroll",
    items: [
      {
        type: "fix",
        text: "Przetargi → Biblioteka robót: jeden scroll na zakładce (jak Baza cen) — dostęp do wszystkich wierszy i edycji",
      },
      {
        type: "improve",
        text: "WorkCatalogView layout standalone/embedded; pasek edycji wielu sticky (nie fixed)",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.89",
    label: "PB-WRITE-B — Baza cen read-only + CTA Biblioteka Robót",
    items: [
      {
        type: "improve",
        text: "Przetargi → Baza cen: stawki kategorii (robocizna, materiały) tylko odczyt — edycja w Bibliotece Robót",
      },
      {
        type: "improve",
        text: "Baner + CTA „Przejdź do Biblioteki Robót”; parametry firmy (RBH, marża) nadal zapisywalne",
      },
      {
        type: "improve",
        text: "Ukryto „Przywróć domyślny katalog”; „Zapisz bazę cen” wyłączone — aktywny „Zapisz parametry firmy”",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.88",
    label: "PB-WRITE-A — Catalog Write Router (split domyślnie)",
    items: [
      {
        type: "improve",
        text: "catalog-write-router — jedyny entry point zapisu kw-wgdom-cost-catalog i kw-wgdom-work-catalog",
      },
      {
        type: "improve",
        text: "AppSettings catalogWriteMode: split · work_only · legacy_only (domyślnie split — bez zmiany prod)",
      },
      {
        type: "improve",
        text: "Baza cen, Biblioteka robót i PB-3 bootstrap — zapis przez router (bez mirror-write)",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.87",
    label: "Biblioteka Robót — WC-P2.1 nawigacja w Przetargach + ACL",
    items: [
      {
        type: "improve",
        text: "Biblioteka robót — zakładka w module Przetargi (usunięto osobny wpis w menu bocznym)",
      },
      {
        type: "improve",
        text: "Uprawnienia: Super Admin zawsze; Administrator — workCatalogForAdminEnabled; moderator/inspektor — ukryte",
      },
      {
        type: "fix",
        text: "Legacy view=workcatalog → Przetargi → Biblioteka robót (bez flicker)",
      },
      {
        type: "improve",
        text: "WorkCatalogView embedded — jeden scroll w zakładce Przetargi",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.86",
    label: "Przetargi — PB-2b V4 KPI parity (wspólny resolver katalogu)",
    items: [
      {
        type: "fix",
        text: "KPI V4 / Kosztorys PRO — resolveActiveCatalogForTender zamiast defaultWgdomCostCatalog (seed)",
      },
      {
        type: "improve",
        text: "computeTenderBidProposal — domyślny katalog z resolvera (work-first / legacy-fallback)",
      },
      {
        type: "improve",
        text: "Chip źródła katalogu: Biblioteka Robót / Baza cen (fallback) — KPI Wycena + panel Wyceny",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-pb-2b-v4-parity.mjs",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.85",
    label: "Biblioteka Robót — P2 MVP UI (lista · ceny · bulk · rynek · kompletność)",
    items: [
      {
        type: "new",
        text: "Menu Biblioteka Robót — widok admin workcatalog: lista z filtrami, edycja ceny firmy, aktywność, edycja wielu cen",
      },
      {
        type: "new",
        text: "Porównanie firma vs rynek (read-only) i panel kompletności katalogu per branża",
      },
      {
        type: "improve",
        text: "useWorkCatalog — odświeżenie store po WGDOM_DEFERRED_BOOTSTRAP_EVENT (PB-3 migracja bez pustego stanu)",
      },
      {
        type: "improve",
        text: "Instrukcja HelpView + pusty stan — PB-3 bootstrap i sync chmury już dostępne",
      },
      {
        type: "improve",
        text: "Regresja — smoke/persist P2.1–P2.6 (96 asercji)",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.84",
    label: "Biblioteka Robót — PB-3 bootstrap legacy → work",
    items: [
      {
        type: "new",
        text: "WorkCatalogBootstrapDecision — jednorazowa migracja Bazy cen → kw-wgdom-work-catalog po deferred bootstrap",
      },
      {
        type: "improve",
        text: "decideWorkCatalogBootstrap() — SSOT guardów (legacy_present · already_migrated · priced_work_exists · legacy_empty)",
      },
      {
        type: "improve",
        text: "Regresja — test-work-catalog-bootstrap-pb3.mjs B1–B8",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.83",
    label: "Przetargi — PRICE-BRIDGE PB-1/PB-2 (wspólny resolver katalogu)",
    items: [
      {
        type: "new",
        text: "resolveActiveCatalogForTender() — work-first / legacy-fallback · isFallback dla UI i cutover",
      },
      {
        type: "improve",
        text: "Wycena przetargu — TenderDetailPanel + TenderBidProposalPanel używają wspólnego resolvera (bez duplikacji)",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-price-bridge.mjs T1–T6",
      },
    ],
  },
  {
    date: "2026-06-29",
    version: "2.62.82",
    label: "Przetargi — TP200B kosztorys fidelity (parser v4)",
    items: [
      {
        type: "fix",
        text: "CURRENT_PARSER_VERSION 4 — lazy rescan dossier v3 ze skróconymi snapshotami (legacy cap 40)",
      },
      {
        type: "fix",
        text: "Parse loop — discoveryWinnerSource w shouldReplaceBestKosztorys (remis tier + rowCount)",
      },
      {
        type: "improve",
        text: "Regresja — test-tp200b-snapshot-fidelity.mjs T7–T8 · parser-version v3 stale",
      },
    ],
  },
  {
    date: "2026-06-28",
    version: "2.62.81",
    label: "Lista Płac — P0 fix znikającego składu po „Odśwież skład”",
    items: [
      {
        type: "fix",
        text: "„Odśwież skład” — opóźniony merge chmury nie kasuje świeżego składu (pull respektuje suppress + anti-leak czyta localStorage)",
      },
      {
        type: "fix",
        text: "Regresja — test-payroll-refresh-team-race-p0.mjs T1–T3",
      },
    ],
  },
  {
    date: "2026-06-28",
    version: "2.62.80",
    label: "Biblioteka Robót v3.0 — fundament P1 (infra)",
    items: [
      {
        type: "improve",
        text: "Biblioteka Robót i Cennik v3.0 — zamknięcie fundamentu P1.1–P1.12: moduł lib work-catalog, migracja legacy, adapter silnika, persist + cloud KV (kw-wgdom-work-catalog, kw-wgdom-work-bundles), golden tests — bez zmian UI (P2)",
      },
    ],
  },
  {
    date: "2026-06-27",
    version: "2.62.79",
    label: "Mobile — Roboty drill-in (MV-2)",
    items: [
      {
        type: "fix",
        text: "Mobile — Roboty: otwarcie roboty przełącza na pełnoekranowy widok szczegółów (lista i pasek KPI ukryte); przycisk Lista + gest Wstecz; bez podziału ekranu lista/detale",
      },
    ],
  },
  {
    date: "2026-06-27",
    version: "2.62.78",
    label: "Mobile UX — scroll, drill-in, touch, klawiatura",
    items: [
      {
        type: "fix",
        text: "Mobile — Przetarg (sticky nagłówek + zakładki), Notatki operacyjne i Schematy WM (drill-in lista→detal, przycisk Wstecz), Audit Hub i audyt notatek (sheet od dołu), Lista Płac (touch 44px), Ustawienia admina (klawiatura iOS)",
      },
      {
        type: "improve",
        text: "Mobile — native back w Robotach, Przetargu, Notatkach i Schematach; zakładki przetargu min. 44px; podgląd SVG schematu bez zagnieżdżonego scrolla",
      },
    ],
  },
  {
    date: "2026-06-26",
    version: "2.62.77",
    label: "Audit Hub WM — widoczność wm_druk w UI (Etap 4)",
    items: [
      {
        type: "improve",
        text: "Audit Hub — filtr źródła „WM Druk · Pomiary i Schematy”, chip teal oraz poprawne etykiety deep link do zakładek Pomiary / Schematy / Katalog",
      },
    ],
  },
  {
    date: "2026-06-26",
    version: "2.62.76",
    label: "Audit Hub WM — hooki audytu Schematy (Etap 3)",
    items: [
      {
        type: "improve",
        text: "Audit Hub — logowanie tworzenia, importu z RAP, duplikacji, usuwania i eksportu PDF schematów w WM Druk (zakładka Schematy)",
      },
    ],
  },
  {
    date: "2026-06-26",
    version: "2.62.75",
    label: "Audit Hub WM — hooki audytu Pomiary/Katalog (Etap 2)",
    items: [
      {
        type: "improve",
        text: "Audit Hub — logowanie tworzenia, edycji, usuwania RAP oraz eksportów DOCX/ZIP w WM Druk (Pomiary i Katalog)",
      },
    ],
  },
  {
    date: "2026-06-26",
    version: "2.62.74",
    label: "Audit Hub WM — infrastruktura audytu (Etap 1)",
    items: [
      {
        type: "improve",
        text: "Audit Hub — przygotowanie strumienia audytu WM Druk (Pomiary i Schematy): sync chmura + adapter feed; widoczne logi w kolejnych wydaniach",
      },
    ],
  },
  {
    date: "2026-06-26",
    version: "2.62.73",
    label: "P0 Payroll Cloud Recovery (etap 1)",
    items: [
      {
        type: "fix",
        text: "Lista Płac / sync chmury: mutex runCloudSync (koniec równoległych zapisów), merge przydziałów robót po job.updatedAt zamiast „bogatszych” godzin, Payroll Guard nie udaje sukcesu — czerwona chmura + komunikat",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.72",
    label: "Workflow Cleanup P0",
    items: [
      {
        type: "improve",
        text: "Przetarg → Workflow Hub: usunięto zduplikowaną sekcję „Następny krok” — sticky „Główna akcja” jest jedynym miejscem rekomendowanej akcji; intelligenceCtx z Huba bez ponownego budowania",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.71",
    label: "Document Summary Header (Dokumenty)",
    items: [
      {
        type: "new",
        text: "Przetarg → Dokumenty: nagłówek podsumowania dokumentów (SWZ, Przedmiar/ATH, Kosztorys, Umowa, Formularz, gotowość procesu, ostatnia analiza) nad listą plików — agregacja istniejącego SSOT",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.70",
    label: "Client Bar list filter hotfix",
    items: [
      {
        type: "fix",
        text: "Przetargi → Lista: Client Bar (WM, ZZK, Gminy, Wszystko) stosuje filtr klienta we wszystkich sekcjach widocznej listy — także „Dzisiaj”",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.69",
    label: "Workflow Process Strip + Sticky CTA",
    items: [
      {
        type: "improve",
        text: "Przetargi → Workflow Hub: pasek procesu oferty (5 etapów, klik → zakładka V4) oraz sticky „Główna akcja” — jedna rekomendowana akcja z istniejącego SSOT",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.68",
    label: "Workflow Hub EPIC A",
    items: [
      {
        type: "improve",
        text: "Przetargi → Workflow Hub: Przetarg = centrum przygotowania (postęp, następny krok, blokery, operator); Decyzja = wyłącznie werdykt i GO/HOLD/ODPUŚĆ",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.67",
    label: "Przetargi Lista UX V4",
    items: [
      {
        type: "improve",
        text: "Przetargi → Lista: uproszczony widok — banner decyzji, kolejka (Do decyzji / Brak kosztorysu), klienci WM/MOPS/ZZK/Gminy/Uczelnie; reszta w Filtrach zaawansowanych",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.66",
    label: "Kosztorys V4 — health procesu P2",
    items: [
      {
        type: "improve",
        text: "Przetargi → Kosztorys: wykrywanie długiej lub zatrzymanej analizy (slow / stale / timeout) z komunikatem i ponowieniem — bez zmian parsera",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.65",
    label: "Kosztorys V4 — fazy procesu P1",
    items: [
      {
        type: "improve",
        text: "Przetargi → Kosztorys: 13 faz technicznych E0–E12, faza „Zapisywanie wyników”, spójne etykiety w Owner View / Wycena / checklista",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.64",
    label: "Kosztorys V4 — fazy procesu (P0 UX)",
    items: [
      {
        type: "improve",
        text: "Przetargi → Kosztorys: jeden pasek statusu (pobieranie, przygotowanie, analiza, gotowy, błąd) zamiast stałego „Analiza kosztorysu…”; po błędzie parse — „Analiza została przerwana” i ponów",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.63",
    label: "Discovery dokumentów — fix przedwczesnego skanu",
    items: [
      {
        type: "fix",
        text: "Przetargi → Dokumenty: discovery nie startuje bez numeru ogłoszenia lub treści HTML; documentsFetchedAt tylko po autorytatywnym skanie; retry po pojawieniu się anchor (SmartPZP, Logintrade, ezamawiajacy itd.)",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.62",
    label: "Strategia — układ decyzyjny (UX.2T)",
    items: [
      {
        type: "improve",
        text: "Przetargi → Strategia: najpierw rekomendacja i najlepsza okazja, potem Dlaczego · Co zrobić (Centrum działań) · Ryzyka — monitoring i analityka w sekcji Pozostałe informacje",
      },
    ],
  },
  {
    date: "2026-06-25",
    version: "2.62.61",
    label: "Workspace V2 — etykieta Następny krok",
    items: [
      {
        type: "fix",
        text: "Workspace Przetarg — przycisk „Następny krok” przy „Znajdź kosztorys” prowadzi na Kosztorys z etykietą „Przejdź do kosztorysu” (zgodność z nawigacją)",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.60",
    label: "Tender Workspace — automatyzacja",
    items: [
      {
        type: "improve",
        text: "Workspace Przetarg: auto-checklista SWZ/ATH/Formularz/Referencje/Wadium (✔ gotowe · ⚠ brak · ⌛ działanie)",
      },
      {
        type: "improve",
        text: "Auto timeline — dni do terminu, sugerowany start/koniec wyceny, ostatni bezpieczny termin wysłania",
      },
      {
        type: "new",
        text: "Workspace Insights — 2–3 komunikaty operacyjne pod paskiem postępu (wadium, referencje, oferta dziś)",
      },
      {
        type: "improve",
        text: "Auto Progress — postęp łączy analizę, kosztorys, ofertę, dokumenty i referencje z auto-checklisty",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.59",
    label: "Tender Workspace V2 — status, timeline, checklista",
    items: [
      {
        type: "new",
        text: "Przetarg → zakładka Przetarg: status realizacji 0–100% (Dokumenty, Analiza, Kosztorys, Referencje, Wadium, Oferta)",
      },
      {
        type: "new",
        text: "Następny krok — jedna rekomendowana akcja z przyciskiem (np. policz kosztorys, uzupełnij referencje)",
      },
      {
        type: "new",
        text: "Oś czasu, skróty do SWZ/Kosztorys/ATH/Formularz/ZIP oraz checklista ofertowa (podpis lokalnie)",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.58",
    label: "Przetargi Lista UX V3 — workspace właściciela",
    items: [
      {
        type: "new",
        text: "Sekcja „Moja kolejka” — Do decyzji, kończy się dziś/jutro, brak kosztorysu/referencji (klikalne filtry)",
      },
      {
        type: "new",
        text: "Ulubione filtry — przypinanie własnych presetów (zapis lokalny w przeglądarce)",
      },
      {
        type: "improve",
        text: "Sticky toolbar po scrollu — wyszukiwarka, status, szybkie filtry i odśwież zawsze pod ręką",
      },
      {
        type: "new",
        text: "Komunikaty AI na liście przetargów (heurystyki UX — decyzje, potencjał WM, brak pilnych)",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.57",
    label: "Przetargi Lista UX V2 — filtry operacyjne",
    items: [
      {
        type: "improve",
        text: "Przetargi → Lista — klikalne KPI (aktywne, do zgłoszenia, ≤7 dni, kluczowe) ustawiają filtry jednym kliknięciem",
      },
      {
        type: "new",
        text: "Pasek szybkich filtrów: Wszystkie · Moje · Do zgłoszenia · ≤7 dni · Bez kosztorysu · WM · ZZK",
      },
      {
        type: "improve",
        text: "Sekcja „Dzisiaj” — przetargi wymagające reakcji na górze listy; sortowanie pilne → strategiczne",
      },
      {
        type: "improve",
        text: "Zapamiętywanie filtrów listy w localStorage (wyszukiwarka, status, chipy) — bez zmian sync/KV",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.56",
    label: "Przetargi — UX Lista (OPERACJE > FILTRY > LISTA)",
    items: [
      {
        type: "improve",
        text: "Przetargi → Lista — kompaktowe KPI (aktywne, do zgłoszenia, ≤7 dni, kluczowe); wyszukiwarka i chipy filtrów wyżej",
      },
      {
        type: "improve",
        text: "Pipeline i legenda domyślnie zwinięte; filtry listy/statusu w panelu „Filtry zaawansowane”; mniej pustej przestrzeni nad listą",
      },
      {
        type: "improve",
        text: "Chipy akcji — neutralne tło gdy nieaktywne (mniej czerwonych badge); eksport CSV i tryb masowy jako ikony na pasku",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.55",
    label: "WM Schematy — Right Edge Clipping Hotfix",
    items: [
      {
        type: "fix",
        text: "WM Schematy — naprawiono ucinanie ostatniego obwodu przy prawej krawędzi PDF (apartment-1f-v1 / 3f-v1)",
      },
      {
        type: "fix",
        text: "Schematy — dodano bezpieczny margines columnRightInset (96 px) dla ostatniej kolumny w bus-layout-v2",
      },
      {
        type: "fix",
        text: "Schematy — poprawiono geometrię layoutu bez zmiany pozycji pierwszego obwodu i renderer v5",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.54",
    label: "WM Schematy — Header Input Spaces Hotfix",
    items: [
      {
        type: "fix",
        text: "WM Schematy — naprawiono wpisywanie spacji w polach Tytuł i Adres (nagłówek PDF)",
      },
      {
        type: "fix",
        text: "Schematy — usunięto agresywną normalizację .trim() podczas edycji (touchSchematic)",
      },
      {
        type: "fix",
        text: "Schematy — poprawiono UX nagłówków PDF przy adresach wielowyrazowych",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.53",
    label: "WM Druk — Detached RAP Crash Hotfix",
    items: [
      {
        type: "fix",
        text: "WM Druk — naprawiono crash po utworzeniu samodzielnego RAP (Pomiary → Nowy pomiar → Samodzielny)",
      },
      {
        type: "fix",
        text: "Pomiary — poprawiono race condition przy pierwszym renderze detached measurement (selected fallback)",
      },
      {
        type: "fix",
        text: "Pomiary — dodatkowe null-safety dla reportNumber w panelu edycji i Katalogu",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.52",
    label: "WM Druk — Pomiary UX Upgrade",
    items: [
      {
        type: "new",
        text: "Samodzielne pomiary (detached RAP) — raport bez Roboty z normalnym numerem RAP, eksport DOCX i ZIP",
      },
      {
        type: "new",
        text: "Katalog Pomiarów — edycja istniejącego RAP bez przechodzenia do WM Druk → Pomiary",
      },
      {
        type: "new",
        text: "Katalog Pomiarów — usuwanie pojedynczego i wielu raportów (multi-select)",
      },
      {
        type: "new",
        text: "Registry Guard — usunięty numer RAP pozostaje w rejestrze (CANCELLED); tombstone sync kw-electrical-measurements-deleted-ids",
      },
      {
        type: "improve",
        text: "Pomiary — linkStatus linked/detached, manualAddress/manualFlatNumber, ochrona ciągłości numeracji RAP",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.51",
    label: "WM Druk — Schematy layout scale V2 (renderer v5)",
    items: [
      {
        type: "improve",
        text: "Schematy SVG — bus layout v2: szyna do ostatniego obwodu, kolumny na pełnej szerokości strony (renderer v5)",
      },
      {
        type: "improve",
        text: "Schematy — większe symbole (licznik, MCB, RCD, odbiory), większe kropki r=6, viewBox 1360×780 (3F) / 1248×748 (1F)",
      },
      {
        type: "improve",
        text: "Schematy — lepsze wykorzystanie strony A4: klastr obwodów ~93% szerokości tuszu vs referencja WM",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.50",
    label: "WM Druk — Schematy visual fidelity (renderer v4)",
    items: [
      {
        type: "improve",
        text: "Schematy SVG — pionowy backbone, RCD na tee, większe odstępy i etykiety wieloliniowe MCB/RCD (renderer v4)",
      },
      {
        type: "improve",
        text: "Schematy — symbol kuchenki 3P, grubsza szyna i większe kropki, jasne linie pomocnicze kolumn, odstęp nazwy obwodu od symbolu",
      },
      {
        type: "fix",
        text: "Schematy — usunięty podwójny opis „Kuchenka Elektryczna” w SVG/PDF",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.49",
    label: "WM Druk — Schematy jednokreskowe (MVP UI)",
    items: [
      {
        type: "new",
        text: "WM Druk → zakładka Schematy: lista, edytor, podgląd SVG, eksport PDF (draft/final + watermark)",
      },
      {
        type: "new",
        text: "Schematy — tworzenie z szablonu (1F/3F) lub import z raportu pomiarowego RAP; sync kw-electrical-schematics",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.48",
    label: "P4 WM Druk — upload toast (bez „Dodano 0 plików”)",
    items: [
      {
        type: "fix",
        text: "WM Druk — po udanym uploadzie do storage bez nowego wpisu w grupie: komunikat zamiast „Dodano 0 plików…”",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.47",
    label: "TP203 — Address Parser Recovery M1 (WM Druk / ZI)",
    items: [
      {
        type: "fix",
        text: "Parser adresu roboty — formaty m.3, lok., mieszkanie, 26/3, 12A/7 (np. Kleczkowska 26 m.3 → ulica/budynek/lokal)",
      },
      {
        type: "improve",
        text: "Test TP203 — test-wm-print-address-parser-tp203.mjs (regresja Gorlicka, Sępa 83/7)",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.46",
    label: "ZI Tauron 2026 — hotfix §5 zgłaszający (P0 owner address)",
    items: [
      {
        type: "fix",
        text: "ZI PDF — adres obiektu tylko pola 95–97 (§4); §5 (99/101/102/110/111) zachowane ze wgranego szablonu WM",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.45",
    label: "ZI Tauron 2026 — pełny adres §4 (dual-fill + miasto + czyszczenie kodu)",
    items: [
      {
        type: "improve",
        text: "ZI PDF — górny i dolny wiersz §4 (95–97 + 99/111/112), miejscowość 101 z ustawień WM, kod 102/110 czyszczony ze szablonu",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.44",
    label: "Lista Płac — fix znikających godzin po zmianie pracownika (ETAP 1)",
    items: [
      {
        type: "fix",
        text: "Godziny dni / stawka / Sob.pr. — zapis przez patch na prev state (bez stale safeEmp); defer wypłaty osobno",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.43",
    label: "Lista Płac — fix znikającej kwoty kosztu do zwrotu (ETAP 1)",
    items: [
      {
        type: "fix",
        text: "Koszty do zwrotu — zapis kwoty przez patch na prev state (bez stale safeEmp); edge autosync merge → backlog ETAP 2",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.42",
    label: "Cloud sync — przywrócony import merge delivery package",
    items: [
      {
        type: "fix",
        text: "cloud-sync — przywrócony import mergeDeliveryPackagePublications (regresja 2.62.39); toast „Nie udało się wysłać do chmury” po odświeżeniu",
      },
    ],
  },
  {
    date: "2026-06-24",
    version: "2.62.41",
    label: "Audit Hub — Recovery Events (Security Log)",
    items: [
      {
        type: "new",
        text: "Security log RECOVERY — restore_backup_started/completed/failed (roboty, płace, pełny backup)",
      },
      {
        type: "new",
        text: "Security log DATA — data_import_started/completed/failed oraz directory_delete",
      },
      {
        type: "improve",
        text: "Audit Hub — wpisy recovery/import/delete w istniejącym źródle security_log (severity badge)",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.40",
    label: "Przetargi — TP200C sync merge fidelity kosztorysu",
    items: [
      {
        type: "fix",
        text: "mergeTenderDossierByQuality — usunięty stale override; kosztorys wyłącznie przez pickBetterKosztorys",
      },
      {
        type: "fix",
        text: "parserVersion i scanSummary z winningDossier — lazy rebuild przy ATH v2, spójne metadane",
      },
      {
        type: "improve",
        text: "Regresja — test-tp200c-sync-merge-fidelity.mjs T200C-1..10",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.39",
    label: "Audit Hub MVP-1 — Security Log",
    items: [
      {
        type: "new",
        text: "Security log — append-only KV kw-security-audit-log (AUTH, uprawnienia, usuwanie robot)",
      },
      {
        type: "new",
        text: "Audit Hub — 6. źródło Security log z KPI, filtrem i badge severity",
      },
      {
        type: "improve",
        text: "Logowanie admina: sukces, nieudane (login bez hasła), wylogowanie",
      },
      {
        type: "improve",
        text: "Ustawienia adminów — audyt tworzenia/usuwania kont i zmian haseł/ról",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.38",
    label: "Audit Hub — actor fidelity activityLog",
    items: [
      {
        type: "fix",
        text: "Roboty — activityLog zapisuje displayName sesji zamiast domyślnego „Administrator” (updateJob SSOT)",
      },
      {
        type: "fix",
        text: "Pulpit — zaznaczanie dokumentów i „Popraw” spójności płac loguje rzeczywistego użytkownika",
      },
      {
        type: "improve",
        text: "Audit Hub — nowe wpisy job_activity pokazują Dawid/Paweł/Stanisław zamiast Administrator (bez migracji KV)",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.37",
    label: "Audit Hub — hotfix crash localeCompare",
    items: [
      {
        type: "fix",
        text: "Audit Hub — legacy wpisy bez actor/at nie powodują już crash runtime (localeCompare)",
      },
      {
        type: "fix",
        text: "Adaptery feedu — fallback actor/at we wszystkich 5 źródłach; bezpieczny sort feedu i filtra osób",
      },
      {
        type: "fix",
        text: "Roboty — upload zdjęć zapisuje actor w activityLog (photo_upload)",
      },
      {
        type: "improve",
        text: "Testy test-audit-hub-view-model.mjs — legacy actor/at/text undefined (32 PASS)",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.36",
    label: "Audit Hub MVP-0B — panel Super Admin",
    items: [
      {
        type: "new",
        text: "Menu Audit Hub (tylko Super Admin) — agregacja 5 istniejących logów: notatki, inspektor, roboty, WM Druk, pakiety odbiorowe",
      },
      {
        type: "new",
        text: "Filtry źródło / osoba / szukaj, KPI per źródło, paginacja 50, deep linki do modułów (bez nowego KV)",
      },
      {
        type: "improve",
        text: "Testy test-audit-hub-adapters.mjs (47) + test-audit-hub-view-model.mjs (22)",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.35",
    label: "Notatki operacyjne — fix licznika nieprzeczytanych",
    items: [
      {
        type: "fix",
        text: "Merge notatek nie podbija contentRev gdy treść/metadane ACK są identyczne — ACK nie ginie po refresh/sync",
      },
      {
        type: "fix",
        text: "Deferred bootstrap + pull aux — synchronizacja read-state z notatkami; catch nie zeruje stanu (fallback localStorage)",
      },
      {
        type: "improve",
        text: "Test T1–T5 — ACK vs merge bez zmiany treści / realna edycja / komentarz (unread-content-rev)",
      },
    ],
  },
  {
    date: "2026-06-23",
    version: "2.62.34",
    label: "Przydziały robót — trwałe usuwanie wpisów",
    items: [
      {
        type: "fix",
        text: "Usunięty wpis pracy (Roboty, Lista Płac, Pulpit) nie wraca po synchronizacji z chmurą — deletedWorkEntryTombstones na robocie",
      },
      {
        type: "fix",
        text: "mergeWorkEntriesById respektuje tombstone przy union workEntries[]",
      },
      {
        type: "improve",
        text: "SSOT delete: removeWorkEntryFromJobs + removeWorkEntriesMatchingFromJobs (JobsView, fixJobsForConsistencyAlert)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.33",
    label: "Przetargi — Formal XLSX UI Guard",
    items: [
      {
        type: "fix",
        text: "Kosztorys V4 — formularz oferty XLSX bez qty>0 nie pokazuje fałszywej tabeli pozycji (np. „13 pozycji kosztorysowych”)",
      },
      {
        type: "fix",
        text: "resolveEffectiveKosztorysV4CatalogLines — SSOT display spójny z wyceną katalogową (resolveCatalogQuantities)",
      },
      {
        type: "improve",
        text: "Test T09A — formal XLSX boilerplate guard (hasCatalog=false, emptyState=formal_document)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.32",
    label: "Przetargi — R1-FIX ATH vs Strong PDF Recovery",
    items: [
      {
        type: "fix",
        text: "pickBetterKosztorys — silny PDF Recovery wygrywa nad ATH gdy ma >5% więcej pozycji (np. 150 vs 128)",
      },
      {
        type: "fix",
        text: "TP190B-2 bez zmian — PDF 132 vs ATH 128 nadal preferuje ATH tier (margines 5%)",
      },
      {
        type: "fix",
        text: "Regresja — test-tp190b-dossier-stability.mjs R1-FIX + TP190B (20 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.31",
    label: "Przetargi — TP202A analyze/dossier consistency",
    items: [
      {
        type: "fix",
        text: "dossierFromAnalysisResult — spread existing dossier; re-analyze nie kasuje bidProposal i pól poza analizą",
      },
      {
        type: "fix",
        text: "analyzeTenderWithDossier — ourEstimatePln użytkownika chronione jak w buildTenderDossierHeavy",
      },
      {
        type: "fix",
        text: "runAnalysis / batch rebuild — przekazanie existingDossier do dossierFromAnalysisResult",
      },
      {
        type: "fix",
        text: "Regresja — test-tp202a-analyze-dossier-consistency.mjs (12 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.30",
    label: "PDF Recovery — TP201E-B layout corruption (footer + WM aliases)",
    items: [
      {
        type: "fix",
        text: "TP201E-B — skip WM footer layout rows (Norma PRO / scalony OBMIAR / - N -) — LP 115",
      },
      {
        type: "fix",
        text: "WM corruption aliases — wyłącznikpodłoże, pojemkońc.k → pojemności kabla (LP 124)",
      },
      {
        type: "improve",
        text: "UNIT_RE — obsługa j.m. końc.k (WM elektryka)",
      },
      {
        type: "improve",
        text: "TP182 recovery layout extract: 148 → 150 pozycji (+2)",
      },
      {
        type: "fix",
        text: "Regresja — test-pdf-przedmiar-heuristic.mjs TP201E-B-1…3 (85 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.29",
    label: "PDF Recovery — TP201E-A M6A (split LP + kalk qty + section strip)",
    items: [
      {
        type: "fix",
        text: "TP201E-A — split złączonych LP: Montaż/Demontaż/Dostawa/Wymiana + delimiter RAZEM (fix JS \\b + ż)",
      },
      {
        type: "fix",
        text: "kalk/Kalkulacja — deferred qty z max 4 layout rows (np. LP 66)",
      },
      {
        type: "fix",
        text: "allowlist section trailer strip — „3.6 Pomiary elektryczne” (LP 140)",
      },
      {
        type: "improve",
        text: "LP action bez KNR — wycena indywidualna (np. LP 44 Montaż)",
      },
      {
        type: "improve",
        text: "TP182 recovery layout extract: 145 → 148 pozycji (+3)",
      },
      {
        type: "fix",
        text: "Regresja — test-pdf-przedmiar-heuristic.mjs TP201E-A-1…8 (82 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.28",
    label: "PDF Recovery — TP201D M5 (metr→mb + kalk marker fix)",
    items: [
      {
        type: "improve",
        text: "TP201D M5 — normalizacja metr / metr bieżący / metr biezacy → mb w PDF przedmiar WM",
      },
      {
        type: "fix",
        text: "kalk. własna — marker-only opis (d.X.Y + liczba) nie odrzuca pozycji; fallback „Kalkulacja własna”",
      },
      {
        type: "improve",
        text: "TP182 recovery layout extract: 142 → 145 pozycji (+3 kalk marker fix)",
      },
      {
        type: "fix",
        text: "Regresja — test-pdf-przedmiar-heuristic.mjs TP201D-1…10 (74 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.27",
    label: "Przetargi — TP190C-3B Batch Rebuild Tooling",
    items: [
      {
        type: "new",
        text: "TP190C-3B — narzędzie batch rebuild parserVersion=3 dla stale dossier (kosztorys.ok, pv≠3)",
      },
      {
        type: "improve",
        text: "Dry-run domyślnie (scripts/tp190c-batch-rebuild.mjs); zapis KV tylko przez --write",
      },
      {
        type: "improve",
        text: "Zgodność z TP190B anti-downgrade i TP190C-1 pickBetter(existing,fresh); błąd per tender nie przerywa batch",
      },
      {
        type: "fix",
        text: "Regresja — test-tp190c-batch-rebuild.mjs T1–T6 (19 PASS)",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.26",
    label: "Przetargi — TP190C-2E PDF Extract Parity + Observability",
    items: [
      {
        type: "fix",
        text: "TP190C-2E-A — parity Browser ↔ Node: legacy pdf.js w vite-node, join fallback gdy layout nie zwraca wierszy",
      },
      {
        type: "fix",
        text: "3 Maja 5B_9.pdf — replay Node: CASE 3 (0 rows) → CASE 1 po poprawnym extract",
      },
      {
        type: "improve",
        text: "TP190C-2E-B — extractError vs noTextLayer: osobny komunikat błędu ekstrakcji PDF (łatwiejsze RCA)",
      },
      {
        type: "fix",
        text: "Regresja — test-tp190c-extract-parity.mjs + test-tp190c-extract-observability.mjs",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.25",
    label: "Przetargi — TP190C-1 Stale Rebuild Protection",
    items: [
      {
        type: "fix",
        text: "Stale rebuild — pickBetter(existing, fresh) zamiast pickBetter(null, fresh); dobry snapshot nie jest odrzucany przed quality gate",
      },
      {
        type: "fix",
        text: "Ochrona przed downgrade przy forced rebuild (np. PDF 148 → PDF 0 CASE 3 w multi-lot)",
      },
      {
        type: "improve",
        text: "existingKosztorysForRebuildPick — stale nadal wymusza rebuild i parserVersion=3; zachowana zgodność z TP190B anti-downgrade",
      },
      {
        type: "fix",
        text: "Regresja — test-tp190c-stale-rebuild-protection.mjs TP190C-1…6",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.24",
    label: "PDF Recovery — TP201C-B (WM M4 fidelity)",
    items: [
      { type: "improve", text: "PDF przedmiar WM — +10 pozycji na TP182 (132 → 142) + zmniejszenie luki ~21 → ~10" },
      { type: "fix", text: "UNIT_RE: pomiar/pom./prób./prob. — odzysk pozycji elektrycznych (pomiary/próby)" },
      { type: "fix", text: "LP lookahead: <LP opis> + d.X.Y kalk. własna — składanie w jedną pozycję" },
      { type: "fix", text: "In-word hyphen rejoin: nis- kiego, na- stępny, pojem- ności, gipsowo - kartonowy" },
      { type: "fix", text: "Dedup LP-aware: LP z segmentu przed dedup; brak utraty pozycji przy powtórzeniach kodu normy" },
      { type: "fix", text: "Alias: „Kalkulacja” → „kalk. własna” (spójna ścieżka parsowania)" },
      { type: "fix", text: "Regresja: TP201A/TP182/TP190B + pipeline dossier — PASS" },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.23",
    label: "Przetargi — TP190B Dossier Stability (parser v3 + ochrona PDF)",
    items: [
      {
        type: "fix",
        text: "tenderDossier.parserVersion 3 — wymusza rebuild snapshotów v2 po TP201B rollout",
      },
      {
        type: "fix",
        text: "pickBetterKosztorys — silny PDF Recovery (CASE 1, ≥120 poz.) nie przegrywa z ATH przy znacząco mniejszym rowCount",
      },
      {
        type: "fix",
        text: "existingKosztorysUnlessStale + anti-downgrade — ochrona przed degradacją kosztorysu przy re-analyze i merge",
      },
      {
        type: "fix",
        text: "Regresja — test-tp190b-dossier-stability.mjs TP190B-1…6",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.22",
    label: "Lista Płac — Payroll Sync Stability Pack (przydziały + Sob. poprz.)",
    items: [
      {
        type: "fix",
        text: "mergeJobsById — mergeWorkEntriesById: union workEntries po id; „Dodaj robociznę” nie znika po sync",
      },
      {
        type: "fix",
        text: "pickPrevSaturdayByTimestamps — przy remisie mergePrevSaturdayByRichness; Sob. poprz. z godzinami zachowane po sync",
      },
      {
        type: "fix",
        text: "Regresja — test-payroll-work-entry-merge-fidelity.mjs T1–T6, test-payroll-prev-saturday-fidelity.mjs T1–T6",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.21",
    label: "Lista Płac — P0 fix znikających godzin (merge dni)",
    items: [
      {
        type: "fix",
        text: "pickDaysByTimestamps — przy remisie dataUpdatedAt mergeDaysByRichness: aktywny dzień z godzinami wygrywa z pustym/inactive w chmurze",
      },
      {
        type: "fix",
        text: "Wpis czasu pracy — godziny pozostają po sync (nie nadpisywane domyślnym inactive z KV)",
      },
      {
        type: "fix",
        text: "Regresja — test-payroll-day-merge-fidelity.mjs T1–T6",
      },
    ],
  },
  {
    date: "2026-06-22",
    version: "2.62.20",
    label: "Lista Płac — P0 fix znikającego składu (merge asymmetry)",
    items: [
      {
        type: "fix",
        text: "mergeWeekEmployeesForWeekRange — przy asymetrii pustości wygrywa strona niepusta; skład nie kasowany przez pusty KV po rolloverze",
      },
      {
        type: "fix",
        text: "Odśwież skład / Dodaj aktywnych — pracownicy pozostają po sync chmury",
      },
      {
        type: "fix",
        text: "Regresja — test-payroll-week-employee-merge-asymmetry.mjs T1–T5",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.19",
    label: "PDF Recovery TP201A — pełne opisy pozycji KNR",
    items: [
      {
        type: "fix",
        text: "pdf-przedmiar-heuristic — kod normy kończy się na numerach (bez Próba/Demontaż/Wymiana); Kosztorys V4 pokazuje pełne opisy z PDF WM",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.18",
    label: "Przetargi — bootstrap dokumentów retry po błędzie sieci",
    items: [
      {
        type: "fix",
        text: "useTenderDocumentsBootstrap — guard completed dopiero po sukcesie; błąd fetch nie blokuje kolejnej próby (remount / zakładka)",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.17",
    label: "Przetargi V4 — bootstrap dokumentów na /kosztorys",
    items: [
      {
        type: "fix",
        text: "Bezpośrednie wejście /przetargi/:id/kosztorys — auto fetchTenderDocuments + lazy dossier (jak zakładka Dokumenty)",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.16",
    label: "SmartPZP MVP — adapter dokumentacji publicznej",
    items: [
      {
        type: "new",
        text: "SmartPZP — discovery dokumentów z portal.smartpzp.pl (public postępowanie, bez logowania)",
      },
      {
        type: "new",
        text: "Pobieranie plików SmartPZP przez JSF (selekcja wiersza + Pobierz) — integracja z pipeline dossier",
      },
      {
        type: "improve",
        text: "Przetargi — platforma SmartPZP: badge, CTA „Otwórz postępowanie SmartPZP”, skip readmodels probe",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.15",
    label: "Przetargi V4 — Kwalifikacja i Oferta na tabie Decyzja",
    items: [
      {
        type: "fix",
        text: "V4 routing — /decyzja?ws=qualification|offer odblokowuje workspace Kwalifikacja i Oferta (P2-F)",
      },
      {
        type: "fix",
        text: "CTA z OwnerView / kafelków gotowości — poprawny URL z ?ws=; reload i back/forward zachowują widok",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.14",
    label: "Przetargi — STABILITY PATCH (pre-SmartPZP)",
    items: [
      {
        type: "fix",
        text: "External discovery — wybór kosztorysu przez pickBetterKosztorys (SSOT jakości, nie rows.length)",
      },
      {
        type: "fix",
        text: "Podgląd ATH w modalu — limit 80 pozycji + „Pokaż więcej” (TP200B)",
      },
      {
        type: "improve",
        text: "V4 — CTA pozycje/kosztorys prowadzi na /kosztorys gdy dossier gotowy",
      },
      {
        type: "improve",
        text: "Pipeline LS — widoczność QuotaExceeded (console + telemetria wgdom-pipeline-ls)",
      },
      {
        type: "improve",
        text: "Lazy dossier parse — log błędu (console + telemetria) i stan dossierParseFailed",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.13",
    label: "Przetargi — TP200B snapshot fidelity kosztorysu (500 poz.)",
    items: [
      {
        type: "fix",
        text: "athPreviewToSnapshot — priced rows do 500 (zgodnie z parserem ATH/PDF), nie 40",
      },
      {
        type: "fix",
        text: "Parse loop — shouldReplaceBestKosztorys używa pickBetterKosztorys (rowCount SSOT)",
      },
      {
        type: "fix",
        text: "ath_priced — bez skalowania gdy snapshot ma pełne rows (302=302)",
      },
      {
        type: "improve",
        text: "Regresja — test-tp200b-snapshot-fidelity.mjs T1–T6",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.12",
    label: "Przetargi — TP200A.1 external discovery zachowuje parserVersion",
    items: [
      {
        type: "fix",
        text: "Pobierz dokumenty u zamawiającego — nie kasuje parserVersion, scanSummary, bidProposal ani estimatePln w dossier",
      },
      {
        type: "improve",
        text: "Regresja — test-tp200a-external-discovery-preserve-parser-version.mjs T1–T6",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.11",
    label: "Przetargi — parserVersion + auto-rescan legacy dossier (TP200A)",
    items: [
      {
        type: "new",
        text: "tenderDossier.parserVersion — wersjonowanie snapshotu dossier (CURRENT_PARSER_VERSION=2)",
      },
      {
        type: "fix",
        text: "Legacy KV/LS bez parserVersion — lazy Dokumenty/Wycena wymusza ponowny parse",
      },
      {
        type: "fix",
        text: "Stale rescan — pickBetter ignoruje stary kosztorys; merge sync preferuje świeży parserVersion",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-dossier-parser-version.mjs T1–T5",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.10",
    label: "PDF WM recovery — kalk po KNR + unit aliases (TP198B+C)",
    items: [
      {
        type: "new",
        text: "pdf-przedmiar-heuristic — kalk. własna po kotwicy KNR (TP198B)",
      },
      {
        type: "new",
        text: "WM aliasy j.m. wyp./otw./podej./aparat/lokal. → szt (TP198C)",
      },
      {
        type: "improve",
        text: "M4 m→mb, M5 kalk. własna bez KNR, TP198A dedup lp+unit+opis",
      },
      {
        type: "improve",
        text: "TP182 benchmark — 123 pozycji z PDF przedmiaru WM (+37 vs 2.62.9 baseline)",
      },
      {
        type: "improve",
        text: "Regresja — test-pdf-przedmiar-heuristic.mjs TP196–TP198C, test-tp182-pdf-wm-recovery.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.9",
    label: "Przetargi — protect existing kosztorys during re-analysis (TP190A)",
    items: [
      {
        type: "fix",
        text: "analyzeTenderWithDossier — pickBetterKosztorys zamiast bezwarunkowego replace po parse",
      },
      {
        type: "fix",
        text: "buildTenderDossierHeavy — ten sam quality guard przy lazy dossier",
      },
      {
        type: "fix",
        text: "Regresja — test-tender-dossier-merge-quality.mjs TP190A-1…5",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.8",
    label: "Przetargi — parallel dossier bytes prefetch (TP192C)",
    items: [
      {
        type: "improve",
        text: "parseTenderDossierDocuments — równoległy prefetch fetchTenderDocumentBytes (concurrency 4) przed fazą parse",
      },
      {
        type: "improve",
        text: "TP192C — ~5–7 s szybszy buildTenderDossierHeavy; cache bytes i kolejność parse bez zmian",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-parallel-bytes-tp192c.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.7",
    label: "Przetargi — parallel PZ metadata probe (TP192B)",
    items: [
      {
        type: "improve",
        text: "discoverPlatformaZakupowaDocuments — równoległy probeTenderDocumentMeta (concurrency 6) zamiast sekwencyjnego for-await",
      },
      {
        type: "improve",
        text: "TP192B — ~1–1,5 s szybszy discovery 17 dokumentów PZ; kolejność i TP194A encoding bez zmian",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-parallel-probe-tp192b.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.6",
    label: "Przetargi — host detection shortcut (TP192A)",
    items: [
      {
        type: "improve",
        text: "discoverTenderDocuments — pomiń readmodels probe 1..50 gdy noticeHtml wskazuje platformazakupowa / logintrade / ezamawiajacy",
      },
      {
        type: "improve",
        text: "TP192A — ~4 s szybsze cold fetch dokumentów off-platform (edge)",
      },
      {
        type: "improve",
        text: "Regresja — test-tender-host-detection-tp192a.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.5",
    label: "Przetargi — platformazakupowa filename encoding (TP194A)",
    items: [
      {
        type: "fix",
        text: "Open Nexus / platformazakupowa — naprawa mojibake w Content-Disposition (Załącznik, Ogłoszenie, robót)",
      },
      {
        type: "fix",
        text: "Preferencja poprawnej etykiety HTML nad uszkodzonym CD przy discovery dokumentów",
      },
      {
        type: "improve",
        text: "Regresja TP194A — test-tender-filename-encoding-tp194a.mjs + live verify 1319989",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.4",
    label: "Przetargi — loading guard + dossier metadata safety (TP193B)",
    items: [
      {
        type: "fix",
        text: "Pipeline cache mount — setLoading(false) w finally (koniec nieskończonego „Ładowanie przetargów…”)",
      },
      {
        type: "fix",
        text: "Metadata confidence — bezpieczny guard awardCriteria bez name (brak crash .trim)",
      },
      {
        type: "fix",
        text: "buildTenderDossierHeavy — metadata best-effort; scanSummary.parsedAt zawsze po heavy parse",
      },
      {
        type: "improve",
        text: "Regresja TP193B w test-tender-dossier-pipeline.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.3",
    label: "Przetargi — heavy dossier loop hotfix (TP193A)",
    items: [
      {
        type: "fix",
        text: "Lazy dossier — buildTenderDossierHeavy ustawia scanSummary.parsedAt po pierwszym skanie (koniec pętli builtAt)",
      },
      {
        type: "fix",
        text: "Zatrzymanie wielokrotnych zapisów pipeline do chmury i toastów przy platformazakupowa / Open Nexus",
      },
      {
        type: "improve",
        text: "Regresja TP193A w test-p3-fix-c-performance.mjs",
      },
    ],
  },
  {
    date: "2026-06-19",
    version: "2.62.2",
    label: "Przetargi — Open Nexus / platformazakupowa.pl (TP191)",
    items: [
      {
        type: "new",
        text: "Automatyczne pobieranie dokumentów z platformazakupowa.pl (Open Nexus) — publiczne załączniki /file/get_new/",
      },
      {
        type: "fix",
        text: "Komunikat dokumentów — usunięto fałszywy „brak dostępu bez logowania” dla platformazakupowa.pl",
      },
      {
        type: "improve",
        text: "CTA „Otwórz postępowanie” + badge sukcesu przy pobranych dokumentach Open Nexus",
      },
      {
        type: "improve",
        text: "Test regresyjny TP191 — test-platformazakupowa-public-documents.mjs",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.62.1",
    label: "Przetargi — WM PDF przedmiar recovery (TP182)",
    items: [
      {
        type: "fix",
        text: "PDF przedmiar WM — normalizacja j.m. (m 2→m2), split pozycji BOQ po KNR/d.X.Y, rozszerzone normy (KNR-W, ZKNR, NNRNKB, KNR AT)",
      },
      {
        type: "fix",
        text: "Dossier merge — formularz ofertowy XLSX nie nadpisuje discovery PDF przedmiar tylko dlatego, że ma więcej wierszy",
      },
      {
        type: "improve",
        text: "Test regresyjny TP182 — oczekiwane ≥80 pozycji z PDF przedmiaru (bez OCR)",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.62.0",
    label: "Przetargi — Kosztorys PRO Dashboard (V4.2 + V4.2A)",
    items: [
      {
        type: "new",
        text: "Zakładka Kosztorys — panel KOSZTORYS PRO: 8 KPI (pokrycie, marża, FIT WGDOM, status oferty)",
      },
      {
        type: "new",
        text: "TOP 20 największych pozycji kosztowych + filtry branżowe (wykończeniowe, sanitarne, elektryczne…)",
      },
      {
        type: "new",
        text: "Karta Ocena kosztorysu — rekomendacja czy przygotowywać ofertę",
      },
      {
        type: "new",
        text: "Przycisk Pobierz ATH — oryginalny plik przedmiaru obok Pełnego podglądu",
      },
      {
        type: "improve",
        text: "V4.2A — hero KPI (ATH, pokrycie, FIT, status) above the fold; kompaktowy nagłówek na Kosztorys",
      },
      {
        type: "fix",
        text: "V4.2A — Ocena bez „Dominują inne”; marża „Ustal marżę” gdy brak danych; filtr Elektryczne bez false positives",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.5",
    label: "Przetargi — pełna widoczność ATH (P0)",
    items: [
      {
        type: "fix",
        text: "Kosztorys — catalogQuantities do 500 pozycji (zgodnie z parserem ATH); TP113 i podobne nie tracą końcówki przedmiaru",
      },
      {
        type: "fix",
        text: "Budowa katalogu ilości: najpierw filtr jakości, potem limit — nie obcinamy dobrych pozycji przed odfiltrowaniem szumu",
      },
      {
        type: "improve",
        text: "KPI Kosztorys pokazuje pełny rowCount ATH; przy obciętym snapshotcie — format „pokazane / łącznie”",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.4",
    label: "Przetargi — ZIP ATH Recovery",
    items: [
      {
        type: "fix",
        text: "Obsługa dużych archiwów ZIP do 128 MB (np. DOKUMENTACJA PROJEKTOWA.zip na eZamawiający)",
      },
      {
        type: "new",
        text: "Edge zip-catalog — lista plików wewnętrznych ZIP bez pobierania całego archiwum do przeglądarki",
      },
      {
        type: "new",
        text: "Edge zip-entry-bytes — pobieranie pojedynczego pliku z ZIP (ATH/przedmiar) po stronie serwera",
      },
      {
        type: "fix",
        text: "Wykluczenie formularzy ofertowych z discovery kosztorysu (Formularz oferty, zal. nr 1 do SWZ)",
      },
      {
        type: "fix",
        text: "Recovery ATH z dokumentacji projektowej — discovery i dossier dla WM / Marketplanet",
      },
      {
        type: "improve",
        text: "Diagnostyka pobierania dokumentów (HTTP status, content-type, final URL) w Edge",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.3",
    label: "Przetargi — WGDOM V4.1.2 ATH / Kosztorys Source Recovery",
    items: [
      {
        type: "fix",
        text: "Zakładka Kosztorys korzysta z catalogQuantities jako głównego źródła danych (zamiast snapshot kosztorys.rows)",
      },
      {
        type: "fix",
        text: "Przywrócono historyczną ścieżkę wyświetlania pozycji kosztorysowych — do 250 pozycji w tabeli",
      },
      {
        type: "new",
        text: "Przycisk „Pełny podgląd ATH” — reuse JobFilePreviewModal (do 500 pozycji), bez nowych parserów",
      },
      {
        type: "fix",
        text: "KPI kosztorysu liczone z danych katalogowych (catalogQuantities)",
      },
      {
        type: "fix",
        text: "Poprawiony empty state przy braku pozycji kosztorysowych",
      },
      {
        type: "improve",
        text: "Bez zmian: ATH parser, parseKosztorysBytes, parseXlsxToKosztorys, dossier pipeline, athPreviewToSnapshot, Intelligence, Scoring, Qualification, Valuation Engine",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.2",
    label: "Przetargi — WGDOM V4.1.1 Kosztorys Hotfix",
    items: [
      {
        type: "fix",
        text: "Zakładka Kosztorys — formularze ofertowe (KRS, REGON, CEIDG, Wykonawca) nie renderują się już jako pozycje kosztorysowe",
      },
      {
        type: "fix",
        text: "Filtr dokumentów formalnych przed tabelą: formularz, oferta, wykonawca, KRS, REGON, CEIDG, oświadczenia",
      },
      {
        type: "fix",
        text: "Walidacja pozycji kosztorysowych (lp, ilość, j.m., cena, wartość, katalog) + poprawny empty state dla dokumentów formalnych",
      },
      {
        type: "fix",
        text: "KPI kosztorysu liczone po przefiltrowanych danych (display SSOT buildKosztorysV4Display)",
      },
      {
        type: "improve",
        text: "Bez zmian: ATH parser, SWZ, dossier pipeline, Intelligence, Scoring, Qualification, Valuation, backend",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.1",
    label: "Przetargi — WGDOM V4.1 Przetarg + Kosztorys + KPI PRO",
    items: [
      {
        type: "new",
        text: "Zakładka Przetarg — podstawowe dane, warunki udziału, zakres robót (3–8 grup), najważniejsze informacje ze SWZ/executive summary",
      },
      {
        type: "new",
        text: "Zakładka Kosztorys — KPI pozycji ATH/wycenionych/niewycenionych, status ATH gotowy/niegotowy, tabela pozycji",
      },
      {
        type: "new",
        text: "KPI Bar PRO — dokumenty, ATH (liczba pozycji), wycena (np. 380/412 · 92%)",
      },
      {
        type: "improve",
        text: "Kolejność zakładek V4: Przetarg → Dokumenty → Kosztorys → Ceny → Decyzja → Strategia → Materiały",
      },
      {
        type: "improve",
        text: "Brak pozycji ATH — komunikat „Brak rozpoznanych pozycji” zamiast „0”",
      },
      {
        type: "improve",
        text: "Bez zmian: ATH parser, SWZ, Intelligence, Qualification, Dossier, Scoring, backend",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.61.0",
    label: "Przetargi — WGDOM V4 UX Navigation MVP",
    items: [
      {
        type: "new",
        text: "Osobny widok przetargu — routing /przetargi/:id/:tab, breadcrumb, powrót do listy",
      },
      {
        type: "new",
        text: "KPI Bar na szczególe — termin składania, wadium, ZNW, wartość, warunki udziału (display-only)",
      },
      {
        type: "new",
        text: "Tender Detail Page + Tab Bar — Przetarg, Ceny, Dokumenty, Decyzja (MVP); Kosztorys/Materiały/Strategia wkrótce",
      },
      {
        type: "improve",
        text: "Lista przetargów bez accordionu — klik otwiera osobny widok zamiast rozwijanego panelu",
      },
      {
        type: "improve",
        text: "Feature flag TENDERS_V4_ROUTING — rollback bez revertu kodu (legacy accordion gdy false)",
      },
      {
        type: "improve",
        text: "Bez zmian: ATH, Dossier, Scoring, Qualification, Valuation, Intelligence V3.1",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.60.0",
    label: "Przetargi — Tender Intelligence Dashboard V3.1 (Sprint 1)",
    items: [
      {
        type: "new",
        text: "Zakładka Intelligence — werdykt STARTUJ / ANALIZUJ / ODPUŚĆ, zakres robót, ekonomia i jedna rekomendowana akcja bez otwierania dokumentów",
      },
      {
        type: "new",
        text: "Decision Overlay (O1–O5) + Reasons Policy nad istniejącym scoringiem — Strategia nadal pokazuje surowy werdykt",
      },
      {
        type: "new",
        text: "Executive Summary na panelu Intelligence (reuse snapshot dossier; modal PDF bez zmian)",
      },
      {
        type: "new",
        text: "buildTenderIntelligenceContext — SSOT danych z scoringContext Providera (bez fallback jobs:[] w prod)",
      },
      {
        type: "improve",
        text: "Owner View jako renderer intelligenceCtx — 7 sekcji; PrepStatus i plik pozycji w Szczegółach; jeden CTA zamiast OwnerNextSteps",
      },
      {
        type: "improve",
        text: "version.json przy buildzie: version + commit + timestamp (banner odświeżenia)",
      },
      {
        type: "improve",
        text: "Bez zmian: ATH Preview, PDF Preview, Tender Dossier, Qualification Workspace, Valuation Workspace, silniki scoringu",
      },
    ],
  },
  {
    date: "2026-06-18",
    version: "2.59.53",
    label: "Przetargi — Zakres robót z tekstu PDF (P2A)",
    items: [
      {
        type: "new",
        text: "Executive Summary: gdy brak działów i pozycji w snapshot, główne roboty są wnioskowane z tekstu PDF (pewność Średnia)",
      },
      {
        type: "improve",
        text: "Podgląd dokumentu: zamiast fałszywego „Pozycje: 0” — „Nie ustalono liczby pozycji” lub „W trakcie analizy”",
      },
    ],
  },
  {
    date: "2026-06-17",
    version: "2.59.52",
    label: "Przetargi — Podgląd dokumentów dla właściciela (P1A–P1D)",
    items: [
      {
        type: "improve",
        text: "Podgląd PDF: etykiety kontekstowe (przedmiar, kosztorys, SWZ), domyślna zakładka tekst dla przedmiaru, poprawne pobieranie pliku",
      },
      {
        type: "new",
        text: "Nagłówek podsumowania dokumentu — typ, pozycje, status cen, wycena, źródło (Owner View)",
      },
      {
        type: "new",
        text: "Executive Summary — główne roboty z działów KNR/ATH i inferencji słów kluczowych (P1D)",
      },
      {
        type: "improve",
        text: "Pewność rozpoznania zakresu robót (Wysoka/Średnia/Niska) — bez czytania dumpa pozycji",
      },
    ],
  },
  {
    date: "2026-06-17",
    version: "2.59.51",
    label: "Przetargi — Stabilizacja i wydajność (P3-AUDIT-001)",
    items: [
      {
        type: "fix",
        text: "Przetargi: naprawa utraty dokumentów przy auto-pipeline — functional updateItem(), eliminacja stale closure",
      },
      {
        type: "fix",
        text: "Klasyfikacja ATH: redukcja UNKNOWN z 10,9% do 0% — filtr szumu XLSX/SWZ, bootstrap słownika użytkownika, phrase rules v3.3",
      },
      {
        type: "improve",
        text: "Wydajność przetargów: cache dokumentów, PDF i ZIP; lazy dossier i lazy wycena; szybsze otwieranie przetargów",
      },
    ],
  },
  {
    date: "2026-06-17",
    version: "2.59.50",
    label: "Przetargi — P3-AUDIT-001-FIX-A (utrata dokumentów)",
    items: [
      {
        type: "fix",
        text: "Przetargi: naprawa utraty dokumentów przy auto-pipeline — functional updateItem(), eliminacja stale closure",
      },
      {
        type: "fix",
        text: "Auto-pipeline: jeden zbiorczy patch zamiast wielu partial onUpdate — ochrona bzpDocuments, externalDocDiscovery, tenderDossier",
      },
      {
        type: "improve",
        text: "Smoke regresji T1–T6 — wielokrotne patchy pipeline nie gubią załączników BZP",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.49",
    label: "Lista Płac — Przydziały robót (PAYROLL-ASSIGNMENTS-P1)",
    items: [
      {
        type: "new",
        text: "Lista Płac: przełącznik „Przydziały robót” — przypisywanie pracowników do robót bez przechodzenia do Roboty (ta sama baza workEntries[])",
      },
      {
        type: "new",
        text: "Panel przydziałów: wiele robót dziennie, walidacja spójności LP↔Roboty (✅/❌), badge 🟢🟡🔴 na liście pracowników",
      },
      {
        type: "new",
        text: "Skrót „Kopiuj przydziały z poprzedniego dnia” — proporcje wczoraj, suma = godziny z listy płac",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.48",
    label: "Inspektor DESIGN-002 — Design System Alignment",
    items: [
      {
        type: "improve",
        text: "Inspektor: pills sekcji roboty jak w Adminie (JobDetailSectionNav) — rounded-lg, emerald na Plikach, te same stany active/hover",
      },
      {
        type: "improve",
        text: "Status pakietu odbiorowego: badge CSS (PAKIET GOTOWY / BRAK PAKIETU) bez emoji — wspólny komponent DeliveryPackageStatusBadge",
      },
      {
        type: "improve",
        text: "Nagłówek roboty inspektora: typografia i badge statusu jak Roboty admin (JobListPrimaryBadge, text-base, spacing V3)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.47",
    label: "Inspektor UX-002 — Quick Wins odbioru WM",
    items: [
      {
        type: "improve",
        text: "Robota inspektora: sticky chip 🟢 PAKIET GOTOWY / 🔴 BRAK PAKIETU w nagłówku — widoczny we wszystkich sekcjach",
      },
      {
        type: "improve",
        text: "Pakiet odbiorowy nad treścią sekcji (above the fold) + pasek skrótów: Pobierz pakiet · Checklista · Zdjęcia",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.46",
    label: "Inspektor P1B — Pakiet odbiorowy (download + manifest)",
    items: [
      {
        type: "new",
        text: "Panel Inspektor → Robota → Odbiór WM: sekcja „Pakiet odbiorowy” — status GOTOWY/BRAK, metadane publikacji, pobieranie opublikowanego ZIP (bez regeneracji, bez WM Druk)",
      },
      {
        type: "new",
        text: "„Pokaż zawartość” — read-only manifest folderów Odbiory/Pomiary (INDEX, DOCX, PDF); sync read-only kw-delivery-package-publications w InspectorPanel",
      },
      {
        type: "improve",
        text: "Publikacja admin: zapis manifestu plików z opublikowanego ZIP (P1A rozszerzenie)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.45",
    label: "Inspektor P1A — Published Delivery Package (admin publish)",
    items: [
      {
        type: "new",
        text: "WM Druk → Odbiory: „Opublikuj dla inspektora” — upload zweryfikowanego ZIP odbiorowego do chmury (kv-delivery-package-publications); inspektor bez dostępu do generatorów WM Druk",
      },
      {
        type: "new",
        text: "Publikacja: wersjonowanie (supersede poprzedniej ACTIVE), fingerprint wejść generacji (ZI, checklista, RAP, dokumenty WM) — zapis pod P1C stale detection",
      },
      {
        type: "improve",
        text: "Panel Odbiory: podgląd ostatniej publikacji (data, autor, liczba plików, rozmiar, status)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.44",
    label: "Pomiary Elektryczne — EM-P1R-HOTFIX-001 ADDRESS parity",
    items: [
      {
        type: "fix",
        text: "Szablony ADSC / Rezystancja / RCD / Dane — „Miejsce pomiaru” używa {{ADDRESS}} zamiast hardcoded adresu testowego (Sępa); parity z Protokołem",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.43",
    label: "Pomiary Elektryczne — EM-P1R Template Rebuild (SSOT Word)",
    items: [
      {
        type: "fix",
        text: "5 szablonów DOCX odbudowane z oryginalnych formularzy Word (Desktop SSOT) — zachowany układ tabel, legendy, orientacja; placeholdery zgodne z EM-P1.5",
      },
      {
        type: "improve",
        text: "Retire build-em-docx-templates.mjs — templatyzacja przez scripts/templatize-em-p1r-from-ssot.mjs (chirurgiczna edycja XML, nie generowanie layoutu)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.42",
    label: "Pomiary Elektryczne — EM-P1.6C Registry Repair V2",
    items: [
      {
        type: "fix",
        text: "Jednorazowa naprawa prod KV: usunięcie RAP-2-2026 (Brochów), sierocy Cygan bez numeru, baseline 2026=44, repairVersion 2 — katalog i rejestr RAP startują od zera",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.41",
    label: "Pomiary Elektryczne — EM-P3.5 INDEX-POMIARY export",
    items: [
      {
        type: "new",
        text: "ZIP pomiarów i paczka odbiorowa: INDEX-POMIARY.txt + INDEX-POMIARY.csv (RAP, adres, data, status) generowane na żywo",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.40",
    label: "Pomiary Elektryczne — EM-P3 integracja ZIP odbiorowy WM Druk",
    items: [
      {
        type: "new",
        text: "WM Druk → Odbiory → Generuj komplet (ZIP): opcjonalnie folder Pomiary/ z 5× DOCX aktywnego RAP (TEST-RAP ignorowany)",
      },
      {
        type: "improve",
        text: "Paczka odbiorowa: struktura Odbiory/ + Pomiary/, checkbox „Dołącz dokumenty pomiarowe” (domyślnie ON gdy aktywny RAP)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.39",
    label: "Pomiary Elektryczne — EM-P3A Katalog UX + Rejestr RAP",
    items: [
      {
        type: "improve",
        text: "Katalog Pomiarów: ZIP pojedynczy RAP-X-YYYY_ADRES.zip, kolumna Robota, wyszukiwanie RAP (45/RAP-45), filtry, deep-link do Roboty",
      },
      {
        type: "new",
        text: "WM Druk → Katalog → zakładka Rejestr RAP — wieloletnie archiwum numerów z adresem i robotą",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.38",
    label: "Pomiary Elektryczne — EM-P2.5 Raporty testowe",
    items: [
      {
        type: "new",
        text: "WM Druk → Pomiary: „Nowy raport testowy” (TEST-RAP-NNN) — bez registry RAP, bez wpływu na checklistę, status TESTOWY w katalogu",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.37",
    label: "Pomiary Elektryczne — EM-P2 Katalog Pomiarów",
    items: [
      {
        type: "new",
        text: "WM Druk → Katalog Pomiarów: lista RAP, filtry, szczegóły, pobieranie DOCX i ZIP (pojedynczy + wielokrotny z INDEX.txt)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.36",
    label: "Pomiary Elektryczne — EM-P1.6B naprawa baseline RAP",
    items: [
      {
        type: "fix",
        text: "Rejestr RAP: usunięcie raportów testowych (Kleczkowska, Brochów), baseline 2026→44 — kolejny numer RAP-45-2026",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.35",
    label: "Pomiary Elektryczne — EM-P1.7 domyślne ustawienia",
    items: [
      {
        type: "new",
        text: "WM Druk → Ustawienia → Pomiary Elektryczne: globalne domyślne pomiarowiec/miernik (sync kw-electrical-measurement-settings), auto-podstawianie przy nowym raporcie, nadpisanie per raport",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.34",
    label: "Pomiary Elektryczne — EM-P1.6 Rejestr RAP",
    items: [
      {
        type: "new",
        text: "WM Druk → Pomiary: trwały rejestr numerów RAP (1 numer ↔ 1 robota) — automatyczny przydział przy utworzeniu raportu, ponowne utworzenie z tym samym numerem, reset roczny, sync kw-electrical-measurement-registry",
      },
      {
        type: "improve",
        text: "Checklista Pomiary: gdy zaznaczone i brak raportu — komunikat z numerem RAP; administrator może utworzyć raport ponownie bez nowego numeru",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.33",
    label: "Pomiary Elektryczne — EM-P1.5 Measurement Value Engine",
    items: [
      {
        type: "new",
        text: "WM Druk → Pomiary: silnik wartości pomiarowych — losowanie seed (raz przy utworzeniu / przeliczeniu), sekcja Wyniki pomiarów z korektą Zs/Rs, preview i DOCX ze zapisanych wartości",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.32",
    label: "Notatki operacyjne — P0-HOTFIX-002 read-state race",
    items: [
      {
        type: "fix",
        text: "Auto-sync chmury: potwierdzenia przeczytania (ACK) notatek operacyjnych nie cofają się po synchronizacji — push aux używa stanu po pull, nie starego closure",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.31",
    label: "Pomiary Elektryczne — EM-UX-001 przeniesienie do WM Druk",
    items: [
      {
        type: "improve",
        text: "WM Druk: nowa zakładka Pomiary — pełny UI raportów pomiarowych, obwodów, RCD i generowania DOCX (Wariant A: wybór roboty → edycja)",
      },
      {
        type: "improve",
        text: "Roboty: Pomiary Elektryczne — tylko skrót Raporty/Obwody/RCD + „Otwórz w WM Druk” z kontekstem roboty",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.30",
    label: "Pomiary Elektryczne — EM-P1B generator DOCX",
    items: [
      {
        type: "new",
        text: "Roboty → Pomiary Elektryczne: generowanie 5 dokumentów Word (Protokół, Dane informacyjne, RCD, ADSC, Rezystancja) — pojedynczy DOCX bez ZIP",
      },
      {
        type: "improve",
        text: "EM-P1B: szablony public/em-measurements + XML row cloning (RCD/ADSC/Rezystancja) + payload z preview.ts SSOT",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.29",
    label: "Hotfix sync — mergeRecoverableCharges import (P0-HOTFIX-001)",
    items: [
      {
        type: "fix",
        text: "Sync chmura: przywrócony brakujący import mergeRecoverableCharges w cloud-sync.ts (regresja EM-P0) — pełny auto-sync admina bez toastu błędu",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.28",
    label: "Pomiary Elektryczne — EM-P0 final (korekty 4–6)",
    items: [
      {
        type: "improve",
        text: "Obwody EM: displayName + sortOrder w modelu — gotowe pod generator DOCX (EM-P1) bez migracji",
      },
      {
        type: "improve",
        text: "Preview SSOT: buildAdscPreview / buildResistancePreview / buildRcdPreview — UI i przyszły DOCX z jednego źródła",
      },
      {
        type: "improve",
        text: "Panel Pomiary Elektryczne: podsumowanie Raporty/Obwody/RCD zawsze widoczne + zwijanie szczegółów raportu",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.27",
    label: "Pomiary Elektryczne — fundament EM-P0",
    items: [
      {
        type: "new",
        text: "Roboty: panel Pomiary Elektryczne — wiele raportów pomiarowych na jedną robotę (numer, data, pomiarowiec, miernik, zasilanie, obwody, RCD)",
      },
      {
        type: "new",
        text: "Podgląd read-only: liczba dokumentów (5), obwodów i RCD oraz wiersze ADSC / rezystancja / RCD",
      },
      {
        type: "improve",
        text: "Sync chmura: nowy klucz kw-electrical-measurements (bez generatora DOCX — EM-P1)",
      },
    ],
  },
  {
    date: "2026-06-16",
    version: "2.59.26",
    label: "Odbiory WM Druk — historia generowania (WM-HISTORY-001)",
    items: [
      {
        type: "new",
        text: "WM Druk: zakładka Historia — kto, kiedy i jaki dokument (PDF/DOCX/ZIP) wygenerował dla roboty; tylko metadane, bez plików",
      },
      {
        type: "new",
        text: "Roboty: sekcja Historia WM Druk w szczegółach roboty (ostatnie 8 wpisów + link do pełnej historii)",
      },
      {
        type: "improve",
        text: "Sync chmura: nowy klucz kw-wm-print-history (cap 1000 wpisów)",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.25",
    label: "Odbiory WM Druk — housekeeping kodu (P0.5B)",
    items: [
      {
        type: "improve",
        text: "WM Druk: wydzielenie modułów czcionki PDF i statycznych skanów; oznaczenia @deprecated dla ścieżki legacy LiveCycle — bez zmiany ZIP/ZI/DOCX",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.24",
    label: "Odbiory WM Druk — cleanup legacy ZI slot (P0)",
    items: [
      {
        type: "fix",
        text: "WM Druk: usunięcie duplikatu slotu ZI LiveCycle z KV + tombstone; merge tombstone z chmury; dedupe nazw przy generacji ZIP",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.23",
    label: "Odbiory WM Druk — hotfix ZI pdf.js worker (P0)",
    items: [
      {
        type: "fix",
        text: "ZI ZIP: konfiguracja GlobalWorkerOptions.workerSrc dla pdf.js (preservation graft) — naprawa błędu „No GlobalWorkerOptions.workerSrc specified”",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.22",
    label: "Odbiory WM Druk — ZI Tauron 2026 (GO)",
    items: [
      {
        type: "new",
        text: "ZI: formularz Tauron 2026 (FormMaker) — §4: Pole tekstowe 99/111/112 → ulica/budynek/lokal z adresu roboty",
      },
      {
        type: "fix",
        text: "ZI: preservation gate — wypełniony szablon WM (szyfrowany R6) zachowuje dane użytkownika; dopisuje tylko §4 (pdf.js + pdf-lib)",
      },
      {
        type: "improve",
        text: "ZI LiveCycle 2021 CLOSED — archiwum audit/archive/legacy-zi-livecycle-2021/ · guard przy starym szablonie",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.21",
    label: "Odbiory WM Druk — ZI Tauron 2026 (dev)",
    items: [
      {
        type: "new",
        text: "ZI: pierwszy generator Tauron 2026 (FormMaker) — superseded przez 2.59.22",
      },
      {
        type: "improve",
        text: "ZI: legacy LiveCycle (2021) oznaczony CLOSED — archiwum audit/ + guard przy starym szablonie",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.20",
    label: "Odbiory WM Druk — P0.3A ZI §3 adres obiektu",
    items: [
      {
        type: "fix",
        text: "ZI PDF: adres WM w polach §3 TextField2[10/9/8] (y≈142) — nie w §1 TextField5/imie/nazwisko; bez ukrywania pól §3",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.19",
    label: "Odbiory WM Druk — P0.2A ZI demo ULICA/BUD/LOK strip",
    items: [
      {
        type: "fix",
        text: "ZI PDF: ukrycie pól demo projektanta (TextField2[8/9/10] @ y≈142) — Edge nie pokazuje ULICA/BUD/LOK zamiast adresu WM",
      },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.18",
    label: "Odbiory WM Druk — P0 hotfix parseWmPrintTemplates runtime",
    items: [
      { type: "fix", text: "cloud-sync merge kw-wm-print-templates: normalizeWmPrintTemplates zamiast niezaimportowanego parseWmPrintTemplates" },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.17",
    label: "Odbiory WM Druk — P0 cleanup template pollution EXECUTED",
    items: [
      { type: "fix", text: "Prod KV cleanup: 99→15 szablonów, 84 duplikatów usuniętych + tombstone deleted-ids" },
      { type: "fix", text: "cleanup script: poprawny batch-set keys/values + raport execute z weryfikacją canonical ZI" },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.16",
    label: "Odbiory WM Druk — P0 cleanup template pollution (skrypt KV)",
    items: [
      { type: "fix", text: "Skrypt cleanup-wm-print-template-pollution.mjs — backup, KEEP/DELETE, dry-run / --execute" },
      { type: "improve", text: "planWmPrintTemplateCleanup: filesCount>0 + najstarszy per name; test-wm-print-template-cleanup.mjs" },
    ],
  },
  {
    date: "2026-06-15",
    version: "2.59.15",
    label: "Odbiory WM Druk — P0 fix template pollution (seed guard)",
    items: [
      { type: "fix", text: "Seed WM Druk tylko gdy local i chmura puste — koniec duplikatów UUID przy pustym localStorage" },
      { type: "fix", text: "parseWmPrintTemplates bez auto-seedu; guard unikalności name przed push do KV" },
      { type: "improve", text: "Logi WM PRINT SEED SKIPPED / EXECUTED + test-wm-print-p0-seed-guard.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.14",
    label: "Odbiory WM Druk — P0.1E fix ZI Edge (cover strony + ukrycie widgetów)",
    items: [
      { type: "fix", text: "ZI hybrid/XFA: biały cover + Noto na stronie pól 8/9/10 — Edge nie pokazuje już {{JOB_*}} z tła Im0" },
      { type: "fix", text: "Ukrycie widgetów adresowych (F=Hidden) po narysowaniu tekstu na content stream strony" },
      { type: "improve", text: "Forensic P0.1E: audit-p0-1e-out + test-wm-print-p0-1e-zi-edge.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.13",
    label: "Odbiory WM Druk — P0.1D fix ZI widoczny tekst (/AP widgetów)",
    items: [
      { type: "fix", text: "ZI hybrid/XFA: updateAppearances(Noto) na polach 8/9/10 — naprawa warstwy /AP nad overlay P0.1C" },
      { type: "fix", text: "Usunięto nieskuteczny overlay content-stream (był pod widgetami AcroForm)" },
      { type: "improve", text: "Forensic P0.1D: audit-p0-1d-out + test-wm-print-p0-1d-zi-visual.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.12",
    label: "Odbiory WM Druk — P0.1C fix ZI widoczny tekst (XFA overlay)",
    items: [
      { type: "fix", text: "ZI XFA/hybrid: overlay Noto Sans na polach 8/9/10 — viewer widzi adres zamiast {{JOB_*}}" },
      { type: "fix", text: "ZI: usunięto cichy fallback copy-as-is; szablon ZI zawsze pdf_form" },
      { type: "improve", text: "Diagnostyka ZI: diagnoseZiPdfFieldFill + test-wm-print-p0-1c-zi-forensic.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.11",
    label: "Odbiory WM Druk — P0.1B fix ZI (mapowanie XFA)",
    items: [
      { type: "fix", text: "ZI pdf_form: mapowanie pól XFA TextField2[8/9/10] → lokal/budynek/ulica" },
      { type: "fix", text: "ZI: fallback indeks PDFTextField po usunięciu XFA przez pdf-lib; polskie znaki bez WinAnsi" },
      { type: "improve", text: "Test prod ZI: Sępa Szarzyńskiego 83/7 — test-wm-print-p0-1b-zi-fix.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.10",
    label: "Odbiory WM Druk — P0.1A fix DOCX XML (regresja 2.59.9)",
    items: [
      { type: "fix", text: "DOCX: bezpieczne czyszczenie <w:t> — bez uszkadzania xml:space=\"preserve\" (Word Office Open XML)" },
      { type: "fix", text: "Split-run + proofErr: podmiana placeholderów zachowana, tagi XML poprawne" },
      { type: "improve", text: "Test P0.1A na produkcyjnych szablonach kierownika i zatrudnieniu" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.9",
    label: "Odbiory WM Druk — P0 fix generatorów DOCX/PDF",
    items: [
      { type: "fix", text: "PDF statyczne (Izba, SEP, Uprawnienia…): copy-as-is do ZIP — bez latin1 replace i uszkodzeń" },
      { type: "fix", text: "ZI pdf_form: wyłączono flatten(); wypełnianie tylko Ulica/Numer budynku/Numer lokalu" },
      { type: "fix", text: "DOCX: podmiana split-run Word ({{JOB_ADDRESS}} rozbite na runy) — scala <w:t> w akapicie" },
      { type: "improve", text: "Testy P0: test-wm-print-p0-static-pdf, p0-zi-form, p0-docx-runs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.8",
    label: "Odbiory WM Druk — fix duplikatów kompletności P1.0.5A",
    items: [
      { type: "fix", text: "Kompletność robota: deduplikacja slotów po nazwie — brak podwójnych pozycji w liście braków" },
      { type: "fix", text: "% liczony po unikalnych typach dokumentów (nie zawyża liczby braków)" },
      { type: "improve", text: "UI: Brakuje (N) + lista punktowana zamiast powtórzonego tekstu" },
      { type: "improve", text: "Test test-wm-print-p1-0-5a.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.7",
    label: "Odbiory WM Druk — kompletność P1.0.5",
    items: [
      { type: "fix", text: "Kompletność robota: tylko sloty wgrywane per robota (Kominiarz, Gaz…) — bez „brak szablonu” globalnych grup" },
      { type: "new", text: "Szablony → Stan konfiguracji: N/M skonfigurowanych, lista brakujących grup (generated bez plików)" },
      { type: "improve", text: "Braki konfiguracji modułu nie obniżają % kompletności przy robocie" },
      { type: "improve", text: "Test test-wm-print-p1-0-5.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.6",
    label: "Odbiory WM Druk — domyślne zaznaczenie P1.0.4",
    items: [
      { type: "improve", text: "Dokumenty przypisane: wszystkie aktywne szablony zaznaczone domyślnie — odznaczasz tylko wyjątki" },
      { type: "new", text: "Zaznacz wszystko / Odznacz wszystko + licznik Wybrane: N / M" },
      { type: "improve", text: "Generuj komplet (ZIP) używa zaznaczonych szablonów; dokumenty robota bez slotu zawsze w paczce" },
      { type: "improve", text: "Test test-wm-print-p1-0-4.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.5",
    label: "Odbiory WM Druk — P1.1 korekta grupowania",
    items: [
      { type: "fix", text: "Usunięto niezależny status WM — sekcje Odbiorów wyłącznie z statusu robota (W trakcie / Do odbioru / Zdane)" },
      { type: "fix", text: "Usunięto dropdown Status WM, przyciski przeniesienia i sync kw-wm-print-job-statuses" },
      { type: "improve", text: "Filtr: Wszystkie · W trakcie · Do odbioru · Zdane — zmiana w Robotach automatycznie przenosi robotę między sekcjami" },
      { type: "improve", text: "Test test-wm-print-p1-1-status-grouping.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.4",
    label: "Odbiory WM Druk — statusy procesu WM P1.1",
    items: [
      { type: "new", text: "Status WM per robota: W TRAKCIE · GOTOWE DO ODBIORU · ZDANE — niezależny od statusu robota" },
      { type: "new", text: "Odbiory: sekcje z licznikami, filtr WM, dropdown i szybkie przeniesienie statusu" },
      { type: "improve", text: "Sync kw-wm-print-job-statuses (LS/chmura/backup); migracja domyślna W TRAKCIE; test P1.1 statuses" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.3",
    label: "Odbiory WM Druk — multi-upload P1.0.3",
    items: [
      { type: "new", text: "Szablony: „Dodaj pliki” — wielokrotny wybór (CTRL/SHIFT), wiele plików jednym działaniem" },
      { type: "new", text: "Drag & drop wielu plików do grupy szablonu; komunikat „Dodano N plików do grupy …”" },
      { type: "improve", text: "Append bez nadpisywania; duplikat po id pomijany; test test-wm-print-p1-0-3.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.2",
    label: "Odbiory WM Druk — fix usuwania pliku z grupy",
    items: [
      { type: "fix", text: "Szablony: usunięcie pliku działa za pierwszym kliknięciem — bez podwójnego potwierdzenia" },
      { type: "fix", text: "Migracja files[] autorytatywne (brak odtwarzania legacy storageUrl); merge/sync LWW zamiast union" },
      { type: "fix", text: "Push WM Druk bez pushKeysToCloudSafe — usunięte pliki nie wracały z chmury" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.1",
    label: "Odbiory WM Druk — multi-file groups (P1.0.1)",
    items: [
      { type: "new", text: "Grupy szablonów — wiele plików w jednej kategorii (Uprawnienia (3), Gaz (2)…) z licznikiem" },
      { type: "new", text: "Szablony: Dodaj plik (append), Usuń/Pobierz/Podgląd PDF per plik — bez nadpisywania" },
      { type: "improve", text: "ZIP i generator — wszystkie pliki z grupy; migracja legacy single-file → files[1]" },
      { type: "improve", text: "Odbiory: wiele dokumentów per slot job_upload; test test-wm-print-p1-1.mjs" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.59.0",
    label: "Odbiory WM Druk — moduł P1",
    items: [
      { type: "new", text: "Menu Odbiory WM Druk — szablony DOCX/PDF/formularz, dokumenty per robota, kompletność i generowanie ZIP" },
      { type: "new", text: "Zmienne {{DATE}}, {{JOB_ADDRESS}}, {{JOB_STREET}}, {{JOB_BUILDING}}, {{JOB_APARTMENT}}, {{JOB_CITY}} — podstawianie przy generowaniu" },
      { type: "new", text: "Biblioteka szablonów — dodawanie, usuwanie, kolejność, włącz/wyłącz bez zmian w kodzie" },
      { type: "new", text: "Sync chmura: kw-wm-print-templates, kw-wm-print-job-docs, kw-wm-print-settings" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.58.1",
    label: "Notatki operacyjne — Hotfix Backup Completeness",
    items: [
      { type: "fix", text: "Eksport backup UI — pełny stan modułu: notes + read-state + audit-log + deleted-ids (SSOT OPERATIONAL_NOTES_BACKUP_KEYS)" },
      { type: "fix", text: "Import backup — merge 4 kluczy notatek + push aux do chmury; snapshot lokalny i email tygodniowy (EMAIL_KV_KEYS) uzupełnione" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.58.0",
    label: "Notatki operacyjne — Inspektor UI (P2A)",
    items: [
      { type: "new", text: "Panel inspektora — Notatki operacyjne: ikona w headerze z badge nieprzeczytanych (bez nowej zakładki bottom nav)" },
      { type: "new", text: "Inspektor: lista aktywnych notatek, tworzenie, komentarze, ACK, historia wersji, status Przeczytali/Nie przeczytali" },
      { type: "improve", text: "Sync chmury w InspectorPanel — kw-operational-notes + read-state + audit-log + tombstones (merge jak admin)" },
      { type: "improve", text: "ACL defense in depth — inspektor bez edycji/archiwum/usuwania/share (lib + UI variant=inspector)" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.5",
    label: "Notatki operacyjne — Audit UI (P2C)",
    items: [
      { type: "new", text: "Audit notatek operacyjnych — przycisk „Audyt” (Sheet) wyłącznie dla Super Admina" },
      { type: "new", text: "Historia działań: filtry akcji/użytkownika/notatki, wyszukiwanie, paginacja 50/strona" },
      { type: "improve", text: "ACK zapisuje wpis audit (akcja ack) — także auto-ACK autora przy utworzeniu notatki" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.4",
    label: "Notatki operacyjne — Pulpit (P2B)",
    items: [
      { type: "new", text: "Pulpit — widget Notatki operacyjne: Łącznie, Nieprzeczytane, Od inspektora, ostatnia aktywność" },
      { type: "improve", text: "Klik w widget → moduł Notatki operacyjne · liczniki per użytkownik (ACL + ACK)" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.3",
    label: "Sidebar cleanup + Kadry",
    items: [
      { type: "improve", text: "Menu boczne — moduł „Kadry” (zakładki Pracownicy | Kontakty bez zmian danych i routingu)" },
      { type: "improve", text: "Sidebar — usunięto duplikat KPI „Bieżący tydzień” (dane na Pulpicie); szerokość +16 px (w-60)" },
      { type: "improve", text: "Scrollbar sidebara — ciemny, cienki, półprzezroczysty (dark theme WGDOM)" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.2",
    label: "Notatki operacyjne — ACK (P1)",
    items: [
      { type: "new", text: "Potwierdzenie przeczytania (✓ Potwierdzam przeczytanie) — tylko świadome ACK, otwarcie notatki ≠ przeczytanie" },
      { type: "new", text: "Badge menu Notatki operacyjne + globalny banner „Nieprzeczytane: N” — tylko aktywne notatki widoczne dla użytkownika" },
      { type: "new", text: "Status przeczytania w detalu notatki — listy Przeczytali / Nie przeczytali (ACL + shareWithInspector)" },
      { type: "improve", text: "Auto-ACK autora przy utworzeniu · reset ACK przy contentRev++ (edycja tytułu/treści, komentarz, archiwum, share, robota)" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.1",
    label: "Menu — Pracownicy i kontakty",
    items: [
      { type: "improve", text: "Menu boczne — połączone pozycje Pracownicy + Kontakty w jeden moduł „Pracownicy i kontakty” (mniej pozycji, brak scrollbara)" },
      { type: "improve", text: "Moduł z zakładkami: Pracownicy | Kontakty — bez zmian modelu danych i syncu (kw-directory, kw-contacts)" },
      { type: "improve", text: "Skróty z listy płac i robot („Zarządzaj kontaktami”) otwierają zakładkę Kontakty w tym samym module" },
    ],
  },
  {
    date: "2026-06-14",
    version: "2.57.0",
    label: "Notatki Operacyjne (P0)",
    items: [
      { type: "new", text: "Moduł Notatki operacyjne — baza wiedzy operacyjnej (globalne i powiązane z robotami), menu między Roboty a Inspektor" },
      { type: "new", text: "CRUD notatek: tytuł, treść, komentarze, historia wersji treści, archiwum i przywracanie" },
      { type: "new", text: "Powiązanie z robotą (linkedJobId) — panel w Roboty → Przegląd + deep link z powrotem do tej samej roboty" },
      { type: "new", text: "Chmura: kw-operational-notes + audit-log + read-state + tombstone logical delete (sync i backup)" },
      { type: "improve", text: "Roboty → Przegląd: pole job.notes jako „Uwagi wewnętrzne (robota)” — rozróżnienie od Notatek operacyjnych" },
      { type: "improve", text: "ACL P0: super_admin / admin / moderator — pełny dostęp; inspektor — tylko w lib (UI P2)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.10",
    label: "Przetargi — fix false exclude przebudowa WM",
    items: [
      { type: "fix", text: "Filtr wykluczeń BZP — „przebudowa/rozbudowa/nadbudowa budynku” nie jest już mylona z „budowa budynku” (granica słowa)" },
      { type: "fix", text: "Sync Edge + klient — remonty WM (np. Sępa Szarzyńskiego) wracają do pipeline po odświeżeniu BZP" },
      { type: "improve", text: "Test regresji: test-tender-exclude-renovation-budowa.mjs — WM/ZZK/TBS/Gminy" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.9",
    label: "Przetargi — P3.6 filtry klientów strategicznych",
    items: [
      { type: "new", text: "Lista Przetargów — szybkie filtry: WM, ZZK, MOPS, TBS, Gminy, Uczelnie z licznikiem przetargów" },
      { type: "improve", text: "Licznik „Wyświetlono X przetargów” pod filtrami listy" },
      { type: "improve", text: "„Zaznacz wiele” i „Eksport CSV” przeniesione do menu „Więcej” (funkcje zachowane)" },
      { type: "improve", text: "Audyty prod — wspólna logika klientów strategicznych (SSOT: tenders-strategic-client-filters.ts)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.8",
    label: "Przetargi — P2-G.3C benchmark klasyfikacji prod",
    items: [
      { type: "improve", text: "Audyt prod KV (WM/ZZK/MOPS/UWr) — metryki pokrycia ATH + TOP UNKNOWN + raport JSON" },
      { type: "improve", text: "Mapowania prod: zerwanie/uzupełnienie cokolików, brodziki, kabiny, przyłącza gazowe, oprawy, roboty przygotowawcze" },
      { type: "fix", text: "Seed katalogu: rozdzielenie tapetowania (MALOWANIE) vs ściąganie tapety (ROZBIORKI)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.7",
    label: "Przetargi — P3 stabilizacja wyceny i klasyfikacji",
    items: [
      { type: "improve", text: "Wycena — mniej scrollu: 1 główny alert, pozostałe pod „Pokaż pozostałe alerty”; Benchmark/Materiały/Pozycje/Szczegóły domyślnie zwinięte" },
      { type: "improve", text: "Klasyfikacja — rozszerzone słowniki: rozbiórki, gładzie/tynki, stolarka, dachy, izolacje, bruk, zagospodarowanie terenu (UNKNOWN ↓)" },
      { type: "fix", text: "Benchmark materiałów rynku — HOLD (Leroy/Castorama/OBI/crawlery poza zakresem)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.6",
    label: "Przetargi — P3.4A historia materiałów i wpływ",
    items: [
      { type: "new", text: "Historia materiałów w kw-wgdom-cost-catalog-history (snapshot przy zmianie stawki)" },
      { type: "new", text: "Baza cen — materiały: Nasza / historia 90 dni / trend ↗↘→" },
      { type: "new", text: "Wycena → Pozycje: materiały — źródło, historia, trend, wpływ vs firma (read-only)" },
      { type: "improve", text: "Hero alert: Wpływ materiałów (historia firmy) — bez benchmarku rynku i API zewnętrznych" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.5",
    label: "Przetargi — P3.3D benchmark impact",
    items: [
      { type: "new", text: "Wycena — Benchmark Impact: wpływ finansowy odchyleń robocizny vs rynek (read-only)" },
      { type: "new", text: "Podsumowanie kategorii: Benchmark, Odchylenie, Wpływ — ranking malejąco po impact" },
      { type: "improve", text: "Hero alert pod KPI: kategorie poza zakresem + suma wpływu PLN — bez zmiany wyceny" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.4",
    label: "Przetargi — P3.3B benchmark robocizny PRO",
    items: [
      { type: "new", text: "Baza cen — panel Źródło benchmarku (edycja, data, 3 źródła, pokrycie kategorii)" },
      { type: "new", text: "Historia własnych stawek robocizny (kw-wgdom-cost-catalog-history) + trend ↗↘→ vs 90 dni" },
      { type: "improve", text: "Triple view: Nasza / Rynek / historia firmy — bez wpływu na kalkulator" },
      { type: "improve", text: "Rozszerzone mapowanie benchmarku: Gładzie/tynki, Rozbiórki" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.3",
    label: "Przetargi — P3.3A benchmark robocizny MVP",
    items: [
      { type: "new", text: "Baza cen + Wycena — kolumna Benchmark robocizny (nasza vs zakres referencyjny, status OK/poza)" },
      { type: "improve", text: "Alert hero: kategorie poza benchmarkiem (read-only, bez wpływu na kalkulator)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.2",
    label: "Przetargi — P3.5B override cen per przetarg",
    items: [
      { type: "new", text: "Wycena → Pozycje kosztorysowe: nadpisanie stawek materiał/robocizna per kategoria (tylko ten przetarg)" },
      { type: "new", text: "Źródło ceny: Baza cen / Override — hero KPI przelicza się natychmiast po zapisie" },
      { type: "improve", text: "Chmura kw-tender-price-overrides — sync per tenderId bez zmiany globalnej Bazy cen" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.1",
    label: "Przetargi — P3.5 ceny per pozycja kosztorysu",
    items: [
      { type: "new", text: "Wycena → Szczegóły → Pozycje kosztorysowe: kategoria, stawki materiał/robocizna, źródło Baza cen, podsumowanie kategorii" },
      { type: "improve", text: "UNKNOWN bez cen w podglądzie + linki do Bazy cen i słownika klasyfikacji (read-only)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.56.0",
    label: "Przetargi — P3.1 Wycena UX + P3.2.0 Baza cen",
    items: [
      { type: "new", text: "Zakładka Przetargi → Baza cen — stawki robocizny i materiałów (katalog WGDOM) + parametry firmy" },
      { type: "improve", text: "Wycena — hero KPI: koszt własny, marża, cena oferty; alerty; szczegóły zwinięte domyślnie" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.10",
    label: "Przetargi — P2-H.5C/5D PDF CAD + multi-ATH",
    items: [
      { type: "fix", text: "PDF przedmiar bez warstwy tekstowej (CAD) — CASE 3 zamiast mylącego „brak pozycji”; komunikat o OCR/ATH/XLS" },
      { type: "improve", text: "Multi-ATH: tie-break po tytule przetargu + depriorytetyzacja opcji/wentylacji; sync discovery ↔ dossier" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.9",
    label: "Przetargi — P2-H.5B PDF przedmiar (heurystyki)",
    items: [
      { type: "new", text: "Heurystyczny odczyt pozycji z natywnych PDF przedmiaru — KNR/KNNR, Lp., J.m., ilości; bez OCR" },
      { type: "improve", text: "UX: „Rozpoznano pozycje robót w PDF” / brak pozycji / skan wymaga OCR; ochrona przed false positive SWZ/STWIOR" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.8",
    label: "Przetargi — P2-H.5A PDF przedmiar (MVP)",
    items: [
      { type: "new", text: "Wykrywanie kosztorysu PDF — przedmiar.pdf, obmiar.pdf, *_PR.pdf w ZIP/7Z; status „Znaleziono przedmiar PDF” bez parsowania pozycji" },
      { type: "improve", text: "Priorytet discovery: ATH/NOR/XML > XLS/XLSX > PDF przedmiar; fundament pod P2-H.5B (heurystyki KNR)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.7",
    label: "Przetargi — P2-H.6 filtr folderów ZIP/7Z",
    items: [
      { type: "fix", text: "listZipFiles / list7zFiles — pomijane wpisy bez rozszerzenia (np. „II. PRZEDMIARY”); inner ranking tylko na rzeczywistych plikach" },
      { type: "improve", text: "Prerequisite P2-H.5 PDF przedmiar — foldery nie wygrywają nad plikami *_PR.pdf w archiwum" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.6",
    label: "Przetargi — P2-H.4 UX copy archiwów 7Z",
    items: [
      { type: "fix", text: "Kosztorys/Dokumenty — rozróżnienie błędu odczytu archiwum 7Z od braku pliku ATH/XLS/XLSX w poprawnie rozpakowanym archiwum" },
      { type: "improve", text: "Komunikaty UX: „Błąd odczytu archiwum 7Z…” vs „Nie znaleziono kosztorysu ATH/XLS/XLSX w archiwum 7Z”" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.5",
    label: "Przetargi — P2-H.3 obsługa archiwów 7Z",
    items: [
      { type: "new", text: "Rozpakowywanie .7z (7z-wasm LGPL) — inner ATH/PDF/XLSX jak ZIP; dossier, kosztorys, podgląd załączników" },
      { type: "improve", text: "TenderAttachmentsPanel — „Pokaż pliki w 7Z”; JobFilePreviewModal — podgląd plików z archiwum 7Z" },
      { type: "fix", text: "Usunięty fałszywy komunikat „Wykryto wyłącznie archiwum 7Z” gdy kosztorys jest wewnątrz archiwum" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.4",
    label: "Przetargi — P2-G.2D klasyfikacja C.O. (WM/ZZK/MOPS)",
    items: [
      { type: "improve", text: "Klasyfikator ATH — nowa kategoria INSTALACJE_CO (grzejniki, głowice, zawory, spuszczenie/odpowietrzenie układu C.O.)" },
      { type: "improve", text: "Słownik branżowy + reguły fraz — remonty mieszkań komunalnych (centralne ogrzewanie)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.3",
    label: "Przetargi — P2-G.2C klasyfikacja WM/ZZK (wod-kan + gaz + biały montaż)",
    items: [
      { type: "improve", text: "Klasyfikator ATH — rozszerzenie HYDRAULIKA (wod-kan), nowe kategorie INSTALACJE_GAZ i ROBOTY_OGOLNOBUDOWLANE, wyposażenie AGD/kuchnie gazowe" },
      { type: "improve", text: "Słownik branżowy + reguły fraz — pustostany komunalne WM/ZZK/MOPS (rurociągi, WC, gaz, przebicia)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.2",
    label: "Przetargi — P0 hotfix double ZIP unpack (Marketplanet dossier)",
    items: [
      { type: "fix", text: "parseTenderDocumentCandidate — jedno rozpakowanie ZIP (readZipEntry / pickBestFromZipBytes); usunięty double unpack powodujący JSZip „Can't find end of central directory”" },
      { type: "improve", text: "selectDossierCandidates — pomijanie outer ZIP gdy istnieją inner kandydaci tego samego documentIndex" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.1",
    label: "Przetargi — P0 hotfix Marketplanet ZIP analysis wiring",
    items: [
      { type: "fix", text: "Analiza ZIP/dossier/SWZ — przekazywanie sourcePageUrl do pobierania bajtów ezamawiajacy.pl (sesja JSESSIONID)" },
      { type: "fix", text: "JobFilePreviewModal — loadTenderBzpDocumentBytesResolved dla dokumentów BZP z platformy Marketplanet" },
      { type: "fix", text: "Edge document-bytes — guard 502 bez sourcePageUrl + walidacja magic bytes ZIP/PDF" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.55.0",
    label: "Przetargi — P2-H.1 Marketplanet (ezamawiajacy.pl)",
    items: [
      { type: "new", text: "Adapter generic *.ezamawiajacy.pl — sesja JSESSIONID + repository/download (WM, ZZM)" },
      { type: "new", text: "Automatyczne pobieranie SWZ/załączników PDF, DOCX, XLS, ZIP z platformy Marketplanet" },
      { type: "improve", text: "Priorytet ezamawiajacy przed BIP w „Szukaj u zamawiającego” i discover dokumentów" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.54.1",
    label: "Przetargi — P0 OwnerDecision Store Wiring Fix",
    items: [
      { type: "fix", text: "Strategia — naprawa crash przy wejściu (ownerDecisions.store zamiast hooka)" },
      { type: "fix", text: "Kompletność KPI/decyzji — defensywny fallback gdy brak ownerStore.byId" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.54.0",
    label: "Przetargi — UX.2S Strategy Simplification",
    items: [
      { type: "improve", text: "Strategia — centrum decyzji: KPI strip + wymaga decyzji + terminy + jeden feed monitoringu" },
      { type: "improve", text: "Najlepsza okazja — tryb lite domyślnie, pełna analiza po „Pokaż analizę” (UX.1D)" },
      { type: "improve", text: "Analityka (kondycja, finanse, prognoza, co-jeśli, portfel) — domyślnie zwinięta, lazy render" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.7",
    label: "Przetargi — P2-F.6 Offer Completeness Engine",
    items: [
      { type: "new", text: "Workspace Oferta — sekcja „Kompletność oferty” (skrót + rozwinięta checklista)" },
      { type: "new", text: "Status gotowości: gotowa / wymaga uzupełnienia / niekompletna — reuse P2-F.1–F.5" },
      { type: "improve", text: "Checklista krytyczne + dodatkowe: wykaz robót, referencje, profil, warunki, OC, pełnomocnictwo" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.6",
    label: "Przetargi — UX.1D Formal Details Compression",
    items: [
      { type: "improve", text: "Szczegóły formalne — domyślnie skrót (wadium, termin, kryteria, warunki udziału)" },
      { type: "improve", text: "Pełna karta przetargu dopiero po „Pokaż pełne szczegóły formalne” (lazy render)" },
      { type: "improve", text: "Workspace Dokumenty: lista plików przed skrótem formalnym — krótszy pierwszy ekran" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.5",
    label: "Przetargi — UX.1C Tender Documents Prioritization",
    items: [
      { type: "improve", text: "Dokumenty — czytelne nazwy plików (polskie znaki, spacje zamiast podkreśleń)" },
      { type: "improve", text: "Sekcja „Najważniejsze dokumenty” — TOP 5 (SWZ, ATH, formularz, STWIOR, OPZ…)" },
      { type: "improve", text: "Pozostałe dokumenty domyślnie zwinięte — „Pokaż pozostałe dokumenty (X)”" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.4",
    label: "Przetargi — UX.1B Tender Workspace Tabs",
    items: [
      { type: "improve", text: "5 zakładek workspace przetargu: Przegląd · Dokumenty · Kwalifikacja · Wycena · Oferta (lazy render)" },
      { type: "improve", text: "Sticky shell: podsumowanie + tabs — bez scroll-bingu całego przetargu" },
      { type: "improve", text: "Kafelki gotowości przełączają workspace (bez scrollIntoView)" },
      { type: "improve", text: "Przegląd ≤ 1 ekran: skróty wadium/fit/referencje; pełne panele w dedykowanych zakładkach" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.3",
    label: "ARCH-001 — Circular Dependency Prevention (Lessons Learned)",
    items: [
      { type: "improve", text: "ARCHITECTURE § 11.6 ARCH-001 — P0 ARCH RULE, wzorce dozwolone/zakazane, Lessons Learned z incydentu v2.53.1" },
      { type: "improve", text: "scripts/audit-import-cycles.mjs — audyt cykli ESM i naruszeń P0 w src/lib" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.2",
    label: "HOTFIX P0 — biały ekran (cykl importów app-core)",
    items: [
      { type: "fix", text: "P0: naprawiono ReferenceError „Cannot access before initialization” — cykl cloud-sync ↔ tender-cost-calibration przy starcie aplikacji" },
      { type: "fix", text: "tender-cost-calibration: lazy import cloud-sync; session-cache: lokalna stała zdarzenia bootstrap (bez importu cloud-sync)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.1",
    label: "Przetargi — UX.1A Tender Workspace Cleanup (MIN)",
    items: [
      { type: "improve", text: "Sticky Tender Summary — status, termin, wartość, pilne (monitoring) bez scrollowania" },
      { type: "improve", text: "Nowa kolejność sekcji: karta → dokumenty → kwalifikacja → wycena → oferta → formalia → HTML" },
      { type: "improve", text: "Accordion „Kwalifikacja ofertowa” — Warunki udziału + Wykaz robót + Fit (domyślnie otwarty)" },
      { type: "improve", text: "Deduplikacja: jedna edycja „Nasza wycena” (kafelek), kalibracja tylko w sekcji Oferta, ATH primary w Dokumentach" },
      { type: "improve", text: "Banner ⚠ nowe zmiany/Q&A → link do zakładki Strategia (sygnał, bez pełnego monitora per-przetarg)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.53.0",
    label: "Przetargi — centrum wyceny P2-G.3B (Historical Cost Calibration MIN)",
    items: [
      { type: "new", text: "submittedBidPln + submittedAt — zapis faktycznej oferty złożonej (status Złożona/Wygrany/Przegrany)" },
      { type: "new", text: "HistoricalCostSnapshot + kw-tender-calibration — własna baza kalibracji W&G (sync chmura)" },
      { type: "new", text: "📈 Kalibracja historyczna w panelu wyceny — rekomendacja vs złożono vs przyznano" },
      { type: "new", text: "Profil firmy → 🎯 Kalibracja WGDOM — średnie delty + sugestie katalogu (N≥10, read-only)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.9",
    label: "Przetargi — centrum wyceny P2-G.2C (Work Category Refinement)",
    items: [
      { type: "new", text: "Kategorie GLADZIE_TYNKI + WYPOSAZENIE — węższe kubełki kosztowe (≠ szeroki GK)" },
      { type: "improve", text: "Narożniki mb, gładzie, szpachlowanie → GLADZIE_TYNKI; tabliczki opisowe → WYPOSAZENIE" },
      { type: "improve", text: "GK = tylko zabudowa sucha (płyty, profile CD/UD); migracja user dict i katalogu 10→12 kat." },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.8",
    label: "Przetargi — centrum wyceny P2-G.2D (Phrase-Based Classification)",
    items: [
      { type: "new", text: "Reguły fraz roboczych (~60) — narożniki, pomiary, wentylacja, transport (odmiany PL bez stemmera)" },
      { type: "improve", text: "Klasyfikator ATH: katalog → user dict → phrase rules → słownik branżowy" },
      { type: "improve", text: "Inspektor UNKNOWN — „Top nieznane frazy” zamiast pojedynczych tokenów (30x30x2)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.7",
    label: "Przetargi — centrum wyceny P2-G.2B (Cost Category Expansion CORE)",
    items: [
      { type: "new", text: "Kategorie TRANSPORT_UTYLIZACJA + WENTYLACJA — właściwe kubełki kosztowe (gruz, kratki)" },
      { type: "improve", text: "Słownik branżowy — gruz/odpady → transport; pomiary zerowania → ELEKTRYKA" },
      { type: "fix", text: "Anti-double-count — pozycje gruzu w przedmiarze wyłączają tygodniowy wywóz z Kp pobocznych" },
      { type: "improve", text: "Migracja katalogu i user dict — stare profile bez utraty danych (10 kategorii MVP)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.6",
    label: "Przetargi — centrum wyceny P2-G.2A (Assisted Classification)",
    items: [
      { type: "new", text: "Słownik klasyfikacji użytkownika — przypisanie kategorii do pozycji UNKNOWN (uczenie z przetargów)" },
      { type: "new", text: "Profil firmy → 🧠 WGDOM Classification Dictionary — edycja, usuwanie, sync chmura" },
      { type: "improve", text: "Klasyfikator ATH — kolejność: katalog → słownik użytkownika → słownik branżowy" },
      { type: "improve", text: "Pokrycie klasyfikacji z kolorem (cel 97%+) — natychmiastowa reklasyfikacja bez ponownej analizy SWZ" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.5",
    label: "Przetargi — centrum wyceny P2-G.1F (słownik branżowy)",
    items: [
      { type: "new", text: "WGDOM Construction Dictionary — 150+ terminów budowlanych (TBS/WM, KB.pl)" },
      { type: "improve", text: "Klasyfikator ATH — lamperia, cokolik, ościeżnica, parapet, szlichta, odbojnica…" },
      { type: "improve", text: "Inspektor klasyfikacji — coverageDelta przed/po słowniku branżowym" },
      { type: "improve", text: "Pokrycie typowych przedmiarów TBS: ~82% → ~95% (bez zmian kalkulatora)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.4",
    label: "Przetargi — centrum wyceny P2-G.1E (Classification Inspector)",
    items: [
      { type: "new", text: "Inspektor klasyfikacji ATH — sklasyfikowane / UNKNOWN / pokrycie % + region katalogu" },
      { type: "new", text: "Lista pozycji UNKNOWN (sort wg ilości) + sugestie rozbudowy katalogu WGDOM" },
      { type: "improve", text: "Jakość wyceny z pokrycia klasyfikacji: Wysoka / Dobra / Średnia / Ograniczona" },
      { type: "improve", text: "Komunikat przy UNKNOWN >15% — przejrzyj przed złożeniem oferty" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.3",
    label: "Przetargi — centrum wyceny P2-G.1D (UX + discoverability)",
    items: [
      { type: "improve", text: "Kafelek „Nasza wycena” — klik przenosi do szczegółów wyceny (scroll + hint)" },
      { type: "improve", text: "TenderBidProposalPanel — „Skąd pochodzi wycena?”, „Jak powstała wycena?”, breakdown domyślnie rozwinięty" },
      { type: "improve", text: "Profil firmy — 4 sekcje: Cost Intelligence, kwalifikacja, regiony, zaawansowane + opisy pól wyceny" },
      { type: "new", text: "tender-bid-ux.ts — nawigacja, flow wyceny, segmentacja profilu (bez zmian kalkulatora)" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.2",
    label: "Przetargi — centrum wyceny P2-G.1C (UI + katalog chmura)",
    items: [
      { type: "new", text: "Kafelek „Nasza wycena” — koszt wykonania, rekomendowana, minimalna, źródło (Katalog WGDOM / Kosztorys ATH)" },
      { type: "new", text: "TenderBidProposalPanel — badge źródła, podstawa kalkulacji, jakość wyceny, disclaimer" },
      { type: "new", text: "WGDOM Cost Catalog w Profil firmy — edycja stawek, regiony, Przywróć domyślne WGDOM" },
      { type: "new", text: "Chmura kw-wgdom-cost-catalog — sync + merge (DATA_KEYS)" },
      { type: "improve", text: "tender-bid-quality.mjs — test regresji 75+ asercji" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.1",
    label: "Przetargi — wycena z przedmiaru bez cen (P2-G.1B)",
    items: [
      { type: "new", text: "catalogQuantities[] w snapshot ATH (do 250 poz.) — ilości pod wycenę katalogową" },
      { type: "new", text: "computeTenderBidProposal — tryb catalog dla FOUND_NO_VALUE (reuse Kp, marża, oferty)" },
      { type: "improve", text: "Kafelek „Nasza wycena” — koszt wykonania + propozycja gdy przedmiar bez cen" },
      { type: "improve", text: "Test regresji P2-G.1B w test-tender-cost-intelligence.mjs" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.52.0",
    label: "Przetargi — Tender Cost Intelligence silnik (P2-G.1A)",
    items: [
      { type: "new", text: "WGDOM Cost Catalog — 8 kategorii MVP, regiony Wrocław / Dolny Śląsk (lib, seed lokalny)" },
      { type: "new", text: "ATH Classifier — classifyAthLineCategory() z keywords katalogu" },
      { type: "new", text: "Catalog Cost Engine — computeFromCatalogRow(), aggregateCatalogDirectCost()" },
      { type: "improve", text: "Test regresji: scripts/test-tender-cost-intelligence.mjs" },
    ],
  },
  {
    date: "2026-06-13",
    version: "2.51.25",
    label: "Przetargi — fix ATH Quick Access Logintrade (P2-F.4 hotfix)",
    items: [
      { type: "fix", text: "ATH Quick Access — propagacja downloadUrl dla Logintrade ZIP → inner ATH (Otwórz przedmiar / Pobierz PDF)" },
      { type: "fix", text: "Pełny podgląd kosztorysu w dossier — ten sam resolve downloadUrl co załączniki" },
      { type: "improve", text: "[ATH QUICK ACCESS TRACE] — platform, downloadUrlResolved, zipInnerPath" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.24",
    label: "Przetargi — Generator wykazu robót (P2-F.5)",
    items: [
      { type: "new", text: "Automatyczny wykaz robót budowlanych z profilu wykonawcy (selekcja vs wymogi SWZ)" },
      { type: "new", text: "Rekomendowane realizacje w warunkach udziału + panel Generuj PDF / DOCX" },
      { type: "new", text: "tender-works-register + PDF (pdfmake) + DOCX (edycja przed ofertą)" },
      { type: "improve", text: "[WORKS REGISTER TRACE] — requiredProjects, selectedProjects, pdf/docx" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.23",
    label: "Przetargi — Referencje realizacji + ATH Quick Access (P2-F.4)",
    items: [
      { type: "new", text: "referenceFiles / protocolFiles — upload PDF/DOCX przy realizacjach w profilu wykonawcy" },
      { type: "new", text: "Status referencji 🟢/🟡/🔴 + licznik brakujących referencji vs wymóg SWZ" },
      { type: "new", text: "ATH Quick Access — Otwórz przedmiar + Pobierz PDF bez przechodzenia przez ZIP" },
      { type: "improve", text: "[ATH QUICK ACCESS TRACE] — reuse JobFilePreviewModal + downloadKosztorysPdf" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.22",
    label: "Przetargi — Auto-build doświadczenia firmy (P2-F.3)",
    items: [
      { type: "new", text: "Odkryte realizacje — automatyczne wykrywanie z Robót, faktur i kosztorysów ATH" },
      { type: "new", text: "company-experience-discovery — klasyfikacja robót, priorytet wartości, deduplikacja" },
      { type: "improve", text: "referenceStatus (unknown/available/missing) — bez auto-zakładania referencji" },
      { type: "improve", text: "Zatwierdzenie jednym kliknięciem → natychmiastowy wpływ na warunki udziału" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.21",
    label: "Przetargi — Doświadczenie i referencje (P2-F.2)",
    items: [
      { type: "new", text: "experienceProjects[] w profilu wykonawcy — lista realizacji z wartością, rokiem i referencją" },
      { type: "new", text: "tender-experience-requirements + tender-experience-check — MATCH/MISSING/UNKNOWN dla robót podobnych" },
      { type: "improve", text: "Sekcja Doświadczenie w warunkach udziału + [EXPERIENCE TRACE]" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.20",
    label: "Przetargi — Warunki udziału vs profil wykonawcy (P2-F.1)",
    items: [
      { type: "new", text: "Profil wykonawcy (kw-company-profile) — personel, uprawnienia, doświadczenie, OC, finanse, referencje" },
      { type: "new", text: "Sekcja „Warunki udziału w postępowaniu” — MATCH / MISSING / UNKNOWN bez AI score" },
      { type: "improve", text: "Możliwość startu: Spełnione / Wymaga weryfikacji / Braki formalne — twarde porównanie SWZ ↔ profil" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.19",
    label: "Przetargi — Wymagania formalne SWZ (P2-F.0)",
    items: [
      { type: "fix", text: "Sekcja „Wymagania formalne” — koniec losowych fragmentów PDF z regexów uprawnień" },
      { type: "new", text: "Model FormalRequirement (personel, uprawnienia, członkostwo, doświadczenie) + detektory sekcji SWZ" },
      { type: "improve", text: "UI: lista bulletów „Wymagane:” + dopasowanie do profilu firmy; filtr confidence < 0,55 + [FORMAL TRACE]" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.18",
    label: "Przetargi — Cost Status UX + ATH Classification (P2-E.5)",
    items: [
      { type: "fix", text: "FOUND_WITH_VALUE vs FOUND_NO_VALUE — koniec mylącego „Kosztorys znaleziony” przy ATH bez cen (wk=0)" },
      { type: "new", text: "classifyCostDocument() — typ ATH/XLSX/XML/ZIP, priced, rowCount + [COST STATUS TRACE]" },
      { type: "improve", text: "UI: „Przedmiar ATH (N poz.)” + „Nie można automatycznie wyliczyć wyceny” gdy brak cen w pliku" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.17",
    label: "Przetargi — ATH Value Recovery + TenderFit Refresh (P2-E.4)",
    items: [
      { type: "fix", text: "ATH: suma netto z summaryLines + fallback sumy pozycji → totalValue / estimatePln" },
      { type: "fix", text: "Po „Analizuj SWZ” — wymuszone odświeżenie tenderFit (koniec starych komunikatów z KV)" },
      { type: "improve", text: "[COST TRACE] estimate_created z kosztorysu po odzyskaniu wartości ATH" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.16",
    label: "Hotfix — Analizuj SWZ (roleContributesMetadata)",
    items: [
      { type: "fix", text: "Brakujący import roleContributesMetadata w tender-document-resolver — koniec błędu po „Analizuj SWZ”" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.15",
    label: "Przetargi — Tender Data SSOT Cleanup (P2-E.3)",
    items: [
      { type: "fix", text: "Jedno źródło prawdy: wartość, kosztorys, kryteria, wadium — koniec „Nie wykryto” vs „Nie odczytano z SWZ”" },
      { type: "new", text: "resolvedTenderValuePln / resolvedCostStatus / resolvedAwardCriteria + [SSOT TRACE]" },
      { type: "fix", text: "Karta przetargu, Fit, checklist, PDF — spójne komunikaty gdy brak wartości w dokumentach" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.14",
    label: "Przetargi — Cost Snapshot Integration (P2-E.2)",
    items: [
      { type: "fix", text: "ATH ZIP → totalValue z summaryLines; wartość/kosztorys/wycena — spójne komunikaty UI" },
      { type: "new", text: "[COST TRACE] zip_found → snapshot_created → estimate → ui_state" },
      { type: "fix", text: "Koniec sprzeczności „Kosztorys znaleziony” + „Brak pliku kosztorysowego”" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.13",
    label: "Przetargi — ATH ZIP trace + SSOT danych (P2-E.1B)",
    items: [
      { type: "fix", text: "Logintrade ZIP→ATH: faza kosztorysu, trace E2E, downloadUrl bez wymogu platform" },
      { type: "fix", text: "Wadium SSOT — koniec „6%” vs „6 zł”; kryteria tylko z swzAnalysis (bez VAT/Cena 0%)" },
      { type: "improve", text: "ATH z summaryLines akceptowany jako kosztorys; trace value per dokument" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.12",
    label: "Przetargi — Universal Dossier Engine (P2-E.1)",
    items: [
      { type: "new", text: "Wykrywanie kosztorysu ATH/NOR/XML/XLS/ZIP — uniwersalny engine niezależny od platformy" },
      { type: "fix", text: "Logintrade ZIP → inner ATH: propagacja downloadUrl (podgląd + dossier)" },
      { type: "improve", text: "Confidence layer (VAT/fałszywe kryteria); merge SWZ+STWIOR+OPZ; UX skanowania dokumentów" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.11",
    label: "Przetargi — pipeline dossier (P2-E.0)",
    items: [
      { type: "new", text: "„Analizuj SWZ” → pełne dossier: SWZ + STWIOR + przedmiary + ATH/XLS/ZIP (do 15 plików)" },
      { type: "fix", text: "Merge awardCriteria + wartość z STWIOR; komunikat kosztorysu z podsumowaniem skanowania" },
      { type: "improve", text: "7Z — jawny komunikat „wymagane ręczne pobranie”; trace Tender Dossier Analysis" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.10",
    label: "Przetargi — fix ekstrakcji wadium ze SWZ",
    items: [
      { type: "fix", text: "Wadium ze SWZ — procent (6%, 3%, 1,5%) i kwoty tysięcy zł; koniec z „Tak 6” / „6 zł” w toast i dossier" },
      { type: "improve", text: "Test regresji: scripts/test-wadium-extraction.mjs" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.9",
    label: "Przetargi — fix analizy SWZ Logintrade",
    items: [
      { type: "fix", text: "Analiza SWZ z Logintrade — downloadUrl platformy + priorytet modyfikacji SWZ" },
      { type: "fix", text: "Wadium — nie pokazuje „Tak 6” / „6 zł” gdy w SWZ jest procent lub kwota tysięcy" },
      { type: "improve", text: "Trace pipeline SWZ: document_download → pdf_parsed → metadata_extracted → tender_updated" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.8",
    label: "Przetargi — panel Wymaga uwagi (P2-D.3)",
    items: [
      { type: "new", text: "Strategia → „Wymaga uwagi” — agregat terminów ≤3 dni, zmian dokumentów i Q&A (max 10)" },
      { type: "improve", text: "Bez nowych KPI/scoringów — wyłącznie changeMonitor + qaMonitor + deadline" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.7",
    label: "Przetargi — monitoring Q&A (P2-D.2)",
    items: [
      { type: "new", text: "tender-qa-monitor — NEW_QA, QA_UPDATED, QA_BATCH + snapshot Q&A" },
      { type: "new", text: "Strategia → „Nowe pytania i odpowiedzi” z podsumowaniem AI z nazw plików" },
      { type: "improve", text: "Pulpit: kafel „Nowe Q&A” + TenderQaAlert HIGH (<24h lub ≥3 odpowiedzi)" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.6",
    label: "Przetargi — monitoring zmian dokumentacji (P2-D.1)",
    items: [
      { type: "new", text: "Snapshot dokumentów + diff — wykrywanie nowych/zmienionych/usuniętych plików i zmiany terminu" },
      { type: "new", text: "Strategia → „Zmiany w przetargach” z filtrami (dokumenty, termin, Q&A)" },
      { type: "improve", text: "Pulpit skrót przetargów: „Pilne zmiany” + alerty Action Center (TenderChangeAlert)" },
      { type: "improve", text: "Auto-rescan do 3 aktywnych przetargów po odświeżeniu BZP" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.5",
    label: "Przetargi — platform awareness dokumentów (P2-C.2)",
    items: [
      { type: "improve", text: "Zamiast „Brak plików” — komunikat z platformą (Logintrade, e-Zamówienia, platformazakupowa.pl, Open Nexus)" },
      { type: "new", text: "Karta przetargu: „Źródło dokumentów” + CTA „Otwórz postępowanie” dla platformazakupowa.pl" },
      { type: "improve", text: "Telemetria platformDetected / documentsFound / documentsMissingReason (bez PII, localStorage)" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.4",
    label: "Przetargi — off-platform document discovery (P2-A.3)",
    items: [
      { type: "new", text: "Logintrade — auto-wykrywanie załączników getAttachmentUnlogged z ogłoszenia BZP (bez logowania)" },
      { type: "improve", text: "Flow dokumentów: readmodels → mp-client → host detection → adapter platformy → fallback external discover" },
      { type: "improve", text: "Pobieranie bajtów SWZ z platform zewn. — downloadUrl w tenders-bzp-document-bytes" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.3",
    label: "Przetargi — mp-client document discovery (P2-A.2)",
    items: [
      { type: "improve", text: "Skan załączników e-Zamówienia — pełny zakres 1–50 z lukami (SWZ po index gap, np. _10)" },
      { type: "improve", text: "discoverMpClientDocuments — readmodels + próba listy mp-client (GetTenderDocuments)" },
      { type: "improve", text: "Auto „Szukaj u zamawiającego” gdy readmodels zwraca 0 plików po rozwinięciu przetargu" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.2",
    label: "Przetargi — fix pobierania dokumentów e-Zamówienia (P2-A.1)",
    items: [
      { type: "fix", text: "Skan załączników BZP — GET zamiast HEAD na DownloadDocument (405 → dokumenty widoczne w Przetargach)" },
      { type: "improve", text: "Probe metadanych pliku bez pobierania całej treści — anulowanie body po nagłówkach" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.1",
    label: "Przetargi 3.0 — cleanup nazewnictwa (ETAP 4)",
    items: [
      { type: "improve", text: "Rename techniczny — folder src/app/tenders/strategy/, lib tenders-strategy-* (ex tender-center-*)" },
      { type: "improve", text: "TendersStrategyHero, TendersStrategyForecastStrip — spójne nazwy komponentów strategii" },
      { type: "improve", text: "Dokumentacja — Command Center removed in v2.51.0; archiwalne handoffy oznaczone SUPERSEDED" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.51.0",
    label: "Przetargi 3.0 — usunięcie Command Center z runtime",
    items: [
      { type: "improve", text: "ETAP 3 migracji — TendersProvider zastępuje CommandCenterProvider; moduł Przetargi (5 zakładek) jedynym wejściem strategicznym" },
      { type: "improve", text: "Pulpit — skrót Przetargi (pilne terminy, wygrane bez roboty, wymagające decyzji) z CTA Przetargi → Strategia" },
      { type: "improve", text: "Usunięto legacy: TenderCenterProView, OwnerDashboard, CommandCenterContext, CommandCenterExecutivePanel" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.50.76",
    label: "Przetargi 3.0 — moduł z zakładkami",
    items: [
      { type: "new", text: "Przetargi 3.0 — pięć zakładek: Lista, Strategia, Mapa, Profil firmy, Ustawienia" },
      { type: "improve", text: "Strategia — najlepsza okazja, GO/HOLD/NO-GO, kondycja, prognoza 90d, zdolność finansowa, What If, portfel decyzji, priorytety i KPI rynku" },
      { type: "improve", text: "TendersProvider — pipeline, decyzje właściciela i snapshot strategiczny (ETAP 2 migracji CC → Przetargi)" },
    ],
  },
  {
    date: "2026-06-12",
    version: "2.50.75",
    label: "Przetargi — ETAP 1 likwidacji Command Center",
    items: [
      { type: "improve", text: "Przetargi → Analiza przetargów — usunięto Morning Briefing, AI Insights, Learning, Owner Profile, Explainability, onboarding i branding COMMAND CENTER AI" },
      { type: "improve", text: "Decyzja STARTUJ/ANALIZUJ/ODPUŚĆ — zapis bezpośredni bez dialogu powodu; zachowano prognozę 90d, zdolność finansową, health, pipeline BZP i portfel decyzji" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.74",
    label: "Dashboard V3 — operacje bez Hero",
    items: [
      { type: "improve", text: "Pulpit V3 — usunięto „Najważniejsze dziś”; operacje w sekcjach „Braki dokumentów” i „Pilne uwagi na dziś” (kategorie)" },
      { type: "improve", text: "KPI — „Braki dokumentów” i „Pilne uwagi” zamiast „Do ogarnięcia”; liczniki = suma widocznych pozycji" },
      { type: "improve", text: "Do odzyskania — w Pilnych uwagach (pełna lista alertów); osobna karta usunięta" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.73",
    label: "Hero — wyłącznie alerty operacyjne",
    items: [
      { type: "improve", text: "Pulpit → „Najważniejsze dziś” — tylko WM, roboty, dokumenty, płace, inspektor i bieżące operacje; strategia (przetargi, prognoza, health) pozostaje w Command Center" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.72",
    label: "Hero — prognoza obciążenia tylko w Command Center",
    items: [
      { type: "improve", text: "Pulpit → „Najważniejsze dziś” — bez alertów prognozy obciążenia 30/60 dni; szczegóły i sloty pozostają w Przetargi → Command Center" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.71",
    label: "Uwaga dziś — sort braków dokumentów",
    items: [
      { type: "improve", text: "Pulpit → „Uwaga dziś” → Braki dokumentów — lista sortuje roboty najbliższe domknięcia (najmniej braków na górze); stale ≥7 dni nadal pierwsze" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.70",
    label: "Default Inspector Recipient (2.1.1)",
    items: [
      { type: "new", text: "Kontakty — „Domyślny odbiorca inspektora” (badge Inspektor + Domyślny); tylko jeden aktywny na raz" },
      { type: "improve", text: "„Kontakt z inspektorem” — modal startuje z domyślnym odbiorcą (Szymon lub oznaczony kontakt); „Zmień odbiorcę” dla wysyłki testowej" },
      { type: "improve", text: "Przy wysyłce testowej do innego inspektora — podpowiedź „Wysyłka testowa”; powitanie w treści aktualizuje się po zmianie odbiorcy" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.69",
    label: "Inspector Communication Templates (2.1.0)",
    items: [
      { type: "new", text: "Roboty — „Kontakt z inspektorem” w szczegółach roboty: szablony A–D, auto-sugestia, wysyłka emailem (Resend)" },
      { type: "new", text: "Kontakty — flaga „Inspektor WM” (domyślny odbiorca wiadomości z roboty)" },
      { type: "improve", text: "Szablony pokazują „Po naszej stronie dostępne” (zdjęcia, plan, dokumentacja) oraz „Brakuje” (zlecenie/kosztorys)" },
      { type: "improve", text: "Historia roboty — wpis email_sent z nazwą szablonu po wysłaniu do inspektora" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.68",
    label: "Dashboard IA Cleanup (20.7E)",
    items: [
      { type: "improve", text: "Pulpit — „Najważniejsze dziś” jako osobna sekcja (cross-modułowe priorytety, nie w „Przetargi — skrót”)" },
      { type: "improve", text: "„Najważniejsze dziś” — neutralna karta, ton dnia jako badge; accordion compact bez zmian rankera" },
      { type: "improve", text: "„Uwaga dziś” — compact accordion (domyślnie zwinięta), skrót „Braki dokumentów: N” w nagłówku" },
      { type: "improve", text: "Kolejność Pulpicu: KPI → Najważniejsze → Uwaga → Do odzyskania → Przetargi — skrót" },
      { type: "improve", text: "„Przetargi — skrót” — tylko liczniki CC + CTA Command Center (bez priorytetów dnia)" },
      { type: "improve", text: "KPI „Do ogarnięcia” — wskazówka „priorytety i szczegóły poniżej”" },
    ],
  },
  {
    date: "2026-06-11",
    version: "2.50.67",
    label: "Hero Compression (20.7D.1)",
    items: [
      { type: "improve", text: "Pulpit — KPI jako pierwszy blok operacyjny (Hero nie dominuje nad foldem)" },
      { type: "improve", text: "Hero DZIŚ — wariant compact accordion (domyślnie zwinięty, Pokaż priorytety, TOP 5 po rozwinięciu)" },
      { type: "improve", text: "Przetargi — skrót — Hero compact wbudowany przed CTA Command Center" },
      { type: "improve", text: "Admin bez Przetargów — standalone Hero compact między Do odzyskania a Uwaga dziś" },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.66",
    label: "Dashboard V2 Complete (20.7C.2)",
    items: [
      { type: "new", text: "Pulpit — Hero DZIŚ: TOP 5 priorytetów dnia nad KPI (unified ranking z operacyjnych alertów i Action Center)" },
      { type: "new", text: "Hero dedupe engine — sekcje Uwaga dziś nie duplikują TOP 5 Hero; braki dokumentów pozostają z inline toggle" },
      { type: "new", text: "E2E — dashboard-hero.spec.ts (Hero nad KPI, max 5, dedupe WM, mobile scroll, empty state)" },
      { type: "improve", text: "Action Center i forecast — prezentacja obłożenia jako sloty (np. 13 / 4 slotów) zamiast % utilization" },
      { type: "improve", text: "Konsolidacja priorytetów na Pulpicie — Hero jako główne źródło działań" },
      { type: "improve", text: "Przetargi — skrót: usunięta lista „Najważniejsze akcje”; pozostają Pilne terminy, Wygrane bez roboty, CTA Command Center" },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.65",
    label: "Mobile Jobs List Width Fix (20.5Z.5C)",
    items: [
      {
        type: "fix",
        text: "Roboty (mobile) — lista zajmuje pełną szerokość ekranu przy braku wybranej roboty; usunięto pustą kolumnę szczegółów (~65% viewportu)",
      },
      {
        type: "fix",
        text: "Poprawiona czytelność adresów robót na telefonach (<640px); split desktop/tablet 35/65 bez zmian",
      },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.64",
    label: "Dashboard Handover Alert (20.5Z.5B)",
    items: [
      {
        type: "improve",
        text: "Pulpit — sekcja „Uwaga dziś”: alert „Roboty do odbioru” (faza Jobs 2.0) z listą adresów i klientów; klik otwiera robotę w module Roboty",
      },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.63",
    label: "Admin Navigation Jobs Badge Alignment (20.5Z.5A)",
    items: [
      {
        type: "improve",
        text: "Menu Roboty — badge liczy fazy operacyjne Jobs 2.0 (W toku + Do odbioru) zamiast legacy licznika zdjęć oczekujących na akceptację",
      },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.62",
    label: "JobAllFilesView Full Hub Alignment (20.5A.12B.1-full)",
    items: [
      { type: "improve", text: "Roboty → Pliki wg adresów — pełna zgodność z Files Hub: dokumenty kontraktowe, dokumentacja robót (PDF) i załączniki ogólne per kafel adresu" },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.61",
    label: "Worker Report PDF Export (20.5A.12C)",
    items: [
      { type: "new", text: "Dokumentacja robót — eksport pojedynczego wpisu do PDF (zakres, wymiary, obrys, notatki); Roboty → Dokumentacja i Pliki → Files Hub" },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.60",
    label: "Cross-tab Update Banner Sync (20.5B.7D)",
    items: [
      { type: "improve", text: "Version Awareness — wykryta nowa wersja w jednej karcie natychmiast pokazuje banner we wszystkich otwartych kartach (localStorage + storage event)" },
    ],
  },
  {
    date: "2026-06-10",
    version: "2.50.59",
    label: "Hotfix SMS Pilne (P0)",
    items: [
      { type: "fix", text: "SMS pilne — naprawa crasha modala po refaktorze widoczności ról (20.5A.7); przywrócono etykietę nadawcy przez visibleSenderRoleLabel()" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.58",
    label: "Files Hub Consolidation (20.5A.12)",
    items: [
      { type: "new", text: "Pliki roboty — Files Hub: kontrakt, dokumentacja ekipy, załączniki ogólne i checklista odbiorowa w jednym widoku" },
      { type: "improve", text: "Zdjęcia i pliki → Pliki — pełny podgląd read-only; upload tylko w Robotach → Pliki" },
      { type: "improve", text: "Ujednolicone liczniki Pliki (jobFiles + workerReports + jobAttachments); ZIP pozostają osobno" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.57",
    label: "Worker Mobile UX (20.5B.6A.4)",
    items: [
      { type: "new", text: "Tryb pracownika — pasek postępu dokumentacji (Zdjęcia → Dokumentacja → Wymiary → Obrys) wyliczany z zapisanych danych" },
      { type: "improve", text: "Baner edukacyjny i CTA prowadzące do kolejnego kroku; klikalne kroki scrollują do sekcji" },
      { type: "improve", text: "Formularz dokumentacji na telefonie — większe pola, chipy pomieszczeń min. 44px (layout worker; admin bez zmian)" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.56",
    label: "Version Awareness & Update Banner (20.5B.7)",
    items: [
      { type: "new", text: "Wykrywanie nowej wersji po deployu — porównanie APP_VERSION z /version.json (polling + focus)" },
      { type: "new", text: "Globalny banner „Dostępna nowa wersja WGDOM” z przyciskiem „Odśwież teraz” (bez auto-reload)" },
      { type: "improve", text: "Build generuje version.json; instrukcja HelpView — FAQ o komunikacie aktualizacji" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.55",
    label: "Dokumentacja Robót — Naming Refresh (20.5B.6A.1)",
    items: [
      { type: "improve", text: "Roboty — zakładka „Dokumentacja” zamiast „Raporty”; ujednolicone nazewnictwo u admina, pracownika i inspektora" },
      { type: "improve", text: "Hint: obrys/wymiary to materiał pod plan techniczny — nie plan PDF; help przy checklistie „Rysunek/Plan”" },
      { type: "improve", text: "Pulpit — alert „Nowa dokumentacja od ekipy”; instrukcja HelpView z sekcją dokumentacja vs plan" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.54",
    label: "Roboty UX Pack (20.5B.5)",
    items: [
      { type: "improve", text: "Roboty — domyślny filtr „W trakcie”; kolejność faz: W trakcie → Do odbioru → Zdane → Wszystkie" },
      { type: "improve", text: "Typ lokalu — etykieta Socjalny (klucz komunalny bez migracji danych)" },
      { type: "new", text: "Roboty — pole opcjonalne „Piec gazowy” (Zostaje / Wymiana / Brak) obok kuchenki; sync w chmurze" },
      { type: "improve", text: "Plan techniczny PDF = dokument odbiorowy „Rysunek/Plan” — doprecyzowanie w instrukcji (bez zmian logiki 20.5A.9)" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.53",
    label: "Dashboard WM Cleanup (20.5B.4)",
    items: [
      { type: "improve", text: "Pulpit — usunięto osadzone Portfolio WM; krótszy, bardziej operacyjny widok" },
      { type: "improve", text: "KPI „Aktywne WM” pozostaje; alerty WM i skróty kierują do Roboty" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.52",
    label: "Załączniki ogólne roboty (20.5A.10)",
    items: [
      { type: "new", text: "Roboty → Pliki — sekcja „Załączniki ogólne”: PDF, DOC/DOCX, XLS/XLSX, ZIP, RAR, DWG, TXT (max 25 MB); osobno od dokumentów kontraktowych" },
      { type: "new", text: "Email plików — grupy: Dokumenty kontraktowe (domyślnie) i Załączniki ogólne; historia wysyłki (+ N załączników)" },
      { type: "new", text: "Załączniki ZIP — osobny download obok Dokumenty ZIP (folder zalaczniki/)" },
      { type: "improve", text: "Sync chmura — jobAttachments[] + tombstone merge (wzorzec 20.5B.3); delete nie wraca po sync" },
      { type: "improve", text: "Podgląd załączników ogólnych: PDF, DOCX, XLSX; DWG/ZIP/RAR — pobierz plik" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.51",
    label: "Spójność plików roboty — tombstone + feed (20.5B.3)",
    items: [
      { type: "fix", text: "Pliki roboty — tombstone usuniętych/zastąpionych plików; merge sync nie przywraca pliku po delete" },
      { type: "fix", text: "Feed inspektora / Pulpit — ukrywanie orphan upload gdy pliku nie ma lub został zastąpiony/usunięty" },
      { type: "improve", text: "Replace pliku (zlecenie/kosztorys/plan) — best-effort cleanup starego pliku ze storage po udanym uploadzie" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.50",
    label: "Hotfix usuwanie plików w Robotach (P0)",
    items: [
      { type: "fix", text: "Roboty → Pliki — naprawiono usuwanie zlecenia, kosztorysu i planu technicznego (brak importu resolveJobFileStoragePath)" },
      { type: "fix", text: "Usuwanie pliku — toast przy błędzie zamiast cichego przerwania flow" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.49",
    label: "Hotfix — ikona planu technicznego w katalogu plików (P0)",
    items: [
      { type: "fix", text: "Roboty → Pliki — naprawiono crash (React #130) po wgraniu planu technicznego PDF: brakująca ikona w CATEGORY_ICONS" },
      { type: "fix", text: "Katalog plików — fallback FileText gdy typ pliku nieznany (JobFileCatalogRow, CompactFileRow)" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.48",
    label: "Inspektor admin — monitoring + deep linki do Roboty (20.5B.2)",
    items: [
      { type: "improve", text: "Zakładka Inspektor (admin) — tylko feed aktywności, nieprzeczytane, KPI i statystyki logowań; akcje operacyjne w Robotach" },
      { type: "improve", text: "Feed inspektora — „Otwórz w Robotach” z automatyczną sekcją (Dokumenty, Pliki, Zdjęcia, Przegląd/billing)" },
      { type: "new", text: "Filtry feedu: Propozycje billing · Uwagi billing · KPI propozycji" },
      { type: "improve", text: "Roboty → Pliki — wysyłka plików inspektora emailem (send-job-files-email), podgląd i usuwanie" },
      { type: "improve", text: "Portfolio WM przeniesione na Pulpit; usunięto duplikat karty roboty w Inspektorze admin" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.47",
    label: "Plan techniczny PDF — workflow rysunku (20.5A.9)",
    items: [
      { type: "new", text: "Roboty → Pliki roboty — „Dodaj plan techniczny” (PDF): osobny typ pliku obok zlecenia i kosztorysu; auto-zaznacza „Rysunek/Plan” w dokumentach do odbioru" },
      { type: "improve", text: "Szkic terenowy (JPG z raportu ekipy) i plan techniczny PDF — rozdzielone semantycznie; koniec workaroundu wrzucania planu jako Zlecenie" },
      { type: "improve", text: "Inspektor — podgląd i pobranie planu technicznego (upload tylko administrator w Robotach); plan w Plikach i Dokumenty ZIP, nie w Zdjęciach" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.46",
    label: "Media Library UX — separacja zdjęć i plików (20.5A.8)",
    items: [
      { type: "fix", text: "Zakładka Pliki — tylko dokumenty (zlecenie, kosztorys); zdjęcia ekipy, inspektora i rysunki raportów tylko w Zdjęciach" },
      { type: "improve", text: "Zdjęcia i pliki — liczniki w tabach: Zdjęcia (X) · Pliki (Y); osobne ZIP: Zdjęcia ZIP i Dokumenty ZIP" },
      { type: "improve", text: "Galeria admin — zdjęcia inspektora i rysunki z raportów obok zdjęć ekipy" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.45",
    label: "Widoczność ról użytkowników — hardening (20.5A.7)",
    items: [
      { type: "improve", text: "Administrator i moderator widzą przy autorach treści wyłącznie etykietę Inspektor — bez ujawniania Super Admin / Administrator / Moderator" },
      { type: "improve", text: "Inspektor — brak etykiet ról administracyjnych w notatkach WM, billing, feedzie i historii" },
      { type: "improve", text: "Super Admin — pełna widoczność ról (w tym w SMS i topbarze); ustawienia ⚙ bez zmian" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.44",
    label: "Zgłoszenie pozycji Do rozliczenia — inspektor (20.5A.6)",
    items: [
      { type: "new", text: "Inspektor — „Zgłoś pozycję” gdy na robocie nie ma jeszcze pozycji billing; opis, kwota i dowody (zdjęcia/PDF)" },
      { type: "new", text: "Administrator — sekcja Zgłoszenia inspektora: zatwierdź (tworzy pozycję) lub odrzuć z powodem" },
      { type: "improve", text: "Propozycje w JobNote (context billing_proposal) — sync kw-jobs; pozycja powstaje dopiero po zatwierdzeniu admina (kw-recoverable-charges)" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.43",
    label: "Polonizacja COMMAND CENTER — pełny pakiet (20.3B+)",
    items: [
      { type: "improve", text: "COMMAND CENTER AI — polskie etykiety metryk (Indeks kondycji, Wynik okazji, Zdolność finansowa)" },
      { type: "improve", text: "Przetargi CC — Wnioski AI, Wyjaśnienia scoringu, Lejek ofert, Historia decyzji po polsku" },
      { type: "improve", text: "Decyzje w UI: Startuj / Analizuj / Odpuszczaj (enum GO/HOLD/NO-GO bez zmian w danych)" },
      { type: "improve", text: "Marka COMMAND CENTER AI zachowana — smoke 20.3B+ FULL" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.42",
    label: "Billing Evidence Pack (20.5A.5)",
    items: [
      { type: "new", text: "Inspektor — do uwagi billing można dodać do 3 zdjęć i 1 PDF (max 8 MB) jako dowód rozliczeniowy" },
      { type: "new", text: "Admin — podgląd załączników w wątku pozycji (zdjęcie / PDF inline, bez pobierania)" },
      { type: "improve", text: "Dowody zapisane w JobNote.attachments — sync kw-jobs bez zmian kwot ani uprawnień billing" },
    ],
  },
  {
    date: "2026-06-09",
    version: "2.50.41",
    label: "Roboty — badge Aktywni dziś",
    items: [
      { type: "improve", text: "Karta listy — badge „Aktywni dziś: N” z wpisów czasu na dziś zamiast mylącego „Ekipa: N” (plan kontraktu)" },
      { type: "improve", text: "Badge widoczny tylko gdy N > 0; KPI „Bez ekipy” i kolejki MID-B bez zmian (plan executionAssigneeDirectoryIds)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.50.40",
    label: "Roboty — UX Pack (desktop workspace)",
    items: [
      { type: "improve", text: "Split lista/szczegóły 35/65 na desktopie — szerszy panel roboty (~+120px treści)" },
      { type: "improve", text: "Szczegóły roboty — pełna szerokość kolumny (md:max-w-none); mobile bez zmian" },
      { type: "improve", text: "Toolbar desktop — niższy KPI, Lista/Szukaj/Filtry w jednym wierszu; mobile 44px bez zmian" },
      { type: "improve", text: "Kompaktowy detail header, zakładki sekcji i wybór fazy (md+)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.50.30",
    label: "Roboty — status nowej roboty + toolbar desktop",
    items: [
      { type: "fix", text: "Nowa robota — status „W trakcie” zamiast błędnego „Do odbioru — braki” (etap awaiting_order nie mapuje już do fazy odbioru)" },
      { type: "improve", text: "Roboty desktop — kompaktowy toolbar KPI/filtry (md+); mobile bez zmian (44px touch)" },
      { type: "improve", text: "Szczegóły roboty — szerszy panel treści na desktopie (max-w-4xl)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.50.20",
    label: "Desktop Layout Fix — jeden scroll w panelu admina",
    items: [
      { type: "fix", text: "Laptop/desktop (≥768px) — wyłączono scroll dokumentu; przewijanie tylko wewnątrz widoków (Pulpit, Roboty, Lista płac…)" },
      { type: "fix", text: "Flex layout — min-w-0 w routerze widoków, Pulpicie i Mediach (mniej poziomego overflow)" },
      { type: "improve", text: "Smoke desktop-layout-2.50.20 — 1366×768, 1280×720, Pulpit/Roboty/Payroll" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.50.10",
    label: "Mobile Fix Pack — ergonomia Roboty na telefonach",
    items: [
      { type: "improve", text: "Roboty — kompaktowy toolbar na telefonie (mniejsze odstępy KPI, więcej miejsca na listę)" },
      { type: "improve", text: "Lista / Kolejki — większe przyciski (44px): przełącznik widoku, fazy i Filtry dodatkowe" },
      { type: "improve", text: "Kolejki — usunięto sticky nagłówków sekcji (czytelniejszy scroll)" },
      { type: "improve", text: "Smoke mobile-fix-pack-2.50.1 — T1–T10 (toolbar, touch, kolejki, billing 💰, MID-B)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.50.00",
    label: "Roboty 2.0 MID-B — kolejki operacyjne i filtr lidera",
    items: [
      { type: "new", text: "Lista robót — przełącznik Lista / Kolejki: sześć sekcji pilnych spraw (WM po terminie, BZP wymaga startu, Bez ekipy, Do odbioru — braki, Gotowe do zdania, Dokumenty >7 dni)" },
      { type: "improve", text: "Filtry ▼ — Lider realizacji (wszyscy / bez lidera / konkretna osoba z kartoteki); na karcie widać imię lidera" },
      { type: "improve", text: "Badge statusu — rozróżnienie „Do odbioru — braki” i „Gotowe do zdania” (fazy i KPI bez zmian)" },
      { type: "improve", text: "Smoke jobs-2.0-midb — T1–T10 (kolejki, filtr lidera, search, KPI, billing 💰)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.49.90",
    label: "Polonizacja UI — Pulpit i przetargi (Sprint 20.3B MIN)",
    items: [
      { type: "improve", text: "Pulpit — Centrum działań, Indeks kondycji, priorytety po polsku (Krytyczne/Wysokie)" },
      { type: "improve", text: "Przetargi — przyciski decyzji Startuj / Analizuj / Odpuszczaj zamiast GO/HOLD/NO-GO" },
      { type: "improve", text: "Inspektor — zakładka Portfolio WM; moduł Do rozliczenia — etykieta Administrator" },
      { type: "improve", text: "Smoke 20.3b — polonizacja UI (T1–T8)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.49.80",
    label: "Inspektor — uwagi do pozycji Do rozliczenia (Sprint 20.5A.4)",
    items: [
      { type: "new", text: "Inspektor — „Zgłoś uwagę” przy pozycji billing (bez zmiany kwot); wątek z administratorem" },
      { type: "new", text: "Admin — odpowiedź w karcie Do rozliczenia na robocie; podgląd w module i na Pulpicie" },
      { type: "improve", text: "Notatki WM oddzielone od uwag billing (jobNotes + recoverableChargeId)" },
      { type: "improve", text: "Smoke 20.5a4 — billing notes (T1–T10)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.49.70",
    label: "Inspektor — podgląd Do rozliczenia na robocie (Sprint 20.5A.3A)",
    items: [
      { type: "new", text: "Panel inspektora — sekcja WM: pozycje do rozliczenia z kwotami, KPI i historią rozliczeń (read-only)" },
      { type: "new", text: "Lista robót inspektora — badge 💰 przy nierozliczonych pozycjach (z tooltipem PLN)" },
      { type: "improve", text: "Sync read-only kw-recoverable-charges w InspectorPanel — bez zapisu do chmury billing" },
      { type: "improve", text: "Smoke 20.5a3a — inspektor billing review (T1–T8)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.49.60",
    label: "Lista płac — closed week przy zablokowanym rolloverze (Sprint 20.1D)",
    items: [
      { type: "fix", text: "Nd ≥20:00 z nierozliczoną kasą sobotnią — tydzień pozostaje operacyjny (nie „historyczny”)" },
      { type: "fix", text: "Przeniesienie wypłaty (⏭) i edycja listy działają do czasu faktycznego rolloveru" },
      { type: "fix", text: "Zapisany tydzień — backup odświeża się przy zmianach także gdy zegar już wskazuje kolejny tydzień" },
      { type: "improve", text: "isPayrollWeekClosedForUi — wyjątek przy hasPayrollRolloverBlockers; smoke 20.1d (T1–T6)" },
    ],
  },
  {
    date: "2026-06-08",
    version: "2.49.50",
    label: "Roboty — naprawa wgrywania zdjęć (admin)",
    items: [
      { type: "fix", text: "Admin → Roboty → Zdjęcia — „Dodaj zdjęcia” działa ponownie (brakujący import prepareWatermarkedPhoto od v2.45.17)" },
      { type: "fix", text: "Wszystkie kategorie: Przed remontem, Po remoncie, W trakcie" },
      { type: "improve", text: "Błąd uploadu — toast zamiast cichej awarii" },
    ],
  },
  {
    date: "2026-06-07",
    version: "2.49.40",
    label: "Pulpit — alerty listy płac (Sprint 20.1C.2)",
    items: [
      { type: "fix", text: "„Uwaga dziś” i baner sobotni — liczą tylko kasę sobotnią blokującą rollover (nie cały status Oczekuje)" },
      { type: "fix", text: "PRZENIESIONO, wypłata co 2 tyg. (narastająca) i urlop nie generują już fałszywych alarmów na pulpicie" },
      { type: "improve", text: "Ta sama reguła co auto-rollover 20.1C — listPayrollRolloverBlockers / blocksPayrollRollover" },
      { type: "improve", text: "Smoke: smoke-test-payroll-dashboard-20.1c2.mjs (T1–T5)" },
    ],
  },
  {
    date: "2026-06-07",
    version: "2.49.30",
    label: "Sync rollover listy płac — izolacja tygodnia (Sprint 20.1C.1)",
    items: [
      { type: "fix", text: "F5 po rolloverze nie przywraca godzin poprzedniego tygodnia — bootstrap nie adoptuje bogatszej chmury z innym weekFrom/weekTo" },
      { type: "fix", text: "Rollover — natychmiastowy push do KV (weekFrom, weekTo, pusty skład, archiwum) z pominięciem Payroll Guard" },
      { type: "fix", text: "„Odśwież skład ludzi” — zapis nowego składu do KV mimo shrink guarda (świadoma akcja użytkownika)" },
      { type: "improve", text: "Smoke: smoke-test-payroll-rollover-sync-20.1c1.mjs + integracja STALE_KV" },
    ],
  },
  {
    date: "2026-06-07",
    version: "2.49.20",
    label: "Rollover listy płac — kasa sobotnia (Sprint 20.1C)",
    items: [
      { type: "fix", text: "Auto-przejście tygodnia płac (Nd ≥20:00) — blokuje tylko nierozliczoną kasę w sobotę, nie cały status Oczekuje" },
      { type: "fix", text: "⏭ PRZENIESIONO i wypłata co 2 tyg. (tydzień narastający) nie blokują już rolloveru" },
      { type: "improve", text: "„Bieżący tydzień” i auto-archiwum niedzielne — ta sama reguła co auto-rollover (payroll-rollover.ts)" },
      { type: "improve", text: "Bez zmian: MODEL A carry, archiwum, cash split, sync KV" },
    ],
  },
  {
    date: "2026-06-07",
    version: "2.49.10",
    label: "Tworzenie pozycji z roboty (Sprint 20.5A.2)",
    items: [
      { type: "new", text: "➕ Dodaj do rozliczenia — modal na karcie roboty bez opuszczania kontekstu (tytuł, kwota, opis)" },
      { type: "new", text: "buildRecoverableChargeDraftFromJob() — preset sourceType/job, klient, inspektor z lidera ekipy" },
      { type: "new", text: "pendingRecoverableChargeCreatePreset — deep link do modułu z auto-otwarciem formularza (consumed once)" },
      { type: "improve", text: "Karta Do rozliczenia widoczna zawsze; KPI odświeża się po zapisie na robocie" },
      { type: "improve", text: "Bez zmian KV/sync/merge — finalizeRecoverableChargeDraftForSave współdzielony z modułem" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.49.00",
    label: "Roboty ↔ Do rozliczenia (Sprint 20.5A.1)",
    items: [
      { type: "new", text: "getRecoverableChargesForJob / getRecoverableChargesRecoveredOnJob / getRecoverableChargeJobStats — agregacja po sourceJobId i targetJobId" },
      { type: "new", text: "Lista robót — badge 💰 (nierozliczone pozycje) z tooltipem kwoty do odzyskania" },
      { type: "new", text: "Przegląd roboty — karta Do rozliczenia: KPI, max 5 pozycji źródłowych, rozliczenia na tej robocie" },
      { type: "improve", text: "Deep link z roboty → moduł Do rozliczenia z zaznaczoną pozycją (pendingRecoverableChargeId)" },
      { type: "improve", text: "Read-only — bez tworzenia pozycji z roboty, bez zmian KV/sync/merge/dashboard KPI" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.48.30",
    label: "Top listy i KPI czasowe (Sprint 20.4C.2C)",
    items: [
      { type: "new", text: "computeRecoverableChargesTimeStats() — odzysk w miesiącu/roku, średni czas zamknięcia, liczba settled" },
      { type: "new", text: "computeRecoverableChargesTopLists() — TOP 5: największe / najstarsze / odzyskane pozycje" },
      { type: "new", text: "Moduł — sekcja Statystyki odzyskiwania (KPI + 3 rankingi kartowe); Pulpit — link do analizy" },
      { type: "improve", text: "Legacy migration wykluczone z KPI czasu i listy odzyskanych; bez nowych zakładek i route" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.48.20",
    label: "Alerty odzyskiwania (Sprint 20.4C.2B)",
    items: [
      { type: "new", text: "computeRecoverableChargesAlerts() — kwota ≥ 2 000 PLN, wiek > 90 dni, partial > 60 dni, brak aktywności > 60 dni" },
      { type: "new", text: "Pulpit — Wymaga uwagi (max 3 pozycje); moduł — pełna lista z filtrami typu alertu" },
      { type: "improve", text: "attentionCount +1 na Pulpicie gdy billing wymaga uwagi (jedna kategoria, nie +N)" },
      { type: "improve", text: "Próg alarmu wieku na karcie: > 90 dni (zgodnie z audytem 20.4C.2)" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.48.10",
    label: "Aging odzyskiwania (Sprint 20.4C.2A)",
    items: [
      { type: "new", text: "computeRecoverableChargesReportingStats() — kubełki wieku 0–30 / 31–60 / 61–90 / 90+ dni (tylko open i partial)" },
      { type: "new", text: "Pulpit — skrót aging na karcie Do odzyskania; moduł — sekcja Analiza odzyskiwania (pozycje + PLN)" },
      { type: "improve", text: "Suma kubełków aging = kwota Do odzyskania — weryfikacja w smoke 20.4C.2A" },
      { type: "improve", text: "Bez alertów, top list i zmian modelu — 20.4C.2B/2C w kolejnych sprintach" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.48.00",
    label: "Pulpit — karta Do odzyskania (Sprint 20.4C.1)",
    items: [
      { type: "new", text: "Pulpit — karta 💰 Do odzyskania: 4 KPI (kwota, pozycje, częściowo, odzyskano) + najstarsza pozycja" },
      { type: "improve", text: "Klik w kartę otwiera moduł Do rozliczenia; stan pusty i alarmowy (> 30 dni lub ≥ 2 000 PLN)" },
      { type: "improve", text: "Bez aging, eksportów i Command Center — kolejne kroki w 20.4C.2/20.4C.3" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.47.10",
    label: "Do rozliczenia — workflow rozliczeń (Sprint 20.4B)",
    items: [
      { type: "new", text: "Rozlicz — modal częściowego i pełnego rozliczenia (kwota, robota docelowa, typ, notatka, informacja od inspektora)" },
      { type: "new", text: "Historia rozliczeń w panelu szczegółów — kto, kiedy, kwota, robota docelowa (lub Robota archiwalna)" },
      { type: "improve", text: "Status wyłącznie wyliczany z ledgeru — usunięty ręczny wybór statusu w formularzu" },
      { type: "improve", text: "KPI modułu: Do rozliczenia / Rozliczone częściowo / Odzyskano (PLN); badge menu: open + partial" },
      { type: "improve", text: "Lista i szczegóły — kwota pierwotna, rozliczono, pozostało bez otwierania historii" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.47.00",
    label: "Do rozliczenia — Settlement Foundation (Sprint 20.4A)",
    items: [
      { type: "new", text: "Ledger rozliczeń — RecoverableChargeSettlement, settlements[], amountSettled, amountRemaining (model pod częściowe i pełne rozliczenie)" },
      { type: "improve", text: "deriveChargeAmounts / applySettlement / validateSettlementDraft — status wyliczany z ledgeru, blokada kwoty > pozostało" },
      { type: "improve", text: "Sync — mergeSettlementsById (union po id), derive po merge; migracja legacy settled/partial przy normalize" },
      { type: "improve", text: "Bez zmian UI — workflow Rozlicz, historia i KPI w Sprint 20.4B" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.46.01",
    label: "Polonizacja UI — rozliczenia, inspektor, media (Sprint 20.3B MIN)",
    items: [
      { type: "improve", text: "Do rozliczenia — statusy po polsku (Do rozliczenia / Rozliczone częściowo / Rozliczone), mini-KPI bez OPEN" },
      { type: "improve", text: "Inspektor — Centrum działań, filtr Od administratora, komunikaty pomocnicze po polsku" },
      { type: "improve", text: "Menu Zdjęcia i pliki (wcześniej Media) — spójna nazwa w nawigacji, nagłówku i instrukcji" },
      { type: "improve", text: "Lista płac — polski placeholder e-mail (odbiorca@firma.pl)" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.46.00",
    label: "Do rozliczenia — fundament (Sprint 20.3A)",
    items: [
      { type: "new", text: "💰 Do rozliczenia — rejestr pozycji do odzyskania (open / partial / settled) w KV kw-recoverable-charges" },
      { type: "new", text: "Tworzenie pozycji powiązanej z robotą lub poza systemem — lista z wyszukiwarką, filtrami i sortowaniem" },
      { type: "new", text: "Panel szczegółów (odczyt) — opis, kwota, źródło, inspektor, tagi, historia utworzenia" },
      { type: "improve", text: "Menu Media — połączone Zdjęcia + Pliki robot (jak Instrukcja / Zmiany)" },
      { type: "improve", text: "Sync chmury + tombstone kw-recoverable-charges-deleted-ids — bez zmian Payroll, Leaves, Inspector, Job" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.45.41",
    label: "Lista płac — spójna kasa w sobotę (sidebar)",
    items: [
      { type: "fix", text: "Sidebar, topbar i Pulpit — „Do wypłaty w sobotę” uwzględnia ⏭ PRZENIESIONO (jak tabela i PDF)" },
      { type: "improve", text: "computePayrollCashSplitWithCarry — wspólna logika carry dla panelu admina i listy płac" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.45.40",
    label: "Panel inspektora — nowoczesny UX",
    items: [
      { type: "new", text: "Pulpit inspektora — KPI (aktywne, uwaga, zakończone, zdjęcia oczekujące), sekcja „Dzisiaj”, Action Center (max 3)" },
      { type: "new", text: "Postęp kontroli 0–100% na kartach i w szczegółach roboty — bez nowych pól w chmurze" },
      { type: "improve", text: "Karty robót — brakujące elementy do odbioru, ostatnia aktywność, priorytety 🔴🟠🟢" },
      { type: "improve", text: "Checklist dokumentów w grupach (Dokumentacja / Pomiary / Zdjęcia) z licznikiem 5/8" },
      { type: "new", text: "Szybkie zdjęcie 📷 — FAB, wybór roboty, aparat (offline queue bez zmian)" },
      { type: "fix", text: "Postęp kontroli % — bez podwójnego liczenia zlecenia/kosztorysu (documents 50% + etap 25%)" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.45.39",
    label: "Przeniesienie wypłaty po zapisie tygodnia",
    items: [
      { type: "fix", text: "⏭ Przenieś na następny tydzień — dostępne po „Zapisz tydzień”, dopóki trwa bieżący tydzień płac (zapis ≠ zamknięcie)" },
      { type: "improve", text: "Zapisany tydzień operacyjny — lista płac i PDF/Word z aktualnego stanu (live), nie ze starego snapshotu" },
      { type: "improve", text: "Archiwum odświeża się automatycznie po przeniesieniu wypłaty, rozliczeniu i edycji godzin" },
      { type: "improve", text: "Baner: „kopia zapasowa” vs „tydzień historyczny” — czytelniejszy workflow w weekend" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.45.38",
    label: "Odroczenie wypłaty na następny tydzień",
    items: [
      { type: "new", text: "Lista płac — ⏭ Przenieś na następny tydzień (jednorazowo, zamrożona kwota w momencie kliknięcia)" },
      { type: "new", text: "Tydzień docelowy — bieżąca wypłata + przeniesiona kwota; PDF/Word ze snapshotu archiwum" },
      { type: "improve", text: "Archiwum zamraża carryForwardOut/In — historyczne listy nie zmieniają się po edycji godzin" },
      { type: "fix", text: "Wypłata co 2 tygodnie — bez przenoszenia (tylko tygodniówka); urlop blokuje przeniesienie" },
    ],
  },
  {
    date: "2026-06-06",
    version: "2.45.37",
    label: "Nieobecności pracowników (urlop / L4 / bezpłatny)",
    items: [
      { type: "new", text: "Kartoteka pracownika — sekcja Nieobecności (CRUD, tygodnie Pn–So jak lista płac)" },
      { type: "new", text: "Lista płac — 🏖 URLOP / 🤒 CHOROBOWE / 🚫 BEZPŁATNY zamiast kwoty w tygodniu nieobecności (godziny zostają)" },
      { type: "new", text: "PDF i Word listy płac — ten sam status nieobecności w kolumnie Do wypłaty" },
      { type: "improve", text: "Zapis tygodnia zamraża leaveStatus w archiwum — historyczne listy nie zmieniają się po dodaniu urlopu wstecz" },
      { type: "fix", text: "Walidacja: brak nakładania urlopów i blokada tygodni już zamkniętych w archiwum (frontend + chmura)" },
    ],
  },
  {
    date: "2026-06-05",
    version: "2.45.36",
    label: "Performance 2.2 — prawdziwe lazy ładowanie zakładek",
    items: [
      {
        type: "improve",
        text: "Pulpit nie pobiera już przy starcie ciężkich modułów Roboty, Lista płac, Przetargi i Inspektor — zakładki ładują się dopiero po ich otwarciu",
      },
      {
        type: "improve",
        text: "Zmniejszono liczbę modułów pobieranych podczas uruchamiania aplikacji",
      },
      {
        type: "fix",
        text: "Naprawiono konfigurację bundlera odpowiedzialną za przedwczesne pobieranie paneli",
      },
    ],
  },
  {
    date: "2026-06-05",
    version: "2.45.35",
    label: "Performance 2.1 — Command Center",
    items: [
      {
        type: "improve",
        text: "COMMAND CENTER AI — szybsze przeliczanie pulpitu i przetargów (jeden pass rankingu, wspólne KPI rynkowe)",
      },
      {
        type: "improve",
        text: "Pulpit i Przetargi — COMMAND CENTER ładuje się tylko tam, gdzie jest potrzebny (nie obciąża Robot, Płac ani Kartoteki)",
      },
      {
        type: "improve",
        text: "Cache pipeline przetargów (60 s) — powrót Pulpit ↔ Przetargi lub Roboty bez ponownego ładowania listy i auto-wyników BZP",
      },
      {
        type: "fix",
        text: "Powrót z Roboty na Pulpit (<60 s) — zachowany cache po synchronizacji chmury w tle (bez placeholdera COMMAND CENTER)",
      },
      {
        type: "improve",
        text: "Roboty, Lista płac, Grafik, Kartoteka — płynniejsza praca bez zbędnych obliczeń przetargów w tle",
      },
    ],
  },
  {
    date:"2026-06-04", version:"2.45.34", label:"Performance 1.1C + 1.2A + 1.3A+",
    items:[
      {type:"improve", text:"Usunięcie legacy tenderDashStats — Pulpit korzysta wyłącznie z COMMAND CENTER AI"},
      {type:"improve", text:"Szybsze pojawianie COMMAND CENTER AI — pipeline bez blokowania na award/BZP w tle"},
      {type:"improve", text:"CloudLoader CORE/DEFERRED bootstrap — szybsze wejście do aplikacji, cięższe dane w tle"},
      {type:"improve", text:"Automatyczne odświeżanie profilu firmy po deferred bootstrap (COMMAND CENTER)"},
    ],
  },
  {
    date:"2026-06-04", version:"2.45.33", label:"Roboty 2.1A — przebudowa układu listy robót",
    items:[
      {type:"improve", text:"Lista robót — układ: CTA → KPI (pasek poziomy) → szukaj → fazy → lista; filtry operacyjne tylko z KPI (bez drugiego rzędu chipów)"},
      {type:"improve", text:"Filtry ▼ — pracownik, tryb masowy i legenda w zwijanym panelu obok wyszukiwarki"},
      {type:"improve", text:"Karta na liście — adres + status, klient • termin, badge BZP → Ekipa → WM (tylko prezentacja, logika 2.0 bez zmian)"},
    ],
  },
  {
    date:"2026-06-04", version:"2.45.32", label:"Roboty 2.0 MIN — KPI i pilność na liście",
    items:[
      {type:"new", text:"Lista robót — pasek KPI (w toku, do odbioru, bez ekipy, BZP, WM po terminie); klik włącza filtr lub chip"},
      {type:"improve", text:"Chipy: Bez ekipy, Tylko BZP, WM po terminie — sort pilności w grupie miesiąca"},
      {type:"improve", text:"Karta listy — badge BZP, Ekipa: 0/N, termin kontraktu (bez zmian sync i panelu pracownika)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.31", label:"Pracownik — status i termin kontraktu (FAZA 9.0.1)",
    items:[
      {type:"improve", text:"„Twoje kontrakty” — status (etap realizacji lub status listy) i termin start–koniec z roboty"},
      {type:"improve", text:"Tylko odczyt pól Job — bez zmian grafiku, listy płac i przetargów"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.30", label:"Pracownik — Twoje kontrakty (FAZA 9.0)",
    items:[
      {type:"new", text:"Tryb pracownika — sekcja „Twoje kontrakty” (plan ekipy z roboty admina), poniżej „Wszystkie roboty w toku”"},
      {type:"improve", text:"Ten sam ekran zdjęć i raportów po kliknięciu — bez zmian grafiku, listy płac i przetargów"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.29", label:"Roboty — planowa ekipa realizacyjna (ETAP 8.5 FULL)",
    items:[
      {type:"new", text:"Baner „Realizacja kontraktu” — lider i ekipa (multi-select z kartoteki), zapis do roboty i chmury"},
      {type:"new", text:"Lista robót — badge „Ekipa: N” gdy przypisano planowych wykonawców"},
      {type:"improve", text:"Bez wpisów czasu pracy i bez zmian listy płac — tylko pola executionLeadDirectoryId i executionAssigneeDirectoryIds w kw-jobs"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.28", label:"Roboty — Rozpocznij realizację kontraktu (ETAP 8.5 MIN)",
    items:[
      {type:"new", text:"Baner przetargu w Robotach — przycisk „Rozpocznij realizację” (etap W realizacji, status W trakcie, wpis w historii)"},
      {type:"improve", text:"Bez nowych pól w chmurze — używa jobPhase, handoverStage i activityLog jak dotychczas"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.27", label:"Przetargi — daty SWZ w robocie (ETAP 8.4)",
    items:[
      {type:"improve", text:"Utwórz robotę — dodatkowe terminy z SWZ (okres w dniach/miesiącach, data „do …”) gdy brak daty umowy lub liczby dni z analizy"},
      {type:"fix", text:"Priorytet bez zmian: najpierw data umowy + dni z SWZ; tekstowe terminy tylko jako bezpieczny fallback"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.26", label:"Pulpit — wygrane bez roboty + CTA (ETAP 8.3)",
    items:[
      {type:"new", text:"Pulpit COMMAND CENTER — KPI „Wygrane bez roboty” oraz przyciski Utwórz / Otwórz robotę przy wygranych"},
      {type:"improve", text:"Action Center na Pulpicie — realizacja wygranych (won-realization) z tymi samymi akcjami co w COMMAND CENTER"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.25", label:"Roboty — realizacja kontraktu po przetargu (ETAP 8.2)",
    items:[
      {type:"improve", text:"Utwórz robotę — planowany odbiór WM z terminem realizacji; dokumenty zsynchronizowane po skopiowaniu plików z przetargu"},
      {type:"improve", text:"Baner realizacji kontraktu w Robotach (kwota, terminy, link do BZP)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.24", label:"Przetargi — mapowanie roboty z wygranego (ETAP 8.1)",
    items:[
      {type:"improve", text:"Utwórz robotę — kwota wygranej oferty (BZP) ma pierwszeństwo przed wartością z SWZ"},
      {type:"improve", text:"Data umowy i termin realizacji (dni z analizy SWZ) trafiają do roboty, gdy są w danych przetargu"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.23", label:"Przetargi — wspólny pipeline Classic × CC (ETAP 8.0A)",
    items:[
      {type:"fix", text:"Classic View i COMMAND CENTER korzystają z jednego pipeline — „Otwórz robotę” widoczne od razu bez odświeżania strony"},
      {type:"improve", text:"Wejście w widok klasyczny odświeża listę z pamięci (bez ponownego pobierania BZP)"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.22", label:"COMMAND CENTER — utwórz robotę z wygranego (ETAP 8.0)",
    items:[
      {type:"new", text:"COMMAND CENTER — „Utwórz robotę” / „Otwórz robotę” przy wygranym przetargu (okazja, briefing, akcje)"},
      {type:"improve", text:"Wspólny handler tworzenia roboty z przetargu — Classic i CC bez duplikacji logiki"},
    ],
  },
  {
    date:"2026-06-03", version:"2.45.21", label:"COMMAND CENTER — uproszczenie UX (ETAP 7G.1)",
    items:[
      {type:"improve", text:"„Co wymaga uwagi” — max 5 pozycji, widok skrócony, „Pokaż wszystkie”, szczegóły na żądanie"},
      {type:"improve", text:"Kolejność sekcji: briefing → okazja → zdolność finansowa → kondycja → akcje → prognoza"},
      {type:"fix", text:"Zdolność finansowa przywrócona w COMMAND CENTER (jak na Pulpicie)"},
      {type:"improve", text:"Mniej duplikatów — Hero bez głównej akcji; kompaktowy briefing"},
    ],
  },
  {
    date:"2026-06-02", version:"2.45.20", label:"Sync — godziny nie przechodzą na nowy tydzień",
    items:[
      {type:"fix", text:"Scalanie chmury — godziny z poprzedniego tygodnia nie wskakują na bieżący Pn–So po rollover / odzyskaniu bazy"},
      {type:"fix", text:"Gdy jedno urządzenie ma pustą listę a drugie starą — wygrywa pusta (nowy tydzień bez archiwum)"},
      {type:"fix", text:"Wybór weekFrom/weekTo — przy rozjechanych datach preferowany nowszy tydzień, nie „bogatsza” stara lista"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.19", label:"Lista płac — Rozliczony trzyma się u każdej osoby (sync)",
    items:[
      {type:"fix", text:"Scalanie listy płac — duplikat tej samej osoby (inny id) nie zostawia „Oczekuje”; wygrywa rozliczony"},
      {type:"fix", text:"Archiwum — status Rozliczony dopasowany po imieniu / kartotece, nie tylko po starym id wpisu"},
      {type:"fix", text:"Po oznaczeniu Rozliczony szybki zapis do chmury (~0,4 s) — odświeżenie nie cofa ostatniej osoby"},
      {type:"fix", text:"Ignorowanie fałszywego „oczekuje” z błędnego syncu (ten sam czas co edycja godzin)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.18", label:"Lista płac — status Rozliczony nie znika po syncu",
    items:[
      {type:"fix", text:"Scalanie chmury — remis settledUpdatedAt nie cofa rozliczenia; przy remisie wygrywa „rozliczony”"},
      {type:"fix", text:"Pull z chmury (telefon / powrót do karty) — merge nie nadpisuje settledUpdatedAt fałszywym timestampem"},
      {type:"fix", text:"Oznaczenie Rozliczony aktualizuje też archiwum tygodnia (przywrócenie z archiwum nie gubi statusu)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.17", label:"Optymalizacja faza 2 krok 2 — Roboty + Lista płac poza głównym bundle",
    items:[
      {type:"improve", text:"Lazy load: JobsView (~94 KB) i PayrollView (~54 KB) — ładowane przy wejściu w Roboty / Lista płac"},
      {type:"improve", text:"app-domain.ts — typy i helpery domenowe wydzielone z App.tsx (~4300 linii mniej w monolicie)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.16", label:"Optymalizacja faza 2 — Instrukcja/Changelog poza głównym bundle",
    items:[
      {type:"improve", text:"Lazy load: Instrukcja + Changelog (GuideView) — ~2300 linii mniej w głównym JS"},
      {type:"improve", text:"changelog-data.ts — historia wersji w osobnym module ładowanym na żądanie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.15", label:"Optymalizacja Web + Mobile — lazy load, mniejszy bundle",
    items:[
      {type:"improve", text:"Lazy load: Przetargi, Inspektor admin, Pliki robot, muzyka — szybszy start na telefonie"},
      {type:"improve", text:"Code split: panel-tenders, pdfjs, preconnect Supabase, mobile scroll (overscroll-behavior)"},
      {type:"improve", text:"docs/OPTIMIZATION.md — audyt Web + iOS/Android/PWA"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.14", label:"Lista płac — nowy tydzień od niedzieli 20:00",
    items:[
      {type:"improve", text:"Nd od 20:00 — auto-archiwum + przejście na nadchodzący tydzień Pn–So (gdy wszyscy rozliczeni); Nd przed 20:00 bez zmian"},
      {type:"fix", text:"Alerty rozliczenia także gdy tydzień zostaje w tyle po Nd 20:00; logika w payroll-cycle.ts"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.13", label:"Docs — onboarding START HERE, PROJECT-GUIDE, CURRENT-TASK",
    items:[
      {type:"new", text:"PROJECT-GUIDE.md, CHANGELOG.md, CURRENT-TASK.md — struktura dla programistów (wznowienie sesji)"},
      {type:"improve", text:"AGENTS.md START HERE + Known Issues; reguły projektu; ARCHITECTURE v2.45.12 (mapa OSM)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.12", label:"Przetargi — mapa OSM i słownik kluczowych",
    items:[
      {type:"fix", text:"Mapa przetargów Wrocław — kafelki OpenStreetMap zamiast pustego SVG (ulice, rzeka, markery)"},
      {type:"improve", text:"Słownik słów kluczowych — podgląd wbudowanych haseł, licznik wbudowanych/własnych, wyjaśnienie roli scoringu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.11", label:"Docs — ARCHITECTURE/AGENTS dla programistów (v2.45.7–10)",
    items:[
      {type:"improve", text:"ARCHITECTURE.md § 12.1.1–12.1.2 — przetargi v2.45.7–10, galeria ZIP, mapa SVG, endpoint award-result"},
      {type:"improve", text:"AGENTS.md, ROZWOJ.md, wgdom-stan-projektu — skrót dla programistów"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.10", label:"Galeria admin — pobieranie ZIP roboty",
    items:[
      {type:"new", text:"Zakładka Galeria (admin): pobierz ZIP całej roboty lub pojedynczej kategorii (przed / w trakcie / po)"},
      {type:"improve", text:"Pliki w ZIP: foldery wg kategorii, nazwa ulica + data + numer zdjęcia"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.9", label:"Przetargi — naprawa mapy Wrocław",
    items:[
      {type:"fix", text:"Mapa przetargów — SVG zamiast niedziałającego staticmap.openstreetmap.de"},
      {type:"improve", text:"Mapa zwijana jak profil firmy i słownik słów kluczowych"},
      {type:"improve", text:"Mapa widoczna zawsze w sekcji Przetargi (domyślnie zwinięta)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.8", label:"Przetargi — akcje, auto-wyniki, alerty pulpitu",
    items:[
      {type:"new", text:"Chipy „wymaga działania” — filtry: termin bez wyceny, wadium, kosztorys, referencje"},
      {type:"new", text:"Auto-pobieranie wyników BZP po terminie (status wygrany/przegrany)"},
      {type:"improve", text:"Referencje vs SWZ — konkretna luka w PLN w dopasowaniu i na karcie ofertowej"},
      {type:"new", text:"Porównanie cen po wyniku: szacunek vs wygrana vs wartość SWZ"},
      {type:"new", text:"Termin ofert → kalendarz (.ics) + alerty przetargów na pulpicie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.45.7", label:"Przetargi — SWZ, wadium, wyniki, mapa, pakiet PDF",
    items:[
      {type:"improve", text:"Analiza SWZ (pdf.js): kryteria oceny, fragmenty tabel, wadium jako % wartości"},
      {type:"new", text:"Eksport „Pakiet wyceny” — PDF z checklistą, wadium, dopasowaniem i propozycją oferty"},
      {type:"new", text:"Wadium — kalkulator + blokada gdy przekracza limit profilu (badge na liście)"},
      {type:"new", text:"Wyniki postępowań — pobieranie z BZP (kto wygrał, za ile)"},
      {type:"new", text:"Mapa przetargów Wrocław — aktywne postępowania na mapie OSM"},
      {type:"new", text:"Historia wersji „Nasz szacunek” przy ręcznej edycji i z kalkulatora"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.6", label:"Profil firmy — MOPS Owsiana 2024 wygrany",
    items:[
      {type:"fix", text:"Profil przetargów: MOPS ul. Owsiana 2024 — wygrany przetarg, roboty w terminie (wcześniej błędnie jako udział)"},
      {type:"improve", text:"Schema profilu v6 — odświeżenie danych przy wejściu w Przetargi"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.5", label:"Przetargi — karta ofertowa i czytelna analiza SWZ",
    items:[
      {type:"new", text:"Karta ofertowa: checklist (termin, wartość, wadium, kosztorys, kryteria, wycena) — widać czego brakuje"},
      {type:"fix", text:"Analizuj SWZ pokazuje konkretny wynik (wartość, wadium) zamiast pustego toastu; działa też na załącznikach PDF"},
      {type:"improve", text:"Lista przetargów: wartość, wadium i status kosztorysu w wierszu bez rozwijania"},
      {type:"improve", text:"Dopasowanie i kalkulator oferty na wierzchu — nie schowane w szczegółach"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.4", label:"Przetargi — BIP tylko dla tego postępowania",
    items:[
      {type:"fix", text:"Dokumenty u zamawiającego: bez crawl całego BIP — tylko linki z ogłoszenia + wyszukiwanie po tytule/numerze BZP"},
      {type:"fix", text:"Max 3 pliki, filtrowane pod tytuł postępowania — koniec z pobieraniem obcych PDF-ów"},
      {type:"fix", text:"Nazwy plików BZP: zamiast „dokument” — Załącznik 1.pdf, 2.pdf… (czytelne etykiety)"},
      {type:"improve", text:"Rozwinięty przetarg uproszczony: dokumenty na górze, reszta w „Szczegóły, kosztorys, dopasowanie”"},
      {type:"improve", text:"Jedna sekcja Dokumenty (BZP + BIP + wgrane), bez auto-szukania w tle"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.3", label:"Blank page — naprawa workEntries null",
    items:[
      {type:"fix", text:"Szybszy start — ekran logowania/panel po pobraniu z chmury, zapis push w tle (nie czeka na batch-set)"},
      {type:"fix", text:"Roboty z workEntries: null lub wpis kartoteki w kw-jobs nie wywalają aplikacji po zalogowaniu"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.2", label:"Chmura — naprawa sync + odzysk listy płac",
    items:[
      {type:"fix", text:"Czerwona chmurka: batch-set nie pada już na null w profilu firmy przetargów"},
      {type:"fix", text:"Sync najpierw scala dane z chmury (archiwum wraca) — potem zapis; błąd push nie czyści UI"},
      {type:"fix", text:"Pusta lista płac automatycznie przywraca się z archiwum dla bieżącego tygodnia"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.1", label:"Lista płac — niedziela zamiast soboty, spójność",
    items:[
      {type:"fix", text:"Niedziela wciąż pokazuje tydzień Pn–So (wypłaty w sobotę) — lista nie znika o 4:00 w niedzielę"},
      {type:"fix", text:"Auto-archiwum w niedzielę (nie w sobotę), tylko gdy wszyscy oznaczeni jako rozliczeni"},
      {type:"fix", text:"Brak fałszywych alertów spójności gdy nowy tydzień bez listy płac"},
      {type:"fix", text:"Nie przechodzi do nowego tygodnia dopóki są nierozliczeni pracownicy"},
    ],
  },
  {
    date:"2026-05-30", version:"2.45.0", label:"Przetargi — pełne zarządzanie sekcją",
    items:[
      {type:"new", text:"Sync chmury kw-tenders-* (pipeline, profil, słownik) + merge między urządzeniami"},
      {type:"new", text:"Usuń z listy, eksport CSV, tryb masowy (status / usuwanie)"},
      {type:"new", text:"Panel słownika słów kluczowych + edycja referencji/wygranych w profilu firmy"},
      {type:"new", text:"Ustawienia Super Admina: skan BZP (dni/strony/auto-sync) + reset sekcji przetargów"},
      {type:"improve", text:"Backup JSON obejmuje dane przetargów; auto „Obejrzany” przy rozwinięciu"},
    ],
  },
  {
    date:"2026-05-30", version:"2.44.1", label:"Przetargi — walidacja i poprawki kalkulatora",
    items:[
      {type:"fix", text:"Kalkulator oferty — usunięte podwójne liczenie marży; rekomendacja = próg opłacalności"},
      {type:"fix", text:"Dopasowanie przetargu działa też przy wartości z kosztorysu ATH (bez pełnej SWZ)"},
      {type:"fix", text:"Dokumenty BIP nie nadpisują dobrego kosztorysu z e-Zamówień; błędy discover widoczne w panelu"},
      {type:"fix", text:"Serwer: SSRF (10.x), dopasowanie plików po słowach kluczowych, zsynchronizowane portale BIP"},
      {type:"improve", text:"Profil firmy — clamp wartości kosztów (ujemne stawki, >100% marży itp.)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.44.0", label:"Przetargi — dokumenty z BIP i linków w ogłoszeniu",
    items:[
      {type:"new", text:"Auto-wykrywanie linków SWZ/BIP w ogłoszeniu BZP + panel „Dokumenty u zamawiającego”"},
      {type:"new", text:"Pobieranie plików z portali urzędów (Wrocław, MOPS, MPWiK…) — ten sam parser SWZ/ATH"},
      {type:"improve", text:"Kosztorys i wartość zamówienia uzupełniane z dokumentów spoza e-Zamówień"},
    ],
  },
  {
    date:"2026-05-25", version:"2.43.1", label:"Scroll — profil firmy i nagłówki",
    items:[
      {type:"fix", text:"Przetargi — profil firmy i filtry w jednym obszarze przewijania (kółko myszy działa wszędzie)"},
      {type:"fix", text:"Grafik, Roboty, Instrukcja — scroll z nagłówka przekierowany do listy poniżej"},
    ],
  },
  {
    date:"2026-05-25", version:"2.43.0", label:"Koszty robót i przetargów — lista płac + poboczne",
    items:[
      {type:"new", text:"Roboty — koszt robocizny + poboczne (ZUS, paliwo 3 aut, narzędzia, BHP, Kp) i min. cena z marżą"},
      {type:"improve", text:"Model kosztów z listy płac: 13 os., ~28,6 zł/h brutto, Kp remonty 14%, zysk 8%"},
      {type:"improve", text:"Przetargi — kalkulator uwzględnia koszty poboczne tygodniowe i realne stawki ekipy"},
      {type:"improve", text:"Profil firmy — edycja paliwa, narzędzi, gruzu, ubezpieczeń (tygodniowy udział)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.42.0", label:"Przetargi — kalkulator ceny ofertowej",
    items:[
      {type:"new", text:"Propozycja ceny startowej: robocizna (rbh+ZUS), materiały, Kp, stałe 15 os., marża"},
      {type:"new", text:"Warianty: agresywna / rekomendowana / bezpieczna — z uwzględnieniem wagi ceny w SWZ"},
      {type:"improve", text:"Profil firmy — model kosztów (stawki, indeksy, stałe miesięczne) edytowalny w chmurze"},
    ],
  },
  {
    date:"2026-05-25", version:"2.41.0", label:"Przetargi — DOCX/XLSX/ZIP, pdf.js, auto-szacunek ATH",
    items:[
      {type:"new", text:"Auto „Nasz szacunek” z sumy kosztorysu po pobraniu załączników BZP"},
      {type:"new", text:"Podgląd DOCX (tekst SWZ), XLSX (tabela pozycji SheetJS), ZIP (lista + auto-pick ATH/PDF)"},
      {type:"improve", text:"PDF przez pdf.js — ekstrakcja tekstu SWZ, ostrzeżenie o skanach bez OCR"},
      {type:"improve", text:"Dopasowanie przetargu uwzględnia wartość z kosztorysu ATH i opisy pozycji"},
      {type:"improve", text:"Karta kosztorysu — skrót pozycji + link „Pełny podgląd” zamiast pełnej tabeli inline"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.2", label:"Przetargi — profil po wyszukiwaniu BZP/BIP",
    items:[
      {type:"improve", text:"Profil v3: MOPS Owsiana 2024 (615 tys. zł, 5 ofert), MPWiK 2012 (23,10 zł/rbh)"},
      {type:"improve", text:"Wygrana Kamieńskiego — dokładna kwota BZP, 130 dni, 3 oferty MŚP"},
      {type:"improve", text:"Notatki: potwierdzone źródła (BIP MOPS, mpwik.wroc.pl, eGospodarka)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.1", label:"Przetargi — profil W&G DOM z CEIDG i wgdom.pl",
    items:[
      {type:"improve", text:"Domyślny profil firmy: NIP 8991736797, Iwona Schabowska-Wałek, referencje ZUS/PKO/UWr/DOZG/MOPS"},
      {type:"new", text:"Lista referencji, wygranych BZP (MOPS Kamieńskiego ~983 tys. zł) i udziałów w przetargach"},
      {type:"improve", text:"Dopasowanie przetargu rozpoznaje znanych zamawiających z historii firmy"},
    ],
  },
  {
    date:"2026-05-25", version:"2.40.0", label:"Przetargi — profil firmy, dopasowanie, punktacja",
    items:[
      {type:"new", text:"Profil firmy (edytowalny, chmura): referencje, wadium, CPV, region, OC, moce zespołu"},
      {type:"new", text:"Dopasowanie przetargu vs wymagania SWZ — tabela OK / luka / częściowo"},
      {type:"new", text:"Kryteria oceny ofert — waga ceny, punktacja z ogłoszenia"},
      {type:"new", text:"Szacunek szans (%) + podpowiedzi — badge na liście przetargów"},
    ],
  },
  {
    date:"2026-05-25", version:"2.39.0", label:"Przetargi — podgląd załączników BZP",
    items:[
      {type:"new", text:"Lista załączników postępowania z auto-skanem BZP i licznikiem plików"},
      {type:"new", text:"Podgląd w aplikacji: PDF, ATH, NOR, XML (przez proxy — bez CORS) oraz wgrany SWZ"},
      {type:"improve", text:"Ta sama przeglądarka kosztorysów co w robotach — tabela, przedmiar, eksport PDF"},
    ],
  },
  {
    date:"2026-05-25", version:"2.38.0", label:"Przetargi — karta przetargu (kosztorys, przedmiar, SWZ)",
    items:[
      {type:"new", text:"Karta przetargu w aplikacji: przedmiot, terminy, wadium, kontakt, referencje — bez linków zewnętrznych"},
      {type:"new", text:"Auto-parsowanie kosztorysu ATH/NOR/XML i przedmiaru z załączników BZP"},
      {type:"new", text:"Tabela pozycji kosztorysu + wszystkie pola z ogłoszenia HTML"},
    ],
  },
  {
    date:"2026-05-25", version:"2.37.1", label:"Przetargi — legenda trafności i statusów",
    items:[
      {type:"new", text:"Przetargi — rozwijana legenda u góry: trafność, statusy pipeline, ocena SWZ, lejek"},
    ],
  },
  {
    date:"2026-05-25", version:"2.37.0", label:"Przetargi — workflow, pulpit, instrukcja",
    items:[
      {type:"new", text:"Instrukcja obsługi — sekcja Przetargi BZP (pipeline, SWZ, uczenie, robota)"},
      {type:"new", text:"Sync słów kluczowych z chmury + przeliczenie trafności przy starcie"},
      {type:"new", text:"Tworzenie roboty — auto-dołączanie SWZ/kosztorysu z przetargu"},
      {type:"new", text:"Link zwrotny przetarg ↔ robota (banner w karcie roboty)"},
      {type:"new", text:"Auto-analiza po rozwinięciu (HTML, załączniki, SWZ)"},
      {type:"new", text:"Auto-odświeżanie BZP co ~20 h + widget na Pulpicie"},
      {type:"new", text:"Lejek pipeline ze wskaźnikiem skuteczności"},
      {type:"new", text:"Podgląd pełnego ogłoszenia HTML + status postępowania z API"},
      {type:"improve", text:"Parsowanie SWZ: terminy realizacji, wymagania techniczne, pozycje tabel PDF"},
    ],
  },
  {
    date:"2026-05-25", version:"2.36.0", label:"Przetargi BZP — SWZ, analiza, uczenie słów, robota",
    items:[
      {type:"new", text:"Szczegóły postępowania: załączniki SWZ z e-Zamówień (skan publicznych dokumentów) + ręczny upload pliku"},
      {type:"new", text:"Analiza SWZ: wadium, kwota, referencje z PDF/HTML; podgląd ATH; ocena opłacalności vs nasza wycena"},
      {type:"new", text:"Uczenie słów kluczowych z przetargów „interesuje nas”; propozycje fraz do słownika"},
      {type:"new", text:"Powiązanie wygranego/przygotowywanego przetargu z robotą — utwórz lub otwórz powiązaną robotę"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.25", label:"Przetargi — pełny słownik remontów wnętrz",
    items:[
      {type:"improve", text:"Słowa kluczowe: malowanie, podłogi, sufity, glazura, regips, tapety, parkiet, wymiana"},
      {type:"improve", text:"Obiekty: hale, uniwerki, lokale usługowe, mieszkania, szpitale, szkoły, urzędy…"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.24", label:"Przetargi — instalacje elektryczne i wymiany",
    items:[
      {type:"improve", text:"Słowa kluczowe: instalacje elektryczne, oświetlenie, okablowanie, rozdzielnie, wymiana, teletechnika, CO, wod-kan"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.23", label:"Przetargi — profil remont budynków Wrocław",
    items:[
      {type:"improve", text:"Słowa kluczowe: mieszkania, biura, uczelnie, szpitale, pomieszczenia, elewacje, instalacje…"},
      {type:"improve", text:"Wykluczenia: drogi, nowa zabudowa (sam „budowa” bez remontu), sieci, mosty"},
      {type:"improve", text:"Widok „Do zgłoszenia” — tylko Wrocław (lub kluczowy zamawiający) + remont/modernizacja"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.22", label:"Przetargi — tylko aktywne do zgłoszenia",
    items:[
      {type:"improve", text:"Domyślny widok „Do zgłoszenia” — otwarty termin ofert + wysoka trafność lub kluczowy zamawiający"},
      {type:"improve", text:"BZP pomija przetargi z minionym terminem; sortowanie po najbliższym deadline; archiwum osobno"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.21", label:"Przetargi — MOPS Wrocław",
    items:[
      {type:"fix", text:"MOPS — w BZP nazwa „Miejski Ośrodek Pomocy Społecznej” + miasto Wrocław (nie „we Wrocławiu”)"},
      {type:"fix", text:"Pobieranie MOPS przez zakodowany URL (fix Deno/Edge); skan do 365 dni"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.20", label:"Przetargi — kluczowi zamawiający Wrocławia",
    items:[
      {type:"new", text:"BZP — dedykowany skan po organizationName: Wrocławskie Mieszkania, ZIK, ZIM, TBS, Gmina Wrocław"},
      {type:"improve", text:"Filtr „Kluczowi zamawiający”, badge organizacji, luźniejszy scoring dla WM/ZIK/ZIM"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.19", label:"Przetargi — widoczność dla adminów i moderatorów",
    items:[
      {type:"new", text:"Ustawienia Super Admina — przełącznik „Zakładka Przetargi dla administratorów i moderatorów” (sync w chmurze)"},
      {type:"improve", text:"Super Admin zawsze widzi Przetargi; admin/moderator — gdy włączone w ustawieniach"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.18", label:"Przetargi BZP (Super Admin · test)",
    items:[
      {type:"new", text:"Zakładka Przetargi — pipeline ogłoszeń z BZP (dolnośląskie, remont/modernizacja), widoczna tylko dla Super Admina"},
      {type:"new", text:"Endpoint GET /tenders-bzp-search — proxy do API e-Zamówienia z filtrem słów kluczowych"},
      {type:"new", text:"Chmura kw-tenders-pipeline — status, notatki, link do e-Zamówienia"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.17", label:"Wykrywalność dokumentacji dla programistów",
    items:[
      {type:"new", text:"AGENTS.md + README.md — punkt wejścia; reguły projektu alwaysApply: czytaj ARCHITECTURE.md na start sesji"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.16", label:"Dokumentacja architektury dla developerów",
    items:[
      {type:"new", text:"docs/ARCHITECTURE.md — pełny przewodnik: panele, sync, Supabase, Vercel, PWA, testy, pułapki"},
      {type:"improve", text:"Reguły projektu + ROZWOJ.md — obowiązek aktualizacji ARCHITECTURE.md przy zmianach (obok CHANGELOG)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.35.15", label:"Sync, wydajność i spójność paneli",
    items:[
      {type:"fix", text:"pushKeysToCloudSafe — merge z localStorage przed chmurą (inspektor/pracownik nie nadpisują edycji admina)"},
      {type:"fix", text:"Inspektor — natychmiastowa synchronizacja z adminem przez storage events (kw-jobs, kw-directory)"},
      {type:"fix", text:"Pracownik — lista płac i archiwum zapisywane do localStorage po pull z chmury (offline OK)"},
      {type:"fix", text:"alignWeekRangeInMerged — poprawny wybór tygodnia z bogatszą listą płac (local vs chmura)"},
      {type:"improve", text:"Admin — pull anuluje oczekujący push; brak wyścigu pull↔push"},
      {type:"improve", text:"Zakładka Inspektor (admin) — statystyki odświeżają się przy focus"},
      {type:"improve", text:"Lazy-load panelu inspektora + podział bundla (ui-vendor, panel-inspector); PWA cache v20"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.14", label:"Sync — ochrona przed cofką danych",
    items:[
      {type:"fix", text:"Admin — powrót do karty / F5: pobieranie chmury i merge (nie tylko stary localStorage); UI odświeża się po syncu"},
      {type:"improve", text:"Scalanie listy płac — remis dat idzie na korzyść chmury; rozliczenie zapisuje settledUpdatedAt + dataUpdatedAt"},
      {type:"improve", text:"Po zapisie do chmury stan ekranu = wynik merge (to samo widzą wszyscy admini)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.13", label:"Sync — status rozliczony",
    items:[
      {type:"fix", text:"Lista płac — status „Rozliczony” synchronizuje się między adminami (wcześniej lokalne „oczekuje” nadpisywało chmurę)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.12", label:"Mobile — naprawa scrolla admina",
    items:[
      {type:"fix", text:"Panel admina na telefonie — przywrócony scroll i dotyk (regresja po poprawce viewportu desktop)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.11", label:"Admin — górny pasek zawsze widoczny",
    items:[
      {type:"fix", text:"Panel admina — górny pasek (odtwarzacz, chmura…) nie chowa się pod paskiem zakładek Chrome; wysokość okna z visualViewport"},
      {type:"improve", text:"Zwinięte menu w górnym pasku — pełne nazwy, bez poziomego scrolla"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.10", label:"Admin — układ na każdym ekranie",
    items:[
      {type:"fix", text:"Panel admina — menu i górny pasek nie ucinają się na mniejszych laptopach i przy skalowaniu Windows (125–150%)"},
      {type:"improve", text:"Sidebar z przewijaniem; zwinięte menu — ikony + poziomy scroll zamiast zawijania w niewidoczny pasek"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.9", label:"Inspektor — kółka zlec/kosz na pulpicie",
    items:[
      {type:"improve", text:"Pulpit inspektora — zlecenie i kosztorys jako kółka (jak u admina); robota nie znika po zaznaczeniu, można odznaczyć"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.8", label:"Inspektor — hymny + chmurka sync",
    items:[
      {type:"new", text:"Panel inspektora — odtwarzacz hymnów firmowych (jak w panelu admina)"},
      {type:"new", text:"Inspektor — ikona chmury w pasku: zapis do chmury, błąd (dotknij = ponów), zsynchronizowano"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.7", label:"Inspektor — naprawa pustego panelu",
    items:[
      {type:"fix", text:"Panel inspektora — roboty i dane znów się wyświetlają (błąd syncu: stan React nie ładował się z cache)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.6", label:"Inspektor — stabilny scroll, bez banera offline",
    items:[
      {type:"fix", text:"Panel inspektora — mniej „skaczącego” scrolla (sync w tle nie odświeża wskaźnika pull, stabilniejsza kolejka zdjęć)"},
      {type:"improve", text:"Inspektor — usunięty żółty pasek „kolejka offline zdjęć”; wysyłka w tle po powrocie sieci bez bannera"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.5", label:"SMS pilne — naprawa crasha (HardHat)",
    items:[
      {type:"fix", text:"SMS pilne — literówka ikony HardHat powodowała komunikat „Nie udało się otworzyć SMS pilne” gdy w kartotece są pracownicy z telefonem"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.4", label:"SMS pilne — naprawa pustego ekranu (2)",
    items:[
      {type:"fix", text:"SMS pilne z Pulpitu — modal bez portalu, stabilny layout, historia ładuje się dopiero w zakładce Historia; ErrorBoundary zamiast pustej strony"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.3", label:"Kosztorys — bez zbędnego ostrzeżenia ATH/NOR",
    items:[
      {type:"improve", text:"Przeglądarka kosztorysów i generowany PDF — usunięto komunikat „Format ATH/NOR jest zamknięty…” przy poprawnym podglądzie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.2", label:"SMS pilne — naprawa pustego ekranu",
    items:[
      {type:"fix", text:"SMS pilne — modal znów się otwiera (brakujący import + wysokość okna); treść widoczna na telefonie i desktopie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.1", label:"Pliki robot — podsumowanie typów na liście",
    items:[
      {type:"improve", text:"Pliki robot (admin + inspektor) — przy każdej robocie widać od razu: zlecenia, kosztorysy, zdjęcia ekipy/inspektora, rysunki — bez rozwijania"},
    ],
  },
  {
    date:"2026-05-25", version:"2.35.0", label:"Admin — Pliki robot + Zmiany/Instrukcja",
    items:[
      {type:"new", text:"Menu admina — zakładka „Pliki robot”: wszystkie pliki z robot (jak u inspektora), pobieranie pojedynczo i ZIP"},
      {type:"improve", text:"Menu — połączono Zmiany + Instrukcja w jedną zakładkę „Zmiany/Instrukcja” (więcej miejsca w menu)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.34.0", label:"Panel inspektora — Galeria, Pliki, powrót do Pulpitu",
    items:[
      {type:"fix", text:"Inspektor — po wejściu w robotę z Pulpitu/Galerii/Plików przycisk „Wróć do …” wraca tam, skąd przyszedłeś (nie tylko lista robót)"},
      {type:"new", text:"Inspektor — dolna zakładka Galeria (zdjęcia ekipy jak u admina) i Pliki (pobieranie pojedynczo lub ZIP)"},
      {type:"improve", text:"Pakiet ZIP plików roboty — foldery wg typu i daty (zlecenie/2026-05-20/, zdjecia-ekipa/przed/…)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.33.1", label:"Inspektor admin — zakładki w szczegółach roboty",
    items:[
      {type:"fix", text:"Zakładka Inspektor (panel admina) — po otwarciu roboty sekcje WM, Pliki, Dokumenty, Ekipa, Raporty, Zdjęcia jako zakładki (wcześniej tylko aplikacja inspektora)"},
      {type:"improve", text:"PWA — odświeżony cache shell (v3) po wdrożeniu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.33.0", label:"Inspektor + nawigacja — zakładki i powrót do Pulpitu",
    items:[
      {type:"fix", text:"Aplikacja inspektora — sekcje (Pliki, Dokumenty, Zdjęcia…) jako zakładki; kliknięcie od razu pokazuje treść"},
      {type:"improve", text:"Roboty / Inspektor — przycisk „Wróć do Pulpitu” po wejściu z pulpitu (alert, skrót)"},
      {type:"improve", text:"Inspektor admin — krótszy opis listy aktywności i powrót do poprzedniej zakładki"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.4", label:"Roboty — zdjęcia admina (wiele + kategoria)",
    items:[
      {type:"fix", text:"Admin w zakładce Zdjęcia — wybór wielu plików naraz zapisuje wszystkie (wcześniej zostawało tylko ostatnie)"},
      {type:"new", text:"Admin — wybór kategorii przed wgraniem: Przed remontem / Po remoncie / W trakcie"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.3", label:"Spójność godzin — ignoruj nadmiar z dodatkowych",
    items:[
      {type:"fix", text:"Pulpit: spójność listy płac ↔ roboty — gdy wpis na robocie ma sumę = podstawa + dodatkowe godziny z listy płac, nie pokazuje fałszywej rozbieżności"},
    ],
  },
  {
    date:"2026-05-25", version:"2.32.2", label:"Roboty — zakładki zamiast scrolla",
    items:[
      {type:"improve", text:"Szczegóły roboty — jedna zakładka na ekran (Przegląd, Pliki, Dokumenty…), bez długiego przewijania"},
      {type:"improve", text:"Pliki — druga zakładka, zielony przycisk skrótu w nagłówku i licznik plików"},
      {type:"improve", text:"Badge’e: brakujące dokumenty, nowe zdjęcia, liczba raportów; pusty panel z skrótami do plików i nowej roboty"},
    ],
  },
  {
    date:"2026-05-29", version:"2.32.1", label:"Pliki wg adresów — kafelki zamiast zakładki",
    items:[
      {type:"improve", text:"„Pliki wg adresów” — pełny ekran z kafelkami po adresie (zlecenie/kosztorys/zdjęcia), nie zakładka w liście"},
      {type:"improve", text:"Każdy kafel: podsumowanie typów plików, rozwijana lista z podglądem i pobieraniem, skrót do roboty"},
    ],
  },
  {
    date:"2026-05-29", version:"2.32.0", label:"Roboty — pliki + czytelniejszy układ",
    items:[
      {type:"new", text:"Zakładka „Wszystkie pliki” — zlecenia, kosztorysy ATH/NOR, zdjęcia i rysunki z datą, autorem, podglądem i pobieraniem"},
      {type:"new", text:"Szczegóły roboty — sekcje: Dane, Dokumenty, Pliki, Pracownicy, Zdjęcia, Raporty (nawigacja u góry)"},
      {type:"improve", text:"Pliki roboty — pełna lista (zlecenie, kosztorys, inspektor, ekipa, raporty) + wgranie zlecenia/kosztorysu z poziomu Roboty"},
      {type:"improve", text:"Lista robót — czytelniejsze karty ze statusem, liczbą plików i brakami dokumentów"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.8", label:"SMS — wybór nadawcy z 4 nazw",
    items:[
      {type:"new", text:"Modal SMS — wybór nadawcy: W&GDOM, W&G-Dawid, W&G-Pawel, W&G-Stan (tylko ACTIVE w SMSAPI)"},
      {type:"improve", text:"Domyślnie nazwa dopasowana do zalogowanego użytkownika; backend wysyła tylko z wybranej aktywnej nazwy"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.7", label:"Roboty — ręczny status + braki dokumentów",
    items:[
      {type:"new", text:"Szczegóły roboty — wybór statusu: W trakcie, Gotowe do odbioru, Zdane (dla wszystkich klientów)"},
      {type:"improve", text:"Pod statusem lista brakujących dokumentów do zdania; bez auto-zdawania po komplecie"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.6", label:"SMS — nadawcy tylko ręcznie w SMSAPI",
    items:[
      {type:"fix", text:"Wyłączona auto-rejestracja nadawców przez API (SMSAPI wymaga ręcznego dodania w panelu)"},
      {type:"improve", text:"Nadawcy: W&GDOM, W&G-Dawid, W&G-Pawel, W&G-Stan — modal tylko sprawdza status ACTIVE"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.5", label:"Roboty — czytelniejsza lista i statusy",
    items:[
      {type:"improve", text:"Lista robót — jeden główny status: W trakcie, Gotowe do odbioru, Komplet do odbioru, Zdane"},
      {type:"improve", text:"Filtry z licznikami + legenda statusów (najechanie / „Co oznaczają statusy?”)"},
      {type:"improve", text:"Na liście widać brakujące dokumenty i alerty tylko gdy brak zlecenia/kosztorysu"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.4", label:"Kosztorys PDF — logo, klauzula, credit DTT",
    items:[
      {type:"improve", text:"PDF kosztorysu — logo W&G DOM, klauzula użytku wewnętrznego (NORMA/Athenasoft), stopka na każdej stronie"},
      {type:"improve", text:"Podgląd kosztorysu — baner z logo, disclaimer i credit DTT (Przeglądarka plików NORMA)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.3", label:"SMS — auto-rejestracja nadawców przez API SMSAPI",
    items:[
      {type:"new", text:"Przy wysyłce SMS — automatyczna rejestracja nazw nadawców (POST smsapi.pl/sms/sendernames)"},
      {type:"new", text:"Przycisk „Zarejestruj nazwy nadawców” + lista statusów ACTIVE/INACTIVE w modalu SMS"},
      {type:"improve", text:"Wysyłka używa tylko ACTIVE pól nadawcy — do czasu akceptacji SMSAPI zostaje prefiks W&G - Imię w treści"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.2", label:"SMS — nadawca admina + historia wysyłek",
    items:[
      {type:"fix", text:"SMS pilne — prefiks W&G - Imię w treści; pole nadawcy W&G-Imię (zamiast domyślnego Test z SMSAPI)"},
      {type:"new", text:"Historia SMS — kto wysłał, do kogo, kiedy, treść i status doręczenia (zakładka Historia)"},
      {type:"improve", text:"Modal SMS — wyświetla zalogowanego nadawcę; instrukcja dodania nazwy w panelu smsapi.pl"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.1", label:"Lista płac PDF/Word — opisy kosztów do zwrotu",
    items:[
      {type:"fix", text:"PDF i Word — załącznik „Koszty do zwrotu” z opisem każdego paragonu/wydatku (wcześniej tylko suma w kolumnie Koszty)"},
      {type:"improve", text:"Pod tabelą główną — informacja skąd kwota w kolumnie Koszty i że szczegóły są w załączniku"},
    ],
  },
  {
    date:"2026-05-29", version:"2.31.0", label:"Kosztorys ATH — Kp/Z PLN, przedmiar, PDF",
    items:[
      {type:"new", text:"Podgląd PDF i Pobierz PDF — generowanie kosztorysu z pliku .ath (pdfmake, polskie znaki)"},
      {type:"new", text:"Sekcja przedmiar/obmiar — odczyt [PRZEDMIAR] z wzorami (np. 2,47*4+4,83*2)"},
      {type:"improve", text:"Podsumowanie — kwoty Kp i Zysk w PLN (z pliku lub wyliczone z netto i % narzutów)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.9", label:"Podgląd ATH — ceny jak w NORMA ofertowy",
    items:[
      {type:"fix", text:"Cena jednostkowa i wartość pozycji z pola cj×ilość (jak wydruk NORMA), nie z wn (koszty pośrednie R/M)"},
      {type:"improve", text:"Podsumowanie: kosztorys netto + VAT + brutto — zgodne z końcówką PDF z Normy"},
      {type:"improve", text:"Nagłówki tabeli: Podstawa (KNR), Cena j., Opis pozycji — terminologia NORMA"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.8", label:"PDF — karta dodatkowych godzin jak rozpis tygodniowy",
    items:[
      {type:"improve", text:"Karta dodatkowych godzin (PDF/Word) — siatka pracownik × dni Pn–So jak rozpis tygodniowy, z kolumną Kwota PLN"},
      {type:"improve", text:"Komórka dnia: godziny od–do, opis, suma h i kwota brutto; wiersz Razem + podpis sumy kosztu nadgodzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.7", label:"Podgląd ATH — polskie znaki, działy, podsumowanie",
    items:[
      {type:"fix", text:"ATH Athenasoft — dekodowanie Windows-1250 (poprawne ą, ę, ł, ś… zamiast �)"},
      {type:"new", text:"Podgląd kosztorysu — działy (ELEMENT), narzuty Kp/Z/VAT, wartość całkowita wk= jak w NORMA"},
      {type:"improve", text:"Modal — tabela podsumowania + pozycje pogrupowane wg działów (Roboty, Instalacje…)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.6", label:"Lista płac PDF — karta dodatkowych godzin + łamanie stron",
    items:[
      {type:"fix", text:"Karta dodatkowych godzin w PDF/Word — uwzględnia wszystkich pracowników (w tym Ukraińców co 2 tyg.), wcześniej byli pomijani"},
      {type:"fix", text:"PDF rozpis tygodniowy — wiersz pracownika nie dzieli się między dwie kartki (dontBreakRows)"},
      {type:"improve", text:"Word — cantSplit na wierszach rozpisu tygodniowego i karty dodatkowych godzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.5", label:"Pliki inspektora — usuwanie + podgląd ATH",
    items:[
      {type:"new", text:"Roboty i panel inspektora — przycisk Usuń przy plikach (zlecenie, kosztorys, zdjęcia); kasuje ze storage i synchronizuje w chmurze"},
      {type:"fix", text:"Podgląd ATH Athenasoft — parser tekstowy [POZYCJA] (opis, KNR, j.m., ilość, cena, wartość) zamiast śmieci z binarnego odczytu"},
      {type:"improve", text:"Sync chmury — nowsza wersja robota zastępuje listę jobFiles/zdjęć (usuwanie nie wraca po odświeżeniu)"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.4", label:"Lista płac — karta dodatkowych godzin",
    items:[
      {type:"new", text:"PDF i Word — osobna „Karta dodatkowych godzin”: opis, stawka, kwota brutto (h × stawka) i suma"},
      {type:"improve", text:"Eksport listy płac — nadgodziny widoczne osobno od wpisów na robotach"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.3", label:"Spójność płac — bez dodatkowych godzin",
    items:[
      {type:"fix", text:"Pulpit: spójność listy płac ↔ roboty ignoruje dodatkowe godziny (mają własny opis, bez wpisu na robocie)"},
      {type:"improve", text:"Wpisy na robotach z listy płac — godziny tylko z podstawowej zmiany, nie z nadgodzin"},
    ],
  },
  {
    date:"2026-05-29", version:"2.30.2", label:"Podgląd kosztorysu — poprawki",
    items:[
      {type:"fix", text:"Roboty — sekcja Pliki inspektora z przyciskiem Podgląd (wcześniej tylko nazwa pliku przy checkboxie)"},
      {type:"fix", text:"Sync ustawień — chmura włączone podgląd ATH nie blokowany przez stary localStorage false"},
      {type:"fix", text:"path storage wyciągany z publicUrl gdy brak w starych wpisach jobFiles"},
      {type:"improve", text:"ATH — tytuł kosztorysu (nan=) w modalu podglądu"},
    ],
  },
  {
    date:"2026-05-25", version:"2.30.1", label:"Podgląd kosztorysów ATH/NOR",
    items:[
      {type:"fix", text:"Podgląd .ath/.nor/.xml — parser binarny, proxy API (omija CORS), domyślnie włączony"},
      {type:"fix", text:"Przycisk Podgląd w panelu inspektora (teren) i adminie — storagePath do pobrania pliku"},
      {type:"improve", text:"Modal podglądu: fragmenty tekstu z binarnego ATH gdy brak tabeli pozycji"},
    ],
  },
  {
    date:"2026-05-25", version:"2.30.0", label:"Testy mobile — audyt + Playwright + CI",
    items:[
      {type:"new", text:"npm run audit:mobile — 36 reguł statycznych (PWA, Capacitor, touch, offline, deep linki)"},
      {type:"new", text:"npm run test:mobile — Playwright smoke na wgdom.fun (iPhone SE + Pixel 7): manifest, SW, ikony, login, touch 44px"},
      {type:"new", text:"GitHub Actions: workflow Mobile smoke tests na main"},
      {type:"improve", text:"docs/MOBILE-NATIVE.md — checklist testów na prawdziwym telefonie (~20 min)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.29.0", label:"Mobilne UX — Faza C (sklep i offline)",
    items:[
      {type:"new", text:"Deep linki wgdom://job/{id} i wgdom://payroll — otwarcie roboty lub listy płac (Android, iOS, web ?open=job&id=…)"},
      {type:"improve", text:"Capacitor — strona offline gdy brak sieci (errorPath); opcjonalny tryb bundle: CAPACITOR_USE_BUNDLE=1"},
      {type:"improve", text:"PWA — manifest id, ikony maskable, kategorie; service worker v2 z offline.html"},
      {type:"improve", text:"Inspektor — kolejka offline zdjęć (jak u pracownika), wysyłka po powrocie sieci"},
    ],
  },
  {
    date:"2026-05-25", version:"2.28.0", label:"Mobilne UX — Faza B (natywka)",
    items:[
      {type:"new", text:"Capacitor — przycisk Wstecz (Android): zamyka modale, edytor płac, szczegół roboty; sync po wznowieniu apki"},
      {type:"improve", text:"Klawiatura mobilna — wykrywanie wysokości (visualViewport), przewijanie aktywnego pola, padding modali"},
      {type:"improve", text:"Lista płac — edytor pracownika pełnoekranowy z ukrytą dolną nawigacją na telefonie"},
      {type:"improve", text:"Panel pracownika — pull-to-refresh (odśwież dane z chmury)"},
      {type:"improve", text:"Grafik — widok kart na telefonie (zamiast przewijania szerokiej tabeli)"},
      {type:"improve", text:"iOS Info.plist — opisy uprawnień aparatu i galerii (App Store)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.27.0", label:"Mobilne UX — Faza A (PWA i natywka)",
    items:[
      {type:"improve", text:"Panel pracownika — odświeżanie danych z chmury przy powrocie do aplikacji (focus / widoczność karty)"},
      {type:"improve", text:"Admin — toasty przy synchronizacji chmury i zapisie tygodnia; baner PWA ukryty w aplikacji Capacitor"},
      {type:"improve", text:"Mobile — większe obszary dotyku (lista płac, filtry robotów, status rozliczenia); edytor płac nad dolną nawigacją"},
      {type:"improve", text:"Przewijanie — overscroll-contain na głównych widokach (mniej „gumowania” całej strony na iOS)"},
      {type:"improve", text:"PWA — precache ikon w service workerze"},
    ],
  },
  {
    date:"2026-05-25", version:"2.26.0", label:"Lista Płac — przełącznik widoku szczegółowego",
    items:[
      {type:"new", text:"Lista Płac — przełącznik „Sumy” / „Szczegóły dni” obok tytułu: godziny 7–16, dodatki i zaliczki wg dni bez otwierania PDF"},
      {type:"improve", text:"Widok szczegółowy — kolumny Pn–So + Sob. poprz., sumy godzin na dole; wybór zapamiętywany w przeglądarce"},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.2", label:"Lista płac — poprawka podsumowania Sob. poprz.",
    items:[
      {type:"fix", text:"Podsumowanie „Sob. poprz.” nie wlicza już godzin pracowników z wypłatą co 2 tygodnie (wcześniej w wierszach było „—”, a w sumie zostawały ich godziny)"},
      {type:"fix", text:"Spójne sumy brutto/zaliczek/netto w stopce listy płac i widoku mobilnym dla pracowników co 2 tyg."},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.1", label:"Inspektor — poprawki mobile iOS/Android",
    items:[
      {type:"fix", text:"PDF na iPhone — share sheet / nowa karta zamiast blokowanego download(); toast sukcesu/błędu"},
      {type:"fix", text:"Toasty pod safe-area (poniżej nagłówka); większe przyciski szybkiego „Jest” i filtrów Pulpicu (44px)"},
      {type:"improve", text:"Status „Czeka na wysłanie” — dotknij, aby ponowić sync; etapy WM, meta pickery, notatki — lepsze cele dotykowe"},
    ],
  },
  {
    date:"2026-05-25", version:"2.25.0", label:"Inspektor — pulpit v2 (UX + raporty PDF)",
    items:[
      {type:"new", text:"Pulpit — powitanie z podsumowaniem pilnych spraw, filtry (admin / pliki / dokumenty / terminy)"},
      {type:"new", text:"Kafelek „Twoja robota w tym tygodniu” — statystyki z dziennika aktywności inspektora"},
      {type:"new", text:"Raport PDF — „Mój miesiąc” i „Mój rok” (roboty, dokumenty, zdjęcia, notatki, etapy WM)"},
      {type:"improve", text:"Status synchronizacji w nagłówku (zielony / pomarańczowy); toasty po szybkim „Jest”; szybkie oznaczanie pozostałych dokumentów na Pulpicie"},
      {type:"improve", text:"Powiadomienie toast przy nowej odpowiedzi admina; nagłówek „Inspektor WM · W&G DOM”"},
    ],
  },
  {
    date:"2026-05-25", version:"2.24.0", label:"Inspektor — pulpit pro + galeria ZIP",
    items:[
      {type:"new", text:"Pulpit — priorytety (termin odbioru), jedna robota na liście zlec/kosz, braki dokumentów, gotowe bez daty, szybkie „Zlecenie ✓” / „Kosztorys ✓”"},
      {type:"new", text:"Galeria — ZIP całej kategorii lub wszystkich zdjęć; kategorie inspektora (usterka, realizacja, przed/po odbiorze); upload w galerii"},
      {type:"improve", text:"Lightbox — przesuwanie między zdjęciami, udostępnij/pobierz; instrukcja inspektora uzupełniona o Pulpit"},
    ],
  },
  {
    date:"2026-05-25", version:"2.23.0", label:"Inspektor — pulpit i galeria zdjęć",
    items:[
      {type:"new", text:"Panel inspektora — zakładka Pulpit: roboty bez zlecenia/kosztorysu (znika po zaznaczeniu „Jest”, bez wymogu pliku)"},
      {type:"new", text:"Galeria zdjęć inspektora jak u admina: kategorie (przed / w realizacji / po odbiorze), opisy, daty wrzucenia, pobieranie całej kategorii"},
      {type:"improve", text:"Zdjęcia inspektora z sekcji Odbiór WM widoczne w galerii z datą i opisem; nazwy plików przy pobieraniu zawierają datę i opis"},
    ],
  },
  {
    date:"2026-05-25", version:"2.22.0", label:"Upload kosztorysu .ath (NORMA)",
    items:[
      {type:"fix", text:"Inspektor i admin — wgrywanie kosztorysów .ath/.nor/.xml: okno plików pokazuje wszystkie pliki (Windows ukrywał .ath przy filtrze rozszerzeń); walidacja po wyborze"},
      {type:"improve", text:"Upload zlecenia/kosztorysu — niezawodny wybór pliku (HiddenFileInput zamiast ukrytego input w label)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.9", label:"Moderator — raport roczny bez PLN/h",
    items:[
      {type:"improve", text:"Archiwum — raport roczny PDF: moderator nie dostaje kafelka „Śr. koszt godz. X PLN/h” (reszta raportu bez zmian)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.8", label:"Sidebar odchudzony — backup w ⚙ i topbarze",
    items:[
      {type:"improve", text:"Sidebar — usunięta sekcja „Dane”; menu i „Bieżący tydzień” znów mieszczą się bez ucinania"},
      {type:"improve", text:"⚙ Super Admin — sekcja „Kopie zapasowe” (przywracanie z chmury / lokalnie, status kopii)"},
      {type:"improve", text:"Górny pasek — eksport i import backupu dla wszystkich adminów (desktop i mobile)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.7", label:"Sidebar — przywrócony prosty układ",
    items:[
      {type:"fix", text:"Sidebar — cofnięte scrollbary i rozbudowane opisy; z powrotem krótko: Tygodniówki / Co 2 tyg. jak wcześniej"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.6", label:"Lista Płac — poprawione sformułowania wypłaty",
    items:[
      {type:"improve", text:"Lista Płac — „Kasa w sobotę” i „Razem w kasie” zastąpione profesjonalnymi: „Wypłata w sobotę”, „Suma wypłaty w sobotę”"},
      {type:"improve", text:"PDF, Word i email — spójna terminologia wypłaty zamiast „kasa”; doprecyzowane etykiety co 2 tyg. (narastająco / bież. i poprzedni tydzień)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.5", label:"Sidebar — przewijanie i krótsze opisy",
    items:[
      {type:"fix", text:"Sidebar — menu i „Bieżący tydzień” przewijają się gdy brakuje miejsca; sekcja „Dane” zawsze widoczna na dole"},
      {type:"improve", text:"Sidebar — krótszy opis wypłaty co 2 tyg. (pełny tekst zostaje na Pulpicie i w Liście Płac)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.4", label:"Kasa w sobotę — liczba osób i opis cyklu",
    items:[
      {type:"improve", text:"Sidebar i Pulpit — przy podziale kasy: Tygodniówki (X os.) i Co 2 tyg. (X os.) oraz linia wyjaśniająca, czy w tę sobotę wypada wypłata co 2 tygodnie, czy kwota przechodzi na następną"},
      {type:"improve", text:"Lista Płac — panel „Kasa w sobotę” z tym samym opisem i liczbą osób"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.3", label:"Pulpit — czytelniejszy kafelek wypłaty",
    items:[
      {type:"improve", text:"Pulpit — kafelek wypłaty: jeden tytuł z datą soboty, większa kwota, jedna linia o wypłacie co 2 tygodnie (bez przeładowania tekstem)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.2", label:"Pulpit — kafelek kasy w sobotę",
    items:[
      {type:"improve", text:"Pulpit — przy wypłacie co 2 tyg.: kafelek „Kasa w sobotę” z podziałem tygodniówki / co 2 tyg. i kwotą narastającą na następną sobotę"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.1", label:"Archiwum — edycja godzin",
    items:[
      {type:"new", text:"Archiwum — klik w pracownika otwiera edycję godzin (Pn–So, Sob.pr., zaliczki, koszty) jak w Liście Płac; sumy tygodnia przeliczają się automatycznie"},
      {type:"improve", text:"Zaległa lista płac w archiwum — badge „zaległość”; flaga backlog zostaje po edycji"},
    ],
  },
  {
    date:"2026-05-25", version:"2.21.0", label:"Wypłata co 2 tygodnie (sobota)",
    items:[
      {type:"new", text:"Kartoteka — opcja „Wypłata co 2 tygodnie” + data pierwszej soboty wypłaty (dla każdego pracownika osobno, nie tylko UK)"},
      {type:"new", text:"Lista płac i sidebar — podział kasy: tygodniówki w sobotę vs co 2 tyg. (narastające / wypłata za 2 tygodnie)"},
      {type:"new", text:"Zaległa lista płac — kreator archiwum poprzedniego tygodnia przed pierwszą wypłatą 2-tygodniową"},
      {type:"improve", text:"PDF, Word i email — oznaczenie pracowników co 2 tyg. i podsumowanie kasy w sobotę"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.8", label:"Logistyka — grafik i statystyka dziś",
    items:[
      {type:"improve", text:"Sidebar „Dziś” — pracownicy z opcją wiele robót/dzień liczą się w pracy także bez wpisu na robocie (lista płac)"},
      {type:"improve", text:"Grafik — dla logistyki zamiast „bez roboty”: Dowóz mat. / wywóz śm. (tylko przy zaznaczonej opcji w kartotece)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.7", label:"SMS — status konta SMSAPI na żywo",
    items:[
      {type:"fix", text:"SMS pilne — niebieski komunikat tylko gdy konto SMSAPI jest nadal ograniczone; po aktywacji zielone „SMSAPI aktywne” z saldem"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.6", label:"Sidebar — dziś na budowach",
    items:[
      {type:"new", text:"Menu boczne — pod „Bieżący tydzień”: ile osób dziś na ilu robotach (z wpisów czasu pracy)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.5", label:"Super Admin — zmiana dokumentów z raportu",
    items:[
      {type:"new", text:"Super Admin może odznaczyć Zakres lub Rysunek/Plan mimo raportu ekipy — po potwierdzeniu w oknie dialogowym"},
      {type:"fix", text:"Zapis dokumentów z pulpitu/Robotów — merge chmura↔local respektuje nowszy updatedAt i override SA (nie ginie po odświeżeniu)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.4", label:"Raport → auto-dokumenty",
    items:[
      {type:"new", text:"Zakres z raportu ekipy automatycznie zaznacza „Zakres robót”; rysunek/wymiary — „Rysunek/Plan” (zielony, bez odznaczenia)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.3", label:"Pulpit — dokumenty zostają na kafelku",
    items:[
      {type:"improve", text:"Uwaga dziś — odhaczony dokument świeci na zielono i zostaje widoczny (klik ponownie = cofnięcie)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.2", label:"Pulpit — szybkie oznaczanie dokumentów",
    items:[
      {type:"new", text:"Uwaga dziś — klik w brakujący dokument od razu oznacza jako odebrany (pasek i licznik bez przechodzenia do Robotów)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.1", label:"Pulpit — braki dokumentów",
    items:[
      {type:"improve", text:"Uwaga dziś — czytelna lista braków dokumentów per robota (pasek postępu, wszystkie brakujące pozycje, sortowanie po pilności)"},
      {type:"improve", text:"Klik w robotę na pulpicie otwiera kartę Roboty z checklistą dokumentów"},
    ],
  },
  {
    date:"2026-05-28", version:"2.20.0", label:"Aplikacja natywna — Capacitor (Android / iOS)",
    items:[
      {type:"new", text:"Szkielet apki mobilnej (Capacitor) — skorupa Android/iOS ładuje UI z wgdom.fun; aktualizacje bez nowej wersji w sklepie"},
      {type:"improve", text:"Natywny status bar i splash; wyłączenie service workera w WebView (stabilniejsze działanie apki)"},
      {type:"new", text:"Instrukcja buildu: docs/MOBILE-NATIVE.md (Android Studio, Xcode, publikacja)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.17", label:"Edycja danych — wszystkie zakładki",
    items:[
      {type:"fix", text:"Zapis lokalny — edycja w tej karcie nie jest już nadpisywana starym localStorage (lista płac, kartoteka, kontakty, roboty, archiwum)"},
      {type:"fix", text:"Panel pracownika — zmiany listy płac / paragonów bez merge ze starą pamięcią"},
      {type:"improve", text:"Sync do chmury — merge localStorage↔React tylko przed pushem (ochrona wielu kart), nie przy każdym kliknięciu"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.16", label:"Lista płac — zaznaczanie dni",
    items:[
      {type:"fix", text:"Lista płac — zaznaczenie dnia (np. czwartek) działa od razu; edycja nie była nadpisywana przez stary wpis z pamięci"},
      {type:"improve", text:"Checkbox dnia — większy obszar dotyku na telefonie (44px)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.15", label:"Mobile i tablet — Android / iOS",
    items:[
      {type:"improve", text:"Telefon i tablet — dolna nawigacja do 768px; sidebar na większych ekranach (wygodniejsze tablety)"},
      {type:"fix", text:"iOS — brak zoomu przy focus w polach formularza (16px, ważniejsze niż text-sm z Tailwind)"},
      {type:"improve", text:"Modale listy płac (dodaj pracownika, nadpisz tydzień) — bottom sheet na mobile; większe przyciski dotykowe (44px)"},
      {type:"improve", text:"PWA — orientacja dowolna; ikony manifest; safe-area i momentum scroll na iOS"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.14", label:"Sync — audyt wszystkich zakładek i paneli",
    items:[
      {type:"fix", text:"Kontakty i archiwum — usunięte wpisy nie wracają z chmury (tombstones jak przy kartotece / robotach)"},
      {type:"fix", text:"Panel inspektora — merge kartoteki z chmurą; panel pracownika — odświeżanie danych po powrocie do karty"},
      {type:"improve", text:"Pełny audyt sync: wszystkie zakładki admina, pracownik, inspektor — bezpieczny zapis przed chmurą"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.13", label:"Inspektor — trwałe usuwanie powiadomień",
    items:[
      {type:"fix", text:"Inspektor — usunięte powiadomienia nie wracają po odświeżeniu / sync z chmurą (ukryte id scalane przy merge robotów)"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.12", label:"Sync — ochrona przed starą kartą w tle",
    items:[
      {type:"fix", text:"Zapis do chmury — ukryta / stara karta nie nadpisuje świeższych danych (localStorage, znaczniki czasu, brak auto-sync w tle)"},
      {type:"improve", text:"Roboty, kartoteka, kontakty, archiwum — scalanie po updatedAt; odświeżenie stanu po powrocie do karty"},
    ],
  },
  {
    date:"2026-05-28", version:"2.19.11", label:"Lista płac — trwały zapis stawek z kartoteki",
    items:[
      {type:"fix", text:"Lista płac — stawki zsynchronizowane z kartoteki nie wracają po dniu / odświeżeniu (osobny znacznik czasu stawki vs godzin; ochrona przed starą kartą w tle)"},
      {type:"improve", text:"„Stawki z kartoteki” — natychmiastowy zapis do chmury i aktualizacja archiwum bieżącego tygodnia"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.10", label:"Lista płac — zapis godzin i odznaczanie dni",
    items:[
      {type:"fix", text:"Lista płac — odznaczenie dnia (np. czwartek) i zmiana godzin zostają po odświeżeniu; chmura nie przywraca starego wpisu"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.9", label:"Lista płac — zapis stawek",
    items:[
      {type:"fix", text:"Lista płac — zmiana stawki w tygodniu nie znika po odświeżeniu (sync z chmurą nie nadpisywał stawki przy tych samych godzinach)"},
      {type:"new", text:"Lista płac — przycisk „Stawki z kartoteki” (wyrównanie stawek tygodnia do domyślnych z Pracownicy)"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.8", label:"Reset kodów pracowników",
    items:[
      {type:"improve", text:"Jednorazowy reset wszystkich kodów PIN pracowników — przy pierwszym wejściu po aktualizacji każdy ustawia kod od nowa"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.7", label:"Naprawa logowania pracownika",
    items:[
      {type:"fix", text:"Logowanie pracownika — naprawiony brakujący hash PIN (przycisk Zaloguj działał jak martwy)"},
      {type:"improve", text:"Przycisk logowania aktywny po wyborze profilu — walidacja telefonu/kodu z komunikatem"},
    ],
  },
  {
    date:"2026-05-27", version:"2.19.6", label:"Inspektor — paginacja aktywności",
    items:[
      {type:"improve", text:"Admin → Inspektor → Aktywność: 10 wpisów na stronę z numeracją stron"},
      {type:"new", text:"Usuwanie pojedynczych wpisów aktywności inspektora (kosz → potwierdź)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.5", label:"Roboty — lokal i kuchenka",
    items:[
      {type:"new", text:"Roboty — typ lokalu (Zamienny / Komunalny / Repatrianci) — obowiązkowy przed zdaniem"},
      {type:"new", text:"Roboty — kuchenka (gaz / elektr. / 2 paln.) — kompaktowy wybór w karcie roboty"},
      {type:"improve", text:"Inspektor i Admin → Inspektor — ten sam wybór lokalu i kuchenki; sync z Robotami przez chmurę"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.4", label:"SMS — komunikat trybu testowego SMSAPI",
    items:[
      {type:"improve", text:"SMS pilne — wyraźniejszy błąd gdy konto SMSAPI jest testowe (tylko numer z rejestracji)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.3", label:"SMS — zespół + poprawka zaznaczania",
    items:[
      {type:"improve", text:"SMS pilne — lista obejmuje też adminów, moderatorów, super admina i inspektorów (numery z ⚙ Super Admin)"},
      {type:"fix", text:"SMS — „Wyczyść wybór” naprawdę odznacza wszystkich; domyślnie zaznaczeni wszyscy z numerem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.2", label:"SMS — naprawa pola nadawcy SMSAPI",
    items:[
      {type:"fix", text:"SMSAPI — retry bez błędnego SMSAPI_FROM; czytelniejsze komunikaty (konto testowe, zły nadawca)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.1", label:"Naprawa wyboru zdjęć z galerii",
    items:[
      {type:"fix", text:"Roboty → raport → Foto rysunku / Z galerii — niezawodny wybór pliku na Windows (admin i pracownik)"},
      {type:"fix", text:"Privacy shield pracownika nie blokuje ekranu podczas systemowego okna wyboru pliku"},
    ],
  },
  {
    date:"2026-05-26", version:"2.19.0", label:"Pakiet dokumentów + SMS pilne",
    items:[
      {type:"new", text:"Roboty — „Pakiet ZIP” jednym kliknięciem: zlecenie, kosztorys, zdjęcia inspektora i zatwierdzone, checklist w README"},
      {type:"new", text:"Pulpit i Pracownicy — „SMS pilne”: ogłoszenie do wszystkich aktywnych lub wybranych (SMSAPI / Twilio w Supabase)"},
      {type:"improve", text:"Endpoint send-sms-bulk — max 50 odbiorców, prefiks SMS_PREFIX opcjonalny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.1", label:"Inspektor — mobile UX",
    items:[
      {type:"improve", text:"Kapsułki sekcji i szybkie akcje — min. 44 px (wygodny dotyk na iPhone/Android)"},
      {type:"new", text:"Baner „Dodaj na ekran główny” w panelu inspektora (iOS + Android PWA)"},
      {type:"new", text:"Pull-to-refresh — ciągnij w dół na liście, w robocie i w Portfolio"},
    ],
  },
  {
    date:"2026-05-26", version:"2.18.0", label:"Inspektor — nawigacja i sekcje",
    items:[
      {type:"new", text:"Panel inspektora — dolny pasek: Robót | Portfolio | Pomoc (jak aplikacja mobilna)"},
      {type:"new", text:"Szczegóły roboty — kapsułki sekcji (WM, Pliki, Dok., Ekipa, Raporty, Zdjęcia) z przewijaniem i badge’ami braków"},
      {type:"improve", text:"Szybkie akcje na robocie (wgraj zlecenie, odpowiedź admina…) + wyróżnienie kart z nową notatką"},
    ],
  },
  {
    date:"2026-05-26", version:"2.17.0", label:"Raport — zakres jak w notatniku",
    items:[
      {type:"improve", text:"Zakres prac — jedno pole tekstowe z listą (kropki, numeracja, podpunkty →); Enter kontynuuje styl listy"},
      {type:"improve", text:"Wklejanie z Notatek / Worda — enter i listy zostają; kropki i numeracja się porządkują"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.1", label:"Telefony — przypisane do osób, nie ról",
    items:[
      {type:"improve", text:"⚙ Super Admin — numer telefonu przy każdym koncie użytkownika (admin, moderator, inspektor), nie ogólnie per rola"},
      {type:"fix", text:"Panel inspektora synchronizuje numery kont z chmury przy odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.16.0", label:"Inspektor — autor treści + telefon kontaktu",
    items:[
      {type:"new", text:"Panel inspektora — przy każdej treści (raport, zdjęcie, plik, notatka) widać kto dodał; najechanie = numer telefonu"},
      {type:"new", text:"⚙ Super Admin — numer telefonu przypisany do każdego użytkownika (sync w chmurze)"},
      {type:"improve", text:"Raporty z Roboty — admin zapisuje własne imię i rolę zamiast ogólnego „Administrator”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.2", label:"Inspektor — naprawa wyśrodkowania",
    items:[
      {type:"fix", text:"Zakładka Inspektor — flex-1 w-full jak Kontakty; treść wyśrodkowana w obszarze obok menu, nie przyklejona do sidebara"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.1", label:"Inspektor — wyśrodkowany layout",
    items:[
      {type:"improve", text:"Zakładka Inspektor (Aktywność, Portfolio WM, szczegóły roboty) — zawartość wyśrodkowana jak Kontakty i Zmiany (max-w-4xl)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.15.0", label:"WM — workflow tylko w Inspektorze",
    items:[
      {type:"improve", text:"Roboty WM — kompaktowy pasek (etap, termin, link) zamiast pełnego panelu inspektora"},
      {type:"improve", text:"Inspektor (admin) — szczegóły roboty WM in-tab: etap, notatki, pliki, upload zlecenia/kosztorysu"},
      {type:"improve", text:"Pulpit — alerty WM i notatki inspektora otwierają robotę w zakładce Inspektor, nie w Robotach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.14.0", label:"Pliki inspektora — podgląd, pobieranie, email ATH",
    items:[
      {type:"new", text:"Roboty — sekcja „Pliki inspektora”: pobierz, podgląd PDF, wyślij na email (pojedynczo lub zaznaczone)"},
      {type:"new", text:"Podgląd kosztorysów ATH/NOR/XML (best-effort) — włączany w ⚙ Super Admin (domyślnie wył.)"},
      {type:"new", text:"Email z załącznikami plików inspektora (zlecenie, kosztorys, zdjęcia) — endpoint send-job-files-email"},
      {type:"improve", text:"Upload kosztorysu — akceptuje pliki .ath (NORMA)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.13.0", label:"Inspektor — komunikacja, feed, upload admina",
    items:[
      {type:"new", text:"Inspektor — alert gdy admin odpowie w notatkach + mini-historia zmian na karcie roboty"},
      {type:"new", text:"Admin może wgrać zlecenie/kosztorys w Robotach; sugestia etapu po uploadzie zlecenia"},
      {type:"new", text:"Pulpit — kafelek „Aktywne WM” → Portfolio WM"},
      {type:"improve", text:"Badge Inspektor = nieprzeczytane (feed + notatki), nie cała historia"},
      {type:"improve", text:"Feed Inspektor: filtry Etapy/Notatki/Zdjęcia; „Oznacz przeczytane” zamiast auto przy wejściu"},
      {type:"improve", text:"Instrukcja inspektora v2.11 (etapy, notatki, portfolio, zdjęcia); dymki ? na tap mobile"},
      {type:"improve", text:"„Przeczytane” alertów sync w chmurze per admin/inspektor; merge etapów = ostatnia zmiana w activityLog"},
      {type:"improve", text:"Statystyki logowań inspektora — przycisk Odśwież w zakładce Inspektor"},
    ],
  },
  {
    date:"2026-05-26", version:"2.12.0", label:"WM — Pulpit alerty, live sync, spójność statusów",
    items:[
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty WM: termin odbioru minął + odbiór w tym tygodniu (link do roboty i Portfolio WM)"},
      {type:"new", text:"Panel inspektora — live sync: odświeżanie przy powrocie do karty, co 45 s, przycisk Odśwież"},
      {type:"improve", text:"Roboty WM — etap odbioru jako jedyne źródło statusu (bez auto-zdania przy dokumentach); naprawa niespójności przy ładowaniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.11.0", label:"WM — etapy odbioru, notatki, portfolio",
    items:[
      {type:"new", text:"Etap odbioru WM — wspólny status (zlecenie → realizacja → dokumenty → gotowa → odebrana) dla inspektora i admina"},
      {type:"new", text:"Notatki Inspektor ↔ Admin przy robocie + alert na Pulpicie"},
      {type:"new", text:"Planowana data odbioru WM + Portfolio WM (zbiorczy widok braków i terminów)"},
      {type:"new", text:"Zdjęcia inspektora — osobna galeria (usterki, odbiór), upload z telefonu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.3", label:"Inspektor — statystyki, alerty, instrukcja",
    items:[
      {type:"new", text:"Admin → Inspektor: statystyki logowań i wejść (7 dni, ostatnie logowanie, per użytkownik)"},
      {type:"new", text:"Pulpit „Uwaga dziś” — alerty gdy inspektor coś zmienił/wgrał (link do roboty i zakładki Inspektor)"},
      {type:"new", text:"Panel inspektora — instrukcja krok po kroku, baner pierwszego wejścia, dymki ? przy sekcjach"},
      {type:"improve", text:"Liczenie logowań/wejść sync w chmurze (kw-inspector-stats)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.2", label:"Roboty ↔ Inspektor — wspólne dane",
    items:[
      {type:"improve", text:"Roboty — sekcja Zlecenie · Kosztorys (ptaszki, pliki inspektora, link do osi Inspektor); ta sama siatka dokumentów też się aktualizuje"},
      {type:"improve", text:"Lista robót — badge Zlec./Kosz. na każdej karcie (zielony ptaszek gdy inspektor zaznaczy lub wgra plik)"},
      {type:"fix", text:"Sync chmury — merge dokumentów (OR) i jobFiles między adminem a inspektorem; wgrany plik auto-zaznacza dokument"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.1", label:"Admin — zakładka Inspektor",
    items:[
      {type:"new", text:"Menu Inspektor — oś czasu zmian inspektora (dokumenty, zlecenia PDF, kosztorysy) z linkiem do roboty"},
      {type:"improve", text:"Historia w Robotach — bez wpisów inspektora; skrót „X zmian inspektora → zakładka Inspektor”"},
      {type:"improve", text:"Inspektor przy zapisie loguje aktywność do activityLog (sync w chmurze z robotą)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.10.0", label:"Panel Inspektora — Wrocławskie Mieszkania",
    items:[
      {type:"new", text:"Logowanie Inspektor — osobny panel dla Szymona Szóstaka (bez stawek pracowników, z telefonami na robocie)"},
      {type:"new", text:"Inspektor — lista robót, galeria zdjęć z pobieraniem, checklista dokumentów, zakresy i wymiary z raportów"},
      {type:"new", text:"Zlecenie PDF — checkbox + upload; kosztorys NORMA/PDF — ikona statusu i wrzucanie pliku przy robocie"},
      {type:"new", text:"Rola Inspektor w ustawieniach ⚙ — Super Admin może dodać kolejnych inspektorów (hasło sync w chmurze)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.21", label:"Mobile iOS/Android — pracownik i admin",
    items:[
      {type:"improve", text:"Pracownik — sticky powrót z roboty, większe przyciski (44px), zakładki 48px, fix podwójnego znaku wodnego w kolejce offline"},
      {type:"improve", text:"Admin mobile — dolne menu: Pulpit / Lista / Grafik / Roboty + Więcej (6 pozycji); ustawienia ⚙ jako sheet od dołu"},
      {type:"fix", text:"iOS — 100dvh + safe-area na logowaniu, font 16px w polach (bez zoom przy focus)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.20", label:"Super Admin — role i nowi użytkownicy",
    items:[
      {type:"new", text:"Ustawienia ⚙ — zmiana roli Administrator ↔ Moderator (Stanisław, Paweł, dodani użytkownicy)"},
      {type:"new", text:"Kreator konta — login, hasło, poziom (Administrator lub Moderator)"},
      {type:"improve", text:"Nowi użytkownicy i role sync w chmurze (kw-admin-users-config)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.19", label:"Super Admin — zmiana haseł użytkowników",
    items:[
      {type:"new", text:"Ikona ustawień (⚙) w prawym górnym rogu — tylko dla Super Administratora"},
      {type:"new", text:"Panel haseł: zmiana hasła dla Dawida, Stanisława i Pawła + przywrócenie hasła startowego"},
      {type:"improve", text:"Hasła adminów sync w chmurze (kw-admin-passwords) — działają na wszystkich urządzeniach"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.18", label:"Panel admin — 3 użytkowników i role",
    items:[
      {type:"new", text:"Logowanie admina — wybór użytkownika (Dawid / Stanisław / Paweł) + hasło (SHA-256, bez plain text w kodzie)"},
      {type:"new", text:"Role: Super Administrator, Administrator, Moderator — moderator bez podglądu stawek PLN/h"},
      {type:"improve", text:"Moderator — ukryte stawki w kartotece, liście płac, robotach; eksport PDF/Word tylko dla adminów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.17", label:"Panel pracownika — grafik, paragony, status zdjęć",
    items:[
      {type:"new", text:"Tryb pracownika — „Gdzie dziś pracuję?”: adres i godziny z grafiku / wpisu na robocie"},
      {type:"new", text:"Zakładka Grafik — własny tydzień Pn–So (godziny + adresy robót)"},
      {type:"new", text:"Skan paragonu (chemia, paliwo) → koszty do zwrotu u admina po akceptacji"},
      {type:"improve", text:"Pulpit „Uwaga dziś” — alerty: zdjęcia do akceptacji, nowe raporty od pracowników, paragony/faktury"},
      {type:"improve", text:"Status zdjęć z opisem (oczekuje / zaakceptowane / odrzucone) + powód odrzucenia od admina"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.16", label:"Kartoteka — trwałe usuwanie i sync",
    items:[
      {type:"fix", text:"Usunięcie pracownika z kartoteki nie wraca po wylogowaniu — tombstones kw-directory-deleted-ids (jak przy robotach)"},
      {type:"fix", text:"Edycja telefonu / danych pracownika — zapis od razu po „Zapisz”, logowanie pracownika scala z lokalnym stanem"},
      {type:"fix", text:"Serwer Supabase — akceptuje celowe skrócenie kartoteki z listą usuniętych id"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.15", label:"Konto testowe pracownika",
    items:[
      {type:"new", text:"Kartoteka — „Konto testowe”: tylko tryb pracownika (zdjęcia, raporty), bez listy płac, grafiku, pulpitu i wpisów na robotach"},
      {type:"improve", text:"Auto-wykrywanie konta test (imię „test”, telefon +48 000 000 000) — oznaczenie TEST w kartotece"},
      {type:"improve", text:"Istniejący wpis test na liście płac jest automatycznie usuwany po odświeżeniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.14", label:"Kod pracownika 4 cyfry",
    items:[
      {type:"new", text:"Logowanie pracownika — telefon + osobisty kod 4 cyfry; pierwsze logowanie: pracownik ustawia kod sam"},
      {type:"new", text:"Kartoteka — admin ustawia lub resetuje kod pracownika; dymki pomocnicze przy polach"},
      {type:"improve", text:"Instrukcja — opis logowania, kodu, resetu i funkcji trybu pracownika (Roboty / Wypłata)"},
      {type:"fix", text:"Odtwarzacz hymnów — panel nie jest przycinany (portal fixed)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.3", label:"Logistyka — bez alertów spójności",
    items:[
      {type:"improve", text:"Pracownik z „Wiele robót dziennie” nie pojawia się w alertach spójności na Pulpicie — wystarczy lista płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.13", label:"Odtwarzacz hymnow",
    items:[
      {type:"new", text:"Pasek górny — dyskretny odtwarzacz 4 hymnow firmowych (play, lista, głośność); muzyka w public/music"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.12", label:"Menu — podpowiedzi",
    items:[
      {type:"improve", text:"Lewe menu — po najechaniu delikatny dymek z opisem każdej zakładki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.11", label:"Galeria zdjęć z robot",
    items:[
      {type:"new", text:"Menu „Zdjęcia” — galeria zaakceptowanych zdjęć pogrupowanych po robotach (Przed / W trakcie / Po)"},
      {type:"new", text:"Po zdaniu mieszkania i kluczy zdjęcia zostają w galerii 30 dni, potem przechodzą do archiwum zdjęć"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.10", label:"Roboty — trwałe usuwanie",
    items:[
      {type:"fix", text:"Usunięte roboty nie wracają po odświeżeniu — zapis do chmury z listą skasowanych id (wymaga deploy funkcji Supabase)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.9", label:"Roboty — usuwanie duplikatów",
    items:[
      {type:"fix", text:"PDF listy płac — scalanie zduplikowanych wpisów tego samego adresu w siatce robót"},
      {type:"improve", text:"Roboty — kosz na liście do usunięcia całej roboty; oznaczenie „Duplikat adresu” gdy ten sam adres jest dwa razy"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.8", label:"PDF — przywrócony układ",
    items:[
      {type:"fix", text:"PDF/Word — cofnięty eksperymentalny układ z v2.9.7; z powrotem ten sam układ co wcześniej, tylko +2 pt czcionki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.7", label:"PDF — roboty i łamanie stron",
    items:[
      {type:"fix", text:"PDF listy płac — przywrócona tabela „Praca na robotach” (kto, gdzie, godziny) + siatka tygodniowa"},
      {type:"fix", text:"PDF — moduły nie ucinają się przy większej czcionce; nagłówek sekcji osobno, tabela łamie wiersze między stronami"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.6", label:"PDF/Word — większa czcionka",
    items:[
      {type:"improve", text:"Lista płac PDF i Word — powiększone czcionki w tabelach i załącznikach (lepsza czytelność na wydruku)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.5", label:"Pulpit — link do robot",
    items:[
      {type:"improve", text:"Pulpit — alert „Brak dokumentów”: link „Roboty →” jak przy innych alertach w sekcji Uwaga dziś"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.4", label:"Alerty — piątek i sobota",
    items:[
      {type:"improve", text:"Pulpit — alert „Tydzień niezapisany” tylko w sobotę (Pn–Pt tydzień zapisuje się automatycznie w sobotę)"},
      {type:"improve", text:"Pulpit — alert „Nierozliczeni pracownicy” tylko w piątek (dzień rozliczeń)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.2", label:"Logistyka — wiele robót dziennie",
    items:[
      {type:"new", text:"Pracownicy — opcja „Wiele robót dziennie” (kierowca, dostawy): spójność liczy sumę ze wszystkich adresów"},
      {type:"improve", text:"„Popraw” przy spójności — dla logistyki rozdziela godziny z listy płac między roboty (nie jedna robota)"},
      {type:"improve", text:"Roboty — krótki wpis na robocie (domyślnie 2 h) dla pracownika z wieloma robotami dziennie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.1", label:"Spójność — Popraw + 9 h",
    items:[
      {type:"new", text:"Pulpit — przy rozbieżności godzin przycisk „Popraw”: dopasowuje roboty do listy płac (lista płac ma pierwszeństwo)"},
      {type:"improve", text:"Roboty — domyślnie 9 h przy dodawaniu wpisu; „Wczoraj → dziś” i ręczny wpis biorą godziny z listy płac gdy są"},
    ],
  },
  {
    date:"2026-05-26", version:"2.9.0", label:"Pulpit, kartoteka, archiwum",
    items:[
      {type:"new", text:"Pulpit — sekcja „Uwaga dziś”: niezapisany tydzień, nierozliczeni, spójność listy płac ↔ roboty, dokumenty, zdjęcia"},
      {type:"new", text:"Pulpit — alerty rozbieżności godzin (lista płac vs wpisy na robotach)"},
      {type:"new", text:"Pulpit — banner w sobotę: przypomnienie o zapisaniu tygodnia i rozliczeniu pracowników"},
      {type:"new", text:"Pracownicy — karta z archiwum: roczne godziny, wypłaty, wykres miesięczny, lista tygodni"},
      {type:"new", text:"Archiwum — raport roczny PDF: wypłaty × 12 miesięcy, roboty zdane, średni koszt roboczogodziny"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.1", label:"PDF — siatka pracy na robotach",
    items:[
      {type:"improve", text:"Lista płac PDF — ostatnia strona: siatka tygodniowa (pracownik × dni Pn–So) zamiast długiej listy wiersz po wierszu; uwagi osobno na dole"},
    ],
  },
  {
    date:"2026-05-26", version:"2.8.0", label:"PDF — praca na robotach",
    items:[
      {type:"new", text:"Lista płac PDF — ostatnia strona: kto, na jakiej robocie, ile godzin i koszt (z wpisów w kartach robót)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.9", label:"Lista płac — podgląd PDF",
    items:[
      {type:"new", text:"Lista płac — „Podgląd PDF” w dużym oknie aplikacji (przewijanie, pobieranie z podglądu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.8", label:"Lista płac — logo w eksporcie",
    items:[
      {type:"improve", text:"PDF, Word i email listy płac — logo W&G DOM obok tytułu „Lista płac”"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.7", label:"Historia zmian — paginacja",
    items:[
      {type:"improve", text:"Zakładka Zmiany — domyślnie 10 wpisów na stronie, przełączanie stron na dole, wybór 10 / 20 / 50 wpisów"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.6", label:"Lista płac — bez stanowiska",
    items:[
      {type:"improve", text:"Logowanie pracownika — na liście widać tylko imię, bez stanowiska"},
      {type:"improve", text:"PDF, Word i e-mail listy płac — usunięto kolumnę Stanowisko ze wszystkich tabel"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.5", label:"PDF/Word — tabela tygodniowa",
    items:[
      {type:"improve", text:"Strona 2 listy płac — jedna tabela: pracownicy w wierszach, dni Pn–So w kolumnach (od–do, dodatkowe, suma dnia)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.4", label:"PDF/Word — rozpis po dniach",
    items:[
      {type:"new", text:"Lista płac PDF i Word — strona 2: szczegółowy rozpis Pn–So (dzień, od–do, podstawa / dodatkowo, zaliczka, uwagi)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.3", label:"Pulpit — poprawne adresy pracowników",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie myli np. „Tomek od Mikołaja” z innym Tomkiem — dopasowanie po ID kartoteki, nie samym imieniu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.2", label:"Pełna ochrona danych w chmurze",
    items:[
      {type:"fix", text:"Każdy zapis do chmury scala dane — pustsza wersja z innej karty nie nadpisze listy płac, archiwum, pracowników ani kontaktów"},
      {type:"new", text:"Kopie prev/prev2 w Supabase dla wszystkich kluczy + dzienny pełny backup (kw-full-day)"},
      {type:"new", text:"Lokalna kopia wszystkich danych przed synchronizacją (to urządzenie)"},
      {type:"new", text:"Menu Dane → „Przywróć wszystkie dane (chmura / lokalnie)”"},
      {type:"improve", text:"Import backup JSON scala pracowników i kontakty z obecnymi danymi"},
      {type:"improve", text:"Start aplikacji (CloudLoader) scala wszystkie typy danych, nie tylko roboty"},
    ],
  },
  {
    date:"2026-05-26", version:"2.7.0", label:"Email listy płac + uprawnienia kontaktów",
    items:[
      {type:"new", text:"Lista płac — przycisk Email: wyślij PDF i/lub Word jako załączniki, treść maila z tabelą jak w PDF"},
      {type:"new", text:"Kontakty — uprawnienia Roboty / Lista płac (osobne listy odbiorców przy wysyłce)"},
      {type:"improve", text:"Eksport PDF/Word listy płac — wspólny moduł (ten sam układ co w emailu)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.7", label:"Lista płac — poprawki UI",
    items:[
      {type:"fix", text:"Status Rozliczony / Oczekuje — pełny napis, bez przycinania w tabeli"},
      {type:"new", text:"Sob. poprz. — „+ Opis” zamiast dodatkowych godzin (notatka o pracy lub wypożyczonych ludziach)"},
      {type:"improve", text:"Panel edycji godzin szerszy — lista płac zwęża się po kliknięciu pracownika; bez poziomego przewijania"},
      {type:"new", text:"Opisy Sob. poprz. w eksporcie PDF i Word"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.6", label:"Sobota poprzedniego tygodnia (Sob.pr.)",
    items:[
      {type:"new", text:"Lista płac — pole Sob. poprz. (sobota z poprzedniego tygodnia, wypłata w bieżącym) z dodatkowymi godzinami i opisem"},
      {type:"new", text:"Osobne sumy: tydzień Pn–So, Sob.pr. i razem — w tabeli, panelu, PDF i Word"},
      {type:"improve", text:"Bieżąca sobota (So) pozostaje w tygodniu — dla wypłat w sobotę zamiast w piątek"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.5", label:"Instrukcja — pełna aktualizacja",
    items:[
      {type:"improve", text:"Instrukcja obsługi uzupełniona o wszystkie funkcje z v2.6.0–2.6.4: wypłata pracownika, koszty, dodatkowe godziny, backup w sobotę, zapamiętaj hasło"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.4", label:"Dodatkowe godziny w dniu",
    items:[
      {type:"new", text:"Lista płac — dodatkowe godziny przypisane do konkretnego dnia (opis + godziny od–do), wliczane do wypłaty"},
      {type:"improve", text:"Grafik i sumy godzin uwzględniają dodatkowe bloki; PDF/Word — tabela szczegółów pod listą płac"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.3", label:"Backup w sobotę + koszty do zwrotu",
    items:[
      {type:"improve", text:"Backup emailem — raz w tygodniu w sobotę, po zapisie tygodnia do archiwum (bez codziennych maili)"},
      {type:"new", text:"Lista płac — koszty do zwrotu pracownikowi (chemia, paliwo, zakupy) — dopłata do wypłaty, osobno od zaliczki"},
      {type:"improve", text:"Kolumna Koszty w tabeli, PDF/Word, archiwum i profil wypłaty pracownika"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.2", label:"Lista płac — panel edycji pracownika",
    items:[
      {type:"fix", text:"Panel boczny (godziny, zaliczki) — przewijanie w pionie i poziomie; szerszy panel na laptopie"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.1", label:"Zapamiętaj hasło admina",
    items:[
      {type:"new", text:"Logowanie administratora — opcja „Zapamiętaj hasło na tym urządzeniu” (szyfrowane lokalnie, bez chmury)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.6.0", label:"Profil wypłaty pracownika",
    items:[
      {type:"new", text:"Zakładka Wypłata u pracownika — kwota do wypłaty w piątek, godziny i tydzień"},
      {type:"new", text:"Archiwum wypłat pracownika — historia zapisanych tygodni z listy płac"},
      {type:"new", text:"Ochrona danych wypłat — ukrywanie przy przełączeniu aplikacji, zakaz kopiowania, komunikat o zrzutach ekranu"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.6", label:"Pracownik — głos i rysunek z galerii",
    items:[
      {type:"fix", text:"iPhone: mikrofon nie zawiesza strony — dyktowanie przez 🎤 na klawiaturze (Web Speech API wyłączone na iOS)"},
      {type:"new", text:"Rysunek w raporcie — wybór: zrób zdjęcie aparatem albo wrzuć wcześniejsze z galerii"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.5", label:"Galeria zdjęć na robocie",
    items:[
      {type:"improve", text:"Zdjęcia pogrupowane: Przed remontem · Po remoncie · W trakcie"},
      {type:"improve", text:"Usuwanie zdjęcia — przycisk ✕ na miniaturze zamiast listy pod spodem"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.4", label:"Pracownicy na robocie — grupowanie",
    items:[
      {type:"improve", text:"Wpisy pracy grupowane po pracowniku — jeden wiersz z sumą zamiast długiej listy"},
      {type:"new", text:"Rozwijana lista dni — kliknij pracownika z wieloma wpisami, aby zobaczyć daty, godziny i stawki"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.3", label:"Szybsze wpisy pracowników na robocie",
    items:[
      {type:"improve", text:"Domyślnie 9 godzin przy dodawaniu wpisu (zamiast 8)"},
      {type:"new", text:"„Wczoraj → dziś” — jednym kliknięciem skopiuj wszystkich z wczoraj na dziś (te same stawki i godziny)"},
      {type:"new", text:"Ikona kopiowania przy wierszu — przenieś jednego pracownika na dziś"},
      {type:"new", text:"„Z listy płac” — dodaj na robocie wszystkich zaznaczonych dziś w liście płac (godziny z grafiku lub 9 h)"},
    ],
  },
  {
    date:"2026-05-26", version:"2.5.2", label:"Pulpit — adres tylko z dzisiejszego wpisu",
    items:[
      {type:"fix", text:"„Pracuje dziś” nie pokazuje adresu z innych dni tygodnia — tylko wpis z datą dzisiejszą"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5.1", label:"Ochrona przed utratą robót",
    items:[
      {type:"fix", text:"Chmura nie nadpisze wielu robót jedną — serwer scala dane przy podejrzanym zapisie"},
      {type:"new", text:"Automatyczne kopie: kw-jobs-prev, prev2 i dzienna w Supabase przy każdym zapisie"},
      {type:"new", text:"Lokalne kopie robót (12 ostatnich) przed synchronizacją z chmurą"},
      {type:"new", text:"Przywróć roboty (chmura / lokalnie) — menu Dane w sidebarze"},
      {type:"improve", text:"Start aplikacji scala lokalne i chmurowe roboty zamiast ślepo nadpisywać"},
      {type:"improve", text:"Backup email codziennie przy pierwszym wejściu (nie tylko w poniedziałek)"},
    ],
  },
  {
    date:"2026-05-25", version:"2.5", label:"Pulpit → robota, link klienta, PWA, offline, historia",
    items:[
      {type:"new", text:"Klik z pulpitu otwiera konkretną robotę (zdjęcia, raporty, brak dokumentów, lista aktywnych)"},
      {type:"new", text:"Link podglądu dla klienta — tylko zaakceptowane zdjęcia i raporty (?podglad=TOKEN)"},
      {type:"new", text:"PWA „Dodaj na ekran” — baner instalacji dla pracowników (Android + instrukcja iOS)"},
      {type:"new", text:"Kolejka zdjęć offline — pracownik bez sieci; auto-wysyłka po powrocie internetu"},
      {type:"new", text:"Historia roboty — log zdarzeń (zdjęcia, dokumenty, email, link, status)"},
      {type:"new", text:"Przypomnienie o brakujących dokumentach po 7+ dniach (pulpit i karta roboty)"},
      {type:"new", text:"Notatka głosowa w raporcie pracownika — zakres prac i wiadomość dla admina"},
      {type:"new", text:"Watermark na zdjęciach — adres, data i W&G DOM przed wysłaniem"},
    ],
  },
  {
    date:"2026-05-25", version:"2.4", label:"Email z roboty + lista kontaktów",
    items:[
      {type:"new", text:"Zakładka Kontakty — lista odbiorców email (nazwa, adres, firma)"},
      {type:"new", text:"Przy robocie: przycisk Email — wybór odbiorcy i zaznaczenie zdjęć, zakresu, wymiarów, rysunku"},
      {type:"improve", text:"Można wysłać wszystko lub pojedyncze pozycje; pusty email nie zostanie wysłany"},
    ],
  },
  {
    date:"2026-05-25", version:"2.3", label:"Nowy pulpit — czytelniejszy układ",
    items:[
      {type:"improve", text:"Pulpit przeprojektowany: nagłówek z datą, skróty Grafik / Lista płac / Roboty"},
      {type:"new", text:"Sekcja „Wymaga uwagi”: zdjęcia do akceptacji, raporty pracowników (14 dni), brakujące dokumenty"},
      {type:"improve", text:"„Pracuje dziś” — tylko aktywni (bez długiej listy „wolne”), link do grafiku"},
      {type:"improve", text:"Lista robót z etykietami raportów i oczekujących zdjęć; finanse i archiwum na dole"},
    ],
  },
  {
    date:"2026-05-25", version:"2.2", label:"Edycja raportów i opisy pracownika",
    items:[
      {type:"new", text:"Pracownik może edytować i usuwać swoje raporty (ikona ołówka / kosz)"},
      {type:"new", text:"Opisy: do każdego punktu zakresu, pomieszczenia, rysunku i całego raportu (wiadomość dla admina)"},
      {type:"new", text:"Opisy zdjęć — przy galerii (każde zdjęcie), aparacie i po wgraniu (edycja + usunięcie)"},
      {type:"improve", text:"Admin widzi wszystkie opisy w raportach i pod zdjęciami"},
    ],
  },
  {
    date:"2026-05-25", version:"2.1", label:"Raport admina + uproszczenie robót",
    items:[
      {type:"new", text:"Admin może dodać raport (zakres + wymiary / rysunek) bezpośrednio w Roboty — ten sam formularz co pracownik"},
      {type:"improve", text:"Sekcja raportów: formularz u góry, lista zapisanych poniżej"},
      {type:"improve", text:"Usunięto sekcję Faktura / Rozliczenie z klientem z karty roboty i pulpit"},
    ],
  },
  {
    date:"2026-05-25", version:"2.0", label:"Raporty pracownika — zakres prac i wymiary",
    items:[
      {type:"new", text:"Tryb pracownika: raport z budowy — punkty wykonanych prac + wymiary pomieszczeń (salon, pokoje, kuchnia, korytarz, łazienka, WC)"},
      {type:"new", text:"Alternatywa do wpisywania: zdjęcie rysunku z wymiarami"},
      {type:"new", text:"Panel admina: sekcja „Raporty pracowników” przy robocie — rozwijana lista z datą, zakresem, tabelą wymiarów i rysunkiem"},
      {type:"improve", text:"Lista robót — etykieta z liczbą raportów; pracownik widzi swoje wysłane raporty"},
    ],
  },
  {
    date:"2026-05-25", version:"1.9", label:"Pełne archiwum tygodnia",
    items:[
      {type:"new", text:"Archiwum zapisuje cały tydzień: lista płac (dni, godziny, zaliczki) + grafik + wpisy na robotach"},
      {type:"new", text:"W Archiwum po rozwinięciu tygodnia: zakładki Lista płac | Grafik"},
      {type:"improve", text:"Auto-zapis w sobotę — pełny snapshot bieżącego tygodnia do archiwum"},
      {type:"improve", text:"Przejście na nowy tydzień nadal archiwizuje poprzedni (z pełnymi danymi)"},
      {type:"new", text:"Gotowość pod Vercel + GitHub — konfiguracja przez zmienne VITE_SUPABASE_*"},
    ],
  },
  {
    date:"2026-05-25", version:"1.8", label:"Grafik tygodniowy",
    items:[
      {type:"new", text:"Zakładka Grafik — siatka dni × pracownicy: godziny z listy płac + adres roboty"},
      {type:"new", text:"Przewijanie poziome na telefonie, sticky kolumna z imionami, podświetlenie dzisiejszego dnia"},
      {type:"improve", text:"Ten sam wybór tygodnia co Lista Płac (daty od–do, bieżący tydzień)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.7", label:"Logowanie pracownika & galeria zdjęć",
    items:[
      {type:"new", text:"Pracownik wybiera się z listy kartoteki — hasło to 9 ostatnich cyfr telefonu (bez +48)"},
      {type:"new", text:"Galeria — wybór wielu zdjęć naraz, podgląd przed wysłaniem i pasek postępu"},
      {type:"improve", text:"Bez numeru w kartotece pracownik nie może się zalogować (komunikat dla admina)"},
    ],
  },
  {
    date:"2026-05-25", version:"1.6", label:"Zasady rozwoju & spójna dokumentacja",
    items:[
      {type:"new", text:"Moduł cloud-sync — jeden punkt zapisu do chmury Supabase dla wszystkich danych"},
      {type:"improve", text:"Ustalone zasady: każda trwała zmiana → chmura, wpis w Zmianach, opis w Instrukcji"},
      {type:"new", text:"Instrukcja: sekcje „Historia zmian” i „Co zapisuje się w chmurze”"},
      {type:"fix", text:"Logo aplikacji — poprawiona ścieżka do pliku w projekcie"},
      {type:"fix", text:"Pulpit — lepsze dopasowanie pracownika do roboty (imię, kartoteka, data lokalna, wpisy z tygodnia)"},
      {type:"new", text:"Pulpit — przy „Pracuje dziś” widać ulicę roboty, jeśli pracownik ma wpis czasu na dziś"},
      {type:"fix", text:"Tryb pracownika — naprawione wgrywanie zdjęć (endpoint storage-upload na serwerze Supabase)"},
      {type:"improve", text:"Tryb pracownika — lista robót ładuje się z chmury przy wejściu; czytelniejsze komunikaty błędów"},
    ],
  },
  {
    date:"2026-05-25", version:"1.5", label:"Raport miesięczny & Email backup",
    items:[
      {type:"new", text:"Raport miesięczny PDF — pełny dokument z robotami, listą płac i podsumowaniem finansowym"},
      {type:"new", text:"Auto-backup wysyłany e-mailem co poniedziałek na dawid.thai@int.pl (przez Resend API)"},
      {type:"new", text:"Lista zmian — ta strona"},
    ],
  },
  {
    date:"2026-05-25", version:"1.4", label:"7 usprawnień operacyjnych",
    items:[
      {type:"new", text:"PDF eksport pojedynczej roboty — karta z dokumentami, pracownikami, materiałami i kosztem"},
      {type:"new", text:"Kopiuj pracowników z poprzedniego tygodnia — jeden klik wypełnia listę płac"},
      {type:"new", text:"Filtrowanie robót po pracowniku — dropdown w panelu listy robót"},
      {type:"new", text:"Sobotni reminder — baner przypominający o zamknięciu tygodnia"},
      {type:"new", text:"Potwierdzenie nadpisania archiwum — dialog przed nadpisaniem zapisanego tygodnia"},
      {type:"new", text:"Notatki głosowe (mikrofon) — dyktowanie notatek w robotach (Chrome/Edge)"},
      {type:"new", text:"Auto-backup co poniedziałek — wcześniej pobierał plik lokalnie, teraz wysyła email"},
    ],
  },
  {
    date:"2026-05-24", version:"1.3", label:"Synchronizacja w chmurze (Supabase)",
    items:[
      {type:"new", text:"Synchronizacja danych przez Supabase — dane dostępne na wszystkich urządzeniach"},
      {type:"new", text:"Wskaźnik synchronizacji w topbarze (chmurka zielona/animowana/błąd)"},
      {type:"new", text:"CloudLoader — wczytuje dane z chmury przed startem aplikacji"},
      {type:"new", text:"Zdjęcia jako opcjonalny typ dokumentu w robotach (nie blokuje statusu \"Zdane\")"},
      {type:"improve", text:"Eksport/Import backup JSON z automatycznym push do chmury po imporcie"},
      {type:"fix", text:"Naprawa kalkulacji tygodnia w niedzielę — aplikacja prawidłowo przechodzi na kolejny tydzień"},
    ],
  },
  {
    date:"2026-05-23", version:"1.2", label:"Eksport PDF/Word & Interfejs mobilny",
    items:[
      {type:"new", text:"Eksport listy płac do PDF z polskimi znakami (pdfmake + czcionka Roboto)"},
      {type:"new", text:"Eksport listy płac do Word z polskimi znakami (docx + czcionka Calibri)"},
      {type:"new", text:"Pełna obsługa iPhone i Safari — dynamiczna wysokość (100dvh), safe-area-inset"},
      {type:"new", text:"Dolna nawigacja na urządzeniach mobilnych"},
      {type:"improve", text:"Domyślna godzina rozpoczęcia pracy zmieniona z 08:00 na 07:00"},
      {type:"improve", text:"Automatyczna migracja istniejących pracowników z 08:00 na 07:00"},
    ],
  },
  {
    date:"2026-05-22", version:"1.1", label:"Lista Płac — ulepszenia",
    items:[
      {type:"new", text:"Picker z zaznaczaniem wielu pracowników naraz — \"Zaznacz wszystkich\" i odznaczanie pojedynczo"},
      {type:"new", text:"Automatyczne przejście na bieżący tydzień przy starcie aplikacji"},
      {type:"new", text:"Przycisk \"Bieżący tydzień\" w Lista Płac"},
      {type:"new", text:"Auto-archiwizacja poprzedniego tygodnia przy przejściu do nowego"},
    ],
  },
  {
    date:"2026-05-20", version:"1.0", label:"Pierwsze uruchomienie aplikacji",
    items:[
      {type:"new", text:"Dashboard — przegląd aktywnych robót, wypłat tygodnia, pracujących dziś"},
      {type:"new", text:"Lista Płac — tygodniowe śledzenie godzin, zaliczek i wypłat pracowników"},
      {type:"new", text:"Kartoteka pracowników — dane, stawki, stanowiska, historia zatrudnienia"},
      {type:"new", text:"Archiwum tygodni — historia zapisanych tygodni z podsumowaniami rocznymi/miesięcznymi"},
      {type:"new", text:"Roboty — zarządzanie zleceniami z dokumentami do odbioru, pracownikami i materiałami"},
      {type:"new", text:"Moduł fakturowania — status FV, numer, kwota, wyliczony zysk"},
      {type:"new", text:"Globalne wyszukiwanie pracowników i robót"},
      {type:"new", text:"Dane przechowywane lokalnie w przeglądarce (localStorage)"},
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]?.version ?? "0.0.0";
