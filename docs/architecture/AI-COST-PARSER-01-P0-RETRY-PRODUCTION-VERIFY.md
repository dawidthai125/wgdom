# AI-COST-PARSER-01 — P0-RETRY · PRODUCTION VERIFY FINAL

> **ID:** AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY  
> **Data:** 2026-07-29  
> **STATUS:** **PASS · FINAL**  
> **Tip prod:** **2.65.77** / commit **`e88d689`** (`version.json` timestamp `2026-07-29T08:11:14.848Z`)  
> **DF §6.2** · Fixture: `08dee178-1010-dbe7-ebd1-650001a84a9f`  
> **Evidence:** `.tmp/pv-ai-cost-parser-01-p0-retry.json`

```text
════════════════════════════════════════════════════════
P0-RETRY SUCCESS = Ponów nie jest no-op + świeży Heavy.
Dodatkowo na fixture: unpack OK → ATH → kosztorys.ok.
════════════════════════════════════════════════════════
```

---

## 1. Release gate

| Check | Wynik |
|-------|--------|
| Commit allowlisty | **`e88d689f`** `feat(tenders): P0-RETRY soft-invalidate F2 Ponów on terminal ZIP unpack fail` |
| Push | **`origin/main`** (`7269db1d..e88d689f`) |
| Deploy | Vercel Git Integration |
| Live tip | `version.json` → `commit: e88d689` · `version: 2.65.77` (bez bump changelog — poza DF) |

---

## 2. Unit / regresja (pre-PV)

| ID | Wynik |
|----|--------|
| T1–T3 soft-invalidate | **PASS** |
| T4 ZIP-UNPACK copy | **PASS** |
| T5 Force healthy | **PASS** |

---

## 3. BEFORE (KV READ ONLY)

| Pole | Wartość |
|------|---------|
| `scanSummary.parsedAt` | `2026-07-28T19:02:03.820Z` |
| `builtAt` | `2026-07-28T19:02:03.820Z` |
| `zipUnpackOk` | `false` |
| `zipInnerCount` | `0` |
| `costDiscovery.found` | `false` |
| `kosztorys` | `null` |
| `forceHeavyRescanAt` | `null` |
| Predykat soft-invalidate | **true** (eligible) |

---

## 4. Live action

| Step | Wynik |
|------|--------|
| Route | `/przetargi/08dee178…` (TRE-01 Outcome — `data-cost-regression-reparse-cta`) |
| UI | `data-cost-regression-discovery=parse_failed` · `data-cost-parser-zip-state=unpack_failed` |
| Click | **„Ponów analizę kosztorysu”** — `true` |
| Soft-invalidate | `forceHeavyRescanAt=2026-07-29T08:30:46.781Z` w LS w ~5s |
| Heavy | E-RUN wystartował (force stamped → cleared → nowy `parsedAt`) |

---

## 5. AFTER (KV po coalesce)

| Pole | BEFORE | AFTER |
|------|--------|-------|
| `parsedAt` | `2026-07-28T19:02:03.820Z` | **`2026-07-29T08:31:41.912Z`** (nowy) |
| `builtAt` | `2026-07-28T19:02:03.820Z` | **`2026-07-29T08:31:41.912Z`** |
| `zipUnpackOk` | `false` | **`true`** |
| `zipInnerCount` | `0` | **`20`** |
| `zipCostInnerPresent` | — | **`true`** |
| `discoverBestCostDocument` | `found:false` | **`found:true`** · `type:zip_ath` · confidence `0.99` |
| Discovery source | — | `Dokumentacja Techniczna ZADANIE 2.zip → Łukasińskiego 6 lok. 16 - budowlany - zestawienie prac do wykonania.ath` |
| `parseDocumentToKosztorys` | brak | ATH OK — **80** wierszy / **80** catalogQuantities |
| `kosztorys.ok` | `null` | **`true`** |
| `kosztorys.sourceFilename` | — | `Łukasińskiego 6 lok. 16 - budowlany - zestawienie prac do wykonania.ath` |
| Branch artifacts | 0 | **12** ATH winners (wszystkie `ok:true`) |
| `costCandidateSources` | — | **12** ścieżek ZIP→ATH |

---

## 6. Checklist DF §6.2

| Check | Status |
|-------|--------|
| Ponów → Heavy startuje | **PASS** (`forceHeavyRescanAt` stamped) |
| `parsedAt` ≠ historyczny | **PASS** |
| `zipInnerCount > 0` | **PASS** (`20`) |
| `zipUnpackOk` | **PASS** (`true`) |
| Discovery | **PASS** (`zip_ath` / found) |
| `parseDocumentToKosztorys` | **PASS** (ATH → 80 rows) |
| Rezultat końcowy kosztorysu | **PASS** (`kosztorys.ok===true`) |

---

## 7. Werdykt

| | |
|--|--|
| P0-RETRY (odblokowanie Heavy) | **PASS** |
| Unpack na świeżym Heavy | **PASS** (`zipUnpackOk=true`) — **brak potrzeby RCA unpack / nowego DF unpack** |
| Production Verified FULL | **TAK** |
| T6 (OPS live) | **PASS** |

**Wniosek OPS:** wcześniejszy fail na `08dee178` = **stale historical Heavy snapshot** (klasa A∪B w momencie starego runu), **nie** aktywny bug Edge/JSZip na tipie `e88d689`. Po soft-invalidate unpack i ATH pipeline działają.

---

## 8. Scope discipline

Bez zmian parserów / discovery rewrite / Bid / Payroll / Cloud / telemetrii A/B/C/D w tym PV.
