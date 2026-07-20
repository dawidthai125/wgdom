# TEST-HARNESS-01 H4 — AUDIT REPORT

> **Program:** TEST-HARNESS-01 · Slice **H4** · Cloud Production Sandbox  
> **Etap:** **AUDIT ONLY** · **NIE implementować** · **NIE RCA** bez Owner GO  
> **Data:** 2026-07-20  
> **Baseline prod:** UI **2.65.35** · app **`fce7b78`** · tip **`b59e66e`** · **PRODUCTION VERIFIED · GREEN**  
> **Fundament:** H0–H3-A **RELEASED** · Parent DF [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H4 Cloud AC  
> **Zasady:** SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · ZERO Protected Core · brak COMMIT/PUSH

---

## 0. Identyfikacja zgłoszenia

| Pole | Wartość |
|------|---------|
| **Klasa** | Luka coverage / test-infra (ops safety) — **nie** bug UI prod |
| **Program** | TEST-HARNESS-01 |
| **Slice** | **H4 Cloud** |
| **Handoff Owner** | NEXT EPIC = H4 · STATUS = AUDIT ONLY |
| **Zakaz równoległy** | H3-B · H3-C · H0.x Persist Ledger · CLOUD-P0-DEADLOCK-N2 — **OUT** |

**Werdykt wstępny:** brak formalnego scenariusza `h4-cloud` na fundamencie H0 + `kv-client`, mimo zamrożonego AC w parent DF i releasów H1–H3-A, które już używają Edge KV **przy okazji** domeny (tender/jobs/payroll RO).

---

## 1. Objawy (as-is)

```text
Parent DF H4 AC:
  batch-get → batch-set (sandbox) → retry observe → metrics snapshot → cleanup

Stan runnera:
  IMPLEMENTED = { h0, h1, h2, h3 }
  h4* → PSB_SCENARIO_NOT_IMPLEMENTED (exit 2)
  brak scenarios/h4-cloud.mjs
  brak suite PROD-SANDBOX-H4 w test-manifest.json
```

| Objaw | Dowód |
|-------|--------|
| Scenariusz H4 nie istnieje | `test-infra/prod-sandbox/scenarios/` — tylko h0/h1/h2/h3 |
| Runner blokuje H4 | `runner.mjs` · `PSB_SCENARIO_NOT_IMPLEMENTED: … (H4–H5 require Owner GO)` |
| Manifest bez H4 | `test-infra/test-manifest.json` — `PROD-SANDBOX-H0…H3` only |
| Brak izolowanego Cloud E2E | H1/H2 wołają `kv-client` nested; H3-A = **read-only** `batch-get` — **zero** dedykowanego round-trip Cloud |
| Metryki N1 nie w report PSB | `batchSetRetries` / `__wgdomSyncMetrics()` istnieją w app (`cloud-sync-throttle.ts`) — harness H4 ich **nie** zbiera |
| Ad-hoc ≠ PSB | `.tmp/*cloud*`, DEADLOCK-N1 smokes — poza H0 guardrailami / PSB-001 |

**Symptomy operatorskie:** po H3-A Owner nie ma jednej komendy:

```bash
npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod
```

która PASS/FAIL-uje kontrakt Cloud (get/set/retry/metrics) z cleanup.

---

## 2. Przyczyna (AUDIT — hipotezy; RCA doprecyzuje)

| ID | Hipoteza przyczyny | Siła |
|----|-------------------|------|
| **A1** | Parent D12 rekomendował H0→**H4**→H2…; Owner override zrealizował H0→H1→H2→H3-A — **H4 celowo odroczony** | WYSOKA (docs H2/H3 ARCH REVIEW Q3) |
| **A2** | Częściowe pokrycie Cloud „przy okazji” H1/H2 zmniejszyło poczucie pilności izolowanego H4 | ŚREDNIA |
| **A3** | H4 wymaga jasnej decyzji write-surface: nested sandbox w istniejącym kluczu vs telemetry-only vs nowy KV (D4 = **NIE** nowy KV w MVP) — bez DF slice ryzyko wipe | WYSOKA (blokuje bezpieczny IMPLEMENT) |
| **A4** | Observacja retry N1 jest **probabilistyczna** na spokojnym prod (retry = 0 ≠ FAIL) — brak zamrożonej semantyki WARNING vs FAIL bez RCA/DF | ŚREDNIA |
| **A5** | N1 retry żyje w **Protected Core** (`cloud-batch-set-retry.ts` + client path) — bezpośredni `kv-client.batchSet` **nie** przechodzi przez ten retry loop → H4 musi rozróżnić: Edge raw OK vs app metrics observation | WYSOKA (architektura) |

**Nie jest przyczyną:** regresja prod Lista Płac / Resurrection fence / Rollover (CLOSED · GREEN). H4 ≠ fix produktu.

---

## 3. Wpływ na architekturę

| Warstwa | Impact braku H4 | Impact złego H4 |
|---------|------------------|-----------------|
| **Edge KV** | Brak formalnej regresji `batch-get`/`batch-set` `ok:true` poza ścieżkami domenowymi | Full-key `batch-set` bez nested merge = **wipe** realnych tender/jobs |
| **Protected Core** | Brak presji na edycję Core (dobrze) | Agent może proponować retry w `kv-client` = **duplikat** N1 (#PSB-008 / #PSB-009) |
| **PSB H0** | Fundament gotowy (`mutate-guard`, PSB-001, `--allow-prod`, dry-run) | H4 musi **reuse** — nie forkować drugiego KV clienta |
| **H1/H2** | Już ćwiczą nested write + anti-wipe | H4 powinien **reuse** markerów/`psb-*` + cleanup pattern, nie kopiować scenariuszy domeny |
| **H3-A** | RO payroll — nie zastępuje H4 | Zakaz mieszać payroll keys w H4 write |
| **N1 CLOSED** | Prod ma retry w app | H4 = **obserwacja**, nie re-test deadlock dual-writer (N2 osobno) |
| **CI / Gate B/C** | Parent: prod-sandbox **manual** | Nie wciągać H4 do CI bez osobnego ops gate |

**Granica architekturalna (AUDIT):** H4 = **FEATURE/test-infra** Path A · **D5 ZERO** zmian `cloud-sync.ts` / Edge / merge / Payroll / Theme.

---

## 4. Ryzyko regresji

| Ryzyko | P | Skutek | Kontrola (do zamrożenia w DF po RCA) |
|--------|---|--------|--------------------------------------|
| `batch-set` całego `kw-jobs` / `kw-tenders-pipeline` | **P0** | Utrata danych operacyjnych | Tylko nested `psb-*` + mutate-guard · never replace-all bez filtracji |
| Mutacja payroll keys | **P0** | Resurrection / roster loss | H4 OUT: wszystkie `kw-week*` / payroll |
| Celowy dual-writer deadlock | **P1** | Storm retry / 5xx | Zakaz — tylko naturalna obserwacja N1 |
| Duplikacja retry w harness | **P1** | Drift vs `isTransientBatchSetError` | SSOT import **read-only** unit helper *opcjonalnie* · **nie** nowa pętla retry w prod path |
| Fałszywy FAIL gdy `batchSetRetries=0` | **P2** | Flaky Owner QA | Metrics = snapshot/WARNING; FAIL tylko przy 5xx / `ok:false` / mutate denied |
| Orphan `psb-*` po FAIL mid-set | **P0** | Śmieci KV | PSB-001 `finally` cleanup obowiązkowy |
| Nowy klucz KV „diagnostyczny” | **P1** | Naruszenie D4 | MVP bez nowego KV — wymaga osobnego Owner GO |

---

## 5. Elementy SSOT (reuse — nie duplikować)

| SSOT | Rola dla H4 |
|------|-------------|
| [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H4 AC · D1–D12 · #PSB-001…015 | Kontrakt AC + principles |
| [`TEST-HARNESS-01-PLAN.md`](TEST-HARNESS-01-PLAN.md) § H4 | Zakres get/set/retry/metrics · bez nowego KV |
| [`TEST-HARNESS-01-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-ARCHITECTURE-REVIEW.md) | Threat: deadlock storm; zależność prod 2.65.33+ N1 |
| `test-infra/prod-sandbox/kv-client.mjs` | **Jedyny** Edge client PSB (batch-get/set) |
| `markers.mjs` · `mutate-guard.mjs` · `cleanup.mjs` · `report.mjs` · `allowlist.mjs` | H0 contract |
| Wzorce H1/H2 nested seed + anti-wipe + hydrate LS | Lekcje write-path (nie kopiować logiki domeny) |
| [`CLOUD-P0-DEADLOCK-N1-PRODUCTION-VERIFICATION.md`](CLOUD-P0-DEADLOCK-N1-PRODUCTION-VERIFICATION.md) | N1 **CLOSED** — H4 observe only |
| `src/lib/cloud-batch-set-retry.ts` | SSOT klasyfikacji transient — **nie** edytować; opcjonalny import pure helpers w teście |
| `__wgdomSyncMetrics()` / `getSyncMetrics` | Jedyny SSOT `batchSetRetries` w runtime app |
| H3-A payroll RO | Wzorzec „writes=0” dla dry-run / keys OUT |

**Zakaz SSOT drift:** nie tworzyć drugiego `batch-set` wrappera z własnym retry; nie hardcodować listy kluczy payroll w H4 write.

---

## 6. Mapowanie Parent AC → luki

| AC (DF § H4) | Stan AUDIT |
|--------------|------------|
| `batch-get` allowlist keys OK | **Częściowo** — helper istnieje; brak scenariusza H4 + brak pinu „allowlist keys” pod Cloud |
| `batch-set` tylko sandbox-entity · `ok:true` | **Brak** izolowanego scenariusza (H1/H2 robią to domenowo) |
| retry → `batchSetRetries` w report (obserwacja) | **Brak** · path app ≠ raw `kv-client` |
| metrics snapshot w report | **Brak** |
| Cleanup PASS | N/A do czasu scenariusza — kontrakt PSB-001 gotowy |

---

## 7. OUT OF SCOPE (AUDIT)

- H3-B / H3-C (save payroll)  
- H5 Biblioteka  
- H0.x Persist Ledger  
- CLOUD-P0-DEADLOCK-N2 / sztuczny deadlock  
- Zmiany `cloud-sync.ts` / Edge / merge / Theme / App UI version  
- Naprawa Resurrection / Rollover (CLOSED)  
- CI Gate B/C auto-run prod-sandbox  
- Nowy klucz KV diagnostyczny (chyba że osobne Owner GO — **nie** MVP)

---

## 8. Plan przejścia do RCA (bez IMPLEMENT)

Po **Owner GO → RCA** wykonać wyłącznie:

1. **Potwierdzić problem statement** — luka H4 vs bug produktu (AUDIT: luka harness).  
2. **Sklasyfikować write-surface (decyzja RCA):**  
   - **Opcja A (preferowana SSOT):** nested mutate `psb-*` w istniejącym kluczu domenowym (reuse H1 tender **lub** minimalny marker-only blob) + cleanup.  
   - **Opcja B:** telemetry-only / read-heavy (batch-get + opcjonalny Playwright metrics) — słabsze pokrycie `batch-set`.  
   - **Opcja C:** nowy KV — **ODRZUCONA** bez osobnego GO (D4).  
3. **Rozdzielić dwie ścieżki assertów:**  
   - Edge raw: `kv-client` get → set → get parity · `ok:true`.  
   - App metrics (opcjonalnie Playwright): `__wgdomSyncMetrics().batchSetRetries` — **obserwacja**, nie wymuszanie.  
4. **Zamrozić listę kluczy FORBIDDEN** (payroll + operational non-sandbox).  
5. **Reuse checklist:** zero nowego clienta; zero Core; PSB-001; dry-run side-effect free.  
6. **Deliverable RCA:** `docs/architecture/TEST-HARNESS-01-H4-RCA.md` → potem PLAN → DF → ARCH REVIEW → Owner GO IMPLEMENT.

**Kryterium wejścia do RCA:** ten AUDIT **ACCEPTED** przez Ownera + jawne `GO RCA TEST-HARNESS-01 H4`.

---

## 9. Werdykt AUDIT

| | |
|--|--|
| **Status** | **AUDIT READY** |
| **Problem** | Brak scenariusza H4 Cloud na PSB mimo zamrożonego AC i gotowego `kv-client` / H0–H3-A |
| **Klasa** | Test-infra / ops safety · coverage gap |
| **Priorytet** | **P1** (wysoka wartość sync; niskie ryzyko UI; **wysokie** ryzyko wipe przy złym IMPLEMENT) |
| **Produkt prod** | **GREEN** — H4 nie naprawia incydentu |
| **Następny etap** | **RCA** — tylko po Owner GO |
| **IMPLEMENT** | **BLOCKED** |

---

## 10. Stop gate

```text
AUDIT COMPLETE → czekaj OWNER GO
  „GO RCA TEST-HARNESS-01 H4”
Bez GO: zero RCA / PLAN / DF / kodu / commit / push / bump wersji.
```

**Nie rozpoczęto:** H3-B · H3-C · H5 · ARCH-02F · H0.x.
