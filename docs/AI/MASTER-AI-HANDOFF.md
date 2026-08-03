# WGDOM — MASTER AI HANDOFF

> **ID:** MASTER-AI-HANDOFF  
> **STATUS:** **ACTIVE** · **★★ GŁÓWNY SSOT cold-start** (ChatGPT · Cursor)  
> **MODE:** DOCUMENTATION ONLY  
> **Data:** 2026-08-03  
> **Tip numeryczny:** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Proces:** [`AI_ENTRY.md`](AI_ENTRY.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)  
> **Alias / skrót:** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) → **ten plik**  
> **Docs sync:** [`PROJECT-DOCS-SYNC-DESIGN-FREEZE.md`](../architecture/PROJECT-DOCS-SYNC-DESIGN-FREEZE.md)

```text
Nie czytaj historii czatu. Nie zgaduj tipu.
Tip = 09 + version.json → 2.65.95 / 18830c1 (MARKET-SYNC-01 P2 FULLY CLOSED)
Docs HEAD = 7325c773 (I3 CLOSE docs + MS P3-A)
Tryb = UTRZYMANIE · WAITING FOR NEXT OWNER GO
STABILIZATION WINDOW ACTIVE
Nowy EPIC / P3-B = tylko Owner GO → AUDIT najpierw
```

---

## Executive Summary

W&G DOM jest w trybie **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**. Tip produkcji: **UI 2.65.95** / commit **`18830c1`** (branch **`main`**) — **MARKET-SYNC-01 P2 FULLY CLOSED**. Docs HEAD: **`7325c773`**.

Ostatnie zamknięte: **AI-COST-02 I3 FULLY CLOSED** (docs CLOSEOUT `99969f33`) · **MARKET-SYNC-01 P3-A CLOSED** (mock ingest spine · `7325c773` · flaga OFF · Legal OPEN) · **MS P2** · **SMART P0–P2** · **GLOBAL-UX-02**.  
**MARKET-SYNC-01 P3** (EPIC) = **WAITING** — P3-B / live **tylko** po Owner GO → AUDIT → DF (Legal Gate nadal **OPEN**).  
**SMART-PRICING-01 P3** / **CM-04 P3** / **Wave 2** = **zakaz** bez Owner GO AUDIT.  
**Bid Time-Load Guard** = **tylko WIP lokalny** (OV PASS, **nie** na prod).  
Backlog **bez** Owner GO = **zakaz IMPLEMENT**. **NEXT EPIC started = NONE**.

Protected Core **GREEN**. Stabilization Window **ACTIVE**. Lista Płac = priorytet #1.

---

## Current Production Baseline

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Branch** | `main` |
| **UI version** | **2.65.95** |
| **Commit** | **`18830c1`** (full `18830c118d6f3918ac7f0b2c2e019359510ec70b`) |
| **Status** | **PRODUCTION VERIFIED** · tip = MARKET-SYNC-01 P2 · Docs HEAD **`7325c773`** · **WAITING FOR NEXT OWNER GO** |
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
| **Workflow Przetargi** | Hub · Process Strip · CTA — [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) |

Szczegóły living: [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [`PROJECT-GUIDE.md`](../../PROJECT-GUIDE.md) · [`AGENTS.md`](../../AGENTS.md) (proces, nie tip).

---

## Closed Work

> Pełne listy historyczne → closeouty w `docs/architecture/*`. Tu tylko **aktualnie istotne** tipy.

| Nazwa | Wersja | Commit | Status | PV |
|-------|--------|--------|--------|-----|
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
| **Production** | Tip = MS P2 FULLY CLOSED · Docs HEAD **`7325c773`** · **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO** |
| **MARKET-SYNC-01 P3** | **P3-A CLOSED** · EPIC **WAITING** — P3-B/live **tylko** Owner GO → AUDIT → DF (Legal **OPEN**) |
| **SMART-PRICING-01 P3** | **ZAKAZ** bez Owner GO AUDIT |
| **Backlog (bez GO)** | CM-04 P3 (INNE) AUDIT · Catalog Wave 2 · GAP-B / TP200B · AI v2 P1 Explain/History |
| **Pierwszy krok po Owner GO** | zawsze **AUDIT** → PLAN → DF → AR → GO → IMPLEMENT |

Kandydaci: [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md).

---

## WIP (local only)

> **Nie** jest tipem produkcji. **Nie** commit/push bez jawnego Owner GO.

| Item | Stan | Uwagi |
|------|------|-------|
| **Bid Time-Load Guard MVP** | WIP lokalny · OV **PASS – READY FOR GO COMMIT** | Flaga `kw-bid-time-load-guard` default OFF · changelog WT może pokazywać **2.65.96** · **nie** na `origin/main` / prod |
| Inne WT (storage, theme, supabase, `.tmp-*`) | szum / obce WIP | **nie** `git add -A` · **nie** mieszać z docs sync |

---

## Feature Flags

| Flaga LS | Default | Status feature | Prod / local |
|----------|---------|----------------|--------------|
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

---

## Current Constraints

- **NO** IMPLEMENT bez Entry + Gate G1–G9 (+ Owner GO gdy FEATURE/CORE).  
- **NO** mieszanie FEATURE + CORE w jednym release.  
- **NO** `vercel deploy` / force-push `main`.  
- **NO** podłączania app do `wgdom-foundation` bez osobnego EPIC.  
- **NO** przebudowy AI-COST-01 / merge payroll bez nowego DF + GO.  
- Working tree często brudny — stage **jawny** allowlist.

---

## Next Recommended Task

**WAITING FOR NEXT OWNER GO** — brak auto-NEXT.

Rekomendacje (wymagają **Owner GO** → **AUDIT**):

1. **MARKET-SYNC-01 P3-B** (Legal PASS + live/adapter) · **SMART P3** · **CM-04 P3** · **Catalog Wave 2**, **albo**  
2. **GAP-B / TP200B** (alternatywy), **albo**  
3. **Bid Time-Load Guard** — izolowany GO COMMIT / PUSH (WIP gotowy OV), **albo**  
4. Residual CI triage (osobny brief — nie mieszać z FEATURE).

**Zakaz:** auto-start P3-B · live bez Legal PASS.

---

## Ready-To-Start Checklist

```text
[ ] Przeczytaj TEN plik (MASTER-AI-HANDOFF)
[ ] Sprawdź tip: 09_PRODUCTION_BASELINE + curl version.json  (= 2.65.95 / 18830c1)
[ ] AI_ENTRY → proces
[ ] PAYROLL_SAFETY_GATE G1–G9 (przed IMPLEMENT)
[ ] Tematyczny CLOSE/DF (jeśli FEATURE)
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
| AI-COST-02 | 02-A · 02-B · **I3 FULLY CLOSED** · dalsze backlog |
| CM (Ceny materiałów) | 01 + 04 P1/P2 **CLOSED** · **P3 AUDIT backlog** |
