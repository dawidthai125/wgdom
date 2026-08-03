# MARKET-SYNC-01 P2 — AUDIT

> **ID:** MARKET-SYNC-01-P2-AUDIT  
> **EPIC:** MARKET-SYNC-01 · **Slice:** **P2** — Historia cen · alerty Δ% · coverage retail · szablon providerów  
> **STATUS:** **AUDIT ACCEPTED** · DESIGN FREEZE → [`MARKET-SYNC-01-P2-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P2-DESIGN-FREEZE.md)  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH** · **NO CODE**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO AUDIT** MARKET SYNC **P2** · STATUS APPROVED · Owner pipeline **AUDIT ✅ → DESIGN FREEZE ▶**  
> **Parents:** [`MARKET-SYNC-01-AUDIT.md`](./MARKET-SYNC-01-AUDIT.md) · [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) · [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md) · [`MARKET-SYNC-01-P0-CLOSEOUT.md`](./MARKET-SYNC-01-P0-CLOSEOUT.md)  
> **Zależności CLOSED (REUSE):** MS P0+P1 · WC P3.2/P3.3 `commitMarketQuotesImport` · SMART-PRICING P0–P2 (consumer staging RO — **nie** ownership) · AI-COST-02 I3 CLOSED (nie scope)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P2 AUDIT — Historia + alerty + coverage

P0 = CLOSED (Model + Preview staging)
P1 = CLOSED (Accept + Publish · Kill Switch · commit* only)
P2 = PriceHistory · Δ% alerts · retail coverage · OBI/Bricoman template
OUT: scraper · auto-cron · full PSB sync · N:M (rekomendacja)
     · multi-undo · Bid/AI-COST · Cloud CORE · Payroll

Live tip: 2.65.95 / 869b4c5 (AI-COST-02 I3)
Owner: AUDIT ACCEPTED · DESIGN FREEZE FROZEN
NEXT: Owner ACCEPTED DF → GO IMPLEMENT (nie teraz)
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT P2

| Pytanie | Cel |
|---------|-----|
| Co oznacza P2 w EPIC? | PLAN §13.4 / AUDIT EPIC: *Historia cen · alerty Δ% · coverage retail · OBI/Bricoman **szablon*** |
| Dlaczego teraz? | P1 CLOSED · residual w CLOSEOUT · Owner GO AUDIT |
| Co REUSE? | Staging P0/P1 · Accept · Dry Run · `commitMarketQuotesImport` · Kill Switch · Preview UI |
| Co nie ruszać? | Drugi write Quotes · scraper · AI-COST · Bid · Cloud CORE · SMART Save |
| Jaki thin slice? | History ring + timeline/Δ% UX + coverage RO + template providerIds — **bez** full multi-shop sync |

**OUT tego AUDIT:** wireframe pixel · pełny DF · IMPLEMENT · Legal scraper pack (P3).

---

## 1. Production baseline

### 1.1 Live tip

```json
{
  "version": "2.65.95",
  "commit": "869b4c5",
  "timestamp": "2026-08-03T07:29:28.367Z"
}
```

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **UI** | **2.65.95** |
| **Live / feature tip** | **`869b4c5`** (AI-COST-02 I3 · flag OFF) |
| **SSOT tip** | [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) (wymaga sync docs po CLOSE I3 — poza scope P2 AUDIT) |
| **Protected Core** | **GREEN** |
| **Tryb** | **UTRZYMANIE** |
| **Aktywny IMPLEMENT** | **Brak** (po GO AUDIT P2) |

### 1.2 Domknięte zależności

| Slice | Status | Relacja do P2 |
|-------|--------|----------------|
| **MARKET-SYNC-01 P0** | **CLOSED** · `273fb3e0` / 2.65.84 | Model + Preview staging — **REUSE** |
| **MARKET-SYNC-01 P1** | **CLOSED** · `5326cf8c` / 2.65.85 | Accept + Publish + KS — **REUSE**; P2 było **OUT** |
| **WC P3.2 / P3.3** | CLOSED | `commitMarketQuotesImport` = **jedyny** write Quotes |
| **SMART-PRICING-01 P0–P2** | **CLOSED** | Czyta MS staging **RO** — P2 MS **nie** psuje kontraktu staging RO |
| **AI-COST-02 I3** | **CLOSED** · `869b4c52` | Competitiveness RO — **OUT** MS P2 |
| **CM-04 P3** | Backlog | **OUT** wzajemne |

### 1.3 Kontrakt residual z P1 CLOSEOUT

Z [`MARKET-SYNC-01-P1-CLOSEOUT.md`](./MARKET-SYNC-01-P1-CLOSEOUT.md):

> NEXT slice = P2 AUDIT — tylko po Owner GO (nie auto-start)  
> OUT P1: … PriceHistory · N:M · multi-undo · scraper …

Z [`MARKET-SYNC-01-PLAN.md`](./MARKET-SYNC-01-PLAN.md) **AC-P2**:

| AC | Treść (EPIC) |
|----|----------------|
| **AC-P2-1** | PriceHistory append przy Accept · cap |
| **AC-P2-2** | UI timeline / Δ% alert |
| **AC-P2-3** | Szablon `providerId` (obi/bricoman/psb) — bez pełnego sync produkcyjnego |
| **AC-P2-4** | K-MS-4 PASS (historia nie wpływa na average) |

Z EPIC AUDIT slice table:

> **P2** = Historia cen · alerty Δ% · coverage retail · OBI/Bricoman **szablon** (nie full sync) · OUT: PSB full · scraper

**Wniosek:** P2 = **nowy thin slice** pod MARKET-SYNC-01 (nie re-open P1 AC bez amend).

---

## 2. AS-IS (kod po P1)

| Obszar | Stan | Uwaga P2 |
|--------|------|----------|
| `src/lib/market-sync/*` | Import · Match · Preview · Accept · Guard · Dry Run · Publish · Undo · Kill Switch | **REUSE** — rozszerzać, nie fork |
| `MarketSyncStagingStore` · `kw-market-sync-01-staging` | Local FEATURE | Naturalny dom **PriceHistory** (lub osobny klucz FEATURE) |
| `MarketProduct.linkedWorkIds` | **N:1** (max 1) | N:M = residual — **rekomendacja OUT P2** |
| `ProviderId` | już: `leroy` \| `castorama` \| `obi` \| `bricoman` \| `psb` \| `other` | Szablon P2 = typy/UX, **nie** full feed ops |
| `MARKET_SYNC_PUBLISH_FACTOR` | const `1.0` | UI factor = residual — OUT lub osobny Owner GO |
| `PriceHistory` | **brak** w types/store | **PRIMARY gap P2** |
| Timeline / Δ% alert UI | Δ w Preview częściowo (P1) · brak history ring | **PRIMARY UX P2** |
| Coverage retail panel | brak dedykowanego | RO KPI ops |
| Kill Switch · `commitMarketQuotesImport` | P1 | **ZERO DIFF semantyki** (P2 nie nowy write path) |
| SMART Evidence staging | RO consumer | Zakaz mutacji kontraktu staging w sposób łamiący SMART |

**Luka produktowa:** Admin po Accept/Publish **nie** ma trwałej historii cen produktu×provider ani alertów Δ% / coverage retail — to jest P2.

---

## 3. Definicja P2 (AUDIT — do zamrożenia w PLAN/DF)

### 3.1 IN (propozycja Thin)

| IN | Opis |
|----|------|
| **PriceHistory** | Append-only ring przy **Accept** (nie przy samym Import) · cap DF (EPIC: np. 24 punkty / produkt×provider) |
| **Historia ≠ average** | History **nie** jest wejściem do `computeMarketAverageForWork` (AC-6 / K-MS-4) |
| **UI timeline** | Widok historii / last N punktów w Preview / panel Market Sync |
| **Alerty Δ%** | Wyróżnienie gdy \|Δ%\| ≥ próg (EPIC szkic 10%) — **nie** blokada Publish |
| **Coverage retail RO** | Prosty panel: % matched · accepted · published · linked works (KPI ops) |
| **Szablon providerów** | `obi` / `bricoman` (/ opc. `psb` jako stub) — typy · empty CSV template · **bez** produkcyjnego full sync |
| **Testy + flaga** | Pure helpers · regresja P0/P1 · feature gate default OFF (lub sekcja za istniejącym UI Super Admin) |
| **Docs** | PLAN/DF → … → CLOSE po ścieżce release |

### 3.2 OUT (twarde — rekomendacja AUDIT)

| OUT | Powód |
|-----|--------|
| **Scraper / licensed API / cron / auto-publish** | P3 + Legal GO |
| **Pełny sync produkcyjny OBI/Bricoman/PSB** | Tylko szablon w P2 |
| **Drugi tor zapisu Quotes** (`applyMarketQuotes*` poza commit) | EPIC AC-2 · P1 FROZEN |
| **Zmiana semantyki Kill Switch / default ON** | P1 safety |
| **N:M `linkedWorkIds`** | Residual P1 — osobny thin lub OUT P2 (**rek. OUT**) |
| **Multi-undo / cloud rollback engine** | OUT P1 |
| **`publishFactor` UI / kalibracja ceny** | IMPROVEMENT · R9 |
| **Fuzzy match ON** | P0/P1 zakaz |
| **AI-COST / Bid / Scoring / Parser** | EPIC OUT |
| **Cloud Sync CORE / `cloud-sync.ts` / nowy DATA_KEYS** | Gate · prefer staging FEATURE |
| **Payroll** | Gate |
| **SMART Save / One-shot / Evidence rewrite** | Ownership SMART |
| **CM-04 P3 / Wave 2** | Osobne GO |
| **DIY `enabledOrigins` default ON** | Chroni Bid — osobny Owner GO |

---

## 4. Boundary SMART-PRICING (zamrożony kontekst)

| | SMART-PRICING | MARKET-SYNC P2 |
|--|---------------|----------------|
| Staging | **RO** Evidence (P2 SMART CLOSED) | **Owner** staging + opc. history write |
| Quotes write | OUT (SMART P3) | **Tylko** istniejący P1 `commit*` path (P2 nie nowy) |
| Cel | Brak ceny w wycenie | Ops sync + historia produktu |

**Zakaz P2 MS:** łamać fingerprint / RO contract staging używany przez SMART.  
**Dozwolone:** append PriceHistory w store FEATURE **obok** istniejących produktów/quotes staging.

---

## 5. Blast radius

### 5.1 IN (oczekiwany)

| Obszar | Ryzyko | Mitigacja |
|--------|--------|-----------|
| `src/lib/market-sync/types.ts` + store | Schema staging | Cap · migrate soft · brak DATA_KEYS |
| `accept.ts` (append history) | Side-effect Accept | Pure append · test idempotencji |
| `MarketSyncPreviewPanel.tsx` | Clutter | Timeline accordion · flaga/sekcja |
| Nowy `price-history.ts` / coverage helper | Duplikacja Δ | REUSE delta P1 gdzie możliwe |
| Template CSV stubs | Noise | Docs + fixture only |

### 5.2 OUT (STOP)

| Obszar | Powód |
|--------|-------|
| `commit-market-quotes.ts` rewrite | Ownership WC |
| `tenders-bid-calculator.ts` · pricing engine | OUT |
| `cloud-sync.ts` · Payroll\* | CORE |
| SMART `commit*` / One-shot | Ownership |
| `market-average-engine` (użycie history jako input) | K-MS-4 zakaz |

---

## 6. Allowlist (propozycja → DF)

```text
IN:
  src/lib/market-sync/types.ts          — PriceHistory types · cap consts
  src/lib/market-sync/staging-store.ts  — persist history (FEATURE LS)
  src/lib/market-sync/accept.ts         — append history on Accept (thin)
  src/lib/market-sync/price-history.ts  — NOWY pure (cap · query · Δ%)
  src/lib/market-sync/coverage.ts       — NOWY pure RO KPI (opc.)
  src/lib/market-sync/index.ts          — re-export
  src/app/market-sync/MarketSyncPreviewPanel.tsx — timeline · alerts · coverage
  (opc.) src/app/market-sync/* thin components
  scripts/test-market-sync-01-p2-*.mjs
  fixtures template CSV obi/bricoman (opc.)
  docs/architecture/MARKET-SYNC-01-P2-*

OUT:
  commit-market-quotes rewrite · applyMarketQuotes direct
  cloud-sync · Payroll · Bid · AI-COST · SMART Save
  scraper adapters · cron · N:M (jeśli Owner OUT)
  average-engine input z PriceHistory
```

---

## 7. Thin Slice (rekomendacja)

```text
THIN P2 (jedna paczka):
  1) PriceHistory model + cap + persist FEATURE
  2) Append on Accept (P1 Accept path)
  3) Pure: last price / Δ% / alert threshold
  4) UI: timeline + Δ% highlight + coverage RO strip
  5) Provider template stubs (obi/bricoman) — bez full sync
  6) Testy: history · K-MS-4 · regresja P0/P1 publish
  7) Docs PLAN/DF→…→CLOSE

NIE W THIN:
  scraper · N:M · multi-undo · publishFactor UI · PSB full
  · enabledOrigins DIY ON · nowy DATA_KEY Cloud
```

### Semantyka flag / gate (rekomendacja AUDIT)

| Opcja | Opis | Werdykt AUDIT |
|-------|------|----------------|
| **A** | Sekcja P2 zawsze w Market Sync UI (Super Admin) · history lokalna | Prostsze ops |
| **B** | Osobna LS `kw-market-sync-01-p2-history` default OFF | **Rekomendowana** izolacja |
| **C** | P2 UI wymaga `MARKET_SYNC_PUBLISH_ENABLED` | Zbyt ciasne (historia ≠ publish) |

**Rekomendacja DF:** **B** (UI history/coverage za flagą OFF; Accept może nadal append gdy ON — DF zamrozi).

---

## 8. Ryzyka

| ID | Ryzyko | Sev | Mitigacja |
|----|--------|-----|-----------|
| **R-P2-01** | History wchodzi do average → drift Bid | **P0** | K-MS-4 · test · zakaz importu w engine |
| **R-P2-02** | Drugi write Quotes „dla wygody” | **P0** | Allowlist · jedyny `commit*` |
| **R-P2-03** | Scope creep → scraper / N:M / multi-shop full | **P0** | OUT §3.2 · Thin §7 |
| **R-P2-04** | Staging schema break → SMART Evidence | **P1** | Soft migrate · ZERO breaking RO fields |
| **R-P2-05** | LS bloat history | **P1** | Cap ring · prune |
| **R-P2-06** | False Δ% alert → panic Admin | **P2** | Highlight only · nie blokuj |
| **R-P2-07** | Payroll/Cloud accidental | **P0** | Gate ALL-NIE |

---

## 9. Payroll Safety Gate (przewidywany)

```text
PAYROLL SAFETY GATE — MARKET-SYNC-01 P2
G1 Payroll:      NIE
G2 LS CORE schema/budget: NIE  (FEATURE staging/history OK)
G3 Cloud Sync:   NIE*  (*publish Quotes = istniejący P1 commit path — nie rewrite cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE
Wynik: ALL-NIE (jeśli diff ⊆ allowlist · brak nowego DATA_KEY)
```

---

## 10. Definition of Done (propozycja → DF)

| ID | Kryterium |
|----|-----------|
| **AC-MS-P2-1** | Diff ⊆ allowlist |
| **AC-MS-P2-2** | PriceHistory append przy Accept · cap respektowany |
| **AC-MS-P2-3** | History **nie** wpływa na `computeMarketAverageForWork` (K-MS-4) |
| **AC-MS-P2-4** | UI timeline + Δ% alert (próg DF) |
| **AC-MS-P2-5** | Coverage retail RO (min. matched/accepted/published KPI) |
| **AC-MS-P2-6** | Szablon provider OBI/Bricoman — **bez** full sync produkcyjnego |
| **AC-MS-P2-7** | **0** nowy tor Quotes · Publish nadal tylko `commitMarketQuotesImport` + KS |
| **AC-MS-P2-8** | Regresja P0 Preview + P1 Accept/Publish smoke PASS |
| **AC-MS-P2-9** | Flaga/sekcja default OFF (parity tip gdy OFF) |
| **AC-MS-P2-10** | Gate ALL-NIE · brak scraper/cron/N:M (jeśli OUT) |
| **AC-MS-P2-11** | Staging RO fields używane przez SMART — bez breaking change |

### Anti-AC

| ID | Anti |
|----|------|
| **AC-X1** | Auto-publish / cron |
| **AC-X2** | Scraper bez Legal GO |
| **AC-X3** | Bid == target PLN |
| **AC-X4** | DIY enabledOrigins default ON |

---

## 11. Rollback

| Warstwa | Akcja |
|---------|--------|
| **Flag / UI OFF** | Brak timeline/coverage · tip parity |
| **Git** | revert thin P2 — Quotes already published pozostają (P1 path); history local only |
| **Quotes / Bid / OfferBoq** | nietknięte przez sam rollback history UI |

**Rollback cost:** niski (FEATURE history) · **uwaga:** opublikowane Quotes = P1, nie cofane przez P2 OFF.

---

## 12. Owner Verification (szkic → DF)

| # | Check |
|---|-------|
| **OV-1** | P2 OFF → brak timeline/coverage P2 · Preview P0/P1 OK |
| **OV-2** | Accept → wpis PriceHistory (gdy P2 ON) |
| **OV-3** | Cap historii egzekwowany |
| **OV-4** | Δ% alert widoczny przy dużym skoku · Publish nie zablokowany samym alertem |
| **OV-5** | Coverage RO czytelne |
| **OV-6** | Template OBI/Bricoman dostępny · brak pełnego sync prod |
| **OV-7** | Publish nadal KS + `commit*` only |
| **OV-8** | Average/controlled_market bez inputu z PriceHistory |
| **OV-9** | SMART staging Evidence (gdy flagi SMART) nie regresuje |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE |

---

## 13. Otwarte decyzje Ownera (O-MS-P2-*) — **ZAMKNIĘTE w DF**

| ID | Decyzja | Status |
|----|---------|--------|
| **O-MS-P2-01** | Cap = **24** | **FROZEN** → DF D-P2-01 |
| **O-MS-P2-02** | Próg Δ% = **10** | **FROZEN** → D-P2-02 |
| **O-MS-P2-03** | Flaga **`kw-market-sync-01-p2`** default OFF | **FROZEN** → D-P2-03 |
| **O-MS-P2-04** | N:M = **OUT P2** | **FROZEN** → D-P2-04 |
| **O-MS-P2-05** | `psb` = stub only | **FROZEN** → D-P2-05 |
| **O-MS-P2-06** | Persist w staging store | **FROZEN** → D-P2-06 |
| **O-MS-P2-07** | Append on **Accept** | **FROZEN** → D-P2-07 |
| **O-MS-P2-08** | Następny = **DESIGN FREEZE** | **DONE** |

---

## 14. Rekomendacja DESIGN FREEZE / PLAN

```text
Werdykt AUDIT:
  P2 = READY FOR DESIGN FREEZE (lub PLAN jeśli Owner chce rozwinąć O-*)
  IMPLEMENT = ZABLOKOWANY do Owner GO DF + GO IMPLEMENT
  Thin = PriceHistory + Δ% + coverage RO + provider templates
  OUT = scraper · N:M · full multi-shop · drugi Quotes path · Cloud CORE
```

| Decyzja | Rekomendacja |
|---------|--------------|
| **Czy robić P2?** | **TAK** — residual EPIC · P1 CLOSEOUT |
| **Czy teraz IMPLEMENT?** | **NIE** — najpierw **DF** (lub PLAN) |
| **Czy łączyć ze SMART P3 / CM-04 P3?** | **NIE** |
| **Czy scraper?** | **NIE** (P3) |
| **Sukces AC** | Historia + alerty + coverage · **nie** Δ Bid PLN |

---

## 15. Owner Acceptance Checklist

```text
[x] Akceptuję IN §3.1 / OUT §3.2
[x] Akceptuję Thin Slice §7 · allowlist §6
[x] Akceptuję boundary SMART §4 · K-MS-4 (history ≠ average)
[x] Akceptuję DoD §10 · Rollback §11 · OV §12
[x] Potwierdzam: brak IMPLEMENT / commit / push w etapie AUDIT
[x] Następny krok: DESIGN FREEZE → MARKET-SYNC-01-P2-DESIGN-FREEZE.md
```

---

## 16. Werdykt

**MARKET-SYNC-01 P2 AUDIT = ACCEPTED**

- Tip **2.65.95** / **`869b4c5`** · Core **GREEN**  
- DF: [`MARKET-SYNC-01-P2-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P2-DESIGN-FREEZE.md) · **FROZEN**  
- **Czekam na:** Owner **ACCEPTED DF** → **GO IMPLEMENT**  

**Nie** IMPLEMENT · **nie** commit · **nie** push bez osobnego GO.
