# IK-MIGRATION-01 — P1 AUDIT (Entry Shell)

> **ID:** `IK-MIGRATION-01-P1-AUDIT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — **WYŁĄCZNIE AUDYT**  
> **Mode:** READ-ONLY · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · CODE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p1-audit.json`  
> **P0 lock:** DESIGN FREEZE COMPLETE · IMPLEMENTATION COMPLETE · PV PASS · live tip `07f490e1` · impl `b004b08e`

---

## STATUS (jedna wartość)

```text
ALREADY_IMPLEMENTED
```

Formalny scope P1 (§6 Design Freeze) jest **potwierdzony** i **już dostarczony w kodzie** (host + flaga + EC + VM pipeline facts + testy P1 + P0 Truth).  
**Nie** wybieramy `READY_FOR_PLAN` jako „greenfield implement”.  
Następny sensowny krok Ownera (poza tym audytem): opcjonalny **P1 CLOSEOUT / controlled ON PV** — bez nowego kodu shell — albo Owner GO na **P2+** (już częściowo w hostcie; patrz ryzyka).

---

## 1. P1 FORMAL SCOPE

### Źródła (REUSE — bez zgadywania)

| Dokument | Co mówi o P1 |
|----------|----------------|
| [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §5–§6 §10–§11 | **SSOT granicy P1** · header: **P1 COMPLETE** |
| [`IK-MIGRATION-01-P0-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P0-DESIGN-FREEZE.md) | Po P0 → formalna faza **P1 IK Entry Shell** · osobny Owner GO · **nie** auto |
| [`IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md`](./IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md) | P1 = warstwa faktów pipeline + `sourceRef` · nie research theater |
| [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) | §8: **P1 COMPLETE** (flag OFF) · §9 NEXT nadal wspomina „GO P1” |
| `scripts/test-ik-migration-01-p1-entry.mjs` | Kontrakt testowy Entry Shell |

### Cel P1 (LOCKED §6)

**IN**

- Cienki host w `TenderDetailPage` za `ikEntryEnabled`
- Montaż istniejącego `ExpertConversationSurface`
- VM z faktami **już dostępnymi** z pipeline (discovery / attachments / SWZ / rowCount / BOQ missing)
- Gdy ON: Gate **nie** jest first screen
- Default OFF → NG-10 **identyczny**

**OUT**

- Usuwanie / refactor NG-10
- Labor / material research
- Classification wire
- Chief D ON / Dual Outcome
- Nowy chat store / LLM / parser / F5 / PDF / ATH writer
- `cloud-sync` / payroll

### Reconciliation dokumentów (nie ESCALATION)

| Napięcie | Rozstrzygnięcie |
|----------|-----------------|
| DF/Master: „P1 COMPLETE” vs P0: „NEXT = P1 Owner GO” | P0 §0: COMPLETE dotyczy pracy **pod `ikEntryEnabled` default OFF**. Formalny Owner GO po P0 = akceptacja / closeout fazy, nie greenfield. |
| Master §9 „GO P1” vs §8 COMPLETE | Zgodne z P0: GO = formalny krok procesu, kod shell już jest. |

**Brak CHATGPT_ESCALATION** — scope P1 jest jednoznaczny w §6.

---

## 2. CURRENT STATE (baseline)

| Item | Value |
|------|--------|
| Live UI | **2.66.77** |
| Live tip | **`07f490e1`** |
| P0 impl | **`b004b08e`** (ancestor live) |
| P0 PV | **PASS** |
| `ikEntryEnabled` prod | **OFF** (default) |
| IK ON prod | **NOT_EXERCISED** |
| Physical mobile | **NOT_VERIFIED** |
| P5.26 | LOCKED @ `1d41f619` · 9/9 · Catalog 471 · REVIEW-9 frozen |
| P5.27 / 31 / 32 | LANDED / VERIFIED |
| P5.33 | **DO NOT CREATE** |

---

## 3. P0 REUSE (hard lock)

P1 **nie** zmienia:

- P0 Truth (`IkConversationEvent` · `canPresentAsVerifiedFact` · `enforceIkConversationTruth`)
- `ikEntryEnabled` contract (default OFF · ≠ D)
- Chief / D separation
- NG-10 coexistence
- P5.26–P5.32 locks

P0 dostarczył warstwę Truth na istniejącym shellu P1 — **REUSE**, nie drugi truth system.

---

## 4. EXISTING COMPONENTS

| FILE | PURPOSE | CURRENT STATE | P0 / P1 | REUSABLE | MISSING | RISK |
|------|---------|---------------|---------|----------|---------|------|
| `src/lib/app-settings.ts` | `ikEntryEnabled` + merge cloud | default `false` · Super Admin settings | P1+P0 | YES | per-tender override (OUT P0/P1) | App-wide once ON |
| `src/app/AdminSettingsModal.tsx` | Toggle `data-ik-entry-toggle` | Super Admin ⚙ only (`AdminTopbar`) | P1 | YES | — | UI-only write ACL |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | `isIkEntryEnabled` · first screen resolve | Independent of D | P1 | YES | role gate on read | Any role reaching Detail inherits flag |
| `src/app/TenderDetailPage.tsx` | Seam OFF→Gate / ON→host | `resolveIkDetailFirstScreen` · wrap Gate | P1 | YES | — | TRE-01 vs IK order (DF KEEP) |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | First-screen host → EC | **Beyond thin P1** (P2.5 ingest · labor/material `executeResearch: true` · identity) | P1 shell + **P2–P5 creep** | YES (shell) | Thin-only mode | **P1-HIGH:** research when ON |
| `src/app/expert-conversation/ExpertConversationSurface.tsx` | Conversation UI | 44px · scroll · `data-ik-mobile-ready` | P0 mobile + P1 | YES | physical QA | Physical NOT_VERIFIED |
| `src/lib/intelligent-estimator/ik-entry-conversation.ts` | EC VM builder | Pipeline + experts facts · truth enforce | P1+P0 | YES | — | Heavy VM beyond P1 facts |
| `src/lib/intelligent-estimator/ik-conversation-event.ts` | Truth contract | P0 landed | P0 | YES | — | — |
| `src/lib/intelligent-estimator/ik-entry-pipeline-facts.ts` | Discovery/BOQ facts | Used by VM | P1 | YES | — | — |
| `src/app/tenders/autonomous/TenderAutonomousGate.tsx` | NG-10 first screen | Retained when OFF | NG-10 | YES | — | Coexistence until P10 |
| `useChiefOrchestratorSession` (DetailPage) | Chief | `enabled: expertEffective` (**D**), **not** `ikEntryOn` | D / P4 later | YES | P4 scoped Chief-by-IK | OK for P1 (OUT) |
| `scripts/test-ik-migration-01-p1-entry.mjs` | P1 Gate A/B-ish | 44 PASS | P1 | YES | unauthorized user · live Gate A | Test gap C |
| `scripts/test-ik-migration-01-p0-implementation.mjs` | P0 A–H | 50 PASS | P0 | YES | — | — |

**Nie tworzyć** drugiego DetailPage / EC / truth / permission / Gate.

---

## 5. MISSING COMPONENTS (względem formalnego P1)

Dla **§6 IN** — **brak brakujących komponentów greenfield**.

Residual (proces / QA, nie nowe UI):

| Gap | Typ | Uwaga |
|-----|-----|--------|
| Formalny **P1 CLOSEOUT** + Owner checklist §11 GO P1 | Docs / process | Gate A/B na żywym tenderze z controlled ON |
| Test **C** unauthorized → denied | Test | Brak w macierzy; flaga app-scoped |
| Physical mobile P1 | QA | NOT_AVAILABLE |
| IK ON production path | QA | NOT_EXERCISED (P0 PV) |
| „Thin host only” vs current `IkEntryHost` | Arch | Host już woła research — **poza OUT P1**, ale już w prod kodzie pod flagą OFF |

---

## 6. SECURITY

| Pytanie | Stan |
|---------|------|
| Kto może włączyć `ikEntryEnabled`? | **Super Admin** — ⚙ w `AdminTopbar` (`adminIsSuperAdmin`) |
| Czy UI jest jedyną granicą zapisu flagi? | **Tak** (client `saveAppSettings` → KV) — wzorzec jak inne AppSettings |
| Czy `isIkEntryEnabled()` sprawdza rolę? | **Nie** — czyta settings; po ON każdy z dostępem do `TenderDetailPage` widzi IK |
| Default OFF wymuszony? | **Tak** (`=== true` only; default `false`) |
| Czy moderator/admin mogą wejść do IK bez toggle? | **Nie** (dopóki flag OFF) |
| Luka BLOCKER? | **Nie** przy aktualnym DF (app-level scope LOCKED w P0). Risk: ON = org-wide |

**Brak CHATGPT_ESCALATION** security — zgodne z Design Freeze app-level.

---

## 7. MOBILE

| Check | Status |
|-------|--------|
| First screen / scroll root DetailPage | Istnieje (`mobile-view-scroll` · safe-area) |
| EC `min-h-[44px]` · `touch-manipulation` · `data-ik-mobile-ready` | W kodzie / prod bundle (P0 PV) |
| Horizontal overflow regression | Nie weryfikowane fizycznie |
| **PHYSICAL_MOBILE** | **NOT_AVAILABLE** |

Nie udajemy PASS fizycznego urządzenia.

---

## 8. TRUTH

| Element | Status |
|---------|--------|
| `IkConversationEvent` | P0 — REUSE |
| `canPresentAsVerifiedFact` | P0 — REUSE |
| `enforceIkConversationTruth` | P0 — done bez `sourceRef` → hold |
| `sourceRef` kinds | EC types + P0 allowlist |
| Fabricated evidence | Zakazane (DF + EC contract) |
| Drugi truth layer | **FORBIDDEN** |

P1 nie powinien budować konkurencyjnego systemu — tylko konsumować P0 + pipeline facts (§ EC contract warstwa 1).

---

## 9. NG-10 COEXISTENCE

| `ikEntryEnabled` | First screen |
|------------------|--------------|
| `false` (prod) | `TenderAutonomousGate` wrap — **UNCHANGED** |
| `true` | `detailWorkspace` bez Gate wrap · `IkEntryHost` na tab `przetarg` |

P1–P9: NG-10 **KEEP** (Decommission C).  
P10: REMOVE — **OUT OF SCOPE**.

P1 **nie** może regresować OFF path.

---

## 10. TEST MATRIX

| ID | Intent | EXISTING | MISSING |
|----|--------|----------|---------|
| A | IK OFF → existing flow | P1 entry + P0 A/F | Live Gate A interactive |
| B | IK ON → Entry Shell | P1 entry B · force flag tests | Prod controlled ON |
| C | unauthorized → denied | — | **MISSING** (role/ACL test) |
| D | IK ON ≠ D ON | P1 C · P0 C/G | — |
| E | sourceRef truth | P1 E · P0 D/E | — |
| F | mobile smoke | P0 H (static) | Physical |
| G | NG-10 fallback | P1 F · P0 F | — |

**REUSE** existing P0/P1 scripts. **Nie implementować** nowych testów w tym audycie.

---

## 11. DEPENDENCIES

| Domain | P1 relation |
|--------|-------------|
| Documents / NG-02 | Facts optional in VM; heavy bridge = **P2.5** (already in host) |
| BOQ / OfferBoq | Readiness messaging only in P1 |
| Classification / Identity | **P3** — present in host beyond thin P1 |
| Labor / Material | **P5/P6** — host `executeResearch: true` when ON |
| F5 / Bid | **P7** — OUT |
| Chief | **P4** — DetailPage Chief still on D (`expertEffective`), not IK |
| Evidence / Accept | OUT · no Accept in P1 |
| NG-10 | Coexist · fallback OFF |

P1 = **SHELL**, nie wykonanie P2–P10.

---

## 12. RISKS

| ID | Risk | Sev | Note |
|----|------|-----|------|
| R1 | `IkEntryHost` scope creep (ingest + labor/material research when ON) | **P1-HIGH** | Narusza literę OUT P1; bezpieczne przy OFF; przy ON = HTTP/research |
| R2 | App-wide flag — brak per-user / per-tender | P2 | Zgodne z DF; ON = org-wide |
| R3 | UI-only settings write ACL | P2 | Jak inne Super Admin flags |
| R4 | Physical mobile unverified | P2 | Nie blokuje ALREADY_IMPLEMENTED |
| R5 | IK ON prod never exercised | P2 | Blokuje „P1 PV PASS” nie „shell exists” |
| R6 | Master §8 vs §9 wording | P3 | Rozstrzygnięte P0 DF |
| R7 | NG-10 + IK dual paths until P10 | P2 | By design |
| R8 | TRE-01 / D paths vs IK first screen | P2 | DF: IK replaces Gate wrap only |
| R9 | P5.26 REVIEW-9 reopen via IK ON research | P1-HIGH | Nie uruchamiać research w „P1 work” |
| R10 | Re-implement P1 from scratch | P0 | **FORBIDDEN** — regresja / duplikacja |

Nie naprawiamy ryzyk w audycie.

---

## 13. OUT OF SCOPE (LOCKED)

```text
P2  Documents→BOQ (already marked COMPLETE in DF — do not re-open as P1)
P3  Classification + Identity
P4  Chief scoped-by-IK
P5  Labor E2E
P6  Material E2E
P7  F5/Bid
P8  Risk + decision
P9  Owner verify tender
P10 NG-10 removal
P5.26 REVIEW-9
P5.33
Research / HTTP / Accept / CatalogWork CREATE/BIND
```

---

## 14. IMPLEMENTATION PLAN OUTLINE (nie wykonywać)

**Rekomendacja:** **0 LOC** dla „P1 Entry Shell” — już jest.

Opcjonalna ścieżka Owner (osobne GO):

1. **P1 CLOSEOUT docs** — potwierdzenie §6 vs kod · macierz testów  
2. **Controlled ON** (staging / Super Admin local only) — Gate A/B · **bez** global prod flip bez świadomej decyzji  
3. **Decyzja R1:** (a) zaakceptować host creep jako early P2–P5 under flag OFF, (b) osobny AUDIT „thin host” — **nie** w tym P1  
4. **STOP** → Owner GO na następną formalną fazę (**P2** residual / P3 / …) wg Master

**NIE** planować nowego `IkEntryHost` / drugiego EC.

---

## 15. OWNER DECISIONS

1. **Accept `ALREADY_IMPLEMENTED`?** — czy formalny P1 uważamy za dostarczony bez nowego kodu?  
2. **Czy wymagać P1 CLOSEOUT + controlled ON PV** przed jakimkolwiek P2+ GO?  
3. **R1 host creep:** ACCEPT as-is (flag OFF) vs osobny thin-host AUDIT (nie P1 re-implement)?  
4. **Security app-scoped ON:** ACCEPT (DF) vs przyszły per-tender (DF amend)?  
5. **Physical mobile:** wymagane przed P1 closeout, czy backlog?  
6. **Następny formalny etap po P1:** który (P2 residual / P3 / …) — tylko Owner GO  

---

## EXECUTION COUNTERS

| | |
|--|--:|
| RESEARCH / HTTP / ACCEPT / CREATE / BIND / WRITE | **0** |
| CODE / EDGE | **0** |
| COMMIT / PUSH | **0** |

---

## FINAL

```text
P1 AUDIT = COMPLETE
P1 STATUS = ALREADY_IMPLEMENTED

P1 AUDIT COMPLETE
Shell P1 (§6) = already in production code under ikEntryEnabled OFF
READY FOR OWNER DECISION — not auto PLAN/IMPLEMENT

STOP — no P1 implement · no research · no Accept · no commit · no push
```
