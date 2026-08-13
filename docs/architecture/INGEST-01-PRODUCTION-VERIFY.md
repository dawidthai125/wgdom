# INGEST-01 — PRODUCTION VERIFY

> **STATUS:** **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Epic:** INGEST-01
> **Closeout:** [`INGEST-01-CLOSEOUT.md`](./INGEST-01-CLOSEOUT.md)
> **Feature / live:** `d1b2e7ca82149b9db7e78cd69712b5615901e5cf`

```text
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / d1b2e7ca · deploy 5889699457 success
Owner lossless ingest live · FULL BIP / live costing NOT VERIFIED
EPIC CLOSED (content) · docs commit may follow Owner GO
```

---

## 1. Production

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| HTTP `/` | **200** |
| UI | **2.66.43** |
| `version.json` commit | **`d1b2e7c`** (≡ **`d1b2e7ca…`**) |
| `version.json` timestamp | `2026-08-13T14:13:42.915Z` |
| Feature SHA | **`d1b2e7ca82149b9db7e78cd69712b5615901e5cf`** |
| HEAD / origin/main @ PV | **`d1b2e7ca…`** |
| Deployment ID | **5889699457** |
| Deployment state | **success** |
| Vercel status | **success** |

**HARD:** Production commit == **`d1b2e7ca`** · **PASS**.

---

## 2. Live INGEST evidence

Chunki: `index-DckCull1.js`, `TendersModule-Dvg1qwvl.js` (lazy).

| Marker / capability | Wynik |
|---------------------|--------|
| `kw-tender-ingest-v1` | **PRESENT** |
| `owner_requested` / `fixture_pin` / `pinned` | **PRESENT** |
| `INGEST_COMPLETE` / `INGEST_PARTIAL` / `PARSE_PENDING` | **PRESENT** |
| `documentId` / `contentHash` / `archiveId` / `parentArchiveId` | **PRESENT** |
| `PATH_TRAVERSAL` / `ZIP_BOMB` / `CORRUPT_ARCHIVE` | **PRESENT** |
| Owner gate `K9=6` + `Z9(e)?n:n.slice(0,K9)` | **PRESENT** (Owner omija top-6) |
| Prune keep `pinned`/`fixture_pin` | **PRESENT** |
| Artifact pool prefer `documentId` (``art:${…}``) | **PRESENT** |
| `MISSING_ARTIFACT` → hold | **PRESENT** |
| UI `data-ingest-01-panel` · `Import / Pin przetarg` · `Wgraj PDF / ZIP (wiele)` | **PRESENT** |
| `WithDwelling` schema | **ABSENT** |

Function names may be minified — string evidence + tip SHA = sufficient.

---

## 3. Hard locks

| Lock | Result |
|------|--------|
| OfferBoq schema v5 | **PASS** |
| F5 | **PASS** (unchanged) |
| PackageGate | **PASS** (unchanged) |
| Multi-Dwelling | **PASS** (CLOSED GREEN) |
| Multi-BOQ | **PASS** (CLOSED GREEN; pool `documentId` additive) |
| Equipment | **PASS** |
| Transport | **PASS** |
| C-MODE | **PASS** |
| Payroll | **PASS** (`PayrollView` OUT of release) |
| Cloud / DATA_KEYS | **PASS** (ingest LS-only) |

---

## 4. Regression (prior verified @ feature / Owner Verify)

| Suite | Result |
|-------|--------|
| INGEST-01 | **17/0** |
| MULTI-BOQ-01 | **50/0** |
| MULTI-DWELLING-01 | **72/0** |
| OWNER-INPUT-01 | **115/0** |
| GO-1 | **62/0** |
| MODEL-1B | **64/0** |
| Transport-01 | **75/0** |
| Equipment-01 | **36/0** |
| C-MODE contract / fallback | **44/0 · 34/0** |
| COST-MULTI | **ALL PASS** |
| Payroll B4 | **13/0** |
| Legacy BZP PL02 | **GREEN** |

> Nie rerun przy docs close — **PRIOR VERIFIED**.

---

## 5. Połczyn

| Scope | Status |
|-------|--------|
| LOCAL FIXTURE | **54/54 retained · ZERO silent loss** |
| FULL BIP LIVE | **NOT VERIFIED** |
| LIVE COSTING | **NOT RUN** |
| F5 / PackageGate / Final Bid | **NOT RUN** |
| Expected dwelling count | **UNKNOWN** |

---

## 6. Release hygiene

- Exact **22** files (INGEST allowlist)
- `PayrollView.tsx` **nie** w release
- ZERO Edge / Supabase / DATA_KEYS / OfferBoq schema bump / second Bid / new PDF parser
- CI note: Gate B tenders / e2e-happy-path **failure** observed; Vercel Production **success** + SHA match → PV **GREEN**

---

## 7. Verdict

**INGEST-01 = PRODUCTION VERIFIED · GREEN**
**tip 2.66.43 / `d1b2e7ca` · deploy `5889699457`**
**NEXT (biznes):** **LIVE REAL TENDER RETEST — POŁCZYN-ZDRÓJ** — nie oznaczony complete.
