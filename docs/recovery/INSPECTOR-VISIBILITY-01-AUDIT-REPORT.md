# INSPECTOR-VISIBILITY-01 — Audyt widoczności robót inspektora

> **Status:** **AUDIT COMPLETE** · **ROOT CAUSE NOT CONFIRMED** · **RUNTIME EVIDENCE OPEN**  
> **Data audytu:** 2026-07-08  
> **Bundle ID:** **INSPECTOR-VISIBILITY-01**  
> **Class:** **CORE BUGFIX** (#CORE-013 · #CORE-014)  
> **Baseline prod:** UI **2.63.73** · commit **`84b1491`**  
> **Epic powiązany:** **INSPECTOR-JOB-ASSIGN-001** (v2.63.13) · [`INSPECTOR-JOB-ASSIGN-001-DESIGN-FREEZE.md`](../INSPECTOR-JOB-ASSIGN-001-DESIGN-FREEZE.md)

```text
CEL:     Ustalić, dlaczego inspektor „Szymon” nie widzi przypisanych robót.

ZAKRES:  Filtrowanie przypisań · role · mapowanie ID · predykaty widoczności ·
         ładowanie danych · spójność sync.

WORKFLOW: AUDIT ✅ → RUNTIME EVIDENCE ⏸ → PLAN ⛔ WITHHELD → FREEZE ⛔ → OWNER GO ⛔ WITHHELD
```

---

## 0. Werdykt audytu

| Pole | Wartość |
|------|---------|
| **AUDIT** | **COMPLETE** |
| **Root cause** | **NOT CONFIRMED** — brak dowodu buga filtra; KV zgodne ze spec (#003). |
| **Evidence KV** | 17 jobs · 15× `szymon` · 2× Zofia (`custom-d3918ba7-…`) · 0 missing `assignedInspectorId`. |
| **Evidence device** | **PENDING** — [`INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md`](./INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md) |
| **OWNER GO** | **WITHHELD** — do runtime confirmation |
| **IMPLEMENT** | **BLOCKED** |

### 0.1 Rekomendacja operacyjna (natychmiast, bez kodu)

Jeśli chodzi o roboty **Chrobrego MOPS** i **Wysoka Mops** — w Robotach (admin) ustaw **Inspektor WM → Szymon Szóstak** i zapisz. Obecnie w KV: `assignedInspectorId = custom-d3918ba7-…` (Zofia).

---

## 1. Dowód prod KV (read-only, 2026-07-08)

Skrypt: `scripts/audit-inspector-visibility-readonly.mjs`

| Metryka | Wartość |
|---------|---------|
| **Łącznie robot (`kw-jobs`)** | **17** |
| **Bez `assignedInspectorId`** | **0** (migracja #008 **PASS**) |
| **Przypisane do `szymon`** | **15** |
| **Przypisane do `custom-d3918ba7-…` (Zofia)** | **2** |
| **`filterJobsForInspector(jobs, "szymon")`** | **15** |

### 1.1 Roboty niewidoczne dla Szymona (KV)

| `id` (skrót) | Adres | `assignedInspectorId` |
|--------------|-------|------------------------|
| `665ba4f7-…` | Chrobrego MOPS | `custom-d3918ba7-1b9b-4e9c-a17a-64c18dc70abe` |
| `3fb13d07-…` | Wysoka Mops | `custom-d3918ba7-1b9b-4e9c-a17a-64c18dc70abe` |

**Wniosek:** To nie jest błąd filtra — to **świadome przypisanie** do innego konta inspektora.

---

## 2. Mechanizm widoczności (as-is)

### 2.1 Predykat SSOT (#003)

```typescript
// src/lib/inspector-job-assignment.ts
job.assignedInspectorId === session.id  // strict equality
```

| Warstwa | Zachowanie |
|---------|------------|
| `jobsAll` | Pełna tablica po merge LS + chmura (#012) |
| `jobsVisible` | `filterJobsForInspector(jobsAll, inspectorId)` — **tylko UI** |
| Admin `JobsView` | **Brak filtra** — widzi wszystkie (#004) |
| `InspectorAdminView` | **Brak filtra** (#005) |

### 2.2 Mapowanie ID (#001)

| Pole | Źródło | **Nie** jest |
|------|--------|--------------|
| `assignedInspectorId` | `AdminSession.id` z `admin-auth.ts` | `kw-directory` · `executionAssigneeDirectoryIds` |

**Szymon:** `id = "szymon"` (builtin, `role: "inspector"`).

**Częsty błąd interpretacji:** „przypisanie ekipy” (`executionLeadDirectoryId` / `executionAssigneeDirectoryIds`) **nie wpływa** na panel inspektora.

### 2.3 Ładowanie i sync (`InspectorPanel.tsx`)

```text
Mount → localStorage cache (kw-jobs) → refreshFromCloud()
       → mergeJobsById(local, cloud, tombstones)
       → jobsAll → jobsVisible = filter(...)
```

| Mechanizm | Status audytu |
|-----------|---------------|
| Cloud pull mount/focus/120s | **PASS** (istnieje) |
| Storage listener cross-tab | **PASS** |
| `mergeAssignedInspectorId` | **PASS** — undefined nie kasuje istniejącego ID |
| Persist tylko `jobsAll` | **PASS** (#012) |

### 2.4 Uprawnienia roli

| Rola | Roboty w UI |
|------|-------------|
| `inspector` | Tylko `jobsVisible` |
| `admin` / `super_admin` | Wszystkie (Roboty) |
| `moderator` | Wszystkie (bez stawek) |

Brak dodatkowego ACL poza `assignedInspectorId`.

---

## 3. Findings

### 3.1 P0 — dane / produkt

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| IV-01 | **2 roboty prod przypisane do Zofii**, nie do Szymona — Szymon **nie zobaczy** ich (by design #003). | **P0** | Probe §1.1 |
| IV-02 | Jeśli zgłoszenie = „**zero** robót”: prod KV ma **15** dla `szymon` → problem **nie** w filtrze KV, lecz sync/urządzenie/konto. | **P0** | Probe vs symptom |
| IV-03 | **HelpView** (`GuideView.tsx`): „Inspektor widzi **wszystkie** roboty” — **fałsz** od v2.63.13. | P1 | `GuideView.tsx` ~L543 |

### 3.2 P1 — ścieżki tworzenia (preventive)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| IV-04 | `addJob()` → `defaultJob()` **bez** `assignedInspectorId`; dodaje do stanu **przed** walidacją. | P1 | `JobsView.tsx` L1057–1060 |
| IV-05 | `executeCreateJobFromTender()` — to samo; brak inspektora przy tworzeniu z przetargu. | P1 | `create-job-from-tender.ts` L50 |
| IV-06 | `updateJob()` blokuje zapis bez inspektora (#009), ale **auto-sync admina** (debounce 2s) może wypchnąć robotę bez pola jeśli nigdy nie zapisano poprawnie. | P1 | `App.tsx` auto-push · prod 0 missing dziś |

### 3.3 P1 — UX inspektora

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| IV-07 | Empty state: „Brak robót w tym filtrze” — **nie rozróżnia** `jobsAll.length > 0` && `jobsVisible.length === 0` (przypisanie vs filtr statusu). | P1 | `InspectorPanel.tsx` ~L1451 |
| IV-08 | Brak telemetrii / UI: ile robót w `jobsAll` vs ile po filtrze przypisania. | P2 | — |

### 3.4 Odrzucone hipotezy

| Hipoteza | Werdykt |
|----------|---------|
| Migracja #008 nie wykonana | **ODRZUCONA** — 0/17 missing w KV |
| `session.id` ≠ `"szymon"` dla Szymona | **ODRZUCONA** — builtin `id: "szymon"` |
| Merge kasuje `assignedInspectorId` | **ODRZUCONA** — `mergeAssignedInspectorId` zachowuje wartość gdy incoming pusty |
| Filtrowanie po `executionAssigneeDirectoryIds` | **ODRZUCONA** — nie używane w inspektorze |
| Inspektor nie ładuje `kw-jobs` | **NIEPEWNE** — wymaga repro na urządzeniu Szymona |

---

## 4. Macierz scenariuszy

| Scenariusz | Oczekiwane | Prod KV | Werdykt |
|------------|------------|---------|---------|
| Szymon loguje się jako builtin | Widzi roboty z `assignedInspectorId === "szymon"` | **15** | **PASS** |
| Szymon oczekuje robot Zofii | Widzi je | **0** (2 u Zofii) | **BY DESIGN** — zmiana przypisania w admin |
| Szymon widzi **0** przy 15 w KV | 15 | ? urządzenie | **INVESTIGATE** — sync/cache/konto |
| Admin widzi wszystkie | 17 | 17 | **PASS** |
| Nowa robota bez inspektora | Niewidoczna dla inspektora | 0 takich w KV | **PASS** (fail-closed) |

---

## 5. Root cause — podsumowanie

### RC-A (potwierdzony prod) — **Przypisanie do innego inspektora**

Po **INSPECTOR-JOB-ASSIGN-001** widoczność jest **wyłącznie** po `assignedInspectorId`. Dwie roboty WM mają inspektora **Zofia** (konto custom), więc **Szymon ich nie zobaczy**. Pozostałe **15** powinny być widoczne.

### RC-B (hipoteza — symptom „zero”) — **Warstwa klienta**

Gdy użytkownik widzi **0** robót mimo RC-A:

1. **Stary cache** `localStorage kw-jobs` bez sync (pull fail) — rzadkie po `refreshFromCloud`.
2. **Złe konto** — logowanie jako Zofia (2 roboty) lub inny custom inspector.
3. **Filtr UI** „Aktywne” przy 0 aktywnych przypisanych — mylący empty state (IV-07).
4. **Wersja app** sprzed 2.63.13 na urządzeniu — mało prawdopodobne przy prod 2.63.73.

### RC-C (dług techniczny) — **Dokumentacja / UX**

HelpView obiecuje „wszystkie roboty”; empty state nie wskazuje przypisania WM.

---

## 6. Affected files

| Plik | Rola w incydencie |
|------|-------------------|
| `src/lib/inspector-job-assignment.ts` | SSOT filtra · `filterJobsForInspector` · merge |
| `src/app/InspectorPanel.tsx` | `jobsAll` / `jobsVisible` · sync · empty state |
| `src/lib/admin-auth.ts` | `id: "szymon"` · `listInspectorUsersForLogin()` |
| `src/app/JobsView.tsx` | UI przypisania · walidacja #009/#010 |
| `src/lib/cloud-sync.ts` | `mergeAssignedInspectorId` w `mergeJobsById` |
| `src/app/app-domain.ts` | `normalizeJob` · `defaultJob` (brak pola) |
| `src/lib/create-job-from-tender.ts` | Tworzenie bez inspektora |
| `src/app/GuideView.tsx` | Nieaktualna instrukcja „wszystkie roboty” |
| `docs/INSPECTOR-JOB-ASSIGN-001-DESIGN-FREEZE.md` | Spec #003 — zachowanie zgodne |
| `scripts/audit-inspector-visibility-readonly.mjs` | Probe read-only (audyt) |
| `scripts/audit-pre-release-inspector-job-assign.mjs` | Scenariusz A/B release |

**Poza zakresem:** Payroll · Edge · `kw-directory` jako SSOT inspektora.

---

## 7. Risk assessment

| Ryzyko | Klasa | Opis |
|--------|-------|------|
| Zmiana filtra „Szymon widzi wszystko” | **P0** | Łamie INSPECTOR-JOB-ASSIGN-001 #003 · regresja multi-inspector (Zofia) |
| Tylko fix danych (reassign 2 roboty) | **Niskie** | Zgodne z produktem · bez deployu |
| Runtime fallback `missing → szymon` w filtrze | **P1** | Ukrywa błędy przypisania · konflikt z #008 post-migracja |
| Fix HelpView + empty state | **Niskie** | UX/dokumentacja · nie zmienia danych |
| Walidacja przed pierwszym push nowej roboty | **Średnie** | Zapobiega IV-04/05/06 · dotyka admin flow |
| #CORE-013 mixed commit | **P0** | Bundle musi być izolowany od NG-08 / payroll |

---

## 8. Proposed minimal fix (do PLAN / FREEZE)

**Wybór zależy od potwierdzonego symptomu u właściciela:**

### Fix-0 — Operacyjny (zalecany najpierw) · **0 LOC**

1. Roboty → edycja **Chrobrego MOPS** + **Wysoka Mops** → **Inspektor WM: Szymon Szóstak** → zapis.
2. Na urządzeniu Szymona: wyloguj/zaloguj · pull-to-refresh w panelu inspektora.
3. Weryfikacja: `npx vite-node scripts/audit-inspector-visibility-readonly.mjs` → `szymonVisibleCount: 17`.

### Fix-1 — UX/dokumentacja (minimal code) · **CLASS: BUGFIX + UX**

| Zmiana | Plik |
|--------|------|
| Empty state: gdy `jobsAll.length > 0 && jobsVisible.length === 0` → „Brak robót przypisanych do Twojego konta. Skontaktuj się z administratorem.” | `InspectorPanel.tsx` |
| HelpView: „widzi roboty **przypisane do swojego konta**” (nie „wszystkie”) | `GuideView.tsx` |

**Bez zmiany filtra SSOT.**

### Fix-2 — Preventive (opcjonalny, osobny bundle) · **CLASS: CORE**

| Zmiana | Plik |
|--------|------|
| `defaultJob()` nie trafia do sync bez `assignedInspectorId` — blokada push lub wymóg select przed leave form | `JobsView.tsx` / `App.tsx` |
| `executeCreateJobFromTender` — wymóg inspektora lub prompt | `create-job-from-tender.ts` |

### Fix-3 — **NIE rekomendowany**

Cofnięcie filtra #003 / „Szymon widzi wszystkie WM” — narusza zamrożony epic i konto Zofii.

---

## 9. Test gate (propozycja dla IMPLEMENT)

| Komenda | Cel |
|---------|-----|
| `npx vite-node scripts/audit-inspector-visibility-readonly.mjs` | Prod KV: count per inspector |
| `npx vite-node scripts/smoke-test-inspector-job-assignment.mjs` | Regresja lib |
| `npx vite-node scripts/audit-pre-release-inspector-job-assign.mjs` | Scenariusz A/B (ostrożnie — zapis tymczasowy w B) |
| Owner smoke | Login Szymon → lista ≥15 robót · brak dostępu do robot Zofii |

---

## 10. Workflow status

```text
AUDIT (KV)         ✅ COMPLETE — root cause NOT CONFIRMED
RUNTIME EVIDENCE   ⏸ OPEN ← CURRENT
PLAN               ⛔ WITHHELD
DESIGN FREEZE      ⛔ WITHHELD
OWNER GO           ⛔ WITHHELD
IMPLEMENT          ⛔ BLOCKED
```

---

## 11. Następny krok

1. **Owner (Szymon):** zebrać runtime evidence — [`INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md`](./INSPECTOR-VISIBILITY-01-RUNTIME-EVIDENCE.md) §1–2.  
2. **Dev:** porównać `visibleCount` / `session.id` z probe KV.  
3. **PLAN** dopiero po potwierdzonym `diagnosis` (§3 runbooku).  
4. **OWNER GO** pozostaje **WITHHELD**.

**Zero implementacji** do runtime PASS + OWNER GO.

---

*SSOT audytu INSPECTOR-VISIBILITY-01 · Prod probe: 2026-07-08 · Baseline app: **2.63.73** @ **84b1491**.*
