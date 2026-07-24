# PAYROLL-RCA-01 — ROOT CAUSE & DESIGN PLAN

> **ID:** PAYROLL-RCA-01  
> **STATUS:** **CLOSED** · RCA + PLAN COMPLETE · **P0** · **EPIC CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **Owner GO:** RCA + PLAN ONLY  
> **Data:** 2026-07-24  
> **Łańcuch:** INCIDENT-01/02 · FORENSICS-01 · REGRESSION-01 · RUNTIME-01 · REPRO-01  
> **Poza zakresem (historyczne):** implementacja · Design Freeze (osobny GO) · commit · push — **DF + D1–D5 DELIVERED**  

```text
════════════════════════════════════════════════════════
PAYROLL-RCA-01 — FINAL

RC class: INTENTIONAL DOMAIN WRITE of inactive/defaultDay days
          via existing Admin LP path (W1 and/or W2)
          → pwrPush / domain push (skipPayrollGuard)
          → Cloud SSOT batch-set

NOT: code regression Mon–Fri · CORS/Edge · autosync-alone · Odśwież skład

Exact click 24.07 (W1 vs W2): OPEN (MEDIUM)
Mechanism confidence: HIGH
════════════════════════════════════════════════════════
```

---

## 1. Final RCA

### 1.1 Co zostało udowodnione

| # | Fakt | Źródło |
|---|------|--------|
| P1 | Live Cloud zawierał chwilowo `active:false` + `07:00–16:00` + **0h** dla Piotra (± Tomka) | INCIDENT-01 KV |
| P2 | `dataUpdatedAt ≈ 2026-07-24T09:29:17.795Z` (~11:29 CEST) — był **write** do SSOT | INCIDENT-01 |
| P3 | Archive poprzedniego tygodnia (45h Piotra) **nienaruszone** — nie full wipe tygodnia/historii | INCIDENT-01 |
| P4 | 12/14 osób z godzinami → partial roster, nie „Odśwież skład” / clear-all / empty rollover | INCIDENT-01 · RUNTIME |
| P5 | CORS / Edge **nie** są RC (Cloud przyjął poprawny technicznie payload) | INCIDENT-02 |
| P6 | Dominujący funnel: Admin mutacja → `pwrPush` / `schedulePayrollDomainPush` → `batch-set` + `replaceWeekEmployeesKeys` | FORENSICS |
| P7 | Domain push używa **`skipPayrollGuard: true`** — shrink guard **nie** chroni W1/W2 | FORENSICS |
| P8 | W1/W2/W10 **bloby identyczne** vs 2.65.35 — **brak regresji kodu** w oknie Pon–Pt | REGRESSION |
| P9 | F5 / RS autosync **same** nie wypychają payroll hours (S1-1) | FORENSICS · RUNTIME |
| P10 | Class repro: **W1 PASS** i **W2 PASS** — payload ≡ INCIDENT-01 | REPRO |
| P11 | W10 **nie** generuje `day.active=false` (tylko extraCosts) | RUNTIME · REPRO |
| P12 | Godziny „wróciły” ⇒ **drugi** write (re-edit / restore), nie magiczny rollback Edge | RUNTIME |

### 1.2 Co zostało wykluczone

| # | Hipoteza | Werdykt |
|---|----------|---------|
| X1 | CORS / preflight / `mber-*` | **WYKLUCZONE** |
| X2 | Edge „psuje” godziny bez klienta | **WYKLUCZONE** (przyjął payload) |
| X3 | Regresja kodu W1/W2/W10 w 2.65.38–40 | **WYKLUCZONE** |
| X4 | Sam F5 / focus / RS autosync jako generator 0h | **WYKLUCZONE** |
| X5 | „Odśwież skład” (replace all `defaultDays`) | **WYKLUCZONE** (wyzerowałby wszystkich) |
| X6 | Clear-all / rollover empty live | **WYKLUCZONE** (count 14 ≠ `[]`) |
| X7 | W10 jako generator fingerprintu days | **WYKLUCZONE** (jako primary) |
| X8 | Docs tip `fcf66b0` jako przyczyna | **WYKLUCZONE** |

### 1.3 Co pozostaje niewiadome

| # | Niewiadoma | Dlaczego otwarte |
|---|------------|------------------|
| U1 | **W1 vs W2** dokładnie 24.07 | Brak morning UUID / UI log / HAR @09:29Z |
| U2 | Świadomy vs przypadkowy operator | Brak timeline operatora 11:25–11:35 |
| U3 | Czy Tomek ten sam stamp co Piotrek | Nie porównano w tej sesji po recovery |
| U4 | Live E2E dual-client | H3-A RO — świadomie nie odpalone na prod SSOT |
| U5 | Źródło recovery „powrotu godzin” | Drugi write — kto/co nieudokumentowane |

### 1.4 Poziom pewności W1 / W2

| Ścieżka | Mechanizm (może zrobić incydent) | Była przyczyną 24.07 | Repro class |
|---------|----------------------------------|---------------------|-------------|
| **W1** checkbox / day edit → domain push | **VERY HIGH** | **HIGH** (same UUID możliwy; najłatwiejsza) | **PASS** |
| **W2** remove+re-add → `weekEmployeeFromDir` | **VERY HIGH** | **HIGH** (exact `defaultDay`; nowy UUID) | **PASS** |
| W1 **lub** W2 (klasa RC) | **VERY HIGH** | **VERY HIGH** | — |
| Rozstrzygnięcie W1 **xor** W2 | — | **MEDIUM** (OPEN) | — |

**Root Cause (final working statement):**

```text
System poprawnie zsynchronizował do Cloud stan, w którym
wybrane osoby miały days = inactive / defaultDay (0h).

Ten stan powstał lokalnie na Admin Lista Płac ścieżką W1 i/lub W2
(istniejącą od SYNC-ARCH-01 S2 / add-from-directory),
został wypchnięty domain pushem z skipPayrollGuard,
i stał się SSOT — stąd wszystkie urządzenia zobaczyły 0h.

To nie jest bug „znikania godzin bez zapisu”.
To jest brak ochrony przed wypchnięciem destrukcyjnego,
ale technicznie legalnego, payloadu godzin.
```

---

## 2. Evidence Matrix

| Evidence | W1 | W2 | Regresja | CORS | Autosync |
|----------|----|----|----------|------|----------|
| Cloud inactive + 07–16 | ✓ | ✓ | — | — | — |
| Partial 2/14 | ✓ | ✓ | — | — | — |
| Same emp id (jeśli morning=post) | ✓ | ✗ | — | — | — |
| New emp id | ✗ | ✓ | — | — | — |
| Exact `weekEmployeeFromDir` | ~ | ✓ | — | — | — |
| Blob identity Mon→Fri | — | — | wyklucza | — | — |
| Class repro PASS | ✓ | ✓ | — | — | — |
| skipPayrollGuard on push | ✓ | ✓ | — | — | — |

---

## 3. Root Cause Confidence

| Warstwa | Confidence |
|---------|------------|
| **Mechanism RC** (domain write inactive days) | **HIGH → VERY HIGH** |
| **Path class** (W1 ∨ W2) | **VERY HIGH** |
| **Exact path** (W1 xor W2) | **MEDIUM** |
| **Operator intent** | **LOW–MEDIUM** |
| **Code regression** | **NONE** (wykluczone) |

---

## 4. Design Options (warstwy ochrony)

Ocena: **Skuteczność** · **Ryzyko** · **UX** · **SSOT** · **Sync**  
Skala: H / M / L · wpływ UX: friction ↑ / neutral / better

### D1 — Confirmation UX (mass hour loss / re-add)

| | |
|--|--|
| Idea | Confirm gdy emp traci wszystkie activeDays lub remove+re-add; osobny dialog przy „zeruj tydzień osoby” |
| Skuteczność | **H** vs przypadkowe W1; **M** vs świadome |
| Ryzyko | **L** (false confirm fatigue) |
| UX | friction ↑ (akceptowalne na destrukcji) |
| SSOT | **OK** — nie zmienia modelu |
| Sync | **OK** — push po potwierdzeniu |

### D2 — Guard przed zapisem (nie `skipPayrollGuard` w ciemno)

| | |
|--|--|
| Idea | Domain push: jeśli richness/hours **spada** względem last-acked Cloud/local snapshot → block lub require `confirmToken` / `intentionalClear` |
| Skuteczność | **H** |
| Ryzyko | **M** — może blokować legalne wyzerowanie (PR-PAY-S3); trzeba escape hatch |
| UX | friction ↑ tylko przy shrink |
| SSOT | **OK** jeśli Cloud nadal SSOT po świadomym push |
| Sync | **M** — trzeba spójności z `skipPayrollGuard` dziś używanym wszędzie w W1/W2 |

### D3 — Sanity validation (per-employee)

| | |
|--|--|
| Idea | Przed `pwrPush`: flaga `suspiciousClear` gdy `(prevHours≥X ∧ nextHours==0 ∧ days≡defaultDay)` |
| Skuteczność | **H** na fingerprint INCIDENT-01 |
| Ryzyko | **L–M** (false positive przy nowym emp W2 — nowy emp **jest** defaultDay: nie porównywać do „prev hours” jeśli CREATED) |
| UX | toast / confirm |
| SSOT | **OK** |
| Sync | **OK** |

### D4 — Payload validation (batch-set client)

| | |
|--|--|
| Idea | Odrzuć/ostrzeż gdy roster partial-collapse (2 emp 0h, reszta bogata) bez `force` |
| Skuteczność | **M–H** |
| Ryzyko | **M** — reguły heurystyczne |
| UX | rare friction |
| SSOT | **OK** z force flag |
| Sync | **OK** |

### D5 — Domain invariant

| | |
|--|--|
| Idea | Invariant: `weekEmployeeFromDir` może tworzyć 0h, ale **re-add po remove** z bogatym prev w tej samej sesji wymaga confirm; albo soft-copy hours z tombstone/prev |
| Skuteczność | **H** vs W2 accidental |
| Ryzyko | **M** — zmiana semantyki add |
| UX | friction ↑ na re-add |
| SSOT | **OK** jeśli świadome |
| Sync | **OK** |

### D6 — Soft-delete / retain hours on re-add

| | |
|--|--|
| Idea | Remove nie kasuje godzin od razu — tombstone z snapshotem days; re-add przywraca hours jeśli ten sam `directoryId` w oknie N min |
| Skuteczność | **H** vs W2 |
| Ryzyko | **M** — złożoność merge/tombstone (już jest S2 tombstone — rozszerzenie) |
| UX | better (mniej utraty danych) |
| SSOT | **M** — trzeba jasnych reguł LWW |
| Sync | **M** — interakcja z deleted-ids |

### D7 — Recovery path

| | |
|--|--|
| Idea | One-click restore z `kw-week-employees-prev` / Edge backup slot **sprzed** wipe; banner gdy richness spadł vs prev |
| Skuteczność | **H** na MTTRrecovery (nie prewencja) |
| Ryzyko | **L** jeśli read-only offer |
| UX | better po incydencie |
| SSOT | **OK** — restore = świadomy push |
| Sync | **OK** |

### D8 — Telemetry (write trace opt-in / sample)

| | |
|--|--|
| Idea | Zawsze logować (ring/local) `sourceFunction`, empId, hoursBefore/After, skipGuard, bez PII zbędnego; prod sample lub flag (dziś default OFF po 23.07) |
| Skuteczność | **H** na forensics; **L** na prewencję |
| Ryzyko | **L** (perf/privacy) |
| UX | neutral |
| SSOT | **OK** |
| Sync | **OK** |

### D9 — Audit log (immutable event)

| | |
|--|--|
| Idea | Append-only event: `payroll.hours.cleared` / `payroll.roster.readd` z actor + stamp |
| Skuteczność | **H** forensics; **L** prewencja |
| Ryzyko | **M** — storage/KV policy |
| UX | neutral |
| SSOT | **OK** (osobny klucz) |
| Sync | **L–M** — nie mieszać z roster merge |

---

## 5. Recommended Design

### Zasada

```text
Nie wyłączać domain push (SSOT SYNC-ARCH-01 zostaje).
Nie przywracać payroll do RS full-bundle.
Chronić przed NIEŚWIADOMYM shrink godzin;
świadome wyzerowanie musi być możliwe (PR-PAY-S3) z potwierdzeniem.
```

### Pakiet rekomendowany (kolejność implementacji po DF)

| Faza | ID | Zakres | Priorytet |
|------|-----|--------|-----------|
| **P0a** | **D8** Telemetry minimal | `source` + hours delta + path W1/W2 na każdy domain push (diag ring; default bezpieczny) | P0 |
| **P0b** | **D3 + D1** | Sanity: emp `hours→0` z `prevHours>0` **lub** days≡defaultDay po edycji → **confirm** zanim `schedulePayrollDomainPush` / przed `pwrPush` W2 re-add | P0 |
| **P0c** | **D2** scoped | `skipPayrollGuard` tylko z `intentionalClear` po confirm; inaczej guard shrink aktywny także na domain push | P0 |
| **P1** | **D7** | Banner restore z `-prev` gdy live richness ≪ prev dla tych samych directoryId | P1 |
| **P1** | **D5/D6** | Re-add: offer przywróć godziny z tombstone/prev (nie cichy `defaultDays` wipe wiedzy) | P1 |
| **P2** | **D9** | Audit log KV (opcjonalnie) | P2 |
| **DEFER** | **D4** heuristic partial-roster | Dopiero po false-positive review P0 | DEFER |

### Recommended Design (Owner card)

```text
1) Confirm + sanity na transition hours>0 → 0 / defaultDay (W1)
2) Confirm + optional hours restore na remove→re-add (W2)
3) Domain push: skipPayrollGuard tylko po intentional flag
4) Telemetry write-path (forensics next time)
5) Recovery banner z -prev (MTTR)
```

**Poza pakietem:** zmiana Edge CORS, revert 2.65.38–40, wyłączenie domain push, H3-B na live `dir-1`.

---

## 6. Risks

| Ryzyko | Mitigacja |
|--------|-----------|
| Confirm męczy przy legalnym clear (PR-PAY-S3) | Confirm tylko przy `prevHours≥threshold` (np. ≥4h) lub ≥2 activeDays |
| Guard blokuje świadomy sync | `intentionalClear` + Owner/admin ack w dialogu |
| False positive na **nowym** W2 add | Sanity **nie** odpala na `subjectState=CREATED` bez prev hours |
| Konflikt z resurrection fence | Nie ruszać fence; ochrona tylko outbound domain push hours-collapse |
| Telemetry default ON → hałas (Incident 23.07) | Ring lokalny zawsze; console/remote opt-in |
| Soft-restore re-add psuje tombstone semantics | DF osobny na D6; nie mieszać z P0a–c |

---

## 7. Migration Strategy

```text
M0  Owner ACK Recommended Design → DESIGN FREEZE (osobny GO)
M1  P0a telemetry (zero semantyki hours) → tip docs/tooling lub mały UI bump
M2  P0b confirm/sanity (UI + flag intentionalClear) → changelog patch
M3  P0c skipPayrollGuard scoped → testy guard + PR-PAY-S3 regression
M4  P1 recovery banner + re-add offer
M5  Class regression test (REPRO automat) w gate B — bez prod write
M6  Stabilization window observe 48–72h Lista Płac
```

**Rollback:** flagi feature (`payrollHoursCollapseConfirm`, `payrollDomainPushGuardStrict`) default ON po DF; kill-switch OFF bez revert Edge.

**Testy obowiązkowe przed PV:**  
PR-PAY-S3 zero-hours · add-from-directory · domain push still SSOT · class fingerprint W1/W2 · guard nie blokuje intentional.

---

## 8. Owner Readiness

```text
OWNER READINESS: RCA + PLAN COMPLETE

Next (Owner GO only):
  A) ACK Recommended Design → PAYROLL-DF-01 Design Freeze
  B) Request more evidence (UUID/operator) before DF — optional
  C) DEFER protection — accept residual risk (not recommended P0)

Forbidden this step: implement · commit · push
```

---

## 9. Raport końcowy (Owner card)

1. **Final RCA** — legal domain write inactive/defaultDay via W1∨W2 → Cloud SSOT  
2. **Evidence Matrix** — §2  
3. **Confidence** — mechanism **HIGH/VERY HIGH**; W1 xor W2 **MEDIUM**  
4. **Design Options** — D1–D9 ocenione  
5. **Recommended** — D8 → D3+D1 → D2 → D7 → D5/D6  
6. **Risks** — §6  
7. **Migration** — M0–M6 + flags  
8. **Owner Readiness** — **CLOSED** · DF + D1–D5 DELIVERED · EPIC CLOSE [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md)  

**BEZ IMPLEMENTACJI · BEZ COMMIT · BEZ PUSH**
