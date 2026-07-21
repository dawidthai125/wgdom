# TEST-HARNESS-01 H0.x — Persist Ledger · ARCHITECTURE REVIEW

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Etap:** ARCH REVIEW COMPLETE  
> **Data:** 2026-07-21  
> **Owner GO ARCH REVIEW:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-AUDIT.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-RCA.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-PLAN.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-PLAN.md) · [`TEST-HARNESS-01-H0X-PERSIST-LEDGER-DESIGN-FREEZE.md`](TEST-HARNESS-01-H0X-PERSIST-LEDGER-DESIGN-FREEZE.md)  
> **Parent:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) · H0 FINAL VERIFY §6  
> **Fundament:** H0–H5 tooling **RELEASED** · H5 epic **CLOSED** · tip **`3356349`**  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · **PRODUCTION VERIFIED · GREEN**  
> **IMPLEMENT:** **BLOCKED** do Owner GO IMPLEMENT  
> **Zasady review:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · MOBILE FIRST · D5 ZERO Core

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| 1. Zgodność z SSOT? | **TAK** |
| 2. D5 ZERO Core? | **TAK** |
| 3. Hybrid C poprawny? | **TAK** |
| 4. Lifecycle + recovery poprawne? | **TAK** |
| 5. Concurrency `h0x.lock` poprawna? | **TAK** |
| 6. Cleaner registry + REUSE H0/H1/H2/H4/H5? | **TAK** (binding §3.6) |
| 7. Brak nowych kluczy KV? | **TAK** · E REJECT |
| 8. Brak wpływu Core / Payroll / Theme / Edge? | **TAK** |
| 9. Gotowość do IMPLEMENT bez zmiany DF? | **TAK** |
| Czy wolno IMPLEMENT teraz? | **NIE** — czekaj Owner GO IMPLEMENT |

```text
══════════════════════════════════════
ARCH REVIEW DECISION

        ARCH APPROVED

        BLOCK IMPLEMENT
        (until Owner GO IMPLEMENT)
══════════════════════════════════════
```

**ARCH CHANGES REQUIRED:** **NIE**.

Zmiany DF / RCA **nie** są wymagane. Bindingi implementacyjne (§3.6 / §5) nie otwierają redesignu.

---

## 2. Zakres przeglądu

Przegląd formalny zamrożonego projektu H0.x **bez** kodu, **bez** commit/push, **bez** zmian Production.

Kryteria = lista Ownera (1–9) + DF D-H0X-01…28 + #H0X-001…012 + parent #PSB-001…015.

---

## 3. Checklist weryfikacji (1–9)

### 3.1 Zgodność z SSOT — **PASS**

| SSOT | Status |
|------|--------|
| H0 FINAL VERIFY §6 gap (in-memory tracker) | Adresowany Hybrid C |
| AUDIT → RCA → PLAN → DF łańcuch | Spójny · decyzja C zachowana |
| RCA: ledger before set · pending/open · E REJECT | D-H0X-02/07/08 |
| PLAN H0.x.0–H0.x.6 | DF §7 1:1 |
| Parent D4/D5/D8/D9 · #PSB-* | DF §0 dziedziczy |
| In-session PSB-001 nie zastąpione | #H0X-001 |
| `.tmp/prod-sandbox-out/` gitignored | #PSB-014 · D-H0X-03/04 |

### 3.2 D5 ZERO Core — **PASS**

| Obszar | Werdykt |
|--------|---------|
| `cloud-sync.ts` / merge / fence / PWRB | **OUT** scope · D-H0X-24 |
| Edge `supabase/functions/**` | **ZERO** edycji · reuse `kv-client` only |
| App / Theme / changelog / `version.json` | **ZERO** |
| Jedyna warstwa zmian | `test-infra/prod-sandbox/**` + manifest + thin script + docs |
| Import Core merge do harness | **ZAKAZ** (#PSB-008/009) |

```text
D5 ZERO Core: ARCH CONFIRMED
```

### 3.3 Hybrid C — **PASS**

| Warstwa | DF | Review |
|---------|-----|--------|
| Primary file ledger | ON | Właściwy antidotum na kill mid-run |
| Secondary KV scan | OFF default · `PSB_H0X_SCAN=1` | Safety net · nie sole mechanism (#H0X-008) |
| Signals | Complement | Nie udaje durability vs SIGKILL |
| KV ledger E | REJECT | #PSB-006 zachowane |

**Werdykt:** Hybrid C jest spójny z RCA i nie miesza odpowiedzialności.

### 3.4 Lifecycle i recovery — **PASS**

| Element | Status |
|---------|--------|
| `pending → open → cleaning → closed → prune` | Spójne D-H0X-07/26 |
| `pending` BEFORE `batch-set` | Anti-orphan · D-H0X-08 · #H0X-002 |
| `pending` + absent → prune PASS | D-H0X-27 · idempotent (#H0X-011) |
| Recovery order lock → ledger → scan? → scenario | D-H0X-10 |
| In-session `finally` PSB-001 | Zachowane AC-09 |
| Kill simulation AC-02 | Wystarczający dowód bez OS kill |

**Brak blockers:** semantyka bridge (§5.5 DF) jest wystarczająco zamrożona; styl wrapper vs hook = implementacyjny.

### 3.5 Concurrency (`h0x.lock`) — **PASS**

| Reguła | Status |
|--------|--------|
| Single-writer | D-H0X-17 · #H0X-007 |
| `PSB_H0X_LOCK_HELD` FAIL loud | #H0X-004 |
| Stale takeover + WARNING | D-H0X-18 |
| Ambiguous pid → prefer FAIL | DF §8 — bezpieczne |
| Osobny moduł `h0x-lock.mjs` | D-H0X-05 — czysta separacja |
| Multi-machine OUT | Akceptowalne MVP |

### 3.6 Cleaner registry + REUSE — **PASS** (z bindingiem)

| kind | REUSE target | Istnieje w repo? |
|------|--------------|------------------|
| `tender` / `cloud` | `cleanupSandboxTender` | **TAK** (`tender-helpers.mjs`) · H1/H4 |
| `job` | `cleanupSandboxJob` | **TAK** (`job-helpers.mjs`) · H2 |
| `catalog` | H5 RMW remove | **TAK** — `removePsbWork` + batch-set pattern w `h5-biblioteka` / `catalog-helpers.mjs` |
| `other` | no-op KV | **OK** |
| unknown | FAIL loud | D-H0X-16 |

| Komponent H0 | Review |
|--------------|--------|
| markers / mutate-guard / CleanupTracker / kv-client / report | **MUST reuse** |
| H1/H2 lokalny orphan-scrub | **MUST deprecate** (D-H0X-20) · ZERO DUPLICATE |
| Drugi KV client | **FAIL review jeśli powstanie** |

**Binding implementacyjny (nie zmienia DF):**

1. **Catalog cleaner:** wyekstrahować cienką `cleanupSandboxCatalogWork(kv, id, opts)` do `catalog-helpers.mjs` (lub registry-local wrapper) — **REUSE** `removePsbWork` + `bumpUpdatedAt` + gated `batchSet` · **nie** kopiować merge Core.  
2. **Bridge:** preferowany jeden helper `withLedgerTrackedWrite(...)` używany przez H1/H2/H4/H5 create paths — gwarantuje AC-04/AF-04.  
3. **Scan prefix map:** `psb-tender-*`→tender · `psb-cloud-*`→cloud · `psb-job-*`→job · pozostałe `psb-*` w work-catalog → catalog; konflikt prefiksów → WARNING skip (zgodnie z unmappable).  
4. **PIPELINE_KEY:** reuse stałej z `tender-helpers` / H1 (`kw-tenders-pipeline`) — nie hardcodować drugiej nazwy.

### 3.7 Brak nowych kluczy KV — **PASS**

| Mechanizm | KV key nowy? |
|-----------|--------------|
| File ledger | **NIE** |
| Lock file | **NIE** (lokalny FS) |
| SCAN_KEYS | Tylko istniejące write-surfaces H1/H2/H5 |
| Wariant E | **REJECT** |

### 3.8 Brak wpływu Core / Payroll / Theme / Edge — **PASS**

| Obszar | Kontrola | Status |
|--------|----------|--------|
| Core | Scope OUT · D-H0X-24 | **PASS** |
| Payroll | Poza registry · poza SCAN_KEYS · H3-B/C OUT | **PASS** |
| Theme | Brak plików UI/theme | **PASS** |
| Edge source | Brak edycji functions | **PASS** |
| Production feature UX | Tooling-only | **PASS** |

### 3.9 Gotowość do implementacji — **PASS**

| Kryterium | Status |
|-----------|--------|
| Interfejsy API zamrożone | DF §5 |
| Etapy H0.x.0–6 z gate | DF §7 |
| AC / AF / DoD | DF §11–12 |
| Scope IN/OUT | DF §10 |
| Bindingi nie wymagają redesignu | §3.6 |
| MOBILE FIRST | **N/A tooling** — brak UI; nie narusza (PASS) |

**Gotowość architektury:** **TAK** — można IMPLEMENT po Owner GO bez zmiany DF.

---

## 4. Ryzyka resztkowe (nie blokują APPROVED)

| ID | Ryzyko | Severity | Postawa ARCH |
|----|--------|----------|--------------|
| R-A1 | Windows pid liveness false-negative | P2 | DF: ambiguous → FAIL loud |
| R-A2 | Create path omija bridge | P1 | AC-04/AF-04 + binding `withLedgerTrackedWrite` |
| R-A3 | H5 dual-region w recovery | P2 | `meta` + istniejący dual verify H5 pattern |
| R-A4 | Scan egress gdy ON | P2 | Default OFF · Owner opt-in |

Żadne R-A* nie wymaga **ARCH CHANGES REQUIRED**.

---

## 5. Spójność z obowiązkowymi zasadami

| Zasada | Werdykt |
|--------|---------|
| SSOT FIRST | **PASS** — DF jest jedynym kontraktem implementacji |
| REUSE FIRST | **PASS** — cleaners + kv-client + H0 foundations |
| ZERO DUPLICATE | **PASS** — jeden recovery path · scrub H1/H2 deprecate |
| MOBILE FIRST | **N/A PASS** — brak powierzchni UI |
| D5 ZERO Core | **PASS** |

---

## 6. Decyzja końcowa

```text
ARCH REVIEW COMPLETE

DECISION: ARCH APPROVED

ARCH CHANGES REQUIRED: NIE

IMPLEMENT: BLOCKED
  → czekaj OWNER GO → IMPLEMENT
  „GO IMPLEMENT TEST-HARNESS-01 H0.x”
```

Po Owner GO IMPLEMENT: realizować **H0.x.0 → H0.x.6** ściśle wg DF · bindingi §3.6 dozwolone · **zakaz** drift poza D-H0X / #H0X.

**Koniec ARCH REVIEW H0.x**
