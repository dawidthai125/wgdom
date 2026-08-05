# 09 — Production Baseline (WGDOM)

> **★★ TIP SSOT — JEDYNE miejsce w docs z numerem wersji tipu dla AI.**  
> Inne pliki **linkują tutaj** — **nie** powielają UI version / commit tip.  
> **Aktualizacja:** przy każdym domknięciu release / docs tip na `main`.  
> **Live:** `https://www.wgdom.fun/version.json` · cross-check `git log -1` · `src/app/changelog-data.ts` (UI)

**Snapshot dokumentacji:** 2026-08-05 · tip UI **2.66.16** · **`377e279f`** · cold-start SSOT [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · **WM-DOKUMENTACJA-SZKICE-02 CLOSED** · **WM-DOKUMENTACJA-SZKICE-01 P0+P2a CLOSED** · **PRODUCTION VERIFIED** · WM-WORKER-SKETCH-01 CLOSED (P0+P1) · APPEARANCE-01 CLOSED · AUTO-GENERATE-01 CLOSED · MAPPING-MIGRATION-01 CLOSED · OST-01 CLOSED · AcroForm OST PASS · **OST-03 DO NOT IMPLEMENT** · tryb **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**.

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
| **UI version (changelog / version.json)** | **2.66.16** |
| **Deploy tip commit (`main` / `version.json`)** | **`377e279f`** · full **`377e279f5ab600dae7ef36ea31620c7d847926b8`** · WM-DOKUMENTACJA-SZKICE-02 Publication · tip **`377e279`** · **PRODUCTION VERIFIED** |
| **Feature tip (WM-DOKUMENTACJA-SZKICE-02)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · Publication Workflow · `placement` · `resolved` · Promote-copy 1:1 · A2 NO TOUCH · UI **2.66.16** · **`377e279f`** · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **Feature tip (WM-DOKUMENTACJA-SZKICE-01 P2a)** | **P2a CLOSED** · **PRODUCTION VERIFIED** · Dashboard Szkice Techniczne (job-centric) · HIGH→NORMAL · deep-link Jobs→Dokumentacja→drawingId · A2 NO TOUCH · UI **2.66.15** · **`e9598c99`** · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) · tip UI supersedowany przez -02 |
| **Feature tip (WM-DOKUMENTACJA-SZKICE-01 P0)** | **P0 CLOSED** · **PRODUCTION VERIFIED** · Dokumentacja→Szkice Techniczne · Needs Changes · Resubmit · (Accept superseded by -02) · A2 NO TOUCH · UI **2.66.14** · **`0afeb82d`** · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **Feature tip (WM-WORKER-SKETCH-01)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · **P0 CLOSED** (2.66.12 / `3c9d6f90`) · **P1 CLOSED** (2.66.13 / `4f99a279`) · Worker Docs→Szkice · flaga `wmWorkerSketchEnabled` default OFF · Single Store `kw-wm-technical-drawings` · drag-release wall/arrow · Mobile Chrome · Snap endpoint→angle→grid · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) · superseded tip UI by WM-DOKUMENTACJA-SZKICE |
| **Feature tip (WM-DRUK-OST-APPEARANCE-01)** | **CLOSED** · OST `/AP` dla JOB_STREET·BUILDING·APARTMENT · NeedAppearances unchanged · UI **2.66.11** · **`4d33361e`** · tip **`4d33361`** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-APPEARANCE-01-CLOSEOUT.md) · [`OV`](../architecture/WM-DRUK-OST-APPEARANCE-01-OWNER-VERIFY.md) · [`PLAN`](../architecture/WM-DRUK-OST-APPEARANCE-01-PLAN.md) · superseded tip UI by WM-WORKER-SKETCH-01 |
| **Feature tip (WM-DRUK-OST-AUTO-GENERATE-01)** | **CLOSED** · **S2 Hard Ensure** · ACTIVE OST zawsze w ZIP Odbiory/ on-the-fly · bez Storage filled · UI **2.66.10** · **`82dc1017`** · tip **`82dc101`** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-AUTO-GENERATE-01-CLOSEOUT.md) · [`PV`](../architecture/WM-DRUK-OST-AUTO-GENERATE-01-PRODUCTION-VERIFY.md) · [`DF`](../architecture/WM-DRUK-OST-AUTO-GENERATE-01-DESIGN-FREEZE.md) |
| **Feature tip (WM-DRUK-OST-MAPPING-MIGRATION-01)** | **CLOSED** · **PRODUCTION VERIFIED** · migracja `pdfFieldMapping` OST · UI **2.66.09** · **`56069cce`** · tip **`56069cc`** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-MAPPING-MIGRATION-01-CLOSEOUT.md) · superseded tip UI by AUTO-GENERATE-01 |
| **Feature tip (WM-DRUK-OST-01)** | **CLOSED** · **PRODUCTION VERIFIED** · slot OST `pdf_form` · upload-only · mapping-only · UI **2.66.08** · **`949333ed`** · tip **`949333e`** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-01-CLOSEOUT.md) · superseded tip UI by MAPPING-MIGRATION-01 |
| **Feature tip (WORKER-INSPECTOR-MOBILE-01 WIM-P1a)** | **CLOSED** · **PRODUCTION VERIFIED** · Capture & Privacy Worker · UI **2.66.07** · **`3df0d24a`** · tip **`3df0d24`** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P1a-CLOSEOUT.md) · **WIM-P1b NIE** bez Owner GO → AUDIT |
| **Feature tip (WORKER-INSPECTOR-MOBILE-01 WIM-P0)** | **CLOSED** · **PRODUCTION VERIFIED** · Single Mobile Viewport Contract · `.worker-shell` / `.inspector-shell` = `var(--app-height, 100dvh)` · jeden height owner · Suspense height+maxHeight · REUSE `app-viewport.ts` · UI **2.66.06** · **`1f04f559`** · tip **`1f04f55`** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md) · [`PV`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-PRODUCTION-VERIFY.md) · [`Device OV`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-DEVICE-OWNER-VERIFICATION.md) · superseded tip UI by WIM-P1a |
| **Feature tip (WM-RYSUNKI-MOBILE-01 MOBILE-P1)** | **CLOSED** · **PRODUCTION VERIFIED** · edit-only hit · `mode` edit/export (default export) · 44×44 · toolbar scroll · modal Tekst/Długość · create sheet · CTM REUSE · UI **2.66.05** · **`59f09c1c`** · tip **`59f09c1`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P1-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-MOBILE-01-P1-PRODUCTION-VERIFY.md) · [`OV`](../architecture/WM-RYSUNKI-MOBILE-01-P1-OWNER-VERIFICATION.md) · superseded tip UI by WIM-P0 · **MOBILE-P2 NIE** bez Owner GO → AUDIT |
| **Feature tip (WM-RYSUNKI-MOBILE-01 MOBILE-P0)** | **CLOSED** · **PRODUCTION VERIFIED** · portal FS `<md` · `createPortal(document.body)` · gesture contract · capture/cancel · leave≠end · touch-action · zoom/pan/reset · safe-area · scroll lock · UI **2.66.04** · **`13ca099b`** · tip **`13ca099`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-MOBILE-01-P0-PRODUCTION-VERIFY.md) · [`OV`](../architecture/WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION.md) · superseded tip UI by MOBILE-P1 |
| **Feature tip (WM-RYSUNKI-01 P3B.1)** | **CLOSED** · **PRODUCTION VERIFIED** · po wall SUCCESS: `clearWallPreview` · STOP · tool wall sticky · nowa ściana = nowy 1. klik · D-P3B-05/AC-P3B-06 SUPERSEDED · UI **2.66.03** · **`77f18b78`** · tip **`77f18b7`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-PRODUCTION-VERIFY.md) · [`OV`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-OWNER-VERIFICATION.md) · superseded tip UI by MOBILE-P0/P1 · **P4 NIE** bez Owner GO |
| **Feature tip (WM-RYSUNKI-01 P3B)** | **CLOSED** · **PRODUCTION VERIFIED** · Ghost `previewWall` · Live Length/Grid · (chain SUPERSEDED by P3B.1) · rAF · Ghost OUT PDF/ZIP/JSON · UI **2.66.02** · **`abe57f9a`** · tip **`abe57f9`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-PRODUCTION-VERIFY.md) · [`OV`](../architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-OWNER-VERIFICATION.md) · superseded tip by P3B.1 |
| **Feature tip (WM-RYSUNKI-01 P3A)** | **CLOSED** · **PRODUCTION VERIFIED** · UX polish: W/G/R · drzwi P/W · gap render-time · wymiar Długość · rozdzielnia · SVG→PDF→ZIP SSOT · UI **2.66.01** · **`20e5c5a3`** · tip **`20e5c5a`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P3A-UX-POLISH-PRODUCTION-VERIFY.md) · [`OV`](../architecture/WM-RYSUNKI-01-P3A-UX-POLISH-OWNER-VERIFICATION.md) · superseded tip by P3B |
| **Feature tip (WM-RYSUNKI-01 P3)** | **CLOSED** · **PRODUCTION VERIFIED** · ZIP `Rysunki/` · checkbox „Dołącz rysunki” · Final only · reuse `generateDrawingPdf` · manifest/fingerprint additive · fail-loud · `_{shortId}` · audit `drawing_zip_included` · UI **2.66.00** · **`8d4abcc9`** · tip **`8d4abcc`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P3-PRODUCTION-VERIFY.md) · **EPIC CORE COMPLETE** · superseded tip by P3A |
| **Feature tip (WM-RYSUNKI-01 P2)** | **CLOSED** · **PRODUCTION VERIFIED** · Preview/Download/Print PDF · A4/A3 · portrait/landscape · `jobLabel` + `documentDate` · watermark OUT · audit `drawing_pdf_exported` · UI **2.65.99** · **`4e84f994`** · tip **`4e84f99`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P2-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P2-PRODUCTION-VERIFY.md) · superseded tip by P3 |
| **Feature tip (WM-RYSUNKI-01 P1B)** | **CLOSED** · **PRODUCTION VERIFIED** · rollout: `AppSettings.wmRysunkiEnabled` default **OFF** · Super Admin ⚙ Moduły · mirror WM Ustawienia · one-shot promote LS→AppSettings · FORCE OFF LS=`0` · bez reload · UI **2.65.98** · **`ad69bcb5`** · tip **`ad69bcb`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1B-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P1B-PRODUCTION-VERIFY.md) |
| **Feature tip (WM-RYSUNKI-01 P1)** | **CLOSED** · **PRODUCTION VERIFIED** · toolset: drzwi(+flipH) · okno · wymiar · strzałka · wentylacja · piec · opis pomieszczenia · `symbols/` · `renderSymbol` · rotate 90/180/270 · Final · (legacy LS flag supersedowana przez P1B AppSettings) · KV `kw-wm-technical-drawings` · UI **2.65.97** · **`0b37787d`** · tip **`0b37787`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P1-PRODUCTION-VERIFY.md) |
| **Feature tip (WM-RYSUNKI-01 P0)** | **CLOSED** · **PRODUCTION VERIFIED** · Odbiory WM → Rysunki · JSON SSOT · CRUD · wall/text · grid/snap · autosave · undo · flaga OFF · UI **2.65.96** · **`028e4819`** · tip **`028e481`** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P0-CLOSEOUT.md) · [`PV`](../architecture/WM-RYSUNKI-01-P0-PRODUCTION-VERIFY.md) |
| **Feature tip (MARKET-SYNC-01 P2)** | **FULLY CLOSED** · **PRODUCTION VERIFIED** · PriceHistory · Δ% info · Coverage · templates · flaga `kw-market-sync-01-p2` default **OFF** · UI **2.65.95** · **`18830c11`** · tip **`18830c1`** |
| **Feature tip (MARKET-SYNC-01 P3-A)** | **CLOSED** · mock ingest spine · flaga `kw-market-sync-01-p3` default **OFF** · Legal Gate **OPEN** · single provider `obi` · **bez** bumpa UI · feature/docs **`7325c773`** · [`AUDIT`](../architecture/MARKET-SYNC-01-P3-AUDIT.md) · [`DF`](../architecture/MARKET-SYNC-01-P3-DESIGN-FREEZE.md) · [`OV`](../architecture/MARKET-SYNC-01-P3-OWNER-VERIFICATION.md) · P3-B **NIE** bez Owner GO + Legal |
| **Feature tip (AI-COST-02 I3)** | **FULLY CLOSED** · **PRODUCTION VERIFIED** · Competitiveness RO · linia + summary · CK hint · flaga `kw-ai-cost-02-i3-competitiveness` default **OFF** · UI gate I3∧02-B · UI **2.65.95** · feature **`869b4c52`** · docs CLOSE **`99969f33`** · [`CLOSEOUT`](../architecture/AI-COST-02-I3-CLOSEOUT.md) · dalsze AI-COST-02 slice = backlog |
| **Feature tip (SMART-PRICING-01 P2)** | **CLOSED** · **PRODUCTION VERIFIED** · MS staging Evidence RO · merge · Rank B1 · flaga `kw-smart-pricing-01-p2` default **OFF** (P2⇒P1) · UI **2.65.95** · **`99c63373`** · [`CLOSE`](../architecture/SMART-PRICING-01-P2-CLOSE.md) · [`PV`](../architecture/SMART-PRICING-01-P2-PRODUCTION-VERIFY.md) · P3 **NIE** bez Owner GO |
| **Feature tip (SMART-PRICING-01 P1)** | **CLOSED** · **PRODUCTION VERIFIED** · Evidence · Rank · Confidence · One-shot session · Odrzuć · flaga `kw-smart-pricing-01-p1` default **OFF** · UI **2.65.95** · feature **`d8b080e5`** · [`CLOSE`](../architecture/SMART-PRICING-01-P1-CLOSE.md) · [`PV`](../architecture/SMART-PRICING-01-P1-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/SMART-PRICING-01-P1-RELEASE-REPORT.md) |
| **Feature tip (GLOBAL-UX-02)** | **FULLY CLOSED** · Inspector+Worker → Admin GDS · S1–S8 COMPLETE · S9 UI-GUARD **DEFERRED** · UI **2.65.95** · feature **`3385d9f`** · [`CLOSE`](../architecture/GLOBAL-UX-02-CLOSE.md) · presentation-only · bez bumpa changelog |
| **Feature tip (AI-DOC-DETECTION)** | **FULLY CLOSED** · **PRODUCTION VERIFIED** · Doc.D1/D2/D3 · aliasy BOQ / Bill of Quantities / ślepy · UX_A–D · UI **2.65.95** · feature **`023ac686`** · [`CLOSE`](../architecture/AI-DOC-DETECTION-CLOSE-01.md) · Residual CI E2E/TEST-INFRA/Mobile — Open (bez naprawy w slice) |
| **Feature tip (AI v2 · Scope Gap MVP)** | **FULLY CLOSED** · RO „Luki zakresu” · flaga `kw-scope-gap-mvp` default **OFF** · UI **2.65.93** · **`4234617b`** · [`CLOSE`](../architecture/SCOPE-GAP-MVP-CLOSE-01.md) · Residual CI TEUX6/jobs-mobile **UNRELATED / Open** |
| **Feature tip (AI v2 · Confidence MVP)** | **FULLY CLOSED** · RO „Pewność analizy” · flaga `kw-confidence-mvp` default **OFF** · UI **2.65.92** · **`00a5d873`** · [`CLOSE`](../architecture/CONFIDENCE-MVP-CLOSE-01.md) |
| **Feature tip (CATALOG-COVERAGE-01 P0e)** | **CLOSED** · **PRODUCTION VERIFIED** · FULL Library Seed · BIZ A · UI **2.65.91** · feature **`b69aeaae`** · coverage **78.1%** · [`CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-P0e-CLOSEOUT.md) · [`RELEASE`](../architecture/CATALOG-COVERAGE-01-P0e-RELEASE-REPORT.md) · **EPIC** [`EPIC-CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-EPIC-CLOSEOUT.md) **FULLY CLOSED** |
| **Feature tip (CATALOG-COVERAGE-01 P0d-A)** | **CLOSED** · Precision + SAFE seed · UI **2.65.90** · feature **`b9da6bff`** · coverage **76.7%** · [`CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-P0d-A-CLOSEOUT.md) · [`RELEASE`](../architecture/CATALOG-COVERAGE-01-P0d-A-RELEASE-REPORT.md) |
| **Feature tip (CATALOG-COVERAGE-01 P0c)** | **CLOSED** · Alias Resolver Wave 1 · UI **2.65.89** · feature **`aebf9d09`** · [`CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-P0c-CLOSEOUT.md) · [`RELEASE`](../architecture/CATALOG-COVERAGE-01-P0c-RELEASE-REPORT.md) |
| **Feature tip (CATALOG-COVERAGE-01 P0b)** | **CLOSED** · Normalizer · UI **2.65.88** · feature **`fb58f501`** · [`CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-P0b-CLOSEOUT.md) · [`RELEASE`](../architecture/CATALOG-COVERAGE-01-P0b-RELEASE-REPORT.md) |
| **Feature tip (CATALOG-COVERAGE-01 P0a)** | **CLOSED** · Noise Filter · UI **2.65.87** · feature **`51a56f0d`** · [`CLOSEOUT`](../architecture/CATALOG-COVERAGE-01-P0a-CLOSEOUT.md) · [`RELEASE`](../architecture/CATALOG-COVERAGE-01-P0a-RELEASE-REPORT.md) |
| **Feature tip (SMART-PRICING-01 P0)** | **CLOSED** · Detect Quotes-first RO · banner/badge OfferBoq · UI **2.65.86** · feature **`9ca4a4e5`** · [`CLOSEOUT`](../architecture/SMART-PRICING-01-P0-CLOSEOUT.md) · [`RELEASE`](../architecture/SMART-PRICING-01-P0-RELEASE-REPORT.md) · **P1+P2 CLOSED** |
| **Feature tip (MARKET-SYNC-01 P1)** | **CLOSED** · Accept+Publish · Kill Switch · `commitMarketQuotesImport` only · Undo single · UI **2.65.85** · [`CLOSEOUT`](../architecture/MARKET-SYNC-01-P1-CLOSEOUT.md) · feature **`5326cf8c`** · **P2 FULLY CLOSED** |
| **Feature tip (MARKET-SYNC-01 P0)** | **CLOSED** · Model+Preview staging · local-first · [`CLOSEOUT`](../architecture/MARKET-SYNC-01-P0-CLOSEOUT.md) · UI **2.65.84** · feature **`273fb3e0`** |
| **Feature tip (CENY-MATERIAŁÓW-04 P2)** | **COMPLETE** · **CLOSED** · FEATURE-DATA WC · P2-A/B + Residual ROZ · K-P2-1/2/3 PASS · residual **16≤18** · false **0** · bez bumpa UI · [`P2-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) · NEXT **P3 (INNE) AUDIT** |
| **Feature tip (CENY-MATERIAŁÓW-04 P1)** | **COMPLETE** · P0 · P1-A/B/C · tip UI **2.65.83** · feature P1-C **`992023cc`** · PV **PASS** · [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) · KPI CM **73.2%** / HE **26.8%** |
| **Feature tip (CENY-MATERIAŁÓW-04 P1-C)** | **`992023cc`** · **CLOSED** · **PRODUCTION VERIFIED** · FEATURE-DATA · 7 robót elewacje/ocieplenia + Quotes 7/7 · P3.3 import · OV PASS · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-C-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-C-RELEASE-COMPLETE.md) · UI **2.65.83** |
| **Feature tip (CENY-MATERIAŁÓW-04 P1-B)** | **`dca25c96`** · **CLOSED** · **PRODUCTION VERIFIED** · FEATURE-DATA · 7 robót ogrodzenia + Quotes 7/7 · P3.3 import · OV PASS · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-B-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-B-RELEASE-COMPLETE.md) · UI **2.65.82** |
| **Feature tip (CENY-MATERIAŁÓW-04 P1-A)** | **`dc0daea0`** · **CLOSED** · **PRODUCTION VERIFIED** · FEATURE-DATA · 10 robót chodniki/nawierzchnie + Quotes 10/10 · P3.3 import · OV FINAL PASS · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-A-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-A-RELEASE-COMPLETE.md) · UI **2.65.81** |
| **Feature tip (CENY-MATERIAŁÓW-01)** | **`d4d05706`** · **CLOSED** · **PRODUCTION VERIFIED** · mapping uplift · KPI · quotes gaps · memo · flaga `kw-ceny-materialow-01` default **OFF** · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-01-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-01-PRODUCTION-VERIFY.md) · UI **2.65.80** |
| **Feature tip (WORK-CATALOG-P3.3)** | **`e10a1511`** · **CLOSED** · **PRODUCTION VERIFIED** · Market Pricing UX S4–S6 · flaga `kw-wc-p33-market-pricing-ux` default **OFF** · [`CLOSEOUT`](../architecture/WORK-CATALOG-P3.3-CLOSEOUT.md) · [`PV`](../architecture/WORK-CATALOG-P3.3-PRODUCTION-VERIFY.md) · UI **2.65.79** |
| **Feature tip (AI-COST-02-B)** | **`9dc113e7`** · **CLOSED** · **PRODUCTION VERIFIED** · Explain + Queue · flaga `kw-ai-cost-02-b-explain-queue` default **OFF** · [`CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-02-B-PRODUCTION-VERIFY.md) · UI **2.65.78** |
| **Feature tip (AI-COST-PARSER-01 P0-RETRY)** | **`e88d689f`** · **CLOSED** · **PRODUCTION VERIFIED** · F2 soft-invalidate Ponów → Force Heavy · [`CLOSEOUT`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md) · UI **2.65.77** |
| **COST-BID-GAP-01 (GAP-A)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · flaga `COST_BID_GAP_01_CATALOG_CAL` default **OFF** · [`CLOSEOUT`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) · [`PV`](../architecture/COST-BID-GAP-01-PRODUCTION-VERIFY.md) · feature **`a061bbd`** · UI **2.65.77** |
| **COST-MULTI (seria)** | **EPIC CLOSED** · **PRODUCTION VERIFIED** · [`CLOSEOUT`](../architecture/COST-MULTI-CLOSEOUT.md) · [`RELEASE HISTORY`](../releases/COST-MULTI-EPIC-RELEASE-HISTORY.md) · FINAL PV [`../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md`](../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md) · UI **2.65.74–2.65.76** |
| **AI-COST-01** | **EPIC COMPLETE** · **FIELD READY** · **FROZEN** · FREEZE-01 handover — [`ARCHITECTURE-FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST-02** | **COST-02-A CLOSED** · **02-B Phase 1 CLOSED** · **I3 FULLY CLOSED** (`869b4c52`) · dalsze **BACKLOG** — [`STARTING-POINT`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) · [`02-B-CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · [`COST-02-A-CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
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
| **Status** | **PRODUCTION** tip UI **2.66.16** / **`377e279f`** · **WM-DOKUMENTACJA-SZKICE-02 CLOSED** · **PRODUCTION VERIFIED** · -01 P0+P2a CLOSED · WM-WORKER-SKETCH-01 CLOSED · APPEARANCE-01 · AUTO-GENERATE-01 · MAPPING · OST-01 · WIM-P1a · AcroForm PASS · **OST-03 DO NOT IMPLEMENT** · tryb **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO** · WIM-P1b / MOBILE-P2 / WM P4 / MS P3-B / SMART P3 / CM-04 P3 / Wave 2 — **tylko** Owner GO |
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
| **2.66.13** / **`4f99a279`** | WM-WORKER-SKETCH-01 P1 — Mobile Draw UX (drag-release · snap · chrome) | **CLOSED** · **PV** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **2.66.12** / **`3c9d6f90`** | WM-WORKER-SKETCH-01 P0 — Worker Docs Szkice foundation | **CLOSED** · **PV** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **2.66.05** / **`59f09c1c`** | WM-RYSUNKI-MOBILE-01 MOBILE-P1 — touch hitboxes and chrome UX | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P1-CLOSEOUT.md) |
| **2.66.04** / **`13ca099b`** | WM-RYSUNKI-MOBILE-01 MOBILE-P0 — fullscreen editor gesture contract | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md) |
| **2.66.03** / **`77f18b78`** | WM-RYSUNKI-01 P3B.1 — continuous drawing UX fix | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-CLOSEOUT.md) |
| **2.65.99** / **`4e84f994`** | WM-RYSUNKI-01 P2 — PDF EXPORT (Preview/Download/Print) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P2-CLOSEOUT.md) |
| **2.65.98** / **`ad69bcb5`** | WM-RYSUNKI-01 P1B — Feature Rollout AppSettings (default OFF) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1B-CLOSEOUT.md) |
| **2.65.97** / **`0b37787d`** | WM-RYSUNKI-01 P1 — toolset symbole (flag OFF) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1-CLOSEOUT.md) |
| **2.65.96** / **`028e4819`** | WM-RYSUNKI-01 P0 — Rysunki foundation (flag OFF) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P0-CLOSEOUT.md) |
| **2.65.95** / docs **`7325c773`** | MARKET-SYNC-01 P3-A — mock ingest spine (flag OFF · Legal OPEN) | **CLOSED** · OV · nie tip UI |
| **2.65.95** / docs **`99969f33`** | AI-COST-02 I3 — CLOSEOUT / PV / RELEASE docs | **FULLY CLOSED** · feature **`869b4c52`** |
| **2.65.95** / **`18830c1`** | MARKET-SYNC-01 P2 — PriceHistory · Δ% · Coverage (flag OFF) | **FULLY CLOSED** · **PV** · feature **`18830c11`** |
| **2.65.95** / **`99c6337`** | SMART-PRICING-01 P2 — MS staging Evidence · Rank B1 (flag OFF) | **CLOSED** · **PV** · [`CLOSE`](../architecture/SMART-PRICING-01-P2-CLOSE.md) · [`PV`](../architecture/SMART-PRICING-01-P2-PRODUCTION-VERIFY.md) |
| **2.65.95** / **`d8b080e`** | SMART-PRICING-01 P1 — Evidence · One-shot (flag OFF) | **CLOSED** · **PV** · [`CLOSE`](../architecture/SMART-PRICING-01-P1-CLOSE.md) · [`PV`](../architecture/SMART-PRICING-01-P1-PRODUCTION-VERIFY.md) |
| **2.65.95** / **`3385d9f`** | GLOBAL-UX-02 — S1–S8 Inspector+Worker chrome (S8 tip) | **FULLY CLOSED** · [`CLOSE`](../architecture/GLOBAL-UX-02-CLOSE.md) · S9 DEFERRED |
| **2.65.95** / **`023ac686`** | AI-DOC-DETECTION — Doc.D1/D2/D3 · aliasy · UX_A–D | **FULLY CLOSED** · **PV** · [`CLOSE`](../architecture/AI-DOC-DETECTION-CLOSE-01.md) · [`PV`](../architecture/AI-DOC-DETECTION-PRODUCTION-VERIFY-01.md) |
| **2.65.93** / **`4234617b`** | Scope Gap MVP — Luki zakresu (flaga OFF) | **FULLY CLOSED** · [`CLOSE`](../architecture/SCOPE-GAP-MVP-CLOSE-01.md) |
| **docs / P2 CLOSE** | CENY-MATERIAŁÓW-04 P2 COMPLETE — WC FEATURE-DATA · K-P2-1/2/3 PASS | **CLOSED** · [`P2-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) · NEXT **P3 AUDIT** |
| **2.65.83** / **`992023cc`** | CENY-MATERIAŁÓW-04 P1-C — elewacje/ocieplenia WC + Quotes · **P1 COMPLETE** | **CLOSED** · **PV** · [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) · [`P1-C-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-C-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-C-RELEASE-COMPLETE.md) |
| **2.65.82** / **`dca25c96`** | CENY-MATERIAŁÓW-04 P1-B — ogrodzenia WC + Quotes (FEATURE-DATA) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-B-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-B-RELEASE-COMPLETE.md) |
| **2.65.81** / **`dc0daea0`** | CENY-MATERIAŁÓW-04 P1-A — chodniki/nawierzchnie WC + Quotes (FEATURE-DATA) | **CLOSED** · **PV** · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) · [`PV`](../architecture/CENY-MATERIAŁÓW-04-P1-A-PRODUCTION-VERIFY.md) · [`RELEASE`](../architecture/CENY-MATERIAŁÓW-04-P1-A-RELEASE-COMPLETE.md) |
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
