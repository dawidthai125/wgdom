# P0-HOTFIX-001 — mergeRecoverableCharges import

**Data:** 2026-06-16  
**Wersja:** 2.59.29  
**Werdykt:** **PASS**

---

## 1. Root Cause

Commit **EM-P0** (`b563ea8`, v2.59.27) w `src/lib/cloud-sync.ts` **zastąpił** import:

```ts
import { mergeRecoverableCharges, normalizeRecoverableCharges } from "@/lib/recoverable-charges";
```

importami domeny Pomiary Elektryczne, bez zachowania poprzedniego importu.

Wywołania pozostały w:

- `mergeDataKey()` → `case "kw-recoverable-charges"` (L1480)
- `pushRecoverableChargesToCloud()` (L1891, L1896)

Skutek: `ReferenceError: mergeRecoverableCharges is not defined` przy pełnym auto-sync admina (`runCloudSync` → `computeMergedDataBundle` → `mergeAllDataKeys`).

---

## 2. Fix

Przywrócony brakujący import obok importów EM — **bez zmiany logiki**, DATA_KEYS, EM-P0.

```ts
import { mergeRecoverableCharges, normalizeRecoverableCharges } from "@/lib/recoverable-charges";
```

---

## 3. Build

```bash
npm run build
```

**Wynik:** PASS

---

## 4. Smoke

| Test | Wynik |
|------|--------|
| `smoke-test-recoverable-charges-20.3a.mjs` | PASS |
| `test-electrical-measurements-p0.mjs` | PASS |

Manual (WM Druk / Roboty / Pulpit): brak toastu `mergeRecoverableCharges is not defined` po deploy.

---

## 5. Deploy Verification

| Metryka | Status |
|---------|--------|
| Commit | `c43acc1` |
| Push `main` | PASS |
| `version.json` | oczekiwane **2.59.29** (propagacja Vercel) |
| PRODUCTION VERIFIED | po propagacji — jeden curl `version.json` |

---

*P0-HOTFIX-001 · regresja EM-P0 · minimal diff 1 import + changelog*
