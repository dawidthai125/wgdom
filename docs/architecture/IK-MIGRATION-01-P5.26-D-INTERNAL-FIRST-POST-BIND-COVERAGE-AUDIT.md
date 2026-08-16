# IK-MIGRATION-01 — P5.26-D INTERNAL-FIRST POST-BIND COVERAGE AUDIT

> **TRYB:** AUDIT ONLY · READ-ONLY  
> **Date:** 2026-08-15  
> **Status:** COMPLETE  
> **Artifacts:** `.tmp/p526-post-bind-coverage.json` · `.tmp/p526-post-bind-coverage-FULL.md`  
> **CREATE = 0 · WRITE = 0 · ACCEPT = 0 · RESEARCH = 0 · RESEARCH HTTP = 0 · CODE = 0 · COMMIT = 0 · PUSH = 0**

## Safety

| | |
|---|---:|
| Tender re-fetch HTTP | **0** (frozen `.tmp/p518-unknown-extract.json`) |
| Research HTTP (KB/DIY/…) | **0** |
| Catalog KV | **1× batch-get READ** (live 464 hosts) — not research |
| Matcher / F5 / domain-gate code | **0 changes** |

---

## 1. BEFORE vs AFTER (P5.26-C)

**Method:** same Master BOQ · same `lookupInternalFirst` · AFTER = full catalog 464 · BEFORE = same index **minus** 4 new hosts (simulated pre-CREATE).

| Metric (UNKNOWN lines + trusted CURRENT) | BEFORE | AFTER |
|---|---:|---:|
| TOTAL Master BOQ | 430 | 430 |
| CURRENT EXACT (trusted labor CURRENT from P5.17) | **35** | **35** |
| INTERNAL EXACT | 0 | 0 |
| INTERNAL SEMANTIC SAFE | **1** | **24** |
| INTERNAL SEMANTIC REVIEW | **81** | **41** |
| NO_INTERNAL_MATCH | **300** | **317** |
| FALSE_POSITIVE_REJECT (gate) | 4 | 4 |
| CatalogWork count | 460 (sim) | **464** |

`NO_INTERNAL_MATCH` **+17** przy `SAFE +23` i `REVIEW −40` — bilans zerowy. Część wcześniejszych REVIEW near-missów została wyparta, gdy nowy host stał się najlepszym kandydatem, ale nie przeszedł MEDIUM Owner Knowledge / LOW → liczone jako `NO_INTERNAL_MATCH`.

Trusted non-CURRENT (44−35=9) pozostaje poza bucketami matcherowymi (P5.17 baseline).

---

## 2. NEW INTERNAL HITS (4 hosty)

### Matcher `lookupInternalFirst` (niezależny od Owner bind)

| Host | BASE | Matcher groups (SAFE/REVIEW hit) | Spillover |
|------|-----:|----------------------------------|-----------|
| `cc-p0c-w1-wykucie-bruzd` | 72.5 | **015 · 024 · 081** (8 linii) | **none** |
| `cc-p0c-w1-gruntowanie-m2` | 13.5 | **067** SAFE · **045** SAFE spill | **035/036** = MEDIUM near-miss → `NO_INTERNAL_MATCH` (bez whitelist) |
| `cc-p0c-w1-malowanie-emulsja-m2` | 21.8 | **092 · 107** SAFE · **108 · 109** SAFE spill · **141 · 143** REVIEW | wapno / olej ≠ emulsja |
| `cc-p0c-w1-montaz-grzejnika-szt` | 97.3 | **153 · 154** (2 linie) | **G112** LOW near-miss → `NO_INTERNAL_MATCH` (nie SAFE) |

### Owner bind (P5.26-C) — ścieżka operacyjna F5

| Groups | Lines | Host |
|--------|------:|------|
| 015 / 024 / 081 | 8 | wykucie |
| 035 / 036 / 067 | 5 | gruntowanie |
| 092 / 107 | 6 | malowanie emulsją |
| 153 / 154 | 2 | montaż grzejnika |
| **TOTAL** | **21** | **10/10 groups** |

**Ważne:** Product Mapper alias pack **nie** był zmieniany w P5.26-C. F5 prod dla unbound ścieżek nadal zależy od explicit `catalogWorkId` / przyszłego GO na alias.

---

## 3. HTTP AVOIDED BY NEW CATALOGWORK

| Definition | Lines |
|---|---:|
| **Operational (Owner bind P5.26-C)** | **21** |
| Matcher SAFE intended (Owner families only) | **15** |
| Matcher SAFE spillover (not Owner-bound) | **6** (G045×2 · G108×2 · G109×2) |
| Research HTTP executed this audit | **0** |

**HTTP AVOIDED BY NEW CATALOGWORK (Owner-facing) = 21** — linie zbindowane w P5.26-C nie wymagają ponownego external research dla tych grup.

Spillover SAFE (6) **nie** jest auto-Accept i **nie** jest Owner-bound.

---

## 4. FALSE POSITIVE REGRESSION

| Check | Result |
|-------|--------|
| A. zaprawianie ≠ wykucie | **PASS** |
| A2. wykucie → wykucie host | **PASS** (HIGH) |
| B. głowica ≠ montaż grzejnika (synthetic probe) | **FAIL** — «Montaż głowicy… **grzejnika**» → HIGH → `montaz-grzejnika` (token overlap) |
| B′. real G112 BOQ | **PASS as non-SAFE** — LOW near-miss → `NO_INTERNAL_MATCH` (nie Accept) |
| C. MATERIAL grzejnik ≠ PACKAGE montaż | **PASS** |
| D. farba/Śnieżka MATERIAL ≠ malowanie PACKAGE | **PASS** |
| E. legacy-malowanie-m2 ≠ auto SAFE dla emulsji | **PASS** (preferowany nowy host emulsja) |
| F. gołe «Malowanie» ≠ auto emulsja PACKAGE | **PASS** |
| Spill G141/G143 (olej stolarka) → emulsja | **REVIEW only** — **nie** SAFE Accept |
| Spill G108/G109 (malowanie **wapienne**) → emulsja | **SAFE matcher — SEMANTIC RISK** — nie Owner-bound; **nie** Accept bez GO |
| Spill G045 (gruntowanie pod uszczelnienia) | **SAFE matcher spill** — nie Owner-bound |

**Matcher nie był rozszerzany.** Ryzyka = efekt istniejących hostów + istniejącego scorera.

---

## 5. REMAINING NO_INTERNAL_MATCH

Po wyłączeniu 21 linii Owner-bind:

| Residual class | Lines | Notes |
|----------------|------:|-------|
| A / C — nadal external research **lub** brak właściwego CatalogWork | **278** | nie rozdzielono A vs C bez researchu → **NOT MEASURABLE** finer split |
| B — potential internal review | **0** (w tej klasyfikacji) | historyczne REVIEW osobno w bucketach |
| D — CORRUPT / parser | **33** | grupy 191–202 |
| E — NON_COST | **2** | 189 · 190 |

---

## 6. 159 GAP status

| | |
|---|---:|
| Prior research-gap groups (P5.26 queue) | **159** |
| Operationally covered by P5.26-C bind | **10** |
| Remaining gap groups (approx) | **149** |
| Re-research this audit | **0** |

Nie uruchamiano BATCH / HTTP research pozostałych GAP.

---

## 7. F5 verification (READ-ONLY)

Z P5.26-C + live OUR RATE re-check:

| Groups | catalogWorkId | labor=BASE | material | gaps | complete |
|--------|---------------|------------|----------|------|----------|
| 015/024/081 | wykucie | 72.5 | 0 | [] | **10/10 lines PASS** |
| 035/036/067 | gruntowanie | 13.5 | 0 | [] | **PASS** |
| 092/107 | malowanie emulsją | 21.8 | 0 | [] | **PASS** |
| 153/154 | montaż grzejnika | 97.3 | 0 | [] | **PASS** |

F5 code **nie** zmieniany.

---

## 8. Integrity

| | |
|---|---:|
| Created CatalogWork (this audit) | **0** |
| Writes / Accept / Research | **0** |
| New hosts present live | **4/4** |
| zaprawianie OUR | **20** (nietknięty) |
| Unexpected matcher expansion | **0 code** · spillover = scoring side-effect |

---

## 9. ABSOLUTE STOP

**P5.26-D COMPLETE.**

- Nie BATCH  
- Nie research 149 GAP  
- Nie CREATE kolejnych hostów  
- Nie Accept (w tym spillover 045/108/109)  
- Nie P5.27  

Czekaj na Owner GO.
