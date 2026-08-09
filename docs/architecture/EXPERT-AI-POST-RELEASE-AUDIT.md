# EXPERT AI / INTELLIGENT ESTIMATOR — POST-RELEASE AUDIT (AS-IS)

> **STATUS:** **AUDIT COMPLETE** · **P0 DUAL-ENABLEMENT CLOSED** (see tip **`1902daa7`**) · AS-IS history retained  
> **ID:** EXPERT-AI-POST-RELEASE-AUDIT  
> **Date:** 2026-08-09  
> **Production tip:** UI **2.66.22** · commit **`1902daa`** · feature P0 **`1902daa7`** · prior Q12 **`4ba06032`** · prior docs **`f5f598c5`**  
> **Closed priors:** TM-01 S0–S9 · EXPERT-AI-PRODUCTION-ENABLEMENT-01 · Q12 FIX · **EXPERT-AI-P0-DUAL-ENABLEMENT**  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · P0 [`EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md) · Enablement [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
POST-RELEASE AUDIT — AS-IS

TWO PARALLEL ENGINES (do not conflate):

A) AI Cost / OfferBoq („Kosztorys ofertowy / AI Kosztorysant”)
   = przedmiar → mapowanie → dekompozycja → wycena pozycji → Bid
   = niezależny od Expert AI Decydent gate

B) Expert AI · Przebieg i Decydent
   = OfferBoq RO → Chief EE→ME→PE→Cost→Offer → Dossier
     → Validation → Decision Workspace → Persist → legacy GO/HOLD/NO-GO
   = master gate expertAiDecydentEnabled (default OFF)

PRODUCTION CAPABILITY = częściowa
  realna logika Expert chain + AI Cost EXISTS
  default OFF · dual „Expert ON” semantics · local Persist only
════════════════════════════════════════════════════════
```

---

## 0. Scope & method

| | |
|--|--|
| **In** | Kod + docs tip production — przepływ Przetarg → OfferBoq → AI Cost / scoring → Expert/Chief → Dossier → Validation → DW → Persist → Strategy |
| **Out** | PLAN · DF · nowy epic · zmiany kodu · WIP `useTenderOfferRun` · `bid-time-load-guard` · S2 DetailPage · Persist/Strategy/Expert BC edits |
| **Evidence** | `chief-orchestrator/run.ts` · `useChiefOrchestratorSession` · `*-expert` · `decision-workspace` · `decision-persist` · `tender-offer-boq*` · Enablement CLOSEOUT · changelog „AI Kosztorysant” |

---

## 1. Co użytkownik może wykonać end-to-end? (AS-IS)

### 1.1 Ścieżka A — AI Cost / OfferBoq (moduł Przetargi widoczny)

1. Otwórz przetarg z przedmiarem / kosztorysem (snapshot).  
2. Tab **Kosztorys** → panel **„Kosztorys ofertowy (AI Cost)”**.  
3. System buduje / odświeża `OfferBoqDocument`: mapowanie do Biblioteki Robót, klasyfikacja, dekompozycja M/R/S…, pricing komponentów, opcjonalnie wiedza firmy.  
4. Przekazanie kosztu bezpośredniego do **Bid Proposal** (Kp / marża / cena rekomendowana) przez adapter.  
5. Strategia / TRE / Hub scoring działają jako **osobny** lejek decyzyjny (legacy GO/HOLD/NO-GO), nie jako Chief Experts.

**Gate:** widoczność modułu Przetargi (staff gate / Super Admin) — **nie** wymaga `expertAiDecydentEnabled`.

### 1.2 Ścieżka B — Expert AI · Przebieg i Decydent (Enablement ON)

1. Super Admin → ⚙ Moduły → **Expert AI · Przebieg i Decydent = ON**.  
2. Przetarg z **OfferBoq gotowym** + `pricingReadyPartial ∨ pricingReadyFinal`.  
3. Session auto-start → `assembleChiefWireRuntimeRo` → `runChiefOrchestrator`.  
4. UI: **Przebieg ekspertów** (dossier RO) + Expert Workspace RO + Decision Workspace.  
5. Decydent: **Zatwierdź / Odrzuć / Do przeglądu / Wróć**.  
6. Persist lokalny (`kw-decision-persist-v1`) → mostek S6 → `setOwnerDecision` (GO / NO-GO / HOLD).  
7. Po reload: hydrate po `tenderId ∧ caseId ∧ dossierFinishedAt` (Q12 verified).

**Gdy Enablement OFF (default):** ścieżka B **nie uruchamia** Chief run / DW session — AI Cost (A) nadal dostępny.

---

## 2. Którzy Experci faktycznie wykonują pracę?

Źródło: `src/lib/chief-orchestrator/run.ts` — **realne wywołania API**, nie shell.

| Task | Expert | Funkcja | Warunek |
|------|--------|---------|---------|
| T1 | **Execution** | `analyzeExecutionFromOfferBoq` | gate G-EE |
| T2 | **Material** | `analyzeMaterialsFromExecution` | gate G-ME |
| T3 | **Pricing** | `analyzeMarketPricingFromMaterials` | może ustawić LOOP |
| T2r/T3r | ME + PE | ponownie | max **N=1** LOOP PE→ME |
| T4 | **Cost** | `analyzeRealCostFromExperts` | gate G-Cost |
| T5 | **Offer** | `analyzeOfferFromCost` | gate G-Offer |
| T6 | Chief | `assembleDecydentDossier` | status `ready_for_decydent` lub wcześniejszy `blocked` |

**Validation Expert** (`analyzeValidationFromDossier`) — **poza** pętlą Chief; wywoływany w Decision Workspace (cache ≤1× na `caseId|finishedAt`).

**Nie są Expertami Chief:** AI Cost Intelligence, Bid Proposal, TRE-01, Strategy scoring — osobne silniki.

---

## 3. Jakie dane wejściowe są wymagane?

### 3.1 AI Cost / OfferBoq

| Wejście | Rola |
|---------|------|
| Snapshot kosztorysu / przedmiaru na item | SSOT linii |
| Biblioteka Robót / katalog | mapowanie `catalogWorkId` |
| (opcjonalnie) wiedza firmy / edycje komponentów | korekty cen |

### 3.2 Chief / Expert AI

| Wejście | Skąd | Gate |
|---------|------|------|
| `OfferBoqDocument` (linie) | `assembleChiefWireRuntimeRo` → `buildOfferBoqDocumentForPipelineItem` | `readyForChiefInput` |
| Catalog / worksById | `kw-wgdom-work-catalog` RO | brak → not ready |
| Company cost RO | profil firmy | brak → not ready |
| Offer strategy params | default / RO | opcjonalne |
| `pricingReadyPartial` ∨ `pricingReadyFinal` | pipeline UI/hooks | inaczej `pricing_not_ready` |
| `expertAiDecydentEnabled === true` (+ LS precedence) | AppSettings | inaczej Session nie startuje |

---

## 4. Co daje „inteligentny kosztorysant” (AI Cost)?

**AS-IS nazwa produkcyjna UI:** „Kosztorys ofertowy **(AI Cost)**” (`OfferBoqCostIntelligencePanel`).  
**Nazwa historyczna w changelog:** „**AI Kosztorysant**”.

| Warstwa | Co robi (real) | Czego nie robi |
|---------|----------------|----------------|
| Build OfferBoq | LP / opis / ilość / jm ze snapshotu | LLM chat |
| Mapping | dopasowanie do Biblioteki Robót + pewność | Chief Experts |
| Cost Intelligence | klasyfikacja typu, strategia wyceny, **„inteligentna dekompozycja” bez cen** (heurystyki pure-lib) | „rozumienie” SWZ jak LLM |
| Pricing engine | komponenty M/R/S + źródła + pewność → koszt bezpośredni | marża/oferta (to Bid / Offer Expert) |
| Bid adapter | handoff kosztu → Bid Proposal | decyzja Decydenta |

**Wniosek:** to **deterministyczny / heurystyczny pipeline kosztorysowy**, nie osobny model językowy. Nazwa „AI / inteligentny” = branding produktu + reguły, **nie** gwarancja LLM.

---

## 5. Co daje każdy Expert?

| Expert | Wkład biznesowy (AS-IS) |
|--------|-------------------------|
| **Execution** | Interpretacja OfferBoq → pakiet / plan / zgodność wykonawcza (Trace EE) |
| **Material** | BOM / warianty materiałów z EE; cel LOOP z PE |
| **Pricing** | Rynek / świeżość / coverage z katalogu; flaga `returnToMaterialExpert` |
| **Cost** | Real cost (M+R+S+aux+OH) → `offerHandoffPayload` dla Offer |
| **Offer** | Oferta = Real + marża + ryzyko → `offerPricePln` + sygnał do Decydenta |
| **Validation** | QA C1–C8 + Q1–Q6 na dossier; verdict `validated` / `needs_review` / `blocked` — **doradcze**, nie SSOT decyzji człowieka |

---

## 6. Co trafia do Dossier?

`ChiefDecydentDossier` (po T6 lub na `blocked`):

| Blok | Zawartość |
|------|-----------|
| Identity | `caseId`, `status`, `createdAt`, `finishedAt` (= `stableCaseStamp` gdy Session Q12), `loopCount`, `tasks[]` |
| Traces | `execution` · `materials` · `pricing` · `cost` · `offer` |
| Experts snapshots | pełne wyniki EE/ME/PE/Cost/Offer |
| Handoff | `offerHandoffPayload`, `decisionMakerPayload`, `primaryRecommendation`, `scenarios[]` |
| Notes | `orchestrationNotesPl`, `handoffBlockersPl`, `returnFlags` |

Dossier jest **in-memory Session** (nie osobny cloud KV Expert). Persist decyzji człowieka = osobny store.

---

## 7. Co trafia do Validation?

| IN | `ChiefDecydentDossier` only |
| OUT | findings Hard/Soft · report · `verdict` |
| Reguły | Consistency C1–C8 · QA Q1–Q6 · soft limit 3 |
| Wire | `resolveValidationForDossier` — cache klucz `caseId\|finishedAt` |

Validation **nie** zapisuje decyzji i **nie** jest krokiem Chief. UI: panel Findings / Validation przed Akcjami Decydenta.

---

## 8. Co dokładnie robi Decydent?

UI: **Akcje Decydenta** (`DecisionActionsBar`).

| Akcja | Persist | Legacy projection (S6) | UI |
|-------|---------|------------------------|-----|
| **Zatwierdź** (`approve`) | `recordDecision` | → **GO** | chip decyzji |
| **Odrzuć** (`reject`) | tak | → **NO-GO** | |
| **Do przeglądu** (`needs_review`) | tak | → **HOLD** | Q12 PV PASS |
| **Wróć** (`return`) | nie (scroll / clear local chip path) | brak mapy | |

Kolejność Host (LOCKED): **Persist first** → dopiero `setOwnerDecision`. Persist FAIL ⇒ brak zapisu lejka. Brak `scoringBundle` ⇒ Persist OK, mirror SKIP.

Hydrate: `hydrateDecision(tenderId, caseId, dossierFinishedAt)` — exact triple (bez rozluźnienia).

---

## 9. Jak decyzja wpływa na dalszy lejek?

```text
recordDecision → kw-decision-persist-v1 (append-only, local)
       ↓ (S6 bridge)
mapPersistActionToLegacyOwnerDecision
       ↓
setOwnerDecision(scoringBundle, GO|HOLD|NO-GO)
       ↓
kw-tender-decisions / Strategy · Hub · portfolio cues
```

| Decydent | Legacy lejek |
|----------|--------------|
| approve | GO |
| reject | NO-GO |
| needs_review | HOLD |
| return | brak mapowania |

**Osobno:** TRE / Hub „rekomendacja systemu” ≠ decyzja Decydenta (nota UI TRE-01).

---

## 10. Co działa tylko przy Expert AI ON?

`expertAiDecydentEnabled === true` (po precedence LS):

| Element | ON |
|---------|-----|
| `isChiefOrchestratorSessionEnabled` → realny `engine.start` / `runChiefOrchestrator` | TAK |
| Dossier z wynikami Expertów (nie idle) | TAK (gdy BOQ+pricing ready) |
| Decision Workspace z session + Persist Decydenta | TAK |
| Coupling Decision ⇒ Session | Decision nie włączy się bez Session |

**Uwaga dual-gate:** helper `isChiefSessionStackEnabled(expertEffective)` / `isTenderExpertEffective` (moduł Przetargi / Super Admin) może **pokazać** sekcje Eksperci / cue PRIMARY nawet gdy Enablement OFF — ale **wewnętrzny** hook Session wymaga Enablement, więc run jest martwy.

---

## 11. Co nadal działa w legacy / Expert OFF?

| Element | OFF (Enablement default) |
|---------|---------------------------|
| Lista / detal przetargu, Dokumenty, Kosztorys AI Cost | TAK |
| Bid Proposal / adapter z AI Cost | TAK |
| Strategy owner decisions (legacy UI gdy module Expert OFF) | TAK |
| TRE Outcome-first (gdy LS TRE ON i Expert-effective OFF) | możliwe (S7) |
| Offer PLN authority po **module** Expert-effective (nie Enablement) | Bid vs Offer policy nadal wg S3 |
| Persist Decydenta / Chief run | NIE |

---

## 12. Realne ograniczenia produkcyjne

| Ograniczenie | Evidence |
|--------------|----------|
| Enablement **default OFF** | `app-settings.ts` |
| Wymaga gotowego OfferBoq + pricingReady* | Session engine |
| Chief `blocked` → Approve path ograniczony | DW `process_blocked` |
| Persist **tylko localStorage** (brak cloud / Audit Hub) | Enablement CLOSEOUT residual |
| Content invalidation (zmiana BOQ → nowy case) **NOT TESTED** na prod | Q12 PV |
| Experts **nie zapisują** OfferBoq | kontrakt P0 |
| LOOP PE→ME max 1 | `DF_MAX_RETURN_LOOPS` |
| S2 harness 44/45 pre-existing OUT | DetailPage raw flag |
| `useTenderOfferRun` protected WIP OUT | CLOSEOUT |

---

## 13. UI/shell vs realna logika

| Element | Real logic | Shell / presentation |
|---------|------------|----------------------|
| `runChiefOrchestrator` + `*-expert/analyze*` | **TAK** | — |
| `applyOfferBoqCostIntelligence` / pricing / mapping | **TAK** (heurystyki) | panel RO/edycja |
| Validation `analyzeValidationFromDossier` | **TAK** | Findings UI |
| `recordDecision` / hydrate / S6 bridge | **TAK** | toast / chip |
| Expert Workspace / Przebieg | passthrough dossier | RO chrome |
| Hub „PRIMARY Decision Workspace” cue | — | może świecić przy module ON bez Enablement |
| Idle Eksperci bez Enablement | — | możliwy pusty / no_case shell |
| TRE recommendation | Bid VM | nie = Decydent |

---

## 14. Dead paths / misleading UX

| Objaw | AS-IS |
|-------|-------|
| Cue / sekcja Eksperci przy Enablement OFF | Stack helper ON (module) · Session run OFF → **misleading shell** |
| „PRIMARY decyzja: DW” bez działającego Host session | Dual semantics „Expert ON” |
| Changelog „AI Kosztorysant” vs UI „AI Cost” | dryf nazewnictwa |
| TRE „rekomendacja” obok Akcji Decydenta | dwa poziomy decyzji (system vs człowiek) — opisane, ale łatwo pomylić |
| `EXPERT-AI-ARCHITECTURE.md` częściowo **stale** (S4–S8 OPEN / brak Enablement) | docs lag vs tip `f5f598c5` |
| S2 tip FAIL DetailPage | pre-existing; nie blokuje Q12 PV |

---

## 15. Czy „inteligentny kosztorysant” obiecuje więcej niż system robi?

**TAK — częściowo (P2 branding / expectation gap).**

| Obietnica (język produktowy) | Faktyczny mechanizm |
|------------------------------|---------------------|
| „AI / inteligentny” | Reguły + katalog + dekompozycja heurystyczna + pricing engine — **bez** LLM w tym torze |
| „Kosztorysant” jako decydent oferty | Buduje **koszt bezpośredni / OfferBoq**; marża/oferta/decyzja = Bid + (opcjonalnie) Offer Expert + człowiek |
| Jednolity „Expert AI” | Użytkownik może mylić **AI Cost (A)** z **Expert Decydent (B)** — to **dwa** systemy |

Nie twierdzimy, że AI Cost jest „fake” — logika jest realna i produkcyjna. Twierdzimy, że **marketingowa nazwa „AI / inteligentny” zawyża oczekiwanie względem LLM / autonomicznego decydenta**.

---

## 16. Answers matrix (Q1–Q15 short)

| # | Short answer |
|---|--------------|
| 1 | E2E: AI Cost→Bid zawsze (moduł); Expert→DW→Persist→GO/HOLD/NO-GO gdy Enablement ON + readiness |
| 2 | EE, ME, PE, Cost, Offer (+ Validation w DW); nie: AI Cost / TRE / Strategy |
| 3 | Przedmiar/OfferBoq, katalog, company RO, pricingReady*, Enablement ON dla B |
| 4 | Mapowanie, klasyfikacja, dekompozycja, wycena pozycji → Bid |
| 5 | Patrz §5 |
| 6 | Traces + snapshots + handoff + case identity |
| 7 | Findings + verdict QA na dossier |
| 8 | approve/reject/needs_review/return + Persist + S6 |
| 9 | GO/HOLD/NO-GO w `kw-tender-decisions` / Strategy |
| 10 | Chief run, dossier live, DW Persist Decydenta |
| 11 | AI Cost, Bid, legacy Strategy, TRE wg S7 |
| 12 | Default OFF, local Persist, readiness, blocked, untested invalidation |
| 13 | Experts/Chief/AI Cost/Persist = real; część Hub cues = shell |
| 14 | Dual Expert ON · naming · stale arch docs · TRE vs Decydent |
| 15 | Tak — „AI Kosztorysant” > LLM; myli się z Expert Decydent |

---

## VERDICT

```text
PRODUCTION CAPABILITY = częściowa

· AI Cost / OfferBoq: realna logika produkcyjna (nie shell-only)
· Expert chain EE→ME→PE→Cost→Offer + Validation + DW + Persist + S6: realna logika
· Domyślnie WYŁĄCZONE (expertAiDecydentEnabled=false)
· Część UX Hub/Eksperci może wyglądać „ON” bez Enablement (shell)
· Brak cloud Persist; content invalidation NOT TESTED
· „Inteligentny kosztorysant” ≠ LLM Decydent
```

---

## REAL GAPS

| Pri | Gap | Uwagi |
|-----|-----|-------|
| **P0** | Dual semantics „Expert ON” (module Expert-effective vs `expertAiDecydentEnabled`) → możliwe shell Eksperci / PRIMARY cue bez Chief run | UX / zaufanie |
| **P0** | Offer PLN authority klucznikowane na **module** Expert, nie Enablement — polityka S3 może dawać Offer-primary / NO PRIMARY niezależnie od Decydent gate | spójność cen |
| **P1** | Content invalidation live **NOT TESTED** | Q12 residual |
| **P1** | Cloud Persist / Audit Hub absent | residual Enablement |
| **P1** | Stale `EXPERT-AI-ARCHITECTURE.md` vs tip | docs drift |
| **P2** | Naming: AI Kosztorysant (changelog) vs AI Cost (UI) vs Expert AI Decydent | expectation gap |
| **P2** | TRE / Bid vs Offer Expert dual engines — intentional, ale obciąża UX | TM-01 residual |

**NONE** nie dotyczy — istnieją realne luki produktowe/UX, ale **nie** jako regresja Q12 (Q12 PV PASS).

---

## STOP

```text
AUDIT ONLY COMPLETE
NO PLAN · NO DF · NO IMPLEMENT · NO COMMIT implied

NEXT = tylko OWNER GO (jeśli Owner chce PLAN / cleanup UX / docs sync)
```
