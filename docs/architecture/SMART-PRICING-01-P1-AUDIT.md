# SMART-PRICING-01 P1 — AUDIT

> **ID:** SMART-PRICING-01-P1-AUDIT  
> **EPIC:** SMART-PRICING-01 · **Slice:** **P1** — Evidence · Rank · Confidence · One-shot · Odrzuć  
> **STATUS:** **AUDIT COMPLETE** · oczekuje Owner Review / ACCEPTED → potem **GO DESIGN FREEZE P1**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO DESIGN FREEZE** · **NO CODE**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** SMART-PRICING-01 P1 · [`PROJECT-AUDIT-2026.md`](./PROJECT-AUDIT-2026.md)  
> **Parents:** [`SMART-PRICING-01-AUDIT.md`](./SMART-PRICING-01-AUDIT.md) · [`SMART-PRICING-01-PLAN.md`](./SMART-PRICING-01-PLAN.md) · [`SMART-PRICING-01-DESIGN-FREEZE.md`](./SMART-PRICING-01-DESIGN-FREEZE.md) · [`SMART-PRICING-01-P0-CLOSEOUT.md`](./SMART-PRICING-01-P0-CLOSEOUT.md)  
> **Zależności CLOSED (REUSE):** Product Quotes · MARKET-SYNC-01 P0–P1 · COST-02-A · Catalog Coverage EPIC · GLOBAL-UX-02 (UX unrelated)

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 P1 AUDIT

P0 = CLOSED (Detect Quotes-first RO · 2.65.86 / 9ca4a4e5)
P1 = Evidence z Quotes · Rank · Confidence · One-shot · Odrzuć
OUT P1: MS staging · Save/commit Quotes · Cloud · Payroll · AI rewrite

Live tip: 2.65.95 / 3385d9f (UX-02) — docs baseline STALE
Docs tip refresh: TAK — zalecany PRZED pierwszym committem P1
NEXT: Owner ACCEPTED → GO DESIGN FREEZE P1 (nie IMPLEMENT)
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT P1

| Pytanie | Cel |
|---------|-----|
| Co P0 już domknął? | Baseline Detect + surface RO |
| Co jest w kodzie dziś? | Moduł `smart-pricing` + banner OfferBoq · extension stubs `available: false` |
| Co wolno w P1 vs P2/P3? | Granice DF fazowego — bez creep Save/MS |
| Jaki thin slice? | Jedna paczka Evidence+One-shot+Rank · zero commit Quotes |
| Docs tip? | Czy odświeżyć baseline przed tipem FEATURE |

**OUT tego AUDIT:** wireframe · pełny DF P1 · lista diff hunków IMPLEMENT · scrapery · auto-accept.

---

## 1. Analiza SMART P0 (CLOSED)

### 1.1 Co shipped

| Element | Wartość |
|---------|---------|
| **Zakres** | Detect braków użytecznej ceny · Quotes-first RO · badge/banner OfferBoq |
| **Progi** | conf ≥ **0.50** · stale ≤ **180** d · `activeRegion` (O-SP-F) |
| **UI** | `SmartPricingDetectBanner` · line badges w Cost Intelligence |
| **Feature commit** | **`9ca4a4e5`** |
| **UI tip przy release** | **2.65.86** |
| **Test** | `scripts/test-smart-pricing-01-p0.mjs` · **58 PASS** |
| **SSOT** | [`SMART-PRICING-01-P0-CLOSEOUT.md`](./SMART-PRICING-01-P0-CLOSEOUT.md) |

### 1.2 Co P0 świadomie odłożył

| OUT P0 | Status |
|--------|--------|
| Price Evidence UI / model pełny | → **P1** |
| Ranking providerów | → **P1** |
| Decision Confidence READY/REVIEW/MANUAL | → **P1** |
| One-shot session overlay | → **P1** |
| Odrzuć (decision) | → **P1** |
| MS staging lookup | → **P2** |
| Save → `commitMarketQuotesImport` | → **P3** |

### 1.3 Kontrakt rozszerzeń (kod)

`src/lib/smart-pricing/extensions.ts` — fazy `P1_evidence` · `P1_one_shot` · `P2_ms_staging` · `P3_save` z **`available: false`**.  
P0 UI **nie** wywołuje Evidence/One-shot/Save — zgodne z zakazem.

**Wniosek:** P1 = **włączenie kontraktu P1** (Evidence + One-shot) bez otwierania P2/P3.

---

## 2. Obecny stan modułu (AS-IS tip live)

### 2.1 Pliki ownership SMART

| Ścieżka | Rola dziś |
|---------|-----------|
| `src/lib/smart-pricing/detect.ts` | Detect missing · pure |
| `src/lib/smart-pricing/quotes-read.ts` | RO Product Quotes cells |
| `src/lib/smart-pricing/constants.ts` | min conf / stale |
| `src/lib/smart-pricing/types.ts` | Detect types · extension phases · `SmartPricingQuoteCellRo` (≠ pełne Evidence) |
| `src/lib/smart-pricing/extensions.ts` | Stubs P1–P3 |
| `src/lib/smart-pricing/index.ts` | Public API P0 |
| `src/app/smart-pricing/SmartPricingDetectBanner.tsx` | Banner RO |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Cienki wire Detect + badges |

### 2.2 Konsument

OfferBoq Cost Intelligence wywołuje `detectMissingPrices` i renderuje banner — **bez** panelu Evidence / decyzji.

### 2.3 Co **nie** istnieje jeszcze (P1+)

- Typ / builder `PriceEvidence` (pola DF §7.1)  
- Rank prefs LS (`kw-smart-pricing-01-provider-rank` — PLAN)  
- Decision Confidence engine READY|REVIEW|MANUAL  
- Session One-shot overlay binding do wyceny  
- UI panel Evidence + Odrzuć / One-shot  
- Flaga feature P1 (do zamrożenia w DF P1)

---

## 3. Production baseline

| Pole | Wartość |
|------|---------|
| **Live `version.json`** | **2.65.95** / **`3385d9f`** · `2026-08-03T06:04:47.579Z` |
| **Ostatni FEATURE tip** | GLOBAL-UX-02 S8 (`3385d9f2`) — **nie** SMART |
| **SMART P0 feature** | **`9ca4a4e5`** · UI **2.65.86** (historyczny tip release) |
| **Docs tip SSOT** | [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) deklaruje **`023ac686`** — **STALE** vs live |
| **URL** | https://www.wgdom.fun |

**Reguła AUDIT:** decyzje P1 opierać o **live tip + ten dokument + DF epicki**; nie o stale CURRENT-TASK Catalog tip.

---

## 4. Blast radius

| Strefa | P1 impact | Komentarz |
|--------|-----------|-----------|
| `src/lib/smart-pricing/**` | **HIGH (ownership)** | Nowe pure builders Evidence/Rank/Confidence/One-shot |
| OfferBoq Cost Intelligence panel | **MED** | Cienki UX Evidence — **bez** rewrite Bid/AI-COST |
| Product Quotes / WC | **RO only** | Odczyt AS-IS · **0** write w P1 |
| MARKET-SYNC staging | **OUT P1** | Zero import staging (P2) |
| `commitMarketQuotesImport` | **OUT P1** | Zero call (P3) |
| `cloud-sync.ts` / DATA_KEYS cloud | **OUT** | 0 |
| Payroll / LP | **OUT** | 0 |
| Bid calculator / pricing engine | **OUT** | Konsumpcja overlay sesji — wąski wire, nie rewrite silnika |
| GLOBAL-UX-02 surfaces | **OUT** | Nie reopen |

**Gate oczekiwany (IMPLEMENT):** G1–G9 **ALL-NIE** (FEATURE-DATA · session LS rank prefs OK · bez cloud key).

---

## 5. Allowlist (propozycja AUDIT → zamrozić w DF P1)

```text
IN (propozycja):
  src/lib/smart-pricing/**          ← Evidence · rank · confidence · one-shot session
                                      · types · extensions (available P1_*)
                                      · NIE mutate detect progi bez DF amend
  src/app/smart-pricing/**          ← panel Evidence / decyzje (nowe komponenty OK)
  src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx
                                      ← cienki wire entry (regionowy)
  scripts/test-smart-pricing-01-p1.mjs   ← nowy smoke (lub rozszerzenie P0)
  docs/architecture/SMART-PRICING-01-P1-*  ← IMPLEMENT/OV/PV/CLOSE (później)

OUT (zakaz P1):
  src/lib/cloud-sync.ts
  commitMarketQuotesImport call path / MS Publish / Accept batch
  src/lib/tenders-bid-calculator.ts      ← rewrite
  src/lib/tender-offer-boq-pricing-engine.ts ← rewrite
  Payroll* · AppInnerWithAuth routing
  MARKET-SYNC ownership / staging write
  Fuzzy ON · scrapery · auto-accept · LLM as price
```

**Diff review fail:** jakikolwiek write Quotes / call `commit*` / edycja MS publish → **STOP** (to P3 / MS).

---

## 6. Zakres IN / OUT (P1)

### 6.1 IN (Thin Slice P1)

| IN | Opis |
|----|------|
| **Price Evidence z Quotes** | Projekcja RO → pola DF §7.1 · `source=product_quotes` |
| **Rank** | Sort Evidence (O-SP-G default + FEATURE LS prefs) · **tylko kolejność** |
| **Decision Confidence** | READY \| REVIEW \| MANUAL (DF §6) |
| **UI Evidence** | Panel przy missing line / Detect entry |
| **Odrzuć** | Zero side-effects |
| **One-shot** | Session overlay **tylko bieżąca wycena** · Quotes fingerprint **bez zmian** |
| **Extension flags** | `P1_evidence` / `P1_one_shot` → `available: true` |
| **Testy** | K-SP-1a/c/d (One-shot FP · Evidence fields · rank reorder) |

### 6.2 OUT (twarde — P1)

| OUT | Faza właściwa |
|-----|----------------|
| Evidence z **MS staging** | **P2** |
| **Zapisz** → `commitMarketQuotesImport` · Summary · KS · Undo | **P3** |
| Auto-publish · fuzzy · scrapery | Zakaz EPIC |
| Drugi tor Quotes / `applyMarketQuotes*` | Zakaz |
| AI-COST / Bid / Cloud CORE / Payroll rewrite | Zakaz |
| Zmiana progów Detect O-SP-F bez amend DF | Zakaz |
| Reopen GLOBAL-UX-02 / Catalog Wave 2 | Osobne GO |

### 6.3 Binding z DF epickiego (już FROZEN — P1 respektuje)

| ID | Binding |
|----|---------|
| **T1** | One-shot ≠ Quotes write |
| **D-SP-4** | One-shot = session-only |
| **D-SP-6** | Evidence required fields |
| **O-SP-B** | Session-first |
| **O-SP-G** | Default provider rank |
| **O-SP-I/J** | Δ preferencji · Confidence rules |

---

## 7. Thin Slice proposal

```text
SMART-PRICING-01 P1 = ONE BUNDLE
  Detect (P0 REUSE)
    → build PriceEvidence[] from Product Quotes (RO)
    → rank (prefs + O-SP-G)
    → Decision Confidence badge
    → UI: Odrzuć | One-shot
  ZERO: MS staging · Save · commit · cloud DATA_KEY
```

| Atrybut | Propozycja |
|---------|------------|
| **Nazwa** | SMART-PRICING-01 P1 — Propose Quotes + One-shot |
| **Klasa** | FEATURE-DATA · presentation + pure lib |
| **Flaga** | np. `kw-smart-pricing-01-p1` default **OFF** (zamrozić w DF) |
| **Entry UX** | Z Detect banner / line badge → panel Evidence |
| **Persist** | Rank prefs: FEATURE LS only · One-shot: memory/session |
| **Rozmiar** | **S–M** (1 thin slice · nie łączyć z P2/P3) |

**Anti-scope:** „przy okazji Save” · „przy okazji MS staging” · „włącz DIY origins”.

---

## 8. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| **R-P1-01** | One-shot przypadkowo zapisze Quotes | **HIGH** | T1 · brak importu commit · test FP Quotes |
| **R-P1-02** | Creep P2/P3 w tym samym PR | **HIGH** | Allowlist · AC OUT · STOP review |
| **R-P1-03** | False match Evidence → zła One-shot cena | **MED–HIGH** | Confidence MANUAL/REVIEW · justification obowiązkowa · fuzzy OFF |
| **R-P1-04** | Rewrite Bid/pricing engine „żeby overlay działał” | **HIGH** | Cienki session overlay wire · Bid OUT |
| **R-P1-05** | Tip docs STALE → zły baseline w commit message/OV | **MED** | Docs refresh przed FEATURE commit (§11) |
| **R-P1-06** | Rank mutuje źródła Quotes | **HIGH** | Pure sort · K-SP-1d |
| **R-P1-07** | Brudny WT → przypadkowy `git add` | **HIGH** | Allowlist only |
| **R-P1-08** | Regresja Detect P0 | **MED** | Zachować `test-smart-pricing-01-p0.mjs` 58 PASS |

---

## 9. Definition of Done (P1 — propozycja)

| ID | Kryterium |
|----|-----------|
| **AC-P1-1** | Diff ⊆ allowlist DF P1 |
| **AC-P1-2** | Evidence z Quotes · wymagane pola DF §7.1 |
| **AC-P1-3** | Rank zmienia tylko kolejność (payload źródła immutable) |
| **AC-P1-4** | Confidence READY/REVIEW/MANUAL zgodne z DF §6 |
| **AC-P1-5** | Odrzuć = 0 side-effects |
| **AC-P1-6** | One-shot = session · Quotes fingerprint **unchanged** (K-SP-1a) |
| **AC-P1-7** | **0** call `commitMarketQuotesImport` / MS Publish |
| **AC-P1-8** | Detect P0 regresja **58 PASS** |
| **AC-P1-9** | Nowy smoke P1 PASS |
| **AC-P1-10** | Build + typecheck PASS |
| **AC-P1-11** | Gate G1–G9 ALL-NIE |
| **AC-P1-12** | Flaga default OFF (jeśli DF tak zamrozi) |

---

## 10. Rollback

| Poziom | Akcja |
|--------|-------|
| **L0** | Local discard / flaga OFF |
| **L1** | `git revert <P1-commit>` |
| **L2** | Feature flag OFF na tipie (jeśli wprowadzona) |

```text
git revert <P1-commit> && git push origin main
```

P0 Detect pozostaje na tipie niezależnie (osobny commit historyczny `9ca4a4e5`).

---

## 11. Docs tip refresh — **czy przed pierwszym committem P1?**

| Pytanie | Odpowiedź AUDIT |
|---------|-----------------|
| Czy **wymagany** przed pierwszym **kodowym** committem P1? | **TAK — ZALECANY OBOWIĄZKOWO (docs-only)** |
| Czy blokuje ACCEPTED / DF P1? | **NIE** — DF może iść równolegle; refresh przed **GO COMMIT P1** |
| Czy to EPIC SMART? | **NIE** — osobny mikro docs-only (lub pierwszy commit docs w torze P1 **przed** kodem) |

### Pliki do odświeżenia (docs-only)

| Plik | Cel |
|------|-----|
| [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) | Tip = **2.65.95** / **`3385d9f`** · wpis GLOBAL-UX-02 FULLY CLOSED · SMART P0 pozostaje jako feature history |
| [`CURRENT-TASK.md`](../../CURRENT-TASK.md) | Stan: UX-02 CLOSED · SMART P1 AUDIT/DF · nie Catalog-as-tip |
| Handoff tip | [`MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) / thin `MASTER_HANDOFF` / Quick Start — tip → baseline + live |

**Powód:** AI i OV muszą widzieć ten sam tip co `version.json`; inaczej R-P1-05 (fałszywy baseline).

**Kolejność rekomendowana:**

```text
1) Owner ACCEPTED ten AUDIT
2) Owner GO DESIGN FREEZE P1  (docs)
3) (opc.) Owner GO DOCS-TIP-SSOT  → refresh baseline/CURRENT-TASK/handoff · docs commit
4) Owner GO IMPLEMENT P1
5) GO COMMIT / PUSH / PV / CLOSE P1
```

---

## 12. Rekomendacja implementacji

| Decyzja | Rekomendacja |
|---------|--------------|
| **Czy robić P1?** | **TAK** — logiczny następny thin po P0 · zgodny z DF epickim |
| **Czy teraz IMPLEMENT?** | **NIE** — najpierw **DESIGN FREEZE P1** (slice DF lub amend fazy) |
| **Czy łączyć z P2/P3?** | **NIE** — osobne GO |
| **Czy Save w P1?** | **NIE** — P3 |
| **Flaga default** | **OFF** na tipie (bezpieczeństwo) |
| **Testy** | Zachować P0 58 · dodać P1 K-SP-* |
| **Docs tip** | Refresh **przed** pierwszym committem kodu P1 (§11) |

```text
Werdykt AUDIT:
  P1 = READY FOR DESIGN FREEZE
  IMPLEMENT = ZABLOKOWANY do Owner GO DF + GO IMPLEMENT
  Docs tip refresh = TAK przed commit kodu
```

---

## 13. Owner Acceptance Checklist

```text
[ ] Akceptuję IN/OUT §6 (Evidence·Rank·Confidence·One-shot·Odrzuć · OUT Save/MS)
[ ] Akceptuję allowlist §5
[ ] Akceptuję Thin Slice §7 (bez P2/P3)
[ ] Akceptuję DoD §9 · Rollback §10
[ ] Potwierdzam: docs tip refresh (§11) przed pierwszym committem kodu P1
[ ] Potwierdzam: brak IMPLEMENT / commit / push w tym etapie
```

**Następny krok po ACCEPTED:** **GO DESIGN FREEZE P1** (nie IMPLEMENT).

---

## 14. Werdykt

**SMART-PRICING-01 P1 AUDIT = COMPLETE**

- P0 CLOSED · kontrakt extension gotowy  
- Live prod **GREEN** · **2.65.95** / **`3385d9f`**  
- P1 = Evidence Quotes + Rank + Confidence + One-shot + Odrzuć  
- OUT = MS staging · Save · CORE  
- Docs tip refresh: **TAK** przed pierwszym committem kodu  

Czekam na: **ACCEPTED** / HOLD / amend · potem **GO DESIGN FREEZE P1**.
