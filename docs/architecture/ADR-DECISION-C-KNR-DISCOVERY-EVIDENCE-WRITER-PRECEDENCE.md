# ADR — DECISION C · KNR Discovery Evidence Writer Precedence / Owner HARD Authority

| Pole | Wartość |
|------|---------|
| **ID** | `ADR-DECISION-C-KNR-DISCOVERY-EVIDENCE-WRITER-PRECEDENCE` |
| **Status** | **OWNER APPROVED** |
| **Decision C** | **`OWNER_HARD_WINS`** |
| **Architectural decision** | **CLOSED** |
| **Runtime implementation** | **COMPLETE** · PRODUCTION VERIFIED · commit **`50bce20d`** |
| **Data (ADR created)** | 2026-09-21 (M5) |
| **Data (Owner architectural closeout)** | 2026-09-21 |
| **Data (runtime + production closeout)** | 2026-09-21 |
| **KV / store** | `kw-knr-discovery-evidence` |
| **Canonical writer** | `saveKnrDiscoveryEvidenceStore` |
| **Merge / conflict** | `mergeKnrDiscoveryEvidenceStoreDetailed` · authority-aware resolver · `pickConflictLayer1` (L1 only) |
| **Baseline tip (documentary)** | **FETCH** `/version.json` · expected **2.66.231 / `50bce20`** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Decydent** | Owner repo (Dawid) |
| **Powiązane** | Master SSOT **§13.6 · §24 #17 · R-3** · [`IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md) §14 · Reuse Map §5 · AI Continuity |

```text
════════════════════════════════════════════════════════
HARD BOUNDARY (PRODUCTION CLOSEOUT 2026-09-21):
  ✓ Architectural Decision C = CLOSED · OWNER_HARD_WINS · OWNER APPROVED
  ✓ Runtime IMPLEMENT = COMPLETE (SEAM-DC-1/2/3)
  ✓ Production deploy + verify = PASS · tip 2.66.231 / 50bce20
  ✓ No production KV mutation / no Owner HARD mint / no destructive sync in PV
  ✗ Owner HARD minting UI/API = NOT in Decision C (separate future Owner GO)
  ✗ no Global IK PV / Full Autonomy claim
  ✗ OWNER_FINANCE_NOT_OK unchanged (bid node · ≠ Decision C)
  ✗ Model C remains FROZEN (implementation status unchanged)
════════════════════════════════════════════════════════
```

---

## 0. Owner Decision (authoritative)

**Owner explicitly selected:**

```text
OWNER_HARD_WINS
  for store: kw-knr-discovery-evidence
```

| Pole | Wartość |
|------|---------|
| **Decision C** | **`OWNER_HARD_WINS`** |
| **Status** | **OWNER APPROVED** |
| **Architectural decision** | **CLOSED** |
| **Scope** | Architectural authority model for `kw-knr-discovery-evidence` |
| **Not in this closeout** | Runtime `pickConflict` / writer / persist / conflict-detection IMPLEMENT |

---

## 1. Semantic model (three layers — LOCKED)

Decision C **nie** jest jedną regułą „zawsze wygrywa X”. Owner zatwierdził **trzy warstwy**:

### Layer 1 — NORMAL AUTOMATED WRITES

Normal writer precedence pozostaje **deterministyczna i contract-bound**.

- Automated persistence (KL3 · ATH RMS wire · CloudLoader bootstrap · ops) nadal podlega **istniejącemu** kontraktowi writera.
- Ten ADR **nie inventuje** nowego algorytmu normal sync.
- Ten ADR **nie** ustanawia `NEXT_LOCAL_WINS` ani `CLOUD_WINS` jako **business authority** Ownera.

**HISTORICAL / SUPERSEDED (pre-Decision-C runtime):** Before IMPLEMENT @ `50bce20d`, unsafe ACTIVE/ACTIVE resolution used `NEXT_LOCAL_WINS` (`pickConflict` → next/local). That was a **runtime fact**, not Owner business policy. It is **superseded** by Decision C runtime.

**CURRENT Decision C runtime (@ `50bce20d`):**

```text
L1 — safe deterministic (presence / same-hash / ACTIVE vs SUPERSEDED)
L2 — unsafe ACTIVE/ACTIVE + content|family mismatch + no valid HARD → CONFLICT + durable authorityHold
L3 — exactly one valid OWNER_HARD → OWNER_HARD_WINS (side-agnostic)
L3b — two valid OWNER_HARD + different hashes → OWNER_EXCEPTION / HOLD
```

`NEXT_LOCAL_WINS` ≠ current business authority · ≠ current unsafe-conflict winner.

### Layer 2 — CONFLICT (unresolved business conflict)

Gdy system **nie może bezpiecznie** rozstrzygnąć konfliktu:

```text
HOLD
*
OWNER EXCEPTION
```

| Zakaz | Znaczenie |
|-------|-----------|
| **No silent winner** | Brak cichego zwycięzcy |
| **No accidental last-write-wins** | Brak przypadkowego LWW jako authority |
| **No arbitrary source priority** | Brak arbitralnego priorytetu źródła jako business rule |

Konflikt nierozstrzygalny → **HOLD / Owner Exception** — nie automatyczny wybór local ani cloud.

### Layer 3 — OWNER HARD AUTHORITY

**`OWNER_HARD_WINS`** oznacza:

> Jawna decyzja Ownera ma **najwyższy** authority w nierozstrzygniętym konflikcie biznesowym dla `kw-knr-discovery-evidence`.

| `OWNER_HARD_WINS` **oznacza** | `OWNER_HARD_WINS` **NIE oznacza** |
|-------------------------------|-----------------------------------|
| Explicit Owner decision overrides an **unresolved business conflict** | Każdy lokalny zapis „od Ownera” automatycznie nadpisuje każdy zapis cloud |
| Owner HARD = **authority**, nie freshness | Normal persistence omija writer contracts |
| Highest authority **po** jawnej decyzji / oznaczeniu HARD | Owner staje się zwykłym synchronization writerem |
| Chroni przed silent override przez automated persistence | `CLOUD_WINS` lub `NEXT_LOCAL_WINS` jako final business policy |

**AUTHORITY ≠ FRESHNESS** (lesson `0909-04` · Master §13.6) pozostaje w mocy.

---

## 2. Architectural question (answered)

**Pytanie:** Jaka jest autorytatywna polityka Owner HARD / conflict authority dla `kw-knr-discovery-evidence`?

**Odpowiedź (Owner APPROVED):**

```text
L1 — NORMAL automated writes → safe deterministic (presence / same-hash / ACTIVE vs SUPERSEDED)
L2 — UNSAFE ACTIVE/ACTIVE + content|family mismatch + no valid HARD → CONFLICT + durable authorityHold
L3 — exactly one valid OWNER_HARD → OWNER_HARD_WINS (side-agnostic)
L3b — two valid OWNER_HARD + different hashes → OWNER_EXCEPTION / HOLD
```

Ścieżka kodu (**RUNTIME COMPLETE** @ `50bce20d`):

```text
saveKnrDiscoveryEvidenceStore / cloud-sync merge
  → mergeKnrDiscoveryEvidenceStoreDetailed
    → resolveKnrDiscoveryAuthorityConflict
      → L1 pickSameHash / pickConflictLayer1 (safe only)
      → L2 applyAuthorityHold (CONFLICT + authorityHold)
      → L3 / L3b OWNER_HARD_WINS / OWNER_EXCEPTION
```

`NEXT_LOCAL_WINS` = **HISTORY runtime fact** (pre-IMPLEMENT) · **≠** business authority · **superseded** for unsafe ACTIVE/ACTIVE by L2 HOLD.

---

## 3. Safety requirement (preserved)

Owner HARD authority **must not** be silently overridden by automated persistence.

Po Decision C PRODUCTION CLOSEOUT:

- Architectural policy = **`OWNER_HARD_WINS`**
- Runtime = authority-aware merge · durable `authorityHold` · etag fingerprints authority state
- `conflicts[]` = ephemeral diagnostics only · `authorityHold` = durable HOLD representation
- ATH / public wire **cannot** mint `ownerHardAuthority`
- Legacy records without `ownerHardAuthority` = **NOT HARD**
- CONFLICT consumers fail closed (`isEvidenceServable` excludes CONFLICT · LABOR_ONLY exception on CONFLICT)
- Owner HARD minting UI/API = **still OPEN** (separate Owner GO · OD-DC-DF-4)

---

## 4. Existing state before Owner Decision (HISTORY)

Źródła faktów sprzed closeout (nie invent):

| Źródło | Co było ustalone przed Owner Decision |
|--------|---------------------------------------|
| Master SSOT §13.6 · §24 #17 | R-3 OPEN · runtime = `NEXT_LOCAL_WINS` · Owner HARD ≠ formal writer authority · next = ADR ONLY |
| Continuity handoff 2026-09-16 §14 | R-3 OPEN · opcje `CLOUD_WINS` / `OWNER_HARD_WINS` / `pickConflict` change zakazane bez ADR |
| Reuse Map §5 | ADR path · Decision C było OPEN |
| PV KL3 persist (`a07ab4be`) | Canonical persist IMPLEMENTED · **≠** Decision C closed at that time |

### 4.1 Runtime path before IMPLEMENT (HISTORY)

```text
ACTIVE/ACTIVE conflict
  → pickConflict
    → next/local   (= NEXT_LOCAL_WINS)   ← HISTORY RUNTIME FACT (pre-50bce20d)
```

### 4.2 Incident `0909-04` (HISTORY)

Test bez `discoveryPersistIo` + Node empty `localStorage` → writer wybrał next/local → Owner HARD chwilowo nadpisany. Auto-heal. **R-2 CLOSED**. **R-3 architectural** → **CLOSED** ADR (Owner APPROVED). **R-3 runtime** → **COMPLETE** @ `50bce20d` (PRODUCTION VERIFIED).

---

## 5. Options (disposition)

| Opcja | Opis | Disposition |
|-------|------|-------------|
| **A · `NEXT_LOCAL_WINS`** | Pre-existing **runtime** (`pickConflict` → next/local) | **NOT selected as business authority** · HISTORY runtime fact until IMPLEMENT · **superseded** by Decision C runtime @ `50bce20d` |
| **B · `CLOUD_WINS`** | Alternatywa z materiału Decision C | **REJECTED** as Decision C policy |
| **C · `OWNER_HARD_WINS`** | Owner HARD highest authority on unresolved business conflict | **SELECTED · OWNER APPROVED · ARCHITECTURAL CLOSED · RUNTIME COMPLETE · PRODUCTION VERIFIED** |
| **D · immediate `pickConflict` / guard change** | Implementacja | **DONE** under separate IMPLEMENT Owner GO → commit **`50bce20d`** |

---

## 6. Decision status

| Pole | Wartość |
|------|---------|
| **Decision C** | **`OWNER_HARD_WINS`** |
| **Status** | **OWNER APPROVED** |
| **Architectural decision** | **CLOSED** |
| **ADR** | **ten plik** (jedyny) |
| **Runtime** | **COMPLETE** · authority-aware merge · durable `authorityHold` |
| **Production** | **VERIFIED** · **2.66.231 / `50bce20`** · commit **`50bce20d7ecd89b60cbc4050c3d840d6acf873fb`** |
| **HARD minting UI/API** | **NOT in Decision C** · separate future Owner GO |

```text
DECISION C → ADR → Owner Decision (DONE · OWNER_HARD_WINS)
  → PLAN → DF → ARCH REVIEW → IMPLEMENT GO (DONE)
  → COMMIT/PUSH/DEPLOY (DONE · 50bce20d)
  → PRODUCTION VERIFY (PASS)
```

---

## 6A. Production closeout record (2026-09-21)

| Pole | Wartość |
|------|---------|
| **Commit** | `50bce20d7ecd89b60cbc4050c3d840d6acf873fb` |
| **Production** | **2.66.231 / `50bce20`** |
| **Deployment** | **PASS** (Vercel Git Integration after push) |
| **Production verification** | **PASS** (read-only bundle + tip alignment) |
| **Consumer safety** | **PASS** (CONFLICT not authoritative evidence) |
| **PV constraints** | No production KV mutation · no Owner HARD minted · no destructive sync |

---

## 7. Still open (out of Decision C scope)

**NIE w zakresie Decision C closeout (celowo OPEN):**

1. Owner HARD minting UI/API (OD-DC-DF-4 · separate Owner GO)
2. General Owner decision writer
3. Model C bridges
4. Global IK Production Verified
5. Full Autonomy
6. `OWNER_FINANCE_NOT_OK` (bid node)

Architectural + runtime Decision C **CLOSED/COMPLETE** · minting / Model C / Global PV **UNCHANGED OPEN**.

---

## 8. Explicit claims / non-claims

### Claims (production closeout)

- Decision C architectural policy = **`OWNER_HARD_WINS`**
- Status = **OWNER APPROVED**
- Architectural decision = **CLOSED**
- Runtime SEAM-DC-1/2/3 = **COMPLETE** @ `50bce20d`
- Production = **VERIFIED** · tip **2.66.231 / `50bce20`**
- Three-layer semantic model (§1) = **LIVE**

### Non-claims

- Owner HARD minting UI/API shipped
- `NEXT_LOCAL_WINS` adopted as business authority
- `CLOUD_WINS` adopted
- Global IK Production Verified
- Full Autonomy Complete
- `OWNER_FINANCE_NOT_OK` resolved
- Model C unfrozen / bridges shipped

---

## 9. Preserve global status (unchanged)

| Flag | Stan |
|------|------|
| **Global IK PV** | **NO** |
| **Full Autonomy** | **NO** |
| **OPEN NODE (bid)** | **`OWNER_FINANCE_NOT_OK`** |
| **Model C** | **FROZEN** (implementation status unchanged) |

---

## 10. Pointers (REUSE FIRST)

| Dokument | Rola |
|----------|------|
| [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §13.6 · §24 #17 | SSOT R-3 **CLOSED** (runtime COMPLETE · production VERIFIED) |
| [`IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-09-16.md) §14 | Session CURRENT_OPEN (HISTORY of OPEN state) |
| [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md) §5 | Seams · Decision C COMPLETE pointer |
| [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md) | Cold-start |
| `.tmp/IK_ATH_RMS_DISCOVERY_PERSIST_INTEGRITY_INCIDENT_RCA.md` | Incident RCA (local) |

**Jeden** ADR Decision C — ten plik. Nie tworzyć duplikatów.

---

*Decision C production closeout 2026-09-21 · OWNER_HARD_WINS · ARCH CLOSED · RUNTIME COMPLETE · PRODUCTION VERIFIED @ 50bce20d / 2.66.231 · HARD minting / Model C / Global PV / Full Autonomy / OWNER_FINANCE_NOT_OK UNCHANGED OPEN*
