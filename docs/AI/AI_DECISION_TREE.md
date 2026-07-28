# AI_DECISION_TREE — drzewo decyzyjne WGDOM

> **Cel:** w ≤ 5 min zdecydować, **czy wolno kodować** i **co przeczytać**.  
> **Entry:** [`AI_ENTRY.md`](AI_ENTRY.md) · **Pamięć:** [`AI_MEMORY.md`](AI_MEMORY.md)  
> **HARD GATE (obowiązkowy):** [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) — **przed** IMPLEMENT  
> **Bez duplikacji SSOT** — tylko routing.

```text
START → Safety Gate G1–G9 → ten drzewiec → STOP gdy AUDIT/DF/GO
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
              STOP — pytaj          AI_MEMORY
              Ownera                → PAYROLL_SAFETY_GATE (G1–G9)
                                    → ten drzewiec
```

> **Uwaga:** Safety Gate obejmuje też shell / routing / shared hooks — nie pomijaj go „bo to tylko FEATURE”.

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

NIE → §6b
TAK → Czytaj kontrakt Sync Storm / HARDENING closeouty
    → Nie wkładaj builtAt do E-RUN deps
    → Nie partial→cloud w pętli
    → Zero payroll keys w tym samym FEATURE commit
```

---

## 6b. UI / GDS / Dashboard shell·body?

```text
Czy zmiana = Wg* / Dashboard chrome / body widget / ui-guard?

NIE → §6b2
TAK → DS-13: tylko Wg* (nie shadcn, nie lokalny Button)
    → Thin slice: DF allowlist · zero Primary w body (T05)
    → Nie ruszaj liczników V3 / dashboard-urgent-today w paint
    → Foundation + Body S1–S4 = COMPLETE — nie re-open bez briefu
    → TEUX Strategia ≠ global GDS (osobny tor)
    → SSOT: MASTER_HANDOFF · BODY-02-CLOSEOUT · FOUNDATION-REPORT
    → §8
```

---

## 6b2. Foundation Lib (wgdom-foundation / FND-*)?

```text
Czy zmiana = src/lib/wgdom-foundation/** lub FND-0x / Observability Foundation?

NIE → §6c
TAK → Przeczytaj WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md
    → Phase 0 (FND-01…05) = COMPLETE @ origin/main — nie zmieniaj bez ACR
    → FND-06 Observability = BLOCKED (ADR / Blueprint najpierw) — zakaz IMPLEMENT
    → Nie podłączaj App/Przetargi/Roboty/Payroll bez osobnego EPIC
    → Nie myl z UI Foundation (WGDOM-UI-FOUNDATION-01-*)
    → Proces: Spec → Review → Freeze → Impl a/b/c → Release Gate → commit → push
    → §8 (tylko po Freeze + Owner GO)
```

---

## 6c. AI Cost / OfferBoq / Bid Proposal?

```text
Czy zmiana = tender-offer-boq*, OfferBoq panel, pricing AI,
company knowledge, validation S7, bid adapter, offer_boq_ai?

NIE → §7
TAK → Najpierw przeczytaj:
        WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
        WGDOM-AI-COST-01-SSOT.md
        WGDOM-AI-COST-01-LESSONS-LEARNED.md
    → AI-COST-01 = FROZEN — nie przebudowuj S1–S7 / Bid / preservacji user
    → AI-COST-02? → tylko STARTING-POINT.md + Owner GO + nowy AUDIT→DF
       (Starting Point ≠ Design Freeze ≠ pozwolenie na kod)
    → Zakaz: drugi kalkulator oferty · scraper cen · parser rewrite „przy Cost”
    → §8 (gdy GO + DF na nowy slice)
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
| Stan / NEXT | `MASTER_HANDOFF` |
| UI / GDS / Body | Foundation report · BODY-02 · D-21/D-22 |
| Foundation Lib / FND-* | `WGDOM-FOUNDATION-LIB-PHASE-0-SSOT` |
| AI Cost / oferta | FREEZE · SSOT · Lessons · COST-02 Starting Point |
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
