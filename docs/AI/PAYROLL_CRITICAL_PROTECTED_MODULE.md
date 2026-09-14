# PAYROLL — CRITICAL PROTECTED MODULE

> **STATUS:** **ACTIVE** · **SSOT dokumentacyjny ochrony + CURRENT HARDENED BASELINE**  
> **Aktualizacja:** 2026-09-14 · **PAYROLL GREEN / HARDENED / CLOSED** @ prod **2.66.220** / **`73aededf`**  
> **Zakaz:** ten plik **nie** zmienia kodu · **nie** zastępuje Design Freeze · **nie** uprawnia do IMPLEMENT  
> **AI Entry:** [`AI_ENTRY.md`](AI_ENTRY.md) → Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) → Never Break [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md) → Architecture SSOT [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md)  
> **Operacje sync:** [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)  
> **Granica CORE:** [`../architecture/CORE-PROTECTED-ARCHITECTURE.md`](../architecture/CORE-PROTECTED-ARCHITECTURE.md)  
> **Tip numeryczny / live:** [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) + `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
LISTA PŁAC / PAYROLL = KLUCZOWY I KRYTYCZNY MODUŁ WGDOM
= CRITICAL PROTECTED CORE (wgdom.fun)
Przypadkowe uszkodzenie Payroll podczas FEATURE / IK = NIEDOPUSZCZALNE.
CURRENT STATUS = GREEN / HARDENED / CLOSED (2.66.220 / 73aededf)
════════════════════════════════════════════════════════
```

---

## 1. Dlaczego Protected

Payroll / Lista Płac jest **krytycznym modułem biznesowym** produkcji WGDOM (`wgdom.fun`).

Payroll to **nie tylko** UI Listy Płac. Obejmuje również:

| Obszar | Przykłady |
|--------|-----------|
| Roster / tydzień | `kw-week-employees`, weekFrom/weekTo, archive, rollover |
| PWRB | `payroll-week-roster-bundle.ts` (`pwrPush` / `pwrAdd` / `pwrRemove`) |
| Storage | LocalStorage + Cloud/KV |
| Sync | Domain Push, freshness, merge, rebase |
| Clocks / LWW | `dataUpdatedAt`, `settledUpdatedAt`, settlement LWW |
| Tombstones | `kw-week-employees-deleted-ids`, revocation |
| CAS | `payrollWeekCas`, `expectedRevision` / `rosterRevision` |
| Guard / FIFO | `CloudSyncMutationGuard`, `enqueueKwWeekEmployeesWrite` |
| Settlement | `settled`, `payrollSettlement`, unsettle, GO4 ACK |
| Anti-regresja | anti-rollback, resurrection fence, shrink / hours-down guards |
| Multi-device | desktop ↔ mobile ↔ karty ↔ sesje |

Zmiana któregokolwiek z tych elementów może spowodować:

- utratę pracownika / godzin / settlementu,
- odtworzenie starego rosteru (resurrection),
- nadpisanie nowszych danych starszym snapshotem,
- niespójność desktop/mobile,
- błędne rozliczenia finansowe.

**Dlatego Payroll traktujemy jako PROTECTED CORE.**

---

## 2. NOWY FEATURE ≠ POWÓD DO MODYFIKACJI PAYROLL SYNC

Jeżeli feature **nie wymaga** zmiany Payroll:

- **nie** dotykaj Payroll sync / merge / CAS / FIFO / guardów,
- **nie** refaktoruj Payroll „przy okazji”,
- **nie** upraszczaj guardów, **nie** usuwaj CAS, **nie** omijaj FIFO,
- **nie** zmieniaj LWW, settlement, freshness, tombstones, resurrection.

Jeżeli feature **może** dotknąć Payroll (Gate G1–G9 → TAK):

```text
AUDIT → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO
→ IMPLEMENT → TEST → BUILD → COMMIT → PUSH → PRODUCTION VERIFY
```

Sam fakt, że agent uważa zmianę za małą / bezpieczną / „tylko UI / cleanup / optymalizację”, **nie znosi** obowiązku audytu, jeśli diff może dotknąć Payroll state/sync.

**Zmiana Protected Payroll Core bez Owner GO = BLOCKED.**

---

## 3. FROZEN PROTECTIONS — stan aktualny (GO6.1 → GO10)

Historyczne raporty RCA pozostają dowodem. Poniżej **aktualny stan kontraktu** — nie przepisywać historii.

| Gate | Status | Co chroni | Zakaz |
|------|--------|-----------|--------|
| **GO6.1** | **FROZEN / PASS** | Resurrection / tombstone / membership fence (`mayPersistPayrollRosterUnderWeekKeys`, clone/tombstone recreate) | Zmiana bez osobnego Owner GO |
| **GO8.1** | **FROZEN / PASS** · tip parent `1f63e5c4` | Settlement intent preservation — stale Cloud baseline **nie** odrzuca prawidłowego local settle intent; Cloud already settled **nie** nadpisywać starszym lokalnym | Bez Owner GO: nie zmieniać `applySettlementFieldIntent` / retain LS-ahead |
| **GO4** | **ACTIVE safety barrier** | HTTP 2xx **≠** settlement success; outgoing musi nieść oczekiwany settlement (`settlementCloudAck`) | Nie usuwać / nie obchodzić GO4 |
| **GO9.2** | **FROZEN / PASS** · tip `96dd9324` · **PRODUCTION VERIFIED** | Payroll CAS **single-flight** — max **1** aktywny payroll week CAS writer; sibling writes **serializowane**; bootstrap payroll CAS przez ten sam FIFO; **zakaz** inline `fn()` gdy `depth > 0` | Nie przywracać równoległych payroll CAS writers |
| **GO10** | **ACCEPTED / NO-FIX** | Świadomy unsettle jest **prawidłowym** zachowaniem | Nie „naprawiać” przez clear `payrollSettlement` |

### GO10 — model settlement (kontrakt)

| Pole | Znaczenie |
|------|-----------|
| `settled === true` | **Aktywny** stan: pracownik rozliczony |
| `settled === false` | **Aktywny** stan: oczekuje |
| `payrollSettlement` | **Historyczny snapshot** ostatniego rozliczenia (kto / kiedy / metoda / kwota) |
| Unsettle | `settled=false` + bump `settledUpdatedAt`; **metadata pozostaje celowo** |
| `settled=false` + istniejące `payrollSettlement` | **Nie** jest błędem danych (R19 · changelog) |

UI (`payrollSettlementDisplay`) przy `settled=false` pokazuje „Oczekuje” i **nie** traktuje meta jako aktywnego settle.

Opcjonalny przyszły UX (confirm przed unsettle) = **OPTIONAL FUTURE** — nie bug sync.

---

## 4. ANTI-ROLLBACK (najważniejsza reguła)

```text
NIGDY nie wolno wprowadzać logiki, która pozwala staremu snapshotowi /
staremu urządzeniu / staremu LocalStorage nadpisać niewskazanie
nowszego CANONICAL CLOUD STATE.
```

Freshness + CAS + LWW + guards + rebase chronią przed tym scenariuszem.

| Fakt | Znaczenie |
|------|-----------|
| HTTP **200** | **Nie** jest sam w sobie dowodem poprawnego settlementu |
| **GO4** | Musi weryfikować, że outgoing Cloud state zawiera oczekiwany settlement |
| **409** `stale_revision` | Mechanizm **bezpieczeństwa** — rebase/retry; **nie** obchodzić |

**NIE WOLNO:**

- ręcznie bumpować `revision`,
- wyłączać CAS / omijać `expectedRevision`,
- omijać guard / FIFO,
- używać `forceReplace` jako bypass,
- usuwać GO4 / GO6.1 / GO8.1,
- przywracać równoległych payroll writers (regresja GO9.2).

---

## 5. Desktop + mobile / multi-device

Payroll musi zachować spójność: **desktop · mobile · karty · sesje/urządzenia**.

```text
Device A edit → local → Domain Push → FIFO/CAS → Cloud canonical
Device B pull/freshness → Cloud canonical → merge/reconcile → UI
```

Przy konkurencji: **stale writer nie wygrywa bezwarunkowo**.  
`409` → rebase/retry według istniejącego mechanizmu (PWRB / field intents / GO8.1).

---

## 6. Settlement path (wymagany łańcuch)

```text
settlement intent (UI)
  → rebuild / field intents (GO8.1)
  → CAS (payrollWeekCas + expectedRevision)
  → Cloud write
  → GO4 ACK (outgoing assert)
```

Unsettle / settle świadome idą przez Domain Push + PWRB + FIFO — **nie** przez osobny „szybki” batch-set.

---

## 7. AGENT MUST NOT

- „upraszczać” payroll sync / usuwać „zbędne” await,
- zmieniać kolejności freshness → rebuild → push,
- przenosić payroll CAS poza FIFO / dodawać drugi writer path,
- robić direct push poza PWRB / duplicate push path,
- zmieniać semantyki `baselineOk` / LWW bez audytu + Owner GO,
- usuwać tombstones / omijać resurrection fence,
- traktować 409 jako coś do obejścia,
- traktować HTTP 200 jako wystarczający settlement ACK,
- mieszać FEATURE + Protected Payroll Core w jednym commit (#CORE-013),
- zmieniać Protected Core w zwykłym feature bundle.

---

## 8. Wymagane testy przed zmianą Payroll

Minimum (uruchom lokalnie; tip = [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)):

| Suite | Skrypt (orientacyjnie) |
|-------|------------------------|
| Settlement + GO4 + GO8.1 | `scripts/test-payroll-settlement-cloud-ack.mjs` |
| Settlement metadata (+ R19 unsettle) | `scripts/test-payroll-settlement-metadata.mjs` |
| Freshness H1–H16 | `scripts/test-payroll-freshness-payload-hardening.mjs` |
| CAS single-flight GO9.2 | `scripts/test-payroll-cas-single-flight-go92.mjs` |
| FIFO delete | `scripts/test-payroll-delete-fifo-p0.mjs` |
| Invariant / fence | `scripts/test-payroll-week-roster-invariant-01.mjs` |
| Resurrection | `scripts/test-payroll-cloud-resurrection-01.mjs` |
| Tombstone revocation | `scripts/test-payroll-tombstone-revocation-rcb.mjs` |
| Resurrection guard | `scripts/test-payroll-resurrection-guard-s7-5.mjs` |
| Build | `npm run build` |

Dla zmian sync — scenariusze minimum:

desktop↔mobile · dwa szybkie edity · concurrent writers · stale revision · rebase · settlement · unsettle · stale LS · stale Cloud baseline · **bootstrap + domain push** (ten sam FIFO).

---

## 9. Owner GO

```text
Protected Payroll Core change bez Owner GO = BLOCKED.
```

Commit / push / deploy produkcyjny — **tylko** na jawne polecenie Ownera  
(`OWNER GO — COMMIT/PUSH/DEPLOY` lub równoważne).

---

## 10. Łańcuch dowodów (historia → nie edytować treści RCA)

| Etap | Skrót | Tip / nota |
|------|-------|------------|
| GO6.1 | Fence membership / clone / tombstone | FROZEN |
| GO8.1 | Settlement intent vs stale baseline | `1f63e5c4` |
| GO9.2 | Single-flight payroll CAS | `96dd9324` · PRODUCTION VERIFIED |
| GO10 | Unsettle + meta = intentional; NO-FIX | ACCEPTED |

Nie przepisywać historycznych HAR/RCA. Ten plik = **aktualny kontrakt ochrony**.

---

## 11. CURRENT PRODUCTION BASELINE (HARDENED)

| Pole | Wartość |
|------|---------|
| **Production UI** | **2.66.220** |
| **Production commit** | **`73aededf`** (`73aededf8a12d869d9ec9c8be18177880b926b20`) |
| **Git** | `HEAD` = `origin/main` = **`73aededf`** (weryfikuj `git rev-parse`) |
| **Live check** | `https://www.wgdom.fun/version.json` |
| **Status** | **PAYROLL GREEN / HARDENED / CLOSED** |
| **Prod writes during final hardening** | **ZERO** |
| **HISTORY (nie CURRENT)** | 2.66.218 / `2a4e3ae` (Phase 3) · 2.66.219 / `7eadde17` (P1 remove UX) — superseded by **2.66.220** |

Tip SSOT w docs: [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md). **Nie** hardcoduj starszych tipów jako CURRENT.

---

## 12. CLOSED WORKSTREAMS (CURRENT — nie reopen)

Bez nowego RCA + Owner GO **nie** otwieraj ponownie:

| ID | Temat | Problem (skrót) | Fix (skrót) | Status |
|----|-------|-----------------|-------------|--------|
| **A** | Cross-week hours contamination | Nowy tydzień dziedziczył godziny z rotacyjnego `kw-week-employees-prev` | Soft Restore **same-week only** — `-prev` OFF na ADD po rollover | **CLOSED** |
| **B** | D4 richer-prev | Rotacyjny `-prev` wyglądał jak „bogatsza” kopia godzin nowego tygodnia | Same-week binding / unbound prev OFF | **CLOSED** |
| **C** | ExtraCosts F1 | Whole-array merge → cross-device lost updates | `mergeExtraCostsById` · `pickExtraCostByLww` · `stampExtraCostsOnEdit` · per-row `updatedAt` · union · 409 rebase | **CLOSED** |
| **D** | Manual Adjustment | Pull merge złym `dataWinner` | `pickPayrollManualAdjustment` LWW po field `updatedAt` | **CLOSED** · **nie** wymyślać CLEAR bez kontraktu |
| **E** | CarryForward Phase 2 | Defer ginął w multi-device / 409 | Core field + SET field-intent + 409 rebase | **CLOSED** · **CLEAR / `clearedAt` NIE wdrożone** (brak UI CLEAR) |
| **F** | Phase 3 `pwrRemove` | REMOVE niebezpieczne przy 409 | CAS · `pushRosterWithRebase` · intentional REMOVE · tomb filter · ACK `result.roster` · fail-loud | **CLOSED / FROZEN** |
| **G** | P1 Remove Failure Recovery | Optimistic drop → UI bez B, Cloud z B | Brak optimistic membership drop · pending UI · failure = B widoczny + toast | **CLOSED** |
| **H** | ExtraCosts DELETE tombstones | DELETE bez trwałego markeru → resurrect | Soft-delete `deletedAt` · tomb vs stale live · same-ID blocked · new UUID | **CLOSED** |
| **I** | Failed REMOVE tomb recovery | Failed REMOVE zostawiał lokalny tomb mimo Cloud∋B | Po final fail: jeśli Cloud ma osobę → revoke week-scoped tomb; I1 **bez redesignu** | **CLOSED** |

Historia objawów: [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md).

---

## 13. FROZEN / DO NOT TOUCH (Final Hardened + GO)

Bez nowego RCA + **explicit Owner GO** nie zmieniaj:

1. `pwrRemove` CAS / rebase architecture  
2. `pushRosterWithRebase`  
3. `pwrPush`  
4. `pwrAdd`  
5. intentional REMOVE detection  
6. tombstone-**before**-push (Phase 3 wymaga tego przy 409)  
7. I1 tombstone reconciliation (bez redesignu)  
8. `hoursIntents` / per-day hours `updatedAt`  
9. ExtraCosts F1 merge (ADD/UPDATE)  
10. ExtraCosts DELETE `deletedAt` semantics  
11. `pickPayrollManualAdjustment`  
12. CarryForward Phase 2 SET / rebase  
13. settled / settlement / GO4 / GO8.1  
14. early payouts  
15. P1 remove pending UI (membership tylko po ACK)  
16. GO6.1 fence · GO9.2 single-flight CAS · GO10 unsettle-meta  

**IK / FEATURE:** praca IK **nie** upoważnia do „przy okazji” zmieniać Payroll cloud-sync / CAS / settlement / field semantics. Granica: Gate + ten plik + Owner GO.

Checklist 1-strona: [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md).

---

## 14. DATA AUTHORITY

| Warstwa | Rola |
|---------|------|
| **Cloud KV** (`kw-week-employees`, meta, deleted-ids, …) | **Autorytatywny** persisted Payroll state |
| **LocalStorage** | Cache / UI — **nie** Cloud truth |
| **Cookies** | **Nie** Payroll SSOT |
| **Hydration / bootstrap** | **Nie** auto-push starego local rosteru do Cloud |
| **Write path** | Freshness → rebuild/intents → CAS → rebase → fail-closed gdzie wymagane |
| **Read/merge vs write** | **Osobne** operacje — nie mylić pull merge z Domain Push |

Anti-rollback (§4): stary LS/snapshot **nie** nadpisuje canonical Cloud.

---

## 15. MULTI-DEVICE SAFETY MODEL (CURRENT)

| Pole | Stan | Mechanizm (skrót) |
|------|------|-------------------|
| hours | **GREEN** | per-day `updatedAt` + `hoursIntents` + CAS/rebase |
| extraCosts | **GREEN** | row IDs + `updatedAt` + union/LWW + **`deletedAt` tombstones** |
| rate | **GREEN** | `rateUpdatedAt` + field rebase |
| manualAdjustment | **GREEN** | Phase 1 field picker LWW |
| carryForward | **GREEN (SET)** | Phase 2 SET/conflict · **CLEAR unsupported** (no UI) |
| settled / settlement | **GREEN** | GO4 / GO8.1 / LWW |
| early payouts | **GREEN** | field intent path |
| roster membership | **GREEN** | Phase 3 + P1 Remove Recovery |
| prevSaturday | **GREEN** | hours slot semantics |
| I1 / membership tombs | **GREEN** | G-0 + failed-remove revoke gdy Cloud∋person |

---

## 16. TOMBSTONE CONTRACT (CURRENT)

### Membership DELETE (`kw-week-employees-deleted-ids`)

| Faza | Semantyka |
|------|-----------|
| **Before push** | Tombstone **istnieje** (Phase 3 — filtr 409/rebase) |
| **Successful REMOVE** | Cloud **nie** zawiera osoby · tomb zostaje wg kontraktu Phase 3 / I1 |
| **Failed REMOVE** | Jeśli Cloud **nadal** zawiera osobę → **revoke** week-scoped tomb |
| **Cloud unreadable** | Nie fabrykuj Cloud truth · zostaw tomb · I1 może reconcile później |
| **Concurrent legitimate ADD** | Musi pozostać legalne |
| **Zakaz** | Permanent tomb blokujący legal re-add **bez** nowego kontraktu |

### ExtraCost DELETE

| Reguła | Wartość |
|--------|---------|
| Model | Soft-delete: `deletedAt` + `updatedAt` na wierszu kosztu |
| Stale UPDATE | **Nie** wskrzesza usuniętego ID |
| Same-ID re-add | **Blocked** |
| Nowy koszt | **Nowy UUID** |
| UI | Pokazuje `visibleExtraCosts` (bez tombów) |

---

## 17. CONSCIOUS BOUNDARIES (nie sztuczne OPEN)

| Temat | Stan | Decyzja |
|-------|------|---------|
| **CarryForward CLEAR / `clearedAt`** | Brak UI CLEAR/UNDEFER | **Nie** implementować `clearedAt` „teoretycznie”. Przyszły CLEAR = nowy RCA + DF + Owner GO |
| **MA explicit CLEAR tombstone** | Brak osobnego kontraktu | Nie wymyślać |
| **Przyszły feature Payroll** | — | Tylko przez Safety Gate + Owner GO |

**Nie twierdź:** „Payroll ma zero luk teoretycznych”. Twierdź: **świadome granice** powyżej + GREEN dla wdrożonych kontraktów.

---

## 18. ENTRY / CHANGE FLOW (Owner GO)

```text
AUDIT → RCA → PLAN → Owner GO → IMPLEMENT → TEST → BUILD
→ COMMIT → PUSH → PRODUCTION VERIFICATION → CLOSE
```

- **Bez Owner GO = BLOCKED** dla CRITICAL Payroll.  
- **Nie mieszaj:** PAYROLL + IK · PAYROLL + unrelated refactor · PAYROLL + cleanup.  
- Gate: [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md).

---

## 19. TEST / VERIFICATION EVIDENCE (Final Hardening @ 2.66.220)

Dowody z workstreamu final gaps (nie twierdź więcej niż te wyniki):

| Suite | Wynik |
|-------|-------|
| P1 Remove Failure | 28 PASS |
| Phase 3 `pwrRemove` | 43 PASS |
| ExtraCosts F1 | 21 PASS |
| ExtraCosts DELETE | 18 PASS |
| CarryForward Phase 2 | 31 PASS |
| Manual Adjustment | 52 PASS |
| D4/D5 | 46 PASS |
| Soft restore cross-week | 29 PASS |
| FIFO | 27 PASS |
| P1 stale/cross-device | 24 PASS |
| week-scope | 11 PASS |
| anti-leak | 7 PASS |
| settled / early payout / payout simulation | PASS |
| `npm run build` | PASS |
| Production verify | **2.66.220 / 73aededf** · Writes **ZERO** |

Skrypty (orientacyjnie): `test-payroll-p1-remove-failure-recovery.mjs` · `test-payroll-pwr-remove-cas.mjs` · `test-payroll-extracosts-f1-union.mjs` · `test-payroll-extracosts-delete-tombstone.mjs` · `test-payroll-failed-remove-tombstone.mjs` · `test-payroll-final-gaps-cross.mjs` · `test-payroll-carry-forward.mjs` · `test-payroll-manual-adjustment.mjs` · + battery §8.

---

## 20. PAYROLL COLD-START (NOWY GPT / CURSOR)

```text
1. PAYROLL_SAFETY_GATE.md          ← odpowiedz G1–G9
2. TEN PLIK (CRITICAL PROTECTED) ← baseline + CLOSED + FROZEN
3. PAYROLL_NEVER_BREAK_RULES.md
4. git status · git rev-parse HEAD/origin/main
5. curl version.json · porównaj z §11 / 09
6. Traktuj Payroll jako CRITICAL PROTECTED
7. Bez Owner GO = brak IMPLEMENT
8. Nie reopen CLOSED A–I
9. Nie ruszaj Payroll „przy okazji” IK/FEATURE
10. Cloud = authoritative
11. Używaj istniejących CAS/rebase/intents/tombstones — SEARCH BEFORE CREATE
12. Tip = 09 + version.json (nie historia czatu)
```
