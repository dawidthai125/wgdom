# STORAGE-TIER1-PIPELINE-CONTRACT-01 — EPIC CLOSEOUT

> **STATUS:** **EPIC CLOSED / PRODUCTION VERIFIED**  
> **Data closeout:** 2026-09-19 (Phase 22 — documentation only · **COMPLETE**)  
> **Release:** UI **2.66.231** · commit **`16bfb9f3`** (`16bfb9f3f5b016ab89e7f371019115e858e26f8c`)  
> **Live tip:** FETCH `https://www.wgdom.fun/version.json` (expected **2.66.231** / **`16bfb9f`**) · SSOT tip also [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Runtime change in Phase 22:** **NONE** · **Production mutation in Phase 22:** **NONE**  
> **Phase 22 report:** `.tmp/STORAGE-TIER1-PIPELINE-CONTRACT-01-PHASE-22-DOCUMENTATION-CLOSEOUT-REPORT.md` (ops; not committed)

```text
IDB FULL  →  LS INDEX  →  Cloud LEAN
local durable authority · hot representation · cross-device authority
INDEX IS NEVER FULL · INDEX never reaches Cloud · downgrade after INDEX rollout UNSUPPORTED
```

---

## 1. What / Why

| | |
|--|--|
| **WHAT** | STORAGE-TIER1-PIPELINE-CONTRACT-01 — kontrakt magazynu `kw-tenders-pipeline` |
| **WHY** | `QuotaExceededError` na LS (~2.65–2.69 MB pipeline przy LS total ~4.7 MB) · multiple writers · brak lokalnego FULL durable · INDEX vs FULL confusion |
| **OUT OF SCOPE** | Payroll · Edge · generic storage-manager · `kw-tender-ingest-v1` · Track B rewrite · Cloud schema change |

---

## 2. Lifecycle (COMPLETE)

```text
AUDIT → RCA → PLAN → DESIGN FREEZE (+ Amendment A F-P0-01)
→ ARCH REVIEW → OWNER GO → IMPLEMENT (Phases 1–11)
→ TEST → COMMIT (16bfb9f3) → PUSH → PRODUCTION VERIFY (Phase 18)
→ MIN VERSION SET (Phase 19) → INDEX ON (Phase 20)
→ AUTHENTICATED UI VERIFY (Phase 21) → DOCUMENTATION CLOSEOUT (Phase 22)
→ EPIC CLOSE
```

| Phase | Outcome |
|---|---|
| 0–11 | Implement + tests (IDB envelope, INDEX, dual-write, readers, cutover, one-writer, quota, version gate, cloud sanitize, old-client) |
| 12–17 | Release prep · scope · commit **`16bfb9f3`** |
| 18 | Production verify · flag still OFF · min `""` |
| 19 | `pipelineLocalIndexMinAppVersion = "2.66.231"` · flag still OFF |
| 20 | `pipelineLocalIndexV1 = true` · PRODUCTION_ROLLOUT **PASS** |
| 21 | Authenticated Przetargi UI · P20-P3-03 **CLOSED** |
| 22 | Documentation closeout (this pack) |

---

## 3. Production baseline (LOCKED)

| Pole | Wartość |
|---|---|
| VERSION | **2.66.231** |
| COMMIT | **`16bfb9f3`** |
| `pipelineLocalIndexV1` | **`true`** (production AppSettings) |
| `pipelineLocalIndexMinAppVersion` | **`"2.66.231"`** |
| Code default flag | still `false` (fail-closed until Cloud/settings ON) |
| `pipelineCloudLeanGuardV1` | `true` (unchanged Track B) |
| Destructive migration | **NO** |
| Data loss (Phase 20/21) | **NO** |
| QuotaExceededError (rollout) | **NO** |
| INDEX in Cloud | **NO** (`_lsIndex` absent) |

Evidence (worktree / ops, not committed):

- `.tmp/STORAGE-TIER1-PIPELINE-CONTRACT-01-PHASE-18-PRODUCTION-VERIFY-REPORT.md`
- `.tmp/STORAGE-TIER1-PIPELINE-CONTRACT-01-PHASE-19-MIN-VERSION-ROLLOUT-REPORT.md`
- `.tmp/STORAGE-TIER1-PIPELINE-CONTRACT-01-PHASE-20-INDEX-ROLLOUT-REPORT.md`
- `.tmp/STORAGE-TIER1-PIPELINE-CONTRACT-01-PHASE-21-PRZETARGI-UI-VERIFY-REPORT.md`

---

## 4. Authority model (LOCKED)

| Layer | Role | Representation |
|---|---|---|
| **IDB** `tenders-pipeline-full` | Local durable **FULL** authority | Envelope v1 + ACK (`localSeq`) |
| **LS** `kw-tenders-pipeline` | Canonical **hot INDEX** | Items with `_lsIndex` · never FULL |
| **Cloud** `kw-tenders-pipeline` | Cross-device **LEAN** | Track B · no `_lsIndex` |

FULL-required operations resolve: **RAM FULL → valid IDB FULL → explicitly validated external FULL**. LS INDEX never promotes to FULL (PIPELINE-INDEX-01 · PIPELINE-NO-CONVERSION-01).

Canonical local writer: `saveTendersPipelineLocal` only.

---

## 5. Invariants (from Design Freeze)

- PIPELINE-DURABLE-01 · PIPELINE-QUOTA-01 · PIPELINE-WRITER-01 · PIPELINE-CLOUD-01 · PIPELINE-INGEST-01  
- PIPELINE-INDEX-01 · PIPELINE-FULL-SOURCE-01 · PIPELINE-NO-CONVERSION-01 · PIPELINE-CLOUD-SAFETY-01  

Canonical: [`STORAGE-TIER1-PIPELINE-CONTRACT-01-DESIGN-FREEZE.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-DESIGN-FREEZE.md)

---

## 6. Accepted limitations

| ID | Limitation |
|---|---|
| **Downgrade** | Production **downgrade** to pre-2.66.231 after INDEX rollout is **UNSUPPORTED** (Owner Rule #6 · P20-P2-01). Old client @ `3bfecc7f` / 2.66.230 can mis-read INDEX as body and overwrite IDB FULL. |
| **Supported rollback** | Set `pipelineLocalIndexV1 = false` (writer → LEGACY_LEAN on LS; IDB FULL preserved). Do **not** lower min version. Do **not** convert INDEX→FULL. Do **not** reset Cloud. |
| **Config durability** | Old clients can drop unknown AppSettings keys on Cloud overwrite (availability-only · fail-closed). Mitigation = ordering: release → min → flag. |
| **P21-P2-01** | Authenticated bootstrap/detail may ACK/`index_written` and bump `localSeq` without count drift — existing persist path, not INDEX→Cloud. |
| **Ingest** | `kw-tender-ingest-v1` remains **outside** this contract (PIPELINE-INGEST-01). |

---

## 7. Canonical docs (SSOT)

| Document | Role |
|---|---|
| [`ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md`](ADR-STORAGE-TIER1-PIPELINE-CONTRACT-01.md) | Decisions D1–D10 + closeout |
| [`STORAGE-TIER1-PIPELINE-CONTRACT-01-PLAN.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-PLAN.md) | Phased plan + closeout |
| [`STORAGE-TIER1-PIPELINE-CONTRACT-01-DESIGN-FREEZE.md`](STORAGE-TIER1-PIPELINE-CONTRACT-01-DESIGN-FREEZE.md) | Frozen design + Amendment A + closeout |
| This file | Epic closeout / cold-start pointer |
| Tip | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |

Do **not** duplicate phase reports into Master SSOT — link here.

---

## 8. Tests (release)

`scripts/test-storage-tier1-pipeline-*.mjs` · Gate B `--scope tenders` · old-client suite manual (`--main` pin `3bfecc7f`).

---

## 9. Final gate

```text
EPIC                         = CLOSED
PRODUCTION_VERIFIED          = YES
PRODUCTION_ROLLOUT           = PASS
PHASE_21_UI                  = PASS
P20-P3-03                    = CLOSED
RUNTIME_CHANGE_PHASE_22      = NO
PROD_MUTATION_PHASE_22       = NO
NEW_ARCHITECTURE_ABSTRACTION = NO
```
