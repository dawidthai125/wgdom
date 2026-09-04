# W&G DOM — przewodnik ciągłości sesji deweloperskiej

> **★★ AI START:** [`AI/WGDOM-COLD-START-HANDOFF.md`](AI/WGDOM-COLD-START-HANDOFF.md) → [`AI/MASTER-AI-HANDOFF.md`](AI/MASTER-AI-HANDOFF.md) → [`AI/AI_ENTRY.md`](AI/AI_ENTRY.md) · Gate [`AI/PAYROLL_SAFETY_GATE.md`](AI/PAYROLL_SAFETY_GATE.md)
> **★★ PAYROLL = CRITICAL PROTECTED MODULE:** [`AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md`](AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md) — GO6.1 / GO8.1 / GO9.2 **FROZEN** · GO10 **NO-FIX** · **NOWY FEATURE ≠** Payroll sync refactor
> **★★ Tip produkcji (SSOT):** [`AI/09_PRODUCTION_BASELINE.md`](AI/09_PRODUCTION_BASELINE.md) — CURRENT **2.66.147 / `2f3d1847`** · **OD-OCR-47 PASS** · live `version.json` · **nie** traktuj numerów w bannerach poniżej jako tip (historyczne closeouty).
> **★★ IK Master SSOT:** [`architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) — **CURRENT NODE = ŚRODA A0.2** · frontend PV **VERIFIED** · **CHROBREGO CLOSED** · **GLOBAL IK PV = NO**
> **★★ Session handoff:** [`architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md`](architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md) — Wrocław targets · Połczyn NOT TARGET · NEXT AUDIT ONLY
> **★★ TM-01 MASTER:** [`architecture/TENDER-MODERNIZATION-01-MASTER.md`](architecture/TENDER-MODERNIZATION-01-MASTER.md) · DF [`architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md)
> **★★ Foundation Lib Phase 0:** **COMPLETE** (`bed8dd8`) · [`architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) · **FND-06 BLOCKED** · App **nie** używa jeszcze lib.
> **Cel:** living log *co zrobiliśmy / co robimy / gdzie SSOT* — **po** Entry + Gate, nie zamiast nich.

## EPIC A0.2 — ŚRODA Work Catalog Coverage (CURRENT CASE)

| | |
|--|--|
| **Status** | **code+KV LIVE** · **frontend PV VERIFIED (OD-OCR-37)** |
| **Tender** | `08deff6c-bc34-619e-b346-0300010ce2e5` · Gmina Środa Śląska |
| **Commit** | **`590f95e9`** (A0.2 seed) · live tip **`2f3d1847` / 2.66.147** |
| **KV** | rev **56→57** · work **862→878** · **8/8** wrocław + **8/8** dolnyslask · idempotency **PASS** |
| **8 CatalogWork** | brodzik · syfon · podejście PVC · ustęp kompakt · silikon · okna · ościeżnice/kraty · parapety |
| **Hard** | `descriptionPl=""` · metadata FP **0** · **≠** mapper/F5/scoring/P1–P3 · **≠** AUTONOMY-08 close |
| **F5** | baseline **84** · delta **not** acceptance |
| **SSOT** | Master [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §10.0 · §10.0.2 · §22 |
| **CHROBREGO** | **CLOSED** 56/0 · **NIE reopen** |
| **Capability** | **OD-OCR-47 PASS** · **≠** nowy Decision Tree · **GLOBAL IK PV = NO** |
| **NEXT** | Owner GO · jedna gałąź Master §9 · **NIE** auto G1/G2/G3 na TPI |

## Payroll Protected Core — docs hardening (2026-08-30)

| | |
|--|--|
| **SSOT** | [`AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md`](AI/PAYROLL_CRITICAL_PROTECTED_MODULE.md) |
| **GO9.2** | Single-flight payroll CAS · tip **`96dd9324`** · PRODUCTION VERIFIED |
| **GO8.1** | Settlement intent · tip **`1f63e5c4`** · FROZEN |
| **GO10** | Unsettle + historical `payrollSettlement` · **ACCEPTED NO-FIX** |
| **Zakaz** | FEATURE bez Owner GO nie zmienia Payroll sync / CAS / FIFO / merge / settlement |

## C2 MOPS KNNR 1305 + Work Catalog P0/P0.1 — production closeout (2026-08-27)

**FINAL VERDICT:** `C2_PRODUCTION_CLOSEOUT_PASS`

| Pole | Wartość |
|------|---------|
| **UI / FE tip** | **2.66.116** · commit **`4c782b6`** (`4c782b677805a43752428636c83ad3e4852a04dd`) |
| **Edge tip** | **`4c782b67`** · funkcja `make-server-0afb8820` · GH deploy **#33043690802** SUCCESS |
| **SSOT techniczny C2** | [`architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md`](architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md) §29–§30 |
| **Promotion script (historyczny)** | `.tmp/c2-prod-kv-promotion-execute.mjs` · dry-run + `--execute` (sesja 2026-08-27) |
| **KV SSOT** | `kw-wgdom-work-catalog` · `kw-wgdom-work-catalog-meta` |

### Work Catalog P0 (`756e2cb9`)

- **Subject:** `fix(ik): harden work catalog cloud writes`
- CAS meta (`kw-wgdom-work-catalog-meta`) · global shrink guard · safe writer boundary · Edge enforcement
- **Deployed** Edge + frontend (pre-P0.1)

### Work Catalog P0.1 (`4c782b67`)

- **Subject:** `fix(ik): P0.1 per-region work catalog shrink guard` · parent `756e2cb9`
- Per-region authoritative shrink guard (Edge + client)
- **Runtime enforcement:** `C2_P0.1_RUNTIME_ENFORCEMENT_PASS` — controlled negative POST → **HTTP 409** `catalog_shrink_rejected` · **zero** KV mutation w teście

### Incident history (P0 Test 3 — dokumentacja)

| Faza | Stan |
|------|------|
| Niezamierzony write (stary P0 Edge) | `wroclaw` 41→40 · `dolnyslask` 41 · `cc-p0c-w1-stop-ptakow` usunięty tylko z `wroclaw` · `catalogRevision` 0→1 |
| Przed P0.1 deploy | Katalog wrócił do **41/41** · **rev 2** (drugi udany CAS write na P0 Edge — mechanizm ustalony; **exact actor/requestId: UNKNOWN**) |
| P0.1 fix | Per-region shrink guard — luka zamknięta |

**Nie** traktować hipotezy union/intent sync jako potwierdzonego faktu aktora.

### C2 controlled re-promotion (`C2_REPROMOTION_PASS`)

| | Before | After |
|---|--------|-------|
| Regional counts | **41/41** | **43/43** |
| `catalogRevision` | **2** | **5** (+3 CAS writes) |
| C2 workIds | ABSENT | **PRESENT** oba regiony |
| OUR RATE 60/20 | ABSENT | **PRESENT** OWNER · lookup CURRENT |

**Promoted workIds (additive only):**

- `knnr-wc-knnr-5-1305-01-prob` — unit `prob` · margin 0% · OUR RATE **60 PLN**
- `knnr-wc-knnr-5-1305-02-prob` — unit `prob` · margin 0% · OUR RATE **20 PLN**

**3 autoryzowane CAS catalog writes:** rev 2→3 (M3 CREATE 01) · 3→4 (M3 CREATE 02) · 4→5 (M5 OUR RATE). Brak shrink/409. `missingAuthoritativeIds = []`. `cc-p0c-w1-stop-ptakow` **PRESENT** w obu regionach. `mirrorParity = true`. Independent post-verify **PASS**.

### Final production KV state (read-only potwierdzone 2026-08-27)

| Pole | Wartość |
|------|---------|
| `wroclaw` / `dolnyslask` | **43** / **43** |
| `catalogRevision` | **5** |
| C2 1305 | **PRESENT** |
| OUR RATE 60/20 | **PRESENT** |
| `cc-p0c-w1-stop-ptakow` | **PRESENT** (obie regiony) |

### REMAINING / zakazy

- **C2 re-promotion = CLOSED** — **nie** wykonywać kolejnej promocji / recovery / `--execute` bez **nowego Owner GO**
- **Nie** powtarzać P0/P0.1 runtime enforcement testów bez osobnego briefu
- Ewentualne M9 rebind / live MOPS pipeline = **osobny gate**

> **★ Domknięcie (2026-08-27):** **C2_PRODUCTION_CLOSEOUT_PASS** · P0 **`756e2cb9`** · P0.1 **`4c782b67`** · runtime enforcement PASS · C2 re-promotion PASS · prod KV **43/43 rev5** · SSOT DF §30 · **NIE** auto recovery · **NIE** kolejny catalog write bez Owner GO.

## IK-KNR KL-6 + Phase 2D — cold-start (2026-08-25)

| Pole | Wartość |
|------|---------|
| **CURRENT PRODUCTION BASELINE** | **`85a1ad7`** (`85a1ad791c9dd82df89a78b09432cb2ef8a42cdf`) |
| **Production URL** | https://www.wgdom.fun |
| **UI version** | **2.66.115** (bez zmian) |
| **CURRENT SLICE** | **IK-KNR KL-6** — Owner VERIFY UI (`knrverify`) |
| **KL-6 STATUS** | **PRODUCTION_VERIFIED_CLOSED** |
| **KL-6 UI commit** | **`ce192b1e`** (`ce192b1e88bb1210675318f6fb6b8c7a2e8a40c7`) · `feat(knr): add KL-6 owner verify UI` |
| **KL-6 desktop sidebar hotfix** | **`85a1ad7`** (`85a1ad791c9dd82df89a78b09432cb2ef8a42cdf`) · `fix(admin): show Weryfikacja KNR in desktop sidebar (KL-6)` |
| **Phase 2D (FROZEN ANCESTOR)** | **`77385b0c`** (`77385b0c88a779e7e23c1b19047e6dc84d942fd7`) · controlled L3 PDF discovery pilot · **≠ aktualny deploy tip** |

**Zamknięty kontrakt Phase 2D (FROZEN — nie retroaktywnie modyfikować):**

- 1 L3 source: `l3_bip_malopolska_1646919`
- exact URL: `https://bip.malopolska.pl/api/files/1646919`
- exact BY_KEY: `KNR-W|4-01|0701-05` → `["l3_bip_malopolska_1646919"]`
- `BY_FAMILY={}` · `KNR_DISCOVERY_EDGE_ALLOWLIST=[]`
- learning-once: HTTP **1→0** · evidence `kw-knr-discovery-evidence`
- **DISCOVERED ≠ VERIFIED** · max **`PENDING_VERIFY`** · `authorityWrites.catalogVerified=false`
- **no** auto VERIFY · **no** auto mapping · **no** A1/P4/F5 · **no** OCR/crawler/harvest/broad discovery

**KL-6 production verified (read-only smoke):**

- Super Admin login **PASS** · desktop sidebar „Weryfikacja KNR” **PASS** · route `knrverify` **PASS**
- ACL **PASS** · `data-knr-verify-root` **PASS** · authority banner **PASS** · discovery HTTP **0** · KNR mutations **0**

**NEXT DECISION (Owner wybiera — agent NIE automatycznie po docs closeout):**

1. **KL-6 = CLOSED / PRODUCTION VERIFIED** — **nie** pending · **nie** lokalny WIP
2. **Phase 2D = FROZEN** @ `77385b0c` (ancestor only)
3. **Phase 2E = NOT STARTED**
4. **OPTION B** — controlled KL-6 approve/reject smoke (mutacja `kw-knr-catalog` + audit) → **osobny Owner GO** · **nie** wykonywać automatycznie
5. **OPTION A** — Phase 2E (+1 sourceId + exact HTTPS URL + BY_KEY) → **osobny Owner GO** + live verify/key · **bez** BY_FAMILY · **bez** Edge · **bez** authority change · **nie** wykonywać automatycznie

Każde rozszerzenie (2nd source, 2nd key, BY_FAMILY, Edge, corpus, WC mapping) wymaga **osobnego Owner GO** i audytu.

> **★ Domknięcie (2026-08-25):** **IK-KNR KL-6 CLOSED** · **PRODUCTION VERIFIED** · deploy tip **`85a1ad7`** / UI **2.66.115** · UI **`ce192b1e`** · sidebar hotfix **`85a1ad7`** · Phase 2D frozen ancestor **`77385b0c`** · SSOT [`AI/09_PRODUCTION_BASELINE.md`](AI/09_PRODUCTION_BASELINE.md) §1 · **NIE** rozszerzać Phase 2D bez Owner GO · **NIE** auto-start Phase 2E ani approve/reject smoke · lokalny WIP (~1794 entries) **zachowany** · **NIE** `git add -A`.

> **★ ZASADA COLD-START (LOCKED):** Nowy agent **nie** zaczyna implementacji na podstawie samego [`CURRENT-TASK.md`](../CURRENT-TASK.md).
> Najpierw czyta: [`WGDOM-COLD-START-HANDOFF`](AI/WGDOM-COLD-START-HANDOFF.md) · [`MASTER-AI-HANDOFF`](AI/MASTER-AI-HANDOFF.md) · [`MASTER_HANDOFF`](AI/MASTER_HANDOFF.md) · [`AI_QUICK_START`](AI/AI_QUICK_START.md) · [`TENDER-MODERNIZATION-01-MASTER`](architecture/TENDER-MODERNIZATION-01-MASTER.md) · aktualny **DESIGN-FREEZE** slice/epicu · dopiero potem Entry + Gate + Owner GO.

> **Prod tip:** patrz `docs/AI/09_PRODUCTION_BASELINE.md` · https://www.wgdom.fun · **STABILIZATION WINDOW ACTIVE**

> **★ Domknięcie (2026-08-19):** **PAYROLL-O1 CAS CLOSED** · **PRODUCTION VERIFIED** · FE O2 **2.66.103/`d2b71fb`** · Edge O1 **`b35fd8140bc82d1e13b48a143368bd19823b93c9`** · function `make-server-0afb8820` · GH deploy **#32243480746 SUCCESS** · O1-A…E **PASS** · legacy non-CAS write **409** · bootstrap/reload CAS observation **NOT BLOCKER** · SSOT [`PAYROLL-ARCHITECTURE-SSOT.md`](PAYROLL-ARCHITECTURE-SSOT.md) §5A · **NIE** powtarzać O1 · **NIE** ruszać lokalnego WIP.

> **★ Domknięcie sesji (2026-08-13):** **FULL SESSION CLOSE** · handoff [`architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md`](architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md) · RUNTIME **2.66.43 / `dec73351`** · docs tip on `main` · CLOSED: MULTI-DWELLING-01 · MULTI-BOQ-01 · INGEST-01 · NORMA-KALK P0 · OPEN: D02 LP22 · REAL SOURCE · F5 · PackageGate · Final Bid · **NEXT = Wrocław REAL TENDER AUDIT** (WM → ZZK → MOPS → uczelnie) · **Połczyn = NOT TARGET** · reference WM/TP/239/2026/G · ACTIVE EPIC = **NONE** · **NIE** auto IMPLEMENT.

> **★ Domknięcie sesji (2026-08-13):** **MULTI-BOQ-NORMA-KALK P0 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip UI **2.66.43** / **`dec7335`** · feature **`dec73351`** · deploy **`5892250601`** success · Norma PRO kalk fold · DF-16 table-code suffix ≠ qty · LP32 `quantity=""` · WM/TP/239/2026/G D01–D04 · 0 false kalk conflicts · D02 LP22 OUT OF P0 · merge/OfferBoq v5 UNCHANGED · F5/REAL SOURCE/PackageGate/Final Bid **NOT CLAIMED GREEN** · harness **42/0** · SSOT [`architecture/MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md`](architecture/MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md) · [`PV`](architecture/MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **INGEST-01 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`d1b2e7ca`** · tip supersedowany przez NORMA-KALK P0 · GH hist. **`5889699457`** · Owner/fixture pin → document registry → ZIP children → lossless retain → artifact `documentId` → Multi-BOQ pool → Owner dwelling map → Multi-Dwelling → Multi-BOQ → F5 → PackageGate → Bid · **UPSTREAM ONLY** · LS `kw-tender-ingest-v1` only · ZERO Cloud/DATA_KEYS · harness **17/0** · LOCAL Połczyn fixture **54/54** · FULL BIP **NOT VERIFIED** · live costing/F5/PackageGate/Bid **NOT RUN** · CI Gate B tenders/e2e-happy-path failure observed · Vercel success + SHA match → PV GREEN · SSOT [`architecture/INGEST-01-CLOSEOUT.md`](architecture/INGEST-01-CLOSEOUT.md) · [`PV`](architecture/INGEST-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **MULTI-BOQ-01 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`669d2872`** · tip supersedowany przez INGEST-01 · Owner map → dwelling resolve → compose → OfferBoq v5 + provenance → attach → F5_D → PackageGate → SUM → Bid · `legacy_single` KEEP · ZERO Cloud Sync · ZERO schema bump · harness **50/0** · MULTI-DWELLING **72/0** · OI **115/0** · GO-1 **62/0** · MODEL-1B **64/0** · Transport **75/0** · Equipment **36/0** · C-MODE **44+34** · COST-MULTI ALL PASS · B4 **13/0** · F0–F6 individual **NOT RUN** · Payroll battery **NOT RUN** · `PayrollView` **nie** w release · SSOT [`architecture/MULTI-BOQ-01-CLOSEOUT.md`](architecture/MULTI-BOQ-01-CLOSEOUT.md) · [`PV`](architecture/MULTI-BOQ-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **MULTI-DWELLING-01 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`0f1a52f4`** · tip supersedowany przez MULTI-BOQ-01 · GH hist. **`5885523509`** · Tender→Package→N Dwelling→PackageGate→aggregate Bid · Owner document mapping HARD · LS `kw-multi-dwelling-package-v1` · ZERO Cloud Sync · ZERO schema bump · harness **72/0** · SSOT [`architecture/MULTI-DWELLING-01-CLOSEOUT.md`](architecture/MULTI-DWELLING-01-CLOSEOUT.md) · [`PV`](architecture/MULTI-DWELLING-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **OWNER-INPUT-BID MODEL-1B CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`f9324eb6`** · tip deploy supersedowany przez MULTI-DWELLING-01 · explicit Bid Transport mark → Owner Input → F5 `transportPln` · Hub A1 mark/unmark · REUSE `kw-owner-rate-input-v1` · LS `kw-transport-bid-candidate-v1` · ZERO auto-identity · ZERO Cloud Sync OI · ZERO OfferBoq Transport · ZERO REAL SOURCE · Payroll B4 **13/13** · battery **16/16 scripts** · `PayrollView` **nie** w release · SSOT [`architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md`](architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md) · [`PV`](architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **OWNER-INPUT-BID GO-1 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`83d2ccb5`** · tip deploy supersedowany przez MODEL-1B · Equipment Owner Input E2E · Hub card · F5 `equipmentPln` · REUSE `kw-owner-rate-input-v1` · ZERO Cloud Sync OI · ZERO fallbacks · Payroll B4 **13/13** · battery **16/16 scripts** · `PayrollView` **nie** w release · SSOT [`architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md`](architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md) · [`PV`](architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-13):** **OWNER-INPUT-01 CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`3642de23`** · tip deploy supersedowany przez GO-1/MODEL-1B · `kw-owner-rate-input-v1` localStorage-only · ZERO Cloud Sync · Payroll B4 **13/13** · battery **16/16 scripts** · `PayrollView` **nie** w release · SSOT [`architecture/OWNER-INPUT-01-CLOSEOUT.md`](architecture/OWNER-INPUT-01-CLOSEOUT.md) · [`PV`](architecture/OWNER-INPUT-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-12):** **TRANSPORT-01 MODEL-1A CONTRACT-ONLY CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`a41854c3`** · tip deploy supersedowany · contract-only · MODEL-1B **CLOSED** (`f9324eb6`) wires shadow/F5 via explicit mark · Payroll **16/16 scripts** · `PayrollView` **nie** w release · SSOT [`architecture/TRANSPORT-01-CLOSEOUT.md`](architecture/TRANSPORT-01-CLOSEOUT.md) · [`PV`](architecture/TRANSPORT-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-12):** **EQUIPMENT-01 CONTRACT-ONLY CLOSED** · **PRODUCTION VERIFIED · GREEN** · tip hist. **`8e4f3943`** · tip deploy supersedowany przez GO-1 · Equipment `EQUIPMENT_GAP` · GO-1 wires Owner Input resolve · ZERO REAL SOURCE · Payroll **16/16 scripts** · SSOT [`architecture/EQUIPMENT-01-CLOSEOUT.md`](architecture/EQUIPMENT-01-CLOSEOUT.md) · [`PV`](architecture/EQUIPMENT-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-12):** **CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01 CLOSED** · **PRODUCTION VERIFIED · GREEN** · Edge **`914c0095`** · GH Actions **`31635032340`** · chunked mset 450KB/12 · drawings frequency separation · Payroll **16/16 GREEN** · `statement_timeout` UNCHANGED · residual fat-key `kw-tenders-pipeline` **ACCEPTED / FOLLOW-UP** · SSOT [`architecture/CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md`](architecture/CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md) · [`PV`](architecture/CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md) · ACTIVE EPIC = **NONE** · **NIE** auto-start fat-key / Payroll redesign.

> **★ Domknięcie sesji (2026-08-09):** **INTELIGENTNY-KOSZTORYSANT-UX CLOSED** · tip UI **2.66.22** / **`ae426ad6`** · branding + Expert Conversation presentation-only · Trace/EW/DW KEEP · no new flag/store/engine/PLN · Persist/Q12 KEEP · D default OFF · PV WM tender `08deec8a…` · harness 47 · SSOT [`architecture/INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT.md`](architecture/INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT.md) · [`PV`](architecture/INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY.md) · ACTIVE EPIC = **NONE** · NEXT **WAITING FOR NEXT OWNER GO** · **NIE** invent S10.

> **★ Domknięcie sesji (2026-08-08):** **DOCUMENTATION HANDOFF PACK** · cold-start [`AI/WGDOM-COLD-START-HANDOFF.md`](AI/WGDOM-COLD-START-HANDOFF.md) · TM-01 MASTER · EXPERT-AI · PRICING · LEGACY · DECISION architecture docs · tip **2.66.22** / **`ec8a5044`** · S0–S3 CLOSED · NEXT S4 · WIP `useTenderOfferRun.ts` preserved.

> **★ Domknięcie sesji (2026-08-08):** **TENDER-MODERNIZATION-01 / S3 CLOSED** · tip UI **2.66.22** / **`ec8a5044`** · Align Pricing · Offer primary @ Expert ON · NO PRIMARY @ Offer null · Bid legacy @ Expert OFF · TRE Bid fallback FIXED · parity 1/12/0 · no third PLN · S3-D/S8 OUT · harness 41 · SSOT [`architecture/TENDER-MODERNIZATION-01-S3-CLOSEOUT.md`](architecture/TENDER-MODERNIZATION-01-S3-CLOSEOUT.md) · [`PV`](architecture/TENDER-MODERNIZATION-01-S3-PRODUCTION-VERIFY.md) · ACTIVE EPIC = **NONE** · NEXT **TM-01 S4 Hub UX** tylko Owner GO · S0/S1/S2/S3 = CLOSED · EPIC TM-01 **nie** CLOSED (S4–S8 OPEN).

> **★ Domknięcie sesji (2026-08-08):** **TENDER-MODERNIZATION-01 / S2 CLOSED** · tip UI **2.66.22** / hist. **`1888d05f`** · tip deploy supersedowany przez TM-01 S3 · Dual Outcome · Expert-effective = `adminCanViewTendersTab` · DW PRIMARY · legacy HIDE/DEMOTE · **NO** Approve→GO · stores untouched · S5–S8 OUT · harness 45 · SSOT [`architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md`](architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md) · [`PV`](architecture/TENDER-MODERNIZATION-01-S2-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **TENDER-MODULE-ENABLEMENT-01 CLOSED** · tip UI **2.66.22** / hist. **`eed3ba0e`** · tip deploy supersedowany przez TM-01 S3 · AppSettings REUSE `tendersTabForStaffEnabled` · default OFF · ⚙ Moduły → Przetargi · Super Admin bypass · route guard · harness 29 · SSOT [`architecture/TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md`](architecture/TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) · [`PV`](architecture/TENDER-MODULE-ENABLEMENT-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **TENDER-MODERNIZATION-01 / S0 CLOSED** · tip UI **2.66.22** / hist. **`5beb082a`** · tip deploy supersedowany przez Module Enablement · orphan cleanup · S0b harness 5 · delete OwnerView / OverviewShortcuts / CC Context · 8 LOCK · SSOT [`architecture/TENDER-MODERNIZATION-01-S0-CLOSEOUT.md`](architecture/TENDER-MODERNIZATION-01-S0-CLOSEOUT.md) · [`PV`](architecture/TENDER-MODERNIZATION-01-S0-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **DECISION-PERSIST-01 CLOSED** · tip UI **2.66.22** / hist. **`adde246a`** · tip deploy supersedowany przez TM-01 S0 · append-only `kw-decision-persist-v1` · record/hydrate/list · Host wire · flag REUSE · baseline **Experts P0 + Chief + Wire Adapters RO + Session + UI Dossier + Validation Expert + Decision Workspace + Expert Workspace UI + Decision Persist complete** · SSOT [`architecture/DECISION-PERSIST-01-CLOSEOUT.md`](architecture/DECISION-PERSIST-01-CLOSEOUT.md) · [`PV`](architecture/DECISION-PERSIST-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **WIRE-EXPERTS-UI-01 CLOSED** · historyczny tip **`4ae26fe7`** · tip deploy supersedowany przez Decision Persist · Expert Workspace RO · Slot A pod Trace · Session flag only · VM passthrough `dossier.experts.*` · EE→ME→PE→Cost→Offer · SSOT [`architecture/WIRE-EXPERTS-UI-01-CLOSEOUT.md`](architecture/WIRE-EXPERTS-UI-01-CLOSEOUT.md) · [`PV`](architecture/WIRE-EXPERTS-UI-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **DECISION-WORKSPACE-01 CLOSED** · historyczny tip **`baa4b403`** · tip deploy supersedowany przez Decision Persist · Decision Workspace UI · VM-only · Validation cache ≤1× · Recommendation/Findings RO · Actions Approve/Reject/Needs Review/Return · Dual Outcome · flag `kw-decision-workspace` OFF · SSOT [`architecture/DECISION-WORKSPACE-01-CLOSEOUT.md`](architecture/DECISION-WORKSPACE-01-CLOSEOUT.md) · [`PV`](architecture/DECISION-WORKSPACE-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-08):** **VALIDATION-EXPERT-01 CLOSED** · feature **`5fa2746d`** · tip deploy supersedowany przez Expert Workspace UI · pure-lib QA dossier · Finding Hard/Soft · C1–C8 · Q1–Q6 · verdict · Trace · Soft limit 3 · SSOT [`architecture/VALIDATION-EXPERT-01-CLOSEOUT.md`](architecture/VALIDATION-EXPERT-01-CLOSEOUT.md) · [`PV`](architecture/VALIDATION-EXPERT-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-07):** **WIRE-CHIEF-UI-DOSSIER-01 CLOSED** · feature **`ce0b70c0`** · tip deploy supersedowany przez Expert Workspace UI · READ ONLY „Przebieg ekspertów” · sibling POD `#tender-intelligence-hub` · thin ViewModel · flag OFF ⇒ no DOM · SSOT [`architecture/WIRE-CHIEF-UI-DOSSIER-01-CLOSEOUT.md`](architecture/WIRE-CHIEF-UI-DOSSIER-01-CLOSEOUT.md) · [`PV`](architecture/WIRE-CHIEF-UI-DOSSIER-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-07):** **WIRE-CHIEF-SESSION-01 CLOSED** · feature **`5b9fd741`** · tip deploy supersedowany przez Expert Workspace UI · `chief-session` + `useChiefOrchestratorSession` · flag OFF · dossier in-memory · SSOT [`architecture/WIRE-CHIEF-SESSION-01-CLOSEOUT.md`](architecture/WIRE-CHIEF-SESSION-01-CLOSEOUT.md) · [`PV`](architecture/WIRE-CHIEF-SESSION-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-07):** **WIRE-CHIEF-RO-ADAPTERS-01 CLOSED** · feature **`0c310355`** · tip deploy supersedowany przez Expert Workspace UI · pure-lib `chief-wire-adapters` · OfferBoq/Catalog/CompanyCost/OfferStrategy RO · `assembleChiefWireRuntimeRo` · bez Chief.run · SSOT [`architecture/WIRE-CHIEF-RO-ADAPTERS-01-CLOSEOUT.md`](architecture/WIRE-CHIEF-RO-ADAPTERS-01-CLOSEOUT.md) · [`PV`](architecture/WIRE-CHIEF-RO-ADAPTERS-01-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-07):** **CHIEF-ORCHESTRATOR-P0 CLOSED** · feature **`06cc7a6b`** · tip deploy supersedowany przez Expert Workspace UI · Case→Task · gates · LOOP · dossier Decydent · REUSE Experts · SSOT [`architecture/CHIEF-ORCHESTRATOR-P0-CLOSEOUT.md`](architecture/CHIEF-ORCHESTRATOR-P0-CLOSEOUT.md) · [`PV`](architecture/CHIEF-ORCHESTRATOR-P0-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-07):** **EXPERTS-P0 CLOSED** · feature **`58872663`** · tip deploy supersedowany przez Expert Workspace UI · Execution→Materials→Pricing→Cost→Offer pure-lib · Trace · Decydent signal · SSOT [`architecture/EXPERTS-P0-CLOSEOUT.md`](architecture/EXPERTS-P0-CLOSEOUT.md) · [`PV`](architecture/EXPERTS-P0-PRODUCTION-VERIFY.md).

> **★ Domknięcie sesji (2026-08-06):** **NG-TENDERS-WORKSPACE-01 CLOSED** · tip UI **2.66.19** / **`182dd9af`** · Workspace Architecture v2 · Przegląd start · 4 tabs · AC-RETURN · Firma Hub · hide module nav · SSOT [`architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md`](architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) · Residual CI TEUX7E / Mobile Dokumentacja / Legacy Happy Path — **NOT PART OF THIS EPIC** · NEXT **WAITING FOR NEXT OWNER GO**.

> **★ Domknięcie sesji (2026-07-30):** **CENY-MATERIAŁÓW-04 P2 COMPLETE** · K-P2-1/2/3 PASS · residual ROZ **16≤18** · SSOT [`architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) · NEXT **P3 (INNE) AUDIT** (Owner GO · AUDIT→PLAN→DF) · **nie** auto-start P3.

> **★ Domknięcie sesji (2026-07-29):** **COST-MULTI SERIES CLOSED** · UI **2.65.74–2.65.76** · FINAL PV PASS (`08dee335` AGGREGATE Bid 1 061 000) · SSOT [`architecture/COST-MULTI-CLOSEOUT.md`](architecture/COST-MULTI-CLOSEOUT.md) · Continuity [`architecture/AI-CONTINUITY-UPDATE-01-REPORT.md`](architecture/AI-CONTINUITY-UPDATE-01-REPORT.md) · NEXT superseded by GAP-A close → [`architecture/NEXT-EPIC-CANDIDATES.md`](architecture/NEXT-EPIC-CANDIDATES.md) · **nie** wznawiać COST-MULTI bez AUDIT + Owner GO.

> **★ Domknięcie sesji (2026-07-28):** **Foundation Lib Phase 0** **COMPLETE** · FND-01…05 na `origin/main` · tip **`bed8dd8`** · docs SSOT [`architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) · **FND-06 Observability BLOCKED** (brak Impl Spec) · **nie** podłączaj domen bez EPIC.

> **★ Domknięcie sesji (2026-07-21):** **TEST-HARNESS-01 H5** **CLOSED** · **`3356349`** · UI **2.65.35** — Biblioteka / Work Catalog KV-only (`kw-wgdom-work-catalog`) · H0–H5 tooling **RELEASED** · otwarte działania H5 **BRAK** · **STABILIZATION WINDOW ACTIVE** · SSOT [`architecture/TEST-HARNESS-01-H5-CLOSEOUT.md`](architecture/TEST-HARNESS-01-H5-CLOSEOUT.md).

> **★ Domknięcie sesji (2026-07-20):** **TEST-HARNESS-01 H4** **CLOSED** · **`1addd97`** · UI **2.65.35** — Cloud KV-only prod sandbox · H0–H4 tooling **RELEASED** · SSOT [`architecture/TEST-HARNESS-01-H4-CLOSEOUT.md`](architecture/TEST-HARNESS-01-H4-CLOSEOUT.md).

> **★ Domknięcie sesji (2026-07-20):** **TEST-HARNESS-01 H4** **RELEASED** (POST RELEASE) · superseded by CLOSE — [`architecture/TEST-HARNESS-01-H4-POST-RELEASE.md`](architecture/TEST-HARNESS-01-H4-POST-RELEASE.md).

> **★ Domknięcie sesji (2026-07-20):** **PAYROLL-CLOUD-RESURRECTION-01** **CLOSED** · **`fce7b78`** · **2.65.35** — bootstrap freshness fence: stary LocalStorage innej sesji **nie** reseeds intentional empty Cloud KV · SSOT [`architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md) · fence `src/lib/payroll-bootstrap-resurrection-fence.ts` · test `scripts/test-payroll-cloud-resurrection-01.mjs`.

> **★ Domknięcie sesji (2026-07-20):** **PAYROLL-P0-WEEK-ROLLOVER-01** **CLOSED** · **`e38610a`** · **2.65.34** — `classifyPayrollWeekTransition` ALIGN vs real ROLLOVER (Nd ≥20:00) · SSOT [`architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md`](architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md).

> **★ Domknięcie sesji (2026-07-14):** **LOCALSTORAGE-ARCH-02 A–E** **CLOSED** · **`d896852`** · **2.65.28** — IDB cold (snapshots / jobs / pipeline lean / WM / audit rings) + `window.__WG_STORAGE__` · Owner observation **PASS** · **Etap F GO YES** · **NIE START** bez jawnego IMPLEMENT · SSOT [`architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md`](architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md).

> **★ Domknięcie sesji (2026-07-14):** **PAYROLL-P0-FIX-01** **CLOSED** · **`1c41b61`** · **2.65.27** — `QuotaExceededError` na LS **nie** otwiera bootstrap FAILED · payroll-first persist + in-memory handoff.

> **★ Domknięcie sesji (2026-07-13):** **PAYROLL-DISPLAY-UNLOCK** — forensic RCA (kod) wykluczył bootstrap/merge/anti-leak/leaves; gate tabeli LP = `resolvePayrollDisplayEmployees` (`displayEmployees`); **runtime proof** — w praktyce supersedowane / częściowo rozwiązane przez FIX-01 + ARCH-02 (Owner: Payroll FIX VERIFIED); TRACE-02 nadal w kodzie przy potrzebie diga.

> **★ Domknięcie sesji (2026-07-13):** **PAYROLL-BOOTSTRAP-RACE-FIX-01** **CLOSED** · **`47de89b`** · **2.65.18** — CloudLoader `bootstrapPhase` gate (CORE persist przed mount App).

> **★ Domknięcie sesji (2026-07-13):** **PAYROLL-ANTI-LEAK-FIX-01** **CLOSED** · **`26f3eb5`** · **2.65.14** · **JOBS-SYNC-FIX-01** **CLOSED** · **`309609e`** · **2.65.13**.

> **★ Domknięcie sesji (2026-07-13):** **JOBS-PHOTOS-P0** seria audytów **COMPLETE** · werdykty: stale closure możliwy w kodzie, **nie** potwierdzony runtime; `failedUrls` **wykluczone**; UI empty = `filterAvailablePhotos` · **LIVE INSTRUMENTATION WIP** (lokalnie, nie prod) · SSOT [`architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md`](architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md).

> **★ Domknięcie sesji (2026-07-13):** **JOBS-PHOTOS-DELETE-SYNC-01** **CLOSED** · **`d8f2d99`** · prod smoke **19/19 PASS** · `deletedPhotoTombstones[]` + `mergePhotos` tombstone filter · SSOT [`architecture/JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md`](architecture/JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md).

> **★ Owner CLOSEOUT (2026-07-12, JOBS-ASSETS-SYNC-01):** **2.65.9** @ **`f8a64d7`** · union `mergePhotos` · prod smoke **14/14** · SSOT [`architecture/JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](architecture/JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md).

> **★ Domknięcie sesji (2026-07-12):** **ROBOTS-INSPECTOR-01** **CLOSED** · feature `9307386` · docs sync `6bddea1` pushed · prod smoke **PASS** · **czekaj na Owner GO** (NG11-Q4 / TWSL).

> **★ Owner CLOSEOUT (2026-07-12, ROBOTS-INSPECTOR-01):** **2.65.5** @ **`9307386`** · prod smoke **PASS** · Protected Core **GREEN** · SSOT [`architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md`](architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md) · fix: `reconcileJobsWithFreshLocal` + SSOT `finalBundle` (apply/push/fingerprint).

> **★ Owner CLOSEOUT (2026-07-12, NG11-P0 EPIC COMPLETE):** **2.65.3** @ **`281ede1`** · slice'y P0 (`f4697f9`) + P0.1-A (`db927ea`) + P0.2 (`281ede1`) · prod smoke **PASS** · Protected Core **GREEN** · SSOT [`architecture/NG11-P0-EPIC-CLOSE-REPORT.md`](architecture/NG11-P0-EPIC-CLOSE-REPORT.md) · **następny:** STABILIZATION WINDOW — **NG11-Q4** lub **TWSL 2.63.91** — Owner GO.

> **★ POST RELEASE (NG11-P0):** **CLOSED** — superseded przez P0.1-A + P0.2 · historyczny SSOT [`architecture/NG11-P0-POST-RELEASE-OBSERVATION.md`](architecture/NG11-P0-POST-RELEASE-OBSERVATION.md).

> **★ Closeout sesji (2026-07-12, NG11-P0.2 PRODUCTION VERIFIED):** **2.65.3** · HTTP 414 fix (C-lite) · DevTools transport **PASS** · SSOT [`architecture/NG11-P0.2-DESIGN-FREEZE.md`](architecture/NG11-P0.2-DESIGN-FREEZE.md).

> **★ Closeout sesji (2026-07-11, NG11-A5 PRODUCTION VERIFIED):** **2.65.0** @ **`2606bfd`** · OWNER QA **PASS** · test smoke **99/99** · gate-exit **28/28** · SSOT [`architecture/NG11-A5-CLOSEOUT.md`](architecture/NG11-A5-CLOSEOUT.md) · **następny:** **NG11-Q4** (optional) lub epic E2 closeout — **Owner GO**.

> **★ Closeout sesji (2026-07-11, NG11-A5 AUDIT COMPLETE):** **AUDIT + PLAN + DF DRAFT** · SSOT [`architecture/NG11-A5-STRATEGIC-ECONOMIC-AUDIT-PLAN.md`](architecture/NG11-A5-STRATEGIC-ECONOMIC-AUDIT-PLAN.md) · **następny:** **ARCH REVIEW** + **Owner GO** (bez IMPLEMENT).

> **★ Final verify (2026-07-11, NG11-A3):** `version.json` **PASS** → **2.64.0** @ **`78c0a40`** · **PRODUCTION VERIFIED** · baseline zaktualizowany.

> **★ Closeout sesji (2026-07-11, NG11-A3 PRODUCTION VERIFIED):** **2.64.0** @ **`78c0a40`** · OWNER QA **PASS** · test smoke **95/95** · PG-A3 **PASS** · SSOT [`architecture/NG11-A3-CLOSEOUT.md`](architecture/NG11-A3-CLOSEOUT.md) · **następny:** **NG11-A5** — **AUDIT READY**.

> **★ Closeout sesji (2026-07-11, NG11-A3 IMPLEMENT COMPLETE):** **v2.64.0** · test **138/138** · PG-A3 **PASS** · SSOT [`architecture/NG11-A3-RELEASE-VERIFICATION.md`](architecture/NG11-A3-RELEASE-VERIFICATION.md).

> **★ Closeout sesji (2026-07-11, NG11-A3 AUDIT COMPLETE):** **AUDIT + PLAN + DF DRAFT** · SSOT [`architecture/NG11-A3-DISCOVERY-FORK-AUDIT-PLAN.md`](architecture/NG11-A3-DISCOVERY-FORK-AUDIT-PLAN.md).

> **★ Closeout sesji (2026-07-11, NG11-Q2 PRODUCTION VERIFIED):** **2.63.98** @ **`608c9ec`** · `version.json` **PASS** · test **76/76** · PG-Q2 **PASS** · SSOT [`architecture/NG11-Q2-CLOSEOUT.md`](architecture/NG11-Q2-CLOSEOUT.md) · **następny:** **NG11-A2** od **AUDIT** (bez IMPLEMENT).

> **★ Closeout sesji (2026-07-11, NG11-Q1 PRODUCTION VERIFIED):** **2.63.97** @ **`e003591`** · `version.json` **PASS** · test **80/80** · SSOT [`architecture/NG11-Q1-CLOSEOUT.md`](architecture/NG11-Q1-CLOSEOUT.md) · **następny:** **NG11-Q2** od **AUDIT** (bez IMPLEMENT).

> **★ Closeout sesji (2026-07-11, NG11-Q1 RELEASE):** **2.63.97** @ **`e003591`** · OWNER QA **PASS** · test **80/80** · PG-1 harness **PASS** · push **PASS** · SSOT [`architecture/NG11-Q1-CLOSEOUT.md`](architecture/NG11-Q1-CLOSEOUT.md).

> **★ Closeout sesji (2026-07-11, NG11-Q3 PRODUCTION VERIFIED):** **2.63.96** · OWNER QA **PASS** · test **91/91** · `version.json` **PASS** · SSOT [`architecture/NG11-Q3-CLOSEOUT.md`](architecture/NG11-Q3-CLOSEOUT.md).

> **★ Closeout sesji (2026-07-11, NG11 Wave 1):** **NG11-A1+Q5** release **2.63.95** @ **`4710d11`** · FAST RELEASE · build+test **81/81 PASS** · verify `version.json` **PASS** · SSOT [`architecture/NG11-WAVE1-CLOSEOUT.md`](architecture/NG11-WAVE1-CLOSEOUT.md) · **następny krok:** NG11-Q3 (Owner GO) lub release **TWSL** **2.63.91**.

> **★ Baseline prod (2026-07-11):** prod **2.63.95** @ **`4710d11`**. **Lokalny WIP (nie na prod):** **TENDER-WORKSPACE-LAYOUT** **2.63.91** — osobny bundle, **RELEASE NOT READY** (untracked / brak commit+push).

> **★ Closeout sesji (2026-07-11, TWSL):** **TENDER-WORKSPACE-LAYOUT** — ARCH REVIEW → Owner GO → **IMPLEMENT lokalny** · `TenderScrollableAccordion` · tokeny TWSL · 3 accordiony Tier A · build+test **PASS** · SSOT [`architecture/TENDER-WORKSPACE-LAYOUT-DESIGN-FREEZE.md`](architecture/TENDER-WORKSPACE-LAYOUT-DESIGN-FREEZE.md) · **następny krok:** commit bundle TWSL → push → verify **2.63.91**.

> **★ Baseline (2026-07-10):** prod **2.63.87** @ **`6f85d4c`** (P0-A iOS Login Shell). **NG-10** @ **2.63.86** (`02e0d0a`). **Payroll:** Domain Push **ACTIVE**. **Protected Core:** **GREEN**. **Następny krok:** release WIP bundle lub nowy program od **AUDIT** + Owner GO.

> **★ Closeout sesji (2026-07-10, P0-A):** **`6f85d4c`** release **2.63.87** · Incident A **CLOSED** · Owner QA Safari iPhone **PASS** · SSOT [`recovery/P0-A-IOS-LOGIN-CLOSEOUT.md`](recovery/P0-A-IOS-LOGIN-CLOSEOUT.md).

> **★ Closeout sesji (2026-07-10, NG-10):** slices **03–06** w `main` · **NG-10-06** @ **2.63.86** (`02e0d0a`) · SSOT [`architecture/NG-10-CLOSEOUT.md`](architecture/NG-10-CLOSEOUT.md).

> **★ Closeout sesji (2026-07-11, P0 Payroll):** **`e819124`** fix S2 · prod **2.63.85** @ **`88650be`** · **FULLY CLOSED**. SSOT: [`INCIDENTS.md`](INCIDENTS.md).

> **★ Closeout sesji (2026-07-10, NG-09):** **`c5aa953`** IMPLEMENT + **`29f7842`** RELEASE (**2.63.84**) + **`1f1167a`** docs — epic **NG-09 Inspector Workspace Modernization** **COMPLETE** · verify `version.json` → **2.63.84**. SSOT: [`SESSION-HANDOFF-NG-09-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-09-EPIC-CLOSE.md) · [`architecture/NG-09-EPIC-CLOSE-REPORT.md`](architecture/NG-09-EPIC-CLOSE-REPORT.md). **Następny bundle:** od nowego **AUDIT** + Owner GO.

> **★ Closeout sesji (2026-07-04, docs-only):** `e4daaf4` — sync `PROJECT-STATUS.md` (HEAD → `609ae53`, S7-5 ETAP 1 = DEPLOYED) + raport interim `docs/stabilization-weekly/STABILIZATION-WEEKLY-W01-2026-07-04.md` (pola telemetryczne PENDING). Evidence Gate **OPEN** — bez zmian (zero telemetrii/AC8–AC11/reportów). Wykonany **lokalny backup Supabase klasy B** (Application Backup) w `backup/` (gitignored — hasła adminów): KV 31 kluczy + Storage 166/237 (71 osieroconych `job-photo` 404) + schema/Edge/config. **Do klasy A (Disaster Recovery)** brak `pg_dump` serwera Postgres → backlog **INFRA-DB-BACKUP-01** (ON HOLD, gate: `supabase login`+link+hasło DB+owner GO).

> **⚠ PIERWSZE, co musisz wiedzieć (2026-07-20):**
>
> 0. **★★ LISTA PŁAC = PRIORYTET PRODUKCYJNY** — Domain Push (#CORE-015) · **resurrection fence** · rollover classifier · PWRB. Przed `cloud-sync` / Edge / payroll → [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md).
> 1. **Baseline prod** — UI **2.65.35** · tip **`3356349`** (H5 tooling) · app feature **`fce7b78`** · **GREEN**.
> 2. **TEST-HARNESS-01 H5 CLOSED** · H0–H5 tooling **RELEASED** · H0.x / H3-B/C **nie startuj** bez GO · SSOT [`architecture/TEST-HARNESS-01-H5-CLOSEOUT.md`](architecture/TEST-HARNESS-01-H5-CLOSEOUT.md).
> 3. **PAYROLL-CLOUD-RESURRECTION-01 + ROLLOVER-01 CLOSED** — nie usuwaj fence / nie cofaj ALIGN vs ROLLOVER.
> 4. **STABILIZATION WINDOW ACTIVE** — brak nowych epiców bez AUDIT + Owner GO · czekaj Owner GO.

**Nie zastępuje** `ARCHITECTURE.md` ani handoffów tematycznych — **linkuje** do nich.

---

## 0. Szybki start dla nowego agenta (2026-07-20)

### Baseline (SSOT)

| Warstwa | Wartość |
|---------|---------|
| **Production (UI)** | **2.65.35** · https://www.wgdom.fun · **PRODUCTION VERIFIED** · **GREEN** |
| **Runtime tip (`version.json`)** | **`3356349`** · TEST-HARNESS-01 H5 tooling (UI bez bumpu) |
| **App feature (ostatni)** | **`fce7b78`** · PAYROLL-CLOUD-RESURRECTION-01 |
| **main HEAD (tip)** | **`3356349`** · H5 **CLOSED** · H0–H5 tooling RELEASED |
| **Payroll sync** | **Domain Push ACTIVE** (#CORE-015) · **resurrection fence** na bootstrap · RS Push **bez Payroll** |
| **Incident register** | **CLEAN** — Resurrection-01 + Rollover-01 **CLOSED** · A/B historyczne **CLOSED** |
| **Ostatnio CLOSED** | **TEST-HARNESS-01 H5** · H4 · RESURRECTION-01 · ROLLOVER-01 · H0–H3 tooling · THEME-01 · DEADLOCK-N1 |
| **OPEN (Owner)** | **LOCALSTORAGE-ARCH-02F** · **H0.x Persist Ledger** · H3-B/C — **tylko po GO** |
| **Protected Core** | **GREEN** |
| **Payroll Gate** | **16/16** PASS · S2 cross-device **18/18** |
| **Cloud Sync S7** | Observation only — RS subset bez `kw-week-employees` |
| **WIP lokalny** | unrelated tenders/theme/`.tmp*` — **nie** mieszać z CORE |
| **Następny krok** | **STABILIZATION WINDOW ACTIVE** · preferowany next harness: **H0.x** (READY) · czekaj Owner GO · **nie** ruszaj fence/merge payroll bez AUDIT+GO |

### Czym jest aplikacja

**W&G DOM** — monolit React/Vite/TS dla firmy remontowej (Wrocław): **Pulpit**, **Lista Płac**, **Grafik**, **Roboty**, **Przetargi** (pipeline BZP + workspace V4), **Odbiory WM Druk** (ZI, pomiary, schematy), **Notatki operacyjne**, **Audit Hub**, panel **Inspektora** i tryb **Pracownika** (telefon + PIN). Dane trwałe: **LocalStorage ↔ Supabase KV** (`cloud-sync.ts`). Pliki: **Supabase Storage** + Edge `make-server-0afb8820`.

**Mapa widoków i modułów:** [`AGENT-APP-MAP.md`](AGENT-APP-MAP.md) · **Pełna architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) · **Workflow Przetargów:** [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md)

### Co zrobiliśmy (skrót 2026-07)

| Program | Status | Wersja |
|---------|--------|--------|
| **PAYROLL-CLOUD-RESURRECTION-01** — bootstrap freshness fence | **CLOSED** · dual-session smoke **PASS** | **2.65.35** @ `fce7b78` |
| **PAYROLL-P0-WEEK-ROLLOVER-01** — ALIGN vs real rollover | **CLOSED** | **2.65.34** @ `e38610a` |
| **CLOUD-P0-DEADLOCK-N1** — retry transient batch-set | **CLOSED** | **2.65.33** |
| **TEST-HARNESS-01 H0–H5** — prod sandbox tooling | **RELEASED** · H5 epic **CLOSED** | tip **`3356349`** · UI **2.65.35** · next: H0.x / H3-B/C po GO |
| **LOCALSTORAGE-ARCH-02 A–E** — IDB cold + `__WG_STORAGE__` | **CLOSED** · observation **PASS** | **2.65.28** @ `d896852` |
| **LOCALSTORAGE-ARCH-02F** — platform facade | **GO** · **NOT STARTED** | czeka IMPLEMENT |
| **PAYROLL-P0-FIX-01** — QuotaExceeded ≠ bootstrap FAILED | **CLOSED** | **2.65.27** @ `1c41b61` |
| **PAYROLL-DISPLAY-UNLOCK** — pusta tabela LP mimo roster=14 | **superseded / Owner FIX VERIFIED** (quota root) · TRACE opcjonalny | hist. **2.65.19** |
| **PAYROLL-BOOTSTRAP-RACE-FIX-01** — F5 bootstrap gate | **CLOSED** | **2.65.18** @ `47de89b` |
| **PAYROLL-ANTI-LEAK-FIX-01** — same-week SSOT guard | **CLOSED** | **2.65.14** @ `26f3eb5` |
| **JOBS-SYNC-FIX-01** — write-first admin bundle | **CLOSED** | **2.65.13** @ `309609e` |
| **JOBS-PHOTOS-DELETE-SYNC-01** — photo delete tombstones | **CLOSED** | **2.65.10** @ `d8f2d99` |
| **JOBS-PHOTOS-P0** — audit photos upload/delete regression | **AUDIT COMPLETE** · live trace **WIP** | prod **2.65.10** · SSOT [`architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md`](architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md) |
| **JOBS-ASSETS-SYNC-01** — photos[] union merge | **CLOSED** | **2.65.9** @ `f8a64d7` |
| **JOBS-FORM-RACE-01** — functional merge updateJob | **CLOSED** | **2.65.7** |
| **JOBS-ADDRESS-SYNC-01** — address field merge | **CLOSED** | **2.65.6** |
| **ROBOTS-INSPECTOR-01** — Inspektor WM stale sync | **CLOSED** | **2.65.5** @ `9307386` |
| **PAYROLL-ARCHIVE-01** — Archiwum stale apply | **CLOSED** | **2.65.4** @ `872e171` |
| **NG11-P0** — Discovery + Bootstrap + Transport | **EPIC COMPLETE** | **2.65.3** @ `281ede1` |
| **NG11-A5** — Strategic vs Economic | **CLOSED** | **2.65.0** @ `2606bfd` |
| **NG11-A3** — Discovery Fork | **CLOSED** | **2.64.0** @ `78c0a40` |
| **NG11-A2** — Dossier Artifact Cache | **CLOSED** | **2.63.99** @ `447a58b` |
| **NG11-Q1** — Parse Concurrency | **CLOSED** | **2.63.97** @ `e003591` |
| **NG11** — Pipeline Performance Wave 1 (A1+Q5) | **WAVE 1 CLOSED** | **2.63.95** @ `4710d11` |
| **NG10** — Autonomous Agent UX | **EPIC COMPLETE** | **2.63.94** @ `890f1fa` |
| **P0-A** — iOS Login Shell (Incident A) | **CLOSED** | **2.63.87** @ `6f85d4c` |
| **NG-09** — Inspector Workspace Modernization | **EPIC COMPLETE** | **2.63.80–84** @ `29f7842` |
| **M-03** — Mobile Re-certification | **CLOSED** | **2.63.79** @ `f7878fe` |
| **NG-08-HF-01** — Visual Smoke remediation | **CLOSED** | **2.63.78** @ `4855a2d` |
| **NG-08-05** — Cost Workspace (WF-05) | **CLOSED** | **2.63.77** @ `97ea90c` |
| **NG-08-04** — Documents Workspace (WF-04) | **CLOSED** | **2.63.76** @ `6f6bb66` |
| **NG-08-03** — Workspace Intelligence (WF-03) | **CLOSED** | **2.63.75** @ `caa46b1` |
| **NG-08-02** — Workspace Progress (WF-02) | **CLOSED** | **2.63.74** @ `09259ad` |
| **NG-08-01** — Workspace Frame | **CLOSED** | **2.63.73** @ `84b1491` |
| **INSPECTOR-RUNTIME-STATE-01** — hydratacja `jobsAll` | **CLOSED** | **2.63.73** @ `e9720de` |
| **NG-07-TEUX-01** — Lista Przetargów UX (4 slices) | **CLOSED** | 2.63.69→**72** |
| **PAYROLL-RACE-01** — reconcile przed apply + guard LP | **CLOSED** | 2.63.68 |
| **P0 Payroll Cross-Device Sync** — SYNC-ARCH-01 S2 Domain Push | **FULLY CLOSED** | **2.63.85** @ `e819124` |
| **SMS-UI-01** — SMS wyczyść wybór | **CLOSED** | 2.63.67 |
| **NG-06-TEUX** — design system Przetargi (Phase 1+2) | **EPIC COMPLETE** | 2.63.54→**66** |
| **PAYROLL Etap 2** B1–B6 + RB + Guard | **CLOSED** | 2.63.15–24 |
| **RC-B** PWRB + tombstone revocation | **CLOSED** | 2.63.30–31 |
| **Work Catalog #5C** cutover F1+F2 | **CLOSED** | 2.63.44–53 |
| **NG-04 BOQ PRO** · **NG-02 Pipeline** · **NG-03 Workspace** | **CLOSED** | 2.63.x |
| **TEST-INFRA-001** + **TI-B4** smoke Przetargi | **CLOSED** | 2.63.26–27 |

**SSOT epic NG-09:** [`architecture/NG-09-EPIC-CLOSE-REPORT.md`](architecture/NG-09-EPIC-CLOSE-REPORT.md) · [`SESSION-HANDOFF-NG-09-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-09-EPIC-CLOSE.md)
**SSOT epic TEUX:** [`architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md`](architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md) · smoke: `npm run test:infra -- --suite smoke-teux`

### Co będzie robione (bez nowego epicu — STABILIZATION WINDOW)

| Kierunek | Status | Uwaga |
|----------|--------|-------|
| **Lista Płac — observation** | **ACTIVE** | Live po recovery może być puste (intentional) · **nie** auto-seed ze starego LS |
| **LOCALSTORAGE-ARCH-02F** | **GO / NOT STARTED** | tylko jawne IMPLEMENT |
| **TEST-HARNESS H0.x / dalsze H*** | **gated** | Persist Ledger READY · bez GO = nie startuj |
| **NG11-P0 POST RELEASE** | **CLOSED** | [`NG11-P0-EPIC-CLOSE-REPORT.md`](architecture/NG11-P0-EPIC-CLOSE-REPORT.md) |
| **NG-08 parent** | **CLOSED / FROZEN** | **nie rozszerzać** |
| **Następny AUDIT** | Owner | nowy bundle od zera · #CORE-013 |
| **Cloud Sync S7** | **OBSERVATION** | bez implementacji sync |
| **FEATURE / CORE** | Owner GO | osobny bundle · zero mixed commit |

### Reguła nr 1 dla każdej implementacji

**Nowe funkcje nie mogą regresować Listy Płac.** Nawet jeśli task dotyczy wyłącznie Przetargów lub Mobile — sprawdź § **2b** przed commitem. Mixed bundle (`cloud-sync.ts` + UI feature) = **BLOCKED** (#CORE-013).

### ★ Obostrzenia (MUST — przeczytaj przed kodem)

| ID / reguła | Co oznacza | SSOT |
|-------------|------------|------|
| **#CORE-013** | Zero **mixed bundle**: FEATURE UI ≠ `cloud-sync` / Payroll / Edge w jednym commicie | [`architecture/CORE-01A-DESIGN-FREEZE.md`](architecture/CORE-01A-DESIGN-FREEZE.md) |
| **#CORE-014** | **Boundary Check** przed IMPLEMENT i przed COMMIT (klasyfikacja każdego pliku) | [`architecture/CORE-01A-CHANGE-CHECKLIST.md`](architecture/CORE-01A-CHANGE-CHECKLIST.md) |
| **Owner GO** | IMPLEMENT dopiero po AUDIT → PLAN → FREEZE → ARCH REVIEW → Boundary · wyjątki CORE w [`WORKFLOW-OWNER-GO.md`](WORKFLOW-OWNER-GO.md) | `#WORKFLOW-OWNER-GO-001` |
| **STABILIZATION WINDOW** | Brak nowych epiców bez Owner GO + AUDIT; maintenance / hotfix dozwolone | [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) |
| **TOKEN FREEZE** | `tender-ux-tokens.ts` — typography **import-only**; **wyjątek TWSL:** tokeny layout accordion (`TENDER_SCROLLABLE_ACCORDION_*`) — Owner GO 2026-07-11 | NG-06 TEUX + TWSL DF |
| **Lista Płac / PWRB** | Mutacje składu tygodnia **tylko** przez PWRB · gate B payroll **16/16** | § **2b** · Payroll Agent Guide |
| **Resurrection fence** | **Nie usuwaj / nie omijaj** `payroll-bootstrap-resurrection-fence.ts` · intentional empty Cloud ≫ bogaty LS | [`architecture/PAYROLL-CLOUD-RESURRECTION-01-DESIGN-FREEZE.md`](architecture/PAYROLL-CLOUD-RESURRECTION-01-DESIGN-FREEZE.md) |
| **Rollover classifier** | **Nie cofaj** `classifyPayrollWeekTransition` (ALIGN ≠ wipe; ROLLOVER = archive+clear) | [`architecture/PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md`](architecture/PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md) |
| **Cloud Sync S7** | **Observation only** — bez nowych implementacji sync bez Owner GO | CURRENT-TASK · recovery |
| **Deploy** | Frontend: **tylko** `git push origin main` · verify **jedno** `version.json` · **zakaz** `vercel deploy` | [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) |
| **Commit** | Tylko na polecenie właściciela · jeden bundle = jeden cel · zero mixed WIP | AGENTS.md · reguły Cursor |
| **Inspektor state** | Panel ma **własny** `useState jobsAll` (nie `App.tsx`) · setter **`setJobsAll`** | [`recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md`](recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md) |
| **Po KV clear payroll** | Zamknij inne klienty / wyczyść LS payroll **zanim** ktoś otworzy app (playbook recovery) | Resurrection DF D-05 |

**Workflow bundla:** `AUDIT → PLAN → DESIGN FREEZE → ARCH REVIEW → Owner GO → IMPLEMENT → BUILD/SMOKE → COMMIT → PUSH → VERIFY → CLOSE`.

---

## 1. Kolejność czytania (nowa sesja)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← TEN PLIK (kontekst + mapa + obostrzenia)
1m. docs/AGENT-APP-MAP.md            ← ★★★ mapa widoków, modułów, KV, sync (START dla AI)
1og. docs/WORKFLOW-OWNER-GO.md       ← ★ Owner GO Policy (#WORKFLOW-OWNER-GO-001)
1c. docs/architecture/CORE-01A-CHANGE-CHECKLIST.md ← Boundary Check FEATURE/CORE
1c2. docs/architecture/CORE-PROTECTED-ARCHITECTURE.md ← co jest Protected Core
1p. docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md ← ★★ sync/merge Payroll
1p2. docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md ← PWRB · I-1…I-4
1r. docs/EDGE-OPT-B-MASTER-AUDIT.md  ← Edge-Opt-B BLOCKED (recovery)
2. CURRENT-TASK.md                   ← status · backlog · CLOSED / PENDING
3. docs/STABILIZATION-WINDOW-PLAN.md ← okres stabilizacji
4. docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md
5. docs/AGENT-ONBOARDING.md
6. docs/PROJECT-HANDOFF-CURRENT.md   ← baseline prod SSOT
7. docs/TEST-INFRA-001-CLOSEOUT.md · docs/TI-B4-CLOSEOUT.md
8. docs/architecture/NG-08-02-TEUX-CLOSEOUT.md · NG-08-03…05 closeout docs  ← NG-08 CLOSED
8i. docs/recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md  ← hotfix Inspektor CLOSED
9. docs/WORKFLOW-ARCHITECTURE-v2.63.md  ← OBOWIĄZKOWE przy Przetargu
10. docs/architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md
11. docs/WORKFLOW-RELEASE-DEPLOY.md
12. docs/ARCHITECTURE.md
13. AGENTS.md
```

Hasło użytkownika **„kontynuuj WGDOM”** → dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.
Hasło **„domknij WGDOM”** → aktualizacja docs ciągłości + commit **tylko** docs (`.cursor/rules/wgdom-domkniecie-sesji.mdc`).

---

## 2. Co zrobiliśmy (stan na 2026-07-14)

### Sesja 2026-07-14 — LOCALSTORAGE-ARCH-02 A–E + observation PASS

| | |
|--|--|
| **Prod** | **2.65.28** @ **`d896852`** |
| **A–E** | IDB cold + `__WG_STORAGE__` · **CLOSED** · Owner observation **PASS** |
| **FIX-01** | **2.65.27** @ `1c41b61` — QuotaExceeded ≠ FAILED |
| **F** | **GO YES** · **NOT STARTED** |
| **SSOT** | [`architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md`](architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md) |

### Sesja 2026-07-13 (hist.) — PAYROLL-DISPLAY-UNLOCK TRACE-02

### ★ Sesja 2026-07-13 — PAYROLL-DISPLAY-UNLOCK (**RCA OPEN · czeka Owner runtime dump**)

| Element | Wartość |
|---------|---------|
| **Objaw prod** | Po Ctrl+Shift+R: topbar/KPI roster=14, **tabela LP pusta ~60–120 s**, potem sama się pojawia |
| **Wykluczone (forensic)** | Bootstrap race · merge · anti-leak · `employeeLeaves` · `weekEmployees` jako gate |
| **Gate tabeli** | `PayrollView` → `displayEmployees` ← `resolvePayrollDisplayEmployees()` (`payroll-display.ts`) |
| **Hipotezy kodu (nieudowodnione runtime)** | **A:** `savedWeeks` → `archivedForWeek` · **B:** `weekFrom`/`weekTo` → `isClosedWeek=false` |
| **Instrumentacja prod** | `__WG_PAYROLL_DISPLAY_TRACE__` · **TRACE-02** `findFirstDisplayUnlock()` + diff · **`c1e76ca`** · **2.65.19** |
| **Test** | `npx vite-node scripts/test-payroll-display-unlock-trace-02.mjs` **PASS** |
| **Owner — jeden przebieg** | `enable()` → Ctrl+Shift+R → Lista Płac → czekaj na tabelę → `download()` |
| **Reguła RCA z dumpu** | `reason=closed_week_archive_snapshot` + `isClosedWeek=true` → **A** · `reason=operational_week_live_roster` + `isClosedWeek=false` → **B** |
| **Następny krok** | Owner dostarcza JSON · agent podaje **jednoznaczny RCA** · **bez fixa** bez Owner GO (#CORE-013) |

**Kluczowe pliki (read-only przy RCA):** `payroll-display.ts` · `payroll-display-runtime-trace.ts` · `PayrollView.tsx` (L610–637, L1188) · `App.tsx` `applyAdminDataBundle` (L615–617)

### ★ Sesja 2026-07-12 — ROBOTS-INSPECTOR-01 (**CLOSED · PRODUCTION VERIFIED**)

| Element | Wartość |
|---------|---------|
| **Problem** | Roboty → Nowa robota → wybór inspektora WM cofa się po ~2 s auto-sync |
| **RCA** | Push/fingerprint bez `kw-jobs` reconcile; apply z reconcile — cloud poison |
| **Fix** | `reconcileJobsWithFreshLocal` + `reconcileAdminBundleWithFreshLocal` (finalBundle) |
| **Feature commit** | **`9307386`** · **2.65.5** |
| **Docs commit** | **`6bddea1`** · continuity + closeout |
| **Test** | RI-T01–T05 **7/7** · PAYROLL-RACE + PAYROLL-ARCHIVE regresja **PASS** |
| **SSOT** | [`architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md`](architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md) |

### ★ Sesja 2026-07-12 — PAYROLL-ARCHIVE-01 (**CLOSED · PRODUCTION VERIFIED**)

| Element | Wartość |
|---------|---------|
| **Problem** | Edycja dnia w Archiwum cofa się po cloud sync |
| **Fix** | `reconcileArchiveWithFreshLocal` przed apply |
| **Commit** | **`872e171`** · **2.65.4** |
| **SSOT** | [`PAYROLL-ARCHIVE-01-DESIGN-FREEZE.md`](PAYROLL-ARCHIVE-01-DESIGN-FREEZE.md) |

### ★ Sesja 2026-07-08 — INSPECTOR-RUNTIME-STATE-01 (**CLOSED · PRODUCTION VERIFIED · GREEN**)

| Element | Wartość |
|---------|---------|
| **Bundle** | **INSPECTOR-RUNTIME-STATE-01** — hydratacja React `jobsAll` w panelu Inspektora |
| **Commit** | **`e9720de`** — `fix(inspector): restore jobs runtime state hydration` |
| **Wersja prod** | **2.63.73** @ `e9720de` · `version.json` `2026-07-08T12:02:08Z` |
| **RC** | `setJobsAllAll` → `setJobsAll` (`InspectorPanel.tsx:299`) — regresja INSPECTOR-JOB-ASSIGN-001 |
| **Owner smoke** | Szymon **15** · Zofia **2** · Dashboard / Roboty / Assignment **PASS** |
| **SSOT** | [`recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md`](recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md) |

**Uwaga:** UI version nadal **2.63.73** (hotfix 1-linijkowy, bez bump changelog). KV / assignment / sync **bez zmian**.

### ★ Sesja 2026-07-08 — NG-06-TEUX TEUX-7z (**EPIC COMPLETE · PRODUCTION VERIFIED**)

| Element | Wartość |
|---------|---------|
| **Bundle** | **TEUX-7z** — smoke agregat `SMOKE-TEUX-NG06` + epic close report |
| **Wersja prod** | **2.63.66** · implement `2d94b0d` · verify curl → **2.63.66** @ `80cf911` (2026-07-08T05:48Z) |
| **Status** | **NG-06-TEUX EPIC COMPLETE** · **PRODUCTION VERIFIED** · **Phase 2 CLOSED** |
| **SSOT** | [`architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md`](architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md) |
| **Test** | `SMOKE-TEUX-NG06` 12/12 child · gate B tenders + payroll 15/15 |

**Poza roadmapą epic (defer):** hosted removal · Z-05 mobile re-cert · TOKEN thaw · Cloud Sync S7.

### ★ Sesja 2026-07-08 — NG-06-TEUX TEUX-7f (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Bundle** | **TEUX-7f** — Hosted deprecation guard (SSOT doc · `@deprecated` · dev warn) |
| **Wersja prod** | **2.63.65** · implement `e0d4e47` · verify curl → **2.63.64** @ `da9b75a` (propagacja) |
| **Status** | **RELEASE GO** · **DEPLOY PROPAGATING** · **BUNDLE CLOSED FINAL** |
| **SSOT** | [`architecture/NG-06-TEUX-HOSTED-DEPRECATION.md`](architecture/NG-06-TEUX-HOSTED-DEPRECATION.md) · [`architecture/NG-06-TEUX-TEUX7F-CLOSEOUT.md`](architecture/NG-06-TEUX-TEUX7F-CLOSEOUT.md) |
| **Test** | `LIB-TENDER-HOSTED-DEPRECATION-TEUX7F` 17/17 · gate B tenders PASS |

**Następny krok TEUX:** brak — epic **COMPLETE**. Defer poza roadmapą: hosted removal · Z-05 · TOKEN thaw · Cloud Sync S7.

### ★ Sesja 2026-07-07 — NG-06-TEUX TEUX-7e (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Bundle** | **TEUX-7e** — Strategia + Pulpit (≤3 KPI Pulpit · tokeny KPI · `strategicInsights`) |
| **Wersja prod** | **2.63.64** · implement `f0a49cf` · verify `da9b75a` (`version.json` 2026-07-07T20:38Z) |
| **Status** | **PRODUCTION VERIFIED** · **BUNDLE CLOSED FINAL** |
| **SSOT** | [`architecture/NG-06-TEUX-TEUX7E-CLOSEOUT.md`](architecture/NG-06-TEUX-TEUX7E-CLOSEOUT.md) |
| **Test** | `LIB-TENDER-STRATEGY-TEUX7E` 24/24 · gate B 13/13 |

**Epic NG-06-TEUX:** **CLOSED** — patrz **TEUX-7z** powyżej.

### ★ Sesja 2026-07-07 — NG-06-TEUX Phase 1 (**COMPLETE**)

| Element | Wartość |
|---------|---------|
| **Epic** | **NG-06-TEUX** — Tender Experience & Design System |
| **Phase 1** | TEUX-1…6 **CLOSED** · prod **2.63.54 → 2.63.59** |
| **Ostatni feature** | TEUX-6 Empty States · `ead4de7` · **PRODUCTION VERIFIED** |
| **Docs closeout** | `5c65bae` — release verification + Phase 1 closeout |
| **SSOT** | [`architecture/NG-06-TEUX-PHASE1-CLOSEOUT.md`](architecture/NG-06-TEUX-PHASE1-CLOSEOUT.md) · [`architecture/NG-06-TEUX-DESIGN-FREEZE.md`](architecture/NG-06-TEUX-DESIGN-FREEZE.md) |
| **Deliverables** | `openTenderDetailV4` · `tender-ux-tokens` (**TOKEN FREEZE**) · list cards · mobile sheet · loading skeletons · `TenderUxEmptyState` |
| **Test gates** | `LIB-TENDER-DETAIL-NAV-TEUX1` … `LIB-TENDER-EMPTY-STATES-TEUX6` |
| **Boundary** | #CORE-013/#CORE-014 **PASS** — zero payroll/sync/pipeline diff |

Phase 1 **COMPLETE** — Phase 2 + closeout **CLOSED** (TEUX-7a…7z).

### ★ Sesja 2026-07-06 — Bundle #5C-5C F2 Legacy Compat Cleanup (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Klasa** | **CORE CATALOG** (#CORE-013) |
| **Commit** | `e3daa6d` · prod **2.63.53** · **PRODUCTION VERIFIED** |
| **SSOT** | [`docs/architecture/CORE-5C-5C-F2-CLOSEOUT.md`](architecture/CORE-5C-5C-F2-CLOSEOUT.md) |
| **Zakres** | Usunięto legacy write router + compat UI; **KEEP** `saveWorkCatalogRouted` · `resolveCatalogForEngine` · ONE-SHOT bootstrap |
| **Test** | `LIB-5C-5C-LEGACY-CLEANUP-F2` · suite **31** testIds · payroll **15/15** |
| **Boundary** | #CORE-013 **PASS** — zero diff `cloud-sync.ts` · Payroll · ONE-SHOT |

**Następny krok:** **POST F2 OBSERVATION** — telemetria F3 T1–T7 · **bez IMPLEMENT F3**.

### ★ Sesja 2026-07-06 — Bundle #5C-5A Legacy KV sync quiesce (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Klasa** | **CORE** (#CORE-013) |
| **Commit** | `36b3ddd` · prod **2.63.50** · **PRODUCTION VERIFIED** |
| **Zakres** | `kw-wgdom-cost-catalog` usunięty z `DATA_KEYS` · `BOOTSTRAP_DEFERRED_KEYS` · `mergeDataKey()` · `TENDER_DATA_KEYS` · `mergeTenderDataKey()`; **KEEP** `mergeWgdomCostCatalogForCloud()` · historia KV pełny sync |
| **Test** | `LIB-LEGACY-KV-SYNC-QUIESCE-5C5A` · suite **28** testIds |
| **Boundary** | #CORE-013 **PASS** — zero diff Payroll · PWRB · Bootstrap · Reconcile · CloudLoader · UI · router · store |
| **Functional delta** | **Zero** — sync plane only |

**Następny slice (#5C-5):** **#5C-5C F3** — **BLOCKED** (telemetria · runbook · soak).

### ★ Sesja 2026-07-06 — Bundle #5C-5C F1 Orphan Reconcile Cleanup (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Klasa** | **CORE CATALOG** (#CORE-013) |
| **Commit** | `efc45d9` · prod **2.63.52** · **PRODUCTION VERIFIED** |
| **SSOT** | [`docs/architecture/CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md`](architecture/CORE-5C-5C-LEGACY-CLEANUP-DESIGN-FREEZE.md) Faza 1 |
| **Zakres** | DELETE `work-catalog-reconcile*.ts` · barrel PB-WRITE-C exports · deprecated `maybeExecuteWorkCatalogBootstrap` alias |
| **Test** | `LIB-5C-5C-LEGACY-CLEANUP-F1` **31/31** · gate B payroll **15/15** · #CORE-013 **PASS** |
| **Bez zmian** | `cloud-sync.ts` · ONE-SHOT bootstrap · router · compat · `wgdom-cost-catalog-store.ts` |

**Następny slice:** **#5C-5C F2** — **CLOSED** (`e3daa6d`).

### ★ Sesja 2026-07-06 — Bundle #5C-5B Bootstrap / Reconcile Decouple (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Klasa** | **CORE CATALOG** (#CORE-013) |
| **Commit** | `50dae97` · prod **2.63.51** · **PRODUCTION VERIFIED** |
| **SSOT** | [`docs/architecture/CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md`](architecture/CORE-5C-5B-BOOTSTRAP-RECONCILE-DECOUPLE-DESIGN-FREEZE.md) v1.1 |
| **Zakres** | `finalizeWorkCatalogAfterDeferredMerge` — bez cyklicznego legacy read · bez reconcile w deferred path · ONE-SHOT PB-3 (scenariusz B) |
| **Test** | `LIB-5C-5B-BOOTSTRAP-DECOUPLE` · suite **29** testIds · gate B work-catalog + payroll **PASS** |
| **Payroll gate** | **Payroll Bootstrap Integrity PASS** (P11 · B4 · B5 · RB · assignments · guards) |
| **Boundary** | #CORE-013 **PASS** — zero diff Payroll · PWRB · CloudLoader · Edge · App.tsx |

### ★ Sesja 2026-07-06 — #5C-5B Design Freeze v1.1 (**CLOSED** — superseded by IMPLEMENT closeout powyżej)

| Element | Wartość |
|---------|---------|
| **Docs** | Design Freeze v1.1 + Payroll Regression Gate · commit `2702e20` |

### ★ Sesja 2026-07-06 — Bundle #5C-3D History SSOT from Work Catalog (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `03823ad` · prod **2.63.49** · **PRODUCTION VERIFIED** |
| **Zakres** | `catalog-rate-history-snapshot.ts` + `catalog-rate-history.ts` · write po `saveWorkCatalogRouted({ previousStore })` · neutral loader + reload `pricingCatalogRevision` · empty state „Brak danych historycznych” |
| **Test** | `LIB-HISTORY-SSOT-5C3D` · suite **27** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/bootstrap/engine/adapter/labor-benchmark-data/#6E/Payroll/Edge diff · preview SSOT bez zmian |
| **Known** | `test-material-history.mjs` 9/12 — fixture drift 90d (pre-existing, bez zmian `material-history.ts`) |

**Następny FEATURE (#5C):** **#5C-5** legacy KV retirement — tylko na polecenie (nie startować bez GO).

### ★ Sesja 2026-07-06 — Bundle #5C-3C Dead UX cleanup (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `e89051b` · prod **2.63.48** · **PRODUCTION VERIFIED** |
| **Zakres** | usunięto martwy CTA „Zapisz bazę cen”; scalony callout Ustawienia wyceny; copy SSOT w calculator/GuideView/WorkCatalogView; `WGDOM_COST_REGION_LABELS` → `wgdom-cost-catalog.ts` |
| **Test** | `LIB-DEAD-UX-CLEANUP-5C3C` · suite **26** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/bootstrap/engine/historia/benchmark/#6E/Payroll/Edge diff · preview SSOT bez zmian |

### ★ Sesja 2026-07-06 — Bundle #5C-3B Preview data SSOT cutover (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `fcf3c6f` · prod **2.63.47** · **PRODUCTION VERIFIED** |
| **Zakres** | `tender-price-base-preview.ts` · `buildPriceBasePreviewRows()` · Ustawienia wyceny → `resolveActiveCatalogForTender()` · `pricingCatalogRevision` invalidacja |
| **Test** | `LIB-PREVIEW-SSOT-5C3B` · suite **25** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/bootstrap/engine/#6E/Payroll/Edge diff · historia loader bez zmian (#5C-3D) |

**Następny FEATURE (#5C):** **#5C-3C** cleanup — tylko na polecenie.

### ★ Sesja 2026-07-06 — Bundle #5C-3A UX copy & navigation cutover (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `d95b30b` · prod **2.63.46** · **PRODUCTION VERIFIED** |
| **Zakres** | `tender-catalog-ux-labels.ts` · `CATALOG_UX_SOURCE_LABEL` „Biblioteka Robót” · tab `pricebase` → „Ustawienia wyceny” · CTA Wycena → `workcatalog` · usunięto „Katalog WGDOM” z `src/app/**` |
| **Test** | `LIB-UX-COPY-CUTOVER-5C3A` · suite **24** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/bootstrap/engine/#6E/Payroll/Edge diff · preview loader `loadWgdomCostCatalogStore()` **bez zmian** (#5C-3B) |

**Następny FEATURE (#5C):** **#5C-3B** preview data SSOT — zamknięty w `fcf3c6f`.

### ★ Sesja 2026-07-06 — Bundle #5C-2 Write SSOT work_only default (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `a7bc713` · prod **2.63.45** · **PRODUCTION VERIFIED** |
| **Zakres** | `defaultAppSettings().catalogWriteMode = "work_only"` · czysta instalacja → work_only · gate AC-11 zero legacy write w `src/app/**` |
| **Test** | `LIB-WRITE-SSOT-APP-NO-LEGACY-5C2` + `LIB-PB-WRITE-ROUTER` · suite **23** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/PB-3/reconcile/engine diff |

**Następny FEATURE (#5C):** **#5C-3 UX cutover** — tylko na polecenie.

### ★ Sesja 2026-07-05 — Bundle #5C-1 Read SSOT Work Catalog only (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `aecf851` · prod **2.63.44** · **PRODUCTION VERIFIED** |
| **Zakres** | `resolveActiveCatalogForTender()` work-only · zero legacy KV w resolverze · UI label zawsze „Biblioteka Robót” |
| **Test** | `LIB-READ-SSOT-PREFLIGHT-5C1` + `LIB-READ-SSOT-WORK-ONLY-5C1` · suite **21** testIds |
| **Boundary** | #CORE-013 **PASS** — zero cloud-sync/PB-3/engine/#6E diff |

### ★ Sesja 2026-07-05 — Bundle #5C-0A Pricing refresh after Work Catalog save (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `c151b40` · prod **2.63.43** · **PRODUCTION VERIFIED** |
| **Zakres** | `pricingCatalogRevision` w `TendersContext` · bump po save Work Catalog · invalidacja `useTenderPricingAuto` · BOQ · panel Wycena |
| **Test** | `LIB-PRICING-CATALOG-REVISION-5C0A` · suite **19** testIds |
| **Boundary** | #CORE-013 **PASS** — zero resolver/PB-3/cloud-sync/engine diff |

### ★ Sesja 2026-07-05 — Bundle #6E Deferred bootstrap reliability (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `7138957` · prod **2.63.42** · **PRODUCTION VERIFIED** |
| **Zakres** | `DeferredBootstrapState` (idle/running/done) · `collectDeferredAdminHydrationPatch` · unified React hydrate · `generation` trigger w hookach |
| **Test** | `LIB-DEFERRED-BOOTSTRAP-6E` · suite **18** testIds |
| **Boundary** | #CORE-013 **PASS** — zero CloudLoader/cloud-sync/Payroll/PB-3 diff |

**Następny FEATURE:** tylko na polecenie (#5C cutover · P3 market UI).

### ★ Sesja 2026-07-05 — Bundle #6D P2.10 Roboty ulubione (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `642a01d` · prod **2.63.41** · **PRODUCTION VERIFIED** |
| **Zakres** | gwiazdka ulubione · filtr chip Ulubione · sort favorite-first · licznik · `work-catalog-favorite.ts` · app layer only |
| **Test** | `SMOKE-WORK-CATALOG-FAVORITE-P210` · suite **17** testIds |
| **Boundary** | #CORE-013/#CORE-014 **PASS** — zero CORE/lib diff |

**Następny FEATURE:** tylko na polecenie (#5C cutover · P3 market UI).

### ★ Seria napraw 2026-07 — skrót dla agentów (nie psuj LP)

| Program / bundle | Wersja | Commit | Status | Czego **nie** cofać |
|------------------|--------|--------|--------|---------------------|
| **PAYROLL Etap 2 B1–B6 + RB** | 2.63.15–24 | `1a65341`→`727e6c4` | **CLOSED** | `finalizePayrollBundleMerge`, `CloudSyncMutationGuard`, UNION roster, closed week UI |
| **SYNC-ARCH-01 RC-B** (PWRB + I-1…I-4) | 2.63.30–31 | `35f37b1`→`31a7d5e` | **CLOSED** | `payroll-week-roster-bundle.ts` — jedyna ścieżka add/remove składu |
| **CORE-01A** | docs | — | **CLOSED** | #CORE-013 mixed bundle BLOCKED |
| **PLATFORM-SYNC-01A** | 2.63.33 | `a4cd5c2` | **CLOSED** | `reconcileOperationalNotesInMergedBundle` po await — **tylko** notatki operacyjne |
| **FEATURE Bundle B** (Owner View P2A) | 2.63.32 | `119576c` | **CLOSED** | `tender-work-scope-inference.ts` pdf_text — bez sync |

**Prod verified (RC-B):** Lista Płac add/remove/sync/Archiwum PASS (2026-07-04).

### ★ § 2b — Lista Płac: jak NIE zepsuć synchronizacji (OBOWIĄZKOWE)

> Po miesiącach napraw (Guard Phase, B4 merge, PWRB, tombstone revocation) **Lista Płac jest stabilna na prod**. Każdy agent pracujący nad **dowolnym** modułem musi respektować poniższe — nawet jeśli task dotyczy Przetargów, Mobile lub Notatek.

#### Zanim dotkniesz kodu sync / LP

1. Przeczytaj **[`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)** (całość lub § skrót).
2. Przeczytaj **[`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md)** — inwarianty I-1…I-4.
3. Sprawdź **`docs/architecture/CORE-01A-DESIGN-FREEZE.md`** §4A–4B — klasyfikacja pliku.

#### Pliki CORE — nie zmieniaj w bundle FEATURE (#CORE-013)

| Plik / obszar | Rola | Dozwolone tylko w |
|---------------|------|-------------------|
| `src/lib/cloud-sync.ts` — `finalizePayrollBundleMerge`, `mergeWeekEmployees`, payroll guards | SSOT merge LP | **Osobny CORE bundle** + AUDIT |
| `src/lib/payroll-week-roster-bundle.ts` | **PWRB** — add/remove/push/reconcile składu | CORE bundle lub hotfix LP |
| `src/lib/cloud-sync-mutation-guard.ts` | Guard mutacji roster + przydziały | CORE |
| `src/lib/payroll-week-employee-merge.ts` | Merge parity klient/Edge | CORE |
| `src/app/CloudLoader.tsx` — bootstrap payroll | P11 merge | CORE |
| `supabase/functions/.../index.tsx` — batch-set payroll UNION | Edge merge | CORE + deploy Edge |
| `src/app/App.tsx` — **intencja payroll** (`removeWeekEmployee`, rollover, week save) | Orkiestracja LP | CORE bundle |

**PLATFORM-SYNC-01A** zmienił `cloud-sync.ts` + `App.tsx` **wyłącznie** dla `reconcileOperationalNotesInMergedBundle` — **nie** dotykał ścieżek payroll. Nowe reconcile dla innych domen = osobny AUDIT, **nie** kopiuj ślepo.

#### Inwarianty PWRB (RC-B) — MUST

| # | Reguła |
|---|--------|
| I-1 | Mutacja składu tygodnia → **tylko** `pwrAdd` / `pwrRemove` / `pwrPush` / `pwrReconcile` |
| I-2 | Push `kw-week-employees` **zawsze** z `kw-week-employees-deleted-ids` (coupled domain) |
| I-3 | Po pull — reconcile tombstonów przed apply do React |
| I-4 | Re-add po delete → tombstone **revoked** (G-0) — pracownik nie znika po F5 |

#### Testy obowiązkowe przed commitem dotykającym LP/sync

```bash
npm run audit:pwrb
npx vite-node scripts/test-pwrb-boundary-rcb.mjs
npx vite-node scripts/test-payroll-tombstone-revocation-rcb.mjs
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs
npm run test:infra -- --gate B --scope payroll
```

#### Typowe błędy agentów (powodują regresję LP)

| Błąd | Skutek |
|------|--------|
| Mixed bundle: `cloud-sync.ts` + `TendersView.tsx` w jednym commicie | **BLOCKED** — rozdziel |
| Bezpośredni push `kw-week-employees` z `App.tsx` zamiast PWRB | resurrection / utrata składu |
| Zmiana `mergeWeekEmployees` / `finalizePayrollBundleMerge` „dla wygody” | bootstrap/runtime drift |
| Stale closure w `runCloudSync` nadpisuje świeżą mutację UI | race (naprawione dla notatek w 01A; **nie** dotykaj payroll bez AUDIT) |
| Refactor `App.tsx` łączący payroll + inne moduły | mixed intent → split commit |

#### Gdy task **nie** dotyczy LP

- **Nie** importuj nowych ścieżek zapisu do `cloud-sync.ts` bez polecenia.
- **Nie** zmieniaj `runCloudSync` / `pullFromCloudAndMerge` poza domeną zatwierdzoną w AUDIT (01A = tylko operational notes).
- Boundary check przed commit: `git diff --cached --name-only` vs §4B CORE-01A.

---

## 2c. Co zrobiliśmy — szczegóły historyczne (2026-07-04)

### ★ SYNC-ARCH-01 RC-B-1 — Tombstone Revocation · **CLOSED**

> **Incydent:** delete → re-add pracownika → F5 → znika (11→10). **Root cause:** append-only tombstony bez revocation + brak spójności pary `(roster, tombstones)`.

| Element | Status | Commit | Skrót |
|---------|--------|--------|-------|
| **PWRB facade** | **CLOSED** | `35f37b1` | `payroll-week-roster-bundle.ts` — `pwrAdd`/`pwrRemove`/`pwrPush`/… |
| **I-1…I-4** | **CLOSED** | `35f37b1` | pull revoke · Edge normalize · reconcile · coupled push |
| **RC-B debug overlay** | **REMOVED** | `24bde6e` | cleanup diagnostyki — bez bumpu wersji |
| **Testy** | PASS | — | `audit:pwrb` · `test-pwrb-boundary-rcb` · `test-payroll-tombstone-revocation-rcb` |

**SSOT closeout:** [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · Design Freeze: [`recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md)

**Dla agentów — MUST przed nową funkcją Payroll:**
1. Mutacje składu → **tylko PWRB** (`payroll-week-roster-bundle.ts`), nie bezpośrednio `App.tsx` + tombstony osobno.
2. Nie rozdzielaj push `kw-week-employees` od `kw-week-employees-deleted-ids`.
3. `npm run audit:pwrb` + payroll smoke przed commitem sync.

**OPEN:** batch-set 500 (H1) · manual multi-device AC8–AC11 · Evidence Gate SYNC-ARCH-01.

### 🔴 P0 PAYROLL CLOUD SYNC INCIDENT — **PARTIAL** (batch-set 500 OPEN)

> Pełna architektura + hipotezy + plan: **[`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)**. Audyty: [`S7`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) · [`S7A`](PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md).

| Bundle | Status | Commit | Skrót |
|--------|--------|--------|-------|
| **PR-PAY-S6** Archive Restore Eligibility Guard | **CLOSED** | `d2a3d90` | baner/restore respektuje tombstony S2 (`eligibleArchiveWeekEmployees`) |
| **PR-PAY-S7-1** Cloud Batch Diagnostics | **CLOSED** | `4c38f4f` | `app.onError` + try/catch + `{ok,error,requestId}` w Edge `batch-set` |
| **PR-PAY-S7A** Frequency Audit | **AUDIT COMPLETE** | — | CONFIRMED CONTRIBUTING CAUSE (nadmiarowe batch-get/set; brak infinite loop) |
| **PR-PAY-S7-4A** Cloud Sync Optimization | **IMPLEMENT COMPLETE → OBSERVATION** | `12b09d8` | debounce 2s + min-interval 15s + focus/visibility throttle + AC4 (no-change=no-push) + AC5 metryki |
| **PR-PAY-S7-5 ETAP 1** Resurrection Guard | **DEPLOYED → OBSERVATION** | `ae132bc` | **S7-5-1** sync `kw-week-employees-deleted-ids` (push+pull+merge+save PRZED finalize) + **S7-5-2** Edge tombstone-aware (filtr prev/next PRZED UNION + restore-aware). Test 24/24. Functional PASS · AC8–AC11 multi-device OPEN. ETAP 2 (S7-5-3/S7-5-4) **warunkowy** |
| **PR-PERF-EDGE-OPT-A** batch-get order-preserving | **DEPLOYED → OBSERVATION** | `609ae53` | `batch-get` → `kv.mget` (order-preserving + null-fill, `SELECT key,value ... IN`); N `SELECT` → 1. Kontrakt `{values}`/klient bez zmian. Test 12/12. Functional PASS · CPU/SELECT OPEN. Rdzeń: `kv-batch-order.ts` |
| **Edge-Opt-B** batch-set CPU redukcja | **MASTER AUDIT COMPLETE · DF NOT STARTED · IMPL BLOCKED** | — | SSOT: [`EDGE-OPT-B-MASTER-AUDIT.md`](EDGE-OPT-B-MASTER-AUDIT.md). Hotspot `batch-set` (saveDailyFullBackup + rotacje + fan-out get). Next: **B1** gate `saveDailyFullBackup`. Gate: Performance Observation zamknięta |

**Dwa problemy (z czym mamy problem):**
- **(A) batch-set HTTP 500** — najpr. *statement timeout* na `kv.mset` całego bundla (**H1 UNCONFIRMED** — brak dowodu prod: requestId/error/stack/Postgres log). Wciąż otwarte.
- **(B) Resurrection** — usunięty pracownik wracał na innym urządzeniu. **Root cause:** `kw-week-employees-deleted-ids` był **wyłącznie lokalny** + merge UNION. **ZAADRESOWANE** przez **PR-PAY-S7-5 ETAP 1** (`ae132bc`, DEPLOYED): tombstony współdzielone cross-device + Edge filtruje przed UNION. **Czeka na potwierdzenie multi-device (AC8–AC11)** w Performance Observation — do tego czasu OPEN, nie CLOSED.

**Program naprawy (SSOT roadmapy):** [`EDGE-OPT-B-MASTER-AUDIT.md`](EDGE-OPT-B-MASTER-AUDIT.md) (Edge-Opt-B split B1–B5) · [`EDGE-OPT-A-BATCH-GET-ORDER-PRESERVING-DESIGN-FREEZE.md`](EDGE-OPT-A-BATCH-GET-ORDER-PRESERVING-DESIGN-FREEZE.md) · [`PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md).

### Payroll Process Design — 🔒 PROCESS COMPLETE (LOCK) · 2026-07-03

Faza projektowania procesu Payroll **zamknięta** (PROJECT PROCESS COMPLETE). Dokumenty procesu = LOCK; aktywne pozostają tylko techniczne P0 (S7-5, F1, S7-4A observation).

| Dokument | Rola |
|----------|------|
| [`PAYROLL-CERTIFICATION-SUITE.md`](PAYROLL-CERTIFICATION-SUITE.md) | zestaw regresyjny — 27 funkcji, 10 multi-device, Smoke/Regression, BUG register |
| [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) | bramka pre-merge L1–L4, macierz typ→poziom, BLOCKED/ALLOWED |
| [`QUALITY-GATE-INTEGRATION-PLAN.md`](QUALITY-GATE-INTEGRATION-PLAN.md) | integracja z workflow (`TEST → QUALITY GATE → COMMIT`) |
| [`PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md`](PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md) | wariant B — 5 bundli, INV-1…INV-9, KPI, migration |
| [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) | audyt requestów/egress → zasila PR-PERF-S1 |

**BACKLOG (gated):** `PAYROLL-ARCHITECTURE-v3.md` (nieutworzony) · reorg `docs/payroll/`. **Następny krok:** Production Observation S7-4A → S7-5 ETAP 1 (owner GO) → REPRO F1.

### STABILIZATION WINDOW — **ACTIVE** (po NG-04)

| Pole | Wartość |
|------|---------|
| **Start** | 2026-07-01 · prod **2.63.12** |
| **Zasada** | **Brak nowych epiców** — maintenance + drobne wydania docs/test |
| **Plan** | [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) |
| **Raport tygodniowy** | [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md) |

**Dla agentów AI:** przed kodem sprawdź `CURRENT-TASK.md` § STABILIZATION WINDOW. Zmiany Przetargów wymagają respektu NG-04 Principles #001–#010 i zamrożonego NG-02 runtime. Incydent P0 → `INCIDENTS-2026-06.md` + wpis w raporcie tygodniowym.

### Epici zamknięte (nie rozpoczynaj bez nowego AUDIT + polecenia)

| Epic | Wersja / commit | Status |
|------|-----------------|--------|
| **M-03** Mobile Re-certification | **2.63.79** · `f7878fe` | **CLOSED** · breakpoint 430px · AC-M03-08 · STABILIZATION maintenance |
| **PLATFORM-SYNC-01A** reconcile notatek | **2.63.33** · `a4cd5c2` | **CLOSED** · archive race · ETAP B ON HOLD |
| **FEATURE Bundle B** Owner View P2A | **2.63.32** · `119576c` | **CLOSED** · pdf_text work scope |
| **SYNC-ARCH-01 RC-B** (pełny program) | **2.63.30–31** | **CLOSED** · PWRB · prod verified |
| **NG-04 Kosztorys Workspace PRO** | 2.63.9–12 · **`ab6637f`** | **EPIC CLOSED** · BOQ Explorer · Principles #001–#010 |
| **NG-03 Tender Workspace UX** | 2.63.0–7 | **EPIC CLOSED** · Command/Content · 5 tabów |
| **NG-01 Trust Layer** | w serii 2.63.x | **SHIPPED** · `tender-trust-layer.ts` |
| **NG-02 Tender Automation Pipeline** | 2.62.95–98 · **`aeecdc0`** | **CLOSED** · auto discovery → heavy → pricing · 177 test PASS |
| **Mobile Recovery** | 2.62.78–79 · `78582db`→`4397eac` | **CLOSED** · smoke 7 PASS / 1 BLOCKED · bugs **NONE** |
| **P1 Audit Hub WM** | 2.62.74–77 · `b4fde0c`→`21d4a1b` | **CLOSED** — 7 źródeł Hub · `wm_druk` · 10 akcji WM |
| **Recovery Pack off-site** | 2.62.72 · `6cd8ebe` | **CLOSED** · OFFSITE READY · `WGDOM-RP-2.62.72-20260626` |
| **Workflow Architecture V4** | 2.62.64–72 | **CLOSED** — Hub, Process Strip, Sticky CTA |
| **Workflow Cleanup P0** | 2.62.72 | **CLOSED** |
| **Kosztorys Process UX P0** | 2.62.64 | **CLOSED** |
| **Audit Hub MVP-0→1B** | 2.62.36–41 | **CLOSED** — security log, recovery events |
| **WM Schematy + ZI 2026 + EM-P1R** | 2.59–2.62 | **CLOSED / STABLE** |
| **TEST-INFRA-001** harness MVP | **2.63.26** · `3d6dd90` | **CLOSED** · manifest + orchestrator + PAYROLL-GUARD-S1 |
| **TI-B4** smoke agregat Przetargi | **2.63.27** · `6c94223` | **CLOSED** · manifest 1.1.0 · Gate B `scope:tenders` · **Z-04 PASS** |
| **Audit Hub freshness AH-REG-1** | 2.63.25 · `d9ba13f` | **CLOSED** · notify + AUX pull on sync |
| **Payroll Restore Banner RB** | 2.63.24 · `727e6c4` | **CLOSED** · `payrollMetrics` zamiast richness |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B6** | 2.63.23 · `d670892` | **CLOSED** · Edge parity `mergeWeekEmployees` |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B5** | 2.63.22 · `187afb8` | **CLOSED** · closed week UI read-only |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B4** | 2.63.21 · `b3d5664` | **CLOSED** · `finalizePayrollBundleMerge` SSOT |
| **PAYROLL Guard Phase B3–B3.2** | 2.63.18–20 · `45eddaa`→`6afd9fd` | **SERIES CLOSED** · `CloudSyncMutationGuard` roster |
| **PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0** | 2.63.16 · `31a687a` | **CLOSED** · `CloudSyncMutationGuard` · unit T11–T13 |
| **PAYROLL-CLOUD-RECOVERY hotfix P0** | 2.63.15 | **CLOSED** · `mergeWeekEmployees` UNION |

**Epic closeout NG-02 Pipeline:** [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md)
**Epic closeout Mobile Recovery:** [`SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md`](SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md)
**Epic closeout P1 Audit Hub WM:** [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](../audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md)
**SSOT techniczny wm_druk:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.6**

### P1 Audit Hub WM — skrót (4 etapy)

| Etap | Wersja | Commit | Zakres |
|------|--------|--------|--------|
| 1 infra | 2.62.74 | `b4fde0c` | `kw-wm-druk-audit-log` · adapter `adaptWmDrukAudit` |
| 2 Pomiary | 2.62.75 | `c31e1bd` | `rap_*` · `docx_exported` · `zip_exported` |
| 3 Schematy | 2.62.76 | `36718cc` | `schematic_*` · `measurement_imported` · `pdf_exported` |
| 4 UX Hub | 2.62.77 | `21d4a1b` | filtr `wm_druk` · chip · deep link labels · Help |

**Rozdzielenie źródeł:** `wm_print` = Odbiory/historia generacji · `wm_druk` = Pomiary/Schematy/Katalog.
**Wykluczone świadomie:** `schematic_edited` (anti-flood) — backlog P1.1.

Szczegóły commitów → `docs/PROJECT-HANDOFF-CURRENT.md` § 1a, § 2.

### TEST-INFRA-001 — Infrastruktura testowa · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** (prod **2.63.26** · `3d6dd90`) |
| **SSOT** | [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) |
| **Zakres MVP** | Manifest SSOT · orchestrator `npm run test:infra` · Payroll Harness PAYROLL-GUARD-S1 |
| **Post-MVP backlog** | **TI-B1** `removeWeekEmployee()` lib · **TI-B2** `HARNESS_SANDBOX_JOB_IDS` (P0 gate) · **TI-B3** CI gate · **TI-B4** — **CLOSED** |

**Release Przetargów (Gate B):** `npm run test:infra -- --gate B --scope tenders` · suite `smoke-stabilization-ng01-04`

**Dla agentów AI — zasady:**

1. **Nie** rozszerzaj TEST-INFRA bez polecenia (STABILIZATION WINDOW).
2. **Nie** duplikuj logiki domenowej — SSOT import only (#015).
3. **Prod harness L5:** Principle **#018** — tylko sandbox joby; **TI-B2** przed pierwszym prod run.
4. **Komendy:** `npm run test:infra:validate` · `npm run test:infra -- --gate B --scope payroll` · `npm run test:infra -- --gate B --scope tenders` · `npm run test:e2e:payroll-guard`

**Powiązane (prod CLOSED):** [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md)

### TI-B4 — Smoke agregat Przetargi · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** (prod **2.63.27** · `6c94223`) |
| **SSOT** | [`TI-B4-CLOSEOUT.md`](TI-B4-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) § scope tenders |
| **Artefakt** | `scripts/test-tenders-stabilization-smoke.mjs` — 12 child lib NG-01–04 |
| **Manifest** | `test-infra/test-manifest.json` v**1.1.0** · `SMOKE-TENDERS-NG01-04` |
| **Z-04** | **PASS** (STABILIZATION · M-02 CLOSED) |

**Dla agentów AI:** release dotykający Przetargów → Gate B `--scope tenders`. **Nie** duplikuj child scripts w orchestratorze — lista tylko w agregatorze (#028).

### Recovery Pack (dla programistów — tylko odczyt)

| Pole | Wartość |
|------|---------|
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` (poza repo) |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` |
| **Baseline** | `RECOVERY_PACK_COMMIT = 6cd8ebe` |
| **Tag Git** | `wgdom-recovery-pack-2.62.72` |

**Nie modyfikuj** packa ani orchestratora bez wyraźnego polecenia użytkownika.

---

## 3. Co robimy teraz / następne (2026-07-12)

**Production:** **GREEN** · UI prod **2.65.5** @ **`9307386`** · https://www.wgdom.fun · **PRODUCTION VERIFIED**

**Faza bieżąca — STABILIZATION WINDOW (brak aktywnego programu):**

1. **ROBOTS-INSPECTOR-01** — **CLOSED** · **PRODUCTION VERIFIED** · SSOT [`architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md`](architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md).
2. **PAYROLL-ARCHIVE-01** — **CLOSED** · prod **2.65.4** @ `872e171`.
3. **NG11-P0** — **EPIC COMPLETE** · SSOT [`architecture/NG11-P0-EPIC-CLOSE-REPORT.md`](architecture/NG11-P0-EPIC-CLOSE-REPORT.md).
4. **Następny bundle (Owner GO):** **NG11-Q4** (optional) lub **TWSL 2.63.91** (WIP lokalny).
5. **STABILIZATION WINDOW** — **ACTIVE** · **nie implementuj** bez Owner GO.

**Zasada:** zero IMPLEMENT bez Owner GO · #CORE-013 + #CORE-014 · **Lista Płac — § 2b MUST**.

| Priorytet | Temat | Klasa | Status | SSOT |
|-----------|-------|-------|--------|------|
| **NEXT** | **NG11-Q4** (optional Edge) | CORE-adjacent | **BLOCKED** · Owner GO | pipeline perf DF |
| **ALT** | **TWSL** release | FEATURE UI | **BLOCKED** · osobny commit | TWSL DF |
| **—** | STABILIZATION · nowy bundle | — | Owner GO + **AUDIT** | `STABILIZATION-WINDOW-PLAN.md` |

**WIP w tree (nie commitować razem z continuity):** `TenderScrollableAccordion.tsx` · `TenderPrzetargWorkspace.tsx` · `tender-ux-tokens.ts` · skrypty audit-* · recovery docs · `.tmp/`.

**Deploy:** push `main` → Vercel · verify **jedno** `Invoke-RestMethod` `https://www.wgdom.fun/version.json` · **docs-only push nie zmienia wersji UI**.

### AD-10 Stabilization — postęp sesji (2026-07-02)

> **Tracker + artefakty audytu poza repo:** `../WGDOM1-branch-audit/` (zasada AD-10 — **nie** twórz artefaktów audytu w repo). Plik statusu: `AD-10-LOCAL-STATUS.md`. Nowy agent: **najpierw przeczytaj ten katalog**, nie odtwarzaj audytów od zera.

| Zadanie | Status | Dowód / lokalizacja |
|---------|--------|---------------------|
| **MOBILE-P0-S1** | **CLOSED** (feature branch) | `stabilization/mobile-p0-s1` · `2350e86` · goToView `reconcileModalScrollLock` · smoke 14/14 |
| **M-03 Mobile Re-Certification** (feature branch · scroll SSOT) | **CLOSED** (feature branch) | `stabilization/mobile-p0-s2` · `e4eb733` · NG-03 C1–C7 · smoke 20/20 |
| **M-03 Mobile Re-certification** (main · breakpoint cliff) | **CLOSED** · **PRODUCTION VERIFIED** | **`main`** · **`0f8a165`**+**`f7878fe`** · prod **2.63.79** · [`M-03-MOBILE-RECERT-DESIGN-FREEZE.md`](architecture/M-03-MOBILE-RECERT-DESIGN-FREEZE.md) |
| **M-03.1 Certification Coverage** | **CLOSED** (feature branch) | `stabilization/mobile-field-cert-m03-1` · `0988eb2` · `docs/testing/MOBILE-FIELD-CERTIFICATION.md` §4.7 (NG-03) + §4.8 (BOQ) |
| **Z-05 FIELD VALIDATION** | **PENDING (Device Required)** | trylogia kod/docs CLOSED; wykonanie terenowe iPhone Safari — plan `FIELD-VALIDATION-EXECUTION-PLAN.md` (poza repo) |
| **M-05 Payroll Etap 1 regresja** | **CLOSED (AUDIT PASS)** | suite `lib-payroll-core` 10/10 + Etap 1/race/carry PASS · B1–B6+RB CLOSED · 0 regresji · jedyny FAIL = P3 test hygiene (time-dependent) |
| **W01 Weekly Metrics** | **CLOSED — Health GREEN** | Z-02/Z-03/Z-04/Z-06 PASS · Z-01 ACCRUAL · Z-05 Device · Z-07 Owner |

**Feature branche mobilne NIE są zmergowane do `main`** — czekają na FIELD VALIDATION (Z-05) → decyzja właściciela. Drzewo robocze `main` może zawierać niezcommitowany WIP mobile/tenders z pierwotnego splitu (kod payroll pozostaje = stan prod).

**Następne (na polecenie):** wykonanie FIELD VALIDATION na urządzeniu → raport PASS/FAIL → Z-05 · M-04 egress monitoring · E2E-PAYROLL-GUARD-S1 (gate C) · de-flake `test-payroll-extra-cost-etap1`.

### Domknięcie sesji — rytuał (słowo-klucz)

Na koniec sesji **zaktualizuj dokumentację ciągłości i zrób commit docs**. Wyzwalacz: użytkownik pisze **„domknij WGDOM”** (alias: „zamknij sesję WGDOM”, „aktualizuj docs WGDOM”). Procedura — patrz `.cursor/rules/wgdom-domkniecie-sesji.mdc`.

---

## 4. Architektura aplikacji (skrót)

### 4.1 Warstwy

```text
┌──────────────────────────────────────────────────────────────┐
│  PWA (React + Vite + TypeScript)                             │
│  src/app/          — UI, routing, widoki                     │
│  src/lib/          — logika domenowa (SSOT biznesu)            │
├──────────────────────────────────────────────────────────────┤
│  LocalStorage  ←── merge/push ──→  Supabase KV (DATA_KEYS)   │
│  Pliki         ←── upload ──────→  Storage + Edge Function    │
└──────────────────────────────────────────────────────────────┘
```

| Warstwa | SSOT | Uwaga |
|---------|------|-------|
| Sync / merge | `src/lib/cloud-sync.ts` | **KRYTYCZNE** — ARCHITECTURE § 11 |
| Wersja UI | `src/app/changelog-data.ts` | `CHANGELOG[0].version` |
| Wersja deploy | `dist/version.json` | generowane w `vite.config.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/` | KV, storage, email, BZP proxy |

### 4.2 Role użytkowników

| Rola | Wejście | Shell / stan |
|------|---------|--------------|
| **Admin** | Login admin | `App.tsx` — `useLocalStorage` / sync globalny · `AdminViewRouter` |
| **Inspektor terenowy** | Przycisk Inspektor | `InspectorPanel.tsx` — **osobny** `jobsAll` + `refreshFromCloud` (nie stan admina) |
| **Pracownik** | Telefon + PIN | `WorkerPhotoView` |

```text
AppInnerWithAuth
├─ admin     → AppInner (App.tsx) — kw-jobs w stanie app + CloudLoader
├─ inspector → InspectorPanel — kw-jobs → useState(jobsAll) → jobsVisible
└─ worker    → WorkerPhotoView
```

**Inspektor (ważne):** UI czyta `jobsVisible = filterJobsForInspector(jobsAll, session.id)`. Bug `setJobsAllAll` (CLOSED `e9720de`) zostawiał UI=0 przy pełnym LS. Filtr assignment: 15× szymon / 2× Zofia — **bez zmian** w hotfixcie.

### 4.3 Mapa widoków admina

**Pełna tabela:** [`AGENT-APP-MAP.md`](AGENT-APP-MAP.md) § 2 · ARCHITECTURE § 15.1 · **Router:** `AdminViewRouter.tsx` · **Menu:** `admin-nav.ts`

| `view` | Etykieta | Komponent główny |
|--------|----------|------------------|
| `dashboard` | Pulpit | `DashboardView.tsx` |
| `payroll` | Lista Płac | `PayrollView.tsx` |
| `schedule` | Grafik | `App.tsx` |
| `jobs` | Roboty | `JobsView.tsx` |
| `operationalnotes` | Notatki operacyjne | `OperationalNotesView.tsx` |
| `audit` | Audit Hub | `AuditHubView.tsx` (Super Admin) |
| `tenders` | Przetargi | `TendersModule.tsx` |
| `wmprint` | Odbiory WM Druk | `WmPrintView.tsx` (+ Pomiary, Schematy) |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` |
| `media` | Zdjęcia i pliki | `MediaView.tsx` |
| `inspector` | Inspektor (admin feed) | `InspectorAdminView.tsx` |
| `guide` | Zmiany / Instrukcja | `GuideView.tsx` |

**Mobile:** bottom nav — Pulpit · Lista Płac · Grafik · Roboty; reszta w „Więcej”.

**Nie czytaj** `App.tsx` od zera (~15k linii) — grep po nazwie widoku lub ARCHITECTURE § 15.

### 4.4 Lista Płac — sync i merge (SSOT po B4 + Resurrection fence)

**Closeout B4:** [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · Guard: [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md)
**Resurrection fence (2.65.35):** [`architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md)
**Rollover ALIGN/ROLLOVER (2.65.34):** [`architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md`](architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md)

```text
PayrollView.tsx / App.tsx
  persistPayrollRoster ──► withKwWeekEmployeesAsyncMutation (B3 guard)
  syncWeekRatesFromDirectory ──► guard roster (R2)
  autoArchiveAndAdvance ──► classifyPayrollWeekTransition (ALIGN | ROLLOVER)
                         ──► pushPayrollWeekAfterRollover + guard (R3)

CloudLoader (F5 / pierwszy mount)
  mergeAllDataKeys → applyBootstrapPayrollMerge → finalizePayrollBundleMerge
  → evaluatePayrollResurrectionFenceForBundle
  → bootstrapMergedShouldPush(..., fence)   ★ nie pushuj stale LS na empty Cloud
```

| Warstwa | Plik | Klucz KV |
|---------|------|----------|
| UI Lista Płac | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo` |
| Merge SSOT | `cloud-sync.ts` — `finalizePayrollBundleMerge` | po `mergeAllDataKeys` |
| Freshness fence | `payroll-bootstrap-resurrection-fence.ts` | blokuje resurrection z LS |
| Guard mutacji | `cloud-sync-mutation-guard.ts` | `kw-week-employees`, `kw-jobs` |
| Przydziały robót | `PayrollJobAssignmentsPanel.tsx` | `job.workEntries[]` w `kw-jobs` |

**Testy:**
`npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs`
`npx vite-node scripts/test-payroll-cloud-resurrection-01.mjs`
`npx vite-node scripts/test-payroll-p0-week-rollover-01.mjs`

**Nie wolno:** preferować bogatszego LS nad intentional empty Cloud przy bootstrap; klonować archive 13–18 → 20–25 tylko dlatego że „ma dane”.

---

## 5. Moduł Przetargi — struktura funkcji

**SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md` (obowiązkowe przed zmianą UI Przetargu).

### 5.1 Nawigacja modułu (`TendersModule.tsx`)

| Zakładka | Plik | Rola |
|----------|------|------|
| Lista | `tenders/tabs/TendersListTab.tsx` | Pipeline BZP, filtry, Client Bar |
| Strategia | `tenders/tabs/TendersStrategyTab.tsx` | GO/HOLD, prognoza, health — **jedyny** slot strategii |
| Mapa | `tenders/tabs/TendersMapTab.tsx` | Geolokalizacja przetargów |
| Profil firmy | `tenders/tabs/TendersProfileTab.tsx` | Profil wykonawcy |
| Baza cen | `tenders/tabs/TendersPriceBaseTab.tsx` | P3 pricing |
| Ustawienia | `tenders/tabs/TendersSettingsTab.tsx` | Konfiguracja modułu |

**Provider:** `TendersProvider.tsx` — wspólny pipeline dla Pulpitu (`TendersShortcutPanel`) i modułu Przetargi.

### 5.2 Detal przetargu (V4 Workspace)

```text
TenderDetailPanel.tsx          ← shell zakładek V4
├── TenderWorkflowHub          ← EPIC A: postęp, blokery, prep (Hub)
├── TenderWorkflowProcessStrip ← EPIC B: pasek Dokumenty→Oferta
├── TenderWorkflowPrimaryAction← EPIC C: jedno sticky CTA
├── TenderAttachmentsPanel     ← Dokumenty: grouped list (tender-grouped-documents.ts)
├── DocumentSummaryHeader      ← nagłówek podsumowania dokumentów
├── Kosztorys / Wycena / Oferta / Decyzja … (sloty V4)
└── buildTenderIntelligenceContext()  ← jedno źródło kontekstu (anti-duplikacja)
```

### 5.3 Kluczowe lib (Przetargi) — mapa tematyczna

| Temat | Pliki SSOT |
|-------|------------|
| Pipeline BZP / sync | `tenders-bzp.ts`, `tenders-sync.ts` |
| Dossier / parse / merge | `tender-dossier-pipeline.ts`, `tender-dossier-merge.ts`, `tenders-bzp-doc-parse.ts` |
| Workflow UI | `tender-workflow-hub.ts`, `tender-workflow-process-strip.ts`, `tender-workflow-primary-action.ts` |
| Intelligence / CTA | `tender-intelligence-context.ts`, `tender-intelligence-next-action.ts` |
| Dokumenty UI | `tender-grouped-documents.ts`, `tender-workspace-ux.ts`, `tender-document-summary-header.ts` |
| Kosztorys UX | `tender-kosztorys-process-phase.ts`, `tender-kosztorys-process-health.ts` |
| Strategia | `tenders-strategy-*.ts` (wiele modułów — grep przed nowym plikiem) |
| Owner View / P1 | `tender-executive-summary.ts`, `tender-work-scope-inference.ts` |

**Zasada:** rozszerzaj istniejące lib; nie duplikuj klasyfikatorów dokumentów.

### 5.4 Smoke regresji Przetargów

```bash
npx vite-node scripts/test-tender-workflow-hub.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npx vite-node scripts/test-tender-workspace-ux.mjs
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
npm run build
```

---

## 6. Inne domeny (skrót)

| Domena | Widok | Lib / handoff |
|--------|-------|---------------|
| **WM Druk + ZI 2026** | `WmPrintView.tsx` | `ZI-2026-HANDOFF.md`, ARCHITECTURE § 12.1.8 |
| **Pomiary Elektryczne** | tab w WM Druk | `SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` |
| **Schematy** | tab w WM Druk | `SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md` |
| **Notatki operacyjne** | `OperationalNotesView.tsx` | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **Audit Hub** | `AuditHubView.tsx` | **7 źródeł** — MVP-1B + **P1 wm_druk** · § 15.2, § 15.6 |
| **WM Druk audit** | `WmPrintView.tsx` + lib | `wm-druk-audit.ts` · `kw-wm-druk-audit-log` · `recordWmDrukAudit` |
| **Lista Płac** | `PayrollView.tsx` | `SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md` |
| **Work Catalog (#5C)** | `WorkCatalogView.tsx` · Przetargi wycena | `@/lib/work-catalog` · `saveWorkCatalogRouted` · read SSOT `resolveActiveCatalogForTender` · **F3 BLOCKED** — [`CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md`](architecture/CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md) |
| **Roboty** | `JobsView.tsx` | `job-*.ts`, inspektor w `InspectorPanel.tsx` |

---

## 7. Struktura repozytorium

```text
WGDOM1/
├── src/
│   ├── app/                 UI — widoki, TendersModule, App.tsx (monolit shell)
│   │   ├── admin/           AdminViewRouter, admin-nav
│   │   └── tenders/         Przetargi 3.0 (tabs, strategy, provider)
│   ├── lib/                 ★ logika domenowa (~100+ plików tender-*)
│   └── config/supabase.ts
├── supabase/functions/make-server-0afb8820/   Edge API
├── scripts/                 testy vite-node, backup, recovery (nie commitować _tmp*)
├── docs/                    SSOT, handoffy, ARCHITECTURE
├── audit/                   raporty śledcze (wiele plików lokalnych)
├── public/                  PWA, szablony PDF/DOCX
└── e2e/                     Playwright
```

**Poza repo:**
- `../WGDOM-RECOVERY-PACK/` — Recovery Pack (off-site backup).
- `../WGDOM1-branch-audit/` — **tracker AD-10 + artefakty audytu/CLOSEOUT/DESIGN-FREEZE** (zasada AD-10: audyty **poza** repo). Zawiera `AD-10-LOCAL-STATUS.md`, raporty M-05/W01, plany FIELD VALIDATION.

**Nie commitować:** `scripts/_tmp*`, większość `audit/*.pdf`, `.env`, artefakty packa, artefakty z `../WGDOM1-branch-audit/`.

---

## 8. Workflow deweloperski (obowiązujący)

```text
AUDIT → PLAN → IMPLEMENT → TESTY → BUILD → COMMIT → PUSH
→ VERIFY DEPLOY → HOUSEKEEPING → EPIC CLOSE
```

| Etap | Co robić |
|------|----------|
| **AUDIT** | Świeży przegląd SSOT + `git status` przed każdym nowym EPIC-em |
| **PLAN** | Zakres IN/OUT — nie rozszerzać bez polecenia |
| **IMPLEMENT** | Minimalny diff · chmura dla trwałych danych |
| **TESTY / BUILD** | Smoke relevant + `npm run build` |
| **VERIFY** | Jedno `version.json` — bez pollingu |
| **HOUSEKEEPING** | `CURRENT-TASK.md` + `PROJECT-HANDOFF-CURRENT.md` |
| **EPIC CLOSE** | Raport w `audit/` + Lessons Learned |

| Typ zmiany | Bump wersji? |
|------------|--------------|
| Feature / fix UI | Tak — `changelog-data.ts` + `CHANGELOG.md` |
| Docs only | Nie (chyba że user prosi o release) |

Szczegóły: `docs/WORKFLOW-RELEASE-DEPLOY.md` · `AGENTS.md`

---

## 9. Czego nie ruszać bez polecenia

- `cloud-sync.ts` — merge, DATA_KEYS, Payroll Guard, **S7-5-1 sync tombstonów** (`kw-week-employees-deleted-ids` w push/pull/merge PRZED finalize)
- **Edge `batch-set` tombstone-aware (S7-5-2)** — filtr `weekEmployeeTombstoneKeySetForWeek`/`filterWeekEmployeesByTombstones` PRZED `mergeWeekEmployeesUnion` (także restore); nie usuwać — to guard resurrection
- **Edge `batch-get` / `kv.mget` (Edge-Opt-A)** — kontrakt order-preserving + null-fill (`kv-batch-order.ts`); NIE używać wadliwego wzorca `Promise.all(keys.map(get))` ani nie-uporządkowanego `mget`
- **Kontrakt kluczy backupu** (`-prev`/`-prev2`/`-day`/`kw-full-day-*`) + reguła „richness-max" — twarda granica dla restore (patrz Edge-Opt-B audit)
- Parsery dossier / ATH / PDF — bez testów TP113/TP182
- Edge Function semantics (email, storage paths)
- Canonical ZI template KV (`2b22da48…`)
- Recovery Pack orchestrator / pack root
- Command Center — **usunięty**, nie przywracać

---

*Ostatnia aktualizacja: 2026-08-27 (**C2_PRODUCTION_CLOSEOUT_PASS** · P0 **`756e2cb9`** · P0.1 **`4c782b67`** · C2 re-promotion **`C2_REPROMOTION_PASS`** · prod KV **43/43 rev5**) · tip UI **2.66.116** / **`4c782b6`** · SSOT DF [`architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md`](architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md) §30 · **STABILIZATION WINDOW ACTIVE** · **WAITING FOR NEXT OWNER GO** · **NIE** auto recovery / kolejny catalog write · cold-start [`AI/WGDOM-COLD-START-HANDOFF.md`](AI/WGDOM-COLD-START-HANDOFF.md) · tip SSOT [`AI/09_PRODUCTION_BASELINE.md`](AI/09_PRODUCTION_BASELINE.md)*
