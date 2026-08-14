# OWNER DECISION CLOSEOUT — WR-LABOR-IDENTITY-MAPPING-WAVE-1

> **Epic:** `WR-LABOR-IDENTITY-MAPPING-WAVE-1`  
> **SSOT audit:** [`WR-LABOR-IDENTITY-MAPPING-WAVE-1-AUDIT.md`](./WR-LABOR-IDENTITY-MAPPING-WAVE-1-AUDIT.md)  
> **Engine tip:** **2.66.55** / **`8af757e0`**  
> **Live validation review:** **CLOSED / PASS**  
> **Registry:** **EMPTY** (unchanged)  
> **Evidence:** rev **2** · etag **`r2-7a927415`** · observations **66**  
> **Date:** 2026-08-14  
> **Status:** **OWNER DECISION CLOSEOUT = COMPLETE** · **IMPLEMENT = LOCAL GREEN (2.66.56)** · **COMMIT = NOT DONE**

```text
OWNER DECISION CLOSEOUT  = COMPLETE (this file)
WAVE-1 AUDIT             = COMPLETE
LIVE VALIDATION REVIEW   = CLOSED / PASS
IMPLEMENT / SEED         = LOCAL GREEN (2.66.56 · undeployed · 2 registry rows)
mappingId assignment     = LOCAL (lim-w1-tablica-rozdzielcza-cr · lim-w1-podejscie-wod-kan-cr)
Evidence WRITE           = NOT DONE
Work Catalog WRITE       = NOT DONE
Accept / OUR RATE / margin = NOT DONE
ALLOWLIST CHANGE         = NOT DONE
SOURCE GAP               = OPEN
NICHE                    = NOT CLAIMED
KV WRITE                 = 0
MAPPING WRITE (KV)       = 0
```

```text
ZERO CODE · ZERO IMPLEMENT · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
ZERO registry entries · ZERO Evidence populate · ZERO Accept / OUR RATE
```

---

## 1. Binding decision table

| # | Candidate | workId | observedName(s) | source | Decision | Rationale |
|---|-----------|--------|-----------------|--------|----------|-----------|
| 1 | **OPRAWA** | `p2b-punkt-elektryczny-oswietleniowy-szt` · namePl *Oprawa oświetleniowa punktowa* | `Montaż lamp stropowych i kinkietów` · `Punkt oświetlenia górnego` | cennikremontow.pl | **HOLD** | Exact semantic equivalence **not** confirmed from audit (see §2.1) |
| 2 | **TABLICA** | `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | `Montaż skrzynki rozdzielczej` | cennikremontow.pl | **APPROVE** | Exact same-op equivalence confirmed (see §2.2) |
| 3 | **PODEJŚCIE WOD-KAN** | `p2b-podejscie-wod-kan-mb` | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` | cennikremontow.pl | **APPROVE** | Concrete operation-to-operation · unit `mb` · not a bucket |
| 4 | **ZAWÓR** | `cc-w2-zawor-odcinajacy` | `Montaż licznika wody z zaworami odcinającymi` | cennikremontow.pl | **HOLD** | Multi-operation observed row · no price dekomposition · not 1:1 zawór |
| 5 | **GNIAZDO** | — | e.g. `Montaż gniazd i łączników` | cennikremontow.pl | **HOLD** | No concrete workId · A3 bucket FORBIDDEN |
| 6 | **WYŁĄCZNIK** | — | e.g. `Montaż wyłączników` | cennikremontow.pl | **HOLD** | No concrete workId · A3 bucket FORBIDDEN |
| 7 | **WHITE INSTALL** | — | umywalka / bateria / muszla / … | cennikremontow.pl | **HOLD** | A12 — no concrete white-install workIds |
| 8 | **DEMOLITION** | concrete workIds exist | — | CR rozbiorki **404** | **HOLD** | No reliable PRIMARY page this audit |
| 9 | **WASTE** | `legacy-transport_utylizacja-*` | — | CR wywoz **404** | **HOLD** | No reliable PRIMARY page this audit |

### Summary counts

| Status | Count | Items |
|--------|------:|-------|
| **APPROVE** | **2** | Tablica · Podejście wod-kan |
| **HOLD** | **7** | Oprawa · Zawór · Gniazdo · Wyłącznik · White install · Demolition · Waste |
| **REJECT / FORBID** | — | Bucket mappings remain A3 FORBIDDEN (not Wave-1 candidates) |

**Wave-1 IMPLEMENT scope (when Owner GO):** seed registry for **APPROVE only** (tablica + podejście). **Do not** seed HOLD rows. **Do not** invent mappingId in this Closeout.

---

## 2. Semantic equivalence rulings

### 2.1 OPRAWA → **HOLD**

| Side | Text |
|------|------|
| Catalog | `Oprawa oświetleniowa punktowa` (`szt`) — single point lighting fixture |
| Observed A | `Montaż lamp stropowych i kinkietów` — **compound** (ceiling lamps **and** wall sconces) |
| Observed B | `Punkt oświetlenia górnego` — lighting **point** / wiring-point wording, not proven fixture-mount |

**Ruling:** Audit affinity was topical/HIGH, but Owner rule requires **exact same-operation** equivalence. Compound fixture set ≠ singular „oprawa punktowa”; „punkt oświetlenia” ≠ proven fixture install.  
→ **HOLD** (not APPROVE). No invent of split aliases / no bucket absorb of all electrical rows.

### 2.2 TABLICA → **APPROVE**

| Side | Text |
|------|------|
| Catalog | `Tablica rozdzielcza mieszkaniowa` (`szt`) |
| Observed | `Montaż skrzynki rozdzielczej` (`szt`) · CR instalacje elektryczne |

**Ruling:** In Polish residential MEP, **skrzynka rozdzielcza** and **tablica rozdzielcza** denote the **same operation class** (install of the apartment distribution enclosure). Unit `szt` matches. Source page is residential electrical cennik — not a legacy `legacy-elektryka-*` bucket.  
→ **APPROVE** as concrete workId ↔ concrete observedName (exact_normalized alias at IMPLEMENT).  
**Not approved:** any other electrical CR rows under this workId.

### 2.3 PODEJŚCIE → **APPROVE**

| Side | Text |
|------|------|
| Catalog | `Podejście wodociągowo-kanalizacyjne łączone` (`mb`) |
| Observed | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` (`mb`) |

**Ruling:** Same concrete run/approach operation · unit `mb` · not `legacy-hydraulika-*`.  
→ **APPROVE**.

### 2.4 ZAWÓR → **HOLD**

Observed `Montaż licznika wody z zaworami odcinającymi` bundles **meter + shut-off valves**. Catalog is shut-off valve alone.  
→ **HOLD**. **Forbidden:** invent price dekomposition / use multi-op price as zawór-only rate.

---

## 3. Hard locks reaffirmed (A1–A12)

| ID | Lock | Wave-1 Closeout |
|----|------|-----------------|
| **A1** | `exact_normalized` only | **REAFFIRMED** |
| **A2** | `catalogUnit` + `observedUnit` · no implicit conversion | **REAFFIRMED** |
| **A3** | Legacy bucket mapping **FORBIDDEN** | **REAFFIRMED** |
| **A4** | `laborOnly` / `includesMaterial` immutable · no `allow_flagged` | **REAFFIRMED** |
| **A5** | D1 scope cannot be bypassed by mapping | **REAFFIRMED** |
| **A6** | MAX **12** aliases / mapping | **REAFFIRMED** |
| **A7** | Source roles unchanged (KB/CR/Extradom PRIMARY · SCCOT SECONDARY · Zleca REFERENCE) | **REAFFIRMED** |
| **A8** | Region mutation forbidden | **REAFFIRMED** |
| **A9** | Identity-only call-site | **REAFFIRMED** |
| **A10** | Synonym scope unchanged · no bucket→family | **REAFFIRMED** |
| **A11** | Ambiguity → AMBIGUOUS / UNMATCHED (no auto-pick) | **REAFFIRMED** |
| **A12** | workId must exist · no invent workId · white-install HOLD | **REAFFIRMED** |

### Explicit NO

- loosen `namesLooselyMatch`
- map bucket → all source rows
- invent missing workIds (gniazdo / wyłącznik / white)
- split multi-operation price (zawór)
- invent price
- seed Evidence / Accept / OUR RATE / margin
- Work Catalog write
- new hosts / PASS2 / qualify / median changes

---

## 4. IMPLEMENT binding (next GO only — not this Closeout)

When Owner issues `IMPLEMENT — WR-LABOR-IDENTITY-MAPPING-WAVE-1`, seed **only**:

| workId | Allowed observedNameAliases (exact) | catalogUnit | observedUnit | Notes |
|--------|-------------------------------------|-------------|--------------|-------|
| `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | `Montaż skrzynki rozdzielczej` | `szt` | `szt` | APPROVE |
| `p2b-podejscie-wod-kan-mb` | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` | `mb` | `mb` | APPROVE · preserve CR spelling/normalization rules of engine |

**Out of IMPLEMENT seed:** Oprawa · Zawór · Gniazdo · Wyłącznik · White · Demolition · Waste · all buckets.

**Still after IMPLEMENT seed:** Evidence populate / Accept / OUR RATE remain **separate Owner GO**.

---

## 5. Safety (Closeout — docs only)

| Check | Required | Status |
|-------|----------|--------|
| Evidence | rev 2 / `r2-7a927415` / 66 | **UNCHANGED** (no KV read/write in this Closeout) |
| Registry | EMPTY | **EMPTY** |
| Work Catalog | 460 / 34 / 426 · companyPrice 35 · OUR RATE null · marginPct 0 | **UNCHANGED** |
| KV / MAPPING / EVIDENCE WRITE | 0 | **0** |
| Accept / OUR RATE / Margin | 0 | **0** |
| HEAD | `8af757e0` = origin/main · staged 0 | **OK** |
| Code | ZERO | **OK** |

---

## 6. Status after Closeout

```text
OWNER DECISION CLOSEOUT          = COMPLETE
APPROVED for future IMPLEMENT    = 2 (tablica · podejście)
HOLD                             = 7 (oprawa · zawór · gniazdo · wyłącznik · white · demolition · waste)
REGISTRY                         = LOCAL SEED (2) · COMMIT NOT DONE
IMPLEMENT                        = LOCAL GREEN (2.66.56 · undeployed)
COMMIT / PUSH / DEPLOY           = NOT DONE
SOURCE GAP                       = OPEN
```

**STOP.**

**NEXT OWNER GO:** `OWNER GO: COMMIT — WR-LABOR-IDENTITY-MAPPING-WAVE-1`