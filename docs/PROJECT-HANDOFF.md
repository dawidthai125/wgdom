# W&G DOM — PROJECT HANDOFF

> **Hasło:** „kontynuuj WGDOM” · **Data:** 2026-06-09  
> **Przed nową pracą:** [`CURRENT-TASK.md`](../CURRENT-TASK.md) → [`AGENTS.md`](../AGENTS.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Baseline produkcyjny

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **2.50.56** |
| **Commit** | **`1be7a80`** — `feat(app): version awareness and update banner (20.5B.7)` |
| **Deploy** | **`4995835869`** — **SUCCESS** |
| **Status** | **RELEASED · STABLE** |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Repo `origin/main`** | **`1be7a80`** |

**Brak aktywnych blockerów.** **Brak aktywnych incydentów.**

**Handoff sesji:** [`SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md`](SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md)  
**Audyt operacyjny:** [`AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md) — worker/admin/inspektor **GO**

---

## Ostatni release — 20.5B.7 / 2.50.56

**Version Awareness & Update Banner** — wykrywanie nowej wersji po deployu

### Funkcje

- **APP_VERSION** w bundle + **`/version.json`** przy buildzie
- Polling co **5 min** + **`visibilitychange`** + **`focus`**
- Globalny banner: **„Dostępna nowa wersja WGDOM”**
- **Odśwież teraz** — manual `location.reload()` (brak auto-reload)
- **Później** — dismiss sesji; banner wraca po kolejnym deployu
- Rozwiązuje problem **starych kart SPA** po wdrożeniu

**Raport:** [`RELEASE-REPORT-20.5B.7.md`](RELEASE-REPORT-20.5B.7.md)

---

## Poprzedni release — 20.5B.6A.1 / 2.50.55

**Dokumentacja Robót Naming Refresh** — Raporty → Dokumentacja

**Raport:** [`RELEASE-REPORT-20.5B.6A.1.md`](RELEASE-REPORT-20.5B.6A.1.md)

---

## Poprzedni release — 20.5B.5 / 2.50.54

**Roboty UX Pack** — filtr W trakcie, Socjalny, piec gazowy

**Raport:** [`RELEASE-REPORT-20.5B.5.md`](RELEASE-REPORT-20.5B.5.md)

---

## Poprzedni release — 20.5B.4 / 2.50.53

**Dashboard WM Cleanup** — usunięcie embedded Portfolio WM z Pulpicu

**Raport:** [`RELEASE-REPORT-20.5B.4.md`](RELEASE-REPORT-20.5B.4.md)

---

## Poprzedni release — 20.5A.10 / 2.50.52

**Generic File Attachments** (wariant **B** — osobne `jobAttachments[]`)

### Funkcje

- Sekcja **Załączniki ogólne** w Roboty → Pliki (admin upload/delete)
- Typy: PDF, DOC/DOCX, XLS/XLSX, ZIP, RAR, DWG, TXT (max 25 MB)
- Tombstone sync (`deletedJobAttachmentTombstones[]`) — wzorzec 20.5B.3
- Email: grupy Dokumenty kontraktowe / Załączniki ogólne
- **Załączniki ZIP** (`zalaczniki/`) obok Dokumenty ZIP
- Preview: PDF, DOCX, XLSX

### Decyzja architektoniczna

```text
jobFiles[]              — dokumenty kontraktowe (zlecenie, kosztorys, plan) — BEZ ZMIAN
jobAttachments[]        — załączniki ogólne (20.5A.10) ★ NOWE
photos/inspector/sketch — obrazy (tab Zdjęcia, media-separation) — BEZ ZMIAN
```

**NIE rozszerzać `jobFiles[]` o `kind=generic`.** Brak migracji KV/Edge.

### Jakość (release)

| Check | Wynik |
|-------|-------|
| Build | **PASS** |
| Smoke 20.5A.10 | **T1–T20 PASS** |
| Regresja 20.5A.8/9, 20.5B.2/3 | **PASS** |
| Prod bundle | **PASS** (`2.50.52`) |
| CI Mobile | `#27230293447` **SUCCESS** |

**Raport:** [`RELEASE-REPORT-20.5A.10.md`](RELEASE-REPORT-20.5A.10.md)  
**Handoff:** [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md)

### Kluczowe pliki 20.5A.10

| Plik | Rola |
|------|------|
| `src/lib/job-attachments.ts` | Model, walidacja, merge/tombstone |
| `src/lib/job-attachment-upload.ts` | `uploadJobAttachment()` |
| `src/lib/job-attachments-pack.ts` | ZIP załączników |
| `src/lib/cloud-sync.ts` | `mergeJobsById` — attachments |
| `src/app/JobGenericAttachmentsSection.tsx` | UI sekcji |
| `src/app/JobFilesEmailModal.tsx` | Grupy email |
| `scripts/smoke-test-generic-attachments-20.5a10.mjs` | Smoke |

---

## Poprzedni release — 20.5A.6 / 2.50.44 (Billing Proposal)

Szczegóły → [`SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](SESSION-HANDOFF-20.5A-BILLING-JOBS.md) · [`RELEASE-REPORT-20.5A.6.md`](RELEASE-REPORT-20.5A.6.md)

---

## Zamknięte serie (nie zmieniaj bez polecenia)

| Seria | Wersja | Handoff |
|-------|--------|---------|
| **20.5B Roboty + Dokumentacja + Version** | **2.50.56 `1be7a80`** | [`SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md`](SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md) |
| **Generic Attachments 20.5A.10** | **2.50.52 `e6758e5`** | [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |
| File Consistency 20.5B.3 | 2.50.51 `09a8284` | ARCHITECTURE § 12.1.2 |
| CC polonizacja 20.3B+ | 2.50.43 `61cb33b` | [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](SESSION-HANDOFF-20.3B-CC-POLISH.md) |
| Desktop / mobile / MID-B | 2.50.x | [`SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md`](SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md) |
| Billing 20.3A–20.5A.6 | 2.50.44 `99295e5` | [`SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](SESSION-HANDOFF-20.5A-BILLING-JOBS.md) |
| Payroll carry | 20.1B `74e65d9` | [`SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md) |
| Performance 2.x | `35614f0` | [`SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md`](SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md) |

---

## Następny backlog (tylko na polecenie)

| Opcja | Opis |
|-------|------|
| **20.5B.7C** | Optional auto refresh — domyślnie OFF |
| **20.5B.6A.2** | Kolejność tabów / worker sub-nav |
| **20.5A.11** | Inspektor read-only podgląd załączników ogólnych |
| **20.3C** | Legacy CC + GuideView + retro-changelog |
| **Roboty 2.0 FULL** | Audyt / implementacja pełna |
| **E2E worker flow** | Pełny test: zdjęcie → dokumentacja → admin → inspektor |

---

## Proces pracy (obowiązkowy)

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

1. **AUDIT** — read-only; mapa plików, sync boundaries, regresje
2. **RCA** — decyzja GO/HOLD/NO-GO
3. **PLAN** — zakres, etapy, smoke; akceptacja przed kodem
4. **IMPLEMENT** — minimalny diff; chmura → CHANGELOG → HelpView → ARCHITECTURE

**Deploy:** push `main` → Vercel auto-deploy. **Supabase:** tylko gdy zmienia się Edge Function.

---

## Szybki start agenta

```text
1. CURRENT-TASK.md
2. AGENTS.md
3. docs/PROJECT-HANDOFF.md              ← ten plik
4. docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md  ← ★ ostatnia sesja
5. docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md
6. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md  ← pliki roboty
7. docs/ARCHITECTURE.md                 (§ 9.1 dokumentacja, § 11 sync, § 12.1.2 pliki, § 13.1 wersja)
8. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md
9. docs/SESSION-HANDOFF-20.3B-CC-POLISH.md
```
