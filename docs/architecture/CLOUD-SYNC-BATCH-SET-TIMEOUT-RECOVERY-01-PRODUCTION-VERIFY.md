# CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01 — PRODUCTION VERIFY

> **STATUS:** **PRODUCTION VERIFIED · GREEN**  
> **Data:** 2026-08-12  
> **Epic:** CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01  
> **Closeout:** [`CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md`](./CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01-CLOSEOUT.md)  
> **Baseline pre-epic:** `8921d6fe`  
> **Release:** `914c00952814288c7e1148007d2a3bd9e069be21`

```text
PRODUCTION VERIFIED · GREEN
Edge READY · Batch-set GREEN · Payroll GREEN · Timeout UNCHANGED
```

---

## 1. Edge deployment

| Pole | Wartość |
|------|---------|
| Function | `make-server-0afb8820` |
| Project | `bdpygdvfgbggermvqtys` |
| Mechanism | GitHub Actions · `.github/workflows/deploy-supabase.yml` |
| Run ID | **`31635032340`** |
| Conclusion | **success** |
| head_sha | **`914c00952814288c7e1148007d2a3bd9e069be21`** |
| Updated | `2026-08-12T19:55:47Z` |
| URL | https://github.com/dawidthai125/wgdom/actions/runs/31635032340 |
| Assets (log) | `index.tsx` · `kv_store.tsx` · **`kv-mset-chunk.ts`** · … |

**Vercel:** **NOT** deployed as part of this epic stage (Edge-only GO).

---

## 2. Live markers (source @ release)

| Marker | Present |
|--------|---------|
| `planMsetChunks` | YES |
| `MSET_CHUNK_MAX_BYTES = 450_000` | YES |
| `MSET_CHUNK_MAX_KEYS = 12` | YES |
| chunked `mset` + solo oversized | YES |
| fail-fast sequential chunks | YES |
| transient retry max 1 | YES |
| observability `chunkCount` / `chunkMs` / `soloOversizedKeys` | YES |
| `statement_timeout` in Edge tree | **NONE** (UNCHANGED) |

---

## 3. Smoke (prod Edge)

Harness: `scripts/smoke-edge-batch-set-500-01-owner-verification.mjs`

| Test | Result |
|------|--------|
| health | PASS · 200 |
| small batch-get / batch-set | PASS · `{ok:true}` · no 500 |
| pipeline (~3.37 MB) batch-set | PASS · ~3835 ms · `{ok:true}` · no 500 |
| RS multi-key subset batch-set | PASS · `{ok:true}` |
| payroll week range **read-only** | PASS (no roster write) |
| **Score** | **18/18 PASS** |

---

## 4. Payroll gate

**16/16 ALL PASS** (B4 · B6 · S2 · S7-5 · S6 · S7-4 · S5 · roster · rollover · resurrection · guard · anti-leak · merge · day · work · P11).

`PayrollView.tsx` **NOT** in release `914c0095`.

---

## 5. Slice B / WM

Frequency separation present in `App.tsx` @ `914c0095` (drawings domain push only; no full RS trigger).  
Harness B: **13 PASS**. WM editor code **unchanged**.

---

## 6. Residual

`kw-tenders-pipeline` ≈ **3.37 MB** · solo oversized · **ACCEPTED** · C = OUT / FOLLOW-UP (Owner GO required).

---

## 7. Verdict

| Axis | Status |
|------|--------|
| Edge | **GREEN** |
| Batch-set | **GREEN** |
| Chunking | **GREEN** |
| Retry | **GREEN** |
| Payroll | **GREEN** |
| WM frequency | **GREEN** |
| Timeout | **UNCHANGED** |
| Runtime | **GREEN** |
| Residual fat-key | **ACCEPTED** |

**PRODUCTION VERIFIED · GREEN**
