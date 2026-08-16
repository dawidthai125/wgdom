# IK-MIGRATION-01 — P10 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P10-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **Closeout:** [`IK-MIGRATION-01-P10-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P10-IMPLEMENTATION-CLOSEOUT.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.87** |
| Impl commit | **`7a32bb34`** |
| Live `version.json` (one-shot) | **2.66.87** / **`7a32bb3`** |
| Ancestry | **live short ⊂ impl** (`7a32bb3` ⊂ `7a32bb34`) |
| Verdict | **PRODUCTION VERIFIED / LOCKED** |

---

## Bundle containment (PASS)

Live assets: `index-lOnG3ksi.js` · `app-core-Dv9yN8Wk.js` · `TendersModule-DxHFWv3F.js` · `GuideView-DxuRnlM4.js`

| Marker | Result |
|--------|--------|
| `data-ik-entry-host` | **HIT** |
| `data-ik-first-screen` | **HIT** |
| `data-s7-tre-recovery-cta` | **HIT** |
| `data-s7-tre-recovery` | **HIT** |
| `data-s7-hub-first` | **HIT** |
| `Rekomendowana cena` | **HIT** |
| Changelog **2.66.87** / P10 label | **HIT** (GuideView + app-core) |
| `TenderAutonomousGate` | **ABSENT** |
| `TenderAutonomousRunScreen` | **ABSENT** |
| `ng10_gate` | **ABSENT** |
| `ikP10Enabled` / `ikP10*` | **ABSENT** |

---

## Owner Verify (manual — PASS prior to PV)

| Check | Status |
|-------|--------|
| `/przetarg` → IkEntryHost · no NG-10 Run | **PASS** |
| Expert OFF + `kw-tre-01-slice-a=1` → Recovery CTA · no auto Outcome | **PASS** |
| CTA → Outcome | **PASS** |
| `ikEntryEnabled` OFF → workspace · **no** NG-10 Gate | **PASS** |

---

## Production locks

| Check | Status |
|-------|--------|
| D default `expertAiDecydentEnabled: false` | **PASS** (commit lock) |
| D diff = 0 | **PASS** |
| CatalogWork **471** | **UNCHANGED** |
| No NG-10 soft fallback | **PASS** (Gate/Run absent; OFF = no host) |
| No empty root path introduced | **PASS** (Owner + `return detailWorkspace`) |
| Pricing / Research / Accept mutation in P10 | **NONE** |
| F5-T2 | **PRE-EXISTING · OUT OF P10 GREEN CLAIM** |
| P5.33 | **NOT CREATED** |

---

## Tests / build (from release — not re-run in PV)

```text
P10: 26 PASS / 0 FAIL
S7 TRE: 31 PASS / 0 FAIL
P0–P9 · TRE-01/02 · Bid · MULTI-DWELLING-01 72/0 · BUILD: PASS
IMPL: 7a32bb34
```

---

## FINAL

```text
P10 = PRODUCTION VERIFIED / LOCKED
LIVE = 2.66.87 / 7a32bb3
IMPL = 7a32bb34
NG-10 = DECOMMISSIONED
IK = FIRST-SCREEN
D diff = 0
CatalogWork = 471
F5-T2 = PRE-EXISTING OUT OF P10 GREEN CLAIM
```
