# PAYROLL SAFETY GATE — obowiązkowy przed IMPLEMENT

> **ID:** AI-DOCS-PAYROLL-GUARD-02  
> **STATUS:** **ACTIVE** · **HARD GATE**  
> **Wejście:** [`AI_ENTRY.md`](AI_ENTRY.md) → Memory → Decision Tree → **TEN PLIK**  
> **Manual (gdy TAK):** [`AI_PAYROLL_SAFETY_MANUAL.md`](AI_PAYROLL_SAFETY_MANUAL.md)

```text
ŻADNEGO IMPLEMENT (FEATURE ani CORE) bez odpowiedzi poniżej.
Jeśli choć jedno TAK → pełna ścieżka Payroll Safety (nie „szybki fix”).
```

---

## 1. Pytania Gate (odpowiedz TAK / NIE w odpowiedzi do Ownera)

| # | Pytanie | TAK oznacza |
|---|---------|-------------|
| G1 | Czy zmiana **może dotknąć Payroll** (godziny, roster, archive, settled, UI LP, merge weekEmployees)? | Traktuj jak CORE Payroll |
| G2 | Czy zmienia **Local Storage** / storage budget / kasowanie kluczy / migrację LS/IDB? | Blast radius LP keys |
| G3 | Czy zmienia **Cloud Sync** (`cloud-sync.ts`, DATA_KEYS, persist, throttle, Edge merge)? | Shared CORE |
| G4 | Czy zmienia **Bootstrap** / `CloudLoader` / apply bundle / resurrection fence? | Cold-start LP |
| G5 | Czy zmienia **Week Resolver** / `payroll-cycle` / weekFrom–weekTo / ALIGN–ROLLOVER / rollover CTA? | Week model |
| G6 | Czy zmienia **shared hooks** używane przez wiele widoków (np. `useLocalStorage`, sync hooks)? | Cross-module |
| G7 | Czy zmienia **shared providers** / kontekst globalny App? | Orkiestracja |
| G8 | Czy zmienia **shell** (layout chrome, nav root, modal lock, portal body)? | Częsty kollateral FEATURE |
| G9 | Czy zmienia **routing** / deep-link / view switch w `App.tsx`? | Możliwy remount / race |

**Reguła niepewności:** jeśli nie wiesz → **TAK**.

---

## 2. Wynik Gate

### 2a. Wszystkie NIE

```text
→ FEATURE_IMPLEMENTATION_CHECKLIST.md
→ Boundary Check plików w diff (czy na pewno zero Shared?)
→ IMPLEMENT tylko w scope FEATURE + Owner policy
```

Nadal obowiązuje: **#CORE-013** (nie mieszaj FEATURE+CORE w jednym commit).

### 2b. ≥1 TAK

```text
OBOWIĄZKOWO (kolejność):
1. PAYROLL_NEVER_BREAK_RULES.md
2. PAYROLL_BOUNDARY_MAP.md
3. PAYROLL_GUARD_RAILS.md  (+ 08_AI_GUARDRAILS.md)
4. PAYROLL_DEPENDENCY_MAP.md
5. PAYROLL_WEEK_MODEL.md          (gdy G5 lub cycle)
6. PAYROLL_DATA_FLOW_INDEX.md     (gdy G2–G4)
7. PAYROLL_INCIDENT_INDEX.md + PAYROLL_RCA_INDEX.md  (skan podobnych RC)
8. PAYROLL-ARCHITECTURE-SSOT.md
9. PAYROLL_AI_PLAYBOOK.md         (AUDIT → DF → Owner GO)
10. FEATURE_IMPLEMENTATION_CHECKLIST.md  (sekcja Payroll FULL)
→ STOP IMPLEMENT do Owner GO jeśli write-path / merge / fence / bootstrap
```

---

## 3. Mini-protokół odpowiedzi (wklej w czat)

```text
PAYROLL SAFETY GATE
G1 Payroll:     NIE|TAK
G2 LocalStorage: NIE|TAK
G3 Cloud Sync:  NIE|TAK
G4 Bootstrap:   NIE|TAK
G5 Week:        NIE|TAK
G6 Shared hooks: NIE|TAK
G7 Providers:   NIE|TAK
G8 Shell:       NIE|TAK
G9 Routing:     NIE|TAK
Wynik: ALL-NIE | PAYROLL-FULL
Docs przeczytane: …
Owner GO needed: YES|NO
```

---

## 4. Linki

| | |
|--|--|
| Manual | [`AI_PAYROLL_SAFETY_MANUAL.md`](AI_PAYROLL_SAFETY_MANUAL.md) |
| Feature checklist | [`FEATURE_IMPLEMENTATION_CHECKLIST.md`](FEATURE_IMPLEMENTATION_CHECKLIST.md) |
| Decision Tree | [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) |
