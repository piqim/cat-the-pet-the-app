# iCloud Sync - manual verification checklist

Automated coverage lives in `__tests__/mergeSave.test.ts` (the conflict-resolution
logic). The items below require real hardware because **iCloud KVS does not sync in
the iOS Simulator** and needs a signed-in Apple ID.

## Prerequisites
- Apple Developer portal: the App ID `com.piqim.catthepet` has the iCloud
  capability enabled, and a provisioning profile that includes it.
- Two iOS devices (or one device + reinstall) signed into the **same** Apple ID,
  with iCloud Drive enabled.
- A device build installed (`npx expo run:ios --device`, or an EAS build).

## Core scenarios

1. Reinstall recovery (single device)
   - Name the cat, earn some points/XP, buy a cosmetic.
   - Delete the app, reinstall, launch.
   - Expect: cat name, level, balance, and owned cosmetics are restored from iCloud.

2. Fresh device adoption
   - On a second device signed into the same Apple ID, install and launch.
   - Expect: after a few seconds (or backgrounding/foregrounding), progress from
     device 1 appears. Settings sheet shows "iCloud Sync: On".

3. Offline divergence (the key case)
   - Put both devices in Airplane Mode.
   - Device A: pet a lot (earn points), rename the cat.
   - Device B: buy a different cosmetic (spends points).
   - Re-enable networking on both; foreground each app.
   - Expect: final state keeps device A's earnings AND device B's purchase; the
     cat name follows whichever device wrote last; no points or items are lost.

4. Live cross-device update
   - Keep both apps foregrounded and online.
   - Earn points on A.
   - Expect: B reflects the change within a short delay (serverChange event).

5. iCloud unavailable
   - Sign out of iCloud (or disable iCloud Drive) and launch.
   - Expect: app runs normally on local data; Settings shows
     "iCloud Sync: This device". Tapping the row does not crash.

6. Apple ID switch (edge case - inspect carefully)
   - Switch the device to a different Apple ID that has its own save.
   - Expect: the new account's save is adopted (not merged with the previous
     account's data). If the new account has no save, local data is left intact
     and not pushed until normal play resumes.

## Notes
- The Settings sheet "iCloud Sync" row is tappable to force an immediate sync.
- Sync also runs on app launch and every time the app returns to the foreground.
