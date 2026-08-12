# CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01 — CLOSEOUT

> **Epic ID:** CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01  
> **Status:** **CLOSED / PRODUCTION VERIFIED · GREEN**  
> **Data:** 2026-08-12  
> **Baseline (pre-epic):** `8921d6fe`  
> **Release (code):** `914c00952814288c7e1148007d2a3bd9e069be21` (`914c0095`)  
> **Edge:** `make-server-0afb8820` · GitHub Actions run **`31635032340`** · READY / SUCCESS  
> **UI tip:** **nie** zmieniany w tym epiku (Vercel **NOT** deployed as epic step) · tip SSOT → [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PV:** [`CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md`](./CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md)  
> **Prior incident docs:** [`EDGE-BATCH-SET-500-01-RCA.md`](./EDGE-BATCH-SET-500-01-RCA.md) · [`EDGE-BATCH-SET-500-01-PLATFORM-RCA.md`](./EDGE-BATCH-SET-500-01-PLATFORM-RCA.md) · [`EDGE-BATCH-SET-500-01-OWNER-VERIFICATION.md`](./EDGE-BATCH-SET-500-01-OWNER-VERIFICATION.md) (historyczny FAIL — supersedowany przez ten CLOSE)

```text
════════════════════════════════════════════════════════
CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01
CLOSED / PRODUCTION VERIFIED · GREEN
PAYROLL > CLOUD SYNC OPTIMIZATION
════════════════════════════════════════════════════════
```

---

## 1. Root cause (pinned)

**Cloud Sync `POST /batch-set` / KV I/O** przy **`authenticator.statement_timeout = 8s`**.

Monolityczny `kv.mset` (jeden duży PostgREST upsert) + pełny RS bundle (~4.8 MB) → ryzyko statement timeout / HTTP 500.

### Ważne wyjaśnienie — WM-RYSUNKI

**WM-RYSUNKI nie było root cause.**

Rysunki były **frequency amplifier**: `commitWmTechnicalDrawings` → domain push (~35 KB) **oraz** `setWmTechnicalDrawings` → `useEffect` → `scheduleAutoCloudSync` → **pełny RS** → toast z `runCloudSync`.

---

## 2. Fix A — Chunked mset (Edge)

| Parametr | Wartość |
|----------|---------|
| `MSET_CHUNK_MAX_BYTES` | **450_000** |
| `MSET_CHUNK_MAX_KEYS` | **12** |
| Oversized | **solo chunk** (najpierw) |
| Packing | greedy |
| Partial failure | **fail-fast** (chunk N fail → HTTP 500; bez compensation / bez auto-retry kolejnych chunków) |
| HTTP API | **bez zmian** — `POST /batch-set` body `{ keys, values }` · success `{ ok: true }` |

**Architektura (write layer only):**

```text
tombstone discovery → key-specific merge / LWW / backup rotate
  → safeValues
  → planMsetChunks
  → mset chunk 1…N
```

Planner **nie** zna semantyki Payroll. Merge pozostaje przed chunkowaniem.

**Pliki:**

- `supabase/functions/make-server-0afb8820/kv-mset-chunk.ts`
- `supabase/functions/make-server-0afb8820/kv_store.tsx`
- `supabase/functions/make-server-0afb8820/index.tsx` (observability only)

**Retry:** `upsertRowsWithLightRetry` — **max 1** ponowienie na transient (timeout / 522 / connection / deadlock…); ten sam UPSERT payload → **idempotent** przy `ON CONFLICT`.

**Observability (log only, bez payload/PII):** `chunkCount` · `chunkMs` · `soloOversizedKeys`.

---

## 3. Fix B — Drawings frequency separation (frontend)

```text
drawing commit → pushWmTechnicalDrawingsToCloud → kw-wm-technical-drawings
drawing change → NIE scheduleAutoCloudSync / pełny RS

Payroll / jobs / other domains → istniejący auto-sync path · BEZ ZMIANY
```

**Plik:** `src/app/App.tsx` — usunięcie `wmTechnicalDrawings` **tylko** z deps auto-sync `useEffect`.

**Nie** wyłączono globalnego auto-sync. **Nie** ruszano edytora WM-RYSUNKI.

---

## 4. Payroll protection (P0)

**PAYROLL > CLOUD SYNC OPTIMIZATION**

| Gate | Wynik |
|------|--------|
| Payroll semantics (merge / LWW / tombstones / resurrection fence / CloudSyncMutationGuard / rollover / protected keys) | **UNTOUCHED** |
| `PayrollView.tsx` | **NOT committed** · **NOT part of release** |
| Regression suites (B4, B6, S2, S7-5, S6, S7-4, S5, roster, rollover, resurrection, guard, anti-leak, merge, day, work, P11) | **16/16 ALL PASS** |

---

## 5. Timeout

**`statement_timeout` = UNCHANGED** (nie podniesiony, nie wyłączony, nie obchodzony).  
Fix = **chunking + frequency separation**, nie zmiana DB role timeout.

---

## 6. Production verify (skrót)

| | |
|--|--|
| Edge deploy | GH Actions **`31635032340`** · SUCCESS · source **`914c0095`** · upload m.in. `kv-mset-chunk.ts` |
| Smoke | `scripts/smoke-edge-batch-set-500-01-owner-verification.mjs` · **18/18 PASS** |
| Pipeline | ~**3.37 MB** / ~**3.8 s** · `{ok:true}` · brak 500 |
| Chunk harness | A1–A12 **40 PASS** |
| Frequency harness | B1–B5 **13 PASS** |
| WM regression | P0–P3B.1 + Mobile + UX closed epics **GREEN** (bez zmian kodu WM) |

Szczegóły: [`CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md`](./CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-PRODUCTION-VERIFY.md)

---

## 7. Residual risk (C = OUT)

| | |
|--|--|
| `kw-tenders-pipeline` | ≈ **3.37 MB** · **solo oversized** |
| Status | **ACCEPTED** · **FOLLOW-UP / OWNER GO REQUIRED** |
| Zakaz bez GO | split tenders · zmiana storage model · podniesienie timeoutu |

**Nie otwieraj follow-up automatycznie.**

---

## 8. Out of scope (pin)

- tenders fat-key split / C
- timeout increase
- Payroll redesign
- new KV
- WM editor / render changes
- Vercel frontend deployment (jako krok epiku)
- `PayrollView.tsx` WIP

---

## 9. Tests (harness)

- `scripts/test-edge-batch-set-500-01-mset-chunk.mjs`
- `scripts/test-cloud-sync-drawings-frequency-separation-01.mjs`
- `scripts/smoke-edge-batch-set-500-01-owner-verification.mjs`

---

## 10. NEXT

**UTRZYMANIE** · ACTIVE EPIC = **NONE**  
Fat-key reduction (`kw-tenders-pipeline`) = **FOLLOW-UP** tylko po **Owner GO → AUDIT**.  
**Nie** implementować bez polecenia.
