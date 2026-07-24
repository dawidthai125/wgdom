# WGDOM-HARDENING-01D — DESIGN FREEZE (Edge 546 Monitoring)

> **ID:** WGDOM-HARDENING-01D  
> **STATUS:** DESIGN FREEZE COMPLETE  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (DF only)  
> **EPIC:** D — Edge 546 Monitoring · **M2-A monitor-only**  
> **Wejście:** [`WGDOM-HARDENING-01D-PLAN.md`](./WGDOM-HARDENING-01D-PLAN.md) · [`WGDOM-HARDENING-01D-RCA.md`](./WGDOM-HARDENING-01D-RCA.md) · [`WGDOM-HARDENING-01D-AUDIT.md`](./WGDOM-HARDENING-01D-AUDIT.md)  
> **Poza zakresem:** implementacja · ARCH REVIEW (następny) · commit · push  
> **Production Baseline:** UI **2.65.40** · feature **`23d7723`** · docs tip **`82e4532`** · EPIC A **CLOSED** · **STABILIZATION WINDOW ACTIVE**

```text
══════════════════════════════════════
WGDOM-HARDENING-01D DESIGN FREEZE
IN:   D-V1 smoke+progi · D-V2 trend ledger
D-V3: DEFER (attribution)
OUT:  runtime · Cloud Sync · retry 546 · Edge chunk
══════════════════════════════════════
```

---

## 0. Zamrożone decyzje (executive)

| # | Decyzja | Wartość **FROZEN** |
|---|--------|---------------------|
| **D1** | Wariant EPIC | **M2-A monitor-only** (tooling/docs) |
| **D2** | D-V1 | **IN** — smoke + progi WARN/FAIL + runbook |
| **D3** | D-V2 | **IN** — trend ledger SSOT + seed pre-A / post-A |
| **D4** | D-V3 per-URL attribution | **DEFER** — poza IMPLEMENT 01D |
| **D5** | Runtime (`src/**`, SPA) | **ZAKAZ** |
| **D6** | Cloud Sync / `cloud-sync.ts` / retry classifier | **ZAKAZ** |
| **D7** | Retry / swallow HTTP 546 | **ZAKAZ** |
| **D8** | Edge chunk / fat-key / `kv-mset-chunk` | **ZAKAZ** (M2-C OUT) |
| **D9** | Semantyka aplikacji (persist, heavy, breaker) | **ZAKAZ ZMIAN** |
| **D10** | CI obowiązkowy na każdy PR | **OUT** (on-demand only) |
| **D11** | Continuous watcher / cron prod | **ZAKAZ** bez osobnego Owner GO |
| **D12** | Canonical script | `scripts/smoke-wgdom-hardening-01d-edge-546.mjs` |
| **D13** | Ledger path | `docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md` |
| **D14** | Runbook path | sekcja w DF §7 + po IMPLEMENT: `docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md` (może być ten sam plik co ledger appendix — DF: **osobny plik runbook**) |
| **D15** | Bundle class | **PLATFORM / FEATURE tooling** · zero CORE Sync files |
| **D16** | `includeAttribution` | **`false`** (D-V3 DEFER) |

---

## 1. Cel (zamrożony)

1. Mierzalny, powtarzalny sygnał Edge **546** + **pipeSet** w Stabilization Window.  
2. Progi **WARN/FAIL** + guard Sync Storm (`any522`, `anyThrash`).  
3. SSOT **trend ledger** z seedem empirii AUDIT.  
4. **Zero** wpływu na runtime Production / mobile semantyki — tylko obserwacja (MOBILE FIRST = ochrona przed regresją egress przez alert pipeSet).

**Nie-cele (FROZEN OUT):** naprawa 546 · zamknięcie H-FAT · kauzalność attribution (D-V3) · zmiana tip feature.

---

## 2. Decyzja D-V3 — **DEFER**

| | |
|--|--|
| **Status** | **DEFER** (`includeAttribution = false`) |
| **Uzasadnienie** | (1) CLOSE monitor-epic w Stabilization Window = D-V1+D-V2 wystarczają do DoD PLAN. (2) Kauzalność per-URL nie blokuje MONITOR. (3) Unika rozszerzania harnessu przed pierwszym PASS D-T1…D-T8. (4) Attribution = follow-up tooling bez runtime — wymaga **nowego mini-GO** / amendment DF, nie „cichego” scope creep. |
| **Co DEFER nie oznacza** | Nie kasuje wariantu z PLAN/RCA — pozostaje backlog 01D-followup. |
| **Re-open** | Tylko jawne Owner GO + DF amendment (`includeAttribution: true`) + testy D-T9…D-T11. |

---

## 3. Zamrożony zakres D-V1 / D-V2

### 3.1 D-V1 — Smoke + progi

| Element | FROZEN |
|---------|--------|
| Źródło logiki | **REUSE** `.tmp/final-prod-audit-multi.mjs` (skopiowany/przeniesiony do canonical script; **zakaz** drugiej, rozbieżnej logiki liczenia) |
| Canonical script | `scripts/smoke-wgdom-hardening-01d-edge-546.mjs` |
| Target | prod `https://www.wgdom.fun` (jak AUDIT) — on-demand |
| Sesja | 11 open: Kamieńskiego + top10 by docs/rows · ~25s observe / tender |
| Output JSON | `.tmp/hardening-01d-smoke-<ISO>.json` **oraz** latest `.tmp/hardening-01d-smoke-latest.json` |
| Konsola | SUMMARY: 546, pipeSet, maxPipeSet, any522, anyThrash, verdict |
| Exit code | `0` = PASS (brak FAIL); `1` = FAIL threshold lub Sync Storm guard; WARN nie wymusza `1` (tylko raport) |

### 3.2 Progi alarmowe (**FROZEN**)

Baseline porównawczy post-A: `pipeSet_baseline_post_a = 13`  
(źródło: `.tmp/hardening-01d-audit-multi-tender-2.65.40.json`)

| Sygnał | WARN | FAIL |
|--------|------|------|
| `status["546"]` (cała sesja) | `≥ 1` | `≥ 3` **OR** `546_rate > 0.02` gdzie `546_rate = 546 / sum(status[*])` |
| `pipeSet` | `> 18` | `> 22` |
| `maxPipeSet` | `≥ 3` | `≥ 4` |
| `any522` | — | **true → FAIL** |
| `anyThrash` | — | **true → FAIL** |

**Reguły werdyktu (FROZEN):**

```text
if any FAIL  → verdict = FAIL  (exit 1)
else if any WARN → verdict = WARN (exit 0)
else             → verdict = PASS (exit 0)
```

**WARN ≠ automatyczny rollback / ≠ incident Sync Storm.**  
FAIL na `any522`/`anyThrash` → ścieżka **Sync Storm / incident**, nie „fix 546”.

### 3.3 Format raportowania JSON (**FROZEN** minimum)

```json
{
  "id": "WGDOM-HARDENING-01D",
  "at": "<ISO-8601>",
  "tip": { "version": "<from version.json>", "commit": "<from version.json>" },
  "netTotals": {
    "pipeGet": 0,
    "pipeSet": 0,
    "allGet": 0,
    "allSet": 0,
    "status": { "200": 0 }
  },
  "derived": {
    "count546": 0,
    "546_rate": 0,
    "maxPipeSet": 0,
    "maxPipeGet": 0,
    "any522": false,
    "anyThrash": false
  },
  "thresholds": {
    "pipeSetBaselinePostA": 13,
    "verdict": "PASS|WARN|FAIL",
    "triggers": []
  },
  "results": [],
  "statusByPath": null
}
```

- `statusByPath`: **zawsze `null`** w 01D (D-V3 DEFER).  
- `triggers`: lista stringów np. `["WARN:546>=1"]`, `["FAIL:any522"]`.  
- `results[]`: jak w Final Audit smoke (id, tag, deltaPipeSet/Get, thrash, uniqueBuiltAt, …).

### 3.4 D-V2 — Trend ledger

| Element | FROZEN |
|---------|--------|
| Path | `docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md` |
| Seed obowiązkowy | 2 wiersze: pre-A (2.65.39) + post-A (2.65.40) z AUDIT |
| Reguła | Każdy smoke użyty do decyzji Ownera / CLOSE / Stabilization check → **nowy wiersz** |
| PII | W ledgerze **bez** tytułów przetargów — tylko metryki + ścieżka JSON |

**Schema kolumn (FROZEN):**

| Kolumna | Opis |
|---------|------|
| `at` | ISO czasu smoke |
| `version` | UI z `version.json` |
| `commit` | commit z `version.json` |
| `count546` | `status["546"]` lub 0 |
| `546_rate` | ułamek 0–1 (opcjonalnie w %) |
| `pipeSet` | netTotals.pipeSet |
| `maxPipeSet` | max ΔpipeSet / open |
| `allSet` | netTotals.allSet |
| `any522` | bool |
| `anyThrash` | bool |
| `verdict` | PASS / WARN / FAIL |
| `artifact` | ścieżka JSON `.tmp/...` |
| `notes` | krótki komentarz Operatora |

---

## 4. Ograniczenia architektoniczne (**FROZEN**)

| Ograniczenie | Potwierdzenie DF |
|--------------|------------------|
| Tooling/docs only | **TAK** |
| Brak zmian runtime (`src/**`) | **TAK** |
| Brak Cloud Sync | **TAK** |
| Brak retry 546 | **TAK** |
| Brak Edge chunk | **TAK** |
| Brak zmian semantyki aplikacji | **TAK** |
| REUSE FIRST / ZERO DUPLICATE Network logic | **TAK** — jeden harness |
| SSOT FIRST | tip/`09` · risks/`07` · ledger 01D |
| MOBILE FIRST | alert pipeSet + 546; zero UI redesign |
| Sync Storm P0 | guards w każdym raporcie; brak amendment kontraktu P0 |
| M-EDGE-546 / H-FAT | pozostają **MONITOR** — 01D **nie** oznacza FIXED/CLOSED fat-key |
| Mixed WT | stage allowlist: `scripts/smoke-wgdom-hardening-01d*` · `docs/architecture/WGDOM-HARDENING-01D*` · ewentualnie link w `docs/AI/07` |

**Allowlist IMPLEMENT (projekcja):**

```text
scripts/smoke-wgdom-hardening-01d-edge-546.mjs
docs/architecture/WGDOM-HARDENING-01D-TREND-LEDGER.md
docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md
docs/architecture/WGDOM-HARDENING-01D-IMPLEMENTATION-REPORT.md  (po IMPLEMENT)
(+ opcjonalnie 1–2 linie linku w docs/AI/07_KNOWN_RISKS.md)
```

**Deny:** `src/**` · `supabase/**` · `src/lib/cloud-sync.ts` · storage · TEUX · inne WIP.

---

## 5. Plan testów D-T1…D-T8 (**FROZEN**)

| ID | Test | Gate |
|----|------|------|
| **D-T1** | Skrypt raportuje `count546`, `pipeSet`, `maxPipeSet`, `any522`, `anyThrash`, `verdict` | Must |
| **D-T2** | Output umożliwia porównanie do baseline pre-A / post-A (pola + runbook) | Must |
| **D-T3** | Na tipie GREEN: `any522=false`, `anyThrash=false` (live lub ostatni artefakt tipu) | Must |
| **D-T4** | Logika progów (fixture JSON / unit w skrypcie): 546=0→PASS; 546=1→WARN; 546=3→FAIL; any522→FAIL | Must |
| **D-T5** | `git diff` / staged: **0** plików `src/**`, `supabase/**`, `*cloud-sync*` | Must |
| **D-T6** | Ledger istnieje; seed pre-A + post-A zgodny z AUDIT | Must |
| **D-T7** | Runbook zawiera: komendę uruchomienia, interpretację WARN/FAIL, „dopisz wiersz do ledger” | Must |
| **D-T8** | `docs/AI/07` M-EDGE-546 nadal **MONITOR** (nie FIXED); brak sprzeczności z ledgerem | Must |

**D-T9…D-T11:** **N/A** w 01D (D-V3 DEFER).

---

## 6. Rollback (**FROZEN**)

| Poziom | Akcja |
|--------|-------|
| Scripts/docs | Revert commit(s) 01D |
| Prod app / Edge | **Brak potrzeby** — nietknięte |
| Evidence `.tmp` | Może zostać; nie blokuje rollbacku |
| Ledger | Może pozostać historyczny lub revert razem z docs |

**WARN/FAIL smoke nie triggeruje automatycznego rollbacku aplikacji.**

---

## 7. Runbook operacyjny (**FROZEN treść — plik przy IMPLEMENT**)

> Canonical runtime copy po IMPLEMENT: `docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md`  
> Poniższa treść jest **źródłem zamrożonym** — IMPLEMENT nie zmienia semantyki progów bez DF amendment.

### 7.1 Kiedy uruchamiać

- Po releasie wpływającym na tenders/pipeline/Edge traffic.  
- W Stabilization Window: okresowo wg Ownera (np. po epiku / tygodniu).  
- Przed decyzją o eskalacji M-EDGE-546 / H-FAT.  
- **Nie** w pętli agenta / nie cron bez GO.

### 7.2 Komenda (projekcja)

```bash
node scripts/smoke-wgdom-hardening-01d-edge-546.mjs
```

Wymaga lokalnych sekretów jak Final Audit smoke (`VITE_*`, admin pass) — **nie commitować**.

### 7.3 Po runie

1. Odczytaj `verdict` + `triggers`.  
2. Skopiuj/zachowaj JSON artifact.  
3. **Dopisz wiersz** do `WGDOM-HARDENING-01D-TREND-LEDGER.md`.  
4. Interpretacja:
   - **PASS** — brak działania.  
   - **WARN** — odnotuj; rozważ powtórzenie N=2; **nie** włączaj retry 546.  
   - **FAIL** — Owner escalate; jeśli `any522`/`anyThrash` → tor Sync Storm; jeśli tylko 546/pipeSet → tor load/MONITOR (ew. osobny epic fat-key — **nie** 01D fix).

### 7.4 Zakazy Operatora

- ❌ Retry 546 w kodzie / „hotfix” cloud-sync  
- ❌ Edge chunk „na szybko”  
- ❌ Flip `pipelineBootstrapPersistLocal` na prod bez GO  
- ❌ Traktować PASS jako zamknięcie H-FAT

---

## 8. Ryzyka (DF)

| ID | Ryzyko | Sev | Mitygacja FROZEN |
|----|--------|-----|------------------|
| **F1** | False WARN (top-set drift) | LOW | notes w ledger; WARN≠FAIL |
| **F2** | Mylenie 546 z Sync Storm | HIGH | Guard 522/thrash; runbook §7.3 |
| **F3** | Scope creep D-V3 / retry / chunk | HIGH | D4 DEFER + D5–D9 zakazy |
| **F4** | Ledger nieaktualny | MEDIUM | D-T7 obowiązek wpisu |
| **F5** | Duplikacja harness `.tmp` vs `scripts/` | MEDIUM | Canonical = scripts; `.tmp` source tylko do REUSE copy |
| **F6** | Secrets leakage | MEDIUM | env lokalne; brak commit `.env` |
| **F7** | Fałszywe „546 fixed” | MEDIUM | AI/07 MONITOR; A8 PLAN |

---

## 9. Kryteria akceptacji / Definition of Done

### 9.1 Kryteria akceptacji (zamrożone)

| # | Kryterium |
|---|-----------|
| A1 | Deliverable = tooling/docs only (D-T5) |
| A2 | D-V1: script + progi + JSON format + exit codes |
| A3 | D-V2: ledger + seed + procedura wpisu |
| A4 | D-T1…D-T8 PASS |
| A5 | D-V3 **DEFER** udokumentowany (CLOSEOUT) |
| A6 | Zakazy D5–D9 potwierdzone w IMPLEMENT REPORT |
| A7 | M-EDGE-546 = MONITOR; H-FAT nie CLOSED przez 01D |

### 9.2 Definition of Done

- [ ] DF ✓ (ten dokument)  
- [ ] ARCH REVIEW PASS (oczekiwany FEATURE/tooling)  
- [ ] Owner GO IMPLEMENT  
- [ ] Pliki allowlist utworzone  
- [ ] D-T1…D-T8 PASS  
- [ ] Runbook opublikowany (treść zgodna z §7)  
- [ ] Ledger seed + link z runbooka  
- [ ] OV: jeden smoke on-demand **lub** dry D-T4 + weryfikacja tip GREEN guards  
- [ ] COMMIT/PUSH tylko po Owner GO · scope-only  
- [ ] CLOSEOUT: D-V3 DEFER + MONITOR residual  

---

## 10. Boundary / ARCH (projekcja dla Review)

| | |
|--|--|
| Klasa | PLATFORM tooling / docs |
| CORE Sync | **Nie** |
| Oczekiwany wynik ARCH | **PASS** lub **PASS WITH CONSTRAINTS** (zero src, D-V3 DEFER, zakazy retry/chunk) |
| Sync Storm amendment | **Nie wymagany** |

---

## 11. Owner Readiness do ARCH REVIEW

| Kryterium | Stan |
|-----------|------|
| Zakres D-V1/D-V2 zamrożony | ✔ |
| D-V3 = DEFER + uzasadnienie | ✔ |
| Progi + format JSON | ✔ |
| Ledger schema | ✔ |
| Runbook | ✔ (§7) |
| D-T1…D-T8 | ✔ |
| Rollback | ✔ |
| Ograniczenia architektoniczne | ✔ |
| Implementacja / commit / push | Nie (zgodne z GO) |

```text
OWNER READINESS: READY FOR ARCH REVIEW (01D)

Next allowed step: Owner GO → WGDOM-HARDENING-01D ARCHITECTURE REVIEW
Forbidden without GO: IMPLEMENT · commit · push
```

---

## 12. Raport końcowy (Owner card)

### 1. Zamrożony zakres
**D-V1** (smoke + progi + runbook) + **D-V2** (trend ledger + seed). Tooling/docs only.

### 2. Decyzja D-V3
**DEFER** (`includeAttribution=false`) — nie blokuje CLOSE; re-open tylko z Owner GO + DF amendment.

### 3. Kryteria akceptacji
A1–A7 (§9.1) · D-T1…D-T8 · zero runtime/Cloud Sync/retry/chunk · M-EDGE-546 MONITOR.

### 4. Ryzyka
F1–F7 (§8) — najwyższe procesowe: mylenie ze storm (F2) i scope creep (F3).

### 5. Definition of Done
§9.2 — DF→ARCH→GO IMPLEMENT→D-T*→OV→COMMIT(GO)→CLOSE z D-V3 DEFER.

### 6. Owner Readiness do ARCH REVIEW
**READY**
