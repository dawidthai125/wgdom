# AI_DECISION_TREE — drzewo decyzyjne WGDOM

> **Cel:** w ≤ 5 min zdecydować, **czy wolno kodować** i **co przeczytać**.  
> **Pamięć projektu:** [`AI_MEMORY.md`](AI_MEMORY.md) · **Index:** [`README.md`](README.md)  
> **Bez duplikacji SSOT** — tylko routing.

```text
START → odpowiedz TAK/NIE po kolei → idź gałęzią → STOP gdy wymaga AUDIT/DF/GO
```

---

## START

```text
                    ┌─────────────────────┐
                    │  Masz brief Ownera? │
                    └──────────┬──────────┘
                         NIE   │   TAK
                    ┌──────────┴──────────┐
                    ▼                     ▼
              STOP — pytaj          Czytaj AI_MEMORY
              Ownera                + ten drzewiec
```

---

## 1. Payroll / Lista Płac?

```text
Czy zmiana DOTYKA godzin, roster, settled, rollover, archive LP,
PWRB, Domain Push, kw-week-employees*, albo UI PayrollView?

NIE → §2
TAK → STOP IMPLEMENT do przeczytania:
        PAYROLL_GUARD_RAILS.md
        PAYROLL_DEPENDENCY_MAP.md
        PAYROLL_AI_PLAYBOOK.md
        PAYROLL-ARCHITECTURE-SSOT.md
      → potem §1a
```

### 1a. Write-path godzin / skład?

```text
TAK (godziny / add-remove / merge weekEmployees / skipPayrollGuard)
  → DESIGN FREEZE obowiązkowy (invariants)
  → OWNER GO obowiązkowy przed IMPLEMENT
  → Testy: Gate B --scope payroll + D2–D5 gdy hours
  → SSOT: PAYROLL-ARCHITECTURE-SSOT · Agent Guide sync

NIE (tylko copy/CSS w PayrollView, zero stanu godzin)
  → Boundary Check plików — nadal zero cloud-sync w commit
  → §5
```

---

## 2. Bootstrap / CloudLoader?

```text
Czy diff = CloudLoader, bootstrap merge, resurrection fence,
kolejność apply bundle przy starcie?

NIE → §3
TAK → AUDIT obowiązkowy
    → DESIGN FREEZE obowiązkowy
    → OWNER GO przed IMPLEMENT
    → NIE usuwaj fence
    → SSOT: PAYROLL SSOT § bootstrap · Agent Guide
```

---

## 3. Cloud Sync / Edge / Shared sync?

```text
Czy diff = cloud-sync.ts, Edge batch/merge, DATA_KEYS,
throttle, mutation guard, persist modes?

NIE → §4
TAK → Dependency Review obowiązkowy
        (PAYROLL_DEPENDENCY_MAP.md)
    → Cloud Sync Review (Agent Guide + ARCHITECTURE §11)
    → Jeśli payroll keys w bundle → traktuj jak §1
    → Mixed FEATURE+CORE? → STOP — rozdziel bundle
    → Gate B payroll przed merge CORE
```

---

## 4. localStorage / storage / IDB?

```text
Czy kasujesz, migrujesz, budżetujesz lub przenosisz klucze LS/IDB?

NIE → §5
TAK → Dependency Review
    → Allowlist: NIE kasuj kw-week-* / payroll keys „przy okazji”
    → ARCH-02F / storage EPIC = tylko Owner GO
    → SSOT: Dependency Map §2 · living ARCHITECTURE
```

---

## 5. Więcej niż jeden moduł / Shared?

```text
Czy jeden commit/PR rusza ≥2 domeny
ALBO plik Shared (cloud-sync, App handlers, Edge)?

NIE → §6
TAK → Architecture Review obowiązkowy (docs)
    → Boundary Check #CORE-014
    → Rozważ osobne DF / osobne GO
    → PLAYBOOK: PAYROLL_AI_PLAYBOOK jeśli Shared↔LP
```

---

## 6. Tenders heavy / Sync Storm klasa?

```text
Czy heavy lazy, E-RUN deps, fat pipeline, persist local vs cloud?

NIE → §7
TAK → Czytaj kontrakt Sync Storm / HARDENING closeouty
    → Nie wkładaj builtAt do E-RUN deps
    → Nie partial→cloud w pętli
    → Zero payroll keys w tym samym FEATURE commit
```

---

## 7. Niepewność?

```text
Czy NIE wiesz, czy to FEATURE czy CORE,
albo jaki invariant pęknie,
albo jak testować?

TAK → NIE IMPLEMENTUJ
    → AUDIT / RCA najpierw
    → Potem DF jeśli CORE
    → Potem Owner GO
    → SSOT procesu: 06_RELEASE_PROCESS · PAYROLL_AI_PLAYBOOK

NIE → §8
```

---

## 8. IMPLEMENT dozwolony?

```text
Wszystkie wcześniejsze STOP spełnione?
Owner GO wypowiedziane (gdy CORE)?
DF zamrożony (gdy wymagany)?

NIE → STOP
TAK → Koduj TYLKO w scope DF/brief
    → Przed commit: AI_MEMORY checklist
    → Przed push: Owner + VERIFY FAST (jedno version.json)
```

---

## Szybka ściąga (TAK → dokument)

| Sygnał | Idź do |
|--------|--------|
| Payroll / hours / roster | `PAYROLL_*` + `PAYROLL-ARCHITECTURE-SSOT` |
| Bootstrap | SSOT Payroll + fence · Playbook |
| cloud-sync / Edge | Dependency Map + Agent Guide |
| localStorage keys | Dependency Map §2 |
| Multi-module | Arch Review + #CORE-013 |
| Wipe / bug LP | Regression History · AUDIT ONLY |
| Tip wersji | `09_PRODUCTION_BASELINE` |
| Zakazy globalne | `08_AI_GUARDRAILS` · `AI_MEMORY` |

---

## STOP conditions (twarde)

```text
STOP IMPLEMENT gdy:
  • brak Owner GO na CORE
  • brak DF na write-path / merge / bootstrap
  • nie przeczytano Guard Rails przy Payroll/Shared
  • planujesz mixed FEATURE+CORE
  • chcesz „hotfix merge” po wipe
  • niepewność → RCA first
```

Koniec drzewa → wróć do [`AI_MEMORY.md`](AI_MEMORY.md) checklist przed kodem.
