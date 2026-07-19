# TEST-HARNESS-01 — PLAN

> **Program:** TEST-HARNESS-01 · Production Sandbox Harness  
> **Status:** PLAN ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **RCA:** [`TEST-HARNESS-01-RCA.md`](TEST-HARNESS-01-RCA.md)  
> **Design Freeze:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md)

---

## 1. Cel

Zbudować **jeden formalny harness** do pełnych scenariuszy E2E na produkcji, działający wyłącznie na **oznaczonych encjach sandbox**, z obowiązkowym cleanup — bez wpływu na dane operacyjne WGDOM.

---

## 2. Zakres programu

### 2.1 IN (MVP + rozszerzenia)

| Faza | ID | Scenariusz | Mutacje prod? |
|------|-----|------------|---------------|
| H0 | Infra | Preflight, allowlist, markers, report JSON, `--allow-prod`, dry-run | NIE (read-only preflight) |
| H1 | Tender | PDF → analysis → classification → proposal → save → cleanup | TAK (tylko sandbox tender) |
| H2 | Jobs | Create → upload photos → delete photos → sync → cleanup | TAK (tylko sandbox job) |
| H3 | Payroll | Open → week → save → verify KPI | **Ograniczone** (patrz DF §Payroll) |
| H4 | Cloud | batch-set → batch-get → retry → metrics | TAK (tylko klucze/encje sandbox lub telemetry-only) |
| H5 | Biblioteka | Create → keyword → edit → delete | TAK (tylko wiersze sandbox katalogu) |

### 2.2 OUT (jawnie)

| Temat | Powód |
|-------|--------|
| Cofnięcie TI-B2.1 dla `e2e` Payroll seed Preview First | Osobna klasa; nie mieszać |
| Zmiany merge / `cloud-sync.ts` / Edge pod harness | Protected Core — osobny program |
| Realne joby / realne tygodnie LP / produkcyjny katalog bez markera | Zakaz hard-stop |
| Memory leak profiling pełny | Osobny PERF program |
| Naprawa `e2e/chunk-helpers` false FAIL | Test-infra P2 osobno |
| TENDER-P0.2 / CLOUD-P0-DEADLOCK-N2 | Osobne GO |

---

## 3. Fazy realizacji (po Owner GO)

```text
H0  Foundations (manifest + runner + allowlist + cleanup SSOT)
 │
 ├─ H4  Cloud (najniższe ryzyko UI; najwyższa wartość sync)
 │
 ├─ H2  Jobs photos (wzorzec już w .tmp — formalizacja)
 │
 ├─ H5  Biblioteka (domknięcie WARNING ze stability)
 │
 ├─ H1  Tender full pipeline (najdłuższy / najdroższy)
 │
 └─ H3  Payroll (najwyższe ryzyko danych — ostatni, z ostrzejszymi guardami)
```

**Rekomendowana kolejność IMPLEMENT:** H0 → H4 → H2 → H5 → H1 → H3.

---

## 4. Deliverables per faza

### H0 — Foundations

- Katalog tracked: `test-infra/prod-sandbox/` (lub `e2e/helpers/prod-sandbox/` — decyzja DF D3)
- `allowlist.json` / env: sandbox tender IDs, job IDs, catalog row IDs, payroll week marker
- Runner CLI: `npm run test:prod-sandbox -- --scenario <id> --allow-prod`
- Dry-run: pokazuje plan mutacji, **zero** `batch-set` / UI write
- Report: `.tmp/prod-sandbox-out/<runId>/report.json` (gitignore)
- Preflight fail-loud: brak markera / brak `--allow-prod` / prod version mismatch

### H1 — Tender

- Seed lub reuse **jednego** sandbox tendera (`marker` / prefix tytułu / ID allowlist)
- Upload PDF testowy (fixture lokalny, nie doklejanie do cudzych dossier)
- Assert: analysis state / classification call path / proposal surface / save push
- Cleanup: usunięcie artefaktów sandbox (dokumenty / draft proposal) lub soft-delete tendera wg reguł DF

### H2 — Jobs

- Create job z prefixem `psb-` / marker `harnessSandbox: true` (pola — DF)
- Upload N zdjęć → delete M → wait sync `kw-jobs` + tombstones
- Cleanup: delete job + storage GC jeśli przewidziane

### H3 — Payroll

- **Domyślnie:** verify KPI + open week **bez** save na live tygodniu właściciela
- **Save:** tylko gdy `PSB_PAYROLL_WEEK_ID` jest na allowlist **i** nie koliduje z aktywnym tygodniem operacyjnym (DF principle #PSB-PAYROLL)
- Alternatywa ACCEPTABLE: save wyłącznie na **preview** (H3-preview), KPI assert na prod read-only

### H4 — Cloud

- `batch-get` allowlist keys
- `batch-set` **tylko** wartości sandbox-entity w ramach istniejących kluczy domenowych **albo** dedykowany klucz diagnostyczny jeśli Owner GO na nowy klucz (domyślnie: **bez** nowego KV — mutate tylko nested sandbox)
- Retry: obserwacja metryk N1 (`batchSetRetries`) — bez celowego deadlocku na prod bez GO
- Metrics snapshot w report

### H5 — Biblioteka

- Create row z marker/prefix → keyword → edit → delete
- Assert persistence po reload/`batch-get` `kw-wgdom-cost-catalog`
- Cleanup obowiązkowy (zero orphan rows)

---

## 5. Kryteria sukcesu programu

| Gate | Kryterium |
|------|-----------|
| G1 Safety | 0 mutacji encji spoza allowlist w 3 kolejnych runach |
| G2 Cleanup | Po H1–H5: audit cleanup = 0 orphan `psb-*` / marker |
| G3 Coverage | 5 scenariuszy przechodzą na prod z `--allow-prod` |
| G4 Isolation | Payroll Preview harness (TI-B2.1) **bez zmian zachowania** |
| G5 Docs | Closeout + wpis lifecycle / manifest (bez mieszania z TI-B2 OPEN stale) |

---

## 6. Ryzyka i mitygacje

| Ryzyko | P | Mitygacja |
|--------|---|-----------|
| Zapis na realnym jobie | P0 | Hard-stop preflight + mutate guard |
| Zostawienie śmieci w KV/storage | P0 | Cleanup mandatory; fail run jeśli cleanup FAIL |
| Deadlock storm przy H4 | P1 | Bez sztucznego 2-tab deadlock; tylko obserwacja N1 |
| Mylenie z Payroll Preview harness | P1 | Osobna komenda, osobny namespace docs, principle #PSB-≠-TI |
| Dotknięcie Protected Core „przy okazji” | P0 | Bundle FEATURE/test-only; zakaz edycji `cloud-sync.ts` w tym programie |

---

## 7. Owner GO — checklist przed IMPLEMENT

- [ ] Owner GO na **TEST-HARNESS-01** (ten program)
- [ ] Potwierdzenie allowlist: ≥1 sandbox job + decyzja sandbox tender + policy payroll
- [ ] Potwierdzenie lokalizacji kodu (DF D3)
- [ ] Potwierdzenie: **bez** nowego klucza KV w MVP
- [ ] Ścieżka Owner GO: FEATURE/test-infra (Path A), o ile zero zmian Protected Core

---

## 8. Estymacja (orientacyjna, po GO)

| Faza | Effort |
|------|--------|
| H0 | 1–2 dni |
| H4 | 0.5–1 dzień |
| H2 | 1 dzień (formalizacja `.tmp`) |
| H5 | 0.5–1 dzień |
| H1 | 2–3 dni |
| H3 | 1–2 dni (zależnie od policy save) |

**Nie startować** bez Owner GO.
