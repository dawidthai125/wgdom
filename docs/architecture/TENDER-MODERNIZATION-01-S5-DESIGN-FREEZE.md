# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S5 (Tab Decyzja → DW)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **READY FOR IMPLEMENT** (czekaj Owner GO)  
> **ID:** TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S5 — Tab Decyzja → Decision Workspace**  
> **TRYB:** DESIGN FREEZE (LOCKED) · IMPLEMENT tylko po jawnym Owner GO  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** / feature S4 **`85f4db14`** · docs tip **`d2f57b4b`** · **PRODUCTION VERIFIED** · GREEN  
> **Owner GO DF:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S5-AUDIT.md`](TENDER-MODERNIZATION-01-S5-AUDIT.md) (**COMPLETE**)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S5-PLAN.md`](TENDER-MODERNIZATION-01-S5-PLAN.md) (**COMPLETE**)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md)  
> **Decision arch:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md) — DW = PRIMARY human · Persist REUSE · bridge = S6  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §11 S5 · §12 AC-S5 · Q7/Q12  
> **Prior CLOSED:** S0 · S1 · S2 · S3 · S4  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **NIGDY** w S5

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S5 — DESIGN FREEZE

LOCKED routing:
  DW mount = /przetargi/:id/decyzja + overview ONLY
  ?ws=qualification|offer = KEEP AS-IS (no DW swap)

LOCKED mount:
  chiefSessionForDecision when:
    activeTab === "przetarg"
    OR (activeTab === "decyzja" AND overview)
  DecisionWorkspaceHost on overview (REUSE Host)

LOCKED Hub:
  S4 Hub DW = KEEP · NO remove · NO move-only-to-Decyzja

LOCKED fallback:
  TenderDecisionView KEEP
  Expert ON  → DW PRIMARY · DecisionView = recovery
  Expert OFF → DecisionView = legacy PRIMARY

LOCKED CTA home:
  Dedicated home = "decyzja" (overview, no ?ws)
  IF DW in DOM → scroll
  ELSE → navigate("decyzja")
  FORBIDDEN: navigate("przetarg") as dedicated home

LOCKED store:
  ZERO schema/API change
  Persist = REUSE Host hydrate/record
  kw-tender-decisions KEEP · bridge = S6

NO NEW FLAG · Allowlist STRICT · 8 LOCK · thin wire only
Rollback = git revert

STATUS: DESIGN FREEZE COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S5-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S5-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT S5 → AC harness → Owner QA → build
        → commit allowlist ONLY → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend.  
Agent **nie** rozszerza allowlist, **nie** rusza 8 LOCK BC, **nie** mostkuje Persist→legacy, **nie** usuwa DecisionView, **nie** usuwa Hub DW, **nie** wchodzi w S6–S8, **nie** stage’uje `useTenderOfferRun.ts`.

### STOP conditions (pre-IMPLEMENT)

| STOP jeśli | Stan DF |
|------------|---------|
| Potrzeba nowego Persist API / store key | **NIE** — denylist |
| Potrzeba Approve→GO bridge | **NIE** — S6 |
| Potrzeba usunięcia Hub DW | **NIE** — S4 KEEP |
| Potrzeba hard delete DecisionView | **NIE** — AC-S5-4 |
| Potrzeba DW na `?ws=qualification\|offer` | **NIE** — OUT |
| Potrzeba nowej flagi AppSettings / LS master | **NIE** — REUSE S2 stacks |
| Potrzeba edycji Expert/Chief/Session/Validation BC | **NIE** — 8 LOCK |

**STOP:** nie wymagany.

---

## 1. Scope

### IN (LOCKED) — kroki S5-A…E

| Krok | Treść LOCKED |
|------|----------------|
| **S5-A** | `TenderDetailPage` — `chiefSessionForDecision` dla `przetarg` **oraz** `decyzja`+overview |
| **S5-B** | `TenderDetailPanel` — mount `DecisionWorkspaceHost` na overview |
| **S5-C** | Thin `TenderDecisionView` — copy/attrs recovery (Expert ON) |
| **S5-D** | `TenderWorkflowPrimaryAction` — CTA home `decyzja` (§5) |
| **S5-E** | Harness AC-S5-1…4 + regresja S2/S4 |

### OUT (LOCKED)

| OUT | |
|-----|--|
| Expert BC · Chief · Session · Validation · Adapters · TF | |
| OfferBoq / Bid domain | |
| Strategy rewrite | |
| S6 Persist→legacy bridge | |
| S7 TRE deprecation | |
| S8 hard REMOVE | |
| DecisionView hard delete | |
| Store migration / nowy KV | |
| Cloud Persist | |
| `useTenderOfferRun.ts` | |
| Hub DW removal / Hub hierarchy rewrite | |
| Chief/EW mount na Tab Decyzja | |
| DW zamiast qualification/offer sub-tabs | |
| UI version bump (jak S2–S4 — **NIE**) | |
| `DecisionWorkspaceHost.tsx` BC (domyślnie **NO TOUCH**) | |

**Scope:** **PASS**.

---

## 2. Routing (LOCKED)

| Reguła | LOCKED |
|--------|--------|
| Path DW | `/przetargi/:id/decyzja` **bez** `?ws` (= overview) |
| Embed | `parseDecyzjaWorkspaceQuery` → `overview` |
| Mount DW | **tylko** `effectiveWorkspace === "overview"` |
| `?ws=qualification` | **KEEP AS-IS** — Qualification workspace · **bez** Host swap |
| `?ws=offer` | **KEEP AS-IS** — Offer workspace · **bez** Host swap |
| URL kontrakt `tender-detail-routes-v4.ts` | **NO TOUCH** (domyślnie) |
| Sub-tab bar | **KEEP** |

```text
ASSERT overview:
  activeTab === "decyzja"
  AND decyzjaWorkspace === "overview"
  AND embedV4Workspace / effectiveWorkspace === "overview"
```

**Routing:** **PASS**.

---

## 3. Mount + Expert-effective (LOCKED)

### 3.1 Expert / stacks (REUSE S2)

| | LOCKED |
|--|--------|
| Expert-effective | `resolveTenderExpertEffective(role)` |
| Session stack | `isChiefSessionStackEnabled` |
| DW stack | `isDecisionWorkspaceStackEnabled` (Host internal) |
| NO NEW FLAG | `expertAiDecydentEnabled` **FORBIDDEN** |

### 3.2 `chiefSessionForDecision` (DetailPage)

```text
LOCKED:
  chiefSessionForDecision =
    chiefSession
      WHEN activeTab === "przetarg"
      OR  (activeTab === "decyzja" AND decyzjaWorkspace === "overview")
    ELSE null
```

### 3.3 Host na overview (DetailPanel)

```text
LOCKED DOM order (overview):
  [optional thin section cue]
  DecisionWorkspaceHost     // gdy chiefSessionForDecision != null
    → Host gate: flag / uiPhase hidden → null (REUSE)
  TenderDecisionView        // ALWAYS na overview
```

| Attr Host (KEEP/REUSE) | |
|------------------------|--|
| Wrapper | `data-decision-workspace-host` |
| Primary S2 | `data-s2-dw-primary="1"` (gdy Host renderuje) |
| Surface | `#decision-workspace-surface` · `data-decision-workspace-surface` |

| Attr Decyzja overview (NEW thin) | |
|--------------------------------|--|
| Panel overview root (opc.) | `data-s5-decyzja-overview="1"` |
| DecisionView @ Expert ON | `data-s5-decision-fallback="1"` |
| DecisionView @ Expert OFF | brak fallback attr / legacy primary path |

**Chief/EW na Decyzja:** **FORBIDDEN** — `chiefDossierVm` / `expertWorkspaceVm` pozostają gated do `przetarg`.

**Mount:** **PASS**.

---

## 4. Hub KEEP (LOCKED)

| | LOCKED |
|--|--------|
| `TenderWorkflowHubPanel` → `DecisionWorkspaceHost` | **KEEP** |
| S4 hierarchy / `data-s4-*` / recovery / primary PLN | **KEEP** · S5 **NO TOUCH** Hub hierarchy |
| Simultaneous Hub+Decyzja Host | **NIEMOŻLIWY** (jeden tab) |
| Semantyka | Hub = contextual DW · Decyzja overview = dedicated home |

**Zakaz:** usunięcie Hub DW „bo S5 przenosi na Decyzja”.

**Hub:** **PASS**.

---

## 5. Fallback DecisionView (LOCKED)

| Stan | DW Host | TenderDecisionView |
|------|---------|-------------------|
| Expert ON + Host visible | **PRIMARY** Actions | **recovery** · buttons **HIDE** · verdict **DEMOTE** · `data-s5-decision-fallback="1"` |
| Expert ON + Host null (Session/kill/hidden) | brak | **fallback demoted** · **nie blank** · buttons HIDE |
| Expert OFF | Host null/hidden | **legacy PRIMARY** · buttons ON → `kw-tender-decisions` |
| Hard delete pliku / mount | **FORBIDDEN** | |

### Copy (thin LOCKED)

| AS-IS | TARGET |
|-------|--------|
| PRIMARY na zakładce **Przetarg** | PRIMARY na zakładce **Decyzja** (Decision Workspace). Hub = kontekst procesu. |

**Fallback:** **PASS**.

---

## 6. CTA behavior (LOCKED)

### 6.1 Dedicated home

| | LOCKED |
|--|--------|
| Dedicated home Decydent (Expert ON) | Tab **`decyzja`** overview |
| Contextual DW | Hub `przetarg` (S4) |
| `navigate("przetarg")` jako dedicated home | **FORBIDDEN** |

### 6.2 Algorithm PrimaryAction (Expert ON + `ownerDecision`)

```text
LOCKED:
  IF expertEffective AND action.ownerDecision:
    el = document.getElementById("decision-workspace-surface")
      ?? document.querySelector("[data-decision-workspace-host]")
    IF el:
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      RETURN
    onNavigateTab("decyzja")   // BEZ decyzjaWorkspace / BEZ ?ws
    RETURN
  // Expert OFF: setOwnerDecision KEEP (S2)
```

| Attr | LOCKED |
|------|--------|
| `data-s2-suppress-owner-commit` | KEEP gdy Expert ON + ownerDecision |
| `data-s4-cta-to-decision` | KEEP `"1"` w tym samym przypadku |
| Label | KEEP kierunek „Przejdź do Decyzji Decydenta” (lub równoważne) |

### 6.3 Primary surface rule

```text
COUNT(PRIMARY human decision button sets) ≤ 1  na danym ekranie
  Expert ON → tylko DW Actions
  DecisionView buttons @ Expert ON → HIDE (S2)
```

**CTA:** **PASS**.

---

## 7. Store / Persist (LOCKED)

| | LOCKED |
|--|--------|
| `kw-decision-persist-v1` schema/API | **NO TOUCH** |
| Host `hydrateDecision` / `recordDecision` | **REUSE** |
| `kw-tender-decisions` | **KEEP** (Expert OFF writes · Strategy readers) |
| Bridge Persist → legacy | **S6** · **FORBIDDEN** w S5 |
| Cloud Persist | **OUT** |
| Nowy store key | **FORBIDDEN** |
| Approve→GO / Reject→NO-GO / NeedsReview→HOLD | **FORBIDDEN** w S5 |

**Store:** **PASS** (ZERO zmian).

---

## 8. DOM / data-* assertions (LOCKED — harness)

### 8.1 Source asserts (static)

| ID | Assert |
|----|--------|
| A1 | `TenderDetailPage`: `chiefSessionForDecision` obejmuje `decyzja` + overview (nie wyłącznie `przetarg`) |
| A2 | `TenderDetailPanel` overview: zawiera `DecisionWorkspaceHost` |
| A3 | `TenderDecisionView` plik istnieje · overview nadal mountuje DecisionView |
| A4 | PrimaryAction: po braku `el` → `onNavigateTab("decyzja")` · **brak** `onNavigateTab("przetarg")` w gałęzi Expert ON + ownerDecision |
| A5 | PrimaryAction Expert ON + ownerDecision: **nie** woła `setOwnerDecision` |
| A6 | Copy DecisionView: **nie** twierdzi PRIMARY wyłącznie na Przetarg jako home |
| A7 | Brak nowych stringów store key / bridge module w allowlist diff |
| A8 | Hub panel nadal zawiera `DecisionWorkspaceHost` (S4 KEEP) |
| A9 | `?ws=qualification\|offer` paths **bez** wymuszenia Host zamiast tych workspace’ów |

### 8.2 Runtime markers (Owner / PV)

| Marker | Gdzie | Oczekiwanie Expert ON + overview |
|--------|-------|----------------------------------|
| `data-decision-workspace-host` | Decyzja overview | present (gdy Session+DW stack) |
| `#decision-workspace-surface` | Decyzja overview | present gdy Host visible |
| `data-s2-dw-primary="1"` | Host | present gdy Host visible |
| `data-s5-decision-fallback="1"` | DecisionView | present @ Expert ON |
| `data-tender-decision-view` | overview | present (fallback KEEP) |
| Hub `data-s4-hub-hierarchy` | `przetarg` | KEEP |

**Assertions:** **PASS**.

---

## 9. AC-S5-1…4 (LOCKED — testowalne)

| AC | Kryterium | PASS |
|----|-----------|------|
| **AC-S5-1** | Parity checklist P1–P8 (PLAN §10) | DW PRIMARY @ Expert ON overview · DecisionView bez write · Hub DW KEEP · CTA suppress GO · brak bridge · overview-only |
| **AC-S5-2** | Tab Decyzja = DW gdy Expert ON | A1+A2+A8 · OV-S5-1 |
| **AC-S5-3** | Persist hydration OK | REUSE Host hydrate/record · A7 · OV-S5-8 · **zero** schema change |
| **AC-S5-4** | DecisionView fallback / no hard delete | A3 · Expert OFF PRIMARY · OV-S5-7 · OV-S5-9 |

### Parity P1–P8 (AC-S5-1)

| P | PASS gdy |
|---|----------|
| P1 | Expert ON + overview + Session → Host w drzewie |
| P2 | Expert ON → DecisionView owner buttons HIDE |
| P3 | Expert OFF → DecisionView PRIMARY |
| P4 | Hub `przetarg` Host path KEEP |
| P5 | PrimaryAction Expert ON ↛ `setOwnerDecision` |
| P6 | Brak el → navigate `decyzja` (nie `przetarg`) |
| P7 | `?ws=qualification\|offer` bez Host-swap |
| P8 | Brak trzeciego store / bridge |

**AC:** **PASS** (zamrożone).

---

## 10. Allowlist + minimal diff (LOCKED)

| # | Path | Dozwolone |
|---|------|-----------|
| 1 | `src/app/TenderDetailPage.tsx` | S5-A session prop |
| 2 | `src/app/TenderDetailPanel.tsx` | S5-B Host mount + opc. `data-s5-decyzja-overview` |
| 3 | `src/app/TenderDecisionView.tsx` | S5-C thin copy / `data-s5-decision-fallback` |
| 4 | `src/app/TenderWorkflowPrimaryAction.tsx` | S5-D CTA algorithm |
| 5 | `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | harness |
| 6 | `scripts/test-tender-modernization-s5.mjs` | alias |
| 7 | Docs S5 IMPLEMENT / PV / CLOSEOUT | po GO release |

**Commit:** jeden feature commit ⊆ allowlist (prefer jak S4) · **`git add -A` FORBIDDEN** · **`useTenderOfferRun.ts` FORBIDDEN**.

**Host.tsx:** **NO TOUCH** chyba że Owner DF amend (blocker). Domyślnie wire z zewnątrz wystarcza.

**Allowlist:** **PASS**.

---

## 11. Regression gates (LOCKED)

| Gate | Kryterium |
|------|-----------|
| S5 harness | AC-S5-1…4 **PASS** / 0 FAIL |
| S2 Dual Outcome | **45 PASS** (regresja) |
| S4 Hub hierarchy | **37 PASS** (regresja) |
| Build | `npm run build` **PASS** |
| Store grep | zero nowych Persist schema / bridge w diff |
| WIP | `useTenderOfferRun.ts` **nie** staged |

**PV (po push):** `version.json` tip · live bundle markers §8.2 · Hub KEEP · Decyzja Host path.

---

## 12. Owner Verification matrix (LOCKED)

| ID | Scenariusz | PASS |
|----|------------|------|
| **OV-S5-1** | Expert ON · `/decyzja` overview · Session ready | Host + Actions PRIMARY |
| **OV-S5-2** | Ten sam · DecisionView | recovery · brak GO/HOLD write |
| **OV-S5-3** | `/przetarg` | S4 Hub + DW KEEP |
| **OV-S5-4** | CTA z innego tabu | ląduje `/decyzja` |
| **OV-S5-5** | CTA na Hub z DW w DOM | scroll (bez zbędnego hop) |
| **OV-S5-6** | `?ws=qualification` | Qualification · nie sam DW |
| **OV-S5-7** | Expert OFF | DecisionView legacy PRIMARY |
| **OV-S5-8** | Refresh po Approve Host | lokalny Persist hydrate · bez lejka Strategy |
| **OV-S5-9** | DW kill LS=`0` @ Expert ON | Host hidden · DecisionView demoted · nie blank |
| **OV-S5-10** | Regresja harness S2+S4 + build | PASS |

---

## 13. Rollback (LOCKED)

| | LOCKED |
|--|--------|
| Mechanizm | `git revert` commit(ów) S5 allowlist |
| Tab Decyzja po revert | TenderDecisionView only (pre-S5) |
| Hub | S4 nietknięty semantycznie |
| Store | brak migracji → **bez** data repair |
| Flaga S5 | **brak** — rollback ≠ Feature Flag |

---

## 14. Alignment DECISION-ARCHITECTURE

| DECISION-ARCHITECTURE | S5 DF |
|-----------------------|-------|
| DW = PRIMARY human @ Expert ON | Tab Decyzja overview + Hub KEEP |
| Legacy HIDE/DEMOTE | DecisionView recovery @ Expert ON |
| Persist local append-only | REUSE Host · **NO** schema |
| Bridge Persist→legacy | **S6** — OUT S5 |
| Cloud Persist | OUT |

**Alignment:** **PASS**.

---

## 15. Implementation order (LOCKED)

```text
S5-A DetailPage session prop
  → S5-B DetailPanel Host mount
    → S5-C DecisionView thin
    → S5-D PrimaryAction CTA
      → S5-E harness + S2/S4/build gates
        → Owner VERIFY (OV-S5-*)
          → commit allowlist → push (Owner GO) → PV → CLOSEOUT
```

**NO BIG-BANG.**

---

## 16. Werdykt

| | |
|--|--|
| **DESIGN FREEZE COMPLETE** | **YES** |
| **READY FOR IMPLEMENT** | **YES** |
| **Konflikty PLAN/AUDIT** | **NONE** |
| **STOP pre-IMPLEMENT** | **NIE** |

---

## 17. STOP

```text
STOP PO DESIGN FREEZE.
Nie implementuj bez Owner GO → IMPLEMENT.
Nie commituj.
Nie pushuj.
Czekaj: OWNER GO → S5 IMPLEMENT.
```
