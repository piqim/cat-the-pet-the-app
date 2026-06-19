# Cat The Pet

A native iOS stress-relief game built with Expo and React Native. Pet a virtual cat with haptic feedback and ambient audio, earn points and XP, unlock cosmetics, and keep a daily streak. Progress syncs across devices via iCloud Key-Value Store (no account required).

## Requirements

- Node.js 18+
- Xcode (for iOS builds)
- An Apple Developer account with **iCloud → Key-value storage** enabled on App ID `com.piqim.catthepet`
- A physical iPhone for iCloud sync testing (KVS does not sync in the Simulator)

## Quick start

```bash
npm install
npx expo run:ios --device   # build and install on a connected iPhone
npx expo start --dev-client # start Metro for JS hot reload
```

Other scripts:

```bash
npm run typecheck   # TypeScript check
npm run test        # unit tests (merge/conflict logic)
npm run ios         # alias for expo run:ios
```

## Source layout

All detailed documentation lives inline (file headers and JSDoc). Use this map to navigate:

| Folder | Purpose |
|--------|---------|
| [`App.tsx`](App.tsx) | App entry — gesture root, sync service bootstrap |
| [`src/data/`](src/data/) | Game constants, level curve, cosmetic catalog |
| [`src/stores/`](src/stores/) | Zustand state + MMKV persistence |
| [`src/engine/`](src/engine/) | Petting logic, animation, audio, haptics, anti-grind |
| [`src/services/`](src/services/) | Streaks, notifications, iCloud sync |
| [`src/components/`](src/components/) | Reusable UI (cat sprite, shop, settings) |
| [`src/screens/`](src/screens/) | `PetScreen` — main game screen |
| [`scripts/`](scripts/) | Placeholder audio asset generator |

## iCloud sync

Save data (cat name, XP, coins, cosmetics, settings) is stored locally in MMKV and mirrored to iCloud KVS when signed in. See the file header in [`src/services/cloud/cloudSyncService.ts`](src/services/cloud/cloudSyncService.ts) for merge rules, edge cases, and manual verification steps.
