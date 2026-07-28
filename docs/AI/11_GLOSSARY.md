# 11 — Glossary (WGDOM)

| Termin | Znaczenie |
|--------|-----------|
| **SSOT** | Single Source of Truth — jedna kanoniczna reguła/dane dla domeny |
| **Pipeline** | Lista przetargów BZP + stan pozycji (`kw-tenders-pipeline`) |
| **Tender Engine** | Runtime analizy: bootstrap → heavy → pricing → trust → autonomous |
| **Heavy Analysis / Heavy Parse** | Ciężkie budowanie dossier (cost phase + metadata enrichment) |
| **Bootstrap (tenders)** | `useTenderDocumentsBootstrap` — discovery dokumentów / shell dossier |
| **Bootstrap (app)** | `CloudLoader` — hydracja KV→LS przed App |
| **Persist** | Zapis stanu (LS i/lub Cloud) |
| **persist local** | Tylko LocalStorage (`syncTenderPipelineLocalOnly` / odpowiednik) |
| **persist cloud** | LS + kolejka/coalesce → `persistKey` / `saveTendersPipeline` |
| **Cloud Merge** | Połączenie local+remote według reguł timestamp / dedykowanych merge |
| **Coalesce** | Scalanie wielu schedule persist do jednego cloud write (`force`) |
| **persistKey** | API `cloud-sync` zapisujące jeden klucz KV |
| **batch-get / batch-set** | Edge endpointy bulk KV |
| **KV** | Key-Value store Supabase przez Edge |
| **Domain Push** | Push domeny (Payroll) poza pełnym RS subset (#CORE-015) |
| **Sync Storm** | Pętla: re-render/persist → restart heavy → lawina fat pipeline sync |
| **builtAt** | Timestamp zbudowanego dossier — **nie** może być w E-RUN deps |
| **E-RUN** | Effect uruchamiający heavy parse |
| **E-UI** | Effects tylko na flagi UI (mogą czytać builtAt) |
| **Generation Guard** | Anulowanie in-flight przy zmianie prawdziwych deps / generation++ |
| **Circuit Breaker** | Limit prób heavy (max 2) per `(itemId, fingerprint, retryNonce)` |
| **gateFingerprint** | Fingerprint zestawu dokumentów do heavy |
| **Owner Verification (OV)** | Weryfikacja scenariusza Ownera / harness po IMPL |
| **Production Verification** | Potwierdzenie na prod (`version.json` + smoke) |
| **RELEASE GO** | build+smoke+commit+push PASS |
| **PRODUCTION VERIFIED** | `version.json` = oczekiwana wersja (jedno sprawdzenie) |
| **DEPLOY PROPAGATING** | Push OK, CDN/Vercel jeszcze stara wersja |
| **Owner GO** | Zgoda na IMPLEMENT po AUDIT→…→Boundary |
| **Protected Core / CORE** | Sync, Payroll, CloudLoader, Edge, App LP handlers |
| **FEATURE** | UI/UX bez CORE |
| **#CORE-013** | Zakaz mixed FEATURE+CORE w jednym commicie |
| **#CORE-014** | Boundary Check przed IMPLEMENT/COMMIT |
| **PWRB** | Payroll Week Roster Bundle — jedyna mutacja składu tygodnia |
| **Domain Gate (D2)** | Confirm przed hours collapse push |
| **intentionalHoursClear** | Flaga świadomego wyzerowania godzin (D3) — **≠** `isIntentionalPayrollWeekClear` |
| **Soft Restore (D5)** | Overlay godzin z `-prev` / session przy re-add — nie w factory |
| **weekEmployeeFromDir** | Factory z katalogu — **PURE** (C5) |
| **-prev recovery (D4)** | Banner z `kw-week-employees-prev` — **≠** archive Restore Banner |
| **write_path telemetry (D1)** | Passive ring `payroll.write_path` |
| **Resurrection fence** | Blokada reseedu pustej chmury ze starego bogatego LS |
| **ALIGN vs ROLLOVER** | ALIGN = dopasuj zakres; ROLLOVER = archive+clear (Nd ≥20:00) |
| **Payroll Guard** | Blokada push shrink godzin/dni |
| **Tombstone** | Znacznik usunięcia (photos, jobs, passwords) |
| **TEUX** | Tender UX design system (NG-06) |
| **TOKEN FREEZE** | Zamrożone tokeny typografii TEUX |
| **TWSL** | Tender Workspace Layout (accordion) — gated/WIP |
| **Autonomous Gate / NG-10** | Ekran przebiegu autonomicznego przed Workspace |
| **Work Catalog** | Biblioteka Robót v3 KV |
| **Foundation Lib / wgdom-foundation** | Lib Phase 0: ID·Digest·Error·Audit·Event (`src/lib/wgdom-foundation`) — **nie** UI Foundation |
| **FND-01…05** | Zamknięte pakiety Foundation Lib na `origin/main` |
| **FND-06 Observability** | Slot planu — **BLOCKED** do ADR/Blueprint Impl Spec |
| **UI Foundation** | Chrome/GDS shell (`WGDOM-UI-FOUNDATION-01-*`) — **≠** Foundation Lib |
| **ZI** | Załącznik / odbiór WM Tauron 2026 |
| **STABILIZATION WINDOW** | Okres bez nowych epiców bez GO |
| **Evidence Gate** | Warunek dowodowy przed DF/IMPL (np. ADR Sync) |
| **KEEP (DEBUG)** | Zostaw API diagnostyczne; nie auto-enable |
| **Fat key** | Duży JSON w jednym KV (np. cały pipeline) |
| **Trigger vs root cause** | Trigger (MOPS open) ≠ root (builtAt loop) |
| **Amplifier** | Czynnik pogarszający (retry deadlock), nie pierwotna pętla |
