# TENDER-MODERNIZATION-01 / S2 — AUDIT (Dual Outcome)

> **STATUS:** **AUDIT COMPLETE** · **Conflict A RESOLVED** (Owner Option 2 · 2026-08-08)  
> **ID:** TENDER-MODERNIZATION-01-S2-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S2 — Dual Outcome**  
> **TRYB:** **AUDIT ONLY** (historyczny) · DF amend supersedes dependency block  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / **`eed3ba0e`** ([`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md))  
> **SSOT polityki (po amend):** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §1A · §4 · [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md) §3–4  
> **S1 dependency (LOCKED):** [`TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md`](TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) — **nie** EXPERT-AI-PRODUCTION-ENABLEMENT-01

```text
════════════════════════════════════════════════════════
S2 AUDIT — Dual Outcome
(+ post-amend note · Conflict A RESOLVED)

Conflict A: RESOLVED — Owner Option 2
  S1 = TENDER-MODULE-ENABLEMENT-01
  Expert effective = MODULE effective
  NO expertAiDecydentEnabled
  LS Session/DW = kill-switch / harness / dev ONLY

Runtime tip (pre-S2 IMPLEMENT):
  Dual Outcome hierarchy nadal NIE wdrożona
  (równoległe primary-looking surfaces gdy Session+DW LS ON)
  — to jest zakres S2 PLAN/IMPLEMENT, nie blok dependency

READY FOR S2 PLAN: YES
READY FOR IMPLEMENT S2: po Owner GO PLAN (osobny turn)
════════════════════════════════════════════════════════
```

---

## 0A. Conflict A — RESOLVED (Owner Option 2)

| Decyzja Owner | LOCKED |
|---------------|--------|
| Opcja | **2** |
| `expertAiDecydentEnabled` | **NIE tworzyć** |
| Drugi master gate Expert | **NIE** |
| Module gate | `AppSettings.tendersTabForStaffEnabled` — **jedyny** produkcyjny Staff↔Przetargi |
| Expert AI effective | **=** Tender Module effective |
| S1 TM-01 | **`TENDER-MODULE-ENABLEMENT-01`** (CLOSED tip) |
| EXPERT-AI-PRODUCTION-ENABLEMENT-01 | **nie** dependency S2 |
| LS `kw-chief-orchestrator-session` / `kw-decision-workspace` | kill-switch / harness / dev — **nie** Staff enablement |

**Access matrix (Module):** Super Admin zawsze TAK · Admin/Moderator OFF=NIE / ON=TAK.

---

## 0. Zakres audytu / 8 LOCK

| | |
|--|--|
| **IN** | Odczyt kodu + mapowanie surfaces / store / consumers / gate |
| **OUT** | IMPLEMENT · usuwanie · deprecjacja · zmiana store · refactor BC |
| **8 LOCK** | Expert BC · Chief BC · Session BC · Wire Adapters · TF · OfferBoq · Bid calculator · domain calculations — **NO TOUCH** (audit only) |

---

## 1. Current Outcome Map

| Path | Input | Output | Store | Consumer | Primary? (tip) | Legacy? | Expert? |
|------|-------|--------|-------|----------|----------------|---------|---------|
| **System scoring** `computeTenderDecision` | opportunity + strategic scores | `GO`/`HOLD`/`NO-GO` (rekomendacja) | — (ephemeral) | Intelligence overlay · Strategy cards · owner snapshot `systemDecision` | rekomendacja ≠ owner SSOT | TAK (legacy scoring) | NIE |
| **TenderDecisionView** (tab Decyzja / overview embed) | `TenderIntelligenceContext` + owner record | UI werdykt systemu + finance + **STARTUJ/ANALIZUJ/ODPUŚĆ** | write **`kw-tender-decisions`** | Strategy KPI · list queues · alerts · Primary CTA | **TAK** (owner human) tip | TAK | NIE (nie demoted) |
| **TenderWorkflowPrimaryAction** (Hub / Command Layer) | next-action resolve + optional `ownerDecision: GO` | nawigacja lub **setOwnerDecision(GO)** | write **`kw-tender-decisions`** | Hub CTA · Command Layer | **TAK** gdy CTA = zatwierdź STARTUJ | TAK | NIE |
| **Strategy BestOpportunityCard / Strategy focus** | scoring bundle | GO/HOLD/NO-GO buttons | write **`kw-tender-decisions`** | Strategy UI · portfolio | **TAK** (równoległy write) | TAK | NIE |
| **TRE-01 Outcome** `TenderRecommendationOutcomeView` | Bid Proposal via Offer Run | recommended PLN + quality + CTA Hub/Kosztorys | LS run-id only (`kw-tre-01-offer-run-id:*`) · **nie** owner decision | Detail landing (default ON) | **NIE** (cena/proces) | TAK landing | NIE |
| **Intelligence overlay** | scoring + blocks | displayDecision / reasons | — | Hub · DecisionView verdict section | rekomendacja | TAK | NIE |
| **Validation Expert** (via DW Host) | Chief dossier | verdict validated/needs_review/blocked | in-memory cache | DW panels | **NIE** (QA) | NIE | TAK (gdy Session LS) |
| **Decision Workspace Actions** | dossier + validation + scenario | `approve`/`reject`/`needs_review`/`return` | write **`kw-decision-persist-v1`** (+ local state) · **return** bez Persist | tylko DW Host UI (brak Strategy consumer) | **DF primary target** · tip: tylko gdy DW LS=`1` + Session LS | NIE | TAK |
| **Decision Persist hydrate** | tenderId+caseId+dossierFinishedAt | DecydentLocalDecision | read **`kw-decision-persist-v1`** | DW Host only | lokalny SSOT Expert decyzji | NIE | TAK |
| **Module gate** `tendersTabForStaffEnabled` | AppSettings | nav/route Przetargi | `kw-app-settings` | Admin ACL | **produkcyjny** Module/Expert effective | — | **= Expert effective** (DF amend) |

**Uwaga SSOT tip:** Strategy / listy / Action Center / forecast **czytają wyłącznie** `kw-tender-decisions`. Persist **nie** wpływa na lejek GO.

---

## 2. Decision Conflict Map

Miejsca, gdzie użytkownik może dostać **więcej niż jeden** wynik decyzyjny (semantycznie równorzędny lub mylący):

| Surface | Wyniki | Kiedy widoczne jednocześnie |
|---------|--------|------------------------------|
| Hub Primary CTA | może zapisać **GO** (STARTUJ) | zawsze (gdy CTA P8) — niezależnie od DW |
| Decision Workspace | **Zatwierdź / Odrzuć / Do przeglądu / Wróć** | Session LS ON + DW LS ON + tab Przetarg + dossier |
| TenderDecisionView | **STARTUJ / ANALIZUJ / ODPUŚĆ** | tab Decyzja (V4) / overview embed |
| Strategy Best Opportunity | **GO/HOLD/NO-GO** | widok Strategia |
| Intelligence verdict chip | system **GO/HOLD/NO-GO** (display) | Hub / Decyzja (obok owner buttons) |
| Validation verdict | validated / needs_review / blocked | panel DW (doradczy) |
| Offer primary recommendation | rekomendacja oferty (Expert) | DW Recommendation panel |
| TRE-01 | recommended PLN (nie owner enum) | Outcome landing — osobny tor ceny |

### Mapowanie enumów (bez mostka runtime)

| Expert Persist / DW | Legacy owner | Tip bridge? |
|---------------------|--------------|-------------|
| `approve` | `GO` | **BRAK** (DF §4.3 = od S6) |
| `reject` | `NO-GO` | **BRAK** |
| `needs_review` | `HOLD` | **BRAK** |
| `return` | — (UI only, clear local) | N/A |

**Konflikt UX (pre-S2 IMPLEMENT):**  
Na Hub mogą współistnieć PrimaryAction (legacy GO) **oraz** `DecisionWorkspaceHost` — **bez** hierarchy. To **przedmiot S2 PLAN**, nie Conflict A.

---

## 3. Store Map

### 3.1 `kw-tender-decisions`

| | |
|--|--|
| **API** | `src/lib/tenders-strategy-owner-decisions.ts` |
| **Schema** | `{ version: 1, byId: { [tenderId]: OwnerTenderDecisionRecord } }` |
| **Enumy** | `decision` / `systemDecision`: **`GO` \| `HOLD` \| `NO-GO`** |
| **Persist** | **localStorage only** · **brak** cloud-sync / KV |

**Write:** DecisionView · Hub PrimaryAction · Strategy UI via `useOwnerTenderDecisions`.  
**Read:** Strategy snapshot · listy · alerts · forecast · Pulpit shortcut · intelligence next-action.

### 3.2 `kw-decision-persist-v1`

| | |
|--|--|
| **API** | `recordDecision` · `hydrateDecision` · `listDecisionHistory` |
| **Enumy action** | `approve` \| `reject` \| `needs_review` |
| **Klucz hydrate** | **tenderId + caseId + dossierFinishedAt** |
| **Write tip** | `DecisionWorkspaceHost` only |
| **`listDecisionHistory`** | harness only |

### 3.3 Relacja store’ów (tip)

```text
Persist ──(brak bridge)──✗──→ kw-tender-decisions
Strategy / listy / CTA  ←──── kw-tender-decisions  (SSOT legacy tip)
DW UI hydrate           ←──── kw-decision-persist-v1
```

---

## 4. Primary Policy Check (po DF amend)

### Polityka DF §4.2 (po Option 2)

```text
Module/Expert effective ON (dostęp do Przetargi):
  PRIMARY = Decision Workspace
  LEGACY  = bridge/compatibility ONLY

Module OFF Staff:
  brak UI Przetargi (nie LEGACY primary dla Admin/Moderator)
```

### Check tip

| Warunek | Oczekiwane DF | Runtime tip | Werdykt |
|---------|---------------|-------------|---------|
| Module OFF Staff | brak dostępu | ACL Module Enablement | **PASS** (S1) |
| Module ON · DW hierarchy | DW jedyna primary | hierarchy **nie** wdrożona | **GAP → S2** |
| Persist vs Strategy | mostek S6 | brak mostka | **GAP → S6** |
| `kw-tender-decisions` istnieje | TAK | TAK | **PASS** |
| Expert master flag | **brak** | brak `expertAiDecydentEnabled` | **PASS** (Option 2) |
| Module vs Expert LS | Module = production; LS = kill-switch | oddzielone | **PASS** (separacja) |

### Expert AI effective gate (po amend)

| Warstwa | Mechanizm | Rola |
|---------|-----------|------|
| **Production** | `tendersTabForStaffEnabled` + `adminCanViewTendersTab` | **Expert/Module effective** |
| Session LS | `kw-chief-orchestrator-session` | kill-switch / harness / dev |
| DW LS | `kw-decision-workspace` | kill-switch / harness / dev |
| `expertAiDecydentEnabled` | — | **FORBIDDEN** |

---

## 5. Migration Gaps (S2+ — nie Conflict A)

1. Hierarchy Hub/CTA demote legacy GO/HOLD gdy Module effective (**S2**).  
2. Tab Decyzja → DW primary (**S5**).  
3. Bridge Persist → `kw-tender-decisions` (**S6**).  
4. Copy TRE-01/Intelligence „nie SSOT” (**S2**).  
5. Strategy BestOpportunity demote (**S2 PLAN scope**).  
6. Wire runtime: Module effective ⇒ Expert stack path (bez nowego AppSettings Expert) — **S2 PLAN** (LS zostaje kill-switch).  
7. Harness AC-S2-1…5.  
8. DW subtitle „bez zapisu” dryf vs Persist (kosmetyka).

---

## 6–7. Consumer inventory / 8 LOCK

Bez zmian względem audytu runtime (evidence §11).  
**8 LOCK:** ten audit + DF amend = **docs only** · **PASS**.

---

## 8. Recommendation (po amend)

1. ~~Rozstrzygnij Conflict A~~ → **DONE** Option 2.  
2. **S2 PLAN** thin hierarchy (Hub · PrimaryAction · Decision buttons · copy) — **bez** nowego flag.  
3. Nie IMPLEMENT `EXPERT-AI-PRODUCTION-ENABLEMENT-01` jako warunek S2.  
4. S6 mostek nadal wymagany dla Strategy SSOT.

---

## 9. READY FOR PLAN / IMPLEMENT?

| | |
|--|--|
| **READY FOR S2 PLAN** | **YES** |
| **READY FOR IMPLEMENT S2** | po Owner GO na osobny turn PLAN → IMPLEMENT |
| **Conflict A block** | **CLEARED** |

---

## 10. Odchylenia vs DF — historyczne (przed amend)

### KONFLIKT A — **RESOLVED**

Owner wybrał Option 2 · DF §1A LOCKED · S1 = Module Enablement.

### Gap runtime Dual Outcome — **OPEN (S2)**

AC-S2-1/2 nadal FAIL w tip do IMPLEMENT S2 — **nie** blok dependency.

---

## 11. Evidence pointers (kod)

| Temat | Ścieżka |
|-------|---------|
| Legacy Decision UI | `src/app/TenderDecisionView.tsx` |
| Hub + DW mount | `src/app/TenderWorkflowHubPanel.tsx` |
| Hub CTA → GO | `src/app/TenderWorkflowPrimaryAction.tsx` |
| DW Host + Persist | `src/app/decision-workspace/DecisionWorkspaceHost.tsx` |
| Module gate | `src/lib/app-settings.ts` · `src/lib/admin-auth.ts` |
| Session / DW flags | `src/lib/chief-session/flag.ts` · `src/lib/decision-workspace-ui/flag.ts` |

---

## 12. Closing

```text
S2 AUDIT COMPLETE
Conflict A: RESOLVED (Owner Option 2)

Expert AI master: NO NEW FLAG
Module gate: tendersTabForStaffEnabled
Expert effective: MODULE EFFECTIVE
S1 dependency: TENDER-MODULE-ENABLEMENT-01
S2 primary: Decision Workspace
Legacy: bridge / compatibility
8 LOCK: PASS
Runtime diff (ten turn amend): EMPTY

READY FOR S2 PLAN
```
