# PAYROLL Runtime Trace — Implementation Report

> **Data:** 2026-07-04  
> **Wersja:** **2.63.29**  
> **SSOT:** [`PAYROLL-RUNTIME-TRACE-SPEC.md`](PAYROLL-RUNTIME-TRACE-SPEC.md) v1.1  
> **Design Freeze Audit:** [`PAYROLL-RUNTIME-TRACE-DESIGN-FREEZE-AUDIT.md`](PAYROLL-RUNTIME-TRACE-DESIGN-FREEZE-AUDIT.md) PASS  
> **Zakres:** Logger diagnostyczny only — **zero** fix payroll · **zero** S2 · **zero** zmian merge/sync architektury

---

## Werdykt implementacji

```text
IMPLEMENTATION COMPLETE

BUILD: PASS
COMPLIANCE AUDIT: 35/35 PASS
REPRO TRACE (adversarial): PASS — pierwszy punkt utraty zidentyfikowany
```

---

## 1. Artefakty kodu

| Plik | Rola |
|------|------|
| `src/lib/payroll-runtime-trace.ts` | Envelope v1.1 · ring buffer 300 · dump API · subject loss detector |
| `src/lib/cloud-sync.ts` | E04–E07, E10, E17–E21, G1, G3, G6, GAP-C |
| `src/app/App.tsx` | E01–E02, E11–E14, G4, G9, globals |
| `src/app/CloudLoader.tsx` | E15, G5a/b, GAP-B |
| `src/app/hooks/useLocalStorage.ts` | GAP-A (E12 + ls.write) |
| `src/lib/cloud-sync-mutation-guard.ts` | E03 |
| `src/lib/payroll-display.ts` | G11 |
| `scripts/test-payroll-runtime-trace-compliance.mjs` | Audit emitterów |
| `scripts/test-payroll-runtime-trace-repro.mjs` | Symulacja A/B + adversarial |

---

## 2. API produkcyjne (konsola)

```javascript
// Włącz trace (domyślnie ON; wyłącz: localStorage wg-payroll-trace=0)
__wgdomPayrollTraceEnable?.()

// Przed repro cross-device — ten sam ID na A i B
__wgdomPayrollTraceSetOperation('op-add-20260704-1430')
__wgdomPayrollTraceSetDevice('chrome-desktop')  // lub iphone-safari

// Opcjonalnie trwałe operationId
localStorage.setItem('wg-payroll-trace-operation-id', 'op-add-20260704-1430')

// Po repro — export timeline
__wgdomPayrollTraceDump('op-add-20260704-1430')
// → { firstSubjectLoss, events[], rosterRevision, ... }
```

---

## 3. Audit zgodności (post-impl)

| Obszar | Werdykt |
|--------|---------|
| Emitters P0 (E01–E12, G1, G3, G4, G6) | **PASS** — 35/35 hooków |
| Emitters P1 (E13–E23, G5, G9, G11) | **PASS** |
| GAP-A useLocalStorage | **PASS** |
| GAP-B bootstrap.ls.persist | **PASS** |
| GAP-C tombstones.week_employees | **PASS** |
| Envelope v1.1 pola | **PASS** |
| Ring buffer 300 | **PASS** |
| Dump API | **PASS** |
| RC Matrix zmian | **PASS** — brak zmian §11 |
| KG-1 Edge success requestId | **OPEN** — proxy client E06 |
| KG-5 E06 server-side | **OPEN** — clientProxy: true |

**Komenda:** `npx vite-node scripts/test-payroll-runtime-trace-compliance.mjs`

---

## 4. Test repro

**Komenda:** `npx vite-node scripts/test-payroll-runtime-trace-repro.mjs`

| Scenariusz | Wynik |
|------------|-------|
| Happy path A→B→A sync | subjectPresent **true** — brak utraty |
| Adversarial richness override | subjectPresent **false** @ `sync.merge.payroll.finalize` |

---

## 5. Performance

| Metryka | Ocena |
|---------|-------|
| Ring buffer cap | 300 eventów — O(1) push |
| Console spam | **Brak** — tylko buffer |
| Roster snapshot | Metadane only (count, mergeKeys, hash) — bez PII |
| Build impact | PASS — brak regresji bundle gate |

---

## 6. Ograniczenia (bez zmian vs spec)

- **KG-1/KG-5:** E06 = client proxy po batch-set success
- **KG-2/KG-3:** Cross-device wymaga dwóch dumpów + wspólnego `operationId` (procedura Owner)
- **Fix incydentu:** poza zakresem — trace umożliwia RCA, nie naprawia roster

---

## 7. Następny krok (Owner)

1. Deploy **2.63.29**
2. Prod repro: Chrome add → Safari refresh → Chrome refresh
3. Dwa dumpy `__wgdomPayrollTraceDump(operationId)` → [`PAYROLL-RUNTIME-TRACE-FIRST-RCA.md`](PAYROLL-RUNTIME-TRACE-FIRST-RCA.md)
4. Klasa RC z §11 — dopiero potem decyzja S2 (poza tym release)

---

**Ostatnia aktualizacja:** 2026-07-04 · Implementation Report · v2.63.29
