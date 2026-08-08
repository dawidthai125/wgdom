# TENDER-MODERNIZATION-01 / S5 — PLAN (Tab Decyzja → DW)

> **STATUS:** **PLAN COMPLETE** · **DF** → [`TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** TENDER-MODERNIZATION-01-S5-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S5 — Tab Decyzja → Decision Workspace**  
> **TRYB:** **PLAN ONLY** (zamknięty przez S5 DF) · ZERO kodu w tym dokumencie  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / feature S4 **`85f4db14`** · docs tip **`d2f57b4b`** · **PRODUCTION VERIFIED**  
> **Owner GO PLAN:** 2026-08-08 (jawny)  
> **SSOT IMPLEMENT:** [`TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S5-AUDIT.md`](TENDER-MODERNIZATION-01-S5-AUDIT.md) (**COMPLETE**)  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §11 S5 · §12 AC-S5 · Q7/Q12  
> **Epic PLAN:** [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md)  
> **Prior CLOSED:** S0 · S1 · S2 Dual Outcome · S3 · S4 Hub UX  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **NIE** część S5  
> **Next:** Owner GO **IMPLEMENT S5** (osobny turn)

```text
════════════════════════════════════════════════════════
S5 PLAN — Tab Decyzja → Decision Workspace

Cel:
  Expert ON + Tab Decyzja (overview)
    → DecisionWorkspaceHost = PRIMARY human decision
  Expert OFF + Tab Decyzja (overview)
    → TenderDecisionView = PRIMARY (legacy KEEP)
  Hub DW (S4) = KEEP
  DecisionView = KEEP fallback / compatibility
  Store = NO TOUCH
  Bridge Approve→GO = S6 OUT

HOME Decydent (Expert ON):
  Tab „Decyzja” overview = dedicated home
  Hub DW = contextual story (S4 KEEP) · ten sam Host/Persist

CTA Expert ON + ownerDecision:
  1) już na przetarg + DW w DOM → scroll Hub DW
  2) inaczej → navigate „decyzja” (bez ?ws)
     NIE wymuszaj navigate „przetarg” jako home

Scope overview ONLY:
  ?ws=qualification|offer = KEEP AS-IS · NIE cel S5

STATUS: PLAN COMPLETE · DF COMPLETE · READY FOR IMPLEMENT
         (czekaj Owner GO IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. DF epic alignment (pre-check)

| Epic DF § | PLAN alignment | Konflikt? |
|-----------|----------------|-----------|
| §11 S5 IN: mount DW na Decyzja gdy Expert ON · fallback DecisionView | §1–§5 poniżej | **NIE** |
| §11 S5 OUT: hard delete DecisionView · store migration | §14 OUT | **NIE** |
| §11 Allowlist thin: DetailPanel · Host wire · DecisionView | §12 (precyzja + DetailPage + PrimaryAction) | **NIE** (rozszerzenie uzasadnione AUDIT) |
| AC-S5-1…4 | §10 | **NIE** |
| Q7 Tab Decyzja = DW | TARGET §1 | **NIE** |
| Q12 Persist hydration | §9 REUSE Host | **NIE** (S5 hydrate; bridge = S6) |
| S2 Dual Outcome · S4 Hub hierarchy | §4 · §6 | **NIE** — Hub KEEP |
| S6 bridge / S7 / S8 | OUT | **NIE** |

**STOP:** nie wymagany · **READY FOR DESIGN FREEZE** po Owner GO.

---

## 1. CURRENT → TARGET (zamrożone)

### 1.1 CURRENT (tip)

```text
/przetargi/:id/przetarg
  → Hub (S4) → … → DecisionWorkspaceHost
     (chiefSessionForDecision tylko gdy activeTab === "przetarg")

/przetargi/:id/decyzja          (?ws brak → overview)
  → TenderDecisionView
     Expert ON: buttons HIDE · verdict DEMOTE · copy „PRIMARY na Przetarg”
     BRAK DecisionWorkspaceHost

/przetargi/:id/decyzja?ws=qualification|offer
  → Qualification / Offer workspace (poza DW)

PrimaryAction Expert ON + ownerDecision:
  scroll #decision-workspace-surface · else navigate „przetarg”
```

### 1.2 TARGET (S5)

```text
/przetargi/:id/przetarg
  → Hub DW KEEP (S4) · ten sam DecisionWorkspaceHost · Persist REUSE

/przetargi/:id/decyzja          (overview ONLY)
  Expert ON + DW stack ON + Session available:
    → DecisionWorkspaceHost PRIMARY
    → TenderDecisionView FALLBACK / recovery (poniżej lub po Host null-path)
  Expert OFF / DW kill / Host hidden:
    → TenderDecisionView PRIMARY (legacy) lub demoted fallback (kill)

/przetargi/:id/decyzja?ws=qualification|offer
  → BEZ ZMIAN S5 (nie mount DW „zamiast” tych workspace’ów)

PrimaryAction Expert ON + ownerDecision:
  → §7 CTA LOCKED poniżej
```

**CURRENT → TARGET:** **PASS** (thin mount / wire / CTA / copy).

---

## 2. Routing Tab „Decyzja” (LOCKED)

| Reguła | LOCKED |
|--------|--------|
| V4 slug | `decyzja` — SSOT `TENDER_DETAIL_V4_*` **NO TOUCH** kontraktu path (chyba że DF wymusi micro-fix — **domyślnie nie**) |
| Default home Decyzja | path **bez** `?ws` → `parseDecyzjaWorkspaceQuery` → **`overview`** |
| S5 mount surface | **tylko** gdy embed legacy = **`overview`** |
| `?ws=qualification` | **KEEP AS-IS** — `TenderQualificationWorkspace` · **OUT** S5 DW mount |
| `?ws=offer` | **KEEP AS-IS** — offer workspace · **OUT** S5 DW mount |
| Sub-tab bar | `TenderDecyzjaSubTabBar` **KEEP** · bez redesign |
| Hub tab `przetarg` | **KEEP** S4 hierarchy + Hub DW |

**Uzasadnienie qualification/offer:** AUDIT — to osobne workspace’y P2-F/oferta pod URL Decyzja, **nie** Decision Workspace. Montaż DW tam = scope creep / big-bang.

---

## 3. Expert-effective + mount condition (LOCKED)

### 3.1 Expert-effective (REUSE S2 — NO NEW FLAG)

| | LOCKED |
|--|--------|
| Detection | `resolveTenderExpertEffective(role)` = `adminCanViewTendersTab` |
| Session stack | `isChiefSessionStackEnabled(expertEffective)` — REUSE |
| DW stack | `isDecisionWorkspaceStackEnabled(expertEffective)` — REUSE (Host wewnętrznie) |
| Kill LS | `kw-decision-workspace` / Session `"0"` = force OFF · **KEEP** S2 |
| `expertAiDecydentEnabled` | **FORBIDDEN** |

### 3.2 Kiedy przekazać Session do Host (DetailPage)

```text
chiefSessionForDecision =
  chiefSession  WHEN
    activeTab === "przetarg"
    OR (activeTab === "decyzja" AND decyzjaWorkspace === "overview")
  ELSE null
```

| | LOCKED |
|--|--------|
| Hub (`przetarg`) | **KEEP** — Session → Hub → Host (S4) |
| Decyzja overview | **NEW** — Session → Panel → Host |
| Decyzja ?ws≠overview | Session **nie** pod Host na tym tabie (workspace inne) |
| Host internal gate | **KEEP** — `flagEnabled` / `uiPhase === "hidden"` → null |

### 3.3 Kiedy renderować Host na Tab Decyzja (DetailPanel overview)

```text
SHOW DecisionWorkspaceHost WHEN
  effectiveWorkspace === "overview"
  AND chiefSessionForDecision != null
  (Host sam respektuje DW stack / hidden)

SHOW TenderDecisionView ALWAYS na overview (FALLBACK / legacy)
  — Expert ON + Host visible: DecisionView = recovery/compatibility (nie PRIMARY buttons)
  — Expert OFF / Host null: DecisionView = PRIMARY legacy (S2 Expert OFF)
```

**ZERO blank Tab Decyzja** gdy Session nie ready: DecisionView pozostaje.

---

## 4. Hub DW po S4 (LOCKED)

| | LOCKED |
|--|--------|
| `TenderWorkflowHubPanel` DecisionWorkspaceHost | **KEEP** — **nie** usuwać · **nie** przenosić wyłącznie na Decyzja |
| S4 hierarchy ANALIZA→…→DECYZJA | **KEEP** |
| S4 attrs / recovery / primary PLN | **KEEP** · S5 **nie** zmienia Hub hierarchy |
| Jednoczesny DOM Hub+Decyzja Host | **NIEMOŻLIWY** (jeden `activeTab` / jeden `effectiveWorkspace`) |
| Semantyka | Hub = contextual DW w story · Decyzja overview = dedicated home Decydent |

**Zakaz S5:** „przenieś DW tylko na Decyzja i wywal z Hub”.

---

## 5. Fallback TenderDecisionView (LOCKED)

| Stan | DecisionView | DW Host |
|------|--------------|---------|
| Expert OFF | **PRIMARY** legacy (buttons ON → `kw-tender-decisions`) | Host null / hidden |
| Expert ON + Host visible | **FALLBACK / recovery** · buttons **HIDE** (S2 KEEP) · verdict **DEMOTE** | **PRIMARY** Actions |
| Expert ON + Host null (Session/DW kill/hidden) | **FALLBACK demoted** · **nie** blank · buttons HIDE | brak |
| Hard delete DecisionView | **FORBIDDEN** (S5) · deprecate = Owner GO (S8 candidate) |

### Thin copy update (allowlist DecisionView)

| AS-IS copy | TARGET copy (thin) |
|------------|-------------------|
| „PRIMARY … na zakładce **Przetarg**” | „PRIMARY … na zakładce **Decyzja** (Decision Workspace). Hub = kontekst procesu.” |
| attrs `data-s2-*` | **KEEP** demote semantics · opc. `data-s5-decision-fallback="1"` gdy Expert ON |

---

## 6. Expert OFF (LOCKED)

| | LOCKED |
|--|--------|
| Staff Module OFF | S1 — brak UI Przetargi (Super Admin bypass) — **NO TOUCH** |
| Expert OFF na Decyzja overview | wyłącznie **TenderDecisionView** PRIMARY · **bez** wymogu DW |
| Legacy write `kw-tender-decisions` | **KEEP** ścieżki Expert OFF |
| Hub Session/DW | legacy flag path S2 — **NO TOUCH** BC |

---

## 7. CTA / home drift — ROZSTRZYGNIĘCIE (LOCKED)

### 7.1 Home Decydent (Expert ON)

| Rola | Surface |
|------|---------|
| **Dedicated home** | Tab **`decyzja`** overview (`/…/decyzja` bez `?ws`) |
| **Contextual DW** | Hub `przetarg` (S4 story) — **KEEP** |

### 7.2 PrimaryAction — Expert ON + `ownerDecision`

```text
LOCKED algorithm:
  IF expertEffective AND action.ownerDecision:
    el = #decision-workspace-surface OR [data-decision-workspace-host]
    IF el exists (już na Hub z DW w DOM):
      scrollIntoView(el)          // KEEP S2/S4 path na przetarg
      RETURN
    navigate("decyzja")           // overview · BEZ ?ws
                                  // NIE navigate("przetarg") jako home
    RETURN
  ELSE:
    legacy (Expert OFF: setOwnerDecision KEEP)
```

| | LOCKED |
|--|--------|
| Label CTA | KEEP kierunek S4: „Przejdź do Decyzji Decydenta” (lub równoważne) |
| `data-s4-cta-to-decision` | **KEEP** attr · semantyka = Decydent home |
| `data-s2-suppress-owner-commit` | **KEEP** |
| Navigate `przetarg` gdy brak el | **SUPERSEDED** przez navigate `decyzja` |
| Command Layer / Hub sticky CTA | ten sam algorithm |

### 7.3 Brak duplikacji primary decision surfaces

| Reguła | LOCKED |
|--------|--------|
| Na **jednym** ekranie | **≤ 1** zestaw PRIMARY human Actions (= DW Actions gdy Expert ON) |
| DecisionView buttons @ Expert ON | **HIDE** (S2) — nie drugi PRIMARY |
| Hub vs Decyzja | różne taby · ten sam Persist · **nie** simultaneous |
| Strategy GO @ Expert ON | S2 demote KEEP · **OUT** S5 rewrite |
| Approve→GO | **FORBIDDEN** w S5 |

---

## 8. Mount DecisionWorkspaceHost na Tab Decyzja (LOCKED)

| Krok | Plik | Zmiana (plan) |
|------|------|----------------|
| S5-A | `TenderDetailPage.tsx` | Rozszerzyć `chiefSessionForDecision` per §3.2 |
| S5-B | `TenderDetailPanel.tsx` | Na `overview`: render `<DecisionWorkspaceHost session={…} tenderId={item.id} />` **przed** / **nad** DecisionView gdy session≠null · REUSE import z `@/app/decision-workspace` |
| S5-C | `TenderDecisionView.tsx` | Thin copy + opc. `data-s5-*` fallback · **KEEP** komponent |
| S5-D | `TenderWorkflowPrimaryAction.tsx` | Algorithm §7.2 |
| S5-E | harness | AC-S5-1…4 |

**Host props:** REUSE istniejące (`session`, `tenderId`) — **bez** nowych Persist API · **bez** edycji `DecisionWorkspaceHost.tsx` BC (wire-only z zewnątrz), chyba że DF wykryje **blocker** (wtedy mikro-touch Host = osobna linia DF + uzasadnienie — domyślnie **NIE**).

**Chief / EW na Decyzja:** **OUT** — `chiefDossierVm` / `expertWorkspaceVm` zostają gated do `przetarg` (S4 Hub). S5 = tylko DW Host na overview.

---

## 9. Hydration / session handoff (LOCKED)

| | LOCKED |
|--|--------|
| Session source | ten sam `useChiefOrchestratorSession` na DetailPage — **REUSE** |
| Persist | Host `hydrateDecision` / `recordDecision` — **REUSE** · schema **NO TOUCH** |
| Tab switch Hub ↔ Decyzja | remount Host OK · hydrate ponownie z `(tenderId, caseId, dossierFinishedAt)` |
| Nowy store / cache | **FORBIDDEN** |
| Bridge Persist → `kw-tender-decisions` | **S6 OUT** |
| Cloud Persist | **OUT** |

**AC-S5-3:** po nawigacji na Decyzja overview + Expert ON + gotowy dossier — Host hydruje lokalny Persist (ten sam co Hub).

---

## 10. AC-S5 — kryteria testowalne (LOCKED)

| AC | Kryterium testowalne | Harness / OV |
|----|----------------------|--------------|
| **AC-S5-1** | Parity checklist: Expert ON overview ma DW Actions (PRIMARY) · DecisionView bez owner write · Hub DW nadal obecny na `przetarg` · brak Approve→GO | Static + OV |
| **AC-S5-2** | `activeTab=decyzja` + overview + Expert ON ⇒ źródło zawiera mount Host / `chiefSessionForDecision` nie null-only-przetarg · **FAIL** gdy Host tylko Hub | Static assert DetailPage/Panel |
| **AC-S5-3** | Host REUSE `hydrateDecision`/`recordDecision` · **zero** nowych store keys · **zero** bridge | Grep Persist API untouched + Host wire |
| **AC-S5-4** | `TenderDecisionView` plik + mount overview **istnieje** · hard delete **FORBIDDEN** · Expert OFF path KEEP | Assert file + overview render + Expert OFF buttons path |

### Parity checklist (AC-S5-1 — definicja PLAN)

| Check | PASS gdy |
|-------|----------|
| P1 | Expert ON + overview → DW Host w drzewie (gdy Session) |
| P2 | Expert ON → DecisionView owner buttons HIDE |
| P3 | Expert OFF → DecisionView PRIMARY (brak wymogu DW) |
| P4 | Hub `przetarg` nadal ma Host path (S4) |
| P5 | PrimaryAction Expert ON nie woła `setOwnerDecision` |
| P6 | PrimaryAction brak DW w DOM → `decyzja` nie `przetarg` |
| P7 | `?ws=qualification\|offer` bez Host zamiast tych paneli |
| P8 | Brak trzeciego store / bridge |

---

## 11. Harness S5 (LOCKED)

| | LOCKED |
|--|--------|
| Skrypt | `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` |
| Alias | `scripts/test-tender-modernization-s5.mjs` (thin re-export / spawn) |
| Styl | Static source asserts jak S2/S4 · **bez** E2E prod obowiązkowo w MVP harness |
| Gate regresji | Po IMPLEMENT: S5 PASS · **S2 Dual Outcome 45** · **S4 Hub 37** · build PASS |
| OUT harness | Persist schema tests rewrite · Strategy · TRE delete |

---

## 12. Minimal implementation allowlist (LOCKED)

| # | Path | Zakres |
|---|------|--------|
| 1 | `src/app/TenderDetailPage.tsx` | `chiefSessionForDecision` §3.2 |
| 2 | `src/app/TenderDetailPanel.tsx` | Mount Host na overview §8 |
| 3 | `src/app/TenderDecisionView.tsx` | Thin copy / `data-s5-*` fallback |
| 4 | `src/app/TenderWorkflowPrimaryAction.tsx` | CTA §7.2 |
| 5 | `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | AC harness |
| 6 | `scripts/test-tender-modernization-s5.mjs` | Alias |
| 7 | Docs S5 DF / IMPLEMENT / PV / CLOSEOUT | po GO etapów |

### Explicit NON-allowlist

| Path / obszar | Powód |
|---------------|-------|
| `DecisionWorkspaceHost.tsx` / Surface / Actions BC | REUSE as-is (domyślnie) |
| `src/lib/decision-persist/**` | Persist API LOCK |
| `src/lib/decision-workspace-ui/**` (VM/rules) | LOCK |
| Expert / Chief / Session / Validation / Adapters / TF | 8 LOCK |
| OfferBoq / Bid domain | LOCK |
| Strategy `BestOpportunityCard` / Action Center | OUT |
| `TenderWorkflowHubPanel.tsx` hierarchy | S4 KEEP — **nie** w S5 chyba że blocker (domyślnie NIE) |
| `tender-detail-routes-v4.ts` | kontrakt URL KEEP |
| `useTenderOfferRun.ts` | WIP OUT |

**Diff commit S5 ⊆ allowlist.** `git add -A` **FORBIDDEN**.

---

## 13. Rollback (LOCKED)

| Mechanizm | LOCKED |
|-----------|--------|
| Primary | `git revert` commit(ów) S5 UI allowlist |
| Tab Decyzja po revert | z powrotem **TenderDecisionView** only (pre-S5) |
| Hub DW | nietknięty semantycznie (S4) |
| Store | brak migracji → rollback **bez** data repair |
| Flagi | **brak** nowej flagi S5 · rollback ≠ Feature Flag |

---

## 14. OUT / 8 LOCK (LOCKED)

| OUT | |
|-----|--|
| S6 Persist → legacy bridge | |
| Strategy rewrite | |
| S7 TRE deprecation | |
| S8 hard REMOVE | |
| DecisionView hard delete | |
| Store migration / nowy KV | |
| Cloud Persist | |
| `useTenderOfferRun.ts` | |
| Hub DW removal | |
| DW mount na `?ws=qualification\|offer` | |
| Approve→GO / Reject→NO-GO map | |
| Third PLN / third engine | |
| Chief/EW mount na Tab Decyzja | |

**8 LOCK:** Expert BC · Chief · Session · Validation · Adapters · TF · OfferBoq/Bid · Decision Persist API/store.

---

## 15. Owner Verification matrix (LOCKED)

| ID | Scenariusz | Oczekiwanie | Gate |
|----|------------|-------------|------|
| **OV-S5-1** | Super Admin · Expert ON · `/decyzja` overview · Session ready | DW Host widoczny · Actions PRIMARY | Owner |
| **OV-S5-2** | Ten sam · DecisionView | Brak aktywnych GO/HOLD/NO-GO · copy fallback | Owner |
| **OV-S5-3** | `/przetarg` Hub | S4 hierarchy + Hub DW **nadal** | Owner |
| **OV-S5-4** | PrimaryAction „Przejdź do Decyzji…” z innego tabu | Ląduje na **`/decyzja`** (nie wymusza Hub) | Owner |
| **OV-S5-5** | Już na Hub z DW · PrimaryAction Decydent | Scroll do Hub DW (bez zbędnego hop) | Owner |
| **OV-S5-6** | `/decyzja?ws=qualification` | Qualification UI · **nie** podmienione na sam DW | Owner |
| **OV-S5-7** | Expert OFF (lub Staff bez module — wg roli) | DecisionView legacy PRIMARY / brak regresji S1 | Owner |
| **OV-S5-8** | Refresh na `/decyzja` po Approve w Host | Hydration lokalnego Persist (Q12 thin) · **bez** lejka Strategy | Owner |
| **OV-S5-9** | DW kill LS=`0` @ Expert ON | Host hidden · DecisionView demoted fallback · **nie** blank | Owner |
| **OV-S5-10** | Regresja | S2 harness PASS · S4 harness PASS · build PASS | CI/local |

**PV (po push):** bundle markers — obecność mount path Decyzja + Hub KEEP + brak Persist bridge strings nowych · `version.json` tip.

---

## 16. Implementation slices (kolejność — dla DF/IMPLEMENT)

| Slice | Treść | Depends |
|-------|--------|---------|
| **S5-A** | DetailPage `chiefSessionForDecision` overview | — |
| **S5-B** | DetailPanel mount Host na overview | S5-A |
| **S5-C** | DecisionView thin copy/attrs | S5-B |
| **S5-D** | PrimaryAction CTA home `decyzja` | S5-B (logicznie) |
| **S5-E** | Harness AC-S5 + regresja S2/S4 | S5-A…D |

**NO BIG-BANG:** jeden allowlist commit po Owner VERIFY (lub micro-commits ⊆ allowlist — DF zdecyduje; prefer **jeden** feature commit jak S4).

---

## 17. Open points → DESIGN FREEZE (domknięte tutaj / do potwierdzenia DF)

| # | Temat | PLAN lock | DF action |
|---|-------|-----------|-----------|
| 1 | CTA home = Decyzja | **LOCKED** §7 | Confirm / amend only if Owner override |
| 2 | Hub DW KEEP | **LOCKED** §4 | Confirm |
| 3 | DecisionView always mounted overview | **LOCKED** §5 (fallback always) | Confirm order DOM: Host **above** DecisionView |
| 4 | Host.tsx touch | **Domyślnie NIE** | DF: blocker-only |
| 5 | UI version bump | **NIE** (jak S2–S4) | Confirm |

**Owner override CTA (alternatywa ODRZUCONA w tym PLAN):** „zawsze Hub-first navigate przetarg” — **odrzut**, bo utrwala Dual Outcome FAIL na Tab Decyzja.

---

## 18. Werdykt

| | |
|--|--|
| **PLAN COMPLETE** | **YES** |
| **READY FOR DESIGN FREEZE** | **YES** |
| **READY FOR IMPLEMENT** | **NIE** — czekaj Owner GO → **S5 DF** → GO IMPLEMENT |
| **Store change** | **NIE** |
| **Konflikt z S4/S2** | **NIE** (Hub KEEP · Dual Outcome rozszerzony na Tab) |

---

## 19. STOP

```text
PLAN zamknięty przez S5 DESIGN FREEZE.
SSOT IMPLEMENT = TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md
Nie implementuj bez Owner GO → IMPLEMENT.
Nie commituj.
Nie pushuj.
```
