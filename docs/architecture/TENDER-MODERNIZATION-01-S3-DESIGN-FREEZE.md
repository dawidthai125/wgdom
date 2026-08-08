# DESIGN FREEZE — TENDER-MODERNIZATION-01 / S3 (Align Pricing)

> **STATUS:** **DESIGN FREEZE COMPLETE** · **READY FOR IMPLEMENT**  
> **ID:** TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S3 — Align Pricing**  
> **TRYB:** DESIGN FREEZE (LOCKED) · IMPLEMENT tylko po Owner GO  
> **Data:** 2026-08-08  
> **Język:** polski  
> **Baseline tip:** UI **2.66.22** / **`1888d05f`** · S0/S1/S2 CLOSED  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §5  
> **PLAN:** [`TENDER-MODERNIZATION-01-S3-PLAN.md`](TENDER-MODERNIZATION-01-S3-PLAN.md) (**COMPLETE**)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S3-AUDIT.md`](TENDER-MODERNIZATION-01-S3-AUDIT.md) (**COMPLETE**)  
> **Prior S2 DF:** [`TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S2-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S3 — DESIGN FREEZE

LOCKED:
  Expert-effective OFF → PRIMARY = Bid.recommendedBidPln
  Expert-effective ON  → PRIMARY = Offer.offerPricePln
  NEVER two peer primary PLN

  OfferBoq.directPln = SSOT KOSZTU (NIE Offer / Bid / Decision Price)
  offerPricePln      = authoritative OFFER PLN (cena ofertowa) @ Expert ON
  recommendedBidPln  = legacy/runtime Bid proposal (calculator UNTOUCHED)

  S3-A: measure Bid↔Offer · classify MATCH|EXPECTED_DELTA|UNEXPECTED_DELTA
  S3-B: designate authoritative (no formula change)
  S3-C: ONE PRIMARY PLN + source badges
  S3-D: OUT · S8/ALIGN-BID-RETIRE for Bid hard REMOVE

  NO third PLN/engine · NO store touch · NO fake equality
  NO Approve→GO · Module gate = adminCanViewTendersTab (S2 REUSE)
  Thin: harness · authoritative helper · labels · headline UI ONLY

  Allowlist STRICT · 8 LOCK · Runtime diff MUST BE EMPTY until IMPLEMENT

STATUS: DESIGN FREEZE COMPLETE · READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → TENDER-MODERNIZATION-01-S3-AUDIT.md
[DONE]  PLAN           → TENDER-MODERNIZATION-01-S3-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT S3 → AC → QA → build → commit allowlist → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + DF amend.  
Agent **nie** zmienia Bid/Offer/OfferBoq formuł, **nie** usuwa Bid, **nie** tworzy trzeciego PLN, **nie** rusza store, **nie** rozszerza allowlist.

### STOP conditions (pre-IMPLEMENT)

| STOP jeśli | Stan DF |
|------------|---------|
| Potrzeba zmiany Bid formula | **NIE** — denylist |
| OfferBoq musi być zmieniony | **NIE** — semantics LOCK only |
| Wymagany nowy price engine | **NIE** — no-third lock |
| Wymagany nowy store | **NIE** |
| Offer PLN bez jednoznacznej semantyki | **NIE** — §3 LOCK |
| Parity wymaga sztucznego equalization | **NIE** — §6 zakaz |
| S3 zaczyna usuwać Bid / wykonywać S8 | **NIE** — S3-D OUT |

**STOP:** nie wymagany.

---

## 1. Scope

### IN (LOCKED)

| Etap | Treść |
|------|-------|
| **S3-A** | Parity harness: `offerPricePln` vs `recommendedBidPln` (+ opc. `ourEstimatePln`) · te same fixtures · klasyfikacja delt · **observe only** |
| **S3-B** | Designate authoritative OFFER PLN gdy Expert-effective ON · Expert OFF = Bid primary · **no domain** |
| **S3-C** | ONE PRIMARY PLN headline + source badge · mismatch visible · Bid secondary/compat |
| **Docs** | IMPLEMENT / PV / CLOSEOUT |

### OUT (LOCKED)

| Item | |
|------|--|
| **S3-D** deprecate Bid authoritative | **OUT** |
| Hard REMOVE Bid calculator / fields | **S8 / ALIGN-BID-RETIRE** |
| Formula edits Bid / Offer / OfferBoq / Cost | **OUT** |
| Store schema / bridge / migration | **OUT** (S6 osobno) |
| Trzeci PLN / trzeci engine | **OUT** |
| Fake parity / force equality | **OUT** |
| `expertAiDecydentEnabled` / nowa master flaga / nowy LS master | **OUT** |
| Approve→GO / Reject→NO-GO / NeedsReview→HOLD | **OUT** (S2 LOCK) |

**Scope:** **PASS**.

---

## 2. Price semantics

| Symbol | Semantyka LOCKED | Rola |
|--------|------------------|------|
| `OfferBoq.directPln` | **SSOT KOSZTU** | nie oferta · nie Bid · nie Decision Price |
| `CostExpert.realCostPln` | SSOT Real Cost | wejście Offer Expert · nie Offer PLN |
| `OfferExpert.offerPricePln` | **OFFER PLN** — cena ofertowa | authoritative @ Expert ON |
| `Bid.recommendedBidPln` | **BID PLN** — legacy/runtime proposal | authoritative @ Expert OFF · compat @ Expert ON |
| `ourEstimatePln` | override użytkownika / apply | mierzony opcjonalnie · **nie** kasować · **nie** third SSOT |
| Bid floor / safe / aggressive | warianty Bid | ≠ primary Offer · EXPECTED_DELTA OK |

**Price semantics:** **PASS**.

---

## 3. Primary hierarchy

```text
Expert-effective OFF:
  PRIMARY PLN = Bid.recommendedBidPln

Expert-effective ON:
  PRIMARY PLN = Offer.offerPricePln
  Bid         = secondary / compatibility
                (NIGDY peer primary na Hub / Outcome primary / DW headline)

ZAKAZ: dwa równorzędne primary PLN
```

| Surface (LOCKED) | Expert ON | Expert OFF |
|------------------|-----------|------------|
| Hub finance headline | **Offer** primary | **Bid** primary |
| Outcome / TRE primary number | **Offer** primary · Bid demoted | **Bid** primary |
| DW finance headline | **Offer** primary + badge | legacy N/A / Bid path |
| Bid / Wycena detail | Bid OK as **detail** | Bid primary detail |
| Strategy KPI | **no hard rewrite in S3** (compat) | bez zmian |

**Primary hierarchy:** **PASS**.

---

## 4. OfferBoq semantics

```text
OfferBoq.directPln = SSOT KOSZTU

NIE = Offer Price
NIE = Bid Price
NIE = Decision Price
```

| | LOCKED |
|--|--------|
| Znaczenie `directPln` | koszt bezpośredni L1 (component×qty aggregates) |
| Zmiana semantyki / formuły OfferBoq | **FORBIDDEN** w S3 |
| Prezentacja jako „oferta” | **FORBIDDEN** (AC-S3-9) |
| Rola w łańcuchu | input do Bid adapter **oraz** Chief OfferBoq RO → Expert · bez zmiany engine |

**OfferBoq semantics:** **PASS**.

---

## 5. Bid semantics

```text
recommendedBidPln = legacy / runtime Bid proposal
Silnik: computeTenderBidProposal (UNTOUCHED)
```

### S3 NIE WOLNO (LOCKED)

- usuwać Bid  
- zmieniać Bid formula  
- zmieniać marże / Kp / ancillary / profit / risk  
- zmieniać competitive trim  
- zmieniać catalog pricing  
- zmieniać SWZ trim  
- migrować Bid store / `tenderDossier.bidProposal`  
- kasować `ourEstimatePln`

### Rola po S3-B/C

| Expert | Bid |
|--------|-----|
| OFF | **PRIMARY** |
| ON | secondary / compatibility / Wycena detail / Strategy readers |

**Bid semantics:** **PASS**.

---

## 6. Parity contract

### Pomiar (S3-A) — LOCKED

Na **tych samych** fixtures:

| | |
|--|--|
| **A** | `Offer.offerPricePln` |
| **B** | `Bid.recommendedBidPln` |
| **C** (opc.) | `ourEstimatePln` |
| Cost cols | `directPln` · `realCostPln` — **osobno**, nie mylić z Offer |

### Verdict (LOCKED)

| Verdict | Znaczenie |
|---------|-----------|
| **MATCH** | w hardParityPass threshold |
| **EXPECTED_DELTA** | sklasyfikowana / acceptable (warianty Bid · company vs 12%/5% · documented gap · GAP fixtures) |
| **UNEXPECTED_DELTA** | poza threshold bez allowlist klasyfikacji · presentation fail |

### hardParityPass (epic DF §5.4) — LOCKED

```text
|Bid.recommendedBidPln − Offer.offerPricePln|
  ≤ max(500 PLN, 0.02 × Offer.offerPricePln)
```

Fixture hard-parity subset: Owner QA allowlist · **bez** aktywnych price overrides (chyba że DF amend).

### Zakazy parity (LOCKED)

- sztuczne wymuszanie equality  
- przepisywanie Bid→Offer lub Offer→Bid  
- automatyczny merge wartości  
- ukrywanie różnicy w raporcie S3-A  
- nowy silnik „żeby zrównać”

**Parity:** **PASS**.

---

## 7. Expert OFF

| | LOCKED |
|--|--------|
| Gate | `isTenderExpertEffective === false` (Module OFF Staff = brak UI · Super Admin bypass jak S2) |
| PRIMARY PLN | **`recommendedBidPln`** |
| Offer Expert | nie narzuca primary UI |
| Behavior | **legacy Bid unchanged** |
| Module | REUSE `adminCanViewTendersTab` · **NO** `expertAiDecydentEnabled` |

**Expert OFF:** **PASS**.

---

## 8. Expert ON

| | LOCKED |
|--|--------|
| Gate | `isTenderExpertEffective === true` := `adminCanViewTendersTab` (S2 REUSE) |
| PRIMARY PLN | **`offerPricePln`** (Offer Expert) |
| Bid | secondary / compatibility — nie peer primary |
| hardParityPass false | Offer **nadal** primary · mismatch badge (S3-C) · **nie** dwa primary |
| FORBIDDEN flags | `expertAiDecydentEnabled` · nowy LS master · trzeci system flag |

**Expert ON:** **PASS**.

---

## 9. UI badges

### Canonical source copy (LOCKED) — CREATE ONCE · REUSE

Brak istniejących etykiet OFFER/BID source w tip (`decision-workspace-ui/labels.ts` = decyzje/TRE note only).  
**S3 tworzy canonical constants raz** (thin labels — prefer append do istniejącego labels module **lub** jeden thin S3 labels plik z allowlist) · **zakaz duplicate strings** w UI.

| Source | Canonical PL LOCKED |
|--------|---------------------|
| Offer Expert primary | **`OFFER — cena ofertowa eksperta`** |
| Bid legacy / secondary | **`BID — propozycja legacy`** |
| OfferBoq cost (detail only) | **`KOSZT — OfferBoq direct`** (nigdy jako Offer Price) |
| Mismatch | **`Rozjazd Bid↔Offer — sprawdź szczegół`** |

### Zakaz copy (LOCKED)

sugerować: dwa równorzędne wyniki · dwa różne kosztorysy · automatyczne mapowanie · Approve→GO · „oferta końcowa” dla Bid gdy Expert ON · „SSOT oferty” dla Bid gdy Expert ON

**UI badges:** **PASS**.

---

## 10. Mismatch policy

Gdy `Offer PLN ≠ Bid PLN`:

| Wolno | Nie wolno |
|-------|-----------|
| S3-A raportuje delta + verdict | ukrywać różnicę |
| S3-C mismatch badge przy primary Offer | nadpisywać jedną wartość drugą |
| Bid w detail / secondary | auto-merge |
| | Bid→Offer rewrite |
| | Offer→Bid rewrite |
| | drugi hero PLN „żeby pokazać obie” |

S3-A = pomiar. S3-C = tylko primary presentation + visibility mismatch.

**Mismatch:** **PASS**.

---

## 11. No-third-PLN lock

**FORBIDDEN identifiers / engines:**

`normalizedPln` · `unifiedPln` · `finalPln` · `decisionPln` · `mergedPln` · jakikolwiek nowy price engine / SSOT

S3 **wskazuje** istniejące źródło (`offerPricePln` | `recommendedBidPln`) via thin helper — **nie** tworzy nowego SSOT.

**No third PLN:** **PASS**.

---

## 12. S3-D OUT

| Artefakt | Status |
|----------|--------|
| Deprecate Bid authoritative (global) | **OUT** tego slice |
| DELETE `computeTenderBidProposal` | **OUT** → **S8 / ALIGN-BID-RETIRE** |
| DELETE `recommendedBidPln` producers | **OUT** |
| DELETE / migrate `ourEstimatePln` | **OUT** |
| DELETE `tenderDossier.bidProposal` | **OUT** |

**S8 OUT (z S3):** **PASS**.

---

## 13. AC

| AC | LOCKED |
|----|--------|
| **AC-S3-1** | Offer PLN i Bid PLN mierzone na tych samych fixtures |
| **AC-S3-2** | wszystkie delty sklasyfikowane (MATCH / EXPECTED_DELTA / UNEXPECTED_DELTA) |
| **AC-S3-3** | Expert ON → Offer PLN primary |
| **AC-S3-4** | Expert OFF → Bid PLN primary |
| **AC-S3-5** | brak trzeciego PLN / trzeciego engine |
| **AC-S3-6** | Bid calculator untouched |
| **AC-S3-7** | stores untouched (`kw-tender-decisions` · `kw-decision-persist-v1`) |
| **AC-S3-8** | S8 / Bid hard REMOVE pozostaje OUT |
| **AC-S3-9** | `directPln` ≠ semantyka Offer PLN |
| **AC-S3-10** | source badges canonical (REUSE constants) |
| **AC-S3-11** | mismatch visible / traceable (harness + badge) |
| **AC-S3-12** | diff ⊆ allowlist only |

Epic DF AC-S3-1…6: pokryte; Owner GO S3 slice AC-S3-1…12 = SSOT ACCEPTANCE dla IMPLEMENT.

**AC:** **PASS**.

---

## 14. QA

| Suite | LOCKED |
|-------|--------|
| S3 parity harness | nowy · AC-S3-1/2 |
| Module Enablement | S1 regresja |
| S2 Dual Outcome | Expert-effective / hierarchy |
| Decision Workspace | Offer path intact |
| Decision Persist | store untouched |
| TI-B4 | tenders smoke |
| Pricing regression | Bid path nadal liczy |
| `npm run build` | PASS |

**QA:** **PASS**.

---

## 15. Allowlist

| Artefakt | Etap | Uwaga |
|----------|------|-------|
| `scripts/test-tender-modernization-01-pricing-parity.mjs` (+ opc. alias `…-s3.mjs`) | S3-A | nowy |
| Thin authoritative helper (pure resolve primary) | S3-B/C | **jeden** mały moduł · nie BC |
| Thin labels (canonical badge strings) — REUSE/append `decision-workspace-ui/labels.ts` **lub** jeden nowy thin labels plik | S3-C | **CREATE ONCE** |
| `TenderWorkflowHubPanel.tsx` | S3-C | headline PLN |
| TRE Outcome view (`TenderRecommendationOutcomeView.tsx`) | S3-C | **badge / primary number only** · NO engine |
| Decision Workspace host / finance headline | S3-C | thin badge |
| Docs S3 IMPLEMENT / PV / CLOSEOUT | docs | |

**Nie rozszerzaj allowlist bez Owner decision.**

**Allowlist:** **PASS**.

---

## 16. Denylist

| Explicitly OUT |
|----------------|
| Bid formulas · Offer formulas · OfferBoq formulas · Cost formulas |
| store / schema · Persist bridge · merge · migration |
| Bid DELETE · `ourEstimatePln` DELETE · dossier.bidProposal DELETE |
| third PLN · third engine · fake parity / force equality |
| S3-D · S8 / ALIGN-BID-RETIRE w tym GO |
| Expert BC · Chief BC · Session BC · Validation BC · Decision Persist BC · TF |
| `expertAiDecydentEnabled` · nowy LS master |
| Approve→GO mapping |

**Denylist:** **PASS**.

---

## 17. 8 LOCK

| # | Obszar | S3 |
|---|--------|-----|
| 1 | Expert BC | **ZERO TOUCH** |
| 2 | Chief BC | **ZERO TOUCH** |
| 3 | Session | **ZERO TOUCH** (REUSE effective) |
| 4 | Validation | **ZERO TOUCH** |
| 5 | Decision Persist | **ZERO TOUCH** |
| 6 | OfferBoq domain | **ZERO TOUCH** |
| 7 | Bid calculator | **ZERO TOUCH** |
| 8 | domain calculation / TF | **ZERO TOUCH** |

**Dozwolone thin only:** authoritative helper · labels · UI presentation · parity harness.

Decision Workspace: **thin headline/badge only** — nie BC rules.

**8 LOCK:** **PASS**.

---

## 18. Rollback

| | LOCKED |
|--|--------|
| **S3-C rollback** | Expert ON: primary **reverts to Bid** |
| Offer PLN | pozostaje dostępny (Chief/DW path) — nie kasować |
| Parity harness | **warn-only** (nie blokuje tip) |
| Store migration | **nie wymagana** |
| Bid deletion | **nie** |

Epic DF: „primary PLN = Bid; harness warn-only”.

**Rollback:** **PASS**.

---

## 19. S8 dependency

```text
S3 (ten DF): A observe → B designate → C present · D OUT

S3-D (osobny Owner GO): deprecate Bid authoritative
  gates: Owner QA hard parity · Hub/Outcome Offer primary ·
         Strategy deps udokumentowane · PV

S8 / ALIGN-BID-RETIRE (osobny Owner GO):
  hard REMOVE computeTenderBidProposal / żywe Bid consumers
  N× mikro-allowlist · nigdy auto z S3
```

**S8 dependency:** **PASS** (udokumentowana · poza zakresem S3).

---

## Stores — LOCK (cross-ref)

| Store | S3 |
|-------|-----|
| `kw-tender-decisions` | **NO TOUCH** |
| `kw-decision-persist-v1` | **NO TOUCH** |
| bridge / migration / merge / schema | **FORBIDDEN** |

**Stores:** **PASS**.

---

## Runtime diff (pre-IMPLEMENT)

```text
Runtime diff MUST BE EMPTY
(no harness file · no helper · no UI until Owner GO IMPLEMENT)
```

---

## Scorecard

| Gate | Wynik |
|------|-------|
| Primary hierarchy | **PASS** |
| OfferBoq semantics | **PASS** |
| Bid semantics | **PASS** |
| Parity | **PASS** |
| Expert OFF | **PASS** |
| Expert ON | **PASS** |
| No third PLN | **PASS** |
| Mismatch | **PASS** |
| Stores | **PASS** |
| S8 OUT | **PASS** |
| 8 LOCK | **PASS** |
| AC | **PASS** |
| QA | **PASS** |
| Allowlist | **PASS** |
| Denylist | **PASS** |
| Rollback | **PASS** |
| Runtime diff | **MUST BE EMPTY** |
| DF vs epic §5 | **ALIGNED** · konflikt **NONE** |

---

## Verdict

```text
S3 DESIGN FREEZE COMPLETE

Primary hierarchy: PASS
OfferBoq semantics: PASS
Bid semantics: PASS
Parity: PASS
Expert OFF: PASS
Expert ON: PASS
No third PLN: PASS
Mismatch: PASS
Stores: PASS
S8 OUT: PASS
8 LOCK: PASS
AC: PASS
QA: PASS
Allowlist: PASS
Denylist: PASS
Rollback: PASS
Runtime diff: MUST BE EMPTY

READY FOR IMPLEMENT
```

**Kod / harness / commit / push:** **NONE** (DESIGN FREEZE ONLY).
