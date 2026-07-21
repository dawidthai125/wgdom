# TEST-HARNESS-01 H0.x — Persist Ledger · AUDIT

> **Program:** TEST-HARNESS-01 · Slice **H0.x** · Persist Ledger (cross-process orphan recovery)  
> **Etap:** **AUDIT ONLY**  
> **Data:** 2026-07-21  
> **Owner GO AUDIT:** ✅ (start zadania)  
> **Baseline prod:** UI **2.65.35** · tip **`3356349`** · **PRODUCTION VERIFIED · GREEN**  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · D5 ZERO Core · #PSB-001…015  
> **IMPLEMENT / kod / commit / push:** **ZAKAZ** na tym etapie

---

## 1. Werdykt AUDIT

```text
══════════════════════════════════════
AUDIT READY

H0.x Persist Ledger
→ rekomendacja: przejdź do RCA
══════════════════════════════════════
```

| Pole | Wartość |
|------|---------|
| **Problem** | Cleanup H0 jest **in-memory** (`CleanupTracker`) — kill / crash procesu zostawia `psb-*` w prod KV bez rejestru do recovery |
| **Status backlog** | **READY** (od H0 FINAL VERIFY §6) · H0–H5 **RELEASED** · H5 **CLOSED** |
| **Impact app UI** | **ZERO** oczekiwany (tooling-only) |
| **Następny etap** | **RCA** — po Owner GO |

---

## 2. Zakres H0.x Persist Ledger (AUDIT scope)

### 2.1 IN (proponowany)

| Element | Opis |
|---------|------|
| **Cel** | Odporność na **interrupt / kill / crash** runnera: po restarcie harness **odnajduje i usuwa** orphan `psb-*` utworzone w poprzednim procesie |
| **Gap SSOT** | [`TEST-HARNESS-01-H0-FINAL-VERIFICATION.md`](TEST-HARNESS-01-H0-FINAL-VERIFICATION.md) §6 — **GAP DOCUMENTED** |
| **Warstwa** | wyłącznie `test-infra/prod-sandbox/**` (+ opcjonalnie thin wrapper / manifest suite) |
| **Kontrakt** | rozszerzenie **PSB-001 Cleanup Guarantee** o wymiar **cross-run** (nie zamiana in-session `finally`) |
| **Test dowodowy** | create `psb-*` → symulacja kill (ledger leftover) → re-run → assert leftover purged · report |
| **Reuse** | `CleanupTracker` · markers `psb-*` · mutate-guard · allowlist · `kv-client` · istniejące cleanery scenariuszy (H1–H5) |

### 2.2 OUT (twarde)

| OUT | Powód |
|-----|--------|
| Protected Core (`cloud-sync`, merge, fence) | #PSB-007 · D5 ZERO Core |
| Edge Function code | poza harness |
| Payroll write (H3-B/C) | osobny GO · #PSB-012 |
| Nowy klucz KV domenowy | #PSB-006 |
| Zmiana UI / CHANGELOG / `version.json` bump | tooling-only |
| Gate B/C auto CI | jak H0–H5 — suite manual / Owner |
| Rewrite scenariuszy H1–H5 „od zera” | REUSE FIRST · tylko wiring ledger |
| CLOUD-P0-DEADLOCK-N2 / ARCH-02F | poza programem |
| Gwarancja recovery po `kill -9` **bez** żadnego persystowanego śladu **i** bez scan | fizycznie niemożliwe — RCA musi wybrać model |

### 2.3 Definicja problemu (as-is)

```text
Proces A:
  track(psb-*) in memory
  batch-set → entity exists in prod KV
  [KILL / crash / SIGKILL]  ← finally NIE działa
  CleanupTracker ginący z procesem

Proces B (re-run):
  nowy CleanupTracker (pusty)
  PSB-001 finally czyści tylko to, co tracknięto w B
  → orphan psb-* zostaje w KV (tenders / jobs / catalog / …)
```

**H1/H2 dziś:** best-effort **orphan scrub** na starcie (scan listy `psb-*` w swoim kluczu) — **nie** jest uniwersalnym Persist Ledgerem; H3/H4/H5 **nie** mają spójnego cross-run recovery.

---

## 3. Analiza SSOT

### 3.1 Dokumenty wiążące

| Dokument | Rola dla H0.x |
|----------|----------------|
| [`TEST-HARNESS-01-H0-FINAL-VERIFICATION.md`](TEST-HARNESS-01-H0-FINAL-VERIFICATION.md) §6 | **Źródło gapu** + rekomendacja ledger file + `recoverOpenEntities` + test kill→re-run + scan safety net |
| [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) | D9 Cleanup · #PSB-001…015 · #PSB-005 cleanup = PASS · #PSB-014 reports w `.tmp/` |
| [`TEST-HARNESS-01-H0-IMPLEMENTATION-REPORT.md`](TEST-HARNESS-01-H0-IMPLEMENTATION-REPORT.md) | `cleanup.mjs` = PSB-001 in-session |
| H1–H5 DF / closeouts | Scenariusze **RELEASED**; orphan scrub lokalny (H1/H2) = hint REUSE, nie SSOT H0.x |
| [`TEST-HARNESS-01-H5-CLOSEOUT.md`](TEST-HARNESS-01-H5-CLOSEOUT.md) | H0.x = **preferowany next** roadmapy |
| `.gitignore` | `.tmp/prod-sandbox-out/` już ignorowane — kandydat lokalizacji ledger |

### 3.2 Kod SSOT (read-only AUDIT)

| Artefakt | Stan względem H0.x |
|----------|-------------------|
| `cleanup.mjs` → `CleanupTracker` | **In-memory only** · LIFO · `track` / `untrack` / `runAll` |
| `runner.mjs` | Exit codes + report; **brak** `recoverOpenEntities` na starcie |
| `markers.mjs` / `mutate-guard.mjs` / `allowlist.mjs` | Obowiązkowy REUSE |
| `kv-client.mjs` | Jedyny klient KV — **nie forkować** |
| H1/H2 orphan-scrub | Pattern lokalny per-scenario — kandydat do **uogólnienia**, nie duplikacji 5× |
| H4/H5 | Cleanup w `finally` sesji · brak cross-run ledger |
| Prod KV | Encje `psb-*` mogą przeżyć kill — **śmieci operacyjne**, nie feature app |

### 3.3 Semantyka nazw (uwaga AUDIT)

| Nazwa | Znaczenie |
|-------|-----------|
| **PSB-001 Cleanup Guarantee** (Owner H0) | Cleanup po PASS/FAIL **w sesji** |
| **#PSB-001 Never touch** (DF table) | Mutate-guard — nie mylić z Cleanup Guarantee |
| **H0.x Persist Ledger** | **Cross-process** persistence open entities + recovery |

RCA musi utrzymać rozróżnienie: H0.x **rozszerza** Cleanup Guarantee, **nie** redefiniuje #PSB-001 Never touch.

---

## 4. Zależności

```text
H0 foundations (RELEASED)
  markers · allowlist · mutate-guard · CleanupTracker · runner · report
        │
        ▼
H0.x Persist Ledger  ←── ten AUDIT
        │
        ├── wymaga mapowania kind → cleaner (tender/job/catalog/cloud…)
        │     REUSE: tender-helpers · job-helpers · catalog-helpers · H4 nested
        │
        ├── opcjonalnie: scan safety net po allowlisted KV keys
        │
        └── NIE zależy od: Core · Edge · Payroll write · UI
```

| Zależność | Typ | Uwaga |
|-----------|-----|--------|
| H0 `CleanupTracker` | **hard** | Ledger = persistence wokół track/untrack/runAll |
| Cleanery H1–H5 | **hard** (recovery) | Bez `kind` + cleaner recovery jest ślepy lub tylko delete-by-id ad hoc |
| `kv-client` | **hard** (gdy recovery KV) | Zero drugiego clienta |
| Concurrent runners | **soft risk** | Dwa procesy = race na ledger file — RCA |
| Windows / SIGKILL | **env** | File ledger pomaga; SIGKILL omija flush — RCA: fsync / append strategy |
| H3-A | **niska** | Brak create → ledger no-op |
| Gate B/C | **brak** | Suite Owner-only jak reszta PSB |

---

## 5. Ryzyka

| ID | Ryzyko | Severity | Mitigacja (kierunek RCA) |
|----|--------|----------|---------------------------|
| R1 | Recovery usuwa **nie-sandbox** encję | **P0** | Tylko `psb-*` + mutate-guard + allowlist; never touch non-psb |
| R2 | Ledger bez `kind` / cleaner → nie da się usunąć nested (H4/H5) | **P0** | Schema ledger: `{ id, kind, key?, scenario?, createdAt }` + registry cleanerów |
| R3 | Stale ledger po ręcznym cleanup / innym runnerze | **P1** | Idempotent recovery · verify absent · prune ledger |
| R4 | Race dwóch `--allow-prod` równolegle | **P1** | Lock file / single-writer · lub fail-loud |
| R5 | Scan KV bez ledger = false confidence (koszt egress) | **P2** | Scan = safety net, nie jedyny mechanizm; cap keys |
| R6 | Persist poza `.tmp` / commit artefaktu | **P1** | #PSB-014 · gitignore already |
| R7 | Zmiana Core „dla wygody” | **P0** | #PSB-007 · OUT |
| R8 | Test kill trudny na CI Windows | **P2** | Symulacja: leave ledger open + exit bez cleanup (bez prawdziwego kill) |
| R9 | Orphan scrub H1/H2 vs ledger — duplikacja / konflikt | **P1** | REUSE FIRST: jeden recovery path w runnerze; scenariusze nie forkują scrub |
| R10 | Payroll / Theme / Edge regresja | **P0 (perceived)** | Zero ścieżek w tych domenach → tooling-only tip |

---

## 6. Warianty architektoniczne

### Wariant A — File Persist Ledger (rekomendacja H0 §6)

| | |
|--|--|
| **Opis** | Append/update `.tmp/prod-sandbox-out/open-entities.json` (lub per-run + global open set) przy `track`; remove przy `untrack` / successful cleanup; na starcie runnera `recoverOpenEntities()` |
| **Pros** | Proste · lokalne · #PSB-006 OK · zgodne z H0 FINAL VERIFY |
| **Cons** | Kill -9 przed flush · race multi-process · nie widzi orphanów sprzed wprowadzenia ledger |
| **Core/Edge** | Zero |

### Wariant B — KV scan-only safety net

| | |
|--|--|
| **Opis** | Na starcie: `batch-get` allowlisted keys → filtr `psb-*` → cleanup via registry |
| **Pros** | Łapie orphany **sprzed** ledger · nie zależy od pliku lokalnego |
| **Cons** | Egress · trzeba znać kształt każdego klucza (tenders/jobs/catalog/…) · wolniejsze · częściowo już w H1/H2 ad hoc |
| **Core/Edge** | Zero (read + sandbox write only) |

### Wariant C — Hybrid (A + B) ← **preferowany kierunek AUDIT → RCA**

| | |
|--|--|
| **Opis** | Ledger = primary recovery path; scan allowlisted keys = secondary net (cap / opt-in) |
| **Pros** | Pokrywa kill mid-run **i** historyczne leftovers · zgodne z H0 §6 pkt 1–4 |
| **Cons** | Większy zakres DF · trzeba zamrozić listę scan keys + cleaner registry |
| **Core/Edge** | Zero |

### Wariant D — Signal handlers only (SIGINT/SIGTERM)

| | |
|--|--|
| **Opis** | `process.on('SIGINT')` → `runAll()` |
| **Pros** | Tanie dla graceful stop |
| **Cons** | **Nie** rozwiązuje kill -9 / crash / power loss — **niewystarczające jako H0.x alone** |
| **Werdykt AUDIT** | **Uzupełnienie**, nie primary |

### Wariant E — Nowy klucz KV `kw-psb-open-ledger`

| | |
|--|--|
| **Opis** | Persist open set w chmurze |
| **Pros** | Cross-machine |
| **Cons** | **#PSB-006** · nowe KV · ryzyko sync/Core adjacency · overkill |
| **Werdykt AUDIT** | **REJECT** dla H0.x MVP |

---

## 7. Wpływ na Production

| Warstwa | Oczekiwany wpływ H0.x |
|---------|----------------------|
| UI **2.65.35** | **Bez bumpu** |
| Tip `version.json` | Nowy tip tooling po przyszłym push (jak H4/H5) — **bez** zmiany feature app |
| Payroll / Theme / Edge / Core | **Brak** zmian kodu |
| Prod KV | **Pozytywny** przy recovery: mniej orphan `psb-*`; ryzyko tylko przy buggy cleaner (R1/R2) |
| Runtime użytkownika | **Brak** — harness nie jest ścieżką UI |
| STABILIZATION WINDOW | **Zachowana** — tooling slice, nie nowy epic produktowy |

**PRODUCTION IMPACT (AUDIT estimate):** **NONE** na funkcjonalność app · **LOW positive** na higienę sandbox KV · **CONDITIONAL** na poprawność recovery registry.

---

## 8. Stan istniejącego pokrycia (mapa)

| Slice | In-session PSB-001 | Cross-run orphan |
|-------|--------------------|------------------|
| H0 | ✅ tracker | ❌ gap → **H0.x** |
| H1 | ✅ | △ best-effort scrub start |
| H2 | ✅ | △ best-effort scrub start |
| H3-A | ✅ no-op | N/A (no create) |
| H4 | ✅ | ❌ brak scrub uniwersalnego |
| H5 | ✅ | ❌ brak scrub uniwersalnego |

**Wniosek:** H0.x ma sens **po** H1–H5 RELEASED — cleanery istnieją; brakuje **wspólnego** persist + recover w runnerze.

---

## 9. Kryteria sukcesu (do zamrożenia w RCA/DF — nie implementować teraz)

Szkic AC (nie DF):

1. Po `track(psb-*)` ledger zawiera wpis **przed** ryzykownym `batch-set` (lub atomowo z track — RCA).  
2. Po udanym cleanup / `untrack` — brak wpisu.  
3. Symulacja: open ledger leftover → re-run → entity **absent** · leftover list empty · exit 0.  
4. Zero write poza allowlisted sandbox keys · mutate-guard PASS.  
5. Dry-run: **zero** side-effect (#PSB-004) — recovery write tylko z `--allow-prod`.  
6. Zero diff Protected Core / Edge / Payroll / Theme / UI version.

---

## 10. Rekomendacja → RCA

```text
REKOMENDACJA AUDIT → RCA:

1. Przyjąć problem SSOT z H0 FINAL VERIFY §6 jako kanoniczny gap.
2. Analizować głęboko Wariant C (Hybrid: file ledger + scan safety net).
3. Wariant A = minimum viable; D = optional complement; E = REJECT.
4. Zamrozić w RCA:
   - schema ledger (id, kind, key, scenario, ts)
   - cleaner registry (REUSE H1–H5 helpers)
   - moment zapisu ledger vs batch-set (anti-orphan-before-flush)
   - polityka concurrent runners
   - lista KV keys dla scan net (cap)
5. Nie łączyć z H3-B/C · nie ruszać Core.
6. Po RCA → PLAN → DESIGN FREEZE (D-H0x-*) → ARCH REVIEW → Owner GO IMPLEMENT.
```

| Pytanie do RCA | Dlaczego |
|----------------|----------|
| Ledger write **before** czy **after** successful `batch-set`? | Trade-off: false open vs orphan bez ledger |
| Jeden global `open-entities.json` vs per-run + aggregate? | Race / stale |
| Scan net: default ON czy flag `PSB_H0X_SCAN=1`? | Egress / czas |
| Czy H1/H2 scrub **delegować** do H0.x (usunięcie duplikacji)? | ZERO DUPLICATE |

---

## 11. Artefakty / stop gate

| Etap | Status |
|------|--------|
| AUDIT | ✅ **READY** (ten dokument) |
| RCA | **BLOCKED** — czekaj Owner GO |
| PLAN / DF / ARCH / IMPLEMENT | **NIE START** |

```text
AUDIT READY → czekaj OWNER GO
  „GO RCA TEST-HARNESS-01 H0.x”
Bez GO: zero RCA / PLAN / kodu / commit / push.
```

**Koniec AUDIT H0.x**
