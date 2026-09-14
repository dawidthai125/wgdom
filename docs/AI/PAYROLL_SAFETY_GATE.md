# PAYROLL SAFETY GATE — obowiązkowy przed IMPLEMENT

> **ID:** AI-DOCS-PAYROLL-GUARD-02  
> **STATUS:** **ACTIVE** · **HARD GATE**  
> **Wejście:** [`AI_ENTRY.md`](AI_ENTRY.md) → Memory → Decision Tree → **TEN PLIK**  
> **Manual (gdy TAK):** [`AI_PAYROLL_SAFETY_MANUAL.md`](AI_PAYROLL_SAFETY_MANUAL.md)

```text
ŻADNEGO IMPLEMENT (FEATURE ani CORE) bez odpowiedzi poniżej.
Jeśli choć jedno TAK → pełna ścieżka Payroll Safety (nie „szybki fix”).
Payroll = CRITICAL PROTECTED MODULE — patrz PAYROLL_CRITICAL_PROTECTED_MODULE.md
```

> **★★ Protected Core (GO6.1 → GO10):** [`PAYROLL_CRITICAL_PROTECTED_MODULE.md`](PAYROLL_CRITICAL_PROTECTED_MODULE.md)  
> **NOWY FEATURE ≠ powód do zmiany Payroll sync.** Bez Owner GO = **BLOCKED**.

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
0. PAYROLL_CRITICAL_PROTECTED_MODULE.md  (GO6.1/GO8.1/GO9.2/GO10 FROZEN)
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
→ STOP IMPLEMENT do Owner GO jeśli write-path / merge / fence / bootstrap / CAS / settlement
```

**Frozen (nie łamać bez osobnego Owner GO):** GO6.1 fence · GO8.1 settlement-retain · GO9.2 single-flight CAS · GO4 ACK · GO10 unsettle-meta NO-FIX.

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
| **CRITICAL PROTECTED** | [`PAYROLL_CRITICAL_PROTECTED_MODULE.md`](PAYROLL_CRITICAL_PROTECTED_MODULE.md) |
| Never break | [`PAYROLL_NEVER_BREAK_RULES.md`](PAYROLL_NEVER_BREAK_RULES.md) |
| Manual | [`AI_PAYROLL_SAFETY_MANUAL.md`](AI_PAYROLL_SAFETY_MANUAL.md) |
| Feature checklist | [`FEATURE_IMPLEMENTATION_CHECKLIST.md`](FEATURE_IMPLEMENTATION_CHECKLIST.md) |
| Decision Tree | [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) |

---

## 5. CURRENT BASELINE (HARDENED + AKORD V1)

| | |
|--|--|
| **Prod (tip)** | **2.66.226** / **`892e04c4`** — live: `version.json` (FETCH) |
| **Status** | **PAYROLL GREEN / HARDENED / CLOSED** · **AKORD V1 CLOSED / PRODUCTION VERIFIED** |
| **SSOT ochrony + CLOSED A–I + AKORD** | [`PAYROLL_CRITICAL_PROTECTED_MODULE.md`](PAYROLL_CRITICAL_PROTECTED_MODULE.md) §11–§20 |
| **AKORD payable SSOT** | [`../PAYROLL-AKORD-PAYABLE-SSOT-4B.md`](../PAYROLL-AKORD-PAYABLE-SSOT-4B.md) |
| **HISTORY — Final Hardening** | 2.66.220 / `73aededf` · 2.66.218 Phase 3 · 2.66.219 P1 remove UX — **nie** CURRENT tip |

---

## 6. PAYROLL COLD-START

```text
1. Ten Gate (G1–G9) → odpowiedź w czacie
2. PAYROLL_CRITICAL_PROTECTED_MODULE.md  (§11 baseline · §12 CLOSED · §13 FROZEN)
3. PAYROLL_NEVER_BREAK_RULES.md
4. git status · HEAD == origin/main?
5. version.json vs tip 09
6. CRITICAL PROTECTED — bez Owner GO = STOP IMPLEMENT
7. Nie reopen CLOSED workstreams
8. Nie ruszaj Payroll przy IK „dla wygody”
9. Cloud authoritative · LS = cache
10. SEARCH BEFORE CREATE (CAS/rebase/intents/tombs już istnieją)
```

Pełna lista: CRITICAL §20.
