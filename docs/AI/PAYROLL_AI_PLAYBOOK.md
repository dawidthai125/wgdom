# PAYROLL — AI Playbook (obowiązkowa kolejność pracy)

> **Dla:** Cursor Agent / ChatGPT przed **każdą** zmianą mogącą dotknąć Listy Płac, `cloud-sync`, Edge merge, `CloudLoader`, PWRB, Domain Push.  
> **SSOT treści:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) · **Zakazy:** [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md)  
> **Start:** [`PAYROLL_QUICK_START.md`](PAYROLL_QUICK_START.md)

---

## 0. Zasada

```text
AUDIT → (RCA) → DESIGN FREEZE → ARCHITECTURE REVIEW → OWNER GO → IMPLEMENT → VERIFY → COMMIT → PUSH → CLOSE
```

**Skrótów nie ma.** „Mały fix UI” który rusza `cloud-sync.ts` = **CORE** → pełna ścieżka.

---

## 1. Klasyfikacja zadania (pierwszy krok)

| Pytanie | Jeśli TAK → |
|---------|-------------|
| Dotyka godzin / roster / settled / rollover / archive LP? | **Payroll CORE** |
| Dotyka `cloud-sync.ts` / `CloudLoader` / Edge `mergeWeekEmployees*`? | **CORE sync** (Payroll blast radius) |
| Dotyka Jobs `workEntries` / directory / leaves? | Sprawdź [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) |
| Tylko copy/CSS w `PayrollView` bez stanu godzin? | Może FEATURE — **Boundary Check** plików |
| Inny moduł (Tenders/Theme/WM)? | Czytaj Dependency Map — **czy plik Shared?** |

Bez klasyfikacji → **STOP**.

---

## 2. Obowiązkowe czytanie przed zmianą

### 2A. Zawsze (nawet „nie Payroll”)

1. [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md)  
2. [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
3. [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) — **czy możesz uszkodzić LP?**

### 2B. Gdy Payroll / sync / Edge / CloudLoader

4. [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) (P16–P20 · Regression Watch)  
5. [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) (**§1A LIVE WRITE** · I-FRESH / I-CANON / I-EXTRACOSTS)  
6. [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) (**§9 Freshness+payload**)  
7. [`../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md`](../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md)  
8. Głęboko (merge/push): Agent Guide Cloud Sync  
9. W1: PWRB closeout · Hours-wipe: DF-01 + EPIC closeout  
10. `CURRENT-TASK.md` — STABILIZATION / otwarte GO  

**Zasada:** Freshness ≠ canonical payload. Nie soft-delete guardów „bo testy przechodzą”.

---

## 3. Kiedy obowiązkowy AUDIT (tylko docs)

| Sytuacja | Wymagane |
|----------|----------|
| Nieznany objaw LP / wipe / resurrection | **AUDIT ONLY** |
| Zmiana w Shared (`cloud-sync`, App handlers LP) | AUDIT wpływu na W1/W2 |
| Nowy write path / nowy klucz KV | AUDIT + DF |
| Owner: „sprawdź czy X psuje Payroll” | AUDIT → raport; **bez** kodu |

---

## 4. Kiedy DESIGN FREEZE

| Sytuacja | DF |
|----------|-----|
| Zmiana invariants / merge / guard / fence / Domain Push | **TAK** |
| Nowy EPIC Payroll | **TAK** |
| Cosmetic FEATURE w czystym UI bez CORE | Nie (ale Boundary Check) |
| „Hotfix” CORE bez DF | **ZAKAZ** |

---

## 5. Kiedy OWNER GO

| Etap | Bez GO? |
|------|---------|
| AUDIT / RCA / DF (docs) | Zwykle OK jeśli Owner zlecił |
| **IMPLEMENT** Payroll / sync / Edge | **ZAKAZ bez GO** |
| COMMIT / PUSH | **ZAKAZ bez prośby Ownera** |
| Nowy EPIC w STABILIZATION | **ZAKAZ bez GO** |

Źródło: [`../WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md).

---

## 6. Testy — zanim uznasz „działa”

| Zakres zmiany | Minimum |
|---------------|---------|
| Domain Push / hours / sync write | freshness gate + payload hardening + P0 + P2 · Domain Push S2 |
| Field intent / extraCosts / settlement | P2 · settlement · early · MA suites |
| PWRB / skład | week-roster invariant · PWRB / RS-no-payroll |
| D4/D5 recovery | `test-payroll-prev-recovery-soft-restore-d4-d5.mjs` |
| Merge / bootstrap | Gate B: `npm run test:infra -- --gate B --scope payroll` |
| „Tylko Tenders” ale Shared sync | Gate B payroll **nadal** — regresja cross-module |

Pełna lista: SSOT §4.4 · Regression Watch w [`../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md`](../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md) §9.  
**FAIL → STOP.** Nie GREEN bez Owner review.

---

## 7. Czego nie dotykać (domyślnie)

```text
• finalizePayrollBundleMerge / mergeWeekEmployees* semantyka
• payroll-bootstrap-resurrection-fence
• classifyPayrollWeekTransition
• weekEmployeeFromDir (PURE)
• skipPayrollGuard bez intentionalHoursClear
• Przywracanie kw-week-employees do RS push
• Łączenie D4 -prev z archive Restore Banner
• Mieszanie FEATURE + CORE w jednym commit
• Osłabianie Freshness / rebuildPayrollOutgoingAfterFreshness / P0 / P2 / CAS
• Nowy skipCloudFreshnessGate poza intentional bootstrap/internal reentry
```

Szczegóły: Guard Rails + SSOT §2–3 · closeout 2.66.126.

---

## 8. Checklista sesji (skrót)

```text
PRZED KODEM
  □ Quick Start + Guard Rails + Dependency Map
  □ Klasyfikacja FEATURE vs CORE
  □ Owner GO jeśli IMPLEMENT CORE
  □ DF jeśli invariants / merge / write path

PRZED COMMIT
  □ Diff tylko w scope DF
  □ Zero mixed CORE+FEATURE
  □ Gate B payroll jeśli CORE
  □ Owner poprosił o commit

PRZED PUSH
  □ Owner poprosił o push
  □ VERIFY FAST (jedno version.json) — bez pollingu
```

---

## 9. Jeśli podejrzewasz regresję LP

1. **STOP** implementacji w innym module.  
2. AUDIT ONLY — telemetria D1 / dual-session / KV vs LS.  
3. Czytaj [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md).  
4. **Nie** „naprawiaj merge na skróty”.  
5. RCA → DF → GO.
