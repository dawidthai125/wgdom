# WGDOM-HARDENING-01 — PLAN

> **ID:** WGDOM-HARDENING-01  
> **STATUS:** PLAN COMPLETE · **EPIC A CLOSED** @ 2.65.40 / `23d7723` · **EPIC D CLOSED** @ docs tip `96d44d0`  
> **Data:** 2026-07-24  
> **Owner GO:** APPROVED (PLAN only) · EPIC A: CLOSEOUT [`WGDOM-HARDENING-01A-CLOSEOUT.md`](./WGDOM-HARDENING-01A-CLOSEOUT.md)  
> **Wejście:** [`WGDOM-HARDENING-01-AUDIT.md`](./WGDOM-HARDENING-01-AUDIT.md) · [`WGDOM-HARDENING-01-RCA.md`](./WGDOM-HARDENING-01-RCA.md)  
> **Poza zakresem tej fazy:** implementacja · refactor · commit · push · DESIGN FREEZE (osobne artefakty per EPIC)  
> **Baseline tip:** **`23d7723`** · UI **2.65.40** · Sync Storm P0 **PRODUCTION READY** (nie naruszać) · EPIC A **CLOSED**

```text
══════════════════════════════════════
WGDOM-HARDENING-01 PLAN COMPLETE
EPICs: A Persist · B Breaker · C CORE Sync · D Monitor · E Autonomous FP
══════════════════════════════════════
```

---

## 0. Zasady planu (frozen for PLAN)

| Zasada | Implikacja |
|--------|------------|
| **SSOT FIRST** | Jedna polityka persist = `TenderItemUpdateOpts` + `updateItem`; jeden retry classifier; dwa FP (Heavy ≠ Autonomous) dokumentowane w macierzy |
| **REUSE FIRST / ZERO DUPLICATE** | Zakaz drugiego `saveTendersPipeline` / breakera / retry helpera; adapter UI zamiast kopiowanych closures |
| **MOBILE FIRST** | Sukces = mniej fat `batch-set` na open Dokumentów (egress, timeout, bateria) |
| **Sync Storm P0 intact** | Nie wolno: `builtAt` w E-RUN deps · partial heavy → cloud · usunięcie per-FP limitu bez DF · mixed CORE+FEATURE (#CORE-013) |
| **STABILIZATION** | Każdy EPIC: AUDIT✓ → RCA✓ → **ten PLAN** → **DF per EPIC** → ARCH REVIEW → Boundary → Owner GO IMPLEMENT |
| **Mixed WT** | Lokalne ARCH-02F / Edge chunk / TEUX **poza** scope — osobne branche/commity |

### Mapowanie finding → EPIC

| Finding | EPIC | RCA warianty w grze | Kierunek PLAN (do zamrożenia w DF) |
|---------|------|---------------------|-----------------------------------|
| H1 | **A** | H1-A / H1-B / H1-C | **Prefer H1-A** (+ reuse coalesce) |
| H2 | **A** | H2-A / H2-B / H2-C | **Prefer H2-A + H2-C** (forward + adapter) |
| H3 | **B** | H3-A / H3-B / H3-C | **Prefer H3-C najpierw**; H3-A tylko po telemetrii |
| M1 | **C** | M1-A / M1-B / M1-C | **Prefer M1-A** (N2 + N1 belt); M1-B/C tylko jeśli N2 nie wystarczy |
| M2 | **D** | M2-A / M2-B / M2-C | **Prefer M2-A**; M2-B = efekt EPIC A; M2-C = osobny fat-key epic (OUT) |
| M3 | **E** | M3-A / M3-B / M3-C | **Prefer M3-B** (macierz SSOT) → potem ewentualnie M3-A |

---

## EPIC A — Persist SSOT (H1 + H2) · **CLOSED** @ 2.65.40 / `23d7723`

> **CLOSEOUT:** [`WGDOM-HARDENING-01A-CLOSEOUT.md`](./WGDOM-HARDENING-01A-CLOSEOUT.md) · PV tip GREEN.  
> Następny start: EPIC B/D/E — tylko po Owner GO.

### Cel

Ujednolicić kontrakt persist pipeline tak, by:

1. Bootstrap discovery/shell **nie** robił natychmiastowego fat cloud przy każdym patchu (H1).  
2. Wszystkie UI adapters **forwardowały** (lub świadomie nie deklarowały) `TenderItemUpdateOpts` (H2).  
3. **Bez** zmiany semantyki heavy P0 (`persist: local` partial / `cloud` final).

### Zakres

| IN | OUT |
|----|-----|
| `useTenderDocumentsBootstrap` — arity + mode na discovery/shell | Zmiana `HEAVY_E_RUN_DEP_KEYS` / breaker |
| `useTendersPipeline.updateItem` — bez nowej gałęzi semantyki (reuse existing modes) | `cloud-sync.ts` / Edge / Payroll |
| Adapter SSOT `bindPipelineOnUpdate` (lub równoważny jeden helper) | ARCH-02F · kv-mset-chunk |
| `TenderDetailPage` / `TendersView` wrappers forward opts | Redesign TenderDetailPanel UX |
| Testy: bootstrap local count · wrapper arity · Sync Storm P0 suite regresja | Włączenie `pipelinePerfDebouncePersist=true` jako **jedyny** fix (opcjonalnie DF: nie) |

**Kierunek DF (do zamrożenia):**

- Bootstrap: `{ persist: "local" }` dla discovery/shell mid-flight; **jeden** cloud (coalesce force lub settled) gdy bootstrap complete / authoritative discovery — szczegóły w DF.  
- Wrappers: `(patch, opts?) => updateItem(id, patch, opts)`.  
- Panel: albo forward-capable, albo typ bez opts (DF wybierze H2-A vs zawężenie).

### Zależności

| Zależy od | Blokuje |
|-----------|---------|
| AUDIT+RCA HARDENING ✓ | EPIC D skuteczność load (M2-B) |
| Sync Storm P0 tip GREEN | Część telemetrii EPIC B (mniej szumu cloud) |
| Brak | EPIC C/E (nie twarde) |

### Analiza ryzyka

| Ryzyko | Sev | Mitygacja w planie |
|--------|-----|-------------------|
| Discovery zginie przy kill app przed cloud | HIGH | DF: jawny final cloud bootstrap / coalesce; OV dual-refresh |
| Regresja Sync Storm (partial→cloud) | CRITICAL | Gate: `test-tenders-sync-storm-p0` + OV; zero zmian heavy deps |
| Multi-tab LWW race przy local-only bootstrap | MEDIUM | DF: document LWW; nie wymuszać global debounce ON |
| Mixed commit z CORE Sync | HIGH | Boundary #CORE-014; bundle tylko tenders hooks/UI |

**Boundary (projekcja):** dominująca klasa **HIGH Tenders persist / FEATURE-adjacent** — jeśli diff nie dotyka `cloud-sync.ts`. Jeśli DF wymusi zmianę `cloud-sync` → **STOP** → CORE bundle.

### Wpływ na Production

| Metryka | Oczekiwany efekt |
|---------|------------------|
| Pipe `batch-set` / open Dokumentów | Spadek residual (cel DF: zbliżyć do DoD P0 „≤1 final + ≤1 bootstrap cloud”) |
| `anyThrash` / 522 | Bez zmian (musi zostać false/0) |
| Lista Płac | **Zero** wpływu (OUT) |
| Mobile | Mniej egress przy pierwszym open |

### Plan testów

| ID | Test | Gate |
|----|------|------|
| A-T1 | Unit/harness: bootstrap mid-flight → 0 cloud `persistKey(pipeline)` (lub count local-only) | Must |
| A-T2 | Bootstrap settled → ≤1 cloud coalesce | Must |
| A-T3 | Wrapper arity: opts `{persist:"local"}` dociera do `updateItem` | Must |
| A-T4 | `scripts/test-tenders-sync-storm-p0.mjs` | Must PASS |
| A-T5 | Owner verify script Sync Storm (jeśli nadal w repo) | Must |
| A-T6 | Mobile smoke: open MOPS-class na telefonie — brak lawiny Network | OV |
| A-T7 | `vite build` + changelog bump | Release |

### Rollback strategy

1. Revert commit EPIC A (single bundle).  
2. Feature flag (opcjonalnie w DF): `pipelineBootstrapPersistLocal` — instant OFF → poprzednie zachowanie cloud.  
3. **Nie** rollback Sync Storm P0 tip.  
4. Verify: `version.json` + Sync Storm smoke.

### Wymagany Design Freeze

**TAK — `WGDOM-HARDENING-01A-DESIGN-FREEZE.md`**

Zamrozić m.in.:

- Exact moment bootstrap → cloud (1×).  
- Czy shell i discovery mają ten sam mode.  
- Adapter API + lista plików IN/OUT.  
- Flaga rollback (tak/nie).  
- Boundary class + zakaz touch `cloud-sync.ts`.

### Definition of Done

- [ ] DF 01A + ARCH REVIEW PASS  
- [ ] Owner GO IMPLEMENT 01A  
- [ ] A-T1…A-T5 PASS · A-T6 OV  
- [ ] CHANGELOG bump · COMMIT · PUSH (tylko na GO)  
- [ ] Production Verify FAST · pipe Δset residual ↓ vs baseline Final Audit  
- [ ] POST + CLOSE 01A  
- [ ] #CORE-013: zero mixed CORE

---

## EPIC B — Circuit Breaker (H3)

### Cel

Zmniejszyć ryzyko **bounded churn** heavy przy zmianach `gateFingerprint`, **bez** łamania G2/T3 (legalny re-parse nowych docs) i **bez** wkładania `builtAt` do E-RUN deps.

### Zakres

| IN | OUT |
|----|-----|
| Telemetria churn FP / heavyRunAttempts (H3-C) | Zmiana `HEAVY_E_RUN_DEP_KEYS` (zakaz bez osobnego Sync Storm DF) |
| Opcjonalnie (faza 2 DF): soft global cap / cooldown (H3-A/B) | Persist bootstrap (EPIC A) |
| Testy T3 regresja (nowy FP = allow) | Payroll · Edge |

**Kierunek PLAN (dwufazowy):**

1. **B0 (prefer):** H3-C — monitor + metryki (może być docs/scripts + minimal KEEP DEBUG).  
2. **B1 (tylko po B0 evidence):** H3-A lub H3-B — zmiana semantyki breakera → **osobny DF Sync Storm amendment**.

### Zależności

| Zależy od | Blokuje |
|-----------|---------|
| EPIC A CLOSED (rekomendowane — czystszy sygnał Network) | — |
| Sync Storm P0 kontrakt | Każda zmiana limitu = CORE-adjacent GO |

### Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Global cap → false terminal fail po discovery growth | HIGH | B1 tylko po telemetrii; reset policy w DF |
| Regresja Sync Storm infinite | CRITICAL | Nie ruszać deps; suite P0 must PASS |
| Telemetria PII | LOW | itemId hash / bez tytułów |

### Wpływ na Production

| B0 monitor | Zero / minimalny wpływ runtime |
| B1 cap/cooldown | Może zatrzymać nadmiarowe re-parse; ryzyko false fail |

### Plan testów

| ID | Test | Gate |
|----|------|------|
| B-T1 | Istniejące T3: nowy FP → allow ≤2 runs | Must |
| B-T2 | Sync Storm P0 full suite | Must |
| B-T3 | (B1) Global cap: discovery growth po 2 fails → zdefiniowane zachowanie DF | Must jeśli B1 |
| B-T4 | Live multi-tender: thrash=false · uniqueBuiltAt policy | OV |

### Rollback strategy

- B0: wyłączyć telemetrię / usunąć skrypt.  
- B1: revert + natychmiastowy powrót do per-FP-only (P0).  
- Feature flag `heavyGlobalRunCap` (jeśli B1) default OFF.

### Wymagany Design Freeze

- **B0:** `WGDOM-HARDENING-01B0-DESIGN-FREEZE.md` (lekki — metryki).  
- **B1:** `WGDOM-HARDENING-01B1-DESIGN-FREEZE.md` **+** jawny **Sync Storm P0 contract amendment** (Owner GO CORE).

### Definition of Done

- [ ] B0: metryki + runbook monitor · CLOSE  
- [ ] B1 (opcjonalnie): DF amendment · ARCH · GO · testy · PV · CLOSE  
- [ ] P0 suite PASS po każdej fazie  
- [ ] Decision Log wpis jeśli zmiana G2 semantyki

---

## EPIC C — CORE Sync (M1)

### Cel

Ograniczyć amplifier deadlock retry przy zachowaniu D-13 (retry tylko `40P01` / `deadlock detected`, nie CF 522 HTML).

### Zakres

| IN | OUT |
|----|-----|
| Prefer: **CLOUD-P0-DEADLOCK-N2** (sort keys w `kv.mset`) — już READY | Rozszerzenie retry na inne 5xx |
| N1 belt pozostaje (`cloud-batch-set-retry.ts`) | Zmiana Payroll Domain Push semantyki |
| Ewentualnie później: M1-B/C tylko jeśli N2 niewystarczające | Fat-key chunk (osobny epic) |

**Kierunek PLAN:** **M1-A** — implement N2 (Edge) przy N1 bez zmian klasyfikatora; review attempts dopiero post-N2.

### Zależności

| Zależy od | Blokuje |
|-----------|---------|
| [`CLOUD-P0-DEADLOCK-N2-READY.md`](./CLOUD-P0-DEADLOCK-N2-READY.md) | — |
| Osobny Owner GO **CORE** (człowiek) | Nie bundle’ować z EPIC A |
| Deploy Supabase Action | FE tip może zostać bez bumpu jeśli tylko Edge |

### Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Regresja KV upsert / kolejność | CRITICAL | Test sort · canary · rollback Edge |
| Wpływ na Payroll push | HIGH | Gate B payroll · dual-session smoke |
| Mixed FE+Edge commit | HIGH | Osobny bundle Edge vs FE (#CORE-013) |

### Wpływ na Production

- Mniej 40P01 → mniej ×4 fat retry.  
- Nie zmienia Sync Storm P0 FE kontraktu.  
- Wymaga **Edge deploy** (nie Vercel-only).

### Plan testów

| ID | Test | Gate |
|----|------|------|
| C-T1 | Test kolejności kluczy mset (N2 READY harness) | Must |
| C-T2 | `test-cloud-deadlock-n1-retry.mjs` — klasyfikator bez zmian | Must |
| C-T3 | Gate payroll B (jeśli FE też ruszony; przy pure Edge — smoke batch-set) | Must |
| C-T4 | Prod: brak wzrostu 5xx po deploy Edge | PV |

### Rollback strategy

- Revert Edge function revision (Supabase).  
- N1 FE zostaje (belt).  
- Nie rollback’ować tip FE Sync Storm.

### Wymagany Design Freeze

**TAK — reuse/extend N2 DF** lub `WGDOM-HARDENING-01C-DESIGN-FREEZE.md` wskazujący N2 jako SSOT implementacji.  
Owner GO = **ścieżka B CORE** (`WORKFLOW-OWNER-GO`).

### Definition of Done

- [ ] DF/N2 ARCH REVIEW · Owner CORE GO  
- [ ] Edge deployed · C-T* PASS  
- [ ] Production Verification Edge/health + deadlock rate  
- [ ] CLOSE · link do N2 closeout  
- [ ] Decision Log jeśli zmienia attempts (tylko jeśli M1-B później)

---

## EPIC D — Edge Monitoring (M2) · **CLOSED** @ docs tip `96d44d0`

> **CLOSEOUT:** [`WGDOM-HARDENING-01D-CLOSEOUT.md`](./WGDOM-HARDENING-01D-CLOSEOUT.md) · PV PASS · D-V3 **DEFER** · **M-EDGE-546 = MONITOR**.

### Cel

Uczynić **546** (i pokrewne non-522 5xx) mierzalnym sygnałem obciążenia multi-open — bez „naprawiania” 546 w UI i bez chunk epic.

### Zakres

| IN | OUT |
|----|-----|
| Smoke/harness multi-tender: agregacja `status["546"]` + progi alert | Retry na 546 |
| Runbook: korelacja z H1 Δset | Edge kv-chunk / fat-key split (OUT → osobny epic) |
| Dokument baseline vs post-EPIC-A | Zmiana `cloud-sync` |

**Kierunek PLAN:** **M2-A**; load↓ jako efekt uboczny EPIC A (**M2-B**); **M2-C OUT**.

### Zależności

| Zależy od | Blokuje |
|-----------|---------|
| Artefakt `.tmp/final-prod-audit-multi-tender.json` jako baseline | — |
| EPIC A (dla porównania post) | — (B0 monitor może startować równolegle) |

### Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| False alarm 546 | LOW | Próg względny (np. >0 w sesji 11 open = WARN; trend) |
| Agent loop na monitor | LOW | Jednorazowy curl/smoke — bez pollingu Vercel |

### Wpływ na Production

- Zero zmiany runtime app (jeśli tylko scripts/docs).  
- Lepsza obserwowalność Stabilization Window.

### Plan testów

| ID | Test | Gate |
|----|------|------|
| D-T1 | Skrypt multi-tender raportuje `546` count | Must |
| D-T2 | Porównanie pre/post EPIC A (dokument) | DoD |
| D-T3 | `any522` nadal 0 na tip | Must |

### Rollback strategy

- Usunąć/wyłączyć skrypt monitora — zero wpływu prod app.

### Wymagany Design Freeze

**Lekki TAK — `WGDOM-HARDENING-01D-DESIGN-FREEZE.md`** (progi, format raportu, zakaz retry-546).  
Klasa: PLATFORM / tooling — FEATURE PASS jeśli zero `src/` CORE.

### Definition of Done

- [x] DF 01D · skrypt/runbook w repo  
- [x] Baseline 546 udokumentowany  
- [x] Post-A comparison (po CLOSE A)  
- [x] CLOSE 01D

---

## EPIC E — Autonomous Fingerprint (M3)

### Cel

Usunąć niespójność polityk fingerprint **bez** przywracania `builtAt` do Heavy E-RUN: jawna macierz SSOT pól → ewentualna korekta Autonomous FP.

### Zakres

| IN | OUT |
|----|-----|
| Macierz SSOT: Heavy / Autonomous / Unified Gate — które pola | Zmiana `HEAVY_E_RUN_DEP_KEYS` |
| Ewentualnie M3-A: usunięcie `builtAt` z części `kosztorys` Autonomous | Redesign całego NG-10 UX |
| Testy `deriveAutonomousRunRequired` | Cloud Sync CORE |

**Kierunek PLAN:** najpierw **M3-B** (macierz w DF); implementacja kodu **M3-A** tylko jeśli macierz tak zdecyduje; **M3-C** jako fallback.

### Zależności

| Zależy od | Blokuje |
|-----------|---------|
| NG-10 / Autonomous docs | — |
| Nie zależy od EPIC A/B (ortogonalne) | — |

### Analiza ryzyka

| Ryzyko | Sev | Mitygacja |
|--------|-----|-----------|
| Pominięcie re-run gdy dossier realnie nowy | MEDIUM | Zastąpić `builtAt` sygnałem `kosztorys.ok`+rowCount+parserVersion (DF) |
| Przypadkowe dodanie builtAt do Heavy | CRITICAL | Zakaz w DF + P0 suite |

### Wpływ na Production

- Możliwa zmiana częstotliwości Autonomous Gate UI.  
- Zero wpływu na Sync Storm heavy loop jeśli OUT przestrzegany.

### Plan testów

| ID | Test | Gate |
|----|------|------|
| E-T1 | Unit: FP parts bez/według macierzy | Must |
| E-T2 | `deriveAutonomousRunRequired` scenariusze stale/fresh | Must |
| E-T3 | Sync Storm P0 suite (guard) | Must |
| E-T4 | Manual OV Autonomous Gate na 1 tenderze | OV |

### Rollback strategy

- Revert FE commit EPIC E.  
- Macierz docs może zostać (dokumentacja).

### Wymagany Design Freeze

**TAK — `WGDOM-HARDENING-01E-DESIGN-FREEZE.md`**

Zawiera obowiązkowo **Fingerprint Field Matrix** (Heavy vs Autonomous vs Gate).

### Definition of Done

- [ ] DF + ARCH · Owner GO  
- [ ] E-T* PASS · OV  
- [ ] Decision Log D-xx jeśli zmienia Autonomous FP policy  
- [ ] CLOSE 01E · P0 suite PASS

---

## Kolejność realizacji (rekomendowana)

```text
1) EPIC A  Persist SSOT (H1+H2)     ← P1 lead
2) EPIC D  Edge Monitoring (M2)      ← równolegle od DF A lub tuż po A
3) EPIC E  Autonomous FP (M3)        ← równolegle do D (ortogonalne)
4) EPIC B  Circuit Breaker (H3)      ← B0 po A; B1 tylko z evidence
5) EPIC C  CORE Sync / N2 (M1)       ← osobny CORE GO · na końcu / niezależny tor Ownera
```

### Uzasadnienie

| Kolejność | Dlaczego |
|-----------|----------|
| **A pierwsze** | Największy residual load (H1) + contract hygiene (H2); **nie** zmienia P0 breaker; ten sam SSOT persist; mobile egress↓; odblokowuje czytelniejszy sygnał dla D/B |
| **D wcześnie** | Niski blast radius; baseline 546 przed/po A; zakaz „fixowania” 546 retryem |
| **E równolegle** | Ortogonalne do persist/breaker; nie blokuje A; chroni przed myleniem z H3 |
| **B po A** | Unika mixed bundle persist+breaker; B0 najpierw (nie ruszać G2); B1 = zmiana kontraktu P0 → najwyższa arch sensitivity |
| **C na końcu / osobny tor** | CORE Edge + Payroll blast; N2 już READY ale wymaga ludzkiego CORE GO; nie mieszać z FEATURE tenders (#CORE-013); D-13 musi zostać |

### Zakazane skróty

- ❌ Jednym commitcie: A + C lub A + B1  
- ❌ `builtAt` → Heavy E-RUN „dla spójności z M3”  
- ❌ Włączenie retry na 546/522  
- ❌ Implementacja bez DF per EPIC  
- ❌ Chunk fat-key w HARDENING-01 (OUT)

### Orkiestracja GO

| EPIC | Owner GO IMPLEMENT | Klasa |
|------|-------------------|--------|
| A | Po DF 01A + ARCH + Boundary | HIGH Tenders / FEATURE-adjacent (jeśli zero `cloud-sync`) |
| B0 | Po DF 01B0 | Tooling / minimal |
| B1 | Po DF 01B1 + **Sync Storm amendment** | CORE-adjacent · człowiek |
| C | Po DF N2/01C | **CORE** · człowiek · Edge |
| D | Po DF 01D | PLATFORM tooling |
| E | Po DF 01E | FEATURE NG-10 |

---

## Definition of Done — cały HARDENING-01

- [ ] EPIC A–E: DF → (IMPLEMENT na GO) → TEST → OV → COMMIT/PUSH na GO → PV → CLOSE **lub** świadomy DEFER z Owner sign-off  
- [ ] Sync Storm P0 suite PASS na tipie po każdym FE release  
- [ ] Final Audit residual H1–H3/M1–M3: status zaktualizowany w `docs/AI/07` + `09`  
- [ ] Decision Log uzupełniony przy zmianach polityki (B1, C attempts, E FP)  
- [ ] Zero naruszenia D-12 / D-13 / #CORE-013

---

## Następny krok procesu

```text
PLAN ✓  →  Owner GO: DESIGN FREEZE EPIC A (01A)
         (równolegle opcjonalnie: DF 01D lekki)
```

**STOP** — brak implementacji do DF + ARCH + Owner GO IMPLEMENT.

---

```text
WGDOM-HARDENING-01 PLAN COMPLETE
```
