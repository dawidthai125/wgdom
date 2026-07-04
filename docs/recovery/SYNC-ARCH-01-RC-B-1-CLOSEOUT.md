# SYNC-ARCH-01 · RC-B-1 · Tombstone Revocation — CLOSEOUT

> **Status:** **CLOSED** (functional fix + debug overlay cleanup)  
> **Data closeout:** 2026-07-04  
> **Prod UI:** **2.63.30** (bez bumpu przy overlay cleanup)  
> **Commity:** `35f37b1` (PWRB facade + I-1…I-4) · `24bde6e` (usunięcie RC-B debug overlay)  
> **Design Freeze SSOT:** [`SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md)  
> **Architektura sync dla agentów:** [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)

---

## 1. Co się stało (incydent)

**Objaw produkcyjny:** po **usunięciu** pracownika z listy płac bieżącego tygodnia, a następnie **ponownym dodaniu** tej samej osoby z Kadr — po odświeżeniu strony (F5) pracownik **znikał** (np. roster 11 → 10).

**Potwierdzony łańcuch (RC-B):**

```text
add pracownika → push OK
delete → tombstone T zapisany (append-only)
re-add → roster ma X, ale T nadal w kw-week-employees-deleted-ids
refresh / pull-merge → filterDeletedWeekEmployees usuwa X
sanitize → count spada (11 → 10)
```

**Dlaczego tak się stało (root cause):**

| Warstwa | Problem |
|---------|---------|
| **PR-PAY-S2** | Tombstony kasowania były **append-only** — brak ścieżki **revocation** przy re-add |
| **PR-PAY-S7-5** | Sync tombstonów cross-device naprawił **resurrection** (usunięty wraca z chmury), ale **nie** scenariusz „delete → re-add w tym samym tygodniu” |
| **Model merge** | `filterDeletedWeekEmployees` działał poprawnie wg spec S2 — usuwał X bo T istniał |
| **Brak pary domenowej** | `kw-week-employees` i `kw-week-employees-deleted-ids` mutowane osobno w UI — możliwa niespójność `(roster ∋ X) ∧ (tombs ∋ T)` |

To **nie był** bug `mergeWeekEmployees` UNION ani Edge shrink guard — to **brak invariantu G-0** (spójność pary roster/tombstones).

---

## 2. Co naprawiono (RC-B-1)

### 2.1 PayrollWeekRosterBundle (PWRB) — facade domenowy

**Plik SSOT:** `src/lib/payroll-week-roster-bundle.ts`

```text
PWRB := {
  roster:     kw-week-employees[]
  tombstones: kw-week-employees-deleted-ids[]
}
```

**Zasada:** mutacje składu tygodnia w UI **tylko** przez facade:

| API | Kiedy |
|-----|-------|
| `pwrAdd` | dodanie z Kadr |
| `pwrRemove` | usunięcie z tygodnia |
| `pwrPush` | zapis rosteru (persist, settled, …) |
| `pwrPullMerge` | import / pull helper |
| `pwrReconcile` | post-bootstrap / import |
| `pwrImportMerge` | backup JSON |
| `pwrRestorePayrollMerge` | restore z archiwum |

**Zakaz dla przyszłych agentów:** nie wołaj bezpośrednio `addDeletedWeekEmployeeKey` / `removeWeekEmployee` merge ścieżek z `App.tsx` — użyj PWRB.

### 2.2 Inwarianty I-1…I-4 (obowiązkowe)

| ID | Gdzie | Co robi |
|----|-------|---------|
| **I-1** | `computeMergedDataBundle` (klient) | Po pull: usuń tomb T jeśli cloud roster zawiera ten sam mergeKey |
| **I-2** | Edge `batch-set` | Normalizacja pary przed persist — G-0 na serwerze |
| **I-3** | `reconcileTombstonesWithRoster` | Strip tombów dla tożsamości obecnych w rosterze (import/restore/bootstrap) |
| **I-4** | `pushWeekEmployeesToCloud` | Coupled push — oba klucze KV w jednym batch-set |

**Globalny invariant G-0:**

```text
K ∈ roster(W)  ⟹  tombstone(W,K) MUST NOT exist
```

### 2.3 Debug overlay — usunięty

Komponent diagnostyczny RC-B (`PayrollRcbDebugOverlay`, `payroll-rcb-debug-overlay.ts`, `?rcbdebug=1`) — **usunięty** w `24bde6e`.

**Zostaje** (do końcowego zamknięcia RC-B / Evidence Gate):

- `globalThis.__wgdomPayrollPipelineDebug` (włącz ręcznie w konsoli)
- `console.warn` w `cloud-sync.ts` / `CloudLoader.tsx` (`payrollGuard.after`, `batch-set.response`, `bootstrap.*`)
- `payroll-runtime-trace` (osobny strumień)

---

## 3. Testy (PASS)

| Skrypt | Wynik |
|--------|-------|
| `npm run audit:pwrb` | PASS — boundary App.tsx nie importuje forbidden PWRB internals |
| `scripts/test-pwrb-boundary-rcb.mjs` | PASS |
| `scripts/test-payroll-tombstone-revocation-rcb.mjs` | PASS (RCB-T1…T5) |
| Regresje S2, S7-5, B4, P11, B6 | PASS (sesja RC-B-1) |

---

## 4. Architektura — jak działa sync (skrót dla AI)

**Nie czytaj `App.tsx` od zera.** Kolejność:

```text
docs/AGENT-APP-MAP.md
  → docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md
  → docs/ARCHITECTURE.md § 11
  → src/lib/cloud-sync.ts (tylko sekcje merge/push)
  → src/lib/payroll-week-roster-bundle.ts
```

### 4.1 Przepływ zapisu Payroll

```text
UI intencja (add/remove/hours)
  → PWRB facade (para roster+tombs, revoke przy add)
  → pushWeekEmployeesToCloud (I-4 coupled)
  → POST /batch-set (Edge I-2 normalize)
  → localStorage + KV
```

### 4.2 Przepływ odczytu

```text
pull / bootstrap / focus
  → fetchKeysFromCloud
  → computeMergedDataBundle
       → mergeDeletedWeekEmployeeKeys (S7-5 UNION tombów)
       → I-1 cloud-roster revocation
  → finalizePayrollBundleMerge
       → filterDeletedWeekEmployees (S2)
       → mergeWeekEmployeesForWeekRange (UNION)
  → applyAdminDataBundle
```

### 4.3 Klucze KV Payroll (krytyczne)

| Klucz | Sync | Uwaga |
|-------|------|-------|
| `kw-week-employees` | ✅ push+pull | UNION merge — **nie replace** bez `replaceWeekEmployeesKeys` |
| `kw-week-employees-deleted-ids` | ✅ push+pull (od S7-5) | Week-scoped `weekFrom\|weekTo::mergeKey` |
| `kw-weekFrom` / `kw-weekTo` | ✅ | Week scope guard S1 |
| `kw-archive` | ✅ | Snapshot tygodni — restore przez PWRB |

### 4.4 Pliki — granice odpowiedzialności

| Plik | Rola | **Nie zmieniaj bez** |
|------|------|----------------------|
| `payroll-week-roster-bundle.ts` | Facade PWRB — **jedyny** entry UI | AUDIT + testy PWRB |
| `cloud-sync.ts` | Merge, push, guard, I-1, I-4 | AUDIT + `PAYROLL-QUALITY-GATE` L3+ |
| `payroll-week-employee-merge.ts` | Kernel mergeKey — **parity klient↔Edge** | B6 test + Edge deploy |
| `cloud-sync-mutation-guard.ts` | Defer pull podczas mutacji | Guard phase docs |
| `CloudLoader.tsx` | Bootstrap merge + `pwrReconcile` | B4 test |
| `supabase/.../index.tsx` | Edge batch-set, I-2 | Edge deploy + B6 |
| `App.tsx` | Orkiestracja sync, handlery → PWRB | — |

---

## 5. Jak nie zepsuć listy płac przy nowej funkcji

### 5.1 Zasady twarde (MUST)

1. **Nowa mutacja składu tygodnia** → rozszerz **PWRB**, nie `App.tsx` bezpośrednio.
2. **Nie rozdzielaj** zapisu `kw-week-employees` od `kw-week-employees-deleted-ids` w ścieżce domenowej.
3. **Parytet klient↔Edge** — każda zmiana `weekEmployeeMergeKey` / union wymaga `payroll-week-employee-merge.ts` + Edge + `test-payroll-edge-parity-b6.mjs`.
4. **CloudSyncMutationGuard** — opakuj mutacje roster/jobs (`withKwWeekEmployeesAsyncMutation`).
5. **Jeden bundle = jeden cel** — nie mieszaj fixu resurrection z optymalizacją batch-set w jednym PR.
6. **Przed commitem:** `npm run build` + `npm run audit:pwrb` + relevant payroll smoke.

### 5.2 Zasady miękkie (SHOULD)

- Przeczytaj [`PAYROLL-QUALITY-GATE.md`](../PAYROLL-QUALITY-GATE.md) — zmiana sync = min. **L3**.
- Użyj `TEST-INFRA` manifestu dla regresji payroll (`npm run test:infra`).
- Nie usuwaj `finalizePayrollBundleMerge` / `applyRuntimePayrollAntiLeak` bez B4 parity.
- Nie wyłączaj Payroll Guard (`wouldBlockPayrollShrink`) bez owner GO.

### 5.3 Antywzorce (NIE rób tego)

| Antywzorzec | Skutek |
|-------------|--------|
| Bezpośredni `setWeekEmployees` + osobny push tombów | G-0 broken → re-add znika |
| Replace całego `kw-week-employees` bez tomb reconcile | Resurrection lub utrata składu |
| Zmiana `mergeWeekEmployees` tylko po stronie klienta | Edge parity broken (B6 FAIL) |
| Nowy klucz KV bez `DATA_KEYS` + `CloudLoader` bootstrap | ENOENT prod / brak sync |
| Partial push bez `prepareKeysForCloudPush` | Nadpisanie edycji z innej karty |

---

## 6. Co pozostaje OPEN

| Temat | Status |
|-------|--------|
| **batch-set HTTP 500** | OPEN — H1 UNCONFIRMED; S7-4A observation |
| **Manual multi-device AC8–AC11** | PENDING — owner validation Chrome/Safari |
| **Evidence Gate SYNC-ARCH-01** | OPEN — ADR PROPOSED |
| **Debug `__wgdomPayrollPipelineDebug`** | Tymczasowy — usunąć po zamknięciu RC-B evidence |
| **payroll-week-employee-merge.ts WIP trace** | Lokalny WIP — nie w prod commit overlay bundle |

---

## 7. Commity i wersja

| Commit | Zakres |
|--------|--------|
| `35f37b1` | RC-B-1: PWRB facade, I-1…I-4, Edge coupled push, testy, changelog **2.63.30** |
| `24bde6e` | Cleanup: usunięcie RC-B debug overlay (bez bumpu wersji) |

**Prod UI:** `2.63.30` · **HEAD po cleanup:** `24bde6e`

---

## 8. Referencje

| Dokument | Rola |
|----------|------|
| [`SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md) | Design freeze + inwarianty |
| [`SYNC-ARCH-01-RC-B-1A-PWRB-ARCHITECTURE-DESIGN-FREEZE.md`](SYNC-ARCH-01-RC-B-1A-PWRB-ARCHITECTURE-DESIGN-FREEZE.md) | Facade architecture |
| [`PAYROLL-RC-B-FINAL-CONFIRMATION.md`](PAYROLL-RC-B-FINAL-CONFIRMATION.md) | RCA potwierdzenie |
| [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](../PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) | `finalizePayrollBundleMerge` SSOT |
| [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](../PAYROLL-GUARD-PHASE-CLOSEOUT.md) | CloudSyncMutationGuard |

---

*Ostatnia aktualizacja: 2026-07-04 · SYNC-ARCH-01 RC-B-1 CLOSEOUT*
