# IK-MIGRATION-01 — DESIGN FREEZE (P0)

> **ID:** `IK-MIGRATION-01-DESIGN-FREEZE`  
> **STATUS:** **P0 FROZEN** · **P1 COMPLETE** (flag default OFF · NG-10 retained)  
> **Data:** 2026-08-15  
> **Master IK:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Audit:** IK-REAL-TENDER-AUDIT-01 (chat 2026-08-15)  
> **Plan:** IK-MIGRATION-01 PLAN (chat 2026-08-15)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
CONTROLLED REPLACEMENT — NOT BIG BANG
NG-10 = OLD first-screen (decommission after parity)
IK    = NEW first-screen + orchestration over EXISTING WGDOM
DONE  = runtime evidence + regression + Owner verify
         ≠ build / TS / pretty UI / fake events
════════════════════════════════════════════════════════
```

Pakiet P0 (ten zestaw — nie duplikować):

| Dokument | Rola |
|----------|------|
| **TEN PLIK** | AD + fazy + flag + P1 boundary + rollback + Owner GO |
| [`IK-MIGRATION-01-NG10-DECOMMISSION-MAP.md`](./IK-MIGRATION-01-NG10-DECOMMISSION-MAP.md) | A/B/C/D NG-10 |
| [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md) | Gate A + Gate B per faza |
| [`IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT.md`](./IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT.md) | przedmiar = input, nie opcjonalny UX HOLD |
| [`IK-MIGRATION-01-MULTI-BOQ-ADDRESS-MODEL.md`](./IK-MIGRATION-01-MULTI-BOQ-ADDRESS-MODEL.md) | N przedmiarów × N adresów × branże · SUM |
| [`IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md`](./IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md) | FACT → sourceRef |

---

## 0. Werdykt

| Decyzja | Stan |
|---------|------|
| NG-10 jako docelowy IK | **FORBIDDEN** |
| Big-bang rewrite / nowy TenderModule | **FORBIDDEN** |
| Controlled replacement | **LOCKED** |
| P1–P10 IMPLEMENT w tym commicie | **FORBIDDEN** (P0 = docs) |
| Global `expertAiDecydentEnabled` = IK ON | **FORBIDDEN** (sprzęga Dual Outcome) |
| Flaga wejścia IK | **`ikEntryEnabled`** · AppSettings · default **false** · Super Admin |
| Usuwanie NG-10 | dopiero **P10** po P9 PASS + Owner GO REMOVE |

---

## 1. AD (LOCKED)

**AD-IK-M01** — NG-10 first-screen zastępowany IK Entry Host + `ExpertConversationSurface`.  
**AD-IK-M02** — REUSE: TendersModule, NG-02 ingest/pipeline, OfferBoq, MULTI-DWELLING, MULTI-BOQ, F5, Work Catalog, Evidence, Accept, Price Memory, DIY, Chief, EC Surface, Bid PDF.  
**AD-IK-M03** — `ikEntryEnabled` ≠ D (`expertAiDecydentEnabled`). Chief dla IK startuje **scoped** gdy IK-entry ON; Dual Outcome / Offer PLN authority **bez zmian**.  
**AD-IK-M04** — Parity (Gate A + Gate B) przed REMOVE NG-10.  
**AD-IK-M05** — Conversation = fakty runtime (`sourceRef`). Zakaz aliasów NG-10 (`Bid.ok` ≠ research done).  
**AD-IK-M06** — Document Expert jest **pierwszym** zadaniem. „Ocena opłacalności” nie jest first task.  
**AD-IK-M07** — Przedmiar/przedmiary = **wymagany input kosztorysowania**. HOLD tylko przy realnym problemie danych/techniki, z PARTIAL/GAP — nigdy „gotowe” bez extraction.  
**AD-IK-M08** — 1 tender → N dokumentów → N przedmiarów → N dwellings/adresów → N branż. **Lineage obowiązkowy.** Spłaszczenie bez provenance = FORBIDDEN.  
**AD-IK-M09** — `SUM(adresów) = TOTAL przetargu` (PackageGate / `aggregatePackageDirect`). Deterministycznie z linii.  
**AD-IK-M10** — ATH **write** (plik NORMA) **nie istnieje** w kodzie. P0–P10 **nie** inventuje ATH writer. Parse/preview/PDF-from-ATH = REUSE. Round-trip Norma = otwarcie **źródłowego** `.ath` + osobny Owner GO na export ATH.

---

## 2. Docelowy flow (biznes)

```text
TENDER
  → DOCUMENT DISCOVERY          (NG-02 / INGEST-01 REUSE)
  → COST DOCUMENT IDENTIFICATION
  → PRZEDMIAR / PRZEDMIARY
  → EXTRACT + VALIDATE + NORMALIZE
  → MASTER BOQ (OfferBoq v5 + lineage / Multi-BOQ compose)
  → CLASSIFICATION GATE (przed research)
  → LABOR EXPERT  (Catalog CURRENT | research → Evidence → Accept → OUR RATE)
  → MATERIAL EXPERT (PM CURRENT | DIY LM/Casto/OBI → Accept → PM → SELL)
  → POSITION COST (F5) → BID
  → RISK (intelligence overlay / Validation — REUSE)
  → CHIEF DECISION
  → EXPERT CONVERSATION (fakty)
  → UI + PDF bid package (REUSE) + ATH preview (REUSE, nie nowy writer)
```

---

## 3. Jak `/przetarg` przechodzi NG-10 → IK

**Dziś (AUDIT-01):**

```text
TenderDetailPage
  → TenderAutonomousGate          ★ first screen
       RunScreen / Outcome
  → children: Hub / tabs / Kosztorys / EC (EC tylko gdy D=ON)
```

**Target (po P10):**

```text
TenderDetailPage
  → IkEntryHost                   ★ first screen (ikEntryEnabled)
       ExpertConversationSurface
       Document Expert facts → … → Bid facts
  → Hub / tabs V4 KEEP
```

**Migracja (P1–P9):**

| `ikEntryEnabled` | First screen |
|------------------|--------------|
| `false` (default prod) | NG-10 Gate **UNCHANGED** |
| `true` (Owner opt-in) | IK host; Gate **nie** blokuje workspace |

TRE-01 Outcome (`showTre01Outcome`) **KEEP** jako osobna ścieżka S7 — DF: gdy IK-entry ON, **nie** early-return TRE zamiast IK host. Kolejność w DetailPage: TRE recovery CTA KEEP; IK host zastępuje **tylko** Gate wrap.

---

## 4. Flaga (LOCKED)

| Pole | Wartość |
|------|---------|
| Nazwa | `ikEntryEnabled` |
| Storage | `AppSettings` / `kw-app-settings` (jak inne flagi Super Admin) |
| Default | **`false`** |
| UI toggle | Super Admin ⚙ — **nie implementować w P0** |
| LS kill (opcjonalnie później) | tylko jeśli DF P1 tego wymaga; nie nowy system flag |
| **NIE** | `expertAiDecydentEnabled`, `kw-chief-orchestrator-session` jako IK ON |

Chief session przy IK-entry: P4 DF implementacyjny — `useChiefOrchestratorSession({ enabled: ikEntryEnabled && item })` **bez** zmiany `isExpertAiRuntimeEffective()`. Dual Outcome zostaje na D.

---

## 5. Fazy (skorygowane vs kod)

| Faza | Zakres | NG-10 |
|------|--------|-------|
| **P0** | Ten freeze | C KEEP |
| **P1** | IK entry shell + EC z faktami pipeline (discovery/parse) | C KEEP default |
| **P2** | Document Expert: discovery → przedmiary → extraction truth | C |
| **P3** | Classification + identity na liniach | C |
| **P4** | Chief scoped start (T1–T6) bez Dual Outcome | C |
| **P5** | Labor E2E auto (REUSE W2 bridge) | C |
| **P6** | Material E2E (REUSE Phase2 + `IkMaterialGapJob`) | C |
| **P7** | Bind F5/Bid/SUM do EC (nie nowy engine) | C |
| **P8** | Risk + decision (overlay/Validation/DW) | Outcome NG-10 → B |
| **P9** | Owner verify `08def45d-ead6-5db8-962b-120001d33d37` | C |
| **P10** | REMOVE Gate/Run/timeline/agents | A |

Każda faza: Gate A + Gate B — [`E2E-TRUTH-GATES`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md).

---

## 6. P1 implementation boundary (LOCKED)

**IN P1**

- Cienki host w `TenderDetailPage` za `ikEntryEnabled`
- Montaż **istniejącego** `ExpertConversationSurface`
- VM: fakty **już dostępne** z pipeline (discovery settled, attachment count, SWZ present/absent, dossier rowCount / OfferBoq null)
- Brak Gate jako first screen gdy flaga ON
- Flaga default OFF → NG-10 identyczny

**OUT P1**

- Usuwanie / refactor NG-10 libs
- Labor/material research
- Classification wire
- Chief D ON / Dual Outcome
- Nowy chat store / LLM
- Nowy parser / F5 / PDF / ATH writer
- Zmiana `cloud-sync` / payroll
- PDF/ATH export UI

---

## 7. Odpowiedzi 1–28 (indeks)

| # | Pytanie | Odpowiedź (skrót) | Doc |
|---|---------|-------------------|-----|
| 1 | NG-10 → IK | flaga `ikEntryEnabled`; P1 host; P10 REMOVE | §3 |
| 2 | Co usuwamy | Gate/Run/FAQ/phase/timeline/ux agents — **P10** | Decommission A |
| 3 | Co zostaje tymczasowo | cały NG-10 runtime P1–P9 | Decommission C |
| 4 | Dowód że strona nie pęka | Gate A: routing + NG-10 OFF path + Hub/F5 | Truth Gates |
| 5 | Dokumenty | NG-02 + INGEST-01 + resolver | BOQ Discovery |
| 6 | Przedmiar | `classifyCostDocument` / cost discovery / parse | BOQ Discovery |
| 7 | PDF/XLS/ATH/DOC | `FILE_TYPE_SUPPORT` + parsers listed | BOQ Discovery |
| 8 | Lineage | MULTI-BOQ `lineProvenance` + lineId with source | Address model |
| 9 | Wiele przedmiarów | `composeDwellingOfferBoq` | Address model |
| 10 | Wiele mieszkań | MULTI-DWELLING package + Owner `documentToDwelling` | Address model |
| 11 | Branże | `branchHint` / COST-MULTI ≠ dwelling | Address model |
| 12 | Master BOQ | OfferBoq v5 compose / `legacy_single` KEEP | Address model |
| 13 | Labor Expert start | po BOQ READY + Gate LABOR + identity OK | Data Flow + Truth |
| 14 | Material Expert start | po BOQ READY + Gate MATERIAL / mat.* | Data Flow + Truth |
| 15 | CURRENT → REUSE | catalog / PM lookup 0 HTTP | Master SSOT |
| 16 | MISS → RESEARCH | selective labor / Phase2 DIY | Reuse Map |
| 17 | Persist | Accept only (OUR RATE / PM) | Master SSOT |
| 18 | Position Cost | F5 shadow + cutover | F5 libs |
| 19 | Cena przetargu | Bid / PackageDirect SUM | Address model |
| 20 | Podział adresów | F5_D per dwelling | Address model |
| 21 | SUM = TOTAL | PackageGate + aggregate; mismatch = NO-GO | Address model |
| 22 | PDF | `exportTenderBidPackagePdf` + `ath-kosztorys-pdf` (preview) | §8 |
| 23 | ATH generate | **NIE ISTNIEJE writer** — GAP, nie P1–P8 | AD-IK-M10 |
| 24 | ATH reopen WGDOM | `ath-parser` + `tender-ath-quick-access` | §8 |
| 25 | Norma | otwórz **źródłowy** `.ath`; export ATH = przyszły Owner GO | AD-IK-M10 |
| 26 | EC prawda | `sourceRef` contract | EC contract |
| 27 | Rollback | flaga OFF → NG-10; P10 git revert | §9 |
| 28 | Owner GO P1 | checklist §11 | §11 |

---

## 8. PDF / ATH (REUSE, nie rebuild)

| Capability | Path | IK |
|------------|------|-----|
| Bid / oferta PDF | `src/lib/tender-bid-package-pdf.ts` · `exportTenderBidPackagePdf` · UI `TenderDetailPanel` | REUSE po Bid ≠ null (P7b) |
| ATH → PDF preview | `src/lib/ath-kosztorys-pdf.ts` | REUSE prezentacja |
| ATH parse | `src/lib/ath-parser.ts` `parseKosztorysBytes` | REUSE input |
| ATH UI | `src/lib/tender-ath-quick-access.ts` | REUSE |
| ATH jako Bid PLN | C-MODE-1a **FORBIDDEN** | KEEP |
| **ATH file writer** | **brak w repo** | **NIE invent** bez AUDIT+Owner GO |

---

## 9. Rollback

| Stan | Akcja |
|------|--------|
| P1–P9, flaga OFF | brak zmiany dla użytkowników |
| Flaga ON, regresja | `ikEntryEnabled=false` → Gate wraca |
| P5/P6 zły research | wyłączyć auto-orchestrate; Accept już zapisany = catalog history |
| P10 po REMOVE | revert commita P10 |

Payroll / `cloud-sync`: **poza zakresem** — rollback IK ich nie dotyka.

---

## 10. P1 acceptance tests (kontrakt — nie kod)

Gate A:

- `ikEntryEnabled=false` → `[data-tender-autonomous-run]` nadal first screen
- `/przetarg` route, Hub, Kosztorys tab, F5 gdy OfferBoq istnieje — bez regresji
- Dual Outcome / D — **nie** zmienione
- mobile: brak poziomego overflow na nowym hoście (gdy ON)

Gate B (P1 jest **cienki** — nie pełny E2E costing):

- gdy ON: **brak** 12-kroków NG-10 jako źródła semantyki
- EC widoczny; komunikaty mają `sourceRef` do pipeline (count docs / SWZ / rowCount / BOQ missing)
- **nie** komunikuje „wyliczono materiały/robociznę” bez F5 evidence
- gdy BOQ=0: Document Expert **PARTIAL/HOLD**, nie Bid hero

P1 **nie** wymaga Labor/Material research PASS (to P5/P6).

---

## 11. OWNER GO CHECKLIST

### GO P0 (ten dokument)

- [ ] AD-IK-M01–M10 zaakceptowane
- [ ] `ikEntryEnabled` ≠ D
- [ ] Decommission map A/B/C/D OK
- [ ] Truth Gates A+B OK
- [ ] BOQ nieopcjonalny + HOLD tylko techniczny
- [ ] Multi-adres SUM locked
- [ ] ATH writer = GAP (nie rebuild w P1)
- [ ] P1 IN/OUT locked

### GO P1 (później — IMPLEMENT)

- [ ] P0 GO podpisane
- [ ] Tylko pliki DetailPage host + VM EC + flaga settings
- [ ] Explicit `git add` (nie `-A`)
- [ ] Gate A PASS na `08def45d` **i** tenderze z istniejącym OfferBoq
- [ ] Gate B P1 PASS (fakty, nie theater)
- [ ] Default flaga OFF na prod po deploy

### NIE GO

Global D=ON · nowy TenderModule · usuwanie NG-10 · auto-Accept · `pkt≡mb` · ATH writer · `git add -A` · `vercel deploy`

---

## 12. STOP

P0 = dokumentacja. **Następny kod:** tylko po Owner GO P1, w granicach §6.

**STOP — ZERO APP CODE.**
