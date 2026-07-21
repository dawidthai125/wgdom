# TEST-HARNESS-01 H5 — AUDIT REPORT

> **Program:** TEST-HARNESS-01 · Slice **H5** · Biblioteka (Production Sandbox)  
> **Etap:** **AUDIT ONLY** · **NIE implementować** · **NIE RCA** bez Owner GO  
> **Data:** 2026-07-20  
> **Baseline prod:** UI **2.65.35** · tip **`1addd97`** · app feature **`fce7b78`** · **PRODUCTION VERIFIED · GREEN**  
> **Fundament:** H0–H4 tooling **RELEASED** · H4 epic **CLOSED** · Parent DF [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 Biblioteka AC  
> **Projekt:** **STABILIZATION WINDOW ACTIVE**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · MOBILE FIRST · ZERO Protected Core · brak COMMIT/PUSH · brak zmian Production

---

## 0. Identyfikacja zgłoszenia

| Pole | Wartość |
|------|---------|
| **Klasa** | Luka coverage / test-infra (ops safety) — **nie** bug UI prod |
| **Program** | TEST-HARNESS-01 |
| **Slice** | **H5 Biblioteka** |
| **Handoff Owner** | NEXT = H5 · STATUS = AUDIT ONLY |
| **Zakaz równoległy** | H3-B · H3-C · H0.x Persist Ledger · H4 reopen · CLOUD-P0-DEADLOCK-N2 — **OUT** |

**Werdykt wstępny:** Parent DF/PLAN zamrażają AC H5 (Create → keyword → edit → delete → cleanup), ale **brak** scenariusza `h5-biblioteka`, a stability sweep na prod kończy Bibliotekę **WARNING** (skip write). Dodatkowo w kodzie produktu istnieją **dwa** katalogi KV — parent PLAN wskazuje `kw-wgdom-cost-catalog`, podczas gdy produktowa „Biblioteka Robót” to `kw-wgdom-work-catalog`. **Decyzja write-surface wymaga RCA/DF** przed IMPLEMENT.

---

## 1. Objawy (as-is)

```text
Parent DF H5 AC:
  Create psb-* row → Keyword → Edit → Delete → cleanup PASS
  PLAN assert: persistence via batch-get kw-wgdom-cost-catalog

Stan runnera (tip 1addd97):
  IMPLEMENTED = { h0, h1, h2, h3, h4 }
  h5* → PSB_SCENARIO_NOT_IMPLEMENTED (exit 2) · „H5 require Owner GO”
  brak scenarios/h5-biblioteka.mjs
  brak suite PROD-SANDBOX-H5 w test-manifest.json
```

| Objaw | Dowód |
|-------|--------|
| Scenariusz H5 nie istnieje | `test-infra/prod-sandbox/scenarios/` — brak `h5-*` |
| Runner blokuje H5 | `runner.mjs` · help: `h4-cloud (H5 not implemented)` |
| Manifest bez H5 | `test-infra/test-manifest.json` — `PROD-SANDBOX-H0…H4` only |
| Stability Biblioteka = WARNING | `.tmp-stability-sweep/out/report.json` · `Biblioteka-10` · skip write (brak przycisku UI / safety) |
| Allowlist catalog gotowy, unused | H0 `PSB_CATALOG_ROW_IDS` / `kind: "catalog"` w markers — **zero** scenariusza konsumującego |
| README zakazuje mutacji katalogu | `test-infra/prod-sandbox/README.md` — „No … catalog mutations” (stan przed H5) |

**Symptomy operatorskie:** po H4 Owner nie ma komendy:

```bash
npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod
```

która bezpiecznie CRUD-uje **tylko** wiersze sandbox katalogu z cleanup PSB-001.

---

## 2. Wymagania (z Parent SSOT — do potwierdzenia w RCA)

Źródła: [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) § H5 · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 AC · D1–D12 · #PSB-001…015 · [`TEST-HARNESS-01-RCA.md`](TEST-HARNESS-01-RCA.md) (Biblioteka WARNING).

| Wymaganie | Opis |
|-----------|------|
| **R1 Create** | Utworzenie wiersza z markerem/`psb-*` |
| **R2 Keyword** | Zapis keyword(ów) na wierszu sandbox |
| **R3 Edit** | Zmiana widoczna po re-fetch / `batch-get` |
| **R4 Delete** | Brak wiersza po delete |
| **R5 Persist** | Persistence w chmurze (PLAN: `kw-wgdom-cost-catalog`) |
| **R6 Cleanup** | Zero orphan `psb-*` / marker rows (G2, #PSB-005) |
| **R7 Isolation** | Mutacje **tylko** wierszy sandbox (#PSB-001/002) · D4 bez nowego KV |
| **R8 Core** | D5 ZERO zmian Protected Core / Edge / merge / Payroll / Theme |

**Uwaga AUDIT (SSOT drift):** PLAN R5 wskazuje **legacy cost catalog**. Produkt „Biblioteka Robót” + pole `keywords[]` na robocie = **`kw-wgdom-work-catalog`** (`CatalogWork`). Legacy `kw-wgdom-cost-catalog` ma keywords na **kategoriach seed** (klasyfikacja ATH) — mutacja seed ≠ bezpieczny CRUD sandbox row. → **RCA musi wybrać write-surface** (patrz §8).

---

## 3. Zakres H5 (propozycja AUDIT — nie zamrożona)

### 3.1 IN (kandydat)

| Element | Uwagi |
|---------|--------|
| Scenariusz `h5-biblioteka` w `test-infra/prod-sandbox/scenarios/` | Nazwa z Parent DF §8 |
| Nested write **tylko** wierszy `psb-*` w wybranym kluczu katalogu | D1 · D4 · D6 · D8 |
| Keyword + edit + delete + `batch-get` parity | Parent H5 AC |
| Cleanup PSB-001 + rejestracja `kind: "catalog"` | H0 już ma kontrakt |
| Reuse `kv-client` / markers / mutate-guard / report / `--allow-prod` / dry-run | REUSE FIRST |
| Manifest suite `PROD-SANDBOX-H5` · **manual / Owner** (nie Gate B/C auto) | Parity H0–H4 |
| FORBIDDEN keys (payroll/auth/billing + nie-katalog) | Wzorzec H4 — rozszerzyć **per-slice** lub shared allowlist write |

### 3.2 OUT (jawnie — AUDIT)

| Temat | Powód |
|-------|--------|
| H3-B / H3-C payroll save | Osobne Owner GO |
| H0.x Persist Ledger | Osobne GO |
| Mutacja realnych kategorii seed cost catalog (ELEKTRYKA…) | P0 — trucizna klasyfikacji ATH / wyceny |
| Mutacja `kw-wgdom-work-bundles` / market quotes commit | Poza AC H5; osobny zakres |
| Zmiany `cloud-sync.ts` / Edge / merge / App UI | D5 · Protected Core |
| Nowy klucz KV | D4 |
| CI Gate B/C auto-run prod-sandbox | Parent: manual |
| Naprawa ACL UI Biblioteki (`workCatalogForAdminEnabled`) | Produkt — nie H5 (chyba że osobne GO) |
| Playwright mandatory jako jedyna ścieżka | Stability = WARNING UI; KV-only może być wystarczające (RCA) |

---

## 4. Zależności względem H0–H4

| Slice | Status | Zależność dla H5 |
|-------|--------|------------------|
| **H0** | **RELEASED** | **HARD** — runner, allowlist `catalogRowIds`, markers `kind:catalog`, mutate-guard, cleanup, dry-run, report, `--allow-prod` |
| **H1** | **RELEASED** | **SOFT** — wzorzec nested seed + anti-wipe + tombstone; Playwright hybrid **opcjonalny** jeśli RCA wybierze UI path |
| **H2** | **RELEASED** | **SOFT** — always-create `psb-*` + cleanup + LS hydrate lekcja (jeśli verify UI) |
| **H3-A** | **RELEASED** | **OUT write** — payroll keys FORBIDDEN; wzorzec RO nie zastępuje H5 |
| **H4** | **RELEASED** + **CLOSED** | **HARD pattern** — KV-only Edge round-trip, FORBIDDEN gate, soft metrics WARNING, nested `psb-*`, zero Core; **nie** reuse `kw-tenders-pipeline` jako storage H5 |

```text
H0 (fundament)
 └─ H4 (wzorzec Cloud KV-only + FORBIDDEN)
      └─ H5 (domena katalogu — nowy scenariusz, ten sam runner)
 H1/H2 = lekcje nested/cleanup (opcjonalny UI)
 H3 = nie mieszać
```

**Kolejność Parent D12:** H0 → H4 → H2 → **H5** → H1 → H3 — **H5 jest teraz na właściwym miejscu roadmapy** (H0–H4 zamknięte/released).

---

## 5. REUSE — istniejące komponenty (nie duplikować)

| Komponent | REUSE? | Rola H5 |
|-----------|--------|---------|
| `runner.mjs` | **TAK** | Rejestracja `h5-biblioteka` / alias `h5` |
| `kv-client.mjs` | **TAK** | Jedyny Edge client PSB |
| `markers.mjs` · `mutate-guard.mjs` · `cleanup.mjs` · `report.mjs` · `allowlist.mjs` | **TAK** | H0 contract · `PSB_CATALOG_ROW_IDS` |
| `forbidden-keys.mjs` (H4) | **REUSE pattern** | Nie hardcodować H4 allowlist tenders; **nowa** allow/deny lista kluczy katalogu (lub shared module bez driftu nazw H4) — decyzja DF |
| H1 `tender-helpers` / H4 cloud seed | **NIE kopiować** | Inna domena; ewentualnie skopiować **tylko** pattern nested merge + preservacja non-`psb-*` |
| `src/lib/work-catalog/*` merge | **SSOT read-only** | Zrozumieć kształt store; harness **nie** importuje merge do Edge write path (jak H4 — raw nested) |
| `src/lib/wgdom-cost-catalog*` | **SSOT read-only** | Tylko jeśli RCA wybierze legacy key — **ostrożnie** (seed categories) |
| Ad-hoc `.tmp-stability-sweep` | **NIE** | WARNING ≠ harness; nie forować smoke UI |

**ZERO DUPLICATE LOGIC:** nie tworzyć drugiego KV clienta; nie reimplementować `mergeWorkCatalogStore` w harnessie; nie edytować Core.

---

## 6. Ryzyka architektoniczne

| ID | Ryzyko | P | Skutek | Kontrola (do RCA/DF) |
|----|--------|---|--------|----------------------|
| **R-H5-01** | Zły klucz: write do `kw-wgdom-cost-catalog` seed categories | **P0** | Zatrucie keywords klasyfikacji ATH / wyceny | Preferencja AUDIT: target **work-catalog** rows; zakaz edycji seed category IDs |
| **R-H5-02** | `batch-set` replace-all całego katalogu | **P0** | Wipe produkcyjnych robót / stawek | Nested: zachowaj non-`psb-*`; tylko upsert/delete `psb-*` |
| **R-H5-03** | Orphan `psb-*` po FAIL mid-scenario | **P0** | Śmieci w Bibliotece | PSB-001 `finally` cleanup obowiązkowy |
| **R-H5-04** | Playwright-only + ACL off | **P1** | Flaky / skip jak stability WARNING | Preferencja: **KV-only** PASS (H4 pattern); UI opcjonalny soft |
| **R-H5-05** | Drift Parent PLAN (`cost-catalog`) vs produkt (`work-catalog`) | **P0** (proces) | Zły DF → zły IMPLEMENT | RCA: jedna decyzja write-surface + aktualizacja AC |
| **R-H5-06** | Mutacja `kw-app-settings` (włączenie Biblioteki dla admina) | **P1** | ACL drift | OUT — nie zmieniać settings w H5 |
| **R-H5-07** | Dotknięcie payroll / tenders / jobs keys | **P0** | Incydent sync | FORBIDDEN gate (wzorzec H4) |
| **R-H5-08** | Duplikacja builderów CatalogWork w wielu plikach | **P1** | Drift | Jeden helper `catalog-helpers.mjs` w prod-sandbox (jak H1 tender-helpers) |
| **R-H5-09** | Wciągnięcie H5 do Gate B/C | **P2** | Flaky CI / prod writes w CI | Suite **manual** tylko |
| **R-H5-10** | Market quotes / bundles side effects | **P1** | Niezamierzony commit rynku | OUT `kw-wgdom-work-bundles` · bez `commit-market-quotes` |
| **R-H5-11** | `mergeWorkCatalogStore` = LWW **całego** store (`updatedAt`) | **P1** | Wyścig app↔harness może „wygrać” starszy snapshot | RMW: `batch-get` → nested mutate `psb-*` → bump `updatedAt` → `batch-set`; nie pisać pustego/minimalnego store; cleanup w tym samym RMW |

---

## 7. Elementy SSOT

| SSOT | Rola dla H5 |
|------|-------------|
| [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H5 AC · D1–D12 · #PSB-* | Kontrakt programu |
| [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) § H5 | Zakres CRUD + cleanup |
| [`TEST-HARNESS-01-RCA.md`](TEST-HARNESS-01-RCA.md) | Biblioteka WARNING / coverage gap |
| [`TEST-HARNESS-01-H4-CLOSEOUT.md`](TEST-HARNESS-01-H4-CLOSEOUT.md) | Wzorzec KV-only + RELEASED/CLOSED |
| `WORK_CATALOG_STORAGE_KEY` = `kw-wgdom-work-catalog` | Produkt Biblioteka Robót · `CatalogWork.keywords` |
| `WGDOM_COST_CATALOG_KEY` = `kw-wgdom-cost-catalog` | Legacy cost / klasyfikacja — **nie** mylić bez decyzji |
| `mergeWorkCatalogStore` / cloud-sync case | Merge SSOT app — harness nie edytuje |
| H0 allowlist `catalogRowIds` · `makePsbId("catalog")` | Już w preflight |
| H4 FORBIDDEN / nested pattern | Lekcja write-safety |

**Zakaz SSOT drift:** nie hardcodować dwóch równoległych modeli w IMPLEMENT bez DF; nie traktować cost-catalog seed jako „sandbox row”.

---

## 8. Hipotezy write-surface (tylko AUDIT — decyzja w RCA)

| Opcja | Opis | Werdykt AUDIT |
|-------|------|---------------|
| **A — Work catalog KV-only** | Nested CRUD `CatalogWork` `psb-*` w `kw-wgdom-work-catalog` · keyword/edit/delete · cleanup | **Preferowana** — zgodna z produktem „Biblioteka Robót”, polem `keywords`, D4/D5, wzorcem H4 |
| **B — Cost catalog** | Mutacja `kw-wgdom-cost-catalog` (PLAN literal) | **Wysokie ryzyko** — keywords na kategoriach seed; brak naturalnego „create row” bez zanieczyszczenia klasyfikacji |
| **C — Hybrid Playwright + KV** | UI create w Bibliotece + assert KV | **Opcjonalne rozszerzenie** — blocked przez ACL/UI (stability WARNING); nie jako jedyna ścieżka MVP |
| **D — Nowy KV** | Osobny klucz diagnostyczny | **ODRZUCONA** (D4) bez osobnego Owner GO |

---

## 9. Mapowanie Parent AC → luki

| AC (DF § H5) | Stan AUDIT |
|--------------|------------|
| Create `psb-*` row obecny w catalog | **Brak** scenariusza |
| Keyword zapisany | **Brak** |
| Edit widoczny po re-fetch | **Brak** |
| Delete + cleanup PASS | **Brak** · kontrakt PSB-001 gotowy |
| Persist cloud | **Niejasny klucz** (cost vs work) — luka decyzyjna |

---

## 10. OUT OF SCOPE (ten AUDIT)

- RCA / PLAN / DESIGN FREEZE / ARCH REVIEW / IMPLEMENT H5  
- H3-B/C · H0.x · N2  
- Zmiany Production / `version.json` / CHANGELOG UI  
- Commit / push  
- Naprawa widoczności UI Biblioteki w Przetargach  

---

## 11. Plan przejścia do RCA (bez IMPLEMENT)

Po **Owner GO → RCA** wykonać wyłącznie:

1. **Potwierdzić problem statement** — luka harness H5 vs bug produktu (AUDIT: luka harness + WARNING coverage).  
2. **Wybrać write-surface** — A / B / C (AUDIT: preferuj **A**).  
3. **Zamrożyć kontrakt wiersza** — pola minimalne `CatalogWork` (id, namePl, keywords, active, …) vs legacy category.  
4. **Zamrozić anti-wipe** — nested preservacja non-`psb-*` · never replace-all.  
5. **Zamrozić FORBIDDEN keys** dla H5 (payroll + tenders write? + settings + bundles).  
6. **Reuse checklist** — H0 runner + H4 KV pattern + jeden `catalog-helpers.mjs`.  
7. **KV-only vs Playwright** — MVP recommendation: KV-only PASS; UI soft/optional.  
8. **Aktualizacja Parent AC** (w DF H5 slice) jeśli klucz ≠ PLAN literal `kw-wgdom-cost-catalog`.

---

## 12. Werdykt AUDIT

```text
══════════════════════════════════════
TEST-HARNESS-01 H5 — AUDIT READY

Klasa:        coverage gap (test-infra)
Prod bug:     NIE
Baseline:     2.65.35 / 1addd97 · GREEN
H0–H4:        RELEASED (H4 CLOSED)
H5:           NOT STARTED · AUDIT COMPLETE
Decyzja krytyczna: write-surface (work-catalog vs cost-catalog)
══════════════════════════════════════
```

| | |
|--|--|
| **AUDIT** | **COMPLETE** · dokument SSOT ten plik |
| **IMPLEMENT** | **BLOCKED** |
| **Następny etap** | czekaj **Owner GO → RCA** |
| **STABILIZATION** | **ACTIVE** — poza H5 AUDIT bez innych prac |

**Nie proponowano implementacji. Nie utworzono kodu scenariusza. Nie zmieniono Production.**

---

**Koniec AUDIT H5** · SSOT: `docs/architecture/TEST-HARNESS-01-H5-AUDIT.md`
