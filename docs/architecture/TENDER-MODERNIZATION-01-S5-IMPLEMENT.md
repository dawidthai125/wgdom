# TENDER-MODERNIZATION-01 / S5 — IMPLEMENT (Tab Decyzja → DW)

> **STATUS:** **IMPLEMENT COMPLETE** · **OWNER VERIFY PENDING** · **NIE COMMIT**  
> **ID:** TENDER-MODERNIZATION-01-S5-IMPLEMENT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S5 — Tab Decyzja → Decision Workspace**  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / S4 **`85f4db14`** · docs tip **`d2f57b4b`**  
> **DF:** [`TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S5-PLAN.md`](TENDER-MODERNIZATION-01-S5-PLAN.md)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S5-AUDIT.md`](TENDER-MODERNIZATION-01-S5-AUDIT.md)  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **nie** staged

```text
════════════════════════════════════════════════════════
S5 IMPLEMENT — Tab Decyzja → DW

Delivered:
  S5-A DetailPage chiefSessionForDecision = przetarg | decyzja+overview
  S5-B DetailPanel Host ABOVE DecisionView on overview
  S5-C DecisionView thin copy + data-s5-decision-fallback
  S5-D PrimaryAction: scroll OR navigate("decyzja") · NOT przetarg
  S5-E harness 27 PASS

Gates:
  S5  27 PASS / 0 FAIL
  S2  45 PASS / 0 FAIL
  S4  37 PASS / 0 FAIL
  build PASS

Store: ZERO TOUCH · Persist REUSE Host · Hub DW KEEP
NEXT: Owner VERIFY (OV-S5-*) → OWNER GO COMMIT
════════════════════════════════════════════════════════
```

---

## 1. Diff allowlist

| Plik | Zmiana |
|------|--------|
| `src/app/TenderDetailPage.tsx` | `chiefSessionForDecision` dla `przetarg` **lub** `decyzja`+`overview` |
| `src/app/TenderDetailPanel.tsx` | import Host · mount Host nad DecisionView · `data-s5-decyzja-overview` |
| `src/app/TenderDecisionView.tsx` | copy Decyzja home · `data-s5-decision-fallback` |
| `src/app/TenderWorkflowPrimaryAction.tsx` | Expert ON fallback navigate → `"decyzja"` |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | harness |
| `scripts/test-tender-modernization-s5.mjs` | alias |
| `docs/architecture/TENDER-MODERNIZATION-01-S5-IMPLEMENT.md` | ten plik |

**NON-allowlist touched:** **NONE** (OfferRun WIP untouched).

---

## 2. Behavior (as shipped)

| Warunek | Wynik |
|---------|--------|
| Expert ON + `/decyzja` overview + Session | `DecisionWorkspaceHost` PRIMARY · DecisionView recovery |
| Expert OFF + overview | DecisionView PRIMARY legacy |
| Hub `/przetarg` | S4 Host KEEP |
| `?ws=qualification\|offer` | bez Host-swap |
| CTA Expert ON + DW w DOM | scroll |
| CTA Expert ON + brak DW | `navigate("decyzja")` |
| Store / Persist API | **NO TOUCH** |

---

## 3. Tests

| Gate | Wynik |
|------|-------|
| `npx vite-node scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | **27 PASS / 0 FAIL** |
| S2 Dual Outcome | **45 PASS / 0 FAIL** |
| S4 Hub hierarchy | **37 PASS / 0 FAIL** |
| `npm run build` | **PASS** |

---

## 4. Owner Verification matrix (OV-S5-1…10)

| ID | Scenariusz | Oczekiwanie | Result |
|----|------------|-------------|--------|
| **OV-S5-1** | Expert ON · `/decyzja` overview · Session ready | Host + Actions PRIMARY | ⬜ Owner |
| **OV-S5-2** | Ten sam · DecisionView | recovery · `data-s5-decision-fallback` · brak GO write | ⬜ Owner · harness A3 PASS |
| **OV-S5-3** | `/przetarg` | S4 Hub + DW KEEP | ⬜ Owner · harness A8 PASS |
| **OV-S5-4** | CTA z innego tabu | ląduje `/decyzja` | ⬜ Owner · harness A4 PASS |
| **OV-S5-5** | CTA na Hub z DW w DOM | scroll | ⬜ Owner · harness A6 PASS |
| **OV-S5-6** | `?ws=qualification` | Qualification · nie sam DW | ⬜ Owner |
| **OV-S5-7** | Expert OFF | DecisionView legacy PRIMARY | ⬜ Owner |
| **OV-S5-8** | Refresh po Approve Host | lokalny Persist hydrate · bez Strategy lejek | ⬜ Owner |
| **OV-S5-9** | DW kill LS=`0` @ Expert ON | Host hidden · DecisionView demoted · nie blank | ⬜ Owner |
| **OV-S5-10** | Regresja S2+S4+build | PASS | ✅ agent **45 / 37 / build PASS** |

**Static / harness subset:** PASS.  
**Manual Owner cells:** ⬜ czekają na Owner VERIFY.

---

## 5. Rollback

`git revert` przyszłego commit allowlist · brak migracji store.

---

## 6. STOP

```text
IMPLEMENT COMPLETE.
NIE COMMIT · NIE PUSH · NIE DEPLOY.
Czekaj: OWNER GO → COMMIT.
```
