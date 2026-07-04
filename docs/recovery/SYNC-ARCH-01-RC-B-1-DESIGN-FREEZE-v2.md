# SYNC-ARCH-01 · RC-B-1 · Tombstone Revocation · DESIGN FREEZE v2

> **Status:** `DESIGN FREEZE v2` · **zastępuje v1** (sesja 2026-07-04, bez pliku SSOT)  
> **Tryb:** AUDIT + DESIGN · **IMPLEMENT = NIE**  
> **Data:** 2026-07-04  
> **Baseline prod:** UI **2.63.27+** · RC-B root cause **CONFIRMED** (`filterDeletedWeekEmployees` @ `cloud-sync.ts:631`)  
> **Powiązane:** PR-PAY-S2 (Deletion Tombstones) · PR-PAY-S7-5 (Resurrection Guard, DEPLOYED) · SYNC-ARCH-01 S1-1 (RS payroll exclusion) · [`PRE-IMPLEMENTATION CONSISTENCY AUDIT`](./) (sesja RC-B-1, 2026-07-04)

```text
CEL:           Re-add pracownika w tym samym tygodniu nie może być blokowany stale tombstone.
ROOT CAUSE:    Tombstone append-only (PR-PAY-S2 + S7-5 UNION) bez ścieżki revocation.
INCIDENT:      mergeAllDataKeys=11 → sanitize=10 (branch merge_both_same_week) @ filterDeletedWeekEmployees.
ARCHITEKTURA:  PayrollWeekRosterBundle = kw-week-employees ⨝ kw-week-employees-deleted-ids (para spójna).
INWarianty:    I-1…I-4 OBOWIĄZKOWE — nie „safety net”.
WERDYKT v2:    DESIGN FREEZE READY (po włączeniu I-1…I-4 do zakresu bundle).
```

---

## 0. Supersedes

| Dokument | Status |
|----------|--------|
| RC-B-1 Design Freeze **v1** (chat, 2026-07-04) | **SUPERSEDED** przez ten plik |
| Wariant A+ bez I-1…I-4 | **SUPERSEDED** — niewystarczający dla multi-device |

---

## 1. Architecture Decision — PayrollWeekRosterBundle

### 1.1 Definicja domenowa

**PayrollWeekRosterBundle** (skrót: **PWRB**) to **jedna spójna struktura domenowa** listy płac bieżącego tygodnia:

```text
PWRB := {
  roster:    kw-week-employees[],           // skład + godziny (bieżący tydzień Pn–So)
  tombstones: kw-week-employees-deleted-ids[] // wpisy week-scoped PR-PAY-S2
}
```

**Semantyka spójności (globalny invariant G-0):**

```text
∀ mergeKey K w tygodniu W = weekRangeKey(weekFrom, weekTo):
  K ∈ roster(W)  ⟹  tombstone(W, K) MUST NOT exist
  tombstone(W, K) ∈ tombstones  ⟹  K ∉ roster(W)   [po reconcile I-1/I-2/I-3]
```

PWRB **nigdy** nie jest modyfikowany jako pojedynczy klucz KV w ścieżkach domenowych (add/remove/push). Operacje domenowe zawsze aktualizują **parę** `(roster, tombstones)` i propagują ją atomowo do LS + (przy online) chmury.

### 1.2 Identyfikatory

| Element | Format |
|---------|--------|
| `weekRangeKey` | `{weekFrom}\|{canonicalWeekTo}` |
| `mergeKey` | `weekEmployeeMergeKey(emp)` — SSOT `payroll-week-employee-merge.ts` |
| `tombstoneId` | `{weekRangeKey}::{mergeKey}` (`WEEK_EMPLOYEE_TOMBSTONE_SEP = "::"`) |

### 1.3 Warstwy (bez zmiany modelu KV)

| Warstwa | Rola PWRB |
|---------|-----------|
| **UI** (`App.tsx`) | Intencja użytkownika → mutacja PWRB |
| **Domain push** (`pushWeekEmployeesToCloud`) | Atomowy zapis PWRB → LS + Edge |
| **Pull merge** (`computeMergedDataBundle`) | Scalenie PWRB z chmury + **I-1** |
| **Sanitize** (`mergeWeekEmployeesForWeekRange`) | Filtr tombstone **przed** union rosteru (PR-PAY-S2) |
| **Edge** (`batch-set`) | Persist PWRB + **I-2** normalizacja pary |

### 1.4 Decyzja wariantu

| Wariant | Status |
|---------|--------|
| A — revoke przy Add | **PRZYJĘTY** (rdzeń) |
| B — revoke przy `persistPayrollRoster` | **ODRZUCONY** (race z remove) |
| C — revoke tylko na Edge | **ODRZUCONY** (za późno dla client sanitize) |
| **A+ v2** | A + **I-1…I-4** + PWRB jako para domenowa |

---

## 2. Obowiązkowe inwarianty I-1…I-4

> **Nie są opcjonalne.** Brak któregokolwiek → werdykt PRE-IMPLEMENT AUDIT: `DESIGN CHANGE REQUIRED`.

### I-1 — Cloud-roster revocation on pull (klient)

**Gdzie:** `computeMergedDataBundle` — **po** `mergeDeletedWeekEmployeeKeys(local, cloud)`, **przed** `finalizePayrollBundleMerge`.

**Reguła:**

```text
mergedTombs = union(localTombs, cloudTombs)
cloudRoster = normalize(cloudValues[kw-week-employees])
for emp in cloudRoster where weekRangeKey matches target week:
  mergedTombs.remove(tombstoneId(weekFrom, weekTo, emp))
saveDeletedWeekEmployeeKeys(mergedTombs)
```

**Uzasadnienie:** Remote revoke (add na innym urządzeniu) usuwa `T` z chmury i dodaje X do cloud roster. Lokalny stale `T` nie może przeżyć UNION.

**Nie psuje S2:** Gdy delete jest prawdziwy, cloud roster **nie zawiera** K → `T` zostaje.

### I-2 — Pair normalization on Edge (serwer)

**Gdzie:** `batch-set` — po przetworzeniu `kw-week-employees` i `kw-week-employees-deleted-ids` **w tym samym requeście**.

**Reguła:**

```text
finalRoster = safeValues[kw-week-employees]
finalTombs  = safeValues[kw-week-employees-deleted-ids]
finalTombs' = finalTombs.filter(id => {
  K = parseMergeKeyFromTombstone(id)
  W = parseWeekFromTombstone(id)
  return !finalRoster.contains(mergeKey K for week W)
})
safeValues[kw-week-employees-deleted-ids] = finalTombs'
```

**Uzasadnienie:** Race remove∥add (scenariusz 2) — ostatni zapis per klucz mógł utworzyć parę `(X, T)`. Edge musi wymusić G-0 przed persist.

### I-3 — Reconcile on import / rollback (klient)

**Gdzie:**
- `importBackup` — po merge `kw-week-employees`, przed `setItem` / push
- `restoreLocalDataSnapshot` — po reload LS (hook post-restore lub przy pierwszym payroll read)
- `restorePayrollFromCloud` — po `mergeWeekEmployeesForWeekRange`, przed `setWeekEmployees`

**Reguła:**

```text
reconcileTombstonesWithRoster(weekFrom, weekTo, roster):
  tombs = getDeletedWeekEmployeeKeys()
  tombs' = tombs.filter(id => {
    if !id.startsWith(weekRangeKey(W)) return true  // inny tydzień — zostaw
    K = parseMergeKey(id)
    return !rosterContainsMergeKey(roster, K)
  })
  saveDeletedWeekEmployeeKeys(tombs')
```

**Uzasadnienie:** Backup/rollback może reintrodukować stale `T` przy roster zawierającym X (scenariusze 4, 5).

### I-4 — Coupled domain push (klient)

**Gdzie:** `pushWeekEmployeesToCloud` — **każde** wywołanie (add, remove, clear, replace-all).

**Reguła:**

```text
pushKeys = [kw-week-employees, kw-week-employees-deleted-ids]
pushValues = [normalizedRoster, getDeletedWeekEmployeeKeys()]
options.replaceWeekEmployeesKeys = [kw-week-employees]
// Edge: deleted-ids w tym batch = AUTHORITATIVE REPLACE (nie UNION) — patrz §4.6
```

**Uzasadnienie:** Per-device PWRB musi być spójny w chmurze; remove bez push tombstone → resurrection; add bez push revoke → stale KV.

---

## 3. Lifecycle — formalny opis

### 3.1 Lifecycle tombstone (PR-PAY-S2)

```text
BIRTH:   removeWeekEmployee → addDeletedWeekEmployeeKey(W, emp) → tombstoneId(W, mergeKey)
PERSIST: saveDeletedWeekEmployeeKeys → LS; I-4 push → KV (replace w coupled batch)
MERGE:   pull UNION(local, cloud) → I-1 cloud-roster strip → save LS
FILTER:  filterDeletedWeekEmployees(roster, tombSet(W)) — sanitize / Edge pre-UNION
DEATH:   revoke (§3.2) LUB reconcile I-3 LUB I-1 strip LUB I-2 strip
SCOPE:   week-scoped — rollover nie dotyka; inny weekFrom|weekTo = inny prefix
CAP:     slice(-500) — bez zmian
```

### 3.2 Lifecycle revoke

```text
TRIGGER:  intentional add (addFromDirectory, replaceWeekWithAllActive)
          OR I-1 cloud-roster signal
          OR I-2 Edge normalization
          OR I-3 reconcile after import/restore
ACTION:   removeDeletedWeekEmployeeKeysForWeek(W, identities[])
EFFECT:   tombstoneId(W, K) ∉ tombstones
PAIR:     roster gains K (add) — G-0 restored
PUSH:     I-4 coupled push — KV tombstones authoritative replace
```

### 3.3 Lifecycle add

```text
UI:       addFromDirectory(ids) → weekEmployeeFromDir → next roster
REVOKE:   removeDeletedWeekEmployeeKeysForWeek(W, newEmps)  [przed push]
STATE:    setWeekEmployees(next); LS roster write via push
PUSH:     I-4 → Edge roster replace/expand + tombstones replace
PULL:     inne urządzenie → I-1 widzi X w cloud roster → strip T
FILTER:   sanitize — X nie jest filtrowany (brak T)
```

### 3.4 Lifecycle remove

```text
UI:       removeWeekEmployee(id) → next roster bez emp
TOMB:     addDeletedWeekEmployeeKey(W, removed)
PUSH:     I-4 — roster bez K, tombstones z tombstoneId(W,K)
EDGE:     filter tombstoned z prev/next przed UNION (S7-5-2); I-2 post-normalize
PULL:     union tombstones zawiera T; cloud roster bez K; I-1 nie stripuje (brak K w cloud)
FILTER:   X nie wraca z chmury (S2 + S7-5)
```

### 3.5 Lifecycle restore

| Ścieżka | PWRB zachowanie |
|---------|-----------------|
| `restorePayrollFromCloud` | merge roster (S1 week guard); **I-3** reconcile tombs z merged roster; push merged |
| `restoreWeekFromArchive` (S6) | `eligibleArchiveWeekEmployees` — **bez** revoke; tombstonowani wykluczeni z eligible; **nie** dodaje nowych tombstones |
| `restoreAllDataFromCloud` | full bundle merge; **I-3** wymagany po reload dla payroll keys |
| Cloud backup slot prev/prev2 | jak restore payroll — I-3 obowiązkowy |

### 3.6 Lifecycle import

```text
importBackup(JSON):
  kw-week-employees → mergeWeekEmployees(local, imported)  [union roster]
  kw-week-employees-deleted-ids → mergeDeletedWeekEmployeeKeys(local, imported)  [NOWE v2 — nie ślepe setItem]
  I-3 reconcile(weekFrom, weekTo, mergedRoster)
  pushAllDataToCloud(bundle)
```

### 3.7 Lifecycle rollback

```text
restoreLocalDataSnapshot:
  nadpisuje cały LS z kopii
  przy reload / CloudLoader bootstrap:
    I-3 reconcile dla bieżącego weekFrom/weekTo
Failure: backup sprzed revoke z (roster∋X, tombs∋T) → bez I-3: RC-B repro
```

### 3.8 Lifecycle multi-device

```text
Device A: PWRB mutation → I-4 push → KV
Device B: offline / online
  online pull: fetch PWRB cloud + local → tombstones UNION → I-1 → save → finalize → sanitize
  Edge concurrent: last batch LWW per key → I-2 heals pair on write
  Eventual state: G-0 globally when cloud roster and tombs converge
Conflict: simultaneous remove∥add → LWW; I-1+I-2 guarantee no stable (X,T) pair
```

---

## 4. Operacje — INPUT / OUTPUT / Invariant / Failure mode

### 4.1 `addFromDirectory`

| Pole | Wartość |
|------|---------|
| **INPUT** | `directoryIds[]`, `weekFrom`, `weekTo`, local PWRB, directory |
| **OUTPUT** | `nextRoster` (+N emp), `tombstones'` (bez revoke keys dla new emps), LS + KV via I-4 |
| **Invariant** | G-0; I-4; revoke **przed** push |
| **Failure mode** | Bez revoke: stale T → sanitize 11→10 (RC-B). Bez I-4: KV tombs stale. Bez I-1 na B: utrata X na B2. |

### 4.2 `removeWeekEmployee`

| Pole | Wartość |
|------|---------|
| **INPUT** | `employeeId`, local roster, `weekFrom`, `weekTo` |
| **OUTPUT** | `nextRoster` (-1 emp), `tombstones + tombstoneId(W,K)`, I-4 push |
| **Invariant** | G-0 po operacji; S2 — T musi istnieć po remove |
| **Failure mode** | Bez I-4 push tombs: resurrection cross-device (S7-5 regression). |

### 4.3 `replaceWeekWithAllActive`

| Pole | Wartość |
|------|---------|
| **INPUT** | active directory[], local PWRB |
| **OUTPUT** | new roster (kartoteka), revoke dla wszystkich `newEmps` mergeKeys, I-4 |
| **Invariant** | G-0 dla każdego dodanego K |
| **Failure mode** | Jak add — stale T dla re-added active employees. |

### 4.4 `clearAllWeekEmployees`

| Pole | Wartość |
|------|---------|
| **INPUT** | local roster |
| **OUTPUT** | `roster=[]`, tombstones **bez zmian** (v2 — poza scope RC-B-1) |
| **Invariant** | Brak G-0 naruszenia dla pustego rosteru |
| **Failure mode** | **Backlog:** brak tombstone per removed emp → resurrection przy UNION (osobny ticket) |

### 4.5 `pushWeekEmployeesToCloud` (I-4)

| Pole | Wartość |
|------|---------|
| **INPUT** | `weekEmployees[]`, `getDeletedWeekEmployeeKeys()` |
| **OUTPUT** | LS roster; HTTP batch-set `[kw-week-employees, kw-week-employees-deleted-ids]` |
| **Invariant** | Para PWRB spójna pre-push; `replaceWeekEmployeesKeys` |
| **Failure mode** | Push tylko roster: tombs desync. Offline: LS spójny, KV stale do reconnect. |

### 4.6 Edge `batch-set` (coupled PWRB)

| Pole | Wartość |
|------|---------|
| **INPUT** | batch keys/values, `replaceWeekEmployeesKeys`, stored KV |
| **OUTPUT** | KV `kw-week-employees`, KV `kw-week-employees-deleted-ids` |
| **Invariant** | G-0 via I-2; S7-5-2 filter przed UNION; **deleted-ids = REPLACE z batch** gdy oba klucze + replaceWeekEmployees |
| **Failure mode** | UNION deleted-ids (stare S7-5): revoke nie propaguje. Bez I-2: stable (X,T). |

### 4.7 `computeMergedDataBundle` pull (I-1)

| Pole | Wartość |
|------|---------|
| **INPUT** | local LS PWRB, cloud KV PWRB |
| **OUTPUT** | `mergedTombs` (union→strip), merged bundle post-finalize |
| **Invariant** | I-1 strip po union; tombstones saved przed finalize |
| **Failure mode** | Bez I-1: B2 utrata X. Zła weekTo: strip poza zakresem — użyć `weekRangeKey` z merged weekFrom/weekTo. |

### 4.8 `mergeWeekEmployeesForWeekRange` / sanitize

| Pole | Wartość |
|------|---------|
| **INPUT** | local/cloud roster, `getDeletedWeekEmployeeKeys()` po I-1 |
| **OUTPUT** | filtered local, filtered cloud, merged roster |
| **Invariant** | Filtr **przed** union; mergeAllDataKeys **bez** filtra (bez zmian v2) |
| **Failure mode** | Stale T w tombs: drop count (RC-B). |

### 4.9 `restorePayrollFromCloud`

| Pole | Wartość |
|------|---------|
| **INPUT** | cloud backup slot, local PWRB, `weekFrom/weekTo` |
| **OUTPUT** | merged roster, merged archive, I-3 reconciled tombs, push |
| **Invariant** | S1 week guard; I-3 |
| **Failure mode** | Bez I-3: restore reintroduces T. |

### 4.10 `restoreWeekFromArchive` (S6)

| Pole | Wartość |
|------|---------|
| **INPUT** | archive snap, tombstones |
| **OUTPUT** | `eligible` roster only — UI setState, **bez** I-4 w v2 min (manual restore) |
| **Invariant** | eligible = archiwum − tombstones; **nie** revoke |
| **Failure mode** | User musi później push/sync; eligible pusty → alert (OK). |

### 4.11 `importBackup`

| Pole | Wartość |
|------|---------|
| **INPUT** | JSON file z PWRB fields |
| **OUTPUT** | merged PWRB w LS, I-3, `pushAllDataToCloud` |
| **Invariant** | I-3; merge deleted-ids (nie overwrite ślepe) |
| **Failure mode** | Ślepe setItem tombs: stale T (scenariusz 5). |

### 4.12 `restoreLocalDataSnapshot` / rollback

| Pole | Wartość |
|------|---------|
| **INPUT** | snapshot LS |
| **OUTPUT** | full LS replace, reload |
| **Invariant** | I-3 on bootstrap po reload |
| **Failure mode** | Backup sprzed add z T → utrata po refresh bez I-3. |

### 4.13 Multi-device sync (implicit)

| Pole | Wartość |
|------|---------|
| **INPUT** | PWRB per device, KV |
| **OUTPUT** | converged G-0 |
| **Invariant** | I-1 + I-2 + I-4 |
| **Failure mode** | Race bez I-2: transient (X,T); heal at next pull I-1 or Edge write. |

---

## 5. Zakres IMPLEMENT (bundle RC-B-1 v2)

| ID | Zmiana | Plik |
|----|--------|------|
| RC-B-1a | `removeDeletedWeekEmployeeKeysForWeek` | `cloud-sync.ts` |
| RC-B-1b | `reconcileTombstonesWithRoster` (I-3) | `cloud-sync.ts` |
| RC-B-1c | I-1 w `computeMergedDataBundle` | `cloud-sync.ts` |
| RC-B-1d | I-4 coupled push w `pushWeekEmployeesToCloud` | `cloud-sync.ts` |
| RC-B-1e | Edge I-2 + deleted-ids REPLACE (coupled) | `index.tsx` |
| RC-B-1f | `addFromDirectory` + `replaceWeekWithAllActive` → revoke | `App.tsx` |
| RC-B-1g | I-3 w `importBackup`, `restorePayrollFromCloud` | `App.tsx` |
| RC-B-1h | I-3 post-restore hook (local snapshot reload) | `App.tsx` / `CloudLoader.tsx` |
| RC-B-1i | Trace `payroll.roster.tombstone.revoke` | `payroll-runtime-trace.ts` |
| RC-B-1j | Testy §7 | `scripts/` |

### Poza zakresem RC-B-1 v2

- `clearAllWeekEmployees` tombstone per emp (backlog)
- Zmiana `mergeAllDataKeys` / filtr w L2180
- S7-5-3 / S7-5-4 (warunkowe)
- Zmiana RS S1-1 exclusion
- Timestamp LWW na deleted-ids (future)

---

## 6. Impact Analysis (v2)

| Obszar | Wpływ v2 |
|--------|----------|
| **RC-B incydent** | Zamknięty na add + refresh (wszystkie urządzenia po sync) |
| **PR-PAY-S2** | Zachowany — remove nadal tworzy T; filtr nadal działa |
| **PR-PAY-S7-5** | Rozszerzony — revoke + I-1/I-2 **komplementują** resurrection guard, nie zastępują |
| **S1-1 RS** | Bez zmian — PWRB domain push poza RS |
| **Payroll Guard** | Bez zmian — `skipPayrollGuard` na domain push |
| **Edge payload** | +deleted-ids na każdym domain push (mały) |
| **KV semantyka** | deleted-ids: REPLACE przy coupled push; UNION tylko na pull merge przed I-1 |
| **Offline** | Add+revoke w LS; I-1 przy reconnect; G-0 eventual |
| **Import/backup** | I-3 — nowy obowiązkowy krok |
| **Performance** | Pomijalny — O(n) strip na roster/tombs |

### Macierz scenariuszy (post-v2)

| # | Scenariusz | v1 A+ | **v2 A+ + I-1…I-4** |
|---|------------|-------|---------------------|
| 1 | A remove → B offline → A add → B online | ❌ B2 utrata | ✅ I-1 strip T |
| 2 | A remove ∥ B add | ⚠️ (X,T) | ✅ I-2 + I-1 heal |
| 3 | A,B remove → A add | ❌ | ✅ I-1 |
| 4 | Add → rollback backup | ❌ | ✅ I-3 |
| 5 | Import stale tombs | ❌ | ✅ I-3 + merge tombs |

---

## 7. Test Plan (v2)

### 7.1 Regresje obowiązkowe (bez zmian)

- `test-payroll-deletion-tombstones-pr-pay-s2.mjs`
- `test-payroll-resurrection-guard-s7-5.mjs`
- `test-payroll-bootstrap-runtime-parity-b4.mjs`
- `test-p11-bootstrap-payroll.mjs`
- `test-payroll-archive-restore-eligibility-s6.mjs`
- `test-payroll-edge-parity-b6.mjs`
- `test-payroll-settled-merge-fix-a.mjs` (jeśli w manifest)

### 7.2 Nowy — `test-payroll-tombstone-revocation-rcb.mjs` (unit)

| ID | Scenariusz | PASS |
|----|------------|------|
| RCB-T1 | delete → tomb T; filter usuwa X | T present, X filtered |
| RCB-T2 | delete → add (revoke) → filter | T absent, X present |
| RCB-T3 | mergeAllDataKeys=11 → sanitize po revoke | afterCount=11 |
| RCB-T4 | `reconcileTombstonesWithRoster` (I-3) | G-0 |
| RCB-T5 | `removeDeletedWeekEmployeeKeysForWeek` week-scope | T w W2 nie ruszony |

### 7.3 Nowy — `test-payroll-pwrb-consistency-i1.mjs` (distributed sim)

| ID | Scenariusz | PASS |
|----|------------|------|
| DC-T1 | **Scen. 1 B2:** B local (no X, T); cloud (X, no T); I-1 merge | merged tombs bez T; sanitize ma X |
| DC-T2 | **Scen. 3:** double remove, A add, B pull | B roster X po sync |
| DC-T3 | I-1 nie stripuje gdy cloud bez X (S2) | T zostaje, X filtered |

### 7.4 Nowy — `test-payroll-pwrb-edge-i2.mjs` (Edge sim / parity)

| ID | Scenariusz | PASS |
|----|------------|------|
| DC-T4 | **Scen. 2:** batch roster X + tombs T → I-2 | KV tombs bez T |
| DC-T5 | coupled push replace tombs | KV tombs = client list (no union revive T) |

### 7.5 Nowy — `test-payroll-pwrb-import-i3.mjs`

| ID | Scenariusz | PASS |
|----|------------|------|
| DC-T6 | **Scen. 5:** import JSON roster X + stale T → I-3 | G-0 przed push |
| DC-T7 | **Scen. 4:** rollback snapshot ze stale T → I-3 on load | sanitize count stable |

### 7.6 Nowy — `test-payroll-pwrb-domain-push-i4.mjs`

| ID | Scenariusz | PASS |
|----|------------|------|
| DC-T8 | remove push payload zawiera oba klucze | tombs include T |
| DC-T9 | add push payload: oba klucze, tombs bez T | coupled |

### 7.7 Smoke prod (manual)

1. Safari `?rcbdebug=1`: delete → add → refresh → count stable, brak `::dir:<id>` w deleted-ids  
2. Chrome drugie urządzenie: po sync subject visible  
3. Delete ponownie: subject gone, tomb wraca  
4. Import backup regression (opcjonalnie staging)

---

## 8. Regression Risk (v2)

| Ryzyko | P | Mitigacja |
|--------|---|-----------|
| R1 I-1 false strip (resurrection) | Niski | Strip tylko gdy K ∈ **cloud** roster; test DC-T3 |
| R2 I-2 Edge regress batch bez payroll | Niski | I-2 tylko gdy oba klucze w batch |
| R3 I-3 over-delete tombs inny tydzień | Niski | Week prefix guard w reconcile |
| R4 Domain push size / 500 | Niski | Tombs małe; monitor S7-2 |
| R5 Race transient (X,T) | Średni | I-2 + I-1; max 1 sync do heal |
| R6 clearAll resurrection | Otwarty | Backlog — nie RC-B-1 |

---

## 9. Werdykt

```text
DESIGN FREEZE READY
```

**Warunki:**
1. I-1…I-4 są **w zakresie bundle** RC-B-1 v2 (nie backlog).
2. PWRB (para roster + tombstones) jest **jedyną** semantyką domain push/pull reconcile.
3. IMPLEMENT **nie startuje** bez testów DC-T1…DC-T9 w manifeście test-infra (post-MVP gate zalecany).
4. v1 Design Freeze jest **superseded** przez ten dokument.

**Nie wymaga REWORK** — PRE-IMPLEMENTATION AUDIT wymagał DESIGN CHANGE; v2 włącza wymagane zmiany explicite.

---

## 10. Referencje kodu (baseline READ ONLY)

| Element | Lokalizacja |
|---------|-------------|
| `filterDeletedWeekEmployees` | `cloud-sync.ts:627–633` |
| `addDeletedWeekEmployeeKey` | `cloud-sync.ts:599–607` |
| `mergeDeletedWeekEmployeeKeys` pull | `cloud-sync.ts:3010–3011` |
| `pushWeekEmployeesToCloud` | `cloud-sync.ts:2645–2689` |
| `addFromDirectory` / `removeWeekEmployee` | `App.tsx:1404–1457` |
| Edge tombstone + roster | `index.tsx:639–703` |
| `importBackup` | `App.tsx:1071–1175` |

---

*Ostatnia aktualizacja: 2026-07-04 · SYNC-ARCH-01 RC-B-1 · DESIGN FREEZE v2*
