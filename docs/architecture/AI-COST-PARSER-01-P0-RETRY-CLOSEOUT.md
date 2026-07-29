# AI-COST-PARSER-01 — P0-RETRY · CLOSEOUT

> **ID:** AI-COST-PARSER-01-P0-RETRY-CLOSEOUT  
> **Data:** 2026-07-29  
> **STATUS:** **CODE COMPLETE · CLOSE PENDING PV + RELEASE**  
> **DF:** [`AI-COST-PARSER-01-P0-RETRY-DESIGN-FREEZE.md`](AI-COST-PARSER-01-P0-RETRY-DESIGN-FREEZE.md)  
> **IMPLEMENT:** [`AI-COST-PARSER-01-P0-RETRY-IMPLEMENTATION-REPORT.md`](AI-COST-PARSER-01-P0-RETRY-IMPLEMENTATION-REPORT.md)  
> **PV:** [`AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md`](AI-COST-PARSER-01-P0-RETRY-PRODUCTION-VERIFY.md)  
> **Baseline tip (prod):** **2.65.77** / **`a061bbd`** — feature **niepushed**

```text
════════════════════════════════════════════════════════
Slice P0-RETRY: F2 Ponów odblokowuje Heavy przy terminalnym A.
Kod lokalny GOTOWY. EPIC CLOSE po tip + OPS §6.2 PASS.
════════════════════════════════════════════════════════
```

---

## 1. Co dostarczono (kod)

- Predykat `shouldSoftInvalidateOnF2ZipRetry`  
- `retryDossierParse` → REUSE `applyForceHeavyRescanAt` + `retryNonce`  
- Testy T1–T5 PASS  

## 2. Czego nie zrobiono

- Commit / push (brak osobnego GO)  
- Tip bump / changelog  
- Live Ponów na `08dee178` (PV FULL)  

## 3. Kryteria CLOSE (ostateczne)

| Kryterium | Stan |
|-----------|------|
| DF scope only | **PASS** |
| Testy T1–T5 | **PASS** |
| PV §6.2 live | **OPEN** |
| Tip w `09` | **OPEN** |
| Owner GO CLOSE | **OPEN** |

## 4. Rekomendacja Ownera

1. **GO commit + push** allowlisty (+ docs reports).  
2. Po tipie: **Ponów** na `08dee178` → uzupełnij PV.  
3. Jeśli `zipUnpackOk=true` ∧ ATH → unpack historyczny wykluczony.  
4. Jeśli nadal fail przy Edge OK → nowy RCA unpack (osobny slice).  
5. Dopiero wtedy **CLOSE** + ewentualny bump `09`.

## 5. Zakazy utrzymane

AI-COST-01 Freeze · parsers · Bid · Payroll · Cloud · A/B/C/D telemetry.

---

**CLOSEOUT STATUS:** **HOLD** do PV FULL + Owner GO CLOSE  
**IMPLEMENT lokalny:** **COMPLETE**
