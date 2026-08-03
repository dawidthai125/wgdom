# SMART-PRICING-01 P2 — DESIGN FREEZE

> **ID:** SMART-PRICING-01-P2-DESIGN-FREEZE  
> **EPIC:** SMART-PRICING-01 · **Slice:** P2 — Evidence z MARKET-SYNC staging (RO)  
> **STATUS:** **FROZEN** · oczekuje **Owner Review / ACCEPTED** → potem **GO IMPLEMENT P2**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** AUDIT **ACCEPTED** · Owner **GO DESIGN FREEZE P2** · [`SMART-PRICING-01-P2-AUDIT.md`](./SMART-PRICING-01-P2-AUDIT.md)  
> **Parent DF epicki:** [`SMART-PRICING-01-DESIGN-FREEZE.md`](./SMART-PRICING-01-DESIGN-FREEZE.md) (P0–P3) — ten dokument **zawęża fazę P2**  
> **P1 SSOT:** [`SMART-PRICING-01-P1-CLOSE.md`](./SMART-PRICING-01-P1-CLOSE.md) · tip **2.65.95** / **`d8b080e`** · DF P1 [`SMART-PRICING-01-P1-DESIGN-FREEZE.md`](./SMART-PRICING-01-P1-DESIGN-FREEZE.md)  
> **MS SSOT:** [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md) — SMART **czyta** staging · **nie** owns Publish  

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 P2 = DESIGN FREEZE

IN:  Evidence MS staging RO · merge · Rank B1
     · REUSE P1 UI · REUSE One-shot · REUSE Odrzuć
OUT: Save · commit* · staging write · Cloud · Payroll
     · AI · Bid · fuzzy · Auto-publish

DF-P2-01 Merge = pure · deterministic · memory only
DF-P2-02 MS staging = RO only · 0 write · 0 commit · 0 publish
DF-P2-03 UI = REUSE panel P1 · bez nowego Evidence panel

Gate G1–G9 ALL-NIE · FEATURE-DATA · flaga P2 default OFF
NEXT: Owner ACCEPTED → GO IMPLEMENT P2
════════════════════════════════════════════════════════
```

---

## 0. Cel slice’u

Uzupełnić tor Evidence (P1) o **SEARCH B** — propozycje cen z **MARKET-SYNC staging** (read-only), scalone z Evidence Product Quotes, z **Rank B1** (Quotes > staging), przy **pełnym REUSE** panelu / One-shot / Odrzuć z P1.

**Bez** zapisu Quotes, **bez** mutacji staging, **bez** Publish/Save, **bez** Cloud/Payroll/AI/Bid/fuzzy/Auto-publish.

Detect P0 + Evidence Quotes P1 = **REUSE** (progi O-SP-F · semantyka DF-P1-* bez zmian).

---

## 1. Finalne IN / OUT

### 1.1 IN (FROZEN)

| IN | Opis |
|----|------|
| **Evidence z MS staging RO** | Projekcja `MarketSyncStagingStore` → `PriceEvidence` z `source=market_sync_staging` |
| **Merge** | Quotes Evidence ∪ Staging Evidence — **DF-P2-01** |
| **Rank B1** | Przy równym providerze: `product_quotes` **przed** `market_sync_staging` (epicki §5.2) |
| **Rank bazowy** | REUSE O-SP-G + reguły P1 (sort only · bez mutacji payloadu) |
| **Decision Confidence** | REUSE compute RO · staging top → bias **REVIEW** (epicki §6) |
| **REUSE P1 UI** | Rozszerzenie istniejącego `SmartPricingEvidencePanel` — **DF-P2-03** |
| **REUSE One-shot** | Semantyka **DF-P1-01** (session · 0 LS · 0 Cloud · 0 Quotes write) — także z Evidence staging |
| **REUSE Odrzuć** | 0 side-effects na Quotes / staging / Cloud |
| **Extension** | `P2_ms_staging` → `available: true` |
| **Flaga** | `kw-smart-pricing-01-p2` default **OFF** · **P2 ON ⇒ P1 ON** |
| **Testy** | Regresja P0+P1 + smoke P2 |

### 1.2 OUT (FROZEN — twarde)

| OUT | Powód |
|-----|--------|
| **Save** / Confirm Summary / Kill Switch path SMART | Faza **P3** |
| **`commit*`** / `commitMarketQuotesImport` | Ownership Quotes / MS Publish · P3 |
| **`applyMarketQuotesFromPreview`** | Zakaz EPIC |
| **Staging write** (`saveMarketSyncStagingLocal` z toru SMART) | **DF-P2-02** |
| **`runMarketSyncPublish` / Accept / Defer write** | Ownership MS |
| **Auto-publish** | Epicki P2 OUT |
| **Cloud Sync** / nowe DATA_KEYS | Zakaz |
| **Payroll** / LP CORE | Zakaz |
| **AI rewrite** | Zakaz |
| **Bid rewrite** | Zakaz — cienki overlay One-shot OK (jak P1) |
| **Fuzzy ON** · scrapery · cron · LLM as price | Zakaz EPIC |
| **Nowy panel Evidence v2** | **DF-P2-03** |
| **Równoległy model Evidence** | Jeden model · rozszerzony `source` |
| Zmiana progów Detect O-SP-F | Zakaz bez amend |
| CTA **Zapisz do Product Quotes** | **Zakaz** (P3) |
| MARKET-SYNC-01 P2 EPIC / N:M / PriceHistory | Osobny GO |

---

## 2. Zamrożone decyzje Ownera (DF-P2-*)

### DF-P2-01 — Merge

| Reguła | FROZEN |
|--------|--------|
| Natura | **Pure** function(s) — brak I/O poza już wczytanymi snapshotami wejścia |
| Determinizm | Ten sam input Quotes Evidence + Staging Evidence → **identyczny** output (kolejność po Rank) |
| Persist merge | **Memory only** — wynik merge **nie** LS · **nie** Cloud · **nie** WC · **nie** staging |
| Mutacja wejść | **Zakaz** — Quotes cells / staging store / elementy Evidence wejściowe immutable w torze merge |
| Pusty staging | Merge = Evidence Quotes only → **parity P1** |
| Test | Fingerprint wejść staging + Quotes przed/po merge **identyczny** |

### DF-P2-02 — MS staging RO

| Reguła | FROZEN |
|--------|--------|
| Odczyt | **RO only** — `loadMarketSyncStagingLocal` (lub równoważny public RO) |
| **Write staging** | **ZERO** — zakaz `saveMarketSyncStagingLocal` / patch store z SMART |
| **Commit Quotes** | **ZERO** — zakaz `commit*` / `apply*` |
| **Publish** | **ZERO** — zakaz `runMarketSyncPublish` / Accept write / Auto-publish |
| Ownership | MARKET-SYNC pozostaje właścicielem Accept/Publish/Undo |
| O-SP-D | SMART **wolno** czytać staging MS **P1** bez czekania na MS P2 EPIC |

### DF-P2-03 — UI REUSE

| Reguła | FROZEN |
|--------|--------|
| Panel | **Nie** tworzyć nowego panelu Evidence |
| Baza | Rozszerzyć **`SmartPricingEvidencePanel`** (P1) tam, gdzie możliwe |
| Wire | Cienki OfferBoq — tylko flaga P2 / merge / label źródła |
| Wymagane UX | Etykieta / rozróżnienie `product_quotes` vs `market_sync_staging` |
| Opc. UX | CTA „Szukaj w sklepach” / informacja o pustym staging — **bez** Save/Publish |
| Zakaz | Osobny „Evidence v2” · mirror store · drugi ranking UI |

### DF-P2-04 — Flaga · Gate · Rank B1 · Confidence (uzupełnienie)

| Reguła | FROZEN |
|--------|--------|
| Feature flag | `kw-smart-pricing-01-p2` default **OFF** |
| Zależność | **P2 ON wymaga P1 ON** (`kw-smart-pricing-01-p1=1`); inaczej traktuj P2 jako OFF |
| OFF | Zachowanie = **P1 only** (Quotes Evidence); obie OFF = Detect P0 |
| Rank B1 | `source=product_quotes` sortuje **przed** `market_sync_staging` przy **równym** `provider` |
| Rank | Nadale **tylko kolejność** — bez zmiany `price`/`confidence` źródeł |
| Confidence | RO compute · top Evidence ze staging → zwykle **REVIEW** (epicki §6) · conflict/unmatched → MANUAL / poza pulą rekomendacji (B4) |
| One-shot ze staging | **Dozwolony** na regułach DF-P1-01 + P1 §4.3 (READY/REVIEW; MANUAL tylko explicit) |
| Gate przed IMPLEMENT | G1–G9 **ALL-NIE** (§7) |
| Docs tip | Opc. refresh przed GO COMMIT jeśli live ≠ tip docs — nie blokuje DF |

### DF-P2-05 — Otwarte w AUDIT → FROZEN tu

| AUDIT ID | FROZEN wybór Ownera |
|----------|---------------------|
| O-SP-P2-01 Flaga | **Osobna** `kw-smart-pricing-01-p2` |
| O-SP-P2-02 P2⇒P1 | **Wymagane** |
| O-SP-P2-03 SEARCH B | **Merge gdy P2 ON** + opc. CTA informacyjne (nie blokuje merge) |
| O-SP-P2-04 One-shot staging | **TAK** (session, jak P1) |
| O-SP-P2-05 Link MS UI | **Opc.** nawigacja „Otwórz Market Sync” — bez write |

---

## 3. Model Evidence (P2)

Dziedziczy DF epicki §7.1 + P1 model — **jeden** typ:

| Pole | P2 |
|------|-----|
| `source` | **`product_quotes` \| `market_sync_staging`** |
| Pozostałe pola | Jak P1 / epicki §7.1 |
| Builder Quotes | REUSE `buildEvidenceFromProductQuotes` |
| Builder staging | Nowy pure adapter w `src/lib/smart-pricing/**` |
| Mirror / DTO v2 | **Zakaz** |

### 3.1 Filtr staging → Evidence (FROZEN szkic kontraktu)

| Reguła | FROZEN |
|--------|--------|
| Wejście | Snapshot RO staging (products + providerQuotes) |
| Kandydaci | Preferuj quote z `linkedWorkIds` / match do `catalogWorkId` |
| Wykluczenie z rekomendacji One-shot | status ∈ {`conflict`,`unmatched`,`rejected`,`rejected_row`} (B4) |
| `source` | zawsze `market_sync_staging` |
| Mutacja staging | **Zakaz** (DF-P2-02) |

Szczegóły mapowania pól (`grossPrice`→`price`, `importedAt`→`acquiredAt`, …) — IMPLEMENT trzyma się AUDIT §3.2 · bez zmiany semantyki FROZEN.

---

## 4. Workflow P2 (FROZEN)

```text
[0] Detect P0 (REUSE)
      ↓
[1] OPEN Evidence panel (P1 flag ON) — DF-P2-03 ten sam panel
      ↓
[2] BUILD A — Evidence[] ← Product Quotes RO (P1)
      ↓
[3] BUILD B — Evidence[] ← MS staging RO (P2 · gdy flaga P2 ON)
      ↓
[4] MERGE (DF-P2-01) — pure · deterministic · memory only
      ↓
[5] RANK — O-SP-G + B1 (Quotes > staging @ equal provider)
      ↓
[6] CONFIDENCE — READY|REVIEW|MANUAL (RO)
      ↓
[7] USER
      a) Odrzuć   → REUSE P1 · 0 side-effects
      b) One-shot → REUSE DF-P1-01 · session · Quotes/staging FP unchanged
      c) Zapisz   → NIE ISTNIEJE w P2
```

---

## 5. Allowlist plików

```text
IN:
  src/lib/smart-pricing/**
    └─ staging RO adapter · merge · types (source union) · rank B1
    └─ confidence tweak staging · extensions P2_* · flag P2
    └─ evidence Quotes / one-shot / detect: REUSE · 0 zmiana progów O-SP-F
  src/app/smart-pricing/**
    └─ SmartPricingEvidencePanel — rozszerzenie (label źródła · opc. CTA)
    └─ Detect banner: REUSE
  src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx
    └─ cienki wire flagi P2 / merge entry
  scripts/test-smart-pricing-01-p2.mjs
  scripts/test-smart-pricing-01-p0.mjs · p1.mjs (tylko regresja / asercje rozszerzeń)
  (opc. docs SMART-PRICING-01-P2-* po GO IMPLEMENT — osobno)

OUT:
  src/lib/market-sync/publish*.ts · accept.ts · undo.ts (write path)
  saveMarketSyncStagingLocal (wywołania z SMART)
  commitMarketQuotesImport · applyMarketQuotesFromPreview · runMarketSyncPublish
  src/lib/cloud-sync.ts · Payroll* · Bid calculator rewrite · AI-COST rewrite
  nowy plik panelu Evidence „v2”
```

**Import RO dozwolony:** `loadMarketSyncStagingLocal` / typy MS **tylko do odczytu** z adaptera w `smart-pricing/`.

**Monolit rule:** OfferBoq — tylko hunks SMART P2; zakaz Cost Intelligence rewrite „przy okazji”.

---

## 6. Blast radius (FROZEN świadomość)

| Obszar | Efekt P2 | Mitigacja |
|--------|----------|-----------|
| `smart-pricing` lib | Adapter + merge + B1 + flag | Pure · smokes |
| Evidence panel | Label źródła | DF-P2-03 · bez nowego panelu |
| OfferBoq wire | Flaga P2 | Thin hunks |
| MS staging store | **Tylko read** | DF-P2-02 · static ban write |
| Quotes / Bid / Payroll / Cloud | **0** | Allowlist OUT |

---

## 7. Payroll Safety Gate (przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — SMART-PRICING-01 P2
G1 Payroll:      NIE
G2 LocalStorage schema/budget (CORE keys): NIE
   (odczyt FEATURE staging MS ≠ nowe CORE keys;
    One-shot = 0 LS; merge = memory only DF-P2-01)
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

Jeśli diff wyjdzie poza allowlist / pojawi się `commit*` / `saveMarketSyncStagingLocal` / cloud key → **STOP** · Gate FULL.

---

## 8. Definition of Done

| ID | Kryterium |
|----|-----------|
| **AC-P2-1** | Diff ⊆ allowlist §5 |
| **AC-P2-2** | Staging Evidence: `source=market_sync_staging` · pure · **0** mutacji store MS (**DF-P2-02**) |
| **AC-P2-3** | Merge: pure · deterministic · memory only (**DF-P2-01**) · fingerprint wejść OK |
| **AC-P2-4** | Rank B1: Quotes przed staging przy równym providerze · sort only |
| **AC-P2-5** | UI = rozszerzenie panelu P1 · **0** nowego panelu Evidence (**DF-P2-03**) |
| **AC-P2-6** | One-shot/Odrzuć = semantyka P1 · Quotes FP unchanged · staging FP unchanged |
| **AC-P2-7** | **0** Save CTA · **0** Auto-publish · **0** `commit*` / Publish / Accept write |
| **AC-P2-8** | **0** `saveMarketSyncStagingLocal` w torze SMART |
| **AC-P2-9** | Flaga P2 default OFF · P2⇒P1 · OFF = P1 only |
| **AC-P2-10** | P0 + P1 smoke regresja PASS |
| **AC-P2-11** | Smoke P2 PASS |
| **AC-P2-12** | Build + typecheck PASS |
| **AC-P2-13** | Gate §7 ALL-NIE |

---

## 9. Rollback

| Warstwa | Akcja |
|---------|--------|
| **Flag P2** | `kw-smart-pricing-01-p2=0` → parity **P1** |
| **Flag P1** | `=0` → Detect P0 |
| **Git** | revert commit(s) P2 — brak migracji Quotes/schema |
| **Staging MS** | nietknięty (RO) |
| **Merge / One-shot** | memory/session — reload gasi |

**Rollback cost:** niski.

---

## 10. Owner Verification

| # | Check | Pass? |
|---|-------|-------|
| **OV-1** | P2 OFF → UI = P1 (Quotes only); obie OFF → Detect P0 | |
| **OV-2** | P1+P2 ON → Evidence może zawierać `market_sync_staging` | |
| **OV-3** | Rank B1 widoczny (Quotes nad staging @ equal provider) | |
| **OV-4** | Ten sam panel P1 (brak Evidence v2) · label źródła | |
| **OV-5** | Merge nie zapisuje LS/Cloud/staging | |
| **OV-6** | One-shot ze staging → session · reload gasi · Quotes FP OK | |
| **OV-7** | Odrzuć → 0 side-effects Quotes/staging | |
| **OV-8** | Brak CTA Zapisz / Auto-publish / commit w Network/diff | |
| **OV-9** | Detect P0 progi bez zmian | |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE | |

---

## 11. Thin Slice IMPLEMENT (po GO)

```text
1) types: source union += market_sync_staging
2) staging RO adapter (pure)
3) merge (DF-P2-01)
4) rank B1
5) confidence staging bias REVIEW
6) flag kw-smart-pricing-01-p2 + P2⇒P1 · extension P2 ON
7) Evidence panel: label źródła (DF-P2-03)
8) OfferBoq thin wire
9) smoke P2 + regresja P0/P1
```

---

## 12. Ryzyka zamknięte kontraktem

| ID | Mitigacja FROZEN |
|----|------------------|
| R-P2-01 Publish creep | OUT §1.2 · DF-P2-02 · AC-P2-7 |
| R-P2-02 Staging = SSOT | B1 · label · Confidence REVIEW |
| R-P2-03 conflict One-shot | Filtr B4 §3.1 |
| R-P2-05 Save CTA | OUT · AC-P2-7 |
| R-P2-06 P2 bez P1 | DF-P2-04 P2⇒P1 |
| R-P2-07 pusty staging | Merge → parity P1 |

---

## 13. Owner Acceptance Checklist

```text
[ ] Akceptuję IN §1.1 / OUT §1.2
[ ] Akceptuję DF-P2-01 Merge (pure · deterministic · memory only)
[ ] Akceptuję DF-P2-02 MS staging RO (0 write · 0 commit · 0 publish)
[ ] Akceptuję DF-P2-03 REUSE panelu P1 (bez Evidence v2)
[ ] Akceptuję allowlist §5 · Gate §7 · DoD §8 · Rollback §9 · OV §10
[ ] Potwierdzam: brak IMPLEMENT / commit / push w tym etapie
```

**Następny krok po ACCEPTED:** **GO IMPLEMENT P2** (nie P3 · nie MS P2 EPIC).

---

## 14. Werdykt

**SMART-PRICING-01 P2 DESIGN FREEZE = FROZEN**

- IN: staging Evidence RO · merge · B1 · REUSE P1 UI/One-shot/Odrzuć  
- OUT: Save · commit* · staging write · Cloud · Payroll · AI · Bid · fuzzy · Auto-publish  
- Kontrakty: **DF-P2-01 · DF-P2-02 · DF-P2-03** (+ flag/B1 §2.4)  
- Gate: **ALL-NIE** · flaga **OFF**  

Czekam na: **ACCEPTED** / HOLD / amend · potem **GO IMPLEMENT P2**.
