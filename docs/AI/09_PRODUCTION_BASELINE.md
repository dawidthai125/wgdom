# 09 — Production Baseline (WGDOM)

> **★★ TIP SSOT — JEDYNE miejsce w docs z numerem wersji tipu dla AI.**  
> Inne pliki **linkują tutaj** — **nie** powielają UI version / commit tip.  
> **Aktualizacja:** przy każdym domknięciu release / docs tip na `main`.  
> **Live:** `https://www.wgdom.fun/version.json` · cross-check `git log -1` · `src/app/changelog-data.ts` (UI)

**Snapshot dokumentacji:** 2026-07-29 (**CENY-MATERIAŁÓW-01 CLOSED**) · tip UI **2.65.80** · feature **`d4d05706`** · PV **PASS**.

---

## 0. Jak AI czyta tip

```text
1. Ten plik (docs/AI/09_PRODUCTION_BASELINE.md)
2. Opcjonalnie curl version.json
3. NIE kopiuj tipu do AI_ENTRY / AGENTS / Continuity / cursor rules
```

Po release: zaktualizuj **tylko §1** (i krótki wiersz w §2). Reszta Knowledge Base bez bumpów numerów.

---

## 1. Production tip

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **UI version (changelog / version.json)** | **2.65.80** |
| **Deploy tip commit (`main` / `version.json`)** | **`e06ec2f`** (`e06ec2fe`) · docs PV/CLOSEOUT/SSOT · live po sync |
| **Feature tip (CENY-MATERIAŁÓW-01)** | **`d4d05706`** · **CLOSED** · **PRODUCTION VERIFIED** · mapping uplift · KPI · quotes gaps · memo · flaga `kw-ceny-materialow-01` default **OFF** · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-01-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md) · UI **2.65.80** |
| **Feature tip (WORK-CATALOG-P3.3)** | **`e10a1511`** · **CLOSED** · **PRODUCTION VERIFIED** · Market Pricing UX S4–S6 · flaga `kw-wc-p33-market-pricing-ux` default **OFF** · [`CLOSEOUT`](../architecture/WORK-CATALOG-P3.3-CLOSEOUT.md) · [`PV`](../architecture/WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md) · UI **2.65.79** |
| **Feature tip (AI-COST-02-B)** | **`9dc113e7`** · **CLOSED** · **PRODUCTION VERIFIED** · Explain + Queue · flaga `kw-ai-cost-02-b-explain-queue` default **OFF** · [`CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-02-B-PRODUCTION-VERIFY.md) · UI **2.65.78** |
| **Feature tip (AI-COST-PARSER-01 P0-RETRY)** | **`e88d689f`** · **CLOSED** · **PRODUCTION VERIFIED** · F2 soft-invalidate Ponów → Force Heavy · [`CLOSEOUT`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md) · UI **2.65.77** |
| **COST-BID-GAP-01 (GAP-A)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · flaga `COST_BID_GAP_01_CATALOG_CAL` default **OFF** · [`CLOSEOUT`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) · [`PV`](../architecture/COST-BID-GAP-01-PRODUCTION-VERIFY.md) · feature **`a061bbd`** · UI **2.65.77** |
| **COST-MULTI (seria)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · [`CLOSEOUT`](../architecture/COST-MULTI-CLOSEOUT.md) · [`RELEASE HISTORY`](../releases/COST-MULTI-EPIC-RELEASE-HISTORY.md) · FINAL PV [`../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md`](../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md) · UI **2.65.74–2.65.76** |
| **AI-COST-01** | **EPIC COMPLETE** · **FIELD READY** · **FROZEN** · FREEZE-01 handover — [`ARCHITECTURE-FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST-02** | **COST-02-A CLOSED** · **02-B Phase 1 CLOSED** · I3 / dalsze **BACKLOG** — [`STARTING-POINT`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) · [`02-B-CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`COST-02-A-CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| **Ostatni feature (Force Heavy Rescan)** | CTA „Uzupełnij odczyty branż” · `forceHeavyRescanAt` · REUSE Heavy — **CLOSED** · **FINAL PV PASS** · [`RCA`](../architecture/RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY.md) · [`CLOSEOUT`](../architecture/RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-CLOSEOUT.md) · UI **2.65.76** |
| **Ostatni feature (COST-MULTI-02)** | Aggregate Bid · `resolveCostBidInput` · Branch winners → Bid/OfferBoq — **CLOSED** · [`DF`](../architecture/COST-MULTI-02-DESIGN-FREEZE.md) · [`CLOSEOUT`](../architecture/COST-MULTI-02-CLOSEOUT.md) · UI **2.65.75** |
| **Ostatni feature (COST-MULTI-01)** | CostPackage · BranchPackage · SUM_BRANCH_WINNERS / HOLD · UX incomplete ONE — **CLOSED** · [`CLOSEOUT`](../architecture/COST-MULTI-01-CLOSEOUT.md) · UI **2.65.74** |
| **Ostatni feature (COST-PARSER-01)** | ZIP unpack A/B/C · 1× retry · HeavyDone gate — **`076781d`** · **CLOSED (code)** · [`RCA`](../architecture/COST-PARSER-01-HEAVY-PARSE-RCA.md) · [`DF`](../architecture/COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md) · [`IMPL`](../architecture/COST-PARSER-01-ZIP-UNPACK-IMPLEMENTATION-REPORT.md) · [`PV`](../architecture/COST-PARSER-01-ZIP-UNPACK-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/COST-PARSER-01-ZIP-UNPACK-RELEASE-REPORT.md) · [`CLOSEOUT`](../architecture/COST-PARSER-01-ZIP-UNPACK-CLOSEOUT.md) · UI **2.65.73** |
| **Ostatni feature (COST-REGRESSION-02)** | Discovery ZIP · `archive_candidate` · ZIP-aware F2 copy — **`c5c95ed`** · **CLOSED** · [`DF`](../architecture/COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md) · [`CLOSEOUT`](../architecture/COST-REGRESSION-02-DISCOVERY-ZIP-CLOSEOUT.md) · UI **2.65.72** |
| **Ostatni feature (COST-REGRESSION-01 EPIC A)** | F2 diagnostyka · macierz copy · CTA Dołącz/Ponów (reuse heavy) — **`0a96744`** · **CLOSED** · **PV** · [`DF`](../architecture/COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md) · [`CLOSEOUT`](../architecture/COST-REGRESSION-01-EPIC-A-CLOSEOUT.md) · UI **2.65.71** |
| **Ostatni feature (COSTORYS-UX-01 W2)** | Compact/Comfort · collapsed components · Search · Sort — **`ef122a5`** · [`DF`](../architecture/COSTORYS-UX-01-WAVE-2-DESIGN-FREEZE.md) · [`PV`](../architecture/COSTORYS-UX-01-WAVE-2-PRODUCTION-VERIFY.md) · [`CLOSEOUT`](../architecture/COSTORYS-UX-01-WAVE-2-CLOSEOUT.md) · UI **2.65.70** |
| **Ostatni feature (COSTORYS-UX-01 W1)** | Sticky oferta · full width · accordion · Evidence collapsed · filtr review — **`3e57e8d`** · [`DF`](../architecture/COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md) · [`PV`](../architecture/COSTORYS-UX-01-WAVE-1-PRODUCTION-VERIFY.md) · [`CLOSEOUT`](../architecture/COSTORYS-UX-01-WAVE-1-CLOSEOUT.md) · UI **2.65.69** |
| **Ostatni feature (CATALOG-BID-01)** | Materializacja `catalogQuantities` (qty > 0) przed Bid — **`e10efa9`** · [`RCA`](../architecture/CATALOG-BID-01-RCA.md) · [`DF`](../architecture/CATALOG-BID-01-DESIGN-FREEZE.md) · [`PV`](../architecture/CATALOG-BID-01-PRODUCTION-VERIFY.md) · [`CLOSEOUT`](../architecture/CATALOG-BID-01-CLOSEOUT.md) · UI **2.65.68** |
| **Ostatni feature (COST-PIPELINE-01-BUGFIX-01)** | Catalog fallback gdy OfferBoq null — **`fdfdc05`** · [`RCA`](../architecture/COST-PIPELINE-01-RCA-REGRESSION-01.md) · [`REPORT`](../architecture/COST-PIPELINE-01-BUGFIX-01-REPORT.md) · [`PV`](../architecture/COST-PIPELINE-01-BUGFIX-01-PRODUCTION-VERIFY.md) · UI **2.65.67** |
| **Ostatni feature (COST-PIPELINE-01)** | OfferBoq → Bid wire · CTA OfferBoq · L0/L1/L2 — **`c7b608a`** · [`DF`](../architecture/COST-PIPELINE-01-DESIGN-FREEZE.md) · UI **2.65.66** |
| **Ostatni feature (TRE-02-HOTFIX-01)** | Terminal mapping Offer Run — **`5eef0ff`** · [`REPORT`](../architecture/TRE-02-HOTFIX-01-REPORT.md) · [`RCA`](../architecture/TRE-02-HOTFIX-RCA.md) · [`CLOSEOUT`](../architecture/TRE-02-HOTFIX-01-CLOSEOUT.md) · UI **2.65.65** |
| **Ostatni feature (TRE-02)** | Outcome First Experience — **CLOSED** · **PV** · [`PV FINAL`](../architecture/TRE-02-PRODUCTION-VERIFY-FINAL.md) · [`RELEASE`](../architecture/TRE-02-RELEASE-REPORT.md) · [`CLOSEOUT`](../architecture/TRE-02-CLOSEOUT.md) · feature **`a39533d`** · tip **`ac6f9e4`** · UI **2.65.64** · default **ON** |
| **Ostatni feature (TRE-01 Slice A)** | Offer Run + Outcome MVP — **CLOSED** · **PV** · [`RELEASE`](../architecture/TRE-01-RELEASE-REPORT.md) · [`CLOSEOUT`](../architecture/TRE-01-CLOSEOUT.md) · **`74ac6a0`** · UI **2.65.63** |
| **Ostatni feature (COST-02-A)** | Modele cenowe (controlled market) — **CLOSED** · [`COST-02-A-RELEASE`](../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) · [`CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) · **`1e6fb12`** · UI **2.65.62** |
| **Ostatni feature (STAB-01)** | Field Ready Stabilization — [`STAB-01-RELEASE`](../architecture/WGDOM-AI-COST-01-STAB-01-RELEASE-REPORT.md) · **`87610b5`** |
| **Ostatni feature (COST-S7)** | AI Validation & Offer Quality — [`COST-S7-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S7-RELEASE-REPORT.md) · **`1c84363`** / tip docs **`f5ba5ac`** |
| **Ostatni feature (COST-S6)** | Bid Proposal Integration — [`COST-S6-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S6-RELEASE-REPORT.md) · **`754c997`** |
| **Ostatni feature (COST-S5.1)** | AI Learning & Company Knowledge — [`COST-S5.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5.1-RELEASE-REPORT.md) · **`973821f`** |
| **Ostatni feature (COST-S5)** | Edycja komponentów — [`COST-S5-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5-RELEASE-REPORT.md) · **`351f534`** |
| **Ostatni feature (COST-S4.1)** | Explainability RO — [`COST-S4.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S4.1-RELEASE-REPORT.md) · **`8fe1147`** |
| **Ostatni feature (COST-S4)** | AI Pricing Engine — [`COST-S4-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S4-RELEASE-REPORT.md) · **`b321867`** |
| **Ostatni feature (COST-S3)** | AI Cost Intelligence — [`COST-S3-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S3-RELEASE-REPORT.md) · **`61b7590`** |
| **Ostatni feature (COST-S2)** | Mapping Engine — [`COST-S2-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S2-RELEASE-REPORT.md) · **`17a7a83`** |
| **Ostatni feature (COST-S1)** | OfferBoq model — [`COST-S1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S1-RELEASE-REPORT.md) · **`fd4b112`** |
| **Ostatni feature (AP2-S4)** | Business Risk Engine — [`AP2-S4-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md) · **`5355c19`** |
| **Ostatni feature (AP2-S3)** | Deep intelligence + Najważniejsze informacje — [`AP2-S3-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md) · **`3e23631`** |
| **Ostatni feature (AP2-S2)** | Auto-analiza UX + „Uruchom ponownie analizę” — [`AP2-S2-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md) · **`7c04203`** |
| **Ostatni feature (AP2-S1)** | Kompletność dokumentacji + gotowość wyceny — [`AP2-S1-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md) · **`01d8981`** |
| **Ostatni feature (AP2-S0)** | Semantyka przedmiaru — [`AP2-S0-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md) · **`2c1ef53`** |
| **Ostatni feature (Dashboard Body S4)** | **`bd0f239`** — Przetargi skrót → GDS |
| **Feature baseline Lista Płac (Hours-wipe)** | UI **2.65.43** · **`ea1b0a6`** — semantyka D1–D5 ACTIVE |
| **Status** | **PRODUCTION** tip UI **2.65.80** · feature **`d4d05706`** · CENY-MATERIAŁÓW-01 **CLOSED · PV** · WORK-CATALOG-P3.3 **CLOSED · PV** · AI-COST-02-B **CLOSED · PV** · P0-RETRY **CLOSED · PV** · COST-BID-GAP-01 **CLOSED · PV** · COST-MULTI **CLOSED** · AI-COST-01 **FROZEN** · NEXT **GAP-B / I3 / TP200B** |
| **Dashboard Body (S1–S4)** | **COMPLETE** · [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **UI Foundation v1.0** | **COMPLETE** · [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **Payroll Hours-wipe EPIC** | **CLOSED** · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **AI onboarding / Master Handoff** | [`AI_ENTRY.md`](AI_ENTRY.md) · [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| **Sync Storm fix** | **2.65.38** · **`838e8e2`** |
| **Prior tip (hardening)** | **2.65.40** · **`23d7723`** (HARDENING-01A) |
| **Deploy FE** | Vercel Git Integration ← `push origin main` |
| **Supabase project** | `bdpygdvfgbggermvqtys` |
| **Edge** | `make-server-0afb8820` |
| **Protected Core** | **GREEN** |
| **STABILIZATION WINDOW** | **ACTIVE** |

> **Uwaga:** `version.json.commit` = ostatni push na `main` (docs lub feature). **Semantyka Hours-wipe** = **`ea1b0a6`**. **Feature BODY-S4** = **`bd0f239`**. Lokalne WT ≠ tip. CI Gate B = osobny EPIC (CLOSED).

---

## 2. Ostatnie releasy istotne

| Version / tip | Temat | Status |
|---------------|-------|--------|
| **2.65.80** / **`d4d05706`** | CENY-MATERIAŁÓW-01 — mapping uplift WC/marketQuotes (flag OFF default) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-01-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-01-RELEASE-COMPLETE.md) |
| **2.65.79** / **`e10a1511`** | WORK-CATALOG-P3.3 — Market Pricing UX S4–S6 (flag OFF default) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WORK-CATALOG-P3.3-CLOSEOUT.md) · [`PV`](../architecture/WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/WORK-CATALOG-P3.3-RELEASE-COMPLETE.md) |
| **2.65.78** / **`9dc113e7`** | AI-COST-02-B — Explain + impact queue (flag OFF default) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-02-B-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/AI-COST-02-B-RELEASE-COMPLETE.md) |
| **2.65.77** / deploy **`77a2f0f`** · feature **`e88d689f`** | AI-COST-PARSER-01 P0-RETRY — F2 Ponów soft-invalidate → Force Heavy | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md) |
| **2.65.77** / **`a061bbd`** | COST-BID-GAP-01 / GAP-A — kalibracja catalog (UNKNOWN · rates · marketQuotes REUSE) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) · [`PV`](../architecture/COST-BID-GAP-01-PRODUCTION-VERIFY.md) |
| **2.65.76** / **`1e18374f`** | Force Heavy Rescan CTA (COST-MULTI tip) | **CLOSED** · FINAL PV · [`CLOSEOUT`](../architecture/RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-CLOSEOUT.md) |
| **2.65.64** / **`a39533d`** | TRE-02 Outcome First Experience (default ON · R0 LS=`0`) | **CLOSED** · [`CLOSEOUT`](../architecture/TRE-02-CLOSEOUT.md) |
| **2.65.63** / **`74ac6a0`** | TRE-01 Slice A Outcome MVP (Offer Run · Bid SSOT · FND spine) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/TRE-01-CLOSEOUT.md) |
| **2.65.62** / **`1e6fb12`** | AI-COST-02 / COST-02-A Modele cenowe | **CLOSED** · **EPIC COMPLETE** · **PV** · [`COST-02-A-CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| docs FREEZE-01 | Architecture Freeze + AI handover · Cold Start PASS | **CLOSED** · [`FREEZE-01-RR`](../architecture/WGDOM-AI-COST-01-FREEZE-01-RELEASE-REPORT.md) |
| **2.65.61** / **`87610b5`** | STAB-01 Field Ready Stabilization | **PRODUCTION VERIFIED** · **FIELD READY** · [`STAB-01-RELEASE`](../architecture/WGDOM-AI-COST-01-STAB-01-RELEASE-REPORT.md) |
| **2.65.60** / **`1c84363`** | COST-S7 AI Validation & Offer Quality | **PRODUCTION VERIFIED** · [`COST-S7-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S7-RELEASE-REPORT.md) |
| **2.65.58** / **`973821f`** | COST-S5.1 AI Learning & Company Knowledge | **PRODUCTION** · **PV** · [`COST-S5.1-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5.1-RELEASE-REPORT.md) |
| **2.65.57** / **`351f534`** | COST-S5 edycja komponentów | **PRODUCTION** · **PV** · [`COST-S5-RELEASE`](../architecture/WGDOM-AI-COST-01-COST-S5-RELEASE-REPORT.md) |
| **2.65.51** / **`5355c19`** | AP2-S4 Business Risk Engine | **PRODUCTION** · **PV** · [`AP2-S4-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md) |
| **2.65.50** / **`3e23631`** | AP2-S3 deep intelligence + Najważniejsze informacje | **PRODUCTION** · **PV** · [`AP2-S3-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md) |
| **2.65.49** / **`7c04203`** | AP2-S2 auto-analiza UX + Uruchom ponownie | **PRODUCTION** · **PV** · [`AP2-S2-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md) |
| **2.65.48** / **`01d8981`** | AP2-S1 kompletność dokumentacji + gotowość wyceny | **PRODUCTION** · **PV** · [`AP2-S1-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md) |
| **2.65.47** / AP2-S0 | Przedmiar = wycena · brak kosztorysu = INFO | **PRODUCTION** · [`AP2-S0-RELEASE`](../architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md) |
| docs **`0a6996e`** | CONSOLIDATION-03 tip finalize (SSOT + RR push status) | **CLOSED** |
| docs **`44655fe`** | CONSOLIDATION-03 release report + tip @ `a1ed3b8` | **CLOSED** |
| docs **`a1ed3b8`** | **AI-DOCS-CONSOLIDATION-03** — MASTER_HANDOFF + AI docs sync · Body closeout published | **CLOSED** · [`CONSOLIDATION-03-RELEASE`](../architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-RELEASE-REPORT.md) |
| docs **`1e07574`** | BODY-S4 release report + tip SSOT | **CLOSED** |
| **2.65.46** / **`bd0f239`** | **DASHBOARD-BODY-S4** — Przetargi skrót → WgCard soft · Body EPIC **COMPLETE** | **CLOSED** · **PV** · [`S4-RELEASE`](../architecture/WGDOM-DASHBOARD-BODY-S4-RELEASE-REPORT.md) · [`BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **2.65.46** / **`ca08c75`** | **DASHBOARD-BODY-S3** — Notatki → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S3-RELEASE-REPORT.md) |
| **2.65.46** / **`e2e1c58`** | **DASHBOARD-BODY-S2** — Pilne → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S2-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S2-RELEASE-REPORT.md) |
| **2.65.46** / **`1cf8af2`** | **DASHBOARD-BODY-S1** — Braki → WgCard soft | **CLOSED** · **PV** · [`WGDOM-DASHBOARD-BODY-S1-RELEASE-REPORT.md`](../architecture/WGDOM-DASHBOARD-BODY-S1-RELEASE-REPORT.md) |
| **2.65.46** / **`2a99e54`** | **UI FOUNDATION v1.0** — A11Y-01 + e2e-ui-guard (9/9 prod) | **COMPLETE** · **PV** · [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **2.65.46** / **`da24e5a`** | **SIDEBAR-REGRESSION-02** — NavItemWithHint horizontal scroll | **CLOSED** · **PV** · [`WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md`](../architecture/WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md) |
| **2.65.46** / **`5888a76`** | **SHELL-RELEASE-01** — Dashboard · Sidebar · Topbar visual | **CLOSED** · **PV** · [`WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md`](../architecture/WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md) |
| **2.65.46** / **`cf76d28`** | Roboty UI-01D-A/B/C + Wg* primitives | **CLOSED** · **PV** |
| **2.65.46** / **`6df8373`** | **LOGIN-UI-01** mobile hotfix (16px + back DOM) | **CLOSED** · **PV** |
| **2.65.45** / **`5f2baf8`** | **LOGIN-UI-01** — premium login UI refresh (UI-only) | **CLOSED** |
| docs **`af15e30`** / **`5f68322`** | **AI-DOCS-PAYROLL-GUARD-02** — AI Entry + Payroll Safety Gate (+ tip SSOT) | **CLOSED** |
| **2.65.44** / **`c461bde`** | MOBILE-FIRST-SCREEN-01 release finalize | **CLOSED** |
| **2.65.43** / **`ea1b0a6`** | **PAYROLL Hours-wipe** D4+D5 · EPIC CLOSED | **CLOSED** · **PV** |
| **2.65.42** / **`f3b8c03`** | PAYROLL D2+D3 Domain Gate | **CLOSED** |
| **2.65.41** / **`ace2855`** | PAYROLL D1 write-path telemetry | **CLOSED** |
| **2.65.40** / **`23d7723`** | HARDENING-01A Persist SSOT | **CLOSED** |
| **2.65.38** | TENDERS-SYNC-STORM-P0 | **CLOSED** |
| **2.65.35** | PAYROLL-CLOUD-RESURRECTION-01 | **CLOSED** |
| **2.65.34** | PAYROLL-P0-WEEK-ROLLOVER-01 | **CLOSED** |

---

## 3. Cloud / Sync stan

| Element | Stan |
|---------|------|
| Domain Push Payroll | ACTIVE |
| Hours-wipe D1–D5 | **ACTIVE** · EPIC **CLOSED** |
| Resurrection fence | ACTIVE — nie usuwać |
| Sync Storm heavy | P0 ACTIVE — deps bez builtAt |
| HARDENING-01A bootstrap persist | ACTIVE |
| HARDENING-01D 546 monitor | ACTIVE tooling |
| HARDENING-01B0 FP-churn monitor | ACTIVE tooling |
| Deadlock retry N1 | ACTIVE |
| ADR Cloud Sync | PROPOSED · Evidence Gate OPEN · DF BLOCKED |
| pipelinePerfDebouncePersist | default **false** |

---

## 4. Najważniejsze moduły (prod)

| Moduł | Stan |
|-------|------|
| Lista Płac | STABLE · priorytet #1 |
| Roboty / Photos | STABLE |
| Przetargi / Pipeline | STABLE vs Sync Storm · hardening monitors |
| WM Druk / ZI | COMPLETE / STABLE |
| Work Catalog | MVP PROD |
| Theme | 01C VERIFIED |
| Audit Hub | MVP CLOSED |
| GDS (Wg*) | GDS-01 + MAINT-01 **CLOSED** · DS-13 |
| UI Foundation | **COMPLETE** · ui-guard 9/9 |
| Dashboard Body mid | **COMPLETE** (S1–S4) · S5/S6 backlog |
| CI Gates B/C | **GREEN** · CI Remediation **CLOSED** |

---

## 5. Procedura bump tip (release)

1. Zaktualizuj **§1** (UI + commit z `version.json` po deploy).  
2. Dopisz wiersz w **§2**.  
3. **Nie** edytuj tipów w `AI_ENTRY`, `AGENTS` START, Continuity banner, cursor rules — tylko link do tego pliku.  
4. Opcjonalnie jedna linia w `PROJECT_HANDOFF.md` („patrz 09”).

---

## 6. Linki AI Safety

| | |
|--|--|
| Entry | [`AI_ENTRY.md`](AI_ENTRY.md) |
| Master Handoff | [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) |
| Gate | [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| Payroll SSOT | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
