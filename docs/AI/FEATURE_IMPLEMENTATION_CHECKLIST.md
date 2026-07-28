# FEATURE IMPLEMENTATION CHECKLIST — obowiązkowa dla AI

> **STATUS:** **ACTIVE**  
> **Kiedy:** przed **każdym** IMPLEMENT (FEATURE i CORE)  
> **Wymaga wcześniej:** [`AI_ENTRY.md`](AI_ENTRY.md) + [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)

---

## A. Wejście (zawsze)

```text
□ Przeszedłem AI_ENTRY → Handoff → Memory → Decision Tree
□ Wypełniłem PAYROLL SAFETY GATE (G1–G9) w czacie
□ Tip z 09_PRODUCTION_BASELINE / version.json (nie z historii czatu)
□ CURRENT-TASK przeczytany (status Ownera) — bez zmiany bez polecenia
□ Zakres = One Bundle = One Goal
```

---

## B. Gdy Gate = ALL-NIE (czysty FEATURE)

```text
□ Diff planowany NIE zawiera: cloud-sync, payroll-*, CloudLoader, Edge merge, kw-week-*
□ Boundary Check: zero Shared providers/hooks wpływających na LP
□ Nie ruszam shell/routing jeśli brief tego nie wymaga (G8/G9 świadomie NIE)
□ Plan testów FEATURE (smoke / e2e tematu) — bez obchodzenia fence
□ Owner GO jeśli workflow wymaga (FEATURE gate)
□ Po implement: VERIFY → commit tylko na polecenie Ownera
```

---

## C. Gdy Gate = ≥1 TAK (Payroll FULL)

```text
□ AI_PAYROLL_SAFETY_MANUAL — read order wykonany
□ PAYROLL_NEVER_BREAK_RULES — odhaczone mentalnie
□ PAYROLL_BOUNDARY_MAP — klasyfikacja FEATURE vs CORE
□ Podobny incident/RCA przeskanowany (INDEX)
□ DESIGN FREEZE jeśli write-path / merge / fence / bootstrap / week cycle
□ Owner GO na IMPLEMENT CORE
□ Gate B --scope payroll gdy CORE
□ #CORE-013 — osobny commit od FEATURE
□ Po implement: dual-device / hours intact / sync observation wg Playbook
```

---

## D. Przed commit / push

```text
□ Owner poprosił o commit / push
□ Brak sekretów · diff ⊆ brief
□ CHANGELOG tylko gdy UI widoczne (i w scope)
□ Nie vercel CLI deploy
□ Po push: jedno sprawdzenie version.json
```

---

## E. Zakazy uniwersalne

```text
□ Nie implementuję „przy okazji” poza briefem
□ Nie refaktoruję Shared „bo ładniej”
□ Nie aktualizuję tipów w 10 plikach — tylko 09_PRODUCTION_BASELINE (+ linki)
□ Foundation Lib: nie FND-06 bez ADR/Blueprint+Spec; nie FND-01…05 bez ACR;
  nie wiruję domen (Przetargi/Roboty/Payroll) bez osobnego EPIC;
  nie mylę z UI Foundation — SSOT: WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md
```
