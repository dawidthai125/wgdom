# CATALOG-COVERAGE-01 — IMPLEMENT P0d-A (Precision + SAFE Seed)

> **ID:** CATALOG-COVERAGE-01-IMPLEMENT-P0d-A  
> **EPIC:** CATALOG-COVERAGE-01 · **Slice:** **P0d-A**  
> **Etap:** **IMPLEMENT** · **bez commit · bez push**  
> **Data:** 2026-07-30  
> **DF:** [`CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-P0d-DESIGN-FREEZE.md) (DF-AMEND)  
> **RE-REVIEW:** [`CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REREVIEW.md`](CATALOG-COVERAGE-01-P0d-ARCHITECTURE-REREVIEW.md) · READY FOR OWNER GO  
> **UI changelog:** **2.65.90**

```text
════════════════════════════════════════════════════════
IMPLEMENT P0d-A COMPLETE (local)
Precision + Negation Guard + SAFE Seed (zawór + stop)
Coverage TV-01 live: 76.7% (= prognoza SAFE)
P0e: NIE implementowano
STATUS: READY FOR RELEASE
════════════════════════════════════════════════════════
```

---

## 0. Werdykt

| | |
|--|--|
| **STATUS** | **READY FOR RELEASE** |
| **CHANGES REQUIRED?** | **NIE** |
| **Commit / push** | **NIE wykonano** — czekają na Owner GO |
| **P0e** | **OUT** — zero seedów FULL |

---

## 1. Zakres wykonany

### A. Precision + Negation Guard

| Element | Plik | Stan |
|---------|------|------|
| Negation Guard SSOT | `src/lib/catalog-coverage/negation-guard.ts` | **NEW** |
| Pack zaprawianie REUSE Guard | `alias-pack-wave1.ts` | **UPDATED** |
| Pack multiswitch = tylko `multiswitch` | `alias-pack-wave1.ts` | **UPDATED** |
| Bind Decision w Mapper (Alias \| Core) | `tender-offer-boq-mapping.ts` | **UPDATED** |
| Export public API | `catalog-coverage/index.ts` | **UPDATED** |

**Kontrakt:** Noise → Normalizer → **Negation Guard → Bind Decision → Alias \| Core** → `catalogWorkId`.

### B. SAFE Seed + Quotes (REUSE)

| Product ID | namePl (prod) | unit | Quotes |
|------------|---------------|------|--------|
| `cc-p0c-w1-zawor-odpowietrzajacy` | Odpowietrznik automatyczny CO | `szt` | **TAK** |
| `cc-p0c-w1-stop-ptakow` | Kolce przeciwptasie (elewacja) | `mb` | **TAK** |

**OPS:** `scripts/catalog-coverage-01-p0d-a-ops.mjs --execute` → `commitMarketQuotesImport` + `batch-set` `kw-wgdom-work-catalog`.

**Uwaga jakości seed (wykonana w IMPLEMENT):** usunięto tokeny Core generujące false map (`stop`⊂stopnie, `zawor`⊂zawory, `legacyCategoryId`+unit). Alias nadal łapie ATH „Zawór odpowietrzający” / „Montaż stop ptaków”.

### OUT (nie ruszane)

- P0e FULL IDs · SMART · MARKET-SYNC · Pack kolejność #1–#6 · Fuzzy · Cloud CORE · Payroll

---

## 2. Testy

| Suite | Wynik |
|-------|--------|
| `npm run build` | **PASS** |
| `scripts/test-catalog-coverage-01-p0c.mjs` | **54 PASS** |
| `scripts/test-catalog-coverage-01-p0d-a.mjs` (TN/TP/TR/TN-CORE-Z1) | **30 PASS** |
| Owner Verification TV-01 | **PASS** (`.tmp/catalog-coverage-01-p0d-a-ov.json`) |
| TENDER-VALIDATION-01 sample (live remapa) | **PASS** — 18/2228 |

### Potwierdzenia jakości

| Check | Wynik |
|-------|--------|
| False *bez zaprawiania bruzd* → zaprawianie ID | **0** / 10 neg lines |
| False RTV/SAT → multiswitch | **0** |
| SAFE binds | zawór **4** (alias) · stop **2** (alias) — bez Core false |
| P0e IDs w Library | **0** |
| Coverage | **76.7%** (1709/2228) · baseline **76.4%** · Δ **+0.3 pp** (= prognoza SAFE) |

---

## 3. Pliki (do commit na Owner GO)

**Modified**

- `src/lib/catalog-coverage/negation-guard.ts` *(new)*
- `src/lib/catalog-coverage/alias-pack-wave1.ts`
- `src/lib/catalog-coverage/index.ts`
- `src/lib/tender-offer-boq-mapping.ts`
- `src/app/changelog-data.ts` (2.65.90)
- `CHANGELOG.md`

**Untracked (IMPLEMENT)**

- `scripts/test-catalog-coverage-01-p0d-a.mjs`
- `scripts/catalog-coverage-01-p0d-a-ops.mjs`
- `scripts/catalog-coverage-01-p0d-a-owner-verification.mjs`
- `docs/architecture/CATALOG-COVERAGE-01-IMPLEMENT-P0d-A.md`

**Cloud (FEATURE-DATA, już na KV)**

- 2 SAFE works + Quotes w `kw-wgdom-work-catalog` (nie git)

---

## 4. Raport standardowy

```text
========================================
BUILD STATUS
npm run build — PASS
========================================
TEST STATUS
P0c 54 PASS · P0d-A 30 PASS · OV PASS · TV-01 remapa PASS
========================================
GIT READINESS
Modified: changelog + catalog-coverage + mapping
Untracked: scripts P0d-A + ten raport
Staged: (brak — bez commit)
Committed: NIE
Ahead/Behind: bez zmian tip (brak push)
========================================
RELEASE READINESS
Kod + testy PASS · SAFE na cloud
RELEASE GO po: git add + commit + push (Owner)
obecnie: RELEASE NOT READY (brak commit) — status slice: READY FOR RELEASE
========================================
VERSION
Changelog: 2.65.90
HEAD / origin: bez bumpa deploy (local only)
========================================
WERDYKT
IMPLEMENTATION COMPLETE (lokalnie) · READY FOR RELEASE
Commit/push: czekają na Owner GO
========================================
```

---

## 5. Status końcowy

```text
════════════════════════════════════════════════════════
STATUS: READY FOR RELEASE
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **READY FOR RELEASE** | **TAK** |
| **CHANGES REQUIRED** | **NIE** |
| **Następny krok Owner** | `git add` plików P0d-A → **commit** → **push** → VERIFY FAST `version.json` = **2.65.90** |
| **P0e** | Osobny Owner GO — **nie** startować automatycznie |

**HOTFIX CLASSIFICATION (przy przyszłym release):** BUGFIX · FEATURE-DATA
