# W&G DOM — aplikacja natywna (Capacitor)

Apka mobilna to **cienka skorupa** (Android / iOS), która ładuje UI z **https://wgdom.fun**.  
Aktualizacje funkcji = push na Vercel — **bez** czekania na review w sklepie (zmienia się tylko strona).

## Wymagania

| Platforma | Narzędzia |
|-----------|-----------|
| **Android** | [Android Studio](https://developer.android.com/studio), JDK 17+ |
| **iOS** | Mac + Xcode 15+ (build iOS tylko na macOS) |
| **Wspólne** | Node.js 20+, npm |

## Pierwszy raz

```bash
npm install
npm run build
npx cap add android    # jeśli jeszcze nie ma folderu android/
npx cap add ios        # opcjonalnie, na Macu
npm run cap:assets     # ikony + splash z resources/icon.png
npx cap sync
```

## Codzienna praca

Po zmianach w **natywnej skorupie** (capacitor.config, pluginy):

```bash
npm run cap:sync
npm run cap:open:android   # Android Studio → Run
npm run cap:open:ios       # Xcode → Run (Mac)
```

Zmiany w React/Vite **nie wymagają** nowej apki — wystarczy deploy na Vercel.

## Dev — lokalny serwer w apce

```bash
# terminal 1
npm run dev

# terminal 2 (Android emulator: 10.0.2.2 = host)
set CAPACITOR_SERVER_URL=http://10.0.2.2:5173
npx cap sync android
npm run cap:run:android
```

Na fizycznym telefonie użyj IP komputera w sieci Wi‑Fi, np. `http://192.168.1.10:5173`.

## Publikacja w sklepach

1. **Google Play** — konto deweloperskie (~25 USD jednorazowo)  
   - Android Studio → Build → Generate Signed Bundle (AAB)  
2. **App Store** — Apple Developer (~99 USD/rok)  
   - Xcode → Archive → Distribute → App Store Connect  

Przed publikacją:
- Podmień `resources/icon.png` na **1024×1024** (logo W&G DOM)  
- Uruchom `npm run cap:assets`  
- W `capacitor.config.ts` upewnij się, że `server.url` = `https://wgdom.fun`

## Id aplikacji

- **appId:** `fun.wgdom.app`  
- **Nazwa:** W&G DOM  

## Co robi skorupa

- Status bar (ciemny, kolor `#344254`)  
- Splash screen  
- Wyłącza service worker PWA (konflikt z WebView)  
- WebView → pełna aplikacja z chmury Supabase jak w przeglądarce  

## Kolejne kroki (opcjonalnie)

- Push notifications (Firebase + APNs)  
- `@capacitor/camera` — wygodniejsze zdjęcia z budowy  
- Deep link `wgdom://` do konkretnej roboty  
