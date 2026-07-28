# WGDOM Foundation Library — Phase 0 SSOT

> **ID:** WGDOM-FOUNDATION-LIB-PHASE-0  
> **STATUS:** **ACTIVE** · **Foundation Phase 0 = COMPLETE**  
> **Data:** 2026-07-28  
> **Kod:** `src/lib/wgdom-foundation/`  
> **Zakaz:** nie mylić z **UI Foundation v1.0** (`WGDOM-UI-FOUNDATION-01-*`) ani z Work Catalog `FOUNDATION-FREEZE-v1.0.md`

```text
════════════════════════════════════════════════════════
Foundation Lib = kontrakt techniczny (ID · Digest · Error · Audit · Event)
NIE jest podłączona do Przetargów / Robotów / Kadr / Kosztorysów (jeszcze).
FND-06 Observability = ZABLOKOWANE (brak Implementation Spec → ADR/Blueprint).
════════════════════════════════════════════════════════
```

**Nowa sesja AI:** [`../AI/MASTER_HANDOFF.md`](../AI/MASTER_HANDOFF.md) → [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) → **ten plik** (gdy temat = Foundation Lib / FND-*).

---

## 1. AKTUALNY BASELINE

| Pole | Wartość |
|------|---------|
| **Branch** | `main` |
| **origin/main** | tip zawiera FND-05 · **`bed8dd8`** (`feat(foundation): implement FND-05 event`) |
| **Foundation Phase 0** | **COMPLETE** (FND-01…FND-05) · **wypchnięte** na `origin/main` |
| **UI tip produkcji** | wyłącznie [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) / `version.json` — **nie** hardcoduj tu |
| **Integracja app** | **BRAK** — lib tylko; App / Przetargi / Roboty / Payroll **nie** importują Foundation jako ścieżki domenowej |

### Commity Phase 0 (wszystkie na `origin/main`)

| Pakiet | Commit | Opis |
|--------|--------|------|
| **FND-01** Global Identifiers | **`ae1ef96`** | Prefiksy · ULID · `createId` / validate |
| **FND-02** Canonical Digest | **`c6b881a`** | canonicalize · SHA-256 · `d1_` wire |
| **FND-03** Error System | **`1c435fb`** | `FoundationError` · serialize |
| **FND-04** Audit | **`ca5fbf7`** | `AuditRecord` · `fnd_` · digest pin |
| **FND-05** Event | **`bed8dd8`** | `EventRecord` · `evt_` · digest pin |

**Regresja (DoD):** FND-01 **182 PASS** · FND-02 **178 PASS** · FND-03 **170 PASS** · FND-04/05 aggregatory **COMPLETE PASS**.

**Testy agregujące:**

```bash
npx vite-node scripts/test-foundation-fnd-01.mjs
npx vite-node scripts/test-foundation-fnd-02.mjs
npx vite-node scripts/test-foundation-fnd-03.mjs
npx vite-node scripts/test-foundation-fnd-04.mjs
npx vite-node scripts/test-foundation-fnd-05.mjs
```

---

## 2. Co daje Foundation (kontrakt)

| Pakiet | Katalog | Daje |
|--------|---------|------|
| **FND-01 Identifiers** | `id/` | PublicId z prefiksem (`fnd_`, `evt_`, `snap_`, …) · ULID · `createId` / `isValidId` / brand helpers |
| **FND-02 Digest** | `digest/` | Deterministyczny `canonicalize` · `createDigest` → `d1_<hex64>` · `compareDigest` |
| **FND-03 Errors** | `errors/` | `FoundationError` · `createError` · kody `FND_*` · serialize/deserialize |
| **FND-04 Audit** | `audit/` | Niezmienny `AuditRecordV1` (actor/action/target) · limity payload 16 KiB · opcjonalny digest pin |
| **FND-05 Event** | `events/` | Niezmienny `EventRecordV1` (source/type/subject) · `evt_` · serialize + digest pin · **≠** Audit |

### Root exports

```ts
// src/lib/wgdom-foundation/index.ts
export * from "./id";
export * from "./digest";
export * from "./errors";
export * from "./audit";
export * from "./events";
```

**Nota:** helpery o tych samych nazwach (`deepFreeze`, `normalizePayload`, `isIsoUtcZ`) istnieją w Audit i Event — API domenowe (`createAuditRecord` ≠ `createEvent`) jest rozłączne.

### Definition of Done (Phase 0 — spełnione)

1. Pakiety FND-01…05 w `wgdom-foundation/` + root export.  
2. Agregatory testów PASS.  
3. Regresja poprzednich pakietów PASS.  
4. Release Gate + commit + push na `origin/main`.  
5. **Bez** broker/queue/transport · **bez** Event↔Audit bridge · **bez** podłączenia do UI/KV domen.

---

## 3. Czego Foundation NIE robi (krytyczne)

**Foundation Lib NIE jest jeszcze podłączona do modułów aplikacji.**

W szczególności **nadal nie korzystają** z `wgdom-foundation` jako SSOT technicznego:

- Przetargi / BZP / Tender pipeline  
- Roboty / Jobs / zdjęcia  
- Kadry / Lista Płac / cloud-sync payroll  
- Kosztorysy / AI-COST / OfferBoq / Bid  
- Audit Hub / WM Druk audit (domenowe — **współistnieją**, bez migracji do FND-04)  
- UI shell / GDS (**osobny** „UI Foundation”)

**Foundation = biblioteka bazowa** (kontrakt). Integracja z domeną = **osobny EPIC** + Specification + Owner GO.

---

## 4. Docelowy model warstw

```text
Moduły aplikacji (Przetargi · Roboty · Payroll · AI-COST · …)
        ↓  (przyszła integracja — osobne EPICi)
Foundation Lib (id · digest · errors · audit · events · …)
        ↓
Infrastructure (Vite · Vercel · Supabase Edge/KV · storage)
```

Dziś: aplikacja → Infrastructure (jak dotąd). Foundation leży **obok**, gotowa do reuse.

---

## 5. Proces pracy Foundation (obowiązkowy)

```text
Specification → Architecture Review → Freeze
  → Implementation (slice a → b → c)
  → Release Gate → Commit (jawny git add) → Push (Owner GO)
```

| Etap | Wolno | Nie wolno |
|------|-------|-----------|
| **Specification** | Dokument Impl Spec | Kod · commit |
| **Architecture Review** | Freeze APPROVED/CHANGES | Zmiana Blueprint bez ACR · kod |
| **Freeze** | Locki | Nowe funkcje poza spec |
| **Implementation** | Tylko allowlist plików slice | Root export przed „c” · broker · domeny |
| **Release Gate** | Werdykt GO/HOLD | Commit bez Gate |
| **Commit** | Jawna lista plików pakietu | `git add -A` · WIP mobile/tenders |
| **Push** | Po Owner GO | Force push · amend na remote |

**Źródła procesu (canvas history → repo):** FOUNDATION-01…39 (chat/canvas) · ten SSOT = **trwały** zapis w git.

---

## 6. NASTĘPNY ETAP — FND-06

| Fakt | Wartość |
|------|---------|
| **Nazwa w planie** | Observability (FOUNDATION-01 · Blueprint §9) |
| **Implementation Specification** | **BRAK** |
| **Status** | **ZABLOKOWANE** |
| **Gap report** | canvas `foundation-39-fnd-06-gap` (sesja) — treść przeniesiona poniżej |

**Istnieje tylko:** wysokopoziomowy opis w Technical Architecture Blueprint §9 (logging · metrics · tracing · correlation) oraz slot w MIB/FOUNDATION-01.

**Implementacja FND-06 jest ZABRONIONA**, dopóki nie powstanie:

1. **ADR** (np. ADR-FND-06-OBSERVABILITY) **lub**  
2. **Rozszerzenie Technical Architecture Blueprint** §9 → kontrakt pakietu (API · File Plan · limity · zakazy),

potem:

3. Implementation Specification → Architecture Review → Freeze → Implementation (a/b/c) → Release Gate.

**Nie** zaczynaj FND-07/08 ani Snapshot Foundation-integracji „przy okazji”.

---

## 7. ZASADY DLA NOWYCH AI I AGENTÓW CURSOR

1. **Nie implementuj** niczego Foundation / domeny bez **Specification** (+ Freeze gdy pakiet Foundation).  
2. **Nie zmieniaj** zamkniętych FND-01…05 bez **Architecture Review** + ACR.  
3. **Nie integruj** Przetargów / Robotów / Payroll / AI-COST z Foundation bez **osobnego EPIC** + Owner GO.  
4. **Nie omijaj** Release Gate przed commit/push.  
5. **Nie twórz** nowych pakietów `wgdom-foundation/*` bez Blueprint lub ADR.  
6. Traktuj Foundation jako **stabilny kontrakt** — append-only rekordy Audit/Event; brak update/patch API.  
7. **Nie myl** nazw:  
   - `wgdom-foundation` = **ta** lib (Phase 0 COMPLETE)  
   - UI Foundation = chrome/GDS (`WGDOM-UI-FOUNDATION-01-*`)  
   - Work Catalog Foundation = `docs/work-catalog/FOUNDATION-FREEZE-v1.0.md`  
8. Tip UI / prod → tylko `09_PRODUCTION_BASELINE` / `version.json`.  
9. Commit Foundation: **wyłącznie** pliki pakietu · **nigdy** `git add -A`.  
10. Start sesji: MASTER_HANDOFF → AI_ENTRY → Gate → (ten SSOT jeśli FND) → CURRENT-TASK.

---

## 8. Mapa plików (kod)

```text
src/lib/wgdom-foundation/
  index.ts          # root barrel
  id/               # FND-01
  digest/           # FND-02
  errors/           # FND-03
  audit/            # FND-04  (.gitignore: wyjątek !src/lib/wgdom-foundation/audit/)
  events/           # FND-05

scripts/test-foundation-fnd-01*.mjs … fnd-05*.mjs
```

---

## 9. Relacja do dokumentów nadrzędnych

| Dokument | Rola wobec Foundation Lib |
|----------|---------------------------|
| Constitution / Architecture Freeze 2.0 | Biznes SSOT — nietykalny; Foundation go nie zmienia |
| Technical Architecture Blueprint v1.0 | Filary tech (ID, pin, event, audit, observability…) |
| MASTER IMPLEMENTATION BLUEPRINT | Kolejność: Foundation → Snapshot → … |
| FOUNDATION-31/32 | Event Impl Spec + Freeze (FND-05) |
| FOUNDATION-36/37 | FND-05 Release Gate + push |
| FOUNDATION-39 | Gap: FND-06 bez Impl Spec |

---

**Koniec SSOT Phase 0.** Następny dokument roboczy FND-06: ADR lub Blueprint extension — **nie** kod.
