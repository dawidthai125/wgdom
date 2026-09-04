# W&G DOM — changelog (skrót dla programistów)

## 2.66.160 — Payroll confirmed day OFF survives resume (2026-09-04)

- **fix:** `cancelPayrollDomainPushPreservingSettlement` — dowolny pending domain push (godziny OFF/ON, nie tylko settlement) jest **flushowany** przed freshness na resume; nie jest cicho dropowany w oknie debounce 1s
- D2 Cancel bez zmian (brak schedule → brak flush)
- Guard / CAS / P2.8 / Pipeline / IK — bez zmian semantyki
- Test: `test-payroll-confirmed-off-resume-safety.mjs` · settlement E3 zaktualizowany

## 2.66.159 — Payroll P2.8 Edge coupled legal ADD (2026-09-04)

- **fix:** `pushWeekEmployeesToCloud` ustawia `replaceWeekEmployeesKeys: ["kw-week-employees"]` → Edge `coupledPwrbPush` / `resolveCoupledWeekEmployeeDeletedIds` — batch tombs authoritative (stale stored tomb nie wycina legal ADD)
- Edge `batch-set` zwraca `persistedWeekEmployees` (+ deleted-ids); klient ACK pending ADD dopiero po weryfikacji membership w effective persist (nie sam HTTP 2xx)
- RS / `pushMergedDataBundleToCloud` bez `replaceWeekEmployeesKeys`; Guard / CAS / P2.4–P2.7 / GO8.2 / Pipeline / IK — bez zmian semantyki
- Test: `test-payroll-p2-8-coupled-legal-add.mjs`

## 2.66.158 — Payroll P2.7 legal ADD vs Resurrection Fence (2026-09-04)

- **fix:** jawny `pwrAdd` / pending ADD przebija stale current-week tombstone w `mayPersistPayrollRosterUnderWeekKeys` (`legalAddMergeKeys`)
- przed fence: ponowny revoke tombów legal ADD + świeży snapshot (freshness UNION nie blokuje)
- fence BLOCK przy legal ADD → **throw** (brak cichego `pushed:true` bez CAS)
- bez legal ADD + tombstone → nadal BLOCK; Guard / CAS / P2.6 / GO8.2 / Pipeline / IK — bez zmian
- Test: `test-payroll-p2-7-legal-add-vs-fence.mjs`

## 2.66.157 — Payroll P2.6 bootstrap must not write (2026-09-04)

- **fix:** CloudLoader bootstrap NIE enqueue/CAS `kw-week-employees` tylko dlatego, że `merged !== cloud`
- READ-ONLY BOOTSTRAP ≠ USER-INTENT WRITE — LS merge/persist OK; push payroll tylko przez pwrPush/pwrAdd
- Guard / CAS / P2.4 / P2.5 / GO8.2 ACK / Pipeline / IK — bez zmian
- Test: `test-payroll-p2-6-bootstrap-no-write.mjs`

## 2.66.156 — Payroll GO8.2 passive settlement vs unresolved cloud ACK (2026-09-04)

- **fix:** pasywne LS `settled=true` z nierozstrzygniętym ACK (`pending`/`failure`) nie jedzie na barana z niezwiązanym zapisem (membership ADD, cudze godziny)
- dyskryminator = istniejące `edited = !settlementBundleEqual(before, after)`; gałąź `!edited` + unresolved ACK → zostaje stan Cloud
- explicit „Rozlicz" i GO3 auto-retry (`buildSettlementRetryRosterBefore` → `edited=true`) bez zmian; brak ACK → GO8.1 bez zmian
- ACK czytany w warstwie orkiestrującej (`resolveUnresolvedSettlementAckEmpIds`, idiom `resolvePayrollPendingAddKeys`); `applySettlementFieldIntent` pozostaje czysta
- Guard / CAS / P2.4 tomb / P2.5 ADD / LWW — bez zmian
- Test: `test-payroll-passive-settlement-ack-safety.mjs` (L1–L5, U1–U3, A1–A7)

## 2.66.155 — Payroll P2.5 atomic membership ADD (2026-09-04)

- **fix:** pending ADD snapshot przetrwa freshness `applyAdminDataBundle` / reconcile / drugi `pwrPush`
- `addFromDirectory` woła `pwrAdd` **poza** updaterem `setState` (PWRB, bez drugiego entry)
- `pwrPush` i `pwrAdd` dzielą jeden `pushRosterWithRebase` — ADD nie ginie na CAS 409 `stale_revision`
- Guard / 50% / cloud-unreachable / P2.4 tomb — bez zmian semantyki
- Test: `test-payroll-p2-5-atomic-membership-add.mjs` (A–M) · `test-payroll-p2-pipeline-coupling.mjs`

## 2.66.154 — Payroll membership ADD vs unrelated hours-down (2026-09-04)

- **fix:** legal/pending membership ADD nie wpada w `silent_down_fail_loud` przez hours-down **innej** osoby
- rebuild zostaje przy Cloud ⊕ field intents (godziny istniejących = chmura); hours-down nie jest autoryzowane
- Guard / 50% shrink / cloud-unreachable / P2.4 tomb — bez zmian semantyki
- Test: `test-payroll-membership-add-vs-guard.mjs`

## 2.66.153 — Payroll P2.4 tombstone-safe legal ADD + ACK-safe LS (2026-09-04)

- **fix P2.4:** legal ADD / pending ADD przebija stale current-week tombstone w `sanitizeStaleRosterMembership` i `filterDeletedWeekEmployees`
- freshness UNION tombu nie dropuje ADD; `removeDeletedWeekEmployeeMergeKeysForWeek` zdejmuje tylko tomb tego tygodnia + tej tożsamości
- explicit Remove + revoke pending bez zmian (H14-REG-5)
- failed/blocked CAS przywraca poprzedni `kw-week-employees` w LS (nie promuje skurczonego rosteru)
- Test: `test-payroll-p2-4-tombstone-safe-add.mjs`

## 2.66.152 — Payroll P2.3 isolate domain auto-sync from Pipeline (2026-09-04)

- **fix:** auto-sync po Notatkach / kadrach / urlopach / kontaktach / robotach / WM / pomiarach nie woła `pushTenderPipelineToCloud`
- decyzja skip: rzeczywisty pending persist Pipeline (`getTenderPipelinePersistPending`), nie `origin === admin`
- latch / guard / P0 / P1 / P2.2 bez zmian — domain-only + latch = brak push = brak toast
- Test: `test-payroll-p2-3-pipeline-isolation.mjs`

## 2.66.151 — Payroll P2.2 pending ADD + early payout intent (2026-09-04)

- **fix P2.2-A:** sesyjny pending ADD (`payroll-pending-add-intent`) — H14 ghost nie zrzuca legalnego ADD przy kolejnym `pwrPush` (godziny / zaliczka / freshness / rebase)
- **fix P2.2-B:** `applyEarlyPayoutFieldIntent` zachowuje pending ADD/DELETE; `mergeWeekEmployeeRecord` scala wypłaty po `updatedAt` transakcji (nie `dataUpdatedAt`)
- H14 remote-delete bez pending ADD bez zmian · CAS / freshness / FIFO bez zmian
- Test: `test-payroll-p2-2-pending-add-payout.mjs`

## 2.66.150 — Payroll P2 cut roster → pipeline auto-sync (2026-09-04)

- **fix:** auto-sync po `weekEmployees` / `savedWeeks` / week keys → `skipTenderPipeline` (debounce: admin wygrywa)
- **P2.1:** skip jest deskryptorem zaplanowanego auto-sync — cancel / hidden abort / P1 `clearAutoSyncTimers` go kasuje (brak stale skip)
- `pushMergedDataBundleToCloud({ skipTenderPipeline })` nie woła `pushTenderPipelineToCloud`
- `pwrPush` / Guard / CAS / latch / P1 bez zmian
- Test: `test-payroll-p2-pipeline-coupling.mjs`

## 2.66.149 — Payroll P1 visible freshness pull (2026-09-04)

- **improve:** widoczna Lista Płac → `executeCloudFreshnessPull({ bypassThrottle: false })` co `MIN_PULL_INTERVAL_MS` (15 s)
- Skip: hidden · `isBlocked()` · `hasPendingPayrollDomainPush()` · throttle
- Bez `requestCloudFreshnessOnResume` / `force` / cancel pending / `pwrPush`
- Test: `test-payroll-p1-visible-pull-isolation.mjs`

## 2.66.148 — Payroll P0 pipeline error isolation (2026-09-04)

- **fix:** auto-sync / `runCloudSync` — `PIPELINE_CLOUD_UNCONFIRMED` toast jako pipeline, nie „Zapis listy płac zablokowany” / generic cloud po edycji godzin
- **fix:** `persistPayrollRoster` — wyciek błędu pipeline nie jest raportowany jako nieudany zapis składu
- Test: `test-payroll-p0-pipeline-error-isolation.mjs` (P0-1–P0-6)
- Guard / CAS / freshness / latch / FIFO `enqueueKwWeekEmployeesWrite` bez zmian

## 2.66.147 — IK ingest artifact persist na cloud body (2026-09-04)

- **fix:** OD-OCR-45 — `persistIngestArtifactPatchToCloud` GET cloud → patch jednego TPI → `pushTenderPipelineToCloud` · panel `persist: "local"` · prune / lean / guard bez zmian
- Test: `test-od-ocr-45-ingest-persist-authoritative.mjs` (T1–T14)

## 2.66.146 — IK lean client gate by APP_VERSION (2026-09-03)

- **fix:** OD-OCR-34 — `isPipelineCloudLeanClientVersionAllowed` porównuje numerycznie `APP_VERSION ≥ 2.66.145` · 2.66.144 DENY · bez SHA/`localeCompare` · `pipelineCloudLeanMinCommit` nieużywane
- Test: `test-ik-od-ocr-34-lean-client-version-gate.mjs`

## 2.66.145 — IK pipeline cloud writers through lean guard (2026-09-03)

- **fix:** OD-OCR-29B — `fetchAndMergeDeferredBootstrap` + `pushMergedDataBundleToCloud` wyjmują `kw-tenders-pipeline` i wołają `pushTenderPipelineToCloud` (lean + guard + verify)
- **improve:** `pushKeysToCloud` safety-net dla pipeline-without-guard · import/restore przez ten sam RS seam · live body **nie** re-strip (29C)
- Test: `test-ik-od-ocr-29b-pipeline-writer-intercept.mjs`

## 2.66.144 — IK pipeline lean cloud + guard (2026-09-03)

- **improve:** OD-OCR-25 Track B — `_cloudLean` marker · lean cloud strip · `kw-tenders-pipeline-guard` · `mergeKosztorysPreserveHeavy` / `mergeScanSummaryPreserveArtifacts` · fail-closed body/guard protocol
- **fix:** `persistKey`/`saveTendersPipeline` — local/cold FULL preserved; cloud gets LEAN when `pipelineCloudLeanGuardV1` ON (default OFF)
- Test: `test-ik-od-ocr-25-track-b-pipeline-lean-guard.mjs`

## 2.66.143 — IK Owner ingest on V4 detail (2026-09-03)

- **fix:** `TenderDetailPage` (tab przetarg) — istniejący `TenderIngestImportPanel` z `activeItem={item}` · upload Owner PDF/ZIP bez list expandedId
- **improve:** reuse retain → `runOwnerIngestParseWithIntraPdfC2` · lista Kolejka bez regresji · Track B bez zmian
- Test: `test-ik-ocr-20-v4-detail-ingest.mjs`

## 2.66.142 — IK C2 Owner ingest parse wiring (2026-09-03)

- **new:** `runOwnerIngestParseWithIntraPdfC2` — retain → parse z `intraPdfDerived` (P.documentId) → re-bridge artifacts
- **improve:** `TenderIngestImportPanel` wywołuje parse+C2 po upload; `processIngestParseBatch` rehydratuje LS po parseFn
- Test: `test-ik-ocr-18-ingest-c2-wire.mjs` · dossier/ATH bez C2 · Owner Map bez auto-assign

## 2.66.141 — IK Intra-PDF derived cost documents C2 (2026-09-03)

- **new:** `tender-ingest/derived-cost-segment.ts` — OCR pages → ACCEPT/HOLD → N `derived_cost_segment` + heuristic per segment + artifacts
- **improve:** C2 lineage (`parentDocumentId`, `startPageIndex`/`endPageIndex` 0-based) · artifact `branch` · bridge prefer explicit branch
- Optional `parseDocumentToKosztorys({ intraPdfDerived })` side-effect CONNECT; Owner Map bez auto-assign
- Test: `test-ik-ocr-c2-derived-docs.mjs` · bez nowego parsera/Experta/Orchestra/Multi-BOQ redesign

## 2.66.140 — IK OCR B1 PSM 11 SPARSE_TEXT (2026-09-03)

- **improve:** `ocr-browser-local` — `setParameters({ tessedit_pageseg_mode: "11" })` (OD-OCR-10)
- Bez zmian: raster/JBig2, kontrakt OCR, parser, provider
- Test: `test-ik-ocr-mvp-b1.mjs` (PSM constant)

## 2.66.139 — IK OCR B1 JBig2 wasm raster (2026-09-03)

- **fix:** `ocr-pdf-raster` + `wasmUrl=/pdfjs-wasm/` (pdf.js 5.x) — dekodowanie skanów JBig2 przed Tesseract
- Vite: kopia `pdfjs-dist/wasm` → `public/pdfjs-wasm` (same-origin)
- Test: `test-ik-ocr-mvp-b1.mjs` (wasmUrl seam)

## 2.66.138 — IK OCR MVP-B1 scan-only PDF (2026-09-03)

- **new:** browser/local OCR (tesseract.js) → `parseDocumentToKosztorys` → istniejąca `parsePdfPrzedmiarHeuristic`
- **improve:** TEXT-FIRST (OCR=0 przy native text) · fail-soft CASE 3 · `extractionMethod` + `ocrConfidence`
- Test: `npx vite-node scripts/test-ik-ocr-mvp-b1.mjs`
- B2 mixed page-selective OCR = DEFERRED · Multi-BOQ intra-PDF = OUT

## 2.66.137 — IK Epic A / A0.2 CatalogWork coverage Środa (2026-09-03)

- **new:** 8 CatalogWork (A0.2 freeze) — brodzik, syfon, podejście PVC, ustęp kompakt, silikon, okna, ościeżnice, parapety
- **improve:** OPS `applySrodaA02CatalogSeed` · test `test-ik-owner-sroda-a02-catalog.mjs` · bez mapper/F5/scoring
- Seed chmura: `catalog-ik-owner-sroda-a02-ops.mjs` (osobne `--execute`)

## 2.66.136 — IK ATH/PDF reconciliation (2026-09-02)

- **fix:** `boq-line-normalize.ts` + merge canonical hash — autonomiczne scalanie ATH/PDF per lokal (KEEP ONE, audit ATH_PDF_RECONCILED)
- **improve:** PDF LP action continuation · Środa regression 168→84
- Test: `npx vite-node scripts/test-multi-boq-ath-pdf-reconcile-sroda.mjs`

## 2.66.135 — IK Public KNR Discovery Engine (2026-09-01)

- **new:** `PublicKnrSourceRegistry` + `runPublicKnrDiscovery` — BY_KEY → registry fallback, scoring, cross-family, multi-source
- **improve:** NO_SOURCE_SELECTION nie kończy research; reanalysisTargets; real READ-ONLY script
- Test: `test-ik-public-knr-research.mjs` (50) · `real-public-knr-readonly.mjs`
- Docs: `IK-PUBLIC-KNR-RESEARCH-ENGINE.md`

## 2.66.134 — IK Public KNR Research Engine (2026-09-01)

- **new:** `runIkPublicKnrResearch` — L0 katalog SSOT → L1 public discovery/scraper → PENDING_VERIFY → reanalyze
- Multi-query · paywall skip · one canonical + many evidence · KNR ≠ BOM
- Test: `npx vite-node scripts/test-ik-public-knr-research.mjs`
- Docs: `docs/architecture/IK-PUBLIC-KNR-RESEARCH-ENGINE.md`

## 2.66.133 — IK Real BOM Research · Identity Gate (2026-09-01)

- **new:** Identity Gate przed BOM (`IDENTITY_MISMATCH` / `NO_WORK_ID`); L0 podstawa evidence-only; L2 InternalNorm + LicensedNorm `LICENSE_REQUIRED`
- **improve:** Auto Gap HOLD z pełnym `researchTrace.why`; ZERO auto LABOR_ONLY z MISSING_BOM
- Test: `npx vite-node scripts/test-ik-bom-technology-research.mjs`
- Docs: `docs/architecture/IK-BOM-TECHNOLOGY-RESEARCH-ENGINE.md`

## 2.66.132 — IK BOM Technology Research Engine (2026-08-31)

- **new:** RESEARCH LAYER `runIkBomTechnologyResearch` — L0 tender → L1 packs → L2 normative provider → L3 manufacturer → L4 public → L5 analog/web
- Confidence = min(technology, materialKey, qtyFactor, unit); ZERO invent; SEKOCENBUD Null bez license
- Auto Gap BOM dispatch → nowy engine; `resolveTechnologyBomForWork` pozostaje pure
- Test: `npx vite-node scripts/test-ik-bom-technology-research.mjs`
- Docs: `docs/architecture/IK-BOM-TECHNOLOGY-RESEARCH-ENGINE.md`

## 2.66.131 — IK F5 Auto Gap Resolution ephemeral (2026-08-31)

- **new:** `runIkF5AutoGapResolution` + `runIkBomGapResearch` — DETECT→RESOLVE→ephemeral→RE-F5 (max 3); ZERO Accept/Catalog/PM/P7/G3
- BOM: ACTIVE/APPROVED/REVIEW exact `workId` only; multi-dwelling `dwellingId+lineId`
- Test: `npx vite-node scripts/test-ik-f5-auto-gap-resolution.mjs`

## 2.66.130 — IK deterministic multi-premiare dwelling map (2026-08-31)

- **fix:** jednoznaczne `street+budynek+lokal` w nazwie PDF przedmiaru → `documentToDwelling` (LS multi-dwelling); ambiguous = HOLD; odblokowuje `MULTI_SOURCE_NO_DWELLING_MAP`
- Test: `npx vite-node scripts/test-ik-deterministic-dwelling-map.mjs`

## 2.66.129 — PAYROLL settlement ack rejects false-success GO4 (2026-08-29)

- **fix:** settlement cloud-ack marks success only when `pwrPush` outgoing carries matching `settled` + `settledUpdatedAt` + `payrollSettlement`; baseline no-op / missing triple → failure + retry. Settlement-only recovery dry-run script (no APPLY / no prod write).

## 2.66.128 — PAYROLL settlement cloud-write ack GO3 (2026-08-29)

- Settlement nie ginie w debounce/cancel (flush on hide + preserve on resume)
- pending/failure + fail-loud toast; retry po freshness przez istniejący `pwrPush`
- LS settled ≠ potwierdzenie chmury
- Test: `npx vite-node scripts/test-payroll-settlement-cloud-ack.mjs`

## 2.66.127 — PAYROLL settled clock ≠ data clock + TIMEOUT rehydrate (2026-08-29)

- Settlement-only (`settled` change) **nie** bumpuje `dataUpdatedAt`; zegar settlementu = `settledUpdatedAt`
- Świadome unsettle wygrywa LWW nad starszym cloud `settled=true`; spurious (`sAt≈dAt`) nadal chronione
- Bootstrap TIMEOUT + late merge → React rehydrate (bez bump timestampów)
- Test: `npx vite-node scripts/test-payroll-settled-cross-device-fix.mjs`

## 2.66.126 — PAYROLL freshness payload hardening (2026-08-29)

- Po freshness: outgoing = canonical Cloud ⊕ P2 intents (nie ślepy argument stale roster)
- `extraCosts`: cloud baseline (before ≡ cloud) jak MA/settlement/rate
- Test: `npx vite-node scripts/test-payroll-freshness-payload-hardening.mjs`

## 2.66.125 — CLOUD Freshness Gate (2026-08-29)

- Global write barrier: resume/focus/visibility/pageshow/native → pull+reconcile+UI → FRESH → dopiero outbound write
- `cloud-freshness-gate.ts`; `pushKeysToCloud` / payroll domain push za `ensureCloudFreshBeforeWrite`
- 15s throttle nie omija bariery; writeOnly aplikuje bundle do UI; offline = UNCONFIRMED (bez silent overwrite)
- Test: `npx vite-node scripts/test-cloud-freshness-gate.mjs`

## 2.66.124 — PAYROLL settlement metadata (2026-08-28)

- **new:** `payrollSettlement` (kto / kiedy / cash|transfer / zamrożona kwota) przy Rozlicz; modal; PDF/Word/Email/Archiwum z SSOT; P2 scoped intent; unsettle zachowuje last metadata
- Test: `npx vite-node scripts/test-payroll-settlement-metadata.mjs`

## 2.66.123 — PAYROLL biweekly early / partial payout (2026-08-28)

- `payrollEarlyPayouts[]` — transakcje (cash|transfer), soft-delete, `periodKey` = `nextBiweeklyPayoutSaturday`
- Tylko `biweeklyPayroll`; weekly bez zmian; kotwica/cykl nie ruszane; nadpłata = BLOCK
- W1: remaining = earnedSoFar − early; W2: displayNet = W1+W2 − early (bez podwójnej wypłaty)
- Cash early → Saturday cash w tygodniu `paidAt`; transfer nie zwiększa gotówki
- P2 field-intent ADD/DELETE; blokada zmiany `biweeklyAnchorDate` przy aktywnych early
- Test: `npx vite-node scripts/test-payroll-early-payout-biweekly.mjs`

## 2.66.122 — PAYROLL manualPayrollAdjustment / leave payable (2026-08-28)

- `payrollManualAdjustment` na WeekEmployee (amount ≥ 0, description, kind, własne `updatedAt`)
- Leave: labor = 0; approved `extraCosts` + korekta wchodzą do `displayNetPay` / totals / snapshot / export
- UI: „Korekta wypłaty” w detalu pracownika (osobno od kosztów)
- P2 field-intent dla adjustment; bez Edge
- Test: `npx vite-node scripts/test-payroll-manual-adjustment.mjs`

## 2.66.121 — PAYROLL P2 field-level stale write (2026-08-28)

- `applyPayrollFieldIntentsOntoCanonical` — hours UP+DOWN / rate / extraCosts / day slots vs cloud
- Guard + push + 409 rebase: brak whole-employee LWW przez `dataUpdatedAt`
- bfcache `pageshow` → cancel stale domain debounce
- Test: `npx vite-node scripts/test-payroll-p2-field-intent.mjs`
- Bez zmian Edge UNION/I-1/I-2

## 2.66.120 — PAYROLL P1 stale cross-device write (2026-08-28)

- `sanitizeStaleRosterMembership` — cloud-absent tylko przy prawdziwym ADD (`!rosterBefore`)
- `rebasePayrollRosterIntent` — brak resurrection przez edycję osoby usuniętej na innym device
- Guard FE: membership sanitize (+ tombstone filter); bez zmian Edge UNION/I-1/I-2
- Test: `npx vite-node scripts/test-payroll-p1-stale-cross-device.mjs`

## 2.66.119 — PAYROLL DELETE P0 FIFO mutacji składu (2026-08-28)

- `enqueueKwWeekEmployeesWrite` — Promise FIFO dla zapisów `kw-week-employees`
- `pwrPush` / `pwrRemove` / `pwrAdd` + `withKwWeekEmployeesAsyncMutation` w kolejce
- `isBlocked()` bez zmian (auto-pull suppress ≠ kolejka)
- Bez zmian Edge UNION / I-1 / I-2 / hours-down intent
- Test: `npx vite-node scripts/test-payroll-delete-fifo-p0.mjs`

## 2.66.118 — PAYROLL P0 scoped hours-down intent (2026-08-28)

- Intent: `hoursIntents[]` (employee + slot + fromHours/toHours) weryfikowane vs cloud baseline
- `payrollDomainUserWrite` / bare `intentionalHoursClear` **nie** autoryzują hours-down
- Sanitize mieszanych: legalne 8→4 OK, stale 313h przywrócone z cloud / BLOCK bez intentów
- Edge: 409 `payroll_hours_down_blocked` bez scoped intent
- Test: `test-payroll-p0-hours-down-protection.mjs` R1–R15
- **Bez restore 660 h**

## 2.66.117 — PAYROLL P0 hours-down write protection (2026-08-28)

- Guard: `wouldBlockSilentHoursDowngrade` — bootstrap/merge/safe nie mogą zapisać hours-down vs cloud bez `intentionalHoursClear`
- Domain PWRB: `payrollDomainUserWrite` (pwrPush) — legalne edycje godzin w dół OK; nadal >50% shrink + D2
- Edge: `payroll_hours_down_blocked` 409 (przed rotate backup)
- Luka zamknięta: 660→347 (~47%) przechodziło przez próg >50%
- Test: `npx vite-node scripts/test-payroll-p0-hours-down-protection.mjs`
- **Bez restore 660 h** — osobny Owner GO

## 2.66.116 — IK C2 MOPS KNNR 1305 prob (2026-08-27)

- OD-01: `prob` first-class `WgdomCostUnit` · work-rate bridge/normalize/qualify
- C2 M3: 2 CatalogWork `knnr-wc-knnr-5-1305-01-prob` / `…-02-prob` (LABOR, companyPrice 0, margin 0%)
- C2 M5: Owner OUR RATE 60/20 PLN/prob · M6 OWNER_KNR mappings · M8 provisional skip · M10 LABOR_ONLY
- Test: `test-ik-od01-prob-unit-platform.mjs` · `test-ik-c2-batch-m3-m8.mjs` · `test-ik-c2-batch-m5-m10.mjs`

## 2.66.115 — PAYROLL-WEEK-ROSTER-INVARIANT-01 (2026-08-24)

- Classifier: ALIGN tylko przy live **0h**; hours>0 + archived digest≠ → rollover quarantine
- D-F3 fence: `payroll-week-roster-binding.ts` + bootstrap/`pwrPush` — brak persist historycznego residualu pod current keys
- D-F4: `intentionalHoursClear` w `batch-set` + Edge skip-union; empty rollover → Cloud `[]`
- Test: `test-payroll-display-p0-regression-04.mjs` · `test-payroll-week-roster-invariant-01.mjs` · T-INC w rollover-01
- DF: `docs/architecture/PAYROLL-WEEK-ROSTER-INVARIANT-01-DESIGN-FREEZE.md`

## 2.66.114 — IK-OWNER-MAP A01-S1 WM LP4 identity (2026-08-23)

- Owner `WORK_RATE_IDENTITY_MAPPINGS` append: WM LP4 oczyszczenie → `cc-w2-oczyszczenie-podloza` (exact_normalized · m2). LP5 impregnacja excluded · zmywanie HOLD. Test: `test-labor-identity-mapping-a01-s1.mjs`.

## 2.66.113 — IK-KNR WC Identity Bridge P3 CREATE (2026-08-22)

- P3 Owner-gated CatalogWork CREATE: `knr-wc-identity-bridge-create.ts` · `work-catalog-insert.ts` (P5.26 reuse) · `IkKnrWcIdentityCreateExecutor` · flag `KNR_WC_IDENTITY_BRIDGE_P3_CREATE_ENABLED=false` · write via `saveWorkCatalogRouted` only · P2 UI frozen.

## 2.66.112 — IK-KNR FT-10 Secondary DSEC tableCode (2026-08-22)

- `resolveCatalogBasisFromSourceRow`: secondary tableCode tylko po kotwicy `d.X(.Y)` + 1× `^\d{3,4}-\d{2}$`
- Expert nadal description-blind · bez Slice D / A1 / pricing / HTTP
- Test: `npx vite-node scripts/test-ik-knr-ft10-secondary-tablecode.mjs`

## 2.66.111 — IK-KNR KL-7-P1 Details / History / Offline Update (2026-08-22)

- Szczegóły Katalogu KNR · append-only `history[]` (cap 50) · offline proposed update + diff
- VERIFIED tylko KL-6 (`allowAuthoritySupersede`) · Update UI nie nadpisuje authority
- Test: `npx vite-node scripts/test-knr-catalog-p1.mjs`

## 2.66.110 — IK-KNR KL-7-P0 Cloud KNR SSOT (2026-08-21)

- `kw-knr-catalog` w cloud-sync (deferred bootstrap) · per-entry merge anti-wipe
- CATALOG_HIT = VERIFIED+ACTIVE · push po Owner VERIFY (best-effort) · cloud ≠ authority
- Test: `npx vite-node scripts/test-knr-catalog-cloud-p0.mjs`

## 2.66.109 — IK-KNR KL-7-UX-1 Katalog KNR (2026-08-21)

- Przetargi → Firma → **Katalog KNR** (4. katalog) · REUSE `catalog-shared`
- Read-only local/fixture · zero HTTP/discovery/VERIFY/cloud write · zero PLN / OUR RATE / marża
- Test: `npx vite-node scripts/test-knr-catalog-ui-kl7-ux1.mjs`

## 2.66.103 — PAYROLL P0 FE O2 CAS-ready client (2026-08-19)

- Worker extraCosts → `pwrPush` + `payrollWeekCas` / `expectedRevision`; brak `forceReplace` i silent catch na zapisie payroll
- Kompatybilne ze starym production Edge (O1 **nie** w tym releasie)
- Test: `npx vite-node scripts/test-payroll-worker-o1-o2.mjs`

## 2.66.101 — IK-KNR-EXPERT Slice D Owner KNR mapping (2026-08-18)

- Owner GO: Owner-confirmed KNR → CatalogWork — exact tabela w kodzie, overlay `catalogWorkId` na kopii linii Master BOQ dla istniejącego P3
- Zero mutation bez legalnego HIT · zero `knrHint` / mapper / A1-call / Research / nowych flag
- Test: `npx vite-node scripts/test-ik-knr-expert-slice-d.mjs`

## 2.66.100 — IK-KNR-EXPERT Slice C3 host + chrome (2026-08-18)

- Owner GO: podpięcie KNR do istniejącego `IkEntryHost` — `opts.knr` → istniejący `ExpertConversationSurface`
- `IkExpertRoomChrome` (sticky, mobile ~50vh collapsed, lokalny React collapse) · aktor `Knr` · zero Hub / mapper / A1 / Research / nowych flag
- Test: `npx vite-node scripts/test-ik-knr-expert-slice-c3.mjs`

## 2.66.99 — IK-KNR-EXPERT Slice C2 KNR conversation adapter (2026-08-18)

- Owner GO: `buildIkKnrConversation` — `IkKnrExpertReport` → max 3 kroki laik + max 3 `examplesHold`
- Zero host / chrome / Hub / `actorFromStep` · zero `catalogWorkId` / `knrHint` / mapper / A1 / Research · zero nowych flag
- Test: `npx vite-node scripts/test-ik-knr-expert-slice-c2.mjs`

## 2.66.96 — IK Role Activation (2026-08-18)

- Super Admin: IK **ALWAYS ON** (brak self-toggle; leftover `ikEntryEnabled` nie blokuje)
- Administrator / Moderator: `ikEntryForAdminEnabled` / `ikEntryForModeratorEnabled` default **OFF**, niezależne, tylko ⚙ Super Admin
- Inspector / worker / brak sesji: **OFF** · A08-P2 Research-on-Miss **UNCHANGED**
- Test: `npx vite-node scripts/test-ik-role-activation.mjs`

## 2.66.95 — IK AUTONOMY-08 P2 Research-on-Miss (2026-08-18)

- **COMPLETE / CLOSED** · **PRODUCTION VERIFIED** · PV **PASS** · commit **`1f5d871c`** · deploy **`5958146457`**
- **Owner GO:** IK ON = autonomia Research-on-Miss. `executeResearch` permission = Entry ∧ P5/P6 AUTO|ON (bez checkboxa Research)
- HTTP tylko na prawdziwy MISS · HIT = zero Research · COMPOUND/UNKNOWN HOLD · `mat.inv.*` HARD-FORBID
- Research ≠ Accept · P5 → P6 sequencing (`laborSettledRef` + tick; cancelled ≠ settled)
- Test: `npx vite-node scripts/test-ik-autonomy-08-p2-research-on-miss.mjs`
- Live IK Entry remained **OFF** · Research HTTP **NOT EXECUTED** (not a failure)

## 2.66.94 — IK AUTONOMY-08 P1 Settings Unification (2026-08-17)

- **Owner GO:** Super Admin ⚙ — jedyny biznesowy switch IK = `ikEntryEnabled`
- P3–P8 + Research → `TECHNICAL / ADVANCED / EMERGENCY` (collapsed, children remain mounted)
- AUTO_INGEST nie wraca · D HARD STOP osobno · AppSettings/KV/runtime A05–A08/P0 UNCHANGED
- Test: `npx vite-node scripts/test-ik-autonomy-08-p1-settings-unification.mjs`

## 2.66.93 — IK AUTONOMY-08 P0 Documents → BOQ Autonomous Activation (2026-08-17)

- **Owner GO OD-08-1:** IK ON ⇒ Documents→BOQ. `isIkP2DocumentsBoqActive()` = `ikEntryEnabled === true`
- `IkEntryHost` gating przez helper · leftover `ikAutoIngestEnabled` zostaje w AppSettings (nie runtime gate, bez migracji KV)
- Admin: usunięty checkbox AUTO_INGEST · copy Documents/BOQ
- Research / Accept / P7 / P8 / D / A05–A07 UNCHANGED · P1 CLOSED · P2 KEEP GAP · CatalogWork **471**
- Test: `npx vite-node scripts/test-ik-autonomy-08-p0-documents-boq.mjs`

## 2.66.92 — IK AUTONOMY-07 P8 Autonomous Risk / Decision Prepare (2026-08-17)

- **Owner GO:** P8 `ikRiskDecisionE2eEnabled` = `"AUTO" | "OFF" | "ON"` (same key, no new flag)
- AUTO/ON = autonomous READ-ONLY Risk / Validation / DW prepare (in-memory) · OFF = kill-switch (OFF wins merge)
- Legacy B-POLICY (OD-P8b): `true`→ON · `missing`/`false`/malformed→AUTO
- No new BOQ host gate · Research / Accept / Price Commit / Final Bid / D / Chief unchanged · P1 CLOSED · P2 KEEP GAP · Composite CLOSED · P7 UNCHANGED · CatalogWork **471**
- Test: `npx vite-node scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs`

## 2.66.91 — IK AUTONOMY-06 P7 Autonomous Bid Calculation (2026-08-17)

- **Owner GO:** P7 `ikF5E2eEnabled` = `"AUTO" | "OFF" | "ON"` (same key, no new flag)
- AUTO/ON = autonomous READ-ONLY Position Cost → F5 → Bid (in-memory) · OFF = kill-switch (OFF wins merge)
- Legacy B-POLICY (OD-P7b): `true`→ON · `missing`/`false`→AUTO
- Research / Accept / Price Commit / Final Bid / D unchanged · P1 CLOSED · P2 KEEP GAP · Composite CLOSED · `feedsP7Bid=false` · CatalogWork **471**
- Test: `npx vite-node scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs`

## 2.66.90 — IK AUTONOMY-05 Explicit AUTO / OFF / ON (2026-08-17)

- **Owner GO:** P5/P6 `ikLaborE2eEnabled` / `ikMaterialE2eEnabled` = `"AUTO" | "OFF" | "ON"` (same keys, no new flag)
- AUTO/ON = read-only MODE A (`executeResearch=false`) · OFF = explicit kill-switch (OFF wins merge)
- Legacy B-POLICY: `true`→ON · `missing`/`false`→AUTO (OD-2b)
- Research / Accept / Price Commit / Final Bid / D unchanged · P1 CLOSED · P2 KEEP GAP · Composite CLOSED · CatalogWork **471**
- Test: `npx vite-node scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs`

## 2.66.89 — IK Composite Position Orchestration (2026-08-17)

- **Owner GO:** `BOTH_HOLD` consumer in `IkEntryHost` — decomp → TechnologyPack → leaf experts → `computePositionCost` (unchanged)
- Start = existing **P5 ∧ P6** only · no new flag · parent Classification Gate unchanged
- Partial HIT+GAP ≠ 0 PLN · zero auto-Accept · XOR F5 (`feedsP7Bid=false`)
- P1 / P2 KEEP GAP / D=false / CatalogWork **471** untouched
- Test: `npx vite-node scripts/test-ik-composite-position-orchestration.mjs`

## 2.66.88 — IK P1 Invoice Host Collision (2026-08-17)

- **P1 Owner GO:** G1 mapper excludes `cw.inv.*` from BOQ scoring · G2 hard-forbid `mat.inv.*` DIY Research
- PM CURRENT reuse before DIY gate · CatalogWork **471** · D unchanged · no new engines
- Test: `npx vite-node scripts/test-ik-p1-invoice-host-collision.mjs`

## 2.66.87 — IK-MIGRATION-01 P10 NG-10 → IK first-screen (2026-08-16)

- **P10 Owner GO:** NG-10 Gate/Run/Outcome removed · IK (`IkEntryHost`) = first-screen
- `ikEntryEnabled` default **ON** · TRE Outcome only after Recovery CTA (Expert ON | Expert OFF+sliceA)
- CatalogWork **471** untouched · D unchanged · LIB-NG10 retired
- Test: `npx vite-node scripts/test-ik-migration-01-p10-implementation.mjs`

## 2.66.86 — IK-MIGRATION-01 P9 Owner Verify (2026-08-16)

- **P9 Owner GO:** Gate A → Gate B → Owner Verify on live `08def45d-…`
- REUSE Truth Gates · **no** `ikP9*` lever · D snapshot/diff = 0
- RESEARCH=0 · ACCEPT=0 · CatalogWork **471** UNTOUCHED · marker UI only
- **STOP:** no auto P10 · controlled Owner Verify = manual

## 2.66.85 — IK-MIGRATION-01 P8 Risk → Decision (2026-08-16)

- **P8 Owner GO:** Risk → Validation → Chief → DW → EC under IK (`ikRiskDecisionE2eEnabled`, default **OFF**)
- REUSE: `applyTenderIntelligenceOverlay` · `analyzeValidationFromDossier` · DW VM · P4 Chief session
- RESEARCH=0 · HTTP=0 · CatalogWork **471** UNTOUCHED · zero auto-Accept · IK≠D
- **STOP:** no auto P9 · controlled ON NOT_EXERCISED

## 2.66.84 — IK-MIGRATION-01 P7 Position Cost → Bid (2026-08-16)

- **P7 Owner GO:** Position Cost → F5 → Bid → SUM → EC under IK (`ikF5E2eEnabled`, default **OFF**)
- REUSE: `boq-shadow-adapter` · `bid-position-cost-cutover` · `computeTenderBidProposal` · PackageGate · `aggregatePackageDirect`
- RESEARCH=0 · HTTP=0 · CatalogWork **471** READ · Price Memory READ · zero Accept
- **STOP:** no auto P8 · controlled ON NOT_EXERCISED

## 2.66.83 — IK-MIGRATION-01 P6 Material E2E (2026-08-16)

- **P6 Owner GO:** Material E2E under IK (`ikMaterialE2eEnabled` / `ikMaterialResearchEnabled`, default **OFF**)
- MODE A: Price Memory + identity (0 HTTP) · MODE B: selective DIY (`executeResearch === true` only)
- Budget: MMR-02 · ≤8 claims/pass · ≤24 shop HTTP/run · Accept → Price Memory
- Zero auto-Accept · CatalogWork **471** lock · F5 = P7
- **STOP:** no auto P7

## 2.66.82 — IK-MIGRATION-01 P5 Labor E2E (2026-08-16)

- **P5 Owner GO:** Labor E2E under IK (`ikLaborE2eEnabled` / `ikLaborResearchEnabled`, default **OFF**)
- MODE A: CURRENT + internal-first (0 HTTP) · MODE B: selective research (`executeResearch === true` only)
- Budget: **24** HTTP/run · **4**/work · **0** blind retry · REUSE P5.26-E matcher
- Zero auto-Accept · Material = P6 · F5 = P7 · P5.26 **471** lock
- **STOP:** no auto P6

## 2.66.81 — IK-MIGRATION-01 P4 Chief Wiring (2026-08-16)

- **P4 Owner GO:** Chief Wiring under IK (`ikChiefWiringEnabled`, default **OFF**)
- Trigger: IK ON ∧ P4 ON ∧ `pricingReady` → existing Chief T1–T6
- **IK ≠ D** — does not flip `expertAiDecydentEnabled`
- Labor = P5 · Material = P6 · research/Accept/F5 **OUT**
- **STOP:** no auto P5

## 2.66.80 — IK-MIGRATION-01 P3 Classification + Identity (2026-08-16)

- **P3 Owner GO:** A1 Classification → Identity → handoff → **STOP**
- **Lever:** `ikIdentityCoverageEnabled` (default **OFF**); ON ≠ research / Accept / CatalogWrite
- **EXECUTE_RESEARCH / RUN_RATE_EXPERTS:** remain **OFF**
- **REUSE:** `classification-gate` · `ik-classification` · `ik-identity-coverage`
- **STOP:** no auto P4

## 2.66.79 — IK-MIGRATION-01 P2 Documents→BOQ controlled AUTO_INGEST (2026-08-16)

**Scope:** Owner GO — P2 controlled Documents→BOQ under IK (REUSE).

- `AppSettings.ikAutoIngestEnabled` default **OFF** · Super Admin toggle
- `IkEntryHost`: runtime `isIkAutoIngestEnabled()` → NG-02 bridge → Document Expert
- IK ON alone = Entry Shell · research/experts/identity remain OFF
- Tests: `test-ik-migration-01-p2-implementation.mjs` · P0/P1/P2.5 regression
- **STOP** — no auto P3 · prod AUTO OFF

## 2.66.78 — IK-MIGRATION-01 P1 entry shell harden (2026-08-16)

**Scope:** Owner GO — P1 Entry Shell harden (R1).

- `IkEntryHost`: `IK_ENTRY_SHELL_AUTO_INGEST` / `EXECUTE_RESEARCH` / `RUN_RATE_EXPERTS` / `IDENTITY_COVERAGE` = **false**
- IK ON = EC + Document Expert pipeline facts only (no HTTP research, no cloud ingest write)
- Plumbing P2.5/P5 retained behind guards · `ikEntryEnabled` OFF = NG-10 unchanged
- Tests: P1 R1 guards · P0 · P2.5/P5.14 string updates

## 2.66.77 — IK-MIGRATION-01 P0 Design Freeze implementation (2026-08-16)

**Scope:** Owner GO — implement approved P0 Design Freeze (REUSE + Truth contract).

- `IkConversationEvent` + `canPresentAsVerifiedFact` / `enforceIkConversationTruth` (AD-IK-M05)
- REUSE: `ikEntryEnabled` default OFF · TenderDetailPage seam · IkEntryHost · ExpertConversationSurface · NG-10 Gate
- Mobile: EC controls `min-h-[44px]` + `data-ik-mobile-ready`
- Test: `scripts/test-ik-migration-01-p0-implementation.mjs` (A–H)
- **STOP** — no auto P1 · no research/Accept · no NG-10 removal

## 2.66.76 — IK P5.16-B Commercial pricing contract (2026-08-15)

**Scope:** Owner GO — Labor C1 + zaprawianie LABOR_ONLY + zawór Work-Quotes→SELL thin bridge.

- Accept research → OUR RATE = `marketBaseRatePln` (BASE); SELL derived in `resolveLaborInputFromOurWorkRate` via `computeSellPricePln`
- `cc-p0c-w1-zaprawianie-bruzd` → `OWNER_APPROVED_LABOR_ONLY_WORK_IDS`
- `cc-p0c-w1-zawor-odpowietrzajacy` → MATERIAL_SUPPLY `resolveMaterialSellFromCatalogWorkQuotes` (no invent mat.*)
- `ikEntryEnabled` OFF · NG-10 RETAINED · no F5/Bid/PDF rewrite
- Test: `scripts/test-ik-migration-01-p516b-commercial-pricing.mjs`

## 2.66.75 — IK P5.13 Material research entry (2026-08-15)

**Scope:** Smallest Material Expert extension — Supplier Research without pre-existing product `mat.*`.

- Material Demand (MATERIAL plane + Work Identity) → `demand.work.<workId>` → Phase2 → Candidate → Owner Accept → Price Memory on `catalogWorkId`
- Existing mat.* HIT/MISS paths unchanged · zaprawianie LABOR locked · ZERO invent / auto-Accept
- `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p513-material-research-entry.mjs` · Docs: `docs/architecture/IK-MIGRATION-01-P5.13-MATERIAL-RESEARCH-ENTRY.md`

## 2.66.74 — IK P5.11 Zaprawianie COMPOUND→LABOR (2026-08-15)

**Scope:** Owner GO — reclassify `cc-p0c-w1-zaprawianie-bruzd` to LABOR; drop MATERIALS_REQUIRED/Wave1 pending for this workId only.

- Owner seed map + counts 30/24/5/30 · folia MATERIALS_REQUIRED retained
- P4-REAL ZZK: 4 lines LABOR · Candidate 20 PLN/mb (KB) · Accept REQUIRED · ZERO auto
- P5: material input 0 for these lines · ZERO invent mat.*
- `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p511-zaprawianie-labor.mjs` · Docs: `docs/architecture/IK-MIGRATION-01-P5.11-ZAPRAWIANIE-LABOR.md`

## 2.66.73 — IK P5.9 Material identity Owner norm (2026-08-15)

**Scope:** Identity-only classification of ZZK focus 6 material blockers (no invent).

- Wave1 zaprawianie ×4 → **PENDING_OWNER_NORM** (missing materialKey+qtyFactor · packs **0**)
- Zawór ×2 → **PRODUCT_IDENTITY_GAP** (Work Identity without mat.*/cw.product.*)
- Classifier `ik-material-identity-p59.ts` · EC identity GAP facts · ZERO pricing/research/Accept
- `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p59-material-identity.mjs` · Docs: `docs/architecture/IK-MIGRATION-01-P5.9-MATERIAL-IDENTITY-OWNER-NORM.md`

## 2.66.72 — IK P5-REAL Material Expert (ZZK focus) (2026-08-15)

**Scope:** Real Material Expert on ZZK P4 focus lines (2 MATERIAL + 4 COMPOUND).

- REUSE `runIkMasterBoqMaterialExpert` · `resolveDemandProductIdentityExact` · Price Memory · Phase2 · Owner Accept
- Focus live: IDENTITY **0** · NO_MATERIAL_COMPONENT **6** (Wave1 PENDING / no mat.* — ZERO invent)
- Full BOQ incidental: identity 6 · HIT 5 · MISS 1 · research 1 · candidates 0
- `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p5-real-material.mjs` · Docs: `docs/architecture/IK-MIGRATION-01-P5-REAL-MATERIAL.md`

## 2.66.71 — IK P4-REAL Labor Expert on 44 trusted Work (2026-08-15)

**Scope:** Real Labor Expert runtime on ZZK trusted Work identities (P4-REAL).

- REUSE `runIkMasterBoqLaborExpert` · `lookupWorkRate` · `runIkLaborGapResearch` · Owner Accept only
- Live: TRUSTED WORK **44** · CURRENT HIT **31** · RESEARCH_GAP **7** · research keys **2** · candidates **0** · Accept **0**
- ZERO invent / auto-Accept · Material Expert untouched · Position Cost / F5 / Bid out of scope
- `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p4-real-labor.mjs` · Docs: `docs/architecture/IK-MIGRATION-01-P4-REAL-LABOR.md`

## 2.66.70 — IK P5.7 Owner unit compatibility (2026-08-15)

**Scope:** Owner-approved local unit compatibility for 2 Wave2 Work IDs only.

- G1 `otw.`↔`szt` → `cc-w2-przebijanie-otworow` · G2 `aparat`↔`szt` → `cc-w2-przygotowanie-osprzet`
- **NOT** global `normalizeWgdomCostUnit` · **NOT** PDF `WM_UNIT_ALIAS_TO_SZT` as identity SSOT
- Live ZZK: TRUSTED WORK **34→44** · qty/sourceUnit preserved · no pricing
- EC: `UNIT_COMPATIBILITY_CONFIRMED` · `ikEntryEnabled` OFF · NG-10 RETAINED · ATH writer GAP
- Test: `scripts/test-ik-migration-01-p57-unit-semantics.mjs`

## 2.66.69 — IK P5.6 Wave 2 Work Identity seed audit (2026-08-15)

**Scope:** Controlled Wave 2 seed **audit** — no fake Work Catalog entries.

- Prod KV: W2 **8/8** + Quotes already present · SEED CREATED **0**
- Live ZZK: TRUSTED WORK **34** (empty-LS P5.5 was **0**) · IDENTITY GAP **85** · 10× INVALID_UNIT Owner review
- EC: IDENTITY_SEED_COMPLETED · WORK_IDENTITY_COVERAGE_CHANGED · OWNER_REVIEW_REQUIRED
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `scripts/test-ik-migration-01-p56-wave2-seed.mjs`
- Docs: `docs/architecture/IK-MIGRATION-01-P5.6-WORK-IDENTITY-WAVE2-SEED.md`

## 2.66.68 — IK P5.5 Identity Coverage (2026-08-15)

**Scope:** Real Master BOQ identity audit (Work + Material) — ZERO invent / pricing / research.

- REUSE: `mapOfferBoqLine` · Alias Pack · `resolveDemandProductIdentityExact` · labor identity registry (diagnostic)
- Quotes gate Mapper **unchanged** · Owner mapping possible = Pack hit + missing work/Quotes
- EC: IDENTITY_* facts · `ikEntryEnabled` default **OFF** · NG-10 **RETAINED**
- Test: `scripts/test-ik-migration-01-p55-identity-coverage.mjs`

## 2.66.67 — IK P5 Material Expert (2026-08-15)

**Scope:** Material Identity → Price Memory HIT/MISS → Phase2 research → Owner Accept.

- REUSE: `resolveDemandProductIdentityExact` · `evaluateMaterialCache` · `executeMaterialResearchPhase2` · `acceptMaterialResearchCandidate`
- Research tylko trusted material identity + PM MISS (dedupe materialKey|region)
- ZERO auto-Accept · ZERO invent z namePl · ZERO Labor rewrite · ZERO F5/Bid
- EC: MATERIAL_* facts · second lookup HIT mandatory in harness
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `scripts/test-ik-migration-01-p5-material-expert.mjs`

## 2.66.66 — IK P4 Labor Expert (2026-08-15)

**Scope:** Work Identity → OUR RATE CURRENT/MISS → selective Labor Research.

- REUSE: `mapOfferBoqLine` · `resolveWorkIdentityFromOfferBoqLine` · `lookupWorkRate` · `runIkLaborGapResearch`
- Research tylko LABOR + trusted identity + MISS (dedupe workId|unit)
- ZERO auto-Accept · ZERO Material · ZERO F5/Bid
- EC: WORK_IDENTITY_* / LABOR_* facts
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `scripts/test-ik-migration-01-p4-labor-expert.mjs`

## 2.66.65 — IK P3 Classification Gate (2026-08-15)

**Scope:** Master BOQ READY → `classifyEstimatorPricingPlane` (A1) → plane + expert handoff.

- REUSE Classification Gate · ZERO invent z `namePl`
- Taxonomy: LABOR / MATERIAL / COMPOUND(BOTH HOLD) / UNKNOWN(UNRESOLVED)
- EC: CLASSIFICATION_* facts · `sourceRef.kind=classification`
- Live ZZK: 430 linii 1:1 · bez research / wyceny / auto-Accept
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `scripts/test-ik-migration-01-p3-classification.mjs` · probe live

## 2.66.64 — IK P2.75-B Owner dwelling map → Master BOQ READY (2026-08-15)

**Scope:** jawna Owner `documentToDwelling` na realnym ZZK → Master BOQ READY (harness).

- Owner map: Kotlarska / Nasturcjowa / Ptasia / Żernicka + `common_wentylacja`
- RAW 484 → extractable 444 → composed 430 (KEEP ONE 14 + raw-skip explained)
- UNEXPLAINED LOSS/DUP = 0
- Branch hint el/budowlany; EXCLUDE_EMPTY_PARSE; LP sanitize
- `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Probe: `scripts/probe-ik-migration-01-p275b-owner-map.mjs --apply`

## 2.66.63 — IK P2.75 dwelling mapping (2026-08-15)

**Scope:** kontrolowana mapa document→lokal (REUSE multi-dwelling) + integralność linii Master BOQ.

- REUSE: `documentToDwelling`, `mapDocumentToDwelling`, `composeDwellingOfferBoq`, PackageGate
- Filename/street = **evidence only** — zero silent SSOT
- Multi-source bez Owner map → **PARTIAL/HOLD** (nie READY)
- `applyExplicitOwnerDwellingMap` — tylko jawne decyzje Owner
- Hub: `costDocumentIds` z `branchWinnerArtifacts` do panelu Multi-Dwelling
- Flaga `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `npx vite-node scripts/test-ik-migration-01-p275-dwelling-map.mjs`
- Live ZZK: **PARTIAL** do potwierdzenia mapy Owner w Hub (nie invent z nazw plików)

## 2.66.62 — IK P2.5 NG-02 ingest bridge (2026-08-15)

**Scope:** istniejący NG-02 heavy → rzeczywiste linie BOQ dla Document Expert.

- REUSE: `buildTenderDossierHeavy`, ZIP catalog, ATH/XLS/PDF parsers, OfferBoq v5
- `IkEntryHost` wywołuje mostek gdy dossier puste (po grace dla pipeline heavy)
- Expert Conversation: `INGEST_STARTED` / `INGEST_COMPLETED` / `PRZEDMIAR_EXTRACTED`
- Flaga `ikEntryEnabled` default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `npx vite-node scripts/test-ik-migration-01-p25-ingest.mjs`

## 2.66.61 — IK Document Expert P2 (2026-08-15)

**Scope:** Document Expert jako pierwszy etap IK — discovery → przedmiary → extraction → Master BOQ.

- REUSE: role dokumentów, cost discovery, FILE_TYPE_SUPPORT, OfferBoq v5, multi-boq compose, lineProvenance, PackageGate (in-memory)
- Expert Conversation: fakty COST_DOCUMENTS / PRZEDMIARY / BOQ_EXTRACTED / BOQ_READY|PARTIAL|HOLD (`sourceRef`)
- Flaga `ikEntryEnabled` nadal default **OFF** · NG-10 **RETAINED** · ATH writer **GAP**
- Test: `npx vite-node scripts/test-ik-migration-01-p2-document-expert.mjs`

## 2.66.60 — IK Entry Shell P1 (2026-08-15)

**Scope:** kontrolowane wejście Inteligentnego Kosztorysanta za `ikEntryEnabled` (default OFF).

- `/przetarg` OFF → NG-10 Autonomous Gate **1:1**
- ON → `IkEntryHost` + istniejący `ExpertConversationSurface` (fakty pipeline, `sourceRef`)
- Flaga **≠** `expertAiDecydentEnabled` (D / Dual Outcome bez zmian)
- NG-10 **RETAINED** (rollback)
- Test: `npx vite-node scripts/test-ik-migration-01-p1-entry.mjs`

## 2.66.59 — PASS2 CR discovery amendment (local · 2026-08-14)

**Scope:** Owner A1/A2 CR PASS2 discovery · **ZERO COMMIT** do osobnego Owner GO.

- CR `electrical` → `instalacje-elektryczne-cennik` (Tablica)
- CR `plumbing` → `instalacje-wodno-kanalizacyjno-gazowe-cennik` (Podejście)
- Family routing tablica/podejście · Edge allowlist mirror · Wykwity HOLD
- ZERO new hosts/mappings/aliases · ZERO Accept / OUR RATE / margin
- Tests: `scripts/test-ie-labor-pass2-cr-discovery-amendment.mjs` · `test-work-rate-pass2-allowlist-wave-1.mjs`

## 2.66.58 — IE Labor Selective Research Identity-Ready Wave-1 (local · 2026-08-14)

**Scope:** jeden batch research dla 3 LABOR identity-ready · **ZERO COMMIT** do osobnego Owner GO.

- Targets: Tablica · Podejście · Wykwity (`runIeLaborSelectiveResearchIdentityReadyWave1`)
- A1 preflight ≠ FETCH→PARSE→IDENTITY→SCOPE→QUALIFY · A2 partial UNION APPEND · A3 Wave-1 / D1
- KEEP-4 only · Evidence SSOT optional persist · ZERO Accept / OUR RATE / margin / Catalog mutate
- Test: `scripts/test-ie-labor-selective-research-identity-ready-wave-1.mjs`

## 2.66.57 — Intelligent Estimator Classification Gate (local · 2026-08-14)

**Scope:** centralna bramka `classifyEstimatorPricingPlane` · **ZERO COMMIT** do osobnego Owner GO.

- Owner map code-frozen **29 / 24 / 6 / 30** · miss → **UNKNOWN** · ZERO heurystyk
- A2: hard guard w `runSelectiveWorkRateResearch` (plane=LABOR)
- A3: guards na wire / orchestrate / refresh (plane=MATERIAL; `mat.*` OK)
- A4: `BRAK_STAWKI_ROBOT` tylko LABOR
- A5: bez Material Catalog KV — Price Memory + DIY
- ZERO Evidence populate / Catalog write / Accept / OUR RATE / margin / hosts / PASS2

## 2.66.56 — Labor identity Wave-1 mappings (local · 2026-08-14)

**Scope:** 2 Owner-approved registry rows · **ZERO COMMIT** do osobnego Owner GO.

- Tablica ← `Montaż skrzynki rozdzielczej` (CR · szt)
- Podejście ← `Wykonanie podejścia wodno - kanalizacyjnego…` (CR · mb)
- HOLD: oprawa / zawór / gniazdo / wyłącznik / white / demolition / waste
- ZERO Evidence populate / Catalog / Accept / OUR RATE / hosts / PASS2

## 2.66.55 — Labor identity mapping (local · 2026-08-14)

**Scope:** lokalna implementacja Hybrid C identity gate · **ZERO COMMIT** do osobnego Owner GO.

- `work-rate-identity-mapping.ts` · exact_normalized · catalogUnit + observedUnit
- Legacy buckets FORBIDDEN · alias cap 12 · ambiguity → UNMATCHED
- Call-site: PARSE → IDENTITY MAPPING → D1 synonyms → scope → qualify
- REUSE OWNER_SYNONYMS + D1 scopeTag · ZERO Evidence populate / hosts / PASS2 / median
- SOURCE GAP **OPEN** · NICHE **NOT CLAIMED** · coverage ~14–18/89 = PROJECTION only

## 2.66.54 — Labor source evidence DB (local · 2026-08-14)

**Scope:** lokalna implementacja Evidence SSOT · **ZERO COMMIT** do osobnego Owner GO.

- Storage: `kw-wgdom-labor-source-evidence` (≠ Work Catalog)
- Schema + provenance + deterministic `dedupeKey` · range remains min/max
- Merge: union-by-dedupeKey + empty-guard · etag/CAS optimistic concurrency
- Caps: global 8000 · per-work 80 · per-source 2000 · per-batch 200 (jawny reject, zero silent wipe)
- UNMATCHED STORE · ZERO auto CatalogWork/Candidate/Accept/OUR RATE
- REUSE D1 identity/scope · KEEP-4 hosts · D-IMPORT EMPTY · D-UI DEFER
- SOURCE GAP **OPEN** · NICHE **NOT CLAIMED**

## 2.66.53 — Labor evidence quality D1 (local · 2026-08-14)

**Scope:** lokalna implementacja D1 · **ZERO COMMIT** do osobnego Owner GO.

- Plaster: Owner synonyms `Gładzenie ścian` / `Gładź gipsowa` → primary `gladzenie_scian`
- Painting: `scopeTag` walls_ceilings przed qualify/median · joinery/artistic SCOPE_REJECT (bez price cap)
- Grooves KEEP · NATIONAL legal · C catalog split **DEFERRED**
- F5/mapper/qualify/median formulas/PASS2 MAX/hosts/Accept/OUR RATE/margin UNCHANGED
- SOURCE GAP **OPEN** · NICHE **NOT CLAIMED**

## 2.66.52 — PASS2 Allowlist Wave-1 (local · 2026-08-14)

**Scope:** lokalna implementacja · **ZERO COMMIT** do osobnego Owner GO.

- Option D: `kb_pl` grooves KEEP + plaster L1 · `cennikremontow_pl` painting P1 · **MAX=2**
- Synonym „szpachlowanie bruzd po kablach” KEEP · repairs/sealing DEFER · ZERO new hosts
- Edge mirror PASS2 map parity · F5/qualify/median/Accept/OUR RATE/margin UNCHANGED
- SOURCE GAP **OPEN** · NICHE **NOT CLAIMED**

## 2.66.51 — Work catalog migration safety (local · 2026-08-14)

**Scope:** lokalna implementacja · **ZERO COMMIT** do osobnego Owner GO.

- Guard: empty / `legacy-*`-only store nie wygrywa LWW ani persist nad katalogiem z nie-synthetic ID
- `finalizeWorkCatalogAfterDeferredMerge` dostaje snapshot cloud z deferred bootstrap
- Legalna migracja P1.5 tylko gdy chmura pusta · marża/OUR RATE/Accept bez zmian
- SOURCE GAP **OPEN** · W2 **BLOCKED**

## 2.66.50 — Catalog UI unification (local · 2026-08-14)

**Scope:** lokalna implementacja (undeployed) · **ZERO COMMIT** do osobnego Owner GO.

- Nasz Katalog Robót = chrome Nasz katalog cen (pager 100, footer, tabela + scroll)
- Shared: CommercialMarginEditor / GlobalBar / FreshnessToolbar / CatalogPager
- Labor dataset = active ∧ NOT material host · global ≠ filtered rows.map
- Stawka z marżą derived (`computeSellPricePln`) · ≠ OUR RATE
- Materiały: Zapisz + catalog-scope material IDs · seed/PM/Accept UNCHANGED
- SOURCE GAP **OPEN** · bez konfiguracji marży / W2 / Accept

## 2.66.49 — Labor global minimum margin (local · 2026-08-14)

**Scope:** lokalna implementacja (undeployed) · **ZERO COMMIT** do osobnego Owner GO.

- Super Admin: **Minimalna marża dla wszystkich robót (%)** · MAX(existing, global) · REUSE material floor
- Tylko aktywne labor IDs · bez material host · bez seed kontroli `cc-p0c-w1-zaprawianie-bruzd`
- Per-work Marża WGDOM UNCHANGED · SOURCE GAP **OPEN**

## 2.66.48 — Labor commercial margin UI (prod · 2026-08-14)

- Nasz Katalog Robót: per-work **Marża WGDOM (%)** · REUSE `commercialPricing` / `updateCommercialMargin` · tip **`61ea8135`**

## 2.66.47 — Work Rate KB Bruzdy Policy-01 (prod · 2026-08-14)

- Owner synonym „szpachlowanie bruzd po kablach” · PASS2 KB national · range→marketBase · margin REUSE · tip **`5dea7538`**

## 2.66.46 — Work Rate Research Discovery-01 INFRA PASS2 (local · 2026-08-14)

**Scope:** lokalna implementacja (undeployed) · **ZERO COMMIT** do osobnego Owner GO.

- **PASS2 plumbing:** Owner-curated category URL allowlist · client → `sourceId`+`categoryKey` (nigdy URL) · Edge resolve · PASS1 canonical bez zmian
- **Pusta allowlista** = PASS1 only · SOURCE GAP (wykwity/bruzdy/folia) **OPEN** · niche **NOT CLAIMED**
- Synonimy Owner-only (match) · telemetry · Evidence provenance · F5/qualify/Accept/OUR RATE **UNCHANGED**

## 2.66.45 — IK E2E wire W0–W2 + Labor Expert Recommendation (local · 2026-08-13)

**Scope:** lokalna implementacja (undeployed) · **nie** tip produkcyjny. Prod tip pozostaje **2.66.44** / `a245293` do osobnego Owner GO: commit → push → verify.

- **W0:** po Owner Accept — dual bump `pricingCatalogRevision` + `chiefRefreshNonce` → invalidacja Bid/F5 + Chief (bez zmiany F5)
- **W1:** `inventoryIkGapsFromShadow` — labor jobs z `BRAK_STAWKI_ROBOT` (identity OK)
- **W2:** Hub panel — selective labor research → Candidate → Owner Accept → `ourWorkRate` persist → recompute → PASS 2 REUSE (HTTP 0)
- **IK-LABOR-EXPERT-REC-01:** Evidence Pack + RO recommendation (stance / confidence / findings · provenance · delta vs previous) · anti-invent · `companyPrice` excluded · `expertMayWrite/Accept=false` · `aiAutoAccept=false` · Owner = jedyna Accept authority · Accept path UNCHANGED
- **Testy lokalne:** W0 / W1 / W2 two-pass / REC T1–T14 · F5 / mapper / qualify / accept engine **UNCHANGED**
- **Pending:** live E2E CANDIDATE proof (research-data coverage / GAP na niszowych robotach) — nie twierdzić PV / deploy

## 2.66.44 — Multi-BOQ work identity + LABOR_ONLY F5 wire (2026-08-13)

- MULTI-BOQ-WORK-IDENTITY-01: compose → mapOfferBoqDocument → trusted catalogWorkId → F5
- LABOR_ONLY (Owner allowlist) → materials[] puste · MISSING_BOM ≠ labor-only · Wave 1 materials = pending norms / GAP

## 2.66.43 — C-MODE-1a fallback removal (2026-08-12)

- OfferBoq null → GAP (bez ath_priced / catalog / companyPricePln) · F5 UNCHANGED · ATH KEEP INPUT

## 2.66.42 — Position Cost Bid cutover Faza 5 (2026-08-12)

- OfferBoq → Position Cost → Bid stack (Kp/profit/minMargin UNCHANGED) · gate · ZERO companyPrice · ZERO HTTP

## 2.66.41 — Position Cost BOQ shadow Faza 4 (2026-08-12)

- OfferBoq → work identity → OUR RATE + BOM + SELL → Position Cost (SHADOW) · ZERO Bid cutover · ZERO HTTP

## 2.66.40 — Position Cost BOM / Technology Faza 3 (2026-08-12)

- workId → TechnologyPack/`projectBom` → SELL + OUR RATE → Position Cost · C-BOM-1…5 · bez invent norm

## 2.66.39 — Position Cost materiał SELL Faza 2 (2026-08-12)

- materialKey → Price Memory → sell (`computeSellPricePln`) → Position Cost · bez BOM · ZERO Bid/Offer cutover

## 2.66.38 — Position Cost OUR RATE Faza 1 (2026-08-12)

- Nasz Katalog Robót → `lookupWorkRate` → `computePositionCost` · C-EMPTY / C-CPLN-1 · ZERO Bid/Offer/PM cutover

## 2.66.37 — Position Cost Engine Faza 0 (2026-08-12)

- Pure `computePositionCost` — labor OUR RATE × qty + Σ material SELL × qty · ZERO Bid/Offer/PM wire

## 2.66.36 — Stawki robót — parser realnych cenników (2026-08-12)

- **fix:** WORK-RATE-REAL-WORLD-VALIDATION-03 — parser tabel + kanoniczne URL · SCCOT minimum/package REJECT · selective ONE work

## 2.66.35 — Stawki robót — selective research P2 (2026-08-12)

- **new:** WORK-RATE-SELECTIVE-RESEARCH-02 — ONE work · 4 źródła · qualify · mediana · Owner Accept · Edge allowlist · anti-storm · ZERO full catalogue · Bid/Offer/PM UNCHANGED

## 2.66.34 — Stawki robót — Legal PASS Owner (2026-08-12)

- **improve:** `WORK_RATE_LEGAL_GATE` = PASS · KB.pl / SCCOT / Extradom / CennikRemontow.pl VERIFIED (Owner Attestation) · selective only · full catalogue FORBIDDEN · bez adapterów/live HTTP · material gate UNCHANGED

## 2.66.33 — Nasz Katalog Robót — UI Firma P1 (2026-08-12)

- **new:** WORK-CATALOG-REBUILD-01 P1 — Firma → Nasz Katalog Robót · OUR RATE UI · Owner Edit · historia · filtry PL · bez seed companyPricePln · research BLOCKED

## 2.66.32 — Nasz Katalog Robót — fundament OUR RATE P0 (2026-08-11)

- **new:** WORK-CATALOG-REBUILD-01 P0 — OUR RATE na `kw-wgdom-work-catalog` · identity workId+unit · C1 normalize · lookup ZERO HTTP · Owner edit bez seed `companyPricePln` · research BLOCKED · Bid/Offer/PM UNCHANGED

## 2.66.31 — Nasz katalog cen — czytelne etykiety PL (2026-08-11)

- **improve:** PRICE-MEMORY-CATALOG-03 UI polish — AKTUALNA / PRZETERMINOWANA / BRAK CENY · filtry i podsumowanie PL · logika bez zmian

## 2.66.30 — Nasz katalog cen — 372 materiałów + status Price Memory (2026-08-11)

- **fix:** PRICE-MEMORY-CATALOG-03 — katalog = materiały (seed 372) + CURRENT/STALE/MISSING · ensure lokalny · ZERO HTTP on open

## 2.66.29 — Nasz katalog cen — tylko materiały (2026-08-11)

- **fix:** PRICE-MEMORY-CATALOG-02 — katalog MATERIAL ONLY · identity → Price Memory · bez catch-all CatalogWork/Quotes · labor poza katalogiem

## 2.66.28 — Nasz katalog cen — warstwa handlowa Price Memory (2026-08-11)

- **new:** PRICE-MEMORY-CATALOG-01 — Firma → Nasz katalog cen · `commercialPricing` · global MAX margin · sell derived · force refresh ONE key (także CURRENT) → Accept → commit · bez drugiej bazy / full catalogue / Bid wire

## 2.66.27 — Real Source — selective live DIY adapters (2026-08-11)

- **new:** LIVE-ADAPTERS-08 — thin Leroy/Castorama/OBI · MISSING/STALE only · direct+regular · average · Edge `mmr-diy-selective-lookup` · CURRENT→REUSE 0 HTTP · no catalogue harvest

## 2.66.26 — Real Source — Owner Legal PASS LM/Casto/OBI (2026-08-11)

- **improve:** `MARKET_SYNC_P3_LEGAL_GATE=PASS` · `MMR_02_PRIMARY_SOURCE_STATUS=VERIFIED` (Owner Attestation); `liveHttpEligible=true`; live adapters **ADAPTER_NOT_IMPLEMENTED** do GO IMPLEMENT; prywatne dowody poza repo

## 2.66.25 — Price Memory — seed faktur Zygmunt (2026-08-11)

- **new:** HISTORICAL PURCHASE seed (faktury Zygmunt) → Price Memory `marketQuotes.wgdom` + historia; 372 materialKey; cache-first REUSE; live research **BLOCKED** (Legal OPEN / D1 UNKNOWN)

## 2.66.24 — Kosztorys — mokry jastrych cementowy V1 (2026-08-10)

- **new:** ECONOMY_WET_CEMENT_SCREED_V1 — Atlas POSTAR 10 · 2.0 kg/m²/mm · `mat.jastrych_cementowy` · wet eligibility · qty = area × thickness × 2.0 (Option A); dry/samopoziom/anhydryt OUT

## 2.66.23 — Price Intelligence — WGDOM approved ETICS (2026-08-09)

- **improve:** PRICE-INTELLIGENCE-01 P3.1 — WGDOM approved Quotes + Purchase (4× ETICS); `kw-offer-boq-company-knowledge` w DATA_KEYS; bez SQL Price DB / zewnętrznych providerów

## 2.66.22 — Katalog — Alias Wave 2 MED (2026-08-07)

- **improve:** CATALOG-WAVE-2 — 8 wąskich aliasów TOP100 + seed Library/Quotes; cel TV-01 Quotes ≥82%; AI-COST/Bid/S4 NO TOUCH

## 2.66.21 — Przetargi — luki zakresu Stage A (2026-08-07)

- **improve:** SCOPE-COMPLETENESS-01 Stage A (RO) — `scope-completeness-a1`, głębsze tokeny, cap 12; flaga `kw-scope-gap-mvp` default OFF; bez wpływu na wycenę/ofertę

## 2.66.20 — Koszt — Knowledge Engine A0+A1 (2026-08-06)

- **new:** NG-TENDERS-COST-KNOWLEDGE-01 Thin Slice — KPI Harness (RO) + Library Fill seed + Quotes REUSE (feature tip `9c0901d6`)

## 2.66.19 — Przetargi — start zawsze Przegląd (2026-08-06)

- **fix:** Menu → Przetargi zawsze otwiera Przegląd (nie last tab z LS)

## 2.66.18 — Przetargi — Workspace v2 P0 (2026-08-06)

- **improve:** 4 top-level — Przegląd · Kolejka · Mapa · Firma; Pulpit/Strategia → Przegląd; Biblioteka w Firmie
- **fix:** detal bez Global Module Nav (wszystkie breakpointy); Powrót = AC-RETURN (przywrócenie kontekstu)

## 2.66.17 — Rysunki — cofnięcie Finalnego (2026-08-05)

- **fix:** Odbiory→Rysunki — toggle Finalny↔Roboczy (`unsetDrawingFinal`); delete Final wymaga Roboczy; ACL soft-delete z `adminSession`
- **improve:** audit `drawing_finalized` / `drawing_unfinalized`; ZIP live count po demote

## 2.66.16 — Szkice — Publication Workflow placement (2026-08-05)

- **new:** Admin decyzje zamiast Accept — Usuń · Dokumentacja · Odbiory · Both (`placement`); promote-copy 1:1; Dashboard OUT po decyzji; A2 NO TOUCH

## 2.66.15 — Pulpit — Szkice Techniczne P2a (2026-08-05)

- **new:** Pulpit Admin/Inspektor — sekcja Szkice Techniczne (job-centric): pending submitted+needs_changes · deep-link Dokumentacja · flaga OFF ukrywa; A2 NO TOUCH

## 2.66.14 — Dokumentacja — Szkice Techniczne review P0 (2026-08-05)

- **new:** Dokumentacja robót → Szkice Techniczne (Admin/Inspektor): Needs Changes · Accept (Admin) · Worker resubmit · badge pending · sort workflow; A2/Rysunki NO TOUCH

## 2.66.13 — Szkice — rysowanie Mobile First P1 (2026-08-05)

- **improve:** ściana/strzałka — drag-release (Ghost mid-gesture); Snap endpoint→angle→grid
- **improve:** Worker Szkice — Mobile Chrome + drzwi/okno/wentylacja/rozdzielnia/piec

## 2.66.12 — Szkice pracownika — fundament P0 (2026-08-05)

- **new:** Worker Dokumentacja → Szkice (flaga `wmWorkerSketchEnabled` default OFF); create/submit/soft-delete; REUSE `kw-wm-technical-drawings`
- **improve:** Rysunki tab ukrywa worker non-final; soft-delete zamiast hard-remove

## 2.66.11 — WM Druk — OST widoczny adres w PDF (2026-08-05)

- fix: OST — przebudowa `/AP` dla JOB_STREET · BUILDING · APARTMENT po fill (Chrome PDF Viewer)

## 2.66.10 — WM Druk — OST zawsze w paczce ZIP (2026-08-05)

- **improve:** ACTIVE OST (`pdf_form` + plik) → Hard Ensure S2 w `buildWmPrintFilesForJob` / fingerprint publish; fill on-the-fly (bez Storage filled); checkbox OST locked

## 2.66.09 — WM Druk — migracja mapowania OST (2026-08-04)

- **fix:** historyczne sloty OST bez `pdfFieldMapping` → SSOT `WM_PRINT_OST_PDF_FIELD_MAPPING` przy bootstrap/sync (push tylko gdy `migratedCount > 0`); generator bez zmian

## 2.66.08 — Odbiory WM — formularz OST (2026-08-04)

- **new:** slot OST (`pdf_form`) w pipeline WM Druk — aliasy BUILDING/APARTMENT w `pdfFieldMapping`; upload-only
- **fix:** non-ZI `generatePdfFormFromTemplate` = mapping-only (bez LiveCycle ZI map/index)

## 2.66.07 — Worker — aparat i paragon mobile P1a (2026-08-04)

- **fix:** Aparat job = HiddenFileInput `capture` single (bez `multiple`); galeria multi bez zmian; paragon Aparat | Plik/PDF; suppress privacy via HFI; Inspector/Cloud/Payroll/viewport OUT.

## 2.66.06 — Worker + Inspektor — viewport mobile P0 (2026-08-04)

- **fix:** Shell Worker/Inspector = `var(--app-height, 100dvh)` (REUSE admin visualViewport); jeden height owner; Suspense fallback height+max-height; upload/capture/Cloud OUT.

## 2.66.05 — Odbiory WM — Rysunki MOBILE-P1 (2026-08-04)

- **improve:** Hit edit-only (`mode` edit|export) · chrome 44×44 · toolbar scroll · modal Tekst/Długość · create sheet viewport-safe; PDF/Cloud/JSON/Ghost OUT.

## 2.66.04 — Odbiory WM — Rysunki MOBILE-P0 (2026-08-04)

- **improve:** Telefon — pełnoekranowy edytor Rysunków (`createPortal`), lock scrolla, zoom ± / Reset, pan widoku; bez zmiany Ghost/PDF/Cloud/JSON.

## 2.66.03 — Odbiory WM — Rysunki P3B.1 Continuous Drawing UX Fix (2026-08-04)

- **fix:** Po utworzeniu ściany Ghost znika; narzędzie Ściana zostaje. Kolejna ściana dopiero po nowym pierwszym kliknięciu (bez auto-łańcucha od ostatniego punktu).

## 2.66.02 — Odbiory WM — Rysunki P3B Interactive Drawing UX (2026-08-03)

- **new:** Ghost Line ściany (`previewWall`) · live długość px / kratki · continuous od last point · Esc kończy
- **improve:** podgląd tylko edytor (PDF/ZIP/JSON OUT) · rAF throttle · reject L&lt;1 · ten sam `renderDrawingSvg`
- Testy: `scripts/test-wm-rysunki-01-p3b.mjs` · regresja P0–P3A

## 2.66.01 — Odbiory WM — Rysunki P3A UX polish (2026-08-03)

- **improve:** wentylacja **W** · drzwi **P/W** · rozdzielnia **R** · wall gap render-time · wymiar ze ściany (popup Długość)
- **new:** toolbar Drzwi P / W + Rozdzielnia · hover ściany przy drzwiach (wizualnie)
- Testy: `scripts/test-wm-rysunki-01-p3a.mjs` · regresja P0–P3

## 2.66.00 — Odbiory WM — Rysunki P3 w paczce ZIP (2026-08-03)

- **new:** checkbox „Dołącz rysunki” · folder `Rysunki/` · reuse `generateDrawingPdf` · manifest/fingerprint additive
- **improve:** fail-loud PDF→ZIP · sort Final · `_{shortId}` · audit `drawing_zip_included`
- Testy: `scripts/test-wm-rysunki-01-p3.mjs` · regresja P0/P1/P1B/P2

## 2.65.99 — Odbiory WM — Rysunki P2 PDF export (2026-08-03)

- **new:** Podgląd / Pobierz / Drukuj PDF (SVG→PNG@2×→pdf-lib) · A4/A3 · jobLabel + data
- **improve:** sesja bytes reuse · bez watermark/ZIP · audit `drawing_pdf_exported`

## 2.65.98 — Odbiory WM — Rysunki P1B rollout (AppSettings) (2026-08-03)

- **new:** `AppSettings.wmRysunkiEnabled` · ⚙ Moduły → Rysunki WM · mirror WM Ustawienia (ten sam SSOT).
- **improve:** gate FORCE OFF LS=`0` · one-shot promote LS=`1`→AppSettings+remove LS · React bez reload.
- Testy: `scripts/test-wm-rysunki-01-p1b.mjs` · regresja P0/P1.

## 2.65.97 — Odbiory WM — Rysunki P1 toolset (flaga OFF) (2026-08-03)

- **new:** drzwi (+ flipH) · okno · wymiar · strzałka · wentylacja · piec · opis pomieszczenia · `symbols/` · rotate 90/180/270 · draft→Final.
- **improve:** `renderSymbol` SSOT · soft warn >300 · flaga `kw-wm-rysunki-01` nadal OFF. PDF/ZIP/punkty OUT.
- Testy: `scripts/test-wm-rysunki-01-p1.mjs`.

## 2.65.96 — Odbiory WM — Rysunki P0 (flaga OFF) (2026-08-03)

- **new:** zakładka Rysunki (po Odbiory) — szablony, ściana/tekst, grid/snap, autosave, undo/redo, duplikacja · KV `kw-wm-technical-drawings`.
- **improve:** flaga `kw-wm-rysunki-01` default OFF (`localStorage` = `1` → ON). PDF/ZIP/drzwi — OUT P0.
- Testy: `scripts/test-wm-rysunki-01-p0.mjs`.

## 2.65.95 — Detekcja dokumentów — przedmiar vs oferta (2026-07-31)

- **improve:** model Doc.D1/D2/D3 + aliasy BOQ / Bill of Quantities / kosztorys ślepy → przedmiar (`doc-detection-alias-1`).
- **fix:** copy F2/UX — brak przedmiaru · wymaga OCR · brak odczytu · brak kosztorysu ofertowego (`doc-detection-ux-1`).
- Testy: `scripts/test-doc-detection-ux-alias.mjs` · regresja cost-regression-01/02.
- Bez AI / Bid / OCR / Confidence / Scope Gap / SMART.

## 2.65.93 — Scope Gap MVP — Luki zakresu (flaga OFF) (2026-07-31)

- **new:** panel „Luki zakresu” (`scope-gap-mvp-1`) w OfferBoq Cost Intelligence — RO, zero Bid/AI-COST/Quotes/History.
- **improve:** flaga `kw-scope-gap-mvp` default OFF (`localStorage` = `1` → ON).
- Testy: `scripts/test-scope-gap-mvp.mjs`.

## 2.65.92 — Confidence MVP — Pewność analizy (flaga OFF) (2026-07-31)

- **new:** wskaźnik „Pewność analizy” (0–100 + drivers) obok AI Quality Score (S7) — RO, bez wpływu na wycenę/ofertę.
- **improve:** flaga `kw-confidence-mvp` default OFF (`localStorage` = `1` → ON).
- Testy: `scripts/test-confidence-mvp.mjs`.

## 2.65.91 — CATALOG-COVERAGE-01 P0e FULL Library Seed (2026-07-31)

- **new:** FULL seed Library + Quotes: zaprawianie bruzd · zabezpieczenie folią (1 ID, BIZ A) · multiswitch antenowy.
- **improve:** DATA FIRST odblokowanie reserved Pack Wave 1 — bez zmian Negation Guard / Alias Precision / SMART / MS.
- Testy: `scripts/test-catalog-coverage-01-p0e.mjs` · OPS: `scripts/catalog-coverage-01-p0e-ops.mjs`.

## 2.65.90 — CATALOG-COVERAGE-01 P0d-A Precision + SAFE (2026-07-30)

- **fix:** Negation Guard — „bez zaprawiania bruzd” nie binduje zaprawiania (Alias|Core); multiswitch tylko token `multiswitch` (bez RTV/SAT).
- **new:** SAFE seed Library + Quotes: zawór odpowietrzający + stop ptaków. FULL reserved = P0e (OUT).
- Testy: `scripts/test-catalog-coverage-01-p0d-a.mjs` · OPS: `scripts/catalog-coverage-01-p0d-a-ops.mjs`.

## 2.65.89 — CATALOG-COVERAGE-01 P0c Alias Resolver (2026-07-30)

- **new:** Alias Resolver Wave 1 (6 reguł LOW) — Alias→Product ID · first match · eligible-only
- **wire:** Noise → Normalize → **Alias** → Mapper Core · `matchMethod=alias` przy bind
- **AR:** `piece_demontaz` = (demontaż|rozebranie) AND (piec|trzon) · bez gołego „piece”
- **DATA FIRST:** brak work w Library → no-op (5/6 reserved ID do P0d; `piece_demontaz`→`legacy-rozbiorki-m2`)
- **test:** `scripts/test-catalog-coverage-01-p0c.mjs` · OV `catalog-coverage-01-p0c-owner-verification.mjs`
- **feature:** **`aebf9d09`** · CLOSEOUT [`docs/architecture/CATALOG-COVERAGE-01-P0c-CLOSEOUT.md`](docs/architecture/CATALOG-COVERAGE-01-P0c-CLOSEOUT.md)
- **bez:** Wave 2/BIZ/HIGH · Library write · SMART/MS · P0d auto-start

## 2.65.88 — CATALOG-COVERAGE-01 P0b Normalizer (2026-07-30)

- **new:** `normalizeOfferBoqDescription` — strip ATH (KNR/d.x/krotność) · średnice `fi` · jm · whitespace
- **wire:** eligible-only po Noise Filter · `description` UI SSOT · Core na normalized
- **test:** `scripts/test-catalog-coverage-01-p0b.mjs` · OV `catalog-coverage-01-p0b-owner-verification.mjs`
- **bez:** Alias · Coverage Score · Library seed · SMART/MS · commit/push

## 2.65.87 — CATALOG-COVERAGE-01 P0a Noise Filter (2026-07-30)

- **new:** `src/lib/catalog-coverage/**` — Noise Filter przed mapowaniem OfferBoq (kalkulacja własna · transport wąski · LP · śmieci)
- **wire:** thin pre-map w `mapOfferBoqLine` · Core scoringu bez zmian · tag `isNoise`/`noiseKind`
- **guard:** „Dostawa i montaż” + KNR ≠ noise · zero write Library/Quotes
- **test:** `npx vite-node scripts/test-catalog-coverage-01-p0a.mjs` · OV `catalog-coverage-01-p0a-owner-verification.mjs`
- **bez:** Normalizer · Alias · Coverage Score · SMART/MS · seed Library · commit/push

## 2.65.86 — SMART-PRICING-01 P0 Detect RO (2026-07-30)

- **new:** `src/lib/smart-pricing/**` — Detect braków użytecznej ceny (Quotes-first · conf ≥0.50 · stale ≤180d)
- **UI:** banner + badge pozycji w OfferBoq Cost Intelligence (RO)
- **test:** `npx vite-node scripts/test-smart-pricing-01-p0.mjs` (58 PASS)
- **feature:** **`9ca4a4e5`** · CLOSEOUT [`docs/architecture/SMART-PRICING-01-P0-CLOSEOUT.md`](docs/architecture/SMART-PRICING-01-P0-CLOSEOUT.md)
- **bez:** One-shot · Evidence · Rank · Save · Publish · commit · MS lookup · Cloud CORE · Payroll · P1

## 2.65.85 — MARKET-SYNC-01 P1 Accept + Publish (2026-07-30)

- **new:** Accept/Reject/Defer (staging) · linkedWorkIds N:1 · Guard · Dry Run · Delta · Publish Summary · Kill Switch · `runMarketSyncPublish` → **tylko** `commitMarketQuotesImport` · Undo single
- **origins:** `leroy`/`castorama` w `MARKET_QUOTE_ORIGIN_IDS` · **poza** `MARKET_ORIGIN_IDS` (średnia DIY default OFF)
- **Kill Switch:** `MARKET_SYNC_PUBLISH_ENABLED` default **OFF** (check w lib przed commit)
- **UI:** Super Admin → Biblioteka → Market Sync (P1)
- **test:** `npx vite-node scripts/test-market-sync-01-p1.mjs` (+ regresja P0)
- **feature:** **`5326cf8c`** · CLOSEOUT [`docs/architecture/MARKET-SYNC-01-P1-CLOSEOUT.md`](docs/architecture/MARKET-SYNC-01-P1-CLOSEOUT.md)
- **bez:** AI-COST · Cloud Sync CORE · Payroll · drugi tor Quotes · P2

## 2.65.84 — MARKET-SYNC-01 P0 Preview staging (2026-07-30)

- **new:** `src/lib/market-sync/**` — MarketProduct · ProviderQuote · Import CSV · Normalize · Match · Preview
- **UI:** Super Admin → Biblioteka → **Market Sync Preview** (STOP przed Accept/Publish)
- **persist:** local-first `kw-market-sync-01-staging` · eksport/import JSON · **bez** Cloud DATA_KEY
- **test:** `npx vite-node scripts/test-market-sync-01-p0.mjs`
- **release:** feature **`273fb3e0`** · CLOSEOUT [`docs/architecture/MARKET-SYNC-01-P0-CLOSEOUT.md`](docs/architecture/MARKET-SYNC-01-P0-CLOSEOUT.md)
- **bez:** commitMarketQuotesImport · Quotes write · controlled_market · AI-COST · Cloud CORE · Bid · Payroll · P1

## docs — CENY-MATERIAŁÓW-04 P2 COMPLETE (2026-07-30)

- **docs:** P2 CLOSE SSOT — ROZBIÓRKI / ELEKTRYKA·GK·HYDRAULIKA / Residual ROZ (K-P2-1 PASS: 16≤18)
- **data:** FEATURE-DATA `kw-wgdom-work-catalog` — EXTEND + NEW `p2a-*`/`p2b-*` + Quotes P3.3 (bez bumpa UI)
- **KPI:** K-P2-1/2/3 PASS · false 0 · P1 10/7/7 intact · CM ~73.6%
- **SSOT:** `docs/architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`
- **NEXT:** P3 (INNE) AUDIT — Owner GO · **bez** auto-start
- **bez zmian:** AI-COST · scoring · Bid · Cloud CORE · parser · frontend

## 2.65.77 — COST-BID-GAP-01 GAP-A catalog calibration (2026-07-29)

- **improve:** GAP-A — klasyfikacja UNKNOWN (keywords) + kalibracja stawek katalogowych → wyższy direct upstream Bid
- **new:** REUSE `marketQuotes` (controlled) jako overlay materiału na ścieżce catalog · flaga `COST_BID_GAP_01_CATALOG_CAL` (default **OFF**)
- **lib:** `cost-bid-gap-01-catalog-cal.ts` · wire `wgdom-catalog-cost-engine.ts` · test `scripts/test-cost-bid-gap-01-catalog-cal.mjs`
- **DF:** `docs/architecture/COST-BID-GAP-01-DESIGN-FREEZE.md` · AR PASS
- **bez zmian:** Aggregate · COST-MULTI · Discovery · parsers · `tenders-bid-calculator.ts` · costModel · Payroll · cloud-sync · AI-first

## 2.65.76 — Force Heavy Rescan CTA (2026-07-29)

- **new:** CTA „Uzupełnij odczyty branż” + confirm · soft `forceHeavyRescanAt` → `heavyDone=false` · REUSE Heavy E-RUN
- **improve:** po reskanie sources/artifacts → MULTI-02 AGGREGATE możliwy · flaga `COST_MULTI_02_FORCE_RESCAN_CTA`
- **lib:** `cost-multi-02-force-rescan.ts` · test `scripts/test-cost-multi-02-force-rescan.mjs`
- **DF:** `docs/architecture/RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md`
- **bez zmian:** Discovery · parsers · Aggregate merge · Bid formulas · OfferBoq · Payroll · cloud-sync.ts

## 2.65.75 — COST-MULTI-02 Aggregate Bid (2026-07-28)

- **new:** `resolveCostBidInput` SSOT · modes ONE | AGGREGATE | MANUAL_HOLD · merge Branch winners → Bid/OfferBoq
- **improve:** `scanSummary.branchWinnerArtifacts` (addycyjne) · UX banner Aggregate/HOLD · flaga `COST_MULTI_02_AGGREGATE_BID`
- **lib:** `cost-multi-02*.ts` · test `scripts/test-cost-multi-02.mjs`
- **DF:** `docs/architecture/COST-MULTI-02-DESIGN-FREEZE.md`
- **bez zmian:** Discovery ONE · parsers ZIP/ATH/PDF/XLSX · COST-MULTI-01 klasyfikacja · Payroll · cloud-sync.ts

## 2.65.74 — COST-MULTI-01 Multi Cost Package (2026-07-28)

- **new:** CostPackage / BranchPackage · klasyfikacja branż · SUM_BRANCH_WINNERS / HOLD_MANUAL · banner UX na Kosztorysach
- **improve:** `scanSummary.costCandidateSources` (addycyjne) — lista kandydatów bez zmiany ONE discovery / Bid
- **lib:** `cost-multi-01*.ts` · test `scripts/test-cost-multi-01.mjs`
- **DF:** `docs/architecture/COST-MULTI-01-DESIGN-FREEZE.md`
- **bez zmian:** Bid · Discovery turniej · ZIP/ATH/PDF parsers · COST-PIPELINE · AI Cost · OfferBoq · Payroll · cloud-sync.ts

## 2.65.73 — COST-PARSER-01 ZIP unpack A/B/C (2026-07-28)

- **fix:** Stany A/B/C — unpack failed ≠ brak ATH w ZIP ≠ parse fail; 1× auto-retry unpack (Edge→JSZip)
- **improve:** HeavyDone przy `zipUnpackOk=false` tylko po retry; copy UI Outcome/sticky/empty
- **lib:** `cost-parser-zip-unpack.ts` · test `scripts/test-cost-parser-01-zip-unpack.mjs`
- **DF:** `docs/architecture/COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md`
- **bez zmian:** Bid · COST-PIPELINE · AI Cost · OfferBoq · ATH/XLSX/PDF parsers · CR-02 `archive_candidate` · Payroll · Sync

## 2.65.72 — COST-REGRESSION-02 Discovery ZIP (2026-07-28)

- **fix:** Top-level ZIP/7Z = `archive_candidate` → Discovery ≠ „Brak przedmiaru w dokumentach”
- **improve:** Heavy Done bez kosztorysu → `parse_failed` + copy „Nie znaleziono kosztorysu w archiwum ZIP”
- **lib:** `cost-regression-f2.ts` (Variant D) · test `scripts/test-cost-regression-02-discovery-zip.mjs`
- **DF:** `docs/architecture/COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md`
- **bez zmian:** Bid · COST-PIPELINE · AI Cost · OfferBoq engines · tender-document-resolver · Payroll · Sync · Epic B · Variant C

## 2.65.71 — COST-REGRESSION-01 EPIC A F2 diagnostyka (2026-07-28)

- **fix:** Outcome / sticky / empty Kosztorysy — macierz F2 (brak przedmiaru · w toku · nieudany) zamiast ogólnego „Brak rekomendowanej ceny”
- **improve:** CTA Dołącz przedmiar → Dokumenty · Ponów analizę (reuse heavy) z guard `isCostRegressionF2`
- **lib:** `src/lib/cost-regression-f2.ts` · test `scripts/test-cost-regression-01-epic-a.mjs`
- **DF:** `docs/architecture/COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md`
- **bez zmian:** Bid calculator · useTenderPricingAuto resolve · COST-PIPELINE · AI Cost · OfferBoq engines · Epic B

## 2.65.70 — COSTORYS-UX-01 WAVE 2 density & scan (2026-07-28)

- **improve:** Compact/Comfort · collapsed component rows + inline edit · Search L1 · Sort LP/Direct/Confidence
- **pipeline:** review → search → sort → render (`offer-boq-ux-wave2.ts`)
- **test:** `scripts/test-costorys-ux-01-wave2.mjs`
- **DF:** `docs/architecture/COSTORYS-UX-01-WAVE-2-DESIGN-FREEZE.md`
- **bez zmian:** Bid / AI Cost engines / COST-PIPELINE / parser / Drawer / virtualization

## 2.65.69 — COSTORYS-UX-01 WAVE 1 sticky / full width (2026-07-28)

- **improve:** Sticky Offer Summary Bar · full width tylko tab Kosztorysy · accordion Szczegóły wyceny (closed) · Evidence collapsed · filtr „Tylko do weryfikacji”
- **test:** `scripts/test-costorys-ux-01-wave1.mjs`
- **DF:** `docs/architecture/COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md`
- **bez zmian:** Bid / AI Cost / OfferBoq engines / COST-PIPELINE / parser

## 2.65.68 — CATALOG-BID-01 catalogQuantities materialization (2026-07-28)

- **fix:** `buildCatalogQuantitiesFromPreview` / `ensureKosztorysCatalogQuantities` — tylko qty > 0; martwe `catalogQuantities` bez qty nie blokują F1 recovery z `rows`
- **improve:** `athPreviewToSnapshot` kończy tor `ensure…` (SSOT przed kalkulatorem)
- **test:** `scripts/test-catalog-bid-01.mjs` (T1–T6)
- **DF:** `docs/architecture/CATALOG-BID-01-DESIGN-FREEZE.md` · **RCA:** `docs/architecture/CATALOG-BID-01-RCA.md`
- **bez zmian:** `computeTenderBidProposal` · `resolveTenderBidPricingMode` · COST-PIPELINE / OfferBoq

## 2.65.67 — COST-PIPELINE-01-BUGFIX-01 catalog fallback (2026-07-28)

- **fix:** `useTenderPricingAuto` / `resolveTenderPricingAutoProposal` — OfferBoq null → catalog Bid (nie early `proposal:null`)
- **improve:** kolejność OfferBoq → catalog → brak ceny; L0/L1/L2 / CTA / AI-COST bez zmian
- **test:** `scripts/test-cost-pipeline-01-bugfix-01.mjs`
- **RCA:** `docs/architecture/COST-PIPELINE-01-RCA-REGRESSION-01.md`

## 2.65.66 — COST-PIPELINE-01 OfferBoq → Bid (2026-07-28)

- **improve:** `useTenderPricingAuto` — gdy flaga ON: Bid z OfferBoq (S6 `offer_boq_ai`); bez milczącego catalog fallback
- **improve:** CTA Outcome → tab kosztorys + focus `#offer-boq-primary`; ATH = Evidence (L0)
- **improve:** R0: LS `kw-cost-pipeline-01=0` → catalog Bid (pre-wire)
- **test:** `scripts/test-cost-pipeline-01-wire.mjs`
- **DF:** `docs/architecture/COST-PIPELINE-01-DESIGN-FREEZE.md`

## 2.65.65 — TRE-02-HOTFIX-01 Offer Run terminal mapping (2026-07-28)

- **fix:** `deriveOfferRunSnapshot` — Pricing/Ready bez `recommendedBidPln > 0` → `insufficient_data` / „Brak rekomendowanej ceny” (nie wieczne „Trwa wycena…”)
- **improve:** „Trwa wycena…” tylko przy faktycznym I/O / docs in-flight
- **test:** `scripts/test-tre-02-hotfix-01-offer-run-terminal.mjs`
- **RCA:** `docs/architecture/TRE-02-HOTFIX-RCA.md`

## 2.65.64 — TRE-02 Outcome First Experience (2026-07-28)

- **improve:** `TRE_01_SLICE_A_DEFAULT=true` — Outcome domyślny po otwarciu przetargu (Product SSOT)
- **improve:** R0 Hub-first: LS `kw-tre-01-slice-a=0` · Hub recovery bez zmian · zero zmian Bid/AI-COST/sync
- **DF:** `docs/architecture/TRE-02-DESIGN-FREEZE.md`

## 2.65.63 — TRE-01 Slice A Outcome MVP (2026-07-28)

- **new:** Offer Run thin + Recommendation Result + Outcome UI MVP (cena z Bid Proposal)
- **new:** Foundation spine FND-01…05 na Run (niewidoczna) · flaga `TRE_01_SLICE_A` / LS `kw-tre-01-slice-a`
- **improve:** Hub V4 = recovery · default flag OFF (R0) · zero rewrite AI-COST/Bid/parserów/sync
- **DF:** `docs/architecture/TRE-01-DESIGN-FREEZE.md`

## 2.65.62 — AI-COST-02 / COST-02-A Modele cenowe (2026-07-27)

- **new:** `tender-offer-boq-controlled-price-source.ts` — provider `controlled_market` z odczytu Work Catalog `marketQuotes` (region · aktualność · confidence)
- **improve:** leadingProviders: CK + controlled market · badge UI · explainability RO
- **reuse:** Bid Proposal / S6 bez zmian · zero Kp/marży w AI-COST · zero scrapingu · zero Cloud Sync
- **DF:** `docs/architecture/WGDOM-AI-COST-02-COST-02-A-DESIGN-FREEZE.md`

## 2.65.61 — AI-COST-01-STAB-01 Field Ready Stabilization (2026-07-27)

- **fix:** reprice zachowuje `user_approved` / `user_changed` (AI tylko `aiSuggested*`)
- **improve:** rekomendacje walidacji grupowane z licznością + expand w UI
- **fix:** klasyfikacja sprzątanie/odbiory/próby/dokumentacja/zabezpieczenia
- **improve:** pokrycie wyceny (heurystyka materiału) · explainability braku ceny · telemetria lokalna
- **RWAT:** unpriced 252→0 · rekomendacje ~2009→4 · Quality 8→41 · **FIELD READY** (kandydat)
- **DF/RR:** `docs/architecture/WGDOM-AI-COST-01-STAB-01-*`

## 2.65.60 — AI-COST-01 / COST-S7 AI Validation & Offer Quality (2026-07-27)

- **new:** `tender-offer-boq-validation.ts` — silnik walidacji jakości (read-only): braki wyceny, low confidence, review pending, niespójności ilości/jednostek/źródła, kompletność pipeline
- **improve:** panel „Gotowość oferty” + „Ocena jakości AI” + lista rekomendacji (priorytet) w `OfferBoqCostIntelligencePanel`
- **reuse:** wyliczenia Kp/marży/oferty pozostają wyłącznie w `computeTenderBidProposal` (brak drugiego kalkulatora)

## 2.65.59 — AI-COST-01 / COST-S6 Bid Proposal Integration (2026-07-27)

- **new:** adapter AI Cost → `computeTenderBidProposal` (tryb `offer_boq_ai`) — koszt bezpośredni z AI, Kp/marża/oferta przez istniejący Bid Proposal
- **improve:** panel Kosztorys — „Wpływ AI na ofertę”, podsumowanie oferty (costStack SSOT), ścieżka audytu 4 kroki
- **DF/RR:** `docs/architecture/WGDOM-AI-COST-01-COST-S6-*`

## GLOBAL-DESIGN-SYSTEM-MAINT-01 — CLOSED (2026-07-26)

- **status:** **CLOSED** · thin maintenance po GDS-01 · **GDS-01 pozostaje CLOSED**
- **MAINT-01A:** SOAK-01 (WgField id/htmlFor) + SOAK-03 (WgModalFrame close 44×44) — **WDROŻONE** · Owner ACCEPTED
- **DEFER:** SOAK-02 (WgButton touch target) · SOAK-06 (body scroll lock)
- **tip UI:** nadal **2.65.46** (LOGIN-UI-01) do release commit Ownera
- **closeout:** `docs/architecture/GLOBAL-DESIGN-SYSTEM-MAINT-01-CLOSE-REPORT.md`

## GLOBAL-DESIGN-SYSTEM-01 — EPIC CLOSED (2026-07-26)

- **status:** **CLOSED** · Production UI Review **ACCEPTED** · tip UI nadal **2.65.46** (LOGIN-UI-01) do release commit Ownera
- **slices:** S0 Foundation · S1 Focus+Overlay · S2 Shell Topbar · S3 CTA+Search · S4 Modal Rollout
- **SSOT:** `wg-ui-tokens` + `WgButton` · `WgField` · `WgCard` · `WgModalFrame`
- **DS-13:** No Parallel Design Systems — nowe UI wyłącznie Wg*; bez lokalnych Button/Input/Modal; bez reaktywacji shadcn bez decyzji architektonicznej
- **OUT:** TEUX · Payroll CORE · Dashboard/Sidebar full · Cloud Sync · Edge · auth/routing/API
- **closeout:** `docs/architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md` · D-21 `docs/AI/12_DECISION_LOG.md`
- **next:** GDS-02 tylko po Owner GO · post-epic MAINT-01 **CLOSED** (SOAK-01+03 · DEFER 02/06)

## 2.65.44 — Theme toggle Inspektor + Pracownik

- **improve:** SSOT `ThemeToggle` (wydzielony z AdminTopbar) także w Panelu Inspektora i Panelu Pracownika
- **bez** zmian ThemeProvider / storageKey / logiki motywów / RBAC / layoutów

## PAYROLL EPIC CLOSED — Hours-wipe protection (2026-07-24)

- **status:** **CLOSED** · **PRODUCTION VERIFIED** · UI tip **2.65.43** · feature **`ea1b0a6`**
- **stages:** D1 Telemetry · D2 Domain Gate · D3 intentionalHoursClear · D4 `-prev` Recovery Banner · D5 Soft Restore
- **closeout:** `docs/architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`
- **release history:** `docs/releases/PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md`
- **out of epic:** CI Gate B (TEUX / guard CI) → osobny EPIC · brak nowych prac Payroll z tego EPIC

## 2.65.43 — PAYROLL-IMPLEMENT-03 D4+D5 (-prev banner + Soft Restore)

- **fix:** D4 Recovery Banner from `kw-week-employees-prev` only (≠ archive RB); CTA → Domain Push
- **fix:** D5 Soft Restore overlay on add (session / -prev); `weekEmployeeFromDir` stays PURE; „Dodaj puste” skip
- **bez** zmian D1–D3 · W1/W2 entry · Domain Push model · Cloud Sync merge · SSOT · Resurrection
- **test:** `scripts/test-payroll-prev-recovery-soft-restore-d4-d5.mjs`

## 2.65.42 — PAYROLL-IMPLEMENT-02 D2+D3 (domain gate + intentionalHoursClear)

- **fix:** D2 Domain Gate + UI confirm for hours collapse (D14 thresholds); Cancel = no Cloud write / UI keeps before
- **fix:** D3 `skipPayrollGuard` only when `intentionalHoursClear === true` (guardStrict ON)
- **lib:** `payroll-hours-collapse-gate.ts` · sticky intentional in domain-push debounce
- **IC-7:** rollover / clear-all / replace-all outside D2 hours gate (clear/replace use intentionalHoursClear after existing UI confirm)
- **bez** D4 Recovery Banner · D5 Soft Restore · bez zmiany W1/W2 entry / `weekEmployeeFromDir` / resurrection / SSOT
- **test:** `scripts/test-payroll-hours-collapse-gate-d2-d3.mjs`

## 2.65.41 — PAYROLL-IMPLEMENT-01 D1 (write-path telemetry)

- **improve:** Passive write-path forensic ring (`payroll.write_path`) on domain flush / `pwrPush` / `pwrAdd` / `pwrRemove`
- **fields:** hoursBefore/After · source · intentionalHoursClear (log only) · empSample
- **console:** opt-in via existing `wg-payroll-trace=1` / `__wgdomPayrollTraceEnable`
- **kill-switch:** `wg-payroll-write-path-telemetry=0`
- **bez** D2/D3/D4/D5 · bez zmiany guardów / Domain Push / Cloud Sync / W1/W2
- **test:** `scripts/test-payroll-write-path-telemetry-d1.mjs`

## 2.65.39 — INCIDENT-23-07 cleanup (diag off by default)

- **improve:** Payroll DIAG auto-enable OFF (storage/write/boot-path); `isPayrollTraceEnabled` opt-in; `[sync-metrics]` / dossier `console.debug` tylko DEV lub `VITE_DEBUG_*`
- **bez** Sync Storm / Edge / StorageManager / ARCH-02F / logiki biznesowej

## 2.65.38 — TENDERS-SYNC-STORM-P0 (heavy dossier sync storm)

- **fix:** `useTenderDossierHeavyLazy` — E-RUN deps bez `builtAt`; partial = local only; final = 1× coalesce cloud; generation + inflight + circuit breaker
- **lib:** `updateItem(..., { persist })` · `scheduleTenderPipelinePersist({ force })`
- **test:** `scripts/test-tenders-sync-storm-p0.mjs` (T1–T8)
- **bez** persistKey API / Payroll / StorageManager / Edge / Merge / Cloud protocol

## 2.65.35 — PAYROLL-CLOUD-RESURRECTION-01 (bootstrap freshness fence)

- **fix:** Bootstrap CloudLoader — freshness fence przed push payroll KV
- **fix:** `mergeWeekEmployeesForWeekRange` / `mergeArchive` — Cloud intentional empty wygrywa nad bogatym LS
- **lib:** `payroll-bootstrap-resurrection-fence.ts`
- **test:** `scripts/test-payroll-cloud-resurrection-01.mjs` (T1–T6 dual-session)

## 2.65.34 — PAYROLL-P0-WEEK-ROLLOVER-01 (PAYROLL-ROLL-001)

- **fix:** Lista Płac — realny rollover tygodnia (Nd ≥20:00): archiwum + clear roster + push KV; align etykiet tylko gdy poprzedni tydzień już w archiwum (bootstrap).

## 2.65.33 — CLOUD-P0-DEADLOCK-N1 retry transient batch-set

- **fix:** `pushKeysToCloud` — retry 40P01 / `deadlock detected` (4 próby: 0 → 250 → 500 → 1000 ms)
- **fix:** `isTransientBatchSetError` — jedyna klasyfikacja retryable; toast dopiero po wyczerpaniu
- **telemetry:** attempt · delay · requestId · keysCount · batchSize · `batchSetRetries`
- **bez** App.tsx / Edge / merge / Payroll guard
- **test:** `npx vite-node scripts/test-cloud-deadlock-n1-retry.mjs`

## 2.65.32 — TENDER-P0.1 Active Catalog Classifier SSOT

- **fix:** `classifyAthLineCategory(desc, unit, catalog?)` — keywords z aktywnego `WgdomCostCatalog`
- **fix:** `computeFromCatalogRow` przekazuje ten sam katalog do klasyfikacji i stawek
- **bez** parsera PDF / phrase rules / user dict / Payroll / Cloud / Jobs
- **test:** `npx vite-node scripts/test-tender-p0.1-active-catalog-classifier.mjs`

## 2.65.31 — THEME-01D.1 TopBar theme toggle

- **improve:** Szybki przełącznik motywu w `AdminTopbar` (Moon/Sun) — obok Hymnów, `≥sm`
- **improve:** Ten sam `useTheme` / `wg-theme` co ⚙ Ustawienia — bez nowego storage
- **bez** zmian theme.css / FOUC / Dark Parity / Protected Core
- **test:** `e2e/theme-01c-local-verify.spec.ts` (test 10 topbar toggle)

## 2.65.30 — THEME-01C Atomic theme migration

- **improve:** `:root` = Light · `.dark` = Production Dark (2.65.28 parity) · standard next-themes/Tailwind/shadcn
- **improve:** Przełącznik Ciemny/Jasny w ⚙ Super Admin · `App.tsx` Toaster z `ui/sonner`
- **bez** Payroll / CloudLoader / sync / IndexedDB / Edge
- **test:** `npx vite-node scripts/test-theme-01c-atomic-migration.mjs`

## 2.65.29 — THEME-01B Theme foundation

- **improve:** `WgdomThemeProvider` (next-themes) · `wg-theme` localStorage · FOUC guard w `index.html`
- **improve:** Theme Engine SSOT `src/app/theme/theme-engine.ts` — dark = `:root` bez klasy `.dark` (dark parity prod)
- **bez** zmian widoków / Payroll / CloudLoader / sync · App.tsx nietknięty
- **test:** `npx vite-node scripts/test-theme-01b-foundation.mjs`

## 2.65.28 — LOCALSTORAGE-ARCH-02 A–E

- **improve:** snapshot bundles / jobs snaps → IndexedDB; pipeline lean + cold; WM cold single-writer; audit rings IDB
- **diag:** `window.__WG_STORAGE__` — report / largest / budget / writers / history
- **bez** Payroll / CloudLoader gate / cloud merge / Facade F

## 2.65.27 — PAYROLL-P0-FIX-01 (QuotaExceeded ≠ FAILED)

- **fix:** CloudLoader — `safeSetLocalStorageJson` / `persistBootstrapMergedKey`; QuotaExceeded = storage-failure (log), nie abort bootstrapu
- **fix:** SUCCESS = fetch + merge; payroll LS first; in-memory handoff → INIT roster bez czekania na pull
- **test:** `scripts/test-payroll-p0-fix-01-storage.mjs`

## 2.65.26-diag — PAYROLL-P0-RCA-07 (boot path A vs B)

- **diag:** `window.__WG_PAYROLL_BOOT_PATH__` — report / verdict (A=TIMEOUT→INIT=0 · B=SUCCESS+persist skip→INIT=0)
- **diag:** mirror z istniejących reason `logPayrollBootstrapTraceFromWeekKeys` (bez edycji CloudLoader)
- **bez** zmian logiki — usuń po Architecture Review

## 2.65.25-diag — PAYROLL-P0-DIAGNOSTIC-02 (sourceFunction)

- **diag:** każdy `setWeekEmployees` → `sourceFunction` (pullFromCloudAndMerge, applyAdminDataBundle, replaceWeekWithAllActive, tryPayrollWeekCycle, …)
- **bez** zmian logiki — usuń po capture WRITE #2 (0→14)

## 2.65.24-diag — PAYROLL-P0-REGRESSION-06 (storage timeline only)

- **diag:** `window.__WG_PAYROLL_STORAGE_TRACE__` — enable / report / download / clear
- **diag:** patch `localStorage` GET/SET/REMOVE dla `kw-week-employees` (size, count, caller, stack) + BOOT_SNAPSHOT przed React + CloudLoader PHASE
- **bez** zmian logiki Payroll / Cloud Sync / PayrollView — usunąć po capture Ownera

## 2.65.23-diag — PAYROLL-P0-DIAGNOSTIC-01 (write-trace only)

- **diag:** `window.__WG_PAYROLL_WRITE_TRACE__` — enable / report / download / clear
- **diag:** każdy write `kw-week-employees` + recompute `productionWeekEmployees` / `displayEmployees`
- **bez** zmian logiki Payroll / Cloud Sync / PayrollView — usunąć po capture Ownera

## 2.65.22 — PAYROLL-P0-REGRESSION-04 (mount bez wipe rosteru)

- **fix:** P0 — `tryPayrollWeekCycle` deferuje `autoArchiveAndAdvance` gdy żywy roster + stale week keys → najpierw `resolvePayrollOperationalWeekKeys` (bez `setWeekEmployees([])` na mount)
- **test:** `test-payroll-display-p0-regression-04.mjs`

## 2.65.21 — PAYROLL-P0-REGRESSION-03 (tabela LP bez ~20 s opóźnienia)

- **fix:** P0 — żywy roster + stale `weekFrom`/`weekTo` po rolloverze → `resolvePayrollOperationalWeekKeys` wyrównuje klucze od razu (bez `pullFromCloudAndMerge` ~15–20 s)
- **fix:** `bumpAutoSyncSuppress` — nie nadpisuje 60 s bootstrap suppress (wmPrint seed / commity)
- **fix:** `kw-employee-leaves` → `BOOTSTRAP_CORE_KEYS` (rollover blockers bez deferred hydrate)
- **test:** `test-payroll-display-p0-regression-03.mjs`

## 2.65.20 — PAYROLL-P0-REGRESSION-02 (tabela LP natychmiast — nowy tydzień)

- **fix:** P0 regresja po utworzeniu nowego tygodnia — collapse display przy żywym rosterze (topbar 14 / KPI OK, tabela pusta 60–120 s)
- **fix:** `payroll-cycle` — kanoniczne `payrollWeekRangeKey` (So ≡ Nd) w `isPayrollWeekClosedForUi` / `findPayrollWeekSnapshot`
- **fix:** `resolvePayrollDisplayEmployees` — bieżący tydzień płacowy zawsze live roster (guard `isPayrollCalendarBehind`)
- **test:** `test-payroll-display-p0-regression-02.mjs`

## 2.65.19 — PAYROLL-DISPLAY-UNLOCK-TRACE-02 (findFirstDisplayUnlock)

- **improve:** `findFirstDisplayUnlock()` — pierwsze przejście display 0→N + diff vs poprzedni event · `calendarBehind` · `download()` → `{ firstDisplayUnlock, events }`

## 2.65.18 — PAYROLL-BOOTSTRAP-RACE-FIX-01 (CORE)

- **fix:** CloudLoader — `bootstrapPhase` gate: persist CORE LS przed mount App (koniec race `useLocalStorage.init` vs bootstrap `setItem`)
- **fix:** usunięty równoległy `setReady` @ 3 s — offline escape `TIMEOUT` @ 15 s
- **closeout:** PROGRAM CORE · test `test-payroll-bootstrap-race-fix-01.mjs`

## 2.65.17 — PAYROLL-DISPLAY-RUNTIME-TRACE-01 (tymczasowa diagnostyka renderu LP)

- **improve:** `payroll-display-runtime-trace.ts` — flaga `__WG_PAYROLL_DISPLAY_TRACE__` · trace `resolvePayrollDisplayEmployees` + `PayrollView` pre-table · `findFirstDisplayCollapse()` · sessionStorage przetrwa Ctrl+Shift+R

## 2.65.16 — PAYROLL-BOOTSTRAP-RUNTIME-TRACE-01 (tymczasowa diagnostyka F5)

- **improve:** `payroll-bootstrap-runtime-trace.ts` — flaga `__WG_PAYROLL_BOOTSTRAP_TRACE__` · trace CloudLoader → rollover mount · sessionStorage przetrwa Ctrl+Shift+R
- **note:** brak zmiany logiki merge — tylko audyt bootstrap Ownera

## 2.65.15 — PAYROLL-ANTI-LEAK-RUNTIME-TRACE-01 (tymczasowa diagnostyka P0)

- **improve:** `payroll-anti-leak-runtime-trace.ts` — flaga `__WG_PAYROLL_ANTI_LEAK_TRACE__` · log anti-leak + probe przed `applyAdminDataBundle`
- **note:** brak zmiany logiki merge — tylko audyt runtime Ownera

## 2.65.14 — PAYROLL-ANTI-LEAK-FIX-01 cross-week leak guard (Wariant B)

- **fix:** `applyRuntimePayrollAntiLeak` — nie czyści same-week Cloud SSOT (focus pull po wpisie godzin)
- **fix:** anti-leak tylko cross-week leak lub stale archive republish — P-INV-5 zachowany
- **improve:** trace `anti_leak` — `reason` + `cloudWeekKey` / `targetWeekKey`
- **closeout:** PROGRAM CLOSED · prod smoke **12/12 PASS** · [`docs/releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md`](docs/releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md)

## 2.65.13 — JOBS-SYNC-FIX-01 admin bundle write-first + reconcile fresh

- **fix:** auto-sync po lokalnej mutacji — `writeOnly` skip `applyAdminDataBundle` w tym cyklu
- **fix:** `resolveReconcileFreshForKey` — React snapshot nowszy od LS wygrywa w reconcile
- **improve:** `admin-bundle-sync-guard` — generation guard przed apply
- **closeout:** PROGRAM CLOSED · prod smoke PASS · [`docs/releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md`](docs/releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md)

## 2.65.12 — JOBS-PHOTOS-LIVE-INSTRUMENTATION-03 trace in-memory activation

- **improve:** `jobs-photos-live-trace.ts` — aktywacja in-memory (`__WG_ENABLE_JOBS_PHOTO_TRACE__` / `enable()`); usunięty gate localStorage (QuotaExceeded)

## 2.65.11 — JOBS-PHOTOS-LIVE-INSTRUMENTATION-02 diagnostic trace (Owner only)

- **improve:** `jobs-photos-live-trace.ts` — read-only hooks setJobs/sync/pull/apply/focus; aktywne tylko przy `localStorage wg-jobs-photos-live-trace=1`; export `__WG_JOBS_PHOTOS_LIVE_TRACE__`

## 2.65.10 — JOBS-PHOTOS-DELETE-SYNC-01 Usunięte zdjęcia nie wracają po sync

- **fix:** `deletedPhotoTombstones[]` + `mergePhotos(..., tombstones)` w `mergeJobsById`; delete admin/pracownik przez `removePhotoWithTombstone`

## 2.65.9 — JOBS-ASSETS-SYNC-01 Zdjęcia robót nie znikają po sync

- **fix:** `mergeJobsById` — `photos[]` union po `id` (`mergePhotos`); bez zmian upload/storage/reconcile chain

## 2.65.8 — NG11-FF-01 Panel Super Admin: sekcja Developer

- **improve:** `AdminSettingsModal` — NG11-Q1/Q2/Q3 + A2/A3 w zwijanej sekcji Developer (kill switches); bez zmian AppSettings/runtime

## 2.65.7 — JOBS-FORM-RACE-01 Formularz Robót bez utraty znaków

- **fix:** `JobsView.updateJob` — functional merge `{ ...prevJob, ...delta }` w setJobs; pola formularza delta-only (bez `{...selectedJob}`)

## 2.65.6 — JOBS-ADDRESS-SYNC-01 Adres roboty nie znika po sync

- **fix:** `mergeJobsById` field-level merge `address`/`flatNumber` — non-empty wins over empty; JobsView functional onChange

## 2.65.5 — ROBOTS-INSPECTOR-01 Inspektor WM stale sync reconcile

- **fix:** `reconcileJobsWithFreshLocal` + SSOT `finalBundle` — `assignedInspectorId` nie znika po auto-sync; push/fingerprint parity z apply

## 2.65.4 — PAYROLL-ARCHIVE-01 Archiwum stale apply reconcile

- **fix:** `reconcileArchiveWithFreshLocal` — edycja dnia w Archiwum nie cofa się po cloud sync (stale apply race)

## 2.65.3 — NG11-P0.2 BZP documents transport (414 fix)

- **fix:** `fetchTenderDocuments` — bez `noticeHtml` w GET query gdy jest `noticeNumber`/`bzpNumber` (HTTP 414 · Autonomous Bootstrap)

## 2.65.2 — NG11-P0.1-A Bootstrap deferred retry

- **fix:** bootstrap ponawia discovery po `bootstrapKey` drift (RC-1) — koniec utraty dokumentów przy Autonomous Run

## 2.65.1 — NG11-P0 Discovery Unification

- **fix:** `discoverTenderDocumentsSSOT` — wspólny core BZP fetch dla manual · bootstrap · rescan
- **fix:** intelligence `discoveryMergedItem` — patch discovery przed sync pipeline props
- **improve:** bootstrap persist discovery przed shell SWZ; guards retry przy 0 załącznikach

## 2.65.0 — NG11-A5 Strategic vs Economic

- **improve:** jawny split strategic (T0) vs economic (Q5) w `TenderIntelligenceContext` — readiness fields
- **improve:** lib-only additive · `displayDecision` bez zmian (NG10 frozen)

## 2.64.0 — NG11-A3 Discovery Fork

- **improve:** auto bootstrap — speculative external ∥ BZP · cancel when BZP>0 · timeout 45s · T1 pool ≤2
- **improve:** flaga `pipelinePerfDiscoveryFork` (Super Admin, default OFF)

## 2.63.99 — NG11-A2 Dossier Artifact Cache

- **improve:** session artifact cache heavy parse (cost/full phases, LRU 12) — retry same fingerprint
- **improve:** flaga `pipelinePerfArtifactCache` (Super Admin, default OFF)

## 2.63.98 — NG11-Q2 Parallel Archive Unpack

- **improve:** dossier ZIP/7Z unpack — bounded parallel ≤2 · serial deterministic merge · sort unchanged
- **improve:** flaga `pipelinePerfUnpackParallel` (Super Admin, default OFF)

## 2.63.97 — NG11-Q1 Parse Concurrency

- **improve:** dossier cost/metadata parse — bounded parallel ≤3+3 · serial deterministic merge
- **improve:** flaga `pipelinePerfParseConcurrency` (Super Admin, default OFF)

## 2.63.96 — NG11-Q3 Debounced Persist

- **improve:** LS sync natychmiast · cloud persist debounce 500 ms · flush Ready/Failed/visibility/beforeunload/unmount
- **improve:** flaga `pipelinePerfDebouncePersist` (Super Admin, default OFF)

## 2.63.95 — NG11 Wave 1 (Progressive Heavy A1 + Cost-first Pricing Q5)

- **improve:** A1 — cost/metadata split heavy build · partial dossier persist · partialDossierReady / dossierEnriching
- **improve:** Q5 — early pricing on partialDossierReady (pricingReadyPartial) · final recompute after metadata (pricingReadyFinal)
- **improve:** PipelineState Pricing before Ready · dev timing pricing.compute_partial / pricing.compute_final

## 2.63.94 — NG10 Autonomous Agent UX Complete

- **improve:** Timeline 12 kroków + 5 makr · mobile collapsible Postęp analizy
- **improve:** Dziennik analizy — pełny `phaseView.feed` (achievement/live/status)
- **improve:** Dynamic Status P0–P4 (discovery, wycena, opłacalność, partial data)
- **improve:** Transition S4 — hold/bridge „prezentacja wyników” + exitSummary + timelineSnapshot
- **improve:** Timeout S5 — pasek 150 s (po 30 s) · T-30 · FAQ auto-expand 45 s · ukrycie legacy ETA
- **improve:** Chip analizy częściowej (timeout / no_attachments / discovery_pending / incomplete_pricing)
- **improve:** HelpView — sekcja Autonomous Agent FAQ

## 2.63.91 — TENDER-WORKSPACE-LAYOUT scrollowalne accordiony

- **improve:** `TenderScrollableAccordion` — SSOT Tier A (postęp, info, operator) · max-h 280/300/320 + overscroll-contain
- **improve:** Tokeny TWSL w `tender-ux-tokens.ts`

## 2.63.90 — NG10-HOTFIX-02 Autonomous Gate timeout bez discovery

- **fix:** Timeout 150 s → rekomendacja bez `discoverySettled` (wymaga `scoringReady` + `displayDecision`)
- **improve:** Watchout „dokumentacja nadal się pobiera” przy timeout + discovery pending
- **fix:** AC-11 — po Workspace gate nie wraca do S1; Workspace dostaje aktualizacje pipeline

## 2.63.89 — NG10-HOTFIX-01 Autonomous Gate partial + timeout

- **fix:** Autonomous S1 — OutcomePartial (HOLD/NO-GO) + timeout 150 s → ekran rekomendacji
- **fix:** AC-18 — po Reveal gate nie przejmuje ponownie ekranu w tej sesji
- **improve:** Banner analizy częściowej + watchout timeout na S2

## 2.63.88 — PAYROLL-SIM-01 Symulacja wypłaty

- **new:** Lista Płac — tryb symulacji wypłaty (wykluczanie osób z sum UI, bez mutacji payroll)
- **improve:** Eksport PDF/Word/Email — zawsze pełne dane (symulacja nie wpływa)

## 2.63.87 — P0-A iOS Login Shell

- **fix:** LoginScreen — `try/finally` na `passLoading` (admin + inspektor)
- **fix:** Remember password fail-safe + `mapAdminLoginError` (crypto/LS)
- **improve:** HelpView FAQ iPhone/Safari · boundary FEATURE only

## 2.63.86 — NG-10 Autonomous Tender Workspace

- **new:** Autonomous Agent full-screen gate (S1) — fingerprint LS, feed, ETA, achievements nad pipeline NG-02
- **new:** Outcome / rekomendacja GO·HOLD·NO-GO (S2) → Reveal NG-08 Workspace
- **improve:** Pulpit `openTenderById` → tab `przetarg` (było `decyzja`)
- **boundary:** FEATURE UI only · slices 03–05 `d850534`→`5863acb` · #CORE-013 PASS · LIB-NG10-01 41/41

## 2.63.85 — P0 Payroll Cross-Device Sync (SYNC-ARCH-01 S2)

- **fix:** Lista Płac — domain push dla mutacji pól (godziny, stawki, premie, potrącenia) — cross-device sync przywrócony
- **fix:** Incydent P0 Payroll Cross-Device Sync CLOSED · prod smoke PASS 2026-07-10 · `e819124`
- **boundary:** SYNC-ARCH-01 S2 · Payroll poza RS push · contract test cross-device 18/18

## 2.63.84 — NG-09-05 Inspector Program Closeout

- **improve:** InspectorOverlays · buildRecoverableStatsByJobId dedup · panel orchestrator
- **boundary:** NG-09 epic COMPLETE (5/5)

## 2.63.79 — M-03 Mobile Re-certification

- **fix:** breakpoint cliff 392px → max-[430px] · KPI hidden until 2xl · shortcuts min-h-11 · unified command shell · AC-M03-08 tab delta ≤32px
- **boundary:** STABILIZATION M-03 · 6 pliki allowlist · #CORE-013 PASS · #CORE-014 PASS

## 2.63.78 — NG-08-HF-01 Visual Smoke Remediation

- **fix:** Command Layer density · mobile KPI hide · shortcuts row + 44px touch · scroll hub w scroll root (KPI-UX-01)
- **boundary:** hotfix REC-1 · 2 pliki UI · #CORE-013 PASS · #CORE-014 PASS

## 2.63.77 — NG-08-05 Tender Cost Workspace

- **improve:** TenderCostWorkspaceBridge Kosztorys↔Ceny · CostShortcutChip · hub cost row · TEUX typography Ceny · LS scroll kosztorys|ceny
- **boundary:** slice NG-08-05/05 · WF-05 · REC-1 · presentation only · #CORE-013 PASS

## 2.63.76 — NG-08-04 Tender Documents Workspace

- **improve:** TEUX section titles · LS persist expanded groups · secondary collapse SWZ meta · touch-safe headers · per-group empty row
- **boundary:** slice NG-08-04/05 · WF-04 · REC-1 · presentation only · #CORE-013 PASS

## 2.63.75 — NG-08-03 Tender Workspace Intelligence

- **improve:** Hub Podsumowanie oferty pinned na Przetargu · IntelligenceShortcutChip globalny · KPI-UX-01 · split progress/insights (OPT-E)
- **boundary:** slice NG-08-03/05 · WF-03 · REC-1 · presentation only · #CORE-013 PASS

## 2.63.74 — NG-08-02 Tender Workspace Progress

- **improve:** Process Strip na wszystkich tabach V4 · highlight „Tu jesteś” · BlockersChip · V2 compact poza accordionem · most Kosztorys
- **boundary:** slice NG-08-02/05 · WF-02 · presentation only · #CORE-013 PASS

## 2.63.73 — NG-08-01 Tender Workspace Frame

- **improve:** CTA workflow na wszystkich tabach detalu · breadcrumb Decyzja › sub-sekcja · continuity hint w menu Moduł · max-w-7xl content
- **boundary:** slice NG-08-01/05 · presentation only · WF-01

## 2.63.72 — NG-07-04 Lista desktop density

- **improve:** max-w-7xl content · filtry bez max-w-4xl · border-b między kartami · ciaśniejsze desktop rows
- **boundary:** slice NG-07-04/04 · allowlist 3 pliki + changelog

## 2.63.71 — NG-07-03 Lista karty + empty states

- **improve:** badge cap 3 mobile / 4 desktop · urgency priority · karty hierarchy · desktop compact meta
- **improve:** empty state bez duplikatu refresh · TEUX_FONT_META w list chrome
- **boundary:** slice NG-07-03/04 · allowlist 4 pliki

## 2.63.70 — NG-07-02 Lista first-screen compaction

- **improve:** tab bar + search row `py-1.5` · insight banner single-line compact · liczniki inline w sekcjach
- **boundary:** TendersModule + TendersView only · slice NG-07-02/04

## 2.63.69 — NG-07-01 Lista KPI dashboard + CTA dedup

- **new:** `TenderListKpiDashboard` — 4 metryki nad listą przetargów (mobile 2×2, desktop 4-col)
- **improve:** `TendersModuleHeader` compact · usunięty duplikat Odśwież z toolbaru listy
- **boundary:** FEATURE UI only · slice NG-07-01/04

## 2.63.68 — PAYROLL-RACE-01 reconcile przed apply + guard edycji LP

- **fix:** `reconcilePayrollKeysWithFreshLocal` — `kw-week-employees` + `kw-jobs` przed `applyAdminDataBundle` (race stale snapshot)
- **fix:** `runPayrollWeekEmployeeFieldEdit` + `extendScopeSuppress` — guard parity edycji dni/przydziałów LP
- **test:** `LIB-PAYROLL-RACE-01` T-RACE-01…09 · gate payroll 16/16
- **boundary:** CORE only · zero Edge/PWRB/merge algorithm

## 2.63.67 — SMS-UI-01 Wyczyść wybór odbiorców

- **fix:** `EmployeeSmsModal` — init wyboru odbiorców tylko przy otwarciu modala; sync nie nadpisuje „Wyczyść wybór”
- **boundary:** 1 plik UI · zero Protected Core

## 2.63.66 — NG-06-TEUX-7z Epic closeout smoke

- **improve:** `SMOKE-TEUX-NG06` — agregat 12 testów TEUX-1…7f · suite `smoke-teux`
- **improve:** `NG-06-TEUX-EPIC-CLOSE-REPORT.md` — epic NG-06 TEUX **CLOSED**
- **test:** gate B tenders + payroll 15/15 · zero zmian runtime/sync

## 2.63.65 — NG-06-TEUX-7f Hosted deprecation guard

- **improve:** SSOT `NG-06-TEUX-HOSTED-DEPRECATION.md` — V4 default · rollback accordion deprecated
- **improve:** `@deprecated` + dev `console.warn` na `TenderDetailPanelHosted` (bez usuwania kodu)
- **test:** `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` + regresja gate B tenders
- **boundary:** zero routing change · Intelligence label unchanged · TOKEN FREEZE

## 2.63.64 — NG-06-TEUX-7e Strategia + Pulpit

- **improve:** Pulpit — max 3 KPI (terminy · decyzje · wygrane bez roboty) + CTA Strategia
- **improve:** StrategyKpiStrip + labels PL — tokeny `TEUX_KPI_*` · `strategicInsights` bez „AI”
- **test:** `LIB-TENDER-STRATEGY-TEUX7E` + regresja gate B tenders
- **boundary:** zero scoring/pipeline/sync/tokens edit · TOKEN FREEZE import-only

## 2.63.63 — NG-06-TEUX-7d Copy integrity

- **improve:** FAQ „Podpowiedzi listy” zamiast „Komunikaty AI” · rename `listInsight` API (bez zmiany logiki)
- **improve:** CTA mobile — opis widoczny w Command Layer (`line-clamp-2`)
- **test:** `LIB-TENDER-COPY-TEUX7D` + regresja TEUX-7a/7b/7c
- **boundary:** zero strategy/pipeline/sync/tokens · TOKEN FREEZE import-only

## 2.63.62 — NG-06-TEUX-7c Accessibility pass

- **improve:** Bulk checkbox button + aria-label + keyboard · bulk toggle `aria-pressed`
- **improve:** Process Strip / TrustChip / Decyzja sub-tabs / Overview shortcuts — TEUX_FONT_CAPTION (≥12px) · aria-label
- **test:** `LIB-TENDER-A11Y-TEUX7C` + regresja TEUX-7a/7b/3
- **boundary:** zero pipeline/sync/tokens edit/strategy · TOKEN FREEZE import-only

## 2.63.61 — NG-06-TEUX-7b Command Layer polish

- **improve:** CTA disabled reason (prezentacja) · mobile breadcrumb context · collapsible trust ribbon
- **improve:** Process Strip + CTA zawsze widoczne · LS trust collapsed (UI-only)
- **test:** `LIB-TENDER-COMMAND-TEUX7B` + regresja workflow primary action + TEUX-4 shadow
- **boundary:** zero pipeline/sync/intelligence/App.tsx · TOKEN FREEZE import-only

## 2.63.60 — NG-06-TEUX-7a Lista filtry

- **improve:** `TenderListFiltersPanel` SSOT · `TenderListFilterFab` + `TenderListFilterSheet` (mobile) · desktop collapsible „Więcej filtrów”
- **improve:** Migracja chipów filtrów → `TenderUxChip` · LS `filtersCollapsed` (UI-only)
- **test:** `LIB-TENDER-FILTERS-TEUX7A` · gate B tenders + payroll 15/15
- **boundary:** zero pipeline/sync/tokens/App.tsx · TOKEN FREEZE import-only

## 2.63.59 — NG-06-TEUX-6 Empty states

- **improve:** `TenderUxEmptyState` — SSOT ikona + tytuł + opis + primary/secondary CTA
- **improve:** Lista 2-copy (pusta baza vs filtry) · mapa CTA lista · platform docs UI unify · kosztorys → Dokumenty
- **test:** `LIB-TENDER-EMPTY-STATES-TEUX6` · gate B tenders
- **boundary:** zero pipeline/sync/tokens/AI/Strategia/Profil · TOKEN FREEZE import-only

## 2.63.58 — NG-06-TEUX-5 Loading skeletons

- **improve:** `TenderUxSkeleton` + shells: moduł init, lista (3 karty), docs summary/attachments, BOQ 8 rows
- **improve:** stepped parser label Pobieranie → Załączniki → Analiza (`TenderParserSteppedLabel`)
- **test:** `LIB-TENDER-LOADING-TEUX5` · gate B tenders + payroll 15/15
- **boundary:** zero parser/CTA/pipeline/sync · TOKEN FREEZE · `ui/skeleton.tsx` bez diff

## 2.63.57 — NG-06-TEUX-4 Mobile chrome

- **new:** `TenderModuleNavSheet` — nawigacja modułu z detalu mobile (M4)
- **improve:** Command Layer density ≤390px · tab bar scroll shadow · Operator bar safe-area
- **test:** `LIB-TENDER-MOBILE-TEUX4` · gate B tenders + payroll 15/15
- **boundary:** TOKEN FREEZE · zero TendersView/list cards/filtry/Protected Core

## 2.63.56 — NG-06-TEUX-3 List Cards

- **new:** `TenderListMobileCard` + `TenderListDesktopCard` w `tenders/list/` — severity stripe · `TenderUxBadge` · KPI row
- **improve:** `TendersView.renderTenderItem` → komponenty `< lg` / `≥ lg` · badge overflow +N · bulk 44px
- **test:** `LIB-TENDER-LIST-CARDS-TEUX3` · gate B tenders + payroll 15/15
- **boundary:** TOKEN FREEZE (`tender-ux-tokens.ts` bez diff) · zero Protected Core

## 2.63.55 — NG-06-TEUX-2 Design Tokens

- **new:** `src/lib/tender-ux-tokens.ts` — SSOT typography/spacing/colors/motion · **TOKEN FREEZE** do MID EPIC REVIEW
- **new:** `TenderUxBadge`, `TenderUxChip`, `TenderUxSectionTitle` w `tenders/design-system/`
- **improve:** adopcja `TendersModule` + `TenderDetailKpiCompact` (2 pliki)
- **test:** `LIB-TENDER-UX-TOKENS-TEUX2` · gate B tenders + payroll 15/15
- **boundary:** zero diff Protected Core · #CORE-013/#CORE-014 PASS

## 2.63.54 — NG-06-TEUX-1 Navigation

- **fix:** mapa Przetargów → detal V4 (`openTenderDetailV4`) zamiast `openTenderInList` (G-01)
- **lib:** `src/lib/tender-detail-nav.ts` — SSOT `navigate` + `buildTenderDetailPath`
- **test:** `LIB-TENDER-DETAIL-NAV-TEUX1` · gate B `scope:tenders` + payroll 15/15
- **boundary:** zero diff Protected Core · #CORE-013/#CORE-014 PASS

## 2.63.53 — Legacy compat cleanup F2 (#5C-5C)

- **refactor:** usunięto `saveLegacyCostCatalogRouted`, `appendCostCatalogHistoryRouted`, `saveWgdomCostCatalogStore`, compat UI helpers (`resolveCatalogForUI`, …)
- **keep:** `saveWorkCatalogRouted`, `resolveCatalogForEngine`, ONE-SHOT bootstrap, `loadWgdomCostCatalogStoreLocal`
- **test:** `LIB-5C-5C-LEGACY-CLEANUP-F2` · zero `persistKey(kw-wgdom-cost-catalog)` w `src/`
- **boundary:** zero diff `cloud-sync.ts`, Payroll, PWRB

## 2.63.52 — Legacy cleanup F1 orphan reconcile (#5C-5C)

- **refactor:** usunięto `work-catalog-reconcile-bootstrap.ts`, `work-catalog-reconcile.ts` i eksporty PB-WRITE-C z `@/lib/work-catalog`
- **refactor:** usunięto deprecated alias `maybeExecuteWorkCatalogBootstrap`; ONE-SHOT deferred bootstrap bez zmian
- **test:** `LIB-5C-5C-LEGACY-CLEANUP-F1` · suite `smoke-work-catalog-p2-mvp` → **30** testIds
- **boundary:** zero diff `cloud-sync.ts`, router, `wgdom-cost-catalog-store.ts`, Payroll, PWRB

## 2.63.51 — Bootstrap/reconcile decouple (#5C-5B)

- `finalizeWorkCatalogAfterDeferredMerge` — bez cyklicznego legacy read i reconcile w deferred path; ONE-SHOT PB-3 migrate gdy work pusty.
- Payroll/PWRB/CloudLoader bez diff; gate `npm run test:infra -- --gate B --scope payroll` obowiązkowy.
- `LIB-5C-5B-BOOTSTRAP-DECOUPLE` · suite 29 testIds.

## 2.63.50 — Legacy KV sync quiesce (Bundle #5C-5A)

- **core:** `kw-wgdom-cost-catalog` — usunięty z `DATA_KEYS`, `BOOTSTRAP_DEFERRED_KEYS`, `mergeDataKey()` (`cloud-sync.ts`)
- **core:** `WGDOM_COST_CATALOG_KEY` — usunięty z `TENDER_DATA_KEYS`, `mergeTenderDataKey()`; **KEEP** `mergeWgdomCostCatalogForCloud()` (`tenders-sync.ts`)
- **core:** deferred bootstrap — brak `batch-get`/`batch-set` dla legacy catalog; **KEEP** `kw-wgdom-cost-catalog-history` sync
- **test:** `LIB-LEGACY-KV-SYNC-QUIESCE-5C5A` · `test-pb-write-router` R-01 (split → local only, no cloud push) · suite `smoke-work-catalog-p2-mvp` → **28** testIds
- **boundary:** zero diff Payroll · PWRB · Bootstrap · Reconcile · CloudLoader · UI · router · store

## 2.63.49 — History SSOT from Work Catalog (Bundle #5C-3D)

- **improve:** `catalog-rate-history-snapshot.ts` + `catalog-rate-history.ts` — write/read SSOT historii stawek z Work Catalog
- **improve:** `saveWorkCatalogRouted({ previousStore })` — snapshot po save do `kw-wgdom-cost-catalog-history`
- **improve:** neutral loader w panelu wyceny + reload na `pricingCatalogRevision`; empty state „Brak danych historycznych”
- **test:** `LIB-HISTORY-SSOT-5C3D` · suite `smoke-work-catalog-p2-mvp` → **27** testIds
- **known:** `test-material-history.mjs` fixture drift (90d window) — pre-existing, bez zmian w `material-history.ts`

## 2.63.48 — Dead UX cleanup (Bundle #5C-3C)

- **improve:** `TenderPriceBasePanel` — scalony callout; usunięto disabled „Zapisz bazę cen”; jedno CTA Biblioteka Robót
- **improve:** copy SSOT — `tenders-bid-calculator` / GuideView / WorkCatalogView · `WGDOM_COST_REGION_LABELS` → `wgdom-cost-catalog.ts`
- **test:** `LIB-DEAD-UX-CLEANUP-5C3C` · suite `smoke-work-catalog-p2-mvp` → **26** testIds
- **historia/benchmark** — bez zmian · #5C-3D

## 2.63.47 — Preview data SSOT cutover (Bundle #5C-3B)

- **improve:** `tender-price-base-preview.ts` — `buildPriceBasePreviewRows()` · Ustawienia wyceny czytają Work Catalog via `resolveActiveCatalogForTender()`
- **improve:** `pricingCatalogRevision` — auto-refresh podglądu stawek po save BR
- **test:** `LIB-PREVIEW-SSOT-5C3B` · suite `smoke-work-catalog-p2-mvp` → **25** testIds
- **historia/trend 90d** — bez zmian loadera · naprawa w #5C-3D

## 2.63.46 — UX copy & navigation cutover (Bundle #5C-3A)

- **improve:** `tender-catalog-ux-labels.ts` — SSOT `CATALOG_UX_SOURCE_LABEL` · tab „Ustawienia wyceny” · „Biblioteka Robót” wszędzie w UI wyceny
- **improve:** Wycena CTA → `workcatalog` · usunięto „Katalog WGDOM” / „Baza cen” jako źródło aktywnej wyceny z `src/app/**`
- **test:** `LIB-UX-COPY-CUTOVER-5C3A` · suite `smoke-work-catalog-p2-mvp` → **24** testIds
- **app layer only** — preview loader `loadWgdomCostCatalogStore()` bez zmian (#5C-3B)

## 2.63.45 — Write SSOT work_only default (Bundle #5C-2)

- **improve:** `defaultAppSettings().catalogWriteMode = "work_only"` · czysta instalacja bez pola w LS → work_only
- **improve:** `saveLegacyCostCatalogRouted` / historia legacy — blocked pod default (UI już work-only)
- **test:** `LIB-WRITE-SSOT-APP-NO-LEGACY-5C2` + `LIB-PB-WRITE-ROUTER` · suite `smoke-work-catalog-p2-mvp` → 23 testIds
- **app layer only** — zero cloud-sync/PB-3 diff

## 2.63.44 — Read SSOT Work Catalog only (Bundle #5C-1)

- **improve:** `resolveActiveCatalogForTender()` — work-only read path; legacy KV poza resolverem
- **improve:** Wycena / BOQ / KPI — label zawsze „Biblioteka Robót”
- **test:** `LIB-READ-SSOT-PREFLIGHT-5C1` + `LIB-READ-SSOT-WORK-ONLY-5C1` · suite `smoke-work-catalog-p2-mvp` → 21 testIds
- **app layer only** — zero cloud-sync/PB-3/engine diff

## 2.63.43 — Pricing refresh after Work Catalog save (Bundle #5C-0A)

- **fix:** `pricingCatalogRevision` w `TendersContext` — invalidacja wyceny Przetargów po zapisie cen/aktywności w Bibliotece Robót
- **fix:** `useTenderPricingAuto` · BOQ · panel Wycena — przeliczenie bez reloadu strony
- **test:** `LIB-PRICING-CATALOG-REVISION-5C0A` · suite `smoke-work-catalog-p2-mvp` → 19 testIds
- **app layer only** — zero resolver/PB-3/cloud-sync diff

## 2.63.42 — Deferred bootstrap unified hydration (Bundle #6E)

- **improve:** `DeferredBootstrapState` (idle/running/done) + scentralizowana hydracja React z LS po deferred bootstrap
- **improve:** `useWorkCatalog` / `useWorkBundles` / `TendersProvider` — reload przez `generation` trigger
- **test:** `LIB-DEFERRED-BOOTSTRAP-6E` · suite `smoke-work-catalog-p2-mvp` → 18 testIds
- **app layer only** — zero CloudLoader/cloud-sync/Payroll diff

## 2.63.41 — Work Catalog P2.10 Roboty ulubione (Bundle #6D)

- Gwiazdka ulubione na liście Roboty · filtr chip Ulubione · sort favorite-first · licznik · smoke P2.10 (manifest 17 testIds)

## 2.63.40 — Work Catalog P2.9 Pakiety filtry i badge (Bundle #6C-A)

- **improve:** Pakiety — filtr Ulubione (AND z search/branża/aktywność), badge kroków osieroconych/nieaktywnych, licznik ulubionych
- **test:** `SMOKE-WORK-CATALOG-BUNDLES-P29` · suite `smoke-work-catalog-p2-mvp` → 16 testIds
- **app layer only** — zero lib/sync diff

## 2.63.39 — Work Catalog P2.8 Pakiety UX MIN (Bundle #6B)

- **improve:** Pakiety — walidacja zapisu (≥1 krok, poprawny workId), ulubione + sort favorite first, szacowany czas (dni)
- **test:** `SMOKE-WORK-CATALOG-BUNDLES-P28` · `LIB-WORK-CATALOG-BUNDLES-PERSIST-P28` · suite `smoke-work-catalog-p2-mvp` → 15 testIds
- **app layer only** — zero lib/sync diff

## 2.63.38 — Work Catalog P2.7 Pakiety robót MIN (Bundle #5B)

- **new:** Biblioteka Robót → zakładka **Pakiety** — CRUD pakietów (kroki, ilości, notatki, reorder, duplikacja, dialog usuwania) · sync `kw-wgdom-work-bundles`
- **test:** `SMOKE-WORK-CATALOG-BUNDLES-P27` · `LIB-WORK-CATALOG-BUNDLES-PERSIST-P27` · suite `smoke-work-catalog-p2-mvp` → 12 testIds
- **zero lib/sync diff** — app layer only

## 2.63.37 — Work Catalog P2 test manifest sync (Bundle #5A)

- **test:** suite `smoke-work-catalog-p2-mvp` — golden 1419 + P2.1–P2.6 (96) · `scope:work-catalog` · gate-b-relevant
- **docs:** ARCHITECTURE §12.1.22 manifest SSOT · zero runtime diff

## 2.63.36 — Roboty 2.0 MIN docs/test sync (Bundle #4A)

- **improve:** HelpView FAQ — 3 KPI + widoczne kolejki (20.5Z.4A); WM/Bez ekipy → Pulpet / ukryte
- **test:** manifest `LIB-JOBS-LIST-OPS-20-MIN` · `scope:jobs` · suite `lib-jobs-list-ops-20-min`
- **docs:** `jobs-2.0-product-audit.md` SHIPPED + Product Decision History · ARCHITECTURE §12.1.4 · zero runtime diff

## 2.63.35 — Grouped Documents docs/test sync (Bundle #3)

- **improve:** HelpView FAQ — 7 grup dokumentów zamiast legacy TOP 5 copy
- **test:** track `test-tender-grouped-documents.mjs` · manifest `LIB-TENDERS-GROUPED-DOCS` · `scope:tenders`
- **docs:** WORKFLOW §4.5 + ARCHITECTURE UX.1C — SHIPPED prod `6cd8ebe` · zero runtime diff

## 2.63.34 — Mobile MOBILE-P0-S1 scroll stabilization

- **fix:** `--app-height` z `visualViewport` (Safari iOS) · SSOT `.mobile-view-scroll` · Przetargi sticky `md+` · padding bottom nav
- **improve:** `reconcileModalScrollLock()` w `goToView` — reset stuck modal lock
- **test:** `smoke-test-mobile-scroll-p0-s1.mjs` 14/14

## 2.63.33 — Platform sync reconcile notatek operacyjnych

- **fix:** `reconcileOperationalNotesInMergedBundle` — świeży LS po await pull; archiwizacja nie wraca na active
- **test:** `test-operational-notes-sync-race-p0.mjs` P0R-T05–T09
- **verify:** **COMPLETE** (2026-07-05) — prod `version.json` **2.63.33** @ `a4cd5c2` · regresja 38/38 + 24/24 · **PLATFORM-SYNC-01A CLOSED** · ETAP B **ON HOLD**

## 2.63.32 — Przetargi Owner View (P2A pdf_text)

- **improve:** Document Summary Header — `formatDocumentRowCount` (pending / nie ustalono / liczba)
- **new:** Work scope `pdf_text` — inferencja branż z tekstu PDF w modalu gdy brak categories/catalog
- **improve:** Executive Summary — `rowCountLabel` SSOT z nagłówka dokumentu
- **test:** `test-p2a-scope-from-pdf-text.mjs` (18) · regresja P1B/P1C/P1D/P5

## RC-B CLOSEOUT — 2026-07-04 (docs · PLATFORM)

- **docs:** SYNC-ARCH-01 **RC-B CLOSED** — prod verification PASS (`2.63.31` · `31a7d5e`) · closeout SSOT [`docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md)
- **docs:** `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` — RC-B timeline + next → FEATURE DEVELOPMENT (#CORE-013 · #CORE-014)
- **docs:** `CURRENT-TASK.md` — RC-B program CLOSED · następny kierunek FEATURE (bez bumpu UI)

## 2.63.31 — RC-B debug cleanup

- **improve:** Usunięto `__wgdomPayrollPipelineDebug`, `console.warn` RC-B i nieużywane helpery debug — zero zmiany logiki PWRB/merge/sync

## 2.63.30 — SYNC-ARCH-01 RC-B-1 PWRB Facade

- **fix:** RC-B-1 tombstone revocation I-1…I-4 — re-add nie ginie po refresh (G-0)
- **new:** `payroll-week-roster-bundle.ts` — pwrAdd/pwrRemove/pwrPush/pwrReconcile/pwrImportMerge
- **improve:** I-4 coupled domain push; Edge I-2; CloudLoader post-bootstrap reconcile
- **new:** `audit-pwrb-boundary.mjs` · `test-pwrb-boundary-rcb.mjs` · `test-payroll-tombstone-revocation-rcb.mjs`

## 2.63.29 — PAYROLL Runtime Trace logger (SSOT v1.1)

- **new:** `payroll-runtime-trace.ts` — ring buffer 300 + `__wgdomPayrollTraceDump()` · emitters P0/P1 + GAP-A/B/C
- **new:** Testy `test-payroll-runtime-trace-compliance.mjs` (35) · `test-payroll-runtime-trace-repro.mjs`
- **note:** Diagnostyka only — zero zmian merge/sync/fix incydentu

## 2.63.28 — SYNC-ARCH-01 S1 (RS payroll off + fingerprint)

- **improve:** S1-1 — `pushMergedDataBundleToCloud` wyklucza 6 kluczy payroll z RS push; `replaceWeekEmployeesKeys` tylko w domain push
- **improve:** S1-2 — `rsBundleFingerprintFromMerged` (parity z RS payload); payroll-only → `recordPushSkipped()` zamiast zbędnego batch-set
- **new:** `test-sync-arch-01-s1-rs-no-payroll-push.mjs` (22) · `test-sync-arch-01-s2-rs-fingerprint.mjs` (13) · regresja S7-4 (17)
- **note:** R1 — godziny/archive nadal poza RS do S2; po deploy → S1-3 observation 24–48h

## 2.63.27 — TI-B4 Smoke agregat Przetargi NG-01–NG-04

- **new:** `scripts/test-tenders-stabilization-smoke.mjs` — thin wrapper (12 child lib scripts, fail-fast)
- **new:** Manifest `1.1.0` — `SMOKE-TENDERS-NG01-04` · suite `smoke-stabilization-ng01-04`
- **improve:** Orchestrator `scope:tenders` — gate B release Przetargów
- **docs:** `TEST-INFRA-LIFECYCLE.md` · `STABILIZATION-WINDOW-PLAN.md` M-02 CLOSED · Z-04 evidence

## 2.63.26 — TEST-INFRA-001 MVP · **CLOSED**

- **new:** Manifest SSOT `test-infra/test-manifest.json` + orchestrator `npm run test:infra`
- **new:** Payroll Harness E2E preview — PAYROLL-GUARD-S1 (`npm run test:e2e:payroll-guard`)
- **improve:** Release gates A/B/C → suite z manifestu; klasy lib/smoke/e2e/audit
- **closeout:** [`docs/TEST-INFRA-001-CLOSEOUT.md`](docs/TEST-INFRA-001-CLOSEOUT.md) · prod **2.63.26** (`3d6dd90`)

## 2.63.25 — Audit Hub Freshness (AH-REG-1)

- **fix:** Audit Hub — odświeżanie `security_log` w React po `recordSecurityAudit` (notify); pull AUX audytu w `runCloudSync` jak przy focus pull
- **improve:** `refreshAuditHubAuxFromCloud` — wspólny pull `kw-security-audit-log` + `kw-wm-druk-audit-log` (bez duplikacji)

## 2.63.24 — Restore Banner False Positive (payrollMetrics)

- **fix:** Baner „Przywróć z archiwum” — warunek `payrollMetrics` (activeDays / totalHours), nie `weekEmployeesListRichness`; mniej false positive przy zgodnych wypłatach
- **improve:** Copy banera dopasowany do logiki (dni robocze i godziny w archiwum vs live)

## 2.63.23 — PAYROLL-CLOUD-RECOVERY Etap 2 B6 (Edge Parity)

- **fix:** Edge `batch-set` / `restore-payroll-backup` — union `kw-week-employees` po `weekEmployeeMergeKey` (`directoryId`), jak klient P0; usunięto UUID expansion (`KeepPrevRoster`)
- **improve:** SSOT `payroll-week-employee-merge.ts` — wspólny kernel listy dla klienta i Edge

## 2.63.22 — PAYROLL-CLOUD-RECOVERY Etap 2 B5 (Closed Week UI)

- **fix:** `displayEmployees` SSOT w `PayrollView` — closed + archiwum → snapshot; closed bez archiwum → `[]`; `selectedEmp` z display, nie z live KV
- **improve:** Tydzień historyczny read-only w LP — ukryte mutacje rosteru/przydziałów; `WeekEmployeeDetail.readOnly`; `showRestoreBanner` tylko operacyjny

## 2.63.21 — PAYROLL-CLOUD-RECOVERY Etap 2 B4 (Bootstrap Merge SSOT)

- **fix:** `finalizePayrollBundleMerge` — bootstrap (CloudLoader) i runtime (`computeMergedDataBundle`) ten sam SSOT; P11 richness override także przy pull/sync (local 0h vs bogata chmura)
- **improve:** `applyRuntimePayrollAntiLeak` — anti-leak rollover wyłącznie runtime

## 2.63.20 — PAYROLL-CLOUD-RECOVERY Etap 2 B3.2 (payrollRosterPushRef cleanup)

- **improve:** Usunięto `payrollRosterPushRef` — defer pull/auto-sync wyłącznie przez `CloudSyncMutationGuard` + `suppressAutoSyncUntilRef` (R1 push składu, R2 sync stawek, R3 rollover)

## 2.63.19 — PAYROLL-CLOUD-RECOVERY Etap 2 B3.1 (Guard Rollover)

- **fix:** Rollover LP (`autoArchiveAndAdvance` → `pushPayrollWeekAfterRollover`) — `withKwWeekEmployeesAsyncMutation` + `payrollRosterPushRef` / suppress

## 2.63.18 — PAYROLL-CLOUD-RECOVERY Etap 2 B3 (Guard Phase 2)

- **improve:** Lista płac — push składu przez `CloudSyncMutationGuard` (`kw-week-employees`, `withKwWeekEmployeesAsyncMutation`)
- **fix:** Sync stawek z kartoteki — guard roster + zachowany `payrollRosterPushRef` / suppress

## 2.63.17 — PAYROLL-CLOUD-RECOVERY Etap 2 (B1+B2)

- **fix:** Lista płac — fail-loud push składu (`persistPayrollRoster` toast zamiast silent catch)
- **fix:** Roboty → Pracownicy — `workEntries` przez `withKwJobsWorkEntryMutation` (J1–J5)

## 2.63.16 — PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0

- **fix:** Przydziały robót — dropdown nie cofa się po sync (CloudSyncMutationGuard, scope `kw-jobs`)
- **improve:** Auto-sync defer + token begin/end; `reset()` guard po bootstrap CloudLoader

## 2.63.15 — PAYROLL-CLOUD-RECOVERY P0

- **fix:** Lista płac — dodanie z Kadr nie znika po sync (merge UNION po `directoryId`)
- **fix:** Dedup `addFromDirectory` po `directoryId`
- **improve:** `runCloudSync` respektuje `payrollRosterPushRef` + suppress po push składu

## 2.63.13 — INSPECTOR-JOB-ASSIGN-001

- **new:** `assignedInspectorId` na Job — obowiązkowy wybór inspektora WM w Robotach
- **improve:** Panel inspektora — filtr robót po przypisaniu; notatki operacyjne #011
- **fix:** jobsAll/jobsVisible (#012) — persist pełnej tablicy kw-jobs

## 2.63.12 — NG-04.4 Polish & EPIC Close

- **improve:** BOQ Explorer polish — nagłówek, a11y (aria-pressed, caption), ATH tooltip suppress na priced, benchmark empty „—”
- **improve:** HelpView FAQ · **EPIC NG-04 CLOSED**

## 2.63.11 — NG-04.3 ATH Fidelity

- **new:** BOQ Explorer — deterministyczne tooltipy ATH per komórka (#008 Explain, Not Re-parse)
- **improve:** Source strip (typ/confidence/plik) + CTA → `JobFilePreviewModal` (#009 Explain Before Expand)

## 2.63.10 — NG-04.2 Benchmark per Line

- **new:** BOQ Explorer — kolumna Benchmark rbh per linia (`BoqLaborBenchmarkBadge`)
- **improve:** Derived UI cache (#005–#007); Principles #004–#006 — prezentacja bez rozszerzenia ViewModel

## 2.63.9 — NG-04.1 Kosztorys BOQ Explorer

- **new:** BOQ Explorer — unified tabela ATH + WGDOM, search, filtry branżowe (ViewModel SSOT)
- **improve:** TOP 20 via `selectTopCostRows()`; Lazy Rendering — brak rebuild ViewModel przy search/filter

## 2.63.8 — P0 Tender Detail tab SSOT

- **fix:** Tab detalu V4 ze SSOT URL (`parseTenderDetailPath`) — kliencki navigate aktualizuje workspace
- **fix:** `activeTab=Lista` przy URL detalu V4 (sync Provider z deep linkiem)

## 2.63.7 — NG-03.7 Polish & EPIC CLOSE

- **improve:** Touch ≥44 px · tablet 640–1023 immersive + mobile cards do lg · Action Bar sticky na tablecie
- **improve:** HelpView NG-03 · epic close report · NG-03 **CLOSED**

## 2.63.6 — P0 Command Layer height (Przetarg)

- **fix:** Command Layer ≤280 px (desktop) / ≤50vh (mobile) — Content Layer znów scrolluje; bez scrollu w chrome
- **improve:** Compact / ultra-compact Ribbon (≤390 px); Analysis Strip w accordionie Szczegóły postępu

## 2.63.5 — NG-03.6 Strategy Bridge (Przetarg)

- **improve:** Portfolio Position w workspace Przetarg — bridge do Strategii z kontekstem tenderId
- **improve:** Strategia — focus card po przejściu z detalu; powrót do przetargu V4

## 2.63.4 — NG-03.5 Mobile Cards (Przetarg)

- **improve:** Kosztorys / Ceny / Dokumenty — mobile card layout (bez poziomego scrollu ≤390 px); desktop tabele bez zmian
- **improve:** UNKNOWN w Ceny — przypisanie kategorii w widoku kartowym na mobile

## 2.63.3 — NG-03.4 Workspace Density (Przetarg)

- **improve:** V2 hub density — pasek postępu + checklista skrócona; bez osi czasu / dokumentów w accordionie
- **improve:** Accordion „Przygotowanie oferty”; warunki udziału skrót + link Kwalifikacja

## 2.63.2 — NG-03.3 Operator Action Bar

- **improve:** Operator Action Bar — Upload · Analiza · e-Zamówienia · Eksport (desktop pod Command Layer, mobile sticky)
- **improve:** Dedup akcji w operator section / BidPrep gdy Action Bar aktywny

## 2.63.1 — NG-03.2 Tender Workspace Command Layer

- **improve:** Command Layer — KPI Compact · Status Ribbon · CTA sticky na Przetarg
- **improve:** Progressive disclosure — V2 + informacje w accordion; pełne KPI w Informacje

## 2.63.0 — NG-03.1 Tender Workspace Navigation

- **improve:** detal V4 — 5 tabów (usunięte placeholdery Strategia/Materiały); legacy URL → Przetarg
- **improve:** Decyzja — sub-taby Przegląd · Kwalifikacja · Oferta (`?ws=` bez zmian)

## 2.62.99 — NG-03 P0 Ceny priceOverrides runtime

- **fix:** zakładka Ceny — `priceOverrides` z `useTenderPricingAuto` → `pipelineRuntime` (koniec ReferenceError)

## 2.62.98 — NG-02.1C Production Bootstrap Fix

- **fix:** auto bootstrap discovery — brak fałszywego `discoveryCompleted` przy 0 dokumentów
- **fix:** reset sticky session state dla settled-empty (wejście w przetarg)
- **fix:** persist authoritative BZP patch po cleanup effect (apply-on-success)

## 2.62.97 — NG-02.1B Pipeline Lifecycle Stabilization

- **fix:** auto discovery ponawia skan przy settled-empty (0 załączników) — zgodność z „Odśwież BZP”
- **fix:** heavy parse inflight deadlock po abort effect; retry heavy bez resetu discovery
- **improve:** `runTenderFullDocumentDiscovery` SSOT — bootstrap · manual · change-monitor rescan

## 2.62.96 — NG-02.1A Unified Attachment Gate

- **fix:** Heavy Parse startuje przy external-only (SmartPZP/BIP) — koniec fałszywego e5 bez workera
- **improve:** `unified-attachment-gate.ts` — `AttachmentOrigin` · `buildHeavyParseDocumentSet` · dev timeline Gate Status/Reason

## 2.62.95 — NG-02 Tender Automation Pipeline P0

- **new:** `useTenderPipelineRuntime` — bootstrap + heavy parse + pricing na każdej zakładce V4
- **improve:** auto external parse w bootstrap; health e5; `PipelineState` enum; dev timeline

## 2.62.94 — NG-01-UX-HF-001 Trust UI Surface Policy

- **improve:** Hub — banner trust tylko przy problemie; chipy z `getTrustChipLimit` + `+N`; usunięty Prep Status duplicate
- **improve:** Process Strip — jedna ikona (trust > workflow)
- **improve:** Kosztorys inline hint; Dokumenty TrustBadge w SummaryHeader; Wycena jeden komunikat

## 2.62.93 — NG-01.2 Tender Trust Layer UI

- **new:** Banner i chipy „Jakość danych” na Przetargu, Dokumentach, Kosztorysie, Wycenie (`tender-trust-layer` + `tenders/trust/*`)
- **improve:** Process Strip — overlay ikon trust (✓ ! × …) bez zmiany logiki etapów
- **improve:** Wycena — SSOT trust zamiast `missingKosztorys`

## 2026-06-29 — Code hygiene: AI authorship cleanup (bez bump UI)

- **chore:** neutralizacja sformułowań „agent AI / GPT / Cursor agent” w docs, regułach Cursor, changelog historycznym
- **chore:** `Hasło agenta` → `Hasło sesji`; `workflow agenta` → `workflow deweloperski`
- **bez zmian:** kod źródłowy, logika, marka COMMAND CENTER AI

> **Handoff SSOT:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)

## 2.62.92 — SUPER ADMIN ACL Instrukcja + Zmiany

- **improve:** Osobne menu Instrukcja / Zmiany — Super Admin zawsze; Admin po flagach w ⚙
- **improve:** `instructionsForAdminEnabled` + `changesForAdminEnabled` w AppSettings (chmura)
- **fix:** Brak ACL → ukryte menu + redirect na Pulpit

## 2.62.91 — PB-WRITE-C Reconcile legacy → work

- **improve:** `work-catalog-reconcile.ts` — idempotentny reconcile po PB-3
- **fix:** Skip gdy `work.updatedAt > legacy.updatedAt`; bez UI / bez cutover

## 2.62.90 — WC-P2.1-HF1 Biblioteka embedded scroll

- **fix:** Przetargi → Biblioteka robót — jeden scroll na zakładce; dostęp do wszystkich wierszy
- **improve:** `WorkCatalogView` layout standalone/embedded; bulk bar sticky

## 2.62.89 — PB-WRITE-B Baza cen read-only

- **improve:** Stawki kategorii (robocizna, materiały) — tylko odczyt w Przetargi → Baza cen
- **improve:** CTA do Biblioteki Robót; parametry firmy nadal edytowalne
- **improve:** Wyłączono zapis bazy cen / przywracanie domyślnego katalogu

## 2.62.88 — PB-WRITE-A Catalog Write Router

- **improve:** `catalog-write-router.ts` — jedyny entry point zapisu legacy + work catalog
- **improve:** `AppSettings.catalogWriteMode` — split · work_only · legacy_only (default split)
- **improve:** Baza cen, Biblioteka, PB-3 bootstrap → routed save (bez mirror-write)
- **test:** `test-pb-write-router.mjs`

## 2.62.87 — Biblioteka Robót WC-P2.1 nawigacja + ACL

- **improve:** Biblioteka robót → zakładka Przetargi (bez sidebar)
- **improve:** ACL `adminCanViewWorkCatalog` + `workCatalogForAdminEnabled` w AppSettings
- **fix:** legacy `view=workcatalog` → Przetargi → Biblioteka robót
- **improve:** `WorkCatalogView` embedded — single scroll
- **test:** `test-work-catalog-nav-p2.1.mjs`

## 2.62.86 — Przetargi PB-2b V4 KPI parity

- **fix:** KPI V4 / Kosztorys PRO — `resolveActiveCatalogForTender` (nie seed `defaultWgdomCostCatalog`)
- **improve:** `computeTenderBidProposal` default catalog → resolver
- **improve:** chip źródła Biblioteka Robót / Baza cen (fallback)
- **test:** `test-tender-pb-2b-v4-parity.mjs`

## 2.62.85 — Biblioteka Robót P2 MVP UI

- **new:** Menu Biblioteka Robót — lista, ceny firmy, aktywność, bulk, rynek read-only, kompletność
- **improve:** `useWorkCatalog` reload po `WGDOM_DEFERRED_BOOTSTRAP_EVENT` (PB-3)
- **improve:** HelpView + pusty stan — copy PB-3 bootstrap
- **test:** smoke/persist P2.1–P2.6 (96)

## 2.62.84 — Biblioteka Robót PB-3 bootstrap (legacy → work)

- **new:** `WorkCatalogBootstrapDecision` — jednorazowa migracja po deferred bootstrap
- **improve:** `decideWorkCatalogBootstrap()` — guardy SSOT + logi diagnostyczne
- **test:** `test-work-catalog-bootstrap-pb3.mjs` B1–B8

## 2.62.83 — Przetargi PRICE-BRIDGE PB-1/PB-2 (wspólny resolver katalogu)

- **new:** `resolveActiveCatalogForTender()` — work-first / legacy-fallback · `isFallback`
- **improve:** `TenderDetailPanel` + `TenderBidProposalPanel` — shared resolver (bez duplikacji legacy load)
- **test:** `test-tender-price-bridge.mjs` T1–T6

## 2.62.82 — Przetargi TP200B (kosztorys fidelity · parser v4)

- **fix:** `CURRENT_PARSER_VERSION` 4 — lazy rescan dossier v3 ze skróconymi snapshotami
- **fix:** parse loop `discoveryWinnerSource` w `shouldReplaceBestKosztorys`
- **test:** `test-tp200b-snapshot-fidelity.mjs` T7–T8 · `test-tender-dossier-parser-version.mjs` v3 stale

## P0 docs — Cloud Sync Incident CLOSED (2026-06-29, bez bump wersji UI)

- **resolved:** P0 sync `Failed to fetch` / `exceed_egress_quota` (402) — **Supabase Pro** upgrade
- **verified:** prod smoke PASS — health 200 · batch-get/set 200 · Zapisz tydzień sync OK
- **docs:** `INCIDENTS-2026-06.md` §0 RESOLVED · `PROJECT-HANDOFF-CURRENT.md` · `CURRENT-TASK.md`
- **backlog:** delta-sync / focus throttle — OPEN (architektura P1, nie incydent)

## P0 docs — Cloud Sync egress audit (2026-06-29, bez bump wersji UI)

- **audit:** P0 sync `Failed to fetch` → Supabase `exceed_egress_quota` (402)
- **docs:** `SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md` · `audit/P0-CLOUD-SYNC-EGRESS-AUDIT-REPORT.md`
- **ARCHITECTURE:** § 11.4 egress · `INCIDENTS-2026-06.md` §0

## 2.62.92 — Biblioteka Robót P3.2B (CSV preview UI)

- **new:** `WorkCatalogCsvImportPreviewPanel` — upload CSV · Analiza · raport (bez importu)
- **new:** filtr regionu (domyślnie Wrocław) · kategoria Ignored/Pominięte
- **test:** `smoke-test-work-catalog-csv-preview-ui-p3.2b.mjs`

## 2.62.91 — Biblioteka Robót P3.2A (CSV preview lib)

- **new:** `market-csv-parser.ts` + `market-csv-preview.ts` — PREVIEW only, no persist
- **new:** `previewMarketCsvImport` → Matched / Low confidence / Unmatched / Rejected
- **test:** `test-work-catalog-market-csv-preview-p3.2a.mjs`

## 2.62.90 — Biblioteka Robót P3.1B (market work mapping)

- **new:** `market-work-mapping.ts` — słownik externalId → workId per origin
- **new:** `resolveMappingBatch` → Matched / Unmatched / Rejected
- **test:** `test-work-catalog-market-work-mapping-p3.1b.mjs`

## 2.62.89 — Biblioteka Robót P3.1A (market source adapters)

- **new:** `MarketSourceAdapter` × 4 origins · `adaptMarketSourceRecord`
- **test:** `test-work-catalog-market-source-adapters-p3.1a.mjs`

## 2.62.88 — Biblioteka Robót P3.1 (market engine lib)

- **new:** schema v4 · `MarketSourceSnapshot` · `MarketAverageEngine` (pure lib)
- **improve:** regional fallback · weighted confidence · legacy `marketAvgPln` bridge
- **test:** `test-work-catalog-market-average-engine-p3.1.mjs`

## 2.62.87 — Biblioteka Robót P2.6 (kompletność)

- **new:** nagłówek **Uzupełniono: X%** · panel **Branże** (priced / total)
- **improve:** 🟢 100% · 🟡 50–99% · 🔴 <50% · klik branży filtruje listę
- **test:** `smoke-test-work-catalog-completeness-p2.6.mjs`

## 2.62.86 — Biblioteka Robót P2.5 (firma vs rynek)

- **new:** blok Cena firmy → Cena rynkowa → Status na karcie roboty
- **improve:** 🟢 ±10% · 🟡 11–25% · 🔴 >25% · brak `marketAvgPln` → —
- **test:** `smoke-test-work-catalog-market-p2.5.mjs`

## 2.62.85 — Biblioteka Robót P2.4 (grupowa edycja cen)

- **new:** tryb **Edytuj wiele** — checkboxy, panel akcji, podgląd, potwierdzenie
- **improve:** +% / −% / +zł / −zł / ustaw cenę · zapis bulk bez reload listy
- **test:** `smoke-test-work-catalog-bulk-price-p2.4.mjs` · `test-work-catalog-bulk-price-persist-p2.4.mjs`

## 2.62.84 — Biblioteka Robót P2.3 (aktywność robót)

- **new:** checkbox **Aktywna / Nieaktywna** na karcie · zapis local + cloud P1.11
- **improve:** domyślny filtr listy = tylko aktywne
- **test:** `smoke-test-work-catalog-active-p2.3.mjs` · `test-work-catalog-active-persist-p2.3.mjs`

## 2.62.83 — Biblioteka Robót P2.2 (edycja ceny firmy)

- **new:** pole **Cena firmy** na karcie roboty · walidacja ≥0 · 2 miejsca po przecinku
- **improve:** zapis `kw-wgdom-work-catalog` local + `persistKey` (P1.11)
- **test:** `smoke-test-work-catalog-price-p2.2.mjs` · `test-work-catalog-price-persist-p2.2.mjs`

## 2.62.82 — Biblioteka Robót P2.1 (pierwszy ekran)

- **new:** menu **Biblioteka Robót** — lista v3, search, branża, aktywne/nieaktywne, licznik
- **test:** `smoke-test-work-catalog-ui-p2.1.mjs`

## 2.62.81 — Lista Płac P0: skład po „Odśwież skład” nie znika po sync

- **fix:** `pullFromCloudAndMerge` — suppress + payrollRosterPush guard jak auto-sync
- **fix:** `computeMergedDataBundle` anti-leak — `valuesForMerge` zamiast stale React snapshot
- **test:** `test-payroll-refresh-team-race-p0.mjs` T1–T3

## 2.62.80 — Biblioteka Robót v3.0 fundament P1 (infra)

- **improve:** `src/lib/work-catalog/` P1.1–P1.12 · seed 116 robót · migracja · adapter · stores · cloud-sync KV · golden 1419 · FREEZE v1.0 — **bez UI** (P2)
- **test:** `test-work-catalog-golden.mjs` · `test-work-catalog-public-api.mjs` · pełny zestaw P1.1–P1.11

## 2.62.79 — Mobile Roboty drill-in (MV-2)

- **fix:** pełnoekranowy detal na mobile · ukrycie listy + KPI · Lista + native back

## 2.62.78 — Mobile UX pack (scroll, drill-in, touch, klawiatura)

- **fix:** Przetarg sticky header/tabs · Notatki + Schematy drill-in · Audit sheets bottom · Payroll touch 44px · Settings keyboard
- **improve:** native back Roboty/Przetarg/Notatki/Schematy · tender tabs 44px · SVG preview bez nested scroll

## 2.62.77 — Audit Hub WM widoczność wm_druk (Etap 4)

- **improve:** filtr źródła wm_druk · chip teal · deep link labels Pomiary/Schematy/Katalog · Help + ARCHITECTURE
- **test:** `test-audit-hub-adapters.mjs` T21/T22 · `test-audit-hub-view-model.mjs`

## 2.62.76 — Audit Hub WM hooki Schematy (Etap 3)

- **improve:** WM Druk Schematy — audyt `schematic_created` / `measurement_imported` / `schematic_duplicated` / `schematic_deleted` / `pdf_exported`
- **test:** `test-wm-druk-audit.mjs` T11 · `smoke-wm-druk-audit-etap3-s1.mjs`

## 2.62.75 — Audit Hub WM hooki Pomiary/Katalog (Etap 2)

- **improve:** WM Druk — audyt `rap_created` / `rap_edited` / `rap_deleted` / `docx_exported` / `zip_exported` (callback z App, bez React w lib)
- **test:** rozszerzone `test-wm-druk-audit.mjs` (akcje Pomiary)

## 2.62.74 — Audit Hub WM infrastruktura (Etap 1)

- **improve:** `kw-wm-druk-audit-log` AUX + `recordWmDrukAudit` + adapter `wm_druk` w Audit Hub feed (bez hooków UI Pomiary/Schematy — Etap 2–3)
- **test:** `test-wm-druk-audit.mjs` · rozszerzone `test-audit-hub-adapters.mjs` · `test-audit-hub-view-model.mjs`

## 2.62.73 — P0 Payroll Cloud Recovery (etap 1)

- **fix:** Lista Płac sync — mutex `runCloudSync`, merge `workEntries` po `job.updatedAt`, Payroll Guard fail-loud (error + toast, bez silent success)
- **test:** `test-payroll-work-entry-merge-fidelity.mjs` · `test-payroll-settled-merge-fix-a.mjs` · `smoke-test-payroll-rollover-sync-20.1c1.mjs` · `test-payroll-guard-push-fail-loud-p0.mjs`

## 2.62.72 — Workflow Cleanup P0 + Recovery Pack

- **refactor:** Przetarg → usunięto zduplikowaną sekcję „Następny krok” z V2; sticky „Główna akcja” = jedyne CTA · `intelligenceCtx` przekazywany z Huba (bez recompute) · usunięto legacy `prioritizeTenderDocuments` (TOP 5)
- **fix:** dokończenie migracji grouped docs — `tender-grouped-documents.ts` + `TenderAttachmentsPanel` (`6cd8ebe`) — odblokowuje `npm run build` i G7 Validation
- **recovery:** Recovery Pack v2.62.72 **COMPLETED** · OFFSITE READY · `WGDOM-RP-2.62.72-20260626` · tag `wgdom-recovery-pack-2.62.72`
- **test:** `test-tender-workflow-hub.mjs` · `test-tender-workflow-primary-action.mjs` · `test-tender-workspace-ux.mjs`

## 2.62.71 — Document Summary Header (zakładka Dokumenty)

- **new:** Przetarg → Dokumenty — nagłówek podsumowania (SWZ, Przedmiar/ATH, Kosztorys, Umowa, Formularz, gotowość procesu, ostatnia analiza) nad listą plików — wyłącznie istniejące SSOT
- **test:** `test-tender-documents-summary-header.mjs`

## 2.62.70 — Client Bar list filter hotfix (P0)

- **fix:** Przetargi → Lista — Client Bar (WM/ZZK/Gminy/Wszystko) filtruje spójnie sekcje „Dzisiaj” i „Lista” (`filterTendersListPipelineItems` + `buildTendersListVisibleSections`)
- **test:** `test-tenders-list-ux.mjs` — regresja WM/ZZK/Gminy/Wszystko

## 2.62.69 — Workflow Process Strip + Sticky Primary CTA (EPIC B/C)

- **improve:** Przetarg → pasek procesu (Dokumenty · Analiza · Kosztorys · Wycena · Oferta) z nawigacją V4 · sticky „Główna akcja” pod paskiem (jedna rekomendacja z SSOT)
- **test:** `test-tender-workflow-process-strip.mjs` · `test-tender-workflow-primary-action.mjs` · regresja `test-tender-workflow-hub.mjs`

## 2.62.68 — Workflow Hub (EPIC A)

- **improve:** Przetarg = Workflow Hub (postęp V2, blokery, prep status, operator) · Decyzja = werdykt + ekonomia + GO/HOLD/ODPUŚĆ — bez duplikacji workflow
- **test:** `test-tender-workflow-hub.mjs` · regresja `test-p5-owner-view.mjs` · `test-tender-workspace-ux.mjs`

## 2.62.67 — Przetargi Lista UX V4

- **improve:** uproszczony główny widok listy — banner (klikalny) · Moja kolejka (2 chipy) · Klienci · Filtry zaawansowane (operacyjne, KPI, presety, pipeline)
- **test:** `test-tenders-list-ux.mjs` (V2/V3/V4)

## 2.62.66 — Kosztorys V4 health procesu (P2 timeout / stale)

- **improve:** `deriveKosztorysProcessHealth` · slow 30s / stale 90s / timeout 180s · retry UI · `useKosztorysProcessHealth` (prezentacja only)
- **test:** `test-tender-kosztorys-process-health.mjs` (16) · regresja `test-tender-kosztorys-process-phase.mjs` · `test-p3-ux-analysis-status.mjs`

## 2.62.65 — Kosztorys V4 fazy procesu (P1 technical + saving)

- **improve:** 13 faz technicznych E0–E12 · `deriveKosztorysTechnicalPhase` · faza `saving` (`dossierSaving`) · `resolveKosztorysAwaitingParseDisplay` w Owner View / Wycena / SSOT
- **test:** `test-tender-kosztorys-process-phase.mjs` (18) · regresja `test-p3-ux-analysis-status.mjs`

## 2.62.64 — Kosztorys V4 fazy procesu (P0 UX)

- **improve:** `deriveKosztorysProcessPhase` + `KosztorysProcessStatusBar` — 8 faz biznesowych; błąd parse → „Analiza została przerwana” + ponów
- **test:** `test-tender-kosztorys-process-phase.mjs`

## 2.62.63 — Discovery dokumentów (variant B root-cause)

- **fix:** bramka discovery bez noticeNumber/noticeHtml; documentsFetchedAt tylko po autorytatywnym fetch; noticeHtml do Edge; retry bootstrap po anchor
- **test:** `test-tender-documents-bootstrap-retry.mjs` · regresja `test-smartpzp-mvp.mjs`

## 2.62.62 — Strategia UX.2T (układ decyzyjny)

- **improve:** rekomendacja → dlaczego → działania → ryzyka → pozostałe (zwinięte)
- **test:** `test-tender-strategy-ux.mjs`

## 2.62.61 — Workspace V2 Następny krok (etykieta przycisku)

- **fix:** P5 „Znajdź kosztorys” → przycisk „Przejdź do kosztorysu” (nawigacja na zakładkę Kosztorys)
- **test:** `test-tender-workspace-v2-ux.mjs` (P5/P9 button label parity)

## 2.62.60 — Tender Workspace Automation

- **improve:** auto-checklista · auto timeline · insights 2–3 · auto progress
- **test:** `test-tender-workspace-v2-ux.mjs`

## 2.62.59 — Tender Workspace V2

- **new:** status realizacji 0–100% · następny krok · oś czasu · dokumenty 1-klik · checklista
- **test:** `test-tender-workspace-v2-ux.mjs`

## 2.62.58 — Przetargi Lista UX V3

- **new:** Moja kolejka (decyzje, terminy, kosztorys, referencje) · ulubione presety (localStorage)
- **improve:** sticky toolbar (szukaj, status, filtry, odśwież)
- **new:** komunikaty AI (heurystyki UX)
- **test:** `test-tenders-list-ux.mjs` (kolejka, presety, sort)

## 2.62.57 — Przetargi Lista UX V2

- **improve:** klikalne KPI → filtry · pasek szybkich filtrów (Wszystkie/Moje/…)
- **new:** sekcja „Dzisiaj” (wymaga reakcji) · sort pilne → strategiczne
- **improve:** prefs filtrów w localStorage `wg-tenders-list-filter-prefs-v2`
- **test:** `test-tenders-list-ux.mjs`

## 2.62.56 — Przetargi Lista UX rework

- **improve:** KPI kompakt (4 metryki) · wyszukiwarka + chipy filtrów wyżej · lista bliżej góry ekranu
- **improve:** Pipeline + legenda zwinięte · „Filtry zaawansowane” (lista/status) · ikony CSV/masowy
- **UX-only:** bez zmian BZP, pipeline danych, parserów, sync

## 2.62.55 — WM Schematy Right Edge Clipping Hotfix

- **fix:** ucinanie ostatniego obwodu w PDF — `columnRightInset` 96 px w `bus-layout-v2`
- **fix:** apartment-1f-v1 / 3f-v1 — ostatnia kolumna mieści się w viewBox (MCB + etykiety)
- **test:** `test-schematic-1f-right-edge-margin.mjs` R01–R05 · regresja `test-schematic-v1b-visual-smoke.mjs`

## 2.62.54 — WM Schematy Header Input Spaces Hotfix

- **fix:** spacje w polach Tytuł i Adres (nagłówek PDF) — usunięto `.trim()` przy zapisie w `parseSingleLineDiagram`
- **fix:** fallback DEFAULT_SCHEMATIC_TITLE tylko gdy pole faktycznie puste
- **test:** `test-schematic-header-spaces-hotfix.mjs` · `test-wm-schematics-ui-3b.mjs` U09

## 2.62.53 — WM Druk Detached RAP Crash Hotfix

- **fix:** crash po utworzeniu samodzielnego RAP (`reportNumber` na null selected)
- **fix:** race condition — fallback selectedId → focusedMeasurementId → jobReports[0]
- **fix:** null-safety reportNumber w panelu edycji i Katalogu Pomiarów
- **test:** `test-electrical-measurements-independent-rap.mjs` T8/T9

## 2.62.52 — WM Druk Pomiary UX Upgrade

- **new:** detached RAP (samodzielne pomiary bez Roboty) · edycja RAP z Katalogu · usuwanie single/bulk
- **new:** Registry Guard (CANCELLED w registry) + tombstone `kw-electrical-measurements-deleted-ids`
- **improve:** `linkStatus` linked/detached · `manualAddress` / `manualFlatNumber`
- **test:** `test-electrical-measurements-independent-rap.mjs` · `test-electrical-measurements-catalog-edit.mjs` · `test-electrical-measurements-delete-registry-guard.mjs`

## 2.62.51 — WM Schematy layout scale V2 (renderer v5)

- **improve:** bus layout v2 — szyna do ostatniego obwodu, pełny span kolumn
- **improve:** większe symbole, kropki r=6, viewBox 1360×780 (3F) / 1248×748 (1F)
- **improve:** wykorzystanie strony A4 ~93% tuszu vs referencja WM
- **test:** `test-schematic-v1b-visual-smoke.mjs` · renderer `SCHEMATIC_RENDER_VERSION=5`

## 2.62.50 — WM Schematy visual fidelity (renderer v4)

- **improve:** backbone supply→szyna, RCD tee, spacing, wieloliniowe etykiety MCB/RCD
- **improve:** symbol kuchenki 3P, grubsza szyna, kropki r=5, linie pomocnicze kolumn
- **fix:** podwójna etykieta „Kuchenka Elektryczna”
- **test:** `test-schematic-v1b-visual-smoke.mjs` · renderer `SCHEMATIC_RENDER_VERSION=4`

## 2.62.49 — WM Druk Schematy MVP UI

- Zakładka **Schematy** (między Pomiary a Katalog Pomiarów)
- `WmPrintSchematicsPanel` + `WmPrintSchematicEditor` — lista, edytor, podgląd SVG, eksport PDF
- Sync `kw-electrical-schematics` · smoke `test-wm-schematics-ui-3b.mjs`

## 2.62.48 — P4 WM Druk upload toast

- **fix:** `resolveWmPrintTemplateUploadToast` — brak „Dodano 0 plików” gdy storage OK, added=0
- **test:** `test-wm-print-upload-toast-p4.mjs`

## 2.62.47 — TP203 Address Parser Recovery M1

- **fix:** `parseJobAddressParts` — `m.3`, `lok.`, `mieszkanie`, slash `26/3`, budynek z literą `12A`
- **test:** `test-wm-print-address-parser-tp203.mjs` · manual gate Kleczkowska 95/96/97 PASS

## 2.62.46 — ZI Tauron 2026 · hotfix §5 zgłaszający (P0 OWNER ADDRESS)

- **fix:** `applyAddressSectionFields` — tylko 95–97; §5 z graftu szablonu WM
- **test:** preservation smoke — Szkolna/Stróża/55-081 zachowane

## 2.62.45 — ZI Tauron 2026 · adres §4 dual-fill (P1 ZI-PDF-ADDRESS-COMPLETENESS)

- **improve:** `applyAddressSectionFields` — 95–97 + 99/111/112, 101←JOB_CITY, 102/110 czyszczone
- **test:** `test-wm-print-zi-2026-smoke.mjs` · `test-wm-print-zi-2026-preservation-smoke.mjs`

## 2.62.44 — Lista Płac · godziny ETAP 1 (P0 PAYROLL-HOURS-PERSISTENCE)

- `updateWeekEmployeeDay/Rate/PrevSaturday/PayrollCarryForward` — functional patch w `App.tsx`
- `WeekEmployeeDetail` — `onPatchDay/Rate/PrevSaturday` zamiast `onChange({...safeEmp})`
- Smoke: `scripts/test-payroll-hours-etap1.mjs` (A2/A3/A4)

## 2.62.43 — Lista Płac · koszty do zwrotu ETAP 1 (P0 PAYROLL-EXTRACOSTS-FIDELITY)

- **fix:** `onPatchExtraCosts` — zapis kwoty na `prev` state (bez stale `safeEmp` snapshot)
- **fix:** `updateWeekEmployeeExtraCosts` w `App.tsx` + archiwum
- **test:** `test-payroll-extra-cost-etap1.mjs` · `test-payroll-extra-cost-amount-rca.mjs` · smoke helpers
- **backlog:** ETAP 2 merge fidelity (`mergeExtraCostsById`) — tylko na zgłoszenie autosync/multi-device

## 2.62.37 — Audit Hub localeCompare crash hotfix

- **fix:** `collectAuditHubFilterOptions` — bezpieczny sort `(label ?? "")` przy legacy `actor` undefined
- **fix:** `sortAuditFeed` + adaptery — `feedAt`/`feedActor`; fallback we wszystkich 5 źródłach
- **fix:** `JobsView` — `photo_upload` zapisuje `createdByName` w `activityLog`
- **test:** `test-audit-hub-view-model.mjs` +10 legacy (32 PASS) · adapters 47 PASS

## 2.62.36 — Audit Hub MVP-0B

- **new:** Widok `audit` — Super Admin only; `AuditHubView` lazy; agregacja 5 źródeł bez nowego KV
- **new:** Filtry source/actor/search, KPI, paginacja 50, deep linki (notatki, inspektor, roboty, WM Druk)
- **lib:** `src/lib/audit-hub/*` — adapters, filters, acl, deeplink, view-model
- **test:** `test-audit-hub-adapters.mjs` (47) + `test-audit-hub-view-model.mjs` (22)

## 2.62.35 — Operational Notes Unread Counter Fix

- **fix:** `mergeOperationalNotePair` — fingerprint ACK; brak fałszywego podbijania `contentRev` przy identycznej treści
- **fix:** `pullOperationalNotesAuxFromCloud` catch → fallback localStorage; deferred bootstrap sync read-state
- **fix:** `App.tsx` — `WGDOM_DEFERRED_BOOTSTRAP_EVENT` odświeża notes + read-state w React
- **test:** `test-operational-notes-unread-content-rev.mjs` T1–T5 + regresja p0/p1/sync-race

## 2.62.34 — Work Entry Delete Persistence

- **fix:** `deletedWorkEntryTombstones[]` na `Job` — usunięty wpis pracy nie wraca po sync z chmurą
- **fix:** `mergeWorkEntriesById` filtruje tombstone przed union
- **fix:** JobsView + Pulpit (`fixJobsForConsistencyAlert`) — SSOT `removeWorkEntryFromJobs` / `removeWorkEntriesMatchingFromJobs`
- **test:** `test-payroll-work-entry-merge-fidelity.mjs` T1–T9b (29 PASS)

## 2.62.33 — Formal XLSX UI Guard

- **fix:** Kosztorys V4 — formularz oferty XLSX bez qty>0 nie renderuje fałszywej tabeli pozycji
- **fix:** `resolveEffectiveKosztorysV4CatalogLines` — SSOT display spójny z `resolveCatalogQuantities`
- **test:** `test-v41-kosztorys-workspace.mjs` T09A (63 PASS)

## 2.62.32 — R1-FIX ATH vs Strong PDF Recovery

- **fix:** `pickBetterKosztorys` — silny PDF Recovery (CASE 1, ≥120 poz.) wygrywa nad ATH tier gdy `pdfRows > athRows × 1.05` (np. 150 vs 128)
- **fix:** TP190B-2 zachowany — PDF 132 vs ATH 128 nadal preferuje ATH (ratio 1.031 < 1.05)
- **test:** `test-tp190b-dossier-stability.mjs` R1-FIX 150/128, 150/105, 145/128 + regresja merge/stale (60 PASS)

## 2.62.31 — TP202A Analyze/Dossier Consistency (+ infra deploy unblock)

- **fix:** `dossierFromAnalysisResult` — spread existing dossier; re-analyze nie kasuje `bidProposal` i pól poza analizą
- **fix:** `analyzeTenderWithDossier` — `ourEstimatePln` użytkownika chronione (zgodnie z heavy pipeline)
- **fix:** `runAnalysis` / batch rebuild — `existingDossier` przekazywany do merge wyniku
- **test:** `test-tp202a-analyze-dossier-consistency.mjs` (12 PASS) + regresja dossier/analyze (322 PASS)
- **infra (deploy unblock):** `8a2f6d8` mkdir `dist/` w vite SW + version.json · `d79f7c1` dodany `tender-cost-content-detection.ts` (był untracked od `c869be7`)
- **docs:** `SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md` + aktualizacja handoffów agentów

## 2.62.30 — TP201E-B Layout Corruption Recovery

- **fix:** skip WM footer layout rows — Norma PRO / scalony OBMIAR / `- N -` (LP 115)
- **fix:** WM corruption aliases — `wyłącznikpodłoże`, `pojemkońc.k` → `pojemności kabla` (LP 124)
- **improve:** `UNIT_RE` — j.m. `końc.k` (WM elektryka)
- **improve:** TP182 layout extract 148 → 150 pozycji (+2)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201E-B-1…3 (85 PASS) + TP182/TP201A regresja PASS

## 2.62.29 — TP201E-A PDF Recovery M6A

- **fix:** split złączonych LP — Montaż/Demontaż/Dostawa/Wymiana + RAZEM boundary (fix JS `\b` + `ż`)
- **fix:** kalk/Kalkulacja deferred qty — max 4 layout rows (LP 66)
- **fix:** section trailer allowlist — `3.6 Pomiary elektryczne` (LP 140)
- **improve:** LP action bez KNR — wycena indywidualna (LP 44)
- **improve:** TP182 layout extract 145 → 148 pozycji (+3)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201E-A-1…8 (82 PASS) + TP182/TP201A regresja PASS

## 2.62.28 — TP201D PDF Recovery M5

- **improve:** `metr` / `metr bieżący` / `metr biezacy` / `metr biezący` → `mb` w `normalizePdfBoqUnits` + `UNIT_RE`
- **fix:** kalk. własna — opis marker-only (`d.X.Y` + liczba) nie odrzuca pozycji; fallback „Kalkulacja własna”
- **improve:** TP182 layout extract 142 → 145 pozycji (+3)
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP201D-1…10 (74 PASS) + TP182/TP201A regresja PASS

## 2.62.27 — TP190C-3B Batch Rebuild Tooling

- **new:** `tp190c-batch-rebuild.ts` + `scripts/tp190c-batch-rebuild.mjs` — batch rebuild parserVersion=3
- **improve:** dry-run domyślnie; `--write` zapisuje KV; obsługa błędów per tender
- **improve:** zgodność TP190B + TP190C-1; przygotowanie migracji 9 stale dossier
- **test:** `test-tp190c-batch-rebuild.mjs` T1–T6 (19 PASS)
- **docs:** `SESSION-HANDOFF-TP190-PARSER-V3.md` + aktualizacja handoffów deweloperskich

## 2.62.26 — TP190C-2E PDF Extract Parity + Observability

- **fix (2E-A):** Browser ↔ Node parity — legacy pdf.js w vite-node, join fallback gdy layout pusty
- **fix (2E-A):** 3 Maja 5B_9.pdf replay: CASE 3 → CASE 1 (178 rows)
- **improve (2E-B):** `extractError` vs `noTextLayer` — osobny komunikat błędu ekstrakcji PDF
- **test:** `test-tp190c-extract-parity.mjs` + `test-tp190c-extract-observability.mjs` PASS + regresja dossier

## 2.62.25 — TP190C-1 Stale Rebuild Protection

- **fix:** stale snapshot nie odrzucany przed quality gate — `pickBetter(existing, fresh)` przy forced rebuild
- **fix:** ochrona przed downgrade (np. PDF 148 → PDF 0 CASE 3)
- **improve:** `existingKosztorysForRebuildPick` — rebuild + parserVersion=3; TP190B anti-downgrade bez zmian
- **test:** `test-tp190c-stale-rebuild-protection.mjs` TP190C-1…6 PASS + regresja dossier

## 2.62.24 — TP201C-B PDF Recovery M4 (WM)

- **improve:** TP182 +10 pozycji (132 → 142), luka recovery ~21 → ~10, lowercase-start ~1.5% → ~1.4%
- **fix:** `UNIT_RE` — obsługa `pomiar`, `pom.`, `prób.`, `prob.` (sekcja pomiarów elektrycznych)
- **fix:** LP lookahead dla `kalk. własna` (LP+opis w wierszu wyżej)
- **fix:** in-word hyphen rejoin (np. `nis- kiego`, `na- stępny`, `pojem- ności`, `gipsowo - kartonowy`)
- **fix:** LP-aware dedup + alias `Kalkulacja` → `kalk. własna`
- **test:** PASS: `test-tp201a-pdf-description-fidelity.mjs`, `test-tp182-pdf-wm-recovery.mjs`, `test-pdf-przedmiar-heuristic.mjs`, `test-tp190b-dossier-stability.mjs`, `test-tender-dossier-parser-version.mjs`, `test-tender-dossier-pipeline.mjs`

## 2.62.23 — TP190B Dossier Stability

- **fix:** `CURRENT_PARSER_VERSION` 2 → 3; forced rebuild snapshotów v2
- **fix:** anti-downgrade silnego PDF Recovery (PDF 132 nie przegrywa z ATH 40)
- **test:** `test-tp190b-dossier-stability.mjs` TP190B-1…6 PASS

## 2.62.22 — Payroll Sync Stability Pack (przydziały + Sob. poprz.)

- **fix:** `mergeJobsById` — `mergeWorkEntriesById`: union `workEntries` po id; przydziały robót nie znikają po pierwszym „Dodaj robociznę”
- **fix:** `pickPrevSaturdayByTimestamps` — przy remisie `dataUpdatedAt` → `mergePrevSaturdayByRichness` (jak `mergeDaysByRichness`)
- **fix:** Lista Płac — Sob. poprz. z godzinami nie kasowane przez cloud default inactive po sync
- **test:** `test-payroll-work-entry-merge-fidelity.mjs` T1–T6 · `test-payroll-prev-saturday-fidelity.mjs` T1–T6

## 2.62.21 — Payroll P0: merge dni (godziny nie znikają)

- **fix:** `pickDaysByTimestamps` — przy remisie `dataUpdatedAt` → `mergeDaysByRichness` (bogatszy dzień wygrywa; remis → local)
- **fix:** Lista Płac — wpisane godziny pozostają po sync chmury (Pn active + 08:00–17:00 nie kasowane przez cloud inactive)
- **test:** `test-payroll-day-merge-fidelity.mjs` T1–T6

## 2.62.20 — Payroll P0: merge asymmetry (skład nie znika)

- **fix:** `mergeWeekEmployeesForWeekRange` — przy asymetrii pustości wybierana strona niepusta (local pełny + cloud pusty → local; odwrotnie → cloud)
- **fix:** Lista Płac — pracownicy nie znikają po „Odśwież skład” / „Dodaj aktywnych” na nowym tygodniu
- **test:** `test-payroll-week-employee-merge-asymmetry.mjs` T1–T5

## 2.62.19 — PDF Recovery TP201A (description fidelity)

- **fix:** `pdf-przedmiar-heuristic` — granica kodu KNR tylko na numerach normy; pełne opisy (Próba szczelności, Wymiana wkładek, Demontaż oprawek, Izolacja rurociągów)

## 2.62.18 — Bootstrap docs retry (P1 Pack A)

- **fix:** `useTenderDocumentsBootstrap` — guard completed dopiero po sukcesie fetch; błąd sieci nie blokuje retry (remount / zakładka)

## 2.62.17 — V4 bootstrap docs on /kosztorys

- **fix:** Bezpośrednie `/przetargi/:id/kosztorys` uruchamia `useTenderDocumentsBootstrap` → `bzpDocuments` → heavy dossier

## 2.62.16 — SmartPZP MVP

- **new:** Adapter `portal.smartpzp.pl/{tenant}/public/postepowanie` — discovery + JSF download (bez logowania)
- **new:** `discoverSmartPzpDocuments` — real metadata → `bzpDocuments` (`platform: smartpzp`)
- **improve:** READMODELS skip host `smartpzp` · UX badge + CTA „Otwórz postępowanie SmartPZP”

## 2.62.15 — V4 Kwalifikacja / Oferta (?ws=)

- **fix:** `/decyzja?ws=qualification|offer` — TenderQualificationWorkspace + TenderOfferSection widoczne w V4
- **fix:** CTA OwnerView → `buildTenderDetailPathFromLegacyWorkspace` z query ?ws=

## 2.62.14 — STABILITY PATCH pre-SmartPZP

- **fix:** `applyExternalDiscovery` → `pickBetterKosztorys` (SSOT jakości kosztorysu)
- **fix:** `JobFilePreviewModal` — cap 80 wierszy + „Pokaż więcej”
- **improve:** V4 CTA → `/kosztorys` gdy dossier ma kosztorys (`shouldPreferKosztorysV4Tab`)
- **improve:** `saveTendersPipelineLocal` — QuotaExceeded → `console.warn` + telemetria LS
- **improve:** `useTenderDossierHeavyLazy` — błąd parse → `console.error` + telemetria + `dossierParseFailed`

## 2.62.13 — TP200B snapshot fidelity (500 poz.)

- **fix:** `athPreviewToSnapshot` — `SNAPSHOT_PRICED_ROWS_CAP=500` (było 40); `rowCount` = parser output
- **fix:** `shouldReplaceBestKosztorys` → `pickBetterKosztorys` (rowCount SSOT, nie `rows.length`)
- **fix:** `ath_priced` — skalowanie tylko gdy `rowCount > rows.length` (legacy gap)
- **test:** `test-tp200b-snapshot-fidelity.mjs` T1–T6

## 2.62.12 — TP200A.1 external discovery zachowuje parserVersion

- **fix:** `applyExternalDiscovery` — spread istniejącego dossier; nie kasuje `parserVersion`, `scanSummary`, `bidProposal`, `estimatePln`
- **test:** `test-tp200a-external-discovery-preserve-parser-version.mjs` T1–T6

## 2.62.11 — parserVersion + auto-rescan legacy dossier (TP200A)

- **new:** `tenderDossier.parserVersion` — wersjonowanie snapshotu (SSOT `2.62.10`)
- **fix:** legacy KV/LS bez `parserVersion` — lazy Dokumenty/Wycena wymusza ponowny parse
- **fix:** stale rescan ignoruje stary kosztorys w `pickBetter`; merge sync preferuje świeży `parserVersion`
- **test:** `test-tender-dossier-parser-version.mjs` TP200A-1…8

## 2.62.10 — PDF WM recovery: kalk po KNR + unit aliases (TP198B+C)

- **feat:** `parseKalkWlasnaPrzedmiarLine` — kotwica `KNR_IN_LINE` (kalk. własna po normie KNR)
- **feat:** WM aliasy j.m. (`wyp.` / `otw.` / `podej.` / `aparat` / `lokal.`) → `szt`
- **feat:** M4 `m`→`mb`, M5 kalk. własna bez KNR, TP198A bezpieczniejszy klucz dedup
- **test:** `test-pdf-przedmiar-heuristic.mjs` TP196–TP198C; `test-tp182-pdf-wm-recovery.mjs` — **123 pozycji** (baseline 86)

## 2.62.9 — protect existing kosztorys during re-analysis (TP190A)

- **fix:** `analyzeTenderWithDossier` — `pickBetterKosztorys` po parse (re-analyze nie degraduje ATH)
- **fix:** `buildTenderDossierHeavy` — ten sam guard przy lazy dossier
- **test:** `test-tender-dossier-merge-quality.mjs` TP190A-1…5

## 2.62.8 — parallel dossier bytes prefetch (TP192C)

- **improve:** `tender-document-bytes-prefetch` — concurrency 4 przed parse dossier
- **improve:** `buildTenderDossierHeavy` — ~45–55% szybciej download komponentu
- **test:** `test-tender-parallel-bytes-tp192c.mjs`

## 2.62.7 — parallel PZ metadata probe (TP192B)

- **improve:** `mapWithConcurrency` — probe meta dokumentów platformazakupowa (limit 6)
- **improve:** `discoverPlatformaZakupowaDocuments` — ~30–35% szybciej po TP192A
- **test:** `test-tender-parallel-probe-tp192b.mjs`

## 2.62.6 — host detection shortcut (TP192A)

- **improve:** `shouldSkipReadmodelsProbe` — pomiń probe 1..50 dla PZ / logintrade / ezamawiajacy
- **improve:** `discoverTenderDocuments` — HTML przed probe; ~4 s szybszy cold fetch off-platform
- **test:** `test-tender-host-detection-tp192a.mjs`

## 2.62.5 — platformazakupowa filename encoding (TP194A)

- **fix:** `repairUtf8Mojibake` — Content-Disposition UTF-8↔Latin-1 (Załącznik, Ogłoszenie, robót)
- **fix:** `resolvePlatformazakupowaFilename` — HTML label gdy CD ma mojibake
- **improve:** UI legacy cache — `displayTenderFilename` / `normalizeTenderDocumentTitle`
- **test:** `test-tender-filename-encoding-tp194a.mjs` + live 1319989

## 2.62.4 — Loading guard + dossier metadata safety (TP193B)

- **fix:** `useTendersPipeline` — `setLoading(false)` w `finally` na ścieżce cache mount
- **fix:** `isFalsePositiveCriterion` — guard `(c.name ?? "").trim()` (brak crash na awardCriteria bez name)
- **fix:** `buildTenderDossierHeavy` — `applyMetadataConfidence` best-effort; `scanSummary.parsedAt` zawsze
- **test:** `test-tender-dossier-pipeline.mjs` — regresja TP193B

## 2.62.3 — Heavy dossier loop hotfix (TP193A)

- **fix:** `buildTenderDossierHeavy` — `scanSummary.parsedAt` po pierwszym heavy parse (koniec pętli `builtAt`)
- **fix:** Brak wielokrotnych zapisów KV / toastów „Nie udało się zapisać pipeline do chmury”
- **test:** `test-p3-fix-c-performance.mjs` — regresja TP193A

## 2.62.2 — Open Nexus / platformazakupowa.pl (TP191)

- **new:** Adapter publicznych dokumentów Open Nexus — guest session + `/file/get_new/` (transakcja/{id})
- **fix:** UX platform awareness — bez fałszywego komunikatu „login required”
- **improve:** Badge ✓ platformazakupowa.pl · CTA Otwórz postępowanie
- **test:** `test-platformazakupowa-public-documents.mjs` (14 PASS)

## 2.62.1 — docs: P0/P1 Kosztorys Merge Quality handoff deweloperski

- **docs:** `SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md` — SSOT dla TP113/TP182 merge path
- **docs:** ARCHITECTURE § 12.1.16 · AGENT-ONBOARDING § 6e · AGENTS.md · CURRENT-TASK.md
- **infra (prod):** `4574182` P0 cloud merge · `50d7501` P1 BZP merge · `tender-dossier-merge.ts`

## 2.62.1 — WM PDF przedmiar recovery (TP182)

- **fix:** M1 normalizacja j.m. (`m 2`→`m2`, `szt.`→`szt`) · M2 split BOQ po KNR/d.X.Y
- **fix:** Extended norms — KNR-W, ZKNR, NNRNKB, KNR AT
- **fix:** Merge protection — PDF przedmiar discovery nie przegrywa z formularzem ofertowym XLSX
- **test:** `test-tp182-pdf-wm-recovery.mjs` (≥80 pozycji)

## 2.62.0 — Kosztorys PRO Dashboard (V4.2 + V4.2A UX polish)

- **new:** KOSZTORYS PRO — 8 KPI, TOP 20 pozycji, filtry branżowe, Ocena kosztorysu
- **new:** Pobierz ATH (oryginalny plik)
- **improve:** V4.2A hero KPI above the fold · kompaktowy nagłówek Kosztorys
- **fix:** V4.2A bez „Dominują inne” · marża „Ustal marżę” · filtr Elektryczne · Sanitarne empty state
- **lib:** `tender-kosztorys-pro-dashboard.ts` + reuse P2 scope/fit

## 2.61.5 — Pełna widoczność ATH (P0)

- **fix:** `CATALOG_QUANTITIES_CAP` 250 → 500 (zgodnie z parserem ATH)
- **fix:** `buildCatalogQuantitiesFromPreview` — filter przed slice
- **improve:** KPI Kosztorys `rowCount` / format „pokazane / łącznie” + hint przy obciętym snapshotcie

## 2.61.4 — ZIP ATH Recovery

- **fix:** Duże ZIP do 128 MB (eZamawiający / WM) — Edge zip-catalog + zip-entry-bytes
- **fix:** Wykluczenie formularzy ofertowych z discovery kosztorysu
- **fix:** Recovery ATH z DOKUMENTACJA PROJEKTOWA.zip
- **improve:** Diagnostyka pobierania dokumentów w Edge (HTTP, content-type, final URL)
- **test:** `test-tender-zip-catalog-tp113.mjs`, `test-tender-cost-discovery.mjs`

## 2.61.3 — ATH / Kosztorys Source Recovery

- **fix:** Zakładka Kosztorys korzysta z `catalogQuantities` jako głównego źródła danych (zamiast `kosztorys.rows`)
- **fix:** Przywrócono historyczną ścieżkę wyświetlania pozycji kosztorysowych (do 250 w tabeli)
- **new:** Przycisk „Pełny podgląd ATH” — reuse `JobFilePreviewModal` (do 500 pozycji)
- **fix:** KPI kosztorysu liczone z danych katalogowych
- **fix:** Poprawiony empty state przy braku pozycji
- **unchanged:** ATH parser, parseKosztorysBytes, parseXlsxToKosztorys, dossier pipeline, athPreviewToSnapshot, Intelligence, Scoring, Qualification, Valuation Engine
- **test:** `test-v41-kosztorys-workspace.mjs` (T01–T09, 28/28)

## 2.61.2 — KOSZTORYS HOTFIX

- **fix:** Kosztorys nie renderuje formularzy ofertowych jako pozycji — filtr formalnych arkuszy (KRS, REGON, CEIDG, oferta, wykonawca, oświadczenia)
- **fix:** Walidacja pozycji przed tabelą + empty state dla dokumentów formalnych
- **fix:** KPI kosztorysu po przefiltrowanych danych (`buildKosztorysV4Display`)
- **unchanged:** ATH/SWZ parser, dossier pipeline, Intelligence, Scoring, Qualification, Valuation, backend
- **test:** `test-v41-kosztorys-workspace.mjs` (T01–T05, 16/16)

## 2.61.1 — PRZETARG + KOSZTORYS + KPI PRO

- **new:** Zakładka **Przetarg** — dane, warunki udziału, zakres robót, najważniejsze informacje
- **new:** Zakładka **Kosztorys** — KPI, status ATH, tabela pozycji, „Brak rozpoznanych pozycji”
- **new:** **KPI Bar PRO** — dokumenty, ATH, wycena (ratio + %)
- **improve:** Kolejność zakładek: Przetarg → Dokumenty → Kosztorys → Ceny → Decyzja → Strategia → Materiały
- **unchanged:** ATH/SWZ parser, Intelligence, Qualification, Dossier, Scoring, backend

## 2.61.0 — WGDOM V4 UX NAVIGATION MVP

- **new:** Osobny widok przetargu — `/przetargi/:id/:tab`, breadcrumb, KPI Bar, Tender Detail Page + Tab Bar
- **improve:** Lista bez accordionu — klik → osobny widok; rollback przez `TENDERS_V4_ROUTING = false`
- **unchanged:** ATH, Dossier, Scoring, Qualification, Valuation, Intelligence V3.1

## 2.60.0 — TENDER INTELLIGENCE DASHBOARD V3.1 (SPRINT 1)

- **new:** Zakładka **Intelligence** — werdykt, zakres, ekonomia, jedna akcja
- **new:** Decision Overlay O1–O5 + Reasons Policy (STARTUJ / ANALIZUJ / ODPUŚĆ)
- **new:** Executive Summary na panelu (bez wpływu na modal PDF)
- **new:** `buildTenderIntelligenceContext` — scoringContext SSOT z Providera
- **improve:** Owner View = renderer `intelligenceCtx`; 7 sekcji; OwnerNextSteps usunięte
- **improve:** `version.json` — `version`, `commit`, `timestamp` przy buildzie
- **improve:** Bez zmian: ATH, Dossier, Qualification, Valuation, PDF Preview
- **test:** `test-v31-tender-intelligence.mjs` + regresja P5/P1C/P1D/P2A

## 2.59.53 — P2A Scope From PDF Text

- **new:** Executive Summary wnioskuje główne roboty z `pdfTextPreview` gdy brak `categories[]` i `catalogQuantities[]` (pewność Średnia)
- **improve:** „Pozycje: 0” → „Nie ustalono liczby pozycji” / „W trakcie analizy”
- **test:** `scripts/test-p2a-scope-from-pdf-text.mjs`

## 2.59.49 — Lista Płac Przydziały robót (PAYROLL-ASSIGNMENTS-P1)

- Nowy przełącznik **Przydziały robót** w Liście Płac — edycja `workEntries[]` bez wchodzenia w Roboty
- Walidacja spójności LP↔Roboty (reuse `payrollJobConsistencyAlerts`), badge 🟢🟡🔴
- Smoke: `scripts/test-payroll-assignments-p1.mjs`

## 2.59.48 — Inspektor DESIGN-002 Design System Alignment

- **improve:** section pills jak JobDetailSectionNav · badge pakietu bez emoji · typografia sticky header + JobListPrimaryBadge · karty rounded-xl / spacing admin
- **test:** `test-inspector-design-002.mjs`

## 2.59.47 — Inspektor UX-002 Quick Wins

- **improve:** sticky status pakietu + pakiet above the fold + skróty Pobierz/Checklista/Zdjęcia
- **test:** `test-inspector-ux-002.mjs`

## 2.59.46 — Inspektor P1B Pakiet odbiorowy (download + manifest)

- **new:** InspectorPanel → Pakiet odbiorowy — status, metadane, pobierz ZIP, manifest read-only
- **new:** sync read-only `kw-delivery-package-publications` w inspektorze; manifest przy publikacji admin
- **test:** `test-inspector-delivery-package-p1b.mjs`

## 2.59.45 — Inspektor P1A Published Delivery Package (admin publish)

- **new:** WM Druk → „Opublikuj dla inspektora” — upload ZIP + `kw-delivery-package-publications`
- **new:** fingerprint wejść generacji, supersede ACTIVE, metadata (pliki, rozmiar)
- **test:** `test-delivery-package-publications-p1a.mjs`

## 2.59.44 — Docs: EM handoff + agent onboarding (no code change)

- **docs:** `SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` — SSOT modułu EM dla programistów
- **docs:** PROJECT-HANDOFF-CURRENT, CURRENT-TASK, ARCHITECTURE §12.1.10, AGENT-ONBOARDING, AGENTS.md

## 2.59.44 — Pomiary Elektryczne EM-P1R-HOTFIX-001 (ADDRESS parity)

- **fix:** 4 szablony pomiarowych — `Miejsce pomiaru: {{ADDRESS}}` zamiast hardcoded Sępa 83/7
- **test:** `test-em-p1r-hotfix-001-address-parity.mjs` (23 PASS)

## 2.59.43 — Pomiary Elektryczne EM-P1R (Template Rebuild SSOT Word)

- **fix:** 5 szablonów DOCX z oryginalnych formularzy Desktop — layout 1:1, legendy, orientacja
- **improve:** Retire `build-em-docx-templates.mjs` → `templatize-em-p1r-from-ssot.mjs`
- **test:** `test-electrical-measurements-p1.mjs` (32 PASS) · `test-em-p1r-visual-smoke.mjs` (60 PASS)

## 2.59.42 — Pomiary Elektryczne EM-P1.6C (Registry Repair V2)

- **fix:** Jednorazowa naprawa prod KV — usuwa RAP-2-2026 (Brochów), sierocy Cygan bez numeru; `baselineByYear.2026=44`, `repairVersion=2`; katalog/rejestr startują od zera; następny RAP = **RAP-45-2026**
- **test:** `scripts/test-electrical-measurements-registry-repair-v2.mjs`

## 2.59.41 — Pomiary Elektryczne EM-P3.5 (INDEX-POMIARY export)

- New: INDEX-POMIARY.txt + INDEX-POMIARY.csv w ZIP katalogu i w folderze Pomiary/ paczki odbiorowej

## 2.59.40 — Pomiary Elektryczne EM-P3 (integracja ZIP odbiorowy)

- New: WM Druk ZIP odbiorowy — folder Pomiary/ z 5× DOCX aktywnego RAP produkcyjnego
- Improve: struktura Odbiory/ + Pomiary/, checkbox domyślnie ON przy aktywnym RAP; TEST-RAP ignorowany

## 2.59.39 — Pomiary Elektryczne EM-P3A (Katalog UX + Rejestr RAP)

- Improve: ZIP pojedynczy `RAP-X-YYYY_ADRES.zip`, kolumna Robota, wyszukiwanie RAP, deep-link do Roboty
- New: zakładka Rejestr RAP w Katalogu Pomiarów

## 2.59.38 — Pomiary Elektryczne EM-P2.5 (raporty testowe)

- New: TEST-RAP-NNN — bez registry, bez wpływu na numerację produkcyjną, status TESTOWY w katalogu

## 2.59.37 — Pomiary Elektryczne EM-P2 (Katalog Pomiarów)

- New: WM Druk → Katalog Pomiarów — lista RAP, filtry, DOCX/ZIP pojedynczy + wielokrotny, INDEX.txt

## 2.59.36 — Pomiary Elektryczne EM-P1.6B (baseline RAP repair)

- Fix: baseline RAP 2026→44, purge test Kleczkowska/Brochów (RAP-1/2-2026), next RAP-45-2026

## 2.59.35 — Pomiary Elektryczne EM-P1.7 (domyślne ustawienia)
- `kw-electrical-measurement-settings` — pomiarowiec, model/numer miernika
- WM Druk → Ustawienia → sekcja Pomiary; auto-fill nowych raportów; nadpisanie per raport
- Smoke: `test-electrical-measurements-settings-p17.mjs`

## 2.59.34 — Pomiary Elektryczne EM-P1.6 (Rejestr RAP)
- Rejestr `kw-electrical-measurement-registry` — numer RAP przypisany 1× do jobId, bez zwrotu do puli
- UI: numer RAP read-only, status, data przypisania; recreate po usunięciu; checklista Pomiary
- Smoke: `test-electrical-measurements-registry-p16.mjs`

## 2.59.33 — Pomiary Elektryczne EM-P1.5 (Measurement Value Engine)
- Seed RNG: wartości ADSC/RCD/Rezystancja generowane raz, zapis w `valueSet`
- UI: Wyniki pomiarów + Przelicz + korekta Zs/Rs · preview/DOCX ze zapisu
- Smoke: `test-electrical-measurements-p15.mjs`

## 2.59.32 — Notatki operacyjne P0-HOTFIX-002 (read-state race)
- Fix: `runCloudSync` push aux używa `aux.readState` / `aux.auditLog` po pull (nie stale closure)
- Smoke: `test-operational-notes-sync-race-p0.mjs`

## 2.59.31 — Pomiary Elektryczne EM-UX-001 (WM Druk)
- UI Pomiary przeniesione z Roboty → WM Druk (zakładka Pomiary)
- Roboty: skrót + „Otwórz w WM Druk” · deep link z kontekstem roboty

## 2.59.30 — Pomiary Elektryczne EM-P1B (generator DOCX)
- 5× DOCX: Protokół, Dane informacyjne, RCD, ADSC, Rezystancja — XML row cloning + payload SSOT
- UI: przyciski „Generuj …” per dokument w panelu Roboty
- Szablony: `public/em-measurements/*.template.docx` · smoke `test-electrical-measurements-p1.mjs` 32/32

## 2.59.29 — Hotfix sync mergeRecoverableCharges (P0-HOTFIX-001)
- Przywrócony import `mergeRecoverableCharges` / `normalizeRecoverableCharges` w `cloud-sync.ts` (regresja EM-P0 b563ea8)

## 2.59.28 — Pomiary Elektryczne EM-P0 final (korekty 4–6)
- Circuit: `displayName` + `sortOrder` — bez migracji pod EM-P1
- Preview SSOT: `buildAdscPreview` / `buildResistancePreview` / `buildRcdPreview`
- Panel: job summary Raporty/Obwody/RCD + zwijanie szczegółów

## 2.59.27 — Pomiary Elektryczne fundament (EM-P0)
- Domena `src/lib/electrical-measurements/*` + klucz `kw-electrical-measurements`
- Panel Roboty: wiele raportów pomiarowych per robota, preview read-only
- Stub `generate-em-docx.ts` (TODO EM-P1)
- Smoke: `test-electrical-measurements-p0.mjs`

## 2.59.26 — WM Druk historia generowania (WM-HISTORY-001)
- Klucz `kw-wm-print-history` (cap 1000) — metadane PDF/DOCX/ZIP po sukcesie generacji
- Zakładka Historia w WM Druk + panel Historia WM Druk w Robotach
- Smoke: `test-wm-print-history-001.mjs`

## 2.59.25 — WM Druk housekeeping kodu (P0.5B)
- `wm-print-pdf-fonts.ts` + `wm-print-pdf-static.ts`: wydzielenie aktywnych helperów prod
- `generate-pdf.ts`: re-exporty + `@deprecated` legacy LiveCycle — zero zmiany ZIP/ZI/DOCX
- Raport: [`audit/P0.5B-HOUSEKEEPING-REPORT.md`](audit/P0.5B-HOUSEKEEPING-REPORT.md)

## 2.59.24 — WM Druk legacy ZI slot cleanup (P0)
- KV: tombstone `26f02c78…` · jeden aktywny ZI Tauron 2026 (`2b22da48…`)
- `cloud-sync.ts`: merge `kw-wm-print-deleted-template-ids` z chmury przy pull
- `generate-zip.ts`: `dedupeWmPrintTemplatesByName` przed generacją ZIP

## 2.59.23 — Hotfix ZI pdf.js worker (P0)
- `zi-tauron2026-form-extract.ts`: `GlobalWorkerOptions.workerSrc` — fix ZIP „No GlobalWorkerOptions.workerSrc specified”

## 2.59.22 — Odbiory WM Druk ZI Tauron 2026 (GO)
- `generate-pdf-zi-tauron2026.ts` + `zi-tauron2026-form-extract.ts`: Tauron 2026 §4 mapping **99/111/112** + preservation (pdf.js graft na szyfrowanym WM ZI.pdf)
- `public/wm-print/zi-tauron-2026-template.pdf` — bundled SSOT (decrypted blank)
- Legacy LiveCycle CLOSED → `audit/archive/legacy-zi-livecycle-2021/`
- Smoke: `test-wm-print-zi-2026-smoke.mjs` · `test-wm-print-zi-2026-preservation-smoke.mjs`
- SSOT: `docs/ZI-2026-HANDOFF.md`

## 2.59.21 — Odbiory WM Druk ZI Tauron 2026 (dev, superseded)
- Pierwszy generator Tauron 2026 — zastąpiony przez 2.59.22 (mapping + preservation)

## Docs 2026-06-15 — ZI Investigation closeout (P0.4B)

- **`audit/ZI-FINAL-HANDOFF.md`** — SSOT śledztwa ZI (RCA CLOSED, NO-GO, audit inventory, rekomendacje)
- Zaktualizowano: `SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`, `PROJECT-HANDOFF-CURRENT.md`, `ARCHITECTURE.md` §12.1.8, `AGENTS.md`, `CURRENT-TASK.md`
- Inventory: `scripts/_p04b-inventory.json` · `scripts/_readonly-p04b-inventory.mjs`

## 2.59.20 — Odbiory WM Druk P0.3A ZI §3 adres obiektu (repo lokalnie — UX nadal FAIL)
- `generate-pdf.ts`: JOB_* → TextField2[10/9/8] @ y≈142; pdflib index 24/23/22; bez strip §3; filtr legacy §1 KV

## 2.59.19 — Odbiory WM Druk P0.2A ZI demo ULICA/BUD/LOK strip
- `generate-pdf.ts`: `stripZiDemoDesignerFields` — wyczyść/ukryj demo @ y≈142; oczyszczony szablon w storage

## 2.59.18 — Docs: SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK + ARCHITECTURE § 12.1.8

## 2.59.18 — Odbiory WM Druk P0 hotfix parseWmPrintTemplates runtime
- `cloud-sync.ts` merge templates: użyty zaimportowany `normalizeWmPrintTemplates`

## 2.59.17 — Odbiory WM Druk P0 cleanup template pollution EXECUTED
- Prod KV `kw-wm-print-templates`: 99→15, 84 tombstone, canonical ZI OK

## 2.59.16 — Odbiory WM Druk P0 cleanup template pollution (skrypt KV)
- `cleanup-wm-print-template-pollution.mjs` — backup, raport KEEP/DELETE, `--execute` po akceptacji

## 2.59.15 — Odbiory WM Druk P0 fix template pollution (seed guard)
- Seed tylko gdy local+chmura puste; `parseWmPrintTemplates` bez auto-seedu; dedupe name przed push KV

## 2.59.14 — Odbiory WM Druk P0.1E fix ZI Edge (cover + hidden widgets)

- ZI hybrid: biały cover + Noto na stronie + ukrycie widgetów 8/9/10 — Edge bez {{JOB_*}}
- Forensic P0.1E: /V OK ale tło Im0 nad widgetami w Edge

## 2.59.13 — Odbiory WM Druk P0.1D fix ZI /AP widgetów

- ZI hybrid: `updateAppearances(Noto)` tylko pola 8/9/10 — viewer widzi wartości zamiast {{JOB_*}}
- Usunięto overlay content-stream P0.1C (pod warstwą widgetów)

## 2.59.12 — Odbiory WM Druk P0.1C fix ZI widoczny tekst (XFA overlay)

- ZI hybrid/XFA: białe tło + Noto Sans w prostokątach pól 8/9/10 (viewer widzi adres)
- Brak cichego copy-as-is przy błędzie fill; ZI zawsze `pdf_form`
- `diagnoseZiPdfFieldFill` + test forensic P0.1C

## 2.59.11 — Odbiory WM Druk P0.1B fix ZI XFA
- Mapowanie TextField2[8/9/10] · indeks fallback · test `test-wm-print-p0-1b-zi-fix.mjs`

## 2.59.10 — Odbiory WM Druk P0.1A fix DOCX XML
- Bezpieczne czyszczenie `<w:t>` (regresja 2.59.9) · split-run + proofErr · test `test-wm-print-p0-1a-docx-fix.mjs`

## 2.59.9 — Odbiory WM Druk P0 fix generatorów
- PDF statyczne copy-as-is · ZI bez flatten · DOCX split-run · testy `test-wm-print-p0-*.mjs`

## 2.59.8 — Odbiory WM Druk P1.0.5A (deduplikacja kompletności)
- Fix duplikatów braków · % po unikalnych slotach · UI Brakuje (N) · test `test-wm-print-p1-0-5a.mjs`

## 2.59.7 — Odbiory WM Druk P1.0.5 (kompletność vs konfiguracja)
- Kompletność robota tylko ze slotów job_upload · Stan konfiguracji w Szablony · test `test-wm-print-p1-0-5.mjs`

## 2.59.6 — Odbiory WM Druk P1.0.4 (domyślne zaznaczenie)
- Wszystkie aktywne szablony zaznaczone domyślnie · Zaznacz/Odznacz wszystko · licznik · ZIP z wyboru · test `test-wm-print-p1-0-4.mjs`

## 2.59.5 — Odbiory WM Druk P1.1 correction (grupowanie po statusie robota)
- Usunięto niezależny status WM i kw-wm-print-job-statuses · sekcje z jobPhase · test `test-wm-print-p1-1-status-grouping.mjs`

## 2.59.4 — Odbiory WM Druk P1.1 (statusy procesu WM)
- Status WM per robota · sekcje · filtry · sync `kw-wm-print-job-statuses` · test `test-wm-print-p1-1-statuses.mjs`

## 2.59.3 — Odbiory WM Druk P1.0.3 (multi-upload)
- Dodaj pliki: multiple, drag & drop, append, liczniki · test `test-wm-print-p1-0-3.mjs`

## 2.59.2 — Odbiory WM Druk fix usuwania pliku z grupy
- Single-click delete: files[] autorytatywne, merge LWW, push bez union safe-merge

## 2.59.1 — Odbiory WM Druk P1.0.1 (multi-file groups)
- Grupy szablonów: wiele plików, liczniki, ZIP ze wszystkich plików grupy
- Migracja legacy single-file → files[1] · test `test-wm-print-p1-1.mjs`

## 2.59.0 — Odbiory WM Druk (P1)
- Nowy moduł menu: Odbiory WM Druk — szablony, dokumenty per robota, ZIP, kompletność
- Zmienne {{DATE}}/{{JOB_*}} · sync `kw-wm-print-*` · test `test-wm-print-p1.mjs`

## 2.58.1 — Notatki operacyjne HF (Backup Completeness)
- Export/import UI + local snapshot + EMAIL_KV_KEYS — 4 klucze KV (notes, read-state, audit-log, deleted-ids)
- Test: `scripts/test-operational-notes-hotfix-2.58.1.mjs` · **HF CLOSED**

## 2.58.0 — Notatki operacyjne P2A (Inspektor UI)
- Panel inspektora: ikona Notatki operacyjne + badge unread · overlay `OperationalNotesView variant=inspector`
- Create/comment/ACK/read status · sync 4× KV · ACL bez edit/archive/delete/share/audyt
- Test: `scripts/test-operational-notes-p2a.mjs` · **P2 CLOSED**

## 2.57.5 — Notatki operacyjne P2C (Audit UI)
- Sheet Audyt (Super Admin only) · filtry akcji/użytkownika/notatki · wyszukiwanie · paginacja 50 · ACK → wpis audit

## 2.57.4 — Notatki operacyjne P2B (Dashboard widget)
- Widget na Pulpicie: Łącznie · Nieprzeczytane · Od inspektora · ostatnia aktywność · klik → Notatki operacyjne

## 2.57.3 — Sidebar cleanup + Kadry
- Kadry (ex Pracownicy i kontakty) · usunięto KPI „Bieżący tydzień” z sidebara · w-60 · dark scrollbar

## 2.57.2 — Notatki operacyjne P1 (ACK + badge + banner)
- ACK jawne · auto-ACK autora · badge menu + banner · status Przeczytali/Nie przeczytali · fix contentRev przy edycji tytułu

## 2.57.1 — Menu: Pracownicy i kontakty
- Jedna pozycja menu + zakładki Pracownicy | Kontakty · routing `directory` / `contacts` bez zmian KV

## 2.57.0 — Notatki Operacyjne (P0)
- Moduł `OperationalNotesView` + panel `JobOperationalNotesPanel` · 4 klucze KV · ACL staff
- Komentarze, archiwum, logical delete, audit-log (cap 3000), cloud sync
- Test: `scripts/test-operational-notes-p0.mjs`

## 2.56.10 — fix false exclude przebudowa WM (P1 pipeline)
- `matchesTenderExcludeKeyword()` — granica słowa; mirror Edge
- Handoff: `docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` § 7

## 2.56.9 — P3.6 filtry klientów strategicznych (WM/ZZK/MOPS/TBS/Gminy/Uczelnie)
- SSOT: `tenders-strategic-client-filters.ts` · Handoff § 6

## 2.56.8 — P2-G.3C benchmark klasyfikacji prod
- Audyt prod KV: 303 poz. ATH (ZZK×2, Falzmanna) — seed UNKNOWN 16→0
- Mapowania: cokoliki, brodziki, kabiny, przyłącza gaz, plafoniery, roboty przygotowawcze
- `foldPolishText` normalizuje wielokrotne spacje (ATH prod)

## 2.56.7 — P3 stabilizacja wyceny i klasyfikacji
- Wycena UX: 1 alert, zwinięte Benchmark/Materiały/Pozycje/Szczegóły
- Słowniki klasyfikacji 3.1: bruk, dachy, izolacje, zagospodarowanie, rozbiórki
- Benchmark materiałów rynku: HOLD

## 2.56.6 — P3.4A historia materiałów
- `material-history.ts` + `material-impact.ts` — trend i wpływ vs własna historia (90 dni)
- Rozszerzenie `kw-wgdom-cost-catalog-history` o `materialPlnPerUnit`

## 2.56.5 — P3.3D benchmark impact
- `labor-benchmark-impact.ts` — wpływ PLN = odchylenie stawki × ilość (read-only)
- Wycena: hero Benchmark Impact + kolumny w podsumowaniu kategorii

## 2.56.4 — P3.3B benchmark robocizny PRO
- `LaborBenchmarkEdition` — metadata źródeł, data, pokrycie
- `kw-wgdom-cost-catalog-history` — snapshoty przy zmianie rbh; trend 90 dni
- UI triple view + panel Źródło benchmarku w Baza cen

## 2.56.3 — P3.3A benchmark robocizny MVP
- `labor-benchmark.ts` + statyczne zakresy — porównanie read-only, bez wpływu na wycenę

## 2.56.2 — P3.5B override cen per przetarg
- `kw-tender-price-overrides` — nadpisania materiał/robocizna per kategoria × tenderId
- UI Edytuj w podsumowaniu kategorii; źródło Override; hero KPI natychmiast

## 2.56.1 — P3.5 ceny per pozycja kosztorysu
- `tender-catalog-line-pricing.ts` + UI w Wycena → Pozycje kosztorysowe (read-only)
- UNKNOWN bez cen; podsumowanie kategorii; źródło Baza cen / Katalog WGDOM

## 2.56.0 — P3.1 Wycena UX + P3.2.0 Baza cen
- Hero KPI Wycena: koszt własny, marża %, cena oferty; alerty; szczegóły zwinięte
- Zakładka Przetargi → Baza cen (`TenderPriceBasePanel`, `kw-wgdom-cost-catalog`)

## 2.55.10 — P2-H.5C/5D PDF CAD + multi-ATH
- `noTextLayer` w `extractPdfText` → CASE 3 (CAD bez tekstu)
- `scoreCostTitleMatch` + tie-break w `discoverBestCostDocument`
- Sync `costDiscovery.source` z faktycznym źródłem dossier

## 2.55.9 — P2-H.5B PDF przedmiar (heurystyki)
- `pdf-przedmiar-heuristic.ts` — sygnały KNR/Lp./J.m./ilość, ekstrakcja wierszy, `likelyScan` → OCR
- `parseDocumentToKosztorys` — PDF przedmiar z tekstu pdf.js; UX case 1/2/3

## 2.55.8 — P2-H.5A PDF przedmiar (MVP)
- `pdf_przedmiar` / `zip_pdf_przedmiar` — `classifyCostDocumentType`, `discoverBestCostDocument`
- `parseDocumentToKosztorys` — FOUND_NO_VALUE snapshot (`PDF_PRZEDMIAR`, rows `[]`)
- UX: „Znaleziono przedmiar PDF” / „Znaleziono kosztorys w formacie PDF”

## 2.55.7 — P2-H.6 filtr folderów ZIP/7Z
- `isArchiveInnerListableFile()` — basename wymaga rozszerzenia 2–5 znaków
- `listZipFiles` / `list7zFiles` — odrzucenie folderów logicznych (II. PRZEDMIARY itd.)

## 2.55.6 — P2-H.4 UX copy archiwów 7Z
- scanSummary: `sevenZUnpackOk`, `sevenZInnerCount` z `parseTenderDossierDocuments`
- `sevenZKosztorysMissingLine()` — CASE A błąd odczytu vs CASE B brak ATH/XLS/XLSX
- UI: `buildKosztorysStatusLine`, `buildEstimateMissingReason`, cost-snapshot, data-ssot

## 2.55.5 — P2-H.3 obsługa archiwów 7Z
- 7z-wasm (LGPL) — list7zFiles / read7zEntry / pickBestFrom7zBytes; inner ATH/PDF/XLSX jak ZIP
- buildTenderDocCandidates + parseTenderDocumentCandidate + filterOuterArchiveWhenInnerExists
- UI: „Pokaż pliki w 7Z”, JobFilePreviewModal inner preview
- test: `test-tender-7z-archive.mjs` · fixture: `scripts/fixtures/test.7z`

## 2.55.4 — P2-G.2D klasyfikacja C.O. (WM/ZZK/MOPS)
- INSTALACJE_CO (15 kategorii) — grzejniki, głowice termostatyczne, zawory C.O., spuszczenie/odpowietrzenie
- Słownik + phrase rules · test: `test-tender-cost-intelligence.mjs` §24

## 2.55.3 — P2-G.2C klasyfikacja WM/ZZK (wod-kan + gaz + biały montaż)
- HYDRAULIKA rozszerzona (wod-kan) · INSTALACJE_GAZ + ROBOTY_OGOLNOBUDOWLANE (14 kategorii)
- Słownik + phrase rules: rurociągi PVC/PP, WC, gaz, przebicia, kuchnie gazowe → WYPOSAZENIE
- test: `test-tender-cost-intelligence.mjs` §23

## 2.55.2 — P0 hotfix double ZIP unpack (Marketplanet dossier)
- parseTenderDocumentCandidate — jedno rozpakowanie ZIP; fix JSZip „Can't find end of central directory” po poprawnym pobraniu
- selectDossierCandidates — skip outer ZIP gdy są inner kandydaci
- test: `smoke-test-ezamawiajacy-p2h2-double-unpack.mjs`

## 2.55.1 — P0 hotfix Marketplanet ZIP analysis wiring
- sourcePageUrl w loadDocBytes / analyze-local / JobFilePreviewModal (sesja replay)
- Edge guard: repository/download bez sourcePageUrl → 502; walidacja PK/%PDF
- test: `smoke-test-ezamawiajacy-p2h1-hotfix.mjs`

## 2.55.0 — P2-H.1 Marketplanet (ezamawiajacy.pl)
- Generic adapter `*.ezamawiajacy.pl` — sesja JSESSIONID + `repository/download`
- WM / ZZM: auto-discovery dokumentów z ogłoszenia BZP; replay sesji przy pobieraniu bytes
- Priorytet ezamawiajacy przed BIP · test: `smoke-test-ezamawiajacy-p2h1.mjs`

## 2.54.1 — P0 OwnerDecision Store Wiring Fix
- Strategia crash fix: `ownerDecisions.store` w KPI + Wymaga decyzji dziś
- Defensywny `byId ?? {}` w `tender-strategy-ux.ts`

## 2.54.0 — UX.2S Strategy Simplification
- Strategia = centrum decyzji (KPI · decyzje · terminy · monitoring · okazja lite)
- Usunięte z osi: Action Center, Attention, Change/Q&A osobno, KPI rynku
- Analityka collapsed · test: `test-tender-strategy-ux.mjs`

## 2.53.7 — P2-F.6 Offer Completeness Engine
- Workspace Oferta — „Kompletność oferty” (skrót + checklista krytyczne/dodatkowe)
- Reuse P2-F.1–F.5: `offer-completeness.ts` · test: `test-tender-workspace-ux.mjs` § P2-F.6

## 2.53.6 — UX.1D Formal Details Compression
- Szczegóły formalne domyślnie zwinięte — skrót max 5 linii + lazy render karty przetargu
- Dokumenty przed skrótem formalnym w workspace Dokumenty

## 2.53.5 — UX.1C Tender Documents Prioritization
- Czytelne nazwy plików (`normalizeTenderDocumentTitle`) — tylko UI
- TOP 5 „Najważniejsze dokumenty” + zwinięte pozostałe w workspace Dokumenty

## 2.53.4 — UX.1B Tender Workspace Tabs
- 5 workspace lazy render · handoff: `docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`

## 2.53.3 — ARCH-001 Circular Dependency Prevention
- ARCHITECTURE § 11.6 — P0 ARCH RULE, Lessons Learned v2.53.1, raport ryzyka
- scripts/audit-import-cycles.mjs — audyt cykli src/lib

## 2.53.2 — HOTFIX P0 biały ekran (cykl importów app-core)
- ReferenceError at startup — cloud-sync ↔ tender-cost-calibration cycle
- lazy import cloud-sync w kalibracji; session-cache bez importu cloud-sync

## 2.53.1 — UX.1A Tender Workspace Cleanup (MIN)
- Sticky Tender Summary + banner monitoringu → Strategia
- Kolejność: karta → załączniki → kwalifikacja → wycena → oferta → formalia → HTML
- Deduplikacja wyceny/kalibracji/ATH; przygotowanie pod UX.1B workspace tabs

## 2.53.0 — P2-G.3B Historical Cost Calibration (MIN)
- submittedBidPln + submittedAt na pipeline przetargu
- HistoricalCostSnapshot + kw-tender-calibration (sync chmura)
- tender-cost-calibration.ts — delty, summary, hints (N≥10, read-only)
- UI: Kalibracja historyczna (panel wyceny) + 🎯 Kalibracja WGDOM (profil firmy)

## 2.52.9 — P2-G.2C Work Category Refinement
- GLADZIE_TYNKI (m²/mb) + WYPOSAZENIE (szt/kpl) — 12 kategorii MVP
- split GK: zabudowa sucha vs gładzie/tynki/narożniki
- phrase rules + dict + user dict migrate GK→GLADZIE_TYNKI (selektywnie)

## 2.52.8 — P2-G.2D Phrase-Based Classification
- wgdom-phrase-rules.ts (~60 reguł contains/prefix, odmiany PL)
- pipeline: katalog → user dict → phrase rules → słownik branżowy
- inspektor: Top nieznane frazy (zamiast tokenów)

## 2.52.7 — P2-G.2B Cost Category Expansion CORE
- TRANSPORT_UTYLIZACJA + WENTYLACJA (10 kategorii MVP)
- gruz/odpady → transport (≠ ROZBIORKI); wentylacja; pomiary zerowania → ELEKTRYKA
- anti-double-count wasteDisposalWeeklyPln gdy gruz w przedmiarze
- migracja kw-wgdom-cost-catalog + user dict remap ROZBIORKI→TRANSPORT

## 2.52.6 — P2-G.2A Assisted Classification (user learning)
- wgdom-user-classification-dictionary.ts + kw-wgdom-classification-dictionary
- UNKNOWN Inspector: przypisz kategorię → natychmiastowa reklasyfikacja
- Profil firmy: WGDOM Classification Dictionary (edycja, sync chmura)
- Pokrycie klasyfikacji z kolorem (cel 97%+)

## 2.52.5 — P2-G.1F WGDOM Construction Dictionary
- wgdom-construction-dictionary.ts 150+ terminów branżowych
- classifyAthLineCategory + słownik, coverageDelta w inspektorze
- Pokrycie TBS/WM ~82%→~95% bez zmian kalkulatora

## 2.52.4 — P2-G.1E Classification Inspector
- buildClassificationSummary / buildUnknownRows / buildCatalogTuningHints
- TenderBidProposalPanel sekcja Klasyfikacja przedmiaru
- Jakość wyceny z pokrycia % (Wysoka/Dobra/Średnia/Ograniczona)

## 2.52.3 — P2-G.1D UX wyceny discoverability + explainability
- Kafelek Nasza wycena → scroll do TenderBidProposalPanel + hint
- Panel: Skąd/Jak powstała wycena, breakdown domyślnie otwarty
- Profil firmy: 4 sekcje + COST_FIELD_HINTS (bez zmian kalkulatora)

## 2.52.2 — P2-G.1C centrum wyceny UI + katalog chmura
- Nasza wycena multi-linia + źródło + jakość
- TenderBidProposalPanel badge/disclaimer/podstawa kalkulacji
- TenderCompanyProfilePanel WGDOM Cost Catalog + kw-wgdom-cost-catalog

## 2.52.1 — P2-G.1B integracja kalkulatora catalog mode
- catalogQuantities[] snapshot (250 poz.)
- computeTenderBidProposal pricingMode catalog / ath_priced
- Nasza wycena — koszt wykonania gdy FOUND_NO_VALUE

## 2.52.0 — P2-G.1A Tender Cost Intelligence silnik
- wgdom-cost-catalog.ts — 8 kategorii MVP, regiony wroclaw/dolnyslask
- wgdom-ath-classifier.ts — classifyAthLineCategory()
- wgdom-catalog-cost-engine.ts — computeFromCatalogRow(), aggregateCatalogDirectCost()
- test-tender-cost-intelligence.mjs

## 2.51.25 — P2-F.4 hotfix ATH Quick Access Logintrade
- downloadUrl w resolveAthPreviewItem + loadTenderBzpDocumentBytesResolved (ZIP → inner ATH)
- Pełny podgląd dossier + trace platform/downloadUrlResolved

## 2.51.24 — P2-F.5 Works Register Generator
- selectProjectsForTender + PDF/DOCX wykaz robót + rekomendacje w warunkach udziału

## 2.51.23 — P2-F.4 References + ATH Quick Access
- referenceFiles/protocolFiles upload + status referencji vs SWZ
- Karta ofertowa: Otwórz przedmiar / Pobierz PDF (reuse ATH viewer)

## 2.51.22 — P2-F.3 Company Experience Auto-Build
- company-experience-discovery z Robót/faktur/kosztorysów ATH + UI „Odkryte realizacje”
- referenceStatus unknown/available/missing + dedupe + zatwierdzenie → warunki udziału

## 2.51.21 — P2-F.2 Experience & References Qualification
- experienceProjects[] + parser SWZ doświadczenia/referencji + silnik MATCH/MISSING/UNKNOWN

## 2.51.20 — P2-F.1 Warunki udziału vs profil wykonawcy
- kw-company-profile + Profil wykonawcy w ustawieniach przetargów
- checkTenderParticipation: MATCH/MISSING/UNKNOWN, sekcja w karcie ofertowej

## 2.51.19 — P2-F.0 Formal Requirements Extraction
- Model FormalRequirement + detektory SWZ (personel/uprawnienia/członkostwo/doświadczenie)
- Filtr śmieci PDF, UI bullet „Wymagane:”, dopasowanie profilu, [FORMAL TRACE]

## 2.51.18 — P2-E.5 Cost Status UX + ATH Classification
- FOUND_WITH_VALUE / FOUND_NO_VALUE / NOT_FOUND — ATH bez cen ≠ „Kosztorys znaleziony”
- classifyCostDocument(), [COST STATUS TRACE], UI przedmiar vs wyceniony

## 2.51.17 — P2-E.4 ATH Value Recovery + TenderFit Refresh
- extractTotalValueFromAthPreview: netto summary + suma pozycji; estimatePln + tenderFit refresh po analizie

## 2.51.16 — Hotfix Analizuj SWZ
- Import `roleContributesMetadata` w `tender-document-resolver.ts` (ReferenceError prod 2.51.15)

## 2.51.15 — P2-E.3 Tender Data SSOT Cleanup
- `tender-data-ssot.ts`: resolvedTenderValuePln, resolvedCostStatus, resolvedAwardCriteria, [SSOT TRACE]
- Jednolity komunikat braku wartości we wszystkich panelach

> **Źródło prawdy:** tablica `CHANGELOG` w [`src/app/changelog-data.ts`](src/app/changelog-data.ts).  
> UI (zakładka **Zmiany**) czyta stamtąd `CHANGELOG[0].version`.  
> **Przy każdej nowej wersji:** dodaj wpis na górze w `changelog-data.ts` **oraz** zaktualizuj ten plik (ostatnie 5–10 wersji).

**Aktualna wersja UI:** **2.51.14** · **P2-E.2** Cost Snapshot Integration  
**★ SSOT handoff:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) · sesja: [`CURRENT-TASK.md`](../CURRENT-TASK.md)  
**★ Dashboard V2 handoff:** [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md)  
**Backup baseline:** tag `pre-next-feature-2.50.64` · [`docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md)

---

## 2.51.14 (2026-06-12) — P2-E.2 Cost Snapshot Integration

- **Fix:** ATH `summaryLines` → `totalValue`; merge wartości kosztorysu do `swzAnalysis`
- **Fix:** spójne UI — koniec „Kosztorys znaleziony” + „Brak pliku kosztorysowego”
- **New:** `[COST TRACE]` end-to-end (zip_found → ui_state)

## 2.51.13 (2026-06-12) — P2-E.1B ATH ZIP trace + SSOT danych

- **Fix:** Logintrade ZIP→inner ATH — faza kosztorysu przed metadanymi, trace E2E (`zip_opened`, `ath_parsed`, …), `downloadUrl` bez wymogu `platform`
- **Fix:** Wadium SSOT — `wadiumPln` kasowane gdy brak wiarygodnej wartości; UI Fit/checklist używa `formatSwzWadiumDisplay`
- **Fix:** Kryteria SSOT — `swzAnalysis.awardCriteria` w UI; fallback HTML przez `filterReliableAwardCriteria` (bez VAT/Cena 0%)
- **Improve:** ATH z `summaryLines` akceptowany jako kosztorys; trace `value_document_trace` per dokument

## 2.51.12 (2026-06-12) — P2-E.1 Universal Dossier Engine

- **New:** cost discovery ATH/NOR/XML/XLS/ZIP; confidence layer; metadata merge SWZ+STWIOR+OPZ
- **Fix:** downloadUrl propagation Logintrade ZIP → inner ATH
- **Test:** rozszerzony `scripts/test-tender-dossier-pipeline.mjs`

## 2.51.11 (2026-06-12) — P2-E.0 tender dossier pipeline

- **New:** `analyzeTenderWithDossier()` — SWZ + dossier w jednym kliknięciu
- **Fix:** merge `awardCriteria`, wartość z STWIOR, UX kosztorysu/7Z
- **Test:** `scripts/test-tender-dossier-pipeline.mjs`

## 2.51.10 (2026-06-12) — fix wadium extraction SWZ

- **Fix:** `parseWadiumFromSwzText()` — procent vs kwota PLN vs wartość zamówienia; UI/toast bez „Tak 6”
- **Test:** `scripts/test-wadium-extraction.mjs`

## 2.51.9 (2026-06-12) — fix Logintrade SWZ analysis

- `downloadUrl` dla platform zewn. w `analyzeTenderSwzEnhanced`
- Parser wadium — odróżnia % / tysiące od „Tak 6”
- Trace pipeline SWZ w konsoli

---

## 2.51.8 (2026-06-12) — P2-D.3 tenders attention panel

- Strategia → panel „Wymaga uwagi” (max 10) nad zmianami / Q&A
- `tenders-attention.ts` — agregacja bez nowych KPI

---

## 2.51.7 (2026-06-12) — P2-D.2 Q&A monitoring

- `tender-qa-monitor.ts` — NEW_QA, QA_UPDATED, QA_BATCH + AI summary z nazw plików
- Strategia → „Nowe pytania i odpowiedzi”
- Pulpit → „Nowe Q&A” + TenderQaAlert HIGH

---

## 2.51.6 (2026-06-12) — P2-D.1 tender change monitoring

- Snapshot + diff dokumentów i terminów (`tender-change-monitor.ts`)
- Strategia → sekcja „Zmiany w przetargach” + filtry
- Pulpit: Pilne zmiany + Action Center TenderChangeAlert
- Auto-rescan 3 przetargów po BZP merge

---

## 2.51.5 (2026-06-12) — P2-C.2 platform awareness dokumentów

- Komunikaty zamiast „Brak plików” — Logintrade, e-Zamówienia, platformazakupowa.pl, Open Nexus, unknown
- TenderDetailPanel: „Źródło dokumentów” + CTA postępowania PZ
- Telemetria `platformDetected` / `documentsFound` / `documentsMissingReason` (localStorage, bez PII)

---

## 2.51.4 (2026-06-12) — P2-A.3 off-platform document discovery

- **Logintrade adapter** — `getAttachmentUnlogged` z HTML postępowania (publiczne PDF bez konta)
- **Flow:** readmodels → mp-client → host detection → adapter → external discover fallback
- **Edge:** `discoverTenderDocuments`, `tenders-bzp-document-bytes?downloadUrl=`
- **Smoke:** `scripts/smoke-test-off-platform-document-discovery-p2a3.mjs`

---

## 2.51.3 (2026-06-12) — P2-A.2 mp-client document discovery

- **Improve:** gap-tolerant readmodels probe 1–50 (luki w numeracji `_9` → `_10` SWZ)
- **Improve:** `discoverMpClientDocuments` + auto external discover przy 0 plikach
- **Smoke:** `scripts/smoke-test-mp-client-document-discovery-p2a2.mjs`

---

## 2.51.1 (2026-06-12) — Przetargi 3.0 — ETAP 4 rename cleanup

- `src/app/tender-center/` → `src/app/tenders/strategy/`
- `tender-center-*` lib → `tenders-strategy-*`
- CommandCenterHero → TendersStrategyHero; ForecastCommandStrip → TendersStrategyForecastStrip
- ARCHITECTURE + handoff: Command Center removed in v2.51.0

---

## 2.51.0 (2026-06-12) — Przetargi 3.0 — CC runtime removal (ETAP 3)

- TendersProvider konsoliduje snapshot (bez CommandCenterProvider)
- Pulpit: TendersShortcutPanel zamiast CommandCenterExecutivePanel
- DELETE: TenderCenterProView, OwnerDashboard, CommandCenterContext, useCommandCenterExecutiveSnapshot

---

## 2.50.76 (2026-06-12) — Przetargi 3.0 — moduł z zakładkami

- TendersModule: Lista · Strategia · Mapa · Profil firmy · Ustawienia
- TendersProvider + TendersModule (ETAP 2 — tymczasowo nadal wrap CC; usunięte w 2.51.0)
- Strategia = ex-OwnerDashboard; Lista = TendersView listOnly

---

## 2.50.75 (2026-06-12) — Przetargi ETAP 1 — CC cleanup phase 1

- Usunięto Morning Briefing, AI Insights, Learning, Owner Profile, Explainability UI, onboarding, branding CC
- Decyzja GO/HOLD/NO-GO — bezpośredni zapis; alerty strategiczne → `tenders-strategy-alerts.ts`
- Zachowano: pipeline BZP, prognoza 90d, financial capacity, health, portfel decyzji, Tender→Job

---

## 2.50.74 (2026-06-11) — Dashboard V3 — operacje bez Hero

- Usunięto „Najważniejsze dziś” (Hero)
- Sekcje: Braki dokumentów + Pilne uwagi (kategorie)
- KPI: Braki dokumentów + Pilne uwagi zamiast Do ogarnięcia
- Recoverable w Pilnych uwagach (liczba pozycji, nie osobna karta)

---

## 2.50.73 (2026-06-11) — Hero — wyłącznie alerty operacyjne

- „Najważniejsze dziś” — tylko operacje (WM, roboty, dokumenty, płace, inspektor)
- Command Center — Action Center, prognoza, Owner Alerts bez zmian

---

## 2.50.72 (2026-06-11) — Hero — prognoza obciążenia tylko w Command Center

- „Najważniejsze dziś” — bez alertów prognozy obciążenia 30/60 dni (filtr Hero)
- Command Center — Action Center, Owner Alerts, prognoza firmy bez zmian

---

## 2.50.71 (2026-06-11) — Uwaga dziś — sort braków dokumentów

- „Uwaga dziś” → Braki dokumentów — najpierw roboty najbliższe kompletu (najmniej braków); stale ≥7 dni bez zmian na górze
- Hero DZIŚ — bez zmian (osobny ranker)

---

## 2.50.70 (2026-06-11) — Default Inspector Recipient (2.1.1)

- `EmailContact.isDefaultInspector` — jeden domyślny odbiorca inspektora w Kontaktach
- Modal „Kontakt z inspektorem” — auto-odbiorca, „Zmień odbiorcę”, hint wysyłki testowej
- Helpery: `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact`
- Smoke rozszerzony w `smoke-test-inspector-templates-2.1.mjs`

---

## 2.50.69 (2026-06-11) — Inspector Communication Templates (2.1.0)

- Roboty: „Kontakt z inspektorem” — szablony A–D, auto-sugestia, email przez Resend (`send-job-email` + `mode: inspector_template`)
- Kontakty: flaga `isInspector` — domyślny odbiorca
- Treść: sekcje „Po naszej stronie dostępne” / „Brakuje” (zlecenie, kosztorys)
- Historia: `email_sent` + nazwa szablonu

---

## 2.50.68 (2026-06-11) — Dashboard IA Cleanup (20.7E)

* **Improve:** „Najważniejsze dziś” — osobna sekcja Pulpicu (poza „Przetargi — skrót”)
* **Improve:** Neutralna karta + ton dnia jako badge; accordion compact bez zmian rankera
* **Improve:** „Uwaga dziś” — compact accordion, skrót „Braki dokumentów: N”
* **Improve:** Kolejność: KPI → Najważniejsze → Uwaga → Do odzyskania → Przetargi — skrót
* **Improve:** „Przetargi — skrót” — tylko CC liczniki + CTA
* **Improve:** KPI „Do ogarnięcia” — „priorytety i szczegóły poniżej”

## 2.50.67 (2026-06-11) — Hero Compression (20.7D.1)

* **Improve:** KPI first on dashboard — Hero no longer above KPI grid
* **Improve:** Hero DZIŚ compact accordion (collapsed by default, expand for TOP 5)
* **Improve:** Przetargi — skrót embeds Hero compact before Command Center CTA
* **Improve:** Non-tenders admins get standalone Hero compact fallback

## 2.50.66 (2026-06-10) — Dashboard V2 Complete (20.7C.2)

* **New:** Hero DZIŚ — TOP 5 priorytetów nad KPI (unified ranking)
* **New:** Hero dedupe engine vs Uwaga dziś
* **New:** E2E `dashboard-hero.spec.ts`
* **Improve:** Forecast / Action Center — prezentacja slotów zamiast %
* **Improve:** Konsolidacja priorytetów na Pulpicie
* **Improve:** Przetargi — skrót bez duplikatu listy akcji

## 2.50.65 (2026-06-10) — Mobile Jobs List Width Fix (20.5Z.5C)

* **Fix:** Admin → Roboty na urządzeniach mobilnych — lista robót pełna szerokość przy braku wybranej roboty
* **Fix:** Usunięto pustą kolumnę szczegółów rezerwującą ~65% viewportu na `<640px`
* **Fix:** Lepsza czytelność adresów robót na telefonach
* **Improve:** Desktop i tabletowy split 35/65 bez zmian

## Docs (2026-06-10) — Pre-Next-Feature Handoff + Backup

* **Docs:** `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`, `BACKUP-REPORT-2.50.64.md`, `AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md`
* **Docs:** zaktualizowano `CURRENT-TASK.md`, `PROJECT-HANDOFF.md`, `AGENTS.md`, `ARCHITECTURE.md`, `BACKUP-SCHEDULE.md`
* **Scripts:** `run-pre-feature-backup-2.50.64.mjs`, `run-storage-full-backup-2.50.64.mjs`, `send-pre-feature-backup-email-2.50.64.mjs`

## 2.50.64 (2026-06-10) — Dashboard Handover Alert (20.5Z.5B)

* **Improve:** Dashboard now surfaces Jobs 2.0 handover phase through a dedicated „Roboty do odbioru” operational alert in Uwaga dziś

## 2.50.63 (2026-06-10) — Admin Navigation Jobs Badge Alignment (20.5Z.5A)

* **Improve:** Roboty menu badge now counts Jobs 2.0 operational phases (W toku + Do odbioru) instead of legacy pending-photo indicator

## 2.50.58 (2026-06-09) — Files Hub Consolidation (20.5A.12)

* **New:** Files Hub — kontrakt + dokumentacja ekipy + załączniki + checklista w Robotach → Pliki
* **Improve:** Media → Pliki read-only z pełnym hubem; liczniki ujednolicone (bez photos/checklisty w count)
* **Improve:** Stub PDF dokumentacji (`worker-report-pdf.ts`) pod sprint 20.5A.12C

---

## 2.50.57 (2026-06-09) — Worker Mobile UX (20.5B.6A.4)

* **New:** Pasek postępu dokumentacji w trybie pracownika (Zdjęcia → Dokumentacja → Wymiary → Obrys)
* **Improve:** Baner edukacyjny, CTA następnego kroku, klikalne kroki → scrollIntoView
* **Improve:** Formularz worker mobile — większe touch targets (admin bez zmian)

---

## 2.50.56 (2026-06-09) — Version Awareness & Update Banner (20.5B.7)

* **New:** Wykrywanie nowej wersji — `/version.json` vs `APP_VERSION`, polling + focus
* **New:** Globalny banner „Odśwież teraz” — bez auto-reload
* **Improve:** HelpView FAQ; build generuje `version.json`

---

## 2.50.55 (2026-06-09) — Dokumentacja Robót Naming Refresh (20.5B.6A.1)

* **Improve:** Zakładka „Dokumentacja” zamiast „Raporty” — admin, pracownik, inspektor
* **Improve:** Hint obrys/wymiary vs plan PDF; help przy „Rysunek/Plan”
* **Improve:** Pulpit — „Nowa dokumentacja od ekipy”; HelpView FAQ

---

## 2.50.54 (2026-06-09) — Roboty UX Pack (20.5B.5)

* **Improve:** Roboty — domyślny filtr „W trakcie”; kolejność faz na liście
* **Improve:** Typ lokalu — etykieta Socjalny (key `komunalny` bez migracji)
* **New:** Pole opcjonalne „Piec gazowy” (Zostaje / Wymiana / Brak)
* **Improve:** FAQ — plan techniczny PDF = „Rysunek/Plan” (docs 20.5B.5D)

---

## 2.50.53 (2026-06-09) — Dashboard WM Cleanup (20.5B.4)

* **Improve:** Pulpit — usunięto osadzone Portfolio WM; KPI „Aktywne WM” + alerty WM pozostają
* **Improve:** Skróty WM kierują do Roboty zamiast scroll do portfolio na Pulpicie

---

## 2.50.52 (2026-06-09) — Generic File Attachments (20.5A.10) ★ RELEASED

* **New:** `jobAttachments[]` — załączniki ogólne (osobno od `jobFiles` kontraktowych)
* **New:** Roboty → Pliki — sekcja Załączniki ogólne (upload/delete admin, podgląd, ZIP)
* **New:** Email — grupy Dokumenty kontraktowe / Załączniki ogólne; activity (+ N załączników)
* **Improve:** sync tombstone merge (wzorzec 20.5B.3)
* **Handoff:** [`docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) · commit **`e6758e5`**

## 2.50.51 (2026-06-09) — File Consistency Hardening (20.5B.3)

* **Fix:** `deletedJobFileTombstones` — merge sync nie przywraca usuniętego pliku
* **Fix:** feed inspektora / Pulpit — ukrywanie orphan upload (R1–R4)
* **Improve:** replace pliku — tombstone + best-effort delete starego storage po uploadzie

---

## 2.50.50 (2026-06-09) — Hotfix usuwanie plików Roboty (P0)

* **Fix:** `JobsView` — import `resolveJobFileStoragePath`; usuwanie w katalogu i panelu email działa po confirm
* **Fix:** try/catch + toast.error przy błędzie storage / wyjątku

---

## 2.50.49 (2026-06-09) — Hotfix plan_techniczny icon (P0)

* **Fix:** `JobAllFilesView` — `CATEGORY_ICONS.plan_techniczny` (Ruler) + fallback `FileText` — crash React #130 po upload planu PDF w Roboty

---

## 2.50.48 (2026-06-09) — Inspektor admin simplification (20.5B.2)

* **Inspektor (admin)** — feed monitoringu; CTA „Otwórz w Robotach” z deep linkiem sekcji
* **Filtry** — Propozycje billing · Uwagi billing · KPI propozycji
* **Roboty → Pliki** — email plików inspektora (`send-job-files-email`)
* **Portfolio WM** — na Pulpicie; usunięto `InspectorAdminJobDetail`

---

## 2.50.47 (2026-06-09) — Plan techniczny PDF (20.5A.9)

* **Nowy typ pliku** — `jobFiles[].kind: "plan_techniczny"` (PDF); upload admin w Robotach → Pliki roboty
* **Checklist** — `documents.rysunek` auto ✅ ze szkicu/wymiarów raportu **lub** planu technicznego PDF
* **Separacja** — szkic terenowy (JPG w raporcie) ≠ plan biurowy (PDF w Plikach); inspektor: podgląd/pobranie bez uploadu
* **Smoke** — `smoke-test-technical-drawing-20.5a9.mjs` (21/21)

---

## 2.50.46 (2026-06-09) — Media Library UX (20.5A.8)

* **Separacja** — Pliki = tylko zlecenie/kosztorys; Zdjęcia = ekipa + inspektor + rysunki raportów
* **Core** — `media-separation.ts` → `collectJobImages()` / `collectJobDocuments()`
* **ZIP** — `Dokumenty ZIP` (jobFiles) · `Zdjęcia ZIP` (wszystkie obrazy)
* **UI** — liczniki tabów MediaView; smoke 18/18

---

## 2.50.45 (2026-06-09) — Role Visibility Hardening (20.5A.7)

* **Polityka UI** — admin/moderator: tylko `(Inspektor)`; inspektor: bez ról admin; super admin: pełny widok
* **Core** — `role-visibility.ts` → `visibleRoleLabelForViewer()`; filtr w `resolveAuthorContact()` + `AuthorAttribution`
* **Bypass** — SMS modal, Do rozliczenia (inline), topbar tooltip
* Smoke: `smoke-test-role-visibility-20.5a7.mjs` (34) + regresja 20.5A.6 (59)

---

## 2.50.44 (2026-06-09) — Billing Proposal (20.5A.6)

* **Inspektor** — Zgłoś pozycję (propozycja + dowody) gdy brak pozycji na robocie; tylko `kw-jobs`
* **Admin** — Zatwierdź (modal → RecoverableCharge) / Odrzuć z powodem; KPI rośnie dopiero po approve
* **Model** — `JobNote.context: billing_proposal`, `proposalStatus`, `createChargeDraftFromProposal()`
* Smoke: `smoke-test-inspector-billing-proposal-20.5a6.mjs` (48) + regresja 20.5A.2–5

---

## 2.50.43 (2026-06-09) — Polonizacja COMMAND CENTER (20.3B+ FULL)

* **CC** — Indeks kondycji, Wnioski AI, Wyjaśnienia scoringu, Lejek ofert, Historia decyzji
* **Decyzje UI** — Startuj / Analizuj / Odpuszczaj (enum bez zmian)
* **Marka** — COMMAND CENTER AI zachowana
* Smoke: `smoke-test-ui-language-20.3b-full.mjs`, `smoke-prod-bundle-2.50.43.mjs`

---

## 2.50.42 (2026-06-09) — Billing Evidence Pack (20.5A.5)

* **Inspektor** — uwaga billing + zdjęcia (do 3) + PDF (1) jako dowód
* **Admin** — podgląd załączników w wątku pozycji (JobFilePreviewModal)
* **Model** — `JobNoteAttachment` w `JobNote.attachments`; upload przez `storage-upload`
* Smoke: `smoke-test-inspector-billing-evidence-20.5a5.mjs`

---

## 2.50.41 (2026-06-09) — Roboty Active Today badge

* **Karta listy** — „Aktywni dziś: N” z `workEntries` na dziś zamiast „Ekipa: N”
* **KPI MID-B** — bez zmian (`executionAssigneeDirectoryIds`)
* Smoke: `smoke-test-jobs-active-today-2.50.41.mjs`

---

## 2.50.40 (2026-06-08) — Roboty UX Pack (desktop workspace)

* **Split 35/65** — lista `flex-[7]`, szczegóły `flex-[13]` na desktopie
* **Detail full width** — `md:max-w-none`; mobile `max-w-3xl` bez zmian
* **Toolbar md+** — KPI compact, grid Lista/Szukaj/Filtry; niższy pasek (~170–180px)
* **Detail compact** — header, nav, phase picker, filter bar (md+)
* Smoke: `smoke-test-jobs-ux-pack-2.50.40.mjs`

---

## 2.50.30 (2026-06-08) — Roboty status + toolbar desktop

* **Fix status** — `defaultJob()` / `awaiting_order` → „W trakcie”, nie „Do odbioru — braki”
* **Toolbar md+** — kompakt KPI, przyciski 32–36px; mobile 44px bez zmian
* **Detail width** — `md:max-w-4xl` w panelu szczegółów
* Smoke: `smoke-test-jobs-status-2.50.30.mjs`, `smoke-test-jobs-toolbar-2.50.30.mjs`

---

## 2.50.20 (2026-06-08) — Desktop Layout Fix

* **Admin laptop/desktop** — `overflow: hidden` na html/body; scroll tylko w widokach
* **min-w-0** — AdminViewRouter, Pulpit, Media (flex bez poziomego wypychania)
* Smoke: `smoke-test-desktop-layout-2.50.20.mjs` + `e2e/desktop-layout.spec.ts`

---

## 2.50.10 (2026-06-08) — Mobile Fix Pack

* **Toolbar mobile** — kompaktowe odstępy KPI (`max-md:`), więcej miejsca na listę robót
* **Touch 44px** — Lista/Kolejki, fazy, Filtry dodatkowe
* **Kolejki** — bez sticky nagłówków sekcji (czytelniejszy scroll)
* Smoke: `smoke-test-mobile-fix-pack-2.50.1.mjs`

---

## 2.50.00 (2026-06-08) — Roboty 2.0 MID-B

* **Lista / Kolejki** — widok operacyjny: WM po terminie, BZP wymaga startu, Bez ekipy, Do odbioru — braki, Gotowe do zdania, Dokumenty >7 dni
* **Filtr lidera** — Filtry ▼ → Lider realizacji (`executionLeadDirectoryId`)
* **Badge odbiorów** — „Do odbioru — braki” vs „Gotowe do zdania” (prezentacja; bez zmian sync/KV)
* Smoke: `smoke-test-jobs-2.0-midb.mjs`

---

## 2.49.90 (2026-06-08) — Polonizacja UI (Sprint 20.3B MIN)

* **Pulpit / CC executive** — Centrum działań, Indeks kondycji, priorytety PL, Okazja/Strategiczny
* **Przetargi** — przyciski Startuj / Analizuj / Odpuszczaj (`DECISION_LABEL_PL`)
* **Inspektor** — Portfolio WM; billing — Administrator zamiast Admin
* Smoke: `smoke-test-ui-language-20.3b.mjs`

---

## 2.49.80 (2026-06-08) — Uwagi inspektora do pozycji billing (Sprint 20.5A.4)

* **Inspektor** — „Zgłoś uwagę” przy pozycji Do rozliczenia (read-only kwot, zapis tylko kw-jobs)
* **Admin** — wątek inspektor ↔ admin na robocie i w module; Pulpit — prefiks „Do rozliczenia”
* **WM** — notatki WM bez mieszania z uwagami billing
* Smoke: `smoke-test-inspector-billing-notes-20.5a4.mjs`

---

**Poprzednia:** **2.49.70** · Sprint 20.5A.3A Inspector Billing Review

**Performance 2.x (seria CLOSED):** tagi `v2.45.37-perf-2.3c`, `v2.45.38-perf-2.4a` · baza Performance `35614f0`

---

## 2.49.70 (2026-06-08) — Inspektor × Do rozliczenia read-only (Sprint 20.5A.3A)

* **Inspektor** — sekcja WM: kwoty, KPI, historia settlementów (read-only)
* **Badge 💰** na liście robót inspektora przy nierozliczonych pozycjach
* **Sync** — `kw-recoverable-charges` read-only w `InspectorPanel` (bez push billing)
* Smoke: `smoke-test-inspector-billing-20.5a3a.mjs`

---

## 2.49.60 (2026-06-08) — Closed week przy zablokowanym rolloverze (Sprint 20.1D)

* **`isPayrollWeekClosedForUi`** — tydzień w tyle kalendarza + blockers → nadal operacyjny
* PayrollView / defer ⏭ / snapshot refresh / leave overlay — nowa semantyka
* Smoke: `smoke-test-payroll-week-closed-20.1d.mjs` (T1–T6)

## 2.49.50 (2026-06-08) — Roboty admin photo upload fix

* **JobsView** — import `prepareWatermarkedPhoto` (regresja od v2.45.17 lazy-load)
* catch + toast przy błędzie uploadu
* Smoke: `smoke-test-jobs-admin-photo-upload.mjs`

## 2.49.40 (2026-06-07) — Pulpit alerty listy płac (Sprint 20.1C.2)

* **DashboardView** — alerty payroll używają `listPayrollRolloverBlockers` (kasa sobotnia), nie `!settled`
* PRZENIESIONO / biweekly accrual / urlop — brak fałszywych alarmów na pulpicie
* Smoke: `smoke-test-payroll-dashboard-20.1c2.mjs` (T1–T5)

## 2.49.30 (2026-06-07) — Sync rollover listy płac (Sprint 20.1C.1)

* **applyBootstrapPayrollMerge** — brak richness override gdy cloud week ≠ target week (fix F5 leak)
* **pushPayrollWeekAfterRollover** — atomowy push KV po rolloverze (`skipPayrollGuard`)
* **persistPayrollRoster** — `skipPayrollGuard` przy Odśwież skład / replace roster
* **Smoke** — `smoke-test-payroll-rollover-sync-20.1c1.mjs`, integracja STALE_KV

---

## 2.49.20 (2026-06-07) — Rollover listy płac — kasa sobotnia (Sprint 20.1C)

* **payroll-rollover.ts** — `calcEmployeeSaturdayCash`, `blocksPayrollRollover`, `hasPayrollRolloverBlockers`
* **Auto-rollover** — blokada tylko gdy `!settled && saturdayCash > 0` (nie każde Oczekuje)
* **Zwolnienia** — PRZENIESIONO, biweekly narastający, urlop, net ≤ 0
* **Bez zmian** — MODEL A carry, archiwum, `computePayrollCashSplit`, sync KV

---

## 2.49.10 (2026-06-07) — Tworzenie pozycji z roboty (Sprint 20.5A.2)

* **Modal** — ➕ Dodaj do rozliczenia na karcie roboty; zapis bez nawigacji do modułu
* **Preset** — `buildRecoverableChargeDraftFromJob()` — job, klient, adres (UI), inspektor (lider ekipy)
* **Deep link** — `pendingRecoverableChargeCreatePreset` → moduł z formularzem create (consumed once)
* **Bez zmian** — KV, sync, merge, dashboard KPI, settlement workflow

---

## 2.49.00 (2026-06-06) — Roboty ↔ Do rozliczenia (Sprint 20.5A.1)

* **Helpery** — `getRecoverableChargesForJob()`, `getRecoverableChargesRecoveredOnJob()`, `getRecoverableChargeJobStats()`
* **Lista robót** — badge 💰 (liczba nierozliczonych) + tooltip PLN do odzyskania
* **Przegląd roboty** — karta Do rozliczenia: KPI, pozycje źródłowe (max 5), rozliczenia na tej robocie (max 5)
* **Deep link** — klik pozycji → moduł Do rozliczenia z zaznaczeniem (`pendingRecoverableChargeId`)
* **Bez zmian** — model, KV, sync, merge, dashboard KPI, tworzenie pozycji z roboty

---

## 2.48.30 (2026-06-06) — Top listy + KPI czasowe (Sprint 20.4C.2C)

* **Helpery** — `computeRecoverableChargesTimeStats()` + `computeRecoverableChargesTopLists()` (TOP 5)
* **Moduł** — sekcja Statystyki odzyskiwania: miesiąc/rok/średni czas/zamknięte + 3 rankingi
* **Pulpit** — link „Zobacz analizę odzyskiwania” (bez nowych kafelków)
* **Legacy** — `legacy-migration-*` wykluczone z KPI czasu i rankingu odzyskanych
* **Bez zmian** — model, merge, Inspector, Payroll

---

## 2.48.20 (2026-06-06) — Alerty odzyskiwania (Sprint 20.4C.2B)

* **Helper** — `computeRecoverableChargesAlerts()` — typy kwota / wiek / częściowe / aktywność; `attentionCount` +1 (nie +N)
* **Pulpit** — sekcja Wymaga uwagi (max 3); próg alarmu wieku **> 90 dni** (zamiast 30)
* **Moduł** — pełna lista alertów z filtrami; klik → szczegóły pozycji
* **attentionCount** — Pulpit +1 gdy jakikolwiek alert billing
* **Bez zmian** — model, merge, top listy (20.4C.2C)

---

## 2.48.10 (2026-06-06) — Aging odzyskiwania (Sprint 20.4C.2A)

* **Helper** — `computeRecoverableChargesReportingStats()` — jedno przejście, kubełki 0–30 / 31–60 / 61–90 / 90+ dni (open + partial)
* **Pulpit** — skrót aging na karcie Do odzyskania (sumy PLN)
* **Moduł** — sekcja Analiza odzyskiwania (liczba pozycji + PLN per kubełek)
* **Smoke** — suma aging = Do odzyskania; settled wykluczone
* **Bez zmian** — model, merge, cloud-sync, Payroll, Leaves, Inspector, alerty, top listy (20.4C.2B/2C)

---

## 2.48.00 (2026-06-06) — Dashboard Do odzyskania (Sprint 20.4C.1)

* **Pulpit** — karta Do odzyskania: 4 KPI, najstarsza pozycja, klik → moduł
* **Stany** — pusty (brak pozycji) i alarmowy (≥ 2 000 PLN lub > 30 dni)
* **Bez** — aging, top list, eksport, Command Center, zmian modelu

---

## 2.47.10 (2026-06-06) — Settlement Workflow UI (Sprint 20.4B)

* **Workflow** — przycisk Rozlicz, modal (kwota, robota docelowa, typ, notatka, onBehalfOf)
* **Status** — wyłącznie wyliczany z ledgeru; usunięty ręczny dropdown
* **KPI** — Do rozliczenia / Rozliczone częściowo / Odzyskano (PLN)
* **Historia** — sekcja rozliczeń w panelu szczegółów; badge open+partial
* **Bez zmian** — merge, cloud-sync, Payroll, Leaves, Inspector

---

## 2.47.00 (2026-06-06) — Settlement Foundation (Sprint 20.4A)

* **Model** — `RecoverableChargeSettlement`, `settlements[]`, `amountSettled`, `amountRemaining` w `recoverable-charges.ts`
* **Domain** — `sumSettlements`, `deriveChargeAmounts`, `applySettlement`, `validateSettlementDraft`
* **Merge** — union settlements po `id`; po merge obowiązkowy `deriveChargeAmounts`
* **Legacy** — migracja przy normalize: settled → wpis syntetyczny; partial bez ledgeru → open
* **Bez UI** — przycisk Rozlicz, historia, KPI i integracje Jobs/Inspektor w Sprint 20.4B

---

## 2.46.01 (2026-06-06) — UI Language Policy MIN (Sprint 20.3B)

* **Do rozliczenia** — statusy PL, mini-KPI „Do rozliczenia”, usunięty tekst developerski z panelu szczegółów
* **Inspektor** — Centrum działań, filtr Od administratora
* **Menu** — Zdjęcia i pliki (zamiast Media)
* **Lista płac** — placeholder `odbiorca@firma.pl`

---

## 2.46.00 (2026-06-06) — Do rozliczenia foundation (Sprint 20.3A)

* **Nowość** — moduł **Do rozliczenia** (`RecoverableCharge`, KV `kw-recoverable-charges`)
* **CRUD** — pozycja z roboty lub standalone; status 🔴🟡🟢; panel szczegółów (read-only)
* **Menu** — **Media** = Zdjęcia + Pliki robot
* **Sync** — `kw-recoverable-charges-deleted-ids`, deferred bootstrap, backup JSON

---

## 2.45.41 (2026-06-06) — Carry totals sidebar (Sprint 20.1B.1)

* **Fix** — Sidebar / topbar / Pulpit: suma sobotnia wyklucza ⏭ PRZENIESIONO (spójnie z tabelą i PDF)
* **Helper** — `computePayrollCashSplitWithCarry()` w `payroll-carry-forward.ts`

---

## 2.45.40 (2026-06-06) — Panel inspektora UX (Sprint 20.2A)

* **Pulpit** — KPI, „Dzisiaj”, Action Center (max 3)
* **Postęp kontroli** 0–100% — `computeInspectionProgress()` bez nowych KV
* **Karty robót** — brakujące do odbioru, ostatnia aktywność, 🔴🟠🟢
* **Checklist** w grupach + licznik dokumentów
* **FAB 📷** — szybkie zdjęcie z aparatu
* **Fix 20.2A.1** — postęp % bez double-count zlecenie/kosztorys (documents 50% + etap 25%)

---

## 2.45.39 (2026-06-06) — Carry workflow fix (Sprint 20.1B) — **Released** · `74e65d9`

* **saved ≠ closed** — „Zapisz tydzień” to backup; defer ⏭ możliwy do rolloveru payroll
* **Live payroll** na aktywnym tygodniu (zapisanym) — lista, PDF/DOCX z bieżącego stanu
* **Snapshot freeze** tylko dla tygodnia **historycznego** (`isPayrollWeekClosed`)
* **`refreshSavedActiveWeekSnapshot`** — archiwum odświeżane po defer, settled, edycji
* **`canDeferPayroll`** — blokada `closed_week` (nie `archived_week`)
* **`isPayrollWeekClosed()`** — `weekFrom/weekTo ≠ getPayrollWeekRange()`
* Regresja 20.0A urlopy + 20.1A carry — PASS

---

## 2.45.38 (2026-06-06) — Odroczenie wypłaty (Sprint 20.1A) — **Released** · `f24fafe`

* **Deferred Payroll Payment** — ⏭ „Przenieś na następny tydzień” (tygodniówka, jednorazowo)
* **Frozen Amount Model (MODEL A)** — kwota zamrożona w momencie kliknięcia; bez przeliczenia po zmianie godzin/stawki
* **Archive Freeze** — `carryForwardOut` / `carryForwardIn` w `EmployeeSnapshot`; historyczne PDF/DOCX niezmienne
* **PDF/DOCX support** — PRZENIESIONO (W1); suma z adnotacją przen. (W2)
* Pole `payrollCarryForward` na `WeekEmployee` (`kw-week-employees`) — bez nowego klucza KV / Edge deploy
* Biweekly — **zablokowane** w V1; urlop blokuje przeniesienie
* Sync: `pickPayrollCarryForward` w `mergeWeekEmployeeRecord`

---

## 2.45.37 (2026-06-06) — Nieobecności pracowników (Sprint 20.0A) — **Released** · `778f616`

* KV `kw-employee-leaves` + tombstone `kw-employee-leaves-deleted-ids` — urlop / chorobowe / bezpłatny (tygodnie Pn–So)
* Lista płac + PDF/DOCX — status zamiast kwoty; overlay live; archiwum zamrożone (`leaveStatus` w snapshot)
* Biweekly — cash split zerowany w tygodniu urlopu
* Walidacja overlap + blokada tygodni w archiwum (frontend + Edge batch-set)

---

## Performance 2.4A (2026-06-06) — **CLOSED** · tag `v2.45.38-perf-2.4a`

* (`35614f0`) Usunięto chunk `shared-inspector` z `manualChunks` + martwe importy `App.tsx`
* Startup JS: **1119 KB** (4 requesty); brak `shared-inspector` i `pdfjs` w preload
* **Bez bumpu UI** — wpis tylko w tym pliku (dla programistów)

---

## Performance 2.3C (2026-06-06) — **CLOSED** · tag `v2.45.37-perf-2.3c`

* (`c922b44`) Lazy load parsera dokumentów przetargowych (`tenders-bzp-doc-parse`)
* Parser stack (pdfjs, xlsx, doc-parse) poza cold startem; startup JS **1244 KB**
* Synthetic runtime verification PASS
* **Bez bumpu UI** — wpis tylko w tym pliku (dla programistów)

---

## 2.45.36 (2026-06-05) — Performance 2.2C **CLOSED**

* Usunięto reguły `manualChunks` dla `panel-jobs|payroll|tenders|inspector*` — prawdziwe lazy ładowanie zakładek admina
* Startup: brak fetch 5 paneli przed kliknięciem (lazy `JobsView`, `PayrollView`, `TenderCenterProView`, `InspectorPanel`, `InspectorAdminView`)
* Tag release: `v2.45.36-perf-2.2c`

---

## 2.45.35 (2026-06-05) — Performance 2.1A + 2.1B + 2.1C **CLOSED**

* **2.1A** (`deb5d37`) — dedup snapshot CC: `scoreAllActionableTenderOpportunities`, współdzielone `marketKpi`, reuse forecast `none`
* **2.1B** (`b27bc18`) — `CommandCenterProvider` tylko dla Pulpitu i Przetargów (`AdminViewRouter`)
* **2.1C** — `tenders-pipeline-session-cache.ts`: module-scope cache TTL 60 s; cache hit w `useTendersPipeline`; patch przy zapisie pipeline/keywords
* **2.1C+** — hotfix `wgdom-deferred-bootstrap`: hydrate z localStorage zamiast invalidate (Pulpit → Roboty → Pulpit <60 s)
* Tag release: `v2.45.35-perf-2.1`
* Smoke prod: Pulpit ↔ Przetargi i Pulpit → Roboty → Pulpit — 0 dodatkowego pipeline/autoAward przy cache hit

---

## 2.45.34 (2026-06-04) — Performance 1.1C + 1.2A + 1.3A+

- Usunięcie legacy `tenderDashStats` (`App.tsx`, `DashboardView`, `AdminViewRouter`)
- `useTendersPipeline` — award/BZP w tle; szybszy placeholder COMMAND CENTER AI
- `CloudLoader` + `cloud-sync` — CORE/DEFERRED bootstrap; event `wgdom-deferred-bootstrap`
- `CommandCenterContext` — odświeżenie profilu firmy po deferred bootstrap
- Tag release: `v2.45.34-perf-1.3a`

---

## 2.45.33 (2026-06-04) — Roboty 2.1A (UX listy)

- `JobListPanelHeader.tsx` — KPI poziomy, Filtry ▼, kolejność CTA → KPI → szukaj → fazy
- `JobListCard.tsx` — uproszczona karta (klient • termin, stała kolejność badge)
- Logika 2.0 (`job-list-ops.ts`) — bez zmian

---

## 2.45.32 (2026-06-04) — Roboty 2.0 MIN

- `src/lib/job-list-ops.ts` — KPI, chipy, sort pilności
- `JobsView` — pasek KPI + chipy; `JobListCard` — BZP, Ekipa: 0/N, termin
- Test: `scripts/test-job-list-ops-2.0-min.mjs`

---

## Dokumentacja (2026-06-04) — handoff deweloperski (bez bump UI)

- [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md) — indeks sesji, commity, zakazy
- [`docs/jobs-2.0-product-audit.md`](docs/jobs-2.0-product-audit.md) — audyt Roboty 2.0
- [`docs/dead-code-audit-2026-06.md`](docs/dead-code-audit-2026-06.md) — martwy kod
- [`docs/permissions-roles-audit-2026-06.md`](docs/permissions-roles-audit-2026-06.md) — uprawnienia Przetargów PASS
- Zaktualizowano: `CURRENT-TASK.md`, `AGENTS.md`, `ARCHITECTURE.md`, `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 2.45.31 (2026-06-03) — FAZA 9.0.1: status + termin kontraktu (pracownik)

- `resolveWorkerContractStatusLabel`, `resolveWorkerContractDateLabel` — karty „Twoje kontrakty”

## 2.45.30 (2026-06-03) — FAZA 9.0: Twoje kontrakty (pracownik)

- `isWorkerOnExecutionTeam` + sekcje w `WorkerPhotoView` (plan ekipy → widoczność)
- Bez zmian grafiku, payroll, TC, Executive

## 2.45.29 (2026-06-03) — ETAP 8.5 FULL: planowa ekipa (B lite)

- Pola `executionLeadDirectoryId`, `executionAssigneeDirectoryIds` w `Job` (`kw-jobs`)
- Baner kontraktu: lider + multi-select, `assignExecutionTeam`, badge na liście
- Merge w `mergeJobsById`; bez payroll / grafiku / Edge

## 2.45.28 (2026-06-03) — ETAP 8.5 MIN: Start Execution

- **new** Baner przetargu w Robotach — „Rozpocznij realizację” (`startJobExecution` → `jobPhase` + `handoverStage` + `activityLog`)
- Bez nowych kluczy KV / pipeline

---

## 2.45.27 (2026-06-03) — ETAP 8.4: daty SWZ → Job

- **improve** `resolveJobDraftDatesFromTender` — fallback: `implementationDeadlineRaw`, potem `contractPeriod` (jednoznaczne wzorce)
- **fix** Bez nadpisywania dat z umowy (8.1); `plannedHandoverDate` nadal z `endDate` (8.2)
- **fix (Edge, bez bump UI)** PAYROLL SYNC FIX A — `settled` / `settledUpdatedAt` osobno od `dataWinner` w `mergeWeekEmployeeRecordByTimestamps`; union zawsze przez merge rekordu

---

## 2.45.26 (2026-06-03) — ETAP 8.3: Executive Win CTA + KPI

- **new** Pulpit — KPI „Wygrane bez roboty”, `TenderJobLinkButtons` na karcie okazji i w Action Center (won-realization)
- **improve** Ten sam flow Utwórz / Otwórz robotę co w COMMAND CENTER (bez nowych komponentów)

---

## 2.45.25 (2026-06-03) — ETAP 8.2: realizacja kontraktu po Create Job

- **improve** `plannedHandoverDate` z terminem realizacji; sync dokumentów po plikach z przetargu
- **improve** Baner kontraktu w Robotach (kwota, daty, BZP)

---

## 2.45.24 (2026-06-03) — ETAP 8.1: mapowanie roboty z wygranego

- **improve** `awardValuePln` → `invoiceAmount` (priorytet nad SWZ i naszym szacunkiem)
- **improve** `contractDate` → `startDate`, `implementationDays` → `endDate` (gdy oba źródła dostępne)

---

## 2.45.23 (2026-06-03) — ETAP 8.0A: jeden pipeline Classic × CC

- **fix** Jedna instancja `useTendersPipeline` — linkedJobId widoczny w CC i Classic bez F5
- **improve** R1: lekki reload z storage przy wejściu w Classic (bez BZP merge)

---

## 2.45.22 (2026-06-03) — ETAP 8.0: roboty z COMMAND CENTER

- **new** CC — „Utwórz robotę” / „Otwórz robotę” przy statusie wygrany (okazja, briefing, Action Center)
- **improve** `executeCreateJobFromTender` — wspólny handler Classic + CC

---

## 2.45.21 (2026-06-03) — COMMAND CENTER UX (ETAP 7G.1)

- **improve** „Co wymaga uwagi” — max 5, skrót, Pokaż wszystkie, Szczegóły
- **improve** Kolejność sekcji CC; kompaktowy briefing i Hero
- **fix** Zdolność finansowa w OwnerDashboard (`financialCapacityEnabled: true`)

---

## Docs — ETAP 7G executive dashboard (2026-06-03)

- **new** [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) — mapa plików, hook, legacy stats, ryzyka deploy
- **improve** `ARCHITECTURE.md` § 6.1, § 12.1.3 · `AGENTS.md` START HERE · `CURRENT-TASK.md` · `wgdom-stan-projektu.mdc`
- **Kod prod:** `7d49be2` — `feat(dashboard): integrate command center executive summary`

---

## Stabilność sync (main, bez bump UI — 2026-06-02)

Wdrożone commity infra (prod @ `92d574e`):

| Commit | Temat |
|--------|--------|
| `db1d05a` | Payroll Guard — `wouldBlockPayrollShrink` |
| `c9db032` | P11 — `applyBootstrapPayrollMerge` w CloudLoader |
| `92d574e` | P15 — fix merge `kw-admin-passwords` |

Szczegóły, procedury KV, UI media na gałęzi audit → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

---

## 2.45.15 (2026-05-25) — Optymalizacja Web + Mobile

- **improve** Lazy load: Przetargi, Inspektor admin, Pliki robot — szybszy start
- **improve** Główny JS −25% gzip, osobne chunki pdfjs/przetargi, preconnect Supabase
- **improve** docs/OPTIMIZATION.md

## 2.45.14 (2026-05-25) — Lista płac: niedziela 20:00

- **improve** Nd od 20:00 — auto-archiwum + nowy tydzień (gdy wszyscy rozliczeni)
- **fix** Alerty gdy tydzień zostaje w tyle po przejściu

## 2.45.13 (2026-05-25) — Docs: START HERE

- **new** `PROJECT-GUIDE.md`, `CHANGELOG.md`, `CURRENT-TASK.md` — struktura dla programistów
- **improve** AGENTS.md START HERE, Known Issues, reguły projektu, ARCHITECTURE v2.45.12

## 2.45.12 (2026-05-25) — Przetargi: mapa OSM i słownik

- **fix** Mapa przetargów Wrocław — kafelki OpenStreetMap zamiast pustego SVG
- **improve** Słownik słów kluczowych — podgląd wbudowanych haseł, licznik wbudowanych/własnych

## 2.45.11 (2026-05-25) — Docs dla programistów

- ARCHITECTURE.md § 12.1.1–12.1.2, AGENTS.md, ROZWOJ.md, wgdom-stan-projektu

## 2.45.10 (2026-05-25) — Galeria admin ZIP

- Pobieranie ZIP całej roboty / kategorii (przed / w trakcie / po)

## 2.45.9 (2026-05-25) — Mapa przetargów (SVG — zastąpione w 2.45.12)

- Tymczasowa mapa SVG po awarii staticmap OSM

## 2.45.8 (2026-05-25) — Przetargi: akcje i alerty

- Chipy „wymaga działania”, auto-wynik BZP, alerty pulpitu, .ics, porównanie cen

## 2.45.7 (2026-05-25) — Przetargi: SWZ, wadium, wyniki

- Analiza SWZ pdf.js, wadium + blokada, wyniki BZP, pakiet PDF, historia szacunku

## 2.45.0–2.45.6 — Zarządzanie sekcją przetargów

- Karta ofertowa, profil firmy v6, BIP discover, kalkulator oferty — szczegóły w App.tsx

---

Pełna historia (setki wpisów) → **`CHANGELOG` w `App.tsx`**.
