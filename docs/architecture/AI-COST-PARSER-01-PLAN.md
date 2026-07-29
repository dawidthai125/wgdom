# AI-COST-PARSER-01 — PLAN (F2 soft-invalidate / re-Heavy)

> **ID:** AI-COST-PARSER-01-PLAN · slice **P0-RETRY**  
> **MODE:** **PLAN ONLY** · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **Baseline tip:** **2.65.77** / **`a061bbd`** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Wejście:** AUDIT pipeline · OPS VERIFY (sesja 2026-07-29) · DF ZIP-UNPACK [`COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md`](COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md)  
> **Fixture:** `08dee178-1010-dbe7-ebd1-650001a84a9f` · `08ded027-195e-191c-5fad-9500015f883f`

```text
════════════════════════════════════════════════════════
CEL PLANU (jeden concern):
  Przy terminalnym zipUnpackOk=false ∧ heavyParseDone
  CTA „Ponów analizę” MUSI uruchomić prawdziwy Heavy E-RUN
  (REUSE ścieżki forceHeavyRescanAt — ZERO drugiej pętli).

NIE: naprawa unpack Edge/JSZip · A/B/C/D telemetry · Bid · parsers
════════════════════════════════════════════════════════
```

---

## 0. Status procesu

```text
[DONE]  AUDIT          — unpack fail vs Edge OK; PRIMARY = brak innerów w sesji Heavy
[DONE]  OPS VERIFY     — 08dee178 = stary snapshot; Ponów = no-op przy heavyParseDone
[NOW]   PLAN           — TEN DOKUMENT
[NEXT]  DESIGN FREEZE  — thin P0-RETRY (po akceptacji PLAN)
[NEXT]  Arch Review · Owner GO IMPLEMENT
[THEN]  IMPLEMENT → TEST → COMMIT (na prośbę) → PUSH → OPS re-verify fixtures
```

**Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE LOGIC · MOBILE FIRST · **#CORE-013** (FEATURE only — zero Payroll / `cloud-sync.ts`).

---

## 1. Problem (SSOT z OPS)

| Fakt | Dowód |
|------|-------|
| `08dee178` zamrożony | `parsedAt` / `builtAt` = `2026-07-28T19:02:03.820Z` · bez zmian po tip 2.65.77 |
| `heavyParseDone === true` | `parserVersion===4` ∧ `scanSummary.parsedAt` ∧ brak `forceHeavyRescanAt` |
| F2 CTA = „Ponów” | `primaryCta: reparse` · copy stan A |
| Force Heavy Rescan CTA | **niewidoczne** — wymaga `kosztorys.ok` |
| `retryDossierParse` | tylko `retryNonce++` |
| E-RUN | `if (!forceActive && heavyParseDone) return` → **SKIP** |
| Edge dziś | ZIP Z1/Z2: 6+6 ATH · parser ATH 46 rows |

**Root cause ops (ten PLAN):** manual retry F2 **nie** ustawia soft-invalidate → nie ma prawdziwego re-Heavy → nie da się potwierdzić/wykluczyć unpack na tipie.

---

## 2. Minimalny sposób ponownego Heavy (IN)

### 2.1 Decyzja architektoniczna (PLAN)

```text
REUSE FIRST:
  Przy F2 „Ponów” JEŚLI terminalny ZIP unpack fail
  → wywołaj ISTNIEJĄCĄ ścieżkę soft-invalidate:
       applyForceHeavyRescanAt(dossier)
       + retryNonce++
       (+ clear inflight / flags jak dziś w forceHeavyRescan)

  NIE buduj drugiej pętli Heavy.
  NIE czyść ręcznie parsedAt ad-hoc (omija SSOT force path).
  NIE zmieniaj semantyki Force CTA dla healthy dossier (kosztorys.ok).
```

**Dlaczego force path:** już ustawia `forceHeavyRescanAt` → `tenderDossierHeavyParseDone=false` → E-RUN z `forceActive` → `existingDossierForBuild=null` → pełny cost phase + unpack (w tym 1× auto-retry COST-PARSER-01).

### 2.2 Predykat terminalnego A (kontrakt)

```text
shouldSoftInvalidateOnF2ZipRetry(dossier, docs) === true  IFF

  1) hasTopLevelZip(docs) === true
  2) dossier.scanSummary?.zipUnpackOk === false
  3) tenderDossierHeavyParseDone(dossier) === true
     (lub równoważnie: parsedAt ustawione ∧ parserVersion aktualny
      ∧ !forceHeavyRescanAt — DF doprecyzuje)
  4) !dossier.kosztorys?.ok
```

**Poza predykatem:** zwykły `retryNonce++` jak dziś (np. `08ded027` niedomknięty — E-RUN i tak może startować).

### 2.3 Flow po wdrożeniu

```text
User: Ponów analizę (F2)
  → if shouldSoftInvalidateOnF2ZipRetry:
       applyForceHeavyRescanAt + persist local (jak forceHeavyRescan)
       retryNonce++
  → else:
       retryNonce++ tylko
  → E-RUN: forceActive ∨ !heavyParseDone → buildTenderDossierCostPhase
  → prepareTenderDossierParseSession (1× zip unpack retry)
  → cost phase → metadata → nowy parsedAt / zipUnpackOk / kosztorys?
```

### 2.4 Telemetria A/B/C/D

**OUT tego PLANU** — nie jest konieczna do odblokowania retry.  
Wystarczą istniejące pola: `zipUnpackOk`, `zipInnerCount`, `costDiscovery`, `kosztorys`, `parsedAt`, `forceHeavyRescanAt` (clear po sukcesie/fail jak dziś).

---

## 3. Allowlista plików (IMPLEMENT — po DF + GO)

### 3.1 IN (cienka)

| Plik | Zmiana (planowana) |
|------|-------------------|
| `src/lib/cost-parser-zip-unpack.ts` **lub** cienki helper obok Force | Pure: `shouldSoftInvalidateOnF2ZipRetry` (REUSE typów ZIP state / bez UI) |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | `retryDossierParse`: warunkowy REUSE `applyForceHeavyRescanAt` + istniejący clear inflight |
| `scripts/test-cost-parser-01-f2-retry-invalidate.mjs` **(NOWY)** | Unit pure + semantyka predykatu / no-op ścieżki |
| opcjonalnie `scripts/test-cost-multi-02-force-rescan.mjs` | 1–2 asercje: F2 soft-invalidate nie psuje Force CTA healthy |

### 3.2 OUT (zakaz touch)

```text
✗ src/lib/ath-parser.ts · pdf-przedmiar-heuristic · tenders-bzp-doc-parse (parsery)
✗ src/lib/tender-cost-discovery.ts (discovery rewrite)
✗ src/lib/tenders-bid-calculator* / OfferBoq* / AI-COST-02-B
✗ src/lib/cloud-sync.ts · Payroll* · Edge supabase functions
✗ src/lib/cost-multi-02.ts Aggregate / Branch (poza importem applyForce*)
✗ Zmiana shouldShowForceHeavyRescanCta (healthy MULTI) — poza scope
✗ Nowe pola zipOpenOk / zipFailStage / A-B-C-D persist — OUT (osobny slice)
```

### 3.3 Boundary #CORE-013 / #CORE-014

| Klasyfikacja | Wartość |
|-------------|---------|
| Bundle | **FEATURE** (Przetargi dossier retry UX/ops) |
| Shared CORE | **NIE** — zero `cloud-sync` / Payroll / Edge |
| Persist | REUSE istniejącego `onUpdate(..., { persist: "local" })` jak Force — **nie** nowy write-path |
| Mixed FEATURE+CORE | **ZAKAZ** w jednym commit |

---

## 4. Kontrakt retry

| Element | Kontrakt |
|---------|----------|
| **Trigger UI** | F2 `primaryCta === "reparse"` → `retryDossierParse` (bez zmiany copy A) |
| **Warunek soft-invalidate** | §2.2 predykat |
| **Mechanizm** | `forceHeavyRescanAt = ISO` (REUSE `applyForceHeavyRescanAt`) |
| **E-RUN** | `forceActive=true` → pomija early-return `heavyParseDone` |
| **Reuse dossier** | `existingDossierForBuild = null` (jak Force) — świeży unpack |
| **Auto-retry unpack** | Bez zmian — nadal 1× w `prepareTenderDossierParseSession` |
| **Limit pętli** | Istniejący `HEAVY_MAX_RUNS_PER_KEY` + circuit breaker |
| **Clear force** | REUSE success/fail clear w Heavy Lazy (bez nowej logiki) |
| **Idempotencja** | Drugi Ponów w trakcie `forceHeavyRescanAt` — clear inflight + bump nonce (jak dziś Force) |
| **08ded027** | Predykat false (`!heavyParseDone` / brak `zipUnpackOk=false`) → zwykły retryNonce — E-RUN może wystartować |

**Zakaz kontraktu:** nieskończone auto-Ponów · batch portfolio · bump `parserVersion` jako invalidate · nullowanie `kosztorys` ręcznie poza Force path.

---

## 5. Definition of Done

### 5.1 Code / test (przed commit)

- [ ] Predykat pure + testy unit PASS  
- [ ] `retryDossierParse` przy terminalnym A ustawia `forceHeavyRescanAt`  
- [ ] Przy `zipUnpackOk!==false` zachowanie Ponów **bez regresji** (tylko nonce)  
- [ ] Force CTA healthy (`kosztorys.ok` + missing MULTI fields) **bez zmian**  
- [ ] Zero diff w allowlist OUT  
- [ ] Build / istniejące `test-cost-parser-01-zip-unpack.mjs` · `test-cost-multi-02-force-rescan.mjs` PASS  

### 5.2 OPS re-verify (po deploy — osobny GO Owner)

Fixture `08dee178`:

| Check | Pass |
|-------|------|
| Po Ponów: `forceHeavyRescanAt` lub nowy przebieg widoczny | TAK |
| `parsedAt` **≠** `2026-07-28T19:02:03.820Z` | TAK |
| `zipInnerCount > 0` **lub** jawny ponowny `zipUnpackOk=false` po świeżym run | TAK (jedno z dwóch) |
| Jeśli unpack OK: `costDiscovery.found` / `kosztorys.ok` zgodne z ATH | TAK |
| Jeśli unpack fail ponownie: to **żywy** B-unpack na tipie — osobny RCA | udokumentowane |

Fixture `08ded027`: otwarcie / Ponów → Heavy startuje (nie no-op).

### 5.3 Close slice

- [ ] PV / OPS note  
- [ ] Tip bump tylko w `09` przy release (nie w tym PLAN)  
- [ ] CLOSEOUT thin P0-RETRY  

---

## 6. Ryzyka regresji

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Pętla Heavy / storm ZIP download | Średni | Soft-invalidate tylko przy predykacie A · limity `HEAVY_MAX_RUNS` · 1× auto unpack już w tipie |
| Force CTA healthy psuje się / dubluje | Średni | Nie ruszać `shouldShowForceHeavyRescanCta` · test Force |
| Artifact cache zwraca stary full-hit | Średni | Force path już `existingDossierForBuild=null`; `fullStaleZipFail` już omija cache bez retry flag — DF potwierdzi |
| Fałszywy soft-invalidate przy B/C | Niski | Predykat wymaga `zipUnpackOk===false` wyłącznie |
| Persist storm / Sync | Niski | REUSE local patch jak Force · #CORE-013 |
| Mobile UX podwójny confirm | Niski | Bez nowego `window.confirm` na F2 Ponów (Force ma własny) |

---

## 7. Testy

| ID | Typ | Co |
|----|-----|-----|
| T1 | Pure | `shouldSoftInvalidate…` true tylko gdy ZIP ∧ `zipUnpackOk===false` ∧ done ∧ !kosztorys.ok |
| T2 | Pure | false gdy brak ZIP / `zipUnpackOk===true` / `zipUnpackOk==null` / heavy niedomknięty |
| T3 | Pure/script | Semantyka: soft-invalidate ⇒ `forceHeavyRescanAt` set ⇒ `tenderDossierHeavyParseDone===false` |
| T4 | Regresja | `test-cost-parser-01-zip-unpack.mjs` — copy A/B/C bez zmian |
| T5 | Regresja | `test-cost-multi-02-force-rescan.mjs` — CTA healthy bez regresji |
| T6 | OPS (manual) | `08dee178` Ponów → nowy `parsedAt` (po GO deploy) |

---

## 8. IN / OUT (podsumowanie)

### IN

- Soft-invalidate F2 Ponów przy terminalnym `zipUnpackOk=false`  
- REUSE `applyForceHeavyRescanAt` / E-RUN force path  
- Pure predykat + testy  
- OPS re-verify fixtures po release  

### OUT

- Parsery ATH/PDF/XML/ZIP listing  
- Discovery rewrite  
- Bid / Aggregate / AI-COST-02-B  
- Payroll / Cloud Sync / Edge  
- Telemetria A/B/C/D (`zipOpenOk`, `zipFailStage`, …) — **osobny slice**, nie blokuje tego PLANU  

---

## 9. Następny krok po PLAN

1. Owner akceptuje PLAN → **DESIGN FREEZE** thin P0-RETRY (zamrożenie predykatu + allowlist).  
2. Arch Review + Boundary.  
3. Owner GO IMPLEMENT.  
4. Po tipie: OPS VERIFY na `08dee178` / `08ded027`.  
5. Jeśli po prawdziwym re-Heavy nadal `zipUnpackOk=false` przy Edge OK → **nowy RCA unpack (A∪B)** + ewentualnie DF telemetrii.

---

## 10. Odpowiedź na pytanie Ownera

> Czy po wdrożeniu tego PLAN będzie możliwe wykonanie prawdziwego ponownego Heavy i jednoznaczne potwierdzenie lub wykluczenie błędu unpack ZIP?

**TAK.**

Po wdrożeniu P0-RETRY, „Ponów” na terminalnym A ustawi `forceHeavyRescanAt` i E-RUN wykona pełny cost/unpack. Wtedy:

| Wynik świeżego Heavy | Wniosek |
|----------------------|---------|
| `zipUnpackOk=true` ∧ `zipInnerCount>0` (i idealnie `kosztorys.ok`) | Historyczny snapshot / transient — **unpack na tipie OK**; błąd unpack **wykluczony** jako aktywny |
| `zipUnpackOk=false` ∧ `zipInnerCount=0` przy Edge catalog OK | **Aktywny** błąd ścieżki Heavy unpack (A∪B) — osobny RCA/DF |
| `zipUnpackOk=true` ∧ brak kosztorysu | Unpack OK → problem discovery/parse (OUT tego slice; nowy brief) |

Bez tego PLANU OPS nie może rozstrzygnąć A vs B, bo Heavy się nie restartuje.

---

**PLAN COMPLETE** · IMPLEMENT **ZABLOKOWANY** do DF + Owner GO · tip **2.65.77**
