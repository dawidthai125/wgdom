# IMPLEMENTATION — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1  
## PASS2 / CR DISCOVERY AMENDMENT

> **Epic:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **Owner Decision SSOT:** [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-OWNER-DECISION-CLOSEOUT.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PASS2-DISCOVERY-OWNER-DECISION-CLOSEOUT.md)  
> **Local tip:** **2.66.59** (undeployed) · **Prod tip unchanged:** **2.66.58** / **`8fba5ef`**  
> **Date:** 2026-08-14  
> **Stage:** **IMPLEMENT = LOCAL GREEN** · **COMMIT / PUSH / DEPLOY = NOT DONE**

```text
IMPLEMENT                  = GREEN
PASS2 electrical (A1)      = HIT (CR instalacje-elektryczne-cennik)
PASS2 plumbing (A2)        = HIT (CR instalacje-wodno-kanalizacyjno-gazowe-cennik)
Wykwity (A3)               = SOURCE GAP / HOLD (no repairs PASS2)
Host guard (A4)            = KEEP-4 · candidate hosts BLOCKED
Identity guard (A5)        = registry 2 · no new alias/mapping
Evidence / Catalog / Accept / OUR RATE / margin = UNCHANGED (no prod write)
Production                 = unchanged
```

---

## 1. What changed

| File | Change |
|------|--------|
| `src/lib/work-catalog/work-rate-discovery-allowlist.ts` | Category keys `electrical`/`plumbing` · CR PASS2 URLs · family prefs · tablica/podejście family routing · inventory list no longer MAX-truncated (MAX still caps **per-work** fetch) |
| `supabase/functions/make-server-0afb8820/index.tsx` | Edge PASS2 URL map mirror (CR electrical + plumbing) |
| `scripts/test-work-rate-pass2-allowlist-wave-1.mjs` | T3/T3b regression for CR discovery + MAX |
| `scripts/test-ie-labor-pass2-cr-discovery-amendment.mjs` | **NEW** — Owner checks 1–15 |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.66.59** |
| Design Freeze / Arch Review banners | IMPLEMENT LOCAL GREEN status |

**Unchanged:** identity registry · D1 · qualify · median · PASS2 MAX=2 · Evidence schema · classification · Accept path.

---

## 2. Discovery contract (implemented)

| Target | Family | PASS2 key | URL |
|--------|--------|-----------|-----|
| Tablica `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | `electrical` | `electrical` | `https://cennikremontow.pl/instalacje-elektryczne-cennik` |
| Podejście `p2b-podejscie-wod-kan-mb` | `plumbing` | `plumbing` | `https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik` |
| Wykwity `cc-w2-wykwity-zacieki` | `repairs` | *(none)* | PASS2 empty · SOURCE GAP REAL |

Pipeline unchanged: CLASSIFY → PREFLIGHT → FETCH → PARSE → IDENTITY → SCOPE → QUALIFY → Evidence Candidate.

---

## 3. Tests

| Suite | Result |
|-------|--------|
| `scripts/test-ie-labor-pass2-cr-discovery-amendment.mjs` | **44 PASS** |
| `scripts/test-work-rate-pass2-allowlist-wave-1.mjs` | **74 PASS** |
| `scripts/test-ie-labor-selective-research-identity-ready-wave-1.mjs` | **34 PASS** |

---

## 4. Safety (prod read-only · no write this GO)

| Surface | Before = After |
|---------|----------------|
| Evidence | rev **2** · etag **`r2-7a927415`** · **66** obs |
| Registry | **2** |
| Catalog | **460 / 34 / 426** |
| companyPrice | **35** |
| OUR RATE | **null** |
| marginPct | **0** |
| KV writes | **0** |
| Production tip | **2.66.58 / 8fba5ef** (unchanged) |

---

## 5. Hard stop

```text
COMMIT / PUSH / DEPLOY     = NOT DONE
Prod Evidence populate     = NOT DONE
Accept / OUR RATE / margin = NOT DONE
```

**NEXT:** `OWNER GO: COMMIT` (jeśli IMPLEMENT = GREEN)

**STOP.**
