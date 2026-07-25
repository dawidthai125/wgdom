# PAYROLL-DOCS-HARDENING-AI-SAFETY-01 — AUDIT · GAP · COMPLETION

> **ID:** PAYROLL-DOCS-HARDENING-AI-SAFETY-01  
> **STATUS:** **AUDIT + GAP + DOCS UPDATE COMPLETE** · **COMMIT HOLD** (Owner)  
> **Data:** 2026-07-25  
> **Cel:** Zminimalizować ryzyko regresji Payroll przez przyszłe AI (ChatGPT / Cursor)  
> **Zakaz:** `src/**` · commit · push · zmiany logiki aplikacji

```text
══════════════════════════════════════
PAYROLL DOCUMENTATION HARDENING
AI SAFETY EPIC — DOCS ONLY
══════════════════════════════════════
```

---

## 1. Inventory — przeanalizowane obszary

| Obszar | Przykładowe źródła | Rola |
|--------|-------------------|------|
| **AI KB** | `docs/AI/01`…`12`, `README` | Onboarding globalny |
| **Payroll SSOT** | `docs/PAYROLL-ARCHITECTURE-SSOT.md` | ★ SSOT AI Payroll (ACTIVE) |
| **Sync guide** | `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` | Głęboki merge / Domain Push |
| **PWRB** | `recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md` | Kontrakt W1 |
| **Hours-wipe** | `architecture/PAYROLL-DESIGN-FREEZE-01.md` · EPIC CLOSE · releases history | D1–D5 |
| **Incidents AI** | `AI/04_INCIDENTS_HISTORY.md` · `07_KNOWN_RISKS.md` | Historia + ryzyka |
| **Prior docs audit** | `architecture/PAYROLL-AI-GUARD-DOCS-01-AUDIT.md` | Poprzedni pass (2026-07-24) |
| **Regression window** | `architecture/PAYROLL-REGRESSION-01-*.md` | Okno FEATURE≠write-path |
| **Agent maps** | `AGENTS.md` · `AGENT-ONBOARDING` · `AGENT-APP-MAP` · `AGENT-CONTINUITY` | Start sesji |
| **Living arch** | `ARCHITECTURE.md` §10–11 · `PROJECT-GUIDE` | Sync / Known Issues |
| **Etap 2 / recovery** | `docs/PAYROLL-*` · `docs/recovery/PAYROLL-*` | HISTORICAL (czytać przy RCA) |
| **CI remediation** | `CI-REMEDIATION-EPIC-CLOSEOUT.md` | CI green — nie mieszać z Payroll CORE |

**Skala:** 110+ plików `PAYROLL*` + AI KB + sync — **nie** przepisywane; indeksowane przez SSOT + nowe playbooki.

---

## 2. Status dokumentów (klasyfikacja)

| Dokument | Aktualny? | SSOT? | Uwagi |
|----------|-----------|-------|-------|
| `PAYROLL-ARCHITECTURE-SSOT.md` | **TAK** | **★ Payroll AI** | Zachować; rozszerzony o linki do nowych artefaktów |
| `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` | **TAK** (sync) | Sync głęboko | Banner tip OK |
| `AI/08_AI_GUARDRAILS.md` | **TAK** | Guardrails **globalne** | Payroll szczegóły → nowy Guard Rails |
| `AI/04_INCIDENTS_HISTORY.md` | **TAK** | Incydenty globalne | Payroll skrót → nowy Regression History |
| `AI/01` + `README` | **TAK** | Onboarding index | Uzupełnione o Quick Start / Playbook |
| `AI/09_PRODUCTION_BASELINE.md` | **TAK** | Tip prod | Hours-wipe 2.65.43 |
| `PAYROLL-AI-GUARD-DOCS-01-AUDIT.md` | Historyczny pass | Nie | **SUPERSEDED** przez ten AUDIT (treść zachowana) |
| `docs/PAYROLL-CLOUD-RECOVERY-*` Etap 2 | CLOSED contracts | Nie (history) | Nie kasować |
| `docs/recovery/PAYROLL-RC-B-*` | Forensics | Nie | Nie kasować |
| Session handoffs 20.0A–20.1B | CLOSED | Nie | Historyczne |
| Parent Gate C AUDIT (CI) | STALE tip | Nie | Osobny EPIC CI — CLOSED |

---

## 3. Gap Analysis (przed tym EPIC)

| Wymaganie Ownera | Stan przed | Gap |
|------------------|------------|-----|
| Payroll Architecture (przepływ) | SSOT §1 | OK — lekkie doprecyzowanie week/directory w Dependency Map |
| Najczęstsze błędy AI | SSOT §4.3 + 08 | Brak **jednego** playbook „anty-skróty” |
| Guard Rails (checklists commit/push) | Rozproszone SSOT+08 | Brak **dedykowanego** Payroll Guard Rails |
| Dependency Map | **BRAK** | Co psuje LP z zewnątrz |
| Regression History (Payroll-first) | 04 + SSOT §5 | Brak skondensowanego indeksu RC→prevent |
| AI Playbook (kolejność AUDIT/DF/GO) | Częściowo SSOT §4 | Brak **PLAYBOOK** jako obowiązkowy entry |
| Quick Start | README ogólny | Brak **minimalnego** Payroll-only path |
| Stale risk CI TEUX-7d w 07 | Mówi OPEN | CI Remediation CLOSED — wymaga poprawki |

**Czy Agent zrozumie architekturę tylko z docs?**  
**Częściowo TAK** (po SSOT+08+09) — **pełniej TAK** po Quick Start → Playbook → Guard Rails → Dependency Map → Regression History → SSOT.

---

## 4. Uzupełnienia wykonane (ten EPIC)

| Artefakt | Akcja |
|----------|--------|
| **`docs/AI/PAYROLL_QUICK_START.md`** | **NOWY** — minimalny onboarding |
| **`docs/AI/PAYROLL_AI_PLAYBOOK.md`** | **NOWY** — obowiązkowa kolejność pracy |
| **`docs/AI/PAYROLL_GUARD_RAILS.md`** | **NOWY** — zakazy + checklisty |
| **`docs/AI/PAYROLL_DEPENDENCY_MAP.md`** | **NOWY** — mapa zależności / blast radius |
| **`docs/AI/PAYROLL_REGRESSION_HISTORY.md`** | **NOWY** — historia regresji (skrót) |
| **Ten AUDIT** | **NOWY** |
| `docs/AI/README.md` | Index + ścieżka Payroll |
| `docs/AI/01_AI_ONBOARDING.md` | Link Quick Start / Playbook |
| `docs/PAYROLL-ARCHITECTURE-SSOT.md` | Hub linków do nowych docs |
| `AGENTS.md` | START HERE → Playbook / Quick Start |
| `docs/AI/07_KNOWN_RISKS.md` | L-CI-TEUX7D → **CLOSED** (CI Remediation) |
| `PAYROLL-AI-GUARD-DOCS-01-AUDIT.md` | Banner **SUPERSEDED** |

**Zero Dup:** nowe pliki **indeksują** SSOT — nie kopiują diagramów 1:1.

---

## 5. SSOT map (po hardening)

| Temat | SSOT |
|-------|------|
| Payroll AI (przepływ · invariants · safety) | **`docs/PAYROLL-ARCHITECTURE-SSOT.md`** |
| Sync/merge głęboko | `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` |
| PWRB W1 | `recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md` |
| Hours-wipe design | `architecture/PAYROLL-DESIGN-FREEZE-01.md` |
| Tip produkcji | `AI/09_PRODUCTION_BASELINE.md` |
| Guardrails globalne | `AI/08_AI_GUARDRAILS.md` |
| Guardrails **Payroll** | **`AI/PAYROLL_GUARD_RAILS.md`** |
| Playbook AI Payroll | **`AI/PAYROLL_AI_PLAYBOOK.md`** |
| Quick Start Payroll | **`AI/PAYROLL_QUICK_START.md`** |
| Dependency / blast | **`AI/PAYROLL_DEPENDENCY_MAP.md`** |
| Regression index | **`AI/PAYROLL_REGRESSION_HISTORY.md`** |

---

## 6. Definition of Done (EPIC docs)

| Kryterium | Status |
|-----------|--------|
| Audyt dokumentacji | **PASS** |
| Luki wskazane | **PASS** |
| Dokumentacja uzupełniona | **PASS** |
| AI Playbook | **PASS** |
| Payroll Guard Rails | **PASS** |
| Regression History | **PASS** |
| Onboarding AI zaktualizowany | **PASS** |
| Brak zmian kodu | **PASS** |
| Brak commit / push | **PASS** (HOLD) |
