# AI PAYROLL SAFETY MANUAL — brama packu LP

> **Rola:** jedna strona **agregująca** (linki). **Nie** duplikuje SSOT.  
> **Entry:** [`AI_ENTRY.md`](AI_ENTRY.md) · **Gate:** [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)

```text
LISTA PŁAC = #1. Gdy Gate = TAK → przejdź ten Manual zanim napiszesz kod.
```

---

## 1. Read order (≤15 min gdy Gate FULL)

| # | Plik | Po co |
|---|------|--------|
| 1 | [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md) | Twarde NIGDY |
| 2 | [`PAYROLL_BOUNDARY_MAP.md`](PAYROLL_BOUNDARY_MAP.md) | FEATURE vs CORE |
| 3 | [`PAYROLL_QUICK_START.md`](PAYROLL_QUICK_START.md) | Minimalny kontekst |
| 4 | [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) | Zakazy P1–P15 + checklisty |
| 5 | [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) | Blast radius |
| 6 | [`PAYROLL_WEEK_MODEL.md`](PAYROLL_WEEK_MODEL.md) | ALIGN / ROLLOVER / tydzień |
| 7 | [`PAYROLL_DATA_FLOW_INDEX.md`](PAYROLL_DATA_FLOW_INDEX.md) | Write/read/cloud/LS/bootstrap |
| 8 | [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) | Wzorce regresji |
| 9 | [`PAYROLL_INCIDENT_INDEX.md`](PAYROLL_INCIDENT_INDEX.md) | Indeks incydentów |
| 10 | [`PAYROLL_RCA_INDEX.md`](PAYROLL_RCA_INDEX.md) | Indeks RCA |
| 11 | [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) | AUDIT → DF → GO |
| 12 | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) | SSOT invariants |
| 13 | [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) | Głęboki sync (gdy G3/G4) |

---

## 2. Hard STOP (skrót)

- Brak Owner GO przy write-path godzin / merge / fence / Edge payroll.  
- Mixed commit FEATURE + `cloud-sync` / payroll lib / Edge.  
- „Szybki” `batch-set` / omijanie Domain Push / PWRB.  
- Usuwanie resurrection fence „dla testów”.  
- Tip z pamięci czatu zamiast [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md).

---

## 3. Po Manualu

→ [`FEATURE_IMPLEMENTATION_CHECKLIST.md`](FEATURE_IMPLEMENTATION_CHECKLIST.md) → IMPLEMENT.
