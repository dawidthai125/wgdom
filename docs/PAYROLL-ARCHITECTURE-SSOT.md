# PAYROLL ARCHITECTURE SSOT — AI Knowledge & Guardrails

> **ID:** PAYROLL-ARCHITECTURE-SSOT / PAYROLL-AI-GUARD-DOCS-01  
> **STATUS:** **ACTIVE** · **SSOT for AI & humans**  
> **Data:** 2026-08-19 (**PAYROLL-O1 CAS closeout**) · prior 2026-07-24  
> **Production tip:** [`AI/09_PRODUCTION_BASELINE.md`](AI/09_PRODUCTION_BASELINE.md) (SSOT)  
> **AI Entry:** [`AI/AI_ENTRY.md`](AI/AI_ENTRY.md) · Gate [`AI/PAYROLL_SAFETY_GATE.md`](AI/PAYROLL_SAFETY_GATE.md)  
> **Hours-wipe EPIC:** **CLOSED** — [`architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md)  
> **Zakaz:** ten plik **nie** zastępuje Design Freeze; **nie** implementuj Payroll bez Owner GO

```text
════════════════════════════════════════════════════════
LISTA PŁAC = PRIORYTET PRODUKCYJNY #1
Przeczytaj ten dokument PRZED każdą zmianą Payroll / cloud-sync / Edge merge.
════════════════════════════════════════════════════════
```

**Jak używać (Zero Duplicate):**

| Potrzeba | Ten plik | Inny SSOT |
|----------|----------|-----------|
| Pełny przepływ + zakazy + AI checklist | **TU** | — |
| **Entry / Gate / Manual / Indexes** | → | [`AI/AI_ENTRY.md`](AI/AI_ENTRY.md) · [`AI/PAYROLL_SAFETY_GATE.md`](AI/PAYROLL_SAFETY_GATE.md) · [`AI/AI_PAYROLL_SAFETY_MANUAL.md`](AI/AI_PAYROLL_SAFETY_MANUAL.md) · Incident/RCA INDEX |
| **Quick Start / Playbook / Guard Rails / Dependency / Regression** | → | [`AI/PAYROLL_QUICK_START.md`](AI/PAYROLL_QUICK_START.md) · [`AI/PAYROLL_AI_PLAYBOOK.md`](AI/PAYROLL_AI_PLAYBOOK.md) · [`AI/PAYROLL_GUARD_RAILS.md`](AI/PAYROLL_GUARD_RAILS.md) · [`AI/PAYROLL_DEPENDENCY_MAP.md`](AI/PAYROLL_DEPENDENCY_MAP.md) · [`AI/PAYROLL_REGRESSION_HISTORY.md`](AI/PAYROLL_REGRESSION_HISTORY.md) |
| Detale Domain Push / merge / Edge | → | [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |
| PWRB kontrakt I-1…I-4 | → | [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) |
| Hours-wipe D1–D5 design | → | [`architecture/PAYROLL-DESIGN-FREEZE-01.md`](architecture/PAYROLL-DESIGN-FREEZE-01.md) + Amendment |
| Tip produkcji | → | [`AI/09_PRODUCTION_BASELINE.md`](AI/09_PRODUCTION_BASELINE.md) |
| Audyt docs hardening (2026-07-25) | → | [`architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md`](architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md) |
| Audyt docs (poprzedni pass 2026-07-24) | → | [`architecture/PAYROLL-AI-GUARD-DOCS-01-AUDIT.md`](architecture/PAYROLL-AI-GUARD-DOCS-01-AUDIT.md) **SUPERSEDED** |

---

## 1. PAYROLL ARCHITECTURE — przepływ end-to-end

```text
┌─────────────┐
│  UI         │  PayrollView / WeekEmployeeDetail / App handlers
│  Lista Płac │  edycja godzin · add/remove · settled · rollover CTA
└──────┬──────┘
       │ mutacje lokalne (React state + LocalStorage)
       ▼
┌─────────────┐
│  Domain     │  commitLivePayrollRosterEdit · schedulePayrollDomainPush
│  (App/lib)  │  Domain Gate D2 (hours collapse confirm) · Soft Restore overlay D5
└──────┬──────┘
       │
       ├─ skład tygodnia (add/remove/reconcile) ──► PWRB (W1 contract)
       │                                              pwrAdd / pwrRemove / pwrPush
       │
       └─ pola rosteru (godziny/stawka/…) ────────► Domain Push path
                                                      ↓
┌─────────────┐
│  W1         │  PWRB = jedyna mutacja pary
│  Roster     │  kw-week-employees + kw-week-employees-deleted-ids
│  Bundle     │  src/lib/payroll-week-roster-bundle.ts
└──────┬──────┘
       ▼
┌─────────────┐
│  W2         │  pushWeekEmployeesToCloud / replaceWeekEmployeesKeys
│  Cloud write│  + Payroll Guard (shrink) · intentionalHoursClear (D3)
│  path       │  Domain Push = sole hours write to Cloud (D6)
└──────┬──────┘
       ▼
┌─────────────┐
│  Cloud Sync │  finalizePayrollBundleMerge · mergeWeekEmployees*
│  (pull)     │  tombstones · richness · settled LWW
│             │  Bootstrap: applyBootstrapPayrollMerge + resurrection fence
└──────┬──────┘
       ▼
┌─────────────┐
│  Edge KV    │  batch-get / batch-set · mergeWeekEmployeesUnion
│  SSOT store │  shrink/expansion guards · kv.mset
└─────────────┘
```

### Warstwy (słownik)

| Warstwa | Znaczenie | Pliki kluczowe |
|---------|-----------|----------------|
| **UI** | Widok Admin Lista Płac | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` |
| **Domain** | Orkiestracja w App + domain sync | `App.tsx` handlers, `payroll-domain-sync.ts` |
| **W1** | Kontrakt składu tygodnia (PWRB) | `payroll-week-roster-bundle.ts` |
| **W2** | Kontrakt zapisu godzin/roster do Cloud | `cloud-sync.ts` (`pushWeekEmployeesToCloud`, guards) |
| **Cloud Sync** | Merge bootstrap + runtime pull | `cloud-sync.ts`, `CloudLoader.tsx` |
| **Domain Push** | Push pól LP poza pełnym RS (#CORE-015) | `payroll-domain-sync.ts` → `pwrPush` |
| **SSOT** | Jedna reguła na domenę — nie duplikować merge/write | ten dokument + Agent Guide + DF |

### Hours-wipe protections (ACTIVE @ 2.65.41–43)

| Stage | Co | Lib / zachowanie |
|-------|-----|------------------|
| **D1** | Passive write-path telemetry | `payroll-write-path-telemetry.ts` · ring `payroll.write_path` |
| **D2** | Domain Gate + UI confirm przy hours collapse | `payroll-hours-collapse-gate.ts` |
| **D3** | `skipPayrollGuard` **tylko** gdy `intentionalHoursClear === true` | options na push |
| **D4** | Recovery Banner z `kw-week-employees-prev` (≠ archive RB) | `payroll-prev-recovery.ts` |
| **D5** | Soft Restore overlay; `weekEmployeeFromDir` **PURE** | `payroll-soft-restore.ts` |
| **D6** | Domain Push = jedyne źródło zapisu godzin | constraint — nie reintroducuj LP do RS push |

### Klucze KV (skrót)

| Key | Rola |
|-----|------|
| `kw-week-employees` | Live roster tygodnia |
| `kw-week-employees-deleted-ids` | Tombstony składu (para PWRB) |
| `kw-week-employees-prev` | Snapshot poprzedni — D4 recovery |
| `kw-weekFrom` / `kw-weekTo` | Zakres tygodnia |
| `kw-archive` | Archiwum tygodni |
| `kw-directory` | Katalog pracowników (źródło add) |

---

## 2. CRITICAL INVARIANTS

**Nigdy nie łam bez nowego Design Freeze + Architecture Review + Owner GO.**

| ID | Invariant | Dlaczego |
|----|-----------|----------|
| **I-PURE** | `weekEmployeeFromDir` jest **PURE** — zero side-effects, zero Soft Restore w factory | Soft Restore = **overlay** przed Domain Push (C5) |
| **I-DP** | **Domain Push** jest jedynym write path godzin live do Cloud | RS push **bez** `kw-week-employees` (S1-1 / #CORE-015) |
| **I-SSOT** | Jedna reguła merge / jedna facade PWRB / jeden Domain Push | Duplicate logic = wipe / resurrection |
| **I-NO-BYPASS** | Brak „szybkiego” `batch-set` / bezpośredniego Edge write z UI | Omija guardy, fence, gate |
| **I-MERGE** | Cloud merge: UNION + tombstones + settled LWW + intentional empty | Zmiana semantyki = multi-device chaos |
| **I-W1** | Mutacje składu tygodnia **tylko** PWRB | Poza PWRB = drift tombstone/roster |
| **I-W2** | Push godzin przez `pushWeekEmployeesToCloud` + guardy | Shrink bez ACK = Hours Wipe klasa |
| **I-GATE** | Hours collapse → Domain Gate (D2) przed Cloud write | Cancel = brak Cloud write |
| **I-FLAG** | `skipPayrollGuard` ⇔ `intentionalHoursClear === true` | **≠** `isIntentionalPayrollWeekClear` (empty week after archive) |
| **I-FENCE** | Resurrection fence na bootstrap **ACTIVE** | Pusta chmura ≠ reseed ze starego LS |
| **I-ROLL** | `classifyPayrollWeekTransition`: ALIGN ≠ wipe; ROLLOVER = archive+clear | Cofnięcie = klon godzin między tygodniami |
| **I-BANNER** | D4 `-prev` banner **≠** archive Restore Banner | Osobne predykaty — nie łączyć |
| **I-CORE013** | Zero mixed FEATURE + Payroll/cloud-sync/Edge w jednym commit | Historia regresji FEATURE→LP |

---

## 3. PAYROLL SAFETY RULES — NIE WOLNO

```text
1. NIGDY nie pisać bezpośrednio do Cloud / Edge z UI (omijając Domain Push / PWRB).
2. NIGDY nie omijać Domain Push dla godzin live.
3. NIGDY nie używać skipPayrollGuard poza intentionalHoursClear === true.
4. NIGDY nie mylić intentionalHoursClear z isIntentionalPayrollWeekClear.
5. NIGDY nie modyfikować weekEmployeeFromDir (musi zostać PURE).
6. NIGDY nie dodawać nowego write path bez Architecture Review + Owner GO.
7. NIGDY nie mutować składu tygodnia poza PWRB.
8. NIGDY nie usuwać / omijać resurrection fence.
9. NIGDY nie cofać classifyPayrollWeekTransition (ALIGN vs ROLLOVER).
10. NIGDY nie przywracać kw-week-employees do RS push (runCloudSync).
11. NIGDY nie łączyć D4 -prev banner z archive shouldShowPayrollRestoreBanner.
12. NIGDY nie „naprawiać” mergeWeekEmployees „dla wygody” w FEATURE.
13. NIGDY nie startować nowego Payroll EPIC bez Owner GO (Stabilization Window).
14. NIGDY nie mieszać CI Gate B (TEUX/guard CI) z logiką Hours-wipe — osobny EPIC.
15. NIGDY nie implementować na skróty: AUDIT → DF → ARCH → GO → IMPLEMENT.
```

---

## 4. AI GUARDRAILS — dla ChatGPT / Cursor Agent

### 4.1 Przed KAŻDĄ zmianą Payroll (obowiązkowy AUDIT)

```text
□ Przeczytaj ten SSOT (§1–3) + AI/08_AI_GUARDRAILS.md
□ Przeczytaj AI/09_PRODUCTION_BASELINE.md (tip 2.65.43 / ea1b0a6)
□ Sprawdź W1: czy zmiana dotyka składu? → tylko PWRB
□ Sprawdź W2: czy zmiana zapisuje godziny? → Domain Push + guard + intentionalHoursClear
□ Sprawdź Domain Push: czy nie dodajesz równoległego push?
□ Sprawdź Cloud Sync: czy nie zmieniasz finalizePayrollBundleMerge / merge bez DF?
□ Sprawdź SSOT: czy nie duplikujesz reguły już istniejącej?
□ Sprawdź Soft Restore / weekEmployeeFromDir: PURE?
□ Sprawdź Resurrection fence + rollover classifier: nie ruszasz?
□ Owner GO / IMPLEMENT wypowiedziane? Jeśli NIE → STOP
□ Zakaz implementacji „na skróty” / temporary HACK w CORE
```

Bez pełnej checklisty → **nie koduj**.

### 4.2 Co czytać w jakiej kolejności (Payroll task)

```text
0. docs/AI/AI_MEMORY.md + AI_DECISION_TREE.md
0b. docs/AI/PAYROLL_QUICK_START.md
1. docs/AI/PAYROLL_GUARD_RAILS.md + docs/AI/08_AI_GUARDRAILS.md
2. docs/AI/PAYROLL_DEPENDENCY_MAP.md
3. docs/AI/PAYROLL_REGRESSION_HISTORY.md
4. docs/AI/PAYROLL_AI_PLAYBOOK.md
5. docs/PAYROLL-ARCHITECTURE-SSOT.md          ← TEN plik
6. docs/AI/09_PRODUCTION_BASELINE.md
7. docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md
8. docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md   (jeśli W1/PWRB)
9. docs/architecture/PAYROLL-DESIGN-FREEZE-01.md   (jeśli Hours-wipe / gate)
10. docs/architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md
11. CURRENT-TASK.md
```

### 4.3 Zakaz typowych „skrótów” AI

| Skrót (ZAKAZ) | Zrób zamiast tego |
|---------------|-------------------|
| „Dodam fetch do Edge w PayrollView” | Domain Push / persistKey |
| „Ustawię skipPayrollGuard: true zawsze” | Tylko po D2 OK + intentionalHoursClear |
| „Wrzucę Soft Restore do weekEmployeeFromDir” | Overlay w add path (D5) |
| „Szybki fix merge w FEATURE commit” | Osobny CORE + DF + GO |
| „Usunę fence — przeszkadza seedowi” | Fence zostaje; ops/recovery osobno |
| „Przywrócę payroll do runCloudSync” | Łamie #CORE-015 |

### 4.4 Testy minimalne przy CORE Payroll

| Obszar | Skrypt / gate |
|--------|----------------|
| Domain Push S2 | `test-sync-arch-01-s2-domain-push-cross-device.mjs` |
| RS bez payroll | `test-sync-arch-01-s1-rs-no-payroll-push.mjs` |
| Hours gate D2/D3 | `test-payroll-hours-collapse-gate-d2-d3.mjs` |
| D4/D5 | `test-payroll-prev-recovery-soft-restore-d4-d5.mjs` |
| Telemetry D1 | `test-payroll-write-path-telemetry-d1.mjs` |
| Gate B | `npm run test:infra -- --gate B --scope payroll` |

---

## 5. KNOWN INCIDENTS — Hours Wipe (klasa)

### 5.1 Hours Wipe ~24.07 (INCIDENT-01) — **CLOSED**

| | |
|--|--|
| **Objaw** | Bieżący tydzień — godziny wyzerowane / partial wipe |
| **Dlaczego trudny** | Write path rozproszony (UI → debounce → PWRB → Cloud); shrink guard (>50%) **nie** chroni partial wipe; brak ACK; brak UX `-prev` / Soft Restore |
| **Root cause (klasa)** | Hours collapse na Domain Push bez świadomego `intentionalHoursClear` + brak recovery UX |
| **Rozwiązanie** | D1 telemetry · D2 Domain Gate · D3 flag ⇔ skip · D4 `-prev` banner · D5 Soft Restore overlay · D6 Domain Push SSOT |
| **Tip** | **2.65.43 / `ea1b0a6`** |
| **SSOT** | [`architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) · [`AI/04_INCIDENTS_HISTORY.md`](AI/04_INCIDENTS_HISTORY.md) §1b |

### 5.2 Jak rozpoznać podobny problem

```text
Sygnały:
  • Live hours ≪ poprzedni tydzień / -prev bez intencji użytkownika
  • Cloud write po edycji bez dialogu confirm (gdy powinien być gate)
  • skipPayrollGuard w logach bez intentionalHoursClear
  • Nowy write path omijający payroll-domain-sync / PWRB
  • weekEmployeeFromDir z side-effectami

Akcja:
  1. AUDIT ONLY — włącz wg-payroll-trace / write_path ring (D1)
  2. NIE „hotfix merge”
  3. RCA → DF → ARCH → Owner GO
```

### 5.3 Inne CLOSED (kontekst — nie reimplementuj)

| Incident / program | Lekcja | Tip |
|--------------------|--------|-----|
| Resurrection / bootstrap fence | Pusta chmura ≠ bogaty LS | 2.65.35 |
| Week rollover ALIGN vs wipe | ALIGN ≠ clear roster | 2.65.34 |
| Cross-device Domain Push S2 | LP poza RS push | 2.63.85 |
| Guard / B4 merge / PWRB | UNION + tombstones + PWRB | 2.63.x |
| **PAYROLL-O1 CAS** | Edge revision gate + FE O2 contract; legacy write rejected | **2.66.103** FE / **`b35fd814`** Edge |

---

## 5A. PAYROLL-O1 — CAS end-to-end (**CLOSED** · 2026-08-19)

**Status:** **PAYROLL-O1 = CLOSED** · **FE O2** + **Edge O1** + **CAS end-to-end** = **PRODUCTION VERIFIED** · **O1-A…O1-E = PASS** · **nie** powtarzać O1 implement/deploy/testów bez Owner GO.

### Production baseline

| Warstwa | Wartość |
|---------|---------|
| **URL** | https://www.wgdom.fun |
| **FE (O2 CAS-ready client)** | UI **2.66.103** · commit **`d2b71fb`** |
| **Edge (O1 CAS gate)** | commit **`b35fd8140bc82d1e13b48a143368bd19823b93c9`** |
| **Function** | `make-server-0afb8820` |
| **Edge deploy** | GitHub Actions workflow run **#32243480746** · **SUCCESS** |

### CAS architecture — FE O2

| Element | Rola |
|---------|------|
| `payrollWeekCas` | Flaga kontraktu CAS na `batch-set` payroll |
| `expectedRevision` | Wersja oczekiwana przed zapisem rosteru |
| `kw-payroll-week-meta` | KV meta: `rosterRevision`, week scope |
| `pwrPush` | Jedyna ścieżka mutacji pary roster + meta (PWRB) |
| Stale revision handling | `PayrollStaleRevisionError` → rebase → retry |
| `rebasePayrollRosterIntent` | Reconcile intent godzin/stawki/settled po 409 |
| `rebasePayrollExtraCostsIntent` | Reconcile intent extraCosts-only po 409 |

Pliki: `src/lib/payroll-week-meta.ts`, `src/lib/payroll-record-merge.ts`, `src/lib/payroll-rebase-intent.ts`, `src/lib/cloud-sync.ts` (`pushWeekEmployeesToCloud`), `src/lib/payroll-week-roster-bundle.ts` (`pwrPush`).

### CAS architecture — Edge O1

| Element | Rola |
|---------|------|
| CAS gate w `batch-set` | Aktywny gdy `payrollWeekCas=true` na żądaniu payroll |
| `expectedRevision` validation | Match → accept; mismatch → **409** |
| `rosterRevision` | Inkrement **tylko** po accepted CAS write |
| `stale_revision` | HTTP **409** · **zero write** · **zero increment** |
| `legacy_client_rejected` | Non-CAS / legacy payroll roster write → HTTP **409** · **zero write** |
| Canonical roster w 409 | Body zawiera `serverRevision` + canonical `roster` |
| `requestId` | Korelacja diagnostyczna w odpowiedzi 409/200 |
| `payrollWeekMeta` w 200 | Success response zwraca zaktualizowane meta |

Plik: `supabase/functions/make-server-0afb8820/index.tsx`.

### Test evidence (production)

| Test | Wynik | Skrót |
|------|-------|-------|
| **O1-A** | **PASS** | Happy path CAS write **200**; `rosterRevision` increment (np. 0→1) |
| **O1-B** | **PASS** | Stale `expectedRevision` → **409** `stale_revision`; **zero write**; **zero increment** |
| **O1-C** | **PASS** | **409** → FE rebase/retry → **200**; intent edycji zachowany |
| **O1-D** | **PASS** | extraCosts-only; godziny/stawka/settled **bez zmian**; rev +1 |
| **O1-E** | **PASS** | Admin CAS write **200** + izolowany stale gate **409** |

### Legacy payroll state (potwierdzone prod)

- **Stary/non-CAS payroll client** **nie może** wykonywać roster write — Edge O1 → **409** `legacy_client_rejected`.
- **FE O2** używa kontraktu CAS (`payrollWeekCas` + `expectedRevision` + meta).
- **Worker O2** nie wykonuje starego payroll roster write przez legacy path (extraCosts → `pwrPush`).

### FUTURE HARDENING / OBSERVATION (nie blokuje O1 closeout)

Bootstrap/reload może wygenerować **dodatkowy** CAS `batch-set` poza bezpośrednim oknem edycji UI. Zaobserwowano revision increment **8→9** w O1-E między reload a stale probe. **Stan:** O1 gate PASS · stale gate PASS · brak dowodu na korupcję danych · **nie** implementować hardeningu bez Owner GO + AUDIT.

### Agent continuity

1. **PAYROLL-O1 = CLOSED** — nie wykonywać ponownie O1.
2. Nie zmieniać lokalnego WIP poza dokumentacją closeout.
3. Bootstrap/reload observation = osobny backlog hardeningu.
4. Następny krok **≠** O1 implementation/deploy.

Szczegóły sync/merge: [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) §4.4a.

---

## 6. Mapa dokumentów (gdzie szukać)

| Temat | Dokument |
|-------|----------|
| **Ten SSOT** | `docs/PAYROLL-ARCHITECTURE-SSOT.md` |
| Sync/merge głęboko | `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` |
| **PAYROLL-O1 CAS (CLOSED)** | **Ten plik §5A** · Edge/FE baseline powyżej |
| Hours-wipe closeout | `architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md` |
| DF D1–D5 | `architecture/PAYROLL-DESIGN-FREEZE-01.md` |
| Release history | `releases/PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md` |
| PWRB | `recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md` |
| AI tip | `AI/09_PRODUCTION_BASELINE.md` |
| AI zakazy globalne | `AI/08_AI_GUARDRAILS.md` |
| Docs audit hardening | `architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md` |
| Quick Start / Playbook / Guard / Deps / Regression | `AI/PAYROLL_*.md` |
| Docs audit (2026-07-24) | `architecture/PAYROLL-AI-GUARD-DOCS-01-AUDIT.md` **SUPERSEDED** |

**Historyczne** (`docs/PAYROLL-*` Etap 2, recovery RC-B, session handoffs): czytaj tylko gdy RCA wymaga; **nie** traktuj nagłówków „PENDING” jako otwartego EPIC jeśli closeout mówi CLOSED.

---

## 7. Owner Readiness (docs)

```text
Nowy Agent / ChatGPT od pierwszej wiadomości:
  ✓ wie jak działa przepływ UI→…→SSOT
  ✓ zna CRITICAL INVARIANTS
  ✓ zna listę NIE WOLNO
  ✓ ma checklistę AUDIT przed kodem
  ✓ zna Hours Wipe i jak rozpoznawać regresję
  ✓ wie gdzie jest tip 2.65.43 / ea1b0a6

Nowe prace Payroll: tylko po Owner GO · Stabilization Window ACTIVE
```
