# AI-COST-PARSER-01 — P0-RETRY · IMPLEMENTATION REPORT

> **ID:** AI-COST-PARSER-01-P0-RETRY-IMPLEMENTATION  
> **STATUS:** **IMPLEMENT COMPLETE · SHIPPED** · commit **`e88d689f`** · tip **`e88d689`** · PV **PASS**  
> **Data:** 2026-07-29  
> **Baseline tip (pre):** **2.65.77** / **`a061bbd`** · **live:** **`e88d689`**  
> **DF:** [`AI-COST-PARSER-01-P0-RETRY-DESIGN-FREEZE.md`](AI-COST-PARSER-01-P0-RETRY-DESIGN-FREEZE.md)  
> **Owner GO IMPLEMENTATION:** UDZIELONE

```text
════════════════════════════════════════════════════════
One Bundle = One Goal: F2 Ponów przy terminalnym
  zipUnpackOk=false ∧ heavyParseDone → applyForceHeavyRescanAt + retryNonce
════════════════════════════════════════════════════════
```

---

## 1. Zmiany (allowlista)

| Plik | Zmiana |
|------|--------|
| `src/lib/cost-parser-zip-unpack.ts` | + `shouldSoftInvalidateOnF2ZipRetry(dossier, docs, heavyParseDone)` · typ `SoftInvalidateF2ZipRetryDossier` |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | `retryDossierParse`: gdy predykat → `applyForceHeavyRescanAt` + `forceRescanAtRef` + persist local; zawsze `retryNonce++` |
| `scripts/test-cost-parser-01-f2-retry-invalidate.mjs` | **NOWY** — T1–T3 |
| `scripts/test-cost-multi-02-force-rescan.mjs` | + asercje P0-RETRY (healthy CTA + wire) |

**Uwaga API predykatu:** trzeci argument `heavyParseDone` = wynik SSOT `tenderDossierHeavyParseDone(dossier)` (caller) — unik cyklu importów `zip-unpack` ↔ `tender-dossier-pipeline`. Semantyka DF §4.1 zachowana.

---

## 2. OUT (nienaruszone)

Parsery · discovery · Bid · AI-COST · Payroll · `cloud-sync.ts` · telemetria A/B/C/D · `shouldShowForceHeavyRescanCta` · nowa pętla Heavy.

---

## 3. Weryfikacja lokalna

| Check | Wynik |
|-------|--------|
| T1–T3 (`test-cost-parser-01-f2-retry-invalidate.mjs`) | **PASS** (18) |
| T4 (`test-cost-parser-01-zip-unpack.mjs`) | **PASS** |
| T5 (`test-cost-multi-02-force-rescan.mjs` + P0-RETRY) | **PASS** (39) |
| ReadLints allowlista | **CLEAN** |
| `tsc --noEmit` | Repo ma **pre-existing** błędy (e2e/admin/…) — **zero** błędów w plikach allowlisty |

---

## 4. Boundary

FEATURE only · Gate ALL-NIE · REUSE `applyForceHeavyRescanAt` · ZERO DUPLICATE retry loop.

---

## 5. Następne

1. Owner GO **commit + push** (osobne).  
2. Po tipie: OPS live Ponów na `08dee178` → [`PV`](AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md).  
3. CLOSEOUT po PV.

**COMMIT / PUSH:** nie wykonano.
