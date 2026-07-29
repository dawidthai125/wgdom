# CENY-MATERIAŁÓW-04 — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-04-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`CENY-MATERIAŁÓW-04-PLAN.md`](CENY-MATERIAŁÓW-04-PLAN.md) · COMPLETE **PASS**  
> **AUDIT:** [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) · **PASS** (NO_RECORDS)  
> **Tip bazowy:** UI **2.65.80** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależności CLOSED:** CENY-MATERIAŁÓW-01 · WORK-CATALOG-P3.3 · COST-02-A

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-04 (DATA / OPS)
        z SSOT · zasady projektu · pipeline P3.3 AS-IS
WERDYKT: PASS
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| AUDIT (CM-03) | **PASS** · READY FOR PLAN |
| PLAN (CM-04) | **PASS** · READY FOR DF |
| DESIGN FREEZE | **PASS** · FROZEN · READY FOR AR |
| Kod / diff IMPLEMENT | **brak** (review docs + AS-IS `commitMarketQuotesImport`) |
| Owner GO OPS / IMPLEMENT | **oczekuje** na ten raport |

**Metoda:** DF vs tip SSOT · weryfikacja istnienia `commitMarketQuotesImport` · REUSE P3.3/WC/COST-02-A · P0–P3 · KPI · OUT · rollback · Gate · #CORE-013/014.

---

## 1. Zgodność DESIGN FREEZE z SSOT

| SSOT / kontrakt | DF | Werdykt |
|-----------------|-----|---------|
| Tip tylko w `09` | Baseline **2.65.80** · DF nie bumpuje tipu | **PASS** |
| WC SSOT `kw-wgdom-work-catalog` | D-A · `marketQuotes` na works | **PASS** |
| P3.3 CLOSED — jedyny UI commit Quotes | D-A · wyłącznie `commitMarketQuotesImport` | **PASS** (symbol w tip: `src/lib/work-catalog/commit-market-quotes.ts`) |
| `computeMarketAverageForWork` | Pipeline §3 DF — odczyt AS-IS | **PASS** |
| `controlled_market` (COST-02-A) | Konsument AS-IS · bez semantyki | **PASS** |
| OfferBoq provider order | D-B zakaz reorder / nowych providerów | **PASS** |
| CENY-MATERIAŁÓW-01 CLOSED | D-B zakaz re-open mapping/AI-COST | **PASS** |
| AI-COST-01 Freeze / Bid OUT | §10 OUT | **PASS** |
| GAP-B NOT RECOMMENDED | OUT GAP-B / Kp / marża | **PASS** |
| Anti-AC 1,6M | OUT | **PASS** |

**Wniosek §1:** DF **nie koliduje** z SSOT tip · WC · P3.3 · COST-02-A · Freeze AI-COST · CM-01 CLOSED.

---

## 2. Zasady projektowe

| Zasada | Ocena | Dowód |
|--------|-------|--------|
| **SSOT FIRST** | **PASS** | Jedyny zapis Quotes = commit P3.3 → `works[].marketQuotes`; jedna średnia Engine |
| **REUSE FIRST** | **PASS** | preview + `commitMarketQuotesImport` + coverage S5 + controlled_market — **zero** nowego toru zapisu |
| **ZERO DUPLICATE LOGIC** | **PASS** | Zakaz drugiej ścieżki zapisu Quotes · zakaz scrapera · zakaz nowego providera / drugiej średniej |
| **MOBILE FIRST** | **PASS** | Brak nowego dashboardu · ops w istniejącej Bibliotece (P3.3 S6 już CLOSED) |
| **Payroll Safety Gate** | **PASS** | DF §0 ALL-NIE · FEATURE-DATA/OPS |
| **#CORE-013 / #CORE-014** | **PASS** | Brak CORE · `cloud-sync.ts` na blokliście · preferencja 0 LOC silnika (D-H) |

---

## 3. Jedyny tor zasilania Quotes

| Check | Werdykt |
|-------|---------|
| CSV → preview → **`commitMarketQuotesImport`** → WC → `marketQuotes` | **PASS** (D-A FROZEN) |
| Zakaz omijania commit (zapis „na czuja” / poza routerem) | **PASS** (DF §3 MUST NOT) |
| Zakaz scrapera / live API cen | **PASS** (§10 OUT) |
| Odczyt: `computeMarketAverage` → `controlled_market` → OfferBoq | **PASS** (AS-IS · bez zmian konsumenta) |

**AS-IS potwierdzenie:** `export async function commitMarketQuotesImport` istnieje w tip (`commit-market-quotes.ts`) i jest kontraktowym jedynym zapisem importu z UI (P3.3 DF/IC).

**Wniosek §3:** Architektura zasilania jest **jednoznaczna i REUSE-only**.

---

## 4. P0 — Quotes @ 34

| Check | Werdykt |
|-------|---------|
| Scope = istniejące 34 · bez nowych works (D-C) | **PASS** |
| Zasilanie wyłącznie `commitMarketQuotesImport` | **PASS** |
| Product Quotes ≥80% · legacy_seed nie liczy się do K-P0-1 (D-D) | **PASS** |
| Brak nowych providerów | **PASS** |
| Brak zmian AI-COST | **PASS** (D-B) |
| KPI K-P0-1…3 + rollback L1–L3 | **PASS** |

**Uwaga nieblokująca (IC-1):** P0 jest **OPS/dane**; AR **APPROVES** start po Owner GO bez wymogu commit kodu — o ile runbook respektuje D-A/D-D.

---

## 5. P1 — Chodniki · ogrodzenia · elewacje

| Check | Werdykt |
|-------|---------|
| Kolejność sztywna: chodniki → ogrodzenia → elewacje (D-E) | **PASS** |
| Cap 3–12 robót / grupę | **PASS** |
| Quotes obowiązkowe w tym samym slice (D-F) | **PASS** |
| Brak re-open CM-01 scoring | **PASS** |
| KPI K-P1-1…3 (unmatched top-3 ≤50% baseline) | **PASS** |
| P1 CLOSE wymaga P0 PASS | **PASS** (DF §4 zależność) |

---

## 6. P2 — Rozbiórki · instalacje

| Check | Werdykt |
|-------|---------|
| IN = rozbiórki + instalacje depth | **PASS** |
| OUT = nowe branże ad hoc / parser rewrite | **PASS** |
| Quotes 100% na nowych (D-F) | **PASS** |
| KPI częstości unmatched (K-P2-1) | **PASS** |

---

## 7. P3 — INNE

| Check | Werdykt |
|-------|---------|
| Triaż ręczny (D-G) | **PASS** |
| Zakaz automatycznego / ślepego seed | **PASS** |
| Progi mikro-grupy (≥50 k ∧ (≥5 linii ∨ ≥2 przetargi)) | **PASS** |
| Parser = ticket outbound, nie scope 04 | **PASS** |
| KPI K-P3-1 ≥70% top opisów przypisanych | **PASS** |

---

## 8. OUT — potwierdzenie

| OUT | AR |
|-----|-----|
| Zmiany AI-COST | **PASS** — zakaz |
| Zmiany heurystyk | **PASS** — zakaz |
| Bid Calculator | **PASS** — zakaz |
| Cloud Sync CORE | **PASS** — zakaz |
| Nowi providerzy / reorder | **PASS** — zakaz |
| Scrapery | **PASS** — zakaz |
| GAP-B · Kp · marża · 1,6M | **PASS** — zakaz |
| Nowe tabele / SKU / DATA_KEYS | **PASS** — zakaz |

---

## 9. Rollback L1–L3

| Etap | L1 | L2 | L3 | AR |
|------|----|----|----|-----|
| **P0** | P3.3 Rollback importu | Backup JSON katalogu | Akceptacja NO_RECORDS | **PASS** |
| **P1** | `active=false` nowych | Rollback Quotes + usunięcie works | Restore tip | **PASS** |
| **P2** | Jak P1 | Jak P1 | Restore tip | **PASS** |
| **P3** | Docs-only = no-op | Jak P1 jeśli mikro-grupa | — | **PASS** |

Rollback jest **adekwatny** do klasy FEATURE-DATA (REUSE P3.3 L1).

---

## 10. KPI P0–P3

| Etap | KPI DF | Mierzalność | AR |
|------|--------|-------------|-----|
| P0 | ≥80% product Quotes · CM > 0% · 0 regresji | Probe WC + CM-02bis | **PASS** |
| P1 | Unmatched top-3 ≤50% · ≥3 works/grupę · Quotes 100% | Probe gap + katalog | **PASS** |
| P2 | Częstość unmatched rozbiórek ≤50% linii · depth works | Probe | **PASS** |
| P3 | ≥70% top INNE sklasyfikowane · 0 auto-seed | Ops lista + review | **PASS** |

**Uwaga nieblokująca (IC-2):** Top-N / „najczęstsze opisy INNE” dla K-P3-1 — AR wymaga, by Owner GO / runbook **jawnie ustalił N** (np. top 50 opisów po PLN) przed CLOSE P3; nie blokuje APPROVAL.

**Uwaga nieblokująca (IC-3):** Cel roboczy CM ≥10% (K-P0-2) jest orientacyjny — **PASS** wymaga tylko **> 0%**; 10% = soft target PV.

---

## 11. Boundary / Gate

| Check | Wynik |
|-------|--------|
| Klasa FEATURE-DATA / OPS | **PASS** |
| Gate G1–G9 ALL-NIE | **PASS** |
| Edycja Edge / cloud-sync / Payroll? | **NIE** |
| Nowa trasa / bootstrap? | **NIE** |
| Preferencja 0 LOC silnika (D-H) | **PASS** |

**Boundary:** **PASS**.

---

## 12. IMPLEMENT / OPS CONSTRAINTS (wiążące po GO)

| ID | Constraint |
|----|------------|
| **IC-1** | P0 może być czystym OPS (bez commit kodu) — **musi** używać wyłącznie `commitMarketQuotesImport` |
| **IC-2** | Przed CLOSE P3: ustalić N dla „najczęstszych opisów INNE” |
| **IC-3** | K-P0-2 hard = CM **> 0%**; ≥10% = soft |
| **IC-4** | MUST NOT edit AI-COST / Bid / cloud-sync / pricing-engine / CM-01 mapping |
| **IC-5** | MUST NOT CLOSE P1/P2 grupy bez product Quotes na **100%** nowych robót |
| **IC-6** | P1 nie startuje CLOSE bez P0 PASS |

---

## 13. Ryzyko wdrożenia

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| CSV nie mapuje `legacy-*` | Śr | Preview · aliasy · 80% matched gate |
| Works bez Quotes | Niski przy D-F | Gate CLOSE |
| Fałszywy match P1 | Śr | Cap 3–12 · złote opisy · Owner review |
| Scope creep INNE | Niski przy D-G | Progi mikro-grupy |
| Regresja cen po Quotes | Niski | K-P0-3 · rollback L1 |

**Ryzyko EPIC:** **NISKIE** (dane + REUSE · default flagi tip OFF).

---

## 14. Checklist końcowa

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | DF ↔ SSOT WC/P3.3/OfferBoq/CM-01? | **PASS** |
| 2 | SSOT · REUSE · ZERO DUP · MOBILE · Gate? | **PASS** |
| 3 | Jedyny zapis Quotes = commit P3.3? | **PASS** |
| 4 | P0–P3 zgodne z DF/AUDIT? | **PASS** |
| 5 | OUT twarde? | **PASS** |
| 6 | Rollback L1–L3? | **PASS** |
| 7 | KPI P0–P3? | **PASS** (+ IC-2/IC-3) |
| 8 | Boundary FEATURE-DATA? | **PASS** |

---

## 15. Werdykt

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 ARCHITECTURE REVIEW COMPLETE
Werdykt: PASS
Decyzja: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **Decyzja** | **APPROVED FOR OWNER GO** |
| **Nie** | ARCHITECTURE CHANGES REQUIRED |
| **Uwagi** | IC-1…IC-6 nieblokujące — **wiążące przy OPS/IMPLEMENT** |

**Blokada OPS masowego / IMPLEMENT:** do jawnego **Owner GO** (rekomendacja: najpierw **GO OPS P0**).

---

**AR STATUS:** **COMPLETE** · **APPROVED FOR OWNER GO**
