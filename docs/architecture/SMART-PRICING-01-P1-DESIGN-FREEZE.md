# SMART-PRICING-01 P1 — DESIGN FREEZE

> **ID:** SMART-PRICING-01-P1-DESIGN-FREEZE  
> **EPIC:** SMART-PRICING-01 · **Slice:** P1 — Propose Quotes + One-shot  
> **STATUS:** **FROZEN** · oczekuje **Owner Review / ACCEPTED**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** AUDIT **ACCEPTED** · Owner **GO DESIGN FREEZE P1** · [`SMART-PRICING-01-P1-AUDIT.md`](./SMART-PRICING-01-P1-AUDIT.md)  
> **Parent DF epicki:** [`SMART-PRICING-01-DESIGN-FREEZE.md`](./SMART-PRICING-01-DESIGN-FREEZE.md) (P0–P3) — ten dokument **zawęża fazę P1**  
> **P0 SSOT:** [`SMART-PRICING-01-P0-CLOSEOUT.md`](./SMART-PRICING-01-P0-CLOSEOUT.md) · tip historyczny **2.65.86** / `9ca4a4e5`  
> **Live tip (nietknięty):** **2.65.95** / `3385d9f`  

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 P1 = DESIGN FREEZE

IN:  Evidence (Quotes RO) · Rank · Decision Confidence · One-shot · Odrzuć
OUT: MS staging · Save · commitMarketQuotesImport · Cloud · Payroll
     · AI rewrite · Bid rewrite

DF-P1-01 One-shot = session only · 0 LS · 0 Cloud · 0 Quotes write
DF-P1-02 Confidence = compute RO · 0 persist
DF-P1-03 Evidence = Product Quotes RO only · bez równoległego modelu

Gate G1–G9 ALL-NIE · FEATURE-DATA · flaga default OFF
NEXT: Owner ACCEPTED → GO IMPLEMENT P1
      (docs tip refresh zalecany przed pierwszym committem kodu)
════════════════════════════════════════════════════════
```

---

## 0. Cel slice’u

Umożliwić operatorowi przy **braku użytecznej ceny** (Detect P0):

1. zobaczyć **Price Evidence** z **Product Quotes** (RO),  
2. **usunąć** propozycję (**Odrzuć**) lub  
3. zastosować **One-shot** wyłącznie w **bieżącej sesji wyceny**,

z **Decision Confidence** (READY|REVIEW|MANUAL) i **Rank** kolejności — **bez** zapisu Quotes, **bez** MS staging, **bez** Cloud/Payroll/AI/Bid rewrite.

Detect P0 = **REUSE** (progi O-SP-F bez zmian).

---

## 1. Finalne IN / OUT

### 1.1 IN (FROZEN)

| IN | Opis |
|----|------|
| **Evidence** | Builder + typ `PriceEvidence` · projekcja z Product Quotes RO · UI lista |
| **Rank** | Sort Evidence (default O-SP-G + opc. FEATURE LS prefs) · **tylko kolejność** |
| **Decision Confidence** | READY \| REVIEW \| MANUAL · reguły DF epicki §6 · **RO compute** |
| **One-shot** | Session overlay ceny dla bieżącej wyceny/line · **DF-P1-01** |
| **Odrzuć** | Zerowanie wyboru / zamknięcie panelu · **0** side-effects na Quotes/Cloud |
| **P0 Detect wire** | REUSE banner/badge → entry do panelu Evidence |
| **Extension** | `P1_evidence` · `P1_one_shot` → `available: true` |
| **Flaga** | `kw-smart-pricing-01-p1` default **OFF** |
| **Testy** | P0 regresja 58 + nowy smoke P1 (K-SP-1a/c/d) |

### 1.2 OUT (FROZEN — twarde)

| OUT | Powód |
|-----|--------|
| **MS staging** / Evidence `source=market_sync_staging` | Faza **P2** |
| **Save** / Confirm Summary / Kill Switch path | Faza **P3** |
| **`commitMarketQuotesImport`** | P3 · ownership Quotes |
| **`applyMarketQuotesFromPreview`** / ręczny patch Quotes | Zakaz EPIC |
| **Cloud Sync** / nowe DATA_KEYS cloud | Zakaz |
| **Payroll** / LP CORE | Zakaz |
| **AI rewrite** (AI-COST silnik) | Zakaz |
| **Bid rewrite** (`tenders-bid-calculator` · pricing engine) | Zakaz — cienki overlay wire OK |
| Fuzzy ON · scrapery · auto-accept · LLM as price | Zakaz EPIC |
| Zmiana progów Detect O-SP-F | Zakaz bez amend |
| CTA **Zapisz do Product Quotes** w UI P1 | **Zakaz** (nawet disabled stub = prefer brak) |

---

## 2. Zamrożone decyzje Ownera (DF-P1-*)

### DF-P1-01 — One-shot

| Reguła | FROZEN |
|--------|--------|
| Scope | **Tylko bieżąca wycena** (tender + lineRef sesji) |
| Persist | **Session / in-memory tylko** |
| **LocalStorage** | **ZERO** — zakaz zapisu One-shot do LS |
| **Cloud** | **ZERO** — zakaz cloud key / push |
| **Quotes write** | **ZERO** — brak `commit*` / `apply*` / mutacji `marketQuotes` |
| Po reload / nowa sesja | Overlay **znika** |
| Test | Quotes fingerprint przed/po One-shot **identyczny** (K-SP-1a) |

### DF-P1-02 — Decision Confidence

| Reguła | FROZEN |
|--------|--------|
| Natura | **Compute read-only** z Evidence + reguł DF epicki §6 |
| Persist | **ZERO** — nie LS · nie Cloud · nie WC |
| UI | Badge / etykieta READY\|REVIEW\|MANUAL |
| Save gating | N/A w P1 (Save OUT) — MANUAL może ograniczać One-shot (patrz §4.3) |

### DF-P1-03 — Evidence

| Reguła | FROZEN |
|--------|--------|
| Źródło P1 | **Wyłącznie Product Quotes RO** (`source` **musi** = `product_quotes`) |
| Model | **Jeden** model Evidence (pola §3) — **bez** równoległego DTO / mirror store |
| Staging MS | **OUT** — nie budować Evidence ze staging |
| Mutacja Quotes | **Zakaz** — pure projection |
| `SmartPricingQuoteCellRo` (P0) | Wejście helperów RO · nie osobny „Evidence v2” store |

### DF-P1-04 — Rank (uzupełnienie)

| Reguła | FROZEN |
|--------|--------|
| Efekt | **Tylko kolejność** prezentacji |
| Default | O-SP-G: `wgdom` → `leroy` → `castorama` → `kb_pl` → `interbud` → `sekocenbud` → remaining alpha |
| Prefs | Opc. FEATURE LS `kw-smart-pricing-01-provider-rank` (+ preferred near-tie O-SP-I) — **nie** DATA_KEYS · **nie** Cloud |
| One-shot vs Rank LS | Rank prefs **≠** One-shot persist (**DF-P1-01**) |
| Near-tie preferred | O-SP-I (≤3% / ≤0.50 PLN) — presentation only |

### DF-P1-05 — Flaga · Gate · Docs tip

| Reguła | FROZEN |
|--------|--------|
| Feature flag | `kw-smart-pricing-01-p1` default **OFF** |
| Gate przed IMPLEMENT | G1–G9 **ALL-NIE** (§8) |
| Docs tip refresh | **Zalecany przed pierwszym committem kodu** (AUDIT §11) — nie część allowlist kodu |

---

## 3. Model Price Evidence (P1)

Dziedziczy DF epicki §7.1 z **zawężeniem P1**:

| Pole | P1 |
|------|-----|
| `source` | **Tylko** `product_quotes` |
| `provider` | wymagane |
| `price` | PLN wymagane |
| `acquiredAt` | ISO wymagane |
| `confidence` | 0..1 wymagane |
| `matchMethod` | enum epicki wymagane |
| `matchDetail` | wymagane |
| `region` | wymagane jeśli dostępne |
| `id` | sesyjny |
| `currency` | `PLN` |
| `workId` / `origin` / `unit` / `warnings` / `rawRef` | opc. |

**Invariant:** hash pól merytorycznych Evidence (bez meta rank) = projekcja komórki Quotes · Rank nie zmienia payloadu źródła.

---

## 4. Workflow P1 (FROZEN)

```text
[0] Detect P0 (REUSE) — missing line
      ↓
[1] OPEN Evidence panel (flaga P1 ON)
      ↓
[2] BUILD Evidence[] ← Product Quotes RO only (DF-P1-03)
      ↓
[3] RANK — sort only (DF-P1-04)
      ↓
[4] CONFIDENCE — READY|REVIEW|MANUAL compute RO (DF-P1-02)
      ↓
[5] USER
      a) Odrzuć   → close / clear selection · 0 side-effects
      b) One-shot → session overlay (DF-P1-01) · Quotes FP unchanged
      c) Zapisz   → NIE ISTNIEJE w P1
```

### 4.3 One-shot vs Confidence (FROZEN)

| Confidence | One-shot |
|------------|----------|
| **READY** | Dozwolony |
| **REVIEW** | Dozwolony · UI warning widoczny |
| **MANUAL** | Dozwolony **tylko** po jawnym wyborze Evidence z listy · bez „auto top” |

---

## 5. Allowlist plików

```text
IN:
  src/lib/smart-pricing/**
    └─ evidence · rank · confidence · one-shot session
    └─ types · extensions (P1_* available true)
    └─ detect/quotes-read: REUSE · 0 zmiana progów O-SP-F
  src/app/smart-pricing/**
    └─ Evidence panel · decyzje Odrzuć/One-shot
  src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx
    └─ cienki wire entry (region) · BEZ rewrite Bid/AI-COST
  scripts/test-smart-pricing-01-p1.mjs   (lub rozszerzenie P0 suite)
  (opc. docs SMART-PRICING-01-P1-* po GO IMPLEMENT — osobno)

OUT:
  src/lib/cloud-sync.ts
  commitMarketQuotesImport / MS Publish / Accept / staging write
  src/lib/tenders-bid-calculator.ts
  src/lib/tender-offer-boq-pricing-engine.ts   ← rewrite zakazany
  Payroll* · AppInnerWithAuth
  MARKET-SYNC ownership modules (write)
```

**Monolit rule:** w OfferBoq panel — tylko hunks SMART P1 wire; zakaz „przy okazji” Cost Intelligence rewrite.

---

## 6. Payroll Safety Gate (przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — SMART-PRICING-01 P1
G1 Payroll:      NIE
G2 LocalStorage schema/budget (CORE keys): NIE
   (Rank prefs FEATURE LS ≠ LP keys; One-shot = 0 LS)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks semantics: NIE
G7 Providers:    NIE
G8 Shell root:   NIE
G9 Routing:      NIE
Wynik: ALL-NIE
Owner GO CORE path: NO
```

Jeśli diff wyjdzie poza allowlist / pojawi się `commit*` / cloud key → **STOP** · Gate FULL.

---

## 7. Definition of Done

| ID | Kryterium |
|----|-----------|
| **AC-P1-1** | Diff ⊆ allowlist §5 |
| **AC-P1-2** | Evidence tylko `product_quotes` · pola §3 · DF-P1-03 |
| **AC-P1-3** | Rank = sort only · źródła immutable |
| **AC-P1-4** | Confidence READY\|REVIEW\|MANUAL · **0 persist** (DF-P1-02) |
| **AC-P1-5** | Odrzuć = 0 side-effects |
| **AC-P1-6** | One-shot: session · **0 LS · 0 Cloud · 0 Quotes write** (DF-P1-01) |
| **AC-P1-7** | Quotes fingerprint unchanged po One-shot |
| **AC-P1-8** | **0** `commitMarketQuotesImport` / MS Publish / Zapisz CTA |
| **AC-P1-9** | Flaga default OFF · OFF = zachowanie = P0 only |
| **AC-P1-10** | `test-smart-pricing-01-p0.mjs` **58 PASS** |
| **AC-P1-11** | Smoke P1 PASS (Evidence · Rank · One-shot · Odrzuć) |
| **AC-P1-12** | Build + typecheck PASS |
| **AC-P1-13** | Gate §6 ALL-NIE |

---

## 8. Owner Verification

| # | Check | Pass? |
|---|-------|-------|
| **OV-1** | Flaga OFF → UI = P0 Detect only | |
| **OV-2** | Flaga ON → panel Evidence z Quotes | |
| **OV-3** | Rank zmienia kolejność, nie ceny źródłowe | |
| **OV-4** | Badge Confidence widoczny · po reload Confidence nie „wraca z LS” | |
| **OV-5** | Odrzuć → brak zmian Quotes / sesji wyceny poza UI | |
| **OV-6** | One-shot → cena w kontekście wyceny · reload gasi overlay | |
| **OV-7** | One-shot → brak kluczy LS one-shot · brak cloud write | |
| **OV-8** | Brak CTA Zapisz / brak commit w Network/diff | |
| **OV-9** | Detect P0 nadal działa (progi) | |
| **OV-10** | Diff = allowlist · Gate ALL-NIE | |

---

## 9. Smoke / testy

| Rodzaj | Zakres |
|--------|--------|
| **Automated** | `scripts/test-smart-pricing-01-p0.mjs` (regresja) · `test-smart-pricing-01-p1.mjs` (Evidence · rank · one-shot FP · confidence RO) |
| **Manual** | OfferBoq · missing line · Evidence · Odrzuć · One-shot · reload · flaga OFF/ON |
| **UNRELATED** | TEUX / Payroll / UX-02 — nie blokują |

---

## 10. Rollback

| Poziom | Akcja |
|--------|-------|
| **L0** | Flaga OFF / local discard |
| **L1** | `git revert <P1-commit>` |
| **L2** | Brak cloud migracji (P1 bez cloud) |

```text
git revert <P1-commit> && git push origin main
```

---

## 11. Ryzyka (zamrożone mitigacje)

| ID | Ryzyko | Mitigacja DF |
|----|--------|--------------|
| R-P1-01 Quotes write | DF-P1-01 · AC-P1-6/7/8 |
| R-P1-02 P2/P3 creep | OUT §1.2 · allowlist |
| R-P1-03 false match | Confidence · MANUAL · fuzzy OFF |
| R-P1-04 Bid rewrite | Bid OUT · cienki wire |
| R-P1-06 Rank mutates source | DF-P1-04 · AC-P1-3 |
| One-shot w LS „przez pomyłkę” | **DF-P1-01 ZERO LS** |

---

## 12. NEXT po ACCEPTED

```text
DF P1 ACCEPTED
  → (zalecane) GO DOCS-TIP-SSOT — baseline/CURRENT-TASK/handoff → 3385d9f
  → Owner GO IMPLEMENT P1
  → Allowlist §5 · Gate §6 · flaga OFF
  → OV → GO COMMIT → GO PUSH → PV → CLOSE P1
  → P2/P3 — NIE auto-start
```

---

## 13. Owner Acceptance Checklist

```text
[ ] Akceptuję IN/OUT §1
[ ] Akceptuję DF-P1-01 (One-shot: session · 0 LS · 0 Cloud · 0 Quotes)
[ ] Akceptuję DF-P1-02 (Confidence: RO · 0 persist)
[ ] Akceptuję DF-P1-03 (Evidence: Quotes RO only · jeden model)
[ ] Akceptuję DF-P1-04/05 (Rank · flaga OFF · Gate ALL-NIE)
[ ] Akceptuję allowlist §5 · DoD §7 · OV §8 · Rollback §10
[ ] Potwierdzam: NO IMPLEMENT / NO COMMIT / NO PUSH w tym etapie
[ ] Tip prod nietknięty do GO PUSH (2.65.95 / 3385d9f)
```

**Werdykt dokumentu:** **DESIGN FREEZE P1 · FROZEN · gotowy do Owner Review / ACCEPTED**

Czekam na: **ACCEPTED** / HOLD / amend · następnie **GO IMPLEMENT P1**.
