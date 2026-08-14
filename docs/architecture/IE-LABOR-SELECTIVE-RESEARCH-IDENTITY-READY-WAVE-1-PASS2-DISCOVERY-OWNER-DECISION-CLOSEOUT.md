# OWNER DECISION CLOSEOUT — IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1  
## PASS2 / CR DISCOVERY AMENDMENT

> **Epic:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **Decision scope:** PASS2 / discovery amendment — **CennikRemontow only**  
> **Tip (prod):** **2.66.58** / **`8fba5ef`**  
> **Date:** 2026-08-14  
> **Stage:** **OWNER DECISION CLOSEOUT = COMPLETE** · **PASS2 IMPLEMENT = NOT DONE**  
> **Prior SSOT:**  
> · [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-DESIGN-FREEZE.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-DESIGN-FREEZE.md)  
> · [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-ARCH-REVIEW.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-ARCH-REVIEW.md)  
> · [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-LIVE-VALIDATION-REVIEW.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-LIVE-VALIDATION-REVIEW.md)  
> · PASS2 baseline: [`WR-PASS2-ALLOWLIST-WAVE-1-DESIGN-FREEZE.md`](./WR-PASS2-ALLOWLIST-WAVE-1-DESIGN-FREEZE.md)

```text
OWNER DECISION CLOSEOUT     = COMPLETE
PASS2 IMPLEMENT             = LOCAL GREEN (v2.66.59 · undeployed) · see PASS2-DISCOVERY-IMPLEMENTATION.md
FETCH / BODY CAPTURE        = NOT DONE (prod)
Evidence write              = NOT DONE
Catalog / Accept / OUR RATE / margin = FORBIDDEN
COMMIT / PUSH / DEPLOY      = NOT DONE

A1 CR electrical PASS2      = APPROVED → IMPLEMENTED (local)
A2 CR plumbing PASS2        = APPROVED → IMPLEMENTED (local)
A3 Wykwity                  = HOLD (SOURCE GAP REAL)
A4 Host expansion           = CLOSED / KEEP-4
A5 New mapping / alias      = CLOSED / none

SOURCE GAP                  = OPEN
NICHE                       = NOT CLAIMED
```

```text
THIS GO = OWNER DECISION ONLY
ZERO CODE · ZERO FETCH · ZERO EVIDENCE · ZERO CATALOG
ZERO ACCEPT · ZERO OUR RATE · ZERO MARGIN
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 0. Context (binding)

LIVE Validation Review verdict: **ENGINE PASS — MIXED**

| Target | LIVE outcome | Review class |
|--------|--------------|--------------|
| Tablica | SOURCE_GAP · 4× `parse_empty` | **DISCOVERY GAP** — known CR electrical page never fetched |
| Podejście | SOURCE_GAP · 4× `parse_empty` | **DISCOVERY GAP** — known CR wod-kan page never fetched |
| Wykwity | SOURCE_GAP · 4× `parse_empty` | **SOURCE GAP REAL** on current KEEP-4 surface |

Owner amends discovery **only** so existing CennikRemontow PASS2 can reach the two historically known specialty pages.  
Wykwity stays HOLD. No host expansion. No new identity.

---

## 1. Decisions A1–A5

| ID | Decision | Status |
|----|----------|--------|
| **A1** | APPROVE — CR electrical discovery / PASS2 → `instalacje-elektryczne-cennik` (Tablica) | **APPROVED** |
| **A2** | APPROVE — CR plumbing discovery / PASS2 → `instalacje-wodno-kanalizacyjno-gazowe-cennik` (Podejście) | **APPROVED** |
| **A3** | HOLD — Wykwity (SOURCE GAP REAL) · no PASS2 repairs · no new hosts · no aliases · no invent evidence | **HOLD** |
| **A4** | NO host expansion · KEEP-4 locked | **CLOSED / KEEP-4** |
| **A5** | NO new mapping / alias · reuse Wave-1 registry + D1 only | **CLOSED / no new identity** |

---

## 2. A1 — Tablica · CR electrical (APPROVED)

| Field | Frozen value |
|-------|----------------|
| workId | `p2b-tablica-rozdzielcza-mieszkaniowa-szt` |
| unit | `szt` |
| mappingId | `lim-w1-tablica-rozdzielcza-cr` (**existing** · READ-ONLY) |
| Known observedName | `Montaż skrzynki rozdzielczej` (**existing alias** · do **not** invent another) |
| sourceId | `cennikremontow_pl` only |
| PASS2 page (approve) | `https://cennikremontow.pl/instalacje-elektryczne-cennik` |
| Purpose | Allow discovery to reach the known relevant CR page (close DISCOVERY GAP) |

**Forbidden under A1:** new alias · new mapping · KB/SCCOT/Extradom specialty expand · candidate hosts · Accept / OUR RATE / margin.

---

## 3. A2 — Podejście · CR plumbing (APPROVED)

| Field | Frozen value |
|-------|----------------|
| workId | `p2b-podejscie-wod-kan-mb` |
| unit | `mb` |
| mappingId | `lim-w1-podejscie-wod-kan-cr` (**existing** · READ-ONLY) |
| Known observedName | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` (**existing alias** · do **not** invent another) |
| sourceId | `cennikremontow_pl` only |
| PASS2 page (approve) | `https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik` |
| Purpose | Allow discovery to reach the known relevant CR page (close DISCOVERY GAP) |

**Forbidden under A2:** new alias · new mapping · host expand · invent evidence · Accept / OUR RATE / margin.

---

## 4. A3 — Wykwity (HOLD)

| Field | Binding |
|-------|---------|
| workId | `cc-w2-wykwity-zacieki` |
| Status | **SOURCE GAP REAL** (unchanged) |
| PASS2 repairs | **DO NOT ADD** |
| New hosts | **DO NOT ADD** |
| New aliases / mappings | **DO NOT ADD** |
| Invent evidence | **FORBIDDEN** |

Wykwity remains out of this amendment scope. No coverage claim.

---

## 5. A4 — Host lock (CLOSED / KEEP-4)

**KEEP-4 unchanged:**

1. kb.pl (`kb_pl`)  
2. cennikremontow.pl (`cennikremontow_pl`) — **only this source’s discovery is amended (A1/A2)**  
3. sccot.pl (`sccot`)  
4. extradom.pl (`extradom`)

**Candidate hosts remain BLOCKED:**

- Kul-Bud · Budowalka · Murator · Ogarnij Remont · Zleca · CennikiBudowlane  

Even if they list prices — **out of scope forever for this amendment**.

---

## 6. A5 — Identity lock (CLOSED)

| Rule | Binding |
|------|---------|
| New mapping rows | **FORBIDDEN** |
| New aliases | **FORBIDDEN** |
| Tablica identity | existing `lim-w1-tablica-rozdzielcza-cr` only |
| Podejście identity | existing `lim-w1-podejscie-wod-kan-cr` only |
| Wykwity identity | existing D1 Owner synonyms only · mapping NONE |

---

## 7. PASS2 contract (binding for future IMPLEMENT)

PASS2 may **only** improve **DISCOVERY** (page reachability).

It must **NOT**:

- bypass classification  
- bypass identity  
- bypass scope  
- bypass qualify  
- relax thresholds  
- change PASS2 MAX  
- add hosts  
- add mappings  
- add aliases  
- change laborOnly rules  
- change Evidence schema  

**Pipeline remains:**

```text
CLASSIFY
  → PREFLIGHT
  → FETCH
  → PARSE
  → IDENTITY
  → SCOPE
  → QUALIFY
```

Evidence Candidate ≠ Accept. Accept / OUR RATE / margin remain **out of this amendment** unless a later Owner GO says otherwise.

---

## 8. Implement scope (for NEXT GO only — not this closeout)

When Owner issues **IMPLEMENT — PASS2 / CR DISCOVERY AMENDMENT**, expected **minimum** code surface (illustrative · not implemented here):

1. Add Owner-curated PASS2 allowlist entries for `cennikremontow_pl` only:
   - electrical → `instalacje-elektryczne-cennik`  
   - plumbing → `instalacje-wodno-kanalizacyjno-gazowe-cennik`  
2. Ensure family / work routing so Tablica and Podejście actually select those categoryKeys (today both resolve `unknown` → PASS2 `[]`).  
3. Respect existing PASS2 MAX and KEEP-4 host lock.  
4. Leave Wykwity / repairs untouched.  
5. Leave identity registry at **exactly 2** rows.

**Not in IMPLEMENT without new Owner GO:** Wrocław twin URLs · KB/SCCOT/Extradom specialty pages · repairs PASS2 · MAX change · Accept path.

---

## 9. Safety snapshot (decision-time · no writes)

| Surface | Value |
|---------|--------|
| Evidence revision | **2** |
| Evidence etag | **`r2-7a927415`** |
| Observations | **66** |
| Registry | **2** |
| Catalog | **460 / 34 / 426** |
| companyPrice (control) | **35** |
| OUR RATE | **null** |
| marginPct | **0** |
| Writes (this GO) | **0** |
| SOURCE GAP | **OPEN** |
| NICHE | **NOT CLAIMED** |

---

## 10. Final

```text
OWNER DECISION CLOSEOUT = COMPLETE

A1 = APPROVED → IMPLEMENTED (local v2.66.59)
A2 = APPROVED → IMPLEMENTED (local v2.66.59)
A3 = HOLD
A4 = CLOSED / KEEP-4
A5 = CLOSED / no new identity

PASS2 IMPLEMENT = LOCAL GREEN (undeployed)
FETCH / Evidence / Catalog / Accept / OUR RATE / margin = NOT DONE (prod)
COMMIT / PUSH / DEPLOY = NOT DONE
```

**NEXT:** `OWNER GO: COMMIT`

**STOP.**

