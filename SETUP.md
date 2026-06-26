# NeuralPilot Fleet Mobile App — Setup Guide

## Prerequisites
- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

## Install dependencies
```
npm install
```

## Configure environment
Copy `.env.example` to `.env` and fill in your values:
- `EXPO_PUBLIC_BASE_URL` — your NeuralPilot API URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps API key (for the map view)

### Google Maps API Key
- Android: add to `android/app/src/main/AndroidManifest.xml` under `<application>`
  ```xml
  <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>
  ```
- iOS: add to `app.json` under `expo.ios.config.googleMapsApiKey`

## Run on device/emulator
```
npx expo start          # opens Expo Dev Tools
npx expo start --android
npx expo start --ios
```

## Project structure
```
src/
  api/          — Axios API clients (auth, robot)
  components/   — Reusable UI components
  contexts/     — React contexts (Auth, Socket)
  lib/          — Types, colors, storage helpers, time formatters
  navigation/   — React Navigation stack
  screens/      — LoginScreen, FleetOverviewScreen
App.tsx         — Entry point
```

## Screens
- **Login** — Email + password form, connects to `/auth/login`
- **Fleet Overview** — Robot list + real-time map
  - Phone: tab bar switches between list and map views
  - Tablet (≥768px): side-by-side split layout

## Real-time
Connects to the same Socket.io server as the web app. Listens for:
- `robot:status` — online/offline, battery, position updates
- `execution:sync` — mission executing flag
- `execution:init` — initial state on connect
