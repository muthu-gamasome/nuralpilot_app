# NeuralPilot Fleet Mobile App

React Native (Expo) mobile app for monitoring a robot fleet in real time — robot list, live map, battery/status, and mission state. Mirrors the behavior of the `fleet-ui` web app.

- **Platforms:** Android & iOS
- **Package / Bundle ID:** `com.neuralpilot.fleet`
- **Expo SDK:** 53 · **React Native:** 0.76.7 · New Architecture enabled

## Prerequisites
- Node.js 20+
- JDK 17+ (JDK 21 verified) and Android Studio + SDK (for Android builds)
- Xcode (for iOS, macOS only)

## Install
```bash
npm install
```

## Configure environment
Create a `.env` file in the project root:
- `EXPO_PUBLIC_BASE_URL` — NeuralPilot API / Socket.io server URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps API key (map view)

Google Maps keys are also wired into `app.json` (`expo.android.config.googleMaps.apiKey` and `expo.ios.config.googleMapsApiKey`).

## Run (development)
```bash
npm start              # start Expo (press a/i/w for Android/iOS/web)
npm run android        # build & run on Android emulator/device
npm run ios            # build & run on iOS simulator (macOS)
npm run web            # run in browser
```

## Build a release APK (Android)
```bash
cd android
./gradlew.bat assembleRelease   # Windows
# ./gradlew assembleRelease     # macOS / Linux
```
Output APK:
```
android/app/build/outputs/apk/release/app-release.apk   (~82 MB)
```

For a Play Store bundle instead:
```bash
./gradlew.bat bundleRelease     # AAB -> android/app/build/outputs/bundle/release/
```

## Project structure
```
src/
  components/   — Reusable UI (FleetMap, HardwareCard, ...)
  contexts/     — React contexts (Auth, Socket)
  hooks/        — Custom hooks (useStaleOfflineDetection, ...)
  screens/      — Login, FleetOverview, AddRobot
  navigation/   — React Navigation stack
  lib/          — Types, colors, storage, time helpers
App.tsx         — Entry point
```

## Screens
- **Login** — email + password, connects to `/auth/login`
- **Fleet Overview** — robot list + real-time map
  - Phone: tab bar switches between list and map
  - Tablet (≥768px): side-by-side split layout
- **Add Robot** — register a new robot to the fleet

## Real-time
Connects to the same Socket.io server as the web app (`/frontend` namespace). Listens for:
- `robot:status` — online/offline, battery, position (batched updates)
- `execution:sync` — mission executing flag
- `execution:init` — initial state on connect

A 2s stale-offline detection marks robots offline when status updates stop arriving.
