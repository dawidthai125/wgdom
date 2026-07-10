# NG-10 — Autonomous Tender Workspace · Epic Closeout

> **Status:** **NG-10 EPIC COMPLETE** · **CLOSEOUT IMPLEMENT DONE** · **RELEASE PENDING** (commit + push)  
> **Changelog (plan):** UI **2.63.86** · implement **`d850534`→`5863acb`** · closeout docs **NG-10-06**  
> **Baseline prod:** **2.63.85** @ **`88650be`** (kod NG-10 już w `main`; wpis changelog w **2.63.86**)  
> **SSOT freeze:** [`NG-10-DESIGN-FREEZE.md`](NG-10-DESIGN-FREEZE.md) v1.0

---

## 1. Podsumowanie epicu

| Pole | Wartość |
|------|---------|
| **Cel** | Warstwa prezentacji FEATURE nad `useTenderPipelineRuntime` — Autonomous Agent (S1) → Outcome (S2) → Reveal NG-08 Workspace |
| **Klasa** | **FEATURE UI** + **FEATURE lib** · zero Protected Core |
| **Slices** | NG-10-03 lib · NG-10-04 S1 · NG-10-05 S2→S3 · **NG-10-06 closeout** |
| **Principles** | #NG10-001…009 · #CORE-013 · #CORE-014 |

---

## 2. Commits (implementacja)

| Slice | Commit | Opis |
|-------|--------|------|
| **NG-10-03** | **`d850534`** | Autonomous Run lib + LIB-NG10-01 (41 cases) |
| **NG-10-04** | **`2ece2c7`** | Autonomous Agent Screen (S1) + Gate |
| **NG-10-05** | **`5863acb`** | Outcome Screen + Reveal + `openTenderById` → `przetarg` |
| **NG-10-06** | *(pending commit)* | Closeout docs · changelog **2.63.86** · test-manifest |

---

## 3. Allowlist (zamknięta)

| Plik | Slice | Status |
|------|-------|--------|
| `src/lib/tender-autonomous-run-fingerprint.ts` | 03 | **CLOSED** |
| `src/lib/tender-autonomous-run-phase.ts` | 03 | **CLOSED** |
| `src/lib/tender-autonomous-run-outcome.ts` | 03 | **CLOSED** |
| `src/lib/tender-autonomous-run-ux.ts` | 03/05 | **CLOSED** |
| `scripts/test-tender-autonomous-run-phase.mjs` | 03 | **CLOSED** |
| `src/app/tenders/autonomous/TenderAutonomousRunScreen.tsx` | 04 | **CLOSED** |
| `src/app/tenders/autonomous/TenderAutonomousGate.tsx` | 04/05 | **CLOSED** |
| `src/app/tenders/autonomous/TenderAutonomousOutcomeScreen.tsx` | 05 | **CLOSED** |
| `src/app/TenderDetailPage.tsx` | 04/05 | **CLOSED** |
| `src/app/App.tsx` (1 linia nawigacji) | 05 | **CLOSED** |

**Off-limits zero diff:** `useTenderPipelineRuntime` · `cloud-sync.ts` · Edge · payroll · parsery · `tender-ux-tokens.ts` (exporty) — **verified**

---

## 4. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | Fingerprint + `deriveAutonomousRunRequired` (OD-1) | **PASS** |
| D2 | Full-screen gate S1 · workspace hard block (OD-2) | **PASS** |
| D3 | Agent UX pulse + feed + ETA (OD-3/4/5) | **PASS** |
| D4 | Outcome S2 hero GO/HOLD/NO-GO (OD-7) | **PASS** |
| D5 | LS persist po CTA · Reveal animation (OD-6) | **PASS** |
| D6 | `minDisplayMs` 3000 · reduced motion | **PASS** |
| D7 | LIB-NG10-01 | **PASS** 41/41 |
| D8 | `test-tender-pipeline-automation-p0.mjs` | **PASS** 16/16 |
| D9 | Gate B payroll | **PASS** 16/16 |
| D10 | Gate B tenders (scope) | **9/10 PASS** · `LIB-TENDER-MOBILE-TEUX4` FAIL pre-existing |
| D11 | `npm run build` | **PASS** |
| D12 | #CORE-013 / #CORE-014 | **PASS** |
| D13 | CHANGELOG **2.63.86** | **DONE** (closeout) |
| D14 | `test-manifest` LIB-NG10-01 | **DONE** (closeout) |
| D15 | KPI-NG10-01…05 manual | **PENDING** — owner smoke §6 |

---

## 5. Owner waivers (accepted)

| ID | Opis | Status |
|----|------|--------|
| **W-NG10-01** | Hero copy „Expert verdict” (≠ freeze §3.3 literal) | **ACCEPTED** |
| **W-NG10-02** | CTA per decyzja (≠ „Przejdź do Workspace”) | **ACCEPTED** |
| **W-NG10-03** | Trust dimensions w watchouts | **DEFERRED P2** |

---

## 6. Owner smoke checklist (manual · Design Freeze §12)

> Wykonać na https://www.wgdom.fun po release **2.63.86**. Zaznacz PASS/FAIL właściciel.

| # | Scenariusz | Oczekiwany wynik | Status |
|---|------------|------------------|--------|
| M1 | Fresh tender (brak LS fingerprint) | S1 → S2 → CTA → Reveal → Executive Brief | **PENDING** |
| M2 | Re-enter ten sam tender (fresh fingerprint) | Skip S1 → bezpośrednio Workspace | **PENDING** |
| M3 | Odśwież BZP / nowy dokument | S1 wymuszony ponownie | **PENDING** |
| M4 | Tender 0 dokumentów | S2 partial HOLD/NO-GO | **PENDING** |
| M5 | Mobile 430px | Full screen · back confirm · touch 44px | **PENDING** |
| M6 | Deep link `/dokumenty` stale | S1 → Reveal → ląduje na `dokumenty` | **PENDING** |

---

## 7. KPI-NG10 (frozen)

| ID | KPI | Target | Auto verify |
|----|-----|--------|-------------|
| KPI-NG10-01 | Fresh → Workspace bez gate | 0 dodatkowych klików | Manual M2 |
| KPI-NG10-02 | Stale → Outcome → Workspace | ≤1 klik | Manual M1 |
| KPI-NG10-03 | Gate bez leak tabów | 0 leaks | Code review **PASS** |
| KPI-NG10-04 | Mobile touch | ≥44px | Code review **PASS** |
| KPI-NG10-05 | Payroll gate | 16/16 | **PASS** |

---

## 8. Backlog post-epic

| Item | Priorytet |
|------|-----------|
| Trust watchouts (`trustAssessment` dimensions) | **P2** (W-NG10-03) |
| HelpView FAQ Autonomous Run | **P2** |
| `doc_found` jako osobna faza prezentacyjna | **P3** cosmetic |

---

## 9. Następny krok

**STABILIZATION WINDOW** — brak nowych programów/bundli bez Owner GO + AUDIT.

**Release NG-10-06:** commit docs + changelog → push `main` → verify `version.json` → **2.63.86** → owner smoke M1–M6.

---

*NG-10 Epic Closeout · Baseline prod **2.63.85** @ **88650be** · Protected Core **GREEN**.*
