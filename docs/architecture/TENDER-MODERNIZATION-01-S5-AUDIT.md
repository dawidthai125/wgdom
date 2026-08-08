# TENDER-MODERNIZATION-01 / S5 — AUDIT (Tab Decyzja → DW)

> **STATUS:** **AUDIT COMPLETE** · **READY FOR S5 PLAN** (tylko po osobnym Owner GO)  
> **ID:** TENDER-MODERNIZATION-01-S5-AUDIT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S5 — Tab Decyzja → Decision Workspace**  
> **TRYB:** **AUDIT ONLY** — bez IMPLEMENT · bez PLAN/DF · bez commit/push · bez zmian kodu  
> **Data:** 2026-08-08  
> **Production tip:** UI **2.66.22** / feature **`85f4db14`** · docs tip **`d2f57b4b`** · `origin/main` = **`d2f57b4b`**  
> **Prior CLOSED:** S0–S4 · S2 Dual Outcome **`1888d05f`** · S4 Hub UX **`85f4db14`**  
> **SSOT roadmap:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md) · epic DF [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §11 S5 · §12 AC-S5  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` (local M) — **NIE** część S5

```text
════════════════════════════════════════════════════════
S5 AUDIT — Tab Decyzja → DW

GAP (LOCKED findings):
  Tab V4 „decyzja” (default overview) = TenderDecisionView
  DW Host mount = TYLKO tab „przetarg” (Hub)
  chiefSessionForDecision = null poza „przetarg”
  Expert ON + Tab Decyzja = demoted DecisionView · BRAK Actions DW
  PrimaryAction Expert ON → scroll Hub DW / navigate „przetarg”
    (NIE „decyzja”)

Store:
  S5 NIE wymaga zmiany store / schema / Persist API
  kw-tender-decisions UNTOUCHED · kw-decision-persist-v1 UNTOUCHED

Duplicate risk:
  Hub DW (S4 KEEP) + Tab Decyzja DW (S5 target) = OK
  (różne taby · nie simultaneous DOM · ten sam Host/Persist)
  NIE hard-delete DecisionView · NIE S6 bridge

READY FOR S5 PLAN: YES
READY FOR IMPLEMENT: NIE (czekaj Owner GO → PLAN → DF → GO)
════════════════════════════════════════════════════════
```

---

## 0. Zakres / 8 LOCK / OUT

| | |
|--|--|
| **IN (audit)** | Routing tab Decyzja · mount DW · DecisionView · Expert-effective · S2/S4 parity · consumers · allowlist · AC · ryzyka · store boundary |
| **OUT** | IMPLEMENT · PLAN · DF · commit · push · S6 bridge · S7 TRE · S8 removal · DecisionView hard delete · store migration · Cloud Persist · `useTenderOfferRun.ts` |
| **8 LOCK** | Expert BC · Chief · Session · Validation · Adapters · TF · OfferBoq/Bid domain · Decision Persist API/store · Strategy — **NO TOUCH** |

---

## 1. Routing / tab „Decyzja” (AS-IS)

| Element | Stan tip |
|---------|----------|
| V4 tabs | `przetarg` · `dokumenty` · `kosztorys` · `ceny` · `decyzja` — SSOT `TENDER_DETAIL_V4_ACTIVE_TAB_ORDER` |
| Path | `/przetargi/:id/decyzja` · opcjonalnie `?ws=qualification\|offer` |
| Default `?ws` | **brak** → `parseDecyzjaWorkspaceQuery` → **`overview`** |
| Embed map | `resolveV4EmbedLegacyWorkspace("decyzja", ws)` → legacy `overview` \| `qualification` \| `offer` |
| Sub-taby UI | `TenderDecyzjaSubTabBar` — Przegląd / Kwalifikacja / Oferta |
| Panel host | `TenderDetailPage` → `TenderDetailPanel` z `embedV4Workspace={legacyWorkspace}` |

**Default Decyzja (Przegląd)** = legacy workspace **`overview`** → render **`TenderDecisionView`**.

**Sub-taby Kwalifikacja / Oferta** = osobne workspace’y (P2-F / oferta) — **nie** są Decision Workspace. S5 cel = ścieżka **overview / default Decyzja**, nie rewrite qualification/offer.

---

## 2. Mountowanie Decision Workspace (AS-IS)

| Warstwa | Plik | Zachowanie tip |
|---------|------|----------------|
| Session gate | `TenderDetailPage.tsx` | `isChiefSessionStackEnabled(expertEffective)` → `useChiefOrchestratorSession` |
| DW session prop | `TenderDetailPage.tsx` L248–249 | **`chiefSessionForDecision = activeTab === "przetarg" ? chiefSession : null`** |
| Hub mount | `TenderWorkflowHubPanel.tsx` | `{chiefSessionForDecision != null && <DecisionWorkspaceHost …/>}` wewnątrz Hub hierarchy (S4) |
| Host gate | `DecisionWorkspaceHost.tsx` | `isDecisionWorkspaceStackEnabled(expertEffective)` · kill LS `kw-decision-workspace`=`0` · `vm.uiPhase === "hidden"` → null |
| Persist | Host only | `hydrateDecision` / `recordDecision` — **REUSE** · schema **NO TOUCH** |

```text
Expert ON + tab=przetarg + Session ready
  → Hub: Analiza → Eksperci → DecisionWorkspaceHost (WALIDACJA→REC→Findings→Actions)
  → PRIMARY human = DW Actions (S2) · data-s2-dw-primary

Expert ON + tab=decyzja (overview)
  → chiefSessionForDecision = null
  → TenderDecisionView (owner buttons HIDE · verdict DEMOTE)
  → BRAK DecisionWorkspaceHost
```

**To jest główna luka S5.**

---

## 3. TenderDecisionView / DecisionView (AS-IS)

| | |
|--|--|
| **Komponent** | `src/app/TenderDecisionView.tsx` (brak osobnego `DecisionView.tsx` — nazwa produktowa = DecisionView) |
| **Jedyny consumer UI** | `TenderDetailPanel.tsx` gdy `effectiveWorkspace === "overview"` |
| **Expert ON** | system verdict **DEMOTE** · owner buttons **HIDE** · record RO · copy: „PRIMARY … na zakładce **Przetarg**” |
| **Expert OFF** | legacy PRIMARY — STARTUJ/ANALIZUJ/ODPUŚĆ → `kw-tender-decisions` |
| **Hard delete** | **FORBIDDEN** w S5 (AC-S5-4 · rollback = DecisionView na tab) |

---

## 4. Fallback behavior (AS-IS → target S5)

| Warunek | Tip dziś | Oczekiwanie S5 (audit) |
|---------|----------|-------------------------|
| Expert OFF | DecisionView PRIMARY (legacy) | **KEEP** DecisionView PRIMARY |
| Expert ON + DW stack ON + Session | DW tylko na Hub | DW **także** (lub zamiast primary UI) na Tab Decyzja overview |
| Expert ON + Session null / DW hidden | DecisionView demoted, bez Actions | DecisionView **fallback** (demoted) — nie blank |
| Expert ON + DW kill LS=`0` | Hub bez DW · DecisionView demoted bez write | **KEEP** S2 semantics · fallback DecisionView demoted |
| Owner deprecate DecisionView | — | **AC-S5-4** = fallback do osobnego Owner GO (nie S5 delete) |

---

## 5. Expert-effective (S2 KEEP)

| Helper | SSOT |
|--------|------|
| `resolveTenderExpertEffective(role)` | `adminCanViewTendersTab` (= Module) · **NO** `expertAiDecydentEnabled` |
| Session stack | Expert ON ⇒ ON unless LS `"0"` |
| DW stack | Expert ON ⇒ ON unless LS `"0"` |
| Super Admin | bypass Module (S1) |

S5 **musi** REUSE te helpery — bez nowego master gate.

---

## 6. Zgodność z S2 Dual Outcome

| Reguła S2 | Tip | S5 impact |
|-----------|-----|-----------|
| DW = PRIMARY human gdy Expert ON | PASS na Hub | **FAIL lokalnie na Tab Decyzja** (brak mount) |
| Brak dwóch primary button sets **w Hub** | PASS (GO commit HIDE) | Hub KEEP · Tab Decyzja dostaje ten sam Host Actions (nie simultaneous) |
| DecisionView HIDE/DEMOTE | PASS | KEEP jako fallback / recovery |
| **NO** Approve→GO map | PASS | S5 **OUT** bridge (S6) |
| Stores untouched | PASS | S5 **NIE** zmienia store |

**Conflict residual:** copy DecisionView mówi „PRIMARY na Przetarg” — po S5 powinno wskazywać Tab Decyzja (lub „Hub / Decyzja”) bez zmiany semantyki Dual Outcome.

---

## 7. Zgodność z S4 Hub hierarchy

| S4 LOCK | S5 |
|---------|-----|
| Hub ANALIZA→EKSPERCI→WALIDACJA→REKOMENDACJA→DECYZJA | **KEEP** Hub DW — S5 **nie** usuwa hierarchy |
| Intelligence recovery | **KEEP** |
| CL „Hub przetargu” | **KEEP** |
| Single primary PLN = Hub headline | **KEEP** · S5 **nie** przenosi PLN primary |
| `data-s4-cta-to-decision` | tip: Expert ON + ownerDecision → scroll Hub DW / **navigate `przetarg`** |

**S5 alignment recommendation (dla PLAN, nie implement tu):** CTA Expert ON może nawigować do **`decyzja`** (overview) gdy Tab Decyzja = home DW; Hub scroll pozostaje valid gdy już na `przetarg`. Wymaga jawnego wyboru w PLAN/DF.

---

## 8. Consumers DecisionView / legacy decision writes

### UI consumers `TenderDecisionView`

| Consumer | Rola |
|----------|------|
| `TenderDetailPanel` overview | **jedyny** mount |
| Harness: `test-tender-workflow-hub.mjs` · `test-tender-workspace-ux.mjs` · `test-p5-owner-view.mjs` · `test-tender-modernization-01-s2-dual-outcome.mjs` · a11y | expect presence / copy |

### Writers `kw-tender-decisions` (legacy funnel)

| Writer | Expert ON tip |
|--------|---------------|
| `TenderDecisionView` buttons | **HIDE** (brak write) |
| `TenderWorkflowPrimaryAction` ownerDecision | **suppress** → scroll/nav Hub |
| Strategy `BestOpportunityCard` / `TendersStrategyContent` | write omit / demote (S2) |

### Readers (compatibility — S6 bridge later)

Strategy KPI · Action Center · alerts · portfolio — **czytają** `kw-tender-decisions`. Persist **nie** wpływa na lejek (S2). S5 **nie** mostkuje.

### DW Persist consumers

| | |
|--|--|
| Write/read | tylko `DecisionWorkspaceHost` → `kw-decision-persist-v1` |
| Strategy | **brak** consumer Persist (do S6) |

---

## 9. Duplikaty surface / CTA

| Surface | Gdzie | Simultaneous? | Werdykt S5 |
|---------|-------|---------------|------------|
| DW Host Actions | Hub `przetarg` | vs Decyzja | **nie** simultaneous · **ALLOWED** REUSE Host |
| DW Host Actions | Tab Decyzja (target) | vs Hub | ten sam Persist · **ZERO DUPLICATE BC** |
| DecisionView owner buttons | overview | vs DW | Expert ON: już HIDE · przy mount DW: DecisionView = recovery/fallback only |
| PrimaryAction „Przejdź do Decyzji Decydenta” | Hub/CL | → Hub DW | **CTA target drift** vs S5 Tab Decyzja — do rozstrzygnięcia w PLAN |
| System GO/HOLD chip | DecisionView / Intelligence | vs DW Actions | DEMOTE KEEP (rekomendacja ≠ Decydent) |
| Strategy GO buttons | Strategia module | vs DW | S2 demote KEEP · poza S5 allowlist |

**Third PLN / third engine:** **NIE** w S5.

---

## 10. Store boundary — oczekiwanie: **NIE**

| Store / API | S5 |
|-------------|-----|
| `kw-tender-decisions` | **NO TOUCH** (schema · merge · write paths · migration) |
| `kw-decision-persist-v1` | **NO TOUCH** API/schema · Host **REUSE** hydrate/record |
| Cloud Persist / sync | **OUT** |
| Nowy store key | **FORBIDDEN** |
| Approve→GO projection | **S6 only** |

**Werdykt:** S5 = **UI mount / routing / thin copy / CTA** only. **Brak zmiany store.**

---

## 11. Allowlist (propozycja AUDIT → PLAN)

| Priorytet | Plik | Powód |
|-----------|------|--------|
| **P0** | `src/app/TenderDetailPage.tsx` | Podawać `chiefSessionForDecision` także gdy `activeTab === "decyzja"` (+ ewentualnie tylko overview) |
| **P0** | `src/app/TenderDetailPanel.tsx` | Mount `DecisionWorkspaceHost` na overview gdy Expert/session; DecisionView fallback |
| **P1** | `src/app/TenderDecisionView.tsx` | Thin copy/attrs fallback (PRIMARY → Decyzja) · **bez** hard delete |
| **P1** | `src/app/TenderWorkflowPrimaryAction.tsx` | CTA Expert ON → `decyzja` (opcjonalnie + scroll DW) — jeśli PLAN wybierze Tab jako home |
| **P2** | thin helper (opcjonalnie) np. w `tender-expert-effective` / mały `tender-decyzja-dw-mount.ts` | SSOT „czy mount DW na Decyzja” — tylko jeśli uniknie duplikacji warunków |
| **P0 test** | `scripts/test-tender-modernization-01-s5-*.mjs` (+ alias) | AC-S5-1…4 |
| **Docs** | S5 PLAN / DF / IMPLEMENT / PV / CLOSEOUT | po Owner GO etapów |

**Explicit NON-allowlist:** Expert/Chief/Session/Validation BC · Adapters · TF · OfferBoq/Bid · Persist API · Strategy modules · `useTenderOfferRun.ts` · TRE delete · Hub hierarchy rewrite (S4 KEEP).

---

## 12. AC-S5 (z epic DF) + ryzyka

| AC | Treść DF | Stan tip | Gap |
|----|----------|----------|-----|
| **AC-S5-1** | Parity DecisionView ↔ DW PASS | DecisionView demoted · DW na Hub | Potrzebna checklist parity UX (ścieżka Decydenta na Tab) — **nie** enum map (S6) |
| **AC-S5-2** | Tab Decyzja = DW gdy Expert ON | **FAIL** | Mount + session prop |
| **AC-S5-3** | Persist hydration OK | Host OK na Hub | Po remount Decyzja: REUSE Host hydrate — **oczekiwane PASS** bez store change |
| **AC-S5-4** | DecisionView fallback do Owner GO deprecate | DecisionView KEEP | S5 **nie** delete · deprecate = osobny GO (S8 candidate) |

### Ryzyka (PLAN musi adresować)

| ID | Ryzyko | Mitigation (kierunek) |
|----|--------|------------------------|
| R1 | Blank Tab Decyzja gdy Session nie ready | DecisionView fallback zawsze gdy Host null |
| R2 | Dwukrotny Host (Hub+Decyzja) — stan na switch tab | Remount + hydrate · ten sam Persist key |
| R3 | CTA nadal → `przetarg` | PLAN: navigate `decyzja` vs KEEP Hub-first |
| R4 | Sub-taby qualification/offer mylone z DW | Scope S5 = **overview only** |
| R5 | Regresja harness S2/S4 | Gate: S2 45 · S4 37 PASS po IMPLEMENT |
| R6 | Przypadkowy write `kw-tender-decisions` | Expert ON: KEEP HIDE DecisionView buttons · PrimaryAction suppress |
| R7 | Dotknięcie Persist API „przy okazji” | 8 LOCK · allowlist Host wire only |
| R8 | `useTenderOfferRun.ts` WIP | **NIGDY** stage w S5 |

---

## 13. Current vs Target (mapa)

```text
AS-IS:
  /decyzja (overview) → TenderDecisionView
  /przetarg (Hub)     → … → DecisionWorkspaceHost (PRIMARY Expert ON)

TARGET S5 (audit intent):
  Expert ON  + /decyzja (overview) → DecisionWorkspaceHost PRIMARY
                                   → TenderDecisionView FALLBACK/recovery (nie hard delete)
  Expert OFF + /decyzja (overview) → TenderDecisionView PRIMARY (legacy)
  Hub S4 hierarchy                 → KEEP (w tym DW gdy Session)

OUT:
  S6 bridge · S7 TRE · S8 delete DecisionView · store migration · Cloud Persist
```

---

## 14. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy S5 wymaga zmiany store? | **NIE** |
| Czy DecisionView hard delete w S5? | **NIE** |
| Czy S6/S7/S8 w zakresie? | **NIE** |
| Czy istnieje duplikat surface do rozwiązania? | CTA/home drift Hub vs Tab · nie simultaneous DW |
| READY FOR S5 PLAN? | **YES** |
| READY FOR IMPLEMENT? | **NIE** — czekaj Owner GO → PLAN (osobny turn) |

---

## 15. Następny krok (STOP)

```text
STOP PO AUDIT.
Nie twórz PLAN / DF.
Nie implementuj.
Czekaj na jawny OWNER GO → S5 PLAN.
```
