# PAYROLL DATA FLOW INDEX

> **Indeks przepływów** — diagramy w SSOT / Agent Guide / Flow Map. Tu tylko mapa linków.

| Przepływ | Co to jest | SSOT / mapa |
|----------|------------|-------------|
| **End-to-end architecture** | UI → Domain → W1/W2 → merge → Edge | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) §1 |
| **Write surfaces** | W1 PWRB (skład) · W2 Domain Push (godziny) | SSOT §1 · Guard Rails §2 · Forensics write-path |
| **Read / hydrate** | LS mirror · cloud pull · apply merge | SSOT · Agent Guide |
| **Cloud sync / merge** | `finalizePayrollBundleMerge`, UNION, tombstones, RS vs Domain Push | [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`../recovery/PAYROLL-CLOUD-SYNC-FLOW-MAP.md`](../recovery/PAYROLL-CLOUD-SYNC-FLOW-MAP.md) |
| **Bootstrap / cold start** | CloudLoader · fence · race gate | SSOT bootstrap · [`../architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md`](../architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md) · Resurrection RCA |
| **LocalStorage** | `kw-week-*` · quota · nie kasować przy budget | Dependency Map §2 · LOCALSTORAGE-ARCH docs · Memory |
| **Worker / assignment sync** | Przydziały robót ↔ LP (osobny kontrakt) | [`../SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](../SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) · Dependency Map |
| **Week / rollover** | ALIGN vs ROLLOVER | [`PAYROLL_WEEK_MODEL.md`](PAYROLL_WEEK_MODEL.md) |
| **Boundary** | FEATURE vs CORE surfaces | [`PAYROLL_BOUNDARY_MAP.md`](PAYROLL_BOUNDARY_MAP.md) |

### Write (skrót)

```text
UI mutacja → Domain (App) → W1 PWRB LUB W2 Domain Push → Cloud/Edge
NIGDY: UI → direct batch-set
```

### Read (skrót)

```text
Cold start → CloudLoader / bootstrap merge (+ fence) → state + LS
Pull sync → mergeWeekEmployees* → UI
```

**Głębiej tylko gdy Gate G2–G4 = TAK.**
