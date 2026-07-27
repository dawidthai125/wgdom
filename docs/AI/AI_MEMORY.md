# AI_MEMORY — pamięć projektu WGDOM

> **To NIE jest pamięć ChatGPT.** To jest **kontrakt projektu** — rzeczy, których AI **nie wolno zapomnieć**.  
> **Czytaj na start każdej sesji** (≤ 5 min). Szczegóły → linki SSOT (bez duplikacji).  
> **Drzewo decyzji:** [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md)

```text
LISTA PŁAC = PRIORYTET #1
Nie zgaduj architektury. Nie obchodź guardów. Nie mieszaj FEATURE z CORE.
```

---

## Fundamental Rules

1. Stack = **Vite + React SPA** — **nie** Next.js / SSR.  
2. Trwałe dane → **Cloud Sync** (`persistKey` / Domain Push / PWRB) — nie tylko React state / samo LS.  
3. **STABILIZATION WINDOW** — nowy EPIC tylko po **Owner GO**.  
4. Commit / push **tylko** na wyraźną prośbę Ownera.  
5. Nie czytaj `App.tsx` od zera — mapa: [`../AGENT-APP-MAP.md`](../AGENT-APP-MAP.md).

**SSOT procesu:** [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) · [`../WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md)

---

## Architecture Principles

| Zasada | Znaczenie |
|--------|-----------|
| **SSOT** | Jedna reguła na domenę — nie duplikuj merge / write path · tip tylko w `09` |
| **REUSE FIRST** | Istniejąca facade (PWRB, Domain Push, `Wg*`) > nowy kod |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej ścieżki merge / persist / roster |
| **Thin Slice** | Jeden concern · cienki allowlist · DF · commit · PV · potem next |
| **Cloud First** | Nowy typ danych → `DATA_KEYS` + sync |
| **Boundary Check** | FEATURE ≠ CORE w jednym commit (#CORE-013) |
| **Fail-closed** | Guardy / fence zostają — nie „wyłącz na chwilę” |

**SSOT:** [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) · [`02_ARCHITECTURE.md`](02_ARCHITECTURE.md) · stan: [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)

---

## UI Foundation · GDS · Dashboard Body

| Warstwa | Status | Nie rób |
|---------|--------|---------|
| **GDS-01 + MAINT-01** | **CLOSED** · DS-13 | Parallel Button/Input/Modal · shadcn bez DF |
| **UI Foundation v1.0** | **COMPLETE** · ui-guard **9/9** | Regresja shell / T05 (≤1 hero Primary) |
| **Dashboard Body S1–S4** | **COMPLETE** · mid-body GDS | Second Primary w body · zmiana liczników V3 w paint |
| **S5 / S6** | BACKLOG (opcjonalne) | Auto-start bez Owner GO |

Closeout: Foundation [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) · Body [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md)

---

## AI-COST-01 (Kosztorysant) — FROZEN

| Pole | Wartość |
|------|---------|
| Status | **EPIC COMPLETE** · **FIELD READY** · **ARCHITECTURE FROZEN** |
| Pipeline | Snapshot → S1→S7 → Bid Proposal → UI |
| Oferta | **Tylko** `computeTenderBidProposal` (`offer_boq_ai`) — **zakaz** drugiego Kp/marży |
| STAB-01 | Preservacja edycji usera · grupy rekomendacji · klasyfikacja · pokrycie · explain · telemetria LS |
| AI-COST-02 | **COST-02-A CLOSED** (Modele cenowe · **2.65.62**) · dalsze slice **BACKLOG** · Starting Point + Owner GO |

**Nie:** przebudowa parserów „przy AI Cost” · kasowanie `user_changed`/`user_approved` przy reprice · scrapowanie cen ad-hoc.

---

## Payroll Critical Rules

- Godziny live → **tylko Domain Push** (nie RS `runCloudSync`).  
- Skład tygodnia → **tylko PWRB**.  
- `weekEmployeeFromDir` = **PURE**.  
- `skipPayrollGuard` ⇔ `intentionalHoursClear === true` (≠ week-clear po archive).  
- Fence resurrection + classifier ALIGN/ROLLOVER = **ACTIVE**.  
- D4 `-prev` banner ≠ archive Restore Banner.

**SSOT:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) · [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md)

---

## Cloud Sync Rules

- Merge Payroll = **UNION + tombstones** — nie replace „dla wygody”.  
- RS push **bez** `kw-week-employees` (#CORE-015).  
- Partial / fat keys → kontrakt persist `local` vs `cloud` (Sync Storm).  
- Nie `fetch` Edge prosto z UI poza facade.

**SSOT:** [`../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §11

---

## Bootstrap Rules

- Bootstrap = `CloudLoader` → merge → **fence** → mount.  
- Pusta chmura + bogaty LS ≠ „przywróć wszystko”.  
- Nie usuwaj `payroll-bootstrap-resurrection-fence` dla E2E/seed.

**SSOT:** SSOT Payroll §1 · Agent Guide · Resurrection closeout w tip `09`

---

## SSOT Rules

| Temat | Jeden dokument |
|-------|----------------|
| Tip prod | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| Zakazy globalne | [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) |
| Payroll AI | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Deploy | [`../WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md) |
| Sesja / stan | [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) · `CURRENT-TASK.md` · Continuity (po Entry) |
| UI Foundation | [`../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| Dashboard Body | [`../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **AI-COST-01 Freeze** | [`../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) |
| **AI-COST-01 SSOT** | [`../architecture/WGDOM-AI-COST-01-SSOT.md`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST Lessons** | [`../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AI-COST-02 start** | [`../architecture/WGDOM-AI-COST-02-STARTING-POINT.md`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) |
| **COST-02-A CLOSEOUT** | [`../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |
| **COST-02-A RELEASE** | [`../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md`](../architecture/WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) |

Historyczne DF/RCA = czytaj przy potrzebie; **closeout CLOSED** = prawda statusu.  
Draft `WGDOM-AI-COST-01-ARCHITECTURE.md` = **SUPERSEDED**.

---

## Feature vs Write Path

| | FEATURE | WRITE-PATH / CORE |
|--|---------|-------------------|
| Przykład | Copy UI, Theme, TEUX | `cloud-sync`, merge, Domain Push, Edge, PWRB |
| Commit | Osobny bundle | Osobny CORE + DF + GO |
| Test | Smoke modułu | Gate B payroll + unit D2–D5 gdy hours |

FEATURE w oknie czasu **może współwystępować** z wipe LP **bez** bycia RC write-path — i tak: **nie mieszaj Shared**.  
→ [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) §8 · [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md)

---

## Mandatory Audit Rules

**AUDIT ONLY (docs)** gdy: nieznany objaw LP · Shared bez jasnego wpływu · Owner „sprawdź czy X psuje Payroll” · wipe / resurrection.  
**Nie** implementuj w trakcie AUDIT.

→ [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) · [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md)

---

## Mandatory Design Freeze Rules

**DF obowiązkowy** gdy: invariants · merge · guard · fence · nowy write path · nowy klucz KV · zmiana bootstrap.  
Cosmetic FEATURE bez CORE → Boundary Check, bez DF (chyba że Owner każe).

---

## Dependency Review Rules

Przed kodem w „innym” module:

```text
□ Czy diff = cloud-sync / CloudLoader / Edge / App payroll handlers?
□ Czy DATA_KEYS obejmuje kw-week-*?
□ Czy commit miesza FEATURE + CORE?
```

TAK → Payroll pack obowiązkowy. → [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md)

---

## Forbidden AI Behaviors

- Zgadywanie architektury / „temporary HACK” w CORE  
- Omijanie Domain Gate / PWRB / fence  
- Mixed FEATURE + CORE  
- `vercel deploy` / polling `version.json`  
- Commit sekretów / force push `main`  
- Start EPIC bez Owner GO  
- Hotfix merge po wipe bez RCA  
- Drugi kalkulator oferty / przebudowa AI-COST-01 bez DF  
- Auto-start kolejnego thin slice AI-COST-02 bez Owner GO + DF  
- Re-implementacja COST-02-A „przy okazji”

Pełna lista: [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) · [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) · [`LESSONS`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md)

---

## Common AI Mistakes

| Skrót | Skutek |
|-------|--------|
| `batch-set` z UI | Omija guardy |
| `skipPayrollGuard` zawsze | Hours Wipe |
| Soft Restore w `weekEmployeeFromDir` | Side-effects |
| Usunięcie fence „dla testów” | Resurrection prod |
| Refaktor merge „przy Jobs/Tenders” | Regresja LP po dniach |

→ [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md)

---

## Before Coding Checklist

```text
□ AI_MEMORY + AI_DECISION_TREE
□ 08_AI_GUARDRAILS + 09 tip
□ Dependency Map (Shared?)
□ Jeśli Payroll/sync → Quick Start → Guard Rails → Playbook → SSOT
□ FEATURE vs CORE sklasyfikowane
□ Owner GO jeśli IMPLEMENT CORE
□ DF jeśli write-path / merge / bootstrap
```

---

## Before Commit Checklist

```text
□ Diff ⊆ scope DF/brief
□ Zero mixed CORE+FEATURE
□ Brak secrets; nowe src tracked
□ Gate B payroll jeśli CORE
□ Owner poprosił o commit
```

---

## Before Push Checklist

```text
□ Owner poprosił o push
□ RELEASE A/B/C wg WORKFLOW-RELEASE-DEPLOY
□ Nie vercel CLI
□ Jedno curl version.json (bez pętli)
```

---

## Następny krok

→ [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) (§ NEXT) · [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) · Index: [`README.md`](README.md)
