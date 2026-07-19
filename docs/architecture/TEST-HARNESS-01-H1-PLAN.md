# TEST-HARNESS-01 H1 — PLAN

> **Status:** PLAN ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **RCA:** [`TEST-HARNESS-01-H1-RCA.md`](TEST-HARNESS-01-H1-RCA.md)  
> **Design Freeze:** [`TEST-HARNESS-01-H1-DESIGN-FREEZE.md`](TEST-HARNESS-01-H1-DESIGN-FREEZE.md)

---

## 1. Cel

Scenariusz **`h1-tender`** w Production Sandbox Harness:

```text
Create psb-* tender
  → Import PDF (fixture)
  → Analysis
  → Classification
  → Proposal
  → Save (persist verify)
  → Cleanup (PASS i FAIL)
```

Wyłącznie mechanizmy H0: `psb-*` · allowlist · mutate-guard · **PSB-001 Cleanup Guarantee**.

---

## 2. Zakres

### 2.1 IN

| Element | Opis |
|---------|------|
| `scenarios/h1-tender.mjs` | Orchestracja kroków |
| Fixture PDF | mały `fixtures/sample-przedmiar.pdf` (deterministyczny) |
| Seed | Always-create: `batch-get` → append `TenderPipelineItem` `psb-*` → `batch-set` **tylko** po `assertWritable` |
| UI drive | Playwright: login → `/przetargi/{id}/…` → „Wgraj SWZ” `setInputFiles` |
| Asserty | DF AC (FAIL vs WARNING) |
| Cleanup | `removeTenderFromPipeline` semantycznie: filtr + `kw-tenders-deleted-ids` + tracker H0 |
| Manifest | suite `prod-sandbox-h1` · `environment: prod` · `--allow-prod` · **nie** w gate B/C |
| Auth | env credentials only |

### 2.2 OUT

| Temat | Powód |
|-------|--------|
| Zmiany `cloud-sync` / Edge / classifier / App domain | Protected Core / produkt |
| Mutacja `kw-wgdom-cost-catalog` | H5 |
| Realne tendery / BZP refresh write | Bezpieczeństwo |
| H0.x Persist Ledger | Osobny GO |
| Hard-fail na UNKNOWN classification | Flake |

---

## 3. Fazy IMPLEMENT (po GO)

```text
H1.0  Wiring: runner rejestruje h1-tender + --allow-prod gate
H1.1  Seed + cleanup API (KV only, dry-run)
H1.2  Playwright PDF upload + analysis wait
H1.3  Proposal + save assert (batch-get)
H1.4  Full AC + report + manifest + docs closeout
```

**Rekomendacja:** nie łączyć z H2 w jednym bundle (#CORE-013 / #PSB-010).

---

## 4. Przepływ (target)

```text
preflight H0 modules
  → require --allow-prod (prod write)
  → dry-run? → plan steps, zero batch-set/UI write
  → makePsbId("tender") + session.registerCreated
  → mutateGuard.assertWritable
  → cleanup.track(tender, cleaner)
  → seed kv-tenders-pipeline
  → Playwright upload fixture
  → wait analysis / dossier / uploadedFile
  → assert classification path (UNKNOWN → WARNING)
  → assert proposal reachable / non-null soft
  → batch-get save confirm
  → finally: cleanup.runAll()  // PASS i FAIL
```

---

## 5. Kryteria sukcesu

| Gate | Kryterium |
|------|-----------|
| G1 | 0 mutacji ID spoza `psb-*` / allowlist |
| G2 | Cleanup PASS → brak `psb-*` sesji w pipeline + id w deleted-ids |
| G3 | Exit 4 gdy cleanup FAIL + lista leftovers |
| G4 | Protected Core diff = 0 |
| G5 | Dry-run side-effect free |

---

## 6. Ryzyka

| Ryzyko | P | Mitygacja |
|--------|---|-----------|
| Seed nadpisuje cały pipeline bez merge | P0 | Read-merge-append; mutate-guard; nigdy replace-all |
| Cleanup bez tombstone | P0 | Wymóg `kw-tenders-deleted-ids` |
| Flaky BZP auto-discovery | P1 | Assert na `uploadedFile` / lokalny dossier; timeout bounded |
| Storage orphan PDF | P2 | Best-effort; nie blokuj MVP |
| Credentials w logach | P1 | Mask env; #PSB-014 reports gitignored |

---

## 7. Owner GO checklist

- [ ] Owner GO **IMPLEMENT TEST-HARNESS-01 H1**
- [ ] Potwierdzenie always-create + pełny cleanup
- [ ] Potwierdzenie fixture PDF (committed small / generated)
- [ ] Potwierdzenie zero Core
- [ ] Env admin credentials dostępne lokalnie (nie w git)

**Estymacja:** 2–3 dni po GO.

**Nie startować** bez GO.
