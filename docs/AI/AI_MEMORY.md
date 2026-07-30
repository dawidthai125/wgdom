# AI_MEMORY — pamięć projektu WGDOM

> **To NIE jest pamięć ChatGPT.** To jest **kontrakt projektu** — rzeczy, których AI **nie wolno zapomnieć**.  
> **Czytaj na start każdej sesji** (≤ 5 min). Szczegóły → linki SSOT (bez duplikacji).  
> **Drzewo decyzji:** [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md)

```text
LISTA PŁAC = PRIORYTET #1
Nie zgaduj architektury. Nie obchodź guardów. Nie mieszaj FEATURE z CORE.
```

---

## Fundamental Rules

1. Stack = **Vite + React SPA** — **nie** Next.js / SSR.  
2. Trwałe dane → **Cloud Sync** (`persistKey` / Domain Push / PWRB) — nie tylko React state / samo LS.  
3. **STABILIZATION WINDOW** — nowy EPIC tylko po **Owner GO**.  
4. Commit / push **tylko** na wyraźną prośbę Ownera.  
5. Nie czytaj `App.tsx` od zera — mapa: [`../AGENT-APP-MAP.md`](../AGENT-APP-MAP.md).

**SSOT procesu:** [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) · [`../WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md)

---

## Architecture Principles

| Zasada | Znaczenie |
|--------|-----------|
| **SSOT** | Jedna reguła na domenę — nie duplikuj merge / write path · tip tylko w `09` |
| **REUSE FIRST** | Istniejąca facade (PWRB, Domain Push, `Wg*`) > nowy kod |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej ścieżki merge / persist / roster |
| **Thin Slice** | Jeden concern · cienki allowlist · DF · commit · PV · potem next |
| **Cloud First** | Nowy typ danych → `DATA_KEYS` + sync |
| **Boundary Check** | FEATURE ≠ CORE w jednym commit (#CORE-013) |
| **Fail-closed** | Guardy / fence zostają — nie „wyłącz na chwilę” |

**SSOT:** [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) · [`02_ARCHITECTURE.md`](02_ARCHITECTURE.md) · stan: [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)

---

## Foundation Lib (wgdom-foundation) — Phase 0 COMPLETE

| Pole | Wartość |
|------|---------|
| Status | **COMPLETE** · FND-01…05 na `origin/main` · tip git **`bed8dd8`** |
| Kod | `src/lib/wgdom-foundation/` (id · digest · errors · audit · events) |
| Integracja App | **NIE** — Przetargi / Roboty / Kadry / Kosztorysy **nie** używają jeszcze lib |
| FND-06 | **BLOCKED** — Observability bez Impl Spec (ADR / Blueprint najpierw) |
| SSOT | [`../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) |

**Nie mylić z:** UI Foundation v1.0 · Work Catalog `FOUNDATION-FREEZE-v1.0.md`.

**Nie:** implementacja FND-06 bez Spec · podłączanie domen bez EPIC · `git add -A` przy commitach Foundation.

---

## UI Foundation · GDS · Dashboard Body

| Warstwa | Status | Nie rób |
|---------|--------|---------|
| **GDS-01 + MAINT-01** | **CLOSED** · DS-13 | Parallel Button/Input/Modal · shadcn bez DF |
| **UI Foundation v1.0** | **COMPLETE** · ui-guard **9/9** | Regresja shell / T05 (≤1 hero Primary) |
| **Dashboard Body S1–S4** | **COMPLETE** · mid-body GDS | Second Primary w body · zmiana liczników V3 w paint |
| **S5 / S6** | BACKLOG (opcjonalne) | Auto-start bez Owner GO |

Closeout: Foundation [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) · Body [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md)

---

## AI-COST-01 (Kosztorysant) — FROZEN

| Pole | Wartość |
|------|---------|
| Status | **EPIC COMPLETE** · **FIELD READY** · **ARCHITECTURE FROZEN** |
| Pipeline | Snapshot → S1→S7 → Bid Proposal → UI |
| Oferta | **Tylko** `computeTenderBidProposal` (`offer_boq_ai`) — **zakaz** drugiego Kp/marży |
| STAB-01 | Preservacja edycji usera · grupy rekomendacji · klasyfikacja · pokrycie · explain · telemetria LS |
| AI-COST-02 | **COST-02-A CLOSED** (Modele cenowe · **2.65.62**) · dalsze slice **BACKLOG** · Starting Point + Owner GO |

**Nie:** przebudowa parserów „przy AI Cost” · kasowanie `user_changed`/`user_approved` przy reprice · scrapowanie cen ad-hoc.

---

## CENY-MATERIAŁÓW-04 P2 — COMPLETE · FEATURE-DATA

| Pole | Wartość |
|------|---------|
| **Status** | **P2 COMPLETE** · **CLOSED** · FEATURE-DATA WC (bez bumpa UI) |
| Slices | P2-A · P2-B · Residual ROZ amend |
| KPI | K-P2-1/2/3 **PASS** · residual ROZ **16≤18** · false **0** · P1 **10/7/7** · CM **73.6%** |
| Pipeline | CSV → `commitMarketQuotesImport` → WC → `controlled_market` |
| OUT | P3 INNE (osobny cykl) · AI-COST · scoring · Bid · Cloud CORE · parser |
| NEXT | **P3 (INNE) AUDIT** — Owner GO → AUDIT→PLAN→DF |

**SSOT:** [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md)  
Amend: [`RESIDUAL-ROZ-AMEND`](../architecture/CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-AMEND-COMPLETE.md)

## CENY-MATERIAŁÓW-04 P1 — COMPLETE · FEATURE-DATA

| Pole | Wartość |
|------|---------|
| **Status** | **P1 COMPLETE** · tip UI **2.65.83** · feature P1-C **`992023cc`** · PV **PASS** |
| Slices | P0 · P1-A (10) · P1-B (7) · P1-C (7) — Quotes 100% · known/new false **0** |
| KPI 18 | CM **73.2%** · HE **26.8%** |
| Pipeline | CSV → `commitMarketQuotesImport` → WC → `controlled_market` |
| OUT | AI-COST · scoring · providerzy · Bid · Cloud Sync CORE |
| NEXT | **P2 COMPLETE** → **P3 (INNE) AUDIT** |

**SSOT (KPI · lessons · OUT · NEXT):** [`CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md)  
Slice closeouts: [`P1-C`](../architecture/CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md) · [`P1-B`](../architecture/CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md) · [`P1-A`](../architecture/CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) · [`P0`](../architecture/CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE.md)

## CENY-MATERIAŁÓW-04 P1-C — CLOSED · FEATURE-DATA

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · tip UI **2.65.83** · feature **`992023cc`** · PV **PASS** · 7 robót WC elewacje/ocieplenia + Quotes 7/7 · OV PASS |
| IN / OUT / NEXT | → [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |

**SSOT slice:** [`CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md)

## CENY-MATERIAŁÓW-04 P1-B — CLOSED · FEATURE-DATA

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · tip UI **2.65.82** · feature **`dca25c96`** · PV **PASS** · 7 robót WC ogrodzenia + Quotes 7/7 · OV PASS |
| IN / OUT / NEXT | → [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |

**SSOT slice:** [`CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md)

## CENY-MATERIAŁÓW-04 P1-A — CLOSED · FEATURE-DATA

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.81** · feature **`dc0daea0`** · PV **PASS** · 10 robót WC + Quotes 10/10 · OV FINAL PASS |
| IN / OUT / NEXT | → [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |

**SSOT slice:** [`CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) · [`OV FINAL`](../architecture/CENY-MATERIAŁÓW-04-P1-A-OWNER-VERIFICATION-FINAL-COMPLETE.md)

## CENY-MATERIAŁÓW-01 — CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.80** · feature **`d4d05706`** · PV **PASS** |
| Flag | `kw-ceny-materialow-01` default **OFF** |
| IN | CM-0 KPI · CM-1 mapping uplift · CM-2 quotes gaps · CM-3 memo (OfferBoq build) |
| OUT | tabele/SKU/scraper · reorder providers · Bid · Cloud CORE · GAP-B/1,6M |
| NEXT | CM-04 **P1 COMPLETE** · dalej **P2 AUDIT** / GAP-B / I3 / TP200B |

**SSOT:** [`CENY-MATERIAŁÓW-01-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-01-CLOSEOUT.md) · [`CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md`](../architecture/CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md)

## WORK-CATALOG-P3.3 — CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.79** · feature **`e10a1511`** · PV **PASS** |
| IN | S4 CSV commit/rollback · S5 coverage Engine · S6 mobile · flaga `kw-wc-p33-market-pricing-ux` default OFF |
| OUT | MPI · D-C companyPrice · parsers · Bid · AI-COST core · Payroll · cloud-sync · rewrite P3.1/P3.2 |
| NEXT | **GAP-B / I3 / TP200B** — Owner GO → DF (nie kontynuacja P3.3 bez briefu) |

**Nie:** re-open Phase 1 bez briefu · CTA rynek→companyPrice · MPI przy okazji.

**SSOT:** [`WORK-CATALOG-P3.3-CLOSEOUT.md`](../architecture/WORK-CATALOG-P3.3-CLOSEOUT.md) · [`WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md`](../architecture/WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md)

---

## AI-COST-02-B — CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.78** · feature **`9dc113e7`** · PV **PASS** |
| IN | Explain RO + impact Queue · flaga `kw-ai-cost-02-b-explain-queue` default OFF · UI-only |
| OUT | I3 Competitiveness · parsers · Bid calculator · GAP-A · Payroll |
| NEXT | WORK-CATALOG-P3.3 **CLOSED** · dalej **GAP-B / I3 / TP200B** |

**Nie:** re-open Phase 1 bez briefu · hardcode 1,6M · zmiana formuły impactScore w validation.

**SSOT:** [`AI-COST-02-B-CLOSEOUT.md`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`AI-COST-02-B-PRODUCTION-VERIFY.md`](../architecture/AI-COST-02-B-PRODUCTION-VERIFY.md)

---

## AI-COST-PARSER-01 P0-RETRY — CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.77** · feature **`e88d689f`** · deploy docs **`77a2f0f`** · PV **PASS** |
| Slice | F2 „Ponów” przy terminalnym `zipUnpackOk=false` → REUSE `applyForceHeavyRescanAt` + `retryNonce` |
| Wynik OPS | Fixture `08dee178` — świeży Heavy: unpack OK · ATH · `kosztorys.ok` |
| NEXT | **Work Catalog P3.3** (po 02-B CLOSED) — Owner GO → DF |

**Nie:** re-open P0-RETRY bez RCA · nowa pętla Heavy · ręczne nullowanie `parsedAt` poza Force path · parser rewrite „przy Ponów”.

**SSOT:** [`AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md`](../architecture/AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md)

---

## COST-BID-GAP-01 / GAP-A — CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip **2.65.77** / **`a061bbd`** · PV **PASS** |
| Slice | GAP-A: catalog rates · UNKNOWN classifier · marketQuotes REUSE · flaga default **OFF** |
| Residual | Bid ON ~1,21M vs Owner ~1,6M — **nie** hardcodować; GAP-B/C tylko po DF |
| NEXT | **Work Catalog P3.3** — Owner GO → DF |
| Handoff | [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md) |

**Nie:** re-open GAP-A bez briefu · drugi kalkulator Bid · Discovery/parsers przy kalibracji.

**SSOT:** [`COST-BID-GAP-01-CLOSEOUT.md`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) · [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md)

---

## COST-MULTI — SERIES CLOSED · PRODUCTION VERIFIED

| Pole | Wartość |
|------|---------|
| Status | **CLOSED** · tip UI **2.65.74–2.65.76** · FINAL PV **PASS** |
| Łańcuch | REGRESSION-01 → 02 → PARSER-01 → MULTI-01 → MULTI-02 → RCA Force Rescan → **AI-COST-PARSER-01 P0-RETRY** |
| Architektura | ONE (Discovery) · CostPackage · BranchPackage · Aggregate (Branch winners) · `resolveCostBidInput` → Bid / OfferBoq · Force Heavy Rescan |
| Polityka | **NIE** `sum(all)` · **TAK** Branch Winners · Feature Flags rollback |
| NEXT | COST-BID-GAP-01 **CLOSED** (GAP-A) · AI-COST-02-B **CLOSED** · dalej **Work Catalog P3.3** |
| Continuity | [`AI-CONTINUITY-UPDATE-01-REPORT.md`](../architecture/AI-CONTINUITY-UPDATE-01-REPORT.md) |

**Nie:** re-open COST-MULTI bez nowego RCA · Discovery rewrite „dla Aggregate” · bump `parserVersion` jako force · drugi kalkulator Bid · Payroll/`cloud-sync.ts` przy wycenie.

**SSOT:** [`COST-MULTI-CLOSEOUT.md`](../architecture/COST-MULTI-CLOSEOUT.md) · [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md)

---

## Payroll Critical Rules

- Godziny live → **tylko Domain Push** (nie RS `runCloudSync`).  
- Skład tygodnia → **tylko PWRB**.  
- `weekEmployeeFromDir` = **PURE**.  
- `skipPayrollGuard` ⇔ `intentionalHoursClear === true` (≠ week-clear po archive).  
- Fence resurrection + classifier ALIGN/ROLLOVER = **ACTIVE**.  
- D4 `-prev` banner ≠ archive Restore Banner.

**SSOT:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) · [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md)

---

## Cloud Sync Rules

- Merge Payroll = **UNION + tombstones** — nie replace „dla wygody”.  
- RS push **bez** `kw-week-employees` (#CORE-015).  
- Partial / fat keys → kontrakt persist `local` vs `cloud` (Sync Storm).  
- Nie `fetch` Edge prosto z UI poza facade.

**SSOT:** [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §11

---

## Bootstrap Rules

- Bootstrap = `CloudLoader` → merge → **fence** → mount.  
- Pusta chmura + bogaty LS ≠ „przywróć wszystko”.  
- Nie usuwaj `payroll-bootstrap-resurrection-fence` dla E2E/seed.

**SSOT:** SSOT Payroll §1 · Agent Guide · Resurrection closeout w tip `09`

---

## SSOT Rules

| Temat | Jeden dokument |
|-------|----------------|
| Tip prod | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| Zakazy globalne | [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) |
| Payroll AI | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Deploy | [`../WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md) |
| Sesja / stan | [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) · `CURRENT-TASK.md` · Continuity (po Entry) |
| UI Foundation | [`../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| Dashboard Body | [`../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **AI-COST-01 Freeze** | [`../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) |
| **AI-COST-01 SSOT** | [`../architecture/WGDOM-AI-COST-01-SSOT.md`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST Lessons** | [`../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AI-COST-02 start** | [`../architecture/WGDOM-AI-COST-02-STARTING-POINT.md`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) |
| **COST-02-A CLOSEOUT** | [`../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| **COST-02-A RELEASE** | [`../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) |
| **AI-COST-02-B** | [`../architecture/AI-COST-02-B-CLOSEOUT.md`](../architecture/AI-COST-02-B-CLOSEOUT.md) |
| **AI-COST-PARSER-01 P0-RETRY** | [`../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) |
| **COST-MULTI CLOSEOUT** | [`../architecture/COST-MULTI-CLOSEOUT.md`](../architecture/COST-MULTI-CLOSEOUT.md) |
| **Continuity UPDATE-01** | [`../architecture/AI-CONTINUITY-UPDATE-01-REPORT.md`](../architecture/AI-CONTINUITY-UPDATE-01-REPORT.md) |
| **NEXT EPIC candidates** | [`../architecture/NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md) |

Historyczne DF/RCA = czytaj przy potrzebie; **closeout CLOSED** = prawda statusu.  
Draft `WGDOM-AI-COST-01-ARCHITECTURE.md` = **SUPERSEDED**.

---

## Feature vs Write Path

| | FEATURE | WRITE-PATH / CORE |
|--|---------|-------------------|
| Przykład | Copy UI, Theme, TEUX | `cloud-sync`, merge, Domain Push, Edge, PWRB |
| Commit | Osobny bundle | Osobny CORE + DF + GO |
| Test | Smoke modułu | Gate B payroll + unit D2–D5 gdy hours |

FEATURE w oknie czasu **może współwystępować** z wipe LP **bez** bycia RC write-path — i tak: **nie mieszaj Shared**.  
→ [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) §8 · [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md)

---

## Mandatory Audit Rules

**AUDIT ONLY (docs)** gdy: nieznany objaw LP · Shared bez jasnego wpływu · Owner „sprawdź czy X psuje Payroll” · wipe / resurrection.  
**Nie** implementuj w trakcie AUDIT.

→ [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) · [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md)

---

## Mandatory Design Freeze Rules

**DF obowiązkowy** gdy: invariants · merge · guard · fence · nowy write path · nowy klucz KV · zmiana bootstrap.  
Cosmetic FEATURE bez CORE → Boundary Check, bez DF (chyba że Owner każe).

---

## Dependency Review Rules

Przed kodem w „innym” module:

```text
□ Czy diff = cloud-sync / CloudLoader / Edge / App payroll handlers?
□ Czy DATA_KEYS obejmuje kw-week-*?
□ Czy commit miesza FEATURE + CORE?
```

TAK → Payroll pack obowiązkowy. → [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md)

---

## Forbidden AI Behaviors

- Zgadywanie architektury / „temporary HACK” w CORE  
- Omijanie Domain Gate / PWRB / fence  
- Mixed FEATURE + CORE  
- `vercel deploy` / polling `version.json`  
- Commit sekretów / force push `main`  
- Start EPIC bez Owner GO  
- Hotfix merge po wipe bez RCA  
- Drugi kalkulator oferty / przebudowa AI-COST-01 bez DF  
- Auto-start kolejnego thin slice AI-COST-02 bez Owner GO + DF  
- Re-implementacja COST-02-A „przy okazji”

Pełna lista: [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) · [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) · [`LESSONS`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md)

---

## Common AI Mistakes

| Skrót | Skutek |
|-------|--------|
| `batch-set` z UI | Omija guardy |
| `skipPayrollGuard` zawsze | Hours Wipe |
| Soft Restore w `weekEmployeeFromDir` | Side-effects |
| Usunięcie fence „dla testów” | Resurrection prod |
| Refaktor merge „przy Jobs/Tenders” | Regresja LP po dniach |

→ [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md)

---

## Before Coding Checklist

```text
□ AI_MEMORY + AI_DECISION_TREE
□ 08_AI_GUARDRAILS + 09 tip
□ Dependency Map (Shared?)
□ Jeśli Payroll/sync → Quick Start → Guard Rails → Playbook → SSOT
□ FEATURE vs CORE sklasyfikowane
□ Owner GO jeśli IMPLEMENT CORE
□ DF jeśli write-path / merge / bootstrap
```

---

## Before Commit Checklist

```text
□ Diff ⊆ scope DF/brief
□ Zero mixed CORE+FEATURE
□ Brak secrets; nowe src tracked
□ Gate B payroll jeśli CORE
□ Owner poprosił o commit
```

---

## Before Push Checklist

```text
□ Owner poprosił o push
□ RELEASE A/B/C wg WORKFLOW-RELEASE-DEPLOY
□ Nie vercel CLI
□ Jedno curl version.json (bez pętli)
```

---

## Następny krok

→ [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) (§ NEXT) · [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) · Index: [`README.md`](README.md)
