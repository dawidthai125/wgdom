# 03 — Engineering Rules (WGDOM)

> Obowiązujące zasady dla ludzi i AI. Źródła: `AGENTS.md`, CORE-01A, Owner GO, Stabilization Window, Payroll Guide.

---

## 1. SSOT FIRST

- Jedna prawda na domenę (nie kopiuj reguł biznesowych między plikami).  
- Przed zmianą znajdź istniejący SSOT (merge, gate, fingerprint, PWRB).  
- Dokumenty „SSOT” w `docs/` mają pierwszeństwo przed domysłami z czatu.

---

## 2. REUSE FIRST / ZERO DUPLICATE LOGIC

- Najpierw wyszukaj istniejącą funkcję (`grep`, AGENT-APP-MAP).  
- **Zakaz** drugiej ścieżki merge / persist / roster dla tej samej domeny.  
- UI może być nowy — logika domenowa zwykle już istnieje w `src/lib/`.

---

## 3. MOBILE FIRST

- Touch ≥44px, input font ≥16px.  
- Krytyczne scroll/touch weryfikuj na prawdziwym iPhone (Playwright ≠ Safari).  
- Mobile Recovery EPIC CLOSED — nie regresuj shell logowania iOS.

---

## 4. Cloud First (dane trwałe)

- Każda trwała mutacja: **LS + Cloud** (lub jawny local-only mode z kontraktem).  
- Nie trzymaj SSOT tylko w React state.  
- Nie obchodź `persistKey` / Domain Push „szybszym” `fetch` do Edge.

---

## 5. No quick fixes / No drive-by

- Bez jawnego briefu: **nie** refaktoruj „przy okazji”.  
- Bez AUDIT→…→Owner GO: **nie** ruszaj CORE.  
- Hotfix musi mieć RCA lub jasny scope — nie „tymczasowy HACK” w prod bez ticketu.

---

## 6. Feature flags / Debug flags

| Typ | Zasada |
|-----|--------|
| Feature (`kw-app-settings`, ACL) | Preferuj flagę zamiast hardcode |
| `pipelinePerfDebouncePersist` | Super Admin — default **OFF**; coalescing heavy używa `force` |
| Diag `*_DIAG_AUTO_ENABLE` | Po 2.65.39: **false**; KEEP(DEBUG) = zostaw API, nie auto-włączaj |
| `VITE_DEBUG_*` | Opt-in lokalny / CI — nie hałasuj prod console |

**Nie usuwaj** debug API oznaczonych **KEEP (DEBUG)** bez Owner GO cleanup.

---

## 7. Release policy

| Zasada | Szczegół |
|--------|----------|
| Deploy FE | tylko `git push origin main` |
| Zakaz | `vercel deploy` / `--prod` / polling Vercel API |
| VERIFY FAST | jedno `curl version.json` |
| CHANGELOG | bump w `changelog-data.ts` przy widocznej zmianie |
| Edge | osobny Action przy `supabase/functions/**` |
| Mixed bundle | **BLOCKED** (#CORE-013) |

Workflow A/B/C: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md).

---

## 8. Owner GO / Stabilization

```text
AUDIT → PLAN → DESIGN FREEZE → ARCH REVIEW → Boundary (#CORE-014)
  → Owner GO → IMPLEMENT
```

- **STABILIZATION WINDOW ACTIVE** — brak nowych epiców bez GO.  
- FEATURE GO może wydać asystent gdy Boundary PASS i zero CORE.  
- **CORE GO** — tylko jawna decyzja człowieka-Ownera.

[`docs/WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md).

---

## 9. Payroll / Protected Core

- Mutacje składu tygodnia → **tylko PWRB**.  
- Nie usuwaj / nie omijaj **resurrection fence**.  
- Nie cofaj **ALIGN vs ROLLOVER**.  
- Przed commitem CORE: gate payroll (`test:infra --gate B --scope payroll`).  
- Reguła #1: FEATURE nie psuje LP.

---

## 10. Tenders / Pipeline

- Nie wkładaj `builtAt` / `parserVersion` do E-RUN deps heavy.  
- Partial heavy → `persist: "local"`; final → `persist: "cloud"`.  
- TOKEN FREEZE TEUX — typography import-only (wyjątki tylko z GO, np. TWSL).  
- Workflow UI SSOT: `WORKFLOW-ARCHITECTURE-v2.63.md`.

---

## 11. Dokumentacja przy zmianie kodu

1. Implementacja (+ cloud jeśli trwałe)  
2. `changelog-data.ts` (+ `CHANGELOG.md`)  
3. Help/hinty jeśli UI  
4. `ARCHITECTURE.md` jeśli architektura  
5. Koniec sesji: `CURRENT-TASK.md` + `PROJECT-HANDOFF-CURRENT.md`

---

## 12. Testy

- Preferuj istniejące `scripts/test-*.mjs` / `npm run test:infra`.  
- Brak uniwersalnego `npm test` — nie zakładaj Jest default.  
- Po Sync Storm: `scripts/test-tenders-sync-storm-p0.mjs`.

---

## 13. Git hygiene

- Commit **tylko** na prośbę Ownera.  
- Nie `--force` na main.  
- Przed push nowego pliku `src/`: upewnij się, że jest **tracked** (ENOENT na Vercel).  
- Nie commit `.env`, service role, backupów z hasłami.

---

## 14. Język

- Podsumowania dla Ownera: **polski**.  
- Identyfikatory / kod: angielski jak w repo.
