# 08 — AI Guardrails (WGDOM) ★ NAJWAŻNIEJSZY

> **Przeczytaj ten plik PRZED jakąkolwiek zmianą kodu.**  
> Cel: nowe AI wie, **czego NIE wolno robić**.

---

## 0. Zasada nadrzędna

```text
Nie zgaduj architektury.
Nie implementuj bez briefu / Owner GO.
Nie psuj Listy Płac.
Nie mieszaj FEATURE z CORE.
```

Gdy wątpliwość → **STOP** → AUDIT / pytanie do Ownera.

---

## 1. Absolutne zakazy (NIE WOLNO)

| # | Zakaz |
|---|--------|
| 1 | **Zmieniać architektury** (sync, merge, bootstrap, Edge, pipeline heavy) **bez RCA + DF + Owner GO** |
| 2 | **Zmieniać / obchodzić SSOT** domeny (PWRB, fence, rollover, HEAVY_E_RUN_DEP_KEYS, merge photos) |
| 3 | **Dodawać duplicate business logic** (drugi merge weekEmployees, drugi persist pipeline, drugi roster) |
| 4 | **Omijać Cloud Sync** (`fetch` prosto do Edge z UI zamiast `persistKey` / Domain Push / kontraktu) |
| 5 | **Zmieniać Tender Engine / heavy E-RUN** bez analizy wpływu Sync Storm (deps, persist modes, coalesce) |
| 6 | **Dotykać Payroll CORE** bez [`PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) + Quality Gate + Owner GO |
| 7 | **Usuwać debug API** oznaczone **KEEP (DEBUG)** bez cleanup GO |
| 8 | **Włączać** `*_DIAG_AUTO_ENABLE = true` na prod |
| 9 | **Wkładać `builtAt` / parserVersion` do E-RUN deps** heavy lazy |
| 10 | **Partial heavy → cloud** w pętli (partial = `persist:"local"`) |
| 11 | **Mixed commit** FEATURE UI + `cloud-sync.ts` / payroll / Edge (#CORE-013) |
| 12 | **`vercel deploy` / `--prod`** zamiast push `main` |
| 13 | **Polling** `version.json` / Vercel API po push |
| 14 | **Commit / push** bez wyraźnej prośby Ownera |
| 15 | **Force push** na `main` |
| 16 | **Commit sekretów** (`.env`, service role, backup haseł) |
| 17 | **Usuwać / omijać** `payroll-bootstrap-resurrection-fence` |
| 18 | **Cofać** `classifyPayrollWeekTransition` (ALIGN ≠ wipe) |
| 19 | **Mutować roster tygodnia** poza PWRB |
| 20 | **`skipPayrollGuard` bez** `intentionalHoursClear === true` |
| 21 | **Modyfikować** `weekEmployeeFromDir` (musi zostać PURE) — Soft Restore tylko overlay |
| 22 | **Pisać godziny live poza Domain Push** / przywracać LP do RS push |
| 23 | **Łączyć** D4 `-prev` banner z archive Restore Banner |
| 24 | **Nowy write path Payroll** bez Architecture Review + Owner GO |
| 25 | **Nadpisywać `photos[]`** bez union + tombstones |
| 26 | **Start nowego EPIC** w STABILIZATION WINDOW bez Owner GO |
| 27 | **Implementować LOCALSTORAGE-ARCH-02F / Edge kv-chunk / H0.x** bez jawnego IMPLEMENT |
| 28 | **Czytać i „naprawiać” cały `App.tsx`** od zera |
| 29 | **Zakładać Next.js / SSR** — stack to Vite + React SPA |
| 30 | **Szybkie „temporary HACK”** w prod bez ticketu i closeout |

---

## 2. Zakazy warunkowe (tylko z GO)

| Obszar | Warunek |
|--------|---------|
| `cloud-sync.ts` | CORE bundle + człowiek Owner GO |
| `CloudLoader.tsx` bootstrap | j.w. |
| `supabase/functions/**` | j.w. + świadomość deploy Action |
| `useTenderDossierHeavyLazy` | DF Sync Storm / nowy AUDIT |
| `tender-ux-tokens.ts` typography | TOKEN FREEZE (wyjątek TWSL z GO) |
| Theme SSOT Light/Dark | THEME DF |
| Work Catalog FREEZE | foundation freeze docs |

---

## 3. Obowiązkowe „zanim zakodujesz”

```text
□ AI_MEMORY + AI_DECISION_TREE
□ Czytałem 08_AI_GUARDRAILS + 09_PRODUCTION_BASELINE
□ Znam scope (FEATURE vs CORE)
□ Boundary Check (#CORE-014) — lista plików
□ Jeśli Payroll/Sync — `PAYROLL_QUICK_START` → `PAYROLL_GUARD_RAILS` → `PAYROLL_AI_PLAYBOOK` → PAYROLL-ARCHITECTURE-SSOT + (głęboko) Cloud Sync Agent Guide
□ Dependency Map — czy Shared może uszkodzić LP?
□ Payroll checklist: W1 PWRB · W2 Domain Push · Cloud Sync merge · SSOT · fence · gate D2/D3
□ Jeśli Tenders heavy — Sync Storm kontrakt
□ Jeśli persist — local vs cloud mode
□ Owner GO / IMPLEMENT wypowiedziane
□ Plan testów / smoke istnieje
□ Zakaz implementacji „na skróty”
```

Bez checkboxów → **nie implementuj**.

---

## 4. Obowiązkowe „zanim commit”

```text
□ Diff tylko w scope DF
□ Zero mixed CORE+FEATURE
□ CHANGELOG jeśli UI
□ Gate B jeśli payroll/tenders CORE
□ Brak .env / secrets
□ Nowe pliki src/ są tracked
□ Owner poprosił o commit
```

---

## 5. Obowiązkowe „zanim push”

```text
□ Owner poprosił o push
□ RELEASE checklist A/B/C
□ Nie używasz vercel CLI deploy
□ Po push: jedno curl version.json (bez pętli)
```

---

## 6. Dokumentacja vs kod

| Polecenie Ownera | Wolno |
|------------------|--------|
| „przygotuj audyt / RCA / DF” | tylko docs |
| „IMPLEMENT …” | kod w scope |
| „tylko dokumentacja” | **zero** zmian `src/` |
| „commit” / „push” | git tylko wtedy |
| „kontynuuj WGDOM” | czytaj continuity + stan; nie auto-koduj |

---

## 7. Red flags w PR / diff (odrzucaj)

- Nowy `useEffect` zależny od `builtAt` startujący heavy parse.  
- `saveTendersPipeline` w pętli partial.  
- `setWeekEmployees` / bezpośrednia mutacja roster poza PWRB.  
- `localStorage.clear` / masowy wipe KV.  
- Retry na wszystkie 5xx (w tym HTML 522).  
- Usunięcie fence „bo psuje seed”.  
- `AUTO_ENABLE = true`.

---

## 8. Gdy coś się pali na prod

1. **Nie** pushuj hotfixa bez RCA (chyba że Owner: emergency + scope).  
2. Zbierz Network + `version.json` + Edge `/health`.  
3. Klasyfikuj: Sync Storm vs Payroll vs Egress vs Platform.  
4. Dokumentuj Evidence Matrix.  
5. Fix minimalny w osobnym CORE bundle.

---

## 9. Skrót mentalny

```text
SSOT > pomysł
Reuse > nowy plik
Fence > „wygodny seed”
Local partial > cloud storm
Owner GO > „zróbmy szybko”
Gate > nadzieja
```

---

## 10. Linki obowiązkowe

| Temat | Doc |
|-------|-----|
| Continuity | [`docs/AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md) |
| Payroll | [`docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |
| Owner GO | [`docs/WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) |
| Release | [`docs/WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md) |
| Core checklist | [`docs/architecture/CORE-01A-CHANGE-CHECKLIST.md`](../architecture/CORE-01A-CHANGE-CHECKLIST.md) |
| Sync Storm | [`docs/architecture/TENDERS-SYNC-STORM-P0-RELEASE-01.md`](../architecture/TENDERS-SYNC-STORM-P0-RELEASE-01.md) |
| Final audit | [`docs/architecture/WGDOM-FINAL-PRODUCTION-AUDIT-01.md`](../architecture/WGDOM-FINAL-PRODUCTION-AUDIT-01.md) |
