# WGDOM — MASTER HANDOFF (ChatGPT · Cursor)

> **ID:** CATALOG-COVERAGE-01 **P0a CLOSED** · SMART-PRICING-01 **P0 CLOSED** · MARKET-SYNC-01 **P1 CLOSED** · P0 **CLOSED** · CENY-MATERIAŁÓW-04 **P2 COMPLETE** · P1 (**COMPLETE**) · CENY-MATERIAŁÓW-01 (**CLOSED**) · WORK-CATALOG-P3.3 (**CLOSED**) · AI-COST-02-B (**CLOSED**) · AI-COST-PARSER-01 P0-RETRY (**CLOSED**) · COST-BID-GAP-01 / GAP-A (**CLOSED**) · COST-MULTI (**SERIES CLOSED**) · COST-02-A (**CLOSED**) · Foundation Lib Phase 0 (**COMPLETE**)  
> **STATUS:** **ACTIVE** · **MASTER HANDOFF nowych sesji**  
> **Data:** 2026-07-30  
> **Zakaz:** implementacja / commit / push bez ścieżki Entry + Gate + Owner GO  
> **Tip SSOT (numery wersji):** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
NOWA SESJA: przeczytaj TEN plik (≤10 min) → AI_ENTRY → Gate
Nie przeszukuj historii czatu. Nie zgaduj tipu z pamięci.
Tip = 09 + version.json (UI 2.65.87 · feature CATALOG-COVERAGE-01 P0a 51a56f0d)
CATALOG-COVERAGE-01 P0a = CLOSED (Noise Filter)
  SSOT = docs/architecture/CATALOG-COVERAGE-01-P0a-CLOSEOUT.md
  NEXT slice = P0b (Normalizer) — tylko po Owner GO (nie auto-start)
SMART-PRICING-01 P0 = CLOSED (Detect Quotes-first RO)
  SSOT = docs/architecture/SMART-PRICING-01-P0-CLOSEOUT.md
  NEXT slice = P1 — tylko po Owner GO (nie auto-start)
MARKET-SYNC-01 P1 = CLOSED (Accept+Publish via commitMarketQuotesImport)
  SSOT = docs/architecture/MARKET-SYNC-01-P1-CLOSEOUT.md
  NEXT slice = P2 AUDIT — tylko po Owner GO (nie auto-start)
MARKET-SYNC-01 P0 = CLOSED (Model+Preview staging)
  SSOT = docs/architecture/MARKET-SYNC-01-P0-CLOSEOUT.md
CENY-MATERIAŁÓW-04 P2 = COMPLETE (P2-A · P2-B · Residual ROZ)
  SSOT = docs/architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md
CENY-MATERIAŁÓW-04 P1 = COMPLETE (P0 · P1-A · P1-B · P1-C)
  SSOT = docs/architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md
NEXT (katalog INNE) = CENY-MATERIAŁÓW-04 P3 (INNE) AUDIT — tylko po Owner GO
  (AUDIT → PLAN → DESIGN FREEZE · nie auto-start IMPLEMENT)
CENY-MATERIAŁÓW-01 Phase 1 = CLOSED · PRODUCTION VERIFIED
WORK-CATALOG-P3.3 Phase 1 = CLOSED · PRODUCTION VERIFIED
AI-COST-02-B Phase 1 = CLOSED · PRODUCTION VERIFIED
AI-COST-PARSER-01 P0-RETRY = CLOSED · PRODUCTION VERIFIED
COST-BID-GAP-01 / GAP-A = CLOSED · PRODUCTION VERIFIED
COST-MULTI = EPIC / SERIES CLOSED · PRODUCTION VERIFIED (2.65.74–76)
AI-COST-01 = EPIC COMPLETE · FROZEN · FIELD READY
AI-COST-02 / COST-02-A = EPIC COMPLETE · PRODUCTION VERIFIED · CLOSED
Handoff sesji = docs/architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md
Foundation Lib Phase 0 = COMPLETE (FND-01…05 @ origin/main bed8dd8)
FND-06 = BLOCKED — ADR lub Blueprint extension najpierw
App NIE używa jeszcze Foundation Lib (Przetargi/Roboty/Kadry/Kosztorysy)
════════════════════════════════════════════════════════
```

---

## 0. Gdzie zaczynać

```text
1. docs/AI/MASTER_HANDOFF.md     ← JESTEŚ TUTAJ (stan + NEXT)
2. docs/AI/AI_ENTRY.md           ← oficjalny START procesu
3. docs/AI/PROJECT_HANDOFF.md
4. docs/AI/AI_MEMORY.md
5. docs/AI/AI_DECISION_TREE.md
6. docs/AI/PAYROLL_SAFETY_GATE.md   ← G1–G9 przed IMPLEMENT
7. docs/AI/09_PRODUCTION_BASELINE.md  ← tip (lub version.json)
8. CURRENT-TASK.md
9. FEATURE_IMPLEMENTATION_CHECKLIST.md
10. IMPLEMENT tylko po Gate PASS + Owner GO gdy wymagane

Gdy temat = Foundation Lib / FND-* / wgdom-foundation:
  → docs/architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md

Gdy temat = AI Cost / oferta / kosztorys AI:
  → docs/architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
  → docs/architecture/WGDOM-AI-COST-01-SSOT.md
  → docs/architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md
  → docs/architecture/WGDOM-AI-COST-02-STARTING-POINT.md
  → (COST-02-A CLOSED) docs/architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md
  → (02-B CLOSED) docs/architecture/AI-COST-02-B-CLOSEOUT.md

Gdy temat = wielobranżowy kosztorys / Aggregate Bid / Force Rescan / luka Bid / F2 Ponów ZIP:
  → docs/architecture/COST-MULTI-CLOSEOUT.md  (SERIES CLOSED)
  → docs/architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md  (P0-RETRY CLOSED · PV)
  → docs/architecture/COST-BID-GAP-01-CLOSEOUT.md  (GAP-A CLOSED · PV)
  → docs/architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md  (handoff cold-start)
  → docs/architecture/NEXT-EPIC-CANDIDATES.md  (następny: GAP-B / I3 / TP200B)
```
**Root README / AGENTS.md** — po Entry, nie zamiast Entry.  
**DEPRECATED start:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

---

## 1. Aktualny stan projektu (snapshot)

> Numery poniżej = skrót na dzień closeout. **Przed kodem** zawsze zweryfikuj [`09`](09_PRODUCTION_BASELINE.md) / `version.json`.

| Pole | Wartość |
|------|---------|
| **Production URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Production Version (UI)** | **2.65.83** — SSOT [`09`](09_PRODUCTION_BASELINE.md) · live `version.json` |
| **Live deploy** | tip w [`09`](09_PRODUCTION_BASELINE.md) · **CENY-MATERIAŁÓW-04 P2 COMPLETE** (FEATURE-DATA WC) · UI tip **2.65.83** |
| **Ostatni feature (katalog / ceny)** | **CENY-MATERIAŁÓW-04 P2** · **P2 COMPLETE** · [`P2-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) · P1 tip UI **2.65.83** / **`992023cc`** |
| **Payroll Hours-wipe baseline** | **2.65.43** @ **`ea1b0a6`** (semantyka D1–D5 ACTIVE) |
| **Status projektu** | **PRODUCTION VERIFIED · GREEN** · **STABILIZATION WINDOW ACTIVE** |
| **Protected Core** | **GREEN** |
| **Ostatni EPIC (AI Cost)** | **AI-COST-01** — **EPIC COMPLETE** · **FIELD READY** · **ARCHITECTURE FROZEN** |
| **Freeze / SSOT** | [`ARCHITECTURE-FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) · Cold Start [`PASS`](../architecture/WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md) |
| **AI-COST-02** | **COST-02-A CLOSED** · **02-B Phase 1 CLOSED** · [`02-B-CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) · I3 **BACKLOG** · [`STARTING-POINT`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) |
| **AI-COST-PARSER-01 P0-RETRY** | **CLOSED** · **PV** · UI **2.65.77** · **`e88d689f`** · [`CLOSEOUT`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) · [`PV`](../architecture/AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md) |
| **COST-BID-GAP-01** | **GAP-A CLOSED** · **PV** · UI **2.65.77** · [`CLOSEOUT`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) · Handoff [`SESSION-HANDOFF-POST-COST-BID-GAP-01`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md) |
| **COST-MULTI** | **SERIES CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.74–2.65.76** · [`CLOSEOUT`](../architecture/COST-MULTI-CLOSEOUT.md) · FINAL PV [`../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md`](../verification/RCA-MULTI-02-FINAL-PRODUCTION-VERIFY.md) |
| **Ostatni EPIC (UI shell)** | **WGDOM UI FOUNDATION v1.0** — **COMPLETE** |
| **Dashboard Body** | **BODY S1–S4** — **COMPLETE** |
| **GDS** | **GDS-01 CLOSED** · **MAINT-01 CLOSED** · DS-13 |
| **CI** | Gate B/C **GREEN** · residual **CI-C-2** (P3) |
| **Deploy FE** | `git push origin main` → Vercel (**zakaz** `vercel deploy`) |
| **Foundation Lib Phase 0** | **COMPLETE** · tip git **`bed8dd8`** · FND-01…05 na `origin/main` · [`FOUNDATION-LIB-SSOT`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) |
| **FND-06 Observability** | **BLOCKED** — brak Implementation Spec (wymagany ADR / Blueprint §9) |

---

## 1a. Foundation Lib — skrót (nie UI Foundation)

| Pakiet | Commit | Status |
|--------|--------|--------|
| FND-01 Identifiers | `ae1ef96` | **COMPLETE** · pushed |
| FND-02 Digest | `c6b881a` | **COMPLETE** · pushed |
| FND-03 Errors | `1c435fb` | **COMPLETE** · pushed |
| FND-04 Audit | `ca5fbf7` | **COMPLETE** · pushed |
| FND-05 Event | `bed8dd8` | **COMPLETE** · pushed |

**Kod:** `src/lib/wgdom-foundation/` · root export `id`+`digest`+`errors`+`audit`+`events`.  
**Integracja app:** **NIE** — Przetargi / Roboty / Kadry / Kosztorysy **nie** używają jeszcze tej lib.  
**SSOT pełny:** [`WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md).  
**Nie mylić z:** UI Foundation ([`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md)).

---

## 2. Co zostało zrobione (historia — zwięźle)

Nie kopiuj pełnych raportów. Linki = SSOT szczegółów.

| EPIC / seria | Rezultat |
|--------------|----------|
| **CENY-MATERIAŁÓW-04 P2** (P2-A · P2-B · Residual ROZ) | **COMPLETE** · **CLOSED** · FEATURE-DATA WC · K-P2-1/2/3 PASS · residual **16≤18** · [`P2-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P1** (P0 · P1-A · P1-B · P1-C) | **COMPLETE** · **PRODUCTION VERIFIED** · UI **2.65.83** · feature P1-C **`992023cc`** · [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P1-C** | **CLOSED** · FEATURE-DATA · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P1-B** | **CLOSED** · FEATURE-DATA · UI **2.65.82** · `dca25c96` · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P1-A** | **CLOSED** · FEATURE-DATA · UI **2.65.81** · `dc0daea0` · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P0** | **CLOSED** · OPS Quotes heal · [`P0-OPS`](../architecture/CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE.md) |
| **CENY-MATERIAŁÓW-01** | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.80** · `d4d05706` · [`CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-01-CLOSEOUT.md) |
| **WORK-CATALOG-P3.3** | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.79** · `e10a1511` · [`CLOSEOUT`](../architecture/WORK-CATALOG-P3.3-CLOSEOUT.md) |
| **AI-COST-02-B** | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.78** · `9dc113e7` · [`CLOSEOUT`](../architecture/AI-COST-02-B-CLOSEOUT.md) |
| **AI-COST-PARSER-01 P0-RETRY** | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.77** · `e88d689f` · [`CLOSEOUT`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) |
| **COST-BID-GAP-01 / GAP-A** | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.77** · `a061bbd` · [`CLOSEOUT`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) |
| **COST-MULTI** (01 → 02 → Force Rescan) | **CLOSED** · **PRODUCTION VERIFIED** · UI **2.65.74–2.65.76** · [`CLOSEOUT`](../architecture/COST-MULTI-CLOSEOUT.md) · FINAL PV PASS |
| **Foundation Lib Phase 0 (FND-01…05)** | **COMPLETE** · `ae1ef96`…`bed8dd8` @ `origin/main` · [`SSOT`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md) |
| **AI-COST-02 / COST-02-A** | **CLOSED** · **EPIC COMPLETE** · **PV** · controlled market w S4 · UI **2.65.62** · [`CLOSEOUT`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| **AI-COST-01** (S1–S7 + STAB-01 + FREEZE-01) | **EPIC COMPLETE** · **FIELD READY** · **FROZEN** · Bid Proposal = jedyny generator oferty · [`FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`LESSONS`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AP2 Analiza Przetargów 2.0** (S0–S4) | **CLOSED** (docs/jakość) — wejście do wyceny, nie zastępuje AI-COST |
| **PAYROLL Hours-wipe D1–D5** | **CLOSED** · tip `ea1b0a6` · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **HARDENING 01A / 01D / 01B0** | **CLOSED** |
| **TENDERS-SYNC-STORM-P0** | **CLOSED** |
| **CI Remediation (Gate B+C)** | **CLOSED** |
| **AI-DOCS Payroll Guard 01→02** | **ACTIVE** · Entry + Safety Gate + tip w `09` |
| **GLOBAL-DESIGN-SYSTEM-01 + MAINT-01** | **CLOSED** |
| **UI FOUNDATION v1.0** | **COMPLETE** · [`FOUNDATION-REPORT`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **DASHBOARD BODY S1–S4** | **COMPLETE** · [`BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |

Starsze CLOSED (NG-04/06/09/11, WM/ZI, Mobile Recovery, Test Harness H0–H5, …) — indeks w [`PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) §1a.

---

## 3. Architektura — zasady (jednoznacznie)

| Zasada | Znaczenie |
|--------|-----------|
| **SSOT** | Jedna prawda na domenę; tip **tylko** w `09`; Payroll = `PAYROLL-ARCHITECTURE-SSOT`; AI Cost = [`WGDOM-AI-COST-01-SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **REUSE FIRST** | Istniejąca facade (`PWRB`, Domain Push, `Wg*`, `computeTenderBidProposal`) > nowy kod |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej ścieżki merge / persist / roster / **kalkulatora oferty** |
| **Thin Slice Workflow** | Jeden concern · cienki allowlist · DF · commit · PV · next |
| **Release Workflow** | AUDIT → RCA → PLAN → DF → Arch Review → Owner GO → IMPLEMENT → TEST → COMMIT → PUSH → PV → CLOSE · FE = push `main` |
| **Guardy** | Payroll Safety Gate G1–G9 · Domain Gate · fence · e2e-ui-guard · Gate B payroll przy CORE |
| **AI-COST-01** | Pipeline S1–S7 **FROZEN** · Bid Proposal = jedyny generator oferty · preservacja edycji użytkownika |
| **UI Foundation / Body / GDS** | **COMPLETE** (S1–S4) — nie regresuj T05 · DS-13 · TEUX ≠ global GDS |

Szczegóły: [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) · [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md) · [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md).

---

## 4. Czego NIE robić

- Nie startuj od historii czatu / Continuity / losowego `docs/architecture/PAYROLL-*`.  
- Nie kopiuj numeru tipu do wielu plików — bump tylko w `09`.  
- Nie mieszaj **FEATURE + CORE** (#CORE-013).  
- Nie ruszaj Payroll write-path / cloud-sync / Edge / fence bez **Owner GO** + DF.  
- Nie dodawaj drugiego **Primary** w Dashboard body (Guard T05).  
- Nie re-open GDS-01 / Foundation / BODY S1–S4 bez nowego briefu.  
- Nie `vercel deploy` / force push `main` / commit bez prośby Ownera.  
- Nie startuj nowego EPIC w **STABILIZATION WINDOW** bez Owner GO.  
- Nie przebudowuj AI-COST-01 (S1–S7 / Bid / preservacja user) bez nowego DF + GO.  
- Nie startuj **kolejnego** thin slice **AI-COST-02** (I3 / Phase 2) bez Owner GO + nowego DF (02-B Phase 1 = shipped).  
- Nie implementuj **FND-06** bez ADR / rozszerzenia Blueprint + Implementation Spec + Freeze.  
- Nie podłączaj App/Przetargi/Roboty/Payroll do `wgdom-foundation` bez **osobnego EPIC**.  
- Nie myl **Foundation Lib** z **UI Foundation** / Work Catalog Foundation Freeze.
- **Nie re-open AI-COST-02-B Phase 1** bez nowego briefu — **CLOSED · PV**; flaga default OFF = shipped.
- **Nie re-open AI-COST-PARSER-01 P0-RETRY** bez nowego RCA — **CLOSED · PV**; soft-invalidate F2 = shipped.
- **Nie re-open COST-MULTI** (01/02/Force Rescan) bez **nowego RCA** + Owner GO — seria **PRODUCTION VERIFIED**.
- **Nie re-open COST-BID-GAP-01 / GAP-A** bez nowego briefu — **CLOSED · PV**; residual luka vs ~1,6M = **GAP-B/C** lub **I3/02-B Phase 2**, nie hardcode.
- Nie wprowadzaj `sum(all)` zamiast Branch Winners.

---

## 5. NEXT RECOMMENDED EPICS (priorytet)

Wszystkie: **status = BACKLOG / opcjonalny** dopóki Owner nie wyda GO. Stabilization Window **ACTIVE**.  
**SSOT kandydatów:** [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md) · handoff [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md).

| # | EPIC | Status | Opis | Zależności | Dlaczego następny |
|---|------|--------|------|------------|-------------------|
| **C1** | **COST-BID-GAP-01 / GAP-A** | **CLOSED · PV** | Catalog cal · UNKNOWN · market REUSE | — | Shipped **2.65.77** |
| **C2** | **AI-COST-02-B** | **CLOSED · PV** | Explain + Queue · flaga OFF | — | Shipped **2.65.78** · `9dc113e7` |
| **C3** | **WORK-CATALOG-P3.3** | **CLOSED · PV** | Market Pricing UX S4–S6 · flaga OFF | — | Shipped **2.65.79** · `e10a1511` |
| **C3b** | **CENY-MATERIAŁÓW-01** | **CLOSED · PV** | Mapping uplift · KPI · gaps · memo · flaga OFF | — | Shipped **2.65.80** · `d4d05706` |
| **C3c** | **CENY-MATERIAŁÓW-04 P1-A** | **CLOSED** | Chodniki/nawierzchnie WC + Quotes · OV FINAL | — | Shipped **2.65.81** · FEATURE-DATA |
| **C3d** | **CENY-MATERIAŁÓW-04 P1-B** | **CLOSED** | Ogrodzenia WC + Quotes · OV PASS | **P1-C CLOSED** | Shipped **2.65.82** · FEATURE-DATA |
| **C3e** | **CENY-MATERIAŁÓW-04 P1-C** | **CLOSED** | Elewacje/ocieplenia WC + Quotes · OV PASS | **P1 COMPLETE** | Shipped **2.65.83** · FEATURE-DATA |
| **C3f** | **CENY-MATERIAŁÓW-04 P1** | **COMPLETE** | P0+P1-A/B/C | — | [`P1-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |
| **C3g** | **CENY-MATERIAŁÓW-04 P2** | **COMPLETE** | P2-A/B + Residual ROZ · K-P2-1/2/3 | **P3 AUDIT** Owner GO | [`P2-CLOSEOUT`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) |
| **C3h** | **MARKET-SYNC-01 P0** | **CLOSED** | Model+Preview staging | — | **2.65.84** · `273fb3e0` |
| **C3i** | **MARKET-SYNC-01 P1** | **CLOSED** | Accept+Publish · commit only | **P2 AUDIT** Owner GO | **2.65.85** · `5326cf8c` · [`P1-CLOSEOUT`](../architecture/MARKET-SYNC-01-P1-CLOSEOUT.md) |
| **C3j** | **MARKET-SYNC-01 P2** | **NEXT** · BACKLOG | (zakres po AUDIT) | Owner GO → AUDIT→PLAN→DF | **nie** auto-start |
| **C3k** | **CENY-MATERIAŁÓW-04 P3 (INNE)** | **NEXT** · BACKLOG | Residual INNE / misbucket | Owner GO → AUDIT→PLAN→DF | **nie** auto-start |
| **C4** | TP200B | BACKLOG | Fidelity pozycji | wąski DF | Jakość przedmiaru |
| **C5** | HEAVY-PERSIST-01 | BACKLOG · P2 | LS/KV settle race | MULTI CLOSED | Ops |
| **F** | **FND-06 Observability** | **BLOCKED** | Brak Impl Spec | Phase 0 **COMPLETE** | **zakaz IMPLEMENT** |
| **1** | **DASHBOARD-BODY-S5/S6** | BACKLOG · P2 | Soft rows / ui-guard | BODY S1–S4 **COMPLETE** | Thin UI |
| **3** | **GDS-02** | BACKLOG · Owner GO | Wąski high-traffic Wg* | GDS-01/MAINT **CLOSED** | Chrome |
| **4** | **CI-C-2** | BACKLOG · P3 | Residual Gate C | CI Remediation **CLOSED** | Higiena CI |
| **5** | **HARDENING-01B1 / C / E** | BACKLOG · Owner GO | Hardening sync | 01A/01D/01B0 **CLOSED** | Sygnały prod |
| **8** | **Payroll nowe prace** | **NONE** | — | Hours-wipe **CLOSED** | Tylko nowy GO + Gate |

**Rekomendowany pierwszy krok:** **MARKET-SYNC-01 P2 AUDIT** *lub* **CENY-MATERIAŁÓW-04 P3 AUDIT** — Owner GO → AUDIT→PLAN→DF.  
**Alternatywa:** residual GAP-B (stack) *lub* AI-COST-02 I3 Competitiveness po osobnym DF.  
**Zawsze:** Entry + Gate.

---

## 6. Handoff skrót (ChatGPT vs Cursor)

| | ChatGPT | Cursor |
|--|---------|--------|
| Start | Ten plik + `AI_ENTRY` | Ten plik + `AI_ENTRY` + `AGENTS.md` (workflow) |
| Tip | `09` / `version.json` | to samo + `git log -1` lokalnie ≠ tip |
| WT lokalne | — | Dużo untracked/modified może istnieć — **nie** commituj drive-by; thin allowlist |
| Implement | Tylko po GO | Tylko po GO · edycje w scope DF |

---

## 7. Linki SSOT (mapa)

| Temat | Dokument |
|-------|----------|
| Entry | [`AI_ENTRY.md`](AI_ENTRY.md) |
| Tip | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| Memory / Tree | [`AI_MEMORY.md`](AI_MEMORY.md) · [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) |
| Gate | [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| Foundation | [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| Dashboard Body | [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| GDS | [`GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md`](../architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md) |
| **AI-COST-01 Freeze** | [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) |
| **AI-COST-01 SSOT** | [`WGDOM-AI-COST-01-SSOT.md`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST-01 Lessons** | [`WGDOM-AI-COST-01-LESSONS-LEARNED.md`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AI-COST-02 start** | [`WGDOM-AI-COST-02-STARTING-POINT.md`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) |
| **AI-COST-02-B CLOSEOUT** | [`AI-COST-02-B-CLOSEOUT.md`](../architecture/AI-COST-02-B-CLOSEOUT.md) |
| **AI-COST-02-B PV** | [`AI-COST-02-B-PRODUCTION-VERIFY.md`](../architecture/AI-COST-02-B-PRODUCTION-VERIFY.md) |
| **COST-02-A CLOSEOUT** | [`WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| **COST-02-A RELEASE** | [`WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) |
| **COST-MULTI CLOSEOUT** | [`COST-MULTI-CLOSEOUT.md`](../architecture/COST-MULTI-CLOSEOUT.md) |
| **AI-COST-PARSER-01 P0-RETRY CLOSEOUT** | [`AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md`](../architecture/AI-COST-PARSER-01-P0-RETRY-CLOSEOUT.md) |
| **COST-BID-GAP-01 CLOSEOUT** | [`COST-BID-GAP-01-CLOSEOUT.md`](../architecture/COST-BID-GAP-01-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P2 CLOSEOUT** | [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) |
| **CENY-MATERIAŁÓW-04 P1 CLOSEOUT** | [`CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md`](../architecture/CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md) |
| **Handoff po GAP-A** | [`SESSION-HANDOFF-POST-COST-BID-GAP-01.md`](../architecture/SESSION-HANDOFF-POST-COST-BID-GAP-01.md) |
| **Continuity UPDATE-01** | [`AI-CONTINUITY-UPDATE-01-REPORT.md`](../architecture/AI-CONTINUITY-UPDATE-01-REPORT.md) |
| **NEXT EPIC candidates** | [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md) |
| Cold Start Audit | [`WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md`](../architecture/WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md) |
| CI | [`CI-REMEDIATION-EPIC-CLOSEOUT.md`](../architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md) |
| Payroll AI | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Living baseline | [`../PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) |
| Sesja Ownera | [`../../CURRENT-TASK.md`](../../CURRENT-TASK.md) |

---

**MASTER HANDOFF ACTIVE** · tip UI **2.65.85** · MARKET-SYNC-01 **P1 CLOSED** · NEXT **P2 AUDIT** / CM-04 **P3 AUDIT** (Owner GO) · tip w `09` · SSOT P1 [`P1-CLOSEOUT`](../architecture/MARKET-SYNC-01-P1-CLOSEOUT.md)
