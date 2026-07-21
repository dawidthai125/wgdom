# TEST-HARNESS-01 H5 — ARCHITECTURE REVIEW

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Etap:** ARCH REVIEW COMPLETE  
> **Data:** 2026-07-21  
> **Owner GO ARCH REVIEW:** ✅  
> **Wejście:** [`TEST-HARNESS-01-H5-AUDIT.md`](TEST-HARNESS-01-H5-AUDIT.md) · [`TEST-HARNESS-01-H5-RCA.md`](TEST-HARNESS-01-H5-RCA.md) · [`TEST-HARNESS-01-H5-PLAN.md`](TEST-HARNESS-01-H5-PLAN.md) · [`TEST-HARNESS-01-H5-DESIGN-FREEZE.md`](TEST-HARNESS-01-H5-DESIGN-FREEZE.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 — klucz persist **superseded** (work-catalog)  
> **Fundament:** H0–H4 tooling **RELEASED** · H4 epic **CLOSED** · `kv-client.mjs` · `forbidden-keys.mjs` (H4 pattern)  
> **Baseline prod:** UI **2.65.35** · tip **`1addd97`** · **PRODUCTION VERIFIED · GREEN**  
> **IMPLEMENT:** **BLOCKED** do Owner GO IMPLEMENT

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Zgodność z SSOT (RCA A + PLAN + DF + produkt Biblioteka)? | **TAK** |
| D5 ZERO Core? | **TAK** — Path A test-infra only |
| REUSE FIRST (H0 / H4 / `kv-client`)? | **TAK** — z bindingiem §3.3 |
| Payroll / Theme / Edge? | **BRAK wpływu kodu** |
| Przepływ KV-only? | **SPÓJNY** |
| P0 wipe / orphan PSB-001? | **KONTROLOWANE** w DF |
| D-H5-01…24 / #H5-001…014? | **ZGODNE** |
| Gotowość architektury do IMPLEMENT bez zmiany DF? | **TAK** |
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

---

## 2. Zakres przeglądu

Przegląd formalny zamrożonego projektu H5 **bez** kodu i bez zmian repo. Kryteria = lista Ownera (1–8) + DF §0–14.  
**Nie** otwarto IMPLEMENT · **nie** zmieniono Production.

---

## 3. Checklist weryfikacji (1–8)

### 3.1 Zgodność z SSOT — **PASS**

| SSOT | Status |
|------|--------|
| RCA: write-surface **A** `kw-wgdom-work-catalog` · **B REJECT** | Zachowane D-H5-01/02 |
| PLAN: CRUD Create→keyword→edit→delete→cleanup | Zachowane §1 DF + przepływ §5.2 |
| DF supersession parent cost-catalog → work-catalog | §2.1 — **obowiązuje** |
| Produkt `CatalogWork.keywords` / `WORK_CATALOG_STORAGE_KEY` | Zgodne z `src/lib/work-catalog/types.ts` |
| Fixture `tradeId=MALOWANIE` · `unit=szt` · `source=custom` | Zgodne z `TRADE_IDS` / `normalizeCatalogWork` (id+tradeId+namePl+unit wymagane) |
| H0 D1/D4/D5/D8/PSB-001 · #PSB-* | Dziedziczone DF §0 |
| `kw-wgdom-work-catalog` ∈ aktywne `DATA_KEYS` | Potwierdzone (w przeciwieństwie do wyciszonego cost-catalog) |

### 3.2 D5 ZERO Core — **PASS**

| Obszar | Werdykt |
|--------|---------|
| `cloud-sync.ts` / `mergeWorkCatalogStore` | Poza IN · #H5-005 zakaz importu do write path |
| `src/lib/work-catalog/**` / `wgdom-cost-catalog*` | Zakaz edycji |
| Edge `make-server-0afb8820` | Brak zmian kodu |
| App / Theme / changelog / `version.json` | Brak zmian |
| Jedyna warstwa zmian | `test-infra/prod-sandbox/**` + manifest + thin script + docs |

### 3.3 REUSE FIRST — **PASS** (z bindingiem)

| Komponent | Review |
|-----------|--------|
| `kv-client.mjs` | **MUST reuse** — jedyny Edge client |
| `markers` / `mutate-guard` / `cleanup` / `report` / allowlist | **MUST reuse** |
| H4 FORBIDDEN pattern (`forbidden-keys.mjs`) | **MUST extend** — wspólna baza payroll/auth/billing + H5 ALLOWED=`{kw-wgdom-work-catalog}` · **zakaz** skopiowania drugiej pełnej listy payroll |
| H4 `h4-cloud.mjs` | **Wzorzec only** — nie wywoływać / nie forkować scenariusza |
| `tender-helpers` / `job-helpers` / `payroll-helpers` | **NIE** — inna domena |
| `catalog-helpers.mjs` | **MUST create** (D-H5-23) — cienki shape store; **ZERO** `batchGet/Set` wewnątrz helpera (tylko mutate obiektu) |
| Drugi KV client / import Core merge | **FAIL review jeśli powstałby** |

**Binding implementacyjny (nie zmienia DF):**

1. **Gate:** wydzielić wspólny zbiór FORBIDDEN bazowy (jak H4) + `assertH5KeysWritable` / `wrapKvWithH5ForbiddenGate` (lub parametryzowany wrap) — H5 ALLOWED = wyłącznie work-catalog.  
2. **Helpers:** czyste funkcje JS na plain object (get/upsert/edit/remove `psb-*`, snapshot non-psb, bump ISO) — **bez** `@/lib/work-catalog` importu (harness `.mjs`, ZERO DUPLICATE merge).  
3. **Pusty KV:** jeśli `batch-get` zwróci `null`/brak store — zbuduj **szkielet** `{ schemaVersion: 4, activeRegion, catalogs: { wroclaw, dolnyslask }, updatedAt }` z pustymi `works[]`, potem upsert `psb-*`. To **nie** jest wipe produkcji (nie było danych). Jeśli get zwróci nieparsowalny garbage — **FAIL (3)**, nie „naprawiać” Core.

### 3.4 Brak wpływu Payroll · Theme · Edge — **PASS**

| Obszar | Kontrola | Status |
|--------|----------|--------|
| Payroll / fence / PWRB | FORBIDDEN keys §6.1 DF · zero import fence | **PASS** |
| Theme | Poza listą plików IN | **PASS** |
| Edge Function source | Brak zmian; tylko public batch-get/set | **PASS** |
| UI ACL Biblioteka | KV-only · OUT | **PASS** |

### 3.5 Poprawność przepływu KV-only — **PASS**

```text
runner → h5-biblioteka
       → catalog-helpers (in-memory store mutate)
       → kv-client.batchGet/batchSet (gated)
       → Edge /batch-get|/batch-set
       → kw-wgdom-work-catalog
       → CatalogWork psb-* nested in catalogs[region].works[]
```

| Kryterium | Status |
|-----------|--------|
| Brak Playwright hard dependency | D-H5-04 / #H5-009 |
| Jedyny write key | D-H5-01 |
| RMW + bump `updatedAt` | D-H5-09 / #H5-006 (LWW store-level w app) |
| Create → edit → delete → cleanup | §5.2 DF |
| Soft WARNING ≠ FAIL | D-H5-15 |

### 3.6 P0 wipe oraz orphan PSB-001 — **PASS** (kontrole zamrożone)

| Threat | Kontrola DF | Review |
|--------|-------------|--------|
| Wipe non-`psb-*` | RMW · preservacja count/fingerprint · zakaz default-only overwrite gdy dane istnieją | **Adekwatne** |
| Keyword contamination seed / ATH | cost-catalog REJECT + FORBIDDEN + assert non-psb keywords | **Adekwatne** |
| Orphan `psb-*` | PSB-001 `finally` · dual-region leftover · exit 4 | **Adekwatne** |
| Mid-run FAIL bez cleanup | `cleanup.track` przed pierwszym write | **Adekwatne** |

**Residual (nie blokuje APPROVED):** równoległa sesja UI admina może LWW-race cały store (jak H1/H4) — krótki run + finally; **nie** otwiera N2 / Core.

### 3.7 Zgodność D-H5-01…24 oraz #H5-001…014 — **PASS**

Próbka krytyczna:

| ID / # | Review |
|--------|--------|
| D-H5-01/02 work-catalog / cost REJECT | OK · RCA |
| D-H5-04/09 KV-only + RMW | OK |
| D-H5-05/06 always-create · region | OK · Q3/Q1 frozen |
| D-H5-07/08 fixture + keywords | OK · zgodne z normalizerem produktu |
| D-H5-10…13 preservacja / dual-region / parity | OK · P0 |
| D-H5-16…18 D4/D5/CLI | OK |
| D-H5-20–22 CI manual · no bump · scope lock | OK |
| D-H5-23/24 helpers · no H1/H2 keys | OK |
| #H5-001…014 | Spójne z decyzjami; brak sprzeczności z Parent #PSB-* |

**Brak sprzeczności wewnętrznych DF** wymagających ARCH CHANGES.

### 3.8 Gotowość architektury do IMPLEMENT — **PASS**

Architektura jest **wystarczająco zamknięta** do implementacji tooling-only:

- pliki IN/OUT zamrożone  
- sekwencja H5.0→H5.5 zamrożona  
- AC PASS/WARNING/FAIL + exit codes zamrożone  
- fixture §5.4 zamrożony  
- reuse path H0/H4/`kv-client` istnieje w kodzie dziś  

**Warunek startu kodu:** wyłącznie jawne **Owner GO IMPLEMENT** — nie ten dokument.

---

## 4. Residual risks (akceptowalne — nie blokują ARCH APPROVED)

| Ryzyko | P | Status |
|--------|---|--------|
| LWW race z żywą sesją UI Biblioteki | P1 | Akceptowane; cleanup finally · krótki run |
| Fixture odrzucony przez przyszłą zaostrzoną normalizację app | P2 | FAIL (3) głośno — **nie** patch Core; DF fixture wystarczający na obecny `normalizeCatalogWork` |
| Agent skopiuje `mergeWorkCatalogStore` do helpers | P0 ops | Gate: binding §3.3 + Owner Verification |
| Brak H0.x Persist Ledger cross-run | P2 | Poza H5 |

---

## 5. Threat model (skrót)

| Threat | Kontrola DF |
|--------|-------------|
| Wipe Biblioteki | RMW + preservacja assert |
| ATH / cost keyword poison | REJECT + FORBIDDEN cost-catalog |
| Payroll corruption | FORBIDDEN payroll |
| Core regression | D5 file ban |
| Orphan `psb-*` | PSB-001 dual-region |
| Scope creep UI/bundles | D-H5-22 OUT |

---

## 6. Pytania ARCH — zamknięte

| # | Pytanie | Decyzja review |
|---|---------|----------------|
| Q-AR-1 | Czy nowy `catalog-helpers` łamie REUSE? | **NIE** — wymagany (brak istniejącego helpera katalogu); reuse = H0/H4/`kv-client`, nie H1 tender |
| Q-AR-2 | Czy brak Playwright = luka? | **Akceptowalne** — Biblioteka ACL/UI WARNING; KV-only = właściwy MVP |
| Q-AR-3 | Czy rozszerzenie `forbidden-keys` wymaga DF zmiany? | **NIE** — DF już nakazuje extend pattern H4 |
| Q-AR-4 | Pusty cloud catalog = wipe? | **NIE** — szkielet pusty + upsert `psb-*` (binding §3.3.3) |

---

## 7. Warunki wejścia do IMPLEMENT (Owner)

Po **Owner GO IMPLEMENT** wykonawca:

1. Trzyma się DF + tego ARCH REVIEW (zwłaszcza §3.3 reuse / gate / empty-store).  
2. Nie otwiera Core / Edge / Payroll / Theme / cost-catalog / bundles / Playwright hard PASS / nowy KV.  
3. Realizuje H5.0→H5.5 · dry-run · allow-prod · report · manifest.  
4. Kończy Owner Verification **przed** commit/push (osobne GO).  

---

## 8. Stop gate

```text
ARCH REVIEW COMPLETE
  DECISION: ARCH APPROVED
  IMPLEMENT: BLOCKED

Czekaj OWNER GO:
  „IMPLEMENT TEST-HARNESS-01 H5”
  lub równoważne jawne GO IMPLEMENT

Bez GO: zero kodu / commit / push / bump wersji / Production change.
```

---

## 9. Podpis review

| Pole | Wartość |
|------|---------|
| Reviewer | Agent ARCH REVIEW (WGDOM workflow) |
| Decyzja | **ARCH APPROVED** |
| Zmiany architektury wymagane | **NIE** |
| Następny etap | Owner GO → **IMPLEMENT** |

**Koniec ARCHITECTURE REVIEW H5**
