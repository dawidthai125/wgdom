# TENDER-MODERNIZATION-01 / S3 — PLAN (Align Pricing)

> **STATUS:** **PLAN COMPLETE** · **DF** → [`TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**)  
> **ID:** TENDER-MODERNIZATION-01-S3-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S3 — Align Pricing**  
> **TRYB:** **PLAN ONLY** (zamknięty przez S3 DF) · ZERO kodu w tym dokumencie  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / **`1888d05f`** (S2 CLOSED)  
> **SSOT IMPLEMENT:** [`TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S3-DESIGN-FREEZE.md)  
> **SSOT:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §5 · [`TENDER-MODERNIZATION-01-PLAN.md`](TENDER-MODERNIZATION-01-PLAN.md) §5 · [`TENDER-MODERNIZATION-01-S3-AUDIT.md`](TENDER-MODERNIZATION-01-S3-AUDIT.md)  
> **Prior CLOSED:** S0 · S1 · S2  
> **Next:** Owner GO **IMPLEMENT S3**

```text
════════════════════════════════════════════════════════
S3 PLAN — Align Pricing

S3-A  Bid ↔ Offer parity harness (observe only)
S3-B  Offer Expert = authoritative OFFER PLN gdy Expert-effective ON
S3-C  ONE PRIMARY PLN + source badge
S3-D  OUT (no Bid retire in this slice)
S8    hard Bid removal → ALIGN-BID-RETIRE only

OfferBoq.directPln = SSOT KOSZTU (nie Offer Price)
Bid.recommendedBidPln = legacy runtime oferta
Offer.offerPricePln = target authoritative OFFER PLN

NO third PLN · NO Bid formula change · NO store change
8 LOCK PASS · DF conflict: NONE
════════════════════════════════════════════════════════
```

---

## DF conflict check

| DF § | PLAN alignment | Konflikt? |
|------|----------------|-----------|
| §5.1 Offer authoritative gdy Expert ON + S3-B | S3-B designation + Expert-effective gate (S2) | **NIE** |
| §5.2 ONE primary PLN | S3-C | **NIE** |
| §5.3 S3-A/B/C/D | ten PLAN 1:1 | **NIE** |
| §5.4 hardParityPass threshold | S3-A contract | **NIE** |
| §5.5 zakaz Bid delete / 3. engine / formula | denylist | **NIE** |
| Allowlist DF S3 | harness + thin Hub/Outcome/DW headline | **NIE** |
| S3-D poza default · S8 Bid retire | §7 + §16 | **NIE** |

**STOP:** nie wymagany · **READY FOR DESIGN FREEZE**.

---

## 1. Scope

### IN

| Etap | Treść |
|------|-------|
| **S3-A** | Observation harness: Bid `recommendedBidPln` ↔ Offer `offerPricePln` (+ opc. `ourEstimatePln`) na wspólnych fixtures · klasyfikacja delt · **NO runtime pricing change** |
| **S3-B** | Designate authoritative OFFER PLN = Offer Expert gdy **Expert-effective ON** · Expert OFF = legacy Bid behavior · **NO Bid delete · NO store** |
| **S3-C** | Thin presentation: **jeden** primary PLN + source badge/copy · Bid secondary/compatibility lub HIDE headline · mismatch badge gdy delta poza threshold |
| **Docs** | S3 DF · IMPLEMENT report · harness docs |

### OUT (LOCKED)

| Item | Gdzie |
|------|-------|
| **S3-D** deprecate Bid authoritative | **OUT** tego slice (Owner GO później) |
| Hard REMOVE `computeTenderBidProposal` / Bid engines | **S8 / ALIGN-BID-RETIRE** |
| Usunięcie `ourEstimatePln` · `tenderDossier.bidProposal` | S8+ |
| Trzeci kalkulator / trzeci PLN | **ZAKAZ** |
| Zmiana formuł Expert / Bid / OfferBoq / Cost | **ZAKAZ** |
| Store schema / bridge Persist↔legacy | **S6** — nie S3 |
| `kw-tender-decisions` · `kw-decision-persist-v1` | **NO TOUCH** |
| Expert / Chief / Session / Validation / DW / Persist / TF BC | **8 LOCK** |

### Dependency

| | |
|--|--|
| Wymagane CLOSED | S0 · S1 · S2 |
| Expert-effective | `isTenderExpertEffective` = `adminCanViewTendersTab` (S2) — **REUSE** |
| S4 Hub UX | zalecane po S3-C (single PLN) |
| S7 TRE | wymaga S3 parity (DF) |
| S8 Bid retire | wymaga S3-D + ALIGN-BID-RETIRE GO |

---

## 2. Current pricing

```text
OfferBoq.directPln          = SSOT KOSZTU L1 (NIE oferta)
        │
        ├─► Bid adapter → computeTenderBidProposal
        │         → recommendedBidPln     ★ tip PRIMARY UI dziś
        │         → TRE / Decision finance / Strategy / Trust
        │
        └─► Chief OfferBoq RO → EE→ME→PE→Cost(realCostPln)
                  → Offer Expert offerPricePln   ★ Chief/DW dziś
```

| Symbol | Semantyka dziś | Persystencja |
|--------|----------------|--------------|
| `directPln` | koszt bezpośredni | ephemeral OfferBoq |
| `recommendedBidPln` | runtime oferta Bid | live memory · opc. dossier slot |
| `offerPricePln` | oferta Expert (Real+12%+5%) | Chief session RAM |
| `ourEstimatePln` | override użytkownika / apply Bid | pipeline item |

**Źródło prawdy tip UI (Expert OFF / legacy):** Bid.  
**Źródło prawdy Chief/DW (gdy stack ON):** Offer Expert.  
**Parity:** PARTIAL — mogą się różnić; harness **brak** (AUDIT).

---

## 3. Target pricing

```text
ONE AUTHORITATIVE OFFER PLN (po S3-B/C)

Expert-effective ON:
  PRIMARY  = Offer Expert.offerPricePln
  SECONDARY / COMPAT = Bid.recommendedBidPln (detail · Strategy · Wycena)
  COST SSOT = OfferBoq.directPln (nigdy jako „oferta”)

Expert-effective OFF:
  PRIMARY  = Bid.recommendedBidPln   (legacy behavior unchanged)
  Offer Expert UI może być nieaktywny (S1/S2 stack)

ZAKAZ: dwa równorzędne „oferta” na Hub / Outcome primary / DW headline
ZAKAZ: traktować directPln jako Offer Price
```

| Kontekst | Authoritative OFFER PLN | Bid rola |
|----------|-------------------------|----------|
| Expert-effective **ON** + S3-B | **`offerPricePln`** | compatibility / detail |
| Expert-effective **OFF** | **`recommendedBidPln`** | primary (legacy) |
| Cost Expert `realCostPln` | **nie** offer | Real Cost only |
| OfferBoq `directPln` | **nie** offer | cost SSOT |

**hardParityPass (DF §5.4):**  
`|Bid.recommendedBidPln − Offer.offerPricePln| ≤ max(500 PLN, 0.02 × Offer.offerPricePln)`  
na Owner QA fixture set (bez aktywnych price overrides, chyba że DF amend).

Gdy Expert ON i **poza** threshold: **jeden** primary nadal = Offer · **mismatch badge** · harness **UNEXPECTED_DELTA** / fail — **nie** drugi primary PLN.

---

## 4. S3-A — Parity harness

### Cel

Zmierz Bid ↔ Offer na **tych samych** danych wejściowych.  
**Nie** zmieniaj runtime pricing.  
**Nie** zakładaj parity bez pomiaru.

### Porównanie (na fixture)

| Pole | Źródło |
|------|--------|
| **A** Offer PLN | Offer Expert `offerPricePln` (po ścieżce Cost→Offer; REUSE public API / Chief assemble RO w harness — **bez** BC edit) |
| **B** Bid PLN | `recommendedBidPln` z `resolveTenderPricingAutoProposal` / `computeRuntimeBidFromOfferBoq` / catalog path — **read-only call** |
| **C** opc. | `ourEstimatePln` jeśli ustawione na fixture item |
| **Cost input** | OfferBoq `directPln` + Real Cost `realCostPln` (osobne kolumny — nie mylić z Offer) |

### Rekord wyniku (wymagany)

| Pole | Opis |
|------|------|
| `fixtureId` | id przypadku |
| `costDirectPln` | OfferBoq.directPln (koszt) |
| `realCostPln` | Cost Expert (jeśli dostępny) |
| `offerPricePln` | Offer Expert |
| `recommendedBidPln` | Bid |
| `ourEstimatePln` | null \| number |
| `deltaPln` | Bid − Offer |
| `deltaPct` | względem Offer (gdy Offer > 0) |
| `pricingPath` | `offer_boq_ai` \| `catalog` \| `ath_priced` \| `missing` \| … |
| `differenceSource` | enum: `margin_model` \| `company_stack` \| `competitive_trim` \| `swz_constraint` \| `partial_pricing` \| `our_estimate_override` \| `variant_not_primary` \| `unknown` \| `none` |
| `verdict` | **MATCH** \| **EXPECTED_DELTA** \| **UNEXPECTED_DELTA** |

### Mapowanie verdict ↔ DF §5.4

| PLAN verdict | DF kategoria | Znaczenie |
|--------------|--------------|-----------|
| **MATCH** | hardParityPass / delta≈0 | w progu `max(500, 2%×Offer)` |
| **EXPECTED_DELTA** | Acceptable / Documented gap | floor/safe/aggressive ≠ primary · albo udokumentowany model gap (company stack vs 12%/5%) na allowlist fixture z jawną etykietą |
| **UNEXPECTED_DELTA** | Mismatch | poza threshold **bez** sklasyfikowanej przyczyny allowlist · lub Expert ON presentation fail |

**Uwaga PLAN:** systematyczna różnica Bid company-stack vs Offer 12%/5% jest **oczekiwana** na wielu fixture — klasyfikować jako **EXPECTED_DELTA** z `differenceSource=margin_model|company_stack`, **nie** udawać MATCH. S3-B **nie** wymaga MATCH=100% fixtures — wymaga **pomiaru + klasyfikacji** + designation authoritative. Hard parity PASS na **Owner QA allowlist subset** jest gate dla S7 / S3-D (DF), nie blocker S3-A.

### Harness artefakt (planowany — nie tworzyć teraz)

```text
scripts/test-tender-modernization-01-pricing-parity.mjs
(+ opc. alias scripts/test-tender-modernization-s3.mjs)
```

Czyste odczyty istniejących API · fixtures JSON/inline · zero mutacji store · zero flag prod.

### S3-A PASS gdy

- A i B mierzone na tych samych fixtures  
- każda różnica ma `verdict` + `differenceSource`  
- runtime Bid/Offer **niezmienione**  
- brak trzeciego silnika

---

## 5. S3-B — Authoritative designation

### Gate

```text
Expert-effective = isTenderExpertEffective(role, settings)
                 = adminCanViewTendersTab(...)   // S2 REUSE
```

| Expert-effective | Authoritative OFFER PLN | Zachowanie |
|------------------|-------------------------|------------|
| **ON** | **`offerPricePln`** (Offer Expert) | Bid = compatibility / detail / Strategy readers |
| **OFF** | **`recommendedBidPln`** (Bid) | **legacy behavior unchanged** |

### Thin designation (bez domain)

- Helper / selector presentation-layer (np. `resolveAuthoritativeOfferPln({ expertEffective, offerPricePln, recommendedBidPln, hardParityPass })`) — **pure**, bez zapisu  
- Wire tylko do surfaces z allowlist S3-C  
- **Nie** zmieniaj `computeTenderBidProposal` · `computeOfferPriceFromRealCost` · OfferBoq engine  
- **Nie** migruj store · **nie** bridge decisions

### hardParityPass a designation

| | |
|--|--|
| Authoritative gdy Expert ON | **zawsze Offer** (ONE primary) |
| hardParityPass **false** | Offer nadal primary · UI **mismatch badge** (S3-C) · harness UNEXPECTED_DELTA lub EXPECTED_DELTA wg klasyfikacji |
| hardParityPass **true** | Offer primary · badge mismatch OFF |

Zgodne z DF: „Mismatch — badge + harness fail · **nie** dwa primary PLN”.

### S3-B PASS gdy

- Expert ON → Offer primary designation zdefiniowane  
- Expert OFF → Bid primary (legacy)  
- Bid calculator untouched  
- stores untouched

---

## 6. S3-C — ONE PRIMARY PLN + source badge

### Hierarchy

| Surface | Expert ON | Expert OFF |
|---------|-------------|------------|
| Hub finance headline | **Offer** primary | **Bid** primary |
| Outcome / TRE primary number | **Offer** primary · Bid demoted/secondary | **Bid** (legacy TRE) |
| DW finance headline | **Offer** (już Offer path) · badge source | N/A / legacy finance |
| Bid / Wycena detail panel | Bid **secondary** „propozycja legacy” OK | Bid primary detail |
| Strategy KPI | **nie** przepisywać w S3 (compat) — OUT hard change; opc. thin badge tylko jeśli allowlist DF otworzy | bez zmian |

### Source badge / copy (LOCKED semantics)

| Source | Label PL (przykład) | Zakaz |
|--------|---------------------|-------|
| Offer Expert | **„OFFER — cena ofertowa eksperta”** | sugerować równorzędność z Bid |
| Bid | **„BID — propozycja legacy”** | „oferta końcowa” / „SSOT oferty” gdy Expert ON |
| OfferBoq direct | **„KOSZT — OfferBoq direct”** (tylko detail kosztu) | nazywać Offer Price |
| Mismatch | **„Rozjazd Bid↔Offer — sprawdź szczegół”** | pokazywać dwa primary |

### Mismatch badge

Gdy Expert ON i `|Bid−Offer| > max(500, 2%×Offer)`:  
badge widoczny przy primary Offer · Bid pozostaje w detail · **nie** drugi hero PLN.

### S3-C PASS gdy

- dokładnie jeden primary PLN na Hub / Outcome primary / DW headline  
- source badge jednoznaczne  
- Expert OFF = legacy Bid primary  
- brak trzeciego PLN

---

## 7. S3-D OUT

**Explicit OUT tego slice:**

| Artefakt | Status |
|----------|--------|
| Deprecate Bid jako authoritative (global) | **OUT** — wymaga osobnego Owner GO (S3-D gate) |
| DELETE `computeTenderBidProposal` | **OUT** → **S8 / ALIGN-BID-RETIRE** |
| DELETE `recommendedBidPln` field / producers | **OUT** |
| DELETE / migrate `ourEstimatePln` | **OUT** |
| DELETE `tenderDossier.bidProposal` | **OUT** |
| Przeniesienie Bid do innego BC | **OUT** |
| Trzeci kalkulator „żeby zrównać” | **OUT** |

**S3-D OUT:** **PASS** (jawnie poza zakresem).

---

## 8. Fixtures

Minimalny zestaw przypadków (Owner QA allowlist).  
**Nie wymyślać danych** — użyć istniejących fixture/harness tenders lub udokumentować **GAP**.

| # | Case | Cel pomiaru | Odtwarzalność (AUDIT/kod) | Gap? |
|---|------|-------------|---------------------------|------|
| 1 | normal tender | baseline OfferBoq→Bid + Offer path | typowy pipeline item z kosztorysem | — |
| 2 | minimal price floor | Bid `floorBid` / minMargin vs Offer primary | Bid calculator floor path | — |
| 3 | margin 12% | Offer rekomendowany `marginPct=0.12` | `defaultOfferStrategyParams().rekomendowany` | — |
| 4 | margin 5% | Offer risk 5% / lub agresywny scenariusz | Offer scenarios w dossier | — |
| 5 | company pricing stack | Bid Kp + ancillary + profitPct + riskReserve | `loadCompanyProfileLocal().costModel` | — |
| 6 | competitive trim | Bid `priceWeight≥80` trim | wymaga fit.priceWeight + estVal | **GAP** jeśli brak fixture z priceWeight≥80 — udokumentować, nie fake |
| 7 | SWZ constraint | Bid vs `swz.estimatedValuePln` | wymaga SWZ z estimatedValue | **GAP** jeśli brak — dokumentować |
| 8 | missing / partial pricing | Bid null / Offer blocked | brak kosztorysu / OfferBoq null → catalog lub null | — |
| 9 | pricingReadyPartial | pipeline partial economic | `pricingReadyPartial` w derive-pipeline / intelligence | wire istnieje |
| 10 | pricingReadyFinal | pipeline final economic | `pricingReadyFinal` | wire istnieje |

### Reguły fixtures

1. Ten sam `item` / dossier snapshot dla Bid i Offer w jednym case.  
2. Bez aktywnych price overrides na hard-parity subset (DF §5.4).  
3. Overrides = osobna kategoria **EXPECTED_DELTA** / Documented gap — nie hard fail S3-A.  
4. Brak danych → wiersz `verdict=EXPECTED_DELTA` lub skip z **GAP:** w raporcie harness — **nie** syntetyzować przetargu.

### Parity fixtures plan: **PASS** (z jawnymi GAP slots 6–7).

---

## 9. AC

| AC | Kryterium | Etap |
|----|-----------|------|
| **AC-S3-1** | Offer PLN i Bid PLN mierzone na tych samych fixtures | S3-A |
| **AC-S3-2** | każda różnica ma klasyfikację (MATCH / EXPECTED_DELTA / UNEXPECTED_DELTA + source) | S3-A |
| **AC-S3-3** | Expert ON → Offer PLN primary | S3-B/C |
| **AC-S3-4** | Expert OFF → legacy Bid behavior | S3-B/C |
| **AC-S3-5** | brak trzeciego PLN / trzeciego silnika | all |
| **AC-S3-6** | Bid calculator untouched (domain) | all |
| **AC-S3-7** | stores untouched (`kw-tender-decisions` · `kw-decision-persist-v1`) | all |
| **AC-S3-8** | S8 retirement / Bid hard REMOVE pozostaje OUT | S3-D |
| **AC-S3-9** | OfferBoq.directPln nie prezentowany jako Offer Price | S3-C |
| **AC-S3-10** | source badge: OFFER vs BID legacy — bez równorzędności | S3-C |
| **AC-S3-11** | mismatch poza threshold → badge · nadal jeden primary | S3-C |
| **AC-S3-12** | Diff ⊆ S3 allowlist | IMPLEMENT |

Zgodność z epic DF AC-S3-1…6: pokryte; Owner GO rozszerza o store/S8/badge (AC-S3-7…12).

---

## 10. QA

| Suite | Cel |
|-------|-----|
| **S3 parity harness** (nowy) | AC-S3-1/2 · metryki delta |
| Module Enablement harness | S1 regresja gate |
| S2 Dual Outcome harness | Expert-effective / DW primary |
| Decision Workspace harness | Offer passthrough bez Bid |
| Decision Persist harness | store untouched |
| TI-B4 tenders smoke | 12 child smoke |
| `npm run build` | kompilacja |
| Pricing regression | `useTenderPricingAuto` / OfferBoq→Bid path smoke (existing) — Bid nadal liczy |

**Nie** w S3 QA: E2E usuwania Bid · Strategy rewrite · Persist bridge.

---

## 11. Allowlist

| Artefakt | Etap | Uwaga |
|----------|------|-------|
| `scripts/test-tender-modernization-01-pricing-parity.mjs` (+ alias) | S3-A | nowy harness |
| opc. thin pure helper `resolveAuthoritativeOfferPln` / labels | S3-B/C | **jeden** mały moduł presentation — **nie** BC Expert |
| `src/lib/decision-workspace-ui/labels.ts` (thin) | S3-C | source badge copy REUSE pattern S2 |
| Hub / Outcome / DW headline thin wire | S3-C | DF allowlist: Hub/Outcome/DW headline PLN |
| `TenderRecommendationOutcomeView.tsx` | S3-C | primary number + badge · **NO** TRE engine |
| `TenderWorkflowHubPanel.tsx` | S3-C | headline PLN hierarchy |
| Decision Workspace host / finance headline | S3-C | thin badge only |
| Docs: S3 DF · IMPLEMENT · CLOSEOUT | docs | |

**Dokładna lista plików UI** → zamrozić w **S3 DESIGN FREEZE** (nie rozszerzać ad hoc).

---

## 12. Denylist

| Zakaz | Powód |
|-------|-------|
| Edycja `tenders-bid-calculator.ts` formuł | AC-S3-6 · 8 LOCK |
| Edycja `offer-expert/compute-offer.ts` / strategy defaults | 8 LOCK |
| Edycja OfferBoq pricing engine / Cost Expert assemble | 8 LOCK |
| Edycja Chief/Validation/Session/Persist BC | 8 LOCK |
| DELETE Bid / `ourEstimatePln` / dossier.bidProposal | S3-D OUT · S8 |
| Nowy store key / schema KV | AC-S3-7 |
| Bridge Persist → `kw-tender-decisions` | S6 |
| Trzeci pricing engine / „align formula” | DF §5.5 |
| Traktować `directPln` jako Offer Price | AC-S3-9 |
| Runtime map Bid↔Offer (force equal) | zakaz parity fake |
| Global ON Module / nowa flaga Expert | S1/S2 LOCK |
| S3-D / S8 w tym GO | OUT |

---

## 13. 8 LOCK

| # | Obszar | S3 touch |
|---|--------|----------|
| 1 | Expert BC | **NO** |
| 2 | Chief BC | **NO** |
| 3 | Session | **NO** (REUSE effective) |
| 4 | Validation BC | **NO** |
| 5 | Decision Workspace BC | thin headline/badge only |
| 6 | Decision Persist | **NO** |
| 7 | OfferBoq domain | **NO** |
| 8 | Bid calculator domain | **NO** |
| — | TF | **NO** |

**8 LOCK:** **PASS** (planowalny thin path).

---

## 14. Rollback

| Etap | Rollback |
|------|----------|
| S3-A | wyłącz/usuń harness · warn-only / nie blokuj tip |
| S3-B | designation OFF → primary selector = Bid always |
| S3-C | UI primary PLN = Bid · badge OFF · revert thin commit |
| Combined | DF: „primary PLN = Bid; harness warn-only” |

Bez migracji danych · bez undo Expert/Chief · bez force-push.

---

## 15. Risks

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Oczekiwany systematyczny delta (company vs 12%/5%) mylony z UNEXPECTED | HIGH | klasyfikacja EXPECTED_DELTA + `differenceSource` |
| Fixture competitive/SWZ GAP | MED | jawny GAP w raporcie · nie fake data |
| UI nadal dwa hero PLN | HIGH | S3-C allowlist + AC-S3-5/11 |
| Presja „wyrównaj formuły w S3” | CRITICAL | denylist · ALIGN epic tylko Owner GO |
| Strategy KPI nadal Bid-shaped | MED | compat OK w S3 · S3-D/S8 later |
| `ourEstimatePln` trzecia liczba | MED | mierzyć w S3-A kolumną C · nie kasować |
| TRE nadal etykietuje Bid jako Offer | MED | S3-C badge/copy · S7 engine later |

---

## 16. S8 dependency

```text
S3 (ten PLAN)
  A observe → B designate → C present
  D OUT

S3-D (osobny Owner GO) — deprecate Bid authoritative
  gates: hard parity Owner QA · Hub/Outcome czytają Offer ·
         Strategy deps udokumentowane · PV

S8 / ALIGN-BID-RETIRE (osobny Owner GO)
  hard REMOVE computeTenderBidProposal / żywe Bid consumers
  N× mikro-allowlist · nigdy auto
```

| Gate | Status w S3 |
|------|-------------|
| S8 dependency udokumentowana | **PASS** |
| S8 w zakresie S3 | **FAIL / OUT** (celowo) |

---

## 17. Owner gates

| Gate | Wymaga Owner GO |
|------|-----------------|
| S3 DESIGN FREEZE | **TAK** (następny) |
| S3 IMPLEMENT | **TAK** po DF |
| Otwarcie price-overrides w hard-parity set | DF amend |
| S3-D deprecate Bid authoritative | **TAK** osobno |
| ALIGN-BID-RETIRE / S8 Bid hard REMOVE | **TAK** osobno |
| Zmiana formuł Bid↔Offer (ALIGN epic) | **TAK** · poza S3 |
| Global ON `tendersTabForStaffEnabled` | **NIE** w S3 |

---

## Plan scorecard (pre-DF)

| Element | Wynik |
|---------|-------|
| **S3-A** | **PASS** (planowalny) |
| **S3-B** | **PASS** |
| **S3-C** | **PASS** |
| **S3-D OUT** | **PASS** |
| **ONE PRIMARY PLN** | **PASS** |
| **No third PLN** | **PASS** |
| **Bid calculator untouched** | **PASS** |
| **Store untouched** | **PASS** |
| **8 LOCK** | **PASS** |
| **S8 dependency** | **PASS** (udokumentowana · OUT z S3) |
| DF conflict | **NONE** |

---

## Verdict

```text
S3 PLAN COMPLETE

S3-A: PASS
S3-B: PASS
S3-C: PASS
S3-D OUT: PASS
ONE PRIMARY PLN: PASS
No third PLN: PASS
Bid calculator untouched: PASS
Store untouched: PASS
8 LOCK: PASS
S8 dependency: PASS

AC:
  AC-S3-1 … AC-S3-12 (sekcja 9)

QA:
  S3 parity harness · Module Enablement · S2 Dual Outcome
  · Decision Workspace · Decision Persist · TI-B4 · build
  · pricing regression (Bid path)

Allowlist:
  parity harness script · thin authoritative helper/labels
  · Hub / Outcome / DW headline thin wire · docs

Denylist:
  Bid/Offer/OfferBoq/Cost formula edits · store/schema
  · Bid DELETE · third PLN/engine · S3-D/S8 · Persist bridge

Rollback:
  primary PLN = Bid · harness warn-only · revert thin UI

READY FOR DESIGN FREEZE
```

**Runtime / harness implement / commit / push:** **NONE** (PLAN ONLY).
