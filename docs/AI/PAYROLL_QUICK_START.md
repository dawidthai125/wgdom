# PAYROLL — Quick Start (AI)

> **SSOT architektury:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md)  
> **Playbook:** [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) · **Guard Rails:** [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md)  
> **Dla:** nowego AI **bez** historii czatu · **zanim** cokolwiek dotknie Listy Płac / sync

```text
LISTA PŁAC = PRIORYTET PRODUKCYJNY #1
Czytaj w kolejności poniżej. Nie skacz do kodu.
```

---

## 1. Minimalna kolejność czytania (15–25 min)

| # | Dokument | Po co |
|---|----------|--------|
| 0 | [`AI_MEMORY.md`](AI_MEMORY.md) · [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) | Pamięć + decyzje (zawsze) |
| 1 | Ten Quick Start | Orientacja LP |
| 2 | [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) | Globalne NIE WOLNO |
| 3 | [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) | Payroll NIE WOLNO + checklisty |
| 4 | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) | Tip prod (wersja / commit) |
| 5 | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) | Przepływ · invariants · Hours-wipe |
| 6 | [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) | Co może przypadkowo zepsuć LP |
| 7 | [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) | Jak powstawały regresje |
| 8 | [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) | Co robić **przed** zmianą |

**Dopiero gdy task dotyczy merge/Domain Push głęboko:**  
[`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)

**Nigdy na start:** cały `App.tsx` · 110+ historycznych `PAYROLL-*` · SQL / migracje.

---

## 2. Minimalny zestaw wiedzy (musisz umieć powiedzieć)

1. **UI → Domain → W1 (PWRB) / W2 (Domain Push) → Cloud Sync merge → Edge KV.**  
2. Godziny live idą **tylko** Domain Push — **nie** RS `runCloudSync`.  
3. Skład tygodnia (add/remove) **tylko** PWRB.  
4. `weekEmployeeFromDir` jest **PURE**.  
5. `skipPayrollGuard` **tylko** z `intentionalHoursClear === true`.  
6. Resurrection fence i rollover ALIGN **ACTIVE** — nie usuwać.  
7. FEATURE UI **nie** miesza się z `cloud-sync.ts` / payroll CORE w jednym commit (#CORE-013).  
8. Bez **Owner GO** nie implementujesz Payroll CORE.

---

## 3. Lista SSOT (jednoznaczna)

| Temat | Jeden SSOT |
|-------|------------|
| Payroll AI | `docs/PAYROLL-ARCHITECTURE-SSOT.md` |
| Sync głęboko | `docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` |
| PWRB | `docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md` |
| Tip prod | `docs/AI/09_PRODUCTION_BASELINE.md` |
| Zakazy globalne | `docs/AI/08_AI_GUARDRAILS.md` |
| Zakazy Payroll | `docs/AI/PAYROLL_GUARD_RAILS.md` |
| Proces pracy AI | `docs/AI/PAYROLL_AI_PLAYBOOK.md` |

Historyczne DF / RCA / recovery = **czytaj przy potrzebie**, nie jako „otwarty EPIC”.

---

## 4. Stop conditions

```text
STOP i pytaj Ownera / rób tylko AUDIT gdy:
  • brief dotyczy „drobnej poprawki UI” ale diff wchodzi w cloud-sync / merge
  • nie wiesz czy zmiana to FEATURE czy CORE
  • nie masz Owner GO a chcesz zmieniać Payroll / Edge / CloudLoader
  • widzisz wipe godzin / pusty roster — NIE hotfixuj merge
```

---

## 5. Po Quick Start

→ [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md)
