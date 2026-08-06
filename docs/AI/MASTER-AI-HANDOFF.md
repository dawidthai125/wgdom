# WGDOM — MASTER AI HANDOFF

> **ID:** MASTER-AI-HANDOFF  
> **STATUS:** **ACTIVE** · **★★ GŁÓWNY SSOT cold-start** (ChatGPT · Cursor)  
> **MODE:** DOCUMENTATION ONLY  
> **Data:** 2026-08-06  
> **Tip numeryczny:** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Proces:** [`AI_ENTRY.md`](AI_ENTRY.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)  
> **Alias / skrót:** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) → **ten plik**  
> **Docs sync:** [`PROJECT-DOCS-SYNC-DESIGN-FREEZE.md`](../architecture/PROJECT-DOCS-SYNC-DESIGN-FREEZE.md)

```text
Nie czytaj historii czatu. Nie zgaduj tipu.
Tip = 09 + version.json → 2.66.20 / f2b0fa1e (NG-TENDERS-COST-KNOWLEDGE-01 CLOSED · PRODUCTION VERIFIED)
Feature tip A0+A1 = 9c0901d6
Tryb = UTRZYMANIE · WAITING FOR NEXT OWNER GO
ACTIVE EPIC / IMPLEMENT / RELEASE / COMMIT = NONE
STABILIZATION WINDOW ACTIVE
DO NOT IMPLEMENT: WM-DRUK-OST-03 · XFA · obejścia pdf-lib · cache filled PDF
A2/A3/Learning · WIM-P1b / MOBILE-P2 / P4 Rysunki / P3-B = tylko Owner GO → AUDIT najpierw
```

---

## Executive Summary

W&G DOM jest w trybie **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**. Tip `main`: **UI 2.66.20** / commit **`f2b0fa1e`** — **NG-TENDERS-COST-KNOWLEDGE-01 CLOSED** · **PRODUCTION VERIFIED** (feature **`9c0901d6`**).

Ostatnie zamknięte: **NG-TENDERS-COST-KNOWLEDGE-01** (A0+A1) · **NG-TENDERS-WORKSPACE-01** · **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** · **WM-DOKUMENTACJA-SZKICE-02** · **-01 P2a/P0** · **WM-WORKER-SKETCH-01** · **APPEARANCE-01** · **AUTO-GENERATE-01** · **MAPPING-MIGRATION-01** · **OST-01** · AcroForm OST **PASS** · **WIM-P1a** · WM-RYSUNKI CORE · AI/MS/SMART/GLOBAL-UX fale CLOSED.  
**OST-03 / XFA / cache filled = zakaz.**  
Backlog bez Owner GO = **zakaz IMPLEMENT**.

Protected Core **GREEN**. Stabilization Window **ACTIVE**. Lista Płac = priorytet #1.

---

## Current Production Baseline

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Branch** | `main` |
| **UI version** | **2.66.20** |
| **Commit** | **`f2b0fa1e`** (full `f2b0fa1eba67ce4b41ca304e9a7b54ae499653ff`) |
| **Feature tip** | **`9c0901d6`** — A0+A1 cost-knowledge |
| **Status** | **PRODUCTION VERIFIED** · tip = **NG-TENDERS-COST-KNOWLEDGE-01 CLOSED** · **WAITING FOR NEXT OWNER GO** |
| **ACTIVE EPIC** | **NONE** |
| **ACTIVE IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **SSOT tip** | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| **Tryb** | **UTRZYMANIE** |
| **STABILIZATION WINDOW** | **ACTIVE** |
| **Protected Core** | **GREEN** |
| **Deploy FE** | `git push origin main` → Vercel (**zakaz** `vercel deploy`) |

---

## Current Architecture State

| Domenа | Stan |
|--------|------|
| **App** | React/Vite · monolit UI `src/app/` · Przetargi = TendersModule |
| **Sync** | `cloud-sync.ts` · Edge `make-server-0afb8820` — **nie** ruszaj CORE bez Owner GO |
| **Payroll** | SSOT Hours-wipe / carry — Gate G1–G9 przed IMPLEMENT |
| **AI-COST-01** | **EPIC COMPLETE · FROZEN · FIELD READY** — Bid Proposal = jedyny generator oferty |
| **AI-COST-02** | COST-02-A · 02-B · **I3 FULLY CLOSED** · dalsze slice = backlog |
| **Doc detection** | `src/lib/doc-detection/` · Doc.D1/D2/D3 · bez rename KV `dossier.kosztorys` |
| **Foundation Lib P0** | COMPLETE (FND-01…05) · **FND-06 BLOCKED** · app **nie** podłączona |
| **Workflow Przetargi** | Workspace v2 · Hub · Process Strip · CTA — [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) · [`NG-TENDERS-WORKSPACE-01-CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **Cost Knowledge** | Thin Slice A0+A1 — [`cost-knowledge/`](../../src/lib/cost-knowledge/) · [`NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |

Szczegóły living: [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [`PROJECT-GUIDE.md`](../../PROJECT-GUIDE.md) · [`AGENTS.md`](../../AGENTS.md) (proces, nie tip).

---

## Closed Work

> Pełne listy historyczne → closeouty w `docs/architecture/*`. Tu tylko **aktualnie istotne** tipy.

| Nazwa | Wersja | Commit | Status | PV |
|-------|--------|--------|--------|-----|
| **NG-TENDERS-COST-KNOWLEDGE-01** | **2.66.20** tip | feature **`9c0901d6`** · docs **`f2b0fa1e`** | **EPIC CLOSED** · A0 KPI Harness RO · A1 Library Fill + Quotes REUSE | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |
| **NG-TENDERS-WORKSPACE-01** | **2.66.19** | **`182dd9af`** | **EPIC CLOSED** · Workspace v2 · Przegląd start · 4 tabs · AC-RETURN · Firma Hub · hide module nav | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** | **2.66.17** | **`e871fed6`** | **EPIC CLOSED** · draft↔final · unsetDrawingFinal · Model A delete · ACL session · audit | **YES** · [`CLOSEOUT`](../architecture/WM-ODBIORY-RYSUNKI-FINAL-UNDO-01-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-02** | **2.66.16** | **`377e279f`** | **EPIC CLOSED** · Publication Workflow · `placement` · `resolved` · Promote-copy 1:1 · A2 NO TOUCH | **YES** · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01 P2a** | **2.66.15** | **`e9598c99`** | **P2a CLOSED** · Dashboard Szkice Techniczne (job-centric) · HIGH→NORMAL · Jobs→Dokumentacja→drawingId · A2 NO TOUCH | **YES** · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01 P0** | **2.66.14** | **`0afeb82d`** | **P0 CLOSED** · Dokumentacja→Szkice Techniczne · Needs Changes · Resubmit · (Accept superseded by -02) · A2 NO TOUCH | **YES** · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **2.66.13** · P0 **2.66.12** | P1 **`4f99a279`** · P0 **`3c9d6f90`** | **EPIC CLOSED** · P0+P1 CLOSED · Worker Docs→Szkice · drag-release · snap · flag OFF | **YES** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-DRUK-OST-APPEARANCE-01** | 2.66.11 | `4d33361e` | **CLOSED** · OST `/AP` adresu | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-APPEARANCE-01-CLOSEOUT.md) |
| **WM-DRUK-OST-AUTO-GENERATE-01** | 2.66.10 | `82dc1017` | **CLOSED** · S2 Hard Ensure OST w ZIP | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-AUTO-GENERATE-01-CLOSEOUT.md) |
| **WM-DRUK-OST-MAPPING-MIGRATION-01** | 2.66.09 | `56069cce` | **CLOSED** · migrate OST pdfFieldMapping | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-MAPPING-MIGRATION-01-CLOSEOUT.md) |
| **WM-DRUK-OST-01** | 2.66.08 | `949333ed` | **CLOSED** · OST pdf_form · thin guard · upload-only | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-01-CLOSEOUT.md) |
| **WORKER-INSPECTOR-MOBILE-01 WIM-P1a** | 2.66.07 | `3df0d24a` | **CLOSED** · Capture & Privacy Worker | **YES** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P1a-CLOSEOUT.md) |
| **WORKER-INSPECTOR-MOBILE-01 WIM-P0** | 2.66.06 | `1f04f559` | **CLOSED** · viewport SSOT Worker+Inspector | **YES** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01 MOBILE-P1** | 2.66.05 | `59f09c1c` | **CLOSED** · hit · 44px · modal · create | **YES** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P1-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01 MOBILE-P0** | 2.66.04 | `13ca099b` | **CLOSED** · portal FS · gesty | **YES** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3B.1** | 2.66.03 | `77f18b78` | **CLOSED** · continuous UX fix | **YES** · STOP po wall · tool sticky · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3B** | 2.66.02 | `abe57f9a` | **CLOSED** · interactive Ghost | **YES** · Ghost · continuous (SUPERSEDED by P3B.1) · ESC · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3A** | 2.66.01 | `20e5c5a3` | **CLOSED** · polish po CORE | **YES** · UX W/P/W/R · gap · wymiar · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3** | 2.66.00 | `8d4abcc9` | **CLOSED** · **EPIC CORE COMPLETE** | **YES** · ZIP Rysunki · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P2** | 2.65.99 | `4e84f994` | **CLOSED** | **YES** · PDF export · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P2-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P1B** | 2.65.98 | `ad69bcb5` | **CLOSED** | **YES** · AppSettings rollout · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1B-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P1** | 2.65.97 | `0b37787d` | **CLOSED** | **YES** · toolset · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P0** | 2.65.96 | `028e4819` | **CLOSED** | **YES** · flaga OFF · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P0-CLOSEOUT.md) |
| **MARKET-SYNC-01 P3-A** | 2.65.95 | `7325c773` | **CLOSED** | mock spine · flaga OFF · Legal OPEN · nie tip UI |
| **AI-COST-02 I3** | 2.65.95 | feature `869b4c52` · docs `99969f33` | **FULLY CLOSED** | **YES** · flaga OFF · UI ⇒ 02-B ON |
| **MARKET-SYNC-01 P2** | 2.65.95 | `18830c11` / tip `18830c1` | **FULLY CLOSED** | **YES** · flaga OFF |
| **SMART-PRICING-01 P2** | 2.65.95 | `99c6337` | **CLOSED** | **YES** · flaga OFF · P2⇒P1 |
| **SMART-PRICING-01 P1** | 2.65.95 | `d8b080e` | **CLOSED** | **YES** · flaga OFF |
| **GLOBAL-UX-02** | 2.65.95 | `3385d9f` | **FULLY CLOSED** | **YES** · S9 DEFERRED |
| **AI-DOC-DETECTION** | 2.65.95 | `023ac686` | **FULLY CLOSED** | **YES** |
| Scope Gap MVP | 2.65.93 | `4234617b` | FULLY CLOSED | YES* |
| Confidence MVP | 2.65.92 | `00a5d873` | FULLY CLOSED | YES* |
| CATALOG-COVERAGE-01 (P0a–P0e) | 2.65.87–91 | tip P0e `b69aeaae` | **FULLY CLOSED** | YES · coverage 78.1% |
| SMART-PRICING-01 P0 | 2.65.86 | `9ca4a4e5` | CLOSED | YES |
| MARKET-SYNC-01 P1 / P0 | 2.65.85 / 84 | `5326cf8c` / `273fb3e0` | CLOSED | YES |
| CENY-MATERIAŁÓW-04 P2 / P1 | — / 2.65.81–83 | P1-C `992023cc` | COMPLETE | YES |
| WORK-CATALOG-P3.3 | 2.65.79 | `e10a1511` | CLOSED | YES |
| AI-COST-02-B | 2.65.78 | `9dc113e7` | CLOSED | YES |
| AI-COST-PARSER-01 P0-RETRY | 2.65.77 | `e88d689f` | CLOSED | YES |
| COST-BID-GAP-01 / GAP-A | 2.65.77 | `a061bbd` | CLOSED | YES |
| COST-MULTI (seria) | 2.65.74–76 | — | SERIES CLOSED | YES |
| AI-COST-01 | — | — | EPIC COMPLETE · FROZEN | FIELD READY |
| TRE-02 / TRE-01 | 2.65.64 / 63 | — | CLOSED | YES |
| UI Foundation · Dashboard Body · GDS | — | — | COMPLETE | — |
| Payroll Hours-wipe | 2.65.43 | `ea1b0a6` | CLOSED | — |

\*Scope/Confidence: residual CI TEUX6/jobs-mobile **UNRELATED/Open** (Owner accepted przy CLOSE).

**AI-DOC-DETECTION (skrót):** Doc.D1 Przedmiar · Doc.D2 Dokumenty wspierające · Doc.D3 Kosztorys ofertowy · aliasy BOQ / Bill of Quantities / ślepy · UX brak przedmiaru / OCR / brak odczytu / brak kosztorysu ofertowego · [`CLOSE`](../architecture/AI-DOC-DETECTION-CLOSE-01.md).

---

## Active Work

| Warstwa | Stan |
|---------|------|
| **Production** | Tip = **NG-TENDERS-COST-KNOWLEDGE-01 CLOSED** · **2.66.20** / **`f2b0fa1e`** · feature **`9c0901d6`** · **PRODUCTION VERIFIED** · **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO** |
| **ACTIVE EPIC / IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **NG-TENDERS-COST-KNOWLEDGE-01** | **EPIC CLOSED** · A0+A1 · [`CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |
| **NG-TENDERS-WORKSPACE-01** | **EPIC CLOSED** · Workspace Architecture v2 · [`CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** | **EPIC CLOSED** · Final undo · [`CLOSEOUT`](../architecture/WM-ODBIORY-RYSUNKI-FINAL-UNDO-01-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-02** | **EPIC CLOSED** · Publication Workflow · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01** | **P0 CLOSED** · **P2a CLOSED** · tip hist. · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **EPIC CLOSED** · **P0 CLOSED** · **P1 CLOSED** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-DRUK-OST** | **01 + MIGRATION + AUTO-GENERATE S2 + APPEARANCE CLOSED** · AcroForm PASS · **OST-03 DO NOT IMPLEMENT** |
| **WORKER-INSPECTOR-MOBILE-01** | **WIM-P0+P1a CLOSED** · **WIM-P1b WAITING** — tylko Owner GO → AUDIT |
| **WM-RYSUNKI-MOBILE-01** | **MOBILE-P0+P1 CLOSED** · **MOBILE-P2 WAITING** |
| **WM-RYSUNKI-01** | **CORE COMPLETE** · **P4 BACKLOG** |
| **Pierwszy krok po Owner GO** | zawsze **AUDIT** → PLAN → DF → AR → GO → IMPLEMENT |

Kandydaci: [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md).

---

## WIP (local only)

> **Nie** jest tipem produkcji. **Nie** commit/push bez jawnego Owner GO.

| Item | Stan | Uwagi |
|------|------|-------|
| **Bid Time-Load Guard MVP** | WIP lokalny · OV **PASS – READY FOR GO COMMIT** | Flaga `kw-bid-time-load-guard` default OFF · **nie** tip prod (tip = **2.66.20** NG-TENDERS-COST-KNOWLEDGE-01) |
| Inne WT (storage, theme, supabase, `.tmp-*`) | szum / obce WIP | **nie** `git add -A` · **nie** mieszać z docs sync |

---

## Feature Flags

| Flaga LS | Default | Status feature | Prod / local |
|----------|---------|----------------|--------------|
| `kw-wm-rysunki-01` | **OFF** (LS fallback) | P0+P1+P1B+P2+P3+P3A+P3B+P3B.1 **CLOSED** · CORE COMPLETE · SSOT = `AppSettings.wmRysunkiEnabled` default OFF | **prod** (OFF) |
| `wmWorkerSketchEnabled` (AppSettings) | **OFF** | **WM-WORKER-SKETCH-01 CLOSED** + **DOKUMENTACJA-SZKICE-01/-02 CLOSED** · Worker/Admin/Inspector Szkice + Dashboard + Publication | **prod** (OFF) |
| `kw-market-sync-01-p3` | **OFF** | P3-A **CLOSED** · shipped mock | **prod** (OFF) · Legal Gate **OPEN** |
| `kw-market-sync-01-p2` | **OFF** | FULLY CLOSED · shipped | **prod** (OFF) |
| `kw-ai-cost-02-i3-competitiveness` | **OFF** | FULLY CLOSED · shipped | **prod** (OFF) · UI ⇒ 02-B ON |
| `kw-smart-pricing-01-p2` | **OFF** | CLOSED · shipped | **prod** (OFF) · P2⇒P1 |
| `kw-smart-pricing-01-p1` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-confidence-mvp` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-scope-gap-mvp` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-bid-time-load-guard` | **OFF** | WIP · nie tip | **local only** |
| `kw-ai-cost-02-b-explain-queue` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-wc-p33-market-pricing-ux` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-ceny-materialow-01` | **OFF** | CLOSED · shipped | **prod** (OFF) |

Włączenie: `localStorage` = `'1'`. Tip parity gdy OFF.

---

## Residual Issues

| ID / temat | Status |
|------------|--------|
| **OST PDF fill round-trip** | **KNOWN LIMIT** — LiveCycle/XFA/Encrypt · pdf-lib unsupported · fix = **ACROFORM-01** (nowy PDF) · **nie** OST-03 |
| **CI TEST-INFRA TEUX7E** (NG-TENDERS residual) | **Open** — Gate B `LIB-TENDER-STRATEGY-TEUX7E` · **NOT PART OF** NG-TENDERS-WORKSPACE-01 · pre-existed |
| **CI Mobile Smoke / Legacy Happy Path** (Jobs · Dokumentacja) | **Open** — **NOT PART OF** NG-TENDERS-WORKSPACE-01 · pre-existed |
| CI E2E / TEST-INFRA / Mobile (residual Doc Detection) | **Open** — nie diagnozowano w Doc Detection CLOSE |
| TEUX6 / jobs-mobile (AI v2 Confidence/Scope) | **UNRELATED / Open** (Owner accepted) |
| FND-06 Observability | **BLOCKED** — brak Implementation Spec |
| NG-05 | **BLOCKED** (legal) |
| Persist race COST-MULTI | MONITOR (closeout) |
| MS P3 Legal Gate | **OPEN** — blocks P3-B live · P3-A mock shipped |

---

## Known Decisions

1. Tip wersji **tylko** w `09` (+ live `version.json`) — nie hardcoduj w rules / Continuity.  
2. Thin Slice: jeden concern · allowlist · DF · izolowany commit · PV · CLOSE.  
3. `dossier.kosztorys` = pole techniczne — **bez rename** (Doc Detection).  
4. Bid Proposal = jedyny generator oferty (AI-COST FROZEN).  
5. Catalog pipeline mapowania **FROZEN** · Fuzzy **OFF** · DATA FIRST.  
6. Commit/push **tylko** na polecenie Ownera · **nie** `git add -A`.  
7. Stabilization Window: **nie** auto-start EPIC.  
8. Stan po fali CLOSE: **WAITING FOR NEXT OWNER GO**.  
9. MS P3-B: Owner GO → AUDIT → DF → … · Legal PASS wymagany dla live.  
10. **OST:** nie patchować LiveCycle/XFA przez pdf-lib · **ACROFORM-01** = nowy formularz · **OST-03 DO NOT IMPLEMENT**.

---

## Current Constraints

- **NO** IMPLEMENT bez Entry + Gate G1–G9 (+ Owner GO gdy FEATURE/CORE).  
- **NO** mieszanie FEATURE + CORE w jednym release.  
- **NO** `vercel deploy` / force-push `main`.  
- **NO** podłączania app do `wgdom-foundation` bez osobnego EPIC.  
- **NO** przebudowy AI-COST-01 / merge payroll bez nowego DF + GO.  
- **NO** WM-DRUK-OST-03 / XFA parser / obejść pdf-lib.  
- Working tree często brudny — stage **jawny** allowlist.

---

## Next Recommended Task

**WAITING FOR NEXT OWNER GO** — ACTIVE EPIC = **NONE** · brak auto-NEXT.

Rekomendacje (wymagają **Owner GO** → **AUDIT**): WIM-P1b · MOBILE-P2 · P4 Rysunki · MS P3-B · SMART P3 · CM-04 P3 · Wave 2 · GAP-B / TP200B · Bid Time-Load Guard izolowany COMMIT.

**Zakaz:** auto-start **OST-03** · XFA · cache filled · WIM-P1b · MOBILE-P2 bez GO.

---

## Ready-To-Start Checklist

```text
[ ] Przeczytaj TEN plik (MASTER-AI-HANDOFF)
[ ] Sprawdź tip: 09_PRODUCTION_BASELINE + curl version.json  (= 2.66.19 / 182dd9af gdy CDN OK)
[ ] AI_ENTRY → proces
[ ] PAYROLL_SAFETY_GATE G1–G9 (przed IMPLEMENT)
[ ] Owner GO gdy wymagane
[ ] Nie czytaj historii czatu / nie zgaduj tipu
```

---

## AI Startup Instructions

```text
1. docs/AI/MASTER-AI-HANDOFF.md     ← JESTEŚ TUTAJ (stan świata)
2. docs/AI/09_PRODUCTION_BASELINE.md + https://www.wgdom.fun/version.json
3. docs/AI/AI_ENTRY.md              ← proces AUDIT→…→CLOSE
4. docs/AI/PAYROLL_SAFETY_GATE.md   ← przed kodem
5. Tematycznie:
   · Doc Detection → AI-DOC-DETECTION-CLOSE-01
   · AI v2         → AI-V2-P0-BASELINE-UPDATE-01
   · Catalog       → CATALOG-COVERAGE-01-EPIC-CLOSEOUT
   · Worker/Inspector mobile → WORKER-INSPECTOR-MOBILE-01-WIM-P1a-CLOSEOUT (tip) + WIM-P0-CLOSEOUT
   · Dokumentacja Szkice → WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT (tip) + P2a/P0 CLOSEOUT (hist.)
   · Worker Sketch → WM-WORKER-SKETCH-01-EPIC-CLOSEOUT (P0+P1 CLOSED · tip hist. 2.66.13)
   · WM Rysunki   → WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT (MOBILE-P0 CLOSED) + WM-RYSUNKI-01-P3B1-… (desktop CORE · P4 backlog)
   · Bid Guard WIP → AI-V2-P0.1-* (tylko local)
   · MS P3        → MARKET-SYNC-01-P3-AUDIT / DF / OV (P3-A CLOSED)
   · NEXT backlog  → NEXT-EPIC-CANDIDATES
6. AGENTS.md / ARCHITECTURE.md / PROJECT-GUIDE.md — po Entry, nie zamiast
7. IMPLEMENT tylko po Gate PASS + Owner GO
8. Commit/push tylko na jawne polecenie Ownera
```

**DEPRECATED entry (nie startuj):** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

**Skrót 1-stronicowy:** [`AI_QUICK_START.md`](AI_QUICK_START.md) (musi wskazywać ten plik).

---

## AI v2 — stan (skrót)

| Slice | Stan |
|-------|------|
| Confidence | **FULLY CLOSED** · prod · flaga OFF |
| Scope Gap | **FULLY CLOSED** · prod · flaga OFF |
| Document Detection | **FULLY CLOSED** · UI 2.65.95 · feature `023ac686` |
| Bid Time-Load Guard | **WIP local** · OV PASS · nie tip |
| SMART | P0–P2 **CLOSED** · **P3 backlog** |
| GLOBAL-UX-02 | **FULLY CLOSED** · feature **`3385d9f`** · S9 DEFERRED |
| MS (Market Sync) | P0–P2 **FULLY CLOSED** (P2 tip **`18830c1`**) · **P3-A CLOSED** (`7325c773`) · P3 EPIC **WAITING** (P3-B · Legal OPEN) |
| **WM-DOKUMENTACJA-SZKICE-02** | **EPIC CLOSED** · tip **`377e279f`** / **2.66.16** · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01** | **P0+P2a CLOSED** · tip hist. **`e9598c99`** / **2.66.15** · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **EPIC CLOSED** · tip hist. **`4f99a279`** / **2.66.13** · P0 **`3c9d6f90`** / **2.66.12** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01** | **MOBILE-P0+P1 CLOSED** · tip historyczny **`59f09c1c`** / **2.66.05** · **MOBILE-P2 WAITING** |
| **WORKER-INSPECTOR-MOBILE-01** | **WIM-P0+P1a CLOSED** · tip historyczny **`3df0d24a`** / **2.66.07** · **WIM-P1b WAITING** |
| **WM-RYSUNKI-01** | **P0+P1+P1B+P2+P3+P3A+P3B+P3B.1 CLOSED** · **EPIC CORE COMPLETE** · tip historyczny **`77f18b78`** / **2.66.03** · continuous UX fix · Ghost · UX polish · ZIP Rysunki · AppSettings OFF · **P4 BACKLOG** |
| AI-COST-02 | 02-A · 02-B · **I3 FULLY CLOSED** · dalsze backlog |
| CM (Ceny materiałów) | 01 + 04 P1/P2 **CLOSED** · **P3 AUDIT backlog** |
