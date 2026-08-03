# MARKET-SYNC-01 P3 — AUDIT

> **ID:** MARKET-SYNC-01-P3-AUDIT  
> **EPIC:** MARKET-SYNC-01 · **Slice:** **P3** — Integracje auto (licensed API / scraper)  
> **STATUS:** **AUDIT ACCEPTED** · DESIGN FREEZE → [`MARKET-SYNC-01-P3-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P3-DESIGN-FREEZE.md)  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO CODE**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** → **GO DESIGN FREEZE** MARKET-SYNC-01 **P3**  
> **Parents:** [`MARKET-SYNC-01-AUDIT.md`](./MARKET-SYNC-01-AUDIT.md) · [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) · [`MARKET-SYNC-01-P2-CLOSE.md`](./MARKET-SYNC-01-P2-CLOSE.md) · [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md) · [`MARKET-SYNC-01-P0-CLOSEOUT.md`](./MARKET-SYNC-01-P0-CLOSEOUT.md)  
> **Living SSOT:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · [`NEXT-EPIC-CANDIDATES.md`](./NEXT-EPIC-CANDIDATES.md)  
> **Uwaga ścieżki:** Owner wskazał `MARKET-SYNC-01-P2-CLOSEOUT.md` — w repo **nie istnieje**; SSOT zamknięcia P2 = **`MARKET-SYNC-01-P2-CLOSE.md`**.

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P3 AUDIT — Integracje auto (Legal-first)

P0–P2 = FULLY CLOSED / CLOSED · tip 2.65.95 / 18830c1
P3 EPIC = licensed_api | scraper ZA Legal GO + Owner GO
OUT P3 (EPIC PLAN): daily cron · auto-publish
HARD: nadal Preview → Accept → commitMarketQuotesImport

Legal Gate = BLOCKER przed DF IMPLEMENT
Thin slices: P3-L (Legal) → P3-A (adapter) → P3-B (1 provider)
N:M / multi-undo / publishFactor / SMART P3 / CM-04 P3 = OUT

STATUS: AUDIT ACCEPTED · DF FROZEN · NIE IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT P3

| Pytanie | Cel |
|---------|-----|
| Co oznacza P3 w EPIC? | PLAN §13.5 / §14: *API / scraper po **Legal + Owner GO*** · `sourceKind=licensed_api\|scraper` · **nadal** Preview+Accept+commit |
| Dlaczego teraz? | P2 FULLY CLOSED · Owner GO AUDIT · NEXT-EPIC: „MS P3 (Legal/scraper)” |
| Co REUSE? | P0 Import/Match/Preview · P1 Accept/Guard/DryRun/Kill Switch/`commit*` · P2 History/Coverage/Templates |
| Co nie ruszać? | Auto-publish · daily cron · Cloud CORE · Payroll · Bid · AI-COST · drugi tor Quotes · SMART Save |
| Jaki thin slice? | **Legal pack najpierw** · potem **jeden** adapter ingest → staging (nie full multi-shop) |

**OUT tego AUDIT:** IMPLEMENT · wireframe pixel · pełny DF · wybór dostawcy prawnego za Ownera · start SMART/CM P3.

---

## 1. Production baseline

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **UI** | **2.65.95** |
| **Feature tip** | **`18830c1`** (MARKET-SYNC-01 **P2** FULLY CLOSED) |
| **Docs HEAD** | **`99969f33`** (I3 docs package · ancestor tipu feature bez zmiany UI) |
| **Branch** | `main == origin/main` |
| **Protected Core** | **GREEN** |
| **Tryb** | **UTRZYMANIE** |
| **Aktywny IMPLEMENT** | **NONE** |
| **SSOT tip** | [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |

### 1.1 Domknięte zależności (REUSE)

| Slice | Status | Relacja do P3 |
|-------|--------|----------------|
| **MS P0** | CLOSED · `273fb3e0` / 2.65.84 | CSV Import · Normalize · Match · Preview — **REUSE** |
| **MS P1** | CLOSED · `5326cf8c` / 2.65.85 | Accept · Guard · Dry Run · Kill Switch · `commitMarketQuotesImport` — **REUSE · ZERO rewrite path** |
| **MS P2** | **FULLY CLOSED** · `18830c11` / tip `18830c1` | PriceHistory · Δ% · Coverage · templates — **REUSE**; P3 **nie** re-open AC P2 |
| **WC P3.2/P3.3** | CLOSED | Jedyny write Quotes = `commitMarketQuotesImport` |
| **SMART-PRICING P0–P2** | CLOSED | Staging **RO** consumer — P3 **nie** łamie kontraktu |
| **AI-COST-02 I3** | FULLY CLOSED | **OUT** MS P3 |
| **CM-04 P3 (INNE)** | Backlog | **OUT** wzajemne |

### 1.2 Kontrakt residual z P2 CLOSE

Z [`MARKET-SYNC-01-P2-CLOSE.md`](./MARKET-SYNC-01-P2-CLOSE.md):

> NEXT: **MARKET-SYNC-01 P3** (API/scraper) = **ZAKAZ** bez Owner **GO** + **Legal**  
> OUT P2: Scraper / cron / auto-publish / full multi-shop · N:M · multi-undo · publishFactor UI · Cloud CORE · Payroll · History→average

Z [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) **AC-P3**:

| AC | Treść (EPIC) |
|----|----------------|
| **AC-P3-1** | Osobny **Legal GO** + Owner GO |
| **AC-P3-2** | `sourceKind=licensed_api\|scraper` za flagą |
| **AC-P3-3** | Nadal Preview + Accept + commit (**zero auto-publish**) |

**OUT slice P3 (EPIC §14):** Daily cron · auto-publish.

**Wniosek:** P3 ≠ „włącz scrapera i zapomnij”. P3 = **kontrolowany ingest** do istniejącego pipeline staging, z **Legal Gate** jako hard blocker.

---

## 2. Current architecture review (AS-IS po P2)

### 2.1 Pipeline (zamrożony kontrakt P0–P2)

```text
Źródło (dziś: CSV / eksport / paste)
  → Normalize · Match
  → Staging Preview (kw-market-sync-01-staging, FEATURE LS)
  → Accept / Reject / Defer  (+ P2: PriceHistory append gdy P2 ON)
  → Guard · Dry Run · Delta · Summary
  → Kill Switch (default OFF)
  → runMarketSyncPublish → commitMarketQuotesImport  ★ JEDYNY WRITE Quotes
  → Undo single
```

| Warstwa | Pliki (skrót) | Stan P3 |
|---------|---------------|---------|
| Types / ProviderId | `types.ts` | Już: `leroy\|castorama\|obi\|bricoman\|psb\|other` · `sourceKind` obejmuje ścieżkę pod `licensed_api`/`scraper` (PLAN) |
| Import CSV | `import-csv.ts` · fixtures | **REUSE** jako tor ręczny — P3 **nie** usuwa |
| Staging | `staging-store.ts` | Local FEATURE · **nie** `DATA_KEYS` |
| Accept / Publish | `accept.ts` · `publish.ts` · `kill-switch.ts` | **ZERO DIFF semantyki** w P3 (AC-P3-3) |
| P2 | `price-history.ts` · `coverage.ts` · `provider-templates.ts` · `MarketSyncP2Panel` | Templates = stub CSV — **nie** live feed |
| UI | `MarketSyncPreviewPanel` · Super Admin Market Sync | Host pod przyszły „Fetch / Sync run” |

### 2.2 Luka produktowa P3

Admin ma pełny **ręczny** tor CSV → Preview → Publish, historię i coverage (P2), ale **brak**:

1. **Kanału umownego / API** zasilającego staging bez ręcznego pliku.  
2. **Legal pack** (który provider, jaka licencja, zakazy ToS).  
3. **Adaptera ingest** z `sourceKind=licensed_api|scraper` → SyncRun → te same Preview gates.

**Luka ≠** brak crona (cron = OUT EPIC P3).  
**Luka ≠** auto-publish (zakazany AC-P3-3).

### 2.3 Legal / ToS (kontekst WC)

[`P3.0-MARKET-SOURCES-ARCHITECTURE-DESIGN.md`](../work-catalog/P3.0-MARKET-SOURCES-ARCHITECTURE-DESIGN.md):

- Zakaz scrapingu / nieoficjalnych API bez licencji.  
- ToS / CFAA: tylko kanały umowne.  
- KB.pl / Interbud / Sekocenbud: **bez** pisemnej licencji = **STOP**.

MARKET-SYNC-01 EPIC AUDIT W3: **P0 bez scrapera do Legal GO** — P3 jest pierwszym miejscem, gdzie Legal Gate staje się **wejściem do DF IMPLEMENT**, nie tylko „OUT forever”.

---

## 3. Existing IN / OUT boundaries

### 3.1 IN (propozycja AUDIT — do zamrożenia w DF)

| IN | Opis |
|----|------|
| **Legal Gate pack** | Checklist Owner: provider · kanał (API vs scrape) · dokument licencji / ToS · zakazane domeny |
| **Feature flag P3** | Osobna `kw-market-sync-01-p3` (lub równoważna) · default **OFF** |
| **Source kinds** | Użycie `licensed_api` / `scraper` w SyncRun / quotes staging **tylko** gdy flag ON + Legal PASS |
| **Adapter ingest → staging** | Fetch/normalize → **ten sam** Preview pipeline (nie omijać Accept) |
| **Jeden provider first** | Thin: 1 adapter (np. OBI **lub** Bricoman **lub** licensed feed) — nie full multi-shop |
| **REUSE P1 write** | Publish wyłącznie `commitMarketQuotesImport` + Kill Switch |
| **REUSE P2** | History/coverage działają na Accept jak dziś (gdy P2 ON) |
| **Testy** | Pure adapter mock · regresja P0/P1/P2 · OFF = tip parity |
| **Docs** | DF → AR → OV → PV → CLOSE |

### 3.2 OUT (twarde — rekomendacja AUDIT)

| OUT | Powód |
|-----|--------|
| **Daily cron / Edge scheduler / worker ciągły** | EPIC §14 OUT P3 · Stabilization |
| **Auto-publish / Publish bez Preview+Accept** | AC-P3-3 · P1 safety |
| **Scraper bez Legal GO** | ToS / P3.0 · EPIC R2 |
| **Pełny multi-shop sync** (LM+Casto+OBI+Bricoman+PSB naraz) | Blast; thin = 1 provider |
| **Drugi tor Quotes** (`applyMarketQuotes*` poza commit) | EPIC AC-2 · P1 FROZEN |
| **Zmiana Kill Switch default ON** | P1 safety |
| **N:M `linkedWorkIds`** | Residual P1/P2 — **osobny** thin, nie P3 |
| **Multi-undo / cloud rollback engine** | OUT P1 |
| **`publishFactor` UI** | IMPROVEMENT R9 — nie P3 |
| **PriceHistory → average engine** | K-MS-4 |
| **Fuzzy match ON** | P0/P1 zakaz |
| **Cloud Sync CORE / nowy DATA_KEYS** | Gate · prefer FEATURE staging |
| **Payroll / AI-COST / Bid / Parser / Scoring** | EPIC OUT |
| **SMART Save / One-shot / Evidence rewrite** | Ownership SMART · SMART P3 osobno |
| **CM-04 P3 / Wave 2 / DIY enabledOrigins default ON** | Osobne GO |
| **Re-open AC P0/P1/P2 bez amend** | Frozen |

### 3.3 Boundary SMART / AI-COST / WC

| | SMART-PRICING | MARKET-SYNC P3 | AI-COST |
|--|---------------|----------------|--------|
| Staging | RO Evidence | **Owner** ingest → staging | OUT |
| Quotes write | OUT (SMART P3) | **Tylko** P1 `commit*` | OUT |
| Cel | Brak ceny w wycenie | Ops sync retail | Competitiveness RO (I3 CLOSED) |

---

## 4. Technical debt (widoczny przed P3)

| ID | Dług | Wpływ na P3 | Rekomendacja |
|----|------|-------------|--------------|
| **TD-1** | Brak Legal pack / Owner matrix providerów | **BLOCKER** DF IMPLEMENT | Thin **P3-L** najpierw |
| **TD-2** | P2 templates = stub CSV only | Oczekiwania „OBI działa” vs stub | Copy UI: „szablon ≠ live sync” |
| **TD-3** | Staging tylko local FEATURE (nie Cloud) | Multi-device ops | **OUT P3** Cloud KEY — świadome |
| **TD-4** | N:1 `linkedWorkIds` | Mapowanie sklep→wiele robót | OUT P3 · osobny GO |
| **TD-5** | `publishFactor` = 1.0 const | Naiwna 1:1 cena | OUT P3 |
| **TD-6** | Docs residual MS P2 CLOSE/PV były untracked → teraz CLOSED na `99969f33` (I3); P2 CLOSE na `main` jako untracked lokalnie w WT? | Continuity | P2 CLOSE już w living tip; nie mieszać z P3 |
| **TD-7** | Flagi P0/P1/P2 rozproszone | Ops complexity | P3 = **nowa** flaga; nie scalać z P2 |
| **TD-8** | Brak formalnego `MarketSyncIngestAdapter` interface | Ryzyko ad-hoc fetch w UI | DF: port adaptera pure lib |

---

## 5. Risks

| ID | Ryzyko | Sev | Mitigacja |
|----|--------|-----|-----------|
| **R-P3-1** | **ToS / scraping bez licencji** | **P0** | Legal GO **przed** GO IMPLEMENT; scraper opcjonalny dopiero po Legal PASS |
| **R-P3-2** | Auto-publish „dla wygody” | P0 | AC-P3-3 · zakaz cron · OV: zero Publish bez Accept |
| **R-P3-3** | Omijanie Kill Switch / drugi write Quotes | P0 | Allowlist · ZERO DIFF `commit*` · smoke KS |
| **R-P3-4** | Popsucie SMART staging RO | P1 | Soft schema · fingerprint fields P1/P2 nietykalne bez amend |
| **R-P3-5** | Pełny multi-provider w jednym slice | P1 | Thin: **1** provider / 1 adapter |
| **R-P3-6** | Credentials w repo / client bundle | P0 | Zakaz sekretów w FE; DF: skąd secret (Owner) — prefer brak Edge w P3-A |
| **R-P3-7** | Kolizja z CM-04 P3 INNE | P2 | OUT wzajemne |
| **R-P3-8** | History→average drift | P1 | K-MS-4 regresja obowiązkowa |
| **R-P3-9** | Stabilization Window + scraper noise | P2 | Flaga OFF · manual trigger only |
| **R-P3-10** | Legal OPEN przy DF „za wcześnie” | P0 | **DF może zamrozić Legal-first**; IMPLEMENT adaptera **blocked** do Legal ACCEPT |

---

## 6. Dependencies

| Zależność | Typ | Stan |
|-----------|-----|------|
| MS P0–P2 | Hard REUSE | **CLOSED** |
| WC `commitMarketQuotesImport` | Hard write | **CLOSED** · ZERO rewrite |
| Owner **Legal GO** | **Hard Gate** | **OPEN** — brak packu w repo |
| Owner wybór **1 provider + kanał** | Hard DF | **OPEN** |
| SMART P0–P2 staging RO | Soft | CLOSED · nie łamać |
| SMART P3 / CM-04 P3 / Wave 2 | Parallel OUT | Backlog osobny |
| Edge / secrets / cron | Prefer OUT P3-A | Brak wymogu EPIC |
| Payroll Gate G1–G9 | Hard | ALL-NIE FEATURE |

---

## 7. Proposed thin slices

```text
P3-L  Legal & Scope Pack     — DOCS ONLY · Owner Legal GO
P3-A  Ingest Adapter Spine   — interface + flag + mock → staging (0 live net)
P3-B  One Provider Live      — 1× licensed_api LUB 1× scraper (po Legal)
P3-C  (opc.) Second provider — tylko po P3-B CLOSE + nowy GO
```

| Slice | IN | OUT | Wejście |
|-------|----|-----|---------|
| **P3-L** | Macierz providerów · kanał · ToS/licencja · zakazane źródła · werdykt Legal PASS/FAIL | Kod · fetch · Edge | Owner Legal checklist |
| **P3-A** | `MarketSyncIngestAdapter` · flaga P3 OFF · mock fixture → SyncRun → Preview | Live HTTP · scraper · cron · auto-publish | DF po Legal PASS *lub* DF „mock-only” z blockerem live |
| **P3-B** | Jeden realny adapter · manual „Pobierz” Admin · ten sam Accept/Publish | Multi-shop · cron · auto-publish · N:M | P3-A + Legal PASS dla **tego** providera |
| **P3-C** | Drugi provider | Wszystko inne | Osobny GO |

**Rekomendacja AUDIT (kolejność sztywna):**  
**P3-L → (Owner Legal PASS) → DF P3-A → … → P3-B.**  
**Nie** łączyć Legal + live scraper w jednym IMPLEMENT.

---

## 8. Initial scope for DESIGN FREEZE (szkic — nie FROZEN)

> **Uwaga:** poniżej propozycja pod **GO DESIGN FREEZE**.  
> Do chwili Owner ACCEPTED DF — **nie** IMPLEMENT.

### 8.1 Cel jednego DF (rekomendacja: **DF = P3-A + binding Legal**, nie P3-B live)

**One Bundle = One Goal:**  
Zamrozić **kręgosłup ingestu** (adapter → staging Preview) + **kontrakt Legal Gate**, z flagą OFF i **zero** auto-publish / cron — **bez** obowiązkowego live scrapera w pierwszym IMPLEMENT.

### 8.2 Decyzje do zamrożenia w DF (Owner)

| ID | Decyzja | Opcje (AUDIT) | Rekomendacja |
|----|---------|---------------|--------------|
| **D-P3-01** | Czy scraper w ogóle w P3? | tylko `licensed_api` vs API+scraper | **licensed_api first**; scraper = amend lub P3-B po Legal |
| **D-P3-02** | Pierwszy provider | obi / bricoman / psb / inny licensed | Owner wybór po P3-L |
| **D-P3-03** | Flaga | `kw-market-sync-01-p3` default OFF | **TAK** |
| **D-P3-04** | Trigger fetch | Manual Admin button only | **TAK** (cron OUT) |
| **D-P3-05** | Secrets | Brak w FE / Owner-provided file / Edge | Prefer **brak sekretów w FE**; plik/eksport operatora jeśli brak API |
| **D-P3-06** | Persist | Tylko staging FEATURE | **TAK** · bez DATA_KEYS |
| **D-P3-07** | Publish path | Tylko P1 `commit*` + KS | **ZERO DIFF** |
| **D-P3-08** | P2 history | Append przy Accept gdy P2 ON | **REUSE** · bez zmiany K-MS-4 |
| **D-P3-09** | N:M / publishFactor | IN vs OUT | **OUT** |
| **D-P3-10** | Legal blocker | DF bez Legal vs DF z gate | **IMPLEMENT live blocked** do Legal PASS |

### 8.3 Allowlist (szkic → DF)

```text
IN (P3-A szkic):
  src/lib/market-sync/types.ts              — sourceKind / SyncRun meta (thin)
  src/lib/market-sync/p3-flag.ts            — NOWY
  src/lib/market-sync/ingest-adapter.ts     — NOWY pure interface + mock
  src/lib/market-sync/ingest-run.ts         — NOWY: adapter → staging import wire
  src/app/market-sync/*                     — thin CTA „Pobierz (P3)” za flagą
  scripts/test-market-sync-01-p3-*.mjs      — NOWY
  docs/architecture/MARKET-SYNC-01-P3-*     — DF/OV/…

OUT:
  cloud-sync.ts · DATA_KEYS · Payroll* · Bid* · AI-COST*
  SMART commit/One-shot · applyMarketQuotes* poza commit
  cron / Edge scheduler · auto-publish
  N:M · publishFactor UI · average←history
```

### 8.4 Definition of Done (szkic AC-P3)

| ID | Kryterium |
|----|-----------|
| **AC-P3-L** | Legal pack udokumentowany · Owner Legal PASS/FAIL jawny |
| **AC-P3-1** | Legal GO + Owner GO przed live ingest |
| **AC-P3-2** | `sourceKind` licensed_api\|scraper tylko za flagą |
| **AC-P3-3** | Preview + Accept + commit · **0** auto-publish |
| **AC-P3-4** | Flaga default OFF → tip parity |
| **AC-P3-5** | Diff ⊆ allowlist · Gate ALL-NIE |
| **AC-P3-6** | Regresja P0/P1/P2 + K-MS-4 PASS |
| **AC-P3-7** | Kill Switch nadal default OFF |

### 8.5 Rollback (szkic)

```text
L1: localStorage P3 flag = '0'  → brak CTA ingest
L2: revert commitów allowlisty P3 (Owner GO)
L3: zakaz rollbacku P0–P2 / WC commit / SMART / Payroll „przy okazji”
```

---

## 9. Payroll Safety Gate (wstępny — FEATURE)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE flag + staging — nie LP)
G3 Cloud Sync:   NIE*  (*publish = istniejący commit* — ZERO rewrite cloud-sync)
G4–G9:           NIE

Wynik oczekiwany: ALL-NIE · FEATURE
Owner GO CORE: NIE (chyba że Edge secrets — wtedy osobny CORE brief)
```

---

## 10. Werdykt AUDIT

| Werdykt | Stan |
|---------|------|
| **P3 jest startowalny jako AUDIT** | **YES** (P0–P2 CLOSED · Owner GO) |
| **P3 startowalny jako IMPLEMENT live scrape/API** | **NO** — brak Legal PASS |
| **Rekomendowany NEXT** | Owner **ACCEPTED AUDIT** → **GO DESIGN FREEZE** (P3-A + Legal binding) **albo** najpierw **P3-L Legal pack** (docs) |
| **Zakaz** | IMPLEMENT · cron · auto-publish · multi-shop · CORE |

```text
AUDIT STATUS = READY (czekaj Owner ACCEPTED)
DESIGN FREEZE = NIE rozpoczęty
IMPLEMENT = NIE
COMMIT / PUSH = NIE
```

---

## 11. Owner checklist (przed GO DESIGN FREEZE)

```text
[ ] Akceptuję ten AUDIT (IN/OUT/ryzyka/slice’y)
[ ] Wybieram ścieżkę: (A) DF P3-A mock-first  OR  (B) najpierw P3-L Legal docs
[ ] Potwierdzam: zero auto-publish · zero daily cron w P3
[ ] Potwierdzam: N:M / publishFactor / SMART P3 / CM-04 P3 = OUT
[ ] Legal: PASS / HOLD / FAIL dla wybranego providera (lub „Legal w DF blocker”)
[ ] GO DESIGN FREEZE — osobne polecenie (nie ten dokument)
```

---

**AUDIT ONLY COMPLETE** · tip **2.65.95 / `18830c1`** · Docs HEAD **`99969f33`** · **WAITING FOR OWNER GO DESIGN FREEZE**
