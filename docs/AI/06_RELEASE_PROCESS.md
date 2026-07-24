# 06 — Release Process (WGDOM)

> SSOT deploy: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md) · Owner GO: [`docs/WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) · Handoff proces: [`docs/PROJECT-HANDOFF.md`](../PROJECT-HANDOFF.md).

---

## Pipeline (obowiązkowa kolejność dla istotnych zmian)

```text
AUDIT → RCA → PLAN → DESIGN FREEZE → ARCH REVIEW → OWNER GO
→ IMPLEMENTATION → TEST → OWNER VERIFICATION
→ COMMIT → PUSH → PRODUCTION → POST RELEASE → CLOSE
```

Hotfix P0 może skrócić dokumentację, **nie** omija Boundary / Payroll Gate dla CORE.

---

## AUDIT

- Read-only.  
- Mapa plików, ścieżek danych, luk, regresji.  
- **Bez** implementacji.  
- Artefakt: `docs/architecture/*-AUDIT*.md` lub `audit/*.md`.

---

## RCA

- Dowody (logi, Network, LS, Edge status, repro).  
- Root cause vs amplifier vs trigger.  
- Hipotezy obalone też zapisuj.  
- Artefakt: `*-RCA.md` / Evidence Matrix.

---

## PLAN

- Zakres, etapy, pliki, ryzyka, out-of-scope.  
- Kryteria PASS/FAIL.  
- Nie zaczynaj kodu.

---

## DESIGN FREEZE

- Zamrożony kontrakt: API, deps, merge rules, AC.  
- Zmiana scope = nowy DF / amend z GO.  
- Artefakt: `*-DESIGN-FREEZE.md`.

---

## ARCH REVIEW

- Werdykt PASS/FAIL względem architektury i Boundary.  
- Projekcja #CORE-013 / #CORE-014.  
- Artefakt: `*-ARCHITECTURE-REVIEW.md` lub sekcja w DF.

---

## OWNER GO

| Ścieżka | Kto |
|--------|-----|
| FEATURE (zero CORE) | Asystent może wydać GO po gates |
| CORE (sync/payroll/edge/…) | **Tylko człowiek-Owner** |

Formuła: `IMPLEMENT <bundle-id>` — strict scope.

W STABILIZATION WINDOW: bez GO = brak nowego epicu.

---

## IMPLEMENTATION

- Tylko pliki z DF.  
- Zero drive-by.  
- CHANGELOG bump jeśli UI widoczne.  
- Trwałe dane → ścieżka cloud zgodna z kontraktem.

---

## TEST

| Poziom | Przykłady |
|--------|-----------|
| Unit/domain | `npx vite-node scripts/test-*.mjs` |
| Gate B | `npm run test:infra -- --gate B --scope payroll\|tenders` |
| Build | `npm run build` |
| E2E | Playwright gdy scope C |

Brak `npm test` default — użyj skryptów projektu.

---

## OWNER VERIFICATION

- Scenariusz Ownera (np. dual-session LP, MOPS Dokumenty, photos delete).  
- Harness OV gdy istnieje (`verify-*-owner.mjs`).  
- Zapis wyników / PARTIAL vs PASS.

---

## COMMIT

- Tylko na prośbę Ownera.  
- Jedna intencja (#CORE-013).  
- Message: why.  
- Nie commit secrets / `.tmp` / backup haseł.

---

## PUSH

- `git push origin main` → Vercel auto.  
- Edge: tylko jeśli zmieniono `supabase/functions/**`.  
- Sprawdź tracked imports (ENOENT).

---

## PRODUCTION

**VERIFY DEPLOY FAST:**

```bash
curl -s https://www.wgdom.fun/version.json
```

| Wynik | Deploy | PRODUCTION VERIFIED |
|-------|--------|---------------------|
| Oczekiwana wersja | PASS | TAK |
| Stara wersja | DEPLOY PROPAGATING | NIE |
| Push fail | FAIL | NIE |

**Zakaz:** sleep/polling `version.json`, Vercel API wait loops.

**RELEASE GO** = build+smoke+commit+push — niezależnie od propagacji.

---

## POST RELEASE

- Krótka obserwacja Ownera (opcjonalnie).  
- `*-POST-RELEASE*.md` / Production Verification.  
- Monitor: console, Network, Edge health, payroll.

---

## CLOSE

- Closeout report + aktualizacja `PROJECT-HANDOFF-CURRENT.md` / `CURRENT-TASK.md` / continuity.  
- Status EPIC = CLOSED.  
- Backlog osobno (nie mieszaj z „domknięte”).

---

## Warianty A / B / C (deploy)

| | Scope | Extra |
|--|-------|-------|
| **A** | docs / hotfix import | build → commit → push → verify FAST |
| **B** | functional UI | + relevant smoke |
| **C** | major | + E2E / pełniejsze smoke |
